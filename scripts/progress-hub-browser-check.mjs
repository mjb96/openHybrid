// =============================================================================
// PROGRESS HUB BROWSER CHECK — roadmap Phase 3A
//
// Roadmap §16: the hub is a strength-first band list with ONE home per
// destination. This check verifies the registry contract on the real surface:
// no "More detail" footer, header History/info icons, a Details control on every
// band with a drilldown, the single Reviews Week | Month | Year row, origin-aware
// Back to the band, Customize rows/toggles/reorder/Open, a hidden-section case,
// 44px controls, 320–412px, light/dark and 200% text.
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
    // Body data INSIDE the selected range, so the Body band renders and its
    // route into Measures can be exercised. Without it the band is absent by
    // design (it only appears when it has something true to say).
    bodyWeightLog: [{ date: addDays(MON, -20), weight: 80 }, { date: addDays(MON, -2), weight: 78.4 }],
    bodyMeasurements: [{ date: addDays(MON, -2), waist: 82, chest: 104 }],
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

/**
 * The app page is a secure context, so Chromium exposes Web Share and the card
 * takes that path instead of downloading. Pin the fallback so the browser
 * contract can assert the real PNG download.
 */
async function disableWebShare(page) {
  await page.evaluate(() => {
    for (const name of ['share', 'canShare']) {
      try { Object.defineProperty(navigator, name, { value: undefined, configurable: true }); } catch (_) {}
    }
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
  await disableWebShare(page);
  await openHub(page);
  await page.waitForSelector('#analytics-hub.active .pg-band');
  await page.click('.pg-reviews__seg[data-context="weekly-review"]', { timeout: 2000 }).catch(() => failures.push(`${label}: Review row did not open`));
  await page.waitForSelector('#analytics-weekly-review.active', { timeout: 4000 }).catch(() => failures.push(`${label}: Review did not open`));
  await page.click('#analytics-weekly-review [data-an-tab="year"]', { timeout: 2000 }).catch(() => failures.push(`${label}: Year tab did not open`));
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
      heatmap: (() => {
        const heat = document.getElementById('yearHeatmapContainer');
        if (!heat) return { exists: false };
        return {
          exists: true,
          hidden: heat.hidden === true || getComputedStyle(heat).display === 'none',
          height: heat.getBoundingClientRect().height,
          heading: heat.querySelector('h2.section-header')?.textContent?.trim() || '',
          months: heat.querySelectorAll('.pg-year__month').length,
          days: heat.querySelectorAll('[data-action="open-activities-day"]').length,
          shaded: heat.querySelectorAll('.pg-year__cell--l1, .pg-year__cell--l2, .pg-year__cell--l3, .pg-year__cell--l4').length,
          unmeasured: heat.querySelectorAll('.pg-year__cell--logged:not(.pg-year__cell--measured)').length,
          text: heat.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160) || '',
          overflow: heat.scrollWidth > heat.clientWidth + 1,
        };
      })(),
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
    await disableWebShare(page);
    await openHub(page);
    await page.waitForSelector('#analytics-hub.active .pg-band');

    const seen = await page.$eval('#analytics-hub', (section) => {
      const bands = [...section.querySelectorAll('.pg-band')];
      return {
        bands: bands.map((band) => band.getAttribute('data-band')),
        // Every measured band must carry a headline value and no empty chart
        // shell. Reviews is a Week | Month | Year row, not a measurement, so it
        // is the one band with no headline to show.
        values: bands
          // Reviews is a Week | Month | Year row, not a measurement: it has no
          // headline to show (Pulse, and every data band, do).
          .filter((band) => band.getAttribute('data-band') !== 'reviews')
          .map((band) => band.querySelector('.pg-band__value')?.textContent?.trim() || ''),
        rangeChips: section.querySelectorAll('[data-pg-range]').length,
        selectedRange: section.querySelector('[data-pg-range][aria-pressed="true"]')?.getAttribute('data-pg-range') || '',
        footerLinks: section.querySelectorAll('.hub-link--quiet, .hub-group, .an-method').length,
        hasMethod: !!section.querySelector('.hub-head details.pg-method'),
        headerHistory: !!section.querySelector('.hub-head [data-action="open-activities"]'),
        detailHeads: [...section.querySelectorAll('.pg-band__head--detail')].map((node) => node.getAttribute('data-context')),
        reviews: [...section.querySelectorAll('[data-band="reviews"] .pg-reviews__seg')].map((node) => node.getAttribute('data-context')),
        // The Pulse band replaced the old week hero: same contract, same
        // assertions — the top of the page names the SELECTED week in real
        // dates and follows the navigator.
        hasWeekHero: !!section.querySelector('[data-band="pulse"]'),
        weekHeroText: section.querySelector('[data-band="pulse"]')?.textContent?.trim() || '',
        heroEyebrow: section.querySelector('[data-band="pulse"] .pg-band__sub')?.textContent?.trim() || '',
        weekScale: section.querySelector('.ph-weeks__scale')?.textContent?.trim() || '',
        // The week label must name the real Monday–Sunday range, not a program week.
        sub: section.querySelector('.hub-sub')?.textContent?.trim() || '',
        // Name the offender: a bare "horizontal overflow" costs a whole run to
        // diagnose, and the culprit is usually one wide element.
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        overflowBy: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        overflowers: (() => {
          const vw = document.documentElement.clientWidth;
          const out = [];
          for (const el of document.querySelectorAll('#view-analytics *')) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) continue;
            if (rect.right <= vw + 1) continue;
            out.push(`${el.tagName.toLowerCase()}.${String(el.className || '').split(' ').join('.')}|${Math.round(rect.left)}→${Math.round(rect.right)}`);
            if (out.length >= 5) break;
          }
          return out;
        })(),
        smallControls: [...section.querySelectorAll('button')].filter((button) => {
          const box = button.getBoundingClientRect(); return box.width > 0 && box.height > 0 && box.height < 43;
        }).length,
      };
    });
    console.log(`Progress hub ${width}px/${theme}:`, JSON.stringify(seen, null, 0));

    // The bands ARE Progress now. Once an athlete has logged anything, every
    // enabled and visible band renders — a band with nothing in this range says
    // so in place instead of vanishing, so a Customize switch can never look
    // broken. Only a fully empty profile falls back to Pulse + Reviews.
    if (seen.bands[0] !== 'pulse') failures.push(`${width}px: Progress does not open on Pulse (${seen.bands.join(',')})`);
    if (!seen.bands.includes('muscles')) failures.push(`${width}px: no Muscles band despite logged working sets`);
    if (seen.bands.length > 8) failures.push(`${width}px: more bands than the catalogue allows`);
    if (seen.values.some((value) => !value)) failures.push(`${width}px: a band rendered without a headline value`);
    if (seen.rangeChips !== 4) failures.push(`${width}px: expected four range chips (got ${seen.rangeChips})`);
    if (seen.selectedRange !== '30d') failures.push(`${width}px: expected 30d selected (got ${seen.selectedRange})`);
    // One home per destination: the generic footer must not exist in any form.
    if (seen.footerLinks) failures.push(`${width}px: a footer/"More detail" destination survived (${seen.footerLinks})`);
    if (!seen.bands.includes('reviews')) failures.push(`${width}px: no Reviews row`);
    if (seen.reviews.join(',') !== 'weekly-review,monthly-report,year-review') {
      failures.push(`${width}px: Reviews is not Week | Month | Year (${seen.reviews.join(',')})`);
    }
    if (!seen.headerHistory) failures.push(`${width}px: History is not the Progress header icon`);
    if (!seen.detailHeads.length) failures.push(`${width}px: no band has a Details control`);
    if (seen.detailHeads.includes('hybrid-score')) failures.push(`${width}px: Hybrid Score must not be a band detail`);
    // Measures is the record behind the Body band, and body data is optional —
    // so it needs a route that does not depend on a band rendering.
    // Measures is a Body detail, and the Customize sheet's Body row is the
    // route that does not depend on the range having body data.
    const measuresRoutes = await page.evaluate(() => ({
      band: !!document.querySelector('#analytics-hub [data-band="body"] [data-context="measures"]'),
    }));
    if (!measuresRoutes.band) failures.push(`${width}px: the Body band does not open Measures`);
    // PG9: the per-site strip and the photo library are the record's job. The
    // band links to Measures instead of duplicating them.
    const bodyMoved = await page.evaluate(() => {
      const band = document.querySelector('#analytics-hub [data-band="body"]');
      return {
        entityCells: band?.querySelectorAll('[data-entity]').length || 0,
        photos: band?.querySelectorAll('.pg-photos-block').length || 0,
        measures: band?.querySelectorAll('[data-action="open-analytics"][data-context="measures"]').length || 0,
      };
    });
    if (bodyMoved.entityCells || bodyMoved.photos) {
      failures.push(`${width}px: the Body band still duplicates the site strip or photo library`);
    }
    if (!bodyMoved.measures) failures.push(`${width}px: the Body band does not open Measures`);
    await page.click('#analytics-hub [data-band="body"] [data-context="measures"]');
    const measuresOpened = await page.waitForSelector('#analytics-measures.active', { timeout: 4000 }).then(() => true).catch(() => false);
    if (!measuresOpened) failures.push(`${width}px: the Body band did not open Measures`);
    else {
      const owns = await page.evaluate(() => ({
        sites: document.querySelectorAll('#analytics-measures [data-ms-site]').length,
        addEntry: !!document.querySelector('#analytics-measures [data-action="open-ms-sheet"]'),
        entries: document.querySelectorAll('#analytics-measures .ms-entries, #analytics-measures .ms-screen__body').length,
      }));
      if (!owns.sites) failures.push(`${width}px: Measures does not own the site control`);
      if (!owns.addEntry || !owns.entries) failures.push(`${width}px: Measures is not the dated record`);
    }
    await openHub(page);
    await page.waitForSelector('#analytics-hub.active', { timeout: 4000 }).catch(() => {});

    // The Muscles band can focus ONE muscle without leaving the hub. A native
    // select keeps 19 options usable; the chart and table answer for that muscle
    // while the rest of the band stays present.
    const muscleFocus = await page.evaluate(() => {
      const select = document.querySelector('#analytics-hub [data-band="muscles"] [data-pg-muscle]');
      return {
        present: Boolean(select),
        values: [...(select?.options || [])].map((option) => option.value),
        height: Math.round(select?.getBoundingClientRect().height || 0),
      };
    });
    if (!muscleFocus.present) failures.push(`${width}px: the Muscles band has no muscle focus`);
    if (muscleFocus.height < 44) failures.push(`${width}px: the muscle focus is ${muscleFocus.height}px`);
    const focusKey = muscleFocus.values.find((value) => value !== 'all');
    if (muscleFocus.present && focusKey) {
      await page.selectOption('#analytics-hub [data-band="muscles"] [data-pg-muscle]', focusKey);
      await page.waitForTimeout(300);
      const focused = await page.evaluate(() => {
        const band = document.querySelector('#analytics-hub [data-band="muscles"]');
        return {
          value: band?.querySelector('[data-pg-muscle]')?.value || '',
          meta: band?.querySelector('.pg-muscle-meta')?.textContent?.trim() || '',
          target: band?.querySelector('.pg-muscle-target')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          action: !!band?.querySelector('.pg-muscle-action'),
          headline: band?.querySelector('.pg-band__value')?.textContent?.trim() || '',
        };
      });
      if (focused.value !== focusKey) failures.push(`${width}px: muscle focus did not stick (${focused.value} vs ${focusKey})`);
      if (!/Rank \d+ of \d+/.test(focused.meta)) failures.push(`${width}px: focused muscle has no rank context (${focused.meta})`);
      if (!/\d+ session/.test(focused.meta)) failures.push(`${width}px: focused muscle has no session frequency (${focused.meta})`);
      if (!/sets\/week/.test(focused.target) || !/typical/.test(focused.target)) failures.push(`${width}px: focused muscle has no weekly reference (${focused.target})`);
      if (!focused.action) failures.push(`${width}px: focused muscle has no action`);
      if (!focused.headline) failures.push(`${width}px: focused muscle has no headline`);
      await page.selectOption('#analytics-hub [data-band="muscles"] [data-pg-muscle]', 'all');
      await page.waitForTimeout(250);
      const reset = await page.$eval('#analytics-hub [data-band="muscles"] [data-pg-muscle]', (el) => el.value).catch(() => '');
      if (reset !== 'all') failures.push(`${width}px: muscle focus did not reset to All (${reset})`);
    }
    if (!seen.hasMethod) failures.push(`${width}px: missing the header "how this is calculated" control`);
    if (!seen.hasWeekHero) failures.push(`${width}px: missing the Pulse band`);
    if (!/session/i.test(seen.weekHeroText)) failures.push(`${width}px: Pulse does not name sessions`);
    if (!seen.sub) failures.push(`${width}px: hub has no subtitle`);
    if (/\d{4}-\d{2}-\d{2}/.test(seen.sub)) failures.push(`${width}px: hub subtitle leaks an ISO date (${seen.sub})`);
    // Pulse is the CURRENT calendar week; the range control is the only time
    // control on the hub, so there is no week navigator to compare against.
    if (!/^\d{1,2}–\d{1,2} [A-Z][a-z]{2}$/.test(seen.heroEyebrow)) {
      failures.push(`${width}px: Pulse does not name its real calendar-week range (${seen.heroEyebrow})`);
    }
    // The method opens from the header icon and explains the real range.
    await page.click('.hub-head details.pg-method > summary');
    const methodOpen = await page.$eval('.pg-method', (el) => el.open && !!el.querySelector('.pg-method__panel')?.getBoundingClientRect().height);
    if (!methodOpen) failures.push(`${width}px: the header method control did not open`);
    await page.click('.hub-head details.pg-method > summary');
    if (seen.overflow) failures.push(`${width}px: page-level horizontal overflow by ${seen.overflowBy}px — ${seen.overflowers.join(' ; ')}`);
    if (seen.smallControls) failures.push(`${width}px: ${seen.smallControls} controls below the 44px target`);

    // The hub has ONE time control: the range bar. A week navigator here would be
    // a second, contradictory answer to "which period am I looking at" — and it
    // only ever governed one band.
    const navVisible = await page.$eval('#analyticsWeekNav', (el) => getComputedStyle(el).display !== 'none')
      .catch(() => false);
    if (navVisible) failures.push(`${width}px: the hub still shows a week navigator beside the range bar`);

    // Changing the range must change what the bands report.
    const beforeRange = await page.$eval('#analytics-hub [data-band="endurance"]', (el) => el.textContent.trim())
      .catch(() => '');
    await page.click('[data-pg-range="1y"]', { timeout: 2000 });
    await page.waitForTimeout(350);
    const afterRange = await page.$eval('#analytics-hub [data-band="endurance"]', (el) => el.textContent.trim())
      .catch(() => '');
    if (beforeRange && afterRange && beforeRange === afterRange) {
      failures.push(`${width}px: changing the range did not change the Endurance band`);
    }
    const enduranceTrimmed = await page.evaluate(() => ({
      days: document.querySelectorAll('#analytics-hub [data-band="endurance"] .pg-days').length,
      table: document.querySelectorAll('#analytics-hub [data-band="endurance"] .pg-data').length,
    }));
    if (enduranceTrimmed.days || enduranceTrimmed.table) failures.push(`${width}px: the Endurance band still duplicates its detail evidence`);
    const selectedRange = await page.$eval('[data-pg-range][aria-pressed="true"]', (el) => el.getAttribute('data-pg-range'));
    if (selectedRange !== '1y') failures.push(`${width}px: the range control did not mark 1y as pressed (${selectedRange})`);
    await page.click('[data-pg-range="30d"]', { timeout: 2000 });
    await page.waitForTimeout(250);

    // PG9 scannability: the whole hub is ~3 screens at every phone width, and
    // no single band can grow into a wall. Heights are read from the real DOM.
    const scan = await page.evaluate(() => {
      const bands = [...document.querySelectorAll('#analytics-hub [data-band]')];
      const rows = bands.map((band) => ({ id: band.getAttribute('data-band'), h: Math.round(band.getBoundingClientRect().height) }));
      const total = rows.reduce((sum, row) => sum + row.h, 0);
      return { rows, total, viewports: total / window.innerHeight, tallest: rows.reduce((max, row) => row.h > max.h ? row : max, { id: '', h: 0 }) };
    });
    if (scan.viewports > 3.15) failures.push(`${width}px: the hub is ${scan.viewports.toFixed(2)} screens tall (${scan.total}px)`);
    if (scan.tallest.h > 470) failures.push(`${width}px: the ${scan.tallest.id} band is ${scan.tallest.h}px tall`);

    // Week in Review opens from the single Reviews row.
    const reviewLink = await page.$('.pg-reviews__seg[data-context="weekly-review"]');
    if (!reviewLink) {
      failures.push(`${width}px: Week in Review has no entry point`);
    } else {
      await reviewLink.click({ timeout: 2000 }).catch(() => {
        failures.push(`${width}px: Week in Review did not open`);
      });
      const reviewOpen = await page.waitForSelector('#analytics-weekly-review.active', { timeout: 3000 })
        .then(() => true).catch(() => false);
      if (!reviewOpen) failures.push(`${width}px: Week in Review did not open`);
      await page.click('#analytics-weekly-review [data-an-tab="week"]').catch(() => {});
      await page.waitForSelector('#wrevShareBtn', { timeout: 2000 }).catch(() => {});
      const weekShare = await page.locator('#wrevShareBtn').count();
      if (weekShare !== 1) failures.push(`${width}px: Week in Review has no share action`);
      else {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
          page.click('#wrevShareBtn'),
        ]);
        if (!download || !/^openhybrid-week-\d{4}-\d{2}-\d{2}\.png$/.test(download.suggestedFilename())) {
          failures.push(`${width}px: the week card did not download (${download?.suggestedFilename?.() || 'none'})`);
        }
      }
      await page.evaluate(() => document.querySelector('.bottom-nav [data-target="analytics"]')?.click());
      await page.waitForSelector('#analytics-hub.active .pg-band', { timeout: 4000 }).catch(() => {});
    }

    // The WHOLE band header is the drilldown, and Back returns to that band.
    const bandTopBefore = await page.$eval('#analytics-hub [data-band="muscles"]', (el) => el.getBoundingClientRect().top);
    await page.click('#analytics-hub [data-band="muscles"] .pg-band__head--detail');
    await page.waitForSelector('#analytics-muscle-load.active', { timeout: 4000 }).catch(() => {
      failures.push(`${width}px: the Muscles header did not open its detail`);
    });
    const rangeChip = await page.$eval('#analyticsRangeChip', (el) => ({
      hidden: el.hidden, text: el.textContent.trim(),
    })).catch(() => ({ hidden: true, text: '' }));
    if (rangeChip.hidden || !/Progress · 30D/.test(rangeChip.text)) {
      failures.push(`${width}px: the band detail did not inherit/show the range (${rangeChip.text})`);
    }
    const detailMap = await page.evaluate(() => ({
      map: !!document.querySelector('#analytics-muscle-load #muscleLoadMap .session-map'),
      rows: document.querySelectorAll('#analytics-muscle-load .muscle-load-row').length,
    }));
    if (!detailMap.map) failures.push(`${width}px: the Muscles detail does not carry the body map`);
    if (!detailMap.rows) failures.push(`${width}px: the Muscles detail does not carry the ranked rows`);
    await page.click('#view-analytics .subview-back-btn');
    await page.waitForSelector('#analytics-hub.active', { timeout: 4000 }).catch(() => {
      failures.push(`${width}px: Back from a band detail did not return to Progress`);
    });
    await page.waitForTimeout(200);
    const bandTopAfter = await page.$eval('#analytics-hub [data-band="muscles"]', (el) => el.getBoundingClientRect().top)
      .catch(() => 9999);
    if (Math.abs(bandTopAfter) > 140) {
      failures.push(`${width}px: Back did not restore the band position (top ${Math.round(bandTopAfter)}, was ${Math.round(bandTopBefore)})`);
    }

    // The exercise drilldown still carries a real chart, stat cards and evidence.
    await page.evaluate(() => document.querySelector('[data-action="open-analytics"][data-context="strength"]')?.click());
    await page.waitForSelector('#analytics-strength.active', { timeout: 4000 }).catch(() => {
      failures.push(`${width}px: the Strength screen could not be opened`);
    });
    await page.click('#analytics-strength [data-an-tab="stats"]');
    await page.waitForTimeout(250);
    const mixMoved = await page.evaluate(() => ({
      detail: !!document.querySelector('#analytics-strength-entity, #analytics-strength')?.querySelector('#strengthMixSection .pg-mix'),
      band: !!document.querySelector('#analytics-hub [data-band="exercises"] .pg-mix'),
    }));
    if (!mixMoved.detail) failures.push(`${width}px: the Strength detail does not carry the training mix`);
    if (mixMoved.band) failures.push(`${width}px: the exercises band still renders the training mix`);
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
        // Name the offender: a bare "horizontal overflow" costs a whole run to
        // diagnose, and the culprit is usually one wide element.
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        overflowBy: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        overflowers: (() => {
          const vw = document.documentElement.clientWidth;
          const out = [];
          for (const el of document.querySelectorAll('#view-analytics *')) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) continue;
            if (rect.right <= vw + 1) continue;
            out.push(`${el.tagName.toLowerCase()}.${String(el.className || '').split(' ').join('.')}|${Math.round(rect.left)}→${Math.round(rect.right)}`);
            if (out.length >= 5) break;
          }
          return out;
        })(),
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


    // PG4: the Week tab owns the weekly story + streak calendar; Month owns the
    // twelve-week log and the report. The three periods are the hub's own words.
    await openHub(page);
    // ST4: the Progress gear opens Settings at the SAME Units owner.
    const unitsGear = await page.$('#analytics-hub [data-action="open-settings"][data-page="once.units"]');
    if (!unitsGear) failures.push(`${width}px: Progress has no Units settings control`);
    else {
      await unitsGear.click();
      await page.waitForSelector('#settingsOverlay.active', { timeout: 4000 }).catch(() => {});
      const settingsState = await page.evaluate(() => ({
        active: document.getElementById('settingsOverlay')?.classList.contains('active') || false,
        hash: location.hash,
        text: document.getElementById('settingsPanel')?.textContent?.replace(/\s+/g, ' ') || '',
      }));
      if (!settingsState.active) failures.push(`${width}px: the Progress gear did not open Settings`);
      if (settingsState.hash !== '#/settings/units') failures.push(`${width}px: the Progress gear opened ${settingsState.hash}, not Units`);
      if (!/Units/.test(settingsState.text)) failures.push(`${width}px: the Units page did not render`);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(250);
      await openHub(page);
      await page.waitForSelector('#analytics-hub.active', { timeout: 4000 }).catch(() => {});
    }
    await page.click('.pg-reviews__seg[data-context="weekly-review"]');
    await page.waitForSelector('#analytics-weekly-review.active', { timeout: 4000 }).catch(() => {
      failures.push(`${width}px: Review domain card did not open the Review screen`);
    });
    const weekTab = await page.evaluate(() => ({
      active: document.querySelector('#analytics-weekly-review [data-an-tab].an-tab--active')?.getAttribute('data-an-tab') || '',
      tabs: [...document.querySelectorAll('#analytics-weekly-review [data-an-tab]')].map((el) => el.getAttribute('data-an-tab')).join(','),
      story: !!document.querySelector('#weeklyReviewContainer .wrev-stats, #weeklyReviewContainer .card-dark'),
      calendarCells: document.querySelectorAll('#streakHeatmapContainer rect').length,
      streak: !!document.querySelector('#streakCurrent'),
    }));
    if (weekTab.tabs !== 'week,month,year') failures.push(`${width}px: Review periods are not Week|Month|Year (${weekTab.tabs})`);
    if (weekTab.active !== 'week') failures.push(`${width}px: the Reviews Week row did not open Week (${weekTab.active})`);
    if (!weekTab.story) failures.push(`${width}px: the Week tab has no weekly story`);
    if (!weekTab.streak) failures.push(`${width}px: the Week tab has no streak block`);
    if (weekTab.calendarCells < 2) failures.push(`${width}px: the Week tab training calendar is empty`);

    await page.click('#analytics-weekly-review [data-an-tab="month"]');
    await page.waitForSelector('#analyticsTimelineTableBody tr', { timeout: 4000 }).catch(() => {});
    // H5: the Month tab reviews the four COMPLETED weeks above the report.
    const blockReview = await page.evaluate(() => {
      const host = document.getElementById('blockReviewContainer');
      return {
        heading: host?.querySelector('h2')?.textContent?.trim() || '',
        present: !!host?.querySelector('.pg-block'),
        text: host?.textContent?.replace(/\s+/g, ' ').trim() || '',
      };
    });
    if (blockReview.heading !== 'Block Review') failures.push(`${width}px: the Month tab has no block review heading`);
    if (!blockReview.present) failures.push(`${width}px: the block review did not render`);
    if (!/26 Oct – 22 Nov 2026/.test(blockReview.text)) failures.push(`${width}px: the block review window is wrong (${blockReview.text.slice(0, 90)})`);
    if (!/3 strength sessions/.test(blockReview.text)) failures.push(`${width}px: the block review does not count the completed block (${blockReview.text.slice(0, 90)})`);
    const reviewStats = await page.$eval('#analytics-weekly-review', (section) => ({
      rows: section.querySelectorAll('#analyticsTimelineTableBody tr').length,
      firstRow: section.querySelector('#analyticsTimelineTableBody tr')?.textContent?.trim() || '',
    }));
    if (reviewStats.rows !== 12) failures.push(`${width}px: Review log should have 12 calendar weeks (got ${reviewStats.rows})`);
    if (!/[A-Za-z]{3}/.test(reviewStats.firstRow)) failures.push(`${width}px: Review log does not label calendar weeks`);

    // The training report starts on the current calendar month and switches to
    // a trailing 12-month window; it states real dates and active-day count.
    const report = await page.$eval('#monthlyReportContainer', (el) => ({
      hasToggle: !!el.querySelector('[data-report-period="month"]') && !!el.querySelector('[data-report-period="year"]'),
      monthLabel: el.querySelector('[data-report-period="month"]')?.textContent?.trim() || '',
      range: el.querySelector('.an-detail-period')?.textContent?.trim() || '',
      stats: el.querySelectorAll('.wrev-stat').length,
    }));
    if (!report.hasToggle) failures.push(`${width}px: Training Report has no month/12-month toggle`);
    if (report.monthLabel !== 'This month') failures.push(`${width}px: Training Report month control reads "${report.monthLabel}"`);
    if (!/active day/.test(report.range)) failures.push(`${width}px: Training Report does not state its range/active days`);
    if (!/^1 [A-Z][a-z]{2} –/.test(report.range)) failures.push(`${width}px: Training Report does not start on the 1st (${report.range})`);
    if (report.stats < 4) failures.push(`${width}px: Training Report is missing its summary stats`);
    await page.click('#monthlyReportContainer [data-report-period="year"]');
    await page.waitForTimeout(250);
    const yearPressed = await page.$eval('#monthlyReportContainer [data-report-period="year"]', (el) => el.getAttribute('aria-pressed'));
    if (yearPressed !== 'true') failures.push(`${width}px: 12-month report did not activate`);
    await page.click('#monthlyReportContainer [data-report-period="month"]');
    await page.waitForTimeout(200);
    const [reportDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
      page.click('#mrepShareBtn'),
    ]);
    if (!reportDownload || reportDownload.suggestedFilename() !== 'openhybrid-training-report.png') {
      failures.push(`${width}px: the Training Report card did not download (${reportDownload?.suggestedFilename?.() || 'none'})`);
    }

    if (errors.length) failures.push(`${width}px: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }

  // A hidden section leaves the Overview but keeps its Customize row, its
  // Open chevron and its toggle. A module-off row is disabled and says
  // "module off" — never "no data".
  {
    const theme = 'light';
    const width = 320;
    const hiddenFixture = fixture(theme);
    hiddenFixture.settings.ui = { progress: { hidden: ['muscles'] } };
    hiddenFixture.settings.modules = { running: true, fasting: false, health: true, recovery: true };
    const context = await createBrowserContext(browser, { viewport: { width, height: 844 }, timezoneId: TZ, colorScheme: theme });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(hiddenFixture)]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await openHub(page);
    await page.waitForSelector('#analytics-hub.active .pg-band');

    const hidden = await page.evaluate(() => ({
      muscles: !!document.querySelector('#analytics-hub [data-band="muscles"]'),
      reviews: !!document.querySelector('#analytics-hub [data-band="reviews"]'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    if (hidden.muscles) failures.push('hidden section: Muscles still renders on the Overview');
    if (!hidden.reviews) failures.push('hidden section: hiding Muscles removed Reviews too');
    if (hidden.overflow) failures.push('hidden section: horizontal overflow at 320px');

    await page.click('[data-action="open-customize"][data-surface="progress"]');
    await page.waitForSelector('#customizeSheet.active');
    const sheet = await page.evaluate(() => {
      const row = (label) => [...document.querySelectorAll('#customizeList .customize-row')]
        .find((node) => node.querySelector('.customize-row__label')?.textContent.trim() === label);
      const muscles = row('Muscles');
      const fasting = row('Fasting');
      return {
        musclesToggle: muscles?.querySelector('[data-customize-card="muscles"]')?.checked,
        musclesOpen: muscles?.querySelector('[data-customize-open][data-context="muscle-load"]')?.getAttribute('data-context') || '',
        musclesNote: muscles?.querySelector('.customize-row__note')?.textContent.trim() || '',
        fastingDisabled: !!fasting?.querySelector('[data-customize-card="fasting"]')?.disabled,
        fastingNote: fasting?.querySelector('.customize-row__note')?.textContent.trim() || '',
        orderLefts: [...document.querySelectorAll('#customizeList .customize-row--progress:not(.customize-row--sub) .customize-order')]
          .map((node) => Math.round(node.getBoundingClientRect().left)),
      };
    });
    if (sheet.musclesToggle !== false) failures.push('hidden section: its toggle does not read off');
    if (sheet.musclesOpen !== 'muscle-load') failures.push('hidden section: no Open chevron to its detail');
    if (/no data/i.test(sheet.musclesNote)) failures.push(`hidden section: row says "no data" (${sheet.musclesNote})`);
    if (!sheet.fastingDisabled) failures.push('module off: the row is still interactive');
    if (!/module off/i.test(sheet.fastingNote)) failures.push(`module off: row does not say "module off" (${sheet.fastingNote})`);
    if (new Set(sheet.orderLefts).size !== 1) failures.push(`reorder column is not one fixed x (${sheet.orderLefts.join(',')})`);

    await page.click('#customizeList [data-customize-open][data-context="muscle-load"]');
    await page.waitForSelector('#analytics-muscle-load.active', { timeout: 4000 }).catch(() => {
      failures.push('hidden section: Open did not reach its detail');
    });
    await page.click('#view-analytics .subview-back-btn').catch(() => {});
    await page.waitForSelector('#analytics-hub.active', { timeout: 4000 }).catch(() => {});
    const stillHidden = await page.evaluate(() => !document.querySelector('#analytics-hub [data-band="muscles"]'));
    if (!stillHidden) failures.push('hidden section: opening it from the sheet reset the visibility choice');
    if (errors.length) failures.push(`hidden section: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }

  // 200% text must wrap, not overflow, and the header controls must stay usable.
  {
    const context = await createBrowserContext(browser, { viewport: { width: 320, height: 844 }, timezoneId: TZ, colorScheme: 'light' });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(fixture('light'))]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await openHub(page);
    await page.waitForSelector('#analytics-hub.active .pg-band');
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.waitForTimeout(250);
    const zoom = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const actions = document.querySelector('.hub-head__actions')?.getBoundingClientRect();
      const overflowers = [...document.querySelectorAll('#view-analytics *')].filter((el) => {
        const rect = el.getBoundingClientRect();
        return (rect.width || rect.height) && rect.right > vw + 1;
      }).slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${String(el.className || '').split(' ').join('.')}`);
      return {
        overflow: document.documentElement.scrollWidth > vw + 1,
        actionsRight: actions ? Math.round(actions.right) : 0,
        vw,
        overflowers,
      };
    });
    if (zoom.overflow) failures.push(`200% text: horizontal overflow — ${zoom.overflowers.join(' ; ')}`);
    if (zoom.actionsRight > zoom.vw + 1) failures.push(`200% text: header actions leave the viewport (${zoom.actionsRight}/${zoom.vw})`);
    if (errors.length) failures.push(`200% text: browser errors: ${errors.join(' | ')}`);
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
    await page.waitForSelector('#analytics-hub.active .pg-band');
    const empty = await page.$eval('#analytics-hub', (section) => ({
      hasEmptyLead: !!section.querySelector('.ph-empty'),
      hasWeekHero: !!section.querySelector('.ph-week'),
      bands: section.querySelectorAll('.pg-band').length,
      // No fabricated comparison may survive an empty week.
      deltas: section.querySelectorAll('.pg-pulse__delta').length,
    }));
    console.log('Progress hub empty profile:', JSON.stringify(empty));
    if (!empty.hasEmptyLead) failures.push('empty profile: missing the single leading empty state');
    // On an empty profile the leading empty state is the answer, and no band
    // may invent data. Pulse's empty state plus the intro is two at most.
    if (empty.bands > 2) failures.push(`empty profile: expected an empty lead, got ${empty.bands} bands`);
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
    if (!/Longest consecutive run/.test(seen.text) || !/3 days/.test(seen.text) || !/14 active days/.test(seen.text)) {
      failures.push('year review 390kg: missing the in-year consecutive run or active-day count');
    }
    if (!/Top exercises/.test(seen.text) || !seen.longNameVisible) failures.push('year review 390kg: missing the top exercises/long-named lift');
    if (!/e1RM PRs/.test(seen.text) || !/Barbell Bench Press/.test(seen.text) || !/128 kg/.test(seen.text)) {
      failures.push('year review 390kg: missing the annual e1RM PR');
    }

    // G4: the year heatmap is always available and independent of the seasonal recap.
    const heat = seen.heatmap;
    if (!heat.exists || heat.hidden || heat.height <= 0) failures.push('year heatmap 390kg: the section is not visible');
    if (heat.heading !== 'Year at a glance') failures.push(`year heatmap 390kg: missing the heading (${heat.heading})`);
    if (heat.months !== 12) failures.push(`year heatmap 390kg: expected 12 months, got ${heat.months}`);
    if (heat.days < 300) failures.push(`year heatmap 390kg: only ${heat.days} tappable days`);
    if (!heat.shaded) failures.push('year heatmap 390kg: no day is shaded by time trained');
    if (!/trained/.test(heat.text)) failures.push(`year heatmap 390kg: no measured total (${heat.text})`);
    if (heat.overflow || seen.documentOverflow) failures.push('year heatmap 390kg: horizontal overflow');
    const yearShare = await page.locator('[data-action="share-year-review"]').count();
    if (yearShare !== 1) failures.push('year review 390kg: missing the share action');
    else {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
        page.click('[data-action="share-year-review"]'),
      ]);
      if (!download || download.suggestedFilename() !== 'openhybrid-year-review-2026.png') {
        failures.push(`year review 390kg: the share card did not download (${download?.suggestedFilename?.() || 'none'})`);
      }
    }
    // The Reports row must open the tab that actually contains the year, not
    // Review's Overview (which has no year section).
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="analytics"]')?.click());
    await page.waitForSelector('#analytics-hub.active', { timeout: 4000 });
    const yearRow = page.locator('.pg-reviews__seg[data-context="year-review"]');
    if (await yearRow.count() !== 1) {
      failures.push('year review 390kg: Reports has no Year in Review row');
    } else {
      await yearRow.click();
      await page.waitForSelector('#analytics-weekly-review.active', { timeout: 4000 });
      const activeTab = await page.$eval('#analytics-weekly-review .an-tab--active', (el) => el.getAttribute('data-an-tab')).catch(() => '');
      const yearVisible = await page.$eval('#yearReviewContainer', (el) => !el.hidden && el.getBoundingClientRect().height > 0).catch(() => false);
      if (activeTab !== 'year') failures.push(`year review 390kg: Reports opened Review "${activeTab}" instead of Year`);
      if (!yearVisible) failures.push('year review 390kg: Reports opened a tab without the year section');
    }
    // A shaded day opens that date in History, not a second Progress calendar.
    const tapped = await page.evaluate(() => {
      const button = document.querySelector('#yearHeatmapContainer [data-action="open-activities-day"][data-date="2026-11-10"]');
      if (!button) return false;
      button.click();
      return true;
    });
    if (!tapped) failures.push('year heatmap 390kg: the 10 November cell is missing');
    else {
      const opened = await page.waitForFunction(
        () => document.getElementById('activitiesScreen')?.style.display === 'block',
        null, { timeout: 4000 },
      ).then(() => true).catch(() => false);
      const history = await page.evaluate(() => ({
        content: document.getElementById('activitiesContent')?.textContent?.replace(/\s+/g, ' ') || '',
      }));
      if (!opened) failures.push('year heatmap 390kg: tapping a day did not open History');
      else if (!/November 2026/.test(history.content) || !/Back Squat/.test(history.content)) {
        failures.push(`year heatmap 390kg: History is not filtered to the tapped day (${history.content.slice(0, 120)})`);
      }
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
    if (!seen.heatmap.exists || seen.heatmap.hidden) failures.push(`year heatmap ${width}px: the section is not visible`);
    if (seen.heatmap.overflow) failures.push(`year heatmap ${width}px: the heatmap overflows horizontally`);
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
    if (!seen.heatmap.exists || seen.heatmap.hidden || seen.heatmap.days < 1) {
      failures.push('year heatmap off-season: the always-available year view did not render');
    }
    if (!seen.hidden || seen.display !== 'none' || seen.height !== 0) {
      failures.push(`year review off-season: the container is visible (${seen.display}/${seen.height})`);
    }
    if (seen.yearHeadings.length !== 0 || seen.headingHeight !== 0 || seen.text !== '') {
      failures.push('year review off-season: a Year in Review heading or copy survived');
    }
    // Off-season the Year tab still exists (Year at a glance); Week must still
    // carry its story when the athlete switches to it.
    const weekStillRenders = await page.evaluate(async () => {
      document.querySelector('#analytics-weekly-review [data-an-tab="week"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 150));
      return !!document.querySelector('#weeklyReviewContainer');
    });
    if (!weekStillRenders) failures.push('year review off-season: the Week tab no longer renders');
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
