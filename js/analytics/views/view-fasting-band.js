// @ts-check
// =============================================================================
// FASTING BAND (js/analytics/views/view-fasting-band.js)
//
// Duration against the athlete's own goal, as rows with a goal line. A smooth
// trend line over fourteen points would imply a precision the data does not
// have, so this is deliberately discrete.
// =============================================================================
import { band, dataTableDisclosure, stateBlock } from './band-kit.js';
import { esc } from './screen-kit.js';
import { formatDayMonthShort } from '../../dates.js';

/**
 * @param {ReturnType<import('../fasting-band.js').buildFastingBandModel>|null} model
 * @param {{ error?: string|null }} [options]
 */
export function renderFastingBand(model, options = {}) {
  if (options.error) {
    return band({
      id: 'fasting',
      eyebrow: 'Fasting',
      title: 'Fasting',
      body: stateBlock('error', {
        message: 'We could not calculate your fasting.',
        detail: options.error,
        retry: { label: 'Try again' },
      }),
    });
  }

  if (!model) {
    return band({ id: 'fasting', eyebrow: 'Fasting', title: 'Fasting', body: stateBlock('loading', { height: 190 }) });
  }

  if (!model.hasData) {
    return band({
      id: 'fasting',
      eyebrow: 'Fasting',
      title: 'Fasting',
      sub: model.range?.spanLabel,
      body: stateBlock('empty', {
        message: 'No completed fasts in this period.',
        action: { label: 'Start a fast', action: 'switch-tab', target: 'workout' },
      }),
    });
  }

  // Scale bars to the longest fast or the goal, whichever is larger, so a goal
  // line always fits on the track.
  const scaleMax = Math.max(model.goalHours, model.longestHours || 0);
  const goalPct = Math.min(100, (model.goalHours / scaleMax) * 100);

  const rows = model.fasts.map((entry) => {
    const pct = Math.min(100, (entry.hours / scaleMax) * 100);
    return `<div class="pg-fast${entry.metGoal ? '' : ' is-short'}">
      <small>${esc(formatDayMonthShort(entry.dateISO))}</small>
      <span class="pg-fast__track"><i style="width:${pct.toFixed(1)}%"></i></span>
      <b>${esc(String(entry.hours))} h</b>
    </div>`;
  }).join('');

  const body = `
    <div class="pg-fast-chart" style="--pg-goal:${goalPct.toFixed(1)}%">
      <span class="pg-fast__goal" aria-hidden="true"></span>
      ${rows}
    </div>
    <p class="pg-band__sub" style="margin-top:6px">Goal ${esc(String(model.goalHours))} h (current) · ${esc(`last ${model.fasts.length} of ${model.windowCount} fasts`)}. Each fast is judged against the goal it was done under.</p>
    <div class="pg-statrow">
      <div><b>${esc(`${model.averageHours} h`)}</b><span>Average</span></div>
      <div><b>${esc(`${model.adherencePct}%`)}</b><span>Met goal</span></div>
      <div><b>${esc(String(model.streak))}</b><span>Day streak</span></div>
      <div><b>${esc(`${model.longestHours} h`)}</b><span>Longest</span></div>
    </div>
    <div class="pg-band__actions">
      <button type="button" class="pg-band__action" data-action="open-analytics" data-context="fasting">Fasting analytics →</button>
    </div>
    <p class="pg-balance__excluded">Elapsed time against your own goal. Not a health measure.</p>
    ${dataTableDisclosure(
      ['Date', 'Hours', 'Met goal'],
      model.fasts.map((entry) => [entry.dateISO, String(entry.hours), entry.metGoal ? 'Yes' : 'No']),
      `Completed fasts in ${model.range?.spanLabel || 'the selected period'}`,
    )}`;

  return band({
    id: 'fasting',
    eyebrow: 'Fasting',
    title: 'Fasting',
    value: `${model.averageHours} h`,
    valueUnit: 'average',
    sub: model.range?.spanLabel,
    ariaLabel: `Fasting for ${model.range?.spanLabel || 'the selected period'}: ${model.averageHours} hour average against a ${model.goalHours} hour goal, ${model.adherencePct} percent met`,
    body,
  });
}
