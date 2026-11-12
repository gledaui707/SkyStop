import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureGuestSession } from './session';
import { savePlan, DataError } from './repositories';

const fakeAuth = () => {
  let session: { user: { id: string } } | null = null;
  const signInAnonymously = vi.fn(async () => { await Promise.resolve(); session = { user: { id: 'u1' } }; return { data: { user: session.user }, error: null }; });
  return { signInAnonymously, auth: { getSession: vi.fn(async () => ({ data: { session } })), signInAnonymously } };
};

describe('ensureGuestSession', () => {
  it('concurrent calls create exactly one anonymous identity', async () => {
    const f = fakeAuth();
    const ids = await Promise.all([1, 2, 3].map(() => ensureGuestSession(f as unknown as SupabaseClient)));
    expect(ids).toEqual(['u1', 'u1', 'u1']);
    expect(f.signInAnonymously).toHaveBeenCalledTimes(1);
  });
  it('reuses an existing session without signing in', async () => {
    const f = fakeAuth(); f.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'existing' } } } } as never);
    expect(await ensureGuestSession(f as unknown as SupabaseClient)).toBe('existing');
    expect(f.signInAnonymously).not.toHaveBeenCalled();
  });
});

const draft = { id: 'p1', airportId: 'LIS', arrivalAt: '2030-01-01T10:00:00Z', departureAt: '2030-01-01T15:00:00Z', bufferMinutes: 90, activityIds: ['a', 'b'] };
const sb = (rpcError: unknown, row: unknown) => ({
  auth: { getSession: async () => ({ data: { session: { user: { id: 'u' } } } }) },
  rpc: vi.fn(async () => ({ error: rpcError })),
  from: () => ({ select: () => ({ eq: () => ({ order: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }) }),
}) as unknown as SupabaseClient;

describe('savePlan', () => {
  it('returns the re-fetched server copy and sends exact RPC args', async () => {
    const client = sb(null, { id: 'p1', revision: 1, plan_items: [] });
    const saved = await savePlan(client, draft, 0);
    expect(saved.revision).toBe(1);
    expect(client.rpc).toHaveBeenCalledWith('save_plan', {
      p_id: 'p1', p_expected_revision: 0, p_airport_id: 'LIS', p_arrival_at: draft.arrivalAt,
      p_departure_at: draft.departureAt, p_buffer_minutes: 90, p_activity_ids: ['a', 'b'],
    });
  });
  it('never reports success when the RPC errors (no false saved state)', async () => {
    const client = sb({ message: 'bad', code: '22023' }, null);
    await expect(savePlan(client, draft, 0)).rejects.toMatchObject({ code: '22023' });
  });
  it('fails if the plan cannot be read back', async () => {
    await expect(savePlan(sb(null, null), draft, 0)).rejects.toBeInstanceOf(DataError);
  });
});
