import { ChevronLeft, Info, ShieldAlert, X, type LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useApp } from '../store'
import type { Activity, Category } from '../data/types'
import { fmtDur } from '../data/time'
import { sized, type Img } from '../data/images'

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

/** Photo with object-cover cropping. Credit is exposed via title and in the app's photo credits. */
export function Photo({ img, w, h, className }: { img: Img; w: number; h?: number; className?: string }) {
  return <img src={sized(img, w * 2, h ? h * 2 : undefined)} alt={img.alt} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} title={`Photo: ${img.credit} / Unsplash`}
    className={cx('object-cover anim-fade', className)} />
}

export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  const { back } = useApp()
  return (
    <header className="sticky top-0 z-20 px-4 pb-3 pt-[calc(var(--safe-top)+0.25rem)]">
      {/* frosted band that fades out downward so content scrolls softly beneath the header */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-canvas/85 via-canvas/55 to-transparent backdrop-blur-xl [mask-image:linear-gradient(to_bottom,#000_65%,transparent)]" />
      <div className="relative grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
        <button onClick={onBack ?? back} aria-label="Back" className="glass press grid size-12 place-items-center rounded-full text-ink">
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-body font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-cap text-muted-text">{subtitle}</p>}
        </div>
        <div className="flex justify-end">{right}</div>
      </div>
    </header>
  )
}

/** Floating action area that sits above the floating tab bar. Holds buttons only. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[var(--nav-h)] z-30 mx-auto max-w-[480px] px-4 pb-2">
      <div className="glass pointer-events-auto rounded-[1.75rem] p-2.5">{children}</div>
    </div>
  )
}

export function LargeTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="px-5 pb-4 pt-[calc(var(--safe-top)+1.25rem)]">
      <h1 className="text-title font-bold">{children}</h1>
      {sub && <p className="mt-1 text-sub text-muted-text">{sub}</p>}
    </div>
  )
}

export function Button({ variant = 'primary', icon: Icon, className, ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: LucideIcon }) {
  return (
    <button {...p} className={cx(
      'press inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full px-6 text-body font-semibold disabled:opacity-40 disabled:shadow-none',
      variant === 'primary' && 'btn-coral text-[1.125rem] font-bold',
      variant === 'secondary' && 'bg-white/10 text-ink ring-1 ring-white/20 backdrop-blur-md active:bg-white/15',
      variant === 'ghost' && 'text-accent-dark active:bg-ink-tint',
      variant === 'danger' && 'text-error ring-1 ring-error/30 active:bg-error-tint',
      className)}>
      {Icon && <Icon size={20} />}{p.children}
    </button>
  )
}

export function Chip({ active, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button {...p} aria-pressed={active} className={cx(
      'press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sub font-medium transition-colors',
      active ? 'border-transparent bg-white text-[#2a1b18] shadow-[0_6px_18px_rgb(0_0_0/0.25)]' : 'border-line bg-white/[0.06] text-ink backdrop-blur-md', p.className)}>
      {children}
    </button>
  )
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">{children}</div>
}

export function Segmented<T extends string>({ value, onChange, options }:
  { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="grid rounded-full bg-white/[0.07] p-1 ring-1 ring-line" style={{ gridTemplateColumns: `repeat(${options.length},1fr)` }}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx('min-h-11 rounded-full text-sub font-semibold transition-colors', value === o.value ? 'bg-white text-[#2a1b18] shadow-sm' : 'text-muted-text')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-h2 font-bold">{children}</h2>
      {action}
    </div>
  )
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  const Icon = tone === 'warn' ? ShieldAlert : Info
  return (
    <div role={tone === 'warn' ? 'alert' : 'note'} className={cx('flex gap-3 rounded-card border p-3.5 text-sub backdrop-blur-md',
      tone === 'warn' ? 'border-error/35 bg-error-tint text-ink' : 'border-line bg-white/[0.05] text-muted-text')}>
      <Icon size={20} className={cx('mt-px shrink-0', tone === 'warn' ? 'text-error' : 'text-accent-dark')} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export const PassportNote = () => (
  <Notice>
    Entry requirements depend on your passport and transit country. Verify with official sources. SkyStop does not check visa eligibility or whether you can leave the airport.
  </Notice>
)

export const DemoNote = ({ children }: { children: ReactNode }) => (
  <p className="text-cap text-muted-text">{children}</p>
)

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sub font-medium text-muted-text">{label}{children}</label>
}
// min-w-0: date/time inputs have a large intrinsic width and otherwise push narrow (320 px) screens sideways.
export const inputCls = 'min-h-[3.25rem] w-full min-w-0 max-w-full rounded-2xl border border-line bg-black/20 px-4 text-body text-ink transition-colors focus:border-accent-dark/70 focus:bg-black/30 focus:outline-none'

export function ActivityRow({ a, action, onOpen }: { a: Activity; action?: ReactNode; onOpen?: () => void }) {
  return (
    <li className="panel flex items-center gap-3 rounded-card p-2.5">
      <button onClick={onOpen} disabled={!onOpen} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="ph relative size-[4.5rem] shrink-0 overflow-hidden rounded-2xl">
          <Photo img={a.image} w={72} h={72} className="absolute inset-0 size-full" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-card font-semibold leading-tight">{a.name}</span>
          <span className="mt-1 block text-sub text-muted-text">{fmtDur(a.durationMin)} · {a.costLabel}</span>
          <span className="block text-cap text-muted-text">
            {a.category} · {a.access === 'Unverified' ? '' : a.access}{a.leavesAirport ? ' · leaves airport' : ''}
          </span>
        </span>
      </button>
      {action}
    </li>
  )
}

/** iOS-style bottom sheet. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-[3px]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="glass anim-sheet max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[2rem] !border-b-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-ink">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-[#2e221f] via-[#2e221f]/90 to-transparent px-5 pb-3 pt-3">
          <span className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-white/30" />
          <h2 className="mt-3 min-w-0 text-h2 font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="press mt-3 grid size-11 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-line"><X size={18} /></button>
        </div>
        <div className="px-5">{children}</div>
      </div>
    </div>
  )
}

export function ActivitySheet({ a, onClose, action }: { a: Activity | null; onClose: () => void; action?: ReactNode }) {
  return (
    <Sheet open={!!a} onClose={onClose} title={a?.name ?? ''}>
      {a && (
        <div className="grid gap-3 pb-2">
          <div className="ph relative h-52 overflow-hidden rounded-[1.5rem]">
            <Photo img={a.image} w={440} h={208} className="absolute inset-0 size-full" />
            <span className="glass-dark absolute left-3 top-3 rounded-full px-3 py-1 text-cap font-semibold">{a.category}</span>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[['Duration', fmtDur(a.durationMin)], ['Cost', a.costLabel.replace(' (illustrative)', '')], ['Access', a.access === 'Unverified' ? 'Unverified' : a.access]].map(([k, v]) => (
              <div key={k} className="panel rounded-2xl px-1 py-2.5"><dt className="text-cap text-muted-text">{k}</dt><dd className="text-body font-semibold">{v}</dd></div>))}
          </dl>
          <p className="text-body text-ink/90">{a.note}</p>
          {action}
        </div>
      )}
    </Sheet>
  )
}

export const CATEGORIES: ('All' | Category)[] = ['All', 'Food', 'Rest', 'Shopping', 'Work', 'City']
