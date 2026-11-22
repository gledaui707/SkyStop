import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Bed, Check, Landmark, Laptop, PlaneLanding, PlaneTakeoff, ShoppingBag, Utensils, type LucideIcon } from 'lucide-react'
import type { Activity, Category } from '../data/types'
import { AIRPORT_GEO } from '../data/airportGeo'
import { venueTerminalKeys } from '../data/venueLocations'
import { clusterPins } from '../features/wayfinding/pins'
import '../features/wayfinding/map.css'

export type Zone = 'all' | 'Airside' | 'Landside'

export function zoneOf(a: Activity): Exclude<Zone, 'all'> | 'confirm' {
  return a.access === 'Unverified' ? 'confirm' : a.access
}

/** Space (px) taken by floating UI over the map: markers and camera moves keep clear of it. */
export interface MapInsets { top: number; bottom: number; right: number }
export type LatLngT = [number, number]
export interface Camera { center: LatLngT; zoom: number }

/** Explore: what is available and where. Terminal pins (with venue counts) at airport scale; venue markers close up. */
export interface ExploreLayer {
  /** Venues that match the search and filters (the ones that get markers and counts). */
  shown: Activity[]
  /** Every venue of the airport (for "n of m" on the terminal pins). */
  all: Activity[]
  planned: string[]
  terminal: string | null
  onTerminal: (key: string | null) => void
  focusId: string | null
  onFocus: (id: string | null) => void
  /** Marker position per venue id (the focused venue's at its chosen location). */
  points: Record<string, LatLngT>
}
export interface RouteStop { n: number; kind: 'arrival' | 'activity' | 'departure'; label: string; point: LatLngT; role?: 'origin' | 'dest' | null }
/** Plan: every stop numbered, every leg drawn and labelled with its time. Directions: one leg, origin and destination. */
export interface RouteLayer {
  style: 'plan' | 'directions'
  legs: { i: number; path: LatLngT[]; label?: string; isReturn?: boolean }[]
  stops: RouteStop[]
  frame: LatLngT[]
  onLeg?: (i: number) => void
}

interface Props {
  airport: string
  insets: MapInsets
  explore?: ExploreLayer | null
  route?: RouteLayer | null
  /** Camera to start from (Explore restores where the traveller left it). */
  camera?: Camera | null
  onCamera?: (c: Camera) => void
  /** Increment to re-frame (whole airport in Explore, the route otherwise). */
  refit?: number
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
/** From this zoom Explore shows individual venue markers instead of terminal pins. */
export const VENUE_ZOOM = 15.75
const CAT_ICON: Record<Category, LucideIcon> = { Food: Utensils, Rest: Bed, Shopping: ShoppingBag, Sights: Landmark, Work: Laptop }
const short = (airport: string, key: string) => AIRPORT_GEO[airport]?.terminals.find((t) => t.key === key)?.short ?? key
/** Capsule width for a set of terminal keys: label plus the count badge. */
const pinWidth = (airport: string) => (keys: string[]) => {
  const label = keys.length > 2 ? `${keys.length} terminals` : keys.map((k) => short(airport, k)).join(' · ')
  return 34 + label.length * 9 + 32
}
const midpoint = (path: LatLngT[]): LatLngT => {
  const seg = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]))
  let left = seg.reduce((s, d) => s + d, 0) / 2
  for (let i = 0; i < seg.length; i++) { if (left <= seg[i]) { const t = seg[i] ? left / seg[i] : 0; return [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t] } left -= seg[i] }
  return path[Math.floor(path.length / 2)]
}

/** Real map of the airport (CARTO light) shared by the three map modes. Terminals sit at their published positions;
 *  venue spots, gate areas and route lines are illustrative (src/features/wayfinding/mock.ts). Not for navigation. */
