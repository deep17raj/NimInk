<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/composables/useApi'
import { formatNim } from '@nimink/shared'
import { t } from '@/i18n'

interface EarningsSummary {
  totalLuna: number
  tipsLuna: number
  requestsLuna: number
  subscriptionsLuna: number
  articleSalesLuna: number
  stakedLuna: number
}
interface Transaction {
  type: string
  amount_luna: number
  created_at: string
  status: string
  label: string
}

const router = useRouter()
const wallet = useWalletStore()
const summary = ref<EarningsSummary | null>(null)
const transactions = ref<Transaction[]>([])
const loading = ref(true)
const error = ref('')

async function loadEarnings() {
  loading.value = true
  error.value = ''
  try {
    const [s, tx] = await Promise.all([
      api.get<EarningsSummary>('/api/earnings/summary'),
      api.get<{ transactions: Transaction[] }>('/api/earnings/transactions'),
      wallet.fetchBalance(),
    ])
    summary.value = s
    transactions.value = tx.transactions
  } catch (e: any) {
    error.value = e?.error || 'We couldn’t load your earnings. Check your connection and try again.'
  } finally {
    loading.value = false
  }
}

function transactionLabel(type: string) {
  if (type === 'tip') return 'Tip'
  if (type === 'request') return 'Request reward'
  if (type === 'subscription') return 'Subscription'
  return 'Article sale'
}

onMounted(loadEarnings)
</script>

