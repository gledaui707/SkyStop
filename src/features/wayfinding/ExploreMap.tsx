// Explore: what can I do here, and where is it? Venue markers (terminal pins at airport scale), a compact venue preview
// with Add / Remove and Details, and Build itinerary. No route is drawn: directions are a separate mode.
import { useState, type ReactNode } from 'react'
import { Check, Layers, LocateFixed, MapPin, Navigation, Plus } from 'lucide-react'
import { useApp } from '../../store'
import { getAirport } from '../../data/mock'
import { AIRPORT_GEO } from '../../data/airportGeo'
import { venueLocations, venueTerminalKeys } from '../../data/venueLocations'
import { fmtDur } from '../../data/time'
import { zoneOf, type Camera, type ExploreLayer, type Zone } from '../../components/AirportMap'
import { ActivitySheet, Button, Photo, cx } from '../../components/ui'
import type { Activity } from '../../data/types'
import { MapButton, MapShell } from './MapShell'
import { defaultLoc, venueMarkerPoint } from './views'
import { shortArea } from './format'

const ZONES: Zone[] = ['all', 'Airside', 'Landside']

/** Explore state kept per visit (returning from Directions restores it). */
export interface ExploreUi { zone: Zone; terminal: string | null; focusId: string | null; branch: string | null; camera: Camera | null; expanded: boolean }
export const exploreDefaults = (): ExploreUi => ({ zone: 'all', terminal: null, focusId: null, branch: null, camera: null, expanded: typeof window === 'undefined' || window.innerHeight >= 720 })

interface Props {
  code: string
  bar: ReactNode
  /** Venues matching the category and search (shared with the list). */
  acts: Activity[]
  all: Activity[]
  planned: string[]
  ready: boolean
  b: { usable: number; remaining: number; over: boolean } | null
  toggle: (id: string) => void
  startTrip: () => void
  ui: ExploreUi
  setUi: (p: Partial<ExploreUi>) => void
}

