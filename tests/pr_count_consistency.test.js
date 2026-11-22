// =============================================================================
// PR COUNT + RULE CONSISTENCY — one PR is one LIFT, and one rule decides it.
//
// Home, Progress and the weekly review count DISTINCT LIFTS with a record, not
// record sets. This file pins that unit at every surface, plus the shared rule
// on the two former rogues (a tie is not a PR, a 0.5% "gain" is not a PR) and
// the saved-edit re-derivation.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionSummary, countPrLifts, sessionSummaryHTML } from '../js/home/session-summary.js';
import { restampSessionRecords } from '../js/strength/records.js';
import { buildSessionReview, reviewHighlightLine } from '../js/workout/session-review.js';
import { generateStrengthInsights } from '../js/analytics/insights/insight-engine.js';
import { computeStrengthAnalytics } from '../js/analytics/calculations/strength-calcs.js';
import { buildExerciseDetailModel } from '../js/analytics/exercise-detail.js';
import { calendarStrengthSummary } from '../js/analytics/strength-calendar.js';

const work = (w, r, extra = {}) => ({ c: true, w: String(w), r: String(r), ...extra });
const hold = (sec, extra = {}) => ({ c: true, w: '', sec: String(sec), mode: 'time', ...extra });
const carry = (dist, extra = {}) => ({ c: true, w: '20', dist: String(dist), mode: 'distance', ...extra });

function stateWith(weeks, extra = {}) {
  return { currentWeek: '2', activeActivationId: 'a1', weeks, exerciseStats: {}, settings: {}, ...extra };
}

// ── Home counts lifts ───────────────────────────────────────────────────────

test('three PR sets on one lift are ONE e1RM PR lift on Home', () => {
  const lifts = {
    'Back Squat': [
      work(110, 5, { isPR: true, prKind: 'e1rm' }),
      work(115, 3, { isPR: true, prKind: 'e1rm' }),
      work(120, 1, { isPR: true, prKind: 'e1rm' }),
    ],
    'Bench Press': [work(80, 5, { isPR: true, prKind: 'e1rm' })],
    'Barbell Row': [work(70, 8)],
  };
  assert.equal(countPrLifts(lifts), 2, 'two distinct lifts, not four PR sets');
  const state = stateWith({ '2': { dates: { mon: '2026-07-06' }, lifts: { mon: lifts } } });
  const summary = buildSessionSummary(state, '2', 'mon');
  assert.equal(summary.prs, 2);
  const html = sessionSummaryHTML(summary);
  assert.match(html, /2 e1RM PR lifts/);
  assert.doesNotMatch(html, /4 PR/);
});

test('hold, carry and rep records keep their badges but do not join the e1RM count', () => {
  // Progress counts e1RM lifts; a recap may show all four shapes. Counting the
  // shape records here would make Home disagree with Progress for the same week.
  const lifts = {
    'Back Squat': [work(110, 5, { isPR: true, prKind: 'e1rm' })],
    Plank: [{ c: true, w: '', sec: '60', mode: 'time', isPR: true, prKind: 'hold' }],
    'Farmer Carry': [{ c: true, w: '20', dist: '55', mode: 'distance', isPR: true, prKind: 'carry' }],
    'Sled Push': [work(60, 20, { isPR: true, prKind: 'reps' })],
  };
  assert.equal(countPrLifts(lifts), 1, 'one e1RM lift, whatever else the recap badges');
});

test('Home and Progress count the SAME e1RM PR lifts for a week', () => {
  const state = stateWith({
    '1': {
      dates: { mon: '2026-06-01' },
      lifts: { mon: { 'Back Squat': [work(100, 5)], Plank: [hold(45)] } },
    },
    '2': {
      dates: { mon: '2026-06-08' },
      lifts: {
        mon: {
          'Back Squat': [work(110, 5, { isPR: true, prKind: 'e1rm' })],
          Plank: [hold(60, { isPR: true, prKind: 'hold' })],
        },
      },
    },
  });
  const home = buildSessionSummary(state, '2', 'mon');
  const progress = calendarStrengthSummary(state, { weekStart: '2026-06-08' });
  assert.equal(home.prs, 1, 'the Hold PR keeps its badge but is not an e1RM PR lift');
  assert.equal(progress.prCount, 1);
});

test('a warm-up carrying a legacy isPR stamp does not count as a PR lift', () => {
  const lifts = { 'Back Squat': [work(60, 5, { type: 'W', isPR: true })] };
  assert.equal(countPrLifts(lifts), 0);
});

