// =============================================================================
// LG1 — SET-ENTRY TAP AUDIT (roadmap §17.1)
//
// The row is "Count taps and seconds to log a set, add an exercise mid-session,
// replace an exercise, delete and undo a set. Remove avoidable taps. Never make
// the common path slower." Nothing measured those five flows, so every tap
// budget was a claim.
//
// WHAT IT COUNTS
//   • TAPS are trusted `pointerdown` events, captured at the document. One
//     gesture is one tap: a `<label>` wrapping the ✓ input produces a single
//     pointerdown, and the synthetic `.click()` calls other checks use are
//     ignored (`isTrusted === false`), so the harness can only be driven the
//     way an athlete drives it.
//   • REACH is where the next control sat when the flow started, in screens —
//     reported, because Playwright scrolls a control into view before clicking
//     it and would otherwise hide the cost of a button at the bottom of a long
//     day.
//   • MILLISECONDS are reported, never asserted. This container is much slower
//     than CI and neither is a phone; the roadmap's device timings are `[You]`.
//
// TAP BUDGETS are pinned per flow. Each one is the measured floor, so a future
// change that adds a step fails here instead of shipping quietly. The budgets
// also make the "never slower" rule testable: raising one is a deliberate,
// reviewable edit.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';
import { enterCockpit } from './cockpit-entry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = process.argv.includes('--required');
const runtime = await resolveChromium();
if (!runtime) process.exit(required ? 1 : 0);
const { chromium, executablePath } = runtime;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  try {
    if ((req.url || '').split('?')[0] === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const rel = (req.url || '/') === '/' ? 'index.html'
      : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe path');
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;
const TZ = 'Australia/Sydney';
const STORAGE_KEY = 'hybrid_engine_v2_state';
const VIEWPORT = { width: 390, height: 844 };

// Every budget is the measured floor. See the header.
const BUDGETS = Object.freeze({
  'log a working set': 1,
  'add an exercise mid-session': 2,
  'refuse a duplicate addition': 2,
  'replace an exercise (similar lift)': 2,
  'replace an exercise (full library)': 3,
  'delete a set': 2,
  'undo the deleted set': 1,
});

// A prior Thursday session, archived so its sets are unambiguously "last time".
// The same shape the set-row check uses: the ghosts are what make a one-tap
// tick a real log rather than a blank refusal.
function fixture(theme) {
  const done = (w, r) => ({ w: String(w), r: String(r), c: true });
  return {
    schemaVersion: 5,
    currentWeek: '1',
    activeProgramId: 'hybrid_engine',
    activeActivationId: 'current',
    settings: {
      name: 'Tap', theme, weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon',
      onboardingComplete: true,
    },
    weeks: {
      'arch:old:1': {
        activationId: 'old',
        programId: 'hybrid_engine',
        dates: { thu: '2026-07-16' },
        lifts: {
          thu: {
            'Incline Barbell Press': [done(60, 8), done(62.5, 8), done(65, 6)],
            'Seated DB Shoulder Press': [done(22.5, 10), done(22.5, 10), done(22.5, 9)],
          },
        },
        runs: {}, notes: {}, gymRpe: {}, gymStats: {},
      },
    },
  };
}

const failures = [];
const rows = [];
const fail = (message) => {
  failures.push(message);
  console.log(`FAIL: ${message}`);
};
const check = (condition, message) => { if (!condition) fail(message); };

/** Boot the app with a fresh fixture and open Thursday's cockpit. */
async function openCockpit(browser, { theme = 'dark' } = {}) {
  const context = await createBrowserContext(browser, {
    viewport: VIEWPORT, timezoneId: TZ, colorScheme: theme,
  });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(fixture(theme))]);
  // A Wednesday clock: the cockpit is opened by explicit day choice, and a
  // pinned clock keeps the fixture's Thursday lift day stable on every weekday.
  await context.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
  // The counter exists before any app script, so no early tap is missed.
  await context.addInitScript(() => {
    window.__tapCount = 0;
    document.addEventListener('pointerdown', (event) => {
      if (event.isTrusted) window.__tapCount += 1;
    }, true);
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await enterCockpit(page);
  await page.waitForTimeout(250);
  return { context, page, pageErrors };
}

/**
 * Run one flow and record its honest cost.
 * @param {any} page
 * @param {string} name
 * @param {() => Promise<void>} run
 */
async function measure(page, name, run) {
  await page.evaluate(() => { window.__tapCount = 0; });
  const started = Date.now();
  await run();
  const taps = await page.evaluate(() => window.__tapCount);
  const ms = Date.now() - started;
  const budget = BUDGETS[name];
  rows.push({ name, taps, budget, ms });
  check(taps <= budget, `${name}: ${taps} taps, budget ${budget}`);
  return taps;
}

/** Where a control sits at flow start, in screens down the page. */
const reach = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  const top = box.top + window.scrollY;
  return {
    screens: Number((top / window.innerHeight).toFixed(2)),
    inView: box.top >= 0 && box.bottom <= window.innerHeight,
  };
}, selector);

