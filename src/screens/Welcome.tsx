import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Clock, Plane, ShoppingBag, Sparkles, Utensils } from 'lucide-react'
import { useApp } from '../store'
import { IMAGES, sized, type Img } from '../data/images'
import { cx } from '../components/ui'
import { SSMark } from '../components/SSMark'

/** First-visit onboarding: three photographic screens. Skippable, swipeable, keyboard-operable.
 *  The floating previews are clearly marked examples; no personal or live flight data is shown. */
interface Slide { img: Img; headline: string; body: string; preview: ReactNode }

const Example = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx('glass-dark rounded-[1.5rem] p-4 text-white', className)}>{children}</div>
)
const Tag = () => <span className="rounded-full bg-white/18 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white/80">Example</span>

const SLIDES: Slide[] = [
  {
    img: IMAGES.onboarding.connection,
    headline: 'Your layover, reimagined.',
    body: 'Turn the hours between flights into something worth experiencing.',
    preview: (
      <Example className="w-[min(19rem,100%)]">
        <div className="flex items-center justify-between"><span className="text-cap text-white/75">Connection</span><Tag /></div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-h2 font-bold">CGK</span>
          <span className="h-px flex-1 border-t border-dashed border-white/45" />
          <span className="flex items-center gap-1 rounded-full bg-white/18 px-2.5 py-1 text-sub font-bold"><Plane size={14} className="-rotate-45" />SIN</span>
          <span className="h-px flex-1 border-t border-dashed border-white/45" />
          <span className="text-h2 font-bold">CDG</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sub text-white/85"><Clock size={15} />7h 10m layover in Singapore</p>
      </Example>
    ),
  },
  {
    img: IMAGES.onboarding.discover,
    headline: 'Discover what’s possible.',
    body: 'Explore dining, shopping, and experiences worth making time for.',
    preview: (
      <div className="relative h-[8.5rem] w-[min(19rem,100%)]">
        <Example className="absolute left-0 top-0 flex w-[13rem] items-center gap-3 !p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/18"><Utensils size={18} /></span>
          <span className="min-w-0"><span className="block text-sub font-semibold">Dining</span><span className="block text-cap text-white/75">about 45 min</span></span>
        </Example>
        <Example className="absolute bottom-0 right-0 flex w-[13rem] items-center gap-3 !p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/18"><ShoppingBag size={18} /></span>
          <span className="min-w-0"><span className="block text-sub font-semibold">Shopping</span><span className="block text-cap text-white/75">about 30 min</span></span>
        </Example>
      </div>
    ),
  },
  {
    img: IMAGES.onboarding.plan,
    headline: 'Make every minute count.',
    body: 'Build a plan around your available time, and keep it ready for your journey.',
    preview: (
      <Example className="w-[min(19rem,100%)]">
        <div className="flex items-center justify-between"><span className="text-cap text-white/75">Your plan</span><Tag /></div>
        <p className="mt-1 text-[2rem] font-bold leading-none tabular-nums">1h 50m <span className="text-sub font-semibold text-white/80">left</span></p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
          <span className="w-[30%] bg-white/45" /><span className="w-[34%] bg-white" />
        </div>
        <ul className="mt-3 grid gap-1.5 text-sub">
          <li className="flex justify-between"><span className="flex items-center gap-2"><Sparkles size={14} />Lunch</span><span className="text-white/80">45m</span></li>
          <li className="flex justify-between"><span className="flex items-center gap-2"><Sparkles size={14} />Lounge rest</span><span className="text-white/80">55m</span></li>
        </ul>
      </Example>
    ),
  },
]

export function Welcome() {
  const { finishWelcome } = useApp()
  const [i, setI] = useState(0)
  const [drag, setDrag] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const last = i === SLIDES.length - 1
  const go = (n: number) => setI(Math.max(0, Math.min(SLIDES.length - 1, n)))
  // Both Skip and the final call to action finish onboarding: first-time visitors continue to Account Access, others into planning.
  const done = () => finishWelcome({ name: 'booking' })

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  const onDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY } }
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    if (Math.abs(dx) > Math.abs(e.clientY - start.current.y)) setDrag(dx)
  }
  const onUp = () => {
    if (start.current && Math.abs(drag) > 50) go(i + (drag < 0 ? 1 : -1))
    start.current = null; setDrag(0)
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-deep text-white" aria-roledescription="carousel" aria-label="Welcome to SkyStop">
      <div className="absolute inset-0 touch-pan-y" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ width: `${SLIDES.length * 100}%`, transform: `translateX(calc(${(-i * 100) / SLIDES.length}% + ${drag}px))`, transitionDuration: drag ? '0ms' : undefined }}>
          {SLIDES.map((s, n) => (
            <div key={s.headline} className="ph relative h-full flex-1" aria-hidden={n !== i}>
              <img src={sized(s.img, 900, 1800)} alt={s.img.alt} draggable={false}
                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className={cx('absolute inset-0 size-full select-none object-cover', n === i && 'anim-kenburns')} />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-deep via-deep/75 to-transparent" />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(80%_60%_at_15%_100%,rgb(234_81_57/0.4),transparent_70%)]" />
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none relative flex flex-1 flex-col px-6 pb-[calc(var(--safe-bottom)+1.25rem)] pt-[calc(var(--safe-top)+0.5rem)]">
        <div className="pointer-events-auto flex items-center justify-between">
          <span className="glass-dark flex min-h-11 items-center gap-2 rounded-full py-1.5 pl-3.5 pr-4 text-sub font-semibold">
            <SSMark className="h-[1.125rem] w-auto" />SkyStop
          </span>
          {!last && <button onClick={done} className="glass-dark press min-h-11 rounded-full px-5 text-sub font-semibold">Skip</button>}
        </div>

        <div key={i} className="anim-rise mt-auto" aria-live="polite">
          <div className="mb-6">{SLIDES[i].preview}</div>
          <h1 className="text-[2.375rem] font-bold leading-[1.05] tracking-[-0.03em]">{SLIDES[i].headline}</h1>
          <p className="mt-3 max-w-[21rem] text-body text-white/85">{SLIDES[i].body}</p>
        </div>

        <div className="pointer-events-auto mt-7 flex items-center gap-3">
          {i > 0
            ? <button onClick={() => go(i - 1)} aria-label="Back" className="glass-dark press grid size-14 shrink-0 place-items-center rounded-full"><ArrowLeft size={22} /></button>
            : null}
          <div className="flex flex-1 items-center justify-center gap-2" role="tablist" aria-label="Onboarding progress">
            {SLIDES.map((s, n) => (
              <button key={s.headline} role="tab" aria-selected={n === i} aria-label={`Screen ${n + 1} of ${SLIDES.length}`} onClick={() => go(n)}
                className="grid h-11 place-items-center px-0.5">
                <span className={cx('block h-2 rounded-full transition-all duration-300', n === i ? 'w-7 bg-white' : 'w-2 bg-white/40')} />
              </button>
            ))}
          </div>
          {last
            ? <button onClick={done} className="btn-coral press flex min-h-14 shrink-0 items-center gap-2 rounded-full pl-6 pr-2 text-[1.0625rem] font-bold">
                Get started<span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-white/20"><ArrowRight size={20} /></span></button>
            : <button onClick={() => go(i + 1)} className="btn-coral press flex min-h-14 shrink-0 items-center gap-2 rounded-full pl-6 pr-2 text-[1.0625rem] font-bold">
                Next<span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-white/20"><ArrowRight size={20} /></span></button>}
        </div>
      </div>
    </div>
  )
}
