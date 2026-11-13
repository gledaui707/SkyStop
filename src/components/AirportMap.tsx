import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Check, PlaneLanding, PlaneTakeoff } from 'lucide-react'
import type { Activity, Category } from '../data/types'
import { AIRPORT_GEO, terminalKeysOf } from '../data/airportGeo'
import { clusterPins } from '../features/wayfinding/pins'
import '../features/wayfinding/map.css'

export type Zone = 'all' | 'Airside' | 'Landside'

export function zoneOf(a: Activity): Exclude<Zone, 'all'> | 'confirm' {
  return a.access === 'Unverified' ? 'confirm' : a.access
}

/** Space (px) taken by floating UI over the map: pins and camera moves keep clear of it. */
export interface MapInsets { top: number; bottom: number; right: number }
/** A route line to draw: ONLY documented path geometry (see features/wayfinding/route.ts PATH_GEOMETRY). */
export interface MapPath { key: string; points: [number, number][]; active: boolean }

interface Props {
  airport: string
  activities: Activity[]
  planned: string[]
  terminal: string | null
  onTerminal: (key: string | null) => void
  cat: 'All' | Category
  zone: Zone
  insets: MapInsets
  /** Itinerary stop numbers per terminal pin ({ T3: [0, 2] }); 0 is the arrival, the highest is the departure. */
  stops?: Record<string, number[]>
  lastStop?: number
  /** The selected route leg's ends. */
  highlight?: { from: string | null; to: string | null }
  paths?: MapPath[]
  /** Terminal pins the camera should frame (the selected leg's ends, or all stops of a route). */
  focusKeys?: string[]
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
// Basemap: CARTO's light style (OpenStreetMap data) when a CARTO key is configured at build time (VITE_CARTO_KEY, set
// in Vercel, not in git); otherwise OpenStreetMap's own tiles, which need no key. Attribution is shown either way.
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY as string | undefined
const OSM = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
const BASEMAP = CARTO_KEY
  ? { url: `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`, attribution: `${OSM} © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>` }
  : { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: OSM }

const PAD = 48
const short = (airport: string, key: string) => AIRPORT_GEO[airport]?.terminals.find((t) => t.key === key)?.short ?? key
/** Capsule width for a set of terminal keys: label plus the count badge. */
const pinWidth = (airport: string) => (keys: string[]) => {
  const label = keys.length > 2 ? `${keys.length} terminals` : keys.map((k) => short(airport, k)).join(' · ')
  return 34 + label.length * 9 + 32
}

/** Real map of the airport (CARTO light). One pin per terminal at its published position, showing how many venues
 *  match the filters; pins that would overlap merge into a cluster (tap to zoom in). Venues are NOT pinned
 *  individually and no indoor floors are shown: the sources give a venue's terminal, not its indoor position. Route
 *  lines are drawn only from documented path geometry (`paths`). Not for navigation. */
export function AirportMap({ airport, activities, planned, terminal, onTerminal, cat, zone, insets, stops = {}, lastStop = -1, highlight, paths = [], focusKeys = [] }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const lines = useRef<L.LayerGroup | null>(null)
  const [, setTick] = useState(0) // re-render pins when the map moves
  const terminals = useMemo(() => AIRPORT_GEO[airport]?.terminals ?? [], [airport])
  const matches = (a: Activity) => (cat === 'All' || a.category === cat) && (zone === 'all' || zoneOf(a) === zone)
  const padding = (): L.FitBoundsOptions => ({ paddingTopLeft: [PAD, insets.top + PAD + 48], paddingBottomRight: [insets.right + PAD, insets.bottom + PAD], maxZoom: 17 })

  useEffect(() => {
    if (!el.current || !terminals.length) return
    // Attribution bottom left: the map buttons sit bottom right.
    const m = L.map(el.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.25 })
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(m)
    L.tileLayer(BASEMAP.url, { attribution: BASEMAP.attribution, maxZoom: 19 }).addTo(m)
    lines.current = L.layerGroup().addTo(m)
    m.invalidateSize()
    m.fitBounds(L.latLngBounds(terminals.map((t) => L.latLng(t.lat, t.lng))), padding())
    const tick = () => setTick((n) => n + 1)
    m.on('move zoom resize', tick)
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(el.current)
    map.current = m; tick()
    return () => { ro.disconnect(); m.remove(); map.current = null; lines.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminals])

  // Re-fit when the floating UI changes size (sheet opened or closed), so every pin stays in the visible area.
  useEffect(() => {
    const m = map.current
    if (m && terminals.length && !terminal) m.fitBounds(L.latLngBounds(terminals.map((t) => L.latLng(t.lat, t.lng))), { ...padding(), animate: !reduced() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insets.bottom, insets.top])

  // A selected terminal moves to the middle of the visible part of the map.
  useEffect(() => {
    const t = terminals.find((x) => x.key === terminal), m = map.current
    if (!t || !m) return
    const z = Math.max(m.getZoom(), 16)
    const h = m.getSize().y, visibleMid = (insets.top + (h - insets.bottom)) / 2
    const c = m.project([t.lat, t.lng], z).subtract([0, visibleMid - h / 2])
    m.flyTo(m.unproject(c, z), z, { animate: !reduced(), duration: 0.6 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminal, terminals])

  // Frame the pins that matter (a route leg's ends): both stay in the visible band between the controls and the sheet.
  const focusSig = focusKeys.join('|')
  useEffect(() => {
    const m = map.current
    const pts = terminals.filter((t) => focusKeys.includes(t.key)).map((t) => L.latLng(t.lat, t.lng))
    if (!m || !pts.length) return
    m.flyToBounds(L.latLngBounds(pts), { ...padding(), maxZoom: 16.5, animate: !reduced(), duration: 0.6 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSig, terminals, insets.bottom])

  // Documented route geometry only: a white casing under a coral line; the active leg is solid, others faint.
  useEffect(() => {
    const g = lines.current
    if (!g) return
    g.clearLayers()
    for (const p of paths) {
      L.polyline(p.points, { color: '#fff', weight: 10, opacity: 0.9, interactive: false }).addTo(g)
      L.polyline(p.points, { color: '#ea5139', weight: 6, opacity: p.active ? 1 : 0.35, interactive: false }).addTo(g)
    }
  }, [paths])

  const m = map.current
  const pins = !m ? [] : terminals.map((t) => { const p = m.latLngToContainerPoint([t.lat, t.lng]); return { key: t.key, x: p.x, y: p.y, w: pinWidth(airport)([t.key]) } })
  // Pins whose capsule would sit under the top controls are not drawn (pan or zoom to see them): a pin under
  // translucent chips is unreadable and looks like part of the controls.
  const clusters = clusterPins(pins, pinWidth(airport)).filter((c) => c.y - 48 >= insets.top)
  const venuesIn = (keys: string[]) => activities.filter((a) => terminalKeysOf(airport, a.terminal).some((k) => keys.includes(k)))

  const zoomTo = (keys: string[]) => {
    const pts = terminals.filter((t) => keys.includes(t.key)).map((t) => L.latLng(t.lat, t.lng))
    if (!m || !pts.length) return
    const before = m.getZoom()
    m.flyToBounds(L.latLngBounds(pts), { ...padding(), maxZoom: 19, animate: !reduced(), duration: 0.6 })
    if (before >= 18.5) onTerminal(keys[0]) // cannot separate them further: select the first
  }

  return (
    <div className="wayfinding-map absolute inset-0 overflow-hidden bg-[#f2f1ef]" style={{ ['--map-bottom' as string]: `${insets.bottom}px` }} onClick={() => onTerminal(null)}>
      <div ref={el} className="absolute inset-0 z-0" aria-label={`Map of ${airport} airport`} role="region" />
      {clusters.map((c) => {
        const list = venuesIn(c.keys), shown = list.filter(matches)
        const inPlan = list.filter((a) => planned.includes(a.id)).length
        const nums = c.keys.flatMap((k) => stops[k] ?? []).sort((a, b) => a - b)
        const single = c.keys.length === 1
        const label = c.keys.length > 2 ? `${c.keys.length} terminals` : c.keys.map((k) => short(airport, k)).join(' · ')
        const names = c.keys.map((k) => terminals.find((t) => t.key === k)?.name ?? k).join(' and ')
        const state = highlight?.to && c.keys.includes(highlight.to) ? 'to'
          : highlight?.from && c.keys.includes(highlight.from) ? 'from'
          : single && terminal === c.keys[0] ? 'selected'
          : list.length > 0 && shown.length === 0 ? 'muted' : undefined
        return (
          <div key={c.keys.join('+')}>
            <span className="map-dot" style={{ left: c.x, top: c.y }} />
            <button type="button" data-state={state} style={{ left: c.x, top: c.y, minWidth: c.w }}
              onClick={(e) => { e.stopPropagation(); if (single) onTerminal(c.keys[0]); else zoomTo(c.keys) }}
              aria-pressed={single ? terminal === c.keys[0] : undefined}
              aria-label={`${names}: ${shown.length} of ${list.length} venues${inPlan ? `, ${inPlan} in your itinerary` : ''}${nums.length ? `, itinerary stops ${nums.map((n) => (n === 0 ? 'arrival' : n === lastStop ? 'departure' : n)).join(', ')}` : ''}${single ? '' : '. Zoom in'}`}
              className="map-pin map-glass text-sub">
              <span className="whitespace-nowrap">{label}</span>
              <span className="count">{shown.length}</span>
              {inPlan > 0 && !nums.length && <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-[#1d7f45] text-white ring-2 ring-white"><Check size={12} strokeWidth={3.5} /></span>}
              {nums.length > 0 && (
                <span className="map-stops" aria-hidden="true">
                  {nums.map((n) => <span key={n}>{n === 0 ? <PlaneLanding size={12} strokeWidth={2.6} /> : n === lastStop ? <PlaneTakeoff size={12} strokeWidth={2.6} /> : n}</span>)}
                </span>)}
            </button>
          </div>
        )
      })}
    </div>
  )
}
