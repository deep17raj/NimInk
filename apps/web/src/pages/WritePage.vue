<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/composables/useApi'
import { renderMarkdown } from '@/composables/useMarkdown'
import { t } from '@/i18n'
import Toast from '@/components/Toast.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const title = ref('')
const body = ref('')
const tags = ref('')
const quizQuestion = ref('')
const quizOptions = ref(['', '', ''])
const quizCorrectIndex = ref(0)
const showPreview = ref(false)
const saving = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const imageInput = ref<HTMLInputElement | null>(null)
const bodyEditor = ref<HTMLTextAreaElement | null>(null)
const uploadingImage = ref(false)
const draftStatus = ref('Saved on this device')

const wordCount = computed(() => body.value.trim() ? body.value.trim().split(/\s+/).length : 0)
const readTime = computed(() => Math.max(1, Math.ceil(wordCount.value / 230)))
const renderedPreview = computed(() => renderMarkdown(body.value))

const editId = computed(() => route.params.id as string | undefined)

onMounted(async () => {
  if (editId.value) {
    try {
      const { article } = await api.get<{ article: any }>(`/api/articles/${editId.value}`)
      title.value = article.title
      body.value = article.body
      tags.value = article.tags.join(', ')
      if (article.quizJson) {
        quizQuestion.value = article.quizJson.question
        quizOptions.value = [...article.quizJson.options]
        quizCorrectIndex.value = article.quizJson.correctIndex
      }
    } catch {}
  }

  if (!editId.value) {
    try {
      const draft = localStorage.getItem('nimink_draft')
      if (draft) {
        const d = JSON.parse(draft)
        title.value = d.title || ''
        body.value = d.body || ''
        tags.value = d.tags || ''
      }
    } catch {}
  }
})

watch([title, body, tags], () => {
  if (!editId.value) {
    try {
      localStorage.setItem('nimink_draft', JSON.stringify({
        title: title.value, body: body.value, tags: tags.value,
      }))
      draftStatus.value = 'Saved on this device'
    } catch {}
  }
}, { debounce: 1000 } as any)

async function uploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingImage.value = true
  try {
    const { url } = await api.upload<{ url: string }>('/api/articles/upload', file)
    const alt = file.name.replace(/\.[^.]+$/, '').replace(/[\[\]\\]/g, '').trim() || 'Article image'
    const markdown = `![${alt}](${url})`
    const editor = bodyEditor.value
    if (editor) {
      const start = editor.selectionStart
      const end = editor.selectionEnd
      const prefix = body.value && start > 0 && body.value[start - 1] !== '\n' ? '\n\n' : ''
      const insertion = `${prefix}${markdown}\n\n`
      body.value = body.value.slice(0, start) + insertion + body.value.slice(end)
      requestAnimationFrame(() => {
        editor.focus()
        const cursor = start + insertion.length
        editor.setSelectionRange(cursor, cursor)
      })
    } else {
      body.value += `${body.value ? '\n\n' : ''}${markdown}\n\n`
    }
    toast.value = { show: true, message: 'Image added to your story', type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Image upload failed', type: 'error' }
  } finally {
    uploadingImage.value = false
    input.value = ''
  }
}

function buildQuizJson() {
  if (!quizQuestion.value.trim() || quizOptions.value.some(o => !o.trim())) return null
  return {
    question: quizQuestion.value.trim(),
    options: quizOptions.value.map(o => o.trim()) as [string, string, string],
    correctIndex: quizCorrectIndex.value,
  }
}

