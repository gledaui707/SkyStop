import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, MotionConfig, MotionGlobalConfig, animate, motion, useReducedMotion, type Transition } from 'motion/react'
import { BedDouble, Check, Landmark, ShoppingBag, Utensils, type LucideIcon } from 'lucide-react'
import { useApp } from '../../store'
import { budget, fmtDur } from '../../data/time'
import { IMAGES, type Img } from '../../data/images'
import { Photo, cx } from '../../components/ui'
import { SSMark } from '../../components/SSMark'
import './onboarding.css'

/** First-use onboarding as a short scripted conversation (no AI, no typing): SkyStop asks, the visitor taps an answer,
 *  SkyStop acknowledges and the conversation unfolds by itself into a preview of airport experiences and a time-budget
 *  demonstration, then hands over to Account Access. One tap in total; no Next buttons.
 *
 *  State machine (one async timeline, cancelled on unmount or Skip):
 *    intro → ask (choices) → picked (feedback ≈200 ms) → answered (reply) → ack → product preview → time preview →
 *    closing → done (→ Account Access, or Home when the visitor already has a session).
 *  Only the `ask` state accepts a tap, once; timers live in the timeline and are cleared with it.
 *
 *  Motion: SkyStop's newest line is large and reveals word by word after a short typing pulse; earlier lines shrink
 *  and drift up into a fade (layout animation), so the conversation is one evolving composition. The tapped choice
 *  fills coral, the other folds away, and the answer glides into place as the reply. Reduced motion: same progression,
 *  instant changes. */

type Answer = 'booked' | 'not-yet'
type Item =
  | { id: string; kind: 'bot'; text: string }
  | { id: string; kind: 'user'; text: string; choice: Answer }
  | { id: string; kind: 'typing' }
  | { id: string; kind: 'cards' }
  | { id: string; kind: 'time' }
const CHOICES: { v: Answer; label: string }[] = [
  { v: 'booked', label: 'Yes, I’m booked' },
  { v: 'not-yet', label: 'Not yet' },
]
const ACK: Record<Answer, string> = {
  booked: 'Perfect. Let’s make the most of your layover.',
  'not-yet': 'You can explore your options before booking.',
}

const SPRING: Transition = { type: 'spring', visualDuration: 0.45, bounce: 0.12 }
const EASE = [0.22, 1, 0.36, 1] as const
/** Pace of the conversation (ms). Short: it should read, not wait. */
const PACE = { typing: 420, perWord: 28, settle: 260, afterAnswer: 260, readShort: 450, cards: 1500, time: 2500, closing: 650 }

