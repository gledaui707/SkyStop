// Where a venue can be found: one row per branch, grouped by terminal (activity details → Location).
//   listed    rows come from the venue's own terminal text in the catalogue ("Terminals 2, 3, 4 and 5",
//             "Terminal 1 (D gates) and Terminal 3", "Terminal 3 transit, Level 2").
//   simulated extra branches for the demo (owner request, 13 Nov 2026): chains such as coffee shops, bakeries and
//             duty free get several, boutiques and lounges one or two, attractions none. Picked deterministically from
//             each terminal's general areas below, filtered to the venue's airside / landside zone. Never stored.
// Area names are broad zones of each terminal (gate areas, departures, arrivals), not exact unit positions.
import { AIRPORT_GEO, terminalKeysOf } from './airportGeo'
import type { Activity } from './types'

type Zone = 'airside' | 'landside'
interface Area { label: string; zone: Zone; gates?: string }

const gates = (letters: string, suffix = 'Departures'): Area[] => [...letters].map((g) => ({ label: `${g} gates – ${suffix}`, zone: 'airside', gates: g }))
const AREAS: Record<string, Record<string, Area[]>> = {
  SIN: {
    T1: [...gates('CDE', 'Transit'), { label: 'Departure hall', zone: 'landside' }, { label: 'Arrival hall', zone: 'landside' }],
    T2: [...gates('EF', 'Transit'), { label: 'Departure hall', zone: 'landside' }, { label: 'Arrival hall', zone: 'landside' }],
    T3: [...gates('AB', 'Transit'), { label: 'Departure hall', zone: 'landside' }, { label: 'Arrival hall', zone: 'landside' }],
    T4: [...gates('GH', 'Transit'), { label: 'Departure hall', zone: 'landside' }],
    JEWEL: [{ label: 'Level 1', zone: 'landside' }, { label: 'Level 2', zone: 'landside' }, { label: 'Basement 1', zone: 'landside' }],
  },
  LHR: {
    T2: [...gates('AB'), { label: 'Departures – after security', zone: 'airside' }, { label: 'Arrivals', zone: 'landside' }],
    T3: [{ label: 'Departures – after security', zone: 'airside' }, { label: 'Departures – before security', zone: 'landside' }, { label: 'Arrivals', zone: 'landside' }],
    T4: [{ label: 'Departures – after security', zone: 'airside' }, { label: 'Arrivals', zone: 'landside' }],
    T5: [...gates('ABC'), { label: 'Departures – after security', zone: 'airside' }, { label: 'Arrivals', zone: 'landside' }],
  },
  DXB: {
    T1: [...gates('D'), { label: 'Departures – after security', zone: 'airside' }, { label: 'Arrivals', zone: 'landside' }],
    T3: [...gates('ABC'), { label: 'Departures – after security', zone: 'airside' }, { label: 'Arrivals', zone: 'landside' }],
  },
  LIS: {
    T1: [{ label: 'Departures – Schengen area', zone: 'airside' }, { label: 'Departures – non-Schengen area', zone: 'airside' },
      { label: 'Departures – before security', zone: 'landside' }, { label: 'Arrivals', zone: 'landside' }],
  },
}

export interface VenueLocation {
  /** Stable id within the venue ("T3:A gates – Departures"). */
  id: string
  terminal: string
  terminalName: string
  area: string
  zone: Zone
  /** True when this terminal comes from the venue's own catalogue entry; false for a simulated branch. */
  listed: boolean
}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0 }

/** How many branches a venue has: chains many, boutiques few, attractions one. */
export function branchTarget(a: Pick<Activity, 'id' | 'name' | 'category'>): number {
  const h = hash(a.id + a.name), n = a.name
  if (a.category === 'Sights') return 1
  if (/coffee|caf[eé]|starbucks|costa|pret|padaria|bakery|toast|\btea\b|daily|bagel|juice/i.test(n)) return 5 + (h % 4) // 5–8
  if (/duty free|whsmith|boots|relay|fnac|pharmac|news|travel essentials/i.test(n)) return 5 + (h % 3) // 5–7
  if (/aesop|harrods|herm[eè]s|chanel|gucci|dior|tiffany|lego|rolex|spa\b/i.test(n)) return 1 + (h % 2) // 1–2
  if (/lounge|pool|snooze|majlis|ramsay|fortnum|curator|bar\b|dining|restaurant/i.test(n)) return 1
  return 2 + (h % 3) // 2–4
}

