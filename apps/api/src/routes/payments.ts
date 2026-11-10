import { Hono } from 'hono'
import { getMongoDb } from '../db/mongo.js'
import { getAuth, requireAuth } from '../middleware/auth.js'
import { createPaymentIntent, currentNetwork, type PaymentPurpose } from '../services/payment-intents.js'

export const paymentRoutes = new Hono()

const PURPOSES: PaymentPurpose[] = ['tip', 'article', 'subscription', 'request']

/**
 * Creates (or reuses) the payment reference the wallet must attach to the
 * transaction. The client sends it as the transaction's `data` field, and
 * the server later matches on it instead of on the sender address.
 */
paymentRoutes.post('/intents', requireAuth, async (c) => {
  const auth = getAuth(c)
  const body = await c.req.json().catch(() => null) as {
    purpose?: unknown; resourceId?: unknown; amountLuna?: unknown
  } | null

  const purpose = PURPOSES.find((value) => value === body?.purpose)
  const resourceId = typeof body?.resourceId === 'string' ? body.resourceId.trim() : ''
  const amountLuna = Number(body?.amountLuna)
  if (!purpose || !resourceId || !Number.isSafeInteger(amountLuna) || amountLuna <= 0) {
    return c.json({ error: 'Missing or invalid payment details', code: 'INVALID_INPUT' }, 400)
  }

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  // Resolve who is actually being paid server-side, so a client can't
  // redirect a payment by passing its own recipient.
  let recipient: string
  if (purpose === 'request') {
    const request = await mongo.collection<any>('requests').findOne({ id: resourceId, requesterId: auth.userId })
    if (!request) return c.json({ error: 'Request not found', code: 'NOT_FOUND' }, 404)
    const winner = await mongo.collection<any>('users').findOne({ id: request.winnerId })
    if (!winner) return c.json({ error: 'Winner account not found', code: 'NOT_FOUND' }, 404)
    recipient = winner.address
  } else {
    const article = await mongo.collection<any>('articles').findOne({ id: resourceId, status: 'published' })
    if (!article) return c.json({ error: 'Article not found', code: 'NOT_FOUND' }, 404)
    const author = await mongo.collection<any>('users').findOne({ id: article.authorId })
    if (!author) return c.json({ error: 'Author not found', code: 'NOT_FOUND' }, 404)
    recipient = author.address
  }

  const intent = await createPaymentIntent(mongo, {
    userId: auth.userId,
    purpose,
    resourceId,
    recipient,
    amountLuna,
  })

  return c.json({
    intentId: intent.id,
    reference: intent.reference,
    recipient: intent.recipient,
    amountLuna: intent.amountLuna,
    network: currentNetwork(),
    expiresAt: intent.expiresAt,
  })
})
