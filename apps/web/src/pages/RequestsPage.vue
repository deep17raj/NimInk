<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/composables/useApi'
import { formatNim } from '@nimink/shared'
import { t } from '@/i18n'

type RequestTab = 'discover' | 'mine'

const router = useRouter()
const auth = useAuthStore()
const activeTab = ref<RequestTab>('discover')
const communityRequests = ref<any[]>([])
const myRequests = ref<any[]>([])
const communityLoading = ref(true)
const myLoading = ref(true)
const communityError = ref('')
const myError = ref('')

const visibleRequests = computed(() => activeTab.value === 'discover' ? communityRequests.value : myRequests.value)
const visibleLoading = computed(() => activeTab.value === 'discover' ? communityLoading.value : myLoading.value)
const visibleError = computed(() => activeTab.value === 'discover' ? communityError.value : myError.value)

async function fetchCommunityRequests() {
  if (!auth.isConnected) return
  communityError.value = ''
  try {
    const { requests } = await api.get<{ requests: any[] }>('/api/requests/discover?limit=50')
    communityRequests.value = requests
  } catch (e: any) {
    communityError.value = e.error || 'Could not load community requests.'
  } finally {
    communityLoading.value = false
  }
}

async function fetchMyRequests() {
  if (!auth.isConnected) return
  myError.value = ''
  try {
    const { requests } = await api.get<{ requests: any[] }>('/api/requests/mine?limit=100')
    myRequests.value = requests
  } catch (e: any) {
    myError.value = e.error || 'Could not load your requests.'
  } finally {
    myLoading.value = false
  }
}

function refreshRequests() {
  if (!auth.isConnected) return
  void fetchCommunityRequests()
  void fetchMyRequests()
}

watch(() => auth.user?.id, (userId) => {
  if (userId) {
    communityLoading.value = true
    myLoading.value = true
    refreshRequests()
  } else {
    communityRequests.value = []
    myRequests.value = []
    communityLoading.value = false
    myLoading.value = false
  }
}, { immediate: true })

let refreshTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  refreshTimer = setInterval(refreshRequests, 30_000)
  window.addEventListener('focus', refreshRequests)
})
onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  window.removeEventListener('focus', refreshRequests)
})

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Open',
    in_review: 'In review',
    awarded: 'In review',
    paid: 'Paid',
  }
  return labels[status] || status.replaceAll('_', ' ')
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    open: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    in_review: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    awarded: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    paid: 'bg-gray-100 text-gray-600 dark:bg-[#292929] dark:text-gray-300',
  }
  return classes[status] || 'bg-gray-100 text-gray-600 dark:bg-[#292929] dark:text-gray-300'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

</script>