test('aliases of one exercise are one PR lift', () => {
  const lifts = {
    'DB Bench Press': [work(30, 8, { isPR: true })],
    'Dumbbell Bench Press': [work(32.5, 8, { isPR: true })],
  };
  assert.equal(countPrLifts(lifts), 1);
});

// ── The former rogue rules ──────────────────────────────────────────────────

function progression(overrides = {}) {
  return {
    'Back Squat': {
      hasData: true, series: [100, 105], currentWeekPR: 105,
      lifetimePR: 105, priorBestMax: 100, roi: 0.5, projection: 120, ...overrides,
    },
  };
}

test('a tie with a prior best produces no "new estimated 1RM" insight', () => {
  const tied = progression({ currentWeekPR: 105, lifetimePR: 105, priorBestMax: 105 });
  const insights = generateStrengthInsights({ volSeries: [], liftProgression: tied });
  assert.equal(insights.some((i) => /New estimated 1RM/.test(i.text)), false);
});

test('a 0.5% regression never reads as a new best', () => {
  // The old `currentWeekPR >= lifetimePR * 0.995` rule fired here.
  const regressed = progression({ currentWeekPR: 104.4, lifetimePR: 105, priorBestMax: 105 });
  const insights = generateStrengthInsights({ volSeries: [], liftProgression: regressed });
  assert.equal(insights.some((i) => /New estimated 1RM/.test(i.text)), false);
});

test('a genuine gain over the prior best still produces the insight', () => {
  const insights = generateStrengthInsights({ volSeries: [], liftProgression: progression() });
  assert.equal(insights.some((i) => /New estimated 1RM on Back Squat/.test(i.text)), true);
});

