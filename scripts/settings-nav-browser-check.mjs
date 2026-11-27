// =============================================================================
// SETTINGS PAGES BROWSER CHECK — Phase 4
//
// The new IA: 13 pushed pages, one search index, live summaries and the
// existing side-effect owners. Covers navigation, search, units conversion,
// module gating, rest tiers, equipment, data and Health Connect.
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
  schemaVersion: 16, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_set',
  weekStartedAt: '2026-11-16',
  settings: {
    name: 'Browser', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym', reducedMotion: 'system',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [], restPeriods: { warmup: 45, compound: 180, accessory: 120, isolation: 90 },
  },
  customPrograms: [],
  weeks: { '1': { activationId: 'act_set', programId: 'hybrid_engine', dates: { mon: '2026-11-16' }, lifts: { mon: { Squat: [{ w: '100', r: '5', c: true }] } }, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {} } },
  bodyWeightLog: [], wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
const openPage = async (page, id) => {
  await page.click(`[data-action="open-settings-page"][data-context="${id}"]`);
  await page.waitForSelector('#settingsPageHost .s-page');
};
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney' });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), ['hybrid_engine_v2_state', JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-20T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#homeWeekStrip');
  await page.click('#homeSettingsBtn');
  await page.waitForSelector('#settingsOverlay.active');

  const home = await page.evaluate(() => ({
    groups: [...document.querySelectorAll('#settingsPageHost .s-group__label')].map((el) => el.textContent.trim()),
    pages: [...document.querySelectorAll('#settingsPageHost [data-action="open-settings-page"]')].map((el) => el.getAttribute('data-context')),
    tabs: document.querySelectorAll('#settingsTabs').length,
    profile: !!document.querySelector('#settingsPageHost [data-action="open-settings-profile"]'),
    search: !!document.querySelector('#settingsSearch'),
  }));
  ok(home.groups.join('|') === 'Training|Set once|Connections|Data|About', `top-level groups (${home.groups.join('|')})`);
  ok(home.pages.length === 13, `13 top-level pages (${home.pages.length})`);
  ok(home.tabs === 0, 'no filter tabs remain');
  ok(home.profile && home.search, 'profile card and search are present');

  // Appearance: text size scales the ROOT (one CSS hook), not one component.
  await page.fill('#settingsSearch', '');
  await openPage(page, 'once.look');
  await page.click('[data-setting-segment="textSize"][data-value="xlarge"]');
  await page.waitForFunction(() => document.documentElement.dataset.textSize === 'xlarge');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}')?.settings?.textSize === 'xlarge', null, { timeout: 3000 }).catch(() => {});
  const large = await page.evaluate(() => ({
    attr: document.documentElement.dataset.textSize,
    font: parseFloat(getComputedStyle(document.documentElement).fontSize),
    stored: JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}')?.settings?.textSize,
  }));
  ok(large.attr === 'xlarge' && large.stored === 'xlarge', 'text size persists');
  ok(large.font > 18, `Extra large grows the root font (${large.font}px)`);
  await page.click('[data-setting-segment="textSize"][data-value="default"]');
  await page.waitForFunction(() => document.documentElement.dataset.textSize === 'default');
  ok(true, 'text size returns to Default');
  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');
  await page.waitForSelector('#settingsPageHost [data-action="open-settings-page"][data-context="once.units"]');


  // Search finds a setting, opens its page and pulses the exact row.
  await page.fill('#settingsSearch', 'theme');
  const results = await page.locator('[data-action="open-settings-result"]').count();
  ok(results >= 1, 'search returns settings results');
  await page.fill('#settingsSearch', 'thm');
  ok(await page.locator('[data-action="open-settings-result"][data-context="theme"]').count() === 1, 'search is fuzzy across labels');
  await page.fill('#settingsSearch', 'theme');
  await page.click('[data-action="open-settings-result"][data-context="theme"]');
  await page.waitForFunction(() => location.hash.startsWith('#/settings/look-home'));
  ok(await page.locator('#settingsPageHost [data-setting-key="theme"]').count() >= 1, 'search result opens Look & Home on Theme');
  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');
  await page.waitForSelector('#settingsPageHost [data-action="open-settings-page"][data-context="once.units"]');

  // ST6: the unit switch is DISPLAY-ONLY — no confirm, no rewrite. Storage stays
  // canonical kilograms; the athlete just reads pounds from now on.
  await openPage(page, 'once.units');
  await page.click('[data-setting-segment="weightUnit"][data-value="lbs"]');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}')?.settings?.weightUnit === 'lbs');
  const switched = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
    return {
      unit: saved.settings?.weightUnit,
      weight: saved.weeks?.['1']?.lifts?.mon?.Squat?.[0]?.w,
      unitBasis: saved.unitBasis,
      toast: document.getElementById('sysToast')?.textContent?.trim() || '',
    };
  });
  ok(switched.unit === 'lbs' && Number(switched.weight) === 100,
    `the stored 100 kg set is NOT rewritten (${switched.weight})`);
  ok(!(await page.locator('.cmodal__btn--ok').count()), 'the unit switch asks for no confirmation');
  ok(/stored data unchanged/i.test(switched.toast), `the toast says nothing was rewritten (${switched.toast})`);

  // Threshold pace rejects a typo and stores a valid mm:ss.
  await page.fill('#settingsThresholdPace', '4.30');
  await page.locator('#settingsThresholdPace').press('Tab');
  ok((await page.textContent('#sysToast')) === 'Enter pace as mm:ss', 'invalid threshold pace is refused');
  await page.fill('#settingsThresholdPace', '4:30');
  await page.locator('#settingsThresholdPace').press('Tab');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}')?.thresholdPaceSeconds) === 270, '4:30 stores 270 s');

  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');

  // Rest tiers: presets and a custom value still reach the existing owner.
  await openPage(page, 'training.timers');
  await page.click('[data-action="rest-preset"][data-preset="efficient"]');
  ok((await page.inputValue('#settingsRestCompound')) === '2:00', 'rest preset updates the compound tier');
  await page.fill('#settingsRestCompound', '2:15');
  await page.locator('#settingsRestCompound').press('Tab');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}')?.settings?.restPeriods?.compound === 135);

  // Module gating hides the related row and the notification.
  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');
  await openPage(page, 'once.modules');
  await page.locator('label.s-switch', { has: page.locator('input[data-setting-key="modules.fasting"]') }).click();
  await page.waitForFunction(() => document.documentElement.dataset.moduleFasting === 'off');
  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');
  await openPage(page, 'training.reminders');
  ok(await page.locator('input[data-setting-key="notifFastingStage"]').count() === 0, 'fasting nudge hides with its module');
  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');
  await openPage(page, 'once.modules');
  await page.locator('label.s-switch', { has: page.locator('input[data-setting-key="modules.fasting"]') }).click();
  await page.waitForFunction(() => document.documentElement.dataset.moduleFasting === 'on');

  // Equipment page renders the profile, kit, plates and bands controls.
  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');
  await openPage(page, 'once.equipment');
  const equipment = await page.evaluate(() => ({
    profile: !!document.querySelector('#settingsEquipmentProfile'),
    plates: !!document.querySelector('#settingsPlates'),
    bands: !!document.querySelector('#settingsBandLight'),
    kit: document.querySelectorAll('[data-equipment]').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  ok(equipment.profile && equipment.plates && equipment.bands, 'equipment profile, plates and bands render');
  ok(equipment.kit >= 9, 'all equipment switches render');
  ok(!equipment.overflow, 'equipment page does not overflow');

  // Data & backup exposes every export/import action, storage and danger.
  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');
  await openPage(page, 'data.backup');
  const dataActions = await page.evaluate(() => [...document.querySelectorAll('#settingsPageHost [data-action]')].map((el) => el.getAttribute('data-action')));
  for (const action of ['auto-backup-folder', 'export-data', 'export-training-context', 'export-csv', 'import-data', 'import-external-csv', 'import-fit-files', 'reset-all-data']) {
    ok(dataActions.includes(action), `Data & backup has ${action}`);
  }
  ok(await page.locator('#settingsPageHost #settingsImportFile').count() === 1, 'the import file input exists');

  // Integrations page has Health Connect controls.
  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');
  await openPage(page, 'connections.integrations');
  ok(await page.locator('#settingsStepGoal').count() === 1, 'Health Connect step goal renders');
  ok(await page.locator('[data-hc-field="steps"]').count() === 1, 'Health Connect sync fields render');

  // Search no-results is announced, and closing/reopening clears it.
  await page.click('#settingsPageHost .s-back');
  await page.waitForFunction(() => location.hash === '#/settings');
  await page.fill('#settingsSearch', 'zzzz-no-setting');
  const empty = await page.locator('#settingsPageHost .s-empty').textContent();
  ok(/No settings match/.test(empty || ''), 'no-results state is shown');
  await page.click('#settingsOverlay [data-action="close-settings"]');
  await page.waitForFunction(
    () => !document.getElementById('settingsOverlay')?.classList.contains('active'),
    null,
    { timeout: 5000 },
  );
  await page.click('#homeSettingsBtn');
  await page.waitForSelector('#settingsOverlay.active');
  ok((await page.inputValue('#settingsSearch')) === '', 'reopening Settings clears search');

  // Licences: the shipped notices render in-app, not behind a GitHub link.
  await page.click('[data-action="open-settings-page"][data-context="about"]');
  await page.waitForSelector('#settingsPageHost .s-page');
  await page.click('[data-action="open-licenses"]');
  await page.waitForSelector('#licensesSheet.active');
  await page.waitForSelector('#licensesBody pre', { timeout: 4000 });
  const licences = await page.evaluate(() => ({
    text: document.getElementById('licensesBody')?.textContent || '',
    focused: document.activeElement?.className || '',
    dialogs: document.querySelectorAll('[role="dialog"][aria-modal="true"]').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  ok(/Body Muscles/.test(licences.text), 'Licences shows the Body Muscles notice');
  ok(/This product includes software developed by Ivan Vulović/.test(licences.text), 'the upstream NOTICE is reproduced');
  ok(/Apache License/.test(licences.text), 'the Apache licence text is present');
  ok(licences.focused.includes('sheet-close-btn'), 'focus lands on the Licences close button');
  ok(licences.dialogs === 1, 'exactly one modal dialog is exposed');
  ok(!licences.overflow, 'the Licences sheet does not overflow');
  await page.click('#licensesSheet [data-action="close-licenses"]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !document.querySelector('#licensesSheet.active')), 'Licences closes');
  ok(await page.evaluate(() => document.activeElement?.getAttribute('data-action')) === 'open-licenses',
    'focus returns to the Licences row');
  await page.click('#settingsPageHost .s-back');
  await page.waitForSelector('#settingsPageHost .s-home');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();

  // Narrow/wide + opposite theme: the same page contract, no overflow.
  for (const [width, theme] of [[320, 'light'], [412, 'dark']]) {
    const ctx = await createBrowserContext(browser, { viewport: { width, height: 844 }, timezoneId: 'Australia/Sydney', colorScheme: theme });
    await ctx.addInitScript(([key, value]) => localStorage.setItem(key, value), ['hybrid_engine_v2_state', JSON.stringify({ ...state, settings: { ...state.settings, theme } })]);
    await ctx.addInitScript(pinClock, Date.parse('2026-11-20T09:00:00+11:00'));
    const p2 = await ctx.newPage();
    const errs = [];
    p2.on('pageerror', (error) => errs.push(String(error)));
    await p2.goto(base, { waitUntil: 'networkidle' });
    await p2.click('#homeSettingsBtn');
    await p2.waitForSelector('#settingsOverlay.active');
    for (const id of ['training.workout', 'once.look', 'once.equipment']) {
      await p2.click(`[data-action="open-settings-page"][data-context="${id}"]`);
      await p2.waitForSelector('#settingsPageHost .s-page');
      const overflow = await p2.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      const rows = await p2.locator('#settingsPageHost .s-row').count();
      ok(!overflow && rows > 0, `${width}px/${theme} ${id}: rows render without overflow`);
      await p2.click('#settingsPageHost .s-back');
      await p2.waitForSelector('#settingsPageHost .s-home');
    }
    ok(errs.length === 0, `${width}px/${theme}: no page errors`);
    await ctx.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`\nsettings-nav-browser-check: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nsettings-nav-browser-check: PASS — 13 pages, search, units, modules and data.');
