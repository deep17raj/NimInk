# Graph Report - NimInk  (2026-11-10)

## Corpus Check
- 85 files · ~38,501 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 1, .css 1)

## Summary
- 718 nodes · 1188 edges · 50 communities (31 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0d9e5546`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- i18n/index.ts
- api/src/index.ts
- Web Build & Dependencies
- Database, Config & Scoring
- Article Reading Page
- Root Workspace Config
- Shared TypeScript Types
- API Package Config
- Request Detail Page
- Admin & Dev Tools
- WritePage.vue
- Create Request & Luna Utils
- SplashPage.vue
- Staking Page
- Base TypeScript Config
- Shared Package Config
- seed.ts
- Profile Page & i18n
- Web TypeScript Config
- API TypeScript Config
- Demo & Wallet Adapter
- Shared TypeScript Config
- RequestsPage.vue
- Auth & Signature Flow
- Read Validation & Pool
- AuthorPage.vue
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
- HomePage.vue
- router.ts
- services
- verifyPaymentUntilSettled
- NotificationsPage.vue
- usePaymentIntent.ts

## God Nodes (most connected - your core abstractions)
1. `vue` - 25 edges
2. `useAuthStore` - 20 edges
3. `getMongoDb()` - 19 edges
4. `api` - 19 edges
5. `t()` - 19 edges
6. `hono` - 18 edges
7. `vue-router` - 16 edges
8. `uuid` - 15 edges
9. `requireAuth()` - 15 edges
10. `getAuth()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Web App Entry HTML` --references--> `NimInk Favicon`  [EXTRACTED]
  apps/web/index.html → apps/web/public/favicon.svg
- `Web App Entry HTML` --references--> `D9: Tailwind CSS for Styling`  [EXTRACTED]
  apps/web/index.html → DECISIONS.md
- `Threat: Content Injection (XSS)` --semantically_similar_to--> `D10: markdown-it + DOMPurify`  [INFERRED] [semantically similar]
  SECURITY.md → DECISIONS.md
- `renderedBody` --calls--> `renderMarkdown()`  [EXTRACTED]
  apps/web/src/pages/ArticlePage.vue → apps/web/src/composables/useMarkdown.ts
- `renderedPreview` --calls--> `renderMarkdown()`  [EXTRACTED]
  apps/web/src/pages/WritePage.vue → apps/web/src/composables/useMarkdown.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authentication and Signature Verification Flow** — decisions_jwt_sessions, decisions_ed25519_signature_verification, plan_auth_flow, security_signature_forgery [EXTRACTED 0.95]
- **Read Validation Anti-Sybil System** — decisions_read_validation_server_driven, plan_read_validation_scoring, plan_weekly_pool, security_fake_reads_sybil, plan_phase_4_read_validation_pool [EXTRACTED 0.95]
- **Wallet Adapter Abstraction Pattern** — plan_wallet_adapter_interface, plan_demo_wallet_adapter, plan_nimiq_pay_wallet_adapter, security_demo_real_mode_confusion, decisions_demo_ledger_server_side [EXTRACTED 0.95]

## Communities (50 total, 19 thin omitted)

### Community 0 - "i18n/index.ts"
Cohesion: 0.14
Nodes (11): active, route, router, tabs, auth, emit, props, i18n (+3 more)

### Community 1 - "api/src/index.ts"
Cohesion: 0.08
Nodes (42): connectMongo(), getMongoDb(), getUploadsBucket(), app, __dirname, distPath, mongoRetry, AuthPayload (+34 more)

### Community 2 - "Web Build & Dependencies"
Cohesion: 0.06
Nodes (40): dependencies, dompurify@^3.2.0, markdown-it@^14.1.0, @nimink/shared@*, @nimiq/mini-app-sdk@^0.2.5, pinia@^2.2.0, vue@^3.5.0, vue-router@^4.4.0 (+32 more)

### Community 3 - "Database, Config & Scoring"
Cohesion: 0.11
Nodes (26): APP_NAME, APP_TAGLINE, DEFAULT_POOL_SIZE_LUNA, DEMO_FAUCET_AMOUNT_LUNA, DEMO_FAUCET_DAILY_LIMIT, DEMO_INITIAL_BALANCE_LUNA, LUNA_PER_NIM, MIN_STAKE_LUNA (+18 more)

### Community 4 - "Article Reading Page"
Cohesion: 0.07
Nodes (27): article, auth, bookmarked, countArticleRead(), countedReadKeys, error, initials, isOwnArticle (+19 more)

### Community 5 - "Root Workspace Config"
Cohesion: 0.07
Nodes (27): allowScripts, esbuild@0.25.12, esbuild@0.28.2, vue-demi@0.14.10, description, devDependencies, vitest@^5.1.0, engines (+19 more)

### Community 6 - "Shared TypeScript Types"
Cohesion: 0.07
Nodes (18): ApiError, Article, ArticleRequest, DemoStake, DemoTransaction, EarningsSummary, PaymentVerifier, Payout (+10 more)

### Community 7 - "API Package Config"
Cohesion: 0.06
Nodes (42): dependencies, hono@^4.6.0, @hono/node-server@^1.13.0, jsonwebtoken@^9.0.2, mongodb@^6.21.0, @nimink/shared@*, @nimiq/core@^2.7.0, uuid@^10.0.0 (+34 more)

### Community 8 - "Request Detail Page"
Cohesion: 0.09
Nodes (16): auth, isRequester, loadError, loading, payLoading, reputation, request, route (+8 more)

### Community 9 - "Admin & Dev Tools"
Cohesion: 0.09
Nodes (13): ImportMeta, ImportMetaEnv, *.vue, Window, emit, props, flags, loading (+5 more)

### Community 10 - "WritePage.vue"
Cohesion: 0.07
Nodes (32): renderMarkdown(), renderedBody, accessType, auth, body, bodyEditor, draftStatus, editId (+24 more)

### Community 11 - "Create Request & Luna Utils"
Cohesion: 0.18
Nodes (8): budgetNim, deadline, description, minDate, router, saving, toast, topic

### Community 12 - "SplashPage.vue"
Cohesion: 0.06
Nodes (47): auth, route, router, showNav, unreadCount, wallet, api, getAuthToken() (+39 more)

### Community 13 - "Staking Page"
Cohesion: 0.10
Nodes (20): activeStakes, amountLuna, auth, canStake, confirmStake(), isFirstStake, loadError, loading (+12 more)

### Community 14 - "Base TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, module, moduleResolution (+5 more)

### Community 15 - "Shared Package Config"
Cohesion: 0.15
Nodes (13): devDependencies, typescript@^5.6.0, exports, typescript, main, name, private, scripts (+5 more)

### Community 16 - "seed.ts"
Cohesion: 0.08
Nodes (18): dotenv@^16.4.0, accounts, articleIds, articles, client, db, __dirname, now (+10 more)

### Community 17 - "Profile Page & i18n"
Cohesion: 0.12
Nodes (13): getLocale(), setLocale(), articles, auth, initials, loading, router, savingSubscription (+5 more)

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
Cohesion: 0.25
Nodes (7): compilerOptions, composite, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 22 - "RequestsPage.vue"
Cohesion: 0.11
Nodes (16): activeTab, auth, communityError, communityLoading, communityRequests, fetchCommunityRequests(), fetchMyRequests(), myError (+8 more)

### Community 23 - "Auth & Signature Flow"
Cohesion: 0.50
Nodes (3): Auth Flow: Nonce-Sign-Verify-Session, Switching from Demo to Real Mode, Threat: Signature Forgery (Auth Bypass)

### Community 24 - "Read Validation & Pool"
Cohesion: 0.60
Nodes (4): Phase 4: Read Validation and Weekly Pool, Read Validation Scoring, Weekly Pool Distribution, Threat: Fake Reads (Sybil Attack)

### Community 25 - "AuthorPage.vue"
Cohesion: 0.13
Nodes (13): auth, initials, isWrittenByMe, preview, props, timeAgo, articles, authorName (+5 more)

### Community 44 - "HomePage.vue"
Cohesion: 0.15
Nodes (12): activeTab, articles, auth, fetchArticles(), fetchArticlesOnFocus(), filteredArticles, initials, loading (+4 more)

### Community 45 - "router.ts"
Cohesion: 0.21
Nodes (6): props, router, app, router, routes, vue-router

### Community 46 - "services"
Cohesion: 0.15
Nodes (12): generateValue, key, sync, value, services, buildCommand, envVars, healthCheckPath (+4 more)

### Community 47 - "verifyPaymentUntilSettled"
Cohesion: 0.33
Nodes (8): createPaymentIntent(), delay(), VerifiablePayment, verifyPaymentUntilSettled(), clearLegacyPending(), confirmPremiumPurchase(), confirmTip(), payWinner()

### Community 48 - "NotificationsPage.vue"
Cohesion: 0.33
Nodes (6): amount(), error, loading, message(), Notification, notifications

## Knowledge Gaps
- **22 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `DemoWalletAdapter`, `NimiqPayWalletAdapter` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 432 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `Admin & Dev Tools` to `i18n/index.ts`, `Web Build & Dependencies`, `Article Reading Page`, `Request Detail Page`, `WritePage.vue`, `Create Request & Luna Utils`, `SplashPage.vue`, `router.ts`, `HomePage.vue`, `Staking Page`, `NotificationsPage.vue`, `Profile Page & i18n`, `RequestsPage.vue`, `AuthorPage.vue`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `i18n/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Root Workspace Config` to `Database, Config & Scoring`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `api/src/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07789473684210527 - nodes in this community are weakly interconnected._
- **Why does `vue-router` connect `router.ts` to `i18n/index.ts`, `Web Build & Dependencies`, `Article Reading Page`, `Request Detail Page`, `WritePage.vue`, `Create Request & Luna Utils`, `SplashPage.vue`, `HomePage.vue`, `Profile Page & i18n`, `RequestsPage.vue`, `AuthorPage.vue`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `Web Build & Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0627177700348432 - nodes in this community are weakly interconnected._