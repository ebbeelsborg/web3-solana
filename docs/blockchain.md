# Blockchain (Solana RPC)

**Location:** `artifacts/api-server/src/lib/solana.ts`

The app reads from the Solana blockchain via the JSON-RPC API. We never sign or submit transactions.

## How It's Used

- **Connection:** `solanaConnection` — `@solana/web3.js` `Connection` with `commitment: "confirmed"` for faster confirmation.

- **`getSignaturesForAddress`** — Core RPC method. Fetches the most recent transaction signatures for an address. Used by the BullMQ worker to poll for new txs.

- **`getBalance`** — Fetches SOL balance (lamports). Used by `fetchAddressBalances`.

- **`isValidSolanaAddress`** — Validates base58 addresses before any DB or RPC calls.

## RPC Flow

1. Worker polls `getSignaturesForAddress(address, { limit: 20 })` every 20s per wallet
2. Compares signatures to MongoDB, inserts new ones
3. Balances endpoint calls `getBalance` + `getParsedTokenAccountsByOwner` (Token Program)

## Configuration

- `SOLANA_RPC_URL` — Defaults to Solana mainnet public RPC. Use a dedicated RPC (Helius, QuickNode, etc.) for higher rate limits and better performance.
