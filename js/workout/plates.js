// @ts-check
// =============================================================================
// PLATE MATH (js/workout/plates.js)
//
// Pure, DOM-free. "What do I load per side?" — table stakes for barbell lifters
// and the maths behind both the inline hint and the plate calculator sheet. The
// breakdown is an EXACT bounded solve over the athlete's own denominations and
// pair counts, not a greedy guess: a rack with [25, 20] and two pairs of each
// builds 100 as 2×20 a side, which greedy missed and reported 15 short. Greedy
// survives only as the display fallback when no exact combination exists, so
// "not buildable" is a fact rather than a search artefact.
// =============================================================================

export const KG_BAR = 20;
export const LB_BAR = 45;
export const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const LB_PLATES = [45, 35, 25, 10, 5, 2.5];

/** Internal fixed point: plate arithmetic is to two decimals (1.25, 2.5). */
const UNITS_PER_PLATE = 100;
/** Refuse a search that would allocate a pathological bitset (2000/side). */
const MAX_SEARCH_UNITS = 200000;

const toUnits = (value) => Math.round(Number(value) * UNITS_PER_PLATE);
const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * The pair cap for one denomination. A missing or blank entry means unlimited;
 * an explicit 0 is a real "none owned" and must not be treated as absent.
 * @param {Record<string, number>|null|undefined} counts
 * @param {number} plate
 * @returns {number} finite pair count, or Infinity
 */
export function platePairCap(counts, plate) {
  if (!counts || typeof counts !== 'object') return Infinity;
  const raw = /** @type {any} */ (counts)[String(plate)];
  if (raw == null || raw === '') return Infinity;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) ? Math.max(0, n) : Infinity;
}

/**
 * The active profile's bar/plates/counts with the standard kit as fallback.
 * Shared by `plateHint`, the calculator model and the nearest-total search so
 * the inline line and the sheet can never disagree about what is on the rack.
 * @param {{ bar?: number, plates?: number[], counts?: Record<string, number> }|null} setup
 * @param {'kg'|'lb'|'lbs'|string} [unit]
 * @returns {{ bar: number, plates: number[], counts: Record<string, number>|null }}
 */
export function resolvePlateSetup(setup = null, unit = 'kg') {
  const isLb = unit === 'lb' || unit === 'lbs';
  const setupBar = Number(setup?.bar);
  const bar = Number.isFinite(setupBar) && setupBar > 0 ? setupBar : (isLb ? LB_BAR : KG_BAR);
  const setupPlates = Array.isArray(setup?.plates)
    ? setup.plates.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const plates = setupPlates.length ? setupPlates : (isLb ? [...LB_PLATES] : [...KG_PLATES]);
  const counts = setup && typeof setup.counts === 'object' && setup.counts ? setup.counts : null;
  return { bar, plates, counts };
}

/**
 * Denominations as integer units with their caps, ascending (the DP orders
 * smaller plates first so reconstruction can prefer the largest plate that
 * still leaves an exact remainder).
 * @param {number[]} plates
 * @param {Record<string, number>|null} counts
 */
function normalizeCoins(plates, counts) {
  const seen = new Set();
  const coins = [];
  for (const raw of Array.isArray(plates) ? plates : []) {
    const plate = Number(raw);
    if (!Number.isFinite(plate) || plate <= 0) continue;
    const units = toUnits(plate);
    if (units <= 0 || seen.has(units)) continue;
    seen.add(units);
    coins.push({ plate, units, cap: platePairCap(counts, plate) });
  }
  return coins.sort((a, b) => a.units - b.units);
}

/** @param {Record<string, number>|null} counts */
function hasFiniteCaps(counts) {
  if (!counts || typeof counts !== 'object') return false;
  return Object.keys(counts).some((key) => {
    const raw = /** @type {any} */ (counts)[key];
    if (raw == null || raw === '') return false;
    return Number.isFinite(Number(raw));
  });
}

