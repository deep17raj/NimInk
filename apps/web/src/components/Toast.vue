<script setup lang="ts">
import { onMounted } from 'vue'

const props = defineProps<{ message: string; type: 'success' | 'error' }>()
const emit = defineEmits<{ close: [] }>()

onMounted(() => {
  setTimeout(() => emit('close'), 3000)
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 inset-x-4 z-[70] md:max-w-[400px] md:mx-auto">
      <div
        class="rounded-2xl px-4 py-3 text-[14px] font-medium shadow-lg flex items-center gap-2"
        :class="type === 'success'
          ? 'bg-gradient-to-r from-[#1F2348] to-[#0582CA] text-white shadow-blue-950/20'
          : 'bg-red-600 text-white'"
      >
        <svg v-if="type === 'success'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
        <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        {{ message }}
      </div>
    </div>
  </Teleport>
</template>
