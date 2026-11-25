// =============================================================================
// BODY WEIGHT BROWSER CHECK
// Seeds three weeks of weigh-ins plus a goal/corridor, then proves the Progress
// graph, weekly rate, range filter, weigh-in entry, goal editor and the
// measurements sheet's entered body-fat field work in the real app. No personal
// data.
// =============================================================================
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await resolveChromium();
if (!runtime) process.exit(process.argv.includes('--required') ? 1 : 0);
const { chromium, executablePath } = runtime;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const shotArg = process.argv.find((arg) => arg.startsWith('--screenshot='));
const shotPath = shotArg ? shotArg.slice('--screenshot='.length) : '';
const trendShotArg = process.argv.find((arg) => arg.startsWith('--trend-screenshot='));
const trendShotPath = trendShotArg ? trendShotArg.slice('--trend-screenshot='.length) : '';
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
  // A pre-14-site reading: it must stay readable, appear on the card and survive
  // an edit made in the new bilateral sheet.
  bodyMeasurements: [{ date: '2026-11-05', arm: 36, thigh: 58 }],
};
const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
/** @param {import('playwright').Page} target */
async function ensureBilateralOpen(target) {
  const open = await target.locator('#measurementsSheet .ms-sheet-more').evaluate((el) => /** @type {HTMLDetailsElement} */ (el).open);
  if (open) return;
  await target.click('#measurementsSheet .ms-sheet-more summary');
  await target.waitForSelector('#measurementsSheet .ms-sheet-more[open]');
}
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
      rowHeight: row ? row.getBoundingClientRect().height : 0,
      action: row?.getAttribute('data-action') || '',
      sheetOpeners: card?.querySelectorAll('[data-action="open-bw-sheet"]').length || 0,
      nestedButtons: card?.querySelectorAll('button button').length || 0,
    };
  });
  ok(bwCard.rowHeight >= 44, `the card row is ${Math.round(bwCard.rowHeight)}px, at least 44px`);
  ok(bwCard.action === 'open-bw-sheet' && bwCard.sheetOpeners === 1, 'one row opens the prefilled weigh-in sheet');
  ok(bwCard.nestedButtons === 0, 'the row contains no nested button');
  const homeChart = await page.locator('#homeBodyweightCard .home-bw__spark').innerHTML();
  ok((homeChart.match(/<circle /g) || []).length >= 8, 'the Home chart plots every weigh-in, not just a trend line');
  ok(/stroke-dasharray/.test(homeChart), 'the Home chart draws the goal line');
  ok(/var\(--data-2\)/.test(homeChart), 'the Home chart draws the 7-day average');
  const homePlotBox = await page.locator('#homeBodyweightCard .home-bw__spark').boundingBox();
  ok(!!homePlotBox && homePlotBox.height >= 100, `the Home chart is a real chart (${Math.round(homePlotBox?.height || 0)}px tall)`);
  ok(/85\.9 kg/.test(await page.locator('#homeBodyweightCard').innerText()), 'Home shows the latest weigh-in');
  await page.click('#homeBodyweightCard [data-action="open-bw-sheet"]');
  await page.waitForSelector('#bwSheet.active');
  ok((await page.locator('#bwSheetWeight').inputValue()) === '85.9', 'Home Log opens the prefilled sheet');
  // The soft keyboard must not open on its own: focus belongs on the sheet's
  // close button, not the number field. (A focused input is what raises it.)
  ok((await page.evaluate(() => document.activeElement?.id)) !== 'bwSheetWeight', 'opening the weigh-in sheet does not focus the weight input');
  ok((await page.evaluate(() => document.activeElement?.classList?.contains('sheet-close-btn'))) === true, 'focus starts on the sheet close button');
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
  ok((await page.locator('#msSheet_arm').count()) === 0, 'the old single Arm input is gone, not a hidden duplicate');
  const moreClosed = await page.evaluate(() => {
    const more = document.querySelector('#measurementsSheet .ms-sheet-more');
    return { open: more?.open ?? null, summary: more?.querySelector('summary')?.textContent || '', height: more?.querySelector('summary')?.getBoundingClientRect().height || 0 };
  });
  ok(moreClosed.open === false && /arms, thighs and calves/i.test(moreClosed.summary), 'bilateral sites sit behind a closed disclosure');
  ok(moreClosed.height >= 44, `the bilateral disclosure is ${Math.round(moreClosed.height)}px, at least 44px`);
  await page.click('#measurementsSheet .ms-sheet-more summary');
  await page.waitForSelector('#measurementsSheet .ms-sheet-more[open]');
  await page.fill('#msSheet_shoulders', '120');
  await page.fill('#msSheet_glutes', '100');
  await page.fill('#msSheet_arm_l', '34');
  await page.fill('#msSheet_arm_r', '35');
  await page.fill('#msSheet_forearm_l', '27');
  await page.fill('#msSheet_forearm_r', '28');
  await page.fill('#msSheet_thigh_l', '55');
  await page.fill('#msSheet_thigh_r', '56');
  await page.fill('#msSheet_calf_l', '37');
  await page.fill('#msSheet_calf_r', '38');
  await page.fill('#msSheet_waist', '84.5');
  await page.fill('#msSheet_chest', '102');
  await page.fill('#msSheet_bodyFat', '18.4');
  await page.click('[data-action="save-measurements-sheet"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyMeasurements?.find((entry) => entry.date === '2026-11-19');
    return Number(day?.waist) === 84.5 && Number(day?.chest) === 102 && Number(day?.bodyFat) === 18.4
      && Number(day?.shoulders) === 120 && Number(day?.glutes) === 100
      && Number(day?.arm_l) === 34 && Number(day?.arm_r) === 35
      && Number(day?.forearm_l) === 27 && Number(day?.forearm_r) === 28
      && Number(day?.thigh_l) === 55 && Number(day?.thigh_r) === 56
      && Number(day?.calf_l) === 37 && Number(day?.calf_r) === 38;
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
  ok(/120\.0 cm/.test(await cardText()), 'the card shows shoulders');
  ok(/100\.0 cm/.test(await cardText()), 'the card shows glutes');
  ok(/arm l/i.test(await cardText()) && /34\.0 cm/.test(await cardText()), 'the card shows the left arm reading');
  ok(/arm r/i.test(await cardText()) && /35\.0 cm/.test(await cardText()), 'the card shows the right arm reading');
  ok(/forearm l/i.test(await cardText()) && /27\.0 cm/.test(await cardText()), 'the card shows the left forearm reading');
  ok(/forearm r/i.test(await cardText()) && /28\.0 cm/.test(await cardText()), 'the card shows the right forearm reading');
  ok(/thigh l/i.test(await cardText()) && /55\.0 cm/.test(await cardText()), 'the card shows the left thigh reading');
  ok(/calf r/i.test(await cardText()) && /38\.0 cm/.test(await cardText()), 'the card shows the right calf reading');
  ok(/body fat/i.test(await cardText()) && /18[.]4\s*%/.test(await cardText()), 'the card shows the entered body fat percentage');
  ok(/arm \(old\)/i.test(await cardText()) && /36\.0 cm/.test(await cardText()), 'the card keeps a legacy Arm reading visible');

  if (shotPath) {
    // The requested file is the card; its `-sheet` companion is the same
    // bilateral sheet with the disclosure open, because a bottom sheet covers
    // the card it belongs to.
    await page.waitForTimeout(2600);
    await page.evaluate(() => document.getElementById('bwMeasurements')?.scrollIntoView({ block: 'center' }));
    await mkdir(path.dirname(shotPath), { recursive: true });
    await page.screenshot({ path: shotPath });
    console.log(`  shot · ${shotPath}`);
    await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
    await page.waitForSelector('#measurementsSheet.active');
    await ensureBilateralOpen(page);
    const sheetShot = shotPath.replace(/\.png$/i, '-sheet.png');
    await page.screenshot({ path: sheetShot });
    console.log(`  shot · ${sheetShot}`);
    await page.click('#measurementsSheet .sheet-close-btn');
    await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'));
  }

  // Editing an old single-Arm/Thigh date must carry those readings across:
  // the new sheet has no input that could represent them.
  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  await page.fill('#msSheetDate', '2026-11-05');
  await page.locator('#msSheetDate').dispatchEvent('change');
  ok((await page.locator('#measurementsSheetTitle').innerText()) === 'Edit measurements', 'the legacy date opens in edit mode');
  ok((await page.locator('#msSheet_waist').inputValue()) === '', 'the legacy date has no canonical reading to prefill');
  const legacyDetails = await page.evaluate(() => {
    const more = document.querySelector('#measurementsSheet .ms-sheet-more');
    return { open: more?.open ?? null, summary: more?.querySelector('summary')?.textContent || '' };
  });
  ok(legacyDetails.open === false && !/recorded/.test(legacyDetails.summary), 'a legacy-only date keeps the disclosure closed');
  await page.fill('#msSheet_waist', '81');
  await page.click('[data-action="save-measurements-sheet"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyMeasurements?.find((entry) => entry.date === '2026-11-05');
    return Number(day?.waist) === 81 && Number(day?.arm) === 36 && Number(day?.thigh) === 58;
  }, STORAGE_KEY);
  await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'));
  ok(/waist/i.test(await cardText()) && /\+3\.5/.test(await cardText()), 'the edited legacy date now feeds the waist trend');
  ok(/arm \(old\)/i.test(await cardText()) && /36\.0 cm/.test(await cardText()), 'editing another site preserves the legacy Arm');
  ok(/thigh \(old\)/i.test(await cardText()) && /58\.0 cm/.test(await cardText()), 'editing another site preserves the legacy Thigh');

  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  ok((await page.locator('#msSheet_waist').inputValue()) === '84.5', 'an existing date prefills its own numbers');
  ok((await page.locator('#msSheet_bodyFat').inputValue()) === '18.4', 'an existing date prefills its body fat');
  ok((await page.locator('#measurementsSheetTitle').innerText()) === 'Edit measurements', 'an existing date opens in edit mode');
  const bilateralOpen = await page.evaluate(() => {
    const more = document.querySelector('#measurementsSheet .ms-sheet-more');
    return { open: more?.open ?? null, summary: more?.querySelector('summary')?.textContent || '' };
  });
  ok(bilateralOpen.open === true, 'editing a date with bilateral readings opens the disclosure');
  ok(/8 recorded/.test(bilateralOpen.summary), 'the disclosure echoes the recorded bilateral count (8)');
  await page.fill('#msSheetDate', '2026-11-10');
  await page.locator('#msSheetDate').dispatchEvent('change');
  ok((await page.locator('#msSheet_waist').inputValue()) === '', 'another date starts blank instead of copying today');
  ok((await page.locator('#msSheet_bodyFat').inputValue()) === '', 'another date starts with a blank body fat field');
  ok((await page.locator('#msSheet_bodyFat').getAttribute('placeholder')) === '%', 'a future body-fat reading is never a placeholder for an earlier date');
  ok((await page.locator('#measurementsSheetTitle').innerText()) === 'Log measurements', 'another date opens in log mode');
  const oneBilateral = await page.evaluate(() => {
    const more = document.querySelector('#measurementsSheet .ms-sheet-more');
    return { open: more?.open ?? null, summary: more?.querySelector('summary')?.textContent || '' };
  });
  ok(oneBilateral.open === false && !/recorded/.test(oneBilateral.summary), 'a new date starts with the disclosure closed');
  await page.fill('#msSheet_waist', '85.5');
  await page.fill('#msSheet_bodyFat', '19.0');
  await ensureBilateralOpen(page);
  await page.fill('#msSheet_arm_l', '33');
  await page.click('[data-action="save-measurements-sheet"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return stored.bodyMeasurements?.length === 3;
  }, STORAGE_KEY);
  ok(await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyMeasurements?.find((entry) => entry.date === '2026-11-10');
    return day?.bodyFat === 19;
  }, STORAGE_KEY), 'the earlier date stores its own body-fat reading');
  ok(/3 entries/.test(await cardText()), 'the card counts the two canonical dates and the preserved legacy date');

  const bfDelta = page.locator('#bwMeasurements .bw-ms-site--bodyfat .bw-ms-delta');
  ok((await bfDelta.innerText()) === '-0.6 pp', 'the card reports the body-fat change in percentage points');
  ok((await bfDelta.getAttribute('title')) === 'Change in percentage points', 'the body-fat delta is titled as percentage points');

  // ---- per-site trend -----------------------------------------------------
  // Every measured cell is a toggle: one tap draws that site's history below
  // the grid, a second tap collapses it, and nothing else re-renders.
  const siteTargets = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('#bwMeasurements .bw-ms-site')];
    return {
      count: cells.length,
      minHeight: cells.length ? Math.min(...cells.map((cell) => cell.getBoundingClientRect().height)) : 0,
      tags: [...new Set(cells.map((cell) => cell.tagName))],
      action: cells[0]?.getAttribute('data-action') || '',
      pressed: cells[0]?.getAttribute('aria-pressed') || '',
    };
  });
  ok(siteTargets.count === 15, `every measured site and body fat is a control (${siteTargets.count})`);
  ok(siteTargets.minHeight >= 44, `the smallest site control is ${Math.round(siteTargets.minHeight)}px, at least 44px`);
  ok(siteTargets.tags.length === 1 && siteTargets.tags[0] === 'BUTTON', 'site cells are buttons');
  ok(siteTargets.action === 'measurement-site' && siteTargets.pressed === 'false', 'a site control starts unpressed');

  const forearmLeft = '#bwMeasurements [data-action="measurement-site"][data-site="forearm_l"]';
  await page.click(forearmLeft);
  await page.waitForSelector('#bwMsTrend .bw-ms-trend-note');
  ok(await page.evaluate(() => {
    const button = document.querySelector('#bwMeasurements [data-action="measurement-site"][data-site="forearm_l"]');
    const container = document.getElementById('bwMsTrend');
    return button?.getAttribute('aria-pressed') === 'true'
      && !container?.querySelector('svg')
      && /One Forearm L reading logged \(27\.0 cm\)\. Log another to see the trend\./.test(container?.textContent || '');
  }), 'a one-reading site explains the missing trend instead of drawing a line');
  await page.click(forearmLeft);
  await page.waitForFunction(() => document.getElementById('bwMsTrend')?.hidden === true);

  const armLeft = '#bwMeasurements [data-action="measurement-site"][data-site="arm_l"]';
  await page.click(armLeft);
  await page.waitForSelector('#bwMsTrend svg');
  const trendOpen = await page.evaluate(() => {
    const button = document.querySelector('#bwMeasurements [data-action="measurement-site"][data-site="arm_l"]');
    const container = document.getElementById('bwMsTrend');
    const rect = container?.getBoundingClientRect();
    return {
      pressed: button?.getAttribute('aria-pressed') || '',
      active: button?.classList.contains('active') || false,
      hidden: container?.hidden ?? null,
      svg: Boolean(container?.querySelector('svg')),
      path: Boolean(container?.querySelector('svg path.bw-site-line')),
      dots: container?.querySelectorAll('svg circle.bw-site-dot').length || 0,
      labels: container?.textContent || '',
      others: [...document.querySelectorAll('#bwMeasurements [data-action="measurement-site"]')]
        .filter((cell) => cell !== button && cell.getAttribute('aria-pressed') === 'true').length,
      left: rect?.left ?? -1,
      right: rect?.right ?? -1,
      viewport: window.innerWidth,
    };
  });
  ok(trendOpen.pressed === 'true' && trendOpen.active, 'tapping Arm L marks it pressed');
  ok(trendOpen.hidden === false && trendOpen.svg && trendOpen.path, 'tapping Arm L draws an SVG trend line');
  ok(trendOpen.dots === 2, `the Arm L chart plots both readings (${trendOpen.dots})`);
  ok(/33[.]0 cm/.test(trendOpen.labels) && /34[.]0 cm/.test(trendOpen.labels), 'the chart labels the two arm readings');
  ok(trendOpen.others === 0, 'only one site is selected at a time');
  ok(trendOpen.left >= 0 && trendOpen.right <= trendOpen.viewport, `the trend fits the 390px card (${Math.round(trendOpen.left)}–${Math.round(trendOpen.right)} of ${trendOpen.viewport})`);

  if (trendShotPath) {
    await page.waitForTimeout(2600);
    await page.evaluate(() => document.getElementById('bwMsTrend')?.scrollIntoView({ block: 'center' }));
    await mkdir(path.dirname(trendShotPath), { recursive: true });
    await page.screenshot({ path: trendShotPath });
    console.log(`  shot · ${trendShotPath}`);
  }

  await page.click(armLeft);
  await page.waitForFunction(() => document.getElementById('bwMsTrend')?.hidden === true);
  ok(await page.evaluate(() => {
    const button = document.querySelector('#bwMeasurements [data-action="measurement-site"][data-site="arm_l"]');
    const container = document.getElementById('bwMsTrend');
    return button?.getAttribute('aria-pressed') === 'false' && !button?.classList.contains('active')
      && container?.hidden === true && !container?.querySelector('svg');
  }), 'tapping the active site again collapses the chart');

  await page.click('#bwMeasurements [data-action="measurement-site"][data-site="bodyFat"]');
  await page.waitForSelector('#bwMsTrend svg');
  ok(await page.evaluate(() => {
    const container = document.getElementById('bwMsTrend');
    return /Body fat trend \(%\)/.test(container?.innerHTML || '')
      && /%<\/text>/.test(container?.innerHTML || '');
  }), 'body fat uses the percentage scale');
  await page.click('#bwMeasurements [data-action="measurement-site"][data-site="bodyFat"]');
  await page.waitForFunction(() => document.getElementById('bwMsTrend')?.hidden === true);

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

  const armDeltaIn = page.locator('#bwMeasurements [data-site="arm_l"] .bw-ms-delta');
  ok((await armDeltaIn.innerText()) === '+0.4', 'the card delta converts to inches too (+0.4, not +1)');
  await page.click(armLeft);
  await page.waitForSelector('#bwMsTrend svg');
  const inchTrend = await page.evaluate(() => {
    const container = document.getElementById('bwMsTrend');
    return {
      text: container?.textContent || '',
      aria: container?.querySelector('svg')?.getAttribute('aria-label') || '',
    };
  });
  ok(/13\.0 in/.test(inchTrend.text) && /13\.4 in/.test(inchTrend.text) && !/cm/.test(inchTrend.text),
    'the open chart repaints with inch values and no centimetre label');
  ok(/Arm L trend \(in\): 13\.0 in on 10\/11, 13\.4 in on 19\/11, \+0\.4 in/.test(inchTrend.aria),
    'the chart aria-label carries the display unit, first/latest and change');
  await page.click(armLeft);
  await page.waitForFunction(() => document.getElementById('bwMsTrend')?.hidden === true);
  await page.click(forearmLeft);
  await page.waitForSelector('#bwMsTrend .bw-ms-trend-note');
  ok(/10\.6 in/.test(await page.locator('#bwMsTrend').innerText()) && !/cm/.test(await page.locator('#bwMsTrend').innerText()),
    'a one-reading note uses the active display unit too');
  await page.click(forearmLeft);
  await page.waitForFunction(() => document.getElementById('bwMsTrend')?.hidden === true);

  await page.click('#bwMeasurements [data-action="measurement-unit"][data-unit="cm"]');
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}')?.settings?.measurementUnit === 'cm', STORAGE_KEY);

  // Editing a tape site must not drop the body-fat reading stored on that date.
  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  await page.fill('#msSheet_waist', '84.6');
  await page.click('[data-action="save-measurements-sheet"]');
  await page.waitForFunction((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyMeasurements?.find((entry) => entry.date === '2026-11-19');
    return Number(day?.waist) === 84.6 && Number(day?.bodyFat) === 18.4;
  }, STORAGE_KEY);
  ok(true, 'editing another site preserves the stored body fat');
  await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'));

  // The placeholder is the latest body-fat reading ON OR BEFORE the chosen
  // date: 19.0 on the 10th is valid for the 12th, while 18.4 on the 19th is not.
  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  await page.fill('#msSheetDate', '2026-11-12');
  await page.locator('#msSheetDate').dispatchEvent('change');
  ok((await page.locator('#msSheet_bodyFat').inputValue()) === '', 'a date without a body-fat entry starts blank');
  ok((await page.locator('#msSheet_bodyFat').getAttribute('placeholder')) === '19', 'the placeholder is the latest body-fat reading on or before the chosen date');
  ok((await page.locator('#msSheet_waist').getAttribute('placeholder')) === '85.5', 'the tape placeholder is the latest reading on or before a back-dated entry');
  ok((await page.locator('#msSheet_arm_l').getAttribute('placeholder')) === '33', 'the bilateral placeholder is also on or before, not the newest');
  await page.fill('#msSheetDate', '2026-11-05');
  await page.locator('#msSheetDate').dispatchEvent('change');
  ok((await page.locator('#msSheet_bodyFat').getAttribute('placeholder')) === '%', 'no body-fat reading is offered before the first one');
  await page.fill('#msSheetDate', '2026-11-04');
  await page.locator('#msSheetDate').dispatchEvent('change');
  ok((await page.locator('#msSheet_waist').getAttribute('placeholder')) === 'cm', 'no tape reading is suggested before the first one');
  ok((await page.locator('#msSheet_bodyFat').getAttribute('placeholder')) === '%', 'no body-fat reading is suggested before the first one either');
  await page.click('#measurementsSheet .sheet-close-btn');
  await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'));

  // Deleting the date that owns the newer body-fat reading leaves the older
  // one; deleting that too removes body fat from the card entirely.
  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  await page.fill('#msSheetDate', '2026-11-10');
  await page.locator('#msSheetDate').dispatchEvent('change');
  const reEditBilateral = await page.evaluate(() => {
    const more = document.querySelector('#measurementsSheet .ms-sheet-more');
    return { open: more?.open ?? null, summary: more?.querySelector('summary')?.textContent || '' };
  });
  ok(reEditBilateral.open === true && /1 recorded/.test(reEditBilateral.summary), 'editing the saved date reopens the disclosure and counts 1');
  ok((await page.locator('#msSheetRecent .bw-sheet-recent-row').count()) >= 1, 'other measurement dates are one tap away');
  ok((await page.locator('[data-action="delete-ms-row"]').first().getAttribute('data-date')) === '2026-11-19', 'the body-fat date is listed for deletion');
  ok(/\+9 more/.test(await page.locator('#msSheetRecent .bw-sheet-recent-row strong').first().innerText()), 'a recent summary caps at four values plus the remaining count');
  await page.click('[data-action="delete-ms-row"]');
  await page.waitForSelector('.cmodal [data-cm="ok"]');
  await page.click('.cmodal [data-cm="ok"]');
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}')?.bodyMeasurements?.length === 2, STORAGE_KEY);
  ok(await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const day = stored.bodyMeasurements?.find((entry) => entry.date === '2026-11-10');
    return Number(day?.bodyFat) === 19;
  }, STORAGE_KEY), 'delete removes the newer body-fat entry with its date');
  ok(/19[.]0\s*%/.test(await cardText()), 'the older body-fat reading remains on the card');
  await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'));

  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  await page.fill('#msSheetDate', '2026-11-09');
  await page.locator('#msSheetDate').dispatchEvent('change');
  ok((await page.locator('[data-action="delete-ms-row"]').first().getAttribute('data-date')) === '2026-11-10', 'the last body-fat date is listed for deletion');
  await page.click('[data-action="delete-ms-row"]');
  await page.waitForSelector('.cmodal [data-cm="ok"]');
  await page.click('.cmodal [data-cm="ok"]');
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}')?.bodyMeasurements?.length === 1, STORAGE_KEY);
  ok(!/body fat/i.test(await cardText()), 'deleting the last body-fat entry removes it from the card');
  ok(/arm \(old\)/i.test(await cardText()), 'the legacy-only date still shows its Arm reading');
  ok(/log measurements/i.test(await cardText()), 'a legacy-only card still offers logging');
  await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'));

  await page.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await page.waitForSelector('#measurementsSheet.active');
  await page.fill('#msSheetDate', '2026-11-04');
  await page.locator('#msSheetDate').dispatchEvent('change');
  ok((await page.locator('[data-action="delete-ms-row"]').first().getAttribute('data-date')) === '2026-11-05', 'the legacy date is listed for deletion');
  await page.click('[data-action="delete-ms-row"]');
  await page.waitForSelector('.cmodal [data-cm="ok"]');
  await page.click('.cmodal [data-cm="ok"]');
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}')?.bodyMeasurements?.length === 0, STORAGE_KEY);
  ok(!/arm \(old\)/i.test(await cardText()), 'deleting the last legacy entry clears it from the card');
  ok(/log measurements/i.test(await cardText()), 'the empty measurements card still offers logging');
  await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'));

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();

  // One narrow context: the full-width body-fat field and an open site trend
  // must still fit a 320px phone without pushing the card sideways.
  const narrowState = {
    ...state,
    bodyMeasurements: [
      { date: '2026-11-05', arm: 36, thigh: 58 },
      { date: '2026-11-10', arm_l: 33 },
      { date: '2026-11-19', arm_l: 34, waist: 84.5 },
    ],
  };
  const narrowContext = await createBrowserContext(browser, { viewport: { width: 320, height: 700 }, timezoneId: 'Australia/Sydney' });
  await narrowContext.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(narrowState)]);
  await narrowContext.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  const narrowPage = await narrowContext.newPage();
  await narrowPage.goto(base, { waitUntil: 'networkidle' });
  await narrowPage.waitForSelector('#homeWeekStrip');
  await narrowPage.click('.nav-item[data-target="analytics"]');
  await narrowPage.waitForSelector('#view-analytics.active');
  await narrowPage.click('#view-analytics [data-action="open-analytics"][data-context="bodyweight"]:visible');
  await narrowPage.waitForSelector('#analytics-bodyweight.active');
  const narrowArm = '#bwMeasurements [data-action="measurement-site"][data-site="arm_l"]';
  await narrowPage.click(narrowArm);
  await narrowPage.waitForSelector('#bwMsTrend svg');
  const narrowTrend = await narrowPage.evaluate(() => {
    const button = document.querySelector('#bwMeasurements [data-action="measurement-site"][data-site="arm_l"]')?.getBoundingClientRect();
    const container = document.getElementById('bwMsTrend')?.getBoundingClientRect();
    return {
      buttonHeight: button?.height || 0,
      left: container?.left ?? -1,
      right: container?.right ?? -1,
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      svgWidth: document.querySelector('#bwMsTrend svg')?.getBoundingClientRect().width || 0,
      pressed: document.querySelector('#bwMeasurements [data-action="measurement-site"][data-site="arm_l"]')?.getAttribute('aria-pressed') || '',
    };
  });
  ok(narrowTrend.pressed === 'true', 'the 320px trend selection is pressed');
  ok(narrowTrend.buttonHeight >= 44, `the Arm L control stays ${Math.round(narrowTrend.buttonHeight)}px on 320px`);
  ok(narrowTrend.left >= 0 && narrowTrend.right <= narrowTrend.viewport, `the trend fits a 320px card (${Math.round(narrowTrend.left)}–${Math.round(narrowTrend.right)} of ${narrowTrend.viewport})`);
  ok(narrowTrend.svgWidth > 0 && narrowTrend.svgWidth <= narrowTrend.viewport, `the trend SVG scales to the phone (${Math.round(narrowTrend.svgWidth)}px)`);
  ok(narrowTrend.scrollWidth <= narrowTrend.viewport + 1, `the 320px bodyweight card does not overflow sideways (${narrowTrend.scrollWidth}px)`);
  await narrowPage.click(narrowArm);
  await narrowPage.waitForFunction(() => document.getElementById('bwMsTrend')?.hidden === true);
  await narrowPage.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await narrowPage.waitForSelector('#measurementsSheet.active');
  await ensureBilateralOpen(narrowPage);
  const narrowFit = await narrowPage.evaluate(() => {
    const input = document.getElementById('msSheet_bodyFat');
    const rect = input?.getBoundingClientRect();
    const calf = document.getElementById('msSheet_calf_r')?.getBoundingClientRect();
    return {
      left: rect?.left ?? -1,
      right: rect?.right ?? -1,
      calfLeft: calf?.left ?? -1,
      calfRight: calf?.right ?? -1,
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      label: input?.closest('.ms-sheet-field')?.querySelector('span')?.textContent || '',
      moreHeight: document.querySelector('#measurementsSheet .ms-sheet-more summary')?.getBoundingClientRect().height || 0,
    };
  });
  ok(narrowFit.label === 'Body fat (%)', 'the narrow sheet labels the body-fat field');
  ok(narrowFit.left >= 0 && narrowFit.right <= narrowFit.viewport, `the body-fat field fits a 320px viewport (${Math.round(narrowFit.left)}–${Math.round(narrowFit.right)} of ${narrowFit.viewport})`);
  ok(narrowFit.calfLeft >= 0 && narrowFit.calfRight <= narrowFit.viewport, `the right calf field fits a 320px viewport (${Math.round(narrowFit.calfLeft)}–${Math.round(narrowFit.calfRight)} of ${narrowFit.viewport})`);
  ok(narrowFit.moreHeight >= 44, `the 320px bilateral disclosure is ${Math.round(narrowFit.moreHeight)}px, at least 44px`);
  ok(narrowFit.scrollWidth <= narrowFit.viewport + 1, `the 320px sheet does not overflow sideways (${narrowFit.scrollWidth}px)`);
  await narrowContext.close();

  // Light mode is the contrast risk: cyan is a dark-surface accent. Measure the
  // actual computed colours and assert normal-text contrast for the body-fat
  // label, its `%` and its delta.
  const lightState = {
    ...state,
    settings: { ...state.settings, theme: 'light' },
    bodyMeasurements: [
      { date: '2026-11-10', waist: 85.5, bodyFat: 19 },
      { date: '2026-11-19', waist: 84.5, chest: 102, bodyFat: 18.4 },
    ],
  };
  const lightContext = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney' });
  await lightContext.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(lightState)]);
  await lightContext.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  const lightPage = await lightContext.newPage();
  const lightErrors = [];
  lightPage.on('pageerror', (error) => lightErrors.push(String(error)));
  await lightPage.goto(base, { waitUntil: 'networkidle' });
  await lightPage.waitForSelector('#homeWeekStrip');
  await lightPage.click('.nav-item[data-target="analytics"]');
  await lightPage.waitForSelector('#view-analytics.active');
  await lightPage.click('#view-analytics [data-action="open-analytics"][data-context="bodyweight"]:visible');
  await lightPage.waitForSelector('#analytics-bodyweight.active');
  await lightPage.click('#bwMeasurements [data-action="measurement-site"][data-site="waist"]');
  await lightPage.waitForSelector('#bwMsTrend svg');
  await lightPage.click('#analytics-bodyweight [data-action="open-ms-sheet"]');
  await lightPage.waitForSelector('#measurementsSheet.active');
  const lightContrast = await lightPage.evaluate(() => {
    const parse = (value) => {
      const match = String(value).match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    const composite = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
      a: 1,
    });
    const backgroundOf = (el) => {
      const layers = [];
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
        const colour = parse(getComputedStyle(node).backgroundColor);
        if (colour && colour.a > 0) layers.push(colour);
      }
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (let index = layers.length - 1; index >= 0; index -= 1) bg = composite(layers[index], bg);
      return bg;
    };
    const luminance = ({ r, g, b }) => {
      const [red, green, blue] = [r, g, b].map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const measure = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const colour = parse(getComputedStyle(el).color);
      const bg = backgroundOf(el);
      const text = composite(colour, bg);
      const light = luminance(text);
      const dark = luminance(bg);
      return {
        ratio: Math.round(((Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05)) * 100) / 100,
        color: getComputedStyle(el).color,
        background: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
      };
    };
    // Non-text graphics: measure the stroke/fill against the same composited
    // surface the text uses.
    const measurePaint = (selector, property) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const paint = parse(getComputedStyle(el)[property]);
      if (!paint) return null;
      const bg = backgroundOf(el);
      const drawn = composite(paint, bg);
      const light = luminance(drawn);
      const dark = luminance(bg);
      return {
        ratio: Math.round(((Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05)) * 100) / 100,
        color: getComputedStyle(el)[property],
        background: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
      };
    };
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      label: measure('#measurementsSheet .ms-sheet-field--bodyfat > span'),
      percent: measure('#bwMeasurements .bw-ms-site--bodyfat strong small'),
      delta: measure('#bwMeasurements .bw-ms-site--bodyfat .bw-ms-delta'),
      line: measurePaint('#bwMsTrend path.bw-site-line', 'stroke'),
      dot: measurePaint('#bwMsTrend circle.bw-site-dot', 'fill'),
    };
  });
  const lightResult = (entry) => `${entry.ratio}:1 (${entry.color} on ${entry.background})`;
  ok(lightContrast.theme === 'light', `the contrast context renders the light theme (${lightContrast.theme})`);
  ok(lightContrast.label?.ratio >= 4.5, `the body-fat sheet label passes light contrast ${lightResult(lightContrast.label || {})}`);
  ok(lightContrast.percent?.ratio >= 4.5, `the card body-fat % passes light contrast ${lightResult(lightContrast.percent || {})}`);
  ok(lightContrast.delta?.ratio >= 4.5, `the card delta passes light contrast ${lightResult(lightContrast.delta || {})}`);
  ok(lightContrast.line?.ratio >= 3, `the trend line passes light non-text contrast ${lightResult(lightContrast.line || {})}`);
  ok(lightContrast.dot?.ratio >= 3, `the trend dots pass light non-text contrast ${lightResult(lightContrast.dot || {})}`);
  ok((await lightPage.locator('#bwMeasurements .bw-ms-site--bodyfat .bw-ms-delta').innerText()) === '-0.6 pp', 'the light card also reports -0.6 pp');
  ok(lightErrors.length === 0, `no light-context page errors (${lightErrors.join('; ') || 'none'})`);
  await lightContext.close();
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  console.error(`bodyweight-browser-check: FAIL — ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('bodyweight-browser-check: PASS — graph, goal line, weekly rate, range, weight entry, measurements and body fat.');
