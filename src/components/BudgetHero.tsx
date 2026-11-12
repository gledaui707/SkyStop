import { AlertTriangle, Info, MoonStar, Star } from 'lucide-react'
import { fmtDur } from '../data/time'
import type { AccessState, TimeState } from '../domain/itinerary'
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
  unverified: 'Timing not confirmed',
}
export const ACCESS_LABEL: Record<AccessState, string> = {
  airside: 'Stays in the transit area',
  'entry-required': 'Check airport entry requirements',
  unverified: 'Access conditions unknown',
}

/** Time budget: the one strong coral surface on the light builder.
 *  total − buffer = usable; usable − activities − transfers = remaining. Time and access are reported separately. */
export function BudgetHero({ n, overnight, bufferInfo }: { n: HeroNumbers; overnight?: boolean; bufferInfo?: string }) {
  const over = n.remaining < 0
  const total = Math.max(n.total, 1)
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / total) * 100))}%`
  const used = Math.min(n.activityMin, n.usable), moved = Math.min(n.transferMin, Math.max(0, n.usable - used))
  return (
    <>
      <section aria-label="Time budget" className="sunset relative rounded-[1.75rem] p-5">
        <p className="text-sub font-medium text-white/85">{over ? 'Over your usable time by' : 'Estimated time remaining'}</p>
        <p className={cx('text-[2.75rem] font-bold leading-none tracking-[-0.03em] tabular-nums', over && 'text-[#fff1c2]')} aria-live="polite">
          {fmtDur(Math.abs(n.remaining))}
        </p>
        {n.time !== 'fits' && <p className="mt-2 inline-flex rounded-full bg-white/20 px-2.5 py-1 text-cap font-semibold">{TIME_LABEL[n.time]}</p>}
        <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-white/25" role="img"
          aria-label={`${fmtDur(n.buffer)} buffer, ${fmtDur(n.activityMin)} activities, ${fmtDur(n.transferMin)} transfers, of ${fmtDur(n.total)}`}>
          <div className="bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.75)_0_3px,rgb(255_255_255/0.35)_3px_6px)]" style={{ width: pct(n.buffer) }} />
          <div className={cx(over ? 'bg-[#3a1110]' : 'bg-white')} style={{ width: pct(used) }} />
          {n.routing && <div className="bg-white/60" style={{ width: pct(moved) }} />}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {([['Layover', fmtDur(n.total), 'bg-white/30'], ['Buffer', fmtDur(n.buffer), 'bg-white/60'], ['Activities', fmtDur(n.activityMin), over ? 'bg-[#3a1110]' : 'bg-white'],
            ['Transfers', n.routing ? fmtDur(n.transferMin) : 'Unavailable', 'bg-white/60']] as [string, string, string][]).map(([k, v, c]) => (
            <div key={k} className="min-w-0"><dt className="flex items-center gap-1.5 text-cap text-white/85"><span className={cx('size-2 shrink-0 rounded-full', c)} />{k}
              {k === 'Buffer' && bufferInfo && <InfoTip id="buffer-info" title="Planning buffer" label="About the planning buffer" icon={<Info size={15} className="text-white/90" />}>{bufferInfo}</InfoTip>}</dt>
              <dd className="text-body font-semibold tabular-nums">{v}</dd></div>))}
        </dl>
        {(n.unknownTransfers > 0 || n.proceduresUnknown) && (
          <p className="mt-1 text-cap text-white/80">{n.proceduresUnknown ? 'Immigration and re-entry checks are not included: no waiting times are published. ' : ''}{n.unknownTransfers > 0 ? `${n.unknownTransfers} transfer${n.unknownTransfers > 1 ? 's are' : ' is'} not verified and not counted.` : ''}</p>)}
        {n.time === 'exceeds' && (
          <p role="alert" className="mt-3 flex gap-2 rounded-2xl bg-white p-3 text-sub font-medium text-ink">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#c23b24]" />
            This plan does not fit. Remove or shorten an activity.
          </p>
        )}
        {n.usable === 0 && !over && <p role="alert" className="mt-3 text-sub text-white/90">No usable time after the buffer.</p>}
      </section>
      {overnight && (
        <aside aria-label="Overnight connection"
          className="relative mt-3 flex items-center gap-4 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#102445] to-[#0a142c] p-4 text-white">
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
