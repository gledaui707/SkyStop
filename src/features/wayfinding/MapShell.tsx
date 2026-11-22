// The frame every map mode shares: the airport map, a top bar, floating map buttons and one bottom sheet. It measures
// the floating UI so the map keeps markers and camera moves in the visible band between them. Modes (Explore, Plan,
// Directions) bring their own top bar, sheet content, buttons and map layers.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AirportMap, type Camera, type ExploreLayer, type RouteLayer } from '../../components/AirportMap'
import { cx } from '../../components/ui'

interface Props {
  airport: string
  /** Absolutely positioned top bar (back, title, filters). */
  top: ReactNode
  sheetLabel: string
  children: ReactNode
  /** Round map buttons, stacked above the sheet on the right. */
  controls?: ReactNode
  explore?: ExploreLayer | null
  route?: RouteLayer | null
  camera?: Camera | null
  onCamera?: (c: Camera) => void
  refit?: number
  expanded: boolean
  onExpanded: (v: boolean) => void
  /** Extra layers (dialogs) rendered on top. */
  after?: ReactNode
}

export function MapShell({ airport, top, sheetLabel, children, controls, explore, route, camera, onCamera, refit, expanded, onExpanded, after }: Props) {
  const root = useRef<HTMLDivElement>(null), sheet = useRef<HTMLElement>(null), topEl = useRef<HTMLDivElement>(null)
  const [sheetH, setSheetH] = useState(240), [topH, setTopH] = useState(120), [navH, setNavH] = useState(88), [winH, setWinH] = useState(800)
  useLayoutEffect(() => {
    // --nav-h is a calc() (tab bar + safe area, or only the safe area on focused screens): measure it in place.
    const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--nav-h)'
    root.current?.appendChild(probe); setNavH(probe.offsetHeight); probe.remove()
    const measure = () => { setSheetH(sheet.current?.offsetHeight ?? 0); setTopH((topEl.current?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0); setWinH(window.innerHeight) }
    const ro = new ResizeObserver(measure)
    if (sheet.current) ro.observe(sheet.current)
    const bar = topEl.current?.firstElementChild
    if (bar) ro.observe(bar)
    measure()
    return () => ro.disconnect()
  }, [])
  const bottom = sheetH + navH + 12
  // The map buttons need ~100 px between the top bar and the sheet; with the sheet fully open there may be none.
  const room = winH - bottom - topH >= 100

  return (
    <div ref={root} className="relative -mb-[var(--nav-h)] h-dvh overflow-hidden">
      <AirportMap airport={airport} insets={{ top: topH, bottom, right: 64 }} explore={explore} route={route} camera={camera} onCamera={onCamera} refit={refit} />
      <div ref={topEl}>{top}</div>
      {controls && (
        <div className={cx('absolute right-3 z-20 grid gap-2 transition-[bottom] duration-300 motion-reduce:transition-none', !room && 'invisible')} style={{ bottom }}>{controls}</div>)}
      <section ref={sheet} aria-label={sheetLabel}
        className="glass-medium absolute inset-x-3 z-30 mx-auto flex max-h-[min(62dvh,34rem)] max-w-[456px] flex-col overflow-hidden rounded-tray"
        style={{ bottom: 'calc(var(--nav-h) + 0.5rem)' }}>
        <button type="button" onClick={() => onExpanded(!expanded)} aria-expanded={expanded} aria-label={expanded ? 'Collapse sheet' : 'Expand sheet'}
          className="grid h-6 shrink-0 place-items-center"><span className="h-1 w-9 rounded-full bg-ink/25" /></button>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-3">{children}</div>
      </section>
      {after}
    </div>
  )
}

/** Round glass map button. */
export const MapButton = ({ label, onClick, children, on }: { label: string; onClick: () => void; children: ReactNode; on?: boolean }) => (
  <button type="button" onClick={onClick} aria-label={label} className={cx('map-glass press grid size-11 place-items-center rounded-full', on && '!bg-[#ea5139] !text-white')}>{children}</button>
)

/** Top bar of the route modes: back, the mode's title and one line of context. */
export function ModeBar({ title, sub, onBack, backLabel }: { title: string; sub?: string; onBack: () => void; backLabel: string }) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 px-3 pt-[calc(var(--safe-top)+0.5rem)]">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={backLabel}
          className="glass-dark press grid size-11 shrink-0 place-items-center rounded-full text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div className="glass-dark min-w-0 flex-1 rounded-full px-4 py-1.5 text-white">
          <h1 className="truncate text-body font-bold leading-tight">{title}</h1>
          {sub && <p className="truncate text-cap text-white/80">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
