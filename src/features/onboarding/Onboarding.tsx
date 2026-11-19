import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, MotionConfig, MotionGlobalConfig, animate, motion, useAnimate, useReducedMotion, type Transition } from 'motion/react'
import { ArrowRight, BedDouble, Check, Landmark, PenLine, Plane, RotateCcw, ShoppingBag, Sparkles, Utensils, type LucideIcon } from 'lucide-react'
import { useApp } from '../../store'
import { SAMPLE_JOURNEYS, findSampleJourney, isRefFormat, normaliseRef, resolveJourney, type ResolvedJourney } from '../../data/journeys'
import { airportInfo } from '../../data/airportDirectory'
import { getAirport } from '../../data/mock'
import { budget, fmtDur } from '../../data/time'
import { IMAGES, type Img } from '../../data/images'
import type { Category } from '../../data/types'
import { Photo, cx } from '../../components/ui'
import { SSMark } from '../../components/SSMark'
import { journeyDraft } from './handoff'
import './onboarding.css'

/** First-use conversation (after the three intro slides). SkyStop talks, the visitor answers by tapping, and SkyStop
 *  builds their trip in front of them: booking → journey → layover airport and time → interests → Home with the flight
 *  saved. Scripted and deterministic (no AI); the booking lookup is the app's own sample-booking lookup.
 *
 *  States (one cancellable timeline; each answer is accepted once, only while SkyStop is asking):
 *    intro → askBooked ─ Yes → findFlight ⇄ lookup → journey → airport → interests → closing → finishing → Home
 *                      └ Not yet → notYet ──────────────────────────────→ interests → …
 *    findFlight → "Enter flight details manually" → finishing → Home with the manual flight form on top.
 *  Finishing = completeOnboarding(): guest session (reused if any), the flight saved like any Add flight (never twice),
 *  interests kept; on failure a retry appears here and nothing is claimed as saved.
 *
 *  Composition: SkyStop's current line streams in at the top (thinking pulse first; the previous line lifts away);
 *  the visual for the current state fills the middle (booking card, journey drawing itself, airport and time, interest
 *  cards); answers collect as chips under the header. Reduced motion: same progression, instant changes. */

type Phase = 'intro' | 'askBooked' | 'findFlight' | 'journey' | 'airport' | 'notYet' | 'interests' | 'closing' | 'finishing'
type Booked = 'booked' | 'not-yet'
type BookingResult = { kind: 'found'; j: ResolvedJourney } | { kind: 'manual' }

const BOOKED: { v: Booked; label: string }[] = [{ v: 'booked', label: 'Yes, I’m booked' }, { v: 'not-yet', label: 'Not yet' }]
const INTERESTS: { v: Category; label: string; icon: LucideIcon; img: Img }[] = [
  { v: 'Food', label: 'Dining', icon: Utensils, img: IMAGES.activities.s1 },
  { v: 'Shopping', label: 'Shopping', icon: ShoppingBag, img: IMAGES.venues['40000000-0000-4000-8000-000000000008'] ?? IMAGES.activities.l4 },
  { v: 'Rest', label: 'Relaxation', icon: BedDouble, img: IMAGES.venues['20000000-0000-4000-8000-000000000006'] ?? IMAGES.activities.s3 },
  { v: 'Sights', label: 'Attractions', icon: Landmark, img: IMAGES.venues['20000000-0000-4000-8000-000000000004'] ?? IMAGES.activities.s2 },
]
const GLOW: Record<Phase, [number, number]> = {
  intro: [20, 30], askBooked: [25, 40], findFlight: [75, 35], journey: [60, 45], airport: [35, 55], notYet: [70, 50], interests: [80, 60], closing: [50, 45], finishing: [50, 50],
}
// Names for the four guide airports before the catalogue has loaded (the catalogue's own names win when present).
const PLACE: Record<string, { city: string; name: string }> = {
  SIN: { city: 'Singapore', name: 'Singapore Changi Airport' }, LIS: { city: 'Lisbon', name: 'Lisbon Airport' },
  LHR: { city: 'London', name: 'London Heathrow Airport' }, DXB: { city: 'Dubai', name: 'Dubai International Airport' },
}
const city = (code: string) => airportInfo(code)?.city ?? PLACE[code]?.city ?? code
const airportName = (code: string) => { const a = getAirport(code); return a.name && a.name !== `${code} Airport` ? a.name : PLACE[code]?.name ?? `${code} Airport` }
const hhmm = (local: string) => local.slice(11, 16)
const dayOf = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86400000)

