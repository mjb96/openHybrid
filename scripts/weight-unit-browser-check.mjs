// =============================================================================
// WEIGHT UNIT BROWSER CHECK — ST6 canonical kilograms
//
// Storage is kilograms; `settings.weightUnit` is display only. This drives the
// REAL surfaces and proves the two boundaries, not just the helper maths:
//
//   READ  — a stored 90.72 kg weigh-in reads as "200" in the sheet and on Home.
//   WRITE — typing 225 (lb) into the cockpit and ticking it stores 102.06 kg,
//           never 225, and the row keeps showing the typed display number.
//
// A regression here either rescales history by 2.2× or silently relabels it,
// which is exactly the class of bug ST6 exists to remove.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium } from './browser-runtime.mjs';
import { enterCockpit } from './cockpit-entry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = process.argv.includes('--required');
const runtime = await resolveChromium();
if (!runtime) process.exit(required ? 1 : 0);
const { chromium, executablePath } = runtime;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    if ((req.url || '').split('?')[0] === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe path');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
const BASE = `http://127.0.0.1:${port}`;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const TZ = 'Australia/Sydney';

// 200 lb in canonical kilograms (the migration/first-write value).
const KG_200_LB = 90.72;

function fixture(theme) {
  return {
    schemaVersion: 18,
    unitBasis: 'kg',
    currentWeek: '1',
    activeProgramId: 'hybrid_engine',
    activeActivationId: 'current',
    settings: {
      name: 'Unit Athlete', theme, weightUnit: 'lbs', distanceUnit: 'mi',
      weekStartDay: 'mon', onboardingComplete: true,
    },
    bodyWeightLog: [{ date: '2026-11-20', weight: KG_200_LB }],
    weeks: {},
  };
}

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const failures = [];
const fail = (message) => failures.push(message);
try {
  for (const [width, theme] of [[390, 'dark'], [320, 'light']]) {
    const tag = `${width}px/${theme}`;
    const context = await createBrowserContext(browser, { viewport: { width, height: 900 }, timezoneId: TZ, colorScheme: theme });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(fixture(theme))]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !/frame-ancestors.*ignored.*meta/i.test(message.text()) && !/net::ERR_/.test(message.text())) errors.push(message.text());
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });

    // ── READ: a stored kilogram value reads as pounds ──────────────────────
    const homeWeight = await page.$eval('#homeBodyweightCard', (card) => ({
      title: card.querySelector('.home-bw__title')?.textContent?.trim() || '',
      aria: card.querySelector('[data-action="open-bw-sheet"]')?.getAttribute('aria-label') || '',
    })).catch(() => ({ title: '', aria: '' }));
    if (!/200/.test(homeWeight.title)) fail(`${tag}: Home bodyweight title is "${homeWeight.title}", expected 200 lb`);

    await page.click('#homeBodyweightCard [data-action="open-bw-sheet"]');
    await page.waitForSelector('#bwSheet.active');
    const sheet = await page.evaluate(() => ({
      value: /** @type {HTMLInputElement|null} */ (document.getElementById('bwSheetWeight'))?.value || '',
      unit: document.getElementById('bwSheetUnit')?.textContent?.trim() || '',
      recent: document.getElementById('bwSheetRecent')?.textContent?.trim() || '',
    }));
    if (sheet.unit !== 'lbs') fail(`${tag}: weigh-in sheet labels ${sheet.unit}, expected lbs`);
    if (Number(sheet.value) !== 200) fail(`${tag}: weigh-in sheet shows ${sheet.value}, expected 200`);
    if (!/200/.test(sheet.recent)) fail(`${tag}: the recent row does not show pounds (${sheet.recent})`);
    await page.click('#bwSheet [data-action="close-bw-sheet"]');
    await page.waitForFunction(() => !document.getElementById('bwSheet')?.classList.contains('active'), null, { timeout: 4000 });

    // ── WRITE: a typed pound value is stored in kilograms ──────────────────
    await enterCockpit(page);
    await page.waitForSelector('#view-workout .cockpit-exercise');
    const lift = await page.$eval('#view-workout .cockpit-exercise', (card) => card.getAttribute('data-liftname'));
    await page.evaluate(() => {
      const card = document.querySelector('#view-workout .cockpit-exercise:not(.collapsed)') || document.querySelector('#view-workout .cockpit-exercise');
      const row = card?.querySelector('.cockpit-set-row');
      const weight = row?.querySelector('.input-weight-node');
      const reps = row?.querySelector('.input-reps-node');
      if (weight) { weight.value = '225'; weight.dispatchEvent(new Event('input', { bubbles: true })); }
      if (reps) { reps.value = '5'; reps.dispatchEvent(new Event('input', { bubbles: true })); }
      row?.querySelector('.gym-check')?.click();
    });
    const stored = await page.evaluate(([key, name]) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      // Find the completed set wherever the cockpit wrote it (week key + day are
      // the app's choice, not this check's assumption).
      for (const week of Object.values(state.weeks || {})) {
        for (const byLift of Object.values(week?.lifts || {})) {
          const sets = byLift?.[name];
          const done = Array.isArray(sets) ? sets.find((set) => set?.c) : null;
          if (done) return Number(done.w);
        }
      }
      return null;
    }, [STORAGE_KEY, lift]);
    if (!(stored > 101.9 && stored < 102.2)) {
      fail(`${tag}: typing 225 lb stored ${stored} kg (expected ≈102.06) for ${lift}`);
    }
    const shown = await page.evaluate(() => {
      const row = document.querySelector('#view-workout .cockpit-set-row');
      return row?.querySelector('.input-weight-node')?.value || '';
    });
    if (Number(shown) !== 225) fail(`${tag}: the row no longer shows the typed 225 (shows ${shown})`);

    console.log(`${tag}:`, JSON.stringify({ home: homeWeight.title, sheet: sheet.value, storedKg: stored, shown }));
    if (errors.length) fail(`${tag}: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  failures.forEach((message) => console.error(`FAIL: ${message}`));
  process.exit(1);
}
console.log('Weight unit browser contract passed.');
