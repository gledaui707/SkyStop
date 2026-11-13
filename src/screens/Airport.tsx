import { useState } from 'react'
import { ChevronLeft, ListChecks, Plus, Check, Search, Sparkles } from 'lucide-react'
import { useApp } from '../store'
import { ACTIVITIES, getActivities, getAirport, getTemplates } from '../data/mock'
import { sized } from '../data/images'
import { budget, fmtDur, layoverMinutesAt, timeSpan } from '../data/time'
import { ActionBar, ActivityRow, ActivitySheet, Button, CATEGORIES, Chip, ChipRow, Photo, cx, IconButton } from '../components/ui'
import { MapView } from '../features/wayfinding/MapView'
import type { Category } from '../data/types'

type View = 'map' | 'list'

/** Discover a layover airport. List first (curated itineraries, then activities); the map shows the real airport
 *  with a pin per terminal behind a toggle. Planning state lives in the store, so switching views keeps everything. */
export function Airport({ code, view: initialView, directions, venue }: { code: string; view?: View; directions?: boolean; venue?: string }) {
  const { go, back, draft, setDraft, picked, setPicked } = useApp()
  const ap = getAirport(code)
  const [view, setView] = useState<View>(initialView ?? 'list')
  const [cat, setCat] = useState<'All' | Category>('All')
  const startTrip = (templateId?: string) => go({ name: 'trip', airport: code, templateId })

  const acts = getActivities(code)
  const ready = !!draft && draft.airport === code
  // Before layover times exist, activities can still be selected; they are carried into the setup form.
  const planned = ready ? draft!.activityIds : picked?.airport === code ? picked.ids : []
  const items = planned.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
  const b = ready ? budget(layoverMinutesAt(draft!.arrival, draft!.departure, ap.timezone), draft!.bufferMin, items) : null

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
      </div>
      {view === 'map' && (
        <>
          <div role="group" aria-label="Filter by category" className="no-scrollbar scroll-fade -mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-1">
            {CATEGORIES.map((c) => (
              <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}
                className={cx('inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sub font-medium', cat === c ? 'bg-white text-[#2a1b18]' : 'glass-dark')}>{c}</button>))}
          </div>
        </>
      )}
    </div>
  )

  if (view === 'map') return <MapView {...{ code, bar, acts, planned, ready, b, cat, toggle, startTrip }} openDirections={directions} openVenue={venue} />

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
  const templates = getTemplates(code)
  return (
    <div className="pb-[calc(var(--nav-h)+6.5rem)]">
      <div className="ph relative h-[26rem] overflow-hidden rounded-b-tray">
        <img src={sized(ap.image, 900, 800)} alt={ap.image.alt} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="anim-kenburns absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[66%] bg-gradient-to-t from-deep/85 via-deep/35 to-transparent" />
        {bar}
        <div className="absolute inset-x-5 bottom-5 text-white">
          <p className="glass-light inline-flex rounded-full px-3 py-1 text-cap font-semibold">{ap.code} · {ap.country}</p>
          <h1 className="mt-2 text-title font-bold leading-tight">{ap.name}</h1>
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/30 pt-3 text-sub text-white/90">
            <li className="flex items-center gap-1.5"><ListChecks size={16} aria-hidden="true" /><span>{acts.length} {acts.length === 1 ? 'activity' : 'activities'}</span></li>
            <li className="flex items-center gap-1.5"><Sparkles size={16} aria-hidden="true" /><span>{templates.length} {templates.length === 1 ? 'itinerary' : 'itineraries'}</span></li>
          </ul>
        </div>
      </div>
      <div className="relative px-5">
        {usable !== undefined && (
          <p className="panel-accent mt-4 rounded-control px-4 py-3 text-sub text-ink">
            <b>{fmtDur(usable)}</b> usable time
            {b?.over ? <> · <b className="text-error">{fmtDur(-b.remaining)} over budget</b></> : b ? <> · <b>{fmtDur(b.remaining)}</b> still free</> : null}
          </p>
        )}
        <h2 className="mb-3 mt-8 text-h2 font-bold">Curated itineraries</h2>
        <ul className="grid gap-4">
          {templates.map((t) => {
            const items = t.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!)
            const dur = timeSpan(items)
            const fit = usable === undefined ? null : dur <= usable
            return (
              <li key={t.id} className="panel overflow-hidden rounded-surface">
                <div className="ph relative flex h-44 gap-0.5">
                  {items.map((a) => <span key={a.id} className="relative h-full min-w-0 flex-1 overflow-hidden"><Photo img={a.image} w={200} h={176} className="absolute inset-0 size-full" /></span>)}
                  <div className="photo-fade absolute inset-x-0 bottom-0 h-[90%]" />
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
                  <p className={cx('mt-3 rounded-control px-3 py-2 text-sub font-medium', fit === null ? 'bg-ink-tint text-muted-text' : fit ? 'bg-success/12 text-success' : 'bg-error-tint text-ink')}>
                    {fit === null ? 'Set your layover times to check whether it fits.' : fit ? `Fits with ${fmtDur(usable! - dur)} to spare.` : `Needs ${fmtDur(dur - usable!)} more than your usable time. You can trim it.`}</p>
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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activities" type="search" className="field min-h-12 w-full rounded-full pl-11 pr-4 text-body focus:!border-accent-dark/70 focus:outline-none" />
        </label>
        <div className="mt-3"><ChipRow>{CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</ChipRow></div>
        <ul className="mt-3 grid gap-3">
          {shown.map((a) => {
            const on = planned.includes(a.id)
            return <ActivityRow key={a.id} a={a} onOpen={() => setOpen(a.id)} action={
              <button aria-label={`${on ? 'Remove' : ready ? 'Add' : 'Select'} ${a.name}`} aria-pressed={on} onClick={() => toggle(a.id)}
                className={cx('press grid size-11 shrink-0 place-items-center rounded-full transition-colors', on ? 'btn-coral' : 'bg-accent-tint text-accent-dark ring-1 ring-accent/25')}>{on ? <Check size={20} strokeWidth={2.6} /> : <Plus size={20} />}</button>} />
          })}
          {!shown.length && <li className="py-6 text-center text-muted-text">No activities match.</li>}
        </ul>
      </div>
      <ActionBar>
        {ready ? <Button className="w-full" onClick={() => go({ name: 'builder' })}>Build itinerary ({planned.length})</Button>
          : <Button className="w-full" onClick={() => startTrip()}>{planned.length ? `Set layover times (${planned.length} selected)` : 'Set my layover times'}</Button>}
      </ActionBar>
      <ActivitySheet a={acts.find((a) => a.id === open) ?? null} onClose={() => setOpen(null)} />
    </div>
  )
}
