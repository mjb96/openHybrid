// =============================================================================
// YEAR IN REVIEW — P12 contract.
//
// The calendar-year recap must be date-strict (a session belongs to the year of
// its REAL stamped date, not to a program week), duplicate-safe (a copied slot
// cannot double-count), honest about sessions vs training days, and seasonal.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yearReviewYear, buildYearInReview } from '../js/brain/year-review.js';

const work = (w, r) => ({ c: true, w: String(w), r: String(r) });
const hold = (sec) => ({ c: true, mode: 'time', sec: String(sec) });
const carry = (dist) => ({ c: true, mode: 'distance', dist: String(dist) });
const stateOf = (weeks, settings = {}) => ({ settings, weeks });

test('the section is seasonal: December recaps this year, January the one just ended', () => {
  assert.equal(yearReviewYear('2026-12-01'), 2026);
  assert.equal(yearReviewYear('2026-12-31'), 2026);
  assert.equal(yearReviewYear('2027-01-01'), 2026);
  assert.equal(yearReviewYear('2027-01-31'), 2026);
  assert.equal(yearReviewYear('2026-11-30'), null);
  assert.equal(yearReviewYear('2026-02-01'), null);
  assert.equal(yearReviewYear('2026-06-15'), null);
});

test('year boundaries follow the stamped date: 31 Dec prior year is excluded, 1 Jan included', () => {
  const state = stateOf({
    '1': { dates: { mon: '2025-12-31' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    '2': { dates: { mon: '2026-01-01' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.totals.sessions, 1);
  assert.equal(review.totals.activeDays, 1);
  assert.equal(review.totals.workingSets, 1);
  assert.equal(review.months[0].sessions, 1, 'January 2026 holds the 1 Jan session');
  assert.equal(review.months[11].sessions, 0, '31 Dec 2025 never falls into December 2026');
});

test('a strength + run day is two sessions on one active day', () => {
  const state = stateOf({
    '1': {
      dates: { mon: '2026-03-10' },
      lifts: { mon: { 'Bench Press': [work(100, 5)] } },
      runs: { mon: { dist: '5.0', time: '25:00' } },
    },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.totals.sessions, 2);
  assert.equal(review.totals.activeDays, 1);
  assert.equal(review.months[2].sessions, 2);
});

test('a copied slot on one date counts once, two different program days count twice', () => {
  const copied = stateOf({
    '1': { dates: { mon: '2026-03-10' }, lifts: { mon: { 'Bench Press': [work(100, 5)] } } },
    'arch:old:1': { dates: { mon: '2026-03-10' }, lifts: { mon: { 'Bench Press': [work(100, 5)] } } },
  });
  const once = buildYearInReview(copied, [], { year: 2026, today: '2026-12-15' });
  assert.equal(once.totals.sessions, 1);
  assert.equal(once.totals.activeDays, 1);

  const twoDays = stateOf({
    '1': {
      dates: { mon: '2026-03-10', tue: '2026-03-10' },
      lifts: {
        mon: { 'Bench Press': [work(100, 5)] },
        tue: { 'Back Squat': [work(120, 5)] },
      },
    },
  });
  const twice = buildYearInReview(twoDays, [], { year: 2026, today: '2026-12-15' });
  assert.equal(twice.totals.sessions, 2, 'two programmed days completed on one date are two sessions');
  assert.equal(twice.totals.activeDays, 1);
});

test('two runs on one day add their distance instead of replacing it', () => {
  const state = stateOf({
    '1': {
      dates: { mon: '2026-04-10' },
      runSessions: { mon: [
        { sessionId: 'r1', dist: '5.0', time: '25:00' },
        { sessionId: 'r2', dist: '10.0', time: '55:00' },
      ] },
    },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.totals.sessions, 2);
  assert.equal(review.totals.distanceKm, 15);
});

test('two legacy run objects (no runSessions) still sum their distance', () => {
  const state = stateOf({
    '1': {
      dates: { mon: '2026-05-10', tue: '2026-05-10' },
      runs: {
        mon: { dist: '5.0', time: '25:00' },
        tue: { dist: '10.0', time: '55:00' },
      },
    },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.totals.sessions, 2);
  assert.equal(review.totals.distanceKm, 15);
  assert.equal(review.totals.activeDays, 1);
});

test('a gym-time-only session counts even with no sets or runs', () => {
  const state = stateOf({
    '1': {
      dates: { mon: '2026-04-10' },
      gymStats: { mon: { time: '45:00' } },
    },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.hasData, true);
  assert.equal(review.totals.sessions, 1);
  assert.equal(review.totals.activeDays, 1);
  assert.equal(review.totals.activeMonths, 1);
  assert.equal(review.totals.workingSets, 0);
  assert.equal(review.totals.volumeKg, 0);
  assert.equal(review.months[3].sessions, 1);
});

test('a first-ever lift is a baseline; a later improvement is a PR; a tie is not', () => {
  const baseline = stateOf({
    '1': { dates: { mon: '2026-01-10' }, lifts: { mon: { 'Bench Press': [work(100, 5)] } } },
  });
  const first = buildYearInReview(baseline, [], { year: 2026, today: '2026-12-15' });
  assert.equal(first.totals.prCount, 0);
  assert.deepEqual(first.prs, []);

  const state = stateOf({
    '1': { dates: { mon: '2026-01-10' }, lifts: { mon: { 'Bench Press': [work(100, 5)] } } },
    '2': { dates: { mon: '2026-06-10' }, lifts: { mon: { 'Bench Press': [work(110, 5)] } } },
    '3': { dates: { mon: '2026-09-10' }, lifts: { mon: { 'Bench Press': [work(110, 5)] } } },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.totals.prCount, 1);
  assert.equal(review.prs.length, 1);
  assert.equal(review.prs[0].lift, 'Barbell Bench Press', 'PR names are canonical');
  assert.equal(review.prs[0].date, '2026-06-10');
  assert.equal(review.prs[0].e1rm, 128);
});

test('a lift can set more than one annual PR; the count is the event count', () => {
  const state = stateOf({
    '1': { dates: { mon: '2026-01-10' }, lifts: { mon: { 'Bench Press': [work(100, 5)] } } },
    '2': { dates: { mon: '2026-03-10' }, lifts: { mon: { 'Bench Press': [work(110, 5)] } } },
    '3': { dates: { mon: '2026-06-10' }, lifts: { mon: { 'Bench Press': [work(120, 5)] } } },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.totals.prCount, 2);
  assert.deepEqual(review.prs.map((pr) => pr.date), ['2026-06-10', '2026-03-10']);
  assert.deepEqual(review.prs.map((pr) => pr.e1rm), [140, 128]);
});

test('a prior-year baseline makes this year’s improvement a real PR', () => {
  const state = stateOf({
    '1': { dates: { mon: '2025-12-10' }, lifts: { mon: { 'Bench Press': [work(100, 5)] } } },
    '2': { dates: { mon: '2026-02-10' }, lifts: { mon: { 'Bench Press': [work(105, 5)] } } },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.totals.prCount, 1);
  assert.equal(review.prs[0].date, '2026-02-10');
  assert.equal(review.prs[0].e1rm, 123);
  assert.equal(review.prs[0].previousBest, 117);
});

test('a December PR and a higher January set each count in their own year', () => {
  const state = stateOf({
    '1': { dates: { mon: '2025-01-10' }, lifts: { mon: { 'Bench Press': [work(100, 5)] } } },
    '2': { dates: { mon: '2025-12-30' }, lifts: { mon: { 'Bench Press': [work(110, 5)] } } },
    '3': { dates: { mon: '2026-01-02' }, lifts: { mon: { 'Bench Press': [work(120, 5)] } } },
  });
  const prior = buildYearInReview(state, [], { year: 2025, today: '2026-12-15' });
  assert.equal(prior.totals.prCount, 1);
  assert.equal(prior.prs[0].date, '2025-12-30');
  assert.equal(prior.prs[0].e1rm, 128);

  const current = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(current.totals.prCount, 1);
  assert.equal(current.prs[0].date, '2026-01-02');
  assert.equal(current.prs[0].e1rm, 140);
  assert.equal(current.prs[0].previousBest, 128);
});

test('two same-date sessions contribute to one date best, not two PRs', () => {
  const state = stateOf({
    '1': { dates: { mon: '2025-12-01' }, lifts: { mon: { 'Bench Press': [work(90, 5)] } } },
    '2': {
      dates: { mon: '2026-03-10', tue: '2026-03-10' },
      lifts: {
        mon: { 'Bench Press': [work(100, 5)] },
        tue: { 'Bench Press': [work(110, 5)] },
      },
    },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.prs.length, 1);
  assert.equal(review.prs[0].date, '2026-03-10');
  assert.equal(review.prs[0].e1rm, 128, 'the best of both same-date sessions is the date best');
  assert.equal(review.prs[0].previousBest, 105, 'the prior date (not the same date) is the baseline');
  assert.equal(review.totals.prCount, 1);
});

test('best month is the busiest, then the heaviest, then the earlier month', () => {
  const tied = stateOf({
    '1': {
      dates: { mon: '2026-01-10' },
      lifts: { mon: { 'Bench Press': [work(100, 5)] } },
      runs: { mon: { dist: '5.0', time: '25:00' } },
    },
    '2': {
      dates: { mon: '2026-02-10' },
      lifts: { mon: { 'Bench Press': [work(100, 5)] } },
      runs: { mon: { dist: '5.0', time: '25:00' } },
    },
  });
  const tie = buildYearInReview(tied, [], { year: 2026, today: '2026-12-15' });
  assert.equal(tie.bestMonth.month, 1, 'equal sessions AND volume break toward the earlier month');
  assert.equal(tie.totals.activeMonths, 2);

  const heavier = stateOf({
    '1': {
      dates: { mon: '2026-01-10' },
      lifts: { mon: { 'Bench Press': [work(100, 5)] } },
      runs: { mon: { dist: '5.0', time: '25:00' } },
    },
    '2': {
      dates: { mon: '2026-02-10' },
      lifts: { mon: { 'Bench Press': [work(110, 5)] } },
      runs: { mon: { dist: '5.0', time: '25:00' } },
    },
  });
  const heavy = buildYearInReview(heavier, [], { year: 2026, today: '2026-12-15' });
  assert.equal(heavy.bestMonth.month, 2, 'equal sessions are broken by volume');
});

test('the longest streak is measured inside the year; a prior-year streak cannot extend it', () => {
  const state = stateOf({
    'a': { dates: { mon: '2025-12-30' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    'b': { dates: { tue: '2025-12-31' }, lifts: { tue: { 'Back Squat': [work(100, 5)] } } },
    'c': { dates: { wed: '2026-01-01' }, lifts: { wed: { 'Back Squat': [work(100, 5)] } } },
    'd': { dates: { thu: '2026-01-02' }, lifts: { thu: { 'Back Squat': [work(100, 5)] } } },
    'e': { dates: { fri: '2026-01-03' }, lifts: { fri: { 'Back Squat': [work(100, 5)] } } },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.totals.longestStreak, 3, '30–31 Dec 2025 must not make the January streak five');

  const priorOnly = stateOf({
    'a': { dates: { mon: '2025-12-30' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    'b': { dates: { tue: '2025-12-31' }, lifts: { tue: { 'Back Squat': [work(100, 5)] } } },
  });
  const none = buildYearInReview(priorOnly, [], { year: 2026, today: '2026-12-15' });
  assert.equal(none.hasData, false);
  assert.equal(none.totals.longestStreak, 0);
});

test('the current year is partial until 31 December; a finished year is complete', () => {
  const partial = buildYearInReview(stateOf({}), [], { year: 2026, today: '2026-11-23' });
  assert.equal(partial.isPartial, true);
  assert.equal(partial.rangeLabel, 'Jan 1 – Nov 23, 2026');

  const tooEarly = buildYearInReview(stateOf({}), [], { year: 2026, today: '2026-11-30' });
  assert.equal(tooEarly.isPartial, true);
  assert.equal(tooEarly.rangeLabel, 'Jan 1 – Nov 30, 2026');

  const finished = buildYearInReview(stateOf({}), [], { year: 2025, today: '2026-11-23' });
  assert.equal(finished.isPartial, false);
  assert.equal(finished.rangeLabel, 'Jan 1 – Dec 31, 2025');

  const lastDay = buildYearInReview(stateOf({}), [], { year: 2026, today: '2026-12-31' });
  assert.equal(lastDay.isPartial, false);
  assert.equal(lastDay.rangeLabel, 'Jan 1 – Dec 31, 2026');
});

test('an empty year is honest: no best month, PRs or fabricated totals', () => {
  const review = buildYearInReview(stateOf({}), [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.hasData, false);
  assert.equal(review.totals.sessions, 0);
  assert.equal(review.totals.activeDays, 0);
  assert.equal(review.totals.activeMonths, 0);
  assert.equal(review.totals.workingSets, 0);
  assert.equal(review.totals.volumeKg, 0);
  assert.equal(review.totals.distanceKm, 0);
  assert.equal(review.totals.prCount, 0);
  assert.equal(review.totals.longestStreak, 0);
  assert.equal(review.bestMonth, null);
  assert.deepEqual(review.prs, []);
  assert.deepEqual(review.topExercises, []);
  assert.equal(review.months.length, 12);
  assert.ok(review.months.every((month) => month.sessions === 0 && month.volumeKg === 0));
});

test('top exercises use canonical names, cap at five, and count holds/carries without volume', () => {
  const state = stateOf({
    '1': {
      dates: { mon: '2026-02-10' },
      lifts: { mon: {
        'DB Bench Press': [work(30, 10), work(30, 10), work(30, 10)],
        'Plank Hold': [hold(60), hold(45)],
        'Farmers Carry': [carry(40), carry(40)],
        'Bench Press': [work(100, 5)],
        'Back Squat': [work(100, 5)],
        'Deadlift': [work(100, 5)],
      } },
    },
  });
  const review = buildYearInReview(state, [], { year: 2026, today: '2026-12-15' });
  assert.equal(review.topExercises.length, 5, 'the view list caps at five');

  const dumbbell = review.topExercises.find((exercise) => exercise.name === 'Dumbbell Bench Press');
  assert.ok(dumbbell, 'the alias resolves to its canonical exercise name');
  assert.equal(dumbbell.sets, 3);
  assert.equal(dumbbell.volumeKg, 900);

  const plank = review.topExercises.find((exercise) => exercise.name === 'Plank');
  assert.ok(plank, 'a hold alias resolves to its canonical name');
  assert.equal(plank.sets, 2, 'holds count as working sets');
  assert.equal(plank.volumeKg, 0, 'holds have no tonnage');

  const farmer = review.topExercises.find((exercise) => exercise.name === 'Farmer Carry');
  assert.ok(farmer, 'a carry alias resolves to its canonical name');
  assert.equal(farmer.sets, 2, 'carries count as working sets');
  assert.equal(farmer.volumeKg, 0, 'carries have no tonnage');

  assert.equal(review.totals.workingSets, 10);
});
