// ==========================================
// BODY WEIGHT VIEW (analytics/views/view-bodyweight.js)
//
// Progress → Body weight. The graph is the history; the summary is the part a
// single weigh-in cannot tell you: a 21-day weekly rate, a goal line and an
// optional lose/gain/hold corridor. Weekly means keep the history honest when
// water and salt move a morning.
// ==========================================
import { renderBodyWeightWithMA, renderSiteTrend } from '../charts.js';
import { buildBodyweightModel } from '../../metrics/bodyweight.js';
import { buildMeasurementModel, cmToDisplay, roundDisplay } from '../../metrics/measurements.js';
import { formatDayMonth, todayKey } from '../../dates.js';

let rangeDays = 90;
/** The model the last full render built, so a site tap never re-collects state. */
/** @type {ReturnType<typeof buildMeasurementModel>|null} */
let lastMeasurementModel = null;
/** One site at a time; a second tap on the same site collapses the chart. */
/** @type {string|null} */
let activeMeasurementSite = null;

/** @param {number|string} days */
export function setBodyweightRange(days) {
  const value = Number(days);
  rangeDays = value === 0 ? 0 : (Number.isFinite(value) && value > 0 ? Math.round(value) : 90);
}

export function getBodyweightRange() {
  return rangeDays;
}

/** @param {number} value @param {string} unit */
const fmtWeight = (value, unit) => `${Number(value).toFixed(1)} ${unit}`;

/** @param {number} value */
const signed = (value) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

/**
 * @param {ReturnType<typeof buildBodyweightModel>} model
 * @param {any} state
 */
function summaryHtml(model, state) {
  if (!model.latest) return '<p class="bw-summary__note">Log a weigh-in to start the trend.</p>';
  const unit = model.unit;
  const log = (state.bodyWeightLog || []).filter((entry) => entry && entry.date && Number(entry.weight) > 0);
  const cutoff = new Date(Date.now() - 7 * 86400000);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  const recent = log.filter((entry) => entry.date >= cutoffKey).map((entry) => Number(entry.weight));
  const avg7 = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : model.latest.weight;
  const first = model.points[0]?.weight;
  const delta = first != null ? model.latest.weight - first : null;
  const rate = model.rate;
  const missing = Math.max(0, 6 - (rate.n || 0));
  const rateText = rate.enough
    ? `Trend ${signed(rate.perWeek)} ${unit}/week (${signed(rate.pct)}%)`
    : rate.n >= 6
      ? 'Spread your weigh-ins across at least 10 days for a weekly trend.'
      : model.points.length > rate.n
        // The graph can show months of weekly means while the rate needs a
        // recent 10-day window. Say that instead of claiming only three total
        // weigh-ins exist.
        ? `Add ${missing} more weigh-in${missing === 1 ? '' : 's'} in the last 10 days for a weekly rate — earlier entries still appear in the graph.`
        : `Need ${missing} more weigh-in${missing === 1 ? '' : 's'} across 10 days for a weekly trend.`;
  const statusText = {
    in: 'On pace',
    slow: 'Slower than planned',
    fast: 'Faster than planned',
    off: 'Outside your range',
  }[model.status] || '';
  const goalText = model.targetWeight
    ? `Goal ${fmtWeight(model.targetWeight, unit)} · ${Math.abs(model.latest.weight - model.targetWeight).toFixed(1)} ${unit} to go`
    : 'No goal weight set';
  const low = Math.min(Math.abs(model.corridor?.min || 0), Math.abs(model.corridor?.max || 0));
  const high = Math.max(Math.abs(model.corridor?.min || 0), Math.abs(model.corridor?.max || 0));
  const corridor = model.corridor
    ? `${model.corridor.dir === 'hold' ? 'Hold within ±' : model.corridor.dir === 'gain' ? 'Gain ' : 'Lose '}${low === high ? low : `${low}–${high}`} ${model.corridor.by === '%' ? '% / week' : `${unit} / week`}`
    : 'No rate range set';

  return `<div class="bw-summary" aria-live="polite">
    <div class="bw-summary__row"><span>Latest · ${formatDayMonth(model.latest.date)}</span><strong>${fmtWeight(model.latest.weight, unit)}</strong></div>
    <div class="bw-summary__row"><span>7-day average</span><strong>${fmtWeight(avg7, unit)}</strong></div>
    <div class="bw-summary__row"><span>Change over this range</span><strong>${delta == null ? '—' : `${signed(delta)} ${unit}`}</strong></div>
    <div class="bw-summary__row"><span>${rateText}</span>${statusText ? `<strong class="bw-summary__status" style="color:${model.status === 'in' ? 'var(--color-green)' : 'var(--color-amber)'}">${statusText}</strong>` : ''}</div>
    <div class="bw-summary__row"><span>${goalText}</span><strong>${corridor}</strong></div>
  </div>`;
}

