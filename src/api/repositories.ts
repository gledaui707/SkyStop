import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityLocationRow, ActivityRow, AirportRow, LocationRow, TransferRow, LayoverRow, PlanItemRow, SavePlanArgs, TemplateItemRow, TemplateRow } from '../types/database.types';
import { ensureGuestSession } from './session';

export class DataError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}
const ok = <T>(r: { data: T | null; error: { message: string; code?: string } | null }): T => {
  if (r.error) throw new DataError(r.error.message, r.error.code);
  return r.data as T;
};

export const listAirports = async (sb: SupabaseClient): Promise<AirportRow[]> =>
  ok(await sb.from('airports').select('*').order('id'));

export const listActivities = async (sb: SupabaseClient, airportId: string): Promise<ActivityRow[]> =>
  ok(await sb.from('activities').select('*').eq('airport_id', airportId).order('name'));

/** Transfer graph for one airport (empty arrays where no routing data is recorded). */
export async function listTransferGraph(sb: SupabaseClient, airportId: string) {
  const [locations, transfers, activityLocations] = await Promise.all([
    sb.from('airport_locations').select('*').eq('airport_id', airportId).order('id'),
    sb.from('airport_transfers').select('*').eq('airport_id', airportId).order('id'),
    sb.from('activity_locations').select('*').eq('airport_id', airportId),
  ])
  return { locations: ok(locations) as LocationRow[], transfers: ok(transfers) as TransferRow[], activityLocations: ok(activityLocations) as ActivityLocationRow[] }
}

export interface Template extends TemplateRow { items: TemplateItemRow[] }
export async function listTemplates(sb: SupabaseClient, airportId: string): Promise<Template[]> {
  const templates = ok(await sb.from('itinerary_templates').select('*').eq('airport_id', airportId).order('name')) as TemplateRow[];
  if (!templates.length) return [];
  const items = ok(await sb.from('template_items').select('*').in('template_id', templates.map((t) => t.id)).order('position')) as TemplateItemRow[];
  return templates.map((t) => ({ ...t, items: items.filter((i) => i.template_id === t.id).sort((a, b) => a.position - b.position) }));
}

export interface Plan extends LayoverRow { plan_items: PlanItemRow[] }
const PLAN_SELECT = '*, plan_items(position, activity_id, duration_minutes)';

export async function listPlans(sb: SupabaseClient): Promise<Plan[]> {
  await ensureGuestSession(sb);
  return ok(await sb.from('layovers').select(PLAN_SELECT).order('created_at', { ascending: false }).order('position', { referencedTable: 'plan_items' })) as Plan[];
}

/** null when missing or not owned (identical, by design). */
export async function getPlan(sb: SupabaseClient, id: string): Promise<Plan | null> {
  await ensureGuestSession(sb);
  return ok(await sb.from('layovers').select(PLAN_SELECT).eq('id', id).order('position', { referencedTable: 'plan_items' }).maybeSingle()) as Plan | null;
}

export interface PlanDraft {
  id: string; airportId: string; arrivalAt: string; departureAt: string; bufferMinutes: number; activityIds: string[];
}
/** New plan: expectedRevision 0 with a UUID generated once (crypto.randomUUID()). Edit: the loaded revision.
 *  Calls the server RPC, then re-fetches; success is only reported from the fetched server copy. No auto-retry. */
export async function savePlan(sb: SupabaseClient, d: PlanDraft, expectedRevision: number): Promise<Plan> {
  await ensureGuestSession(sb);
  const args: SavePlanArgs = {
    p_id: d.id, p_expected_revision: expectedRevision, p_airport_id: d.airportId, p_arrival_at: d.arrivalAt,
    p_departure_at: d.departureAt, p_buffer_minutes: d.bufferMinutes, p_activity_ids: d.activityIds,
  };
  const { error } = await sb.rpc('save_plan', args);
  if (error) throw new DataError(error.message, error.code);
  const saved = await getPlan(sb, d.id);
  if (!saved) throw new DataError('Saved plan could not be read back', 'READBACK_FAILED');
  return saved;
}
