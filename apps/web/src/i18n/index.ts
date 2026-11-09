import { reactive, Plugin } from 'vue'

const messages: Record<string, Record<string, string>> = {
  en: {
    'app.name': 'NimInk',
    'app.tagline': 'Write. Earn. Stake.',
    'nav.home': 'Home',
    'nav.requests': 'Requests',
    'nav.write': 'Write',
    'nav.earnings': 'Earnings',
    'nav.profile': 'Profile',
    'splash.connect': 'Connect Wallet',
    'splash.subtitle': 'A writing platform for the Nimiq community',
    'demo.banner': 'Demo mode — no real money',
    'demo.nim': 'NIM (demo)',
    'feed.latest': 'Latest',
    'feed.popular': 'Popular',
    'feed.topTipped': 'Top Tipped',
    'feed.requested': 'Requested',
    'feed.empty': 'No articles yet. Be the first to write!',
    'article.readTime': '{min} min read',
    'article.verifiedReads': '{count} verified reads',
    'article.tips': '{amount} NIM tipped',
    'article.quiz.title': 'Quick comprehension check',
    'article.quiz.pass': 'Correct! Your read has been verified.',
    'article.quiz.fail': 'Not quite. Try reading the article again.',
    'tip.title': 'Tip the author',
    'tip.custom': 'Custom',
    'tip.note': 'Add a note (optional)',
    'tip.send': 'Send tip',
    'tip.success': 'Tip sent successfully!',
    'write.title': 'Title',
    'write.body': 'Write your article...',
    'write.tags': 'Tags (comma separated)',
    'write.quiz': 'Quiz question',
    'write.publish': 'Publish',
    'write.saveDraft': 'Save draft',
    'write.preview': 'Preview',
    'request.create': 'Create request',
    'request.budget': 'Budget',
    'request.deadline': 'Deadline',
    'request.submit': 'Submit draft',
    'request.award': 'Award',
    'request.pay': 'Pay writer',
    'request.unpaid': 'Awarded, unpaid',
    'earnings.total': 'Total earnings',
    'earnings.tips': 'Tips',
    'earnings.requests': 'Requests',
    'earnings.stake': 'Stake my earnings',
    'earnings.pending': 'Pending payouts',
    'stake.title': 'Stake NIM',
    'stake.validator': 'Choose a validator',
    'stake.amount': 'Amount to stake',
    'stake.min': 'Minimum 100 NIM for first stake',
    'stake.warning': 'Staking rewards vary and are not guaranteed. Staked NIM is locked; exiting requires multiple steps and time.',
    'stake.confirm': 'Stake',
    'stake.success': 'Staked successfully!',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.approve': 'Approve',
    'common.back': 'Back',
    'report.title': 'Report content',
    'report.submit': 'Submit report',
    'privacy.title': 'Privacy & Data',
    'onboarding.step1': 'Publish free or premium articles for Nimiq readers',
    'onboarding.step2': 'Get tipped and paid for quality content',
    'onboarding.step3': 'Stake your earnings and grow your NIM',
    'onboarding.skip': 'Skip',
    'onboarding.next': 'Next',
    'onboarding.start': 'Get started',
  },
  es: {
    'app.name': 'NimInk',
    'app.tagline': 'Escribe. Gana. Apuesta.',
    'nav.home': 'Inicio',
    'nav.requests': 'Pedidos',
    'nav.write': 'Escribir',
    'nav.earnings': 'Ganancias',
    'nav.profile': 'Perfil',
    'splash.connect': 'Conectar billetera',
    'splash.subtitle': 'Una plataforma de escritura para la comunidad Nimiq',
    'demo.banner': 'Modo demo — sin dinero real',
    'demo.nim': 'NIM (demo)',
    'feed.latest': 'Recientes',
    'feed.popular': 'Popular',
    'feed.topTipped': 'Más propinas',
    'feed.requested': 'Pedidos',
    'feed.empty': 'Aún no hay artículos. ¡Sé el primero en escribir!',
    'common.loading': 'Cargando...',
    'common.error': 'Algo salió mal',
    'common.retry': 'Reintentar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.approve': 'Aprobar',
    'common.back': 'Volver',
  },
}

function detectLanguage(): string {
  const nimiqLang = (window as any).nimiqPay?.language
  if (nimiqLang && messages[nimiqLang]) return nimiqLang

  const browserLang = navigator.language.split('-')[0]
  if (messages[browserLang]) return browserLang

  return 'en'
}

const state = reactive({
  locale: detectLanguage(),
})

export function t(key: string, params?: Record<string, string | number>): string {
  let msg = messages[state.locale]?.[key] || messages.en[key] || key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, String(v))
    }
  }
  return msg
}

export function setLocale(locale: string) {
  if (messages[locale]) state.locale = locale
}

export function getLocale(): string {
  return state.locale
}

export const i18n: Plugin = {
  install(app) {
    app.config.globalProperties.$t = t
    app.provide('i18n', { t, setLocale, getLocale })
  },
}
