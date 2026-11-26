// @ts-check
// =============================================================================
// MAIN EXERCISES BAND (js/analytics/views/view-exercises.js)
//
// Five rows, each a link into the existing exercise drilldown. The sparkline is
// decorative: the row already states the best e1RM and the change, and the
// drilldown carries the full series — so the chart is never the only evidence.
// =============================================================================
import { band, stateBlock } from './band-kit.js';
import { progressDetailFor } from '../progress-sections.js';
import { esc } from './screen-kit.js';
import { formatDayMonthShort } from '../../dates.js';
import { setAllLiftsModel } from '../all-lifts-sheet.js';
import { fromCanonicalWeight } from '../../metrics/weight-unit.js';

const COLORS = Object.freeze({
  up: 'var(--color-green, #10b981)',
  down: 'var(--color-amber, #f59e0b)',
  flat: 'var(--text-secondary)',
});

/**
 * Session count, best mark and last date — with no invented weight. A
 * bodyweight lift has no e1RM, and "0 kg best" is worse than saying nothing.
 * @param {any} row @param {string} unit
 */
function metaFor(row, unit) {
  const parts = [`${row.sessions} session${row.sessions === 1 ? '' : 's'}`];
  if (row.bestE1rm > 0) parts.push(`${Math.round(fromCanonicalWeight(row.bestE1rm, unit) ?? 0)} ${unit} best`);
  if (row.lastPerformedISO) parts.push(`last ${formatDayMonthShort(row.lastPerformedISO)}`);
  return parts.join(' · ');
}

/** @param {number|null} deltaPct */
function deltaText(deltaPct) {
  if (deltaPct == null) return { text: 'No earlier comparison', tone: 'flat' };
  if (deltaPct === 0) return { text: 'Matched earlier sessions', tone: 'flat' };
  return {
    text: `${deltaPct > 0 ? '+' : ''}${deltaPct}% e1RM`,
    tone: deltaPct > 0 ? 'up' : 'down',
  };
}

/**
 * @param {ReturnType<import('../exercises-summary.js').buildExerciseSummaryModel>|null} model
 * @param {{ error?: string|null, limit?: number, hidden?: string[] }} [options]
 */
export function renderExercises(model, options = {}) {
  if (options.error) {
    return band({
      id: 'exercises',
      detail: progressDetailFor('exercises'),
      eyebrow: 'Main exercises',
      title: 'Main exercises',
      body: stateBlock('error', {
        message: 'We could not calculate your main exercises.',
        detail: options.error,
        retry: { label: 'Try again' },
      }),
    });
  }

  if (!model) {
    return band({
      id: 'exercises',
      detail: progressDetailFor('exercises'),
      eyebrow: 'Main exercises',
      title: 'Main exercises',
      body: stateBlock('loading', { height: 200 }),
    });
  }

  if (!model.hasData) {
    return band({
      id: 'exercises',
      detail: progressDetailFor('exercises'),
      eyebrow: 'Main exercises',
      title: 'Main exercises',
      value: 'No lifts',
      sub: model.range?.spanLabel,
      body: stateBlock('empty', {
        message: 'Log the same lift a few times and its progress appears here.',
        action: { label: 'Start a workout', action: 'switch-tab', target: 'workout' },
      }),
    });
  }

  // The sheet renders the SAME rows the band already built (PG5).
  setAllLiftsModel(model);
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 5;
  const shown = model.rows.slice(0, limit);
  const extra = model.rows.length - shown.length;

  const rows = shown.map((row) => {
    const delta = deltaText(row.deltaPct);
    return `<li class="pg-ex">
      <button type="button" class="pg-ex__hit"
        data-action="open-analytics" data-context="exercise"
        data-entity="${esc(row.liftId)}" data-entity-name="${esc(row.lift)}"
        aria-label="${esc(`${row.lift}: ${row.bestE1rm > 0 ? `best ${row.bestE1rm} ${model.unit} estimated 1RM, ` : ''}${delta.text}, ${row.sessions} sessions. Open exercise detail.`)}">
        <span class="pg-ex__head">
          <span class="pg-ex__name">${esc(row.lift)}${row.prFlag ? ' <span class="pg-ex__pr">PR</span>' : ''}</span>
          <span class="pg-ex__delta" style="color:${COLORS[/** @type {'up'|'down'|'flat'} */ (delta.tone)]}">${esc(delta.text)}</span>
        </span>
        <span class="pg-ex__meta">${esc(metaFor(row, model.unit))}</span>
      </button>
    </li>`;
  }).join('');

  const hidden = Array.isArray(options.hidden) ? options.hidden : [];
  const actions = `
    <div class="pg-band__actions">
      ${hidden.includes('allLifts') ? '' : `<button type="button" class="pg-band__action" data-action="open-all-lifts">${extra > 0 ? `All ${model.rows.length} lifts` : 'All lifts'} →</button>`}
      ${hidden.includes('liftRecords') ? '' : '<button type="button" class="pg-band__action" data-action="open-records">Records →</button>'}
    </div>`;

  const stalls = Array.isArray(model.stalls) ? model.stalls : [];
  const stallsHTML = stalls.length ? `<div class="pg-stalls" role="group" aria-label="Progress checks">
    <p class="pg-stalls__title">Progress checks</p>
    ${stalls.slice(0, 4).map((stall) => `
      <button type="button" class="pg-stall" data-action="open-analytics" data-context="exercise"
        data-entity="${esc(stall.liftId)}" data-entity-name="${esc(stall.lift)}"
        aria-label="${esc(`${stall.lift}: ${stall.message} Open exercise detail.`)}">
        <span class="pg-stall__head"><b>${esc(stall.lift)}</b><span>${esc(stall.target)}</span></span>
        <span class="pg-stall__msg">${esc(stall.message)}</span>
      </button>`).join('')}
    ${stalls.length > 4 ? `<p class="pg-stalls__more">+${stalls.length - 4} more lift${stalls.length - 4 === 1 ? '' : 's'} on a progress check</p>` : ''}
  </div>` : '';

  const body = `
    ${stallsHTML}
    <ul class="pg-ex-list">${rows}</ul>
    ${actions}`;

  return band({
    id: 'exercises',
    detail: progressDetailFor('exercises'),
    eyebrow: 'Main exercises',
    title: 'Main exercises',
    value: String(model.rows.length),
    valueUnit: 'exercises',
    sub: model.range?.spanLabel,
    ariaLabel: `${model.range?.spanLabel || 'Selected period'} main exercises: ${model.rows.length} trained, led by ${model.rows[0]?.lift || 'none'}`,
    body,
  });
}
