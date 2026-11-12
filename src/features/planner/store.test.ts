import { describe, it, expect, vi } from 'vitest';
import { createPlannerStore, type PlannerRepo } from './store';
import { getUpcomingTrip } from '../home/upcoming';
import { instantToLocal } from '../../domain';
import { loadResource } from '../../api/resource';
import type { ActivityRow, AirportRow } from '../../types/database.types';
import type { Plan, PlanDraft, Template } from '../../api/repositories';

const LIS: AirportRow = { id: 'LIS', name: 'Lisbon Airport', timezone: 'Europe/Lisbon', dataset_label: 'demo' };
const SIN: AirportRow = { id: 'SIN', name: 'Singapore Changi', timezone: 'Asia/Singapore', dataset_label: 'demo' };
const act = (id: string, mins: number, airport = 'LIS'): ActivityRow => ({
  id, airport_id: airport, name: id, description: '', category: 'food', terminal: 'T1', access_zone: 'airside',
  duration_minutes: mins, budget_label: '€', is_demo: true,
});
const ACTS = [act('a40', 40), act('b60', 60), act('c30', 30), act('d180', 180)];
const TEMPLATE: Template = { id: 't1', airport_id: 'LIS', name: 'Snack and rest', description: '', items: [
  { template_id: 't1', airport_id: 'LIS', activity_id: 'a40', position: 1 },
  { template_id: 't1', airport_id: 'LIS', activity_id: 'b60', position: 2 },
] };

/** In-memory stand-in for the database with the same contract as the real repository. */
function fakeRepo() {
  const plans = new Map<string, Plan>();
  const repo: PlannerRepo & { plans: typeof plans; failNextSave?: string } = {
    plans,
    listAirports: async () => [LIS, SIN],
    listActivities: async (id) => ACTS.filter((a) => a.airport_id === id),
    listTemplates: async (id) => (id === 'LIS' ? [TEMPLATE] : []),
    getPlan: async (id) => plans.get(id) ?? null,
    savePlan: vi.fn(async (d: PlanDraft, rev: number) => {
      if (repo.failNextSave) { const m = repo.failNextSave; repo.failNextSave = undefined; throw new Error(m); }
      const prev = plans.get(d.id);
      if ((prev?.revision ?? 0) !== rev) throw new Error('PLAN_CONFLICT');
      const plan: Plan = {
        id: d.id, owner_id: 'guest', airport_id: d.airportId, arrival_at: d.arrivalAt, departure_at: d.departureAt,
        buffer_minutes: d.bufferMinutes, revision: rev + 1, created_at: '', updated_at: '',
        plan_items: d.activityIds.map((id, i) => ({ position: i + 1, activity_id: id, duration_minutes: ACTS.find((a) => a.id === id)!.duration_minutes })),
      };
      plans.set(d.id, plan);
      return plan;
    }),
  };
  return repo;
}
const NOW = new Date('2026-11-11T12:00:00Z');
const FORM = { arrivalDate: '2026-11-17', arrivalTime: '10:00', departureDate: '2026-11-17', departureTime: '15:00' };
const make = (repo = fakeRepo()) => ({ repo, store: createPlannerStore({ repo, now: () => NOW, newId: () => 'plan-1' }) });

