import { flushSync } from 'react-dom'
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Draft, Plan } from './data/types'
import { guestStore } from './data/mock'
import { loadCatalogue } from './data/catalogue'
import { fetchPlans, removePlan as removeSaved, saveDraft } from './data/plans'
import { getSupabase } from './api/client'
import { getAccount, type Account } from './api/account'
import { getProfile, type DataError } from './api/repositories'
import type { TravelerProfileRow } from './types/database.types'
import { accessStore, resumeAccessOnLaunch, shouldOfferAccess } from './features/access/accessState'

export type LoadState = { status: 'loading' | 'ready' | 'error'; error?: string }
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export type Route =
  | { name: 'welcome' }
  /** Account Access: Create account / Sign in / Continue as guest, once after onboarding. */
  /** Account access (SS screen). With `auth`, opens with the email field for that choice (e.g. from Profile). */
  | { name: 'access'; auth?: 'create' | 'signin' }
  | { name: 'discover' }
  | { name: 'find' }
  | { name: 'trip'; airport?: string; templateId?: string }
  /** Booking-reference entry (the primary way to plan) and the journey overview it opens. */
  | { name: 'booking' }
  | { name: 'journey'; ref: string }
  | { name: 'results'; origin: string; destination: string; date: string }
  | { name: 'flight'; flightId: string; origin: string; destination: string; date: string }
  | { name: 'compare'; ids: string[]; origin: string; destination: string; date: string }
  | { name: 'airports' }
  | { name: 'airport'; code: string; view?: 'map' | 'list' }
  | { name: 'builder' }
  | { name: 'plans' }
  | { name: 'plan'; id: string }
  /** All saved flight journeys (upcoming and past). */
  | { name: 'flights' }
  /** `auth` opens the account form directly (from Account Access). */
  | { name: 'profile'; auth?: 'create' | 'signin' }

export type Tab = 'home' | 'airports' | 'plans'
export const tabOf = (r: Route): Tab | null => {
  switch (r.name) {
    case 'welcome': case 'access': return null
    case 'discover': case 'flights': case 'profile': case 'find': case 'trip': case 'booking': case 'journey': case 'results': case 'flight': case 'compare': return 'home'
    case 'airports': case 'airport': return 'airports'
    case 'plans': case 'plan': case 'builder': return 'plans'
    default: return null
  }
}

/** Contextual hints: 1 add journey, 2 understand time, 3 build experience. */
export type HintStage = 1 | 2 | 3 | 'done'
const HINT_KEY = 'skystop.hints.v1'

interface Ctx {
  route: Route
  go: (r: Route) => void
  replace: (r: Route) => void
  back: () => void
  switchTab: (t: Tab) => void
  /** Catalogue (airports, activities, itineraries) loaded from the database. */
  catalogue: LoadState
  /** This guest's saved plans, loaded from the database. */
  plans: Plan[]
  plansState: LoadState
  reload: () => void
  /** Saves to the database; resolves with the server copy or rejects with a readable error. */
  savePlan: (d: Draft) => Promise<Plan>
  /** Removes a saved flight together with its itinerary. */
  removePlan: (id: string) => Promise<void>
  /** Guest / account state (Supabase Auth). */
  account: Account
  refreshAccount: () => Promise<void>
  /** Optional traveller profile (owner-only). null when none is saved. */
  profile: TravelerProfileRow | null
  setProfile: (p: TravelerProfileRow | null) => void
  draft: Draft | null
  setDraft: (d: Draft | null) => void
  /** Activities chosen while exploring an airport before layover times exist. Carried into the setup form. */
  picked: Picked | null
  setPicked: (p: Picked | null) => void
  /** One-off confirmation shown on the next screen (e.g. after a first save). */
  notice: string | null
  setNotice: (n: string | null) => void
  welcomed: boolean
  finishWelcome: (to: Route) => void
  /** Leaves Account Access for good: Home, with `to` (e.g. the account form) opened on top. */
  finishAccess: (to?: Route) => void
  /** Shows the onboarding again (from Home's "How SkyStop works"). */
  replayOnboarding: () => void
  hint: HintStage
  advanceHint: (to: 2 | 3) => void
  nextHint: () => void
  skipHints: () => void
}
export interface Picked { airport: string; ids: string[] }
const C = createContext<Ctx>(null!)
export const useApp = () => useContext(C)

