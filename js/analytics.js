// ==========================================
// PERFORMANCE MATRIX — analytics.js (orchestrator)
// ==========================================
import { getProgramById, saveStateToLocalStorage } from './state.js';
import { isCompletedSet, setVolume } from './set-utils.js';
import { todayKey } from './dates.js';
import { parsePaceSeconds, parseThresholdPace } from './analytics/utils.js';
import { renderStrengthAnalytics, setStrengthTab } from './analytics/views/view-strength.js';
import { renderRunningAnalytics, setRunningTab } from './analytics/views/view-running.js';
import { renderRecoveryLoad, setRecoveryTab } from './analytics/views/view-recovery.js';
import { renderBodyWeightAnalytics, setBodyweightRange } from './analytics/views/view-bodyweight.js';
import { renderMuscleLoad } from './analytics/views/view-muscle-load.js';
import { initWeekNav, updateWeekNavDisplay, resetWeekNav, getSelectedWeekStart } from './analytics/week-nav.js';
import { renderFastingAnalytics } from './analytics/views/view-fasting.js';
import { computeDashboardModel } from './home/dashboard-model.js';
import { computeHybridScore } from './brain/hybrid-score/hybrid-score.js';
import { detailHTML as hybridScoreDetailHTML } from './brain/hybrid-score/ui.js';
import { shareHybridScoreCard } from './brain/hybrid-score/share-card.js';
import { showToast } from './toast.js';
import { renderReview, setReviewTab, getReviewTab } from './analytics/views/view-weekly-review.js';
import { renderProjections } from './analytics/views/view-projections.js';
import { runDaySummary, runSessionsForDay } from './state/run-sessions.js';
import { analyticsBackDestination } from './analytics/navigation.js';
import { estimatedE1rmForSet } from './strength/e1rm.js';
import { resolveExercise } from './exercises/catalog.js';
import { renderStrengthVolume, setStrengthVolumeTab } from './analytics/views/view-strength-volume.js';
import {
  exerciseRangeForProgress,
  renderExerciseDetail,
  renderMuscleDetail,
  setExerciseRange,
} from './analytics/views/view-strength-entity.js';
import { renderRunningMetricDetail } from './analytics/views/view-running-metric.js';
import { renderStrengthMetricDetail } from './analytics/views/view-strength-metric.js';
import { renderRunPerformance } from './analytics/views/view-run-performance.js';
import { effortForSet } from './workout/effort.js';
import { renderRecoveryPerformance } from './analytics/views/view-recovery-performance.js';
import { renderRecoveryMetricDetail } from './analytics/views/view-recovery-metric.js';
import { buildProgressLanding, buildRecentWeekSeries } from './analytics/progress-landing.js';
import { buildCalendarTrainingWeeks } from './analytics/training-calendar.js';
import { weekStartOf, localDayKey, addDaysISO } from './analytics/weekly-aggregate.js';
import { renderProgressHub } from './analytics/views/view-progress-hub.js';
import { buildProgressDashboard } from './analytics/progress-dashboard.js';
import { renderMeasures } from './analytics/views/view-measures.js';
import { buildMeasuresModel } from './metrics/measures.js';
import { buildMeasurementExplorer, DEFAULT_EXPLORER_RANGE_ID } from './analytics/measurement-explorer.js';
import { isRangeId, resolveRange } from './analytics/ranges.js';
import { confirmModal } from './ui/confirm-modal.js';
import { formatRunDistance } from './workout/run-units.js';
import { buildRunningMetricDetail } from './analytics/running-detail.js';
import { displayWeightString, toCanonicalWeight } from './metrics/weight-unit.js';

let _getState;
let _getDays;
let _analyticsContext = 'weekly-summary';
let _analyticsOrigin = 'insights';
let _analyticsEntity = null;
let _analyticsParentContext = null;
let _analyticsParentOrigin = 'insights';
let _analyticsGrandparentContext = null;
// Where a band detail was opened from, so Back can scroll to that band.
let _analyticsBandOrigin = null;
let _pendingBandReturn = null;
let _lastScoreResult = null;   // most recent Score-detail result, for the Share card
// Progress controls. Ephemeral on purpose: remembering "you were in Endurance
// mode last week" silently hides half the dashboard, which reads as a bug.
let _progressRangeId = '30d';
let _progressFocus = 'all';
let _progressGrouping = 'week';
// The Muscles band's one-muscle focus. Ephemeral like the range: entering the
// hub again must not hide 18 muscles because of a choice made last week.
let _progressMuscle = 'all';
// Measures is a two-faced screen (entry list | photo library). Ephemeral like
// the Progress controls: returning to it from elsewhere starts on the list.
let _measuresMode = 'list';
// The measurement explorer's own controls. A leaf, not the hub: its range does
// not rewrite the Progress range, and a site deep link starts on that site.
let _measuresSite = null;
let _measuresRange = DEFAULT_EXPLORER_RANGE_ID;

// V2-5 — share the Hybrid Score card. Uses the result last rendered into the
// Score detail (falls back to a fresh compute so the button always works).
export function shareScoreCard() {
  const st = _getState?.();
  if (!st) return;
  let result = _lastScoreResult;
  if (!result) {
    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
    const model = computeDashboardModel(st, _getDays(), getProgramById(st.activeProgramId), dayKey);
    result = computeHybridScore(model, st, _getDays(), getProgramById(st.activeProgramId));
  }
  shareHybridScoreCard(result, st, { showToast });
}

export function setAnalyticsContext(ctx, options = {}) {
  const previousOrigin = _analyticsOrigin;
  const previousParentContext = _analyticsParentContext;
  _analyticsContext = ctx || 'weekly-summary';
  if (_analyticsContext === 'hub') {
    _progressMuscle = 'all';
    if (options.bandOrigin) _pendingBandReturn = options.bandOrigin;
    _analyticsBandOrigin = null;
  } else {
    _analyticsBandOrigin = options.bandOrigin || null;
  }
  if (options.origin) _analyticsOrigin = options.origin === 'home' ? 'home' : 'insights';
  _analyticsEntity = options.entity ? { id: options.entity, name: options.entityName || '' } : null;
  // Entering the leaf resets its local controls; the site deep link (the Body
  // band's tap) selects the field it names.
  _measuresMode = 'list';
  _measuresSite = _analyticsContext === 'measures' ? (options.entity || null) : null;
  _measuresRange = DEFAULT_EXPLORER_RANGE_ID;
  _analyticsParentContext = options.parentContext || null;
  if (_analyticsParentContext) {
    _analyticsParentOrigin = previousOrigin;
    _analyticsGrandparentContext = previousParentContext;
  } else {
    _analyticsParentOrigin = _analyticsOrigin;
    _analyticsGrandparentContext = null;
  }
  if (!options.preserveWeek) resetWeekNav();
}

