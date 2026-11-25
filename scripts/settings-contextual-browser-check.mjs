// =============================================================================
// SETTINGS CONTEXTUAL CHECK — deep links + workout sheet round trip
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
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const state = {
  schemaVersion: 16, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act',
  weekStartedAt: '2026-11-16',
  settings: { name: 'Browser', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true, equipmentProfiles: [], restPeriods: { warmup: 45, compound: 180, accessory: 120, isolation: 90 } },
  weeks: { '1': { activationId: 'act', programId: 'hybrid_engine', dates: { mon: '2026-11-16' }, lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {} } },
  bodyWeightLog: [], programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney' });
  await context.addInitScript(([k, v]) => localStorage.setItem(k, v), ['hybrid_engine_v2_state', JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-19T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  // Cold deep link into a setting.
  await page.goto(`${base}/#/settings/workout/rest-timer`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#settingsOverlay.active');
  ok(await page.$eval('#settingsPageHost .s-page__title', (el) => el.textContent.trim()) === 'Workout', 'deep link opens the Workout page');
  ok(await page.locator('#settingsPageHost [data-setting-key="restTimerEnabled"]').count() >= 1, 'deep link names the rest-timer row');
  ok(await page.evaluate(() => location.hash === '#/settings/workout/rest-timer'), 'deep-link hash is preserved');

  // Workout sheet round trip.
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.click('.bottom-nav [data-target="workout"]');
  await page.waitForSelector('#view-workout.active');
  await page.click('#trainLanding .tl-today__primary, [data-action="open-train-cockpit"]');
  await page.waitForSelector('#trainCockpit:not([hidden])');
  const before = await page.evaluate(() => ({
    cockpit: !document.getElementById('trainCockpit')?.hidden,
    sets: document.querySelectorAll('#cockpitExercisesContainer .cockpit-set-row').length,
  }));
  await page.click('.wch-actions [data-action="open-workout-settings"]');
  await page.waitForSelector('#workoutSettingsSheet.active');
  ok(await page.locator('#workoutSettingsContent [data-setting-key="restTimerEnabled"]').count() >= 1, 'workout sheet shows rest timer');
  ok(await page.locator('#workoutSettingsContent #workoutEquipmentProfile').count() === 1, 'workout sheet can switch the active gym');
  const toggled = await page.evaluate(() => {
    const input = document.querySelector('#workoutSettingsContent input[data-setting-key="keepAwake"]');
    if (!input) return false;
    input.click();
    return !input.checked;
  });
  ok(toggled, 'workout sheet setting applies');
  await page.click('#workoutSettingsSheet [data-action="close-workout-settings"]');
  await page.waitForFunction(() => !document.getElementById('workoutSettingsSheet')?.classList.contains('active'));
  const after = await page.evaluate(() => ({
    cockpit: !document.getElementById('trainCockpit')?.hidden,
    sets: document.querySelectorAll('#cockpitExercisesContainer .cockpit-set-row').length,
  }));
  ok(after.cockpit === before.cockpit && after.sets === before.sets, 'closing the sheet returns to the same workout');
  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close(); server.close();
}
if (failures.length) { failures.forEach((f) => console.error(`FAIL: ${f}`)); process.exit(1); }
console.log('Settings contextual browser contract passed.');
