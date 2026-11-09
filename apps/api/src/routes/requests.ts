import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { UNPAID_AWARD_WARNING_DAYS } from '@nimink/shared'
import { db } from '../index.js'
import { getMongoDb } from '../db/mongo.js'
import { verifyNimiqPayment } from '../services/nimiq.js'
import { requireAuth, getAuth } from '../middleware/auth.js'

export const requestRoutes = new Hono()

requestRoutes.get('/', async (c) => {
  const status = c.req.query('status')
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)

  const mongo = getMongoDb()
  if (mongo) {
    const filter = status ? { status } : {}
    const rows = await mongo.collection<any>('requests').find(filter).sort({ createdAt: -1 }).limit(limit).toArray()
    const users = await mongo.collection<any>('users').find({ id: { $in: rows.map((r) => r.requesterId) } }).toArray()
    const usersById = new Map(users.map((user) => [user.id, user]))
    return c.json({ requests: rows.map((row) => mapMongoRequest(row, usersById.get(row.requesterId))) })
  }

  let query = `SELECT r.*, u.display_name as requester_name, u.address as requester_address
    FROM requests r JOIN users u ON r.requester_id = u.id`

  const params: any[] = []
  if (status) {
    query += ' WHERE r.status = ?'
    params.push(status)
  }
  query += ' ORDER BY r.created_at DESC LIMIT ?'
  params.push(limit)

  const rows = db.prepare(query).all(...params) as any[]
  const requests = rows.map(mapRequestRow)
  return c.json({ requests })
})

