// ==========================================
// PROGRESS VIEW (analytics/views/view-progress.js)
// ==========================================
import { formatDist, formatWeight, weightUnitOf } from '../utils.js';
import { renderConsistencyHeatmap } from '../charts.js';
import { getProgramById } from '../../state.js';
import { streakFreezeInfo } from '../../brain/streak.js';
import { activeTrainingDates, computeStreak } from '../../home/dashboard-model.js';

function weekLabel(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '--';
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short',
  });
}

export function renderProgressAnalytics(data, getState) {
  const tbody = document.getElementById('analyticsTimelineTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const state = getState();
  const unit = weightUnitOf(state);
  const distUnit = state?.settings?.distanceUnit === 'mi' ? 'mi' : 'km';
  const weeks = Array.isArray(data.calendarWeeks) ? data.calendarWeeks : [];
  const currentWeekStart = weeks.length ? weeks[weeks.length - 1].weekStart : null;
  weeks.forEach((week) => {
    const isActive = week.weekStart === currentWeekStart;
    const tr = document.createElement('tr');
    if (isActive) tr.style.background = 'rgba(59,130,246,0.1)';
    tr.innerHTML =
      `<td class="py-2"><strong style="${isActive ? 'color:#3b82f6;' : 'color:#fff;'}">${weekLabel(week.weekStart)}</strong></td>` +
      `<td class="py-2" style="color:#fff;">${week.sessions}</td>` +
      `<td class="py-2" style="color:#fff;">${formatWeight(week.volumeKg, unit)}</td>` +
      `<td class="py-2" style="color:#fff;">${week.distanceKm > 0 ? formatDist(week.distanceKm, distUnit, 1) : '--'}</td>`;
    tbody.appendChild(tr);
  });
}

export function renderStreakDetail(data, getState, getDays) {
  const appState    = getState();
  const defaultDays = getDays();

  // ONE streak definition, shared with Home. This screen used to rebuild the
  // set of trained dates by approximating each slot's date from
  // `weekStartedAt ± currentWeek` arithmetic, which produced a DIFFERENT streak
  // from the one Home shows: it guessed dates instead of reading the stamped
  // `.dates[day]`, so moved sessions, gaps in logging and archived activations
  // all landed on invented days. computeStreak/activeTrainingDates are the
  // canonical, date-strict owners (they also honour streak freezes).
  const { current: streak, longest } = computeStreak(appState.weeks || {}, defaultDays, appState);
  const activeDates = activeTrainingDates(appState.weeks || {}, defaultDays, appState);

  const currentEl = document.getElementById('streakCurrent');
  const longestEl = document.getElementById('streakLongest');
  const detailEl  = document.getElementById('streakDetailContainer');

  if (currentEl) currentEl.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
  if (longestEl) longestEl.textContent = `${longest} day${longest !== 1 ? 's' : ''}`;

  if (detailEl) {
    if (activeDates.size === 0) {
      detailEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.75rem;">Complete workouts to build your streak.</p>';
    } else {
      const streakMsg = streak >= 7
        ? `🔥 ${streak}-day streak! Momentum is everything.`
        : streak >= 3
        ? `💪 ${streak} days in a row. Keep it going!`
        : streak === 0
        ? `Start today to begin a new streak.`
        : `${streak} day streak. Every day counts.`;

      const fz = streakFreezeInfo(appState);
      const freezeIcons = Array.from({ length: fz.max }, (_, i) =>
        `<span style="opacity:${i < fz.available ? 1 : 0.25};font-size:1.1rem;">🧊</span>`).join(' ');
      const freezeCard = `
        <div class="card-dark p-3 mb-3" style="border:1px solid rgba(59,130,246,0.28);background:rgba(59,130,246,0.06);">
          <div class="flex-between" style="align-items:center;">
            <div>
              <div class="font-heavy text-inverse" style="font-size:0.9rem;">Streak freezes ${freezeIcons}</div>
              <div class="text-muted" style="font-size:0.72rem;margin-top:3px;line-height:1.4;">
                ${fz.available > 0
                  ? `${fz.available} of ${fz.max} banked — one automatically covers a missed day so your streak survives.`
                  : `None left — earn one by reaching your next 7-day milestone.`}
              </div>
            </div>
          </div>
        </div>`;

      detailEl.innerHTML = `
        <div class="card-dark p-3 mb-3" style="border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.06);">
          <div class="font-heavy text-inverse" style="font-size:1rem;">${streakMsg}</div>
        </div>
        ${freezeCard}
        <div class="flex-between mb-2" style="font-size:0.8rem;">
          <span class="text-muted">Total active days logged</span>
          <span class="font-heavy text-inverse">${activeDates.size}</span>
        </div>
        <div class="flex-between" style="font-size:0.8rem;">
          <span class="text-muted">Personal best streak</span>
          <span class="font-heavy text-inverse">${longest} days</span>
        </div>
      `;
    }
  }

  // Consistency heatmap. Calendar-week columns from the canonical date index, so
  // imported and archived sessions occupy the week they actually happened in.
  const trainingDays = data.calendarTrainingDays || [];

  // Find or create heatmap header + container after detailEl
  let heatmapHeader = document.querySelector('.streak-heatmap-header');
  let heatmapContainer = document.getElementById('streakHeatmapContainer');
  if (!heatmapContainer && detailEl) {
    heatmapHeader = document.createElement('h2');
    heatmapHeader.className = 'section-header mt-3 streak-heatmap-header';
    heatmapHeader.textContent = 'Training Calendar';
    heatmapContainer = document.createElement('div');
    heatmapContainer.id = 'streakHeatmapContainer';
    detailEl.after(heatmapHeader);
    heatmapHeader.after(heatmapContainer);
  }

  renderConsistencyHeatmap(heatmapContainer, trainingDays, data.calendarWeekLabels || data.weekLabels);
}

export function renderGoalProgressDetail(data, getState) {
  const appState      = getState();
  const activeProgram = getProgramById(appState.activeProgramId);

  const wk    = parseInt(appState.currentWeek, 10) || 1;
  const total = activeProgram.totalWeeks || 12;
  const pct   = Math.round((wk / total) * 100);

  const goalEl = document.getElementById('analytics-goal-detail');
  if (!goalEl) return;

  const remaining = total - wk;
  const milestones = [
    { week: 4,  label: '1-month check-in' },
    { week: 8,  label: 'Mid-program peak' },
    { week: 12, label: 'Program completion' },
  ];
  const nextMilestone = milestones.find(m => m.week >= wk) || milestones[milestones.length - 1];

  goalEl.innerHTML = `
    <h2 class="section-header mt-4">Program Goal Progress</h2>
    <article class="card-dark p-4 mb-4">
      <div class="flex-between mb-3">
        <span class="text-sm text-muted">Mesocycle progress</span>
        <span class="font-heavy text-inverse">Wk ${wk} / ${total}</span>
      </div>
      <div style="height:8px;border-radius:4px;background:var(--overlay-md);overflow:hidden;margin-bottom:12px;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--color-blue),var(--color-indigo,#6366f1));border-radius:4px;transition:width 0.5s var(--ease-out);"></div>
      </div>
      <div class="flex-between mb-2" style="font-size:0.8rem;">
        <span class="text-muted">Completion</span>
        <span class="font-heavy text-inverse">${pct}%</span>
      </div>
      <div class="flex-between mb-2" style="font-size:0.8rem;">
        <span class="text-muted">Weeks remaining</span>
        <span class="font-heavy text-inverse">${remaining}</span>
      </div>
      <div class="flex-between" style="font-size:0.8rem;">
        <span class="text-muted">Next milestone</span>
        <span class="font-heavy text-accent-blue">Wk ${nextMilestone.week} — ${nextMilestone.label}</span>
      </div>
    </article>
  `;
}
