import { Temporal } from 'temporal-polyfill';

export const MAX_LAYOVER_MINUTES = 48 * 60;
export const MAX_BUFFER_MINUTES = 1440;
export const DEFAULT_BUFFER_MINUTES = 90;

export interface LayoverInput {
  /** IANA zone of the connecting airport, e.g. "Europe/Lisbon". */
  timezone: string;
  arrivalDate: string; // YYYY-MM-DD, airport-local
  arrivalTime: string; // HH:mm, airport-local
  departureDate: string;
  departureTime: string;
  bufferMinutes: number;
  /** Current instant; injected for deterministic tests. */
  now: Date;
  /** Past-arrival check applies to new plans only. */
  isNew: boolean;
}

export type LayoverField =
  | 'arrival' | 'departure' | 'buffer' | 'duration' | 'timezone';

export interface LayoverTimes {
  arrivalAt: string;   // ISO UTC instant, e.g. 2026-11-17T10:00:00Z
  departureAt: string;
  totalMinutes: number;
  usableMinutes: number;
  noUsableTime: boolean;
  /** Departure falls on a later airport-local calendar day. */
  nextDay: boolean;
}

export type LayoverResult =
  | { ok: true; value: LayoverTimes }
  | { ok: false; errors: Partial<Record<LayoverField, string>> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Local date+time in a zone -> UTC instant. Rejects gaps/overlaps. Throws RangeError. */
export function localToInstant(date: string, time: string, timezone: string): Temporal.Instant {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) throw new RangeError('invalid format');
  const dt = Temporal.PlainDateTime.from(`${date}T${time}`, { overflow: 'reject' });
  return dt.toZonedDateTime(timezone, { disambiguation: 'reject' }).toInstant();
}

function parseSide(
  date: string, time: string, tz: string, label: string,
): { instant?: Temporal.Instant; error?: string } {
  if (!date || !time) return { error: `Enter a ${label} date and time.` };
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
    return { error: `Enter a valid ${label} date and time (whole minutes).` };
  }
  try {
    return { instant: localToInstant(date, time, tz) };
  } catch (e) {
    // Distinguish impossible calendar dates from DST gap/overlap.
    try {
      Temporal.PlainDateTime.from(`${date}T${time}`, { overflow: 'reject' });
      return {
        error: `That ${label} time does not exist or is ambiguous because of a clock change at the airport. Choose another time.`,
      };
    } catch {
      return { error: `That ${label} date does not exist. Choose a valid date.` };
    }
  }
}

export function validateLayover(input: LayoverInput): LayoverResult {
  const errors: Partial<Record<LayoverField, string>> = {};

  try {
    Temporal.Now.zonedDateTimeISO(input.timezone);
  } catch {
    return { ok: false, errors: { timezone: 'Unknown airport time zone.' } };
  }

  const b = input.bufferMinutes;
  if (!Number.isInteger(b) || b < 0 || b > MAX_BUFFER_MINUTES) {
    errors.buffer = `Buffer must be a whole number of minutes from 0 to ${MAX_BUFFER_MINUTES}.`;
  }

  const arr = parseSide(input.arrivalDate, input.arrivalTime, input.timezone, 'arrival');
  const dep = parseSide(input.departureDate, input.departureTime, input.timezone, 'departure');
  if (arr.error) errors.arrival = arr.error;
  if (dep.error) errors.departure = dep.error;

  if (arr.instant && dep.instant) {
    const total = dep.instant.epochMilliseconds - arr.instant.epochMilliseconds;
    if (total <= 0) {
      errors.departure = 'Departure must be after arrival.';
    } else if (total / 60000 > MAX_LAYOVER_MINUTES) {
      errors.duration = 'Layover cannot exceed 48 hours.';
    }
  }
  if (arr.instant && input.isNew && !errors.arrival &&
      arr.instant.epochMilliseconds < input.now.getTime()) {
    errors.arrival = 'Arrival must be in the future for a new plan.';
  }

  if (Object.keys(errors).length || !arr.instant || !dep.instant) return { ok: false, errors };

  const totalMinutes = (dep.instant.epochMilliseconds - arr.instant.epochMilliseconds) / 60000;
  const usableMinutes = Math.max(0, totalMinutes - b);
  return {
    ok: true,
    value: {
      arrivalAt: arr.instant.toString(),
      departureAt: dep.instant.toString(),
      totalMinutes,
      usableMinutes,
      noUsableTime: usableMinutes === 0,
      nextDay: input.departureDate > input.arrivalDate,
    },
  };
}

/** UTC instant (ISO, any offset) -> airport-local form fields. */
export function instantToLocal(iso: string, timezone: string): { date: string; time: string } {
  const z = Temporal.Instant.from(iso).toZonedDateTimeISO(timezone);
  const p = (n: number) => String(n).padStart(2, '0');
  return { date: `${z.year}-${p(z.month)}-${p(z.day)}`, time: `${p(z.hour)}:${p(z.minute)}` };
}
