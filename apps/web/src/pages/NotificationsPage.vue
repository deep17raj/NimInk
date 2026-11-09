<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/composables/useApi'

interface Notification {
  id: string
  type: 'tip' | 'subscription' | 'article_purchase'
  actorName: string
  amountLuna: number
  createdAt: string
  read: boolean
}

const notifications = ref<Notification[]>([])
const loading = ref(true)
const error = ref('')
const amount = (luna: number) => `${(luna / 100_000).toLocaleString(undefined, { maximumFractionDigits: 5 })} NIM`
const message = (item: Notification) => {
  if (item.type === 'tip') return `sent you a tip of ${amount(item.amountLuna)}`
  if (item.type === 'subscription') return `subscribed to your articles for ${amount(item.amountLuna)}`
  return `purchased your article for ${amount(item.amountLuna)}`
}

onMounted(async () => {
  try {
    const result = await api.get<{ notifications: Notification[] }>('/api/notifications')
    notifications.value = result.notifications
    if (result.notifications.some((item) => !item.read)) {
      await api.post('/api/notifications/read')
      notifications.value = notifications.value.map((item) => ({ ...item, read: true }))
    }
  } catch (e: any) {
    error.value = e?.error || 'Could not load notifications. Please try again.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="min-h-full bg-[#f7f8fc] px-5 py-6 dark:bg-[#0c0c0c]">
    <div class="mb-6">
      <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0582CA]">Your activity</p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-[#1a1a1a]">Notifications</h1>
      <p class="mt-1 text-sm text-gray-500">Payments and subscriptions from your readers.</p>
    </div>

    <div v-if="loading" class="rounded-2xl border border-gray-100 bg-white p-5 text-sm text-gray-500 shadow-sm dark:border-[#252525] dark:bg-[#151515]">Loading notifications...</div>
    <div v-else-if="error" class="rounded-2xl border border-red-100 bg-white p-5 text-sm text-red-600 shadow-sm dark:border-red-950 dark:bg-[#151515]">{{ error }}</div>
    <div v-else-if="!notifications.length" class="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center shadow-sm dark:border-[#252525] dark:bg-[#151515]">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-[#0582CA]"><span class="text-xl">♧</span></div>
      <h2 class="mt-4 font-semibold text-gray-900 dark:text-white">No notifications yet</h2>
      <p class="mx-auto mt-1 max-w-xs text-sm text-gray-500">When someone tips you, subscribes, or buys an article, you'll see it here.</p>
    </div>
    <ul v-else class="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_4px_18px_rgba(31,35,72,0.04)] dark:divide-[#252525] dark:border-[#252525] dark:bg-[#151515]">
      <li v-for="item in notifications" :key="item.id" class="flex gap-3 px-4 py-4">
        <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" :class="item.read ? 'bg-gray-200' : 'bg-[#0582CA]'" />
        <div class="min-w-0 flex-1">
          <p class="text-sm leading-5 text-gray-800 dark:text-gray-200"><span class="font-semibold text-gray-950 dark:text-white">{{ item.actorName }}</span> {{ message(item) }}</p>
          <time class="mt-1 block text-xs text-gray-400">{{ new Date(item.createdAt).toLocaleString() }}</time>
        </div>
      </li>
    </ul>
  </section>
</template>
