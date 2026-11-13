import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Bus, Check, ChevronDown, ChevronUp, Footprints, Layers, LocateFixed, Navigation, Plus, ShieldAlert, TrainFront, X, type LucideIcon } from 'lucide-react'
import { useApp } from '../../store'
import { GRAPHS, getAirport } from '../../data/mock'
import { AIRPORT_GEO, terminalKeysOf } from '../../data/airportGeo'
import { fmtDur, type budget } from '../../data/time'
import { computeItinerary, MODE_LABEL } from '../../data/itinerary'
import { planItinerary } from '../../domain/itinerary'
import { AirportMap, zoneOf, type Zone } from '../../components/AirportMap'
import { ActivitySheet, Button, Photo, cx } from '../../components/ui'
import type { Activity, Category } from '../../data/types'
import { buildRoute, stopsByPin, type Leg, type LegStatus, type RouteView } from './route'

const ZONES: Zone[] = ['all', 'Airside', 'Landside']
const MODE_ICON: Record<string, LucideIcon> = { walk: Footprints, link_bridge_walk: Footprints, skytrain_or_walk: TrainFront, shuttle_bus: Bus }
const STATUS: Record<LegStatus, { label: string; cls: string; hint: string }> = {
  verified: { label: 'Published time', cls: 'bg-success/15 text-success', hint: 'Minutes published by the airport.' },
  estimate: { label: 'Estimate', cls: 'bg-[#f6a04d]/20 text-[#f6a04d]', hint: 'Planning estimate: no published time for at least one step.' },
  unavailable: { label: 'No directions', cls: 'bg-ink-tint text-muted-text', hint: 'No recorded route between these places.' },
}

interface Props {
  code: string
  bar: ReactNode
  acts: Activity[]
  planned: string[]
  ready: boolean
  b: ReturnType<typeof budget> | null
  cat: 'All' | Category
  toggle: (id: string) => void
  startTrip: () => void
}

/** Airport map with one coordinated bottom sheet: browse (terminal filter + venues), a venue preview, or directions.
 *  Floating controls sit above the sheet, the sheet sits above the tab bar; nothing overlaps. */
