import { ChevronLeft, Info, MapPin, Navigation, Plane, ShieldAlert, X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../store'
import type { Activity, Category } from '../data/types'
import { fmtDur } from '../data/time'
import { sized, type Img } from '../data/images'

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

/** Photo with object-cover cropping. */
export function Photo({ img, w, h, className }: { img: Img; w: number; h?: number; className?: string }) {
  return <img src={sized(img, w * 2, h ? h * 2 : undefined)} alt={img.alt} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
    className={cx('object-cover anim-fade', className)} />
}

export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  const { back } = useApp()
  return (
    <header className="sticky top-0 z-20 px-gutter pb-2.5 pt-[calc(var(--safe-top)+0.25rem)]">
      {/* no band of its own: the shell's progressive top blur sits behind the header */}
      <div className="relative grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
        <IconButton label="Back" icon={ChevronLeft} onClick={onBack ?? back} iconSize={26} />
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
      <div className="glass-medium pointer-events-auto rounded-tray p-2.5">{children}</div>
    </div>
  )
}

export function LargeTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="px-gutter pb-4 pt-[calc(var(--safe-top)+1.25rem)]">
      <h1 className="text-title font-bold">{children}</h1>
      {sub && <p className="mt-1 text-sub text-muted-text">{sub}</p>}
    </div>
  )
}

/** Buttons. primary: the one main action (coral). secondary: the alternative (white pill). tertiary: low-emphasis text
 *  action. danger: destructive. Sizes: sm 44 px (inline), md 52 px (default), lg 56 px (screen-level CTA). */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger'
const BUTTON_SIZE = { sm: 'min-h-11 px-4 text-sub', md: 'min-h-[3.25rem] px-6 text-body', lg: 'min-h-14 px-7 text-body' } as const
export function Button({ variant = 'primary', size = 'md', icon: Icon, className, ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: keyof typeof BUTTON_SIZE; icon?: LucideIcon }) {
  return (
    <button {...p} className={cx(
      'press inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-40 disabled:shadow-none',
      BUTTON_SIZE[size],
      variant === 'primary' && cx('btn-coral font-bold', size !== 'sm' && 'text-card'),
      variant === 'secondary' && 'btn-secondary',
      (variant === 'tertiary' || variant === 'ghost') && 'text-accent-dark active:bg-ink-tint',
      variant === 'danger' && 'text-error ring-1 ring-error/30 active:bg-error-tint',
      className)}>
      {Icon && <Icon size={size === 'sm' ? 18 : 20} aria-hidden="true" />}{p.children}
    </button>
  )
}

/** Round icon-only button. The label is required (it is the accessible name). Tones: glass (on the canvas), dark (on
 *  photography), plain (inside sheets and panels), coral (primary), danger. Every size is at least 44 px. */
const ICON_SIZE = { sm: 'size-11', md: 'size-12', lg: 'size-14' } as const
const ICON_TONE = {
  glass: 'glass-subtle text-ink',
  dark: 'glass-dark',
  plain: 'bg-ink-tint text-ink ring-1 ring-line',
  coral: 'btn-coral',
  danger: 'text-error active:bg-error-tint',
  accent: 'text-accent-dark active:bg-accent-tint',
  quiet: 'text-muted-text active:bg-ink-tint',
} as const
export function IconButton({ label, icon: Icon, tone = 'glass', size = 'md', iconSize, className, ...p }:
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { label: string; icon: LucideIcon; tone?: keyof typeof ICON_TONE; size?: keyof typeof ICON_SIZE; iconSize?: number }) {
  return (
    <button type="button" aria-label={label} {...p}
      className={cx('press grid shrink-0 place-items-center rounded-full disabled:opacity-35', ICON_SIZE[size], ICON_TONE[tone], className)}>
      <Icon size={iconSize ?? (size === 'lg' ? 24 : size === 'sm' ? 19 : 22)} strokeWidth={2.2} aria-hidden="true" />
    </button>
  )
}

