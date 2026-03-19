# Solana Wallet Tracker

## Overview

Full-stack web app that tracks any Solana wallet address in near real-time (read-only, no wallet connection). Transactions are polled every ~20 seconds, stored with deduplication, and pushed live to the browser via WebSocket.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: MongoDB Atlas + Mongoose
- **Polling**: In-memory setInterval (per-wallet, 20s interval)
- **Realtime**: WebSockets (ws)
- **Blockchain**: Solana web3.js (`getSignaturesForAddress`)
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server + in-memory poller + WebSocket
│   └── solana-tracker/     # React + Vite frontend dashboard
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Mongoose models + MongoDB connection
```

## Key Files

### Backend (`artifacts/api-server/src/`)
- `index.ts` — Connects to MongoDB, starts HTTP server + WebSocket + poller
- `lib/solana.ts` — Solana RPC helpers (getSignaturesForAddress)
- `lib/queue.ts` — In-memory setInterval poller per wallet
- `lib/websocket.ts` — WebSocket server, subscription management, emit helpers
- `routes/wallet.ts` — POST /wallet, GET /wallet/:address, GET /wallets

### Database (`lib/db/src/`)
- `models/wallet.ts` — Wallet Mongoose model (address unique, createdAt)
- `models/transaction.ts` — Transaction Mongoose model (signature unique, walletAddress, slot, blockTime, fee, status, raw, createdAt)
- `index.ts` — `connectDb()` function + model exports

### Frontend (`artifacts/solana-tracker/src/`)
- `App.tsx` — Router with Layout wrapper
- `pages/dashboard.tsx` — Hero page with wallet input
- `pages/wallet-view.tsx` — Transaction feed for a wallet
- `pages/user-guide.tsx` — How-to guide
- `hooks/use-solana-ws.ts` — WebSocket hook (connects to /ws, subscribes to wallet, merges new transactions into React Query cache)
- `components/layout.tsx` — Sidebar with tracked wallets list

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `POST` | `/api/wallet` | Add wallet (body: `{ address }`) |
| `GET` | `/api/wallet/:address` | Get wallet + transactions |
| `GET` | `/api/wallets` | List all tracked wallets |
| `WS` | `/ws` | WebSocket for live updates |

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `SOLANA_RPC_URL` | Solana mainnet RPC URL (optional, defaults to mainnet-beta) |
| `PORT` | API server port (auto-assigned) |

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. Root `tsconfig.json` lists lib packages as project references.

- **Always typecheck from the root**: `pnpm run typecheck`
- **Libs only**: `pnpm run typecheck:libs`
- **Codegen**: `pnpm --filter @workspace/api-spec run codegen`
