import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { estimateReadTimeMinutes } from '@nimink/shared'
import { getMongoDb, getUploadsBucket } from '../db/mongo.js'
import { verifyToken } from '../middleware/auth.js'
import { requireAuth, getAuth } from '../middleware/auth.js'
import { articlePreview, canReadArticle } from '../services/article-access.js'

export const articleRoutes = new Hono()

articleRoutes.post('/upload', requireAuth, async (c) => {
  const form = await c.req.parseBody()
  const file = form.image as any
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    return c.json({ error: 'Choose an image to upload', code: 'IMAGE_REQUIRED' }, 400)
  }

  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  const extension = extensions[file.type]
  if (!extension) return c.json({ error: 'Use a JPG, PNG, WebP, or GIF image', code: 'INVALID_IMAGE_TYPE' }, 400)
  if (file.size > 8 * 1024 * 1024) return c.json({ error: 'Images must be 8 MB or smaller', code: 'IMAGE_TOO_LARGE' }, 400)

  const mongo = getMongoDb()
  const bucket = getUploadsBucket()
  if (!mongo || !bucket) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const filename = `${uuid()}${extension}`
  const imageBytes = Buffer.from(await file.arrayBuffer())
  const uploaded = bucket.openUploadStream(filename, {
    metadata: { contentType: file.type, ownerId: getAuth(c).userId },
  })
  await new Promise<void>((resolve, reject) => {
    uploaded.once('finish', () => resolve())
    uploaded.once('error', reject)
    uploaded.end(imageBytes)
  })
  return c.json({ url: `/uploads/${uploaded.id.toString()}` }, 201)
})

articleRoutes.get('/', async (c) => {
  const tab = c.req.query('tab') || 'latest'
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)
  const offset = Number(c.req.query('offset')) || 0

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const collection = mongo.collection<any>('articles')
  const query: any = { status: 'published' }
  if (tab === 'requested') {
    const submitted = await mongo.collection<any>('submissions').distinct('articleId')
    query.id = { $in: submitted }
  }
  const sort: Record<string, 1 | -1> = tab === 'top_tipped'
    ? { totalTipsLuna: -1, createdAt: -1 }
    : tab === 'popular'
      ? { verifiedReadCount: -1, createdAt: -1 }
      : { createdAt: -1 }
  const rows = await collection.find(query).sort(sort).skip(offset).limit(limit).toArray()
  const users = await mongo.collection<any>('users').find({ id: { $in: rows.map((row) => row.authorId) } }).toArray()
  const usersById = new Map(users.map((user) => [user.id, user]))
  const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
  const articles = await Promise.all(rows.map(async (row) => {
    const accessGranted = await canReadArticle(mongo, row, auth?.userId)
    return mapMongoArticle(row, usersById.get(row.authorId), accessGranted ? row.body : articlePreview(row.body), accessGranted)
  }))
  return c.json({ articles })
})

articleRoutes.get('/:id', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const row = await mongo.collection<any>('articles').findOne({ id: c.req.param('id') })
  if (!row || row.status === 'hidden') return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
  if (row.status !== 'published') {
    const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
    if (auth?.userId !== row.authorId) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
  }
  const user = await mongo.collection<any>('users').findOne({ id: row.authorId })
  const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
  const accessGranted = await canReadArticle(mongo, row, auth?.userId)
  return c.json({ article: mapMongoArticle(row, user, accessGranted ? row.body : articlePreview(row.body), accessGranted) })
})

