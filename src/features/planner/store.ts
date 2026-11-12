// Headless planner state for the whole journey (no UI). Wire into React with:
//   const state = useSyncExternalStore(store.subscribe, store.getState)
import type { ActivityRow, AirportRow } from '../../types/database.types';
import type { Plan, PlanDraft, Template } from '../../api/repositories';
import {
  DEFAULT_BUFFER_MINUTES, validateLayover, instantToLocal, type LayoverResult,
  computeBudget, MAX_PLAN_ACTIVITIES, type PlanBudget,
} from '../../domain';

export interface PlannerRepo {
  listAirports(): Promise<AirportRow[]>;
  listActivities(airportId: string): Promise<ActivityRow[]>;
  listTemplates(airportId: string): Promise<Template[]>;
  getPlan(id: string): Promise<Plan | null>;
  savePlan(draft: PlanDraft, expectedRevision: number): Promise<Plan>;
}
export interface PlannerDeps { repo: PlannerRepo; now?: () => Date; newId?: () => string }

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
export interface Catalogue { activities: ActivityRow[]; templates: Template[] }
export interface PlanItem { activity: ActivityRow; durationMinutes: number }
export interface LayoverForm {
  arrivalDate: string; arrivalTime: string; departureDate: string; departureTime: string; bufferMinutes: number;
}
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface PlannerState {
  airport: AirportRow | null;
  catalogue: { status: LoadStatus; data: Catalogue | null; error: string | null };
  plan: { status: LoadStatus; error: string | null }; // loading an existing saved plan
  form: LayoverForm;
  /** null until the form has been touched/validated. */
  times: LayoverResult | null;
  items: PlanItem[];
  /** null when times are invalid. */
  budget: PlanBudget | null;
  planId: string;
  /** 0 = never saved. */
  revision: number;
  /** Arrival is in the past for an already-saved plan (still editable). */
  pastPlan: boolean;
  save: { status: SaveStatus; error: string | null };
}

