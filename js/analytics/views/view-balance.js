// @ts-check
// =============================================================================
// BALANCE BAND (js/analytics/views/view-balance.js)
//
// One idea, ~200px: the strength/endurance mix for the selected window, the
// basis it is measured in, and the walking it deliberately leaves out.
// =============================================================================
import { band, dataTableDisclosure, legend, stateBlock } from './band-kit.js';
import { esc } from './screen-kit.js';

/**
 * @param {ReturnType<import('../balance.js').buildBalanceModel>|null} model
 * @param {{ error?: string|null }} [options]
 */
export function renderBalance(model, options = {}) {
  if (options.error) {
    return band({
      id: 'balance',
      eyebrow: 'Balance',
      title: 'Balance',
      body: stateBlock('error', {
        message: 'We could not calculate your training mix.',
        detail: options.error,
        retry: { label: 'Try again' },
      }),
    });
  }

  if (!model) {
    return band({ id: 'balance', eyebrow: 'Balance', title: 'Balance', body: stateBlock('loading', { height: 170 }) });
  }

  if (!model.hasData) {
    // One-modality windows are not a 100 % bar. Say what would make it appear.
    const message = model.basis === 'none'
      ? 'No measured training in this period yet.'
      : !model.hasStrength
        ? 'No strength work in this period, so there is no mix to split.'
        : 'No runs in this period, so there is no mix to split.';
    return band({
      id: 'balance',
      eyebrow: 'Balance',
      title: 'Balance',
      sub: model.range?.spanLabel,
      body: stateBlock('empty', { message }),
    });
  }

  const strength = model.strengthSharePct ?? 0;
  const endurance = model.enduranceSharePct ?? 0;

  const deltaLine = model.deltaPct == null
    ? 'No comparable previous period.'
    : model.deltaPct === 0
      ? 'The mix is unchanged against the previous period.'
      : `Strength is ${model.deltaPct > 0 ? 'up' : 'down'} ${Math.abs(model.deltaPct)} points against the previous period.`;

  const excludedLine = model.excluded
    ? `<p class="pg-balance__excluded">Not counted: ${model.excluded.walkMinutes} min walking.</p>`
    : '';

  const body = `
    <div class="pg-split" role="img" aria-label="${esc(`Strength ${strength} percent, endurance ${endurance} percent`)}">
      <span class="pg-split__seg pg-split__seg--strength" style="width:${strength}%"></span>
      <span class="pg-split__seg pg-split__seg--endurance" style="width:${endurance}%"></span>
    </div>
    ${legend([
      { label: `Strength ${strength}%`, color: 'var(--color-violet, #8b5cf6)' },
      { label: `Endurance ${endurance}%`, color: 'var(--color-cyan, #22d3ee)' },
    ])}
    <p class="pg-balance__delta">${esc(deltaLine)}</p>
    ${excludedLine}
    ${dataTableDisclosure(
      ['Modality', 'Share'],
      [['Strength', `${strength}%`], ['Endurance', `${endurance}%`]],
      `Training mix for ${model.range?.spanLabel || 'this period'}${model.basisLabel ? `, ${model.basisLabel}` : ''}`,
    )}`;

  return band({
    id: 'balance',
    eyebrow: 'Balance',
    title: 'Balance',
    value: `${strength}`,
    valueUnit: '% strength',
    sub: model.range?.spanLabel,
    chip: model.basisLabel,
    ariaLabel: `${model.range?.spanLabel || 'Selected period'} training mix: ${strength} percent strength, ${endurance} percent endurance`,
    body,
  });
}
