import { Connection, PublicKey } from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export const solanaConnection = new Connection(rpcUrl, {
  commitment: "confirmed",
  httpHeaders: { "Content-Type": "application/json" },
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 15000,
});

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export interface TransactionInfo {
  signature: string;
  slot: number | null;
  blockTime: number | null;
  fee: number | null;
  status: "success" | "failed";
  raw: Record<string, unknown>;
}

export async function fetchRecentTransactions(
  walletAddress: string,
  limit = 20
): Promise<TransactionInfo[]> {
  const pubkey = new PublicKey(walletAddress);
  const signatures = await solanaConnection.getSignaturesForAddress(pubkey, {
    limit,
  });

  return signatures.map((sig) => ({
    signature: sig.signature,
    slot: sig.slot ?? null,
    blockTime: sig.blockTime ?? null,
    fee: null,
    status: sig.err ? "failed" : "success",
    raw: {
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime,
      err: sig.err,
      memo: sig.memo,
    },
  }));
}