/**
 * Progress photos. Adding downscales before storing (a camera photo is several
 * megabytes and IndexedDB has a quota); deleting asks first, because a photo is
 * the one thing in this app with no Undo.
 *
 * `dateISO` is explicit because Replace must write the SAME day's blob (the id
 * IS the date), while the strip's Add control means today.
 * @param {File|Blob} file
 * @param {string} [dateISO]
 */
async function addProgressPhoto(file, dateISO = localDayKey(new Date())) {
  const state = _getState?.();
  if (!state || !file) return;
  const { addPhoto } = await import('./photos/library.js');
  try {
    await addPhoto({ state, dateISO, file, save: () => saveStateToLocalStorage(true) });
    showToast('Progress photo saved');
    renderAnalytics();
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'That photo could not be saved.');
  }
}

/**
 * A hidden picker reused for Replace. It is created on demand because the input
 * has to be clicked inside the Replace click's user activation; a picker that is
 * only appended after an await silently stops opening.
 * @param {string} dateISO
 */
function pickProgressPhoto(dateISO) {
  if (!dateISO || typeof document === 'undefined') return;
  let input = /** @type {HTMLInputElement|null} */ (document.getElementById('progressPhotoReplaceInput'));
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.id = 'progressPhotoReplaceInput';
    // HIDDEN, not sr-only: this input is never the tap target (the Replace
    // button is), and a 1x1 visible input is measured as an unreachable control.
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input?.files?.[0] || null;
      const date = input?.getAttribute('data-date') || '';
      if (input) input.value = '';
      if (file && date) void addProgressPhoto(file, date);
    });
    document.body.append(input);
  }
  input.setAttribute('data-date', dateISO);
  input.click();
}

/**
 * Open the entry sheet for a date, optionally handing it over from the photo
 * viewer so exactly one history marker exists.
 * @param {string} dateISO
 * @param {HTMLElement} [viewerRoot]
 */
async function editMeasureEntry(dateISO, viewerRoot) {
  if (!dateISO) return;
  const { openMeasurementsSheet } = await import('./measurements-sheet.js');
  openMeasurementsSheet(dateISO, { replaceRoot: viewerRoot || null });
  if (viewerRoot) {
    // The dialog is already closed by the hand-off; this releases its object
    // URLs so the next open cannot paint a stale image.
    const { closePhotoViewer } = await import('./ui/photo-viewer.js');
    closePhotoViewer();
  }
}

async function openProgressPhoto(dateISO) {
  if (!dateISO) return;
  const state = _getState?.();
  const [{ openPhotoViewer }, { listPhotos }] = await Promise.all([
    import('./ui/photo-viewer.js'),
    import('./photos/library.js'),
  ]);
  const dates = listPhotos(state).map((photo) => photo.date);
  await openPhotoViewer({
    date: dateISO,
    dates,
    onDelete: (date) => { void deleteProgressPhoto(date); },
    onReplace: (date) => pickProgressPhoto(date),
    onEditEntry: (date, root) => { void editMeasureEntry(date, root); },
  });
}

async function deleteProgressPhoto(dateISO) {
  const state = _getState?.();
  if (!state || !dateISO) return;
  const confirmed = await confirmModal({
    title: 'Delete this photo?',
    message: 'The photo and its file are removed from this device. This cannot be undone.',
    confirmLabel: 'Delete', danger: true,
  });
  if (!confirmed) return;
  try {
    const { removePhoto } = await import('./photos/library.js');
    await removePhoto({ state, id: `photo:${dateISO}`, save: () => saveStateToLocalStorage(true) });
  } catch (error) {
    // The record is kept when its bytes cannot go, so this is a failure, not a
    // deletion that half-worked.
    showToast(error instanceof Error ? error.message : 'That photo could not be deleted.', true);
    return;
  }
  // Close the viewer only now, so its history marker pops after the confirm's.
  const { closePhotoViewer } = await import('./ui/photo-viewer.js');
  closePhotoViewer();
  showToast('Photo deleted');
  renderAnalytics();
}

/**
 * Remove a WHOLE dated entry — weight, tape, body fat and its photo. Deleting a
 * photo has no Undo, so this asks first and names every part that goes.
 * `deleteMeasureEntry` removes the metadata; the library removes the blob.
 * @param {string} dateISO
 */
async function deleteMeasureEntryAction(dateISO) {
  const state = _getState?.();
  if (!state || !dateISO) return;
  const entry = buildMeasuresModel(state).entries.find((row) => row.date === dateISO);
  if (!entry) return;
  const weightUnit = weightUnitLabel(state);
  const parts = [];
  if (entry.weight != null) parts.push(`${displayWeightString(entry.weight, weightUnit, { decimals: 1 })} ${weightUnit}`);
  if (entry.bodyFat != null) parts.push(`${entry.bodyFat}% body fat`);
  if (entry.sites.length) parts.push(`${entry.sites.length} tape ${entry.sites.length === 1 ? 'site' : 'sites'}`);
  if (entry.photo) parts.push('a photo');
  const confirmed = await confirmModal({
    title: 'Delete this entry?',
    message: `${formatDayMonthShort(dateISO, { year: true })}${parts.length ? ` · ${parts.join(' · ')}` : ''}. This cannot be undone${entry.photo ? ', and the photo file is removed from this device' : ''}.`,
    confirmLabel: 'Delete', danger: true,
  });
  if (!confirmed) return;
  try {
    const { removePhoto } = await import('./photos/library.js');
    const { deleteMeasureEntry } = await import('./metrics/measures.js');
    // The library owns the blob and the metadata record; this module owns the
    // weigh-in/measurement rows, so both run before the single save.
    const result = await deleteMeasureEntry(state, dateISO, {
      removePhoto: (id) => removePhoto({ state, id }),
      save: () => saveStateToLocalStorage(true),
    });
    // Report what actually happened: an imported or half-foreign date can reach
    // this handler with nothing to remove, and "Entry deleted" would be a lie.
    showToast(result.removed ? 'Entry deleted' : 'That entry was already gone');
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'That entry could not be deleted.', true);
    return;
  }
  renderAnalytics();
}

