import { Router, type IRouter } from "express";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { isValidSolanaAddress, fetchRecentTransactions } from "../lib/solana.js";
import { scheduleWalletPolling } from "../lib/queue.js";

const router: IRouter = Router();

router.post("/wallet", async (req, res): Promise<void> => {
  const { address } = req.body as { address?: string };

  if (!address || typeof address !== "string") {
    res.status(400).json({ error: "Wallet address is required" });
    return;
  }

  const trimmed = address.trim();

  if (!isValidSolanaAddress(trimmed)) {
    res.status(400).json({ error: "Invalid Solana wallet address" });
    return;
  }

  const existing = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.address, trimmed))
    .limit(1);

  if (existing.length > 0) {
    const wallet = existing[0];
    const [{ value: txCount }] = await db
      .select({ value: count() })
      .from(transactionsTable)
      .where(eq(transactionsTable.walletAddress, trimmed));

    res.status(409).json({ ...wallet, transactionCount: Number(txCount) });
    return;
  }

  const [wallet] = await db
    .insert(walletsTable)
    .values({ address: trimmed })
    .returning();

  await scheduleWalletPolling(trimmed);

  try {
    const transactions = await fetchRecentTransactions(trimmed, 20);
    if (transactions.length > 0) {
      await db
        .insert(transactionsTable)
        .values(
          transactions.map((tx) => ({
            signature: tx.signature,
            walletAddress: trimmed,
            slot: tx.slot,
            blockTime: tx.blockTime,
            fee: tx.fee,
            status: tx.status,
            raw: tx.raw as Record<string, unknown>,
          }))
        )
        .onConflictDoNothing();
    }
  } catch (err) {
    console.error("[Route] Failed to fetch initial transactions:", (err as Error).message);
  }

  res.status(201).json({ ...wallet, transactionCount: 0 });
});

router.get("/wallet/:address", async (req, res): Promise<void> => {
  const rawAddress = Array.isArray(req.params.address)
    ? req.params.address[0]
    : req.params.address;

  const wallets = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.address, rawAddress))
    .limit(1);

  if (wallets.length === 0) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const wallet = wallets[0];

  const rawLimit = req.query.limit;
  const limit = rawLimit ? parseInt(String(rawLimit), 10) : 50;

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.walletAddress, rawAddress))
    .orderBy(desc(transactionsTable.slot))
    .limit(limit);

  const [{ value: txCount }] = await db
    .select({ value: count() })
    .from(transactionsTable)
    .where(eq(transactionsTable.walletAddress, rawAddress));

  res.json({
    wallet: { ...wallet, transactionCount: Number(txCount) },
    transactions,
  });
});

router.get("/wallets", async (_req, res): Promise<void> => {
  const wallets = await db.select().from(walletsTable).orderBy(desc(walletsTable.createdAt));

  const withCounts = await Promise.all(
    wallets.map(async (w) => {
      const [{ value: txCount }] = await db
        .select({ value: count() })
        .from(transactionsTable)
        .where(eq(transactionsTable.walletAddress, w.address));
      return { ...w, transactionCount: Number(txCount) };
    })
  );

  res.json(withCounts);
});

export default router;
