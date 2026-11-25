// =============================================================================
// PG6 — Records: all-time table + dated PR feed (real browser)
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
const rows = [
  ['2026-11-04', 'Back Squat', 100, 5], ['2026-11-11', 'Back Squat', 105, 5],
  ['2026-11-06', 'Bench Press', 80, 5], ['2026-11-13', 'Bench Press', 85, 5],
  ['2026-11-07', 'Barbell Row', 60, 8], ['2026-11-14', 'Barbell Row', 65, 8],
];
const weeks = {};
rows.forEach(([date, lift, w, r], i) => {
  weeks[String(i + 1)] = {
    activationId: 'act', programId: 'hybrid_engine', dates: { wed: date },
    lifts: { wed: { [lift]: [{ w: String(w), r: String(r), c: true }] } }, gymStats: {}, runSessions: {},
  };
});
const state = {
  schemaVersion: 17, currentWeek: '7', activeProgramId: 'hybrid_engine', activeActivationId: 'act', weekStartedAt: '2026-11-23',
  settings: { name: 'Alex', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentProfiles: [], restPeriods: {} },
  weeks: { ...weeks, '7': { activationId: 'act', programId: 'hybrid_engine', dates: {}, lifts: {}, gymStats: {}, runSessions: {} } },
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
  await page.evaluate(() => document.querySelector('[data-action="open-records"]')?.click());
  await page.waitForTimeout(400);
  const opened = await page.evaluate(() => ({
    open: !!document.querySelector('.records-sheet.active'),
    rows: document.querySelectorAll('.records-table__row').length,
    feed: document.querySelectorAll('.records-feed__row').length,
    focus: document.activeElement?.id,
  }));
  check(opened.open, 'the records sheet opens');
  check(opened.rows === 3, `one all-time row per lift (${opened.rows})`);
  check(opened.feed === 3, `the PR feed has one event per record date (${opened.feed})`);
  check(opened.focus === 'recordsSearch', 'search is focused on open');

  await page.fill('#recordsSearch', 'bench');
  await page.waitForTimeout(250);
  const filtered = await page.evaluate(() => ({
    table: [...document.querySelectorAll('.records-table__name')].map((el) => el.textContent),
    feed: [...document.querySelectorAll('.records-feed__lift')].map((el) => el.textContent),
  }));
  check(filtered.table.length === 1 && /Bench Press/.test(filtered.table[0]), 'search narrows the table');
  check(filtered.feed.length === 1 && /Bench Press/.test(filtered.feed[0]), 'search narrows the feed');

  await page.evaluate(() => document.querySelector('.records-table__row')?.click());
  await page.waitForTimeout(600);
  const detail = await page.evaluate(() => ({
    sheet: !!document.querySelector('.records-sheet'),
    active: document.querySelector('.analytics-section.active')?.id || '',
  }));
  check(!detail.sheet, 'the sheet closes when a lift opens');
  check(detail.active === 'analytics-strength-entity', `the drilldown opens (${detail.active})`);
  check(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close(); server.close();
}
if (failures.length) {
  console.error('records-browser-check: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('records-browser-check: PASS — all-time table, dated PR feed, search and drilldown.');
