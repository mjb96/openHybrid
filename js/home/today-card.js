// @ts-check
// HOME TODAY CARD
// A pure, calendar-day-aware presentation model for Home's single primary
// action. It deliberately does not trust the cockpit's last-selected day.
import { dateKey, todayProgramDay } from '../dates.js';
import { indexSlotsByDate } from '../analytics/weekly-aggregate.js';
import { evaluateSessionCompletion, classifyPlannedSession } from '../workout/completion-policy.js';
import { activeOneOffSession } from '../workout/one-off-session.js';
import { explicitSessionStatus, SESSION_STATUS } from '../workout/session-status.js';
import { buildSessionSummary, sessionSummaryHTML } from './session-summary.js';
import { buildDayRecap } from './week-view.js';

const DAY_NAMES = Object.freeze({
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
});

// Re-exported for the callers that have always imported it from here; the
// implementation now lives with the other date primitives in `js/dates.js`.
export { todayProgramDay };

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[char]));
}

function firstSentence(value, fallback = '') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match?.[0] || text).trim();
}

function programSession(program, day) {
  const blueprint = program?.days?.[day] || null;
  const planned = classifyPlannedSession(blueprint);
  return {
    blueprint,
    planned,
    title: blueprint?.title || planned.label,
  };
}

function completionFor(state, program, weekKey, day) {
  return evaluateSessionCompletion(state, program, weekKey, day);
}

function isOpenCompletion(state, week, day, completion) {
  return explicitSessionStatus(week, day) === SESSION_STATUS.IN_PROGRESS
    || (!!completion?.anyLogged && !completion.finished);
}

function completedToday(state, program, weekKey, todayISO) {
  const week = state?.weeks?.[weekKey] || {};
  for (const day of Object.keys(week.dates || {})) {
    if (week.dates?.[day] !== todayISO) continue;
    const completion = completionFor(state, program, weekKey, day);
    if (completion.finished) return { day, completion };
  }
  return null;
}

function openSessionToday(state, program, weekKey, todayISO) {
  const week = state?.weeks?.[weekKey] || {};
  for (const day of Object.keys(week.dates || {})) {
    if (week.dates?.[day] !== todayISO) continue;
    const completion = completionFor(state, program, weekKey, day);
    if (isOpenCompletion(state, week, day, completion)) return { day, completion };
  }
  return null;
}

function unresolvedProgramSession(state, program, weekKey, todayDay, todayISO) {
  const week = state?.weeks?.[weekKey] || {};
  for (const day of Object.keys(program?.days || {})) {
    if (day === todayDay) continue;
    const completion = completionFor(state, program, weekKey, day);
    if (!isOpenCompletion(state, week, day, completion)) continue;
    const loggedDate = week.dates?.[day] || null;
    if (loggedDate === todayISO) continue;
    return { day, completion, loggedDate };
  }
  return null;
}

// Calendar-date completion from an ARCHIVED/imported slot. Work in the active
// program slot is owned by completionFor(): treating an off-plan lift there as
// an "imported completion" replaced Start/Resume with Review and stranded the
// session (caught by touch-target and performance-baseline). Only a slot the
// active slot cannot see can prove the day is done.
function calendarCompletedToday(state, program, todayISO, activeWeekKey) {
  const index = indexSlotsByDate(state);
  const slots = index.allByDate?.get(todayISO) || [];
  const hasForeignSlot = slots.some((slot) => String(slot.weekKey) !== String(activeWeekKey));
  if (!hasForeignSlot) return null;
  const lookup = (id) => (id && id === state?.activeProgramId ? program : null);
  const summary = buildDayRecap(state, todayISO, index, lookup);
  if (!summary?.hasData) return null;
  return { date: todayISO, slots, summary };
}

function readinessGuidance(model, fallback) {
  const ready = model?.ready;
  const rec = model?.rec || {};
  if (ready?.hasData && ready.score != null) {
    const coaching = rec.badge === 'Getting Started'
      ? 'Keep the plan simple and log how it feels.'
      : (rec.headline || fallback);
    return `Readiness ${ready.score} · ${coaching}`;
  }
  if (rec.badge === 'Getting Started') {
    return 'Log this session to start personalising your guidance.';
  }
  return rec.headline || fallback;
}

