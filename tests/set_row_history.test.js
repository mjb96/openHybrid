import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSetRow } from '../js/templates.js';
import { ghostForRow } from '../js/workout/set-entry.js';

test('a first-ever row may show a ghost target but never claims it as history', () => {
  const html = buildSetRow(
    { w: '', r: '', c: false }, 0, 'Back Squat', { w: 90, r: 10 },
    'kg', 'Back Squat', 80, 10,
  );
  assert.match(html, /placeholder="90"/);
  assert.match(html, /set-prev-col is-empty/, 'no prior set renders an explicit em dash');
  assert.doesNotMatch(html, /Last 90/);
});

test('the PREVIOUS column carries the real prior set for this set index', () => {
  const html = buildSetRow(
    { w: '', r: '', c: false }, 0, 'Back Squat', { w: 90, r: 10 },
    'kg', 'Back Squat', 80, 10, 10, { w: 85, r: 8 },
  );
  assert.match(html, /class="set-prev-col"/);
  assert.match(html, />85×8</, 'the column is the number, not a sentence');
  assert.match(html, /title="Last time: 85kg × 8"/);
  assert.doesNotMatch(html, /set-cmp/, 'an unfinished set has no comparison result');
});

test('dumbbell rows stamp the Each / Both basis; barbell rows do not', () => {
  const dumbbell = buildSetRow(
    { w: '', r: '', c: false }, 0, 'Dumbbell Bench Press', null,
    'kg', 'Dumbbell Bench Press', 80, 8,
  );
  assert.match(dumbbell, /data-load-basis="each"/);

  const barbell = buildSetRow(
    { w: '', r: '', c: false }, 0, 'Barbell Bench Press', null,
    'kg', 'Barbell Bench Press', 80, 8,
  );
  assert.doesNotMatch(barbell, /data-load-basis/);
});

test('per-set rest and note survive in the row without a second control row', () => {
  const html = buildSetRow(
    { w: '90', r: '8', c: true, restSec: 90, note: 'Paused at the bottom' }, 0, 'Back Squat', null,
    'kg', 'Back Squat', 80, 8,
  );
  assert.match(html, /data-rest-label="Rest 1:30"/, 'the set sheet reads this back');
  assert.match(html, /Paused at the bottom/);
  assert.match(html, /set-note/);
  assert.doesNotMatch(html, /set-adv-row/, 'metadata lives in the sheet, not under the row');
  assert.doesNotMatch(html, /btn-set-more/);
});

test('failure is an independent set flag, not the AMRAP type', () => {
  const html = buildSetRow(
    { w: '90', r: '8', c: true, failure: true }, 0, 'Back Squat', null,
    'kg', 'Back Squat', 80, 8, 8, { w: 85, r: 8 },
  );
  assert.match(html, /data-failure="1"/);
  assert.doesNotMatch(html, /type-amrap/, 'failure does not silently become AMRAP');
});

test('a completed set compares against the same set last session', () => {
  const up = buildSetRow(
    { w: '90', r: '8', c: true }, 0, 'Back Squat', { w: 90, r: 10 },
    'kg', 'Back Squat', 80, 10, 10, { w: 85, r: 8 },
  );
  assert.match(up, /set-cmp--up/);
  assert.match(up, /data-prev-w="85"/);

  const same = buildSetRow(
    { w: '85', r: '8', c: true }, 0, 'Back Squat', { w: 90, r: 10 },
    'kg', 'Back Squat', 80, 10, 10, { w: 85, r: 8 },
  );
  assert.match(same, /set-cmp--same/);
});

test('the ghost follows the previous set while the prescription stays the baseline', () => {
  // Row 2 shows what the athlete just entered (100 × 8), but `data-prescribed`
  // still carries the coach's 90 kg so true-adherence is not re-measured.
  const html = buildSetRow(
    { w: '', r: '', c: false }, 1, 'Back Squat', { w: 100, r: 8 },
    'kg', 'Back Squat', 80, 10, null, null, null, null, { w: 90, r: 10 },
  );
  assert.match(html, /placeholder="100"/, 'the visible ghost is the previous set');
  assert.match(html, /data-prescribed="90"/, 'the adherence baseline is unchanged');
  assert.match(html, /data-ghost-default="90"/);
});

test('ghostForRow reads the nearest earlier working set, skipping warm-ups', () => {
  const sets = [
    { w: '40', r: '8', type: 'W', c: true },   // warm-up
    { w: '100', r: '5', c: true },             // the working set to copy
    { w: '', r: '', c: false },                // blank row before another warm-up
    { w: '60', r: '10', type: 'W', c: true },
    { w: '', r: '', c: false },                // the row being rendered
  ];
  assert.deepEqual(ghostForRow(sets, 4, { w: 90, r: 10 }), { w: '100', r: '5' });
  assert.deepEqual(ghostForRow(sets, 2, { w: 90, r: 10 }), { w: '100', r: '5' });
});

test('ghostForRow falls back to the prescription when nothing was entered', () => {
  assert.deepEqual(ghostForRow([{ w: '', r: '' }, { w: '', r: '' }], 1, { w: 90, r: 10 }), { w: 90, r: 10 });
  assert.deepEqual(ghostForRow([], 0, { w: 90, r: 10 }), { w: 90, r: 10 });
  assert.equal(ghostForRow([{ w: '100', r: '5' }], 0, null), null, 'the first row never ghosts itself');
});
