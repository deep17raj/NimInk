<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { t } from '@/i18n'

const props = defineProps<{
  amountNim: number
  recipient: string
  loading: boolean
}>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const auth = useAuthStore()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-end justify-center">
      <div class="absolute inset-0 bg-black/30" @click="emit('cancel')" />
      <div class="relative bg-white dark:bg-[#1a1a1a] rounded-t-3xl w-full max-w-[430px] p-6 pb-safe-bottom shadow-2xl">
        <div class="w-8 h-1 bg-gray-200 dark:bg-[#333] rounded-full mx-auto mb-6" />

        <div v-if="auth.isDemo" class="demo-badge mb-4 mx-auto w-fit">Demo wallet</div>

        <div class="text-center mb-6">
          <p class="text-[36px] font-bold text-[#1a1a1a] dark:text-white tracking-tight">{{ amountNim }} NIM</p>
          <p v-if="auth.isDemo" class="text-[12px] text-amber-600 mt-1">(demo)</p>
        </div>

        <div class="rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-4 mb-6 space-y-3 text-[14px]">
          <div class="flex justify-between">
            <span class="text-gray-400 dark:text-gray-500">To</span>
            <span class="font-semibold text-[#1a1a1a] dark:text-white">{{ recipient }}</span>
          </div>
          <div class="h-px bg-gray-100 dark:bg-[#2a2a2a]" />
          <div class="flex justify-between">
            <span class="text-gray-400 dark:text-gray-500">Fee</span>
            <span class="font-semibold text-[#1a1a1a] dark:text-white">0 NIM</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button @click="emit('cancel')" class="btn-secondary flex-1 text-[14px]" :disabled="loading">
            {{ t('common.cancel') }}
          </button>
          <button @click="emit('confirm')" class="btn-primary flex-1 text-[14px]" :disabled="loading">
            {{ loading ? t('common.loading') : t('common.approve') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
