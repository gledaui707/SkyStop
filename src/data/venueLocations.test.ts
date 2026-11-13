import { describe, expect, it } from 'vitest'
import { branchTarget, groupByTerminal, venueLocations } from './venueLocations'
import type { Activity } from './types'

const v = (airport: string, name: string, category: Activity['category'], terminal: string | undefined, access: Activity['access']) =>
  ({ id: `${airport}-${name}`, airport, name, category, terminal, access }) as Activity

describe('venue locations', () => {
  it('lists the terminals the catalogue names first, flagged as listed', () => {
    const l = venueLocations(v('LHR', 'Harrods', 'Shopping', 'Terminals 2, 3, 4 and 5', 'Unverified'))
    expect(l.filter((x) => x.listed).map((x) => x.terminal)).toEqual(['T2', 'T3', 'T4', 'T5'])
  })
  it('keeps named gate areas from the catalogue on the right terminal', () => {
    const l = venueLocations(v('DXB', 'Be Relax spa', 'Rest', 'Terminal 1 (D gates) and Terminal 3', 'Airside'))
    expect(l.find((x) => x.terminal === 'T1' && x.listed)?.area).toBe('D gates – Departures')
    expect(venueLocations(v('DXB', 'Sleepover lounge', 'Rest', 'Terminal 3, Concourses A, B and C', 'Airside')).map((x) => x.area))
      .toEqual(['A gates – Departures', 'B gates – Departures', 'C gates – Departures'])
  })
  it('varies the number of branches: coffee chains many, boutiques few, attractions one', () => {
    const coffee = venueLocations(v('SIN', 'Starbucks', 'Food', 'Terminal 1 transit', 'Airside'))
    const aesop = venueLocations(v('DXB', 'Aesop', 'Shopping', 'Terminal 3', 'Unverified'))
    const garden = venueLocations(v('SIN', 'Butterfly Garden', 'Sights', 'Terminal 3 transit, Levels 2–3', 'Airside'))
    expect(coffee.length).toBeGreaterThanOrEqual(5)
    expect(aesop.length).toBeLessThanOrEqual(2)
    expect(garden).toHaveLength(1)
    expect(branchTarget({ id: 'x', name: 'Costa Coffee', category: 'Food' })).toBeGreaterThan(branchTarget({ id: 'x', name: 'Aesop', category: 'Shopping' }))
  })
  it('only simulates branches in the venue\'s own zone (an airside café is never put in an arrivals hall)', () => {
    const l = venueLocations(v('SIN', 'Starbucks', 'Food', 'Terminal 1 transit', 'Airside'))
    expect(l.every((x) => x.zone === 'airside')).toBe(true)
    expect(l.some((x) => /arrival|hall/i.test(x.area))).toBe(false)
  })
  it('is deterministic, has unique ids and groups by terminal in the airport\'s order', () => {
    const a = v('DXB', 'Dubai Duty Free', 'Shopping', 'Terminals 1 and 3', 'Airside')
    expect(venueLocations(a)).toEqual(venueLocations(a))
    const l = venueLocations(a)
    expect(new Set(l.map((x) => x.id)).size).toBe(l.length)
    expect(groupByTerminal(l).map((g) => g.terminal)).toEqual(['T1', 'T3'])
  })
})