const storedWeek = (page) => page.evaluate((key) => {
  const state = JSON.parse(localStorage.getItem(key) || '{}');
  return {
    lifts: state.weeks?.['1']?.lifts?.thu || {},
    liftOrder: state.weeks?.['1']?.liftOrder?.thu || [],
  };
}, STORAGE_KEY);

const toastText = (page) => page.evaluate(() => {
  const toast = document.getElementById('sysToast');
  return toast && toast.classList.contains('show') ? toast.textContent.trim() : '';
});

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

try {
  // ── 1. Log a working set ───────────────────────────────────────────────────
  {
    const { context, page, pageErrors } = await openCockpit(browser);
    const card = '.cockpit-exercise[data-liftname="Incline Barbell Press"]';
    const row = `${card} .cockpit-set-row[data-set-index="0"]`;

    const ghost = await page.evaluate((rowSel) => {
      const node = document.querySelector(rowSel);
      return {
        weight: node?.querySelector('.input-weight-node')?.placeholder || '',
        reps: node?.querySelector('.input-reps-node')?.placeholder || '',
        previous: node?.querySelector('.set-prev-col')?.textContent?.trim() || '',
      };
    }, row);
    console.log('log ghost:', JSON.stringify(ghost));
    check(ghost.previous && ghost.previous !== '—', 'log: no PREVIOUS value to log against');

    // Typing the numbers is not a tap. The flow being measured is the tap that
    // RECORDS the set, which must stay one.
    await page.fill(`${row} .input-weight-node`, '60');
    await page.fill(`${row} .input-reps-node`, '8');
    await measure(page, 'log a working set', async () => {
      await page.click(`${row} .gym-check`);
    });
    await page.waitForTimeout(350);

    const stored = (await storedWeek(page)).lifts['Incline Barbell Press']?.[0];
    check(stored?.c === true, `log: the ticked set did not reach state (${JSON.stringify(stored)})`);
    check(Number(stored?.w) > 0 && Number(stored?.r) > 0,
      `log: a one-tap log stored an empty set (${JSON.stringify(stored)})`);
    check(pageErrors.length === 0, `log: page errors: ${pageErrors.join(' | ')}`);
    await context.close();
  }

  // ── 2 + 3. Add an exercise, and refuse a duplicate addition ────────────────
  {
    const { context, page, pageErrors } = await openCockpit(browser);
    const addButton = '[data-action="open-add-exercise"]';
    console.log('add reach:', JSON.stringify(await reach(page, addButton)));

    let picked = '';
    await measure(page, 'add an exercise mid-session', async () => {
      await page.click(addButton);
      await page.waitForSelector('#addExerciseModal.active');
      picked = await page.getAttribute('#elList [data-action="el-pick"]', 'data-exname');
      await page.click('#elList [data-action="el-pick"]');
      await page.waitForTimeout(450);
    });
    await page.waitForTimeout(350);

    let week = await storedWeek(page);
    check(Array.isArray(week.lifts[picked]), `add: "${picked}" did not reach the day`);
    const addedCard = `.cockpit-exercise[data-liftname="${picked.replaceAll('"', '\\"')}"]`;
    const addedState = await page.evaluate((sel) => {
      const card = document.querySelector(sel);
      return card ? {
        present: true,
        expanded: !card.classList.contains('collapsed'),
        inView: (() => { const b = card.getBoundingClientRect(); return b.top >= 0 && b.bottom <= (window.innerHeight + 40); })(),
      } : { present: false };
    }, addedCard);
    console.log('add result:', JSON.stringify(addedState));
    check(addedState.present, 'add: the added exercise has no card');
    // The pick must SHOW what it added: expanded, and on screen.
    check(addedState.expanded, 'add: the added exercise card was left collapsed');
    check(addedState.inView, 'add: the added exercise card was left off screen');

    const before = Object.keys(week.lifts).length;
    await measure(page, 'refuse a duplicate addition', async () => {
      await page.click(addButton);
      await page.waitForSelector('#addExerciseModal.active');
      // The catalogue row for the lift just added is still first in the list.
      await page.click('#elList [data-action="el-pick"]');
      await page.waitForTimeout(250);
    });
    await page.waitForTimeout(200);
    week = await storedWeek(page);
    check(Object.keys(week.lifts).length === before, 'duplicate add: the day gained a second entry');
    const toast = await toastText(page);
    console.log('duplicate toast:', JSON.stringify(toast));
    check(/already in today's session/i.test(toast),
      `duplicate add: no honest message (toast "${toast}")`);
    check(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
    await context.close();
  }

  // ── 4. Replace an exercise with a similar lift ─────────────────────────────
  {
    const { context, page, pageErrors } = await openCockpit(browser);
    const card = '.cockpit-exercise[data-liftname="Incline Barbell Press"]';
    const swapButton = `${card} [data-action="swap-exercise"]`;
    console.log('swap reach:', JSON.stringify(await reach(page, swapButton)));
    const before = (await storedWeek(page)).lifts['Incline Barbell Press'];

    let replacement = '';
    await measure(page, 'replace an exercise (similar lift)', async () => {
      await page.click(swapButton);
      await page.waitForSelector('#swapExerciseModal.active');
      replacement = await page.getAttribute('#swapList [data-action="swap-pick"]', 'data-exname');
      await page.click('#swapList [data-action="swap-pick"]');
      await page.waitForTimeout(450);
    });

    const week = await storedWeek(page);
    check(!week.lifts['Incline Barbell Press'], 'swap: the old lift still owns its sets');
    check(Array.isArray(week.lifts[replacement]), `swap: "${replacement}" did not receive the sets`);
    check(week.lifts[replacement]?.length === before?.length,
      `swap: set count changed ${before?.length} → ${week.lifts[replacement]?.length}`);
    check(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
    await context.close();
  }

  // ── 5. Replace an exercise through the full library ────────────────────────
  // This is the L-F6 path: the swap sheet used to claim a full list "below"
  // that did not exist, so a custom lift (no movement pattern, therefore no
  // direct substitutes) could not be replaced from the UI at all.
  {
    const { context, page, pageErrors } = await openCockpit(browser);
    const custom = 'Sled Drag Test';

    // Create the custom lift through the real add flow (not measured here).
    await page.click('[data-action="open-add-exercise"]');
    await page.waitForSelector('#addExerciseModal.active');
    await page.fill('#customExerciseTextInput', custom);
    await page.click('[data-action="confirm-add-exercise"]');
    await page.waitForTimeout(500);

    const customCard = `.cockpit-exercise[data-liftname="${custom}"]`;
    check(await page.locator(customCard).count() === 1,
      'swap library: the custom lift was not added, so the no-substitute case cannot be proven');

    // The custom lift has no movement family, so the sheet must state that
    // honestly and still offer the library.
    await page.click(`${customCard} [data-action="swap-exercise"]`);
    await page.waitForSelector('#swapExerciseModal.active');
    const sheet = await page.evaluate(() => ({
      text: document.getElementById('swapList')?.textContent || '',
      browse: !!document.querySelector('#swapList [data-action="swap-browse-all"]'),
    }));
    console.log('custom swap sheet:', JSON.stringify({ browse: sheet.browse, copy: sheet.text.trim().slice(0, 90) }));
    check(sheet.browse, 'swap library: the swap sheet has no route to the full library');
    check(!/full list below/i.test(sheet.text),
      'swap library: the sheet still promises a list "below" that is not there');
    check(/no similar exercise/i.test(sheet.text),
      'swap library: a lift with no substitutes is not explained honestly');
    await page.click('[data-action="close-swap-exercise"]');
    await page.waitForTimeout(300);

    const before = (await storedWeek(page)).lifts[custom];

    // The measured flow starts from the expanded custom card: expand it the way
    // the athlete does (the add flow leaves it open, but a reload could not).
    const expanded = await page.evaluate((sel) =>
      !document.querySelector(sel)?.classList.contains('collapsed'), customCard);
    if (!expanded) {
      await page.click(`${customCard} [data-action="toggle-accordion"]`);
      await page.waitForTimeout(250);
    }

    let replacement = '';
    await measure(page, 'replace an exercise (full library)', async () => {
      await page.click(`${customCard} [data-action="swap-exercise"]`);
      await page.waitForSelector('#swapExerciseModal.active');
      await page.click('#swapList [data-action="swap-browse-all"]');
      await page.waitForSelector('#addExerciseModal.active');
      replacement = await page.getAttribute('#elList [data-action="el-pick"]', 'data-exname');
      await page.click('#elList [data-action="el-pick"]');
      await page.waitForTimeout(450);
    });

    const week = await storedWeek(page);
    check(!week.lifts[custom], 'swap library: the custom lift still owns its sets');
    check(Array.isArray(week.lifts[replacement]),
      `swap library: "${replacement}" did not receive the sets`);
    check(week.lifts[replacement]?.length === before?.length,
      `swap library: set count changed ${before?.length} → ${week.lifts[replacement]?.length}`);

    const title = await page.evaluate(() =>
      !document.getElementById('addExerciseModal')?.classList.contains('active'));
    check(title, 'swap library: the library modal stayed open after the pick');
    check(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
    await context.close();
  }

  // ── 6 + 7. Delete a set, then undo it ──────────────────────────────────────
  {
    const { context, page, pageErrors } = await openCockpit(browser);
    const card = '.cockpit-exercise[data-liftname="Incline Barbell Press"]';
    const before = (await storedWeek(page)).lifts['Incline Barbell Press'];

    await measure(page, 'delete a set', async () => {
      await page.click(`${card} .cockpit-set-row[data-set-index="0"] .set-num-lbl`);
      await page.waitForSelector('#setSheet.active');
      // The destructive control must be reachable inside the sheet's own
      // viewport: a Remove that needs a scroll is a cost the tap count hides.
      const removeInView = await page.evaluate(() => {
        const btn = document.querySelector('[data-action="set-sheet-remove"]');
        const sheet = document.getElementById('setSheet');
        if (!btn || !sheet) return false;
        const box = btn.getBoundingClientRect();
        const frame = sheet.getBoundingClientRect();
        return box.top >= frame.top && box.bottom <= frame.bottom;
      });
      check(removeInView, 'delete: "Remove set" is outside the visible sheet');
      await page.click('[data-action="set-sheet-remove"]');
      await page.waitForTimeout(350);
    });

    const after = (await storedWeek(page)).lifts['Incline Barbell Press'];
    check(after?.length === before.length - 1,
      `delete: expected ${before.length - 1} sets, found ${after?.length}`);

    await measure(page, 'undo the deleted set', async () => {
      await page.click('#setUndoBtn');
      await page.waitForTimeout(350);
    });
    const restored = (await storedWeek(page)).lifts['Incline Barbell Press'];
    check(restored?.length === before.length,
      `undo: expected ${before.length} sets, found ${restored?.length}`);
    check(String(restored?.[0]?.w) === String(before[0]?.w) && String(restored?.[0]?.r) === String(before[0]?.r),
      'undo: the restored set does not match the removed one');
    check(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

// ── Evidence ────────────────────────────────────────────────────────────────
console.log('\nLG1 tap audit (390×844) — taps | budget | ms');
for (const row of rows) {
  console.log(`  ${row.name.padEnd(40)} ${String(row.taps).padStart(2)} | ${String(row.budget).padStart(2)} | ${String(row.ms).padStart(5)} ms`);
}

if (failures.length) {
  console.error(`\n${failures.length} tap-audit failure(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nOK: ${rows.length} flows within their tap budgets.`);
}
