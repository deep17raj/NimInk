import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { v4 as uuid } from 'uuid'
import { DEMO_INITIAL_BALANCE_LUNA, DEFAULT_POOL_SIZE_LUNA, estimateReadTimeMinutes } from '@nimink/shared'
import { initializeDatabase } from './schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'nimink.db')
const db = initializeDatabase(dbPath)

console.log('Seeding NimInk database...')

// Demo accounts
const accounts = [
  { address: 'NQ00 DEMO ALICE 0000 0000 0000 0000', name: 'Alice', id: uuid() },
  { address: 'NQ00 DEMO BOBB0 0000 0000 0000 0000', name: 'Bob', id: uuid() },
  { address: 'NQ00 DEMO CAROL 0000 0000 0000 0000', name: 'Carol', id: uuid() },
]

for (const a of accounts) {
  db.prepare(
    'INSERT OR REPLACE INTO demo_accounts (address, display_name, balance_luna) VALUES (?, ?, ?)'
  ).run(a.address, a.name, DEMO_INITIAL_BALANCE_LUNA)
  db.prepare(
    'INSERT OR REPLACE INTO users (id, address, display_name) VALUES (?, ?, ?)'
  ).run(a.id, a.address, a.name)
}

// Validators (mock)
const validators = [
  { id: uuid(), name: 'NimPool Alpha', address: 'NQ00 VALID ATOR1 0000 0000 0000 0000', fee: 0.05, payout: 'restake', trust: 0.95 },
  { id: uuid(), name: 'StakeNIM Pro', address: 'NQ00 VALID ATOR2 0000 0000 0000 0000', fee: 0.03, payout: 'direct', trust: 0.90 },
  { id: uuid(), name: 'Community Stakers', address: 'NQ00 VALID ATOR3 0000 0000 0000 0000', fee: 0.08, payout: 'restake', trust: 0.85 },
]

