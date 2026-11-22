// =============================================================================
// SUPERSET / CIRCUIT BROWSER CHECK
//
// The old supersets were pair-only and buggy: adding a third minted a new letter
// and re-lettered both originals (stranding the previous partner), members
// rendered in object-key order, colours stopped at F, the 27th id became `[`,
// and rest fired after every member instead of after the group.
//
// This drives the real cockpit at 390px: pair two exercises, add a third from
// the panel, prove the circuit follows `liftOrder`, tick A1 and B1 with NO rest,
// tick C1 and prove the rest bar appears on the last member, remove one member,
// then unlink the remainder and prove no `groupId` survives.
// =============================================================================
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';
import { enterCockpit } from './cockpit-entry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = process.argv.includes('--required');
const runtime = await resolveChromium();
if (!runtime) process.exit(required ? 1 : 0);
const { chromium, executablePath } = runtime;

const STORAGE_KEY = 'hybrid_engine_v2_state';
const shotArg = process.argv.find((arg) => arg.startsWith('--screenshot='));
const shotPath = shotArg ? shotArg.slice('--screenshot='.length) : '';
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  try {
    if ((req.url || '').split('?')[0] === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe');
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`;
const TZ = 'Australia/Sydney';
// PINNED. The fixture's programme week is anchored at
// `weekStartedAt: '2026-11-16'`. With an unpinned clock, the app offered "Time
// to Advance?" once that week was seven days old, and its sheet covered the app
// and made the bottom nav inert on 2026-11-23 (the check went red for a calendar
// accident, not a product regression). Pin a time INSIDE the anchored week so
// the check asserts the circuit, not the date.
const TODAY = '2026-11-16';
const CLOCK = Date.parse(`${TODAY}T09:00:00+10:00`);
const DAY = 'thu';
const LIFTS = ['Bench Press', 'Barbell Row', 'Overhead Press', 'Bicep Curl'];

const rest = {
  title: 'Rest', badge: 'Recovery', color: 'var(--text-muted)', desc: '', runs: 'Rest', lifts: [],
};
const program = {
  id: 'superset_program', name: 'Circuit Test', totalWeeks: 4,
  days: {
    mon: { ...rest }, tue: { ...rest }, wed: { ...rest },
    thu: { title: 'Circuit Day', badge: 'Strength', color: 'var(--accent-blue)', desc: '', runs: 'Rest', lifts: LIFTS },
    fri: { ...rest }, sat: { ...rest }, sun: { ...rest },
  },
  weeklyVolModifiers: Object.fromEntries(['1', '2', '3', '4'].map((week) => [week, { sets: 3, reps: 8, intensityLabel: '' }])),
};

const rows = () => [
  { w: '60', r: '8', c: false }, { w: '60', r: '8', c: false }, { w: '60', r: '8', c: false },
];
const fixture = {
  schemaVersion: 14, currentWeek: '1', activeProgramId: program.id, activeActivationId: 'act_superset',
  weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_superset', programId: program.id, startWeek: 1, status: 'active', startedAt: '2026-11-02' }],
  settings: {
    name: 'Circuit', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km',
    weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate',
    equipmentTier: 'gym', equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
  },
  customPrograms: [program],
  weeks: {
    '1': {
      activationId: 'act_superset', programId: program.id,
      dates: {}, sessionStatus: {}, sessionSummary: {},
      lifts: { [DAY]: Object.fromEntries(LIFTS.map((name) => [name, rows()])) },
      liftOrder: { [DAY]: [...LIFTS] },
      liftMeta: { [DAY]: {} },
      notes: {}, gymRpe: {}, gymStats: {}, bodyWeight: {}, runs: {}, runSessions: {},
    },
  },
  bodyWeightLog: [], wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
  routines: [], libraryFolders: [],
};

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => {
  if (condition) console.log(`  ok · ${label}`);
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};
const readState = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
const groupNames = (page) => page.evaluate(() => [...document.querySelectorAll('#cockpitExercisesContainer .superset-group .cockpit-exercise')]
  .map((card) => card.getAttribute('data-liftname')));
const timerActive = (page) => page.evaluate(() => !!document.getElementById('cockpitTimerBar')?.classList.contains('active'));
// The rest pill is deliberately GLOBAL: it floats above the bottom nav so it
// survives the active card collapsing, which is exactly when the athlete waits
// for the next set. It must never be nested in a member card again.
const timerPlacement = (page) => page.evaluate(() => {
  const bar = document.getElementById('cockpitTimerBar');
  return {
    inView: !!bar?.closest('#view-workout'),
    inCard: bar?.closest('.cockpit-exercise')?.getAttribute('data-liftname') || '',
  };
});
// The persisted rest snapshot carries the exact resolved duration, so the
// assertion is not a race with a ticking clock.
const restDuration = (page) => page.evaluate(() => {
  const raw = localStorage.getItem('hybrid_restTimer_v1');
  if (!raw) return 0;
  try { return Number(JSON.parse(raw).duration) || 0; } catch { return 0; }
});

async function openPanel(page, liftName) {
  await page.evaluate((name) => {
    const card = [...document.querySelectorAll('.cockpit-exercise')]
      .find((candidate) => candidate.getAttribute('data-liftname') === name);
    card?.querySelector('[data-action="show-ss-panel"]')?.click();
  }, liftName);
  await page.waitForSelector('.ss-link-panel');
}

async function clickPanel(page, action, partner = '') {
  const clicked = await page.evaluate(([wanted, name]) => {
    const button = [...document.querySelectorAll(`.ss-link-panel [data-action="${wanted}"]`)]
      .find((candidate) => !candidate.disabled
        && (!name || candidate.getAttribute('data-partner') === name || candidate.getAttribute('data-member') === name));
    if (!button) return false;
    button.click();
    return true;
  }, [action, partner]);
  await page.waitForTimeout(350);
  return clicked;
}

async function tickFirstSet(page, liftName) {
  await page.evaluate((name) => {
    const card = [...document.querySelectorAll('.cockpit-exercise')]
      .find((candidate) => candidate.getAttribute('data-liftname') === name);
    const row = card?.querySelector('.cockpit-set-row');
    if (!row) return;
    const weight = row.querySelector('.input-weight-node');
    const reps = row.querySelector('.input-reps-node');
    if (weight) { weight.value = '60'; weight.dispatchEvent(new Event('input', { bubbles: true })); }
    if (reps) { reps.value = '8'; reps.dispatchEvent(new Event('input', { bubbles: true })); }
    row.querySelector('.gym-check')?.click();
  }, liftName);
  await page.waitForTimeout(400);
}

try {
  const context = await createBrowserContext(browser, {
    viewport: { width: 390, height: 844 }, timezoneId: TZ, colorScheme: 'dark',
  });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(fixture)]);
  await context.addInitScript(pinClock, CLOCK);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/frame-ancestors.*ignored.*meta/i.test(message.text()) && !/net::ERR_/.test(message.text())) {
      errors.push(message.text());
    }
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await enterCockpit(page, { day: DAY });
  await page.waitForTimeout(400);

  const initialOrder = await page.evaluate(() => [...document.querySelectorAll('#cockpitExercisesContainer .cockpit-exercise')]
    .map((card) => card.getAttribute('data-liftname')));
  ok(initialOrder.length >= 3, `the cockpit renders ${initialOrder.length} exercises`);
  const [first, second, third] = initialOrder;
  ok(!!first && !!second && !!third, 'at least three exercises are available to build a circuit');

  // ---- pair two ------------------------------------------------------------
  await openPanel(page, first);
  ok(await clickPanel(page, 'link-superset', second), 'the superset panel lists the second exercise as a candidate');
  await page.waitForSelector('.superset-group');
  let names = await groupNames(page);
  ok(names.length === 2 && names[0] === first && names[1] === second, `pair renders in lift order (${names.join(' → ')})`);
  let stored = await readState(page);
  ok(stored.weeks['1'].liftMeta[DAY][first]?.groupId === 'A', 'pair A is stored on the first lift');
  ok(stored.weeks['1'].liftMeta[DAY][second]?.groupId === 'A', 'pair A is stored on the second lift');

  // ---- add a third ---------------------------------------------------------
  await openPanel(page, second);
  const inCircuit = await page.evaluate(() => [...document.querySelectorAll('.ss-link-panel .ss-member-name')].map((el) => el.textContent.trim()));
  ok(inCircuit.length === 2, `the panel lists ${inCircuit.length} members already in the circuit`);
  ok(await clickPanel(page, 'link-superset', third), 'the panel offers a third exercise');
  await page.waitForTimeout(300);
  names = await groupNames(page);
  ok(names.length === 3, `the circuit now has three members (${names.join(' → ')})`);
  ok(JSON.stringify(names) === JSON.stringify(initialOrder.slice(0, 3)), 'members render in liftOrder, not object-key order');
  const header = await page.evaluate(() => document.querySelector('.superset-group-header')?.innerText || '');
  ok(/3 exercises · rest after the last/i.test(header), `the header explains the group (${header.replace(/\s+/g, ' ').trim()})`);
  ok(/· 0 of 3 done/.test(header), `the header progress is separated (${header.replace(/\s+/g, ' ').trim()})`);
  const ssLabels = await page.evaluate(() => [...document.querySelectorAll('.superset-group .btn-ss-link')].map((button) => button.textContent.trim()));
  ok(ssLabels.every((label) => label === 'SS A · 3'), `each member's SS button carries the count (${ssLabels.join(', ')})`);
  const connectors = await page.evaluate(() => [...document.querySelectorAll('.superset-group .superset-connector')].map((el) => el.textContent.trim()));
  ok(connectors.join('|') === '↕ 2 of 3|↕ 3 of 3', `connectors use ordinals (${connectors.join(', ')})`);
  stored = await readState(page);
  ok(stored.weeks['1'].liftMeta[DAY][first]?.groupId === 'A'
    && stored.weeks['1'].liftMeta[DAY][second]?.groupId === 'A'
    && stored.weeks['1'].liftMeta[DAY][third]?.groupId === 'A',
  'adding a third kept the original letter and did not strand a partner');

  // ---- rest after the LAST member -----------------------------------------
  await page.evaluate((name) => {
    const card = [...document.querySelectorAll('.cockpit-exercise')]
      .find((candidate) => candidate.getAttribute('data-liftname') === name);
    card?.querySelector('.cockpit-header-clickzone')?.click();
  }, third);
  await tickFirstSet(page, first);
  ok(!await timerActive(page), 'ticking A1 does not start rest while B1/C1 are behind');
  await tickFirstSet(page, second);
  ok(!await timerActive(page), 'ticking B1 does not start rest while C1 is behind');
  await tickFirstSet(page, third);
  ok(await timerActive(page), 'ticking C1 starts the group rest');
  const circuitPill = await timerPlacement(page);
  ok(circuitPill.inView && !circuitPill.inCard, `the group rest pill is global, not nested in a card (${circuitPill.inCard || 'none'})`);

  if (shotPath) {
    // Let the "baseline set" toast clear so the screenshot is the circuit, not
    // a transient confirmation over it.
    await page.waitForTimeout(2600);
    await page.evaluate(() => {
      const group = document.querySelector('#cockpitExercisesContainer .superset-group');
      if (!group) return;
      const sticky = document.querySelector('.cockpit-active-sticky');
      const stickyBottom = sticky ? sticky.getBoundingClientRect().bottom : 0;
      const top = group.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - stickyBottom - 6));
    });
    await page.waitForTimeout(300);
    await mkdir(path.dirname(shotPath), { recursive: true });
    await page.screenshot({ path: shotPath });
    console.log(`  shot · ${shotPath}`);
  }

  await page.evaluate(() => document.querySelector('[data-action="dismiss-rest"]')?.click());
  await page.waitForTimeout(200);

  // ---- remove one ----------------------------------------------------------
  await openPanel(page, first);
  ok(await clickPanel(page, 'remove-from-superset', second), 'the panel removes one member');
  await page.waitForTimeout(300);
  names = await groupNames(page);
  ok(names.length === 2 && names[0] === first && names[1] === third, `the remaining pair survives (${names.join(' → ')})`);
  stored = await readState(page);
  ok(stored.weeks['1'].liftMeta[DAY][second]?.groupId === undefined, 'the removed member lost its tag');
  ok(stored.weeks['1'].liftMeta[DAY][first]?.groupId === 'A'
    && stored.weeks['1'].liftMeta[DAY][third]?.groupId === 'A',
  'the remaining members kept the original letter');

  // ---- unlink all ----------------------------------------------------------
  await openPanel(page, first);
  ok(await clickPanel(page, 'unlink-superset'), '“Unlink circuit” is available');
  await page.waitForTimeout(350);
  ok((await page.locator('.superset-group').count()) === 0, 'no circuit wrapper remains after unlink');
  stored = await readState(page);
  const leftovers = Object.entries(stored.weeks['1'].liftMeta[DAY] || {})
    .filter(([, meta]) => meta && meta.groupId != null);
  ok(leftovers.length === 0, `no groupId survives unlink (${JSON.stringify(leftovers)})`);

  const ids = Object.values(stored.weeks['1'].liftMeta[DAY] || {}).map((meta) => meta?.groupId).filter(Boolean);
  ok(!ids.includes('['), 'no ASCII-punctuation group id was ever allocated');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  ok(!overflow, '390px: no page-level horizontal overflow');
  ok(errors.length === 0, errors.length ? `browser errors: ${errors.join(' | ')}` : 'no browser errors');

  await context.close();

  // ---- one governing duration, whichever member is ticked last -------------
  // Bench (180 s compound) + Bicep Curl (90 s isolation) must both produce the
  // same group rest. The old timer asked only the ticked member, so the pair
  // rested 180 s or 90 s depending on tick order.
  const durations = {};
  for (const [firstLift, secondLift] of [['Bench Press', 'Bicep Curl'], ['Bicep Curl', 'Bench Press']]) {
    const orderLabel = `${firstLift} → ${secondLift}`;
    const orderContext = await createBrowserContext(browser, {
      viewport: { width: 390, height: 844 }, timezoneId: TZ, colorScheme: 'dark',
    });
    await orderContext.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(fixture)]);
    await orderContext.addInitScript(pinClock, CLOCK);
    const orderPage = await orderContext.newPage();
    const orderErrors = [];
    orderPage.on('pageerror', (error) => orderErrors.push(error.message));
    await orderPage.goto(BASE, { waitUntil: 'networkidle' });
    await enterCockpit(orderPage, { day: DAY });

    await openPanel(orderPage, firstLift);
    ok(await clickPanel(orderPage, 'link-superset', secondLift), `${orderLabel}: the pair forms`);
    await orderPage.waitForSelector('.superset-group');
    // Expand the last member so the second set is reachable and the group rest
    // is triggered by the final tick (the pill itself is global).
    await orderPage.evaluate((name) => {
      const card = [...document.querySelectorAll('.cockpit-exercise')]
        .find((candidate) => candidate.getAttribute('data-liftname') === name);
      if (card?.classList.contains('collapsed')) card.querySelector('.cockpit-header-clickzone')?.click();
    }, secondLift);
    await orderPage.waitForTimeout(150);
    await tickFirstSet(orderPage, firstLift);
    ok(!await timerActive(orderPage), `${orderLabel}: the first member does not rest while the second is behind`);
    await tickFirstSet(orderPage, secondLift);
    await orderPage.waitForTimeout(300);
    ok(await timerActive(orderPage), `${orderLabel}: the last member starts the group rest`);
    const duration = await restDuration(orderPage);
    durations[orderLabel] = duration;
    ok(duration === 180, `${orderLabel}: the group rest is the compound 180 s, found ${duration}`);
    const orderPill = await timerPlacement(orderPage);
    ok(orderPill.inView && !orderPill.inCard, `${orderLabel}: the group rest pill is global (${orderPill.inCard || 'none'})`);
    ok(orderErrors.length === 0, orderErrors.length ? `${orderLabel}: browser errors: ${orderErrors.join(' | ')}` : `${orderLabel}: no browser errors`);
    await orderContext.close();
  }
  ok(durations['Bench Press → Bicep Curl'] === durations['Bicep Curl → Bench Press'],
    `both tick orders use the same governing duration (${durations['Bench Press → Bicep Curl']} s vs ${durations['Bicep Curl → Bench Press']} s)`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}
console.log('Superset circuit browser contract passed.');
