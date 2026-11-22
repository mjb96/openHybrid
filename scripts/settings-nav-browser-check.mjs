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

  // The filters are buttons in a group, not a tablist: there are no tabpanels,
  // no aria-controls and no arrow-key contract to honour.
  ok((await page.getAttribute('#settingsTabs', 'role')) === 'group', 'settings filters expose role="group"');
  ok((await page.locator('#settingsTabs [role="tab"]').count()) === 0, 'no fake tab roles remain');
  ok((await page.getAttribute('#settingsTabs [data-settings-tab="training"]', 'aria-pressed')) === 'true',
    'the active filter reports aria-pressed=true');
  ok((await page.getAttribute('#settingsTabs [data-settings-tab="profile"]', 'aria-pressed')) === 'false',
    'an inactive filter reports aria-pressed=false');
  ok((await page.locator('[data-action="rest-preset"].active').getAttribute('data-preset')) === 'hypertrophy',
    'the default rest tiers show Standard as active');

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
  ok(await page.locator('[data-action="rest-preset"][data-preset="efficient"]').evaluate((el) => el.classList.contains('active')),
    'the applied preset shows as active');
  await page.fill('#settingsRestCompound', '2:15');
  await page.locator('#settingsRestCompound').press('Tab');
  ok((await page.locator('[data-action="rest-preset"].active').count()) === 0,
    'custom rests leave no preset falsely active');
  await page.click('[data-action="rest-preset"][data-preset="hypertrophy"]');
  await page.click('[data-action="set-previous-scope"][data-scope="program"]');
  ok(await page.locator('[data-action="set-previous-scope"][data-scope="program"]').evaluate((el) => el.classList.contains('active')), 'previous-values scope persists its active state');

  // Threshold pace is a running baseline, not free text: a typo must be
  // rejected without rewriting the stored seconds.
  const storedThresholdPace = () => page.evaluate(() => JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}')?.thresholdPaceSeconds);
  await page.fill('#settingsThresholdPace', '4.30');
  await page.locator('#settingsThresholdPace').press('Tab');
  ok((await page.textContent('#sysToast')) === 'Enter pace as mm:ss', 'a dotted pace shows the mm:ss error');
  const invalidPace = await storedThresholdPace();
  ok(invalidPace === null || invalidPace === undefined, 'invalid pace leaves the stored value untouched');
  await page.fill('#settingsThresholdPace', '4:30');
  await page.locator('#settingsThresholdPace').press('Tab');
  ok((await storedThresholdPace()) === 270, '4:30 stores 270 seconds');
  ok((await page.textContent('#sysToast')) === 'Threshold pace saved', 'a valid pace confirms the save');

  // Fasting stage nudges are a real, persisted toggle under Notifications, and
  // the module switch gates both the control and the delivery path.
  await page.click('#settingsTabs [data-settings-tab="health"]');
  const nudgeRow = page.locator('.settings-row', { has: page.locator('#settingsNotifFastingStage') });
  ok(await page.locator('#settingsNotifFastingStage').isChecked(), 'fasting stage nudges default on');
  await nudgeRow.locator('.settings-switch').click();
  const nudgeStored = await page.evaluate(() => JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}')?.settings?.notifFastingStage);
  ok(nudgeStored === false, 'the fasting stage nudge preference is stored');

  await page.click('#settingsTabs [data-settings-tab="training"]');
  const fastingModuleSwitch = page.locator('.settings-row', { has: page.locator('[data-module-toggle="fasting"]') }).locator('.settings-switch');
  await fastingModuleSwitch.click();
  await page.waitForFunction(() => document.documentElement.dataset.moduleFasting === 'off');
  await page.click('#settingsTabs [data-settings-tab="health"]');
  ok(!(await page.locator('#settingsNotifFastingStage').isVisible()), 'the fasting nudge toggle hides with its module');
  const gated = await page.evaluate(async () => {
    const { maybePushFastingNudge } = await import('./js/fasting/fasting-nudge.js');
    return maybePushFastingNudge({
      settings: { modules: { fasting: false }, notifFastingStage: true },
      fastingSession: { active: true, startTime: new Date(Date.now() - 13 * 3600e3).toISOString(), goal: 16, history: [] },
    }, { notifyFn: () => {}, granted: true, saveFn: () => {} });
  });
  ok(gated === null, 'a disabled Fasting module cannot fire a nudge');
  await page.click('#settingsTabs [data-settings-tab="training"]');
  await fastingModuleSwitch.click();
  await page.waitForFunction(() => document.documentElement.dataset.moduleFasting === 'on');
  await page.click('#settingsTabs [data-settings-tab="health"]');
  await nudgeRow.locator('.settings-switch').click();
  ok(await page.locator('#settingsNotifFastingStage').isChecked(), 'the fasting nudge toggle can be restored');
  await page.click('#settingsTabs [data-settings-tab="training"]');

  await page.fill('#settingsSearch', 'theme');
  const searchLabels = await visibleLabel();
  ok(searchLabels.includes('Appearance'), 'search finds Appearance');
  ok(!searchLabels.includes('Training'), 'search hides non-matching groups');
  ok((await page.locator('#settingsTabs [aria-pressed="true"]').count()) === 0,
    'a search does not claim a filter is active');

  // Matching is by words the athlete can see OR that the control exposes to
  // assistive tech. "Light band weight" only exists as the input's aria-label.
  await page.fill('#settingsSearch', 'light band weight');
  ok((await visibleLabel()).includes('Equipment'), 'search matches an accessible name');
  await page.fill('#settingsSearch', '');

  // A row switched off with a feature module is invisible, so its words must
  // not return a blank card that looks like a broken search.
  const runningModule = page.locator('.settings-row', { has: page.locator('[data-module-toggle="running"]') }).locator('.settings-switch');
  await runningModule.click();
  await page.waitForFunction(() => document.documentElement.dataset.moduleRunning === 'off');
  await page.fill('#settingsSearch', 'threshold pace');
  ok(await page.locator('#settingsNoResults').isVisible(),
    'a module-disabled row cannot suppress the no-results explanation');
  ok((await page.locator('#settingsPanel .settings-section:not([hidden])').count()) === 0,
    'a module-off-only term leaves no blank card visible');
  await page.fill('#settingsSearch', '');
  await runningModule.click();
  await page.waitForFunction(() => document.documentElement.dataset.moduleRunning === 'on');

  await page.evaluate(() => { document.querySelector('#settingsPanel .settings-body').scrollTop = 600; });
  await page.fill('#settingsSearch', 'theme');
  ok((await page.evaluate(() => document.querySelector('#settingsPanel .settings-body').scrollTop)) === 0,
    'typing a search resets the panel scroll');

  await page.fill('#settingsSearch', 'zzzz-no-setting');
  ok(await page.locator('#settingsNoResults').isVisible(), 'no-results state is shown');
  ok((await page.getAttribute('#settingsNoResults', 'role')) === 'status', 'no-results is announced as a status');

  await page.fill('#settingsSearch', '');
  ok((await visibleLabel()).includes('Training'), 'clearing search returns to the active tab');
  ok(await page.locator('#settingsNoResults').isHidden(), 'no-results state is hidden again');

  // Closing and reopening starts fresh rather than resurrecting a filter.
  await page.fill('#settingsSearch', 'zzzz-no-setting');
  await page.click('#settingsOverlay [data-action="close-settings"]');
  await page.click('#view-profile [data-action="open-settings"]');
  await page.waitForSelector('#settingsOverlay.active');
  ok((await page.inputValue('#settingsSearch')) === '', 'reopening settings clears the search');
  ok((await visibleLabel()).includes('Training'), 'reopening settings shows the active destination');
  ok((await page.locator('#settingsNoResults').isHidden()), 'reopening settings hides the stale no-results state');

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