export function ExploreMap({ code, bar, acts, all, planned, ready, b, toggle, startTrip, ui, setUi }: Props) {
  const { go } = useApp()
  const ap = getAirport(code)
  const [details, setDetails] = useState<string | null>(null)
  const [refit, setRefit] = useState(0)
  const terminals = AIRPORT_GEO[code]?.terminals ?? []
  const shown = acts.filter((a) => (ui.zone === 'all' || zoneOf(a) === ui.zone) && (!ui.terminal || venueTerminalKeys(a).includes(ui.terminal)))
  const focus = all.find((a) => a.id === ui.focusId) ?? null
  const focusLocs = focus ? venueLocations(focus) : []
  const focusLoc = focus ? (ui.branch ? focusLocs.find((l) => l.id === ui.branch) : null) ?? defaultLoc(focus) : null
  const points: ExploreLayer['points'] = {}
  for (const a of all) { const p = venueMarkerPoint(code, a, a.id === ui.focusId ? ui.branch : null); if (p) points[a.id] = p }
  const setFocus = (id: string | null) => setUi({ focusId: id, branch: null })
  const directions = (a: Activity, branch: string | null) => go({ name: 'airport', code, view: 'map', map: 'directions', venue: a.id, branch: branch ?? undefined })
  const inPlan = focus ? planned.includes(focus.id) : false

  return (
    <MapShell airport={code} top={bar} sheetLabel={focus ? focus.name : `${ap.name} map`} expanded={ui.expanded} onExpanded={(v) => setUi({ expanded: v })}
      camera={ui.camera} onCamera={(c) => setUi({ camera: c })} refit={refit}
      explore={{ shown, all, planned, terminal: ui.terminal, onTerminal: (k) => setUi({ terminal: k, focusId: null, branch: null }), focusId: ui.focusId, onFocus: setFocus, points }}
      controls={<>
        <MapButton label={`Show ${ui.zone === 'all' ? 'all zones' : ui.zone + ' only'}. Tap to change.`} on={ui.zone !== 'all'} onClick={() => setUi({ zone: ZONES[(ZONES.indexOf(ui.zone) + 1) % 3] })}><Layers size={20} /></MapButton>
        <MapButton label="Show the whole airport" onClick={() => { setUi({ terminal: null, focusId: null, branch: null, zone: 'all' }); setRefit((n) => n + 1) }}><LocateFixed size={20} /></MapButton>
      </>}
      after={<ActivitySheet a={all.find((a) => a.id === details) ?? null} onClose={() => setDetails(null)} onDirections={(br) => { const a = all.find((x) => x.id === details); if (a) directions(a, br ?? null) }} />}>
      {focus ? (
        // Venue preview: what it is, where, how long; Add / Remove is the action. Directions are one tap away, not automatic.
        <div>
          <div className="flex items-center gap-3">
            <span className="ph relative size-14 shrink-0 overflow-hidden rounded-control"><Photo img={focus.image} w={56} h={56} className="absolute inset-0 size-full" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-card font-semibold leading-tight">{focus.name}</p>
              <p className="text-sub text-muted-text">{focus.category} · {fmtDur(focus.durationMin)} · {focus.costLabel}</p>
              <p className="text-cap text-muted-text">{[focusLoc ? `${focusLoc.terminalName} · ${shortArea(focusLoc.area)}` : focus.terminal, focus.access === 'Unverified' ? null : focus.access].filter(Boolean).join(' · ')}{focus.leavesAirport ? ' · leaves airport' : ''}</p>
            </div>
            <button type="button" onClick={() => setFocus(null)} aria-label="Close preview" className="press grid size-11 shrink-0 place-items-center rounded-full bg-ink-tint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </div>
          {b && !inPlan && focus.durationMin > b.remaining && (
            <p role="alert" className="mt-2 text-sub font-medium text-error">Adds {fmtDur(focus.durationMin - Math.max(b.remaining, 0))} beyond your usable time.</p>)}
          {ui.expanded && focusLocs.length > 1 && (
            <div role="group" aria-label={`${focus.name} locations`} className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
              {focusLocs.map((l) => (
                <button key={l.id} type="button" aria-pressed={focusLoc?.id === l.id} onClick={() => setUi({ branch: l.id })}
                  className={cx('press flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-cap font-semibold', focusLoc?.id === l.id ? 'pill-on' : 'bg-ink-tint text-ink')}>
                  <MapPin size={14} aria-hidden="true" />{terminals.find((t) => t.key === l.terminal)?.short ?? l.terminal} · {shortArea(l.area)}</button>))}
            </div>)}
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Button variant={inPlan ? 'secondary' : 'primary'} icon={inPlan ? Check : Plus} onClick={() => toggle(focus.id)}
              aria-label={`${inPlan ? 'Remove' : 'Add'} ${focus.name} ${inPlan ? 'from' : 'to'} your itinerary`}>
              {inPlan ? <>In<span className="max-[359px]:hidden"> your itinerary</span></> : ready ? <>Add<span className="max-[359px]:hidden"> to itinerary</span></> : 'Select'}</Button>
            <Button variant="secondary" className="px-4" onClick={() => setDetails(focus.id)}>Details</Button>
          </div>
          <button type="button" onClick={() => directions(focus, ui.branch)}
            className="press mt-1 flex min-h-11 w-full items-center justify-center gap-2 text-sub font-semibold text-accent-dark"><Navigation size={16} aria-hidden="true" />How to get there</button>
        </div>
      ) : (
        <div>
          <p className="text-card font-semibold leading-tight">{ui.terminal ? `${terminals.find((t) => t.key === ui.terminal)?.name} · ${ap.city}` : ap.name}</p>
          <p className={cx('mt-0.5 text-sub text-muted-text', !ui.expanded && 'truncate')}>
            {b ? `${fmtDur(b.usable)} usable · ${planned.length} selected · ${b.over ? 'over by ' + fmtDur(-b.remaining) : fmtDur(b.remaining) + ' left'}` : `${planned.length ? planned.length + ' selected · ' : ''}Set your layover times to check what fits.`}</p>
          {ui.expanded && terminals.length > 1 && (
            <div role="group" aria-label="Filter by terminal" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
              {[null, ...terminals.map((t) => t.key)].map((k) => (
                <button key={k ?? 'all'} type="button" aria-pressed={ui.terminal === k} onClick={() => setUi({ terminal: k, focusId: null, branch: null, ...(k && window.innerHeight < 720 ? { expanded: false } : {}) })}
                  className={cx('press min-h-11 shrink-0 rounded-full px-4 text-sub font-semibold', ui.terminal === k ? 'btn-coral' : 'bg-ink-tint text-ink')}>
                  {k ? terminals.find((t) => t.key === k)!.short : 'All terminals'}</button>))}
            </div>)}
          {ui.expanded && (
            <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Venues">
              {shown.map((a) => (
                <li key={a.id} className="shrink-0">
                  <button type="button" onClick={() => setFocus(a.id)} className={cx('press flex w-[13.5rem] items-center gap-2.5 rounded-control p-2 text-left', planned.includes(a.id) ? 'bg-accent/20 ring-1 ring-accent/60' : 'bg-ink-tint')}>
                    <span className="ph relative size-12 shrink-0 overflow-hidden rounded-xl"><Photo img={a.image} w={48} h={48} className="absolute inset-0 size-full" /></span>
                    <span className="min-w-0"><span className="block truncate text-sub font-semibold">{a.name}</span>
                      <span className="block text-cap text-muted-text">{a.category} · {fmtDur(a.durationMin)}{planned.includes(a.id) ? (ready ? ' · added' : ' · selected') : ''}</span></span>
                  </button>
                </li>))}
              {!shown.length && <li className="py-3 text-sub text-muted-text">No venues match these filters.</li>}
            </ul>)}
          <div className="mt-3">
            {ready
              ? <Button className="w-full" onClick={() => go({ name: 'builder' })}>Build itinerary ({planned.length})</Button>
              : <Button className="w-full" onClick={() => startTrip()}>{planned.length ? `Set layover times (${planned.length})` : 'Set my layover times'}</Button>}
          </div>
        </div>
      )}
    </MapShell>
  )
}
