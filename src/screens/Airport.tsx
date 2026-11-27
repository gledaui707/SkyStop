import { useState } from 'react'
import { AlertTriangle, ArrowUpRight, ChevronLeft, Clock, ListChecks, Plus, Check, Search, Sparkles, X } from 'lucide-react'
import { useApp } from '../store'
import { ACTIVITIES, getActivities, getAirport, getTemplates } from '../data/mock'
import { sized } from '../data/images'
import { fmtDur, timeSpan } from '../data/time'
import { computeItinerary } from '../data/itinerary'
import { ActionBar, ActivitySheet, Button, CATEGORIES, Chip, ChipRow, cx, IconButton } from '../components/ui'
import { VenuePhoto } from '../components/Timeline'
import { ExploreMap, exploreDefaults, type ExploreUi } from '../features/wayfinding/ExploreMap'
import { useEntryState } from '../features/wayfinding/entryState'
import type { Category } from '../data/types'
import { byInterest, interestsStore } from '../data/interests'

type View = 'map' | 'list'
/** The time budget shown while exploring: the itinerary's own numbers (activities and counted transfers). */
type Budget = { usable: number; remaining: number; over: boolean }
/** One visit's view, filters and search, shared by the list and the map and restored when coming back. */
type AirportUi = ExploreUi & { view: View; cat: 'All' | Category; q: string; searching: boolean }
const INTEREST_LABEL: Record<Category, string> = { Food: 'Dining', Shopping: 'Shopping', Rest: 'Relaxation', Sights: 'Attractions', Work: 'Work' }
const LABEL_LIST = (c: Category[]) => { const l = c.map((x) => INTEREST_LABEL[x]); return l.length > 1 ? `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}` : l[0] }

/** Discover a layover airport. List first (curated itineraries, then activities); the map shows the real airport
 *  with a pin per terminal behind a toggle. Planning state lives in the store, so switching views keeps everything. */
export function Airport({ code, view: initialView, venue }: { code: string; view?: View; venue?: string }) {
  const { go, back, draft, setDraft, picked, setPicked, route } = useApp()
  const [ui, setUi] = useEntryState<AirportUi>(route, () => ({ ...exploreDefaults(), view: initialView ?? 'list', cat: 'All', q: '', searching: false, focusId: venue ?? null }))
  const { view, cat, q } = ui
  const setView = (v: View) => setUi({ view: v })
  const setCat = (c: 'All' | Category) => setUi({ cat: c })
  const startTrip = (templateId?: string) => go({ name: 'trip', airport: code, templateId })

  // Interests from the onboarding put matching activities first (they never select anything).
  const acts = byInterest(getActivities(code))
  const ready = !!draft && draft.airport === code
  // Before layover times exist, activities can still be selected; they are carried into the setup form.
  const planned = ready ? draft!.activityIds : picked?.airport === code ? picked.ids : []
  // Same calculation as the itinerary builder and the route map (current flight times, activities, counted transfers).
  const hero = ready ? computeItinerary(draft!).hero : null
  const b: Budget | null = hero ? { usable: hero.usable, remaining: hero.remaining, over: hero.remaining < 0 } : null
  const matches = (a: { category: Category; name: string }) => (cat === 'All' || a.category === cat) && a.name.toLowerCase().includes(q.trim().toLowerCase())

  const toggle = (id: string) => {
    if (!ready || !draft) { setPicked({ airport: code, ids: planned.includes(id) ? planned.filter((x) => x !== id) : [...planned, id] }); return }
    setDraft({ ...draft, activityIds: draft.activityIds.includes(id) ? draft.activityIds.filter((x) => x !== id) : [...draft.activityIds, id] })
  }
  const applyItinerary = (templateId: string) => {
    const t = getTemplates(code).find((x) => x.id === templateId)!
    if (ready && draft) { setDraft({ ...draft, name: t.name, activityIds: [...t.activityIds] }); go({ name: 'builder' }) }
    else startTrip(templateId)
  }

  const bar = (
    <div className="absolute inset-x-0 top-0 z-20 px-3 pt-[calc(var(--safe-top)+0.5rem)]">
      <div className="flex items-center gap-2">
        <IconButton label="Back" icon={ChevronLeft} tone="dark" iconSize={26} onClick={back} />
        <div role="tablist" aria-label="Airport view" className="glass-dark grid flex-1 grid-cols-2 rounded-full p-1">
          {(['list', 'map'] as View[]).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={cx('min-h-10 rounded-full text-sub font-semibold capitalize transition-colors', view === v ? 'bg-white text-[#2a1b18]' : 'text-white')}>{v}</button>))}
        </div>
        {view === 'map' && <IconButton label={ui.searching || q ? 'Close search' : 'Search activities'} icon={ui.searching || q ? X : Search} tone="dark"
          onClick={() => setUi(ui.searching || q ? { searching: false, q: '' } : { searching: true })} />}
      </div>
      {view === 'map' && (
        <>
          {(ui.searching || q) && (
            <label className="mt-2 block">
              <span className="sr-only">Search activities</span>
              <input autoFocus value={q} onChange={(e) => setUi({ q: e.target.value })} placeholder="Search activities" type="search"
                className="map-glass min-h-11 w-full rounded-full px-4 text-body text-[#231a17] placeholder:text-[#8a7d77] focus:outline-none" />
            </label>)}
          <div role="group" aria-label="Filter by category" className="no-scrollbar scroll-fade -mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-1">
            {CATEGORIES.map((c) => (
              <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}
                className={cx('inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sub font-medium', cat === c ? 'bg-white text-[#2a1b18]' : 'glass-dark')}>{c}</button>))}
          </div>
        </>
      )}
    </div>
  )

  if (view === 'map') return <ExploreMap {...{ code, bar, planned, ready, b, toggle, startTrip }} acts={acts.filter(matches)} all={acts} ui={ui} setUi={setUi} />

  return <List {...{ code, bar, ready, planned, b, toggle, applyItinerary, startTrip, cat, setCat }} q={q} setQ={(v) => setUi({ q: v })} />
}

