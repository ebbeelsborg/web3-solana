# Solana Wallet Tracker

A full-stack web app that tracks any Solana wallet address in near real-time. No wallet connection required — purely read-only monitoring.

## Features

- Track any Solana wallet address (mainnet)
- Live transaction feed updated every ~12 seconds via WebSocket
- Persistent storage with deduplication
- Dashboard-style UI with dark mode
- Multi-wallet tracking

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + TypeScript + Express
- **Queue**: BullMQ with Redis
- **Database**: PostgreSQL + Drizzle ORM
- **Realtime**: WebSockets (ws)
- **Blockchain**: Solana web3.js

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database
- Redis server

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `DATABASE_URL` | PostgreSQL connection string | Required |

### Running Locally

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start Redis:
   ```bash
   redis-server
   ```

3. Push database schema:
   ```bash
   pnpm --filter @workspace/db run push
   ```

4. Start the API server:
   ```bash
   pnpm --filter @workspace/api-server run dev
   ```

5. Start the frontend:
   ```bash
   pnpm --filter @workspace/solana-tracker run dev
   ```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `POST` | `/api/wallet` | Add a wallet to track |
| `GET` | `/api/wallet/:address` | Get wallet + transactions |
| `GET` | `/api/wallets` | List all tracked wallets |
| `WS` | `/ws` | WebSocket for real-time updates |

### WebSocket Protocol

**Subscribe to wallet updates:**
```json
{ "type": "subscribe", "address": "YourWalletAddress" }
```

**Incoming transaction event:**
```json
{
  "type": "transactions",
  "address": "YourWalletAddress",
  "transactions": [...]
}
```

## Architecture

```
┌─────────────────┐    WebSocket     ┌──────────────────────┐
│  React Frontend │◄─────────────────│  Express API Server  │
│  (Port 23042)   │  REST API (HTTP)  │  (Port 8080)         │
└─────────────────┘──────────────────└──────────────────────┘
                                              │  │
                                      BullMQ  │  │  Drizzle ORM
                                              ▼  ▼
                                     ┌───────┐  ┌──────────┐
                                     │ Redis │  │ Postgres │
                                     └───────┘  └──────────┘
                                          │
                                   Worker │ polls every 12s
                                          ▼
                                   ┌─────────────┐
                                   │ Solana RPC  │
                                   │ (mainnet)   │
                                   └─────────────┘
```
