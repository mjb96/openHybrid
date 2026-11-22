// @ts-check
// =============================================================================
// PLATE MATH (js/workout/plates.js)
//
// Pure, DOM-free. "What do I load per side?" — table stakes for barbell lifters
// and a gap vs every competitor. Greedy breakdown of a target weight onto a bar,
// per side, from the standard plate set; surfaced inline
// on the cockpit's coach-target line (no new buttons).
// =============================================================================

export const KG_BAR = 20;
export const LB_BAR = 45;
export const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const LB_PLATES = [45, 35, 25, 10, 5, 2.5];

/**
 * Break a total barbell weight into plates PER SIDE.
 * @param {number} total  total weight incl. bar
 * @param {number} [bar]
 * @param {number[]} [plates]  available plate denominations (desc)
 * @param {Record<string, number>|null} [counts]  optional pairs owned per denomination
 * @returns {{ perSide: {plate:number,count:number}[], exact:boolean, leftover:number, barOnly:boolean, belowBar:boolean, limited:boolean }}
 */
export function computePlateBreakdown(total, bar = KG_BAR, plates = KG_PLATES, counts = null) {
  const t = Number(total);
  if (!Number.isFinite(t)) return { perSide: [], exact: false, leftover: 0, barOnly: false, belowBar: false, limited: false };
  if (t < bar) return { perSide: [], exact: t === bar, leftover: 0, barOnly: t === bar, belowBar: t < bar, limited: false };
  if (t === bar) return { perSide: [], exact: true, leftover: 0, barOnly: true, belowBar: false, limited: false };

  let perSideWeight = (t - bar) / 2;
  const perSide = [];
  let limited = false;
  for (const p of [...plates].sort((a, b) => b - a)) {
    if (perSideWeight <= 0) break;
    const wanted = Math.floor((perSideWeight + 1e-9) / p);
    if (wanted <= 0) continue;
    const rawLimit = counts && typeof counts === 'object' ? /** @type {any} */ (counts)[String(p)] : null;
    const limit = rawLimit == null || rawLimit === ''
      ? Infinity
      : Math.max(0, Math.floor(Number(rawLimit)));
    const count = Number.isFinite(limit) ? Math.min(wanted, limit) : wanted;
    if (count > 0) { perSide.push({ plate: p, count }); perSideWeight -= count * p; }
    if (Number.isFinite(limit) && wanted > count) limited = true;
  }
  return {
    perSide,
    exact: perSideWeight < 1e-6,
    leftover: Math.max(0, Math.round(perSideWeight * 100) / 100),
    barOnly: false,
    belowBar: false,
    limited,
  };
}

/** Round to the hundredth so binary float noise never leaks into a label. */
const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * The target's total shortfall, BOTH sides. `computePlateBreakdown` reports the
 * per-SIDE leftover because that is what you can load one end at a time; an
 * athlete asking "how much am I missing?" means the pair, so this doubles it.
 * Exact, below-bar and junk breakdowns have no shortfall.
 * @param {{ exact?: boolean, leftover?: number, belowBar?: boolean }|null} breakdown
 * @returns {number}
 */
export function plateShortfallTotal(breakdown) {
  if (!breakdown || breakdown.exact || breakdown.belowBar) return 0;
  const leftover = Number(breakdown.leftover);
  if (!Number.isFinite(leftover) || leftover <= 0) return 0;
  return round2(leftover * 2);
}

/**
 * The nearest total the rack can actually build, or null when the target is
 * already exact (or is below the bar, where no plate arrangement applies).
 *
 * The greedy breakdown leaves `leftover` unbuilt per side; removing that pair
 * lands exactly on the plates it DID load, so the result is not an estimate.
 * @param {number|string} total
 * @param {{ exact?: boolean, leftover?: number, belowBar?: boolean }|null} breakdown
 * @returns {number|null}
 */
export function nearestBuildableTotal(total, breakdown) {
  const t = Number(total);
  if (!Number.isFinite(t)) return null;
  if (!breakdown || breakdown.belowBar || breakdown.exact) return null;
  const shortfall = plateShortfallTotal(breakdown);
  if (shortfall <= 0) return null;
  return round2(t - shortfall);
}

/**
 * Every plate on BOTH ends. Per-side counts are the loading instruction; this
 * is the pair you lift off the rack, which is how plates are actually counted.
 * @param {{ perSide?: { plate: number, count: number }[] }|null} breakdown
 * @returns {{ plate: number, count: number }[]}
 */
export function platePairs(breakdown) {
  if (!breakdown?.perSide?.length) return [];
  return breakdown.perSide.map(({ plate, count }) => ({ plate, count: count * 2 }));
}

const trimNum = (n) => (Number.isInteger(n) ? String(n) : String(n));

/** Short per-side string, e.g. "20 + 20 + 2.5". Empty when it's just the bar. */
export function formatPlates(breakdown) {
  if (!breakdown || breakdown.barOnly) return 'bar only';
  if (breakdown.belowBar) return '';
  const parts = [];
  if (breakdown.perSide) {
    for (const { plate, count } of breakdown.perSide) {
      for (let i = 0; i < count; i++) parts.push(trimNum(plate));
    }
  }
  let s = parts.join(' + ');
  if (!breakdown.exact && breakdown.leftover > 0) {
    s = s ? `${s} · ${trimNum(breakdown.leftover)} short` : `not buildable (${trimNum(breakdown.leftover)} short)`;
  }
  return s;
}

/**
 * One-call convenience: target + unit + optional gym setup → "per side: 20 + 20".
 * `setup` comes from the active equipment profile; omitted callers keep the
 * standard bar/plate set. When the profile records plate counts, a target the
 * rack cannot build says so instead of implying plates the lifter does not own.
 * @param {number|string} total
 * @param {'kg'|'lb'|'lbs'|string} [unit]
 * @param {{ bar?: number, plates?: number[], counts?: Record<string, number> }|null} [setup]
 */
export function plateHint(total, unit = 'kg', setup = null) {
  const isLb = unit === 'lb' || unit === 'lbs';
  const defaultBar = isLb ? LB_BAR : KG_BAR;
  const defaultPlates = isLb ? LB_PLATES : KG_PLATES;
  const setupBar = Number(setup?.bar);
  const bar = Number.isFinite(setupBar) && setupBar > 0 ? setupBar : defaultBar;
  const plates = Array.isArray(setup?.plates) && setup.plates.length ? setup.plates : defaultPlates;
  const counts = setup && typeof setup.counts === 'object' && setup.counts ? setup.counts : null;
  const bd = computePlateBreakdown(Number(total), bar, plates, counts);
  const s = formatPlates(bd);
  return s ? `${s} / side` : '';
}
