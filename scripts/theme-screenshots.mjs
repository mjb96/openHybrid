// =============================================================================
// THEME SCREENSHOTS — Part A visual matrix (documentation, not a check).
//   node scripts/theme-screenshots.mjs --out docs/screenshots
// =============================================================================
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';
import { enterCockpit } from './cockpit-entry.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const OUT = path.resolve(ROOT, outArg >= 0 ? process.argv[outArg + 1] : 'docs/screenshots');
const runtime = await resolveChromium();
if (!runtime) process.exit(1);
const { chromium, executablePath } = runtime;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const state = {
  schemaVersion: 17, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act', weekStartedAt: '2026-11-23',
  settings: { name: 'Alex', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', targetWeight: 76, heightCm: 178, equipmentProfiles: [], restPeriods: { warmup: 45, compound: 180, accessory: 120, isolation: 90 } },
  weeks: { '1': { activationId: 'act', programId: 'hybrid_engine', dates: { mon: '2026-11-23', tue: '2026-11-24', wed: '2026-11-25' }, lifts: { mon: { 'Bench Press': [{ c: true, w: '100', r: '5' }] }, tue: { 'Back Squat': [{ c: true, w: '140', r: '5' }] }, wed: { 'Back Squat': [{ w: '140', r: '5' }], 'Romanian Deadlift': [{ w: '100', r: '8' }] } }, gymStats: { mon: { time: '55' }, tue: { time: '45' } }, runSessions: {} } },
  bodyWeightLog: [{ date: '2026-11-02', weight: 80 }, { date: '2026-11-23', weight: 78.4 }], bodyMeasurements: [{ date: '2026-11-23', waist: 82 }],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const shot = async (page, name) => page.screenshot({ path: path.join(OUT, `theme-${name}.png`) });
try {
  for (const [theme, width] of [['dark', 390], ['light', 390], ['dark', 320]]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 900 }, colorScheme: theme });
    await context.addInitScript(([k, v]) => localStorage.setItem(k, v), ['hybrid_engine_v2_state', JSON.stringify({ ...state, settings: { ...state.settings, theme } })]);
    await context.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: 'NOT YET' }).click().catch(() => {});
    await page.waitForTimeout(250);
    await shot(page, `home-${theme}-${width}`);
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="workout"]')?.click());
    await page.waitForSelector('#view-workout.active');
    await page.waitForTimeout(450);
    await shot(page, `train-${theme}-${width}`);
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="analytics"]')?.click());
    await page.waitForSelector('#analytics-hub.active');
    await page.waitForTimeout(450);
    await shot(page, `progress-${theme}-${width}`);
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="program"]')?.click());
    await page.waitForSelector('#view-program.active');
    await page.waitForTimeout(450);
    await shot(page, `plans-${theme}-${width}`);
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="home"]')?.click());
    await page.waitForSelector('#view-home.active');
    await page.waitForTimeout(450);
    await page.click('#homeSettingsBtn');
    await page.waitForSelector('#settingsOverlay.active');
    await page.waitForTimeout(350);
    await shot(page, `settings-${theme}-${width}`);
    await page.click('#settingsPageHost [data-action="open-settings-profile"]');
    await page.waitForTimeout(300);
    await shot(page, `profile-${theme}-${width}`);

    // Cockpit, active session and per-set sheet last: a running session would
    // otherwise change every screenshot after it.
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="workout"]')?.click());
    await page.waitForTimeout(400);
    await enterCockpit(page);
    await page.waitForTimeout(500);
    await shot(page, `cockpit-${theme}-${width}`);
    await page.evaluate(() => document.getElementById('startWorkoutBtn')?.click());
    await page.waitForTimeout(700);
    await shot(page, `active-${theme}-${width}`);
    await page.evaluate(() => document.querySelector('#cockpitExercisesContainer .set-num-lbl')?.click());
    await page.waitForTimeout(450);
    await shot(page, `set-sheet-${theme}-${width}`);
    await page.evaluate(() => document.querySelector('#setSheet [data-action="close-set-sheet"]')?.click());
    await context.close();
  }

  // Alternate dark palettes: the surfaces, text and accent change; the layout
  // and the light theme do not.
  for (const palette of ['slate', 'forest', 'ember']) {
    const context = await createBrowserContext(browser, { viewport: { width: 390, height: 900 }, colorScheme: 'dark' });
    await context.addInitScript(([k, v]) => localStorage.setItem(k, v), ['hybrid_engine_v2_state', JSON.stringify({ ...state, settings: { ...state.settings, theme: 'dark', palette } })]);
    await context.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: 'NOT YET' }).click().catch(() => {});
    await page.waitForTimeout(250);
    await shot(page, `home-${palette}-dark-390`);
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="workout"]')?.click());
    await page.waitForSelector('#view-workout.active');
    await page.waitForTimeout(450);
    await shot(page, `train-${palette}-dark-390`);
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="home"]')?.click());
    await page.waitForSelector('#view-home.active');
    await page.click('#homeSettingsBtn');
    await page.waitForSelector('#settingsOverlay.active');
    await page.waitForTimeout(350);
    await shot(page, `settings-${palette}-dark-390`);
    await page.locator('#settingsPageHost .s-row', { hasText: 'Look & Home' }).first().click();
    await page.waitForTimeout(400);
    await shot(page, `look-${palette}-dark-390`);
    await context.close();
  }
} finally {
  await browser.close(); server.close();
}
console.log(`Theme screenshots written to ${OUT}`);
