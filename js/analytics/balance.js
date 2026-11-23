// @ts-check
// =============================================================================
// BALANCE MODEL (js/analytics/balance.js)
//
// "Is the mix right?" — strength against endurance over the SELECTED window,
// in the two-currency language the rest of the app already uses: sRPE when the
// athlete rates effort, training minutes when they do not. `basis` says which.
//
// Walks are excluded from the split (plan §7.2). On the minutes fallback an
// unrated 45-minute walk would count exactly like a hard 45-minute session and
// could outvote real training. The excluded time is still reported, so nothing
// is hidden — it is simply not allowed to move a training-share number.
//
// The band only exists when BOTH modalities have measured work in the window:
// a 100 %-strength split is not an insight, it is a bar with one colour.
// =============================================================================
import { dailyLoadBreakdownTimeline } from '../metrics/training-load.js';
import { inRange } from './ranges.js';

const round1 = (value) => Math.round(value * 10) / 10;

/**
 * @param {any} state
 * @param {{
 *   range: any,
 *   previous?: { startISO: string, endISO: string }|null,
 * }} options
 */
export function buildBalanceModel(state, options = /** @type {any} */ ({})) {
  const range = options.range;
  if (!range) throw new Error('buildBalanceModel: range is required');

  const timeline = dailyLoadBreakdownTimeline(state, { throughDate: range.endISO });
  const rows = timeline.filter((row) => inRange(row.date, range));
  const previousRows = options.previous
    ? timeline.filter((row) => inRange(row.date, options.previous))
    : [];

  // Walk-excluded per-modality measures, defined ONCE. The timeline reports
  // endurance INCLUDING walks (real time on feet); the split never sees them.
  const strengthLoadOf = (row) => row.strength || 0;
  const strengthMinutesOf = (row) => row.strengthMin || 0;
  const enduranceLoadOf = (row) => Math.max(0, (row.endurance || 0) - (row.walkLoad || 0));
  const enduranceMinutesOf = (row) => Math.max(0, (row.enduranceMin || 0) - (row.walkMin || 0));

  // One currency has to describe BOTH sides, or the split compares two things
  // measured differently. sRPE only when both modalities were rated; otherwise
  // training minutes for both, and the band says so. Choosing sRPE from a rated
  // run alone made a lifter who never rates SETS read as "no strength work in
  // this period" — a false statement about real training.
  const strengthHasLoad = rows.some((row) => strengthLoadOf(row) > 0);
  const enduranceHasLoad = rows.some((row) => enduranceLoadOf(row) > 0);
  const strengthHasMinutes = rows.some((row) => strengthMinutesOf(row) > 0);
  const enduranceHasMinutes = rows.some((row) => enduranceMinutesOf(row) > 0);

  const basis = strengthHasLoad && enduranceHasLoad
    ? 'srpe'
    : strengthHasMinutes && enduranceHasMinutes
      ? 'minutes'
      : 'none';

  const strengthOf = (row) => (basis === 'minutes' ? strengthMinutesOf(row) : strengthLoadOf(row));
  const enduranceOf = (row) => (basis === 'minutes' ? enduranceMinutesOf(row) : enduranceLoadOf(row));
  const sumOf = (list, pick) => list.reduce((total, row) => total + (pick(row) || 0), 0);

  const strength = sumOf(rows, strengthOf);
  const endurance = sumOf(rows, enduranceOf);
  const total = strength + endurance;
  const strengthSharePct = total > 0 ? round1((strength / total) * 100) : null;
  const enduranceSharePct = strengthSharePct == null ? null : round1(100 - strengthSharePct);

  const previousStrength = sumOf(previousRows, strengthOf);
  const previousEndurance = sumOf(previousRows, enduranceOf);
  const previousTotal = previousStrength + previousEndurance;
  const previousStrengthSharePct = previousTotal > 0
    ? round1((previousStrength / previousTotal) * 100)
    : null;
  const deltaPct = strengthSharePct != null && previousStrengthSharePct != null
    ? round1(strengthSharePct - previousStrengthSharePct)
    : null;

  const walkMinutes = Math.round(sumOf(rows, (row) => row.walkMin));
  // Whether a modality was TRAINED is independent of the currency the split
  // settled on: a strength-only window has no common basis, but it certainly has
  // strength work, and the copy must say "no runs" rather than "no strength".
  const hasStrength = strengthHasLoad || strengthHasMinutes;
  const hasEndurance = enduranceHasLoad || enduranceHasMinutes;

  return {
    range,
    basis,
    basisLabel: basis === 'minutes' ? 'by training time' : basis === 'srpe' ? 'by session load' : '',
    strengthSharePct,
    enduranceSharePct,
    strengthValue: round1(strength),
    enduranceValue: round1(endurance),
    previousStrengthSharePct,
    deltaPct,
    excluded: walkMinutes > 0 ? { walkMinutes } : null,
    hasStrength,
    hasEndurance,
    // Both modalities, measured. One-modality windows render nothing.
    hasData: basis !== 'none' && hasStrength && hasEndurance,
  };
}
