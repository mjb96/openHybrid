// =============================================================================
// PLANS SURFACE AUDIT — roadmap §22 (Plans overhaul)
// -----------------------------------------------------------------------------
// A repeatable measurement of the Plans destination, used for the before/after
// table in §22.4. It is a REPORT, not a pass/fail check: it prints the numbers
// the plan argues from (page height, control count, what is reachable) so a
// change can be compared like-for-like.
//
// It seeds one realistic athlete (an active 8-week custom plan, three weeks
// stored, no bookmarks) and walks: Plans home → plan page → plan editor.
// Selectors are resolved defensively because PL1–PL6 deliberately replace the
// surface; missing elements are reported as `null`, never crash the run.
//
//   npm run plans:audit            # human-readable
//   npm run plans:audit -- --json  # machine-readable
//   npm run plans:audit -- --width=320
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, pinClock, resolveChromium } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORAGE_KEY = 'hybrid_engine_v2_state';
const TZ = 'Australia/Sydney';
// A Wednesday, so "today" is a training day in the fixture below.
const CLOCK = new Date('2026-08-05T09:00:00+10:00').getTime();

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const widthArg = args.find((a) => a.startsWith('--width='));
const WIDTH = widthArg ? Math.max(280, parseInt(widthArg.split('=')[1], 10) || 390) : 390;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '') || 'index.html';
    const body = await readFile(path.join(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}/index.html`;

// ── Fixture ──────────────────────────────────────────────────────────────────
const rest = () => ({ title: 'Rest', desc: '', badge: 'Rest', runs: 'Rest', lifts: [] });
const days = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, rest()]));
days.mon = { title: 'Upper Strength', desc: '', badge: 'UPPER', runs: 'Rest', color: '#38bdf8', lifts: ['Bench Press', 'Barbell Row', 'Overhead Press', 'Cable Fly', 'Triceps Pushdown', 'Face Pull'] };
days.tue = { title: 'Lower Strength', desc: '', badge: 'LOWER', runs: 'Rest', color: '#a78bfa', lifts: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Standing Calf Raise'] };
days.thu = { title: 'Push Volume', desc: '', badge: 'PUSH', runs: 'Rest', color: '#f59e0b', lifts: ['Incline Bench Press', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Cable Fly', 'Triceps Pushdown'] };
days.fri = { title: 'Pull Volume', desc: '', badge: 'PULL', runs: 'Rest', color: '#10b981', lifts: ['Deadlift', 'Lat Pulldown', 'Seated Cable Row', 'Hammer Curl', 'Face Pull'] };
days.sat = { title: 'Easy run', desc: '', badge: 'RUN', runs: '5 km easy', lifts: [] };

const PROGRAM = {
  id: 'prog_audit',
  name: 'Audit Block',
  totalWeeks: 8,
  dossier: { creator: 'You', focus: 'Strength + size', philosophy: '' },
  days,
  weeklyVolModifiers: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [
    String(i + 1), { sets: 4, reps: '6-8', intensityLabel: i < 4 ? 'Build' : 'Intensify' },
  ])),
};

const SEED = {
  schemaVersion: 5,
  settings: {
    name: 'Athlete', onboardingComplete: true, theme: 'dark', weightUnit: 'kg',
    distanceUnit: 'km', fitnessGoal: 'hybrid', fitnessLevel: 'intermediate',
    equipmentTier: 'gym',
  },
  currentWeek: '3',
  activeActivationId: 'a1',
  activeProgramId: PROGRAM.id,
  customPrograms: [PROGRAM],
  weeks: { '1': { activationId: 'a1' }, '2': { activationId: 'a1' }, '3': { activationId: 'a1' } },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [] },
};

// ── Runner ───────────────────────────────────────────────────────────────────
const runtime = await resolveChromium();
if (!runtime) {
  console.log('No Chromium available — skipping the Plans surface audit.');
  server.close();
  process.exit(0);
}
const { chromium, executablePath } = runtime;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const context = await createBrowserContext(browser, {
  viewport: { width: WIDTH, height: 844 }, timezoneId: TZ, colorScheme: 'dark',
});
await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(SEED)]);
await context.addInitScript(pinClock, CLOCK);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !/frame-ancestors.*ignored.*meta|net::ERR_/.test(m.text())) errors.push(m.text());
});

const tap = async (selector, wait = 450) => {
  const ok = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    /** @type {any} */ (el).click();
    return true;
  }, selector);
  await page.waitForTimeout(wait);
  return ok;
};

/** Generic surface measurement: height, controls, first content, overflow. */
const measureSurface = (containerSelector) => page.evaluate((sel) => {
  const root = document.querySelector(sel) || document;
  const visible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const controls = [...root.querySelectorAll('button, a, input, select, textarea, [role="button"]')]
    .filter(visible);
  const aboveFold = controls.filter((el) => el.getBoundingClientRect().top < 844);
  const firstContent = [...root.querySelectorAll('h1, h2, h3, .prog-card, .plan-row, .filtered-grid-title, .collection-row')]
    .filter(visible)
    .map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
    .sort((a, b) => a - b)[0] ?? null;
  return {
    documentHeight: document.documentElement.scrollHeight,
    visibleControls: controls.length,
    controlsAboveFold: aboveFold.length,
    firstContentTop: firstContent,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
}, containerSelector);

const report = { width: WIDTH, at: new Date().toISOString(), surfaces: {}, reachability: {}, errors };

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // ── Plans home ─────────────────────────────────────────────────────────────
  await tap('.bottom-nav .nav-item[data-target="program"]', 700);
  report.surfaces.home = await measureSurface('#programLibraryScreen');
  report.surfaces.home.detail = await page.evaluate(() => {
    const top = (sel) => {
      const el = document.querySelector(sel);
      return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null;
    };
    return {
      activeCardTop: top('#activeProgBanner'),
      utilityRowTop: top('#plansUtilityRow'),
      tabsTop: top('#progLibraryTabs'),
      searchTop: top('.prog-search-bar'),
      recommendationsTop: top('.collection-row--recommended'),
      legacyAllProgramsTop: top('.filtered-grid-header'),
      libraryCards: document.querySelectorAll('#progLibraryContent .prog-card').length,
      badges: [...document.querySelectorAll('#progLibraryTabs .lib-tab')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
    };
  });
  report.reachability.filterEntry = await page.evaluate(() =>
    !!(document.querySelector('[data-action="open-browse"]')
      || document.querySelector('[data-action="prog-filter"]')
      || document.querySelector('[data-action="open-plan-filters"]')));
  report.reachability.filterChipsOnLanding = await page.evaluate(() =>
    document.querySelectorAll('#progFilterChips .filter-chip, #progDifficultyChips .filter-chip').length);
  report.reachability.onePrimaryAction = await page.evaluate(() =>
    document.querySelectorAll('#activeProgBanner .active-prog-continue-btn:not(.active-prog-continue-btn--quiet)').length);
  report.reachability.planActions = await page.evaluate(() => ({
    total: document.querySelectorAll('#activeProgBanner .active-prog-continue-btn').length,
    primary: document.querySelectorAll('#activeProgBanner .active-prog-continue-btn:not(.active-prog-continue-btn--quiet)').length,
  }));

  // ── Browse (pushed) ──────────────────────────────────────────────────────
  if (await page.evaluate(() => !!document.querySelector('[data-action="open-browse"]'))) {
    await tap('[data-action="open-browse"]', 500);
    report.surfaces.browse = await measureSurface('#plansBrowseScreen');
    report.surfaces.browse.detail = await page.evaluate(() => ({
      rows: document.querySelectorAll('#browseResults .browse-row').length,
      summary: (document.getElementById('browseSummary')?.textContent || '').trim(),
      hasSearch: !!document.getElementById('plansBrowseSearch'),
      hasSort: !!document.querySelector('[data-browse-sort]'),
      hasFilterButton: !!document.querySelector('[data-action="open-plan-filters"]'),
      groups: [...document.querySelectorAll('#browseResults .browse-group')].map((el) => el.textContent.trim()),
    }));
    // Apply one facet for real and report how many rows survive.
    await tap('[data-action="open-plan-filters"]', 400);
    report.surfaces.browse.filtersOpen = await page.evaluate(() =>
      !!document.querySelector('#plansFilterSheet.active'));
    await tap('#plansFilterSheet [data-action="browse-facet"][data-facet="goal"][data-value="strength"]', 350);
    report.surfaces.browse.afterStrengthFacet = await page.evaluate(() =>
      document.querySelectorAll('#browseResults .browse-row').length);
    await tap('#plansFilterSheet [data-action="close-plan-filters"]', 300);
    await tap('[data-action="close-browse"]', 400);
  }

  // ── Your plans (the home's own rows; the old My Plans tab is gone) ────────
  const myTab = '#progLibraryTabs [data-action="lib-tab"][data-tab="my"]';
  if (await page.evaluate((sel) => !!document.querySelector(sel), myTab)) {
    await tap(myTab, 400);
  }
  report.surfaces.myPlans = await measureSurface('#programLibraryScreen');
  report.surfaces.myPlans.detail = await page.evaluate(() => ({
    planRows: document.querySelectorAll('#progLibraryContent .plan-row').length,
    rowMenus: document.querySelectorAll('#progLibraryContent .plan-row__menu').length,
    legacyCustomCards: document.querySelectorAll('#progLibraryContent .prog-card').length,
    routineCards: document.querySelectorAll('#progLibraryContent .routine-card').length,
    sectionTitles: [...document.querySelectorAll('#progLibraryContent .plans-section__title, #progLibraryContent .filtered-grid-title')]
      .map((el) => el.textContent.trim()),
  }));

  // ── Plan page (open the active plan's page) ───────────────────────────────
  await tap('[data-action="open-program-detail"][data-program-id="prog_audit"]', 600)
    || await tap('.prog-card[data-program-id="prog_audit"]', 600);
  report.surfaces.planPage = await measureSurface('#programDetailContent');
  report.surfaces.planPage.detail = await page.evaluate(() => {
    const cta = document.querySelector('#programDetailContent .detail-cta-btn');
    const dayRows = document.querySelectorAll('#programDetailContent .wag-row');
    return {
      ctaTop: cta ? Math.round(cta.getBoundingClientRect().top + window.scrollY) : null,
      dayRows: dayRows.length,
      sectionTitles: [...document.querySelectorAll('#programDetailContent .detail-section-title')].map((el) => el.textContent.trim()),
      tabs: [...document.querySelectorAll('#programDetailContent [data-detail-tab]')].map((el) => el.textContent.trim()),
    };
  });
  // Expand the first training day: the per-lift targets are the point of PL4.
  const firstDay = '#programDetailContent [data-action="toggle-plan-day"]';
  if (await page.evaluate((sel) => !!document.querySelector(sel), firstDay)) {
    await tap(firstDay, 250);
    report.surfaces.planPage.expanded = await page.evaluate(() => ({
      targets: document.querySelectorAll('#programDetailContent .plan-day__panel:not([hidden]) .wpm-exercise-item').length,
      sample: [...document.querySelectorAll('#programDetailContent .plan-day__panel:not([hidden]) .wpm-exercise-item')]
        .slice(0, 4).map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
    }));
  }

  // ── Plan editor (Edit on a custom plan) ───────────────────────────────────
  await tap('#programDetailContent [data-action="open-builder"]', 700);
  report.surfaces.editor = await measureSurface('#builderViewContainer');
  report.surfaces.editor.detail = await page.evaluate(() => {
    const root = document.getElementById('builderViewContainer');
    if (!root) return null;
    return {
      sectionLinks: [...root.querySelectorAll('.program-editor__section-link')].map((el) => el.textContent.trim()),
      planDayRows: root.querySelectorAll('.program-editor__day-row').length,
      dayCardsOnPlan: root.querySelectorAll('.program-editor__day-card').length,
      saveStatusText: (root.querySelector('[role="status"]')?.textContent || '').trim().slice(0, 60),
    };
  });
  // The exercise rows live one level down (Plan → Week → Day).
  await tap('#builderViewContainer [data-action="b-select-day"]', 400);
  report.surfaces.editor.day = await page.evaluate(() => {
    const root = document.getElementById('builderViewContainer');
    if (!root) return null;
    const rows = root.querySelectorAll('.program-editor__exercise-row, [data-editor-row]').length;
    return {
      exerciseRows: rows,
      controlsPerRow: rows ? Math.round(root.querySelectorAll('button, input, select').length / rows) : null,
      perLiftTargets: root.querySelectorAll('.program-editor__target').length,
      dayCards: root.querySelectorAll('.program-editor__day-card').length,
    };
  });
  // The per-lift gap is stated on the Progression tab, not the Schedule tab.
  await tap('[data-action="b-section"][data-section="progression"]', 400);
  report.surfaces.editor.progression = await page.evaluate(() => {
    const root = document.getElementById('builderViewContainer');
    if (!root) return null;
    return {
      controls: [...root.querySelectorAll('button, input, select')].length,
      perLiftTargets: root.querySelectorAll('.program-editor__target').length,
      hasDeclaredGap: /per-exercise targets are coming/i.test(root.textContent || ''),
    };
  });
} catch (err) {
  errors.push(`audit failed: ${/** @type {Error} */ (err).message}`);
}

report.errors = errors;
await context.close();
await browser.close();
server.close();

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const pad = (v) => (v == null ? '—' : String(v));
  console.log(`\nPlans surface audit · ${WIDTH}px · ${report.at}\n`);
  const row = (label, value) => console.log(`  ${label.padEnd(38)} ${value}`);
  const h = report.surfaces.home || {};
  row('Plans home height', `${pad(h.documentHeight)} px`);
  row('Controls on home', `${pad(h.visibleControls)} (${pad(h.controlsAboveFold)} above fold)`);
  row('First content top', `${pad(h.firstContentTop)} px`);
  row('Active card / utility / tabs', `${pad(h.detail?.activeCardTop)} / ${pad(h.detail?.utilityRowTop)} / ${pad(h.detail?.tabsTop)}`);
  row('Search / recommendations', `${pad(h.detail?.searchTop)} / ${pad(h.detail?.recommendationsTop)}`);
  row('Filter entry reachable', pad(report.reachability.filterEntry));
  row('Filter chips on landing', pad(report.reachability.filterChipsOnLanding));
  row('Plan actions (primary / total)', `${pad(report.reachability.planActions?.primary)} / ${pad(report.reachability.planActions?.total)}`);
  const m = report.surfaces.myPlans || {};
  row('My plans: plan rows / menus', `${pad(m.detail?.planRows)} / ${pad(m.detail?.rowMenus)}`);
  row('My plans: routine cards', pad(m.detail?.routineCards));
  row('My plans: section titles', (m.detail?.sectionTitles || []).join(' · ') || '—');
  const b = report.surfaces.browse || {};
  row('Browse: rows / summary', `${pad(b.detail?.rows)} / ${b.detail?.summary || '—'}`);
  row('Browse: search / sort / filters', `${pad(b.detail?.hasSearch)} / ${pad(b.detail?.hasSort)} / ${pad(b.detail?.hasFilterButton)}`);
  row('Browse: filters sheet opens', pad(b.filtersOpen));
  row('Browse: rows after Strength facet', pad(b.afterStrengthFacet));
  const p = report.surfaces.planPage || {};
  row('Plan page height / controls', `${pad(p.documentHeight)} px / ${pad(p.visibleControls)}`);
  row('Plan page CTA top', `${pad(p.detail?.ctaTop)} px`);
  row('Plan page day rows', pad(p.detail?.dayRows));
  row('Plan page targets on one open day', pad(p.expanded?.targets));
  row('Plan page example targets', (p.expanded?.sample || []).join(' | ') || '—');
  const e = report.surfaces.editor || {};
  row('Editor height / controls', `${pad(e.documentHeight)} px / ${pad(e.visibleControls)}`);
  row('Editor plan day rows / cards', `${pad(e.detail?.planDayRows)} / ${pad(e.detail?.dayCardsOnPlan)}`);
  row('Editor day rows / controls per row', `${pad(e.day?.exerciseRows)} / ${pad(e.day?.controlsPerRow)}`);
  row('Editor per-lift target controls', pad(e.day?.perLiftTargets));
  row('Editor says "coming" (progression)', pad(e.progression?.hasDeclaredGap));
  row('Progression tab controls', pad(e.progression?.controls));
  if (report.errors.length) {
    console.log('\n  Browser errors:');
    for (const err of report.errors) console.log(`   · ${err}`);
  }
  console.log('');
}
process.exit(report.errors.length ? 1 : 0);
