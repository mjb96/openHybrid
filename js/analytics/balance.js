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

  // Same two-currency decision as buildHybridBalance: sRPE first (physiological),
  // minutes as the honest fallback, 'none' when neither exists.
  const hasLoad = rows.some((row) => row.strength + row.endurance > 0);
  const hasMinutes = rows.some((row) => row.strengthMin + row.enduranceMin > 0);
  const basis = hasLoad ? 'srpe' : hasMinutes ? 'minutes' : 'none';

  const strengthOf = (row) => (basis === 'minutes' ? row.strengthMin : row.strength);
  // The timeline reports endurance INCLUDING walks (they are real time on
  // feet); the split subtracts them, so a walk can never move a training share.
  const enduranceOf = (row) => {
    const measured = basis === 'minutes' ? row.enduranceMin : row.endurance;
    const walked = basis === 'minutes' ? (row.walkMin || 0) : (row.walkLoad || 0);
    return Math.max(0, measured - walked);
  };
  const sumOf = (list, pick) => list.reduce((total, row) => total + (pick(row) || 0), 0);

  const strength = sumOf(rows, strengthOf);
  const endurance = sumOf(rows, enduranceOf);
  const total = strength + endurance;
  const strengthSharePct = total > 0 ? round1((strength / total) * 100) : null;
  const enduranceSharePct = total > 0 ? round1(100 - /** @type {number} */ (strengthSharePct)) : null;

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
  const hasStrength = rows.some((row) => strengthOf(row) > 0);
  const hasEndurance = rows.some((row) => enduranceOf(row) > 0);

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
