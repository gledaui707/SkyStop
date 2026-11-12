import { useState } from 'react'
import { useApp } from '../store'
import { AIRPORTS, TEMPLATES, isSupported } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { budget, fmtDur, isOvernight, layoverMinutes } from '../data/time'
import { AirportPicker } from '../components/AirportPicker'
import { Coach } from '../components/Coach'
import { ActionBar, Button, Header, Field, cx, inputCls } from '../components/ui'

const BUFFERS = [90, 120, 180]

/** Two-step trip entry. Everything starts empty; the user enters their own booking. */
export function Trip({ airport, templateId }: { airport?: string; templateId?: string }) {
  const { replace, setDraft, advanceHint } = useApp()
  const [step, setStep] = useState<1 | 2>(airport ? 2 : 1)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [conn, setConn] = useState(airport ?? '')
  const [arr, setArr] = useState('')
  const [dep, setDep] = useState('')
  const [buf, setBuf] = useState(120)

  const step1Ok = !!origin && !!destination && origin !== destination
  const mins = arr && dep ? layoverMinutes(arr, dep) : 0
  const timesOk = mins > 0 && new Date(dep).getTime() >= Date.now()
  const showTimesError = !!arr && !!dep && !timesOk
  const b = budget(Math.max(mins, 0), buf, [])
  const ok = !!conn && timesOk && conn !== origin && conn !== destination

  const toStep2 = () => { setStep(2); advanceHint(2); window.scrollTo(0, 0) }
  const finish = () => {
    if (!ok) return
    const ap = airportInfo(conn)!
    const tpl = TEMPLATES.find((t) => t.id === templateId && t.airport === conn)
    setDraft({ name: tpl?.name ?? `${ap.city} layover`, airport: conn, arrival: arr, departure: dep, bufferMin: buf,
      activityIds: tpl ? [...tpl.activityIds] : [], origin: origin || undefined, destination: destination || undefined })
    advanceHint(3)
    replace(tpl || !isSupported(conn) ? { name: 'builder' } : { name: 'airport', code: conn, view: 'map' })
  }

  return (
    <div className="pb-44">
      <Header title={step === 1 ? 'Tell us about your trip' : 'Where is your layover?'} subtitle={`Step ${step} of 2`}
        onBack={step === 2 && !airport ? () => setStep(1) : undefined} />
      <div className="grid gap-5 px-5 pt-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2].map((n) => <span key={n} className={cx('h-1 flex-1 rounded-full', n <= step ? 'bg-accent' : 'bg-line')} />)}
        </div>
        <Coach step={step} />

        {step === 1 ? (
          <>
            <AirportPicker label="Flying from" value={origin} onChange={setOrigin} placeholder="City, airport or code, e.g. SIN" />
            <AirportPicker label="Flying to" value={destination} onChange={setDestination} placeholder="City, airport or code, e.g. LIS" />
            {origin && origin === destination && <p role="alert" className="text-sub font-medium text-error">Choose two different airports.</p>}
          </>
        ) : (
          <>
            {origin && destination && (
              <div className="flex items-center justify-between rounded-card bg-ink-tint px-4 py-3">
                <p className="text-body font-semibold">{origin} <span className="font-normal text-muted-text">to</span> {destination}</p>
                <button onClick={() => setStep(1)} className="min-h-11 text-body font-medium text-accent-dark">Edit</button>
              </div>
            )}
            <AirportPicker label="Connecting airport" value={conn} onChange={setConn} exclude={[origin, destination].filter(Boolean)} placeholder="Where do you change planes?" />
            {!conn ? (
              <div className="-mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sub text-muted-text">Layover guides:</span>
                {AIRPORTS.filter((a) => a.code !== origin && a.code !== destination).map((a) => (
                  <button key={a.code} type="button" onClick={() => setConn(a.code)} className="min-h-11 rounded-full border border-line bg-surface px-4 text-sub font-medium">{a.city} {a.code}</button>))}
              </div>
            ) : !isSupported(conn) && <p className="-mt-2 text-sub text-muted-text">No activity guide for this airport yet. You can still see your time budget.</p>}
            <Field label="Arrival at connecting airport (local time)">
              <input type="datetime-local" className={inputCls} value={arr} onChange={(e) => setArr(e.target.value)} /></Field>
            <Field label="Onward departure (local time)">
              <input type="datetime-local" className={inputCls} value={dep} onChange={(e) => setDep(e.target.value)} /></Field>
            {showTimesError && <p role="alert" className="text-body font-medium text-error">{new Date(dep).getTime() < Date.now() && mins > 0 ? 'Onward departure is already in the past.' : 'Departure must be after arrival.'}</p>}
            <fieldset>
              <legend className="mb-1.5 text-sub font-medium text-muted-text">Reserved airport buffer</legend>
              <div className="grid grid-cols-3 gap-2">
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
                  <div className="flex justify-between"><dt className="flex items-center gap-2 text-muted-text"><span className="size-2.5 rounded-full bg-muted/60" />Airport buffer</dt><dd className="font-semibold">− {fmtDur(b.buffer)}</dd></div>
                  <div className="flex justify-between border-t border-line pt-2"><dt className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-accent" />Usable time</dt><dd className="text-card font-bold text-accent-dark">{fmtDur(b.usable)}</dd></div>
                </dl>
                {b.usable === 0 && <p role="alert" className="mt-3 text-sub font-medium text-error">No usable time after the buffer. A shorter buffer may help.</p>}
                {isOvernight(new Date(arr), new Date(dep)) && <p className="mt-3 text-sub text-muted-text">Overnight connection: many services may be closed.</p>}
              </section>
            )}
          </>
        )}
      </div>
      <ActionBar>
        {step === 1
          ? <Button className="w-full" disabled={!step1Ok} onClick={toStep2}>Continue</Button>
          : <Button className="w-full" disabled={!ok} onClick={finish}>See what I can do</Button>}
      </ActionBar>
    </div>
  )
}
