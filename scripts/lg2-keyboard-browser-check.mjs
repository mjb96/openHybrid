// =============================================================================
// LG2 — keyboard-safe logging fields
//
// A real Chromium check for the two promises: a focused numeric field stays
// above the on-screen keyboard, and the per-set sheet is capped by the visible
// viewport rather than 100vh. The keyboard is simulated by shrinking the
// viewport, which is exactly what visualViewport reports when it opens.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';
import { enterCockpit } from './cockpit-entry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html'
      : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const state = {
  schemaVersion: 17, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act',
  weekStartedAt: '2026-11-23',
  settings: {
    name: 'Alex', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km',
    weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate',
    equipmentProfiles: [], restPeriods: {},
  },
  weeks: { '1': { activationId: 'act', programId: 'hybrid_engine', dates: {}, lifts: {}, gymStats: {}, runSessions: {} } },
  bodyWeightLog: [], bodyMeasurements: [],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  hybridScore: { history: [], xp: 0 }, loadMetrics: { atl: 0, ctl: 0 },
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const runtime = await resolveChromium();
if (!runtime) process.exit(0);
const { chromium, executablePath } = runtime;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 780 }, colorScheme: 'dark' });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value),
    ['hybrid_engine_v2_state', JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: 'NOT YET' }).click({ timeout: 500 }).catch(() => {});
  await enterCockpit(page);
  await page.waitForTimeout(400);

  // Focus a numeric row field: enterkeyhint is applied on focus.
  await page.evaluate(() => document.querySelector('#cockpitExercisesContainer .input-weight-node')?.focus());
  await page.waitForTimeout(120);
  const hint = await page.evaluate(() => document.querySelector('#cockpitExercisesContainer .input-weight-node')?.getAttribute('enterkeyhint'));
  check(hint === 'done', `numeric field asks for a done key (${hint})`);

  // Simulate the keyboard: the visible viewport shrinks. The focused field must
  // be scrolled clear of the bottom edge.
  await page.setViewportSize({ width: 390, height: 420 });
  await page.waitForTimeout(600);
  const revealed = await page.evaluate(() => {
    const field = document.querySelector('#cockpitExercisesContainer .input-weight-node');
    const rect = field.getBoundingClientRect();
    return { bottom: Math.round(rect.bottom), top: Math.round(rect.top), height: innerHeight };
  });
  check(revealed.bottom <= 420, `focused field sits above the keyboard (bottom ${revealed.bottom} of 420)`);

  // The per-set sheet is capped by the visible viewport, not 88vh of the full screen.
  await page.evaluate(() => document.querySelector('#cockpitExercisesContainer .set-num-lbl')?.click());
  await page.waitForTimeout(450);
  const sheet = await page.evaluate(() => {
    const el = document.getElementById('setSheet');
    const rect = el.getBoundingClientRect();
    return {
      active: el.classList.contains('active'),
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      height: Math.round(rect.height),
    };
  });
  check(sheet.active, 'the set sheet opened');
  check(sheet.bottom <= 421, `the sheet ends inside the visible viewport (bottom ${sheet.bottom})`);
  check(sheet.height <= 396, `the sheet is capped by the visible height (height ${sheet.height})`);
  check(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error('lg2-keyboard-browser-check: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('lg2-keyboard-browser-check: PASS — focused fields clear the keyboard and the set sheet fits the visible viewport.');
