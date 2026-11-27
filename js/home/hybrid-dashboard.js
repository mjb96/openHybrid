// @ts-check
// =============================================================================
// HOME HYBRID SECTION (js/home/hybrid-dashboard.js)
//
// The one place Home answers the hybrid question: is this week's work split
// across both disciplines, and is each side actually progressing?
//
// Three compact cards, each a presenter over an existing owner:
//   • Balance   → hybrid-balance.js  (calendar-week sRPE split)
//   • Strength  → weekly-aggregate.js + strength-calendar.js (tonnage, e1RM)
//   • Endurance → weekly-aggregate.js + run-sessions.js (distance, pace)
//
// Nothing here invents a metric. Every number is calendar-attributed by date,
// and the in-progress week is compared with the SAME weekdays last week.
// =============================================================================
import { buildHybridBalance } from '../analytics/hybrid-balance.js';
import {
  addDaysISO, buildCalendarWeekStrength, collectCalendarWeek, indexSlotsByDate,
} from '../analytics/weekly-aggregate.js';
import { calendarStrengthSummary } from '../analytics/strength-calendar.js';
import { effectiveVdot } from '../analytics/calculations/running-calcs.js';
import { runDaySummary, splitEnduranceSessions } from '../state/run-sessions.js';
import { daysBetween, localDayKey, todayKey } from '../dates.js';
import { formatRunDistance, formatRunPace } from '../workout/run-units.js';
import { formatWeight, parsePaceSeconds, weightUnitOf } from '../analytics/utils.js';
import { escapeHtml } from '../util.js';
import { moduleEnabled } from '../modules.js';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const signedPct = (current, prior) => {
  if (!prior || prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 100);
};

/** "5:12" from seconds per km, ready for formatRunPace. */
function paceString(secPerKm) {
  if (!secPerKm || !Number.isFinite(secPerKm)) return '';
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Sum a week's run sessions through the canonical day summary (duration-weighted
 * pace, merged same-day sessions), limited to the first `throughDay` weekdays.
 */
function runWeekTotals(runSessionsByDay, throughDay) {
  let km = 0;
  let seconds = 0;
  let sessions = 0;
  DAY_KEYS.slice(0, throughDay).forEach((day) => {
    const daySessions = runSessionsByDay?.[day];
    if (!Array.isArray(daySessions) || !daySessions.length) return;
    // Walks are endurance work but they are NOT runs: a walk's pace is not a
    // running pace, and merging them overstated run distance on this card.
    const { runs } = splitEnduranceSessions(daySessions);
    if (!runs.length) return;
    const summary = runDaySummary({ runSessions: { [day]: runs } }, day);
    const dist = Number(summary.dist) || 0;
    km += dist;
    sessions += runs.length;
    const pace = parsePaceSeconds(dist, summary.time);
    if (pace > 0) seconds += pace * dist;
  });
  return { km, seconds, sessions };
}

/**
 * Pure model for the three Home hybrid cards.
 *
 * @param {any} state
 * @param {{ today?: string|Date, tz?: string }} [options]
 */
