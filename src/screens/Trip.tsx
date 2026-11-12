import { useState } from 'react'
import { ChevronDown, Sparkles, X } from 'lucide-react'
import { useApp } from '../store'
import { ACTIVITIES, AIRPORTS, TEMPLATES, getAirport, isSupported } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { budget, fmtDur, isOvernight, layoverMinutesAt, timeSpan } from '../data/time'
import { validateLayover } from '../domain'
import { AirportPicker } from '../components/AirportPicker'
import { ActionBar, Button, Header, Field, cx, inputCls } from '../components/ui'

const BUFFERS = [90, 120, 180]
const split = (v: string) => { const [d = '', t = ''] = v.split('T'); return { date: d, time: t.slice(0, 5) } }

/** Plan a layover: the connection is the primary input. Origin and destination are optional journey details.
 *  An airport, curated itinerary or activities chosen while exploring are carried in and shown here. */
export function Trip({ airport, templateId }: { airport?: string; templateId?: string }) {
  const { replace, setDraft, picked, setPicked } = useApp()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [conn, setConn] = useState(airport ?? picked?.airport ?? '')
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
  const journeyClash = !!conn && (conn === origin || conn === destination) || (!!origin && origin === destination)
  const ok = !!conn && timesOk && !journeyClash
  const route = [origin, conn, destination].filter(Boolean).join(' → ')

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

  return (
    <div className="pb-[calc(var(--nav-h)+7rem)]">
      <Header title="Plan a layover" subtitle={tplApplies ? `Itinerary: ${tpl!.name}` : conn ? airportInfo(conn)!.name : 'Your connection'} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 px-5 pt-3">
        <p className="text-sub text-muted-text">Enter the connection from your booking. Times are local to the connecting airport.</p>

        {tpl && (
          <section aria-label="Selected itinerary" className="flex items-start gap-3 rounded-card border border-accent/40 bg-accent-tint p-3.5">
            <Sparkles size={20} className="mt-0.5 shrink-0 text-accent-dark" />
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
          <section aria-label="Selected activities" className="flex items-start gap-3 rounded-card border border-line bg-surface p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold">{carried.length} {carried.length === 1 ? 'activity' : 'activities'} selected</p>
              <p className="text-sub text-muted-text">{carriedNames.join(', ')}. They will be added to your plan.</p>
            </div>
            <button type="button" onClick={() => setPicked(null)} aria-label="Clear selected activities" className="grid size-11 shrink-0 place-items-center rounded-full text-muted-text"><X size={18} /></button>
          </section>
        )}

        <div>
          <AirportPicker label="Connecting airport" value={conn} onChange={setConn} exclude={[origin, destination].filter(Boolean)} placeholder="Where do you change planes?" />
          {!conn ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sub text-muted-text">Layover guides:</span>
              {AIRPORTS.filter((a) => a.code !== origin && a.code !== destination).map((a) => (
                <button key={a.code} type="button" onClick={() => setConn(a.code)} className="min-h-11 rounded-full border border-line bg-surface px-4 text-sub font-medium">{a.city} {a.code}</button>))}
            </div>
          ) : !supported && <p className="mt-2 text-sub text-muted-text">No activity guide for this airport yet. You can still see your time budget.</p>}
        </div>
        <Field label="Arrival at the connecting airport (local time)">
          <input type="datetime-local" className={inputCls} value={arr} onChange={(e) => setArr(e.target.value)} /></Field>
        <Field label="Onward departure (local time)">
          <input type="datetime-local" className={inputCls} value={dep} onChange={(e) => setDep(e.target.value)} /></Field>
        {timeError && <p role="alert" className="text-body font-medium text-error">{timeError}</p>}

        <fieldset>
          <legend className="mb-1 text-sub font-medium text-muted-text">Planning buffer</legend>
          <p id="buffer-help" className="mb-2 text-sub text-muted-text">Time kept free for airport procedures: leaving the aircraft, transfer security or passport control, walking to the gate and boarding. Activities only use what is left.</p>
          <div className="grid grid-cols-3 gap-2" aria-describedby="buffer-help">
            {BUFFERS.map((m) => (
              <button type="button" key={m} aria-pressed={buf === m} onClick={() => setBuf(m)}
                className={cx('min-h-12 rounded-[0.875rem] border text-body font-semibold', buf === m ? 'border-accent bg-accent-tint text-accent-dark' : 'border-line bg-surface')}>{fmtDur(m)}</button>))}
          </div>
        </fieldset>

        {timesOk && (
          <section aria-label="Layover time breakdown" className="rounded-card border border-line bg-surface p-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-ink-tint" aria-hidden="true">
              <div className="bg-muted/50" style={{ width: `${(b.buffer / b.total) * 100}%` }} />
              <div className="bg-accent" style={{ width: `${(b.usable / b.total) * 100}%` }} />
            </div>
            <dl className="mt-3 grid gap-2 text-body">
              <div className="flex justify-between"><dt className="text-muted-text">Total layover</dt><dd className="font-semibold">{fmtDur(b.total)}</dd></div>
              <div className="flex justify-between"><dt className="flex items-center gap-2 text-muted-text"><span className="size-2.5 rounded-full bg-muted/60" />Planning buffer</dt><dd className="font-semibold">− {fmtDur(b.buffer)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2"><dt className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-accent" />Usable time</dt><dd className="text-card font-bold text-accent-dark">{fmtDur(b.usable)}</dd></div>
            </dl>
            {b.usable === 0 && <p role="alert" className="mt-3 text-sub font-medium text-error">No usable time after the buffer. A shorter buffer may help.</p>}
            {isOvernight(new Date(arr), new Date(dep)) && <p className="mt-3 text-sub text-muted-text">Overnight connection: many services may be closed.</p>}
          </section>
        )}

        <details className="group rounded-card border border-line bg-surface" open={!!(origin || destination)}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-body font-medium">
            <span>Journey details <span className="font-normal text-muted-text">(optional)</span>{route.includes('→') && <span className="block text-sub font-normal text-muted-text">{route}</span>}</span>
            <ChevronDown size={20} className="shrink-0 text-muted-text transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 px-4 pb-4">
            <p className="text-sub text-muted-text">Where your trip starts and ends. Used only to label your plan.</p>
            <AirportPicker label="Flying from" value={origin} onChange={setOrigin} exclude={[conn, destination].filter(Boolean)} placeholder="City, airport or code, e.g. CGK" />
            <AirportPicker label="Final destination" value={destination} onChange={setDestination} exclude={[conn, origin].filter(Boolean)} placeholder="City, airport or code, e.g. CDG" />
          </div>
        </details>
        {journeyClash && <p role="alert" className="text-sub font-medium text-error">Origin, connecting airport and destination must be different airports.</p>}
      </div>
      <ActionBar>
        <Button className="w-full" disabled={!ok} onClick={finish}>{cta}</Button>
      </ActionBar>
    </div>
  )
}
