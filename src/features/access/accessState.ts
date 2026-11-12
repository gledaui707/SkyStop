import type { AccountStatus } from '../../api/account'

/** Where the visitor stands with the account-access screen (UI preference only; identity lives in Supabase Auth).
 *  'pending' – onboarding finished, no choice made yet (shown again on the next launch)
 *  'done'    – the visitor chose Create account, Sign in or Continue as guest
 *  null      – never offered (visitors from before this screen existed are not interrupted) */
export type AccessState = 'pending' | 'done' | null

const KEY = 'skystop.access.v1'

export const accessStore = {
  get(): AccessState {
    try { const v = localStorage.getItem(KEY); return v === 'pending' || v === 'done' ? v : null } catch { return null }
  },
  set(v: 'pending' | 'done') { try { localStorage.setItem(KEY, v) } catch { /* ignore */ } },
  reset() { try { localStorage.removeItem(KEY) } catch { /* ignore */ } },
}

/** After onboarding: offer the screen unless a choice was already made or this browser already has a session
 *  (a guest who saved something, or a signed-in account). */
export const shouldOfferAccess = (state: AccessState, account: AccountStatus): boolean => state !== 'done' && account === 'none'

/** On launch: reopen it only for visitors who reached it and left without choosing. */
export const resumeAccessOnLaunch = (welcomed: boolean, state: AccessState): boolean => welcomed && state === 'pending'
