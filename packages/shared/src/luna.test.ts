import { describe, it, expect } from 'vitest'
import { nimToLuna, lunaToNim, formatNim, formatNimDisplay, parseNimInput } from './luna'

describe('nimToLuna', () => {
  it('converts whole NIM', () => {
    expect(nimToLuna(1)).toBe(100_000)
    expect(nimToLuna(100)).toBe(10_000_000)
  })

  it('converts fractional NIM', () => {
    expect(nimToLuna(0.5)).toBe(50_000)
    expect(nimToLuna(1.5)).toBe(150_000)
  })

  it('rounds to avoid floating point issues', () => {
    expect(nimToLuna(0.00001)).toBe(1)
    expect(nimToLuna(0.000001)).toBe(0)
  })
})

describe('lunaToNim', () => {
  it('converts Luna to NIM', () => {
    expect(lunaToNim(100_000)).toBe(1)
    expect(lunaToNim(50_000)).toBe(0.5)
  })
})

describe('formatNim', () => {
  it('formats whole numbers without decimals', () => {
    expect(formatNim(100_000)).toBe('1')
    expect(formatNim(1_000_000)).toBe('10')
  })

  it('formats fractional amounts', () => {
    expect(formatNim(150_000)).toBe('1.5')
    expect(formatNim(123_456)).toBe('1.23')
  })
})

describe('formatNimDisplay', () => {
  it('shows demo label', () => {
    expect(formatNimDisplay(100_000, true)).toBe('1 NIM (demo)')
  })

  it('shows regular label', () => {
    expect(formatNimDisplay(100_000, false)).toBe('1 NIM')
  })
})

describe('parseNimInput', () => {
  it('parses valid input', () => {
    expect(parseNimInput('5')).toBe(500_000)
    expect(parseNimInput('0.5')).toBe(50_000)
  })

  it('rejects invalid input', () => {
    expect(parseNimInput('')).toBeNull()
    expect(parseNimInput('abc')).toBeNull()
    expect(parseNimInput('-1')).toBeNull()
    expect(parseNimInput('0')).toBeNull()
  })
})
