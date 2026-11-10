import { v4 as uuid } from 'uuid'
import { getMongoDb } from '../db/mongo.js'

export async function createPaymentNotification(input: {
  userId: string; actorId: string; type: 'tip' | 'subscription' | 'article_purchase'
  articleId?: string | null; amountLuna: number; txHash: string; createdAt?: Date
}) {
  const mongo = getMongoDb()
  if (!mongo) return
  const row = { id: uuid(), userId: input.userId, actorId: input.actorId, type: input.type,
    articleId: input.articleId || null, amountLuna: input.amountLuna, txHash: input.txHash, createdAt: input.createdAt || new Date() }
  await mongo.collection('notifications').updateOne({ txHash: input.txHash }, { $setOnInsert: row }, { upsert: true })
}
