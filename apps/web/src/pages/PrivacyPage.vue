<script setup lang="ts">
import { APP_NAME } from '@nimink/shared'
import { t } from '@/i18n'
import TopBar from '@/components/TopBar.vue'
</script>

<template>
  <div class="min-h-[100dvh]">
    <TopBar :title="t('privacy.title')" />

    <div class="px-5 pb-8">
    <h1 class="text-[20px] font-bold text-[#1a1a1a] dark:text-white mb-6">{{ t('privacy.title') }}</h1>

    <div class="prose prose-sm dark:prose-invert max-w-none">
      <h2>What {{ APP_NAME }} collects</h2>
      <ul>
        <li><strong>Wallet address</strong> — your public Nimiq address, used to identify your account and process payments.</li>
        <li><strong>Device identifier hash</strong> — a one-way hash of a random identifier stored in this browser, used to prevent duplicate verified reads. We never store the raw identifier.</li>
        <li><strong>Reading telemetry</strong> — scroll progress (25%, 50%, 75%, 100%) and server-recorded timestamps during article reading. Used to validate read counts and protect popularity rankings from automated activity.</li>
        <li><strong>IP address hash</strong> — a one-way hash of your IP, used for rate limiting and fraud cluster detection. We never store the raw IP address.</li>
      </ul>

      <h2>How it is used</h2>
      <ul>
        <li>Reading telemetry is used to validate read counts and popularity rankings. Reads do not generate payments. It is never sold or shared.</li>
        <li>Device and IP hashes are used for fraud detection (detecting multiple wallets from the same device or network).</li>
        <li>All on-chain payment data (tips, request payments, staking) is processed through the Nimiq blockchain and is publicly visible.</li>
      </ul>

      <h2>Data retention</h2>
      <ul>
        <li>Reading session data is retained for 90 days for fraud review, then deleted.</li>
        <li>Account data is retained as long as the account exists.</li>
        <li>You can request removal of your content and account data at any time through the profile settings.</li>
      </ul>

      <h2>On-chain data</h2>
      <p>Only opaque identifiers (UUIDs) are placed in the on-chain data field of transactions. No personal information, names, or free text is ever written to the blockchain.</p>

      <h2>Demo mode</h2>
      <p>In demo mode, no real cryptocurrency is used. All transactions are simulated within a local database. Demo data can be reset at any time.</p>
    </div>
    </div>
  </div>
</template>
