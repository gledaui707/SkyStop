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
// Returning visitors (onboarding already seen) unless `firstVisit` is set.
const newGuest = async (viewport, { firstVisit = false, reducedMotion } = {}) => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], ...(viewport ? { viewport } : {}), ...(reducedMotion ? { reducedMotion } : {}) });
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
  await page.getByRole('button', { name: /Plan a layover/ }).first().waitFor();
  check('returning visitor lands on Home with "Plan a layover"', !(await visible(page, 'Your layover, reimagined.')));
  check('no guest account created just by opening the app', !fake.calls.some((c) => c.includes('/auth/v1/signup')));
  await page.getByRole('button', { name: /Plan a layover/ }).first().click();
  await page.getByRole('heading', { name: 'Find your journey' }).waitFor();
  check('"Plan a layover" opens booking-reference entry first', await page.getByLabel('Booking reference').isVisible() && await page.getByRole('button', { name: 'Enter flight details manually' }).isVisible());
  await page.getByRole('button', { name: 'Enter flight details manually' }).click();
  check('setup is one screen with no numbered steps or tips', !(await visible(page, 'Step 1 of')) && !(await visible(page, 'Tip 1 of')));
  check('connecting airport, arrival, departure and buffer are the primary inputs', await page.getByLabel('Connecting airport', { exact: true }).isVisible() && await page.getByLabel('Arrival at the connecting airport (local time)').isVisible() && await page.getByRole('button', { name: '2h' }).isVisible());
  check('manual setup omits journey details', await page.getByText('Journey details', { exact: false }).count() === 0);
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
  const stored = [...fake.plans.values()][0];
  check('stored UTC instants are Lisbon-local 10:00/15:00', stored.row.arrival_at === `${day(7)}T10:00:00Z` && stored.row.departure_at === `${day(7)}T15:00:00Z`, `${stored.row.arrival_at} → ${stored.row.departure_at}`);
  check('stored buffer 90 and 2 ordered activities', stored.row.buffer_minutes === 90 && stored.items.length === 2 && stored.items[0].activity_id.endsWith('1'));
  const ticket = await page.getByLabel('Upcoming trip').innerText();
  check('home ticket: LIS, 2 activities', ticket.includes('LIS') && ticket.includes('2 activities saved'));
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
  const k = await newGuest();
  await k.page.goto(BASE);
  await k.page.getByRole('button', { name: /Plan a layover/ }).first().click();
  await k.page.getByLabel('Booking reference').fill('zz9zz9');
  await k.page.getByRole('button', { name: 'Find my journey' }).click();
  const unk = await k.page.getByRole('alert').allInnerTexts();
  check('booking: unknown reference -> clear error, no journey shown', unk.some((t) => t.includes("find a sample journey with reference ZZ9ZZ9")) && (await k.page.getByRole('heading', { name: 'Your journey', exact: true }).count()) === 0, JSON.stringify(unk));
  await k.page.getByLabel('Booking reference').fill('AB1');
  await k.page.getByRole('button', { name: 'Find my journey' }).click();
  check('booking: malformed reference -> format hint', (await k.page.getByRole('alert').innerText()).includes('6 letters or numbers'));
  check('booking: reference entry is labeled as sample data', await visible(k.page, 'Enter a sample booking reference'));
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
  const kbar = await barText(k.page);
  check('booking: builder uses the journey (SIN layover, CGK to CDG)', (await k.page.locator('main header').innerText()).includes('CGK to CDG') && kbar.includes('left'), kbar);
  const before = fake.plans.size;
  await k.page.getByRole('button', { name: 'Save plan' }).click();
  await k.page.getByLabel('Upcoming trip').waitFor();
  const kp = [...fake.plans.values()].find((p) => p.row.airport_id === 'SIN');
  check('booking: saved through the same save_plan path; SIN 11:15 local stored as 03:15Z', fake.plans.size === before + 1 && !!kp && kp.row.arrival_at.endsWith('T03:15:00Z') && kp.row.buffer_minutes === 120, kp?.row.arrival_at);
  await k.ctx.close();

  // ---- 2. Explore-first: select activities before any times; they and the airport carry into setup
  const e = await newGuest();
  await e.page.goto(BASE);
  await e.page.getByRole('heading', { name: /next stop/ }).waitFor();
  check('new guest: home shows "Plan a layover" and no upcoming trip', await visible(e.page, 'Plan a layover') && (await e.page.getByLabel('Upcoming trip').count()) === 0);
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
  await e.page.getByRole('button', { name: 'Home' }).click();
  await e.page.getByRole('button', { name: 'My Plans' }).click();
  check('explore-first: nothing saved without pressing Save', await e.page.getByText('No saved plans yet').isVisible());
  await e.ctx.close();

  // ---- 3. Itinerary-first: "Use this itinerary" before times; its name is kept through setup
  const d = await newGuest();
  await d.page.goto(BASE);
  await d.page.getByRole('button', { name: 'Airports', exact: true }).click();
  await d.page.getByRole('button', { name: /Lisbon Airport/ }).first().click();
  await d.page.getByRole('button', { name: 'Use this itinerary' }).click();
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

  // ---- 4b. Onboarding: first visit only, three screens, Next/Back/swipe/keys, Skip, replay, reduced motion
  const signupsBefore = fake.calls.filter((c) => c.includes('/auth/v1/signup')).length;
  const o = await newGuest(undefined, { firstVisit: true });
  await o.page.goto(BASE);
  await o.page.getByText('Your layover, reimagined.').waitFor();
  check('onboarding: first visit shows screen 1 with Skip and 3 progress dots', await o.page.getByRole('button', { name: 'Skip' }).isVisible() && (await o.page.getByRole('tab', { name: /Screen \d of 3/ }).count()) === 3);
  check('onboarding: no account is created by viewing it', fake.calls.filter((c) => c.includes('/auth/v1/signup')).length === signupsBefore);
  await o.page.getByRole('button', { name: 'Next' }).click();
  check('onboarding: Next -> screen 2', await o.page.getByText('Discover what’s possible.').isVisible());
  const box = (await o.page.locator('[aria-roledescription="carousel"]').boundingBox());
  await o.page.mouse.move(box.width * 0.8, box.height * 0.45); await o.page.mouse.down(); await o.page.mouse.move(box.width * 0.2, box.height * 0.47, { steps: 8 }); await o.page.mouse.up();
  await o.page.getByText('Make every minute count.').waitFor();
  check('onboarding: swipe left -> screen 3 with "Plan a layover" and no Skip', await o.page.getByRole('button', { name: /Plan a layover/ }).isVisible() && !(await o.page.getByRole('button', { name: 'Skip' }).isVisible()));
  await o.page.getByRole('button', { name: 'Back' }).click();
  check('onboarding: Back -> screen 2', await o.page.getByText('Discover what’s possible.').isVisible());
  await o.page.keyboard.press('ArrowLeft');
  check('onboarding: keyboard ArrowLeft -> screen 1', await o.page.getByText('Your layover, reimagined.').isVisible());
  await o.page.getByRole('button', { name: 'Skip' }).click();
  await o.page.waitForTimeout(400);
  check('onboarding: Skip opens the planning flow', (await o.page.getByRole('heading', { level: 1 }).first().innerText()).includes('Plan a layover') || await visible(o.page, 'Find your journey'));
  await o.page.reload();
  await o.page.waitForTimeout(800);
  check('onboarding: returning visitor is not shown it again', !(await visible(o.page, 'Your layover, reimagined.')));
  await o.page.getByRole('button', { name: 'How SkyStop works' }).click();
  await o.page.getByText('Your layover, reimagined.').waitFor();
  for (let k = 0; k < 2; k++) await o.page.getByRole('button', { name: 'Next' }).click();
  await o.page.getByRole('button', { name: /Plan a layover/ }).click();
  await o.page.waitForTimeout(400);
  check('onboarding: replay from Home works and its final CTA opens the planning flow', (await o.page.getByRole('heading', { level: 1 }).first().innerText()).includes('Plan a layover') || await visible(o.page, 'Find your journey'));
  await o.ctx.close();
  const rm = await newGuest(undefined, { firstVisit: true, reducedMotion: 'reduce' });
  await rm.page.goto(BASE); await rm.page.getByText('Your layover, reimagined.').waitFor();
  const dur = await rm.page.evaluate(() => getComputedStyle(document.querySelector('[aria-roledescription="carousel"] .flex')).transitionDuration);
  check('onboarding: reduced motion removes the slide transition', parseFloat(dur) < 0.01, dur);
  await rm.ctx.close();

  // ---- 4c. Changi constraint-aware itinerary (scenarios A–F)
  {
    const c = await newGuest();
    const P = c.page;
    const hero = async () => (await P.getByLabel('Time budget').innerText()).replace(/\s+/g, ' ');
    const itin = async () => (await P.getByLabel('Itinerary').innerText()).replace(/\s+/g, ' ');
    await P.goto(BASE);
    await P.getByRole('button', { name: /Plan a layover/ }).first().click();
    await P.getByLabel('Booking reference').fill('AXR7KD');
    await P.getByRole('button', { name: 'Find my journey' }).click();
    await P.getByRole('button', { name: 'Explore Singapore' }).click();
    await P.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
    await P.getByRole('button', { name: 'Add Butterfly Garden' }).click();
    await P.getByRole('button', { name: "Add Harry's" }).click();
    await P.getByRole('button', { name: 'Build itinerary (2)' }).click();
    await P.getByLabel('Time budget').waitFor();
    // D (terminals unknown): transfers cannot be estimated, so feasibility is not claimed
    check('D: terminals not set -> "Cannot verify feasibility" and the transfer asks for a terminal', (await hero()).includes('Cannot verify feasibility') && (await itin()).includes('choose your terminal to estimate'));
    await P.getByRole('button', { name: 'Arriving at Terminal 3 transit area' }).click();
    await P.getByRole('button', { name: 'Departing from Terminal 3 transit area' }).click();
    // A: two airside activities in T3: 620 usable − 70 activities − 3 × 10 (within-area planning estimates) = 520 = 8h 40m
    const ha = await hero();
    check('A: airside-only plan fits; remaining = 10h 20m − 1h 10m activities − 30m transfers = 8h 40m', ha.includes('Fits within estimated time budget') && ha.includes('8h 40m') && ha.includes('30m transfers') && (await visible(P, 'Stays in the transit area')), ha.slice(0, 160));
    check('A: each transfer is shown and labelled as a planning estimate', (await P.getByText('Estimated transfer: 2–10m').count()) === 2 && (await P.getByText('Return transfer: 2–10m').count()) === 1 && await visible(P, 'Planning estimate, not airport data'));
    await shot(P, '07-changi-airside');
    // E: reorder and remove update everything at once
    await P.getByRole('button', { name: 'Reorder' }).click();
    await P.getByRole('button', { name: "Move Harry's earlier" }).click();
    await P.getByRole('button', { name: 'Done' }).click();
    check('E: reorder keeps the new order (Harry\'s first)', (await itin()).indexOf("Harry's") < (await itin()).indexOf('Butterfly Garden'));
    // B: add Jewel (landside)
    await P.getByRole('button', { name: 'Add activities' }).click();
    await P.getByRole('button', { name: 'Add Jewel Rain Vortex' }).click();
    await P.getByRole('button', { name: 'Build itinerary (3)' }).click();
    await P.getByLabel('Entry check').waitFor();
    const hb = await hero(), entry = (await P.getByLabel('Entry check').innerText()).replace(/\s+/g, ' ');
    check('B: Jewel triggers "Entry verification required" with the zone transition explained', entry.includes('Entry verification required') && entry.includes('Jewel Rain Vortex is outside the transit area') && entry.includes('arrival immigration'));
    check('B: immigration and re-entry steps shown on the transfers, time not included', await visible(P, 'Immigration required · time not included') && await visible(P, 'Check-in, departure immigration and security · time not included'));
    check('B: feasibility is not claimed while immigration time is unknown', hb.includes('Cannot verify feasibility') && hb.includes('Immigration and re-entry checks are not included'));
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
    const sp = [...fake.plans.values()].find((x) => x.row.airport_id === 'SIN' && x.items.length === 2);
    check('F: saved with the chosen order (Harry\'s, then Butterfly Garden)', !!sp && sp.items[0].activity_id.endsWith('08') && sp.items[1].activity_id.endsWith('04'));
    await P.reload();
    await P.getByRole('button', { name: 'View layover' }).click();
    await P.getByRole('button', { name: 'Edit plan' }).click();
    await P.getByLabel('Time budget').waitFor();
    check('F: reopened plan keeps its terminals and the same estimate', (await P.getByRole('button', { name: 'Arriving at Terminal 3 transit area' }).getAttribute('aria-pressed')) === 'true' && (await hero()).includes('8h 40m'));
    await P.getByRole('button', { name: 'Departing from Terminal 1 transit area' }).click();
    const hf = await hero();
    check('F: changing the departure terminal adds the Skytrain transfer (official 5–10 min)', hf.includes('8h 40m') && await visible(P, 'Range published by the airport'), hf.slice(0, 120));
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

  // ---- 5. Illustrative flight comparison still works
  const b = await newGuest();
  await b.page.goto(BASE);
  await b.page.getByRole('button', { name: /Plan ahead/ }).click();
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
  await c.page.getByRole('button', { name: /Plan a layover/ }).first().waitFor();
  check('retry recovers', true);
  await c.ctx.close();
} catch (e) {
  failed++; console.log('CRASH', e.message.split('\n').slice(0, 6).join('\n'));
} finally {
  await browser.close(); stop();
}
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? ` (${failed} failed)` : ''}`);
process.exit(failed ? 1 : 0);
