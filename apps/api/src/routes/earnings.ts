import { Hono } from 'hono'
import { db } from '../index.js'
import { requireAuth, getAuth } from '../middleware/auth.js'
import { getMongoDb } from '../db/mongo.js'

export const earningsRoutes = new Hono()

earningsRoutes.get('/summary', requireAuth, async (c) => {
  const auth = getAuth(c)

  const mongo = getMongoDb()
  if (mongo) {
    const [tips, requests, accessPayments, stakes] = await Promise.all([
      mongo.collection<any>('tips').find({ recipientId: auth.userId, status: 'confirmed' }).toArray(),
      mongo.collection<any>('requests').find({ winnerId: auth.userId, status: 'paid' }).toArray(),
      mongo.collection<any>('accessPayments').find({ authorId: auth.userId, status: { $ne: 'failed' } }).toArray(),
      db.prepare("SELECT COALESCE(SUM(amount_luna), 0) as total FROM demo_stakes WHERE user_id = ? AND status = 'active'").get(auth.userId) as any,
    ])
    const tipsLuna = tips.reduce((sum, row) => sum + Number(row.amountLuna || 0), 0)
    const requestsLuna = requests.reduce((sum, row) => sum + Number(row.budgetLuna || 0), 0)
    const subscriptionsLuna = accessPayments.filter((row) => row.purpose === 'subscription').reduce((sum, row) => sum + Number(row.amountLuna || 0), 0)
    const articleSalesLuna = accessPayments.filter((row) => row.purpose === 'article').reduce((sum, row) => sum + Number(row.amountLuna || 0), 0)
    return c.json({ totalLuna: tipsLuna + requestsLuna + subscriptionsLuna + articleSalesLuna,
      tipsLuna, requestsLuna, subscriptionsLuna, articleSalesLuna, stakedLuna: stakes.total })
  }

  const tips = db.prepare(
    "SELECT COALESCE(SUM(amount_luna), 0) as total FROM tips WHERE recipient_id = ? AND status = 'confirmed'"
  ).get(auth.userId) as any

  const requests = db.prepare(
    "SELECT COALESCE(SUM(r.budget_luna), 0) as total FROM requests r WHERE r.winner_id = ? AND r.status = 'paid'"
  ).get(auth.userId) as any

  const subscriptions = db.prepare(
    "SELECT COALESCE(SUM(amount_luna), 0) as total FROM access_payments WHERE author_id = ? AND purpose = 'subscription'"
  ).get(auth.userId) as any

  const articleSales = db.prepare(
    "SELECT COALESCE(SUM(amount_luna), 0) as total FROM access_payments WHERE author_id = ? AND purpose = 'article'"
  ).get(auth.userId) as any

  const staked = db.prepare(
    "SELECT COALESCE(SUM(amount_luna), 0) as total FROM demo_stakes WHERE user_id = ? AND status = 'active'"
  ).get(auth.userId) as any

  const totalLuna = tips.total + requests.total + subscriptions.total + articleSales.total

  return c.json({
    totalLuna,
    tipsLuna: tips.total,
    requestsLuna: requests.total,
    subscriptionsLuna: subscriptions.total,
    articleSalesLuna: articleSales.total,
    stakedLuna: staked.total,
  })
})

earningsRoutes.get('/transactions', requireAuth, async (c) => {
  const auth = getAuth(c)
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)

  const mongo = getMongoDb()
  if (mongo) {
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
  }

  const tipTxs = db.prepare(
    `SELECT 'tip' as type, t.amount_luna, t.created_at, t.status, a.title as label
     FROM tips t JOIN articles a ON t.article_id = a.id
     WHERE t.recipient_id = ?
     ORDER BY t.created_at DESC LIMIT ?`
  ).all(auth.userId, limit) as any[]

  const requestTxs = db.prepare(
    `SELECT 'request' as type, r.budget_luna as amount_luna, r.created_at, r.status, r.topic as label
     FROM requests r
     WHERE r.winner_id = ? AND r.status = 'paid'
     ORDER BY r.created_at DESC LIMIT ?`
  ).all(auth.userId, limit) as any[]

  const premiumTxs = db.prepare(
    `SELECT purpose as type, amount_luna, created_at, 'confirmed' as status,
       CASE WHEN purpose = 'subscription' THEN 'Author subscription' ELSE COALESCE(a.title, 'Premium article') END as label
     FROM access_payments p LEFT JOIN articles a ON a.id = p.article_id
     WHERE p.author_id = ? ORDER BY p.created_at DESC LIMIT ?`
  ).all(auth.userId, limit) as any[]

  const all = [...tipTxs, ...requestTxs, ...premiumTxs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  return c.json({ transactions: all })
})

earningsRoutes.get('/weekly', requireAuth, (c) => {
  const auth = getAuth(c)

  const rows = db.prepare(
    `SELECT
       strftime('%Y-W%W', t.created_at) as week,
       SUM(CASE WHEN type = 'tip' THEN amount ELSE 0 END) as tips,
       SUM(CASE WHEN type = 'request' THEN amount ELSE 0 END) as requests,
       SUM(CASE WHEN type = 'subscription' THEN amount ELSE 0 END) as subscriptions,
       SUM(CASE WHEN type = 'article' THEN amount ELSE 0 END) as article_sales
     FROM (
       SELECT 'tip' as type, amount_luna as amount, created_at FROM tips WHERE recipient_id = ? AND status = 'confirmed'
       UNION ALL
       SELECT 'request', budget_luna, created_at FROM requests WHERE winner_id = ? AND status = 'paid'
       UNION ALL
       SELECT purpose, amount_luna, created_at FROM access_payments WHERE author_id = ?
     ) t
     GROUP BY week ORDER BY week DESC LIMIT 8`
  ).all(auth.userId, auth.userId, auth.userId) as any[]

  return c.json({ weekly: rows })
})
