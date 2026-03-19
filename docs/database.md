# Database (MongoDB)

**Location:** `lib/db/`

MongoDB stores wallets and transactions. Used as a cache — the blockchain is the source of truth.

## How It's Used

- **Wallets collection** (`models/wallet.ts`):
  - `address` (unique) — Solana address
  - `createdAt` — When we started tracking

- **Transactions collection** (`models/transaction.ts`):
  - `signature` (unique) — Solana tx signature
  - `walletAddress` — Which address this tx belongs to
  - `slot`, `blockTime`, `fee`, `status` — From on-chain data
  - `raw` — Full RPC response for debugging
  - Index on `walletAddress` + `slot` for fast queries

## Role

- **Cache:** Reduces RPC load. We fetch from Solana once (via the worker), store in MongoDB, serve from DB for API requests.
- **Deduplication:** Worker checks `signature` before insert — avoids duplicates across poll cycles.
- **Instant loads:** API returns cached data; WebSocket pushes new txs as they arrive.

## Connection

- `connectDb()` in `lib/db/src/index.ts` — Called once at server startup.
- Uses `MONGODB_URI` env var.