const emptyForm = (): LayoverForm => ({
  arrivalDate: '', arrivalTime: '', departureDate: '', departureTime: '', bufferMinutes: DEFAULT_BUFFER_MINUTES,
});
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function createPlannerStore(deps: PlannerDeps) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const initial = (): PlannerState => ({
    airport: null,
    catalogue: { status: 'idle', data: null, error: null },
    plan: { status: 'idle', error: null },
    form: emptyForm(), times: null, items: [], budget: null,
    planId: newId(), revision: 0, pastPlan: false,
    save: { status: 'idle', error: null },
  });
  let state = initial();
  let loadToken = 0;
  const listeners = new Set<() => void>();
  const set = (patch: Partial<PlannerState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

  const recompute = (form: LayoverForm, items: PlanItem[], revision = state.revision, airport = state.airport) => {
    const touched = form.arrivalDate || form.arrivalTime || form.departureDate || form.departureTime;
    const times = airport && touched
      ? validateLayover({ ...form, timezone: airport.timezone, now: now(), isNew: revision === 0 })
      : null;
    const budget = times?.ok ? computeBudget(times.value.usableMinutes, items.map((i) => i.durationMinutes)) : null;
    const pastPlan = !!times?.ok && revision > 0 && Date.parse(times.value.arrivalAt) < now().getTime();
    return { times, budget, pastPlan };
  };
  const edit = (form: LayoverForm, items: PlanItem[]) =>
    set({ form, items, ...recompute(form, items), save: { status: 'dirty', error: null } });

  async function loadCatalogue(airport: AirportRow) {
    const token = ++loadToken;
    set({ catalogue: { status: 'loading', data: null, error: null } });
    try {
      const [activities, templates] = await Promise.all([
        deps.repo.listActivities(airport.id), deps.repo.listTemplates(airport.id),
      ]);
      if (token !== loadToken) return; // a newer load superseded this one
      set({ catalogue: { status: activities.length ? 'ready' : 'empty', data: { activities, templates }, error: null } });
    } catch (e) {
      if (token === loadToken) set({ catalogue: { status: 'error', data: null, error: message(e) } });
    }
  }

  return {
    getState: () => state,
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },

    /** Start a NEW plan at this airport (discards any current draft). */
    async startNew(airport: AirportRow) {
      state = { ...initial(), airport };
      await loadCatalogue(airport);
    },
    retryCatalogue: () => (state.airport ? loadCatalogue(state.airport) : Promise.resolve()),

    updateForm(patch: Partial<LayoverForm>) { edit({ ...state.form, ...patch }, state.items); },

    /** Replace the draft's activities with a copy of a template's ordered activities. */
    applyTemplate(templateId: string) {
      const cat = state.catalogue.data; const t = cat?.templates.find((x) => x.id === templateId);
      if (!cat || !t) return;
      const items = t.items.flatMap((i) => {
        const a = cat.activities.find((x) => x.id === i.activity_id);
        return a ? [{ activity: a, durationMinutes: a.duration_minutes }] : [];
      });
      edit(state.form, items);
    },
    /** Add once; same airport; max 20. Returns false if ignored. */
    addActivity(activityId: string): boolean {
      const a = state.catalogue.data?.activities.find((x) => x.id === activityId);
      if (!a || !state.airport || a.airport_id !== state.airport.id) return false;
      if (state.items.some((i) => i.activity.id === activityId) || state.items.length >= MAX_PLAN_ACTIVITIES) return false;
      edit(state.form, [...state.items, { activity: a, durationMinutes: a.duration_minutes }]);
      return true;
    },
    removeActivity(activityId: string) {
      edit(state.form, state.items.filter((i) => i.activity.id !== activityId));
    },
    isInPlan: (activityId: string) => state.items.some((i) => i.activity.id === activityId),

    /** Save to the database. Ignored while a save is in flight (prevents double-submit). Draft is kept on failure. */
    async save(): Promise<boolean> {
      if (state.save.status === 'saving') return false;
      const { airport } = state;
      const times = airport ? recompute(state.form, state.items).times : null;
      if (!airport || !times?.ok) {
        set({ times, save: { status: 'error', error: 'Complete the connection details before saving.' } });
        return false;
      }
      set({ save: { status: 'saving', error: null } });
      try {
        const saved = await deps.repo.savePlan({
          id: state.planId, airportId: airport.id, arrivalAt: times.value.arrivalAt, departureAt: times.value.departureAt,
          bufferMinutes: state.form.bufferMinutes, activityIds: state.items.map((i) => i.activity.id),
        }, state.revision);
        const items = syncItems(saved, state.catalogue.data?.activities ?? state.items.map((i) => i.activity));
        set({ revision: saved.revision, items, ...recompute(state.form, items, saved.revision), save: { status: 'saved', error: null } });
        return true;
      } catch (e) {
        set({ save: { status: 'error', error: message(e) } });
        return false;
      }
    },

    /** Open a saved plan for viewing/editing. 'empty' = missing or not this guest's plan. */
    async openPlan(id: string) {
      const token = ++loadToken;
      state = { ...initial(), planId: id, plan: { status: 'loading', error: null } };
      listeners.forEach((l) => l());
      try {
        const plan = await deps.repo.getPlan(id);
        if (token !== loadToken) return;
        if (!plan) { set({ plan: { status: 'empty', error: null } }); return; }
        const airports = await deps.repo.listAirports();
        const airport = airports.find((a) => a.id === plan.airport_id);
        if (!airport) throw new Error('Airport for this plan is unavailable.');
        const [activities, templates] = await Promise.all([
          deps.repo.listActivities(airport.id), deps.repo.listTemplates(airport.id),
        ]);
        if (token !== loadToken) return;
        const a = instantToLocal(plan.arrival_at, airport.timezone), d = instantToLocal(plan.departure_at, airport.timezone);
        const form: LayoverForm = { arrivalDate: a.date, arrivalTime: a.time, departureDate: d.date, departureTime: d.time, bufferMinutes: plan.buffer_minutes };
        const items = syncItems(plan, activities);
        set({
          airport, form, items, revision: plan.revision,
          catalogue: { status: activities.length ? 'ready' : 'empty', data: { activities, templates }, error: null },
          plan: { status: 'ready', error: null }, save: { status: 'saved', error: null },
          ...recompute(form, items, plan.revision, airport),
        });
      } catch (e) {
        if (token === loadToken) set({ plan: { status: 'error', error: message(e) } });
      }
    },
  };
}
export type PlannerStore = ReturnType<typeof createPlannerStore>;

/** Ordered items from the server copy, using the server's saved duration snapshots. */
function syncItems(plan: Plan, activities: ActivityRow[]): PlanItem[] {
  return [...plan.plan_items].sort((x, y) => x.position - y.position).flatMap((pi) => {
    const activity = activities.find((a) => a.id === pi.activity_id);
    return activity ? [{ activity, durationMinutes: pi.duration_minutes }] : [];
  });
}
