// ==========================================
// HOME DASHBOARD — coordinator. UI sub-modules live in ./home/
// ==========================================
import { resolveProgramPhase } from './programs/phase.js';
import { isCardVisible } from './ui/customize.js';
import { getProgramById, saveStateToLocalStorage } from './state.js';
import { computeHybridScore } from './brain/hybrid-score/hybrid-score.js';
import { recordDailyScore } from './brain/hybrid-score/history.js';
import { buildMorningBriefing } from './brain/morning-briefing.js';
import { dayVerdict } from './brain/day-verdict.js';
import { buildTodayCardModel, isTodayCardCollapsible, todayCardHTML, todayProgramDay } from './home/today-card.js';
import { celebrateMilestone, celebrate } from './ui/celebration.js';
import { assessOvertrainingRisk, riskSignature } from './brain/risk.js';
import { answerCoachQuestion } from './brain/coach-qa.js';
import { pushOvertrainingWarning, pushFastingStageNudge } from './notifications.js';
import { reconcileStreakFreezes } from './brain/streak.js';
import { shouldSuggestDeload } from './engine.js';
import { computeDashboardModel } from './home/dashboard-model.js';
import { initFastingCard } from './home/fasting-card.js';
import { setHTML } from './ui/render.js';
import { escapeHtml } from './util.js';
import { buildHomeWeekStrip } from './home/week-strip.js';
import { HOME_WEEK_HISTORY, buildDayRecap, buildPastWeekView, dayRecapHTML, weekOffsetLabel, weekRecapHTML } from './home/week-view.js';
import { renderHomeBodyweight } from './home/bodyweight-card.js';
import { renderHomeHybrid } from './home/hybrid-dashboard.js';
import { reportHandledError, renderSafely } from './monitoring/report-error.js';
import { addDaysISO, todayKey } from './dates.js';
import { buildVolumeGuideModel, hasExplicitMusclePriorities } from './analytics/volume-guide.js';
import { moduleEnabled } from './modules.js';

let _getState;
let _getSelectedDay;
let _getDays;

// Today's expansion is presentation-only, so it deliberately stays out of
// appState: a fresh app open returns to the compact week-first layout, and the
// state never enters an export or sync surface.
let _todayCardExpanded = false;
let _todayCardExpandedDate = null;

// Bounded week history on Home. Presentation-only, like Today's expansion.
let _homeWeekOffset = 0;
let _homeWeekDate = null;
let _lastPastWeekView = null;
// A completed day selected inside the week rail. Presentation-only; cleared
// when the week changes or the athlete returns to Today.
let _homeSelectedDate = null;

export function initHome(getStateFn, getSelectedDayFn, getDaysFn) {
  _getState = getStateFn;
  _getSelectedDay = getSelectedDayFn;
  _getDays = getDaysFn;
  initFastingCard(getStateFn);
}

export { openFastingDetail, closeFastingDetail, openHistoryEditPanel, closeHistoryEditPanel } from './home/fasting-card.js';

// ==========================================
// HYBRID SCORE — still computed and recorded once per day, but the full gauge
// now lives in Progress. Home only shows a compact supporting row when the
// score has enough real-data confidence to be useful.
// ==========================================
function renderHybridScoreHome(appState, model) {
  const result = computeHybridScore(model, appState, _getDays(), getProgramById(appState.activeProgramId));
  try {
    const { changed, milestones } = recordDailyScore(appState, result, model);
    if (changed) saveStateToLocalStorage(true);
    // Keep the score surface training-led: XP/ranks remain available in the
    // athlete profile, while Home only celebrates real consistency/score
    // milestones rather than interrupting a workout flow with level-ups.
    (milestones || []).filter(m => m.kind !== 'level').forEach(celebrateMilestone);
  } catch (e) {
    console.warn('Hybrid Score record failed (non-fatal):', e);
  }
  return result;
}

