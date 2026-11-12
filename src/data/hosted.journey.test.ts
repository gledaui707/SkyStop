// Real-database happy path through the actual app code (supabase-js client → repositories → planner store).
// Skipped unless RUN_HOSTED=1 (creates one synthetic guest plan). Never calls the conflict path.
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createRepo, ensureGuestSession } from './index';
import { createPlannerStore } from '../features/planner/store';
import { getUpcomingTrip } from '../features/home/upcoming';

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
const client = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

describe.skipIf(process.env.RUN_HOSTED !== '1' || !url || !key)('hosted happy-path journey', () => {
  it('guest → catalogue → plan → save → reload → edit; other guest sees nothing', { timeout: 60000 }, async () => {
    const sb = client(); const repo = createRepo(sb);
    const guest = await ensureGuestSession(sb);
    expect(guest).toMatch(/^[0-9a-f-]{36}$/);
    expect(await repo.listPlans()).toEqual([]); // fresh guest: homepage shows no personalised trip

    const airports = await repo.listAirports();
    expect(airports.map((a) => a.id)).toEqual(['LIS', 'SIN']);
    const lis = airports.find((a) => a.id === 'LIS')!;

    const store = createPlannerStore({ repo });
    await store.startNew(lis);
    const cat = store.getState().catalogue;
    expect(cat.status).toBe('ready');
    expect(cat.data!.activities).toHaveLength(4);
    expect(cat.data!.templates.length).toBeGreaterThan(0);
    expect(cat.data!.templates[0]!.items.length).toBeGreaterThan(0);

    store.updateForm({ arrivalDate: day(7), arrivalTime: '10:00', departureDate: day(7), departureTime: '15:00' });
    expect(store.getState().times?.ok).toBe(true);
    store.applyTemplate(cat.data!.templates[0]!.id);
    const templateIds = store.getState().items.map((i) => i.activity.id);
    expect(templateIds.length).toBeGreaterThan(0);
    const extra = cat.data!.activities.find((a) => !templateIds.includes(a.id))!;
    expect(store.addActivity(extra.id)).toBe(true);
    const beforeSave = store.getState().budget!;
    expect(beforeSave.remainingMinutes).toBe(210 - beforeSave.activityMinutes);

    expect(await store.save(), store.getState().save.error ?? '').toBe(true);
    expect(store.getState().revision).toBe(1);
    const id = store.getState().planId;

    // "Refresh": new store, same guest session; state must come from the database.
    const reloaded = createPlannerStore({ repo });
    await reloaded.openPlan(id);
    let s = reloaded.getState();
    expect(s.plan.status).toBe('ready');
    expect(s.items.map((i) => i.activity.id)).toEqual([...templateIds, extra.id]);
    expect(s.form).toMatchObject({ arrivalDate: day(7), arrivalTime: '10:00', departureTime: '15:00', bufferMinutes: 90 });
    expect(s.budget).toEqual(beforeSave);

    // Homepage: this guest now has an upcoming trip.
    const trip = getUpcomingTrip(await repo.listPlans(), airports, new Date());
    expect(trip?.plan.id).toBe(id);
    expect(trip?.arrivalLocal).toEqual({ date: day(7), time: '10:00' });

    // Edit and save again.
    reloaded.removeActivity(extra.id); reloaded.updateForm({ bufferMinutes: 60 });
    expect(await reloaded.save(), reloaded.getState().save.error ?? '').toBe(true);
    expect(reloaded.getState().revision).toBe(2);
    const again = createPlannerStore({ repo });
    await again.openPlan(id);
    s = again.getState();
    expect(s.items.map((i) => i.activity.id)).toEqual(templateIds);
    expect(s.form.bufferMinutes).toBe(60);

    // A different guest cannot see or open it.
    const other = createRepo(client());
    expect(await other.listPlans()).toEqual([]);
    expect(await other.getPlan(id)).toBeNull();
  });
});