for (const v of validators) {
  db.prepare(
    'INSERT OR REPLACE INTO validators (id, name, address, fee, payout_type, trust_score) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(v.id, v.name, v.address, v.fee, v.payout, v.trust)
}

// Articles
const articles = [
  {
    title: 'Getting Started with Nimiq Mini Apps',
    body: `Nimiq Mini Apps are web applications that run inside Nimiq Pay's WebView, giving developers direct access to wallet functionality like payments, signing, and staking.

## Why Build a Mini App?

Mini Apps tap into Nimiq Pay's built-in user base. When a user opens your app, they already have a wallet ready to go. No signup flows, no seed phrases to manage, no extension installations.

The developer experience is surprisingly smooth. You write a standard web app using any framework you prefer — Vue, React, Svelte, plain HTML — and connect to the Nimiq provider with a few lines of code.

## Your First Connection

Install the SDK and initialize the provider:

\`\`\`
import { init } from '@nimiq/mini-app-sdk'
const nimiq = await init()
const accounts = await nimiq.listAccounts()
\`\`\`

That is it. The user sees a confirmation dialog, approves, and you have their address.

## What Can You Build?

The possibilities range from simple tipping apps to full marketplaces. Any web app that benefits from integrated payments is a good candidate. Think about what becomes possible when every user already has a funded wallet with one-tap payments.

The Nimiq Mini Apps Competition is a great way to start building. The community is active, documentation is thorough, and the SDK handles the hard parts of wallet interaction.`,
    tags: ['nimiq', 'mini-apps', 'tutorial'],
    quiz: { question: 'What does the init() function from the SDK return?', options: ['A wallet address', 'A Nimiq provider instance', 'A private key'], correctIndex: 1 },
  },
  {
    title: 'Understanding NIM Payments in Mini Apps',
    body: `Payments are at the heart of every Mini App. Nimiq Pay handles the actual transaction signing and broadcasting, while your app prepares the payment details and verifies the result.

## The Payment Flow

Your app calls sendBasicTransaction or sendBasicTransactionWithData on the provider. Nimiq Pay shows the user a native confirmation dialog with the amount, recipient, and fee. If approved, the wallet signs and broadcasts the transaction, then returns a transaction hash.

Important: a transaction hash is not proof that the payment succeeded. The transaction could still fail during execution or never reach sufficient confirmations. Always verify on your backend.

## Using the Data Field

The data field in sendBasicTransactionWithData lets you attach up to 64 bytes of UTF-8 data to a payment. This data is public on the blockchain, so never put personal information there. Use opaque identifiers like UUIDs that only your backend can resolve.

## Verification

On your backend, query a Nimiq RPC node with getTransactionByHash to check the transaction's execution result and confirmation count. Verify that the recipient, amount, and data match what you expected. Reject any transaction hash that has already been claimed.

## Amounts and Units

NIM amounts in the SDK are always in Luna. One NIM equals 100,000 Luna. Store all amounts as integers to avoid floating-point errors.

Always show clear confirmation to the user before and after a payment. Users trust apps that are transparent about what is happening with their money.`,
    tags: ['nimiq', 'payments', 'development'],
    quiz: { question: 'How many Luna equal one NIM?', options: ['1,000', '100,000', '1,000,000'], correctIndex: 1 },
  },
  {
    title: 'Staking NIM Through Mini Apps',
    body: `Staking is one of the most powerful features available to Mini App developers. With a few SDK calls, you can let users stake their NIM directly from your app, choosing validators and managing their stake without leaving the experience.

## How Nimiq Staking Works

Nimiq uses a Proof-of-Stake consensus mechanism. Validators produce blocks and earn rewards. NIM holders can delegate their stake to a validator to share in those rewards.

The first time a user stakes, they need to create a new staker entry using sendNewStakerTransaction. This associates their wallet with a chosen validator. Subsequent stakes to the same validator use sendStakeTransaction, which is simpler.

## Key Concepts

Minimum first stake is 100 NIM. After the initial stake, there is no minimum for additional stakes.

Rewards are variable. They depend on the total amount staked network-wide and the validator's performance. No app should promise fixed returns.

Unstaking requires multiple steps: deactivate the stake, wait one full epoch, retire the stake, then remove it. Each step is a separate transaction. This process exists to maintain network security.

## Building a Good Staking UX

Show users a list of validators with their fees and performance metrics. Let them choose how much to stake with clear minimum requirements. Most importantly, be honest about the process: rewards vary, funds are locked, and exiting takes time and steps.

A good staking experience builds trust and keeps users coming back to your Mini App.`,
    tags: ['nimiq', 'staking', 'guide'],
    quiz: { question: 'What is the minimum NIM for a first stake?', options: ['10 NIM', '50 NIM', '100 NIM'], correctIndex: 2 },
  },
  {
    title: 'Content Moderation in Decentralized Platforms',
    body: `Building a content platform on blockchain infrastructure raises interesting moderation challenges. The core tension: decentralized values favor openness, but communities need protection from abuse.

## Moderation Is Not Censorship

A platform that lets anyone write and earn has a responsibility to prevent abuse. Hate speech, scams, impersonation, and plagiarism harm real people and degrade the community. Moderation protects the community's ability to participate safely.

## Practical Approaches

Start with clear content guidelines that users accept when they join. Make reporting easy — every piece of content should have a report button with specific reasons (illegal, hateful, scam, plagiarism). Quick reporting with specific categories helps prioritize.

Use a combination of automated signals and human review. Automated checks can catch duplicates and known patterns. Human reviewers handle nuance. Neither alone is sufficient.

## Transparency Matters

When content is hidden, explain why (in general terms — do not help bad actors learn to evade). Provide an appeal process. Log moderation decisions with reason codes for accountability.

## The Role of Reputation

In a payment-based platform, natural reputation signals emerge. Users who tip and get tipped are invested in the community. New accounts with no financial activity deserve more scrutiny. Weight signals by participation, not just account age.

Building moderation well from the start is much easier than retrofitting it. Your first users will set the culture.`,
    tags: ['community', 'moderation', 'platforms'],
    quiz: { question: 'Why is moderation important in decentralized platforms?', options: ['To control what users can say', 'To protect the community from abuse', 'To increase platform revenue'], correctIndex: 1 },
  },
  {
    title: 'Designing Mobile-First Web Apps for Wallets',
    body: `When your web app runs inside a wallet's WebView, mobile-first design is not optional — it is the entire experience. The viewport is a phone screen, touch is the only input, and every pixel matters.

## Layout Fundamentals

Design for 360 to 430 pixels wide. Use a fixed top app bar and a bottom tab bar for navigation. The bottom bar should have large touch targets (at least 44 pixels) and clear icons. Use 100dvh for full height to account for the dynamic viewport on mobile browsers.

Add safe-area insets for devices with notches or rounded corners. Set 16-pixel side gutters to keep content from touching screen edges.

## Performance Counts

Mobile WebViews are less powerful than desktop browsers. Minimize JavaScript bundle size. Use skeleton loaders instead of blank screens while data loads. Lazy-load images. Avoid layout shifts.

## Touch-First Interactions

Replace hover states with active states. Use bottom sheets for modal actions — they are easier to reach with thumbs than centered dialogs. Swipe gestures should supplement, never replace, visible buttons.

## Visual Clarity

Use a clean, calm visual style. System fonts load instantly and feel native. Ensure high contrast ratios for text. Respect prefers-reduced-motion for users who are sensitive to animations.

## Dark and Light Themes

Many wallet users prefer dark mode. Support both themes using CSS custom properties. Detect the preference with prefers-color-scheme and let users override it.

A mobile-first web app in a wallet WebView should feel as natural as a native screen. Every interaction should be fast, clear, and reachable by thumb.`,
    tags: ['design', 'mobile', 'ux'],
    quiz: { question: 'What is the recommended minimum touch target size?', options: ['24 pixels', '32 pixels', '44 pixels'], correctIndex: 2 },
  },
  {
    title: 'Keeping Article Popularity Rankings Useful',
    body: `Read counts help readers discover stories that are getting attention, but a raw page-view counter is easy to manipulate. A bot can load pages in milliseconds, generating fake reads at scale. Even time-on-page can be faked by leaving a tab open.

## Why Cheap Signals Fail

A simple page-view counter is trivially gamed. A bot can load pages in milliseconds, generating fake reads at scale. Even time-on-page can be faked by leaving a tab open. Any single signal from the client can be spoofed.

## Layered Verification

Layering multiple weak signals gives reasonable confidence that a read count reflects genuine engagement. No single check is conclusive, but together they make manipulation harder.

Identity layer: require a signed wallet session and device identifier. One counted read per wallet and device per article limits basic duplicate activity.

Behavior layer: track scroll progress with server-issued session tokens. Require reading at least 40 percent of the expected time based on word count. Check that scroll checkpoints arrive in order and at plausible intervals.

Comprehension layer: a short quiz about the article content. Authors write the questions, the server grades them. A read only counts if the quiz is passed. This is the strongest signal — it proves engagement.

## Caps and Monitoring

Set daily limits per wallet, device, IP, and article. Flag suspicious clusters (many wallets sharing a device or IP). Review flags manually — false positives happen, so do not auto-ban.

No system is perfect. The goal is keeping popularity rankings informative while protecting them from obvious manipulation.`,
    tags: ['security', 'fraud', 'articles'],
    quiz: { question: 'Why should multiple verification signals be layered?', options: ['One signal is too expensive to compute', 'Any single signal from the client can be spoofed', 'Users prefer more verification steps'], correctIndex: 1 },
  },
]

for (const a of articles) {
  const authorIdx = Math.floor(Math.random() * accounts.length)
  const author = accounts[authorIdx]
  const wordCount = a.body.split(/\s+/).length
  const id = uuid()

  db.prepare(
    `INSERT INTO articles (id, author_id, title, body, tags, word_count, read_time_minutes, quiz_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`
  ).run(id, author.id, a.title, a.body, JSON.stringify(a.tags), wordCount,
    estimateReadTimeMinutes(wordCount), JSON.stringify(a.quiz))
}

// Requests
const request1Id = uuid()
const request2Id = uuid()
db.prepare(
  `INSERT INTO requests (id, requester_id, topic, description, budget_luna, deadline, status)
   VALUES (?, ?, ?, ?, ?, ?, 'open')`
).run(request1Id, accounts[1].id, 'Best practices for Mini App security',
  'Looking for a comprehensive guide on securing Mini Apps, including payment verification, input validation, and data privacy.',
  500 * 100000, new Date(Date.now() + 14 * 86400000).toISOString())

db.prepare(
  `INSERT INTO requests (id, requester_id, topic, description, budget_luna, deadline, status)
   VALUES (?, ?, ?, ?, ?, ?, 'open')`
).run(request2Id, accounts[2].id, 'How to integrate EVM tokens in Mini Apps',
  'Need a practical tutorial showing how to send and receive ERC-20 tokens (like USDT) within a Nimiq Mini App.',
  300 * 100000, new Date(Date.now() + 21 * 86400000).toISOString())

// Weekly pool
const now = new Date()
const weekStart = new Date(now)
weekStart.setDate(now.getDate() - now.getDay())
weekStart.setHours(0, 0, 0, 0)
const weekEnd = new Date(weekStart)
weekEnd.setDate(weekStart.getDate() + 7)

db.prepare(
  `INSERT INTO pools (id, week_start, week_end, total_luna, sponsor)
   VALUES (?, ?, ?, ?, ?)`
).run(uuid(), weekStart.toISOString(), weekEnd.toISOString(), DEFAULT_POOL_SIZE_LUNA, 'Demo Labs')

// Sample tips
const articleRows = db.prepare("SELECT id, author_id FROM articles WHERE status = 'published' LIMIT 3").all() as any[]
for (const art of articleRows) {
  const tipper = accounts.find(a => a.id !== art.author_id)!
  const tipAmount = [100000, 500000, 1000000][Math.floor(Math.random() * 3)]
  const txHash = `demo_seed_${uuid()}`

  db.prepare(
    `INSERT INTO demo_transactions (id, from_address, to_address, value_luna, data, tx_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
  ).run(uuid(), tipper.address, accounts.find(a => a.id === art.author_id)!.address, tipAmount, null, txHash)

  db.prepare(
    `INSERT INTO tips (id, article_id, sender_id, recipient_id, amount_luna, note, tx_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`
  ).run(uuid(), art.id, tipper.id, art.author_id, tipAmount, 'Great article!', txHash)

  db.prepare('UPDATE articles SET total_tips_luna = total_tips_luna + ? WHERE id = ?').run(tipAmount, art.id)
  db.prepare('UPDATE users SET tips_sent_count = tips_sent_count + 1 WHERE id = ?').run(tipper.id)
}

console.log('Seed complete!')
console.log(`  ${accounts.length} demo accounts`)
console.log(`  ${validators.length} validators`)
console.log(`  ${articles.length} articles`)
console.log('  2 open requests')
console.log('  1 weekly pool')
console.log(`  ${articleRows.length} sample tips`)

process.exit(0)