// ==========================================
// TODAY COACHING — compose the existing evidence-backed briefing, then reduce
// it to the short contextual line inside Home's Today card.
// ==========================================
// C2 — Ask the coach. Recomputes the live context (readiness model, Hybrid Score
// + delta, overtraining risk, today's session) and answers deterministically
// into the briefing card. Called from the app.js action router on a chip tap.
export function answerCoachOnHome(intent) {
  const el = document.getElementById('coachAnswer');
  if (!el) return;
  try {
    const appState = _getState();
    const selectedDay = todayProgramDay();
    const days = _getDays();
    const activeProgram = getProgramById(appState.activeProgramId);
    const model = computeDashboardModel(appState, days, activeProgram, selectedDay);
    const score = computeHybridScore(model, appState, days, activeProgram);
    let risk = null;
    try { risk = assessOvertrainingRisk(model, appState, days); }
    catch (e) { reportHandledError('home:coach-qa:risk', e); }
    const rec = model?.rec || {};
    const session = { isRest: rec.sessionLabel === 'Rest Day', done: rec.badge === 'Session Done', label: rec.sessionLabel };
    const { answer } = answerCoachQuestion(intent, { model, score, risk, session });
    el.textContent = answer;
    el.hidden = false;
  } catch (e) {
    console.warn('coach Q&A failed (non-fatal):', e);
    el.textContent = "I couldn't read your data just now — try again in a moment.";
    el.hidden = false;
  }
}

