import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, MotionConfig, MotionGlobalConfig, animate, motion, useReducedMotion, type Transition } from 'motion/react'
import { BedDouble, Check, Landmark, ShoppingBag, Utensils, type LucideIcon } from 'lucide-react'
import { useApp } from '../../store'
import { budget, fmtDur } from '../../data/time'
import { IMAGES, type Img } from '../../data/images'
import { Photo, cx } from '../../components/ui'
import { SSMark } from '../../components/SSMark'
import './onboarding.css'

/** First-use conversation (after the three intro slides): SkyStop talks, the visitor taps, SkyStop answers and moves on
 *  by itself. Two taps in total; no Next buttons; Skip → Account Access. Scripted and deterministic (no AI).
 *
 *  Finite states (one cancellable timeline; a tap is accepted only in an ask state, once):
 *    intro → askBooked → ackBooked → askExperience → ackExperience → time → closing → done (→ Account Access, or Home
 *    when the visitor already has a session).
 *
 *  Composition: one stage. SkyStop's current line sits centre stage and streams in letter by letter after a brief
 *  "thinking" pulse; when the talk moves on, the line lifts away and the next one streams in. The visitor's answers
 *  shrink into a trail of chips at the top (the tapped pill itself travels there). A soft coral light drifts with each
 *  phase. Reduced motion: same progression, text appears whole, changes are instant. */

type Phase = 'intro' | 'askBooked' | 'ackBooked' | 'askExperience' | 'ackExperience' | 'time' | 'closing'
type Booked = 'booked' | 'not-yet'
type Kind = 'dining' | 'shopping' | 'relaxation' | 'attractions'

const BOOKED: { v: Booked; label: string }[] = [{ v: 'booked', label: 'Yes, I’m booked' }, { v: 'not-yet', label: 'Not yet' }]
const ACK: Record<Booked, string> = { booked: 'Perfect. Let’s make the most of your layover.', 'not-yet': 'You can explore your options before booking.' }
const EXPERIENCES: { v: Kind; label: string; icon: LucideIcon; img: Img }[] = [
  { v: 'dining', label: 'Dining', icon: Utensils, img: IMAGES.activities.s1 },
  { v: 'shopping', label: 'Shopping', icon: ShoppingBag, img: IMAGES.venues['40000000-0000-4000-8000-000000000008'] ?? IMAGES.activities.l4 },
  { v: 'relaxation', label: 'Relaxation', icon: BedDouble, img: IMAGES.venues['20000000-0000-4000-8000-000000000006'] ?? IMAGES.activities.s3 },
  { v: 'attractions', label: 'Attractions', icon: Landmark, img: IMAGES.venues['20000000-0000-4000-8000-000000000004'] ?? IMAGES.activities.s2 },
]
/** Where the soft coral light sits in each phase (x %, y %): it drifts as the conversation moves. */
const GLOW: Record<Phase, [number, number]> = {
  intro: [20, 30], askBooked: [25, 40], ackBooked: [70, 35], askExperience: [80, 55], ackExperience: [55, 45], time: [35, 60], closing: [50, 50],
}

const SPRING: Transition = { type: 'spring', visualDuration: 0.45, bounce: 0.12 }
const EASE = [0.22, 1, 0.36, 1] as const
/** Pace (ms). Brief: tap feedback ≈ 200, an acknowledgement shortly after, nothing artificially long. */
const PACE = { think: 300, perChar: 17, hold: 420, feedback: 200, ackHold: 650, time: 2300, closing: 700 }

