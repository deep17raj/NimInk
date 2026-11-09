<script setup lang="ts">
defineProps<{ show: boolean }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/30" @click="$emit('close')" />
        <div class="bottom-sheet max-h-[85dvh] overflow-y-auto md:max-w-[414px] md:mx-auto">
          <div class="w-8 h-1 bg-gray-200 dark:bg-[#333] rounded-full mx-auto mb-5" />
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active, .sheet-leave-active { transition: all 0.25s ease; }
.sheet-enter-from .bottom-sheet, .sheet-leave-to .bottom-sheet { transform: translateY(100%); }
.sheet-enter-from > .absolute, .sheet-leave-to > .absolute { opacity: 0; }
</style>
