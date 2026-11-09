import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { estimateReadTimeMinutes } from '@nimink/shared'
import { db } from '../index.js'
import { getMongoDb, getUploadsBucket } from '../db/mongo.js'
import { verifyToken } from '../middleware/auth.js'
import { requireAuth, getAuth } from '../middleware/auth.js'
import { articlePreview, canReadArticle, canReadSqlArticle } from '../services/article-access.js'

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
  if (mongo && bucket) {
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
  }

  const filename = `${uuid()}${extension}`
  const uploadDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))
  return c.json({ url: `/uploads/${filename}` }, 201)
})

articleRoutes.get('/', async (c) => {
  const tab = c.req.query('tab') || 'latest'
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)
  const offset = Number(c.req.query('offset')) || 0

  const mongo = getMongoDb()
  if (mongo) {
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
  }

  let rows: any[]
  if (tab === 'top_tipped') {
    rows = db.prepare(
      `SELECT a.*, u.display_name as author_name, u.address as author_address, u.subscription_price_luna as author_subscription_price_luna
       FROM articles a JOIN users u ON a.author_id = u.id
       WHERE a.status = 'published'
       ORDER BY a.total_tips_luna DESC, a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset)
  } else if (tab === 'popular') {
    rows = db.prepare(
      `SELECT a.*, u.display_name as author_name, u.address as author_address, u.subscription_price_luna as author_subscription_price_luna
       FROM articles a JOIN users u ON a.author_id = u.id
       WHERE a.status = 'published'
       ORDER BY a.verified_read_count DESC, a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset)
  } else if (tab === 'requested') {
    rows = db.prepare(
      `SELECT a.*, u.display_name as author_name, u.address as author_address, u.subscription_price_luna as author_subscription_price_luna
       FROM articles a JOIN users u ON a.author_id = u.id
       WHERE a.status = 'published'
       AND a.id IN (SELECT article_id FROM submissions)
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset)
  } else {
    rows = db.prepare(
      `SELECT a.*, u.display_name as author_name, u.address as author_address, u.subscription_price_luna as author_subscription_price_luna
       FROM articles a JOIN users u ON a.author_id = u.id
       WHERE a.status = 'published'
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset)
  }

  const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
  const articles = rows.map((row) => {
    const accessGranted = canReadSqlArticle(db, row, auth?.userId)
    return mapArticleRow(row, accessGranted)
  })
  return c.json({ articles })
})

