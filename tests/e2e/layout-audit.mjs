// Responsive layout audit (simulated API, no network writes). Visits the main screens at 320/375/390/430 px and reports:
//  - elements that extend past the screen edges (outside intentional horizontal scrollers)
//  - page-level horizontal overflow
//  - content that cannot be scrolled clear of the fixed bottom bars
//  - screens whose first content sits under the sticky header at scroll 0
// Usage: npm run build && node tests/e2e/layout-audit.mjs   (SHOTS=dir to keep screenshots)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createFakeSupabase } from './fake-supabase.mjs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const PORT = 4183, BASE = `http://localhost:${PORT}`, SHOTS = process.env.SHOTS;
const WIDTHS = (process.env.WIDTHS || '320x568,375x667,390x844,430x932').split(',').map((s) => s.split('x').map(Number));
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch { /* ignore */ } });
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch { await new Promise((r) => setTimeout(r, 200)); } }

/** Runs in the page. */
function measure() {
  // clientWidth, not innerWidth: in mobile emulation innerWidth grows to fit overflowing content and would hide it
  const W = document.documentElement.clientWidth, H = window.innerHeight, out = [];
  // clipped if any ancestor that clips horizontally (scroller or overflow hidden) lies within the screen
  const clippedInBounds = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { const r = p.getBoundingClientRect(); if (r.right <= W + 1 && r.left >= -1) return true; } } return false; };
  const label = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}[${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}]`;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
    if (r.right > W + 1 || r.left < -1) {
      if (clippedInBounds(el)) continue; // inside an in-bounds horizontal scroller / clipping box
      if (el.closest('[data-allow-bleed]')) continue;
      out.push(`overflows screen: ${label(el)} (${Math.round(r.left)}..${Math.round(r.right)} of ${W})`);
    }
  }
  if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${W})`);
  // bottom clearance: at max scroll, the last in-flow content must end above the topmost fixed bottom bar
  window.scrollTo(0, document.documentElement.scrollHeight);
  const fixedBottoms = [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); return s.position === 'fixed' && e.getBoundingClientRect().bottom >= H - 2 && e.getBoundingClientRect().height < H * 0.6; })
    .flatMap((e) => [...e.querySelectorAll('*')].filter((c) => getComputedStyle(c).pointerEvents !== 'none' && c.getBoundingClientRect().height > 20).map((c) => c.getBoundingClientRect().top));
  const barTop = fixedBottoms.length ? Math.min(...fixedBottoms) : H;
  const content = [...document.querySelectorAll('main *')].filter((e) => { const s = getComputedStyle(e); return !e.closest('[class*="fixed"]') && s.position !== 'fixed' && e.children.length === 0 && e.getBoundingClientRect().height > 0 && (e.textContent || '').trim(); });
  const last = content.length ? Math.max(...content.map((e) => e.getBoundingClientRect().bottom)) : 0;
  if (last > barTop + 1) out.push(`content ends ${Math.round(last - barTop)}px under the fixed bottom bars`);
  window.scrollTo(0, 0);
  const header = document.querySelector('main header');
  if (header && getComputedStyle(header).position === 'sticky') {
    const hb = header.getBoundingClientRect().bottom;
    const first = [...document.querySelectorAll('main *')].find((e) => !header.contains(e) && e.children.length === 0 && (e.textContent || '').trim() && e.getBoundingClientRect().height > 0);
    if (first && first.getBoundingClientRect().top < hb - 1) out.push(`first content (${label(first)}) starts under the header`);
  }
  return out;
}

