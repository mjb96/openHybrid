// ==========================================
// CLEANED CORE PROTOCOL ROUTER (app.js)
// ==========================================
import { devWarn } from './debug.js';
import { openBuilder } from './program_builder.js';
import { initProgramLibrary, updateLibraryState, renderLibrary, handleLibraryAction, returnToLibrary, showLibraryTab } from './programs/library.js';
import { handleDetailAction, closeDayPreviewModal } from './programs/detail.js';
import { copyProgramAsText, handleProgramTextAction } from './programs/copy-program.js';
import { buildPlanFile, parsePlanFile, createImportedProgram, planFilename } from './programs/program-json.js';
import { isOpenGymPlan, parseOpenGymPlan, createOpenGymProgram } from './programs/opengym-plan.js';
import { saveTextExport, exportResultMessage } from './portability/export-service.js';
import { openActionMenu, closeActionMenu, isActionMenuOpen } from './ui/action-menu.js';
import { openCompareModal, closeCompareModal, pickCompareB, renderComparePicker, handleCompareSearch } from './programs/compare-ui.js';
import { getCatalogEntry } from './programs/catalog.js';
import { activateProgramWithConfirm, resumeActivationWithConfirm } from './programs/activation.js';
import { priorActivationSummaries, resumeActivation } from './state/activation-identity.js';
import { escapeHtml, programProgressPct, safeCssColor } from './util.js';
import { getWeekModifier } from './schema.js';
import { resolveProgramPhase } from './programs/phase.js';

import {
  appState, activeTab, selectedDay, DEFAULT_DAYS,
  setActiveTab, setSelectedDay, setAppState,
  getProgramById, getActiveProgramIssue, createCustomProgram, duplicateCustomProgram, deleteCustomProgram,
  isCustomProgram, findPrimaryCustomization, adoptLegacyPrimaryCustomization, ensureActiveProgramEditable,
  determineDefaultCalendarDay,
  verifyWeekStorageSchema,
  reseedActiveProgramIntoWeek,
  startProgramActivation,
  saveStateToLocalStorage,
  scheduleLocalSave,
  pullEngineDataFromStorage,
  triggerCSVExport,
  triggerBodyweightCSVExport,
  triggerMeasurementsCSVExport,
  showToast,
  savePersonalRating,
  getPersonalRating,
  dismissDeloadSuggestion,
  applyDeloadToCurrentWeek,
} from './state.js';
import { confirmModal, multilineTextPromptModal, textPromptModal } from './ui/confirm-modal.js';
import { paintIcons, icon as svgIcon } from './ui/icons.js';
import { closeManagedModal, initModalStack, openManagedModal, requestCloseTopModal } from './ui/modal-stack.js';
import { initSentry } from './monitoring/sentry.js';
import { applyModuleVisibility } from './modules.js';
import { SENTRY_DSN, SENTRY_RELEASE } from './monitoring/sentry-config.js';

import { initEngine, shouldSuggestDeload, paceSecondsPerKm } from './engine.js';
import { initHome, renderHome, openFastingDetail, answerCoachOnHome } from './home.js';
import { computeDashboardModel } from './home/dashboard-model.js';
import { buildTrainLanding } from './train/train-landing.js';
import { renderTrainLanding } from './train/view-train-landing.js';
import { initAnalytics, renderAnalytics, saveThresholdPace, saveBodyweightGoal, setBodyweightRangeAction, setAnalyticsContext, shareScoreCard } from './analytics.js';
import { initBodyweightSheet, openBodyweightSheet, closeBodyweightSheet, stepBodyweight, saveBodyweightSheet, deleteBodyweightEntry } from './bodyweight-sheet.js';
import {
  initMeasurementsSheet, openMeasurementsSheet, closeMeasurementsSheet, saveMeasurementsSheet,
  deleteMeasurementEntry, setMeasurementUnit,
} from './measurements-sheet.js';
import { initSessionRecap, openSessionRecap, closeSessionRecap, isSessionRecapOpen, sharePRFromRecap, shareWorkoutFromRecap } from './session-recap.js';
import { initDragDrop } from './dragdrop.js';
import {
  initWorkout, renderWorkout, scrollCockpitToActiveExercise,
  updateInputState, commitWorkoutUIState, toggleGymCheckLoggingState,
  appendCustomSetRow, removeCustomSetRow,
  toggleAccordionManual,
  openAddExerciseModal, closeAddExerciseModal, confirmAddExercise,
  openConfirmResetModal, closeConfirmResetModal, executeResetActiveDayMetrics,
  openFinishSessionModal, closeFinishSessionModal,
  handleExerciseSearch, addExerciseToDayFromLibrary,
  activeWorkoutSwitchStatus, resolveWorkoutBeforeProgramSwitch,
  activeWorkoutTimerKey,
} from './workout.js';

import { startWorkoutTimer, dismissRestTimer, toggleRestPause, checkActiveTimerOnLoad, restoreRestTimer } from './timers.js';
import { saveMapToDB } from './db.js';
import { initGarminRunImport, initGarminGymImport } from './garmin.js';
import { initRunLogger, openRunLogger, closeRunLogger, saveManualRun } from './run-logger.js';
import { initOnboarding, shouldShowOnboarding, startOnboarding, handleOnboardingAction } from './onboarding.js';
import {
  initSettings, openSettings, closeSettings,
  saveName, saveBodyWeight, setWeightUnit,
  setProgressionIncrement, setPreviousValuesScope, setDistanceUnit, setTheme, setPalette, stepCurrentWeek, setAutoAdvanceWeek,
  exportData, triggerImport, handleImportFile, restoreImportBackup, confirmResetAllData,
  triggerExternalCsvImport, handleExternalCsvFile, triggerFitImport, handleFitFiles, toggleModule,
  selectEquipmentProfile, addEquipmentProfileFromUI, saveEquipmentProfileName,
  deleteActiveEquipmentProfile,
  applySettingsOnBoot,
  hcToggleConnect, hcSyncNow, saveStepGoal, hcToggleSyncField,
  setFitnessGoal, setWeightGoal, setFitnessLevel, setWeekStartDay, setFastingDefault,
  saveReminderTime, setNotifToggle, saveStreakAlertTime, toggleEquipment, saveBandWeights,
  savePlateSetup, savePlateCounts, resetPlateSetup, setShowPlateHints, setAutoWarmupRamp,
  saveDumbbells, saveMachineStack, removeMachineStack,
  saveRestPeriods, applyRestPreset, setRestTimerEnabledSetting, setRestAlertSoundSetting,
  setRestAlertVolumeSetting, resetRestOverrides,
  openAvatarPicker, handleAvatarFile,
  selectAutomaticBackupFolder, backupNow, turnOffAutomaticBackup,
} from './settings.js';
import { initAthleteProfile, renderAthleteProfile, handleProfileAction } from './athlete-profile.js';
import { initActivities, openActivities, closeActivities, isActivitiesOpen, handleActivityAction } from './activities.js';
import { initCustomizeSheet } from './ui/customize-sheet.js';
import { initGpsTracker, startTracking, pauseTracking, resumeTracking, stopTracking, cancelTracking, onWorkoutTabActivated } from './gps-tracker.js';
import { renderRunMap } from './workout-map.js';
import { orderedLiftNames } from './workout-order.js';
import { isCompletedSet } from './set-utils.js';
import { strengthDayStats } from './analytics/weekly-aggregate.js';
import { dateKey, todayKey, todayProgramDay, startOfProgramWeek, localDayKey, daysBetween, addDaysISO } from './dates.js';
import { resolveDateToSlot, resolveSlotDate } from './analytics/logged-days.js';
import { newRunSessionId, runDaySummary, upsertRunSession, findImportedRunSession } from './state/run-sessions.js';
import { FASTING_ACTIONS, handleFastingClickAction } from './fasting/fasting-actions.js';
import { initNotifications, requestNotificationPermission, cancelReminders, checkMissedWorkout } from './notifications.js';
import { buildProgramSessionChoices } from './workout/program-session-picker.js';
import { buildActivityHistory } from './activities/model.js';
import {
  clearActiveOneOffSession, createOneOffStrengthSession, activeOneOffSession,
} from './workout/one-off-session.js';
import { markSessionInProgress } from './workout/session-status.js';
import { initAutomaticBackups, checkDailyAutomaticBackup } from './portability/auto-backup.js';
import { buildRoutineFromSession, routineSourceWeek } from './routines/model.js';
import {
  createFolder, deleteFolder, ensureRoutines, findFolder, findRoutine, hasRoutineCapacity,
  MAX_ROUTINE_NOTE, MAX_ROUTINES, moveFolder, moveRoutineToFolder, orderedFolders, removeRoutine,
  renameFolder, restoreFolder, updateRoutineNote,
} from './routines/store.js';
import { showUndo } from './ui/undo-bar.js';

document.addEventListener('app:modules-changed', () => {
  try { hydrateCurrentView(); } catch (err) { console.warn('Module view refresh failed.', err); }
});

document.addEventListener('app:equipment-changed', () => {
  try { hydrateCurrentView(); } catch (err) { console.warn('Equipment view refresh failed.', err); }
});

document.addEventListener('app:storage-loaded', () => {
  try {
    hydrateCurrentView();
  } catch (err) {
    console.warn('UI Hydration pending full app initialization.', err);
  }
});

document.addEventListener('onboarding:finished', () => {
  // Land on Home immediately so the Morning Briefing renders now and consumes
  // the _justOnboarded flag here — otherwise the welcome celebration fires
  // lazily on whatever Home render happens next (e.g. after the first workout),
  // stacking confetti over the session recap.
  try { switchGlobalAppTab('home'); } catch (err) { console.warn('Post-onboarding home landing failed.', err); }
});

document.addEventListener('app:library-updated', () => {
  try {
    updateLibraryState(appState);
    renderLibrary();
  } catch (err) {
    console.warn('Library render failed after builder closed.', err);
  }
});

document.addEventListener('app:navigate', (e) => {
  const target = e.detail?.target;
  if (!target) { devWarn('app:navigate fired with no detail.target — ignoring.', e.detail); return; }
  if (target === 'custom:today-summary') openTodaySummaryModal();
  else if (target === 'custom:fasting') openFastingDetail();
  else if (target === 'custom:settings') openSettings();
  else openAnalyticsView(target);
});

document.addEventListener('app:open-metric', (e) => {
  const metricId = e.detail?.metricId;
  if (!metricId) return;
  openAnalyticsView('running-metric', null, { entity: metricId });
});

let _activePlanDisplayWeek = null;

