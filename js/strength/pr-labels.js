// @ts-check
// =============================================================================
// PR LABELS — the badge vocabulary, with no history/catalogue dependencies.
//
// This lives in its own leaf module because the set-row TEMPLATE needs only the
// label. Importing `strength/records.js` for it pulled the canonical exercise
// history and catalogue into every render path that builds a row, even though
// the template never scans history.
// =============================================================================

/** The badge/copy label for one record kind. */
export const PR_KIND_LABELS = Object.freeze({
  e1rm: 'PR',
  hold: 'Hold PR',
  carry: 'Carry PR',
  reps: 'Rep PR',
});

/** @param {string|null|undefined} kind */
export function prKindLabel(kind) {
  return PR_KIND_LABELS[kind] || 'PR';
}
