// =============================================================================
// H5 slice 2 — the deload action's wiring (static architectural check)
//
// A plan-changing action must go through the builder's snapshot + the shared
// Undo bar, and it must never be offered for a shared catalogue plan.
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('the router applies the deload, saves and repaints Progress', () => {
  const app = read('js/app.js');
  assert.match(app, /action === 'apply-block-deload'/);
  assert.match(app, /applyBlockDeload\(program, week, \{/);
  assert.match(app, /save: \(\) => saveStateToLocalStorage\(\)/);
  assert.match(app, /rerender: \(\) => renderBlockReview\(appState\)/);
});

test('the action snapshots the plan and offers the shared Undo bar', () => {
  const module = read('js/analytics/block-deload.js');
  assert.match(module, /captureProgramDraft\(program, `Deload week \$\{week\}`\)/);
  assert.match(module, /restoreProgramDraft\(program, snapshot\)/);
  assert.match(module, /showUndo\(/);
  assert.match(module, /markWeekDeload\(program, week\)/);
});

test('only a personal copy is offered the write', () => {
  const view = read('js/analytics/views/view-block-review.js');
  assert.match(view, /state\.customPrograms\.some\(\(entry\) => entry\?\.id === program\?\.id\)/);
  assert.match(view, /data-action="apply-block-deload"/);
  assert.match(view, /Customize to deload/);
});