export function openAnalyticsView(context, scrollToId, contextOptions = {}) {
  setAnalyticsContext(context, {
    ...contextOptions,
    origin: contextOptions.origin || (contextOptions.parentContext ? undefined : (activeTab === 'home' ? 'home' : 'insights')),
  });
  switchGlobalAppTab('analytics');
  // Optional deep-link to a sub-section (e.g. the rest-day mission → the wellness
  // check-in form, which otherwise sits several screens below the recovery hero).
  if (scrollToId) {
    setTimeout(() => {
      try { document.getElementById(scrollToId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    }, 60);
  }
}

function syncPrimaryNavigation(targetViewID) {
  document.querySelectorAll('.nav-item[data-target]').forEach((item) => {
    const isActive = item.getAttribute('data-target') === targetViewID;
    item.classList.toggle('active', isActive);
    if (isActive) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

export function switchGlobalAppTab(targetViewID, options = {}) {
  if (activeTab === 'workout' && !options.skipWorkoutCommit) {
    try { commitWorkoutUIState(); } catch(e) { console.warn(e); }
  }
  
  document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
  
  setActiveTab(targetViewID);
  
  const targetPanel = document.getElementById('view-' + targetViewID);
  if (targetPanel) targetPanel.classList.add('active');
  
  syncPrimaryNavigation(targetViewID);
  
  hydrateCurrentView();
  window.scrollTo(0, 0);
}

// Quick-start bottom sheet. The visible entry point lives in Train so planned
// and unplanned training no longer compete as separate global destinations.
function toggleQuickStart(show) {
  const sheet = document.getElementById('quickStartSheet');
  const back  = document.getElementById('quickStartBackdrop');
  if (sheet) sheet.classList.toggle('active', show);
  if (back)  back.classList.toggle('active', show);
}

export function setCockpitActiveDay(dayKey) {
  // Only commit live cockpit inputs when the cockpit is actually on screen.
  // Opening a session from the Train landing used to commit the hidden
  // cockpit's blank scaffolding, which marked the day in_progress before the
  // athlete had even started it.
  const cockpit = document.getElementById('trainCockpit');
  const cockpitVisible = !!cockpit && !cockpit.hidden;
  if (activeTab === 'workout' && cockpitVisible) {
    try { commitWorkoutUIState(); } catch(e) { console.warn(e); }
  }
  setSelectedDay(dayKey);
  document.querySelectorAll('#cockpitDaySelectorBar .day-pill').forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-day') === dayKey);
  });
  if (activeTab === 'workout') safeRenderExecution(renderWorkout, "Workout View Render");
}

// Which face of Train is showing. The landing is the default entry; the
// cockpit opens on an explicit action (or when a caller launches straight into
// logging, e.g. Home's "Start workout"). Reset to the landing whenever Train is
// entered from the nav, so the tab always answers "what am I doing today?"
// before it answers "log this set".
let _trainFace = 'landing';

export function setTrainFace(face) {
  _trainFace = face === 'cockpit' ? 'cockpit' : 'landing';
  applyTrainFace();
}

export function getTrainFace() { return _trainFace; }

function applyTrainFace() {
  const landing = document.getElementById('trainLanding');
  const cockpit = document.getElementById('trainCockpit');
  if (!landing || !cockpit) return;
  const showCockpit = _trainFace === 'cockpit';
  cockpit.hidden = !showCockpit;
  landing.hidden = showCockpit;
}

function renderTrainLandingView() {
  const container = document.getElementById('trainLanding');
  if (!container) return;
  const program = getProgramById(appState.activeProgramId);
  const dayKey = _todayProgramDay();
  const model = computeDashboardModel(appState, DEFAULT_DAYS, program, dayKey);
  renderTrainLanding(container, buildTrainLanding({ state: appState, program, model }));
  paintIcons(container);
}

export function launchActiveWorkoutCockpit() {
  switchGlobalAppTab('workout');
  setTrainFace('cockpit');
  setCockpitActiveDay(selectedDay);
}

/**
 * The ONE tap that turns "a workout is open" into "a session is running".
 *
 * The cockpit's own Start button and every programmatic start (a routine) must
 * run this same sequence: start the session clock for the active session key,
 * redraw so the Start CTA is replaced by the sticky active header, and bring the
 * first exercise into view. `startWorkoutTimer` alone is not enough — the very
 * next workspace render re-evaluates the CTA, so the clock key has to be bound
 * before that render happens.
 */
export function beginActiveWorkoutSession() {
  startWorkoutTimer(activeWorkoutTimerKey());
  try { renderWorkout(); } catch (err) { console.warn(err); }
  try { scrollCockpitToActiveExercise(); } catch (_) { /* best-effort */ }
}

// Was a local, timezone-naive copy of the same lookup; `todayProgramDay`
// (js/dates.js) resolves the calendar day first, which is what the rest of the
// app does.
const _todayProgramDay = () => todayProgramDay();

export function openProgramWorkoutPicker() {
  const sheet = document.getElementById('programWorkoutPicker');
  const backdrop = document.getElementById('programWorkoutPickerBackdrop');
  const list = document.getElementById('programWorkoutPickerList');
  const program = getProgramById(appState.activeProgramId);
  if (!sheet || !list || !program) return;
  const title = document.getElementById('programWorkoutPickerTitle');
  if (title) title.textContent = 'Choose a workout';
  const choices = buildProgramSessionChoices(appState, program, _todayProgramDay());
  list.innerHTML = `<div class="program-workout-picker__quick">
    <button class="program-workout-choice" data-action="start-empty-workout">
      <span class="program-workout-choice__day" aria-hidden="true">＋</span>
      <span class="program-workout-choice__main"><strong>Empty workout</strong><span>Build a one-off strength session</span></span>
      <span class="program-workout-choice__chev" aria-hidden="true">›</span>
    </button>
    <button class="program-workout-choice" data-action="show-copy-workouts">
      <span class="program-workout-choice__day" aria-hidden="true">⧉</span>
      <span class="program-workout-choice__main"><strong>Copy past workout</strong><span>Reuse exercises, weights and reps</span></span>
      <span class="program-workout-choice__chev" aria-hidden="true">›</span>
    </button>
  </div><div class="program-workout-picker__section-label">Programmed this week</div>` + choices.map((choice) => {
    const status = choice.status === 'complete'
      ? `Completed${choice.moved ? ` ${escapeHtml(choice.performedLabel)}` : ''}`
      : choice.status === 'partial' ? 'In progress'
      : choice.isToday ? "Today's plan" : 'Planned this week';
    return `<button class="program-workout-choice${choice.isToday ? ' program-workout-choice--today' : ''}" data-action="select-program-workout" data-day="${choice.day}">
      <span class="program-workout-choice__day">${escapeHtml(choice.dayLabel)}</span>
      <span class="program-workout-choice__main">
        <strong>${escapeHtml(choice.title)}</strong>
        <span>${escapeHtml(choice.sessionLabel)} · ${escapeHtml(status)}</span>
      </span>
      <span class="program-workout-choice__chev" aria-hidden="true">›</span>
    </button>`;
  }).join('') || '<p class="program-workout-picker-empty">No programmed sessions are available this week.</p>';
  sheet.classList.add('active');
  backdrop?.classList.add('active');
  openManagedModal(sheet, { initialFocus: '.program-workout-choice' });
}

export function closeProgramWorkoutPicker() {
  const sheet = document.getElementById('programWorkoutPicker');
  document.getElementById('programWorkoutPickerBackdrop')?.classList.remove('active');
  sheet?.classList.remove('active');
  closeManagedModal(sheet);
}

export function selectProgramWorkout(day) {
  if (!day) return;
  clearActiveOneOffSession(appState);
  saveStateToLocalStorage(true);
  closeProgramWorkoutPicker();
  setCockpitActiveDay(day);
  launchActiveWorkoutCockpit();
}

export function startEmptyWorkout() {
  const session = createOneOffStrengthSession(appState);
  setSelectedDay(session.day);
  saveStateToLocalStorage(true);
  closeProgramWorkoutPicker();
  launchActiveWorkoutCockpit();
}

export function showCopyWorkouts() {
  const list = document.getElementById('programWorkoutPickerList');
  const title = document.getElementById('programWorkoutPickerTitle');
  if (!list) return;
  const rows = buildActivityHistory(appState).filter((row) => row.kind === 'strength').slice(0, 20);
  if (title) title.textContent = 'Copy past workout';
  list.innerHTML = `<button class="program-workout-picker__back" data-action="show-program-workouts">← Choose workout</button>
    ${rows.length ? rows.map((row) => `<button class="program-workout-choice" data-action="copy-past-workout" data-activity-id="${escapeHtml(row.id)}">
      <span class="program-workout-choice__day">${escapeHtml(row.localDate ? new Date(`${row.localDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Past')}</span>
      <span class="program-workout-choice__main"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.subtitle || row.dateLabel)} · ${row.workingSets || 0} sets</span></span>
      <span class="program-workout-choice__chev" aria-hidden="true">›</span>
    </button>`).join('') : '<p class="program-workout-picker-empty">Complete a strength workout first, then it can be copied here.</p>'}`;
}

export function copyPastWorkout(activityId) {
  // The copy can be launched from History's detail view or the workout picker;
  // History must be fully dismissed either way or it covers the cockpit.
  if (isActivitiesOpen()) closeActivities({ force: true });
  const row = buildActivityHistory(appState).find((item) => item.kind === 'strength' && item.id === activityId);
  const sourceWeek = row && appState.weeks?.[row.week];
  if (!row || !sourceWeek) { showToast('That workout could not be found', true); return; }
  const sourceTitle = row.title === 'Strength Workout' ? row.subtitle || 'Workout' : row.title;
  const session = createOneOffStrengthSession(appState, {
    kind: 'copy', title: `Copy of ${sourceTitle}`, sourceWeek, sourceDay: row.day,
    sourceActivityId: row.id,
  });
  setSelectedDay(session.day);
  saveStateToLocalStorage(true);
  closeProgramWorkoutPicker();
  launchActiveWorkoutCockpit();
}

// Save a finished strength session as a reusable ROUTINE. A routine is a session
// template, not a programme: it is appended to its own root array (never
// customPrograms), writes no week slot, and leaves the active programme and all
// logged history exactly where they are. History stays open behind the prompt.
export async function saveActivityAsRoutine(activityId) {
  const menu = document.getElementById('activityActionMenu');
  if (menu) menu.hidden = true;
  document.querySelector('[data-action="toggle-activity-menu"]')?.setAttribute('aria-expanded', 'false');

  if (!hasRoutineCapacity(appState)) {
    showToast(`Your routine library is full (${MAX_ROUTINES}). Delete a routine to save another.`, true);
    return;
  }

  const row = buildActivityHistory(appState).find((item) => item.kind === 'strength' && item.id === activityId);
  const sourceWeek = row && appState.weeks?.[row.week];
  if (!row || !sourceWeek) { showToast('That workout could not be found', true); return; }

  // Suggest the program day's real name ("Push A") rather than the generic
  // "Strength Workout" fallback, then let the athlete name it.
  const programTitle = getProgramById(sourceWeek.programId || null)?.days?.[row.day]?.title;
  const suggested = row.title !== 'Strength Workout'
    ? row.title
    : (programTitle && programTitle !== 'Rest' ? programTitle : 'My routine');
  const name = await textPromptModal({
    title: 'Save as routine',
    message: 'Keeps this session’s exercises, sets, loads and rest. It is saved to your routine library; your program and logged history stay unchanged.',
    label: 'Routine name',
    value: suggested,
    maxLength: 60,
    confirmLabel: 'Save routine',
  });
  if (name == null) return;
  if (!name) { showToast('A routine needs a name', true); return; }

  const routine = buildRoutineFromSession(appState, sourceWeek, row.day, {
    name, activityId: row.id,
  });
  if (!routine) { showToast('This workout has no completed working sets to save', true); return; }

  ensureRoutines(appState);
  appState.routines.push(routine);
  const saved = await saveStateToLocalStorage(true);
  if (!saved) {
    // Never claim a save that did not reach the device: drop it from memory too,
    // so no later render can show a routine a reload would not have.
    removeRoutine(appState, routine.id);
    showToast('The routine could not be saved', true);
    return;
  }
  showToast(`“${routine.name}” saved to your routine library`);
  showUndo('Routine saved', async () => {
    const removed = removeRoutine(appState, routine.id);
    const undone = await saveStateToLocalStorage(true);
    if (removed && !undone) {
      // The device still holds it; put it back so memory and disk agree.
      appState.routines.push(removed);
      showToast('The routine could not be removed', true);
      return;
    }
    showToast('Routine removed');
  }, () => {});
}

// ── Routine library actions ──────────────────────────────────────────────────
//
// A routine is a SESSION template. Starting one copies its source week into an
// ordinary one-off session and opens the cockpit; it never activates a program,
// never reseeds a week and never touches activeProgramId/currentWeek.

export async function startRoutine(routineId) {
  const routine = findRoutine(appState, routineId);
  if (!routine) { showToast('That routine could not be found', true); return; }
  // One live workout owns the session clock and its one-off week. Starting a
  // routine here would bind the timer to a new key and leave the old session
  // orphaned, so refuse and offer the session that is already open. Never
  // auto-discard — only an explicit Finish/Discard in that session may end it.
  const activeOneOff = activeOneOffSession(appState);
  if (activeOneOff || activeWorkoutSwitchStatus()?.unresolved) {
    const resume = await confirmModal({
      title: 'A workout is already open',
      message: 'Finish or discard it before starting a routine. Your current session has not been changed.',
      confirmLabel: 'Resume workout',
      cancelLabel: 'Not now',
    });
    if (resume) launchActiveWorkoutCockpit();
    return;
  }
  const { sourceWeek, sourceDay } = routineSourceWeek(routine);
  const lifts = sourceDay ? sourceWeek.lifts?.[sourceDay] || {} : {};
  if (!sourceDay || !Object.keys(lifts).length) {
    showToast('This routine has no exercises to start', true);
    return;
  }
  const session = createOneOffStrengthSession(appState, {
    kind: 'copy', title: routine.name, sourceWeek, sourceDay,
    sourceRoutineId: routine.id,
  });
  setSelectedDay(session.day);
  // Start means START: the copied session is opened in progress, with the same
  // one-tap sequence the cockpit's Start button uses, so the athlete never lands
  // on a second "Start Workout" gate. The programme and its weeks are untouched;
  // the only new week key is this one-off session.
  markSessionInProgress(session.week, session.day);
  saveStateToLocalStorage(true);
  launchActiveWorkoutCockpit();
  beginActiveWorkoutSession();
}

export async function renameRoutine(routineId) {
  const routine = findRoutine(appState, routineId);
  if (!routine) { showToast('That routine could not be found', true); return; }
  const previousName = String(routine.name || '');
  const name = await textPromptModal({
    title: 'Rename routine',
    message: 'The saved exercises, sets and loads stay exactly as they are.',
    label: 'Routine name',
    value: previousName,
    maxLength: 60,
    confirmLabel: 'Save name',
  });
  if (name == null) return;
  if (!name) { showToast('A routine needs a name', true); return; }
  if (name === previousName) return;

  const dayKeys = routine.days && typeof routine.days === 'object' ? Object.keys(routine.days) : [];
  const previousTitles = dayKeys.map((day) => routine.days[day]?.title);
  const previousUpdatedAt = routine.updatedAt;
  routine.name = name;
  routine.updatedAt = new Date().toISOString();
  // The day title was seeded from the routine name; keep the two in step only
  // where it still matched, so a deliberately different day title survives.
  dayKeys.forEach((day) => {
    if (routine.days[day]?.title === previousName) routine.days[day].title = name;
  });

  const saved = await saveStateToLocalStorage(true);
  if (!saved) {
    routine.name = previousName;
    routine.updatedAt = previousUpdatedAt;
    dayKeys.forEach((day, index) => { routine.days[day].title = previousTitles[index]; });
    showToast('The routine could not be renamed', true);
    return;
  }
  renderLibrary();
  showToast('Routine renamed');
}

/**
 * Edit the routine's private note. The note is preparation context: it is
 * shown above the exercises when this routine is started, read by reference
 * from the library, and never copied into logged history.
 */
export async function editRoutineNote(routineId) {
  const routine = findRoutine(appState, routineId);
  if (!routine) { showToast('That routine could not be found', true); return; }
  const previousNote = String(routine.note || '');
  const previousUpdatedAt = routine.updatedAt;
  const note = await multilineTextPromptModal({
    title: 'Routine note',
    message: 'Shown above the exercises when you start this routine. It stays in the routine and is never copied into logged history.',
    label: 'Routine note',
    placeholder: 'Setup, focus, a reminder for next time…',
    value: previousNote,
    maxLength: MAX_ROUTINE_NOTE,
    confirmLabel: 'Save note',
  });
  if (note == null) return;
  if (note === previousNote) return;

  if (!updateRoutineNote(appState, routineId, note)) {
    showToast('The routine note could not be saved', true);
    return;
  }
  const saved = await saveStateToLocalStorage(true);
  if (!saved) {
    // Rollback, exactly like a rename: never claim a save the device rejected.
    if (previousNote) routine.note = previousNote;
    else delete routine.note;
    routine.updatedAt = previousUpdatedAt;
    showToast('The routine note could not be saved', true);
    return;
  }
  renderLibrary();
  showToast(note ? 'Routine note saved' : 'Routine note cleared');
}

export async function deleteRoutine(routineId) {
  const routine = findRoutine(appState, routineId);
  if (!routine) { showToast('That routine could not be found', true); return; }
  const confirmed = await confirmModal({
    title: `Delete “${routine.name}”?`,
    message: 'The routine leaves your library. Logged training, your program and this week stay untouched.',
    confirmLabel: 'Delete routine',
    danger: true,
  });
  if (!confirmed) return;

  const index = appState.routines.findIndex((entry) => entry?.id === routineId);
  const removed = removeRoutine(appState, routineId);
  if (!removed) { renderLibrary(); return; }
  const saved = await saveStateToLocalStorage(true);
  if (!saved) {
    appState.routines.splice(Math.max(0, index), 0, removed);
    showToast('The routine could not be deleted', true);
    return;
  }
  renderLibrary();
  showUndo('Routine deleted', async () => {
    appState.routines.splice(Math.min(Math.max(0, index), appState.routines.length), 0, removed);
    const restored = await saveStateToLocalStorage(true);
    renderLibrary();
    showToast(restored ? 'Routine restored' : 'The routine could not be restored', !restored);
  }, () => {});
}

// ── Routine folders ──────────────────────────────────────────────────────────
//
// Folders are organisation only. Deleting one moves its routines to Unfiled and
// never deletes a routine; no folder action reads or writes state.weeks.

let _routineFolderRoutineId = null;

export async function createRoutineFolder() {
  const name = await textPromptModal({
    title: 'New folder',
    message: 'Folders organise routines. Deleting a folder moves its routines to Unfiled — it never deletes them.',
    label: 'Folder name',
    placeholder: 'Travel, Home, …',
    maxLength: 40,
    confirmLabel: 'Create folder',
  });
  if (name == null) return;
  if (!name) { showToast('A folder needs a name', true); return; }
  const folder = createFolder(appState, name);
  if (!folder) { showToast('The folder could not be created', true); return; }
  const saved = await saveStateToLocalStorage(true);
  if (!saved) {
    appState.libraryFolders = appState.libraryFolders.filter((entry) => entry?.id !== folder.id);
    showToast('The folder could not be saved', true);
    return;
  }
  renderLibrary();
  showToast(`Folder “${folder.name}” created`);
}

export async function renameRoutineFolder(folderId) {
  const folder = findFolder(appState, folderId);
  if (!folder) { showToast('That folder could not be found', true); return; }
  const previousName = String(folder.name || '');
  const name = await textPromptModal({
    title: 'Rename folder',
    label: 'Folder name',
    value: previousName,
    maxLength: 40,
    confirmLabel: 'Save name',
  });
  if (name == null) return;
  if (!name) { showToast('A folder needs a name', true); return; }
  if (name === previousName) return;
  if (!renameFolder(appState, folderId, name)) {
    showToast('That folder could not be renamed', true);
    return;
  }
  const saved = await saveStateToLocalStorage(true);
  if (!saved) {
    folder.name = previousName;
    showToast('The folder could not be renamed', true);
    return;
  }
  renderLibrary();
  showToast('Folder renamed');
}

export async function deleteRoutineFolder(folderId) {
  const folder = findFolder(appState, folderId);
  if (!folder) { showToast('That folder could not be found', true); return; }
  const count = (appState.routines || []).filter((routine) => routine?.folderId === folderId).length;
  const confirmed = await confirmModal({
    title: `Delete “${folder.name}”?`,
    message: count
      ? `${count} routine${count === 1 ? '' : 's'} will move to Unfiled and stay in your library. Logged training is untouched.`
      : 'The empty folder is removed. Logged training is untouched.',
    confirmLabel: 'Delete folder',
    danger: true,
  });
  if (!confirmed) return;

  const snapshot = deleteFolder(appState, folderId);
  if (!snapshot) return;
  const saved = await saveStateToLocalStorage(true);
  if (!saved) {
    restoreFolder(appState, snapshot);
    showToast('The folder could not be deleted', true);
    return;
  }
  renderLibrary();
  showUndo('Folder deleted', async () => {
    restoreFolder(appState, snapshot);
    const restored = await saveStateToLocalStorage(true);
    renderLibrary();
    showToast(restored ? 'Folder restored' : 'The folder could not be restored', !restored);
  }, () => {});
}

export async function moveRoutineFolder(folderId, direction) {
  if (!moveFolder(appState, folderId, direction)) return;
  const saved = await saveStateToLocalStorage(true);
  if (!saved) {
    moveFolder(appState, folderId, Number(direction) === -1 ? 1 : -1);
    showToast('The folder order could not be saved', true);
    return;
  }
  renderLibrary();
}

function renderRoutineFolderChoices(routine) {
  const list = document.getElementById('routineFolderList');
  if (!list) return;
  const folders = orderedFolders(appState);
  // The library files an unknown folderId under Unfiled, so the sheet must use
  // the same valid-id set for both the current marker and the counts.
  const validIds = new Set(folders.map((folder) => folder.id));
  const bucketOf = (entry) => (entry?.folderId && validIds.has(entry.folderId) ? entry.folderId : null);
  const current = bucketOf(routine);
  const countIn = (folderId) => (appState.routines || [])
    .filter((entry) => bucketOf(entry) === folderId).length;
  const choices = [{ id: null, name: 'Unfiled' }, ...folders];
  // Folder names are athlete input; escape every one before it reaches HTML.
  list.innerHTML = choices.map((folder) => {
    const id = folder.id == null ? null : folder.id;
    const isCurrent = current === id;
    const count = countIn(id);
    return `<button type="button" class="program-workout-choice routine-folder-choice${isCurrent ? ' is-current' : ''}"
        data-action="choose-routine-folder" data-folder-id="${escapeHtml(id == null ? '' : String(id))}"
        aria-pressed="${isCurrent}">
      <span class="program-workout-choice__day" aria-hidden="true">${id == null ? '—' : '📁'}</span>
      <span class="program-workout-choice__main">
        <strong>${escapeHtml(String(folder.name || ''))}</strong>
        <span>${count} routine${count === 1 ? '' : 's'}</span>
      </span>
      <span class="program-workout-choice__chev" aria-hidden="true">${isCurrent ? '✓' : '›'}</span>
    </button>`;
  }).join('');
}

export function openRoutineFolderSheet(routineId) {
  const routine = findRoutine(appState, routineId);
  if (!routine) { showToast('That routine could not be found', true); return; }
  const sheet = document.getElementById('routineFolderSheet');
  const backdrop = document.getElementById('routineFolderBackdrop');
  if (!sheet || !backdrop) return;
  _routineFolderRoutineId = routineId;
  renderRoutineFolderChoices(routine);
  sheet.classList.add('active');
  backdrop.classList.add('active');
  openManagedModal(sheet, { initialFocus: '.routine-folder-choice' });
}

export function closeRoutineFolderSheet() {
  const sheet = document.getElementById('routineFolderSheet');
  const backdrop = document.getElementById('routineFolderBackdrop');
  sheet?.classList.remove('active');
  backdrop?.classList.remove('active');
  if (sheet) closeManagedModal(sheet);
  _routineFolderRoutineId = null;
}

export async function chooseRoutineFolder(folderId) {
  const routineId = _routineFolderRoutineId;
  const routine = findRoutine(appState, routineId);
  if (!routine) { closeRoutineFolderSheet(); return; }
  const targetId = folderId || null;
  const previousId = routine.folderId || null;
  if (targetId === previousId) { closeRoutineFolderSheet(); return; }
  if (!moveRoutineToFolder(appState, routineId, targetId)) {
    closeRoutineFolderSheet();
    showToast('That folder could not be found', true);
    return;
  }
  const saved = await saveStateToLocalStorage(true);
  if (!saved) {
    moveRoutineToFolder(appState, routineId, previousId);
    closeRoutineFolderSheet();
    showToast('The routine could not be moved', true);
    return;
  }
  closeRoutineFolderSheet();
  renderLibrary();
  const folder = targetId ? findFolder(appState, targetId) : null;
  showToast(folder ? `Moved to “${folder.name}”` : 'Moved to Unfiled');
}

// Quick Start (from Home): begin a GPS walk/run untethered from the program on
// a clean, dedicated full-screen Activity tracker. Logs to TODAY's slot
// regardless of what today's plan prescribes, tagged walk/run. On finish the
// tracker persists the run and opens the session recap.
export function openActivityScreen(type) {
  const screen = document.getElementById('activityScreen');
  const title  = document.getElementById('activityTitle');
  if (title) title.textContent = type === 'walk' ? 'Walk' : 'Run';
  if (screen) { screen.style.display = 'flex'; screen.scrollTop = 0; }
}

export function closeActivityScreen() {
  const screen = document.getElementById('activityScreen');
  if (screen) screen.style.display = 'none';
}

export function isActivityScreenOpen() {
  const screen = document.getElementById('activityScreen');
  return !!screen && screen.style.display !== 'none';
}

// Remembered so the Activity screen's "Try again" retries the SAME activity —
// a walk must not come back as a run.
let _lastQuickActivityType = 'run';

export function startQuickActivity(type) {
  const kind = type === 'walk' ? 'walk' : 'run';
  _lastQuickActivityType = kind;
  const localDate = todayKey();
  const slot = resolveDateToSlot(appState, localDate);
  if (slot) {
    verifyWeekStorageSchema(String(slot.weekNum));
    setSelectedDay(slot.day);
  } else {
    determineDefaultCalendarDay();
  }
  openActivityScreen(kind);
  // The result is not ignored any more: a refused start (permission off, no GPS
  // in this browser, Android protecting a recovered run) used to leave this
  // full-screen view holding nothing but "← Cancel". The tracker renders the
  // reason into #qsNotice, which is why this screen stays open to show it.
  return startTracking(kind, /* quickStart */ true, {
    week: slot ? String(slot.weekNum) : appState.currentWeek,
    day: slot?.day || selectedDay,
    localDate,
  });
}

/** Retry from the Activity screen's blocked-start notice. */
export function retryQuickActivity() {
  return startQuickActivity(_lastQuickActivityType);
}

// Cancel a Quick Start: discard the in-progress track (nothing is saved) and
// close the Activity screen.
export function cancelQuickActivity() {
  try { cancelTracking(); } catch (_) {}
  closeActivityScreen();
}

// ==========================================
// PROGRAM LIBRARY ROUTING
// ==========================================
export function switchProgramMode(mode) {
  const libraryScreen  = document.getElementById('programLibraryScreen');
  const detailScreen   = document.getElementById('programDetailScreen');
  const activePlanView = document.getElementById('progActivePlanView');
  const viewBuilder    = document.getElementById('builderViewContainer');

  if (mode === 'active') {
    if (libraryScreen)  libraryScreen.style.display  = 'none';
    if (detailScreen)   detailScreen.style.display   = 'none';
    if (viewBuilder)    viewBuilder.style.display    = 'none';
    showActivePlanView(true);
  } else if (mode === 'builder') {
    if (libraryScreen)  libraryScreen.style.display  = 'none';
    if (detailScreen)   detailScreen.style.display   = 'none';
    if (activePlanView) activePlanView.style.display = 'none';
    if (viewBuilder)    viewBuilder.style.display    = 'block';
  } else {
    if (viewBuilder)    viewBuilder.style.display    = 'none';
    if (activePlanView) activePlanView.style.display = 'none';
    if (detailScreen)   detailScreen.style.display   = 'none';
    if (libraryScreen)  libraryScreen.style.display  = 'block';
    updateLibraryState(appState);
    renderLibrary();
  }
}


// Activation is a deliberate step, never a silent one-tap swap: route through
// the confirmation sheet (states the program, its impact on the current
// program, that history is kept, any in-progress-workout warning, and the
// start week) and only switch on an explicit choice. Fire-and-forget for the
// action/event callers.
export function triggerMakeActiveProgram(newProgramId) {
  if (!newProgramId) return;
  activateProgramWithConfirm(appState, newProgramId, {
    resolveProgram: getProgramById,
    resolveName: (id) => getCatalogEntry(id)?.name || getProgramById(id)?.name,
    workoutStatus: activeWorkoutSwitchStatus,
    resolveWorkout: resolveWorkoutBeforeProgramSwitch,
    apply: applyProgramSwitch,
    onError: (msg) => showToast(msg, true),
  }).catch(err => console.warn('Activation failed:', err));
}

function applyProgramSwitch(newProgramId, startWeek = 1) {
  // Pause/archive the current activation while its actual current week is still
  // available; only then point state at the new run and chosen start week.
  startProgramActivation(newProgramId, startWeek);
  appState.activeProgramId = newProgramId;
  // A freshly-activated program begins at the chosen week (Week 1 by default),
  // not wherever the previous program happened to be.
  appState.currentWeek = String(Math.max(1, parseInt(String(startWeek), 10) || 1));
  appState.weekStartedAt = startOfProgramWeek();
  // Begin a NEW program activation (a distinct run, even when restarting the same
  // program) and archive every numeric week owned by the previous run: its logged
  // history is preserved in the archive (still counted by date-based analytics/PRs)
  // and its scaffolding is cleared, so no completed exercise from the old program
  // can leak into the new program's workout. The new run then seeds its start week
  // clean; future weeks materialise lazily under the new activation.
  reseedActiveProgramIntoWeek(appState.currentWeek);
  saveStateToLocalStorage(true);
  try { updateLibraryState(appState); renderLibrary(); } catch (_) {}
  hydrateCurrentView();
  showActivePlanView(true);
  showToast('Program activated ✓');
}

function applyResumedActivation(activationId) {
  const result = resumeActivation(appState, activationId);
  if (!result.ok) return false;
  // A previously empty week may have been intentionally dropped when paused;
  // materialise only the resumed current week while preserving restored logs.
  reseedActiveProgramIntoWeek(appState.currentWeek);
  saveStateToLocalStorage(true);
  try { updateLibraryState(appState); renderLibrary(); } catch (_) {}
  hydrateCurrentView();
  showActivePlanView(true);
  showToast('Previous program resumed ✓');
  return true;
}

function triggerResumeProgramActivation(activationId) {
  if (!activationId) return;
  resumeActivationWithConfirm(appState, activationId, {
    resolveProgram: getProgramById,
    resolveName: (id) => getCatalogEntry(id)?.name || getProgramById(id)?.name,
    workoutStatus: activeWorkoutSwitchStatus,
    resolveWorkout: resolveWorkoutBeforeProgramSwitch,
    apply: applyResumedActivation,
    onError: (message) => showToast(message, true),
  }).catch((error) => console.warn('Resume failed:', error));
}

export function handleMacroWeekSwitch() {
  const weekSelectElement = document.getElementById('globalWeekSelect');
  if (!weekSelectElement) return;
  
  appState.currentWeek = weekSelectElement.value;
  appState.weekStartedAt = startOfProgramWeek();
  appState.weekAdvanceSnoozedUntil = null; 
  saveStateToLocalStorage(true);
  
  verifyWeekStorageSchema(appState.currentWeek);
  hydrateCurrentView();
  showToast('Switched to Week ' + appState.currentWeek);
}

export function hydrateCurrentView() {
  const programIssue = getActiveProgramIssue(appState);
  if (programIssue) {
    // Route to the explicit recovery surface without changing the stored ID or
    // touching its weeks. Replacement only happens through normal activation.
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    setActiveTab('program');
    document.getElementById('view-program')?.classList.add('active');
    syncPrimaryNavigation('program');
    showActivePlanView(false);
    updateLibraryState(appState);
    renderLibrary();
    return;
  }
  verifyWeekStorageSchema(appState.currentWeek);

  if (activeTab === 'home') safeRenderExecution(renderHome, "Home Dashboard Render");
  else if (activeTab === 'workout') {
    // Both faces stay rendered so switching between them is instant and the
    // cockpit's own state machine is never torn down mid-session.
    safeRenderExecution(renderTrainLandingView, "Train Landing Render");
    safeRenderExecution(renderWorkout, "Workout Cockpit Render");
    applyTrainFace();
    onWorkoutTabActivated();
  }
  else if (activeTab === 'analytics') safeRenderExecution(renderAnalytics, "Performance Matrix Render");
  else if (activeTab === 'profile') safeRenderExecution(renderAthleteProfile, "Athlete Profile Render");
  else if (activeTab === 'program') {
    const wkSelect = document.getElementById('globalWeekSelect');
    if (wkSelect) wkSelect.value = appState.currentWeek;

    // If active plan view is visible, refresh it; otherwise render library
    const activePlanView = document.getElementById('progActivePlanView');
    if (activePlanView && activePlanView.style.display !== 'none') {
      switchBrowserSectionTab('overview');
    } else {
      updateLibraryState(appState);
      renderLibrary();
    }
  }
}

function safeRenderExecution(renderFn, viewLabel) {
  try {
    renderFn();
  } catch (err) {
    // Production: stay graceful (a render crash must never blank the app).
    // Dev (localStorage.hybrid_debug='1'): escalate to a loud console.error so
    // swallowed render failures are visible instead of hiding behind a warn.
    console.warn(`[Insulation Shield] Prevented load crash on ${viewLabel}:`, err);
    devWarn(`Render crash in ${viewLabel}`, err);
  }
}

export function switchBrowserSectionTab(tabName) {
  const overviewContainer = document.getElementById('programBrowserDetails');
  const tabOverview = document.getElementById('btnBrowserTabOverview');
  const tabWeeks = document.getElementById('btnBrowserTabWeeks');

  if (tabOverview) tabOverview.classList.remove('active');
  if (tabWeeks) tabWeeks.classList.remove('active');

  _renderActivePlanHero();
  _renderActivePlanWeekNav();
  _renderPreviousProgramRuns();

  const prog = getProgramById(appState.activeProgramId);
  const catalog = getCatalogEntry(appState.activeProgramId);

  if (!overviewContainer) return;

  if (tabName === 'weeks') {
    if (tabWeeks) tabWeeks.classList.add('active');
    overviewContainer.innerHTML = _renderScheduleTab(catalog, prog);
  } else {
    if (tabOverview) tabOverview.classList.add('active');
    overviewContainer.innerHTML = _renderThisWeekTab(catalog, prog);
  }
}

function _renderPreviousProgramRuns() {
  const container = document.getElementById('previousProgramRuns');
  if (!container) return;
  const previous = priorActivationSummaries(appState);
  if (!previous.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  container.style.display = '';
  container.innerHTML = `
    <div class="previous-program-runs__header">
      <div>
        <div class="previous-program-runs__eyebrow">PROGRAM HISTORY</div>
        <h3>Previous program runs</h3>
      </div>
      <span>${previous.length}</span>
    </div>
    <div class="previous-program-runs__list">
      ${previous.map((run) => {
        const program = getProgramById(run.programId);
        const name = program?.name || getCatalogEntry(run.programId)?.name || 'Previous program';
        const paused = run.pausedAt ? new Date(run.pausedAt) : null;
        const pausedLabel = paused && !Number.isNaN(paused.getTime())
          ? paused.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Date unavailable';
        return `<article class="previous-program-run-card">
          <div class="previous-program-run-card__copy">
            <strong>${escapeHtml(name)}</strong>
            <span>Paused at Week ${run.lastWeek} · ${run.loggedWeeks} logged week${run.loggedWeeks === 1 ? '' : 's'} · ${escapeHtml(pausedLabel)}</span>
          </div>
          <div class="previous-program-run-card__actions">
            <button class="btn-pad" data-action="view-activation-activities" data-activation-id="${escapeHtml(run.id)}">View activities</button>
            <button class="btn-pad btn-blue" data-action="resume-program-activation" data-activation-id="${escapeHtml(run.id)}"${program ? '' : ' disabled'}>${program ? 'Resume' : 'Unavailable'}</button>
          </div>
        </article>`;
      }).join('')}
    </div>`;
}

function _renderActivePlanHero() {
  const heroEl = document.getElementById('activePlanHero');
  if (!heroEl) return;

  const catalog = getCatalogEntry(appState.activeProgramId);
  const prog = getProgramById(appState.activeProgramId);
  const name = catalog?.name || prog?.name || 'Active Program';
  const icon = catalog?.icon || '📋';
  const g = [
    safeCssColor(catalog?.coverGradient?.[0], '#1a0e2e'),
    safeCssColor(catalog?.coverGradient?.[1], '#0d1b2a'),
  ];
  const accentColor = safeCssColor(catalog?.accentColor, '#8b5cf6');
  const displayWk = parseInt(_activePlanDisplayWeek || appState.currentWeek || '1', 10);
  const actualWk  = parseInt(appState.currentWeek || '1', 10);
  const totalWeeks = catalog?.durationWeeks || prog?.totalWeeks || 12;
  const progress = programProgressPct(actualWk, totalWeeks);
  const phaseName = resolveProgramPhase(catalog || prog, displayWk, appState).label;

  heroEl.innerHTML = `
    <div class="aplan-hero-inner" style="background: linear-gradient(135deg, ${g[0]}, ${g[1]})">
      <div class="aplan-hero-icon">${escapeHtml(icon)}</div>
      <div class="aplan-hero-content">
        <div class="aplan-hero-eyebrow">ACTIVE PROGRAM</div>
        <div class="aplan-hero-name">${escapeHtml(name)}</div>
        ${phaseName ? `<div class="aplan-hero-phase">${escapeHtml(phaseName)}</div>` : ''}
        <div class="aplan-hero-progress-row">
          <div class="aplan-hero-bar">
            <div class="aplan-hero-fill" style="width: ${progress}%; background: ${accentColor}"></div>
          </div>
          <span class="aplan-hero-pct">${progress}%</span>
        </div>
        <div class="aplan-hero-weeks">${actualWk} of ${totalWeeks} weeks</div>
      </div>
      <div class="aplan-hero-actions">
        <button class="aplan-icon-action" data-action="copy-program-text" data-program-id="${escapeHtml(appState.activeProgramId || '')}" aria-label="Copy program" title="Copy program">${svgIcon('clipboard', { size: 20 })}</button>
        <button class="aplan-rate-btn" data-action="rate-program" data-program-id="${escapeHtml(appState.activeProgramId || '')}" aria-label="Rate this program" title="Rate this program">★</button>
      </div>
    </div>
    <button class="aplan-edit-btn" data-action="edit-active-program">✏️ Edit program</button>
  `;
}

function _renderActivePlanWeekNav() {
  const numEl   = document.getElementById('aplanWeekNum');
  const phaseEl = document.getElementById('aplanPhaseName');
  const displayWk = _activePlanDisplayWeek || appState.currentWeek || '1';
  if (numEl) numEl.textContent = displayWk;
  const prog = getCatalogEntry(appState.activeProgramId) || getProgramById(appState.activeProgramId);
  if (phaseEl) phaseEl.textContent = resolveProgramPhase(prog, displayWk, appState).label;
}

function _renderThisWeekTab(catalog, prog) {
  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayShort = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  const jsDayToKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayKey = jsDayToKey[new Date().getDay()];
  const catalogDays = catalog?.days || {};
  const legacyDays = prog?.days || {};

  const cards = dayOrder.map(dayKey => {
    const cd = catalogDays[dayKey];
    const ld = legacyDays[dayKey];
    const isToday = dayKey === todayKey;
    const title = cd?.title || ld?.title || (dayKey === 'sun' ? 'Rest Day' : 'Training');
    const badge = cd?.badge || ld?.badge || '';
    const color = safeCssColor(cd?.color || ld?.color, 'var(--accent-blue)');
    const isRest = !cd?.lifts?.length && (!cd?.runs || cd?.runs === 'Rest')
                && !ld?.lifts?.length && (!ld?.runs || ld?.runs === 'Rest');
    const hasPreview = !isRest && !!(
      cd?.workoutPreview
      || cd?.lifts?.length || (cd?.runs && cd?.runs !== 'Rest')
      || ld?.lifts?.length || (ld?.runs && ld?.runs !== 'Rest')
    );
    return `
      <div class="aplan-day-card ${isToday ? 'aplan-day-card--today' : ''} ${isRest ? 'aplan-day-card--rest' : ''}"
           ${hasPreview ? `data-action="open-day-preview" data-day="${dayKey}" data-program-id="${escapeHtml(appState.activeProgramId || '')}" role="button" tabindex="0"` : ''}>
        <div class="aplan-day-label">${dayShort[dayKey]}</div>
        <div class="aplan-day-body">
          <div class="aplan-day-title">${escapeHtml(title)}</div>
          ${badge ? `<div class="aplan-day-badge" style="color:${color};border-color:${color}40">${escapeHtml(badge)}</div>` : ''}
        </div>
        ${hasPreview ? '<span class="aplan-day-chevron">›</span>' : ''}
        ${isToday ? '<div class="aplan-today-pip"></div>' : ''}
      </div>
    `;
  }).join('');

  // Week-aware header: the stepper/schedule change the displayed week, so show
  // that week's phase + prescribed load (sets×reps) here instead of a static
  // blueprint that ignores the selector.
  const displayWk = _activePlanDisplayWeek || appState.currentWeek || '1';
  const mod = getWeekModifier(prog, displayWk);
  const phase = resolveProgramPhase(catalog || prog, displayWk, appState).label;
  const setsReps = (mod.sets && mod.reps) ? `${mod.sets}×${mod.reps}` : '';
  const prescription = `
    <div class="aplan-week-prescription">
      <span class="aplan-wp-week">Week ${escapeHtml(String(displayWk))}</span>
      ${phase ? `<span class="aplan-wp-phase">${escapeHtml(phase)}</span>` : ''}
      ${setsReps ? `<span class="aplan-wp-load">${setsReps}</span>` : ''}
    </div>`;

  return `${prescription}<div class="aplan-day-list">${cards}</div>`;
}

function _renderScheduleTab(catalog, prog) {
  const totalWeeks = catalog?.durationWeeks || prog?.totalWeeks || 12;
  const displayWkNum = parseInt(_activePlanDisplayWeek || appState.currentWeek || '1', 10);
  const actualWkNum  = parseInt(appState.currentWeek || '1', 10);

  const cells = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const isCurrent = w === displayWkNum;
    const isPast = w < displayWkNum;
    const isActual = w === actualWkNum && displayWkNum !== actualWkNum;
    const phase = resolveProgramPhase(catalog || prog, w, appState).label;
    cells.push(`
      <button class="aplan-sched-cell ${isCurrent ? 'aplan-sched-cell--current' : ''} ${isPast ? 'aplan-sched-cell--past' : ''} ${isActual ? 'aplan-sched-cell--actual' : ''}"
              data-action="aplan-set-week" data-week="${w}" title="${phase}">
        ${w}
      </button>
    `);
  }

  const phaseGroups = {};
  for (let w = 1; w <= totalWeeks; w++) {
    const p = resolveProgramPhase(catalog || prog, w, appState).label;
    if (!phaseGroups[p]) phaseGroups[p] = [];
    phaseGroups[p].push(w);
  }

  const legendItems = Object.entries(phaseGroups).map(([phase, wks]) => {
    const isActive = wks.includes(displayWkNum);
    return `
      <div class="aplan-phase-item ${isActive ? 'aplan-phase-item--active' : ''}">
        <span class="aplan-phase-wks">Wk ${wks[0]}${wks.length > 1 ? `–${wks[wks.length - 1]}` : ''}</span>
        <span class="aplan-phase-label">${phase}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="aplan-schedule">
      <div class="aplan-sched-grid">${cells.join('')}</div>
      <div class="aplan-phase-breakdown">
        <div class="aplan-phase-breakdown-title">PHASE BREAKDOWN</div>
        <div class="aplan-phase-list">${legendItems}</div>
      </div>
    </div>
  `;
}

export function confirmWeekAdvance() {
  const modal = document.getElementById('weekAdvanceModal');
  if (!modal) return;
  const nextWeekString = modal.getAttribute('data-pending-week');
  modal.classList.remove('active');
  if (nextWeekString) {
    appState.currentWeek = nextWeekString;
    appState.weekStartedAt = startOfProgramWeek();
    appState.weekAdvanceSnoozedUntil = null; 
    verifyWeekStorageSchema(appState.currentWeek);
    saveStateToLocalStorage(true);
    hydrateCurrentView();
    const weekSelectElement = document.getElementById('globalWeekSelect');
    if (weekSelectElement) weekSelectElement.value = nextWeekString;
    showToast(`Advanced to Week ${nextWeekString}!`);
  }
}

export function cancelWeekAdvance() {
  const modal = document.getElementById('weekAdvanceModal');
  if (modal) modal.classList.remove('active');
  // Keep the schedule anchored to this calendar week's Monday. The old code
  // moved the anchor back four days, which shifted every weekday label.
  appState.weekStartedAt = startOfProgramWeek();
  appState.weekAdvanceSnoozedUntil = addDaysISO(todayKey(), 3);
  saveStateToLocalStorage(true);
}

export function openCreateProgramModal() { document.getElementById('createProgramModal').classList.add('active'); }
export function closeCreateProgramModal() { document.getElementById('createProgramModal').classList.remove('active'); }

export function executeCreateProgram() {
  const name = document.getElementById('cpInputName').value;
  const focus = document.getElementById('cpInputFocus').value;
  const wks = document.getElementById('cpInputWeeks').value;
  const newId = createCustomProgram(name, wks, focus, "");
  closeCreateProgramModal();
  document.getElementById('cpInputName').value = '';
  document.getElementById('cpInputFocus').value = '';
  document.getElementById('cpInputWeeks').value = '12';
  showToast('Custom Program Created!');
  // Drop straight into the builder so the (empty) program is actually fillable.
  switchProgramMode('builder');
  openBuilder(newId);
}

export async function executeDeleteProgram(id) {
  const ok = await confirmModal({
    title: 'Delete this program?',
    message: 'This custom program will be permanently removed. This cannot be undone.',
    confirmLabel: 'Delete', danger: true,
  });
  if (!ok) return;
  const result = deleteCustomProgram(id);
  if (result.success) {
    updateLibraryState(appState);
    renderLibrary();
    showToast('Program deleted.');
  } else {
    showToast(result.message, true);
  }
}

export function executeDuplicateProgram(id) {
  duplicateCustomProgram(id);
  updateLibraryState(appState);
  renderLibrary();
}

// Edit the program the user is CURRENTLY following. If it is a built-in, this
// transparently converts it to (or reuses) an editable personal backing program
// and makes THAT active before opening the builder — the active-program views
// immediately resolve the personal id, with no Week 1 reset, no lost history,
// and no separate "you switched program" prompt. An active personal program is
// simply edited in place.
export function editActiveProgram() {
  const activeId = appState.activeProgramId;
  if (!activeId) return;
  const wasBuiltIn = !isCustomProgram(activeId);
  const personalId = ensureActiveProgramEditable();
  // Re-resolve every active-program surface against the (possibly new) id.
  updateLibraryState(appState);
  hydrateCurrentView();
  if (wasBuiltIn && personalId !== activeId) showToast('Active program is now editable');
  switchProgramMode('builder');
  openBuilder(personalId);
}

// Open a program for editing from the LIBRARY with a stable, predictable identity:
//  - a program the user already owns is edited IN PLACE (never re-cloned), so
//    saving updates that same card instead of spawning "(Copy) (Copy)" duplicates;
//  - a shared built-in/library template is forked ONCE into a personal copy, and
//    re-customizing the same template reopens that existing copy.
// The original catalog template is never mutated either way. This does NOT
// activate the copy — that transition belongs to editActiveProgram().
export function customizeProgram(id) {
  if (!id) return;
  if (isCustomProgram(id)) {
    switchProgramMode('builder');
    openBuilder(id);
    return;
  }
  // A built-in opens its ONE primary customization: reopen the explicit primary,
  // else adopt a lone legacy copy, else fork a new primary. Never first-match.
  const existingId = findPrimaryCustomization(id)?.id || adoptLegacyPrimaryCustomization(id);
  const targetId = existingId || duplicateCustomProgram(id, { primary: true });
  if (!targetId) { showToast('Could not customize this program.', true); return; }
  updateLibraryState(appState);
  showToast(existingId ? 'Opening your saved copy' : 'Saved to My Programs — customize it below');
  switchProgramMode('builder');
  openBuilder(targetId);
}

// ==========================================
// MODALS & SUMMARY LOGIC
// ==========================================
export function openTodaySummaryModal() {
  const modal = document.getElementById('todaySummaryModal');
  const days = ['sun','mon','tue','wed','thu','fri','sat'];
  const dayNames = {sun:'Sunday',mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday'};
  const todayKey = selectedDay || days[new Date().getDay()];

  document.getElementById('todaySummaryDayLabel').textContent = dayNames[todayKey] || '';

  let volume = 0, sets = 0, gymRpe = null, runDist = null, runTime = null, runPace = null, runRpe = null, notes = '';

  const wk = appState.currentWeek || '1';
  const weekData = appState.weeks?.[wk];
  
  if (weekData) {
    // Canonical working-set totals (warm-ups + incomplete/zero-rep rows excluded),
    // identical to every other strength surface so the modal can never diverge.
    const curStats = strengthDayStats(weekData.lifts?.[todayKey] || {});
    sets = curStats.workingSets;
    volume = curStats.volumeKg;

    const runData = runDaySummary(weekData, todayKey);
    runDist = parseFloat(runData.dist) || null;
    runTime = runData.time || null;
    runRpe  = runData.rpe  || null;

    gymRpe = weekData.gymRpe?.[todayKey] || null;
    notes = weekData.notes?.[todayKey] || '';
  }

  if (runDist && runTime) {
    // Use the canonical duration parser so an HH:MM:SS run time (any run over an
    // hour — long runs, most GPS-tracked sessions) yields a correct pace. The
    // former inline split only handled MM:SS and read HH:MM:SS as just the hours,
    // producing a wildly wrong "today" pace for long efforts.
    const secsPerKm = paceSecondsPerKm(runDist, runTime);
    if (secsPerKm > 0) {
      let pm = Math.floor(secsPerKm / 60);
      let ps = Math.round(secsPerKm % 60);
      if (ps === 60) { pm += 1; ps = 0; }
      runPace = pm + ':' + String(ps).padStart(2, '0');
    }
  }

  const hasLift  = volume > 0 || sets > 0;
  const hasRun   = runDist > 0 || runTime;
  const hasNotes = notes && notes.trim().length > 0;
  const isEmpty  = !hasLift && !hasRun && !hasNotes;

  document.getElementById('todaySummaryLiftBlock').style.display = hasLift ? '' : 'none';
  document.getElementById('todaySummaryVolume').textContent  = Math.round(volume).toLocaleString() + ' kg';
  document.getElementById('todaySummarySets').textContent    = sets;
  document.getElementById('todaySummaryGymRpe').textContent  = gymRpe || '--';

  // Set-by-set breakdown
  const breakdownEl = document.getElementById('todaySummarySetBreakdown');
  if (breakdownEl) {
    if (hasLift && weekData) {
      const dayLifts = weekData.lifts?.[todayKey] || {};
      // Order identically to the cockpit (liftOrder / blueprint), not raw object
      // keys — otherwise drag-reordered or integer-keyed days list out of sequence.
      const _bp = getProgramById(appState.activeProgramId)?.days?.[todayKey];
      const liftNames = orderedLiftNames(weekData, todayKey, _bp).filter(l => Array.isArray(dayLifts[l]) && dayLifts[l].length > 0);
      if (liftNames.length > 0) {
        let html = '<div class="text-xs text-muted mb-2" style="text-transform:uppercase;letter-spacing:0.05em;">Set Breakdown</div>';
        liftNames.forEach(lift => {
          const completedSets = dayLifts[lift].filter(isCompletedSet);
          if (completedSets.length === 0) return;
          const displayLiftName = lift;
          html += `<div class="mb-2"><div class="text-sm font-bold text-inverse mb-1">${escapeHtml(displayLiftName)}</div>`;
          completedSets.forEach((s, idx) => {
            const typeLabel = s.type === 'W' ? 'W' : s.type === 'D' ? `D${idx + 1}` : s.type === 'F' ? 'F' : `S${idx + 1}`;
            const labelColor = s.type === 'W' ? '#94a3b8' : s.type === 'D' ? '#f97316' : s.type === 'F' ? '#ef4444' : 'rgba(255,255,255,0.5)';
            html += `<div class="flex-between text-sm" style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="color:${labelColor};">${typeLabel}</span>
              <span class="text-inverse">${parseFloat(s.w) || 0} kg × ${parseInt(s.r, 10) || 0} reps</span>
            </div>`;
          });
          html += '</div>';
        });
        breakdownEl.innerHTML = html;
        breakdownEl.style.display = '';
      } else {
        breakdownEl.style.display = 'none';
      }
    } else {
      breakdownEl.style.display = 'none';
    }
  }

  // vs last week comparison
  const vsEl = document.getElementById('todaySummaryVsLastWeek');
  if (vsEl && (hasLift || hasRun)) {
    const prevWk   = (parseInt(wk, 10) - 1).toString();
    const prevData = appState.weeks?.[prevWk];
    if (prevData) {
      // Baseline uses the SAME canonical predicate as the current-week headline.
      // The previous inline code counted warm-ups in the baseline but not in the
      // current total, so every "vs last week" delta was skewed whenever last week
      // logged warm-ups.
      const prevStats = strengthDayStats(prevData.lifts?.[todayKey] || {});
      const prevSets = prevStats.workingSets;
      const prevVol = prevStats.volumeKg;
      const prevDist = parseFloat(runDaySummary(prevData, todayKey).dist) || 0;

      const volDelta  = volume - prevVol;
      const setsDelta = sets   - prevSets;
      const distDelta = (runDist || 0) - prevDist;

      const fmt = (n, unit) => {
        if (n === 0) return `<span class="text-muted">= ${unit}</span>`;
        const sign = n > 0 ? '+' : '';
        const color = n > 0 ? '#10b981' : '#ef4444';
        return `<span style="color:${color};">${sign}${Math.round(Math.abs(n) * 10) / 10} ${unit}</span>`;
      };

      let rows = '';
      if (hasLift && (prevVol > 0 || volume > 0)) {
        rows += `<div class="flex-between text-sm mb-1"><span class="text-muted">Volume vs last week</span>${fmt(volDelta, 'kg')}</div>`;
        rows += `<div class="flex-between text-sm mb-1"><span class="text-muted">Sets vs last week</span>${fmt(setsDelta, 'sets')}</div>`;
      }
      if (hasRun && (prevDist > 0 || (runDist || 0) > 0)) {
        rows += `<div class="flex-between text-sm mb-1"><span class="text-muted">Distance vs last week</span>${fmt(distDelta, 'km')}</div>`;
      }

      if (rows) {
        vsEl.innerHTML = `<div class="text-xs text-muted mb-2" style="text-transform:uppercase;letter-spacing:0.05em;">vs Week ${prevWk}</div>${rows}`;
        vsEl.style.display = '';
      } else {
        vsEl.style.display = 'none';
      }
    } else {
      vsEl.style.display = 'none';
    }
  } else if (vsEl) {
    vsEl.style.display = 'none';
  }

  document.getElementById('todaySummaryRunBlock').style.display = hasRun ? '' : 'none';
  document.getElementById('todaySummaryRunDist').textContent  = runDist ? runDist + ' km' : '-- km';
  document.getElementById('todaySummaryRunTime').textContent  = runTime || '--:--';
  document.getElementById('todaySummaryRunPace').textContent  = runPace ? runPace + ' /km' : '-- /km';
  document.getElementById('todaySummaryRunRpe').textContent   = runRpe || '--';

  document.getElementById('todaySummaryNotesBlock').style.display = hasNotes ? '' : 'none';
  document.getElementById('todaySummaryNotes').textContent = notes;

  document.getElementById('todaySummaryEmpty').style.display = isEmpty ? '' : 'none';

  if (modal) modal.style.display = 'flex';
}

export function closeTodaySummaryModal() {
  const modal = document.getElementById('todaySummaryModal');
  if (modal) modal.style.display = 'none';
}

// ==========================================
// GLOBAL EVENT DELEGATION ROUTER
// ==========================================
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.getAttribute('data-action');
  const progId = target.getAttribute('data-program-id');

  if (handleActivityAction(action, target)) return;

  // Tab & Navigation
  if (action === 'switch-tab') {
    const tgt = target.getAttribute('data-target');
    // Entering Insights via the nav tab always lands on the hub index.
    if (tgt === 'analytics') setAnalyticsContext('hub');
    // Entering Train via the nav tab always lands on the Train landing, for the
    // same reason: a top-level destination should open on its index, not on
    // whatever leaf you happened to be inside last time.
    if (tgt === 'workout') setTrainFace('landing');
    switchGlobalAppTab(tgt);
  }
  else if (action === 'open-analytics') openAnalyticsView(target.getAttribute('data-context'), null, {
    entity: target.getAttribute('data-entity'),
    entityName: target.getAttribute('data-entity-name'),
    parentContext: target.getAttribute('data-parent-context'),
    origin: target.getAttribute('data-origin') || undefined,
    preserveWeek: target.getAttribute('data-preserve-week') === 'true' || !!target.getAttribute('data-parent-context'),
  });
  else if (action === 'open-wellness-checkin') openAnalyticsView('recovery-score', 'wellnessFormSection');
  else if (action === 'share-score-card') shareScoreCard();
  else if (action === 'tile-nav') document.dispatchEvent(new CustomEvent('app:navigate', { detail: { target: target.getAttribute('data-nav') } }));
  else if (action === 'set-day') setCockpitActiveDay(target.getAttribute('data-day'));
  else if (action === 'start-today-workout') launchActiveWorkoutCockpit();
  else if (action === 'open-train-cockpit') setTrainFace('cockpit');
  else if (action === 'back-to-train-landing') { setTrainFace('landing'); hydrateCurrentView(); }
  else if (action === 'open-program-workout-picker') openProgramWorkoutPicker();
  else if (action === 'close-program-workout-picker') closeProgramWorkoutPicker();
  else if (action === 'select-program-workout') selectProgramWorkout(target.getAttribute('data-day'));
  else if (action === 'start-empty-workout') startEmptyWorkout();
  else if (action === 'show-copy-workouts') showCopyWorkouts();
  else if (action === 'show-program-workouts') openProgramWorkoutPicker();
  else if (action === 'copy-past-workout') copyPastWorkout(target.getAttribute('data-activity-id'));
  else if (action === 'save-as-routine') {
    saveActivityAsRoutine(target.getAttribute('data-activity-id')).catch((error) => {
      console.warn('Save as routine failed:', error);
      showToast('That routine could not be saved', true);
    });
  }
  else if (action === 'coach-ask') answerCoachOnHome(target.getAttribute('data-q'));
  else if (action === 'switch-browser-tab') switchBrowserSectionTab(target.getAttribute('data-tab'));
  
  // Timers
  else if (action === 'start-timer') beginActiveWorkoutSession();
  else if (action === 'dismiss-rest') dismissRestTimer();
  else if (action === 'rest-pause') toggleRestPause();

  // Programs & Library
  else if (action === 'open-create-program') openCreateProgramModal();
  else if (action === 'close-create-program') closeCreateProgramModal();
  else if (action === 'execute-create-program') executeCreateProgram();
  else if (action === 'cancel-week-advance') cancelWeekAdvance();
  else if (action === 'confirm-week-advance') confirmWeekAdvance();
  else if (action === 'make-active-program') triggerMakeActiveProgram(progId);
  else if (action === 'resume-program-activation') triggerResumeProgramActivation(target.getAttribute('data-activation-id'));
  else if (action === 'view-activation-activities') {
    const activationId = target.getAttribute('data-activation-id');
    const run = priorActivationSummaries(appState).find((item) => item.id === activationId);
    const program = run ? getProgramById(run.programId) : null;
    if (activationId) openActivities({
      activationId,
      label: `${program?.name || 'Previous program'} history`,
    });
  }
  else if (action === 'open-builder') openBuilder(progId);
  else if (action === 'delete-program') executeDeleteProgram(progId);
  else if (action === 'duplicate-program') executeDuplicateProgram(progId);
  else if (action === 'customize-program') customizeProgram(progId);
  else if (action === 'edit-active-program') editActiveProgram();
  // Routine library actions. They are routed HERE rather than through
  // handleLibraryAction, which is only called for the library-local whitelist
  // below and cannot launch a session or own a destructive Undo.
  else if (action === 'start-routine') {
    startRoutine(target.getAttribute('data-routine-id')).catch((error) => {
      console.warn('Routine start failed:', error);
      showToast('The routine could not be started', true);
    });
  }
  else if (action === 'open-routine-menu') {
    const routineId = target.getAttribute('data-routine-id');
    if (isActionMenuOpen()) closeActionMenu();
    else if (routineId) {
      const hasFolders = orderedFolders(appState).length > 0;
      openActionMenu(target, [
        { label: 'Rename', action: 'rename-routine', routineId },
        { label: 'Routine note', action: 'edit-routine-note', routineId },
        ...(hasFolders ? [{ label: 'Move to folder', action: 'move-routine-to-folder', routineId }] : []),
        { label: 'Delete', action: 'delete-routine', routineId, danger: true },
      ], { label: 'Routine actions' });
    }
  }
  else if (action === 'rename-routine') {
    renameRoutine(target.getAttribute('data-routine-id')).catch((error) => {
      console.warn('Routine rename failed:', error);
      showToast('The routine could not be renamed', true);
    });
  }
  else if (action === 'edit-routine-note') {
    editRoutineNote(target.getAttribute('data-routine-id')).catch((error) => {
      console.warn('Routine note failed:', error);
      showToast('The routine note could not be saved', true);
    });
  }
  else if (action === 'delete-routine') {
    deleteRoutine(target.getAttribute('data-routine-id')).catch((error) => {
      console.warn('Routine delete failed:', error);
      showToast('The routine could not be deleted', true);
    });
  }
  else if (action === 'move-routine-to-folder') openRoutineFolderSheet(target.getAttribute('data-routine-id'));
  else if (action === 'choose-routine-folder') {
    chooseRoutineFolder(target.getAttribute('data-folder-id') || null).catch((error) => {
      console.warn('Routine move failed:', error);
      showToast('The routine could not be moved', true);
    });
  }
  else if (action === 'close-routine-folder-sheet') closeRoutineFolderSheet();
  else if (action === 'create-routine-folder') {
    createRoutineFolder().catch((error) => {
      console.warn('Folder create failed:', error);
      showToast('The folder could not be created', true);
    });
  }
  else if (action === 'open-routine-folder-menu') {
    const folderId = target.getAttribute('data-folder-id');
    if (isActionMenuOpen()) closeActionMenu();
    else if (folderId) {
      const folders = orderedFolders(appState);
      const index = folders.findIndex((folder) => folder.id === folderId);
      openActionMenu(target, [
        { label: 'Rename', action: 'rename-routine-folder', folderId },
        ...(index > 0 ? [{ label: 'Move up', action: 'move-routine-folder-up', folderId }] : []),
        ...(index >= 0 && index < folders.length - 1 ? [{ label: 'Move down', action: 'move-routine-folder-down', folderId }] : []),
        { label: 'Delete', action: 'delete-routine-folder', folderId, danger: true },
      ], { label: 'Folder actions' });
    }
  }
  else if (action === 'rename-routine-folder') {
    renameRoutineFolder(target.getAttribute('data-folder-id')).catch((error) => {
      console.warn('Folder rename failed:', error);
      showToast('The folder could not be renamed', true);
    });
  }
  else if (action === 'delete-routine-folder') {
    deleteRoutineFolder(target.getAttribute('data-folder-id')).catch((error) => {
      console.warn('Folder delete failed:', error);
      showToast('The folder could not be deleted', true);
    });
  }
  else if (action === 'move-routine-folder-up') {
    moveRoutineFolder(target.getAttribute('data-folder-id'), -1).catch((error) => {
      console.warn('Folder reorder failed:', error);
      showToast('The folder order could not be saved', true);
    });
  }
  else if (action === 'move-routine-folder-down') {
    moveRoutineFolder(target.getAttribute('data-folder-id'), 1).catch((error) => {
      console.warn('Folder reorder failed:', error);
      showToast('The folder order could not be saved', true);
    });
  }
  else if (action === 'open-program-menu') {
    // Toggle a compact overflow menu of secondary program actions.
    if (isActionMenuOpen()) closeActionMenu();
    else openActionMenu(target, [
      { label: 'Copy program', action: 'copy-program-text', programId: progId, icon: svgIcon('clipboard', { size: 18 }) },
      { label: 'Export plan (.json)', action: 'export-program-json', programId: progId, icon: svgIcon('download', { size: 18 }) },
    ], { label: 'Program actions' });
  }
  else if (action === 'close-action-menu') closeActionMenu();
  else if (action === 'copy-program-text') copyProgramAsText(progId);
  else if (action === 'export-program-json') exportProgramJson(progId);
  else if (action === 'import-plan-json') document.getElementById('planImportFile')?.click();
  else if (handleProgramTextAction(action)) { /* copy-program preview modal buttons */ }
  else if (action === 'open-compare') openCompareModal(progId);
  else if (action === 'compare-pick') pickCompareB(progId);
  else if (action === 'compare-reset') { document.getElementById('compareSearchWrap').style.display = ''; renderComparePicker(''); }
  else if (action === 'close-compare') closeCompareModal();

  // New Program Library actions
  else if (['open-program-detail', 'prog-filter', 'diff-filter', 'prog-quick-search', 'hero-dot', 'lib-tab', 'toggle-bookmark', 'set-profile-answer', 'prog-show-all', 'open-active-plan-manage'].includes(action)) {
    handleLibraryAction(action, target, e);
  }
  else if (['close-program-detail', 'make-active-from-detail', 'view-active-program', 'open-day-preview', 'preview-week-step', 'close-day-preview', 'detail-toggle-bookmark', 'mark-program-complete', 'detail-week-step', 'detail-week-current'].includes(action)) {
    handleDetailAction(action, target);
  }
  else if (action === 'close-active-plan-view') {
    showActivePlanView(false);
    returnToLibrary();
  }
  else if (action === 'aplan-week-step') {
    const delta = parseInt(target.getAttribute('data-delta'), 10);
    const cur = parseInt(_activePlanDisplayWeek || appState.currentWeek || '1', 10);
    const prog = getProgramById(appState.activeProgramId);
    const maxWk = prog?.totalWeeks || 12;
    const next = Math.min(Math.max(1, cur + delta), maxWk);
    if (next !== cur) {
      _activePlanDisplayWeek = String(next);
      appState.currentWeek = String(next);
      const wkSel = document.getElementById('globalWeekSelect');
      if (wkSel) wkSel.value = appState.currentWeek;
      saveStateToLocalStorage(true);
      verifyWeekStorageSchema(appState.currentWeek);
      const activeTabEl = document.getElementById('btnBrowserTabWeeks');
      switchBrowserSectionTab(activeTabEl?.classList.contains('active') ? 'weeks' : 'overview');
    }
  }
  else if (action === 'aplan-set-week') {
    const wk = target.getAttribute('data-week');
    if (wk && wk !== _activePlanDisplayWeek) {
      _activePlanDisplayWeek = wk;
      const activeTabEl = document.getElementById('btnBrowserTabWeeks');
      switchBrowserSectionTab(activeTabEl?.classList.contains('active') ? 'weeks' : 'overview');
    }
  }
  
  // Settings
  else if (action === 'open-settings') openSettings();
  else if (action === 'close-settings') closeSettings();
  else if (e.target.id === 'settingsOverlay') closeSettings();
  else if (action === 'set-unit') setWeightUnit(target.getAttribute('data-unit'));
  else if (action === 'set-dist-unit') setDistanceUnit(target.getAttribute('data-unit'));
  else if (action === 'set-theme')    setTheme(target.getAttribute('data-theme-val'));
  else if (action === 'set-palette')  setPalette(target.getAttribute('data-palette'));
  else if (action === 'rest-preset') applyRestPreset(target.getAttribute('data-preset'));
  else if (action === 'reset-rest-overrides') resetRestOverrides();
  else if (action === 'set-progression') setProgressionIncrement(parseFloat(target.getAttribute('data-kg')));
  else if (action === 'set-previous-scope') setPreviousValuesScope(target.getAttribute('data-scope'));
  else if (action === 'week-step') stepCurrentWeek(parseInt(target.getAttribute('data-delta'), 10));
  else if (action === 'export-data') exportData();
  else if (action === 'import-data') triggerImport();
  else if (action === 'restore-import-backup') void restoreImportBackup();
  else if (action === 'import-external-csv') triggerExternalCsvImport();
  else if (action === 'import-fit-files') triggerFitImport();
  else if (action === 'equipment-profile-add') addEquipmentProfileFromUI();
  else if (action === 'equipment-profile-delete') deleteActiveEquipmentProfile();
  else if (action === 'equipment-plates-reset') resetPlateSetup();
  else if (action === 'save-machine-stack') saveMachineStack();
  else if (action === 'remove-machine-stack') removeMachineStack(target.getAttribute('data-exercise') || '');
  else if (action === 'auto-backup-folder') selectAutomaticBackupFolder();
  else if (action === 'auto-backup-now') backupNow();
  else if (action === 'auto-backup-disable') turnOffAutomaticBackup();
  else if (action === 'reset-all-data') confirmResetAllData();
  else if (action === 'hc-toggle-connect') hcToggleConnect();
  else if (action === 'hc-sync-now') hcSyncNow();
  else if (action === 'set-fitness-goal')     setFitnessGoal(target.getAttribute('data-goal'));
  else if (action === 'set-weight-goal')      setWeightGoal(target.getAttribute('data-weight-goal'));
  else if (action === 'set-fitness-level')    setFitnessLevel(target.getAttribute('data-level'));
  else if (action === 'set-week-start')       setWeekStartDay(target.getAttribute('data-day'));
  else if (action === 'set-fasting-default')  setFastingDefault(parseInt(target.getAttribute('data-hours'), 10));

  // Onboarding
  else if (['ob-start-new','ob-back-recovery','ob-import-backup','ob-next','ob-back','ob-goal','ob-level','ob-frequency','ob-recovery','ob-equipment','ob-program','ob-unit','ob-dist-unit','ob-finish','ob-notif-enable','ob-notif-skip'].includes(action)) {
    handleOnboardingAction(action, target);
  }

  // Quick-start sheet — start another workout, run, walk or fast from Train.
  else if (action === 'open-quick-start')  { toggleQuickStart(true); }
  else if (action === 'close-quick-start') { toggleQuickStart(false); }
  else if (action === 'qs-workout') { toggleQuickStart(false); launchActiveWorkoutCockpit(); }

  else if (action === 'qs-run')  { toggleQuickStart(false); startQuickActivity('run'); }
  else if (action === 'qs-walk') { toggleQuickStart(false); startQuickActivity('walk'); }
  else if (action === 'qs-fast') { toggleQuickStart(false); openFastingDetail(); }
  else if (action === 'open-profile') { switchGlobalAppTab('profile'); }

  // GPS Tracker
  else if (action === 'quick-activity') { startQuickActivity(target.getAttribute('data-type')); }
  else if (action === 'cancel-quick-activity') { cancelQuickActivity(); }
  else if (action === 'qs-retry') { retryQuickActivity(); }
  else if (action === 'close-session-recap') { closeSessionRecap(); }
  // The recap is a full-screen section, so navigating away from it must close it
  // first — otherwise the destination renders underneath and the athlete is
  // stranded on a recap that no longer matches where they are.
  else if (action === 'recap-open-history') { closeSessionRecap(); openActivities({}); }
  else if (action === 'recap-open-progress') { closeSessionRecap(); openAnalyticsView('hub'); }
  else if (action === 'share-pr-card') { sharePRFromRecap(); }
  else if (action === 'share-workout-card') { shareWorkoutFromRecap(); }
  else if (action === 'gps-start')  {
    const dayIdx = DEFAULT_DAYS.indexOf(selectedDay);
    const localDate = appState.weeks?.[appState.currentWeek]?.dates?.[selectedDay]
      || resolveSlotDate(appState, parseInt(appState.currentWeek, 10) || 1, dayIdx, null);
    startTracking('run', false, { week: appState.currentWeek, day: selectedDay, localDate });
  }
  else if (action === 'gps-pause')  { pauseTracking(); }
  else if (action === 'gps-resume') { resumeTracking(); }
  else if (action === 'gps-stop')   {
    // Finish: from the Activity screen close it (recap opens via session:finished);
    // from the cockpit just stop + persist to the current slot.
    if (isActivityScreenOpen()) closeActivityScreen();
    stopTracking(appState.currentWeek, selectedDay);
  }

  // Fasting — delegated to the dedicated domain router (js/fasting/fasting-actions.js)
  else if (FASTING_ACTIONS.has(action)) handleFastingClickAction(action, target, { openAnalyticsView });

  // Run Logger
  else if (action === 'open-run-logger') openRunLogger();
  else if (action === 'close-run-logger') closeRunLogger();
  else if (action === 'save-run-log')    saveManualRun();

  // Export & Data
else if (action === 'export-csv') triggerCSVExport();
else if (action === 'export-bodyweight-csv') triggerBodyweightCSVExport();
  
  // Summary Modals
  else if (action === 'open-today-summary') {
    const day = target.getAttribute('data-day');
    if (day) setSelectedDay(day);
    openTodaySummaryModal();
  }
  else if (action === 'close-today-summary') closeTodaySummaryModal();
  else if (action === 'close-today-summary-nav') { 
    closeTodaySummaryModal(); 
    switchGlobalAppTab('workout'); 
  }
  
  // Athlete Profile
  else if (['set-pr-goal', 'confirm-pr-goal', 'close-pr-goal-modal', 'share-profile'].includes(action))
    handleProfileAction(action, target);
  else if (action === 'pick-avatar')              openAvatarPicker();

  // Deload week
  else if (action === 'close-deload-modal') {
    dismissDeloadSuggestion();
    renderHome();
  }
  else if (action === 'execute-deload-week') {
    applyDeloadToCurrentWeek();
    renderHome();
    try { renderWorkout(); } catch (err) { console.warn(err); }
    showToast('Deload applied — working sets reduced for this week.');
  }

  // Analytics
  else if (action === 'open-bw-sheet') openBodyweightSheet();
  else if (action === 'close-bw-sheet') closeBodyweightSheet();
  else if (action === 'bw-step') stepBodyweight(target.getAttribute('data-delta'));
  else if (action === 'save-bw-sheet') saveBodyweightSheet();
  else if (action === 'edit-bw-row') openBodyweightSheet(target.getAttribute('data-date') || undefined);
  else if (action === 'delete-bw-row') deleteBodyweightEntry(target.getAttribute('data-date') || '');
  else if (action === 'open-ms-sheet') openMeasurementsSheet(target.getAttribute('data-date') || undefined);
  else if (action === 'close-measurements-sheet') closeMeasurementsSheet();
  else if (action === 'save-measurements-sheet') saveMeasurementsSheet();
  else if (action === 'edit-ms-row') openMeasurementsSheet(target.getAttribute('data-date') || undefined);
  else if (action === 'delete-ms-row') deleteMeasurementEntry(target.getAttribute('data-date') || '');
  else if (action === 'measurement-unit') setMeasurementUnit(target.getAttribute('data-unit') || 'cm');
  else if (action === 'export-measurements-csv') triggerMeasurementsCSVExport();
  else if (action === 'bw-range') setBodyweightRangeAction(target.getAttribute('data-days'));
  else if (action === 'save-bw-goal') saveBodyweightGoal();

  // Program Rating Modal
  else if (action === 'rate-program') _openRatingModal(target.dataset.programId || appState.activeProgramId);
  else if (action === 'close-rating-modal') _closeRatingModal();
  else if (action === 'submit-program-rating') _submitProgramRating();
  else if (action === 'rating-star') _highlightStars(parseInt(target.dataset.rating, 10));

  // Notifications
  else if (action === 'request-notifications') {
    requestNotificationPermission().then(({ granted }) => {
      const el = document.getElementById('settingsNotifStatus');
      if (el) el.textContent = granted ? 'Reminders active — you\'ll be notified at 07:30.' : 'Permission denied — enable notifications for openHybrid in your device settings.';
    });
  }
});

// Keyboard accessibility for role="button" elements with data-action
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const target = e.target.closest('[role="button"][data-action]');
  if (!target) return;
  e.preventDefault();
  target.click();
});

document.addEventListener('change', (e) => {
  const target = e.target;

  // ID-based handlers (No data-action required)
  if (target.id === 'analyticsThresholdPaceInput') {
    saveThresholdPace(target.value);
    return;
  }
  if (target.id === 'fastingGoalSelect' || target.id === 'fastingSheetGoalSelect') {
    const goal = parseInt(target.value, 10);
    if (!isNaN(goal)) {
      if (!appState.fastingSession) appState.fastingSession = { active: false, startTime: null, goal: 16, history: [] };
      appState.fastingSession.goal = goal;
      saveStateToLocalStorage(true);
    }
    return;
  }
  if (target.matches('[data-module-toggle]')) {
    toggleModule(target.getAttribute('data-module-toggle'), target.checked);
    return;
  }
  if (target.id === 'settingsExternalCsvFile') {
    handleExternalCsvFile(target.files?.[0]);
    target.value = '';
    return;
  }
  if (target.id === 'settingsFitFiles') {
    handleFitFiles(target.files);
    target.value = '';
    return;
  }
  if (target.id === 'planImportFile') {
    handlePlanImportFile(target.files?.[0]);
    target.value = '';
    return;
  }
  if (target.id === 'settingsImportFile' || target.id === 'onboardingImportFile') {
    handleImportFile(target.files?.[0]);
    target.value = '';
    return;
  }
  if (target.id === 'avatarFilePicker') {
    handleAvatarFile(target.files?.[0]);
    target.value = '';
    return;
  }
  const hcField = target.getAttribute?.('data-hc-field');
  if (hcField) { hcToggleSyncField(hcField, target.checked); return; }
  if (target.id === 'settingsAutoAdvance')          { setAutoAdvanceWeek(target.checked); return; }
  if (target.id === 'settingsNotifWeeklySummary')   { setNotifToggle('weeklySummary', target.checked); return; }
  if (target.id === 'settingsNotifStreak')          { setNotifToggle('streak', target.checked); return; }
  if (target.id === 'settingsNotifMissedWorkout')   { setNotifToggle('missed', target.checked); return; }
  if (target.id === 'settingsEquipmentProfile')     { selectEquipmentProfile(target.value); return; }
  if (target.id === 'settingsEquipmentProfileName') { saveEquipmentProfileName(); return; }
  const eqKey = target.getAttribute?.('data-equipment');
  if (eqKey) { toggleEquipment(eqKey, target.checked); return; }
  if (target.id === 'settingsBandLight' || target.id === 'settingsBandMed' || target.id === 'settingsBandHeavy') { saveBandWeights(); return; }
  if (target.id === 'settingsPlateBar' || target.id === 'settingsPlates') { savePlateSetup(); return; }
  if (target.getAttribute?.('data-plate-count')) { savePlateCounts(); return; }
  if (target.id === 'settingsDumbbells') { saveDumbbells(); return; }
  if (target.id === 'settingsShowPlateHints') { setShowPlateHints(target.checked); return; }
  if (target.id === 'settingsRestWarmup' || target.id === 'settingsRestCompound' || target.id === 'settingsRestAccessory' || target.id === 'settingsRestIsolation') { saveRestPeriods(); return; }
  if (target.id === 'settingsRestEnabled') { setRestTimerEnabledSetting(target.checked); return; }
  if (target.id === 'settingsRestAlertSound') { setRestAlertSoundSetting(target.checked); return; }
  if (target.id === 'settingsRestAlertVolume') { setRestAlertVolumeSetting(Number(target.value) / 100); return; }
  if (target.id === 'settingsAutoWarmup') { setAutoWarmupRamp(target.checked); return; }
  if (target.id === 'settingsNotifications') {
    if (target.checked) {
      requestNotificationPermission().then(({ granted }) => {
        const el = document.getElementById('settingsNotifStatus');
        if (!granted) {
          target.checked = false;
          if (el) el.textContent = 'Permission denied. Enable notifications for openHybrid in your device settings.';
        } else {
          if (el) el.textContent = "Reminders active — you'll be notified at 07:30 each morning.";
        }
      });
    } else {
      cancelReminders();
      const el = document.getElementById('settingsNotifStatus');
      if (el) el.textContent = 'Reminders are off.';
    }
    return;
  }

  // Data-action based handlers
  const actionTarget = target.closest('[data-action]');
  if (!actionTarget) return;
  const action = actionTarget.getAttribute('data-action');

  if (action === 'macro-week-switch') handleMacroWeekSwitch();
});

document.addEventListener('blur', (e) => {
  const id = e.target.id;
  if (id === 'settingsNameInput') saveName();
  else if (id === 'settingsBodyWeight') saveBodyWeight();
  else if (id === 'settingsThresholdPace') { saveThresholdPace(e.target.value); showToast('Threshold pace saved'); }
  else if (id === 'settingsStepGoal') saveStepGoal();
  else if (id === 'settingsReminderTime')    saveReminderTime();
  else if (id === 'settingsStreakAlertTime') saveStreakAlertTime();
}, true);

document.addEventListener('input', (e) => {
  if (e.target.id === 'elSearchInput') handleExerciseSearch(e.target.value);
  else if (e.target.id === 'compareSearchInput') handleCompareSearch(e.target.value);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'prGoalInput') {
    e.preventDefault();
    handleProfileAction('confirm-pr-goal', e.target);
  }
  if (e.key === 'Escape') {
    const modal = document.getElementById('prGoalModal');
    if (modal?.classList.contains('active')) {
      modal.classList.remove('active');
    }
  }
});

// ==========================================
// PROGRAM LIBRARY HELPERS
// ==========================================

export function showActivePlanView(show) {
  const libraryScreen = document.getElementById('programLibraryScreen');
  const detailScreen  = document.getElementById('programDetailScreen');
  const activePlan    = document.getElementById('progActivePlanView');
  const builder       = document.getElementById('builderViewContainer');

  if (libraryScreen) libraryScreen.style.display = show ? 'none' : 'block';
  if (detailScreen)  detailScreen.style.display  = 'none';
  if (activePlan)    activePlan.style.display    = show ? 'block' : 'none';
  if (builder)       builder.style.display       = 'none';

  if (show) {
    _activePlanDisplayWeek = appState.currentWeek;
    const wkSelect = document.getElementById('globalWeekSelect');
    if (wkSelect) wkSelect.value = appState.currentWeek;
    switchBrowserSectionTab('overview');
  }
}

// Custom event bridge from detail page → app.js
document.addEventListener('library:make-active', (e) => {
  const id = e.detail?.id;
  // triggerMakeActiveProgram opens the confirmation sheet and, only on an
  // explicit choice, applies the switch (which updates the library + view
  // itself). Rendering here would run before the user confirms, so it doesn't.
  if (id) triggerMakeActiveProgram(id);
});

document.addEventListener('library:view-active', () => {
  showActivePlanView(true);
});

document.addEventListener('library:return', () => {
  try { returnToLibrary(); } catch (_) {}
});

// ==========================================
// BOOTSTRAP AND INITIALIZATION
// ==========================================
const getState = () => appState;
const getSelectedDay = () => selectedDay;
const getDays = () => DEFAULT_DAYS;
const saveState = (suppress) => saveStateToLocalStorage(suppress);

initEngine(getState, getDays);
initHome(getState, getSelectedDay, getDays);
initAnalytics(getState, getDays);
initBodyweightSheet(() => {
  renderAnalytics();
  if (document.getElementById('view-home')?.classList.contains('active')) renderHome();
});
initMeasurementsSheet(() => {
  renderAnalytics();
  if (document.getElementById('view-home')?.classList.contains('active')) renderHome();
});
initDragDrop(getState, getSelectedDay, saveState);
initWorkout(getState, getSelectedDay, getDays, saveState, switchGlobalAppTab, scheduleLocalSave);
initSettings(getState);
initRunLogger(getState);
initOnboarding(getState);
initProgramLibrary(appState);
initAthleteProfile(getState, getDays, saveState);
initActivities(getState, saveState);
initCustomizeSheet(getState, (suppress) => saveStateToLocalStorage(suppress), () => hydrateCurrentView());

document.addEventListener('session:deleted', () => {
  try { hydrateCurrentView(); } catch (_) {}
});

// Save auto-filled inputs, persist km splits, and render the pace-zone map after GPS tracking finishes.
document.addEventListener('gps:recovered', (e) => {
  const detail = /** @type {CustomEvent} */ (e).detail || {};
  if (detail.quickActivity) {
    openActivityScreen(detail.activityType === 'walk' ? 'walk' : 'run');
  } else {
    launchActiveWorkoutCockpit();
  }
});

document.addEventListener('gps:route-saved', (e) => {
  const { week, day, sessionId, distKm, splits, quickActivity } = e.detail;

  if (!quickActivity && String(week) === String(appState.currentWeek) && day === selectedDay) {
    try { commitWorkoutUIState(); } catch (_) {}
  }
  try {
    renderRunMap(week, day, distKm, {
      splits,
      thresholdSec: appState.thresholdPaceSeconds,
      activationId: appState.activeActivationId,
      sessionId,
    });
  } catch (_) {}
});

// === DEVICE IMPORT WIRING ===

initGarminRunImport(async (distance, timeStr, coordinates, stats) => {
  const wk = appState.currentWeek;
  const sd = selectedDay;
  if (!appState.weeks[wk]) return false; // nothing to save into → honest failure

  const startTs = Number.isFinite(stats?.startTs) ? stats.startTs : null;

  // Refuse a re-import rather than appending a second identical activity, which
  // would double-count distance and load in every total built on them.
  const duplicate = startTs ? findImportedRunSession(appState, startTs) : null;
  if (duplicate) {
    const when = duplicate.session?.localDate;
    showToast(when ? `Already imported — logged on ${when}.` : 'Already imported.', true);
    return { handled: true };
  }

  try {
    // The activity's OWN date decides the calendar day. Falling back to the
    // selected slot only when the file has no usable timestamp: previously every
    // import inherited whichever day the cockpit was showing, so a run done last
    // Tuesday was logged as today and every date-strict analytic followed it.
    const localDate = startTs
      ? dateKey(new Date(startTs))
      : (appState.weeks[wk]?.dates?.[sd] || dateKey());
    const sessionId = newRunSessionId();
    if (!appState.weeks[wk].runs) appState.weeks[wk].runs = {};
    upsertRunSession(appState.weeks[wk], sd, {
      dist:           distance,
      time:           timeStr,
      rpe:            '',
      avgHR:          stats?.avgHR        != null ? Math.round(stats.avgHR)       : '',
      maxHR:          stats?.maxHR        != null ? Math.round(stats.maxHR)       : '',
      elev:           stats?.elevation    != null ? Math.round(stats.elevation)   : '',
      descent:        stats?.descent      != null ? Math.round(stats.descent)     : '',
      cals:           stats?.calories     != null ? Math.round(stats.calories)    : '',
      avgCadence:     stats?.avgCadence   != null ? Math.round(stats.avgCadence)  : '',
      trainingEffect: stats?.trainingEffect != null ? stats.trainingEffect        : '',
      anaerobicTE:    stats?.anaerobicTE  != null ? stats.anaerobicTE             : '',
      hrZones:        stats?.hrZones      || null,
      splits:         stats?.splits       || null,
      // Persisted because it is the identity a later re-import is matched
      // against — without it every re-import would append a duplicate.
    }, { sessionId, source: 'fit', localDate, startTs });
    if (!appState.weeks[wk].dates) appState.weeks[wk].dates = {};
    if (!appState.weeks[wk].dates[sd]) appState.weeks[wk].dates[sd] = localDate;
    if (coordinates && coordinates.length > 0) {
      const routeId = await saveMapToDB(wk, sd, coordinates, {
        sessionId,
        activationId: appState.activeActivationId,
        programId: appState.activeProgramId,
        localDate,
      });
      const current = appState.weeks[wk]?.runs?.[sd];
      if (current?.sessionId === sessionId) {
        upsertRunSession(appState.weeks[wk], sd, { ...current, routeId }, {
          sessionId, source: 'fit', localDate, startTs,
        });
      }
    }
    saveStateToLocalStorage(true);
    hydrateCurrentView();
    return true;
  } catch (err) {
    console.warn('FIT run import save failed:', err);
    return false;
  }
});

initGarminGymImport(async (timeStr, stats) => {
  const wk = appState.currentWeek;
  const sd = selectedDay;
  if (!appState.weeks[wk]) return false;
  try {
    if (!appState.weeks[wk].gymStats) appState.weeks[wk].gymStats = {};
    if (!appState.weeks[wk].gymStats[sd]) appState.weeks[wk].gymStats[sd] = {};
    const g = appState.weeks[wk].gymStats[sd];
    g.time        = timeStr;
    g.avgHR       = stats?.avgHR       != null ? Math.round(stats.avgHR)      : '';
    g.maxHR       = stats?.maxHR       != null ? Math.round(stats.maxHR)      : '';
    g.cals        = stats?.calories    != null ? Math.round(stats.calories)   : '';
    g.trainingEffect = stats?.trainingEffect != null ? stats.trainingEffect   : '';
    g.anaerobicTE = stats?.anaerobicTE != null ? stats.anaerobicTE            : '';
    g.gymSets     = stats?.gymSets     || null;
    if (!appState.weeks[wk].dates) appState.weeks[wk].dates = {};
    // Same correction as the run import: stamp an UNDATED slot with the day the
    // session actually happened rather than today. An already-dated slot is left
    // alone — its date is shared with any strength work logged there.
    if (!appState.weeks[wk].dates[sd]) {
      const gymStartTs = Number.isFinite(stats?.startTs) ? stats.startTs : null;
      appState.weeks[wk].dates[sd] = gymStartTs ? dateKey(new Date(gymStartTs)) : dateKey();
    }
    saveStateToLocalStorage(true);
    hydrateCurrentView();
    return true;
  } catch (err) {
    console.warn('FIT gym import save failed:', err);
    return false;
  }
});


async function exportProgramJson(programId) {
  const program = getProgramById(programId);
  if (!program) { showToast('Plan not found', true); return; }
  try {
    const file = buildPlanFile(program);
    const result = await saveTextExport({
      filename: planFilename(program),
      content: JSON.stringify(file, null, 2),
      mime: 'application/json',
    });
    const copy = exportResultMessage(result, 'Plan');
    showToast(copy.message, copy.error);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Plan export failed', true);
  }
}

async function handlePlanImportFile(file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('That plan file is too large.', true); return; }
  try {
    const raw = await file.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { throw new Error('That file is not valid JSON.'); }
    const existingIds = (appState.customPrograms || []).map((item) => item.id);
    let program;
    if (isOpenGymPlan(data)) {
      const parsed = parseOpenGymPlan(raw);
      if (parsed.unknownIds.length || parsed.unsupported.length) {
        const skipped = [
          parsed.unknownIds.length ? `${parsed.unknownIds.length} exercise id${parsed.unknownIds.length === 1 ? '' : 's'} could not be found` : '',
          parsed.unsupported.length ? `${parsed.unsupported.length} timed/cardio exercise${parsed.unsupported.length === 1 ? '' : 's'} are not supported yet` : '',
        ].filter(Boolean).join('; ');
        const ok = await confirmModal({
          title: 'Import the rest of this plan?',
          message: `${skipped}. The remaining exercises will be imported with their sets, reps and starting weights.`,
          confirmLabel: 'Import the rest',
        });
        if (!ok) return;
      }
      program = createOpenGymProgram(parsed, {
        unit: appState.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg',
        existingIds,
      });
    } else {
      const plan = parsePlanFile(raw);
      program = createImportedProgram(plan, existingIds);
    }
    if (!Array.isArray(appState.customPrograms)) appState.customPrograms = [];
    appState.customPrograms.push(program);
    await saveStateToLocalStorage(true);
    showLibraryTab('my');
    showToast(`Imported ${program.name}`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'That plan could not be imported', true);
  }
}

function checkForAutomaticWeekAdvance() {
  if (appState.settings?.autoAdvanceWeek === false) return;
  if (!appState.weekStartedAt) {
    appState.weekStartedAt = startOfProgramWeek();
    saveStateToLocalStorage(true);
    return;
  }
  const today = todayKey();
  if (appState.weekAdvanceSnoozedUntil && today < appState.weekAdvanceSnoozedUntil) return;
  const startKey = localDayKey(appState.weekStartedAt);
  const diffDays = startKey ? daysBetween(startKey, today) : null;
  if (diffDays == null || diffDays < 7) return;

  const currentWeekNumeric = parseInt(appState.currentWeek, 10);
  const activeProgram = getProgramById(appState.activeProgramId);
  const maxWeek = activeProgram.totalWeeks || 12;

  if (currentWeekNumeric >= maxWeek) {
    appState.weekStartedAt = startOfProgramWeek();
    saveStateToLocalStorage(true);
    return;
  }

  const nextWeekString = (currentWeekNumeric + 1).toString();
  const modal = document.getElementById('weekAdvanceModal');
  const msgEl = document.getElementById('weekAdvanceMessage');

  if (modal && msgEl) {
    msgEl.textContent = `It's been ${diffDays} days since you started Week ${appState.currentWeek}. Start Week ${nextWeekString}?`;
    modal.setAttribute('data-pending-week', nextWeekString);
    modal.classList.add('active');
  }
}

// ── Program Rating Modal ──────────────────────────────────────────────────

let _ratingProgramId  = null;
let _ratingSelected   = 0;

function _openRatingModal(programId) {
  _ratingProgramId = programId;
  _ratingSelected  = 0;
  const modal = document.getElementById('programRatingModal');
  if (!modal) return;
  const nameEl = document.getElementById('ratingModalProgramName');
  if (nameEl) {
    const prog = getProgramById(programId);
    nameEl.textContent = prog?.name || programId || 'Current Program';
  }
  const existing = getPersonalRating(programId);
  _highlightStars(existing?.rating || 0);
  const ta = document.getElementById('ratingReviewText');
  if (ta) ta.value = existing?.review || '';
  modal.classList.add('active');
}

function _closeRatingModal() {
  document.getElementById('programRatingModal')?.classList.remove('active');
}

function _highlightStars(n) {
  _ratingSelected = n;
  document.querySelectorAll('.rating-star').forEach(s => {
    const r = parseInt(s.dataset.rating, 10);
    s.style.opacity = r <= n ? '1' : '0.35';
    s.style.color   = r <= n ? '#f59e0b' : '';
  });
}

function _submitProgramRating() {
  if (!_ratingProgramId || _ratingSelected === 0) {
    showToast('Please select a rating (1–5 stars).');
    return;
  }
  const review = document.getElementById('ratingReviewText')?.value?.trim() || '';
  savePersonalRating(_ratingProgramId, _ratingSelected, review);
  showToast('Rating saved!');
  _closeRatingModal();
}

// ==========================================
// ANDROID HARDWARE / GESTURE BACK
// Native MainActivity calls window.__onAndroidBack() and only exits the app
// when we return anything other than 'handled'. Close the topmost open surface
// first (modal → settings → detail/builder), then fall back to the Home tab,
// then let the OS exit.
// ==========================================
if (typeof window !== 'undefined') {
  window.__onAndroidBack = function () {
    // A transient overflow/action menu is the shallowest surface — Back dismisses
    // it first (it manages no history of its own to avoid modal collisions).
    if (isActionMenuOpen()) { closeActionMenu(); return 'handled'; }

    // Shared dialog/sheet stack owns modal dismissal, focus restoration and
    // semantics. This also covers surfaces whose visual class is not `.active`.
    if (requestCloseTopModal()) return 'handled';

    // 0) Full-screen history/detail and session recap sit above everything.
    if (isActivitiesOpen()) { closeActivities(); return 'handled'; }
    if (isSessionRecapOpen()) { closeSessionRecap(); return 'handled'; }

    // 0b) Quick Start Activity tracker — back cancels the in-progress activity.
    if (isActivityScreenOpen()) { cancelQuickActivity(); return 'handled'; }

    // 1) Generic modals using the .active convention (today-summary, rating,
    //    pr-goal, create-program, week-advance, deload, etc.)
    const activeModal = document.querySelector('.modal.active, [data-modal].active');
    if (activeModal) { activeModal.classList.remove('active'); return 'handled'; }

    // 2) Modals/sheets toggled via inline display (fasting, today-summary fallback)
    const displayModal = [...document.querySelectorAll('.modal, .bottom-sheet, .detail-overlay')]
      .find(el => el.style && (el.style.display === 'flex' || el.style.display === 'block'));
    if (displayModal) { displayModal.style.display = 'none'; return 'handled'; }

    // 3) Settings overlay
    const settingsOverlay = document.getElementById('settingsOverlay');
    if (settingsOverlay && settingsOverlay.classList.contains('active')) { closeSettings(); return 'handled'; }

    // 4) Program detail / builder / active-plan stack → back to library
    const detailScreen = document.getElementById('programDetailScreen');
    const builder      = document.getElementById('builderViewContainer');
    const activePlan   = document.getElementById('progActivePlanView');
    if ([detailScreen, builder, activePlan].some(el => el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none')) {
      try { returnToLibrary(); } catch (_) {}
      switchProgramMode('library');
      return 'handled';
    }

    // 5) Not on Home → go Home rather than exit
    if (activeTab !== 'home') { switchGlobalAppTab('home'); return 'handled'; }

    // 6) Nothing to close — let the native layer handle exit
    return 'exit';
  };
}

// Enforce declared min/max on number inputs (e.g. RPE fields carry max="10").
// Browsers don't clamp type=number on their own, so a stray "50" RPE would sail
// through and skew analytics. This bites only when a value exceeds the declared
// bound, so normal typing is untouched.
// Only clamp the upper bound on input: a value above max is invalid no matter
// what's typed next. Min is deliberately NOT clamped here — a partial entry like
// "1" toward "150" is smaller than a min of 30 and would be snapped away
// mid-typing. Low bounds are enforced on commit by the readers instead.
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement) || t.type !== 'number' || t.value === '' || t.max === '') return;
  const v = parseFloat(t.value);
  if (!Number.isNaN(v) && v > parseFloat(t.max)) t.value = t.max;
});

