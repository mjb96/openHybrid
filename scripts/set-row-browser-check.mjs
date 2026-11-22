// =============================================================================
// SET ROW BROWSER CHECK — roadmap Phase 2A
//
// Two set-row contract requirements, driven through the real cockpit:
//
//   "previous values visible"     — last time's numbers stay on screen WHILE
//                                   typing, not only until the first keystroke
//                                   clears the placeholder.
//   "invalid input explained inline" — the complaint lands on the offending
//                                   row, not in a toast that appears elsewhere
//                                   and is gone before you look up.
//
// The load-bearing assertion is the negative weight. setVolume is
// parseFloat(w) * parseInt(r), so a stored -50 SUBTRACTS from tonnage, weekly
// volume, muscle credits and every landmark built on them. This check exists to
// prove the tick is refused and nothing reaches state.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium } from './browser-runtime.mjs';
import { enterCockpit } from './cockpit-entry.mjs';

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

const TZ = 'Australia/Sydney';

// A prior session of the same Thursday lifts, dated in the past so it is
// unambiguously "last time". Archived on purpose: history must survive a
// program switch, and the previous-values line is a reader of stamped dates.
function fixture(theme) {
  const done = (w, r) => ({ w: String(w), r: String(r), c: true });
  return {
    schemaVersion: 5, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'current',
    settings: { name: 'Row', theme, weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true, showPlateHints: true },
    weeks: {
      'arch:old:1': {
        activationId: 'old', programId: 'hybrid_engine',
        dates: { thu: '2026-07-16' },
        lifts: {
          thu: {
            'Incline Barbell Press': [done(60, 8), done(62.5, 8), done(65, 6), done(65, 6)],
            'Seated DB Shoulder Press': [done(22.5, 10), done(22.5, 10), done(22.5, 9)],
          },
        },
        runs: {}, notes: {}, gymRpe: {}, gymStats: {},
      },
    },
  };
}

/** Type into the open card's first working row and tick it. */
const attemptLog = (page, weight, reps) => page.evaluate(([w, r]) => {
  const card = document.querySelector('.cockpit-exercise:not(.collapsed)');
  const row = card?.querySelector('.cockpit-set-row');
  const wIn = row?.querySelector('.input-weight-node');
  const rIn = row?.querySelector('.input-reps-node');
  if (wIn) { wIn.value = w; wIn.dispatchEvent(new Event('input', { bubbles: true })); }
  if (rIn) { rIn.value = r; rIn.dispatchEvent(new Event('input', { bubbles: true })); }
  row?.querySelector('.gym-check')?.click();
}, [weight, reps]);

const readRow = (page) => page.evaluate(() => {
  const card = document.querySelector('.cockpit-exercise:not(.collapsed)');
  const row = card?.querySelector('.cockpit-set-row');
  const msg = row?.querySelector('.set-row-msg');
  return {
    ticked: !!row?.querySelector('.gym-check')?.checked,
    complete: !!row?.classList.contains('is-complete'),
    message: msg && !msg.hidden ? msg.textContent.trim() : '',
    warning: !!msg?.classList.contains('is-warning'),
  };
});

/** What actually reached state — the only thing analytics will ever read. */
const storedFirstSet = (page, lift) => page.evaluate((name) => {
  const state = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
  const sets = state.weeks?.['1']?.lifts?.thu?.[name];
  return Array.isArray(sets) ? sets[0] : null;
}, lift);

/** One stored set by index, for the plate calculator's write/no-write checks. */
const storedSetAt = (page, lift, index) => page.evaluate(([name, idx]) => {
  const state = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
  return state.weeks?.['1']?.lifts?.thu?.[name]?.[idx] || null;
}, [lift, index]);

