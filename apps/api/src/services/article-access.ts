import type { Db } from 'mongodb'

export async function canReadArticle(mongo: Db, article: any, userId?: string): Promise<boolean> {
  const accessType = article.accessType || 'free'
  if (accessType === 'free') return true
  if (!userId) return false
  if (userId === article.authorId) return true

  const payments = mongo.collection<any>('accessPayments')
  if (accessType === 'one_time') {
    return !!await payments.findOne({ buyerId: userId, articleId: article.id, purpose: 'article' })
  }

  return !!await payments.findOne({
    buyerId: userId,
    authorId: article.authorId,
    purpose: 'subscription',
    expiresAt: { $gt: new Date() },
  })
}

export function articlePreview(body: string, maxLength = 360): string {
  const preview = body.trim().slice(0, maxLength).trim()
  return `${preview}${body.trim().length > maxLength ? '…' : ''}`
}