<template>
  <div class="min-h-[100dvh] bg-[#f7f8fc] pb-24 dark:bg-[#0c0c0c]">
    <div class="sticky top-0 z-30 border-b border-gray-100/80 bg-white/90 backdrop-blur-xl dark:border-[#252525] dark:bg-[#111]/90">
      <div class="flex items-center justify-between px-5 py-3">
        <div>
          <h1 class="text-[18px] font-bold tracking-tight text-[#1a1a1a] dark:text-white">{{ t('nav.requests') }}</h1>
        </div>
        <button @click="router.push('/requests/new')" class="btn-primary px-4 py-2 text-[13px]">
          {{ t('request.create') }}
        </button>
      </div>
    </div>

    <div class="px-5 pt-5">
      <div class="mb-5 grid grid-cols-2 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm dark:border-[#2b2b2b] dark:bg-[#151515]">
        <button
          type="button"
          @click="activeTab = 'discover'"
          :aria-pressed="activeTab === 'discover'"
          class="flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-[13px] font-semibold transition-colors"
          :class="activeTab === 'discover' ? 'bg-[#1f2348] text-white shadow-sm dark:bg-[#e9b213] dark:text-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-[#202020]'"
        >
          Browse requests
          <span class="rounded-full px-1.5 py-0.5 text-[10px]" :class="activeTab === 'discover' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-[#1a1a1a]' : 'bg-gray-100 text-gray-500 dark:bg-[#292929] dark:text-gray-300'">{{ communityRequests.length }}</span>
        </button>
        <button
          type="button"
          @click="activeTab = 'mine'"
          :aria-pressed="activeTab === 'mine'"
          class="flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-[13px] font-semibold transition-colors"
          :class="activeTab === 'mine' ? 'bg-[#1f2348] text-white shadow-sm dark:bg-[#e9b213] dark:text-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-[#202020]'"
        >
          My requests
          <span class="rounded-full px-1.5 py-0.5 text-[10px]" :class="activeTab === 'mine' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-[#1a1a1a]' : 'bg-gray-100 text-gray-500 dark:bg-[#292929] dark:text-gray-300'">{{ myRequests.length }}</span>
        </button>
      </div>

      <div class="mb-4">
        <h2 class="text-[16px] font-bold text-[#1a1a1a] dark:text-white">
          {{ activeTab === 'discover' ? 'Open requests from others' : 'Requests you posted' }}
        </h2>
        <p class="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
          {{ activeTab === 'discover' ? 'These topics are open for article submissions.' : 'Follow each request from open through payment.' }}
        </p>
      </div>

      <div v-if="visibleLoading" class="space-y-3 pb-8">
        <div v-for="i in 3" :key="i" class="rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#252525] dark:bg-[#151515]">
          <div class="skeleton mb-3 h-3 w-24" />
          <div class="skeleton mb-2 h-5 w-3/4" />
          <div class="skeleton mb-1 h-3 w-full" />
          <div class="skeleton h-3 w-1/2" />
        </div>
      </div>

      <div v-else-if="!auth.isConnected" class="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center dark:border-[#2b2b2b] dark:bg-[#151515]">
        <p class="text-[14px] font-semibold text-[#1a1a1a] dark:text-white">Connect your wallet to view requests</p>
        <p class="mx-auto mt-1 max-w-[280px] text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">Browse topics from other writers and keep track of the requests you create.</p>
        <button @click="router.push('/')" class="btn-primary mt-4 px-4 py-2 text-[13px]">Connect wallet</button>
      </div>

      <div v-else-if="visibleError" class="rounded-2xl border border-red-100 bg-red-50 p-5 text-center dark:border-red-950 dark:bg-red-950/20">
        <p class="text-[13px] text-red-700 dark:text-red-300">{{ visibleError }}</p>
        <button @click="refreshRequests" class="mt-3 text-[13px] font-semibold text-red-700 underline underline-offset-2 dark:text-red-300">Try again</button>
      </div>

      <div v-else-if="visibleRequests.length === 0" class="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center dark:border-[#333] dark:bg-[#151515]">
        <div class="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-[#252525] dark:text-gray-400">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
        </div>
        <p class="text-[14px] font-semibold text-gray-800 dark:text-gray-100">
          {{ activeTab === 'discover' ? 'No open requests right now' : 'You have not posted a request yet' }}
        </p>
        <p class="mx-auto mt-1 max-w-[280px] text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
          {{ activeTab === 'discover' ? 'New topics from the community will appear here.' : 'Tell writers what you would like them to write about.' }}
        </p>
        <button v-if="activeTab === 'mine'" @click="router.push('/requests/new')" class="btn-primary mt-4 px-4 py-2 text-[13px]">Create a request</button>
      </div>

      <div v-else class="space-y-3 pb-8">
        <RouterLink
          v-for="req in visibleRequests"
          :key="req.id"
          :to="{ name: 'request-detail', params: { id: req.id } }"
          class="group block w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-[0_4px_18px_rgba(31,35,72,0.035)] transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0582CA] dark:border-[#252525] dark:bg-[#151515] dark:hover:border-[#24405c]"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <span class="flex min-w-0 items-center gap-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
              <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eef3fa] text-[10px] font-bold text-[#42516b] dark:bg-[#262d38] dark:text-gray-200">
                {{ activeTab === 'mine' ? 'Y' : (req.requesterName || 'W').charAt(0).toUpperCase() }}
              </span>
              <span class="truncate">{{ activeTab === 'mine' ? 'Your request' : `Requested by ${req.requesterName || 'Writer'}` }}</span>
            </span>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="statusClass(req.status)">{{ statusLabel(req.status) }}</span>
          </div>

          <h3 class="text-[15px] font-bold leading-snug text-[#1a1a1a] transition-colors group-hover:text-[#176dae] dark:text-white dark:group-hover:text-blue-300">{{ req.topic }}</h3>
          <p class="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">{{ req.description || 'No additional details provided.' }}</p>

          <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 dark:border-[#292929]">
            <span class="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#8a6900] dark:text-[#e9b213]">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m6-13.5C18 6.12 15.31 5 12 5s-6 1.12-6 2.5S8.69 10 12 10s6 1.12 6 2.5S15.31 15 12 15s-6-1.12-6-2.5" /></svg>
              {{ formatNim(req.budgetLuna) }} NIM
            </span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500">Due {{ formatDate(req.deadline) }}</span>
            <span class="ml-auto text-[11px] font-semibold text-[#0582CA] dark:text-blue-300">View details <span aria-hidden="true">→</span></span>
          </div>

          <div v-if="req.unpaidWarning" class="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600 dark:bg-red-950/30 dark:text-red-300">
            <svg class="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
            {{ t('request.unpaid') }}
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
