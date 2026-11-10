import { Hono } from 'hono'
import { getMongoDb } from '../db/mongo.js'
import { requireAdmin } from '../middleware/auth.js'

export const adminRoutes = new Hono()

adminRoutes.use('*', requireAdmin)

adminRoutes.get('/reports', async (c) => {
  const status = c.req.query('status') || 'pending'
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const rows = await mongo.collection<any>('reports').find({ status }).sort({ createdAt: -1 }).limit(50).toArray()
  const reporters = await mongo.collection<any>('users').find({ id: { $in: rows.map((r) => r.reporterId) } }).toArray()
  const namesById = new Map(reporters.map((u) => [u.id, u.displayName]))

  return c.json({
    reports: rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reporterName: namesById.get(r.reporterId) || r.reporterId,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: new Date(r.createdAt).toISOString(),
    })),
  })
})

adminRoutes.post('/reports/:id/hide', async (c) => {
  const reportId = c.req.param('id')
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const report = await mongo.collection<any>('reports').findOne({ id: reportId })
  if (!report) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  await mongo.collection('reports').updateOne({ id: reportId }, { $set: { status: 'hidden' } })
  if (report.targetType === 'article') {
    await mongo.collection('articles').updateOne({ id: report.targetId }, { $set: { status: 'hidden' } })
  }

  return c.json({ ok: true })
})

adminRoutes.post('/reports/:id/restore', async (c) => {
  const reportId = c.req.param('id')
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const report = await mongo.collection<any>('reports').findOne({ id: reportId })
  if (!report) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  await mongo.collection('reports').updateOne({ id: reportId }, { $set: { status: 'restored' } })
  if (report.targetType === 'article') {
    await mongo.collection('articles').updateOne({ id: report.targetId }, { $set: { status: 'published' } })
  }

  return c.json({ ok: true })
})

adminRoutes.get('/flags', async (c) => {
  // Fraud cluster detection: same device or IP with many wallets
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const sessions = mongo.collection('readSessions')
  const [deviceClusters, ipClusters] = await Promise.all([
    sessions.aggregate([
      { $match: { valid: true, deviceHash: { $nin: [null, ''] } } },
      { $group: { _id: '$deviceHash', walletCount: { $addToSet: '$userId' } } },
      { $project: { device_hash: '$_id', wallet_count: { $size: '$walletCount' } } },
      { $match: { wallet_count: { $gt: 3 } } },
      { $sort: { wallet_count: -1 } },
      { $limit: 20 },
    ]).toArray(),
    sessions.aggregate([
      { $match: { valid: true, ipHash: { $nin: [null, ''] } } },
      { $group: { _id: '$ipHash', walletCount: { $addToSet: '$userId' } } },
      { $project: { ip_hash: '$_id', wallet_count: { $size: '$walletCount' } } },
      { $match: { wallet_count: { $gt: 5 } } },
      { $sort: { wallet_count: -1 } },
      { $limit: 20 },
    ]).toArray(),
  ])

  return c.json({ deviceClusters, ipClusters })
})