const SPRING: Transition = { type: 'spring', visualDuration: 0.45, bounce: 0.12 }
const EASE = [0.22, 1, 0.36, 1] as const
const PACE = { think: 300, perChar: 16, hold: 400, feedback: 200, ackHold: 550, lookup: 650, reveal: 2700, airport: 1900, notYet: 1900 }

export function Onboarding() {
  const { finishWelcome, completeOnboarding } = useApp()
  const reduce = !!useReducedMotion()
  MotionGlobalConfig.instantAnimations = reduce
  useEffect(() => () => { MotionGlobalConfig.instantAnimations = false }, [])

  const [phase, setPhase] = useState<Phase>('intro')
  const [line, setLine] = useState<{ id: number; text: string } | null>(null)
  const [thinking, setThinking] = useState(false)
  const [booked, setBooked] = useState<Booked | null>(null)
  const [journey, setJourney] = useState<ResolvedJourney | null>(null)
  const [interests, setInterests] = useState<Category[]>([])
  const [locked, setLocked] = useState(false)
  const [trail, setTrail] = useState<{ id: string; label: string }[]>([])
  const [failed, setFailed] = useState(false)
  const answer = useRef<((v: unknown) => void) | null>(null)
  const finishArgs = useRef<Parameters<typeof completeOnboarding>[0] | null>(null)
  const newId = useRef(crypto.randomUUID()) // one id for the imported flight: a retried save never creates a second
  const skipped = useRef(false)
  const skip = () => { if (skipped.current) return; skipped.current = true; finishWelcome({ name: 'discover' }) }

  const finish = async () => {
    if (!finishArgs.current) return
    setFailed(false); setPhase('finishing')
    const ok = await completeOnboarding(finishArgs.current)
    if (!ok) setFailed(true)
  }
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
    const say = async (text: string) => {
      if (!reduce) { setThinking(true); await wait(PACE.think); setThinking(false) }
      setLine({ id: id++, text })
      await wait(reduce ? 120 : text.length * PACE.perChar + 160)
    }
    const ask = <T,>() => new Promise<T>((res, rej) => {
      answer.current = res as (v: unknown) => void
      signal.addEventListener('abort', () => rej(new Error('aborted')), { once: true })
    })
    const chip = (cid: string, label: string) => setTrail((t) => [...t.filter((x) => x.id !== cid), { id: cid, label }])
    setPhase('intro'); setLine(null); setBooked(null); setJourney(null); setInterests([]); setLocked(false); setTrail([]); setFailed(false)
    void (async () => {
      if (document.documentElement.dataset.splash === 'on') {
        await new Promise<void>((res) => window.addEventListener('skystop:splash-done', () => res(), { once: true }))
      }
      await wait(220)
      await say('Hi, I’m SkyStop.')
      await wait(PACE.hold)
      setPhase('askBooked')
      const a1 = ask<Booked>()
      await say('Already have a flight booked?')
      const b = await a1
      await wait(PACE.feedback)
      chip('booked', BOOKED.find((x) => x.v === b)!.label)
      let j: ResolvedJourney | null = null
      if (b === 'booked') {
        setPhase('findFlight')
        const a2 = ask<BookingResult>()
        await say('Let’s find your flight.')
        const r = await a2
        if (r.kind === 'manual') {
          chip('manual', 'Manual entry')
          await say('No problem. You can add your flight details next.')
          await wait(PACE.hold)
          finishArgs.current = { then: { name: 'trip' } }
          await finishRef.current()
          return
        }
        j = r.j
        setJourney(j)
        chip('ref', j.ref)
        setPhase('journey')
        await say('Found your journey!')
        await wait(PACE.hold)
        await say(`You’re flying from ${city(j.origin)} to ${city(j.destination)}, with a stop in ${city(j.connection)}.`)
        await wait(PACE.reveal)
        setPhase('airport')
        await say(`You’ll have ${fmtDur(j.layover.totalMin)} at ${airportName(j.connection)}.`)
        await wait(PACE.airport)
        await say(`You’ve got time to explore ${airportName(j.connection).replace(/ (International )?Airport$/, '')}.`)
        await wait(PACE.hold)
      } else {
        setPhase('notYet')
        await say('You can explore your options before booking.')
        await wait(PACE.notYet)
      }
      setPhase('interests')
      const a3 = ask<Category[]>()
      await say('What would you like to do during your layover?')
      const picks = await a3
      setLocked(true)
      if (picks.length) chip('interests', picks.map((c) => INTERESTS.find((x) => x.v === c)!.label).join(', '))
      setPhase('closing')
      await say(picks.length ? 'Perfect. Let’s find something worth your time.' : 'No problem. You can explore everything.')
      await wait(PACE.hold)
      finishArgs.current = { interests: picks, flight: j ? { ...journeyDraft(j), newId: newId.current } : undefined }
      await finishRef.current()
    })().catch(() => { /* cancelled */ })
    return () => { ctl.abort(); answer.current = null }
  }, [reduce])

  /** An answer counts once, and only while SkyStop is waiting for it. */
  const reply = (v: unknown, before?: () => void) => {
    if (!answer.current) return
    const r = answer.current; answer.current = null
    before?.(); r(v)
  }

  const [gx, gy] = GLOW[phase]
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <div className="onb relative flex h-dvh flex-col overflow-hidden" aria-label="Welcome to SkyStop">
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0"
          initial={false} animate={{ background: `radial-gradient(85% 60% at ${gx}% ${gy}%, rgb(255 181 165 / 0.22), transparent 72%)` }}
          transition={{ duration: 1.4, ease: 'easeInOut' }} />

        <header className="relative z-10 mx-auto flex w-full max-w-[28rem] items-center justify-between px-5 pt-[calc(var(--safe-top)+0.5rem)]">
          <span className="flex min-h-11 items-center gap-2 text-card font-bold">
            <motion.span animate={thinking ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ duration: 0.7, repeat: thinking ? Infinity : 0 }}>
              <SSMark color="#ea5139" rearOpacity={0.35} className="h-6 w-auto" /></motion.span>SkyStop</span>
          {phase !== 'finishing' && <button type="button" onClick={skip} className="press min-h-11 rounded-full px-3 text-sub font-semibold text-muted-text active:bg-ink-tint">Skip</button>}
        </header>

        <LayoutGroup>
          {/* Answers so far */}
          <ul aria-label="Your answers" className="relative z-10 mx-auto flex min-h-10 w-full max-w-[28rem] flex-wrap items-center gap-2 px-5 pt-1">
            <AnimatePresence>
              {trail.map((t) => (
                <motion.li key={t.id} layoutId={`pick-${t.id}`} initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex max-w-full items-center gap-1.5 truncate bg-accent px-3 py-1.5 text-cap font-semibold text-white" style={{ borderRadius: 999 }}>
                  <Check size={13} strokeWidth={3} aria-hidden="true" className="shrink-0" /><span className="truncate">{t.label}</span></motion.li>))}
            </AnimatePresence>
          </ul>

          <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[28rem] flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-[calc(var(--safe-bottom)+1.25rem)] pt-3">
            {/* SkyStop's line, top of the stage */}
            <div className="min-h-[4.75rem]">
              <AnimatePresence mode="wait" initial={false}>
                {thinking ? (
                  <motion.span key="thinking" aria-hidden="true" className="flex h-9 items-center gap-1.5"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                    {[0, 1, 2].map((k) => (
                      <motion.span key={k} className="size-2.5 rounded-full bg-accent" animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 0.75, repeat: Infinity, delay: k * 0.13 }} />))}
                  </motion.span>
                ) : line && (
                  <motion.div key={line.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, filter: 'blur(6px)', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}>
                    <Stream text={line.text} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* The visual for the current state */}
            <div className="relative mt-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {phase === 'askBooked' && (
                  <motion.div key="booked" role="group" aria-label="Already have a flight booked?" className="flex flex-wrap gap-2.5"
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                    {BOOKED.filter((c) => !booked || c.v === booked).map((c, k) => (
                      <motion.button key={c.v} type="button" layoutId={booked === c.v ? 'pick-booked' : undefined}
                        onClick={() => reply(c.v, () => setBooked(c.v))} disabled={!!booked}
                        initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { ...SPRING, delay: 0.45 + 0.08 * k } }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }} whileTap={{ scale: 0.95 }} style={{ borderRadius: 999 }}
                        className={cx('press flex min-h-12 items-center gap-2 px-5 text-body font-semibold transition-colors duration-150',
                          booked === c.v ? 'bg-accent text-white' : 'onb-card text-ink')}>
                        {booked === c.v && <Check size={16} strokeWidth={3} aria-hidden="true" />}{c.label}
                      </motion.button>))}
                  </motion.div>)}

                {phase === 'findFlight' && (
                  <motion.div key="find" {...enter(0.35)}>
                    <BookingCard reduce={reduce} onFound={(j) => reply({ kind: 'found', j })} onManual={() => reply({ kind: 'manual' })} />
                  </motion.div>)}

                {phase === 'journey' && journey && (
                  <motion.div key="journey" {...enter(0.1)}><JourneyCard j={journey} /></motion.div>)}

                {phase === 'airport' && journey && (
                  <motion.div key="airport" {...enter(0.1)}><AirportCard j={journey} /></motion.div>)}

                {phase === 'notYet' && (
                  <motion.div key="notyet" {...enter(0.3)}><ExploreCard /></motion.div>)}

                {(phase === 'interests' || phase === 'closing' || (phase === 'finishing' && interests.length > 0)) && !failed && (
                  <motion.div key="interests" {...enter(0.45)}>
                    <InterestCards value={interests} locked={locked} onToggle={(c) => setInterests((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]))} />
                    <AnimatePresence initial={false}>
                      {!locked && phase === 'interests' && (
                        <motion.div key="confirm" className="mt-4 grid gap-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.9 } }}
                          exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}>
                          <button type="button" disabled={!interests.length} onClick={() => reply(interests)}
                            className="btn-coral press inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full text-card font-bold disabled:opacity-40 disabled:shadow-none">
                            {interests.length ? `That’s it (${interests.length})` : 'Pick one or more'}<ArrowRight size={20} aria-hidden="true" /></button>
                          <button type="button" onClick={() => reply([])} className="min-h-11 text-sub font-semibold text-muted-text">Not sure yet</button>
                        </motion.div>)}
                    </AnimatePresence>
                  </motion.div>)}

                {failed && (
                  <motion.div key="failed" role="alert" {...enter(0)} className="onb-card rounded-[1.5rem] p-5">
                    <p className="text-body font-semibold">{finishArgs.current?.flight ? 'Your flight isn’t saved yet.' : 'SkyStop couldn’t start.'}</p>
                    <p className="mt-1 text-sub text-muted-text">Check your connection and try again.</p>
                    <button type="button" onClick={() => void finish()} className="btn-coral press mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-body font-bold">
                      <RotateCcw size={18} aria-hidden="true" />Try again</button>
                  </motion.div>)}
              </AnimatePresence>
            </div>
          </main>
        </LayoutGroup>
      </div>
    </MotionConfig>
  )
}

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { ...SPRING, delay } },
  exit: { opacity: 0, y: -14, scale: 0.98, filter: 'blur(4px)', transition: { duration: 0.22 } },
})

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
    <p className="text-[1.75rem] font-bold leading-[1.12] tracking-[-0.03em] text-ink [@media(max-width:360px)]:text-[1.5rem]">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{text.slice(0, n)}{n < text.length && <span className="onb-caret onb-caret--inline" />}</span>
    </p>
  )
}

