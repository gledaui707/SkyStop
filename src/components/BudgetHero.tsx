import { AlertTriangle } from 'lucide-react'
import type { Budget } from '../data/time'
import { fmtDur } from '../data/time'
import { cx } from './ui'

/** Time budget: the one strong coral surface on the light builder. total - buffer = usable; planned consumes it. */
export function BudgetHero({ b, overnight }: { b: Budget; overnight?: boolean }) {
  const total = Math.max(b.total, 1)
  const pct = (n: number) => `${Math.min(100, (n / total) * 100)}%`
  return (
    <section aria-label="Time budget" className="sunset relative overflow-hidden rounded-[1.75rem] p-5">
      <p className="text-sub font-medium text-white/85">{b.over ? 'Over your usable time by' : 'Usable time remaining'}</p>
      <p className={cx('text-[2.75rem] font-bold leading-none tracking-[-0.03em] tabular-nums', b.over && 'text-[#fff1c2]')} aria-live="polite">
        {fmtDur(b.over ? -b.remaining : b.remaining)}
      </p>
      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-white/25" role="img"
        aria-label={`${fmtDur(b.buffer)} buffer, ${fmtDur(b.planned)} planned of ${fmtDur(b.total)}`}>
        <div className="bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.75)_0_3px,rgb(255_255_255/0.35)_3px_6px)]" style={{ width: pct(b.buffer) }} />
        <div className={cx('rounded-r-full', b.over ? 'bg-[#3a1110]' : 'bg-white')} style={{ width: pct(Math.min(b.planned, b.usable)) }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {[['Layover', fmtDur(b.total), 'bg-white/30'], ['Buffer', fmtDur(b.buffer), 'bg-white/60'], ['Planned', fmtDur(b.planned), b.over ? 'bg-[#3a1110]' : 'bg-white']].map(([k, v, c]) => (
          <div key={k}><dt className="flex items-center gap-1.5 text-cap text-white/85"><span className={cx('size-2 rounded-full', c)} />{k}</dt>
            <dd className="text-body font-semibold tabular-nums">{v}</dd></div>))}
      </dl>
      <p className="mt-3 border-t border-white/25 pt-3 text-sub text-white/90">
        {fmtDur(b.total)} − {fmtDur(b.buffer)} buffer = <b className="text-white">{fmtDur(b.usable)} usable</b>
      </p>
      {b.over && (
        <p role="alert" className="mt-3 flex gap-2 rounded-2xl bg-white p-3 text-sub font-medium text-ink">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#c23b24]" />
          This plan does not fit. Remove or shorten an activity.
        </p>
      )}
      {b.usable === 0 && !b.over && <p role="alert" className="mt-3 text-sub text-white/90">No usable time after the buffer.</p>}
      {overnight && <p className="mt-3 text-sub text-white/90">Overnight connection: many services may be closed. Check hours with the airport.</p>}
    </section>
  )
}
