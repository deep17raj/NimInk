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

export function canReadSqlArticle(db: any, article: any, userId?: string): boolean {
  const accessType = article.access_type || 'free'
  if (accessType === 'free') return true
  if (!userId) return false
  if (userId === article.author_id) return true

  if (accessType === 'one_time') {
    return !!db.prepare("SELECT 1 FROM access_payments WHERE buyer_id = ? AND article_id = ? AND purpose = 'article'")
      .get(userId, article.id)
  }

  const subscription = db.prepare("SELECT expires_at FROM access_payments WHERE buyer_id = ? AND author_id = ? AND purpose = 'subscription' ORDER BY expires_at DESC LIMIT 1")
    .get(userId, article.author_id) as { expires_at?: string } | undefined
  return !!subscription?.expires_at && new Date(subscription.expires_at).getTime() > Date.now()
}

export function articlePreview(body: string, maxLength = 360): string {
  const preview = body.trim().slice(0, maxLength).trim()
  return `${preview}${body.trim().length > maxLength ? '…' : ''}`
}
