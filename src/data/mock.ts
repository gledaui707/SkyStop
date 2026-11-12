// Illustrative flight comparison data + guest UI flags. The catalogue (airports, activities, itineraries)
// and saved plans are NOT mocked: they come from Supabase via ./catalogue and ./plans.
import type { Flight } from './types'
export { AIRPORTS, ACTIVITIES, TEMPLATES, GRAPHS, isSupported, getAirport, getActivities, getTemplates } from './catalogue'

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

// v2: the three-screen onboarding (Nov 2026). A new key so every browser sees it once.
const WELCOMED = 'skystop.onboarded.v2'
/** Welcome-screen flag only (UI preference). Guest identity itself is a Supabase anonymous session. */
export const guestStore = {
  hasWelcomed(): boolean { try { return localStorage.getItem(WELCOMED) === '1' } catch { return false } },
  markWelcomed() { try { localStorage.setItem(WELCOMED, '1') } catch { /* ignore */ } },
  reset() { try { localStorage.removeItem(WELCOMED) } catch { /* ignore */ } },
}