/** "Let's find your flight": the booking reference in six slots (keyboard, paste, autofill), Find my flight, the four
 *  sample bookings, and manual entry. Lookup is the app's own sample lookup with a short flight animation. */
function BookingCard({ reduce, onFound, onManual }: { reduce: boolean; onFound: (j: ResolvedJourney) => void; onManual: () => void }) {
  const [ref, setRef] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [samples, setSamples] = useState(false)
  const [focused, setFocused] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const timers = useRef<number[]>([])
  const [scope, shake] = useAnimate()
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }

  const lookup = (value: string) => {
    if (busy) return
    const r = normaliseRef(value)
    if (!isRefFormat(r)) { setError('A booking reference has 6 letters or numbers.'); return }
    setError(null); setBusy(true); input.current?.blur()
    const j = findSampleJourney(r)
    later(() => {
      setBusy(false)
      if (j) { onFound(j); return }
      setError('We couldn’t find that booking. Try a sample booking or enter your flight manually.'); setSamples(true)
      if (!reduce && scope.current) void shake(scope.current, { x: [0, -8, 8, -4, 4, 0] }, { duration: 0.4 })
    }, reduce ? 0 : PACE.lookup)
  }
  const onType = (v: string) => {
    const r = normaliseRef(v).replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setRef(r); setError(null)
  }
  const trySample = (code: string) => {
    if (busy) return
    timers.current.forEach(clearTimeout); timers.current = []
    setError(null)
    if (reduce) { setRef(code); lookup(code); return }
    setRef('')
    for (let k = 1; k <= code.length; k++) later(() => setRef(code.slice(0, k)), k * 50)
    later(() => lookup(code), code.length * 50 + 120)
  }

  return (
    <div ref={scope}>
      <section aria-label="Your booking" className="onb-card rounded-[1.5rem] p-4">
        <label htmlFor="onb-ref" className="text-sub font-semibold text-muted-text">Booking reference</label>
        <div className="relative mt-2" onClick={() => input.current?.focus()}>
          <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
            {Array.from({ length: 6 }, (_, k) => {
              const ch = ref[k], active = focused && !busy && k === Math.min(ref.length, 5)
              return (
                <motion.span key={k} className="onb-slot" data-active={active} data-state={error ? 'error' : busy ? 'found' : undefined}
                  animate={busy ? { y: [0, -4, 0] } : { y: 0 }} transition={busy ? { duration: 0.5, repeat: Infinity, delay: k * 0.06 } : { duration: 0.2 }}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {ch ? <motion.span key={ch + k} initial={{ y: 10, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}>{ch}</motion.span>
                      : active ? <span key="caret" className="onb-caret" /> : null}
                  </AnimatePresence>
                </motion.span>)
            })}
          </div>
          <input id="onb-ref" ref={input} value={ref} onChange={(e) => onType(e.target.value)} maxLength={8} disabled={busy}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookup(ref) } }}
            autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} inputMode="text" enterKeyHint="search"
            aria-invalid={!!error} aria-describedby="onb-ref-help"
            className="absolute inset-0 size-full cursor-text bg-transparent text-[16px] text-transparent caret-transparent outline-none selection:bg-transparent" />
        </div>
        {/* Lookup: a plane crosses while the reference is matched */}
        <div className="relative mt-3 h-6" aria-hidden="true">
          <span className="onb-path absolute inset-x-1 top-1/2 block -translate-y-1/2" />
          <AnimatePresence>{busy && (
            <motion.span key="plane" className="absolute top-0 grid size-6 place-items-center text-accent"
              initial={{ left: '0%', opacity: 0 }} animate={{ left: '92%', opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: PACE.lookup / 1000, ease: [0.45, 0, 0.2, 1] }}>
              <Plane size={20} className="rotate-45" fill="currentColor" /></motion.span>)}
          </AnimatePresence>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          {error
            ? <motion.p key="err" id="onb-ref-help" role="alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-sub font-medium text-error">{error}</motion.p>
            : <motion.p key="help" id="onb-ref-help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1 text-cap text-muted-text">6 letters or numbers, from your booking confirmation.</motion.p>}
        </AnimatePresence>
        <button type="button" disabled={ref.length < 6 || busy} onClick={() => lookup(ref)}
          className="btn-coral press mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-body font-bold disabled:opacity-40 disabled:shadow-none">
          {busy ? 'Finding your flight' : 'Find my flight'}</button>
      </section>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3">
        <button type="button" onClick={() => setSamples((v) => !v)} aria-expanded={samples} disabled={busy}
          className="press -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sub font-semibold text-accent-dark active:bg-accent-tint">
          <Sparkles size={16} aria-hidden="true" />Try a sample booking</button>
        <button type="button" onClick={onManual} disabled={busy}
          className="press -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sub font-semibold text-muted-text active:bg-ink-tint">
          <PenLine size={15} aria-hidden="true" />Enter flight details manually</button>
      </div>
      <AnimatePresence initial={false}>
        {samples && (
          <motion.ul key="samples" aria-label="Sample bookings" className="grid grid-cols-2 gap-2 overflow-hidden"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {SAMPLE_JOURNEYS.map((sj, k) => {
              const r = resolveJourney(sj)
              return (
                <motion.li key={sj.ref} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 * k } }}>
                  <button type="button" onClick={() => trySample(sj.ref)} disabled={busy}
                    aria-label={`Sample booking ${sj.ref}: ${city(sj.origin)} to ${city(sj.destination)} via ${city(sj.connection)}`}
                    className="onb-card press flex w-full flex-col items-start rounded-2xl px-3 py-2 text-left">
                    <span className="font-mono text-sub font-bold tracking-wider">{sj.ref}</span>
                    <span className="text-cap text-muted-text">{sj.origin} → <b className="font-semibold text-accent-dark">{sj.connection}</b> → {sj.destination} · {fmtDur(r.layover.totalMin)}</span>
                  </button>
                </motion.li>)
            })}
          </motion.ul>)}
      </AnimatePresence>
    </div>
  )
}

