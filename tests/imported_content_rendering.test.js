import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeCssColor } from '../js/util.js';
import { celebrationContentHtml } from '../js/ui/celebration.js';
import { renderProgramCard } from '../js/programs/program-card.js';
import { render1RMProgressionChart } from '../js/analytics/charts/strength-charts.js';
import { buildExerciseCard } from '../js/templates.js';
import { liftTarget } from '../js/engine.js';
import { getWeekModifier } from '../js/schema.js';
import { createImportedProgram, parsePlanFile } from '../js/programs/program-json.js';

const HOSTILE = '<img src=x onerror="globalThis.pwned=1">';

// The exact cockpit label path: an imported plan's week modifier feeds
// liftTarget → the `Target: N × reps` string → buildExerciseCard's visible text.
function importedCockpitTargetHtml(reps) {
  const plan = parsePlanFile(JSON.stringify({
    format: 'openhybrid-plan',
    version: 1,
    plan: {
      name: 'Imported target plan',
      totalWeeks: 1,
      days: { mon: { title: 'Day 1', desc: '', lifts: ['Squat'] } },
      weeklyVolModifiers: { '1': { sets: 3, reps } },
    },
  }));
  const program = createImportedProgram(plan);
  const target = liftTarget(plan.days.mon.desc, 'Squat', getWeekModifier(program, '1'), {
    program, week: '1', dayKey: 'mon',
  });
  assert.equal(target.sets, 3);
  assert.equal(target.reps, reps);
  const blueprintLabel = `Target: ${target.sets} × ${target.reps}`;
  return buildExerciseCard({
    displaySafeName: 'Squat',
    safeLiftName: 'Squat',
    isCompleted: false,
    diagnostic: { isStalled: false, progression: null },
    blueprintLabel,
    targetLabel: blueprintLabel,
    historicalLineText: '',
    setsMarkup: '',
  });
}

function baseExerciseCardArgs(overrides = {}) {
  return {
    displaySafeName: 'Squat',
    safeLiftName: 'Squat',
    isCompleted: false,
    diagnostic: { isStalled: false, progression: null },
    blueprintLabel: 'Target: 3 × 10',
    targetLabel: 'Target: 3 × 10',
    historicalLineText: '',
    setsMarkup: '',
    ...overrides,
  };
}

test('imported profile copy is escaped before celebration markup is built', () => {
  const html = celebrationContentHtml({ icon: HOSTILE, title: `Welcome, ${HOSTILE}`, subtitle: HOSTILE });
  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes('&lt;img'), true);
});

test('imported program card text and attribute values cannot create markup', () => {
  const html = renderProgramCard({
    id: `custom\" onmouseover=\"${HOSTILE}`,
    name: HOSTILE,
    category: HOSTILE,
    accentColor: `red; background:url(https://invalid.example/x)`,
    coverGradient: [`\" onmouseover=\"x`, 'javascript:alert(1)'],
    days: {},
  });
  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes('url(https://invalid.example/x)'), false);
  assert.equal(html.includes('javascript:'), false);
  assert.match(html, /data-program-id="custom&quot;/);
  assert.match(html, /#8b5cf6/);
});

test('imported lift name is escaped in the empty strength-chart state', () => {
  const container = { innerHTML: '' };
  render1RMProgressionChart(container, [], [], [], [], 0, HOSTILE);
  assert.equal(container.innerHTML.includes('<img'), false);
  assert.equal(container.innerHTML.includes('&lt;img'), true);
});

test('safeCssColor permits app tokens and rejects declarations or URLs', () => {
  assert.equal(safeCssColor('#3b82f6'), '#3b82f6');
  assert.equal(safeCssColor('var(--accent-blue)'), 'var(--accent-blue)');
  assert.equal(safeCssColor('red; background:url(https://invalid.example)'), '#3b82f6');
  assert.equal(safeCssColor('" onmouseover="x', '#111827'), '#111827');
});

test('imported plan reps cannot inject markup into the cockpit target label', () => {
  const html = importedCockpitTargetHtml('<img src=x onerror="globalThis.__pwned=1">');
  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes('&lt;img'), true);
  assert.match(html, /data-target-label="Target: 3 × &lt;img/);
  assert.match(html, /class="cockpit-ex-target"[^>]*>Target: 3 × &lt;img/);
});

test('a normal imported target still renders as Target: 3 × 10', () => {
  const html = importedCockpitTargetHtml(10);
  assert.equal(html.includes('<img'), false);
  assert.match(html, /class="cockpit-ex-target"[^>]*>Target: 3 × 10<\/div>/);
});

test('superset group id is escaped in the exercise card badge', () => {
  const html = buildExerciseCard(baseExerciseCardArgs({ groupId: HOSTILE, ssColor: '#3b82f6' }));
  assert.equal(html.includes('<img'), false);
  assert.match(html, /SS &lt;img/);
});
