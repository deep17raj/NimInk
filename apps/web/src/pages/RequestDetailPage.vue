<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/composables/useApi'
import { verifyPaymentUntilSettled } from '@/composables/usePaymentVerification'
import { createPaymentIntent } from '@/composables/usePaymentIntent'
import { formatNim, nimToLuna } from '@nimink/shared'
import { t } from '@/i18n'
import TopBar from '@/components/TopBar.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import PaymentConfirm from '@/components/PaymentConfirm.vue'
import Toast from '@/components/Toast.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const wallet = useWalletStore()

const request = ref<any>(null)
const submissions = ref<any[]>([])
const reputation = ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const showSubmit = ref(false)
const userArticles = ref<any[]>([])
const selectedArticleId = ref('')
const showPayConfirm = ref(false)
const payLoading = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const isRequester = computed(() => request.value?.requesterId === auth.user?.id)

let requestLoadVersion = 0

async function loadRequest() {
  const version = ++requestLoadVersion
  const requestId = String(route.params.id || '')
  loading.value = true
  loadError.value = ''
  request.value = null
  submissions.value = []
  reputation.value = null

  try {
    const data = await api.get<{ request: any; submissions: any[] }>(`/api/requests/${requestId}`)
    if (!data.request) throw { status: 404, error: 'Request not found' }
    if (version !== requestLoadVersion) return
    request.value = data.request
    submissions.value = data.submissions

    try {
      const rep = await api.get<any>(`/api/requests/${requestId}/reputation?requesterId=${data.request.requesterId}`)
      if (version === requestLoadVersion) reputation.value = rep
    } catch {
      if (version === requestLoadVersion) reputation.value = null
    }
  } catch (e: any) {
    if (version === requestLoadVersion) {
      loadError.value = e.status === 404
        ? 'This request is unavailable or may have been removed.'
        : e.error || 'Could not load this request. Check your connection and try again.'
    }
  } finally {
    if (version === requestLoadVersion) loading.value = false
  }
}

watch(() => route.params.id, () => { void loadRequest() }, { immediate: true })

async function openSubmitExisting() {
  try {
    const { articles } = await api.get<{ articles: any[] }>(`/api/articles/user/${auth.user!.id}`)
    userArticles.value = articles
    showSubmit.value = true
  } catch (e) {
    console.error(e)
  }
}

async function submitExistingArticle() {
  if (!selectedArticleId.value) return
  try {
    await api.post(`/api/requests/${request.value.id}/submit`, { articleId: selectedArticleId.value })
    toast.value = { show: true, message: 'Article submitted!', type: 'success' }
    showSubmit.value = false
    const data = await api.get<{ request: any; submissions: any[] }>(`/api/requests/${route.params.id}`)
    request.value = data.request
    submissions.value = data.submissions
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed to submit', type: 'error' }
  }
}

function writeNewArticle() {
  if (!request.value?.id) return
  router.push({ path: '/write', query: { requestId: request.value.id } })
}

async function awardSubmission(submissionId: string) {
  try {
    await api.post(`/api/requests/${request.value.id}/award`, { submissionId })
    toast.value = { show: true, message: 'Winner awarded!', type: 'success' }
    const data = await api.get<{ request: any; submissions: any[] }>(`/api/requests/${route.params.id}`)
    request.value = data.request
    submissions.value = data.submissions
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed', type: 'error' }
  }
}

