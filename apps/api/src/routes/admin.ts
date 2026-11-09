import { Hono } from 'hono'
import { db } from '../index.js'
import { requireAdmin } from '../middleware/auth.js'

export const adminRoutes = new Hono()

adminRoutes.use('*', requireAdmin)

adminRoutes.get('/reports', (c) => {
  const status = c.req.query('status') || 'pending'
  const rows = db.prepare(
    `SELECT r.*, u.display_name as reporter_name
     FROM reports r JOIN users u ON r.reporter_id = u.id
     WHERE r.status = ?
     ORDER BY r.created_at DESC LIMIT 50`
  ).all(status) as any[]

  return c.json({
    reports: rows.map((r) => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reporterName: r.reporter_name,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.created_at,
    })),
  })
})

adminRoutes.post('/reports/:id/hide', async (c) => {
  const reportId = c.req.param('id')
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as any
  if (!report) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  db.prepare("UPDATE reports SET status = 'hidden' WHERE id = ?").run(reportId)

  if (report.target_type === 'article') {
    db.prepare("UPDATE articles SET status = 'hidden' WHERE id = ?").run(report.target_id)
  }

  return c.json({ ok: true })
})

adminRoutes.post('/reports/:id/restore', async (c) => {
  const reportId = c.req.param('id')
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as any
  if (!report) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  db.prepare("UPDATE reports SET status = 'restored' WHERE id = ?").run(reportId)

  if (report.target_type === 'article') {
    db.prepare("UPDATE articles SET status = 'published' WHERE id = ?").run(report.target_id)
  }

  return c.json({ ok: true })
})

adminRoutes.get('/pool/payouts', (c) => {
  const rows = db.prepare(
    `SELECT p.*, u.display_name as author_name, po.sponsor
     FROM payouts p
     JOIN users u ON p.author_id = u.id
     JOIN pools po ON p.pool_id = po.id
     ORDER BY p.payout_date DESC LIMIT 100`
  ).all() as any[]

  return c.json({
    payouts: rows.map((p) => ({
      id: p.id,
      authorName: p.author_name,
      amountLuna: p.amount_luna,
      score: p.score,
      status: p.status,
      payoutDate: p.payout_date,
      sponsor: p.sponsor,
    })),
  })
})

adminRoutes.get('/flags', (c) => {
  // Fraud cluster detection: same device or IP with many wallets
  const deviceClusters = db.prepare(
    `SELECT device_hash, COUNT(DISTINCT user_id) as wallet_count
     FROM read_sessions
     WHERE device_hash != '' AND valid = 1
     GROUP BY device_hash HAVING wallet_count > 3
     ORDER BY wallet_count DESC LIMIT 20`
  ).all() as any[]

  const ipClusters = db.prepare(
    `SELECT ip_hash, COUNT(DISTINCT user_id) as wallet_count
     FROM read_sessions
     WHERE ip_hash != '' AND valid = 1
     GROUP BY ip_hash HAVING wallet_count > 5
     ORDER BY wallet_count DESC LIMIT 20`
  ).all() as any[]

  return c.json({ deviceClusters, ipClusters })
})
