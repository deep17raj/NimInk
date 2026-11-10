<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/composables/useApi'
import { verifyPaymentUntilSettled } from '@/composables/usePaymentVerification'
import { createPaymentIntent } from '@/composables/usePaymentIntent'
import { renderMarkdown } from '@/composables/useMarkdown'
import { formatNim, TIP_PRESETS_NIM, nimToLuna } from '@nimink/shared'
import { t } from '@/i18n'
import BottomSheet from '@/components/BottomSheet.vue'
import PaymentConfirm from '@/components/PaymentConfirm.vue'
import Toast from '@/components/Toast.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const wallet = useWalletStore()

const article = ref<any>(null)
const loading = ref(true)
const error = ref('')
const readCountError = ref('')
const bookmarked = ref(false)

const showTip = ref(false)
const tipAmount = ref(0)
const tipNote = ref('')
const showPaymentConfirm = ref(false)
const tipLoading = ref(false)
const showPremiumConfirm = ref(false)
const premiumLoading = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const showReport = ref(false)
const reportReason = ref('')

const renderedBody = computed(() => article.value ? renderMarkdown(article.value.body) : '')
const isOwnArticle = computed(() => article.value?.authorId === auth.user?.id)
const premiumPriceLuna = computed(() => article.value?.accessType === 'subscription'
  ? Number(article.value?.authorSubscriptionPriceLuna || 0)
  : Number(article.value?.priceLuna || 0))

const initials = computed(() => {
  if (!article.value) return '?'
  return article.value.authorName.charAt(0).toUpperCase()
})

const timeAgo = computed(() => {
  if (!article.value?.createdAt) return ''
  const diff = Date.now() - new Date(article.value.createdAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(article.value.createdAt).toLocaleDateString()
})

const readCountRequests = new Set<string>()
const countedReadKeys = new Set<string>()

watch(
  () => [article.value?.id, auth.user?.id, article.value?.locked] as const,
  ([articleId, userId, locked]) => {
    // Premium articles the reader hasn't paid for only ever show the locked
    // preview — don't count a read until `locked` turns false (i.e. they
    // bought access) or the article was free all along.
    if (articleId && userId && !locked) void countArticleRead(articleId, userId)
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    const { article: a } = await api.get<{ article: any }>(`/api/articles/${route.params.id}`)
    article.value = a
  } catch (e: any) {
    error.value = e.error || 'Failed to load article'
  } finally {
    loading.value = false
  }
})

async function countArticleRead(articleId: string, userId: string) {
  const key = `${articleId}:${userId}`
  if (countedReadKeys.has(key) || readCountRequests.has(key)) return
  readCountRequests.add(key)
  readCountError.value = ''
  try {
    const result = await api.post<{
      counted: boolean
      alreadyRead?: boolean
      locked?: boolean
      verifiedReadCount: number
    }>('/api/reads/count', {
      articleId,
    })
    // Don't latch `locked` responses into countedReadKeys: if the reader
    // buys access later, `locked` flips to false and this should retry.
    if (!result.locked) countedReadKeys.add(key)
    if (article.value?.id === articleId && auth.user?.id === userId) {
      article.value.verifiedReadCount = result.verifiedReadCount
    }
  } catch (e: any) {
    readCountError.value = e.error || 'Could not count this read. Try again.'
  } finally {
    readCountRequests.delete(key)
  }
}

function retryReadCount() {
  const articleId = article.value?.id
  const userId = auth.user?.id
  if (articleId && userId) void countArticleRead(articleId, userId)
}

/**
 * Removes pre-reference pending payments. Those transactions carry no
 * payment reference, so the server can never match them to this account —
 * keeping them would make every retry fail instead of sending a fresh,
 * verifiable payment.
 */
function clearLegacyPending(prefix: string, suffix: string) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix) && key.endsWith(suffix)) localStorage.removeItem(key)
    }
  } catch { /* storage unavailable; nothing to clean up */ }
}

