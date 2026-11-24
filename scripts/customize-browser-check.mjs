// =============================================================================
// CUSTOMIZE BROWSER CHECK
// Proves Home and Progress card visibility, persistence across reload and reset.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await resolveChromium();
if (!runtime) process.exit(process.argv.includes('--required') ? 1 : 0);
const { chromium, executablePath } = runtime;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const todayISO = '2026-11-20';

const state = {
  schemaVersion: 11, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_cust',
  weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_cust', programId: 'hybrid_engine', startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
    targetWeight: 80, rateGoal: { dir: 'lose', by: '%', lo: 0.5, hi: 1 },
  },
  customPrograms: [],
  weeks: { '1': {
    activationId: 'act_cust', programId: 'hybrid_engine',
    dates: {}, lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {},
  } },
  bodyWeightLog: [{ date: '2026-11-19', weight: 85.9 }],
  wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney' });
  await context.addInitScript(([key, value]) => {
    if (!localStorage.getItem('customizeCheckSeeded')) {
      localStorage.setItem(key, value);
      localStorage.setItem('customizeCheckSeeded', '1');
    }
  }, [STORAGE_KEY, JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('#homeWeekDays .home-week-day').length === 7);

  ok(await page.locator('#homeBodyweightCard').isVisible(), 'Home bodyweight card starts visible');
  await page.click('[data-action="open-customize"][data-surface="home"]');
  await page.waitForSelector('#customizeSheet.active');
  ok(await page.locator('#customizeSheet input[data-customize-card="bodyweight"]').isChecked(), 'Home bodyweight switch starts on');
  await page.evaluate(() => document.querySelector('#customizeSheet input[data-customize-card="bodyweight"]')?.click());
  await page.waitForFunction(() => document.getElementById('homeBodyweightCard')?.classList.contains('home-card-hidden'));
  ok(!(await page.locator('#homeBodyweightCard').isVisible()), 'turning the card off hides it immediately');
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
  ok(saved.settings?.ui?.home?.hidden?.includes('bodyweight'), 'the preference is persisted');
  await page.click('#customizeSheet [data-action="close-customize"]');
  await page.waitForFunction(() => !document.getElementById('customizeSheet')?.classList.contains('active'));

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('#homeWeekDays .home-week-day').length === 7);
  ok(!(await page.locator('#homeBodyweightCard').isVisible()), 'the hidden card stays hidden after reload');

  await page.click('.nav-item[data-target="analytics"]');
  await page.waitForSelector('#analytics-hub.active');
  ok(await page.locator('#analytics-hub [data-band="pulse"]').count() === 1, 'Progress Pulse card starts visible');
  await page.click('#analytics-hub [data-action="open-customize"][data-surface="progress"]');
  await page.waitForSelector('#customizeSheet.active');
  await page.evaluate(() => document.querySelector('#customizeSheet input[data-customize-card="pulse"]')?.click());
  await page.waitForFunction(() => !document.querySelector('#analytics-hub [data-band="pulse"]'));
  ok(true, 'turning the Progress Pulse card off removes it');
  await page.click('#customizeSheet [data-action="reset-customize"]');
  await page.waitForSelector('#analytics-hub [data-band="pulse"]');
  ok(true, 'Reset restores the Progress card');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`\ncustomize-browser-check: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\ncustomize-browser-check: PASS — Home/Progress visibility, persistence and reset.');
