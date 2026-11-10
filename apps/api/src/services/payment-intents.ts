import { randomBytes } from 'node:crypto'
import { v4 as uuid } from 'uuid'
import type { Db } from 'mongodb'

export type PaymentPurpose = 'tip' | 'article' | 'subscription' | 'request'

export interface PaymentIntent {
  id: string
  userId: string
  purpose: PaymentPurpose
  resourceId: string
  recipient: string
  amountLuna: number
  reference: string
  network: string
  status: 'pending' | 'paid'
  txHash: string | null
  createdAt: Date
  expiresAt: Date
  paidAt?: Date
}

// No 0/O/1/I so a reference stays readable if someone has to type it by hand.
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function intentTtlMs() {
  const minutes = Number.parseInt(process.env.PAYMENT_INTENT_TTL_MIN || '', 10)
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 60) * 60_000
}

export function currentNetwork() {
  return process.env.NIMIQ_NETWORK === 'testnet' ? 'testnet' : 'mainnet'
}

/**
 * A short unguessable code the wallet writes into the transaction's data
 * field. This is what ties an anonymous on-chain payment back to one user
 * and one thing they are paying for — the sender address cannot do that,
 * because Nimiq Pay sends from whichever account is active in the wallet,
 * not necessarily the account used to sign in.
 */
export function generateReference() {
  // 32 divides 256 evenly, so taking each byte mod 32 stays uniform.
  const bytes = randomBytes(12)
  let code = ''
  for (const byte of bytes) code += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]
  return `NIM-${code}`
}

export async function createPaymentIntent(mongo: Db, input: {
  userId: string
  purpose: PaymentPurpose
  resourceId: string
  recipient: string
  amountLuna: number
}): Promise<PaymentIntent> {
  const intents = mongo.collection<any>('paymentIntents')
  const now = new Date()

  // Reuse a fresh pending intent for the same thing so tapping "pay" twice
  // doesn't strand the first reference.
  const existing = await intents.findOne({
    userId: input.userId,
    purpose: input.purpose,
    resourceId: input.resourceId,
    recipient: input.recipient,
    amountLuna: input.amountLuna,
    status: 'pending',
    expiresAt: { $gt: now },
  })
  if (existing) return existing as PaymentIntent

  const intent: PaymentIntent = {
    id: uuid(),
    userId: input.userId,
    purpose: input.purpose,
    resourceId: input.resourceId,
    recipient: input.recipient,
    amountLuna: input.amountLuna,
    reference: generateReference(),
    network: currentNetwork(),
    status: 'pending',
    txHash: null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + intentTtlMs()),
  }
  await intents.insertOne(intent)
  return intent
}

/**
 * Looks up an intent that belongs to this user and this resource. Returns
 * null when the client sent no intent id (older clients / demo mode), in
 * which case the caller falls back to sender matching.
 */
export async function findPaymentIntent(mongo: Db, input: {
  intentId: unknown
  userId: string
  purpose: PaymentPurpose
  resourceId: string
}): Promise<PaymentIntent | null> {
  if (typeof input.intentId !== 'string' || !input.intentId) return null
  const intent = await mongo.collection<any>('paymentIntents').findOne({
    id: input.intentId,
    userId: input.userId,
    purpose: input.purpose,
    resourceId: input.resourceId,
  })
  return (intent as PaymentIntent) || null
}

export async function markIntentPaid(mongo: Db, intentId: string, txHash: string) {
  await mongo.collection('paymentIntents').updateOne(
    { id: intentId, status: 'pending' },
    { $set: { status: 'paid', txHash, paidAt: new Date() } },
  )
}
