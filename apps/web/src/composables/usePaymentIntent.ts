import { api } from '@/composables/useApi'

export type PaymentPurpose = 'tip' | 'article' | 'subscription' | 'request'

export interface PaymentIntent {
  intentId: string
  reference: string
  recipient: string
  amountLuna: number
  network: string
  expiresAt: string
}

/**
 * Asks the server for the payment reference that must travel with the
 * transaction. The wallet writes it into the transaction's data field, and
 * the server matches on it to decide whose payment this is — the sender
 * address can't be used for that, because Nimiq Pay signs with whichever
 * account is currently active in the wallet.
 */
export function createPaymentIntent(purpose: PaymentPurpose, resourceId: string, amountLuna: number) {
  return api.post<PaymentIntent>('/api/payments/intents', { purpose, resourceId, amountLuna })
}
