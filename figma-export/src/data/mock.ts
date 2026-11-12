import type { Activity, Airport, Flight, Plan, Template } from './types'
import { IMAGES } from './images'

export const AIRPORTS: Airport[] = [
  { code: 'LIS', name: 'Lisbon Airport', city: 'Lisbon', country: 'Portugal', image: IMAGES.airports.LIS,
    terminals: 'Terminal details to be confirmed with the airport.',
    note: 'Illustrative activities. Opening hours and access are not verified.' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', image: IMAGES.airports.SIN,
    terminals: 'Terminal details to be confirmed with the airport.',
    note: 'Illustrative activities. Opening hours and access are not verified.' },
]

export const ACTIVITIES: Activity[] = [
  { id: 'l1', airport: 'LIS', name: 'Pastel de nata and coffee', category: 'Food', durationMin: 30, costUsd: 6, access: 'Unverified', image: IMAGES.activities.l1, note: 'A quick sit-down snack.', map: { x: 30, y: 67 } },
  { id: 'l2', airport: 'LIS', name: 'Tram ride into the old town', category: 'City', durationMin: 180, costUsd: 15, access: 'Landside', image: IMAGES.activities.l2, note: 'Includes travel both ways. Check entry requirements first.', leavesAirport: true, map: { x: 62, y: 88 } },
  { id: 'l3', airport: 'LIS', name: 'Quiet rest area', category: 'Rest', durationMin: 120, costUsd: 0, access: 'Airside', image: IMAGES.activities.l3, note: 'Somewhere to recharge before your next flight.', map: { x: 35, y: 28 } },
  { id: 'l4', airport: 'LIS', name: 'Portuguese souvenirs', category: 'Shopping', durationMin: 40, costUsd: 20, access: 'Unverified', image: IMAGES.activities.l4, note: 'Browse local products.', map: { x: 68, y: 66 } },
  { id: 's1', airport: 'SIN', name: 'Hawker-style meal', category: 'Food', durationMin: 45, costUsd: 8, access: 'Unverified', image: IMAGES.activities.s1, note: 'A local food-court meal.', map: { x: 30, y: 67 } },
  { id: 's2', airport: 'SIN', name: 'Gardens by the Bay visit', category: 'City', durationMin: 240, costUsd: 20, access: 'Landside', image: IMAGES.activities.s2, note: 'Includes travel both ways. Check entry requirements first.', leavesAirport: true, map: { x: 66, y: 88 } },
  { id: 's3', airport: 'SIN', name: 'Nap and recharge zone', category: 'Rest', durationMin: 120, costUsd: 0, access: 'Airside', image: IMAGES.activities.s3, note: 'Rest between flights.', map: { x: 62, y: 26 } },
  { id: 's4', airport: 'SIN', name: 'Quiet workspace', category: 'Work', durationMin: 90, costUsd: 0, access: 'Unverified', image: IMAGES.activities.s4, note: 'A desk and power for focused work.', map: { x: 70, y: 65 } },
]

export const TEMPLATES: Template[] = [
  { id: 't-lis', airport: 'LIS', name: 'Taste of Lisbon', blurb: 'A snack, then the tram to the old town.', activityIds: ['l1', 'l2'] },
  { id: 't-sin', airport: 'SIN', name: 'Gardens and a bite', blurb: 'A local meal, then Gardens by the Bay.', activityIds: ['s1', 's2'] },
]

export const CITIES = [
  { code: 'CGK', name: 'Jakarta, Indonesia' },
  { code: 'CDG', name: 'Paris, France' },
  { code: 'LHR', name: 'London, United Kingdom' },
  { code: 'JFK', name: 'New York, USA' },
  { code: 'SYD', name: 'Sydney, Australia' },
  { code: 'GRU', name: 'Sao Paulo, Brazil' },
]

const FLIGHT_TEMPLATES = [
  { airline: 'SQ', via: 'SIN' as const, hour: 10, min: 30, l1: 450, lay: 195, l2: 640, price: 745 },
  { airline: 'EK', via: 'SIN' as const, hour: 8, min: 35, l1: 465, lay: 270, l2: 655, price: 820 },
  { airline: 'SQ', via: 'SIN' as const, hour: 17, min: 5, l1: 450, lay: 640, l2: 640, price: 690 },
  { airline: 'AF', via: 'LIS' as const, hour: 10, min: 15, l1: 560, lay: 345, l2: 300, price: 910 },
  { airline: 'KL', via: 'LIS' as const, hour: 12, min: 20, l1: 585, lay: 225, l2: 290, price: 875 },
  { airline: 'TK', via: 'LIS' as const, hour: 21, min: 40, l1: 500, lay: 560, l2: 280, price: 780 },
]

export function searchFlights(origin: string, destination: string, date: string): Flight[] {
  const [y, m, d] = date.split('-').map(Number)
  const seed = (origin + destination).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const f = 0.85 + (seed % 40) / 100
  return FLIGHT_TEMPLATES.map((t, i) => ({
    id: `${origin}-${destination}-${i}`,
    airline: t.airline,
    origin,
    destination,
    via: t.via,
    departAt: new Date(y, m - 1, d, t.hour, t.min),
    legOneMin: t.l1,
    layoverMin: t.lay,
    legTwoMin: t.l2,
    priceUsd: Math.round(t.price * f),
  }))
}

export const isSupported = (code: string) => AIRPORTS.some((a) => a.code === code)
/** Supported airports come from the sample catalogue; any other airport gets a neutral stand-in. */
export const getAirport = (code: string): Airport =>
  AIRPORTS.find((a) => a.code === code) ?? { code: code as Airport['code'], name: `${code} Airport`, city: code, country: '', image: IMAGES.results, terminals: '', note: '' }
export const getActivities = (code: string) => ACTIVITIES.filter((a) => a.airport === code)
export const getTemplates = (code: string) => TEMPLATES.filter((t) => t.airport === code)

// Local-only plan persistence (demo). Replace with Supabase layovers + plan_items.
const KEY = 'skystop.plans.v1'
const LEGACY_PLANS = 'layverse.plans.v1'
const WELCOMED = 'skystop.welcomed.v1'
/** Guest session flags (frontend only). Replace with Supabase guest auth later. */
export const guestStore = {
  hasWelcomed(): boolean { try { return (localStorage.getItem(WELCOMED) || localStorage.getItem('layverse.welcomed.v1')) === '1' } catch { return false } },
  markWelcomed() { try { localStorage.setItem(WELCOMED, '1') } catch { /* ignore */ } },
  reset() { try { localStorage.removeItem(WELCOMED); localStorage.removeItem('layverse.welcomed.v1') } catch { /* ignore */ } },
}

export const planStore = {
  /** Frontend-only guest simulation. Replace with Supabase guest auth + saved plans. */
  clear() { try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_PLANS) } catch { /* ignore */ } },
  seedReturning(): Plan[] {
    const at = (days: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d }
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const plan: Plan = { id: 'p-demo', name: 'Singapore layover', airport: 'SIN', origin: 'CGK', destination: 'CDG',
      arrival: iso(at(3, 14, 10)), departure: iso(at(3, 21, 20)), bufferMin: 120, activityIds: ['s1', 's2'], updatedAt: new Date().toISOString() }
    planStore.save([plan]); return [plan]
  },
  load(): Plan[] {
    try { return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(LEGACY_PLANS) || '[]') } catch { return [] }
  },
  save(plans: Plan[]) {
    try { localStorage.setItem(KEY, JSON.stringify(plans)) } catch { /* ignore */ }
  },
}
