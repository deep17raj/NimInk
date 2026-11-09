import { v4 as uuid } from 'uuid'
import { db } from '../index.js'
import { getMongoDb } from '../db/mongo.js'

export async function createPaymentNotification(input: {
  userId: string; actorId: string; type: 'tip' | 'subscription' | 'article_purchase'
  articleId?: string | null; amountLuna: number; txHash: string; createdAt?: Date
}) {
  const id = uuid()
  const createdAt = input.createdAt || new Date()
  const row = { id, userId: input.userId, actorId: input.actorId, type: input.type,
    articleId: input.articleId || null, amountLuna: input.amountLuna, txHash: input.txHash, createdAt }
  const mongo = getMongoDb()
  if (mongo) {
    await mongo.collection('notifications').updateOne({ txHash: input.txHash }, { $setOnInsert: row }, { upsert: true })
  }
  db.prepare(`INSERT OR IGNORE INTO notifications
    (id, user_id, actor_id, type, article_id, amount_luna, tx_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.userId, input.actorId, input.type, input.articleId || null, input.amountLuna, input.txHash, createdAt.toISOString())
}
