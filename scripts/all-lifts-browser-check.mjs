// =============================================================================
// PG5 — all-lifts index (real browser)
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const dates = ['2026-11-04', '2026-11-11', '2026-11-18'];
const lifts = [['Back Squat', 100, 5], ['Bench Press', 80, 5], ['Barbell Row', 60, 8]];
const weeks = {};
dates.forEach((date, idx) => {
  weeks[String(idx + 1)] = {
    activationId: 'act', programId: 'hybrid_engine', dates: { wed: date },
    lifts: { wed: Object.fromEntries(lifts.map(([name, w, r]) => [name, [{
      w: String(w), r: String(idx === 2 && name === 'Back Squat' ? 3 : r), c: true, tr: r,
    }]])) },
    gymStats: {}, runSessions: {},
  };
});
const state = {
  schemaVersion: 17, currentWeek: '5', activeProgramId: 'hybrid_engine', activeActivationId: 'act', weekStartedAt: '2026-11-23',
  settings: { name: 'Alex', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentProfiles: [], restPeriods: {} },
  weeks: { ...weeks, '5': { activationId: 'act', programId: 'hybrid_engine', dates: {}, lifts: {}, gymStats: {}, runSessions: {} } },
  bodyWeightLog: [{ date: '2026-11-23', weight: 78 }], bodyMeasurements: [],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  hybridScore: { history: [], xp: 0 }, loadMetrics: { atl: 0, ctl: 0 },
};

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const runtime = await resolveChromium();
if (!runtime) process.exit(0);
const { chromium, executablePath } = runtime;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 900 }, colorScheme: 'dark' });
  await context.addInitScript(([k, v]) => localStorage.setItem(k, v), ['hybrid_engine_v2_state', JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: 'NOT YET' }).click({ timeout: 500 }).catch(() => {});
  await page.evaluate(() => document.querySelector('.bottom-nav [data-target="analytics"]')?.click());
  await page.waitForTimeout(700);
  const stalls = await page.evaluate(() => ({
    shown: !!document.querySelector('#band-exercises .pg-stalls'),
    text: document.querySelector('#band-exercises .pg-stalls')?.textContent?.replace(/\s+/g, ' ').trim() || '',
  }));
  check(stalls.shown && /Back Squat/.test(stalls.text), `the band lists the stalled lift (${stalls.text.slice(0, 80)})`);
  // PG9: the rep-range mix moved to the Strength detail; the band keeps the rows.
  const mix = await page.evaluate(() => !!document.querySelector('#band-exercises .pg-mix'));
  check(!mix, 'the exercises band leaves the training mix to its detail');

  // A9: the window chosen in Progress carries into the lift drilldown.
  await page.click('[data-pg-range="1y"]');
  await page.waitForTimeout(300);

  await page.evaluate(() => document.querySelector('[data-action="open-all-lifts"]')?.click());
  await page.waitForTimeout(400);
  const opened = await page.evaluate(() => ({
    open: !!document.querySelector('.all-lifts-sheet.active'),
    count: document.getElementById('allLiftsCount')?.textContent || '',
    rows: document.querySelectorAll('.all-lifts__row').length,
    focus: document.activeElement?.id,
  }));
  check(opened.open, 'the all-lifts sheet opens');
  check(opened.rows === 3, `every lift is listed (${opened.rows})`);
  check(/3 lifts/.test(opened.count), `the count names the range (${opened.count})`);
  check(opened.focus === 'allLiftsSearch', 'search is focused on open');

  await page.fill('#allLiftsSearch', 'squat');
  await page.waitForTimeout(250);
  const filtered = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('.all-lifts__row .all-lifts__name')].map((el) => el.textContent),
    count: document.getElementById('allLiftsCount')?.textContent || '',
  }));
  check(filtered.rows.length === 1 && /Back Squat/.test(filtered.rows[0]), 'search narrows to the lift');
  check(/1 of 3/.test(filtered.count), `the filtered count is honest (${filtered.count})`);

  await page.evaluate(() => document.querySelector('.all-lifts__hit')?.click());
  await page.waitForTimeout(600);
  const detail = await page.evaluate(() => ({
    sheet: !!document.querySelector('.all-lifts-sheet'),
    active: document.querySelector('.analytics-section.active')?.id || '',
  }));
  check(!detail.sheet, 'the sheet closes when a lift opens');
  check(detail.active === 'analytics-strength-entity', `the exercise drilldown opens (${detail.active})`);

  const inherited = await page.evaluate(() => document.querySelector('[data-exercise-range].is-active')?.getAttribute('data-exercise-range') || '');
  check(inherited === '1y', `the drilldown inherits the Progress 1Y range (got ${inherited || 'nothing'})`);

  // A3: the drilldown offers 4 weeks through all time and states a weekly trend.
  const ranges = await page.evaluate(() => [...document.querySelectorAll('[data-exercise-range]')].map((el) => el.getAttribute('data-exercise-range')));
  check(ranges.join(',') === '4w,12w,6m,1y,all', `the trend has every range (${ranges.join(',')})`);
  await page.click('[data-exercise-range="1y"]');
  await page.waitForTimeout(300);
  const trend = await page.evaluate(() => ({
    active: document.querySelector('[data-exercise-range].is-active')?.getAttribute('data-exercise-range'),
    rate: document.querySelector('.an-ex-rate')?.textContent?.replace(/\s+/g, ' ').trim() || '',
  }));
  check(trend.active === '1y', 'the 1-year range selects');
  check(/Trend/.test(trend.rate) && /week/.test(trend.rate), `the weekly rate is stated (${trend.rate})`);
  const relative = await page.evaluate(() => document.querySelector('.an-ex-relative')?.textContent?.replace(/\s+/g, ' ').trim() || '');
  check(/× bodyweight/.test(relative) && /est\./.test(relative), `relative strength is labelled as an estimate (${relative})`);
  check(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();

  // ── H5 slice 2: the deload write, and its Undo ────────────────────────────
  // A custom plan with two lifts on progress checks (the engine's own rule) and
  // six completed sessions. The block review must offer the next week, halve it
  // only when asked, persist it, and restore it exactly from the shared bar.
  {
    const lifts = ['Back Squat', 'Bench Press'];
    const session = (date, reps) => ({
      activationId: 'act', programId: 'custom_stall', dates: { [date.startsWith('2026-10-28') || date.startsWith('2026-11-04') || date.startsWith('2026-11-11') ? 'wed' : 'sat']: date },
      lifts: { [date.startsWith('2026-10-28') || date.startsWith('2026-11-04') || date.startsWith('2026-11-11') ? 'wed' : 'sat']: Object.fromEntries(lifts.map((name) => [name, [{
        w: '100', r: String(reps), tr: 5, c: true,
      }]])) },
      gymStats: {}, runSessions: {},
    });
    const modifiers = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [String(i + 1), { sets: 4, reps: 5, intensityLabel: `Week ${i + 1}` }]));
    const custom = {
      id: 'custom_stall', name: 'Stall Test', totalWeeks: 8,
      days: {
        mon: { title: 'Rest', lifts: [] }, tue: { title: 'Rest', lifts: [] },
        wed: { title: 'Strength', lifts }, thu: { title: 'Rest', lifts: [] },
        fri: { title: 'Rest', lifts: [] }, sat: { title: 'Strength', lifts }, sun: { title: 'Rest', lifts: [] },
      },
      weeklyVolModifiers: modifiers,
    };
    const deloadState = {
      schemaVersion: 17, currentWeek: '5', activeProgramId: 'custom_stall', activeActivationId: 'act',
      weekStartedAt: '2026-11-23',
      settings: { ...state.settings, name: 'Deload Athlete' },
      customPrograms: [custom],
      weeks: {
        '1': session('2026-10-28', 5), '2': session('2026-10-31', 5),
        '3': session('2026-11-04', 5), '4': session('2026-11-07', 5),
        '5': session('2026-11-11', 3), '6': session('2026-11-14', 3),
        '7': { activationId: 'act', programId: 'custom_stall', dates: {}, lifts: {}, gymStats: {}, runSessions: {} },
      },
      bodyWeightLog: [], bodyMeasurements: [],
      programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
      healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
      hybridScore: { history: [], xp: 0 }, loadMetrics: { atl: 0, ctl: 0 },
    };
    const dctx = await createBrowserContext(browser, { viewport: { width: 390, height: 900 }, colorScheme: 'dark' });
    await dctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ['hybrid_engine_v2_state', JSON.stringify(deloadState)]);
    await dctx.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
    const page2 = await dctx.newPage();
    const derrors = [];
    page2.on('pageerror', (error) => derrors.push(error.message));
    await page2.goto(base, { waitUntil: 'networkidle' });
    await page2.waitForTimeout(500);
    await page2.locator('button', { hasText: 'NOT YET' }).click({ timeout: 500 }).catch(() => {});
    await page2.evaluate(() => document.querySelector('.bottom-nav [data-target="analytics"]')?.click());
    await page2.waitForTimeout(700);
    await page2.evaluate(() => document.querySelector('.pg-reviews__seg[data-context="weekly-review"]')?.click());
    await page2.waitForSelector('#analytics-weekly-review.active', { timeout: 4000 });
    await page2.click('#analytics-weekly-review [data-an-tab="month"]');
    await page2.waitForSelector('#blockReviewContainer .pg-block', { timeout: 4000 }).catch(() => {});
    const review = await page2.evaluate(() => ({
      status: document.querySelector('#blockReviewContainer .pg-block__status')?.textContent?.trim() || '',
      action: document.querySelector('#blockReviewContainer [data-action="apply-block-deload"]')?.getAttribute('data-week') || '',
      text: document.querySelector('#blockReviewContainer .pg-block')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    }));
    check(review.status === 'Needs a look', `the block review sees the two stalls (${review.status})`);
    check(review.action === '6', `the deload targets the next week (${review.action || 'none'})`);
    check(/2 lifts are on progress checks/.test(review.text), `the engine evidence is quoted (${review.text.slice(0, 120)})`);

    await page2.click('#blockReviewContainer [data-action="apply-block-deload"]');
    await page2.waitForTimeout(350);
    const applied = await page2.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
      const program = (stored.customPrograms || []).find((entry) => entry.id === 'custom_stall');
      return {
        sets: program?.weeklyVolModifiers?.['6']?.sets,
        label: program?.weeklyVolModifiers?.['6']?.intensityLabel,
        undoShown: !!document.querySelector('#activityUndoBar.show'),
        message: document.getElementById('activityUndoMessage')?.textContent || '',
        after: document.querySelector('#blockReviewContainer .pg-block')?.textContent?.replace(/\s+/g, ' ') || '',
      };
    });
    check(applied.sets === 2 && /deload/i.test(applied.label || ''), `week 6 is halved and labelled (${applied.sets}/${applied.label})`);
    check(applied.undoShown && /Deload added to week 6/.test(applied.message), `the undo bar names the change (${applied.message})`);
    check(/Week 6 is already a deload/.test(applied.after), 'the review reflects the applied deload');

    await page2.click('#activityUndoBar [data-action="undo-activity-delete"]');
    await page2.waitForTimeout(350);
    const restored = await page2.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
      const program = (stored.customPrograms || []).find((entry) => entry.id === 'custom_stall');
      return {
        sets: program?.weeklyVolModifiers?.['6']?.sets,
        label: program?.weeklyVolModifiers?.['6']?.intensityLabel,
        action: !!document.querySelector('#blockReviewContainer [data-action="apply-block-deload"]'),
      };
    });
    check(restored.sets === 4 && restored.label === 'Week 6', `Undo restores the week exactly (${restored.sets}/${restored.label})`);
    check(restored.action, 'the deload action returns after Undo');
    check(derrors.length === 0, `block review: no page errors (${derrors.join('; ') || 'none'})`);
    await dctx.close();
  }

} finally {
  await browser.close(); server.close();
}
if (failures.length) {
  console.error('all-lifts-browser-check: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('all-lifts-browser-check: PASS — searchable index, honest counts, opens the drilldown.');
