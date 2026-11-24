// @ts-check
// =============================================================================
// MONTHLY REPORT — analytics leaf (js/analytics/views/view-monthly-report.js)
// Renders the current calendar month, with a trailing 12-month alternative. — R13
// =============================================================================
import { showToast } from '../../state.js';
import { buildCalendarMonthReport, buildYearReport, reportToText } from '../../brain/monthly-report.js';
import { monthlyReportShareRows, shareSummaryCard } from '../share-card.js';
import { addDaysISO, formatDayMonthShort } from '../../dates.js';
import { formatVolume, weightUnitOf } from '../utils.js';

const KM_TO_MI = 0.621371;
let _reportPeriod = 'month';
export function setReportPeriod(period) { _reportPeriod = period === 'year' ? 'year' : 'month'; }
/** "22 Nov" from the shared date owner; a bad window key says so, never "Invalid Date". */
const fmtDay = (iso) => formatDayMonthShort(iso) || 'Date unavailable';
function deltaChip(pct, suffix = 'vs prior 4 weeks') {
  if (pct === null || pct === undefined) return '';
  const up = pct > 0;
  const color = up ? 'var(--color-green)' : pct < 0 ? 'var(--color-red)' : 'var(--text-muted)';
  return `<span class="wrev-delta" style="color:${color}">${up ? '▲' : pct < 0 ? '▼' : '→'} ${Math.abs(pct)}% ${suffix}</span>`;
}

export function renderMonthlyReport(getState, getDays, getProgram) {
  const el = document.getElementById('monthlyReportContainer');
  if (!el) return;
  const state = getState();
  const r = _reportPeriod === 'year'
    ? buildYearReport(state, getDays(), getProgram())
    : buildCalendarMonthReport(state, getDays(), getProgram());
  // The calendar month is the headline. The 12-month control remains a trailing
  // rollup; its label says "12 months", never "this year".
  const periodToggle = `<div class="an-segment an-segment--two" role="group" aria-label="Report period">
    <button type="button" class="an-segment__button ${_reportPeriod === 'month' ? 'is-active' : ''}" data-report-period="month" aria-pressed="${_reportPeriod === 'month'}">This month</button>
    <button type="button" class="an-segment__button ${_reportPeriod === 'year' ? 'is-active' : ''}" data-report-period="year" aria-pressed="${_reportPeriod === 'year'}">12 months</button>
  </div>`;

  if (!r.hasData) {
    el.innerHTML = `${periodToggle}<article class="card-dark p-4 text-center">
      <div style="font-size:2rem;margin-bottom:8px;">🗓️</div>
      <p style="color:var(--text-muted);font-size:0.85rem;line-height:1.5;">Your ${_reportPeriod === 'year' ? '12-month' : r.window.label} report builds itself as you train. Check back after a few sessions.</p>
    </article>`;
    el.querySelectorAll('[data-report-period]').forEach((button) => button.addEventListener('click', () => {
      setReportPeriod(button.getAttribute('data-report-period'));
      renderMonthlyReport(getState, getDays, getProgram);
    }));
    return;
  }

  const distUnit = state?.settings?.distanceUnit || 'km';
  const dist = distUnit === 'mi' ? `${Math.round(r.totals.distanceKm * KM_TO_MI * 10) / 10} mi` : `${r.totals.distanceKm} km`;
  // The comparison window follows the report mode. A calendar month compares
  // against the same elapsed part of the prior month; the trailing report names
  // its own span.
  const priorSuffix = r.window.comparisonLabel
    ? `vs ${r.window.comparisonLabel}`
    : `vs prior ${r.window.days >= 365 ? '12 months' : `${r.window.days} days`}`;

  const stats = [
    { v: String(r.totals.sessions), k: 'Sessions', d: r.deltas.sessions ? `<span class="wrev-delta" style="color:${r.deltas.sessions > 0 ? 'var(--color-green)' : 'var(--color-red)'}">${r.deltas.sessions > 0 ? '+' : ''}${r.deltas.sessions}</span>` : '' },
    { v: formatVolume(r.totals.volume, weightUnitOf(state)), k: 'Lifted', d: deltaChip(r.deltas.volumePct, priorSuffix) },
    { v: dist, k: 'Run', d: deltaChip(r.deltas.distancePct, priorSuffix) },
    { v: r.hybridScore.avg !== null ? String(r.hybridScore.avg) : '—', k: 'Avg Score', d: r.hybridScore.delta ? `<span class="wrev-delta" style="color:${r.hybridScore.delta > 0 ? 'var(--color-green)' : 'var(--color-red)'}">${r.hybridScore.delta > 0 ? '+' : ''}${r.hybridScore.delta}</span>` : '' },
  ].map(s => `<div class="wrev-stat"><div class="wrev-stat__v">${s.v}</div><div class="wrev-stat__k">${s.k}</div>${s.d}</div>`).join('');

  const trendWord = { rising: 'rising 📈', easing: 'easing 📉', steady: 'holding steady', building: 'building' }[r.fitness.trend] || r.fitness.trend;

  const rangeEnd = addDaysISO(r.window.endISO, -1);
  el.innerHTML = `
    ${periodToggle}
    <p class="an-detail-period">${fmtDay(r.window.startISO)} – ${fmtDay(rangeEnd)} · ${r.totals.activeDays} active day${r.totals.activeDays === 1 ? '' : 's'}</p>
    <div class="wrev-stats mb-3">${stats}</div>
    <article class="card-dark p-3 mb-3 flex-between">
      <span class="wrev-label">Fitness (CTL ${r.fitness.ctl})</span>
      <span class="wrev-arc"><b>${trendWord}</b></span>
    </article>
    <article class="card-dark p-3 mb-3 flex-between">
      <span class="wrev-label">Avg plan adherence</span>
      <span class="wrev-arc"><b>${r.consistency}%</b></span>
    </article>
    ${r.projection ? `<article class="card-dark p-3 mb-3" style="border-left:3px solid var(--color-green);">
      <div style="font-weight:800;color:var(--color-green);font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Looking ahead</div>
      <p style="color:var(--text-secondary);font-size:0.84rem;line-height:1.5;margin:0;">${r.projection}</p>
    </article>` : ''}
    <button id="mrepShareBtn" class="btn-action-block btn-ghost" aria-label="Share this training report">📤 Share this report</button>
  `;

  el.querySelectorAll('[data-report-period]').forEach((button) => button.addEventListener('click', () => {
    setReportPeriod(button.getAttribute('data-report-period'));
    renderMonthlyReport(getState, getDays, getProgram);
  }));
  const btn = el.querySelector('#mrepShareBtn');
  if (btn) btn.addEventListener('click', async () => {
    try {
      await shareSummaryCard(monthlyReportShareRows(r, state), {
        title: 'Training Report',
        subtitle: r.window.label,
        filename: 'openhybrid-training-report.png',
        caption: reportToText(r, distUnit, weightUnitOf(state)),
        toast: showToast,
        savedMessage: 'Report card saved',
      });
    } catch {
      showToast('Sharing unavailable on this device', true);
    }
  });
}
