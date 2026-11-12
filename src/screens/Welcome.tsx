import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, animate, type Transition, type Variants } from 'motion/react'
import { Clock, Plane, ShoppingBag, Sparkles, Utensils } from 'lucide-react'
import { useApp } from '../store'
import { IMAGES, sized, type Img } from '../data/images'
import { Button, cx } from '../components/ui'
import { SSMark } from '../components/SSMark'
import { guestStore } from '../data/mock'

/** First-visit onboarding: three photographic screens. Skippable, swipeable, keyboard-operable.
 *  The floating previews are clearly marked examples; no personal or live flight data is shown.
 *
 *  Transitions: one glass card stays on screen and morphs (size, position, corners) between steps while its content
 *  crossfades through a blur; photos crossfade with a slow settle; headline and body dissolve out and sharpen in with a
 *  stagger. Reduced motion: every change is instant. */
interface Slide {
  img: Img; headline: string; body: string
  /** Content of the persistent glass card. */
  card: ReactNode
  /** Step 2: the card shrinks to a small tile and a second tile emerges from behind it. */
  compact?: boolean
  extra?: ReactNode
}

const Tag = () => <span className="rounded-full bg-white/18 px-2 py-0.5 text-tab font-semibold text-white/80">Example</span>

const SLIDES: Slide[] = [
  {
    img: IMAGES.onboarding.connection,
    headline: 'Your layover, reimagined.',
    body: 'Turn the hours between flights into something worth experiencing.',
    card: (
      <>
        <div className="flex items-center justify-between"><span className="text-cap text-white/75">Connection</span><Tag /></div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-h2 font-bold">CGK</span>
          <span className="h-px flex-1 border-t border-dashed border-white/45" />
          <span className="flex items-center gap-1 rounded-full bg-white/18 px-2.5 py-1 text-sub font-bold"><Plane size={14} className="-rotate-45" />SIN</span>
          <span className="h-px flex-1 border-t border-dashed border-white/45" />
          <span className="text-h2 font-bold">CDG</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sub text-white/85"><Clock size={15} />7h 10m layover in Singapore</p>
      </>
    ),
  },
  {
    img: IMAGES.onboarding.discover,
    headline: 'Discover what’s possible.',
    body: 'Explore dining, shopping, and experiences worth making time for.',
    compact: true,
    card: (
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-white/18"><Utensils size={18} /></span>
        <span className="min-w-0"><span className="block text-sub font-semibold">Dining</span><span className="block text-cap text-white/75">about 45 min</span></span>
      </div>
    ),
    extra: (
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-white/18"><ShoppingBag size={18} /></span>
        <span className="min-w-0"><span className="block text-sub font-semibold">Shopping</span><span className="block text-cap text-white/75">about 30 min</span></span>
      </div>
    ),
  },
  {
    img: IMAGES.onboarding.plan,
    headline: 'Make every minute count.',
    body: 'Build a plan around your available time, and keep it ready for your journey.',
    card: (
      <>
        <div className="flex items-center justify-between"><span className="text-cap text-white/75">Your plan</span><Tag /></div>
        <p className="mt-1 text-[2rem] font-bold leading-none tabular-nums">1h 50m <span className="text-sub font-semibold text-white/80">left</span></p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
          <span className="w-[30%] bg-white/45" /><span className="w-[34%] bg-white" />
        </div>
        <ul className="mt-3 grid gap-1.5 text-sub">
          <li className="flex justify-between"><span className="flex items-center gap-2"><Sparkles size={14} />Lunch</span><span className="text-white/80">45m</span></li>
          <li className="flex justify-between"><span className="flex items-center gap-2"><Sparkles size={14} />Lounge rest</span><span className="text-white/80">55m</span></li>
        </ul>
      </>
    ),
  },
]

/** Where the coral glow sits along the bottom edge on each step; it drifts between them. */
const GLOW_X = [15, 85, 45]

/** Motion: one gentle spring (≈0.75 s to settle, almost no overshoot) for shape and position; quick eases for dissolves. */
const SPRING: Transition = { type: 'spring', visualDuration: 0.75, bounce: 0.08 }
const EASE_OUT = [0.22, 1, 0.36, 1] as const
const OUT: Transition = { duration: 0.32, ease: [0.4, 0, 1, 1] }

