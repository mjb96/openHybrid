// =============================================================================
// REST TIMER + ROW ACTION PROMINENCE — roadmap Phase 2A
//
//   "Keep rest timing attached to the active exercise/set, with obvious
//    pause/skip/adjust controls."
//   "Completion is the strongest row action."
//   "Make add, swap, reorder, superset, warm-up and plate-math actions
//    contextual instead of equally prominent."
//
// The pause assertions matter most. The bar rendered a decorative "⏸ REST"
// label with no pause behind it — a control that looks real and does nothing
// teaches you to distrust the whole bar. This drives the real timer: pause it,
// prove the clock stops, resume it, prove it moves again.
//
// It also pins the thing pause could most easily break: a hold leaking into the
// next set, so that set's rest never counts down at all.
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

const fixture = (theme) => ({
  schemaVersion: 5, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'current',
  settings: { name: 'Rest', theme, weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true },
  weeks: {},
});

/** Log the open card's set at `index`, which is what starts a rest period. */
const logSet = (page, index) => page.evaluate((i) => {
  const card = document.querySelector('.cockpit-exercise:not(.collapsed)');
  const row = card?.querySelectorAll('.cockpit-set-row')[i];
  const w = row?.querySelector('.input-weight-node');
  const r = row?.querySelector('.input-reps-node');
  if (w) { w.value = '60'; w.dispatchEvent(new Event('input', { bubbles: true })); }
  if (r) { r.value = '8'; r.dispatchEvent(new Event('input', { bubbles: true })); }
  row?.querySelector('.gym-check')?.click();
}, index);

