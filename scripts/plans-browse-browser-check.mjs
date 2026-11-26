// =============================================================================
// PLANS BROWSE BROWSER CHECK — roadmap §22 (PL2)
// -----------------------------------------------------------------------------
// Proves the new Browse contract on the real screen:
//   • it lists the WHOLE catalogue by default (the old surface capped at 12);
//   • the Filters sheet narrows by goal, days, length and equipment, states the
//     applied facets, and Clear all restores the full list;
//   • a query finds the athlete's OWN plan, grouped first — the old search hid
//     My Plans and searched the catalogue only;
//   • the plan/workout switch separates blocks from single workouts;
//   • an empty result names the facet and offers one clear action;
//   • opening a plan and coming Back returns to Browse with its filters intact.
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
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { if (!res.headersSent) res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}/index.html`;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const TZ = 'Australia/Sydney';
const CLOCK = new Date('2026-08-03T09:00:00+10:00').getTime();

const CUSTOM = {
  id: 'prog_browse_custom',
  name: 'Bench Focus Block',
  totalWeeks: 4,
  dossier: { creator: 'You', focus: 'Strength' },
  days: {
    mon: { title: 'Upper', badge: 'UPPER', runs: 'Rest', lifts: ['Bench Press', 'Barbell Row'] },
    wed: { title: 'Lower', badge: 'LOWER', runs: 'Rest', lifts: ['Back Squat'] },
  },
  weeklyVolModifiers: { 1: { sets: 3, reps: '6-8', intensityLabel: 'Build' } },
};

const SEED = {
  schemaVersion: 5,
  currentWeek: '1',
  settings: {
    name: 'Athlete', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km',
    weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'strength', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: {
      barbell: true, rack: true, bench: true, dumbbells: true, cables: true,
      pullupBar: true, bands: true, kettlebells: true, ezBar: true, treadmill: true,
    },
  },
  customPrograms: [CUSTOM],
  weeks: {},
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [] },
};

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const failures = [];
const check = (condition, message) => {
  if (condition) console.log(`  ok · ${message}`);
  else { failures.push(message); console.error(`FAIL: ${message}`); }
};

const read = (page) => page.evaluate(() => ({
  rows: document.querySelectorAll('#browseResults .browse-row').length,
  summary: (document.getElementById('browseSummary')?.textContent || '').trim(),
  groups: [...document.querySelectorAll('#browseResults .browse-group')].map((el) => el.textContent.trim()),
  names: [...document.querySelectorAll('#browseResults .browse-row__name')].slice(0, 4).map((el) => el.textContent.trim()),
  empty: document.querySelector('#browseResults .browse-empty__message')?.textContent?.trim() || null,
  browseVisible: document.getElementById('plansBrowseScreen')?.style.display !== 'none',
}));

const openBrowse = async (page) => {
  await page.click('.bottom-nav .nav-item[data-target="program"]');
  await page.waitForSelector('#plansHome', { timeout: 8000 });
  await page.click('[data-action="open-browse"]');
  await page.waitForSelector('#plansBrowseSearch', { timeout: 8000 });
  await page.waitForTimeout(250);
};

const facet = async (page, name, value) => {
  await page.click('[data-action="open-plan-filters"]');
  await page.waitForSelector('#plansFilterSheet.active', { timeout: 6000 });
  await page.click(`#plansFilterSheet [data-action="browse-facet"][data-facet="${name}"][data-value="${value}"]`);
  await page.waitForTimeout(250);
};

const closeFilters = async (page) => {
  await page.click('#plansFilterSheet [data-action="close-plan-filters"]');
  await page.waitForTimeout(250);
};

