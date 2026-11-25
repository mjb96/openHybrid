// =============================================================================
// IMPORT BROWSER CHECK
// Proves the Settings CSV importer accepts an openGym-style file (strength +
// cardio), archives both record types, and that the batch FIT controls exist.
// =============================================================================
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
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

const state = {
  schemaVersion: 9, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_imp', weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_imp', programId: 'hybrid_engine', startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
    targetWeight: 80, rateGoal: { dir: 'lose', by: '%', lo: 0.5, hi: 1 },
  },
  customPrograms: [],
  weeks: { '1': {
    activationId: 'act_imp', programId: 'hybrid_engine',
    dates: {}, lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {},
  } },
  bodyWeightLog: [], wellnessLog: [],
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};

// Semicolons + unit-stripped headers cover Excel-style exports too.
const csv = [
  'date;start_time;end_time;workout;workout_note;exercise;set;set_type;weight;unit;reps;distance_km;seconds',
  '2026-11-02;2026-11-02 09:00;2026-11-02 10:05;Push A;Good session;Bench Press;1;warmup;60;kg;8;;',
  '2026-11-02;2026-11-02 09:00;2026-11-02 10:05;Push A;Good session;Bench Press;2;normal;100;kg;5;;',
  '2026-11-02;2026-11-02 18:00;2026-11-02 18:30;Evening;Cardio only;Treadmill;1;normal;;;;2.5;1500',
].join('\r\n');
const csvPath = path.join(os.tmpdir(), `openhybrid-import-${process.pid}.csv`);
await writeFile(csvPath, csv, 'utf8');

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney' });
  // Seed once. The importer reloads the page after saving, so a naive init
  // script would overwrite the imported history on that reload.
  await context.addInitScript(([key, value]) => {
    if (localStorage.getItem('importCheckSeeded')) return;
    localStorage.setItem(key, value);
    localStorage.setItem('importCheckSeeded', '1');
  }, [STORAGE_KEY, JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#homeWeekStrip');

  await page.click('#homeSettingsBtn');
  await page.waitForSelector('#settingsOverlay.active');
  await page.click('[data-action="open-settings-page"][data-context="data.backup"]');
  await page.waitForSelector('#settingsPageHost .s-page');
  ok(await page.locator('#settingsFitFiles[multiple]').count() === 1, 'Settings exposes a multi-file FIT picker');

  await page.setInputFiles('#settingsExternalCsvFile', csvPath);
  const modal = page.locator('.cmodal');
  await modal.waitFor();
  const copy = await modal.innerText();
  ok(/2 workouts · 2 strength sets/.test(copy), 'CSV preview counts the dated sessions');
  ok(/1 cardio row will be imported as run data/.test(copy), 'CSV preview admits cardio as runs');
  // A successful import closes Settings, refreshes in place and opens History.
  // No reload: the old reload raced the assertions on slow CI runners.
  await page.click('.cmodal [data-cm="ok"]');
  await page.waitForSelector('#activitiesScreen .activity-history-row', { timeout: 20000 });

  await page.waitForFunction((key) => {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.keys(saved.weeks || {}).filter((id) => id.startsWith('arch:import:')).length === 2;
  }, STORAGE_KEY, { timeout: 15000 });

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
  const imported = Object.entries(saved.weeks || {}).filter(([id]) => id.startsWith('arch:import:'));
  ok(imported.length === 2, 'both imported sessions were archived');

  const strength = imported.find(([, week]) => week.lifts?.mon?.['Barbell Bench Press']);
  const cardio = imported.find(([, week]) => week.runSessions?.mon?.length);
  ok(!!strength, 'the strength session kept its mapped exercise');
  ok(strength?.[1].lifts.mon['Barbell Bench Press'].length === 2, 'both strength sets were kept');
  ok(cardio?.[1].runSessions.mon[0].dist === '2.50', 'the cardio row became a 2.50 km run');
  ok(cardio?.[1].runSessions.mon[0].time === '25:00', 'the cardio run kept its duration');
  ok(cardio?.[1].runSessions.mon[0].pace === '10:00', 'the cardio run derived its pace');
  ok(cardio?.[1].gymStats.mon.time === undefined, 'the cardio session is not counted as strength');

  // History is already open from the import.
  const history = await page.locator('#activitiesScreen').innerText();
  ok(/Push A/.test(history), 'History lists the imported strength session');
  ok(/Treadmill/.test(history), 'History lists the imported run');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`\nimport-browser-check: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nimport-browser-check: PASS — CSV strength+cardio import and FIT controls.');
