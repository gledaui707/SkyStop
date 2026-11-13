import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Bus, Check, MapPin, ChevronDown, ChevronUp, Footprints, Layers, LocateFixed, Navigation, Plus, ShieldAlert, TrainFront, X, type LucideIcon } from 'lucide-react'
import { useApp } from '../../store'
import { GRAPHS, getAirport } from '../../data/mock'
import { AIRPORT_GEO } from '../../data/airportGeo'
import { venueLocations, venueTerminalKeys, type VenueLocation } from '../../data/venueLocations'
import { fmtDur, type budget } from '../../data/time'
import { computeItinerary, MODE_LABEL } from '../../data/itinerary'
import { planItinerary } from '../../domain/itinerary'
import { AirportMap, zoneOf, type Wayfinding, type Zone } from '../../components/AirportMap'
import { ActivitySheet, Button, Photo, cx } from '../../components/ui'
import type { Activity, Category } from '../../data/types'
import { buildRoute, mapKeyFor, type Leg, type LegStatus, type RouteView } from './route'

const ZONES: Zone[] = ['all', 'Airside', 'Landside']
const MODE_ICON: Record<string, LucideIcon> = { walk: Footprints, link_bridge_walk: Footprints, skytrain_or_walk: TrainFront, shuttle_bus: Bus }
const STATUS: Record<LegStatus, { label: string; cls: string; hint: string }> = {
  verified: { label: 'Airport transfer time', cls: 'bg-success-tint text-success', hint: 'Transfer minutes published by the airport; the line is simulated.' },
  estimate: { label: 'Estimated route', cls: 'bg-ink-tint text-muted-text', hint: 'Simulated route and walking estimate.' },
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
  /** Open with the itinerary's directions showing (from the itinerary or a saved plan). */
  openDirections?: boolean
  /** Open with directions to this venue (from its details sheet). */
  openVenue?: string
  /** …at this one of its locations (VenueLocation id). */
  openBranch?: string
}

/** Airport map with one coordinated bottom sheet: browse (terminal filter + venues), a venue preview, or directions.
 *  Floating controls sit above the sheet, the sheet sits above the tab bar; nothing overlaps. */
