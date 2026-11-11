<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/composables/useApi'
import { t } from '@/i18n'
import { APP_NAME, APP_TAGLINE } from '@nimink/shared'

const router = useRouter()
const auth = useAuthStore()
const wallet = useWalletStore()

const showOnboarding = ref(false)
const onboardingStep = ref(0)
const showAccountPicker = ref(false)
const showNamePrompt = ref(false)
const nameInput = ref('')
const demoAccounts = ref<{ address: string; displayName: string; balanceLuna: number }[]>([])
const loading = ref(false)
const newAccountName = ref('')
const connectError = ref('')

onMounted(() => {
  if (auth.isConnected) {
    router.replace('/home')
  }
})

async function openDemoConnect() {
  loading.value = true
  try {
    const { accounts } = await api.get<{ accounts: any[] }>('/api/demo/accounts')
    demoAccounts.value = accounts
    showAccountPicker.value = true
  } catch (e: any) {
    console.error(e)
    connectError.value = e?.error || 'Could not connect to the NimInk server. Please try again.'
  } finally {
    loading.value = false
  }
}

async function startConnect() {
  connectError.value = ''
  if (auth.isDemo) return openDemoConnect()
  loading.value = true
  try {
    const signedInUser = await auth.connectNimiq()
    await wallet.fetchBalance()
    if (signedInUser.displayName === signedInUser.address.slice(0, 12)) {
      showNamePrompt.value = true
    } else if (!localStorage.getItem('nimink_onboarded')) {
      showOnboarding.value = true
    } else {
      router.push('/home')
    }
  } catch (e: any) {
    if (e?.code === 'PERMISSION_DENIED' || e?.type === 'PERMISSION_DENIED') {
      connectError.value = 'Sign-in was cancelled in Nimiq Pay. Tap Connect to try again.'
    } else if (e?.error) {
      connectError.value = e.error
    } else if (e instanceof TypeError) {
      connectError.value = 'Could not reach the NimInk server. Check that the API and tunnel are running, then try again.'
    } else if (e?.message) {
      connectError.value = e.message
    } else {
      connectError.value = 'Nimiq Pay wallet access was not available. Reopen NimInk from Nimiq Pay and try again.'
    }
  } finally {
    loading.value = false
  }
}

