# API (Backend)

**Location:** `artifacts/api-server/`

The backend is an Express 5 server that handles REST requests and WebSocket connections.

## How It's Used

- **REST endpoints** (`routes/wallet.ts`, `routes/health.ts`):
  - `POST /api/wallet` — Register a new address to track
  - `GET /api/wallet/:address` — Fetch wallet + transactions (with Redis cache)
  - `GET /api/wallet/:address/balances` — Fetch SOL + SPL token balances
  - `GET /api/wallets` — List all tracked wallets with tx counts
  - `GET /api/healthz` — Health check

- **WebSocket** (`lib/websocket.ts`) — Server at `/ws`. Clients send `{ type: "subscribe", address: "..." }` to receive live transaction pushes for that address.

- **Middleware:** CORS, rate limiting (global + stricter for POST /wallet), JSON body parsing with size limits.

## Security

- Rate limiting: 100 req/15min global, 10 req/15min for wallet creation
- Address validation via `isValidSolanaAddress` before any DB or RPC calls
- Limit query param capped between 1 and 100

## Flow

1. User adds wallet → API saves to MongoDB, enqueues BullMQ job, invalidates cache
2. User requests wallet → API checks cache, else queries MongoDB + optionally fetches balances from Solana
3. Worker inserts new txs → API broadcasts via WebSocket to subscribed clients
