import { describe, it, expect } from 'vitest'
import {
  estimateReadTimeMinutes,
  estimateReadTimeSeconds,
  minimumReadTimeSeconds,
  validateCheckpoints,
  getReputationWeight,
  calculateArticleScore,
  distributePool,
} from './scoring'

describe('estimateReadTimeMinutes', () => {
  it('returns at least 1 minute', () => {
    expect(estimateReadTimeMinutes(10)).toBe(1)
  })

  it('calculates based on 230 WPM', () => {
    expect(estimateReadTimeMinutes(460)).toBe(2)
    expect(estimateReadTimeMinutes(690)).toBe(3)
  })
})

describe('minimumReadTimeSeconds', () => {
  it('is 40% of expected time', () => {
    const expected = estimateReadTimeSeconds(460)
    expect(minimumReadTimeSeconds(460)).toBe(Math.floor(expected * 0.4))
  })
})

describe('validateCheckpoints', () => {
  const wordCount = 460 // ~2 min read, min ~48s

  it('accepts valid checkpoints', () => {
    const now = Date.now()
    const result = validateCheckpoints(
      [25, 50, 75, 100],
      [now, now + 20000, now + 40000, now + 60000],
      wordCount,
    )
    expect(result.valid).toBe(true)
  })

  it('rejects empty checkpoints', () => {
    const result = validateCheckpoints([], [], wordCount)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('no_checkpoints')
  })

  it('rejects mismatched arrays', () => {
    const result = validateCheckpoints([25, 50], [Date.now()], wordCount)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('checkpoint_count_mismatch')
  })

  it('rejects out-of-order checkpoints', () => {
    const now = Date.now()
    const result = validateCheckpoints(
      [50, 25, 75, 100],
      [now, now + 10000, now + 20000, now + 60000],
      wordCount,
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('checkpoints_out_of_order')
  })

  it('rejects incomplete reads (no 100%)', () => {
    const now = Date.now()
    const result = validateCheckpoints(
      [25, 50, 75],
      [now, now + 20000, now + 60000],
      wordCount,
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('incomplete_read')
  })

  it('rejects too-fast reads', () => {
    const now = Date.now()
    const result = validateCheckpoints(
      [25, 50, 75, 100],
      [now, now + 1000, now + 2000, now + 3000],
      wordCount,
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('too_fast')
  })

  it('rejects out-of-order timestamps', () => {
    const now = Date.now()
    const result = validateCheckpoints(
      [25, 50, 75, 100],
      [now, now + 40000, now + 20000, now + 60000],
      wordCount,
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('timestamps_out_of_order')
  })
})

describe('getReputationWeight', () => {
  it('returns 0.25 for new wallets', () => {
    expect(getReputationWeight(0, 0)).toBe(0.25)
    expect(getReputationWeight(2, 0)).toBe(0.25)
  })

  it('returns 1 after enough reads', () => {
    expect(getReputationWeight(3, 0)).toBe(1)
  })

  it('returns 1 after any tip', () => {
    expect(getReputationWeight(0, 1)).toBe(1)
  })
})

describe('calculateArticleScore', () => {
  it('scores based on weighted reads and quiz pass rate', () => {
    const reads = [{ weight: 1 }, { weight: 1 }, { weight: 0.25 }]
    const score = calculateArticleScore(reads, 0.8)
    expect(score).toBeCloseTo(2.25 * 1.8)
  })

  it('returns 0 for no reads', () => {
    expect(calculateArticleScore([], 1)).toBe(0)
  })
})

describe('distributePool', () => {
  it('distributes proportionally', () => {
    const payouts = distributePool(
      1_000_000,
      [
        { authorId: 'a', score: 3 },
        { authorId: 'b', score: 1 },
      ],
      1_000_000,
      1_000_000,
    )
    expect(payouts).toHaveLength(2)
    expect(payouts[0].amountLuna).toBe(750_000)
    expect(payouts[1].amountLuna).toBe(250_000)
  })

  it('applies per-author cap', () => {
    const payouts = distributePool(
      1_000_000,
      [{ authorId: 'a', score: 10 }],
      200_000,
      1_000_000,
    )
    expect(payouts[0].amountLuna).toBe(200_000)
  })

  it('returns empty for zero scores', () => {
    expect(distributePool(1_000_000, [], 500_000, 500_000)).toHaveLength(0)
  })
})
