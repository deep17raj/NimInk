import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { calculateArticleScore, distributePool, POOL_PAYOUT_DELAY_DAYS } from '@nimink/shared'
import { getMongoDb } from '../db/mongo.js'
import { requireAuth } from '../middleware/auth.js'

export const poolRoutes = new Hono()

poolRoutes.get('/current', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const pool = await mongo.collection<any>('pools').find({ distributed: false }).sort({ createdAt: -1 }).limit(1).next()
  if (!pool) return c.json({ pool: null })

  return c.json({
    pool: {
      id: pool.id,
      weekStart: pool.weekStart,
      weekEnd: pool.weekEnd,
      totalLuna: pool.totalLuna,
      sponsor: pool.sponsor,
      distributed: !!pool.distributed,
    },
  })
})

poolRoutes.post('/distribute', requireAuth, async (c) => {
  // Admin-only in production; for demo, anyone can trigger
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const pool = await mongo.collection<any>('pools').find({ distributed: false }).sort({ createdAt: -1 }).limit(1).next()
  if (!pool) return c.json({ error: 'No active pool', code: 'NO_POOL' }, 404)

  const weekStart = new Date(pool.weekStart)
  const weekEnd = new Date(pool.weekEnd)

  // Get read details per article for weighted scoring over the pool period
  const reads = await mongo.collection<any>('articleReads')
    .find({ readAt: { $gte: weekStart, $lte: weekEnd } })
    .toArray()

  const readsByArticle = new Map<string, Array<{ weight: number }>>()
  for (const read of reads) {
    const list = readsByArticle.get(read.articleId) || []
    list.push({ weight: read.weight })
    readsByArticle.set(read.articleId, list)
  }
  if (!readsByArticle.size) return c.json({ distributed: 0, payouts: [] })

  const articles = await mongo.collection<any>('articles')
    .find({ id: { $in: [...readsByArticle.keys()] }, status: 'published' })
    .project({ id: 1, authorId: 1 })
    .toArray()

  const authorScores: Record<string, number> = {}
  for (const article of articles) {
    const articleReads = readsByArticle.get(article.id) || []
    if (!articleReads.length) continue
    const score = calculateArticleScore(articleReads)
    authorScores[article.authorId] = (authorScores[article.authorId] || 0) + score
  }

  const authors = Object.entries(authorScores).map(([authorId, score]) => ({ authorId, score }))
  const perAuthorCap = Math.floor(pool.totalLuna * 0.3)
  const perArticleCap = Math.floor(pool.totalLuna * 0.15)
  const payouts = distributePool(pool.totalLuna, authors, perAuthorCap, perArticleCap)

  const payoutDate = new Date()
  payoutDate.setDate(payoutDate.getDate() + POOL_PAYOUT_DELAY_DAYS)

  if (payouts.length) {
    await mongo.collection('payouts').insertMany(payouts.map((p) => ({
      id: uuid(), poolId: pool.id, authorId: p.authorId, amountLuna: p.amountLuna,
      score: p.score, status: 'pending', payoutDate,
    })))
  }
  await mongo.collection('pools').updateOne({ id: pool.id }, { $set: { distributed: true } })

  return c.json({ distributed: payouts.length, payouts })
})
