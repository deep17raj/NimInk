import { Address } from '@nimiq/core'

interface VerifiedPayment {
  hash?: string
  from?: string
  fromAddress?: string
  to?: string
  toAddress?: string
  value: number
  executionResult?: boolean
}

export async function verifyNimiqPayment(hash: string, fromAddress: string, toAddress: string, valueLuna: number): Promise<boolean> {
  // The public RPC is convenient for local testing. Use a managed/private RPC
  // endpoint in production and point it at the same network as Nimiq Pay.
  const rpcUrl = process.env.NIMIQ_RPC_URL || 'https://rpc.nimiqwatch.com'

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.NIMIQ_RPC_USERNAME && process.env.NIMIQ_RPC_PASSWORD) {
      headers.Authorization = `Basic ${Buffer.from(`${process.env.NIMIQ_RPC_USERNAME}:${process.env.NIMIQ_RPC_PASSWORD}`).toString('base64')}`
    }
    const expectedFrom = Address.fromUserFriendlyAddress(fromAddress).toHex().toLowerCase()
    const expectedTo = Address.fromUserFriendlyAddress(toAddress).toHex().toLowerCase()
    const rpcHash = hash.replace(/^0x/i, '')

    const normalizeRpcAddress = (value?: string) => {
      if (!value) return null
      const address = /^NQ/i.test(value)
        ? Address.fromUserFriendlyAddress(value)
        : Address.fromAny(value.replace(/^0x/i, ''))
      return address.toHex().toLowerCase()
    }

    // A wallet can return as soon as a transaction is broadcast. Give the
    // block explorer/RPC a short window to index it before rejecting the tip.
    for (let attempt = 0; attempt < 8; attempt++) {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransactionByHash', params: [rpcHash] }),
        signal: AbortSignal.timeout(5_000),
      })
      if (response.ok) {
        const rpc = await response.json() as {
          result?: VerifiedPayment | { data?: VerifiedPayment | null } | null
          error?: unknown
        }
        const result = rpc.result
        // Nimiq PoS wraps RPC payloads in result.data; accept the legacy shape too.
        const tx = result && 'data' in result ? result.data : result as VerifiedPayment | null | undefined
        if (tx && !rpc.error) {
          const sameHash = !tx.hash || tx.hash.replace(/^0x/i, '').toLowerCase() === rpcHash.toLowerCase()
          const actualFrom = normalizeRpcAddress(tx.fromAddress || tx.from)
          const actualTo = normalizeRpcAddress(tx.toAddress || tx.to)
          const ok = sameHash && tx.executionResult !== false && tx.value === valueLuna
            && actualFrom === expectedFrom && actualTo === expectedTo
          if (!ok) {
            console.error('[verifyNimiqPayment] mismatch', {
              hash, sameHash, executionResult: tx.executionResult,
              expectedValueLuna: valueLuna, actualValueLuna: tx.value,
              expectedFrom, actualFrom, expectedTo, actualTo,
            })
          }
          return ok
        }
        if (rpc.error) {
          console.error('[verifyNimiqPayment] rpc error', { hash, attempt, error: rpc.error })
        }
      } else {
        console.error('[verifyNimiqPayment] rpc http error', { hash, attempt, status: response.status, statusText: response.statusText })
      }
      if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 1_500))
    }
    console.error('[verifyNimiqPayment] gave up after retries', { hash, rpcUrl })
    return false
  } catch (err) {
    console.error('[verifyNimiqPayment] threw', { hash, err: err instanceof Error ? err.message : err })
    return false
  }
}