/**
 * Share a summary of the visible bands. The rows come from the SAME models the
 * bands render, so the image cannot disagree with the screen.
 */
async function shareProgressSummary() {
  const state = _getState?.();
  if (!state) return;
  const today = localDayKey(new Date());
  const program = getProgramById(state.activeProgramId);
  const progressDashboard = buildProgressDashboard(state, {
    todayISO: today,
    // NO weekStartISO: the share card must describe the same period the hub
    // renders. The hub does not pass it (Pulse is the current week), so a share
    // triggered after stepping the navigator on some other screen would have
    // disagreed with the page it was launched from.
    rangeId: _progressRangeId,
    focus: _progressFocus,
    grouping: _progressGrouping,
    program,
    days: _getDays?.(),
  });

  const rows = [];
  for (const band of progressDashboard.bands) {
    const model = band.model || {};
    // A band with nothing in this range now renders an honest empty state on
    // the hub, but it has no number to share. Sharing "undefined %" would be a
    // fabricated statistic in an image the athlete sends to someone else.
    if (!model.hasData) continue;
    // Reviews is a Week | Month | Year row, not a measurement.
    if (band.id === 'reviews') continue;
    if (band.id === 'pulse') rows.push({ bandId: 'pulse', value: `${model.sessions || 0} sessions`, note: `${model.streakWeeks || 0}-week streak` });
    if (band.id === 'balance') rows.push({ bandId: 'balance', value: `${model.strengthSharePct}% strength`, note: `${model.enduranceSharePct}% endurance` });
    if (band.id === 'muscles') rows.push({ bandId: 'muscles', value: `${model.totalSets} sets`, note: `${model.muscles?.length || 0} muscles` });
    if (band.id === 'exercises') rows.push({ bandId: 'exercises', value: `${model.rows?.length || 0} exercises`, note: model.rows?.[0]?.lift || '' });
    if (band.id === 'endurance') rows.push({ bandId: 'endurance', value: `${formatRunDistance(model.runKm, state.settings?.distanceUnit === 'mi' ? 'mi' : 'km')} run`, note: `${model.runs} runs` });
    if (band.id === 'body') rows.push({ bandId: 'body', value: model.weight?.latest ? `${model.weight.latest} ${model.unit}` : '—', note: model.weight?.change == null ? '' : `${model.weight.change > 0 ? '+' : ''}${model.weight.change} ${model.unit}` });
    if (band.id === 'fasting') rows.push({ bandId: 'fasting', value: `${model.averageHours} h average`, note: `${model.adherencePct}% met goal` });
  }
  if (!rows.length) return;

  const { shareProgressCard } = await import('./analytics/share-card.js');
  await shareProgressCard(rows, {
    title: 'Training progress',
    subtitle: progressDashboard.range?.spanLabel || '',
    toast: showToast,
  });
}

async function exportProgressPhotos() {
  const state = _getState?.();
  if (!state) return;
  const { exportPhotosZip } = await import('./photos/library.js');
  const { saveBinaryExport, exportResultMessage } = await import('./portability/export-service.js');
  try {
    const archive = await exportPhotosZip(state);
    const result = await saveBinaryExport({
      filename: archive.filename,
      bytes: archive.bytes,
      mime: 'application/zip',
    });
    showToast(exportResultMessage(result, 'Photos'));
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'The photo export failed.');
  }
}

/**
 * Restore photos from an exported archive. Kept beside the export because the
 * two are one contract: a backup nobody can restore is not a backup. Idempotent
 * by date through `importPhotosZip`.
 */
function pickPhotoArchive() {
  if (typeof document === 'undefined') return;
  let input = /** @type {HTMLInputElement|null} */ (document.getElementById('photoImportInput'));
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip';
    input.id = 'photoImportInput';
    // Hidden: the Import button is the control, and a 1x1 visible input would
    // be measured as an unreachable target.
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input?.files?.[0] || null;
      if (input) input.value = '';
      if (file) void importProgressPhotos(file);
    });
    document.body.append(input);
  }
  input.click();
}

/** @param {File} file */
async function importProgressPhotos(file) {
  const state = _getState?.();
  if (!state) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { importPhotosZip } = await import('./photos/library.js');
    const imported = await importPhotosZip(state, bytes, { save: () => saveStateToLocalStorage(true) });
    showToast(imported
      ? `Restored ${imported} photo${imported === 1 ? '' : 's'}`
      : 'That archive had no photos to restore');
    renderAnalytics();
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'That archive could not be read.', true);
  }
}

/**
 * Which Progress action does this element mean? Extracted as a pure decision so
 * the ORDER can be tested: the previous inline version resolved a control first
 * and returned when it found none, which silently disabled Share, Export photos
 * and Delete photo — none of which carries a data-pg-* attribute.
 *
 * @param {any} el
 * @returns {'photo-view'|'delete-photo'|'export-photos'|'import-photos'|'share-progress'|'measures-mode'|'measures-delete'|'measure-range'|'grouping'|'focus'|'range'|null}
 */
export function progressControlTarget(el) {
  if (!el || typeof el.closest !== 'function') return null;
  if (el.closest('[data-photo-view]')) return 'photo-view';
  if (el.closest('[data-photo-delete]')) return 'delete-photo';
  if (el.closest('[data-action="export-photos"]')) return 'export-photos';
  if (el.closest('[data-action="import-photos"]')) return 'import-photos';
  if (el.closest('[data-action="share-progress"]')) return 'share-progress';
  // Measures has no data-pg-* marker either, so it must be resolved BEFORE the
  // range/focus/grouping controls for the same reason as Share and Export.
  if (el.closest('[data-measures-mode]')) return 'measures-mode';
  if (el.closest('[data-measure-delete]')) return 'measures-delete';
  if (el.closest('[data-ms-range]')) return 'measure-range';
  if (el.closest('[data-pg-grouping]')) return 'grouping';
  if (el.closest('[data-pg-focus]')) return 'focus';
  if (el.closest('[data-pg-range]')) return 'range';
  return null;
}

