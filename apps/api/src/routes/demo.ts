import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { DEMO_INITIAL_BALANCE_LUNA, DEMO_FAUCET_AMOUNT_LUNA, DEMO_FAUCET_DAILY_LIMIT } from '@nimink/shared'
import { getMongoDb } from '../db/mongo.js'
import { requireAuth, getAuth } from '../middleware/auth.js'

export const demoRoutes = new Hono()

demoRoutes.use('*', async (c, next) => {
  if (process.env.NODE_ENV === 'production' || process.env.VITE_WALLET_MODE === 'nimiq') return c.notFound()
  await next()
})

demoRoutes.get('/accounts', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const rows = await mongo.collection<any>('demoAccounts').find({}).toArray()
  return c.json({
    accounts: rows.map((a) => ({
      address: a.address,
      displayName: a.displayName,
      balanceLuna: a.balanceLuna,
    })),
  })
})

demoRoutes.post('/accounts', async (c) => {
  const { displayName } = await c.req.json()
  const address = `NQ00 DEMO ${uuid().replace(/-/g, '').slice(0, 20).toUpperCase().replace(/(.{4})/g, '$1 ').trim()}`

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  await mongo.collection('demoAccounts').insertOne({
    address, displayName: displayName || 'Demo User', balanceLuna: DEMO_INITIAL_BALANCE_LUNA,
    faucetUsesToday: 0, faucetLastDate: null,
  })

  return c.json({ address, balanceLuna: DEMO_INITIAL_BALANCE_LUNA }, 201)
})

demoRoutes.post('/faucet', requireAuth, async (c) => {
  const auth = getAuth(c)
  const today = new Date().toISOString().slice(0, 10)

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const accounts = mongo.collection<any>('demoAccounts')
  const account = await accounts.findOne({ address: auth.address })
  if (!account) return c.json({ error: 'Demo account not found', code: 'NOT_FOUND' }, 404)

  if (account.faucetLastDate === today && (account.faucetUsesToday || 0) >= DEMO_FAUCET_DAILY_LIMIT) {
    return c.json({ error: 'Daily faucet limit reached', code: 'RATE_LIMIT' }, 429)
  }

  const newUses = account.faucetLastDate === today ? (account.faucetUsesToday || 0) + 1 : 1

  await accounts.updateOne(
    { address: auth.address },
    { $inc: { balanceLuna: DEMO_FAUCET_AMOUNT_LUNA }, $set: { faucetUsesToday: newUses, faucetLastDate: today } },
  )

  return c.json({
    balanceLuna: account.balanceLuna + DEMO_FAUCET_AMOUNT_LUNA,
    faucetUsesToday: newUses,
  })
})

demoRoutes.post('/send-payment', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { recipient, valueLuna, data } = await c.req.json()

  if (!recipient || !valueLuna || valueLuna <= 0) {
    return c.json({ error: 'Invalid payment', code: 'INVALID_INPUT' }, 400)
  }

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const accounts = mongo.collection<any>('demoAccounts')
  // Atomic compare-and-decrement: only debits if the balance still covers
  // the payment, so two concurrent spends can't overdraw the account.
  const debited = await accounts.findOneAndUpdate(
    { address: auth.address, balanceLuna: { $gte: valueLuna } },
    { $inc: { balanceLuna: -valueLuna } },
  )
  if (!debited) {
    const sender = await accounts.findOne({ address: auth.address })
    if (!sender) return c.json({ error: 'Sender account not found', code: 'NOT_FOUND' }, 404)
    return c.json({ error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' }, 400)
  }

  await accounts.updateOne({ address: recipient }, { $inc: { balanceLuna: valueLuna } })

  const txHash = `demo_${uuid()}`
  await mongo.collection('demoTransactions').insertOne({
    id: uuid(), fromAddress: auth.address, toAddress: recipient, valueLuna,
    data: data || null, txHash, status: 'confirmed', createdAt: new Date(),
  })

  return c.json({ txHash, status: 'confirmed' })
})

demoRoutes.post('/send-stake', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { validatorAddress, valueLuna } = await c.req.json()

  if (!validatorAddress || !valueLuna || valueLuna <= 0) {
    return c.json({ error: 'Invalid stake', code: 'INVALID_INPUT' }, 400)
  }

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const accounts = mongo.collection<any>('demoAccounts')
  const debited = await accounts.findOneAndUpdate(
    { address: auth.address, balanceLuna: { $gte: valueLuna } },
    { $inc: { balanceLuna: -valueLuna } },
  )
  if (!debited) {
    const sender = await accounts.findOne({ address: auth.address })
    if (!sender) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
    return c.json({ error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' }, 400)
  }

  const txHash = `demo_stake_${uuid()}`
  await mongo.collection('demoTransactions').insertOne({
    id: uuid(), fromAddress: auth.address, toAddress: validatorAddress, valueLuna,
    data: 'stake', txHash, status: 'confirmed', createdAt: new Date(),
  })

  return c.json({ txHash, status: 'confirmed' })
})

demoRoutes.get('/balance/:address', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const account = await mongo.collection<any>('demoAccounts').findOne({ address: c.req.param('address') })
  if (!account) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
  return c.json({ balanceLuna: account.balanceLuna })
})

demoRoutes.post('/time/fast-forward', async (c) => {
  const { days } = await c.req.json()
  const seconds = (days || 1) * 86400

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const config = mongo.collection<any>('demoConfig')
  await config.updateOne({ id: 'timeOffset' }, { $inc: { offsetSeconds: seconds } }, { upsert: true })
  const row = await config.findOne({ id: 'timeOffset' })
  return c.json({ offsetSeconds: row?.offsetSeconds || 0, offsetDays: (row?.offsetSeconds || 0) / 86400 })
})

demoRoutes.get('/time', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const row = await mongo.collection<any>('demoConfig').findOne({ id: 'timeOffset' })
  return c.json({ offsetSeconds: row?.offsetSeconds || 0, offsetDays: (row?.offsetSeconds || 0) / 86400 })
})

demoRoutes.post('/reset', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  await Promise.all([
    mongo.collection('demoTransactions').deleteMany({}),
    mongo.collection('demoStakes').deleteMany({}),
    mongo.collection('payouts').deleteMany({}),
    mongo.collection('pools').deleteMany({}),
    mongo.collection('articleReads').deleteMany({}),
    mongo.collection('readSessions').deleteMany({}),
    mongo.collection('tips').deleteMany({}),
    mongo.collection('submissions').deleteMany({}),
    mongo.collection('requests').deleteMany({}),
    mongo.collection('reports').deleteMany({}),
    mongo.collection('articles').deleteMany({}),
    mongo.collection('authChallenges').deleteMany({}),
    mongo.collection('users').deleteMany({}),
    mongo.collection('demoAccounts').deleteMany({}),
    mongo.collection('accessPayments').deleteMany({}),
    mongo.collection('txReceipts').deleteMany({}),
    mongo.collection('notifications').deleteMany({}),
    mongo.collection('demoConfig').updateOne({ id: 'timeOffset' }, { $set: { offsetSeconds: 0 } }, { upsert: true }),
  ])

  return c.json({ ok: true })
})
