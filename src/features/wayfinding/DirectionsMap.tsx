// Directions: how do I get from here to there? One leg only: its origin and destination markers, one prominent line,
// the time (the planner's transfer time where the airport publishes one, else the walking estimate), distance and a few
// plain steps. No venue discovery and no Add: Back returns to the map it came from (Explore or the route).
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Footprints, Maximize, ShieldAlert } from 'lucide-react'
import { useApp } from '../../store'
import { ACTIVITIES, getAirport } from '../../data/mock'
import { MODE_LABEL } from '../../data/itinerary'
import { Button, cx } from '../../components/ui'
import type { RouteLayer } from '../../components/AirportMap'
import { MapButton, MapShell, ModeBar } from './MapShell'
import { directionsToVenue, planRoute } from './views'
import { peekEntryState } from './entryState'
import { fmtDist, legTime, MODE_ICON, shortPlace, STATUS, stopBadge, stopName } from './format'

const CHECK = /immigration|security|check in|check-in/i

export function DirectionsMap({ code, leg: legParam, venue, branch }: { code: string; leg?: number; venue?: string; branch?: string }) {
  const { draft, back, prevRoute } = useApp()
  const ap = getAirport(code)
  const [expanded, setExpanded] = useState(() => window.innerHeight >= 760)
  const [refit, setRefit] = useState(0)
  const a = venue ? ACTIVITIES.find((x) => x.id === venue) ?? null : null
  const target = a ? directionsToVenue(code, draft, a, branch ?? null) : (() => { const r = planRoute(code, draft); return r ? { route: r, leg: legParam ?? 0, inPlan: true } : null })()
  // Stepping through the itinerary's legs stays in this screen (Back still returns to the route).
  const [legIdx, setLegIdx] = useState(target?.leg ?? 0)
  const route = target?.route ?? null
  const l = route?.legs[Math.min(legIdx, (route?.legs.length ?? 1) - 1)] ?? null
  const fromPlan = prevRoute?.name === 'airport' && prevRoute.map === 'plan'
  const prevView = prevRoute?.name === 'airport' && !prevRoute.map ? peekEntryState<{ view?: string }>(prevRoute)?.view ?? prevRoute.view : null
  const backLabel = fromPlan ? 'Back to route' : prevView === 'map' ? 'Back to map' : prevView === 'list' ? 'Back to activities' : 'Back'

  const layer: RouteLayer | null = l?.geometry ? {
    style: 'directions',
    legs: [{ i: l.i, path: l.geometry }],
    stops: [l.from, l.to].filter((s) => s.point).map((s, k) => ({ n: s.n, kind: s.kind, label: stopName(s), point: s.point!, role: k === 0 ? 'origin' as const : 'dest' as const })),
    frame: l.geometry,
  } : null

  if (!route || !l) return (
    <MapShell airport={code} sheetLabel="Directions" expanded onExpanded={() => {}} top={<ModeBar title="Directions" sub={ap.name} onBack={back} backLabel={backLabel} />}>
      <p className="py-3 text-center text-sub text-muted-text">Nothing to show directions for.</p>
    </MapShell>)

  const s = STATUS[l.status]
  const Icon = MODE_ICON[l.modes.find((m) => m !== 'walk') ?? 'walk'] ?? Footprints
  // Folded (short phones): the time, the border and security steps and the actions; unfolded: every step.
  const steps = expanded ? l.steps : l.steps.filter((t) => CHECK.test(t))
  const extra = l.checkpoints.filter((c) => !(CHECK.test(c) && l.steps.some((t) => CHECK.test(t))))
  const planLegs = target!.inPlan ? route.legs.length : 0
  const legName = `${stopBadge(l.from)} ${stopName(l.from)} → ${stopBadge(l.to)} ${stopName(l.to)}`

  return (
    <MapShell airport={code} sheetLabel="Directions" expanded={expanded} onExpanded={setExpanded} route={layer} refit={refit}
      top={<ModeBar title={`To ${stopName(l.to)}`} sub={planLegs ? `Leg ${l.i + 1} of ${planLegs} · ${legName}` : `From ${stopName(l.from)}${l.from.place ? ` · ${shortPlace(l.from.place)}` : ''}`} onBack={back} backLabel={backLabel} />}
      controls={<MapButton label="Fit this route" onClick={() => setRefit((n) => n + 1)}><Maximize size={19} /></MapButton>}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ea5139] text-cap font-bold text-white">{stopBadge(l.from)}</span>
        <span aria-hidden="true" className="h-0.5 w-4 shrink-0 rounded bg-accent-dark/60" />
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-cap font-bold text-[#c23b24] ring-2 ring-[#ea5139]">{stopBadge(l.to)}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-card font-bold leading-tight">To {stopName(l.to)}{l.to.place ? ` · ${shortPlace(l.to.place)}` : ''}</h2>
          <p className="truncate text-cap text-muted-text">From {stopName(l.from)}{l.from.place ? ` · ${shortPlace(l.from.place)}` : ''}</p>
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
      {steps.length > 0 && <ol className="mt-3 grid gap-2" aria-label="Steps">
        {steps.map((t, k) => (
          <li key={k} className="flex gap-3 text-sub">
            <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-tint text-micro font-bold text-accent-dark">{k + 1}</span>
            <span className={cx('pt-0.5', CHECK.test(t) && 'font-medium text-warning')}>{t}</span>
          </li>))}
      </ol>}
      {!expanded && l.steps.length > steps.length && <button type="button" onClick={() => setExpanded(true)} className="mt-1 min-h-11 text-sub font-semibold text-accent-dark">Show {steps.length ? 'all ' : ''}{l.steps.length} steps</button>}
      <div className={cx('mt-3 grid gap-2', planLegs > 1 && 'grid-cols-[auto_minmax(0,1fr)_auto]')}>
        {planLegs > 1 && <Button variant="secondary" className="w-12 !px-0" icon={ChevronLeft} aria-label="Previous leg" disabled={l.i === 0} onClick={() => setLegIdx(l.i - 1)}><span className="sr-only">Previous leg</span></Button>}
        <Button variant="secondary" className="w-full whitespace-nowrap" onClick={back}>{fromPlan ? 'Back to route' : backLabel === 'Back to map' ? 'Back to map' : 'Done'}</Button>
        {planLegs > 1 && <Button variant="secondary" className="w-12 !px-0" icon={ChevronRight} aria-label="Next leg" disabled={l.i >= planLegs - 1} onClick={() => setLegIdx(l.i + 1)}><span className="sr-only">Next leg</span></Button>}
      </div>
    </MapShell>
  )
}
