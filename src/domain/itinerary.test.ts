import { describe, expect, it } from 'vitest'
import { planItinerary, shortestPath, WITHIN_AREA, type GraphLocation, type GraphTransfer, type PlanActivity, type TransferGraph } from './itinerary'

// Mirrors supabase/migrations/202611130001_transfer_graph.sql (Changi pilot).
const e = (id: string, from: string, to: string, min: number, max: number, extra: Partial<GraphTransfer> = {}): GraphTransfer =>
  ({ id, from, to, mode: 'skytrain_or_walk', min, max, immigration: false, departureChecks: false, throughCheck: false, verification: 'official', source: 'https://www.changiairport.com/', note: '', ...extra })
const T = (n: number) => `SIN-T${n}-TRANSIT`
const SIN: TransferGraph = {
  locations: [...[1, 2, 3, 4].map((n): GraphLocation => ({ id: T(n), name: `Terminal ${n} transit area`, zone: 'airside', terminal: `T${n}`, kind: 'transit_area' })),
    { id: 'SIN-JEWEL', name: 'Jewel (public area)', zone: 'landside', terminal: null, kind: 'public_area' }],
  transfers: [
    ...[[1, 2], [2, 1], [2, 3], [3, 2], [1, 3], [3, 1]].map(([a, b]) => e(`${a}${b}`, T(a), T(b), 5, 10)),
    ...[1, 2, 3].flatMap((n) => [e(`4${n}`, T(4), T(n), 10, 18, { mode: 'shuttle_bus', throughCheck: true }), e(`${n}4`, T(n), T(4), 10, 18, { mode: 'shuttle_bus', throughCheck: true })]),
    e('3J', T(3), 'SIN-JEWEL', 5, 10, { immigration: true, mode: 'link_bridge_walk' }),
    e('J3', 'SIN-JEWEL', T(3), 5, 10, { departureChecks: true, mode: 'link_bridge_walk' }),
    e('1J', T(1), 'SIN-JEWEL', 5, 10, { immigration: true, verification: 'planning_estimate', mode: 'walk' }),
  ],
}
const butterfly: PlanActivity = { id: 'b', name: 'Butterfly Garden', durationMin: 30, zone: 'airside', locationIds: [T(3)] }
const harrys: PlanActivity = { id: 'h', name: "Harry's", durationMin: 40, zone: 'airside', locationIds: [T(3)] }
const pool: PlanActivity = { id: 'p', name: 'Rooftop pool', durationMin: 60, zone: 'airside', locationIds: [T(1)] }
const snooze: PlanActivity = { id: 's', name: 'Free Snooze Lounge', durationMin: 45, zone: 'airside', locationIds: [T(1), T(2), T(3), T(4)] }
const vortex: PlanActivity = { id: 'v', name: 'Jewel Rain Vortex', durationMin: 40, zone: 'landside', locationIds: ['SIN-JEWEL'] }
const plan = (activities: PlanActivity[], usable = 300, arr: string | null = T(3), dep: string | null = T(3)) =>
  planItinerary({ usable, activities, graph: SIN, arrivalLocation: arr, departureLocation: dep })

describe('shortestPath', () => {
  it('follows published routes and never invents one', () => {
    expect(shortestPath(SIN, T(3), T(1))).toMatchObject({ min: 5, max: 10 })
    expect(shortestPath(SIN, T(4), T(1))).toMatchObject({ min: 10, max: 18 })
    expect(shortestPath(SIN, 'SIN-JEWEL', T(1))).toMatchObject({ min: 10, max: 20 }) // via T3, with departure checks
    expect(shortestPath(SIN, 'SIN-JEWEL', T(2))?.edges.map((x) => x.id)).toEqual(['J3', '32'])
    expect(shortestPath({ ...SIN, transfers: [] }, T(1), T(2))).toBeNull()
  })
})

