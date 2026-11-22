// =============================================================================
// PROGRESS HUB BROWSER CHECK — roadmap Phase 3A
//
// The Progress landing is no longer a static index, so it needs the same
// contract every rebuilt analytics screen has: the four headline domains render
// with real values, secondary destinations stay reachable but quieter, Fasting
// only appears for people who fast, every control clears 44px, and nothing
// overflows at 320–412px in either theme.
// =============================================================================
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

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    if ((req.url || '').split('?')[0] === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe path');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
const BASE = `http://127.0.0.1:${port}`;
const STORAGE_KEY = 'hybrid_engine_v2_state';

const TZ = 'Australia/Sydney';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const addDays = (key, amount) => {
  const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10);
};
// Monday of the current calendar week, so the fixture always lands inside the
// week the hub is showing regardless of the day this check runs.
const mondayOf = (key) => {
  const dow = (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(key, -dow);
};
const MON = mondayOf(today);
const set = (w, r) => ({ c: true, w: String(w), r: String(r) });

// A trained athlete: sessions this week and last week, so every domain has a
// real value AND a real like-for-like comparison to render. One archived week
// sits two weeks back so the navigator can be stepped backwards twice.
function fixture(theme) {
  return {
    schemaVersion: 5, currentWeek: '2', activeProgramId: 'hybrid_engine', activeActivationId: 'current',
    settings: { name: 'Progress Athlete', theme, weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true },
    weeks: {
      '1': {
        dates: { mon: addDays(MON, -7), tue: addDays(MON, -6), wed: addDays(MON, -5) },
        lifts: {
          mon: { 'Bench Press': [set(100, 5), set(100, 5)] },
          wed: { 'Back Squat': [set(140, 5)] },
        },
        runs: { tue: { dist: '5.0', time: '25:00' } },
      },
      '2': {
        dates: { mon: MON, tue: addDays(MON, 1) },
        lifts: {
          mon: { 'Bench Press': [set(105, 5), set(105, 5)] },
          tue: { 'Back Squat': [set(142.5, 5)] },
        },
        runs: { tue: { dist: '6.0', time: '29:00' } },
      },
      'arch:past:1': {
        dates: { mon: addDays(MON, -14) },
        lifts: { mon: { 'Back Squat': [set(135, 5)] } },
      },
    },
    wellnessLog: [
      { date: today, sleep: 7.5, mood: 4, soreness: 2 },
      { date: addDays(today, -1), sleep: 8, mood: 4, soreness: 2 },
    ],
  };
}

// A 50-character unbroken custom exercise name. Athlete data must wrap, never
// widen the page; the seasonal contexts assert that at 320 and 412.
const LONG_EXERCISE = 'CableCrossoverVariationWithExtremeGripAndRangeXYZQ';

// A calendar year of training for the seasonal Year in Review: one strength +
// run week in each month of 2026, a three-day January streak and two e1RM PRs
// (Bench Press and the long-named custom lift in June). January is the busiest
// month. Week keys use the real numeric programme slots plus `arch:*` keys for
// the imported/archived January days, not fixture-only names.
function yearReviewFixture({ weightUnit = 'kg', distanceUnit = 'km', theme = 'dark' } = {}) {
  const weeks = {};
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  months.forEach((month, i) => {
    const date = `2026-${month}-10`;
    const longSets = [set(i === 5 ? 20 : 10, 10), set(i === 5 ? 20 : 10, 10)];
    weeks[String(i + 1)] = {
      dates: { mon: date },
      lifts: { mon: {
        'Back Squat': [set(100, 5)],
        'Bench Press': [set(i === 5 ? 110 : 100, 5)],
        ...(i === 0 || i === 5 ? { [LONG_EXERCISE]: longSets } : {}),
      } },
      runs: { mon: { dist: '5.0', time: '25:00' } },
    };
  });
  // Two more consecutive January days: a three-day streak inside 2026. Archived
  // keys mirror an imported week, which is a real storage shape.
  weeks['arch:streak:1'] = { dates: { tue: '2026-01-11' }, lifts: { tue: { 'Back Squat': [set(100, 5), set(100, 5)] } } };
  weeks['arch:streak:2'] = { dates: { wed: '2026-01-12' }, lifts: { wed: { 'Back Squat': [set(100, 5), set(100, 5)] } } };
  return {
    schemaVersion: 5, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'current',
    settings: {
      name: 'Year Athlete', theme, weightUnit, distanceUnit,
      weekStartDay: 'mon', onboardingComplete: true,
    },
    weeks,
  };
}

// The hub is a top-level destination; drive it the way the bottom nav does.
async function openHub(page) {
  await page.evaluate(() => {
    const cta = document.createElement('button');
    cta.setAttribute('data-action', 'open-analytics');
    cta.setAttribute('data-context', 'hub');
    cta.style.display = 'none';
    document.body.appendChild(cta);
    cta.click();
    cta.remove();
  });
}

// Wait for a navigator label with a short, explicit timeout so a stuck step
// fails the check instead of hanging the suite.
async function waitForNavLabel(page, expected) {
  return page.waitForFunction(
    (label) => document.getElementById('weekNavLabel')?.textContent?.trim() === label,
    expected,
    { timeout: 2000 },
  ).then(() => true).catch(() => false);
}

// Open Review → Stats on a pinned day. Off-season the Year section settles by
// hiding itself; in-season it settles by rendering content.
async function openYearReview(browser, { todayISO, width, theme = 'dark', weightUnit = 'kg', distanceUnit = 'km' }, failures) {
  const label = `year review ${width}px/${weightUnit}`;
  const context = await createBrowserContext(browser, { viewport: { width, height: 844 }, timezoneId: TZ, colorScheme: theme });
  await context.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(yearReviewFixture({ weightUnit, distanceUnit, theme }))]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/frame-ancestors.*ignored.*meta/i.test(message.text()) && !/net::ERR_/.test(message.text())) errors.push(message.text());
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await openHub(page);
  await page.waitForSelector('#analytics-hub.active .ph-card');
  await page.click('.ph-card[data-context="weekly-review"]', { timeout: 2000 }).catch(() => failures.push(`${label}: Review card did not open`));
  await page.waitForSelector('#analytics-weekly-review.active', { timeout: 4000 }).catch(() => failures.push(`${label}: Review did not open`));
  await page.click('#analytics-weekly-review [data-an-tab="stats"]', { timeout: 2000 }).catch(() => failures.push(`${label}: Stats tab did not open`));
  await page.waitForFunction(() => {
    const el = document.getElementById('yearReviewContainer');
    return !!el && (el.hidden === true || el.children.length > 0);
  }, null, { timeout: 4000 }).catch(() => failures.push(`${label}: Year in Review never settled`));
  return { context, page, errors };
}

