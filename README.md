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

## Architecture

| Component | Purpose |
|-----------|---------|
| **React + Vite frontend** | Dashboard to add wallets, live transaction feed per wallet. Uses React Query for REST and a WebSocket hook to merge incoming transactions into the cache without refresh. |
| **Express API** | REST endpoints to register wallets, fetch wallet + transactions, list all tracked wallets. WebSocket server at `/ws` for live push. |
| **BullMQ worker** | Background jobs per wallet (every 20s). Calls Solana RPC (`getSignaturesForAddress`), deduplicates against DB, inserts new transactions, broadcasts via WebSocket. Redis-backed so jobs survive restarts. |
| **MongoDB** | Stores wallets and transactions. Used as a cache and for deduplication — the blockchain is the source of truth. |
| **Solana RPC** | The canonical source. We only read; we never sign or submit. |

Flow: User adds wallet → API saves to MongoDB and enqueues a repeatable BullMQ job → Worker polls Solana, inserts new txs, emits over WebSocket → UI updates live.

---

## Features

- Track any Solana mainnet wallet (read-only, no wallet connection)
- Live transaction feed via WebSocket — new transactions appear without refreshing
- Persistent storage with signature-level deduplication
- Multi-wallet tracking from a single dashboard
- Dark-mode UI with animated transaction rows
- Copy signature to clipboard, open transaction in Solscan

---

## Tech Stack

React 19, Vite, Tailwind, Express 5, MongoDB, BullMQ, Redis, `@solana/web3.js`. Monorepo with pnpm workspaces.

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