/**
 * Reachable per-side sums as a bitset, plus the reachability BEFORE each coin
 * for reconstruction. `upper` is inclusive.
 * @param {{ plate: number, units: number, cap: number }[]} coins ascending
 * @param {number} upper
 */
function reachableSums(coins, upper) {
  const usable = coins.filter((coin) => coin.cap > 0 && coin.units <= upper);
  let bits = 1n;
  const prefix = [bits];
  for (const coin of usable) {
    let next = bits;
    const maxCount = Math.min(coin.cap, Math.floor(upper / coin.units));
    for (let k = 1; k <= maxCount; k++) {
      next |= bits << BigInt(k * coin.units);
    }
    prefix.push(next);
    bits = next;
  }
  return { bits, prefix, coins: usable, upper };
}

/**
 * Reconstruct an exact combination, preferring the largest plates first so the
 * displayed set reads like a lifter's loading plan rather than 85 tiny plates.
 * @param {ReturnType<typeof reachableSums>} search
 * @param {number} target
 * @returns {{ plate: number, count: number }[]|null}
 */
function reconstructExact(search, target) {
  if (target < 0) return null;
  if (((search.bits >> BigInt(target)) & 1n) === 0n) return null;
  let remaining = target;
  const out = [];
  const { coins, prefix } = search;
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    const before = prefix[i] ?? 1n;
    const maxCount = Math.min(coin.cap, Math.floor(remaining / coin.units));
    let picked = -1;
    for (let k = maxCount; k >= 0; k--) {
      const rest = remaining - k * coin.units;
      if (((before >> BigInt(rest)) & 1n) === 1n) { picked = k; break; }
    }
    if (picked < 0) return null;
    if (picked > 0) {
      out.push({ plate: coin.plate, count: picked });
      remaining -= picked * coin.units;
    }
  }
  return remaining === 0 ? out.sort((a, b) => b.plate - a.plate) : null;
}

/**
 * The closest reachable per-side sum in EITHER direction. Ties go down, so a
 * target exactly between two builds reports the lighter one.
 * @param {ReturnType<typeof reachableSums>} search
 * @param {number} target
 * @returns {number|null}
 */
function closestSum(search, target) {
  const { bits, upper } = search;
  const text = bits.toString(2);
  const last = text.length - 1;
  const maxBit = Math.min(upper, last);
  const at = (units) => units >= 0 && units <= maxBit && text.charCodeAt(last - units) === 49;
  if (at(target)) return target;
  const limit = Math.max(target, maxBit);
  for (let d = 1; d <= limit; d++) {
    if (at(target - d)) return target - d;
    if (at(target + d)) return target + d;
  }
  return null;
}

/**
 * Greedy display fallback: always a real, loadable per-side arrangement using
 * the capped denominations, even when it is not the closest exact solve.
 * @param {number} perSideUnits
 * @param {{ plate: number, units: number, cap: number }[]} coins ascending
 */
function greedyPerSide(perSideUnits, coins) {
  let remaining = perSideUnits;
  const perSide = [];
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    if (remaining <= 0) break;
    const wanted = Math.floor(remaining / coin.units);
    if (wanted <= 0) continue;
    const count = Math.min(wanted, coin.cap);
    if (count > 0) {
      perSide.push({ plate: coin.plate, count });
      remaining -= count * coin.units;
    }
  }
  return { perSide, remaining };
}

/**
 * Break a total barbell weight into plates PER SIDE.
 *
 * Uses an exact bounded solve over the owned pairs. When no exact combination
 * exists it returns the greedy display arrangement, and `limited` says whether
 * the pair caps (an exhausted size, an explicit 0) are what forced the gap
 * rather than the denominations themselves.
 *
 * @param {number} total  total weight incl. bar
 * @param {number} [bar]
 * @param {number[]} [plates]  available plate denominations
 * @param {Record<string, number>|null} [counts]  optional pairs owned per denomination
 * @returns {{ perSide: {plate:number,count:number}[], exact:boolean, leftover:number, barOnly:boolean, belowBar:boolean, limited:boolean }}
 */