function init() {
  // ?state=new shows the first-visit welcome again. Saved plans always come from the database.
  const q = new URLSearchParams(window.location.search).get('state')
  if (q === 'new') { guestStore.reset(); accessStore.reset(); try { sessionStorage.removeItem(HINT_KEY) } catch { /* ignore */ } }
  let hint: HintStage = 1
  try { const v = sessionStorage.getItem(HINT_KEY); if (v) hint = v === 'done' ? 'done' : (Number(v) as HintStage) } catch { /* ignore */ }
  const welcomed = guestStore.hasWelcomed()
  return { hint, welcomed, access: resumeAccessOnLaunch(welcomed, accessStore.get()) }
}

/** Screen-to-screen motion with the View Transitions API: pushes slide in from the trailing edge, back slides out,
 *  tab switches crossfade. The tab bar and toasts keep their own names so they stay put. Falls back to an instant
 *  update (plus the CSS fade) where unsupported or when reduced motion is preferred. */
type NavKind = 'push' | 'pop' | 'tab'
function transition(kind: NavKind, update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduce) { update(); return }
  const root = document.documentElement
  root.dataset.nav = kind
  const t = doc.startViewTransition(() => flushSync(update))
  void t.finished.catch(() => {}).finally(() => { if (root.dataset.nav === kind) delete root.dataset.nav })
}

