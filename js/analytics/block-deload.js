// @ts-check
// =============================================================================
// BLOCK DELOAD (H5, slice 2)
//
// One plan-changing action, and only on evidence: the caller offers it when the
// block review is `stalled` (two or more engine progress checks). It halves the
// NEXT program week's sets through the builder's own `markWeekDeload`, snapshots
// the plan with `captureProgramDraft`, and shows the shared Undo bar.
//
// It never edits a shared catalogue plan: `applyBlockDeload` is only called for
// a program that lives in `state.customPrograms`.
// =============================================================================
import { ensureWeeklyMods, isDeloadWeek, markWeekDeload } from '../programs/progression.js';
import { captureProgramDraft, restoreProgramDraft } from '../programs/editor-model.js';
import { showUndo } from '../ui/undo-bar.js';

/**
 * Apply the deload and return a working undo, without touching the DOM. Kept
 * separate so the write can be tested without the undo bar.
 *
 * @param {any} program
 * @param {number} week next program week
 * @returns {null | { week: number, modifier: any, undo: () => boolean }}
 */
export function prepareBlockDeload(program, week) {
  if (!program || !Number.isInteger(week) || week < 1) return null;
  if (!program.weeklyVolModifiers || typeof program.weeklyVolModifiers !== 'object') {
    ensureWeeklyMods(program);
  }
  const existing = program.weeklyVolModifiers?.[String(week)];
  if (!existing) return null;
  // A planned deload is already the decision: never halve it a second time.
  if (isDeloadWeek(existing)) return null;

  const snapshot = captureProgramDraft(program, `Deload week ${week}`);
  const modifier = markWeekDeload(program, week);
  if (!modifier) return null;
  return {
    week,
    modifier,
    undo: () => restoreProgramDraft(program, snapshot),
  };
}

/**
 * Apply + persist + offer Undo. Used by the app router; the caller owns the
 * analytics repaint because this module cannot import the screen (cycle).
 *
 * @param {any} program
 * @param {number} week
 * @param {{ save?: () => void, rerender?: () => void }} [io]
 * @returns {boolean}
 */
export function applyBlockDeload(program, week, { save, rerender } = {}) {
  const result = prepareBlockDeload(program, week);
  if (!result) return false;
  save?.();
  rerender?.();
  showUndo(`Deload added to week ${week}`, () => {
    result.undo();
    save?.();
    rerender?.();
  }, () => {});
  return true;
}
