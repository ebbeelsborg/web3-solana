# Architecture Docs

Short guides for each component of the Solana Wallet Tracker architecture.

| Component                             | Doc                                  |
| ------------------------------------- | ------------------------------------ |
| [Frontend](frontend.md)               | React + Vite, React Query, WebSocket |
| [API](api.md)                         | Express REST + WebSocket server      |
| [Job queue](job-queue.md)             | BullMQ, Redis, polling workers       |
| [Database](database.md)               | MongoDB, wallets, transactions       |
| [Blockchain](blockchain.md)           | Solana RPC, getSignaturesForAddress  |
| [Smart contracts](smart-contracts.md) | SPL Token Program, token balances    |

## Operations

| Doc                     | Topic                            |
| ----------------------- | -------------------------------- |
| [Security](security.md) | Secrets, `MONGODB_URI`, rotation |
