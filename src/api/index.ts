import type { SupabaseClient } from '@supabase/supabase-js';
import * as r from './repositories';
import type { PlannerRepo } from '../features/planner/store';

export * from './repositories';
export * from './session';
export * from './resource';
export { getSupabase } from './client';

/** Repository bound to one client, ready for createPlannerStore({ repo }). */
export const createRepo = (sb: SupabaseClient): PlannerRepo & { listPlans(): Promise<r.Plan[]> } => ({
  listAirports: () => r.listAirports(sb),
  listActivities: (id) => r.listActivities(sb, id),
  listTemplates: (id) => r.listTemplates(sb, id),
  listPlans: () => r.listPlans(sb),
  getPlan: (id) => r.getPlan(sb, id),
  savePlan: (d, rev) => r.savePlan(sb, d, rev),
});