requestRoutes.get('/mine', requireAuth, async (c) => {
  const auth = getAuth(c)
  const limit = Math.max(1, Math.min(Number.parseInt(c.req.query('limit') || '', 10) || 50, 100))

  const mongo = getMongoDb()
  if (mongo) {
    const rows = await mongo.collection<any>('requests')
      .find({ requesterId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
    return c.json({ requests: rows.map((row) => mapMongoRequest(row, user)) })
  }

  const rows = db.prepare(
    `SELECT r.*, u.display_name as requester_name, u.address as requester_address
     FROM requests r JOIN users u ON r.requester_id = u.id
     WHERE r.requester_id = ?
     ORDER BY r.created_at DESC LIMIT ?`
  ).all(auth.userId, limit) as any[]

  return c.json({ requests: rows.map(mapRequestRow) })
})

requestRoutes.get('/discover', requireAuth, async (c) => {
  const auth = getAuth(c)
  const limit = Math.max(1, Math.min(Number.parseInt(c.req.query('limit') || '', 10) || 50, 100))

  const mongo = getMongoDb()
  if (mongo) {
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
  }

  const rows = db.prepare(
    `SELECT r.*, u.display_name as requester_name, u.address as requester_address
     FROM requests r JOIN users u ON r.requester_id = u.id
     WHERE r.requester_id != ? AND r.status = 'open'
     ORDER BY r.created_at DESC LIMIT ?`
  ).all(auth.userId, limit) as any[]

  return c.json({ requests: rows.map(mapRequestRow) })
})

requestRoutes.get('/:id', async (c) => {
  const mongo = getMongoDb()
  if (mongo) {
    const id = c.req.param('id')
    const row = await mongo.collection<any>('requests').findOne({ id })
    if (!row) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
    const user = await mongo.collection<any>('users').findOne({ id: row.requesterId })
    mirrorRequestToSql(row, user)
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
  }
  const row = db.prepare(
    `SELECT r.*, u.display_name as requester_name, u.address as requester_address
     FROM requests r JOIN users u ON r.requester_id = u.id WHERE r.id = ?`
  ).get(c.req.param('id')) as any

  if (!row) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  const submissions = db.prepare(
    `SELECT s.*, a.title as article_title, u.display_name as author_name
     FROM submissions s
     JOIN articles a ON s.article_id = a.id
     JOIN users u ON s.author_id = u.id
     WHERE s.request_id = ?
     ORDER BY s.created_at DESC`
  ).all(c.req.param('id')) as any[]

  return c.json({
    request: mapRequestRow(row),
    submissions: submissions.map((s) => ({
      id: s.id,
      articleId: s.article_id,
      articleTitle: s.article_title,
      authorId: s.author_id,
      authorName: s.author_name,
      createdAt: s.created_at,
    })),
  })
})

requestRoutes.post('/', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { topic, description, budgetLuna, deadline } = await c.req.json()

  if (!topic?.trim() || !budgetLuna || !deadline) {
    return c.json({ error: 'Missing required fields', code: 'INVALID_INPUT' }, 400)
  }

  const mongo = getMongoDb()
  if (mongo) {
    const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
    if (!user) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
    const row = {
      id: uuid(), requesterId: auth.userId, topic: topic.trim(), description: description?.trim() || '',
      budgetLuna: Number(budgetLuna), deadline: new Date(deadline), status: 'open', winnerId: null,
      txHash: null, createdAt: new Date(), awardedAt: null,
    }
    await mongo.collection('requests').insertOne(row)
    mirrorRequestToSql(row, user)
    return c.json({ request: mapMongoRequest(row, user) }, 201)
  }

  const id = uuid()
  db.prepare(
    `INSERT INTO requests (id, requester_id, topic, description, budget_luna, deadline)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, auth.userId, topic.trim(), description?.trim() || '', budgetLuna, deadline)

  const row = db.prepare(
    `SELECT r.*, u.display_name as requester_name, u.address as requester_address
     FROM requests r JOIN users u ON r.requester_id = u.id WHERE r.id = ?`
  ).get(id) as any

  return c.json({ request: mapRequestRow(row) }, 201)
})

requestRoutes.post('/:id/submit', requireAuth, async (c) => {
  const auth = getAuth(c)
  const requestId = c.req.param('id')
  const { articleId } = await c.req.json()

  const mongo = getMongoDb()
  if (mongo) {
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
    db.prepare("UPDATE requests SET status = 'in_review' WHERE id = ? AND status = 'open'").run(requestId)
    return c.json({ submissionId: id }, 201)
  }

  const request = db.prepare("SELECT * FROM requests WHERE id = ? AND status = 'open'").get(requestId) as any
  if (!request) return c.json({ error: 'Request not found or closed', code: 'NOT_FOUND' }, 404)

  if (request.requester_id === auth.userId) {
    return c.json({ error: 'Cannot submit to your own request', code: 'SELF_SUBMIT' }, 400)
  }

  const article = db.prepare(
    "SELECT * FROM articles WHERE id = ? AND author_id = ? AND status = 'published'"
  ).get(articleId, auth.userId) as any
  if (!article) return c.json({ error: 'Article not found or not yours', code: 'INVALID_ARTICLE' }, 404)

  const id = uuid()
  try {
    db.prepare(
      'INSERT INTO submissions (id, request_id, article_id, author_id) VALUES (?, ?, ?, ?)'
    ).run(id, requestId, articleId, auth.userId)
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return c.json({ error: 'Already submitted', code: 'DUPLICATE' }, 409)
    }
    throw e
  }

  db.prepare("UPDATE requests SET status = 'in_review' WHERE id = ? AND status = 'open'").run(requestId)

  return c.json({ submissionId: id }, 201)
})

requestRoutes.post('/:id/award', requireAuth, async (c) => {
  const auth = getAuth(c)
  const requestId = c.req.param('id')
  const { submissionId } = await c.req.json()

  const mongo = getMongoDb()
  if (mongo) {
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
    db.prepare("UPDATE requests SET status = 'awarded', winner_id = ?, awarded_at = ? WHERE id = ?")
      .run(submission.authorId, awardedAt.toISOString(), requestId)
    return c.json({ ok: true })
  }

  const request = db.prepare(
    "SELECT * FROM requests WHERE id = ? AND requester_id = ? AND status IN ('open', 'in_review')"
  ).get(requestId, auth.userId) as any
  if (!request) return c.json({ error: 'Request not found or not yours', code: 'NOT_FOUND' }, 404)

  const submission = db.prepare(
    'SELECT * FROM submissions WHERE id = ? AND request_id = ?'
  ).get(submissionId, requestId) as any
  if (!submission) return c.json({ error: 'Submission not found', code: 'NOT_FOUND' }, 404)

  db.prepare(
    "UPDATE requests SET status = 'awarded', winner_id = ?, awarded_at = datetime('now') WHERE id = ?"
  ).run(submission.author_id, requestId)

  return c.json({ ok: true })
})

requestRoutes.post('/:id/pay', requireAuth, async (c) => {
  const auth = getAuth(c)
  const requestId = c.req.param('id')
  const { txHash } = await c.req.json()

  if (!txHash) return c.json({ error: 'Missing txHash', code: 'INVALID_INPUT' }, 400)

  const mongo = getMongoDb()
  if (mongo) {
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
      const demoTx = db.prepare("SELECT * FROM demo_transactions WHERE tx_hash = ? AND status = 'confirmed'").get(txHash) as any
      verified = !!demoTx && demoTx.from_address === auth.address && demoTx.to_address === winner.address && demoTx.value_luna === request.budgetLuna
    } else {
      const verification = await verifyNimiqPayment(txHash, auth.address, winner.address, request.budgetLuna)
      if (verification.status === 'pending') return c.json({ status: 'pending', reason: verification.reason }, 202)
      if (verification.status === 'unavailable') {
        return c.json({ error: 'Nimiq is temporarily unable to confirm this payment', code: 'PAYMENT_PROVIDER_UNAVAILABLE' }, 503)
      }
      if (verification.status !== 'confirmed') {
        return c.json({ error: 'Payment failed verification', code: 'VERIFICATION_FAILED', reason: verification.reason }, 400)
      }
      verified = true
    }
    if (!verified) return c.json({ error: 'Payment could not be verified on Nimiq', code: 'VERIFICATION_FAILED' }, 400)
    const result = await requests.updateOne({ id: requestId, requesterId: auth.userId, status: 'awarded', txHash: null }, {
      $set: { status: 'paid', txHash, paidAt: new Date() },
    })
    if (!result.modifiedCount) return c.json({ error: 'Request has already been paid', code: 'ALREADY_PAID' }, 409)
    await mongo.collection('txReceipts').insertOne({ txHash, purpose: 'request', resourceId: requestId, createdAt: new Date() })
    db.prepare("UPDATE requests SET status = 'paid', tx_hash = ? WHERE id = ?").run(txHash, requestId)
    return c.json({ ok: true })
  }

  const request = db.prepare(
    "SELECT * FROM requests WHERE id = ? AND requester_id = ? AND status IN ('awarded', 'paid')"
  ).get(requestId, auth.userId) as any
  if (!request) return c.json({ error: 'Request not found or not awarded', code: 'NOT_FOUND' }, 404)
  if (request.status === 'paid') {
    return request.tx_hash === txHash
      ? c.json({ ok: true })
      : c.json({ error: 'Request has already been paid', code: 'ALREADY_PAID' }, 409)
  }

  const existingTx = db.prepare('SELECT id FROM requests WHERE tx_hash = ?').get(txHash) as any
  if (existingTx) return c.json({ error: 'Transaction already used', code: 'DUPLICATE_TX' }, 409)

  // Verify demo transaction
  const winner = db.prepare('SELECT * FROM users WHERE id = ?').get(request.winner_id) as any
  const demoTx = db.prepare(
    "SELECT * FROM demo_transactions WHERE tx_hash = ? AND status = 'confirmed'"
  ).get(txHash) as any

  let paymentVerified = false
  if (demoTx) {
    if (demoTx.to_address !== winner.address || demoTx.value_luna !== request.budget_luna) {
      return c.json({ error: 'Payment verification failed', code: 'VERIFICATION_FAILED' }, 400)
    }
    if (demoTx.from_address !== auth.address) return c.json({ error: 'Payment sender mismatch', code: 'VERIFICATION_FAILED' }, 400)
    paymentVerified = true
  } else if (!auth.address.startsWith('NQ00 DEMO ')) {
    const verification = await verifyNimiqPayment(txHash, auth.address, winner.address, request.budget_luna)
    if (verification.status === 'pending') return c.json({ status: 'pending', reason: verification.reason }, 202)
    if (verification.status === 'unavailable') {
      return c.json({ error: 'Nimiq is temporarily unable to confirm this payment', code: 'PAYMENT_PROVIDER_UNAVAILABLE' }, 503)
    }
    if (verification.status !== 'confirmed') {
      return c.json({ error: 'Payment failed verification', code: 'VERIFICATION_FAILED', reason: verification.reason }, 400)
    }
    paymentVerified = true
  }
  if (!paymentVerified) return c.json({ error: 'Payment could not be verified on Nimiq', code: 'VERIFICATION_FAILED' }, 400)

  db.prepare("UPDATE requests SET status = 'paid', tx_hash = ? WHERE id = ?").run(txHash, requestId)
  return c.json({ ok: true })
})

requestRoutes.get('/:id/reputation', (c) => {
  const requesterId = c.req.query('requesterId')
  if (!requesterId) return c.json({ error: 'Missing requesterId', code: 'INVALID_INPUT' }, 400)

  const mongo = getMongoDb()
  if (mongo) {
    return (async () => {
      const rows = await mongo.collection<any>('requests').find({
        requesterId, status: { $in: ['awarded', 'paid'] },
      }).project({ status: 1 }).toArray()
      const paid = rows.filter((row) => row.status === 'paid').length
      return c.json({ totalAwarded: rows.length, totalPaid: paid, paidOnTimeRatio: rows.length ? paid / rows.length : 1 })
    })()
  }

  const total = db.prepare(
    "SELECT COUNT(*) as count FROM requests WHERE requester_id = ? AND status IN ('awarded', 'paid')"
  ).get(requesterId) as any
  const paid = db.prepare(
    "SELECT COUNT(*) as count FROM requests WHERE requester_id = ? AND status = 'paid'"
  ).get(requesterId) as any

  return c.json({
    totalAwarded: total.count,
    totalPaid: paid.count,
    paidOnTimeRatio: total.count > 0 ? paid.count / total.count : 1,
  })
})

function mapRequestRow(row: any) {
  const isUnpaid = row.status === 'awarded' && row.awarded_at
  let unpaidWarning = false
  if (isUnpaid) {
    const awardedDate = new Date(row.awarded_at)
    const daysSinceAward = (Date.now() - awardedDate.getTime()) / (1000 * 60 * 60 * 24)
    unpaidWarning = daysSinceAward >= UNPAID_AWARD_WARNING_DAYS
  }

  return {
    id: row.id,
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    requesterAddress: row.requester_address,
    topic: row.topic,
    description: row.description,
    budgetLuna: row.budget_luna,
    deadline: row.deadline,
    status: row.status,
    winnerId: row.winner_id,
    txHash: row.tx_hash,
    createdAt: row.created_at,
    unpaidWarning,
  }
}

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

function mirrorRequestToSql(row: any, user: any) {
  if (!user) return
  db.prepare('INSERT OR IGNORE INTO users (id, address, display_name, bio) VALUES (?, ?, ?, ?)')
    .run(user.id, user.address, user.displayName || '', user.bio || '')
  db.prepare(`INSERT OR IGNORE INTO requests
    (id, requester_id, topic, description, budget_luna, deadline, status, winner_id, tx_hash, awarded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(row.id, row.requesterId, row.topic, row.description, row.budgetLuna, new Date(row.deadline).toISOString(),
      row.status, row.winnerId, row.txHash, row.awardedAt ? new Date(row.awardedAt).toISOString() : null)
  db.prepare(`UPDATE requests SET topic = ?, description = ?, budget_luna = ?, deadline = ?, status = ?,
    winner_id = ?, tx_hash = ?, awarded_at = ? WHERE id = ?`)
    .run(row.topic, row.description, row.budgetLuna, new Date(row.deadline).toISOString(), row.status,
      row.winnerId, row.txHash, row.awardedAt ? new Date(row.awardedAt).toISOString() : null, row.id)
}
