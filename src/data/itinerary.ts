// Glue between the catalogue/draft and the pure itinerary engine (src/domain/itinerary.ts).
import { ACTIVITIES, GRAPHS, getAirport } from './catalogue'
import { budget, layoverMinutesAt } from './time'
import { planItinerary, type Itinerary, type Zone } from '../domain/itinerary'
import type { HeroNumbers } from '../components/BudgetHero'
import type { Activity } from './types'

export interface PlanLike {
  airport: string; arrival: string; departure: string; bufferMin: number; activityIds: string[]
  arrivalLocation?: string | null; departureLocation?: string | null
}
const zoneOf = (a: Activity): Zone => (a.access === 'Airside' ? 'airside' : a.access === 'Landside' ? 'landside' : 'unknown')

export function computeItinerary(p: PlanLike): { items: Activity[]; itin: Itinerary; hero: HeroNumbers; total: number } {
  const ap = getAirport(p.airport)
  const items = p.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
  const total = layoverMinutesAt(p.arrival, p.departure, ap.timezone)
  const b = budget(total, p.bufferMin, items)
  const itin = planItinerary({
    usable: b.usable, graph: GRAPHS[p.airport] ?? null, arrivalLocation: p.arrivalLocation, departureLocation: p.departureLocation,
    activities: items.map((a) => ({ id: a.id, name: a.name, durationMin: a.durationMin, zone: zoneOf(a), locationIds: a.locationIds })),
  })
  const hero: HeroNumbers = { total, buffer: b.buffer, usable: b.usable, activityMin: itin.activityMin, transferMin: itin.transferMin, transferMinLow: itin.transferMinLow,
    remaining: itin.remaining, time: itin.time, access: itin.access, routing: itin.routing, unknownTransfers: itin.unknownTransfers, proceduresUnknown: itin.proceduresUnknown }
  return { items, itin, hero, total }
}

/** Transit areas a traveller can arrive at / depart from (terminal pickers). */
export const terminalChoices = (airport: string) =>
  (GRAPHS[airport]?.locations ?? []).filter((l) => l.kind === 'transit_area').map((l) => ({ id: l.id, short: l.terminal ?? l.name, name: l.name }))

export const MODE_LABEL: Record<string, string> = {
  walk: 'Walk', skytrain_or_walk: 'Skytrain or walk', shuttle_bus: 'Shuttle bus', link_bridge_walk: 'Walk via link bridge',
}
