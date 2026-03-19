# Solana Wallet Tracker

A full-stack Web3 monitoring dashboard that tracks any Solana wallet address in real time. Paste a public address and immediately see its transaction history streaming live — no wallet connection, no private keys, purely read-only on-chain data.

---

## Why This Is a Web3 App

Most web apps talk to centralized servers you trust. This app talks directly to the **Solana blockchain** — a decentralized, permissionless network where every transaction is public and immutable. Anyone with an address can observe it. No account is required. No permission is granted or revoked. The data cannot be altered or deleted.

What makes this Web3:

- **Reads directly from the Solana ledger.** Every transaction displayed was verified by thousands of validators and permanently recorded on-chain. The app does not have its own concept of "a transaction" — it reads the canonical truth from the network.
- **No custody.** The app never handles a private key, signs anything, or moves funds. It is a read-only window into on-chain activity.
- **Permissionless.** Any valid Solana address — owned by a person, a program, a DAO treasury — can be tracked. No approval process, no sign-up.
- **On-chain data as the source of truth.** Transaction signatures, slot numbers, fees, and success/failure status are all pulled directly from Solana validators. The database only exists as a cache to reduce RPC load and enable instant page loads.

---

## Features

- Track any Solana (mainnet) wallet (read-only, no wallet connection)
- Live transaction feed via WebSocket — new transactions appear without refreshing
- Persistent storage with signature-level deduplication
- Multi-wallet tracking from a single dashboard
- Dark-mode UI with animated transaction rows
- Copy signature to clipboard, open transaction in Solscan

---

## Architecture

| Component | Purpose |
|-----------|---------|
| **Frontend** (React + Vite) | Dashboard to add wallets, live transaction feed per wallet. React Query for REST; WebSocket hook merges incoming txs into the cache without refresh. |
| **Backend** (Express) | REST endpoints to register wallets, fetch wallet + transactions, list all tracked wallets. WebSocket server at `/ws` for live push. |
| **Job queue** (BullMQ, Redis) | Async background jobs per wallet (every 20s). Polls Solana RPC, deduplicates against DB, inserts new txs, broadcasts via WebSocket. Redis-backed so jobs survive restarts. |
| **Database** (MongoDB) | Stores wallets and transactions. Cache and deduplication — the blockchain is the source of truth. |
| **Blockchain** (Solana RPC) | Canonical source. We only read; we never sign or submit. |

Flow: User adds wallet → API saves to MongoDB and enqueues a repeatable BullMQ job → Worker polls Solana, inserts new txs, emits over WebSocket → UI updates live.

**Project structure**

| Architecture | Folder |
|--------------|--------|
| Frontend | `artifacts/solana-tracker/` |
| Backend | `artifacts/api-server/` (app, routes) |
| Job queue | `artifacts/api-server/src/lib/queue.ts`, `redis.ts` |
| Database | `lib/db/` (models, connection) |
| Blockchain client | `artifacts/api-server/src/lib/solana.ts` |

Shared: `lib/api-spec/`, `lib/api-client-react/`, `lib/api-zod/` (OpenAPI codegen).

---

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind
- **Backend:** Node.js, Express 5 (REST API + WebSocket)
- **Job queue:** BullMQ, Redis (async background jobs)
- **Database:** MongoDB
- **Blockchain:** `@solana/web3.js`
- **Monorepo:** pnpm workspaces

---

## Running Locally

```bash
pnpm install
export MONGODB_URI="mongodb+srv://..."
export REDIS_URL="redis://localhost:6379"

pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/solana-tracker run dev
```

Requires MongoDB and Redis. See `.env.example` for all variables.