export function Onboarding() {
  const { finishWelcome } = useApp()
  const reduce = !!useReducedMotion()
  MotionGlobalConfig.instantAnimations = reduce
  useEffect(() => () => { MotionGlobalConfig.instantAnimations = false }, [])

  const [phase, setPhase] = useState<Phase>('intro')
  const [line, setLine] = useState<{ id: number; text: string } | null>(null)
  const [thinking, setThinking] = useState(false)
  const [booked, setBooked] = useState<Booked | null>(null)
  const [kind, setKind] = useState<Kind | null>(null)
  const [trail, setTrail] = useState<{ id: string; label: string }[]>([])
  const [leaving, setLeaving] = useState(false)
  const answer = useRef<((v: string) => void) | null>(null)
  const done = useRef(false)
  const finish = () => { if (done.current) return; done.current = true; finishWelcome({ name: 'discover' }) }
  const finishRef = useRef(finish); finishRef.current = finish

  useEffect(() => {
    const ctl = new AbortController(); const { signal } = ctl
    const quick = reduce ? 0.3 : 1
    const wait = (ms: number) => new Promise<void>((res, rej) => {
      if (signal.aborted) return rej(new Error('aborted'))
      const t = window.setTimeout(res, ms * quick)
      signal.addEventListener('abort', () => { clearTimeout(t); rej(new Error('aborted')) }, { once: true })
    })
    let id = 0
    /** SkyStop "thinks" for a moment, then the line streams in; resolves when it has finished streaming. */
    const say = async (text: string) => {
      if (!reduce) { setThinking(true); await wait(PACE.think); setThinking(false) }
      setLine({ id: id++, text })
      await wait(reduce ? 120 : text.length * PACE.perChar + 160)
    }
    const ask = () => new Promise<string>((res, rej) => {
      answer.current = res
      signal.addEventListener('abort', () => rej(new Error('aborted')), { once: true })
    })
    setPhase('intro'); setLine(null); setBooked(null); setKind(null); setTrail([])
    void (async () => {
      // Start once the launch splash (if any) has left the screen.
      if (document.documentElement.dataset.splash === 'on') {
        await new Promise<void>((res) => window.addEventListener('skystop:splash-done', () => res(), { once: true }))
      }
      await wait(220)
      await say('Hi, I’m SkyStop.')
      await wait(PACE.hold)
      setPhase('askBooked')
      const bookedAnswer = ask() // listening from the moment the question starts: an early tap counts
      await say('Already have a flight booked?')
      const b = (await bookedAnswer) as Booked
      await wait(PACE.feedback)
      setTrail((t) => [...t, { id: 'booked', label: BOOKED.find((x) => x.v === b)!.label }])
      setPhase('ackBooked')
      await say(ACK[b])
      await wait(PACE.ackHold)
      setPhase('askExperience')
      const kindAnswer = ask()
      await say('There’s more to a layover than waiting. What would you do first?')
      const k = (await kindAnswer) as Kind
      await wait(PACE.feedback + 120)
      const label = EXPERIENCES.find((x) => x.v === k)!.label
      setTrail((t) => [...t, { id: 'kind', label }])
      setPhase('ackExperience')
      await say(`Good choice. I’ll keep ${label.toLowerCase()} in mind.`)
      await wait(PACE.ackHold)
      setPhase('time')
      await say('Make every minute count.')
      await wait(PACE.time)
      await say(`That leaves time for ${label.toLowerCase()}, and more.`)
      await wait(PACE.hold + 300)
      setPhase('closing')
      await say('Ready when you are.')
      await wait(PACE.closing)
      setLeaving(true)
      await wait(320)
      finishRef.current()
    })().catch(() => { /* cancelled */ })
    return () => { ctl.abort(); answer.current = null }
  }, [reduce])

  /** A tap counts once, and only while SkyStop is waiting for it. */
  const reply = (v: string, set: () => void) => {
    if (!answer.current) return
    const r = answer.current; answer.current = null
    set(); r(v)
  }

  const [gx, gy] = GLOW[phase]
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <motion.div className="onb relative flex h-dvh flex-col overflow-hidden" aria-label="Welcome to SkyStop"
        animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 0.98 : 1 }} transition={{ duration: 0.32, ease: EASE }}>
        {/* A soft coral light that drifts with the conversation (no gloss: one blurred wash) */}
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0"
          initial={false} animate={{ background: `radial-gradient(85% 60% at ${gx}% ${gy}%, rgb(255 181 165 / 0.22), transparent 72%)` }}
          transition={{ duration: 1.4, ease: 'easeInOut' }} />

        <header className="relative z-10 mx-auto flex w-full max-w-[28rem] items-center justify-between px-5 pt-[calc(var(--safe-top)+0.5rem)]">
          <span className="flex min-h-11 items-center gap-2 text-card font-bold">
            <motion.span animate={thinking ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ duration: 0.7, repeat: thinking ? Infinity : 0 }}>
              <SSMark color="#ea5139" rearOpacity={0.35} className="h-6 w-auto" /></motion.span>SkyStop</span>
          <button type="button" onClick={finish} className="press min-h-11 rounded-full px-3 text-sub font-semibold text-muted-text active:bg-ink-tint">Skip</button>
        </header>

        <LayoutGroup>
          {/* The visitor's answers so far: the tapped pill travels up here and shrinks into a chip */}
          <ul aria-label="Your answers" className="relative z-10 mx-auto flex min-h-10 w-full max-w-[28rem] flex-wrap items-center gap-2 px-5 pt-2">
            <AnimatePresence>
              {trail.map((t) => (
                <motion.li key={t.id} layoutId={`pick-${t.id}`} className="flex items-center gap-1.5 bg-accent px-3 py-1.5 text-cap font-semibold text-white" style={{ borderRadius: 999 }}>
                  <Check size={13} strokeWidth={3} aria-hidden="true" />{t.label}</motion.li>))}
            </AnimatePresence>
          </ul>

          {/* The stage */}
          <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[28rem] flex-1 flex-col justify-center px-5 pb-[calc(var(--safe-bottom)+10vh)]">
            <motion.div layout="position" className="relative min-h-[5.5rem]">
              {/* One thing at a time: the previous line lifts away, then SkyStop "thinks", then the next line streams */}
              <AnimatePresence mode="wait" initial={false}>
                {thinking ? (
                  <motion.span key="thinking" aria-hidden="true" className="flex h-10 items-center gap-1.5"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                    {[0, 1, 2].map((k) => (
                      <motion.span key={k} className="size-2.5 rounded-full bg-accent" animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 0.75, repeat: Infinity, delay: k * 0.13 }} />))}
                  </motion.span>
                ) : line && (
                  <motion.div key={line.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -26, filter: 'blur(6px)', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}>
                    <Stream text={line.text} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <AnimatePresence mode="popLayout" initial={false}>
              {phase === 'askBooked' && !thinking && line?.text.startsWith('Already') && (
                <motion.div key="booked" role="group" aria-label="Already have a flight booked?" className="mt-6 flex flex-wrap gap-2.5"
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                  {BOOKED.filter((c) => !booked || c.v === booked).map((c, k) => (
                    <motion.button key={c.v} type="button" layoutId={booked === c.v ? 'pick-booked' : undefined}
                      onClick={() => reply(c.v, () => setBooked(c.v))} disabled={!!booked}
                      initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { ...SPRING, delay: 0.5 + 0.08 * k } }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }} whileTap={{ scale: 0.95 }} style={{ borderRadius: 999 }}
                      className={cx('press flex min-h-12 items-center gap-2 px-5 text-body font-semibold transition-colors duration-150',
                        booked === c.v ? 'bg-accent text-white' : 'onb-card text-ink')}>
                      {booked === c.v && <Check size={16} strokeWidth={3} aria-hidden="true" />}{c.label}
                    </motion.button>))}
                </motion.div>)}

              {phase === 'askExperience' && !thinking && line?.text.startsWith('There') && (
                <motion.ul key="experiences" aria-label="Airport experiences" className="mt-5 grid grid-cols-2 gap-2.5"
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}>
                  {EXPERIENCES.map((e, k) => {
                    const on = kind === e.v, off = !!kind && !on
                    return (
                      <motion.li key={e.v} initial={{ opacity: 0, y: 20, scale: 0.92, rotate: k % 2 ? 2 : -2 }}
                        animate={{ opacity: off ? 0.25 : 1, y: 0, scale: on ? 1.03 : off ? 0.96 : 1, rotate: 0, transition: kind ? { duration: 0.2 } : { ...SPRING, delay: 0.75 + 0.08 * k } }}>
                        <button type="button" onClick={() => reply(e.v, () => setKind(e.v))} disabled={!!kind} aria-pressed={on}
                          className={cx('onb-card press relative block h-[6.25rem] w-full overflow-hidden rounded-[1.25rem] text-left [@media(max-height:680px)]:h-[5rem]', on && 'ring-2 ring-accent')}>
                          <span className="ph absolute inset-0"><Photo img={e.img} w={180} h={100} className="absolute inset-0 size-full" /></span>
                          <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                          <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-sub font-semibold text-white"><e.icon size={15} aria-hidden="true" />{e.label}</span>
                          <AnimatePresence>{on && (
                            <motion.span key="ok" layoutId="pick-kind" initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="absolute right-2 top-2 grid size-7 place-items-center bg-accent text-white" style={{ borderRadius: 999 }}><Check size={15} strokeWidth={3} /></motion.span>)}
                          </AnimatePresence>
                        </button>
                      </motion.li>)
                  })}
                </motion.ul>)}

              {phase === 'time' && /^(Make|That)/.test(line?.text ?? '') && (
                <TimeDemo key="time" pick={EXPERIENCES.find((x) => x.v === kind)?.label} />
              )}
            </AnimatePresence>
          </main>
        </LayoutGroup>
      </motion.div>
    </MotionConfig>
  )
}

