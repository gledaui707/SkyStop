import { AlertTriangle, Info, MoonStar, Star } from 'lucide-react'
import { fmtDur } from '../data/time'
import type { AccessState, TimeState } from '../domain/itinerary'
import type { ReactNode } from 'react'
import { InfoTip, cx } from './ui'

export interface HeroNumbers {
  total: number; buffer: number; usable: number
  activityMin: number; transferMin: number; transferMinLow: number; remaining: number
  time: TimeState; access: AccessState; routing: boolean; unknownTransfers: number; proceduresUnknown: boolean
}

export const TIME_LABEL: Record<TimeState, string> = {
  fits: 'Fits within estimated time budget',
  tight: 'Tight connection',
  exceeds: 'Exceeds available time',
  unverified: 'Cannot verify feasibility',
}
export const ACCESS_LABEL: Record<AccessState, string> = {
  airside: 'Stays in the transit area',
  'entry-required': 'Entry verification required',
  unverified: 'Access conditions unknown',
}

type Arc = { min: number; stroke: string; dash?: boolean }

/** Ring gauge for a layover: arcs in the order time is spent (buffer, activities, transfers) around the whole layover.
 *  Decorative geometry; the caller gives it a text alternative. */
export function TimeRing({ total, arcs, label, children, className = 'size-[5.75rem] min-[360px]:size-28' }: { total: number; arcs: Arc[]; label: string; children?: ReactNode; className?: string }) {
  const r = 46, c = 2 * Math.PI * r
  let at = 0
  return (
    <div role="img" aria-label={label} className={cx('relative shrink-0', className)}>
      <svg viewBox="0 0 112 112" className="size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ring-coral" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffb08f" /><stop offset=".55" stopColor="#ea5139" /><stop offset="1" stopColor="#f0738a" /></linearGradient>
          <pattern id="ring-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="rgb(255 240 232 / 0.22)" /><rect width="2" height="4" fill="rgb(255 240 232 / 0.55)" /></pattern>
        </defs>
        <circle cx="56" cy="56" r={r} fill="none" stroke="rgb(255 240 232 / 0.09)" strokeWidth="10" />
        {arcs.map((a, i) => {
          const len = Math.max(0, Math.min(a.min, total - at)) / total * c
          const el = len > 0.5 ? <circle key={i} cx="56" cy="56" r={r} fill="none" stroke={a.dash ? 'url(#ring-hatch)' : a.stroke} strokeWidth="10"
            strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-at / total * c} strokeLinecap="butt" className="ring-arc" /> : null
          at += Math.max(0, a.min)
          return el
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

const TONE: Record<TimeState, string> = {
  fits: 'bg-success-tint text-success', tight: 'bg-warning-tint text-warning', exceeds: 'bg-error-tint text-error', unverified: 'bg-ink-tint text-muted-text',
}

/** Time budget: a frosted "instrument" on the builder and plan screens. The number left is the focal point; the ring
 *  shows how the layover is spent. Coral stays with the screen's main action, so this surface is glass lit by coral.
 *  total − buffer = usable; usable − activities − transfers = remaining. Time and access are reported separately. */
export function BudgetHero({ n, overnight, bufferInfo }: { n: HeroNumbers; overnight?: boolean; bufferInfo?: string }) {
  const over = n.remaining < 0
  const total = Math.max(n.total, 1)
  const used = Math.min(n.activityMin, n.usable), moved = Math.min(n.transferMin, Math.max(0, n.usable - used))
  const share = n.usable > 0 ? Math.round(((n.activityMin + (n.routing ? n.transferMin : 0)) / n.usable) * 100) : 0
  return (
    <>
      <section aria-label="Time budget" className={cx('instrument relative overflow-hidden rounded-surface p-5', over && 'instrument-over')}>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sub font-medium text-muted-text">{over ? 'Over your usable time by' : 'Estimated time remaining'}</p>
            <p className={cx('mt-1 whitespace-nowrap text-metric font-bold tabular-nums max-[359px]:text-[2.25rem]', over ? 'text-error' : 'text-ink')} aria-live="polite">
              {fmtDur(Math.abs(n.remaining))}
            </p>
            {n.time !== 'fits' && <p className={cx('mt-2 inline-flex rounded-full px-2.5 py-1 text-cap font-semibold', TONE[n.time])}>{TIME_LABEL[n.time]}</p>}
          </div>
          <TimeRing total={total} label={`${fmtDur(n.buffer)} buffer, ${fmtDur(n.activityMin)} activities, ${fmtDur(n.transferMin)} transfers, of ${fmtDur(n.total)}`}
            arcs={[{ min: n.buffer, stroke: '', dash: true }, { min: used, stroke: over ? '#ff8673' : 'url(#ring-coral)' }, ...(n.routing ? [{ min: moved, stroke: '#f6a04d' }] : [])]}>
            <span aria-hidden="true" className="leading-none">
              <span className="block text-card font-bold tabular-nums max-[359px]:text-body">{Math.min(share, 999)}%</span>
              <span className="mt-0.5 block text-micro text-muted-text">of usable</span>
            </span>
          </TimeRing>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2">
          {([['Layover', fmtDur(n.total), 'bg-white/20'], ['Buffer', fmtDur(n.buffer), 'bg-white/55'], ['Activities', fmtDur(n.activityMin), over ? 'bg-error' : 'bg-accent'],
            ...(n.routing ? [['Transfers', fmtDur(n.transferMin), 'bg-amber']] : [])] as [string, string, string][]).map(([k, v, c]) => (
            <div key={k} className="min-w-0 rounded-control bg-white/[0.05] px-3 py-2 ring-1 ring-white/[0.06]"><dt className="flex items-center gap-1.5 text-cap text-muted-text"><span className={cx('size-2 shrink-0 rounded-full', c)} />{k}
              {k === 'Buffer' && bufferInfo && <InfoTip id="buffer-info" title="Planning buffer" label="About the planning buffer" icon={<Info size={15} className="text-muted-text" />}>{bufferInfo}</InfoTip>}</dt>
              <dd className="text-body font-semibold tabular-nums">{v}</dd></div>))}
        </dl>
        {(n.unknownTransfers > 0 || n.proceduresUnknown) && (
          <p className="mt-3 text-cap text-muted-text">{[n.proceduresUnknown && 'Immigration queues not included', n.unknownTransfers > 0 && `${n.unknownTransfers} transfer${n.unknownTransfers > 1 ? 's' : ''} not counted`].filter(Boolean).join(' · ')}</p>)}
        {n.time === 'exceeds' && (
          <p role="alert" className="mt-3 flex gap-2 rounded-control bg-error-tint p-3 text-sub font-medium text-ink ring-1 ring-error/30">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-error" />
            This plan does not fit. Remove or shorten an activity.
          </p>
        )}
        {n.usable === 0 && !over && <p role="alert" className="mt-3 text-sub text-ink">No usable time after the buffer.</p>}
      </section>
      {overnight && (
        <aside aria-label="Overnight connection"
          className="relative mt-3 flex items-center gap-4 overflow-hidden rounded-surface bg-gradient-to-br from-[#102445] to-[#0a142c] p-4 text-white">
          <div aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center rounded-full bg-[#243c66] text-[#dbe9ff]">
            <MoonStar size={32} strokeWidth={1.5} />
            <Star size={9} className="absolute bottom-2 left-2 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="text-card font-semibold">Overnight connection</p>
            <p className="mt-1 text-sub text-[#dbe9ff]">Many services may be closed. Check hours with the airport.</p>
          </div>
        </aside>
      )}
    </>
  )
}
