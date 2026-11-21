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
import { createBrowserContext, resolveChromium } from './browser-runtime.mjs';

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
// real value AND a real like-for-like comparison to render.
function fixture(theme) {
  return {
    schemaVersion: 5, currentWeek: '2', activeProgramId: 'hybrid_engine', activeActivationId: 'current',
    settings: { name: 'Progress Athlete', theme, weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true },
    weeks: {
      '1': {
        dates: { mon: addDays(MON, -7), wed: addDays(MON, -5) },
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
    },
    wellnessLog: [
      { date: today, sleep: 7.5, mood: 4, soreness: 2 },
      { date: addDays(today, -1), sleep: 8, mood: 4, soreness: 2 },
    ],
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
        weekBars: section.querySelectorAll('.ph-weeks__bar').length,
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
    if (!/This week$/.test(seen.weekScale)) failures.push(`${width}px: strip does not name the selected week (${seen.weekScale})`);
    if (!seen.sub) failures.push(`${width}px: hub has no subtitle`);
    if (/\d{4}-\d{2}-\d{2}/.test(seen.sub)) failures.push(`${width}px: hub subtitle leaks an ISO date (${seen.sub})`);
    const navDates = await page.$eval('#weekNavDates', (el) => el.textContent.trim());
    if (!/^(\d{1,2}–\d{1,2} [A-Z][a-z]{2}|\d{1,2} [A-Z][a-z]{2} – \d{1,2} [A-Z][a-z]{2})$/.test(navDates)) {
      failures.push(`${width}px: week navigator does not name a human date range (${navDates})`);
    }
    if (seen.overflow) failures.push(`${width}px: page-level horizontal overflow`);
    if (seen.smallControls) failures.push(`${width}px: ${seen.smallControls} controls below the 44px target`);

    // The hub is week-steppable: the shared navigator must be visible and the
    // header + cards must follow it. This is the one period control.
    const navVisible = await page.$eval('#analyticsWeekNav', (el) => getComputedStyle(el).display !== 'none');
    if (!navVisible) failures.push(`${width}px: hub does not expose the calendar-week navigator`);
    await page.click('#weekNavPrev');
    await page.waitForTimeout(350);
    const previous = await page.$eval('#analytics-hub', (el) => ({
      navLabel: document.getElementById('weekNavLabel')?.textContent?.trim() || '',
      heroEyebrow: el.querySelector('.ph-week__eyebrow')?.textContent?.trim() || '',
      weekScale: el.querySelector('.ph-weeks__scale')?.textContent?.trim() || '',
      hasHero: !!el.querySelector('.ph-week'),
    }));
    if (previous.navLabel !== 'Previous week') failures.push(`${width}px: stepping back did not label the previous week (${previous.navLabel})`);
    if (previous.heroEyebrow !== 'Previous week') failures.push(`${width}px: the overview did not follow the navigator (${previous.heroEyebrow})`);
    if (!/Previous week$/.test(previous.weekScale)) failures.push(`${width}px: the strip did not follow the navigator (${previous.weekScale})`);
    if (!previous.hasHero) failures.push(`${width}px: previous week lost its overview`);
    await page.click('#weekNavToday');
    await page.waitForTimeout(350);
    const returned = await page.$eval('#weekNavLabel', (el) => el.textContent.trim());
    if (returned !== 'This week') failures.push(`${width}px: return-to-this-week did not restore the live week (${returned})`);

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
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`)); process.exit(1);
}
console.log('Progress hub browser contract passed.');
