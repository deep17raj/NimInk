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
      : { createdAt: -1 }
    const rows = await collection.find(query).sort(sort).skip(offset).limit(limit).toArray()
    const users = await mongo.collection<any>('users').find({ id: { $in: rows.map((row) => row.authorId) } }).toArray()
    const usersById = new Map(users.map((user) => [user.id, user]))
    return c.json({ articles: rows.map((row) => mapMongoArticle(row, usersById.get(row.authorId))) })
  }

  let rows: any[]
  if (tab === 'top_tipped') {
    rows = db.prepare(
      `SELECT a.*, u.display_name as author_name, u.address as author_address
       FROM articles a JOIN users u ON a.author_id = u.id
       WHERE a.status = 'published'
       ORDER BY a.total_tips_luna DESC, a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset)
  } else if (tab === 'requested') {
    rows = db.prepare(
      `SELECT a.*, u.display_name as author_name, u.address as author_address
       FROM articles a JOIN users u ON a.author_id = u.id
       WHERE a.status = 'published'
       AND a.id IN (SELECT article_id FROM submissions)
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset)
  } else {
    rows = db.prepare(
      `SELECT a.*, u.display_name as author_name, u.address as author_address
       FROM articles a JOIN users u ON a.author_id = u.id
       WHERE a.status = 'published'
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset)
  }

  const articles = rows.map(mapArticleRow)
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
    return c.json({ article: mapMongoArticle(row, user) })
  }
  const row = db.prepare(
    `SELECT a.*, u.display_name as author_name, u.address as author_address
     FROM articles a JOIN users u ON a.author_id = u.id
     WHERE a.id = ? AND a.status != 'hidden'`
  ).get(c.req.param('id')) as any

  if (!row) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
  return c.json({ article: mapArticleRow(row) })
})

articleRoutes.post('/', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { title, body, tags, quizJson, status } = await c.req.json()

  if (!title?.trim() || !body?.trim()) {
    return c.json({ error: 'Title and body are required', code: 'INVALID_INPUT' }, 400)
  }

  const wordCount = body.trim().split(/\s+/).length
  const readTime = estimateReadTimeMinutes(wordCount)
  const id = uuid()
  const articleStatus = status === 'published' ? 'published' : 'draft'

  if (articleStatus === 'published' && !quizJson) {
    return c.json({ error: 'Published articles require a quiz question', code: 'QUIZ_REQUIRED' }, 400)
  }

  const mongo = getMongoDb()
  if (mongo) {
    const now = new Date()
    const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
    if (!user) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
    const article = {
      id, authorId: auth.userId, title: title.trim(), body: body.trim(), tags: tags || [], wordCount,
      readTimeMinutes: readTime, quizJson: quizJson || null, status: articleStatus,
      createdAt: now, updatedAt: now, totalTipsLuna: 0, verifiedReadCount: 0,
    }
    await mongo.collection('articles').insertOne(article)
    mirrorArticleToSql(article, user)
    return c.json({ article: mapMongoArticle(article, user) }, 201)
  }

  db.prepare(
    `INSERT INTO articles (id, author_id, title, body, tags, word_count, read_time_minutes, quiz_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, auth.userId, title.trim(), body.trim(), JSON.stringify(tags || []),
    wordCount, readTime, quizJson ? JSON.stringify(quizJson) : null, articleStatus)

  const row = db.prepare(
    `SELECT a.*, u.display_name as author_name, u.address as author_address
     FROM articles a JOIN users u ON a.author_id = u.id WHERE a.id = ?`
  ).get(id) as any

  return c.json({ article: mapArticleRow(row) }, 201)
})

