import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { BufferUtils, Hash, PublicKey, Signature } from '@nimiq/core'
import { getMongoDb } from '../db/mongo.js'
import { createToken, getAuth, requireAuth } from '../middleware/auth.js'

export const authRoutes = new Hono()

authRoutes.get('/me', requireAuth, async (c) => {
  const auth = getAuth(c)
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)
  const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
  if (!user) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
  return c.json({ user: { id: user.id, address: user.address, displayName: user.displayName, bio: user.bio || '' } })
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

  const challenge = await mongo.collection<any>('authChallenges').findOneAndDelete({ nonce, expiresAt: { $gt: new Date() } })
  if (!challenge) return c.json({ error: 'Login challenge expired or already used', code: 'INVALID_NONCE' }, 400)

  let address: string
  try {
    const key = PublicKey.fromHex(publicKey)
    const sig = Signature.fromHex(signature)
    const prefixedMessage = `\x16Nimiq Signed Message:\n${challenge.message.length}${challenge.message}`
    const rawBytes = BufferUtils.fromUtf8(challenge.message)
    const prefixedBytes = BufferUtils.fromUtf8(prefixedMessage)
    const candidates = [
      { format: 'nimiq-prefixed-sha256', bytes: Hash.computeSha256(prefixedBytes) },
      { format: 'sha256', bytes: Hash.computeSha256(rawBytes) },
      { format: 'raw', bytes: rawBytes },
      { format: 'nimiq-prefixed', bytes: prefixedBytes },
    ]
    const verifiedFormat = candidates.find(({ bytes }) => {
      try { return key.verify(sig, bytes) } catch { return false }
    })?.format
    if (!verifiedFormat) return c.json({ error: 'Wallet signature is invalid', code: 'INVALID_SIGNATURE' }, 401)
    console.info(`[auth] Nimiq sign-in signature verified (${verifiedFormat})`)
    address = key.toAddress().toUserFriendlyAddress()
  } catch {
    return c.json({ error: 'Wallet signature is invalid', code: 'INVALID_SIGNATURE' }, 401)
  }

  const users = mongo.collection<any>('users')
  const safeName = typeof displayName === 'string' ? displayName.trim().slice(0, 40) : ''
  const userId = uuid()
  await users.updateOne(
    { address },
    { $setOnInsert: { id: userId, address, displayName: safeName || address.slice(0, 12), bio: '', createdAt: new Date(), validReadCount: 0, tipsSentCount: 0, subscriptionPriceLuna: 0 } },
    { upsert: true },
  )
  const user = await users.findOne({ address })
  if (!user) return c.json({ error: 'Could not create account', code: 'AUTH_FAILED' }, 500)

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

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const users = mongo.collection<any>('users')
  const id = uuid()
  await users.updateOne(
    { address },
    { $setOnInsert: {
      id, address,
      displayName: typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 40) : 'Demo user',
      bio: '', createdAt: new Date(), validReadCount: 0, tipsSentCount: 0, subscriptionPriceLuna: 0,
    } },
    { upsert: true },
  )
  const user = await users.findOne({ address })
  if (!user) return c.json({ error: 'Could not create account', code: 'AUTH_FAILED' }, 500)

  const token = createToken({ userId: user.id, address: user.address })
  return c.json({
    token,
    user: { id: user.id, address: user.address, displayName: user.displayName, bio: user.bio || '' },
  })
})
