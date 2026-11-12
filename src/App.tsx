import { Earth, House, Bookmark, Plane } from 'lucide-react'
import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { AppProvider, useApp, tabOf, type Tab } from './store'
import { Home, FindFlight, Airports } from './screens/Discover'
import { Trip } from './screens/Trip'
import { FindJourney, JourneyOverview } from './screens/Journey'
import { Welcome } from './screens/Welcome'
import { Results, FlightDetails, Compare } from './screens/Flights'
import { Airport } from './screens/Airport'
import { Builder } from './screens/Builder'
import { Plans, PlanDetail } from './screens/Plans'
import { MyFlights } from './screens/MyFlights'
import { Profile } from './screens/Profile'
import { AccountAccess } from './features/access/AccountAccess'
import { cx } from './components/ui'

function Screen() {
  const { route: r } = useApp()
  switch (r.name) {
    case 'welcome': return <Welcome />
    case 'access': return <AccountAccess />
    case 'discover': return <Home />
    case 'find': return <FindFlight />
    case 'trip': return <Trip key={(r.airport ?? '') + (r.templateId ?? '')} airport={r.airport} templateId={r.templateId} />
    case 'booking': return <FindJourney />
    case 'journey': return <JourneyOverview refCode={r.ref} />
    case 'airports': return <Airports />
    case 'results': return <Results key={r.origin + r.destination + r.date} {...r} />
    case 'flight': return <FlightDetails {...r} />
    case 'compare': return <Compare {...r} />
    case 'airport': return <Airport key={r.code} {...r} />
    case 'builder': return <Builder />
    case 'plans': return <Plans />
    case 'plan': return <PlanDetail id={r.id} />
    case 'flights': return <MyFlights />
    case 'profile': return <Profile />
  }
}

/** Airports tab icon: a globe with a small plane flying across its lower right. */
function AirportsIcon({ size = 22, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <span aria-hidden="true" className="relative inline-block" style={{ width: size, height: size }}>
      <Earth size={size} strokeWidth={strokeWidth} />
      <span className="absolute -bottom-1 -right-1.5 grid place-items-center rounded-full bg-[var(--color-canvas)] p-[1.5px]">
        <Plane size={Math.round(size * 0.5)} strokeWidth={strokeWidth} fill="currentColor" className="rotate-[-20deg]" />
      </span>
    </span>
  )
}

const TABS: { id: Tab; label: string; icon: typeof House | typeof AirportsIcon }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'airports', label: 'Airports', icon: AirportsIcon },
  { id: 'plans', label: 'My Plans', icon: Bookmark },
]

/** Confirmation toast: floats at the top in the same dark style as the tooltips, and leaves after 5 seconds. */
function Toast() {
  const { notice, setNotice } = useApp()
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(t)
  }, [notice, setNotice])
  if (!notice) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-[480px] justify-center px-4 pt-[calc(var(--safe-top)+0.5rem)]">
      <div role="status" aria-live="polite" onClick={() => setNotice(null)}
        className="anim-toast pointer-events-auto flex max-w-full items-center gap-2.5 rounded-[1.4rem] bg-[#141414] py-3 pl-3.5 pr-4 text-sub font-medium text-white shadow-[0_14px_34px_rgb(0_0_0/0.28)]">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/15"><Check size={14} strokeWidth={3} /></span>
        <span className="min-w-0">{notice}</span>
      </div>
    </div>
  )
}

function Shell() {
  const { route, switchTab, catalogue, reload } = useApp()
  const active = tabOf(route)
  if (catalogue.status !== 'ready') return (
    <div className="mx-auto grid min-h-dvh max-w-[480px] place-items-center px-6 text-center">
      {catalogue.status === 'loading' ? (
        <div role="status" className="anim-fade grid justify-items-center gap-4">
          <span aria-hidden="true" className="btn-coral grid size-16 place-items-center rounded-[1.25rem]"><Plane size={30} className="-rotate-45" /></span>
          <p className="text-body text-muted-text">Loading SkyStop…</p>
        </div>
      ) : (
        <div role="alert" className="panel anim-rise rounded-[1.75rem] p-6">
          <p className="text-h2 font-bold">We could not load the airports</p>
          <p className="mt-2 text-body text-muted-text">Check your connection and try again.</p>
          <p className="mt-1 text-cap text-muted-text">{catalogue.error}</p>
          <button onClick={reload} className="btn-coral press mt-5 min-h-[3.25rem] rounded-full px-8 text-body font-bold">Try again</button>
        </div>
      )}
    </div>
  )
  // Re-keying on the route plays a short entrance transition on every navigation (disabled under reduced motion).
  const key = Object.entries(route).map(([k, v]) => `${k}:${typeof v === 'object' || typeof v === 'function' ? '' : String(v)}`).join('|')
  if (route.name === 'welcome' || route.name === 'access') return <div className="mx-auto max-w-[480px]"><main key={key} className="anim-fade"><Screen /></main></div>
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] pb-[var(--nav-h)]">
      <main key={key} className="anim-screen"><Screen /></main>
      <Toast />
      <nav aria-label="Primary" className="glass fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-x-0 border-b-0 border-t border-white/80 pb-[var(--safe-bottom)] shadow-none">
        <div className="grid h-16 grid-cols-3">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = active === id
          return (
            <button key={id} onClick={() => switchTab(id)} aria-current={on ? 'page' : undefined}
              className={cx('press flex flex-col items-center justify-center gap-1 text-tab font-semibold transition-colors duration-300',
                on ? 'text-accent-dark' : 'text-muted-text hover:text-ink')}>
              <Icon size={22} strokeWidth={on ? 2.4 : 1.9} aria-hidden="true" />{label}
            </button>
          )
        })}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>
}
