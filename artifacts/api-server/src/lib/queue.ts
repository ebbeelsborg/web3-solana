import { Queue, Worker, Job } from "bullmq";
import { redis } from "./redis.js";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import { fetchRecentTransactions } from "./solana.js";
import { eq, desc } from "drizzle-orm";
import { emitTransactions } from "./websocket.js";

const QUEUE_NAME = "wallet-tracker";
const POLL_INTERVAL_MS = 12000;

export const walletQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export async function scheduleWalletPolling(address: string): Promise<void> {
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
      jobId: `poll-${address}`,
    }
  );
  console.log(`[Queue] Scheduled polling for ${address}`);
}

export async function scheduleAllWallets(): Promise<void> {
  const wallets = await db.select().from(walletsTable);
  for (const wallet of wallets) {
    await scheduleWalletPolling(wallet.address);
  }
  console.log(`[Queue] Rescheduled ${wallets.length} wallets`);
}

export function startWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { address } = job.data as { address: string };
      console.log(`[Worker] Polling wallet: ${address}`);

      const existing = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.walletAddress, address))
        .orderBy(desc(transactionsTable.slot))
        .limit(1);

      const transactions = await fetchRecentTransactions(address, 20);

      const newTxns = transactions.filter(
        (tx) => !existing.some((e) => e.signature === tx.signature)
      );

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
