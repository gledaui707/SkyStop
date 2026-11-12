import { useState } from 'react'
import { ChevronLeft, Clock, Layers, ListChecks, LocateFixed, Plus, Check, Search, Sparkles, X } from 'lucide-react'
import { useApp } from '../store'
import { ACTIVITIES, getActivities, getAirport, getTemplates } from '../data/mock'
import { sized } from '../data/images'
import { budget, fmtDur, layoverMinutesAt, timeSpan } from '../data/time'
import { ActivityRow, ActivitySheet, Button, CATEGORIES, Chip, ChipRow, Photo, cx } from '../components/ui'
import { AirportMap, type Zone } from '../components/AirportMap'
import type { Category } from '../data/types'

type View = 'map' | 'list'
const ZONES: Zone[] = ['all', 'Airside', 'Landside']

/** Discover a layover airport. List first (curated itineraries, then activities); the map is an illustrative
 *  zone schematic behind a toggle. Planning state lives in the store, so switching views keeps everything. */
export function Airport({ code, view: initialView }: { code: string; view?: View }) {
  const { go, back, draft, setDraft, picked, setPicked } = useApp()
  const ap = getAirport(code)
  const [view, setView] = useState<View>(initialView ?? 'list')
  const [cat, setCat] = useState<'All' | Category>('All')
  const [zone, setZone] = useState<Zone>('all')
  const [focusId, setFocusId] = useState<string | null>(null)
  const startTrip = (templateId?: string) => go({ name: 'trip', airport: code, templateId })
  const [details, setDetails] = useState<string | null>(null)

  const acts = getActivities(code)
  const ready = !!draft && draft.airport === code
  // Before layover times exist, activities can still be selected; they are carried into the setup form.
  const planned = ready ? draft!.activityIds : picked?.airport === code ? picked.ids : []
  const items = planned.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
  const b = ready ? budget(layoverMinutesAt(draft!.arrival, draft!.departure, ap.timezone), draft!.bufferMin, items) : null
  const focus = acts.find((a) => a.id === focusId) ?? null

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
        <button onClick={back} aria-label="Back" className="glass-dark press grid size-12 shrink-0 place-items-center rounded-full"><ChevronLeft size={26} strokeWidth={2.4} /></button>
        <div role="tablist" aria-label="Airport view" className="glass-dark grid flex-1 grid-cols-2 rounded-full p-1">
          {(['list', 'map'] as View[]).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={cx('min-h-10 rounded-full text-sub font-semibold capitalize transition-colors', view === v ? 'bg-white text-[#2a1b18]' : 'text-white')}>{v}</button>))}
        </div>
      </div>
      {view === 'map' && (
        <>
          <div className="no-scrollbar -mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-1">
            {CATEGORIES.map((c) => (
              <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}
                className={cx('inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sub font-medium', cat === c ? 'bg-white text-[#2a1b18]' : 'glass-dark')}>{c}</button>))}
          </div>
        </>
      )}
    </div>
  )

  if (view === 'map') {
    return (
      <div className="relative -mb-[var(--nav-h)] flex min-h-dvh flex-col">
        {/* min height keeps every marker visible above the sheet on short phones; the page scrolls instead */}
        <div className="relative min-h-[28rem] flex-1">
          <AirportMap activities={acts} planned={planned} focusId={focusId} onFocus={setFocusId} cat={cat} zone={zone} />
          {bar}
          <div className="absolute right-3 top-[11.5rem] z-20 grid gap-2">
            <button onClick={() => setZone(ZONES[(ZONES.indexOf(zone) + 1) % 3])} aria-label={`Map layers: ${zone === 'all' ? 'all zones' : zone}. Tap to change.`}
              className={cx('grid size-12 place-items-center rounded-full', zone === 'all' ? 'glass-dark' : 'bg-white text-[#2a1b18]')}><Layers size={22} /></button>
            <button onClick={() => { setFocusId(null); setCat('All'); setZone('all') }} aria-label="Reset map" className="glass-dark grid size-12 place-items-center rounded-full"><LocateFixed size={22} /></button>
          </div>
          {zone !== 'all' && <p className="glass-dark absolute right-[4.25rem] top-[11.75rem] z-20 rounded-full px-3 py-1.5 text-cap">{zone} only</p>}
        </div>

        {/* Floating preview / summary sheet */}
        <div className="glass relative z-20 -mt-6 rounded-t-[2rem] !border-b-0 px-4 pb-[calc(var(--nav-h)+0.25rem)] pt-3">
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-white/30" />
          {focus ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="ph relative size-[3.75rem] shrink-0 overflow-hidden rounded-2xl"><Photo img={focus.image} w={60} h={60} className="absolute inset-0 size-full" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-card font-semibold leading-tight">{focus.name}</p>
                  <p className="text-sub text-muted-text">{fmtDur(focus.durationMin)} · {focus.costLabel} · {focus.category}</p>
                  <p className="text-cap text-muted-text">{focus.access === 'Unverified' ? '' : focus.access}{focus.leavesAirport ? ' · leaves airport' : ''}</p>
                </div>
                <button onClick={() => setFocusId(null)} aria-label="Close preview" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-line"><X size={18} /></button>
              </div>
              {b && !planned.includes(focus.id) && focus.durationMin > b.remaining && (
                <p role="alert" className="mt-2 text-sub font-medium text-error">Adds {fmtDur(focus.durationMin - Math.max(b.remaining, 0))} beyond your usable time.</p>)}
              <div className="mt-3 flex gap-2">
                <Button variant={planned.includes(focus.id) ? 'secondary' : 'primary'} className="flex-1" icon={planned.includes(focus.id) ? Check : Plus} onClick={() => toggle(focus.id)}>
                  {planned.includes(focus.id) ? (ready ? 'Added' : 'Selected') : ready ? 'Add to itinerary' : 'Select'}</Button>
                <Button variant="secondary" onClick={() => setDetails(focus.id)}>Details</Button>
              </div>
            </div>
          ) : (
            <div>
              {(
                <>
                  <p className="text-card font-semibold leading-tight">{ap.name}</p>
                  <p className="mt-0.5 text-sub text-muted-text">
                    {b ? `${fmtDur(b.usable)} usable · ${items.length} planned · ${b.over ? 'over by ' + fmtDur(-b.remaining) : fmtDur(b.remaining) + ' left'}` : `${items.length ? items.length + ' selected · ' : ''}Add layover times to check fit.`}</p>
                  <p className="mt-0.5 text-cap text-muted-text">Schematic map, not for navigation.</p>
                  <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Activities at this airport">
                    {acts.filter((a) => cat === 'All' || a.category === cat).map((a) => (
                      <li key={a.id} className="shrink-0">
                        <button onClick={() => setFocusId(a.id)} className={cx('press flex w-[13.5rem] items-center gap-2.5 rounded-2xl border p-2 text-left', planned.includes(a.id) ? 'border-accent/70 bg-accent-tint' : 'border-line bg-white/[0.06]')}>
                          <span className="ph relative size-12 shrink-0 overflow-hidden rounded-xl"><Photo img={a.image} w={48} h={48} className="absolute inset-0 size-full" /></span>
                          <span className="min-w-0"><span className="block truncate text-sub font-semibold">{a.name}</span>
                            <span className="block text-cap text-muted-text">{fmtDur(a.durationMin)}{planned.includes(a.id) ? (ready ? ' · added' : ' · selected') : ''}</span></span>
                        </button>
                      </li>))}
                  </ul>
                </>
              )}
              {(!ready || items.length > 0) && (
                <div className="mt-3">
                  {ready
                    ? <Button className="w-full" onClick={() => go({ name: 'builder' })}>{`Build itinerary (${items.length})`}</Button>
                    : <Button className="w-full" onClick={() => startTrip()}>{items.length ? `Set layover times (${items.length} selected)` : 'Set layover times'}</Button>}
                </div>)}
            </div>
          )}
          {focus && ready && items.length > 0 && (
            <button onClick={() => go({ name: 'builder' })} className="mt-1 min-h-11 w-full text-body font-medium text-accent-dark">Review itinerary ({items.length})</button>)}
        </div>
        <ActivitySheet a={acts.find((a) => a.id === details) ?? null} onClose={() => setDetails(null)} />
      </div>
    )
  }

  return <List {...{ code, bar, ready, planned, b, toggle, applyItinerary, startTrip, cat, setCat }} />
}