/** The journey drawing itself: origin, a route to the connection (coral), on to the destination, then the
 *  connection's arrival and departure and its length. All values from the booking (airport-local times). */
function JourneyCard({ j }: { j: ResolvedJourney }) {
  const Code = ({ c, at, align, delay }: { c: string; at: string; align: 'start' | 'end'; delay: number }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay }} className={cx('min-w-0', align === 'end' && 'text-right')}>
      <p className="text-[1.75rem] font-bold leading-none tracking-[-0.03em] [@media(max-width:360px)]:text-[1.5rem]">{c}</p>
      <p className="mt-1 truncate text-cap text-muted-text">{city(c)}</p>
      <p className="text-micro text-muted-text">{at}</p>
    </motion.div>
  )
  const Leg = ({ delay }: { delay: number; mins?: number }) => (
    <div className="flex min-w-0 flex-1 flex-col items-center pt-3">
      <span className="onb-path w-full"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay, ease: EASE }} /></span>
    </div>
  )
  return (
    <section aria-label={`Journey ${j.origin} to ${j.destination} via ${j.connection}`} className="onb-card rounded-[1.5rem] p-4">
      <div className="flex items-start gap-2">
        <Code c={j.origin} at={hhmm(j.legs[0].departLocal)} align="start" delay={0.1} />
        <Leg delay={0.35} mins={j.legs[0].durationMin} />
        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', visualDuration: 0.4, bounce: 0.35, delay: 0.85 }}
          className="flex shrink-0 flex-col items-center">
          <motion.span layoutId="conn-pill" className="inline-flex items-center gap-1 bg-accent px-2.5 py-1 text-[1.125rem] font-bold leading-none text-white" style={{ borderRadius: 999 }}>
            <Plane size={13} className="-rotate-45" aria-hidden="true" />{j.connection}</motion.span>
          <span className="mt-1 text-cap font-semibold text-accent-dark">{city(j.connection)}</span>
        </motion.div>
        <Leg delay={1.05} mins={j.legs[1].durationMin} />
        <Code c={j.destination} at={hhmm(j.legs[1].arriveLocal)} align="end" delay={1.5} />
      </div>
      {/* The whole trip as a timeline: the stop at the connecting airport stands out, with its length in coral */}
      <ol aria-label="Trip timeline" className="relative mt-4 grid gap-0">
        <motion.span aria-hidden="true" className="absolute bottom-3 left-[0.4375rem] top-3 w-0.5 origin-top rounded-full bg-ink/10"
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.9, delay: 1.7, ease: EASE }} />
        {[
          { k: 'dep0', at: j.legs[0].departLocal, what: `Depart ${city(j.origin)}`, code: j.origin, gap: `${fmtDur(j.legs[0].durationMin)} flight`, hot: false },
          { k: 'arr', at: j.layover.arrivalLocal, what: `Arrive ${city(j.connection)}`, code: j.connection, gap: null, hot: true },
          { k: 'conn', at: '', what: '', code: '', gap: null, hot: true },
          { k: 'dep1', at: j.layover.departureLocal, what: `Depart ${city(j.connection)}`, code: j.connection, gap: `${fmtDur(j.legs[1].durationMin)} flight`, hot: true },
          { k: 'arr1', at: j.legs[1].arriveLocal, what: `Arrive ${city(j.destination)}`, code: j.destination, gap: null, hot: false },
        ].map((r, i) => r.k === 'conn' ? (
          <motion.li key={r.k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: 1.9 + 0.12 * i }}
            className="my-1 ml-7 flex items-center justify-between rounded-xl bg-accent-tint px-3 py-1.5">
            <span className="min-w-0 truncate text-sub font-semibold text-accent-dark">Connection<span className="[@media(max-width:360px)]:hidden"> in {city(j.connection)}</span></span>
            <span className="shrink-0 whitespace-nowrap text-body font-bold tabular-nums text-accent-dark"><CountUp to={j.layover.totalMin} delay={2.2} /></span>
          </motion.li>
        ) : (
          <motion.li key={r.k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: 1.9 + 0.12 * i }}
            className="relative grid grid-cols-[1.75rem_auto_1fr] items-baseline gap-x-2 py-1">
            <span aria-hidden="true" className={cx('relative top-0.5 size-3.5 rounded-full ring-4 ring-white', r.hot ? 'bg-accent' : 'bg-ink/25')} />
            <span className="text-body font-bold tabular-nums">{hhmm(r.at)}</span>
            <span className="min-w-0 truncate text-sub">{r.what} <span className="text-muted-text">· {dayOf(r.at)}</span></span>
            {r.gap && <span className="col-start-3 text-micro text-muted-text">{r.gap}</span>}
          </motion.li>
        ))}
      </ol>
    </section>
  )
}

