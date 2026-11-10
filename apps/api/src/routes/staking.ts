import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { MIN_STAKE_LUNA } from '@nimink/shared'
import { getMongoDb } from '../db/mongo.js'
import { requireAuth, getAuth } from '../middleware/auth.js'

export const stakingRoutes = new Hono()

// Official Nimiq validators API (https://github.com/nimiq/validators-api)
const VALIDATORS_API_URL = process.env.NIMIQ_VALIDATORS_API_URL || 'https://validators-api-main.je-cf9.workers.dev/api/v1/validators'
const SYNC_TTL_MS = 10 * 60 * 1000
let lastSync = 0

async function syncOfficialValidators(mongo: NonNullable<ReturnType<typeof getMongoDb>>) {
  if (Date.now() - lastSync < SYNC_TTL_MS) return
  try {
    const res = await fetch(VALIDATORS_API_URL, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const list = (await res.json()) as any[]
    const col = mongo.collection<any>('validators')
    for (const v of list) {
      if (!v.isListed || !v.address || typeof v.fee !== 'number') continue
      await col.updateOne(
        { address: v.address },
        {
          $set: {
            name: v.name,
            fee: v.fee,
            payoutType: v.payoutType === 'restake' ? 'restake' : 'direct',
            trustScore: v.score?.total ?? 0,
          },
          $setOnInsert: { id: uuid(), address: v.address },
        },
        { upsert: true },
      )
    }
    lastSync = Date.now()
  } catch (err) {
    console.warn('Could not sync validators from official API, using stored list:', err)
  }
}

stakingRoutes.get('/validators', async (c) => {
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  await syncOfficialValidators(mongo)
  const rows = await mongo.collection<any>('validators').find({}).sort({ trustScore: -1 }).toArray()
  return c.json({
    validators: rows.map((v) => ({
      id: v.id,
      name: v.name,
      address: v.address,
      fee: v.fee,
      payoutType: v.payoutType,
      trustScore: v.trustScore,
    })),
  })
})

stakingRoutes.get('/my-stakes', requireAuth, async (c) => {
  const auth = getAuth(c)
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const rows = await mongo.collection<any>('demoStakes').find({ userId: auth.userId }).sort({ createdAt: -1 }).toArray()
  const validators = await mongo.collection<any>('validators').find({ id: { $in: rows.map((s) => s.validatorId) } }).toArray()
  const namesById = new Map(validators.map((v) => [v.id, v.name]))

  return c.json({
    stakes: rows.map((s) => ({
      id: s.id,
      validatorId: s.validatorId,
      validatorName: namesById.get(s.validatorId) || s.validatorId,
      amountLuna: s.amountLuna,
      status: s.status,
      rewardsLuna: s.rewardsLuna || 0,
      createdAt: new Date(s.createdAt).toISOString(),
    })),
  })
})

stakingRoutes.post('/stake', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { validatorId, amountLuna, txHash } = await c.req.json()

  if (!validatorId || !amountLuna || !txHash) {
    return c.json({ error: 'Missing required fields', code: 'INVALID_INPUT' }, 400)
  }

  if (amountLuna < MIN_STAKE_LUNA) {
    return c.json({ error: `Minimum stake is ${MIN_STAKE_LUNA / 100000} NIM`, code: 'BELOW_MINIMUM' }, 400)
  }

  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const validator = await mongo.collection<any>('validators').findOne({ id: validatorId })
  if (!validator) return c.json({ error: 'Validator not found', code: 'NOT_FOUND' }, 404)

  // Verify the demo staking transaction
  const demoTx = await mongo.collection<any>('demoTransactions').findOne({ txHash, status: 'confirmed' })
  if (!demoTx) {
    return c.json({ error: 'Transaction not found or not confirmed', code: 'TX_NOT_FOUND' }, 400)
  }

  const stakeId = uuid()
  await mongo.collection('demoStakes').insertOne({
    id: stakeId, userId: auth.userId, validatorId, amountLuna, txHash,
    status: 'active', rewardsLuna: 0, createdAt: new Date(),
  })

  return c.json({ stakeId }, 201)
})

stakingRoutes.post('/accrue-rewards', requireAuth, async (c) => {
  // Demo only: accrue simulated rewards
  const auth = getAuth(c)
  const mongo = getMongoDb()
  if (!mongo) return c.json({ error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' }, 503)

  const stakes = await mongo.collection<any>('demoStakes').find({ userId: auth.userId, status: 'active' }).toArray()

  let totalAccrued = 0
  for (const stake of stakes) {
    // ~5% annual rate, applied per "day" of fast-forward
    const dailyRate = 0.05 / 365
    const reward = Math.floor(stake.amountLuna * dailyRate)
    if (reward > 0) {
      await mongo.collection('demoStakes').updateOne({ id: stake.id }, { $inc: { rewardsLuna: reward } })
      totalAccrued += reward
    }
  }

  return c.json({ accruedLuna: totalAccrued })
})
