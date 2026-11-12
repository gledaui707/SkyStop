import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Check } from 'lucide-react'
import type { Activity, Category } from '../data/types'
import { AIRPORT_GEO, terminalKeyOf, type TerminalPoint } from '../data/airportGeo'
import { cx } from './ui'

export type Zone = 'all' | 'Airside' | 'Landside'

/** The floating controls (back, Map/List, category chips) take a fixed band at the top; pins are kept below it. */
export const MAP_TOP_REM = 10.75
/** Kept free at the bottom for the overlapping bottom sheet. */
export const MAP_BOTTOM_REM = 4.5

export function zoneOf(a: Activity): Exclude<Zone, 'all'> | 'confirm' {
  return a.access === 'Unverified' ? 'confirm' : a.access
}

interface Props {
  airport: string
  activities: Activity[]
  planned: string[]
  terminal: string | null
  onTerminal: (key: string | null) => void
  cat: 'All' | Category
  zone: Zone
}

const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
// Light OpenStreetMap basemap by CARTO (attribution shown on the map, as both licences require).
const TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>'

/** Real map of the airport. One pin per terminal at its published position; venues are grouped on their terminal's
 *  pin (the catalogue has no venue-level coordinates). Venues across several terminals are not pinned. */
export function AirportMap({ airport, activities, planned, terminal, onTerminal, cat, zone }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [, setTick] = useState(0) // re-render pins when the map moves
  const terminals = AIRPORT_GEO[airport]?.terminals ?? []

  const byTerminal = useMemo(() => {
    const m = new Map<string, Activity[]>()
    for (const a of activities) { const k = terminalKeyOf(airport, a.terminal); if (k) m.set(k, [...(m.get(k) ?? []), a]) }
    return m
  }, [airport, activities])

  useEffect(() => {
    if (!el.current || !terminals.length) return
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, zoomSnap: 0.25 })
    L.tileLayer(TILES, { attribution: ATTRIBUTION, subdomains: 'abcd', maxZoom: 19 }).addTo(m)
    m.attributionControl.setPrefix(false)
    const pts = terminals.map((t) => L.latLng(t.lat, t.lng))
    const r = rem()
    const fit = () => {
      m.invalidateSize()
      m.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [64, MAP_TOP_REM * r + 64], paddingBottomRight: [64, MAP_BOTTOM_REM * r + 48], maxZoom: 16 })
    }
    fit()
    const tick = () => setTick((n) => n + 1)
    m.on('move zoom resize', tick)
    const ro = new ResizeObserver(fit); ro.observe(el.current)
    map.current = m; tick()
    return () => { ro.disconnect(); m.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airport])

  // Fly to a terminal when it is chosen (from a pin or elsewhere).
  useEffect(() => {
    const t = terminals.find((x) => x.key === terminal)
    if (t && map.current) map.current.panTo([t.lat, t.lng], { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches })
  }, [terminal, terminals])

  const placed = map.current && el.current ? placePins(terminals.map((t) => ({ t, p: map.current!.latLngToContainerPoint([t.lat, t.lng]) })), el.current.clientWidth) : []

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#eef0ee]" onClick={() => onTerminal(null)}>
      <div ref={el} className="absolute inset-0 z-0" aria-label={`Map of ${airport} airport`} role="region" />
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] size-full overflow-visible">
        {placed.map(({ t, p, box }) => (
          <g key={t.key}>
            <line x1={p.x} y1={p.y} x2={box.x + box.w / 2} y2={box.y + box.h / 2} stroke="#231a17" strokeOpacity="0.55" strokeWidth="1.5" />
            <circle cx={p.x} cy={p.y} r="5" fill={terminal === t.key ? '#ea5139' : '#231a17'} stroke="white" strokeWidth="2" />
          </g>))}
      </svg>
      {placed.map(({ t, box }) => {
        const list = byTerminal.get(t.key) ?? []
        const shown = list.filter((a) => (cat === 'All' || a.category === cat) && (zone === 'all' || zoneOf(a) === zone))
        const inPlan = list.filter((a) => planned.includes(a.id)).length
        const selected = terminal === t.key
        const empty = list.length === 0
        return (
          <button key={t.key} type="button" disabled={empty}
            onClick={(e) => { e.stopPropagation(); onTerminal(selected ? null : t.key) }}
            aria-pressed={selected}
            aria-label={`${t.name}: ${empty ? 'no listed venues' : `${shown.length} of ${list.length} venues`}${inPlan ? `, ${inPlan} in your itinerary` : ''}`}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            className={cx('absolute z-10 flex items-center justify-center gap-1.5 rounded-full border-2 shadow-lg transition-colors',
              empty ? 'border-white bg-white/90 text-muted-text' : selected ? 'border-white bg-accent text-white' : 'border-white bg-ink text-white',
              !empty && shown.length === 0 && 'opacity-40')}>
            <span className="text-sub font-bold">{t.short}</span>
            {!empty && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/20 px-1 text-cap font-semibold tabular-nums">{shown.length}</span>}
            {inPlan > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-success text-white"><Check size={12} strokeWidth={3.5} /></span>}
          </button>
        )
      })}
    </div>
  )
}

interface Box { x: number; y: number; w: number; h: number }
const PIN_H = 40
const hit = (a: Box, b: Box, gap = 6) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
/** Places each terminal label near its true position without overlapping the others (or another terminal's dot).
 *  Tries above, below, right, left, then diagonals, at growing distances. Deterministic. */
export function placePins(items: { t: TerminalPoint; p: { x: number; y: number } }[], width: number) {
  const out: { t: TerminalPoint; p: { x: number; y: number }; box: Box }[] = []
  const dots = items.map(({ p }) => ({ x: p.x - 6, y: p.y - 6, w: 12, h: 12 }))
  for (const { t, p } of [...items].sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x)) {
    const w = 44 + t.short.length * 9, h = PIN_H
    let box: Box | null = null
    for (const d of [14, 40, 70, 100]) {
      for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1]]) {
        const cx = p.x + dx * (d + w / 2), cy = p.y + dy * (d + h / 2)
        const c = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h }
        if (c.x < 4 || c.x + w > width - 4) continue
        if (out.some((o) => hit(o.box, c)) || dots.some((dot) => hit(dot, c, 2))) continue
        box = c; break
      }
      if (box) break
    }
    out.push({ t, p, box: box ?? { x: Math.round(p.x - w / 2), y: Math.round(p.y - 14 - h), w, h } })
  }
  return out
}
