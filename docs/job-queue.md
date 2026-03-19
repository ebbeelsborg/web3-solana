# Job Queue (BullMQ)

**Location:** `artifacts/api-server/src/lib/queue.ts`, `redis.ts`

BullMQ is used for async background polling of Solana addresses. Redis stores the job queue.

## How It's Used

- **Queue:** `wallet-tracker` — One repeatable job per tracked address, polling every 20 seconds.
- **Worker:** Processes jobs with concurrency 5. For each job:
  1. Calls `getSignaturesForAddress` on Solana RPC
  2. Deduplicates against MongoDB (signatures we already have)
  3. Inserts new transactions
  4. Broadcasts new txs via WebSocket
  5. Invalidates Redis cache for that address

- **Scheduling:**
  - `scheduleWalletPolling(address)` — Called when a new wallet is added. Creates repeatable job + optional immediate job.
  - `scheduleAllWallets()` — On server startup, loads all wallets from DB and schedules jobs for any not already in the queue.
  - `stopWalletPolling(address)` — Removes the repeatable job (e.g. if a wallet is deleted).

## Why BullMQ

- Jobs survive server restarts (Redis-backed)
- Parallel processing (concurrency 5)
- Repeatable jobs for per-wallet polling

## Redis

- Connection in `lib/redis.ts`.
- Used by BullMQ for queue storage and by the cache layer for response caching.