const fake = createFakeSupabase();
const browser = await chromium.launch();
let total = 0;
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: w, height: h } });
  await ctx.route('**://*.supabase.co/**', fake.handler); await ctx.route('**://images.unsplash.com/**', (r) => r.abort()); await ctx.route(/(basemaps\.cartocdn\.com|tile\.openstreetmap\.org)/, (r) => r.abort());
  const page = await ctx.newPage();
  const visit = async (name) => {
    await page.waitForTimeout(450);
    const issues = await page.evaluate(measure);
    total += issues.length;
    console.log(`${issues.length ? 'FAIL' : 'ok  '} ${w}px ${name}${issues.length ? '\n      - ' + [...new Set(issues)].slice(0, 8).join('\n      - ') : ''}`);
    if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${w}-${name}.png` }); }
  };
  const click = (role, name, opts = {}) => page.getByRole(role, { name, ...opts }).first().click();
  try {
    await page.goto(BASE); await page.waitForTimeout(800);
    await visit('welcome');
    await page.evaluate(() => { try { localStorage.setItem('skystop.welcomed.v1', '1'); localStorage.setItem('skystop.onboarded.v2', '1'); } catch {} });
    await page.goto(BASE); await page.waitForTimeout(800);
    await visit('home');
    await click('button', /^Add flight/); await page.getByRole('heading', { name: 'Find your journey' }).waitFor(); await visit('booking');
    await page.getByLabel('Booking reference').fill('ZZ9ZZ9');
    await click('button', 'Find my journey'); await visit('booking-samples');
    await click('button', /AXR7KD/); await page.getByRole('heading', { name: 'Your journey' }).waitFor(); await visit('journey-overview');
    await page.goto(BASE); await page.waitForTimeout(800);
    await click('button', 'Airports', { exact: true }); await visit('airports');
    await click('button', /Lisbon/); await page.getByRole('tab', { name: 'list' }).waitFor(); await visit('airport-list');
    await click('tab', 'map'); await visit('airport-map'); await click('tab', 'list');
    for (const n of await page.getByRole('button', { name: /^(Select|Add) / }).all().then((l) => l.slice(0, 2))) await n.click();
    await page.getByRole('button', { name: /Set layover times|Set my layover|Plan this layover/ }).first().click();
    await page.getByLabel(/Arrival/).first().fill(`${day(7)}T10:00`);
    await page.getByLabel(/departure/i).first().fill(`${day(7)}T15:00`);
    await visit('setup-manual');
    await page.getByRole('button', { name: /Build my itinerary|Explore activities|Continue/ }).last().click();
    await page.waitForTimeout(500);
    await visit('builder');
    await page.getByRole('button', { name: /Save plan|Save anyway/ }).click();
    await page.getByLabel('Upcoming trip').waitFor({ timeout: 8000 });
    await visit('home-with-trip');
    await click('button', /^See all/); await page.getByRole('heading', { name: 'My flights' }).waitFor(); await visit('my-flights');
    await click('button', 'Home', { exact: true }); await click('button', 'Profile'); await page.getByRole('heading', { name: 'Profile' }).waitFor(); await visit('profile');
    await click('button', 'Home', { exact: true });
    await click('button', 'My Plans'); await visit('plans');
    await page.getByRole('button', { name: /layover/ }).first().click(); await visit('plan-detail');
    // Changi builder with transfers, terminals and the entry-check panel (landside activity)
    await page.goto(BASE); await page.waitForTimeout(800);
    await click('button', /^Add flight/); await page.getByLabel('Booking reference').fill('AXR7KD');
    await click('button', 'Find my journey'); await click('button', 'Explore Singapore');
    await page.getByRole('heading', { name: 'Curated itineraries' }).waitFor();
    for (const n of ['Add Butterfly Garden', 'Add Jewel Rain Vortex']) await click('button', n);
    await click('button', 'Build itinerary (2)'); await page.getByLabel('Entry check').waitFor();
    await click('button', 'Arriving at Terminal 3 transit area'); await click('button', 'Departing from Terminal 3 transit area');
    await click('button', "I'm not sure");
    await visit('builder-changi-entry');
    // Home with a stack of three flights
    for (const ref of ['CJ8NWT', 'DH5PRZ']) {
      await page.goto(BASE); await page.waitForTimeout(600);
      await click('button', /^Add flight/); await page.getByLabel('Booking reference').fill(ref);
      await click('button', 'Find my journey'); await click('button', 'Save to My flights');
      await page.getByRole('heading', { name: /next stop/ }).waitFor();
    }
    await visit('home-flight-stack');
  } catch (e) { total++; console.log(`CRASH ${w}px: ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await browser.close(); server.kill();
console.log(`\n${total} layout issue(s)`);
process.exit(total ? 1 : 0);
