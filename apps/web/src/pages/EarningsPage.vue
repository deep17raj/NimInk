<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/composables/useApi'
import { formatNim } from '@nimink/shared'
import { t } from '@/i18n'

const router = useRouter()
const auth = useAuthStore()
const summary = ref<any>(null)
const transactions = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [s, tx] = await Promise.all([
      api.get<any>('/api/earnings/summary'),
      api.get<{ transactions: any[] }>('/api/earnings/transactions'),
    ])
    summary.value = s
    transactions.value = tx.transactions
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-[100dvh] pb-24">
    <!-- Header -->
    <div class="sticky top-0 z-30 bg-white dark:bg-[#111]">
      <div class="flex items-center px-5 py-3">
        <h1 class="text-[18px] font-bold text-[#1a1a1a] dark:text-white">{{ t('nav.earnings') }}</h1>
      </div>
    </div>

    <div class="px-5">
      <div v-if="loading" class="mt-4">
        <div class="skeleton h-24 w-full rounded-2xl mb-4" />
        <div class="skeleton h-16 w-full rounded-2xl" />
      </div>

      <div v-else-if="summary">
        <!-- Total balance -->
        <div class="mt-4 mb-6 text-center py-8 border-b border-gray-100 dark:border-[#2a2a2a]">
          <p class="text-[13px] text-gray-400 dark:text-gray-500 mb-2">{{ t('earnings.total') }}</p>
          <p class="text-[40px] font-bold text-[#1a1a1a] dark:text-white tracking-tight leading-none">
            {{ formatNim(summary.totalLuna) }}
          </p>
          <p class="text-[14px] text-gray-400 dark:text-gray-500 mt-1">NIM</p>
        </div>

        <!-- Breakdown -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="text-center">
            <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center mx-auto mb-2">
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" /></svg>
            </div>
            <p class="font-bold text-[15px] text-[#1a1a1a] dark:text-white">{{ formatNim(summary.tipsLuna) }}</p>
            <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{{ t('earnings.tips') }}</p>
          </div>
          <div class="text-center">
            <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center mx-auto mb-2">
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p class="font-bold text-[15px] text-[#1a1a1a] dark:text-white">{{ formatNim(summary.requestsLuna) }}</p>
            <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{{ t('earnings.requests') }}</p>
          </div>
          <div class="text-center">
            <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center mx-auto mb-2">
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <p class="font-bold text-[15px] text-[#1a1a1a] dark:text-white">{{ formatNim(summary.readRewardsLuna) }}</p>
            <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{{ t('earnings.readRewards') }}</p>
          </div>
        </div>

        <!-- Pending payouts -->
        <div v-if="summary.pendingPayoutsLuna > 0" class="flex items-center justify-between py-4 border-y border-gray-100 dark:border-[#2a2a2a] mb-4">
          <div>
            <p class="text-[14px] font-semibold text-[#1a1a1a] dark:text-white">{{ t('earnings.pending') }}</p>
            <p class="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">Payout in 7 days</p>
          </div>
          <p class="text-[16px] font-bold text-gold-600 dark:text-gold-400">{{ formatNim(summary.pendingPayoutsLuna) }} NIM</p>
        </div>

        <!-- Stake -->
        <button @click="router.push('/stake')" class="w-full flex items-center gap-3 py-4 border-b border-gray-100 dark:border-[#2a2a2a] mb-6 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] -mx-5 px-5 transition-colors">
          <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          <div class="flex-1">
            <p class="font-semibold text-[14px] text-[#1a1a1a] dark:text-white">{{ t('earnings.stake') }}</p>
            <p class="text-[12px] text-gray-400 dark:text-gray-500">Grow your NIM with staking</p>
          </div>
          <p v-if="summary.stakedLuna > 0" class="text-[14px] font-bold text-green-600 dark:text-green-400 mr-1">{{ formatNim(summary.stakedLuna) }}</p>
          <svg class="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>

        <!-- Transactions -->
        <p class="section-title mb-3 text-[13px]">Recent transactions</p>
        <div v-if="transactions.length === 0" class="py-8 text-center">
          <p class="text-[14px] text-gray-400 dark:text-gray-500">No transactions yet</p>
        </div>
        <div v-else>
          <div v-for="tx in transactions" :key="tx.created_at + tx.type" class="flex items-center gap-3 py-3.5 border-b border-gray-100 dark:border-[#2a2a2a] last:border-0">
            <div class="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center shrink-0">
              <svg v-if="tx.type === 'tip'" class="w-4.5 h-4.5 text-gold-600 dark:text-gold-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" /></svg>
              <svg v-else-if="tx.type === 'request'" class="w-4.5 h-4.5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <svg v-else class="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[14px] font-medium truncate text-[#1a1a1a] dark:text-white">{{ tx.label }}</p>
              <p class="text-[12px] text-gray-400 dark:text-gray-500">{{ tx.type }} · {{ new Date(tx.created_at).toLocaleDateString() }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-[14px] font-bold text-green-600 dark:text-green-400">+{{ formatNim(tx.amount_luna) }}</p>
              <p class="text-[10px] font-medium uppercase tracking-wide" :class="tx.status === 'confirmed' ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'">
                {{ tx.status }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
