import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import {
  READ_VALIDATION,
  estimateReadTimeSeconds,
  getReputationWeight,
} from '@nimink/shared'
import { db } from '../index.js'
import { requireAuth, getAuth } from '../middleware/auth.js'
import { getMongoDb } from '../db/mongo.js'
import { canReadArticle, canReadSqlArticle } from '../services/article-access.js'
import crypto from 'node:crypto'

export const readRoutes = new Hono()

readRoutes.post('/start', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { articleId, deviceId } = await c.req.json()

  if (!articleId) return c.json({ error: 'Missing articleId', code: 'INVALID_INPUT' }, 400)

  const article = db.prepare(
    "SELECT * FROM articles WHERE id = ? AND status = 'published'"
  ).get(articleId) as any
  if (!article) return c.json({ error: 'Article not found', code: 'NOT_FOUND' }, 404)

  const mongo = getMongoDb()
  if (mongo) {
    const sharedArticle = await mongo.collection<any>('articles').findOne({ id: articleId, status: 'published' })
    if (sharedArticle && !(await canReadArticle(mongo, sharedArticle, auth.userId))) {
      return c.json({ error: 'Unlock this premium article before starting a read', code: 'PREMIUM_LOCKED' }, 402)
    }
    if (!sharedArticle && !canReadSqlArticle(db, article, auth.userId)) {
      return c.json({ error: 'Unlock this premium article before starting a read', code: 'PREMIUM_LOCKED' }, 402)
    }
  } else if (!canReadSqlArticle(db, article, auth.userId)) {
    return c.json({ error: 'Unlock this premium article before starting a read', code: 'PREMIUM_LOCKED' }, 402)
  }

  if (article.author_id === auth.userId) {
    return c.json({ error: 'Cannot validate reading your own article', code: 'SELF_READ' }, 400)
  }

  const deviceHash = typeof deviceId === 'string' && deviceId.length > 0
    ? crypto.createHash('sha256').update(deviceId).digest('hex').slice(0, 16)
    : ''
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)

  // Check per-wallet per-article uniqueness
  const existingRead = db.prepare(
    "SELECT id FROM read_sessions WHERE article_id = ? AND user_id = ? AND valid = 1"
  ).get(articleId, auth.userId) as any
  if (existingRead) {
    return c.json({ error: 'Already verified this article', code: 'ALREADY_READ' }, 409)
  }

  // Check device uniqueness
  if (deviceHash) {
    const deviceRead = db.prepare(
      "SELECT id FROM read_sessions WHERE article_id = ? AND device_hash = ? AND valid = 1"
    ).get(articleId, deviceHash) as any
    if (deviceRead) {
      return c.json({ error: 'This device already verified this article', code: 'DEVICE_DUPLICATE' }, 409)
    }
  }

  // Rate limits
  const today = new Date().toISOString().slice(0, 10)
  const walletReadsToday = db.prepare(
    "SELECT COUNT(*) as count FROM read_sessions WHERE user_id = ? AND date(started_at) = ? AND valid = 1"
  ).get(auth.userId, today) as any
  if (walletReadsToday.count >= READ_VALIDATION.MAX_READS_PER_WALLET_PER_DAY) {
    return c.json({ error: 'Daily read limit reached', code: 'RATE_LIMIT' }, 429)
  }

  if (deviceHash) {
    const deviceReadsToday = db.prepare(
      "SELECT COUNT(*) as count FROM read_sessions WHERE device_hash = ? AND date(started_at) = ? AND valid = 1"
    ).get(deviceHash, today) as any
    if (deviceReadsToday.count >= READ_VALIDATION.MAX_READS_PER_DEVICE_PER_DAY) {
      return c.json({ error: 'Daily read limit reached for this device', code: 'DEVICE_RATE_LIMIT' }, 429)
    }
  }

  if (ip !== 'unknown') {
    const ipReadsToday = db.prepare(
      "SELECT COUNT(*) as count FROM read_sessions WHERE ip_hash = ? AND date(started_at) = ? AND valid = 1"
    ).get(ipHash, today) as any
    if (ipReadsToday.count >= READ_VALIDATION.MAX_READS_PER_IP_PER_DAY) {
      return c.json({ error: 'Daily read limit reached for this network', code: 'IP_RATE_LIMIT' }, 429)
    }
  }

  const articleReadsToday = db.prepare(
    "SELECT COUNT(*) as count FROM read_sessions WHERE article_id = ? AND date(started_at) = ? AND valid = 1"
  ).get(articleId, today) as any
  if (articleReadsToday.count >= READ_VALIDATION.MAX_READS_PER_ARTICLE_PER_DAY) {
    return c.json({ error: 'Article daily read limit reached', code: 'RATE_LIMIT' }, 429)
  }

  const sessionId = uuid()
  db.prepare(
    `INSERT INTO read_sessions (id, article_id, user_id, device_hash, ip_hash)
     VALUES (?, ?, ?, ?, ?)`
  ).run(sessionId, articleId, auth.userId, deviceHash, ipHash)

  return c.json({
    sessionId,
    wordCount: article.word_count,
    readTimeMinutes: article.read_time_minutes,
    minimumReadSeconds: Math.max(1, Math.ceil(estimateReadTimeSeconds(article.word_count) / 15)),
  })
})