const zonesOf = (a: Activity): Zone[] => (a.access === 'Airside' ? ['airside'] : a.access === 'Landside' ? ['landside'] : ['airside', 'landside'])

/** The venue's own wording for its place in a terminal ("Level 2", "after security"), when it names one terminal. */
function listedArea(text: string, zone: Zone): string {
  const t = text.replace(/^(Terminals?\s*\d[^,]*|T\d)\s*,?\s*/i, '').trim()
  if (/transit/i.test(text)) return `Transit area${/Level/i.test(text) ? ` – ${text.match(/Levels? [\d–-]+/i)?.[0]}` : ''}`
  if (/after security/i.test(t)) return 'Departures – after security'
  if (/departures/i.test(t)) return 'Departures'
  if (/public area|top level/i.test(text)) return /top level/i.test(text) ? 'Top level' : 'Public area'
  return zone === 'airside' ? 'Departures – after security' : 'Public area'
}

export function venueLocations(a: Activity): VenueLocation[] {
  const areas = AREAS[a.airport] ?? {}
  const ts = AIRPORT_GEO[a.airport]?.terminals ?? []
  const nameOf = (k: string) => ts.find((t) => t.key === k)?.name ?? k
  const zones = zonesOf(a)
  const out: VenueLocation[] = []
  const add = (k: string, area: string, zone: Zone, listed: boolean) => {
    const id = `${k}:${area}`
    if (!out.some((l) => l.id === id)) out.push({ id, terminal: k, terminalName: nameOf(k), area, zone, listed })
  }

  // 1. Listed: the terminals (and gate areas) the catalogue names for this venue.
  const keys = terminalKeysOf(a.airport, a.terminal)
  const text = a.terminal ?? ''
  const letters = [...text.matchAll(/\b([A-H])\b(?=[ ,)]|$)/g)].map((m) => m[1]).filter((g) => /gates|concourse/i.test(text))
  for (const k of keys) {
    const zone = zones[0]
    const own = (areas[k] ?? []).filter((x) => x.gates && letters.includes(x.gates))
    if (own.length) own.forEach((x) => add(k, x.label, x.zone, true))
    else add(k, a.access === 'Unverified' && !/transit|security|departures|public|level/i.test(text) ? 'Main terminal' : listedArea(text, zone), zone, true)
  }

  // 2. Simulated branches, chosen deterministically from the zone-compatible areas not used yet.
  //    Small venues (≤ 3 branches) stay in their own terminal(s); departures areas come before arrivals.
  const target = branchTarget(a), want = Math.max(out.length, target) - out.length
  if (want > 0) {
    const own = new Set(keys)
    const rank = (k: string, x: Area) => (target <= 3 && own.size && !own.has(k) ? 2 : 0) + (x.zone === 'landside' && zones.length > 1 ? 1 : 0)
    const pool = Object.entries(areas).flatMap(([k, list]) => list.filter((x) => zones.includes(x.zone)).map((x) => ({ k, x })))
      .filter(({ k, x }) => !out.some((l) => l.id === `${k}:${x.label}`))
      .sort((p, q) => rank(p.k, p.x) - rank(q.k, q.x) || hash(a.id + p.k + p.x.label) - hash(a.id + q.k + q.x.label))
    for (const { k, x } of pool.slice(0, want)) add(k, x.label, x.zone, false)
  }
  if (!out.length) return []
  // Grouped by terminal in the airport's order; listed rows first within a terminal.
  const order = (k: string) => { const i = ts.findIndex((t) => t.key === k); return i < 0 ? 99 : i }
  return out.map((l, i) => ({ l, i })).sort((p, q) => order(p.l.terminal) - order(q.l.terminal) || Number(q.l.listed) - Number(p.l.listed) || p.i - q.i).map(({ l }) => l)
}

/** Terminal keys where a venue has at least one location (listed or simulated). */
export const venueTerminalKeys = (a: Activity) => [...new Set(venueLocations(a).map((l) => l.terminal))]

/** Locations grouped by terminal, for the details sheet. */
export function groupByTerminal(locs: VenueLocation[]): { terminal: string; name: string; items: VenueLocation[] }[] {
  const out: { terminal: string; name: string; items: VenueLocation[] }[] = []
  for (const l of locs) {
    const g = out.find((x) => x.terminal === l.terminal)
    if (g) g.items.push(l); else out.push({ terminal: l.terminal, name: l.terminalName, items: [l] })
  }
  return out
}