/**
 * Progress's delegated listener. One listener rather than per-render handlers,
 * so re-rendering the hub cannot leak listeners.
 */
function onProgressControlClick(event) {
  const el = event.target instanceof Element ? event.target : null;
  if (!el) return;

  // RESOLVE THE TARGET FIRST, then dispatch. Resolving only a control and
  // returning early made Share, Export photos and Delete photo dead buttons:
  // none of them carries a data-pg-* attribute, so the handler bailed before
  // reaching them. That also made the only backup path for photo bytes
  // unreachable.
  const action = progressControlTarget(el);
  if (!action) return;

  if (action === 'photo-view') {
    const date = el.closest('[data-photo-view]')?.getAttribute('data-photo-view') || '';
    void openProgressPhoto(date);
    return;
  }
  if (action === 'delete-photo') {
    void deleteProgressPhoto(el.closest('[data-photo-delete]')?.getAttribute('data-photo-delete') || '');
    return;
  }
  if (action === 'export-photos') { void exportProgressPhotos(); return; }
  if (action === 'import-photos') { pickPhotoArchive(); return; }
  if (action === 'share-progress') { void shareProgressSummary(); return; }
  if (action === 'measures-mode') {
    const next = el.closest('[data-measures-mode]')?.getAttribute('data-measures-mode');
    const mode = next === 'library' ? 'library' : 'list';
    if (mode === _measuresMode) return;
    _measuresMode = mode;
    renderAnalytics();
    // The render replaced the whole subtree, so a keyboard user would otherwise
    // be dropped back to <body>. The toggle is the control that just moved.
    document.querySelector('#analytics-measures [data-measures-mode]')?.focus?.();
    return;
  }
  if (action === 'measures-delete') {
    void deleteMeasureEntryAction(el.closest('[data-measure-delete]')?.getAttribute('data-measure-delete') || '');
    return;
  }
  if (action === 'measure-range') {
    const next = el.closest('[data-ms-range]')?.getAttribute('data-ms-range') || '';
    if (!isRangeId(next) || next === _measuresRange) return;
    _measuresRange = next;
    renderAnalytics();
    // The render replaced the subtree; keep the keyboard user on the chip that
    // just moved.
    document.querySelector(`#analytics-measures [data-ms-range="${next}"]`)?.focus?.();
    return;
  }

  const target = el.closest('[data-pg-range], [data-pg-focus], [data-pg-grouping]');
  if (!target) return;
  const range = target.getAttribute('data-pg-range');
  const focus = target.getAttribute('data-pg-focus');
  const grouping = target.getAttribute('data-pg-grouping');
  if (grouping) {
    const next = grouping === 'month' || grouping === 'year' ? grouping : 'week';
    if (next === _progressGrouping) return;
    _progressGrouping = next;
  } else if (range) {
    if (!isRangeId(range) || range === _progressRangeId) return;
    _progressRangeId = range;
  } else if (focus) {
    if (focus === _progressFocus) return;
    _progressFocus = focus === 'strength' || focus === 'endurance' ? focus : 'all';
  } else return;
  renderAnalytics();
}

/**
 * The measurement explorer's site picker is a native select, so its value
 * arrives on `change`, not on the delegated click. The range chips stay in the
 * click router above.
 * @param {Event} event
 */
function onProgressControlChange(event) {
  const el = event.target;
  if (!el || /** @type {any} */ (el).tagName !== 'SELECT' || typeof (/** @type {any} */ (el).matches) !== 'function') return;
  const select = /** @type {HTMLSelectElement} */ (el);
  if (select.matches('[data-pg-muscle]')) {
    const next = select.value || 'all';
    if (next === _progressMuscle) return;
    _progressMuscle = next;
    renderAnalytics();
    document.querySelector('#analytics-hub [data-pg-muscle]')?.focus?.();
    return;
  }
  if (!select.matches('[data-ms-site]')) return;
  const next = select.value;
  if (!next || next === _measuresSite) return;
  _measuresSite = next;
  renderAnalytics();
  document.querySelector('#analytics-measures [data-ms-site]')?.focus?.();
}

export function initAnalytics(getStateFn, getDaysFn) {
  _getState = getStateFn;
  _getDays  = getDaysFn;
  initWeekNav(_getState, renderAnalytics);
  if (typeof document !== 'undefined') {
    document.addEventListener('click', onProgressControlClick);
    document.addEventListener('change', onProgressControlChange);
  }
}

/** Tests and deep links can set the Progress range without a click. */
export function setProgressRange(rangeId) {
  if (!isRangeId(rangeId)) return;
  _progressRangeId = rangeId;
}

export function setProgressFocus(focus) {
  _progressFocus = focus === 'strength' || focus === 'endurance' ? focus : 'all';
}

export function setProgressGrouping(grouping) {
  _progressGrouping = grouping === 'month' || grouping === 'year' ? grouping : 'week';
}

// ==========================================
// LOCAL STATE MUTATORS
// ==========================================
/**
 * Persist a threshold pace entered as `mm:ss` (or legacy seconds).
 * Returns false — and leaves the stored pace untouched — for empty, malformed
 * (`4.30`) or implausible input, so a typo cannot silently rewrite the athlete's
 * running zones as a four-second pace.
 * @param {string|number|null|undefined} val
 * @returns {boolean}
 */
export function saveThresholdPace(val) {
  if (!_getState) return false;
  const seconds = parseThresholdPace(val);
  if (seconds == null) return false;
  const appState = _getState();
  appState.thresholdPaceSeconds = seconds;
  saveStateToLocalStorage(true);
  renderAnalytics();
  return true;
}

