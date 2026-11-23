import { useState } from 'react'
import { ArrowRight, Clock, Info, PenLine, Plane, Search, Sparkles } from 'lucide-react'
import { useApp } from '../store'
import { SAMPLE_JOURNEYS, findSampleJourney, isRefFormat, normaliseRef, resolveJourney, type ResolvedJourney } from '../data/journeys'
import { airportInfo } from '../data/airportDirectory'
import { getAirport, isSupported } from '../data/mock'
import { fmtDur } from '../data/time'
import { IMAGES, sized } from '../data/images'
import { journeyDraft } from '../features/onboarding/handoff'
import { ActionBar, Button, Header, cx } from '../components/ui'
import { TimeRing } from '../components/BudgetHero'

const day = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const time = (local: string) => local.slice(11, 16)
const city = (code: string) => airportInfo(code)?.city ?? code

/** Find your journey: booking reference first, manual entry as the alternative. Only the sample references resolve. */
export function FindJourney() {
  const { go } = useApp()
  const [ref, setRef] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showSamples, setShowSamples] = useState(false)

  const submit = (value = ref) => {
    const r = normaliseRef(value)
    if (!isRefFormat(r)) { setError('A booking reference has 6 letters or numbers, for example AXR7KD.'); return }
    if (!findSampleJourney(r)) { setError('Booking number not found.'); setShowSamples(true); return }
    setError(null); go({ name: 'journey', ref: r })
  }

  return (
    <div className="relative pb-[calc(var(--nav-h)+2rem)]">
      {/* Full-bleed photographic hero: the headline sits on the photo, the form floats over its lower edge. */}
      <div aria-hidden="true" className="ph pointer-events-none absolute inset-x-0 top-0 h-[26rem] overflow-hidden">
        <img src={sized(IMAGES.hero, 900, 900)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="anim-kenburns absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-transparent" />
        <div className="hero-melt absolute inset-x-0 bottom-0 h-[60%]" />
        <div className="absolute -right-16 top-24 size-64 rounded-full bg-accent/25 blur-3xl" />
      </div>
      <Header title="Add flight" />
      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-6 px-5 pt-[7.5rem]">
        <div className="anim-rise">
          <p className="glass-light inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-cap font-semibold"><Plane size={14} aria-hidden="true" />Already booked</p>
          <h1 className="mt-3 text-display font-bold [text-shadow:0_2px_18px_rgb(0_0_0/0.45)]">Find your journey</h1>
          <p className="mt-2 max-w-[22rem] text-body leading-relaxed text-ink/85 [text-shadow:0_1px_10px_rgb(0_0_0/0.5)]">Enter your booking reference to see your connection and layover time.</p>
        </div>

        <form className="glass-premium anim-rise grid grid-cols-[minmax(0,1fr)] gap-5 rounded-tray p-5 [animation-delay:80ms]" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          <label htmlFor="booking-ref" className="text-cap font-semibold uppercase tracking-[0.08em] text-muted-text">Booking reference</label>
          <div className={cx('field flex min-h-16 items-center gap-3 rounded-card px-4 transition-colors focus-within:!border-accent-dark focus-within:ring-4 focus-within:ring-accent/25', error && '!border-error')}>
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-tint text-accent-dark"><Search size={18} /></span>
            <input id="booking-ref" size={1} value={ref} maxLength={8} autoCapitalize="characters" autoComplete="off" spellCheck={false} inputMode="text"
              aria-invalid={!!error} aria-describedby={error ? 'ref-error' : 'ref-help'}
              onChange={(e) => { setRef(e.target.value.toUpperCase()); setError(null) }} placeholder="e.g. AXR7KD"
              className="min-h-16 min-w-0 flex-1 bg-transparent text-[1.5rem] font-bold tracking-[0.18em] text-ink outline-none placeholder:text-[1.0625rem] placeholder:font-medium placeholder:tracking-normal placeholder:text-muted" />
          </div>
          {error
            ? <p id="ref-error" role="alert" className="text-sub font-medium text-error">{error}</p>
            : <p id="ref-help" className="text-cap text-muted-text">6 letters or numbers, on your ticket or confirmation email.</p>}
          </div>
          <Button type="submit" className="w-full" disabled={!ref.trim()}>Find my journey</Button>
          <div className="flex items-center gap-3 text-cap text-muted" aria-hidden="true"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <Button type="button" variant="secondary" icon={PenLine} className="w-full" onClick={() => go({ name: 'trip' })}>I can't find my flight</Button>
        </form>

        {!showSamples && (
          <ol aria-label="How it works" className="anim-rise relative grid grid-cols-3 gap-2 px-1 [animation-delay:160ms]">
            <span aria-hidden="true" className="absolute left-[16.6%] right-[16.6%] top-[1.375rem] h-0.5 rounded-full [background:var(--rail-grad)] opacity-60" />
            {[[Search, 'Find', 'your booking'],
              [Clock, 'See', 'your layover'],
              [Sparkles, 'Plan', 'what fits']].map(([Icon, t, d], i) => {
              const I = Icon as typeof Search
              return (
                <li key={i} className="relative flex flex-col items-center text-center">
                  <span aria-hidden="true" className={cx('grid size-11 place-items-center rounded-full ring-4 ring-canvas', i === 0 ? 'btn-coral' : 'sheet-solid text-accent-dark')}><I size={19} /></span>
                  <b className="mt-2.5 text-sub font-semibold">{t as string}</b>
                  <span className="text-cap text-muted-text">{d as string}</span>
                </li>)
            })}
          </ol>
        )}

        {showSamples && (
          <section aria-label="Sample bookings" className="anim-rise grid grid-cols-[minmax(0,1fr)] gap-2">
            {SAMPLE_JOURNEYS.map((j) => {
              const r = resolveJourney(j)
              return (
                <button key={j.ref} onClick={() => { setRef(j.ref); submit(j.ref) }}
                  className="panel press flex min-h-16 items-center gap-3 rounded-control px-4 py-3 text-left">
                  <span className="rounded-lg bg-ink-tint px-2 py-1 font-mono text-sub font-bold tracking-wider">{j.ref}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold">{city(j.origin)} → {city(j.connection)} → {city(j.destination)}</span>
                    <span className="block text-cap text-muted-text">{fmtDur(r.layover.totalMin)} layover in {city(j.connection)}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-muted" />
                </button>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}

/** Journey overview: flight timeline with the connecting airport highlighted, layover, buffer and usable time. */
export function JourneyOverview({ refCode }: { refCode: string }) {
  const { go, setDraft, savePlan, plans, switchTab, setNotice } = useApp()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const j: ResolvedJourney | null = findSampleJourney(refCode)
  if (!j) return (
    <div><Header title="Your journey" /><p className="p-6 text-center text-body text-muted-text">This journey is not available.</p></div>
  )
  const conn = getAirport(j.connection), supported = isSupported(j.connection)
  const flight = journeyDraft(j)
  // The same sample journey is not saved twice: open the existing flight instead.
  const existing = plans.find((p) => p.bookingRef === j.ref && p.airport === j.connection && p.arrival.slice(0, 16) === j.layover.arrivalLocal.slice(0, 16))
  /** Saves the flight on its own (no activities yet), through the normal save path. */
  const saveFlight = async () => {
    if (saving) return
    if (existing) { go({ name: 'plan', id: existing.id }); return }
    setSaving(true); setSaveError(null)
    try {
      const p = await savePlan({ ...flight, newId: crypto.randomUUID() })
      switchTab('home'); setNotice(`${j.origin} → ${j.destination} is in My flights.`); void p
    } catch (e) { setSaveError(e instanceof Error ? e.message : String(e)) } finally { setSaving(false) }
  }
  const start = () => {
    setDraft({ ...flight, ...(existing ? { planId: existing.id, revision: existing.revision, activityIds: existing.activityIds, name: existing.name } : {}) })
    go(supported ? { name: 'airport', code: j.connection, view: 'list' } : { name: 'builder' })
  }
  const Stop = ({ code, label, at, strong }: { code: string; label: string; at: string; strong?: boolean }) => (
    <div className="relative pl-9">
      <span className={cx('absolute left-0 top-1 grid size-6 place-items-center rounded-full ring-4 ring-canvas', strong ? 'btn-coral' : 'pill-on')}><Plane size={12} className="-rotate-45" /></span>
      <p className="text-cap text-muted-text">{label} · {day(at)}</p>
      <p className="text-card font-bold"><span className="tabular-nums">{time(at)}</span> <span className="font-semibold">{code}</span> <span className="text-body font-normal text-muted-text">{city(code)}</span></p>
    </div>
  )
  const Flight = ({ min }: { min: number }) => (
    <p className="relative py-3 pl-9 text-sub text-muted-text"><Clock size={14} className="mr-1.5 inline" />Flight · {fmtDur(min)}</p>
  )
  return (
    <div className="pb-[calc(var(--nav-h)+11rem)]">
      <Header title="Your journey" subtitle={`Booking ${j.ref}`} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 px-5 pt-2">
        {/* route summary */}
        <section className="ph relative overflow-hidden rounded-surface text-white">
          <img src={sized(conn.image, 800, 420)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-deep/90 via-deep/50 to-deep/20" />
          <div className="relative p-5">
            <p className="text-cap font-semibold text-white/80">Connecting in</p>
            <p className="text-h1 font-bold leading-tight">{city(j.connection)} <span className="text-white/75">{j.connection}</span></p>
            <div className="mt-4 flex items-center gap-2 text-sub font-semibold">
              <span>{j.origin}</span><span className="h-px flex-1 border-t border-dashed border-white/50" />
              <span className="btn-coral rounded-full px-2.5 py-1">{j.connection}</span>
              <span className="h-px flex-1 border-t border-dashed border-white/50" /><span>{j.destination}</span>
            </div>
          </div>
        </section>

        {/* flight timeline */}
        <section aria-label="Flight timeline" className="panel relative rounded-surface p-5">
          <span aria-hidden="true" className="absolute bottom-10 left-[1.9rem] top-9 w-[3px] rounded-full bg-[image:var(--rail-grad)] opacity-80" />
          <Stop code={j.origin} label="Depart" at={j.legs[0].departLocal} />
          <Flight min={j.legs[0].durationMin} />
          <Stop code={j.connection} label="Arrive" at={j.legs[0].arriveLocal} strong />
          <div className="panel-accent my-3 ml-9 rounded-control p-3.5">
            <p className="text-sub font-semibold text-accent-dark">Layover in {city(j.connection)}</p>
            <p className="text-h2 font-bold">{fmtDur(j.layover.totalMin)}</p>
          </div>
          <Stop code={j.connection} label="Depart" at={j.legs[1].departLocal} strong />
          <Flight min={j.legs[1].durationMin} />
          <Stop code={j.destination} label="Arrive" at={j.legs[1].arriveLocal} />
          <p className="mt-3 text-cap text-muted-text">All times are local to each airport.</p>
        </section>

        {/* time budget */}
        <section aria-label="Layover time breakdown" className="instrument rounded-surface p-5">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sub font-medium text-muted-text">Estimated usable time</p>
              <p className="mt-1 whitespace-nowrap text-metric font-bold tabular-nums max-[359px]:text-[2.25rem]">{fmtDur(j.layover.usableMin)}</p>
            </div>
            <TimeRing total={Math.max(j.layover.totalMin, 1)} className="size-[5.5rem] min-[360px]:size-24" label={`${fmtDur(j.layover.bufferMin)} buffer and ${fmtDur(j.layover.usableMin)} usable, of ${fmtDur(j.layover.totalMin)}`}
              arcs={[{ min: j.layover.bufferMin, stroke: '', dash: true }, { min: j.layover.usableMin, stroke: 'url(#ring-coral)' }]}>
              <span aria-hidden="true" className="text-micro font-semibold text-muted-text">{fmtDur(j.layover.totalMin)}</span>
            </TimeRing>
          </div>
          <p className="mt-3 text-sub text-muted-text">{fmtDur(j.layover.totalMin)} layover − {fmtDur(j.layover.bufferMin)} planning buffer = <b className="text-ink">{fmtDur(j.layover.usableMin)} usable</b></p>
        </section>
        <p className="panel flex gap-2.5 rounded-control p-3.5 text-sub text-muted-text"><Info size={18} className="mt-0.5 shrink-0 text-accent-dark" />
          <span>The planning buffer keeps time free for airport procedures: leaving the aircraft, transfer security or passport control, walking to the gate and boarding.</span></p>
      </div>
      <ActionBar>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {saveError && <p role="alert" className="text-sub font-medium text-error">{saveError}</p>}
          <Button className="w-full" onClick={start}>{supported ? `Explore ${city(j.connection)}` : 'Build my itinerary'}</Button>
          {supported && (
            <Button variant="secondary" className="w-full" onClick={saveFlight} disabled={saving}>
              {existing ? 'Open in My flights' : saving ? 'Saving…' : 'Save to My flights'}</Button>)}
        </div>
      </ActionBar>
    </div>
  )
}
