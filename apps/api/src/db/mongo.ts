import { GridFSBucket, MongoClient, type Db } from 'mongodb'

let client: MongoClient | null = null
let database: Db | null = null
let uploads: GridFSBucket | null = null

export async function connectMongo(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI
  if (!uri) return null

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 })
  try {
    await client.connect()
  } catch (error) {
    await client.close().catch(() => undefined)
    client = null
    throw error
  }
  database = client.db(process.env.MONGODB_DATABASE || 'nimink')
  uploads = new GridFSBucket(database, { bucketName: 'articleImages' })

  await Promise.all([
    database.collection('users').createIndex({ address: 1 }, { unique: true }),
    database.collection('users').createIndex({ id: 1 }, { unique: true }),
    database.collection('articles').createIndex({ id: 1 }, { unique: true }),
    database.collection('articles').createIndex({ status: 1, createdAt: -1 }),
    database.collection('articles').createIndex({ authorId: 1, status: 1, createdAt: -1 }),
    database.collection('requests').createIndex({ id: 1 }, { unique: true }),
    database.collection('requests').createIndex({ status: 1, createdAt: -1 }),
    database.collection('requests').createIndex({ requesterId: 1, createdAt: -1 }),
    database.collection('submissions').createIndex({ id: 1 }, { unique: true }),
    database.collection('submissions').createIndex({ requestId: 1, authorId: 1 }, { unique: true }),
    database.collection('tips').createIndex({ txHash: 1 }, { unique: true }),
    database.collection('tips').createIndex({ articleId: 1, status: 1, createdAt: -1 }),
    database.collection('tips').createIndex({ recipientId: 1, createdAt: -1 }),
    database.collection('txReceipts').createIndex({ txHash: 1 }, { unique: true }),
    database.collection('accessPayments').createIndex({ txHash: 1 }, { unique: true }),
    database.collection('accessPayments').createIndex({ buyerId: 1, authorId: 1, purpose: 1, expiresAt: 1 }),
    database.collection('accessPayments').createIndex({ authorId: 1, createdAt: -1 }),
    database.collection('authChallenges').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection('articleReads').createIndex({ articleId: 1, userId: 1 }, { unique: true }),
    database.collection('readSessions').createIndex({ id: 1 }, { unique: true }),
    database.collection('readSessions').createIndex({ articleId: 1 }),
    database.collection('readSessions').createIndex({ userId: 1 }),
    database.collection('pools').createIndex({ distributed: 1, createdAt: -1 }),
    database.collection('payouts').createIndex({ id: 1 }, { unique: true }),
    database.collection('payouts').createIndex({ poolId: 1 }),
    database.collection('reports').createIndex({ id: 1 }, { unique: true }),
    database.collection('reports').createIndex({ status: 1, createdAt: -1 }),
    database.collection('reports').createIndex({ targetType: 1, targetId: 1 }),
    database.collection('notifications').createIndex({ txHash: 1 }, { unique: true }),
    database.collection('notifications').createIndex({ userId: 1, createdAt: -1 }),
    database.collection('demoAccounts').createIndex({ address: 1 }, { unique: true }),
    database.collection('demoTransactions').createIndex({ txHash: 1 }, { unique: true }),
    database.collection('demoStakes').createIndex({ id: 1 }, { unique: true }),
    database.collection('demoStakes').createIndex({ userId: 1, createdAt: -1 }),
    database.collection('validators').createIndex({ id: 1 }, { unique: true }),
    database.collection('validators').createIndex({ address: 1 }, { unique: true }),
    database.collection('demoConfig').createIndex({ id: 1 }, { unique: true }),
    database.collection('paymentIntents').createIndex({ id: 1 }, { unique: true }),
    database.collection('paymentIntents').createIndex({ reference: 1 }, { unique: true }),
    database.collection('paymentIntents').createIndex(
      { userId: 1, purpose: 1, resourceId: 1, status: 1, expiresAt: 1 },
    ),
  ])

  return database
}

export function getMongoDb(): Db | null {
  return database
}

export function getUploadsBucket(): GridFSBucket | null {
  return uploads
}

export async function closeMongo(): Promise<void> {
  if (client) await client.close()
  client = null
  database = null
  uploads = null
}
