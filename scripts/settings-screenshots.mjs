// =============================================================================
// SETTINGS SCREENSHOTS — documentation aid, not a product check.
//   node scripts/settings-screenshots.mjs --out docs/screenshots
// =============================================================================
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const OUT = path.resolve(ROOT, outArg >= 0 ? process.argv[outArg + 1] : 'docs/screenshots');
const runtime = await resolveChromium();
if (!runtime) process.exit(1);
const { chromium, executablePath } = runtime;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const state = {
  schemaVersion: 16, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act',
  settings: { name: 'Alex', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', targetWeight: 76, rateGoal: -0.25, heightCm: 178, equipmentProfiles: [], restPeriods: { warmup: 45, compound: 180, accessory: 120, isolation: 90 } },
  weeks: { '1': { dates: { mon: '2026-11-23' }, lifts: { mon: { 'Bench Press': [{ c: true, w: '100', r: '5' }] } }, gymStats: { mon: { time: '55' } } } },
  bodyWeightLog: [{ date: '2026-11-02', weight: 80 }, { date: '2026-11-23', weight: 78.4 }],
  bodyMeasurements: [{ date: '2026-11-23', waist: 82, chest: 104 }],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
};
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  for (const [width, theme] of [[390, 'dark'], [320, 'light']]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 900 }, colorScheme: theme });
    await context.addInitScript(([k, v]) => localStorage.setItem(k, v), ['hybrid_engine_v2_state', JSON.stringify({ ...state, settings: { ...state.settings, theme } })]);
    await context.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `settings-home-header-${width}-${theme}.png`), clip: { x: 0, y: 0, width, height: 180 } });
    await page.click('#homeSettingsBtn');
    await page.waitForSelector('#settingsOverlay.active');
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(OUT, `settings-home-${width}-${theme}.png`) });
    for (const [route, name] of [['workout', 'workout'], ['look-home', 'look'], ['data', 'data'], ['equipment', 'equipment'], ['profile', 'profile']]) {
      if (!(await page.locator('#settingsPageHost .s-home').count())) {
        await page.click('#settingsPageHost .s-back');
        await page.waitForSelector('#settingsPageHost .s-home');
      }
      if (route === 'profile') {
        await page.click('#settingsPageHost [data-action="open-settings-profile"]');
      } else {
        await page.click(`[data-action="open-settings-page"][data-context="${route.startsWith('data') ? 'data.backup' : route.startsWith('look') ? 'once.look' : route === 'equipment' ? 'once.equipment' : 'training.workout'}"]`);
      }
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(OUT, `settings-${name}-${width}-${theme}.png`) });
    }
    await context.close();
  }
} finally {
  await browser.close(); server.close();
}
console.log(`Screenshots written to ${OUT}`);