export function AirportMap({ airport, insets, explore = null, route = null, camera = null, onCamera, refit = 0 }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const lines = useRef<L.LayerGroup | null>(null)
  const moved = useRef(!!camera) // the traveller (or a restored camera) placed the view: no automatic re-fit
  const [, setTick] = useState(0) // re-render overlays when the map moves
  const terminals = useMemo(() => AIRPORT_GEO[airport]?.terminals ?? [], [airport])
  // Padding around framed content; on a short screen (little room between the top bar and the sheet) it shrinks.
  const padding = (): L.FitBoundsOptions => {
    const h = map.current?.getSize().y ?? 800, band = h - insets.top - insets.bottom
    const pv = Math.max(10, Math.min(PAD, (band - 90) / 2))
    return { paddingTopLeft: [PAD, insets.top + pv + 24], paddingBottomRight: [insets.right + PAD, insets.bottom + pv], maxZoom: 17 }
  }
  const fitAirport = (animate: boolean) => { const m = map.current; if (m && terminals.length) m.fitBounds(L.latLngBounds(terminals.map((t) => L.latLng(t.lat, t.lng))), { ...padding(), animate }) }

  useEffect(() => {
    if (!el.current || !terminals.length) return
    const m = L.map(el.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.25 })
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(m)
    L.tileLayer(BASEMAP.url, { attribution: BASEMAP.attribution, maxZoom: 19 }).addTo(m)
    lines.current = L.layerGroup().addTo(m)
    m.invalidateSize()
    map.current = m
    if (camera) m.setView(camera.center, camera.zoom, { animate: false })
    else fitAirport(false)
    const tick = () => setTick((n) => n + 1)
    m.on('move zoom resize', tick)
    m.on('dragstart', () => { moved.current = true })
    m.on('moveend', () => { const c = m.getCenter(); onCameraRef.current?.({ center: [c.lat, c.lng], zoom: m.getZoom() }) })
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(el.current)
    tick()
    return () => { ro.disconnect(); m.remove(); map.current = null; lines.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminals])
  const onCameraRef = useRef(onCamera)
  onCameraRef.current = onCamera

  // Explore: re-fit the whole airport when the floating UI changes size, until the traveller moves the map.
  useEffect(() => {
    if (explore && !moved.current && !explore.terminal) fitAirport(!reduced())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insets.bottom, insets.top])
  // Explicit re-frame (Show the whole airport / Fit route).
  useEffect(() => {
    if (!refit) return
    if (route) frameRoute(); else { moved.current = false; fitAirport(!reduced()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refit])

  // Explore: a selected terminal, or a focused venue, moves to the middle of the visible part of the map.
  const toVisibleMiddle = (lat: number, lng: number, minZoom: number) => {
    const m = map.current
    if (!m) return
    const z = Math.max(m.getZoom(), minZoom)
    const h = m.getSize().y, visibleMid = (insets.top + (h - insets.bottom)) / 2
    const c = m.project([lat, lng], z).subtract([0, visibleMid - h / 2])
    m.flyTo(m.unproject(c, z), z, { animate: !reduced(), duration: 0.6 })
  }
  // A chosen terminal: frame its venues (their markers) in the visible band.
  useEffect(() => {
    const t = terminals.find((x) => x.key === explore?.terminal), m = map.current
    if (!t || !m || !explore) return
    moved.current = true
    // Venue markers drawn in this terminal (a chain's marker may sit in another terminal: those are left out).
    const near = (p: LatLngT) => m.distance(p, [t.lat, t.lng]) < 400
    const pts = explore.shown.map((a) => explore.points[a.id]).filter((p): p is LatLngT => !!p && near(p))
    const b = L.latLngBounds([...pts, [t.lat, t.lng] as LatLngT])
    const z = Math.min(17.5, Math.max(VENUE_ZOOM + 0.5, m.getBoundsZoom(b, false, L.point(2 * PAD + insets.right, insets.top + insets.bottom + 2 * PAD))))
    const c = b.getCenter(), h = m.getSize().y, visibleMid = (insets.top + (h - insets.bottom)) / 2
    m.flyTo(m.unproject(m.project(c, z).subtract([0, visibleMid - h / 2]), z), z, { animate: !reduced(), duration: 0.6 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explore?.terminal, terminals, insets.bottom])
  const focusPt = explore?.focusId ? explore.points[explore.focusId] : null
  const focusSig = focusPt ? focusPt.join(',') : ''
  useEffect(() => {
    if (!focusPt || !map.current) return
    const p = map.current.latLngToContainerPoint(focusPt), sz = map.current.getSize()
    // Only move when the marker is hidden under the controls or the sheet (a tap on a visible marker keeps the view).
    if (p.y < insets.top + 24 || p.y > sz.y - insets.bottom - 24 || p.x < 24 || p.x > sz.x - 24 || map.current.getZoom() < VENUE_ZOOM) { moved.current = true; toVisibleMiddle(focusPt[0], focusPt[1], 17) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSig, insets.bottom])

  // Route modes: lines as map layers (they pan and zoom with the map); markers and labels are overlays below.
  const routeSig = JSON.stringify(route ? [route.style, route.legs.map((l) => [l.i, l.isReturn, l.path.length, l.path[0], l.path[l.path.length - 1]])] : null)
  useEffect(() => {
    const g = lines.current
    if (!g) return
    g.clearLayers()
    if (!route) return
    // Schematic terminal zones under the route (not floor plans), so the line reads as a diagram.
    for (const t of terminals) {
      L.circle([t.lat, t.lng], { radius: 230, color: '#ea5139', weight: 1, opacity: route.style === 'plan' ? 0.25 : 0.35, dashArray: '4 6', fillColor: '#ea5139', fillOpacity: 0.04, interactive: false, className: 'route-zone' }).addTo(g)
    }
    for (const l of route.legs) {
      const w = route.style === 'directions' ? 7 : 6
      L.polyline(l.path, { color: '#fff', weight: w + 5, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false, className: 'route-casing' }).addTo(g)
      L.polyline(l.path, { color: route.style === 'plan' && l.isReturn ? '#b8442f' : '#ea5139', weight: w, opacity: 1, dashArray: route.style === 'plan' && l.isReturn ? '1 11' : undefined, lineCap: 'round', lineJoin: 'round', interactive: false, className: 'route-line' }).addTo(g)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSig])
  const frameRoute = () => {
    const m = map.current, pts = route?.frame
    if (!m || !pts?.length) return
    m.flyToBounds(L.latLngBounds(pts), { ...padding(), maxZoom: route?.style === 'directions' ? 17.5 : 17, animate: !reduced(), duration: 0.6 })
  }
  const frameSig = JSON.stringify(route?.frame ?? null)
  useEffect(() => { frameRoute() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [frameSig, insets.bottom])

  const m = map.current
  const zoom = m?.getZoom() ?? 0
  const xy = (p: LatLngT) => m!.latLngToContainerPoint(p)
  const size = m?.getSize()
  // Overlays are drawn only in the visible band (between the top bar and the sheet, inside the map's width).
  const visibleY = (y: number, x = 0) => y - 24 >= insets.top && (!size || (y <= size.y - insets.bottom + 8 && x >= -40 && x <= size.x + 40))
  const terminalPins = !m ? [] : terminals.map((t) => { const p = xy([t.lat, t.lng]); return { key: t.key, x: p.x, y: p.y, w: pinWidth(airport)([t.key]) } })
  const terminalClusters = clusterPins(terminalPins, pinWidth(airport)).filter((c) => c.y - 48 >= insets.top && visibleY(c.y, c.x))
  const quietLabels = terminalClusters.map((c) => (
    <span key={c.keys.join('+')} aria-hidden="true" className="map-glass pointer-events-none absolute z-[8] -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-micro font-semibold opacity-80"
      style={{ left: c.x, top: c.y }}>{c.keys.length > 2 ? `${c.keys.length} terminals` : c.keys.map((k) => short(airport, k)).join(' · ')}</span>))

  let overlay: React.ReactNode = null
  if (m && explore && zoom < VENUE_ZOOM) {
    // Airport scale: one pin per terminal with how many venues match; tapping selects that terminal (and zooms in).
    const venuesIn = (keys: string[]) => explore.all.filter((a) => venueTerminalKeys(a).some((k) => keys.includes(k)))
    overlay = terminalClusters.map((c) => {
      const list = venuesIn(c.keys), shown = list.filter((a) => explore.shown.includes(a))
      const inPlan = list.filter((a) => explore.planned.includes(a.id)).length
      const single = c.keys.length === 1
      const label = c.keys.length > 2 ? `${c.keys.length} terminals` : c.keys.map((k) => short(airport, k)).join(' · ')
      const names = c.keys.map((k) => terminals.find((t) => t.key === k)?.name ?? k).join(' and ')
      const state = single && explore.terminal === c.keys[0] ? 'selected' : list.length > 0 && shown.length === 0 ? 'muted' : undefined
      return (
        <div key={c.keys.join('+')}>
          <span className="map-dot" style={{ left: c.x, top: c.y }} />
          <button type="button" data-state={state} style={{ left: c.x, top: c.y, minWidth: c.w }}
            onClick={(e) => { e.stopPropagation(); if (single) explore.onTerminal(c.keys[0]); else zoomTo(c.keys) }}
            aria-pressed={single ? explore.terminal === c.keys[0] : undefined}
            aria-label={`${names}: ${shown.length} of ${list.length} venues${inPlan ? `, ${inPlan} in your itinerary` : ''}${single ? '' : '. Zoom in'}`}
            className="map-pin map-glass text-sub">
            <span className="whitespace-nowrap">{label}</span>
            <span className="count">{shown.length}</span>
            {inPlan > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-[#ea5139] text-white ring-2 ring-white"><Check size={12} strokeWidth={3.5} /></span>}
          </button>
        </div>
      )
    })
  } else if (m && explore) {
    // Close up: a marker per venue (category icon; filled coral with a check when it is in the itinerary). Markers that
    // would overlap merge into a count; the focused venue always stands alone, with its name.
    const W = 40
    const items = explore.shown.filter((a) => explore.points[a.id] && a.id !== explore.focusId).map((a) => { const p = xy(explore.points[a.id]); return { key: a.id, x: p.x, y: p.y, w: W } })
    const clusters = clusterPins(items, () => W, 4).filter((c) => visibleY(c.y, c.x))
    const focus = explore.focusId ? explore.all.find((a) => a.id === explore.focusId) : null
    const fp = focus && explore.points[focus.id] ? xy(explore.points[focus.id]) : null
    overlay = (<>
      {quietLabels}
      {clusters.map((c) => {
        if (c.keys.length > 1) {
          const inPlan = c.keys.filter((k) => explore.planned.includes(k)).length
          return (
            <button key={c.keys.join('+')} type="button" className="vm vm--cluster map-glass" style={{ left: c.x, top: c.y }}
              aria-label={`${c.keys.length} venues here${inPlan ? `, ${inPlan} in your itinerary` : ''}. Zoom in`}
              onClick={(e) => { e.stopPropagation(); zoomToPoints(c.keys.map((k) => explore.points[k]), () => explore.onFocus(c.keys[0])) }}>
              {c.keys.length}{inPlan > 0 && <span className="vm-check"><Check size={10} strokeWidth={3.5} /></span>}
            </button>)
        }
        const a = explore.all.find((x) => x.id === c.keys[0])!
        const on = explore.planned.includes(a.id)
        const Icon = CAT_ICON[a.category] ?? Landmark
        return (
          <button key={a.id} type="button" data-state={on ? 'selected' : undefined} className={cx2('vm', !on && 'map-glass')} style={{ left: c.x, top: c.y }}
            aria-label={`${a.name}, ${a.category}${on ? ', in your itinerary' : ''}`} aria-pressed={false}
            onClick={(e) => { e.stopPropagation(); explore.onFocus(a.id) }}>
            <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
            {on && <span className="vm-check"><Check size={10} strokeWidth={3.5} /></span>}
          </button>)
      })}
      {focus && fp && (
        <button type="button" data-state="focused" className={cx2('vm vm--focus', explore.planned.includes(focus.id) && 'vm--in')} style={{ left: fp.x, top: fp.y }}
          aria-label={`${focus.name}, selected on the map`} aria-pressed onClick={(e) => e.stopPropagation()}>
          {(() => { const Icon = CAT_ICON[focus.category] ?? Landmark; return <Icon size={19} strokeWidth={2.2} aria-hidden="true" /> })()}
          <span className="vm-name">{focus.name}</span>
        </button>)}
    </>)
  } else if (m && route) {
    const last = route.stops.reduce((n, s) => Math.max(n, s.n), 0)
    // Stops that would sit on top of each other (two venues in one terminal) are nudged apart around their point, and
    // leg times are only labelled where the chip has room, so numbers and times never cover one another.
    const placed: { x: number; y: number }[] = []
    const stopPos = route.stops.map((st) => {
      const p0 = xy(st.point)
      let p = { x: p0.x, y: p0.y }
      for (let k = 0; k < 12 && placed.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 30); k++) {
        const ang = (k % 8) * (Math.PI / 4), r = k < 8 ? 30 : 56
        p = { x: p0.x + Math.cos(ang) * r, y: p0.y + Math.sin(ang) * r }
      }
      placed.push(p)
      return p
    })
    const boxes = stopPos.map((p) => ({ l: p.x - 17, r: p.x + 17, t: p.y - 17, b: p.y + 17 }))
    const hit = (b: { l: number; r: number; t: number; b: number }) => boxes.some((o) => b.l < o.r && o.l < b.r && b.t < o.b && o.t < b.b)
    overlay = (<>
      {route.style === 'directions' && quietLabels}
      {route.style === 'plan' && route.legs.map((l) => {
        if (!l.label || l.path.length < 2) return null
        const p = xy(midpoint(l.path))
        const w = l.label.length * 7.5 + 20, box = { l: p.x - w / 2, r: p.x + w / 2, t: p.y - 15, b: p.y + 15 }
        if (!visibleY(p.y, p.x) || hit(box)) return null
        boxes.push(box)
        return (
          <button key={`leg${l.i}`} type="button" className="leg-chip map-glass" style={{ left: p.x, top: p.y }}
            aria-label={`Leg ${l.i + 1}: ${l.label}. Show directions`} onClick={(e) => { e.stopPropagation(); route.onLeg?.(l.i) }}>{l.label}</button>)
      })}
      {route.stops.map((st, k) => {
        const p = stopPos[k]
        if (!visibleY(p.y, p.x)) return null
        const text = st.kind === 'arrival' ? 'A' : st.kind === 'departure' ? 'D' : String(st.n)
        if (route.style === 'directions') {
          if (st.role === 'dest') return (
            <span key={st.n} className="wf-dest" style={{ left: p.x, top: p.y }} aria-label={`Destination: ${st.label}`} role="img">
              <span className="wf-name">{st.label}</span><span className="wf-pin"><span>{text}</span></span></span>)
          return <span key={st.n} className="wf-stop wf-stop--origin" style={{ left: p.x, top: p.y }} aria-label={`Start: ${st.label}`} role="img">{text}</span>
        }
        const Icon = st.kind === 'arrival' ? PlaneLanding : st.kind === 'departure' ? PlaneTakeoff : null
        return (
          <span key={st.n} role="img" aria-label={st.kind === 'activity' ? `Stop ${st.n}: ${st.label}` : st.kind === 'arrival' ? `Start: ${st.label}` : `End: ${st.label}`}
            className={cx2('rs', Icon ? 'rs--end' : 'rs--num', st.n === last && 'rs--last')} style={{ left: p.x, top: p.y }}>
            {Icon ? <Icon size={15} strokeWidth={2.4} aria-hidden="true" /> : text}
          </span>)
      })}
    </>)
  }

  function zoomTo(keys: string[]) {
    const pts = terminals.filter((t) => keys.includes(t.key)).map((t) => [t.lat, t.lng] as LatLngT)
    zoomToPoints(pts, () => explore?.onTerminal(keys[0]))
  }
  function zoomToPoints(pts: LatLngT[], atMax: () => void) {
    if (!m || !pts.length) return
    moved.current = true
    if (m.getZoom() >= 18.5) { atMax(); return } // cannot separate them further: pick the first
    m.flyToBounds(L.latLngBounds(pts), { ...padding(), maxZoom: 19, animate: !reduced(), duration: 0.6 })
  }

  return (
    <div className="wayfinding-map absolute inset-0 overflow-hidden bg-[#f2f1ef]" data-map-mode={route ? route.style : 'explore'} style={{ ['--map-bottom' as string]: `${insets.bottom}px` }}
      onClick={() => { if (!explore) return; if (explore.focusId) explore.onFocus(null); else explore.onTerminal(null) }}>
      <div ref={el} className="absolute inset-0 z-0" aria-label={`Map of ${airport} airport`} role="region" />
      {overlay}
    </div>
  )
}
const cx2 = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
