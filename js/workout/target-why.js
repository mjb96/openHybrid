// @ts-check
// =============================================================================
// TARGET "WHY" (js/workout/target-why.js)
//
// G10: every progression target states in one line why today's number is
// today's number. The engine already knows the reason (a documented stall, a
// fatigue hold, or the progression rationale behind the suggested load); this
// helper turns it into one sentence and never invents a reason.
// =============================================================================

/**
 * @param {{ message?: string, isStalled?: boolean, isFatigueOverload?: boolean, suggestedWeight?: string|number, progression?: { rationale?: string }|null }|null|undefined} diagnostic
 * @param {{ week?: string|number, sets?: number, reps?: string|number, hasVisibleHistory?: boolean }} [target]
 * @returns {string}
 */
export function explainTarget(diagnostic, { week, sets, reps, hasVisibleHistory = false } = {}) {
  const message = String(diagnostic?.message || '').trim();
  if (message) return message;
  const rationale = String(diagnostic?.progression?.rationale || '').trim();
  if (rationale) return rationale;
  const hasHistory = !!(diagnostic?.suggestedWeight || diagnostic?.progression);
  // A visible "Last performed" panel is history even when it is archived and
  // therefore outside this activation's progression scope; never claim first time.
  if (!hasHistory && !hasVisibleHistory) return 'First time logging this — today sets your baseline.';
  if (week && sets && reps) {
    return `Program prescription for week ${week} — ${sets} × ${reps}.`;
  }
  return '';
}
