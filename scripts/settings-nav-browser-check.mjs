// =============================================================================
// SETTINGS NAVIGATION BROWSER CHECK
// Verifies the Appearance-style sub-pages, global search and empty result state.
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
const state = {
  schemaVersion: 12, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_set',
  weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_set', programId: 'hybrid_engine', startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
  },
  customPrograms: [], weeks: { '1': { activationId: 'act_set', programId: 'hybrid_engine', dates: {}, lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {} } },
  bodyWeightLog: [], wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney' });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), ['hybrid_engine_v2_state', JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-20T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#homeWeekStrip');
  await page.click('#homeAvatar');
  await page.waitForSelector('#view-profile.active');
  await page.click('#view-profile [data-action="open-settings"]');
  await page.waitForSelector('#settingsOverlay.active');

  const visibleLabel = async () => page.evaluate(() => [...document.querySelectorAll('#settingsPanel .settings-section')]
    .filter((section) => !section.hidden)
    .map((section) => section.querySelector('.settings-section-label')?.textContent?.trim()));
  ok((await visibleLabel()).includes('Profile'), 'Profile is the default settings page');
  ok(!(await visibleLabel()).includes('Training'), 'Training is hidden on the Profile page');

  await page.click('#settingsTabs [data-settings-tab="training"]');
  ok((await visibleLabel()).includes('Training'), 'Training tab shows Training');
  ok(!(await visibleLabel()).includes('Profile'), 'Training tab hides Profile');

  // Logging settings used to be hidden power-user markup buried inside the
  // Training card. They are now a first-class card in a fixed order, so a
  // setting cannot drift back into an unrelated group.
  ok((await visibleLabel()).includes('Logging'), 'Training tab shows the Logging card');
  ok((await visibleLabel()).join('|') === 'Training|Logging|Program Week|Equipment|Modules',
    `Training cards are ordered Units → Logging → Program → Equipment → Modules (got ${(await visibleLabel()).join('|')})`);
  const hintsCard = await page.locator('#settingsShowPlateHints').evaluate((el) => (
    el.closest('.settings-section')?.querySelector('.settings-section-label')?.textContent?.trim()
  ));
  ok(hintsCard === 'Logging', 'plate hints live in the Logging card');
  ok(await page.locator('#settingsRestWarmup').isVisible(), 'warm-up rest tier is visible');
  ok(await page.locator('#settingsRestCompound').isVisible(), 'compound rest tier is visible');
  ok(await page.locator('#settingsRestAccessory').isVisible(), 'accessory rest tier is visible');
  ok(await page.locator('#settingsRestIsolation').isVisible(), 'isolation rest tier is visible');
  ok(await page.locator('#settingsRestAlertSound').isVisible(), 'rest alert sound toggle is visible');
  ok(await page.locator('#settingsRestAlertVolume').isVisible(), 'rest alert volume is visible');
  ok(await page.locator('[data-action="set-progression"][data-kg="2.5"]').isVisible(), 'progression step is visible');
  ok(await page.locator('[data-action="set-previous-scope"][data-scope="program"]').isVisible(), 'previous-values scope is visible');

  await page.click('[data-action="rest-preset"][data-preset="efficient"]');
  ok((await page.inputValue('#settingsRestCompound')) === '2:00', 'rest preset updates the compound tier');
  ok((await page.inputValue('#settingsRestWarmup')) === '0:30', 'rest preset updates the warm-up tier');
  await page.click('[data-action="set-previous-scope"][data-scope="program"]');
  ok(await page.locator('[data-action="set-previous-scope"][data-scope="program"]').evaluate((el) => el.classList.contains('active')), 'previous-values scope persists its active state');

  await page.fill('#settingsSearch', 'theme');
  const searchLabels = await visibleLabel();
  ok(searchLabels.includes('Appearance'), 'search finds Appearance');
  ok(!searchLabels.includes('Training'), 'search hides non-matching groups');

  await page.fill('#settingsSearch', 'zzzz-no-setting');
  ok(await page.locator('#settingsNoResults').isVisible(), 'no-results state is shown');

  await page.fill('#settingsSearch', '');
  ok((await visibleLabel()).includes('Training'), 'clearing search returns to the active tab');
  ok(await page.locator('#settingsNoResults').isHidden(), 'no-results state is hidden again');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`\nsettings-nav-browser-check: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nsettings-nav-browser-check: PASS — sub-pages, search and empty state.');
