import { init, NimiqProviderError, type NimiqProvider } from '@nimiq/mini-app-sdk'

let nimiqProvider: NimiqProvider | null = null
let providerPromise: Promise<NimiqProvider> | null = null

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isProviderNotReady(error: unknown) {
  const providerError = NimiqProviderError.from(error)
  const message = providerError?.message || (error instanceof Error ? error.message : String(error))
  return /not ready|not injected|not initialized|not initialised/i.test(message)
    || providerError?.type === 'UNKNOWN_ERROR'
}

export function toNimiqError(error: unknown): Error & { code?: string } {
  const providerError = NimiqProviderError.from(error)
  const message = providerError?.message || (error instanceof Error ? error.message : String(error || ''))

  if (providerError?.type === 'PERMISSION_DENIED') {
    return Object.assign(new Error('Sign-in or payment was cancelled in Nimiq Pay.'), { code: providerError.type })
  }
  if (/not ready|not injected|not initialized|not initialised/i.test(message)) {
    return Object.assign(new Error('Nimiq Pay is still starting. Reopen NimInk from Nimiq Pay, wait a moment, then try again.'), { code: 'NIMIQ_APP_NOT_READY' })
  }

  return Object.assign(new Error(message || 'Nimiq Pay could not complete the wallet request.'), { code: providerError?.type })
}

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
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      // This read-only call confirms the injected bridge can answer before
      // asking Nimiq Pay to show a sign or payment approval dialog.
      const status = await provider.isConsensusEstablished()
      if (typeof status !== 'boolean') throw new Error('Nimiq app is not ready yet.')
      return provider
    } catch (error) {
      if (!isProviderNotReady(error) || attempt === 5) throw toNimiqError(error)
      await delay(350 + 400 * attempt)
    }
  }
  return provider
}

export function resetNimiqProvider() {
  nimiqProvider = null
  providerPromise = null
}
