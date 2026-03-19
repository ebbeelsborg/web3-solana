# Smart Contracts (SPL Token Program)

Smart contracts are programs deployed on-chain that execute logic and manage state.

**Location:** `artifacts/api-server/src/lib/solana.ts` — `fetchAddressBalances`, `TOKEN_PROGRAM_ID`

The SPL Token Program is a Solana program (smart contract) that manages token accounts. We read from it — we never write.

## How It's Used

- **`getParsedTokenAccountsByOwner`** — RPC method that queries the Token Program. Returns all token accounts owned by an address (programId: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`).

- **Token accounts** — Each SPL token (USDC, RAY, etc.) has accounts managed by the program. We read mint, decimals, and balance.

- **API:** `GET /api/wallet/:address/balances` — Fetches SOL + SPL tokens, returns `{ sol, tokens }`.

## Flow

1. User views a wallet → Frontend calls `/api/wallet/:address/balances`
2. API calls `fetchAddressBalances` → `getBalance` (SOL) + `getParsedTokenAccountsByOwner` (Token Program)
3. Response includes SOL and non-zero token balances (mint, amount, decimals)

## Read-Only

We only read account data. No token transfers, no approvals, no program calls that modify state.