articleRoutes.put('/:id', requireAuth, async (c) => {
  const auth = getAuth(c)
  const id = c.req.param('id')
  const existing = db.prepare('SELECT * FROM articles WHERE id = ? AND author_id = ?').get(id, auth.userId) as any
  if (!existing) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  const { title, body, tags, quizJson, status } = await c.req.json()

  const mongo = getMongoDb()
  if (mongo) {
    const article = await mongo.collection<any>('articles').findOne({ id, authorId: auth.userId })
    if (!article) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)
    const newBody = body?.trim() || article.body
    const wordCount = newBody.split(/\s+/).length
    const newStatus = status || article.status
    if (newStatus === 'published' && !quizJson && !article.quizJson) {
      return c.json({ error: 'Published articles require a quiz question', code: 'QUIZ_REQUIRED' }, 400)
    }
    const update = {
      title: title?.trim() || article.title,
      body: newBody,
      tags: tags || article.tags,
      wordCount,
      readTimeMinutes: estimateReadTimeMinutes(wordCount),
      quizJson: quizJson || article.quizJson,
      status: newStatus,
      updatedAt: new Date(),
    }
    await mongo.collection('articles').updateOne({ id }, { $set: update })
    const updated = { ...article, ...update }
    const user = await mongo.collection<any>('users').findOne({ id: auth.userId })
    mirrorArticleToSql(updated, user)
    return c.json({ article: mapMongoArticle(updated, user) })
  }

  const newBody = body?.trim() || existing.body
  const wordCount = newBody.split(/\s+/).length
  const readTime = estimateReadTimeMinutes(wordCount)
  const newStatus = status || existing.status

  if (newStatus === 'published' && !quizJson && !existing.quiz_json) {
    return c.json({ error: 'Published articles require a quiz question', code: 'QUIZ_REQUIRED' }, 400)
  }

  db.prepare(
    `UPDATE articles SET title = ?, body = ?, tags = ?, word_count = ?, read_time_minutes = ?,
     quiz_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    title?.trim() || existing.title, newBody, JSON.stringify(tags || JSON.parse(existing.tags)),
    wordCount, readTime,
    quizJson ? JSON.stringify(quizJson) : existing.quiz_json,
    newStatus, id
  )

  const row = db.prepare(
    `SELECT a.*, u.display_name as author_name, u.address as author_address
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
    return c.json({ articles: rows.map((row) => mapMongoArticle(row, user)) })
  }
  const rows = db.prepare(
    `SELECT a.*, u.display_name as author_name, u.address as author_address
     FROM articles a JOIN users u ON a.author_id = u.id
     WHERE a.author_id = ? AND a.status = 'published'
     ORDER BY a.created_at DESC`
  ).all(c.req.param('userId')) as any[]

  return c.json({ articles: rows.map(mapArticleRow) })
})

function mapArticleRow(row: any) {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAddress: row.author_address,
    title: row.title,
    body: row.body,
    tags: JSON.parse(row.tags || '[]'),
    wordCount: row.word_count,
    readTimeMinutes: row.read_time_minutes,
    quizJson: row.quiz_json ? JSON.parse(row.quiz_json) : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalTipsLuna: row.total_tips_luna,
    verifiedReadCount: row.verified_read_count,
  }
}

function mapMongoArticle(row: any, user: any) {
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: user?.displayName || row.authorId,
    authorAddress: user?.address || '',
    title: row.title,
    body: row.body,
    tags: row.tags || [],
    wordCount: row.wordCount,
    readTimeMinutes: row.readTimeMinutes,
    quizJson: row.quizJson || null,
    status: row.status,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    totalTipsLuna: row.totalTipsLuna || 0,
    verifiedReadCount: row.verifiedReadCount || 0,
  }
}

function mirrorArticleToSql(row: any, user: any) {
  if (!user) return
  db.prepare('INSERT OR IGNORE INTO users (id, address, display_name, bio) VALUES (?, ?, ?, ?)')
    .run(user.id, user.address, user.displayName || '', user.bio || '')
  db.prepare(`INSERT OR IGNORE INTO articles
    (id, author_id, title, body, tags, word_count, read_time_minutes, quiz_json, status, total_tips_luna, verified_read_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(row.id, row.authorId, row.title, row.body, JSON.stringify(row.tags || []), row.wordCount,
      row.readTimeMinutes, row.quizJson ? JSON.stringify(row.quizJson) : null, row.status,
      row.totalTipsLuna || 0, row.verifiedReadCount || 0)
  db.prepare(`UPDATE articles SET title = ?, body = ?, tags = ?, word_count = ?, read_time_minutes = ?,
    quiz_json = ?, status = ?, total_tips_luna = ?, verified_read_count = ?, updated_at = ? WHERE id = ?`)
    .run(row.title, row.body, JSON.stringify(row.tags || []), row.wordCount, row.readTimeMinutes,
      row.quizJson ? JSON.stringify(row.quizJson) : null, row.status, row.totalTipsLuna || 0,
      row.verifiedReadCount || 0, new Date(row.updatedAt).toISOString(), row.id)
}