export function Onboarding() {
  const { finishWelcome } = useApp()
  const reduce = !!useReducedMotion()
  MotionGlobalConfig.instantAnimations = reduce
  useEffect(() => () => { MotionGlobalConfig.instantAnimations = false }, [])

  const [items, setItems] = useState<Item[]>([])
  const [asking, setAsking] = useState(false)
  const [picked, setPicked] = useState<Answer | null>(null)
  const [leaving, setLeaving] = useState(false)
  const answer = useRef<((v: Answer) => void) | null>(null)
  const done = useRef(false)
  const finish = () => { if (done.current) return; done.current = true; finishWelcome({ name: 'discover' }) }
  const finishRef = useRef(finish); finishRef.current = finish

  // The conversation: one cancellable timeline.
  useEffect(() => {
    const ctl = new AbortController()
    const { signal } = ctl
    const quick = reduce ? 0.25 : 1
    const wait = (ms: number) => new Promise<void>((res, rej) => {
      if (signal.aborted) return rej(new Error('aborted'))
      const t = window.setTimeout(res, ms * quick)
      signal.addEventListener('abort', () => { clearTimeout(t); rej(new Error('aborted')) }, { once: true })
    })
    const push = (it: Item) => setItems((xs) => [...xs, it])
    let n = 0
    const say = async (text: string) => {
      const id = `m${n++}`
      if (!reduce) { push({ id: `${id}-typing`, kind: 'typing' }); await wait(PACE.typing) }
      setItems((xs) => [...xs.filter((x) => x.kind !== 'typing'), { id, kind: 'bot', text }])
      await wait(PACE.settle + text.split(' ').length * PACE.perWord)
    }
    setItems([]); setAsking(false); setPicked(null)
    // Start once the launch splash has left the screen, so the first line is seen as it arrives.
    const splashGone = () => new Promise<void>((res) => {
      if (document.documentElement.dataset.splash !== 'on') return res()
      const on = () => res()
      window.addEventListener('skystop:splash-done', on, { once: true })
      signal.addEventListener('abort', () => window.removeEventListener('skystop:splash-done', on), { once: true })
    })
    void (async () => {
      await splashGone()
      await wait(250)
      await say('Hi, I’m SkyStop.')
      await wait(PACE.readShort)
      await say('Already have a flight booked?')
      setAsking(true)
      const v = await new Promise<Answer>((res, rej) => {
        answer.current = res
        signal.addEventListener('abort', () => rej(new Error('aborted')), { once: true })
      })
      await wait(210) // the tapped choice fills coral; the other folds away
      setAsking(false)
      push({ id: 'answer', kind: 'user', text: CHOICES.find((c) => c.v === v)!.label, choice: v })
      await wait(PACE.afterAnswer)
      await say(ACK[v])
      await wait(PACE.readShort)
      await say('There’s more to a layover than waiting.')
      push({ id: 'cards', kind: 'cards' })
      await wait(PACE.cards)
      await say('Make every minute count.')
      push({ id: 'time', kind: 'time' })
      await wait(PACE.time)
      await say('Ready when you are.')
      await wait(PACE.closing)
      setLeaving(true)
      await wait(320)
      finishRef.current()
    })().catch(() => { /* cancelled */ })
    return () => { ctl.abort(); answer.current = null }
  }, [reduce])

  const choose = (v: Answer) => {
    if (!answer.current || picked) return // only once, only while asking
    setPicked(v)
    answer.current(v); answer.current = null
  }

  const lastBot = items.reduce((k, it, i) => (it.kind === 'bot' ? i : k), -1)
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <motion.div className="onb relative flex h-dvh flex-col overflow-hidden" aria-label="Welcome to SkyStop"
        animate={{ opacity: leaving ? 0 : 1, y: leaving ? -12 : 0 }} transition={{ duration: 0.3, ease: EASE }}>
        <header className="relative z-10 mx-auto flex w-full max-w-[28rem] items-center justify-between px-5 pt-[calc(var(--safe-top)+0.5rem)]">
          <span className="flex min-h-11 items-center gap-2 text-card font-bold"><SSMark color="#ea5139" rearOpacity={0.35} className="h-6 w-auto" />SkyStop</span>
          <button type="button" onClick={finish} className="press min-h-11 rounded-full px-3 text-sub font-semibold text-muted-text active:bg-ink-tint">Skip</button>
        </header>

        {/* The conversation, anchored low; earlier lines drift up into the fade at the top */}
        <main className="onb-thread relative mx-auto flex min-h-0 w-full max-w-[28rem] flex-1 flex-col justify-end px-5 pb-[calc(var(--safe-bottom)+2rem)]"
          aria-live="polite" aria-relevant="additions">
          <LayoutGroup>
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((it, i) => {
                const past = i < lastBot
                if (it.kind === 'typing') return <Typing key={it.id} />
                if (it.kind === 'bot') return <Line key={it.id} text={it.text} current={i === lastBot} past={past} />
                if (it.kind === 'user') return (
                  <motion.div key={it.id} layout="position" className="mt-3 flex justify-end" initial={{ opacity: 0, x: -28, y: 18, scale: 0.94 }}
                    animate={{ opacity: past ? 0.55 : 1, x: 0, y: 0, scale: 1 }} style={{ transformOrigin: 'right bottom' }}>
                    <p className="rounded-full bg-accent px-4 py-2.5 text-body font-semibold text-white">{it.text}</p>
                  </motion.div>)
                if (it.kind === 'cards') return <Experiences key={it.id} past={past} />
                return <TimeDemo key={it.id} past={past} />
              })}
            </AnimatePresence>

            {/* The question's choices: tap one; it fills coral, the other folds away, then it travels into the reply */}
            <AnimatePresence initial={false}>
              {asking && (
                <motion.div key="choices" layout="position" role="group" aria-label="Already have a flight booked?" className="mt-5 grid gap-2.5"
                  exit={{ opacity: 0, y: 10, transition: { duration: 0.14 } }}>
                  <AnimatePresence initial={false}>
                    {CHOICES.filter((c) => !picked || c.v === picked).map((c, k) => (
                      <motion.button key={c.v} type="button" layout="position" onClick={() => choose(c.v)} disabled={!!picked}
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { ...SPRING, delay: 0.08 * k } }}
                        exit={{ opacity: 0, scale: 0.96, y: -6, transition: { duration: 0.16 } }}
                        whileTap={{ scale: 0.97 }} style={{ borderRadius: 999 }}
                        className={cx('press flex min-h-14 items-center justify-between gap-3 px-5 text-left text-body font-semibold transition-colors duration-150',
                          picked === c.v ? 'bg-accent text-white' : 'onb-card text-ink')}>
                        {c.label}
                        <span className={cx('grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150', picked === c.v ? 'border-white bg-white text-accent' : 'border-ink/20')}>
                          {picked === c.v && <Check size={14} strokeWidth={3} />}</span>
                      </motion.button>))}
                  </AnimatePresence>
                </motion.div>)}
            </AnimatePresence>
          </LayoutGroup>
        </main>
      </motion.div>
    </MotionConfig>
  )
}

