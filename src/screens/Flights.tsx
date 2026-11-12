import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Plane, SlidersHorizontal } from 'lucide-react'
import { useApp } from '../store'
import { CITIES, getTemplates, getAirport, getActivities, searchFlights } from '../data/mock'
import { IMAGES, sized } from '../data/images'
import { AIRLINES } from '../data/airlines'
import { budget, fmtDay, fmtDur, fmtTime, isOvernight, money, toLocalInput, DEFAULT_BUFFER } from '../data/time'
import type { Flight } from '../data/types'
import { ActionBar, Button, Chip, ChipRow, Header, Notice, Photo, SectionTitle, cx } from '../components/ui'

function Airline({ code, size = 32, bold }: { code: string; size?: number; bold?: boolean }) {
  const a = AIRLINES[code]
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <img src={a.logo} alt="" width={size} height={size} className="shrink-0 rounded-md bg-white object-contain" style={{ width: size, height: size }} />
      <span className={cx('truncate', bold ? 'text-body font-semibold' : 'text-sub text-muted-text')}>{a.name}</span>
    </span>
  )
}
const city = (code: string) => CITIES.find((c) => c.code === code)?.name ?? code
const total = (f: Flight) => f.legOneMin + f.layoverMin + f.legTwoMin
const arriveConn = (f: Flight) => new Date(f.departAt.getTime() + f.legOneMin * 60000)
const departConn = (f: Flight) => new Date(arriveConn(f).getTime() + f.layoverMin * 60000)
const arriveDest = (f: Flight) => new Date(departConn(f).getTime() + f.legTwoMin * 60000)
const fits = (f: Flight) =>
  getTemplates(f.via).filter((t) => !budget(f.layoverMin, DEFAULT_BUFFER, t.activityIds.map((id) => getActivities(f.via).find((a) => a.id === id)!)).over).length

function dayOffset(f: Flight) {
  const d = Math.round((new Date(arriveDest(f)).setHours(0, 0, 0, 0) - new Date(f.departAt).setHours(0, 0, 0, 0)) / 864e5)
  return d > 0 ? ` +${d}` : ''
}

/** Selecting a connection creates the layover draft and opens airport discovery. */
function useChoose() {
  const { go, setDraft } = useApp()
  return (f: Flight) => {
    const ap = getAirport(f.via)
    setDraft({ name: `${ap.city} layover`, airport: f.via, arrival: toLocalInput(arriveConn(f)), departure: toLocalInput(departConn(f)), bufferMin: DEFAULT_BUFFER, activityIds: [], fromFlight: f.id, origin: f.origin, destination: f.destination })
    go({ name: 'airport', code: f.via, view: 'list' })
  }
}

