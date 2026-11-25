// =============================================================================
// HOME STRENGTH INSIGHT (HM4)
//
// One "because" line from strength data, and the precedence that keeps it from
// talking over a recovery warning or the safety escalation.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStrengthInsight, chooseHomeInsight, isDeloadWeek, strengthInsightForDay,
} from '../js/home/strength-insight.js';
import { initEngine } from '../js/engine.js';

test('a planned deload week is recognised; a conditional rule is not', () => {
  assert.equal(isDeloadWeek('Deload week'), true);
  assert.equal(isDeloadWeek('deload'), true);
  assert.equal(isDeloadWeek('Deload (40% Volume Reduction)'), true);
  assert.equal(isDeloadWeek('Deload if stalling — reset 10%'), false);
  assert.equal(isDeloadWeek('Working Sets'), false);
  assert.equal(isDeloadWeek(null), false);
});

test('the strength line names a stalled lift and a deload separately', () => {
  assert.equal(strengthInsightForDay({ lifts: [] }), null);
  assert.equal(strengthInsightForDay({ lifts: ['Bench Press'] }), null);

  const deload = strengthInsightForDay({ lifts: ['Bench Press'], deload: true });
  assert.equal(deload.tone, 'neutral');
  assert.match(deload.text, /deload week/i);
  assert.equal(deload.nav, 'progress');

  const stalled = strengthInsightForDay({ lifts: ['Bench Press'], stalledLift: 'Bench Press' });
  assert.equal(stalled.tone, 'caution');
  assert.match(stalled.text, /^Bench Press is stalling/);
  assert.match(stalled.text, /hold the load/i);
});

test('deload outranks a stall on the same day', () => {
  const insight = strengthInsightForDay({ lifts: ['Bench Press'], deload: true, stalledLift: 'Bench Press' });
  assert.match(insight.text, /deload week/i);
});

test('a warning insight is never replaced; safety suppresses the strength line', () => {
  const warning = { text: 'Load spiking', tone: 'warning', nav: 'training-status' };
  const caution = { text: 'Fasting 18h', tone: 'caution', nav: 'custom:fasting' };
  const neutral = { text: '2 of 3 sessions done', tone: 'neutral', nav: 'progress' };
  const strength = { text: 'Bench Press is stalling — hold the load.', tone: 'caution', nav: 'progress' };

  assert.equal(chooseHomeInsight(warning, strength), warning);
  assert.equal(chooseHomeInsight(caution, strength), caution);
  assert.equal(chooseHomeInsight(neutral, strength), strength);
  assert.equal(chooseHomeInsight(neutral, strength, { safetyActive: true }), neutral);
  assert.equal(chooseHomeInsight(null, strength), strength);
  assert.equal(chooseHomeInsight(neutral, null), neutral);
});

test('build guards: safety, a finished session, no day and no program all yield nothing', () => {
  const state = { activeProgramId: 'hybrid_engine', currentWeek: '1', weeks: { '1': { lifts: {} } } };
  assert.equal(buildStrengthInsight(state, { rec: { badge: 'Ready' } }, { safetyActive: true, selectedDay: 'wed' }), null);
  assert.equal(buildStrengthInsight(state, { rec: { badge: 'Session Done' } }, { selectedDay: 'wed' }), null);
  assert.equal(buildStrengthInsight(state, { rec: { badge: 'Ready' } }, {}), null);
  assert.equal(buildStrengthInsight({ ...state, activeProgramId: 'missing_program' }, { rec: { badge: 'Ready' } }, { selectedDay: 'wed' }), null);
});

test('a real program and day do not throw before the engine is initialised', () => {
  const state = {
    activeProgramId: 'hybrid_engine',
    currentWeek: '1',
    weeks: { '1': { activationId: 'act', lifts: {} } },
  };
  assert.doesNotThrow(() => buildStrengthInsight(state, { rec: { badge: 'Ready' } }, { selectedDay: 'wed' }));
});

test('a real deload week surfaces the deload line before any lift is judged', () => {
  const state = {
    activeProgramId: 'hybrid_engine',
    currentWeek: '4',
    weeks: { '4': { activationId: 'act', lifts: { wed: { 'Back Squat': [] } } } },
  };
  const insight = buildStrengthInsight(state, { rec: { badge: 'Ready' } }, { selectedDay: 'wed' });
  assert.ok(insight, 'a deload week should produce a line');
  assert.match(insight.text, /deload week/i);
});

test('the engine stall owner drives the Home line (same rule as the cockpit badge)', () => {
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const act = 'act';
  const set = (w, r) => ({ w: String(w), r: String(r), tr: 5, c: true });
  const week = (date, sets) => ({
    activationId: act, programId: 'hybrid_engine', dates: { wed: date },
    lifts: { wed: { 'Back Squat': sets } }, gymStats: {}, runSessions: {},
  });
  const state = {
    currentWeek: '5', activeProgramId: 'hybrid_engine', activeActivationId: act,
    settings: { weightUnit: 'kg', equipmentProfiles: [] },
    weeks: {
      '1': week('2026-11-04', [set(100, 5), set(100, 5)]),
      '2': week('2026-11-11', [set(100, 5), set(100, 5)]),
      '3': week('2026-11-18', [set(100, 3), set(100, 3)]),
      '5': { activationId: act, programId: 'hybrid_engine', dates: {}, lifts: {}, gymStats: {}, runSessions: {} },
    },
    bodyWeightLog: [], bodyMeasurements: [], hybridScore: { history: [], xp: 0 }, loadMetrics: { atl: 0, ctl: 0 },
  };
  initEngine(() => state, () => DAYS);
  const insight = buildStrengthInsight(state, { rec: { badge: 'Ready' } }, { selectedDay: 'wed' });
  assert.ok(insight, 'three flat sessions with the latest missing target should produce a line');
  assert.match(insight.text, /^Back Squat is stalling/);
  assert.match(insight.text, /hold the load/i);
});