export function MapView({ code, bar, acts, planned, ready, b, cat, toggle, startTrip }: Props) {
  const { go, draft } = useApp()
  const ap = getAirport(code)
  const graph = GRAPHS[code] ?? null
  const [zone, setZone] = useState<Zone>('all')
  const [terminal, setTerminal] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [routeFor, setRouteFor] = useState<'plan' | string | null>(null)
  const [leg, setLeg] = useState<number | null>(null)
  // Short phones start with the sheet collapsed (title + main action) so the map stays visible.
  const [expanded, setExpanded] = useState(() => typeof window === 'undefined' || window.innerHeight >= 720)
  const [details, setDetails] = useState<string | null>(null)
  const sheet = useRef<HTMLElement>(null), top = useRef<HTMLDivElement>(null)
  const [sheetH, setSheetH] = useState(260), [topH, setTopH] = useState(120)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => { setSheetH(sheet.current?.offsetHeight ?? 0); setTopH((top.current?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0) })
    if (sheet.current) ro.observe(sheet.current)
    const bar = top.current?.firstElementChild
    if (bar) ro.observe(bar)
    return () => ro.disconnect()
  }, [])
  // --nav-h is a calc() (tab bar + safe area): measure it once with a probe element.
  const nav = useRef<number>(0)
  if (!nav.current) {
    const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--nav-h)'
    document.body.appendChild(probe); nav.current = probe.offsetHeight || 88; probe.remove()
  }
  const bottomInset = sheetH + nav.current + 12
  // The two map buttons need ~100 px between the top controls and the sheet; with the sheet fully open there may be none.
  const roomForControls = typeof window === 'undefined' || window.innerHeight - bottomInset - topH >= 100

  const focus = acts.find((a) => a.id === focusId) ?? null
  const shown = acts.filter((a) => (cat === 'All' || a.category === cat) && (zone === 'all' || zoneOf(a) === zone) && (!terminal || terminalKeysOf(code, a.terminal).includes(terminal)))
  const terminals = AIRPORT_GEO[code]?.terminals ?? []

  // Directions: the whole itinerary (when layover times exist), or one venue from arrival and back to departure.
  const route: RouteView | null = useMemo(() => {
    if (!graph || !routeFor) return null
    if (routeFor === 'plan') {
      if (!ready || !draft) return null
      const { items, itin } = computeItinerary(draft)
      return buildRoute(code, graph, itin, items, draft.arrivalLocation, draft.departureLocation)
    }
    const a = acts.find((x) => x.id === routeFor)
    if (!a) return null
    const z = a.access === 'Airside' ? 'airside' : a.access === 'Landside' ? 'landside' : 'unknown'
    const itin = planItinerary({ usable: b?.usable ?? 0, graph, arrivalLocation: draft?.arrivalLocation, departureLocation: draft?.departureLocation,
      activities: [{ id: a.id, name: a.name, durationMin: a.durationMin, zone: z, locationIds: a.locationIds }] })
    return buildRoute(code, graph, itin, [a], draft?.arrivalLocation, draft?.departureLocation)
  }, [graph, routeFor, ready, draft, code, acts, b?.usable])
  const sel: Leg | null = route && leg !== null ? route.legs[leg] ?? null : null
  const pins = route ? stopsByPin(route.stops) : {}
  const lastStop = route ? route.stops.length - 1 : -1
  const paths = (route?.legs ?? []).filter((l) => l.geometry).map((l) => ({ key: String(l.i), points: l.geometry!, active: leg === null || l.i === leg }))

  const closeRoute = () => { setRouteFor(null); setLeg(null); setExpanded(window.innerHeight >= 720) }
  const canRoute = !!graph
  const mode = route ? 'route' : focus ? 'venue' : 'browse'

  return (
    <div className="relative -mb-[var(--nav-h)] h-dvh overflow-hidden">
      <AirportMap airport={code} activities={acts} planned={planned} terminal={terminal}
        onTerminal={(k) => { setTerminal(k); setFocusId(null); if (k) setExpanded(true) }} cat={cat} zone={zone}
        insets={{ top: topH, bottom: bottomInset, right: 64 }} stops={pins} lastStop={lastStop}
        highlight={sel ? { from: sel.from.mapKey, to: sel.to.mapKey } : undefined} paths={paths}
        focusKeys={sel ? [sel.from.mapKey, sel.to.mapKey].filter((k): k is string => !!k) : route ? route.stops.map((s) => s.mapKey).filter((k): k is string => !!k) : []} />
      <div ref={top}>{bar}</div>

      {/* Map controls: always above the sheet, never under it */}
      <div className={cx('absolute right-3 z-20 grid gap-2 transition-[bottom] duration-300 motion-reduce:transition-none', !roomForControls && 'invisible')} style={{ bottom: bottomInset }}>
        <button type="button" onClick={() => setZone(ZONES[(ZONES.indexOf(zone) + 1) % 3])}
          aria-label={`Show ${zone === 'all' ? 'all zones' : zone + ' only'}. Tap to change.`}
          className={cx('map-glass press grid size-11 place-items-center rounded-full', zone !== 'all' && '!bg-[#ea5139] !text-white')}><Layers size={20} /></button>
        <button type="button" onClick={() => { setTerminal(null); setFocusId(null); setZone('all'); setLeg(null) }} aria-label="Show the whole airport"
          className="map-glass press grid size-11 place-items-center rounded-full"><LocateFixed size={20} /></button>
      </div>
      {zone !== 'all' && roomForControls && <p className="map-glass absolute right-[3.75rem] z-20 rounded-full px-3 py-1.5 text-cap font-semibold" style={{ bottom: bottomInset + 64 }}>{zone} only</p>}

      {/* The one bottom sheet: floats above the tab bar */}
      <section ref={sheet} aria-label={mode === 'route' ? 'Directions' : mode === 'venue' ? focus!.name : `${ap.name} map`}
        className="glass-medium absolute inset-x-3 z-30 mx-auto flex max-h-[min(62dvh,34rem)] max-w-[456px] flex-col overflow-hidden rounded-tray"
        style={{ bottom: `calc(var(--nav-h) + 0.5rem)` }}>
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label={expanded ? 'Collapse sheet' : 'Expand sheet'}
          className="grid h-6 shrink-0 place-items-center"><span className="h-1 w-9 rounded-full bg-ink/25" /></button>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-3">
          {mode === 'route' && route ? (
            <RouteSheet route={route} leg={leg} onLeg={setLeg} onClose={closeRoute} expanded={expanded} onExpand={() => setExpanded(true)} airportName={ap.name}
              forPlan={routeFor === 'plan'} onPlan={() => go({ name: 'builder' })} />
          ) : mode === 'venue' && focus ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="ph relative size-14 shrink-0 overflow-hidden rounded-control"><Photo img={focus.image} w={56} h={56} className="absolute inset-0 size-full" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-card font-semibold leading-tight">{focus.name}</p>
                  <p className="text-sub text-muted-text">{fmtDur(focus.durationMin)} · {focus.costLabel} · {focus.category}</p>
                  <p className="text-cap text-muted-text">{[focus.terminal, focus.access === 'Unverified' ? null : focus.access].filter(Boolean).join(' · ')}{focus.leavesAirport ? ' · leaves airport' : ''}</p>
                </div>
                <button type="button" onClick={() => setFocusId(null)} aria-label="Close preview" className="press grid size-11 shrink-0 place-items-center rounded-full bg-ink-tint"><X size={18} /></button>
              </div>
              {expanded && b && !planned.includes(focus.id) && focus.durationMin > b.remaining && (
                <p role="alert" className="mt-2 text-sub font-medium text-error">Adds {fmtDur(focus.durationMin - Math.max(b.remaining, 0))} beyond your usable time.</p>)}
              {expanded && !canRoute && <p className="mt-2 text-cap text-muted-text">Directions aren't available at {ap.name}: SkyStop has no transfer data here yet. The venue is listed in {focus.terminal ?? 'the terminal shown'}; follow airport signs.</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button className={canRoute ? '' : 'col-span-2'} variant={planned.includes(focus.id) ? 'secondary' : 'primary'} icon={planned.includes(focus.id) ? Check : Plus} onClick={() => toggle(focus.id)}>
                  {planned.includes(focus.id) ? (ready ? 'Added' : 'Selected') : ready ? 'Add' : 'Select'}</Button>
                {canRoute && <Button variant="secondary" icon={Navigation} onClick={() => { setRouteFor(focus.id); setLeg(0); setExpanded(false) }}>How to get there</Button>}
                <Button variant="tertiary" size="sm" className="col-span-2" onClick={() => setDetails(focus.id)}>Details</Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-card font-semibold leading-tight">{terminal ? `${terminals.find((t) => t.key === terminal)?.name} · ${ap.city}` : ap.name}</p>
              <p className={cx('mt-0.5 text-sub text-muted-text', !expanded && 'truncate')}>
                {b ? `${fmtDur(b.usable)} usable · ${planned.length} planned · ${b.over ? 'over by ' + fmtDur(-b.remaining) : fmtDur(b.remaining) + ' left'}` : `${planned.length ? planned.length + ' selected · ' : ''}Set your layover times to check what fits.`}</p>
              {expanded && terminals.length > 1 && (
                <div role="group" aria-label="Filter by terminal" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
                  {[null, ...terminals.map((t) => t.key)].map((k) => (
                    <button key={k ?? 'all'} type="button" aria-pressed={terminal === k} onClick={() => { setTerminal(k); setFocusId(null) }}
                      className={cx('press min-h-11 shrink-0 rounded-full px-4 text-sub font-semibold', terminal === k ? 'btn-coral' : 'bg-ink-tint text-ink')}>
                      {k ? terminals.find((t) => t.key === k)!.short : 'All terminals'}</button>))}
                </div>)}
              {expanded && (
                <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Venues">
                  {shown.map((a) => (
                    <li key={a.id} className="shrink-0">
                      <button type="button" onClick={() => setFocusId(a.id)} className={cx('press flex w-[13.5rem] items-center gap-2.5 rounded-control p-2 text-left', planned.includes(a.id) ? 'bg-accent/20 ring-1 ring-accent/60' : 'bg-ink-tint')}>
                        <span className="ph relative size-12 shrink-0 overflow-hidden rounded-xl"><Photo img={a.image} w={48} h={48} className="absolute inset-0 size-full" /></span>
                        <span className="min-w-0"><span className="block truncate text-sub font-semibold">{a.name}</span>
                          <span className="block text-cap text-muted-text">{fmtDur(a.durationMin)}{planned.includes(a.id) ? (ready ? ' · added' : ' · selected') : ''}</span></span>
                      </button>
                    </li>))}
                  {!shown.length && <li className="py-3 text-sub text-muted-text">No venues match these filters.</li>}
                </ul>)}
              <div className={cx('mt-3 grid gap-2', ready && canRoute && planned.length > 0 && 'grid-cols-[minmax(0,1fr)_auto]')}>
                {ready
                  ? <Button className="w-full" onClick={() => go({ name: 'builder' })}>Build itinerary ({planned.length})</Button>
                  : <Button className="w-full" onClick={() => startTrip()}>{planned.length ? `Set layover times (${planned.length})` : 'Set my layover times'}</Button>}
                {ready && canRoute && planned.length > 0 && <Button variant="secondary" icon={Navigation} aria-label="How to get there" className="px-4" onClick={() => { setRouteFor('plan'); setLeg(0); setExpanded(false) }}>Route</Button>}
              </div>
            </div>
          )}
        </div>
      </section>
      <ActivitySheet a={acts.find((a) => a.id === details) ?? null} onClose={() => setDetails(null)} />
    </div>
  )
}

