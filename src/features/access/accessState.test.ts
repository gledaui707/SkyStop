import { describe, expect, it } from 'vitest'
import { resumeAccessOnLaunch, shouldOfferAccess } from './accessState'

describe('account access screen decisions', () => {
  it('is offered after onboarding to a visitor with no session and no earlier choice', () => {
    expect(shouldOfferAccess(null, 'none')).toBe(true)
    expect(shouldOfferAccess('pending', 'none')).toBe(true)
  })
  it('is not offered again once a choice was made', () => {
    expect(shouldOfferAccess('done', 'none')).toBe(false)
  })
  it('is not offered when this browser already has a guest or signed-in session', () => {
    for (const s of ['guest', 'guest-pending', 'registered'] as const) expect(shouldOfferAccess(null, s)).toBe(false)
  })
  it('reopens on launch only for visitors who left it without choosing', () => {
    expect(resumeAccessOnLaunch(true, 'pending')).toBe(true)
    expect(resumeAccessOnLaunch(true, 'done')).toBe(false)
    expect(resumeAccessOnLaunch(true, null)).toBe(false)
    expect(resumeAccessOnLaunch(false, 'pending')).toBe(false)
  })
})
