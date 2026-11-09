import { Hono } from 'hono'
import { db } from '../index.js'
import { requireAuth, getAuth } from '../middleware/auth.js'

export const earningsRoutes = new Hono()

earningsRoutes.get('/summary', requireAuth, (c) => {
  const auth = getAuth(c)

  const tips = db.prepare(
    "SELECT COALESCE(SUM(amount_luna), 0) as total FROM tips WHERE recipient_id = ? AND status = 'confirmed'"
  ).get(auth.userId) as any

  const requests = db.prepare(
    "SELECT COALESCE(SUM(r.budget_luna), 0) as total FROM requests r WHERE r.winner_id = ? AND r.status = 'paid'"
  ).get(auth.userId) as any

  const readRewards = db.prepare(
    "SELECT COALESCE(SUM(amount_luna), 0) as total FROM payouts WHERE author_id = ? AND status = 'confirmed'"
  ).get(auth.userId) as any

  const pendingPayouts = db.prepare(
    "SELECT COALESCE(SUM(amount_luna), 0) as total FROM payouts WHERE author_id = ? AND status = 'pending'"
  ).get(auth.userId) as any

  const staked = db.prepare(
    "SELECT COALESCE(SUM(amount_luna), 0) as total FROM demo_stakes WHERE user_id = ? AND status = 'active'"
  ).get(auth.userId) as any

  const totalLuna = tips.total + requests.total + readRewards.total

  return c.json({
    totalLuna,
    tipsLuna: tips.total,
    requestsLuna: requests.total,
    readRewardsLuna: readRewards.total,
    stakedLuna: staked.total,
    pendingPayoutsLuna: pendingPayouts.total,
  })
})

earningsRoutes.get('/transactions', requireAuth, (c) => {
  const auth = getAuth(c)
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)

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

  const payoutTxs = db.prepare(
    `SELECT 'read_reward' as type, p.amount_luna, p.payout_date as created_at, p.status, 'Weekly pool' as label
     FROM payouts p WHERE p.author_id = ?
     ORDER BY p.payout_date DESC LIMIT ?`
  ).all(auth.userId, limit) as any[]

  const all = [...tipTxs, ...requestTxs, ...payoutTxs]
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
       SUM(CASE WHEN type = 'reward' THEN amount ELSE 0 END) as rewards
     FROM (
       SELECT 'tip' as type, amount_luna as amount, created_at FROM tips WHERE recipient_id = ? AND status = 'confirmed'
       UNION ALL
       SELECT 'request', budget_luna, created_at FROM requests WHERE winner_id = ? AND status = 'paid'
       UNION ALL
       SELECT 'reward', amount_luna, payout_date FROM payouts WHERE author_id = ? AND status = 'confirmed'
     ) t
     GROUP BY week ORDER BY week DESC LIMIT 8`
  ).all(auth.userId, auth.userId, auth.userId) as any[]

  return c.json({ weekly: rows })
})
