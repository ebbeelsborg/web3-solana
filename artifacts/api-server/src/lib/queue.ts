import { Queue, Worker, Job } from "bullmq";
import { redis } from "./redis.js";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import { fetchRecentTransactions } from "./solana.js";
import { eq, desc, inArray } from "drizzle-orm";
import { emitTransactions } from "./websocket.js";

const QUEUE_NAME = "wallet-tracker";
const POLL_INTERVAL_MS = 20000;

export const walletQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export async function scheduleWalletPolling(
  address: string,
  triggerImmediately = false
): Promise<void> {
  const existingJobs = await walletQueue.getRepeatableJobs();
  const alreadyScheduled = existingJobs.some((j) => j.key.includes(address));
  if (alreadyScheduled) {
    console.log(`[Queue] Already polling ${address}`);
    return;
  }

  await walletQueue.add(
    "poll-wallet",
    { address },
    {
      repeat: { every: POLL_INTERVAL_MS },
    }
  );

  if (triggerImmediately) {
    await walletQueue.add("poll-wallet", { address }, { delay: 1000 });
  }

  console.log(`[Queue] Scheduled polling for ${address}`);
}

export async function scheduleAllWallets(): Promise<void> {
  await walletQueue.drain();

  const repeatableJobs = await walletQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await walletQueue.removeRepeatableByKey(job.key);
  }
  if (repeatableJobs.length > 0) {
    console.log(`[Queue] Cleared ${repeatableJobs.length} stale repeating jobs`);
  }

  const wallets = await db.select().from(walletsTable);
  for (const wallet of wallets) {
    await scheduleWalletPolling(wallet.address, false);
  }
  console.log(`[Queue] Rescheduled ${wallets.length} wallets`);
}

export function startWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { address } = job.data as { address: string };
      console.log(`[Worker] Polling wallet: ${address}`);

      const transactions = await fetchRecentTransactions(address, 20);

      if (transactions.length === 0) {
        console.log(`[Worker] No transactions found for ${address}`);
        return;
      }

      const fetchedSignatures = transactions.map((tx) => tx.signature);
      const existingRows = await db
        .select({ signature: transactionsTable.signature })
        .from(transactionsTable)
        .where(inArray(transactionsTable.signature, fetchedSignatures));

      const existingSet = new Set(existingRows.map((r) => r.signature));
      const newTxns = transactions.filter((tx) => !existingSet.has(tx.signature));

      if (newTxns.length === 0) {
        console.log(`[Worker] No new transactions for ${address}`);
        return;
      }

      console.log(`[Worker] Found ${newTxns.length} new transactions for ${address}`);

      const inserted = await db
        .insert(transactionsTable)
        .values(
          newTxns.map((tx) => ({
            signature: tx.signature,
            walletAddress: address,
            slot: tx.slot,
            blockTime: tx.blockTime,
            fee: tx.fee,
            status: tx.status,
            raw: tx.raw as Record<string, unknown>,
          }))
        )
        .onConflictDoNothing()
        .returning();

      if (inserted.length > 0) {
        emitTransactions(address, inserted);
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job failed for ${job?.data?.address}: ${err.message}`);
  });

  worker.on("error", (err) => {
    console.error(`[Worker] Error: ${err.message}`);
  });

  return worker;
}
