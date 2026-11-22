import { Fragment, type ReactNode } from 'react'
import { ArrowDown, Bed, Clock, Laptop, Landmark, Plane, ShoppingBag, Sparkles, Utensils, type LucideIcon } from 'lucide-react'
import { fmtDay, fmtDur, fmtTime } from '../data/time'
import { MODE_LABEL } from '../data/itinerary'
import type { Activity } from '../data/types'
import type { Hop } from '../domain/itinerary'
import { Photo, cx } from './ui'

export const CATEGORY_ICON: Record<string, LucideIcon> = { Food: Utensils, Rest: Bed, Shopping: ShoppingBag, Work: Laptop, Sights: Landmark }
export const categoryIcon = (c: string): LucideIcon => CATEGORY_ICON[c] ?? Sparkles

/** Photo with the category drawn faintly behind it, so a missing photo still reads as a place, not an empty box. */
export function VenuePhoto({ a, w, h, iconSize = 26, iconTop = '50%', className }: { a: Activity; w: number; h: number; iconSize?: number; iconTop?: string; className?: string }) {
  const Icon = categoryIcon(a.category)
  return (
    <span className={cx('ph overflow-hidden', className)}>
      <Icon aria-hidden="true" size={iconSize} strokeWidth={1.6} style={{ top: iconTop }} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/25" />
      <Photo img={a.image} w={w} h={h} className="absolute inset-0 size-full" />
    </span>
  )
}

export function ZoneTag({ a }: { a: Activity }) {
  const [label, cls] = a.access === 'Airside' ? ['Airside', 'bg-success-tint text-success']
    : a.access === 'Landside' ? ['Landside · Immigration required', 'bg-accent-tint text-accent-dark'] : ['Access conditions unknown', 'bg-ink-tint text-muted-text']
  return <span className={cx('mt-1.5 inline-flex max-w-full rounded-full px-2 py-0.5 text-tab font-semibold', cls)}>{label}</span>
}

/** One transfer between stops, drawn as a connector capsule on the rail: duration range, how it is made, checkpoints. */
export function HopRow({ h }: { h: Hop }) {
  const range = h.min === h.max ? fmtDur(h.max) : `${h.min}–${fmtDur(h.max)}`
  return (
    <div className="mb-3 grid justify-items-start gap-1 text-sub" aria-label={`${h.isReturn ? 'Return transfer' : 'Transfer'} to ${h.toLabel}`}>
      <div className="inline-flex max-w-full items-start gap-1.5 rounded-[0.9rem] bg-white/[0.045] px-2.5 py-1.5 ring-1 ring-white/10">
        <ArrowDown size={15} className="mt-0.5 shrink-0 text-amber" aria-hidden="true" />
        {h.kind === 'unknown' ? (
          <p className="font-semibold text-error">{h.fromLabel.includes('not set') || h.toLabel.includes('not set') ? `Choose a terminal to estimate this ${h.isReturn ? 'return ' : ''}transfer` : 'Transfer time unknown · not counted'}</p>
        ) : (
          <p className="min-w-0 text-ink"><b>{h.isReturn ? 'Return' : 'Transfer'}: {range}</b>
            <span className="text-muted-text"> · {h.kind === 'same-area' ? 'within the same area' : [...new Set(h.modes.map((m) => MODE_LABEL[m] ?? m))].join(', then ')}</span></p>
        )}
      </div>
      {h.immigration && <p className="inline-flex rounded-full bg-accent-tint px-2 py-0.5 text-tab font-semibold text-accent-dark">Immigration required</p>}
      {h.departureChecks && <p className="inline-flex rounded-full bg-accent-tint px-2 py-0.5 text-tab font-semibold text-accent-dark">Re-enter via check-in, immigration and security</p>}
      {h.throughCheck && <p className="inline-flex rounded-full bg-ink-tint px-2 py-0.5 text-tab font-semibold text-ink">Through-checked passengers only</p>}
    </div>
  )
}

/** Arrival or departure: the two fixed ends of the layover, a time stub on the rail with a glowing plane node. */
function Anchor({ kind, time, dayTag, title, note }: { kind: 'arrive' | 'depart'; time: Date; dayTag: string; title: string; note?: string }) {
  return (
    <li className={cx('relative', kind === 'arrive' ? 'pb-4' : '')}>
      <span aria-hidden="true" className="btn-coral absolute -left-[2.3rem] top-3 grid size-8 place-items-center rounded-full ring-4 ring-canvas">
        <Plane size={15} className={kind === 'arrive' ? 'rotate-45' : '-rotate-45'} /></span>
      <div className="tl-anchor flex items-center gap-3 rounded-card py-2.5 pl-3.5 pr-3">
        <p className="shrink-0 text-h2 font-bold leading-none tabular-nums">{fmtTime(time)}<span className="block pt-1 text-cap font-medium text-muted-text">{dayTag || (kind === 'arrive' ? 'Landing' : 'Take-off')}</span></p>
        <span aria-hidden="true" className="h-9 w-px shrink-0 border-l border-dashed border-white/20" />
        <div className="min-w-0">
          <p className="text-sub font-semibold leading-snug">{title}</p>
          {note && <p className="text-cap text-muted-text">{note}</p>}
        </div>
      </div>
    </li>
  )
}

/** A stop: number on the rail, photo, how long it takes, where it is, and how far into the usable time it ends. The
 *  progress line marks this stop's own slice (bright) after what came before (dim). */
