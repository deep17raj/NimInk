import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import dotenv from 'dotenv'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { ObjectId } from 'mongodb'
import type Database from 'better-sqlite3'
import { initializeDatabase } from './db/schema.js'
import { connectMongo, getMongoDb, getUploadsBucket } from './db/mongo.js'
import { authRoutes } from './routes/auth.js'
import { articleRoutes } from './routes/articles.js'
import { tipRoutes } from './routes/tips.js'
import { requestRoutes } from './routes/requests.js'
import { readRoutes } from './routes/reads.js'
import { earningsRoutes } from './routes/earnings.js'
import { stakingRoutes } from './routes/staking.js'
import { poolRoutes } from './routes/pool.js'
import { reportRoutes } from './routes/reports.js'
import { adminRoutes } from './routes/admin.js'
import { demoRoutes } from './routes/demo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

if (process.env.NODE_ENV === 'production' && (!process.env.MONGODB_URI || !process.env.JWT_SECRET)) {
  throw new Error('MONGODB_URI and JWT_SECRET must be configured in production')
}

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'nimink.db')
export const db: Database.Database = initializeDatabase(dbPath)
try {
  await connectMongo()
  console.log('MongoDB connected')
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error)
  console.error(`MongoDB unavailable; starting API without shared database: ${detail}`)
}

const mongoRetry = setInterval(() => {
  if (getMongoDb()) return
  void connectMongo()
    .then(() => console.log('MongoDB reconnected'))
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error)
      console.error(`MongoDB reconnect failed: ${detail}`)
    })
}, 30_000)
mongoRetry.unref()

export const app = new Hono()

app.use('*', logger())
app.use('/api/*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}))

app.route('/api/auth', authRoutes)
app.route('/api/articles', articleRoutes)
app.route('/api/tips', tipRoutes)
app.route('/api/requests', requestRoutes)
app.route('/api/reads', readRoutes)
app.route('/api/earnings', earningsRoutes)
app.route('/api/staking', stakingRoutes)
app.route('/api/pool', poolRoutes)
app.route('/api/reports', reportRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/demo', demoRoutes)

app.get('/api/health', (c) => c.json({
  ok: true,
  mode: process.env.VITE_WALLET_MODE || 'demo',
  database: getMongoDb() ? 'mongodb' : 'sqlite',
}))

if (getMongoDb()) {
  app.get('/uploads/:id', async (c) => {
    const mongo = getMongoDb()
    const bucket = getUploadsBucket()
    const id = c.req.param('id')
    if (mongo && bucket) {
    if (!ObjectId.isValid(id)) return c.json({ error: 'Image not found' }, 404)
    const file = await bucket.find({ _id: new ObjectId(id) }).next()
    if (!file) return c.json({ error: 'Image not found' }, 404)
    const stream = Readable.toWeb(bucket.openDownloadStream(file._id)) as ReadableStream
    return new Response(stream, {
      headers: {
        'Content-Type': file.metadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
    }
    return c.notFound()
  })
}

app.use('/uploads/*', serveStatic({ root: path.resolve(__dirname, '..') }))

const distPath = path.join(__dirname, '..', '..', 'web', 'dist')
app.use('/*', serveStatic({ root: distPath }))
app.get('/*', serveStatic({ root: distPath, path: 'index.html' }))

const port = Number(process.env.PORT) || 3001
console.log(`NimInk API starting on port ${port}`)

serve({ fetch: app.fetch, port })
