// @ts-check
// =============================================================================
// BLOCK REVIEW — presenter for H5 slice 1 (js/analytics/block-review.js)
//
// Descriptive only: the numbers come from the model, the progress checks from
// the engine, and the one action opens the plan. No deload order here.
// =============================================================================
import { esc } from './screen-kit.js';
import { buildBlockReview } from '../block-review.js';
import { formatVolume, weightUnitOf } from '../utils.js';
import { getProgramById } from '../../state.js';

const STATUS = Object.freeze({
  insufficient: { label: 'Not enough data', tone: 'muted' },
  on_track: { label: 'On track', tone: 'ok' },
  mixed: { label: 'Mixed', tone: 'note' },
  stalled: { label: 'Needs a look', tone: 'warn' },
});

/** @param {number|null} pct */
function deltaText(pct) {
  if (pct == null) return '';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
}

/** @param {any} model @param {{ unit?: string }} [options] */
export function blockReviewHTML(model, { unit = 'kg' } = {}) {
  if (!model) return '';
  const status = STATUS[model.status] || STATUS.insufficient;
  const volume = formatVolume(model.volumeKg, unit);
  const volumeDelta = deltaText(model.volumeDeltaPct);
  const lifts = (model.lifts || []).slice(0, 5).map((lift) => `
    <li class="pg-block__lift">
      <span class="pg-block__lift-name">${esc(lift.name)}${lift.isPr ? ' <span class="pg-block__pr">PR</span>' : ''}</span>
      <span class="pg-block__lift-value">${lift.bestE1rm > 0 ? `${esc(String(lift.bestE1rm))} ${esc(unit)}` : '—'}</span>
      <span class="pg-block__lift-delta pg-block__lift-delta--${lift.deltaPct > 0 ? 'up' : lift.deltaPct < 0 ? 'down' : 'flat'}">${esc(deltaText(lift.deltaPct) || '—')}</span>
    </li>`).join('');
  const checks = (model.progressChecks || []).slice(0, 3).map((check) => `
    <li class="pg-block__check"><b>${esc(check.lift)}</b> ${esc(check.message)}</li>`).join('');

  return `<section class="pg-block" aria-labelledby="blockReviewTitle">
    <div class="pg-block__head">
      <div>
        <p class="pg-block__eyebrow" id="blockReviewTitle">Block review</p>
        <p class="pg-block__range">${esc(model.label)} · last ${model.weeks} completed weeks</p>
      </div>
      <span class="pg-block__status pg-block__status--${status.tone}">${esc(status.label)}</span>
    </div>
    <p class="pg-block__headline">${esc(model.headline)}</p>
    <div class="pg-block__totals">
      <div><strong>${model.sessions}</strong><span>sessions</span></div>
      <div><strong>${esc(volume)}</strong><span>lifted</span></div>
      <div><strong>${esc(volumeDelta || '—')}</strong><span>vs previous block</span></div>
    </div>
    ${lifts ? `<ul class="pg-block__lifts" aria-label="Top lifts this block">${lifts}</ul>` : ''}
    ${checks ? `<ul class="pg-block__checks" aria-label="Progress checks">${checks}</ul>` : ''}
    <p class="pg-block__rec">${esc(model.recommendation)}</p>
    <button type="button" class="pg-block__action" data-action="switch-tab" data-target="program">Review the plan →</button>
  </section>`;
}

/**
 * Mount on Review → Month. A failure must not blank the report or log below.
 * @param {any} state
 */
export function renderBlockReview(state) {
  const host = document.getElementById('blockReviewContainer');
  if (!host) return false;
  try {
    const program = getProgramById(state?.activeProgramId);
    const model = buildBlockReview(state, { program });
    host.innerHTML = model.hasData
      ? `<h2 class="section-header mt-2">Block Review</h2>${blockReviewHTML(model, { unit: weightUnitOf(state) })}`
      : '<h2 class="section-header mt-2">Block Review</h2><p class="pg-band__sub">Finish a few strength sessions and the last four weeks will be reviewed here.</p>';
    host.hidden = false;
    return true;
  } catch (error) {
    console.error('Block review failed to render', error);
    host.hidden = true;
    host.innerHTML = '';
    return false;
  }
}
