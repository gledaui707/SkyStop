// Browser journey test of the built app (vite preview) against a SIMULATED Supabase API (tests/e2e/fake-supabase.mjs).
// Proves the UI wiring end to end; it does not prove anything about the hosted database.
// Usage: npm run build && npm run test:e2e   (optional: SHOTS=dir to keep screenshots)
import { createRequire } from 'node:module';
// Playwright is taken from the environment (globally installed, or `npm i -D playwright` locally).
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createFakeSupabase } from './fake-supabase.mjs';
/** Focused screens (builder, booking, journey…) hide the tab bar: go Back until the tabs return. */
const backToTabs = async (p) => { for (let i = 0; i < 5 && !(await p.getByRole('navigation', { name: 'Primary' }).count()); i++) await p.getByRole('button', { name: 'Back' }).first().click(); };

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
// Screen changes are animated with the View Transitions API, which commits the new screen a frame after the click.
// These checks read the screen straight after clicking, so they run with reduced motion (instant navigation, the same
// state logic). MOTION=no-preference runs them with animation; `npm run test:layout` always navigates with motion on.
const MOTION = process.env.MOTION || 'reduce';
// Returning visitors (onboarding already seen) unless `firstVisit` is set.
const newGuest = async (viewport, { firstVisit = false, reducedMotion = MOTION } = {}) => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], ...(viewport ? { viewport } : {}), reducedMotion });
  if (!firstVisit) await ctx.addInitScript(() => { try { localStorage.setItem('skystop.onboarded.v2', '1'); } catch { /* ignore */ } });
  await ctx.route('**://*.supabase.co/**', fake.handler);
  await ctx.route('**://images.unsplash.com/**', (r) => r.abort());
  await ctx.route(/(basemaps\.cartocdn\.com|tile\.openstreetmap\.org)/, (r) => r.abort());
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
  await page.getByRole('button', { name: /^Add flight/ }).first().waitFor();
  check('returning visitor lands on Home with "Add flight"', !(await visible(page, 'Your layover, reimagined.')));
  check('no guest account created just by opening the app', !fake.calls.some((c) => c.includes('/auth/v1/signup')));
  await page.getByRole('button', { name: /^Add flight/ }).first().click();
  await page.getByRole('heading', { name: 'Find your journey' }).waitFor();
  check('"Add flight" opens booking-reference entry first', await page.getByLabel('Booking reference').isVisible() && await page.getByRole('button', { name: "I can't find my flight" }).isVisible());
  await page.getByRole('button', { name: "I can't find my flight" }).click();
  await page.getByLabel('Connecting airport', { exact: true }).waitFor(); // screen changes commit after the view transition starts
  check('setup is one screen with no numbered steps or tips', !(await visible(page, 'Step 1 of')) && !(await visible(page, 'Tip 1 of')));
  check('connecting airport, arrival, departure and buffer are the primary inputs', await page.getByLabel('Connecting airport', { exact: true }).isVisible() && await page.getByLabel('Arrival at the connecting airport (local time)').isVisible() && await page.getByRole('button', { name: '2h' }).isVisible());
  check('manual setup: origin and destination are optional fields', await page.getByLabel('Flying from (optional)').isVisible() && await page.getByLabel('Final destination (optional)').isVisible());
  const bufferHelp = page.getByRole('button', { name: 'What is this?' });
  const bufferDescription = page.locator('#buffer-help');
  check('buffer explanation starts hidden', !(await bufferDescription.isVisible()));
  await bufferHelp.click();
  check('buffer explanation opens on tap', await bufferDescription.isVisible() && await bufferHelp.getAttribute('aria-expanded') === 'true');
  await bufferHelp.click();
  check('buffer explanation closes on tap', !(await bufferDescription.isVisible()));
  await page.getByRole('button', { name: 'Lisbon LIS' }).click();
  await setTimes(page);
  const breakdown = (await page.getByLabel('Layover time breakdown').innerText()).replace(/\n/g, ' ');
  check('time breakdown: 5h total, 1h 30m buffer, 3h 30m usable', breakdown.includes('5h') && breakdown.includes('3h 30m'), breakdown);
  await shot(page, '01-plan-a-layover');
  await page.getByRole('button', { name: 'Explore activities' }).click();

  await page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
  check('airport discovery opens in List view', (await page.getByRole('tab', { name: 'list' }).getAttribute('aria-selected')) === 'true');
  check('list shows usable time and the itinerary fit', await visible(page, '3h 30m usable time') && await visible(page, 'Fits with 1h 50m to spare'));
  await page.getByRole('button', { name: 'Add O Mercado food court' }).click();
  await page.getByRole('button', { name: 'Add ANA Lounge' }).click();
  await page.getByRole('button', { name: 'Add Lisboa Duty Free' }).click();
  await page.getByRole('button', { name: 'Remove Lisboa Duty Free' }).click();
  await shot(page, '02-airport-list');
  // List <-> Map keeps the plan
  await page.getByRole('tab', { name: 'map' }).click();
  await page.getByRole('button', { name: /^Terminal 1: / }).waitFor();
  check('map: real-map view shows the Terminal 1 pin with the 2 planned activities and the time left', /6 of 6 venues, 2 in your itinerary/.test(await page.getByRole('button', { name: /^Terminal 1: / }).getAttribute('aria-label')) && await visible(page, '2 planned') && await visible(page, '1h 50m left') && await visible(page, 'OpenStreetMap'));
  await page.getByRole('button', { name: /^Terminal 1: / }).click();
  check('map: tapping a terminal lists its venues', await visible(page, 'Terminal 1 · Lisbon') && await page.getByRole('button', { name: /ANA Lounge/ }).first().isVisible());
  check('map: venues are not given invented indoor positions (terminal pins only)', (await page.getByRole('button', { name: /approximate location/ }).count()) === 0);
  await shot(page, '03-airport-map');
  await page.getByRole('tab', { name: 'list' }).click();
  check('back in list: selection unchanged', (await page.getByRole('button', { name: 'Remove ANA Lounge' }).getAttribute('aria-pressed')) === 'true' && await page.getByRole('button', { name: 'Build itinerary (2)' }).isVisible());
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
  check('failed save: error shown, no "Saved", draft kept', !(await barText(page)).includes('Saved') && await visible(page, 'ANA Lounge') && fake.plans.size === 0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByLabel('Upcoming trip').waitFor();
  check('saved once; home confirms the save explicitly', fake.plans.size === 1 && (await page.getByRole('status').innerText()).includes('is saved'));
  const toastBox = await page.getByRole('status').boundingBox();
  check('confirmation is a toast floating at the top', toastBox.y < 80, JSON.stringify(toastBox));
  await page.waitForTimeout(5400);
  check('toast disappears after 5 seconds', (await page.getByRole('status').count()) === 0);
  const stored = [...fake.plans.values()][0];
  check('stored UTC instants are Lisbon-local 10:00/15:00', stored.row.arrival_at === `${day(7)}T10:00:00Z` && stored.row.departure_at === `${day(7)}T15:00:00Z`, `${stored.row.arrival_at} → ${stored.row.departure_at}`);
  check('stored buffer 90 and 2 ordered activities', stored.row.buffer_minutes === 90 && stored.items.length === 2 && stored.items[0].activity_id.endsWith('1'));
  const ticket = await page.getByLabel('Upcoming trip').innerText();
  check('manual Home card shows only the actual transit airport and times', ['LIS', '10:00', '15:00', '3h 30m', '2 activities saved'].every((value) => ticket.includes(value))
    && await page.getByRole('region', { name: /^Journey / }).count() === 0 && await page.getByRole('region', { name: 'Connection at LIS' }).isVisible()
    && !ticket.includes('Origin and destination') && !ticket.includes('—'));
  await shot(page, '05-home-saved');

  await page.reload();
  await page.getByLabel('Upcoming trip').waitFor();
  check('after refresh the trip is retrieved; the one-off save message is gone', (await page.getByLabel('Upcoming trip').innerText()).includes('3h 30m') && (await page.getByRole('status').count()) === 0);
  await page.getByRole('button', { name: 'View layover' }).click();
  await page.getByRole('heading', { name: 'Activities (2)' }).waitFor();
  await page.getByRole('button', { name: 'Edit plan' }).click();
  await page.getByRole('button', { name: 'Remove O Mercado food court' }).click();
  check('edit: bar shows 2h 30m left and "unsaved changes"', (await barText(page)).includes('2h 30m left') && (await barText(page)).includes('unsaved changes'));
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByText('All changes saved').waitFor();
  check('edit saved as revision 2 with one activity', [...fake.plans.values()][0].row.revision === 2 && [...fake.plans.values()][0].items.length === 1);
  await page.reload();
  await page.getByRole('button', { name: 'My Plans' }).click();
  await page.getByText('1 activity').waitFor();
  check('after second refresh My Plans shows the edited plan', await visible(page, '2h 30m left'));
  await ctx.close();

  // ---- 1b. Booking-reference flow: invalid reference, the four samples, then a full save through the shared builder
  const k = await newGuest({ width: 320, height: 568 });
  await k.page.goto(BASE);
  await k.page.getByRole('button', { name: /^Add flight/ }).first().click();
  await k.page.getByLabel('Booking reference').fill('zz9zz9');
  await k.page.getByRole('button', { name: 'Find my journey' }).click();
  const unk = await k.page.getByRole('alert').allInnerTexts();
  check('booking: unknown reference -> clear error, no journey shown', unk.some((t) => t.includes('Booking number not found.')) && (await k.page.getByRole('heading', { name: 'Your journey', exact: true }).count()) === 0, JSON.stringify(unk));
  await k.page.getByLabel('Booking reference').fill('AB1');
  await k.page.getByRole('button', { name: 'Find my journey' }).click();
  check('booking: malformed reference -> format hint', (await k.page.getByRole('alert').innerText()).includes('6 letters or numbers'));
  check('booking: reference entry reads like a real app (no sample disclaimer)', await visible(k.page, 'Enter your booking reference') && !(await visible(k.page, 'sample booking reference')));
  const expect = { AXR7KD: ['SIN', '12h 20m', '2h', '10h 20m'], BQ3LMV: ['LIS', '5h 20m', '1h 30m', '3h 50m'], CJ8NWT: ['LHR', '5h 30m', '2h', '3h 30m'], DH5PRZ: ['DXB', '7h', '2h', '5h'] };
  for (const [ref, [code, total, buf, usable]] of Object.entries(expect)) {
    await k.page.getByLabel('Booking reference').fill(ref.toLowerCase());
    await k.page.getByRole('button', { name: 'Find my journey' }).click();
    await k.page.getByRole('heading', { name: 'Your journey' }).waitFor();
    const tl = (await k.page.getByLabel('Flight timeline').innerText()).replace(/\n/g, ' ');
    const bd = (await k.page.getByLabel('Layover time breakdown').innerText()).replace(/\n/g, ' ');
    check(`booking: ${ref} -> ${code} overview: timeline with connection, ${total} layover, ${buf} buffer, ${usable} usable`, tl.includes(code) && tl.includes(`Layover in`) && tl.includes(total) && bd.includes(`${total} layover − ${buf} planning buffer = ${usable} usable`), bd);
    await k.page.getByRole('button', { name: 'Back' }).click();
    await k.page.getByRole('heading', { name: 'Find your journey' }).waitFor();
  }
  // LHR and DXB are supported airports now: journeys C and D open discovery with only that airport's venues
  for (const [ref, cityName, own, other] of [['CJ8NWT', 'London', 'Gordon Ramsay Plane Food Market', 'Al Majlis'], ['DH5PRZ', 'Dubai', 'Al Majlis', 'Harrods']]) {
    await k.page.getByLabel('Booking reference').fill(ref);
    await k.page.getByRole('button', { name: 'Find my journey' }).click();
    await k.page.getByRole('button', { name: `Explore ${cityName}` }).click();
    await k.page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
    check(`booking: ${ref} -> Explore ${cityName} lists its own verified venues only`, await visible(k.page, own) && !(await visible(k.page, other)) && !(await visible(k.page, 'Demo')));
    await k.page.getByRole('button', { name: 'Back' }).click();
    await k.page.getByRole('button', { name: 'Back' }).click();
    await k.page.getByRole('heading', { name: 'Find your journey' }).waitFor();
  }
  await k.page.getByLabel('Booking reference').fill('AXR7KD');
  await k.page.getByRole('button', { name: 'Find my journey' }).click();
  await k.page.getByRole('heading', { name: 'Your journey' }).waitFor();
  await k.page.getByRole('button', { name: 'Explore Singapore' }).click();
  await k.page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
  check('booking: journey carried into discovery (usable time shown)', await visible(k.page, '10h 20m'));
  await k.page.getByRole('button', { name: /^Add / }).first().click();
  await k.page.getByRole('button', { name: /Build itinerary \(1\)/ }).click();
  await k.page.locator('main header', { hasText: 'CGK to CDG' }).waitFor({ timeout: 5000 }).catch(() => {});
  const kbar = await barText(k.page);
  check('booking: builder uses the journey (SIN layover, CGK to CDG)', (await k.page.locator('main header').innerText()).includes('CGK to CDG') && kbar.includes('left'), kbar);
  const before = fake.plans.size;
  await k.page.getByRole('button', { name: 'Save plan' }).click();
  await k.page.getByLabel('Upcoming trip').waitFor();
  const journey = (await k.page.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).innerText()).replace(/\s+/g, ' ');
  const layover = (await k.page.getByRole('region', { name: 'Layover' }).innerText()).replace(/\s+/g, ' ');
  check('sample Home card: CGK and CDG at the ends; SIN times in a strip labelled Arrive SIN / Connection / Depart SIN', /Jakarta.*Paris.*CGK.*SIN.*CDG.*Arrive SIN 11:15.*Connection 12h 20m.*Depart SIN 23:35/i.test(journey), journey);
  check('sample Home card: transit SIN with 10h 20m to explore = 12h 20m connection − 2h buffer', ['Transit SIN', 'Singapore', '10h 20m', '12h 20m connection − 2h buffer'].every((v) => layover.includes(v)), layover);
  await k.page.evaluate(() => { const m = JSON.parse(localStorage.getItem('skystop.planmeta.v1')); for (const v of Object.values(m)) { delete v.origin; delete v.destination } localStorage.setItem('skystop.planmeta.v1', JSON.stringify(m)) });
  await k.page.reload(); await k.page.getByLabel('Upcoming trip').waitFor();
  check('sample route is restored from the booking reference when its stored labels are missing', await k.page.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).isVisible());
  const viewLayover = k.page.getByRole('button', { name: 'View layover' });
  await viewLayover.scrollIntoViewIfNeeded();
  const actionBox = await viewLayover.boundingBox();
  const navBox = await k.page.getByRole('navigation', { name: 'Primary' }).boundingBox();
  check('320px Home card has no horizontal overflow and its action clears the tabs', await k.page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    && actionBox.y + actionBox.height <= navBox.y, JSON.stringify({ actionBox, navBox, sw: await k.page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]) }));
  const kp = [...fake.plans.values()].find((p) => p.row.airport_id === 'SIN');
  check('booking: saved through the same save_plan path; SIN 11:15 local stored as 03:15Z', fake.plans.size === before + 1 && !!kp && kp.row.arrival_at.endsWith('T03:15:00Z') && kp.row.buffer_minutes === 120, kp?.row.arrival_at);
  await k.ctx.close();

  // ---- 2. Explore-first: select activities before any times; they and the airport carry into setup
  const e = await newGuest();
  await e.page.goto(BASE);
  await e.page.getByRole('button', { name: 'Notifications' }).waitFor();
  check('new guest: home shows an empty flights state (no fabricated flight), with Add flight and Compare flights', (await e.page.getByRole('heading', { name: 'My flights' }).count()) === 0 && (await e.page.getByLabel('Upcoming trip').count()) === 0
    && await e.page.getByRole('button', { name: /^Add flight/ }).isVisible() && await e.page.getByRole('button', { name: /^Compare flights/ }).isVisible());
  await e.page.getByRole('button', { name: 'Airports', exact: true }).click();
  await e.page.getByRole('button', { name: /Lisbon Airport/ }).first().click();
  await e.page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
  await e.page.getByRole('button', { name: 'Select ANA Lounge' }).click();
  await e.page.getByRole('button', { name: 'Select Lisboa Duty Free' }).click();
  await e.page.getByRole('tab', { name: 'map' }).click();
  check('explore-first: map shows the selection', /2 in your itinerary/.test(await e.page.getByRole('button', { name: /^Terminal 1: / }).getAttribute('aria-label')) && await visible(e.page, '2 selected'));
  await e.page.getByRole('tab', { name: 'list' }).click();
  await e.page.getByRole('button', { name: 'Set layover times (2 selected)' }).click();
  check('explore-first: setup shows the airport and the 2 selected activities', (await e.page.getByLabel('Connecting airport', { exact: true }).inputValue()).includes('LIS') && await visible(e.page, '2 activities selected'));
  await setTimes(e.page);
  await e.page.getByRole('button', { name: 'Build my itinerary' }).click();
  await e.page.getByRole('heading', { name: 'Your plan' }).waitFor();
  check('explore-first: builder contains both selected activities (1h 30m planned, 2h left)', await visible(e.page, 'ANA Lounge') && await visible(e.page, 'Lisboa Duty Free') && (await barText(e.page)).includes('2h left'));
  check('builder is a focused screen: no tab bar, one action tray', (await e.page.getByRole('navigation', { name: 'Primary' }).count()) === 0);
  // leave the builder with Back (focused screens hide the tab bar) until the tabs return
  await backToTabs(e.page);
  await e.page.getByRole('button', { name: 'My Plans' }).click();
  check('explore-first: nothing saved without pressing Save', await e.page.getByText('No saved itineraries yet').isVisible());
  await e.ctx.close();

  // ---- 3. Itinerary-first: "Use this itinerary" before times; its name is kept through setup
  const d = await newGuest();
  await d.page.goto(BASE);
  await d.page.getByRole('button', { name: 'Airports', exact: true }).click();
  await d.page.getByRole('button', { name: /Lisbon Airport/ }).first().click();
  await d.page.getByRole('button', { name: 'Use this itinerary' }).click();
  await d.page.getByText('Itinerary: Market lunch and lounge').waitFor({ timeout: 5000 }).catch(() => {});
  check('itinerary-first: setup names the itinerary', await visible(d.page, 'Itinerary: Market lunch and lounge') && await visible(d.page, 'It will be added to your plan'));
  await setTimes(d.page);
  await d.page.getByRole('button', { name: 'Build my itinerary' }).click();
  await d.page.getByRole('heading', { name: 'Your plan' }).waitFor();
  check('itinerary-first: builder has the itinerary (1h 50m left)', (await barText(d.page)).includes('1h 50m left') && await visible(d.page, 'O Mercado food court'));
  await d.ctx.close();

  // ---- 4. Builder layout at 320, 375 and 390 px: fixed controls never hide content; no sideways scrolling
  for (const [w, h] of [[320, 568], [375, 667], [390, 664]]) {
    const v = await newGuest({ width: w, height: h });
    await v.page.goto(BASE);
    await v.page.getByRole('button', { name: 'Airports', exact: true }).click();
    await v.page.getByRole('button', { name: /Lisbon Airport/ }).first().click();
    for (const n of ['O Mercado food court', 'ANA Lounge', 'Fnac']) await v.page.getByRole('button', { name: `Select ${n}` }).click();
    await v.page.getByRole('button', { name: /Set layover times/ }).click();
    // a 3-hour layover (90 min usable) so the 120 min of activities runs 30 min over
    await setTimes(v.page);
    await v.page.getByLabel('Onward departure (local time)').fill(`${day(7)}T13:00`);
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
    check(`builder ${w}px: over-budget plan shows "Save anyway" and the overage in the bar`, (await barText(v.page)).includes('30m over') && await v.page.getByRole('button', { name: 'Save anyway' }).isVisible());
    await shot(v.page, `06-builder-${w}`);
    await v.ctx.close();
  }

  // ---- 4b. Onboarding: a scripted conversation (one tap, no Next buttons) → Account Access (Get started / Log in /
  //      Create one). Only Get started plays the SS loader, starts the guest session and opens Home.
  const signupsBefore = fake.calls.filter((c) => c.includes('/auth/v1/signup')).length;
  const appReady = (pg) => pg.waitForFunction(() => !document.querySelector('[inert]')); // after the launch splash
  // The three photo intro slides come first: Get started moves through them and the last one opens the conversation.
  const throughSlides = async (pg) => {
    await pg.getByText('Your layover, reimagined.').waitFor({ timeout: 6000 });
    for (let k = 0; k < 3; k++) { await pg.getByRole('button', { name: 'Get started' }).click(); await pg.waitForTimeout(450); }
  };
  const loaderSeen = (pg) => pg.evaluate(() => { window.__ssl = false; new MutationObserver(() => { if (document.querySelector('.ss-loader')) window.__ssl = true; }).observe(document.body, { childList: true, subtree: true }); });
  {
    // The full first run: slides → conversation → booking → journey → airport → interests → Home with the flight saved
    const o = await newGuest(undefined, { firstVisit: true, reducedMotion: 'no-preference' });
    const P = o.page;
    const known = new Set(fake.plans.keys()); // the fake backend is shared by the whole suite: count only this visitor's new flights
    const mineAX = () => [...fake.plans.entries()].filter(([id, x]) => !known.has(id) && fake.details.get(x.row.id)?.row.booking_ref === 'AXR7KD').map(([, x]) => x)
    const said = (t, timeout = 8000) => P.locator('main .sr-only', { hasText: t }).waitFor({ state: 'attached', timeout });
    await P.goto(BASE);
    await appReady(P); await loaderSeen(P);
    await P.getByText('Your layover, reimagined.').waitFor();
    check('intro: the three photo slides come first (progress for 3 screens, Get started, Sign in, Skip)',
      (await P.getByRole('tab', { name: /Screen \d of 3/ }).count()) === 3 && await P.getByRole('button', { name: 'Get started' }).isVisible()
      && await P.getByRole('button', { name: 'Sign in' }).isVisible() && await P.getByRole('button', { name: 'Skip' }).isVisible());
    await P.evaluate(() => { window.__caret = false; new MutationObserver(() => { if (document.querySelector('.onb-caret--inline')) window.__caret = true; }).observe(document.body, { childList: true, subtree: true }); });
    for (let k = 0; k < 3; k++) { await P.getByRole('button', { name: 'Get started' }).click(); await P.waitForTimeout(450); }
    await P.getByRole('button', { name: 'Yes, I’m booked' }).waitFor({ timeout: 6000 });
    check('conversation: starts by itself after the slides; lines stream in; no Next buttons', await P.evaluate(() => window.__caret) && (await P.getByRole('button', { name: /^(Next|Continue)$/ }).count()) === 0);
    check('conversation: no account or guest session is created while talking', fake.calls.filter((c) => c.includes('/auth/v1/signup')).length === signupsBefore);
    // Yes → the booking reference appears by itself
    await P.getByRole('button', { name: 'Yes, I’m booked' }).click();
    await said('Let’s find your flight.');
    await P.getByRole('button', { name: 'Find my flight' }).waitFor();
    check('booking: "Let’s find your flight." with the reference field, Find my flight, Try a sample booking and manual entry',
      await P.getByLabel('Booking reference').isVisible() && await P.getByRole('button', { name: 'Try a sample booking' }).isVisible() && await P.getByRole('button', { name: 'Enter flight details manually' }).isVisible()
      && /Yes, I’m booked/.test(await P.getByRole('list', { name: 'Your answers' }).innerText()));
    // An unknown reference: concise inline error, retry and manual entry stay available
    await P.waitForTimeout(500);
    await P.getByLabel('Booking reference').click(); await P.keyboard.type('ZZZ999', { delay: 25 }); await P.keyboard.press('Enter');
    await P.getByRole('alert').filter({ hasText: 'We couldn’t find that booking' }).waitFor({ timeout: 4000 });
    check('booking: an unknown reference shows a short inline error; samples and manual entry remain', await P.getByRole('list', { name: 'Sample bookings' }).isVisible() && await P.getByRole('button', { name: 'Enter flight details manually' }).isVisible() && !(await visible(P, 'Found your journey')));
    // A real sample reference, typed: lookup animation, then the journey
    await P.getByLabel('Booking reference').click(); await P.keyboard.press('ControlOrMeta+a'); await P.keyboard.type('axr7kd', { delay: 25 });
    await P.getByRole('button', { name: 'Find my flight' }).click();
    const looking = await P.getByRole('button', { name: 'Finding your flight' }).isVisible();
    await said('Found your journey!');
    check('lookup: a short animated lookup (the button reads Finding your flight), then "Found your journey!"', looking);
    await said('You’re flying from Jakarta to Paris, with a stop in Singapore.');
    await P.waitForTimeout(2600);
    const journey = (await P.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).innerText()).replace(/\s+/g, ' ');
    check('journey: origin, connection and destination from the booking, with the trip timeline (local times and dates)',
      /CGK.*Jakarta.*SIN.*Singapore.*CDG.*Paris/.test(journey) && /08:20 Depart Jakarta/.test(journey) && /11:15 Arrive Singapore/.test(journey) && /Connection in Singapore 12h 20m/.test(journey)
      && /23:35 Depart Singapore/.test(journey) && /06:20 Arrive Paris/.test(journey), journey);
    await said('You’ll have 12h 20m at Singapore Changi Airport.');
    await P.waitForTimeout(1900);
    const airport = (await P.getByRole('region', { name: /^Singapore Changi Airport: 12h 20m connection, 10h 20m to explore$/ }).innerText()).replace(/\s+/g, ' ');
    check('airport: Singapore Changi with photo and code; 12h 20m connection − 2h buffer = 10h 20m to explore', /Singapore Changi Airport/.test(airport) && /SIN/.test(airport)
      && /Connection 12h 20m/.test(airport) && /Planning buffer − 2h/.test(airport) && /To explore 10h 20m/.test(airport), airport);
    await said('You’ve got time to explore Singapore Changi.');
    // Interests: several can be picked; then confirm
    await said('What would you like to do during your layover?');
    await P.getByRole('button', { name: /^Dining/ }).waitFor(); await P.waitForTimeout(800);
    check('interests: four cards (Dining, Shopping, Relaxation, Attractions); confirm waits for a pick', /Dining.*Shopping.*Relaxation.*Attractions/s.test(await P.getByRole('list', { name: 'Interests' }).innerText()) && await P.getByRole('button', { name: /Pick one or more/ }).isDisabled());
    await P.getByRole('button', { name: /^Dining/ }).click(); await P.getByRole('button', { name: /^Attractions/ }).click();
    check('interests: Dining and Attractions are marked as picked; the others stay available', (await P.getByRole('button', { name: /^Dining/ }).getAttribute('aria-pressed')) === 'true'
      && (await P.getByRole('button', { name: /^Attractions/ }).getAttribute('aria-pressed')) === 'true' && await P.getByRole('button', { name: /^Shopping/ }).isEnabled());
    await P.getByRole('button', { name: /That’s it \(2\)/ }).click();
    await said('Perfect. Let’s find something worth your time.');
    // Finishing: guest session, the flight saved, Home (no Account Access)
    await P.locator('.ss-loader').waitFor({ timeout: 6000 });
    await P.getByRole('button', { name: 'View layover' }).waitFor({ timeout: 15000 }); await P.waitForTimeout(500);
    const saved = mineAX();
    check('finish: one guest session, the flight saved once, Home opens directly (no Account Access, no Get started)',
      fake.calls.filter((c) => c.includes('/auth/v1/signup')).length === signupsBefore + 1 && saved.length === 1 && saved[0].items.length === 0
      && !(await visible(P, 'No account yet?')) && (await P.locator('.ss-loader').count()) === 0, `saved=${saved.length}`);
    check('finish: interests kept; no activities added anywhere', await P.evaluate(() => localStorage.getItem('skystop.interests.v1')) === '["Food","Sights"]');
    const card = (await P.getByLabel('Upcoming trip').innerText()).replace(/\s+/g, ' ');
    check('Home card: CGK → CDG via SIN; Arrive SIN 11:15 · Connection 12h 20m · Depart SIN 23:35; 10h 20m to explore = 12h 20m − 2h; View layover',
      /Jakarta.*Paris.*CGK.*SIN.*CDG/.test(card) && /Arrive SIN 11:15/i.test(card) && /Connection 12h 20m/i.test(card) && /Depart SIN 23:35/i.test(card)
      && /Time to explore 10h 20m/.test(card) && /12h 20m connection − 2h buffer/.test(card) && await P.getByRole('button', { name: 'View layover' }).isVisible(), card);
    await P.getByRole('button', { name: 'My Plans' }).click(); await P.getByRole('heading', { name: 'My plans' }).waitFor();
    check('My Plans: no itinerary was created from the interests', await visible(P, 'No saved itineraries yet'));
    await P.getByRole('button', { name: 'Home' }).first().click();
    // View layover → empty itinerary → Explore activities → discovery with interests first → add → build
    await P.getByRole('button', { name: 'View layover' }).click();
    await P.getByText('No activities planned yet').waitFor();
    check('Layover details: "No activities planned yet" with one action, Explore activities (no Edit plan)', await visible(P, 'Discover what you can do during your layover.')
      && await P.getByRole('button', { name: 'Explore activities' }).isVisible() && (await P.getByRole('button', { name: 'Edit plan' }).count()) === 0);
    await P.getByRole('button', { name: 'Explore activities' }).click();
    await P.getByRole('heading', { name: 'Activities' }).waitFor();
    const order = await P.getByRole('button', { name: /^Add / }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label').replace(/^Add /, '')));
    // Changi: Dining = LeMa, Harry's; Attractions = Jewel Rain Vortex, Butterfly Garden, Canopy Park, Free Singapore Tour; Relaxation = the lounge and the pool
    const firstRest = Math.min(...['Free Snooze Lounge', 'Rooftop pool with jacuzzi'].map((n) => order.indexOf(n)).filter((i) => i >= 0))
    const heading = await P.evaluate(() => { const hs = [...document.querySelectorAll('h2')].map((h) => h.textContent); return hs.indexOf('Activities') < hs.indexOf('Curated itineraries') })
    check('discovery: Dining and Attractions first ("from your interests"), activities before curated itineraries', await visible(P, 'Dining and Attractions first, from your interests')
      && firstRest === 6 && heading, JSON.stringify(order));
    await P.getByRole('button', { name: /^Add Butterfly Garden/ }).click();
    await P.getByRole('button', { name: 'Build itinerary (1)' }).click();
    await P.getByLabel('Itinerary').waitFor();
    check('building: the chosen activity starts the itinerary for this flight', (await P.getByLabel('Itinerary').innerText()).includes('Butterfly Garden'));
    await P.getByRole('button', { name: 'Save changes' }).click(); await P.waitForTimeout(1500);
    const after = mineAX();
    check('building: saving updates the same flight (no second flight); My Plans now lists it', after.length === 1 && after[0].items.length === 1);
    // Refresh keeps the flight; replaying the onboarding with the same booking does not duplicate it
    await P.reload(); await P.waitForTimeout(2600);
    check('refresh: the saved flight is still on Home', await P.getByRole('button', { name: 'View layover' }).isVisible() && !(await visible(P, 'Already have a flight booked?')));
    await P.getByRole('button', { name: 'Profile' }).click();
    await P.getByRole('button', { name: 'Replay introduction' }).click();
    await throughSlides(P);
    await P.getByRole('button', { name: 'Yes, I’m booked' }).click();
    await P.getByRole('button', { name: 'Try a sample booking' }).waitFor({ timeout: 6000 }); await P.waitForTimeout(500);
    await P.getByRole('button', { name: 'Try a sample booking' }).click();
    await P.getByRole('button', { name: /^Sample booking AXR7KD/ }).click();
    await P.getByRole('button', { name: /^Not sure yet/ }).waitFor({ timeout: 15000 }); await P.waitForTimeout(600);
    await P.getByRole('button', { name: /^Not sure yet/ }).click();
    await P.getByRole('button', { name: 'View layover' }).waitFor({ timeout: 15000 }); await P.waitForTimeout(400);
    check('replay: same booking again → still one flight (with its itinerary), same session, no Account Access',
      mineAX().length === 1 && fake.calls.filter((c) => c.includes('/auth/v1/signup')).length === signupsBefore + 1
      && !(await visible(P, 'No account yet?')));
    await o.ctx.close();
  }
  {
    // Not yet: no booking asked, no flight invented; interests; Home as a guest
    const n = await newGuest(undefined, { firstVisit: true });
    const before = fake.plans.size, s0 = fake.calls.filter((c) => c.includes('/auth/v1/signup')).length;
    await n.page.goto(BASE); await appReady(n.page); await throughSlides(n.page);
    await n.page.getByRole('button', { name: 'Not yet' }).click();
    await n.page.locator('main .sr-only', { hasText: 'You can explore your options before booking.' }).waitFor({ state: 'attached', timeout: 6000 });
    check('Not yet: SkyStop shows comparing flights and exploring airports; no booking field', await n.page.getByRole('region', { name: 'Compare flights' }).isVisible() && (await n.page.getByLabel('Booking reference').count()) === 0);
    await n.page.getByRole('button', { name: /^Relaxation/ }).waitFor({ timeout: 8000 }); await n.page.waitForTimeout(700);
    await n.page.getByRole('button', { name: /^Relaxation/ }).click();
    fake.failNext['auth/v1/signup'] = 1; // the guest session cannot be created at first
    await n.page.getByRole('button', { name: /That’s it/ }).click();
    await n.page.getByRole('alert').filter({ hasText: 'SkyStop couldn’t start.' }).waitFor({ timeout: 15000 });
    check('guest session error: the transition stops with a short retry (no flight to claim)', await n.page.getByRole('button', { name: 'Try again' }).isVisible() && (await n.page.locator('.ss-loader').count()) === 0);
    await n.page.getByRole('button', { name: 'Try again' }).click();
    await n.page.getByRole('button', { name: /^Add flight/ }).first().waitFor({ timeout: 15000 });
    check('Not yet: Home as a guest, no flight saved, Compare flights still there', fake.plans.size === before && fake.calls.filter((c) => c.includes('/auth/v1/signup')).length > s0
      && await n.page.getByRole('button', { name: /^Compare flights/ }).first().isVisible() && (await n.page.getByLabel('Upcoming trip').count()) === 0);
    await n.ctx.close();
  }
  {
    // Manual entry from the conversation: guest session, then Home with the manual flight form on top
    const m = await newGuest(undefined, { firstVisit: true });
    await m.page.goto(BASE); await appReady(m.page); await throughSlides(m.page);
    await m.page.getByRole('button', { name: 'Yes, I’m booked' }).click();
    await m.page.getByRole('button', { name: 'Enter flight details manually' }).waitFor({ timeout: 6000 }); await m.page.waitForTimeout(400);
    await m.page.getByRole('button', { name: 'Enter flight details manually' }).click();
    await m.page.getByRole('combobox', { name: 'Connecting airport' }).waitFor({ timeout: 15000 });
    check('manual entry: the existing manual flight form opens after the guest session (no Account Access)', await m.page.getByRole('region', { name: 'Connection' }).isVisible() && !(await visible(m.page, 'No account yet?')));
    await m.ctx.close();
  }
  {
    // Saving the flight fails once: a short retry; nothing claimed as saved; Try again saves it
    const f = await newGuest(undefined, { firstVisit: true });
    const knownF = new Set(fake.plans.keys());
    await f.page.goto(BASE); await appReady(f.page); await throughSlides(f.page);
    await f.page.getByRole('button', { name: 'Yes, I’m booked' }).click();
    await f.page.getByRole('button', { name: 'Try a sample booking' }).waitFor({ timeout: 6000 }); await f.page.waitForTimeout(400);
    await f.page.getByRole('button', { name: 'Try a sample booking' }).click();
    await f.page.getByRole('button', { name: /^Sample booking DH5PRZ/ }).click();
    await f.page.getByRole('button', { name: /^Not sure yet/ }).waitFor({ timeout: 15000 }); await f.page.waitForTimeout(600);
    fake.failNext['rpc/save_plan'] = 1; // the save fails (and the lost-reply check finds nothing saved)
    await f.page.getByRole('button', { name: /^Not sure yet/ }).click();
    await f.page.getByRole('alert').filter({ hasText: 'Your flight isn’t saved yet.' }).waitFor({ timeout: 15000 });
    check('save failure: the transition stops and a retry appears; no "saved" claim, still on the conversation', await f.page.getByRole('button', { name: 'Try again' }).isVisible() && (await f.page.locator('.ss-loader').count()) === 0
      && (await f.page.getByRole('button', { name: 'View layover' }).count()) === 0);
    await f.page.getByRole('button', { name: 'Try again' }).click();
    await f.page.getByRole('button', { name: 'View layover' }).waitFor({ timeout: 15000 });
    const card = (await f.page.getByLabel('Upcoming trip').innerText()).replace(/\s+/g, ' ');
    check('save retry: saved once; overnight connection shown in Dubai local time (arrive 00:45, depart 07:45, 7h, 5h to explore)',
      [...fake.plans.entries()].filter(([id, x]) => !knownF.has(id) && fake.details.get(x.row.id)?.row.booking_ref === 'DH5PRZ').length === 1 && /Arrive DXB 00:45/i.test(card) && /Depart DXB 07:45/i.test(card) && /Connection 7h/i.test(card) && /Time to explore 5h/.test(card), card);
    await f.ctx.close();
  }
  {
    // Skip → Account Access (not signed in); the screen comes back on the next launch until a choice is made
    const o = await newGuest(undefined, { firstVisit: true, reducedMotion: 'no-preference' });
    const sk0 = fake.calls.filter((c) => c.includes('/auth/v1/signup')).length;
    await o.page.goto(BASE); await appReady(o.page);
    await o.page.getByRole('button', { name: 'Skip' }).click();
    await o.page.getByRole('button', { name: 'Get started' }).waitFor();
    check('onboarding: Skip on the slides opens Account Access without signing in', await o.page.getByRole('heading', { name: 'SkyStop', level: 1 }).isVisible() && await o.page.getByText('Plan your layover', { exact: true }).isVisible() && fake.calls.filter((c) => c.includes('/auth/v1/signup')).length === sk0);
    check('access: decorative layers ignore pointer events; glass uses a real backdrop blur', await o.page.evaluate(() => getComputedStyle(document.querySelector('.access__stage')).pointerEvents === 'none' && /blur/.test(getComputedStyle(document.querySelector('.access__strip')).backdropFilter)));
    await o.page.reload();
    await o.page.getByRole('button', { name: 'Get started' }).waitFor();
    check('access: leaving without choosing shows it again on the next launch', !(await visible(o.page, 'Already have a flight booked?')));
    await o.ctx.close();
  }
  {
    // Sign in on the slides opens the email sign-in form; Not now comes back to the slides
    const si = await newGuest(undefined, { firstVisit: true });
    await si.page.goto(BASE); await si.page.getByText('Your layover, reimagined.').waitFor(); await appReady(si.page);
    await si.page.getByRole('button', { name: 'Sign in' }).click();
    await si.page.getByRole('button', { name: 'Send sign-in link' }).waitFor();
    check('intro: Sign in on the slides opens the email sign-in form', await si.page.getByLabel('Email').isVisible());
    await si.page.getByRole('button', { name: 'Not now' }).click();
    await si.page.getByText('Your layover, reimagined.').waitFor();
    check('intro: Not now returns to the slides', await si.page.getByRole('button', { name: 'Get started' }).isVisible());
    await si.ctx.close();
  }
  // Log in / Create one: straight to the email form, never the guest loader
  for (const [action, form, submit] of [['Log in', 'Log in', 'Send sign-in link'], ['Create one', 'Create account', 'Send confirmation link']]) {
    const a = await newGuest(undefined, { firstVisit: true });
    await a.page.goto(BASE); await appReady(a.page); await loaderSeen(a.page);
    const lg0 = fake.calls.filter((c) => c.includes('/auth/v1/signup')).length;
    await a.page.getByRole('button', { name: 'Skip' }).click();
    await a.page.getByRole('button', { name: action, exact: true }).click();
    await a.page.getByRole('button', { name: submit }).waitFor();
    check(`access: ${action} opens the ${form.toLowerCase()} form directly, without the guest loader or a guest session`,
      await a.page.getByRole('form', { name: form }).isVisible() && await a.page.getByRole('textbox', { name: 'Email' }).isVisible() && !(await a.page.evaluate(() => window.__ssl))
      && fake.calls.filter((c) => c.includes('/auth/v1/signup')).length === lg0);
    await a.ctx.close();
  }
  {
    // Get started when the guest session cannot be created: the loader stops and a concise retry appears
    const e = await newGuest(undefined, { firstVisit: true });
    await e.page.goto(BASE); await appReady(e.page);
    await e.page.getByRole('button', { name: 'Skip' }).click();
    fake.failNext['auth/v1/signup'] = 1;
    await e.page.getByRole('button', { name: 'Get started' }).click();
    await e.page.getByRole('alert').filter({ hasText: 'Couldn’t start' }).waitFor({ timeout: 8000 });
    check('Get started failure: the loader stops; a short message and Try again (no technical text)', (await e.page.locator('.ss-loader').count()) === 0 && await e.page.getByRole('button', { name: 'Try again' }).isVisible());
    await e.page.getByRole('button', { name: 'Try again' }).click();
    await e.page.getByRole('button', { name: /^Add flight/ }).first().waitFor({ timeout: 8000 });
    check('Get started failure: Try again recovers and opens Home', true);
    await e.ctx.close();
  }
  {
    // A visitor who left Account Access without choosing, but has a session by the next launch (e.g. an email link) skips it.
    const guestId = '00000000-0000-4000-8000-0000000acc55';
    fake.accounts.set(guestId, { id: guestId, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
    const s = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: MOTION });
    await s.addInitScript((t) => { localStorage.setItem('skystop.onboarded.v2', '1'); localStorage.setItem('skystop.access.v1', 'pending'); localStorage.setItem('sb-sgwbtgwccskqamzttczz-auth-token', t) }, JSON.stringify(fake.sessionFor(guestId)));
    await s.route('**://*.supabase.co/**', fake.handler);
    const P = await s.newPage(); await P.goto(BASE);
    await P.getByRole('button', { name: /^Add flight/ }).first().waitFor();
    await P.waitForTimeout(300);
    check('access: a browser with an existing session goes straight to Home', !(await P.getByRole('button', { name: 'Get started' }).isVisible()));
    await s.close();
    // A signed-in browser that never saw the onboarding (e.g. storage from before it existed) is not shown it.
    const s2 = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: MOTION });
    await s2.addInitScript((t) => { localStorage.setItem('sb-sgwbtgwccskqamzttczz-auth-token', t) }, JSON.stringify(fake.sessionFor(guestId)));
    await s2.route('**://*.supabase.co/**', fake.handler);
    const P2 = await s2.newPage(); await P2.goto(BASE);
    await P2.getByRole('button', { name: /^Add flight/ }).first().waitFor();
    check('returning user with a session: no onboarding, no Account Access', !(await visible(P2, 'Already have a flight booked?')) && !(await visible(P2, 'No account yet?')));
    await s2.close();
  }
  {
    // Reduced motion: the same automatic progression, with instant changes
    const rm = await newGuest(undefined, { firstVisit: true, reducedMotion: 'reduce' });
    await rm.page.goto(BASE);
    await throughSlides(rm.page);
    await rm.page.getByRole('button', { name: 'Yes, I’m booked' }).waitFor({ timeout: 4000 }); await rm.page.waitForTimeout(150);
    const line = await rm.page.evaluate(() => ({ caret: !!document.querySelector('.onb-caret--inline'),
      whole: [...document.querySelectorAll('main p')].filter((p) => p.querySelector('.sr-only')).every((p) => p.querySelector('span[aria-hidden="true"]').textContent === p.querySelector('.sr-only').textContent),
      asked: [...document.querySelectorAll('main p .sr-only')].some((e) => e.textContent === 'Already have a flight booked?') }));
    await rm.page.getByRole('button', { name: 'Yes, I’m booked' }).click();
    await rm.page.getByRole('button', { name: 'Try a sample booking' }).waitFor({ timeout: 5000 });
    await rm.page.getByRole('button', { name: 'Try a sample booking' }).click();
    await rm.page.getByRole('button', { name: /^Sample booking BQ3LMV/ }).click();
    await rm.page.getByRole('button', { name: /^Dining/ }).waitFor({ timeout: 10000 }); await rm.page.waitForTimeout(200);
    await rm.page.getByRole('button', { name: /^Dining/ }).click(); await rm.page.getByRole('button', { name: /That’s it/ }).click();
    await rm.page.getByRole('button', { name: 'View layover' }).waitFor({ timeout: 10000 });
    check('reduced motion: lines appear whole (no streaming); the conversation still runs by itself through booking and interests to Home', !line.caret && line.whole && line.asked, JSON.stringify(line));
    await rm.page.getByRole('button', { name: 'Profile' }).click(); await rm.page.getByRole('button', { name: 'Replay introduction' }).click();
    await rm.page.getByRole('button', { name: 'Skip' }).click(); await rm.page.waitForTimeout(400);
    await rm.page.getByRole('button', { name: 'Profile' }).click().catch(() => {}); await rm.page.getByRole('button', { name: 'Sign in' }).click(); await rm.page.waitForTimeout(400);
    check('access: reduced motion shows a still composition', await rm.page.evaluate(() => [...document.querySelectorAll('.access__orbit, .access__blob, .access__strip')].every((e) => getComputedStyle(e).animationName === 'none')));
    await rm.ctx.close();
  }

  // ---- 4d. Map wayfinding (Changi pilot): clustering, directions, honesty, layout; Lisbon fallback
  {
    const wf = await newGuest();
    const P = wf.page;
    const toChangiMap = async () => {
      await P.getByRole('button', { name: 'Airports', exact: true }).first().click();
      await P.getByRole('button', { name: /Changi/ }).first().click(); await P.getByRole('tab', { name: 'map' }).click();
      await P.locator('.map-pin').first().waitFor(); await P.waitForTimeout(700);
    };
    await P.goto(BASE);
    await toChangiMap();
    const pinsApart = await P.evaluate(() => { const r = [...document.querySelectorAll('.map-pin')].map((e) => e.getBoundingClientRect()); for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) return false; } return r.length > 0; });
    check('wayfinding: terminal pins never overlap (close terminals merge into a cluster)', pinsApart);
    check('wayfinding: no floor control (no floor data)', (await P.getByRole('button', { name: /floor|level/i }).count()) === 0);
    // Plan: two venues in different areas, arrival T1, departure T3
    await P.getByRole('tab', { name: 'list' }).click();
    await P.getByRole('button', { name: /^(Select|Add) Butterfly Garden/ }).click();
    await P.getByRole('button', { name: /^(Select|Add) Jewel Rain Vortex/ }).click();
    await P.getByRole('button', { name: /Set layover times/ }).first().click();
    await P.getByLabel(/Arrival/).first().fill(`${day(7)}T08:00`); await P.getByLabel(/departure/i).first().fill(`${day(7)}T20:00`);
    await P.getByRole('button', { name: 'Build my itinerary' }).click();
    await P.getByRole('button', { name: /^Arriving at Terminal 1/ }).click();
    await P.getByRole('button', { name: /^Departing from Terminal 3/ }).click();
    // Entry point 1: the itinerary itself
    await P.getByRole('button', { name: 'See how to get there' }).click();
    const dir = P.locator('section[aria-label="Directions"]');
    await dir.getByText('Step 1 of 3').waitFor();
    check('wayfinding: "See how to get there" on the itinerary opens the map on step 1 of the directions', await dir.isVisible());
    await P.getByRole('button', { name: 'Back', exact: true }).first().click();
    await P.getByRole('button', { name: /^Save (layover )?plan/ }).click();
    await P.getByLabel('Upcoming trip').waitFor({ timeout: 8000 });
    // Entry point 2: from the map's own button
    await toChangiMap();
    await P.getByRole('button', { name: 'How to get there' }).click();
    await dir.getByText('Step 1 of 3').waitFor();
    const d1 = (await dir.innerText()).replace(/\s+/g, ' ');
    check('wayfinding: Directions opens step 1 of 3 (arrival T1 → Butterfly Garden T3) with time, distance and Changi\'s transfer time', d1.includes('To Butterfly Garden') && d1.includes('From Arrival') && await dir.getByText('Airport transfer time').first().isVisible() && /5–10 min/.test(d1) && /\d(\.\d)? km|\d+ m\b/.test(d1), d1.slice(0, 200));
    check('wayfinding: generic steps adapted to the route (start, Skytrain to T3, continue to the stop)', /Start at your arrival gate area in Terminal 1/.test(d1) && /Skytrain/.test(d1));
    check('wayfinding: the destination pin and origin marker are drawn', (await P.locator('.wf-pin').count()) === 1 && (await P.locator('.wf-stop--origin').count()) === 1);
    await dir.getByRole('button', { name: 'Next step' }).click();
    const d2 = await dir.innerText();
    check('wayfinding: Next step moves to step 2, with the arrival immigration step visible (no waiting time given)', d2.includes('Step 2 of 3') && /Clear arrival immigration/.test(d2) && !/immigration[^\n]*\d+ ?min/i.test(d2));
    check('wayfinding: the simulated route is labelled once, not after every step', (await dir.getByText(/Estimated route|Airport transfer time/).count()) === 1);
    check('wayfinding: the route is drawn on the map as a line between the stops', (await P.locator('.leaflet-overlay-pane path').count()) >= 2);
    await dir.getByRole('button', { name: 'Next step' }).click();
    const d3 = (await dir.innerText()).replace(/\s+/g, ' ');
    check('wayfinding: the return leg (Jewel → departure) shows check-in, departure immigration and security', d3.includes('Step 3 of 3') && /departure immigration and security/i.test(d3) && d3.includes('Done'), d3.slice(0, 200));
    await P.getByRole('button', { name: 'Expand sheet' }).click();
    const all = (await dir.innerText()).replace(/\s+/g, ' ');
    check('wayfinding: all stops list both stops and the departure, with no disclaimer', /All stops.*Butterfly Garden.*Jewel Rain Vortex.*Departure/.test(all) && !/No route lines|planning estimate|Source:/i.test(all), all.slice(0, 200));
    await P.getByRole('button', { name: 'Collapse sheet' }).click();
    await P.waitForTimeout(600);
    const lay = await P.evaluate(() => {
      const sheet = document.querySelector('section[aria-label="Directions"]').getBoundingClientRect(), nav = document.querySelector('nav[aria-label="Primary"] > div').getBoundingClientRect();
      const ctrl = Math.max(0, ...[...document.querySelectorAll('.map-glass.press')].filter((e) => getComputedStyle(e).visibility !== 'hidden').map((e) => e.getBoundingClientRect().bottom));
      const attr = document.querySelector('.leaflet-control-attribution').getBoundingClientRect();
      return { sheetAboveNav: sheet.bottom <= nav.top, ctrlAboveSheet: ctrl <= sheet.top, attributionVisible: attr.bottom <= sheet.top + 1 && attr.height > 0, sideways: document.documentElement.scrollWidth > innerWidth };
    });
    check('wayfinding: sheet above the tab bar, controls and map credit above the sheet, no sideways scroll', lay.sheetAboveNav && lay.ctrlAboveSheet && lay.attributionVisible && !lay.sideways, JSON.stringify(lay));
    await dir.getByRole('button', { name: 'Back to the map' }).click();
    check('wayfinding: back to the map keeps the itinerary', await visible(P, '2 planned'));
    // Lisbon: no transfer data, so no directions button and an honest note
    await P.getByRole('button', { name: 'Airports', exact: true }).first().click();
    await P.getByRole('button', { name: /Lisbon/ }).first().click(); await P.getByRole('tab', { name: 'map' }).click();
    await P.locator('.map-pin').first().click();
    await P.getByRole('button', { name: /ANA Lounge/ }).first().click();
    const pre = (await P.locator('section[aria-label^="ANA Lounge"]').innerText()).replace(/\s+/g, ' ');
    check('wayfinding: tapping a venue previews its route from the arrival gate (time and distance, line on the map)', /from Arrival/.test(pre) && /\d+ ?min/.test(pre) && (await P.locator('.wf-pin').count()) === 1, pre.slice(0, 160));
    const lisbonOk = (await P.getByRole('button', { name: 'How to get there' }).count()) === 1
    // Activity details: How to get there opens the map route to that venue (Lisbon, no transfer graph: simulated walk)
    await P.getByRole('button', { name: 'How to get there' }).click();
    await P.locator('section[aria-label="Directions"]').getByText('To ANA Lounge', { exact: false }).waitFor();
    const lis = (await P.locator('section[aria-label="Directions"]').innerText()).replace(/\s+/g, ' ');
    check('wayfinding: Lisbon directions use the simulated route, labelled "Estimated route", with a line drawn', lis.includes('Estimated route') && (await P.locator('.leaflet-overlay-pane path').count()) >= 1, lis.slice(0, 160));
    // Venue locations: a bakery chain has several, a lounge one; picking a location routes to it
    await P.getByRole('button', { name: 'Back to the map' }).click();
    await P.getByRole('button', { name: 'Close preview' }).click();
    if (await P.getByRole('button', { name: 'Expand sheet' }).count()) await P.getByRole('button', { name: 'Expand sheet' }).click();
    await P.locator('[aria-label="Venues"] button').filter({ hasText: 'Padaria Lisboa' }).first().click();
    const chips = P.getByRole('group', { name: 'Padaria Lisboa locations' }).getByRole('button');
    check('locations: a bakery chain offers several locations on the map (5 or more)', (await chips.count()) >= 5);
    await chips.nth(2).click();
    check('locations: choosing another location updates the selected chip and the route preview', (await chips.nth(2).getAttribute('aria-pressed')) === 'true' && /from Arrival/.test(await P.locator('section[aria-label="Padaria Lisboa"]').innerText()));
    await P.getByRole('button', { name: 'Details', exact: true }).click();
    const dlg = P.getByRole('dialog', { name: 'Padaria Lisboa' });
    const locs = dlg.getByRole('region', { name: 'Locations' });
    check('locations: details list every location grouped by terminal', (await locs.getByRole('heading', { name: 'Terminal 1' }).count()) === 1 && (await locs.getByRole('button', { name: /^Directions to Padaria Lisboa/ }).count()) >= 5);
    await locs.getByRole('button', { name: /^Directions to Padaria Lisboa, Terminal 1, Arrivals/ }).first().click();
    await P.locator('section[aria-label="Directions"]').getByText('To Padaria Lisboa', { exact: false }).waitFor();
    check('locations: tapping a location opens directions to it', await P.locator('section[aria-label="Directions"]').isVisible());
    // Entry point 3: a saved plan
    await P.getByRole('button', { name: 'My Plans' }).click();
    await P.getByRole('heading', { name: 'My plans' }).waitFor();
    await P.locator('button.ph').first().click();
    await P.getByRole('button', { name: 'See how to get there' }).click();
    await P.locator('section[aria-label="Directions"]').getByText('Step 1 of 3').waitFor();
    check('wayfinding: a saved plan has "See how to get there" and it opens the directions', await P.locator('section[aria-label="Directions"]').isVisible());
    check('wayfinding: Lisbon venues also get "How to get there"', lisbonOk);
    await wf.ctx.close();
  }

  // ---- 4c. Changi constraint-aware itinerary (scenarios A–F)
  {
    const c = await newGuest();
    const P = c.page;
    const hero = async () => (await P.getByLabel('Time budget').innerText()).replace(/\s+/g, ' ');
    const itin = async () => (await P.getByLabel('Itinerary').innerText()).replace(/\s+/g, ' ');
    await P.goto(BASE);
    await P.getByRole('button', { name: /^Add flight/ }).first().click();
    await P.getByLabel('Booking reference').fill('AXR7KD');
    await P.getByRole('button', { name: 'Find my journey' }).click();
    await P.getByRole('button', { name: 'Explore Singapore' }).click();
    await P.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
    await P.getByRole('button', { name: 'Add Butterfly Garden' }).click();
    await P.getByRole('button', { name: "Add Harry's" }).click();
    await P.getByRole('button', { name: 'Build itinerary (2)' }).click();
    await P.getByLabel('Time budget').waitFor();
    // D (terminals unknown): transfers cannot be estimated, so feasibility is not claimed
    check('D: terminals not set -> "Cannot verify feasibility" and the transfer asks for a terminal', (await hero()).includes('Cannot verify feasibility') && (await itin()).includes('Choose a terminal to estimate'));
    await P.getByRole('button', { name: 'Arriving at Terminal 3 transit area' }).click();
    await P.getByRole('button', { name: 'Departing from Terminal 3 transit area' }).click();
    // A: two airside activities in T3: 620 usable − 70 activities − 3 × 10 (within-area planning estimates) = 520 = 8h 40m
    const ha = await hero();
    check('A: airside-only plan fits; remaining = 10h 20m − 1h 10m activities − 30m transfers = 8h 40m', !ha.includes('Cannot verify') && !ha.includes('Exceeds') && ha.includes('8h 40m') && ha.includes('Transfers 30m') && (await visible(P, 'Stays in the transit area')), ha.slice(0, 160));
    check('A: each transfer is shown with its estimate', (await P.getByText('Transfer: 2–10m').count()) === 2 && (await P.getByText('Return: 2–10m').count()) === 1);
    await shot(P, '07-changi-airside');
    // E: reorder and remove update everything at once
    await P.getByRole('button', { name: 'Reorder' }).click();
    await P.getByRole('button', { name: "Move Harry's earlier" }).click();
    await P.getByRole('button', { name: 'Done' }).click();
    check('E: reorder keeps the new order (Harry\'s first)', (await itin()).indexOf("Harry's") < (await itin()).indexOf('Butterfly Garden'));
    await P.getByRole('button', { name: 'See how to get there' }).click();
    await P.locator('section[aria-label="Directions"]').getByText('Step 1 of 3').waitFor();
    check('E: after reordering, the map route follows the new order (step 1 goes to Harry\'s)', (await P.locator('section[aria-label="Directions"]').innerText()).includes("To Harry's"));
    await P.getByRole('button', { name: 'Back', exact: true }).first().click();
    await P.getByLabel('Itinerary').waitFor();
    // B: add Jewel (landside)
    await P.getByRole('button', { name: 'Add activities' }).click();
    await P.getByRole('button', { name: 'Add Jewel Rain Vortex' }).click();
    await P.getByRole('button', { name: 'Build itinerary (3)' }).click();
    await P.getByLabel('Entry check').waitFor();
    const hb = await hero(), entry = (await P.getByLabel('Entry check').innerText()).replace(/\s+/g, ' ');
    check('B: Jewel triggers "Entry verification required" with the zone transition explained', entry.includes('Entry verification required') && entry.includes('Jewel Rain Vortex is outside the transit area') && entry.includes('arrival immigration'));
    check('B: immigration and re-entry steps shown on the transfers (concise safety labels)', await visible(P, 'Immigration required') && await visible(P, 'Re-enter via check-in, immigration and security'));
    check('B: feasibility is not claimed while immigration time is unknown', hb.includes('Cannot verify feasibility') && hb.includes('Immigration queues not included'));
    check('B: links to ICA, the official authority', (await P.getByRole('link', { name: /Check entry requirements with Immigration & Checkpoints Authority/ }).getAttribute('href')).startsWith('https://www.ica.gov.sg/'));
    await P.getByLabel('Passport nationality (optional)').fill('Indonesian');
    await P.getByRole('button', { name: "I'm not sure" }).click();
    const said = (await P.locator('body').innerText());
    check('B: answers give guidance only; no eligibility decision is made', said.includes('Check the official guidance before you travel') && !/visa (approved|eligible)|guaranteed entry|safe to leave/i.test(said));
    check('B: nationality is not stored', !(await P.evaluate(() => JSON.stringify(localStorage))).includes('Indonesian'));
    await shot(P, '08-changi-jewel');
    await P.getByRole('button', { name: 'Remove landside activity' }).click();
    check('E: removing the landside activity clears the access warning and restores the estimate', (await P.getByLabel('Entry check').count()) === 0 && await visible(P, 'Stays in the transit area') && (await hero()).includes('8h 40m'));
    // F: persistence of order and terminals across save, refresh, reopen, edit, save
    await P.getByRole('button', { name: 'Save plan' }).click();
    await P.getByLabel('Upcoming trip').waitFor();
    // The most recently saved Changi plan (earlier sections also save Changi plans to the shared fake backend).
    const sp = [...fake.plans.values()].reverse().find((x) => x.row.airport_id === 'SIN' && x.items.length === 2);
    check('F: saved with the chosen order (Harry\'s, then Butterfly Garden)', !!sp && sp.items[0].activity_id.endsWith('08') && sp.items[1].activity_id.endsWith('04'));
    await P.reload();
    await P.getByRole('button', { name: 'View layover' }).click();
    await P.getByRole('button', { name: 'Edit plan' }).click();
    await P.getByLabel('Time budget').waitFor();
    check('F: reopened plan keeps its terminals and the same estimate', (await P.getByRole('button', { name: 'Arriving at Terminal 3 transit area' }).getAttribute('aria-pressed')) === 'true' && (await hero()).includes('8h 40m'));
    await P.getByRole('button', { name: 'Departing from Terminal 1 transit area' }).click();
    const hf = await hero();
    check('F: changing the departure terminal adds the Skytrain transfer (official 5–10 min)', hf.includes('8h 40m') && (await P.getByText('Return: 5–10m').count()) >= 1, hf.slice(0, 120));
    await P.getByRole('button', { name: 'Save changes' }).click();
    await P.getByText('All changes saved').waitFor();
    await P.reload();
    await P.getByRole('button', { name: 'View layover' }).click();
    await P.getByRole('button', { name: 'Edit plan' }).click();
    check('F: after refresh the edited departure terminal persists', (await P.getByRole('button', { name: 'Departing from Terminal 1 transit area' }).getAttribute('aria-pressed')) === 'true');
    await c.ctx.close();
  }
  // C: over budget at Changi (manual times: 5 h layover, 1 h 30 m buffer → 3 h 30 m usable)
  {
    const o = await newGuest();
    await o.page.goto(BASE);
    await o.page.getByRole('button', { name: 'Airports', exact: true }).click();
    await o.page.getByRole('button', { name: /Singapore Changi/ }).first().click();
    for (const n of ['Free Singapore Tour', 'Rooftop pool with jacuzzi']) await o.page.getByRole('button', { name: `Select ${n}` }).click();
    await o.page.getByRole('button', { name: /Set layover times/ }).click();
    await setTimes(o.page);
    await o.page.getByRole('button', { name: 'Build my itinerary' }).click();
    await o.page.getByLabel('Time budget').waitFor();
    const hc = (await o.page.getByLabel('Time budget').innerText()).replace(/\s+/g, ' ');
    check('C: 2h 30m + 1h activities exceed 3h 30m usable → "Exceeds available time", explained', hc.includes('Exceeds available time') && hc.includes('This plan does not fit') && await visible(o.page, 'exceeds your estimated available time'), hc.slice(0, 140));
    await o.ctx.close();
  }

  // ---- 6. Flights (Wallet stack, My flights), profile and optional account
  {
    const g = await newGuest(); const G = g.page;
    await G.goto(BASE);
    await G.getByRole('button', { name: 'Notifications' }).waitFor();
    for (const ref of ['DH5PRZ', 'AXR7KD', 'CJ8NWT']) {
      await G.getByRole('button', { name: /^Add flight/ }).click();
      await G.getByLabel('Booking reference').fill(ref);
      await G.getByRole('button', { name: 'Find my journey' }).click();
      await G.getByRole('button', { name: 'Save to My flights' }).click();
      await G.getByRole('button', { name: 'Notifications' }).waitFor();
    }
    const mine = [...fake.plans.values()].slice(-3).filter((p) => fake.details.get(p.row.id)?.owner === p.row.owner_id);
    check('flights: three sample flights saved as flights without activities, journey details stored in the database', mine.length === 3 && mine.every((p) => p.items.length === 0)
      && mine.map((p) => fake.details.get(p.row.id).row).some((d) => d.origin_airport === 'CGK' && d.destination_airport === 'CDG' && d.booking_ref === 'AXR7KD'));
    check('stack: nearest upcoming flight (AXR7KD, CGK → CDG) is in front', await G.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).isVisible());
    const strips = G.getByRole('button', { name: /^Show flight / });
    const stackBox = await G.getByRole('region', { name: 'My flights' }).boundingBox();
    check('stack: the two other flights peek behind it, compactly', (await strips.count()) === 2 && stackBox.height < 560, `strips ${await strips.count()}, height ${Math.round(stackBox.height)}`);
    await G.getByRole('button', { name: /^Show flight JFK to SIN via LHR/ }).click();
    check('stack: tapping a card brings that journey to the front', await G.getByRole('region', { name: 'Journey JFK to SIN via LHR' }).isVisible() && (await G.getByRole('button', { name: /^Show flight CGK to CDG via SIN/ }).count()) === 1);
    await G.getByRole('button', { name: 'View layover' }).click();
    check('stack: View layover opens the selected journey (London)', await visible(G, 'London'));
    await backToTabs(G); await G.getByRole('button', { name: 'Home' }).click();
    // a sample journey is not saved twice
    await G.getByRole('button', { name: /^Add flight/ }).click();
    await G.getByLabel('Booking reference').fill('AXR7KD'); await G.getByRole('button', { name: 'Find my journey' }).click();
    check('flights: a saved sample journey offers "Open in My flights" instead of a duplicate', await G.getByRole('button', { name: 'Open in My flights' }).isVisible());
    await backToTabs(G); await G.getByRole('button', { name: 'Home' }).click();
    // details come back from the database, not just this browser
    await G.evaluate(() => localStorage.removeItem('skystop.planmeta.v1'));
    await G.reload(); await G.getByRole('region', { name: 'My flights' }).waitFor();
    check('flights: routes are restored from the database after the browser copy is cleared', await G.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).isVisible());
    // See all → My flights
    await G.getByRole('button', { name: /^See all \(/ }).click();
    await G.getByRole('heading', { name: 'My flights' }).waitFor();
    const up = (await G.getByLabel('Upcoming flights').innerText()).replace(/\s+/g, ' ');
    check('My flights: upcoming flights in date order with connection, dates and itinerary status', /CGK.*CDG.*via SIN.*JFK.*SIN.*via LHR.*CDG.*HND.*via DXB/.test(up) && (up.match(/No itinerary yet/g) || []).length === 3, up.slice(0, 200));
    await G.getByRole('button', { name: 'Remove flight CDG to HND' }).click();
    check('My flights: removal asks first and says what goes with it', await visible(G, 'This flight has no saved itinerary.') && await G.getByRole('button', { name: 'Remove flight', exact: true }).isVisible());
    const n0 = fake.plans.size, d0 = fake.details.size;
    await G.getByRole('button', { name: 'Remove flight', exact: true }).click();
    await G.getByRole('button', { name: 'Remove flight CDG to HND' }).waitFor({ state: 'detached' });
    check('My flights: the flight is removed on the server, with its details', fake.plans.size === n0 - 1 && fake.details.size === d0 - 1);
    // Profile: optional nationality, owner-only
    await G.getByRole('button', { name: 'Home' }).click();
    await G.getByRole('button', { name: 'Profile' }).click();
    await G.getByRole('button', { name: 'Create account' }).waitFor({ timeout: 5000 }).catch(() => {});
    check('profile: guest status with optional account', await visible(G, 'Guest') && await G.getByRole('button', { name: 'Create account' }).isVisible() && await G.getByRole('button', { name: 'Sign in' }).isVisible());
    await G.getByRole('button', { name: 'What is this?' }).click();
    check('profile: travel-documents help opens from the heading row', await visible(G, 'never decides whether you may enter a country'));
    await G.getByLabel('Passport nationality').fill('Indonesia');
    await G.getByRole('button', { name: 'Save', exact: true }).click();
    await G.getByRole('complementary', { name: 'Passport details' }).waitFor();
    check('profile: saved travel details show as a passport card with Edit and Remove', (await G.getByRole('complementary', { name: 'Passport details' }).innerText()).includes('Indonesia') && await G.getByRole('button', { name: 'Edit' }).isVisible() && await G.getByRole('button', { name: 'Remove' }).isVisible());
    const uid = [...fake.plans.values()][fake.plans.size - 1].row.owner_id;
    check('profile: nationality stored privately for this user only (no passport number fields)', fake.profiles.get(uid)?.nationality === 'Indonesia' && (await G.getByLabel(/passport number/i).count()) === 0);
    // Upgrade the guest to an account (same user id → same flights)
    await G.getByRole('button', { name: 'Create account' }).click();
    await G.getByLabel('Email').fill('traveller@example.com');
    check('profile: Create account opens the SS screen with the email field', await G.getByRole('form', { name: 'Create account' }).isVisible() && (await G.getByRole('button', { name: 'Home' }).count()) === 0);
    await G.getByRole('button', { name: 'Send confirmation link' }).click();
    await G.getByText('Check your email').waitFor();
    check('account: create account attaches the email to the current guest (no new user)', fake.emails.some((m) => m.kind === 'confirm' && m.uid === uid && m.to === 'traveller@example.com') && fake.accounts.size === new Set([...fake.accounts.keys()]).size);
    fake.confirmEmail(uid);
    await G.reload(); await G.getByRole('button', { name: 'Notifications' }).waitFor();
    await G.getByRole('button', { name: 'Profile' }).click();
    await G.getByText('traveller@example.com').first().waitFor();
    check('account: after confirmation the profile shows the account; flights and nationality are kept', await visible(G, 'Signed in') && (await G.getByRole('complementary', { name: 'Passport details' }).innerText()).includes('Indonesia'));
    check('account: Account shows name field and the email', await G.getByLabel('Name').isVisible() && (await G.getByText('traveller@example.com').count()) >= 2);
    await G.getByLabel('Name').fill('Glenda Traveller');
    await G.getByRole('button', { name: 'Save', exact: true }).first().click();
    await G.getByRole('heading', { name: 'Glenda Traveller' }).or(G.getByText('Glenda Traveller', { exact: true })).first().waitFor();
    check('account: name saved to the account and shown at the top', fake.accounts.get(uid).user_metadata.display_name === 'Glenda Traveller');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64');
    await G.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
    await G.getByRole('button', { name: 'Change profile picture' }).waitFor();
    check('account: profile picture uploaded to the private avatars bucket in the user\'s own folder and shown', fake.avatars.has(`${uid}/avatar.jpg`) && /avatar\.jpg/.test(fake.accounts.get(uid).user_metadata.avatar_path) && (await G.locator('img[src*="avatars"]').count()) >= 1);
    await G.reload(); await G.getByRole('button', { name: 'Profile' }).click();
    await G.getByRole('button', { name: 'Change profile picture' }).waitFor();
    check('account: name and picture persist after a reload', await visible(G, 'Glenda Traveller') && (await G.locator('img[src*="avatars"]').count()) >= 1);
    await G.getByRole('button', { name: 'Remove photo' }).click();
    await G.getByRole('button', { name: 'Add profile picture' }).waitFor();
    check('account: picture can be removed', !fake.avatars.has(`${uid}/avatar.jpg`));
    await G.getByRole('button', { name: 'Home' }).click();
    check('home: greeting uses the signed-in name', /^Good (night|morning|afternoon|evening), Glenda$/.test((await G.getByText(/^Good (night|morning|afternoon|evening)/).first().innerText()).trim()));
    await G.getByRole('button', { name: 'Profile' }).click();
    // Another device: sign in to the same account
    const other = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: MOTION });
    await other.addInitScript((s) => { localStorage.setItem('skystop.onboarded.v2', '1'); localStorage.setItem('sb-sgwbtgwccskqamzttczz-auth-token', s) }, JSON.stringify(fake.sessionFor(uid)));
    await other.route('**://*.supabase.co/**', fake.handler);
    const O = await other.newPage(); await O.goto(BASE);
    await O.getByRole('region', { name: 'My flights' }).waitFor();
    check('account: on another device the same flights appear with their routes (from the database)', await O.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).isVisible() && (await O.getByRole('button', { name: /^Show flight / }).count()) === 1);
    await other.close();
    await G.getByRole('button', { name: 'Log out' }).click();
    await G.getByRole('button', { name: 'Create account' }).waitFor();
    check('profile: after signing out it is an empty guest profile (no name, photo or previous travel details)', await visible(G, 'Guest') && (await G.getByLabel('Name').count()) === 0
      && (await G.getByRole('button', { name: /profile picture/ }).count()) === 0 && (await G.getByLabel('Passport nationality').inputValue()) === '');
    await G.getByRole('button', { name: 'Home' }).click();
    check('account: after signing out this browser shows no flights', (await G.getByRole('heading', { name: 'My flights' }).count()) === 0 && (await G.getByLabel('Upcoming trip').count()) === 0);
    await G.getByRole('button', { name: 'Profile' }).click();
    await G.getByRole('button', { name: 'Sign in' }).click();
    await G.getByLabel('Email').fill('traveller@example.com');
    await G.getByRole('button', { name: 'Send sign-in link' }).click();
    await G.getByText('Check your email').waitFor();
    check('account: sign in sends a sign-in link', fake.emails.some((m) => m.kind === 'signin' && m.to === 'traveller@example.com'));
    await g.ctx.close();
  }
  // Manual flight with origin and destination
  {
    const mf = await newGuest(); const M = mf.page;
    await M.goto(BASE);
    await M.getByRole('button', { name: /^Add flight/ }).click();
    await M.getByRole('button', { name: "I can't find my flight" }).click();
    await pick(M, 'Flying from (optional)', 'OPO'); await pick(M, 'Final destination (optional)', 'JFK');
    await M.getByRole('button', { name: 'Lisbon LIS' }).click();
    await setTimes(M);
    await M.getByRole('button', { name: 'Explore activities' }).click();
    await M.getByRole('button', { name: 'Add ANA Lounge' }).click();
    await M.getByRole('button', { name: 'Build itinerary (1)' }).click();
    await M.getByRole('button', { name: 'Save plan' }).click();
    await M.getByRole('region', { name: 'Journey OPO to JFK via LIS' }).waitFor();
    check('manual flight: entered origin and destination appear on the card with LIS connection times', (await M.getByRole('region', { name: 'Journey OPO to JFK via LIS' }).innerText()).includes('10:00'));
    await mf.ctx.close();
  }

  // ---- 5. Illustrative flight comparison still works
  const b = await newGuest();
  await b.page.goto(BASE);
  await b.page.getByRole('button', { name: /^Compare flights/ }).click();
  await b.page.getByLabel('Flying from').selectOption('CGK'); await b.page.getByLabel('Flying to').selectOption('CDG');
  await b.page.getByRole('button', { name: 'Compare connections' }).click();
  await b.page.getByText('Choose your connection').waitFor();
  check('illustrative flight comparison preserved', (await b.page.getByText(/^\$[0-9]/).count()) >= 3);
  await b.ctx.close();

  // ---- 6. Catalogue failure -> error state with retry
  {
    const one = await newGuest();
    fake.failNext['rest/v1/airports'] = 1;
    await one.page.goto(BASE);
    await one.page.getByRole('button', { name: /^Add flight/ }).first().waitFor();
    check('catalogue: a single failed request is retried automatically (no error, no stuck loading screen)', !(await visible(one.page, 'We could not load the airports')));
    await one.ctx.close();
  }
  const c = await newGuest();
  fake.failNext['rest/v1/airports'] = 2;
  await c.page.goto(BASE);
  await c.page.getByText('We could not load the airports').waitFor();
  check('catalogue error state shown', true);
  await c.page.getByRole('button', { name: 'Try again' }).click();
  await c.page.getByRole('button', { name: /^Add flight/ }).first().waitFor();
  check('retry recovers', true);
  await c.ctx.close();
} catch (e) {
  failed++; console.log('CRASH', e.message.split('\n').slice(0, 6).join('\n'));
} finally {
  await browser.close(); stop();
}
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? ` (${failed} failed)` : ''}`);
process.exit(failed ? 1 : 0);
