import { useState } from 'react'
import { Clock, ListChecks, Sparkles, X } from 'lucide-react'
import { useApp } from '../store'
import { ACTIVITIES, AIRPORTS, TEMPLATES, getAirport, isSupported } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { budget, fmtDur, isOvernight, layoverMinutesAt, timeSpan } from '../data/time'
import { validateLayover } from '../domain'
import { AirportPicker } from '../components/AirportPicker'
import { ActionBar, Button, Header, Field, InfoTip, Photo, cx, inputCls } from '../components/ui'

const BUFFERS = [90, 120, 180]
const split = (v: string) => { const [d = '', t = ''] = v.split('T'); return { date: d, time: t.slice(0, 5) } }

/** Plan a layover: enter the connecting airport and times.
 *  An airport, curated itinerary or activities chosen while exploring are carried in and shown here. */
export function Trip({ airport, templateId }: { airport?: string; templateId?: string }) {
  const { replace, setDraft, picked, setPicked } = useApp()
  const [conn, setConn] = useState(airport ?? picked?.airport ?? '')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [arr, setArr] = useState('')
  const [dep, setDep] = useState('')
  const [buf, setBuf] = useState(120)
  const [tplId, setTplId] = useState(templateId)

  const tpl = TEMPLATES.find((t) => t.id === tplId)
  const tplApplies = !!tpl && tpl.airport === conn
  const carried = picked && picked.airport === conn ? picked.ids : []
  const carriedNames = carried.map((id) => ACTIVITIES.find((a) => a.id === id)?.name).filter(Boolean)
  const supported = isSupported(conn)

  // Times are local to the connecting airport. For airports with a guide we know the time zone and use the
  // shared domain validation (time zones, daylight saving, overnight, 48 h limit); otherwise a wall-clock check.
  let mins = 0, timeError = ''
  if (arr && dep) {
    if (supported) {
      const a = split(arr), d = split(dep)
      const v = validateLayover({ timezone: getAirport(conn).timezone, arrivalDate: a.date, arrivalTime: a.time,
        departureDate: d.date, departureTime: d.time, bufferMinutes: buf, now: new Date(), isNew: false })
      if (!v.ok) timeError = v.errors.departure ?? v.errors.arrival ?? v.errors.duration ?? v.errors.buffer ?? 'Check the times.'
      else if (Date.parse(v.value.departureAt) < Date.now()) timeError = 'Onward departure is already in the past.'
      else mins = v.value.totalMinutes
    } else {
      mins = layoverMinutesAt(arr, dep)
      if (mins <= 0) timeError = 'Departure must be after arrival.'
      else if (new Date(dep).getTime() < Date.now()) timeError = 'Onward departure is already in the past.'
    }
  }
  const timesOk = mins > 0 && !timeError
  const b = budget(Math.max(mins, 0), buf, [])
  const ok = !!conn && timesOk

  const finish = () => {
    if (!ok) return
    const ap = airportInfo(conn)!
    const ids = [...new Set([...(tplApplies ? tpl!.activityIds : []), ...carried])]
    setDraft({ name: tplApplies ? tpl!.name : `${ap.city} layover`, airport: conn, arrival: arr, departure: dep, bufferMin: buf,
      activityIds: ids, origin: origin || undefined, destination: destination || undefined })
    setPicked(null)
    // With an itinerary or activities already chosen (or no activity guide) go straight to the builder;
    // otherwise continue to the airport's list of itineraries and activities.
    replace(tplApplies || ids.length || !supported ? { name: 'builder' } : { name: 'airport', code: conn, view: 'list' })
  }
  const cta = !supported && conn ? 'See my time budget' : tplApplies || carried.length ? 'Build my itinerary' : 'Explore activities'

  const sup = conn && supported ? getAirport(conn) : null
  const pct = (n: number) => `${b.total ? (n / b.total) * 100 : 0}%`
  return (
    <div className="pb-[calc(var(--nav-h)+7rem)]">
      <Header title="Add flight" subtitle={tplApplies ? `Itinerary: ${tpl!.name}` : conn ? airportInfo(conn)!.name : 'Your connection'} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 px-5 pt-1">
        {sup ? (
          <div className="ph relative h-36 overflow-hidden rounded-[1.75rem]">
            <Photo img={sup.image} w={440} h={144} className="absolute inset-0 size-full" />
            <span className="photo-fade absolute inset-x-0 bottom-0 h-full" />
            <div className="absolute inset-x-4 bottom-3 text-white">
              <p className="text-cap font-semibold text-white/75">Connecting in</p>
              <p className="text-h2 font-bold leading-tight">{sup.city} <span className="font-semibold text-white/70">{sup.code}</span></p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-h1 font-bold">Your time between flights</h2>
            <p className="mt-1 text-sub text-muted-text">Enter the connection from your booking. Times are local to the connecting airport.</p>
          </div>
        )}
        {sup && <p className="-mt-2 text-sub text-muted-text">Enter the connection from your booking. Times are local to the connecting airport.</p>}

        {tpl && (
          <section aria-label="Selected itinerary" className="panel-accent flex items-start gap-3 rounded-card p-3.5">
            <span className="btn-coral grid size-9 shrink-0 place-items-center rounded-full"><Sparkles size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold">{tpl.name}</p>
              <p className="text-sub text-muted-text">
                {tplApplies
                  ? `Curated itinerary · ${tpl.activityIds.length} activities · ${fmtDur(timeSpan(tpl.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)))}. It will be added to your plan.`
                  : `This itinerary is for ${getAirport(tpl.airport).city} (${tpl.airport}). Choose that airport to use it.`}
              </p>
            </div>
            <button type="button" onClick={() => setTplId(undefined)} aria-label={`Don't use ${tpl.name}`} className="grid size-11 shrink-0 place-items-center rounded-full text-muted-text"><X size={18} /></button>
          </section>
        )}
        {carried.length > 0 && (
          <section aria-label="Selected activities" className="panel flex items-start gap-3 rounded-card p-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-tint text-accent-dark"><ListChecks size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold">{carried.length} {carried.length === 1 ? 'activity' : 'activities'} selected</p>
              <p className="text-sub text-muted-text">{carriedNames.join(', ')}. They will be added to your plan.</p>
            </div>
            <button type="button" onClick={() => setPicked(null)} aria-label="Clear selected activities" className="grid size-11 shrink-0 place-items-center rounded-full text-muted-text"><X size={18} /></button>
          </section>
        )}

        {/* The whole journey (optional): where it starts and ends. Shown on your flight card. */}
        <section aria-label="Journey" className="panel grid grid-cols-[minmax(0,1fr)] gap-3 rounded-[1.75rem] p-4">
          <AirportPicker label="Flying from (optional)" value={origin} onChange={setOrigin} exclude={[conn, destination].filter(Boolean)} placeholder="City, airport or code" />
          <AirportPicker label="Final destination (optional)" value={destination} onChange={setDestination} exclude={[conn, origin].filter(Boolean)} placeholder="City, airport or code" />
        </section>

        {/* The connection as one surface: airport, then an arrive → depart rail. */}
        <section aria-label="Connection" className="panel rounded-[1.75rem] p-4">
          <AirportPicker label="Connecting airport" value={conn} onChange={setConn} exclude={[origin, destination].filter(Boolean)} placeholder="Where do you change planes?" />
          {!conn ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sub text-muted-text">Layover guides:</span>
              {AIRPORTS.map((a) => (
                <button key={a.code} type="button" onClick={() => setConn(a.code)} className="press min-h-11 rounded-full border border-line bg-white px-4 text-sub font-medium">{a.city} {a.code}</button>))}
            </div>
          ) : !supported && <p className="mt-2 text-sub text-muted-text">No activity guide for this airport yet. You can still see your time budget.</p>}

          <div className="mt-5 grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
            <div aria-hidden="true" className="row-span-2 flex flex-col items-center pt-9 pb-7">
              <span className="size-3.5 shrink-0 rounded-full border-[3px] border-accent-dark bg-canvas" />
              <span className="my-1 w-0.5 flex-1 rounded-full bg-gradient-to-b from-accent-dark/80 via-accent/40 to-[#f6a04d]/80" />
              <span className="size-3.5 shrink-0 rounded-full bg-[#f6a04d]" />
            </div>
            <Field label="Arrival at the connecting airport (local time)">
              <input type="datetime-local" className={inputCls} value={arr} onChange={(e) => setArr(e.target.value)} /></Field>
            <div className="mt-4">
              <Field label="Onward departure (local time)">
                <input type="datetime-local" className={inputCls} value={dep} onChange={(e) => setDep(e.target.value)} /></Field>
            </div>
          </div>
          {timeError && <p role="alert" className="mt-3 text-body font-medium text-error">{timeError}</p>}
        </section>

        <fieldset aria-labelledby="buffer-label">
          <legend className="w-full">
            <span className="flex items-center justify-between gap-3">
              <span id="buffer-label" className="text-body font-semibold">Planning buffer</span>
              <InfoTip id="buffer-help" title="Planning buffer">Time kept free for airport procedures: leaving the aircraft, transfer security or passport control, walking to the gate and boarding. Activities only use what is left.</InfoTip>
            </span>
          </legend>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-ink-tint p-1 ring-1 ring-line">
            {BUFFERS.map((m) => (
              <button type="button" key={m} aria-pressed={buf === m} onClick={() => setBuf(m)}
                className={cx('press min-h-12 rounded-full text-body font-semibold transition-colors', buf === m ? 'bg-white text-ink shadow-[0_4px_12px_rgb(70_35_25/0.14)]' : 'text-muted-text')}>{fmtDur(m)}</button>))}
          </div>
        </fieldset>

        {timesOk && (
          <section aria-label="Layover time breakdown" className="panel-accent anim-rise rounded-[1.75rem] p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sub text-muted-text">Usable time</p>
                <p className="text-[2.5rem] font-bold leading-none tracking-[-0.03em] tabular-nums">{fmtDur(b.usable)}</p>
              </div>
              <Clock size={28} className="mb-1 text-accent-dark" aria-hidden="true" />
            </div>
            <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-ink-tint" aria-hidden="true">
              <div className="bg-muted/45" style={{ width: pct(b.buffer) }} />
              <div className="rounded-r-full bg-gradient-to-r from-[#f6a04d] to-accent" style={{ width: pct(b.usable) }} />
            </div>
            <dl className="mt-4 grid gap-2 text-body">
              <div className="flex justify-between"><dt className="text-muted-text">Total layover</dt><dd className="font-semibold">{fmtDur(b.total)}</dd></div>
              <div className="flex justify-between"><dt className="flex items-center gap-2 text-muted-text"><span className="size-2.5 rounded-full bg-muted/60" />Planning buffer</dt><dd className="font-semibold">− {fmtDur(b.buffer)}</dd></div>
              <div className="flex justify-between  pt-2"><dt className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-accent" />Usable time</dt><dd className="text-card font-bold text-accent-dark">{fmtDur(b.usable)}</dd></div>
            </dl>
            {b.usable === 0 && <p role="alert" className="mt-3 text-sub font-medium text-error">No usable time after the buffer. A shorter buffer may help.</p>}
            {isOvernight(new Date(arr), new Date(dep)) && <p className="mt-3 text-sub text-muted-text">Overnight connection: many services may be closed.</p>}
          </section>
        )}
      </div>
      <ActionBar>
        <Button className="w-full" disabled={!ok} onClick={finish}>{cta}</Button>
      </ActionBar>
    </div>
  )
}
