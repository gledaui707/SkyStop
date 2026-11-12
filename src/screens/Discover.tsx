import { useState } from 'react'
import { ArrowUpDown, ArrowUpRight, Bed, Check, ChevronRight, Info, X, Clock, Compass, Laptop, ListChecks, MapPin, Plus, Search, ShoppingBag, Sparkles, Landmark, Utensils, type LucideIcon } from 'lucide-react'
import { useApp } from '../store'
import { ACTIVITIES, AIRPORTS, CITIES, TEMPLATES, getActivities, getAirport, getTemplates } from '../data/mock'
import { IMAGES, sized } from '../data/images'
import { fmtDur, timeSpan, toLocalInput } from '../data/time'
import type { Category, Plan } from '../data/types'
import { Button, CATEGORIES, Chip, ChipRow, Field, Header, LargeTitle, Photo } from '../components/ui'
import { TripTicket } from '../components/TripTicket'

const Heading = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="mb-3 mt-8 flex items-center justify-between"><h2 className="text-h2 font-bold">{children}</h2>{action}</div>
)

const nextTrip = (plans: Plan[]) =>
  [...plans].filter((p) => new Date(p.departure).getTime() >= Date.now()).sort((a, b) => +new Date(a.arrival) - +new Date(b.arrival))

const CAT_ICONS: Record<string, LucideIcon> = { All: Sparkles, Food: Utensils, Rest: Bed, Shopping: ShoppingBag, Work: Laptop, Sights: Landmark }

const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