const readTimer = (page) => page.evaluate(() => {
  const bar = document.getElementById('cockpitTimerBar');
  const btn = document.getElementById('restPauseBtn');
  return {
    active: !!bar?.classList.contains('active'),
    paused: !!bar?.classList.contains('rest-paused'),
    clock: document.getElementById('cockpitTimerClock')?.textContent?.trim() || '',
    label: btn?.textContent?.trim() || '',
    pressed: btn?.getAttribute('aria-pressed') || '',
    // Attached to the exercise being worked, not floating over the page.
    insideCard: !!bar?.closest('.cockpit-exercise'),
    btnHeight: btn ? Math.round(btn.getBoundingClientRect().height) : 0,
  };
});

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

    // ---- the tick is the ONLY completion action ---------------------------
    // The row used to carry a second, louder completion button ("Log S1").
    // That is gone: the set number now opens the set sheet, and the check is
    // the single way to finish a set. A quiet number must still be a real 44px
    // target, because it is the only route to set type/load/rest/note.
    const weight = await page.evaluate(() => {
      const row = document.querySelector('.cockpit-exercise:not(.collapsed) .cockpit-set-row');
      const number = row?.querySelector('.set-num-lbl');
      const check = row?.querySelector('.gym-check');
      const px = (v) => parseFloat(String(v).replace('px', '')) || 0;
      const ns = number && getComputedStyle(number);
      const cs = check && getComputedStyle(check);
      return {
        numberAction: number?.getAttribute('data-action') || '',
        numberBorder: ns ? px(ns.borderTopWidth) : 0,
        checkBorder: cs ? px(cs.borderTopWidth) : 0,
        numberFilled: ns ? !/^rgba\(0, 0, 0, 0\)$|transparent/.test(ns.backgroundColor) : false,
        numberH: number ? Math.round(number.getBoundingClientRect().height) : 0,
        numberW: number ? Math.round(number.getBoundingClientRect().width) : 0,
        quickLogButtons: row ? row.querySelectorAll('[data-action="quick-log"]').length : -1,
      };
    });
    console.log(`${tag} prominence:`, JSON.stringify(weight));
    if (weight.numberAction !== 'open-set-sheet') {
      fail(`${tag}: the set number should open the set sheet, found data-action="${weight.numberAction}"`);
    }
    if (weight.quickLogButtons !== 0) {
      fail(`${tag}: a second completion button is back (${weight.quickLogButtons} quick-log controls)`);
    }
    if (weight.numberFilled) fail(`${tag}: the set number is filled — it outshouts the completion tick`);
    if (weight.checkBorder <= weight.numberBorder) {
      fail(`${tag}: the completion tick (${weight.checkBorder}px border) is not drawn more strongly than the set number (${weight.numberBorder}px)`);
    }
    if (weight.numberH < 44 || weight.numberW < 44) {
      fail(`${tag}: the set number fell to ${weight.numberW}×${weight.numberH}px, below the 44px target`);
    }

    // ---- + Warmup is contextual --------------------------------------------
    // Visibility, not presence: the control is hidden by CSS, so it stays in
    // the DOM. Counting nodes would pass whether or not it was ever hidden.
    const warmupVisible = () => page.evaluate(() => {
      const btn = document.querySelector('.cockpit-exercise:not(.collapsed) [data-action="append-warmup-set"]');
      return !!btn && btn.getBoundingClientRect().height > 0;
    });
    const dropVisible = () => page.evaluate(() => {
      const btn = document.querySelector('.cockpit-exercise:not(.collapsed) [data-action="append-drop-set"]');
      return !!btn && btn.getBoundingClientRect().height > 0;
    });
    if (!await warmupVisible()) fail(`${tag}: + Warmup hidden before any work is logged, when it is exactly what you want`);
    if (await dropVisible()) fail(`${tag}: + Drop offered before any working set exists`);

    // ---- logging a set starts a rest, attached to the exercise -------------
    await logSet(page, 0);
    await page.waitForTimeout(600);
    let t = await readTimer(page);
    console.log(`${tag} rest-start:`, JSON.stringify(t));
    if (!t.active) {
      // Report the console errors BEFORE bailing — a dead render shows up here
      // as a dozen confusing assertion failures unless its cause comes with it.
      fail(`${tag}: no rest timer started after logging a set`);
      if (errors.length) fail(`${tag}: browser errors: ${errors.join(' | ')}`);
      await context.close();
      continue;
    }
    if (!t.insideCard) fail(`${tag}: the rest bar is not attached to the active exercise card`);
    if (t.label !== '⏸ REST') fail(`${tag}: unexpected rest label "${t.label}"`);
    if (t.btnHeight < 44) fail(`${tag}: the pause control is ${t.btnHeight}px, below the 44px target`);

    if (await warmupVisible()) fail(`${tag}: + Warmup still offered at equal prominence after a working set was logged`);
    if (!await dropVisible()) fail(`${tag}: + Drop missing after a working set was logged`);

    // ---- a reload resumes the same rest ------------------------------------
    // The bar is pure wall-clock state. Losing it on reload meant the athlete
    // had to guess the remaining time, which is the opposite of a rest timer.
    const beforeReload = t.clock;
    // Spend real time resting before the reload, so the assertion can tell
    // "resumed from an absolute end time" apart from "restarted the clock".
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: 'load' });
    await enterCockpit(page);
    await page.waitForSelector('#cockpitTimerBar.active');
    const restored = await readTimer(page);
    console.log(`${tag} reload:`, JSON.stringify({ beforeReload, after: restored.clock, paused: restored.paused }));
    if (!restored.active) fail(`${tag}: reloading lost the running rest timer`);
    if (restored.paused) fail(`${tag}: the restored rest came back paused`);
    const clockSeconds = (clock) => {
      const [m, sec] = String(clock).split(':').map((n) => parseInt(n, 10) || 0);
      return (m * 60) + sec;
    };
    if (clockSeconds(restored.clock) >= clockSeconds(beforeReload)) {
      fail(`${tag}: the restored rest ignored time spent reloading (${beforeReload} -> ${restored.clock})`);
    }
    if (clockSeconds(restored.clock) < clockSeconds(beforeReload) - 6) {
      fail(`${tag}: the restored rest lost more time than the reload took (${beforeReload} -> ${restored.clock})`);
    }
    await page.waitForTimeout(1500);
    if ((await readTimer(page)).clock === restored.clock) {
      fail(`${tag}: the restored rest never resumed counting`);
    }

    // ---- pause actually holds the clock ------------------------------------
    await page.click('#restPauseBtn');
    await page.waitForTimeout(150);
    t = await readTimer(page);
    if (!t.paused) fail(`${tag}: pressing pause did not put the bar in a paused state`);
    if (t.pressed !== 'true') fail(`${tag}: paused but aria-pressed is "${t.pressed}"`);
    if (!/paused/i.test(t.label)) fail(`${tag}: paused but the label still reads "${t.label}"`);

    const held = t.clock;
    await page.waitForTimeout(1800);
    const stillHeld = (await readTimer(page)).clock;
    console.log(`${tag} pause: ${held} -> ${stillHeld} after 1.8s`);
    if (stillHeld !== held) fail(`${tag}: the clock kept running while paused (${held} -> ${stillHeld})`);

    // ---- resume moves it again ---------------------------------------------
    await page.click('#restPauseBtn');
    await page.waitForTimeout(1600);
    t = await readTimer(page);
    console.log(`${tag} resume:`, JSON.stringify({ clock: t.clock, paused: t.paused }));
    if (t.paused) fail(`${tag}: still paused after pressing resume`);
    if (t.clock === stillHeld) fail(`${tag}: the clock did not resume counting (stuck at ${t.clock})`);

    // ---- a hold must not leak into the next set ----------------------------
    await page.click('#restPauseBtn');           // hold it again
    await page.waitForTimeout(150);
    await logSet(page, 1);                        // next set starts a new rest
    await page.waitForTimeout(300);
    t = await readTimer(page);
    const afterNew = t.clock;
    await page.waitForTimeout(1600);
    const movedOn = (await readTimer(page)).clock;
    console.log(`${tag} next-set:`, JSON.stringify({ paused: t.paused, afterNew, movedOn }));
    if (t.paused) fail(`${tag}: the next set's rest started already paused`);
    if (movedOn === afterNew) fail(`${tag}: the next set's rest never counted down (stuck at ${afterNew})`);

    // ---- Done ends it -------------------------------------------------------
    await page.click('[data-action="dismiss-rest"]');
    await page.waitForTimeout(250);
    t = await readTimer(page);
    if (t.active) fail(`${tag}: Done did not dismiss the rest timer`);
    if (t.paused) fail(`${tag}: dismissed but still flagged paused`);

    // ---- + Drop seeds a lighter drop row -----------------------------------
    // The shortcut belongs to the set it follows: it must not appear before
    // work, and it must copy the shape/reps while discounting only a free
    // weight. A 20% drop is a starting point, never a hidden prescription.
    const loggedCard = page.locator('.cockpit-exercise.has-logged-work').first();
    if (await loggedCard.evaluate((card) => card.classList.contains('collapsed'))) {
      await loggedCard.locator('.cockpit-header-clickzone').click();
    }
    const dropBtn = loggedCard.locator('[data-action="append-drop-set"]');
    const dropBtnHeight = await dropBtn.evaluate((btn) => Math.round(btn.getBoundingClientRect().height));
    if (dropBtnHeight < 44) fail(`${tag}: + Drop is ${dropBtnHeight}px, below the 44px target`);
    await dropBtn.click();
    await loggedCard.locator('.cockpit-set-row.type-dropset').waitFor();
    const drop = await loggedCard.evaluate((card) => {
      const row = card.querySelector('.cockpit-set-row.type-dropset');
      const weight = row?.querySelector('.input-weight-node');
      return {
        weight: parseFloat(weight?.value || '0'),
        pill: row?.getAttribute('data-set-type') || '',
        label: row?.querySelector('.set-num-lbl')?.textContent?.trim() || '',
      };
    });
    console.log(`${tag} drop:`, JSON.stringify(drop));
    if (!(drop.weight > 0)) fail(`${tag}: the seeded drop row has no weight`);
    if (!(drop.weight < 60)) fail(`${tag}: the seeded drop row (${drop.weight}) is not lighter than the source set`);
    if (drop.pill !== 'D' || drop.label !== 'D') fail(`${tag}: the seeded row is not marked as a drop set (${JSON.stringify(drop)})`);

    // ---- a drop row never starts a rest / advances a round -----------------
    // Global rule (not just circuits): a drop is part of the set just done.
    const dropRow = loggedCard.locator('.cockpit-set-row.type-dropset');
    await dropRow.locator('.gym-check').click();
    await page.waitForTimeout(350);
    let dropState = await readTimer(page);
    if (dropState.active) fail(`${tag}: ticking a drop row started a rest`);

    // Untick so the circuit round test can use the same row from a clean state.
    await dropRow.locator('.gym-check').click();
    await page.waitForTimeout(200);

    const pair = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.cockpit-exercise')];
      const first = cards.find((card) => card.classList.contains('has-logged-work'));
      const second = cards.find((card) => card !== first && card.getAttribute('data-liftname'));
      return {
        first: first?.getAttribute('data-liftname') || '',
        second: second?.getAttribute('data-liftname') || '',
      };
    });
    if (!pair.first || !pair.second) {
      fail(`${tag}: could not find two exercises to form a circuit`);
    } else {
      await page.evaluate((name) => {
        const card = [...document.querySelectorAll('.cockpit-exercise')]
          .find((candidate) => candidate.getAttribute('data-liftname') === name);
        card?.querySelector('[data-action="show-ss-panel"]')?.click();
      }, pair.first);
      await page.waitForSelector('.ss-link-panel');
      const joined = await page.evaluate((partner) => {
        const button = [...document.querySelectorAll('.ss-link-panel [data-action="link-superset"]')]
          .find((candidate) => candidate.getAttribute('data-partner') === partner);
        if (!button) return false;
        button.click();
        return true;
      }, pair.second);
      if (!joined) fail(`${tag}: the circuit panel did not offer the partner`);
      await page.waitForSelector('.superset-group');
      await page.waitForTimeout(250);

      const progressBefore = await page.evaluate(() => document.querySelector('.superset-group-progress')?.textContent?.trim() || '');
      await page.evaluate((name) => {
        const card = [...document.querySelectorAll('.cockpit-exercise')]
          .find((candidate) => candidate.getAttribute('data-liftname') === name);
        card?.querySelector('.cockpit-set-row.type-dropset .gym-check')?.click();
      }, pair.first);
      await page.waitForTimeout(400);
      const circuitDrop = await page.evaluate(() => ({
        active: !!document.getElementById('cockpitTimerBar')?.classList.contains('active'),
        complete: !!document.querySelector('.superset-group')?.classList.contains('is-complete'),
        progress: document.querySelector('.superset-group-progress')?.textContent?.trim() || '',
      }));
      console.log(`${tag} drop-in-circuit:`, JSON.stringify({ progressBefore, ...circuitDrop }));
      if (circuitDrop.active) fail(`${tag}: ticking a drop row in a circuit started a rest`);
      if (circuitDrop.complete) fail(`${tag}: a drop row marked the circuit complete`);
      if (circuitDrop.progress !== progressBefore) {
        fail(`${tag}: a drop row advanced the circuit round (${progressBefore} -> ${circuitDrop.progress})`);
      }
    }

    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) {
      fail(`${tag}: page-level horizontal overflow`);
    }
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
console.log('Rest timer + row action contract passed.');
