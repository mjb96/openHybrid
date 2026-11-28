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
const oldTrainingISO = new Date(Date.parse(`${todayISO}T12:00:00Z`) - 60 * 86400000).toISOString().slice(0, 10);

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

function fixture({ state = 'ready', theme = 'dark', hideWeekStrip = false, pastWeek = false, backupNudge = false } = {}) {
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
      ...(pastWeek || backupNudge ? {
        'arch:old:1': {
          activationId: 'old', programId: testProgram.id,
          dates: { mon: backupNudge ? oldTrainingISO : lastWeekISO },
          lifts: { mon: { 'EZ-Bar Curl': [{ w: '20', r: '10', c: true }] } },
          runs: {}, runSessions: {}, sessionStatus: {}, sessionSummary: {}, gymStats: {},
          liftOrder: {}, liftMeta: {}, notes: {}, gymRpe: {}, bodyWeight: {},
        },
      } : {}),
    },
    ...(backupNudge ? {
      // A 20-day-old manual backup with 60 days of history: the one state Home
      // is allowed to remind about (browser/PWA, where export is the only path).
      lastBackupAt: new Date(Date.parse(`${todayISO}T12:00:00Z`) - 20 * 86400000).toISOString(),
      backupNudgeDismissedAt: null,
    } : {}),
    loadMetrics: { atl: 0, ctl: 0 },
    healthConnect: { connected: true, hrv: [], restingHR: [], sleep: [{ date: todayISO, totalHours: 6.2 }], steps: [], vo2max: [] },
    wellnessLog: [{ date: todayISO, mood: 4, soreness: 2 }], bodyWeightLog: [],
    programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
    hybridScore: { history: [], xp: 0, lastRecordedDate: null },
  };
}

