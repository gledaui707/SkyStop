import { useState } from 'react'
import { ChevronLeft, Clock, Layers, ListChecks, LocateFixed, Plus, Check, Search, Sparkles, X } from 'lucide-react'
import { useApp } from '../store'
import { ACTIVITIES, getActivities, getAirport, getTemplates } from '../data/mock'
import { sized } from '../data/images'
import { budget, fmtDur, layoverMinutes, money, timeSpan } from '../data/time'
import { ActivityRow, ActivitySheet, Button, CATEGORIES, Chip, ChipRow, Photo, cx } from '../components/ui'
import { AirportMap, type Zone } from '../components/AirportMap'
import { Coach } from '../components/Coach'
import type { Category } from '../data/types'

type View = 'map' | 'list'
const ZONES: Zone[] = ['all', 'Airside', 'Landside']

/** Screen 3: discover your layover. Map-led, with a list alternative. */
export function Airport({ code, view: initialView }: { code: string; view?: View }) {
  const { go, back, draft, setDraft, hint } = useApp()
  const ap = getAirport(code)
  const [view, setView] = useState<View>(initialView ?? 'map')
  const [cat, setCat] = useState<'All' | Category>('All')
  const [zone, setZone] = useState<Zone>('all')
  const [focusId, setFocusId] = useState<string | null>(null)
  const startTrip = (templateId?: string) => go({ name: 'trip', airport: code, templateId })
  const [details, setDetails] = useState<string | null>(null)

  const acts = getActivities(code)
  const ready = !!draft && draft.airport === code
  const planned = ready ? draft!.activityIds : []
  const items = planned.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
  const b = ready ? budget(layoverMinutes(draft!.arrival, draft!.departure), draft!.bufferMin, items) : null
  const focus = acts.find((a) => a.id === focusId) ?? null

  const toggle = (id: string) => {
    if (!ready || !draft) { startTrip(); return }
    setDraft({ ...draft, activityIds: draft.activityIds.includes(id) ? draft.activityIds.filter((x) => x !== id) : [...draft.activityIds, id] })
  }
  const customize = (templateId: string) => {
    const t = getTemplates(code).find((x) => x.id === templateId)!
    if (ready && draft) { setDraft({ ...draft, name: t.name, activityIds: t.activityIds }); go({ name: 'builder' }) }
    else startTrip(templateId)
  }

  const bar = (
    <div className="absolute inset-x-0 top-0 z-20 px-3 pt-[calc(var(--safe-top)+0.5rem)]">
      <div className="flex items-center gap-2">
        <button onClick={back} aria-label="Back" className="glass-dark grid size-12 shrink-0 place-items-center rounded-full"><ChevronLeft size={26} strokeWidth={2.4} /></button>
        <div role="tablist" aria-label="Airport view" className="glass-dark grid flex-1 grid-cols-2 rounded-full p-1">
          {(['map', 'list'] as View[]).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={cx('min-h-10 rounded-full text-sub font-semibold capitalize', view === v ? 'bg-white text-accent-dark' : 'text-white')}>{v}</button>))}
        </div>
      </div>
      {view === 'map' && (
        <>
          <div className="-mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            {CATEGORIES.map((c) => (
              <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}
                className={cx('inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sub font-medium', cat === c ? 'bg-white text-accent-dark' : 'glass-dark')}>{c}</button>))}
          </div>
        </>
      )}
    </div>
  )

  if (view === 'map') {
    return (
      <div className="relative -mb-[var(--nav-h)] flex h-dvh flex-col">
        <div className="relative min-h-0 flex-1">
          <AirportMap activities={acts} planned={planned} focusId={focusId} onFocus={setFocusId} cat={cat} zone={zone} />
          {bar}
          <div className="absolute right-3 top-[11.5rem] z-20 grid gap-2">
            <button onClick={() => setZone(ZONES[(ZONES.indexOf(zone) + 1) % 3])} aria-label={`Map layers: ${zone === 'all' ? 'all zones' : zone}. Tap to change.`}
              className={cx('grid size-12 place-items-center rounded-full', zone === 'all' ? 'glass-dark' : 'bg-white text-accent-dark')}><Layers size={22} /></button>
            <button onClick={() => { setFocusId(null); setCat('All'); setZone('all') }} aria-label="Reset map" className="glass-dark grid size-12 place-items-center rounded-full"><LocateFixed size={22} /></button>
          </div>
          {zone !== 'all' && <p className="glass-dark absolute right-[4.25rem] top-[11.75rem] z-20 rounded-full px-3 py-1.5 text-cap">{zone} only</p>}
        </div>

        {/* Floating preview / summary sheet */}
        <div className="glass relative z-20 -mt-5 rounded-t-[1.5rem] px-4 pb-[calc(var(--nav-h)+0.25rem)] pt-3 !bg-white/95">
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line" />
          {focus ? (
            <div>
              <div className="flex items-center gap-3">
                <Photo img={focus.image} w={60} h={60} className="size-[3.75rem] shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-card font-semibold leading-tight">{focus.name}</p>
                  <p className="text-sub text-muted-text">{fmtDur(focus.durationMin)} · {focus.costUsd ? money(focus.costUsd) : 'Free'} · {focus.category}</p>
                  <p className="text-cap text-muted-text">{focus.access === 'Unverified' ? '' : focus.access}{focus.leavesAirport ? ' · leaves airport' : ''}</p>
                </div>
                <button onClick={() => setFocusId(null)} aria-label="Close preview" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-tint"><X size={18} /></button>
              </div>
              {b && !planned.includes(focus.id) && focus.durationMin > b.remaining && (
                <p role="alert" className="mt-2 text-sub font-medium text-error">Adds {fmtDur(focus.durationMin - Math.max(b.remaining, 0))} beyond your usable time.</p>)}
              <div className="mt-3 flex gap-2">
                <Button variant={planned.includes(focus.id) ? 'secondary' : 'primary'} className="flex-1" icon={planned.includes(focus.id) ? Check : Plus} onClick={() => toggle(focus.id)}>
                  {!ready ? 'Set layover to add' : planned.includes(focus.id) ? 'Added' : 'Add to itinerary'}</Button>
                <Button variant="secondary" onClick={() => setDetails(focus.id)}>Details</Button>
              </div>
            </div>
          ) : (
            <div>
              {hint === 3 ? <Coach step={3} /> : (
                <>
                  <p className="text-card font-semibold leading-tight">{ap.name}</p>
                  <p className="mt-0.5 text-sub text-muted-text">
                    {b ? `${fmtDur(b.usable)} usable · ${items.length} planned · ${b.over ? 'over by ' + fmtDur(-b.remaining) : fmtDur(b.remaining) + ' left'}` : 'Tap a marker or pick an activity below.'}</p>
                  <ul className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label="Activities at this airport">
                    {acts.filter((a) => cat === 'All' || a.category === cat).map((a) => (
                      <li key={a.id} className="shrink-0">
                        <button onClick={() => setFocusId(a.id)} className={cx('flex w-[13.5rem] items-center gap-2.5 rounded-xl border p-2 text-left', planned.includes(a.id) ? 'border-accent bg-accent-tint' : 'border-line bg-surface')}>
                          <Photo img={a.image} w={48} h={48} className="size-12 shrink-0 rounded-lg" />
                          <span className="min-w-0"><span className="block truncate text-sub font-semibold">{a.name}</span>
                            <span className="block text-cap text-muted-text">{fmtDur(a.durationMin)}{planned.includes(a.id) ? ' · added' : ''}</span></span>
                        </button>
                      </li>))}
                  </ul>
                </>
              )}
              {hint !== 3 && (!ready || items.length > 0) && (
                <div className="mt-3">
                  {ready
                    ? <Button className="w-full" onClick={() => go({ name: 'builder' })}>{`Build itinerary (${items.length})`}</Button>
                    : <Button className="w-full" onClick={() => startTrip()}>Set my layover</Button>}
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

  return <List {...{ code, bar, ready, planned, b, toggle, customize, startTrip }} />
}

function List({ code, bar, ready, planned, b, toggle, customize, startTrip }: {
  code: string; bar: React.ReactNode; ready: boolean; planned: string[]; b: ReturnType<typeof budget> | null
  toggle: (id: string) => void; customize: (id: string) => void
  startTrip: () => void
}) {
  const { go } = useApp()
  const ap = getAirport(code)
  const [cat, setCat] = useState<'All' | Category>('All')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const acts = getActivities(code)
  const shown = acts.filter((a) => (cat === 'All' || a.category === cat) && a.name.toLowerCase().includes(q.toLowerCase()))
  const usable = b?.usable
  return (
    <div className="pb-40">
      <div className="relative h-72 overflow-hidden bg-deep">
        <img src={sized(ap.image, 900, 580)} alt={ap.image.alt} title={`Photo: ${ap.image.credit} / Unsplash`} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-deep/55 via-transparent to-deep/50" />
        {bar}
      </div>
      <div className="relative -mt-8 rounded-t-[1.75rem] bg-canvas px-5 pt-5">
        <div className="text-center">
          <h1 className="text-h1 font-bold leading-tight">{ap.name}</h1>
          <p className="text-sub text-muted-text">{ap.code} · {ap.country}</p>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            {[[Clock, fmtDur(Math.min(...acts.map((x) => x.durationMin))) + '–' + fmtDur(Math.max(...acts.map((x) => x.durationMin))), 'Duration'], [ListChecks, String(acts.length), 'Activities'], [Sparkles, String(getTemplates(code).length), 'Itinerary']].map(([I, v, l]) => {
              const Icon = I as typeof Clock
              return <div key={l as string} className="flex flex-col items-center gap-0.5"><Icon size={20} className="text-accent" /><dt className="sr-only">{l as string}</dt><dd className="text-body font-semibold">{v as string}</dd><dd className="text-cap text-muted-text">{l as string}</dd></div>
            })}
          </dl>
        </div>
        <div className="mt-5"><Coach step={3} /></div>
        <h2 className="mb-3 mt-6 text-h2 font-bold">Curated itineraries</h2>
        {usable !== undefined && <p className="-mt-1 mb-3 text-body text-muted-text">Checked against your <b className="text-ink">{fmtDur(usable)}</b> usable time.</p>}
        <ul className="grid gap-4">
          {getTemplates(code).map((t) => {
            const items = t.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!)
            const dur = timeSpan(items)
            const fit = usable === undefined ? null : dur <= usable
            return (
              <li key={t.id} className="overflow-hidden rounded-[1.25rem] border border-line bg-surface">
                <div className="relative flex h-40 bg-deep">
                  {items.map((a) => <Photo key={a.id} img={a.image} w={200} h={160} className="h-full min-w-0 flex-1" />)}
                  <div className="photo-fade absolute inset-x-0 bottom-0 h-[95%]" />
                  <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-2 text-white">
                    <div className="min-w-0"><h3 className="text-card font-semibold leading-tight">{t.name}</h3><p className="text-sub text-white/80">{ap.code} · {fmtDur(dur)}</p></div>
                    <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sub font-medium">{money(items.reduce((s, a) => s + a.costUsd, 0))} est.</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-body text-muted-text">{t.blurb}</p>
                  <ul className="mt-2 text-body">{items.map((a) => <li key={a.id} className="flex justify-between py-0.5"><span>{a.name}</span><span className="text-muted-text">{fmtDur(a.durationMin)}</span></li>)}</ul>
                  <p className={cx('mt-3 rounded-xl px-3 py-2 text-sub font-medium', fit === null ? 'bg-canvas text-muted-text' : fit ? 'bg-success/10 text-success' : 'bg-error-tint text-ink')}>
                    {fit === null ? 'Set your layover to check suitability.' : fit ? `Fits with ${fmtDur(usable! - dur)} to spare.` : `Needs ${fmtDur(dur - usable!)} more than your usable time. You can trim it.`}</p>
                  <Button variant="secondary" className="mt-3 w-full" onClick={() => customize(t.id)}>Customize itinerary</Button>
                </div>
              </li>
            )
          })}
        </ul>

        <h2 className="mb-3 mt-8 text-h2 font-bold">Activities</h2>
        <label className="relative block">
          <span className="sr-only">Search activities</span>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-[0.95rem] text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activities" type="search" className="min-h-12 w-full rounded-[0.875rem] border border-line bg-surface pl-10 pr-3 text-body" />
        </label>
        <div className="mt-3"><ChipRow>{CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</ChipRow></div>
        <ul className="mt-3 grid gap-3">
          {shown.map((a) => {
            const on = planned.includes(a.id)
            return <ActivityRow key={a.id} a={a} onOpen={() => setOpen(a.id)} action={
              <button aria-label={`${on ? 'Remove' : 'Add'} ${a.name}`} aria-pressed={on} onClick={() => toggle(a.id)}
                className={cx('grid size-11 shrink-0 place-items-center rounded-full', on ? 'bg-accent text-white' : 'bg-accent-tint text-accent-dark')}>{on ? <Check size={20} /> : <Plus size={20} />}</button>} />
          })}
          {!shown.length && <li className="py-6 text-center text-muted-text">No activities match.</li>}
        </ul>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-[var(--nav-h)] z-30 mx-auto max-w-[480px] px-4 pb-2">
        <div className="glass pointer-events-auto rounded-[1.25rem] p-2.5">
          {ready ? <Button className="w-full" onClick={() => go({ name: 'builder' })}>Build itinerary ({planned.length})</Button>
            : <Button className="w-full" onClick={startTrip}>Set my layover</Button>}
        </div>
      </div>
      <ActivitySheet a={acts.find((a) => a.id === open) ?? null} onClose={() => setOpen(null)} />
    </div>
  )
}