articleRoutes.post('/', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { title, body, tags, quizJson, status, accessType: requestedAccessType, priceLuna: requestedPriceLuna } = await c.req.json()

  if (!title?.trim() || !body?.trim()) {
    return c.json({ error: 'Title and body are required', code: 'INVALID_INPUT' }, 400)
  }

  const wordCount = body.trim().split(/\s+/).length
  const readTime = estimateReadTimeMinutes(wordCount)
  const id = uuid()
  const articleStatus = status === 'published' ? 'published' : 'draft'
  const accessType = ['free', 'subscription', 'one_time'].includes(requestedAccessType) ? requestedAccessType : 'free'
  const priceLuna = accessType === 'one_time' ? Number(requestedPriceLuna) : 0
  if (accessType === 'one_time' && (!Number.isSafeInteger(priceLuna) || priceLuna < 1_000)) {
    return c.json({ error: 'Set an individual price of at least 0.01 NIM', code: 'INVALID_PRICE' }, 400)
  }
  if (requestedAccessType && !['free', 'subscription', 'one_time'].includes(requestedAccessType)) {
    return c.json({ error: 'Invalid article access option', code: 'INVALID_ACCESS_TYPE' }, 400)
  }

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const now = new Date()
  const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
  if (!user) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
  if (articleStatus === 'published' && accessType === 'subscription' && !(user.subscriptionPriceLuna > 0)) {
    return c.json({ error: 'Set your author subscription price before publishing subscriber-only articles', code: 'SUBSCRIPTION_PRICE_REQUIRED' }, 400)
  }
  const article = {
    id, authorId: auth.userId, title: title.trim(), body: body.trim(), tags: tags || [], wordCount,
    readTimeMinutes: readTime, quizJson: quizJson || null, status: articleStatus,
    accessType, priceLuna,
    createdAt: now, updatedAt: now, totalTipsLuna: 0, verifiedReadCount: 0,
  }
  await mongo.collection('articles').insertOne(article)
  return c.json({ article: mapMongoArticle(article, user) }, 201)
})

articleRoutes.put('/:id', requireAuth, async (c) => {
  const auth = getAuth(c)
  const id = c.req.param('id')
  const { title, body, tags, quizJson, status, accessType: requestedAccessType, priceLuna: requestedPriceLuna } = await c.req.json()

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const article = await mongo.collection<any>('articles').findOne({ id, authorId: auth.userId })
  if (!article) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
  const newBody = body?.trim() || article.body
  const wordCount = newBody.split(/\s+/).length
  const newStatus = status || article.status
  const newAccessType = requestedAccessType || article.accessType || 'free'
  const newPriceLuna = newAccessType === 'one_time'
    ? Number(requestedPriceLuna ?? article.priceLuna)
    : 0
  if (!['free', 'subscription', 'one_time'].includes(newAccessType)) {
    return c.json({ error: 'Invalid article access option', code: 'INVALID_ACCESS_TYPE' }, 400)
  }
  if (newAccessType === 'one_time' && (!Number.isSafeInteger(newPriceLuna) || newPriceLuna < 1_000)) {
    return c.json({ error: 'Set an individual price of at least 0.01 NIM', code: 'INVALID_PRICE' }, 400)
  }
  const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
  if (newStatus === 'published' && newAccessType === 'subscription' && !(user?.subscriptionPriceLuna > 0)) {
    return c.json({ error: 'Set your author subscription price before publishing subscriber-only articles', code: 'SUBSCRIPTION_PRICE_REQUIRED' }, 400)
  }
  const update = {
    title: title?.trim() || article.title,
    body: newBody,
    tags: tags || article.tags,
    wordCount,
    readTimeMinutes: estimateReadTimeMinutes(wordCount),
    quizJson: quizJson || article.quizJson,
    status: newStatus,
    accessType: newAccessType,
    priceLuna: newPriceLuna,
    updatedAt: new Date(),
  }
  await mongo.collection('articles').updateOne({ id }, { $set: update })
  const updated = { ...article, ...update }
  return c.json({ article: mapMongoArticle(updated, user) })
})

articleRoutes.get('/user/:userId', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const rows = await mongo.collection<any>('articles')
    .find({ authorId: c.req.param('userId'), status: 'published' }).sort({ createdAt: -1 }).toArray()
  const user = await mongo.collection<any>('users').findOne({ id: c.req.param('userId') })
  const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
  const articles = await Promise.all(rows.map(async (row) => {
    const accessGranted = await canReadArticle(mongo, row, auth?.userId)
    return mapMongoArticle(row, user, accessGranted ? row.body : articlePreview(row.body), accessGranted)
  }))
  return c.json({ articles })
})

function mapMongoArticle(row: any, user: any, body = row.body, accessGranted = true) {
  const accessType = row.accessType || 'free'
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: user?.displayName || row.authorId,
    authorAddress: user?.address || '',
    title: row.title,
    body,
    tags: row.tags || [],
    wordCount: row.wordCount,
    readTimeMinutes: row.readTimeMinutes,
    quizJson: row.quizJson || null,
    status: row.status,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    totalTipsLuna: row.totalTipsLuna || 0,
    verifiedReadCount: row.verifiedReadCount || 0,
    accessType,
    priceLuna: row.priceLuna || 0,
    authorSubscriptionPriceLuna: user?.subscriptionPriceLuna || 0,
    accessGranted,
    locked: accessType !== 'free' && !accessGranted,
  }
}
