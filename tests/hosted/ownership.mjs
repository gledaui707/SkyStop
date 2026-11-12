// Hosted two-session ownership/save/rollback test. Publishable key only; never a service-role key.
// Usage: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... node tests/hosted/ownership.mjs
// WARNING: creates anonymous users and a few synthetic plans in the target project (no delete path exists).
import { randomUUID } from 'node:crypto';
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'proxy-injected';
if (!URL_) throw new Error('SUPABASE_URL required');
const results = []; let failed = 0;
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); };
const call = async (path, { method = 'GET', token, body, headers = {} } = {}) => {
  const r = await fetch(URL_ + path, { method, headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j };
};
const guest = async () => { const r = await call('/auth/v1/signup', { method: 'POST', body: {} }); if (!r.body.access_token) throw new Error('anon signin failed ' + JSON.stringify(r.body)); return { token: r.body.access_token, id: r.body.user.id, role: r.body.user.role, anon: r.body.user.is_anonymous }; };
const save = (token, p) => call('/rest/v1/rpc/save_plan', { method: 'POST', token, body: p });
const fetchPlan = (token, id) => call(`/rest/v1/layovers?id=eq.${id}&select=*,plan_items(position,activity_id,duration_minutes)&plan_items.order=position`, { token });

const acts = (await call('/rest/v1/activities?select=id,airport_id,duration_minutes&order=id')).body;
const lis = acts.filter(a => a.airport_id === 'LIS'), sin = acts.find(a => a.airport_id === 'SIN');
const A = await guest(), B = await guest();
check('two distinct anonymous identities', A.id !== B.id && A.anon && B.anon, `role=${A.role}`);

const id = randomUUID();
const base = { p_id: id, p_expected_revision: 0, p_airport_id: 'LIS', p_arrival_at: '2030-01-01T10:00:00Z', p_departure_at: '2030-01-01T15:00:00Z', p_buffer_minutes: 90, p_activity_ids: [lis[1].id, lis[0].id] };
let r = await save(A.token, base);
check('A create (rev 0)', r.status < 300, JSON.stringify(r.body).slice(0, 120));
r = await fetchPlan(A.token, id); let p = r.body[0];
check('A reads own plan, revision 1, ordered items', p && p.revision === 1 && p.owner_id === A.id && p.plan_items.map(i => i.activity_id).join() === [lis[1].id, lis[0].id].join(), JSON.stringify(p?.plan_items?.map(i => [i.position, i.duration_minutes])));
check('duration snapshot copied by server', p?.plan_items?.[0]?.duration_minutes === lis[1].duration_minutes);

r = await fetchPlan(B.token, id); check('B cannot read A plan', r.status === 200 && r.body.length === 0, `rows=${r.body.length}`);
r = await call('/rest/v1/layovers?select=id', { token: B.token }); check('B list has no A rows', Array.isArray(r.body) && !r.body.some(x => x.id === id));
r = await save(B.token, { ...base, p_expected_revision: 1, p_activity_ids: [] }); check('B cannot edit A plan', r.status >= 400, `${r.status} ${r.body.code}`);
r = await save(B.token, base); check('B cannot take over A UUID via create', r.status >= 400, `${r.status} ${r.body.code}`);
r = await fetchPlan(A.token, id); check('A plan unchanged after B attempts', r.body[0].revision === 1 && r.body[0].plan_items.length === 2);
r = await call(`/rest/v1/layovers?id=eq.${id}`, { method: 'PATCH', token: A.token, body: { buffer_minutes: 0 } }); check('direct UPDATE denied even for owner', r.status >= 400, `${r.status}`);
r = await call('/rest/v1/layovers', { method: 'POST', token: A.token, body: { id: randomUUID(), owner_id: A.id, airport_id: 'LIS', arrival_at: base.p_arrival_at, departure_at: base.p_departure_at, buffer_minutes: 0 } }); check('direct INSERT denied', r.status >= 400, `${r.status}`);
r = await call(`/rest/v1/layovers?id=eq.${id}`, { method: 'DELETE', token: A.token }); check('direct DELETE does not remove', (await fetchPlan(A.token, id)).body.length === 1);

// edit
r = await save(A.token, { ...base, p_expected_revision: 1, p_buffer_minutes: 30, p_activity_ids: [lis[2].id, lis[0].id, lis[1].id] });
check('A edit with revision 1', r.status < 300, JSON.stringify(r.body).slice(0, 100));
p = (await fetchPlan(A.token, id)).body[0];
check('edit → revision 2, buffer 30, 3 ordered items', p.revision === 2 && p.buffer_minutes === 30 && p.plan_items.map(i => i.activity_id).join() === [lis[2].id, lis[0].id, lis[1].id].join());
// conflict
r = await save(A.token, { ...base, p_expected_revision: 1, p_activity_ids: [] }); check('stale revision → conflict 40001', r.status >= 400 && String(r.body.code) === '40001', `${r.status} ${r.body.code}`);
check('conflict left data intact', (await fetchPlan(A.token, id)).body[0].plan_items.length === 3);
// duplicate create
r = await save(A.token, base); check('re-create same UUID → conflict, no duplicate', r.status >= 400, `${r.status} ${r.body.code}`);
// rollback cases: each must leave rev 2 / 3 items
const before = JSON.stringify((await fetchPlan(A.token, id)).body[0]);
const bad = async (name, patch) => { const rr = await save(A.token, { ...base, p_expected_revision: 2, ...patch }); const same = JSON.stringify((await fetchPlan(A.token, id)).body[0]) === before; check(`rollback: ${name}`, rr.status >= 400 && same, `${rr.status} ${rr.body.code}`); };
await bad('cross-airport activity', { p_activity_ids: [lis[0].id, sin.id] });
await bad('duplicate activity ids', { p_activity_ids: [lis[0].id, lis[0].id] });
await bad('nonexistent activity', { p_activity_ids: [lis[0].id, randomUUID()] });
await bad('null in activity array', { p_activity_ids: [lis[0].id, null] });
await bad('21 activities', { p_activity_ids: Array.from({ length: 21 }, () => randomUUID()) });
await bad('departure before arrival', { p_departure_at: '2030-01-01T09:00:00Z' });
await bad('layover > 48h', { p_departure_at: '2030-01-04T10:00:00Z' });
await bad('buffer 1441', { p_buffer_minutes: 1441 });
await bad('negative buffer', { p_buffer_minutes: -1 });
await bad('airport change on existing plan', { p_airport_id: 'SIN', p_activity_ids: [] });
// empty plan valid, no-session and invalid token
const id2 = randomUUID(); r = await save(A.token, { ...base, p_id: id2, p_activity_ids: [] }); check('empty plan valid', r.status < 300);
r = await save(undefined, { ...base, p_id: randomUUID() }); check('no session cannot save', r.status >= 400, `${r.status}`);
r = await call('/rest/v1/layovers?select=id', {}); check('no session cannot read plans', r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0), `${r.status}`);
r = await call('/rest/v1/airports', { method: 'POST', token: A.token, body: { id: 'ZZZ', name: 'x', timezone: 'UTC' } }); check('signed-in user cannot mutate catalogue', r.status >= 400, `${r.status}`);
r = await call('/rest/v1/activities?id=eq.' + lis[0].id, { method: 'PATCH', token: A.token, body: { duration_minutes: 1 } }); check('signed-in cannot update activity', (await call('/rest/v1/activities?id=eq.' + lis[0].id + '&select=duration_minutes')).body[0].duration_minutes === lis[0].duration_minutes);
r = await call('/rest/v1/layovers?select=id', { token: B.token }); check('B still sees zero A plans', r.body.length === 0);
console.log(`\n${results.length - failed}/${results.length} passed`); process.exit(failed ? 1 : 0);