articleRoutes.get('/:id', async (c) => {
  const mongo = getMongoDb()
  if (mongo) {
    const row = await mongo.collection<any>('articles').findOne({ id: c.req.param('id') })
    if (!row || row.status === 'hidden') return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
    if (row.status !== 'published') {
      const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
      if (auth?.userId !== row.authorId) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
    }
    const user = await mongo.collection<any>('users').findOne({ id: row.authorId })
    mirrorArticleToSql(row, user)
    const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
    const accessGranted = await canReadArticle(mongo, row, auth?.userId)
    return c.json({ article: mapMongoArticle(row, user, accessGranted ? row.body : articlePreview(row.body), accessGranted) })
  }
  const row = db.prepare(
    `SELECT a.*, u.display_name as author_name, u.address as author_address, u.subscription_price_luna as author_subscription_price_luna
     FROM articles a JOIN users u ON a.author_id = u.id
     WHERE a.id = ? AND a.status != 'hidden'`
  ).get(c.req.param('id')) as any

  if (!row) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
  const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
  return c.json({ article: mapArticleRow(row, canReadSqlArticle(db, row, auth?.userId)) })
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

  if (articleStatus === 'published' && !quizJson) {
    return c.json({ error: 'Published articles require a quiz question', code: 'QUIZ_REQUIRED' }, 400)
  }
  const mongo = getMongoDb()
  if (mongo) {
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
    mirrorArticleToSql(article, user)
    return c.json({ article: mapMongoArticle(article, user) }, 201)
  }

  if (articleStatus === 'published' && accessType === 'subscription') {
    const user = db.prepare('SELECT subscription_price_luna FROM users WHERE id = ?').get(auth.userId) as any
    if (!(user?.subscription_price_luna > 0)) {
      return c.json({ error: 'Set your author subscription price before publishing subscriber-only articles', code: 'SUBSCRIPTION_PRICE_REQUIRED' }, 400)
    }
  }

  db.prepare(
    `INSERT INTO articles (id, author_id, title, body, tags, word_count, read_time_minutes, quiz_json, status, access_type, price_luna)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, auth.userId, title.trim(), body.trim(), JSON.stringify(tags || []),
    wordCount, readTime, quizJson ? JSON.stringify(quizJson) : null, articleStatus, accessType, priceLuna)

  const row = db.prepare(
    `SELECT a.*, u.display_name as author_name, u.address as author_address, u.subscription_price_luna as author_subscription_price_luna
     FROM articles a JOIN users u ON a.author_id = u.id WHERE a.id = ?`
  ).get(id) as any

  return c.json({ article: mapArticleRow(row) }, 201)
})

articleRoutes.put('/:id', requireAuth, async (c) => {
  const auth = getAuth(c)
  const id = c.req.param('id')
  const existing = db.prepare('SELECT * FROM articles WHERE id = ? AND author_id = ?').get(id, auth.userId) as any
  if (!existing) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  const { title, body, tags, quizJson, status, accessType: requestedAccessType, priceLuna: requestedPriceLuna } = await c.req.json()

  const mongo = getMongoDb()
  if (mongo) {
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
    if (newStatus === 'published' && !quizJson && !article.quizJson) {
      return c.json({ error: 'Published articles require a quiz question', code: 'QUIZ_REQUIRED' }, 400)
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
    mirrorArticleToSql(updated, user)
    return c.json({ article: mapMongoArticle(updated, user) })
  }

  const newBody = body?.trim() || existing.body
  const wordCount = newBody.split(/\s+/).length
  const readTime = estimateReadTimeMinutes(wordCount)
  const newStatus = status || existing.status
  const newAccessType = requestedAccessType || existing.access_type || 'free'
  const newPriceLuna = newAccessType === 'one_time' ? Number(requestedPriceLuna ?? existing.price_luna) : 0
  if (!['free', 'subscription', 'one_time'].includes(newAccessType)) {
    return c.json({ error: 'Invalid article access option', code: 'INVALID_ACCESS_TYPE' }, 400)
  }
  if (newAccessType === 'one_time' && (!Number.isSafeInteger(newPriceLuna) || newPriceLuna < 1_000)) {
    return c.json({ error: 'Set an individual price of at least 0.01 NIM', code: 'INVALID_PRICE' }, 400)
  }

  if (newStatus === 'published' && !quizJson && !existing.quiz_json) {
    return c.json({ error: 'Published articles require a quiz question', code: 'QUIZ_REQUIRED' }, 400)
  }
  if (newStatus === 'published' && newAccessType === 'subscription') {
    const user = db.prepare('SELECT subscription_price_luna FROM users WHERE id = ?').get(auth.userId) as any
    if (!(user?.subscription_price_luna > 0)) {
      return c.json({ error: 'Set your author subscription price before publishing subscriber-only articles', code: 'SUBSCRIPTION_PRICE_REQUIRED' }, 400)
    }
  }

  db.prepare(
    `UPDATE articles SET title = ?, body = ?, tags = ?, word_count = ?, read_time_minutes = ?,
     quiz_json = ?, status = ?, access_type = ?, price_luna = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    title?.trim() || existing.title, newBody, JSON.stringify(tags || JSON.parse(existing.tags)),
    wordCount, readTime,
    quizJson ? JSON.stringify(quizJson) : existing.quiz_json,
    newStatus, newAccessType, newPriceLuna, id
  )

  const row = db.prepare(
    `SELECT a.*, u.display_name as author_name, u.address as author_address, u.subscription_price_luna as author_subscription_price_luna
     FROM articles a JOIN users u ON a.author_id = u.id WHERE a.id = ?`
  ).get(id) as any

  return c.json({ article: mapArticleRow(row) })
})

