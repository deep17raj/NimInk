import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import {
  READ_VALIDATION,
  validateCheckpoints,
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

  const deviceHash = deviceId ? crypto.createHash('sha256').update(deviceId).digest('hex').slice(0, 16) : ''
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
  })
})

readRoutes.post('/checkpoint', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { sessionId, checkpoint, timestamp } = await c.req.json()

  const session = db.prepare(
    'SELECT * FROM read_sessions WHERE id = ? AND user_id = ? AND valid IS NULL AND expired = 0'
  ).get(sessionId, auth.userId) as any
  if (!session) return c.json({ error: 'Session not found or completed', code: 'NOT_FOUND' }, 404)

  // Check session expiry
  const startedAt = new Date(session.started_at).getTime()
  const elapsed = (Date.now() - startedAt) / 1000 / 60
  if (elapsed > READ_VALIDATION.SESSION_EXPIRY_MINUTES) {
    db.prepare('UPDATE read_sessions SET expired = 1, valid = 0, reject_reason = ? WHERE id = ?')
      .run('session_expired', sessionId)
    return c.json({ error: 'Session expired', code: 'SESSION_EXPIRED' }, 410)
  }

  const checkpoints = JSON.parse(session.checkpoints)
  const times = JSON.parse(session.checkpoint_times)
  checkpoints.push(checkpoint)
  times.push(timestamp)

  db.prepare(
    'UPDATE read_sessions SET checkpoints = ?, checkpoint_times = ? WHERE id = ?'
  ).run(JSON.stringify(checkpoints), JSON.stringify(times), sessionId)

  return c.json({ ok: true })
})

readRoutes.post('/finish', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { sessionId, quizAnswer } = await c.req.json()

  const session = db.prepare(
    'SELECT * FROM read_sessions WHERE id = ? AND user_id = ? AND valid IS NULL AND expired = 0'
  ).get(sessionId, auth.userId) as any
  if (!session) return c.json({ error: 'Session not found or completed', code: 'NOT_FOUND' }, 404)

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(session.article_id) as any
  if (!article) return c.json({ error: 'Article not found', code: 'NOT_FOUND' }, 404)

  const checkpoints = JSON.parse(session.checkpoints)
  const checkpointTimes = JSON.parse(session.checkpoint_times)

  // Validate checkpoints
  const validation = validateCheckpoints(checkpoints, checkpointTimes, article.word_count)
  if (!validation.valid) {
    db.prepare('UPDATE read_sessions SET valid = 0, reject_reason = ? WHERE id = ?')
      .run(validation.reason, sessionId)
    return c.json({ valid: false, reason: validation.reason })
  }

  // Validate quiz
  const quiz = article.quiz_json ? JSON.parse(article.quiz_json) : null
  let quizPassed = true
  if (quiz) {
    quizPassed = quizAnswer === quiz.correctIndex
    if (!quizPassed) {
      db.prepare('UPDATE read_sessions SET valid = 0, quiz_passed = 0, reject_reason = ? WHERE id = ?')
        .run('quiz_failed', sessionId)
      return c.json({ valid: false, reason: 'quiz_failed' })
    }
  }

  // Calculate reputation weight
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.userId) as any
  const weight = getReputationWeight(user.valid_read_count, user.tips_sent_count)

  db.prepare(
    'UPDATE read_sessions SET valid = 1, quiz_passed = 1, weight = ? WHERE id = ?'
  ).run(weight, sessionId)

  db.prepare(
    'UPDATE articles SET verified_read_count = verified_read_count + 1 WHERE id = ?'
  ).run(article.id)

  const mongo = getMongoDb()
  if (mongo) {
    await mongo.collection('articles').updateOne(
      { id: article.id, status: 'published' },
      { $inc: { verifiedReadCount: 1 } },
    )
  }

  db.prepare(
    'UPDATE users SET valid_read_count = valid_read_count + 1 WHERE id = ?'
  ).run(auth.userId)

  return c.json({ valid: true, weight })
})
