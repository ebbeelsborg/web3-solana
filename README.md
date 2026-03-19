# Solana Wallet Tracker

A full-stack Web3 monitoring dashboard that tracks any Solana wallet address in real time. Paste a public address and immediately see its transaction history streaming live — no wallet connection, no private keys, purely read-only on-chain data.

---

## Why This Is a Web3 App

Most web apps talk to centralised servers you trust. This app talks directly to the **Solana blockchain** — a decentralised, permissionless network where every transaction is public and immutable. Anyone with an address can observe it. No account is required. No permission is granted or revoked. The data cannot be altered or deleted.

What makes this Web3:

- **Reads directly from the Solana ledger.** Every transaction displayed was verified by thousands of validators and permanently recorded on-chain. The app does not have its own concept of "a transaction" — it reads the canonical truth from the network.
- **No custody.** The app never handles a private key, signs anything, or moves funds. It is a read-only window into on-chain activity.
- **Permissionless.** Any valid Solana address — owned by a person, a program, a DAO treasury — can be tracked. No approval process, no sign-up.
- **On-chain data as the source of truth.** Transaction signatures, slot numbers, fees, and success/failure status are all pulled directly from Solana validators. The database only exists as a cache to reduce RPC load and enable instant page loads.

---

## How It Interacts with the Blockchain

The app uses the **Solana JSON-RPC API** via the official `@solana/web3.js` SDK. Here is the exact flow:

```
User pastes wallet address
        │
        ▼
POST /api/wallet  ──►  Saved to MongoDB
        │
        ▼
Background poller starts (every 20 seconds)
        │
        ▼
getSignaturesForAddress(address, { limit: 20 })
        │                  ▲
        │         Solana mainnet-beta RPC
        │         (https://api.mainnet-beta.solana.com)
        │
        ▼
Compare returned signatures against DB
        │
        ├── Already stored → skip
        │
        └── New signatures → INSERT to MongoDB
                    │
                    ▼
            WebSocket broadcast to browser
                    │
                    ▼
        Transaction row appears in the UI
```

### `getSignaturesForAddress`

This is the core RPC method the app uses. Given a public key, it returns an ordered list of confirmed transaction signatures that involved that address — as sender, receiver, or program interaction. Each entry includes:

| Field | Description |
|---|---|
| `signature` | Base-58 transaction ID, globally unique on-chain |
| `slot` | The slot (block) in which the transaction was confirmed |
| `blockTime` | Unix timestamp of the block |
| `err` | `null` if successful, error object if the transaction failed |
| `memo` | Optional memo attached to the transaction |

The app maps `err === null` to `status: "success"` and everything else to `status: "failed"`.

### Deduplication

Because the poller runs continuously, it must not re-insert transactions already in the database. On each poll cycle it:

1. Fetches the 20 most recent signatures from the RPC
2. Queries MongoDB for which of those signatures already exist
3. Inserts only the genuinely new ones
4. Emits the new transactions over WebSocket to any connected browsers

### WebSocket Push

Once new transactions are written to MongoDB, the server immediately broadcasts them to every browser subscribed to that wallet address. The React client merges them into the existing list without a page reload.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React + Vite Frontend                               │   │
│  │                                                      │   │
│  │  • Dashboard — add wallets, landing page             │   │
│  │  • Wallet View — live transaction feed               │   │
│  │  • useListWallets / useGetWalletTransactions hooks   │   │
│  │    (React Query, generated from OpenAPI spec)        │   │
│  │  • useSolanaWebSocket hook — subscribes via /ws,     │   │
│  │    merges incoming txs into React Query cache         │   │
│  └────────────────┬──────────────────────────┬───────────┘   │
│                   │ REST (HTTP)               │ WebSocket     │
└───────────────────│───────────────────────────│───────────────┘
                    │                           │
┌───────────────────▼───────────────────────────▼───────────────┐
│                    Express API Server (Node.js / TypeScript)   │
│                                                                │
│  Routes                                                        │
│  ├── POST /api/wallet        — register wallet, start polling  │
│  ├── GET  /api/wallet/:addr  — fetch wallet + transactions     │
│  ├── GET  /api/wallets       — list all tracked wallets        │
│  └── GET  /api/healthz       — health check                    │
│                                                                │
│  WebSocket (/ws)                                               │
│  └── accepts { type: "subscribe", address: "..." }            │
│      emits  { type: "transactions", address, transactions }    │
│                                                                │
│  Background Poller (setInterval, 20s per wallet)               │
│  └── calls Solana RPC → deduplicates → inserts → broadcasts   │
└──────────┬────────────────────────────────────────────────────┘
           │                                          │
           ▼                                          ▼