articleRoutes.get('/user/:userId', async (c) => {
  const mongo = getMongoDb()
  if (mongo) {
    const rows = await mongo.collection<any>('articles')
      .find({ authorId: c.req.param('userId'), status: 'published' }).sort({ createdAt: -1 }).toArray()
    const user = await mongo.collection<any>('users').findOne({ id: c.req.param('userId') })
    const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
    const articles = await Promise.all(rows.map(async (row) => {
      const accessGranted = await canReadArticle(mongo, row, auth?.userId)
      return mapMongoArticle(row, user, accessGranted ? row.body : articlePreview(row.body), accessGranted)
    }))
    return c.json({ articles })
  }
  const rows = db.prepare(
    `SELECT a.*, u.display_name as author_name, u.address as author_address, u.subscription_price_luna as author_subscription_price_luna
     FROM articles a JOIN users u ON a.author_id = u.id
     WHERE a.author_id = ? AND a.status = 'published'
     ORDER BY a.created_at DESC`
  ).all(c.req.param('userId')) as any[]

  const auth = verifyToken(c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '')
  return c.json({ articles: rows.map((row) => mapArticleRow(row, canReadSqlArticle(db, row, auth?.userId))) })
})

function mapArticleRow(row: any, accessGranted = true) {
  const accessType = row.access_type || 'free'
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAddress: row.author_address,
    title: row.title,
    body: accessGranted || accessType === 'free' ? row.body : articlePreview(row.body),
    tags: JSON.parse(row.tags || '[]'),
    wordCount: row.word_count,
    readTimeMinutes: row.read_time_minutes,
    quizJson: row.quiz_json ? JSON.parse(row.quiz_json) : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalTipsLuna: row.total_tips_luna,
    verifiedReadCount: row.verified_read_count,
    accessType,
    priceLuna: row.price_luna || 0,
    authorSubscriptionPriceLuna: row.author_subscription_price_luna || 0,
    accessGranted: accessGranted || accessType === 'free',
    locked: accessType !== 'free' && !accessGranted,
  }
}

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

function mirrorArticleToSql(row: any, user: any) {
  if (!user) return
  db.prepare('INSERT OR IGNORE INTO users (id, address, display_name, bio, subscription_price_luna) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, user.address, user.displayName || '', user.bio || '', user.subscriptionPriceLuna || 0)
  db.prepare(`INSERT OR IGNORE INTO articles
    (id, author_id, title, body, tags, word_count, read_time_minutes, quiz_json, status, total_tips_luna, verified_read_count, access_type, price_luna)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(row.id, row.authorId, row.title, row.body, JSON.stringify(row.tags || []), row.wordCount,
      row.readTimeMinutes, row.quizJson ? JSON.stringify(row.quizJson) : null, row.status,
      row.totalTipsLuna || 0, row.verifiedReadCount || 0, row.accessType || 'free', row.priceLuna || 0)
  db.prepare(`UPDATE articles SET title = ?, body = ?, tags = ?, word_count = ?, read_time_minutes = ?,
    quiz_json = ?, status = ?, total_tips_luna = ?, verified_read_count = ?, access_type = ?, price_luna = ?, updated_at = ? WHERE id = ?`)
    .run(row.title, row.body, JSON.stringify(row.tags || []), row.wordCount, row.readTimeMinutes,
      row.quizJson ? JSON.stringify(row.quizJson) : null, row.status, row.totalTipsLuna || 0,
      row.verifiedReadCount || 0, row.accessType || 'free', row.priceLuna || 0, new Date(row.updatedAt).toISOString(), row.id)
}
