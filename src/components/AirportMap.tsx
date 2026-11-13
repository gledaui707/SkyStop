import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Bed, Check, Landmark, Laptop, ShoppingBag, Utensils, type LucideIcon } from 'lucide-react'
import type { Activity, Category } from '../data/types'
import { AIRPORT_GEO, terminalKeysOf } from '../data/airportGeo'
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
  focusId: string | null
  onFocus: (id: string | null) => void
  cat: 'All' | Category
  zone: Zone
}

const ICONS: Record<Category, LucideIcon> = { Food: Utensils, Rest: Bed, Shopping: ShoppingBag, Work: Laptop, Sights: Landmark }
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
/** Flies so that the point lands in the middle of the VISIBLE map (below the controls, above the sheet). */
function flyToVisible(m: L.Map, lat: number, lng: number, zoom: number, dx = 0) {
  const r = rem(), h = m.getSize().y
  const visibleMid = (MAP_TOP_REM * r + (h - MAP_BOTTOM_REM * r)) / 2
  const c = m.project([lat, lng], zoom).subtract([dx, visibleMid - h / 2])
  m.flyTo(m.unproject(c, zoom), zoom, { animate: !reduced(), duration: 0.6 })
}

const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
// Basemap: CARTO Voyager (OpenStreetMap data) when a CARTO key is configured at build time (VITE_CARTO_KEY, set in
// Vercel, not in git); otherwise OpenStreetMap's own tiles, which need no key. Attribution is shown either way.
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY as string | undefined
const OSM = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
const BASEMAP = CARTO_KEY
  ? { url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`, subdomains: '', attribution: `${OSM} © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>` }
  : { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains: '', attribution: OSM }

/** Real map of the airport. Zoomed out: one bubble per terminal at its published position, with its venue count.
 *  Zoomed in (or after tapping a terminal): one pin per venue at an APPROXIMATE spot inside its terminal (sources give
 *  the terminal, not the exact spot); venues with several locations get a pin in each terminal. Not for navigation. */
export function AirportMap({ airport, activities, planned, terminal, onTerminal, focusId, onFocus, cat, zone }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [, setTick] = useState(0) // re-render pins when the map moves
  const terminals = useMemo(() => AIRPORT_GEO[airport]?.terminals ?? [], [airport])
  const matches = (a: Activity) => (cat === 'All' || a.category === cat) && (zone === 'all' || zoneOf(a) === zone)

  useEffect(() => {
    if (!el.current || !terminals.length) return
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, zoomSnap: 0.25 })
    L.tileLayer(BASEMAP.url, { attribution: BASEMAP.attribution, maxZoom: 19 }).addTo(m)
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
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(el.current)
    map.current = m; tick()
    return () => { ro.disconnect(); m.remove(); map.current = null }
  }, [terminals])

  // Tapping a terminal centres it in the visible part of the map.
  useEffect(() => {
    const t = terminals.find((x) => x.key === terminal), m = map.current
    if (t && m) flyToVisible(m, t.lat, t.lng, m.getZoom())
  }, [terminal, terminals])

  const m = map.current, width = el.current?.clientWidth ?? 0
  const pt = (lat: number, lng: number) => m!.latLngToContainerPoint([lat, lng])
  // One pin per terminal at its published position. Venues are NOT pinned individually: the sources give a venue's
  // terminal, not its indoor position, and SkyStop does not infer indoor coordinates.
  const items: Item[] = !m ? [] : terminals.map((t) => ({ key: 't-' + t.key, p: pt(t.lat, t.lng), w: 44 + t.short.length * 9, h: 40, kind: 'terminal' as const, t }))
  const height = el.current?.clientHeight ?? 0
  const r0 = typeof document === 'undefined' ? 16 : rem()
  // Keep pins inside the visible band and clear of the map buttons (top right, under the chips).
  const area = { top: MAP_TOP_REM * r0, bottom: height - MAP_BOTTOM_REM * r0 - 8, avoid: [{ x: width - 68, y: 11.25 * r0, w: 68, h: 7 * r0 }] }
  const pinned = m ? placePins(items.filter((it) => it.p.x > -200 && it.p.x < width + 200 && it.p.y > -200 && it.p.y < height + 200), width, area) : []

  const placed = pinned
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#eef0ee]" onClick={() => (focusId ? onFocus(null) : onTerminal(null))}>
      <div ref={el} className="absolute inset-0 z-0" aria-label={`Map of ${airport} airport`} role="region" />
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] size-full overflow-visible">
        {placed.map(({ key, p, box }) => {
          const on = terminal === key.slice(2)
          const anchorY = box.y + box.h / 2
          return (
            <g key={key}>
              <line x1={p.x} y1={p.y} x2={box.x + box.w / 2} y2={anchorY} stroke="#231a17" strokeOpacity="0.5" strokeWidth="1.5" />
              <circle cx={p.x} cy={p.y} r={5} fill={on ? '#ea5139' : '#231a17'} stroke="white" strokeWidth="1.5" />
            </g>)
        })}
      </svg>
      {placed.map((it) => {
        const { key, box } = it
        if (it.kind === 'tlabel') return (
          <span key={key} aria-hidden="true" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            className="pointer-events-none absolute z-[6] grid place-items-center rounded-full bg-white/80 text-cap font-bold text-deep/70 ring-1 ring-deep/10">{it.t!.name}</span>)
        const t = it.t!
        const list = activities.filter((a) => terminalKeysOf(airport, a.terminal).includes(t.key))
        const shown = list.filter(matches)
        const inPlan = list.filter((a) => planned.includes(a.id)).length
        const selected = terminal === t.key
        const empty = list.length === 0
        return (
          <button key={key} type="button" disabled={empty}
            onClick={(e) => { e.stopPropagation(); onTerminal(t.key) }}
            aria-pressed={selected}
            aria-label={`${t.name}: ${empty ? 'no listed venues' : `${shown.length} of ${list.length} venues`}${inPlan ? `, ${inPlan} in your itinerary` : ''}`}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            className={cx('absolute z-10 flex items-center justify-center gap-1.5 rounded-full border-2 shadow-lg transition-colors',
              empty ? 'border-white bg-white/90 text-[#6b5f59]' : selected ? 'border-white bg-accent text-white' : 'border-white bg-deep text-white',
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

interface Item { key: string; p: { x: number; y: number }; w: number; h: number; kind: 'terminal' | 'tlabel'; t?: (typeof AIRPORT_GEO)[string]['terminals'][number] }
interface Box { x: number; y: number; w: number; h: number }
const hit = (a: Box, b: Box, gap = 6) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
/** Places each item near its true point without overlapping the others (or another item's dot). Venue pins try to
 *  sit exactly on their point first; labels try above, below, right, left, then diagonals at growing distances.
 *  Deterministic. Items that cannot be placed fall back to sitting above their point. */
export function placePins<T extends { p: { x: number; y: number }; w: number; h: number; kind?: string }>(items: T[], width: number, area?: { top: number; bottom: number; avoid: Box[] }) {
  const out: (T & { box: Box })[] = []
  const dots = items.map(({ p }) => ({ x: p.x - 5, y: p.y - 5, w: 10, h: 10 }))
  for (const it of [...items].sort((a, b) => (a.kind === 'tlabel' ? 1 : 0) - (b.kind === 'tlabel' ? 1 : 0) || a.p.y - b.p.y || a.p.x - b.p.x)) {
    const { p, w, h } = it
    const ok = (c: Box) => c.x >= 4 && c.x + w <= width - 4 && (!area || (c.y >= area.top && c.y + h <= area.bottom && !area.avoid.some((a) => hit(a, c, 0)))) && !out.some((o) => hit(o.box, c)) && !dots.some((d) => (d.x !== p.x - 5 || d.y !== p.y - 5) && hit(d, c, 2))
    let box: Box | null = null
    for (const d of [14, 40, 70, 100, 140]) {
      if (box) break
      for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1]]) {
        const c = { x: Math.round(p.x + dx * (d + w / 2) - w / 2), y: Math.round(p.y + dy * (d + h / 2) - h / 2), w, h }
        if (ok(c)) { box = c; break }
      }
    }
    if (!box && it.kind === 'tlabel') continue // a terminal name is optional when space runs out
    if (!box && area && (p.y < area.top || p.y > area.bottom)) continue // off the visible band: pan to see it
    out.push({ ...it, box: box ?? { x: Math.round(p.x - w / 2), y: Math.round(p.y - 14 - h), w, h } })
  }
  return out
}