async function payWinner() {
  if (!request.value?.winnerId) return
  toast.value.show = false
  payLoading.value = true
  let txHash = ''
  let recorded = false
  try {
    // v2 keys carry the intent id. v1 entries were paid without a payment
    // reference, so they can never verify — drop them instead of retrying.
    const pendingKey = `nimink_pending_reward_v2:${request.value.id}:${request.value.budgetLuna}`
    const legacySuffix = `:${request.value.id}:${request.value.budgetLuna}`
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('nimink_pending_reward:') && key.endsWith(legacySuffix)) localStorage.removeItem(key)
      }
    } catch { /* storage unavailable; nothing to clean up */ }

    let pending: { txHash: string; intentId: string } | null = null
    try { pending = JSON.parse(localStorage.getItem(pendingKey) || 'null') } catch {}
    let intentId = pending?.intentId || ''
    if (pending?.txHash && intentId) {
      txHash = pending.txHash
    } else {
      // The server resolves the winner's address and issues the reference
      // the wallet must attach to the transaction.
      const intent = await createPaymentIntent('request', request.value.id, request.value.budgetLuna)
      intentId = intent.intentId
      const payment = await wallet.sendPayment(intent.recipient, intent.amountLuna, intent.reference)
      txHash = payment.txHash
      try { localStorage.setItem(pendingKey, JSON.stringify({ txHash, intentId })) } catch {}
    }
    await verifyPaymentUntilSettled(() => api.post<{ ok?: boolean; status?: string }>(`/api/requests/${request.value.id}/pay`, { txHash, intentId }))
    recorded = true
    try { localStorage.removeItem(pendingKey) } catch {}

    showPayConfirm.value = false
    toast.value = { show: true, message: 'Payment sent!', type: 'success' }
    try {
      const data = await api.get<{ request: any; submissions: any[] }>(`/api/requests/${route.params.id}`)
      request.value = data.request
    } catch { /* The reward is already recorded; keep the current request view. */ }
  } catch (e: any) {
    toast.value = {
      show: true,
      message: recorded
        ? 'Reward recorded. The request could not refresh.'
        : txHash
          ? `${e.error || 'NimInk could not confirm the reward yet.'} Your NIM was sent. Tap confirm again to retry recording without sending another payment.`
          : e.error || e.message || 'Payment failed',
      type: recorded ? 'success' : 'error',
    }
  } finally {
    payLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh]">
    <TopBar title="Request" />

    <div class="px-5 pb-8">
      <!-- Loading -->
      <div v-if="loading" class="space-y-3 pt-2">
        <div class="skeleton h-6 w-3/4 mb-2" /><div class="skeleton h-4 w-full mb-2" /><div class="skeleton h-4 w-2/3" />
      </div>

      <div v-else-if="loadError" class="mt-6 rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center dark:border-[#2b2b2b] dark:bg-[#151515]">
        <p class="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">Request details unavailable</p>
        <p class="mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">{{ loadError }}</p>
        <div class="mt-5 flex justify-center gap-3">
          <button @click="loadRequest" class="btn-secondary px-4 py-2 text-[13px]">Try again</button>
          <button @click="router.push('/requests')" class="btn-primary px-4 py-2 text-[13px]">Back to requests</button>
        </div>
      </div>

      <div v-else-if="request" class="pt-2">
        <h1 class="text-[22px] font-bold text-[#1a1a1a] dark:text-white leading-tight mb-3">{{ request.topic }}</h1>
        <p class="text-[14px] text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">{{ request.description }}</p>

        <div class="flex items-center gap-4 text-[14px] mb-4">
          <span class="text-gold-600 dark:text-gold-400 font-semibold">{{ formatNim(request.budgetLuna) }} NIM</span>
          <span class="text-gray-400 dark:text-gray-500">Deadline: {{ new Date(request.deadline).toLocaleDateString() }}</span>
        </div>

        <div v-if="reputation" class="text-[12px] text-gray-400 dark:text-gray-500 mb-6">
          Requester: {{ request.requesterName }} · Paid on time: {{ Math.round(reputation.paidOnTimeRatio * 100) }}%
        </div>

        <div v-if="request.unpaidWarning" class="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 mb-5">
          <p class="text-red-600 dark:text-red-400 text-[14px] font-medium">{{ t('request.unpaid') }}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mb-8">
          <button
            v-if="auth.user && !isRequester && request.status === 'open'"
            @click="openSubmitExisting"
            class="btn-secondary flex-1 px-2 text-[13px]"
          >
            Submit existing
          </button>
          <button
            v-if="auth.user && !isRequester && request.status === 'open'"
            @click="writeNewArticle"
            class="btn-primary flex-1 px-2 text-[13px]"
          >
            Write new article
          </button>
          <button
            v-if="isRequester && request.status === 'awarded'"
            @click="showPayConfirm = true"
            class="btn-primary flex-1"
          >
            {{ t('request.pay') }}
          </button>
        </div>

        <!-- Submissions -->
        <h2 class="section-title mb-3">Submissions ({{ submissions.length }})</h2>
        <div v-if="submissions.length === 0" class="text-[14px] text-gray-400 dark:text-gray-500 mb-4">No submissions yet</div>
        <div v-else class="space-y-3">
          <div v-for="sub in submissions" :key="sub.id" class="card flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-[14px] text-[#1a1a1a] dark:text-white truncate">{{ sub.articleTitle }}</p>
              <p class="text-[12px] text-gray-400 dark:text-gray-500">by {{ sub.authorName }}</p>
            </div>
            <button
              v-if="isRequester && ['open', 'in_review'].includes(request.status)"
              @click="awardSubmission(sub.id)"
              class="px-3 py-1.5 rounded-lg border border-[#1a1a1a] dark:border-white text-[12px] font-medium text-[#1a1a1a] dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              {{ t('request.award') }}
            </button>
            <button @click="router.push(`/article/${sub.articleId}`)" class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#333] text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
              Read
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Submit draft sheet -->
  <BottomSheet :show="showSubmit" @close="showSubmit = false">
    <h3 class="font-bold text-[17px] text-[#1a1a1a] dark:text-white mb-4">Submit an existing article</h3>
    <div v-if="userArticles.length === 0" class="text-[14px] text-gray-400 dark:text-gray-500 mb-4">
      You have no published articles. <button @click="showSubmit = false; writeNewArticle()" class="text-nimiq-blue font-medium">Write one first</button>
    </div>
    <div v-else class="space-y-2 mb-4">
      <button
        v-for="a in userArticles"
        :key="a.id"
        @click="selectedArticleId = a.id"
        class="w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all min-h-touch text-[14px]"
        :class="selectedArticleId === a.id
          ? 'border-[#1a1a1a] dark:border-white bg-gray-50 dark:bg-white/5 font-medium'
          : 'border-gray-200 dark:border-[#333]'"
      >
        {{ a.title }}
      </button>
    </div>
    <button @click="submitExistingArticle" class="btn-primary w-full" :disabled="!selectedArticleId">Submit article</button>
  </BottomSheet>

  <!-- Payment confirm -->
  <PaymentConfirm
    v-if="showPayConfirm && request"
    :amount-nim="request.budgetLuna / 100000"
    recipient="Winner"
    :loading="payLoading"
    @confirm="payWinner"
    @cancel="showPayConfirm = false"
  />

  <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
</template>
