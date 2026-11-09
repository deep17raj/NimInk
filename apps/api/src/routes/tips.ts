import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { db } from '../index.js'
import { requireAuth, getAuth } from '../middleware/auth.js'
import { getMongoDb } from '../db/mongo.js'
import { verifyNimiqPayment } from '../services/nimiq.js'
import { createPaymentNotification } from '../services/notifications.js'

export const tipRoutes = new Hono()

tipRoutes.post('/', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { articleId, amountLuna, note, txHash } = await c.req.json()

  if (!articleId || !amountLuna || !txHash) {
    return c.json({ error: 'Missing required fields', code: 'INVALID_INPUT' }, 400)
  }

  if (amountLuna <= 0) {
    return c.json({ error: 'Amount must be positive', code: 'INVALID_AMOUNT' }, 400)
  }

  const mongo = getMongoDb()
  if (mongo) {
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
    let verified = false
    if (auth.address.startsWith('NQ00 DEMO ')) {
      const demoTx = db.prepare("SELECT * FROM demo_transactions WHERE tx_hash = ? AND status = 'confirmed'").get(txHash) as any
      verified = !!demoTx && demoTx.from_address === auth.address && demoTx.to_address === author.address && demoTx.value_luna === amountLuna
    } else {
      verified = await verifyNimiqPayment(txHash, auth.address, author.address, amountLuna)
    }
    if (!verified) return c.json({ error: 'Payment could not be verified on Nimiq', code: 'VERIFICATION_FAILED' }, 400)

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

    db.prepare(`INSERT OR IGNORE INTO tips (id, article_id, sender_id, recipient_id, amount_luna, note, tx_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`).run(tipId, articleId, auth.userId, article.authorId, amountLuna,
      typeof note === 'string' ? note.slice(0, 100) : '', txHash)
    db.prepare('UPDATE articles SET total_tips_luna = total_tips_luna + ? WHERE id = ?').run(amountLuna, articleId)
    db.prepare('UPDATE users SET tips_sent_count = tips_sent_count + 1 WHERE id = ?').run(auth.userId)
    return c.json({ tipId, status: 'confirmed' }, 201)
  }

  const article = db.prepare(
    "SELECT * FROM articles WHERE id = ? AND status = 'published'"
  ).get(articleId) as any
  if (!article) return c.json({ error: 'Article not found', code: 'NOT_FOUND' }, 404)

  if (article.author_id === auth.userId) {
    return c.json({ error: 'Cannot tip your own article', code: 'SELF_TIP' }, 400)
  }

  const existingTx = db.prepare('SELECT id, article_id, sender_id, status FROM tips WHERE tx_hash = ?').get(txHash) as any
  if (existingTx?.article_id === articleId && existingTx?.sender_id === auth.userId && existingTx?.status === 'confirmed') {
    return c.json({ tipId: existingTx.id, status: 'confirmed' })
  }
  if (existingTx) {
    return c.json({ error: 'Transaction already used', code: 'DUPLICATE_TX' }, 409)
  }

  const tipId = uuid()

  // Verify the transaction in demo mode (check demo ledger)
  const demoTx = db.prepare(
    "SELECT * FROM demo_transactions WHERE tx_hash = ? AND status = 'confirmed'"
  ).get(txHash) as any

  const author = db.prepare('SELECT * FROM users WHERE id = ?').get(article.author_id) as any
  let status = 'pending'

  if (demoTx) {
    if (demoTx.from_address !== auth.address) return c.json({ error: 'Payment sender mismatch', code: 'VERIFICATION_FAILED' }, 400)
    if (demoTx.to_address !== author.address) {
      return c.json({ error: 'Payment recipient mismatch', code: 'VERIFICATION_FAILED' }, 400)
    }
    if (demoTx.value_luna !== amountLuna) {
      return c.json({ error: 'Payment amount mismatch', code: 'VERIFICATION_FAILED' }, 400)
    }
    status = 'confirmed'
  }
  if (!demoTx && !auth.address.startsWith('NQ00 DEMO ')) {
    const verified = await verifyNimiqPayment(txHash, auth.address, author.address, amountLuna)
    if (!verified) return c.json({ error: 'Payment could not be verified on Nimiq', code: 'VERIFICATION_FAILED' }, 400)
    status = 'confirmed'
  }

  db.prepare(
    `INSERT INTO tips (id, article_id, sender_id, recipient_id, amount_luna, note, tx_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(tipId, articleId, auth.userId, article.author_id, amountLuna, note || '', txHash, status)

  if (status === 'confirmed') {
    db.prepare(
      'UPDATE articles SET total_tips_luna = total_tips_luna + ? WHERE id = ?'
    ).run(amountLuna, articleId)
    db.prepare(
      'UPDATE users SET tips_sent_count = tips_sent_count + 1 WHERE id = ?'
    ).run(auth.userId)
    await createPaymentNotification({ userId: article.author_id, actorId: auth.userId, type: 'tip', articleId, amountLuna, txHash })
  }

  return c.json({ tipId, status }, 201)
})

tipRoutes.get('/article/:articleId', async (c) => {
  const mongo = getMongoDb()
  if (mongo) {
    const rows = await mongo.collection<any>('tips').find({ articleId: c.req.param('articleId'), status: 'confirmed' })
      .sort({ createdAt: -1 }).limit(50).toArray()
    const users = await mongo.collection<any>('users').find({ id: { $in: rows.map((r) => r.senderId) } }).toArray()
    const usersById = new Map(users.map((user) => [user.id, user]))
    return c.json({ tips: rows.map((row) => ({
      id: row.id, senderId: row.senderId, senderName: usersById.get(row.senderId)?.displayName || row.senderId,
      amountLuna: row.amountLuna, note: row.note, createdAt: new Date(row.createdAt).toISOString(),
    })) })
  }
  const rows = db.prepare(
    `SELECT t.*, u.display_name as sender_name
     FROM tips t JOIN users u ON t.sender_id = u.id
     WHERE t.article_id = ? AND t.status = 'confirmed'
     ORDER BY t.created_at DESC LIMIT 50`
  ).all(c.req.param('articleId')) as any[]

  const tips = rows.map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    amountLuna: r.amount_luna,
    note: r.note,
    createdAt: r.created_at,
  }))

  return c.json({ tips })
})
