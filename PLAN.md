# NimInk — Implementation Plan

## Phases

### Phase 0: Scaffold (this phase)
- Initialize monorepo with npm workspaces
- Set up `apps/web` (Vite + Vue 3 + TS + Tailwind), `apps/api` (Hono + better-sqlite3), `packages/shared`
- Configure TypeScript, ESLint, Vitest
- Create `.env.example`, `.gitignore`, `LICENSE`
- Git init and first commit

### Phase 1: Wallet Adapter & App Shell
- `WalletAdapter` interface and `DemoWalletAdapter` in `packages/shared`
- `NimiqPayWalletAdapter` skeleton (real SDK calls per docs)
- Demo ledger in API (SQLite: accounts, balances, transactions)
- Auth flow: nonce → sign → verify → session (JWT)
- App shell: bottom tab bar, router, theme system (light + dark)
- Splash/connect screen, account picker, onboarding carousel
- Demo mode banner, phone-frame wrapper for desktop
- Developer panel at `/dev`

### Phase 2: Articles & Tips
- DB schema: articles, quizzes, reads, tips, payments
- Article CRUD API with validation
- Feed screen (Latest, Top tipped, Requested tabs)
- Article reader: markdown rendering, progress bar, read time
- Quiz display and server-side grading
- Write screen: markdown editor, toolbar, live preview, quiz builder, autosave
- Tip flow: preset amounts, custom, optional note
- Payment creation → server verification → record → feed update
- Tags system

### Phase 3: Requests
- DB schema: requests, submissions
- Request CRUD API
- Request list screen with status chips
- Create request form (topic, description, budget, deadline)
- Submit draft (link published article)
- Award winner, pay flow with server verification
- Reputation tracking (paid on time ratio)
- "Awarded, unpaid" 7-day warning

### Phase 4: Read Validation & Weekly Pool
- Read session: start → checkpoints → finish → quiz
- Server-side validation: identity, timing, quiz, reputation weight
- Caps and rate limits per wallet/device/IP
- Fraud flags and cluster detection
- Weekly pool entity, score formula, distribution
- Admin screen at `/admin`: reports queue, pool status, payout list, flags
- Fast-forward support for demo

### Phase 5: Earnings & Staking
- Earnings screen: balance, breakdown, bar chart, tx list
- Pending read rewards with payout date
- Stake flow: validator list (mock), amount picker, explanations
- Demo staking: ledger entries, simulated rewards
- Real-mode staking calls: `sendNewStakerTransaction`, `sendStakeTransaction`
- Exit flow explanation (deactivate → wait epoch → retire → remove)

### Phase 6: Moderation, Privacy, L10n, Polish
- Content guidelines screen
- Report button on articles and requests
- Admin: hide/restore content
- Privacy & data disclosure sheet (shown at connect)
- Localization scaffold: English + Spanish
- Accessibility pass (Lighthouse 90+)
- Reduced motion support
- Skeleton loaders, empty states, error states with retry

### Phase 7: Seed Data, Tests, Docs, Deploy
- `npm run seed` script
- Vitest unit tests for all business logic
- Playwright e2e tests (7 scenarios from spec)
- README.md, SECURITY.md, Dockerfile
- Final polish and commit

## File Layout

```
NimInk/
├── apps/
│   ├── web/                    # Vite + Vue 3 + TS
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── composables/    # Vue composables
│   │   │   ├── layouts/        # AppLayout with bottom nav
│   │   │   ├── pages/          # Route pages
│   │   │   ├── stores/         # Pinia stores
│   │   │   ├── i18n/           # Translations
│   │   │   ├── App.vue
│   │   │   └── main.ts
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── api/                    # Hono + better-sqlite3
│       ├── src/
│       │   ├── db/             # Schema, migrations, seed
│       │   ├── routes/         # API route modules
│       │   ├── services/       # Business logic
│       │   ├── middleware/      # Auth, rate-limit, validation
│       │   └── index.ts
│       └── package.json
├── packages/
│   └── shared/                 # Types, wallet adapter, helpers
│       ├── src/
│       │   ├── types.ts
│       │   ├── wallet.ts       # WalletAdapter interface
│       │   ├── demo-wallet.ts
│       │   ├── nimiq-wallet.ts
│       │   ├── luna.ts         # Luna/NIM conversion helpers
│       │   └── scoring.ts      # Read validation scoring
│       └── package.json
├── PLAN.md
├── DECISIONS.md
├── SECURITY.md
├── LICENSE
├── README.md
├── Dockerfile
├── .env.example
├── .gitignore
├── package.json                # Workspace root
├── tsconfig.base.json
└── vitest.workspace.ts
```

## Risks

1. **Nimiq SDK availability**: `@nimiq/mini-app-sdk` may have undocumented behaviors. Mitigation: isolate behind `WalletAdapter`, mark unknowns `TODO(verify)`.
2. **SQLite concurrency**: Single-writer. Mitigation: Use WAL mode, keep transactions short.
3. **Demo realism**: Demo wallet must feel like the real thing. Mitigation: Mimic Nimiq Pay confirmation sheets closely.
4. **Time budget**: 7 phases in ~3 days. Mitigation: Follow cut list strictly. Tips + requests + staking are must-haves; bar chart and dark theme can go.
5. **Read validation gaming**: Client-side telemetry is fakeable. Mitigation: Server-side validation with multiple signals, caps, and fraud flags.
