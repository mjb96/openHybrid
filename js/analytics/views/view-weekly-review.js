// @ts-check
// =============================================================================
// WEEK IN REVIEW — analytics leaf (js/analytics/views/view-weekly-review.js)
//
// Presenter for the R6 weekly review: the week's story (totals · deltas · PRs
// · plan adherence · one focus) with a text-share action. The data comes from the
// pure builder (js/brain/weekly-review.js); this file only renders and wires
// the Share button.
// =============================================================================
import { showToast, getProgramById } from '../../state.js';
import { weightUnitOf } from '../utils.js';
import { reviewToText, buildWeeklyReview } from '../../brain/weekly-review.js';
import { statCard } from '../charts/chart-primitives.js';
import { renderMonthlyReport } from './view-monthly-report.js';
import { renderProgressAnalytics, renderStreakDetail, renderGoalProgressDetail } from './view-progress.js';
import { screenTabBar, mountScreenTabs } from './screen-kit.js';
import { getSelectedWeekStart } from '../week-nav.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KM_TO_MI = 0.621371;

// ---- V2: unified Review screen (Overview | Stats) -----------------------
// The weekly/monthly story in one place — Overview reports the selected
// calendar week (totals · adherence · one focus); Stats holds the full Week in
// Review + the Monthly Report (absorbing the weekly-summary and monthly-report
// leaves) plus streak, goal progress and the consistency log.
//
// Adherence is a claim about the ACTIVE plan and the focus is advice for the
// week ahead, so both are absent for a historical selection (see the builder).
let _reviewTab = 'overview';
export function setReviewTab(tab) { _reviewTab = tab === 'stats' ? 'stats' : 'overview'; }
/** The active Review tab. Read by the router's week-nav gate (never a second copy). */
export function getReviewTab() { return _reviewTab; }

export function renderReview(data, getState, getDays, onTabChange) {
  const section = document.getElementById('analytics-weekly-review');
  if (!section) return;
  const state   = getState();
  const program = getProgramById(state.activeProgramId);
  // Follow the shared calendar-week navigator so the Consistency card opens the
  // week it was showing. The monthly report / streak / goal sections below are
  // deliberately NOT week-scoped and stay on their own windows.
  const review  = buildWeeklyReview(state, getDays(), program, { weekStart: getSelectedWeekStart() });

  section.innerHTML = screenTabBar(_reviewTab) + `<div id="review-tab-body"></div>`;
  const body = document.getElementById('review-tab-body');

  if (_reviewTab === 'stats') {
    body.innerHTML = `
      <h2 class="section-header mt-2">Week in Review</h2>
      <div id="weeklyReviewContainer"></div>
      <h2 class="section-header mt-4">Training Report</h2>
      <div id="monthlyReportContainer"></div>

      <h2 class="section-header mt-4">Streak</h2>
      <div class="grid-2-col gap-2 mb-4">
        <article class="card-dark flex-col flex-center p-3" style="border:1px solid rgba(245,158,11,0.35);">
          <div class="text-xs text-muted mb-1">Current Streak</div>
          <div id="streakCurrent" class="text-lg font-heavy text-inverse">0 days</div>
        </article>
        <article class="card-dark flex-col flex-center p-3" style="border:1px solid rgba(59,130,246,0.35);">
          <div class="text-xs text-muted mb-1">Longest Streak</div>
          <div id="streakLongest" class="text-lg font-heavy text-inverse">0 days</div>
        </article>
      </div>
      <article class="card-dark p-4 mb-4">
        <div id="streakDetailContainer"><p style="color:var(--text-muted);font-size:0.75rem;">Complete workouts to build your streak.</p></div>
      </article>

      <h2 class="section-header mt-4">Goal Progress</h2>
      <div id="analytics-goal-detail"></div>

      <h2 class="section-header mt-4">Consistency Log</h2>
      <article class="card-dark p-3 mb-4">
        <div class="table-wrapper">
          <table aria-label="Training History">
            <thead><tr><th scope="col">Week</th><th scope="col">Sessions</th><th scope="col">Volume</th><th scope="col">Distance</th></tr></thead>
            <tbody id="analyticsTimelineTableBody"></tbody>
          </table>
        </div>
      </article>
    `;
    renderWeeklyReview(review, state);
    renderMonthlyReport(getState, getDays, () => program);
    // Folded in from the retired progress / streak / goal-progress leaves.
    renderStreakDetail(data, getState, getDays);
    renderGoalProgressDetail(data, getState);
    renderProgressAnalytics(data, getState);
  } else {
    renderReviewOverview(body, review);
  }

  mountScreenTabs('analytics-weekly-review', (tab) => {
    _reviewTab = tab;
    renderReview(data, getState, getDays, onTabChange);
    // Review's Overview is week-scoped and Stats is not, so the shared week
    // navigator has to be re-resolved on every in-screen switch.
    if (onTabChange) onTabChange();
  });
}