/** A surface in one of the design-system materials (see index.css "Materials") with a radius from the scale. */
export type Material = 'panel' | 'accent' | 'subtle' | 'medium' | 'premium' | 'sunset' | 'dark'
const MATERIAL: Record<Material, string> = {
  panel: 'panel', accent: 'panel-accent', subtle: 'glass-subtle', medium: 'glass-medium', premium: 'glass-premium', sunset: 'sunset', dark: 'glass-dark',
}
const RADIUS = { control: 'rounded-control', card: 'rounded-card', surface: 'rounded-surface', tray: 'rounded-tray' } as const
export function Surface({ material = 'panel', radius = 'card', as: Tag = 'div', className, ...p }:
  React.HTMLAttributes<HTMLElement> & { material?: Material; radius?: keyof typeof RADIUS; as?: 'div' | 'section' | 'article' | 'li' | 'aside' }) {
  return <Tag {...p} className={cx(MATERIAL[material], RADIUS[radius], className)} />
}

/** Small status label. tone: neutral, accent, success, warning, error, dark (on photos). */
const PILL_TONE = {
  neutral: 'bg-ink-tint text-ink', accent: 'bg-accent-tint text-accent-dark', success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning', error: 'bg-error-tint text-error', dark: 'glass-dark',
} as const
export function Pill({ tone = 'neutral', icon: Icon, className, children }: { tone?: keyof typeof PILL_TONE; icon?: LucideIcon; className?: string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-cap font-semibold leading-none', PILL_TONE[tone], className)}>
      {Icon && <Icon size={13} aria-hidden="true" />}{children}
    </span>
  )
}

export function Chip({ active, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button {...p} aria-pressed={active} className={cx(
      'press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sub font-medium transition-colors',
      active ? 'pill-on border-transparent' : 'border-line bg-white text-ink', p.className)}>
      {children}
    </button>
  )
}

export function ChipRow({ children }: { children: ReactNode }) {
  // Edges fade so the cut-off chip signals that the row scrolls sideways.
  return <div role="group" className="no-scrollbar scroll-fade -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">{children}<span aria-hidden="true" className="w-3 shrink-0" /></div>
}

export function Segmented<T extends string>({ value, onChange, options }:
  { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="grid rounded-full bg-ink-tint p-1 ring-1 ring-line" style={{ gridTemplateColumns: `repeat(${options.length},1fr)` }}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx('min-h-11 rounded-full text-sub font-semibold transition-colors', value === o.value ? 'pill-on' : 'text-muted-text')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Section heading with an optional action on the right (a link or small button).
 *  title: a bold heading between content blocks. label: a small muted heading above a grouped panel (settings style). */
export function SectionHeader({ children, action, kind = 'title', className }: { children: ReactNode; action?: ReactNode; kind?: 'title' | 'label'; className?: string }) {
  return (
    <div className={cx('flex min-h-9 items-center justify-between gap-3', kind === 'label' && 'px-1', className)}>
      <h2 className={kind === 'title' ? 'text-h2 font-bold' : 'text-sub font-semibold text-muted-text'}>{children}</h2>
      {action}
    </div>
  )
}
/** SectionHeader with the standard spacing between content blocks. */
export const SectionTitle = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <SectionHeader action={action} className="mb-3 mt-6">{children}</SectionHeader>
)

/** Nothing here yet: an icon, one line of title, an optional sentence and an optional action. */
export function EmptyState({ icon: Icon = Plane, title, children, action, className }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-surface panel border-dashed !border-[rgb(255_236_226/0.2)] px-5 py-6 text-center', className)}>
      <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-accent-tint text-accent-dark"><Icon size={22} /></span>
      <p className="mt-3 text-card font-semibold">{title}</p>
      {children && <div className="mt-1 text-sub text-muted-text">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/** Waiting for data. Announced to screen readers; the mark pulses only when motion is allowed. */
export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cx('anim-fade grid justify-items-center gap-4 py-8 text-center', className)}>
      <span aria-hidden="true" className="btn-coral grid size-14 place-items-center rounded-full motion-safe:animate-pulse"><Plane size={26} className="-rotate-45" /></span>
      <p className="text-body text-muted-text">{label}</p>
    </div>
  )
}
/** Placeholder block for content that is loading. */
export const Skeleton = ({ className }: { className?: string }) => <span aria-hidden="true" className={cx('block rounded-control bg-ink-tint motion-safe:animate-pulse', className)} />

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  const Icon = tone === 'warn' ? ShieldAlert : Info
  return (
    <div role={tone === 'warn' ? 'alert' : 'note'} className={cx('flex gap-3 rounded-card border p-3.5 text-sub',
      tone === 'warn' ? 'border-error/30 bg-error-tint text-ink' : 'border-line bg-white text-muted-text')}>
      <Icon size={20} className={cx('mt-px shrink-0', tone === 'warn' ? 'text-error' : 'text-accent-dark')} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export const PassportNote = () => (
  <Notice>
    Entry requirements depend on your passport and transit country. Verify with official sources.
  </Notice>
)

export const DemoNote = ({ children }: { children: ReactNode }) => (
  <p className="text-cap text-muted-text">{children}</p>
)

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sub font-medium text-muted-text">{label}{children}</label>
}
// min-w-0: date/time inputs have a large intrinsic width and otherwise push narrow (320 px) screens sideways.
export const inputCls = 'field block min-h-[3.25rem] w-full min-w-0 max-w-full rounded-control px-4 text-body font-medium transition-colors focus:border-accent-dark focus:outline-none focus:ring-4 focus:ring-accent/25'

