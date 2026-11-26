// =============================================================================
// PLANS / JSON IMPORT BROWSER CHECK
// Proves the simplified two-tab Plans page and importing a portable plan file
// into My Plans without overwriting a shared/catalog program.
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

const planFile = {
  format: 'openhybrid-plan',
  version: 1,
  exportedAt: '2026-11-20T00:00:00.000Z',
  plan: {
    name: 'Imported Test Block',
    totalWeeks: 4,
    days: {
      mon: { title: 'Push', badge: 'Push', lifts: ['Bench Press'], runs: 'Rest', desc: '' },
      wed: { title: 'Pull', badge: 'Pull', lifts: ['Barbell Row'], runs: 'Rest', desc: '' },
    },
    weeklyVolModifiers: { 1: { sets: 4, reps: 6, intensityLabel: 'Build' } },
  },
};
const planPath = path.join(os.tmpdir(), `openhybrid-plan-${process.pid}.json`);
await writeFile(planPath, JSON.stringify(planFile, null, 2));

const openGymFile = {
  opengym_plan: 1,
  exported: '2026-11-20',
  name: 'Upper / Lower',
  unit: 'kg',
  week: { 1: ['upper'], 2: ['lower'] },
  routines: [
    { id: 'upper', name: 'Upper A', ex: [{ id: '0289', sets: 3, reps: 12, weight: 30, restSec: 90 }] },
    { id: 'lower', name: 'Lower A', ex: [{ id: '0043', sets: 3, reps: 6, weight: 112.5, restSec: 240 }] },
  ],
  customEx: [],
};
const openGymPath = path.join(os.tmpdir(), `opengym-plan-${process.pid}.json`);
await writeFile(openGymPath, JSON.stringify(openGymFile, null, 2));

const state = {
  schemaVersion: 12, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_plan',
  weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_plan', programId: 'hybrid_engine', startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
  },
  customPrograms: [], weeks: { '1': { activationId: 'act_plan', programId: 'hybrid_engine', dates: {}, lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {} } },
  bodyWeightLog: [], wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney', acceptDownloads: true });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-20T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#homeWeekStrip');
  await page.click('.nav-item[data-target="program"]');
  await page.waitForSelector('#programLibraryScreen');

  const tabs = await page.locator('#progLibraryTabs').count();
  ok(tabs === 0, 'the Discover | My Plans tabs are gone');
  ok(await page.locator('#plansHome').isVisible(), 'Plans opens on the one home surface');
  const homeText = await page.locator('#progLibraryContent').innerText();
  ok(/your plans/i.test(homeText), 'the home names Your plans');
  ok(/no plans yet/i.test(homeText), 'an empty library says so');
  ok(await page.locator('#plansHome [data-action="open-browse"]').first().isVisible(), 'Browse is reachable from the home');

  await page.setInputFiles('#planImportFile', planPath);
  await page.waitForFunction(() => document.querySelector('#progLibraryContent')?.textContent?.includes('Imported Test Block'));
  ok(/your plans/i.test(await page.locator('#progLibraryContent').innerText()), 'import lands in Your plans');
  ok(await page.locator('#progLibraryContent .plan-row').count() > 0, 'the imported plan is a manageable row');
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
  const imported = saved.customPrograms?.find((program) => program.name === 'Imported Test Block');
  ok(!!imported, 'the imported plan is persisted as a custom program');
  ok(imported?.days?.mon?.lifts?.[0] === 'Bench Press', 'the imported plan kept its training days');

  await page.click('#progLibraryContent .plan-row__open[data-program-id]');
  await page.waitForFunction(() => document.getElementById('programDetailScreen')?.style.display !== 'none');
  await page.click('[data-action="open-program-menu"]');
  await page.waitForSelector('.action-menu');
  ok(/Export plan \(.json\)/.test(await page.locator('.action-menu').innerText()), 'program detail offers the portable JSON export');
  await page.keyboard.press('Escape');

  // PL6: a plan day can be saved as a routine without logging it first.
  const dayKey = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    const program = (state.customPrograms || []).find((p) => p.name === 'Imported Test Block');
    return Object.keys(program?.days || {}).find((d) => (program.days[d].lifts || []).length) || null;
  }, STORAGE_KEY);
  if (dayKey) {
    await page.click(`#programDetailScreen [data-action="toggle-plan-day"][data-day="${dayKey}"]`);
    await page.click(`#programDetailContent [data-action="save-day-as-routine"][data-day="${dayKey}"]`);
    await page.waitForTimeout(300);
    const routines = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').routines || [], STORAGE_KEY);
    ok(routines.length === 1, 'a plan day saves as a routine');
    ok(!!routines[0]?.prescriptions?.[dayKey], 'the saved routine keeps the day\'s targets');
  } else {
    ok(false, 'the imported plan has no training day to save');
  }

  await page.click('#activitiesBack').catch(() => {});
  await page.setInputFiles('#planImportFile', openGymPath);
  await page.waitForFunction(() => document.querySelector('#progLibraryContent')?.textContent?.includes('Upper / Lower'));
  const withOpenGym = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
  const importedOpenGym = withOpenGym.customPrograms?.find((program) => program.name === 'Upper / Lower');
  ok(!!importedOpenGym, 'an openGym plan imports as a custom program');
  ok(importedOpenGym?.days?.mon?.lifts?.[0] === 'Dumbbell Bench Press', 'the openGym id resolves to a real exercise');
  ok(importedOpenGym?.prescriptions?.mon?.['Dumbbell Bench Press']?.sets === 3, 'the per-exercise prescription is kept');
  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`\nplans-json-browser-check: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nplans-json-browser-check: PASS — simplified Plans and JSON import.');