try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: TZ, colorScheme: 'dark' });
  await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(SEED)]);
  await context.addInitScript(pinClock, CLOCK);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/frame-ancestors.*ignored.*meta|net::ERR_/.test(m.text())) errors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await openBrowse(page);

  // ── The whole catalogue, not 12 ──────────────────────────────────────────
  const all = await read(page);
  console.log('default:', JSON.stringify(all));
  check(all.browseVisible, 'Browse is the visible surface');
  check(all.rows >= 55, `Browse lists the whole catalogue by default (${all.rows} rows)`);
  check(/plan/i.test(all.summary), `the summary states the count (${all.summary})`);
  check(all.rows > 12, 'the old 12-item cap is gone');

  // ── Facets narrow, and state themselves ──────────────────────────────────
  await facet(page, 'goal', 'strength');
  await closeFilters(page);
  const strength = await read(page);
  console.log('strength:', JSON.stringify(strength));
  check(strength.rows > 0 && strength.rows < all.rows, `Strength narrows the set (${all.rows} → ${strength.rows})`);
  check(/strength/i.test(strength.summary), `the summary names the facet (${strength.summary})`);

  await facet(page, 'days', '4');
  await closeFilters(page);
  const fourDay = await read(page);
  check(fourDay.rows <= strength.rows, `4 days narrows again (${strength.rows} → ${fourDay.rows})`);
  check(/4 days/i.test(fourDay.summary), `the summary names days (${fourDay.summary})`);

  await facet(page, 'length', 'long');
  await closeFilters(page);
  const longStrength = await read(page);
  check(longStrength.rows <= fourDay.rows, `13+ weeks narrows again (${fourDay.rows} → ${longStrength.rows})`);

  await facet(page, 'equipment', 'mine');
  await closeFilters(page);
  const mine = await read(page);
  check(mine.rows <= longStrength.rows, `"my equipment" narrows again (${longStrength.rows} → ${mine.rows})`);
  check(/my equipment/i.test(mine.summary), 'the summary states the equipment facet');

  // ── Clear all restores the whole list ────────────────────────────────────
  await page.click('[data-action="open-plan-filters"]');
  await page.waitForSelector('#plansFilterSheet.active');
  await page.click('#plansFilterSheet [data-action="clear-browse-filters"]');
  await page.waitForTimeout(300);
  await closeFilters(page);
  const cleared = await read(page);
  check(cleared.rows === all.rows, `Clear all restores every plan (${cleared.rows})`);
  check(!/strength|4 days|my equipment/i.test(cleared.summary), `the facets are gone from the summary (${cleared.summary})`);

  // ── Search finds your own plan, grouped first ────────────────────────────
  await page.fill('#plansBrowseSearch', 'bench focus');
  await page.waitForTimeout(450);
  const searched = await read(page);
  console.log('search:', JSON.stringify(searched));
  check(searched.names.includes('Bench Focus Block'), 'search finds the athlete’s own plan');
  check(searched.groups[0] === 'Your plans', `"Your plans" is the first group (${searched.groups.join(', ')})`);
  check(searched.rows < all.rows, `the query narrows the list (${all.rows} → ${searched.rows})`);
  check(searched.names[0] === 'Bench Focus Block', 'the athlete’s own plan leads the results');

  await page.fill('#plansBrowseSearch', '');
  await page.waitForTimeout(400);

  // ── Plans vs single workouts ─────────────────────────────────────────────
  await page.click('[data-action="browse-kind"][data-kind="wod"]');
  await page.waitForTimeout(300);
  const wods = await read(page);
  check(wods.rows > 0 && wods.rows < all.rows, `the Workouts switch shows single workouts only (${wods.rows})`);
  await page.click('[data-action="browse-kind"][data-kind="all"]');
  await page.waitForTimeout(300);

  // ── Empty state names the facet and clears it ────────────────────────────
  await facet(page, 'level', 'elite');
  // The sheet stays open for a second facet; opening it again would target an
  // inert background (the managed modal owns the page while it is up).
  await page.click('#plansFilterSheet [data-action="browse-facet"][data-facet="days"][data-value="6"]');
  await page.waitForTimeout(250);
  await closeFilters(page);
  const empty = await read(page);
  console.log('empty:', JSON.stringify(empty));
  check(empty.rows === 0, 'an impossible combination has no rows');
  check(!!empty.empty && /elite|6\+ days/i.test(empty.empty), `the empty state names the facets (${empty.empty})`);
  await page.click('#browseResults [data-action="clear-browse-filters"]');
  await page.waitForTimeout(350);
  const recovered = await read(page);
  check(recovered.rows === all.rows, `the empty state's clear action restores the list (${recovered.rows})`);

  // ── Open a plan, come Back, filters survive ──────────────────────────────
  await facet(page, 'goal', 'strength');
  await closeFilters(page);
  const beforeOpen = await read(page);
  await page.click('#browseResults .browse-row');
  await page.waitForSelector('#programDetailScreen .detail-title', { timeout: 8000 });
  await page.click('[data-action="close-program-detail"]');
  await page.waitForTimeout(400);
  const returned = await read(page);
  check(returned.browseVisible, 'Back from a plan returns to Browse');
  check(returned.rows === beforeOpen.rows, `Back keeps the applied facet (${beforeOpen.rows} → ${returned.rows})`);

  check(errors.length === 0, `no browser errors (${errors.join(' | ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  failures.forEach((f) => console.error(`FAIL: ${f}`));
  process.exit(1);
}
console.log('Plans Browse contract passed.');
