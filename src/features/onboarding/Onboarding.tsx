import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, MotionConfig, MotionGlobalConfig, animate, motion, useMotionValue, useReducedMotion, useTransform, type Transition, type Variants } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Clock, Hand, Plane } from 'lucide-react'
import { useApp } from '../../store'
import { findSampleJourney, type ResolvedJourney } from '../../data/journeys'
import { airportInfo } from '../../data/airportDirectory'
import { getActivities } from '../../data/mock'
import { BUFFER_OPTIONS, budget, fmtDur } from '../../data/time'
import { computeItinerary } from '../../data/itinerary'
import type { Activity } from '../../data/types'
import { Photo, cx } from '../../components/ui'
import { SSMark } from '../../components/SSMark'
import './onboarding.css'

/** First-use onboarding: three interactive steps on an example journey, before the visitor adds their own booking.
 *  Each step has one task and the next unlocks when it is done:
 *   1 Your layover, reimagined.   drag the plane to the connecting airport: landing reveals the connection
 *   2 Know your time to explore.  choose a planning buffer: the time to explore counts to its value
 *   3 Find your next experience.  tap activities: the time left counts down; fits / over
 *  Then "Get started" → Account Access (when due) → the booking-reference screen.
 *  The example is one of the app's sample journeys (AXR7KD) and real catalogue activities, using the planner's own
 *  rules (`budget`, `computeItinerary`); it is labelled as an example and nothing is saved.
 *  Motion: one card carries the example through the steps and folds into a time strip; numbers count; soft springs.
 *  Reduced motion: instant. */

const STEPS = [
  { title: 'Your layover, reimagined.', label: 'Your layover' },
  { title: 'Know your time to explore.', label: 'Your time' },
  { title: 'Find your next experience.', label: 'Experiences' },
] as const
const LAST = STEPS.length - 1
const EXAMPLE_REF = 'AXR7KD'

const SPRING: Transition = { type: 'spring', visualDuration: 0.5, bounce: 0.12 }
const EASE = [0.22, 1, 0.36, 1] as const
const city = (code: string) => airportInfo(code)?.city ?? ({ SIN: 'Singapore', LIS: 'Lisbon', LHR: 'London', DXB: 'Dubai' } as Record<string, string>)[code] ?? code
const hhmm = (local: string) => local.slice(11, 16)
const dayOf = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

const PART: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  show: (i: number = 0) => ({ opacity: 1, y: 0, filter: 'blur(0px)', transition: { ...SPRING, delay: 0.06 * i, opacity: { duration: 0.35, delay: 0.06 * i }, filter: { duration: 0.35, delay: 0.06 * i } } }),
  exit: { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
}
const partProps = (i = 0) => ({ variants: PART, custom: i, initial: 'hidden', animate: 'show', exit: 'exit' } as const)
/** Parts of the card unfold (height and opacity), so the card itself grows and shrinks with its content. */
const FOLD: Variants = {
  hidden: { opacity: 0, height: 0 },
  show: (i: number = 0) => ({ opacity: 1, height: 'auto', transition: { height: { duration: 0.5, ease: EASE }, opacity: { duration: 0.3, delay: 0.03 * i } } }),
  exit: { opacity: 0, height: 0, transition: { height: { duration: 0.38, ease: EASE }, opacity: { duration: 0.15 } } },
}
const foldProps = (i = 0) => ({ variants: FOLD, custom: i, initial: 'hidden', animate: 'show', exit: 'exit', className: 'overflow-hidden' } as const)

/** A duration that counts to its new value (from `from` on first show). */
function Dur({ min, from, className }: { min: number; from?: number; className?: string }) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(from ?? min)
  const cur = useRef(from ?? min)
  useEffect(() => {
    if (reduce) { cur.current = min; setV(min); return }
    const c = animate(cur.current, min, { duration: from !== undefined && cur.current === from ? 1 : 0.6, ease: EASE, onUpdate: (x) => { cur.current = x; setV(x) } })
    return () => c.stop()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, reduce])
  return <span className={cx('tabular-nums', className)}>{fmtDur(v)}</span>
}

