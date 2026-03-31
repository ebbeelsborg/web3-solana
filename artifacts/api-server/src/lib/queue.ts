import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { WalletModel, TransactionModel } from "@workspace/db";
import { fetchRecentTransactions } from "./solana.js";
import { emitTransactions } from "./websocket.js";
import { bullRedis } from "./redis.js";
import { invalidateWallet } from "./cache.js";

const QUEUE_NAME = "wallet-tracker";
const POLL_INTERVAL_MS = 20000;

type WalletJobData = { address: string };
type WalletJobName = "poll";

const bullConnection = bullRedis as ConnectionOptions;

export const walletQueue = new Queue<WalletJobData, unknown, WalletJobName>(
  QUEUE_NAME,
  {
    connection: bullConnection,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  },
);

async function pollWallet(address: string): Promise<void> {
  console.log(`[Poller] Polling wallet: ${address}`);
  try {
    const transactions = await fetchRecentTransactions(address, 20);

    if (transactions.length === 0) {
      console.log(`[Poller] No transactions found for ${address}`);
      return;
    }

    const fetchedSignatures = transactions.map((tx) => tx.signature);
    const existingDocs = await TransactionModel.find(
      { signature: { $in: fetchedSignatures } },
      { signature: 1 },
    ).lean();
    const existingSet = new Set(existingDocs.map((d) => d.signature));
    const newTxns = transactions.filter((tx) => !existingSet.has(tx.signature));

    if (newTxns.length === 0) {
      console.log(`[Poller] No new transactions for ${address}`);
      return;
    }

    console.log(
      `[Poller] Found ${newTxns.length} new transactions for ${address}`,
    );

    const docs = newTxns.map((tx) => ({
      signature: tx.signature,
      walletAddress: address,
      slot: tx.slot,
      blockTime: tx.blockTime,
      fee: tx.fee,
      status: tx.status,
      raw: tx.raw as Record<string, unknown>,
    }));

    const inserted = await TransactionModel.insertMany(docs, {
      ordered: false,
    }).catch((err) => {
      if (err.code === 11000) {
        return err.insertedDocs ?? [];
      }
      throw err;
    });

    if (inserted.length > 0) {
      emitTransactions(
        address,
        inserted.map((d: any) => ({
          id: d._id.toString(),
          signature: d.signature,
          walletAddress: d.walletAddress,
          slot: d.slot,
          blockTime: d.blockTime,
          fee: d.fee,
          status: d.status,
          createdAt: d.createdAt,
        })),
      );
      try {
        await invalidateWallet(address);
      } catch {
        /* cache invalidation best-effort */
      }
    }
  } catch (err: any) {
    console.error(`[Poller] Error polling ${address}: ${err.message}`);
    throw err;
  }
}

export const walletWorker = new Worker<WalletJobData, unknown, WalletJobName>(
  QUEUE_NAME,
  async (job) => {
    await pollWallet(job.data.address);
  },
  {
    connection: bullConnection,
    concurrency: 5,
  },
);

walletWorker.on("failed", (job, err) => {
  console.error(`[Poller] Job ${job?.id} failed:`, (err as Error).message);
});

walletWorker.on("error", (err) => {
  console.error("[Poller] Worker error:", (err as Error).message);
});

function jobId(address: string): string {
  return `wallet-${address}`;
}

export async function scheduleWalletPolling(
  address: string,
  triggerImmediately = false,
): Promise<void> {
  const id = jobId(address);

  const existing = await walletQueue.getRepeatableJobs();
  if (existing.some((j) => j.id === id || j.key?.includes(id))) {
    console.log(`[Poller] Already polling ${address}`);
    if (triggerImmediately) {
      await walletQueue.add("poll", { address }, { jobId: `${id}-immediate` });
    }
    return;
  }

  await walletQueue.add(
    "poll",
    { address },
    {
      jobId: id,
      repeat: { every: POLL_INTERVAL_MS },
    },
  );
  console.log(`[Poller] Scheduled polling for ${address}`);

  if (triggerImmediately) {
    await walletQueue.add("poll", { address }, { jobId: `${id}-immediate` });
  }
}

export async function stopWalletPolling(address: string): Promise<void> {
  const id = jobId(address);
  const repeatableJobs = await walletQueue.getRepeatableJobs();
  const job = repeatableJobs.find((j) => j.id === id || j.key?.includes(id));
  if (job) {
    await walletQueue.removeRepeatableByKey(job.key);
    console.log(`[Poller] Stopped polling for ${address}`);
  }
}

export async function scheduleAllWallets(): Promise<void> {
  const wallets = await WalletModel.find({}, { address: 1 }).lean();
  const existingJobs = await walletQueue.getRepeatableJobs();
  const existingIds = new Set(
    existingJobs
      .map((j) => j.id)
      .filter(
        (id): id is string =>
          typeof id === "string" && id.startsWith("wallet-"),
      ),
  );

  const toSchedule = wallets.filter((w) => !existingIds.has(jobId(w.address)));

  await Promise.all(
    toSchedule.map((w) =>
      walletQueue.add(
        "poll",
        { address: w.address },
        {
          jobId: jobId(w.address),
          repeat: { every: POLL_INTERVAL_MS },
        },
      ),
    ),
  );

  console.log(
    `[Poller] Scheduled ${toSchedule.length} wallets (${existingIds.size} already active)`,
  );
}

export async function closeQueue(): Promise<void> {
  await walletWorker.close();
  await walletQueue.close();
}