/** The layover airport: photo, name and code, then the connection minus the planning buffer = time to explore
 *  (the planner's own budget rule), counting up. The journey stays as a compact strip above it. */
function AirportCard({ j }: { j: ResolvedJourney }) {
  const { total, buffer, usable } = budget(j.layover.totalMin, j.layover.bufferMin, [])
  const img = IMAGES.airports[j.connection] ?? getAirport(j.connection).image
  return (
    <section aria-label={`${airportName(j.connection)}: ${fmtDur(total)} connection, ${fmtDur(usable)} to explore`} className="onb-card overflow-hidden rounded-[1.5rem]">
      <div className="ph relative h-36 [@media(max-height:680px)]:h-28">
        <motion.span className="absolute inset-0 block" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: EASE }}>
          <Photo img={img} w={440} h={150} className="absolute inset-0 size-full" /></motion.span>
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-micro font-semibold text-ink">
          {j.origin} → <motion.span layoutId="conn-pill" className="bg-accent px-1.5 text-white" style={{ borderRadius: 999 }}>{j.connection}</motion.span> → {j.destination}</span>
        <div className="absolute inset-x-3 bottom-2.5 text-white">
          <p className="text-card font-bold leading-tight">{airportName(j.connection)}</p>
          <p className="text-cap text-white/85">{j.connection} · {city(j.connection)}</p>
        </div>
      </div>
      <div className="px-4 pb-4 pt-3">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-ink/5" aria-hidden="true">
          <motion.span className="h-full rounded-l-full bg-accent" initial={{ width: '0%' }} animate={{ width: `${(usable / Math.max(total, 1)) * 100}%` }} transition={{ duration: 0.7, delay: 0.8, ease: EASE }} />
          <motion.span className="onb-hatch h-full flex-1 rounded-r-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.45 }} />
        </div>
        <dl className="mt-2.5 grid gap-0.5 text-sub">
          <motion.div className="flex items-baseline justify-between" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <dt className="text-muted-text">Connection</dt><dd className="font-semibold tabular-nums">{fmtDur(total)}</dd></motion.div>
          <motion.div className="flex items-baseline justify-between" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
            <dt className="text-muted-text">Planning buffer</dt><dd className="font-semibold tabular-nums">− {fmtDur(buffer)}</dd></motion.div>
          <motion.div className="mt-1 flex items-baseline justify-between border-t border-line pt-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <dt className="text-body font-semibold">To explore</dt>
            <dd className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-accent-dark"><CountUp to={usable} delay={0.8} /></dd>
          </motion.div>
        </dl>
      </div>
    </section>
  )
}

