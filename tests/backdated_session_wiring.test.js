// =============================================================================
// G3 — the past-session flow goes through History and never the active week
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('History owns the entry point, the date prompt and the collision choice', () => {
  const activities = read('js/activities.js');
  assert.match(activities, /data-action="log-past-session"/);
  assert.match(activities, /datePromptModal\(/);
  assert.match(activities, /dayOccupancy\(state, date\)/);
  assert.match(activities, /confirmLabel: 'Keep both'/);
  assert.match(activities, /new CustomEvent\('app:backdate-session'/);
});

test('app.js creates a one-off stamped with the chosen date', () => {
  const app = read('js/app.js');
  assert.match(app, /app:backdate-session/);
  assert.match(app, /createOneOffStrengthSession\(appState, \{ now: noon, title: 'Logged session' \}\)/);
  assert.match(app, /backdatedNoon\(dateISO\)/);
});

test('the helper cannot touch the program, the activation or currentWeek', () => {
  const helper = read('js/workout/backdated-session.js');
  assert.doesNotMatch(helper, /currentWeek|activeActivationId|startProgramActivation|reseedActiveProgramIntoWeek/);
});
