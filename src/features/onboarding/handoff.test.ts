import { describe, expect, it } from 'vitest'
import { findSampleJourney } from '../../data/journeys'
import { budget } from '../../data/time'
import { journeyDraft } from './handoff'

describe('onboarding hand-off', () => {
  const j = findSampleJourney('AXR7KD', new Date('2026-11-17T00:00:00Z'))!
  it('builds the planning draft from the booking fixture (same shape the journey screen uses)', () => {
    expect(journeyDraft(j)).toEqual({ name: expect.stringMatching(/ layover$/), airport: 'SIN', arrival: j.layover.arrivalLocal, departure: j.layover.departureLocal,
      bufferMin: j.layover.bufferMin, activityIds: [], origin: 'CGK', destination: 'CDG', bookingRef: 'AXR7KD' })
  })
  it('carries the chosen buffer and activities; flight times never change', () => {
    const d = journeyDraft(j, 180, ['a', 'b'])
    expect([d.bufferMin, d.activityIds, d.arrival, d.departure]).toEqual([180, ['a', 'b'], j.layover.arrivalLocal, j.layover.departureLocal])
  })
  it('the time to explore is the planner budget: connection minus buffer', () => {
    expect(budget(j.layover.totalMin, 180, []).usable).toBe(j.layover.totalMin - 180)
    expect(j.layover.totalMin).toBe(740) // 11:15 → 23:35 in Singapore
  })
})
