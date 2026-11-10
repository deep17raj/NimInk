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
const subscriptionPriceNim = ref('')
const savingSubscription = ref(false)

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
      const [{ articles: data }, settings] = await Promise.all([
        api.get<{ articles: any[] }>(`/api/articles/user/${auth.user.id}`),
        api.get<{ subscriptionPriceLuna: number }>('/api/monetization/settings'),
      ])
      articles.value = data
      subscriptionPriceNim.value = settings.subscriptionPriceLuna ? String(settings.subscriptionPriceLuna / 100_000) : ''
    } catch {}
  }
  loading.value = false
})

function switchLang() {
  const next = getLocale() === 'en' ? 'es' : 'en'
  setLocale(next)
}

async function saveSubscriptionPrice() {
  const value = Number(subscriptionPriceNim.value || 0)
  if (!Number.isFinite(value) || value < 0 || (value > 0 && value < 0.01) || value > 1000) {
    toast.value = { show: true, message: 'Enter 0 to disable subscriptions, or a price from 0.01 to 1,000 NIM', type: 'error' }
    return
  }
  savingSubscription.value = true
  try {
    const result = await api.put<{ subscriptionPriceLuna: number }>('/api/monetization/settings', {
      subscriptionPriceLuna: Math.round(value * 100_000),
    })
    subscriptionPriceNim.value = result.subscriptionPriceLuna ? String(result.subscriptionPriceLuna / 100_000) : ''
    toast.value = { show: true, message: result.subscriptionPriceLuna ? 'Subscription price saved' : 'Subscriptions disabled', type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Could not save subscription price', type: 'error' }
  } finally {
    savingSubscription.value = false
  }
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
  <div class="min-h-[100dvh] bg-[#f7f8fc] pb-24 dark:bg-[#0c0c0c]">
    <!-- Profile header -->
    <div class="px-5 pt-safe-top pb-2">
      <div class="py-3">
        <h1 class="text-[18px] font-bold text-[#1a1a1a] dark:text-white">{{ t('nav.profile') }}</h1>
      </div>

      <div v-if="auth.user" class="mt-2 rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_5px_22px_rgba(31,35,72,0.05)] dark:border-[#252525] dark:bg-[#151515]">
        <div class="flex items-center gap-4">
          <div class="avatar-xl bg-gradient-to-br from-[#1F2348] to-[#0582CA] text-2xl text-white shadow-md shadow-blue-900/15">{{ initials }}</div>
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

      <!-- Subscription settings -->
      <!-- My articles -->
      <div class="mt-8">
        <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_18px_rgba(31,35,72,0.04)] dark:border-[#252525] dark:bg-[#151515]">
          <h2 class="font-semibold text-[15px] text-[#1a1a1a] dark:text-white">Optional reader subscription</h2>
          <p class="text-[12px] text-gray-500 dark:text-gray-400 mt-1 mb-3">Readers pay once for 30 days of access to your subscriber-only articles. Leave at 0 to keep subscriptions off.</p>
          <div class="flex gap-2">
            <label class="relative flex-1">
              <input v-model="subscriptionPriceNim" type="number" min="0" step="0.01" class="input w-full pr-14" placeholder="0.00" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">NIM</span>
            </label>
            <button @click="saveSubscriptionPrice" class="btn-primary px-4" :disabled="savingSubscription">{{ savingSubscription ? 'Saving…' : 'Save' }}</button>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-[16px] font-bold tracking-[-0.01em] text-[#1a1a1a] dark:text-white">Your articles</h2>
            <p class="mt-0.5 text-[12px] text-gray-400 dark:text-gray-500">Your published stories</p>
          </div>
          <span class="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-gray-500 dark:border-[#333] dark:bg-[#151515] dark:text-gray-300">{{ articles.length }}</span>
        </div>
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 2" :key="i" class="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#252525] dark:bg-[#151515]">
            <div class="skeleton h-11 w-11 rounded-xl" />
            <div class="min-w-0 flex-1 pt-1">
              <div class="skeleton mb-3 h-3 w-20" />
              <div class="skeleton mb-3 h-4 w-4/5" />
              <div class="skeleton h-3 w-2/3" />
            </div>
          </div>
        </div>
        <div v-else-if="articles.length === 0" class="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center dark:border-[#333] dark:bg-[#151515]">
          <div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1F5D91] dark:bg-[#172638] dark:text-blue-200">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3.75h7l4.25 4.5v11A1.75 1.75 0 0116.5 21h-9A1.75 1.75 0 015.75 19.25v-13.5A2 2 0 017.75 3.75zM14 4v5h4M8.5 13h7M8.5 16.5h7" /></svg>
          </div>
          <p class="text-[14px] font-semibold text-[#1a1a1a] dark:text-white">No published articles yet</p>
          <p class="mt-1 text-[12px] text-gray-500 dark:text-gray-400">Your stories will appear here once published.</p>
          <button @click="router.push('/write')" class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1F2348] to-[#0582CA] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14m7-7H5" /></svg>
            Write your first article
          </button>
        </div>
        <div v-else>
          <div
            v-for="a in articles"
            :key="a.id"
            @click="router.push(`/article/${a.id}`)"
            class="group relative mb-3 cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 pr-12 text-left shadow-[0_4px_18px_rgba(31,35,72,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-[0_10px_28px_rgba(31,35,72,0.08)] dark:border-[#252525] dark:bg-[#151515] dark:hover:border-[#24405c]"
          >
            <div class="mb-2 flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Published</span>
              <span v-if="a.accessType === 'subscription' || a.accessType === 'one_time'" class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#1F5D91] dark:bg-[#172638] dark:text-blue-200">
                {{ a.accessType === 'subscription' ? 'Subscriber-only' : 'Premium' }}
              </span>
            </div>
            <span class="pointer-events-none absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-300 transition-all group-hover:bg-blue-50 group-hover:text-[#0582CA] dark:text-gray-600 dark:group-hover:bg-[#172638] dark:group-hover:text-blue-200">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
            </span>
            <p class="line-clamp-2 font-semibold text-[15px] leading-snug text-[#1a1a1a] dark:text-white">{{ a.title }}</p>
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
