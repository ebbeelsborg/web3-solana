import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { WalletModel, TransactionModel } from "@workspace/db";
import { isValidSolanaAddress } from "../lib/solana.js";
import { scheduleWalletPolling } from "../lib/queue.js";
import { getCached, setCached, invalidateWalletsList } from "../lib/cache.js";
import { parseLimit } from "../lib/parse-limit.js";
import { fetchAddressBalances } from "../lib/solana.js";

const router: IRouter = Router();

const walletCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/wallet", walletCreateLimiter, async (req, res): Promise<void> => {
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

  const existing = await WalletModel.findOne({ address: trimmed });

  if (existing) {
    const txCount = await TransactionModel.countDocuments({
      walletAddress: trimmed,
    });
    res.status(409).json({
      id: existing._id.toString(),
      address: existing.address,
      createdAt: existing.createdAt,
      transactionCount: txCount,
    });
    return;
  }

  const wallet = await WalletModel.create({ address: trimmed });

  await Promise.all([
    scheduleWalletPolling(trimmed, true),
    invalidateWalletsList(),
  ]);

  res.status(201).json({
    id: wallet._id.toString(),
    address: wallet.address,
    createdAt: wallet.createdAt,
    transactionCount: 0,
  });
});

const MAX_LIMIT = 100;

router.get("/wallet/:address", async (req, res): Promise<void> => {
  const rawAddress = req.params.address;

  if (!isValidSolanaAddress(rawAddress)) {
    res.status(400).json({ error: "Invalid Solana wallet address" });
    return;
  }

  const limit = parseLimit(req.query.limit, 50, MAX_LIMIT);

  const cacheKey = `wallet:${rawAddress}:${limit}`;
  try {
    const cached = await getCached<Record<string, unknown>>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
  } catch {
    /* fall through to DB */
  }

  const wallet = await WalletModel.findOne({ address: rawAddress });

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const [transactions, txCount] = await Promise.all([
    TransactionModel.find({ walletAddress: rawAddress })
      .sort({ slot: -1 })
      .limit(limit)
      .lean(),
    TransactionModel.countDocuments({ walletAddress: rawAddress }),
  ]);

  const payload = {
    wallet: {
      id: wallet._id.toString(),
      address: wallet.address,
      createdAt: wallet.createdAt,
      transactionCount: txCount,
    },
    transactions: transactions.map((tx) => ({
      id: tx._id.toString(),
      signature: tx.signature,
      walletAddress: tx.walletAddress,
      slot: tx.slot,
      blockTime: tx.blockTime,
      fee: tx.fee,
      status: tx.status,
      createdAt: tx.createdAt,
    })),
  };

  try {
    await setCached(cacheKey, payload);
  } catch {
    /* continue without cache */
  }
  res.json(payload);
});

router.get("/wallet/:address/balances", async (req, res): Promise<void> => {
  const rawAddress = req.params.address;

  if (!isValidSolanaAddress(rawAddress)) {
    res.status(400).json({ error: "Invalid Solana wallet address" });
    return;
  }

  try {
    const balances = await fetchAddressBalances(rawAddress);
    res.json(balances);
  } catch (err: unknown) {
    console.error("[API] Failed to fetch balances:", err);
    res.status(502).json({
      error: "Failed to fetch token balances from Solana",
    });
  }
});

router.get("/wallets", async (_req, res): Promise<void> => {
  const cacheKey = "wallets:list";
  try {
    const cached = await getCached<unknown[]>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
  } catch {
    /* fall through to DB */
  }

  const withCounts = await WalletModel.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "transactions",
        localField: "address",
        foreignField: "walletAddress",
        as: "txs",
      },
    },
    {
      $project: {
        id: { $toString: "$_id" },
        address: 1,
        createdAt: 1,
        transactionCount: { $size: "$txs" },
      },
    },
  ]);

  const payload = withCounts.map((w) => ({
    id: w.id,
    address: w.address,
    createdAt: w.createdAt,
    transactionCount: w.transactionCount,
  }));

  try {
    await setCached(cacheKey, payload);
  } catch {
    /* continue without cache */
  }
  res.json(payload);
});

export default router;
