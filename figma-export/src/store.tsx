import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Draft, Plan } from './data/types'
import { guestStore, planStore } from './data/mock'

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
  plans: Plan[]
  savePlan: (p: Plan) => void
  deletePlan: (id: string) => void
  draft: Draft | null
  setDraft: (d: Draft | null) => void
  welcomed: boolean
  finishWelcome: (to: Route) => void
  hint: HintStage
  advanceHint: (to: 2 | 3) => void
  nextHint: () => void
  skipHints: () => void
}
const C = createContext<Ctx>(null!)
export const useApp = () => useContext(C)

function init() {
  // ?state=returning | new simulates guest states via the frontend adapter.
  const q = new URLSearchParams(window.location.search).get('state')
  if (q === 'new') { planStore.clear(); guestStore.reset(); try { sessionStorage.removeItem(HINT_KEY) } catch { /* ignore */ } }
  const plans = q === 'returning' ? planStore.seedReturning() : planStore.load()
  let hint: HintStage = 1
  try { const v = sessionStorage.getItem(HINT_KEY); if (v) hint = v === 'done' ? 'done' : (Number(v) as HintStage) } catch { /* ignore */ }
  if (plans.length > 0 && q !== 'new') hint = 'done'
  if (q === 'returning') guestStore.markWelcomed()
  const welcomed = guestStore.hasWelcomed() || plans.length > 0
  return { plans, hint, welcomed }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(init)
  const [welcomed, setWelcomed] = useState(boot.welcomed)
  const [stack, setStack] = useState<Route[]>([{ name: boot.welcomed ? 'discover' : 'welcome' }])
  const [plans, setPlans] = useState<Plan[]>(boot.plans)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [hint, setHintState] = useState<HintStage>(boot.hint)
  const setHint = (h: HintStage) => { setHintState(h); try { sessionStorage.setItem(HINT_KEY, String(h)) } catch { /* ignore */ } }
  const go = useCallback((r: Route) => { setStack((s) => [...s, r]); window.scrollTo(0, 0) }, [])
  const replace = useCallback((r: Route) => { setStack((s) => [...s.slice(0, -1), r]); window.scrollTo(0, 0) }, [])
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), [])
  const switchTab = useCallback((t: Tab) => {
    setStack([{ name: t === 'home' ? 'discover' : t }])
    window.scrollTo(0, 0)
  }, [])
  const savePlan = (p: Plan) =>
    setPlans((cur) => {
      const next = cur.some((x) => x.id === p.id) ? cur.map((x) => (x.id === p.id ? p : x)) : [p, ...cur]
      planStore.save(next)
      return next
    })
  const deletePlan = (id: string) =>
    setPlans((cur) => { const next = cur.filter((x) => x.id !== id); planStore.save(next); return next })
  /** Leaves the welcome screen for good; Skip replaces it with Home, other actions push on top. */
  const finishWelcome = (to: Route) => {
    guestStore.markWelcomed(); setWelcomed(true)
    setStack((s) => (to.name === 'discover' ? [to] : [...s, to])); window.scrollTo(0, 0)
  }
  const advanceHint = (to: 2 | 3) => { if (hint !== 'done' && hint < to) setHint(to) }
  const nextHint = () => { if (hint === 'done') return; setHint(hint >= 3 ? 'done' : ((hint + 1) as HintStage)) }
  const skipHints = () => setHint('done')
  return (
    <C.Provider value={{ route: stack[stack.length - 1], go, replace, back, switchTab, plans, savePlan, deletePlan, draft, setDraft, welcomed, finishWelcome, hint, advanceHint, nextHint, skipHints }}>
      {children}
    </C.Provider>
  )
}