readRoutes.post('/finish', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { sessionId } = await c.req.json()

  const session = db.prepare(
    'SELECT * FROM read_sessions WHERE id = ? AND user_id = ? AND expired = 0'
  ).get(sessionId, auth.userId) as any
  if (!session) return c.json({ error: 'Session not found or completed', code: 'NOT_FOUND' }, 404)
  if (session.valid === 1) return c.json({ valid: true, alreadyCounted: true })
  if (session.valid !== null) return c.json({ valid: false, reason: session.reject_reason || 'session_not_countable' }, 409)

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(session.article_id) as any
  if (!article) return c.json({ error: 'Article not found', code: 'NOT_FOUND' }, 404)

  const startedAt = new Date(session.started_at).getTime()
  if ((Date.now() - startedAt) / 60_000 > READ_VALIDATION.SESSION_EXPIRY_MINUTES) {
    db.prepare('UPDATE read_sessions SET expired = 1, valid = 0, reject_reason = ? WHERE id = ?')
      .run('session_expired', sessionId)
    return c.json({ error: 'Session expired', code: 'SESSION_EXPIRED' }, 410)
  }

  const elapsedSeconds = (Date.now() - startedAt) / 1000
  const minimumReadSeconds = Math.max(1, Math.ceil(estimateReadTimeSeconds(article.word_count) / 15))
  if (elapsedSeconds < minimumReadSeconds) {
    db.prepare('UPDATE read_sessions SET valid = 0, reject_reason = ? WHERE id = ?')
      .run('too_fast', sessionId)
    return c.json({ valid: false, reason: 'too_fast' })
  }

  // Count once per article for this wallet or browser device, including when
  // multiple read sessions were opened before one finished.
  const existingRead = db.prepare(
    "SELECT id FROM read_sessions WHERE article_id = ? AND user_id = ? AND valid = 1 AND id != ?"
  ).get(session.article_id, auth.userId, sessionId) as any
  const existingDeviceRead = session.device_hash
    ? db.prepare("SELECT id FROM read_sessions WHERE article_id = ? AND device_hash = ? AND valid = 1 AND id != ?")
      .get(session.article_id, session.device_hash, sessionId) as any
    : null
  if (existingRead || existingDeviceRead) {
    db.prepare('UPDATE read_sessions SET valid = 0, reject_reason = ? WHERE id = ?')
      .run('already_verified', sessionId)
    return c.json({ valid: false, reason: 'already_verified' }, 409)
  }

  // Calculate reputation weight
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.userId) as any
  const weight = getReputationWeight(user.valid_read_count, user.tips_sent_count)

  db.prepare(
    'UPDATE read_sessions SET valid = 1, weight = ? WHERE id = ?'
  ).run(weight, sessionId)

  const mongo = getMongoDb()
  if (mongo) {
    await mongo.collection('articles').updateOne(
      { id: article.id, status: 'published' },
      { $inc: { verifiedReadCount: 1 } },
    )
  } else {
    db.prepare(
      'UPDATE articles SET verified_read_count = verified_read_count + 1 WHERE id = ?'
    ).run(article.id)
  }

  db.prepare(
    'UPDATE users SET valid_read_count = valid_read_count + 1 WHERE id = ?'
  ).run(auth.userId)

  return c.json({ valid: true, weight })
})
