import { Address } from '@nimiq/core'

interface RpcTransaction {
  hash?: string
  transactionHash?: string
  from?: string
  fromAddress?: string
  sender?: string
  to?: string
  toAddress?: string
  recipient?: string
  value?: number | string
  executionResult?: boolean
  confirmations?: number
  blockHeight?: number
  recipientData?: string
  data?: string
}

export type NimiqPaymentCheck =
  | { status: 'confirmed' }
  | { status: 'pending'; reason: 'not_found' | 'awaiting_execution' | 'awaiting_confirmations' }
  | { status: 'invalid'; reason: 'transaction_failed' | 'wrong_hash' | 'wrong_sender' | 'wrong_recipient' | 'amount_too_low' | 'wrong_reference' }
  | { status: 'unavailable' }

/**
 * The RPC returns a transaction's data field hex-encoded. Decode it back to
 * the UTF-8 payment reference, trimming the trailing NUL padding some
 * wallets add.
 */
function decodeTransactionData(value?: string): string {
  if (!value || typeof value !== 'string') return ''
  const hex = value.replace(/^0x/i, '')
  if (!hex) return ''
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return value.trim()
  try {
    return Buffer.from(hex, 'hex').toString('utf8').replace(/\0+$/, '').trim()
  } catch {
    return ''
  }
}

function confirmationsRequired() {
  const configured = Number.parseInt(process.env.NIMIQ_MIN_CONFIRMATIONS || '', 10)
  return Number.isFinite(configured) && configured > 0 ? configured : 2
}

function normalizeHash(value: string) {
  return value.replace(/^0x/i, '').toLowerCase()
}

function normalizeAddress(value?: string) {
  if (!value || typeof value !== 'string') return null
  try {
    const address = /^NQ/i.test(value)
      ? Address.fromUserFriendlyAddress(value)
      : Address.fromAny(value.replace(/^0x/i, ''))
    return address.toHex().toLowerCase()
  } catch {
    return null
  }
}

async function rpcCall<T>(rpcUrl: string, headers: Record<string, string>, method: string, params: unknown[]) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error(`Nimiq RPC returned ${response.status}`)
  const payload = await response.json() as { result?: T | { data?: T | null } | null; error?: unknown }
  if (payload.error) throw new Error('Nimiq RPC returned an error')
  const result = payload.result
  if (result && typeof result === 'object' && 'data' in result) {
    if ('value' in result || 'from' in result || 'fromAddress' in result) return result as T
    return (result as { data?: T | null }).data ?? null
  }
  return result as T | null | undefined
}

export async function verifyNimiqPayment(
  hash: string,
  fromAddress: string,
  toAddress: string,
  valueLuna: number,
  expectedReference?: string,
): Promise<NimiqPaymentCheck> {
  const rpcUrl = process.env.NIMIQ_RPC_URL || 'https://rpc.nimiqwatch.com'

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.NIMIQ_RPC_USERNAME && process.env.NIMIQ_RPC_PASSWORD) {
      headers.Authorization = `Basic ${Buffer.from(`${process.env.NIMIQ_RPC_USERNAME}:${process.env.NIMIQ_RPC_PASSWORD}`).toString('base64')}`
    }

    const expectedHash = normalizeHash(hash)
    const expectedFrom = normalizeAddress(fromAddress)
    const expectedTo = normalizeAddress(toAddress)
    if (!expectedHash || !expectedFrom || !expectedTo) {
      return { status: 'invalid', reason: 'wrong_hash' }
    }

    const tx = await rpcCall<RpcTransaction>(rpcUrl, headers, 'getTransactionByHash', [expectedHash])
    if (!tx) return { status: 'pending', reason: 'not_found' }

    const transactionHash = tx.hash || tx.transactionHash
    if (transactionHash && normalizeHash(transactionHash) !== expectedHash) {
      return { status: 'invalid', reason: 'wrong_hash' }
    }
    if (tx.executionResult === false) return { status: 'invalid', reason: 'transaction_failed' }
    if (tx.executionResult !== true) return { status: 'pending', reason: 'awaiting_execution' }

    // Who paid is proven by the payment reference in the transaction's data
    // field, not by the sender address: Nimiq Pay signs with whichever
    // account is active in the wallet, which is often not the account the
    // user signed in with. Only fall back to sender matching when the client
    // sent no intent (demo mode / older clients).
    if (expectedReference) {
      const actualReference = decodeTransactionData(tx.recipientData ?? tx.data)
      if (actualReference !== expectedReference) {
        console.error('[verifyNimiqPayment] reference mismatch', { hash, expectedReference, actualReference })
        return { status: 'invalid', reason: 'wrong_reference' }
      }
    } else {
      const actualFrom = normalizeAddress(tx.fromAddress || tx.from || tx.sender)
      if (actualFrom !== expectedFrom) return { status: 'invalid', reason: 'wrong_sender' }
    }

    const actualTo = normalizeAddress(tx.toAddress || tx.to || tx.recipient)
    if (actualTo !== expectedTo) return { status: 'invalid', reason: 'wrong_recipient' }

    const actualValue = typeof tx.value === 'number' ? tx.value : Number(tx.value)
    if (!Number.isSafeInteger(actualValue) || actualValue < valueLuna) {
      return { status: 'invalid', reason: 'amount_too_low' }
    }

    let confirmations = Number(tx.confirmations)
    if (!Number.isFinite(confirmations) && Number.isFinite(tx.blockHeight)) {
      const headHeight = await rpcCall<number>(rpcUrl, headers, 'getBlockNumber', [])
      if (typeof headHeight === 'number' && Number.isFinite(headHeight)) {
        confirmations = headHeight - Number(tx.blockHeight) + 1
      }
    }
    if (!Number.isFinite(confirmations) || confirmations < confirmationsRequired()) {
      return { status: 'pending', reason: 'awaiting_confirmations' }
    }

    return { status: 'confirmed' }
  } catch (error) {
    console.error('[verifyNimiqPayment] RPC unavailable', error instanceof Error ? error.message : error)
    return { status: 'unavailable' }
  }
}
