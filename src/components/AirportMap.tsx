import { Bed, Check, Laptop, ShoppingBag, TramFront, Utensils, type LucideIcon } from 'lucide-react'
import type { Activity, Category } from '../data/types'
import { cx } from './ui'

export type Zone = 'all' | 'Airside' | 'Landside'

const ICONS: Record<Category, LucideIcon> = { Food: Utensils, Rest: Bed, Shopping: ShoppingBag, Work: Laptop, City: TramFront }

/** Data space is 0-100. The floating controls (back, Map/List, category chips) take a fixed band at the top, so the
 *  markers use only the space below it. A percentage band (as in the Figma export) slid markers under the chips on
 *  short phone screens, where they could not be tapped. */
export const MAP_TOP_REM = 10.75
const Y = (y: number) => `calc(${MAP_TOP_REM}rem + (100% - ${MAP_TOP_REM}rem) * ${y / 100})`
const H = (h: number) => `calc((100% - ${MAP_TOP_REM}rem) * ${h / 100})`

const ZONES = [
  { key: 'Airside', label: 'Airside zone', top: 8, h: 42, cls: 'border-accent/50 bg-white/[0.07]' },
  { key: 'confirm', label: 'Zone to be confirmed', top: 53, h: 24, cls: 'border-dashed border-white/35 bg-white/[0.03]' },
  { key: 'Landside', label: 'Landside zone', top: 80, h: 16, cls: 'border-white/20 bg-white/[0.05]' },
] as const

export function zoneOf(a: Activity): Exclude<Zone, 'all'> | 'confirm' {
  return a.access === 'Unverified' ? 'confirm' : a.access
}

interface Props {
  activities: Activity[]
  planned: string[]
  focusId: string | null
  onFocus: (id: string | null) => void
  cat: 'All' | Category
  zone: Zone
}

/** Explicitly illustrative schematic: no real gates, routes or terminal coordinates. */
export function AirportMap({ activities, planned, focusId, onFocus, cat, zone }: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1f2022]" onClick={() => onFocus(null)}
      style={{ backgroundImage: 'radial-gradient(120% 70% at 50% 30%, #4a3a36 0%, #2b2a2b 55%, #1f2022 100%), linear-gradient(rgb(255 255 255/.035) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255/.035) 1px, transparent 1px)', backgroundSize: 'auto, 32px 32px, 32px 32px' }}>
      {ZONES.map((z) => {
        const dim = zone !== 'all' && z.key !== zone
        return (
          <div key={z.key} aria-hidden="true" className={cx('absolute inset-x-4 rounded-[1.75rem] border transition-opacity', z.cls, dim && 'opacity-25')}
            style={{ top: Y(z.top), height: H(z.h) }}>
            <span className="absolute left-4 top-2 text-cap font-semibold uppercase tracking-wider text-white/60">{z.label}</span>
          </div>
        )
      })}
      {activities.map((a) => {
        const Icon = ICONS[a.category]
        const inPlan = planned.includes(a.id)
        const focused = focusId === a.id
        const z = zoneOf(a)
        const dim = (cat !== 'All' && a.category !== cat) || (zone !== 'all' && z !== zone)
        return (
          <button key={a.id} disabled={dim}
            onClick={(e) => { e.stopPropagation(); onFocus(focused ? null : a.id) }}
            aria-pressed={focused}
            aria-label={`${a.name}, ${a.category}, ${inPlan ? 'in your itinerary' : 'not added'}`}
            style={{ left: `${a.map.x}%`, top: Y(a.map.y) }}
            className="absolute z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center">
            <span className={cx('relative grid size-11 place-items-center rounded-full border-2 shadow-lg transition-all',
              inPlan ? 'border-white bg-accent text-white' : 'border-white/90 bg-white text-deep',
              focused && 'scale-125 ring-4 ring-accent/70', dim && 'opacity-25')}>
              <Icon size={20} />
              {inPlan && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-success text-white"><Check size={12} strokeWidth={3.5} /></span>}
            </span>
            <span className={cx('glass-dark pointer-events-none absolute left-1/2 top-[3rem] max-w-[8.5rem] -translate-x-1/2 truncate whitespace-nowrap rounded-full px-2.5 py-0.5 text-cap font-medium', dim && 'opacity-25')}>{a.name}</span>
          </button>
        )
      })}
    </div>
  )
}
