import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Draft, Plan } from './data/types'
import { guestStore } from './data/mock'
import { loadCatalogue } from './data/catalogue'
import { fetchPlans, saveDraft } from './data/plans'

export type LoadState = { status: 'loading' | 'ready' | 'error'; error?: string }
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export type Route =
  | { name: 'welcome' }
  | { name: 'discover' }
  | { name: 'find' }
  | { name: 'trip'; airport?: string; templateId?: string }
  | { name: 'results'; origin: string; destination: string; date: string }
  | { name: 'flight'; flightId: string; origin: string; destination: string; date: string }
  | { name: 'compare'; ids: string[]; origin: string; destination: string; date: string }
  | { name: 'airports' }
  | { name: 'airport'; code: string; view?: 'map' | 'list' }
  | { name: 'builder' }
  | { name: 'plans' }
  | { name: 'plan'; id: string }

export type Tab = 'home' | 'airports' | 'plans'
export const tabOf = (r: Route): Tab | null => {
  switch (r.name) {
    case 'welcome': return null
    case 'discover': case 'find': case 'trip': case 'results': case 'flight': case 'compare': return 'home'
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
  if (q === 'new') { guestStore.reset(); try { sessionStorage.removeItem(HINT_KEY) } catch { /* ignore */ } }
  let hint: HintStage = 1
  try { const v = sessionStorage.getItem(HINT_KEY); if (v) hint = v === 'done' ? 'done' : (Number(v) as HintStage) } catch { /* ignore */ }
  return { hint, welcomed: guestStore.hasWelcomed() }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(init)
  const [welcomed, setWelcomed] = useState(boot.welcomed)
  const [stack, setStack] = useState<Route[]>([{ name: boot.welcomed ? 'discover' : 'welcome' }])
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
  const go = useCallback((r: Route) => { setNotice(null); setStack((s) => [...s, r]); window.scrollTo(0, 0) }, [])
  const replace = useCallback((r: Route) => { setStack((s) => [...s.slice(0, -1), r]); window.scrollTo(0, 0) }, [])
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), [])
  const switchTab = useCallback((t: Tab) => {
    setNotice(null)
    setStack([{ name: t === 'home' ? 'discover' : t }])
    window.scrollTo(0, 0)
  }, [])
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
  const savePlan = async (d: Draft) => {
    const p = await saveDraft(d)
    setPlans((cur) => (cur.some((x) => x.id === p.id) ? cur.map((x) => (x.id === p.id ? p : x)) : [p, ...cur]))
    setPlansState({ status: 'ready' })
    return p
  }
  /** Leaves the welcome screen for good; Skip replaces it with Home, other actions push on top. */
  const finishWelcome = (to: Route) => {
    guestStore.markWelcomed(); setWelcomed(true)
    setStack((s) => (to.name === 'discover' ? [to] : [...s, to])); window.scrollTo(0, 0)
  }
  const advanceHint = (to: 2 | 3) => { if (hint !== 'done' && hint < to) setHint(to) }
  const nextHint = () => { if (hint === 'done') return; setHint(hint >= 3 ? 'done' : ((hint + 1) as HintStage)) }
  const skipHints = () => setHint('done')
  return (
    <C.Provider value={{ route: stack[stack.length - 1], go, replace, back, switchTab, catalogue, plans, plansState, reload, savePlan, draft, setDraft, picked, setPicked, notice, setNotice, welcomed, finishWelcome, hint, advanceHint, nextHint, skipHints }}>
      {children}
    </C.Provider>
  )
}
