import { Connection, PublicKey } from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

/** SPL Token Program ID - the smart contract that manages token accounts */
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

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

export interface TokenBalance {
  mint: string;
  decimals: number;
  amount: string;
  uiAmountString: string | null;
}

export interface AddressBalances {
  sol: number;
  tokens: TokenBalance[];
}

/**
 * Fetches SOL and SPL token balances for an address.
 * Reads from the SPL Token Program (smart contract) for token accounts.
 */
export async function fetchAddressBalances(
  address: string
): Promise<AddressBalances> {
  const pubkey = new PublicKey(address);

  const [solLamports, tokenAccounts] = await Promise.all([
    solanaConnection.getBalance(pubkey),
    solanaConnection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_PROGRAM_ID,
    }),
  ]);

  const tokens: TokenBalance[] = tokenAccounts.value
    .map((acc) => {
      const info = acc.account.data.parsed?.info;
      const tokenAmount = info?.tokenAmount;
      return {
        mint: info?.mint ?? acc.pubkey.toBase58(),
        decimals: tokenAmount?.decimals ?? 0,
        amount: tokenAmount?.amount ?? "0",
        uiAmountString: tokenAmount?.uiAmountString ?? null,
      };
    })
    .filter((t) => t.amount !== "0");

  return {
    sol: solLamports / 1e9,
    tokens,
  };
}