function buildHomeBriefing(appState, model, scoreResult, activeProgram, selectedDay, overtrainingActive = false) {
  const firstSession = !!appState._justOnboarded;
  const briefing = buildMorningBriefing({
    state: appState, model, score: scoreResult, projection: null,
    program: activeProgram, selectedDay, firstSession,
    overtrainingActive, days: _getDays(),
  });

  // R14 — the guided first session: once, right after onboarding, welcome the
  // athlete and draw the eye to their first mission.
  if (firstSession) {
    appState._justOnboarded = false;
    saveStateToLocalStorage(true);
    const name = (appState.settings?.name || '').trim().split(/\s+/)[0];
    celebrate({
      icon: '🎉',
      title: name ? `Welcome, ${name}!` : "You're all set!",
      subtitle: 'Your first session is ready on Home — tap Start workout when you are ready.',
    });
    const el = document.getElementById('homeTodayCard');
    setTimeout(() => { try { el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {} }, 900);
  }
  return briefing;
}

// ==========================================
// OVERTRAINING ESCALATION (R10) — a stronger, acknowledge-required warning
// when several fatigue signals stack up. Persists until the exact condition
// (signature) is acknowledged; a new/worse condition resurfaces it. Returns
// true while it's on screen so the advisory deload card stays out of its way.
// ==========================================
function renderOvertrainingCard(appState, model, assessment) {
  const card = document.getElementById('homeOvertrainingCard');
  if (!card) return false;

  if (!assessment) {
    try { assessment = assessOvertrainingRisk(model, appState, _getDays()); }
    catch (e) { reportHandledError('home:overtraining-card:assess', e); card.style.display = 'none'; return false; }
  }

  const sig = riskSignature(assessment);
  const ack = appState.overtrainingAck;
  const acknowledged = assessment.level === 'high' && ack && ack.sig === sig;

  if (assessment.level !== 'high' || acknowledged) {
    card.style.display = 'none';
    return false;
  }

  const titleEl  = document.getElementById('homeOvertrainingTitle');
  const descEl   = document.getElementById('homeOvertrainingDesc');
  const sigEl    = document.getElementById('homeOvertrainingSignals');
  const deloadBtn = document.getElementById('homeOvertrainingDeload');
  if (titleEl) titleEl.textContent = assessment.headline;
  if (descEl)  descEl.textContent  = assessment.advice;
  if (sigEl) {
    sigEl.innerHTML = assessment.signals
      .map(s => `<span class="ot-signal${s.severity === 'watch' ? ' ot-signal--watch' : ''}">${s.label}</span>`)
      .join('');
  }
  // If they've already deloaded this week, the one-tap deload is redundant.
  if (deloadBtn) deloadBtn.style.display = assessment.deloadPlanned ? 'none' : '';

  // Store the signature so the acknowledge handler dismisses THIS condition.
  card.dataset.sig = sig;
  card.style.display = 'block';

  // Fire a single warning push per day when the condition is high (best-effort).
  try {
    const today = todayKey();
    if (appState._overtrainingPushedDate !== today) {
      const pushed = pushOvertrainingWarning(assessment);
      if (pushed) { appState._overtrainingPushedDate = today; saveStateToLocalStorage(true); }
    }
  } catch (_) { /* push is best-effort */ }

  return true;
}

// ==========================================
// HOME SUPPORTING SIGNALS
// Keep the live-fast affordance and owner-preferred In Focus cards. The
// duplicated At-a-Glance tile grid is intentionally no longer rendered.
// ==========================================
function renderHomeSupportingSignals(appState, model) {
  updateQuickActions(model);

  if (appState.fastingSession?.active) {
    pushFastingStageNudge(appState, () => saveStateToLocalStorage(true));
  }
}

// ==========================================
// QUICK ACTIONS — Start/Resume Fast · Check-in · Log Weight.
// ==========================================
function updateQuickActions(model) {
  const fastRow = document.getElementById('dashboardQuickActions');
  const fastBtn = document.getElementById('qaFasting');
  if (fastRow && fastBtn) {
    const f = model.fasting;
    // Home is quiet: starting a fast lives in Train's Quick start sheet. The only
    // fasting thing that surfaces on Home is a live status pill while a fast is
    // actually running — an in-progress timer should never be buried in a menu.
    fastRow.style.display = f.active ? '' : 'none';
    if (f.active) {
      const labelEl = fastBtn.querySelector('.qa-label');
      const subEl   = fastBtn.querySelector('.qa-sub');
      if (labelEl) labelEl.textContent = 'Fasting';
      if (subEl)   subEl.textContent   = `${Math.floor(f.hours)}h · ${f.zone.name}`;
      fastBtn.classList.add('qa-btn--active');
    }
  }
  const checkBtn = document.getElementById('qaCheckin');
  if (checkBtn) {
    const done = ((model.ready && model.ready.available) || []).includes('wellness');
    const sub = checkBtn.querySelector('.qa-sub');
    if (sub) sub.textContent = done ? '✓ Done today' : 'Sleep · mood · soreness';
    checkBtn.classList.toggle('qa-btn--active', done);
  }
}

function renderHomeVolumeGuide(appState, activeProgram) {
  const card = document.getElementById('homeVolumeGuideCard');
  if (!card) return;
  if (!hasExplicitMusclePriorities(appState)) {
    card.style.display = 'none';
    return;
  }
  const guide = buildVolumeGuideModel(appState, { program: activeProgram });
  if (!guide.summary.focusCount) {
    card.style.display = 'none';
    return;
  }
  const value = document.getElementById('homeVolumeGuideValue');
  const sub = document.getElementById('homeVolumeGuideSub');
  if (value) value.textContent = `${guide.summary.coveredCount} of ${guide.summary.focusCount} focus muscles covered`;
  if (sub) {
    sub.textContent = guide.deload
      ? 'Planned deload · lower volume is expected'
      : guide.summary.scheduledCount
        ? `${guide.summary.scheduledCount} still scheduled this week`
        : 'View logged, planned and supporting work';
  }
  card.style.display = '';
}



function greetingFor(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = String(name || '').trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

function shortDate(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function renderHomeGreeting(appState) {
  const el = document.getElementById('homeGreeting');
  if (el) el.textContent = greetingFor(appState?.settings?.name);
}

function renderHomeWeek(appState, activeProgram) {
  const host = document.getElementById('homeWeekDays');
  const rangeEl = document.getElementById('homeWeekRange');
  const labelEl = document.getElementById('homeWeekLabel');
  const countEl = document.getElementById('homeWeekCount');
  if (!host) return;
  const today = todayKey();
  const strip = buildHomeWeekStrip({
    state: appState,
    program: activeProgram,
    days: _getDays(),
    today,
  });

  // Past weeks are calendar-date recaps, never a re-read of currentWeek. The
  // current strip supplies the display week's first date so a Sunday-start
  // setting stays consistent.
  let pastView = null;
  if (_homeWeekOffset < 0) {
    pastView = buildPastWeekView(appState, {
      startISO: addDaysISO(strip.weekStart, _homeWeekOffset * 7),
      offset: _homeWeekOffset,
      programLookup: getProgramById,
    });
  }
  _lastPastWeekView = pastView;
  const cells = pastView ? pastView.cells : strip.days;

  host.innerHTML = cells.map((cell) => {
    const disabled = !cell.date || (cell.date && cell.date > today);
    const classes = ['home-week-day', `home-week-day--${cell.status}`];
    if (cell.isToday) classes.push('is-today');
    if (cell.date && cell.date === _homeSelectedDate) classes.push('is-selected');
    const dateLabel = cell.date ? shortDate(cell.date) : '';
    const statusLabel = cell.status === 'done' ? 'completed'
      : cell.status === 'missed' ? 'missed'
      : cell.status === 'today' ? 'today'
      : cell.status === 'planned' ? 'planned'
      : 'rest';
    return `<button type="button" class="${classes.join(' ')}" data-home-date="${escapeHtml(cell.date || '')}" ${disabled ? 'disabled' : ''} aria-label="${escapeHtml(`${cell.label} ${dateLabel}, ${statusLabel}`)}">
      <span class="home-week-day__name">${escapeHtml(cell.label)}</span>
      <span class="home-week-day__dot" aria-hidden="true"></span>
      <span class="home-week-day__date">${escapeHtml(dateLabel)}</span>
    </button>`;
  }).join('');

  if (labelEl) labelEl.textContent = weekOffsetLabel(_homeWeekOffset);
  if (rangeEl) {
    if (pastView) {
      rangeEl.textContent = pastView.range;
    } else {
      rangeEl.textContent = strip.range || 'Your seven-day plan';
    }
  }
  if (countEl) {
    if (pastView) {
      countEl.textContent = pastView.doneCount
        ? `${pastView.doneCount} day${pastView.doneCount === 1 ? '' : 's'}`
        : 'No training';
    } else {
      countEl.textContent = strip.plannedCount
        ? `${strip.doneCount} / ${strip.plannedCount} done`
        : 'Recovery week';
    }
  }

  const prevBtn = document.querySelector('[data-action="home-week-prev"]');
  const nextBtn = document.querySelector('[data-action="home-week-next"]');
  if (prevBtn) prevBtn.disabled = _homeWeekOffset <= -HOME_WEEK_HISTORY;
  if (nextBtn) nextBtn.disabled = _homeWeekOffset >= 0;
}

function renderHomeInsight(model, state) {
  const card = document.getElementById('homeInsightCard');
  const text = document.getElementById('homeInsightText');
  const insight = model?.topInsight;
  if (!card || !text || !insight) return;
  const nav = String(insight.nav || 'progress');
  if (nav === 'custom:fasting' && !moduleEnabled(state, 'fasting')) { card.hidden = true; return; }
  if (nav.startsWith('recovery') && !moduleEnabled(state, 'recovery')) { card.hidden = true; return; }
  text.textContent = insight.text;
  if (nav === 'custom:fasting') {
    card.setAttribute('data-action', 'open-fasting-detail');
    card.removeAttribute('data-context');
  } else {
    card.setAttribute('data-action', 'open-analytics');
    card.setAttribute('data-context', nav);
  }
  card.hidden = false;
}

function _todayCardIsCollapsible() {
  return !!document.querySelector('#homeTodayCard .today-card.is-collapsible');
}

function _setTodayCardExpanded(expanded) {
  const card = document.querySelector('#homeTodayCard .today-card.is-collapsible');
  if (!card) return false;
  _todayCardExpanded = !!expanded;
  card.classList.toggle('is-collapsed', !_todayCardExpanded);
  const toggle = card.querySelector('[data-action="toggle-today-card"]');
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(_todayCardExpanded));
    toggle.setAttribute('aria-label', `${_todayCardExpanded ? 'Hide' : 'Show'} workout details`);
  }
  document.querySelector('.home-week-day.is-today')
    ?.setAttribute('aria-expanded', String(_todayCardExpanded));
  return true;
}

function _toggleTodayCard() {
  return _setTodayCardExpanded(!_todayCardExpanded);
}

function _syncTodayCardToggle(card, expanded) {
  const cell = document.querySelector('.home-week-day.is-today');
  if (!cell) return;
  if (isTodayCardCollapsible(card)) {
    cell.setAttribute('aria-expanded', String(expanded));
    cell.setAttribute('aria-controls', 'homeTodayCardDetail');
  } else {
    cell.removeAttribute('aria-expanded');
    cell.removeAttribute('aria-controls');
  }
}

function _setHomeWeekOffset(offset) {
  const next = Math.max(-HOME_WEEK_HISTORY, Math.min(0, Number(offset) || 0));
  if (next === _homeWeekOffset) return;
  _homeSelectedDate = null;
  _homeWeekOffset = next;
  renderHome();
}

document.addEventListener('click', (e) => {
  const nav = e.target.closest?.('[data-action="home-week-prev"], [data-action="home-week-next"], [data-action="home-week-today"], [data-action="home-week-recap"], [data-action="home-open-day-activity"]');
  if (nav) {
    e.preventDefault();
    const action = nav.getAttribute('data-action');
    if (action === 'home-week-prev') _setHomeWeekOffset(_homeWeekOffset - 1);
    else if (action === 'home-week-next') _setHomeWeekOffset(_homeWeekOffset + 1);
    else if (action === 'home-week-recap') { _homeSelectedDate = null; renderHome(); }
    else if (action === 'home-week-today') {
      _homeSelectedDate = null;
      if (_homeWeekOffset === 0) renderHome();
      else _setHomeWeekOffset(0);
    } else if (action === 'home-open-day-activity') {
      const date = nav.getAttribute('data-date');
      if (date) document.dispatchEvent(new CustomEvent('app:open-activities', { detail: { date } }));
    }
    return;
  }
  const toggle = e.target.closest?.('[data-action="toggle-today-card"]');
  if (toggle) {
    e.preventDefault();
    _toggleTodayCard();
    return;
  }
  const cell = e.target.closest?.('.home-week-day[data-home-date]');
  if (!cell || cell.disabled) return;
  const date = cell.getAttribute('data-home-date');
  if (!date) return;

  // Today's cell is the Today decision, never a link. A ready day toggles its
  // details; a completed/in-progress/rest day scrolls to the card that already
  // carries the plan or summary.
  if (date === todayKey()) {
    if (_homeSelectedDate) {
      _homeSelectedDate = null;
      renderHome();
      if (_todayCardIsCollapsible()) _setTodayCardExpanded(true);
      document.getElementById('homeTodayCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (_todayCardIsCollapsible()) { _toggleTodayCard(); return; }
    document.getElementById('homeTodayCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // A completed day opens its own recap in the week surface. Nothing in the
  // rail navigates away; the recap's explicit Open full activity does.
  if (!cell.classList.contains('home-week-day--done')) return;
  const cached = _lastPastWeekView?.cells.find((entry) => entry.date === date)?.recap;
  const recap = cached || buildDayRecap(_getState(), date, undefined, getProgramById);
  if (!recap?.hasData) return;
  _homeSelectedDate = date;
  renderHome();
  document.getElementById('homeTodayCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function applyHomeCardVisibility(appState) {
  document.querySelectorAll('[data-home-card]').forEach((el) => {
    const id = el.getAttribute('data-home-card');
    const hidden = !isCardVisible(appState?.settings, 'home', id);
    el.classList.toggle('home-card-hidden', hidden);
    // Only the seven-day rail is optional. Today is pinned inside the same
    // surface, so hiding "This week" must not remove the primary action.
    if (id === 'weekStrip') {
      el.closest('.home-week')?.classList.toggle('home-week--strip-hidden', hidden);
      // With no rail there is no way back to this week; never leave a past
      // recap pinned in the Today slot.
      if (hidden) {
        _homeWeekOffset = 0;
        _homeSelectedDate = null;
      }
    }
  });
}

export function renderHome() {
  const appState = _getState();
  const renderDay = todayKey();
  if (_homeWeekDate !== renderDay) {
    _homeWeekDate = renderDay;
    _homeWeekOffset = 0;
    _homeSelectedDate = null;
  }
  applyHomeCardVisibility(appState);
  // Home is a calendar-today surface. The cockpit's selected day is navigation
  // state and may point at a session the athlete merely previewed.
  const homeDay = todayProgramDay();
  const DEFAULT_DAYS = _getDays(); 

  const wk = appState?.currentWeek || "1";

  const indicatorEl = document.getElementById('homeWeekBlockIndicator');
  const phaseEl = document.getElementById('homePhaseLabelTag');
  if (indicatorEl) indicatorEl.textContent = 'Week ' + wk;
  if (phaseEl) phaseEl.textContent = resolveProgramPhase(getProgramById(appState.activeProgramId), wk, appState).label;

  // Home-header avatar → Profile (the avatar is Profile's entry point now that
  // Profile has left the nav bar). Shows the photo if set, else name initials.
  const avatarEl = document.getElementById('homeAvatar');
  if (avatarEl) {
    const nm = (appState.settings?.name || '').trim();
    const url = appState.settings?.avatarDataUrl;
    if (url) {
      avatarEl.style.backgroundImage = `url("${url}")`;
      avatarEl.textContent = '';
      avatarEl.classList.add('home-avatar--img');
    } else {
      avatarEl.style.backgroundImage = '';
      avatarEl.textContent = nm ? nm.split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('') : '?';
      avatarEl.classList.remove('home-avatar--img');
    }
  }

  const activeProgram = getProgramById(appState.activeProgramId);

  // Streak freezes (R7): auto-cover an occasional missed day and top up the
  // bank on 7-day tiers — before the model computes the streak below.
  try {
    const { changed } = reconcileStreakFreezes(appState, DEFAULT_DAYS);
    if (changed) saveStateToLocalStorage(true);
  } catch (e) { console.warn('Streak freeze reconcile failed (non-fatal):', e); }

  // One shared brain pass — the header progress, week-compare card and every
  // tile all read from this single model so their numbers never diverge.
  const model = computeDashboardModel(appState, DEFAULT_DAYS, activeProgram, homeDay);

  renderHomeGreeting(appState);
  renderHomeWeek(appState, activeProgram);
  // Hybrid cards read calendar weeks directly (not the dashboard model, which
  // is program-week anchored for load/volume) and are isolated: a failure here
  // must never blank the decision surface above them.
  renderSafely('home:hybrid', () => renderHomeHybrid(appState, { today: renderDay }));
  renderHomeBodyweight(document.getElementById('homeBodyweightCard'), appState);
  renderHomeInsight(model, appState);

  // V2 (S4): engine stall alerts move off Home — the one-hero Home keeps only
  // the recovery flag slot (overtraining/deload). Stall diagnostics still surface
  // in the workout cockpit where they're actionable.
  const engineAlertCard = document.getElementById('homeEngineAlertCard');
  if (engineAlertCard) engineAlertCard.style.display = 'none';

  const scoreResult = renderHybridScoreHome(appState, model);

  // Overtraining escalation assessed ONCE here (and reused below). This also
  // fixes a latent bug: renderOvertrainingCard referenced an out-of-scope
  // DEFAULT_DAYS, whose ReferenceError the try/catch swallowed — so the safety
  // card never actually rendered. Passing the assessment in avoids that scope
  // trap and the double compute.
  let otAssessment = null;
  try { otAssessment = assessOvertrainingRisk(model, appState, DEFAULT_DAYS); }
  catch (e) { reportHandledError('home:overtraining-assess', e); }
  const otSig = otAssessment ? riskSignature(otAssessment) : '';
  const otAck = appState.overtrainingAck;
  const otAcknowledged = !!(otAssessment && otAssessment.level === 'high' && otAck && otAck.sig === otSig);
  // The briefing suppresses its own load line only when the escalation card is
  // actually on screen (high AND not acknowledged) — one red voice, not two.
  const overtrainingActive = !!(otAssessment && otAssessment.level === 'high' && !otAcknowledged);

  const briefing = buildHomeBriefing(appState, model, scoreResult, activeProgram, homeDay, overtrainingActive);
  const todayMount = document.getElementById('homeTodayCard');
  if (todayMount) {
    // A new calendar day starts compact again. Within the day, the athlete's
    // expansion survives re-renders (a logged set, a data refresh) but never
    // enters appState or an export.
    const todayISO = todayKey();
    if (_todayCardExpandedDate !== todayISO) {
      _todayCardExpandedDate = todayISO;
      _todayCardExpanded = false;
    }
    let selectedRecap = null;
    if (_homeSelectedDate) {
      const cached = _lastPastWeekView?.cells.find((entry) => entry.date === _homeSelectedDate)?.recap;
      selectedRecap = cached || buildDayRecap(appState, _homeSelectedDate, undefined, getProgramById);
      if (!selectedRecap?.hasData) _homeSelectedDate = null;
    }
    if (selectedRecap?.hasData) {
      setHTML(todayMount, dayRecapHTML({ date: _homeSelectedDate, recap: selectedRecap }, {
        weightUnit: appState.settings?.weightUnit,
        distanceUnit: appState.settings?.distanceUnit,
        backAction: _homeWeekOffset < 0 ? 'home-week-recap' : 'home-week-today',
        backLabel: _homeWeekOffset < 0 ? '← Back to week' : '← Back to today',
      }));
      _syncTodayCardToggle(null, false);
    } else if (_homeWeekOffset < 0 && _lastPastWeekView) {
      setHTML(todayMount, weekRecapHTML(_lastPastWeekView, {
        weightUnit: appState.settings?.weightUnit,
        distanceUnit: appState.settings?.distanceUnit,
      }));
      _syncTodayCardToggle(null, false);
    } else {
      const card = buildTodayCardModel({
        state: appState,
        program: activeProgram,
        model,
        briefing,
        score: scoreResult,
        offline: typeof navigator !== 'undefined' && navigator.onLine === false,
      });
      const expanded = isTodayCardCollapsible(card) && _todayCardExpanded;
      setHTML(todayMount, todayCardHTML(card, { expanded }));
      _syncTodayCardToggle(card, expanded);
    }
  }
  renderHomeSupportingSignals(appState, model);
  renderHomeVolumeGuide(appState, activeProgram);

  // V2 (S4): the week-compare card moves off Home — it was one of several
  // redundant "did you train this week" renderings the Hybrid Score already owns.
  const compareCard = document.getElementById('homeWeekCompareCard');
  if (compareCard) compareCard.style.display = 'none';

  // Overtraining escalation (R10) takes priority over the advisory deload card.
  // Wrapped so a render fault degrades to "card hidden" AND is reported — never a
  // silent disappearance (the exact failure mode of the earlier ReferenceError).
  const overtrainingShowing = renderSafely('home:overtraining-card',
    () => renderOvertrainingCard(appState, model, otAssessment), false);

  const deloadCard = document.getElementById('homeDeloadSuggestionCard');
  const deloadReason = document.getElementById('homeDeloadReason');
  if (deloadCard) {
    const alreadyDismissed = appState._deloadDismissedWeek === appState.currentWeek;
    const alreadyApplied   = appState.deloadApplied === appState.currentWeek;
    // Never suggest a deload during a week that already IS a deload — you can't
    // be told to deload while deloading (the briefing already explains it).
    const inDeloadWeek = dayVerdict(model, appState, activeProgram, homeDay).isDeloadWeek;
    if (overtrainingShowing || inDeloadWeek) {
      deloadCard.style.display = 'none';
    } else if (!alreadyDismissed && !alreadyApplied) {
      try {
        const deloadSignal = shouldSuggestDeload();
        if (deloadSignal.suggest) {
          if (deloadReason) deloadReason.textContent = deloadSignal.reason;
          deloadCard.style.display = 'block';
        } else {
          deloadCard.style.display = 'none';
        }
      } catch(e) {
        reportHandledError('home:deload-card', e);
        deloadCard.style.display = 'none';
      }
    } else {
      deloadCard.style.display = 'none';
    }
  }

}


// ==========================================
// EVENT DELEGATION ROUTER
// ==========================================
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.getAttribute('data-action');

  if (action === 'ack-overtraining') {
    // Acknowledge THIS exact risk condition (by signature); a new/worse
    // signal set will resurface the warning.
    const appState = _getState();
    const card = document.getElementById('homeOvertrainingCard');
    appState.overtrainingAck = { sig: card?.dataset.sig || '', date: todayKey() };
    saveStateToLocalStorage(true);
    if (card) card.style.display = 'none';
    renderHome();
  }
});
