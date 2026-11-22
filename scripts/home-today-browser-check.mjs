// Home Today-card browser contract:
// - the header leads with the calendar day, one week chip, and one-way Start
//   (no duplicate Workout quick action);
// - one primary action in the first decision surface;
// - calendar-day routing, including resume/review/rest/no-plan states;
// - no horizontal overflow and 44px controls at narrow mobile widths.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = process.argv.includes('--required');
const runtime = await resolveChromium();
if (!runtime) process.exit(required ? 1 : 0);
const { chromium, executablePath } = runtime;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    if ((req.url || '').split('?')[0] === '/favicon.ico') {
      res.writeHead(204); res.end(); return;
    }
    const rel = (req.url || '/') === '/'
      ? 'index.html'
      : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe path');
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
const BASE = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => {
  if (condition) console.log(`  ok · ${label}`);
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};

// PINNED, not read from the clock. Two things went wrong while these dates came
// from `new Date()`: the browser context declared no timezone, so node and the
// page could disagree about which calendar day it was, and a run that crossed
// midnight computed the fixture for one day and asserted against another.
const TZ = 'Australia/Sydney';
const todayISO = '2026-08-03';   // a Monday in Australia/Sydney
const CLOCK = Date.parse(`${todayISO}T09:00:00+10:00`);
const now = new Date(CLOCK);
// Noon UTC so the weekday cannot shift with the host's timezone.
const todayDay = DAY_KEYS[new Date(`${todayISO}T12:00:00Z`).getUTCDay()];
const otherDay = DAY_KEYS[(DAY_KEYS.indexOf(todayDay) + 6) % 7];
const yesterdayISO = new Date(Date.parse(`${todayISO}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
const lastWeekISO = new Date(Date.parse(`${todayISO}T12:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10);

function program(restToday = false) {
  return {
    id: 'today_card_test',
    name: 'Today Card Test',
    totalWeeks: 4,
    days: Object.fromEntries(DAY_KEYS.map((day) => [day, restToday && day === todayDay
      ? { title: 'Rest Day', lifts: [], runs: 'Rest', desc: '' }
      : { title: `${day === todayDay ? 'Today' : day.toUpperCase()} Strength`, lifts: ['EZ-Bar Curl'], runs: 'Rest', desc: '' }])),
    weeklyVolModifiers: { '1': { sets: 2, reps: 8, intensityLabel: 'Working Sets' } },
  };
}

function fixture({ state = 'ready', theme = 'dark', hideWeekStrip = false, pastWeek = false } = {}) {
  const testProgram = program(state === 'rest');
  const lifts = Object.fromEntries(DAY_KEYS.map((day) => [
    day,
    testProgram.days[day].lifts.length
      ? { 'EZ-Bar Curl': [{ w: '', r: '8', c: false }, { w: '', r: '8', c: false }] }
      : {},
  ]));
  const week = {
    activationId: 'act_today', programId: testProgram.id,
    dates: {}, sessionStatus: {}, sessionSummary: {},
    lifts, liftOrder: {}, liftMeta: {}, runs: {}, runSessions: {},
    notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {},
  };

  if (state === 'in_progress' || state === 'completed') {
    week.lifts[todayDay]['EZ-Bar Curl'][0] = { w: '25', r: '8', c: true };
    week.dates[todayDay] = todayISO;
    week.sessionStatus[todayDay] = state === 'completed' ? 'finished' : 'in_progress';
    if (state === 'completed') {
      week.lifts[todayDay]['EZ-Bar Curl'][1] = { w: '25', r: '8', c: true };
      week.sessionSummary[todayDay] = { plannedSets: 2, completedSets: 2, adherencePct: 100 };
    }
  }
  if (state === 'unresolved') {
    week.lifts[otherDay]['EZ-Bar Curl'][0] = { w: '25', r: '8', c: true };
    week.dates[otherDay] = yesterdayISO;
    week.sessionStatus[otherDay] = 'in_progress';
  }

  return {
    schemaVersion: 5,
    currentWeek: '1',
    activeProgramId: state === 'no_plan' ? 'missing_program' : testProgram.id,
    activeActivationId: 'act_today',
    weekStartedAt: now.toISOString(),
    activations: [{ id: 'act_today', programId: testProgram.id, startWeek: 1, status: 'active', startedAt: now.toISOString() }],
    settings: {
      name: 'Browser', theme, onboardingComplete: true,
      weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon',
      fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
      ...(hideWeekStrip ? { ui: { home: { hidden: ['weekStrip'] }, progress: { hidden: [] } } } : {}),
    },
    customPrograms: [testProgram],
    weeks: {
      '1': week,
      ...(pastWeek ? {
        'arch:old:1': {
          activationId: 'old', programId: testProgram.id,
          dates: { mon: lastWeekISO },
          lifts: { mon: { 'EZ-Bar Curl': [{ w: '20', r: '10', c: true }] } },
          runs: {}, runSessions: {}, sessionStatus: {}, sessionSummary: {}, gymStats: {},
          liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {},
        },
      } : {}),
    },
    loadMetrics: { atl: 0, ctl: 0 },
    healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
    wellnessLog: [], bodyWeightLog: [],
    programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
    hybridScore: { history: [], xp: 0, lastRecordedDate: null },
  };
}

async function openState({ state, theme = 'dark', width = 390, height = 844, hideWeekStrip = false, pastWeek = false }) {
  const context = await createBrowserContext(browser, { viewport: { width, height }, timezoneId: TZ });
  const seed = fixture({ state, theme, hideWeekStrip, pastWeek });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(seed)]);
  await context.addInitScript(pinClock, CLOCK);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  if (state === 'no_plan') await page.locator('#view-program.active').waitFor();
  else await page.locator('.today-card').waitFor();
  return { context, page };
}

