import { READING_WPM, READ_VALIDATION } from './config.js'

export function estimateReadTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / READING_WPM))
}

export function estimateReadTimeSeconds(wordCount: number): number {
  return Math.max(60, Math.ceil((wordCount / READING_WPM) * 60))
}

export function minimumReadTimeSeconds(wordCount: number): number {
  return Math.floor(estimateReadTimeSeconds(wordCount) * READ_VALIDATION.MIN_TIME_RATIO)
}

export function validateCheckpoints(
  checkpoints: number[],
  checkpointTimes: number[],
  wordCount: number,
  serverElapsedSeconds?: number,
): { valid: boolean; reason: string | null } {
  if (checkpoints.length !== checkpointTimes.length) {
    return { valid: false, reason: 'checkpoint_count_mismatch' }
  }

  if (checkpoints.length === 0) {
    return { valid: false, reason: 'no_checkpoints' }
  }

  const expectedCheckpoints = [25, 50, 75, 100]
  if (!checkpoints.includes(100)) {
    return { valid: false, reason: 'incomplete_read' }
  }
  if (checkpoints.length !== expectedCheckpoints.length) {
    return { valid: false, reason: 'incomplete_checkpoints' }
  }

  for (let i = 0; i < checkpoints.length; i++) {
    if (!expectedCheckpoints.includes(checkpoints[i])) {
      return { valid: false, reason: 'invalid_checkpoint_value' }
    }
    if (checkpoints[i] !== expectedCheckpoints[i]) {
      return { valid: false, reason: 'checkpoints_out_of_order' }
    }
  }

  const totalTimeMs = checkpointTimes[checkpointTimes.length - 1] - checkpointTimes[0]
  const totalTimeSec = serverElapsedSeconds ?? totalTimeMs / 1000
  const minTime = minimumReadTimeSeconds(wordCount)

  if (totalTimeSec < minTime) {
    return { valid: false, reason: 'too_fast' }
  }

  for (let i = 1; i < checkpointTimes.length; i++) {
    if (checkpointTimes[i] <= checkpointTimes[i - 1]) {
      return { valid: false, reason: 'timestamps_out_of_order' }
    }
  }

  return { valid: true, reason: null }
}

export function getReputationWeight(validReadCount: number, tipsSentCount: number): number {
  if (
    validReadCount >= READ_VALIDATION.READS_FOR_FULL_WEIGHT ||
    tipsSentCount >= READ_VALIDATION.TIPS_FOR_FULL_WEIGHT
  ) {
    return READ_VALIDATION.FULL_WEIGHT
  }
  return READ_VALIDATION.NEW_WALLET_WEIGHT
}

export function calculateArticleScore(
  validReads: { weight: number }[],
  quizPassRate: number,
): number {
  const readScore = validReads.reduce((sum, r) => sum + r.weight, 0)
  return readScore * (1 + quizPassRate)
}

export function distributePool(
  totalLuna: number,
  authors: { authorId: string; score: number }[],
  perAuthorCapLuna: number,
  perArticleCapLuna: number,
): { authorId: string; amountLuna: number; score: number }[] {
  const totalScore = authors.reduce((sum, a) => sum + a.score, 0)
  if (totalScore === 0) return []

  return authors.map((a) => {
    const share = a.score / totalScore
    let amount = Math.floor(share * totalLuna)
    amount = Math.min(amount, perAuthorCapLuna, perArticleCapLuna)
    return { authorId: a.authorId, amountLuna: amount, score: a.score }
  })
}
