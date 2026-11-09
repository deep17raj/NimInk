<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/composables/useApi'
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
const showSubmit = ref(false)
const userArticles = ref<any[]>([])
const selectedArticleId = ref('')
const showPayConfirm = ref(false)
const payLoading = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const isRequester = computed(() => request.value?.requesterId === auth.user?.id)

onMounted(async () => {
  try {
    const data = await api.get<{ request: any; submissions: any[] }>(`/api/requests/${route.params.id}`)
    request.value = data.request
    submissions.value = data.submissions

    const rep = await api.get<any>(`/api/requests/${route.params.id}/reputation?requesterId=${data.request.requesterId}`)
    reputation.value = rep
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function openSubmitDraft() {
  try {
    const { articles } = await api.get<{ articles: any[] }>(`/api/articles/user/${auth.user!.id}`)
    userArticles.value = articles
    showSubmit.value = true
  } catch (e) {
    console.error(e)
  }
}

async function submitDraft() {
  if (!selectedArticleId.value) return
  try {
    await api.post(`/api/requests/${request.value.id}/submit`, { articleId: selectedArticleId.value })
    toast.value = { show: true, message: 'Draft submitted!', type: 'success' }
    showSubmit.value = false
    const data = await api.get<{ request: any; submissions: any[] }>(`/api/requests/${route.params.id}`)
    request.value = data.request
    submissions.value = data.submissions
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed to submit', type: 'error' }
  }
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
    const pendingKey = `nimink_pending_reward:${auth.user?.address}:${request.value.id}:${request.value.budgetLuna}`
    try { txHash = JSON.parse(localStorage.getItem(pendingKey) || 'null')?.txHash || '' } catch {}
    if (!txHash) {
      const winnerSub = submissions.value.find(s => s.authorId === request.value.winnerId)
      if (!winnerSub) throw new Error('Winner article could not be found.')
      const { article } = await api.get<{ article: any }>(`/api/articles/${winnerSub.articleId}`)
      const payment = await wallet.sendPayment(article.authorAddress, request.value.budgetLuna)
      txHash = payment.txHash
      try { localStorage.setItem(pendingKey, JSON.stringify({ txHash })) } catch {}
    }
    await api.post(`/api/requests/${request.value.id}/pay`, { txHash })
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
            v-if="!isRequester && request.status === 'open'"
            @click="openSubmitDraft"
            class="btn-primary flex-1"
          >
            {{ t('request.submit') }}
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
    <h3 class="font-bold text-[17px] text-[#1a1a1a] dark:text-white mb-4">Select an article to submit</h3>
    <div v-if="userArticles.length === 0" class="text-[14px] text-gray-400 dark:text-gray-500 mb-4">
      You have no published articles. <button @click="router.push('/write')" class="text-nimiq-blue font-medium">Write one first</button>
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
    <button @click="submitDraft" class="btn-primary w-full" :disabled="!selectedArticleId">Submit</button>
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