/** Persist the target weight and optional weekly-rate corridor. */
export function saveBodyweightGoal() {
  const appState = _getState();
  if (!appState) return;
  if (!appState.settings || typeof appState.settings !== 'object') appState.settings = {};

  // The editor is in the athlete's unit; the goal is stored in kilograms.
  const weightUnit = appState.settings.weightUnit;
  const targetRaw = document.getElementById('bwGoalWeight')?.value ?? '';
  const target = parseFloat(targetRaw);
  const targetKg = Number.isFinite(target) && target > 0 ? toCanonicalWeight(target, weightUnit) : null;
  appState.settings.targetWeight = targetKg;

  const dir = document.getElementById('bwRateDir')?.value || '';
  if (!dir) {
    appState.settings.rateGoal = null;
  } else {
    const by = document.getElementById('bwRateBy')?.value === 'w' ? 'w' : '%';
    const lo = Math.max(0, parseFloat(document.getElementById('bwRateLo')?.value) || 0);
    const hi = Math.max(0, parseFloat(document.getElementById('bwRateHi')?.value) || 0);
    if (hi <= 0) {
      showToast('Enter a rate range first');
      return;
    }
    // A weight-based rate is stored in kilograms per week; a % rate is not a
    // weight and stays as typed.
    const asStored = (value) => (by === 'w' ? toCanonicalWeight(value, weightUnit) || 0 : value);
    const storedLo = asStored(lo);
    const storedHi = asStored(hi);
    appState.settings.rateGoal = dir === 'hold'
      ? { dir, by, lo: 0, hi: storedHi }
      : { dir: dir === 'gain' ? 'gain' : 'lose', by, lo: storedLo, hi: storedHi };
  }

  saveStateToLocalStorage(true);
  renderAnalytics();
  showToast('Body weight goal saved');
}

/** Switch the graph between 30 days, 90 days and all history. */
export function setBodyweightRangeAction(days) {
  setBodyweightRange(days);
  renderAnalytics();
}

// ==========================================
// DATA COLLECTION
// ==========================================
function collectAnalyticsData() {
  const appState     = _getState();
  const DEFAULT_DAYS = _getDays();
  const activeProgram = getProgramById(appState.activeProgramId);
  const maxWeek = activeProgram?.totalWeeks || 12;

  const data = {
    dynamicStats: {},
    weekLabels: [],
    volData: [],
    runData: [],
    rpeData: [],
    paceData: [],

    cadenceData: [],
    teData: [],
    gymHrData: [],
    gymCalsData: [],
    hrZonesData: [],

    globalTotalDist: 0,
    globalTotalElev: 0,
    globalTotalCals: 0,
    globalTotalSets: 0,
    globalTotalVol: 0,
    absoluteMesoPeakVol: 0,

    globalTotalGymCals: 0,
    globalAvgGymHr: 0,

    thresholdSecs: appState.thresholdPaceSeconds || null,
    bodyWeightLog: appState.bodyWeightLog || [],
    distUnit: appState.settings?.distanceUnit || 'km',
  };

  if (appState.weeks) {
    Object.keys(appState.weeks).forEach(wKey => {
      const wkData = appState.weeks[wKey];
      if (!wkData || !wkData.lifts) return;

      DEFAULT_DAYS.forEach(d => {
        const dayLifts = wkData.lifts[d];
        if (!dayLifts) return;

        for (const lift in dayLifts) {
          if (!Array.isArray(dayLifts[lift])) continue;

          const displayName = resolveExercise(lift)?.name || lift;

          if (!data.dynamicStats[displayName]) {
            // priorBestMax lived here and was never read. The live PR baseline
            // is `computeStrengthAnalytics().liftProgression[lift].priorBestMax`
            // (prior e1RM history); this aggregate only feeds the all-time
            // headline and the two comparison columns below.
            data.dynamicStats[displayName] = { allTimeMax: 0, currentEstimatedMax: 0, previousWeekMax: 0 };
          }

          const prevWeek = (parseInt(appState.currentWeek, 10) - 1).toString();

          dayLifts[lift].forEach(s => {
            const completed = isCompletedSet(s);
            const weight = parseFloat(s.w) || 0;
            const reps   = parseInt(s.r, 10) || 0;

            if (completed && weight > 0 && reps > 0 && s.type !== 'W') {
              const e1rm = estimatedE1rmForSet(lift, s);
              if (e1rm > data.dynamicStats[displayName].allTimeMax)          data.dynamicStats[displayName].allTimeMax = e1rm;
              if (wKey === appState.currentWeek && e1rm > data.dynamicStats[displayName].currentEstimatedMax) data.dynamicStats[displayName].currentEstimatedMax = e1rm;
              if (wKey === prevWeek && e1rm > data.dynamicStats[displayName].previousWeekMax)                 data.dynamicStats[displayName].previousWeekMax = e1rm;
            }
          });
        }
      });
    });
  }

  for (let w = 1; w <= maxWeek; w++) {
    const wKey   = w.toString();
    data.weekLabels.push('W' + w);
    const wkData = appState.weeks?.[wKey];

    if (!wkData) {
      data.volData.push(0); data.runData.push(0); data.rpeData.push(0); data.paceData.push(0);
      data.cadenceData.push(0); data.teData.push(0); data.gymHrData.push(0); data.gymCalsData.push(0);
      data.hrZonesData.push([0, 0, 0, 0, 0]);
      continue;
    }

    let weekVol = 0, weekDist = 0, weekElev = 0, weekCals = 0;
    let weekRpeSum = 0, weekRpeCount = 0;
    let weekRunTime = 0, weekRunDist = 0;
    let weekCadenceSum = 0, weekCadenceCount = 0;
    let weekTeSum = 0, weekTeCount = 0;
    let weekGymHrSum = 0, weekGymHrCount = 0;
    let weekGymCals = 0;
    let weekHrZones = [0, 0, 0, 0, 0];

    DEFAULT_DAYS.forEach(d => {
      const run  = runDaySummary(wkData, d);
      const dist = parseFloat(run.dist) || 0;
      const elev = parseFloat(run.elev) || 0;
      const cals = parseFloat(run.cals) || 0;
      weekDist += dist; weekElev += elev; weekCals += cals;

      runSessionsForDay(wkData, d).forEach(session => {
        const sessionDist = parseFloat(session.dist) || 0;
        const paceS = session.type === 'walk' ? 0 : parsePaceSeconds(sessionDist, session.time || '');
        if (paceS > 0 && sessionDist > 0) { weekRunTime += paceS * sessionDist; weekRunDist += sessionDist; }
        const runRpe = parseFloat(session.rpe) || 0;
        if (runRpe > 0) { weekRpeSum += runRpe; weekRpeCount++; }
        if (session.avgCadence) { weekCadenceSum += parseFloat(session.avgCadence); weekCadenceCount++; }
        if (session.trainingEffect) { weekTeSum += parseFloat(session.trainingEffect); weekTeCount++; }
      });
      if (Array.isArray(run.hrZones)) {
        run.hrZones.forEach((z, i) => { if (i < 5) weekHrZones[i] += parseFloat(z) || 0; });
      }

      const gym = wkData.gymStats?.[d] || {};
      if (gym.avgHR) { weekGymHrSum += parseFloat(gym.avgHR); weekGymHrCount++; }
      if (gym.cals)  { weekGymCals += parseFloat(gym.cals); weekCals += parseFloat(gym.cals); }

      const dayLifts = wkData.lifts?.[d] || {};
      let daySetRpeSum = 0, daySetRpeCount = 0;
      for (const lift in dayLifts) {
        if (!Array.isArray(dayLifts[lift])) continue;
        dayLifts[lift].forEach(s => {
          const completed = isCompletedSet(s);
          if (completed && s.type !== 'W') {
            weekVol += setVolume(s);
            data.globalTotalSets++;
          }
          // Per-set RIR is measured effort too; reading only `s.rpe` made an
          // imported RIR-only set invisible to the weekly RPE average.
          const effort = effortForSet(s);
          if (completed && s.type !== 'W' && effort.rpe != null && effort.rpe > 0 && effort.rpe <= 10) {
            daySetRpeSum += effort.rpe;
            daySetRpeCount++;
          }
        });
      }
      // Per-set RPEs take priority; fall back to session-level gymRpe when absent.
      if (daySetRpeCount > 0) {
        weekRpeSum += daySetRpeSum / daySetRpeCount;
        weekRpeCount++;
      } else {
        const gymRpe = parseFloat(wkData.gymRpe?.[d]) || 0;
        if (gymRpe > 0) { weekRpeSum += gymRpe; weekRpeCount++; }
      }
    });

    data.globalTotalDist += weekDist;
    data.globalTotalElev += weekElev;
    data.globalTotalCals += weekCals;
    data.globalTotalVol  += weekVol;
    if (weekVol > data.absoluteMesoPeakVol) data.absoluteMesoPeakVol = weekVol;

    data.volData.push(weekVol);
    data.runData.push(weekDist);
    data.rpeData.push(weekRpeCount > 0 ? weekRpeSum / weekRpeCount : 0);
    data.paceData.push(weekRunDist > 0 ? weekRunTime / weekRunDist : 0);
    data.cadenceData.push(weekCadenceCount > 0 ? weekCadenceSum / weekCadenceCount : 0);
    data.teData.push(weekTeCount > 0 ? weekTeSum / weekTeCount : 0);
    data.gymHrData.push(weekGymHrCount > 0 ? weekGymHrSum / weekGymHrCount : 0);
    data.gymCalsData.push(weekGymCals);
    data.hrZonesData.push(weekHrZones);
  }

  data.globalTotalGymCals = data.gymCalsData.reduce((a, b) => a + b, 0);
  const validGymHr = data.gymHrData.filter(h => h > 0);
  data.globalAvgGymHr = validGymHr.length ? validGymHr.reduce((a, b) => a + b, 0) / validGymHr.length : 0;

  // Calendar-week training grid. Program weeks are NOT calendar weeks and an
  // archived/imported activation has no numeric column at all, so both
  // Training Calendar heatmaps now read the same date-strict trailing weeks as
  // History and the Progress hub.
  const todayISO = todayKey();
  const calendar = buildCalendarTrainingWeeks(appState, { today: todayISO, weeks: 12 });
  data.calendarTrainingDays = calendar.trainingDays;
  data.calendarWeekLabels = calendar.labels;
  data.calendarWeeks = buildRecentWeekSeries(appState, weekStartOf(todayISO), 12);
  data.calendarWeekVolume = data.calendarWeeks.map((week) => week.volumeKg);

  return data;
}