export function AppProvider({ children }: { children: ReactNode }) {
  const refreshAccountRef = useRef<(() => Promise<void>) | null>(null)
  const [boot] = useState(init)
  const [welcomed, setWelcomed] = useState(boot.welcomed)
  const [stack, setStack] = useState<Route[]>([{ name: !boot.welcomed ? 'welcome' : boot.access ? 'access' : 'discover' }])
  const [plans, setPlans] = useState<Plan[]>([])
  const [catalogue, setCatalogue] = useState<LoadState>({ status: 'loading' })
  const [plansState, setPlansState] = useState<LoadState>({ status: 'loading' })
  const [draft, setDraftState] = useState<Draft | null>(null)
  /** Every unsaved draft gets one client-generated id, reused if a save has to be retried. */
  const setDraft = useCallback((d: Draft | null) => setDraftState(d && !d.planId && !d.newId ? { ...d, newId: crypto.randomUUID() } : d), [])
  const [picked, setPicked] = useState<Picked | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [hint, setHintState] = useState<HintStage>(boot.hint)
  const setHint = (h: HintStage) => { setHintState(h); try { sessionStorage.setItem(HINT_KEY, String(h)) } catch { /* ignore */ } }
  const go = useCallback((r: Route) => { setNotice(null); transition('push', () => { setStack((s) => [...s, r]); window.scrollTo(0, 0) }) }, [])
  const replace = useCallback((r: Route) => transition('push', () => { setStack((s) => [...s.slice(0, -1), r]); window.scrollTo(0, 0) }), [])
  const back = useCallback(() => transition('pop', () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))), [])
  // The notice is cleared now, not inside the deferred transition, so a confirmation set right after still shows.
  const switchTab = useCallback((t: Tab) => { setNotice(null); transition('tab', () => {
    setStack([{ name: t === 'home' ? 'discover' : t }])
    window.scrollTo(0, 0)
  }) }, [])
  const reload = useCallback(() => {
    void (async () => {
      setCatalogue({ status: 'loading' }); setPlansState({ status: 'loading' })
      try { await loadCatalogue(); setCatalogue({ status: 'ready' }) }
      catch (e) { setCatalogue({ status: 'error', error: errText(e) }); return }
      try {
        const mine = await fetchPlans()
        setPlans(mine); setPlansState({ status: 'ready' })
        if (mine.length > 0) setHintState('done')
      } catch (e) { setPlansState({ status: 'error', error: errText(e) }) }
    })()
  }, [])
  useEffect(reload, [reload])
  /** Re-reads only this user's flights (after signing in or out); the catalogue stays loaded. */
  const reloadPlans = useCallback(async () => {
    try { setPlans(await fetchPlans()); setPlansState({ status: 'ready' }) } catch (e) { setPlansState({ status: 'error', error: errText(e) }) }
  }, [])
  const [account, setAccount] = useState<Account>({ status: 'none' })
  const [profile, setProfile] = useState<TravelerProfileRow | null>(null)
  const refreshAccount = useCallback(async () => {
    const sb = getSupabase()
    try { setAccount(await getAccount(sb)) } catch { /* offline: keep the last known state */ }
    try { setProfile(await getProfile(sb)) } catch (e) { void (e as DataError) }
  }, [])
  refreshAccountRef.current = refreshAccount
  useEffect(() => {
    void refreshAccount()
    // Another identity (email link, sign-in, sign-out) means other flights and another profile: reload them.
    // Starting the first guest session (no identity -> guest) is not a switch: nothing else could have been loaded.
    let last: string | undefined
    const { data } = getSupabase().auth.onAuthStateChange((_ev, session) => {
      const id = session?.user.id
      void refreshAccount()
      if (last && id !== last) void reloadPlans()
      if (id || last === undefined) last = id ?? ''
      else last = ''
    })
    return () => data.subscription.unsubscribe()
  }, [refreshAccount, reloadPlans])
  const removePlan = async (id: string) => {
    await removeSaved(id)
    setPlans((cur) => cur.filter((p) => p.id !== id))
  }
  const savePlan = async (d: Draft) => {
    const p = await saveDraft(d)
    setPlans((cur) => (cur.some((x) => x.id === p.id) ? cur.map((x) => (x.id === p.id ? p : x)) : [p, ...cur]))
    setPlansState({ status: 'ready' })
    void refreshAccountRef.current?.() // the first save starts a guest session
    return p
  }
  /** Leaves the onboarding for good. It is replaced by Home, and the chosen route opens on top of Home. */
  const finishWelcome = (to: Route) => {
    guestStore.markWelcomed(); setWelcomed(true)
    if (shouldOfferAccess(accessStore.get(), account.status)) { accessStore.set('pending'); setStack([{ name: 'access' }]) }
    else setStack(to.name === 'discover' ? [to] : [{ name: 'discover' }, to])
    window.scrollTo(0, 0)
  }
  const finishAccess = useCallback((to?: Route) => {
    accessStore.set('done'); setNotice(null)
    setStack(to ? [{ name: 'discover' }, to] : [{ name: 'discover' }]); window.scrollTo(0, 0)
  }, [])
  const replayOnboarding = () => { setNotice(null); setStack((s) => [...s, { name: 'welcome' }]); window.scrollTo(0, 0) }
  const advanceHint = (to: 2 | 3) => { if (hint !== 'done' && hint < to) setHint(to) }
  const nextHint = () => { if (hint === 'done') return; setHint(hint >= 3 ? 'done' : ((hint + 1) as HintStage)) }
  const skipHints = () => setHint('done')
  return (
    <C.Provider value={{ route: stack[stack.length - 1], go, replace, back, switchTab, catalogue, plans, plansState, reload, savePlan, removePlan, account, refreshAccount, profile, setProfile, draft, setDraft, picked, setPicked, notice, setNotice, welcomed, finishWelcome, finishAccess, replayOnboarding, hint, advanceHint, nextHint, skipHints }}>
      {children}
    </C.Provider>
  )
}
