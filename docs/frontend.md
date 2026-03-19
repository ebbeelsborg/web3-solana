# Frontend

**Location:** `artifacts/solana-tracker/`

The frontend is a React 19 + Vite SPA that provides the user interface for tracking Solana addresses.

## How It's Used

- **Dashboard** (`pages/dashboard.tsx`) — Landing page with wallet input. Users paste an address and submit to start tracking.
- **Wallet view** (`pages/wallet-view.tsx`) — Live transaction feed for a single address. Shows transactions, token balances (from SPL Token Program), and WebSocket connection status.
- **Layout** (`components/layout.tsx`) — Sidebar with list of tracked wallets and navigation.

## Data Flow

- **REST:** React Query hooks (generated from OpenAPI) fetch wallets and transactions from the API. `useGetWalletTransactions`, `useGetWalletBalances`, `useListWallets`, etc.
- **WebSocket:** `useSolanaWebSocket` connects to `/ws`, subscribes to the current wallet address, and merges incoming transactions into the React Query cache so new txs appear without a page refresh.
- **Token balances:** Fetched via `useGetWalletBalances` — reads from the SPL Token Program through the API.

## Key Dependencies

- React Query (TanStack Query) for server state
- Wouter for routing
- Tailwind CSS + Radix UI for styling
- Framer Motion for animations