/** "Not yet": what SkyStop can do before booking: compare connections by their layover, and explore the airports. */
function ExploreCard() {
  const opts = [{ code: 'SIN', w: 78 }, { code: 'DXB', w: 52 }, { code: 'LHR', w: 34 }]
  return (
    <div className="grid gap-3">
      <section aria-label="Compare flights" className="onb-card rounded-[1.5rem] p-4">
        <p className="text-sub font-semibold">Compare flights by their layover</p>
        <ul className="mt-3 grid gap-2" aria-hidden="true">
          {opts.map((o, k) => (
            <li key={o.code} className="flex items-center gap-2.5">
              <span className="w-10 text-cap font-bold">{o.code}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/5">
                <motion.span className={cx('block h-full rounded-full', k === 0 ? 'bg-accent' : 'bg-aqua')} initial={{ width: '0%' }} animate={{ width: `${o.w}%` }} transition={{ duration: 0.7, delay: 0.3 + 0.12 * k, ease: EASE }} />
              </span>
            </li>))}
        </ul>
      </section>
      <section aria-label="Explore airports" className="grid grid-cols-4 gap-2">
        {(['SIN', 'LIS', 'LHR', 'DXB'] as const).map((c, k) => (
          <motion.div key={c} initial={{ opacity: 0, y: 14, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...SPRING, delay: 0.6 + 0.08 * k }}
            className="onb-card relative h-20 overflow-hidden rounded-2xl">
            <span className="ph absolute inset-0"><Photo img={IMAGES.airports[c]} w={100} h={80} className="absolute inset-0 size-full" /></span>
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-1.5 left-2 text-cap font-bold text-white">{c}</span>
          </motion.div>))}
      </section>
    </div>
  )
}

