<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
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
const accessType = ref<'free' | 'subscription' | 'one_time'>('free')
const priceNim = ref('')
const showPreview = ref(false)
const saving = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const imageInput = ref<HTMLInputElement | null>(null)
const bodyEditor = ref<HTMLDivElement | null>(null)
const selectedImage = ref<HTMLImageElement | null>(null)
const uploadingImage = ref(false)
const draftStatus = ref('Saved on this device')
let savedEditorRange: Range | null = null

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
      accessType.value = article.accessType || 'free'
      priceNim.value = article.priceLuna ? String(article.priceLuna / 100_000) : ''
      await nextTick()
      setEditorContent()
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
        accessType.value = d.accessType || 'free'
        priceNim.value = d.priceNim || ''
        await nextTick()
        setEditorContent()
      }
    } catch {}
  }
})

watch(showPreview, async (previewing) => {
  if (!previewing) {
    await nextTick()
    setEditorContent()
  }
})

watch([title, body, tags, accessType, priceNim], () => {
  if (!editId.value) {
    try {
      localStorage.setItem('nimink_draft', JSON.stringify({
        title: title.value, body: body.value, tags: tags.value,
        accessType: accessType.value, priceNim: priceNim.value,
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
    const alt = file.name.replace(/\.[^.]+$/, '').trim() || 'Article image'
    const editor = bodyEditor.value
    if (editor) {
      editor.focus()
      const selection = window.getSelection()
      const range = savedEditorRange && editor.contains(savedEditorRange.commonAncestorContainer)
        ? savedEditorRange
        : (() => { const end = document.createRange(); end.selectNodeContents(editor); end.collapse(false); return end })()
      selection?.removeAllRanges()
      selection?.addRange(range)
      const image = document.createElement('img')
      image.src = url
      image.alt = alt
      const container = range.startContainer instanceof HTMLElement
        ? range.startContainer
        : range.startContainer.parentElement
      const existingRow = container?.closest('.editor-image-row')
      if (existingRow) {
        range.insertNode(image)
      } else {
        const row = document.createElement('span')
        row.className = 'editor-image-row'
        range.insertNode(row)
        row.append(image)
      }
      selectedImage.value = image
      const cursor = document.createRange()
      cursor.setStartAfter(image)
      cursor.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(cursor)
      savedEditorRange = null
      syncEditorContent()
    } else {
      body.value += `${body.value ? '\n\n' : ''}![${alt}](${url})\n\n`
    }
    toast.value = { show: true, message: 'Image added to your story', type: 'success' }
  } catch (e: any) {
    toast.value = { show: true, message: e.error || 'Image upload failed', type: 'error' }
  } finally {
    uploadingImage.value = false
    input.value = ''
  }
}

function rememberEditorSelection() {
  const selection = window.getSelection()
  if (selection?.rangeCount && bodyEditor.value?.contains(selection.anchorNode)) {
    savedEditorRange = selection.getRangeAt(0).cloneRange()
  }
}

function openImagePicker() {
  rememberEditorSelection()
  imageInput.value?.click()
}

function formatSelection(command: 'bold' | 'italic' | 'underline') {
  bodyEditor.value?.focus()
  document.execCommand(command)
  syncEditorContent()
}

function selectEditorImage(event: MouseEvent) {
  const target = event.target
  const image = target instanceof HTMLImageElement && bodyEditor.value?.contains(target) ? target : null
  selectedImage.value?.classList.remove('editor-image-selected')
  selectedImage.value = image
  image?.classList.add('editor-image-selected')
}

function removeSelectedImage() {
  const image = selectedImage.value
  if (!image || !bodyEditor.value?.contains(image)) return
  const row = image.closest('.editor-image-row')
  image.remove()
  if (row && !row.querySelector('img')) row.remove()
  selectedImage.value = null
  bodyEditor.value.focus()
  syncEditorContent()
}

function setEditorContent() {
  selectedImage.value = null
  if (!bodyEditor.value) return
  const parsed = document.createElement('div')
  parsed.innerHTML = renderMarkdown(body.value)
  const nodes = Array.from(parsed.childNodes)
  const grouped: Node[] = []
  for (let index = 0; index < nodes.length;) {
    const node = nodes[index]
    const imageParagraph = node instanceof HTMLParagraphElement
      && node.childElementCount === 1
      && node.firstElementChild instanceof HTMLImageElement
    if (!imageParagraph) {
      grouped.push(node)
      index += 1
      continue
    }

    const row = document.createElement('div')
    row.className = 'editor-image-row'
    while (index < nodes.length) {
      const candidate = nodes[index]
      if (candidate.nodeType === Node.TEXT_NODE && !candidate.textContent?.trim()) {
        index += 1
        continue
      }
      if (!(candidate instanceof HTMLParagraphElement)
        || candidate.childElementCount !== 1
        || !(candidate.firstElementChild instanceof HTMLImageElement)) break
      row.append(candidate.firstElementChild)
      index += 1
    }
    grouped.push(row)
  }
  bodyEditor.value.replaceChildren(...grouped)
}

function syncEditorContent() {
  if (bodyEditor.value) body.value = Array.from(bodyEditor.value.childNodes).map(nodeToMarkdown).join('').trim()
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/\u00a0/g, ' ')
  if (!(node instanceof HTMLElement)) return ''

  const children = Array.from(node.childNodes).map(nodeToMarkdown).join('')
  const tag = node.tagName.toLowerCase()
  if (tag === 'img') {
    const src = node.getAttribute('src') || ''
    if (!src || (!src.startsWith('/uploads/') && !/^https?:\/\//i.test(src))) return ''
    const alt = (node.getAttribute('alt') || 'Article image').replace(/[\[\]]/g, '')
    return `![${alt}](${src})\n\n`
  }
  if (tag === 'br') return '\n'
  if (tag === 'strong' || tag === 'b') return `**${children}**`
  if (tag === 'u') return `++${children}++`
  if (tag === 'em' || tag === 'i') return `*${children}*`
  if (tag === 'hr') return '\n---\n\n'
  if (tag === 'pre') return `\n\`\`\`\n${node.textContent || ''}\n\`\`\`\n\n`
  if (tag === 'code' && node.parentElement?.tagName.toLowerCase() === 'pre') return node.textContent || ''
  if (tag === 'code') return `\`${children}\``
  if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${children.trim()}\n\n`
  if (tag === 'li') return `- ${children.trim()}\n`
  if (tag === 'ul' || tag === 'ol') return `${children}\n`
  if (tag === 'blockquote') return `${children.split('\n').filter(Boolean).map(line => `> ${line}`).join('\n')}\n\n`
  if (tag === 'p' || tag === 'div') return `${children.trim()}\n\n`
  if (tag === 'a') {
    const href = node.getAttribute('href') || ''
    return href ? `[${children}](${href})` : children
  }
  return children
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
  if (accessType.value === 'one_time' && (!Number.isFinite(Number(priceNim.value)) || Number(priceNim.value) < 0.01)) {
    toast.value = { show: true, message: 'Set an individual price of at least 0.01 NIM', type: 'error' }
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
      accessType: accessType.value,
      priceLuna: accessType.value === 'one_time' ? Math.round(Number(priceNim.value) * 100_000) : 0,
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
          <button type="button" class="rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#1F2348] shadow-sm ring-1 ring-gray-200 transition hover:ring-[#0582CA] disabled:opacity-50" :disabled="uploadingImage" @mousedown.prevent="rememberEditorSelection" @click="openImagePicker">
            {{ uploadingImage ? 'Uploading…' : 'Add image' }}
          </button>
        </div>

        <div class="mb-2 flex items-center gap-1 rounded-t-2xl border border-gray-100 bg-gray-50 px-2 py-2" role="toolbar" aria-label="Article formatting">
          <button type="button" class="format-button font-bold" aria-label="Bold" title="Bold" @mousedown.prevent="rememberEditorSelection" @click="formatSelection('bold')">B</button>
          <button type="button" class="format-button italic" aria-label="Italic" title="Italic" @mousedown.prevent="rememberEditorSelection" @click="formatSelection('italic')">I</button>
          <button type="button" class="format-button underline" aria-label="Underline" title="Underline" @mousedown.prevent="rememberEditorSelection" @click="formatSelection('underline')">U</button>
          <button v-if="selectedImage" type="button" class="ml-2 inline-flex h-9 items-center gap-2 rounded-lg border border-red-100 bg-white px-3 text-[12px] font-semibold text-red-600 hover:bg-red-50" aria-label="Remove selected image" title="Remove image" @mousedown.prevent @click="removeSelectedImage">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4l16 16M4 20L20 4M8 8l8 8" /></svg>
            Remove image
          </button>
          <span class="mx-1 h-5 w-px bg-gray-200" />
          <span class="px-2 text-[11px] text-gray-400">Format your story</span>
        </div>

        <div
          ref="bodyEditor"
          contenteditable="true"
          role="textbox"
          aria-label="Article body"
          aria-multiline="true"
          data-placeholder="Start writing your story..."
          class="article-editor mb-5 min-h-[360px] w-full rounded-b-3xl border border-t-0 border-gray-100 bg-white p-5 font-serif text-[16px] leading-[1.85] text-gray-700 shadow-[0_8px_30px_rgba(31,35,72,0.04)] outline-none transition focus:border-blue-200 focus:ring-4 focus:ring-blue-50"
          @input="syncEditorContent"
          @click="selectEditorImage"
        ></div>

        <label class="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Topics</label>
        <input v-model="tags" class="input mb-8 text-[14px]" placeholder="Add topics, separated by commas" />

        <section class="mb-7 rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
          <h3 class="font-bold text-[15px] text-[#1a1a1a]">Reader access</h3>
          <p class="mt-1 mb-4 text-[12px] leading-relaxed text-gray-500">Choose whether this story is free or premium. Reads are popularity stats; they don’t generate payouts.</p>
          <div class="space-y-2">
            <label class="flex cursor-pointer items-start gap-3 rounded-2xl border p-3" :class="accessType === 'free' ? 'border-[#0582CA] bg-white' : 'border-gray-200 bg-white/70'">
              <input v-model="accessType" type="radio" value="free" class="mt-1 accent-[#0582CA]" />
              <span><span class="block text-[13px] font-semibold text-gray-800">Free for everyone</span><span class="mt-0.5 block text-[11px] text-gray-500">Anyone can read the full article.</span></span>
            </label>
            <label class="flex cursor-pointer items-start gap-3 rounded-2xl border p-3" :class="accessType === 'subscription' ? 'border-[#0582CA] bg-white' : 'border-gray-200 bg-white/70'">
              <input v-model="accessType" type="radio" value="subscription" class="mt-1 accent-[#0582CA]" />
              <span><span class="block text-[13px] font-semibold text-gray-800">Subscriber only</span><span class="mt-0.5 block text-[11px] text-gray-500">A 30-day subscription unlocks all your subscriber-only articles. Set its price in your profile.</span></span>
            </label>
            <label class="flex cursor-pointer items-start gap-3 rounded-2xl border p-3" :class="accessType === 'one_time' ? 'border-[#0582CA] bg-white' : 'border-gray-200 bg-white/70'">
              <input v-model="accessType" type="radio" value="one_time" class="mt-1 accent-[#0582CA]" />
              <span><span class="block text-[13px] font-semibold text-gray-800">Individual purchase</span><span class="mt-0.5 block text-[11px] text-gray-500">Readers pay once to unlock this article permanently.</span></span>
            </label>
          </div>
          <label v-if="accessType === 'one_time'" class="mt-3 block text-[12px] font-medium text-gray-600">Price in NIM
            <input v-model="priceNim" type="number" min="0.01" step="0.01" class="input mt-1 text-[14px]" placeholder="0.50" />
          </label>
        </section>

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

<style scoped>
.format-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 10px;
  color: #374151;
  font-family: Arial, sans-serif;
  font-size: 15px;
}
.format-button:hover { background: #fff; }
.article-editor:empty::before {
  content: attr(data-placeholder);
  color: #d1d5db;
  pointer-events: none;
}
.article-editor :deep(img) {
  max-width: min(100%, 190px);
  max-height: 120px;
  border-radius: 14px;
  object-fit: contain;
  cursor: pointer;
}
.article-editor :deep(.editor-image-row) {
  display: flex;
  width: 100%;
  max-width: 100%;
  align-items: center;
  gap: 10px;
  margin: 0.75rem 0;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}
.article-editor :deep(.editor-image-row img) { flex: 0 0 auto; }
.article-editor :deep(img.editor-image-selected) { outline: 2px solid #0582ca; outline-offset: 3px; }
.article-editor :deep(p) { margin: 0 0 1rem; }
</style>
