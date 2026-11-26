// @ts-check
// =============================================================================
// ENDURANCE MODEL (js/analytics/endurance.js)
//
// "Is my running improving?" — run distance, pace and consistency over the
// selected window, with WALKING kept on its own line.
//
// The reader is `collectRunningHistory`, the same canonical dated collector the
// Running analytics screen uses, so the band can never disagree with the screen
// it links to. Walks are excluded from every run figure (plan §7.2) and are
// never given a pace; they are reported as their own count and distance.
// =============================================================================
import { addDaysISO, formatDayMonthShort, localDayKey } from '../dates.js';
import { collectRunningHistory } from './running-detail.js';
import { inRange } from './ranges.js';
import { weekStartOf } from './weekly-aggregate.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round1 = (value) => Math.round(value * 10) / 10;

/** Buckets are weeks up to ~4 months, months beyond that. */
function bucketOf(dateISO, monthly) {
  if (!monthly) return /** @type {string} */ (weekStartOf(dateISO));
  return dateISO.slice(0, 7);
}

function bucketLabel(key, monthly) {
  if (!monthly) return formatDayMonthShort(key);
  const [year, month] = key.split('-');
  return `${MONTHS[Number(month) - 1] || month} ${year.slice(2)}`;
}

function bucketKeys(startISO, endISO, monthly) {
  const keys = [];
  if (monthly) {
    let [year, month] = startISO.split('-').map(Number);
    while (keys.length < 240) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (`${key}-01` > endISO) break;
      keys.push(key);
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
    // Keep the newest months: a capped chart must never omit current training.
    return keys.length > 60 ? keys.slice(-60) : keys;
  }
  let cursor = /** @type {string} */ (weekStartOf(startISO));
  while (cursor && cursor <= endISO) {
    keys.push(cursor);
    cursor = /** @type {string} */ (addDaysISO(cursor, 7));
  }
  return keys.length > 60 ? keys.slice(-60) : keys;
}

/**
 * @param {any} state
 * @param {{ range: any, previous?: { startISO: string, endISO: string }|null, today?: string }} options
 */
export function buildEnduranceModel(state, options = /** @type {any} */ ({})) {
  const range = options.range;
  if (!range) throw new Error('buildEnduranceModel: range is required');

  const monthly = !(range.days && range.days <= 120);
  const { records } = collectRunningHistory(state, { today: range.endISO });
  const inWindow = records.filter((record) => inRange(record.date, range));
  const previousRecords = options.previous
    ? records.filter((record) => inRange(record.date, options.previous))
    : [];

  const runs = inWindow.filter((record) => record.type !== 'walk');
  const walks = inWindow.filter((record) => record.type === 'walk');

  const runKm = runs.reduce((total, record) => total + record.distanceKm, 0);
  const walkKm = walks.reduce((total, record) => total + record.distanceKm, 0);
  const runTimeSec = runs.reduce((total, record) => total + record.durationSec, 0);
  const longestRunKm = runs.reduce((best, record) => Math.max(best, record.distanceKm), 0);

  // Pace is distance-weighted across eligible runs only, and null without one.
  const paceEligible = runs.filter((record) => record.paceEligible);
  const paceDistance = paceEligible.reduce((total, record) => total + record.distanceKm, 0);
  const avgPaceSecPerKm = paceDistance > 0
    ? paceEligible.reduce((total, record) => total + record.durationSec, 0) / paceDistance
    : null;

  const previousRunKm = previousRecords
    .filter((record) => record.type !== 'walk')
    .reduce((total, record) => total + record.distanceKm, 0);

  const byBucket = new Map();
  for (const record of inWindow) {
    const key = bucketOf(record.date, monthly);
    const bucket = byBucket.get(key) || { runKm: 0, walkKm: 0, runCount: 0, walkCount: 0 };
    if (record.type === 'walk') { bucket.walkKm += record.distanceKm; bucket.walkCount += 1; }
    else { bucket.runKm += record.distanceKm; bucket.runCount += 1; }
    byBucket.set(key, bucket);
  }
  const startISO = range.startISO || inWindow[0]?.date || null;
  const buckets = startISO
    ? bucketKeys(startISO, range.endISO, monthly).map((key) => {
      const bucket = byBucket.get(key) || { runKm: 0, walkKm: 0, runCount: 0, walkCount: 0 };
      return {
        key,
        label: bucketLabel(key, monthly),
        runKm: round1(bucket.runKm),
        walkKm: round1(bucket.walkKm),
        runCount: bucket.runCount,
        walkCount: bucket.walkCount,
      };
    })
    : [];

  // Twelve weeks of run/walk days, ending on the window's last week start.
  const lastWeek = weekStartOf(range.endISO);
  const consistency = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = /** @type {string} */ (addDaysISO(lastWeek, -i * 7));
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = /** @type {string} */ (addDaysISO(weekStart, d));
      const dayRecords = records.filter((record) => record.date === date);
      const hasRun = dayRecords.some((record) => record.type !== 'walk');
      const hasWalk = dayRecords.some((record) => record.type === 'walk');
      days.push(hasRun ? 'run' : hasWalk ? 'walk' : null);
    }
    consistency.push({ weekISO: weekStart, days });
  }

  return {
    range,
    monthly,
    runs: runs.length,
    runKm: round1(runKm),
    runTimeSec: Math.round(runTimeSec),
    avgPaceSecPerKm,
    longestRunKm: round1(longestRunKm),
    walks: walks.length,
    walkKm: round1(walkKm),
    buckets,
    consistency,
    deltaKm: previousRunKm > 0 ? round1(runKm - previousRunKm) : null,
    // At least one run: walking alone is not "endurance training" for this band.
    hasData: runs.length > 0,
  };
}
