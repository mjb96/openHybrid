// @ts-check
// =============================================================================
// EFFORT — one reading of the athlete's RIR / RPE.
//
// The set sheet records reps in reserve in HALF steps (0 … 4+, where 4+ stores
// 4). A stored set carries the RIR it was entered with and the derived
// `rpe = 10 - rir`; imported sets may carry only one of the two. Every reader
// therefore goes through effortForSet() instead of re-deriving the pair, so the
// logger, the previous-workout panel and sRPE cannot disagree about what a set
// asked of the athlete.
//
// Pure: no DOM, no state import. `rated` is false when the effort was INFERRED
// (a failed set with no rating) rather than entered — analytics may count that
// set, but the UI must not present it as something the athlete recorded.
// =============================================================================

/** The scale the sheet offers. `4+` is stored as the maximum, 4. */
export const EFFORT_SCALE = Object.freeze({ MIN: 0, MAX: 4, STEP: 0.5 });

/**
 * Coerce a number-ish value without letting '' become 0.
 * @param {any} value
 * @returns {number|null}
 */
function numeric(value) {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (typeof value === 'symbol') return null;
  try {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  } catch {
    // A hostile valueOf/getter must not break a read of the logger.
    return null;
  }
}

/**
 * Snap an entered RIR to the nearest half step inside the scale.
 *
 * Out-of-range and non-finite values return null rather than being clamped:
 * a stored RIR 8 is not "4+", it is a value this scale cannot represent, and
 * silently turning it into 4 would rewrite the athlete's history.
 * @param {any} value
 * @returns {number|null}
 */
export function normalizeEffortRir(value) {
  const n = numeric(value);
  if (n == null || n < EFFORT_SCALE.MIN || n > EFFORT_SCALE.MAX) return null;
  return Math.round(n / EFFORT_SCALE.STEP) * EFFORT_SCALE.STEP;
}

/**
 * Read a stored set's effort.
 *
 * `rir` wins when both are present, matching the sheet's RIR-first model; a
 * set with only `rpe` (imported or legacy) derives RIR from it. A failed set
 * with no rating contributes RPE 10 but is NOT marked rated, because the
 * athlete never chose a number.
 * @param {any} set
 * @returns {{ rir: number|null, rpe: number|null, rated: boolean }}
 */
export function effortForSet(set) {
  const source = set && typeof set === 'object' ? set : {};
  const storedRir = numeric(source.rir);
  const storedRpe = numeric(source.rpe);
  const rir = storedRir != null
    ? storedRir
    : (storedRpe != null ? Math.round((10 - storedRpe) * 100) / 100 : null);
  if (rir == null) {
    if (source.failure === true) return { rir: 0, rpe: 10, rated: false };
    return { rir: null, rpe: null, rated: false };
  }
  return { rir, rpe: Math.round((10 - rir) * 100) / 100, rated: true };
}

/**
 * Compact effort label for a set row or detail. '' when nothing was recorded.
 * @param {any} set
 * @param {{ scale?: 'rir'|'rpe' }} [options]
 * @returns {string}
 */
export function formatEffort(set, { scale = 'rir' } = {}) {
  const effort = effortForSet(set);
  if (!effort.rated) return '';
  return scale === 'rpe' ? `RPE ${effort.rpe}` : `RIR ${effort.rir}`;
}
