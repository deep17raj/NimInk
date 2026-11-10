import { Hono } from 'hono'
import { getMongoDb } from '../db/mongo.js'
import { getAuth, requireAuth } from '../middleware/auth.js'

export const notificationRoutes = new Hono()

notificationRoutes.get('/', requireAuth, async (c) => {
  const auth = getAuth(c)
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const rows = await mongo.collection<any>('notifications').find({ userId: auth.userId })
    .sort({ createdAt: -1 }).limit(50).toArray()
  const actorIds = [...new Set(rows.map((row) => row.actorId))]
  const actors = await mongo.collection<any>('users').find({ id: { $in: actorIds } }).toArray()
  const names = new Map(actors.map((user) => [user.id, user.displayName || user.id]))
  return c.json({ notifications: rows.map((row) => ({
    id: row.id, type: row.type, actorName: names.get(row.actorId) || row.actorId,
    amountLuna: row.amountLuna, articleId: row.articleId || null,
    createdAt: new Date(row.createdAt).toISOString(), read: !!row.readAt,
  })) })
})

notificationRoutes.post('/read', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { ids } = await c.req.json().catch(() => ({ ids: [] }))
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  await mongo.collection('notifications').updateMany(
    { userId: auth.userId, ...(Array.isArray(ids) && ids.length ? { id: { $in: ids } } : {}) },
    { $set: { readAt: new Date() } },
  )
  return c.json({ ok: true })
})
