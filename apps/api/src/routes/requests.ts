import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { UNPAID_AWARD_WARNING_DAYS } from '@nimink/shared'
import { getMongoDb } from '../db/mongo.js'
import { verifyNimiqPayment } from '../services/nimiq.js'
import { findPaymentIntent, markIntentPaid } from '../services/payment-intents.js'
import { requireAuth, getAuth } from '../middleware/auth.js'

export const requestRoutes = new Hono()

requestRoutes.get('/', async (c) => {
  const status = c.req.query('status')
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const filter = status ? { status } : {}
  const rows = await mongo.collection<any>('requests').find(filter).sort({ createdAt: -1 }).limit(limit).toArray()
  const users = await mongo.collection<any>('users').find({ id: { $in: rows.map((r) => r.requesterId) } }).toArray()
  const usersById = new Map(users.map((user) => [user.id, user]))
  return c.json({ requests: rows.map((row) => mapMongoRequest(row, usersById.get(row.requesterId))) })
})

requestRoutes.get('/mine', requireAuth, async (c) => {
  const auth = getAuth(c)
  const limit = Math.max(1, Math.min(Number.parseInt(c.req.query('limit') || '', 10) || 50, 100))

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const rows = await mongo.collection<any>('requests')
    .find({ requesterId: auth.userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
  const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
  return c.json({ requests: rows.map((row) => mapMongoRequest(row, user)) })
})

requestRoutes.get('/discover', requireAuth, async (c) => {
  const auth = getAuth(c)
  const limit = Math.max(1, Math.min(Number.parseInt(c.req.query('limit') || '', 10) || 50, 100))

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const rows = await mongo.collection<any>('requests')
    .find({ requesterId: { $ne: auth.userId }, status: 'open' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
  const users = await mongo.collection<any>('users')
    .find({ id: { $in: rows.map((row) => row.requesterId) } })
    .toArray()
  const usersById = new Map(users.map((user) => [user.id, user]))
  return c.json({ requests: rows.map((row) => mapMongoRequest(row, usersById.get(row.requesterId))) })
})

requestRoutes.get('/:id', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const id = c.req.param('id')
  const row = await mongo.collection<any>('requests').findOne({ id })
  if (!row) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
  const user = await mongo.collection<any>('users').findOne({ id: row.requesterId })
  const subs = await mongo.collection<any>('submissions').find({ requestId: id }).sort({ createdAt: -1 }).toArray()
  const authorIds = subs.map((s) => s.authorId)
  const articleIds = subs.map((s) => s.articleId)
  const [authors, articles] = await Promise.all([
    mongo.collection<any>('users').find({ id: { $in: authorIds } }).toArray(),
    mongo.collection<any>('articles').find({ id: { $in: articleIds } }).toArray(),
  ])
  const authorsById = new Map(authors.map((u) => [u.id, u]))
  const articlesById = new Map(articles.map((a) => [a.id, a]))
  const submissions = subs.map((s) => ({
    id: s.id,
    articleId: s.articleId,
    articleTitle: articlesById.get(s.articleId)?.title || 'Article unavailable',
    authorId: s.authorId,
    authorName: authorsById.get(s.authorId)?.displayName || s.authorId,
    createdAt: new Date(s.createdAt).toISOString(),
  }))
  return c.json({ request: mapMongoRequest(row, user), submissions })
})

requestRoutes.post('/', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { topic, description, budgetLuna, deadline } = await c.req.json()

  if (!topic?.trim() || !budgetLuna || !deadline) {
    return c.json({ error: 'Missing required fields', code: 'INVALID_INPUT' }, 400)
  }

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
  if (!user) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
  const row = {
    id: uuid(), requesterId: auth.userId, topic: topic.trim(), description: description?.trim() || '',
    budgetLuna: Number(budgetLuna), deadline: new Date(deadline), status: 'open', winnerId: null,
    txHash: null, createdAt: new Date(), awardedAt: null,
  }
  await mongo.collection('requests').insertOne(row)
  return c.json({ request: mapMongoRequest(row, user) }, 201)
})

requestRoutes.post('/:id/submit', requireAuth, async (c) => {
  const auth = getAuth(c)
  const requestId = c.req.param('id')
  const { articleId } = await c.req.json()

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const requests = mongo.collection<any>('requests')
  const request = await requests.findOne({ id: requestId, status: 'open' })
  if (!request) return c.json({ error: 'Request not found or closed', code: 'NOT_FOUND' }, 404)
  if (request.requesterId === auth.userId) return c.json({ error: 'Cannot submit to your own request', code: 'SELF_SUBMIT' }, 400)
  const article = await mongo.collection<any>('articles').findOne({ id: articleId, authorId: auth.userId, status: 'published' })
  if (!article) return c.json({ error: 'Article not found or not yours', code: 'INVALID_ARTICLE' }, 404)
  const id = uuid()
  try {
    await mongo.collection('submissions').insertOne({ id, requestId, articleId, authorId: auth.userId, createdAt: new Date() })
  } catch (error: any) {
    if (error?.code === 11000) return c.json({ error: 'Already submitted', code: 'DUPLICATE' }, 409)
    throw error
  }
  await requests.updateOne({ id: requestId, status: 'open' }, { $set: { status: 'in_review' } })
  return c.json({ submissionId: id }, 201)
})

requestRoutes.post('/:id/award', requireAuth, async (c) => {
  const auth = getAuth(c)
  const requestId = c.req.param('id')
  const { submissionId } = await c.req.json()

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const row = await mongo.collection<any>('requests').findOne({
    id: requestId, requesterId: auth.userId, status: { $in: ['open', 'in_review'] },
  })
  if (!row) return c.json({ error: 'Request not found or not yours', code: 'NOT_FOUND' }, 404)
  const submission = await mongo.collection<any>('submissions').findOne({ id: submissionId, requestId })
  if (!submission) return c.json({ error: 'Submission not found', code: 'NOT_FOUND' }, 404)
  const awardedAt = new Date()
  await mongo.collection('requests').updateOne({ id: requestId, requesterId: auth.userId }, {
    $set: { status: 'awarded', winnerId: submission.authorId, awardedAt },
  })
  return c.json({ ok: true })
})

requestRoutes.post('/:id/pay', requireAuth, async (c) => {
  const auth = getAuth(c)
  const requestId = c.req.param('id')
  const { txHash, intentId } = await c.req.json()

  if (!txHash) return c.json({ error: 'Missing txHash', code: 'INVALID_INPUT' }, 400)

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const requests = mongo.collection<any>('requests')
  const request = await requests.findOne({ id: requestId, requesterId: auth.userId, status: { $in: ['awarded', 'paid'] } })
  if (!request) return c.json({ error: 'Request not found or not awarded', code: 'NOT_FOUND' }, 404)
  if (request.status === 'paid') {
    return request.txHash === txHash
      ? c.json({ ok: true })
      : c.json({ error: 'Request has already been paid', code: 'ALREADY_PAID' }, 409)
  }
  if (await mongo.collection('txReceipts').findOne({ txHash })) {
    return c.json({ error: 'Transaction already used', code: 'DUPLICATE_TX' }, 409)
  }
  const winner = await mongo.collection<any>('users').findOne({ id: request.winnerId })
  if (!winner) return c.json({ error: 'Winner account not found', code: 'NOT_FOUND' }, 404)
  let verified = false
  if (auth.address.startsWith('NQ00 DEMO ')) {
    const demoTx = await mongo.collection<any>('demoTransactions').findOne({ txHash, status: 'confirmed' })
    verified = !!demoTx && demoTx.fromAddress === auth.address && demoTx.toAddress === winner.address && demoTx.valueLuna === request.budgetLuna
  } else {
    const intent = await findPaymentIntent(mongo, { intentId, userId: auth.userId, purpose: 'request', resourceId: String(requestId) })
    const verification = await verifyNimiqPayment(txHash, auth.address, winner.address, request.budgetLuna, intent?.reference)
    if (verification.status === 'pending') return c.json({ status: 'pending', reason: verification.reason }, 202)
    if (verification.status === 'unavailable') {
      return c.json({ error: 'Nimiq is temporarily unable to confirm this payment', code: 'PAYMENT_PROVIDER_UNAVAILABLE' }, 503)
    }
    if (verification.status !== 'confirmed') {
      return c.json({ error: 'Payment failed verification', code: 'VERIFICATION_FAILED', reason: verification.reason }, 400)
    }
    if (intent) await markIntentPaid(mongo, intent.id, txHash)
    verified = true
  }
  if (!verified) return c.json({ error: 'Payment could not be verified on Nimiq', code: 'VERIFICATION_FAILED' }, 400)
  const result = await requests.updateOne({ id: requestId, requesterId: auth.userId, status: 'awarded', txHash: null }, {
    $set: { status: 'paid', txHash, paidAt: new Date() },
  })
  if (!result.modifiedCount) return c.json({ error: 'Request has already been paid', code: 'ALREADY_PAID' }, 409)
  await mongo.collection('txReceipts').insertOne({ txHash, purpose: 'request', resourceId: requestId, createdAt: new Date() })
  return c.json({ ok: true })
})

requestRoutes.get('/:id/reputation', async (c) => {
  const requesterId = c.req.query('requesterId')
  if (!requesterId) return c.json({ error: 'Missing requesterId', code: 'INVALID_INPUT' }, 400)

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const rows = await mongo.collection<any>('requests').find({
    requesterId, status: { $in: ['awarded', 'paid'] },
  }).project({ status: 1 }).toArray()
  const paid = rows.filter((row) => row.status === 'paid').length
  return c.json({ totalAwarded: rows.length, totalPaid: paid, paidOnTimeRatio: rows.length ? paid / rows.length : 1 })
})

function mapMongoRequest(row: any, user: any) {
  const awardedAt = row.awardedAt ? new Date(row.awardedAt) : null
  const daysSinceAward = awardedAt ? (Date.now() - awardedAt.getTime()) / 86_400_000 : 0
  return {
    id: row.id,
    requesterId: row.requesterId,
    requesterName: user?.displayName || row.requesterId,
    requesterAddress: user?.address || '',
    topic: row.topic,
    description: row.description,
    budgetLuna: row.budgetLuna,
    deadline: new Date(row.deadline).toISOString(),
    status: row.status,
    winnerId: row.winnerId,
    txHash: row.txHash,
    createdAt: new Date(row.createdAt).toISOString(),
    unpaidWarning: row.status === 'awarded' && !!awardedAt && daysSinceAward >= UNPAID_AWARD_WARNING_DAYS,
  }
}
