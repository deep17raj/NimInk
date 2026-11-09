import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { calculateArticleScore, distributePool, POOL_PAYOUT_DELAY_DAYS, DEFAULT_POOL_SIZE_LUNA } from '@nimink/shared'
import { db } from '../index.js'
import { requireAuth } from '../middleware/auth.js'

export const poolRoutes = new Hono()

poolRoutes.get('/current', (c) => {
  const pool = db.prepare(
    "SELECT * FROM pools WHERE distributed = 0 ORDER BY created_at DESC LIMIT 1"
  ).get() as any

  if (!pool) return c.json({ pool: null })

  return c.json({
    pool: {
      id: pool.id,
      weekStart: pool.week_start,
      weekEnd: pool.week_end,
      totalLuna: pool.total_luna,
      sponsor: pool.sponsor,
      distributed: !!pool.distributed,
    },
  })
})

poolRoutes.post('/distribute', requireAuth, async (c) => {
  // Admin-only in production; for demo, anyone can trigger
  const pool = db.prepare(
    "SELECT * FROM pools WHERE distributed = 0 ORDER BY created_at DESC LIMIT 1"
  ).get() as any

  if (!pool) return c.json({ error: 'No active pool', code: 'NO_POOL' }, 404)

  // Get article scores for the pool period
  const articles = db.prepare(
    `SELECT a.id, a.author_id,
       COUNT(ar.user_id) as read_count
     FROM articles a
     LEFT JOIN article_reads ar ON ar.article_id = a.id
       AND ar.read_at >= ? AND ar.read_at <= ?
     WHERE a.status = 'published'
     GROUP BY a.id
     HAVING read_count > 0`
  ).all(pool.week_start, pool.week_end) as any[]

  // Get read details per article for weighted scoring
  const authorScores: Record<string, number> = {}
  for (const article of articles) {
    const reads = db.prepare(
      `SELECT weight FROM article_reads
       WHERE article_id = ? AND read_at >= ? AND read_at <= ?`
    ).all(article.id, pool.week_start, pool.week_end) as any[]

    const score = calculateArticleScore(reads)
    authorScores[article.author_id] = (authorScores[article.author_id] || 0) + score
  }

  const authors = Object.entries(authorScores).map(([authorId, score]) => ({ authorId, score }))
  const perAuthorCap = Math.floor(pool.total_luna * 0.3)
  const perArticleCap = Math.floor(pool.total_luna * 0.15)
  const payouts = distributePool(pool.total_luna, authors, perAuthorCap, perArticleCap)

  const payoutDate = new Date()
  payoutDate.setDate(payoutDate.getDate() + POOL_PAYOUT_DELAY_DAYS)

  const insertPayout = db.prepare(
    `INSERT INTO payouts (id, pool_id, author_id, amount_luna, score, payout_date)
     VALUES (?, ?, ?, ?, ?, ?)`
  )

  const txn = db.transaction(() => {
    for (const p of payouts) {
      insertPayout.run(uuid(), pool.id, p.authorId, p.amountLuna, p.score, payoutDate.toISOString())
    }
    db.prepare('UPDATE pools SET distributed = 1 WHERE id = ?').run(pool.id)
  })
  txn()

  return c.json({ distributed: payouts.length, payouts })
})
