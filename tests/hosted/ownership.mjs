// Hosted two-session ownership/save/rollback test. Publishable key only; never a service-role key.
// Usage: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... node tests/hosted/ownership.mjs
// WARNING: creates anonymous users and a few synthetic plans in the target project (no delete path exists).
import { randomUUID } from 'node:crypto';
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'proxy-injected';
if (!URL_) throw new Error('SUPABASE_URL required');
const results = []; let failed = 0; let current = '(setup)';
const REQ_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);
const MAX_ATTEMPTS = 3;
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 23)}] ${m}`);
const step = (name) => { current = name; log(`RUN   ${name}`); };
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); if (!ok) failed++; log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); };
process.on('uncaughtException', (e) => { log(`CRASH during step "${current}": ${e.stack || e}`); process.exit(2); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// One HTTP request, with a hard timeout. Retries ONLY idempotent reads (GET) on network error, timeout, 5xx or 429.
// Writes (POST/PATCH/DELETE, including save_plan) are never auto-retried: a blind retry of a timed-out save is unsafe
// and would hide exactly the behaviour under test. A timed-out write is reported as status 0 / TIMEOUT.
const call = async (path, { method = 'GET', token, body, headers = {}, timeoutMs = REQ_TIMEOUT_MS } = {}) => {
  const attempts = method === 'GET' ? MAX_ATTEMPTS : 1;
  let last;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const t0 = Date.now(); const tag = `${method} ${path.split('?')[0]} [${current}] try ${attempt}/${attempts}`;
    try {
      const r = await fetch(URL_ + path, { method, headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
      const text = await r.text(); let j; try { j = JSON.parse(text); } catch { j = text; }
      log(`  http ${r.status} ${Date.now() - t0}ms ${tag} request-id=${r.headers.get('sb-request-id') || r.headers.get('x-request-id') || '-'}`);
      last = { status: r.status, body: j };
      if (method === 'GET' && (r.status >= 500 || r.status === 429) && attempt < attempts) { await sleep(500 * 2 ** (attempt - 1)); continue; }
      return last;
    } catch (e) {
      const kind = e.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      log(`  ${kind} after ${Date.now() - t0}ms ${tag}${e.cause ? ' cause=' + (e.cause.code || e.cause.message) : ''}`);
      last = { status: 0, body: { code: kind, message: `${kind} after ${Date.now() - t0}ms` } };
      if (attempt < attempts) { await sleep(500 * 2 ** (attempt - 1)); continue; }
    }
  }
  return last;
};
const timedOut = (r) => r.status === 0;
const guest = async () => { const r = await call('/auth/v1/signup', { method: 'POST', body: {} }); if (!r.body?.access_token) throw new Error('anon signin failed ' + JSON.stringify(r.body)); return { token: r.body.access_token, id: r.body.user.id, role: r.body.user.role, anon: r.body.user.is_anonymous }; };
const save = (token, p, opts) => call('/rest/v1/rpc/save_plan', { method: 'POST', token, body: p, ...opts });
const fetchPlan = (token, id) => call(`/rest/v1/layovers?id=eq.${id}&select=*,plan_items(position,activity_id,duration_minutes)&plan_items.order=position`, { token });
// If a write that should return a conflict/denial times out, diagnose without changing anything:
// (1) is the stored plan unchanged? (2) does one longer-wait repeat of the same request ever answer?
const diagnoseTimeout = async (label, token, id, payload, expectedRevision, expectedItems) => {
  log(`  DIAG ${label}: write timed out; checking server state`);
  const p = (await fetchPlan(token, id)).body?.[0];
  log(`  DIAG state: revision=${p?.revision} items=${p?.plan_items?.length} (expected ${expectedRevision}/${expectedItems})`);
  const t0 = Date.now(); const again = await save(token, payload, { timeoutMs: 60000 });
  log(`  DIAG repeat with 60s wait: status=${again.status} code=${again.body?.code} after ${Date.now() - t0}ms`);
  return { unchanged: p?.revision === expectedRevision && p?.plan_items?.length === expectedItems, repeatStatus: again.status, repeatCode: again.body?.code };
};

const acts = (await call('/rest/v1/activities?select=id,airport_id,duration_minutes&order=id')).body;
const lis = acts.filter(a => a.airport_id === 'LIS'), sin = acts.find(a => a.airport_id === 'SIN');
const A = await guest(), B = await guest();
step('two distinct anonymous identities'); check('two distinct anonymous identities', A.id !== B.id && A.anon && B.anon, `role=${A.role}`);

const id = randomUUID();
const base = { p_id: id, p_expected_revision: 0, p_airport_id: 'LIS', p_arrival_at: '2030-01-01T10:00:00Z', p_departure_at: '2030-01-01T15:00:00Z', p_buffer_minutes: 90, p_activity_ids: [lis[1].id, lis[0].id] };
step('A create (rev 0)');
let r = await save(A.token, base);
step('A create (rev 0)'); check('A create (rev 0)', r.status < 300, JSON.stringify(r.body).slice(0, 120));
r = await fetchPlan(A.token, id); let p = r.body[0];
step('A reads own plan, revision 1, ordered items'); check('A reads own plan, revision 1, ordered items', p && p.revision === 1 && p.owner_id === A.id && p.plan_items.map(i => i.activity_id).join() === [lis[1].id, lis[0].id].join(), JSON.stringify(p?.plan_items?.map(i => [i.position, i.duration_minutes])));
step('duration snapshot copied by server'); check('duration snapshot copied by server', p?.plan_items?.[0]?.duration_minutes === lis[1].duration_minutes);

step('B cannot read A plan'); r = await fetchPlan(B.token, id); check('B cannot read A plan', r.status === 200 && r.body.length === 0, `rows=${r.body.length}`);
step('B list has no A rows'); r = await call('/rest/v1/layovers?select=id', { token: B.token }); check('B list has no A rows', Array.isArray(r.body) && !r.body.some(x => x.id === id));
step('B cannot edit A plan'); r = await save(B.token, { ...base, p_expected_revision: 1, p_activity_ids: [] }); check('B cannot edit A plan', r.status >= 400, `${r.status} ${r.body.code}`);
step('B cannot take over A UUID via create'); r = await save(B.token, base);
if (timedOut(r)) await diagnoseTimeout('takeover', A.token, id, base, 1, 2);
check('B cannot take over A UUID via create', r.status >= 400 && !timedOut(r), `${r.status} ${r.body.code}`);
step('A plan unchanged after B attempts'); r = await fetchPlan(A.token, id); check('A plan unchanged after B attempts', r.body[0].revision === 1 && r.body[0].plan_items.length === 2);
step('direct UPDATE denied even for owner'); r = await call(`/rest/v1/layovers?id=eq.${id}`, { method: 'PATCH', token: A.token, body: { buffer_minutes: 0 } }); check('direct UPDATE denied even for owner', r.status >= 400, `${r.status}`);
step('direct INSERT denied'); r = await call('/rest/v1/layovers', { method: 'POST', token: A.token, body: { id: randomUUID(), owner_id: A.id, airport_id: 'LIS', arrival_at: base.p_arrival_at, departure_at: base.p_departure_at, buffer_minutes: 0 } }); check('direct INSERT denied', r.status >= 400, `${r.status}`);
step('direct DELETE does not remove'); r = await call(`/rest/v1/layovers?id=eq.${id}`, { method: 'DELETE', token: A.token }); check('direct DELETE does not remove', (await fetchPlan(A.token, id)).body.length === 1);

// edit
step('A edit with revision 1');
r = await save(A.token, { ...base, p_expected_revision: 1, p_buffer_minutes: 30, p_activity_ids: [lis[2].id, lis[0].id, lis[1].id] });
step('A edit with revision 1'); check('A edit with revision 1', r.status < 300, JSON.stringify(r.body).slice(0, 100));
p = (await fetchPlan(A.token, id)).body[0];
step('edit → revision 2, buffer 30, 3 ordered items'); check('edit → revision 2, buffer 30, 3 ordered items', p.revision === 2 && p.buffer_minutes === 30 && p.plan_items.map(i => i.activity_id).join() === [lis[2].id, lis[0].id, lis[1].id].join());
// conflict
step('stale revision → conflict');
const stale = { ...base, p_expected_revision: 1, p_activity_ids: [] }; r = await save(A.token, stale);
if (timedOut(r)) await diagnoseTimeout('stale revision', A.token, id, stale, 2, 3);
check('stale revision → conflict', r.status >= 400 && !timedOut(r), `${r.status} ${r.body.code}`);
step('conflict left data intact'); check('conflict left data intact', (await fetchPlan(A.token, id)).body[0].plan_items.length === 3);
// duplicate create
step('re-create same UUID → conflict, no duplicate'); r = await save(A.token, base);
if (timedOut(r)) await diagnoseTimeout('re-create', A.token, id, base, 2, 3);
check('re-create same UUID → conflict, no duplicate', r.status >= 400 && !timedOut(r), `${r.status} ${r.body.code}`);
// rollback cases: each must leave rev 2 / 3 items
const before = JSON.stringify((await fetchPlan(A.token, id)).body[0]);
const bad = async (name, patch) => { step('rollback: ' + name); const rr = await save(A.token, { ...base, p_expected_revision: 2, ...patch }); if (timedOut(rr)) log('  (timed out; not counted as a pass)'); const same = JSON.stringify((await fetchPlan(A.token, id)).body[0]) === before; check(`rollback: ${name}`, rr.status >= 400 && same, `${rr.status} ${rr.body.code}`); };
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
step('empty plan valid'); const id2 = randomUUID(); r = await save(A.token, { ...base, p_id: id2, p_activity_ids: [] }); check('empty plan valid', r.status < 300);
step('no session cannot save'); r = await save(undefined, { ...base, p_id: randomUUID() }); check('no session cannot save', r.status >= 400, `${r.status}`);
step('no session cannot read plans'); r = await call('/rest/v1/layovers?select=id', {}); check('no session cannot read plans', r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0), `${r.status}`);
step('signed-in user cannot mutate catalogue'); r = await call('/rest/v1/airports', { method: 'POST', token: A.token, body: { id: 'ZZZ', name: 'x', timezone: 'UTC' } }); check('signed-in user cannot mutate catalogue', r.status >= 400, `${r.status}`);
step('signed-in cannot update activity'); r = await call('/rest/v1/activities?id=eq.' + lis[0].id, { method: 'PATCH', token: A.token, body: { duration_minutes: 1 } }); check('signed-in cannot update activity', (await call('/rest/v1/activities?id=eq.' + lis[0].id + '&select=duration_minutes')).body[0].duration_minutes === lis[0].duration_minutes);
step('B still sees zero A plans'); r = await call('/rest/v1/layovers?select=id', { token: B.token }); check('B still sees zero A plans', r.body.length === 0);
log(`${results.length - failed}/${results.length} passed`); if (failed) log('FAILED: ' + results.filter(x => !x.ok).map(x => x.name).join(' | ')); process.exit(failed ? 1 : 0);
