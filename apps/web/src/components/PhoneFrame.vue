<script setup lang="ts">
</script>

<template>
  <div class="hidden md:flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 p-4">
    <div class="w-[430px] h-[932px] bg-white dark:bg-nimiq-dark rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-gray-800 dark:border-gray-700 relative">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-gray-800 dark:bg-gray-700 rounded-b-2xl z-50" />
      <div class="h-full overflow-y-auto pt-2">
        <slot />
      </div>
    </div>
  </div>
  <div class="md:hidden">
    <slot />
  </div>
</template>
