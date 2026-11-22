// Wording shared by the map modes.
import { Bus, Footprints, TrainFront, type LucideIcon } from 'lucide-react'
import type { Leg, LegStatus, Stop } from './route'

export const MODE_ICON: Record<string, LucideIcon> = { walk: Footprints, link_bridge_walk: Footprints, skytrain_or_walk: TrainFront, shuttle_bus: Bus }
export const STATUS: Record<LegStatus, { label: string; cls: string; hint: string }> = {
  verified: { label: 'Airport transfer time', cls: 'bg-success-tint text-success', hint: 'Transfer minutes published by the airport; the line is simulated.' },
  estimate: { label: 'Estimated route', cls: 'bg-ink-tint text-muted-text', hint: 'Simulated route and walking estimate.' },
  unavailable: { label: 'No directions', cls: 'bg-ink-tint text-muted-text', hint: 'No recorded route between these places.' },
}
/** "Terminal 3 transit area" → "T3 transit", "Jewel (public area)" → "Jewel". */
export const shortPlace = (p: string) => p.replace(/^Terminal (\d)/, 'T$1').replace(/ area$/, '').replace(/\s*\(public area\)/, '')
/** "Departures – after security" → "After security", "A gates – Transit" → "A gates". */
export const shortArea = (a: string) => a.replace(/ – (Transit|Departures)$/, '').replace(/^Departures – (.)/, (_, c: string) => c.toUpperCase())
export const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`)
export const legTime = (l: Leg) => (l.minutes && l.minutes.min !== l.minutes.max ? `${l.minutes.min}–${l.minutes.max} min` : `${l.minutes?.max ?? l.walkMin} min`)
/** Badge for a stop: A (arrival), D (departure), or its number. */
export const stopBadge = (s: Stop) => (s.kind === 'arrival' ? 'A' : s.kind === 'departure' ? 'D' : String(s.n))
export const stopName = (s: Stop) => (s.kind === 'activity' ? s.label : s.kind === 'arrival' ? 'Arrival' : 'Departure')
