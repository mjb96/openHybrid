// =============================================================================
// MOVE A DAY (HM2) — real-browser contract
//
// Free dates only: a planned workout can move onto an empty date in the same
// calendar week; occupied/past dates say why; the rail follows the schedule and
// one tap of Undo restores the plan. Logged work is never touched.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html'
      : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const state = {
  schemaVersion: 17, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act',
  weekStartedAt: '2026-11-23',
  settings: {
    name: 'Alex', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km',
    weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate',
    equipmentProfiles: [], restPeriods: {},
  },
  weeks: { '1': { activationId: 'act', programId: 'hybrid_engine', dates: {}, lifts: {}, gymStats: {}, runSessions: {} } },
  bodyWeightLog: [], bodyMeasurements: [],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  hybridScore: { history: [], xp: 0 }, loadMetrics: { atl: 0, ctl: 0 },
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const runtime = await resolveChromium();
if (!runtime) process.exit(0);
const { chromium, executablePath } = runtime;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

const openHome = async (width) => {
  const context = await createBrowserContext(browser, { viewport: { width, height: 900 }, colorScheme: 'dark' });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value),
    ['hybrid_engine_v2_state', JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: 'NOT YET' }).click({ timeout: 500 }).catch(() => {});
  await page.waitForTimeout(250);
  return { context, page, errors };
};

try {
  const { context, page, errors } = await openHome(390);
  // A planned future day is tappable and previews the plan, not a recap.
  await page.click('.home-week-day[data-home-date="2026-11-26"]');
  await page.waitForTimeout(350);
  const plan = await page.evaluate(() => ({
    title: document.querySelector('.day-plan .today-card__title')?.textContent || '',
    move: !!document.querySelector('.day-plan [data-action="move-day"]'),
  }));
  check(plan.title.includes('Tempo'), `planned day preview shows the session (${plan.title})`);
  check(plan.move, 'planned day offers Move');

  // Free dates only.
  await page.click('.day-plan [data-action="move-day"]');
  await page.waitForSelector('.move-sheet.active');
  await page.waitForTimeout(250);
  const options = await page.evaluate(() => [...document.querySelectorAll('.move-sheet__option')].map((button) => ({
    date: button.getAttribute('data-move-date'),
    disabled: button.disabled,
    label: button.textContent.replace(/\s+/g, ' ').trim(),
    height: button.getBoundingClientRect().height,
  })));
  const byDate = Object.fromEntries(options.map((option) => [option.date, option]));
  check(byDate['2026-11-23'].disabled, 'a past date is disabled');
  check(/In the past/.test(byDate['2026-11-23'].label), 'the past date says why');
  check(/Already has a session/.test(byDate['2026-11-25'].label), 'today with a plan says already has a session');
  check(/This workout/.test(byDate['2026-11-26'].label), 'the source date is marked');
  check(options.every((option) => option.height >= 44), 'every date row is at least 44px');
  check(!byDate['2026-11-29'].disabled, 'the free Sunday can take the workout');

  // Move it, then undo from the shared bar.
  await page.click('.move-sheet__option[data-move-date="2026-11-29"]');
  await page.waitForTimeout(500);
  const moved = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('hybrid_engine_v2_state'));
    const day = (date) => document.querySelector(`.home-week-day[data-home-date="${date}"]`)?.className || '';
    return {
      schedule: saved.weekSchedule || {},
      undoShown: document.getElementById('activityUndoBar')?.classList.contains('show') || false,
      message: document.getElementById('activityUndoMessage')?.textContent || '',
      thu: day('2026-11-26'),
      sun: day('2026-11-29'),
    };
  });
  check(moved.schedule?.['2026-11-23']?.thu === '2026-11-29', 'the move is persisted for the calendar week');
  check(moved.undoShown && /Sun 29 Nov/.test(moved.message), 'Undo names the new date');
  check(/--rest/.test(moved.thu), 'the old weekday reads as rest');
  check(/--planned/.test(moved.sun), 'the target date carries the plan');

  await page.click('#activityUndoBar [data-action="undo-activity-delete"]');
  await page.waitForTimeout(400);
  const undone = await page.evaluate(() => ({
    schedule: JSON.parse(localStorage.getItem('hybrid_engine_v2_state')).weekSchedule || {},
    thu: document.querySelector('.home-week-day[data-home-date="2026-11-26"]')?.className || '',
  }));
  check(!undone.schedule['2026-11-23'], 'Undo clears the schedule override');
  check(/--planned/.test(undone.thu), 'Undo restores the original weekday');
  // Moving TODAY's own workout must leave today at rest, not resurrect it.
  await page.evaluate(() => document.querySelector('.today-card__link')?.click());
  await page.waitForSelector('.move-sheet.active');
  await page.click('.move-sheet__option[data-move-date="2026-11-29"]');
  await page.waitForTimeout(500);
  const restToday = await page.evaluate(() => ({
    state: document.querySelector('#homeTodayCard .today-card')?.getAttribute('data-today-state'),
    primary: document.getElementById('homePrimaryCta')?.textContent?.trim() || '',
    sun: document.querySelector('.home-week-day[data-home-date="2026-11-29"]')?.className || '',
  }));
  check(restToday.state === 'rest', `moving today leaves a rest day (${restToday.state})`);
  check(restToday.primary === 'Log wellness check-in', 'the rest day offers a wellness check-in');
  check(/--planned/.test(restToday.sun), 'the target date still carries the moved plan');
  await page.click('#activityUndoBar [data-action="undo-activity-delete"]');
  await page.waitForTimeout(400);
  const restoredToday = await page.evaluate(() => document.querySelector('#homeTodayCard .today-card')?.getAttribute('data-today-state'));
  check(restoredToday === 'ready', `Undo restores today's session (${restoredToday})`);
  check(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();

  // The sheet must fit a 320px phone.
  const narrow = await openHome(320);
  await narrow.page.click('.home-week-day[data-home-date="2026-11-26"]');
  await narrow.page.waitForTimeout(300);
  await narrow.page.click('.day-plan [data-action="move-day"]');
  await narrow.page.waitForSelector('.move-sheet.active');
  const narrowFit = await narrow.page.evaluate(() => {
    const sheet = document.querySelector('.move-sheet');
    const rows = [...document.querySelectorAll('.move-sheet__option')];
    const rect = sheet.getBoundingClientRect();
    return {
      left: Math.round(rect.left), right: Math.round(rect.right), viewport: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      small: rows.filter((row) => row.getBoundingClientRect().height < 44).length,
    };
  });
  check(narrowFit.left >= 0 && narrowFit.right <= narrowFit.viewport, `sheet fits 320px (${narrowFit.left}–${narrowFit.right})`);
  check(!narrowFit.overflow, 'the sheet creates no horizontal overflow');
  check(narrowFit.small === 0, '320px date rows stay at least 44px');
  check(narrow.errors.length === 0, `no 320px page errors (${narrow.errors.join('; ') || 'none'})`);
  await narrow.context.close();
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error('move-day-browser-check: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('move-day-browser-check: PASS — free dates only, rail follows, Undo restores, 320px fits.');
