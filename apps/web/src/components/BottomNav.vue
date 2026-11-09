<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { t } from '@/i18n'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/home', icon: 'home', label: () => t('nav.home') },
  { path: '/requests', icon: 'requests', label: () => t('nav.requests') },
  { path: '/write', icon: 'write', label: () => t('nav.write'), raised: true },
  { path: '/earnings', icon: 'earnings', label: () => t('nav.earnings') },
  { path: '/profile', icon: 'profile', label: () => t('nav.profile') },
]

const active = computed(() => route.path)
const isActive = (path: string) => active.value.startsWith(path)
</script>

<template>
  <nav aria-label="Main navigation" class="fixed bottom-0 left-1/2 z-40 w-full max-w-[414px] -translate-x-1/2 border-t border-gray-100 bg-white/95 pb-safe-bottom shadow-[0_-8px_24px_rgba(17,24,39,0.06)] backdrop-blur dark:border-[#2a2a2a] dark:bg-[#111]/95">
    <div class="grid h-16 grid-cols-5 items-center px-2">
      <button
        v-for="tab in tabs"
        :key="tab.path"
        @click="router.push(tab.path)"
        :aria-label="tab.label?.() || 'Write'"
        :aria-current="isActive(tab.path) ? 'page' : undefined"
        class="mx-auto flex h-14 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0582CA]"
        :class="[
          isActive(tab.path) && !tab.raised ? 'bg-blue-50 text-[#0582CA] dark:bg-[#172638] dark:text-blue-300' : '',
          isActive(tab.path) ? '' : 'text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
        ]"
      >
        <!-- Raised write button -->
        <span v-if="tab.raised" class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F2348] text-white shadow-md shadow-[#1F2348]/20 transition duration-200" :class="isActive(tab.path) ? 'bg-[#0582CA] shadow-[#0582CA]/25' : ''">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        </span>

        <template v-if="!tab.raised">
          <!-- Home -->
          <template v-if="tab.icon === 'home'">
            <svg v-if="isActive(tab.path)" class="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.1L1 12h3v9h7v-6h2v6h7v-9h3L12 2.1z" /></svg>
            <svg v-else class="w-[22px] h-[22px]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </template>

          <!-- Requests -->
          <template v-if="tab.icon === 'requests'">
            <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" :stroke-width="active.startsWith(tab.path) ? '2.5' : '1.8'" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </template>

          <!-- Earnings -->
          <template v-if="tab.icon === 'earnings'">
            <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" :stroke-width="active.startsWith(tab.path) ? '2.5' : '1.8'" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </template>

          <!-- Profile -->
          <template v-if="tab.icon === 'profile'">
            <svg v-if="active.startsWith(tab.path)" class="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            <svg v-else class="w-[22px] h-[22px]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </template>

          <span v-if="tab.label" class="text-[10px] mt-1 font-medium">{{ tab.label() }}</span>
        </template>
        <span v-if="tab.raised" class="text-[10px] font-medium" :class="isActive(tab.path) ? 'text-[#0582CA]' : 'text-gray-500 dark:text-gray-400'">{{ tab.label() }}</span>
      </button>
    </div>
  </nav>
</template>
