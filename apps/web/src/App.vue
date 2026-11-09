<script setup lang="ts">
import { onMounted, computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BottomNav from '@/components/BottomNav.vue'
import DemoBanner from '@/components/DemoBanner.vue'
import { useWalletStore } from '@/stores/wallet'
import { api } from '@/composables/useApi'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const wallet = useWalletStore()
const showNav = computed(() => auth.isConnected && !route.meta.hideNav)
const unreadCount = ref(0)
let notificationTimer: ReturnType<typeof setInterval> | undefined

async function refreshNotifications() {
  if (!auth.isConnected) { unreadCount.value = 0; return }
  try {
    const result = await api.get<{ notifications: Array<{ read: boolean }> }>('/api/notifications')
    unreadCount.value = result.notifications.filter((notification) => !notification.read).length
  } catch { /* Keep the last known badge count while offline. */ }
}

watch(() => route.path, (path) => { if (path === '/notifications') unreadCount.value = 0 })

onMounted(async () => {
  await auth.tryRestore()
  if (auth.isConnected) {
    wallet.fetchBalance()
    await refreshNotifications()
    notificationTimer = setInterval(refreshNotifications, 30_000)
    if (route.path === '/') router.replace('/home')
  }
})
onUnmounted(() => { if (notificationTimer) clearInterval(notificationTimer) })
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f7f8fc] dark:bg-[#0c0c0c]">
    <div class="mx-auto flex min-h-[100dvh] max-w-2xl flex-col bg-white shadow-[0_0_48px_rgba(31,35,72,0.035)] dark:bg-[#111]">
      <DemoBanner v-if="auth.isConnected && auth.isDemo" />
      <header class="sticky top-0 z-50 flex h-14 items-center border-b border-gray-100/90 bg-white/90 px-5 backdrop-blur-xl dark:border-[#262626] dark:bg-[#111]/90">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0582CA]"
          aria-label="NimInk home"
          @click="router.push('/home')"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F2348] to-[#0582CA] text-sm font-extrabold text-[#E9B213] shadow-sm">N</span>
          <span class="text-[15px] font-bold tracking-tight text-[#1a1a1a]">NimInk</span>
        </button>
        <button v-if="auth.isConnected" type="button" class="relative ml-auto grid h-9 w-9 place-items-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0582CA]" aria-label="Notifications" @click="router.push('/notifications')">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4.5-5.8V4a1.5 1.5 0 00-3 0v1.2A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" /></svg>
          <span v-if="unreadCount" class="absolute right-0 top-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>
      </header>
      <main class="flex-1 overflow-y-auto bg-[#f7f8fc] dark:bg-[#0c0c0c]" :class="showNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </main>
      <BottomNav v-if="showNav" />
    </div>
  </div>
</template>
