import { MapPin, House, Bookmark } from 'lucide-react'
import { AppProvider, useApp, tabOf, type Tab } from './store'
import { Home, FindFlight, Airports } from './screens/Discover'
import { Trip } from './screens/Trip'
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
    <div className="mx-auto grid min-h-dvh max-w-[480px] place-items-center bg-canvas px-6 text-center">
      {catalogue.status === 'loading' ? (
        <p role="status" className="text-body text-muted-text">Loading SkyStop…</p>
      ) : (
        <div role="alert">
          <p className="text-h2 font-bold">We could not load the airports</p>
          <p className="mt-2 text-body text-muted-text">Check your connection and try again.</p>
          <p className="mt-1 text-cap text-muted-text">{catalogue.error}</p>
          <button onClick={reload} className="mt-5 min-h-[3.25rem] rounded-full bg-accent px-8 text-body font-bold text-white">Try again</button>
        </div>
      )}
    </div>
  )
  if (route.name === 'welcome') return <div className="mx-auto max-w-[480px]"><main><Screen /></main></div>
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-canvas pb-[var(--nav-h)] ">
      <main><Screen /></main>
      <nav aria-label="Primary" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="glass pointer-events-auto grid h-16 grid-cols-3 rounded-full p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => switchTab(id)} aria-current={active === id ? 'page' : undefined}
            className={cx('flex flex-col items-center justify-center gap-0.5 rounded-full text-tab font-medium', active === id ? 'bg-accent-tint text-accent-dark' : 'text-muted-text')}>
            <Icon size={24} strokeWidth={active === id ? 2.4 : 1.8} />{label}
          </button>
        ))}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>
}
