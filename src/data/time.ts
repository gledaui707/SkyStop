import type { Activity } from './types'

export const DEFAULT_BUFFER = 120

export function fmtDur(min: number) {
  const sign = min < 0 ? '-' : ''
  const a = Math.abs(Math.round(min))
  const h = Math.floor(a / 60), m = a % 60
  if (!h) return `${sign}${m}m`
  return `${sign}${h}h${m ? ` ${m}m` : ''}`
}
export const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
export const fmtDay = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
export const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
export const layoverMinutes = (arrival: string, departure: string) => {
  const a = new Date(arrival).getTime(), b = new Date(departure).getTime()
  if (isNaN(a) || isNaN(b)) return 0
  return Math.round((b - a) / 60000)
}
export const isOvernight = (arrival: Date, departure: Date) =>
  arrival.toDateString() !== departure.toDateString() &&
  (departure.getTime() - arrival.getTime() > 4 * 3600000)

export interface Budget {
  total: number
  buffer: number
  usable: number
  planned: number
  remaining: number
  over: boolean
  cost: number
}
export function budget(total: number, buffer: number, items: Activity[]): Budget {
  const usable = Math.max(0, total - buffer)
  const planned = items.reduce((s, a) => s + a.durationMin, 0)
  return {
    total, buffer: Math.min(buffer, Math.max(total, 0)), usable, planned,
    remaining: usable - planned, over: planned > usable,
    cost: items.reduce((s, a) => s + a.costUsd, 0),
  }
}
export const timeSpan = (list: Activity[]) => list.reduce((s, a) => s + a.durationMin, 0)
export const money = (n: number) => `$${n.toLocaleString('en-US')}`
