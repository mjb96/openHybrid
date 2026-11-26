// @ts-check
// Exercise and muscle drilldowns. Both retain links to the exact workouts that
// underpin the aggregate so a trend is never a dead-end number.

import { resolveExercise } from '../../exercises/catalog.js';
import { buildExerciseDetailModel } from '../exercise-detail.js';
import { SET_MODE, formatDistance, formatDuration } from '../../set-utils.js';
import { buildWeeklyStrengthVolumeDetail } from '../strength-volume-detail.js';
import { comparePeriodValues } from '../period-comparison.js';
import { VOLUME_LANDMARKS, zoneLabel, classifyVolume } from '../calculations/volume-landmarks.js';
import { esc } from './screen-kit.js';
import { buildVolumeGuideModel, musclePriorityLabel, muscleVolumeCorridor } from '../volume-guide.js';
import { resolveProgramForState } from '../../state.js';
import { formatDayMonthShort, formatWeekRange } from '../../dates.js';

/** @type {'4w'|'12w'|'6m'|'1y'|'all'} */
let _exerciseRange = '12w';
export const EXERCISE_RANGES = Object.freeze(['4w', '12w', '6m', '1y', 'all']);

/**
 * The exercise drilldown's window follows the Progress range the athlete
 * entered with, so "is this working this year?" opens on a year instead of
 * silently resetting to 12 weeks. Unknown ids leave the leaf's own choice
 * alone.
 * @param {string} rangeId the hub's 30d | 3m | 1y | all
 * @returns {'4w'|'12w'|'1y'|'all'|null}
 */
export function exerciseRangeForProgress(rangeId) {
  switch (String(rangeId)) {
    case '30d': return '4w';
    case '3m': return '12w';
    case '1y': return '1y';
    case 'all': return 'all';
    default: return null;
  }
}

/** @param {string} id */
export function setExerciseRange(id) {
  if (EXERCISE_RANGES.includes(String(id))) _exerciseRange = /** @type {any} */ (id);
}