function scoreSupport(score) {
  if (!score?.hasData || score.score == null || Number(score.confidence) < 50) return null;
  const delta = typeof score.delta === 'number'
    ? score.delta > 0 ? `+${score.delta} today`
      : score.delta < 0 ? `${score.delta} today`
      : 'steady today'
    : score.band?.status || '';
  return {
    value: score.score,
    label: ['Hybrid Score', delta].filter(Boolean).join(' · '),
  };
}

function completedMeta(dayLabel, summary) {
  const finished = summary?.finishedAt ? new Date(summary.finishedAt) : null;
  const time = finished && !Number.isNaN(finished.getTime())
    ? finished.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  return [dayLabel, time ? `finished ${time}` : 'workout logged'].filter(Boolean).join(' · ');
}

function baseModel({ state, program, model, briefing, score, now, offline, tz }) {
  const todayDay = todayProgramDay(now, tz);
  return {
    state: 'ready',
    tone: 'ready',
    eyebrow: 'Today',
    day: todayDay,
    dayLabel: DAY_NAMES[todayDay],
    todayLabel: DAY_NAMES[todayDay],
    title: '',
    meta: '',
    guidance: '',
    primary: null,
    secondary: null,
    evidence: briefing?.coach?.evidence || null,
    score: scoreSupport(score),
    offline: !!offline,
    week: String(state?.currentWeek || '1'),
    weightUnit: state?.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg',
    distanceUnit: state?.settings?.distanceUnit === 'mi' ? 'mi' : 'km',
    programName: program?.name || program?.title || '',
    model,
  };
}

/**
 * @param {{
 *  state:any, program?:any, model?:any, briefing?:any, score?:any,
 *  now?:Date, offline?:boolean, tz?:string
 * }} options
 */