async function readYearReview(page) {
  return page.$eval('#analytics-weekly-review', (section, longName) => {
    const el = document.getElementById('yearReviewContainer');
    const heading = el?.querySelector('h2.section-header');
    return {
      exists: !!el,
      hidden: el?.hidden === true,
      display: el ? getComputedStyle(el).display : 'missing',
      height: el ? el.getBoundingClientRect().height : 0,
      headingText: heading?.textContent?.trim() || '',
      headingHeight: heading ? heading.getBoundingClientRect().height : 0,
      yearHeadings: [...section.querySelectorAll('h2.section-header')]
        .filter((node) => node.textContent.trim() === 'Year in Review')
        .map((node) => ({ display: getComputedStyle(node).display, height: node.getBoundingClientRect().height })),
      text: el?.textContent?.replace(/\s+/g, ' ').trim() || '',
      sectionText: section.textContent || '',
      statLabels: [...(el?.querySelectorAll('.wrev-stats .wrev-stat__k') || [])].map((node) => node.textContent.trim()),
      statValues: [...(el?.querySelectorAll('.wrev-stats .wrev-stat__v') || [])].map((node) => node.textContent.trim()),
      containerOverflow: !!el && el.scrollWidth > el.clientWidth + 1,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      longNameVisible: !!el && el.textContent.includes(longName),
      weeklyReviewVisible: (() => {
        const weekly = document.getElementById('weeklyReviewContainer');
        return !!weekly && weekly.getBoundingClientRect().height > 0;
      })(),
    };
  }, LONG_EXERCISE);
}

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const failures = [];
try {
  for (const [width, theme] of [[320, 'dark'], [390, 'light'], [412, 'dark']]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 844 }, timezoneId: TZ, colorScheme: theme });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(fixture(theme))]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !/frame-ancestors.*ignored.*meta/i.test(message.text()) && !/net::ERR_/.test(message.text())) errors.push(message.text());
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await openHub(page);
    await page.waitForSelector('#analytics-hub.active .ph-card');

    const seen = await page.$eval('#analytics-hub', (section) => {
      const cards = [...section.querySelectorAll('.ph-card')];
      return {
        contexts: cards.map((card) => card.getAttribute('data-context')),
        // Every card must show a real headline and a plain-language sentence.
        values: cards.map((card) => card.querySelector('.ph-card__value')?.textContent?.trim() || ''),
        says: cards.map((card) => card.querySelector('.ph-card__say')?.textContent?.trim() || ''),
        secondary: [...section.querySelectorAll('.hub-link--quiet')].map((link) => link.getAttribute('data-context')),
        hasMethod: !!section.querySelector('.an-method'),
        hasWeekHero: !!section.querySelector('.ph-week'),
        weekHeroText: section.querySelector('.ph-week')?.textContent?.trim() || '',
        heroEyebrow: section.querySelector('.ph-week__eyebrow')?.textContent?.trim() || '',
        weekBars: section.querySelectorAll('.ph-weeks__bar').length,
        weekBarsHidden: [...section.querySelectorAll('.ph-weeks__bar')].every((bar) => bar.getAttribute('aria-hidden') === 'true'),
        weekHead: section.querySelector('.ph-weeks__head')?.textContent?.trim() || '',
        weekStripLabel: section.querySelector('.ph-weeks')?.getAttribute('aria-label') || '',
        weekSummary: section.querySelector('.ph-weeks .sr-only')?.textContent?.trim() || '',
        weekScale: section.querySelector('.ph-weeks__scale')?.textContent?.trim() || '',
        // The week label must name the real Monday–Sunday range, not a program week.
        sub: section.querySelector('.hub-sub')?.textContent?.trim() || '',
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        smallControls: [...section.querySelectorAll('button')].filter((button) => {
          const box = button.getBoundingClientRect(); return box.width > 0 && box.height > 0 && box.height < 43;
        }).length,
      };
    });
    console.log(`Progress hub ${width}px/${theme}:`, JSON.stringify(seen, null, 0));

    const expected = ['weekly-review', 'strength', 'running', 'recovery'];
    if (seen.contexts.join(',') !== expected.join(',')) {
      failures.push(`${width}px: expected domains ${expected.join(',')} but got ${seen.contexts.join(',')}`);
    }
    if (seen.values.some((value) => !value)) failures.push(`${width}px: a domain card rendered without a headline value`);
    if (seen.says.some((say) => say.length < 10)) failures.push(`${width}px: a domain card rendered without an interpretation`);
    // Strength should show a real same-exercise gain from the fixture, not a dash.
    if (seen.values[1] === '—') failures.push(`${width}px: strength headline is empty despite logged sets`);
    if (seen.secondary.includes('hybrid-score')) failures.push(`${width}px: Hybrid Score must not appear as a secondary destination`);
    if (seen.secondary.includes('fasting')) failures.push(`${width}px: Fasting must not appear for a profile with no fasting history`);
    if (!seen.hasMethod) failures.push(`${width}px: missing "how this is calculated" disclosure`);
    if (!seen.hasWeekHero) failures.push(`${width}px: missing the this-week overview`);
    if (!/session/i.test(seen.weekHeroText)) failures.push(`${width}px: week overview does not name sessions`);
    if (seen.weekBars !== 12) failures.push(`${width}px: recent-weeks strip should have 12 bars (got ${seen.weekBars})`);
    if (!seen.weekBarsHidden) failures.push(`${width}px: recent-weeks bars are unlabelled images instead of a hidden chart with one summary`);
    if (!/12 weeks ending this week/i.test(seen.weekHead)) failures.push(`${width}px: strip head does not name the window ending at the selection (${seen.weekHead})`);
    if (!/12 weeks ending this week/i.test(seen.weekStripLabel)) failures.push(`${width}px: strip aria-label does not name the window ending at the selection (${seen.weekStripLabel})`);
    if (!/session/i.test(seen.weekSummary) || !/12 weeks ending this week/i.test(seen.weekSummary)) {
      failures.push(`${width}px: strip has no accessible summary of its 12-week window (${seen.weekSummary})`);
    }
    if (!seen.sub) failures.push(`${width}px: hub has no subtitle`);
    if (/\d{4}-\d{2}-\d{2}/.test(seen.sub)) failures.push(`${width}px: hub subtitle leaks an ISO date (${seen.sub})`);
    const navDates = await page.$eval('#weekNavDates', (el) => el.textContent.trim());
    if (!/^(\d{1,2}–\d{1,2} [A-Z][a-z]{2}|\d{1,2} [A-Z][a-z]{2} – \d{1,2} [A-Z][a-z]{2})$/.test(navDates)) {
      failures.push(`${width}px: week navigator does not name a human date range (${navDates})`);
    }
    // The hero eyebrow is the selected range; the navigator owns "This week".
    if (seen.heroEyebrow !== navDates) failures.push(`${width}px: overview eyebrow does not name the selected range (${seen.heroEyebrow} vs ${navDates})`);
    if (!seen.weekScale.endsWith(navDates)) failures.push(`${width}px: strip scale does not end on the selected range (${seen.weekScale} vs ${navDates})`);
    if (seen.overflow) failures.push(`${width}px: page-level horizontal overflow`);
    if (seen.smallControls) failures.push(`${width}px: ${seen.smallControls} controls below the 44px target`);

    // The hub is week-steppable: the shared navigator must be visible and the
    // header + cards must follow it. This is the one period control.
    const navVisible = await page.$eval('#analyticsWeekNav', (el) => getComputedStyle(el).display !== 'none');
    if (!navVisible) failures.push(`${width}px: hub does not expose the calendar-week navigator`);
    // Skip a disabled back button rather than clicking it: at the earliest
    // logged week it is disabled and an unconditional click would hang.
    if (!(await page.$('#weekNavPrev:not([disabled])'))) {
      failures.push(`${width}px: the week navigator cannot step back into logged history`);
    } else {
      await page.click('#weekNavPrev:not([disabled])', { timeout: 2000 });
      if (!(await waitForNavLabel(page, 'Previous week'))) failures.push(`${width}px: stepping back did not label the previous week`);
      const previous = await page.$eval('#analytics-hub', (el) => ({
        heroEyebrow: el.querySelector('.ph-week__eyebrow')?.textContent?.trim() || '',
        heroLabel: el.querySelector('.ph-week')?.getAttribute('aria-label') || '',
        weekHead: el.querySelector('.ph-weeks__head')?.textContent?.trim() || '',
        weekScale: el.querySelector('.ph-weeks__scale')?.textContent?.trim() || '',
        runningValue: el.querySelector('.ph-card[data-context="running"] .ph-card__value')?.textContent?.trim() || '',
        runningSay: el.querySelector('.ph-card[data-context="running"] .ph-card__say')?.textContent?.trim() || '',
        hasHero: !!el.querySelector('.ph-week'),
      }));
      const previousDates = await page.$eval('#weekNavDates', (el) => el.textContent.trim());
      if (previous.heroEyebrow !== previousDates) failures.push(`${width}px: the overview eyebrow did not follow the navigator (${previous.heroEyebrow} vs ${previousDates})`);
      // The accessible name is the visible range, not the relative period.
      if (previous.heroLabel !== `${previousDates} overview`) failures.push(`${width}px: the overview aria-label does not name the selected range (${previous.heroLabel} vs ${previousDates})`);
      // The Running card must show the SELECTED week's distance (5.0 km), not
      // the live week's (6.0 km) — the engine is anchored by the through-date.
      if (!/^5\.0/.test(previous.runningValue)) failures.push(`${width}px: Running card ignored the selected week (${previous.runningValue})`);
      if (!/that week/.test(previous.runningSay)) failures.push(`${width}px: Running prose still speaks about the live week (${previous.runningSay})`);
      if (!/12 weeks ending previous week/i.test(previous.weekHead)) failures.push(`${width}px: the strip head did not follow the navigator (${previous.weekHead})`);
      if (!previous.weekScale.endsWith(previousDates)) failures.push(`${width}px: the strip did not follow the navigator (${previous.weekScale})`);
      if (!previous.hasHero) failures.push(`${width}px: previous week lost its overview`);

      // A second step back (the fixture logs a week two weeks ago), then a
      // return through Next and Today. Each step has a short timeout.
      if (!(await page.$('#weekNavPrev:not([disabled])'))) {
        failures.push(`${width}px: the fixture should allow a second step back`);
      } else {
        await page.click('#weekNavPrev:not([disabled])', { timeout: 2000 });
        if (!(await waitForNavLabel(page, '2 weeks ago'))) failures.push(`${width}px: second step back did not reach two weeks ago`);
        const twoBack = await page.$eval('#analytics-hub', (el) => ({
          heroEyebrow: el.querySelector('.ph-week__eyebrow')?.textContent?.trim() || '',
          weekHead: el.querySelector('.ph-weeks__head')?.textContent?.trim() || '',
        }));
        const twoBackDates = await page.$eval('#weekNavDates', (el) => el.textContent.trim());
        if (twoBack.heroEyebrow !== twoBackDates) failures.push(`${width}px: two weeks back eyebrow is stale (${twoBack.heroEyebrow} vs ${twoBackDates})`);
        if (!/12 weeks ending 2 weeks ago/i.test(twoBack.weekHead)) failures.push(`${width}px: two weeks back strip head is stale (${twoBack.weekHead})`);

        await page.click('#weekNavNext:not([disabled])', { timeout: 2000 });
        if (!(await waitForNavLabel(page, 'Previous week'))) failures.push(`${width}px: stepping forward did not return to the previous week`);
        const forwardDates = await page.$eval('#weekNavDates', (el) => el.textContent.trim());
        if (forwardDates !== previousDates) failures.push(`${width}px: stepping forward did not restore the previous week (${forwardDates} vs ${previousDates})`);
      }

      // Review follows the SAME navigator. Opened from the previous week its
      // Overview must describe THAT week — never the active programme's plan —
      // and its Stats tab (monthly report, streak, goals, consistency log) is
      // not week-scoped, so the navigator must disappear there.
      const reviewCard = await page.$('.ph-card[data-context="weekly-review"]');
      if (!reviewCard) {
        failures.push(`${width}px: the hub lost its Review card while stepped back`);
      } else {
        await reviewCard.click({ timeout: 2000 }).catch(() => {
          failures.push(`${width}px: the Review card did not open from a stepped-back week`);
        });
        const reviewOpen = await page.waitForSelector('#analytics-weekly-review.active', { timeout: 3000 })
          .then(() => true).catch(() => false);
        if (!reviewOpen) {
          failures.push(`${width}px: Review did not open from the previous week`);
        } else {
          const onOverview = await page.$eval('#analytics-weekly-review',
            (section) => section.querySelector('[data-an-tab="overview"].an-tab--active') !== null);
          if (!onOverview) {
            failures.push(`${width}px: Review did not open on its Overview tab`);
            await page.click('#analytics-weekly-review [data-an-tab="overview"]', { timeout: 2000 }).catch(() => {});
          }
          const pastReview = await page.$eval('#analytics-weekly-review', (section) => ({
            heroRange: section.querySelector('.an-hero__k')?.textContent?.trim() || '',
            text: section.textContent || '',
            navVisible: getComputedStyle(document.getElementById('analyticsWeekNav')).display !== 'none',
          }));
          if (!pastReview.navVisible) failures.push(`${width}px: Review Overview does not expose the calendar-week navigator`);
          if ((await page.$eval('#weekNavLabel', (el) => el.textContent.trim())) !== 'Previous week') {
            failures.push(`${width}px: Review Overview did not keep the previous-week navigator label`);
          }
          // The header names the real Mon–Sun span, never "This week".
          if (pastReview.heroRange !== previousDates) {
            failures.push(`${width}px: Review Overview did not name the selected week (${pastReview.heroRange} vs ${previousDates})`);
          }
          // A historical week has no plan to score and no week to advise.
          if (/planned|adherence/i.test(pastReview.text)) {
            failures.push(`${width}px: Review scored a historical week against the active plan`);
          }
          if (/Next week's focus/i.test(pastReview.text)) {
            failures.push(`${width}px: Review promised next-week advice for a completed week`);
          }

          // Stats is not week-scoped: the shared navigator must hide there.
          await page.click('#analytics-weekly-review [data-an-tab="stats"]', { timeout: 2000 }).catch(() => {
            failures.push(`${width}px: Review Stats tab did not open`);
          });
          const statsNavHidden = await page.waitForFunction(
            () => getComputedStyle(document.getElementById('analyticsWeekNav')).display === 'none',
            null,
            { timeout: 2000 },
          ).then(() => true).catch(() => false);
          if (!statsNavHidden) failures.push(`${width}px: Review Stats kept the calendar-week navigator visible`);
          const statsReview = await page.$eval('#weeklyReviewContainer', (el) => ({
            text: el.textContent || '',
            bars: el.querySelectorAll('.wrev-bar').length,
          })).catch(() => ({ text: '', bars: 0 }));
          if (statsReview.bars > 0 || /planned/i.test(statsReview.text)) {
            failures.push(`${width}px: Review Stats scored a historical week against the active plan`);
          }
          if (/Next week's focus/i.test(statsReview.text)) {
            failures.push(`${width}px: Review Stats promised next-week advice for a completed week`);
          }

          // The back link preserves the selected week, so the existing
          // return-to-this-week step below still runs from the hub.
          await page.click('#view-analytics .subview-back-btn', { timeout: 2000 }).catch(() => {
            failures.push(`${width}px: Review did not offer a route back to the hub`);
          });
          const backToHub = await page.waitForSelector('#analytics-hub.active', { timeout: 3000 })
            .then(() => true).catch(() => false);
          if (!backToHub) failures.push(`${width}px: Review back did not return to the hub`);
          if (!(await waitForNavLabel(page, 'Previous week'))) {
            failures.push(`${width}px: Review lost the selected week on the way back to the hub`);
          }
        }
      }

      if (!(await page.$('#weekNavToday:not([hidden])'))) {
        failures.push(`${width}px: could not return to this week after the Review detour`);
      } else {
        await page.click('#weekNavToday:not([hidden])', { timeout: 2000 });
        if (!(await waitForNavLabel(page, 'This week'))) failures.push(`${width}px: return-to-this-week did not restore the live week`);
        const returnedDates = await page.$eval('#weekNavDates', (el) => el.textContent.trim());
        if (returnedDates !== navDates) failures.push(`${width}px: return-to-this-week restored the wrong week (${returnedDates} vs ${navDates})`);
      }
    }

    // Tapping a domain must reach its detail screen.
    await page.click('.ph-card[data-context="strength"]');
    await page.waitForSelector('#analytics-strength.active', { timeout: 4000 }).catch(() => {
      failures.push(`${width}px: Strength domain card did not open the Strength screen`);
    });

    // An exercise drilldown carries a real chart, stat cards and session evidence.
    await page.click('#analytics-strength [data-an-tab="stats"]');
    await page.waitForTimeout(250);
    const exerciseLink = await page.$('#analytics-strength [data-action="open-analytics"][data-context="exercise"]');
    if (!exerciseLink) {
      failures.push(`${width}px: Strength has no exercise drilldown link`);
    } else {
      await exerciseLink.click();
      await page.waitForSelector('#analytics-strength-entity.active', { timeout: 4000 }).catch(() => {
        failures.push(`${width}px: exercise link did not open the exercise detail`);
      });
      const detail = await page.$eval('#analytics-strength-entity', (el) => ({
        hero: el.querySelector('.an-ex-hero__v')?.textContent?.trim() || '',
        stats: el.querySelectorAll('.an-ex-summary article').length,
        points: el.querySelectorAll('[data-exercise-point]').length,
        rows: el.querySelectorAll('.an-evidence-row').length,
        chartTitle: el.querySelector('.an-ex-chart-panel h3')?.textContent?.trim() || '',
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }));
      if (!detail.hero) failures.push(`${width}px: exercise detail has no latest-set hero`);
      if (detail.stats < 4) failures.push(`${width}px: exercise detail is missing summary cards`);
      if (detail.points < 1) failures.push(`${width}px: exercise detail has no trend points`);
      if (detail.rows < 1) failures.push(`${width}px: exercise detail has no session evidence`);
      if (!detail.chartTitle) failures.push(`${width}px: exercise chart has no title`);
      if (detail.overflow) failures.push(`${width}px: exercise detail overflows horizontally`);
      await page.click('#analytics-strength-entity [data-exercise-range="all"]');
      await page.waitForTimeout(250);
      const allPressed = await page.$eval('#analytics-strength-entity [data-exercise-range="all"]', (el) => el.getAttribute('aria-pressed'));
      if (allPressed !== 'true') failures.push(`${width}px: exercise range did not switch to All time`);
    }

    // Review → Stats must show a twelve-week calendar log, not a program-week
    // grid that hides imported/archived sessions.
    await openHub(page);
    await page.click('.ph-card[data-context="weekly-review"]');
    await page.waitForSelector('#analytics-weekly-review.active', { timeout: 4000 }).catch(() => {
      failures.push(`${width}px: Review domain card did not open the Review screen`);
    });
    await page.click('#analytics-weekly-review [data-an-tab="stats"]');
    await page.waitForSelector('#analyticsTimelineTableBody tr', { timeout: 4000 }).catch(() => {});
    const reviewStats = await page.$eval('#analytics-weekly-review', (section) => ({
      rows: section.querySelectorAll('#analyticsTimelineTableBody tr').length,
      calendarCells: section.querySelectorAll('#streakHeatmapContainer rect').length,
      firstRow: section.querySelector('#analyticsTimelineTableBody tr')?.textContent?.trim() || '',
    }));
    if (reviewStats.rows !== 12) failures.push(`${width}px: Review log should have 12 calendar weeks (got ${reviewStats.rows})`);
    if (reviewStats.calendarCells < 2) failures.push(`${width}px: Review training calendar is empty`);
    if (!/[A-Za-z]{3}/.test(reviewStats.firstRow)) failures.push(`${width}px: Review log does not label calendar weeks`);

    // The training report switches between a 30-day and a 12-month window and
    // states its real date range + active-day count.
    const report = await page.$eval('#monthlyReportContainer', (el) => ({
      hasToggle: !!el.querySelector('[data-report-period="month"]') && !!el.querySelector('[data-report-period="year"]'),
      range: el.querySelector('.an-detail-period')?.textContent?.trim() || '',
      stats: el.querySelectorAll('.wrev-stat').length,
    }));
    if (!report.hasToggle) failures.push(`${width}px: Training Report has no 30-day/12-month toggle`);
    if (!/active day/.test(report.range)) failures.push(`${width}px: Training Report does not state its range/active days`);
    if (report.stats < 4) failures.push(`${width}px: Training Report is missing its summary stats`);
    await page.click('#monthlyReportContainer [data-report-period="year"]');
    await page.waitForTimeout(250);
    const yearPressed = await page.$eval('#monthlyReportContainer [data-report-period="year"]', (el) => el.getAttribute('aria-pressed'));
    if (yearPressed !== 'true') failures.push(`${width}px: 12-month report did not activate`);
    await page.click('#monthlyReportContainer [data-report-period="month"]');
    await page.waitForTimeout(200);

    if (errors.length) failures.push(`${width}px: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }

  // A brand-new profile must lead with one honest empty state, not four dashes.
  {
    const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: TZ, colorScheme: 'dark' });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify({
      schemaVersion: 5, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'current',
      settings: { name: 'New', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true },
      weeks: {},
    })]);
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await openHub(page);
    await page.waitForSelector('#analytics-hub.active .ph-card');
    const empty = await page.$eval('#analytics-hub', (section) => ({
      hasEmptyLead: !!section.querySelector('.ph-empty'),
      hasWeekHero: !!section.querySelector('.ph-week'),
      cards: section.querySelectorAll('.ph-card').length,
      // No fabricated comparison may survive an empty week.
      deltas: section.querySelectorAll('.ph-card__delta').length,
    }));
    console.log('Progress hub empty profile:', JSON.stringify(empty));
    if (!empty.hasEmptyLead) failures.push('empty profile: missing the single leading empty state');
    if (empty.hasWeekHero) failures.push('empty profile: rendered a this-week hero with no data');
    if (empty.cards !== 4) failures.push('empty profile: expected all four domains to still render');
    if (empty.deltas !== 0) failures.push('empty profile: rendered a comparison with nothing to compare');
    await context.close();
  }

  // The Year in Review is seasonal, so its real surface can only be exercised
  // with a pinned clock. The fixture spans 2026 with a strength + run week in
  // every month, a January streak, two PRs and a 50-character custom lift.
  {
    const { context, page, errors } = await openYearReview(browser, { todayISO: '2026-12-15', width: 390 }, failures);
    const seen = await readYearReview(page);
    console.log('Year in Review (390px/kg, pinned December):', JSON.stringify({ ...seen, text: seen.text.slice(0, 360) }));

    if (!seen.exists || seen.hidden || seen.display === 'none' || seen.height <= 0) {
      failures.push('year review 390kg: the section is not visible in December');
    }
    if (seen.headingText !== 'Year in Review' || seen.headingHeight <= 0) {
      failures.push(`year review 390kg: missing a visible Year in Review heading (${seen.headingText}/${seen.headingHeight})`);
    }
    if (!/Year in Review/.test(seen.sectionText)) failures.push('year review 390kg: missing the Year in Review heading');
    if (!/2026/.test(seen.text)) failures.push('year review 390kg: the hero does not name the year');
    if (!seen.text.includes('Jan 1 – Dec 15, 2026')) failures.push(`year review 390kg: missing the explicit partial-year range (${seen.text.slice(0, 140)})`);
    if (!/\b26 sessions\b/.test(seen.text)) failures.push('year review 390kg: the hero does not report the annual session count');
    if (!seen.statLabels.includes('Working sets')) failures.push('year review 390kg: missing the working-sets stat');
    if (seen.statValues[0] !== '14.7t') failures.push(`year review 390kg: Lifted should be 14.7t (got ${seen.statValues[0]})`);
    if (seen.statValues[1] !== '60 km') failures.push(`year review 390kg: Run should be 60 km (got ${seen.statValues[1]})`);
    if (seen.statValues[2] !== '32') failures.push(`year review 390kg: working sets should be 32 (got ${seen.statValues[2]})`);
    if (seen.statValues[3] !== '2') failures.push(`year review 390kg: e1RM PR count should be 2 (got ${seen.statValues[3]})`);
    if (!/Most trained/.test(seen.text) || !/January/.test(seen.text)) failures.push('year review 390kg: missing the best month');
    if (!/Longest consecutive run/.test(seen.text) || !/3 days/.test(seen.text) || !/consecutive training days/.test(seen.text)) {
      failures.push('year review 390kg: missing the in-year consecutive run');
    }
    if (!/Top exercises/.test(seen.text) || !seen.longNameVisible) failures.push('year review 390kg: missing the top exercises/long-named lift');
    if (!/e1RM PRs/.test(seen.text) || !/Barbell Bench Press/.test(seen.text) || !/128 kg/.test(seen.text)) {
      failures.push('year review 390kg: missing the annual e1RM PR');
    }
    if (seen.documentOverflow || seen.containerOverflow) failures.push('year review 390kg: horizontal overflow');
    if (errors.length) failures.push(`year review 390kg: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }

  // The same recap in the athlete's other units: pounds are labelled, never
  // converted, and the run follows the distance setting.
  {
    const { context, page, errors } = await openYearReview(browser, {
      todayISO: '2026-12-15', width: 390, theme: 'light', weightUnit: 'lbs', distanceUnit: 'mi',
    }, failures);
    const seen = await readYearReview(page);
    console.log('Year in Review (390px/lbs, pinned December):', JSON.stringify({ ...seen, text: seen.text.slice(0, 220) }));

    if (!seen.exists || seen.hidden || seen.height <= 0) failures.push('year review 390lbs: the section is not visible');
    if (seen.statValues[0] !== '14,650 lb') failures.push(`year review 390lbs: Lifted should be 14,650 lb (got ${seen.statValues[0]})`);
    if (seen.statValues[1] !== '37.3 mi') failures.push(`year review 390lbs: Run should be 37.3 mi (got ${seen.statValues[1]})`);
    if (!/128 lbs/.test(seen.text)) failures.push('year review 390lbs: the PR does not use pounds');
    if (seen.documentOverflow || seen.containerOverflow) failures.push('year review 390lbs: horizontal overflow');
    if (errors.length) failures.push(`year review 390lbs: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }

  // A long custom exercise name must wrap at both narrow widths (light theme).
  for (const width of [320, 412]) {
    const { context, page, errors } = await openYearReview(browser, {
      todayISO: '2026-12-15', width, theme: 'light',
    }, failures);
    const seen = await readYearReview(page);
    console.log(`Year in Review (${width}px/light, long name):`, JSON.stringify({
      visible: seen.exists && !seen.hidden && seen.height > 0,
      longNameVisible: seen.longNameVisible,
      containerOverflow: seen.containerOverflow,
      documentOverflow: seen.documentOverflow,
    }));

    if (!seen.exists || seen.hidden || seen.height <= 0) failures.push(`year review ${width}px: the section is not visible`);
    if (seen.headingText !== 'Year in Review') failures.push(`year review ${width}px: missing the heading`);
    if (!seen.longNameVisible) failures.push(`year review ${width}px: the long-named exercise is missing`);
    if (seen.containerOverflow) failures.push(`year review ${width}px: the container overflows horizontally`);
    if (seen.documentOverflow) failures.push(`year review ${width}px: the page overflows horizontally`);
    if (errors.length) failures.push(`year review ${width}px: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }

  // Off-season (June 2027): the whole section is absent — container AND heading
  // — while the rest of Stats still renders.
  {
    const { context, page, errors } = await openYearReview(browser, { todayISO: '2027-06-15', width: 390 }, failures);
    const seen = await readYearReview(page);
    console.log('Year in Review (June, off-season):', JSON.stringify({
      exists: seen.exists,
      hidden: seen.hidden,
      display: seen.display,
      height: seen.height,
      yearHeadings: seen.yearHeadings,
      weeklyReviewVisible: seen.weeklyReviewVisible,
    }));

    if (!seen.exists) failures.push('year review off-season: the container is missing');
    if (!seen.hidden || seen.display !== 'none' || seen.height !== 0) {
      failures.push(`year review off-season: the container is visible (${seen.display}/${seen.height})`);
    }
    if (seen.yearHeadings.length !== 0 || seen.headingHeight !== 0 || seen.text !== '') {
      failures.push('year review off-season: a Year in Review heading or copy survived');
    }
    if (!seen.weeklyReviewVisible) failures.push('year review off-season: hiding the year blanked the rest of Stats');
    if (errors.length) failures.push(`year review off-season: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`)); process.exit(1);
}
console.log('Progress hub browser contract passed.');
