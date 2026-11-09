import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { MIN_STAKE_LUNA } from '@nimink/shared'
import { db } from '../index.js'
import { requireAuth, getAuth } from '../middleware/auth.js'

export const stakingRoutes = new Hono()

stakingRoutes.get('/validators', (c) => {
  const rows = db.prepare('SELECT * FROM validators ORDER BY trust_score DESC').all() as any[]
  return c.json({
    validators: rows.map((v) => ({
      id: v.id,
      name: v.name,
      address: v.address,
      fee: v.fee,
      payoutType: v.payout_type,
      trustScore: v.trust_score,
    })),
  })
})

stakingRoutes.get('/my-stakes', requireAuth, (c) => {
  const auth = getAuth(c)
  const rows = db.prepare(
    `SELECT ds.*, v.name as validator_name
     FROM demo_stakes ds JOIN validators v ON ds.validator_id = v.id
     WHERE ds.user_id = ? ORDER BY ds.created_at DESC`
  ).all(auth.userId) as any[]

  return c.json({
    stakes: rows.map((s) => ({
      id: s.id,
      validatorId: s.validator_id,
      validatorName: s.validator_name,
      amountLuna: s.amount_luna,
      status: s.status,
      rewardsLuna: s.rewards_luna,
      createdAt: s.created_at,
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

  const validator = db.prepare('SELECT * FROM validators WHERE id = ?').get(validatorId) as any
  if (!validator) return c.json({ error: 'Validator not found', code: 'NOT_FOUND' }, 404)

  // Verify the demo staking transaction
  const demoTx = db.prepare(
    "SELECT * FROM demo_transactions WHERE tx_hash = ? AND status = 'confirmed'"
  ).get(txHash) as any
  if (!demoTx) {
    return c.json({ error: 'Transaction not found or not confirmed', code: 'TX_NOT_FOUND' }, 400)
  }

  const stakeId = uuid()
  db.prepare(
    `INSERT INTO demo_stakes (id, user_id, validator_id, amount_luna, tx_hash)
     VALUES (?, ?, ?, ?, ?)`
  ).run(stakeId, auth.userId, validatorId, amountLuna, txHash)

  return c.json({ stakeId }, 201)
})

stakingRoutes.post('/accrue-rewards', requireAuth, async (c) => {
  // Demo only: accrue simulated rewards
  const auth = getAuth(c)

  const stakes = db.prepare(
    "SELECT * FROM demo_stakes WHERE user_id = ? AND status = 'active'"
  ).all(auth.userId) as any[]

  let totalAccrued = 0
  for (const stake of stakes) {
    // ~5% annual rate, applied per "day" of fast-forward
    const dailyRate = 0.05 / 365
    const reward = Math.floor(stake.amount_luna * dailyRate)
    if (reward > 0) {
      db.prepare('UPDATE demo_stakes SET rewards_luna = rewards_luna + ? WHERE id = ?')
        .run(reward, stake.id)
      totalAccrued += reward
    }
  }

  return c.json({ accruedLuna: totalAccrued })
})
