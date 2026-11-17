import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, MotionConfig, MotionGlobalConfig, animate, motion, useAnimate, useReducedMotion, type Transition, type Variants } from 'motion/react'
import { ArrowLeft, Check, Clock, PenLine, Plane, Sparkles } from 'lucide-react'
import { useApp } from '../../store'
import { SAMPLE_JOURNEYS, findSampleJourney, isRefFormat, normaliseRef, resolveJourney, type ResolvedJourney } from '../../data/journeys'
import { airportInfo } from '../../data/airportDirectory'
import { getActivities, guestStore, isSupported } from '../../data/mock'
import { BUFFER_OPTIONS, budget, fmtDur } from '../../data/time'
import { computeItinerary } from '../../data/itinerary'
import type { Activity } from '../../data/types'
import type { Route } from '../../store'
import { accessStore } from '../access/accessState'
import { Photo, cx } from '../../components/ui'
import { SSMark } from '../../components/SSMark'
import { journeyDraft } from './handoff'
import './onboarding.css'

/** First-use onboarding, learned by doing: enter a (sample) booking → see the time to explore → pick activities →
 *  start planning. Everything runs on the app's own data and rules: the sample booking fixtures and their lookup
 *  (`findSampleJourney`), the planner's time budget (`budget`, `computeItinerary`) and the catalogue's activities.
 *  "Start planning" hands a real planning draft to the itinerary builder (through Account Access when it is shown).
 *
 *  Motion: one card stays on screen and morphs between the steps (layout animation); its parts enter and leave in a
 *  short stagger; numbers count to their new value; a soft spring with almost no overshoot. Reduced motion: instant. */

const STEPS = [
  { title: 'Your layover, reimagined.', sub: 'Already booked? Let’s find your layover.', label: 'Booking' },
  { title: 'Know your time to explore.', sub: 'See what fits between your flights.', label: 'Your time' },
  { title: 'Find your next experience.', sub: 'Make a plan that fits your time.', label: 'Activities' },
] as const

const SPRING: Transition = { type: 'spring', visualDuration: 0.5, bounce: 0.12 }
const EASE = [0.22, 1, 0.36, 1] as const
const city = (code: string) => airportInfo(code)?.city ?? code
const hhmm = (local: string) => local.slice(11, 16)
const dayOf = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Parts of the card: rise in, settle; leave quickly. */
const PART: Variants = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
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

/** A duration that counts to its new value. */
function Dur({ min, className }: { min: number; className?: string }) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(min)
  const cur = useRef(min)
  useEffect(() => {
    if (reduce) { cur.current = min; setV(min); return }
    const c = animate(cur.current, min, { duration: 0.6, ease: EASE, onUpdate: (x) => { cur.current = x; setV(x) } })
    return () => c.stop()
  }, [min, reduce])
  return <span className={cx('tabular-nums', className)}>{fmtDur(v)}</span>
}

/** Up to four activities to try: airside or not yet confirmed (no border crossing in a first plan), mixed categories. */
function sampleActivities(code: string): Activity[] {
  const all = getActivities(code).filter((a) => a.access !== 'Landside')
  const byCat = new Map<string, Activity[]>()
  for (const a of all) byCat.set(a.category, [...(byCat.get(a.category) ?? []), a])
  const out: Activity[] = []
  for (let round = 0; out.length < 4 && round < 4; round++) for (const list of byCat.values()) if (list[round] && out.length < 4) out.push(list[round])
  return out
}

