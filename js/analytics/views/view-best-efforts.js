// @ts-check
// =============================================================================
// BEST EFFORTS — presenter for H6a (js/analytics/best-efforts.js)
//
// Measured efforts are stated as measured; race times are always marked as
// estimates and name the effort they came from. No chart: the table is the
// answer and the evidence is the date.
// =============================================================================
import { esc } from './screen-kit.js';
import { formatDayMonthShort } from '../../dates.js';

/**
 * @param {ReturnType<import('../best-efforts.js').buildBestEfforts>} efforts
 * @param {ReturnType<import('../best-efforts.js').buildRaceEstimates>} estimates
 */
export function bestEffortsHTML(efforts, estimates) {
  if (!efforts) return '';
  const measured = (efforts.targets || []).map((target) => `
    <li class="run-best__row">
      <span class="run-best__dist">${esc(target.label)}</span>
      <strong class="run-best__time">${esc(target.timeLabel)}</strong>
      <span class="run-best__meta">${target.best ? `${esc(target.paceLabel)} · ${esc(formatDayMonthShort(target.best.date))}` : 'not recorded'}</span>
    </li>`).join('');

  const raceRows = estimates?.hasData
    ? estimates.rows.map((row) => `
      <li class="run-best__race">
        <span>${esc(row.label)}</span>
        <strong>${esc(row.timeLabel)}</strong>
        <span class="run-best__est">${row.measured ? 'measured' : 'est.'}</span>
      </li>`).join('')
    : '';

  return `<section class="run-best" aria-labelledby="runBestTitle">
    <div class="run-best__head">
      <h2 id="runBestTitle" class="section-header">Best efforts</h2>
      <span class="run-best__source">from recorded splits</span>
    </div>
    <ul class="run-best__list" aria-label="Best efforts">${measured}</ul>
    ${raceRows ? `<div class="run-best__races">
      <p class="run-best__eyebrow">Race estimates <b>(est.)</b></p>
      <ul class="run-best__race-list">${raceRows}</ul>
      <p class="run-best__basis">Riegel estimate from your ${esc(estimates.basis.label)} best on ${esc(formatDayMonthShort(estimates.basis.date))}. A guide, not a prediction.</p>
    </div>` : ''}
    ${efforts.note ? `<p class="run-best__note">${esc(efforts.note)}</p>` : ''}
  </section>`;
}
