<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/composables/useApi'
import { formatNim } from '@nimink/shared'
import { t, setLocale, getLocale } from '@/i18n'
import Toast from '@/components/Toast.vue'

const router = useRouter()
const auth = useAuthStore()
const wallet = useWalletStore()
const articles = ref<any[]>([])
const loading = ref(true)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const initials = computed(() => {
  if (!auth.user) return '?'
  return auth.user.displayName.charAt(0).toUpperCase()
})

const totalReads = computed(() =>
  articles.value.reduce((sum: number, a: any) => sum + (a.verifiedReadCount || 0), 0)
)

onMounted(async () => {
  if (auth.user) {
    try {
      const { articles: data } = await api.get<{ articles: any[] }>(`/api/articles/user/${auth.user.id}`)
      articles.value = data
    } catch {}
  }
  loading.value = false
})

function switchLang() {
  const next = getLocale() === 'en' ? 'es' : 'en'
  setLocale(next)
}

function disconnect() {
  auth.disconnect()
  router.push('/')
}

async function faucet() {
  try {
    await wallet.requestFaucet()
    toast.value = { show: true, message: `+500 demo NIM! Balance: ${formatNim(wallet.balance)}`, type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Faucet failed', type: 'error' }
  }
}

async function resetDemo() {
  try {
    await api.post('/api/demo/reset')
    auth.disconnect()
    router.push('/')
  } catch {}
}
</script>

<template>
  <div class="min-h-[100dvh] pb-24">
    <!-- Profile header -->
    <div class="px-5 pt-safe-top pb-6 border-b border-gray-100 dark:border-[#2a2a2a]">
      <div class="py-3">
        <h1 class="text-[18px] font-bold text-[#1a1a1a] dark:text-white">{{ t('nav.profile') }}</h1>
      </div>

      <div v-if="auth.user" class="mt-2">
        <div class="flex items-center gap-4">
          <div class="avatar-xl text-2xl">{{ initials }}</div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-[18px] text-[#1a1a1a] dark:text-white">{{ auth.user.displayName }}</p>
            <p class="text-[13px] text-gray-400 dark:text-gray-500 truncate font-mono mt-0.5">{{ auth.user.address }}</p>
          </div>
        </div>

        <!-- Stats row -->
        <div class="flex items-center gap-6 mt-5">
          <div>
            <span class="font-bold text-[#1a1a1a] dark:text-white">{{ articles.length }}</span>
            <span class="text-[13px] text-gray-400 dark:text-gray-500 ml-1">Articles</span>
          </div>
          <div>
            <span class="font-bold text-[#1a1a1a] dark:text-white">{{ totalReads }}</span>
            <span class="text-[13px] text-gray-400 dark:text-gray-500 ml-1">Reads</span>
          </div>
          <div class="ml-auto">
            <span class="font-bold text-[#1a1a1a] dark:text-white">{{ formatNim(wallet.balance) }}</span>
            <span class="text-[13px] text-gray-400 dark:text-gray-500 ml-1">NIM</span>
            <span v-if="auth.isDemo" class="demo-badge ml-1.5 text-[10px]">demo</span>
          </div>
        </div>
      </div>
    </div>

    <div class="px-5">
      <!-- Faucet -->
      <button v-if="auth.isDemo" @click="faucet" class="w-full mt-5 py-3.5 rounded-xl bg-gold-500 text-[#1a1a1a] font-semibold text-[14px] hover:bg-gold-400 transition-colors active:scale-[0.98]">
        Get 500 demo NIM
      </button>

      <!-- Quick actions -->
      <div class="mt-6">
        <p class="section-title mb-1 text-[13px]">Quick actions</p>
        <button @click="router.push('/write')" class="menu-item w-full border-b border-gray-100 dark:border-[#2a2a2a]">
          <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          <span class="flex-1 text-[15px] text-[#1a1a1a] dark:text-gray-200">Add new article</span>
          <svg class="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button @click="router.push('/earnings')" class="menu-item w-full border-b border-gray-100 dark:border-[#2a2a2a]">
          <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span class="flex-1 text-[15px] text-[#1a1a1a] dark:text-gray-200">Your earnings</span>
          <svg class="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button @click="router.push('/requests')" class="menu-item w-full">
          <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <span class="flex-1 text-[15px] text-[#1a1a1a] dark:text-gray-200">Requests</span>
          <svg class="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <!-- My articles -->
      <div class="mt-8">
        <p class="section-title mb-3 text-[13px]">Your articles</p>
        <div v-if="loading" class="space-y-2">
          <div v-for="i in 2" :key="i" class="py-3"><div class="skeleton h-4 w-3/4 mb-2" /><div class="skeleton h-3 w-1/2" /></div>
        </div>
        <div v-else-if="articles.length === 0" class="py-8 text-center">
          <p class="text-[14px] text-gray-400 dark:text-gray-500">No articles yet</p>
          <button @click="router.push('/write')" class="text-[14px] text-[#0582CA] font-medium mt-1.5 hover:underline">Write your first</button>
        </div>
        <div v-else>
          <div
            v-for="a in articles"
            :key="a.id"
            @click="router.push(`/article/${a.id}`)"
            class="py-3.5 border-b border-gray-100 dark:border-[#2a2a2a] last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a] -mx-5 px-5 transition-colors"
          >
            <p class="font-semibold text-[14px] text-[#1a1a1a] dark:text-white">{{ a.title }}</p>
            <p class="text-[12px] text-gray-400 dark:text-gray-500 mt-1">{{ a.verifiedReadCount }} reads · {{ formatNim(a.totalTipsLuna) }} NIM tipped</p>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="mt-8">
        <p class="section-title mb-1 text-[13px]">Settings</p>
        <button @click="switchLang" class="menu-item w-full border-b border-gray-100 dark:border-[#2a2a2a]">
          <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
          <span class="flex-1 text-[15px] text-[#1a1a1a] dark:text-gray-200">Language</span>
          <span class="text-[13px] text-gray-400 dark:text-gray-500">{{ getLocale() === 'en' ? 'English' : 'Español' }}</span>
        </button>
        <button @click="router.push('/guidelines')" class="menu-item w-full border-b border-gray-100 dark:border-[#2a2a2a]">
          <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span class="flex-1 text-[15px] text-[#1a1a1a] dark:text-gray-200">Content guidelines</span>
          <svg class="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button @click="router.push('/privacy')" class="menu-item w-full">
          <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span class="flex-1 text-[15px] text-[#1a1a1a] dark:text-gray-200">Privacy & data</span>
          <svg class="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <!-- Demo actions -->
      <div v-if="auth.isDemo" class="mt-6">
        <button @click="resetDemo" class="menu-item w-full text-red-500">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <span class="flex-1 text-[15px]">Reset demo data</span>
        </button>
      </div>

      <!-- Disconnect -->
      <button @click="disconnect" class="w-full mt-6 py-3.5 rounded-xl border border-gray-200 dark:border-[#333] text-red-500 font-medium text-[14px] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors active:scale-[0.98]">
        Disconnect
      </button>
    </div>
  </div>

  <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
</template>
