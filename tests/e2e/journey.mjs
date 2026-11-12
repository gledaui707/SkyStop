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
const pick = async (page, label, text) => { await page.getByLabel(label, { exact: true }).fill(text); await page.getByRole('option').first().getByRole('button').click(); };

const setTimes = async (page) => {
  await page.getByLabel('Arrival at the connecting airport (local time)').fill(`${day(7)}T10:00`);
  await page.getByLabel('Onward departure (local time)').fill(`${day(7)}T15:00`);
  await page.getByRole('button', { name: '1h 30m' }).click();
};
// Plan a layover by hand (the only way to start): optional route, connecting airport chip, local times, buffer.
const planLayover = async (page, { code, city, arr, dep, buffer = '1h 30m', from, to }) => {
  await page.getByRole('button', { name: 'Plan a layover' }).first().click();
  if (from) await pick(page, 'Flying from (optional)', from);
  if (to) await pick(page, 'Final destination (optional)', to);
  await page.getByRole('button', { name: `${city} ${code}` }).click();
  await page.getByLabel('Arrival at the connecting airport (local time)').fill(arr);
  await page.getByLabel('Onward departure (local time)').fill(dep);
  await page.getByRole('button', { name: buffer, exact: true }).click();
};
const clearsNav = async (page, locator) => {
  await locator.evaluate((e) => { if (!e.closest('.fixed')) e.scrollIntoView({ block: 'center' }) });
  const a = await locator.boundingBox(), n = await page.getByRole('navigation', { name: 'Primary' }).boundingBox();
  return a.y + a.height <= n.y + 0.5;
};
const bar = (page) => page.locator('div.fixed.bottom-\\[var\\(--nav-h\\)\\]').last();
// Text of the save bar with the screen-reader words included, e.g. '1h 50m left · unsaved'.
const barText = async (page) => (await bar(page).textContent()).replace(/\s+/g, ' ')