/** SkyStop's line. The newest is large and reveals word by word; earlier ones shrink and soften as the talk moves on. */
function Line({ text, current, past }: { text: string; current: boolean; past: boolean }) {
  return (
    <motion.p layout="position" initial={{ opacity: 0, y: 16 }} animate={{ opacity: past ? 0.42 : 1, y: 0 }} exit={{ opacity: 0 }}
      className={cx('origin-left font-bold text-ink transition-[font-size,line-height,letter-spacing] duration-300 ease-out',
        current ? 'mt-5 text-[1.875rem] leading-[1.1] tracking-[-0.03em] [@media(max-width:360px)]:text-[1.625rem]' : 'mt-3 text-[1.125rem] leading-snug tracking-[-0.01em]')}>
      {text.split(' ').map((w, k) => (
        <motion.span key={k} className="inline-block whitespace-pre" initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.32, delay: 0.028 * k, ease: EASE }}>{w}{' '}</motion.span>))}
    </motion.p>
  )
}

/** SkyStop is "typing": three coral dots, briefly. */
function Typing() {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}
      className="mt-5 flex h-9 items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((k) => (
        <motion.span key={k} className="size-2.5 rounded-full bg-accent" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: k * 0.14, ease: 'easeInOut' }} />))}
    </motion.div>
  )
}

/** "There's more to a layover than waiting": four kinds of airport experience, dealt in like cards. */
const EXPERIENCES: { label: string; icon: LucideIcon; img: Img }[] = [
  { label: 'Dining', icon: Utensils, img: IMAGES.activities.s1 },
  { label: 'Shopping', icon: ShoppingBag, img: IMAGES.venues['40000000-0000-4000-8000-000000000008'] ?? IMAGES.activities.l4 },
  { label: 'Relaxation', icon: BedDouble, img: IMAGES.venues['20000000-0000-4000-8000-000000000006'] ?? IMAGES.activities.s3 },
  { label: 'Attractions', icon: Landmark, img: IMAGES.venues['20000000-0000-4000-8000-000000000004'] ?? IMAGES.activities.s2 },
]
function Experiences({ past }: { past: boolean }) {
  return (
    <motion.ul layout="position" aria-label="Airport experiences" className="mt-4 grid grid-cols-2 gap-2.5" animate={{ opacity: past ? 0.42 : 1 }}>
      {EXPERIENCES.map((e, k) => (
        <motion.li key={e.label} initial={{ opacity: 0, y: 18, scale: 0.92, rotate: k % 2 ? 2 : -2 }} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
          transition={{ ...SPRING, delay: 0.12 + 0.09 * k }}
          className="onb-card relative h-[5.25rem] overflow-hidden rounded-[1.25rem] [@media(max-height:680px)]:h-[4.25rem]">
          <span className="ph absolute inset-0"><Photo img={e.img} w={180} h={84} className="absolute inset-0 size-full" /></span>
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-sub font-semibold text-white">
            <e.icon size={15} aria-hidden="true" />{e.label}</span>
        </motion.li>))}
    </motion.ul>
  )
}

/** "Make every minute count": an example time budget that builds itself. 5h layover − 1h 30m buffer = 3h 30m to
 *  explore (the planner's own budget rule); the result counts up and becomes the focus. Not the visitor's flight. */
function TimeDemo({ past }: { past: boolean }) {
  const total = 300, buffer = 90
  const { usable } = budget(total, buffer, [])
  return (
    <motion.div layout="position" initial={{ opacity: 0, y: 16 }} animate={{ opacity: past ? 0.42 : 1, y: 0 }}
      aria-label={`Example: ${fmtDur(total)} layover minus ${fmtDur(buffer)} buffer leaves ${fmtDur(usable)} to explore`}
      className="onb-card mt-4 rounded-[1.5rem] px-5 py-4">
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-ink/5" aria-hidden="true">
        <motion.span className="h-full rounded-l-full bg-accent" initial={{ width: '0%' }} animate={{ width: `${(usable / total) * 100}%` }} transition={{ duration: 0.6, delay: 0.85, ease: EASE }} />
        <motion.span className="onb-hatch h-full flex-1 rounded-r-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.45 }} />
      </div>
      <dl className="mt-3 grid gap-1 text-sub">
        <motion.div className="flex items-baseline justify-between" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <dt className="text-muted-text">Layover</dt><dd className="font-semibold tabular-nums">{fmtDur(total)}</dd></motion.div>
        <motion.div className="flex items-baseline justify-between" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
          <dt className="text-muted-text">Planning buffer</dt><dd className="font-semibold tabular-nums">− {fmtDur(buffer)}</dd></motion.div>
        <motion.div className="mt-1 flex items-baseline justify-between border-t border-line pt-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
          <dt className="text-body font-semibold">To explore</dt>
          <dd className="text-[2.25rem] font-bold leading-none tracking-[-0.03em] text-accent-dark"><CountUp to={usable} delay={0.85} /></dd>
        </motion.div>
      </dl>
    </motion.div>
  )
}

function CountUp({ to, delay }: { to: number; delay: number }) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? to : 0)
  useEffect(() => {
    if (reduce) { setV(to); return }
    const c = animate(0, to, { duration: 0.9, delay, ease: EASE, onUpdate: setV })
    return () => c.stop()
  }, [to, delay, reduce])
  return <span className="tabular-nums">{fmtDur(v)}</span>
}