export function MapView({ code, bar, acts, planned, ready, b, cat, toggle, startTrip, openDirections, openVenue, openBranch }: Props) {
  const { go, draft } = useApp()
  const ap = getAirport(code)
  const graph = GRAPHS[code] ?? null
  const [zone, setZone] = useState<Zone>('all')
  const [terminal, setTerminal] = useState<string | null>(null)
  const [focusId, setFocus] = useState<string | null>(openVenue ?? null)
  // Which of the focused venue's locations; null = its listed (catalogue) location.
  const [branch, setBranch] = useState<string | null>(openBranch ?? null)
  const setFocusId = (id: string | null) => { setFocus(id); setBranch(null) }
  const startOnRoute = !!openDirections && ready && planned.length > 0
  const [routeFor, setRouteFor] = useState<'plan' | string | null>(startOnRoute ? 'plan' : null)
  const [leg, setLeg] = useState<number | null>(startOnRoute ? 0 : null)
  // Short phones start with the sheet collapsed (title + main action) so the map stays visible.
  const [expanded, setExpanded] = useState(() => !startOnRoute && (typeof window === 'undefined' || window.innerHeight >= 720))
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
  const shown = acts.filter((a) => (cat === 'All' || a.category === cat) && (zone === 'all' || zoneOf(a) === zone) && (!terminal || venueTerminalKeys(a).includes(terminal)))
  const terminals = AIRPORT_GEO[code]?.terminals ?? []

  // Directions: the whole itinerary (when layover times exist), or one venue from the arrival gate and on to departure.
  // A venue's default location is its catalogue one; another branch moves the stop to that terminal and area.
  const defaultLoc = (a: Activity): VenueLocation | null => { const l = venueLocations(a); return l.find((x) => x.listed) ?? l[0] ?? null }
  const atBranch = (a: Activity, id: string | null): { act: Activity; zone: 'airside' | 'landside' | 'unknown' } => {
    const base = a.access === 'Airside' ? 'airside' as const : a.access === 'Landside' ? 'landside' as const : 'unknown' as const
    const def = defaultLoc(a)
    const loc = id && id !== def?.id ? venueLocations(a).find((l) => l.id === id) : (def && !def.listed ? def : null)
    if (!loc) return { act: a, zone: base }
    const ids = graph?.locations.filter((l) => mapKeyFor(code, l) === loc.terminal && l.zone === loc.zone).map((l) => l.id) ?? []
    return { act: { ...a, id: loc === def ? a.id : `${a.id}#${loc.id}`, terminal: loc.terminalName, locationIds: ids }, zone: loc.zone }
  }
  const singleRoute = (a: Activity, br: string | null = null): RouteView => {
    const { act, zone: z } = atBranch(a, br)
    const itin = planItinerary({ usable: b?.usable ?? 0, graph, arrivalLocation: draft?.arrivalLocation, departureLocation: draft?.departureLocation,
      activities: [{ id: act.id, name: act.name, durationMin: act.durationMin, zone: z, locationIds: act.locationIds }] })
    return buildRoute(code, graph, itin, [act], draft?.arrivalLocation, draft?.departureLocation)
  }
  const planRoute: RouteView | null = useMemo(() => {
    if (!ready || !draft || !planned.length) return null
    const { items, itin } = computeItinerary(draft)
    return buildRoute(code, graph, itin, items, draft.arrivalLocation, draft.departureLocation)
  }, [ready, draft, planned.length, code, graph])
  const route: RouteView | null = useMemo(() => {
    if (!routeFor) return null
    if (routeFor === 'plan') return planRoute
    const a = acts.find((x) => x.id === routeFor)
    return a ? singleRoute(a, branch) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeFor, planRoute, acts, draft, b?.usable, branch])
  const sel: Leg | null = route && leg !== null ? route.legs[leg] ?? null : null
  // Selecting a venue previews its route: the leg arriving at it in the itinerary, else from the arrival gate.
  const focusPlanLeg = focusId && planRoute && !branch ? planRoute.legs.find((l) => l.to.kind === 'activity' && draft?.activityIds[l.to.n - 1] === focusId) ?? null : null
  const preview: Leg | null = useMemo(() => {
    if (route || !focusId) return null
    if (focusPlanLeg) return focusPlanLeg
    const a = acts.find((x) => x.id === focusId)
    return a ? singleRoute(a, branch).legs[0] ?? null : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, focusId, focusPlanLeg, acts, draft, branch])
  const wayfinding: Wayfinding | null = route ? {
    legs: route.legs.filter((l) => l.geometry).map((l) => ({ i: l.i, path: l.geometry!, active: sel ? l.i === sel.i : true })),
    stops: route.stops.filter((st) => st.point).map((st) => ({ n: st.n, kind: st.kind, label: st.label, point: st.point!,
      role: sel ? (st.n === sel.to.n ? 'dest' as const : st.n === sel.from.n ? 'origin' as const : null) : null })),
    frame: sel?.geometry ?? route.stops.flatMap((st) => (st.point ? [st.point] : [])),
  } : preview?.geometry ? {
    legs: [{ i: 0, path: preview.geometry, active: true }],
    stops: [preview.from, preview.to].filter((st) => st.point).map((st, k) => ({ n: st.n, kind: st.kind, label: st.label, point: st.point!, role: k === 0 ? 'origin' as const : 'dest' as const })),
    frame: preview.geometry,
  } : null
  const openRouteFor = (a: Activity, br: string | null = branch) => {
    if (focusPlanLeg && !br) { setRouteFor('plan'); setLeg(focusPlanLeg.i) } else { setRouteFor(a.id); setLeg(0) }
    setExpanded(false)
  }
  // Arriving from a venue's details: open its directions once.
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current || !openVenue) return
    opened.current = true
    const a = acts.find((x) => x.id === openVenue)
    if (a) openRouteFor(a, openBranch ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openVenue])

  const closeRoute = () => { setRouteFor(null); setLeg(null); setExpanded(window.innerHeight >= 720) }
  const canRoute = true
  const mode = route ? 'route' : focus ? 'venue' : 'browse'
  const focusLocs = focus ? venueLocations(focus) : []
  const focusLoc = focus ? (branch ? focusLocs.find((l) => l.id === branch) : null) ?? defaultLoc(focus) : null

  return (
    <div className="relative -mb-[var(--nav-h)] h-dvh overflow-hidden">
      <AirportMap airport={code} activities={acts} planned={planned} terminal={terminal}
        onTerminal={(k) => { setTerminal(k); setFocusId(null); if (k) setExpanded(true) }} cat={cat} zone={zone}
        insets={{ top: topH, bottom: bottomInset, right: 64 }} wayfinding={wayfinding} />
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
            <RouteSheet route={route} leg={leg ?? 0} onLeg={setLeg} onClose={closeRoute} expanded={expanded} onExpand={() => setExpanded(true)}
              forPlan={routeFor === 'plan'} onPlan={() => go({ name: 'builder' })} />
          ) : mode === 'venue' && focus ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="ph relative size-14 shrink-0 overflow-hidden rounded-control"><Photo img={focus.image} w={56} h={56} className="absolute inset-0 size-full" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-card font-semibold leading-tight">{focus.name}</p>
                  <p className="text-sub text-muted-text">{fmtDur(focus.durationMin)} · {focus.costLabel} · {focus.category}</p>
                  <p className="text-cap text-muted-text">{[focusLocs.length > 1 ? null : focusLoc ? `${focusLoc.terminalName} · ${focusLoc.area}` : focus.terminal, focus.access === 'Unverified' ? null : focus.access].filter(Boolean).join(' · ')}{focus.leavesAirport ? ' · leaves airport' : ''}</p>
                </div>
                <button type="button" onClick={() => setFocusId(null)} aria-label="Close preview" className="press grid size-11 shrink-0 place-items-center rounded-full bg-ink-tint"><X size={18} /></button>
              </div>
              {expanded && b && !planned.includes(focus.id) && focus.durationMin > b.remaining && (
                <p role="alert" className="mt-2 text-sub font-medium text-error">Adds {fmtDur(focus.durationMin - Math.max(b.remaining, 0))} beyond your usable time.</p>)}
              {focusLocs.length > 1 && (
                <div role="group" aria-label={`${focus.name} locations`} className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
                  {focusLocs.map((l) => (
                    <button key={l.id} type="button" aria-pressed={focusLoc?.id === l.id} onClick={() => setBranch(l.id)}
                      className={cx('press flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-cap font-semibold', focusLoc?.id === l.id ? 'bg-ink text-white' : 'bg-ink-tint text-ink')}>
                      <MapPin size={14} aria-hidden="true" />{terminals.find((t) => t.key === l.terminal)?.short ?? l.terminal} · {shortArea(l.area)}</button>))}
                </div>)}
              {preview && (
                <p className="mt-3 flex items-center gap-2 text-sub">
                  <Footprints size={17} className="shrink-0 text-accent-dark" aria-hidden="true" />
                  <span><b className="font-semibold">{legTime(preview)}</b> · {fmtDist(preview.distanceM)} from {preview.from.label}{preview.from.place ? ` (${shortPlace(preview.from.place)})` : ''}</span>
                </p>)}
              {/* One primary: Add when it is not in the plan yet, otherwise How to get there. */}
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
                <Button className="px-4" variant={planned.includes(focus.id) ? 'secondary' : 'primary'} icon={planned.includes(focus.id) ? Check : Plus} onClick={() => toggle(focus.id)}>
                  {planned.includes(focus.id) ? (ready ? 'Added' : 'Selected') : ready ? 'Add' : 'Select'}</Button>
                <Button className="px-4" variant={planned.includes(focus.id) ? 'primary' : 'secondary'} icon={Navigation} onClick={() => openRouteFor(focus)}>How to get there</Button>
                <Button variant="tertiary" size="sm" className="col-span-full" onClick={() => setDetails(focus.id)}>Details</Button>
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
                {ready && canRoute && planned.length > 0 && <Button variant="secondary" icon={Navigation} aria-label="How to get there" className="px-4" onClick={() => { setRouteFor('plan'); setLeg(0); setExpanded(false) }}>Directions</Button>}
              </div>
            </div>
          )}
        </div>
      </section>
      <ActivitySheet a={acts.find((a) => a.id === details) ?? null} onClose={() => setDetails(null)}
        onDirections={(br) => { const a = acts.find((x) => x.id === details); if (a) { setFocus(a.id); setBranch(br ?? null); openRouteFor(a, br ?? null) } }} />
    </div>
  )
}

