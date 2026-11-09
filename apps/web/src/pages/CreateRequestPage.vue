<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/composables/useApi'
import { nimToLuna } from '@nimink/shared'
import { t } from '@/i18n'
import TopBar from '@/components/TopBar.vue'
import Toast from '@/components/Toast.vue'

const router = useRouter()
const topic = ref('')
const description = ref('')
const budgetNim = ref(50)
const deadline = ref('')
const saving = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

async function create() {
  if (!topic.value.trim() || !budgetNim.value || !deadline.value) {
    toast.value = { show: true, message: 'Fill all required fields', type: 'error' }
    return
  }
  saving.value = true
  try {
    const { request } = await api.post<{ request: any }>('/api/requests', {
      topic: topic.value.trim(),
      description: description.value.trim(),
      budgetLuna: nimToLuna(budgetNim.value),
      deadline: new Date(deadline.value).toISOString(),
    })
    toast.value = { show: true, message: 'Request created!', type: 'success' }
    setTimeout(() => router.push(`/requests/${request.id}`), 800)
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed', type: 'error' }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh]">
    <TopBar :title="t('request.create')" />

    <div class="px-5 pb-8">
      <label class="block text-[13px] font-semibold text-[#1a1a1a] dark:text-white mb-1.5">Topic</label>
      <input
        v-model="topic"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white text-[15px] placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors mb-4"
        placeholder="What do you want written about?"
        maxlength="200"
      />

      <label class="block text-[13px] font-semibold text-[#1a1a1a] dark:text-white mb-1.5">Description</label>
      <textarea
        v-model="description"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white text-[15px] placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors min-h-[120px] resize-y mb-4"
        placeholder="Details, requirements, style preferences..."
      />

      <label class="block text-[13px] font-semibold text-[#1a1a1a] dark:text-white mb-1.5">{{ t('request.budget') }} (NIM)</label>
      <input
        v-model.number="budgetNim"
        type="number"
        min="1"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white text-[15px] focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors mb-4"
      />

      <label class="block text-[13px] font-semibold text-[#1a1a1a] dark:text-white mb-1.5">{{ t('request.deadline') }}</label>
      <input
        v-model="deadline"
        type="date"
        :min="minDate"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white text-[15px] focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors mb-8"
      />

      <button @click="create" class="btn-primary w-full" :disabled="saving">
        {{ saving ? t('common.loading') : t('request.create') }}
      </button>
    </div>
  </div>

  <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
</template>
