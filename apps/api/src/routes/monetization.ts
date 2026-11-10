import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { getMongoDb } from '../db/mongo.js'
import { getAuth, requireAuth } from '../middleware/auth.js'
import { verifyNimiqPayment } from '../services/nimiq.js'
import { createPaymentNotification } from '../services/notifications.js'
import { findPaymentIntent, markIntentPaid } from '../services/payment-intents.js'

const SUBSCRIPTION_DAYS = 30
const MIN_PRICE_LUNA = 1_000 // 0.01 NIM
const MAX_PRICE_LUNA = 100_000_000 // 1,000 NIM

export const monetizationRoutes = new Hono()

monetizationRoutes.get('/settings', requireAuth, async (c) => {
  const auth = getAuth(c)
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)
  const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
  if (!user) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
  return c.json({ subscriptionPriceLuna: user.subscriptionPriceLuna || 0 })
})

monetizationRoutes.put('/settings', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { subscriptionPriceLuna } = await c.req.json()
  const price = Number(subscriptionPriceLuna)
  if (!Number.isSafeInteger(price) || (price !== 0 && (price < MIN_PRICE_LUNA || price > MAX_PRICE_LUNA))) {
    return c.json({ error: 'Set a subscription price from 0.01 to 1,000 NIM, or enter 0 to disable it', code: 'INVALID_PRICE' }, 400)
  }

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)
  const result = await mongo.collection('users').updateOne({ id: auth.userId }, { $set: { subscriptionPriceLuna: price } })
  if (!result.matchedCount) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
  return c.json({ subscriptionPriceLuna: price })
})

monetizationRoutes.post('/articles/:articleId/unlock', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { txHash, intentId } = await c.req.json()
  if (typeof txHash !== 'string' || !txHash) return c.json({ error: 'Missing transaction hash', code: 'INVALID_INPUT' }, 400)
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'MongoDB is required for premium article access', code: 'DATABASE_UNAVAILABLE' }, 503)

  const article = await mongo.collection<any>('articles').findOne({ id: c.req.param('articleId'), status: 'published' })
  if (!article || !['subscription', 'one_time'].includes(article.accessType)) {
    return c.json({ error: 'This article is not premium', code: 'NOT_PREMIUM' }, 400)
  }
  if (article.authorId === auth.userId) return c.json({ accessGranted: true })

  const author = await mongo.collection<any>('users').findOne({ id: article.authorId })
  if (!author) return c.json({ error: 'Author not found', code: 'NOT_FOUND' }, 404)
  const purpose = article.accessType === 'subscription' ? 'subscription' : 'article'
  const amountLuna = purpose === 'subscription' ? Number(author.subscriptionPriceLuna || 0) : Number(article.priceLuna || 0)
  if (!Number.isSafeInteger(amountLuna) || amountLuna < MIN_PRICE_LUNA) {
    return c.json({ error: 'The author has not configured a valid price', code: 'PRICE_UNAVAILABLE' }, 409)
  }

  const now = new Date()
  const existingAccess = purpose === 'subscription'
    ? await mongo.collection<any>('accessPayments').findOne({ buyerId: auth.userId, authorId: article.authorId, purpose, expiresAt: { $gt: now } })
    : await mongo.collection<any>('accessPayments').findOne({ buyerId: auth.userId, articleId: article.id, purpose })
  if (existingAccess) return c.json({ accessGranted: true, expiresAt: existingAccess.expiresAt || null })

  const priorReceipt = await mongo.collection<any>('txReceipts').findOne({ txHash })
  if (priorReceipt) {
    const priorPayment = await mongo.collection<any>('accessPayments').findOne({ txHash, buyerId: auth.userId })
    if (priorPayment) return c.json({ accessGranted: true, expiresAt: priorPayment.expiresAt || null })
    return c.json({ error: 'Transaction already used', code: 'DUPLICATE_TX' }, 409)
  }

  const intent = await findPaymentIntent(mongo, {
    intentId, userId: auth.userId, purpose, resourceId: article.id,
  })
  const verification = await verifyNimiqPayment(txHash, auth.address, author.address, amountLuna, intent?.reference)
  if (verification.status === 'pending') {
    return c.json({ status: 'pending', reason: verification.reason }, 202)
  }
  if (verification.status === 'unavailable') {
    return c.json({ error: 'Nimiq is temporarily unable to confirm this payment', code: 'PAYMENT_PROVIDER_UNAVAILABLE' }, 503)
  }
  if (verification.status !== 'confirmed') {
    return c.json({ error: 'Payment failed verification', code: 'VERIFICATION_FAILED', reason: verification.reason }, 400)
  }
  if (intent) await markIntentPaid(mongo, intent.id, txHash)

  let expiresAt: Date | null = null
  if (purpose === 'subscription') {
    const current = await mongo.collection<any>('accessPayments').findOne({
      buyerId: auth.userId, authorId: article.authorId, purpose, expiresAt: { $gt: now },
    }, { sort: { expiresAt: -1 } })
    expiresAt = new Date(Math.max(now.getTime(), current?.expiresAt ? new Date(current.expiresAt).getTime() : 0) + SUBSCRIPTION_DAYS * 86_400_000)
  }

  const payment = {
    id: uuid(), txHash, buyerId: auth.userId, authorId: article.authorId,
    articleId: purpose === 'article' ? article.id : null,
    purpose, amountLuna, expiresAt, status: 'confirmed', createdAt: now,
  }
  try {
    await mongo.collection('txReceipts').insertOne({ txHash, purpose: purpose === 'article' ? 'article_purchase' : 'author_subscription', resourceId: purpose === 'article' ? article.id : article.authorId, createdAt: now })
    await mongo.collection('accessPayments').insertOne(payment)
  } catch (error: any) {
    if (error?.code === 11000) {
      const saved = await mongo.collection<any>('accessPayments').findOne({ txHash, buyerId: auth.userId })
      if (saved) return c.json({ accessGranted: true, expiresAt: saved.expiresAt || null })
      return c.json({ error: 'Transaction already used', code: 'DUPLICATE_TX' }, 409)
    }
    throw error
  }

  await createPaymentNotification({
    userId: article.authorId, actorId: auth.userId,
    type: purpose === 'subscription' ? 'subscription' : 'article_purchase',
    articleId: purpose === 'article' ? article.id : null, amountLuna, txHash, createdAt: now,
  })

  return c.json({ accessGranted: true, expiresAt: expiresAt?.toISOString() || null }, 201)
})
