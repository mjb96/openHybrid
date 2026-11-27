// @ts-check
// =============================================================================
// ACTIVITIES — full-screen history and exact activity detail/deletion.
// =============================================================================
import {
  activityDestinationForDate, buildActivityHistory, filterActivityHistory, searchActivityHistory,
} from './activities/model.js';
import {
  MONTH_NAMES, buildActivityCalendar, latestActivityMonth, shiftCalendarMonth,
} from './activities/calendar.js';
import {
  deleteRunActivity, deleteStrengthActivity,
  restoreRunActivity, restoreStrengthActivity,
} from './activities/mutations.js';
import { buildSessionRecap, renderSessionRecapHTML } from './session-recap.js';
import { shareWorkoutCard } from './share/workout-share.js';
import { openSavedWorkoutEditor, closeSavedWorkoutEditor, saveSavedWorkoutEditor } from './workout/edit-saved.js';
import { deleteMapFromDB } from './db.js';
import { renderRunMap } from './workout-map.js';
import { confirmModal, datePromptModal } from './ui/confirm-modal.js';
import { dayOccupancy, isValidBackdatedDate, localToday } from './workout/backdated-session.js';
import { getProgramById, showToast } from './state.js';
import { getWeekModifier } from './schema.js';
import { prescribeSetsForLift } from './engine.js';
import { showUndo as showUndoBar, runUndo } from './ui/undo-bar.js';
import { openManagedModal, closeManagedModal } from './ui/modal-stack.js';

let _getState = null;
let _saveState = null;
let _filter = 'all';
let _dateFilter = null;
let _origin = 'all';
let _activationFilter = null;
let _activationLabel = null;
let _selected = null;
let _detailTab = 'summary';
let _view = 'list';
let _search = '';
let _calendar = null;
let _dayDate = null;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * The Delete menu item's visible label. Exported because a session title can
 * come from an imported CSV, and this string is interpolated into `innerHTML`:
 * the escape has to be testable without a browser.
 * @param {{ kind?: string, title?: string }|null} activity
 */
export function deleteActivityButtonLabel(activity) {
  return activity?.kind === 'run'
    ? `Delete ${esc(String(activity.title || '').toLowerCase())}`
    : 'Delete strength workout';
}

function activityIcon(kind) {
  return kind === 'run' ? '🏃' : '🏋️';
}

