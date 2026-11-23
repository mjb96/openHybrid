// =============================================================================
// PROGRESS SCREENSHOTS (design review, not a test)
//
// Renders the REAL Progress tab with a seeded athlete and writes phone, light and
// tablet captures to docs/mockups/live-progress-*.png.
//
// It exists because the browser checks verify structure — band order, 44px,
// contrast, overflow — and none of that is taste. Three defects that only a
// screenshot could show were found this way: the shared body map rendering ~800px
// tall inside a band, the action row sitting between headline and chart, and the
// fixed bottom nav covering the last band.
//
//   node scripts/progress-screenshots.mjs
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveChromium } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const BASE = `http://127.0.0.1:${port}`;

const TZ = 'Australia/Sydney';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const addDays = (key, n) => { const d = new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = (key) => addDays(key, -(((new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7)));
const MON = mondayOf(today);
const set = (w, r) => ({ c: true, w: String(w), r: String(r) });
const rpe = (w, r, rir) => ({ c: true, w: String(w), r: String(r), rir: String(rir) });

function fixture(theme = 'dark') {
  return {
    schemaVersion: 16, currentWeek: '2', activeProgramId: 'hybrid_engine', activeActivationId: 'current',
    settings: {
      name: 'Alex', theme, weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
      fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', targetWeight: 76, rateGoal: 'lose',
      modules: { running: true, fasting: true, health: true, recovery: true }, hybridTraining: true,
    },
    bodyWeightLog: [
      { date: addDays(MON, -20), weight: 80.2 }, { date: addDays(MON, -16), weight: 79.8 },
      { date: addDays(MON, -12), weight: 79.5 }, { date: addDays(MON, -9), weight: 79.1 },
      { date: addDays(MON, -5), weight: 78.9 }, { date: addDays(MON, -2), weight: 78.4 },
    ],
    bodyMeasurements: [
      { date: addDays(MON, -18), waist: 84, chest: 104, arm_l: 38, thigh_l: 61, bodyFat: 19.4 },
      { date: addDays(MON, -4), waist: 82, chest: 104, arm_l: 38.5, thigh_l: 61, bodyFat: 18.5 },
    ],
    fastingSession: { active: false, startTime: null, goal: 16, history: Array.from({ length: 10 }, (_, i) => {
      const end = `${addDays(MON, -i)}T12:00:00Z`;
      const hours = [16.5, 17, 15.5, 18, 14, 16.8, 20.5, 16, 15, 17.5][i];
      return { startTime: `x`, endTime: end, hours, goal: 16, completed: true };
    }) },
    weeks: {
      '1': {
        activationId: 'current', programId: 'hybrid_engine',
        dates: { mon: addDays(MON, -7), wed: addDays(MON, -5), tue: addDays(MON, -6), sat: addDays(MON, -2) },
        lifts: {
          mon: { 'Barbell Bench Press': [rpe(100, 5, 2), rpe(100, 5, 2), rpe(100, 5, 1)], 'Cable Fly': [set(30, 12)] },
          wed: { 'Back Squat': [rpe(140, 5, 2), rpe(140, 5, 2)], 'Romanian Deadlift': [set(120, 8)] },
          sat: { 'Barbell Row': [set(80, 8), set(80, 8)], 'Lateral Raise': [set(12, 15)] },
        },
        gymStats: { mon: { time: '55' }, wed: { time: '60' }, sat: { time: '45' } },
        runSessions: {
          tue: [{ dist: '6.0', time: '29:30', type: 'run', rpe: '6' }],
          sat: [{ dist: '2.5', time: '28:00', type: 'walk' }],
        },
      },
      '2': {
        activationId: 'current', programId: 'hybrid_engine',
        dates: { mon: addDays(MON, 0), tue: addDays(MON, 1), thu: addDays(MON, 3), fri: addDays(MON, 4) },
        lifts: {
          mon: { 'Barbell Bench Press': [rpe(105, 5, 2), rpe(105, 5, 1), rpe(105, 4, 0)], 'Cable Fly': [set(32.5, 12)] },
          thu: { 'Back Squat': [rpe(145, 5, 2), rpe(145, 5, 2)], 'Romanian Deadlift': [set(125, 8)] },
          fri: { 'Barbell Row': [set(85, 8), set(85, 8)], 'Lateral Raise': [set(14, 15)] },
        },
        gymStats: { mon: { time: '58' }, thu: { time: '62' }, fri: { time: '40' } },
        runSessions: {
          tue: [{ dist: '10.2', time: '52:40', type: 'run', rpe: '7' }, { dist: '3.0', time: '34:00', type: 'walk' }],
        },
      },
      'arch:past:1': {
        sessionId: 'str_past_1', activationId: 'past', programId: 'hybrid_engine',
        dates: { wed: addDays(MON, -16) },
        lifts: { wed: { 'Back Squat': [set(135, 5)], 'Barbell Bench Press': [set(95, 5)] } },
        gymStats: { wed: { time: '50' } },
      },
    },
  };
}

const runtime = await resolveChromium();
const browser = await runtime.chromium.launch(runtime.executablePath ? { executablePath: runtime.executablePath } : {});
const shots = [];
async function shot(name, { width = 390, height = 844, theme = 'dark', scroll = 0, scale = 2 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: theme, serviceWorkers: 'block', timezoneId: TZ });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), ['hybrid_engine_v2_state', JSON.stringify(fixture(theme))]);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.bottom-nav [data-target="analytics"]', { timeout: 15000 });
  await page.click('.bottom-nav [data-target="analytics"]');
  await page.waitForSelector('#analytics-hub.active .pg-band', { timeout: 15000 });
  await page.waitForTimeout(600);
  if (scroll) { await page.evaluate((y) => window.scrollTo(0, y), scroll); await page.waitForTimeout(350); }
  const file = `docs/mockups/live-${name}.png`;
  await page.screenshot({ path: path.join(ROOT, file) });
  shots.push(file);
  await context.close();
}

await shot('progress-top', {});
await shot('progress-scroll', { scroll: 760 });
await shot('progress-bottom', { scroll: 1700 });
await shot('progress-light', { theme: 'light' });
await shot('progress-tablet', { width: 820, height: 1180, scale: 1.5 });
await browser.close();
server.close();
console.log(shots.join('\n'));
