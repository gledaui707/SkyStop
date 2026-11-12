export const MAX_PLAN_ACTIVITIES = 20;

export type Category = 'food' | 'rest' | 'shopping' | 'culture' | 'work';

export interface Activity {
  id: string;
  airportId: string;
  category: Category;
  durationMinutes: number;
}

export interface PlanBudget {
  activityMinutes: number;
  remainingMinutes: number;
  overBudget: boolean;
}

export function computeBudget(usableMinutes: number, durations: readonly number[]): PlanBudget {
  const activityMinutes = durations.reduce((a, d) => a + d, 0);
  const remainingMinutes = usableMinutes - activityMinutes;
  return { activityMinutes, remainingMinutes, overBudget: remainingMinutes < 0 };
}

/** Duration fits the time window (equal is allowed). */
export function fitsTime(a: Activity, availableMinutes: number): boolean {
  return a.durationMinutes <= availableMinutes;
}

export function filterActivities(
  list: readonly Activity[],
  f: { category?: Category | null; fitsMinutes?: number | null } = {},
): Activity[] {
  return list.filter(
    (a) =>
      (!f.category || a.category === f.category) &&
      (f.fitsMinutes == null || fitsTime(a, f.fitsMinutes)),
  );
}

/** Add once, same airport only, max 20. Returns the same array if ignored. */
export function addActivity(
  plan: readonly Activity[], a: Activity, airportId: string,
): Activity[] {
  if (a.airportId !== airportId) return [...plan];
  if (plan.some((p) => p.id === a.id)) return [...plan];
  if (plan.length >= MAX_PLAN_ACTIVITIES) return [...plan];
  return [...plan, a];
}

export function removeActivity(plan: readonly Activity[], id: string): Activity[] {
  return plan.filter((p) => p.id !== id);
}

/** Copy of a template's ordered activities; never mutates the template. */
export function copyTemplate(items: readonly Activity[]): Activity[] {
  return items.map((i) => ({ ...i }));
}
