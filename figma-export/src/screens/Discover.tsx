import { useState } from 'react'
import { ArrowUpRight, Bed, ChevronRight, Clock, Compass, Laptop, ListChecks, MapPin, Plane, Plus, Search, ShoppingBag, Sparkles, TramFront, Utensils, type LucideIcon } from 'lucide-react'
import { useApp } from '../store'
import { ACTIVITIES, AIRPORTS, CITIES, TEMPLATES, getActivities, getAirport, getTemplates } from '../data/mock'
import { IMAGES, sized } from '../data/images'
import { fmtDur, money, timeSpan, toLocalInput } from '../data/time'
import type { Category, Plan } from '../data/types'
import { Button, CATEGORIES, Chip, ChipRow, Field, Header, LargeTitle, Photo, inputCls } from '../components/ui'
import { TripTicket } from '../components/TripTicket'

const Heading = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="mb-3 mt-7 flex items-center justify-between"><h2 className="text-h2 font-bold">{children}</h2>{action}</div>
)

const nextTrip = (plans: Plan[]) =>
  [...plans].filter((p) => new Date(p.departure).getTime() >= Date.now()).sort((a, b) => +new Date(a.arrival) - +new Date(b.arrival))

const CAT_ICONS: Record<string, LucideIcon> = { All: Sparkles, Food: Utensils, Rest: Bed, Shopping: ShoppingBag, Work: Laptop, City: TramFront }

