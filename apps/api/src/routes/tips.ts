import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { requireAuth, getAuth } from '../middleware/auth.js'
import { getMongoDb } from '../db/mongo.js'
import { verifyNimiqPayment } from '../services/nimiq.js'
import { createPaymentNotification } from '../services/notifications.js'
import { findPaymentIntent, markIntentPaid } from '../services/payment-intents.js'

export const tipRoutes = new Hono()

tipRoutes.post('/', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { articleId, amountLuna, note, txHash, intentId } = await c.req.json()

  if (!articleId || !amountLuna || !txHash) {
    return c.json({ error: 'Missing required fields', code: 'INVALID_INPUT' }, 400)
  }

  if (amountLuna <= 0) {
    return c.json({ error: 'Amount must be positive', code: 'INVALID_AMOUNT' }, 400)
  }

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const article = await mongo.collection<any>('articles').findOne({ id: articleId, status: 'published' })
  if (!article) return c.json({ error: 'Article not found', code: 'NOT_FOUND' }, 404)
  if (article.authorId === auth.userId) return c.json({ error: 'Cannot tip your own article', code: 'SELF_TIP' }, 400)
  if (await mongo.collection('txReceipts').findOne({ txHash })) {
    const savedTip = await mongo.collection<any>('tips').findOne({ txHash, articleId, senderId: auth.userId, status: 'confirmed' })
    if (savedTip) return c.json({ tipId: savedTip.id, status: 'confirmed' })
    return c.json({ error: 'Transaction already used', code: 'DUPLICATE_TX' }, 409)
  }
  const author = await mongo.collection<any>('users').findOne({ id: article.authorId })
  if (!author) return c.json({ error: 'Author not found', code: 'NOT_FOUND' }, 404)

  if (auth.address.startsWith('NQ00 DEMO ')) {
    const demoTx = await mongo.collection<any>('demoTransactions').findOne({ txHash, status: 'confirmed' })
    const verified = !!demoTx && demoTx.fromAddress === auth.address && demoTx.toAddress === author.address && demoTx.valueLuna === amountLuna
    if (!verified) return c.json({ error: 'Payment could not be verified on Nimiq', code: 'VERIFICATION_FAILED' }, 400)
  } else {
    const intent = await findPaymentIntent(mongo, { intentId, userId: auth.userId, purpose: 'tip', resourceId: articleId })
    const verification = await verifyNimiqPayment(txHash, auth.address, author.address, amountLuna, intent?.reference)
    if (verification.status === 'pending') return c.json({ status: 'pending', reason: verification.reason }, 202)
    if (verification.status === 'unavailable') {
      return c.json({ error: 'Nimiq is temporarily unable to confirm this payment', code: 'PAYMENT_PROVIDER_UNAVAILABLE' }, 503)
    }
    if (verification.status !== 'confirmed') {
      return c.json({ error: 'Payment failed verification', code: 'VERIFICATION_FAILED', reason: verification.reason }, 400)
    }
    if (intent) await markIntentPaid(mongo, intent.id, txHash)
  }

  const tipId = uuid()
  const createdAt = new Date()
  try {
    await mongo.collection('txReceipts').insertOne({ txHash, purpose: 'tip', resourceId: articleId, createdAt })
    await mongo.collection('tips').insertOne({
      id: tipId, articleId, senderId: auth.userId, recipientId: article.authorId,
      amountLuna, note: typeof note === 'string' ? note.slice(0, 100) : '', txHash,
      status: 'confirmed', createdAt,
    })
  } catch (error: any) {
    if (error?.code === 11000) return c.json({ error: 'Transaction already used', code: 'DUPLICATE_TX' }, 409)
    throw error
  }
  await mongo.collection('articles').updateOne({ id: articleId }, { $inc: { totalTipsLuna: amountLuna } })
  await mongo.collection('users').updateOne({ id: auth.userId }, { $inc: { tipsSentCount: 1 } })
  await createPaymentNotification({ userId: article.authorId, actorId: auth.userId, type: 'tip', articleId, amountLuna, txHash, createdAt })

  return c.json({ tipId, status: 'confirmed' }, 201)
})

tipRoutes.get('/article/:articleId', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const rows = await mongo.collection<any>('tips').find({ articleId: c.req.param('articleId'), status: 'confirmed' })
    .sort({ createdAt: -1 }).limit(50).toArray()
  const users = await mongo.collection<any>('users').find({ id: { $in: rows.map((r) => r.senderId) } }).toArray()
  const usersById = new Map(users.map((user) => [user.id, user]))
  return c.json({ tips: rows.map((row) => ({
    id: row.id, senderId: row.senderId, senderName: usersById.get(row.senderId)?.displayName || row.senderId,
    amountLuna: row.amountLuna, note: row.note, createdAt: new Date(row.createdAt).toISOString(),
  })) })
})
