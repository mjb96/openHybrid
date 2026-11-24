// @ts-check
// =============================================================================
// ENDURANCE BAND (js/analytics/views/view-endurance.js)
//
// "Is my running improving?" — run distance over the window, pace as a stat with
// a delta (never a second axis on the bars), and walking reported separately.
// =============================================================================
import { band, dataTableDisclosure, legend, stateBlock } from './band-kit.js';
import { progressDetailFor } from '../progress-sections.js';
import { esc } from './screen-kit.js';
import { formatRunDistance } from '../../workout/run-units.js';
import { formatDuration } from '../../set-utils.js';

const RUN_COLOR = 'var(--color-blue, #3b82f6)';
const WALK_COLOR = 'rgba(148, 163, 184, 0.55)';

/** @param {number} secondsPerKm @param {string} unit */
function paceText(secondsPerKm, unit) {
  if (!(secondsPerKm > 0)) return null;
  // Whole seconds first — rounding the remainder alone renders 5:60.
  const perUnit = Math.round(unit === 'mi' ? secondsPerKm / 0.621371 : secondsPerKm);
  return `${Math.floor(perUnit / 60)}:${String(perUnit % 60).padStart(2, '0')} /${unit}`;
}

/**
 * @param {any} model
 */
function stackHTML(model, distanceUnit) {
  if (!model.buckets.length) return '';
  const max = Math.max(...model.buckets.map((bucket) => bucket.runKm), 0);
  if (!(max > 0)) return '';
  const columns = model.buckets.map((bucket) => {
    const runHeight = (bucket.runKm / max) * 100;
    const walkHeight = bucket.walkKm > 0 ? Math.max(2, (bucket.walkKm / max) * 100) : 0;
    return `<div class="pg-stack__bucket">
      <div class="pg-stack__pair" aria-hidden="true">
        <span class="pg-stack__col" style="height:${runHeight.toFixed(2)}%;background:${RUN_COLOR}"></span>
        ${walkHeight ? `<span class="pg-stack__col pg-stack__col--walk" style="height:${walkHeight.toFixed(2)}%"></span>` : ''}
      </div>
      <span class="pg-stack__label">${esc(bucket.label)}</span>
      <span class="sr-only">${esc(`${bucket.label}: ${formatRunDistance(bucket.runKm, distanceUnit)} run${bucket.walkKm ? `, ${formatRunDistance(bucket.walkKm, distanceUnit)} walk` : ''}`)}</span>
    </div>`;
  }).join('');
  return `<div class="pg-stack" role="img" aria-label="${esc(`Run distance per ${model.monthly ? 'month' : 'week'}, peak ${formatRunDistance(max, distanceUnit)}`)}">${columns}</div>`;
}

/**
 * @param {any} model
 */
function consistencyHTML(model) {
  const cells = model.consistency.map((week) => {
    const marks = week.days.map((kind) => `<i class="pg-daycell${kind ? ` is-${kind}` : ''}"></i>`).join('');
    const label = `${week.weekISO}: ${week.days.filter(Boolean).length} active day${week.days.filter(Boolean).length === 1 ? '' : 's'}`;
    return `<div class="pg-days__week" aria-hidden="true">${marks}</div>`;
  }).join('');
  return `<div class="pg-days" aria-label="Run days over the last 12 weeks">${cells}</div>
    <p class="pg-band__sub" style="margin-top:6px">12 weeks · a filled cell is a run day, an outlined cell a walk-only day</p>`;
}

/**
 * @param {ReturnType<import('../endurance.js').buildEnduranceModel>|null} model
 * @param {{ error?: string|null, distanceUnit?: string, hidden?: string[] }} [options]
 */
export function renderEndurance(model, options = {}) {
  const distanceUnit = options.distanceUnit === 'mi' ? 'mi' : 'km';

  if (options.error) {
    return band({
      id: 'endurance',
      detail: progressDetailFor('endurance'),
      eyebrow: 'Endurance',
      title: 'Endurance',
      body: stateBlock('error', {
        message: 'We could not calculate your running.',
        detail: options.error,
        retry: { label: 'Try again' },
      }),
    });
  }

  if (!model) {
    return band({ id: 'endurance', detail: progressDetailFor('endurance'), eyebrow: 'Endurance', title: 'Endurance', body: stateBlock('loading', { height: 220 }) });
  }

  if (!model.hasData) {
    return band({
      id: 'endurance',
      detail: progressDetailFor('endurance'),
      eyebrow: 'Endurance',
      title: 'Endurance',
      sub: model.range?.spanLabel,
      body: stateBlock('empty', {
        message: 'No runs in this period.',
        action: { label: 'Log a run', action: 'open-run-logger' },
      }),
    });
  }

  const pace = paceText(model.avgPaceSecPerKm, distanceUnit);
  const deltaText = model.deltaKm == null
    ? null
    : `${model.deltaKm > 0 ? '+' : ''}${formatRunDistance(Math.abs(model.deltaKm), distanceUnit)} vs previous period`;

  const stats = [
    ['Runs', String(model.runs)],
    ['Run time', formatDuration(model.runTimeSec) || '—'],
    ['Avg pace', pace || '—'],
    ['Longest run', formatRunDistance(model.longestRunKm, distanceUnit)],
  ].map(([label, value]) => `<div><b>${esc(value)}</b><span>${esc(label)}</span></div>`).join('');

  const walks = model.walks > 0
    ? `<p class="pg-balance__excluded">Walks: ${model.walks} · ${esc(formatRunDistance(model.walkKm, distanceUnit))} — not in run totals.</p>`
    : '';

  const body = `
    ${stackHTML(model, distanceUnit)}
    ${legend([
      { label: 'Run', color: RUN_COLOR },
      { label: 'Walk', color: WALK_COLOR, muted: true },
    ])}
    <div class="pg-statrow">${stats}</div>
    ${deltaText ? `<p class="pg-pulse__delta pg-pulse__delta--${model.deltaKm > 0 ? 'up' : model.deltaKm < 0 ? 'down' : 'flat'}">${esc(deltaText)}</p>` : ''}
    ${walks}
    ${consistencyHTML(model)}
    <div class="pg-band__actions">
      ${Array.isArray(options.hidden) && options.hidden.includes('enduranceRunning') ? '' : '<button type="button" class="pg-band__action" data-action="open-analytics" data-context="running">All running metrics →</button>'}
      ${Array.isArray(options.hidden) && options.hidden.includes('enduranceProjections') ? '' : '<button type="button" class="pg-band__action" data-action="open-analytics" data-context="projections">Projections →</button>'}
    </div>
    ${dataTableDisclosure(
      ['Period', `Run (${distanceUnit})`, `Walk (${distanceUnit})`, 'Runs'],
      model.buckets.map((bucket) => [
        bucket.label,
        formatRunDistance(bucket.runKm, distanceUnit),
        bucket.walkKm ? formatRunDistance(bucket.walkKm, distanceUnit) : '—',
        String(bucket.runCount),
      ]),
      `Run and walk distance for ${model.range?.spanLabel || 'the selected period'}`,
    )}`;

  return band({
    id: 'endurance',
    detail: progressDetailFor('endurance'),
    eyebrow: 'Endurance',
    title: 'Endurance',
    value: formatRunDistance(model.runKm, distanceUnit),
    valueUnit: 'run',
    sub: model.range?.spanLabel,
    ariaLabel: `${model.range?.spanLabel || 'Selected period'} endurance: ${formatRunDistance(model.runKm, distanceUnit)} run over ${model.runs} runs${model.walks ? `, plus ${model.walks} walks` : ''}`,
    body,
  });
}