/** Labelled text input with optional leading icon, hint and error. Extra props go to the <input>. */
export function TextField({ label, hint, error, icon: Icon, className, id, ...input }:
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: ReactNode; icon?: LucideIcon }) {
  const auto = useId(), fid = id ?? auto
  return (
    <div className={cx('grid min-w-0 gap-1.5', className)}>
      <label htmlFor={fid} className="text-sub font-medium text-muted-text">{label}</label>
      <div className="relative">
        {Icon && <Icon size={19} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />}
        <input id={fid} aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${fid}-note` : undefined} {...input}
          className={cx(inputCls, Icon && 'pl-11', !!error && 'border-error focus:border-error focus:ring-error/15')} />
      </div>
      {(error || hint) && <p id={`${fid}-note`} className={cx('text-cap', error ? 'font-medium text-error' : 'text-muted-text')}>{error ?? hint}</p>}
    </div>
  )
}

export function ActivityRow({ a, action, onOpen }: { a: Activity; action?: ReactNode; onOpen?: () => void }) {
  return (
    <li className="panel flex items-center gap-3 rounded-card p-2.5">
      <button onClick={onOpen} disabled={!onOpen} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="ph relative size-[4.5rem] shrink-0 overflow-hidden rounded-control">
          <Photo img={a.image} w={72} h={72} className="absolute inset-0 size-full" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-card font-semibold leading-tight">{a.name}</span>
          <span className="mt-1 block text-sub text-muted-text">{fmtDur(a.durationMin)} · {a.costLabel}</span>
          <span className="block text-cap text-muted-text">
            {[a.category, a.terminal, a.access === 'Unverified' ? null : a.access].filter(Boolean).join(' · ')}{a.leavesAirport ? ' · leaves airport' : ''}
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
    <div className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-[rgb(31_26_23/0.32)]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="anim-sheet bg-white shadow-e3 max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-tray !border-b-0 pb-[calc(var(--safe-bottom)+1rem)] text-ink">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/95 px-5 pb-3 pt-3">
          <span className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-ink/20" />
          <h2 className="mt-3 min-w-0 text-h2 font-bold">{title}</h2>
          <IconButton label="Close" icon={X} tone="plain" size="sm" iconSize={18} onClick={onClose} className="mt-3" />
        </div>
        <div className="px-5">{children}</div>
      </div>
    </div>
  )
}

/** Venue details: where it is, how long it takes, how to get there, and the plan action. Sources and data notes live
 *  in Profile → About & data, not here. `onDirections` overrides the default (open the airport map with its route). */
export function ActivitySheet({ a, onClose, action, onDirections }: { a: Activity | null; onClose: () => void; action?: ReactNode; onDirections?: () => void }) {
  const { go } = useApp()
  const directions = () => { if (!a) return; onClose(); if (onDirections) onDirections(); else go({ name: 'airport', code: a.airport, view: 'map', venue: a.id }) }
  return (
    <Sheet open={!!a} onClose={onClose} title={a?.name ?? ''}>
      {a && (
        <div className="grid gap-3 pb-2">
          <div className="ph relative h-52 overflow-hidden rounded-card">
            <Photo img={a.image} w={440} h={208} className="absolute inset-0 size-full" />
            <span className="glass-dark absolute left-3 top-3 rounded-full px-3 py-1 text-cap font-semibold">{a.category}</span>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[['Est. time', fmtDur(a.durationMin)], ['Price', a.costLabel.replace(' (illustrative)', '')], ['Access', a.access === 'Unverified' ? 'Not confirmed' : a.access]].map(([k, v]) => (
              <div key={k} className="panel min-w-0 rounded-control px-1 py-2.5"><dt className="text-cap text-muted-text">{k}</dt><dd className="text-body font-semibold">{v}</dd></div>))}
          </dl>
          {a.terminal && <p className="flex items-start gap-2 text-sub text-ink"><MapPin size={17} className="mt-px shrink-0 text-accent-dark" aria-hidden="true" /><span>{a.terminal}</span></p>}
          {a.access === 'Landside' && <p className="flex items-start gap-2 text-sub font-medium text-warning"><ShieldAlert size={17} className="mt-px shrink-0" aria-hidden="true" />Outside the transit area: immigration required.</p>}
          <p className="text-body text-ink/85">{a.note}</p>
          <div className="grid gap-2">
            <Button variant="secondary" icon={Navigation} onClick={directions}>How to get there</Button>
            {action}
          </div>
        </div>
      )}
    </Sheet>
  )
}

export const CATEGORIES: ('All' | Category)[] = ['All', 'Food', 'Rest', 'Shopping', 'Sights']

/** "What is this?" link that opens a dark tooltip bubble (title + text) pointing back at the link.
 *  Tap the link again, tap elsewhere or press Escape to close. The bubble is right-aligned under the link. */
export function InfoTip({ id, title, children, label = 'What is this?', icon }: { id: string; title: string; children: ReactNode; label?: string; icon?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  const toggle = () => {
    if (!open && box.current) {
      // Open upwards when the bubble would run under the bottom navigation.
      const r = box.current.getBoundingClientRect(), nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) * 16 || 88
      setAbove(r.bottom + 230 > window.innerHeight - nav && r.top > 260)
    }
    setOpen(!open)
  }
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', away); window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <span ref={box} className="relative inline-flex shrink-0">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={toggle}
        aria-label={icon ? label : undefined}
        className={icon ? 'press -m-2 grid size-9 place-items-center rounded-full' : 'press min-h-11 text-sub font-semibold text-accent-dark underline underline-offset-2'}>{icon ?? label}</button>
      <span id={id} role="tooltip" hidden={!open}
        className={cx('anim-fade absolute right-0 z-50 w-[min(18.5rem,calc(100vw-2.5rem))] rounded-card bg-[#33231f] px-4 py-3.5 text-left shadow-[0_10px_28px_rgb(31_26_23/0.22)] ring-1 ring-line',
          above ? 'bottom-full mb-2.5' : 'top-full mt-2.5')}>
        <span aria-hidden="true" className={cx('absolute right-8 size-3.5 rotate-45 rounded-[3px] bg-[#33231f]', above ? '-bottom-1.5' : '-top-1.5')} />
        <span className="block text-body font-semibold text-white">{title}</span>
        <span className="mt-1.5 block text-sub font-normal normal-case leading-relaxed tracking-normal text-white/80">{children}</span>
      </span>
    </span>
  )
}
