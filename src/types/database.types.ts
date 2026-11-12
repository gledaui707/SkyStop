// HAND-WRITTEN from supabase/migrations (not CLI-generated; the Supabase CLI needs a login this session lacks).
// Replace with `npx supabase gen types typescript --project-id sgwbtgwccskqamzttczz` output when convenient.
export type Category = 'food' | 'rest' | 'shopping' | 'culture' | 'work';
export type AccessZone = 'airside' | 'landside' | 'unknown';

export interface AirportRow { id: string; name: string; timezone: string; dataset_label: string }
export interface ActivityRow {
  id: string; airport_id: string; name: string; description: string; category: Category;
  terminal: string; access_zone: AccessZone; duration_minutes: number; budget_label: string; is_demo: boolean;
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