async function selectAccount(account: { address: string; displayName: string }) {
  loading.value = true
  try {
    await auth.connectDemo(account.address, account.displayName)
    await wallet.fetchBalance()

    const hasOnboarded = localStorage.getItem('nimink_onboarded')
    if (!hasOnboarded) {
      showAccountPicker.value = false
      showOnboarding.value = true
    } else {
      router.push('/home')
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function createNewAccount() {
  if (!newAccountName.value.trim()) return
  loading.value = true
  try {
    const { address, balanceLuna } = await api.post<{ address: string; balanceLuna: number }>('/api/demo/accounts', {
      displayName: newAccountName.value.trim(),
    })
    await selectAccount({ address, displayName: newAccountName.value.trim() })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function confirmName() {
  if (!nameInput.value.trim()) return
  loading.value = true
  try {
    await auth.updateDisplayName(nameInput.value.trim())
    showNamePrompt.value = false
    if (!localStorage.getItem('nimink_onboarded')) showOnboarding.value = true
    else router.push('/home')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function finishOnboarding() {
  try { localStorage.setItem('nimink_onboarded', '1') } catch {}
  router.push('/home')
}

function nextStep() {
  if (onboardingStep.value < 2) {
    onboardingStep.value++
  } else {
    finishOnboarding()
  }
}

const onboardingIcons = [
  'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
]

const onboardingSteps = [
  { title: 'Write', desc: () => t('onboarding.step1') },
  { title: 'Earn', desc: () => t('onboarding.step2') },
  { title: 'Stake', desc: () => t('onboarding.step3') },
]
</script>

<template>
  <!-- Splash -->
  <div v-if="!showOnboarding && !showAccountPicker && !showNamePrompt" class="flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
    <div class="mb-12">
      <div class="w-16 h-16 rounded-2xl bg-[#1a1a1a] dark:bg-white flex items-center justify-center mx-auto mb-6">
        <span class="text-2xl font-bold text-white dark:text-[#1a1a1a]">N</span>
      </div>
      <h1 class="text-[32px] font-bold text-[#1a1a1a] dark:text-white tracking-tight">{{ APP_NAME }}</h1>
      <p class="text-[#0582CA] font-semibold mt-1 text-[16px]">{{ APP_TAGLINE }}</p>
    </div>

    <p class="text-gray-400 dark:text-gray-500 mb-10 max-w-[280px] text-[14px] leading-relaxed">{{ t('splash.subtitle') }}</p>

    <button @click="startConnect" class="btn-primary w-full max-w-[320px] text-[15px] py-3.5" :disabled="loading">
      {{ loading ? t('common.loading') : auth.isDemo ? t('splash.connect') : 'Sign in with Nimiq Pay' }}
    </button>

    <p v-if="connectError" role="alert" class="mt-4 max-w-[320px] text-[13px] text-red-600">{{ connectError }}</p>
    <p v-else class="mt-4 max-w-[320px] text-[12px] text-gray-400 dark:text-gray-500">
      {{ auth.isDemo ? 'Demo mode — no real money involved' : 'Your keys stay in Nimiq Pay. Sign-in confirms your wallet address.' }}
    </p>
  </div>

  <!-- Name prompt -->
  <div v-if="showNamePrompt" class="flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
    <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center mx-auto mb-6">
      <svg class="w-7 h-7 text-[#1a1a1a] dark:text-white" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    </div>
    <h2 class="text-[22px] font-bold mb-2 text-[#1a1a1a] dark:text-white">What should we call you?</h2>
    <p class="text-gray-400 dark:text-gray-500 mb-8 max-w-[280px] text-[14px] leading-relaxed">
      This name is shown on your articles and comments instead of your wallet address.
    </p>
    <input
      v-model="nameInput"
      class="input w-full max-w-[320px] text-[15px] mb-4"
      placeholder="Your name or username"
      maxlength="40"
      @keyup.enter="confirmName"
    />
    <button @click="confirmName" class="btn-primary w-full max-w-[320px] text-[15px] py-3.5" :disabled="loading || !nameInput.trim()">
      {{ loading ? t('common.loading') : 'Continue' }}
    </button>
  </div>

  <!-- Account Picker -->
  <div v-if="showAccountPicker" class="min-h-[100dvh] px-5 pt-16">
    <h2 class="text-[22px] font-bold mb-1 text-center text-[#1a1a1a] dark:text-white">Choose account</h2>
    <p class="text-[14px] text-gray-400 dark:text-gray-500 text-center mb-8">Each account starts with 1,000 demo NIM</p>

    <div class="space-y-2 mb-6">
      <button
        v-for="acct in demoAccounts"
        :key="acct.address"
        @click="selectAccount(acct)"
        class="w-full text-left flex items-center gap-3 py-4 px-4 rounded-2xl border border-gray-100 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#444] transition-colors"
        :disabled="loading"
      >
        <div class="avatar-md">{{ acct.displayName[0] }}</div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-[15px] text-[#1a1a1a] dark:text-white">{{ acct.displayName }}</div>
          <div class="text-[12px] text-gray-400 dark:text-gray-500 truncate font-mono">{{ acct.address }}</div>
        </div>
        <div class="text-[14px] font-medium text-gray-500 dark:text-gray-400">
          {{ (acct.balanceLuna / 100000).toFixed(0) }}
          <span class="demo-badge text-[10px] ml-1">demo</span>
        </div>
      </button>
    </div>

    <div class="border-t border-gray-100 dark:border-[#2a2a2a] pt-6">
      <p class="text-[14px] font-semibold mb-3 text-[#1a1a1a] dark:text-white">Create new account</p>
      <div class="flex gap-2">
        <input v-model="newAccountName" class="input flex-1 text-[14px]" placeholder="Display name" />
        <button @click="createNewAccount" class="btn-primary px-6 text-[14px]" :disabled="loading || !newAccountName.trim()">
          Create
        </button>
      </div>
    </div>
  </div>

  <!-- Onboarding -->
  <div v-if="showOnboarding" class="flex flex-col items-center justify-center min-h-[100dvh] px-6">
    <div class="text-center mb-12">
      <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center mx-auto mb-6">
        <svg class="w-7 h-7 text-[#1a1a1a] dark:text-white" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" :d="onboardingIcons[onboardingStep]" /></svg>
      </div>
      <h2 class="text-[24px] font-bold mb-2 text-[#1a1a1a] dark:text-white">{{ onboardingSteps[onboardingStep].title }}</h2>
      <p class="text-gray-400 dark:text-gray-500 text-[14px] leading-relaxed max-w-[280px] mx-auto">{{ onboardingSteps[onboardingStep].desc() }}</p>
    </div>

    <div class="flex gap-1.5 mb-8">
      <div
        v-for="i in 3"
        :key="i"
        class="h-1 rounded-full transition-all duration-300"
        :class="i - 1 === onboardingStep ? 'bg-[#1a1a1a] dark:bg-white w-5' : 'bg-gray-200 dark:bg-gray-700 w-1.5'"
      />
    </div>

    <div class="flex gap-3 w-full max-w-[280px]">
      <button @click="finishOnboarding" class="btn-secondary flex-1 text-[14px]">{{ t('onboarding.skip') }}</button>
      <button @click="nextStep" class="btn-primary flex-1 text-[14px]">
        {{ onboardingStep < 2 ? t('onboarding.next') : t('onboarding.start') }}
      </button>
    </div>
  </div>
</template>