<template>
  <div class="min-h-[100dvh] bg-[#fafafa] pb-28 dark:bg-[#0c0c0c]">
    <header class="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-[#242424] dark:bg-[#111]/95">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0582CA]">Creator dashboard</p>
        <h1 class="mt-0.5 text-lg font-bold text-[#1a1a1a] dark:text-white">{{ t('nav.earnings') }}</h1>
      </div>
      <button type="button" class="rounded-xl px-3 py-2 text-xs font-semibold text-[#0582CA] hover:bg-blue-50 disabled:opacity-50" :disabled="loading" @click="loadEarnings">Refresh</button>
    </header>

    <main class="space-y-5 px-5 pt-5">
      <div v-if="loading && !summary" class="space-y-4" aria-label="Loading earnings">
        <div class="skeleton h-44 w-full rounded-3xl" />
        <div class="grid grid-cols-2 gap-3"><div class="skeleton h-24 rounded-2xl" /><div class="skeleton h-24 rounded-2xl" /></div>
      </div>

      <div v-else-if="error && !summary" class="rounded-3xl border border-red-100 bg-white p-6 text-center dark:border-red-950 dark:bg-[#151515]">
        <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40">!</div>
        <h2 class="mt-3 font-semibold text-gray-900 dark:text-white">Earnings unavailable</h2>
        <p class="mt-1 text-sm text-gray-500">{{ error }}</p>
        <button class="mt-4 rounded-xl bg-[#1F2348] px-4 py-2.5 text-sm font-semibold text-white" @click="loadEarnings">Try again</button>
      </div>

      <template v-else-if="summary">
        <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#20264f] via-[#172c58] to-[#0582CA] p-5 text-white shadow-lg shadow-blue-950/10">
          <div class="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border-[24px] border-white/5" />
          <div class="relative">
            <p class="text-sm font-medium text-blue-100">Total earned</p>
            <div class="mt-2 flex items-baseline gap-2">
              <p class="text-4xl font-bold tracking-tight">{{ formatNim(summary.totalLuna) }}</p>
              <span class="text-sm font-semibold text-blue-100">NIM</span>
            </div>
            <div class="mt-5 flex items-center justify-between border-t border-white/15 pt-4">
              <div>
                <p class="text-xs text-blue-100">Available in wallet</p>
                <p class="mt-0.5 text-lg font-semibold">{{ formatNim(wallet.balance) }} <span class="text-xs font-medium text-blue-100">NIM</span></p>
              </div>
              <button type="button" class="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/25" @click="wallet.fetchBalance()">Update balance</button>
            </div>
          </div>
        </section>

        <section aria-label="Earnings breakdown">
          <div class="mb-3 flex items-end justify-between">
            <div><h2 class="font-bold text-gray-900 dark:text-white">Income sources</h2><p class="mt-0.5 text-xs text-gray-500">Your confirmed creator earnings</p></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <article class="rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#252525] dark:bg-[#151515]">
              <div class="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300"><span class="text-lg">＋</span></div>
              <p class="text-lg font-bold text-gray-900 dark:text-white">{{ formatNim(summary.tipsLuna) }} <span class="text-[10px] font-semibold text-gray-400">NIM</span></p><p class="mt-0.5 text-xs text-gray-500">{{ t('earnings.tips') }}</p>
            </article>
            <article class="rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#252525] dark:bg-[#151515]">
              <div class="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300"><span class="text-base">✎</span></div>
              <p class="text-lg font-bold text-gray-900 dark:text-white">{{ formatNim(summary.requestsLuna) }} <span class="text-[10px] font-semibold text-gray-400">NIM</span></p><p class="mt-0.5 text-xs text-gray-500">{{ t('earnings.requests') }}</p>
            </article>
            <article class="rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#252525] dark:bg-[#151515]">
              <div class="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300"><span class="text-base">↻</span></div>
              <p class="text-lg font-bold text-gray-900 dark:text-white">{{ formatNim(summary.subscriptionsLuna) }} <span class="text-[10px] font-semibold text-gray-400">NIM</span></p><p class="mt-0.5 text-xs text-gray-500">Subscriptions</p>
            </article>
            <article class="rounded-2xl border border-gray-100 bg-white p-4 dark:border-[#252525] dark:bg-[#151515]">
              <div class="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"><span class="text-base">▤</span></div>
              <p class="text-lg font-bold text-gray-900 dark:text-white">{{ formatNim(summary.articleSalesLuna) }} <span class="text-[10px] font-semibold text-gray-400">NIM</span></p><p class="mt-0.5 text-xs text-gray-500">Premium articles</p>
            </article>
          </div>
        </section>

        <button type="button" class="group flex w-full items-center gap-4 rounded-3xl border border-[#dbeafe] bg-gradient-to-r from-[#eff6ff] to-white p-4 text-left transition hover:border-blue-300 hover:shadow-md dark:border-[#19314a] dark:from-[#102033] dark:to-[#151515]" @click="router.push('/stake')">
          <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#1F2348] text-white shadow-md shadow-[#1F2348]/15">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 17l5-5 4 3 7-8M14 7h6v6" /></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-bold text-gray-900 dark:text-white">{{ summary.stakedLuna > 0 ? 'Manage your stake' : 'Put NIM to work' }}</p>
            <p class="mt-0.5 text-xs text-gray-500">{{ summary.stakedLuna > 0 ? `${formatNim(summary.stakedLuna)} NIM currently staked` : 'Choose a validator and stake from your wallet' }}</p>
          </div>
          <span class="rounded-xl bg-[#1F2348] px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-[#0582CA]">{{ summary.stakedLuna > 0 ? 'View stake' : 'Stake NIM' }}</span>
        </button>
        <p class="-mt-3 px-1 text-[11px] leading-4 text-gray-400">Staking involves network lockup periods. Rewards vary by validator and are not guaranteed.</p>

        <section class="overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-[#252525] dark:bg-[#151515]">
          <div class="flex items-center justify-between px-4 pb-2 pt-4">
            <div><h2 class="font-bold text-gray-900 dark:text-white">Recent activity</h2><p class="mt-0.5 text-xs text-gray-500">Your latest confirmed earnings</p></div>
            <span v-if="transactions.length" class="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:bg-[#252525]">{{ transactions.length }}</span>
          </div>
          <div v-if="!transactions.length" class="px-5 py-8 text-center">
            <div class="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-gray-50 text-gray-400 dark:bg-[#202020]">↗</div>
            <p class="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Your first earning starts here</p>
            <p class="mt-1 text-xs text-gray-500">Publish an article or share a request to start earning NIM.</p>
            <button class="mt-4 rounded-xl bg-[#1F2348] px-4 py-2.5 text-xs font-semibold text-white" @click="router.push('/write')">Write an article</button>
          </div>
          <ul v-else class="divide-y divide-gray-100 dark:divide-[#252525]">
            <li v-for="(tx, index) in transactions" :key="`${tx.created_at}-${tx.type}-${index}`" class="flex items-center gap-3 px-4 py-3.5">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gray-50 text-sm font-bold text-[#0582CA] dark:bg-[#202020]">{{ tx.type === 'tip' ? '＋' : tx.type === 'request' ? '✎' : tx.type === 'subscription' ? '↻' : '▤' }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ tx.label || transactionLabel(tx.type) }}</p>
                <p class="mt-0.5 text-xs text-gray-500">{{ transactionLabel(tx.type) }} · {{ new Date(tx.created_at).toLocaleDateString() }}</p>
              </div>
              <div class="text-right">
                <p class="whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-400">+{{ formatNim(tx.amount_luna) }} <span class="text-[10px]">NIM</span></p>
                <p class="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">{{ tx.status }}</p>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>
