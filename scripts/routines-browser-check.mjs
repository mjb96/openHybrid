// =============================================================================
// ROUTINES BROWSER CHECK
// A finished strength workout becomes a reusable routine from History's action
// menu: the saved record keeps the exercise order and set count but none of the
// session's completion/PR/note detail, the program and logged weeks are
// untouched, the routine survives a reload, Undo removes it, and a run detail
// has no such action.
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

// A rest-only program means boot cannot seed or reconcile any lift into the
// fixture week, so "weeks are unchanged" is a real assertion rather than a race
// with programme scaffolding.
const rest = { title: 'Rest', badge: 'Recovery', color: 'var(--text-muted)', desc: '', runs: 'Rest', lifts: [] };
const restDays = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => [day, { ...rest }]));
const program = {
  id: 'routine_program', name: 'Routine Test', totalWeeks: 4, days: restDays,
  weeklyVolModifiers: Object.fromEntries(['1', '2', '3', '4'].map((week) => [week, { sets: 3, reps: 5 }])),
};

const state = {
  schemaVersion: 13, currentWeek: '1', activeProgramId: program.id, activeActivationId: 'act_routine',
  weekStartedAt: '2026-11-16',
  activations: [{ id: 'act_routine', programId: program.id, startWeek: 1, status: 'active', startedAt: '2026-10-26' }],
  settings: {
    name: 'Browser', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true,
    fitnessGoal: 'hybrid', fitnessLevel: 'intermediate', equipmentTier: 'gym',
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [],
  },
  customPrograms: [program],
  weeks: { '1': {
    activationId: 'act_routine', programId: program.id, sessionId: 'str_routine', sessionTitle: 'Push A',
    dates: { mon: '2026-11-16', tue: '2026-11-17' },
    lifts: {
      mon: {
        'Bench Press': [
          { w: '100', r: '8', c: true, tr: '8', isPR: true },
          { w: '100', r: '7', c: true, tr: '8' },
          { w: '105', r: '6', c: true, tr: '8' },
        ],
        Deadlift: [{ w: '140', r: '5', c: true, note: 'belt' }],
      },
    },
    liftOrder: { mon: ['Bench Press', 'Deadlift'] }, liftMeta: { mon: {} },
    notes: { mon: 'Session note must not travel' }, gymRpe: { mon: '' }, bodyWeight: {},
    gymStats: { mon: { time: '45:00', avgHR: '', maxHR: '', cals: '' } },
    sessionStatus: { mon: 'finished' }, sessionSummary: { mon: { plannedSets: 4, completedSets: 4, skippedSets: 0, adherencePct: 100 } },
    runs: {}, runSessions: { tue: [{ sessionId: 'run_routine', source: 'manual', localDate: '2026-11-17', dist: '5', time: '25:00' }] },
  } },
  bodyWeightLog: [], wellnessLog: [], healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
const ok = (condition, label) => { if (condition) console.log(`  ok · ${label}`); else { failures.push(label); console.error(`FAIL: ${label}`); } };
const readState = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
const waitForRoutines = (page, count) => page.waitForFunction(
  ([key, expected]) => (JSON.parse(localStorage.getItem(key) || '{}').routines || []).length === expected,
  [STORAGE_KEY, count],
);

async function openHistory(page) {
  await page.click('#homeQuickActions [data-action="open-activities"]');
  await page.waitForSelector('#activitiesContent .activity-history-row--strength');
}

async function saveAsRoutine(page, name) {
  await page.click('#activitiesHeaderActions [data-action="toggle-activity-menu"]');
  await page.waitForSelector('#activityActionMenu [data-action="save-as-routine"]');
  await page.click('#activityActionMenu [data-action="save-as-routine"]');
  await page.waitForSelector('.cmodal-overlay [data-cm="input"]');
  const copy = await page.locator('.cmodal-overlay .cmodal__msg').innerText();
  ok(!/one tap/i.test(copy), 'the prompt does not promise a start action that does not exist yet');
  ok(/routine library/i.test(copy), 'the prompt names the routine library');
  await page.fill('.cmodal-overlay [data-cm="input"]', name);
  await page.click('.cmodal-overlay [data-cm="ok"]');
  await waitForRoutines(page, 1);
}

try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Sydney' });
  await context.addInitScript(([key, value]) => {
    // Seed ONLY on first load — the init script re-runs on reload, and clobbering
    // localStorage there would hide whether the routine actually persisted.
    if (!localStorage.getItem(key)) localStorage.setItem(key, value);
  }, [STORAGE_KEY, JSON.stringify(state)]);
  await context.addInitScript(pinClock, Date.parse('2026-11-20T09:00:00+11:00'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('#homeWeekDays .home-week-day').length === 7);

  await openHistory(page);
  await page.click('#activitiesContent .activity-history-row--strength');
  await page.waitForSelector('#activitiesScreen .activity-detail-shell');
  const before = await readState(page);

  await saveAsRoutine(page, 'Push day');
  let saved = await readState(page);
  const routine = (saved.routines || [])[0] || {};
  ok(saved.routines.length === 1, 'the routine is stored in its own root array');
  ok(routine.kind === 'routine', 'the record is discriminated from a program');
  ok(routine.name === 'Push day', 'the typed name is kept');
  ok(JSON.stringify(routine.days.mon.lifts) === JSON.stringify(['Bench Press', 'Deadlift']), 'exercise order matches the session');
  ok(routine.prescriptions.mon['Bench Press'].sets === 3, 'only the completed working sets are counted');
  ok(routine.prescriptions.mon['Bench Press'].weight === 105, 'the heaviest working load is kept');
  const routineText = JSON.stringify(routine);
  ok(!/"(c|isPR|note|notes|rir|rpe|failure)":/.test(routineText), 'completion, PR, effort and note fields never travel');
  ok(!/Session note must not travel/.test(routineText), 'session notes never travel');
  ok(JSON.stringify(saved.weeks) === JSON.stringify(before.weeks), 'logged weeks are byte-identical after saving');
  ok(saved.activeProgramId === before.activeProgramId, 'the active program is unchanged');
  ok(saved.currentWeek === before.currentWeek, 'the current program week is unchanged');
  ok(JSON.stringify(saved.customPrograms) === JSON.stringify(before.customPrograms), 'no program was created or edited');

  // Undo is the reversible half: the routine leaves state and storage.
  await page.waitForSelector('#activityUndoBar.show');
  await page.click('#activityUndoBar [data-action="undo-activity-delete"]');
  await waitForRoutines(page, 0);
  ok((await readState(page)).routines.length === 0, 'Undo removes the routine');

  // Save again and prove a reload keeps it (a real device write, not just memory).
  await saveAsRoutine(page, 'Push day');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('#homeWeekDays .home-week-day').length === 7);
  const reloaded = await readState(page);
  const reloadedRoutine = (reloaded.routines || [])[0] || null;
  ok((reloaded.routines || []).length === 1, 'the routine survives a reload');
  ok(JSON.stringify(reloadedRoutine?.days?.mon?.lifts) === JSON.stringify(['Bench Press', 'Deadlift']), 'the reloaded routine keeps its order');

  // A run is not a strength session, so its detail must not offer the action.
  await openHistory(page);
  await page.click('#activitiesContent .activity-history-row--run');
  await page.waitForSelector('#activitiesScreen .activity-detail-shell');
  await page.click('#activitiesHeaderActions [data-action="toggle-activity-menu"]');
  const runSaveCount = await page.locator('#activityActionMenu [data-action="save-as-routine"]').count();
  ok(runSaveCount === 0, 'a run detail has no Save-as-routine action');

  ok(errors.length === 0, `no page errors (${errors.join('; ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`\nroutines-browser-check: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nroutines-browser-check: PASS — save as routine, persistence, Undo and run isolation.');
