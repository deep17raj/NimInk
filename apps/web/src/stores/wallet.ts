import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/composables/useApi'
import { useAuthStore } from './auth'
import { getHostNetwork } from '@nimiq/mini-app-sdk'
import { getNimiqProvider, toNimiqError } from '@/composables/useNimiq'

export const useWalletStore = defineStore('wallet', () => {
  const balance = ref(0)
  const loading = ref(false)
  let configuredNetworkPromise: Promise<string> | null = null

  async function ensurePaymentNetwork() {
    const hostNetwork = getHostNetwork()
    if (hostNetwork !== 'mainnet' && hostNetwork !== 'testnet') return

    if (!configuredNetworkPromise) {
      configuredNetworkPromise = api.get<{ network: string }>('/api/health')
        .then((result) => result.network)
        .catch((error) => {
          configuredNetworkPromise = null
          throw error
        })
    }

    const serverNetwork = await configuredNetworkPromise
    if (serverNetwork !== hostNetwork) {
      throw new Error(`Nimiq Pay is on ${hostNetwork}, while NimInk payments use ${serverNetwork}. Switch to the same network before paying. No payment was sent.`)
    }
  }

  async function fetchBalance() {
    const auth = useAuthStore()
    if (!auth.user) return

    loading.value = true
    try {
      if (!auth.isDemo) {
        const nimiq = await getNimiqProvider()
        balance.value = await nimiq.getBalance(auth.user.address)
        return
      }
      const { balanceLuna } = await api.get<{ balanceLuna: number }>(
        `/api/demo/balance/${encodeURIComponent(auth.user.address)}`
      )
      balance.value = balanceLuna
    } catch {
      // Ignore errors
    } finally {
      loading.value = false
    }
  }

  async function sendPayment(recipient: string, valueLuna: number, data?: string): Promise<{ txHash: string }> {
    const auth = useAuthStore()
    if (!auth.isConnected) throw new Error('Not connected')

    if (auth.isDemo) {
      const result = await api.post<{ txHash: string; status: string }>('/api/demo/send-payment', {
        recipient,
        valueLuna,
        data,
      })
      await fetchBalance()
      return { txHash: result.txHash }
    }

    const nimiq = await getNimiqProvider()
    await ensurePaymentNetwork()
    let walletAccounts: string[]
    try {
      walletAccounts = await nimiq.listAccounts()
    } catch (error) {
      throw toNimiqError(error)
    }
    const normalizeAddress = (address: string) => address.replace(/\s/g, '').toUpperCase()
    const authenticatedAddress = auth.user?.address
    if (!authenticatedAddress || !walletAccounts.some((address) => normalizeAddress(address) === normalizeAddress(authenticatedAddress))) {
      throw new Error('The account you used to sign in to NimInk is not available to this mini app. Select/share that account in Nimiq Pay, then sign in again and retry. No payment was sent.')
    }
    let txHash: string
    try {
      txHash = data
        ? await nimiq.sendBasicTransactionWithData({ recipient, value: valueLuna, data })
        : await nimiq.sendBasicTransaction({ recipient, value: valueLuna })
    } catch (error) {
      throw toNimiqError(error)
    }
    void fetchBalance()
    return { txHash }
  }

  async function sendStake(validatorAddress: string, valueLuna: number): Promise<{ txHash: string }> {
    const auth = useAuthStore()
    if (!auth.isConnected) throw new Error('Not connected')

    if (auth.isDemo) {
      const result = await api.post<{ txHash: string }>('/api/demo/send-stake', {
        validatorAddress,
        valueLuna,
      })
      await fetchBalance()
      return { txHash: result.txHash }
    }

    const nimiq = await getNimiqProvider()
    await ensurePaymentNetwork()
    let txHash: string
    try {
      txHash = await nimiq.sendNewStakerTransaction({ delegation: validatorAddress, value: valueLuna })
    } catch (error) {
      throw toNimiqError(error)
    }
    void fetchBalance()
    return { txHash }
  }

  async function requestFaucet() {
    const result = await api.post<{ balanceLuna: number }>('/api/demo/faucet')
    balance.value = result.balanceLuna
  }

  return { balance, loading, fetchBalance, sendPayment, sendStake, requestFaucet }
})