/** SkyStop's line, streamed in letter by letter with a coral caret (whole at once with reduced motion). */
function Stream({ text }: { text: string }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? text.length : 0)
  useEffect(() => {
    if (reduce) { setN(text.length); return }
    let i = 0
    const t = window.setInterval(() => { i += 1; setN(i); if (i >= text.length) window.clearInterval(t) }, PACE.perChar)
    return () => window.clearInterval(t)
  }, [text, reduce])
  return (
    <p className="text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-ink [@media(max-width:360px)]:text-[1.75rem]">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{text.slice(0, n)}{n < text.length && <span className="onb-caret onb-caret--inline" />}</span>
    </p>
  )
}

/** "Make every minute count": an example time budget that builds itself, 5h − 1h 30m = 3h 30m to explore (the
 *  planner's own budget rule); the result counts up and becomes the focus. Not the visitor's flight. */
function TimeDemo({ pick }: { pick?: string }) {
  const total = 300, buffer = 90
  const { usable } = budget(total, buffer, [])
  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, filter: 'blur(4px)', transition: { duration: 0.24 } }}
      aria-label={`Example: ${fmtDur(total)} layover minus ${fmtDur(buffer)} buffer leaves ${fmtDur(usable)} to explore`}
      className="onb-card mt-6 rounded-[1.5rem] px-5 py-4">
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
      {pick && <p className="mt-2 text-cap text-muted-text">Example layover · {pick} usually takes 30–60 min</p>}
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