// ==========================================
// MASTER ROUTER
// ==========================================

// Screens whose whole content describes ONE calendar week, so the shared
// navigator is real there rather than decorative. Review joins them only on its
// Overview tab — its Stats tab also carries the monthly report, streak, goals
// and the consistency log, none of which are one calendar week — so the tab is
// consulted too (the router sets it in the switch below).
const WEEK_SCOPED_CONTEXTS = [
  // NOT 'hub': Progress is range-driven (30D/3M/1Y/All), so a week navigator on
  // that surface was a second, contradictory time control — and it only ever
  // governed Pulse. It stays for the screens that really are one calendar week.
  'strength', 'strength_pr', 'weekly-volume', 'strength-volume',
  'strength-volume-trends', 'running', 'muscle',
];

function applyWeekNavVisibility(context) {
  const weekNav = document.getElementById('analyticsWeekNav');
  if (!weekNav) return;
  const visible = WEEK_SCOPED_CONTEXTS.includes(context)
    || (context === 'weekly-review' && getReviewTab() === 'week');
  weekNav.style.display = visible ? '' : 'none';
}

/**
 * The band-detail context line. A drilldown inherits the hub's range and says
 * which range that is, so the numbers on the leaf are not mistaken for a
 * different window.
 */
function renderRangeChip() {
  const chip = document.getElementById('analyticsRangeChip');
  if (!chip) return;
  const onHub = _analyticsContext === 'hub';
  const fromProgress = !onHub && (_analyticsParentContext === 'hub' || !!_analyticsBandOrigin || _analyticsOrigin === 'insights');
  if (!fromProgress) {
    chip.hidden = true;
    chip.textContent = '';
    return;
  }
  const range = resolveRange(_progressRangeId, localDayKey(new Date()));
  chip.hidden = false;
  chip.textContent = `Progress · ${range.label}${range.spanLabel ? ` · ${range.spanLabel}` : ''}`;
}

