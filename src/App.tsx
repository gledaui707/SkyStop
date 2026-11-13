import { House, Bookmark, Plane } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { cx, LoadingState } from './components/ui'

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

/** Airports tab icon: a map pin with a plane inside. */
function AirportsIcon({ size = 22, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <span aria-hidden="true" className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      </svg>
      <Plane size={Math.round(size * 0.42)} strokeWidth={1.5} fill="currentColor" className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2" />
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
    <div className="vt-toast pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-[480px] justify-center px-4 pt-[calc(var(--safe-top)+0.5rem)]">
      <div role="status" aria-live="polite" onClick={() => setNotice(null)}
        className="glass-medium anim-toast pointer-events-auto flex max-w-full items-center gap-2.5 rounded-card py-3 pl-3.5 pr-4 text-sub font-medium text-ink">
        <span className="btn-coral grid size-6 shrink-0 place-items-center rounded-full"><Check size={14} strokeWidth={3} /></span>
        <span className="min-w-0">{notice}</span>
      </div>
    </div>
  )
}

type Tone = 'light' | 'dark'
const lum = (c: string) => { const m = c.match(/[\d.]+/g); if (!m || m.length < 3) return null; const [r, g, b, a = '1'] = m; return +a < 0.5 ? null : (0.2126 * +r + 0.7152 * +g + 0.0722 * +b) / 255 }
/** What is behind the top of the screen: a photo or a dark surface ('dark') or the light canvas ('light'). */
function toneAtTop(): Tone {
  const y = Math.max(8, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 16)
  for (const el of document.elementsFromPoint(window.innerWidth / 2, y)) {
    if (el.closest('[data-top-blur]')) continue
    if (el instanceof HTMLImageElement || el instanceof HTMLCanvasElement || el.classList.contains('leaflet-tile')) return 'dark'
    const l = lum(getComputedStyle(el).backgroundColor)
    if (l !== null) return l < 0.5 ? 'dark' : 'light'
  }
  return 'light'
}
const THEME: Record<Tone, string> = { light: '#f3e6de', dark: '#150e0c' }

/** Revolut-style progressive blur under the status bar and header, shown only once the page is scrolled: content
 *  scrolling up blurs and fades instead
 *  of meeting a hard band. Also reports whether the top is dark, so the status bar text can switch to white. */
function TopBlur() {
  const { route } = useApp()
  const [tone, setTone] = useState<Tone>('light')
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    let raf = 0
    const check = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { setTone(toneAtTop()); setScrolled(window.scrollY > 4) }) }
    check(); const t = setTimeout(check, 450) // after the screen's entrance and images
    window.addEventListener('scroll', check, { passive: true }); window.addEventListener('resize', check)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [route])
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta) }
    meta.content = THEME[tone]
    try { window.parent?.postMessage({ type: 'skystop-statusbar', tone }, '*') } catch { /* not framed */ }
  }, [tone])
  const layers = [[16, 0, 30], [8, 20, 50], [4, 40, 70], [2, 60, 88], [1, 75, 100]] as const
  return (
    <div data-top-blur aria-hidden="true" className={cx('pointer-events-none fixed inset-x-0 top-0 z-10 mx-auto h-[calc(var(--safe-top)+4.75rem)] max-w-[480px] transition-opacity duration-300', scrolled ? 'opacity-100' : 'opacity-0')}>
      {layers.map(([px, solid, end]) => (
        <div key={px} className="absolute inset-0" style={{ backdropFilter: `blur(${px}px)`, WebkitBackdropFilter: `blur(${px}px)`,
          maskImage: `linear-gradient(to bottom, black ${solid}%, transparent ${end}%)`, WebkitMaskImage: `linear-gradient(to bottom, black ${solid}%, transparent ${end}%)` }} />))}
      <div className="absolute inset-0 transition-colors duration-300" style={{ background: tone === 'dark'
        ? 'linear-gradient(to bottom, rgb(21 14 12 / 0.78), rgb(21 14 12 / 0.4) 55%, transparent)'
        : 'linear-gradient(to bottom, rgb(243 230 222 / 0.85), rgb(243 230 222 / 0.5) 55%, transparent)' }} />
    </div>
  )
}

function Shell() {
  const { route, switchTab, catalogue, reload } = useApp()
  const active = tabOf(route)
  if (catalogue.status !== 'ready') return (
    <div className="mx-auto grid min-h-dvh max-w-[480px] place-items-center px-6 text-center">
      {catalogue.status === 'loading' ? (
        <LoadingState label="Loading SkyStop…" />
      ) : (
        <div role="alert" className="panel anim-rise rounded-surface p-6">
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
      <main key={key} className="vt-screen anim-screen"><TopBlur /><Screen /></main>
      <Toast />
      {/* Floating capsule tab bar: lifted off the edge, the active tab is a coral-lit pill that glides between tabs. */}
      <nav aria-label="Primary" className="vt-tabbar pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-4 pb-[var(--nav-lift)]">
        <div className="glass-medium pointer-events-auto relative mx-auto grid h-16 max-w-[24rem] grid-cols-3 rounded-full p-1.5">
          <span aria-hidden="true" className="btn-coral absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-full transition-transform duration-500 ease-ios motion-reduce:transition-none"
            style={{ transform: `translateX(${Math.max(0, TABS.findIndex((t) => t.id === active)) * 100}%)`, opacity: active ? 1 : 0 }} />
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = active === id
          return (
            <button key={id} onClick={() => switchTab(id)} aria-current={on ? 'page' : undefined}
              className={cx('press relative flex flex-col items-center justify-center gap-0.5 rounded-full text-tab font-semibold transition-colors duration-300',
                on ? 'text-white' : 'text-muted-text hover:text-ink')}>
              <Icon size={21} strokeWidth={on ? 2.4 : 1.9} aria-hidden="true" />{label}
            </button>
          )
        })}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  return <AppProvider><div aria-hidden="true" className="ambient" /><Shell /></AppProvider>
}
