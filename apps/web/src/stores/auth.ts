import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, setAuthToken, getAuthToken } from '@/composables/useApi'
import { getNimiqProvider, resetNimiqProvider, toNimiqError } from '@/composables/useNimiq'

interface User {
  id: string
  address: string
  displayName: string
  bio: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isConnected = computed(() => !!user.value)
  const walletMode = ref<'demo' | 'nimiq'>(
    (import.meta.env.VITE_WALLET_MODE as any) || 'demo'
  )
  const isDemo = computed(() => walletMode.value === 'demo')

  async function connectDemo(address: string, displayName: string) {
    const { token, user: u } = await api.post<{ token: string; user: User }>('/api/auth/demo', {
      address,
      displayName,
    })

    setAuthToken(token)
    user.value = u
  }

  async function connectNimiq() {
    const nimiqProvider = await getNimiqProvider()
    const { nonce, message } = await api.post<{ nonce: string; message: string }>('/api/auth/nonce')
    let proof: { publicKey: string; signature: string }
    try {
      proof = await nimiqProvider.sign(message)
    } catch (error) {
      throw toNimiqError(error)
    }
    const { token, user: signedInUser } = await api.post<{ token: string; user: User }>('/api/auth/verify', {
      nonce,
      publicKey: proof.publicKey,
      signature: proof.signature,
    })
    setAuthToken(token)
    user.value = signedInUser
    return signedInUser
  }

  function disconnect() {
    resetNimiqProvider()
    user.value = null
    setAuthToken('')
  }

  async function tryRestore() {
    const token = getAuthToken()
    if (!token) return
    // JWT payload is in the second part
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp * 1000 > Date.now()) {
        user.value = {
          id: payload.userId,
          address: payload.address,
          displayName: payload.address.slice(0, 10),
          bio: '',
        }
        try {
          const { user: restoredUser } = await api.get<{ user: User }>('/api/auth/me')
          user.value = restoredUser
        } catch {
          // Keep the decoded session visible while the API is temporarily unavailable.
        }
      } else {
        setAuthToken('')
      }
    } catch {
      setAuthToken('')
    }
  }

  return { user, isConnected, walletMode, isDemo, connectDemo, connectNimiq, disconnect, tryRestore }
})
