import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { BufferUtils, Hash, PublicKey, Signature } from '@nimiq/core'
import { db } from '../index.js'
import { getMongoDb } from '../db/mongo.js'
import { createToken, getAuth, requireAuth } from '../middleware/auth.js'

export const authRoutes = new Hono()

authRoutes.get('/me', requireAuth, async (c) => {
  const auth = getAuth(c)
  const mongo = getMongoDb()
  if (mongo) {
    const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
    if (user) return c.json({ user: { id: user.id, address: user.address, displayName: user.displayName, bio: user.bio || '' } })
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.userId) as any
  if (!user) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
  return c.json({ user: { id: user.id, address: user.address, displayName: user.display_name, bio: user.bio } })
})

authRoutes.post('/nonce', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Shared MongoDB is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const nonce = uuid()
  const issuedAt = new Date().toISOString()
  const domain = process.env.APP_ORIGIN
    ? new URL(process.env.APP_ORIGIN).host
    : new URL(c.req.header('origin') || c.req.url).host
  const message = `Sign in to NimInk\nDomain: ${domain}\nNonce: ${nonce}\nIssued At: ${issuedAt}`
  await mongo.collection('authChallenges').insertOne({ nonce, message, expiresAt: new Date(Date.now() + 5 * 60_000) })
  return c.json({ nonce, message })
})

authRoutes.post('/verify', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Shared MongoDB is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const { nonce, publicKey, signature, displayName } = await c.req.json()
  if (typeof nonce !== 'string' || typeof publicKey !== 'string' || typeof signature !== 'string') {
    return c.json({ error: 'Missing login proof', code: 'INVALID_INPUT' }, 400)
  }

  const challenge = await mongo.collection('authChallenges').findOne({ nonce, expiresAt: { $gt: new Date() } })
  if (!challenge) return c.json({ error: 'Login challenge expired or already used', code: 'INVALID_NONCE' }, 400)

  let address: string
  try {
    const key = PublicKey.fromHex(publicKey)
    const sig = Signature.fromHex(signature)
    const prefixedMessage = `\x16Nimiq Signed Message:\n${challenge.message.length}${challenge.message}`
    const digest = Hash.computeSha256(BufferUtils.fromUtf8(prefixedMessage))
    if (!key.verify(sig, digest)) return c.json({ error: 'Wallet signature is invalid', code: 'INVALID_SIGNATURE' }, 401)
    address = key.toAddress().toUserFriendlyAddress()
  } catch {
    return c.json({ error: 'Wallet signature is invalid', code: 'INVALID_SIGNATURE' }, 401)
  }

  const consumed = await mongo.collection('authChallenges').findOneAndDelete({ _id: challenge._id, expiresAt: { $gt: new Date() } })
  if (!consumed) return c.json({ error: 'Login challenge already used', code: 'INVALID_NONCE' }, 400)

  const users = mongo.collection<any>('users')
  const safeName = typeof displayName === 'string' ? displayName.trim().slice(0, 40) : ''
  const userId = uuid()
  await users.updateOne(
    { address },
    { $setOnInsert: { id: userId, address, displayName: safeName || address.slice(0, 12), bio: '', createdAt: new Date() } },
    { upsert: true },
  )
  const user = await users.findOne({ address })
  if (!user) return c.json({ error: 'Could not create account', code: 'AUTH_FAILED' }, 500)

  // Keep the existing transaction and reading tables compatible while shared content moves to MongoDB.
  db.prepare('INSERT OR IGNORE INTO users (id, address, display_name, bio) VALUES (?, ?, ?, ?)')
    .run(user.id, user.address, user.displayName, user.bio || '')

  const token = createToken({ userId: user.id, address: user.address })
  return c.json({
    token,
    user: { id: user.id, address: user.address, displayName: user.displayName, bio: user.bio || '' },
  })
})

// Isolated local demo login. Never accepted by the real wallet verification endpoint.
authRoutes.post('/demo', async (c) => {
  if (process.env.NODE_ENV === 'production' || process.env.VITE_WALLET_MODE === 'nimiq') {
    return c.json({ error: 'Demo login is disabled', code: 'DEMO_DISABLED' }, 404)
  }

  const { address, displayName } = await c.req.json()
  if (typeof address !== 'string' || !address.startsWith('NQ00 DEMO ')) {
    return c.json({ error: 'Invalid demo account', code: 'INVALID_INPUT' }, 400)
  }

  let user = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as any
  if (!user) {
    const id = uuid()
    db.prepare('INSERT INTO users (id, address, display_name) VALUES (?, ?, ?)')
      .run(id, address, typeof displayName === 'string' ? displayName.slice(0, 40) : 'Demo user')
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  }

  const mongo = getMongoDb()
  if (mongo) {
    await mongo.collection('users').updateOne(
      { address: user.address },
      { $setOnInsert: { id: user.id, address: user.address, displayName: user.display_name, bio: '', createdAt: new Date() } },
      { upsert: true },
    )
  }

  const token = createToken({ userId: user.id, address: user.address })
  return c.json({
    token,
    user: { id: user.id, address: user.address, displayName: user.display_name, bio: user.bio },
  })
})