async function confirmPremiumPurchase() {
  if (!article.value || premiumPriceLuna.value <= 0) return
  if (!auth.isConnected) {
    toast.value = { show: true, message: 'Sign in with your wallet to unlock this article.', type: 'error' }
    return
  }

  premiumLoading.value = true
  toast.value.show = false
  const amountLuna = premiumPriceLuna.value
  const pendingKey = `nimink_pending_access_v2:${article.value.id}:${amountLuna}`
  clearLegacyPending('nimink_pending_access:', `:${article.value.id}:${amountLuna}`)
  let txHash = ''
  let intentId = ''
  try {
    let pending: { txHash: string; intentId: string } | null = null
    try { pending = JSON.parse(localStorage.getItem(pendingKey) || 'null') } catch {}
    if (pending?.txHash && pending.intentId) {
      txHash = pending.txHash
      intentId = pending.intentId
    } else {
      const purpose = article.value.accessType === 'subscription' ? 'subscription' : 'article'
      const intent = await createPaymentIntent(purpose, article.value.id, amountLuna)
      intentId = intent.intentId
      const payment = await wallet.sendPayment(intent.recipient, intent.amountLuna, intent.reference)
      txHash = payment.txHash
      try { localStorage.setItem(pendingKey, JSON.stringify({ txHash, intentId })) } catch {}
    }

    await verifyPaymentUntilSettled(() => api.post<{
      status?: string
      accessGranted?: boolean
      expiresAt?: string | null
    }>(`/api/monetization/articles/${article.value.id}/unlock`, { txHash, intentId }))
    showPremiumConfirm.value = false
    const { article: updated } = await api.get<{ article: any }>(`/api/articles/${article.value.id}`)
    article.value = updated
    try { localStorage.removeItem(pendingKey) } catch {}
    toast.value = { show: true, message: 'Premium access unlocked.', type: 'success' }
  } catch (e: any) {
    toast.value = {
      show: true,
      message: txHash
        ? `${e.error || 'NimInk could not confirm the payment yet.'} Your NIM was sent. Tap confirm again to retry recording without sending another payment.`
        : e.error || e.message || 'Payment failed',
      type: 'error',
    }
  } finally {
    premiumLoading.value = false
  }
}

function selectTipAmount(nim: number) {
  tipAmount.value = nim
  showPaymentConfirm.value = true
}

async function confirmTip() {
  if (!article.value || tipAmount.value <= 0) return
  toast.value.show = false
  tipLoading.value = true
  let txHash = ''
  let recorded = false
  try {
    const amountLuna = nimToLuna(tipAmount.value)
    // v2 keys carry the intent id. v1 entries were paid without a payment
    // reference, so they can never verify — drop them instead of retrying.
    const pendingKey = `nimink_pending_tip_v2:${article.value.id}:${amountLuna}`
    clearLegacyPending('nimink_pending_tip:', `:${article.value.id}:${amountLuna}`)
    let pending: { txHash: string; note: string; intentId: string } | null = null
    try { pending = JSON.parse(localStorage.getItem(pendingKey) || 'null') } catch {}

    let intentId = pending?.intentId || ''
    if (pending?.txHash && intentId) {
      txHash = pending.txHash
    } else {
      // The server issues the reference and the recipient; the wallet writes
      // the reference into the transaction so the server can match it.
      const intent = await createPaymentIntent('tip', article.value.id, amountLuna)
      intentId = intent.intentId
      const payment = await wallet.sendPayment(intent.recipient, intent.amountLuna, intent.reference)
      txHash = payment.txHash
      try { localStorage.setItem(pendingKey, JSON.stringify({ txHash, note: tipNote.value, intentId })) } catch {}
    }
    await verifyPaymentUntilSettled(() => api.post<{ tipId?: string; status: string }>('/api/tips', {
      articleId: article.value.id,
      amountLuna,
      note: pending?.txHash ? pending.note : tipNote.value,
      txHash,
      intentId,
    }))
    recorded = true
    try { localStorage.removeItem(pendingKey) } catch {}

    showPaymentConfirm.value = false
    showTip.value = false
    tipNote.value = ''
    toast.value = { show: true, message: t('tip.success'), type: 'success' }

    try {
      const { article: updated } = await api.get<{ article: any }>(`/api/articles/${article.value.id}`)
      article.value = updated
    } catch { /* The tip is already recorded; keep the current article view. */ }
  } catch (e: any) {
    toast.value = {
      show: true,
      message: recorded
        ? 'Tip recorded. The article could not refresh.'
        : txHash
          ? `${e.error || 'NimInk could not confirm the tip yet.'} Your NIM was sent. Tap confirm again to retry recording without sending another payment.`
          : e.error || e.message || 'Tip failed',
      type: recorded ? 'success' : 'error',
    }
  } finally {
    tipLoading.value = false
  }
}

