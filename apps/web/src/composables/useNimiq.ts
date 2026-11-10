import { init, NimiqProviderError, type NimiqProvider } from '@nimiq/mini-app-sdk'

let nimiqProvider: NimiqProvider | null = null
let providerPromise: Promise<NimiqProvider> | null = null

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isProviderNotReady(error: unknown) {
  const providerError = NimiqProviderError.from(error)
  const message = providerError?.message || (error instanceof Error ? error.message : String(error))
  return /not ready|not injected|not initialized|not initialised|network/i.test(message)
    || providerError?.type === 'UNKNOWN_ERROR'
    || providerError?.type === 'NETWORK_ERROR'
}

export function toNimiqError(error: unknown): Error & { code?: string } {
  const providerError = NimiqProviderError.from(error)
  const message = providerError?.message || (error instanceof Error ? error.message : String(error || ''))

  if (providerError?.type === 'PERMISSION_DENIED') {
    return Object.assign(new Error('Sign-in or payment was cancelled in Nimiq Pay.'), { code: providerError.type })
  }
  if (providerError?.type === 'NETWORK_ERROR' || /not ready|not injected|not initialized|not initialised|network/i.test(message)) {
    return Object.assign(new Error('Nimiq Pay is still establishing its network connection. Wait a few seconds and try again.'), { code: 'NIMIQ_APP_NOT_READY' })
  }

  return Object.assign(new Error(message || 'Nimiq Pay could not complete the wallet request.'), { code: providerError?.type })
}

const READY_ATTEMPTS = 10

export async function getNimiqProvider(): Promise<NimiqProvider> {
  if (!nimiqProvider && !providerPromise) {
    providerPromise = init({ timeout: 20_000 })
      .then((provider) => {
        nimiqProvider = provider
        return provider
      })
      .catch((error) => {
        providerPromise = null
        throw toNimiqError(error)
      })
  }

  const provider = nimiqProvider || await providerPromise!
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
    try {
      // This read-only call confirms the host wallet has established
      // network consensus before asking it to show a sign/payment dialog.
      // `false` is a valid response meaning "not ready yet" — it must be
      // retried, not treated as success just because the call didn't throw.
      const status = await provider.isConsensusEstablished()
      if (status === true) return provider
      if (typeof status !== 'boolean') throw new Error('Nimiq app is not ready yet.')
    } catch (error) {
      if (!isProviderNotReady(error) || attempt === READY_ATTEMPTS - 1) throw toNimiqError(error)
    }
    await delay(350 + 400 * attempt)
  }
  throw toNimiqError(new Error('Nimiq network is not ready.'))
}

/**
 * Retries a wallet call (sign / send payment / stake) if it fails because
 * Nimiq Pay's network connection dropped or hadn't stabilized, instead of
 * surfacing a hard failure for what is usually a transient state.
 */
export async function withNimiqRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (!isProviderNotReady(error) || attempt === attempts - 1) throw toNimiqError(error)
      await delay(400 + 400 * attempt)
    }
  }
  throw new Error('unreachable')
}

export function resetNimiqProvider() {
  nimiqProvider = null
  providerPromise = null
}
