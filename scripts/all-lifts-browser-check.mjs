// =============================================================================
// PG5 — all-lifts index (real browser)
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const dates = ['2026-11-04', '2026-11-11', '2026-11-18'];
const lifts = [['Back Squat', 100, 5], ['Bench Press', 80, 5], ['Barbell Row', 60, 8]];
const weeks = {};
dates.forEach((date, idx) => {
  weeks[String(idx + 1)] = {
    activationId: 'act', programId: 'hybrid_engine', dates: { wed: date },
    lifts: { wed: Object.fromEntries(lifts.map(([name, w, r]) => [name, [{ w: String(w), r: String(r), c: true, tr: r }]])) },
    gymStats: {}, runSessions: {},
  };
});
const state = {
  schemaVersion: 17, currentWeek: '4', activeProgramId: 'hybrid_engine', activeActivationId: 'act', weekStartedAt: '2026-11-23',
  settings: { name: 'Alex', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentProfiles: [], restPeriods: {} },
  weeks: { ...weeks, '4': { activationId: 'act', programId: 'hybrid_engine', dates: {}, lifts: {}, gymStats: {}, runSessions: {} } },
  bodyWeightLog: [], bodyMeasurements: [],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  hybridScore: { history: [], xp: 0 }, loadMetrics: { atl: 0, ctl: 0 },
};

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const runtime = await resolveChromium();
if (!runtime) process.exit(0);
const { chromium, executablePath } = runtime;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 900 }, colorScheme: 'dark' });
  await context.addInitScript(([k, v]) => localStorage.setItem(k, v), ['hybrid_engine_v2_state', JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: 'NOT YET' }).click({ timeout: 500 }).catch(() => {});
  await page.evaluate(() => document.querySelector('.bottom-nav [data-target="analytics"]')?.click());
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('[data-action="open-all-lifts"]')?.click());
  await page.waitForTimeout(400);
  const opened = await page.evaluate(() => ({
    open: !!document.querySelector('.all-lifts-sheet.active'),
    count: document.getElementById('allLiftsCount')?.textContent || '',
    rows: document.querySelectorAll('.all-lifts__row').length,
    focus: document.activeElement?.id,
  }));
  check(opened.open, 'the all-lifts sheet opens');
  check(opened.rows === 3, `every lift is listed (${opened.rows})`);
  check(/3 lifts/.test(opened.count), `the count names the range (${opened.count})`);
  check(opened.focus === 'allLiftsSearch', 'search is focused on open');

  await page.fill('#allLiftsSearch', 'squat');
  await page.waitForTimeout(250);
  const filtered = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('.all-lifts__row .all-lifts__name')].map((el) => el.textContent),
    count: document.getElementById('allLiftsCount')?.textContent || '',
  }));
  check(filtered.rows.length === 1 && /Back Squat/.test(filtered.rows[0]), 'search narrows to the lift');
  check(/1 of 3/.test(filtered.count), `the filtered count is honest (${filtered.count})`);

  await page.evaluate(() => document.querySelector('.all-lifts__hit')?.click());
  await page.waitForTimeout(600);
  const detail = await page.evaluate(() => ({
    sheet: !!document.querySelector('.all-lifts-sheet'),
    active: document.querySelector('.analytics-section.active')?.id || '',
  }));
  check(!detail.sheet, 'the sheet closes when a lift opens');
  check(detail.active === 'analytics-strength-entity', `the exercise drilldown opens (${detail.active})`);
  check(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close(); server.close();
}
if (failures.length) {
  console.error('all-lifts-browser-check: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('all-lifts-browser-check: PASS — searchable index, honest counts, opens the drilldown.');