export function buildTodayCardModel(options) {
  const {
    state, program = null, model = null, briefing = null, score = null,
    now = new Date(), offline = false, tz = undefined,
  } = options;
  const todayISO = dateKey(now, tz);
  const card = baseModel({ state, program, model, briefing, score, now, offline, tz });
  const weekKey = card.week;

  // A one-off strength session is the most explicit unfinished intent. Keep it
  // resumable even after midnight; starting another activity must not bury it.
  const oneOff = activeOneOffSession(state);
  if (oneOff) {
    const day = oneOff.week.sessionDay || card.day;
    const completion = completionFor(state, program, oneOff.key, day);
    const startedToday = oneOff.week.dates?.[day] === todayISO;
    card.state = startedToday ? 'in_progress' : 'unresolved';
    card.tone = 'progress';
    card.day = day;
    card.dayLabel = DAY_NAMES[day] || card.dayLabel;
    card.eyebrow = startedToday ? 'In progress' : `Unfinished ${card.dayLabel}`;
    card.title = oneOff.week.sessionTitle || 'Strength Workout';
    card.meta = startedToday
      ? (completion.progressLabel || 'Workout started')
      : `Today is ${card.todayLabel} · ${completion.progressLabel || 'workout started'}`;
    card.guidance = startedToday
      ? 'Your work is saved. Pick up where you left off.'
      : `Started ${oneOff.week.dates?.[day] || 'earlier'} · finish or discard it before starting today's session.`;
    card.primary = { action: 'start-today-workout', label: 'Resume workout' };
    return card;
  }

  if (!program) {
    card.state = 'no_plan';
    card.tone = 'quiet';
    card.eyebrow = 'Set up your training';
    card.title = 'No active plan';
    card.meta = 'Choose a plan to put the right session here each day.';
    card.guidance = 'Your existing workout history is safe and still available in Progress.';
    card.primary = { action: 'switch-tab', target: 'program', label: 'Choose a plan' };
    card.score = null;
    card.evidence = null;
    return card;
  }

  const todayCompleted = completedToday(state, program, weekKey, todayISO);
  if (todayCompleted) {
    const session = programSession(program, todayCompleted.day);
    card.state = 'completed';
    card.tone = 'complete';
    card.eyebrow = 'Completed';
    card.day = todayCompleted.day;
    card.dayLabel = DAY_NAMES[todayCompleted.day] || card.dayLabel;
    card.title = session.title;
    card.summary = buildSessionSummary(state, weekKey, todayCompleted.day);
    card.meta = completedMeta(card.dayLabel, card.summary);
    card.guidance = 'Today’s work is safely logged. Recover now; the details remain editable.';
    card.primary = { action: 'open-today-summary', day: todayCompleted.day, label: 'Review workout' };
    card.secondary = { action: 'open-program-workout-picker', label: 'Choose another workout' };
    return card;
  }

  const todayOpen = openSessionToday(state, program, weekKey, todayISO);
  if (todayOpen) {
    const session = programSession(program, todayOpen.day);
    card.state = 'in_progress';
    card.tone = 'progress';
    card.eyebrow = 'In progress';
    card.day = todayOpen.day;
    card.dayLabel = DAY_NAMES[todayOpen.day] || card.dayLabel;
    card.title = session.title;
    card.meta = todayOpen.completion.progressLabel || session.planned.label;
    card.guidance = 'Your work is saved. Pick up where you left off.';
    card.primary = { action: 'select-program-workout', day: todayOpen.day, label: 'Resume workout' };
    card.secondary = { action: 'open-program-workout-picker', label: 'Choose another workout' };
    return card;
  }

  const unresolved = unresolvedProgramSession(state, program, weekKey, card.day, todayISO);
  if (unresolved) {
    const session = programSession(program, unresolved.day);
    card.state = 'unresolved';
    card.tone = 'progress';
    card.day = unresolved.day;
    card.dayLabel = DAY_NAMES[unresolved.day] || unresolved.day;
    card.eyebrow = `Unfinished ${card.dayLabel}`;
    card.title = session.title;
    card.meta = `Today is ${card.todayLabel} · ${unresolved.completion.progressLabel}`;
    card.guidance = `Finish or discard ${card.dayLabel}'s workout before starting today's session.`;
    card.primary = { action: 'select-program-workout', day: unresolved.day, label: 'Resume workout' };
    return card;
  }

  const todaySession = programSession(program, card.day);
  const todayCompletion = completionFor(state, program, weekKey, card.day);
  const todaySlotDate = state?.weeks?.[weekKey]?.dates?.[card.day] || null;
  // Work already stored in today's program slot belongs to today; work stored in
  // the same weekday slot under a frozen week belongs to ITS date. The old code
  // ignored that and could mark today "completed" from last week's session.
  const todaySlotIsToday = !todaySlotDate || todaySlotDate === todayISO;
  card.title = todaySession.title;
  // The header chip already states the program week; repeating it here was a
  // third copy on one screen.
  card.meta = `${card.dayLabel} · ${todaySession.planned.label}`;

  // Imported/archived work on today's real date. It can never be found by
  // scanning weeks[currentWeek], so without this the card offered "Start
  // workout" while the week rail already showed today as done.
  const calendarDone = calendarCompletedToday(state, program, todayISO, weekKey);
  if (calendarDone && !(todaySlotIsToday && todayCompletion.anyLogged)) {
    const hasStrength = calendarDone.summary.sets > 0 || calendarDone.summary.volume > 0;
    const calendarRunOnly = !hasStrength && calendarDone.summary.distanceKm > 0;
    // A run on a planned gym day does not cancel the gym session; keep the
    // Start action and say the run is already banked. An imported strength
    // session, or any training on a run/rest day, is the day's work.
    if (hasStrength || !todaySession.planned.hasGym) {
      card.state = 'completed';
      card.tone = 'complete';
      card.eyebrow = 'Completed';
      card.title = calendarDone.summary.title || card.title;
      card.summary = calendarDone.summary;
      card.meta = completedMeta(card.dayLabel, card.summary);
      card.guidance = 'Today’s work is safely logged. Recover now; the details remain editable.';
      card.primary = { action: 'home-open-day-activity', date: todayISO, label: 'Review activity' };
      card.secondary = { action: 'open-program-workout-picker', label: 'Choose another workout' };
      return card;
    }
    card.calendarRunNote = calendarRunOnly;
  }

  if (todaySlotIsToday && todayCompletion.finished) {
    card.state = 'completed';
    card.tone = 'complete';
    card.eyebrow = 'Completed';
    card.summary = buildSessionSummary(state, weekKey, card.day);
    card.meta = completedMeta(card.dayLabel, card.summary);
    card.guidance = 'Today’s work is safely logged. Recover now; the details remain editable.';
    card.primary = { action: 'open-today-summary', day: card.day, label: 'Review workout' };
    card.secondary = { action: 'open-program-workout-picker', label: 'Choose another workout' };
    return card;
  }

  if (todaySlotIsToday && isOpenCompletion(state, state?.weeks?.[weekKey] || {}, card.day, todayCompletion)) {
    card.state = 'in_progress';
    card.tone = 'progress';
    card.eyebrow = 'In progress';
    card.meta = todayCompletion.progressLabel || card.meta;
    card.guidance = 'Your work is saved. Pick up where you left off.';
    card.primary = { action: 'select-program-workout', day: card.day, label: 'Resume workout' };
    card.secondary = { action: 'open-program-workout-picker', label: 'Choose another workout' };
    return card;
  }

  if (card.calendarRunNote) card.meta += ' · run already logged today';

  if (todaySession.planned.isRest) {
    card.state = 'rest';
    card.tone = 'rest';
    card.eyebrow = 'Recovery day';
    card.meta = `${card.dayLabel} · Week ${weekKey}`;
    card.guidance = firstSentence(model?.rec?.advice, 'Planned recovery. Move easy if you like, then let the work absorb.');
    card.primary = { action: 'open-wellness-checkin', label: 'Log wellness check-in' };
    card.secondary = { action: 'open-program-workout-picker', label: 'Choose another workout' };
    return card;
  }

  card.guidance = readinessGuidance(model, 'Follow the planned session and log how it feels.');
  card.primary = { action: 'select-program-workout', day: card.day, label: 'Start workout' };
  card.secondary = { action: 'open-program-workout-picker', label: 'Choose another workout' };
  return card;
}

