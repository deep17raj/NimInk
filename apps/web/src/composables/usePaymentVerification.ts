type VerifiablePayment = { status?: string; reason?: string }

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function verifyPaymentUntilSettled<T extends VerifiablePayment>(
  verify: () => Promise<T>,
  attempts = 45,
  intervalMs = 4_000,
): Promise<T> {
  let lastReason = ''

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await verify()
      if (result.status !== 'pending') return result
      lastReason = result.reason || 'awaiting_confirmation'
    } catch (error: any) {
      if (error?.code !== 'PAYMENT_PROVIDER_UNAVAILABLE' && error?.status !== 502 && error?.status !== 503) {
        throw error
      }
      lastReason = 'provider_unavailable'
    }

    if (attempt + 1 < attempts) await delay(intervalMs)
  }

  throw {
    error: 'Nimiq is still confirming the transaction. Its hash is saved, so retrying will check this payment without sending it again.',
    code: 'PAYMENT_PENDING',
    reason: lastReason,
  }
}
