// @ts-check
/**
 * Largest-remainder percentages: parts add up to exactly 100 (one decimal).
 * Independently rounding each share produced 99.9 for three equal parts.
 * @param {Record<string, number>} values
 * @param {number} total
 */
export function allocatePercentages(values, total) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!(total > 0)) return out;
  const entries = Object.entries(values).map(([key, value]) => {
    const exact = (value / total) * 1000;
    return { key, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let assigned = entries.reduce((sum, entry) => sum + entry.floor, 0);
  entries.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; assigned < 1000 && i < entries.length; i++, assigned++) entries[i].floor += 1;
  for (const entry of entries) out[entry.key] = entry.floor / 10;
  return out;
}
