import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { getReputationWeight } from '@nimink/shared'
import { db } from '../index.js'
import { getAuth, requireAuth } from '../middleware/auth.js'
import { getMongoDb } from '../db/mongo.js'

export const readRoutes = new Hono()

readRoutes.post('/count', requireAuth, async (c) => {
  const auth = getAuth(c)
  const payload = await c.req.json().catch(() => null) as { articleId?: unknown } | null
  const articleId = typeof payload?.articleId === 'string' ? payload.articleId.trim() : ''
  if (!articleId) return c.json({ error: 'Missing articleId', code: 'INVALID_INPUT' }, 400)

  const article = db.prepare(
    "SELECT id FROM articles WHERE id = ? AND status = 'published'",
  ).get(articleId) as { id: string } | undefined
  if (!article) return c.json({ error: 'Article not found', code: 'NOT_FOUND' }, 404)

  const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(auth.userId)
  if (!userExists) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)

  const sessionId = uuid()
  const recordRead = db.transaction(() => {
    const user = db.prepare('SELECT valid_read_count, tips_sent_count FROM users WHERE id = ?').get(auth.userId) as
      { valid_read_count: number; tips_sent_count: number }
    const weight = getReputationWeight(user.valid_read_count, user.tips_sent_count)
    const inserted = db.prepare(
      'INSERT OR IGNORE INTO article_reads (article_id, user_id, weight) VALUES (?, ?, ?)',
    ).run(articleId, auth.userId, weight)

    if (inserted.changes === 0) {
      const current = db.prepare('SELECT verified_read_count FROM articles WHERE id = ?').get(articleId) as
        { verified_read_count: number } | undefined
      return { counted: false, readCount: current?.verified_read_count ?? 0, weight }
    }

    db.prepare(
      `INSERT INTO read_sessions (id, article_id, user_id, valid, weight)
       VALUES (?, ?, ?, 1, ?)`,
    ).run(sessionId, articleId, auth.userId, weight)
    db.prepare('UPDATE users SET valid_read_count = valid_read_count + 1 WHERE id = ?').run(auth.userId)
    db.prepare('UPDATE articles SET verified_read_count = verified_read_count + 1 WHERE id = ?').run(articleId)

    const updated = db.prepare('SELECT verified_read_count FROM articles WHERE id = ?').get(articleId) as
      { verified_read_count: number }
    return { counted: true, readCount: updated.verified_read_count, weight }
  })

  let result: { counted: boolean; readCount: number; weight: number }
  try {
    result = recordRead()
  } catch (error) {
    console.error('Could not record article read:', error)
    return c.json({ error: 'Could not record this read', code: 'READ_COUNT_FAILED' }, 500)
  }

  if (!result.counted) {
    return c.json({ counted: false, alreadyRead: true, verifiedReadCount: result.readCount })
  }

  const mongo = getMongoDb()
  if (mongo) {
    try {
      const updated = await mongo.collection('articles').updateOne(
        { id: articleId, status: 'published' },
        { $inc: { verifiedReadCount: 1 } },
      )
      if (updated.matchedCount === 0) throw new Error('Published article was not found in MongoDB')
    } catch (error) {
      // Allow a retry if the shared article count could not be updated.
      const rollbackRead = db.transaction(() => {
        db.prepare('DELETE FROM article_reads WHERE article_id = ? AND user_id = ?').run(articleId, auth.userId)
        db.prepare('DELETE FROM read_sessions WHERE id = ?').run(sessionId)
        db.prepare('UPDATE users SET valid_read_count = MAX(0, valid_read_count - 1) WHERE id = ?').run(auth.userId)
        db.prepare('UPDATE articles SET verified_read_count = MAX(0, verified_read_count - 1) WHERE id = ?').run(articleId)
      })
      rollbackRead()
      console.error('Could not sync article read to MongoDB:', error)
      return c.json({ error: 'Could not sync this read. Please retry.', code: 'READ_COUNT_FAILED' }, 503)
    }
  }

  return c.json({ counted: true, alreadyRead: false, verifiedReadCount: result.readCount, weight: result.weight })
})
