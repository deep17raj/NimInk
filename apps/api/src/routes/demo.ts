import { Hono } from 'hono'
import { v4 as uuid } from 'uuid'
import { DEMO_INITIAL_BALANCE_LUNA, DEMO_FAUCET_AMOUNT_LUNA, DEMO_FAUCET_DAILY_LIMIT } from '@nimink/shared'
import { db } from '../index.js'
import { requireAuth, getAuth } from '../middleware/auth.js'

export const demoRoutes = new Hono()

demoRoutes.use('*', async (c, next) => {
  if (process.env.NODE_ENV === 'production' || process.env.VITE_WALLET_MODE === 'nimiq') return c.notFound()
  await next()
})

demoRoutes.get('/accounts', (c) => {
  const rows = db.prepare('SELECT * FROM demo_accounts').all() as any[]
  return c.json({
    accounts: rows.map((a) => ({
      address: a.address,
      displayName: a.display_name,
      balanceLuna: a.balance_luna,
    })),
  })
})

demoRoutes.post('/accounts', async (c) => {
  const { displayName } = await c.req.json()
  const address = `NQ00 DEMO ${uuid().replace(/-/g, '').slice(0, 20).toUpperCase().replace(/(.{4})/g, '$1 ').trim()}`

  db.prepare(
    'INSERT INTO demo_accounts (address, display_name, balance_luna) VALUES (?, ?, ?)'
  ).run(address, displayName || 'Demo User', DEMO_INITIAL_BALANCE_LUNA)

  return c.json({ address, balanceLuna: DEMO_INITIAL_BALANCE_LUNA }, 201)
})

demoRoutes.post('/faucet', requireAuth, async (c) => {
  const auth = getAuth(c)
  const today = new Date().toISOString().slice(0, 10)

  const account = db.prepare('SELECT * FROM demo_accounts WHERE address = ?').get(auth.address) as any
  if (!account) return c.json({ error: 'Demo account not found', code: 'NOT_FOUND' }, 404)

  if (account.faucet_last_date === today && account.faucet_uses_today >= DEMO_FAUCET_DAILY_LIMIT) {
    return c.json({ error: 'Daily faucet limit reached', code: 'RATE_LIMIT' }, 429)
  }

  const newUses = account.faucet_last_date === today ? account.faucet_uses_today + 1 : 1

  db.prepare(
    'UPDATE demo_accounts SET balance_luna = balance_luna + ?, faucet_uses_today = ?, faucet_last_date = ? WHERE address = ?'
  ).run(DEMO_FAUCET_AMOUNT_LUNA, newUses, today, auth.address)

  return c.json({
    balanceLuna: account.balance_luna + DEMO_FAUCET_AMOUNT_LUNA,
    faucetUsesToday: newUses,
  })
})

demoRoutes.post('/send-payment', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { recipient, valueLuna, data } = await c.req.json()

  if (!recipient || !valueLuna || valueLuna <= 0) {
    return c.json({ error: 'Invalid payment', code: 'INVALID_INPUT' }, 400)
  }

  const sender = db.prepare('SELECT * FROM demo_accounts WHERE address = ?').get(auth.address) as any
  if (!sender) return c.json({ error: 'Sender account not found', code: 'NOT_FOUND' }, 404)

  if (sender.balance_luna < valueLuna) {
    return c.json({ error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' }, 400)
  }

  const recipientAccount = db.prepare('SELECT * FROM demo_accounts WHERE address = ?').get(recipient) as any

  const txHash = `demo_${uuid()}`

  const txn = db.transaction(() => {
    db.prepare('UPDATE demo_accounts SET balance_luna = balance_luna - ? WHERE address = ?')
      .run(valueLuna, auth.address)

    if (recipientAccount) {
      db.prepare('UPDATE demo_accounts SET balance_luna = balance_luna + ? WHERE address = ?')
        .run(valueLuna, recipient)
    }

    db.prepare(
      `INSERT INTO demo_transactions (id, from_address, to_address, value_luna, data, tx_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
    ).run(uuid(), auth.address, recipient, valueLuna, data || null, txHash)
  })
  txn()

  return c.json({ txHash, status: 'confirmed' })
})

demoRoutes.post('/send-stake', requireAuth, async (c) => {
  const auth = getAuth(c)
  const { validatorAddress, valueLuna } = await c.req.json()

  if (!validatorAddress || !valueLuna || valueLuna <= 0) {
    return c.json({ error: 'Invalid stake', code: 'INVALID_INPUT' }, 400)
  }

  const sender = db.prepare('SELECT * FROM demo_accounts WHERE address = ?').get(auth.address) as any
  if (!sender) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
  if (sender.balance_luna < valueLuna) {
    return c.json({ error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' }, 400)
  }

  const txHash = `demo_stake_${uuid()}`

  db.prepare('UPDATE demo_accounts SET balance_luna = balance_luna - ? WHERE address = ?')
    .run(valueLuna, auth.address)

  db.prepare(
    `INSERT INTO demo_transactions (id, from_address, to_address, value_luna, data, tx_hash, status)
     VALUES (?, ?, ?, ?, 'stake', ?, 'confirmed')`
  ).run(uuid(), auth.address, validatorAddress, valueLuna, txHash)

  return c.json({ txHash, status: 'confirmed' })
})

demoRoutes.get('/balance/:address', (c) => {
  const account = db.prepare('SELECT * FROM demo_accounts WHERE address = ?').get(c.req.param('address')) as any
  if (!account) return c.json({ error: 'Account not found', code: 'NOT_FOUND' }, 404)
  return c.json({ balanceLuna: account.balance_luna })
})

demoRoutes.post('/time/fast-forward', async (c) => {
  const { days } = await c.req.json()
  const seconds = (days || 1) * 86400
  db.prepare('UPDATE demo_time_offset SET offset_seconds = offset_seconds + ? WHERE id = 1').run(seconds)

  const row = db.prepare('SELECT offset_seconds FROM demo_time_offset WHERE id = 1').get() as any
  return c.json({ offsetSeconds: row.offset_seconds, offsetDays: row.offset_seconds / 86400 })
})

demoRoutes.get('/time', (c) => {
  const row = db.prepare('SELECT offset_seconds FROM demo_time_offset WHERE id = 1').get() as any
  return c.json({ offsetSeconds: row.offset_seconds, offsetDays: row.offset_seconds / 86400 })
})

demoRoutes.post('/reset', async (c) => {
  const txn = db.transaction(() => {
    db.prepare('DELETE FROM demo_transactions').run()
    db.prepare('DELETE FROM demo_stakes').run()
    db.prepare('DELETE FROM payouts').run()
    db.prepare('DELETE FROM pools').run()
    db.prepare('DELETE FROM read_sessions').run()
    db.prepare('DELETE FROM tips').run()
    db.prepare('DELETE FROM submissions').run()
    db.prepare('DELETE FROM requests').run()
    db.prepare('DELETE FROM reports').run()
    db.prepare('DELETE FROM articles').run()
    db.prepare('DELETE FROM nonces').run()
    db.prepare('DELETE FROM users').run()
    db.prepare('DELETE FROM demo_accounts').run()
    db.prepare('UPDATE demo_time_offset SET offset_seconds = 0 WHERE id = 1').run()
  })
  txn()

  return c.json({ ok: true })
})
