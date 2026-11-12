// REAL end-to-end journey on a deployed URL against the real Supabase project. Run it once, manually; it creates one
// anonymous guest and one synthetic plan. No conflict calls, no retries, no stress. Not part of `npm test`.
// Usage: BASE=https://skystop.vercel.app SHOTS=docs/screenshots node tests/e2e/live.mjs
// In the cloud sandbox Chromium must go through the egress proxy: PROXY=$HTTPS_PROXY (set automatically from the env).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE || 'https://skystop.vercel.app', SHOTS = process.env.SHOTS;
const PROXY = process.env.PROXY || process.env.HTTPS_PROXY;
let failed = 0; const results = [];
const check = (name, ok, detail = '') => { results.push(name); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); };
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const shot = async (page, name) => { if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${name}.png` }); } };
const visible = (page, t) => page.getByText(t, { exact: false }).first().isVisible();

const browser = await chromium.launch(PROXY ? { proxy: { server: PROXY } } : {});
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const api = [];
page.on('response', (r) => { if (r.url().includes('.supabase.co')) api.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); failed++; });
const T = 20000;
try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('button', { name: 'Add my flight' }).waitFor({ timeout: T });
  check('live site loads; airports loaded from the database (welcome screen shown)', true);
  check('no guest account created just by opening the app', !api.some((a) => a.includes('/auth/v1/signup')));
  await shot(page, '01-welcome');
  await page.getByRole('button', { name: 'Add my flight' }).click();

  const pick = async (label, text) => { await page.getByLabel(label, { exact: true }).fill(text); await page.getByRole('option').first().getByRole('button').click(); };
  await pick('Flying from', 'CGK'); await pick('Flying to', 'CDG');
  await shot(page, '02-trip-step1');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Lisbon LIS' }).click();
  await page.getByLabel('Arrival at connecting airport (local time)').fill(`${day(7)}T10:00`);
  await page.getByLabel('Onward departure (local time)').fill(`${day(7)}T15:00`);
  await page.getByRole('button', { name: '1h 30m' }).click();
  const bd = (await page.getByLabel('Layover time breakdown').innerText()).replace(/\n/g, ' ');
  check('time breakdown: 5h total, 3h 30m usable', bd.includes('5h') && bd.includes('3h 30m'), bd);
  await shot(page, '03-trip-step2-times');
  await page.getByRole('button', { name: 'See what I can do' }).click();

  await page.getByRole('tab', { name: 'map' }).waitFor({ timeout: T });
  await shot(page, '04-airport-map');
  await page.getByRole('tab', { name: 'list' }).click();
  await page.getByRole('heading', { name: 'Curated itineraries' }).waitFor({ timeout: T });
  check('curated itinerary shown with fit check', await visible(page, 'Demo snack and rest') && await visible(page, 'Fits with 1h 50m to spare'));
  await shot(page, '05-airport-list');
  await page.getByRole('button', { name: 'Add Demo Portuguese snack break' }).click();
  await page.getByRole('button', { name: 'Add Demo quiet rest' }).click();
  await page.getByRole('button', { name: 'Add Demo gift browse' }).click();
  await page.getByRole('button', { name: 'Remove Demo gift browse' }).click();
  await page.getByRole('button', { name: 'Build itinerary (2)' }).click();
  const hero = (await page.getByLabel('Time budget').innerText()).replace(/\n/g, ' ');
  check('builder: remaining time 3h 30m - 1h 40m = 1h 50m', hero.includes('1h 50m'), hero.slice(0, 60));
  await shot(page, '06-builder');

  await page.getByRole('button', { name: 'Save plan' }).click();
  await page.getByLabel('Upcoming trip').waitFor({ timeout: T });
  check('save succeeded: Home shows the personalised upcoming trip', true);
  check('guest was created on save (one sign-up) and RPC save_plan answered 200', api.filter((a) => a.includes('/auth/v1/signup')).length === 1 && api.some((a) => a.startsWith('200 POST /rest/v1/rpc/save_plan')), api.filter((a) => a.includes('save_plan') || a.includes('signup')).join(' | '));
  const t1 = (await page.getByLabel('Upcoming trip').innerText()).replace(/\n/g, ' ');
  check('ticket shows CGK/CDG, 10:00-15:00, 3h 30m usable, 2 activities', ['CGK', 'CDG', '10:00', '15:00', '3h 30m', '2 activities saved'].every((x) => t1.includes(x)), t1.slice(0, 110));
  await shot(page, '07-home-upcoming-trip');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByLabel('Upcoming trip').waitFor({ timeout: T });
  const t2 = (await page.getByLabel('Upcoming trip').innerText()).replace(/\n/g, ' ');
  check('after REFRESH the trip is retrieved from the database', ['10:00', '15:00', '3h 30m', '2 activities saved'].every((x) => t2.includes(x)));
  await page.getByRole('button', { name: 'View layover' }).click();
  await page.getByRole('heading', { name: 'Activities (2)' }).waitFor({ timeout: T });
  check('plan detail lists both activities', await visible(page, 'Demo Portuguese snack break') && await visible(page, 'Demo quiet rest'));
  await shot(page, '08-plan-detail');

  await page.getByRole('button', { name: 'Edit plan' }).click();
  await page.getByRole('button', { name: 'Remove Demo Portuguese snack break' }).click();
  check('edit: remaining time recalculated to 2h 30m', (await page.getByLabel('Time budget').innerText()).includes('2h 30m'));
  await shot(page, '09-edit-plan');
  await page.getByRole('button', { name: 'Save plan' }).click();
  await page.getByText('Plan saved').waitFor({ timeout: T });
  check('edit saved (server confirmed)', api.filter((a) => a.startsWith('200 POST /rest/v1/rpc/save_plan')).length === 2);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'My Plans' }).click();
  await page.getByText('1 activity').waitFor({ timeout: T });
  check('after second refresh My Plans shows the edited plan (1 activity, 2h 30m left)', await visible(page, '2h 30m left'));
  await shot(page, '10-my-plans');
  check('every Supabase response was 2xx', api.every((a) => a.startsWith('2')), api.filter((a) => !a.startsWith('2')).join(' | '));
} catch (e) {
  failed++; console.log('CRASH', e.message.split('\n').slice(0, 5).join('\n')); try { await shot(page, 'zz-crash'); } catch { /* ignore */ }
} finally { await browser.close(); }
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? ` (${failed} failed)` : ''}`);
console.log('API calls:', api.length, [...new Set(api.map((a) => a.replace(/\?.*/, '')))].join(' · '));
process.exit(failed ? 1 : 0);
