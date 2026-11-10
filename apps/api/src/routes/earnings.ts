import { Hono } from 'hono'
import { requireAuth, getAuth } from '../middleware/auth.js'
import { getMongoDb } from '../db/mongo.js'

export const earningsRoutes = new Hono()

earningsRoutes.get('/summary', requireAuth, async (c) => {
  const auth = getAuth(c)

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const [tips, requests, accessPayments, stakes] = await Promise.all([
    mongo.collection<any>('tips').find({ recipientId: auth.userId, status: 'confirmed' }).toArray(),
    mongo.collection<any>('requests').find({ winnerId: auth.userId, status: 'paid' }).toArray(),
    mongo.collection<any>('accessPayments').find({ authorId: auth.userId, status: { $ne: 'failed' } }).toArray(),
    mongo.collection<any>('demoStakes').find({ userId: auth.userId, status: 'active' }).toArray(),
  ])
  const tipsLuna = tips.reduce((sum, row) => sum + Number(row.amountLuna || 0), 0)
  const requestsLuna = requests.reduce((sum, row) => sum + Number(row.budgetLuna || 0), 0)
  const subscriptionsLuna = accessPayments.filter((row) => row.purpose === 'subscription').reduce((sum, row) => sum + Number(row.amountLuna || 0), 0)
  const articleSalesLuna = accessPayments.filter((row) => row.purpose === 'article').reduce((sum, row) => sum + Number(row.amountLuna || 0), 0)
  const stakedLuna = stakes.reduce((sum, row) => sum + Number(row.amountLuna || 0), 0)
  return c.json({ totalLuna: tipsLuna + requestsLuna + subscriptionsLuna + articleSalesLuna,
    tipsLuna, requestsLuna, subscriptionsLuna, articleSalesLuna, stakedLuna })
})

earningsRoutes.get('/transactions', requireAuth, async (c) => {
  const auth = getAuth(c)
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const [tips, requests, accessPayments] = await Promise.all([
    mongo.collection<any>('tips').find({ recipientId: auth.userId }).sort({ createdAt: -1 }).limit(limit).toArray(),
    mongo.collection<any>('requests').find({ winnerId: auth.userId, status: 'paid' }).sort({ paidAt: -1, createdAt: -1 }).limit(limit).toArray(),
    mongo.collection<any>('accessPayments').find({ authorId: auth.userId, status: { $ne: 'failed' } }).sort({ createdAt: -1 }).limit(limit).toArray(),
  ])
  const articleIds = [...new Set(accessPayments.map((row) => row.articleId).filter(Boolean))]
  const articles = articleIds.length ? await mongo.collection<any>('articles').find({ id: { $in: articleIds } }).toArray() : []
  const titles = new Map(articles.map((article) => [article.id, article.title]))
  const rows = [
    ...tips.map((row) => ({ type: 'tip', amount_luna: row.amountLuna, created_at: row.createdAt, status: row.status, label: 'Reader tip' })),
    ...requests.map((row) => ({ type: 'request', amount_luna: row.budgetLuna, created_at: row.paidAt || row.createdAt, status: row.status, label: row.topic })),
    ...accessPayments.map((row) => ({ type: row.purpose, amount_luna: row.amountLuna, created_at: row.createdAt, status: 'confirmed', label: row.purpose === 'subscription' ? 'Author subscription' : titles.get(row.articleId) || 'Premium article' })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit)
  return c.json({ transactions: rows })
})

function weekKey(date: Date) {
  // Monday-based ISO week number, labeled like SQLite's old `%Y-W%W` buckets.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

earningsRoutes.get('/weekly', requireAuth, async (c) => {
  const auth = getAuth(c)

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const since = new Date(Date.now() - 56 * 86_400_000) // comfortably over 8 weeks
  const [tips, requests, accessPayments] = await Promise.all([
    mongo.collection<any>('tips').find({ recipientId: auth.userId, status: 'confirmed', createdAt: { $gte: since } }).toArray(),
    mongo.collection<any>('requests').find({ winnerId: auth.userId, status: 'paid', createdAt: { $gte: since } }).toArray(),
    mongo.collection<any>('accessPayments').find({ authorId: auth.userId, createdAt: { $gte: since } }).toArray(),
  ])

  const buckets = new Map<string, { week: string; tips: number; requests: number; subscriptions: number; article_sales: number }>()
  const bucketFor = (week: string) => {
    let bucket = buckets.get(week)
    if (!bucket) {
      bucket = { week, tips: 0, requests: 0, subscriptions: 0, article_sales: 0 }
      buckets.set(week, bucket)
    }
    return bucket
  }
  for (const row of tips) bucketFor(weekKey(new Date(row.createdAt))).tips += Number(row.amountLuna || 0)
  for (const row of requests) bucketFor(weekKey(new Date(row.createdAt))).requests += Number(row.budgetLuna || 0)
  for (const row of accessPayments) {
    const bucket = bucketFor(weekKey(new Date(row.createdAt)))
    if (row.purpose === 'subscription') bucket.subscriptions += Number(row.amountLuna || 0)
    else bucket.article_sales += Number(row.amountLuna || 0)
  }

  const weekly = [...buckets.values()].sort((a, b) => (a.week < b.week ? 1 : -1)).slice(0, 8)
  return c.json({ weekly })
})
