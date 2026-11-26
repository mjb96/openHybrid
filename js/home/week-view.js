// @ts-check
// =============================================================================
// HOME WEEK VIEW — bounded history for the week surface
//
// Home keeps the CURRENT week as the decision surface. The four previous weeks
// are a recap: which days were trained, how much work, and which muscles. This
// is deliberately not a second Progress/History browser.
//
// Data comes from indexSlotsByDate (date-strict, deduped across activations) and
// is merged per calendar date. It never reads `state.currentWeek` as a calendar
// week — that is a program counter, not a date.
// =============================================================================
import { addDaysISO, indexSlotsByDate, weekdayKeyOf } from '../analytics/weekly-aggregate.js';
import { dayVolume, isValidWorkingSet } from '../set-utils.js';
import { buildSessionMuscles } from './session-muscles.js';
import { muscleHeatmapHTML } from './body-heatmap.js';
import { sessionSummaryHTML, countPrLifts } from './session-summary.js';
import { escapeHtml } from '../util.js';
import { parseStrengthDurationSeconds } from '../strength/duration.js';
import { fromCanonicalWeight } from '../metrics/weight-unit.js';

/** How many weeks before the current one the Home rail can show. */
export const HOME_WEEK_HISTORY = 4;

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const KM_TO_MI = 0.621371;

function distanceText(km, unit = 'km') {
  const value = unit === 'mi' ? (Number(km) || 0) * KM_TO_MI : (Number(km) || 0);
  return `${Math.round(value * 10) / 10} ${unit}`;
}

/**
 * @param {number} offset 0 = current, -1 = last week, …
 * @returns {string}
 */
export function weekOffsetLabel(offset) {
  const value = Math.max(-HOME_WEEK_HISTORY, Math.min(0, Number(offset) || 0));
  if (value === 0) return 'This week';
  if (value === -1) return 'Last week';
  return `${Math.abs(value)} weeks ago`;
}

/**
 * @param {string} dateISO
 * @returns {string}
 */
function shortDate(dateISO) {
  const [y, m, d] = String(dateISO || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d, 12))
    .toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/**
 * @param {string} startISO
 * @returns {string}
 */
function rangeLabel(startISO) {
  const end = addDaysISO(startISO, 6);
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd, 12));
  const finish = new Date(Date.UTC(ey, em - 1, ed, 12));
  const sameMonth = sm === em && sy === ey;
  const startText = start.toLocaleDateString('en-AU', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endText = finish.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  return `${startText} – ${endText}`;
}

/**
 * Sum every stored strength duration on one calendar day. A day can hold more
 * than one session, so assigning the last value would under-report the day.
 * @param {any[]} slots
 * @returns {string}
 */
