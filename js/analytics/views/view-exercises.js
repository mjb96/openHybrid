// @ts-check
// =============================================================================
// MAIN EXERCISES BAND (js/analytics/views/view-exercises.js)
//
// Five rows, each a link into the existing exercise drilldown. The sparkline is
// decorative: the row already states the best e1RM and the change, and the
// drilldown carries the full series — so the chart is never the only evidence.
// =============================================================================
import { band, dataTableDisclosure, stateBlock } from './band-kit.js';
import { esc, spark } from './screen-kit.js';
import { formatDayMonthShort } from '../../dates.js';

const COLORS = Object.freeze({
  up: 'var(--color-green, #10b981)',
  down: 'var(--color-amber, #f59e0b)',
  flat: 'var(--text-secondary)',
});

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
 * @param {{ error?: string|null, limit?: number }} [options]
 */
export function renderExercises(model, options = {}) {
  if (options.error) {
    return band({
      id: 'exercises',
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
      eyebrow: 'Main exercises',
      title: 'Main exercises',
      body: stateBlock('loading', { height: 200 }),
    });
  }

  if (!model.hasData) {
    return band({
      id: 'exercises',
      eyebrow: 'Main exercises',
      title: 'Main exercises',
      sub: model.range?.spanLabel,
      body: stateBlock('empty', {
        message: 'Log the same lift a few times and its progress appears here.',
        action: { label: 'Start a workout', action: 'switch-tab', target: 'workout' },
      }),
    });
  }

  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 5;
  const shown = model.rows.slice(0, limit);
  const extra = model.rows.length - shown.length;

  const rows = shown.map((row) => {
    const delta = deltaText(row.deltaPct);
    const sparkSVG = row.series.length >= 2
      ? spark(row.series.map((point) => point.e1rm), COLORS[/** @type {'up'|'down'|'flat'} */ (delta.tone)])
      : '';
    return `<li class="pg-ex">
      <button type="button" class="pg-ex__hit"
        data-action="open-analytics" data-context="exercise"
        data-entity="${esc(row.liftId)}" data-entity-name="${esc(row.lift)}"
        aria-label="${esc(`${row.lift}: best ${row.bestE1rm} ${model.unit} estimated 1RM, ${delta.text}, ${row.sessions} sessions. Open exercise detail.`)}">
        <span class="pg-ex__head">
          <span class="pg-ex__name">${esc(row.lift)}${row.prFlag ? ' <span class="pg-ex__pr">PR</span>' : ''}</span>
          <span class="pg-ex__delta" style="color:${COLORS[/** @type {'up'|'down'|'flat'} */ (delta.tone)]}">${esc(delta.text)}</span>
        </span>
        <span class="pg-ex__meta">
          ${esc(`${row.sessions} session${row.sessions === 1 ? '' : 's'} · ${row.bestE1rm} ${model.unit} best`)}
          ${row.lastPerformedISO ? esc(` · last ${formatDayMonthShort(row.lastPerformedISO)}`) : ''}
        </span>
        ${sparkSVG ? `<span class="pg-ex__spark" aria-hidden="true">${sparkSVG}</span>` : ''}
      </button>
    </li>`;
  }).join('');

  const body = `
    <ul class="pg-ex-list">${rows}</ul>
    ${extra > 0
      ? `<button type="button" class="pg-band__action" data-action="open-analytics" data-context="strength">Show all ${model.rows.length} exercises →</button>`
      : ''}
    ${dataTableDisclosure(
      ['Exercise', 'Sessions', `Best e1RM (${model.unit})`, 'Change'],
      shown.map((row) => [
        row.lift,
        String(row.sessions),
        String(row.bestE1rm),
        deltaText(row.deltaPct).text,
      ]),
      `Main exercises for ${model.range?.spanLabel || 'the selected period'}`,
    )}`;

  return band({
    id: 'exercises',
    eyebrow: 'Main exercises',
    title: 'Main exercises',
    value: String(model.rows.length),
    valueUnit: 'exercises',
    sub: model.range?.spanLabel,
    ariaLabel: `${model.range?.spanLabel || 'Selected period'} main exercises: ${model.rows.length} trained, led by ${model.rows[0]?.lift || 'none'}`,
    body,
  });
}
