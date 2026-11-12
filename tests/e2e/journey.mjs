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
const newGuest = async (viewport) => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], ...(viewport ? { viewport } : {}) });
  await ctx.route('**://*.supabase.co/**', fake.handler);
  await ctx.route('**://images.unsplash.com/**', (r) => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.log('PAGE ERROR', e.message); failed++; });
  return { ctx, page };
};
const shot = async (page, name) => { if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${name}.png` }); } };
const visible = (page, text) => page.getByText(text, { exact: false }).first().isVisible();

const pick = async (page, label, text) => { await page.getByLabel(label, { exact: true }).fill(text); await page.getByRole('option').first().getByRole('button').click(); };
const setTimes = async (page) => {
  await page.getByLabel('Arrival at the connecting airport (local time)').fill(`${day(7)}T10:00`);
  await page.getByLabel('Onward departure (local time)').fill(`${day(7)}T15:00`);
  await page.getByRole('button', { name: '1h 30m' }).click();
};
const bar = (page) => page.locator('div.fixed.bottom-\\[var\\(--nav-h\\)\\]').last();
// Text of the save bar with the screen-reader words included, e.g. '1h 50m left · unsaved'.
const barText = async (page) => (await bar(page).textContent()).replace(/\s+/g, ' ')

try {
  // ---- 1. Booked-flight journey: Plan a layover -> connection details -> explore (List first) -> build -> save -> refresh -> edit
  const { ctx, page } = await newGuest();
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Plan a layover' }).waitFor();
  check('welcome: primary CTA is "Plan a layover"', true);
  check('no guest account created just by opening the app', !fake.calls.some((c) => c.includes('/auth/v1/signup')));
  await page.getByRole('button', { name: 'Plan a layover' }).click();
  check('setup is one screen with no numbered steps or tips', !(await visible(page, 'Step 1 of')) && !(await visible(page, 'Tip 1 of')));
  check('connecting airport, arrival, departure and buffer are the primary inputs', await page.getByLabel('Connecting airport', { exact: true }).isVisible() && await page.getByLabel('Arrival at the connecting airport (local time)').isVisible() && await page.getByRole('button', { name: '2h' }).isVisible());
  check('origin/destination are optional and collapsed', !(await page.getByLabel('Flying from', { exact: true }).isVisible()));
  await page.getByRole('button', { name: 'Lisbon LIS' }).click();
  await setTimes(page);
  const breakdown = (await page.getByLabel('Layover time breakdown').innerText()).replace(/\n/g, ' ');
  check('time breakdown: 5h total, 1h 30m buffer, 3h 30m usable', breakdown.includes('5h') && breakdown.includes('3h 30m'), breakdown);
  await page.getByText('Journey details').click();
  await pick(page, 'Flying from', 'CGK'); await pick(page, 'Final destination', 'CDG');
  check('journey summary keeps origin, connection and destination distinct', await visible(page, 'CGK → LIS → CDG'));
  await shot(page, '01-plan-a-layover');
  await page.getByRole('button', { name: 'Explore activities' }).click();

  await page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
  check('airport discovery opens in List view', (await page.getByRole('tab', { name: 'list' }).getAttribute('aria-selected')) === 'true');
  check('list shows usable time and the itinerary fit', await visible(page, 'checked against your') && await visible(page, 'Fits with 1h 50m to spare'));
  await page.getByRole('button', { name: 'Add Demo Portuguese snack break' }).click();
  await page.getByRole('button', { name: 'Add Demo quiet rest' }).click();
  await page.getByRole('button', { name: 'Add Demo gift browse' }).click();
  await page.getByRole('button', { name: 'Remove Demo gift browse' }).click();
  await shot(page, '02-airport-list');
  // List <-> Map keeps the plan
  await page.getByRole('tab', { name: 'map' }).click();
  await page.getByText('Airside zone').waitFor();
  check('map: still available; shows the 2 planned activities and the time left', await page.getByRole('button', { name: /Demo quiet rest, Rest, in your itinerary/ }).isVisible() && await visible(page, '2 planned') && await visible(page, '1h 50m left'));
  await shot(page, '03-airport-map');
  await page.getByRole('tab', { name: 'list' }).click();
  check('back in list: selection unchanged', (await page.getByRole('button', { name: 'Remove Demo quiet rest' }).getAttribute('aria-pressed')) === 'true' && await page.getByRole('button', { name: 'Build itinerary (2)' }).isVisible());
  await page.getByRole('button', { name: 'Build itinerary (2)' }).click();

  const hero = page.getByLabel('Time budget');
  check('builder: remaining time 3h 30m - 1h 40m = 1h 50m', (await hero.innerText()).includes('1h 50m'));
  check('builder: save bar shows the time left', (await barText(page)).includes('1h 50m left'));
  check('builder: activities show usage, not clock times from landing', await visible(page, '1h 40m of 3h 30m used') && !(await visible(page, '10:00 – 10:40')));
  check('builder: planning buffer explained', await visible(page, 'kept free for airport procedures'));
  await shot(page, '04-builder');
  check('nothing saved before pressing Save', fake.plans.size === 0);

  fake.failNext['rpc/save_plan'] = 1;
  await page.getByRole('button', { name: 'Save plan' }).click();
  await page.getByText('Plan not saved').waitFor();
  check('failed save: error shown, no "Saved", draft kept', !(await barText(page)).includes('Saved') && await visible(page, 'Demo quiet rest') && fake.plans.size === 0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByLabel('Upcoming trip').waitFor();
  check('saved once; home confirms the save explicitly', fake.plans.size === 1 && (await page.getByRole('status').innerText()).includes('is saved'));
  const stored = [...fake.plans.values()][0];
  check('stored UTC instants are Lisbon-local 10:00/15:00', stored.row.arrival_at === `${day(7)}T10:00:00Z` && stored.row.departure_at === `${day(7)}T15:00:00Z`, `${stored.row.arrival_at} → ${stored.row.departure_at}`);
  check('stored buffer 90 and 2 ordered activities', stored.row.buffer_minutes === 90 && stored.items.length === 2 && stored.items[0].activity_id.endsWith('1'));
  const ticket = await page.getByLabel('Upcoming trip').innerText();
  check('home ticket: CGK, CDG, 2 activities', ticket.includes('CGK') && ticket.includes('CDG') && ticket.includes('2 activities saved'));
  await shot(page, '05-home-saved');

  await page.reload();
  await page.getByLabel('Upcoming trip').waitFor();
  check('after refresh the trip is retrieved; the one-off save message is gone', (await page.getByLabel('Upcoming trip').innerText()).includes('3h 30m') && (await page.getByRole('status').count()) === 0);
  await page.getByRole('button', { name: 'View layover' }).click();
  await page.getByRole('heading', { name: 'Activities (2)' }).waitFor();
  await page.getByRole('button', { name: 'Edit plan' }).click();
  await page.getByRole('button', { name: 'Remove Demo Portuguese snack break' }).click();
  check('edit: bar shows 2h 30m left and "unsaved changes"', (await barText(page)).includes('2h 30m left') && (await barText(page)).includes('unsaved changes'));
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByText('All changes saved').waitFor();
  check('edit saved as revision 2 with one activity', [...fake.plans.values()][0].row.revision === 2 && [...fake.plans.values()][0].items.length === 1);
  await page.reload();
  await page.getByRole('button', { name: 'My Plans' }).click();
  await page.getByText('1 activity').waitFor();
  check('after second refresh My Plans shows the edited plan', await visible(page, '2h 30m left'));
  await ctx.close();

  // ---- 2. Explore-first: select activities before any times; they and the airport carry into setup
  const e = await newGuest();
  await e.page.goto(BASE);
  await e.page.getByRole('button', { name: 'Skip' }).click();
  check('new guest: home shows "Plan a layover" and no upcoming trip', await visible(e.page, 'Plan a layover') && (await e.page.getByLabel('Upcoming trip').count()) === 0);
  await e.page.getByRole('button', { name: 'Airports', exact: true }).click();
  await e.page.getByRole('button', { name: /Lisbon Airport/ }).first().click();
  await e.page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
  await e.page.getByRole('button', { name: 'Select Demo quiet rest' }).click();
  await e.page.getByRole('button', { name: 'Select Demo gift browse' }).click();
  await e.page.getByRole('tab', { name: 'map' }).click();
  check('explore-first: map shows the selection', await e.page.getByRole('button', { name: /Demo gift browse, Shopping, in your itinerary/ }).isVisible() && await visible(e.page, '2 selected'));
  await e.page.getByRole('tab', { name: 'list' }).click();
  await e.page.getByRole('button', { name: 'Set layover times (2 selected)' }).click();
  check('explore-first: setup shows the airport and the 2 selected activities', (await e.page.getByLabel('Connecting airport', { exact: true }).inputValue()).includes('LIS') && await visible(e.page, '2 activities selected'));
  await setTimes(e.page);
  await e.page.getByRole('button', { name: 'Build my itinerary' }).click();
  await e.page.getByRole('heading', { name: 'Your plan' }).waitFor();
  check('explore-first: builder contains both selected activities (1h 30m planned, 2h left)', await visible(e.page, 'Demo quiet rest') && await visible(e.page, 'Demo gift browse') && (await barText(e.page)).includes('2h left'));
  await e.page.getByRole('button', { name: 'Home' }).click();
  await e.page.getByRole('button', { name: 'My Plans' }).click();
  check('explore-first: nothing saved without pressing Save', await e.page.getByText('No saved plans yet').isVisible());
  await e.ctx.close();

  // ---- 3. Itinerary-first: "Use this itinerary" before times; its name is kept through setup
  const d = await newGuest();
  await d.page.goto(BASE);
  await d.page.getByRole('button', { name: 'Skip' }).click();
  await d.page.getByRole('button', { name: 'Airports', exact: true }).click();
  await d.page.getByRole('button', { name: /Lisbon Airport/ }).first().click();
  await d.page.getByRole('button', { name: 'Use this itinerary' }).click();
  check('itinerary-first: setup names the itinerary', await visible(d.page, 'Itinerary: Demo snack and rest') && await visible(d.page, 'It will be added to your plan'));
  await setTimes(d.page);
  await d.page.getByRole('button', { name: 'Build my itinerary' }).click();
  await d.page.getByRole('heading', { name: 'Your plan' }).waitFor();
  check('itinerary-first: builder has the itinerary (1h 50m left)', (await barText(d.page)).includes('1h 50m left') && await visible(d.page, 'Demo Portuguese snack break'));
  await d.ctx.close();

  // ---- 4. Builder layout at 320, 375 and 390 px: fixed controls never hide content; no sideways scrolling
  for (const [w, h] of [[320, 568], [375, 667], [390, 664]]) {
    const v = await newGuest({ width: w, height: h });
    await v.page.goto(BASE);
    await v.page.getByRole('button', { name: 'Skip' }).click();
    await v.page.getByRole('button', { name: 'Airports', exact: true }).click();
    await v.page.getByRole('button', { name: /Lisbon Airport/ }).first().click();
    for (const n of ['Demo Portuguese snack break', 'Demo quiet rest', 'Demo extended work break']) await v.page.getByRole('button', { name: `Select ${n}` }).click();
    await v.page.getByRole('button', { name: /Set layover times/ }).click();
    await setTimes(v.page);
    const tripOk = await v.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await v.page.getByRole('button', { name: 'Build my itinerary' }).click();
    await v.page.getByRole('heading', { name: 'Your plan' }).waitFor();
    const m = await v.page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const bars = [...document.querySelectorAll('div.fixed')].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0 && r.bottom >= window.innerHeight - 1 - 200);
      const barTop = Math.min(...bars.map((r) => r.top));
      const content = [...document.querySelectorAll('main li, main button, main p')].filter((e) => !e.closest('div.fixed') && e.getBoundingClientRect().height > 0);
      const last = Math.max(...content.map((e) => e.getBoundingClientRect().bottom));
      const btns = [...document.querySelectorAll('div.fixed button')].filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent);
      // the time value in the save bar must stay on one line; the small status line may wrap but must not overflow
      const wrapped = [...document.querySelectorAll('div.fixed p > span:first-child')].filter((e) => e.getClientRects().length > 1 || e.getBoundingClientRect().height > 40).map((e) => e.textContent)
        .concat([...document.querySelectorAll('div.fixed p')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => 'overflows: ' + e.textContent));
      return { barTop, last, sideways: document.documentElement.scrollWidth > window.innerWidth, overflowingButtons: btns, wrappedLabels: wrapped };
    });
    check(`builder ${w}px: all content scrolls clear of the save bar and tab bar; no sideways scroll; no clipped buttons or wrapped bar labels`, m.last <= m.barTop && !m.sideways && tripOk && m.overflowingButtons.length === 0 && m.wrappedLabels.length === 0, JSON.stringify(m));
    check(`builder ${w}px: over-budget plan shows "Save anyway" and the overage in the bar`, (await barText(v.page)).includes('1h 10m over') && await v.page.getByRole('button', { name: 'Save anyway' }).isVisible());
    await shot(v.page, `06-builder-${w}`);
    await v.ctx.close();
  }

  // ---- 5. Illustrative flight comparison still works
  const b = await newGuest();
  await b.page.goto(BASE);
  await b.page.getByRole('button', { name: 'Compare connections' }).click();
  await b.page.getByLabel('Flying from').selectOption('CGK'); await b.page.getByLabel('Flying to').selectOption('CDG');
  await b.page.getByRole('button', { name: 'Compare connections' }).click();
  await b.page.getByText('Choose your connection').waitFor();
  check('illustrative flight comparison preserved', (await b.page.getByText('sample price').count()) >= 3);
  await b.ctx.close();

  // ---- 6. Catalogue failure -> error state with retry
  const c = await newGuest();
  fake.failNext['rest/v1/airports'] = 1;
  await c.page.goto(BASE);
  await c.page.getByText('We could not load the airports').waitFor();
  check('catalogue error state shown', true);
  await c.page.getByRole('button', { name: 'Try again' }).click();
  await c.page.getByRole('button', { name: 'Plan a layover' }).waitFor();
  check('retry recovers', true);
  await c.ctx.close();
} catch (e) {
  failed++; console.log('CRASH', e.message.split('\n').slice(0, 6).join('\n'));
} finally {
  await browser.close(); stop();
}
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? ` (${failed} failed)` : ''}`);
process.exit(failed ? 1 : 0);