test('the Strength progression payload exposes the prior best it must beat', () => {
  const state = stateWith({
    '1': { dates: { mon: '2026-06-29' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    '2': { dates: { mon: '2026-07-06' }, lifts: { mon: { 'Back Squat': [work(105, 5)] } } },
  });
  const model = computeStrengthAnalytics(state, ['mon'], 2);
  assert.ok(model.liftProgression['Back Squat']);
  assert.ok(model.liftProgression['Back Squat'].priorBestMax > 0);
  assert.ok(model.liftProgression['Back Squat'].currentWeekPR > model.liftProgression['Back Squat'].priorBestMax);
});

// ── Saved-edit re-derivation ────────────────────────────────────────────────

test('editing a saved PR down clears it and rebuilding exerciseStats follows', () => {
  const state = stateWith({
    hist: { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    cur: { dates: { mon: '2026-07-08' }, lifts: { mon: { 'Back Squat': [work(110, 5, { isPR: true, prKind: 'e1rm' })] } } },
  });
  assert.equal(restampSessionRecords(state, 'cur', 'mon'), 1);
  const squat = state.weeks.cur.lifts.mon['Back Squat'][0];
  squat.w = '90';
  assert.equal(restampSessionRecords(state, 'cur', 'mon'), 0);
  assert.equal(squat.isPR, undefined);
  assert.equal(squat.prKind, undefined);
});

test('raising a non-PR set into a new best awards it on save', () => {
  const state = stateWith({
    hist: { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    cur: { dates: { mon: '2026-07-08' }, lifts: { mon: { 'Back Squat': [work(90, 5)] } } },
  });
  const squat = state.weeks.cur.lifts.mon['Back Squat'][0];
  assert.equal(restampSessionRecords(state, 'cur', 'mon'), 0);
  squat.w = '115';
  assert.equal(restampSessionRecords(state, 'cur', 'mon'), 1);
  assert.equal(squat.isPR, true);
  assert.equal(squat.prKind, 'e1rm');
});

test('restamping leaves other days untouched', () => {
  const other = work(130, 5, { isPR: true, prKind: 'e1rm' });
  const state = stateWith({
    hist: { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    cur: {
      dates: { mon: '2026-07-08', wed: '2026-07-10' },
      lifts: { mon: { 'Back Squat': [work(110, 5, { isPR: true })] }, wed: { 'Back Squat': [other] } },
    },
  });
  restampSessionRecords(state, 'cur', 'mon');
  assert.equal(state.weeks.cur.lifts.wed['Back Squat'][0].isPR, true);
});

// ── Finish-review highlights ────────────────────────────────────────────────

test('a hold session highlights a Hold PR and never invents an e1RM', () => {
  const state = stateWith({
    hist: { dates: { mon: '2026-06-01' }, lifts: { mon: { Plank: [hold(45)] } } },
    cur: { dates: { mon: '2026-07-08' }, lifts: { mon: { Plank: [hold(60)] } } },
  });
  const review = buildSessionReview(state, { weekKey: 'cur', day: 'mon' });
  assert.equal(review.highlights.length, 1);
  const [h] = review.highlights;
  assert.equal(h.kind, 'hold');
  assert.equal(h.label, 'Hold PR');
  assert.equal(h.value, 60);
  assert.equal(h.e1rm, 0);
  assert.match(reviewHighlightLine(review), /\+15s hold/);
});

test('a carry session highlights a Carry PR', () => {
  const state = stateWith({
    hist: { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Farmer Carry': [carry(40)] } } },
    cur: { dates: { mon: '2026-07-08' }, lifts: { mon: { 'Farmer Carry': [carry(55)] } } },
  });
  const review = buildSessionReview(state, { weekKey: 'cur', day: 'mon' });
  assert.equal(review.highlights.length, 1);
  assert.equal(review.highlights[0].kind, 'carry');
  assert.equal(review.highlights[0].label, 'Carry PR');
  assert.equal(review.highlights[0].value, 55);
});

test('the finish review sees a rep record at the lighter load', () => {
  // 60×20 + 80×15 vs prior 60×10 + 80×20. The 80 kg bucket is not a record,
  // the 60 kg one is, and its delta must be measured against 10 reps.
  const state = stateWith({
    hist: { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Sled Push': [work(60, 10), work(80, 20)] } } },
    cur: { dates: { mon: '2026-07-08' }, lifts: { mon: { 'Sled Push': [work(60, 20), work(80, 15)] } } },
  });
  const review = buildSessionReview(state, { weekKey: 'cur', day: 'mon' });
  const reps = review.highlights.filter((entry) => entry.kind === 'reps');
  assert.equal(reps.length, 1);
  assert.equal(reps[0].load, 60);
  assert.equal(reps[0].previousBest, 10);
  assert.equal(reps[0].delta, 10);
  assert.match(reviewHighlightLine(review), /\+10 reps at this load/);
});

test('bodyweight work is silent in the finish review', () => {
  const state = stateWith({
    hist: { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Pull-Up': [work(0, 10, { bw: true })] } } },
    cur: { dates: { mon: '2026-07-08' }, lifts: { mon: { 'Pull-Up': [work(0, 15, { bw: true })] } } },
  });
  const review = buildSessionReview(state, { weekKey: 'cur', day: 'mon' });
  assert.deepEqual(review.highlights, []);
  assert.equal(review.exercisesWorked, 1, 'the work still counts as work');
});

// ── Exercise drilldown ──────────────────────────────────────────────────────

test('exercise detail uses the shared rule: a tie is not a PR', () => {
  const state = stateWith({
    '1': { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    '2': { dates: { mon: '2026-06-08' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    '3': { dates: { mon: '2026-06-15' }, lifts: { mon: { 'Back Squat': [work(101, 5)] } } },
  });
  const model = buildExerciseDetailModel(state, 'Back Squat', { range: 'all' });
  const byDate = Object.fromEntries(model.sessions.map((row) => [row.date, row.isPr]));
  assert.equal(byDate['2026-06-08'], false, 'matching the baseline is not a record');
  assert.equal(byDate['2026-06-15'], true, 'beating it by more than the epsilon is');
});

test('exercise detail compares holds with holds and carries with carries', () => {
  const state = stateWith({
    '1': { dates: { mon: '2026-06-01' }, lifts: { mon: { Plank: [hold(45)], 'Farmer Carry': [carry(40)] } } },
    '2': { dates: { mon: '2026-06-08' }, lifts: { mon: { Plank: [hold(60)], 'Farmer Carry': [carry(55)] } } },
  });
  const plank = buildExerciseDetailModel(state, 'Plank', { range: 'all' });
  assert.equal(plank.sessions[0].isPr, true);
  assert.equal(plank.sessions[0].top.sec, 60);
  const carryModel = buildExerciseDetailModel(state, 'Farmer Carry', { range: 'all' });
  assert.equal(carryModel.sessions[0].isPr, true);
  assert.equal(carryModel.sessions[0].top.dist, 55);
});

test('exercise detail marks a lighter-load rep record as a PR', () => {
  const state = stateWith({
    '1': { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Sled Push': [work(60, 10), work(80, 20)] } } },
    '2': { dates: { mon: '2026-06-08' }, lifts: { mon: { 'Sled Push': [work(60, 20), work(80, 15)] } } },
  });
  const model = buildExerciseDetailModel(state, 'Sled Push', { range: 'all' });
  const newest = model.sessions[0];
  assert.equal(newest.isPr, true, 'the 60 kg bucket beats 60×10 even though 80×15 does not beat 80×20');
});
