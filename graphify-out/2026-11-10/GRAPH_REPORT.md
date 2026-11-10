# Graph Report - NimInk  (2026-11-07)

## Corpus Check
- Corpus is ~23,246 words - fits in a single context window. You may not need a graph.

## Summary
- 548 nodes · 888 edges · 44 communities (26 shown, 18 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Web App Shell & Navigation
- API Server & Routes
- Web Build & Dependencies
- Database, Config & Scoring
- Article Reading Page
- Root Workspace Config
- Shared TypeScript Types
- API Package Config
- Request Detail Page
- Admin & Dev Tools
- Article Write Page
- Create Request & Luna Utils
- Splash & Onboarding
- Staking Page
- Base TypeScript Config
- Shared Package Config
- API Client & Auth Stores
- Profile Page & i18n
- Web TypeScript Config
- API TypeScript Config
- Demo & Wallet Adapter
- Shared TypeScript Config
- Markdown Rendering
- Auth & Signature Flow
- Read Validation & Pool
- Payment Confirm Component
- Staking & Earnings Plan
- Web Entry & Branding
- Monorepo Scaffold
- Crypto & Data Privacy
- Content Sanitization
- Escrow & Requests Plan
- i18n & Moderation Plan
- Claude Config
- File Layout Plan
- Articles & Tips Phase
- Seed, Tests & Deploy
- Risk Assessment
- Environment Variables
- Environment Security

## God Nodes (most connected - your core abstractions)
1. `vue` - 23 edges
2. `t()` - 20 edges
3. `vue-router` - 18 edges
4. `api` - 16 edges
5. `hono` - 15 edges
6. `useAuthStore` - 15 edges
7. `formatNim()` - 15 edges
8. `compilerOptions` - 13 edges
9. `uuid` - 12 edges
10. `db` - 12 edges

## Surprising Connections (you probably didn't know these)
- `faucet()` --calls--> `formatNim()`  [EXTRACTED]
  apps/web/src/pages/ProfilePage.vue → packages/shared/src/luna.ts
- `confirmTip()` --calls--> `nimToLuna()`  [EXTRACTED]
  apps/web/src/pages/ArticlePage.vue → packages/shared/src/luna.ts
- `create()` --calls--> `nimToLuna()`  [EXTRACTED]
  apps/web/src/pages/CreateRequestPage.vue → packages/shared/src/luna.ts
- `confirmStake()` --calls--> `nimToLuna()`  [EXTRACTED]
  apps/web/src/pages/StakePage.vue → packages/shared/src/luna.ts
- `useAuthStore` --indirect_call--> `disconnect()`  [INFERRED]
  apps/web/src/stores/auth.ts → apps/web/src/pages/ProfilePage.vue

## Import Cycles
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/tips.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/reports.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/staking.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/earnings.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/auth.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/demo.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/pool.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/articles.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/requests.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/reads.ts -> apps/api/src/index.ts`
- 2-file cycle: `apps/api/src/index.ts -> apps/api/src/routes/admin.ts -> apps/api/src/index.ts`

## Hyperedges (group relationships)
- **Wallet Adapter Abstraction Pattern** — plan_wallet_adapter_interface, plan_demo_wallet_adapter, plan_nimiq_pay_wallet_adapter, security_demo_real_mode_confusion, decisions_demo_ledger_server_side [EXTRACTED 0.95]
- **Read Validation Anti-Sybil System** — decisions_read_validation_server_driven, plan_read_validation_scoring, plan_weekly_pool, security_fake_reads_sybil, plan_phase_4_read_validation_pool [EXTRACTED 0.95]
- **Authentication and Signature Verification Flow** — decisions_jwt_sessions, decisions_ed25519_signature_verification, plan_auth_flow, security_signature_forgery [EXTRACTED 0.95]

## Communities (44 total, 18 thin omitted)

### Community 0 - "Web App Shell & Navigation"
Cohesion: 0.05
Nodes (44): ImportMeta, ImportMetaEnv, *.vue, Window, auth, route, showNav, props (+36 more)

### Community 1 - "API Server & Routes"
Cohesion: 0.11
Nodes (31): dependencies, dotenv@^16.4.0, hono@^4.6.0, @hono/node-server@^1.13.0, jsonwebtoken@^9.0.2, uuid@^10.0.0, app, db (+23 more)

### Community 2 - "Web Build & Dependencies"
Cohesion: 0.06
Nodes (39): dependencies, dompurify@^3.2.0, markdown-it@^14.1.0, @nimink/shared@*, pinia@^2.2.0, vue@^3.5.0, vue-router@^4.4.0, devDependencies (+31 more)

### Community 3 - "Database, Config & Scoring"
Cohesion: 0.07
Nodes (34): better-sqlite3@^11.6.0, initializeDatabase(), accounts, articleRows, articles, db, __dirname, now (+26 more)

### Community 4 - "Article Reading Page"
Cohesion: 0.07
Nodes (24): article, auth, checkpointsSent, error, isOwnArticle, loading, quizAnswer, quizResult (+16 more)

### Community 5 - "Root Workspace Config"
Cohesion: 0.07
Nodes (26): allowScripts, better-sqlite3@11.10.0, esbuild@0.25.12, esbuild@0.28.2, vue-demi@0.14.10, description, devDependencies, vitest@^5.1.0 (+18 more)

### Community 6 - "Shared TypeScript Types"
Cohesion: 0.07
Nodes (18): ApiError, Article, ArticleRequest, DemoStake, DemoTransaction, EarningsSummary, PaymentVerifier, Payout (+10 more)

### Community 7 - "API Package Config"
Cohesion: 0.10
Nodes (25): @nimink/shared@*, devDependencies, tsx@^4.19.0, @types/better-sqlite3@^7.6.12, @types/jsonwebtoken@^9.0.7, @types/node@^22.0.0, @types/uuid@^10.0.0, typescript@^5.6.0 (+17 more)

### Community 8 - "Request Detail Page"
Cohesion: 0.10
Nodes (15): auth, isRequester, loading, payLoading, reputation, request, route, router (+7 more)

### Community 9 - "Admin & Dev Tools"
Cohesion: 0.11
Nodes (9): emit, props, flags, loading, payouts, reports, toast, timeOffset (+1 more)

### Community 10 - "Article Write Page"
Cohesion: 0.12
Nodes (17): auth, body, buildQuizJson(), editId, quizCorrectIndex, quizOptions, quizQuestion, readTime (+9 more)

### Community 11 - "Create Request & Luna Utils"
Cohesion: 0.18
Nodes (14): budgetNim, create(), deadline, description, minDate, router, saving, toast (+6 more)

### Community 12 - "Splash & Onboarding"
Cohesion: 0.14
Nodes (14): auth, createNewAccount(), demoAccounts, finishOnboarding(), loading, newAccountName, nextStep(), onboardingStep (+6 more)

### Community 13 - "Staking Page"
Cohesion: 0.14
Nodes (13): auth, isFirstStake, loading, minAmount, myStakes, router, selectedValidator, showConfirm (+5 more)

### Community 14 - "Base TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, module, moduleResolution (+5 more)

### Community 15 - "Shared Package Config"
Cohesion: 0.17
Nodes (12): devDependencies, typescript@^5.6.0, exports, typescript, main, name, private, scripts (+4 more)

### Community 16 - "API Client & Auth Stores"
Cohesion: 0.33
Nodes (9): api, getAuthToken(), request(), setAuthToken(), disconnect(), useAuthStore, User, useWalletStore (+1 more)

### Community 17 - "Profile Page & i18n"
Cohesion: 0.20
Nodes (10): getLocale(), setLocale(), articles, auth, faucet(), loading, router, switchLang() (+2 more)

### Community 18 - "Web TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, jsxImportSource, lib, outDir, paths, rootDir, extends (+3 more)

### Community 19 - "API TypeScript Config"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, outDir, rootDir, types, extends, include, ../../tsconfig.base.json (+1 more)

### Community 20 - "Demo & Wallet Adapter"
Cohesion: 0.22
Nodes (7): DemoWalletAdapter, NimiqPayWalletAdapter, Phase 1: Wallet Adapter and App Shell, WalletAdapter Interface, Demo Mode Description, Threat: Demo-to-Real Mode Confusion, Threat: Payment Replay

### Community 21 - "Shared TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 22 - "Markdown Rendering"
Cohesion: 0.40
Nodes (4): md, renderMarkdown(), renderedBody, renderedPreview

### Community 23 - "Auth & Signature Flow"
Cohesion: 0.50
Nodes (3): Auth Flow: Nonce-Sign-Verify-Session, Switching from Demo to Real Mode, Threat: Signature Forgery (Auth Bypass)

### Community 24 - "Read Validation & Pool"
Cohesion: 0.60
Nodes (4): Phase 4: Read Validation and Weekly Pool, Read Validation Scoring, Weekly Pool Distribution, Threat: Fake Reads (Sybil Attack)

### Community 25 - "Payment Confirm Component"
Cohesion: 0.50
Nodes (3): auth, emit, props

## Knowledge Gaps
- **22 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Graphify Knowledge Graph Instructions`, `Phase 1: Wallet Adapter and App Shell` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 322 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `Web App Shell & Navigation` to `Web Build & Dependencies`, `Article Reading Page`, `Request Detail Page`, `Admin & Dev Tools`, `Article Write Page`, `Create Request & Luna Utils`, `Splash & Onboarding`, `Staking Page`, `API Client & Auth Stores`, `Profile Page & i18n`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web App Shell & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.05069124423963134 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Root Workspace Config` to `Database, Config & Scoring`, `Create Request & Luna Utils`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `API Server & Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.11347517730496454 - nodes in this community are weakly interconnected._
- **Why does `vue-router` connect `Web App Shell & Navigation` to `Web Build & Dependencies`, `Article Reading Page`, `Request Detail Page`, `Article Write Page`, `Create Request & Luna Utils`, `Splash & Onboarding`, `Staking Page`, `Profile Page & i18n`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Web Build & Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06025369978858351 - nodes in this community are weakly interconnected._