async function save(status: 'draft' | 'published') {
  if (!title.value.trim() || !body.value.trim()) {
    toast.value = { show: true, message: 'Title and body are required', type: 'error' }
    return
  }

  const quiz = buildQuizJson()
  if (status === 'published' && !quiz) {
    toast.value = { show: true, message: 'Published articles need a quiz question', type: 'error' }
    return
  }

  saving.value = true
  try {
    const payload = {
      title: title.value.trim(),
      body: body.value.trim(),
      tags: tags.value.split(',').map(t => t.trim()).filter(Boolean),
      quizJson: quiz,
      status,
    }

    if (editId.value) {
      await api.put(`/api/articles/${editId.value}`, payload)
    } else {
      await api.post('/api/articles', payload)
    }

    try { localStorage.removeItem('nimink_draft') } catch {}
    toast.value = { show: true, message: status === 'published' ? 'Published!' : 'Draft saved', type: 'success' }
    setTimeout(() => router.push('/home'), 1000)
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Failed to save', type: 'error' }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-white pb-24">
    <!-- Header -->
    <div class="sticky top-0 z-30 bg-white dark:bg-[#111]">
      <div class="flex items-center justify-between px-5 py-3">
        <div>
          <h1 class="text-[18px] font-bold text-[#1a1a1a]">{{ editId ? 'Edit story' : 'Your story' }}</h1>
          <p class="mt-0.5 text-[11px] text-gray-400">{{ draftStatus }}</p>
        </div>
        <button
          @click="showPreview = !showPreview"
          class="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
          :class="showPreview
            ? 'bg-[#1F2348] text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          {{ showPreview ? 'Edit' : t('write.preview') }}
        </button>
      </div>
    </div>

    <div class="px-5">
      <div v-if="!showPreview" class="mx-auto max-w-xl">
        <div class="mb-7 mt-5 rounded-3xl bg-gradient-to-br from-[#1F2348] via-[#292e5d] to-[#0582CA] p-5 text-white shadow-lg shadow-blue-950/10">
          <div class="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
            <span class="h-1.5 w-1.5 rounded-full bg-[#E9B213]" /> NimInk journal
          </div>
          <h2 class="font-serif text-[23px] font-semibold leading-tight">Make something worth reading.</h2>
          <p class="mt-2 max-w-sm text-[13px] leading-relaxed text-white/75">Share what you know, add a little perspective, and reward readers who stay curious.</p>
        </div>

        <input
          v-model="title"
          class="mb-3 mt-2 w-full border-none bg-transparent font-serif text-[30px] font-bold leading-tight text-[#1a1a1a] outline-none placeholder:text-gray-300"
          placeholder="Give your story a title…"
          maxlength="200"
        />

        <div class="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4 text-[12px] text-gray-400">
          <span>{{ wordCount }} words</span>
          <span class="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span>{{ readTime }} min read</span>
        </div>

        <div class="mb-3 flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/80 px-3 py-2">
          <div class="flex items-center gap-2 text-[12px] text-gray-500">
            <svg class="h-4 w-4 text-[#0582CA]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>Images bring your story to life</span>
          </div>
          <input ref="imageInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="uploadImage" />
          <button type="button" class="rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#1F2348] shadow-sm ring-1 ring-gray-200 transition hover:ring-[#0582CA] disabled:opacity-50" :disabled="uploadingImage" @click="imageInput?.click()">
            {{ uploadingImage ? 'Uploading…' : 'Add image' }}
          </button>
        </div>

        <textarea
          ref="bodyEditor"
          v-model="body"
          class="mb-5 min-h-[360px] w-full resize-y rounded-3xl border border-gray-100 bg-white p-5 font-serif text-[16px] leading-[1.85] text-gray-700 shadow-[0_8px_30px_rgba(31,35,72,0.04)] outline-none transition placeholder:text-gray-300 focus:border-blue-200 focus:ring-4 focus:ring-blue-50"
          placeholder="Start with a thought, a question, or a moment that stayed with you…\n\nUse Markdown to shape your story. Add images with the button above."
        />

        <label class="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Topics</label>
        <input v-model="tags" class="input mb-8 text-[14px]" placeholder="Add topics, separated by commas" />

        <!-- Quiz builder -->
        <div class="mb-6 rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div><h3 class="font-bold text-[15px] text-[#1a1a1a]">{{ t('write.quiz') }}</h3><p class="mt-0.5 text-[12px] text-gray-400">Give readers a memorable takeaway.</p></div>
          </div>
          <input v-model="quizQuestion" class="input text-[14px] mb-3" placeholder="Question" />
          <div v-for="(_, idx) in quizOptions" :key="idx" class="flex items-center gap-3 mb-2">
            <button
              @click="quizCorrectIndex = idx"
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
              :class="quizCorrectIndex === idx
                ? 'border-[#1a1a1a] dark:border-white bg-[#1a1a1a] dark:bg-white'
                : 'border-gray-300 dark:border-gray-600'"
            >
              <div v-if="quizCorrectIndex === idx" class="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#1a1a1a]" />
            </button>
            <input v-model="quizOptions[idx]" class="input flex-1 text-[14px]" :placeholder="`Option ${idx + 1}`" />
          </div>
          <p class="text-[12px] text-gray-400 dark:text-gray-500 mt-2">Select the correct answer</p>
        </div>

        <div class="flex gap-3">
          <button @click="save('draft')" class="btn-secondary flex-1 text-[14px]" :disabled="saving">
            {{ t('write.saveDraft') }}
          </button>
          <button @click="save('published')" class="btn-primary flex-1 text-[14px]" :disabled="saving">
            {{ saving ? t('common.loading') : t('write.publish') }}
          </button>
        </div>
      </div>

      <!-- Preview -->
      <div v-else class="mt-3">
        <h2 class="font-serif text-[24px] font-bold mb-3 text-[#1a1a1a] dark:text-white leading-[1.25]">{{ title || 'Untitled' }}</h2>
        <div class="flex items-center gap-2 text-[13px] text-gray-400 dark:text-gray-500 mb-6 pb-6 border-b border-gray-100 dark:border-[#2a2a2a]">
          <span>{{ readTime }} min read</span>
          <span class="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span>{{ wordCount }} words</span>
        </div>
        <div class="article-body" v-html="renderedPreview" />
      </div>
    </div>
  </div>

  <Toast v-if="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
</template>
