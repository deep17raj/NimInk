<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/composables/useApi'
import { t } from '@/i18n'
import { formatNim } from '@nimink/shared'
import ArticleCard from '@/components/ArticleCard.vue'

const router = useRouter()
const auth = useAuthStore()
const activeTab = ref('latest')
const articles = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref('')
const showSidebar = ref(false)

const tabs = [
  { key: 'latest', label: () => t('feed.latest') },
  { key: 'popular', label: () => t('feed.popular') },
  { key: 'top_tipped', label: () => t('feed.topTipped') },
]

const filteredArticles = computed(() => {
  let result = articles.value
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.authorName.toLowerCase().includes(q) ||
      (a.tags || []).some((tag: string) => tag.toLowerCase().includes(q))
    )
  }
  return result
})

const initials = computed(() => {
  if (!auth.user) return '?'
  return auth.user.displayName.charAt(0).toUpperCase()
})

async function fetchArticles(silent = false) {
  if (!silent) loading.value = true
  try {
    const { articles: data } = await api.get<{ articles: any[] }>(`/api/articles?tab=${activeTab.value}`)
    articles.value = data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function disconnect() {
  auth.disconnect()
  router.push('/')
}

let refreshTimer: ReturnType<typeof setInterval>
onMounted(() => {
  fetchArticles()
  refreshTimer = setInterval(() => fetchArticles(true), 20_000)
  window.addEventListener('focus', fetchArticlesOnFocus)
})
onUnmounted(() => {
  clearInterval(refreshTimer)
  window.removeEventListener('focus', fetchArticlesOnFocus)
})

function fetchArticlesOnFocus() {
  fetchArticles(true)
}
watch(activeTab, () => {
  fetchArticles()
})
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f7f8fc] dark:bg-[#0c0c0c]">
    <!-- Header -->
    <div class="sticky top-0 z-30 border-b border-gray-100/80 bg-white/90 backdrop-blur-xl dark:border-[#252525] dark:bg-[#111]/90">
      <div class="flex items-center justify-between px-5 py-3">
        <button @click="showSidebar = true" class="icon-btn">
          <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
    </div>

    <div class="px-5">
      <!-- Search bar -->
      <div class="relative mb-5">
        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          v-model="searchQuery"
          type="text"
          class="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 text-[15px] focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
          placeholder="Search..."
        />
        <button class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg border border-gray-200 dark:border-[#333] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
          <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
        </button>
      </div>

      <!-- Category tabs -->
      <div class="flex gap-6 mb-6 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide border-b border-gray-100 dark:border-[#2a2a2a]">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="shrink-0 pb-3 text-[15px] font-medium whitespace-nowrap transition-colors relative"
          :class="activeTab === tab.key
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'"
        >
          {{ tab.label() }}
          <span v-if="activeTab === tab.key" class="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 dark:bg-white rounded-full" />
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-6">
        <div v-for="i in 3" :key="i">
          <div class="flex items-center gap-3 mb-3">
            <div class="skeleton w-9 h-9 rounded-full" />
            <div class="skeleton h-3 w-24" />
            <div class="skeleton h-3 w-14 ml-auto" />
          </div>
          <div class="skeleton h-5 w-4/5 mb-2" />
          <div class="skeleton h-3 w-full mb-1" />
          <div class="skeleton h-3 w-3/4 mb-4" />
          <div class="skeleton h-11 w-full rounded-xl" />
          <div class="divider mt-6" />
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredArticles.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
        <svg class="w-12 h-12 text-gray-200 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
        <p class="text-gray-400 dark:text-gray-600 text-[15px]">{{ searchQuery ? 'No articles match your search' : t('feed.empty') }}</p>
      </div>

      <!-- Articles -->
      <div v-else class="pb-4">
        <ArticleCard
          v-for="article in filteredArticles"
          :key="article.id"
          :article="article"
          @click="router.push(`/article/${article.id}`)"
        />
      </div>
    </div>

    <!-- Sidebar -->
    <Teleport to="body">
      <Transition name="sidebar">
        <div v-if="showSidebar" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/30" @click="showSidebar = false" />
          <div class="sidebar-panel absolute left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-[#111] flex flex-col pt-safe-top pb-safe-bottom shadow-2xl">
            <!-- Profile -->
            <div class="px-6 pt-10 pb-5 border-b border-gray-100 dark:border-[#2a2a2a]">
              <div class="avatar-lg mb-3">{{ initials }}</div>
              <h2 class="font-bold text-[18px] text-[#1a1a1a] dark:text-white">{{ auth.user?.displayName || 'NimInk' }}</h2>
              <p class="text-gray-400 dark:text-gray-500 text-[13px] mt-0.5 font-mono truncate">{{ auth.user?.address || '' }}</p>
            </div>

            <!-- Nav -->
            <nav class="flex-1 px-4 pt-2 overflow-y-auto">
              <button @click="showSidebar = false; router.push('/write')" class="menu-item w-full hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded-xl px-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span class="text-[#1a1a1a] dark:text-gray-200">Add new article</span>
              </button>
              <button @click="showSidebar = false; router.push('/profile')" class="menu-item w-full hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded-xl px-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span class="text-[#1a1a1a] dark:text-gray-200">Your articles</span>
              </button>
              <button @click="showSidebar = false; router.push('/earnings')" class="menu-item w-full hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded-xl px-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span class="text-[#1a1a1a] dark:text-gray-200">Your earnings</span>
              </button>
              <button @click="showSidebar = false; router.push('/requests')" class="menu-item w-full hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded-xl px-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <span class="text-[#1a1a1a] dark:text-gray-200">Requests</span>
              </button>
              <div class="h-px bg-gray-100 dark:bg-[#2a2a2a] my-2 mx-3" />
              <button @click="showSidebar = false; disconnect()" class="menu-item w-full hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl px-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span class="text-red-500">Disconnect</span>
              </button>
            </nav>

            <!-- Close -->
            <div class="px-6 pb-6">
              <button @click="showSidebar = false" class="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.sidebar-enter-active, .sidebar-leave-active { transition: all 0.3s ease; }
.sidebar-enter-from > .absolute, .sidebar-leave-to > .absolute { opacity: 0; }
.sidebar-enter-from .sidebar-panel, .sidebar-leave-to .sidebar-panel { transform: translateX(-100%); }
.sidebar-enter-active .sidebar-panel, .sidebar-leave-active .sidebar-panel { transition: transform 0.3s ease; }
</style>
