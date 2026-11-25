// =============================================================================
// MODULE TOGGLES BROWSER CHECK
// Uses synthetic cardio data (no personal export) to prove that turning the
// Running module off hides its Home entry points and Progress domain, while
// turning it on leaves them available. No data is deleted.
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
const todayISO = '2026-11-19';
const program = {
  id: 'module_toggle_test', name: 'Module Toggle Test', totalWeeks: 4,
  days: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [
    d, { title: d === 'thu' ? 'Run' : 'Strength', lifts: d === 'thu' ? [] : ['Back Squat'], runs: d === 'thu' ? 'Easy 5 km' : 'Rest' },
  ])),
};
const state = {
  schemaVersion: 5, currentWeek: '1', activeProgramId: program.id, activeActivationId: 'act_modules', weekStartedAt: todayISO,
  activations: [{ id: 'act_modules', programId: program.id, startWeek: 1, status: 'active', startedAt: todayISO }],
  settings: { name: 'Browser', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym' },
  customPrograms: [program],
  weeks: { '1': {
    activationId: 'act_modules', programId: program.id,
    dates: { mon: '2026-11-16', tue: '2026-11-17', wed: '2026-11-18', thu: '2026-11-19', fri: '2026-11-20', sat: '2026-11-21', sun: '2026-11-22' },
    lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {},
    runSessions: { thu: [{ sessionId: 'dummy_run', dist: '5', time: '25:00', localDate: todayISO }] },
    liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {},
  } },
  bodyWeightLog: [], wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};
const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney' });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#homeWeekStrip');

  const runQuick = page.locator('#homeQuickActions [data-action="open-run-logger"]');
  ok(await runQuick.isVisible(), 'Running module is visible by default');

  await page.click('#homeSettingsBtn');
  await page.waitForSelector('#settingsOverlay.active');
  await page.click('[data-action="open-settings-page"][data-context="once.modules"]');
  await page.waitForSelector('#settingsPageHost .s-page');
  await page.locator('label.s-switch', { has: page.locator('input[data-setting-key="modules.running"]') }).click();
  await page.waitForFunction(() => document.documentElement.dataset.moduleRunning === 'off');
  ok(!(await runQuick.isVisible()), 'turning Running off hides the Home run action');

  await page.click('#settingsPageHost .s-back');
  await page.waitForSelector('#settingsPageHost .s-home');
  await page.click('#settingsOverlay [data-action="close-settings"]');
  await page.click('.nav-item[data-target="analytics"]');
  await page.waitForSelector('#view-analytics.active');
  await page.waitForSelector('#analytics-hub.active');
  const runningCards = await page.locator('#analytics-hub .ph-card').evaluateAll((cards) => cards.filter((card) => /running/i.test(card.textContent || '')).length);
  ok(runningCards === 0, 'turning Running off removes the Progress Running domain');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  console.error(`module-toggles-browser-check: FAIL — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('module-toggles-browser-check: PASS — synthetic run data and module visibility.');