/** Content that dissolves out (blur, slight shrink) and sharpens in from the direction of travel, after `delay`. */
const reveal = (delay: number, rise = 14): Variants => ({
  enter: (dir: number) => ({ opacity: 0, y: rise * dir, scale: 0.97, filter: 'blur(8px)' }),
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { ...SPRING, delay, opacity: { duration: 0.5, delay, ease: EASE_OUT }, filter: { duration: 0.5, delay, ease: EASE_OUT } } },
  exit: { opacity: 0, y: -6, scale: 0.98, filter: 'blur(6px)', transition: OUT },
})
const CARD_CONTENT = reveal(0.08, 10)
const HEADLINE = reveal(0.14)
const BODY = reveal(0.22)
const EXTRA: Variants = {
  enter: { opacity: 0, x: -36, y: -28, scale: 0.9, filter: 'blur(6px)' },
  show: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)', transition: { ...SPRING, delay: 0.12, opacity: { duration: 0.45, delay: 0.12 }, filter: { duration: 0.45, delay: 0.12 } } },
  exit: { opacity: 0, x: -36, y: -28, scale: 0.9, filter: 'blur(6px)', transition: OUT },
}
const NONE: Variants = { enter: {}, show: {}, exit: {} }

export function Welcome() {
  const { finishWelcome, go: navigate, account } = useApp()
  const reduce = !!useReducedMotion()
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const start = useRef<{ x: number; y: number } | null>(null)
  // Swipe feedback: the foreground follows the finger a little and dims; it springs back on release.
  const dragX = useMotionValue(0)
  const dragFade = useTransform(dragX, [-220, 0, 220], [0.55, 1, 0.55])
  const slide = SLIDES[i]
  const last = i === SLIDES.length - 1
  const go = (n: number) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, n))
    if (next === i) return
    setDir(next > i ? 1 : -1); setI(next)
  }
  // The introduction is optional: Skip returns to Home; Get started on the last step opens Plan a layover.
  const skip = () => finishWelcome({ name: 'discover' })
  const done = () => finishWelcome({ name: 'trip' })
  // Sign in: the email sign-in form on the account screen (one sign-in flow). Not now returns here.
  const signInNow = () => {
    guestStore.markWelcomed()
    navigate({ name: 'access', auth: 'signin' })
  }
  const v = (x: Variants) => (reduce ? NONE : x)
  const spring = reduce ? { duration: 0 } : SPRING

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })
  // Only the current photo is mounted, so fetch the others up front: a crossfade never lands on an empty frame.
  useEffect(() => { for (const s of SLIDES) { const im = new Image(); im.src = sized(s.img, 900, 1800) } }, [])

  const onDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY } }
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    if (Math.abs(dx) > Math.abs(e.clientY - start.current.y)) dragX.set(reduce ? 0 : dx * 0.25)
  }
  const onUp = (e: React.PointerEvent) => {
    const dx = start.current ? e.clientX - start.current.x : 0
    if (start.current && Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1))
    start.current = null
    void animate(dragX, 0, spring)
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-deep text-white" aria-roledescription="carousel" aria-label="Welcome to SkyStop">
      {/* Background: photos crossfade (the new one settles from a slight zoom); the overlays stay put for continuity. */}
      <div className="ph absolute inset-0 touch-pan-y" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.img key={i} src={sized(slide.img, 900, 1800)} alt={slide.img.alt} draggable={false}
            onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
            className="absolute inset-0 size-full select-none object-cover will-change-[opacity,transform]"
            custom={dir}
            variants={v({
              enter: (d: number) => ({ opacity: 0, scale: 1.1, x: 18 * d }),
              show: { opacity: 1, scale: 1, x: 0, transition: { opacity: { duration: 0.8, ease: EASE_OUT }, scale: { duration: 1.6, ease: [0.32, 0.72, 0, 1] }, x: { duration: 1.2, ease: EASE_OUT } } },
              exit: { opacity: 0, scale: 1.03, transition: { duration: 0.8, ease: 'easeInOut' } },
            })}
            initial="enter" animate="show" exit="exit" />
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/5 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-deep via-deep/75 to-transparent" />
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          initial={false} animate={{ background: `radial-gradient(80% 60% at ${GLOW_X[i]}% 100%, rgb(234 81 57 / 0.4), transparent 70%)` }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, ease: 'easeInOut' }} />
      </div>

      <div className="pointer-events-none relative flex flex-1 flex-col px-6 pb-[calc(var(--safe-bottom)+1.25rem)] pt-[calc(var(--safe-top)+0.5rem)]">
        <div className="pointer-events-auto flex min-h-11 items-center justify-between">
          <span className="flex min-h-11 items-center gap-2.5 text-h2 font-bold [text-shadow:0_1px_8px_rgb(0_0_0/0.35)]">
            <SSMark className="h-8 w-auto drop-shadow-[0_2px_8px_rgb(0_0_0/0.35)]" />SkyStop</span>
          <AnimatePresence initial={false}>
            {!last && (
              <motion.button key="skip" onClick={skip} className="glass-dark press min-h-11 rounded-full px-5 text-sub font-semibold"
                variants={v({ enter: { opacity: 0, filter: 'blur(6px)' }, show: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.4 } }, exit: { opacity: 0, filter: 'blur(6px)', transition: OUT } })}
                initial="enter" animate="show" exit="exit">Skip</motion.button>
            )}
          </AnimatePresence>
        </div>

        <motion.div className="mt-auto" style={{ x: dragX, opacity: dragFade }}>
          {/* The card: one object that stays on screen and morphs between steps. */}
          <div className={cx('relative mb-6 w-[min(19rem,100%)] [@media(max-height:640px)]:mb-4', slide.compact && 'h-[8.5rem] [@media(max-height:640px)]:h-[7.75rem]')}>
            <motion.div layout transition={spring} style={{ borderRadius: 24 }}
              className={cx('glass-dark relative overflow-hidden text-white', slide.compact ? 'w-[13rem] p-3' : 'w-full p-4')}>
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.div key={i} layout="position" custom={dir} variants={v(CARD_CONTENT)} initial="enter" animate="show" exit="exit">
                  {slide.card}
                </motion.div>
              </AnimatePresence>
            </motion.div>
            <AnimatePresence initial={false}>
              {slide.extra && (
                <motion.div key={`extra-${i}`} style={{ borderRadius: 24 }} className="glass-dark absolute bottom-0 right-0 w-[13rem] p-3 text-white"
                  variants={v(EXTRA)} initial="enter" animate="show" exit="exit">
                  {slide.extra}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div key={i} initial="enter" animate="show" exit="exit" custom={dir} variants={NONE}>
                <motion.h1 custom={dir} variants={v(HEADLINE)} className="text-display font-bold [@media(max-height:640px)]:text-[1.875rem]">{slide.headline}</motion.h1>
                <motion.p custom={dir} variants={v(BODY)} className="mt-3 max-w-[21rem] text-body text-white/85 [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:text-sub">{slide.body}</motion.p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div layout="position" transition={spring} className="pointer-events-auto mt-4 flex items-center justify-center gap-2 [@media(max-height:640px)]:mt-1" role="tablist" aria-label="Onboarding progress">
          {SLIDES.map((s, n) => (
            <button key={s.headline} role="tab" aria-selected={n === i} aria-label={`Screen ${n + 1} of ${SLIDES.length}`} onClick={() => go(n)}
              className="grid h-11 place-items-center px-0.5">
              <motion.span className="block h-2 rounded-full" initial={false} transition={spring}
                animate={{ width: n === i ? 28 : 8, backgroundColor: n === i ? 'rgb(255 255 255 / 1)' : 'rgb(255 255 255 / 0.4)' }} />
            </button>
          ))}
        </motion.div>
        {/* Both choices on every step: Get started moves through onboarding (and finishes it on the last step); Sign in opens
            the email sign-in form. Same pills as the app's action bar. A signed-in visitor replaying onboarding sees no Sign in. */}
        <div className="pointer-events-auto mt-2 grid grid-cols-[minmax(0,1fr)] gap-2.5 [@media(max-height:640px)]:mt-0 [@media(max-height:640px)]:gap-2">
          <Button className="w-full" onClick={last ? done : () => go(i + 1)}>Get started</Button>
          {account.status !== 'registered' && (
            <Button variant="secondary" className="w-full" onClick={signInNow}>Sign in</Button>
          )}
        </div>
      </div>
    </div>
  )
}
