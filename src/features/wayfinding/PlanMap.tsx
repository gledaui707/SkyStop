// Plan: how do my selected activities fit together? Only the itinerary's stops, numbered in order, every leg drawn and
// labelled with its time, and the same time budget as the itinerary builder. Reordering or removing a stop here edits
// the same draft, so the route, the numbers and the builder change together.
import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, Compass, Maximize, Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../../store'
import { getAirport, isSupported } from '../../data/mock'
import { fmtDur } from '../../data/time'
import { computeItinerary } from '../../data/itinerary'
import { Button, IconButton, cx } from '../../components/ui'
import type { RouteLayer } from '../../components/AirportMap'
import { MapButton, MapShell, ModeBar } from './MapShell'
import { planRoute } from './views'
import { useEntryState } from './entryState'
import { MODE_LABEL } from '../../data/itinerary'
import { legTime, shortPlace, stopBadge, STATUS } from './format'

export function PlanMap({ code }: { code: string }) {
  const { draft, setDraft, go, back, prevRoute, route: entry } = useApp()
  const ap = getAirport(code)
  // Phones start with the stops folded away so the route has the room; the handle (or Stops) unfolds them.
  // (kept per visit: coming back from a leg's directions shows the sheet as it was)
  const [{ expanded }, setUi] = useEntryState(entry, () => ({ expanded: window.innerHeight >= 900 }))
  const setExpanded = (v: boolean) => setUi({ expanded: v })
  const [editing, setEditing] = useState(false)
  const [refit, setRefit] = useState(0)
  const mine = draft && draft.airport === code ? draft : null
  const route = planRoute(code, mine)
  const calc = mine ? computeItinerary(mine) : null
  const hero = calc?.hero ?? null
  const fromBuilder = prevRoute?.name === 'builder'
  const toBuilder = () => (fromBuilder ? back() : go({ name: 'builder' }))
  const inspect = (i: number) => go({ name: 'airport', code, view: 'map', map: 'directions', leg: i })
  const move = (i: number, d: -1 | 1) => {
    if (!mine) return
    const ids = [...mine.activityIds], j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]; setDraft({ ...mine, activityIds: ids })
  }
  const remove = (i: number) => mine && setDraft({ ...mine, activityIds: mine.activityIds.filter((_, k) => k !== i) })

  const legs = route?.legs ?? []
  const counted = !!route?.routing
  const travel = legs.reduce((s, l) => s + (l.minutes?.max ?? l.walkMin), 0)
  const layer: RouteLayer | null = route ? {
    style: 'plan',
    legs: legs.filter((l) => l.geometry).map((l) => ({ i: l.i, path: l.geometry!, label: legTime(l).replace(' min', 'm'), isReturn: l.to.kind === 'departure' })),
    stops: route.stops.filter((s) => s.point).map((s) => ({ n: s.n, kind: s.kind, label: s.label, point: s.point! })),
    frame: route.stops.flatMap((s) => (s.point ? [s.point] : [])),
    onLeg: inspect,
  } : null
  const needsTerminals = !!route?.routing && (!mine?.arrivalLocation || !mine?.departureLocation)

  return (
    <MapShell airport={code} sheetLabel="Your route" expanded={expanded} onExpanded={setExpanded} route={layer} refit={refit}
      top={<ModeBar title="Your route" sub={route ? `${route.stops.length - 2} ${route.stops.length - 2 === 1 ? 'stop' : 'stops'} · ${ap.name}` : ap.name} onBack={back} backLabel={fromBuilder ? 'Back to itinerary' : 'Back'} />}
      controls={route ? <MapButton label="Fit the whole route" onClick={() => setRefit((n) => n + 1)}><Maximize size={19} /></MapButton> : undefined}>
      {!route || !hero ? (
        <div className="py-2 text-center">
          <p className="text-card font-semibold">No stops yet</p>
          <p className="mt-1 text-sub text-muted-text">Add activities to see how they connect.</p>
          {isSupported(code) && <Button className="mt-3 w-full" icon={Compass} onClick={() => go({ name: 'airport', code, view: 'map' })}>Explore activities</Button>}
        </div>
      ) : (<>
        {/* 1. the time budget (same numbers as the itinerary), 2. the stops in order with the legs between them */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-card font-bold leading-tight">Your route</h2>
            <p className="text-sub text-muted-text">{legs.length} legs · travel {counted ? fmtDur(hero.transferMin) : `about ${fmtDur(travel)}`}{counted ? '' : ' (walking estimate)'}</p>
          </div>
          <button type="button" onClick={() => { setEditing(!editing); setExpanded(true) }} aria-pressed={editing}
            className={cx('press min-h-11 shrink-0 rounded-full px-4 text-sub font-semibold', editing ? 'btn-coral' : 'bg-ink-tint text-ink')}>{editing ? 'Done' : 'Reorder'}</button>
        </div>
        <dl aria-label="Time budget" className="mt-3 grid grid-cols-4 gap-1.5 text-center">
          {([['Usable', fmtDur(hero.usable), ''], ['Activities', fmtDur(hero.activityMin), ''], ['Transfers', counted ? fmtDur(hero.transferMin) : '—', ''],
            [hero.remaining < 0 ? 'Over by' : 'Left', fmtDur(Math.abs(hero.remaining)), hero.remaining < 0 ? 'text-error' : 'text-success']] as const).map(([k, v, c]) => (
            <div key={k} className="min-w-0 rounded-control bg-ink-tint px-0.5 py-2"><dt className="text-micro text-muted-text">{k}</dt><dd className={cx('whitespace-nowrap text-sub font-bold tabular-nums max-[359px]:text-cap', c)}>{v}</dd></div>))}
        </dl>
        {!counted && <p className="mt-2 text-cap text-muted-text">Walking between stops is an estimate and isn’t counted in your time.</p>}
        {needsTerminals && (
          <p className="mt-2 flex items-center justify-between gap-2 rounded-control bg-ink-tint px-3 py-2 text-sub">Set arrival and departure terminals to time the walk from your gate and back.
            <button type="button" onClick={toBuilder} className="min-h-11 shrink-0 font-semibold text-accent-dark">Set</button></p>)}
        {!expanded && <button type="button" onClick={() => setExpanded(true)} className="mt-1 flex min-h-11 w-full items-center justify-center gap-1 text-sub font-semibold text-accent-dark">
          Stops and legs ({route.stops.length - 2} stops, {legs.length} legs)<ChevronRight size={16} className="rotate-90" aria-hidden="true" /></button>}
        {expanded && <ol aria-label="Stops and legs" className="mt-3 grid">
          {route.stops.map((s, k) => {
            const leg = legs[k]
            const ai = s.kind === 'activity' ? s.n - 1 : -1
            return (
              <li key={`${s.kind}${s.n}`}>
                <div className="flex min-h-11 items-center gap-3">
                  <span aria-hidden="true" className={cx('grid size-8 shrink-0 place-items-center rounded-full text-cap font-bold', s.kind === 'activity' ? 'btn-coral' : 'bg-[#231a17] text-white ring-1 ring-white/30')}>{stopBadge(s)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sub font-semibold">{s.kind === 'activity' ? s.label : s.kind === 'arrival' ? 'Arrival' : 'Departure'}</span>
                    <span className="block truncate text-cap text-muted-text">{[s.kind === 'activity' ? fmtDur(calc!.items[ai]?.durationMin ?? 0) : null, s.place ? shortPlace(s.place) : s.kind !== 'activity' ? 'Terminal not set' : null].filter(Boolean).join(' · ')}</span>
                  </span>
                  {editing && ai >= 0 && (
                    <span className="flex shrink-0 gap-1">
                      <IconButton label={`Move ${s.label} earlier`} icon={ArrowUp} tone="accent" size="sm" disabled={ai === 0} onClick={() => move(ai, -1)} />
                      <IconButton label={`Move ${s.label} later`} icon={ArrowDown} tone="accent" size="sm" disabled={ai === mine!.activityIds.length - 1} onClick={() => move(ai, 1)} />
                      <IconButton label={`Remove ${s.label}`} icon={Trash2} tone="danger" size="sm" iconSize={18} onClick={() => remove(ai)} />
                    </span>)}
                </div>
                {leg && (
                  // A leg: its time and mode; tap for the directions of this leg only.
                  <button type="button" onClick={() => inspect(leg.i)} aria-label={`Directions from ${stopBadge(leg.from)} to ${stopBadge(leg.to)}: ${legTime(leg)}`}
                    className="press my-0.5 ml-4 flex min-h-11 w-[calc(100%-1rem)] items-center gap-3 border-l-2 border-dashed border-accent-dark/50 py-1 pl-6 pr-1 text-left">
                    <span className="min-w-0 flex-1 text-cap">
                      <b className="text-sub font-bold tabular-nums text-accent-dark">{legTime(leg)}</b>
                      <span className="text-muted-text"> · {leg.modes.some((m) => m !== 'walk') ? [...new Set(leg.modes.map((m) => MODE_LABEL[m] ?? m))].join(', ') : 'walk'}{leg.checkpoints.length ? ' · checks' : ''}</span>
                      {leg.status === 'verified' && <span className={cx('ml-1.5 inline-block whitespace-nowrap rounded-full px-1.5 py-0.5 text-micro font-semibold', STATUS.verified.cls)}>{STATUS.verified.label}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 text-cap font-semibold text-accent-dark">Directions<ChevronRight size={15} aria-hidden="true" /></span>
                  </button>)}
              </li>)
          })}
        </ol>}
        <Button className="mt-3 w-full" icon={Pencil} onClick={toBuilder}>{fromBuilder ? 'Back to itinerary' : 'Edit itinerary'}</Button>
      </>)}
    </MapShell>
  )
}