/**
 * Review → Overview. Exported so the render guard can drive both the live and
 * the historical copy without depending on the system clock.
 * @param {HTMLElement} body
 * @param {ReturnType<typeof buildWeeklyReview>} review
 */
export function renderReviewOverview(body, review) {
  const period = review.isCurrentWeek ? 'this week' : 'that week';
  if (!review.hasData) {
    body.innerHTML = `<article class="card-dark an-hero">
      <div class="an-hero__k">${esc(review.label)}</div>
      <div class="an-hero__val">No sessions</div>
      <div class="an-hero__empty">${review.isCurrentWeek
        ? 'Nothing logged yet — your review builds itself as you train.'
        : 'No training was recorded that week.'}</div>
    </article>`;
    return;
  }
  const hero = `<article class="card-dark an-hero">
      <div class="an-hero__k">${esc(review.label)}</div>
      <div class="an-hero__val">${review.totals.sessions}</div>
      <div class="an-hero__empty">${review.totals.sessions === 1 ? 'session' : 'sessions'} logged · ${review.totals.prCount} e1RM PR lift${review.totals.prCount === 1 ? '' : 's'}</div>
    </article>`;

  const cards = [statCard({ label: 'Sessions', value: String(review.totals.sessions), sub: `logged ${period}`, color: '#3b82f6' })];
  // Adherence scores work against the ACTIVE plan, so it is only a real claim on
  // the live week — a completed week has no plan to be measured against.
  if (review.consistency.total != null) {
    cards.push(statCard({ label: 'Adherence', value: review.consistency.pct + '%', sub: `${review.consistency.done}/${review.consistency.total} planned`, color: '#10b981' }));
  }
  // "Next week" advice only ever describes the coming week.
  const focusHTML = review.focus ? `
    <article class="card-dark p-3 mb-3" style="border-left:3px solid var(--color-blue);">
      <div style="font-weight:800;color:var(--color-blue);font-size:0.66rem;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">${esc(review.focus.area)}</div>
      <p style="color:var(--text-secondary);font-size:0.84rem;line-height:1.5;margin:0;">${esc(review.focus.text)}</p>
    </article>` : '';

  body.innerHTML = `
    ${hero}
    <div class="grid-2-col gap-2 mb-2">
      ${cards.join('')}
    </div>
    ${focusHTML}
  `;
}

function deltaChip(pct) {
  if (pct === null || pct === undefined) return '';
  const up = pct > 0;
  const color = up ? 'var(--color-green)' : pct < 0 ? 'var(--color-red)' : 'var(--text-muted)';
  return `<span class="wrev-delta" style="color:${color}">${up ? '▲' : pct < 0 ? '▼' : '→'} ${Math.abs(pct)}% vs last wk</span>`;
}

