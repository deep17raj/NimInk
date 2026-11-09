# NimInk Security Model

## Threat: Fake reads (Sybil attack on read-reward pool)

**Attack**: An attacker creates multiple wallets and devices to generate fake verified reads, siphoning rewards from the weekly pool.

**Mitigations**:
1. **Identity binding**: Each read requires a signed wallet session and device ID. One verified read per wallet+device per article.
2. **Timing validation**: Server checks that reading time exceeds 40% of expected time (based on word count at 230 WPM). Checkpoints must arrive in order.
3. **Comprehension quiz**: Author-written quiz graded server-side. A read only counts if the quiz is passed.
4. **Reputation weighting**: New wallets contribute 0.25 weight until they have 3 valid reads or 1 tip.
5. **Rate limits**: Per-wallet, per-device, per-IP, and per-article daily caps.
6. **Cluster detection**: Admin flags wallets sharing a device hash or IP hash.

**Residual risk**: A determined attacker with many real devices could still game the system at low scale. The caps and quiz requirement make this economically unattractive relative to the small weekly pool.

## Threat: Payment replay

**Attack**: An attacker submits the same transaction hash to claim a tip, request payment, or staking credit multiple times.

**Mitigations**:
1. **Unique constraint**: The `tx_hash` column has a UNIQUE constraint in the tips, requests, and demo_transactions tables.
2. **Server-side verification**: Every payment is verified against the demo ledger (or Nimiq RPC in real mode), checking recipient, amount, and data ID match.
3. **Opaque data IDs**: Only UUIDs are placed in the on-chain data field, preventing data field reuse across contexts.

## Threat: Signature forgery (authentication bypass)

**Attack**: An attacker forges a wallet signature to impersonate another user.

**Mitigations**:
1. **Nonce-based challenge**: The server generates a random nonce for each login attempt. Nonces are single-use.
2. **Signature verification**: In real mode, the server verifies the Ed25519 signature against the claimed public key. `TODO(verify)`: Exact verification method needs confirmation against Nimiq core docs.
3. **Demo mode**: Demo mode trusts the client signature (since there are no real keys). This is clearly marked and acceptable for a demo environment.

## Threat: Content injection (XSS)

**Attack**: An attacker injects malicious HTML or JavaScript through article content.

**Mitigations**:
1. **Markdown-it with HTML disabled**: The `html` option is set to `false`, preventing raw HTML in markdown.
2. **DOMPurify**: All rendered markdown is sanitized through DOMPurify before insertion into the DOM.
3. **Input validation**: Article titles, tags, and other text fields are validated and length-limited on the server.

## Threat: On-chain data leakage

**Attack**: Personal information is accidentally written to the public blockchain.

**Mitigations**:
1. **Opaque IDs only**: The `data` field in transactions contains only UUIDs (tip IDs, request IDs). No names, emails, or free text.
2. **Server-side resolution**: The meaning of each ID is stored server-side and never exposed on-chain.

## Threat: Demo-to-real mode confusion

**Attack**: Users mistake demo NIM for real NIM, or the demo environment masks real security issues.

**Mitigations**:
1. **Persistent banner**: "Demo mode — no real money" banner is always visible.
2. **NIM (demo) labels**: Every money display includes the "(demo)" suffix.
3. **Distinct tx hashes**: Demo transaction hashes are prefixed with `demo_`.
4. **Wallet adapter abstraction**: Demo and real mode share the same verification pipeline, so security logic is tested in both modes.

## Environment security

- **No secrets in repo**: All sensitive values (JWT secret, RPC credentials) are in `.env`, with `.env.example` provided.
- **Server-side only**: RPC endpoints and JWT secret are never exposed to the client bundle.
- **Rate limiting**: Write endpoints are rate-limited (TODO: implement middleware).
- **CORS**: Configurable origin restriction via `CORS_ORIGIN` env variable.