function durationFromSlots(slots) {
  let seconds = 0;
  for (const slot of slots) seconds += parseStrengthDurationSeconds(slot?.gymStats?.time);
  if (!(seconds > 0)) return '';
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/**
 * Merge every stored slot on one calendar date into the shape the completed
 * card already understands. Shared by the week recap and the day drill-down.
 *
 * @param {object} state
 * @param {string} date
 * @param {any[]} slots
 * @param {((id: string) => any)|null} [programLookup]
 */
function summariseSlots(state, date, slots, programLookup = null) {
  /** @type {Record<string, any[]>} */
  const dayLifts = {};
  for (const slot of slots) {
    if (!slot.lifts) continue;
    for (const [name, rows] of Object.entries(slot.lifts)) {
      if (!Array.isArray(rows)) continue;
      dayLifts[name] = [...(dayLifts[name] || []), ...rows];
    }
  }
  let sets = 0;
  for (const rows of Object.values(dayLifts)) {
    for (const set of rows) {
      if (!isValidWorkingSet(set)) continue;
      sets += 1;
    }
  }
  // PR counts are e1RM LIFTS — the same unit and population as Home's session
  // summary and Progress, so three record sets on one lift are one PR and a
  // hold/carry badge does not inflate the count.
  const prs = countPrLifts(dayLifts);
  const volume = dayVolume(dayLifts);
  const muscles = buildSessionMuscles(dayLifts);
  const bodyWeight = (state?.bodyWeightLog || [])
    .find((entry) => entry?.date === date)?.weight;
  const explicitTitle = slots.find((slot) => slot.sessionTitle)?.sessionTitle;
  const programTitle = slots
    .map((slot) => programLookup?.(slot.programId)?.days?.[slot.day]?.title)
    .find(Boolean);

  // A run-only day IS training. Before this, `hasData` only looked at strength
  // sets, so an imported run (or a tracked run with no lifts) painted its rail
  // cell as done but refused to open a recap. Distance is summed across every
  // session on the date, not taken from the last slot.
  let distanceKm = 0;
  let runCount = 0;
  for (const slot of slots) {
    const sessions = Array.isArray(slot.runSessions) ? slot.runSessions : [];
    if (sessions.length) {
      for (const run of sessions) {
        const dist = parseFloat(run?.dist) || 0;
        if (dist > 0) distanceKm += dist;
        if (dist > 0 || String(run?.time || '').trim()) runCount++;
      }
    } else if (slot.run) {
      const dist = parseFloat(slot.run.dist) || 0;
      if (dist > 0) distanceKm += dist;
      if (dist > 0 || String(slot.run.time || '').trim()) runCount++;
    }
  }
  distanceKm = Math.round(distanceKm * 100) / 100;
  const duration = durationFromSlots(slots);
  return {
    date,
    title: explicitTitle || programTitle || (runCount > 0 ? 'Run' : 'Completed workout'),
    duration,
    volume,
    sets,
    prs,
    distanceKm,
    runCount,
    muscles,
    bodyWeight: bodyWeight && Number(bodyWeight) > 0 ? Number(bodyWeight) : null,
    hasData: sets > 0 || volume > 0 || distanceKm > 0 || runCount > 0 || !!duration,
  };
}

/**
 * Recap for one calendar date, using the same date-strict slot index as the
 * week recap. Works for the current week as well as previous weeks.
 *
 * @param {object} state
 * @param {string} date
 * @param {ReturnType<typeof indexSlotsByDate>} [index]
 */
export function buildDayRecap(state, date, index = undefined, programLookup = undefined) {
  const idx = index || indexSlotsByDate(state);
  return summariseSlots(state, date, idx.allByDate?.get(date) || [], programLookup || null);
}

// One stored slot can hold a strength session AND one or more runs (a hybrid
// day). Count SESSIONS, not days: a two-run day is two sessions, and a
// strength+run day is two as well.
function slotSessionCount(slot) {
  const strength = (slot.stats?.workingSets > 0 || parseStrengthDurationSeconds(slot.gymStats?.time) > 0) ? 1 : 0;
  const runs = Array.isArray(slot.runSessions)
    ? slot.runSessions.length
    : (slot.run && ((parseFloat(slot.run.dist) || 0) > 0 || String(slot.run.time || '').trim()) ? 1 : 0);
  return strength + runs;
}

/**
 * @param {object} state
 * @param {{ startISO: string, offset: number, index?: ReturnType<typeof indexSlotsByDate>, programLookup?: (id: string) => any }} options
 */
export function buildPastWeekView(state, options) {
  const startISO = options.startISO;
  const index = options.index || indexSlotsByDate(state);
  const offset = Math.max(-HOME_WEEK_HISTORY, Math.min(0, Number(options.offset) || 0));
  const cells = [];
  /** @type {Record<string, any[]>} */
  const combinedLifts = {};
  let sessions = 0;
  let volume = 0;
  let sets = 0;
  let prs = 0;
  let distanceKm = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDaysISO(startISO, i);
    // The label is the REAL weekday of the date; the index is only the position
    // inside the athlete's calendar week.
    const day = weekdayKeyOf(date) || DAY_KEYS[i];
    const slots = index.allByDate?.get(date) || [];
    let daySessions = 0;
    for (const slot of slots) {
      daySessions += slotSessionCount(slot);
      if (slot.lifts) {
        for (const [name, rows] of Object.entries(slot.lifts)) {
          if (!Array.isArray(rows)) continue;
          combinedLifts[name] = [...(combinedLifts[name] || []), ...rows];
        }
      }
    }
    const recap = summariseSlots(state, date, slots, options.programLookup || null);
    sessions += daySessions;
    sets += recap.sets;
    volume += recap.volume;
    prs += recap.prs;
    distanceKm += recap.distanceKm || 0;
    const done = slots.length > 0;
    cells.push({
      day,
      label: DAY_LABELS[day],
      date,
      status: done ? 'done' : 'rest',
      planned: false,
      done,
      isToday: false,
      sessions: daySessions,
      recap,
    });
  }

  distanceKm = Math.round(distanceKm * 100) / 100;
  const muscles = buildSessionMuscles(combinedLifts);
  return {
    offset,
    startISO,
    label: weekOffsetLabel(offset),
    range: rangeLabel(startISO),
    cells,
    doneCount: cells.filter((cell) => cell.done).length,
    sessions,
    volume,
    sets,
    prs,
    distanceKm,
    muscles,
    hasData: sessions > 0 || sets > 0 || distanceKm > 0,
  };
}