// Persistent offline indicator — reflects connectivity so the user knows their
// logging still works (and stays on-device) while the network is down.
function initOfflineIndicator() {
  const el = document.getElementById('offlineIndicator');
  if (!el) return;
  const sync = () => { el.hidden = navigator.onLine; };
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
}

async function bootstrapApp() {
  try {
    initSentry(SENTRY_DSN, SENTRY_RELEASE);   // errors only; scrubbed before egress
    paintIcons(document);                     // fill [data-icon] chrome (nav + hub) with the SVG set
    initModalStack(document);
    initOfflineIndicator();
    initSessionRecap(() => appState);
    initAutomaticBackups(() => appState);
    // Recap entry points: after finishing a session, and tapping a logged day.
    document.addEventListener('session:finished', (e) => {
      closeActivityScreen();
      openSessionRecap(e.detail?.week, e.detail?.day, e.detail?.sessionId);
    });
    document.addEventListener('app:open-recap',   (e) => openSessionRecap(e.detail?.week, e.detail?.day));
    document.addEventListener('app:open-activities', (e) => openActivities({
      date: e.detail?.date || null,
      directIfSingle: e.detail?.directIfSingle === true,
      filter: e.detail?.filter || 'all',
      activationId: e.detail?.activationId || null,
      label: e.detail?.label || null,
      view: e.detail?.view === 'calendar' ? 'calendar' : undefined,
    }));
    determineDefaultCalendarDay();
    await pullEngineDataFromStorage();
    // Recovery may immediately attach a device-local active session to app
    // state, so the stored training history must be loaded first.
    initGpsTracker();
    // Android-only catch-up. This is deliberately fire-and-forget so a slow or
    // unavailable document provider can never block app startup.
    void checkDailyAutomaticBackup();

    const currentTab = getActiveProgramIssue(appState) ? 'program' : (activeTab || 'home');
    const currentDay = selectedDay || 'mon';

    verifyWeekStorageSchema(appState.currentWeek);
    setCockpitActiveDay(currentDay);
    switchGlobalAppTab(currentTab);
    checkActiveTimerOnLoad(activeWorkoutTimerKey());
    window._hybridGetProgram = () => getProgramById(appState.activeProgramId);
    applySettingsOnBoot(appState);
    // A rest that was running when the page unloaded resumes from its absolute
    // end time — backgrounding or a reload must not silently end the countdown.
    restoreRestTimer();
    applyModuleVisibility(appState);
    checkForAutomaticWeekAdvance();
    initNotifications(() => appState);
    checkMissedWorkout();
    if (shouldShowOnboarding()) setTimeout(() => startOnboarding(), 300);

  } catch (fatalLifecycleError) {
    console.error("Critical layout generation block runtime defense:", fatalLifecycleError);
  }

}

if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", bootstrapApp);
} else {
  bootstrapApp();
}
