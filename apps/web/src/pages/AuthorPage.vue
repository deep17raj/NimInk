<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/composables/useApi'
import { formatNim } from '@nimink/shared'
import { t } from '@/i18n'
import ArticleCard from '@/components/ArticleCard.vue'
import TopBar from '@/components/TopBar.vue'

const route = useRoute()
const router = useRouter()
const articles = ref<any[]>([])
const loading = ref(true)
const authorName = ref('')

const initials = computed(() => {
  if (!authorName.value) return '?'
  return authorName.value.charAt(0).toUpperCase()
})

const totalReads = computed(() =>
  articles.value.reduce((sum, a) => sum + (a.verifiedReadCount || 0), 0)
)

onMounted(async () => {
  try {
    const { articles: data } = await api.get<{ articles: any[] }>(`/api/articles/user/${route.params.userId}`)
    articles.value = data
    if (data.length > 0) authorName.value = data[0].authorName
  } catch {} finally { loading.value = false }
})
</script>

<template>
  <div class="min-h-[100dvh] pb-8">
    <TopBar title="Author" />

    <!-- Author info -->
    <div class="px-5 pt-4 pb-6 border-b border-gray-100 dark:border-[#2a2a2a]">
      <div class="flex items-center gap-4">
        <div class="avatar-lg">{{ initials }}</div>
        <div>
          <h1 class="text-[20px] font-bold text-[#1a1a1a] dark:text-white">{{ authorName || 'Author' }}</h1>
          <div class="flex gap-4 mt-1.5">
            <div>
              <span class="font-bold text-[14px] text-[#1a1a1a] dark:text-white">{{ articles.length }}</span>
              <span class="text-[12px] text-gray-400 dark:text-gray-500 ml-1">articles</span>
            </div>
            <div>
              <span class="font-bold text-[14px] text-[#1a1a1a] dark:text-white">{{ totalReads }}</span>
              <span class="text-[12px] text-gray-400 dark:text-gray-500 ml-1">reads</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="px-5 mt-4">
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i">
          <div class="flex items-center gap-3 mb-3">
            <div class="skeleton w-9 h-9 rounded-full" />
            <div class="skeleton h-3 w-24" />
          </div>
          <div class="skeleton h-5 w-3/4 mb-2" />
          <div class="skeleton h-3 w-full mb-4" />
          <div class="divider" />
        </div>
      </div>

      <div v-else-if="articles.length === 0" class="py-16 text-center">
        <p class="text-[14px] text-gray-400 dark:text-gray-500">No published articles yet</p>
      </div>

      <div v-else>
        <ArticleCard v-for="a in articles" :key="a.id" :article="a" @click="router.push(`/article/${a.id}`)" />
      </div>
    </div>
  </div>
</template>