/**
 * One completed workout inside a past week. The week recap stays the parent;
 * this is the drill-down, with the same heat map as the completed Today card.
 *
 * @param {any} cell a cell from buildPastWeekView (with `.recap`)
 * @param {{ weightUnit?: 'kg'|'lbs', distanceUnit?: 'km'|'mi', backAction?: string, backLabel?: string }} [options]
 * @returns {string}
 */
export function dayRecapHTML(cell, options = {}) {
  const summary = cell?.recap;
  if (!summary?.hasData) return '';
  const unit = options.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const distanceUnit = options.distanceUnit === 'mi' ? 'mi' : 'km';
  const backAction = options.backAction || 'home-week-recap';
  const backLabel = options.backLabel || '← Back to week';
  const meta = [
    shortDate(cell.date),
    summary.sets > 0 ? `${summary.sets} working set${summary.sets === 1 ? '' : 's'}` : '',
    summary.distanceKm > 0 ? distanceText(summary.distanceKm, distanceUnit) : '',
    summary.duration,
  ].filter(Boolean).join(' · ');
  return `<article class="today-card today-card--complete week-recap day-recap" data-today-state="day" data-home-date="${escapeHtml(cell.date || '')}" aria-labelledby="homeDayRecapTitle">
    <div class="today-card__head">
      <span class="today-card__eyebrow">Workout recap</span>
      <h2 id="homeDayRecapTitle" class="today-card__title">${escapeHtml(summary.title || 'Workout')}</h2>
      <p class="today-card__meta">${escapeHtml(meta)}</p>
    </div>
    <div class="today-card__detail">
      ${sessionSummaryHTML(summary, { weightUnit: unit, distanceUnit })}
    </div>
    <div class="today-card__actions">
      <button type="button" class="today-card__secondary" data-action="${escapeHtml(backAction)}">${escapeHtml(backLabel)}</button>
      <button type="button" class="today-card__secondary" data-action="home-open-day-activity" data-date="${escapeHtml(cell.date || '')}">Open full activity</button>
    </div>
  </article>`;
}

/**
 * A planned (not yet logged) day selected from the week rail. It is not a
 * recap: it previews the session and offers the one action that changes the
 * plan — move it to a free date this week (HM2).
 * @param {{ date: string, day: string, title?: string, lifts?: string[], runs?: string }} cell
 * @param {{ backAction?: string, backLabel?: string }} [options]
 */
