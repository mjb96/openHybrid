// =============================================================================
// SETTINGS SCROLL BROWSER CHECK
//
// Regression guard for the defect that froze every Settings detail page: the
// page body (.s-page__body) was a scroll container with no overflow AND
// `overscroll-behavior: contain`, so it swallowed the gesture instead of
// chaining it to the panel host (.settings-body). Programmatic scrollTop still
// worked, which is why no unit test and no existing check saw it — only a real
// wheel/touch gesture at a phone viewport does.
//
// This drives the real panel and asserts a REAL wheel gesture moves the page.
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
  schemaVersion: 17, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'scroll_check',
  settings: {
    name: 'Scroll Athlete', theme: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon',
    onboardingComplete: true, modules: { running: true, fasting: true, health: true, recovery: true },
    equipmentTier: 'full_gym', equipment: ['barbell', 'dumbbells', 'cable', 'machine', 'pullup_bar'],
    equipmentProfiles: [], exercisePrefs: {}, ui: {},
  },
  weeks: { '1': { activationId: 'scroll_check', dates: {} } },
};

const failures = [];
const ok = (condition, label) => {
  if (condition) console.log(`  ok · ${label}`);
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};

/** Open Settings then one page row, and return the panel host. */
async function openPage(page, context) {
  await page.evaluate(() => document.querySelector('[data-action="open-settings"]')?.click());
  await page.waitForTimeout(450);
  await page.evaluate((ctx) => {
    const row = [...document.querySelectorAll('#settingsPageHost .s-row[data-context]')]
      .find((r) => r.getAttribute('data-context') === ctx);
    row?.click();
  }, context);
  await page.waitForTimeout(500);
}

/** A real wheel gesture over the middle of the panel; returns the scroll delta. */
async function wheelDelta(page) {
  const before = await page.evaluate(() => document.getElementById('settingsPageHost').scrollTop);
  await page.mouse.move(195, 520);
  await page.mouse.wheel(0, 320);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => document.getElementById('settingsPageHost').scrollTop);
  return { before, after, delta: after - before };
}

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  for (const width of [390, 320]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 844 }, colorScheme: 'dark' });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(fixture)]);
    await context.addInitScript(pinClock, CLOCK);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (m) => { if (m.type() === 'error' && !/frame-ancestors|net::ERR_/.test(m.text())) errors.push(m.text()); });

    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Equipment is the tallest page in the panel; Data & backup is the other
    // long one, so the guard covers more than one page shape.
    for (const [label, contextId] of [['Equipment', 'once.equipment'], ['Data & backup', 'data.backup']]) {
      await openPage(page, contextId);
      const metrics = await page.evaluate(() => {
        const host = document.getElementById('settingsPageHost');
        return { ch: host.clientHeight, sh: host.scrollHeight, hasPage: !!host.querySelector('.s-page') };
      });
      ok(metrics.hasPage, `${width}px · ${label} renders a settings page`);
      ok(metrics.sh > metrics.ch + 4, `${width}px · ${label} has content below the fold (${metrics.sh} > ${metrics.ch})`);
      const first = await wheelDelta(page);
      ok(first.delta > 4, `${width}px · a real wheel gesture scrolls ${label} (moved ${Math.round(first.delta)}px)`);
      ok(first.after > 0, `${width}px · ${label} is not stuck at the top`);

      const collapsed = await page.evaluate(() => document.querySelector('.s-page')?.classList.contains('is-scrolled'));
      ok(collapsed, `${width}px · ${label} collapses its page title once scrolled`);

      // Back to the root for the next page.
      await page.evaluate(() => document.querySelector('[data-action="back-to-settings"]')?.click());
      await page.waitForTimeout(400);
    }

    ok(errors.length === 0, `${width}px · no console errors (${errors.slice(0, 2).join(' | ')})`);
    await context.close();
  }
} catch (error) {
  failures.push(String(error?.message || error));
  console.error(error);
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\nsettings-scroll-browser-check: FAIL (${failures.length})`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('\nsettings-scroll-browser-check: PASS — a real wheel gesture scrolls every Settings detail page.');