export function Onboarding() {
  const { finishWelcome, go: navigate, account, catalogue, plans } = useApp()
  const reduce = !!useReducedMotion()
  // Reduced motion: every change is instant (no fades, slides, count-ups or unfolding) while the onboarding is open.
  MotionGlobalConfig.instantAnimations = reduce
  useEffect(() => () => { MotionGlobalConfig.instantAnimations = false }, [])
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [ref, setRef] = useState('')
  const [status, setStatus] = useState<'idle' | 'found' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [journey, setJourney] = useState<ResolvedJourney | null>(null)
  const [samples, setSamples] = useState(false)
  const [buffer, setBuffer] = useState(120)
  const [picked, setPicked] = useState<string[]>([])
  const [focused, setFocused] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const typing = useRef<number[]>([])
  const [shakeScope, shake] = useAnimate()
  useEffect(() => () => typing.current.forEach(clearTimeout), [])

  const go = (n: number) => {
    const next = Math.max(0, Math.min(2, n))
    if (next === step || (next > 0 && !journey)) return
    setDir(next > step ? 1 : -1); setStep(next); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  // Booking lookup: the app's own sample fixtures; nothing else resolves.
  const check = (value: string) => {
    const r = normaliseRef(value)
    if (!isRefFormat(r)) { setStatus('error'); setError('A booking reference has 6 letters or numbers.'); return }
    const j = findSampleJourney(r)
    if (!j) {
      setStatus('error'); setError('That isn’t one of the sample bookings. Try one below.'); setSamples(true)
      if (!reduce && shakeScope.current) void shake(shakeScope.current, { x: [0, -9, 9, -5, 5, 0] }, { duration: 0.42 })
      return
    }
    setStatus('found'); setError(null)
    if (journey?.ref !== j.ref) {
      setBuffer(j.layover.bufferMin)
      if (journey?.connection !== j.connection) setPicked([])
    }
    setJourney(j)
    input.current?.blur()
  }
  const onType = (v: string) => {
    typing.current.forEach(clearTimeout); typing.current = []
    const r = normaliseRef(v).replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setRef(r)
    if (status !== 'idle') { setStatus('idle'); setError(null) }
    if (journey && r !== journey.ref) setJourney(null)
    if (r.length === 6) check(r)
  }
  /** A sample booking types itself in, then validates exactly like a typed reference. */
  const trySample = (code: string) => {
    typing.current.forEach(clearTimeout); typing.current = []
    setStatus('idle'); setError(null); setJourney(null)
    if (reduce) { setRef(code); check(code); return }
    setRef('')
    for (let k = 1; k <= code.length; k++) typing.current.push(window.setTimeout(() => setRef(code.slice(0, k)), k * 55))
    typing.current.push(window.setTimeout(() => check(code), code.length * 55 + 140))
  }
  const change = () => { setRef(''); setStatus('idle'); setJourney(null); setError(null); setTimeout(() => input.current?.focus(), 0) }

  // Time: the planner's own budget (step 2) and itinerary engine (step 3).
  const b = journey ? budget(journey.layover.totalMin, buffer, []) : null
  const acts = useMemo(() => (journey && catalogue.status === 'ready' ? sampleActivities(journey.connection) : []), [journey, catalogue.status])
  const plan = journey && catalogue.status === 'ready'
    ? computeItinerary({ airport: journey.connection, arrival: journey.layover.arrivalLocal, departure: journey.layover.departureLocal, bufferMin: buffer, activityIds: picked })
    : null
  const remaining = plan ? plan.hero.remaining : b?.usable ?? 0
  const fit = !picked.length ? 'none' : plan && (plan.hero.time === 'exceeds' || remaining < 0) ? 'over' : plan?.hero.time === 'tight' ? 'tight' : 'fits'
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  // Finish: a real planning draft for the builder (or the airport's activities when nothing is picked yet).
  const startPlanning = () => {
    if (!journey) return
    const draft = journeyDraft(journey, buffer, picked)
    const existing = plans.find((p) => p.bookingRef === journey.ref && p.airport === journey.connection && p.arrival.slice(0, 16) === journey.layover.arrivalLocal.slice(0, 16))
    const d = existing
      ? { ...draft, planId: existing.id, revision: existing.revision, name: existing.name, activityIds: [...existing.activityIds, ...picked.filter((id) => !existing.activityIds.includes(id))] }
      : draft
    const to: Route = d.activityIds.length || !isSupported(journey.connection) ? { name: 'builder' } : { name: 'airport', code: journey.connection, view: 'list' }
    finishWelcome(to, d)
  }
  const skip = () => finishWelcome({ name: 'discover' })
  const manual = () => finishWelcome({ name: 'trip' })
  const signIn = () => {
    guestStore.markWelcomed()
    if (accessStore.get() !== 'done') accessStore.set('pending')
    navigate({ name: 'access', auth: 'signin' })
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft') go(step - 1)
      if (e.key === 'ArrowRight') go(step + 1)
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  const s = STEPS[step]
  const announce = step === 0
    ? status === 'found' && journey ? `Sample booking found: ${city(journey.origin)} to ${city(journey.destination)}, connecting in ${city(journey.connection)}.` : '' // errors are announced by their own alert
    : step === 1 && b ? `${fmtDur(b.usable)} to explore.` : picked.length ? `${fmtDur(remaining)} left. ${fit === 'over' ? 'Over your time.' : 'Fits your time.'}` : ''

  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <div className="onb relative flex min-h-dvh flex-col" aria-label="Welcome to SkyStop">
        {/* Top bar: brand or Back, progress, Skip */}
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
            <button type="button" onClick={skip} className="press min-h-11 rounded-full px-3 text-sub font-semibold text-muted-text active:bg-ink-tint">Skip</button>
          </div>
          {/* Progress: three slim segments; visited steps (and the next one once a booking is found) can be tapped */}
          <ol aria-label="Onboarding progress" className="mx-auto flex max-w-[28rem] gap-1.5 px-1">
            {STEPS.map((st, n) => (
              <li key={st.label} className="flex-1">
                <button type="button" onClick={() => go(n)} disabled={n > 0 && !journey} aria-current={n === step ? 'step' : undefined}
                  aria-label={`Step ${n + 1} of 3: ${st.label}`} className="flex h-6 w-full items-center disabled:cursor-default">
                  <span className="block h-1 w-full overflow-hidden rounded-full bg-ink/10">
                    <motion.span className="block h-full origin-left rounded-full bg-accent" initial={false} animate={{ scaleX: n <= step ? 1 : 0 }} />
                  </span>
                </button>
              </li>))}
          </ol>
        </header>

        <main className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col px-5 pb-4">
          {/* Headline: slides with the direction of travel */}
          <div className="relative mt-3 min-h-[7.5rem] [@media(max-height:680px)]:min-h-[6.25rem]">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div key={step} custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: 28 * d, filter: 'blur(6px)' }),
                  show: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { ...SPRING, opacity: { duration: 0.4 }, filter: { duration: 0.4 } } },
                  out: (d: number) => ({ opacity: 0, x: -20 * d, filter: 'blur(6px)', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }),
                }}
                initial="enter" animate="show" exit="out">
                <h1 className="text-[2.25rem] font-bold leading-[1.04] tracking-[-0.035em] [@media(max-width:360px)]:text-[1.95rem] [@media(max-height:680px)]:text-[1.95rem]">{s.title}</h1>
                <p className="mt-2 text-body text-muted-text">{s.sub}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <LayoutGroup>
            {/* The card: one object for the whole introduction. It grows into the layover and folds into a time strip. */}
            <div ref={shakeScope} className={cx(step === 2 && 'sticky top-[calc(var(--safe-top)+5.25rem)] z-10')}>
              <motion.section style={{ borderRadius: 28 }} aria-label={step === 0 ? 'Your booking' : step === 1 ? 'Your layover' : 'Your time'}
                className={cx('onb-card relative mt-4 overflow-hidden px-5 py-4', status === 'found' && step === 0 && 'ring-1 ring-accent/30')}>
                <AnimatePresence initial={false}>
                  {step === 0 && status !== 'found' && (
                    <motion.div key="ref" {...foldProps()}><div className="pb-5 pt-1">
                      <label htmlFor="onb-ref" className="text-sub font-semibold text-muted-text">Booking reference</label>
                      {/* Six slots over one real input */}
                      <div className="relative mt-2" onClick={() => input.current?.focus()}>
                        <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
                          {Array.from({ length: 6 }, (_, k) => {
                            const ch = ref[k]
                            const active = focused && k === Math.min(ref.length, 5)
                            return (
                              <span key={k} className="onb-slot" data-active={active} data-state={status === 'error' ? 'error' : undefined}>
                                <AnimatePresence mode="popLayout" initial={false}>
                                  {ch ? <motion.span key={ch + k} initial={{ y: 10, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}>{ch}</motion.span>
                                    : active ? <span key="caret" className="onb-caret" /> : null}
                                </AnimatePresence>
                              </span>)
                          })}
                        </div>
                        <input id="onb-ref" ref={input} value={ref} onChange={(e) => onType(e.target.value)} maxLength={8}
                          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); check(ref) } }}
                          autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} inputMode="text" enterKeyHint="go"
                          aria-invalid={status === 'error'} aria-describedby="onb-ref-help"
                          className="absolute inset-0 size-full cursor-text bg-transparent text-[16px] text-transparent caret-transparent outline-none selection:bg-transparent" />
                      </div>
                      <AnimatePresence mode="popLayout" initial={false}>
                        {error
                          ? <motion.p key="err" id="onb-ref-help" role="alert" {...partProps()} className="mt-2 text-sub font-medium text-error">{error}</motion.p>
                          : <motion.p key="help" id="onb-ref-help" {...partProps()} className="mt-2 text-cap text-muted-text">6 letters or numbers, from your booking confirmation.</motion.p>}
                      </AnimatePresence>
                      <button type="button" onClick={() => setSamples((v) => !v)} aria-expanded={samples} aria-controls="onb-samples"
                        className="press -ml-2 mt-2 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sub font-semibold text-accent-dark active:bg-accent-tint">
                        <Sparkles size={17} aria-hidden="true" />Try a sample booking</button>
                    </div></motion.div>
                  )}
                  {step === 0 && status === 'found' && journey && (
                    <motion.div key="found" {...foldProps()}><div className="flex items-center gap-3 pb-5 pt-1">
                      <motion.span initial={{ scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', visualDuration: 0.45, bounce: 0.35 }}
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-success text-white"><Check size={19} strokeWidth={3} /></motion.span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-body font-semibold">Booking found</span>
                        <span className="block text-cap text-muted-text"><span className="font-mono font-semibold tracking-wider text-ink">{journey.ref}</span> · Sample booking</span>
                      </span>
                      <button type="button" onClick={change} className="press min-h-11 rounded-full px-3 text-sub font-semibold text-accent-dark active:bg-accent-tint">Change</button>
                    </div></motion.div>
                  )}

                  {/* Route: placeholder until a booking is found; it stays through step 2 */}
                  {step < 2 && (
                    <motion.div key="route" {...foldProps(1)}><div className="py-1">
                      <RouteRow j={step === 0 && status !== 'found' ? null : journey} big={step === 0} />
                    </div></motion.div>
                  )}
                  {step === 0 && status === 'found' && journey && (
                    <motion.div key="teaser" {...foldProps(2)}><p className="mt-4 mb-1 flex items-center gap-2 rounded-2xl bg-accent-tint px-3 py-2.5 text-sub">
                      <Clock size={16} className="shrink-0 text-accent-dark" aria-hidden="true" />
                      <span><b className="font-semibold">{fmtDur(journey.layover.totalMin)}</b> connection in {city(journey.connection)}</span>
                    </p></motion.div>
                  )}

                  {step === 1 && journey && b && (
                    <motion.div key="layover" {...foldProps(2)}><div className="pb-1 pt-5">
                      <Layover j={journey} total={b.total} buffer={b.buffer} usable={b.usable} />
                      <fieldset className="mt-5">
                        <legend className="text-sub font-semibold">Your planning buffer</legend>
                        <div className="relative mt-2 grid grid-cols-3 rounded-full bg-ink-tint p-1">
                          {BUFFER_OPTIONS.map((m) => (
                            <button key={m} type="button" aria-pressed={buffer === m} onClick={() => setBuffer(m)}
                              className={cx('relative min-h-11 rounded-full text-sub font-semibold transition-colors', buffer === m ? 'text-ink' : 'text-muted-text')}>
                              {buffer === m && <motion.span layoutId="onb-buffer" className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgb(31_26_23/0.14)]" />}
                              <span className="relative">{fmtDur(m)}</span>
                            </button>))}
                        </div>
                        <p className="mt-2 text-cap text-muted-text">Time kept for transfers and boarding. Your flights stay the same.</p>
                      </fieldset>
                    </div></motion.div>
                  )}

                  {step === 2 && journey && b && (
                    <motion.div key="strip" {...foldProps()}><div className="py-1">
                      <TimeStrip usable={b.usable} remaining={remaining} fit={fit} city={city(journey.connection)} />
                    </div></motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            </div>

            {/* Sample bookings (step 1): a rail of the four fixtures, clearly labelled */}
            <AnimatePresence initial={false}>
              {step === 0 && samples && status !== 'found' && (
                <motion.section key="samples" id="onb-samples" aria-label="Sample bookings" layout className="scroll-mb-28 overflow-hidden"
                  onAnimationComplete={() => document.getElementById('onb-samples')?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <p className="mt-4 text-cap font-semibold uppercase tracking-[0.08em] text-muted-text">Sample bookings</p>
                  <ul className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-5">
                    {SAMPLE_JOURNEYS.map((sj, k) => {
                      const r = resolveJourney(sj)
                      return (
                        <motion.li key={sj.ref} {...partProps(k)} className="shrink-0">
                          <button type="button" onClick={() => trySample(sj.ref)} aria-label={`Sample booking ${sj.ref}: ${city(sj.origin)} to ${city(sj.destination)} via ${city(sj.connection)}`}
                            className="onb-card press flex min-h-[4.5rem] w-[10.5rem] flex-col items-start justify-center rounded-2xl px-3.5 py-2.5 text-left">
                            <span className="font-mono text-sub font-bold tracking-wider">{sj.ref}</span>
                            <span className="text-cap text-muted-text">{sj.origin} → <b className="font-semibold text-accent-dark">{sj.connection}</b> → {sj.destination}</span>
                            <span className="text-cap text-muted-text">{fmtDur(r.layover.totalMin)} layover</span>
                          </button>
                        </motion.li>)
                    })}
                  </ul>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Activities (step 3): real catalogue venues at the connecting airport */}
            <AnimatePresence initial={false}>
              {step === 2 && journey && (
                <motion.section key="acts" aria-label={`Activities in ${city(journey.connection)}`} layout className="mt-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                  {catalogue.status === 'loading' && (
                    <div className="grid grid-cols-2 gap-3" aria-label="Loading activities">
                      {[0, 1, 2, 3].map((k) => <span key={k} className="block h-44 rounded-[1.25rem] bg-ink-tint motion-safe:animate-pulse" />)}
                    </div>)}
                  {catalogue.status === 'error' && <p className="text-sub text-muted-text">Activities could not be loaded. You can still start planning.</p>}
                  {catalogue.status === 'ready' && (
                    <ul className="grid grid-cols-2 gap-3">
                      {acts.map((a, k) => (
                        <motion.li key={a.id} {...partProps(k + 1)}>
                          <ActivityCard a={a} order={picked.indexOf(a.id) + 1} onToggle={() => toggle(a.id)} />
                        </motion.li>))}
                    </ul>)}
                </motion.section>
              )}
            </AnimatePresence>
            {/* Step 1 alternatives, in the page flow so the pinned action bar stays small on short phones */}
            <AnimatePresence initial={false}>
              {step === 0 && (
                <motion.div key="alt" layout {...partProps(2)} className="mt-5 grid gap-1">
                  <button type="button" onClick={manual} className="onb-btn-secondary press inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full text-body font-semibold">
                    <PenLine size={18} aria-hidden="true" />Enter flight details manually</button>
                  {account.status !== 'registered' && (
                    <p className="text-center text-sub text-muted-text">Have an account? <button type="button" onClick={signIn} className="min-h-11 px-1 font-semibold text-accent-dark">Sign in</button></p>)}
                </motion.div>)}
            </AnimatePresence>
          </LayoutGroup>
          <p className="sr-only" aria-live="polite">{announce}</p>
        </main>

        {/* Actions */}
        <footer className="sticky bottom-0 z-10 bg-gradient-to-t from-canvas from-70% to-canvas/0 px-5 pb-[calc(var(--safe-bottom)+1rem)] pt-5">
          <div className="mx-auto grid w-full max-w-[28rem] gap-2">
            {step === 0 && <button type="button" onClick={() => go(1)} disabled={!journey} className="btn-coral press min-h-[3.25rem] rounded-full text-card font-bold disabled:opacity-40 disabled:shadow-none">Continue</button>}
            {step === 1 && <button type="button" onClick={() => go(2)} className="btn-coral press min-h-[3.25rem] rounded-full text-card font-bold">Continue</button>}
            {step === 2 && (<>
              <button type="button" onClick={startPlanning} className="btn-coral press min-h-[3.25rem] rounded-full text-card font-bold">Start planning</button>
              <p className="text-center text-cap text-muted-text">{picked.length ? `${picked.length} selected · you can change everything later` : 'Pick one or two, or start with an empty plan'}</p>
            </>)}
          </div>
        </footer>
      </div>
    </MotionConfig>
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
function Layover({ j, total, buffer, usable }: { j: ResolvedJourney; total: number; buffer: number; usable: number }) {
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
        <motion.span className="onb-hatch h-full rounded-l-full" initial={false} animate={{ width: pct(buffer) }} transition={{ duration: 0.55, ease: EASE }} />
        <motion.span className="h-full flex-1 rounded-r-full bg-accent" initial={false} animate={{ opacity: usable > 0 ? 1 : 0.3 }} />
      </div>
      <dl className="mt-4 grid gap-1 text-sub">
        <div className="flex items-baseline justify-between gap-3"><dt className="text-muted-text">Connection</dt><dd className="font-semibold tabular-nums">{fmtDur(total)}</dd></div>
        <div className="flex items-baseline justify-between gap-3"><dt className="text-muted-text">Planning buffer</dt><dd className="font-semibold tabular-nums">− <Dur min={buffer} /></dd></div>
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <dt className="text-body font-semibold">To explore</dt>
          <dd className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-accent-dark"><Dur min={usable} /></dd>
        </div>
      </dl>
    </div>
  )
}

/** Step 3's compact strip: the time to explore, what is left after the picks, and whether they fit. */
function TimeStrip({ usable, remaining, fit, city: place }: { usable: number; remaining: number; fit: 'none' | 'fits' | 'tight' | 'over'; city: string }) {
  const used = Math.min(1, Math.max(0, (usable - remaining) / Math.max(usable, 1)))
  const chip = { none: ['bg-ink-tint text-muted-text', `${fmtDur(usable)} in ${place}`], fits: ['bg-success-tint text-success', 'Fits your time'],
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
