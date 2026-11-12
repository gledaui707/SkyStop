/** Where the visitor stands with the account-access screen (UI preference only; identity lives in Supabase Auth).
 *  The screen is never forced: it opens only when the visitor chooses Create account or Sign in.
 *  'done' – the visitor finished with it; 'pending' and null – no choice recorded. */
export type AccessState = 'pending' | 'done' | null

const KEY = 'skystop.access.v1'

export const accessStore = {
  get(): AccessState {
    try { const v = localStorage.getItem(KEY); return v === 'pending' || v === 'done' ? v : null } catch { return null }
  },
  set(v: 'pending' | 'done') { try { localStorage.setItem(KEY, v) } catch { /* ignore */ } },
  reset() { try { localStorage.removeItem(KEY) } catch { /* ignore */ } },
}
