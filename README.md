# NimInk — Write. Earn. Stake.

A mobile-first writing and earning Mini App for Nimiq Pay. Writers publish free or premium articles, earn NIM through tips, requested articles, optional reader subscriptions, or individual article sales, then stake their earnings in one tap. Read counts help readers discover popular articles and do not generate payments.

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

- **`/dev`** — Developer panel: fast-forward time, accrue staking rewards, simulate errors, reset data
- **`/admin`** — Admin panel: reports queue and fraud flags

## Switching from Demo to Real Mode

1. Copy `.env.example` to `.env` and set `VITE_WALLET_MODE=nimiq`.
2. Add your MongoDB Atlas URI and database name. Users, articles, requests, submissions, tips, and uploaded article images are stored in MongoDB so they are shared between users and API instances.
3. Set a random `JWT_SECRET`, your deployed mini app URL in `APP_ORIGIN`, and the wallet addresses allowed to use admin APIs in `ADMIN_ADDRESSES`.
4. Set `NIMIQ_RPC_URL` and optional RPC credentials. Wallet transfers use Nimiq Pay approvals; the API checks sender, recipient, amount, and transaction hash before recording tips, request awards, subscriptions, or premium article purchases.
5. Deploy the app over HTTPS. The API serves the built frontend and handles `/api` and `/uploads` on the same origin, so a separate frontend service is not needed.

Sign-in uses the Nimiq Mini App SDK to request a one-time wallet signature. The API verifies the Nimiq signed-message proof, derives the account address from its public key, consumes the five-minute challenge once, and issues a short-lived JWT. Private keys never leave Nimiq Pay.

`ADMIN_ADDRESSES` is a comma-separated list of Nimiq addresses. Without an allowlisted address, authenticated users cannot access moderation and payout administration endpoints. Demo reset and faucet endpoints are disabled in production.

## Deploy to Render

The repository includes `render.yaml` for a single Render web service. Render builds the shared package, API, and frontend, then starts only the API process. The API serves the compiled frontend, so the deployed app uses one HTTPS origin and needs no `VITE_API_URL` setting.

1. Push the repository to GitHub and create a new **Blueprint** in Render using that repository.
2. In the service environment, add `MONGODB_URI` with your Atlas connection string. The Blueprint generates `JWT_SECRET` and sets `MONGODB_DATABASE` to `nimink`.
3. In MongoDB Atlas, allow connections from your Render service's outbound IP addresses.
4. After the first deploy, copy the Render service URL into `APP_ORIGIN` (for example, `https://nimink.onrender.com`) and redeploy. Keep `VITE_WALLET_MODE=nimiq` so the production build enables Nimiq Pay sign-in.
5. Set `NIMIQ_RPC_URL` and `NIMIQ_NETWORK` to the same network selected in Nimiq Pay (`mainnet` or `testnet`). The app blocks payment approval when they differ. The public default is suitable for testing; use a reliable managed or self-hosted endpoint for production.

The health endpoint is `/api/health`. It should report `"database":"mongodb"` after the service connects to Atlas.

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
| `NIMIQ_RPC_URL` | `https://rpc.nimiqwatch.com` | Nimiq node RPC; must use the same network as Nimiq Pay |
| `NIMIQ_NETWORK` | `mainnet` | `mainnet` or `testnet`; checked against Nimiq Pay before sending |
| `NIMIQ_MIN_CONFIRMATIONS` | `2` | Confirmations required before a payment is recorded |
| `POOL_SIZE_LUNA` | `20000000` | Weekly pool size (200 NIM) |

## License

MIT