describe('Scenario A: airside-only itinerary', () => {
  it('two T3 venues: within-area planning estimates, counted at the upper end, fits', () => {
    const r = plan([butterfly, harrys])
    expect(r.hops.map((h) => h.kind)).toEqual(['same-area', 'same-area', 'same-area'])
    expect(r.transferMin).toBe(3 * WITHIN_AREA.max)
    expect(r.remaining).toBe(300 - 70 - 30)
    expect(r.time).toBe('fits'); expect(r.access).toBe('airside')
    expect(r.hops.every((h) => h.verification === 'planning_estimate')).toBe(true)
  })
  it('T3 → T1 uses the official Skytrain range and picks the nearest Snooze Lounge', () => {
    const r = plan([butterfly, pool, snooze])
    expect(r.hops[1]).toMatchObject({ kind: 'route', min: 5, max: 10, verification: 'official' })
    expect(r.hops[2]).toMatchObject({ kind: 'same-area', toLocation: T(1) }) // Snooze Lounge in T1, not T4
    expect(r.hops[3]).toMatchObject({ kind: 'route', isReturn: true }) // back to the T3 departure area
    expect(r.activityMin).toBe(135)
    expect(r.remaining).toBe(300 - 135 - (10 + 10 + 10 + 10))
  })
  it('T4 involves the shuttle and says it needs a through-checked itinerary', () => {
    const r = plan([pool], 300, T(4), T(4))
    expect(r.hops[0]).toMatchObject({ min: 10, max: 18, throughCheck: true })
    expect(r.warnings.join(' ')).toMatch(/through-checked/)
  })
})

describe('Scenario B: landside activity (Jewel)', () => {
  it('flags immigration, entry verification and unknown procedure time; never claims it fits', () => {
    const r = plan([butterfly, vortex])
    expect(r.hops[1]).toMatchObject({ immigration: true, verification: 'official' })
    expect(r.hops[2]).toMatchObject({ departureChecks: true, isReturn: true })
    expect(r.access).toBe('entry-required')
    expect(r.proceduresUnknown).toBe(true)
    expect(r.time).toBe('unverified')
    expect(r.warnings.join(' ')).toMatch(/Jewel Rain Vortex is outside the transit area\. Immigration clearance is required/)
    expect(r.warnings.join(' ')).not.toMatch(/eligible|approved|guaranteed/i)
  })
})

describe('Scenario C: over budget', () => {
  it('activities plus the lower bound of transfers exceed usable time', () => {
    const r = plan([butterfly, pool, harrys], 120)
    expect(r.time).toBe('exceeds')
    expect(r.warnings[0]).toMatch(/exceeds your estimated available time by at least/)
  })
  it('tight when it only fits with little to spare', () => {
    expect(plan([butterfly, harrys], 70 + 30 + 10).time).toBe('tight')
  })
})

describe('Scenario D: unknown transfer', () => {
  it('a missing route adds no minutes and makes the result unverifiable', () => {
    const noJewelReturn: TransferGraph = { ...SIN, transfers: SIN.transfers.filter((x) => x.from !== 'SIN-JEWEL') }
    const r = planItinerary({ usable: 600, activities: [vortex], graph: noJewelReturn, arrivalLocation: T(3), departureLocation: T(3) })
    expect(r.hops[1].kind).toBe('unknown')
    expect(r.time).toBe('unverified')
    expect(r.warnings.join(' ')).toMatch(/has not been verified/)
  })
  it('unset terminals: cannot verify, and asks for them', () => {
    const r = plan([butterfly], 300, null, null)
    expect(r.unknownTransfers).toBe(2); expect(r.time).toBe('unverified')
    expect(r.warnings.join(' ')).toMatch(/Choose your arrival and departure terminals/)
  })
  it('airport without routing data: activities only, no transfers', () => {
    const r = planItinerary({ usable: 200, activities: [butterfly], graph: null })
    expect(r).toMatchObject({ routing: false, hops: [], transferMin: 0, remaining: 170, time: 'fits' })
  })
})

describe('Scenario E: editing recomputes', () => {
  it('reordering changes transfers; removing the landside stop clears the access warning', () => {
    const a = plan([pool, butterfly, harrys]), b = plan([butterfly, harrys, pool])
    expect(a.transferMin).toBe(b.transferMin) // same multiset of moves here …
    expect(a.hops.map((h) => h.kind)).not.toEqual(b.hops.map((h) => h.kind)) // … in a different order
    expect(plan([butterfly, vortex]).access).toBe('entry-required')
    expect(plan([butterfly]).access).toBe('airside')
  })
})