/** "Terminal 3 transit area" → "T3 transit", "Jewel (public area)" → "Jewel". */
const shortPlace = (p: string) => p.replace(/^Terminal (\d)/, 'T$1').replace(/ area$/, '').replace(/\s*\(public area\)/, '')
/** "Departures – after security" → "After security", "A gates – Transit" → "A gates". */
const shortArea = (a: string) => a.replace(/ – (Transit|Departures)$/, '').replace(/^Departures – (.)/, (_, c: string) => c.toUpperCase())
const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`)
const legTime = (l: Leg) => (l.minutes && l.minutes.min !== l.minutes.max ? `${l.minutes.min}–${l.minutes.max} min` : `${l.minutes?.max ?? l.walkMin} min`)
const stopBadge = (n: number, last: number) => (n === 0 ? 'A' : n === last ? 'D' : String(n))

/** Directions for one leg at a time, like a maps app: destination, time and distance, numbered steps, next stop. */
const CHECK = /immigration|security|check in|check-in/i

function RouteSheet({ route, leg, onLeg, onClose, expanded, onExpand, forPlan, onPlan }:
  { route: RouteView; leg: number; onLeg: (i: number) => void; onClose: () => void; expanded: boolean; onExpand: () => void; forPlan: boolean; onPlan: () => void }) {
  const l = route.legs[leg]
  if (!l) return null
  const last = route.stops.length - 1
  const next = route.legs[leg + 1]
  const s = STATUS[l.status]
  const Icon = MODE_ICON[l.modes.find((m) => m !== 'walk') ?? 'walk'] ?? Footprints
  // Collapsed: the first two steps plus every border / security step, which always stays visible.
  const steps = expanded ? l.steps : l.steps.filter((t, k) => k < 2 || CHECK.test(t))
  const extra = l.checkpoints.filter((c) => !(CHECK.test(c) && l.steps.some((t) => CHECK.test(t))))
  const needsTerminals = forPlan && (route.stops[0].location === null || route.stops[last].location === null) && route.routing
  return (
    <div>
      <div className="flex items-start gap-2">
        <button type="button" onClick={onClose} aria-label="Back to the map" className="press grid size-11 shrink-0 place-items-center rounded-full bg-ink-tint"><ArrowLeft size={19} /></button>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-cap font-semibold text-muted-text">Step {leg + 1} of {route.legs.length}</p>
          <h2 className="truncate text-card font-bold leading-tight">To {l.to.label}{l.to.place ? ` · ${shortPlace(l.to.place)}` : ''}</h2>
          <p className="truncate text-cap text-muted-text">From {l.from.label}{l.from.place ? ` · ${shortPlace(l.from.place)}` : ''}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" disabled={leg === 0} onClick={() => onLeg(leg - 1)} aria-label="Previous step" className="press grid size-11 place-items-center rounded-full bg-ink-tint disabled:opacity-35"><ChevronUp size={19} /></button>
          <button type="button" disabled={!next} onClick={() => onLeg(leg + 1)} aria-label="Next step" className="press grid size-11 place-items-center rounded-full bg-ink-tint disabled:opacity-35"><ChevronDown size={19} /></button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-control bg-ink-tint px-3 py-2.5" aria-live="polite">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white"><Icon size={20} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-h2 font-bold leading-none tabular-nums">{legTime(l)}</span>
            <span className={cx('rounded-full px-2 py-0.5 text-micro font-semibold', s.cls)} title={s.hint}>{s.label}</span></p>
          <p className="mt-1 text-sub text-muted-text">{fmtDist(l.distanceM)} · {l.modes.some((m) => m !== 'walk') ? [...new Set(l.modes.map((m) => MODE_LABEL[m] ?? m))].join(', ') : 'walk'}</p>
        </div>
      </div>
      {extra.map((c) => <p key={c} className="mt-2 flex items-start gap-2 text-sub font-medium text-warning"><ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{c}</p>)}
      <ol className="mt-3 grid gap-2" aria-label="Directions">
        {steps.map((t, k) => (
          <li key={k} className="flex gap-3 text-sub">
            <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-tint text-micro font-bold text-accent-dark">{k + 1}</span>
            <span className={cx('pt-0.5', CHECK.test(t) && 'font-medium text-warning')}>{t}</span>
          </li>))}
      </ol>
      {!expanded && l.steps.length > steps.length && <button type="button" onClick={onExpand} className="mt-1 min-h-11 text-sub font-semibold text-accent-dark">Show all {l.steps.length} steps</button>}
      <div className="mt-3">
        {next
          ? <Button className="w-full" onClick={() => onLeg(leg + 1)}>Next stop: {next.to.label}</Button>
          : <Button variant="secondary" className="w-full" onClick={onClose}>Done</Button>}
      </div>
      {expanded && (
        <div className="mt-4">
          <p className="text-cap font-semibold text-muted-text">All stops</p>
          <ol className="mt-2 grid gap-1">
            {route.legs.map((x) => (
              <li key={x.i}>
                <button type="button" onClick={() => onLeg(x.i)} aria-pressed={x.i === leg}
                  className={cx('press flex w-full items-center gap-3 rounded-control px-2 py-2 text-left', x.i === leg ? 'bg-accent-tint' : 'active:bg-ink-tint')}>
                  <span aria-hidden="true" className="btn-coral grid size-7 shrink-0 place-items-center rounded-full text-cap font-bold">{stopBadge(x.to.n, last)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sub font-semibold">{x.to.label}</span>
                    <span className="block truncate text-cap text-muted-text">{legTime(x)} · {fmtDist(x.distanceM)}{x.to.place ? ` · ${shortPlace(x.to.place)}` : ''}</span></span>
                </button>
              </li>))}
          </ol>
        </div>)}
      {expanded && needsTerminals && (
        <div className="mt-3 rounded-control bg-ink-tint p-3 text-sub">
          <p>Choose your arrival and departure terminals for directions from your gate and back.</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={onPlan}>Choose terminals</Button>
        </div>)}
    </div>
  )
}
