// =============================================================================
// H6a — best efforts and race estimates (read-only)
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BEST_EFFORT_TARGETS,
  bestEffortForRun,
  buildBestEfforts,
  buildRaceEstimates,
  formatEffortPace,
  formatEffortTime,
  splitPoints,
} from '../js/analytics/best-efforts.js';

const LAPS = [300, 280, 320, 290, 310];
const run = (localDate, dist, time, splits, extra = {}) => ({
  sessionId: `s_${localDate}`,
  source: 'gps',
  localDate,
  dist: String(dist),
  time,
  splits,
  ...extra,
});
const gpsLaps = (times) => times.map((sec, i) => ({ lap: i + 1, dist: 1.0, time: sec }));
const stateWith = (runs) => ({
  weeks: {
    '1': { dates: { mon: runs[0].localDate }, runSessions: { mon: runs } },
  },
});

test('GPS splits are km and cumulative points add up', () => {
  const points = splitPoints(run('2026-11-20', 5, '25:00', gpsLaps(LAPS)));
  assert.equal(points.length, 6);
  assert.deepEqual(points[points.length - 1], { d: 5, t: 1500 });
});

test('FIT laps are metres, not kilometres', () => {
  const fitLaps = LAPS.map((sec, i) => ({ lap: i + 1, dist: 1000, time: sec }));
  const points = splitPoints(run('2026-11-20', 5, '25:00', fitLaps, { source: 'fit' }));
  assert.deepEqual(points[points.length - 1], { d: 5, t: 1500 });
});

test('best 1 km is the fastest lap; best 5 km is the whole run', () => {
  const lapRun = run('2026-11-20', 5, '25:00', gpsLaps(LAPS));
  const oneK = bestEffortForRun(lapRun, 1);
  assert.equal(Math.round(oneK.seconds), 280);
  const fiveK = bestEffortForRun(lapRun, 5);
  assert.equal(Math.round(fiveK.seconds), 1500);
  assert.equal(bestEffortForRun(lapRun, 10), null);
});

test('1 mile interpolates on the final lap', () => {
  const lapRun = run('2026-11-20', 5, '25:00', gpsLaps(LAPS));
  const mile = bestEffortForRun(lapRun, 1.609344);
  assert.equal(Math.round(mile.seconds), 471, '300 + 0.609344 × 280');
  assert.equal(formatEffortTime(mile.seconds), '7:51');
});

test('all-time best picks the faster run and ignores walks and short runs', () => {
  const efforts = buildBestEfforts(stateWith([
    run('2026-11-19', 5, '25:00', gpsLaps(LAPS)),
    run('2026-11-20', 5, '24:00', gpsLaps([290, 270, 310, 280, 290])),
    run('2026-11-21', 5, '20:00', gpsLaps([240, 240, 240, 240, 240]), { type: 'walk' }),
    run('2026-11-22', 3, '15:00', gpsLaps([300, 300, 300])),
  ]));
  assert.equal(efforts.hasData, true);
  const km = efforts.targets.find((target) => target.id === '1k');
  assert.equal(Math.round(km.best.seconds), 270);
  assert.equal(km.best.date, '2026-11-20');
  const five = efforts.targets.find((target) => target.id === '5k');
  assert.equal(Math.round(five.best.seconds), 1440, 'the walk never wins');
  const ten = efforts.targets.find((target) => target.id === '10k');
  assert.equal(ten.best, null);
  assert.equal(ten.timeLabel, '—');
});

test('a run without splits produces no effort and says why', () => {
  const efforts = buildBestEfforts(stateWith([run('2026-11-20', 5, '25:00', [])]));
  assert.equal(efforts.hasData, false);
  assert.match(efforts.note, /recorded splits/);
  assert.ok(BEST_EFFORT_TARGETS.every((target) => target.km > 0));
});

test('race estimates use the shortest measured effort of at least 3 km', () => {
  const efforts = buildBestEfforts(stateWith([run('2026-11-20', 5, '25:00', gpsLaps(LAPS))]));
  const estimates = buildRaceEstimates(efforts);
  assert.equal(estimates.hasData, true);
  assert.equal(estimates.basis.label, '5 km');
  assert.equal(estimates.basis.date, '2026-11-20');
  const five = estimates.rows.find((row) => row.id === '5k');
  assert.equal(five.measured, true);
  assert.equal(five.timeLabel, '25:00');
  const ten = estimates.rows.find((row) => row.id === '10k');
  assert.equal(ten.measured, false);
  assert.equal(ten.timeLabel, '52:07', '25:00 × 2^1.06');
  assert.ok(estimates.rows.every((row) => /^\d+:\d\d(:\d\d)?$/.test(row.timeLabel)));
});

test('no effort of 3 km or more hides the estimates instead of guessing', () => {
  const efforts = buildBestEfforts(stateWith([run('2026-11-20', 2, '10:00', gpsLaps([300, 300]))]));
  const estimates = buildRaceEstimates(efforts);
  assert.equal(estimates.hasData, false);
  assert.deepEqual(estimates.rows, []);
  assert.equal(formatEffortPace(300, 1), '5:00 /km');
});

test('an empty history is honest', () => {
  const efforts = buildBestEfforts({ weeks: {} });
  assert.equal(efforts.hasData, false);
  assert.match(efforts.note, /Log a run/);
  assert.equal(buildRaceEstimates(efforts).hasData, false);
});
