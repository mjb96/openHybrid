// =============================================================================
// EQUIPMENT PROFILES BROWSER CHECK
// Seeds two synthetic gyms (commercial + home) and proves that switching a
// profile projects its kit into the Settings checkboxes, adding/renaming/
// deleting profiles works, and the choice persists. No personal data involved.
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
  id: 'equipment_profile_test', name: 'Equipment Profile Test', totalWeeks: 4,
  days: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [
    d, { title: d, lifts: ['Back Squat'], runs: 'Rest' },
  ])),
};
const gymEquipment = { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true, bands: false, kettlebells: true, ezBar: true, treadmill: true };
const homeEquipment = { barbell: true, rack: false, dumbbells: true, cables: false, pullupBar: true, bands: true, kettlebells: false, ezBar: false, treadmill: false };
const state = {
  schemaVersion: 6, currentWeek: '1', activeProgramId: program.id, activeActivationId: 'act_equipment', weekStartedAt: todayISO,
  activations: [{ id: 'act_equipment', programId: program.id, startWeek: 1, status: 'active', startedAt: todayISO }],
  settings: {
    name: 'Browser', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'strength', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { ...gymEquipment },
    bandWeights: { L: 10, M: 20, H: 30 },
    equipmentProfiles: [
      {
        id: 'eqp_gym', name: 'Commercial gym', equipment: { ...gymEquipment }, bandWeights: { L: 10, M: 20, H: 30 },
        plateSetup: { kg: { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] }, lb: { bar: 45, plates: [45, 35, 25, 10, 5, 2.5] } },
      },
      {
        id: 'eqp_home', name: 'Home', equipment: { ...homeEquipment }, bandWeights: { L: 5, M: 15, H: 25 },
        plateSetup: { kg: { bar: 15, plates: [20, 10, 5, 2.5] }, lb: { bar: 35, plates: [45, 25, 10] } },
      },
    ],
    activeEquipmentProfileId: 'eqp_gym',
  },
  customPrograms: [program],
  weeks: { '1': {
    activationId: 'act_equipment', programId: program.id,
    dates: { mon: '2026-11-16', tue: '2026-11-17', wed: '2026-11-18', thu: '2026-11-19', fri: '2026-11-20', sat: '2026-11-21', sun: '2026-11-22' },
    lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {},
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

  await page.click('#homeSettingsBtn');
  await page.waitForSelector('#settingsOverlay.active');
  await page.click('[data-action="open-settings-page"][data-context="once.equipment"]');
  await page.waitForSelector('#settingsPageHost .s-page');

  const select = page.locator('#settingsEquipmentProfile');
  const nameInput = page.locator('#settingsEquipmentProfileName');
  const cables = page.locator('[data-equipment="cables"]');
  const bands = page.locator('[data-equipment="bands"]');
  const plateBar = page.locator('#settingsPlateBar');
  const platesInput = page.locator('#settingsPlates');

  ok((await select.locator('option').allTextContents()).join('|') === 'Commercial gym|Home', 'both profiles are listed');
  ok((await select.inputValue()) === 'eqp_gym', 'the stored active profile is selected');
  ok((await nameInput.inputValue()) === 'Commercial gym', 'the name field shows the active profile');
  ok(await cables.isChecked(), 'commercial gym has cables checked');
  ok(!(await bands.isChecked()), 'commercial gym has bands unchecked');
  ok((await plateBar.inputValue()) === '20', 'the gym bar weight is shown');
  ok((await platesInput.inputValue()) === '25, 20, 15, 10, 5, 2.5, 1.25', 'the gym plate set is shown');

  await select.selectOption('eqp_home');
  await page.waitForFunction(() => document.getElementById('settingsEquipmentProfileName')?.value === 'Home');
  ok((await nameInput.inputValue()) === 'Home', 'switching profiles updates the name field');
  ok(!(await cables.isChecked()), 'home profile hides cables');
  ok(await bands.isChecked(), 'home profile shows bands');
  ok((await page.locator('#settingsBandMed').inputValue()) === '15', 'home band weights replace the gym values');
  ok((await plateBar.inputValue()) === '15', 'switching profiles loads that gym bar weight');
  ok((await platesInput.inputValue()) === '20, 10, 5, 2.5', 'switching profiles loads that gym plate set');

  await page.click('#settingsPageHost .s-back');
  await page.waitForSelector('#settingsPageHost .s-home');
  await page.click('[data-action="open-settings-page"][data-context="once.units"]');
  await page.waitForSelector('#settingsPageHost .s-page');
  await page.click('[data-setting-segment="weightUnit"][data-value="lbs"]');
  await page.waitForSelector('.cmodal__btn--ok');
  await page.click('.cmodal__btn--ok');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}')?.settings?.weightUnit === 'lbs');
  await page.click('#settingsPageHost .s-back');
  await page.waitForSelector('#settingsPageHost .s-home');
  await page.click('[data-action="open-settings-page"][data-context="once.equipment"]');
  await page.waitForSelector('#settingsPageHost .s-page');
  await page.waitForFunction(() => document.getElementById('settingsPlateBar')?.value === '35');
  ok((await platesInput.inputValue()) === '45, 25, 10', 'the lb setup is stored separately');
  await page.click('#settingsPageHost .s-back');
  await page.waitForSelector('#settingsPageHost .s-home');
  await page.click('[data-action="open-settings-page"][data-context="once.units"]');
  await page.waitForSelector('#settingsPageHost .s-page');
  await page.click('[data-setting-segment="weightUnit"][data-value="kg"]');
  await page.waitForSelector('.cmodal__btn--ok');
  await page.click('.cmodal__btn--ok');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}')?.settings?.weightUnit === 'kg');
  await page.click('#settingsPageHost .s-back');
  await page.waitForSelector('#settingsPageHost .s-home');
  await page.click('[data-action="open-settings-page"][data-context="once.equipment"]');
  await page.waitForSelector('#settingsPageHost .s-page');
  await page.waitForFunction(() => document.getElementById('settingsPlateBar')?.value === '15');
  ok((await platesInput.inputValue()) === '20, 10, 5, 2.5', 'switching back restores the kg setup');

  await platesInput.fill('20, 10, 5');
  await platesInput.press('Tab');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const home = stored?.settings?.equipmentProfiles?.find((p) => p.id === 'eqp_home');
    return home?.plateSetup?.kg?.plates?.length === 3;
  }, STORAGE_KEY);
  ok((await platesInput.inputValue()) === '20, 10, 5', 'editing plates saves the active profile');

  // Optional inventory: counts, dumbbell ladder, machine stack.
  await page.locator('[data-plate-count="20"]').fill('1');
  await page.locator('[data-plate-count="20"]').press('Tab');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const home = stored?.settings?.equipmentProfiles?.find((p) => p.id === 'eqp_home');
    return home?.plateSetup?.kg?.counts?.['20'] === 1;
  }, STORAGE_KEY);
  ok(true, 'plate pair counts save per size');

  await page.locator('#settingsDumbbells').fill('5, 7.5, 10');
  await page.locator('#settingsDumbbells').press('Tab');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const home = stored?.settings?.equipmentProfiles?.find((p) => p.id === 'eqp_home');
    return home?.dumbbells?.kg?.length === 3;
  }, STORAGE_KEY);
  ok((await page.locator('#settingsDumbbells').inputValue()) === '5, 7.5, 10', 'dumbbell ladder saves');

  await page.selectOption('#settingsStackExercise', 'leg_press');
  await page.locator('#settingsStackWeights').fill('10, 20, 30');
  await page.click('[data-action="save-machine-stack"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const home = stored?.settings?.equipmentProfiles?.find((p) => p.id === 'eqp_home');
    return home?.machineStacks?.leg_press?.weights?.length === 3;
  }, STORAGE_KEY);
  ok((await page.locator('#settingsStackList').textContent()).includes('Leg Press'), 'machine stack saves and lists');
  await page.click('[data-action="remove-machine-stack"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const home = stored?.settings?.equipmentProfiles?.find((p) => p.id === 'eqp_home');
    return !home?.machineStacks?.leg_press;
  }, STORAGE_KEY);
  ok(!(await page.locator('#settingsStackList').textContent()).includes('Leg Press'), 'machine stack can be removed');
  await nameInput.fill('Garage');
  await nameInput.press('Tab');
  await page.waitForFunction(() => [...document.querySelectorAll('#settingsEquipmentProfile option')].some((o) => o.textContent === 'Garage'));
  ok((await select.locator('option').allTextContents()).includes('Garage'), 'renaming updates the profile selector');

  await page.click('[data-action="equipment-profile-add"]');
  await page.waitForFunction(() => document.querySelectorAll('#settingsEquipmentProfile option').length === 3);
  ok((await page.locator('#settingsEquipmentProfile option').count()) === 3, 'adding a profile appends one option');
  ok((await nameInput.inputValue()).startsWith('Gym '), 'the new profile gets a usable default name');
  ok(await bands.isChecked(), 'the new profile starts from the active kit');
  ok((await plateBar.inputValue()) === '15', 'the new profile starts from the active bar weight');
  ok((await platesInput.inputValue()) === '20, 10, 5', 'the new profile starts from the active plate set');

  await page.click('[data-action="equipment-profile-delete"]');
  await page.waitForSelector('.cmodal [data-cm="ok"]');
  await page.click('.cmodal [data-cm="ok"]');
  await page.waitForFunction(() => document.querySelectorAll('#settingsEquipmentProfile option').length === 2);
  ok((await page.locator('#settingsEquipmentProfile option').count()) === 2, 'deleting removes the active profile');
  ok((await nameInput.inputValue()) === 'Commercial gym', 'deleting the active profile falls back to the first one');
  ok((await plateBar.inputValue()) === '20', 'the fallback profile restores its own bar weight');

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
  ok(stored?.settings?.equipmentProfiles?.length === 2, 'profile changes are persisted');
  ok(stored?.settings?.equipmentProfiles?.some((p) => p.name === 'Garage'), 'the rename is persisted');
  ok(stored?.settings?.equipment?.cables === true, 'the active kit is projected into the legacy equipment field');
  const garage = stored?.settings?.equipmentProfiles?.find((p) => p.name === 'Garage');
  ok(garage?.plateSetup?.kg?.plates?.length === 3, 'the edited plate set is persisted');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  console.error(`equipment-profiles-browser-check: FAIL — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('equipment-profiles-browser-check: PASS — synthetic gyms, switching, add/rename/delete and persistence.');
