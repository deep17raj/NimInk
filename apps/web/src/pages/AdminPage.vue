<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/composables/useApi'
import Toast from '@/components/Toast.vue'

const reports = ref<any[]>([])
const flags = ref<any>({ deviceClusters: [], ipClusters: [] })
const loading = ref(true)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

onMounted(async () => {
  try {
    const [r, f] = await Promise.all([
      api.get<{ reports: any[] }>('/api/admin/reports'),
      api.get<any>('/api/admin/flags'),
    ])
    reports.value = r.reports
    flags.value = f
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function hideContent(reportId: string) {
  try {
    await api.post(`/api/admin/reports/${reportId}/hide`)
    reports.value = reports.value.filter(r => r.id !== reportId)
    toast.value = { show: true, message: 'Content hidden', type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed', type: 'error' }
  }
}

async function restoreContent(reportId: string) {
  try {
    await api.post(`/api/admin/reports/${reportId}/restore`)
    reports.value = reports.value.filter(r => r.id !== reportId)
    toast.value = { show: true, message: 'Content restored', type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed', type: 'error' }
  }
}
</script>

<template>
  <div class="px-4 pt-12 pb-8">
    <h1 class="text-xl font-bold mb-6">Admin</h1>

    <!-- Reports -->
    <h2 class="font-semibold mb-3">Pending Reports ({{ reports.length }})</h2>
    <div v-if="reports.length === 0" class="text-sm text-gray-400 mb-6">No pending reports</div>
    <div v-else class="space-y-2 mb-6">
      <div v-for="r in reports" :key="r.id" class="card">
        <div class="flex items-start justify-between mb-2">
          <div>
            <p class="text-sm font-medium capitalize">{{ r.reason }} — {{ r.targetType }}</p>
            <p class="text-xs text-gray-400">by {{ r.reporterName }} · {{ new Date(r.createdAt).toLocaleDateString() }}</p>
          </div>
        </div>
        <p v-if="r.details" class="text-xs text-gray-500 mb-2">{{ r.details }}</p>
        <div class="flex gap-2">
          <button @click="hideContent(r.id)" class="btn-outline text-xs px-3 py-1.5 text-red-500 border-red-200">Hide</button>
          <button @click="restoreContent(r.id)" class="btn-outline text-xs px-3 py-1.5">Dismiss</button>
        </div>
      </div>
    </div>

    <!-- Fraud flags -->
    <h2 class="font-semibold mb-3">Fraud Flags</h2>
    <div v-if="flags.deviceClusters.length === 0 && flags.ipClusters.length === 0" class="text-sm text-gray-400">No suspicious clusters detected</div>
    <div v-else class="space-y-2">
      <div v-for="c in flags.deviceClusters" :key="c.device_hash" class="card text-sm">
        Device {{ c.device_hash.slice(0, 8) }}... — {{ c.wallet_count }} wallets
      </div>
      <div v-for="c in flags.ipClusters" :key="c.ip_hash" class="card text-sm">
        IP {{ c.ip_hash.slice(0, 8) }}... — {{ c.wallet_count }} wallets
      </div>
    </div>
  </div>

  <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
</template>
