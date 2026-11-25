// =============================================================================
// REGRESSIONS FROM THE SECOND AUDIT
//
// Each case is one of the findings, with the concrete input that broke it.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { buildBodyweightModel } = await import('../js/metrics/bodyweight.js');
const { buildMuscleModel } = await import('../js/analytics/muscles.js');
const { buildPulseModel } = await import('../js/analytics/pulse.js');
const { buildBalanceModel } = await import('../js/analytics/balance.js');
const { buildProgressDashboard } = await import('../js/analytics/progress-dashboard.js');
const { resolveRange, previousRange } = await import('../js/analytics/ranges.js');
const { renderBalance } = await import('../js/analytics/views/view-balance.js');

const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const warm = (w) => ({ c: true, w: String(w), r: '10', type: 'W' });
const day = (date, lifts, extra = {}) => ({ dates: { mon: date }, lifts: { mon: lifts }, ...extra });
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });

test('a 30-day window is today-29 … today, and a future weigh-in is ignored', () => {
  const now = new Date('2026-11-24T12:00:00').getTime();
  const model = buildBodyweightModel({
    settings: { weightUnit: 'kg' },
    bodyWeightLog: [
      { date: '2026-10-25', weight: 90 },   // one day outside a 30-day window
      { date: '2026-10-26', weight: 82 },   // the first day inside it
      { date: '2026-11-20', weight: 80 },
      { date: '2026-12-01', weight: 70 },   // future: must not be "latest"
    ],
  }, { now, rangeDays: 30 });

  assert.deepEqual(model.points.map((point) => point.date), ['2026-10-26', '2026-11-20']);
  assert.equal(model.latest.date, '2026-11-20');
  assert.equal(model.latest.weight, 80);
});

test('a warm-up-only day with a saved duration is rest, not a session', () => {
  const state = stateWith([day('2026-11-23', { 'Back Squat': [warm(60), warm(80)] }, { gymStats: { mon: { time: '04:30' } } })]);
  const model = buildPulseModel(state, { todayISO: '2026-11-23' });
  const mon = model.week.days.find((entry) => entry.day === 'mon');
  assert.equal(mon.sessions, 0, 'warm-up sets are preparation, not training');
  assert.equal(mon.isRest, true);
});

test('a duration with NO logged sets still counts — that is an imported gym file', () => {
  const state = { weeks: { '1': { dates: { mon: '2026-11-23' }, lifts: {}, gymStats: { mon: { time: '45:00' } } } } };
  const model = buildPulseModel(state, { todayISO: '2026-11-23' });
  assert.equal(model.week.days.find((entry) => entry.day === 'mon').sessions, 1);
});

test('an unrated strength session still counts as strength, and the copy cannot lie', () => {
  const range = resolveRange('30d', '2026-11-24');
  const state = stateWith([
    // Two sessions with sets but no duration and no RPE, plus a timed run.
    day('2026-11-20', { 'Back Squat': [done(140)], 'Bench Press': [done(100)] }),
    { dates: { mon: '2026-11-21' }, runSessions: { mon: [{ dist: '5', time: '25:00', type: 'run' }] } },
  ]);
  const model = buildBalanceModel(state, { range, previous: previousRange(range) });
  assert.equal(model.hasStrength, true, 'sets are training even without a duration');
  assert.equal(model.hasEndurance, true);
  const html = renderBalance(model);
  assert.doesNotMatch(html, /No strength work/);
});

test('a capped weekly chart keeps the NEWEST buckets', () => {
  // 260 weekly sessions ENDING on the week that contains today — more than the
  // 104-bucket cap. (Weeks after today are correctly excluded as future.)
  const monday = new Date(Date.UTC(2026, 10, 23, 12)); // 2026-11-23
  const weeks = Array.from({ length: 260 }, (_, i) => {
    const date = new Date(monday.getTime() - (259 - i) * 7 * 86400000);
    return day(date.toISOString().slice(0, 10), { 'Back Squat': [done(140)] });
  });
  const model = buildMuscleModel(stateWith(weeks), { range: resolveRange('all', '2026-11-24'), grouping: 'week' });
  assert.equal(model.buckets.length, 104);
  const newest = weeks[weeks.length - 1].dates.mon;
  assert.equal(model.buckets.at(-1).key, newest, 'the most recent week must be charted');
});

test('a visible band with no data renders its empty state, never silently blank', () => {
  const state = {
    settings: {
      ui: { progress: { hidden: ['pulse', 'balance', 'muscles', 'exercises', 'body', 'fasting', 'reviews'] } },
    },
    // Strength data exists, but the only visible band is Endurance with no runs.
    weeks: { '1': { dates: { mon: '2026-11-23' }, lifts: { mon: { 'Bench Press': [done(100)] } } } },
  };
  const model = buildProgressDashboard(state, { todayISO: '2026-11-24' });
  assert.equal(model.visibleCount, 1, 'Endurance is not hidden');
  assert.equal(model.renderableCount, 1, 'it renders its honest empty state');
  assert.deepEqual(model.bands.map((b) => b.id), ['endurance']);
  assert.equal(model.bands[0].model.hasData, false);
});
