import { AlertTriangle } from 'lucide-react'
import type { Budget } from '../data/time'
import { fmtDur } from '../data/time'
import { cx } from './ui'

/** Deep-ocean time budget summary: total - buffer = usable; planned consumes it. */
export function BudgetHero({ b, overnight }: { b: Budget; overnight?: boolean }) {
  const total = Math.max(b.total, 1)
  const pct = (n: number) => `${Math.min(100, (n / total) * 100)}%`
  return (
    <section aria-label="Time budget" className="rounded-[1.25rem] bg-deep p-4 text-white">
      <p className="text-sub text-white/70">{b.over ? 'Over your usable time by' : 'Usable time remaining'}</p>
      <p className={cx('text-title font-bold tabular-nums', b.over && 'text-[#ff8a80]')} aria-live="polite">
        {fmtDur(b.over ? -b.remaining : b.remaining)}
      </p>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/15" role="img"
        aria-label={`${fmtDur(b.buffer)} buffer, ${fmtDur(b.planned)} planned of ${fmtDur(b.total)}`}>
        <div className="bg-white/35" style={{ width: pct(b.buffer) }} />
        <div className={b.over ? 'bg-[#ff6b5e]' : 'bg-[#ffb5a5]'} style={{ width: pct(Math.min(b.planned, b.usable)) }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {[['Layover', fmtDur(b.total), 'bg-white/15'], ['Buffer', fmtDur(b.buffer), 'bg-white/35'], ['Planned', fmtDur(b.planned), b.over ? 'bg-[#ff6b5e]' : 'bg-[#ffb5a5]']].map(([k, v, c]) => (
          <div key={k}><dt className="flex items-center gap-1.5 text-cap text-white/70"><span className={cx('size-2 rounded-full', c)} />{k}</dt>
            <dd className="text-body font-semibold tabular-nums">{v}</dd></div>))}
      </dl>
      <p className="mt-3 border-t border-white/15 pt-3 text-sub text-white/80">
        {fmtDur(b.total)} − {fmtDur(b.buffer)} buffer = <b className="text-white">{fmtDur(b.usable)} usable</b>
      </p>
      {b.over && (
        <p role="alert" className="mt-3 flex gap-2 rounded-xl bg-white p-3 text-sub font-medium text-[#202124]">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-error" />
          This plan does not fit. Remove or shorten an activity.
        </p>
      )}
      {b.usable === 0 && !b.over && <p role="alert" className="mt-3 text-sub text-white/80">No usable time after the buffer.</p>}
      {overnight && <p className="mt-3 text-sub text-white/80">Overnight connection: many services may be closed. Check hours with the airport.</p>}
    </section>
  )
}
