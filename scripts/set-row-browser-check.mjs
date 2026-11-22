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

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const failures = [];
const fail = (m) => failures.push(m);
try {
  for (const [width, theme] of [[320, 'dark'], [390, 'light'], [412, 'dark']]) {
    const tag = `${width}px/${theme}`;
    const context = await createBrowserContext(browser, { viewport: { width, height: 900 }, timezoneId: TZ, colorScheme: theme });
    await context.addInitScript(([k, v]) => localStorage.setItem(k, v), ['hybrid_engine_v2_state', JSON.stringify(fixture(theme))]);
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