export function computePlateBreakdown(total, bar = KG_BAR, plates = KG_PLATES, counts = null) {
  const t = Number(total);
  if (!Number.isFinite(t)) return { perSide: [], exact: false, leftover: 0, barOnly: false, belowBar: false, limited: false };
  if (t < bar) return { perSide: [], exact: t === bar, leftover: 0, barOnly: t === bar, belowBar: t < bar, limited: false };
  if (t === bar) return { perSide: [], exact: true, leftover: 0, barOnly: true, belowBar: false, limited: false };

  const perSideUnits = toUnits((t - bar) / 2);
  const coins = normalizeCoins(plates, counts);
  const maxPlate = coins.reduce((max, coin) => Math.max(max, coin.units), 0);
  const upper = perSideUnits + maxPlate;
  const searchable = upper <= MAX_SEARCH_UNITS;
  const search = searchable ? reachableSums(coins, upper) : null;
  const exactSolution = search ? reconstructExact(search, perSideUnits) : null;

  if (exactSolution) {
    return { perSide: exactSolution, exact: true, leftover: 0, barOnly: false, belowBar: false, limited: false };
  }

  const greedy = greedyPerSide(perSideUnits, coins);
  // Above the search cap the DP is skipped, but a greedy hit is still a real
  // exact build and must not be reported as short.
  if (greedy.remaining === 0) {
    return { perSide: greedy.perSide, exact: true, leftover: 0, barOnly: false, belowBar: false, limited: false };
  }

  let limited = false;
  if (search && hasFiniteCaps(counts)) {
    // Caps are the REASON only when lifting them would get closer. A cap that
    // happens to exist but changes nothing must not label a normal shortfall.
    const freeSearch = reachableSums(normalizeCoins(plates, null), upper);
    const cappedClosest = closestSum(search, perSideUnits);
    const freeClosest = closestSum(freeSearch, perSideUnits);
    const cappedDistance = cappedClosest == null ? Infinity : Math.abs(cappedClosest - perSideUnits);
    const freeDistance = freeClosest == null ? Infinity : Math.abs(freeClosest - perSideUnits);
    limited = freeDistance < cappedDistance;
  }

  return {
    perSide: greedy.perSide,
    exact: false,
    leftover: Math.max(0, round2(greedy.remaining / UNITS_PER_PLATE)),
    barOnly: false,
    belowBar: false,
    limited,
  };
}

/**
 * The target's total shortfall, BOTH sides. The breakdown reports the per-SIDE
 * leftover because that is what you can load one end at a time; an athlete
 * asking "how much am I missing?" means the pair, so this doubles it.
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
 * The closest total the rack can actually build, in EITHER direction, or null
 * when the target is exact/below the bar. Derived from the reachable plate
 * combinations (`bar + 2 × per-side load`), never from a rounded leftover, so
 * the number it names is always loadable and never below the bar.
 * @param {number|string} total
 * @param {{ bar?: number, plates?: number[], counts?: Record<string, number> }|null} [setup]
 * @returns {number|null}
 */
export function nearestBuildableTotal(total, setup = null) {
  const t = Number(total);
  if (!Number.isFinite(t)) return null;
  const resolved = resolvePlateSetup(setup);
  const { bar } = resolved;
  if (t <= bar) return null;

  const perSideUnits = toUnits((t - bar) / 2);
  const coins = normalizeCoins(resolved.plates, resolved.counts);
  const maxPlate = coins.reduce((max, coin) => Math.max(max, coin.units), 0);
  const upper = perSideUnits + maxPlate;
  if (upper > MAX_SEARCH_UNITS) return null;

  const search = reachableSums(coins, upper);
  const closest = closestSum(search, perSideUnits);
  if (closest == null || closest === perSideUnits) return null;
  return round2(bar + (closest / UNITS_PER_PLATE) * 2);
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
  const resolved = resolvePlateSetup(setup, unit);
  const bd = computePlateBreakdown(Number(total), resolved.bar, resolved.plates, resolved.counts);
  const s = formatPlates(bd);
  return s ? `${s} / side` : '';
}