/** Up to four activities to try: airside or not yet confirmed (no border crossing), mixed categories. */
function sampleActivities(code: string): Activity[] {
  const byCat = new Map<string, Activity[]>()
  for (const a of getActivities(code).filter((x) => x.access !== 'Landside')) byCat.set(a.category, [...(byCat.get(a.category) ?? []), a])
  const out: Activity[] = []
  for (let round = 0; out.length < 4 && round < 6; round++) for (const list of byCat.values()) if (list[round] && out.length < 4) out.push(list[round])
  return out
}
const BUFFER_NOTE: Record<number, string> = { 90: 'Quick: short transfers', 120: 'Balanced: suits most connections', 180: 'Relaxed: plenty of margin' }

export function Onboarding() {
  const { finishWelcome, catalogue } = useApp()
  const reduce = !!useReducedMotion()
  // Reduced motion: every change is instant (no fades, slides, count-ups or unfolding) while the onboarding is open.
  MotionGlobalConfig.instantAnimations = reduce
  useEffect(() => () => { MotionGlobalConfig.instantAnimations = false }, [])
  const journey = useMemo(() => findSampleJourney(EXAMPLE_REF)!, [])
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [landed, setLanded] = useState(false)
  const [buffer, setBuffer] = useState<number | null>(null)
  const [picked, setPicked] = useState<string[]>([])

  const done = [landed, buffer !== null, picked.length > 0]
  const reachable = (n: number) => n <= 0 || done.slice(0, n).every(Boolean)
  const go = (n: number) => {
    const next = Math.max(0, Math.min(LAST, n))
    if (next === step || !reachable(next)) return
    setDir(next > step ? 1 : -1); setStep(next); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  // Time: the planner's own budget and itinerary engine, on the example journey.
  const buf = buffer ?? journey.layover.bufferMin
  const b = budget(journey.layover.totalMin, buf, [])
  const ready = catalogue.status === 'ready'
  const acts = useMemo(() => (ready ? sampleActivities(journey.connection) : []), [journey, ready])
  const plan = ready ? computeItinerary({ airport: journey.connection, arrival: journey.layover.arrivalLocal, departure: journey.layover.departureLocal, bufferMin: buf, activityIds: picked }) : null
  const remaining = plan ? plan.hero.remaining : b.usable
  const fit = !picked.length ? 'none' : plan && (plan.hero.time === 'exceeds' || remaining < 0) ? 'over' : plan?.hero.time === 'tight' ? 'tight' : 'fits'
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  // After the onboarding: add your own booking (through Account Access when it is due).
  const finish = () => finishWelcome({ name: 'booking' })

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(step - 1)
      if (e.key === 'ArrowRight') go(step + 1)
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  const conn = city(journey.connection)
  const sub = [
    landed ? `You land in ${conn}. Your next flight leaves later.` : `Drag the plane to ${conn}.`,
    'How much time should we keep for the airport?',
    fit === 'over' ? 'A little over your time. Tap one to remove it.' : 'Tap what you’d like to do.',
  ][step]
  const hint = [`Drag the plane to ${conn}`, 'Choose a buffer', 'Tap one or two'][step]
  const cta = step === LAST ? 'Get started' : 'Next'
  const announce = step === 0 && landed ? `Landed in ${conn} at ${hhmm(journey.layover.arrivalLocal)}. ${fmtDur(journey.layover.totalMin)} connection.`
    : step === 1 && buffer !== null ? `${fmtDur(b.usable)} to explore.`
    : step === 2 && picked.length ? `${fmtDur(remaining)} left. ${fit === 'over' ? 'Over your time.' : 'Fits your time.'}` : ''

  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <div className="onb relative flex min-h-dvh flex-col" aria-label="Welcome to SkyStop">
        <header className="sticky top-0 z-20 bg-canvas/90 px-4 pb-1 pt-[calc(var(--safe-top)+0.5rem)] backdrop-blur-md">
          <div className="mx-auto flex max-w-[28rem] items-center justify-between gap-3">
            <div className="flex min-h-11 items-center">
              <AnimatePresence mode="popLayout" initial={false}>
                {step === 0 ? (
                  <motion.span key="brand" {...partProps()} className="flex items-center gap-2 text-card font-bold">
                    <SSMark color="#ea5139" rearOpacity={0.35} className="h-6 w-auto" />SkyStop</motion.span>
                ) : (
                  <motion.button key="back" {...partProps()} type="button" onClick={() => go(step - 1)} aria-label="Back"
                    className="press -ml-1 grid size-11 place-items-center rounded-full text-ink active:bg-ink-tint"><ArrowLeft size={22} /></motion.button>
                )}
              </AnimatePresence>
            </div>
            <button type="button" onClick={finish} className="press min-h-11 rounded-full px-3 text-sub font-semibold text-muted-text active:bg-ink-tint">Skip</button>
          </div>
          <ol aria-label="Onboarding progress" className="mx-auto flex max-w-[28rem] gap-1.5 px-1">
            {STEPS.map((st, n) => (
              <li key={st.label} className="flex-1">
                <button type="button" onClick={() => go(n)} disabled={!reachable(n)} aria-current={n === step ? 'step' : undefined}
                  aria-label={`Step ${n + 1} of ${STEPS.length}: ${st.label}`} className="flex h-6 w-full items-center disabled:cursor-default">
                  <span className="block h-1 w-full overflow-hidden rounded-full bg-ink/10">
                    <motion.span className="block h-full origin-left rounded-full bg-accent" initial={false} animate={{ scaleX: n <= step ? 1 : 0 }} />
                  </span>
                </button>
              </li>))}
          </ol>
        </header>

        <main className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col px-5 pb-4">
          <div className="relative mt-3 min-h-[7.25rem] [@media(max-height:680px)]:min-h-[6rem]">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div key={step} custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: 28 * d, filter: 'blur(6px)' }),
                  show: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { ...SPRING, opacity: { duration: 0.4 }, filter: { duration: 0.4 } } },
                  out: (d: number) => ({ opacity: 0, x: -20 * d, filter: 'blur(6px)', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }),
                }}
                initial="enter" animate="show" exit="out">
                <h1 className="text-[2.25rem] font-bold leading-[1.04] tracking-[-0.035em] [@media(max-width:360px)]:text-[1.95rem] [@media(max-height:680px)]:text-[1.95rem]">{STEPS[step].title}</h1>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.p key={sub} {...partProps(1)} className="mt-2 text-body text-muted-text">{sub}</motion.p>
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>

          <LayoutGroup>
            {/* The card: the example journey, then its layover; on step 3 a compact time strip */}
            <div className={cx(step === 2 && 'sticky top-[calc(var(--safe-top)+5.25rem)] z-10')}>
              <section aria-label={['Your journey', 'Your layover', 'Your time'][step]} style={{ borderRadius: 28 }}
                className="onb-card relative mt-4 overflow-hidden px-5 py-4">
                <AnimatePresence initial={false}>
                  {step < 2 && (
                    <motion.div key="tag" {...foldProps()}><p className="pb-3 text-cap font-semibold uppercase tracking-[0.08em] text-muted-text">Example journey · {journey.ref}</p></motion.div>
                  )}
                  {step === 0 && (
                    <motion.div key="fly" {...foldProps()}><div className="py-1"><FlyCard j={journey} landed={landed} onLand={() => setLanded(true)} /></div></motion.div>
                  )}
                  {step === 1 && (
                    <motion.div key="layover" {...foldProps()}><div className="py-1">
                      <RouteRow j={journey} big={false} />
                      <div className="mt-4"><Layover j={journey} total={b.total} buffer={buffer} usable={b.usable} /></div>
                    </div></motion.div>
                  )}
                  {step === 2 && (
                    <motion.div key="strip" {...foldProps()}><div className="py-1">
                      <TimeStrip usable={b.usable} remaining={remaining} fit={fit} city={conn} />
                    </div></motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>

            {/* The step's question */}
            <AnimatePresence mode="popLayout" initial={false}>
              {step === 1 && (
                <motion.fieldset key="buffer" {...partProps(1)} className="mt-5">
                  <legend className="sr-only">Planning buffer</legend>
                  <div role="radiogroup" aria-label="Planning buffer" className="grid gap-2">
                    {BUFFER_OPTIONS.map((m, k) => {
                      const on = buffer === m
                      return (
                        <motion.button key={m} type="button" role="radio" aria-checked={on} onClick={() => setBuffer(m)} {...partProps(k + 2)} whileTap={{ scale: 0.98 }}
                          className={cx('onb-card press relative flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left', on && 'ring-2 ring-inset ring-accent')}>
                          <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-card font-bold tabular-nums">{fmtDur(m)}</span>
                          <span className="min-w-0 flex-1 text-sub text-muted-text">{BUFFER_NOTE[m] ?? ''}{m === journey.layover.bufferMin && <span className="ml-1.5 rounded-full bg-accent-tint px-2 py-0.5 text-micro font-semibold text-accent-dark">Suggested</span>}</span>
                          <span className={cx('grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors', on ? 'border-accent bg-accent text-white' : 'border-ink/20')}>
                            {on && <Check size={14} strokeWidth={3} />}</span>
                        </motion.button>)
                    })}
                  </div>
                  <p className="mt-2 text-cap text-muted-text">Time kept for transfers and boarding. Your flights stay the same.</p>
                </motion.fieldset>
              )}
              {step === 2 && (
                <motion.section key="acts" aria-label={`Activities in ${conn}`} {...partProps(1)} className="mt-4">
                  {catalogue.status === 'error' && <p className="text-sub text-muted-text">Activities could not be loaded right now. You can still get started.</p>}
                  {catalogue.status === 'loading' && <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((k) => <span key={k} className="block h-44 rounded-[1.25rem] bg-ink-tint motion-safe:animate-pulse" />)}</div>}
                  <ul className="grid grid-cols-2 gap-3">
                    {acts.map((a, k) => (
                      <motion.li key={a.id} {...partProps(k + 2)}>
                        <ActivityCard a={a} order={picked.indexOf(a.id) + 1} onToggle={() => toggle(a.id)} />
                      </motion.li>))}
                  </ul>
                </motion.section>
              )}
            </AnimatePresence>
          </LayoutGroup>
          <p className="sr-only" aria-live="polite">{announce}</p>
        </main>

        {/* One action, revealed when the step's task is done; until then, what to do */}
        <footer className="sticky bottom-0 z-10 bg-gradient-to-t from-canvas from-70% to-canvas/0 px-5 pb-[calc(var(--safe-bottom)+1rem)] pt-5">
          <div className="mx-auto grid min-h-[3.25rem] w-full max-w-[28rem]">
            <AnimatePresence mode="wait" initial={false}>
              {done[step] || (step === LAST && catalogue.status === 'error') ? (
                <motion.button key={`cta-${step}`} type="button" onClick={step === LAST ? finish : () => go(step + 1)}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                  className="btn-coral press inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full text-card font-bold">
                  {cta}<ArrowRight size={20} aria-hidden="true" /></motion.button>
              ) : (
                <motion.p key={`hint-${step}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  className="flex min-h-[3.25rem] items-center justify-center gap-2 text-sub font-medium text-muted-text">
                  <motion.span animate={reduce ? undefined : { y: [0, -3, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}><Hand size={17} aria-hidden="true" /></motion.span>{hint}</motion.p>
              )}
            </AnimatePresence>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}

/** Step 1: drag the plane along the first flight to the connecting airport (or tap it to fly). Landing reveals the
 *  arrival time, the onward flight and the connection, which counts up. */
function FlyCard({ j, landed, onLand }: { j: ResolvedJourney; landed: boolean; onLand: () => void }) {
  const track = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [max, setMax] = useState(0)
  const [touched, setTouched] = useState(false)
  const dragged = useRef(false)
  useLayoutEffect(() => {
    const measure = () => setMax(Math.max(0, (track.current?.offsetWidth ?? 0) - 48))
    measure()
    const ro = new ResizeObserver(measure); if (track.current) ro.observe(track.current)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { if (landed) x.set(max) }, [landed, max, x])
  const fill = useTransform(x, (v) => (max ? (v + 24) / (max + 48) : 0))
  const land = () => { void animate(x, max, { duration: 0.35, ease: EASE }).then(onLand) }
  const fly = () => { setTouched(true); void animate(x, max, { duration: 1.1, ease: [0.45, 0, 0.2, 1] }).then(onLand) }
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[1.625rem] font-bold leading-none tracking-[-0.02em]">{j.origin}</p><p className="mt-1.5 text-cap text-muted-text">{city(j.origin)} · {hhmm(j.legs[0].departLocal)}</p></div>
        <div className="text-right">
          <motion.p animate={landed ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 0.45 }}
            className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[1.625rem] font-bold leading-none tracking-[-0.02em] transition-colors', landed ? 'bg-accent text-white' : 'bg-ink-tint text-ink')}>
            {j.connection}</motion.p>
          <p className="mt-1.5 text-cap text-muted-text">{city(j.connection)}</p>
        </div>
      </div>
      {/* The flight: a dashed path that fills with coral behind the plane */}
      <div ref={track} className="relative mt-3 h-[4.5rem]">
        <span className="absolute inset-x-6 top-1/2 -translate-y-1/2"><span className="onb-path block"><motion.i style={{ scaleX: fill }} /></span></span>
        <motion.button type="button" aria-label={landed ? `Landed in ${city(j.connection)}` : `Fly to ${city(j.connection)}`} disabled={landed}
          drag={landed ? false : 'x'} dragConstraints={{ left: 0, right: max }} dragElastic={0.04} dragMomentum={false} style={{ x }}
          onDragStart={() => { dragged.current = true; setTouched(true) }}
          onDragEnd={() => { if (x.get() > max * 0.72) land(); else void animate(x, 0, { type: 'spring', visualDuration: 0.4, bounce: 0.2 }) }}
          onClick={() => { if (dragged.current) { dragged.current = false; return } if (!landed) fly() }}
          whileTap={{ scale: 0.92 }}
          className="absolute left-0 top-3 grid size-12 cursor-grab touch-none place-items-center rounded-full bg-accent text-white shadow-[0_6px_16px_-4px_rgb(234_81_57/0.6)] active:cursor-grabbing disabled:cursor-default">
          <motion.span animate={!touched && !landed ? { x: [0, 5, 0] } : { x: 0 }} transition={{ duration: 1.2, repeat: !touched && !landed ? Infinity : 0, ease: 'easeInOut' }}>
            <Plane size={22} className="rotate-45" aria-hidden="true" /></motion.span>
        </motion.button>
      </div>
      <AnimatePresence initial={false}>
        {landed && (
          <motion.div key="landed" {...foldProps()}>
            <div className="pt-4">
              <div className="flex items-end justify-between gap-3">
                <div><p className="text-cap text-muted-text">Landed</p><p className="text-h2 font-bold leading-tight tabular-nums">{hhmm(j.layover.arrivalLocal)}</p><p className="text-cap text-muted-text">{dayOf(j.layover.arrivalLocal)}</p></div>
                <div className="text-right"><p className="text-cap text-muted-text">Next flight · {j.destination}</p><p className="text-h2 font-bold leading-tight tabular-nums">{hhmm(j.layover.departureLocal)}</p><p className="text-cap text-muted-text">{dayOf(j.layover.departureLocal)}</p></div>
              </div>
              <p className="mt-3 flex items-center justify-between rounded-2xl bg-accent-tint px-4 py-3">
                <span className="flex items-center gap-2 text-sub font-semibold"><Clock size={17} className="text-accent-dark" aria-hidden="true" />Connection</span>
                <span className="whitespace-nowrap text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-accent-dark [@media(max-width:360px)]:text-[1.5rem]"><Dur min={j.layover.totalMin} from={0} /></span>
              </p>
            </div>
          </motion.div>)}
      </AnimatePresence>
    </div>
  )
}

/** Origin → connection → destination. Without a booking: quiet placeholders. On a match, the codes land and the two
 *  flight paths draw in coral, one after the other. */
function RouteRow({ j, big }: { j: ResolvedJourney | null; big: boolean }) {
  const code = (c: string | undefined, label: string, conn = false, i = 0) => (
    <div className={cx('flex min-w-0 flex-col', conn ? 'items-center' : i === 2 ? 'items-end' : 'items-start')}>
      <AnimatePresence mode="popLayout" initial={false}>
        {c ? (
          <motion.span key={c} initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ ...SPRING, delay: 0.12 * i }}
            className={cx('font-bold tracking-[-0.02em]', big ? 'text-[1.625rem] leading-none' : 'text-h2 leading-none', conn && 'inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-white')}>
            {conn && <Plane size={big ? 15 : 13} className="-rotate-45" aria-hidden="true" />}{c}</motion.span>
        ) : <span key="empty" className={cx('rounded-full bg-ink-tint', big ? 'h-[1.625rem] w-14' : 'h-6 w-12')} />}
      </AnimatePresence>
      <span className="mt-1.5 max-w-full truncate text-cap text-muted-text">{c ? city(c) : label}</span>
    </div>
  )
  return (
    <div className="flex items-start gap-2" aria-label={j ? `${city(j.origin)} to ${city(j.destination)}, connecting in ${city(j.connection)}` : 'No booking yet'}>
      {code(j?.origin, 'From', false, 0)}
      <span className="onb-path mt-3"><motion.i initial={false} animate={{ scaleX: j ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.1, ease: EASE }} /></span>
      {code(j?.connection, 'Via', true, 1)}
      <span className="onb-path mt-3"><motion.i initial={false} animate={{ scaleX: j ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.35, ease: EASE }} /></span>
      {code(j?.destination, 'To', false, 2)}
    </div>
  )
}

/** The layover at the connecting airport: arrival and onward departure, the connection split into the planning buffer
 *  and the time to explore, and the arithmetic in one short line each. */
function Layover({ j, total, buffer, usable }: { j: ResolvedJourney; total: number; buffer: number | null; usable: number }) {
  const pct = (n: number) => `${(n / Math.max(total, 1)) * 100}%`
  const When = ({ label, at, end }: { label: string; at: string; end?: boolean }) => (
    <div className={end ? 'text-right' : ''}>
      <p className="text-cap text-muted-text">{label}</p>
      <p className="text-h2 font-bold leading-tight tabular-nums">{hhmm(at)}</p>
      <p className="text-cap text-muted-text">{dayOf(at)}</p>
    </div>
  )
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <When label={`Arrive ${j.connection}`} at={j.layover.arrivalLocal} />
        <When label={`Depart ${j.connection}`} at={j.layover.departureLocal} end />
      </div>
      <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        <motion.span className="onb-hatch h-full rounded-l-full" initial={false} animate={{ width: pct(buffer ?? 0) }} transition={{ duration: 0.55, ease: EASE }} />
        <motion.span className="h-full flex-1 rounded-r-full bg-accent" initial={false} animate={{ opacity: usable > 0 ? 1 : 0.3 }} />
      </div>
      <dl className="mt-4 grid gap-1 text-sub">
        <div className="flex items-baseline justify-between gap-3"><dt className="text-muted-text">Connection</dt><dd className="font-semibold tabular-nums">{fmtDur(total)}</dd></div>
        <div className="flex items-baseline justify-between gap-3"><dt className="text-muted-text">Planning buffer</dt>
          <dd className="font-semibold tabular-nums">{buffer === null ? <span className="text-muted">Choose below</span> : <>− <Dur min={buffer} /></>}</dd></div>
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <dt className="text-body font-semibold">To explore</dt>
          <dd className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-accent-dark">{buffer === null ? <span className="text-muted">?</span> : <Dur min={usable} />}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Step 3's compact strip: the time to explore, what is left after the picks, and whether they fit. */
function TimeStrip({ usable, remaining, fit, city: place }: { usable: number; remaining: number; fit: 'none' | 'fits' | 'tight' | 'over'; city: string }) {
  const used = Math.min(1, Math.max(0, (usable - remaining) / Math.max(usable, 1)))
  const chip = { none: ['bg-ink-tint text-muted-text', `In ${place}`], fits: ['bg-success-tint text-success', 'Fits your time'],
    tight: ['bg-accent-tint text-accent-dark', 'Tight fit'], over: ['bg-error-tint text-error', `Over by ${fmtDur(-remaining)}`] }[fit]
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-cap text-muted-text">{remaining < 0 ? 'Over your time' : 'Time left to explore'}</p>
          <p className={cx('text-[1.75rem] font-bold leading-tight tracking-[-0.03em]', remaining < 0 ? 'text-error' : 'text-ink')}><Dur min={Math.abs(remaining)} /></p>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={chip[1]} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
            className={cx('shrink-0 rounded-full px-3 py-1.5 text-cap font-semibold', chip[0])}>{chip[1]}</motion.span>
        </AnimatePresence>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-aqua/45" aria-hidden="true">
        <motion.span className={cx('block h-full origin-left rounded-full', fit === 'over' ? 'bg-error' : 'bg-accent')} initial={false} animate={{ scaleX: used }} transition={{ duration: 0.55, ease: EASE }} />
      </div>
    </div>
  )
}

/** A tappable activity: photo, name, duration. Selected: coral ring, numbered check, a slight lift. */
function ActivityCard({ a, order, onToggle }: { a: Activity; order: number; onToggle: () => void }) {
  const on = order > 0
  return (
    <motion.button type="button" onClick={onToggle} aria-pressed={on} aria-label={`${a.name}, ${fmtDur(a.durationMin)}`}
      whileTap={{ scale: 0.97 }} animate={{ y: on ? -3 : 0 }}
      className="onb-card relative flex h-full w-full flex-col overflow-hidden rounded-[1.25rem] text-left">
      <span className="ph relative block h-24 w-full overflow-hidden [@media(max-width:360px)]:h-20">
        <Photo img={a.image} w={200} h={96} className="absolute inset-0 size-full" />
        <AnimatePresence>
          {on && (
            <motion.span key="tick" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', visualDuration: 0.35, bounce: 0.3 }}
              className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-accent text-cap font-bold text-white shadow-[0_2px_6px_rgb(0_0_0/0.25)]">{order}</motion.span>)}
        </AnimatePresence>
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-sub font-semibold leading-snug">{a.name}</span>
        <span className="mt-auto flex items-center gap-1.5 text-cap text-muted-text"><Clock size={13} aria-hidden="true" />{fmtDur(a.durationMin)} · {a.category}</span>
      </span>
      <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[1.25rem] ring-2 ring-inset ring-accent" initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: 0.18 }} />
    </motion.button>
  )
}
