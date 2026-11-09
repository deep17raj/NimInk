# NimInk — Decisions Log

## D1: Hono over Express
**Choice**: Hono for the backend framework.
**Why**: Lighter, faster, better TypeScript support, built-in middleware. Deploys easily as a Node.js service.

## D2: better-sqlite3 directly (no ORM)
**Choice**: Use `better-sqlite3` with raw SQL and a thin helper layer.
**Why**: Simpler, fewer dependencies, full control over queries. Drizzle adds complexity we don't need for this scope. Migrations are plain SQL files run in order.

## D3: JWT for sessions
**Choice**: Stateless JWT tokens stored in httpOnly cookies.
**Why**: Simple, no session table needed. Demo mode generates JWTs the same way for consistency. Short expiry (24h) with refresh on activity.

## D4: Demo ledger is server-side
**Choice**: All demo balances and transactions live in SQLite, not localStorage.
**Why**: Server-side verification must work identically in demo and real mode. A client-side demo ledger would bypass the verification pipeline.

## D5: No escrow for requests
**Choice**: Requesters pay winners directly from their wallet. The app never holds funds.
**Why**: Spec requirement. Avoids custodial complexity and legal risk. Trade-off: an "Awarded, unpaid" state is possible; we surface it publicly as reputation pressure.

## D6: Read validation — server-driven, probabilistic
**Choice**: Server issues session tokens and validates all telemetry. Client reports are treated as claims, not facts.
**Why**: Any client-side validation can be spoofed. We layer multiple weak signals (timing, quiz, device, IP) for reasonable confidence. Perfect Sybil resistance is out of scope.

## D7: Luna everywhere, NIM only in display
**Choice**: All internal values stored and transmitted as integer Luna. NIM is a display format only.
**Why**: Avoids floating-point errors. 1 NIM = 100,000 Luna. Conversion happens in shared helpers and Vue filters.

## D8: App name in one config
**Choice**: `APP_NAME` constant in `packages/shared/src/config.ts`.
**Why**: Easy to rename. Used in UI text, page titles, and API responses.

## D9: Tailwind CSS for styling
**Choice**: Tailwind CSS with a custom theme extending the color palette (gold, blue, navy).
**Why**: Rapid mobile-first development. Utility classes keep component files self-contained.

## D10: markdown-it + DOMPurify
**Choice**: `markdown-it` with `html: false` plus `DOMPurify` for article rendering.
**Why**: Spec requirement. Prevents XSS while allowing rich markdown content.

## D11: Monorepo with npm workspaces
**Choice**: npm workspaces (not pnpm/yarn/turborepo).
**Why**: Zero extra tooling. `packages/shared` is referenced by both `apps/web` and `apps/api` via workspace protocol.

## D12: Single deploy target
**Choice**: One service serves both API and static frontend (Hono serves the Vite build).
**Why**: Simplifies deployment. One Dockerfile, one process, one HTTPS origin. API routes under `/api/*`, everything else serves the SPA.

## D13: Spanish as second language
**Choice**: Ship English (default) + Spanish (es) for localization proof.
**Why**: Large Nimiq community in Latin America. Demonstrates the i18n scaffold works.

## D14: crypto.getRandomValues fallback for UUIDs
**Choice**: Use `crypto.randomUUID()` with fallback to `crypto.getRandomValues()`.
**Why**: Nimiq Pay WebView over HTTP (local dev) is not a secure context; `crypto.randomUUID()` may be unavailable. Docs explicitly warn about this.

## D15: Real-mode signature verification
**Choice**: Implement `verifySignature()` using Nimiq's Ed25519 scheme, marked `TODO(verify)`.
**Why**: The SDK's `sign()` returns hex publicKey and signature. Nimiq uses Ed25519 for basic accounts. Exact verification library/method needs confirmation against Nimiq core docs.

## D16: Validator list
**Choice**: Mock validator list in demo mode. Real mode: fetch from public Nimiq staking API (endpoint TBD, marked `TODO(verify)`).
**Why**: No public validators API endpoint was found in the mini-app docs. The staking transactions themselves are well-documented.
