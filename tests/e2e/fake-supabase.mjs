// In-browser stand-in for the Supabase HTTP API, used ONLY by the UI journey test.
// It mirrors the hosted seed (verified 2026-11-12) and the save_plan contract. It is not evidence about the real database.
const act = (id, airport, name, category, zone, mins, budget) => ({ id, airport_id: airport, name, description: `Fictional ${category} stop.`, category, terminal: 'Unverified', access_zone: zone, duration_minutes: mins, budget_label: budget, is_demo: true });
export const SEED = {
  airports: [
    { id: 'LIS', name: 'Lisbon Airport', timezone: 'Europe/Lisbon', dataset_label: 'Illustrative demo catalogue; not travel guidance' },
    { id: 'SIN', name: 'Singapore Changi Airport', timezone: 'Asia/Singapore', dataset_label: 'Illustrative demo catalogue; not travel guidance' },
  ],
  activities: [
    act('10000000-0000-4000-8000-000000000001', 'LIS', 'Demo Portuguese snack break', 'food', 'airside', 40, 'Illustrative: low'),
    act('10000000-0000-4000-8000-000000000002', 'LIS', 'Demo quiet rest', 'rest', 'airside', 60, 'Unknown'),
    act('10000000-0000-4000-8000-000000000003', 'LIS', 'Demo gift browse', 'shopping', 'unknown', 30, 'Illustrative: medium'),
    act('10000000-0000-4000-8000-000000000004', 'LIS', 'Demo extended work break', 'work', 'airside', 180, 'Unknown'),
    act('20000000-0000-4000-8000-000000000001', 'SIN', 'Demo noodle break', 'food', 'airside', 50, 'Illustrative: low'),
    act('20000000-0000-4000-8000-000000000002', 'SIN', 'Demo garden pause', 'culture', 'landside', 45, 'Unknown'),
    act('20000000-0000-4000-8000-000000000003', 'SIN', 'Demo recharge break', 'rest', 'airside', 75, 'Unknown'),
    act('20000000-0000-4000-8000-000000000004', 'SIN', 'Demo work session', 'work', 'unknown', 120, 'Unknown'),
  ],
  itinerary_templates: [
    { id: '30000000-0000-4000-8000-000000000001', airport_id: 'LIS', name: 'Demo snack and rest', description: 'Illustrative 100-minute plan.' },
    { id: '30000000-0000-4000-8000-000000000002', airport_id: 'SIN', name: 'Demo meal and recharge', description: 'Illustrative 125-minute plan.' },
  ],
  template_items: [
    { template_id: '30000000-0000-4000-8000-000000000001', airport_id: 'LIS', activity_id: '10000000-0000-4000-8000-000000000001', position: 1 },
    { template_id: '30000000-0000-4000-8000-000000000001', airport_id: 'LIS', activity_id: '10000000-0000-4000-8000-000000000002', position: 2 },
    { template_id: '30000000-0000-4000-8000-000000000002', airport_id: 'SIN', activity_id: '20000000-0000-4000-8000-000000000001', position: 1 },
    { template_id: '30000000-0000-4000-8000-000000000002', airport_id: 'SIN', activity_id: '20000000-0000-4000-8000-000000000003', position: 2 },
  ],
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** One fake backend shared by every browser context in a test run (so "another guest" is really isolated by token). */
export function createFakeSupabase() {
  const plans = new Map(); let users = 0;
  const db = { plans, calls: [], failNext: {} };
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  const userOf = (req) => { const m = /^Bearer (.+)$/.exec(req.headers()['authorization'] || ''); try { return JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url')).sub; } catch { return null; } };
  const withItems = (p) => ({ ...p.row, plan_items: p.items });

  db.handler = async (route) => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname; const method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    db.calls.push(`${method} ${path}`);
    const fail = Object.keys(db.failNext).find((k) => path.includes(k) && db.failNext[k] > 0);
    if (fail) { db.failNext[fail]--; return json(route, 500, { message: 'simulated server failure', code: 'XX000' }); }

    if (path === '/auth/v1/signup') {
      const sub = `00000000-0000-4000-8000-${String(++users).padStart(12, '0')}`; const exp = Math.floor(Date.now() / 1000) + 3600;
      const user = { id: sub, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
      return json(route, 200, { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', exp, is_anonymous: true })}.sig`, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: `r-${sub}`, user });
    }
    const table = path.replace('/rest/v1/', '');
    if (method === 'GET' && SEED[table]) {
      let rows = SEED[table];
      for (const [k, v] of url.searchParams) {
        if (v.startsWith('eq.')) rows = rows.filter((r) => String(r[k]) === v.slice(3));
        if (v.startsWith('in.(')) { const set = v.slice(4, -1).split(',').map((x) => x.replace(/"/g, '')); rows = rows.filter((r) => set.includes(String(r[k]))); }
      }
      return json(route, 200, rows);
    }
    if (path === '/rest/v1/rpc/save_plan') {
      const uid = userOf(req); if (!uid) return json(route, 401, { code: '42501', message: 'permission denied for function save_plan' });
      const a = req.postDataJSON(); const cur = plans.get(a.p_id);
      if (a.p_expected_revision === 0 ? !!cur : !cur || cur.row.owner_id !== uid) return json(route, 403, { code: '42501', message: 'PLAN_UNAVAILABLE' });
      if (cur && cur.row.revision !== a.p_expected_revision) return json(route, 409, { code: '40001', message: 'PLAN_CONFLICT' });
      const acts = a.p_activity_ids.map((id) => SEED.activities.find((x) => x.id === id && x.airport_id === a.p_airport_id));
      if (acts.some((x) => !x) || new Date(a.p_departure_at) <= new Date(a.p_arrival_at)) return json(route, 400, { code: '22023', message: 'INVALID_INPUT' });
      const now = new Date().toISOString();
      const row = { id: a.p_id, owner_id: uid, airport_id: a.p_airport_id, arrival_at: a.p_arrival_at, departure_at: a.p_departure_at, buffer_minutes: a.p_buffer_minutes, revision: a.p_expected_revision + 1, created_at: cur?.row.created_at ?? now, updated_at: now };
      plans.set(a.p_id, { row, items: acts.map((x, i) => ({ position: i + 1, activity_id: x.id, duration_minutes: x.duration_minutes })) });
      return json(route, 200, row);
    }
    if (table === 'layovers' && method === 'GET') {
      const uid = userOf(req); if (!uid) return json(route, 401, { code: '42501', message: 'permission denied for table layovers' });
      let mine = [...plans.values()].filter((p) => p.row.owner_id === uid);
      const id = url.searchParams.get('id'); if (id) mine = mine.filter((p) => p.row.id === id.replace('eq.', ''));
      mine.sort((x, y) => y.row.created_at.localeCompare(x.row.created_at));
      const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
      return single ? (mine.length === 1 ? json(route, 200, withItems(mine[0])) : json(route, 406, { code: 'PGRST116', message: 'not a single row', details: `The result contains ${mine.length} rows` })) : json(route, 200, mine.map(withItems));
    }
    return json(route, 404, { message: `fake backend: unhandled ${method} ${path}` });
  };
  return db;
}