try {
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 390, 412]) {
      const { context, page } = await openState({ state: 'ready', theme, width });
      const layout = await page.evaluate(() => {
        const card = document.querySelector('.today-card');
        const primary = document.querySelector('.today-card__primary');
        const secondary = document.querySelector('.today-card__secondary');
        const cardRect = card?.getBoundingClientRect();
        const meta = document.querySelector('.home-header-meta');
        const chip = document.getElementById('homePhaseLabelTag');
        const chipRect = chip?.getBoundingClientRect();
        const metaRect = meta?.getBoundingClientRect();
        return {
          state: card?.getAttribute('data-today-state'),
          insideWeek: !!card?.closest('#homeWeekStrip'),
          collapsed: !!card?.classList.contains('is-collapsed'),
          primaryCount: card?.querySelectorAll('.today-card__primary').length || 0,
          cardWithinViewport: !!cardRect && cardRect.left >= 0 && cardRect.right <= innerWidth && cardRect.bottom <= innerHeight,
          headline: document.getElementById('homeWeekBlockIndicator')?.textContent?.trim() || '',
          headerFits: !!chipRect && !!metaRect && chipRect.left >= 0
            && chipRect.right <= metaRect.right + 0.5 && metaRect.right <= innerWidth,
          primaryHeight: primary?.getBoundingClientRect().height || 0,
          secondaryHeight: secondary?.getBoundingClientRect().height || 0,
          inFocusCards: document.querySelectorAll('#strengthBarChart, #runBarChart, #homeInFocus').length,
          glanceGrids: document.querySelectorAll('#glanceGrid').length,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      ok(layout.state === 'ready', `${theme} ${width}px renders ready state`);
      ok(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]{2}$/.test(layout.headline), `${theme} ${width}px headline is the calendar day (got "${layout.headline}")`);
      ok(!/^Week \d/.test(layout.headline), `${theme} ${width}px headline never claims a program week`);
      ok(layout.headerFits, `${theme} ${width}px keeps the week chip inside the header`);
      ok(layout.insideWeek, `${theme} ${width}px keeps Today inside the week surface`);
      ok(layout.collapsed, `${theme} ${width}px starts the ready day compact`);
      ok(layout.primaryCount === 1, `${theme} ${width}px has exactly one Today primary action`);
      ok(layout.primaryHeight >= 44, `${theme} ${width}px Start meets 44px touch target while collapsed`);
      ok(layout.cardWithinViewport, `${theme} ${width}px keeps the complete Today decision in the first viewport`);
      ok(layout.inFocusCards === 0, `${theme} ${width}px removes the In Focus cards`);
      ok(layout.glanceGrids === 0, `${theme} ${width}px removes the repeated At-a-Glance grid`);
      ok(!layout.overflow, `${theme} ${width}px has no horizontal overflow`);

      await page.locator('.home-week-day.is-today').click();
      const expanded = await page.evaluate(() => {
        const card = document.querySelector('.today-card');
        const secondary = document.querySelector('.today-card__secondary');
        return {
          collapsed: card?.classList.contains('is-collapsed'),
          expandedAttr: card?.querySelector('[data-action="toggle-today-card"]')?.getAttribute('aria-expanded'),
          secondaryHeight: secondary?.getBoundingClientRect().height || 0,
        };
      });
      ok(!expanded.collapsed && expanded.expandedAttr === 'true', `${theme} ${width}px tapping today expands the decision`);
      ok(expanded.secondaryHeight >= 44, `${theme} ${width}px expanded controls meet 44px touch target`);
      await page.locator('.home-week-day.is-today').click();
      ok(await page.locator('.today-card').evaluate((el) => el.classList.contains('is-collapsed')), `${theme} ${width}px tapping today again collapses it`);
      await context.close();
    }
  }

  // ---- Home hierarchy: day headline, week chip, ONE Start -------------------
  // The h1 is the calendar day and the chip carries the program week, so a
  // boot can never flash "Week 1" as the headline and the header never states
  // the week three times on one screen.
  {
    const { context, page } = await openState({ state: 'ready' });
    const header = await page.evaluate(() => ({
      headline: document.getElementById('homeWeekBlockIndicator')?.textContent?.trim() || '',
      chip: document.getElementById('homePhaseLabelTag')?.textContent?.trim() || '',
      chipPill: (() => {
        const el = document.getElementById('homePhaseLabelTag');
        if (!el) return null;
        const s = getComputedStyle(el);
        return { radius: parseFloat(s.borderTopLeftRadius), nowrap: s.whiteSpace, overflowX: s.overflowX };
      })(),
      workoutQuickStarts: document.querySelectorAll('#homeQuickActions [data-action="open-quick-start"]').length,
      quickActions: document.querySelectorAll('#homeQuickActions .home-quick-btn').length,
      primaryCtas: document.querySelectorAll('#homePrimaryCta').length,
      weekDays: document.querySelectorAll('.home-week-day').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    ok(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]{2}$/.test(header.headline), `Home headline is the calendar day (got "${header.headline}")`);
    ok(!/^Week \d/.test(header.headline), 'Home headline never claims a program week');
    ok(header.chip === 'Week 1 of 4 · Working Sets', `Home chip states week and phase (got "${header.chip}")`);
    ok(header.chipPill?.radius >= 99 && header.chipPill?.nowrap === 'nowrap' && header.chipPill?.overflowX === 'hidden', 'the week chip is a compact single-line pill');
    ok(header.workoutQuickStarts === 0, 'Home quick actions no longer offer a second Workout start');
    ok(header.quickActions === 3, 'Home quick actions keep Weight, Run and History');
    ok(header.primaryCtas === 1, 'Home still offers exactly one primary Start');
    ok(header.weekDays === 7, 'Home still renders the seven-day rail');
    ok(!header.overflow, 'the Home header does not overflow the viewport');
    await context.close();
  }

  const expected = {
    in_progress: 'Resume workout',
    completed: 'Review workout',
    rest: 'Log wellness check-in',
    unresolved: 'Resume workout',
  };
  for (const [state, label] of Object.entries(expected)) {
    const { context, page } = await openState({ state });
    ok(await page.locator('.today-card').getAttribute('data-today-state') === state, `${state} state is explicit`);
    ok((await page.locator('#homePrimaryCta').textContent())?.trim() === label, `${state} state uses "${label}"`);
    if (state === 'completed') {
      ok(await page.locator('.session-summary').count() === 1, 'completed state shows the session summary');
      ok(await page.locator('.session-map svg').count() === 2, 'completed state shows front and back body maps');
      ok((await page.locator('.session-summary').innerText()).includes('400 kg'), 'completed summary shows real session volume');
    }
    if (state === 'unresolved') {
      ok(await page.locator('#homeChooseWorkout').count() === 0, 'unresolved work does not compete with another-workout action');
    }
    await context.close();
  }

  {
    const { context, page } = await openState({ state: 'ready' });
    await page.locator('[data-action="home-week-prev"]').click();
    ok((await page.locator('#homeWeekLabel').textContent())?.trim() === 'Last week', 'previous-week control moves the rail back one week');
    ok(await page.locator('.week-recap').count() === 1, 'a past week renders a recap, not a Today decision');
    ok(await page.locator('#homePrimaryCta').count() === 0, 'a past week does not offer a start action');
    const arrow = await page.locator('[data-action="home-week-prev"]').boundingBox();
    ok(!!arrow && arrow.width >= 44 && arrow.height >= 44, 'week navigation meets the 44px touch target');
    await page.locator('[data-action="home-week-today"]').click();
    ok((await page.locator('#homeWeekLabel').textContent())?.trim() === 'This week', 'Back to this week returns to the decision');
    ok(await page.locator('#homePrimaryCta').isVisible(), 'returning to this week restores the primary action');
    for (let i = 0; i < 4; i++) await page.locator('[data-action="home-week-prev"]').click();
    ok(await page.locator('[data-action="home-week-prev"]').isDisabled(), 'week history is bounded at four previous weeks');
    await context.close();
  }

  {
    const { context, page } = await openState({ state: 'ready' });
    await page.locator('#homePrimaryCta').click();
    ok(await page.locator('#view-workout').evaluate((el) => el.classList.contains('active')), 'Start workout opens Train');
    ok(await page.locator('#cockpitDaySelectorBar .day-pill.active').getAttribute('data-day') === todayDay, 'Start workout selects the calendar day');
    await context.close();
  }

  {
    const { context, page } = await openState({ state: 'completed' });
    await page.locator('#homePrimaryCta').click();
    ok(await page.locator('#todaySummaryModal').evaluate((el) => getComputedStyle(el).display !== 'none'), 'Review workout opens the completed day summary');
    await context.close();
  }

  {
    const { context, page } = await openState({ state: 'no_plan' });
    ok(await page.locator('#view-program').evaluate((el) => el.classList.contains('active')), 'missing active plan opens the safe Plans recovery surface');
    ok((await page.locator('.active-prog-card--recovery').textContent())?.includes('logged history is still safe'), 'plan recovery explains that history is safe');
    await context.close();
  }

  {
    const { context, page } = await openState({ state: 'unresolved' });
    await page.locator('#homePrimaryCta').click();
    ok(await page.locator('#view-workout').evaluate((el) => el.classList.contains('active')), 'Resume opens Train');
    ok(await page.locator('#cockpitDaySelectorBar .day-pill.active').getAttribute('data-day') === otherDay, 'Resume restores the unresolved workout day');
    await context.close();
  }

  {
    const { context, page } = await openState({ state: 'ready', pastWeek: true });
    await page.locator('.home-week-day.is-today').click();
    ok(await page.locator('#view-home.active').count() === 1, 'today date stays on Home');
    await page.locator('[data-action="home-week-prev"]').click();
    await page.waitForSelector('.week-recap');
    const done = page.locator('#homeWeekDays .home-week-day--done').first();
    ok(await done.count() >= 1, 'past week shows a completed day');
    await done.click();
    await page.waitForSelector('.day-recap');
    ok(await page.locator('#view-home.active').count() === 1, 'a completed date stays on Home');
    ok(await page.locator('.day-recap .session-map svg').count() === 2, 'day recap shows the muscle map');
    await page.locator('[data-action="home-week-recap"]').click();
    ok(await page.locator('.week-recap').count() === 1, 'back to week restores the weekly recap');
    await context.close();
  }

  {
    const { context, page } = await openState({ state: 'completed' });
    await page.locator('.home-week-day.is-today').click();
    ok(await page.locator('#view-home.active').count() === 1, 'completed today stays on Home');
    ok(await page.locator('.today-card[data-today-state="completed"]').count() === 1, 'completed today shows the Today summary');
    await context.close();
  }

  {
    const { context, page } = await openState({ state: 'ready', hideWeekStrip: true });
    ok(await page.locator('.home-week__rail').evaluate((el) => el.classList.contains('home-card-hidden')), 'hiding This week removes only the seven-day rail');
    ok(await page.locator('#homeTodayCard .today-card').isVisible(), 'the pinned Today decision survives a hidden week strip');
    ok(await page.locator('#homePrimaryCta').isVisible(), 'the primary action survives a hidden week strip');
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\nHome Today browser check failed (${failures.length}).`);
  process.exit(1);
}
console.log('\nHome Today browser check passed.');