/** Icon + value + label, as used on airport and experience cards. */
const Meta = ({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) => (
  <span className="flex flex-1 items-center justify-center gap-1.5 border-l border-white/25 first:border-l-0">
    <Icon size={18} className="shrink-0 text-white/70" />
    <span className="leading-tight"><span className="block text-sub font-semibold">{value}</span><span className="block text-cap text-white/65">{label}</span></span></span>
)

/** Home: discovery-first, with the next saved trip on top when there is one. */
export function Home() {
  const { plans, go, switchTab } = useApp()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'All' | Category>('All')
  const upcoming = nextTrip(plans)
  const trip = upcoming[0]
  const featured = TEMPLATES.find((t) => trip && t.airport === trip.airport) ?? TEMPLATES[0]
  const featItems = featured.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!)
  const heroAct = [...featItems].sort((a, b) => b.durationMin - a.durationMin)[0]
  const featAp = getAirport(featured.airport)
  const term = q.trim().toLowerCase()
  const airports = AIRPORTS.filter((a) => !term || [a.code, a.name, a.city, a.country].some((t) => t.toLowerCase().includes(term)))
  const things = ACTIVITIES.filter((a) => (cat === 'All' || a.category === cat) && (!term || [a.name, a.category, getAirport(a.airport).city].some((t) => t.toLowerCase().includes(term))))
    .sort((a, b) => a.durationMin - b.durationMin).slice(0, term || cat !== 'All' ? 8 : 5)
  const filtering = !!term || cat !== 'All'

  return (
    <div className="pb-6">
      <div className="px-5 pt-[calc(var(--safe-top)+0.5rem)]">
        <label className="relative block">
          <span className="sr-only">Search airports and activities</span>
          <Search size={20} className="pointer-events-none absolute left-4 top-[0.95rem] text-muted-text" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search airports or activities"
            className="min-h-[3.25rem] w-full rounded-full border border-line bg-surface/70 pl-12 pr-4 text-body placeholder:text-muted-text" />
        </label>
      </div>

      <div className="mt-4 px-5">
        {trip ? (
          <>
            <TripTicket plan={trip} onView={() => go({ name: 'plan', id: trip.id })} onAdd={() => go({ name: 'trip' })} />
            {plans.length > 1 && (
              <button onClick={() => switchTab('plans')} className="mt-1 flex min-h-11 w-full items-center justify-between px-1 text-body font-medium text-accent-dark">
                {plans.length - 1} more {plans.length === 2 ? 'trip' : 'trips'} in My Plans<ChevronRight size={18} /></button>)}
          </>
        ) : (
          <div className="grid h-[17rem] grid-cols-[1.15fr_1fr] gap-3">
            <button onClick={() => go({ name: 'trip' })} className="relative row-span-2 overflow-hidden rounded-[1.5rem] bg-deep text-left text-white">
              <img src={sized(IMAGES.results, 400, 560)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="absolute inset-0 size-full object-cover" />
              <span className="photo-fade absolute inset-x-0 bottom-0 h-[78%]" />
              <span className="glass-dark absolute left-3 top-3 rounded-full px-3 py-1 text-sub font-medium">Your trip</span>
              <span className="absolute inset-x-4 bottom-4 block">
                <span className="block text-h2 font-bold leading-tight">Add flight</span>
                <span className="mb-3 block text-sub text-white/80">See your usable time</span>
                <span className="grid size-11 place-items-center rounded-full bg-accent text-white"><Plus size={22} strokeWidth={2.4} /></span>
              </span>
            </button>
            <button onClick={() => go({ name: 'find' })} className="flex flex-col justify-between rounded-[1.5rem] bg-surface p-4 text-left">
              <Compass size={24} className="text-accent" />
              <span><b className="block text-card font-semibold leading-tight">Plan ahead</b><span className="text-sub text-muted-text">Compare connections</span></span>
            </button>
            <button onClick={() => switchTab('airports')} className="flex flex-col justify-between rounded-[1.5rem] bg-accent-tint p-4 text-left">
              <MapPin size={24} className="text-accent" />
              <span><b className="block text-card font-semibold leading-tight">Airports</b><span className="text-sub text-muted-text">{AIRPORTS.length} guides</span></span>
            </button>
          </div>
        )}
      </div>

      <div className="px-5">
        <Heading action={<button onClick={() => switchTab('airports')} className="min-h-11 text-body font-medium text-accent-dark">See all</button>}>Things to do</Heading>
        <div className="mb-3"><ChipRow>
          {CATEGORIES.map((c) => { const I = CAT_ICONS[c]; return <Chip key={c} active={cat === c} onClick={() => setCat(c)}><I size={16} />{c}</Chip> })}
        </ChipRow></div>
        {things.length === 0 ? <p className="py-4 text-body text-muted-text">Nothing matches. Try another search or category.</p> : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
            {things.map((a) => (
              <li key={a.id}>
                <button onClick={() => go({ name: 'airport', code: a.airport, view: 'list' })} className="flex min-h-[4.75rem] w-full items-center gap-3 rounded-[1.25rem] border border-line bg-surface/60 p-2.5 text-left">
                  <Photo img={a.image} w={60} h={60} className="size-[3.75rem] shrink-0 rounded-2xl" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-body font-semibold">{a.name}</span>
                    <span className="block text-sub text-muted-text">{getAirport(a.airport).city} · {fmtDur(a.durationMin)} · {a.category}</span></span>
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </button>
              </li>))}
          </ul>
        )}
      </div>

      {airports.length > 0 && (
        <>
          <div className="px-5"><Heading>Recommended airports</Heading></div>
          <ul className="flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" aria-label="Recommended airports">
            {airports.map((a) => {
              const acts = getActivities(a.code)
              const mins = acts.map((x) => x.durationMin)
              return (
                <li key={a.code} className="shrink-0 snap-start">
                  <button onClick={() => go({ name: 'airport', code: a.code, view: 'map' })} className="relative block h-60 w-[20rem] overflow-hidden rounded-[1.5rem] bg-deep text-left text-white">
                    <Photo img={a.image} w={312} h={240} className="absolute inset-0 size-full" />
                    <span className="photo-fade absolute inset-x-0 bottom-0 h-[78%]" />
                    <span className="glass-dark absolute right-3 top-3 grid size-10 place-items-center rounded-full"><ArrowUpRight size={20} /></span>
                    <span className="absolute inset-x-4 bottom-4 block">
                      <span className="block text-sub font-semibold text-accent">{a.code}</span>
                      <span className="block text-card font-semibold leading-tight">{a.name}</span>
                      <span className="mt-3 flex whitespace-nowrap">
                        <Meta icon={ListChecks} value={String(acts.length)} label="Activities" />
                        <Meta icon={Clock} value={`${fmtDur(Math.min(...mins))}–${fmtDur(Math.max(...mins))}`} label="Time" />
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
        {!filtering && (
          <>
            <Heading>Featured experience</Heading>
            <button onClick={() => go({ name: 'airport', code: featured.airport, view: 'list' })} className="relative block h-[19rem] w-full overflow-hidden rounded-[1.5rem] bg-deep text-left text-white">
              <Photo img={heroAct.image} w={400} h={224} className="absolute inset-0 size-full" />
              <span className="photo-fade absolute inset-x-0 bottom-0 h-[78%]" />
              <span className="glass-dark absolute left-3 top-3 rounded-full px-3 py-1 text-sub font-medium">Curated itinerary</span>
              <span className="absolute inset-x-4 bottom-4 block">
                <span className="block text-h1 font-bold leading-tight">{featured.name}</span>
                <span className="mt-0.5 block text-body text-white/85">{featAp.city}</span>
                <span className="mt-3 flex gap-4 whitespace-nowrap">
                  <Meta icon={Clock} value={fmtDur(timeSpan(featItems))} label="Duration" />
                  <Meta icon={MapPin} value={String(featItems.length)} label="Stops" />
                </span>
                <span className="mt-3 flex gap-2">
                  <span className="grid min-h-12 place-items-center rounded-full bg-white/20 px-5 text-body font-semibold">{money(featItems.reduce((n, a) => n + a.costUsd, 0))}</span>
                  <span className="grid min-h-12 flex-1 place-items-center rounded-full bg-white text-body font-semibold text-ink">View itinerary</span>
                </span>
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
  return (
    <div className="pb-40">
      <Header title="Compare connections" subtitle="Before you book" />
      <form id="find" className="grid gap-4 px-5 pt-4" onSubmit={(e) => { e.preventDefault(); if (origin && dest && !same) go({ name: 'results', origin, destination: dest, date }) }}>
        <Field label="Flying from"><select className={inputCls} value={origin} onChange={(e) => setOrigin(e.target.value)}>{opts}</select></Field>
        <Field label="Flying to"><select className={inputCls} value={dest} onChange={(e) => setDest(e.target.value)}>{opts}</select></Field>
        <Field label="Departure date"><input type="date" required className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        {same && <p role="alert" className="text-sub font-medium text-error">Choose different cities.</p>}
        <Button type="submit" disabled={!origin || !dest || same}>Compare connections</Button>
      </form>
    </div>
  )
}

/** Airports tab: browse independently of a trip. */
export function Airports() {
  const { go } = useApp()
  return (
    <div className="pb-6">
      <LargeTitle sub="Explore what a connection can offer.">Airports</LargeTitle>
      <ul className="grid gap-4 px-5">
        {AIRPORTS.map((a) => (
          <li key={a.code}>
            <button onClick={() => go({ name: 'airport', code: a.code, view: 'map' })} className="relative block h-52 w-full overflow-hidden rounded-[1.25rem] bg-deep text-left text-white">
              <Photo img={a.image} w={400} h={210} className="absolute inset-0 size-full" />
              <span className="photo-fade absolute inset-x-0 bottom-0 h-[78%]" />
              <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2">
                <span className="min-w-0"><span className="block text-sub font-semibold text-accent">{a.code}</span>
                  <span className="block text-h2 font-bold leading-tight">{a.name}</span>
                  <span className="block text-sub text-white/80">{getActivities(a.code).length} activities · {getTemplates(a.code).length} curated itinerary</span></span>
                <span className="glass-dark grid size-11 shrink-0 place-items-center rounded-full"><ChevronRight size={22} /></span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
