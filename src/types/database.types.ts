// HAND-WRITTEN from supabase/migrations (not CLI-generated; the Supabase CLI needs a login this session lacks).
// Replace with `npx supabase gen types typescript --project-id sgwbtgwccskqamzttczz` output when convenient.
export type Category = 'food' | 'rest' | 'shopping' | 'culture' | 'work';
export type AccessZone = 'airside' | 'landside' | 'unknown';

export interface AirportRow { id: string; name: string; timezone: string; dataset_label: string; entry_guidance_url?: string | null }
export interface LocationRow {
  id: string; airport_id: string; name: string; kind: 'transit_area' | 'public_area' | 'terminal' | 'concourse' | 'checkpoint' | 'transport';
  zone: AccessZone; terminal: string | null; source_url: string | null;
}
export interface TransferRow {
  id: string; airport_id: string; from_location: string; to_location: string; mode: 'walk' | 'skytrain_or_walk' | 'shuttle_bus' | 'link_bridge_walk';
  min_minutes: number; max_minutes: number; requires_immigration: boolean; requires_departure_checks: boolean; requires_through_check: boolean;
  verification: 'official' | 'planning_estimate'; source_url: string | null; note: string;
}
export interface ActivityLocationRow { activity_id: string; airport_id: string; location_id: string }
export interface ActivityRow {
  id: string; airport_id: string; name: string; description: string; category: Category;
  terminal: string; access_zone: AccessZone; duration_minutes: number; budget_label: string; is_demo: boolean;
  source_url?: string | null;
}
export interface TemplateRow { id: string; airport_id: string; name: string; description: string }
export interface TemplateItemRow { template_id: string; airport_id: string; activity_id: string; position: number }
export interface PlanItemRow { layover_id?: string; position: number; activity_id: string; duration_minutes: number }
export interface LayoverRow {
  id: string; owner_id: string; airport_id: string; arrival_at: string; departure_at: string;
  buffer_minutes: number; revision: number; created_at: string; updated_at: string;
}
export interface SavePlanArgs {
  p_id: string; p_expected_revision: number; p_airport_id: string; p_arrival_at: string;
  p_departure_at: string; p_buffer_minutes: number; p_activity_ids: string[];
}