/** The plate calculator sheet as rendered — text and chips, not state. */
const readPlateSheet = (page) => page.evaluate(() => {
  const q = (id) => document.getElementById(id);
  const shown = (id) => {
    const node = q(id);
    return node && !node.hidden ? (node.textContent || '').trim() : '';
  };
  const chips = (id) => [...document.querySelectorAll(`#${id} [data-plate]`)]
    .map((node) => ({ plate: Number(node.dataset.plate), count: Number(node.dataset.count) }));
  const sheet = q('plateSheet');
  return {
    open: !!sheet?.classList.contains('active'),
    sub: (q('plateSheetSub')?.textContent || '').trim(),
    target: String(q('plateTarget')?.value || ''),
    headline: shown('plateSheetHeadline'),
    shortfall: shown('plateSheetShortfall'),
    belowBar: shown('plateSheetBelowBar'),
    limited: shown('plateSheetLimited'),
    bar: shown('plateSheetBar'),
    plates: shown('plateSheetPlates'),
    perSide: chips('plateSheetPerSide'),
    pairs: chips('plateSheetPairs'),
    useDisabled: !!q('plateUseWeight')?.disabled,
    reason: (q('plateUseReason')?.textContent || '').trim(),
    overflow: sheet ? sheet.scrollWidth - sheet.clientWidth : 0,
  };
});

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const failures = [];
const fail = (m) => failures.push(m);
try {
  for (const [width, theme] of [[320, 'dark'], [390, 'light'], [412, 'dark']]) {
    const tag = `${width}px/${theme}`;
    const context = await createBrowserContext(browser, { viewport: { width, height: 900 }, timezoneId: TZ, colorScheme: theme });
    await context.addInitScript(([k, v]) => {
      // Seed once per context. On a reload the app's own saved state must win;
      // re-seeding the fixture here would erase what the check is proving.
      if (!localStorage.getItem('__set_row_seeded')) {
        localStorage.setItem(k, v);
        localStorage.setItem('__set_row_seeded', '1');
      }
    }, ['hybrid_engine_v2_state', JSON.stringify(fixture(theme))]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/frame-ancestors.*ignored.*meta/i.test(m.text()) && !/net::ERR_/.test(m.text())) errors.push(m.text());
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await enterCockpit(page);

    // ---- previous values are a COLUMN, and stay visible while typing -------
    const prev = await page.evaluate(() => {
      const card = document.querySelector('.cockpit-exercise:not(.collapsed)');
      return [...(card?.querySelectorAll('.cockpit-set-row .set-prev-col') || [])]
        .map((n) => ({ text: n.textContent.replace(/[↑↓=]/g, '').trim(), empty: n.classList.contains('is-empty') }));
    });
    console.log(`${tag} previous-values:`, JSON.stringify(prev));
    if (!prev.length) fail(`${tag}: no PREVIOUS column despite a dated prior session`);
    if (prev[0]?.empty) fail(`${tag}: the first row has no previous value despite a dated prior session`);
    if (prev[0] && !/^60×8$/.test(prev[0].text)) fail(`${tag}: first row shows "${prev[0].text}", expected last time's 60×8`);
    if (prev.some((p) => /undefined|NaN|--/.test(p.text))) fail(`${tag}: PREVIOUS rendered a placeholder: ${prev.map((p) => p.text).join(' , ')}`);



    // ---- a negative weight is refused, and never reaches state --------------
    await attemptLog(page, '-50', '5');
    await page.waitForTimeout(250);
    let row = await readRow(page);
    console.log(`${tag} negative-weight:`, JSON.stringify(row));
    if (row.ticked || row.complete) fail(`${tag}: a -50 weight was accepted as a completed set`);
    if (!row.message) fail(`${tag}: negative weight refused with no inline message on the row`);
    if (row.message && !/negative/i.test(row.message)) fail(`${tag}: unhelpful message for a negative weight: "${row.message}"`);
    let stored = await storedFirstSet(page, 'Incline Barbell Press');
    if (stored?.c) fail(`${tag}: a refused set was still stored complete: ${JSON.stringify(stored)}`);

    // The line must stay put while typing — that is the whole point of it.
    const prevStillThere = await page.evaluate(() => {
      const cell = document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-set-row .set-prev-col');
      return !!cell && !cell.classList.contains('is-empty') && !!cell.textContent.trim();
    });
    if (!prevStillThere) fail(`${tag}: the PREVIOUS column disappeared once the field had a value`);

    // ---- zero reps is refused ----------------------------------------------
    await attemptLog(page, '60', '0');
    await page.waitForTimeout(250);
    row = await readRow(page);
    console.log(`${tag} zero-reps:`, JSON.stringify(row));
    if (row.ticked) fail(`${tag}: a 0-rep set was accepted as completed`);
    if (!row.message) fail(`${tag}: zero reps refused with no inline message`);

    // ---- editing clears the complaint --------------------------------------
    await page.evaluate(() => {
      const input = document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-set-row .input-reps-node');
      if (input) { input.value = '8'; input.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(200);
    if ((await readRow(page)).message) fail(`${tag}: the error persisted after the athlete corrected the field`);

    // ---- a valid set logs cleanly ------------------------------------------
    await attemptLog(page, '62.5', '8');
    await page.waitForTimeout(400);
    row = await readRow(page);
    console.log(`${tag} valid:`, JSON.stringify(row));
    if (!row.ticked || !row.complete) fail(`${tag}: a valid 62.5 × 8 set was not accepted`);
    if (row.message) fail(`${tag}: a valid set was complained about: "${row.message}"`);
    stored = await storedFirstSet(page, 'Incline Barbell Press');
    if (!stored?.c || String(stored.w) !== '62.5' || String(stored.r) !== '8') {
      fail(`${tag}: stored set does not match what was logged: ${JSON.stringify(stored)}`);
    }
    const plateLine = await page.evaluate(() =>
      document.querySelector('.cockpit-exercise:not(.collapsed) .set-plate-line:not([hidden])')?.textContent?.trim() || '');
    console.log(`${tag} plate-line:`, JSON.stringify(plateLine));
    if (!/\/ side/.test(plateLine)) fail(`${tag}: per-set plate line is missing (got "${plateLine}")`);

    // ---- plate calculator sheet: real profile, real shortfall --------------
    // Row 2 is deliberately used here: row 1 is the blank row the exercise
    // config block below reads, so this flow must not fill it. Runs in light
    // theme too: the shortfall/warning ink is measured there, not assumed.
    if ((width === 412 && theme === 'dark') || (width === 320 && theme === 'dark')
      || (width === 390 && theme === 'light')) {
      const plateRow = '.cockpit-exercise:not(.collapsed) .cockpit-set-row[data-set-index="2"]';
      await page.fill(`${plateRow} .input-weight-node`, '62.5');
      await page.waitForTimeout(200);
      await page.click(`${plateRow} .set-num-lbl`);
      await page.waitForSelector('#setSheet.active');
      // The click above blurred the row, so this is the committed value the
      // calculator must leave alone if the target is unbuildable.
      const storedBeforePlate = await storedSetAt(page, 'Incline Barbell Press', 2);
      if (String(storedBeforePlate?.w ?? '') !== '62.5') {
        fail(`${tag}: the row weight did not commit before opening the plate sheet (${JSON.stringify(storedBeforePlate)})`);
      }
      await page.click('#setSheet [data-action="set-sheet-plates"]');
      await page.waitForSelector('#plateSheet.active');

      const activeSetup = await page.evaluate(async () => {
        const state = await import('./js/state.js');
        const profiles = await import('./js/equipment-profiles.js');
        const setup = profiles.getActivePlateSetup(state.appState, 'kg');
        return { bar: setup.bar, plates: setup.plates };
      });

      let plateView = await readPlateSheet(page);
      console.log(`${tag} plate-sheet:`, JSON.stringify(plateView));
      if (!plateView.open) fail(`${tag}: the plate calculator did not open from the set sheet`);
      if (!/Incline Barbell Press · Set 3 · /.test(plateView.sub)) {
        fail(`${tag}: plate sheet subtitle lost the lift/set context ("${plateView.sub}")`);
      }
      if (plateView.target !== '62.5') {
        fail(`${tag}: plate target was not prefilled from the row (got "${plateView.target}")`);
      }
      if (!/^20 \+ 1\.25$/.test(plateView.headline)) {
        fail(`${tag}: 62.5 kg should read 20 + 1.25 (got "${plateView.headline}")`);
      }
      if (!plateView.perSide.some((c) => c.plate === 20) || !plateView.perSide.some((c) => c.plate === 1.25)) {
        fail(`${tag}: 62.5 kg per-side chips are wrong (${JSON.stringify(plateView.perSide)})`);
      }
      const shownPlates = [...plateView.perSide, ...plateView.pairs].map((c) => c.plate);
      const outside = shownPlates.filter((p) => !activeSetup.plates.includes(p));
      if (outside.length) {
        fail(`${tag}: the plate sheet showed plates outside the active profile: ${outside.join(', ')}`);
      }
      // Split the kit line rather than grabbing every number: an owned-pairs
      // suffix ("20 ×0") would otherwise be read as a plate denomination.
      const kitPlates = plateView.plates
        .replace(/^Plates:\s*/, '')
        .split(' · ')
        .map((part) => Number.parseFloat(part))
        .filter((n) => Number.isFinite(n));
      if (!activeSetup.plates.every((p) => kitPlates.includes(p)) || kitPlates.some((p) => !activeSetup.plates.includes(p))) {
        fail(`${tag}: read-only plate list does not match the active profile (${plateView.plates})`);
      }
      if (!plateView.bar.includes(String(activeSetup.bar))) {
        fail(`${tag}: read-only bar line does not name the active bar (${plateView.bar})`);
      }

      await page.fill('#plateTarget', '100');
      await page.waitForTimeout(150);
      plateView = await readPlateSheet(page);
      if (!/^25 \+ 15$/.test(plateView.headline)) {
        fail(`${tag}: 100 kg should read 25 + 15 (got "${plateView.headline}")`);
      }
      if (plateView.useDisabled) {
        fail(`${tag}: a blank weighted barbell row should allow Use this weight (${plateView.reason})`);
      }

      // A total the sheet itself declares unbuildable must not be writable.
      await page.fill('#plateTarget', '101');
      await page.waitForTimeout(400);
      plateView = await readPlateSheet(page);
      if (!/1 kg short/.test(plateView.shortfall)) {
        fail(`${tag}: 101 kg should state a 1 kg total shortfall (got "${plateView.shortfall}")`);
      }
      if (!/Closest you can build: 100 kg/.test(plateView.shortfall)) {
        fail(`${tag}: 101 kg should name 100 kg as the closest buildable total (got "${plateView.shortfall}")`);
      }
      if (!/1 kg short/.test(plateView.headline)) {
        fail(`${tag}: the 101 kg headline hid the shortfall (got "${plateView.headline}")`);
      }
      if (!plateView.useDisabled || !/1 kg short — closest 100 kg/.test(plateView.reason)) {
        fail(`${tag}: 101 kg left Use this weight enabled or unexplained (${JSON.stringify({ disabled: plateView.useDisabled, reason: plateView.reason })})`);
      }
      const storedAt101 = await storedSetAt(page, 'Incline Barbell Press', 2);
      if (String(storedAt101?.w ?? '') !== String(storedBeforePlate?.w ?? '')
        || String(storedAt101?.w ?? '') === '101') {
        fail(`${tag}: an unbuildable 101 kg target changed the stored weight (${JSON.stringify({ before: storedBeforePlate, after: storedAt101 })})`);
      }

      if (width === 390 && theme === 'light') {
        const warning = await page.evaluate(() => {
          const node = document.getElementById('plateSheetShortfall');
          if (!node || node.hidden) return null;
          const parse = (value) => {
            const match = String(value || '').match(/rgba?\(([^)]+)\)/);
            if (!match) return null;
            const parts = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
            if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
            return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] == null ? 1 : parts[3] };
          };
          const channel = (v) => {
            const n = v / 255;
            return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
          };
          const luminance = (color) => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
          const foreground = parse(getComputedStyle(node).color) || { r: 0, g: 0, b: 0, a: 1 };
          let background = { r: 255, g: 255, b: 255, a: 1 };
          let cursor = node.parentElement;
          while (cursor) {
            const candidate = parse(getComputedStyle(cursor).backgroundColor);
            if (candidate && candidate.a >= 0.95) { background = candidate; break; }
            cursor = cursor.parentElement;
          }
          const fg = luminance(foreground);
          const bg = luminance(background);
          const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
          return {
            ratio: Number(ratio.toFixed(2)),
            color: getComputedStyle(node).color,
            background: `rgb(${background.r}, ${background.g}, ${background.b})`,
            isWarn: node.classList.contains('is-warn'),
          };
        });
        console.log(`${tag} plate-warning-contrast:`, JSON.stringify(warning));
        if (!warning?.isWarn) fail(`${tag}: the shortfall note is not marked as a warning to measure`);
        if (!warning || warning.ratio < 4.5) {
          fail(`${tag}: light-theme shortfall contrast is ${warning?.ratio}:1 (${warning?.color} on ${warning?.background})`);
        }
      }

      await page.fill('#plateTarget', '15');
      await page.waitForTimeout(150);
      plateView = await readPlateSheet(page);
      if (!/under the bar/.test(plateView.headline) || !/5 kg below the 20 kg bar/.test(plateView.belowBar)) {
        fail(`${tag}: 15 kg should read as below the bar (${JSON.stringify({ headline: plateView.headline, belowBar: plateView.belowBar })})`);
      }
      if (!plateView.useDisabled || !plateView.reason) {
        fail(`${tag}: a below-bar target left Use this weight enabled with no reason (${plateView.reason})`);
      }
      if (width === 320 && plateView.overflow > 1) {
        fail(`${tag}: the plate sheet overflows horizontally by ${plateView.overflow}px`);
      }

      // Escape closes only the calculator — the set sheet is the parent layer.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const backToSet = await page.evaluate(() => ({
        plate: !!document.getElementById('plateSheet')?.classList.contains('active'),
        set: !!document.getElementById('setSheet')?.classList.contains('active'),
      }));
      if (backToSet.plate || !backToSet.set) {
        fail(`${tag}: Escape did not return to the set sheet (${JSON.stringify(backToSet)})`);
      }

      // Use this weight writes through the row input and persists.
      await page.click('#setSheet [data-action="set-sheet-plates"]');
      await page.waitForSelector('#plateSheet.active');
      await page.fill('#plateTarget', '100');
      await page.waitForTimeout(150);
      await page.click('#plateUseWeight');
      await page.waitForTimeout(700);
      const applied = await page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        return {
          row: String(document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-set-row[data-set-index="2"] .input-weight-node')?.value || ''),
          stored: state.weeks?.['1']?.lifts?.thu?.['Incline Barbell Press']?.[2] || null,
          plateOpen: !!document.getElementById('plateSheet')?.classList.contains('active'),
          setOpen: !!document.getElementById('setSheet')?.classList.contains('active'),
        };
      });
      console.log(`${tag} plate-apply:`, JSON.stringify(applied));
      if (applied.row !== '100') fail(`${tag}: Use this weight did not write the row (got "${applied.row}")`);
      if (String(applied.stored?.w) !== '100') {
        fail(`${tag}: Use this weight did not persist (${JSON.stringify(applied.stored)})`);
      }
      if (applied.stored?.c) fail(`${tag}: Use this weight completed the set`);
      if (applied.plateOpen || applied.setOpen) fail(`${tag}: Use this weight did not close both sheets`);

      // Browsing a target without applying never rewrites the stored weight.
      await page.click(`${plateRow} .set-num-lbl`);
      await page.waitForSelector('#setSheet.active');
      await page.click('#setSheet [data-action="set-sheet-plates"]');
      await page.waitForSelector('#plateSheet.active');
      await page.fill('#plateTarget', '80');
      await page.waitForTimeout(150);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(350);
      await page.click('#setSheet .sheet-close-btn');
      await page.waitForTimeout(500);
      const untouched = await page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        return {
          stored: String(state.weeks?.['1']?.lifts?.thu?.['Incline Barbell Press']?.[2]?.w ?? ''),
          row: String(document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-set-row[data-set-index="2"] .input-weight-node')?.value || ''),
        };
      });
      if (untouched.stored !== '100' || untouched.row !== '100') {
        fail(`${tag}: a target-only open/close rewrote the row weight (${JSON.stringify(untouched)})`);
      }
    }

    // ---- half-step effort: 5-column grid, tap to rate, tap again to clear --
    // 412/dark is the standard cockpit; 320/dark is the narrowest width, where
    // five 44px columns must still fit without horizontal overflow.
    if ((width === 412 || width === 320) && theme === 'dark') {
      const effortRow = '.cockpit-exercise:not(.collapsed) .cockpit-set-row[data-set-index="0"]';
      await page.click(`${effortRow} .set-num-lbl`);
      await page.waitForSelector('#setSheet.active');
      const effortGrid = await page.evaluate(() => {
        const group = document.getElementById('setSheetRir');
        const sheet = document.getElementById('setSheet');
        const buttons = [...group.querySelectorAll('button')];
        const rated = buttons.filter((b) => b.hasAttribute('data-rir'));
        const rects = buttons.map((b) => b.getBoundingClientRect());
        return {
          count: buttons.length,
          rated: rated.length,
          columns: getComputedStyle(group).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          rows: [...new Set(rects.map((r) => Math.round(r.top)))].length,
          groupOverflow: group.scrollWidth - group.clientWidth,
          sheetOverflow: sheet.scrollWidth - sheet.clientWidth,
          minWidth: Math.round(Math.min(...rects.map((r) => r.width))),
          minHeight: Math.round(Math.min(...rects.map((r) => r.height))),
          aria: group.querySelector('[data-rir="1.5"]')?.getAttribute('aria-label') || '',
        };
      });
      console.log(`${tag} effort-grid:`, JSON.stringify(effortGrid));
      if (effortGrid.count !== 10) fail(`${tag}: effort grid has ${effortGrid.count} buttons, expected 10`);
      if (effortGrid.rated !== 9) fail(`${tag}: effort grid has ${effortGrid.rated} RIR buttons, expected 9`);
      if (effortGrid.columns !== 5) fail(`${tag}: effort grid is ${effortGrid.columns} columns, expected 5`);
      if (effortGrid.rows !== 2) fail(`${tag}: effort grid is ${effortGrid.rows} rows, expected 2`);
      if (effortGrid.groupOverflow > 1) fail(`${tag}: effort grid overflows by ${effortGrid.groupOverflow}px`);
      if (effortGrid.sheetOverflow > 1) fail(`${tag}: the set sheet overflows horizontally by ${effortGrid.sheetOverflow}px`);
      if (effortGrid.minHeight < 44) fail(`${tag}: an effort button is ${effortGrid.minHeight}px tall, below 44px`);
      if (width === 320 && effortGrid.minWidth < 44) {
        fail(`${tag}: a 5-column effort button is only ${effortGrid.minWidth}px wide`);
      }
      if (effortGrid.aria !== '1.5 reps in reserve') {
        fail(`${tag}: the 1½ button is named "${effortGrid.aria}"`);
      }

      await page.click('#setSheet [data-rir="1.5"]');
      await page.waitForTimeout(350);
      const rated = await page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        const set = state.weeks?.['1']?.lifts?.thu?.['Incline Barbell Press']?.[0] || null;
        return {
          active: document.querySelector('#setSheet [data-rir="1.5"]')?.classList.contains('is-active'),
          activeCount: document.querySelectorAll('#setSheetRir button.is-active').length,
          rir: set?.rir,
          rpe: set?.rpe,
        };
      });
      console.log(`${tag} effort-rated:`, JSON.stringify(rated));
      if (!rated.active || rated.activeCount !== 1) {
        fail(`${tag}: tapping 1½ did not leave exactly that button active (${JSON.stringify(rated)})`);
      }
      if (rated.rir !== 1.5 || rated.rpe !== 8.5) {
        fail(`${tag}: 1½ stored ${JSON.stringify({ rir: rated.rir, rpe: rated.rpe })}, expected {rir:1.5,rpe:8.5}`);
      }

      await page.click('#setSheet [data-rir="1.5"]');
      await page.waitForTimeout(350);
      const cleared = await page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        const set = state.weeks?.['1']?.lifts?.thu?.['Incline Barbell Press']?.[0] || null;
        return {
          activeCount: document.querySelectorAll('#setSheetRir button.is-active').length,
          rir: set?.rir,
          rpe: set?.rpe,
        };
      });
      console.log(`${tag} effort-cleared:`, JSON.stringify(cleared));
      if (cleared.activeCount !== 0 || cleared.rir != null || cleared.rpe != null) {
        fail(`${tag}: re-tapping 1½ did not clear the rating (${JSON.stringify(cleared)})`);
      }
      await page.click('#setSheet .sheet-close-btn');
      await page.waitForTimeout(250);
    }

    if (width === 412 && theme === 'dark') {
      await page.click('.cockpit-exercise:not(.collapsed) .btn-ex-config');
      await page.waitForSelector('.exercise-config');
      await page.click('.exercise-config [data-rest="off"]');
      await page.click('.exercise-config [data-warmup="off"]');
      await page.click('.exercise-config [data-load-mode="banded"]');
      await page.fill('#exerciseConfigNote', 'Belt on');
      await page.click('.exercise-config [data-cm="ok"]');
      await page.waitForTimeout(350);
      const cfg = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        const prefs = Object.values(s.settings?.exercisePrefs || {});
        return {
          note: prefs.map((p) => p.note).find(Boolean) || '',
          warmup: prefs.map((p) => p.warmup).find(Boolean) || '',
          rest: s.settings?.restOverrides?.['Incline Barbell Press'],
          loadMode: Object.values(s.settings?.exercisePrefs || {}).map((p) => p.loadMode).find(Boolean) || '',
          cardNote: document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-ex-note')?.textContent?.trim() || '',
          blankLoad: document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-set-row[data-set-index="1"]')?.getAttribute('data-load-label') || '',
          blankWeight: document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-set-row[data-set-index="1"] .input-weight-node')?.value || '',
        };
      });
      if (cfg.note !== 'Belt on') fail(`${tag}: exercise note did not persist (${JSON.stringify(cfg)})`);
      if (cfg.warmup !== 'off') fail(`${tag}: exercise warm-up mode did not persist (${JSON.stringify(cfg)})`);
      if (cfg.rest !== 0) fail(`${tag}: exercise no-timer rest did not persist (${JSON.stringify(cfg)})`);
      if (cfg.loadMode !== 'banded') fail(`${tag}: exercise load default did not persist (${JSON.stringify(cfg)})`);
      if (cfg.blankLoad !== 'M') fail(`${tag}: a blank row ignored the Band load default (${JSON.stringify(cfg)})`);
      if (String(cfg.blankWeight) !== '20') fail(`${tag}: a Band row did not show the band load (${JSON.stringify(cfg)})`);
      if (!/Belt on/.test(cfg.cardNote)) fail(`${tag}: exercise note did not render on the card`);
    }

    const comparison = await page.evaluate(() => {
      const cmp = document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-set-row .set-cmp');
      return cmp ? { text: cmp.textContent, cls: cmp.className } : null;
    });
    if (!comparison || !/set-cmp--up/.test(comparison.cls)) {
      fail(`${tag}: a completed set did not show its comparison against last time (${JSON.stringify(comparison)})`);
    }

    // ---- per-set rest and note (one viewport is enough for this UI path) ----
    // Both live in the set sheet now: the row keeps one line per set, and the
    // sheet is opened by tapping the set number.
    if (width === 412 && theme === 'dark') {
      await page.click('.cockpit-exercise:not(.collapsed) .cockpit-set-row .set-num-lbl');
      await page.waitForSelector('#setSheet.active');
      await page.click('#setSheet [data-action="set-sheet-custom-rest"]');
      await page.waitForSelector('.cmodal__input');
      await page.fill('.cmodal__input', '75');
      await page.click('.cmodal__btn--ok');
      await page.waitForTimeout(350);
      const restLabel = await page.locator('.cockpit-exercise:not(.collapsed) .cockpit-set-row').first().getAttribute('data-rest-label');
      if (!/1:15/.test(restLabel || '')) fail(`${tag}: per-set rest did not render 1:15 (got "${restLabel}")`);

      await page.click('#setSheet [data-action="set-sheet-note"]');
      await page.waitForSelector('.cmodal__input');
      await page.fill('.cmodal__input', 'Belt on, paused');
      await page.click('.cmodal__btn--ok');
      await page.waitForTimeout(350);
      const note = await page.locator('.cockpit-exercise:not(.collapsed) .cockpit-set-row .set-note').first().textContent();
      if (!/Belt on, paused/.test(note || '')) fail(`${tag}: per-set note did not render (got "${note}")`);
      const noteState = await page.locator('#setSheetNoteState').textContent();
      if (!/✓/.test(noteState || '')) fail(`${tag}: the sheet did not mark the stored note (got "${noteState}")`);
      const storedMeta = await storedFirstSet(page, 'Incline Barbell Press');
      if (storedMeta?.restSec !== 75 || storedMeta?.note !== 'Belt on, paused') {
        fail(`${tag}: per-set rest/note did not persist: ${JSON.stringify({ restSec: storedMeta?.restSec, note: storedMeta?.note })}`);
      }
      await page.click('#setSheet .sheet-close-btn');
      await page.waitForTimeout(250);
    }

    // ---- timed hold and carry shapes (one viewport is enough) --------------
    if (width === 412 && theme === 'dark') {
      const row2 = '.cockpit-exercise:not(.collapsed) .cockpit-set-row[data-set-index="1"]';
      const shape = async (mode) => {
        await page.click(`${row2} .set-num-lbl`);
        await page.waitForSelector('#setSheet.active');
        await page.click(`#setSheet [data-action="set-sheet-mode"][data-mode="${mode}"]`);
        await page.waitForTimeout(350);
        await page.click('#setSheet .sheet-close-btn');
        await page.waitForTimeout(250);
      };

      await shape('time');
      if (!(await page.locator(`${row2} .input-time-node`).count())) fail(`${tag}: choosing Time did not render a time field`);
      await page.fill(`${row2} .input-weight-node`, '40');
      await page.fill(`${row2} .input-time-node`, '1:30');
      await page.click(`${row2} .gym-check`);
      await page.waitForTimeout(400);
      const hold = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        return (s.weeks?.['1']?.lifts?.thu?.['Incline Barbell Press'] || [])[1] || null;
      });
      if (hold?.mode !== 'time' || Number(hold?.sec) !== 90 || hold?.r) {
        fail(`${tag}: timed hold did not persist as sec=90 (${JSON.stringify(hold)})`);
      }

      // Un-tick the hold before reshaping the same row: the checkbox toggles,
      // so leaving it checked would turn the next click into a removal.
      await page.click(`${row2} .gym-check`);
      await page.waitForTimeout(200);
      await shape('distance');
      if (!(await page.locator(`${row2} .input-dist-node`).count())) fail(`${tag}: choosing Distance did not render a distance field`);
      await page.fill(`${row2} .input-weight-node`, '40');
      await page.fill(`${row2} .input-dist-node`, '20');
      await page.click(`${row2} .gym-check`);
      await page.waitForTimeout(400);
      const carry = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        return (s.weeks?.['1']?.lifts?.thu?.['Incline Barbell Press'] || [])[1] || null;
      });
      console.log(`${tag} set-shapes:`, JSON.stringify({ hold: hold && { mode: hold.mode, sec: hold.sec }, carry: carry && { mode: carry.mode, dist: carry.dist } }));
      if (carry?.mode !== 'distance' || Number(carry?.dist) !== 20) {
        fail(`${tag}: carry did not persist as dist=20 (${JSON.stringify(carry)})`);
      }
    }

    // ---- private reference link: real anchor, safe URL only, persists ------
    // The link is free text the athlete stores per exercise. It must render as
    // a real anchor (never markup), keep a 44px target and refuse every
    // non-http(s) scheme without overwriting the good link already stored.
    // Runs in BOTH themes: the light card is where cyan text used to fail.
    if ((width === 390 && theme === 'light') || (width === 412 && theme === 'dark')) {
      const openConfig = async () => {
        await page.click('.cockpit-exercise:not(.collapsed) .btn-ex-config');
        await page.waitForSelector('.exercise-config');
      };
      await openConfig();
      await page.fill('#exerciseConfigLink', 'https://www.youtube.com/watch?v=abc123');
      if (await page.locator('#exerciseConfigLinkError').isVisible()) {
        fail(`${tag}: a valid reference link showed an inline error`);
      }
      await page.click('.exercise-config [data-cm="ok"]');
      await page.waitForTimeout(350);
      const anchor = await page.evaluate(() => {
        const a = document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-ex-link');
        if (!a) return null;
        const rect = a.getBoundingClientRect();
        const parse = (value) => {
          const match = String(value || '').match(/rgba?\(([^)]+)\)/);
          if (!match) return null;
          const parts = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
          if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
          return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] == null ? 1 : parts[3] };
        };
        const channel = (v) => {
          const n = v / 255;
          return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        };
        const luminance = (color) => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
        const foreground = parse(getComputedStyle(a).color) || { r: 0, g: 0, b: 0 };
        let background = { r: 255, g: 255, b: 255, a: 1 };
        let node = a.parentElement;
        while (node) {
          const candidate = parse(getComputedStyle(node).backgroundColor);
          if (candidate && candidate.a >= 0.95) { background = candidate; break; }
          node = node.parentElement;
        }
        const fgLum = luminance(foreground);
        const bgLum = luminance(background);
        const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
        return {
          isAnchor: a.tagName === 'A',
          href: a.getAttribute('href'),
          target: a.getAttribute('target'),
          rel: a.getAttribute('rel'),
          label: a.textContent.trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          color: getComputedStyle(a).color,
          background: `rgb(${background.r}, ${background.g}, ${background.b})`,
          contrast: Number(ratio.toFixed(2)),
          theme: document.documentElement.getAttribute('data-theme') || '',
        };
      });
      console.log(`${tag} reference-link:`, JSON.stringify(anchor));
      if (!anchor?.isAnchor) fail(`${tag}: a saved reference link did not render as an anchor on the card`);
      if (anchor?.href !== 'https://www.youtube.com/watch?v=abc123') {
        fail(`${tag}: reference link href is not the saved URL (${anchor?.href})`);
      }
      if (anchor?.target !== '_blank' || !/noopener/.test(anchor?.rel || '') || !/noreferrer/.test(anchor?.rel || '')) {
        fail(`${tag}: reference link is missing target/rel protection (${anchor?.target} / ${anchor?.rel})`);
      }
      if (!/Watch on YouTube/.test(anchor?.label || '')) {
        fail(`${tag}: reference link label did not name YouTube (${anchor?.label})`);
      }
      if ((anchor?.height || 0) < 44) {
        fail(`${tag}: reference link is ${anchor?.width}×${anchor?.height}, below the 44px touch target`);
      }
      if (anchor?.theme !== theme) {
        fail(`${tag}: reference link rendered in the wrong theme (${anchor?.theme || 'unset'})`);
      }
      if ((anchor?.contrast || 0) < 4.5) {
        fail(`${tag}: reference link contrast is ${anchor?.contrast}:1 (${anchor?.color} on ${anchor?.background})`);
      }

      await openConfig();
      await page.fill('#exerciseConfigLink', 'javascript:alert(1)');
      if (!(await page.locator('#exerciseConfigLinkError').isVisible())) {
        fail(`${tag}: javascript: produced no inline error`);
      }
      await page.click('.exercise-config [data-cm="ok"]');
      await page.waitForTimeout(300);
      if (!(await page.locator('.exercise-config').count())) {
        fail(`${tag}: an unsafe reference link closed the sheet as if it had saved`);
      }
      const afterReject = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        return Object.values(s.settings?.exercisePrefs || {}).map((p) => p.link).find(Boolean) || '';
      });
      if (afterReject !== 'https://www.youtube.com/watch?v=abc123') {
        fail(`${tag}: an unsafe link overwrote the stored link (${afterReject})`);
      }
      await page.click('.exercise-config [data-cm="cancel"]');
      await page.waitForTimeout(250);

      await page.reload({ waitUntil: 'networkidle' });
      await enterCockpit(page);
      const persisted = await page.evaluate(() => {
        const a = document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-ex-link');
        const s = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        return {
          link: a ? { href: a.getAttribute('href'), rel: a.getAttribute('rel') } : null,
          prefs: s.settings?.exercisePrefs || null,
        };
      });
      if (persisted?.link?.href !== 'https://www.youtube.com/watch?v=abc123' || !/noopener/.test(persisted?.link?.rel || '')) {
        fail(`${tag}: reference link did not survive reload (${JSON.stringify(persisted)})`);
      }

      // Blank is a deliberate clear and must save without blocking.
      await openConfig();
      await page.fill('#exerciseConfigLink', '');
      await page.click('.exercise-config [data-cm="ok"]');
      await page.waitForTimeout(350);
      const cleared = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('hybrid_engine_v2_state') || '{}');
        return {
          anchor: !!document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-ex-link'),
          links: Object.values(s.settings?.exercisePrefs || {}).map((p) => p.link).filter(Boolean),
          sheetOpen: !!document.querySelector('.exercise-config'),
        };
      });
      if (cleared.sheetOpen || cleared.anchor || cleared.links.length) {
        fail(`${tag}: a blank reference link did not clear cleanly (${JSON.stringify(cleared)})`);
      }
    }

    // ---- layout -------------------------------------------------------------
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) {
      fail(`${tag}: page-level horizontal overflow`);
    }
    const clipped = await page.evaluate(() => [...document.querySelectorAll('.cockpit-set-row')]
      .filter((r) => r.scrollWidth > r.clientWidth + 1).length);
    if (clipped) fail(`${tag}: ${clipped} set rows overflow their own width`);

    if (errors.length) fail(`${tag}: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  failures.forEach((f) => console.error(`FAIL: ${f}`)); process.exit(1);
}
console.log('Set row entry contract passed.');
