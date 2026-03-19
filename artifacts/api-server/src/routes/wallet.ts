import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { WalletModel, TransactionModel } from "@workspace/db";
import { isValidSolanaAddress } from "../lib/solana.js";
import { scheduleWalletPolling } from "../lib/queue.js";

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
    const txCount = await TransactionModel.countDocuments({ walletAddress: trimmed });
    res.status(409).json({
      id: existing._id.toString(),
      address: existing.address,
      createdAt: existing.createdAt,
      transactionCount: txCount,
    });
    return;
  }

  const wallet = await WalletModel.create({ address: trimmed });

  await scheduleWalletPolling(trimmed, true);

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

  const wallet = await WalletModel.findOne({ address: rawAddress });

  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const rawLimit = req.query.limit;
  const parsed = rawLimit ? parseInt(String(rawLimit), 10) : 50;
  const limit = Math.min(Math.max(1, Number.isNaN(parsed) ? 50 : parsed), MAX_LIMIT);

  const [transactions, txCount] = await Promise.all([
    TransactionModel.find({ walletAddress: rawAddress })
      .sort({ slot: -1 })
      .limit(limit)
      .lean(),
    TransactionModel.countDocuments({ walletAddress: rawAddress }),
  ]);

  res.json({
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
  });
});

router.get("/wallets", async (_req, res): Promise<void> => {
  const wallets = await WalletModel.find().sort({ createdAt: -1 }).lean();

  const withCounts = await Promise.all(
    wallets.map(async (w) => {
      const txCount = await TransactionModel.countDocuments({ walletAddress: w.address });
      return {
        id: w._id.toString(),
        address: w.address,
        createdAt: w.createdAt,
        transactionCount: txCount,
      };
    })
  );

  res.json(withCounts);
});

export default router;
