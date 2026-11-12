import { AlertTriangle } from 'lucide-react'
import type { Budget } from '../data/time'
import { fmtDur } from '../data/time'
import { cx } from './ui'
import { InfoTip } from './InfoTip'

/** Deep-ocean time budget summary: total - buffer = usable; planned consumes it. */
export function BudgetHero({ b, overnight }: { b: Budget; overnight?: boolean }) {
  const total = Math.max(b.total, 1)
  const pct = (n: number) => `${Math.min(100, (n / total) * 100)}%`
  return (
    <section aria-label="Time budget" className="panel-accent relative overflow-hidden rounded-[1.75rem] p-5 text-white">
      <p className="flex items-center gap-1 text-sub text-white/70">{b.over ? 'Over by' : 'Time remaining'}<InfoTip label="Time remaining">Usable time (layover minus the planning buffer) minus your planned activities.</InfoTip></p>
      <p className={cx('text-[2.75rem] font-bold leading-none tracking-[-0.03em] tabular-nums', b.over && 'text-[#ff8a80]')} aria-live="polite">
        {fmtDur(b.over ? -b.remaining : b.remaining)}
      </p>
      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-white/10" role="img"
        aria-label={`${fmtDur(b.buffer)} buffer, ${fmtDur(b.planned)} planned of ${fmtDur(b.total)}`}>
        <div className="bg-white/35" style={{ width: pct(b.buffer) }} />
        <div className={cx('rounded-r-full', b.over ? 'bg-[#ff6b5e]' : 'bg-gradient-to-r from-[#f6a04d] to-accent')} style={{ width: pct(Math.min(b.planned, b.usable)) }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {[['Layover', fmtDur(b.total), 'bg-white/15'], ['Buffer', fmtDur(b.buffer), 'bg-white/35'], ['Planned', fmtDur(b.planned), b.over ? 'bg-[#ff6b5e]' : 'bg-accent']].map(([k, v, c]) => (
          <div key={k}><dt className="flex items-center gap-1.5 text-cap text-white/70"><span className={cx('size-2 rounded-full', c)} />{k}</dt>
            <dd className="text-body font-semibold tabular-nums">{v}</dd></div>))}
      </dl>
      <p className="mt-3 border-t border-white/15 pt-3 text-sub text-white/80">
        <b className="text-white">{fmtDur(b.usable)} usable</b> after the {fmtDur(b.buffer)} buffer
      </p>
      {b.over && (
        <p role="alert" className="mt-3 flex gap-2 rounded-2xl bg-white p-3 text-sub font-medium text-[#2a1b18]">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#c23b24]" />
          Doesn’t fit. Remove or shorten an activity.
        </p>
      )}
      {b.usable === 0 && !b.over && <p role="alert" className="mt-3 text-sub text-white/80">No usable time after the buffer.</p>}
      {overnight && <p className="mt-3 text-sub text-white/80">Overnight layover. Many services may be closed.</p>}
    </section>
  )
}
