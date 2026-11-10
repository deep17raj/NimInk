import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { getReputationWeight } from '@nimink/shared'
import { getAuth, requireAuth } from '../middleware/auth.js'
import { getMongoDb } from '../db/mongo.js'
import { canReadArticle } from '../services/article-access.js'

export const readRoutes = new Hono()

readRoutes.post('/count', requireAuth, async (c) => {
  const auth = getAuth(c)
  const payload = await c.req.json().catch(() => null) as { articleId?: unknown } | null
  const articleId = typeof payload?.articleId === 'string' ? payload.articleId.trim() : ''
  if (!articleId) return c.json({ error: 'Missing articleId', code: 'INVALID_INPUT' }, 400)

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const article = await mongo.collection<any>('articles').findOne({ id: articleId, status: 'published' })
  if (!article) return c.json({ error: 'Article not found', code: 'NOT_FOUND' }, 404)

  const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
  if (!user) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)

  // Subscription/one-time (premium) articles only count a read once the
  // reader has actually paid for access (or is the author). A reader who
  // only sees the locked preview never reaches this check client-side, but
  // it's enforced here too since the client can't be trusted.
  if (!(await canReadArticle(mongo, article, auth.userId))) {
    return c.json({ counted: false, locked: true, verifiedReadCount: article.verifiedReadCount || 0 })
  }

  const weight = getReputationWeight(user.validReadCount || 0, user.tipsSentCount || 0)

  // `articleReads` has a unique index on (articleId, userId); the duplicate
  // key error from a second attempt is what makes "one read per account per
  // article" atomic without needing a SQL-style transaction.
  let inserted = true
  try {
    await mongo.collection('articleReads').insertOne({ articleId, userId: auth.userId, readAt: new Date(), weight })
  } catch (error: any) {
    if (error?.code === 11000) {
      inserted = false
    } else {
      console.error('Could not record article read:', error)
      return c.json({ error: 'Could not record this read', code: 'READ_COUNT_FAILED' }, 500)
    }
  }

  if (!inserted) {
    const current = await mongo.collection<any>('articles').findOne({ id: articleId })
    return c.json({ counted: false, alreadyRead: true, verifiedReadCount: current?.verifiedReadCount ?? 0 })
  }

  const sessionId = uuid()
  try {
    await mongo.collection('readSessions').insertOne({ id: sessionId, articleId, userId: auth.userId, valid: true, weight, startedAt: new Date() })
    await mongo.collection('users').updateOne({ id: auth.userId }, { $inc: { validReadCount: 1 } })
    const updated = await mongo.collection<any>('articles').findOneAndUpdate(
      { id: articleId, status: 'published' },
      { $inc: { verifiedReadCount: 1 } },
      { returnDocument: 'after' },
    )
    if (!updated) throw new Error('Published article was not found')
    return c.json({ counted: true, alreadyRead: false, verifiedReadCount: updated.verifiedReadCount, weight })
  } catch (error) {
    // Roll back so a retry is possible instead of leaving the read "claimed"
    // with nothing counted.
    await mongo.collection('articleReads').deleteOne({ articleId, userId: auth.userId })
    await mongo.collection('readSessions').deleteOne({ id: sessionId })
    await mongo.collection('users').updateOne({ id: auth.userId }, { $inc: { validReadCount: -1 } })
    console.error('Could not sync article read:', error)
    return c.json({ error: 'Could not sync this read. Please retry.', code: 'READ_COUNT_FAILED' }, 503)
  }
})