/** Icon + value + label, as used on airport and experience cards. */
const Meta = ({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) => (
  <span className="flex flex-1 items-center justify-center gap-1.5 border-l border-white/25 first:border-l-0">
    <Icon size={18} className="shrink-0 text-white/70" />
    <span className="leading-tight"><span className="block text-sub font-semibold">{value}</span><span className="block text-cap text-white/65">{label}</span></span></span>
)

/** Coral action disc set into a "notch" cut from the card corner (the ring matches the canvas). */
const Notch = ({ icon: Icon = ArrowUpRight }: { icon?: LucideIcon }) => (
  <span aria-hidden="true" className="absolute -bottom-1 -right-1 grid size-[4.25rem] place-items-center rounded-full bg-canvas">
    <span className="btn-coral grid size-14 place-items-center rounded-full"><Icon size={24} strokeWidth={2.2} /></span>
  </span>
)

/** Home: discovery-first, with the next saved trip on top when there is one. */
export function Home() {
  const { plans, go, switchTab, notice, setNotice, replayOnboarding } = useApp()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'All' | Category>('All')
  const upcoming = nextTrip(plans)
  const trip = upcoming[0]
  const featured = TEMPLATES.find((t) => trip && t.airport === trip.airport) ?? TEMPLATES[0]
  const featItems = (featured?.activityIds ?? []).map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
  const heroAct = [...featItems].sort((a, b) => b.durationMin - a.durationMin)[0]
  const featAp = getAirport(featured?.airport ?? '')
  const term = q.trim().toLowerCase()
  const airports = AIRPORTS.filter((a) => !term || [a.code, a.name, a.city, a.country].some((t) => t.toLowerCase().includes(term)))
  const things = ACTIVITIES.filter((a) => (cat === 'All' || a.category === cat) && (!term || [a.name, a.category, getAirport(a.airport).city].some((t) => t.toLowerCase().includes(term))))
    .sort((a, b) => a.durationMin - b.durationMin).slice(0, term || cat !== 'All' ? 8 : 6)
  const filtering = !!term || cat !== 'All'

  return (
    <div className="pb-8">
      <div className="px-5 pt-[calc(var(--safe-top)+0.5rem)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sub font-medium text-muted-text">{greeting()}</p>
            <h1 className="mt-0.5 text-title font-bold">Where’s your<br />next stop?</h1>
          </div>
          <button onClick={replayOnboarding} aria-label="How SkyStop works" className="glass press mt-1 grid size-12 shrink-0 place-items-center rounded-full"><Info size={20} /></button>
        </div>
        <label className="relative mt-5 block">
          <span className="sr-only">Search airports and activities</span>
          <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-text" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search airports or activities"
            className="glass min-h-[3.25rem] w-full rounded-full pl-12 pr-4 text-body !shadow-none placeholder:text-muted-text focus:outline-none focus:ring-2 focus:ring-accent-dark/60" />
        </label>
      </div>

      {notice && (
        <div role="status" className="anim-rise mx-5 mt-4 flex items-start gap-3 rounded-card border border-success/30 bg-success/10 p-3.5 text-body backdrop-blur-md">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success/20"><Check size={16} className="text-success" /></span>
          <p className="min-w-0 flex-1">{notice}</p>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="-m-2 grid size-11 shrink-0 place-items-center text-muted-text"><X size={18} /></button>
        </div>
      )}
      <div className="mt-5 px-5">
        {trip ? (
          <>
            <TripTicket plan={trip} onView={() => go({ name: 'plan', id: trip.id })} onAdd={() => go({ name: 'booking' })} />
            {plans.length > 1 && (
              <button onClick={() => switchTab('plans')} className="mt-1 flex min-h-11 w-full items-center justify-between px-1 text-body font-medium text-accent-dark">
                {plans.length - 1} more {plans.length === 2 ? 'trip' : 'trips'} in My Plans<ChevronRight size={18} /></button>)}
          </>
        ) : (
          <>
            <button onClick={() => go({ name: 'booking' })} className="ph press relative block h-[21rem] w-full overflow-hidden rounded-[2rem] text-left text-white shadow-[0_20px_44px_rgb(0_0_0/0.4)]">
              <img src={sized(IMAGES.results, 760, 680)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="anim-fade absolute inset-0 size-full object-cover" />
              <span className="photo-fade absolute inset-x-0 bottom-0 h-[70%]" />
              <span className="glass-dark absolute left-4 top-4 rounded-full px-3 py-1 text-sub font-medium">Your trip</span>
              <span className="absolute bottom-5 left-5 right-24 block">
                <span className="block text-h1 font-bold leading-tight">Plan a layover</span>
                <span className="mt-1 block text-body text-white/80">See your usable time between flights</span>
              </span>
              <Notch icon={Plus} />
            </button>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={() => go({ name: 'find' })} className="panel press flex min-h-[7.5rem] flex-col justify-between rounded-[1.5rem] p-4 text-left">
                <span className="grid size-10 place-items-center rounded-full bg-accent-tint text-accent-dark"><Compass size={20} /></span>
                <span><b className="block text-card font-semibold leading-tight">Plan ahead</b><span className="text-sub text-muted-text">Compare connections</span></span>
              </button>
              <button onClick={() => switchTab('airports')} className="panel press flex min-h-[7.5rem] flex-col justify-between rounded-[1.5rem] p-4 text-left">
                <span className="grid size-10 place-items-center rounded-full bg-accent-tint text-accent-dark"><MapPin size={20} /></span>
                <span><b className="block text-card font-semibold leading-tight">Airports</b><span className="text-sub text-muted-text">{AIRPORTS.length} guides</span></span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="px-5">
        <Heading action={<button onClick={() => switchTab('airports')} className="min-h-11 text-body font-medium text-accent-dark">See all</button>}>Things to do</Heading>
        <div className="mb-3"><ChipRow>
          {CATEGORIES.map((c) => { const I = CAT_ICONS[c]; return <Chip key={c} active={cat === c} onClick={() => setCat(c)}><I size={16} />{c}</Chip> })}
        </ChipRow></div>
      </div>
      {things.length === 0 ? <p className="px-5 py-4 text-body text-muted-text">Nothing matches. Try another search or category.</p> : (
        <ul className="no-scrollbar flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2" aria-label="Things to do">
          {things.map((a) => (
            <li key={a.id} className="shrink-0 snap-start">
              <button onClick={() => go({ name: 'airport', code: a.airport, view: 'list' })} className="ph press relative block h-[13.5rem] w-[10.5rem] overflow-hidden rounded-[1.5rem] text-left text-white">
                <Photo img={a.image} w={168} h={216} className="absolute inset-0 size-full" />
                <span className="photo-fade absolute inset-x-0 bottom-0 h-[70%]" />
                <span className="glass-dark absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-cap font-semibold">{fmtDur(a.durationMin)}</span>
                <span className="absolute inset-x-3 bottom-3 block">
                  <span className="line-clamp-2 block text-body font-semibold leading-tight">{a.name}</span>
                  <span className="mt-0.5 block text-cap text-white/75">{getAirport(a.airport).city} · {a.category}</span>
                </span>
              </button>
            </li>))}
        </ul>
      )}

      {airports.length > 0 && (
        <>
          <div className="px-5"><Heading>Recommended airports</Heading></div>
          <ul className="no-scrollbar flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2" aria-label="Recommended airports">
            {airports.map((a) => {
              const acts = getActivities(a.code)
              const mins = acts.map((x) => x.durationMin)
              return (
                <li key={a.code} className="shrink-0 snap-start">
                  <button onClick={() => go({ name: 'airport', code: a.code, view: 'list' })} className="ph press relative block h-[17rem] w-[min(20rem,calc(100vw-3.5rem))] overflow-hidden rounded-[1.75rem] text-left text-white">
                    <Photo img={a.image} w={320} h={272} className="absolute inset-0 size-full" />
                    <span className="photo-fade absolute inset-x-0 bottom-0 h-[72%]" />
                    <span className="glass-dark absolute left-3 top-3 rounded-full px-3 py-1 text-sub font-bold tracking-wide">{a.code}</span>
                    <span className="glass-dark absolute right-3 top-3 grid size-10 place-items-center rounded-full"><ArrowUpRight size={20} /></span>
                    <span className="absolute inset-x-4 bottom-4 block">
                      <span className="block text-h2 font-bold leading-tight">{a.name}</span>
                      <span className="glass-dark mt-3 flex whitespace-nowrap rounded-2xl py-2">
                        <Meta icon={ListChecks} value={String(acts.length)} label="Activities" />
                        <Meta icon={Clock} value={mins.length ? `${fmtDur(Math.min(...mins))}–${fmtDur(Math.max(...mins))}` : '–'} label="Time" />
                        <Meta icon={Sparkles} value={String(getTemplates(a.code).length)} label="Curated" />
                      </span>
                    </span>
                  </button>
                </li>)
            })}
          </ul>
        </>
      )}

      <div className="px-5">
        {!filtering && featured && heroAct && (
          <>
            <Heading>Featured experience</Heading>
            <button onClick={() => go({ name: 'airport', code: featured.airport, view: 'list' })} className="ph press relative block h-[22rem] w-full overflow-hidden rounded-[2rem] text-left text-white">
              <Photo img={heroAct.image} w={420} h={352} className="absolute inset-0 size-full" />
              <span className="photo-fade absolute inset-x-0 bottom-0 h-[78%]" />
              <span className="glass-dark absolute left-4 top-4 rounded-full px-3 py-1 text-sub font-medium">Curated itinerary</span>
              <span className="absolute inset-x-5 bottom-5 block">
                <span className="block text-h1 font-bold leading-tight">{featured.name}</span>
                <span className="mt-0.5 block text-body text-white/85">{featAp.city}</span>
                <span className="mt-3 flex max-w-[16rem] gap-4 whitespace-nowrap">
                  <Meta icon={Clock} value={fmtDur(timeSpan(featItems))} label="Duration" />
                  <Meta icon={MapPin} value={String(featItems.length)} label="Stops" />
                </span>
                <span className="mt-4 grid min-h-12 place-items-center rounded-full bg-white text-body font-semibold text-[#2a1b18]">View itinerary</span>
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Secondary feature: compare connecting flights before booking. */
export function FindFlight() {
  const { go } = useApp()
  const next = new Date(); next.setDate(next.getDate() + 7)
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [date, setDate] = useState(toLocalInput(next).slice(0, 10))
  const same = !!origin && origin === dest
  const opts = [<option key="" value="">Select a city</option>, ...CITIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)]
  const swap = () => { setOrigin(dest); setDest(origin) }
  const sel = 'min-h-12 w-full min-w-0 appearance-none bg-transparent text-card font-semibold text-ink focus:outline-none'
  return (
    <div className="pb-[calc(var(--nav-h)+2rem)]">
      <Header title="Compare connections" subtitle="Before you book" />
      <div className="px-5 pt-2">
        <h2 className="text-h1 font-bold">Find a layover<br />worth having</h2>
        <p className="mt-2 text-sub text-muted-text">Compare one-stop routes by how much usable time each connection leaves you.</p>
      </div>
      <form id="find" className="mt-5 px-5" onSubmit={(e) => { e.preventDefault(); if (origin && dest && !same) go({ name: 'results', origin, destination: dest, date }) }}>
        <div className="panel-accent relative rounded-[1.75rem] p-2">
          <div className="rounded-[1.375rem] bg-white px-4 py-2.5 ring-1 ring-line">
            <Field label="Flying from"><select className={sel} value={origin} onChange={(e) => setOrigin(e.target.value)}>{opts}</select></Field>
          </div>
          <div className="relative h-2">
            <button type="button" onClick={swap} aria-label="Swap cities" className="glass press absolute right-5 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full">
              <ArrowUpDown size={18} /></button>
          </div>
          <div className="rounded-[1.375rem] bg-white px-4 py-2.5 ring-1 ring-line">
            <Field label="Flying to"><select className={sel} value={dest} onChange={(e) => setDest(e.target.value)}>{opts}</select></Field>
          </div>
          <div className="mt-2 rounded-[1.375rem] bg-white px-4 py-2.5 ring-1 ring-line">
            <Field label="Departure date"><input type="date" required className={sel} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
        </div>
        {same && <p role="alert" className="mt-3 text-sub font-medium text-error">Choose different cities.</p>}
        <Button type="submit" className="mt-5 w-full" disabled={!origin || !dest || same}>Compare connections</Button>
      </form>
    </div>
  )
}

/** Airports tab: browse independently of a trip. */
export function Airports() {
  const { go } = useApp()
  const airports = [...AIRPORTS]
  const singapore = airports.findIndex((airport) => airport.code === 'SIN')
  if (singapore !== -1 && airports.some((airport) => airport.code === 'DXB')) {
    const [changi] = airports.splice(singapore, 1)
    const dubai = airports.findIndex((airport) => airport.code === 'DXB')
    airports.splice(dubai + 1, 0, changi)
  }
  return (
    <div className="pb-8">
      <LargeTitle sub="Explore what a connection can offer.">Airports</LargeTitle>
      <ul className="grid gap-4 px-5">
        {airports.map((a, i) => (
          <li key={a.code} className="anim-rise" style={{ animationDelay: `${i * 70}ms` }}>
            <button onClick={() => go({ name: 'airport', code: a.code, view: 'list' })} className="ph press relative block h-[19rem] w-full overflow-hidden rounded-[2rem] text-left text-white shadow-[0_18px_40px_rgb(0_0_0/0.35)]">
              <Photo img={a.image} w={420} h={304} className="absolute inset-0 size-full" />
              <span className="photo-fade absolute inset-x-0 bottom-0 h-[70%]" />
              <span className="glass-dark absolute left-4 top-4 rounded-full px-3 py-1 text-sub font-bold tracking-wide">{a.code}</span>
              <span className="glass-dark absolute right-4 top-4 rounded-full px-3 py-1 text-cap font-medium">{a.country}</span>
              <span className="absolute bottom-5 left-5 right-5 block">
                <span className="block text-h1 font-bold leading-tight">{a.name}</span>
                <span className="mt-1 block text-sub text-white/80">{getActivities(a.code).length} activities · {getTemplates(a.code).length} curated itinerary</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