function Stop({ a, i, from, used, usable, onOpen, actions }: { a: Activity; i: number; from: number; used: number; usable: number; onOpen?: () => void; actions?: ReactNode }) {
  const late = used > usable
  const pct = (m: number) => `${Math.max(0, Math.min(100, usable > 0 ? (m / usable) * 100 : 100))}%`
  const node = late ? 'bg-error text-white' : a.access === 'Landside' ? 'bg-amber text-deep' : 'btn-coral'
  const body = (
    <>
      <VenuePhoto a={a} w={88} h={96} className="relative w-[5.25rem] shrink-0 self-stretch max-[360px]:w-[4.25rem]" />
      <span className="min-w-0 flex-1 px-3 py-3">
        <span className="line-clamp-2 block text-card font-semibold leading-tight">{a.name}</span>
        <span className="mt-1 flex items-center gap-1.5 text-sub font-semibold text-ink/90"><Clock size={14} className="shrink-0 text-accent-dark" aria-hidden="true" />{fmtDur(a.durationMin)}</span>
        <span className="line-clamp-2 block text-cap text-muted-text">{a.terminal ?? 'Terminal not confirmed'}</span>
        <ZoneTag a={a} />
      </span>
    </>
  )
  return (
    <li className="anim-rise relative pb-3">
      <span aria-hidden="true" className={cx('absolute -left-[2.15rem] top-4 grid size-7 place-items-center rounded-full text-cap font-bold tabular-nums ring-4 ring-canvas', node)}>{i + 1}</span>
      <div className={cx('panel relative overflow-hidden rounded-card', late && '!border-error/50')}>
        {onOpen ? <button type="button" onClick={onOpen} className="press flex w-full min-w-0 items-stretch text-left">{body}</button>
          : <div className="flex min-w-0 items-stretch">{body}</div>}
        {/* Footer: how far into the usable time this stop ends, then the stop's actions. The strip along the bottom edge
            shows the time before this stop (dim) and this stop's own slice (bright). */}
        <div className="flex min-h-11 items-center justify-between gap-2 border-t border-white/[0.07] bg-black/10 py-1 pl-3 pr-1.5">
          <span className={cx('min-w-0 text-cap font-semibold tabular-nums', late ? 'text-error' : 'text-muted-text')}>{fmtDur(used)} of {fmtDur(usable)} used{late && ' · beyond your usable time'}</span>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-white/[0.06]">
          <span className="absolute inset-y-0 left-0 bg-accent/45" style={{ width: pct(from) }} />
          <span className={cx('absolute inset-y-0 rounded-full', late ? 'bg-error' : 'bg-[image:var(--coral-grad)] shadow-[0_0_8px_rgb(234_81_57/0.7)]')} style={{ left: pct(from), width: `calc(${pct(used)} - ${pct(from)})` }} />
        </span>
      </div>
    </li>
  )
}

/** The layover as a timeline: arrival, each stop with the transfer that reaches it, the return transfer, the
 *  departure buffer, departure. Used by the builder (editable) and saved plans (read-only). */
export function ItineraryTimeline({ airportCode, arrival, departure, arrivalNote, departureNote, items, hops, usable, buffer, onOpen, actions, empty }: {
  airportCode: string; arrival: Date; departure: Date; arrivalNote?: string; departureNote?: string
  items: Activity[]; hops: Hop[]; usable: number; buffer: number
  onOpen?: (a: Activity) => void; actions?: (a: Activity, i: number, count: number) => ReactNode; empty?: ReactNode
}) {
  const dayTag = (d: Date) => (d.toDateString() !== arrival.toDateString() ? fmtDay(d) : '')
  // cumulative usable time consumed by the end of each stop (activities + the transfers to reach them)
  let used = 0
  const rows = items.map((a, i) => {
    const from = used
    used += (hops[i]?.kind !== 'unknown' ? hops[i]?.max ?? 0 : 0) + a.durationMin
    return { a, from, used, hop: hops[i] }
  })
  const returnHop = hops[items.length]
  return (
    <ol aria-label="Itinerary" className="relative ml-[1.1rem] pl-6 before:absolute before:bottom-6 before:left-[-1px] before:top-6 before:w-[3px] before:rounded-full before:bg-[image:var(--rail-grad)] before:opacity-80 before:shadow-[0_0_14px_rgb(234_81_57/0.45)]">
      <Anchor kind="arrive" time={arrival} dayTag="" title={`Arrive at ${airportCode}${arrivalNote ? ` · ${arrivalNote}` : ''}.`} note="Allow time to leave the aircraft first." />
      {rows.length === 0 && empty && (
        <li className="relative pb-4"><span aria-hidden="true" className="absolute -left-[1.72rem] top-3 size-4 rounded-full bg-line ring-4 ring-canvas" />{empty}</li>)}
      {rows.map(({ a, from, used, hop }, i) => (
        <Fragment key={a.id}>
          {hop && <li className="relative"><HopRow h={hop} /></li>}
          <Stop a={a} i={i} from={from} used={used} usable={usable} onOpen={onOpen && (() => onOpen(a))} actions={actions?.(a, i, rows.length)} />
        </Fragment>
      ))}
      {returnHop && <li className="relative pt-1"><HopRow h={returnHop} /></li>}
      <li className="relative pb-4 pt-1"><span aria-hidden="true" className="absolute -left-[1.72rem] top-4 size-4 rounded-full bg-muted/60 ring-4 ring-canvas" />
        <div className="rounded-card border border-dashed border-white/18 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.045)_0_8px,transparent_8px_16px)] p-3.5">
          <p className="text-sub font-semibold">Departure preparation · {fmtDur(buffer)} buffer</p>
          <p className="text-sub text-muted-text">Kept free for airport procedures, the walk to your gate and boarding.</p></div></li>
      <Anchor kind="depart" time={departure} dayTag={dayTag(departure)} title={`Onward departure${departureNote ? ` · ${departureNote}` : ''}`} />
    </ol>
  )
}
