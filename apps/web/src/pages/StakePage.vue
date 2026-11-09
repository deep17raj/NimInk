<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/composables/useApi'
import { formatNim, MIN_STAKE_NIM, nimToLuna } from '@nimink/shared'
import { t } from '@/i18n'
import TopBar from '@/components/TopBar.vue'
import PaymentConfirm from '@/components/PaymentConfirm.vue'
import Toast from '@/components/Toast.vue'

const auth = useAuthStore()
const wallet = useWalletStore()

const validators = ref<any[]>([])
const myStakes = ref<any[]>([])
const loading = ref(true)
const loadError = ref('')
const selectedValidator = ref<any>(null)
const stakeAmount = ref(MIN_STAKE_NIM)
const showConfirm = ref(false)
const stakeLoading = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const activeStakes = computed(() => myStakes.value.filter((stake) => stake.status === 'active'))
const totalStakedLuna = computed(() => activeStakes.value.reduce((sum, stake) => sum + Number(stake.amountLuna || 0), 0))
const totalRewardsLuna = computed(() => myStakes.value.reduce((sum, stake) => sum + Number(stake.rewardsLuna || 0), 0))
const isFirstStake = computed(() => activeStakes.value.length === 0)
const minAmount = computed(() => isFirstStake.value ? MIN_STAKE_NIM : 1)
const amountLuna = computed(() => Number.isFinite(stakeAmount.value) ? nimToLuna(stakeAmount.value) : 0)
const canStake = computed(() => !!selectedValidator.value && stakeAmount.value >= minAmount.value && amountLuna.value <= wallet.balance && !stakeLoading.value)

async function loadStakeData() {
  loading.value = true
  loadError.value = ''
  try {
    const [v, s] = await Promise.all([
      api.get<{ validators: any[] }>('/api/staking/validators'),
      api.get<{ stakes: any[] }>('/api/staking/my-stakes'),
      wallet.fetchBalance(),
    ])
    validators.value = v.validators
    myStakes.value = s.stakes
    if (!selectedValidator.value && v.validators.length > 0) selectedValidator.value = v.validators[0]
  } catch (e: any) {
    loadError.value = e?.error || 'Could not load validators and your stake.'
  } finally {
    loading.value = false
  }
}

onMounted(loadStakeData)

