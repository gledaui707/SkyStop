import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
async function fail(sql, code) { try { await db.exec(sql); } catch(e) { if(code) assert.equal(e.code,code); return; } throw Error('Expected rejection'); }
const root = new URL('../../', import.meta.url);
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');`);
await check('Migrations execute in order', async()=>{
 for (const f of readdirSync(new URL('supabase/migrations/',root)).sort()) await db.exec(readFileSync(new URL('supabase/migrations/'+f,root),'utf8'));
});
await check('Seed is repeatable; exact catalogue counts',async()=>{
 const seed=readFileSync(new URL('supabase/seed.sql',root),'utf8'); await db.exec(seed); await db.exec(seed);
 for(const [t,n] of [['airports',4],['activities',29],['itinerary_templates',5],['template_items',10]]) assert.equal((await db.query(`select count(*)::int n from public.${t}`)).rows[0].n,n);
});
const plan='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const a1='10000000-0000-4000-8000-000000000001', a2='10000000-0000-4000-8000-000000000002', foreign='20000000-0000-4000-8000-000000000001';
function save(rev,ids=[a1,a2],opts={}) {return `select * from public.save_plan('${opts.id||plan}',${rev},'${opts.airport||'LIS'}','2026-11-17T10:00:00Z','${opts.end||'2026-11-17T15:00:00Z'}',${opts.buffer??90},array[${ids.map(x=>x===null?'null':`'${x}'`).join(',')}]::uuid[])`;}
async function identity(role,uid='') {await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${uid}',false);`);}
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
await identity('anon');
await check('Public catalogue reads work; unauthenticated plan access/write denied',async()=>{assert.equal((await db.query('select * from public.airports')).rows.length,4);await fail('select * from public.layovers','42501');await fail(save(0),'42501');});
await identity('authenticated',A);
await check('Guest A creates and retrieves ordered snapshot',async()=>{await db.exec(save(0));const x=await db.query('select * from public.plan_items order by position');assert.deepEqual(x.rows.map(r=>r.duration_minutes),[40,60]);assert.equal((await db.query('select revision from public.layovers')).rows[0].revision,1);});
await check('Direct client writes and catalogue changes denied',async()=>{await fail("update public.layovers set buffer_minutes=1",'42501');await fail("delete from public.plan_items",'42501');await fail("update public.activities set duration_minutes=1",'42501');});
await check('Repeated create UUID conflicts without duplicate',async()=>{await fail(save(0),'PT409');assert.equal((await db.query('select * from public.layovers')).rows.length,1);});
await identity('authenticated',B);
await check('Guest B cannot read parent/children or edit/take ownership',async()=>{assert.equal((await db.query('select * from public.layovers')).rows.length,0);assert.equal((await db.query('select * from public.plan_items')).rows.length,0);await fail(save(1),'42501');await fail(save(0),'PT409');});
await check('Guest B can independently create own plan',async()=>{await db.exec(save(0,[],{id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'}));assert.equal((await db.query('select * from public.layovers')).rows.length,1);});
await identity('authenticated',A);
await check('Invalid activity requests rejected; previous data retained',async()=>{for(const ids of [[foreign],[a1,a1],[null]]) await fail(save(1,ids),'22023');assert.equal((await db.query('select * from public.plan_items')).rows.length,2);});
await check('Invalid timestamps/buffer roll back without revision change',async()=>{await fail(save(1,[a1],{end:'2026-11-17T09:00:00Z'}),'23514');await fail(save(1,[a1],{buffer:-1}),'23514');assert.equal((await db.query('select revision from public.layovers')).rows[0].revision,1);});
await check('Edit increments revision, replaces children; stale edit rejected',async()=>{await db.exec(save(1,[a1]));await fail(save(1,[a2]),'PT409');assert.equal((await db.query('select revision from public.layovers')).rows[0].revision,2);assert.deepEqual((await db.query('select activity_id from public.plan_items')).rows.map(x=>x.activity_id),[a1]);});
await check('Empty plan save is valid',async()=>{await db.exec(save(2,[]));assert.equal((await db.query('select * from public.plan_items')).rows.length,0);});
await identity('authenticated','');
await check('Missing identity cannot call privileged save',async()=>{await fail(save(0),'42501');});
await db.exec('reset role');
await check('Composite FK prevents cross-airport item even as administrator',async()=>{await fail(`insert into public.plan_items values ('${plan}','LIS','${foreign}',1,50)`,'23503');});
await check('Exception after child deletion rolls back entire RPC',async()=>{
 await db.exec(`create function public.test_failure() returns trigger language plpgsql as $$ begin raise exception 'forced child failure'; end $$; create trigger test_failure before insert on public.plan_items for each row execute function public.test_failure();`);
 await identity('authenticated',A);await fail(save(3,[a1]),'P0001');assert.equal((await db.query('select revision from public.layovers')).rows[0].revision,3);
 await db.exec('reset role; drop trigger test_failure on public.plan_items; drop function public.test_failure();');
});
await check('Transfer graph: migration is re-runnable, Changi rows present, catalogue-style access',async()=>{
 await db.exec('reset role');
 await db.exec(readFileSync(new URL('supabase/migrations/202611130001_transfer_graph.sql',root),'utf8'));
 for(const [t,n] of [['airport_locations',5],['airport_transfers',18],['activity_locations',12]]) assert.equal((await db.query(`select count(*)::int n from public.${t}`)).rows[0].n,n);
 await fail(`insert into public.airport_transfers(id,airport_id,from_location,to_location,mode,min_minutes,max_minutes,verification) values ('x','SIN','SIN-T1-TRANSIT','SIN-T1-TRANSIT','walk',1,2,'official')`,'23514');
 await fail(`insert into public.airport_transfers(id,airport_id,from_location,to_location,mode,min_minutes,max_minutes,verification) values ('y','LIS','SIN-T1-TRANSIT','SIN-T2-TRANSIT','walk',1,2,'official')`,'23503');
 await identity('anon');
 assert.equal((await db.query('select * from public.airport_transfers')).rows.length,18);
 await fail("insert into public.airport_locations(id,airport_id,name,kind,zone) values ('SIN-X','SIN','x','terminal','airside')",'42501');
 await identity('authenticated',A);
 await fail("delete from public.airport_transfers",'42501');
 await db.exec('reset role');
});
await check('Flight details, profiles and flight removal are owner-only',async()=>{
 await db.exec('reset role');
 await db.exec(readFileSync(new URL('supabase/migrations/202611140001_flights_profiles.sql',root),'utf8')); // re-runnable
 await identity('authenticated',A);
 await db.exec(`insert into public.layover_details(layover_id,origin_airport,destination_airport,booking_ref) values ('${plan}','CGK','CDG','AXR7KD')`);
 await db.exec(`insert into public.traveler_profiles(nationality) values ('Indonesian')`);
 assert.equal((await db.query('select count(*)::int n from public.layover_details')).rows[0].n,1);
 await fail(`insert into public.layover_details(layover_id,origin_airport) values ('${plan}','XXX')`,'23505');
 await identity('authenticated',B);
 assert.equal((await db.query('select count(*)::int n from public.layover_details')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from public.traveler_profiles')).rows[0].n,0);
 await db.exec(`update public.traveler_profiles set nationality='X'`); // affects no visible rows
 await db.exec(`delete from public.layovers where id='${plan}'`);     // not B's: silently nothing
 await fail(`insert into public.layover_details(layover_id,origin_airport) values ('${plan}','LHR')`,'42501'); // not B's flight
 await fail(`insert into public.traveler_profiles(owner_id,nationality) values ('${A}','Spoof')`,'42501');
 await identity('anon');
 await fail('select * from public.traveler_profiles','42501');
 await identity('authenticated',A);
 assert.equal((await db.query('select nationality from public.traveler_profiles')).rows[0].nationality,'Indonesian');
 assert.equal((await db.query(`select count(*)::int n from public.layovers where id='${plan}'`)).rows[0].n,1);
 await db.exec(`delete from public.layovers where id='${plan}'`);
 for (const t of ['layovers','plan_items','layover_details']) assert.equal((await db.query(`select count(*)::int n from public.${t} where ${t==='layovers'?'id':'layover_id'}='${plan}'`)).rows[0].n,0);
 await db.exec('reset role');
});
await db.close(); console.log(`${passed} database checks passed. Hosted Supabase/Auth/browser checks remain required.`);