export function renderWeeklyReview(review, state) {
  const el = document.getElementById('weeklyReviewContainer');
  if (!el) return;

  if (!review.hasData) {
    el.innerHTML = `<article class="card-dark p-4 text-center">
      <div style="font-size:2rem;margin-bottom:8px;">📭</div>
      <p style="color:var(--text-muted);font-size:0.85rem;line-height:1.5;">${review.isCurrentWeek
        ? 'Nothing logged this week yet.<br>Your review builds itself as you train.'
        : 'Nothing logged that week.<br>No sessions, sets or runs were recorded.'}</p>
    </article>`;
    return;
  }

  const distUnit = state?.settings?.distanceUnit || 'km';
  const dist = distUnit === 'mi'
    ? `${Math.round(review.totals.distanceKm * KM_TO_MI * 10) / 10} mi`
    : `${review.totals.distanceKm} km`;

  const stats = [
    { v: review.totals.volume >= 1000 ? `${(review.totals.volume / 1000).toFixed(1)}t` : `${review.totals.volume} ${weightUnitOf(state)}`, k: 'Lifted', d: deltaChip(review.deltas.volumePct) },
    { v: dist, k: 'Run', d: deltaChip(review.deltas.distancePct) },
    { v: String(review.totals.sessions), k: 'Sessions', d: '' },
    { v: String(review.totals.prCount), k: 'e1RM PR lifts', d: review.totals.prCount > 0 ? '<span class="wrev-delta" style="color:var(--color-amber)">🏆</span>' : '' },
  ].map(s => `<div class="wrev-stat"><div class="wrev-stat__v">${s.v}</div><div class="wrev-stat__k">${s.k}</div>${s.d}</div>`).join('');

  const consHTML = review.consistency.total != null ? `
    <article class="card-dark p-3 mb-3">
      <div class="flex-between mb-1">
        <span class="wrev-label">Plan adherence</span>
        <span class="wrev-arc"><b>${review.consistency.pct}%</b> · ${review.consistency.done}/${review.consistency.total}</span>
      </div>
      <div class="wrev-bar"><div class="wrev-bar__fill" style="width:${review.consistency.pct}%"></div></div>
    </article>` : '';

  const prsHTML = review.prs.length ? `
    <h3 class="section-header mt-4">New records</h3>
    ${review.prs.map(p => `<article class="card-dark p-3 mb-2 flex-between">
      <span style="font-weight:700;color:var(--text-inverse);">🏆 ${esc(p.lift)}</span>
      <span style="color:var(--text-muted);font-size:0.8rem;">e1RM <b style="color:var(--color-amber);">${p.e1rm} ${weightUnitOf(state)}</b> (was ${p.prevBest})</span>
    </article>`).join('')}` : '';

  // A completed week has no "next week" — the focus card is advice for the week
  // that has not happened yet.
  const focusHTML = review.focus ? `
    <h3 class="section-header mt-4">Next week's focus</h3>
    <article class="card-dark p-3 mb-3" style="border-left:3px solid var(--color-blue);">
      <div style="font-weight:800;color:var(--color-blue);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${esc(review.focus.area)}</div>
      <p style="color:var(--text-secondary);font-size:0.84rem;line-height:1.5;margin:0;">${esc(review.focus.text)}</p>
    </article>` : '';

  el.innerHTML = `
    ${review.isCurrentWeek ? '' : `<p style="color:var(--text-muted);font-size:0.75rem;margin:0 0 8px;">Week of ${esc(review.label)}</p>`}
    <div class="wrev-stats mb-3">${stats}</div>
    ${consHTML}
    ${prsHTML}
    ${focusHTML}
    <button id="wrevShareBtn" class="btn-action-block btn-ghost" aria-label="Share week review as text">📤 Share as text</button>
  `;

  const btn = el.querySelector('#wrevShareBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      const text = reviewToText(review, distUnit, weightUnitOf(state));
      try {
        if (navigator.share) { await navigator.share({ text }); return; }
        throw new Error('no-share');
      } catch {
        try {
          await navigator.clipboard.writeText(text);
          showToast('Copied to clipboard ✓');
        } catch { showToast('Sharing unavailable on this device', true); }
      }
    });
  }

}