export function Results({ origin, destination, date }: { origin: string; destination: string; date: string }) {
  const { go, back } = useApp()
  const [nonStop, setNonStop] = useState(false)
  const [sort, setSort] = useState<'price' | 'layover' | 'total'>('price')
  const [viaF, setViaF] = useState<'All' | 'LIS' | 'SIN'>('All')
  const [cmp, setCmp] = useState<string[]>([])
  const flights = useMemo(() => {
    let l = searchFlights(origin, destination, date)
    if (viaF !== 'All') l = l.filter((f) => f.via === viaF)
    return [...l].sort((a, b) => sort === 'price' ? a.priceUsd - b.priceUsd : sort === 'layover' ? b.layoverMin - a.layoverMin : total(a) - total(b))
  }, [origin, destination, date, viaF, sort])
  const cheapest = Math.min(...flights.map((f) => f.priceUsd))
  const d = new Date(date + 'T00:00')
  const toggle = (id: string) => setCmp((c) => c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c)
  return (
    <div className="pb-44">
      <div className="ph relative overflow-hidden rounded-b-[2rem] px-4 pb-6 pt-[var(--safe-top)] text-white">
        <img onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} src={sized(IMAGES.results, 900, 360)} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-deep/30 to-deep/20" /><div className="photo-fade absolute inset-x-0 bottom-0 h-[75%]" />
        <div className="relative">
          <button onClick={back} className="glass-dark press mt-2 flex min-h-11 items-center rounded-full pl-2 pr-4"><ChevronLeft size={24} strokeWidth={2.4} /><span className="text-sub font-medium">Change route</span></button>
          <div className="mt-4">
          <p className="glass-light inline-flex rounded-full px-3 py-1 text-cap font-semibold">Choose your connection</p>
          <div className="mt-3 flex items-center justify-between">
            <div><p className="text-title font-bold leading-none">{origin}</p><p className="mt-1 text-sub text-white/80">{city(origin).split(',')[0]}</p></div>
            <Plane size={24} className="text-white/70" />
            <div className="text-right"><p className="text-title font-bold leading-none">{destination}</p><p className="mt-1 text-sub text-white/80">{city(destination).split(',')[0]}</p></div>
          </div>
          </div>
        </div>
      </div>
      <div className="px-5 pt-4">
        <p className="text-sub text-muted-text">Flight date</p>
        <p className="text-h2 font-bold">{d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
        <div className="mt-3"><ChipRow>
          <Chip active={sort === 'price'} onClick={() => setSort('price')}><SlidersHorizontal size={16} />Cheapest</Chip>
          <Chip active={sort === 'layover'} onClick={() => setSort('layover')}>Longest layover</Chip>
          <Chip active={sort === 'total'} onClick={() => setSort('total')}>Shortest trip</Chip>
          <Chip active={viaF === 'LIS'} onClick={() => setViaF(viaF === 'LIS' ? 'All' : 'LIS')}>Via Lisbon</Chip>
          <Chip active={viaF === 'SIN'} onClick={() => setViaF(viaF === 'SIN' ? 'All' : 'SIN')}>Via Singapore</Chip>
          <Chip active={nonStop} onClick={() => setNonStop(!nonStop)}>Non-stop</Chip>
        </ChipRow></div>
        {nonStop ? (
          <div className="mt-3"><Notice>No non-stop flights for this route.</Notice></div>
        ) : flights.length === 0 ? <p className="mt-6 text-center text-muted-text">No flights match.</p> : (
          <ul className="mt-3 grid gap-3">
            {flights.map((f) => {
              const usable = Math.max(0, f.layoverMin - DEFAULT_BUFFER)
              return (
                <li key={f.id} className="panel rounded-[1.75rem] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Airline code={f.airline} size={32} bold />
                    {f.priceUsd === cheapest && <span className="rounded-md bg-success/10 px-2 py-0.5 text-cap font-semibold text-success">Cheapest</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div><p className="text-h1 font-semibold leading-none tabular-nums">{fmtTime(f.departAt)}</p><p className="mt-1 text-sub text-muted-text">{f.origin}</p></div>
                    <div className="min-w-0 flex-1 px-3 text-center">
                      <p className="text-cap font-semibold text-accent-dark">1 stop · {f.via}</p>
                      <div className="my-1 flex items-center gap-1"><span className="size-2 shrink-0 rounded-full border border-muted" /><span className="h-px flex-1 border-t border-dashed border-muted" /><Plane size={16} className="shrink-0 text-accent-dark" /><span className="h-px flex-1 border-t border-dashed border-muted" /><span className="size-2 shrink-0 rounded-full bg-accent" /></div>
                      <p className="text-cap font-semibold">{fmtDur(total(f))}</p>
                    </div>
                    <div className="text-right"><p className="text-h1 font-semibold leading-none tabular-nums">{fmtTime(arriveDest(f))}<sup className="text-cap text-muted-text">{dayOffset(f)}</sup></p><p className="mt-1 text-sub text-muted-text">{f.destination}</p></div>
                  </div>
                  <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Flight ${fmtDur(f.legOneMin)}, layover ${fmtDur(f.layoverMin)}, flight ${fmtDur(f.legTwoMin)}`}>
                    <span className="rounded-l-full bg-ink/15" style={{ flex: f.legOneMin }} /><span className="bg-gradient-to-r from-[#f6a04d] to-accent" style={{ flex: f.layoverMin }} /><span className="rounded-r-full bg-ink/15" style={{ flex: f.legTwoMin }} />
                  </div>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ink-tint p-2.5 ring-1 ring-line">
                    <span className="ph relative size-11 shrink-0 overflow-hidden rounded-xl"><Photo img={IMAGES.airports[f.via]} w={44} h={44} className="absolute inset-0 size-full" /></span>
                    <p className="text-sub leading-snug">Layover <b>{fmtDur(f.layoverMin)}</b> in {f.via}<br />
                      <span className="text-muted-text">{fmtDur(usable)} usable · {fits(f)} itinerary fits</span></p>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-h1 font-bold tabular-nums">{money(f.priceUsd)}</p>
                    <Button variant="secondary" className="min-h-11 px-4 text-sub" onClick={() => go({ name: 'flight', flightId: f.id, origin, destination, date })}>View connection</Button>
                  </div>
                  <label className="mt-3 flex min-h-11 items-center gap-3  pt-2 text-body">
                    <input type="checkbox" checked={cmp.includes(f.id)} onChange={() => toggle(f.id)} className="size-5 accent-accent" />Compare</label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {cmp.length >= 2 && (
        <ActionBar>
          <Button className="w-full" onClick={() => go({ name: 'compare', ids: cmp, origin, destination, date })}>Compare {cmp.length} flights</Button>
        </ActionBar>
      )}
    </div>
  )
}

export function FlightDetails({ flightId, origin, destination, date }: { flightId: string; origin: string; destination: string; date: string }) {
  const choose = useChoose()
  const f = searchFlights(origin, destination, date).find((x) => x.id === flightId)!
  const ap = getAirport(f.via)
  const usable = Math.max(0, f.layoverMin - DEFAULT_BUFFER)
  const night = isOvernight(arriveConn(f), departConn(f))
  const Node = ({ time, day, code, label, strong }: { time: Date; day?: boolean; code: string; label: string; strong?: boolean }) => (
    <div className="relative pb-5 pl-9">
      <span className={cx('absolute left-0 top-1 size-5 rounded-full border-[3px] border-accent', strong ? 'bg-accent' : 'bg-canvas')} />
      <p className="text-card font-semibold tabular-nums">{fmtTime(time)} {day && <span className="text-sub font-normal text-muted-text">{fmtDay(time)}</span>}</p>
      <p className="text-sub"><b>{code}</b> <span className="text-muted-text">· {label}</span></p>
    </div>
  )
  const Leg = ({ dur }: { dur: number }) => (
    <div className="pb-5 pl-9 text-sub text-muted-text"><Clock size={16} className="mr-1.5 inline text-accent-dark" />{fmtDur(dur)}</div>
  )
  return (
    <div className="pb-40">
      <Header title={`${origin} to ${destination}`} subtitle={AIRLINES[f.airline].name} />
      <div className="px-5 pt-2">
        <div className="mb-3"><Airline code={f.airline} size={40} bold /></div>
        <section className="panel relative rounded-[1.75rem] p-4">
          <span className="absolute bottom-10 left-[1.625rem] top-8 w-0.5 bg-line" />
          <Node time={f.departAt} day code={origin} label={city(origin)} strong />
          <Leg dur={f.legOneMin} />
          <Node time={arriveConn(f)} code={f.via} label="Arrive at connecting airport" />
          <button onClick={() => choose(f)}
            className="panel-accent press mb-5 ml-9 flex w-[calc(100%-2.25rem)] items-center gap-3 rounded-2xl p-3 text-left">
            <span className="ph relative size-12 shrink-0 overflow-hidden rounded-xl"><Photo img={ap.image} w={48} h={48} className="absolute inset-0 size-full" /></span>
            <span className="min-w-0 flex-1"><b className="block text-body font-semibold leading-tight">{fmtDur(f.layoverMin)} layover</b>
              <span className="text-sub text-muted-text">{fmtDur(usable)} usable · {fits(f)} itinerary fits</span></span>
            <ChevronRight size={20} className="shrink-0 text-accent-dark" /></button>
          <Node time={departConn(f)} day={night} code={f.via} label="Depart for onward flight" />
          <Leg dur={f.legTwoMin} />
          <div className="relative pl-9"><span className="absolute left-0 top-1 size-5 rounded-full border-[3px] border-accent bg-accent" />
            <p className="text-card font-semibold tabular-nums">{fmtTime(arriveDest(f))} <span className="text-sub font-normal text-muted-text">{fmtDay(arriveDest(f))}</span></p>
            <p className="text-sub"><b>{destination}</b> <span className="text-muted-text">· {city(destination)}</span></p></div>
        </section>
        {night && <div className="mt-3"><Notice>This is an overnight connection. Check airport service hours.</Notice></div>}
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[['Total', fmtDur(total(f))], ['Layover', fmtDur(f.layoverMin)], ['Price', money(f.priceUsd)]].map(([k, v]) => (
            <div key={k} className="panel rounded-2xl py-3"><dt className="text-cap text-muted-text">{k}</dt><dd className="text-body font-semibold">{v}</dd></div>))}
        </dl>
      </div>
      <ActionBar>
          <Button className="w-full" onClick={() => choose(f)}>Select this connection</Button>
        </ActionBar>
    </div>
  )
}

export function Compare({ ids, origin, destination, date }: { ids: string[]; origin: string; destination: string; date: string }) {
  const choose = useChoose()
  const list = searchFlights(origin, destination, date).filter((f) => ids.includes(f.id))
  const rows: [string, (f: Flight) => string][] = [
    
    ['Price', (f) => money(f.priceUsd)],
    ['Total time', (f) => fmtDur(total(f))],
    ['Layover', (f) => fmtDur(f.layoverMin)],
    ['Usable time', (f) => fmtDur(Math.max(0, f.layoverMin - DEFAULT_BUFFER))],
    ['Itineraries that fit', (f) => String(fits(f))],
    ['Overnight', (f) => (isOvernight(arriveConn(f), departConn(f)) ? 'Yes' : 'No')],
  ]
  return (
    <div className="pb-6">
      <Header title="Compare" subtitle={`${origin} to ${destination}`} />
      <div className="px-5 pt-4">
        <div className="panel overflow-x-auto rounded-[1.5rem]">
          <table className="w-full min-w-[26rem] border-collapse text-left">
            <thead><tr><th className="w-28 p-3" />{list.map((f) => (
              <th key={f.id} className="p-3 align-bottom">
                <span className="ph relative mb-1.5 block size-12 overflow-hidden rounded-xl"><Photo img={IMAGES.airports[f.via]} w={48} h={48} className="absolute inset-0 size-full" /></span>
                <span className="block text-body font-semibold">via {f.via}</span>
                <span className="text-cap font-normal text-muted-text">{fmtTime(f.departAt)} departure</span></th>))}</tr></thead>
            <tbody>
              <tr><th scope="row" className="p-3 text-sub font-medium text-muted-text">Airline</th>
                {list.map((f) => <td key={f.id} className="p-3"><span className="flex flex-col items-start gap-1"><img src={AIRLINES[f.airline].logo} alt="" className="size-8 rounded-md bg-white object-contain" /><span className="text-sub font-semibold">{AIRLINES[f.airline].name}</span></span></td>)}</tr>
              {rows.map(([k, fn]) => (
                <tr key={k} ><th scope="row" className="p-3 text-sub font-medium text-muted-text">{k}</th>
                  {list.map((f) => <td key={f.id} className="p-3 text-sub font-semibold tabular-nums">{fn(f)}</td>)}</tr>))}
              <tr><td />{list.map((f) => <td key={f.id} className="p-3"><Button variant="secondary" className="min-h-11 px-3 text-sub" onClick={() => choose(f)}>Choose</Button></td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