function dateHeading(localDate) {
  if (!localDate) return 'Date unavailable';
  const date = new Date(`${localDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return localDate;
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function replacementPrescription(state, weekKey, day) {
  const week = state.weeks?.[weekKey];
  const activeSlot = /^\d+$/.test(String(weekKey))
    && (!week?.activationId || week.activationId === state.activeActivationId);
  if (!activeSlot) return { lifts: {}, liftOrder: [] };
  const program = getProgramById(state.activeProgramId);
  const blueprint = program?.days?.[day];
  const names = (blueprint?.lifts || []).filter((name) => typeof name === 'string' && name.trim());
  if (!program || !names.length) return { lifts: {}, liftOrder: [] };
  const lifts = {};
  const modifier = getWeekModifier(program, weekKey);
  for (const name of names) {
    try { lifts[name] = prescribeSetsForLift(weekKey, day, name, blueprint.desc, modifier); }
    catch (_) { /* a deleted log must not invent a broken prescription */ }
  }
  return { lifts, liftOrder: Object.keys(lifts) };
}

export function initActivities(getStateFn, saveStateFn) {
  _getState = getStateFn;
  _saveState = saveStateFn;

  document.addEventListener('change', (event) => {
    const select = /** @type {HTMLSelectElement|null} */ (event.target);
    if (!select || select.id !== 'historySourceFilter') return;
    _origin = select.value === 'app' || select.value === 'imported' ? select.value : 'all';
    renderList();
  });

  // Search is client-side and instant. Re-render preserves the caret so typing
  // never jumps to the end or loses focus.
  document.addEventListener('input', (event) => {
    const input = /** @type {HTMLInputElement|null} */ (event.target);
    if (!input || input.id !== 'historySearchInput') return;
    _search = input.value;
    renderList();
    const next = /** @type {HTMLInputElement|null} */ (document.getElementById('historySearchInput'));
    if (next) {
      next.focus();
      const end = next.value.length;
      try { next.setSelectionRange(end, end); } catch { /* some input types */ }
    }
  });
}

// One row source for the list, detail lookup and date deep links. The program
// lookup resolves a programmed week's day title (Home's title) instead of the
// generic "Strength Workout".
function activityRows(state = _getState?.()) {
  return buildActivityHistory(state, { programLookup: getProgramById });
}

export function isActivitiesOpen() {
  const screen = document.getElementById('activitiesScreen');
  return !!screen && screen.style.display !== 'none';
}

export function openActivities(options = {}) {
  const screen = document.getElementById('activitiesScreen');
  if (!screen || !_getState) return;
  _selected = null;
  _detailTab = 'summary';
  _dateFilter = options.date || null;
  _activationFilter = options.activationId || null;
  _activationLabel = options.label || null;
  _filter = options.filter || 'all';
  _view = options.view === 'calendar' ? 'calendar' : 'list';
  _search = '';
  _calendar = null;
  if (_dateFilter) {
    const [year, month] = _dateFilter.split('-').map(Number);
    if (year && month) _calendar = { year, month: month - 1 };
  }
  if (options.directIfSingle && _dateFilter) {
    _selected = activityDestinationForDate(activityRows(), _dateFilter).activity;
  }
  closeHistoryDaySheet();
  screen.setAttribute('aria-label', 'History');
  screen.style.display = 'block';
  screen.scrollTop = 0;
  renderActivities();
}

export function closeActivities(options = {}) {
  closeHistoryDaySheet();
  if (_selected && !options.force) {
    _selected = null;
    renderList();
    return;
  }
  _selected = null;
  const screen = document.getElementById('activitiesScreen');
  if (screen) screen.style.display = 'none';
}

function renderRow(row) {
  const showBadge = row.provenance && row.provenance !== row.subtitle;
  return `<button class="activity-history-row activity-history-row--${row.kind}" data-action="open-activity-detail" data-activity-id="${esc(row.id)}">
    <span class="activity-history-icon" aria-hidden="true">${activityIcon(row.kind)}</span>
    <span class="activity-history-main">
      <span class="activity-history-title">${esc(row.title)}${showBadge ? ` <span class="activity-source-badge">${esc(row.provenance)}</span>` : ''}</span>
      <span class="activity-history-sub">${esc(row.subtitle || row.dateLabel)}</span>
      <span class="activity-history-date">${esc(row.dateLabel)}</span>
    </span>
    <span class="activity-history-metrics">${row.metrics.map((metric) => `<span>${esc(metric)}</span>`).join('')}</span>
    <span class="activity-history-chevron" aria-hidden="true">›</span>
  </button>`;
}

function monthLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return 'Undated';
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function historyViewToggle() {
  const button = (value, label) => `<button type="button" class="history-view-btn${_view === value ? ' is-active' : ''}" data-action="set-history-view" data-view="${value}" aria-pressed="${_view === value}">${label}</button>`;
  return `<div class="history-view-toggle" role="group" aria-label="History view">${button('list', 'List')}${button('calendar', 'Calendar')}</div>`;
}

function fullDayLabel(date) {
  if (!date) return 'Day';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function promptPastSession() {
  const state = _getState?.();
  if (!state) return;
  const today = localToday();
  const date = await datePromptModal({
    title: 'Log a past session',
    message: 'Choose the day you trained. Your plan and the current week are not changed.',
    label: 'Date',
    value: today,
    max: today,
  });
  if (!date) return;
  const valid = isValidBackdatedDate(date, today);
  if (!valid.ok) { showToast(valid.reason || 'Choose a real date.', true); return; }
  const occupied = dayOccupancy(state, date);
  if (occupied.total > 0) {
    const keepBoth = await confirmModal({
      title: 'That day already has training',
      message: `${occupied.total} session${occupied.total === 1 ? '' : 's'} already logged on ${fullDayLabel(date)}. Keep both?`,
      confirmLabel: 'Keep both',
      cancelLabel: 'Cancel',
    });
    if (!keepBoth) return;
  }
  document.dispatchEvent(new CustomEvent('app:backdate-session', { detail: { date } }));
}

function dayRowsFor(date) {
  const all = activityRows();
  const typed = filterActivityHistory(all, _filter, null, _activationFilter, _origin);
  return typed.filter((row) => row.localDate === date);
}

/** Open one calendar day's sessions without leaving the month. */
export function openHistoryDaySheet(date) {
  const sheet = document.getElementById('historyDaySheet');
  const body = document.getElementById('historyDayBody');
  const title = document.getElementById('historyDayTitle');
  if (!sheet || !body || !date) return false;
  const rows = dayRowsFor(date);
  _dayDate = date;
  if (title) title.textContent = fullDayLabel(date);
  body.innerHTML = rows.length
    ? `<div class="activity-history-list">${rows.map(renderRow).join('')}</div>`
    : `<div class="activity-history-empty"><span>○</span><strong>No activities on this day</strong><p>Training logged on this date with the current filters would appear here.</p></div>`;
  const full = sheet.querySelector('[data-action="history-day-full"]');
  if (full) full.toggleAttribute('hidden', rows.length === 0);
  sheet.classList.add('active');
  document.getElementById('historyDayBackdrop')?.classList.add('active');
  openManagedModal(sheet, { initialFocus: sheet.querySelector('[data-action="close-history-day"]') });
  return true;
}

export function closeHistoryDaySheet() {
  const sheet = document.getElementById('historyDaySheet');
  if (!sheet || !sheet.classList.contains('active')) return false;
  sheet.classList.remove('active');
  document.getElementById('historyDayBackdrop')?.classList.remove('active');
  closeManagedModal(sheet);
  _dayDate = null;
  return true;
}

function historyCalendarHTML(state, rows) {
  if (!_calendar) _calendar = latestActivityMonth(rows);
  const cal = buildActivityCalendar(rows, _calendar.year, _calendar.month, state?.settings?.weekStartDay);
  const sunStart = cal.weekStartDay === 'sun';
  const headers = sunStart ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = todayISO();
  const cells = cal.cells.map((cell) => {
    if (!cell.date) return '<div class="cal-cell" aria-hidden="true"></div>';
    const dots = [
      cell.strength ? '<span class="cal-dot cal-dot-gym"></span>' : '',
      cell.runs ? '<span class="cal-dot cal-dot-run"></span>' : '',
    ].join('');
    const count = cell.rows.length;
    const classes = ['cal-cell'];
    if (cell.date === today) classes.push('cal-today');
    if (count) classes.push('cal-has-activity');
    return `<button type="button" class="${classes.join(' ')}" data-action="history-calendar-day" data-date="${cell.date}" aria-label="${esc(`${cell.date}: ${count} ${count === 1 ? 'activity' : 'activities'}`)}">
      <span class="cal-num">${cell.day}</span>${dots ? `<div class="cal-dots">${dots}</div>` : ''}
    </button>`;
  }).join('');
  return `<div class="history-calendar">
    <div class="history-calendar-head">
      <button type="button" class="history-calendar-nav" data-action="history-calendar-prev" aria-label="Previous month">‹</button>
      <strong>${esc(cal.label)}</strong>
      <button type="button" class="history-calendar-nav" data-action="history-calendar-next" aria-label="Next month">›</button>
    </div>
    <div class="cal-grid history-calendar-grid">
      ${headers.map((label) => `<div class="cal-hdr">${label}</div>`).join('')}
      ${cells}
    </div>
    ${cal.hasActivity ? '' : '<p class="history-calendar-empty">No training logged in this month.</p>'}
    <p class="history-calendar-hint">Tap a day to see its sessions.</p>
  </div>`;
}

function historyRowsHTML(rows) {
  let lastMonth = '';
  return rows.map((row) => {
    const month = row.localDate ? row.localDate.slice(0, 7) : '';
    const header = month && month !== lastMonth
      ? `<div class="activity-month-header">${esc(monthLabel(month))}</div>`
      : '';
    lastMonth = month || lastMonth;
    return header + renderRow(row);
  }).join('');
}

function historyEmptyHTML() {
  if (_search) {
    return `<div class="activity-history-empty"><span>○</span><strong>No matching training</strong><p>Nothing matches “${esc(_search)}”. Try a workout, run or exercise name.</p></div>`;
  }
  if (_dateFilter) {
    return `<div class="activity-history-empty"><span>○</span><strong>No training on this date</strong><p>Pick another day or clear the date filter.</p></div>`;
  }
  return `<div class="activity-history-empty"><span>○</span><strong>No training logged here</strong><p>Completed strength workouts and runs will appear as separate activities.</p></div>`;
}

function renderList() {
  const state = _getState?.();
  const content = document.getElementById('activitiesContent');
  const title = document.getElementById('activitiesTitle');
  const back = document.getElementById('activitiesBack');
  const actions = document.getElementById('activitiesHeaderActions');
  if (!state || !content) return;
  if (title) title.textContent = 'History';
  if (back) back.textContent = '← Done';
  if (actions) {
    actions.innerHTML = '<button type="button" class="history-view-btn" data-action="log-past-session" aria-label="Log a past session">Log past</button>';
  }

  const all = activityRows(state);
  const typed = filterActivityHistory(all, _filter, _view === 'list' ? _dateFilter : null, _activationFilter, _origin);
  const rows = _view === 'list' ? searchActivityHistory(typed, _search) : typed;
  const filterLabel = _view === 'calendar' ? 'All training history'
    : _search ? 'Search results'
      : _dateFilter ? dateHeading(_dateFilter)
        : _activationFilter ? (_activationLabel || 'Previous program run')
          : 'All training history';

  const filters = `<div class="activity-filter-row">
    <div class="activity-filter-bar" role="group" aria-label="Activity type">
      ${[['all', 'All'], ['strength', 'Strength'], ['run', 'Runs']].map(([value, label]) =>
        `<button class="activity-filter${_filter === value ? ' activity-filter--active' : ''}" data-action="filter-activities" data-filter="${value}" aria-pressed="${_filter === value}">${label}</button>`
      ).join('')}
    </div>
    <label class="activity-source-filter">
      <span>Source</span>
      <select id="historySourceFilter" aria-label="Activity source">
        <option value="all"${_origin === 'all' ? ' selected' : ''}>All sources</option>
        <option value="app"${_origin === 'app' ? ' selected' : ''}>Logged in app</option>
        <option value="imported"${_origin === 'imported' ? ' selected' : ''}>Imported</option>
      </select>
    </label>
  </div>`;

  const search = `<label class="history-search">
    <span aria-hidden="true">⌕</span>
    <input id="historySearchInput" type="search" value="${esc(_search)}" placeholder="Search workouts, runs, exercises" autocomplete="off">
  </label>`;

  const body = _view === 'calendar'
    ? historyCalendarHTML(state, typed)
    : `${filters}${search}<div class="activity-history-list">${rows.length ? historyRowsHTML(rows) : (_origin !== 'all'
      ? `<div class="activity-history-empty"><span>○</span><strong>No ${_origin === 'imported' ? 'imported' : 'logged-in-app'} activities</strong><p>Change the source filter or clear the search.</p></div>`
      : historyEmptyHTML())}</div>`;

  content.innerHTML = `
    <div class="activity-history-hero">
      <div class="activity-history-hero-top">
        <div>
          <span class="activity-history-eyebrow">Training history</span>
          <h2>${esc(filterLabel)}</h2>
          <p>${rows.length} ${rows.length === 1 ? 'activity' : 'activities'}</p>
        </div>
        ${historyViewToggle()}
      </div>
      ${_dateFilter || _activationFilter ? '<button class="activity-date-clear" data-action="clear-activity-date">View all history</button>' : ''}
    </div>
    ${body}`;
}

function findSelected(activityId) {
  return activityRows().find((row) => row.id === activityId) || null;
}

function paintDetail() {
  const state = _getState?.();
  const content = document.getElementById('activitiesContent');
  const title = document.getElementById('activitiesTitle');
  const back = document.getElementById('activitiesBack');
  const actions = document.getElementById('activitiesHeaderActions');
  if (!state || !_selected || !content) return;
  if (title) title.textContent = _selected.title;
  if (back) back.textContent = '← History';
  if (actions) actions.innerHTML = `<button class="activity-menu-btn" data-action="toggle-activity-menu" aria-label="Activity actions" aria-expanded="false">•••</button>`;

  const recap = buildSessionRecap(
    state, _selected.week, _selected.day,
    _selected.kind === 'run' ? _selected.sessionId : null,
    _selected.kind,
  );
  const provenance = _selected.provenance
    ? `<div class="activity-detail-source">${esc(_selected.provenance)}</div>`
    : '';
  content.innerHTML = `
    <div class="activity-action-menu" id="activityActionMenu" hidden>
      ${_selected.kind === 'strength' ? `<button data-action="save-as-routine" data-activity-id="${esc(_selected.id)}">Save as routine</button>` : ''}
      <button data-action="share-activity">Share workout</button>
      <button data-action="edit-activity">Edit ${_selected.kind === 'run' ? 'run' : 'strength workout'}</button>
      <button data-action="delete-activity" class="activity-action-delete">${deleteActivityButtonLabel(_selected)}</button>
    </div>
    ${_selected.kind === 'strength' ? `<button type="button" class="btn-action-block activity-repeat" data-action="copy-past-workout" data-activity-id="${esc(_selected.id)}">🔁 Repeat this workout</button>` : ''}
    <div class="activity-detail-shell">${provenance}${renderSessionRecapHTML(recap, [], state.thresholdPaceSeconds || null, _detailTab, { share: false })}</div>`;
  content.querySelectorAll('[data-recap-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      _detailTab = button.getAttribute('data-recap-tab') || 'summary';
      paintDetail();
    });
  });
  if (_detailTab === 'summary' && recap.run?.distKm > 0 && (recap.run.splits?.length || recap.run.gpsQuality)) {
    renderRunMap(_selected.week, _selected.day, recap.run.distKm, {
      containerId: 'recapMapContainer',
      splits: recap.run.splits,
      thresholdSec: state.thresholdPaceSeconds,
      activationId: state.weeks?.[_selected.week]?.activationId || state.activeActivationId,
      sessionId: _selected.sessionId,
    });
  }
}

export function renderActivities() {
  if (_selected) paintDetail(); else renderList();
}

// The bar itself is owned by ./ui/undo-bar.js — Activities and the workout
// cockpit share one DOM element, so they must share one pending-change owner or
// they race for the same timer and strand each other's finalize().
//
// Each caller owns its own post-undo messaging and re-render. The shared handler
// cannot: a discarded workout restored from the cockpit must not announce
// "Activity restored" or try to repaint the Activities list.
function showUndo(label, undoFn, finalizeFn) {
  showUndoBar(`${label} deleted`, async () => {
    await Promise.resolve(undoFn());
    renderList();
    document.dispatchEvent(new CustomEvent('session:deleted', { detail: { restored: true } }));
    showToast('Activity restored');
  }, finalizeFn);
}

async function deleteSelectedActivity() {
  const state = _getState?.();
  const activity = _selected;
  const week = activity && state?.weeks?.[activity.week];
  if (!state || !activity || !week) return;
  const label = activity.kind === 'run' ? activity.title : 'Strength workout';
  const confirmed = await confirmModal({
    title: `Delete this ${activity.kind === 'run' ? activity.title.toLowerCase() : 'strength workout'}?`,
    message: activity.kind === 'run'
      ? `Only this ${activity.title.toLowerCase()} will be removed. Other runs and strength work from ${activity.dateLabel} will stay.`
      : `Only the strength workout will be removed. Runs and body-weight data from ${activity.dateLabel} will stay.`,
    confirmLabel: `Delete ${activity.kind === 'run' ? activity.title.toLowerCase() : 'workout'}`,
    danger: true,
  });
  if (!confirmed) {
    const menu = document.getElementById('activityActionMenu');
    if (menu) menu.hidden = true;
    document.querySelector('[data-action="toggle-activity-menu"]')?.setAttribute('aria-expanded', 'false');
    return;
  }

  const activationId = week.activationId || state.activeActivationId;
  if (activity.kind === 'run') {
    const snapshot = deleteRunActivity(week, activity.day, activity.sessionId);
    if (!snapshot) { showToast('Run could not be found', true); return; }
    await Promise.resolve(_saveState?.(true));
    showUndo(label, async () => {
      restoreRunActivity(week, activity.day, snapshot);
      await Promise.resolve(_saveState?.(true));
      // The route is intentionally retained during the Undo window.
    }, () => deleteMapFromDB(activity.week, activity.day, {
      activationId, sessionId: activity.sessionId,
    }));
  } else {
    const snapshot = deleteStrengthActivity(week, activity.day, replacementPrescription(state, activity.week, activity.day));
    if (!snapshot) { showToast('Workout could not be found', true); return; }
    await Promise.resolve(_saveState?.(true));
    showUndo(label, async () => {
      restoreStrengthActivity(week, activity.day, snapshot);
      await Promise.resolve(_saveState?.(true));
    }, () => {});
  }

  _selected = null;
  renderList();
  document.dispatchEvent(new CustomEvent('session:deleted', { detail: {
    week: activity.week, day: activity.day, sessionId: activity.sessionId, kind: activity.kind,
  } }));
}

export function handleActivityAction(action, element) {
  if (action === 'share-activity') {
    const state = _getState?.();
    if (state && _selected) {
      const recap = buildSessionRecap(
        state, _selected.week, _selected.day,
        _selected.kind === 'run' ? _selected.sessionId : null,
        _selected.kind,
      );
      shareWorkoutCard(recap, { title: _selected.title, showToast });
    }
    return true;
  }
  if (action === 'open-activities') { openActivities(); return true; }
  // G3: a past strength session. The date prompt and the day-collision choice
  // happen here; app.js owns creating the one-off session and opening the
  // cockpit, so the plan and the active week are never touched.
  if (action === 'log-past-session') { void promptPastSession(); return true; }
  // G4: any dated cell (the year heatmap) opens History filtered to that day.
  if (action === 'open-activities-day') {
    const date = element.getAttribute('data-date');
    openActivities({ date: date || null });
    return true;
  }
  if (action === 'close-activities') { closeActivities(); return true; }
  if (action === 'filter-activities') {
    _filter = element.getAttribute('data-filter') || 'all';
    renderList(); return true;
  }
  if (action === 'set-history-view') {
    _view = element.getAttribute('data-view') === 'calendar' ? 'calendar' : 'list';
    if (_view === 'calendar') {
      _search = '';
      _calendar = _calendar || latestActivityMonth(activityRows());
    }
    renderList(); return true;
  }
  if (action === 'history-calendar-prev' || action === 'history-calendar-next') {
    if (!_calendar) _calendar = latestActivityMonth(activityRows());
    _calendar = shiftCalendarMonth(_calendar.year, _calendar.month, action === 'history-calendar-next' ? 1 : -1);
    renderList(); return true;
  }
  if (action === 'history-calendar-day') {
    const date = element.getAttribute('data-date');
    if (date) openHistoryDaySheet(date);
    return true;
  }
  if (action === 'close-history-day') { closeHistoryDaySheet(); return true; }
  if (action === 'history-day-full') {
    const date = _dayDate;
    closeHistoryDaySheet();
    if (date) {
      _dateFilter = date;
      _search = '';
      _view = 'list';
      renderList();
    }
    return true;
  }
  if (action === 'clear-activity-date') {
    _dateFilter = null; _activationFilter = null; _activationLabel = null;
    renderList(); return true;
  }
  if (action === 'open-activity-detail') {
    closeHistoryDaySheet();
    const found = findSelected(element.getAttribute('data-activity-id'));
    if (found) {
      const screen = document.getElementById('activitiesScreen');
      if (screen) { screen.style.display = 'block'; screen.scrollTop = 0; }
      _selected = found; _detailTab = 'summary'; paintDetail();
    }
    return true;
  }
  if (action === 'open-session-detail') {
    const week = element.getAttribute('data-week');
    const day = element.getAttribute('data-day');
    const found = activityRows().find((row) =>
      row.kind === 'strength' && String(row.week) === String(week) && row.day === day
    );
    if (found) {
      const screen = document.getElementById('activitiesScreen');
      if (screen) { screen.style.display = 'block'; screen.scrollTop = 0; }
      _selected = found; _detailTab = 'summary'; paintDetail();
    }
    return true;
  }
  if (action === 'toggle-activity-menu') {
    const menu = document.getElementById('activityActionMenu');
    if (menu) {
      menu.hidden = !menu.hidden;
      element.setAttribute('aria-expanded', String(!menu.hidden));
    }
    return true;
  }
  if (action === 'edit-activity') {
    const activity = _selected;
    const state = _getState?.();
    if (activity && state) {
      const menu = document.getElementById('activityActionMenu');
      if (menu) menu.hidden = true;
      openSavedWorkoutEditor({
        state,
        weekKey: activity.week,
        day: activity.day,
        kind: activity.kind === 'run' ? 'run' : 'strength',
        sessionId: activity.sessionId,
        save: _saveState,
        onSaved: () => {
          _selected = activity;
          paintDetail();
          document.dispatchEvent(new Event('app:storage-loaded'));
        },
      });
    }
    return true;
  }
  if (action === 'close-edit-saved') {
    closeSavedWorkoutEditor();
    return true;
  }
  if (action === 'save-edit-saved') {
    saveSavedWorkoutEditor().catch((error) => {
      console.warn('Saved activity edit failed:', error);
      showToast('Changes could not be saved', true);
    });
    return true;
  }
  if (action === 'delete-activity') {
    deleteSelectedActivity().catch((error) => {
      console.warn('Activity deletion failed:', error);
      showToast('Activity could not be deleted', true);
    });
    return true;
  }
  // Generic: the bar is shared with the workout cockpit's discard, so this only
  // runs whatever change is pending — the caller that opened it owns the
  // messaging.
  if (action === 'undo-activity-delete') { runUndo().catch(() => showToast('That could not be restored', true)); return true; }
  return false;
}
