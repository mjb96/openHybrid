// =============================================================================
// PROGRESS NAVIGATION SCREENSHOTS — roadmap §16 before/after evidence.
//
// Separate from `progress-screenshots.mjs` (the design-review capture): this one
// pins a fixture and the clock, opens Progress, and writes the hub and the
// Customize sheet so the navigation change can be reviewed side by side.
//
//   node scripts/progress-nav-screenshots.mjs --out docs/screenshots --label after
// =============================================================================
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const OUT = path.resolve(ROOT, outArg >= 0 ? process.argv[outArg + 1] : 'docs/screenshots');
const labelArg = process.argv.indexOf('--label');
const LABEL = labelArg >= 0 ? process.argv[labelArg + 1] : 'progress';
const runtime = await resolveChromium();
if (!runtime) {
  console.error('Chromium is not available; screenshots were not captured.');
  process.exit(1);
}
const { chromium, executablePath } = runtime;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    if ((req.url || '').split('?')[0] === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe path');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const BASE = `http://127.0.0.1:${port}`;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const TODAY = '2026-11-25';
const MON = '2026-11-23';
const addDays = (key, amount) => {
  const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10);
};
const set = (w, r) => ({ c: true, w: String(w), r: String(r) });

function fixture(theme = 'dark') {
  return {
    schemaVersion: 5, currentWeek: '2', activeProgramId: 'hybrid_engine', activeActivationId: 'current',
    settings: { name: 'Progress Athlete', theme, weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true },
    bodyWeightLog: [{ date: addDays(MON, -20), weight: 80 }, { date: addDays(MON, -2), weight: 78.4 }],
    bodyMeasurements: [{ date: addDays(MON, -2), waist: 82, chest: 104 }],
    weeks: {
      '1': {
        dates: { mon: addDays(MON, -7), tue: addDays(MON, -6), wed: addDays(MON, -5) },
        lifts: { mon: { 'Bench Press': [set(100, 5), set(100, 5)] }, wed: { 'Back Squat': [set(140, 5)] } },
        runs: { tue: { dist: '5.0', time: '25:00' } },
      },
      '2': {
        dates: { mon: MON, tue: addDays(MON, 1) },
        lifts: { mon: { 'Bench Press': [set(105, 5), set(105, 5)] }, tue: { 'Back Squat': [set(142.5, 5)] } },
        runs: { tue: { dist: '6.0', time: '29:00' } },
      },
    },
    wellnessLog: [
      { date: TODAY, sleep: 7.5, mood: 4, soreness: 2 },
      { date: addDays(TODAY, -1), sleep: 8, mood: 4, soreness: 2 },
    ],
  };
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  for (const [width, theme] of [[390, 'dark'], [320, 'light']]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 900 }, colorScheme: theme });
    await context.addInitScript(pinClock, Date.parse(`${TODAY}T09:00:00+11:00`));
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(fixture(theme))]);
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const cta = document.createElement('button');
      cta.setAttribute('data-action', 'open-analytics');
      cta.setAttribute('data-context', 'hub');
      cta.style.display = 'none';
      document.body.appendChild(cta);
      cta.click();
      cta.remove();
    });
    await page.waitForSelector('#analytics-hub.active .pg-band');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(OUT, `${LABEL}-hub-${width}-${theme}.png`), fullPage: false });
    await page.click('[data-action="open-customize"][data-surface="progress"]');
    await page.waitForSelector('#customizeSheet.active');
    await page.screenshot({ path: path.join(OUT, `${LABEL}-customize-${width}-${theme}.png`), fullPage: false });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Screenshots written to ${OUT}`);