try {
  // ---- 1. Main guest flow: Home -> Plan a layover -> times -> usable time -> explore (List/Map) -> review -> save -> reopen -> edit
  const { ctx, page } = await newGuest();
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Plan a layover' }).first().waitFor();
  check('Home leads with "Find out what fits between your flights" and Plan a layover; Explore airports is secondary', await visible(page, 'Find out what fits between your flights')
    && (await page.getByRole('button', { name: 'Plan a layover' }).first().getAttribute('class')).includes('btn-coral') && !(await page.getByRole('button', { name: 'Explore airports' }).first().getAttribute('class')).includes('btn-coral'));
  check('Home has no booking lookup or flight comparison', (await page.getByRole('button', { name: /Add flight|Compare flights/ }).count()) === 0 && !(await visible(page, 'Booking reference')));
  check('no guest account created just by opening the app', !fake.calls.some((c) => c.includes('/auth/v1/signup')));
  await page.getByRole('button', { name: 'Plan a layover' }).first().click();
  check('Plan a layover opens manual entry directly (no booking step)', (await page.getByLabel('Booking reference').count()) === 0 && await page.getByLabel('Connecting airport', { exact: true }).isVisible());
  check('setup is one screen with no numbered steps or tips', !(await visible(page, 'Step 1 of')) && !(await visible(page, 'Tip 1 of')));
  check('connecting airport, arrival, departure and buffer are the primary inputs', await page.getByLabel('Connecting airport', { exact: true }).isVisible() && await page.getByLabel('Arrival at the connecting airport (local time)').isVisible() && await page.getByRole('button', { name: '2h' }).isVisible());
  {
    const order = await page.evaluate(() => ['Connecting airport', 'Flying from (optional)'].map((l) => [...document.querySelectorAll('label, input')].findIndex((e) => (e.getAttribute('aria-label') || e.textContent || '').trim().startsWith(l))));
    const y = async (l) => (await page.getByLabel(l, { exact: true }).boundingBox()).y;
    check('manual setup: origin and destination are optional and come after the connection', await page.getByLabel('Flying from (optional)').isVisible() && await page.getByLabel('Final destination (optional)').isVisible()
      && (await y('Connecting airport')) < (await y('Flying from (optional)')), JSON.stringify(order));
  }
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
  check('time breakdown: 5h total, 1h 30m buffer, 3h 30m estimated usable time', breakdown.includes('5h') && breakdown.includes('Estimated usable time') && breakdown.includes('3h 30m'), breakdown);
  check('setup: primary action clears the bottom navigation', await clearsNav(page, page.getByRole('button', { name: 'Explore activities' })));
  await shot(page, '01-plan-a-layover');
  await page.getByRole('button', { name: 'Explore activities' }).click();

  await page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
  check('airport discovery opens in List view', (await page.getByRole('tab', { name: 'list' }).getAttribute('aria-selected')) === 'true');
  {
    const est = (await page.getByLabel('Estimated usable time').innerText()).replace(/\s+/g, ' ');
    const estY = (await page.getByLabel('Estimated usable time').boundingBox()).y, actY = (await page.getByRole('heading', { name: 'Activities' }).boundingBox()).y;
    check('discovery: estimated usable time is shown above the activities', est.includes('3h 30m') && estY < actY, est);
  }
  check('discovery: itineraries compare activity time only; no definitive "Fits" label', await visible(page, 'Activities take 1h 40m of your 3h 30m usable time') && (await page.getByText(/\bFits\b/).count()) === 0);
  check('discovery: activities show their duration and what still needs checking', await visible(page, 'Transfer time unavailable'));
  await page.getByRole('button', { name: 'Add O Mercado food court' }).click();
  await page.getByRole('button', { name: 'Add ANA Lounge' }).click();
  await page.getByRole('button', { name: 'Add Lisboa Duty Free' }).click();
  await page.getByRole('button', { name: 'Remove Lisboa Duty Free' }).click();
  await shot(page, '02-airport-list');
  // List <-> Map keeps the plan
  await page.getByRole('tab', { name: 'map' }).click();
  await page.getByRole('button', { name: /^Terminal 1: / }).waitFor();
  check('map: real-map view shows the Terminal 1 pin with the 2 selected activities and their time', /6 of 6 venues, 2 in your itinerary/.test(await page.getByRole('button', { name: /^Terminal 1: / }).getAttribute('aria-label')) && await visible(page, '2 selected') && await visible(page, '1h 40m of activities') && await visible(page, 'OpenStreetMap'));
  await page.getByRole('button', { name: /^Terminal 1: / }).click();
  check('map: tapping a terminal lists its venues', await visible(page, 'Terminal 1 · Lisbon') && await page.getByRole('button', { name: /ANA Lounge/ }).first().isVisible());
  check('map: venues are not given invented indoor positions (terminal pins only)', (await page.getByRole('button', { name: /approximate location/ }).count()) === 0);
  await shot(page, '03-airport-map');
  await page.getByRole('tab', { name: 'list' }).click();
  check('back in list: selection unchanged', (await page.getByRole('button', { name: 'Remove ANA Lounge' }).getAttribute('aria-pressed')) === 'true' && await page.getByRole('button', { name: 'Review plan (2)' }).isVisible());
  await page.getByRole('button', { name: 'Review plan (2)' }).click();

  const hero = page.getByLabel('Time budget');
  check('builder: remaining time 3h 30m - 1h 40m = 1h 50m', (await hero.innerText()).includes('1h 50m'));
  check('builder: save bar shows the time left', (await barText(page)).includes('1h 50m left'));
  check('builder: activities show usage, not clock times from landing', await visible(page, '1h 40m of 3h 30m used') && !(await visible(page, '10:00 – 10:40')));
  check('builder: planning buffer explained', await visible(page, 'kept free for airport procedures'));
  {
    const h = (await hero.innerText()).replace(/\s+/g, ' ');
    check('builder: activity time, transfer time and access are separate; missing transfers stay visible', h.includes('Activities 1h 40m') && h.includes('Transfers Unavailable') && await visible(page, 'Transfer time unavailable') && (await page.getByText(/^(Stays in the transit area|Check airport entry requirements|Access conditions unknown)$/).count()) === 1, h.slice(0, 200));
  }
  check('builder: "Save layover plan" is the primary save action and clears the tabs', await clearsNav(page, page.getByRole('button', { name: 'Save layover plan' })));
  await shot(page, '04-builder');
  check('nothing saved before pressing Save', fake.plans.size === 0);

  fake.failNext['rpc/save_plan'] = 1;
  await page.getByRole('button', { name: 'Save layover plan' }).click();
  await page.getByText('Plan not saved').waitFor();
  check('failed save: error shown, no "Saved", draft kept', !(await barText(page)).includes('Saved') && await visible(page, 'ANA Lounge') && fake.plans.size === 0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByLabel('Upcoming trip').waitFor();
  check('saved once; home confirms the save explicitly', fake.plans.size === 1 && (await page.getByRole('status').innerText()).includes('is saved to My Plans'));
  check('Home with an upcoming plan: View layover is the primary action; Plan a layover and Explore airports are secondary', (await page.getByRole('button', { name: 'View layover' }).getAttribute('class')).includes('btn-coral')
    && !(await page.getByRole('button', { name: 'Plan a layover' }).getAttribute('class')).includes('btn-coral') && await page.getByRole('button', { name: 'Explore airports' }).isVisible());
  check('390px Home: View layover clears the tabs', await clearsNav(page, page.getByRole('button', { name: 'View layover' })));
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
  await page.getByRole('button', { name: /Lisbon layover/ }).click();
  await page.getByRole('heading', { name: 'Activities (1)' }).waitFor();
  check('My Plans reopens the plan for editing', await page.getByRole('button', { name: 'Edit plan' }).isVisible());
  await ctx.close();

  // ---- 1b. First-time guest at 320 px: lands on Home (no intro or account screen), plans a Changi layover with a route, saves
  const k = await newGuest({ width: 320, height: 568 }, { firstVisit: true });
  await k.page.goto(BASE);
  await k.page.getByRole('button', { name: 'Plan a layover' }).first().waitFor();
  check('320px first launch: Home with Plan a layover, no introduction and no account screen', !(await visible(k.page, 'Your layover, reimagined.')) && (await k.page.getByRole('button', { name: 'Create account' }).count()) === 0);
  check('320px Home: Plan a layover clears the tabs; no sideways scroll', await clearsNav(k.page, k.page.getByRole('button', { name: 'Plan a layover' }).first()) && await k.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await planLayover(k.page, { code: 'SIN', city: 'Singapore', arr: `${day(5)}T11:15`, dep: `${day(5)}T23:35`, buffer: '2h', from: 'CGK', to: 'CDG' });
  check('320px setup: 12h 20m layover, 10h 20m estimated usable; action clears the tabs', (await k.page.getByLabel('Layover time breakdown').innerText()).includes('10h 20m') && await clearsNav(k.page, k.page.getByRole('button', { name: 'Explore activities' })));
  await k.page.getByRole('button', { name: 'Explore activities' }).click();
  await k.page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
  check('320px discovery: usable time shown; primary action clears the tabs', (await k.page.getByLabel('Estimated usable time').innerText()).includes('10h 20m') && await clearsNav(k.page, k.page.getByRole('button', { name: /^Review plan/ })));
  await k.page.getByRole('button', { name: 'Add Butterfly Garden' }).click();
  await k.page.getByRole('tab', { name: 'map' }).click();
  await k.page.getByRole('tab', { name: 'list' }).click();
  check('320px: selection kept across Map and List', (await k.page.getByRole('button', { name: 'Remove Butterfly Garden' }).getAttribute('aria-pressed')) === 'true');
  await k.page.getByRole('button', { name: 'Review plan (1)' }).click();
  await k.page.getByLabel('Time budget').waitFor();
  check('320px builder: route in the header; unknown terminals keep the transfer visible as unavailable', (await k.page.locator('main header').innerText()).includes('CGK to CDG') && await visible(k.page, 'choose your terminal to estimate') && (await k.page.getByLabel('Time budget').innerText()).includes('Timing not confirmed'));
  check('320px builder: Save layover plan clears the tabs', await clearsNav(k.page, k.page.getByRole('button', { name: 'Save layover plan' })));
  const before = fake.plans.size;
  await k.page.getByRole('button', { name: 'Save layover plan' }).click();
  await k.page.getByLabel('Upcoming trip').waitFor();
  const journey = (await k.page.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).innerText()).replace(/\s+/g, ' ');
  check('Home card: CGK and CDG at the ends, SIN connection times beneath', /Jakarta.*Paris.*CGK.*CDG.*11:15.*23:35.*Arrive SIN.*Depart SIN/.test(journey), journey);
  check('320px Home card has no horizontal overflow and View layover clears the tabs', await k.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth) && await clearsNav(k.page, k.page.getByRole('button', { name: 'View layover' })));
  const kp = [...fake.plans.values()].find((p) => p.row.airport_id === 'SIN');
  check('saved through save_plan; SIN 11:15 local stored as 03:15Z with a 2h buffer', fake.plans.size === before + 1 && !!kp && kp.row.arrival_at.endsWith('T03:15:00Z') && kp.row.buffer_minutes === 120, kp?.row.arrival_at);
  await k.page.getByRole('button', { name: 'View layover' }).click();
  await k.page.getByRole('button', { name: 'Edit plan' }).click();
  check('reopened plan keeps its selection', await visible(k.page, 'Butterfly Garden'));
  await k.ctx.close();

  // ---- 2. Explore-first: select activities before any times; they and the airport carry into setup
  const e = await newGuest();
  await e.page.goto(BASE);
  await e.page.getByRole('button', { name: 'Notifications' }).waitFor();
  check('new guest: Home shows no fabricated plan, with Plan a layover and Explore airports', (await e.page.getByLabel('Upcoming trip').count()) === 0
    && await e.page.getByRole('button', { name: 'Plan a layover' }).isVisible() && await e.page.getByRole('button', { name: 'Explore airports' }).isVisible());
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
    for (const n of ['Fnac', 'O Mercado food court']) await v.page.getByRole('button', { name: `Remove ${n}` }).click();
    check(`builder ${w}px: Save layover plan fits on one line and clears the tabs`, await clearsNav(v.page, v.page.getByRole('button', { name: 'Save layover plan' }))
      && await v.page.getByRole('button', { name: 'Save layover plan' }).evaluate((b) => b.scrollWidth <= b.clientWidth + 1 && b.getClientRects().length === 1));
    await v.ctx.close();
  }

  // ---- 4b. Onboarding: first visit only, three screens, Next/Back/swipe/keys, Skip, replay, reduced motion
  const signupsBefore = fake.calls.filter((c) => c.includes('/auth/v1/signup')).length;
  const o = await newGuest(undefined, { firstVisit: true });
  await o.page.goto(BASE);
  await o.page.getByRole('button', { name: 'Plan a layover' }).first().waitFor();
  check('onboarding: optional on first launch (Home first, introduction one tap away)', !(await visible(o.page, 'Your layover, reimagined.')) && await o.page.getByRole('button', { name: 'How SkyStop works' }).isVisible());
  await o.page.getByRole('button', { name: 'How SkyStop works' }).click();
  await o.page.getByText('Your layover, reimagined.').waitFor();
  check('onboarding: first visit shows screen 1 with Skip and 3 progress dots', await o.page.getByRole('button', { name: 'Skip' }).isVisible() && (await o.page.getByRole('tab', { name: /Screen \d of 3/ }).count()) === 3);
  check('onboarding: no account is created by viewing it', fake.calls.filter((c) => c.includes('/auth/v1/signup')).length === signupsBefore);
  await o.page.getByRole('button', { name: 'Get started' }).click();
  check('onboarding: Get started -> screen 2', await o.page.getByText('Discover what’s possible.').isVisible());
  {
    // Transition: the card is one persistent element that morphs; text crossfades through a blur; nothing slides sideways.
    const card = () => o.page.evaluate(() => { const c = document.querySelector('[aria-roledescription="carousel"] .glass-dark.overflow-hidden'); const r = c.getBoundingClientRect(); return { w: Math.round(r.width), tagged: c.dataset.probe === '1' }; });
    await o.page.waitForTimeout(1200);
    const settled2 = await card();
    await o.page.evaluate(() => { document.querySelector('[aria-roledescription="carousel"] .glass-dark.overflow-hidden').dataset.probe = '1'; });
    await o.page.getByRole('tab', { name: 'Screen 1 of 3' }).click();
    await o.page.waitForTimeout(120);
    const mid = await o.page.evaluate(() => [...document.querySelectorAll('[aria-roledescription="carousel"] h1')].map((h) => ({ t: h.textContent, blur: parseFloat((/blur\(([\d.]+)px\)/.exec(getComputedStyle(h).filter) || [0, 0])[1]) })));
    const midCard = await card();
    await o.page.waitForTimeout(1200);
    const settled1 = await card();
    const h1s = await o.page.locator('[aria-roledescription="carousel"] h1').count();
    check('onboarding transition: old and new headlines overlap, the outgoing one blurred', mid.length === 2 && mid.some((h) => h.t.startsWith('Discover') && h.blur > 0), JSON.stringify(mid));
    check('onboarding transition: the same card element morphs between steps (compact tile <-> full card)', midCard.tagged && settled1.tagged && settled2.w < settled1.w && midCard.w > settled2.w && midCard.w < settled1.w, JSON.stringify({ settled2, midCard, settled1 }));
    check('onboarding transition: settles to a single headline', h1s === 1 && await o.page.getByText('Your layover, reimagined.').isVisible());
    check('onboarding transition: no horizontal photo strip', await o.page.evaluate(() => document.querySelectorAll('[aria-roledescription="carousel"] img').length === 1));
    await o.page.getByRole('button', { name: 'Get started' }).click();
  }
  const box = (await o.page.locator('[aria-roledescription="carousel"]').boundingBox());
  await o.page.mouse.move(box.width * 0.8, box.height * 0.45); await o.page.mouse.down(); await o.page.mouse.move(box.width * 0.2, box.height * 0.47, { steps: 8 }); await o.page.mouse.up();
  await o.page.getByText('Make every minute count.').waitFor();
  await o.page.getByRole('button', { name: 'Skip' }).waitFor({ state: 'detached' });
  check('onboarding: swipe left -> screen 3 with Get started + Sign in and no Skip', await o.page.getByRole('button', { name: 'Get started' }).isVisible() && await o.page.getByRole('button', { name: 'Sign in' }).isVisible() && !(await o.page.getByRole('button', { name: 'Skip' }).isVisible()));
  await o.page.getByRole('tab', { name: 'Screen 2 of 3' }).click();
  check('onboarding: progress dot -> back to screen 2', await o.page.getByText('Discover what’s possible.').isVisible());
  await o.page.keyboard.press('ArrowLeft');
  check('onboarding: keyboard ArrowLeft -> screen 1', await o.page.getByText('Your layover, reimagined.').isVisible());
  await o.page.getByRole('button', { name: 'Skip' }).click();
  await o.page.getByRole('button', { name: 'Plan a layover' }).first().waitFor();
  check('onboarding: Skip returns to Home without an account screen or a new account', (await o.page.getByRole('button', { name: 'Create account' }).count()) === 0 && fake.calls.filter((c) => c.includes('/auth/v1/signup')).length === signupsBefore);
  await o.page.reload();
  await o.page.waitForTimeout(800);
  check('onboarding: a returning guest goes straight to Home', !(await visible(o.page, 'Your layover, reimagined.')) && await o.page.getByRole('button', { name: 'Plan a layover' }).first().isVisible());
  await o.page.getByRole('button', { name: 'Profile' }).click();
  await o.page.getByRole('button', { name: 'Replay introduction' }).click();
  await o.page.getByText('Your layover, reimagined.').waitFor();
  for (let k = 0; k < 2; k++) { await o.page.getByRole('button', { name: 'Get started' }).click(); await o.page.waitForTimeout(250); }
  await o.page.getByRole('button', { name: 'Get started' }).click();
  await o.page.waitForTimeout(400);
  check('onboarding: replay works and its final Get started opens Plan a layover', await o.page.getByLabel('Connecting airport', { exact: true }).isVisible());
  await o.ctx.close();
  // Account Access is reached only by choice (Profile): the email field opens on the SS screen
  for (const [action, submit] of [['Create account', 'Send confirmation link'], ['Sign in', 'Send sign-in link']]) {
    const a = await newGuest();
    await a.page.goto(BASE); await a.page.getByRole('button', { name: 'Profile' }).click();
    await a.page.getByRole('button', { name: action }).click();
    await a.page.getByRole('button', { name: submit }).waitFor();
    check(`access: ${action} from Profile opens the email field on the SS screen`, await a.page.getByRole('textbox', { name: 'Email' }).isVisible() && (await a.page.getByRole('button', { name: 'Home' }).count()) === 0
      && await a.page.evaluate(() => getComputedStyle(document.querySelector('.access__stage')).pointerEvents === 'none' && /blur/.test(getComputedStyle(document.querySelector('.access__strip')).backdropFilter)));
    await a.ctx.close();
  }
  const rm = await newGuest(undefined, { firstVisit: true, reducedMotion: 'reduce' });
  await rm.page.goto(BASE); await rm.page.getByRole('button', { name: 'How SkyStop works' }).click(); await rm.page.getByText('Your layover, reimagined.').waitFor();
  await rm.page.getByRole('button', { name: 'Get started' }).click();
  await rm.page.waitForTimeout(60);
  const rmState = await rm.page.evaluate(() => [...document.querySelectorAll('[aria-roledescription="carousel"] h1')].map((h) => `${h.textContent}|${getComputedStyle(h).opacity}|${getComputedStyle(h).filter}`));
  check('onboarding: reduced motion changes steps instantly (no crossfade, blur or scaling)', rmState.length === 1 && rmState[0].startsWith('Discover') && /\|1\|(none|blur\(0px\))$/.test(rmState[0]), JSON.stringify(rmState));
  {
    // Sign in on every onboarding step opens the email sign-in form; Not now comes back; the account screen then resumes on launch.
    const si = await newGuest(undefined, { firstVisit: true });
    await si.page.goto(BASE); await si.page.getByRole('button', { name: 'How SkyStop works' }).click(); await si.page.getByText('Your layover, reimagined.').waitFor();
    const onEvery = [];
    for (let k = 0; k < 3; k++) {
      onEvery.push(await si.page.getByRole('button', { name: 'Get started' }).isVisible() && await si.page.getByRole('button', { name: 'Sign in' }).isVisible());
      if (k < 2) { await si.page.getByRole('button', { name: 'Get started' }).click(); await si.page.waitForTimeout(250); }
    }
    check('onboarding: Get started and Sign in on every step; SkyStop name beside the SS', onEvery.every(Boolean) && await si.page.locator('[aria-roledescription="carousel"]').getByText('SkyStop', { exact: true }).isVisible(), JSON.stringify(onEvery));
    await si.page.getByRole('tab', { name: 'Screen 1 of 3' }).click();
    await si.page.getByRole('button', { name: 'Sign in' }).click();
    await si.page.getByRole('button', { name: 'Send sign-in link' }).waitFor();
    check('onboarding: Sign in opens the email sign-in form', await si.page.getByLabel('Email').isVisible());
    await si.page.getByRole('button', { name: 'Not now' }).click();
    await si.page.getByText('Your layover, reimagined.').waitFor();
    check('onboarding: Not now returns to onboarding', await si.page.getByRole('button', { name: 'Get started' }).isVisible());
    await si.page.reload(); await si.page.waitForTimeout(800);
    check('onboarding: the next launch opens Home (no forced account screen)', await si.page.getByRole('button', { name: 'Plan a layover' }).first().isVisible() && (await si.page.getByRole('button', { name: 'Create account' }).count()) === 0);
    await si.ctx.close();
  }
  await rm.page.getByRole('button', { name: 'Skip' }).click(); await rm.page.getByRole('button', { name: 'Profile' }).click();
  await rm.page.getByRole('button', { name: 'Create account' }).click(); await rm.page.getByRole('button', { name: 'Send confirmation link' }).waitFor();
  check('access: reduced motion shows a still composition', await rm.page.evaluate(() => [...document.querySelectorAll('.access__orbit, .access__blob, .access__strip')].every((e) => getComputedStyle(e).animationName === 'none')));
  await rm.ctx.close();

  // ---- 4c. Changi constraint-aware itinerary (scenarios A–F)
  {
    const c = await newGuest();
    const P = c.page;
    const hero = async () => (await P.getByLabel('Time budget').innerText()).replace(/\s+/g, ' ');
    const itin = async () => (await P.getByLabel('Itinerary').innerText()).replace(/\s+/g, ' ');
    await P.goto(BASE);
    await planLayover(P, { code: 'SIN', city: 'Singapore', arr: `${day(5)}T11:15`, dep: `${day(5)}T23:35`, buffer: '2h' });
    await P.getByRole('button', { name: 'Explore activities' }).click();
    await P.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
    await P.getByRole('button', { name: 'Add Butterfly Garden' }).click();
    await P.getByRole('button', { name: "Add Harry's" }).click();
    await P.getByRole('button', { name: 'Review plan (2)' }).click();
    await P.getByLabel('Time budget').waitFor();
    // D (terminals unknown): transfers cannot be estimated, so feasibility is not claimed
    check('D: terminals not set -> "Timing not confirmed" and the transfer asks for a terminal', (await hero()).includes('Timing not confirmed') && (await itin()).includes('choose your terminal to estimate'));
    await P.getByRole('button', { name: 'Arriving at Terminal 3 transit area' }).click();
    await P.getByRole('button', { name: 'Departing from Terminal 3 transit area' }).click();
    // A: two airside activities in T3: 620 usable − 70 activities − 3 × 10 (within-area planning estimates) = 520 = 8h 40m
    const ha = await hero();
    check('A: airside-only plan fits; remaining = 10h 20m − 1h 10m activities − 30m transfers = 8h 40m', !ha.includes('Timing not confirmed') && !ha.includes('Exceeds') && ha.includes('8h 40m') && ha.includes('Transfers 30m') && (await visible(P, 'Stays in the transit area')), ha.slice(0, 160));
    check('A: each transfer is shown with its estimate', (await P.getByText('Estimated transfer: 2–10m').count()) === 2 && (await P.getByText('Return transfer: 2–10m').count()) === 1);
    await shot(P, '07-changi-airside');
    // E: reorder and remove update everything at once
    await P.getByRole('button', { name: 'Reorder' }).click();
    await P.getByRole('button', { name: "Move Harry's earlier" }).click();
    await P.getByRole('button', { name: 'Done' }).click();
    check('E: reorder keeps the new order (Harry\'s first)', (await itin()).indexOf("Harry's") < (await itin()).indexOf('Butterfly Garden'));
    // B: add Jewel (landside)
    await P.getByRole('button', { name: 'Add activities' }).click();
    await P.getByRole('button', { name: 'Add Jewel Rain Vortex' }).click();
    await P.getByRole('button', { name: 'Review plan (3)' }).click();
    await P.getByLabel('Entry check').waitFor();
    const hb = await hero(), entry = (await P.getByLabel('Entry check').innerText()).replace(/\s+/g, ' ');
    check('B: Jewel triggers "Check airport entry requirements" with the zone transition explained', entry.includes('Check airport entry requirements') && entry.includes('Jewel Rain Vortex is outside the transit area') && entry.includes('arrival immigration'));
    check('B: immigration and re-entry steps shown on the transfers, time not included', await visible(P, 'Immigration required · time not included') && await visible(P, 'Check-in, departure immigration and security · time not included'));
    check('B: feasibility is not claimed while immigration time is unknown', hb.includes('Timing not confirmed') && hb.includes('Immigration and re-entry checks are not included'));
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
    await P.getByRole('button', { name: 'Save layover plan' }).click();
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
    check('F: changing the departure terminal adds the Skytrain transfer (official 5–10 min)', hf.includes('8h 40m') && (await P.getByText('Return transfer: 5–10m').count()) >= 1, hf.slice(0, 120));
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
    for (const f of [{ code: 'DXB', city: 'Dubai', d: 9, from: 'CDG', to: 'HND' }, { code: 'SIN', city: 'Singapore', d: 3, from: 'CGK', to: 'CDG' }, { code: 'LHR', city: 'London', d: 5, from: 'JFK', to: 'SIN' }]) {
      await planLayover(G, { code: f.code, city: f.city, arr: `${day(f.d)}T10:00`, dep: `${day(f.d)}T16:00`, from: f.from, to: f.to });
      await G.getByRole('button', { name: 'Explore activities' }).click();
      await G.getByRole('button', { name: 'Review plan', exact: true }).click();
      await G.getByRole('button', { name: 'Save layover plan' }).click();
      await G.getByLabel('Upcoming trip').waitFor();
    }
    const mine = [...fake.plans.values()].slice(-3).filter((p) => fake.details.get(p.row.id)?.owner === p.row.owner_id);
    check('plans: three layover plans saved without activities, route details stored in the database', mine.length === 3 && mine.every((p) => p.items.length === 0)
      && mine.map((p) => fake.details.get(p.row.id).row).some((d) => d.origin_airport === 'CGK' && d.destination_airport === 'CDG'));
    check('stack: nearest upcoming layover (CGK → CDG via SIN) is in front', await G.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).isVisible());
    const strips = G.getByRole('button', { name: /^Show flight / });
    const stackBox = await G.getByRole('region', { name: 'Upcoming layovers' }).boundingBox();
    check('stack: the two other plans peek behind it, compactly', (await strips.count()) === 2 && stackBox.height < 560, `strips ${await strips.count()}, height ${Math.round(stackBox.height)}`);
    await G.getByRole('button', { name: /^Show flight JFK to SIN via LHR/ }).click();
    check('stack: tapping a card brings that layover to the front', await G.getByRole('region', { name: 'Journey JFK to SIN via LHR' }).isVisible() && (await G.getByRole('button', { name: /^Show flight CGK to CDG via SIN/ }).count()) === 1);
    await G.getByRole('button', { name: 'View layover' }).click();
    check('stack: View layover opens the selected plan (London)', await visible(G, 'London'));
    await G.getByRole('button', { name: 'Home' }).click();
    // details come back from the database, not just this browser
    await G.evaluate(() => localStorage.removeItem('skystop.planmeta.v1'));
    await G.reload(); await G.getByRole('region', { name: 'Upcoming layovers' }).waitFor();
    check('plans: routes are restored from the database after the browser copy is cleared', await G.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).isVisible());
    // See all → My Plans
    await G.getByRole('button', { name: /^See all \(/ }).click();
    await G.getByRole('heading', { name: 'My plans' }).waitFor();
    const listed = (await G.locator('main').innerText()).replace(/\s+/g, ' ');
    check('My Plans: every saved plan in date order, including plans without activities', /Singapore layover.*London layover.*Dubai layover/.test(listed) && (listed.match(/No activities yet/g) || []).length === 3, listed.slice(0, 200));
    await G.getByRole('button', { name: /Dubai layover/ }).click();
    await G.getByRole('button', { name: 'Remove plan' }).click();
    check('plan: removal asks first and says what goes with it', await visible(G, 'This plan has no activities.'));
    const n0 = fake.plans.size;
    await G.getByRole('button', { name: 'Remove plan' }).last().click();
    await G.getByRole('heading', { name: 'My plans' }).waitFor();
    check('plan: removed on the server, with its details', fake.plans.size === n0 - 1 && ![...fake.details.values()].some((d) => d.row.origin_airport === 'CDG' && d.row.destination_airport === 'HND'));
    // Profile: optional nationality, owner-only
    await G.getByRole('button', { name: 'Home' }).click();
    await G.getByRole('button', { name: 'Profile' }).click();
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
    const other = await browser.newContext({ ...devices['iPhone 13'] });
    await other.addInitScript((s) => { localStorage.setItem('skystop.onboarded.v2', '1'); localStorage.setItem('sb-sgwbtgwccskqamzttczz-auth-token', s) }, JSON.stringify(fake.sessionFor(uid)));
    await other.route('**://*.supabase.co/**', fake.handler);
    const O = await other.newPage(); await O.goto(BASE);
    await O.getByRole('region', { name: 'Upcoming layovers' }).waitFor();
    check('account: on another device the same plans appear with their routes (from the database)', await O.getByRole('region', { name: 'Journey CGK to CDG via SIN' }).isVisible() && (await O.getByRole('button', { name: /^Show flight / }).count()) === 1);
    await other.close();
    await G.getByRole('button', { name: 'Log out' }).click();
    await G.getByRole('button', { name: 'Create account' }).waitFor();
    check('profile: after signing out it is an empty guest profile (no name, photo or previous travel details)', await visible(G, 'Guest') && (await G.getByLabel('Name').count()) === 0
      && (await G.getByRole('button', { name: /profile picture/ }).count()) === 0 && (await G.getByLabel('Passport nationality').inputValue()) === '');
    await G.getByRole('button', { name: 'Home' }).click();
    check('account: after signing out this browser shows no plans', (await G.getByLabel('Upcoming trip').count()) === 0 && await G.getByRole('button', { name: 'Plan a layover' }).first().isVisible());
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
    await M.getByRole('button', { name: 'Plan a layover' }).first().click();
    await pick(M, 'Flying from (optional)', 'OPO'); await pick(M, 'Final destination (optional)', 'JFK');
    await M.getByRole('button', { name: 'Lisbon LIS' }).click();
    await setTimes(M);
    await M.getByRole('button', { name: 'Explore activities' }).click();
    await M.getByRole('button', { name: 'Add ANA Lounge' }).click();
    await M.getByRole('button', { name: 'Review plan (1)' }).click();
    await M.getByRole('button', { name: 'Save layover plan' }).click();
    await M.getByRole('region', { name: 'Journey OPO to JFK via LIS' }).waitFor();
    check('manual flight: entered origin and destination appear on the card with LIS connection times', (await M.getByRole('region', { name: 'Journey OPO to JFK via LIS' }).innerText()).includes('10:00'));
    await mf.ctx.close();
  }

  // ---- 5. No fixture-only interactions or demo wording in the public interface
  {
    const b = await newGuest();
    const texts = [];
    await b.page.goto(BASE); await b.page.getByRole('button', { name: 'Plan a layover' }).first().waitFor(); texts.push(await b.page.locator('body').innerText());
    for (const t of ['Airports', 'My Plans']) { await b.page.getByRole('button', { name: t, exact: true }).click(); await b.page.waitForTimeout(300); texts.push(await b.page.locator('body').innerText()); }
    await b.page.getByRole('button', { name: 'Home' }).click(); await b.page.getByRole('button', { name: 'Profile' }).click(); await b.page.waitForTimeout(300); texts.push(await b.page.locator('body').innerText());
    await b.page.getByRole('button', { name: 'Home' }).click(); await b.page.getByRole('button', { name: 'Plan a layover' }).first().click(); texts.push(await b.page.locator('body').innerText());
    const all = texts.join('\n');
    check('no booking lookup, flight comparison, sample or demo wording on the main screens', !/booking reference|compare flights|sample|demo|live flight|guaranteed/i.test(all), (all.match(/booking reference|compare flights|sample|demo|live flight|guaranteed/gi) || []).join(','));
    await b.ctx.close();
  }

  // ---- 6. Catalogue failure -> error state with retry
  const c = await newGuest();
  fake.failNext['rest/v1/airports'] = 1;
  await c.page.goto(BASE);
  await c.page.getByText('We could not load the airports').waitFor();
  check('catalogue error state shown', true);
  await c.page.getByRole('button', { name: 'Try again' }).click();
  await c.page.getByRole('button', { name: 'Plan a layover' }).first().waitFor();
  check('retry recovers', true);
  await c.ctx.close();
} catch (e) {
  failed++; console.log('CRASH', e.message.split('\n').slice(0, 6).join('\n'));
} finally {
  await browser.close(); stop();
}
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? ` (${failed} failed)` : ''}`);
process.exit(failed ? 1 : 0);
