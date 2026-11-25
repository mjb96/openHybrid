// =============================================================================
// G10 — explained targets
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { explainTarget } from '../js/workout/target-why.js';
import { buildExerciseCard } from '../js/templates.js';

test('a documented message (stall/fatigue) is the why', () => {
  assert.equal(explainTarget({ message: 'Hold the load and review recovery.' }), 'Hold the load and review recovery.');
});

test('the progression rationale explains a suggested load', () => {
  const diagnostic = { suggestedWeight: '102.5', progression: { action: 'increase', rationale: 'All top-load sets hit 5 — add load to 102.5 kg.' } };
  assert.match(explainTarget(diagnostic), /add load to 102.5 kg/);
});

test('no history sets a baseline explanation', () => {
  assert.match(explainTarget({ suggestedWeight: '', progression: null }, { week: '2', sets: 4, reps: 6 }), /sets your baseline/);
});

test('history without a rationale falls back to the program prescription', () => {
  const text = explainTarget({ suggestedWeight: '80' }, { week: '3', sets: 4, reps: 5 });
  assert.equal(text, 'Program prescription for week 3 — 4 × 5.');
});

test('an empty diagnostic never invents a reason', () => {
  assert.equal(explainTarget(null, {}), 'First time logging this — today sets your baseline.');
});

test('visible archived history is not called a first performance', () => {
  const text = explainTarget(null, { week: '2', sets: 4, reps: 5, hasVisibleHistory: true });
  assert.equal(text, 'Program prescription for week 2 — 4 × 5.');
});

test('the cockpit card renders the why line once, separate from a message', () => {
  const html = buildExerciseCard({
    displaySafeName: 'Squat', safeLiftName: 'Squat', isCompleted: false,
    diagnostic: { isStalled: false }, blueprintLabel: 'Target: 4 × 5',
    targetWhy: 'All top-load sets hit 5 — add load to 102.5 kg.', setsMarkup: '',
  });
  assert.match(html, /data-target-why/);
  assert.match(html, /add load to 102.5 kg/);
  assert.equal((html.match(/data-target-why/g) || []).length, 1);
});

test('a stall message is not duplicated by the why line', () => {
  const message = 'Squat has not improved — hold the load.';
  const html = buildExerciseCard({
    displaySafeName: 'Squat', safeLiftName: 'Squat', isCompleted: false,
    diagnostic: { isStalled: true, message }, blueprintLabel: 'Target: 4 × 5', targetWhy: message, setsMarkup: '',
  });
  assert.equal((html.match(/Squat has not improved/g) || []).length, 1);
  assert.doesNotMatch(html, /data-target-why/);
});
