<script setup lang="ts">
import { APP_NAME } from '@nimink/shared'
import TopBar from '@/components/TopBar.vue'
</script>

<template>
  <div class="min-h-[100dvh]">
    <TopBar title="Guidelines" />

    <div class="px-5 pb-8">
    <h1 class="text-[20px] font-bold text-[#1a1a1a] dark:text-white mb-6">Content Guidelines</h1>

    <div class="prose prose-sm dark:prose-invert max-w-none">
      <h2>What belongs on {{ APP_NAME }}</h2>
      <p>Original articles about Nimiq, Mini Apps, cryptocurrency, blockchain technology, and related topics. Other topics are welcome as long as they follow these guidelines.</p>

      <h2>Quality standards</h2>
      <ul>
        <li>Articles should be original work. Plagiarism will result in content removal.</li>
        <li>Articles must include a quiz question that tests comprehension of the content.</li>
        <li>Write clearly and provide value to readers.</li>
      </ul>

      <h2>Prohibited content</h2>
      <ul>
        <li><strong>Illegal content</strong> — anything that violates applicable laws.</li>
        <li><strong>Hate speech</strong> — content promoting violence or discrimination against individuals or groups.</li>
        <li><strong>Sexual content</strong> — explicit or suggestive material.</li>
        <li><strong>Scams and impersonation</strong> — misleading content, fake endorsements, or impersonating others.</li>
        <li><strong>Plagiarism</strong> — content copied from other sources without attribution.</li>
        <li><strong>Spam</strong> — repetitive or misleading content that disrupts the community.</li>
      </ul>

      <h2>Reporting</h2>
      <p>Every article and request has a Report button. Reports are reviewed by moderators. Content that violates these guidelines will be hidden. Authors can appeal moderation decisions.</p>

      <h2>Popularity rankings</h2>
      <p>Automated reading, fake accounts, and coordinated activity intended to manipulate read counts or popularity rankings are prohibited.</p>
    </div>
    </div>
  </div>
</template>
