// =============================================================================
// G4 — the year heatmap model: time trained, never an invented duration
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildYearHeatmap, formatMinutes, heatLevel } from '../js/analytics/year-heatmap.js';

const set = { c: true, w: '100', r: '5' };

/** One week slot on `date`, with whatever the case needs. */
function week(date, { time, sets = true, runs = null, day = 'mon' } = {}) {
  return {
    activationId: 'act',
    programId: 'hybrid_engine',
    dates: { [day]: date },
    lifts: sets ? { [day]: { 'Back Squat': [set] } } : {},
    gymStats: time ? { [day]: { time } } : {},
    runs: {},
    runSessions: runs ? { [day]: runs } : {},
  };
}

const stateWith = (weeks) => ({
  weeks: Object.fromEntries(weeks.map((w, index) => [String(index + 1), w])),
});

const stateWithKeys = (entries) => ({ weeks: Object.fromEntries(entries) });

test('heat levels grade measured minutes only', () => {
  assert.equal(heatLevel(0), 0);
  assert.equal(heatLevel(29), 1);
  assert.equal(heatLevel(30), 2);
  assert.equal(heatLevel(59), 2);
  assert.equal(heatLevel(60), 3);
  assert.equal(heatLevel(90), 4);
  assert.equal(formatMinutes(45), '45 m');
  assert.equal(formatMinutes(60), '1 h');
  assert.equal(formatMinutes(95), '1 h 35 m');
});

test('a strength session shades by its recorded gym time', () => {
  const model = buildYearHeatmap(stateWith([week('2026-11-04', { time: '45:00' })]), { endISO: '2026-11-15' });
  assert.equal(model.startISO, '2025-12-01');
  assert.equal(model.endISO, '2026-11-15');
  assert.equal(model.rangeLabel, 'Dec 2025 – Nov 2026');
  assert.equal(model.activeDays, 1);
  assert.equal(model.totalMinutes, 45);
  const november = model.months.find((month) => month.key === '2026-11');
  const day = november.cells.find((cell) => cell?.date === '2026-11-04');
  assert.equal(day.minutes, 45);
  assert.equal(day.level, 2);
  assert.equal(day.sessions, 1);
  assert.equal(day.measured, true);
});

test('a run-only day is one session, never two, and uses the run time', () => {
  const run = { sessionId: 'run_a', source: 'gps', localDate: '2026-11-05', dist: '5', time: '25:00' };
  const model = buildYearHeatmap(stateWith([
    week('2026-11-05', { sets: false, runs: [run] }),
  ]), { endISO: '2026-11-15' });
  const day = model.months.find((month) => month.key === '2026-11')?.cells.find((cell) => cell?.date === '2026-11-05');
  assert.equal(day.sessions, 1);
  assert.equal(day.minutes, 25);
  assert.equal(day.level, 1);
});

test('a mixed day adds strength and run time and counts both sessions', () => {
  const run = { sessionId: 'run_b', source: 'manual', localDate: '2026-11-06', dist: '3', time: '20:00' };
  const model = buildYearHeatmap(stateWith([
    week('2026-11-06', { time: '40:00', runs: [run] }),
  ]), { endISO: '2026-11-15' });
  const day = model.months.find((month) => month.key === '2026-11')?.cells.find((cell) => cell?.date === '2026-11-06');
  assert.equal(day.minutes, 60);
  assert.equal(day.level, 3);
  assert.equal(day.sessions, 2);
});

test('training without a recorded time is logged, not shaded as a short session', () => {
  const model = buildYearHeatmap(stateWith([week('2026-11-07', { time: null })]), { endISO: '2026-11-15' });
  const day = model.months.find((month) => month.key === '2026-11')?.cells.find((cell) => cell?.date === '2026-11-07');
  assert.equal(model.totalMinutes, 0);
  assert.equal(model.activeDays, 1);
  assert.equal(model.unmeasuredDays, 1);
  assert.equal(day.sessions, 1);
  assert.equal(day.minutes, 0);
  assert.equal(day.measured, false);
  assert.equal(day.level, 0, 'no duration means no shade');
});

test('dates outside the rolling twelve months are not counted', () => {
  const model = buildYearHeatmap(stateWith([
    week('2025-10-01', { time: '60:00' }),
    week('2026-11-04', { time: '30:00' }),
  ]), { endISO: '2026-11-15' });
  assert.equal(model.activeDays, 1);
  assert.equal(model.totalMinutes, 30);
});

test('archived weeks count, because the index reads every stored week', () => {
  const model = buildYearHeatmap(stateWithKeys([
    ['arch:old:3', week('2026-11-04', { time: '45:00' })],
  ]), { endISO: '2026-11-15' });
  assert.equal(model.activeDays, 1);
  assert.equal(model.totalMinutes, 45);
});

test('days after today are future cells, not empty training days', () => {
  const model = buildYearHeatmap(stateWith([week('2026-11-04', { time: '45:00' })]), { endISO: '2026-11-15' });
  const november = model.months.find((month) => month.key === '2026-11');
  const past = november.cells.find((cell) => cell?.date === '2026-11-15');
  const future = november.cells.find((cell) => cell?.date === '2026-11-16');
  assert.equal(past.future, false);
  assert.equal(future.future, true);
});

test('the week starts on the athlete\'s chosen day', () => {
  const sunday = buildYearHeatmap(stateWith([]), { endISO: '2026-11-15', weekStartDay: 'sun' });
  assert.deepEqual(sunday.dayLabels, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const monday = buildYearHeatmap(stateWith([]), { endISO: '2026-11-15', weekStartDay: 'mon' });
  assert.deepEqual(monday.dayLabels, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const novSun = sunday.months.find((month) => month.key === '2026-11').leading;
  const novMon = monday.months.find((month) => month.key === '2026-11').leading;
  assert.equal(novSun, 0, '1 Nov 2026 is a Sunday');
  assert.equal(novMon, 6, 'a Monday-first November 2026 starts with six leading pads');
});

test('an empty account has no data and twelve real months', () => {
  const model = buildYearHeatmap(stateWith([]), { endISO: '2026-11-15' });
  assert.equal(model.hasData, false);
  assert.equal(model.activeDays, 0);
  assert.equal(model.months.length, 12);
  assert.equal(model.months[0].key, '2025-12');
  assert.equal(model.months[11].key, '2026-11');
});
