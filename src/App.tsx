import { MapPin, House, Bookmark, Plane } from 'lucide-react'
import { AppProvider, useApp, tabOf, type Tab } from './store'
import { Home, FindFlight, Airports } from './screens/Discover'
import { Trip } from './screens/Trip'
import { FindJourney, JourneyOverview } from './screens/Journey'
import { Welcome } from './screens/Welcome'
import { Results, FlightDetails, Compare } from './screens/Flights'
import { Airport } from './screens/Airport'
import { Builder } from './screens/Builder'
import { Plans, PlanDetail } from './screens/Plans'
import { cx } from './components/ui'

function Screen() {
  const { route: r } = useApp()
  switch (r.name) {
    case 'welcome': return <Welcome />
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
  }
}

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'airports', label: 'Airports', icon: MapPin },
  { id: 'plans', label: 'My Plans', icon: Bookmark },
]

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
  if (route.name === 'welcome') return <div className="mx-auto max-w-[480px]"><main key={key} className="anim-fade"><Screen /></main></div>
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] pb-[var(--nav-h)]">
      <main key={key} className="anim-screen"><Screen /></main>
      <nav aria-label="Primary" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-5 pb-[calc(var(--safe-bottom)+0.75rem)]">
        <div className="glass pointer-events-auto mx-auto grid h-[4.25rem] max-w-[22rem] grid-cols-3 gap-1 rounded-full p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = active === id
          return (
            <button key={id} onClick={() => switchTab(id)} aria-current={on ? 'page' : undefined}
              className={cx('press flex flex-col items-center justify-center gap-0.5 rounded-full text-tab font-semibold transition-colors duration-300',
                on ? 'btn-coral' : 'text-muted-text hover:text-ink')}>
              <Icon size={22} strokeWidth={on ? 2.4 : 1.9} />{label}
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
