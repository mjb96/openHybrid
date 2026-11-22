// =============================================================================
// BODY WEIGHT BROWSER CHECK
// Seeds three weeks of weigh-ins plus a goal/corridor, then proves the Progress
// graph, weekly rate, range filter, weigh-in entry, goal editor and the
// measurements sheet's entered body-fat field work in the real app. No personal
// data.
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
const state = {
  schemaVersion: 8, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_bw', weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_bw', programId: 'hybrid_engine', startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
    targetWeight: 80, rateGoal: { dir: 'lose', by: '%', lo: 0.5, hi: 1 },
  },
  customPrograms: [],
  weeks: { '1': {
    activationId: 'act_bw', programId: 'hybrid_engine',
    dates: {}, lifts: {}, runs: {}, sessionStatus: {}, sessionSummary: {}, runSessions: {}, liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {},
  } },
  bodyWeightLog: [
    { date: '2026-10-30', weight: 88.2 }, { date: '2026-11-02', weight: 87.8 },
    { date: '2026-11-05', weight: 87.5 }, { date: '2026-11-08', weight: 87.1 },
    { date: '2026-11-11', weight: 86.8 }, { date: '2026-11-14', weight: 86.4 },
    { date: '2026-11-17', weight: 86.1 }, { date: '2026-11-19', weight: 85.9 },
  ],
  wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
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
  await page.waitForSelector('#homeBodyweightCard .home-bw__spark');
  const bwCard = await page.evaluate(() => {
    const card = document.getElementById('homeBodyweightCard');
    const row = card?.querySelector('.home-bw__line');
    return {
      height: card ? card.getBoundingClientRect().height : 0,
      rowHeight: row ? row.getBoundingClientRect().height : 0,
      action: row?.getAttribute('data-action') || '',
      openers: card?.querySelectorAll('[data-action="open-bw-sheet"]').length || 0,
      nestedButtons: card?.querySelectorAll('button button').length || 0,
      sparkHeight: card?.querySelector('.home-bw__spark')?.getBoundingClientRect().height || 0,
    };
  });
  ok(bwCard.height > 0 && bwCard.height < 100, `the Home card is one compact line (${Math.round(bwCard.height)}px)`);
  ok(bwCard.rowHeight >= 44, `the card row is ${Math.round(bwCard.rowHeight)}px, at least 44px`);
  ok(bwCard.action === 'open-bw-sheet' && bwCard.openers === 1, 'one row opens the prefilled weigh-in sheet');
  ok(bwCard.nestedButtons === 0, 'the row contains no nested button');
  ok(bwCard.sparkHeight >= 24 && bwCard.sparkHeight <= 32, `the spark is ${Math.round(bwCard.sparkHeight)}px tall`);
  ok(/85\.9 kg/.test(await page.locator('#homeBodyweightCard').innerText()), 'Home shows the latest weigh-in');
  await page.click('#homeBodyweightCard [data-action="open-bw-sheet"]');
  await page.waitForSelector('#bwSheet.active');
  ok((await page.locator('#bwSheetWeight').inputValue()) === '85.9', 'Home Log opens the prefilled sheet');
  await page.click('#bwSheet .sheet-close-btn');
  await page.waitForFunction(() => !document.getElementById('bwSheet')?.classList.contains('active'));

  await page.click('.nav-item[data-target="analytics"]');
  await page.waitForSelector('#view-analytics.active');
  await page.click('#view-analytics [data-action="open-analytics"][data-context="bodyweight"]:visible');
  await page.waitForSelector('#analytics-bodyweight.active');
  await page.waitForSelector('#bwChartContainer svg');

  const chart = await page.locator('#bwChartContainer').innerHTML();
  ok(/Goal 80 kg/.test(chart), 'the graph draws the goal line');
  ok(/7d avg/.test(chart), 'the graph draws the 7-day average');
  ok((chart.match(/<circle /g) || []).length >= 8, 'every weigh-in has a dot');

  const summary = await page.locator('#bwSummary').innerText();
  ok(/Trend/.test(summary), 'the weekly trend is shown');
  ok(/On pace/.test(summary), 'the rate corridor reports on pace');
  ok(/7-day average/.test(summary), 'the 7-day average is summarised');

  ok((await page.locator('#bwWeeklyStats .bw-week-row').count()) >= 3, 'weekly averages are listed');

  await page.click('[data-action="bw-range"][data-days="30"]');
  await page.waitForFunction(() => document.querySelector('[data-action="bw-range"][data-days="30"]')?.classList.contains('active'));
  ok(await page.locator('[data-action="bw-range"][data-days="30"]').evaluate((el) => el.classList.contains('active')), 'the 30-day range selects');

  ok(/Last 85\.9 kg/.test(await page.locator('#bwLastHint').innerText()), 'the log button shows the last weight');

  await page.click('#analytics-bodyweight [data-action="open-bw-sheet"]');
  await page.waitForSelector('#bwSheet.active');
  ok((await page.locator('#bwSheetWeight').inputValue()) === '85.9', 'the sheet prefills the last weight');
  ok((await page.locator('#bwSheetDate').inputValue()) === '2026-11-19', 'the sheet opens on today');
  await page.click('[data-action="bw-step"][data-delta="-0.1"]');
  ok((await page.locator('#bwSheetWeight').inputValue()) === '85.8', 'the stepper adjusts by 0.1');
  await page.click('[data-action="save-bw-sheet"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyWeightLog?.find((entry) => entry.date === '2026-11-19');
    return Number(day?.weight) === 85.8;
  }, STORAGE_KEY);
  ok(/85\.8 kg/.test(await page.locator('#bwSummary').innerText()), 'saving updates the latest weight');
  await page.waitForFunction(() => !document.getElementById('bwSheet')?.classList.contains('active'));

  await page.click('#analytics-bodyweight [data-action="open-bw-sheet"]');
  await page.waitForSelector('#bwSheet.active');
  ok((await page.locator('#bwSheetRecent .bw-sheet-recent-row').count()) >= 1, 'recent weigh-ins are one tap away');
  const deleteDate = await page.locator('[data-action="delete-bw-row"]').first().getAttribute('data-date');
  await page.click('[data-action="delete-bw-row"]');
  await page.waitForSelector('.cmodal [data-cm="ok"]');
  await page.click('.cmodal [data-cm="ok"]');
  await page.waitForFunction(([key, date]) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return !stored.bodyWeightLog?.some((entry) => entry.date === date);
  }, [STORAGE_KEY, deleteDate]);
  ok(true, 'delete removes a recent weigh-in');
  await page.waitForFunction(() => !document.getElementById('bwSheet')?.classList.contains('active'));

  await page.click('.bw-goal-editor summary');
  await page.fill('#bwGoalWeight', '79');
  await page.click('[data-action="save-bw-goal"]');
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}')?.settings?.targetWeight === 79, STORAGE_KEY);
  ok(/Goal 79 kg/.test(await page.locator('#bwChartContainer').innerHTML()), 'the goal weight updates the graph');

  // ---- body measurements --------------------------------------------------
  // The tape is the slow signal beside the scale: shared sheet, canonical cm,
  // a unit toggle that never rewrites stored data, and a date that cannot
  // inherit the previous day's numbers.
  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  ok((await page.locator('#measurementsSheetTitle').innerText()) === 'Log measurements', 'the measurements sheet opens in log mode');
  const bfField = await page.evaluate(() => {
    const input = document.getElementById('msSheet_bodyFat');
    const field = input?.closest('.ms-sheet-field');
    const grid = input?.closest('.ms-sheet-grid');
    return {
      type: input?.type || '',
      min: input?.getAttribute('min') || '',
      max: input?.getAttribute('max') || '',
      step: input?.getAttribute('step') || '',
      inputmode: input?.getAttribute('inputmode') || '',
      width: field?.getBoundingClientRect().width || 0,
      gridWidth: grid?.getBoundingClientRect().width || 0,
    };
  });
  ok(bfField.type === 'number' && bfField.min === '2' && bfField.max === '70' && bfField.step === '0.1' && bfField.inputmode === 'decimal',
    'body fat is a 2–70 percentage field with a 0.1 step');
  ok(bfField.width >= bfField.gridWidth - 2, `body fat spans the full sheet width (${Math.round(bfField.width)} of ${Math.round(bfField.gridWidth)}px)`);
  await page.fill('#msSheet_waist', '84.5');
  await page.fill('#msSheet_chest', '102');
  await page.fill('#msSheet_bodyFat', '18.4');
  await page.click('[data-action="save-measurements-sheet"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyMeasurements?.find((entry) => entry.date === '2026-11-19');
    return Number(day?.waist) === 84.5 && Number(day?.chest) === 102 && Number(day?.bodyFat) === 18.4;
  }, STORAGE_KEY);
  await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'));
  const cardText = () => page.locator('#bwMeasurements').innerText();
  const msTargets = await page.evaluate(() => {
    const box = (el) => (el ? Math.round(el.getBoundingClientRect().height) : 0);
    return {
      toggle: box(document.querySelector('#bwMeasurements [data-action="measurement-unit"][data-unit="cm"]')),
      log: box(document.querySelector('#bwMeasurements [data-action="open-ms-sheet"]')),
    };
  });
  ok(msTargets.toggle >= 44, `the unit toggle is ${msTargets.toggle}px, at least 44px`);
  ok(msTargets.log >= 44, `the Log measurements button is ${msTargets.log}px, at least 44px`);
  ok(/84\.5 cm/.test(await cardText()), 'the card shows the saved waist in centimetres');
  ok(/102\.0 cm/.test(await cardText()), 'the card shows the saved chest');
  ok(/body fat/i.test(await cardText()) && /18[.]4\s*%/.test(await cardText()), 'the card shows the entered body fat percentage');

  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  ok((await page.locator('#msSheet_waist').inputValue()) === '84.5', 'an existing date prefills its own numbers');
  ok((await page.locator('#msSheet_bodyFat').inputValue()) === '18.4', 'an existing date prefills its body fat');
  ok((await page.locator('#measurementsSheetTitle').innerText()) === 'Edit measurements', 'an existing date opens in edit mode');
  await page.fill('#msSheetDate', '2026-11-10');
  await page.locator('#msSheetDate').dispatchEvent('change');
  ok((await page.locator('#msSheet_waist').inputValue()) === '', 'another date starts blank instead of copying today');
  ok((await page.locator('#msSheet_bodyFat').inputValue()) === '', 'another date starts with a blank body fat field');
  ok((await page.locator('#msSheet_bodyFat').getAttribute('placeholder')) === '18.4', 'the last body fat reading is only a placeholder on a new date');
  ok((await page.locator('#measurementsSheetTitle').innerText()) === 'Log measurements', 'another date opens in log mode');
  await page.fill('#msSheet_waist', '85.5');
  await page.click('[data-action="save-measurements-sheet"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return stored.bodyMeasurements?.length === 2;
  }, STORAGE_KEY);
  ok(await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyMeasurements?.find((entry) => entry.date === '2026-11-10');
    return day && !('bodyFat' in day);
  }, STORAGE_KEY), 'a new date without a body-fat reading stores none');
  ok(/2 entries/.test(await cardText()), 'the card counts both measurement dates');

  await page.click('#bwMeasurements [data-action="measurement-unit"][data-unit="in"]');
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}')?.settings?.measurementUnit === 'in', STORAGE_KEY);
  ok(/33\.3 in/.test(await cardText()), 'the card reads inches after the unit toggle');
  ok(/18[.]4\s*%/.test(await cardText()), 'the unit toggle leaves body fat in percent');
  const storedCm = await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return stored.bodyMeasurements?.find((entry) => entry.date === '2026-11-19')?.waist;
  }, STORAGE_KEY);
  ok(storedCm === 84.5, 'changing the unit never rewrites stored centimetres');
  ok(await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return stored.bodyMeasurements?.find((entry) => entry.date === '2026-11-19')?.bodyFat === 18.4;
  }, STORAGE_KEY), 'changing the unit never rewrites stored body fat');

  // Deleting the date that owns the body-fat reading removes it from the card
  // as well as from the log. Open another date so the sheet's recent rows show
  // today's entry, then delete that row.
  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  await page.fill('#msSheetDate', '2026-11-10');
  await page.locator('#msSheetDate').dispatchEvent('change');
  ok((await page.locator('#msSheetRecent .bw-sheet-recent-row').count()) >= 1, 'other measurement dates are one tap away');
  ok((await page.locator('[data-action="delete-ms-row"]').first().getAttribute('data-date')) === '2026-11-19', 'the body-fat date is listed for deletion');
  await page.click('[data-action="delete-ms-row"]');
  await page.waitForSelector('.cmodal [data-cm="ok"]');
  await page.click('.cmodal [data-cm="ok"]');
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}')?.bodyMeasurements?.length === 1, STORAGE_KEY);
  ok(await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyMeasurements?.[0];
    return day?.date === '2026-11-10' && !('bodyFat' in day);
  }, STORAGE_KEY), 'delete removes the body-fat entry with its date');
  ok(!/body fat/i.test(await cardText()), 'deleting the body-fat entry removes it from the card');
  await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'));

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();

  // One narrow context: the full-width body-fat field must still fit a 320px
  // phone and must not push the sheet sideways.
  const narrowContext = await createBrowserContext(browser, { viewport: { width: 320, height: 700 }, timezoneId: 'Australia/Sydney' });
  await narrowContext.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(state)]);
  await narrowContext.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  const narrowPage = await narrowContext.newPage();
  await narrowPage.goto(base, { waitUntil: 'networkidle' });
  await narrowPage.waitForSelector('#homeWeekStrip');
  await narrowPage.click('.nav-item[data-target="analytics"]');
  await narrowPage.waitForSelector('#view-analytics.active');
  await narrowPage.click('#view-analytics [data-action="open-analytics"][data-context="bodyweight"]:visible');
  await narrowPage.waitForSelector('#analytics-bodyweight.active');
  await narrowPage.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await narrowPage.waitForSelector('#measurementsSheet.active');
  const narrowFit = await narrowPage.evaluate(() => {
    const input = document.getElementById('msSheet_bodyFat');
    const rect = input?.getBoundingClientRect();
    return {
      left: rect?.left ?? -1,
      right: rect?.right ?? -1,
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      label: input?.closest('.ms-sheet-field')?.querySelector('span')?.textContent || '',
    };
  });
  ok(narrowFit.label === 'Body fat (%)', 'the narrow sheet labels the body-fat field');
  ok(narrowFit.left >= 0 && narrowFit.right <= narrowFit.viewport, `the body-fat field fits a 320px viewport (${Math.round(narrowFit.left)}–${Math.round(narrowFit.right)} of ${narrowFit.viewport})`);
  ok(narrowFit.scrollWidth <= narrowFit.viewport + 1, `the 320px sheet does not overflow sideways (${narrowFit.scrollWidth}px)`);
  await narrowContext.close();
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  console.error(`bodyweight-browser-check: FAIL — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('bodyweight-browser-check: PASS — graph, goal line, weekly rate, range, weight entry, measurements and body fat.');