/** "What would you like to do?": four photo cards; any number can be picked (interests, not an itinerary). */
function InterestCards({ value, locked, onToggle }: { value: Category[]; locked: boolean; onToggle: (c: Category) => void }) {
  return (
    <ul aria-label="Interests" className="grid grid-cols-2 gap-2.5">
      {INTERESTS.map((e, k) => {
        const on = value.includes(e.v), dim = locked && !on
        return (
          <motion.li key={e.v} initial={{ opacity: 0, y: 20, scale: 0.92, rotate: k % 2 ? 2 : -2 }}
            animate={{ opacity: dim ? 0.3 : 1, y: 0, scale: on ? 1.02 : dim ? 0.97 : 1, rotate: 0 }}
            transition={locked ? { duration: 0.2 } : { ...SPRING, delay: 0.5 + 0.08 * k }}>
            <button type="button" onClick={() => onToggle(e.v)} disabled={locked} aria-pressed={on} aria-label={e.label}
              className={cx('onb-card press relative block h-[6.5rem] w-full overflow-hidden rounded-[1.25rem] text-left [@media(max-height:680px)]:h-[5.25rem]', on && 'ring-2 ring-accent')}>
              <span className="ph absolute inset-0"><Photo img={e.img} w={180} h={104} className="absolute inset-0 size-full" /></span>
              <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-sub font-semibold text-white"><e.icon size={15} aria-hidden="true" />{e.label}</span>
              <AnimatePresence>{on && (
                <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.35 }}
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-accent text-white"><Check size={15} strokeWidth={3} /></motion.span>)}
              </AnimatePresence>
            </button>
          </motion.li>)
      })}
    </ul>
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
