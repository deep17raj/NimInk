<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/composables/useApi'
import Toast from '@/components/Toast.vue'

const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const timeOffset = ref({ offsetSeconds: 0, offsetDays: 0 })

async function loadTime() {
  try {
    timeOffset.value = await api.get('/api/demo/time') as any
  } catch {}
}
loadTime()

async function fastForward(days: number) {
  try {
    timeOffset.value = await api.post('/api/demo/time/fast-forward', { days }) as any
    toast.value = { show: true, message: `Advanced ${days} day(s). Total offset: ${timeOffset.value.offsetDays} days`, type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed', type: 'error' }
  }
}

async function accrueRewards() {
  try {
    const result = await api.post('/api/staking/accrue-rewards') as any
    toast.value = { show: true, message: `Accrued ${result.accruedLuna} Luna in staking rewards`, type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed', type: 'error' }
  }
}

async function resetAll() {
  if (!confirm('Reset all demo data?')) return
  try {
    await api.post('/api/demo/reset')
    toast.value = { show: true, message: 'All demo data reset', type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed', type: 'error' }
  }
}
</script>

<template>
  <div class="px-4 pt-12 pb-8">
    <h1 class="text-xl font-bold mb-6">Developer Panel</h1>

    <div class="space-y-4">
      <div class="card">
        <h2 class="font-semibold mb-2">Time Control</h2>
        <p class="text-xs text-gray-400 mb-3">Current offset: {{ timeOffset.offsetDays }} days</p>
        <div class="flex gap-2">
          <button @click="fastForward(1)" class="btn-secondary flex-1 text-sm">+1 Day</button>
          <button @click="fastForward(7)" class="btn-secondary flex-1 text-sm">+1 Week</button>
        </div>
      </div>

      <div class="card">
        <h2 class="font-semibold mb-2">Staking</h2>
        <button @click="accrueRewards" class="btn-secondary w-full text-sm">Accrue Demo Staking Rewards</button>
      </div>

      <div class="card">
        <h2 class="font-semibold mb-2">Simulation Toggles</h2>
        <p class="text-xs text-gray-400 mb-3">These affect the demo wallet behavior</p>
        <div class="space-y-2 text-sm text-gray-500">
          <p>TODO: reject toggle, network error toggle, slow confirmation toggle, insufficient balance toggle</p>
        </div>
      </div>

      <div class="card border-red-200 dark:border-red-800">
        <h2 class="font-semibold mb-2 text-red-500">Danger Zone</h2>
        <button @click="resetAll" class="btn-outline border-red-300 text-red-500 w-full text-sm">
          Reset All Demo Data
        </button>
      </div>
    </div>
  </div>

  <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
</template>