async function submitReport() {
  if (!reportReason.value) return
  try {
    await api.post('/api/reports', {
      targetType: 'article',
      targetId: article.value.id,
      reason: reportReason.value,
    })
    showReport.value = false
    toast.value = { show: true, message: 'Report submitted', type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed to report', type: 'error' }
  }
}
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="px-6 pt-16">
    <div class="skeleton h-7 w-4/5 mb-3" />
    <div class="skeleton h-7 w-3/5 mb-6" />
    <div class="flex items-center gap-3 mb-8">
      <div class="skeleton w-9 h-9 rounded-full" />
      <div class="skeleton h-3 w-24" />
    </div>
    <div v-for="i in 8" :key="i" class="skeleton h-4 w-full mb-3" />
  </div>

  <!-- Error -->
  <div v-else-if="error" class="flex flex-col items-center justify-center min-h-[60dvh] px-6 text-center">
    <p class="text-gray-400 dark:text-gray-500 mb-4 text-[15px]">{{ error }}</p>
    <button @click="router.back()" class="btn-secondary text-sm">{{ t('common.back') }}</button>
  </div>

  <!-- Article -->
  <div v-else-if="article" class="pb-32">
    <!-- Top bar -->
    <div class="sticky top-0 z-40 border-b border-gray-100/80 bg-white/90 backdrop-blur-xl dark:border-[#252525] dark:bg-[#111]/90">
      <div class="flex items-center justify-between px-5 py-3">
        <button @click="router.back()" class="icon-btn">
          <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div class="flex items-center gap-1">
          <button @click="bookmarked = !bookmarked" class="icon-btn">
            <svg v-if="!bookmarked" class="w-[22px] h-[22px]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            <svg v-else class="w-[22px] h-[22px] text-[#1a1a1a] dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          </button>
          <button @click="router.push('/home')" class="icon-btn">
            <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </button>
        </div>
      </div>
    </div>

    <div class="px-6">
      <!-- Title -->
      <h1 class="font-serif text-[26px] font-bold leading-[1.25] mb-5 text-[#1a1a1a] dark:text-white">
        {{ article.title }}
      </h1>

      <!-- Author row -->
      <div class="flex flex-wrap items-center gap-3 mb-8">
        <button @click="router.push(`/profile/${article.authorId}`)" class="avatar-sm">
          {{ initials }}
        </button>
        <button @click="router.push(`/profile/${article.authorId}`)" class="text-[14px] font-semibold text-[#1a1a1a] dark:text-white hover:underline">
          {{ article.authorName }}
        </button>
        <span v-if="isOwnArticle" class="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300">Written by you</span>
        <span v-if="timeAgo" class="text-[13px] text-gray-400 dark:text-gray-500 ml-auto">{{ timeAgo }}</span>
      </div>

      <!-- Article body -->
      <div v-if="article.locked" class="mt-8 rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#181818] p-5">
        <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#222] px-3 py-1.5 text-[12px] font-semibold text-gray-600 dark:text-gray-300">
          <span aria-hidden="true">✦</span>
          {{ article.accessType === 'subscription' ? 'Subscriber-only article' : 'Premium article' }}
        </div>
        <div class="article-body line-clamp-5 opacity-75" v-html="renderedBody" />
        <div class="mt-5 border-t border-gray-200 dark:border-[#333] pt-4">
          <p class="text-[14px] text-gray-600 dark:text-gray-300 mb-3">
            {{ article.accessType === 'subscription'
              ? `Subscribe to ${article.authorName} for ${formatNim(premiumPriceLuna)} NIM / 30 days to read all their subscriber articles.`
              : `Unlock this article permanently for ${formatNim(premiumPriceLuna)} NIM.` }}
          </p>
          <button @click="showPremiumConfirm = true" class="btn-primary w-full">
            {{ article.accessType === 'subscription' ? 'Subscribe and read' : 'Unlock article' }}
          </button>
        </div>
      </div>
      <div v-else class="article-body" v-html="renderedBody" />

      <!-- Tags -->
      <div v-if="article.tags.length" class="flex gap-2 mt-8 flex-wrap">
        <span v-for="tag in article.tags" :key="tag" class="px-3 py-1.5 rounded-full text-[12px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#2a2a2a]">
          {{ tag }}
        </span>
      </div>

      <!-- Stats -->
      <div v-if="article.totalTipsLuna > 0 || article.verifiedReadCount > 0" class="flex items-center gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-[#2a2a2a] text-[13px] text-gray-400 dark:text-gray-500">
        <span v-if="article.verifiedReadCount > 0" class="flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          {{ article.verifiedReadCount }} reads
        </span>
        <span v-if="article.totalTipsLuna > 0" class="flex items-center gap-1.5 text-gold-600 dark:text-gold-400 font-medium">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          {{ formatNim(article.totalTipsLuna) }} NIM tipped
        </span>
      </div>

      <div v-if="readCountError" class="mt-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
        <p class="text-[13px] text-red-700 dark:text-red-300">{{ readCountError }}</p>
        <button @click="retryReadCount" class="shrink-0 text-[13px] font-semibold text-red-800 underline dark:text-red-200">Retry</button>
      </div>

      <!-- Report -->
      <button @click="showReport = true" class="text-[12px] text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 mt-8 min-h-touch transition-colors">
        Report this article
      </button>
    </div>
  </div>

  <!-- Sticky tip bar -->
  <div v-if="article && !article.locked && !isOwnArticle" class="fixed bottom-0 inset-x-0 bg-white dark:bg-[#111] border-t border-gray-100 dark:border-[#2a2a2a] p-3 pb-safe-bottom z-40 md:max-w-[414px] md:mx-auto">
    <div class="flex items-center gap-2">
      <span class="text-[14px] font-semibold text-gray-700 dark:text-gray-200 mr-auto">{{ t('tip.title') }}</span>
      <button v-for="nim in TIP_PRESETS_NIM" :key="nim" @click="selectTipAmount(nim)" class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#333] text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors text-gray-700 dark:text-gray-300">
        {{ nim }}
      </button>
      <button @click="showTip = true" class="px-3 py-1.5 rounded-lg bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] text-[13px] font-medium">
        {{ t('tip.custom') }}
      </button>
    </div>
  </div>

  <!-- Custom tip sheet -->
  <BottomSheet :show="showTip" @close="showTip = false">
    <h3 class="font-bold text-lg mb-4">{{ t('tip.title') }}</h3>
    <input v-model.number="tipAmount" type="number" class="input mb-3" placeholder="Amount in NIM" min="0.01" step="0.01" />
    <input v-model="tipNote" class="input mb-4" :placeholder="t('tip.note')" maxlength="100" />
    <button @click="showPaymentConfirm = true" class="btn-primary w-full" :disabled="!tipAmount || tipAmount <= 0">
      {{ t('tip.send') }}
    </button>
  </BottomSheet>

  <!-- Payment confirmation -->
  <PaymentConfirm
    v-if="showPaymentConfirm"
    :amount-nim="tipAmount"
    :recipient="article?.authorName"
    :loading="tipLoading"
    @confirm="confirmTip"
    @cancel="showPaymentConfirm = false"
  />

  <PaymentConfirm
    v-if="showPremiumConfirm"
    :amount-nim="premiumPriceLuna / 100000"
    :recipient="article?.authorName"
    :loading="premiumLoading"
    @confirm="confirmPremiumPurchase"
    @cancel="showPremiumConfirm = false"
  />

  <!-- Report sheet -->
  <BottomSheet :show="showReport" @close="showReport = false">
    <h3 class="font-bold text-lg mb-4">{{ t('report.title') }}</h3>
    <div class="space-y-2 mb-4">
      <button
        v-for="reason in ['illegal', 'hateful', 'sexual', 'scam', 'plagiarism', 'other']"
        :key="reason"
        @click="reportReason = reason"
        class="w-full text-left px-4 py-3.5 rounded-xl border transition-all min-h-touch capitalize text-[14px]"
        :class="reportReason === reason
          ? 'border-[#1a1a1a] bg-gray-50 dark:border-white dark:bg-white/5 font-medium'
          : 'border-gray-200 dark:border-[#333]'"
      >
        {{ reason }}
      </button>
    </div>
    <button @click="submitReport" class="btn-primary w-full" :disabled="!reportReason">
      {{ t('report.submit') }}
    </button>
  </BottomSheet>

  <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
</template>

<style>
.article-body {
  font-family: 'Lora', Georgia, 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1.8;
  color: #333;
}

.dark .article-body {
  color: #ccc;
}

.article-body h1, .article-body h2, .article-body h3,
.article-body h4, .article-body h5, .article-body h6 {
  font-family: 'Lora', Georgia, serif;
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 0.75em;
  line-height: 1.3;
  color: #1a1a1a;
}

.dark .article-body h1, .dark .article-body h2, .dark .article-body h3,
.dark .article-body h4, .dark .article-body h5, .dark .article-body h6 {
  color: #e5e5e5;
}

.article-body h1 { font-size: 1.5em; }
.article-body h2 { font-size: 1.3em; }
.article-body h3 { font-size: 1.15em; }

.article-body p {
  margin-bottom: 1.5em;
}

.article-body a {
  color: #0582CA;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.article-body blockquote {
  border-left: 3px solid #e5e5e5;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
  font-style: italic;
}

.dark .article-body blockquote {
  border-left-color: #333;
  color: #999;
}

.article-body code {
  font-size: 0.9em;
  background: #f5f5f5;
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

.dark .article-body code {
  background: #2a2a2a;
}

.article-body pre {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 12px;
  overflow-x: auto;
  margin-bottom: 1.5em;
}

.dark .article-body pre {
  background: #1a1a1a;
}

.article-body pre code {
  background: none;
  padding: 0;
}

.article-body ul, .article-body ol {
  padding-left: 1.5em;
  margin-bottom: 1.5em;
}

.article-body li {
  margin-bottom: 0.5em;
}

.article-body img {
  border-radius: 12px;
  margin: 1.5em 0;
  max-width: 100%;
}

.article-body hr {
  border: none;
  border-top: 1px solid #e5e5e5;
  margin: 2em 0;
}

.dark .article-body hr {
  border-top-color: #2a2a2a;
}
</style>
