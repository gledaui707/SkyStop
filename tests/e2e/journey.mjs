// Browser journey test of the built app (vite preview) against a SIMULATED Supabase API (tests/e2e/fake-supabase.mjs).
// Proves the UI wiring end to end; it does not prove anything about the hosted database.
// Usage: npm run build && npm run test:e2e   (optional: SHOTS=dir to keep screenshots)
import { createRequire } from 'node:module';
// Playwright is taken from the environment (globally installed, or `npm i -D playwright` locally).
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createFakeSupabase } from './fake-supabase.mjs';

const PORT = 4179, BASE = `http://localhost:${PORT}`, SHOTS = process.env.SHOTS;
let failed = 0; const results = [];
const check = (name, ok, detail = '') => { results.push(name); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); };
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* ignore */ } };
process.on('exit', stop);
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch { await new Promise((r) => setTimeout(r, 200)); } }

const fake = createFakeSupabase();
const browser = await chromium.launch();
const newGuest = async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route('**://*.supabase.co/**', fake.handler);
  await ctx.route('**://images.unsplash.com/**', (r) => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); failed++; });
  return { ctx, page };
};
const shot = async (page, name) => { if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${name}.png` }); } };
const visible = (page, text) => page.getByText(text, { exact: false }).first().isVisible();

try {
  // ---- Guest A: first visit → add flight → connection details → explore → add/remove → save
  const { ctx, page } = await newGuest();
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Add my flight' }).waitFor();
  check('welcome screen shown on first visit', true);
  check('no guest account created just by opening the app', !fake.calls.some((c) => c.includes('/auth/v1/signup')));
  await page.getByRole('button', { name: 'Add my flight' }).click();

  const pick = async (label, text) => { await page.getByLabel(label, { exact: true }).fill(text); await page.getByRole('option').first().getByRole('button').click(); };
  await pick('Flying from', 'CGK'); await pick('Flying to', 'CDG');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Lisbon LIS' }).click();
  check('catalogue airports come from the API (LIS chip)', true);
  await page.getByLabel('Arrival at connecting airport (local time)').fill(`${day(7)}T10:00`);
  await page.getByLabel('Onward departure (local time)').fill(`${day(7)}T15:00`);
  await page.getByRole('button', { name: '1h 30m' }).click();
  const breakdown = page.getByLabel('Layover time breakdown');
  check('time breakdown: 5h total, 3h 30m usable', (await breakdown.innerText()).includes('5h') && (await breakdown.innerText()).includes('3h 30m'), (await breakdown.innerText()).replace(/\n/g, ' '));
  await shot(page, '01-connection-details');
  await page.getByRole('button', { name: 'See what I can do' }).click();

  // Airport: map view first (illustrative), then list view
  await page.getByRole('tab', { name: 'map' }).waitFor();
  check('map view preserved', await page.getByText('Airside zone').isVisible());
  await shot(page, '02-airport-map');
  await page.getByRole('tab', { name: 'list' }).click();
  await page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
  check('curated itinerary from API with fit check', await visible(page, 'Demo snack and rest') && await visible(page, 'Fits with 1h 50m to spare'));
  await page.getByRole('button', { name: 'Add Demo Portuguese snack break' }).click();
  await page.getByRole('button', { name: 'Add Demo quiet rest' }).click();
  await page.getByRole('button', { name: 'Add Demo gift browse' }).click();
  await page.getByRole('button', { name: 'Remove Demo gift browse' }).click();
  await shot(page, '03-airport-list');
  await page.getByRole('button', { name: 'Build itinerary (2)' }).click();

  const hero = page.getByLabel('Time budget');
  check('builder: remaining time = 3h 30m - 1h 40m = 1h 50m', (await hero.innerText()).includes('1h 50m'), (await hero.innerText()).split('\n').slice(0, 2).join(' '));
  await shot(page, '04-builder');
  check('nothing saved before pressing Save', fake.plans.size === 0);

  // Save failure keeps the draft and shows no success
  fake.failNext['rpc/save_plan'] = 1;
  await page.getByRole('button', { name: 'Save plan' }).click();
  await page.getByText('Plan not saved').waitFor();
  check('failed save: error shown, no "Plan saved", draft kept', !(await page.getByText('Plan saved').isVisible()) && await visible(page, 'Demo quiet rest') && fake.plans.size === 0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByLabel('Upcoming trip').waitFor();
  check('saved to backend exactly once', fake.plans.size === 1 && fake.calls.filter((c) => c.includes('/auth/v1/signup')).length === 1);
  const stored = [...fake.plans.values()][0];
  check('stored UTC instants are airport-local 10:00/15:00 Lisbon', stored.row.arrival_at === `${day(7)}T10:00:00Z` && stored.row.departure_at === `${day(7)}T15:00:00Z`, `${stored.row.arrival_at} → ${stored.row.departure_at}`);
  check('stored buffer 90 and 2 ordered activities', stored.row.buffer_minutes === 90 && stored.items.length === 2 && stored.items[0].activity_id.endsWith('1'));
  const ticket = page.getByLabel('Upcoming trip');
  check('home shows personalised upcoming trip after save', (await ticket.innerText()).includes('CGK') && (await ticket.innerText()).includes('2 activities saved'));
  await shot(page, '05-home-upcoming');

  // ---- Refresh → retrieve
  await page.reload();
  await page.getByLabel('Upcoming trip').waitFor();
  const t2 = await page.getByLabel('Upcoming trip').innerText();
  check('after refresh the trip is retrieved from the backend', t2.includes('10:00') && t2.includes('15:00') && t2.includes('3h 30m') && t2.includes('2 activities saved'), t2.replace(/\n/g, ' ').slice(0, 120));
  await page.getByRole('button', { name: 'View layover' }).click();
  await page.getByRole('heading', { name: 'Activities (2)' }).waitFor();
  check('plan detail lists both saved activities in order', await visible(page, 'Demo Portuguese snack break') && await visible(page, 'Demo quiet rest'));
  await shot(page, '06-plan-detail');

  // ---- Edit → save → refresh
  await page.getByRole('button', { name: 'Edit plan' }).click();
  await page.getByRole('button', { name: 'Remove Demo Portuguese snack break' }).click();
  check('edit: remaining time recalculated to 2h 30m', (await page.getByLabel('Time budget').innerText()).includes('2h 30m'));
  await page.getByRole('button', { name: 'Save plan' }).click();
  await page.getByText('Plan saved').waitFor();
  check('edit saved as revision 2, one activity', stored && [...fake.plans.values()][0].row.revision === 2 && [...fake.plans.values()][0].items.length === 1);
  await page.reload();
  await page.getByRole('button', { name: 'My Plans' }).click();
  await page.getByText('1 activity').waitFor();
  check('after second refresh My Plans shows the edited plan', await visible(page, '2h 30m left'));
  await shot(page, '07-my-plans');
  await ctx.close();

  // ---- Guest B: a different browser sees no personalised trip
  const b = await newGuest();
  await b.page.goto(BASE);
  await b.page.getByRole('button', { name: 'Skip' }).click();
  await b.page.getByText('Add flight').first().waitFor();
  check('new guest: home shows generic state, no upcoming trip', (await b.page.getByLabel('Upcoming trip').count()) === 0);
  await b.page.getByRole('button', { name: 'My Plans' }).click();
  check('new guest: My Plans empty state', await b.page.getByText('No saved plans yet').isVisible());
  // Flight comparison (illustrative) still works
  await b.page.getByRole('button', { name: 'Home' }).click();
  await b.page.getByText('Plan ahead').click();
  await b.page.getByLabel('Flying from').selectOption('CGK'); await b.page.getByLabel('Flying to').selectOption('CDG');
  await b.page.getByRole('button', { name: 'Compare connections' }).click();
  await b.page.getByText('Choose your connection').waitFor();
  check('illustrative flight comparison preserved', (await b.page.getByText('sample price').count()) >= 3);
  await shot(b.page, '08-flights');
  await b.ctx.close();

  // ---- Catalogue failure → error state with retry
  const c = await newGuest();
  fake.failNext['rest/v1/airports'] = 1;
  await c.page.goto(BASE);
  await c.page.getByText('We could not load the airports').waitFor();
  check('catalogue error state shown', true);
  await c.page.getByRole('button', { name: 'Try again' }).click();
  await c.page.getByRole('button', { name: 'Add my flight' }).waitFor();
  check('retry recovers', true);
  await c.ctx.close();
} catch (e) {
  failed++; console.log('CRASH', e.message.split('\n').slice(0, 6).join('\n'));
} finally {
  await browser.close(); stop();
}
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? ` (${failed} failed)` : ''}`);
process.exit(failed ? 1 : 0);
