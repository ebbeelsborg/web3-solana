import { db, walletsTable, transactionsTable } from "@workspace/db";
import { fetchRecentTransactions } from "./solana.js";
import { inArray } from "drizzle-orm";
import { emitTransactions } from "./websocket.js";

const POLL_INTERVAL_MS = 20000;

const intervals = new Map<string, ReturnType<typeof setInterval>>();

async function pollWallet(address: string): Promise<void> {
  console.log(`[Poller] Polling wallet: ${address}`);
  try {
    const transactions = await fetchRecentTransactions(address, 20);

    if (transactions.length === 0) {
      console.log(`[Poller] No transactions found for ${address}`);
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
      console.log(`[Poller] No new transactions for ${address}`);
      return;
    }

    console.log(`[Poller] Found ${newTxns.length} new transactions for ${address}`);

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
  } catch (err: any) {
    console.error(`[Poller] Error polling ${address}: ${err.message}`);
  }
}

export function scheduleWalletPolling(
  address: string,
  triggerImmediately = false
): void {
  if (intervals.has(address)) {
    console.log(`[Poller] Already polling ${address}`);
    return;
  }

  const timer = setInterval(() => pollWallet(address), POLL_INTERVAL_MS);
  intervals.set(address, timer);
  console.log(`[Poller] Scheduled polling for ${address}`);

  if (triggerImmediately) {
    setTimeout(() => pollWallet(address), 1000);
  }
}

export function stopWalletPolling(address: string): void {
  const timer = intervals.get(address);
  if (timer) {
    clearInterval(timer);
    intervals.delete(address);
    console.log(`[Poller] Stopped polling for ${address}`);
  }
}

export async function scheduleAllWallets(): Promise<void> {
  const wallets = await db.select().from(walletsTable);
  for (const wallet of wallets) {
    scheduleWalletPolling(wallet.address, false);
  }
  console.log(`[Poller] Scheduled ${wallets.length} wallets`);
}

export function startWorker(): void {
}
