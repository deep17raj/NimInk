<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/composables/useApi'
import { formatNim } from '@nimink/shared'
import { t } from '@/i18n'

const router = useRouter()
const requests = ref<any[]>([])
const loading = ref(true)

async function fetchRequests() {
  try {
    const { requests: data } = await api.get<{ requests: any[] }>('/api/requests')
    requests.value = data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

let refreshTimer: ReturnType<typeof setInterval>
onMounted(() => {
  fetchRequests()
  refreshTimer = setInterval(fetchRequests, 20_000)
  window.addEventListener('focus', fetchRequests)
})
onUnmounted(() => {
  clearInterval(refreshTimer)
  window.removeEventListener('focus', fetchRequests)
})

function statusClass(status: string) {
  const map: Record<string, string> = {
    open: 'chip-open', in_review: 'chip-in-review',
    awarded: 'chip-awarded', paid: 'chip-paid',
  }
  return map[status] || 'chip bg-gray-100 text-gray-600'
}
</script>

<template>
  <div class="min-h-[100dvh] pb-24">
    <!-- Header -->
    <div class="sticky top-0 z-30 bg-white dark:bg-[#111]">
      <div class="flex items-center justify-between px-5 py-3">
        <h1 class="text-[18px] font-bold text-[#1a1a1a] dark:text-white">{{ t('nav.requests') }}</h1>
        <button @click="router.push('/requests/new')" class="btn-primary text-[13px] px-4 py-2">
          {{ t('request.create') }}
        </button>
      </div>
    </div>

    <div class="px-5">
      <div v-if="loading" class="mt-4 space-y-4">
        <div v-for="i in 3" :key="i">
          <div class="skeleton h-5 w-3/4 mb-2" />
          <div class="skeleton h-3 w-full mb-1" />
          <div class="skeleton h-3 w-1/2 mb-4" />
          <div class="divider" />
        </div>
      </div>

      <div v-else-if="requests.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
        <svg class="w-12 h-12 text-gray-200 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        <p class="text-gray-400 dark:text-gray-500 text-[14px] mb-1">No requests yet</p>
        <button @click="router.push('/requests/new')" class="text-[14px] text-[#0582CA] font-medium hover:underline">Create the first one</button>
      </div>

      <div v-else class="mt-2">
        <div
          v-for="req in requests"
          :key="req.id"
          @click="router.push(`/requests/${req.id}`)"
          class="py-4 border-b border-gray-100 dark:border-[#2a2a2a] last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a] -mx-5 px-5 transition-colors"
        >
          <div class="flex items-start justify-between mb-1.5">
            <h3 class="font-bold text-[15px] flex-1 mr-3 text-[#1a1a1a] dark:text-white">{{ req.topic }}</h3>
            <span :class="statusClass(req.status)">{{ req.status.replace('_', ' ') }}</span>
          </div>
          <p class="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">{{ req.description }}</p>
          <div class="flex items-center justify-between text-[12px] text-gray-400 dark:text-gray-500">
            <span>{{ req.requesterName }}</span>
            <span class="font-semibold text-gold-600 dark:text-gold-400">{{ formatNim(req.budgetLuna) }} NIM</span>
          </div>
          <div v-if="req.unpaidWarning" class="mt-2 text-[12px] text-red-500 font-medium flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
            {{ t('request.unpaid') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
