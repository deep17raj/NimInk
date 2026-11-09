# NimInk — Write. Earn. Stake.

A mobile-first writing and earning Mini App for Nimiq Pay. Writers publish articles, earn NIM through tips, requested articles, and verified-read rewards, then stake their earnings in one tap.

Built for the **Nimiq Mini Apps Competition (Cycle III)**.

## Quick Start

```bash
# Prerequisites: Node.js 22+
git clone <repo-url>
cd NimInk
npm install
npm run seed          # Create demo data (3 users, 6 articles, validators, pool)
npm run dev           # Start API (port 3001) and frontend (port 5173)
```

Open http://localhost:5173 — pick a demo account and explore.

## Testing Inside Nimiq Pay

1. Run `npm run dev` (or `npm run dev:web -- --host`)
2. Note the Network URL (e.g., `http://192.168.1.42:5173`)
3. In Nimiq Pay: Mini Apps → Custom URL → paste the URL
4. For testnet: long-press the settings button for 10 seconds in the app menu

## Project Structure

```
NimInk/
├── apps/web/        # Vue 3 + Vite + Tailwind (mobile-first SPA)
├── apps/api/        # Hono + MongoDB shared content, SQLite demo/read ledger
├── packages/shared/ # Types, wallet adapter interface, helpers, scoring
├── PLAN.md          # Implementation phases
├── DECISIONS.md     # Architecture decisions
└── SECURITY.md      # Threat model
```

## Demo Mode

The app ships in demo mode by default. Three pre-made accounts (Alice, Bob, Carol) each start with 1,000 demo NIM. A faucet button provides 500 more (3x/day).

- **`/dev`** — Developer panel: fast-forward time, distribute pool, accrue staking rewards, simulate errors, reset data
- **`/admin`** — Admin panel: reports queue, pool payouts, fraud flags

## Switching from Demo to Real Mode

1. Copy `.env.example` to `.env` and set `VITE_WALLET_MODE=nimiq`.
2. Add your MongoDB Atlas URI and database name. Users, articles, requests, submissions, tips, and uploaded article images are stored in MongoDB so they are shared between users and API instances.
3. Set a random `JWT_SECRET`, your deployed mini app URL in `APP_ORIGIN`, and the wallet addresses allowed to use admin APIs in `ADMIN_ADDRESSES`.
4. Set `NIMIQ_RPC_URL` and optional RPC credentials. Wallet transfers use Nimiq Pay approvals; the API checks sender, recipient, amount, and transaction hash before marking tips or request awards paid.
5. Deploy the API and frontend over HTTPS. Set `VITE_API_URL` to the deployed API origin if it is hosted separately.

Sign-in uses the Nimiq Mini App SDK to request a one-time wallet signature. The API verifies the Nimiq signed-message proof, derives the account address from its public key, consumes the five-minute challenge once, and issues a short-lived JWT. Private keys never leave Nimiq Pay.

`ADMIN_ADDRESSES` is a comma-separated list of Nimiq addresses. Without an allowlisted address, authenticated users cannot access moderation and payout administration endpoints. Demo reset and faucet endpoints are disabled in production.

## Environment Variables

See `.env.example` for all options. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_WALLET_MODE` | `nimiq` in `.env.example` | `demo` or `nimiq` |
| `JWT_SECRET` | — | Random secret for session tokens |
| `MONGODB_URI` | — | MongoDB Atlas or self-hosted MongoDB connection string |
| `MONGODB_DATABASE` | `nimink` | Shared Mongo database name |
| `APP_ORIGIN` | — | Public HTTPS origin used in wallet sign-in challenges |
| `ADMIN_ADDRESSES` | — | Comma-separated Nimiq admin allowlist |
| `PORT` | `3001` | API server port |
| `NIMIQ_RPC_URL` | — | Nimiq node RPC (real mode) |
| `POOL_SIZE_LUNA` | `20000000` | Weekly pool size (200 NIM) |

## License

MIT