function List({ code, bar, ready, planned, b, toggle, applyItinerary, startTrip, cat, setCat, q, setQ }: {
  code: string; bar: React.ReactNode; ready: boolean; planned: string[]; b: Budget | null
  toggle: (id: string) => void; applyItinerary: (id: string) => void
  startTrip: () => void; cat: 'All' | Category; setCat: (c: 'All' | Category) => void; q: string; setQ: (q: string) => void
}) {
  const { go } = useApp()
  const ap = getAirport(code)
  const [open, setOpen] = useState<string | null>(null)
  const acts = byInterest(getActivities(code))
  const interests = interestsStore.get()
  const shown = acts.filter((a) => (cat === 'All' || a.category === cat) && a.name.toLowerCase().includes(q.toLowerCase()))
  const usable = b?.usable
  const templates = getTemplates(code)
  const curatedBlock = (<>
        <SectionTitle sub={templates.length > 1 ? 'Swipe to compare' : undefined}>Curated itineraries</SectionTitle>
        <ul data-allow-bleed className={cx('no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2', templates.length === 1 && '[&>li]:w-full')}>
          {templates.map((t) => {
            const items = t.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!)
            const dur = timeSpan(items)
            const fit = usable === undefined ? null : dur <= usable
            return (
              <li key={t.id} className="route-card relative w-[86%] shrink-0 snap-center overflow-hidden rounded-surface">
                {/* The first stop fills the card; the rest show as a stack of round photos (who you'll "meet" on the way) */}
                <div className="relative h-[15rem]">
                  <VenuePhoto a={items[0]} w={360} h={240} iconSize={44} iconTop="38%" className="absolute inset-0" />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#1a100e] via-[#1a100e]/45 to-black/10" />
                  <p className={cx('absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full px-3 py-1.5 text-cap font-semibold',
                    fit === null ? 'glass-dark text-white' : fit ? 'fit-ok' : 'fit-over')}>
                    {fit === null ? <Clock size={14} aria-hidden="true" /> : fit ? <Check size={14} strokeWidth={2.6} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
                    <span>{fit === null ? 'Set your layover times to check whether it fits.' : fit ? `Fits with ${fmtDur(usable! - dur)} to spare.` : `Needs ${fmtDur(dur - usable!)} more than your usable time. You can trim it.`}</span></p>
                  <div className="absolute inset-x-4 bottom-3 text-white">
                    <div className="mb-2 flex items-center" aria-hidden="true">
                      {items.slice(0, 4).map((a, i) => (
                        <span key={a.id} style={{ zIndex: 5 - i }} className={cx('relative size-9 overflow-hidden rounded-full ring-2 ring-[#2a1a17]', i > 0 && '-ml-2.5')}>
                          <VenuePhoto a={a} w={36} h={36} iconSize={16} className="absolute inset-0" /></span>))}
                      {items.length > 4 && <span className="-ml-2.5 grid size-9 place-items-center rounded-full bg-[#2a1a17] text-cap font-semibold ring-2 ring-[#2a1a17]">+{items.length - 4}</span>}
                    </div>
                    <h3 className="text-h2 font-bold leading-tight [text-shadow:0_2px_12px_rgb(0_0_0/0.45)]">{t.name}</h3>
                    <p className="mt-0.5 text-sub text-white/80">{ap.code} · {fmtDur(dur)} · {items.length} stops</p>
                  </div>
                </div>
                <div className="relative px-4 pb-4 pt-3">
                  <p className="text-sub text-muted-text">{t.blurb}</p>
                  <ol className="route-trail mt-3 text-sub" aria-label={`${t.name} stops`}>
                    {items.map((a, i) => (
                      <li key={a.id} className="flex items-baseline gap-2.5 py-1">
                        <span aria-hidden="true" className="route-node">{i + 1}</span>
                        <span className="min-w-0 flex-1 font-medium">{a.name}</span>
                        <span className="shrink-0 text-muted-text tabular-nums">{fmtDur(a.durationMin)}</span></li>))}
                  </ol>
                  <button onClick={() => applyItinerary(t.id)} className="press btn-secondary mt-3 flex min-h-12 w-full items-center justify-between rounded-full pl-5 pr-1.5 text-body font-semibold">
                    Use this itinerary<span aria-hidden="true" className="btn-coral grid size-9 place-items-center rounded-full"><ArrowUpRight size={19} /></span></button>
                </div>
              </li>
            )
          })}
        </ul>
  </>)
  const activitiesBlock = (<>
        <SectionTitle sub={interests.length > 0 ? `${LABEL_LIST(interests)} first, from your interests` : undefined} spark={interests.length > 0}>Activities</SectionTitle>
        {/* One frosted dock holds search and the category filter */}
        <div className="glass-premium rounded-card p-2">
          <label className="relative block">
            <span className="sr-only">Search activities</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activities" type="search"
              className="min-h-11 w-full rounded-full bg-black/25 pl-11 pr-4 text-body ring-1 ring-white/10 focus:outline-none focus:ring-accent-dark/70" />
          </label>
          <div className="mt-2"><ChipRow>{CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</ChipRow></div>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {shown.map((a) => {
            const on = planned.includes(a.id)
            return (
              <li key={a.id} className={cx('act-tile relative overflow-hidden rounded-card', on && 'act-tile-on')}>
                <button onClick={() => setOpen(a.id)} className="press block w-full text-left">
                  <span className="relative block aspect-[4/5]">
                    <VenuePhoto a={a} w={200} h={250} iconSize={34} iconTop="40%" className="absolute inset-0" />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#140c0a] via-[#140c0a]/30 to-transparent" />
                    <span className="glass-dark absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-semibold"><Clock size={12} aria-hidden="true" />{fmtDur(a.durationMin)}</span>
                    <span className="absolute inset-x-3 bottom-2.5 text-white">
                      <span className="line-clamp-2 text-[1rem] font-semibold leading-tight [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]">{a.name}</span>
                      <span className="mt-0.5 block truncate text-cap text-white/75">{a.category} · {a.costLabel.replace(' (illustrative)', '')}</span>
                      <span className="block truncate text-micro text-white/60">{[a.terminal, a.access === 'Unverified' ? null : a.access].filter(Boolean).join(' · ')}{a.leavesAirport ? ' · leaves airport' : ''}</span>
                    </span>
                  </span>
                </button>
                <button aria-label={`${on ? 'Remove' : ready ? 'Add' : 'Select'} ${a.name}`} aria-pressed={on} onClick={() => toggle(a.id)}
                  className={cx('press absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-full transition-colors', on ? 'btn-coral' : 'glass-dark text-white')}>
                  {on ? <Check size={20} strokeWidth={2.6} /> : <Plus size={20} />}</button>
              </li>)
          })}
          {!shown.length && <li className="col-span-2 py-6 text-center text-muted-text">No activities match.</li>}
        </ul>
  </>)
  return (
    <div className="pb-[calc(var(--nav-h)+6.5rem)]">
      <div className="ph relative h-[min(28rem,66svh)] min-h-[21rem] overflow-hidden rounded-b-tray">
        <img src={sized(ap.image, 900, 800)} alt={ap.image.alt} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="anim-kenburns absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-deep/90 via-deep/40 to-transparent" />
        {bar}
        <div className="absolute inset-x-5 bottom-5 text-white">
          <p className="glass-light inline-flex rounded-full px-3 py-1 text-cap font-semibold">{ap.code} · {ap.country}</p>
          <h1 className="mt-2 text-title font-bold leading-tight [text-shadow:0_2px_16px_rgb(0_0_0/0.45)]">{ap.name}</h1>
          {/* Frosted capsule: what's here, and (once times exist) how much time there is to spend on it */}
          <div className="glass-dark mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-card px-4 py-2.5 text-sub">
            <span className="flex items-center gap-1.5"><ListChecks size={16} aria-hidden="true" />{acts.length} {acts.length === 1 ? 'activity' : 'activities'}</span>
            <span className="flex items-center gap-1.5"><Sparkles size={16} aria-hidden="true" />{templates.length} {templates.length === 1 ? 'itinerary' : 'itineraries'}</span>
            {usable !== undefined && (
              <p className="w-full border-t border-white/15 pt-1.5 text-white">
                <Clock size={15} aria-hidden="true" className="mr-1.5 inline -translate-y-px text-accent-dark" />
                <b>{fmtDur(usable)}</b> usable time
                {b?.over ? <> · <span className="whitespace-nowrap"><b className="text-error">{fmtDur(-b.remaining)} over budget</b></span></> : b ? <> · <span className="whitespace-nowrap"><b>{fmtDur(b.remaining)}</b> still free</span></> : null}
              </p>)}
          </div>
        </div>
      </div>
      <div className="relative px-5">
        {/* With interests from the onboarding, the matching activities come first; otherwise curated itineraries lead */}
        {interests.length > 0 ? <>{activitiesBlock}{curatedBlock}</> : <>{curatedBlock}{activitiesBlock}</>}
      </div>
      <ActionBar>
        {ready ? <Button className="w-full" onClick={() => go({ name: 'builder' })}>Build itinerary ({planned.length})</Button>
          : <Button className="w-full" onClick={() => startTrip()}>{planned.length ? `Set layover times (${planned.length} selected)` : 'Set my layover times'}</Button>}
      </ActionBar>
      <ActivitySheet a={acts.find((a) => a.id === open) ?? null} onClose={() => setOpen(null)} />
    </div>
  )
}

/** Section heading with an optional quiet line under it. */
function SectionTitle({ children, sub, spark }: { children: React.ReactNode; sub?: string; spark?: boolean }) {
  return (
    <div className="mb-3 mt-8">
      <h2 className="text-h2 font-bold">{children}</h2>
      {sub && <p className="mt-0.5 flex items-center gap-1.5 text-sub text-muted-text">{spark && <Sparkles size={15} className="text-accent-dark" aria-hidden="true" />}{sub}</p>}
    </div>
  )
}
