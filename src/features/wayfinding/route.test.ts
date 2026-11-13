import { afterEach, describe, expect, it } from 'vitest'
import { planItinerary, type TransferGraph } from '../../domain/itinerary'
import { PATH_GEOMETRY, buildRoute, mapKeyFor, stopsByPin } from './route'
import { metres, walkMinutes } from './mock'

// A small Changi-like graph (shape of the real data; values are test fixtures).
const g: TransferGraph = {
  locations: [
    { id: 'SIN-T1-TRANSIT', name: 'Terminal 1 transit area', zone: 'airside', terminal: 'T1', kind: 'transit_area' },
    { id: 'SIN-T2-TRANSIT', name: 'Terminal 2 transit area', zone: 'airside', terminal: 'T2', kind: 'transit_area' },
    { id: 'SIN-T3-TRANSIT', name: 'Terminal 3 transit area', zone: 'airside', terminal: 'T3', kind: 'transit_area' },
    { id: 'SIN-JEWEL', name: 'Jewel (public area)', zone: 'landside', terminal: null, kind: 'public_area' },
  ],
  transfers: [
    { id: 'a', from: 'SIN-T1-TRANSIT', to: 'SIN-T3-TRANSIT', mode: 'skytrain_or_walk', min: 5, max: 10, immigration: false, departureChecks: false, throughCheck: false, verification: 'official', source: 'https://www.changiairport.com/', note: '' },
    { id: 'b', from: 'SIN-T3-TRANSIT', to: 'SIN-T1-TRANSIT', mode: 'skytrain_or_walk', min: 5, max: 10, immigration: false, departureChecks: false, throughCheck: false, verification: 'official', source: 'https://www.changiairport.com/', note: '' },
    { id: 'c', from: 'SIN-T1-TRANSIT', to: 'SIN-JEWEL', mode: 'walk', min: 5, max: 10, immigration: true, departureChecks: false, throughCheck: false, verification: 'planning_estimate', source: null, note: 'Clear immigration first.' },
    { id: 'd', from: 'SIN-JEWEL', to: 'SIN-T1-TRANSIT', mode: 'walk', min: 5, max: 10, immigration: false, departureChecks: true, throughCheck: false, verification: 'planning_estimate', source: null, note: '' },
  ],
}
const act = (id: string, locationIds: string[], zone: 'airside' | 'landside' = 'airside') => ({ id, name: id, durationMin: 30, zone, locationIds })
const route = (acts: ReturnType<typeof act>[], arrival: string | null, departure: string | null, graph: TransferGraph | null = g) => {
  const itin = planItinerary({ usable: 600, activities: acts, graph, arrivalLocation: arrival, departureLocation: departure })
  return buildRoute('SIN', graph, itin, acts, arrival, departure)
}

afterEach(() => { for (const k of Object.keys(PATH_GEOMETRY)) delete PATH_GEOMETRY[k] })