export function plannedDayHTML(cell, options = {}) {
  const backAction = options.backAction || 'home-week-today';
  const backLabel = options.backLabel || '← Back to today';
  const lifts = Array.isArray(cell.lifts) ? cell.lifts.filter(Boolean) : [];
  const runs = String(cell.runs || '').trim();
  const list = lifts.length
    ? `<ul class="today-card__preview" aria-label="Planned lifts">${lifts.map((name) => `<li class="today-card__preview-row"><span class="today-card__preview-name">${escapeHtml(name)}</span></li>`).join('')}</ul>`
    : runs
      ? `<p class="today-card__guidance">${escapeHtml(runs)}</p>`
      : '';
  return `<article class="today-card today-card--ready day-plan" data-today-state="planned" data-home-date="${escapeHtml(cell.date || '')}" aria-labelledby="homeDayPlanTitle">
    <div class="today-card__head">
      <span class="today-card__eyebrow">Planned workout</span>
      <h2 id="homeDayPlanTitle" class="today-card__title">${escapeHtml(cell.title || 'Workout')}</h2>
      <p class="today-card__meta">${escapeHtml(shortDate(cell.date))} · not started</p>
    </div>
    <div class="today-card__detail">${list}</div>
    <div class="today-card__actions">
      <button type="button" class="today-card__secondary" data-action="move-day" data-day="${escapeHtml(cell.day || '')}">Move to…</button>
      <button type="button" class="today-card__secondary" data-action="${escapeHtml(backAction)}">${escapeHtml(backLabel)}</button>
    </div>
  </article>`;
}

/**
 * @param {ReturnType<typeof buildPastWeekView>} view
 * @param {{ weightUnit?: 'kg'|'lbs', distanceUnit?: 'km'|'mi' }} [options]
 * @returns {string}
 */
export function weekRecapHTML(view, options = {}) {
  if (!view) return '';
  const unit = options.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const distanceUnit = options.distanceUnit === 'mi' ? 'mi' : 'km';
  const title = view.sessions
    ? `${view.sessions} session${view.sessions === 1 ? '' : 's'}`
    : 'No training logged';
  const statItems = [];
  if (view.sessions > 0) statItems.push(`<div class="session-summary__stat"><b>${view.sessions}</b><span>${view.sessions === 1 ? 'Session' : 'Sessions'}</span></div>`);
  if (view.volume > 0) statItems.push(`<div class="session-summary__stat"><b>${Math.round(fromCanonicalWeight(view.volume, unit) || 0).toLocaleString('en-AU')} ${unit}</b><span>Volume</span></div>`);
  if (view.distanceKm > 0) statItems.push(`<div class="session-summary__stat"><b>${distanceText(view.distanceKm, distanceUnit)}</b><span>Distance</span></div>`);
  if (view.sets > 0) statItems.push(`<div class="session-summary__stat"><b>${view.sets}</b><span>Sets</span></div>`);
  const stats = statItems.length
    ? `<div class="session-summary__stats">${statItems.join('')}</div>`
    : '';
  const prs = view.prs > 0
    ? `<span class="session-summary__pr">🏆 ${view.prs} e1RM PR lift${view.prs === 1 ? '' : 's'}</span>`
    : '';
  const chips = view.muscles.hasData
    ? `<div class="session-summary__muscles" aria-label="Muscles worked">
        ${view.muscles.top.map((muscle) => `<span class="session-summary__chip${muscle.primary ? ' is-primary' : ''}">${escapeHtml(muscle.label)}</span>`).join('')}
      </div>`
    : '';
  const body = view.hasData
    ? `<div class="session-summary">
        ${prs}${stats}
        ${muscleHeatmapHTML(view.muscles)}
        ${chips}
      </div>`
    : `<p class="today-card__guidance">Nothing was logged in this week. The plan is still there — rest is part of it.</p>`;

  return `<article class="today-card today-card--rest week-recap" data-today-state="week" data-week-offset="${view.offset}" aria-labelledby="homeWeekRecapTitle">
    <div class="today-card__head">
      <span class="today-card__eyebrow">Week recap</span>
      <h2 id="homeWeekRecapTitle" class="today-card__title">${escapeHtml(title)}</h2>
      <p class="today-card__meta">${escapeHtml(view.range)}</p>
    </div>
    <div class="today-card__detail">
      ${body}
    </div>
    <div class="today-card__actions">
      <button type="button" class="today-card__secondary" data-action="home-week-today">Back to this week</button>
    </div>
  </article>`;
}