export function buildHomeHybrid(state, options = {}) {
  const tz = options.tz;
  const today = localDayKey(options.today || todayKey(tz), tz);
  if (!today) return null;

  const index = indexSlotsByDate(state, { tz });
  const balance = buildHybridBalance(state, { today, tz, index });
  if (!balance.weekStart) return null;

  const elapsedDay = clamp((daysBetween(balance.weekStart, today) ?? 0) + 1, 1, 7);
  const priorWeekStart = addDaysISO(balance.weekStart, -7);

  // ---- strength -----------------------------------------------------------
  const strengthWeek = buildCalendarWeekStrength(state, { today, weekStart: balance.weekStart, tz, index });
  const priorStrengthWeek = buildCalendarWeekStrength(state, { today, weekStart: priorWeekStart, tz, index });
  const priorStrengthSamePoint = (priorStrengthWeek.days || [])
    .slice(0, elapsedDay)
    .reduce((total, day) => total + (Number(day.volumeKg) || 0), 0);
  const strengthSummary = calendarStrengthSummary(state, { today, weekStart: balance.weekStart, tz });
  const strength = {
    volumeKg: strengthWeek.elapsedVolumeKg || 0,
    priorSamePointKg: priorStrengthSamePoint,
    deltaPct: signedPct(strengthWeek.elapsedVolumeKg || 0, priorStrengthSamePoint),
    sets: strengthWeek.elapsedWorkingSets || 0,
    sessions: (strengthWeek.days || []).filter((day) => (day.workingSets || 0) > 0).length,
    topChange: strengthSummary?.topChange || null,
    prCount: strengthSummary?.prCount || 0,
    hasWork: (strengthWeek.elapsedWorkingSets || 0) > 0,
  };

  // ---- endurance ----------------------------------------------------------
  const currentRuns = collectCalendarWeek(state, balance.weekStart, { index, tz });
  const priorRuns = collectCalendarWeek(state, priorWeekStart, { index, tz });
  const runTotals = runWeekTotals(currentRuns.runSessions, elapsedDay);
  const priorRunTotals = runWeekTotals(priorRuns.runSessions, elapsedDay);
  // Aerobic fitness is a max-based rolling estimate (best recent effort), not a
  // weekly bucket, so it is naturally partial-week safe. It is NEVER presented
  // as measured VO2 max: the card always labels an estimate as one.
  const weekNums = Object.keys(state?.weeks || {}).map(Number).filter(Number.isFinite);
  const maxWeek = weekNums.length ? Math.max(...weekNums) : 0;
  const aerobic = maxWeek > 0 ? effectiveVdot(state, DAY_KEYS, maxWeek) : null;
  const endurance = {
    km: runTotals.km,
    sessions: runTotals.sessions,
    paceSecPerKm: runTotals.km > 0 && runTotals.seconds > 0 ? runTotals.seconds / runTotals.km : 0,
    priorSamePointKm: priorRunTotals.km,
    deltaPct: signedPct(runTotals.km, priorRunTotals.km),
    hasWork: runTotals.sessions > 0,
    aerobic: aerobic
      ? { vdot: aerobic.vdot, source: aerobic.source }
      : null,
  };

  return {
    today,
    weekStart: balance.weekStart,
    weekEnd: balance.weekEnd,
    elapsedDay,
    isCompleteWeek: elapsedDay >= 7,
    balance,
    strength,
    endurance,
    units: {
      weight: weightUnitOf(state),
      distance: state?.settings?.distanceUnit === 'mi' ? 'mi' : 'km',
    },
    showEndurance: moduleEnabled(state, 'running'),
    // Recovery & Load is the honest destination when that module exists;
    // otherwise the Progress hub is always reachable.
    balanceContext: moduleEnabled(state, 'recovery') ? 'recovery' : 'hub',
  };
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

const BALANCE_COPY = Object.freeze({
  balanced: 'Both disciplines are getting work this week.',
  'strength-heavy': 'Lifting dominates. Add an easy run or a loaded carry.',
  'endurance-heavy': 'Running dominates. Add a full-body strength session.',
  'unmeasured-strength': 'Add a session time to your lifting so the split is real.',
  'no-data': 'No sessions logged this calendar week.',
});

/** @param {number|null} pct */
function deltaChip(pct) {
  if (pct == null) return '';
  const tone = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  const sign = pct > 0 ? '+' : '';
  return `<span class="home-hy__delta home-hy__delta--${tone}">${sign}${pct}%</span>`;
}

/** @param {ReturnType<typeof buildHomeHybrid>} model */
export function balanceCardHTML(model) {
  const b = model.balance;
  const status = b.status;
  const hasSplit = b.hasData && status !== 'unmeasured-strength';
  const strengthWidth = b.strengthPct == null ? 0 : b.strengthPct;
  const enduranceWidth = b.endurancePct == null ? 0 : b.endurancePct;
  const trend = b.trend && b.trend.dir !== 'holding'
    ? `<span class="home-hy__trend">${b.trend.dir === 'building' ? 'Building' : 'Easing'} ${b.trend.pct > 0 ? '+' : ''}${b.trend.pct}% vs the same point in recent weeks</span>`
    : '';
  // sRPE needs an RPE, which is optional when logging. Say when the split is
  // measured in training time instead, so the number is never mistaken for a
  // physiological load ratio. Only when there IS a split to describe.
  const basisNote = b.basis === 'minutes' && b.hasData
    ? '<span class="home-hy__trend">Split by training time — add session RPE for a load-based split.</span>'
    : '';
  const basisTag = b.basis === 'minutes' && b.hasData
    ? '<span class="home-hy__basis">by time</span>'
    : '';
  const aria = hasSplit
    ? `Training balance this week: ${strengthWidth} percent strength, ${enduranceWidth} percent endurance`
    : 'Training balance: no measured split yet';

  return `<article class="card-dark home-hy home-hy--balance">
    <div class="home-hy__head">
      <span class="home-hy__eyebrow">Training balance${basisTag}</span>
      <span class="home-hy__status home-hy__status--${status}">${escapeHtml(b.statusLabel)}</span>
    </div>
    <button type="button" class="home-hy__body" data-action="open-analytics" data-context="${model.balanceContext}">
      <span class="home-hy__split" role="img" aria-label="${aria}">
        <span class="home-hy__seg home-hy__seg--strength" style="width:${strengthWidth}%"></span>
        <span class="home-hy__seg home-hy__seg--endurance" style="width:${enduranceWidth}%"></span>
      </span>
      <span class="home-hy__legend">
        <span><b>${strengthWidth}%</b> Strength</span>
        <span><b>${enduranceWidth}%</b> Endurance</span>
      </span>
    </button>
    <p class="home-hy__note">${escapeHtml(BALANCE_COPY[status] || BALANCE_COPY['no-data'])}</p>
    ${trend}
    ${basisNote}
  </article>`;
}

/** @param {ReturnType<typeof buildHomeHybrid>} model */
export function strengthCardHTML(model) {
  const s = model.strength;
  const unit = model.units.weight;
  const volume = s.hasWork ? formatWeight(s.volumeKg, unit, { decimals: 0 }) : '—';
  const count = s.hasWork
    ? `${s.sessions} session${s.sessions === 1 ? '' : 's'} · ${s.sets} working set${s.sets === 1 ? '' : 's'}`
    : 'No working sets yet this week';
  const detail = s.topChange && s.topChange.deltaKg
    ? `${s.topChange.exerciseName} e1RM ${s.topChange.deltaKg > 0 ? '+' : ''}${s.topChange.deltaKg} ${unit}`
    : '';
  const prLine = s.prCount > 0 ? `${s.prCount} PR${s.prCount === 1 ? '' : 's'} this week` : '';

  return `<article class="card-dark home-hy home-hy__mini">
    <button type="button" class="home-hy__mini-body" data-action="open-analytics" data-context="hub" data-scroll-target="band-exercises">
      <span class="home-hy__eyebrow">Strength</span>
      <span class="home-hy__value">${volume}</span>
      ${deltaChip(s.deltaPct)}
      <span class="home-hy__sub">${escapeHtml(count)}</span>
      ${detail ? `<span class="home-hy__sub">${escapeHtml(detail)}</span>` : ''}
      ${prLine ? `<span class="home-hy__sub">${escapeHtml(prLine)}</span>` : ''}
    </button>
  </article>`;
}

/** @param {ReturnType<typeof buildHomeHybrid>} model */
export function enduranceCardHTML(model) {
  const e = model.endurance;
  const unit = model.units.distance;
  const distance = e.hasWork ? formatRunDistance(e.km, unit) : '—';
  const pace = e.paceSecPerKm > 0 ? formatRunPace(paceString(e.paceSecPerKm), unit) : '';
  const sub = e.hasWork
    ? `${e.sessions} run${e.sessions === 1 ? '' : 's'}${pace ? ` · ${pace}` : ''}`
    : 'No runs logged this week';
  // Never claim a measured VO2 max: the app has no VO2 max source, only an
  // estimate derived from recent efforts (or the athlete's own threshold pace).
  const aerobic = e.aerobic
    ? `<span class="home-hy__sub" title="Estimated from your best recent run — not a measured VO₂ max.">Aerobic ${Math.round(e.aerobic.vdot)}${e.aerobic.source === 'estimated' ? ' (est.)' : ''}</span>`
    : '';

  return `<article class="card-dark home-hy home-hy__mini">
    <button type="button" class="home-hy__mini-body" data-action="open-analytics" data-context="running">
      <span class="home-hy__eyebrow">Endurance</span>
      <span class="home-hy__value">${distance}</span>
      ${deltaChip(e.deltaPct)}
      <span class="home-hy__sub">${escapeHtml(sub)}</span>
      ${aerobic}
    </button>
  </article>`;
}

/**
 * Mount the hybrid cards. Each container is optional so a missing DOM node
 * cannot blank Home; renderHome wraps the call in renderSafely as well.
 *
 * @param {any} state
 * @param {{ today?: string|Date, tz?: string }} [options]
 */
export function renderHomeHybrid(state, options = {}) {
  const balanceEl = document.getElementById('homeBalanceCard');
  const strengthEl = document.getElementById('homeStrengthWeekCard');
  const enduranceEl = document.getElementById('homeEnduranceWeekCard');
  const model = buildHomeHybrid(state, options);
  if (!model) {
    if (balanceEl) balanceEl.innerHTML = '';
    if (strengthEl) strengthEl.innerHTML = '';
    if (enduranceEl) enduranceEl.innerHTML = '';
    return null;
  }
  if (balanceEl) balanceEl.innerHTML = balanceCardHTML(model);
  if (strengthEl) strengthEl.innerHTML = strengthCardHTML(model);
  if (enduranceEl) enduranceEl.innerHTML = model.showEndurance ? enduranceCardHTML(model) : '';
  return model;
}
