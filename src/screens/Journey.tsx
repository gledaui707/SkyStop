import { useState } from 'react'
import { ArrowRight, Clock, Info, PenLine, Plane, Search } from 'lucide-react'
import { useApp } from '../store'
import { SAMPLE_JOURNEYS, findSampleJourney, isRefFormat, normaliseRef, resolveJourney, type ResolvedJourney } from '../data/journeys'
import { airportInfo } from '../data/airportDirectory'
import { getAirport, isSupported } from '../data/mock'
import { fmtDur } from '../data/time'
import { sized } from '../data/images'
import { ActionBar, Button, Header, cx } from '../components/ui'

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
    <div className="pb-[calc(var(--nav-h)+2rem)]">
      <Header title="Add flight" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 px-5 pt-6">
        <div>
          <h1 className="text-title font-bold">Find your journey</h1>
          <p className="mt-3 text-body leading-relaxed text-muted-text">Enter your booking reference to see your connection and layover time.</p>
        </div>

        <form className="panel grid grid-cols-[minmax(0,1fr)] gap-6 rounded-[1.75rem] p-5" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          <label htmlFor="booking-ref" className="text-sub font-semibold text-ink">Booking reference</label>
          <div className={cx('flex min-h-16 items-center gap-3 rounded-2xl border bg-white px-4 transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15', error ? 'border-error' : 'border-[rgb(35_26_23/0.16)]')}>
            <Search size={22} className="shrink-0 text-muted" aria-hidden="true" />
            <input id="booking-ref" size={1} value={ref} maxLength={8} autoCapitalize="characters" autoComplete="off" spellCheck={false} inputMode="text"
              aria-invalid={!!error} aria-describedby={error ? 'ref-error' : 'ref-help'}
              onChange={(e) => { setRef(e.target.value.toUpperCase()); setError(null) }} placeholder="e.g. AXR7KD"
              className="min-h-16 min-w-0 flex-1 bg-transparent text-[1.5rem] font-bold tracking-[0.18em] text-ink outline-none placeholder:text-[1.0625rem] placeholder:font-medium placeholder:tracking-normal placeholder:text-muted" />
          </div>
          {error
            ? <p id="ref-error" role="alert" className="text-sub font-medium text-error">{error}</p>
            : <p id="ref-help" className="text-cap text-muted-text">6 letters or numbers.</p>}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <Button type="submit" className="w-full" disabled={!ref.trim()}>Find my journey</Button>
          </div>
        </form>
        <button type="button" onClick={() => go({ name: 'trip' })}
          className="glass press -mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white/50 text-body font-semibold text-ink backdrop-blur-xl">
          <PenLine size={18} className="text-accent-dark" />I can't find my flight</button>

        {showSamples && (
          <section aria-label="Sample bookings" className="anim-rise grid grid-cols-[minmax(0,1fr)] gap-2">
            {SAMPLE_JOURNEYS.map((j) => {
              const r = resolveJourney(j)
              return (
                <button key={j.ref} onClick={() => { setRef(j.ref); submit(j.ref) }}
                  className="panel press flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 text-left">
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
  const pct = (n: number) => `${(n / Math.max(j.layover.totalMin, 1)) * 100}%`
  const flight = { name: `${city(j.connection)} layover`, airport: j.connection, arrival: j.layover.arrivalLocal, departure: j.layover.departureLocal,
    bufferMin: j.layover.bufferMin, activityIds: [] as string[], origin: j.origin, destination: j.destination, bookingRef: j.ref }
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
      <span className={cx('absolute left-0 top-1 grid size-6 place-items-center rounded-full ring-4 ring-canvas', strong ? 'btn-coral' : 'bg-ink text-white')}><Plane size={12} className="-rotate-45" /></span>
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
        <section className="ph relative overflow-hidden rounded-[1.75rem] text-white">
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
        <section aria-label="Flight timeline" className="panel relative rounded-[1.75rem] p-5">
          <span aria-hidden="true" className="absolute bottom-10 left-[1.95rem] top-9 w-0.5 bg-gradient-to-b from-ink/30 via-accent to-ink/30" />
          <Stop code={j.origin} label="Depart" at={j.legs[0].departLocal} />
          <Flight min={j.legs[0].durationMin} />
          <Stop code={j.connection} label="Arrive" at={j.legs[0].arriveLocal} strong />
          <div className="panel-accent my-3 ml-9 rounded-2xl p-3.5">
            <p className="text-sub font-semibold text-accent-dark">Layover in {city(j.connection)}</p>
            <p className="text-h2 font-bold">{fmtDur(j.layover.totalMin)}</p>
          </div>
          <Stop code={j.connection} label="Depart" at={j.legs[1].departLocal} strong />
          <Flight min={j.legs[1].durationMin} />
          <Stop code={j.destination} label="Arrive" at={j.legs[1].arriveLocal} />
          <p className="mt-3 text-cap text-muted-text">All times are local to each airport.</p>
        </section>

        {/* time budget */}
        <section aria-label="Layover time breakdown" className="sunset rounded-[1.75rem] p-5">
          <p className="text-sub font-medium text-white/85">Estimated usable time</p>
          <p className="text-[2.75rem] font-bold leading-none tracking-[-0.03em] tabular-nums">{fmtDur(j.layover.usableMin)}</p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/25" aria-hidden="true">
            <span className="bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.75)_0_3px,rgb(255_255_255/0.35)_3px_6px)]" style={{ width: pct(j.layover.bufferMin) }} />
            <span className="bg-white" style={{ width: pct(j.layover.usableMin) }} />
          </div>
          <p className="mt-3 text-sub text-white/90">{fmtDur(j.layover.totalMin)} layover − {fmtDur(j.layover.bufferMin)} planning buffer = <b className="text-white">{fmtDur(j.layover.usableMin)} usable</b></p>
        </section>
        <p className="panel flex gap-2.5 rounded-2xl p-3.5 text-sub text-muted-text"><Info size={18} className="mt-0.5 shrink-0 text-accent-dark" />
          <span>The planning buffer keeps time free for airport procedures: leaving the aircraft, transfer security or passport control, walking to the gate and boarding.</span></p>
      </div>
      <ActionBar>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {saveError && <p role="alert" className="text-sub font-medium text-error">{saveError}</p>}
          <Button className="w-full" onClick={start}>{supported ? `Explore ${city(j.connection)}` : 'Build my itinerary'}</Button>
          {supported && (
            <button type="button" onClick={saveFlight} disabled={saving}
              className="press flex min-h-[3.25rem] w-full items-center justify-center rounded-full border border-white/90 bg-white/70 text-body font-semibold text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] backdrop-blur-xl disabled:opacity-60">
              {existing ? 'Open in My flights' : saving ? 'Saving…' : 'Save to My flights'}</button>)}
        </div>
      </ActionBar>
    </div>
  )
}
