import { describe, expect, it } from 'vitest'
import { AIRPORT_GEO, terminalKeyOf, terminalKeysOf } from './airportGeo'

describe('terminalKeyOf: venues go on their own terminal pin, never an invented one', () => {
  it.each([
    ['SIN', 'Terminal 3 transit, Levels 2–3', 'T3'],
    ['SIN', 'Terminal 3 transit, Level 2', 'T3'],
    ['SIN', 'Jewel (public area, linked to T1, T2, T3)', 'JEWEL'],
    ['SIN', 'Terminal 1 transit, Level 3', 'T1'],
    ['LIS', 'Terminal 1, after security', 'T1'],
    ['LHR', 'Terminal 5, after security', 'T5'],
    ['LHR', 'Terminal 2 departures', 'T2'],
    ['DXB', 'Terminal 3, B and C gates', 'T3'],
    ['DXB', 'Terminal 3, Concourses A, B and C', 'T3'],
  ])('%s "%s" -> %s', (ap, t, key) => expect(terminalKeyOf(ap, t)).toBe(key))

  it.each([
    ['SIN', 'Transit areas, T1–T4'],
    ['LHR', 'Terminals 2, 3, 4 and 5'],
    ['DXB', 'Terminal 1 (D gates) and Terminal 3'],
    ['DXB', 'Terminals 1 and 3'],
    ['DXB', undefined],
    ['LIS', 'Terminal 2'], // no T2 point is recorded for Lisbon
    ['XXX', 'Terminal 1'],
  ])('%s "%s" -> not pinned', (ap, t) => expect(terminalKeyOf(ap, t as string | undefined)).toBeNull())

  it('every supported airport has terminal points inside a plausible box around the airport', () => {
    const box: Record<string, [number, number, number, number]> = { LIS: [38.75, 38.8, -9.16, -9.11], SIN: [1.32, 1.38, 103.97, 104.0], LHR: [51.45, 51.48, -0.5, -0.43], DXB: [25.23, 25.27, 55.34, 55.38] }
    for (const [code, [la0, la1, ln0, ln1]] of Object.entries(box))
      for (const t of AIRPORT_GEO[code].terminals) { expect(t.lat).toBeGreaterThan(la0); expect(t.lat).toBeLessThan(la1); expect(t.lng).toBeGreaterThan(ln0); expect(t.lng).toBeLessThan(ln1) }
  })
})

describe('terminalKeysOf: every terminal a venue is in', () => {
  it.each([
    ['LHR', 'Terminals 2, 3, 4 and 5', ['T2', 'T3', 'T4', 'T5']],
    ['SIN', 'Transit areas, T1–T4', ['T1', 'T3', 'T4']], // no T2 point recorded for Changi
    ['SIN', 'Booths in T2 and T3 transit', ['T3']],
    ['DXB', 'Terminal 1 (D gates) and Terminal 3', ['T1', 'T3']],
    ['SIN', 'Jewel, top level (public area)', ['JEWEL']],
    ['DXB', 'Unverified', []],
  ])('%s "%s" -> %j', (ap, t, keys) => expect(terminalKeysOf(ap, t)).toEqual(keys))

})