describe('planner journey', () => {
  it('add flight → details → explore → add/remove → remaining time → save → reload → edit', async () => {
    const { repo, store } = make();
    const seen: string[] = [];
    store.subscribe(() => seen.push(store.getState().catalogue.status));
    await store.startNew(LIS);
    expect(seen).toContain('loading');
    expect(store.getState().catalogue.status).toBe('ready');
    expect(store.getState().budget).toBeNull(); // no connection details yet

    store.updateForm(FORM);
    let s = store.getState();
    expect(s.times?.ok && s.times.value.usableMinutes).toBe(210); // 300 - default 90 buffer
    expect(s.budget).toEqual({ activityMinutes: 0, remainingMinutes: 210, overBudget: false });

    store.applyTemplate('t1');
    expect(store.getState().items.map((i) => i.activity.id)).toEqual(['a40', 'b60']);
    expect(store.getState().budget?.remainingMinutes).toBe(110);
    expect(store.addActivity('d180')).toBe(true);
    expect(store.addActivity('d180')).toBe(false); // duplicate ignored
    expect(store.getState().budget).toEqual({ activityMinutes: 280, remainingMinutes: -70, overBudget: true });
    store.removeActivity('d180');
    expect(store.getState().budget?.remainingMinutes).toBe(110);
    expect(store.getState().save.status).toBe('dirty');
    expect(TEMPLATE.items).toHaveLength(2); // template untouched

    expect(await store.save()).toBe(true);
    s = store.getState();
    expect(s.save.status).toBe('saved');
    expect(s.revision).toBe(1);
    expect(repo.savePlan).toHaveBeenCalledWith(expect.objectContaining({
      id: 'plan-1', airportId: 'LIS', arrivalAt: '2026-11-17T10:00:00Z', departureAt: '2026-11-17T15:00:00Z',
      bufferMinutes: 90, activityIds: ['a40', 'b60'],
    }), 0);

    // "Refresh": a brand-new store has no memory; everything must come back from the repository.
    const fresh = createPlannerStore({ repo, now: () => NOW });
    await fresh.openPlan('plan-1');
    s = fresh.getState();
    expect(s.plan.status).toBe('ready');
    expect(s.airport?.id).toBe('LIS');
    expect(s.form).toEqual({ ...FORM, bufferMinutes: 90 });
    expect(s.items.map((i) => i.activity.id)).toEqual(['a40', 'b60']);
    expect(s.budget?.remainingMinutes).toBe(110);
    expect(s.save.status).toBe('saved');

    // Edit and save again.
    fresh.removeActivity('a40'); fresh.addActivity('c30'); fresh.updateForm({ bufferMinutes: 60 });
    expect(fresh.getState().budget).toEqual({ activityMinutes: 90, remainingMinutes: 150, overBudget: false });
    expect(await fresh.save()).toBe(true);
    expect(fresh.getState().revision).toBe(2);
    expect(repo.plans.get('plan-1')!.plan_items.map((i) => i.activity_id)).toEqual(['b60', 'c30']);
    expect(repo.plans.get('plan-1')!.buffer_minutes).toBe(60);
  });

  it('blocks save until connection details are valid', async () => {
    const { repo, store } = make();
    await store.startNew(LIS);
    expect(await store.save()).toBe(false);
    store.updateForm({ ...FORM, departureTime: '09:00' });
    expect(await store.save()).toBe(false);
    expect(store.getState().save.status).toBe('error');
    expect(repo.savePlan).not.toHaveBeenCalled();
  });

  it('double-click save sends one request', async () => {
    const { repo, store } = make();
    await store.startNew(LIS); store.updateForm(FORM);
    const [a, b] = await Promise.all([store.save(), store.save()]);
    expect([a, b]).toEqual([true, false]);
    expect(repo.savePlan).toHaveBeenCalledTimes(1);
  });

  it('failed save keeps the draft, shows no success, and can be retried', async () => {
    const { repo, store } = make();
    await store.startNew(LIS); store.updateForm(FORM); store.addActivity('a40');
    repo.failNextSave = 'network down';
    expect(await store.save()).toBe(false);
    let s = store.getState();
    expect(s.save).toEqual({ status: 'error', error: 'network down' });
    expect(s.revision).toBe(0);
    expect(s.items).toHaveLength(1);
    expect(await store.save()).toBe(true);
    expect(store.getState().revision).toBe(1);
  });

  it('catalogue error and retry; empty airport', async () => {
    const repo = fakeRepo();
    const list = repo.listActivities; let fail = true;
    repo.listActivities = async (id) => { if (fail) throw new Error('offline'); return list(id); };
    const store = createPlannerStore({ repo, now: () => NOW });
    await store.startNew(LIS);
    expect(store.getState().catalogue).toMatchObject({ status: 'error', error: 'offline' });
    fail = false; await store.retryCatalogue();
    expect(store.getState().catalogue.status).toBe('ready');
    repo.listActivities = async () => [];
    await store.startNew(SIN);
    expect(store.getState().catalogue.status).toBe('empty');
  });

  it('missing or foreign plan opens as empty; load failure as error', async () => {
    const { repo, store } = make();
    await store.openPlan('nope');
    expect(store.getState().plan.status).toBe('empty');
    repo.getPlan = async () => { throw new Error('boom'); };
    await store.openPlan('x');
    expect(store.getState().plan).toEqual({ status: 'error', error: 'boom' });
  });

  it('cannot add another airport\'s activity or exceed 20', async () => {
    const { store } = make();
    await store.startNew(LIS);
    expect(store.addActivity('not-in-catalogue')).toBe(false);
  });

  it('saved plan in the past stays editable and is flagged', async () => {
    const repo = fakeRepo();
    repo.plans.set('old', { id: 'old', owner_id: 'g', airport_id: 'LIS', arrival_at: '2026-11-01T10:00:00+00:00', departure_at: '2026-11-01T15:00:00+00:00',
      buffer_minutes: 90, revision: 3, created_at: '', updated_at: '', plan_items: [] });
    const store = createPlannerStore({ repo, now: () => NOW });
    await store.openPlan('old');
    expect(store.getState().pastPlan).toBe(true);
    expect(store.getState().times?.ok).toBe(true);
  });

  it('new arrival in the past is rejected', async () => {
    const { store } = make();
    await store.startNew(LIS);
    store.updateForm({ ...FORM, arrivalDate: '2026-11-01', departureDate: '2026-11-01' });
    const t = store.getState().times;
    expect(t && !t.ok && t.errors.arrival).toMatch(/future/);
  });
});

