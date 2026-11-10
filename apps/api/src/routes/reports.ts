import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { getMongoDb } from '../db/mongo.js'
import { requireAuth, getAuth } from '../middleware/auth.js'

export const reportRoutes = new Hono()

reportRoutes.post('/', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { targetType, targetId, reason, details } = await c.req.json()

  if (!targetType || !targetId || !reason) {
    return c.json({ error: 'Missing required fields', code: 'INVALID_INPUT' }, 400)
  }

  const validReasons = ['illegal', 'hateful', 'sexual', 'scam', 'plagiarism', 'other']
  if (!validReasons.includes(reason)) {
    return c.json({ error: 'Invalid reason', code: 'INVALID_REASON' }, 400)
  }

  if (!['article', 'request'].includes(targetType)) {
    return c.json({ error: 'Invalid target type', code: 'INVALID_TARGET' }, 400)
  }

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const id = uuid()
  await mongo.collection('reports').insertOne({
    id, targetType, targetId, reporterId: auth.userId, reason,
    details: details || '', status: 'pending', createdAt: new Date(),
  })

  return c.json({ reportId: id }, 201)
})
