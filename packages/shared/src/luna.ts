import { LUNA_PER_NIM } from './config.js'

export function nimToLuna(nim: number): number {
  return Math.round(nim * LUNA_PER_NIM)
}

export function lunaToNim(luna: number): number {
  return luna / LUNA_PER_NIM
}

export function formatNim(luna: number, decimals = 2): string {
  const nim = lunaToNim(luna)
  if (Number.isInteger(nim)) return nim.toString()
  return nim.toFixed(decimals).replace(/\.?0+$/, '')
}

export function formatNimDisplay(luna: number, demo: boolean): string {
  const value = formatNim(luna)
  return demo ? `${value} NIM (demo)` : `${value} NIM`
}

export function parseNimInput(input: string): number | null {
  const n = Number(input)
  if (!Number.isFinite(n) || n <= 0) return null
  return nimToLuna(n)
}