/** "Terminal 3 transit area" → "T3 transit", "Jewel (public area)" → "Jewel". */
const shortPlace = (p: string) => p.replace(/^Terminal (\d)/, 'T$1').replace(/ area$/, '').replace(/ \(public\)$/, '').replace(/\s*\(public area\)/, '')

function RouteSheet({ route, leg, onLeg, onClose, expanded, onExpand, airportName, forPlan, onPlan }:
  { route: RouteView; leg: number | null; onLeg: (i: number | null) => void; onClose: () => void; expanded: boolean; onExpand: () => void; airportName: string; forPlan: boolean; onPlan: () => void }) {
  const sel = leg !== null ? route.legs[leg] : null
  const needsTerminals = route.stops[0].location === null || route.stops[route.stops.length - 1].location === null
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClose} aria-label="Back to the map" className="press grid size-11 shrink-0 place-items-center rounded-full bg-ink-tint"><ArrowLeft size={19} /></button>
        <div className="min-w-0 flex-1">
          <h2 className="text-card font-semibold leading-tight">How to get there</h2>
          <p className="truncate text-cap text-muted-text">{forPlan ? `Your itinerary · ${route.stops.length - 2} stops` : route.stops[1]?.label}</p>
        </div>
        {sel && <div className="flex gap-1">
          <button type="button" disabled={leg === 0} onClick={() => onLeg(Math.max(0, (leg ?? 0) - 1))} aria-label="Previous step" className="press grid size-11 place-items-center rounded-full bg-ink-tint disabled:opacity-35"><ChevronUp size={19} /></button>
          <button type="button" disabled={leg === route.legs.length - 1} onClick={() => onLeg(Math.min(route.legs.length - 1, (leg ?? 0) + 1))} aria-label="Next step" className="press grid size-11 place-items-center rounded-full bg-ink-tint disabled:opacity-35"><ChevronDown size={19} /></button>
        </div>}
      </div>
      {sel && !expanded && (
        <div className="mt-2" aria-live="polite">
          <p className="text-cap font-semibold text-muted-text">Step {sel.i + 1} of {route.legs.length}</p>
          <p className="truncate text-sub font-semibold">{sel.from.label}{sel.from.place ? ` (${shortPlace(sel.from.place)})` : ''} → {sel.to.label}{sel.to.place ? ` (${shortPlace(sel.to.place)})` : ''}</p>
          <LegRow l={sel} on compact onSelect={() => undefined} />
          <Button variant="tertiary" size="sm" className="mt-1 w-full" onClick={onExpand}>All steps</Button>
        </div>)}
      {expanded && (
        <ol className="mt-3 grid gap-1" aria-label="Steps">
          {route.legs.map((l) => (
            <li key={l.i}>
              <StopRow n={l.from.n} last={route.stops.length - 1} label={l.from.label} place={l.from.place} onMap={!!l.from.mapKey} />
              <LegRow l={l} on={leg === l.i} onSelect={() => onLeg(leg === l.i ? null : l.i)} />
              {l.i === route.legs.length - 1 && <StopRow n={l.to.n} last={route.stops.length - 1} label={l.to.label} place={l.to.place} onMap={!!l.to.mapKey} />}
            </li>))}
        </ol>)}
      {expanded && needsTerminals && (
        <div className="mt-3 rounded-control bg-ink-tint p-3 text-sub">
          <p>Choose your arrival and departure terminals to get directions from your gate and back.</p>
          {forPlan && <Button variant="secondary" size="sm" className="mt-2" onClick={onPlan}>Choose terminals</Button>}
        </div>)}
      {expanded && (
        <p className="mt-3 text-cap text-muted-text">
          {route.legs.some((l) => l.geometry) ? 'Lines show documented paths only.' : `No route lines are drawn: SkyStop has no verified walking-path or floor data for ${airportName}.`} Minutes come from the airport's published transfer guidance or are labelled estimates; checkpoint queues are not included. Follow airport signs.</p>)}
    </div>
  )
}

