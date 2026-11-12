import type { Plan } from '../../data/repositories';
import type { AirportRow } from '../../types/database.types';
import { instantToLocal } from '../../domain';

export interface UpcomingTrip {
  plan: Plan; airport: AirportRow | null;
  arrivalLocal: { date: string; time: string } | null;
  departureLocal: { date: string; time: string } | null;
  totalMinutes: number; activityCount: number; activityMinutes: number;
}

/** The guest's next trip: the saved plan with the earliest arrival that has not departed yet.
 *  Returns null when the guest has no such plan — the homepage must then show the generic state. */
export function getUpcomingTrip(plans: readonly Plan[], airports: readonly AirportRow[], now: Date): UpcomingTrip | null {
  const next = plans
    .filter((p) => Date.parse(p.departure_at) > now.getTime())
    .sort((a, b) => Date.parse(a.arrival_at) - Date.parse(b.arrival_at))[0];
  if (!next) return null;
  const airport = airports.find((a) => a.id === next.airport_id) ?? null;
  return {
    plan: next, airport,
    arrivalLocal: airport ? instantToLocal(next.arrival_at, airport.timezone) : null,
    departureLocal: airport ? instantToLocal(next.departure_at, airport.timezone) : null,
    totalMinutes: (Date.parse(next.departure_at) - Date.parse(next.arrival_at)) / 60000,
    activityCount: next.plan_items.length,
    activityMinutes: next.plan_items.reduce((s, i) => s + i.duration_minutes, 0),
  };
}