describe('wayfinding route view', () => {
  it('orders stops: arrival, activities in plan order, departure', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT']), act('Garden', ['SIN-T1-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T3-TRANSIT')
    expect(r.stops.map((s) => [s.n, s.kind, s.mapKey])).toEqual([[0, 'arrival', 'T1'], [1, 'activity', 'T3'], [2, 'activity', 'T1'], [3, 'departure', 'T3']])
    expect(r.legs).toHaveLength(3)
  })
  it('labels a leg verified only when every step is an airport-published time', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(r.legs[0]).toMatchObject({ status: 'verified', minutes: { min: 5, max: 10 } })
  })
  it('labels a leg with a planning estimate as an estimate and lists its checkpoints without a waiting time', () => {
    const r = route([act('Rain Vortex', ['SIN-JEWEL'], 'landside')], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(r.legs[0].status).toBe('estimate')
    expect(r.legs[0].checkpoints.join(' ')).toMatch(/immigration/i)
    expect(r.legs[1].checkpoints.join(' ')).toMatch(/departure immigration and security/i)
  })
  it('gives a leg the graph cannot route a simulated walking estimate that matches its route distance', () => {
    const r = route([act('Lounge', ['SIN-T2-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT') // no T1↔T2 edge in the fixture
    const l = r.legs[0]
    expect(l.status).toBe('estimate')
    expect(l.minutes).toEqual({ min: walkMinutes(l.distanceM), max: walkMinutes(l.distanceM) })
  })
  it('connects consecutive stops: every line starts at one stop\'s point and ends at the next', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT']), act('Cafe', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    for (const l of r.legs) {
      expect(l.geometry![0]).toEqual(l.from.point)
      expect(l.geometry!.at(-1)).toEqual(l.to.point)
    }
  })
  it('never uses a straight line: the route bows through the terminal hub and is longer than the direct distance', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT']), act('Cafe', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    for (const l of r.legs) expect(l.distanceM).toBeGreaterThan(metres(l.from.point!, l.to.point!))
    expect(r.legs[1].geometry!.length).toBeGreaterThan(2) // same terminal: still a curve, not two points
  })
  it('uses registered path geometry when there is one', () => {
    PATH_GEOMETRY['SIN-T1-TRANSIT>SIN-T3-TRANSIT'] = [[1.36, 103.99], [1.355, 103.986]]
    const r = route([act('Lounge', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(r.legs[0].geometry).toHaveLength(2)
  })
  it('places every Changi stop on a pin, including T2 and Jewel', () => {
    expect(mapKeyFor('SIN', g.locations[1])).toBe('T2')
    expect(mapKeyFor('SIN', g.locations[3])).toBe('JEWEL')
  })
  it('gives directions at an airport without routing data, from the venues\' terminals', () => {
    const itin = planItinerary({ usable: 600, activities: [act('Cafe', [])], graph: null })
    const r = buildRoute('LHR', null, itin, [{ id: 'a', name: 'Cafe', terminal: 'Terminal 5' }, { id: 'b', name: 'Shop', terminal: 'Terminal 3' }])
    expect(r.stops.map((s) => s.mapKey)).toEqual(['T5', 'T5', 'T3', 'T3'])
    expect(r.legs.every((l) => l.geometry && l.minutes!.max === walkMinutes(l.distanceM))).toBe(true)
    expect(r.legs[1].distanceM).toBeGreaterThan(r.legs[0].distanceM) // a terminal change is a longer walk
  })
  it('writes short generic directions: start, follow the concourse, continue to the stop; nothing invented', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    const s0 = r.legs[0].steps
    expect(s0[0]).toMatch(/^Start at your arrival gate area in Terminal 1/)
    expect(s0).toContain('Take the Skytrain or travellator to Terminal 3') // the mode comes from the airport's data
    expect(s0.at(-1)).toBe('Continue to Lounge')
    expect(r.legs.flatMap((l) => l.steps).join(' ')).not.toMatch(/gate \d|escalator|security checkpoint|turn (left|right)/i)
  })
  it('only adds an immigration step when the airport data says the move needs it', () => {
    const r = route([act('Rain Vortex', ['SIN-JEWEL'], 'landside')], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(r.legs[0].steps).toContain('Clear arrival immigration')
    expect(route([act('Lounge', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT').legs[0].steps.join(' ')).not.toMatch(/immigration/i)
  })
  it('adds the departure check-in, immigration and security step only when the return re-enters airside', () => {
    const r = route([act('Rain Vortex', ['SIN-JEWEL'], 'landside')], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(r.legs[1].steps).toContain('Check in, then clear departure immigration and security')
    expect(r.legs[0].steps.join(' ')).not.toMatch(/departure immigration/i)
  })
  it('is deterministic and follows the plan order (reordering changes the route)', () => {
    const a = [act('Lounge', ['SIN-T3-TRANSIT']), act('Garden', ['SIN-T1-TRANSIT'])]
    expect(route(a, 'SIN-T1-TRANSIT', 'SIN-T3-TRANSIT')).toEqual(route(a, 'SIN-T1-TRANSIT', 'SIN-T3-TRANSIT'))
    const re = route([...a].reverse(), 'SIN-T1-TRANSIT', 'SIN-T3-TRANSIT')
    expect(re.legs.map((l) => l.to.label)).toEqual(['Garden', 'Lounge', 'Departure'])
  })
  it('groups stop numbers by terminal pin for map badges', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(stopsByPin(r.stops)).toEqual({ T1: [0, 2], T3: [1] })
  })
})
