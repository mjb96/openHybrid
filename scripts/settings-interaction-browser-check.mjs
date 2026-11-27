// =============================================================================
// SETTINGS INTERACTION BROWSER CHECK
//
// Three defects that only a real panel can prove:
//   1. Changing a control used to re-render the page at scrollTop 0 and drop
//      focus to <body>; the athlete had to re-find the switch on a long page.
//   2. A deep link / search result opened the right page but compared its anchor
//      slug with the registry KEY, so it never scrolled to the row.
//   3. Enter on the Cancel button of a prompt submitted it (a typed "DELETE"
//      followed by Enter on Cancel wiped data).
//
// Also asserts the closed panel starts inert.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await resolveChromium();
if (!runtime) process.exit(process.argv.includes('--required') ? 1 : 0);
const { chromium, executablePath } = runtime;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    if ((req.url || '').split('?')[0] === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const TODAY = '2026-11-25';
const CLOCK = Date.parse(`${TODAY}T09:00:00+11:00`);

const fixture = {
  schemaVersion: 18, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'settings_check',
  settings: {
    name: 'Settings Athlete', theme: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon',
    onboardingComplete: true, modules: { running: true, fasting: true, health: true, recovery: true },
    equipmentTier: 'full_gym', equipment: ['barbell', 'dumbbells', 'cable', 'machine', 'pullup_bar'],
    equipmentProfiles: [], exercisePrefs: {}, ui: {}, livePR: true, showPlateHints: false,
  },
  weeks: { '1': { activationId: 'settings_check', dates: {} } },
};

const failures = [];
const ok = (condition, label) => {
  if (condition) console.log(`  ok · ${label}`);
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};

async function openPage(page, contextId) {
  await page.waitForSelector('#settingsOverlay.active', { timeout: 4000 });
  await page.evaluate((ctx) => {
    const row = [...document.querySelectorAll('#settingsPageHost .s-row[data-context]')]
      .find((r) => r.getAttribute('data-context') === ctx);
    row?.click();
  }, contextId);
  await page.waitForSelector('#settingsPageHost .s-page', { timeout: 4000 });
  await page.waitForTimeout(300);
}

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  for (const width of [390, 320]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 844 }, colorScheme: 'dark' });
    await context.addInitScript(([key, value]) => {
      localStorage.setItem(key, value);
      window.__settingsCheckSurvived = true;
    }, [STORAGE_KEY, JSON.stringify(fixture)]);
    await context.addInitScript(pinClock, CLOCK);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (m) => { if (m.type() === 'error' && !/frame-ancestors|net::ERR_/.test(m.text())) errors.push(m.text()); });

    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // The closed route must be inert as well as aria-hidden.
    ok(await page.evaluate(() => document.getElementById('settingsOverlay')?.hasAttribute('inert')), `${width}px · closed Settings route is inert`);

    await page.evaluate(() => document.querySelector('[data-action="open-settings"]')?.click());
    await page.evaluate(() => document.querySelector('[data-action="open-settings"]')?.click());
    await page.waitForTimeout(450);
    await page.waitForSelector('#settingsOverlay.active', { timeout: 4000 });
    ok(await page.evaluate(() => !document.getElementById('settingsOverlay')?.hasAttribute('inert')), `${width}px · open Settings route is not inert`);

    await openPage(page, 'training.workout');

    // ── 0. Controls do not paint over their label at phone width ───────────
    const controls = await page.evaluate(() => [...document.querySelectorAll('#settingsPageHost .s-row')]
      .map((row) => {
        const control = row.querySelector('.s-row__control');
        if (!control) return null;
        const rowRect = row.getBoundingClientRect();
        const controlRect = control.getBoundingClientRect();
        const labelRect = row.querySelector('.s-row__copy')?.getBoundingClientRect();
        return {
          key: row.getAttribute('data-setting-key') || row.getAttribute('data-context') || '?',
          overflow: controlRect.right > rowRect.right + 1,
          overlapsLabel: labelRect ? controlRect.left < labelRect.right - 1 && controlRect.top < labelRect.bottom - 1 : false,
        };
      })
      .filter(Boolean));
    ok(controls.every((row) => !row.overflow), `${width}px · no settings control overflows its row (${JSON.stringify(controls.filter((r) => r.overflow))})`);
    ok(controls.every((row) => !row.overlapsLabel), `${width}px · no settings control paints over its label (${JSON.stringify(controls.filter((r) => r.overlapsLabel))})`);

    // ── 1. A control change keeps scroll and focus ─────────────────────────
    const before = await page.evaluate(() => {
      const host = document.getElementById('settingsPageHost');
      const row = host.querySelector('[data-setting-key="livePR"]');
      row?.scrollIntoView({ block: 'center' });
      return {
        scroll: host.scrollTop,
        checked: !!row?.querySelector('input[type="checkbox"]')?.checked,
        key: row?.getAttribute('data-setting-key') || null,
      };
    });
    ok(!!before.key, `${width}px · the live-PR switch is on the Workout page`);
    await page.evaluate(() => {
      const input = document.querySelector('[data-setting-key="livePR"] input[type="checkbox"]');
      input?.focus();
      input?.click();
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const host = document.getElementById('settingsPageHost');
      const row = host.querySelector('[data-setting-key="livePR"]');
      const active = document.activeElement;
      return {
        scroll: host.scrollTop,
        checked: !!row?.querySelector('input[type="checkbox"]')?.checked,
        activeKey: active?.closest?.('[data-setting-key]')?.getAttribute('data-setting-key') || null,
      };
    });
    ok(after.checked !== before.checked, `${width}px · the switch changed`);
    ok(Math.abs(after.scroll - before.scroll) <= 4, `${width}px · the page stayed at the same scroll (${before.scroll} → ${after.scroll})`);
    ok(after.activeKey === 'livePR', `${width}px · focus returned to the control (got ${after.activeKey})`);

    // ── 2. A deep link reaches the exact row ───────────────────────────────
    await page.evaluate(() => { location.hash = '#/settings/workout/live-pr'; });
    await page.waitForTimeout(350);
    const linked = await page.evaluate(() => {
      const host = document.getElementById('settingsPageHost');
      const row = host.querySelector('[data-setting-key="livePR"]');
      if (!row) return { found: false };
      const hostRect = host.getBoundingClientRect();
      const rect = row.getBoundingClientRect();
      return {
        found: true,
        pulsed: row.classList.contains('is-pulse'),
        visible: rect.bottom > hostRect.top && rect.top < hostRect.bottom,
      };
    });
    ok(linked.found, `${width}px · the deep link opened the page holding the setting`);
    ok(linked.pulsed, `${width}px · the deep link pulsed the exact row`);
    ok(linked.visible, `${width}px · the deep link scrolled the row into view`);

    // ── 3. Enter on Cancel cancels the prompt ──────────────────────────────
    await page.evaluate(() => { location.hash = '#/settings'; });
    await page.waitForTimeout(300);
    await openPage(page, 'data.backup');
    await page.evaluate(() => document.querySelector('[data-action="reset-all-data"]')?.click());
    await page.waitForSelector('.cmodal-overlay [data-cm="ok"]', { timeout: 4000 });
    await page.click('.cmodal-overlay [data-cm="ok"]');
    await page.waitForSelector('.cmodal-overlay [data-cm="input"]', { timeout: 4000 });
    await page.fill('.cmodal-overlay [data-cm="input"]', 'DELETE');
    await page.focus('.cmodal-overlay [data-cm="cancel"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1600);
    const survived = await page.evaluate(() => ({
      marker: window.__settingsCheckSurvived === true,
      state: !!localStorage.getItem('hybrid_engine_v2_state'),
      promptOpen: !!document.querySelector('.cmodal-overlay [data-cm="input"]'),
    }));
    ok(survived.marker, `${width}px · Enter on Cancel did not reload the app`);
    ok(survived.state, `${width}px · Enter on Cancel did not wipe stored data`);
    ok(!survived.promptOpen, `${width}px · Enter on Cancel closed the prompt`);

    ok(errors.length === 0, `${width}px · no page errors (${errors.join(' | ')})`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  failures.forEach((message) => console.error(`FAIL: ${message}`));
  process.exit(1);
}
console.log('settings-interaction-browser-check: PASS — scroll/focus, deep links and Enter-on-Cancel.');