const fmtDate = (iso) => {
  if (!iso) return 'Date unavailable';
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtVolume = (value, unit) => `${Math.round(value).toLocaleString()} ${unit}`;
const muscleName = (id) => String(id || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
function fmtNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function chartValueLabel(model, value) {
  if (model.chart.kind === 'time') return formatDuration(value);
  if (model.chart.kind === 'distance') return `${formatDistance(value)}m`;
  if (model.chart.unit === 'reps') return `${Math.round(value)} reps`;
  return `${fmtNumber(value)} ${model.chart.unit}`;
}

// A small dependency-free SVG line chart. The evidence list below is the
// accessible equivalent; this is the visual the athlete actually came for.
function exerciseChartHTML(model) {
  const points = model.series || [];
  if (!points.length) return '';
  const W = 340;
  const H = 156;
  const padL = 42;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const values = points.map((point) => point.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const spread = max - min || Math.max(1, max * 0.1);
  const top = max + spread * 0.12;
  const bottom = Math.max(0, min - spread * 0.18);
  const x = (index) => padL + (points.length === 1
    ? (W - padL - padR) / 2
    : index * (W - padL - padR) / (points.length - 1));
  const y = (value) => padT + (1 - (value - bottom) / ((top - bottom) || 1)) * (H - padT - padB);
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  const grid = [0, 0.5, 1].map((fraction) => {
    const value = bottom + (top - bottom) * (1 - fraction);
    const gy = y(value).toFixed(1);
    return `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" class="an-ex-chart__grid"></line>
      <text x="${padL - 6}" y="${Number(gy) + 4}" text-anchor="end" class="an-ex-chart__axis">${esc(chartValueLabel(model, value))}</text>`;
  }).join('');
  const dots = points.map((point, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(point.value).toFixed(1)}" r="${point.isPr ? 4.5 : 3.2}" class="an-ex-chart__dot${point.isPr ? ' is-pr' : ''}" data-exercise-point><title>${esc(point.dateLabel)}: ${esc(chartValueLabel(model, point.value))}${point.isPr ? ' · PR' : ''}</title></circle>`).join('');
  const first = points[0];
  const last = points[points.length - 1];
  const title = model.chart.kind === 'time' ? 'Hold time'
    : model.chart.kind === 'distance' ? 'Carry distance'
      : model.chart.kind === 'e1rm' ? 'Estimated 1RM'
        : model.chart.unit === 'reps' ? 'Best reps' : 'Top load';
  return `<section class="an-volume-panel an-ex-chart-panel">
    <div class="an-volume-panel__head"><h3>${title}</h3><span>${esc(chartValueLabel(model, last.value))}</span></div>
    <svg class="an-ex-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)} across ${points.length} session${points.length === 1 ? '' : 's'}, from ${esc(chartValueLabel(model, first.value))} to ${esc(chartValueLabel(model, last.value))}">
      <title>${esc(title)}</title>
      <desc>${points.map((point) => `${point.dateLabel}: ${chartValueLabel(model, point.value)}`).join('. ')}</desc>
      ${grid}
      <path d="${area}" class="an-ex-chart__area"></path>
      <path d="${path}" class="an-ex-chart__line"></path>
      ${dots}
      <text x="${x(0).toFixed(1)}" y="${H - 7}" text-anchor="start" class="an-ex-chart__axis">${esc(first.dateLabel)}</text>
      ${points.length > 1 ? `<text x="${x(points.length - 1).toFixed(1)}" y="${H - 7}" text-anchor="end" class="an-ex-chart__axis">${esc(last.dateLabel)}</text>` : ''}
    </svg>
  </section>`;
}

function exerciseStatCards(model) {
  const unit = model.unit;
  if (model.shape === SET_MODE.TIME) {
    return [
      ['Sessions', String(model.totals.sessions)],
      ['Best hold', model.bestText],
      ['Total hold time', formatDuration(model.totals.holdSeconds)],
      ['Working sets', String(model.totals.sets)],
    ];
  }
  if (model.shape === SET_MODE.DISTANCE) {
    return [
      ['Sessions', String(model.totals.sessions)],
      ['Best carry', model.bestText],
      ['Total distance', `${formatDistance(model.totals.distanceM)}m`],
      ['Working sets', String(model.totals.sets)],
    ];
  }
  return [
    ['Sessions', String(model.totals.sessions)],
    ['Best set', model.bestText],
    ['Total volume', model.totals.volume > 0 ? fmtVolume(model.totals.volume, unit) : '—'],
    ['Total reps', String(model.totals.reps)],
  ];
}

/** @param {any} state @param {{id?:string,name?:string}} entity */
/**
 * "Heaviest working set at or above each rep target" — the definition is printed,
 * because a records table without its rule is a rumour.
 */
function setRecordsHTML(model) {
  const records = model.setRecords;
  if (!records?.hasData) return '';
  const rows = [];

  if (records.shape === 'time' && records.bestTimeSec) {
    rows.push([formatDuration(records.bestTimeSec.seconds), records.bestTimeSec.date, 'longest hold']);
  } else if (records.shape === 'distance' && records.bestDistanceM) {
    rows.push([`${formatDistance(records.bestDistanceM.metres)}m`, records.bestDistanceM.date, 'longest carry']);
  } else {
    if (records.bestRepsInSet) {
      rows.push([`${records.bestRepsInSet.reps} reps`, records.bestRepsInSet.date, 'most reps in a set']);
    }
    for (const record of records.repTargets || []) {
      // Unit comes from the model: an analytics view must never hardcode kg.
      rows.push([`${record.weight} ${model.unit}`, record.date, `${record.reps} reps · target ${record.target}`]);
    }
  }
  if (!rows.length) return '';

  return `<section class="an-volume-panel" aria-label="Set records">
    <div class="an-volume-panel__head"><h3>Set records</h3><span>Heaviest working set at or above each rep target</span></div>
    <div class="an-evidence-list">${rows.map(([value, date, note]) => `
      <div class="an-evidence-row">
        <span class="an-evidence-row__date">${esc(String(date))}</span>
        <span class="an-evidence-row__body">
          <span class="an-evidence-row__title">${esc(String(value))}</span>
          <span class="an-evidence-row__meta">${esc(String(note))}</span>
        </span>
      </div>`).join('')}</div>
    <p class="text-sm text-muted" style="margin:8px 0 0">Warm-up sets never count.</p>
  </section>`;
}

export function renderExerciseDetail(state, entity = {}) {
  const root = document.getElementById('strengthEntityDetail');
  if (!root) return;
  const canonical = resolveExercise(entity.id || entity.name || '');
  const name = canonical?.name || entity.name || String(entity.id || '').replace(/^custom:/, '') || 'Exercise';
  const model = buildExerciseDetailModel(state, name, { range: _exerciseRange });
  const rangeButton = (id, label) => `<button class="an-segment__button ${_exerciseRange === id ? 'is-active' : ''}" data-exercise-range="${id}" aria-pressed="${_exerciseRange === id}">${label}</button>`;
  const comparisonTone = model.change?.direction === 'up' ? 'is-up' : model.change?.direction === 'down' ? 'is-down' : '';
  const cards = model.hasData ? exerciseStatCards(model) : [];

  root.innerHTML = `<header class="an-detail-head"><div><span class="an-detail-kicker">Exercise analytics</span><h2>${esc(name)}</h2></div></header>
    <nav class="an-segment an-segment--five" aria-label="Exercise history range">${rangeButton('4w', '4 wk')}${rangeButton('12w', '12 wk')}${rangeButton('6m', '6 mo')}${rangeButton('1y', '1 yr')}${rangeButton('all', 'All')}</nav>
    ${!model.hasData ? '<div class="an-empty-state"><strong>No completed history in this range</strong><span>Try a longer range or complete a working set for this exercise.</span></div>' : `
      <article class="an-ex-hero">
        <span class="an-ex-hero__k">Latest session · ${esc(model.latest.dateLabel)}</span>
        <strong class="an-ex-hero__v">${esc(model.latest.top.text)}</strong>
        <span class="an-ex-hero__sub">${model.change ? `<b class="${comparisonTone}">${model.change.direction === 'up' ? '↑' : model.change.direction === 'down' ? '↓' : '='} ${esc(model.change.text)}</b>` : 'First session in this range'} · ${model.latest.sets} working set${model.latest.sets === 1 ? '' : 's'}</span>
      </article>
      ${model.relative ? `<p class="an-ex-relative">Relative strength <b>${model.relative.ratio.toFixed(2)}× bodyweight</b> <small>(est. · ${model.relative.weight} ${esc(model.unit)} on ${esc(formatDayMonthShort(model.relative.date))})</small></p>` : ''}
      <section class="an-volume-summary an-ex-summary" aria-label="Exercise summary">
        ${cards.map(([label, value]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('')}
      </section>
      ${exerciseChartHTML(model)}
      ${model.rate ? `<p class="an-ex-rate"><span>Trend</span> ${esc(model.rate.text)} <small>across ${model.rate.weeks} week${model.rate.weeks === 1 ? '' : 's'} in range</small></p>` : ''}
      ${setRecordsHTML(model)}
      <section class="an-volume-panel"><div class="an-volume-panel__head"><h3>Session history</h3><span>Tap a session for exact evidence</span></div>
        <div class="an-evidence-list">${model.sessions.map((row) => `<button class="an-evidence-row" data-action="open-activity-detail" data-activity-id="${esc(row.activityId)}">
          <span class="an-evidence-row__date">${esc(row.dateLabel)}</span>
          <span class="an-evidence-row__body">
            <span class="an-evidence-row__title">${esc(row.top.text)}${row.isPr ? ' <span class="an-ex-pr">PR</span>' : ''}</span>
            <span class="an-evidence-row__meta">${row.sets} set${row.sets === 1 ? '' : 's'}${row.shape === SET_MODE.REPS ? ` · ${row.reps} reps${row.volume ? ` · ${fmtVolume(row.volume, model.unit)}` : ''}${row.e1rm ? ` · ${row.e1rm} ${model.unit} e1RM` : ''}` : row.shape === SET_MODE.TIME ? ` · ${formatDuration(row.holdSeconds)} total` : ` · ${formatDistance(row.distanceM)}m total`}</span>
          </span>
          <span class="an-evidence-row__arrow" aria-hidden="true">›</span>
        </button>`).join('')}</div>
      </section>`}
    <details class="an-method"><summary>How is this calculated?</summary><p>History follows this exercise across programs and merges only explicit catalogue aliases. A rep set reports its best estimated 1RM when eligible, a hold its longest time and a carry its longest distance. PRs compare against every earlier session; the chart is limited to the selected range. Volume is weight × reps for completed working sets, never invented for holds or carries.</p></details>`;

  root.querySelectorAll('[data-exercise-range]').forEach(button => button.addEventListener('click', () => {
    const next = button.getAttribute('data-exercise-range');
    _exerciseRange = EXERCISE_RANGES.includes(String(next)) ? /** @type {any} */ (next) : '12w';
    renderExerciseDetail(state, entity);
  }));
}

/** @param {any} state @param {{id?:string,name?:string}} entity @param {string} weekStart */
export function renderMuscleDetail(state, entity = {}, weekStart) {
  const root = document.getElementById('strengthEntityDetail');
  if (!root) return;
  const id = entity.id || '';
  const name = entity.name || muscleName(id);
  const model = buildWeeklyStrengthVolumeDetail(state, { weekStart });
  const current = model.muscles.find(item => item.id === id) || { directSets: 0, indirectSets: 0, totalSetCredits: 0, exerciseIds: [], exerciseCredits: [], workoutIds: [] };
  const previousMuscle = model.comparisonPeriod.muscles.find(item => item.id === id);
  const comparison = comparePeriodValues({ currentValue: current.totalSetCredits, previousValue: previousMuscle?.totalSetCredits ?? null, isCurrentWeek: model.isCurrentWeek });
  const landmarks = VOLUME_LANDMARKS[id];
  const zone = landmarks ? classifyVolume(current.totalSetCredits, landmarks) : 'no_data';
  const activeProgram = resolveProgramForState(state, state?.activeProgramId);
  const guide = buildVolumeGuideModel(state, { weekStart, program: activeProgram });
  const guideRow = guide.muscles.find(item => item.id === id);
  const corridor = muscleVolumeCorridor(state, id, { weekStart, program: activeProgram });
  const series = corridor.points;
  const max = Math.max(1, corridor.planned, corridor.reference?.max || 0, ...series.map(item => item.value));
  const referenceBottom = corridor.reference ? corridor.reference.min / max * 100 : 0;
  const referenceHeight = corridor.reference ? Math.max(0, corridor.reference.max - corridor.reference.min) / max * 100 : 0;
  const workouts = model.workouts.filter(workout => current.workoutIds.includes(workout.id));
  const contributingExercises = current.exerciseCredits || [];

  root.innerHTML = `<header class="an-detail-head"><div><span class="an-detail-kicker">Muscle analytics</span><h2>${esc(name)}</h2></div><span class="an-period-status ${model.isCurrentWeek ? 'is-live' : ''}">${model.status}</span></header>
    <p class="an-detail-period">${formatWeekRange(model.weekStart, model.weekEnd) || 'Date unavailable'}</p>
    <section class="an-volume-summary" aria-label="Estimated muscle-set summary">
      <article><span>Total set credits</span><strong>${current.totalSetCredits.toFixed(1)}</strong></article>
      <article><span>Direct sets</span><strong>${current.directSets.toFixed(1)}</strong></article>
      <article><span>Indirect sets</span><strong>${current.indirectSets.toFixed(1)}</strong></article>
      <article><span>Priority</span><strong>${musclePriorityLabel(guideRow?.priority || 'track')}</strong></article>
    </section>
    <article class="an-volume-compare"><div><span class="an-volume-compare__label">Period comparison</span><strong class="an-volume-compare__value">${comparison.isComparable ? `${comparison.percentageChange > 0 ? '+' : ''}${comparison.percentageChange}%` : esc(comparison.message || 'No comparison')}</strong><span class="an-volume-compare__meta">${esc(comparison.comparisonLabel)}</span></div><div class="an-volume-compare__periods"><span>${current.totalSetCredits.toFixed(1)} selected</span><span>${comparison.previousTotal == null ? '—' : comparison.previousTotal.toFixed(1)} prior</span></div></article>
    <section class="an-volume-panel"><div class="an-volume-panel__head"><h3>8-week volume corridor</h3><span>${guideRow?.status || zoneLabel(zone)}</span></div><div class="an-volume-corridor" style="--corridor-bottom:${referenceBottom}%;--corridor-height:${referenceHeight}%"><div class="an-volume-corridor__band"></div><div class="an-volume-corridor__bars">${series.map((item, index) => `<div class="an-volume-corridor__week"><span class="an-volume-corridor__logged" style="height:${Math.max(2, item.value / max * 100)}%"></span>${index === series.length - 1 && corridor.planned > 0 ? `<span class="an-volume-corridor__planned" style="height:${corridor.planned / max * 100}%"></span>` : ''}<small>${item.value ? item.value.toFixed(item.value % 1 ? 1 : 0) : '0'}</small></div>`).join('')}</div></div><div class="an-volume-corridor-legend"><span>Solid · logged</span>${corridor.reference ? `<span>Shaded · ${esc(corridor.reference.label.toLowerCase())}</span>` : ''}${corridor.planned ? `<span>Outline · ${fmtVolume(corridor.planned, 'planned credits')}</span>` : ''}</div></section>
    <section class="an-volume-panel"><div class="an-volume-panel__head"><h3>Contributors</h3><span>${contributingExercises.length} exercises</span></div>${contributingExercises.length ? contributingExercises.map(item => `<div class="an-metric-row"><span class="an-metric-label">${esc(item.name)}<small>${item.directSets.toFixed(1)} direct · ${item.indirectSets.toFixed(1)} indirect</small></span><span class="an-metric-value">${item.totalSetCredits.toFixed(1)} credits</span></div>`).join('') : '<div class="an-empty-inline">No mapped exercises contributed in this period.</div>'}</section>
    <section class="an-volume-panel"><div class="an-volume-panel__head"><h3>Contributing workouts</h3><span>Exact evidence</span></div><div class="an-evidence-list">${workouts.length ? workouts.map(workout => `<button class="an-evidence-row" data-action="open-activity-detail" data-activity-id="${esc(workout.id)}"><span class="an-evidence-row__date">${esc(fmtDate(workout.date))}</span><span class="an-evidence-row__body"><span class="an-evidence-row__title">${esc(workout.title)}</span><span class="an-evidence-row__meta">${workout.workingSets} total workout sets</span></span><span class="an-evidence-row__arrow">›</span></button>`).join('') : '<div class="an-empty-inline">No contributing workouts in this period.</div>'}</div></section>
    <details class="an-method"><summary>How are muscle sets estimated?</summary><p>Each completed working set gives 1.0 credit to the exercise’s main muscle and 0.5 or 0.25 to meaningful supporting muscles. Historical results use the current exercise catalogue, so a later classification update can change the retrospective breakdown.</p>${corridor.reference ? `<p>${esc(corridor.reference.label)} for ${esc(name)}: ${corridor.reference.min}–${corridor.reference.max} credits. This is descriptive planning guidance, not your biological minimum, recovery limit, readiness score or medical advice.</p>` : '<p>Track only records exposure without judging it against a target.</p>'}</details>`;
}
