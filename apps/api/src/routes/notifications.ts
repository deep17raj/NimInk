import { Hono } from 'hono'
import { db } from '../index.js'
import { getMongoDb } from '../db/mongo.js'
import { getAuth, requireAuth } from '../middleware/auth.js'

export const notificationRoutes = new Hono()

notificationRoutes.get('/', requireAuth, async (c) => {
  const auth = getAuth(c)
  const mongo = getMongoDb()
  if (mongo) {
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
  }
  const rows = db.prepare(`SELECT n.*, u.display_name AS actor_name FROM notifications n
    JOIN users u ON u.id = n.actor_id WHERE n.user_id = ?
    ORDER BY n.created_at DESC LIMIT 50`).all(auth.userId) as any[]
  return c.json({ notifications: rows.map((row) => ({
    id: row.id, type: row.type, actorName: row.actor_name || row.actor_id,
    amountLuna: row.amount_luna, articleId: row.article_id,
    createdAt: row.created_at, read: !!row.read_at,
  })) })
})

notificationRoutes.post('/read', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { ids } = await c.req.json().catch(() => ({ ids: [] }))
  const mongo = getMongoDb()
  if (mongo) {
    await mongo.collection('notifications').updateMany(
      { userId: auth.userId, ...(Array.isArray(ids) && ids.length ? { id: { $in: ids } } : {}) },
      { $set: { readAt: new Date() } },
    )
  }
  if (Array.isArray(ids) && ids.length) {
    const placeholders = ids.map(() => '?').join(',')
    db.prepare(`UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND id IN (${placeholders})`)
      .run(auth.userId, ...ids)
  } else {
    db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").run(auth.userId)
  }
  return c.json({ ok: true })
})
