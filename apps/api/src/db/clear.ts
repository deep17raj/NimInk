import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI is required to clear the database')

const databaseName = process.env.MONGODB_DATABASE || 'nimink'
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 })

console.log(`Clearing all data from "${databaseName}"...`)

await client.connect()
const db = client.db(databaseName)

const collections = [
  'articles', 'users', 'tips', 'requests', 'submissions', 'reports',
  'articleReads', 'readSessions', 'pools', 'payouts', 'notifications',
  'demoAccounts', 'demoTransactions', 'demoStakes', 'authChallenges',
  'accessPayments', 'txReceipts', 'paymentIntents', 'validators',
]

for (const name of collections) {
  const { deletedCount } = await db.collection(name).deleteMany({})
  console.log(`  ${name}: ${deletedCount} removed`)
}
await db.collection('demoConfig').updateOne({ id: 'timeOffset' }, { $set: { offsetSeconds: 0 } }, { upsert: true })

console.log('Database cleared. Run `npm run seed` only if you want demo accounts/validators back for local testing.')

await client.close()
process.exit(0)
