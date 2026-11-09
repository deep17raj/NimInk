<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BottomNav from '@/components/BottomNav.vue'
import DemoBanner from '@/components/DemoBanner.vue'
import { useWalletStore } from '@/stores/wallet'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const wallet = useWalletStore()
const showNav = computed(() => auth.isConnected && !route.meta.hideNav)

onMounted(async () => {
  await auth.tryRestore()
  if (auth.isConnected) {
    wallet.fetchBalance()
    if (route.path === '/') router.replace('/home')
  }
})
</script>

<template>
  <div class="min-h-[100dvh] bg-white">
    <div class="mx-auto max-w-2xl flex flex-col min-h-[100dvh]">
      <DemoBanner v-if="auth.isConnected && auth.isDemo" />
      <header class="sticky top-0 z-50 flex h-12 items-center border-b border-gray-100 bg-white px-5">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0582CA]"
          aria-label="NimInk home"
          @click="router.push('/home')"
        >
          <span class="flex h-7 w-7 items-center justify-center rounded-md bg-[#1F2348] text-sm font-bold text-[#E9B213]">N</span>
          <span class="text-sm font-bold tracking-tight text-[#1a1a1a]">NimInk</span>
        </button>
      </header>
      <main class="flex-1 overflow-y-auto" :class="showNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </main>
      <BottomNav v-if="showNav" />
    </div>
  </div>
</template>
