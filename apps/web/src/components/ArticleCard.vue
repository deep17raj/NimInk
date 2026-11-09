<script setup lang="ts">
import { formatNim } from '@nimink/shared'
import { t } from '@/i18n'
import { computed } from 'vue'

const props = defineProps<{
  article: {
    id: string
    title: string
    body?: string
    authorName: string
    readTimeMinutes: number
    tags: string[]
    totalTipsLuna: number
    verifiedReadCount: number
    createdAt?: string
  }
}>()

const initials = computed(() => {
  const name = props.article.authorName || '?'
  return name.charAt(0).toUpperCase()
})

const timeAgo = computed(() => {
  if (!props.article.createdAt) return ''
  const diff = Date.now() - new Date(props.article.createdAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(props.article.createdAt).toLocaleDateString()
})

const preview = computed(() => {
  if (!props.article.body) return ''
  const plain = props.article.body
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n/g, ' ')
    .trim()
  return plain.slice(0, 140) + (plain.length > 140 ? '...' : '')
})
</script>

<template>
  <div class="cursor-pointer group">
    <!-- Author row -->
    <div class="flex items-center gap-3 mb-3">
      <div class="avatar-sm">{{ initials }}</div>
      <span class="text-[14px] font-semibold text-gray-900 dark:text-gray-100">{{ article.authorName }}</span>
      <span v-if="timeAgo" class="text-[13px] text-gray-400 dark:text-gray-500 ml-auto">{{ timeAgo }}</span>
    </div>

    <!-- Title -->
    <h3 class="font-bold text-[17px] leading-[1.35] mb-2 text-gray-900 dark:text-white line-clamp-2">
      {{ article.title }}
    </h3>

    <!-- Preview text -->
    <p v-if="preview" class="text-[14px] text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 leading-[1.6]">
      {{ preview }}
    </p>

    <!-- Read more button -->
    <button class="w-full py-3 rounded-xl bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] text-[14px] font-semibold hover:bg-[#333] dark:hover:bg-gray-200 transition-colors active:scale-[0.98]">
      Read more
    </button>

    <!-- Metadata row (subtle) -->
    <div v-if="article.totalTipsLuna > 0 || article.verifiedReadCount > 0" class="flex items-center gap-3 mt-3 text-[12px] text-gray-400 dark:text-gray-500">
      <span>{{ article.readTimeMinutes }} min read</span>
      <span v-if="article.verifiedReadCount > 0">· {{ article.verifiedReadCount }} reads</span>
      <span v-if="article.totalTipsLuna > 0" class="text-gold-600 dark:text-gold-400 font-medium ml-auto">{{ formatNim(article.totalTipsLuna) }} NIM</span>
    </div>

    <!-- Separator -->
    <div class="h-px bg-gray-100 dark:bg-[#2a2a2a] mt-6 mb-6" />
  </div>
</template>