function StopRow({ n, last, label, place, onMap }: { n: number; last: number; label: string; place: string | null; onMap: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span aria-hidden="true" className="btn-coral grid size-7 shrink-0 place-items-center rounded-full text-cap font-bold">{n === 0 ? 'A' : n === last ? 'D' : n}</span>
      <div className="min-w-0">
        <p className="truncate text-sub font-semibold">{label}</p>
        <p className="truncate text-cap text-muted-text">{place ?? 'Terminal not set'}{place && !onMap ? ' · not on the map (no published position)' : ''}</p>
      </div>
    </div>
  )
}

function LegRow({ l, on, compact, onSelect }: { l: Leg; on: boolean; compact?: boolean; onSelect: () => void }) {
  const s = STATUS[l.status]
  const Icon = MODE_ICON[l.modes[0]] ?? Footprints
  const mins = l.minutes ? (l.minutes.min === l.minutes.max ? `${l.minutes.max} min` : `${l.minutes.min}–${l.minutes.max} min`) : null
  return (
    <button type="button" onClick={onSelect} aria-pressed={on}
      className={cx('press ml-3 flex w-[calc(100%-0.75rem)] gap-3 border-l-2 border-dashed py-2 pl-5 pr-2 text-left', on ? 'rounded-r-control border-accent bg-accent/10' : 'border-ink/20')}>
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-ink-tint"><Icon size={17} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sub font-semibold">{l.status === 'unavailable' ? 'Directions unavailable' : [...new Set(l.modes.map((m) => MODE_LABEL[m] ?? m))].join(', ')}</span>
          {mins && <span className="text-sub tabular-nums text-muted-text">{mins}</span>}
          <span className={cx('rounded-full px-2 py-0.5 text-micro font-semibold', s.cls)} title={s.hint}>{s.label}</span>
        </span>
        {l.checkpoints.map((c) => <span key={c} className="mt-1 flex items-start gap-1.5 text-cap text-[#f6a04d]"><ShieldAlert size={14} className="mt-px shrink-0" aria-hidden="true" />{c}</span>)}
        {on && !compact && l.notes.map((n) => <span key={n} className="mt-1 block text-cap text-muted-text">{n}</span>)}
        {on && !compact && l.sources.length > 0 && <span className="mt-1 block text-cap text-muted-text">Source: {l.sources.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-accent-dark underline underline-offset-2">{new URL(u).hostname.replace(/^www\./, '')}</a>)}</span>}
      </span>
    </button>
  )
}