┌──────────────────────┐              ┌───────────────────────────────┐
│   MongoDB Atlas       │              │   Solana Mainnet RPC          │
│                       │              │                               │
│   Wallets collection  │              │   getSignaturesForAddress     │
│   ├── address (unique)│              │   ── returns up to 1000 sigs  │
│   └── createdAt       │              │   ── each includes:           │
│                       │              │      signature, slot,         │
│   Transactions coll.  │              │      blockTime, err status    │
│   ├── signature (uniq)│              │                               │
│   ├── walletAddress   │              │   Source of truth: the        │
│   ├── slot            │              │   Solana blockchain itself,   │
│   ├── blockTime       │              │   verified by validators      │
│   ├── fee             │              └───────────────────────────────┘
│   ├── status          │
│   └── createdAt       │
└──────────────────────┘
```

---

## Features

- Track any Solana mainnet wallet address (read-only, no wallet connection)
- Transaction feed updated live via WebSocket — new transactions appear without refreshing
- Persistent storage with signature-level deduplication
- Multi-wallet tracking from a single dashboard
- Dark-mode UI with animated transaction rows
- Copy signature to clipboard, open transaction in Solscan

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion |
| API client | Orval (code-generated React Query hooks from OpenAPI spec) |
| Backend | Node.js, TypeScript, Express 5 |
| Database | MongoDB Atlas, Mongoose |
| Real-time | WebSockets (`ws`) |
| Blockchain | `@solana/web3.js` — `Connection.getSignaturesForAddress` |
| Monorepo | pnpm workspaces |
| Build | esbuild (CJS bundle for production) |

---

## Project Structure

```
├── artifacts/
│   ├── api-server/              # Express backend
│   │   └── src/
│   │       ├── index.ts         # Server entry — connects DB, starts WS + poller
│   │       ├── app.ts           # Express app setup
│   │       ├── lib/
│   │       │   ├── solana.ts    # RPC connection + getSignaturesForAddress wrapper
│   │       │   ├── queue.ts     # setInterval poller per wallet
│   │       │   └── websocket.ts # WS server, subscribe/emit logic
│   │       └── routes/
│   │           └── wallet.ts    # REST endpoints
│   │
│   └── solana-tracker/          # React frontend
│       └── src/
│           ├── pages/
│           │   ├── dashboard.tsx    # Landing + wallet input
│           │   └── wallet-view.tsx  # Transaction feed
│           ├── hooks/
│           │   └── use-solana-ws.ts # WebSocket subscription hook
│           └── components/
│               └── layout.tsx       # Sidebar + navigation
│
├── lib/
│   ├── db/                      # Mongoose models + MongoDB connection
│   │   └── src/
│   │       ├── index.ts         # connectDb() export
│   │       └── models/
│   │           ├── wallet.ts    # Wallet model
│   │           └── transaction.ts # Transaction model
│   ├── api-spec/                # OpenAPI spec (source of truth for types)
│   ├── api-client-react/        # Generated React Query hooks
│   └── api-zod/                 # Generated Zod validators
```

---

## API Reference

### REST

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `GET` | `/api/healthz` | — | `{ status: "ok" }` |
| `POST` | `/api/wallet` | `{ address: string }` | Wallet object (201) or 409 if already tracked |
| `GET` | `/api/wallet/:address` | `?limit=50` | `{ wallet, transactions[] }` |
| `GET` | `/api/wallets` | — | `Wallet[]` with transaction counts |

### WebSocket (`/ws`)

**Subscribe:**
```json
{ "type": "subscribe", "address": "4EtAJ1p8RjqccEVhEhaYnEgQ6kA4JHR8oYqyLFwARUj6" }
```

**Incoming push (new transactions):**
```json
{
  "type": "transactions",
  "address": "4EtAJ1p8RjqccEVhEhaYnEgQ6kA4JHR8oYqyLFwARUj6",
  "transactions": [
    {
      "signature": "HCWYZ7wN...",
      "slot": 407031809,
      "blockTime": 1710000000,
      "fee": 5000,
      "status": "success"
    }
  ]
}
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | Required |
| `SOLANA_RPC_URL` | Solana JSON-RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `PORT` | API server port | Auto-assigned |

---

## Running Locally

```bash
# Install dependencies
pnpm install

# Set environment variables
export MONGODB_URI="mongodb+srv://..."
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the frontend (separate terminal)
pnpm --filter @workspace/solana-tracker run dev
```
