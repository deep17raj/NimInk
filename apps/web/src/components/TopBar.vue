<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = withDefaults(defineProps<{
  title?: string
  showBack?: boolean
  showHome?: boolean
}>(), {
  showBack: true,
  showHome: true,
})

const router = useRouter()
</script>

<template>
  <div class="sticky top-0 z-40 bg-white dark:bg-[#111]">
    <div class="flex items-center justify-between px-5 py-3">
      <!-- Left: back button -->
      <button v-if="showBack" @click="router.back()" class="icon-btn">
        <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <div v-else class="w-10" />

      <!-- Center: title -->
      <span v-if="title" class="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">{{ title }}</span>

      <!-- Right: home button -->
      <button v-if="showHome" @click="router.push('/home')" class="icon-btn">
        <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
      </button>
      <div v-else class="w-10" />
    </div>
  </div>
</template>