async function openState({ state, theme = 'dark', width = 390, height = 844, hideWeekStrip = false, pastWeek = false, backupNudge = false }) {
  const context = await createBrowserContext(browser, { viewport: { width, height }, timezoneId: TZ });
  const seed = fixture({ state, theme, hideWeekStrip, pastWeek, backupNudge });
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
        const insight = document.getElementById('homeInsightCard');
        const todayMount = document.getElementById('homeTodayCard');
        return {
          state: card?.getAttribute('data-today-state'),
          insideWeek: !!card?.closest('#homeWeekStrip'),
          collapsed: !!card?.classList.contains('is-collapsed'),
          primaryCount: card?.querySelectorAll('.today-card__primary').length || 0,
          previewRows: card?.querySelectorAll('.today-card__preview-row').length || 0,
          previewText: card?.querySelector('.today-card__preview')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          compactPreview: card?.querySelector('.today-card__preview-compact')?.textContent?.trim() || '',
          compactPreviewVisible: (card?.querySelector('.today-card__preview-compact')?.getBoundingClientRect().height || 0) > 0,
          cardWithinViewport: !!cardRect && cardRect.left >= 0 && cardRect.right <= innerWidth && cardRect.bottom <= innerHeight,
          headline: document.getElementById('homeWeekBlockIndicator')?.textContent?.trim() || '',
          headerFits: !!chipRect && !!metaRect && chipRect.left >= 0
            && chipRect.right <= metaRect.right + 0.5 && metaRect.right <= innerWidth,
          primaryHeight: primary?.getBoundingClientRect().height || 0,
          secondaryHeight: secondary?.getBoundingClientRect().height || 0,
          inFocusCards: document.querySelectorAll('#strengthBarChart, #runBarChart, #homeInFocus').length,
          glanceGrids: document.querySelectorAll('#glanceGrid').length,
          insightInsideWeek: !!insight?.closest('#homeWeekStrip'),
          insightAfterToday: !!(insight && todayMount
            && (todayMount.compareDocumentPosition(insight) & Node.DOCUMENT_POSITION_FOLLOWING)),
          insightVisible: !!insight && !insight.hidden,
          insightHeight: insight?.getBoundingClientRect().height || 0,
          insightChips: (() => {
            const chips = [...document.querySelectorAll('#homeInsightCard .home-insight__chip')];
            return {
              count: chips.length,
              labels: chips.map((chip) => chip.textContent.trim()),
              heights: chips.map((chip) => Math.round(chip.getBoundingClientRect().height)),
              insideGroup: !!document.querySelector('#homeInsightCard [role="group"][aria-label="Ask the coach"]'),
            };
          })(),
          readiness: (() => {
            const row = card?.querySelector('.today-card__readiness');
            if (!row) return null;
            const box = row.getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return {
              text: row.textContent.replace(/\s+/g, ' ').trim(),
              aria: row.getAttribute('aria-label') || '',
              height: Math.round(box.height),
              reachable: !!hit && (row === hit || row.contains(hit)),
            };
          })(),
          nextUp: document.getElementById('homeWeekNext')?.textContent?.trim() || '',
          nextUpVisible: (document.getElementById('homeWeekNext')?.getBoundingClientRect().height || 0) > 0,
          metaText: card?.querySelector('.today-card__meta')?.textContent?.trim() || '',
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      ok(layout.state === 'ready', `${theme} ${width}px renders ready state`);
      ok(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]{2}$/.test(layout.headline), `${theme} ${width}px headline is the calendar day (got "${layout.headline}")`);
      ok(!/^Week \d/.test(layout.headline), `${theme} ${width}px headline never claims a program week`);
      ok(layout.headerFits, `${theme} ${width}px keeps the week chip inside the header`);
      ok(layout.insideWeek, `${theme} ${width}px keeps Today inside the week surface`);
      ok(layout.insightInsideWeek && layout.insightAfterToday, `${theme} ${width}px keeps the coach line inside Today's surface`);
      ok(layout.insightVisible && layout.insightHeight >= 44, `${theme} ${width}px renders the coach line at 44px or taller`);
      ok(layout.insightChips.count === 2 && layout.insightChips.insideGroup, `${theme} ${width}px offers both ask-the-coach chips in one named group`);
      ok(layout.insightChips.labels.includes('Train today?') && layout.insightChips.labels.includes('How recovered am I?'), `${theme} ${width}px names the coach questions (${layout.insightChips.labels.join(' · ')})`);
      ok(layout.insightChips.heights.every((h) => h >= 44), `${theme} ${width}px coach chips meet 44px (${layout.insightChips.heights.join(', ')})`);

      // Ask the coach is deterministic: a real answer from the same model, not
      // a dead control. The delivered chips lost their host when the briefing
      // card left Home, so this pins the return path.
      await page.getByRole('button', { name: 'Train today?' }).click();
      const answered = await page.evaluate(() => {
        const el = document.getElementById('coachAnswer');
        return {
          hidden: !!el?.hidden,
          text: el?.textContent?.trim() || '',
          live: el?.getAttribute('aria-live') || '',
        };
      });
      ok(!answered.hidden && answered.text.length > 20, `${theme} ${width}px answers "Train today?" (${answered.text})`);
      ok(answered.live === 'polite', `${theme} ${width}px announces the coach answer`);
      ok(layout.collapsed, `${theme} ${width}px starts the ready day compact`);
      ok(layout.primaryCount === 1, `${theme} ${width}px has exactly one Today primary action`);
      ok(layout.primaryHeight >= 44, `${theme} ${width}px Start meets 44px touch target while collapsed`);
      ok(layout.previewRows === 1, `${theme} ${width}px previews today's one lift`);
      ok(/EZ-Bar Curl/.test(layout.previewText) && /2×8/.test(layout.previewText), `${theme} ${width}px preview shows the lift and target (${layout.previewText})`);
      ok(layout.compactPreviewVisible && /EZ-Bar Curl 2×8/.test(layout.compactPreview), `${theme} ${width}px keeps a compact preview in the collapsed row (${layout.compactPreview})`);
      ok(/1 lift · 2 sets/.test(layout.metaText), `${theme} ${width}px states what today costs (${layout.metaText})`);
      ok(layout.nextUpVisible && /^Next up: /.test(layout.nextUp), `${theme} ${width}px names the next planned session (${layout.nextUp})`);
      // The readiness score used to hide in the detail block of a collapsed
      // card. It must be readable and reachable in the default state.
      ok(!!layout.readiness, `${theme} ${width}px shows the readiness row on the collapsed ready card`);
      if (layout.readiness) {
        ok(/^Readiness \d+/.test(layout.readiness.aria), `${theme} ${width}px names the readiness read ("${layout.readiness.aria}")`);
        ok(/Limited signal|Developing read|Ready|Moderate|Peak|Low|Rest Advised/.test(layout.readiness.text), `${theme} ${width}px states the readiness status (${layout.readiness.text})`);
        ok(layout.readiness.height >= 44, `${theme} ${width}px readiness row meets 44px`);
        ok(layout.readiness.reachable, `${theme} ${width}px readiness row is not covered`);
      }
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
          previewVisible: (card?.querySelector('.today-card__preview')?.getBoundingClientRect().height || 0) > 0,
        };
      });
      ok(!expanded.collapsed && expanded.expandedAttr === 'true', `${theme} ${width}px tapping today expands the decision`);
      ok(expanded.previewVisible, `${theme} ${width}px expanded preview lists the lifts`);
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
    ok(await page.locator('#homeInsightCard').isHidden(), 'a past week hides the coach line');
    ok(await page.locator('#homePrimaryCta').count() === 0, 'a past week does not offer a start action');
    const arrow = await page.locator('[data-action="home-week-prev"]').boundingBox();
    ok(!!arrow && arrow.width >= 44 && arrow.height >= 44, 'week navigation meets the 44px touch target');
    await page.locator('[data-action="home-week-today"]').click();
    ok((await page.locator('#homeWeekLabel').textContent())?.trim() === 'This week', 'Back to this week returns to the decision');
    ok(await page.locator('#homePrimaryCta').isVisible(), 'returning to this week restores the primary action');
    ok(await page.locator('#homeInsightCard').isVisible(), 'returning to this week restores the coach line');
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
    ok(await page.locator('#homeWeekNext').isHidden(), 'a past week does not promise a next session');
    const done = page.locator('#homeWeekDays .home-week-day--done').first();
    ok(await done.count() >= 1, 'past week shows a completed day');
    await done.click();
    await page.waitForSelector('.day-recap');
    ok(await page.locator('#view-home.active').count() === 1, 'a completed date stays on Home');
    ok(await page.locator('.day-recap .session-map svg').count() === 2, 'day recap shows the muscle map');
    ok(await page.locator('#homeInsightCard').isHidden(), 'a picked day hides the coach line');
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
    // A genuinely empty profile: no completed work and no weigh-in. One honest
    // start-here card instead of four cards of dashes.
    const { context, page } = await openState({ state: 'ready' });
    ok(await page.locator('#homeFirstRun').isVisible(), 'a first run shows the start-here card');
    ok(await page.locator('#homeHybridSection').isHidden(), 'a first run hides the empty hybrid cards');
    ok(await page.locator('#homeBodyweightCard').isHidden(), 'a first run hides the empty bodyweight card');
    ok((await page.locator('#homeFirstRun button').boundingBox()).height >= 44, 'the first-run action meets 44px');
    await context.close();
  }

  {
    // Any logged work ends the first run and restores the real cards.
    const { context, page } = await openState({ state: 'in_progress' });
    ok(await page.locator('#homeFirstRun').isHidden(), 'logged work ends the first run');
    ok(await page.locator('#homeHybridSection').isVisible(), 'logged work restores the hybrid cards');
    await context.close();
  }

  {
    const { context, page } = await openState({ state: 'ready', hideWeekStrip: true });
    ok(await page.locator('.home-week__rail').evaluate((el) => el.classList.contains('home-card-hidden')), 'hiding This week removes only the seven-day rail');
    ok(await page.locator('#homeTodayCard .today-card').isVisible(), 'the pinned Today decision survives a hidden week strip');
    ok(await page.locator('#homePrimaryCta').isVisible(), 'the primary action survives a hidden week strip');
    await context.close();
  }

  {
    // The daily check-in is the one readiness input the athlete supplies; it
    // had no entry point on a training day. It must be a real 44px control that
    // opens the wellness form, and it must stop asking once the day is logged.
    const { context, page } = await openState({ state: 'ready' });
    const checkIn = page.locator('#qaCheckin');
    ok(await checkIn.isVisible(), 'the check-in quick action is on Home');
    ok((await checkIn.boundingBox()).height >= 44, 'the check-in quick action meets 44px');
    ok(/✓ Done today/.test(await page.locator('#qaCheckinSub').textContent()), 'a logged check-in shows its done state');
    await checkIn.click();
    await page.waitForSelector('#wellnessFormSection');
    const formVisible = await page.locator('#wellnessFormSection').isVisible();
    ok(formVisible, 'the check-in action opens the wellness form');
    await context.close();
  }

  {
    // With the Recovery module off the check-in is not offered: the readiness
    // form it opens belongs to that module (data-module hides the entry point).
    const { context, page } = await openState({ state: 'ready' });
    await page.evaluate(() => document.documentElement.setAttribute('data-module-recovery', 'off'));
    const hidden = await page.evaluate(() => {
      const btn = document.getElementById('qaCheckin');
      return getComputedStyle(btn).display === 'none' || btn.getBoundingClientRect().height === 0;
    });
    ok(hidden, 'a disabled Recovery module removes the check-in entry point');
    await context.close();
  }
  {
    // A rest that outlived a tab switch: the countdown had no UI outside the
    // cockpit, so checking History mid-rest meant guessing when to return.
    const { context, page } = await openState({ state: 'in_progress' });
    await page.evaluate(() => {
      const now = Date.now();
      localStorage.setItem('hybrid_restTimer_v1', JSON.stringify({
        v: 1, lift: 'EZ-Bar Curl', working: true, duration: 90, total: 90,
        paused: false, remaining: 90, endsAt: now + 90_000, savedAt: now,
      }));
    });
    await page.locator('.nav-item[data-target="analytics"]').click();
    await page.locator('.nav-item[data-target="home"]').click();
    await page.waitForSelector('#view-home.active');
    ok(await page.locator('#homeRestPill').isVisible(), 'a rest that outlived a tab switch shows on Home');
    const clock1 = (await page.locator('#homeRestPillClock').textContent())?.trim() || '';
    ok(/^1:[0-5]\d$/.test(clock1), `the pill states the remaining rest (${clock1})`);
    const pillBtn = page.locator('#homeRestPill .home-rest-pill__btn');
    ok(/remaining/.test((await pillBtn.getAttribute('aria-label')) || ''), 'the pill names its remaining time for a screen reader');
    ok((await pillBtn.boundingBox()).height >= 44, 'the rest pill meets 44px');
    await pillBtn.click();
    ok(await page.locator('#view-workout').evaluate((el) => el.classList.contains('active')), 'the pill returns to the workout');
    await context.close();
  }

  {
    // A finished rest leaves no pill behind.
    const { context, page } = await openState({ state: 'in_progress' });
    await page.evaluate(() => {
      const now = Date.now();
      localStorage.setItem('hybrid_restTimer_v1', JSON.stringify({
        v: 1, lift: 'EZ-Bar Curl', paused: false, remaining: 5, total: 90,
        endsAt: now - 5_000, savedAt: now - 10_000,
      }));
    });
    await page.locator('.nav-item[data-target="analytics"]').click();
    await page.locator('.nav-item[data-target="home"]').click();
    await page.waitForSelector('#view-home.active');
    ok(await page.locator('#homeRestPill').isHidden(), 'a finished rest never resurrects a pill on Home');
    await context.close();
  }
  {
    // A local-only app: the JSON export is the only copy of this device's
    // training. The reminder must be rare, dismissible, and honest about age.
    const { context, page } = await openState({ state: 'ready', backupNudge: true });
    const nudge = page.locator('#homeBackupNudge');
    ok(await nudge.isVisible(), 'a stale backup is raised on Home');
    ok(/Last backup 20 days ago/.test((await page.locator('#homeBackupNudgeText').textContent()) || ''), 'the nudge states how old the backup is');
    ok((await page.locator('#homeBackupNudge .home-backup-nudge__export').boundingBox()).height >= 44, 'the export action meets 44px');
    ok((await page.locator('#homeBackupNudge .home-backup-nudge__dismiss').boundingBox()).height >= 44, 'the dismiss control meets 44px');
    await page.locator('#homeBackupNudge .home-backup-nudge__dismiss').click();
    ok(await nudge.isHidden(), 'dismissing the backup reminder hides it');
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('hybrid_engine_v2_state');
      return raw ? JSON.parse(raw).backupNudgeDismissedAt : undefined;
    });
    ok(typeof stored === 'string' && stored.length > 0, 'the dismissal is remembered');
    await context.close();
  }

  {
    // On the Android app, automatic backups exist; Home must never nag.
    const { context, page } = await openState({ state: 'ready', backupNudge: true });
    await page.evaluate(() => {
      window.HybridAutoBackupBridge = window.HybridAutoBackupBridge || {};
    });
    await page.locator('.nav-item[data-target="analytics"]').click();
    await page.locator('.nav-item[data-target="home"]').click();
    await page.waitForSelector('#view-home.active');
    ok(await page.locator('#homeBackupNudge').isHidden(), 'a build with automatic backups is never nagged');
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
