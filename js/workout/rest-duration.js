// @ts-check
// =============================================================================
// REST DURATION (js/workout/rest-duration.js)
//
// The pure precedence behind the rest timer. It lived inline in
// `triggerRestTimerEngine`, which meant a circuit could only ask the question
// one member at a time and therefore rested for whichever member was ticked
// last. Keeping the rule here lets the logger compute ONE governing duration
// across a group without forking the precedence:
//
//   per-set restSec > warm-up tier > AMRAP > plan rest > exercise override >
//   movement tier + RPE
//
// No DOM, no mutable timer state and no app-state import.
// =============================================================================

export const DEFAULT_REST_TIERS = Object.freeze({
  warmup: 45,
  compound: 180,
  accessory: 120,
  isolation: 90,
});

// Checked isolation-first so "leg extension" / "leg curl" don't fall through to
// the broad "press"/"row" compound keywords.
const ISOLATION_KEYWORDS = [
  'curl', 'raise', 'fly', 'flye', 'extension', 'pushdown', 'push-down', 'kickback',
  'calf', 'shrug', 'face pull', 'pec deck', 'lateral', 'rear delt', 'reverse fly',
  'concentration', 'preacher', 'wrist', 'crunch', 'sit-up', 'sit up', 'plank',
  'pull-apart', 'pull apart', 'cable cross', 'adduction', 'abduction',
];
const PRIMARY_KEYWORDS = [
  'squat', 'deadlift', 'bench', 'overhead press', 'ohp', 'military press',
  'barbell row', 'pendlay', 'rdl', 'romanian', 'hip thrust', 'good morning',
  'clean', 'snatch', 'jerk',
];
const SECONDARY_KEYWORDS = [
  'press', 'row', 'pull-up', 'pullup', 'pull up', 'chin', 'dip', 'lunge',
  'pulldown', 'pull-down', 'pull down', 'thruster', 'split squat', 'step-up',
  'step up', 'push press', 't-bar',
];

/**
 * Recommended rest (seconds) for a lift by name, or null when unrecognised.
 * @param {string|null|undefined} liftName
 * @param {{warmup:number, compound:number, accessory:number, isolation:number}} [tiers]
 * @returns {number|null}
 */
export function recommendedRestFor(liftName, tiers = DEFAULT_REST_TIERS) {
  if (!liftName || typeof liftName !== 'string') return null;
  const n = liftName.toLowerCase();
  if (ISOLATION_KEYWORDS.some((keyword) => n.includes(keyword))) return tiers.isolation;
  if (PRIMARY_KEYWORDS.some((keyword) => n.includes(keyword))) return tiers.compound;
  if (SECONDARY_KEYWORDS.some((keyword) => n.includes(keyword))) return tiers.accessory;
  return null;
}

/**
 * Resolve how long a rest should be for ONE set context. A return of `0` means
 * "no timer" (an explicit per-set 0, a disabled warm-up tier, or a disabled
 * exercise override) — the caller dismisses rather than starting a countdown.
 *
 * @param {{
 *   liftName?: string|null,
 *   setRpe?: number|string|null,
 *   setType?: string|null,
 *   planRestSec?: number|string|null,
 *   setRestSec?: number|string|null,
 *   restTiers?: {warmup:number, compound:number, accessory:number, isolation:number},
 *   restOverrides?: Record<string, number|string>,
 * }} [context]
 * @returns {number}
 */
export function resolveRestDuration(context = {}) {
  const {
    liftName = null,
    setRpe = null,
    setType = null,
    planRestSec = null,
    setRestSec = null,
    restTiers = DEFAULT_REST_TIERS,
    restOverrides = {},
  } = context;

  // 0. A per-set rest is the athlete's explicit choice and outranks the plan,
  // the remembered per-exercise override and the tier. 0 means no timer.
  if (setRestSec != null && setRestSec !== '' && Number.isFinite(Number(setRestSec))) {
    const explicit = Math.round(Number(setRestSec));
    return explicit <= 0 ? 0 : Math.min(600, Math.max(0, explicit));
  }

  // 1. Warm-up rest is its own configured tier (default 45s). 0 means no
  // timer for warm-ups, which is a deliberate choice for rushed sessions.
  if (setType === 'W') {
    return restTiers.warmup > 0 ? restTiers.warmup : 0;
  }

  // 2. AMRAP sets get a fixed 2-minute rest.
  if (setType === 'F') return 120;

  // 3. An imported/shared plan's own rest is a prescription, not a guess.
  if (Number(planRestSec) > 0) return Math.min(600, Math.round(Number(planRestSec)));

  // 4. A remembered per-exercise adjustment is an explicit choice — use it as-is
  // (no RPE bonus on top, since the user already dialled in this value).
  // 0 is the explicit "no timer for this exercise" sentinel.
  if (liftName && restOverrides[liftName] != null) {
    const remembered = Number(restOverrides[liftName]);
    return remembered <= 0 ? 0 : Math.min(600, remembered);
  }

  // 5. Working sets: prescribe rest by exercise type (heavy compound →
  // isolation) so a curl no longer inherits the same 3 min as a squat.
  // Unrecognised / custom lifts fall back to the accessory tier.
  let duration = recommendedRestFor(liftName, restTiers) ?? restTiers.accessory;

  // RPE bonus: heavier perceived effort = more rest.
  const rpe = parseFloat(String(setRpe ?? '')) || 0;
  if (rpe >= 9) duration += 30;
  else if (rpe >= 8) duration += 15;
  return duration;
}