function actionAttrs(action) {
  if (!action) return '';
  return [
    `data-action="${esc(action.action)}"`,
    action.target ? `data-target="${esc(action.target)}"` : '',
    action.day ? `data-day="${esc(action.day)}"` : '',
    action.date ? `data-date="${esc(action.date)}"` : '',
  ].filter(Boolean).join(' ');
}

/**
 * Only a fresh, actionable "ready" day collapses into the week surface.
 * In-progress, completed, rest, no-plan and unresolved states keep the full
 * card: they either carry a warning or are the moment the whole context matters.
 *
 * @param {{state?: string}|null|undefined} card
 * @returns {boolean}
 */
export function isTodayCardCollapsible(card) {
  return card?.state === 'ready';
}

/**
 * @param {any} card
 * @param {{expanded?: boolean}} [options]
 */
export function todayCardHTML(card, options = {}) {
  const collapsible = isTodayCardCollapsible(card);
  const expanded = collapsible ? options.expanded === true : true;
  const collapsed = collapsible && !expanded;
  const offline = card.offline
    ? `<p class="today-card__offline" role="status"><span aria-hidden="true"></span>Offline · logging still saves on this device</p>`
    : '';
  const secondary = card.secondary
    ? `<button id="homeChooseWorkout" class="today-card__secondary" ${actionAttrs(card.secondary)}>${esc(card.secondary.label)}</button>`
    : '';
  // The overlay makes the whole head a toggle without nesting the heading (or
  // any other block content) inside a button.
  const toggle = collapsible
    ? `<button type="button" class="today-card__toggle" data-action="toggle-today-card"
        aria-expanded="${expanded}" aria-controls="homeTodayCardDetail"
        aria-label="${expanded ? 'Hide' : 'Show'} workout details">
        <span class="today-card__chevron" aria-hidden="true"></span>
      </button>`
    : '';
  const classes = ['today-card', `today-card--${esc(card.tone)}`];
  if (collapsible) classes.push('is-collapsible');
  if (collapsed) classes.push('is-collapsed');
  const summary = card.state === 'completed' && card.summary
    ? sessionSummaryHTML(card.summary, { weightUnit: card.weightUnit, distanceUnit: card.distanceUnit })
    : '';

  return `<article class="${classes.join(' ')}" data-today-state="${esc(card.state)}" aria-labelledby="homeTodayTitle">
    <div class="today-card__head">
      <span class="today-card__eyebrow">${esc(card.eyebrow)}</span>
      <h2 id="homeTodayTitle" class="today-card__title">${esc(card.title)}</h2>
      <p class="today-card__meta">${esc(card.meta)}</p>
      ${toggle}
    </div>
    ${summary}
    <div class="today-card__detail" id="homeTodayCardDetail">
      <p class="today-card__guidance">${esc(card.guidance)}</p>
      ${offline}
    </div>
    <div class="today-card__actions">
      <button id="homePrimaryCta" class="today-card__primary btn-action-block btn-green" ${actionAttrs(card.primary)}>${esc(card.primary?.label || 'Continue')}</button>
      ${secondary}
    </div>
  </article>`;
}
