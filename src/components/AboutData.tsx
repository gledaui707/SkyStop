import type { ReactNode } from 'react'
import { AIRPORTS, ACTIVITIES } from '../data/catalogue'
import { AIRPORT_GEO } from '../data/airportGeo'
import { SAMPLE_JOURNEYS } from '../data/journeys'
import { WALK_M_PER_MIN } from '../features/wayfinding/mock'

/** The one place for data notes, sources and limitations (Profile → Settings → About & data). The primary screens
 *  carry only short, contextual safety labels; everything explanatory lives here. */
const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="grid gap-1.5">
    <h3 className="text-body font-semibold text-ink">{title}</h3>
    <div className="grid gap-1.5 text-sub text-muted-text">{children}</div>
  </section>
)

export function AboutData() {
  return (
    <div className="grid gap-5 pb-2" aria-label="About and data">
      <p className="text-sub text-ink">SkyStop is a university prototype for planning a layover. Some data is real, some is simulated for the demo. This page says which is which.</p>

      <Block title="Sample flights and bookings">
        <p>SkyStop does not connect to airline systems. The booking references below are examples; their dates move with today's date so they always lie in the future.</p>
        <p className="font-medium text-ink tabular-nums">{SAMPLE_JOURNEYS.map((j) => `${j.ref} (${j.origin}–${j.connection}–${j.destination})`).join(' · ')}</p>
        <p>Flight comparison results are generated examples, not live fares.</p>
      </Block>

      <Block title="Airports and venues">
        <p>Venues, categories, terminals and airside/landside access come from the SkyStop database, compiled from each airport's public website. Opening hours and prices change; check with the venue before you go.</p>
        <ul className="grid gap-1">
          {AIRPORTS.map((a) => {
            const n = ACTIVITIES.filter((v) => v.airport === a.code).length
            return <li key={a.code}><b className="font-semibold text-ink">{a.code}</b> · {n} venues{a.note ? ` · ${a.note}` : ''}</li>
          })}
        </ul>
        <p>Venue durations are typical visit times, not guarantees.</p>
      </Block>

      <Block title="Maps and directions (illustrative)">
        <p>The basemap is © OpenStreetMap contributors, © CARTO. Terminal pins use published coordinates ({Object.values(AIRPORT_GEO).reduce((s, g) => s + g.terminals.filter((t) => !t.approx).length, 0)} from Wikipedia or Wikidata); a few are approximate.</p>
        <p>Venue spots inside a terminal, gate areas, route lines, distances and step-by-step directions are simulated. They show the order and rough length of a walk, not a surveyed path. Walking time assumes {WALK_M_PER_MIN} m per minute.</p>
        <p>Directions name no gate numbers, escalators or checkpoints unless the airport's own data lists them. Follow airport signs on the day.</p>
      </Block>

      <Block title="Transfers between terminals">
        <p>At Singapore Changi, transfer minutes, modes (Skytrain, shuttle, link bridge) and immigration requirements come from Changi's published information; some are planning estimates. Other airports use the simulated walking estimate.</p>
      </Block>

      <Block title="How the time budget works">
        <p>Usable time = layover minus a planning buffer for leaving the aircraft, transfer screening, the walk to your gate and boarding. Activities and transfers are counted once each; nothing is double-counted.</p>
        <p>Immigration, security and check-in queues have no published waiting times, so they are flagged but not timed. Leave extra time when a plan leaves the transit area.</p>
      </Block>

      <Block title="Entry requirements">
        <p>Landside activities require entering the country. SkyStop shows official guidance links but never decides whether you may enter. Check with the official source for your passport.</p>
      </Block>
    </div>
  )
}