function List({ code, bar, ready, planned, b, toggle, applyItinerary, startTrip, cat, setCat }: {
  code: string; bar: React.ReactNode; ready: boolean; planned: string[]; b: ReturnType<typeof budget> | null
  toggle: (id: string) => void; applyItinerary: (id: string) => void
  startTrip: () => void; cat: 'All' | Category; setCat: (c: 'All' | Category) => void
}) {
  const { go } = useApp()
  const ap = getAirport(code)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const acts = getActivities(code)
  const shown = acts.filter((a) => (cat === 'All' || a.category === cat) && a.name.toLowerCase().includes(q.toLowerCase()))
  const usable = b?.usable
  const durs = acts.map((x) => x.durationMin)
  return (
    <div className="pb-[calc(var(--nav-h)+6.5rem)]">
      <div className="ph relative h-[25rem] overflow-hidden">
        <img src={sized(ap.image, 900, 800)} alt={ap.image.alt} title={`Photo: ${ap.image.credit} / Unsplash`} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="anim-kenburns absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" />
        <div className="hero-melt absolute inset-x-0 bottom-0 h-[65%]" />
        {bar}
        <div className="absolute inset-x-5 bottom-4 text-white">
          <p className="glass-light inline-flex rounded-full px-3 py-1 text-cap font-semibold uppercase tracking-[0.08em]">{ap.code} · {ap.country}</p>
          <h1 className="mt-2 text-title font-bold leading-tight">{ap.name}</h1>
        </div>
      </div>
      <div className="relative px-5">
        <dl className="grid grid-cols-3 gap-2">
          {[[Clock, fmtDur(Math.min(...durs)) + '–' + fmtDur(Math.max(...durs)), 'Duration'], [ListChecks, String(acts.length), 'Activities'], [Sparkles, String(getTemplates(code).length), 'Itinerary']].map(([I, v, l]) => {
            const Icon = I as typeof Clock
            return <div key={l as string} className="panel flex flex-col items-center gap-0.5 rounded-2xl px-1 py-3"><Icon size={20} className="text-accent-dark" /><dt className="sr-only">{l as string}</dt><dd className="whitespace-nowrap text-sub font-semibold">{v as string}</dd><dd className="text-cap text-muted-text">{l as string}</dd></div>
          })}
        </dl>
        <p className={cx('mt-4 rounded-2xl px-4 py-3 text-sub', usable !== undefined ? 'panel-accent text-ink' : 'panel text-muted-text')}>
          {usable !== undefined
            ? <>Checked against your <b className="text-ink">{fmtDur(usable)}</b> usable time{b && !b.over ? <> · <b className="text-ink">{fmtDur(b.remaining)}</b> free</> : b?.over ? <> · <b className="text-error">{fmtDur(-b.remaining)} over</b></> : null}</>
            : <>Add layover times to check what fits.</>}
        </p>
        <h2 className="mb-3 mt-8 text-h2 font-bold">Curated itineraries</h2>
        <ul className="grid gap-4">
          {getTemplates(code).map((t) => {
            const items = t.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!)
            const dur = timeSpan(items)
            const fit = usable === undefined ? null : dur <= usable
            return (
              <li key={t.id} className="panel overflow-hidden rounded-[1.75rem]">
                <div className="ph relative flex h-44 gap-0.5">
                  {items.map((a) => <span key={a.id} className="relative h-full min-w-0 flex-1 overflow-hidden"><Photo img={a.image} w={200} h={176} className="absolute inset-0 size-full" /></span>)}
                  <div className="photo-fade absolute inset-x-0 bottom-0 h-[90%]" />
                  <span className="glass-dark absolute right-3 top-3 rounded-full px-3 py-1 text-cap font-medium text-white">Illustrative</span>
                  <div className="absolute inset-x-4 bottom-3 text-white">
                    <h3 className="text-h2 font-bold leading-tight">{t.name}</h3>
                    <p className="text-sub text-white/80">{ap.code} · {fmtDur(dur)} · {items.length} stops</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-body text-muted-text">{t.blurb}</p>
                  <ol className="relative mt-3 ml-1.5 border-l border-dashed border-accent-dark/50 pl-4 text-body">
                    {items.map((a) => <li key={a.id} className="relative flex justify-between gap-3 py-1"><span aria-hidden="true" className="absolute -left-[1.3rem] top-[0.7rem] size-2.5 rounded-full bg-accent ring-4 ring-[#2a1f1d]" /><span className="min-w-0">{a.name}</span><span className="shrink-0 text-muted-text tabular-nums">{fmtDur(a.durationMin)}</span></li>)}
                  </ol>
                  <p className={cx('mt-3 rounded-2xl px-3 py-2 text-sub font-medium', fit === null ? 'bg-white/[0.06] text-muted-text' : fit ? 'bg-success/12 text-success' : 'bg-error-tint text-ink')}>
                    {fit === null ? 'Add layover times to check fit.' : fit ? `Fits with ${fmtDur(usable! - dur)} to spare.` : `Needs ${fmtDur(dur - usable!)} more than your usable time.`}</p>
                  <Button variant="secondary" className="mt-3 w-full" onClick={() => applyItinerary(t.id)}>Use this itinerary</Button>
                </div>
              </li>
            )
          })}
        </ul>

        <h2 className="mb-3 mt-9 text-h2 font-bold">Activities</h2>
        <label className="relative block">
          <span className="sr-only">Search activities</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activities" type="search" className="min-h-12 w-full rounded-full border border-line bg-white/[0.06] pl-11 pr-4 text-body backdrop-blur-md focus:border-accent-dark/70 focus:outline-none" />
        </label>
        <div className="mt-3"><ChipRow>{CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</ChipRow></div>
        <ul className="mt-3 grid gap-3">
          {shown.map((a) => {
            const on = planned.includes(a.id)
            return <ActivityRow key={a.id} a={a} onOpen={() => setOpen(a.id)} action={
              <button aria-label={`${on ? 'Remove' : ready ? 'Add' : 'Select'} ${a.name}`} aria-pressed={on} onClick={() => toggle(a.id)}
                className={cx('press grid size-11 shrink-0 place-items-center rounded-full transition-colors', on ? 'btn-coral' : 'bg-white/10 text-ink ring-1 ring-line')}>{on ? <Check size={20} strokeWidth={2.6} /> : <Plus size={20} />}</button>} />
          })}
          {!shown.length && <li className="py-6 text-center text-muted-text">No activities match.</li>}
        </ul>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-[var(--nav-h)] z-30 mx-auto max-w-[480px] px-4 pb-2">
        <div className="glass pointer-events-auto rounded-[1.75rem] p-2.5">
          {ready ? <Button className="w-full" onClick={() => go({ name: 'builder' })}>Build itinerary ({planned.length})</Button>
            : <Button className="w-full" onClick={() => startTrip()}>{planned.length ? `Set layover times (${planned.length} selected)` : 'Set layover times'}</Button>}
        </div>
      </div>
      <ActivitySheet a={acts.find((a) => a.id === open) ?? null} onClose={() => setOpen(null)} />
    </div>
  )
}