/**
 * @param {ReturnType<typeof buildBodyweightModel>} model
 */
function weeklyHtml(model) {
  if (!model.weekly.length) return '';
  const rows = model.weekly.slice(0, 10).map((week) => {
    const delta = week.delta == null ? '' : `<small>${signed(week.delta)} ${model.unit}</small>`;
    return `<button type="button" class="bw-week-row" data-action="edit-bw-row" data-date="${week.key}">
      <span>Week of ${formatDayMonth(week.key)} <small>· ${week.n} weigh-in${week.n === 1 ? '' : 's'}</small></span>
      <strong>${fmtWeight(week.avg, model.unit)} ${delta}</strong>
    </button>`;
  }).join('');
  return `<article class="card-dark p-3 bw-week-card">
    <div class="flex-between" style="align-items:baseline;gap:12px;"><strong style="font-size:.82rem;">Weekly averages</strong><small class="text-muted" style="font-size:.66rem;">Newest first</small></div>
    ${rows}
  </article>`;
}

/**
 * The points and scale one site cell controls. Body fat is an entered
 * percentage, so it gets the percent scale; tape sites read in the athlete's
 * chosen length unit.
 * @param {ReturnType<typeof buildMeasurementModel>|null} model
 * @param {string} key
 */
function measurementTrendData(model, key) {
  if (!model) return null;
  if (key === 'bodyFat') {
    if (!model.bodyFat?.latest) return null;
    return {
      points: model.bodyFat.points.map((point) => ({ date: point.date, value: point.value })),
      options: { unit: '%', label: 'Body fat', percent: true },
    };
  }
  const site = model.sites.find((entry) => entry.key === key);
  if (!site?.latest) return null;
  return {
    points: site.points.map((point) => ({ date: point.date, value: point.cm })),
    options: { unit: model.unit, label: site.label, percent: false },
  };
}

/**
 * Paint the chart for a site into the live container. Returns false when the
 * site is no longer measured (for example after a delete re-render).
 * @param {HTMLElement} container
 * @param {string} key
 */
function paintMeasurementTrend(container, key) {
  const data = measurementTrendData(lastMeasurementModel, key);
  if (!data) return false;
  container.hidden = false;
  renderSiteTrend(container, data.points, data.options);
  return true;
}

/**
 * Toggle one site's history below the grid. No analytics re-render and no
 * scroll call: the card stays exactly where the athlete's thumb left it.
 * @param {string} siteKey
 */
export function showMeasurementTrend(siteKey) {
  if (!siteKey) return;
  const container = document.getElementById('bwMsTrend');
  if (!container || !lastMeasurementModel) return;
  const buttons = document.querySelectorAll('#bwMeasurements [data-action="measurement-site"]');
  const wasActive = activeMeasurementSite === siteKey;
  const data = wasActive ? null : measurementTrendData(lastMeasurementModel, siteKey);
  if (!wasActive && !data) return;
  activeMeasurementSite = wasActive ? null : siteKey;

  buttons.forEach((button) => {
    const on = !wasActive && button.getAttribute('data-site') === siteKey;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.classList.toggle('active', on);
  });

  if (wasActive) {
    container.hidden = true;
    container.textContent = '';
    return;
  }
  if (data) {
    container.hidden = false;
    renderSiteTrend(container, data.points, data.options);
  }
}

/**
 * Progress → Body weight → Measurements. The tape is the slow signal the scale
 * hides, so it sits beside the trend rather than in its own destination. Only
 * measured sites render: an unmeasured neck is not a zero. Every measured cell
 * is a button that toggles that site's history below the grid.
 * @param {ReturnType<typeof buildMeasurementModel>} model
 */