async function confirmStake() {
  if (!canStake.value) return
  stakeLoading.value = true
  try {
    const { txHash } = await wallet.sendStake(selectedValidator.value.address, nimToLuna(stakeAmount.value))
    await api.post('/api/staking/stake', {
      validatorId: selectedValidator.value.id,
      amountLuna: nimToLuna(stakeAmount.value),
      txHash,
    })
    showConfirm.value = false
    toast.value = { show: true, message: t('stake.success'), type: 'success' }
    await loadStakeData()
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Staking failed', type: 'error' }
  } finally {
    stakeLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh]">
    <TopBar :title="t('stake.title')" />

    <div class="px-5 pb-8">
      <div v-if="loading" class="space-y-3 py-5">
        <div class="skeleton h-28 rounded-2xl" />
        <div class="skeleton h-20 rounded-2xl" />
      </div>

      <div v-else-if="loadError" class="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-950 dark:bg-red-950/20">
        <p class="text-sm font-semibold text-red-700 dark:text-red-300">{{ loadError }}</p>
        <button class="mt-2 text-xs font-semibold text-red-700 underline dark:text-red-300" @click="loadStakeData">Try again</button>
      </div>

      <template v-if="!loading && !loadError">
      <div class="mb-5 grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-[#1F2348] p-4 text-white">
          <p class="text-xs text-blue-100">Currently staked</p>
          <p class="mt-1 text-xl font-bold">{{ formatNim(totalStakedLuna) }} <span class="text-xs font-medium text-blue-100">NIM</span></p>
        </div>
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
          <p class="text-xs text-emerald-700 dark:text-emerald-300">Demo rewards earned</p>
          <p class="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-200">{{ formatNim(totalRewardsLuna) }} <span class="text-xs font-medium">NIM</span></p>
        </div>
      </div>

      <!-- Warning -->
      <div class="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 mb-6">
        <p class="text-[14px] text-amber-800 dark:text-amber-200">{{ t('stake.warning') }}</p>
        <p v-if="auth.isDemo" class="text-[12px] text-amber-600 dark:text-amber-400 mt-1">Demo mode: rewards are simulated and accelerated.</p>
      </div>

      <!-- Existing stakes -->
      <div v-if="myStakes.length > 0" class="mb-6">
        <h2 class="section-title mb-3">Your stakes</h2>
        <div class="space-y-3">
          <div v-for="stake in myStakes" :key="stake.id" class="card">
            <div class="flex items-center justify-between mb-1">
              <span class="font-semibold text-[14px] text-[#1a1a1a] dark:text-white">{{ stake.validatorName }}</span>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">{{ stake.status }}</span>
            </div>
            <div class="flex items-center justify-between text-[13px]">
              <span class="text-gray-500 dark:text-gray-400">Staked: {{ formatNim(stake.amountLuna) }} NIM</span>
              <span class="text-green-600 dark:text-green-400 font-medium">+{{ formatNim(stake.rewardsLuna) }} rewards</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Validator selection -->
      <h2 class="section-title mb-3">{{ t('stake.validator') }}</h2>
      <div class="space-y-3 mb-6">
        <div v-if="validators.length === 0" class="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500 dark:border-[#2a2a2a] dark:bg-[#1a1a1a]">No validators are available right now.</div>
        <button
          v-for="v in validators"
          :key="v.id"
          @click="selectedValidator = v"
          class="w-full text-left rounded-2xl p-4 border-2 transition-all"
          :class="selectedValidator?.id === v.id
            ? 'border-[#1a1a1a] dark:border-white bg-gray-50 dark:bg-white/5'
            : 'border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a]'"
        >
          <div class="flex items-center gap-3">
            <!-- Checkmark circle -->
            <div
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
              :class="selectedValidator?.id === v.id
                ? 'border-[#1a1a1a] dark:border-white bg-[#1a1a1a] dark:bg-white'
                : 'border-gray-300 dark:border-gray-600'"
            >
              <svg v-if="selectedValidator?.id === v.id" class="w-3.5 h-3.5 text-white dark:text-[#1a1a1a]" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="font-semibold text-[14px] text-[#1a1a1a] dark:text-white">{{ v.name }}</span>
                <span class="text-[12px] text-gray-400 dark:text-gray-500">Fee: {{ (v.fee * 100).toFixed(0) }}%</span>
              </div>
              <div class="flex items-center justify-between text-[12px] text-gray-400 dark:text-gray-500">
                <span>{{ v.payoutType === 'restake' ? 'Auto-restake' : 'Direct payout' }}</span>
                <span>Trust: {{ (v.trustScore * 100).toFixed(0) }}%</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      <!-- Amount -->
      <h2 class="section-title mb-2">{{ t('stake.amount') }}</h2>
      <p class="text-[12px] text-gray-400 dark:text-gray-500 mb-2">{{ t('stake.min') }}</p>
      <input
        v-model.number="stakeAmount"
        type="number"
        :min="minAmount"
        :max="wallet.balance / 100000"
        step="1"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white text-[15px] focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors mb-2"
      />
      <p class="text-[12px] text-gray-400 dark:text-gray-500 mb-6">
        Available: {{ formatNim(wallet.balance) }} NIM<span v-if="stakeAmount > wallet.balance / 100000" class="ml-1 text-red-500">· Amount exceeds balance</span>
      </p>

      <button @click="showConfirm = true" class="btn-primary w-full" :disabled="!canStake">
        {{ stakeAmount < minAmount ? `Minimum ${minAmount} NIM` : 'Review stake' }}
      </button>

      <!-- Exit explainer -->
      <div class="mt-8 rounded-2xl border border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#1a1a1a] p-4">
        <p class="font-semibold text-[13px] text-gray-500 dark:text-gray-400 mb-2">How to exit a stake:</p>
        <div class="text-[12px] text-gray-400 dark:text-gray-500 space-y-1">
          <p>1. Deactivate your stake</p>
          <p>2. Wait one full epoch</p>
          <p>3. Retire the stake</p>
          <p>4. Remove to get your NIM back</p>
        </div>
      </div>
      </template>
    </div>
  </div>

  <PaymentConfirm
    v-if="showConfirm"
    :amount-nim="stakeAmount"
    :recipient="selectedValidator?.name || 'Validator'"
    :loading="stakeLoading"
    @confirm="confirmStake"
    @cancel="showConfirm = false"
  />

  <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
</template>