export function renderAnalytics() {
  if (!_getState || !_getDays) return;

  updateWeekNavDisplay(_getState);

  const context = _analyticsContext;
  renderRangeChip();

  // Review's Overview is week-scoped and its Stats tab is not. The tab bar
  // reports every in-screen switch so the navigator is never left stale. Legacy
  // Stats-entry contexts keep it hidden on both tabs, because a navigator tap
  // re-runs this router and would bounce the athlete back to Stats.
  const onReviewTabChange = () => applyWeekNavVisibility(context);

  // collectAnalyticsData walks every stored week. Only the screens below read
  // it, so the hub — which re-renders on every week-nav tap — must not pay for
  // it just to show one calendar week.
  let analyticsDataCache = null;
  const analyticsData = () => (analyticsDataCache ??= collectAnalyticsData());

  document.querySelectorAll('.analytics-section').forEach(sec => sec.classList.remove('active'));

  const backBtn = document.querySelector('#view-analytics .subview-back-btn');
  if (backBtn) {
    const destination = analyticsBackDestination(
      context, _analyticsOrigin, _analyticsParentContext,
      _analyticsGrandparentContext, _analyticsParentOrigin,
      _analyticsBandOrigin,
    );
    if (!destination) {
      // The hub is now a top-level nav destination — the bottom nav is the way
      // out, so no back button is needed on the index itself.
      backBtn.style.display = 'none';
    } else {
      backBtn.style.display = '';
      backBtn.setAttribute('data-action', destination.action);
      backBtn.textContent = destination.label;
      if (destination.context) backBtn.setAttribute('data-context', destination.context);
      else backBtn.removeAttribute('data-context');
      if (destination.parentContext) backBtn.setAttribute('data-parent-context', destination.parentContext);
      else backBtn.removeAttribute('data-parent-context');
      if (destination.origin) backBtn.setAttribute('data-origin', destination.origin);
      else backBtn.removeAttribute('data-origin');
      if (destination.preserveWeek) backBtn.setAttribute('data-preserve-week', 'true');
      else backBtn.removeAttribute('data-preserve-week');
      if (destination.bandOrigin) backBtn.setAttribute('data-band-origin', destination.bandOrigin);
      else backBtn.removeAttribute('data-band-origin');
      if (destination.target) backBtn.setAttribute('data-target', destination.target);
      else backBtn.removeAttribute('data-target');
    }
  }

  switch (context) {
    case 'hub': {
      const hubEl = document.getElementById('analytics-hub');
      hubEl.classList.add('active');
      // Readiness comes from the ONE shared dashboard model — the same number
      // Home shows — so the hub can never disagree with Home about it.
      const st = _getState();
      const days = _getDays();
      const program = getProgramById(st.activeProgramId);
      const today = localDayKey(new Date());
      const weekStart = getSelectedWeekStart(today);
      const isCurrentWeek = weekStart === weekStartOf(today);
      const weekEnd = /** @type {string} */ (addDaysISO(weekStart, 6));
      const dashboard = computeDashboardModel(st, days, program, days[0] || 'mon');
      // The composer keeps hidden / module-off / no-data distinct and turns a
      // throwing band into an error band instead of blanking the tab.
      const progressDashboard = buildProgressDashboard(st, {
        todayISO: today,
        rangeId: _progressRangeId,
        focus: _progressFocus,
        grouping: _progressGrouping,
        program,
        days,
      });
      renderProgressHub(hubEl, buildProgressLanding(st, {
        days,
        program,
        readiness: dashboard.ready,
        // One calendar week, selected by the shared navigator. Never
        // state.currentWeek.
        today,
        weekStart,
        // Series included: the hub's Running card draws a trend spark from the
        // metric engine's own weekly points rather than computing a second one.
        // The engine reads `today` as its through-date, so a completed week ends
        // on its Sunday; the live week keeps today and stays elapsed-matched.
        runningMetric: (id) => buildRunningMetricDetail(st, id, {
          range: '12w',
          today: isCurrentWeek ? today : weekEnd,
        }),
      }), st.settings?.ui?.progress?.hidden || [], {
        bands: progressDashboard.bands,
        rangeId: progressDashboard.range?.id || _progressRangeId,
        focus: progressDashboard.focus,
        focusAvailable: progressDashboard.focusAvailable,
        visibleCount: progressDashboard.visibleCount,
        renderableCount: progressDashboard.renderableCount,
        showRunning: !progressDashboard.availability?.endurance?.moduleOff,
        hidden: st.settings?.ui?.progress?.hidden || [],
        selectedMuscle: _progressMuscle,
        weightUnit: st.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg',
        distanceUnit: st.settings?.distanceUnit === 'mi' ? 'mi' : 'km',
      });
      // Origin-aware Back: a band drilldown returns to the band it came from,
      // not to the top of the hub (roadmap §16.6 / P-F5).
      const bandReturn = _pendingBandReturn;
      _pendingBandReturn = null;
      if (bandReturn) {
        setTimeout(() => {
          try {
            document.querySelector(`#analytics-hub [data-band="${bandReturn}"]`)
              ?.scrollIntoView({ behavior: 'auto', block: 'start' });
          } catch (_) { /* no-op */ }
        }, 0);
      }
      break;
    }
    // PG4: one Review surface with the SAME three periods as the hub row.
    // Each legacy context opens the tab it actually names.
    case 'weekly-review':
      setReviewTab('week');
      document.getElementById('analytics-weekly-review').classList.add('active');
      // Week is the only period that follows the shared navigator, so the tab
      // bar reports back rather than leaving a stale control.
      renderReview(analyticsData(), _getState, _getDays, onReviewTabChange);
      break;
    case 'monthly-report':
    case 'weekly-summary':
      setReviewTab('month');
      document.getElementById('analytics-weekly-review').classList.add('active');
      renderReview(analyticsData(), _getState, _getDays, onReviewTabChange);
      break;
    case 'year-review':
      setReviewTab('year');
      document.getElementById('analytics-weekly-review').classList.add('active');
      renderReview(analyticsData(), _getState, _getDays, onReviewTabChange);
      break;
    case 'projections':
      document.getElementById('analytics-projections').classList.add('active');
      renderProjections(_getState, _getDays);
      break;
    case 'hybrid-score': {
      document.getElementById('analytics-hybrid-score').classList.add('active');
      const st = _getState();
      const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
      const model = computeDashboardModel(st, _getDays(), getProgramById(st.activeProgramId), dayKey);
      const result = computeHybridScore(model, st, _getDays(), getProgramById(st.activeProgramId));
      _lastScoreResult = result;   // for the Share action (V2-5)
      const el = document.getElementById('hybridScoreDetail');
      if (el) el.innerHTML = hybridScoreDetailHTML(result, st);
      break;
    }
    case 'strength':
      setStrengthTab('overview');
      document.getElementById('analytics-strength').classList.add('active');
      renderStrengthAnalytics(analyticsData(), _getState, _getDays, { rangeId: _progressRangeId });
      break;
    case 'strength_pr':
      setStrengthTab('stats');
      document.getElementById('analytics-strength').classList.add('active');
      renderStrengthAnalytics(analyticsData(), _getState, _getDays, { rangeId: _progressRangeId });
      break;
    // Phase 3B: one Strength Volume destination. The legacy contexts choose
    // the opening tab so every existing entry point still lands correctly.
    case 'weekly-volume':
      setStrengthVolumeTab('week');
      document.getElementById('analytics-strength-volume').classList.add('active');
      renderStrengthVolume(_getState());
      break;
    case 'strength-volume':
      // No tab forced: this context means "the Volume screen", so it keeps
      // whichever tab the athlete last used.
      document.getElementById('analytics-strength-volume').classList.add('active');
      renderStrengthVolume(_getState());
      break;
    case 'strength-volume-trends':
      setStrengthVolumeTab('trends');
      document.getElementById('analytics-strength-volume').classList.add('active');
      renderStrengthVolume(_getState());
      break;
    case 'gym-performance':
      setStrengthVolumeTab('trends');
      document.getElementById('analytics-strength-volume').classList.add('active');
      renderStrengthVolume(_getState());
      break;
    case 'run-performance':
      document.getElementById('analytics-run-performance').classList.add('active');
      renderRunPerformance(_getState());
      break;
    case 'recovery-metric':
      document.getElementById('analytics-recovery-metric').classList.add('active');
      renderRecoveryMetricDetail(_getState(), _analyticsEntity || {});
      break;
    case 'recovery-performance':
      document.getElementById('analytics-recovery-performance').classList.add('active');
      renderRecoveryPerformance(_getState());
      break;
    case 'exercise': {
      // A9: the window the athlete chose in Progress carries into the lift, so
      // a 1-year question is not answered with a 12-week chart.
      if (_analyticsOrigin === 'insights') {
        const inherited = exerciseRangeForProgress(_progressRangeId);
        if (inherited) setExerciseRange(inherited);
      }
      document.getElementById('analytics-strength-entity').classList.add('active');
      renderExerciseDetail(_getState(), _analyticsEntity || {});
      break;
    }
    case 'muscle':
      document.getElementById('analytics-strength-entity').classList.add('active');
      renderMuscleDetail(_getState(), _analyticsEntity || {}, getSelectedWeekStart(), { rangeId: _progressRangeId });
      break;
    case 'strength-metric':
      document.getElementById('analytics-strength-metric').classList.add('active');
      renderStrengthMetricDetail(_getState(), _analyticsEntity || {});
      break;
    case 'running':
      setRunningTab('overview');
      document.getElementById('analytics-running').classList.add('active');
      renderRunningAnalytics(analyticsData(), _getState, _getDays);
      break;
    case 'running-metric':
      document.getElementById('analytics-running-metric').classList.add('active');
      renderRunningMetricDetail(_getState(), _analyticsEntity || {});
      break;
    // V2 (S2): recovery, recovery-score, training-status, load-focus and
    // stress-balance collapse into ONE Recovery & Load screen — "three names for
    // one concept" (§4). Readiness is the Overview hero; the rest is in Stats.
    case 'recovery':
      setRecoveryTab('overview');
      document.getElementById('analytics-recovery').classList.add('active');
      renderRecoveryLoad(analyticsData(), _getState, _getDays);
      break;
    case 'recovery-score':
    case 'training-status':
    case 'load-focus':
    case 'stress-balance':
      setRecoveryTab('stats');
      document.getElementById('analytics-recovery').classList.add('active');
      renderRecoveryLoad(analyticsData(), _getState, _getDays);
      break;
    case 'bodyweight':
      document.getElementById('analytics-bodyweight').classList.add('active');
      renderBodyWeightAnalytics(analyticsData(), _getState);
      break;
    // Body's date-level record: weight, body fat, tape and photos, one row per
    // day. The photo strip and the viewer are the SAME records the Body band
    // reads; this screen never re-derives them.
    case 'measures': {
      document.getElementById('analytics-measures').classList.add('active');
      // A throwing model renders its error instead of blanking the screen.
      try {
        // The `bodyPhotos` privacy switch hides photos on the Body card; a deep
        // link must not reopen them here, or the switch promises something it
        // cannot keep.
        renderMeasures(buildMeasuresModel(_getState()), {
          mode: _measuresMode,
          hidden: _getState()?.settings?.ui?.progress?.hidden || [],
          explorer: buildMeasurementExplorer(_getState(), {
            siteKey: _measuresSite,
            rangeId: _measuresRange,
          }),
        });
      } catch (error) {
        renderMeasures(null, { mode: _measuresMode, error: error instanceof Error ? error.message : String(error) });
      }
      break;
    }
    case 'muscle-load':
      document.getElementById('analytics-muscle-load').classList.add('active');
      renderMuscleLoad(_getState(), { rangeId: _progressRangeId });
      break;
    // V2 (S2): progress, streak and goal-progress are folded into the Review
    // screen's Week tab (streak + goal live there) — redirect so deep links
    // still resolve.
    case 'progress':
    case 'streak':
    case 'goal-progress':
      setReviewTab('week');
      document.getElementById('analytics-weekly-review').classList.add('active');
      renderReview(analyticsData(), _getState, _getDays, onReviewTabChange);
      break;
    // V2 (S2): avg-pace, vdot, run-crossref are absorbed into the Running
    // screen's Stats tab — redirect so deep links still resolve.
    case 'run-crossref':
    case 'vdot':
    case 'avg-pace':
      setRunningTab('stats');
      document.getElementById('analytics-running').classList.add('active');
      renderRunningAnalytics(analyticsData(), _getState, _getDays);
      break;
    case 'fasting':
      document.getElementById('analytics-fasting').classList.add('active');
      renderFastingAnalytics(_getState);
      break;
    default:
      // Unknown / absorbed context → fall back to the Insights hub.
      document.getElementById('analytics-hub').classList.add('active');
      break;
  }

  // Resolved AFTER the switch, because a Review entry sets its tab in there and
  // the navigator is only truthful once the screen's own tab is known.
  applyWeekNavVisibility(context);
}