function measurementsHtml(model) {
  const unit = model.unit;
  const toggle = `<div class="settings-toggle-group" role="group" aria-label="Measurement unit">
      <button type="button" class="settings-toggle-btn${unit === 'cm' ? ' active' : ''}" data-action="measurement-unit" data-unit="cm">cm</button>
      <button type="button" class="settings-toggle-btn${unit === 'in' ? ' active' : ''}" data-action="measurement-unit" data-unit="in">in</button>
    </div>`;
  const head = `<div class="bw-ms-head">
      <div class="bw-ms-heading">
        <strong class="bw-ms-title">Measurements</strong>
        <small class="text-muted">${model.count
          ? `Updated ${formatDayMonth(model.latestDate)} · ${model.count} ${model.count === 1 ? 'entry' : 'entries'}`
          : 'Neck to calves · 14 tape sites'}</small>
      </div>
      ${toggle}
    </div>`;
  const logButton = '<button type="button" class="btn-action-block btn-blue" data-action="open-ms-sheet">Log measurements</button>';

  if (!model.count) {
    return `<article class="card-dark p-3 bw-measurements">
      ${head}
      <p class="bw-summary__note">Changes in the mirror often arrive before changes on the scale. Measure the same spots at the same time of day.</p>
      ${logButton}
    </article>`;
  }

  const cells = model.tracked.map((site) => {
    const value = roundDisplay(cmToDisplay(site.latest.cm, unit), unit);
    const delta = site.delta == null
      ? '<em class="bw-ms-delta bw-ms-delta--none">first reading</em>'
      : `<em class="bw-ms-delta">${site.delta > 0 ? '+' : ''}${roundDisplay(site.delta, unit)}</em>`;
    const active = activeMeasurementSite === site.key;
    return `<button type="button" class="bw-ms-site${active ? ' active' : ''}" data-action="measurement-site" data-site="${site.key}" aria-pressed="${active}" aria-controls="bwMsTrend" title="Show the ${site.label} trend">
      <span>${site.label}</span>
      <strong>${value.toFixed(1)} <small>${unit}</small></strong>
      ${delta}
    </button>`;
  }).join('');

  // Body fat is a percentage the athlete entered, not a tape length. Its delta
  // is in percentage points (`pp`), never percent-of-percent, and it only
  // appears when a reading exists — a body-fat-only log still renders the card.
  const bodyFatActive = activeMeasurementSite === 'bodyFat';
  const bodyFat = model.bodyFat?.latest
    ? `<button type="button" class="bw-ms-site bw-ms-site--bodyfat${bodyFatActive ? ' active' : ''}" data-action="measurement-site" data-site="bodyFat" aria-pressed="${bodyFatActive}" aria-controls="bwMsTrend" title="Entered reading — not estimated">
        <span>Body fat</span>
        <strong>${model.bodyFat.latest.value.toFixed(1)} <small>%</small></strong>
        ${model.bodyFat.delta == null
          ? '<em class="bw-ms-delta bw-ms-delta--none">first reading</em>'
          : `<em class="bw-ms-delta" title="Change in percentage points">${model.bodyFat.delta > 0 ? '+' : ''}${roundDisplay(model.bodyFat.delta).toFixed(1)} pp</em>`}
      </button>`
    : '';

  return `<article class="card-dark p-3 bw-measurements">
    ${head}
    <div class="bw-ms-grid">${cells}${bodyFat}</div>
    <div id="bwMsTrend" class="bw-ms-trend" hidden></div>
    ${logButton}
  </article>`;
}

/**
 * @param {any} model
 * @param {any} state
 */
function syncGoalEditor(model, state) {
  const target = document.getElementById('bwGoalWeight');
  if (target && document.activeElement !== target) target.value = model.targetWeight || '';
  const goal = state.settings?.rateGoal || null;
  const dir = document.getElementById('bwRateDir');
  const by = document.getElementById('bwRateBy');
  const lo = document.getElementById('bwRateLo');
  const hi = document.getElementById('bwRateHi');
  if (dir && document.activeElement !== dir) dir.value = goal?.dir || '';
  if (by && document.activeElement !== by) by.value = goal?.by || '%';
  if (lo && document.activeElement !== lo) lo.value = goal?.lo ?? '';
  if (hi && document.activeElement !== hi) hi.value = goal?.hi ?? '';
}

/**
 * @param {any} _data
 * @param {() => any} getState
 */
export function renderBodyWeightAnalytics(_data, getState) {
  const state = getState();
  const model = buildBodyweightModel(state, { rangeDays });
  const unit = model.unit;
  const container = document.getElementById('bwChartContainer');
  if (container) renderBodyWeightWithMA(container, model.points, { unit, goal: model.targetWeight });

  const summary = document.getElementById('bwSummary');
  if (summary) summary.innerHTML = summaryHtml(model, state);

  const weekly = document.getElementById('bwWeeklyStats');
  if (weekly) weekly.innerHTML = weeklyHtml(model);

  const measurements = document.getElementById('bwMeasurements');
  if (measurements) {
    const model = buildMeasurementModel(state);
    if (!model.count) activeMeasurementSite = null;
    lastMeasurementModel = model;
    measurements.innerHTML = measurementsHtml(model);
    // A unit toggle re-renders this card through the normal render path. The
    // open site stays open, in the new unit, without a second tap.
    const trend = document.getElementById('bwMsTrend');
    if (trend && activeMeasurementSite && !paintMeasurementTrend(trend, activeMeasurementSite)) {
      activeMeasurementSite = null;
    }
  }

  const date = document.getElementById('analyticsBwDate');
  if (date && !date.value) date.value = todayKey();
  const lastHint = document.getElementById('bwLastHint');
  if (lastHint) {
    lastHint.textContent = model.latest
      ? `Last ${fmtWeight(model.latest.weight, unit)} · ${formatDayMonth(model.latest.date)}`
      : 'No weigh-ins yet';
  }
  syncGoalEditor(model, state);

  document.querySelectorAll('[data-action="bw-range"]').forEach((button) => {
    button.classList.toggle('active', Number(button.getAttribute('data-days')) === rangeDays);
  });
}
