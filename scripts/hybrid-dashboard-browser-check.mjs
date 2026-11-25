// =============================================================================
// HYBRID DASHBOARD BROWSER CHECK
//
// Proves the Home hybrid section in a real browser: the three cards render from
// seeded calendar data, the Hybrid training switch removes only the hybrid
// surfaces (strength stays), the choice persists, the Running module gates the
// endurance card on its own, and every card control is a 44px target.
//
// Fixture: Thursday 19 Nov 2026 (week started Mon 16 Nov).
//   Mon — strength 60 min @ RPE 8, 3×100 kg × 10  → 480 sRPE, 3,000 kg
//   Tue — run 10 km in 50:00 @ RPE 8              → 480 sRPE, 10.00 km, 5:00 /km
//   ⇒ 50 / 50 split, and both mini cards have real numbers.
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
const STORAGE_KEY = 'hybrid_engine_v2_state';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const todayISO = '2026-11-19';
const sets = Array.from({ length: 3 }, () => ({ c: true, w: '100', r: '10' }));
const state = {
  schemaVersion: 14, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act_hy',
  weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_hy', programId: 'hybrid_engine', startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
  },
  customPrograms: [],
  weeks: { '1': {
    activationId: 'act_hy', programId: 'hybrid_engine',
    dates: { mon: '2026-11-16', tue: '2026-11-17' },
    lifts: { mon: { Squat: sets } },
    gymRpe: { mon: '8' },
    gymStats: { mon: { time: '50' } },
    runs: {},
    runSessions: { tue: [{ sessionId: 'run_hy_1', dist: 10, time: '50:00', rpe: '8', type: 'run' }] },
    sessionStatus: {}, sessionSummary: {}, liftOrder: {}, liftMeta: {}, notes: {}, bodyWeight: {},
  } },
  bodyWeightLog: [{ date: '2026-11-18', weight: 85.9 }],
  wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney', colorScheme: 'dark' });
  await context.addInitScript(([key, value]) => {
    if (!localStorage.getItem('hybridCheckSeeded')) {
      localStorage.setItem(key, value);
      localStorage.setItem('hybridCheckSeeded', '1');
    }
  }, [STORAGE_KEY, JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse(`${todayISO}T09:00:00+11:00`));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('#homeBalanceCard .home-hy');

  // ---- the three cards render from the seeded calendar week ---------------
  const balanceText = await page.locator('#homeBalanceCard').innerText();
  ok(/Balanced/.test(balanceText), 'the balance card classifies an even split');
  ok((balanceText.match(/50%/g) || []).length === 2, 'both sides read 50%');

  const strengthText = await page.locator('#homeStrengthWeekCard').innerText();
  ok(/3.?000 kg/.test(strengthText), `the strength card shows this week's tonnage (${strengthText.replace(/\s+/g, ' ').trim()})`);

  const enduranceText = await page.locator('#homeEnduranceWeekCard').innerText();
  ok(/10\.00 km/.test(enduranceText), 'the endurance card shows this week\'s distance');
  ok(/5:00 \/km/.test(enduranceText), 'the endurance card shows pace');
  ok(/Aerobic \d+ \(est\.\)/.test(enduranceText), 'aerobic fitness is labelled as an estimate');

  const order = await page.evaluate(() => {
    const week = document.getElementById('homeWeekStrip');
    const hybrid = document.getElementById('homeHybridSection');
    return !!(week && hybrid && (week.compareDocumentPosition(hybrid) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  ok(order, 'the hybrid section sits below the week surface, never above Today');

  // ---- 44px controls ------------------------------------------------------
  const heights = await page.evaluate(() => [
    document.querySelector('#homeBalanceCard .home-hy__body'),
    document.querySelector('#homeStrengthWeekCard .home-hy__mini-body'),
    document.querySelector('#homeEnduranceWeekCard .home-hy__mini-body'),
  ].map((el) => el ? Math.round(el.getBoundingClientRect().height) : 0));
  ok(heights.every((height) => height >= 44), `every hybrid card control is at least 44px (${heights.join(', ')})`);

  // ---- Hybrid training off: only hybrid surfaces go ----------------------
  await page.click('#homeSettingsBtn');
  await page.waitForSelector('#settingsOverlay.active');
  await page.click('[data-action="open-settings-page"][data-context="once.modules"]');
  await page.waitForSelector('#settingsPageHost .s-page');
  await page.locator('label.s-switch', { has: page.locator('input[data-setting-key="hybridTraining"]') }).click();
  await page.waitForFunction(() => document.documentElement.dataset.hybrid === 'off');

  // Settings is a full-screen overlay; Home is not on screen while it is open,
  // so every Home visibility assertion happens after coming back to it.
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
  ok(stored.settings?.hybridTraining === false, 'the Hybrid preference is persisted');
  ok(stored.settings?.modules?.running !== false, 'turning Hybrid off does NOT rewrite the Running module');

  await page.click('#settingsPageHost .s-back');
  await page.waitForSelector('#settingsPageHost .s-home');
  await page.click('#settingsOverlay [data-action="close-settings"]');
  await page.click('.nav-item[data-target="home"]');
  await page.waitForSelector('#view-home.active');
  await page.waitForSelector('#homeStrengthWeekCard .home-hy');
  ok(!(await page.locator('#homeBalanceCard').isVisible()), 'Hybrid off hides the balance card');
  ok(!(await page.locator('#homeEnduranceWeekCard').isVisible()), 'Hybrid off hides the endurance card');
  ok(await page.locator('#homeStrengthWeekCard').isVisible(), 'Hybrid off KEEPS the strength card');
  ok(await page.locator('#homeTodayCard').isVisible(), 'Hybrid off never touches the Today decision');
  ok(await page.locator('#homeWeekStrip').isVisible(), 'Hybrid off never hides the week surface');

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#homeBalanceCard', { state: 'attached' });
  await page.waitForSelector('#homeStrengthWeekCard .home-hy');
  ok(!(await page.locator('#homeBalanceCard').isVisible()), 'the choice survives a reload');

  // ---- Hybrid back on, then the Running module gates endurance alone ------
  await page.click('#homeSettingsBtn');
  await page.waitForSelector('#settingsOverlay.active');
  await page.click('[data-action="open-settings-page"][data-context="once.modules"]');
  await page.waitForSelector('#settingsPageHost .s-page');
  await page.locator('label.s-switch', { has: page.locator('input[data-setting-key="hybridTraining"]') }).click();
  await page.waitForFunction(() => document.documentElement.dataset.hybrid === 'on');

  await page.locator('label.s-switch', { has: page.locator('input[data-setting-key="modules.running"]') }).click();
  await page.waitForFunction(() => document.documentElement.dataset.moduleRunning === 'off');
  await page.click('#settingsPageHost .s-back');
  await page.waitForSelector('#settingsPageHost .s-home');
  await page.click('#settingsOverlay [data-action="close-settings"]');
  await page.click('.nav-item[data-target="home"]');
  await page.waitForSelector('#view-home.active');
  ok(await page.locator('#homeBalanceCard').isVisible(), 'Hybrid on restores the balance card');
  ok(!(await page.locator('#homeEnduranceWeekCard').isVisible()), 'Running off hides only the endurance card');
  ok(await page.locator('#homeStrengthWeekCard').isVisible(), 'Running off leaves the strength card');

  // ---- Customize owns the new cards individually --------------------------
  await page.click('[data-action="open-customize"][data-surface="home"]');
  await page.waitForSelector('#customizeSheet.active');
  ok(await page.locator('#customizeSheet input[data-customize-card="hybridBalance"]').isChecked(), 'Training balance starts visible in Customize');
  await page.evaluate(() => document.querySelector('#customizeSheet input[data-customize-card="strengthWeek"]')?.click());
  await page.waitForFunction(() => document.getElementById('homeStrengthWeekCard')?.classList.contains('home-card-hidden'));
  ok(!(await page.locator('#homeStrengthWeekCard').isVisible()), 'Customize hides an individual hybrid card');
  await page.click('#customizeSheet [data-action="close-customize"]');

  // ---- phones do not overflow --------------------------------------------
  for (const width of [320, 360, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(120);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(overflow <= 1, `no horizontal overflow at ${width}px (${overflow}px)`);
  }

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`\nhybrid-dashboard-browser-check: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('\nhybrid-dashboard-browser-check: PASS — hybrid cards, focus toggle, module gating and Customize.');