describe('homepage upcoming trip', () => {
  const plan = (id: string, arr: string, dep: string, airport = 'LIS'): Plan => ({ id, owner_id: 'g', airport_id: airport, arrival_at: arr, departure_at: dep,
    buffer_minutes: 90, revision: 1, created_at: '', updated_at: '', plan_items: [{ position: 1, activity_id: 'a40', duration_minutes: 40 }] });
  it('null when the guest has no saved trip', () => expect(getUpcomingTrip([], [LIS], NOW)).toBeNull());
  it('null when all trips have departed', () => {
    expect(getUpcomingTrip([plan('p', '2026-11-01T10:00:00Z', '2026-11-01T15:00:00Z')], [LIS], NOW)).toBeNull();
  });
  it('picks the earliest not-yet-departed trip, with airport-local times', () => {
    const t = getUpcomingTrip([
      plan('later', '2026-12-01T10:00:00Z', '2026-12-01T15:00:00Z'),
      plan('next', '2026-11-17T02:00:00Z', '2026-11-17T07:00:00Z', 'SIN'),
      plan('gone', '2026-11-01T10:00:00Z', '2026-11-01T15:00:00Z'),
    ], [LIS, SIN], NOW)!;
    expect(t.plan.id).toBe('next');
    expect(t.arrivalLocal).toEqual({ date: '2026-11-17', time: '10:00' });
    expect(t).toMatchObject({ totalMinutes: 300, activityCount: 1, activityMinutes: 40 });
  });
  it('a trip in progress still counts', () => {
    expect(getUpcomingTrip([plan('now', '2026-11-11T10:00:00Z', '2026-11-11T15:00:00Z')], [LIS], NOW)?.plan.id).toBe('now');
  });
});

describe('helpers', () => {
  it('instantToLocal handles Supabase offset format and zones', () => {
    expect(instantToLocal('2026-11-17T02:00:00+00:00', 'Asia/Singapore')).toEqual({ date: '2026-11-17', time: '10:00' });
    expect(instantToLocal('2026-07-01T23:30:00Z', 'Europe/Lisbon')).toEqual({ date: '2026-07-02', time: '00:30' });
  });
  it('loadResource classifies ready / empty / error', async () => {
    expect(await loadResource(async () => [1])).toEqual({ status: 'ready', data: [1] });
    expect(await loadResource(async () => [])).toEqual({ status: 'empty' });
    expect(await loadResource(async () => { throw new Error('x'); })).toEqual({ status: 'error', error: 'x' });
  });
});
