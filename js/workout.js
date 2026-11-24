// ==========================================
// WORKOUT VIEW
// ==========================================
import { getProgramById } from './state.js';
import {
  setWorkoutContext,
  setWorkoutRenderer,
  workoutContextReady,
  getState as _getState,
  getSelectedDay as _getSelectedDay,
  getDays as _getDays,
  saveState as _saveState,
  switchTab as _switchTab,
  scheduleSave as _scheduleSave,
} from './workout/context.js';
import { computeDiagnosticForLift, parseTargetFromDescription, prescribeSetsForLift, computeExercisePRs, liftTarget, repGoalFromTarget } from './engine.js';
import { getWeekModifier } from './schema.js';
import { jtLiftTarget, jtSetRoleTags, jtStoredRoleTag, jtBackoffFromTopSet } from './programs/jt-shed-model.js';
import {
  SET_MODE, formatDistance, formatDuration, isCompletedSet, isRepSet, isWarmupSet,
  isValidWorkingSet, parseDuration, setModeOf, setSummary, setVolume,
} from './set-utils.js';
import { effectiveSetMode } from './workout/set-shape.js';
import { handleSetSheetAction, openSetSheet } from './workout/set-sheet.js';
import { handlePlateSheetAction } from './workout/plate-sheet.js';
import { triggerRestTimerEngine, adjustRestDuration, moveRestTimerToActiveExercise, dismissRestTimer, stopAndResetWorkoutTimer, getWorkoutElapsedSeconds, startWorkoutTimer, bindWorkoutTimerSession, getRestTiers } from './timers.js';
import { mountExerciseDragAndDropSystems } from './dragdrop.js';
import { showToast, saveNewCustomExerciseToLibrary } from './state.js';
import { escapeHtml } from './util.js';
import { buildEmptyWorkoutCard, buildSetRow, buildExerciseCard } from './templates.js';
import { buildSessionOutline, outlineSummaryLine } from './workout/session-outline.js';
import { plannedSetsForLift } from './workout/set-plan.js';
import { addWarmupRamp, rampSetsFor } from './workout/warmup-ramp.js';
import { buildSessionReview } from './workout/session-review.js';
import {
  colorForGroupId, detachMember, groupRestDuration, membersInOrder,
  normaliseGroupId, resolveJoin, roundState, shouldRestAfterSet,
} from './workout/superset.js';
import { activeSessionLiftNames, applyExerciseSwap, neighborDay, pickInheritedSet } from './workout-order.js';
import { getSubstitutions } from './workout/substitutions.js';
import { plateHint } from './workout/plates.js';
import { applyPlateHint, refreshCardSetPlateLines } from './workout/plate-hint-dom.js';
import { getActivePlateSetup, getActiveDumbbells } from './equipment-profiles.js';
import { resolveExercise } from './exercises/catalog.js';
import { deleteMapFromDB } from './db.js';
import { hapticTick, hapticSuccess } from './haptics.js';
import { dateKey } from './dates.js';
import { isInternalLiftId, UNKNOWN_LIFT_NAME } from './state/lift-id.js';
import { computeDashboardModel } from './home/dashboard-model.js';
import { generateRecommendation } from './brain/recommendations.js';
import { projectScore, projectionLine } from './brain/hybrid-score/project.js';
import { hasRunData, newRunSessionId, upsertRunSession } from './state/run-sessions.js';
import { completionPresentation, evaluateSessionCompletion } from './workout/completion-policy.js';
import { rescheduledWorkoutContext } from './workout/program-session-picker.js';
import { applyBandLoad, applyLoadMode } from './workout/load-mode.js';
import { compareWithPrevious, ghostForRow, validateSetEntry, primarySetEntryMessage } from './workout/set-entry.js';
import { deleteDayWorkoutData, hasDayWorkoutDraft, snapshotDayWorkoutData, restoreDayWorkoutData } from './workout/delete-day.js';
import { explicitSessionStatus, finishSession, markSessionInProgress, SESSION_STATUS } from './workout/session-status.js';
import { syncWorkoutWakeLock } from './workout/keep-awake.js';
import {
  browseExercises, equipmentLabel, exerciseStatForName, EXERCISE_CATEGORY_LABELS,
} from './exercises/catalog.js';
import { openExerciseDetail } from './exercises/detail.js';
import { exerciseLoggerHistory } from './workout/exercise-history.js';
import {
  getExerciseLink, getExerciseNote, preferredLoadBasis, preferredLoadMode, shouldAutoWarmup,
} from './workout/exercise-config.js';
import { createReferenceLink } from './workout/reference-link.js';
import { openExerciseOptions } from './workout/exercise-options.js';
import { isE1rmExercise } from './strength/e1rm.js';
import {
  RECORD_KIND, bestRecordBefore, bestRecordForSession, isRecord, prKindLabel, recordKindForSet,
} from './strength/records.js';
import {
  activeOneOffSession, activeWorkoutDay, activeWorkoutDayForWeek, activeWorkoutWeekKey,
  clearActiveOneOffSession, discardActiveOneOffSession, oneOffBlueprint, routineNoteForSession,
} from './workout/one-off-session.js';
import { workoutSessionKey } from './workout/session-identity.js';
import { weightUnitLabel } from './workout/units.js';
import { formatEffort } from './workout/effort.js';
import {
  openConfirmResetModal, closeConfirmResetModal, executeResetActiveDayMetrics,
} from './workout/clear-log.js';
import {
  renderRunInputs, renderImportedRunDetails, renderCockpitRunMap, positionRunPanel,
  commitRunLogging, handleRunLoggingInput,
} from './workout/run-logging.js';
import {
  appendCustomSetRow, appendWarmupSetRow, appendDropSetRow, removeCustomSetRow, cycleSetType, cycleSetMode,
  setSetLoadMode, cycleSetLoad, setPerSetRir, toggleSetFailure, toggleLoadBasis,
  editSetRest, clearSetRest, editSetNote,
  currentBodyweight as _currentBodyweight,
} from './workout/set-mutations.js';
// Re-exported for js/app.js, which imports these from here.
export { openConfirmResetModal, closeConfirmResetModal, executeResetActiveDayMetrics };
export {
  appendCustomSetRow, appendWarmupSetRow, appendDropSetRow, removeCustomSetRow, cycleSetType, cycleSetMode,
  setSetLoadMode, cycleSetLoad, setPerSetRir, toggleSetFailure, toggleLoadBasis,
  editSetRest, clearSetRest, editSetNote,
};
import {
  renderExerciseLibraryList,
  handleExerciseSearch,
  addExerciseToDayFromLibrary,
  openSwapModal,
  closeSwapModal,
  executeSwapExercise,
  confirmCustomSwap,
  openAddExerciseModal,
  closeAddExerciseModal,
  confirmAddExercise,
} from './workout/exercise-picker.js';

// Re-exported so js/app.js (the only importer of this file) keeps its existing
// import list. Moving the implementation is the change; moving the public
// surface too would make the diff span both files for no benefit.
export {
  handleExerciseSearch,
  addExerciseToDayFromLibrary,
  openSwapModal,
  closeSwapModal,
  executeSwapExercise,
  confirmCustomSwap,
  openAddExerciseModal,
  closeAddExerciseModal,
  confirmAddExercise,
};
import { replaceManagedModal } from './ui/modal-stack.js';


// E5 — the adherence baseline is the row's `data-prescribed` attribute (the
// coach's target). The visible placeholder can now follow the athlete's previous
// set, so it must never be read as the prescription. Default "kg"/"reps"
// ghosts are non-numeric and skipped.
// Returns the numeric target, or null when there's no real prescription.
function _numericPlaceholder(inputNode) {
  const explicit = inputNode?.getAttribute?.('data-prescribed');
  const raw = String((explicit != null && explicit !== '') ? explicit : (inputNode?.getAttribute?.('placeholder') || '')).trim();
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function _prescribedRepGoal(inputNode) {
  const explicit = Number(inputNode?.dataset?.targetReps);
  return Number.isFinite(explicit) && explicit > 0 ? explicit : _numericPlaceholder(inputNode);
}

// Straight-set convenience: read this exercise's set rows from the live DOM and
// delegate to the pure `pickInheritedSet` — the nearest earlier completed set of
// the same kind fills the value only (never the placeholder), so an inherited set
// is never banked as a "prescribed target" and true-adherence stays honest.
function _setValueInput(row) {
  return row?.querySelector('.input-set-value-node') || null;
}

/** The numeric value of a row's second input, in its own shape. */
function _setRowValue(mode, value) {
  if (mode === SET_MODE.TIME) return parseDuration(value) || 0;
  if (mode === SET_MODE.DISTANCE) return parseFloat(value) || 0;
  return parseInt(value, 10) || 0;
}

function _inheritedSetFromSession(exCard, parentRow) {
  if (!exCard || !parentRow) return null;
  const rows = Array.from(exCard.querySelectorAll('.cockpit-set-row'));
  const idx = rows.indexOf(parentRow);
  if (idx < 0) return null;
  const sets = rows.map(row => {
    const mode = row.getAttribute('data-set-mode') || SET_MODE.REPS;
    const value = _setValueInput(row)?.value || '';
    return {
      type: row.classList.contains('type-warmup') ? 'W' : '',
      mode,
      w: row.querySelector('.input-weight-node')?.value || '',
      r: mode === SET_MODE.REPS ? value : '',
      value: mode === SET_MODE.REPS ? '' : value,
      done: !!row.querySelector('.gym-check')?.checked,
    };
  });
  return pickInheritedSet(sets, idx);
}

export function initWorkout(getStateFn, getSelectedDayFn, getDaysFn, saveStateFn, switchTabFn, scheduleSaveFn) {
  // The accessors live in js/workout/context.js so modules split out of this
  // file can read them without importing this file back. See that module for
  // why the cycle matters.
  setWorkoutContext(getStateFn, getSelectedDayFn, getDaysFn, saveStateFn, switchTabFn, scheduleSaveFn);
  // Modules split out of this file ask the context for a redraw rather than
  // importing renderWorkout back and recreating the cycle.
  setWorkoutRenderer(renderWorkout);
}

export function activeWorkoutTimerKey() {
  const state = _getState?.();
  if (!state) return null;
  const week = activeWorkoutWeekKey(state);
  const day = activeWorkoutDay(state, _getSelectedDay?.());
  return workoutSessionKey(state, week, day);
}

/**
 * Durable status used by program activation. A running timer or any user edit
 * makes the workout unresolved; a program switch must explicitly save or
 * discard it before activation state can change.
 */
export function activeWorkoutSwitchStatus() {
  const state = _getState?.();
  if (!state) return { unresolved: false, hasDraft: false, timerActive: false, week: null, day: null };
  const week = activeWorkoutWeekKey(state);
  const day = activeWorkoutDay(state, _getSelectedDay?.());
  const timerActive = getWorkoutElapsedSeconds(workoutSessionKey(state, week, day)) > 0;
  const hasDraft = !!day && hasDayWorkoutDraft(state.weeks?.[week], day);
  return { unresolved: timerActive || hasDraft, hasDraft, timerActive, week, day };
}

function blankProgramDay(state, week, day) {
  const program = getProgramById(state.activeProgramId);
  const blueprint = program?.days?.[day];
  const lifts = {};
  const liftOrder = [];
  if (!program || !blueprint) return { lifts, liftOrder };
  const modifier = getWeekModifier(program, week);
  for (const liftName of (blueprint.lifts || [])) {
    if (typeof liftName !== 'string' || !liftName.trim()) continue;
    lifts[liftName] = prescribeSetsForLift(week, day, liftName, blueprint.desc, modifier, { program, week, dayKey: day });
    liftOrder.push(liftName);
  }
  return { lifts, liftOrder };
}

/**
 * Resolve the active workout before a program switch. Saving commits the live
 * controls and records elapsed time; discarding restores the blank prescription
 * (or removes a one-off session). Both stop the session timers before returning.
 * @param {'save'|'discard'} action
 */
export async function resolveWorkoutBeforeProgramSwitch(action) {
  if (action !== 'save' && action !== 'discard') return false;
  const state = _getState?.();
  if (!state) return false;
  const status = activeWorkoutSwitchStatus();
  const week = status.week;
  const day = status.day;
  if (!week || !day) return false;

  const oneOff = activeOneOffSession(state);
  if (action === 'save') {
    commitWorkoutUIState();
    const timerKey = workoutSessionKey(state, week, day);
    const elapsed = getWorkoutElapsedSeconds(timerKey);
    const weekData = state.weeks?.[week];
    if (elapsed > 0 && weekData) {
      if (!weekData.gymStats) weekData.gymStats = {};
      if (!weekData.gymStats[day]) weekData.gymStats[day] = { time: '', avgHR: '', maxHR: '', cals: '' };
      if (!weekData.gymStats[day].time) {
        weekData.gymStats[day].time = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
      }
    }
    if (oneOff?.key === week) {
      clearActiveOneOffSession(state);
      if (!hasDayWorkoutDraft(state.weeks?.[week], day)) delete state.weeks[week];
    }
  } else if (oneOff?.key === week) {
    delete state.weeks[week];
    clearActiveOneOffSession(state);
  } else {
    const replacement = blankProgramDay(state, week, day);
    deleteDayWorkoutData(state.weeks?.[week], day, replacement);
    try {
      await deleteMapFromDB(week, day, { activationId: state.activeActivationId });
    } catch (_) { /* state deletion remains authoritative; route cleanup is best-effort */ }
  }

  stopAndResetWorkoutTimer(workoutSessionKey(state, week, day));
  dismissRestTimer();
  _saveState(true);
  return true;
}

// ==========================================
// PRIVATE HELPERS
// ==========================================
function _priorDateLabel(date) {
  const value = new Date(`${date}T12:00:00`);
  return Number.isNaN(value.getTime()) ? String(date || 'Date unavailable') : value.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function _previousSessionPanel(appState, performance, exerciseName, weightUnit) {
  if (!performance) return '';
  const sourceWeek = appState.weeks?.[performance.weekKey] || {};
  const sourceProgram = getProgramById(performance.programId);
  const title = sourceWeek.sessionTitle || sourceProgram?.days?.[performance.day]?.title || 'Previous workout';
  const sets = performance.workingSets || [];
  const volume = Math.round(sets.reduce((sum, set) => sum + setVolume(set), 0));
  const comparableLoad = isE1rmExercise(exerciseName, sets[0]) && performance.weight > 0;
  const top = comparableLoad
    ? `top ${performance.weight}${weightUnit} × ${performance.reps}`
    : `${sets.reduce((sum, set) => sum + (parseInt(set?.r, 10) || 0), 0)} total reps`;
  const rows = sets.map((set, index) => {
    const weight = parseFloat(set?.w) || 0;
    const reps = parseInt(set?.r, 10) || 0;
    // One effort reader, and the existing copy: an entered RIR reads as
    // "1.5 reps left", a legacy RPE-only set keeps "RPE 8.5", and an unrated
    // set stays blank instead of showing a fabricated number.
    const hasRir = set?.rir != null && set.rir !== '';
    const effortText = escapeHtml(hasRir
      ? formatEffort(set, { style: 'reps-left' })
      : formatEffort(set, { scale: 'rpe' }));
    return `<div class="previous-session__set"><span>S${index + 1}</span><strong>${weight > 0 ? `${escapeHtml(String(weight))}${escapeHtml(weightUnit)} × ` : ''}${escapeHtml(String(reps))}</strong><small>${effortText}</small></div>`;
  }).join('');
  return `<details class="previous-session">
    <summary><span><small>Last performed · ${escapeHtml(_priorDateLabel(performance.date))}</small><strong>${escapeHtml(top)} · ${sets.length} ${sets.length === 1 ? 'set' : 'sets'}</strong></span><b>Details</b></summary>
    <div class="previous-session__context">${escapeHtml(title)}${volume > 0 ? ` · ${volume.toLocaleString()} ${escapeHtml(weightUnit)} volume` : ''}</div>
    <div class="previous-session__sets">${rows}</div>
    <div class="previous-session__actions"><button type="button" data-action="use-previous-values">Use previous values</button><button type="button" data-action="open-activity-detail" data-activity-id="${escapeHtml(performance.activityId)}">View workout</button></div>
  </details>`;
}

function _buildExerciseCardEl(liftName, loggedLiftsData, weekData, wk, selectedDay, appState, homeBlueprint, isCollapsed, groupId, ssColor, ssMemberCount = 0, ssOrdinal = null) {
  const setsArr = loggedLiftsData[liftName];
  if (!Array.isArray(setsArr)) return null;

  const isCompleted = setsArr.length > 0 && setsArr.every(isCompletedSet);
  const exCard = document.createElement('div');
  exCard.className = `cockpit-exercise${isCollapsed ? ' collapsed' : ''}${isCompleted ? ' completed' : ''}`;
  exCard.setAttribute('data-liftname', liftName);
  exCard.setAttribute('draggable', 'true');

  let displayLiftName;
  if (!isNaN(liftName) && homeBlueprint.lifts?.[parseInt(liftName, 10)]) {
    displayLiftName = homeBlueprint.lifts[parseInt(liftName, 10)];
  } else if (isInternalLiftId(liftName)) {
    // Defense-in-depth: the v2 migration repairs stored data, but an un-migrated
    // key could still arrive from an older device's saved blob. Never surface a
    // raw internal id as an exercise name — show an honest fallback instead.
    // (The primary fix is the migration; this is not a cosmetic row filter — the
    // row still renders, just with a truthful label.)
    displayLiftName = UNKNOWN_LIFT_NAME;
  } else {
    displayLiftName = liftName;
  }

  let blueprintLabel = 'Target: Working Sets';
  let diagnostic = { isStalled: false, suggestedWeight: '', progression: null };
  // Per-working-set role tags (J&T tier model). Render-only, derived from the
  // structured prescription's setPlan; null for every non-J&T program so the
  // generic logger is byte-for-byte unchanged.
  let jtRoleTags = null;
  // Keep the resolved prescription available while rendering the set rows.
  // The fallback is deliberately blank rather than inventing a numeric target
  // if an old/custom program cannot be resolved.
  let target = { sets: setsArr.length, reps: '' };
  try {
    if (homeBlueprint.oneOff) {
      const reps = setsArr.find((set) => String(set?.r || '').trim())?.r || '';
      target = { sets: setsArr.length, reps };
      blueprintLabel = reps ? `Copied target: ${target.sets} × ${reps}` : 'Your workout';
    } else {
      // Resolve the prescribed target first so the auto-progression engine can
      // judge whether last session actually hit the rep goal.
      const activeProgram = getProgramById(appState.activeProgramId);
      const weekModifier = getWeekModifier(activeProgram, wk);
      const jtCtx = { program: activeProgram, week: wk, dayKey: selectedDay };
      target = liftTarget(homeBlueprint.desc, displayLiftName, weekModifier, jtCtx);
      diagnostic = computeDiagnosticForLift(wk, selectedDay, liftName, repGoalFromTarget(target.reps) || 0, {
        progressionStyle: activeProgram?.progressionStyle,
      });
      // Label shows the SAME target we materialise (inline spec or week modifier),
      // so "Target: 4 × 5" always matches the number of set rows populated —
      // including after the athlete removes a set, which is why the count comes
      // from the session's own plan rather than straight off the prescription.
      // For the tiered J&T model, use its rich per-exercise label (10RM + 3×6 @
      // 70%, 15RM + 2 MRS, 3 × 6–10, …) instead of collapsing every tier to
      // sets×reps.
      const jtTarget = jtLiftTarget(activeProgram, wk, selectedDay, displayLiftName);
      const labelSets = plannedSetsForLift(weekData, selectedDay, liftName, target.sets);
      blueprintLabel = jtTarget ? `Target: ${jtTarget.label}` : `Target: ${labelSets} × ${target.reps}`;
      if (jtTarget?.prescription?.setPlan?.length) jtRoleTags = jtSetRoleTags(jtTarget.prescription.setPlan);
    }
  } catch(e) { console.warn(e); }

  // #5 single-focus accordion — a finished exercise reads as a one-line achieved
  // summary ("✓ 3 × 5 @ 100kg") instead of its target, so a collapsed card is
  // informative at a glance and the cockpit stays focused on the current lift.
  // Keep the pure target too, so un-checking a set restores the prescription.
  const targetLabel = blueprintLabel;
  if (isCompleted) {
    const wu = appState.settings?.weightUnit || 'kg';
    blueprintLabel = _achievedSummaryFromSets(setsArr, wu) || blueprintLabel;
  }

  // Weights are stored in the user's configured unit — label them with it, not a
  // hardcoded "kg" (which mislabelled every number for lbs users).
  const wUnit = appState.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const loggerHistory = exerciseLoggerHistory(appState, displayLiftName, {
    weekKey: wk,
    day: selectedDay,
    beforeDate: weekData?.dates?.[selectedDay] || dateKey(),
    scope: appState.settings?.previousValuesScope === 'program' ? 'program' : 'all',
  });
  const priorPerformance = loggerHistory.latest;
  let historicalLineText = 'First time logging this — today sets your baseline';
  let historyPanelHTML = '';
  if (priorPerformance) {
    const doneSets = priorPerformance.workingSets;
    historicalLineText = 'Last session: [ ' + doneSets.map((set) => {
      const weight = parseFloat(set?.w) || 0;
      const reps = parseInt(set?.r, 10) || 0;
      return weight > 0
        ? `${escapeHtml(String(weight))}${wUnit} × ${escapeHtml(String(reps))}`
        : `${escapeHtml(String(reps))} reps`;
    }).join(', ') + ' ]';
    historyPanelHTML = _previousSessionPanel(appState, priorPerformance, displayLiftName, wUnit);
  } else if (loggerHistory.globalBestEstimated1RM > 0) {
    historicalLineText = `Previous best: ${Math.round(loggerHistory.globalBestEstimated1RM)}${wUnit} (estimated 1RM)`;
  }

  const safeLiftName = escapeHtml(liftName);
  const displaySafeName = escapeHtml(displayLiftName);

  // Only an activation-scoped progression suggestion may become an editable
  // ghost target. Global exercise history remains read-only in the Last
  // performed panel until the athlete deliberately chooses Use previous values.
  const suggestedGhost = (diagnostic.progression && diagnostic.progression.weight)
    ? { w: diagnostic.progression.weight, r: diagnostic.progression.reps }
    : (target.weight > 0 ? { w: target.weight, r: target.reps } : null);
  // The day's top-set (T1 rep-max) actual weight drives the Block-2 (weeks 7–11)
  // back-off suggestion. Read it from the STORED rep-max row so it survives edits
  // and reload; recomputed here at render, and live on input (see recalcJtBackoff).
  const topSetRow = Array.isArray(setsArr) ? setsArr.find((s) => s && s.role === 'repmax') : null;
  const topSetWeight = topSetRow ? parseFloat(topSetRow.w) : NaN;

  let priorWorkingIndex = 0;
  let jtWorkingIndex = 0;
  let mrsOrdinal = 0;
  const setsMarkup = setsArr.map((sData, sIdx) => {
    const isWarmup = isWarmupSet(sData);
    const previousSet = isWarmup ? null : priorPerformance?.workingSets?.[priorWorkingIndex++];
    // Prefer the role STORED on the set (stable across warm-up insertion / set
    // removal — the role travels with the row). Fall back to the positional
    // setPlan mapping only for pre-role sessions, skipping warm-ups. Appended
    // extra working rows carry no role and stay untagged.
    let roleTag = null;
    if (!isWarmup) {
      if (sData && sData.role) {
        if (sData.role === 'mrs') mrsOrdinal += 1;
        roleTag = jtStoredRoleTag(sData, mrsOrdinal);
      } else if (jtRoleTags) {
        roleTag = jtRoleTags[jtWorkingIndex] || null;
      }
      jtWorkingIndex += 1;
      // Block-2 back-off: suggest 85%/90% of the entered top-set load on rows the
      // athlete hasn't already filled. A row with a typed weight is a deliberate
      // override and is never auto-filled. No top set yet → no suggestion (never 0).
      if (roleTag && (roleTag.role === 'backoff' || roleTag.role === 'plus') && roleTag.boSrc === 'dayRepMax') {
        const alreadyEntered = String(sData?.w ?? '').trim() !== '';
        const suggest = jtBackoffFromTopSet(topSetWeight, roleTag.boPct);
        roleTag = { ...roleTag, unit: wUnit, backoffSuggest: (!alreadyEntered && suggest != null) ? suggest : null,
          backoffHint: suggest != null ? `${roleTag.boPct}% of ${topSetWeight}${wUnit} top set · ${suggest}${wUnit}` : '' };
      }
    }
    // The ghost follows the athlete's own previous set; the prescription stays
    // the adherence baseline (`prescribed` below) so nothing is re-measured.
    const ghostSet = ghostForRow(setsArr, sIdx, suggestedGhost);
    // Per-exercise defaults shape a BLANK row only. They are applied to a
    // display copy so opening a workout never writes settings into the program
    // scaffold; completion stamps what the athlete actually used.
    const isBlankRow = !sData.c && !String(sData.w ?? '').trim() && !sData.bw && !sData.band
      && !sData.loadMode && !sData.basis && !sData.sec && !sData.dist;
    let displaySet = sData;
    if (isBlankRow) {
      displaySet = { ...sData };
      const prefLoad = preferredLoadMode(appState, displayLiftName);
      if (prefLoad === 'banded') {
        displaySet = applyBandLoad(displaySet, 'M', {
          exercise: displayLiftName,
          bodyweight: _currentBodyweight(appState),
          bandWeights: appState.settings?.bandWeights,
        });
      } else if (prefLoad !== 'weighted') {
        displaySet = applyLoadMode(displaySet, prefLoad, {
          bodyweight: _currentBodyweight(appState),
          bandWeights: appState.settings?.bandWeights,
        });
      }
      displaySet.basis = preferredLoadBasis(appState, displayLiftName);
    }
    return buildSetRow(
      displaySet, sIdx, safeLiftName, ghostSet, wUnit, displayLiftName,
      _currentBodyweight(appState), target.reps, repGoalFromTarget(target.reps), previousSet, roleTag,
      effectiveSetMode(displaySet, displayLiftName, appState),
      suggestedGhost,
    );
  }).join('');

  // C4b — per-side plate math for the coach's target weight, opt-in from
  // Settings so the default target line stays uncluttered. Uses the active
  // equipment profile's bar/plates.
  let plates = '';
  const showPlates = appState.settings?.showPlateHints === true;
  try {
    // Plate math is only honest for a standard barbell. Dumbbell, EZ-bar,
    // machine and custom lifts have a different bar (or no bar at all).
    const isBarbellLift = resolveExercise(displayLiftName)?.equipment?.includes('barbell') === true;
    const tw = diagnostic.progression && diagnostic.progression.weight;
    if (showPlates && isBarbellLift && tw && !isNaN(Number(tw)) && Number(tw) > 0) {
      const unit = appState.settings?.weightUnit || 'kg';
      plates = plateHint(Number(tw), unit, getActivePlateSetup(appState, unit));
    }
  } catch (_) {}

  try {
    // The column header names what the value field actually holds. A card whose
    // sets are all holds or all carries says Time / Distance; a mixed card keeps
    // the honest "Value" rather than labelling a plank in reps.
    const rowModes = new Set(
      (Array.isArray(loggedLiftsData) ? loggedLiftsData : [])
        .filter((set) => set && !isWarmupSet(set))
        .map((set) => effectiveSetMode(set, displayLiftName, null)),
    );
    const weightColumnLabel = rowModes.size === 1
      ? ({ time: 'Time', distance: 'Distance' }[/** @type {string} */ ([...rowModes][0])] || 'Reps')
      : 'Value';
    exCard.innerHTML = buildExerciseCard({ displaySafeName, safeLiftName, isCompleted, diagnostic, blueprintLabel, targetLabel, historicalLineText, historyPanelHTML, setsMarkup, groupId, ssColor, ssMemberCount, ssOrdinal, plates, weightUnit: wUnit, weightColumnLabel });
    // Free-text note and the private reference link both sit directly under the
    // history line. The note is DOM text (never HTML); the link is a real anchor
    // built through DOM APIs — neither value ever touches innerHTML.
    const insertInBody = (el) => {
      const history = exCard.querySelector('.cockpit-history-line, .previous-session');
      if (history) history.insertAdjacentElement('afterend', el);
      else exCard.querySelector('.cockpit-body')?.prepend(el);
    };
    const exerciseNote = getExerciseNote(appState, displayLiftName);
    let noteEl = null;
    if (exerciseNote) {
      noteEl = document.createElement('div');
      noteEl.className = 'cockpit-ex-note';
      noteEl.textContent = exerciseNote;
      insertInBody(noteEl);
    }
    const exerciseLink = getExerciseLink(appState, displayLiftName);
    if (exerciseLink) {
      const linkEl = createReferenceLink(document, exerciseLink, displayLiftName);
      if (linkEl) {
        if (noteEl) noteEl.insertAdjacentElement('afterend', linkEl);
        else insertInBody(linkEl);
      }
    }
    if (showPlates && plates) applyPlateHint(exCard, plates);
    if (showPlates && resolveExercise(displayLiftName)?.equipment?.includes('barbell')) {
      refreshCardSetPlateLines(exCard, {
        unit: wUnit,
        setup: getActivePlateSetup(appState, wUnit),
      });
    }
    // Any completed WORKING set means the athlete is past warming up. Kept in
    // sync on tick by refreshContextualRowActions(), since ticking updates the
    // DOM without re-rendering this card.
    exCard.classList.toggle('has-logged-work', (setsArr || []).some((s) => isCompletedSet(s) && !isWarmupSet(s)));
  } catch(e) {
    exCard.innerHTML = `<div class="card-dark p-3 text-inverse">${displaySafeName} (Render Error)</div>`;
  }
  return exCard;
}

// ==========================================
// RENDER
// ==========================================
// ---- Session outline (Phase 2A) --------------------------------------------
// A compact index above the accordion: every exercise, its set progress, and
// one line answering "how much is left?". Tapping an entry expands that
// exercise, so the outline is navigation as well as orientation.
function renderSessionOutline(loggedLiftsData, orderedNames, activeLift) {
  const el = document.getElementById('cockpitSessionOutline');
  if (!el) return;

  const outline = buildSessionOutline(loggedLiftsData, orderedNames, { activeLift });
  if (outline.empty) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;

  const dots = (entry) => Array.from({ length: entry.total }, (_, i) =>
    `<i class="session-outline__dot${i < entry.done ? ' is-done' : ''}"></i>`).join('');

  el.innerHTML = `
    <div class="session-outline__head">
      <span class="session-outline__title">Session</span>
      <span class="session-outline__summary">${escapeHtml(outlineSummaryLine(outline))}</span>
    </div>
    <ol class="session-outline__list">
      ${outline.entries.map((entry) => `<li>
        <button type="button" class="session-outline__row is-${escapeHtml(entry.status)}"
          data-action="jump-to-exercise" data-liftname="${escapeHtml(entry.name)}"
          aria-label="${escapeHtml(entry.name)}: ${entry.done} of ${entry.total} sets done">
          <span class="session-outline__mark" aria-hidden="true">${entry.status === 'done' ? '✓' : ''}</span>
          <span class="session-outline__name">${escapeHtml(entry.name)}</span>
          <span class="session-outline__dots" aria-hidden="true">${dots(entry)}</span>
          <span class="session-outline__count">${entry.done}/${entry.total}</span>
        </button>
      </li>`).join('')}
    </ol>`;
}

// ---- Active-session exercise rail -----------------------------------------
// A compact, numbered index shown only while a session is under way. The full
// vertical outline is hidden then; this keeps the active card at the top while
// retaining one-tap access to every other exercise.
function renderCockpitExerciseRail(loggedLiftsData, orderedNames, activeLift) {
  const el = document.getElementById('cockpitExerciseRail');
  if (!el) return;
  el.innerHTML = orderedNames.map((name, index) => {
    const sets = loggedLiftsData?.[name] || [];
    const done = sets.filter(isCompletedSet).length;
    const isDone = sets.length > 0 && done === sets.length;
    const isActive = name === activeLift;
    return `<button type="button" class="cockpit-exercise-rail__item${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}" data-action="jump-to-exercise" data-liftname="${escapeHtml(name)}" aria-label="${escapeHtml(name)}: ${done} of ${sets.length} sets done" aria-current="${isActive ? 'step' : 'false'}">
      <span class="cockpit-exercise-rail__num">${index + 1}</span>
      <span class="cockpit-exercise-rail__count">${done}/${sets.length}</span>
    </button>`;
  }).join('');
}

/** Recompute the compact active-session stats and rail from stored state. */
function refreshCockpitActiveStats() {
  if (!workoutContextReady()) return;
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekData = appState.weeks?.[activeWorkoutWeekKey(appState)];
  if (!weekData) return;
  const logged = weekData.lifts?.[selectedDay] || {};
  const active = document.querySelector('.cockpit-exercise:not(.collapsed)')?.getAttribute('data-liftname');
  let totalSets = 0;
  let doneSets = 0;
  let volume = 0;
  for (const sets of Object.values(logged)) {
    if (!Array.isArray(sets)) continue;
    totalSets += sets.length;
    for (const set of sets) {
      if (isCompletedSet(set)) doneSets += 1;
      if (isValidWorkingSet(set)) volume += setVolume(set);
    }
  }
  const unit = appState.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const volEl = document.getElementById('cockpitActiveVolume');
  const setsEl = document.getElementById('cockpitActiveSets');
  if (volEl) volEl.textContent = `${Math.round(volume).toLocaleString('en-AU')} ${unit}`;
  if (setsEl) setsEl.textContent = `${doneSets}/${totalSets}`;
  document.querySelectorAll('#cockpitExerciseRail .cockpit-exercise-rail__item').forEach((item) => {
    const name = item.getAttribute('data-liftname');
    const sets = logged[name] || [];
    const done = sets.filter(isCompletedSet).length;
    const isDone = sets.length > 0 && done === sets.length;
    const isActive = name === active;
    const count = item.querySelector('.cockpit-exercise-rail__count');
    if (count) count.textContent = `${done}/${sets.length}`;
    item.classList.toggle('is-done', isDone);
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-current', isActive ? 'step' : 'false');
  });
}

/** Bring the expanded exercise card into view after Start. */
export function scrollCockpitToActiveExercise() {
  const card = document.querySelector('#cockpitExercisesContainer .cockpit-exercise:not(.collapsed)')
    || document.querySelector('#cockpitExercisesContainer .cockpit-exercise');
  card?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export function renderWorkout() {
  // Bail before the app has wired the context. Once the accessors moved behind
  // wrapper functions they became permanently truthy, so this must ask whether
  // the context is READY rather than whether the functions exist.
  if (!workoutContextReady()) return;
  
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());

  const wk = activeWorkoutWeekKey(appState);
  
  if (!appState.weeks) appState.weeks = {};
  if (!appState.weeks[wk]) appState.weeks[wk] = { runs: {}, lifts: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {} };
  
  if (!appState.weeks[wk].runs) appState.weeks[wk].runs = {};
  if (!appState.weeks[wk].lifts) appState.weeks[wk].lifts = {};
  if (!appState.weeks[wk].notes) appState.weeks[wk].notes = {};
  if (!appState.weeks[wk].gymRpe) appState.weeks[wk].gymRpe = {};
  if (!appState.weeks[wk].bodyWeight) appState.weeks[wk].bodyWeight = {};
  if (!appState.weeks[wk].gymStats) appState.weeks[wk].gymStats = {};
  if (!appState.weeks[wk].liftOrder) appState.weeks[wk].liftOrder = {};

  const weekData = appState.weeks[wk];

  const activeProgram = getProgramById(appState.activeProgramId);
  const oneOff = activeOneOffSession(appState);
  const homeBlueprint = oneOffBlueprint(appState,
    activeProgram?.days?.[selectedDay] || { lifts: [], runs: "Rest" });
  const todayProgramDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
  const movedContext = oneOff ? null : rescheduledWorkoutContext(activeProgram, selectedDay, todayProgramDay);
  const cockpitTitle = document.getElementById('cockpitWorkoutTitle');
  const cockpitDayBadge = document.getElementById('cockpitDayBadge');
  const scheduleContext = document.getElementById('cockpitScheduleContext');
  if (cockpitTitle) cockpitTitle.textContent = homeBlueprint.title || 'Workout';
  if (cockpitDayBadge) cockpitDayBadge.textContent = oneOff ? 'One-off' : movedContext ? 'Logging today' : 'Today';
  if (scheduleContext) {
    scheduleContext.hidden = !movedContext;
    scheduleContext.textContent = movedContext
      ? `${movedContext.title} is scheduled ${movedContext.sourceLabel}. This workout will be logged today, ${movedContext.todayLabel}.`
      : '';
  }

  renderRunInputs({ appState, weekData, selectedDay });

  // --- GYM METRICS ---
  const gymContext = weekData.gymStats[selectedDay] || { time: '', avgHR: '', maxHR: '', cals: '' };
  
  const gTimeEl        = document.getElementById('gymInputTime');
  const gAvgHREl       = document.getElementById('gymInputAvgHR');
  const gMaxHREl       = document.getElementById('gymInputMaxHR');
  const gCalsEl        = document.getElementById('gymInputCals');
  const gTEEl          = document.getElementById('gymInputTE');
  const gAerobicTEEl   = document.getElementById('gymInputAerobicTE');
  const gymStatsRow    = document.getElementById('gymStatsRow');

  if (gTimeEl)      gTimeEl.value      = gymContext.time         || '';
  if (gAvgHREl)     gAvgHREl.value     = gymContext.avgHR        || '';
  if (gMaxHREl)     gMaxHREl.value     = gymContext.maxHR        || '';
  if (gCalsEl)      gCalsEl.value      = gymContext.cals         || '';
  if (gTEEl)        gTEEl.value        = gymContext.trainingEffect || '';
  // "Anaerobic TE" field. Read the correctly-named field, falling back to the
  // legacy `aerobicTE` key on sessions saved before the R27 rename.
  if (gAerobicTEEl) gAerobicTEEl.value = (gymContext.anaerobicTE ?? gymContext.aerobicTE) || '';

  const hasGymStats = gymContext.time || gymContext.avgHR || gymContext.maxHR || gymContext.cals ||
                      gymContext.trainingEffect;
  if (gymStatsRow) gymStatsRow.style.display = hasGymStats ? 'block' : 'none';

  renderImportedRunDetails({ appState, weekData, selectedDay });

  const gStats = appState.weeks[wk].gymStats?.[selectedDay] || {};
  const gymSetsContainer = document.getElementById('gymSetsBreakdown');
  const gymSetsTable = document.getElementById('gymSetsTable');
  if (gymSetsContainer && gymSetsTable) {
      if (gStats.gymSets && gStats.gymSets.length > 0) {
          let html = '<div style="font-size: 0.75rem; color: #fff;">';
          gStats.gymSets.forEach(s => {
              html += `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                          <span>Set ${s.set}</span>
                          <span>${s.reps} reps</span>
                          <span>${s.weight} ${escapeHtml(weightUnitLabel(_getState?.() || {}))}</span>
                          <span style="color:var(--accent-blue);">${escapeHtml(String(s.category || ''))}</span>
                       </div>`;
          });
          html += '</div>';
          gymSetsTable.innerHTML = html;
          gymSetsContainer.style.display = 'block';
          
          if (gymStatsRow) gymStatsRow.style.display = 'block';
      } else {
          gymSetsContainer.style.display = 'none';
      }
  }

  renderCockpitRunMap({ appState, weekData, weekKey: wk, selectedDay });

  const notesEl = document.getElementById('sessionNotesInput');
  const gymRpeEl = document.getElementById('sessionGymRpeCockpit');

  if (notesEl) notesEl.value = weekData.notes[selectedDay] || '';
  if (gymRpeEl) gymRpeEl.value = weekData.gymRpe?.[selectedDay] || '';

  const exercisesContainer = document.getElementById('cockpitExercisesContainer');
  positionRunPanel({ homeBlueprint, exercisesContainer });

  const daySelectorBar = document.getElementById('cockpitDaySelectorBar');
  if (daySelectorBar) {
    daySelectorBar.hidden = !!oneOff;
    const pills = daySelectorBar.querySelectorAll('.day-pill');
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const todayKey = todayProgramDay;
    pills.forEach((pill, idx) => {
      const dayKey = days[idx];
      const dayData = activeProgram.days?.[dayKey];
      const badge = dayData?.badge || dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
      const shortDay = dayKey.charAt(0).toUpperCase() + dayKey.slice(1, 3);
      pill.textContent = `${shortDay} (${badge})`;
      // Mark the real calendar day so the selected chip and today are distinct.
      pill.classList.toggle('day-pill--today', dayKey === todayKey);
    });
    // Centre the selected day in the horizontally-scrolling bar. On Sat/Sun the
    // active pill is otherwise off-screen to the right — the "today" chip was
    // invisible exactly when it mattered.
    const selIdx = days.indexOf(selectedDay);
    const activePill = (selIdx >= 0 && pills[selIdx]) || daySelectorBar.querySelector('.day-pill.active');
    if (activePill && typeof activePill.scrollIntoView === 'function') {
      try { activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (_) {}
    }
  }

  // Day-appropriate primary action: the gym START button only makes sense on a
  // day that actually has lifts. On a run-only or rest day it's hidden (the run
  // panel carries its own Start/Track), so "Start Workout" never sits above
  // "No lifting scheduled today".
  const timerKey = workoutSessionKey(appState, wk, selectedDay);
  const timerBound = bindWorkoutTimerSession(timerKey);
  // A BOUND timer is a running session. The old `elapsed > 0` test made the
  // Start CTA reappear for the first second (a start renders at 0s), so a
  // one-tap start showed the button again immediately after starting.
  const timerRunning = timerBound;
  const sessionActive = timerBound || explicitSessionStatus(weekData, selectedDay) === SESSION_STATUS.IN_PROGRESS;
  // Keep the display on only while this workout tab is the visible surface and
  // the session is running. Leaving the tab releases it in app.js; finishing or
  // discarding also releases through that same tab switch.
  syncWorkoutWakeLock({
    enabled: appState.settings?.keepAwake !== false,
    // The tab check matters: renderWorkout can be called while another view is
    // mounted (for example a background refresh), and the screen must not be
    // kept awake for a workout the athlete is not looking at.
    active: sessionActive && Boolean(document.getElementById('view-workout')?.classList.contains('active')),
  });
  document.getElementById('view-workout')?.classList.toggle('cockpit-session-active', sessionActive);
  const activeHead = document.getElementById('cockpitActiveHead');
  const activeRail = document.getElementById('cockpitExerciseRail');
  if (activeHead) activeHead.hidden = !sessionActive;
  if (activeRail) activeRail.hidden = !sessionActive;

  const startBtn = document.getElementById('startWorkoutBtn');
  if (startBtn) {
    const hasGymToday = Array.isArray(homeBlueprint.lifts) && homeBlueprint.lifts.length > 0;
    // `timerRunning` is elapsed > 0, so a render inside the first second of a
    // session put Start back under the running clock. The session being active
    // is the real condition.
    startBtn.style.display = (hasGymToday && !sessionActive) ? '' : 'none';
  }

  if (!exercisesContainer) return;

  const currentScrollY = window.scrollY;
  const previouslyExpandedLift = document.querySelector('.cockpit-exercise:not(.collapsed)')?.getAttribute('data-liftname');

  const timerBar = document.getElementById('cockpitTimerBar');
  const viewWorkoutEl = document.getElementById('view-workout');
  if (timerBar && viewWorkoutEl && timerBar.parentNode !== viewWorkoutEl) {
    viewWorkoutEl.appendChild(timerBar);
  }

  exercisesContainer.innerHTML = '';

  // The routine note is preparation context for a one-off started from the
  // library. It is read by reference (sourceRoutineId → current routine), so an
  // edit is reflected on the next render and a deleted routine leaves no stale
  // copy. A finished session never shows it.
  const routineNote = routineNoteForSession(appState, weekData, selectedDay);
  if (routineNote) {
    // `aside`, not `div`: the exercise cards are divs and existing selectors use
    // `:first-of-type`, so the banner must not become the first div in here.
    const banner = document.createElement('aside');
    banner.className = 'cockpit-routine-note';
    const label = document.createElement('span');
    label.className = 'cockpit-routine-note__label';
    label.textContent = 'Routine note';
    const text = document.createElement('p');
    text.className = 'cockpit-routine-note__text';
    text.textContent = routineNote.note;
    banner.append(label, text);
    exercisesContainer.append(banner);
  }

  const loggedLiftsData = weekData.lifts[selectedDay] || {};

  if (Object.keys(loggedLiftsData).length === 0 && selectedDay !== 'sun') {
    exercisesContainer.innerHTML = buildEmptyWorkoutCard();
  }

  // Ensure liftMeta exists
  if (!weekData.liftMeta) weekData.liftMeta = {};
  if (!weekData.liftMeta[selectedDay]) weekData.liftMeta[selectedDay] = {};
  const liftMeta = weekData.liftMeta[selectedDay];

  const orderedNames = activeSessionLiftNames(weekData, selectedDay, homeBlueprint, { oneOff: !!oneOff });

  // Session outline. Rendered from the SAME ordered names the accordion below
  // uses, so the index can never list an exercise the session does not have.
  renderSessionOutline(loggedLiftsData, orderedNames, previouslyExpandedLift);

  if (sessionActive) {
    const activeLift = previouslyExpandedLift || orderedNames[0] || null;
    renderCockpitExerciseRail(loggedLiftsData, orderedNames, activeLift);
    refreshCockpitActiveStats();
  }

  // Build the circuit map in the session's OWN display order. Iterating
  // `loggedLiftsData` used `for…in` (object-key order), so a 3-member group
  // rendered in insertion order while the rest of the cockpit was ordered by
  // `liftOrder`. Quarantined historical rows still never appear here.
  /** @type {Record<string, string[]>} */
  const groupMap = {};
  for (const ln of orderedNames) {
    // A malformed legacy id (the old allocator could reach `[`) is not a
    // circuit: it renders as an ungrouped card and the panel starts a fresh A.
    const gId = normaliseGroupId(liftMeta[ln]?.groupId);
    if (!gId) continue;
    const members = membersInOrder(weekData, selectedDay, ln, orderedNames);
    if (members.length > 0) groupMap[gId] = members;
  }

  const renderedLifts = new Set();
  let isFirstAccordionField = true;

  for (const liftName of orderedNames) {
    if (renderedLifts.has(liftName)) continue;
    const setsArr = loggedLiftsData[liftName];
    if (!Array.isArray(setsArr)) continue;

    const groupId     = normaliseGroupId(liftMeta[liftName]?.groupId);
    const groupMembers = groupId && groupMap[groupId]?.length > 1 ? groupMap[groupId] : null;

    if (groupMembers) {
      const ssColor = colorForGroupId(groupId);
      const circuit = roundState(weekData, selectedDay, liftName, { orderedNames });
      const wrapper = document.createElement('div');
      wrapper.className = `superset-group${circuit?.complete ? ' is-complete' : ''}`;
      wrapper.style.setProperty('--ss-color', ssColor);
      wrapper.setAttribute('data-group-id', groupId);

      const hdr = document.createElement('div');
      hdr.className = 'superset-group-header';
      hdr.innerHTML = `<span class="superset-badge">SS ${escapeHtml(String(groupId))}</span><span class="superset-group-meta">· ${groupMembers.length} exercises · rest after the last</span><span class="superset-group-progress">${circuit ? `· ${circuit.doneMembers} of ${circuit.members.length} done` : ''}</span>`;
      wrapper.appendChild(hdr);

      groupMembers.forEach((memberLift, mIdx) => {
        if (!Array.isArray(loggedLiftsData[memberLift])) return;
        const memberSets = loggedLiftsData[memberLift];
        const mCompleted = memberSets.length > 0 && memberSets.every(isCompletedSet);

        let mCollapsed = true;
        if (previouslyExpandedLift === memberLift) {
          mCollapsed = false;
          // The explicitly open member owns the accordion. Without clearing the
          // flag, a later group member matches `previouslyExpandedLift` while
          // the FIRST member also auto-opens — two cards open at once.
          isFirstAccordionField = false;
        } else if (isFirstAccordionField && !mCompleted) {
          mCollapsed = false;
          isFirstAccordionField = false;
        }

        const card = _buildExerciseCardEl(
          memberLift, loggedLiftsData, weekData, wk, selectedDay, appState, homeBlueprint,
          mCollapsed, groupId, ssColor, groupMembers.length,
          { index: mIdx + 1, total: groupMembers.length },
        );
        if (card) wrapper.appendChild(card);

        if (mIdx < groupMembers.length - 1) {
          const connector = document.createElement('div');
          connector.className = 'superset-connector';
          connector.textContent = `↕ ${mIdx + 2} of ${groupMembers.length}`;
          wrapper.appendChild(connector);
        }
        renderedLifts.add(memberLift);
      });

      exercisesContainer.appendChild(wrapper);
    } else {
      const isCompleted = setsArr.length > 0 && setsArr.every(isCompletedSet);
      let isCollapsed = true;
      if (previouslyExpandedLift === liftName) isCollapsed = false;
      else if (isFirstAccordionField && !isCompleted) { isCollapsed = false; isFirstAccordionField = false; }

      const card = _buildExerciseCardEl(liftName, loggedLiftsData, weekData, wk, selectedDay, appState, homeBlueprint, isCollapsed, null, null);
      if (card) exercisesContainer.appendChild(card);
      renderedLifts.add(liftName);
    }
  }

  try {
    window.scrollTo(0, currentScrollY);
    moveRestTimerToActiveExercise();
    mountExerciseDragAndDropSystems();
    _wireDaySwipe();
  } catch(e) { console.warn(e); }

  updateCockpitCoaching(appState, selectedDay, activeProgram);
}

// C4c — swipe left/right on the exercise list to move between workout days, a
// native gesture expectation. Wired once; drives the existing day-pill switcher
// so all the commit/render/state handling is reused. Ignores vertical scrolls
// and short/slow drags so it never fights the list scroll.
function _wireDaySwipe() {
  const view = document.getElementById('cockpitExercisesContainer');
  if (!view || view._swipeWired) return;
  view._swipeWired = true;
  let x0 = null, y0 = null, t0 = 0;
  view.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  view.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0;
    x0 = null;
    if (dt > 600) return;                                  // too slow to be a swipe
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // not clearly horizontal
    _swipeToDay(dx < 0 ? 1 : -1);                          // swipe left → next day
  }, { passive: true });
}

function _swipeToDay(dir) {
  const pills = Array.from(document.querySelectorAll('#cockpitDaySelectorBar .day-pill'));
  const days = pills.map(p => p.getAttribute('data-day'));
  const target = neighborDay(days, _getSelectedDay(), dir);
  if (!target) return;
  const pill = pills.find(p => p.getAttribute('data-day') === target);
  pill?.click();  // routes through the set-day action (commit + render reused)
}

// The cockpit's coaching voice: a decisive, consequence-first intent line (the
// recommendation headline — same voice as the briefing, no mechanism numbers)
// and a live forward hook ("… train and it rises to 85") that recomputes as the
// session is logged. Best-effort: never blocks the cockpit if the engine can't run.
export function updateCockpitCoaching(appState, selectedDay, activeProgram) {
  const statusEl = document.getElementById('cockpitSessionStatus');
  const hookEl   = document.getElementById('cockpitScoreHook');
  if (!statusEl && !hookEl) return;
  if (activeOneOffSession(appState)) {
    if (statusEl) statusEl.textContent = 'One-off strength workout';
    if (hookEl) hookEl.textContent = 'This session stays separate from your program schedule.';
    return;
  }
  try {
    const days    = _getDays ? _getDays() : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const program = activeProgram || getProgramById(appState.activeProgramId);
    const model   = computeDashboardModel(appState, days, program, selectedDay);

    if (statusEl) {
      const rec = generateRecommendation(appState, days, program, selectedDay);
      if (rec?.headline) statusEl.textContent = rec.headline;
    }
    if (hookEl) {
      const line = projectionLine(projectScore(model, appState, days));
      if (line) { hookEl.textContent = line; hookEl.style.display = ''; }
      else { hookEl.style.display = 'none'; }
    }
  } catch (_) { /* coaching is best-effort */ }
}

// Stamp the calendar date the first time a day has a completed set, so the
// workout shows on the activity calendar. Idempotent; covers every completion
// path (manual checkbox, one-tap quick log, commit-on-navigate).
function _ensureWorkoutDateStamp(appState, wk, day) {
  const dayLifts = appState.weeks?.[wk]?.lifts?.[day];
  if (!dayLifts) return;
  const hasCompleted = Object.values(dayLifts).some(sets => Array.isArray(sets) && sets.some(isCompletedSet));
  if (!hasCompleted) return;
  if (!appState.weeks[wk].dates) appState.weeks[wk].dates = {};
  if (!appState.weeks[wk].dates[day]) appState.weeks[wk].dates[day] = dateKey();
}

// Per-set comparison against the same set index last session. Shared by the
// manual tick and the one-tap/log-all paths so a quick log cannot skip it.
function applySetComparison(parentRow, value, mode = SET_MODE.REPS, weight = 0) {
  const prevEl = parentRow?.querySelector('.set-prev-col');
  if (!prevEl || prevEl.classList.contains('is-empty')) return;
  // The prior numbers are stamped on the PREVIOUS cell by the row template, so
  // the comparison can be refreshed in place instead of waiting for a full
  // re-render — the tick does not redraw the cockpit.
  const prior = {
    c: true,
    w: prevEl.getAttribute('data-prev-w') || '',
    mode: prevEl.getAttribute('data-prev-mode') || SET_MODE.REPS,
    r: prevEl.getAttribute('data-prev-r') || '',
    sec: prevEl.getAttribute('data-prev-value') || '',
    dist: prevEl.getAttribute('data-prev-value') || '',
  };
  const current = {
    c: true, w: String(weight), mode,
    r: mode === SET_MODE.REPS ? String(value) : '',
    sec: mode === SET_MODE.TIME ? String(value) : '',
    dist: mode === SET_MODE.DISTANCE ? String(value) : '',
  };
  const result = compareWithPrevious(current, prior);
  let cmp = prevEl.querySelector('.set-cmp');
  if (!result) { cmp?.remove(); return; }
  if (!cmp) {
    cmp = document.createElement('span');
    prevEl.appendChild(cmp);
  }
  cmp.className = `set-cmp set-cmp--${result.tone}`;
  cmp.textContent = result.glyph;
  cmp.setAttribute('aria-label', result.label);
  cmp.title = result.label;
}

// PR detection for one completed set, shape-aware via the shared records model.
// Extracted from the tick path so quick-log and log-all get the same live PR
// feedback instead of only manual ticks. Called for EVERY shape: a 60-second
// hold earns a Hold PR and a 40 m carry a Carry PR, never an estimated 1RM.
//
// The function always SYNCHRONISES the row: when the candidate no longer earns
// the record (a corrected-down weight, a shape change, a bodyweight load) it
// removes the class, badge and stored stamp. That removal branch is why a set
// edited after it was ticked cannot keep a trophy it no longer deserves.
//
// `options.justTicked` marks the unticked→ticked transition. The baseline toast
// ("Baseline set — not a trophy") belongs to that moment only; a completed row
// corrected on blur must not re-announce it.
export function detectSetPR(parentRow, liftName, setIndex, candidate, appState, weekKey, day, options = {}) {
  if (!parentRow || !liftName || setIndex < 0) return null;
  const storedSet = appState.weeks?.[weekKey]?.lifts?.[day]?.[liftName]?.[setIndex] || null;
  const live = { ...(storedSet || {}), ...(candidate || {}), c: true };
  const wasPR = parentRow.classList.contains('is-pr') || storedSet?.isPR === true;
  // The preference silences the BANNER only. Detection, the badge and the
  // persisted `isPR`/`prKind` evidence stay identical; a hidden banner must not
  // change what the athlete's history says.
  const announce = appState.settings?.livePR !== false;
  if (isWarmupSet(live)) { clearSetPR(parentRow, storedSet); return null; }
  const kind = recordKindForSet(live, liftName);
  if (!kind) { clearSetPR(parentRow, storedSet); return null; }
  const before = bestRecordBefore(appState, liftName, {
    excludeWeekKey: weekKey,
    excludeDay: day,
    beforeDate: appState.weeks?.[weekKey]?.dates?.[day] || dateKey(),
  });
  // Rep records are bucketed by load. A single-set candidate has exactly one
  // bucket, so take it rather than indexing an array as if it were a record.
  const sessionRecords = bestRecordForSession(liftName, [live]);
  const record = kind === RECORD_KIND.REPS ? (sessionRecords.reps[0] || null) : sessionRecords[kind];
  if (!record || !isRecord(kind, record, before[kind])) {
    const noPrior = kind === RECORD_KIND.REPS
      ? !(Array.isArray(before?.reps) && before.reps.length > 0)
      : !(Number(before?.[kind]?.value) > 0);
    clearSetPR(parentRow, storedSet);
    if (options.justTicked === true && !wasPR && kind === 'e1rm' && noPrior && announce) {
      showToast(`Baseline set — ${liftName} ✓`);
    }
    return null;
  }
  parentRow.classList.add('is-pr');
  if (parentRow.dataset) parentRow.dataset.prKind = kind;
  let badge = parentRow.querySelector('.pr-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'pr-badge';
    parentRow.appendChild(badge);
  }
  badge.textContent = prKindLabel(kind);
  // Persist additively. `prKind` names what was measured so a re-render shows
  // "Hold PR"/"Carry PR" instead of a generic trophy.
  if (storedSet) {
    storedSet.isPR = true;
    storedSet.prKind = kind;
  }
  if (!wasPR && announce) {
    hapticSuccess();
    showToast(kind === 'e1rm'
      ? `🏆 New PR — ${liftName}!`
      : `🏆 ${prKindLabel(kind)} — ${liftName}!`);
  }
  return { kind, record };
}

/** Remove a row's PR presentation and its stored stamp, if any. */
function clearSetPR(parentRow, storedSet) {
  parentRow?.classList.remove('is-pr');
  parentRow?.querySelector('.pr-badge')?.remove();
  if (parentRow?.dataset) delete parentRow.dataset.prKind;
  if (storedSet && typeof storedSet === 'object') {
    delete storedSet.isPR;
    delete storedSet.prKind;
  }
}

/**
 * Start (or explicitly suppress) the rest that follows one ticked set.
 *
 * A circuit gets ONE governing duration resolved across every member, so a
 * Bench/Curl round rests the same 180 s whichever member was ticked last.
 * Ungrouped lifts keep the exact single-set precedence path.
 *
 * @param {any} appState
 * @param {string} weekKey
 * @param {string} day
 * @param {string} liftName
 * @param {number} setIndex
 * @param {any} set
 * @param {string} setType
 * @param {number|string|null|undefined} planRest
 * @param {number|string|null|undefined} setRpe
 */
function _startRestAfterTickedSet(appState, weekKey, day, liftName, setIndex, set, setType, planRest, setRpe) {
  if (!liftName || !Number.isInteger(setIndex) || setIndex < 0) return;
  const weekData = appState?.weeks?.[weekKey];
  if (!weekData) return;
  if (!shouldRestAfterSet(weekData, day, liftName, { setIndex, set })) return;

  const groupDuration = groupRestDuration(weekData, day, liftName, {
    setIndex,
    set,
    setRpe,
    restTiers: getRestTiers(),
    restOverrides: appState.settings?.restOverrides || {},
    planRestFor: (name) => getProgramById(appState.activeProgramId)
      ?.prescriptions?.[day]?.[name]?.restSec,
  });

  if (groupDuration == null) {
    triggerRestTimerEngine(liftName, setRpe, setType, planRest, set?.restSec);
    return;
  }
  if (groupDuration > 0) {
    triggerRestTimerEngine(liftName, setRpe, setType, planRest, null, groupDuration);
  } else {
    dismissRestTimer();
  }
}

export function executeOneTapQuickLog(labelNode, liftName, sIdx, options = {}) {
  if (!labelNode) return;
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);
  
  const parentRow = labelNode.closest('.cockpit-set-row');
  if (!parentRow) return;

  const wInput = parentRow.querySelector('.input-weight-node');
  const valueInput = _setValueInput(parentRow);
  const checkbox = parentRow.querySelector('.gym-check');
  const setShape = parentRow.getAttribute('data-set-mode') || SET_MODE.REPS;

  let targetW = wInput.value;
  let targetV = valueInput?.value || '';

  // Fall back to the on-screen ghost (the placeholder) — it now carries the
  // auto-progression suggestion, so one-tap logs exactly what the coach shows.
  // The default placeholders ("kg"/"reps"/"0:00"/"m") are non-numeric and ignored.
  if (!targetW) {
    const ph = wInput.getAttribute('placeholder');
    if (ph && !isNaN(parseFloat(ph))) targetW = ph;
  }
  if (!targetV && valueInput) {
    const ph = valueInput.getAttribute('placeholder');
    if (setShape === SET_MODE.TIME) {
      const seconds = parseDuration(ph);
      if (seconds != null) targetV = formatDuration(seconds);
    } else if (setShape === SET_MODE.DISTANCE) {
      if (ph && !isNaN(parseFloat(ph))) targetV = ph;
    } else {
      const reps = _numericPlaceholder(valueInput);
      if (reps != null) targetV = String(reps);
    }
  }

  // Carry forward the athlete's own earlier set this session (straight sets), so
  // one-tapping S2–S3 copies S1 instead of inventing numbers.
  if (!targetW || !targetV) {
    const inh = _inheritedSetFromSession(parentRow.closest('.cockpit-exercise'), parentRow);
    if (inh) {
      if (!targetW) targetW = inh.w;
      if (inh.mode && inh.mode !== SET_MODE.REPS) {
        if (!targetV) targetV = inh.value || '';
      } else if (!targetV) {
        targetV = inh.r || '';
      }
    }
  }

  // Nothing honest to log (no typed value, active target, or prior set) —
  // ask for the numbers rather than fabricating a 40×10. Matches the manual-tick
  // path, which bounces the same way instead of inventing a load.
  if (!targetW || !targetV) {
    const wanted = setShape === SET_MODE.TIME ? 'time'
      : setShape === SET_MODE.DISTANCE ? 'distance' : 'reps';
    showToast(`Enter weight & ${wanted} first`, true);
    (!targetW ? wInput : valueInput)?.focus();
    return;
  }

  wInput.value = targetW;
  if (valueInput) valueInput.value = targetV;
  if (checkbox) checkbox.checked = true;

  if (!appState.weeks[wk].lifts[selectedDay]) appState.weeks[wk].lifts[selectedDay] = {};
  if (!appState.weeks[wk].lifts[selectedDay][liftName]) appState.weeks[wk].lifts[selectedDay][liftName] = [];

  // E5 — record the PRESCRIBED target (the ghost placeholder) distinctly from the
  // actual, so true-adherence is measurable later. Read the placeholder, not the
  // logged value, so it's the coach's prescription even if the athlete typed a
  // different number. Additive + never overwritten: default "kg"/"reps" ghosts are
  // non-numeric and skipped, and an existing target is preserved.
  const _tw = _numericPlaceholder(wInput);
  const _tr = setShape === SET_MODE.REPS ? _prescribedRepGoal(valueInput) : null;

  // Merge — never replace: preserve any existing set metadata (type, rpe, isPR)
  // so quick-logging a warmup/drop set doesn't silently demote it to a working set.
  const _setArr = appState.weeks[wk].lifts[selectedDay][liftName];
  let _prev = _setArr[sIdx] || {};
  const loadMode = parentRow.dataset?.loadMode;
  // A blank row can carry an inferred or per-exercise default resistance
  // (Bodyweight/Assisted/Band). Persist that same mode when its labelled
  // shortcut is used, so the first tap is honest metadata rather than an
  // untyped numeric weight.
  if (loadMode && loadMode !== 'weighted' && !_prev.loadMode && !_prev.bw && !_prev.band) {
    _prev = applyLoadMode(_prev, loadMode, {
      bodyweight: _currentBodyweight(appState),
      bandWeights: appState.settings?.bandWeights,
    });
  }
  const quickSet = { ..._prev, w: targetW, c: true, mode: setShape };
  if (setShape === SET_MODE.TIME) quickSet.sec = parseDuration(targetV) || 0;
  else if (setShape === SET_MODE.DISTANCE) quickSet.dist = parseFloat(targetV) || 0;
  else quickSet.r = targetV;
  _setArr[sIdx] = quickSet;
  const quickBasis = parentRow.getAttribute('data-load-basis');
  if (quickBasis) _setArr[sIdx].basis = quickBasis;
  if (_tw != null && _prev.tw == null) _setArr[sIdx].tw = _tw;
  if (_tr != null && _prev.tr == null) _setArr[sIdx].tr = _tr;
  _ensureWorkoutDateStamp(appState, wk, selectedDay);

  parentRow.classList.add('is-complete');
  hapticTick();

  try {
    const gymRpeEl = document.getElementById('sessionGymRpeCockpit');
    const setRpe = gymRpeEl && gymRpeEl.value ? parseFloat(gymRpeEl.value) : null;
    const stored = appState.weeks[wk].lifts?.[selectedDay]?.[liftName]?.[sIdx] || {};
    const setType = stored.type || '';
    const planRest = getProgramById(appState.activeProgramId)?.prescriptions?.[selectedDay]?.[liftName]?.restSec;
    // A circuit rests once after its LAST member, with one governing duration.
    // `suppressRest` is used by Log all → so a batch starts exactly one rest.
    if (options?.suppressRest !== true) {
      _startRestAfterTickedSet(appState, wk, selectedDay, liftName, sIdx, stored, setType, planRest, setRpe);
    }
  } catch(e) { console.warn(e); }

  const quickW = parseFloat(targetW);
  // Every shape gets live PR feedback; a hold/carry was previously skipped
  // entirely because detection only ran for REPS.
  detectSetPR(parentRow, liftName, sIdx, {
    ...(_setArr[sIdx] || {}),
    w: targetW,
    mode: setShape,
    c: true,
  }, appState, wk, selectedDay, { justTicked: true });
  applySetComparison(parentRow, _setRowValue(setShape, targetV), setShape, quickW);

  _saveState(true);
  evaluateAccordionAutoFlowTransitions();
}

// T1 Block-2 (weeks 7–11) live back-off recalculation. When the day's top-set
// weight changes, recompute the 85%/90% suggestion for every dayRepMax back-off
// row in the SAME exercise card and refresh its placeholder + source line —
// without a re-render or reload. A row the athlete has already filled is a
// deliberate override and is left untouched. Clearing the top set clears the
// suggestion (restores the row's default ghost) rather than leaving a stale load.
function recalcJtBackoff(exCard) {
  if (!exCard || typeof exCard.querySelector !== 'function') return;
  const topRow = exCard.querySelector('.cockpit-set-row[data-set-role="repmax"]');
  if (!topRow) return;
  const topW = parseFloat(topRow.querySelector('.input-weight-node')?.value);
  const valid = Number.isFinite(topW) && topW > 0;
  const unit = _getState?.()?.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  exCard.querySelectorAll('.cockpit-set-row[data-bo-src="dayRepMax"]').forEach((row) => {
    const wInput = row.querySelector('.input-weight-node');
    if (!wInput) return;
    const pct = parseFloat(row.getAttribute('data-bo-pct'));
    const suggest = valid ? jtBackoffFromTopSet(topW, pct) : null;
    const hasValue = String(wInput.value || '').trim() !== '';
    if (!hasValue) {
      wInput.placeholder = suggest != null ? String(suggest) : (wInput.getAttribute('data-ghost-default') || unit);
    }
    const hintEl = row.querySelector('.set-backoff-hint');
    if (hintEl) hintEl.textContent = suggest != null ? `${pct}% of ${topW}${unit} top set · ${suggest}${unit}` : '';
  });
}

// Ghost targets #4 — accept the coach's suggestion for the whole exercise in one
// tap: fill + complete every incomplete WORKING set from its ghost target,
// reusing the exact one-tap path (PR detection, prescribed-vs-actual capture,
// rest timer, persistence). Warm-ups and already-logged sets are left alone.
export function logAllAtTarget(liftName) {
  const card = document.querySelector(`.cockpit-exercise[data-liftname="${(window.CSS && CSS.escape) ? CSS.escape(liftName) : liftName}"]`);
  if (!card) return;
  let logged = 0;
  // A batch must not start and restart a group's rest on every row. Log quietly,
  // then start at most ONE rest from the last rest-worthy row (skip drop rows:
  // they never start a rest and must not hide the group rest for the working
  // row before them).
  let lastRestIndex = null;
  Array.from(card.querySelectorAll('.cockpit-set-row')).forEach(row => {
    if (row.classList.contains('is-complete') || row.classList.contains('type-warmup')) return;
    const sIdx = parseInt(row.getAttribute('data-set-index'), 10);
    if (!isNaN(sIdx)) {
      executeOneTapQuickLog(row, liftName, sIdx, { suppressRest: true });
      logged++;
      if (!row.classList.contains('type-dropset')) lastRestIndex = sIdx;
    }
  });
  if (logged > 0) {
    const appState = _getState();
    const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
    const wk = activeWorkoutWeekKey(appState);
    if (lastRestIndex != null) {
      const stored = appState.weeks?.[wk]?.lifts?.[selectedDay]?.[liftName]?.[lastRestIndex] || {};
      const gymRpeEl = document.getElementById('sessionGymRpeCockpit');
      const setRpe = gymRpeEl && gymRpeEl.value ? parseFloat(gymRpeEl.value) : null;
      const planRest = getProgramById(appState.activeProgramId)?.prescriptions?.[selectedDay]?.[liftName]?.restSec;
      _startRestAfterTickedSet(
        appState, wk, selectedDay, liftName, lastRestIndex, stored,
        stored.type || '', planRest, setRpe,
      );
    }
    hapticSuccess();
    showToast(`Logged ${logged} set${logged > 1 ? 's' : ''} at target ✓`);
  }
}

// Bring the latest exact exercise performance into the current draft without
// claiming the work is complete. Existing typed values, load modes, set types
// and completion flags are never overwritten.
export function usePreviousValues(liftName) {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);
  const sets = appState.weeks?.[wk]?.lifts?.[selectedDay]?.[liftName];
  const card = document.querySelector(`.cockpit-exercise[data-liftname="${(window.CSS && CSS.escape) ? CSS.escape(liftName) : liftName}"]`);
  if (!Array.isArray(sets) || !card) return;
  const previous = exerciseLoggerHistory(appState, liftName, {
    weekKey: wk, day: selectedDay,
    beforeDate: appState.weeks?.[wk]?.dates?.[selectedDay] || dateKey(),
    scope: appState.settings?.previousValuesScope === 'program' ? 'program' : 'all',
  }).latest?.workingSets || [];
  let previousIndex = 0;
  let filled = 0;
  sets.forEach((set, setIndex) => {
    if (isWarmupSet(set)) return;
    const prior = previous[previousIndex++];
    if (!prior) return;
    const row = card.querySelector(`.cockpit-set-row[data-set-index="${setIndex}"]`);
    const weightInput = row?.querySelector('.input-weight-node');
    const valueInput = row ? _setValueInput(row) : null;
    const rowMode = row?.getAttribute('data-set-mode') || SET_MODE.REPS;
    const priorMode = setModeOf(prior);
    let changed = false;
    if (!String(set?.w || '').trim() && String(prior?.w || '').trim()) {
      set.w = prior.w; if (weightInput) weightInput.value = String(prior.w); changed = true;
    }
    if (priorMode === rowMode) {
      if (rowMode === SET_MODE.TIME && !String(set?.sec ?? '').trim() && Number(prior.sec) > 0) {
        set.sec = prior.sec; if (valueInput) valueInput.value = formatDuration(prior.sec); changed = true;
      } else if (rowMode === SET_MODE.DISTANCE && !String(set?.dist ?? '').trim() && Number(prior.dist) > 0) {
        set.dist = prior.dist; if (valueInput) valueInput.value = formatDistance(prior.dist); changed = true;
      } else if (rowMode === SET_MODE.REPS && !String(set?.r || '').trim() && String(prior?.r || '').trim()) {
        set.r = prior.r; if (valueInput) valueInput.value = String(prior.r); changed = true;
      }
    }
    if (changed) filled++;
  });
  if (!filled) { showToast('Current values already filled'); return; }
  markSessionInProgress(appState.weeks[wk], selectedDay);
  _saveState(true);
  showToast(`Previous values added to ${filled} ${filled === 1 ? 'set' : 'sets'}`);
}

export function updateInputState(inputNode) {
  if (!inputNode) return;
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);
  const exCard = inputNode.closest('.cockpit-exercise');
  if (!exCard) return;
  
  const liftName = exCard.getAttribute('data-liftname');
  const row = inputNode.closest('.cockpit-set-row');
  if (!row) return;
  
  const sIdx = Array.from(exCard.querySelectorAll('.cockpit-set-row')).indexOf(row);

  // Also cleared live on `input` (see the document input listener); repeated
  // here so a programmatic value change that only fires `change` clears it too.
  setRowMessage(row, null);

  if (!appState.weeks[wk].lifts[selectedDay]) appState.weeks[wk].lifts[selectedDay] = {};
  if (!appState.weeks[wk].lifts[selectedDay][liftName]) appState.weeks[wk].lifts[selectedDay][liftName] = [];
  if (!appState.weeks[wk].lifts[selectedDay][liftName][sIdx]) {
    appState.weeks[wk].lifts[selectedDay][liftName][sIdx] = { w: '', r: '', c: false };
  }

  // E5 — capture the prescribed target (ghost placeholder) alongside the actual,
  // additively, so a manually-typed set still records what it was measured against.
  const setObj = appState.weeks[wk].lifts[selectedDay][liftName][sIdx];
  markSessionInProgress(appState.weeks[wk], selectedDay);
  const isRepInput = inputNode.classList.contains('input-reps-node');
  const ph = isRepInput
    ? _prescribedRepGoal(inputNode)
    : _numericPlaceholder(inputNode);
  if (inputNode.classList.contains('input-weight-node')) {
    setObj.w = inputNode.value;
    if (ph != null && setObj.tw == null) setObj.tw = ph;
    // Opt-in auto ramp: after the first working weight is entered, add an
    // editable ladder above it once. The liftMeta stamp means deleting a
    // warm-up does not bring it back on the next edit.
    const rampExercise = resolveExercise(liftName);
    const rampEquipment = rampExercise?.equipment || [];
    const isBarbellLift = rampEquipment.includes('barbell');
    // Dumbbells have no bar to subtract, so they ramp on the owned ladder
    // instead. An unconfigured ladder yields no ramp rather than inventing
    // weights the athlete does not own.
    const isDumbbellLift = !isBarbellLift && rampEquipment.includes('dumbbells');
    if (shouldAutoWarmup(appState, liftName) && (isBarbellLift || isDumbbellLift)) {
      const sets = appState.weeks[wk].lifts[selectedDay][liftName];
      const firstWorking = sets.findIndex((set) => !isWarmupSet(set));
      if (sIdx === firstWorking) {
        const unit = appState.settings?.weightUnit || 'kg';
        const setup = isBarbellLift
          ? getActivePlateSetup(appState, unit)
          : {
            dumbbells: getActiveDumbbells(appState, unit),
            basis: setObj.basis || preferredLoadBasis(appState, liftName),
          };
        if (addWarmupRamp(appState.weeks[wk], selectedDay, liftName, inputNode.value, {
          ...setup, unit, rungs: rampSetsFor(rampExercise),
        })) {
          _saveState(true);
          renderWorkout();
          return;
        }
      }
    }
  } else if (inputNode.classList.contains('input-time-node')) {
    const seconds = parseDuration(inputNode.value);
    setObj.sec = inputNode.value.trim() === '' ? '' : (seconds != null ? seconds : setObj.sec);
  } else if (inputNode.classList.contains('input-dist-node')) {
    setObj.dist = inputNode.value;
  } else {
    setObj.r = inputNode.value;
    if (ph != null && setObj.tr == null) setObj.tr = ph;
  }
  // A COMPLETED row can still be corrected. `updateInputState` is driven by
  // `change`/blur, not by every keystroke, so this re-evaluation costs one
  // history scan when the athlete leaves the field — not one per typed digit.
  // Tick, quick-log and log-all stay immediate (they pass `justTicked`).
  if (isCompletedSet(setObj)) {
    detectSetPR(row, liftName, sIdx, setObj, appState, wk, selectedDay);
  }
  // High-frequency keystroke path: debounce the local write instead of
  // serialising the whole state on every digit. Set-completion, quick-log and
  // finish still persist immediately (they use _saveState). A backgrounded app
  // flushes any pending write (state.js pagehide/visibilitychange).
  _scheduleSave();
}

export function commitWorkoutUIState() {
  // The cockpit can be hidden behind the Train landing. Its blank scaffolding
  // must never be committed as a draft — doing so marked the day in_progress
  // before the athlete had started it.
  const cockpit = typeof document !== 'undefined' ? document.getElementById('trainCockpit') : null;
  if (cockpit && cockpit.hidden) return;
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);
  const weekData = appState.weeks[wk];

  commitRunLogging({ appState, weekData, selectedDay });

  if (!weekData.gymStats) weekData.gymStats = {};
  const gTimeEl = document.getElementById('gymInputTime');
  const gAvgHREl = document.getElementById('gymInputAvgHR');
  const gMaxHREl = document.getElementById('gymInputMaxHR');
  const gCalsEl = document.getElementById('gymInputCals');

  if (gTimeEl && gTimeEl.offsetParent !== null) {
    // Spread existing so .FIT-imported extras (trainingEffect, anaerobicTE,
    // gymSets) survive — they have no inputs here and would otherwise be wiped.
    const existingGym = weekData.gymStats[selectedDay] || {};
    weekData.gymStats[selectedDay] = {
        ...existingGym,
        time: gTimeEl.value,
        avgHR: gAvgHREl ? gAvgHREl.value : '',
        maxHR: gMaxHREl ? gMaxHREl.value : '',
        cals: gCalsEl ? gCalsEl.value : ''
    };
  }

  const notesEl = document.getElementById('sessionNotesInput');
  const rpeGymEl = document.getElementById('sessionGymRpeCockpit');

  if (notesEl && notesEl.offsetParent !== null) weekData.notes[selectedDay] = notesEl.value;
  
  if (rpeGymEl && rpeGymEl.offsetParent !== null) {
    if (!weekData.gymRpe) weekData.gymRpe = {};
    weekData.gymRpe[selectedDay] = rpeGymEl.value;
  }

  const targetCardContainer = document.getElementById('cockpitExercisesContainer');
  if (targetCardContainer) {
    targetCardContainer.querySelectorAll('.cockpit-exercise').forEach(exCard => {
      const liftName = exCard.getAttribute('data-liftname');
      exCard.querySelectorAll('.cockpit-set-row').forEach((row, idx) => {
        if (appState.weeks[wk].lifts[selectedDay]?.[liftName]?.[idx]) {
          const wIn = row.querySelector('.input-weight-node');
          const valueIn = _setValueInput(row);
          const cIn = row.querySelector('.gym-check');
          const mode = row.getAttribute('data-set-mode') || SET_MODE.REPS;
          
          const storedSet = appState.weeks[wk].lifts[selectedDay][liftName][idx];
          // Do not persist the bodyweight/assisted DISPLAY prefill on a blank,
          // unticked row. It is the athlete's mass shown as a convenience, not
          // an entered load, and writing it made opening a workout look like a
          // draft (and marked the session in_progress).
          const hasValue = String(valueIn?.value ?? '').trim() !== '';
          const hasStoredWeight = String(storedSet.w ?? '').trim() !== '';
          const isTicked = !!cIn?.checked;
          if (wIn && (isTicked || hasValue || hasStoredWeight)) storedSet.w = wIn.value;
          const hadStoredValue = storedSet.sec != null || storedSet.dist != null || String(storedSet.r ?? '').trim() !== '';
          if (valueIn && (isTicked || hasValue || hadStoredValue)) {
            if (mode === SET_MODE.TIME) {
              // Clearing the field clears the stored hold; invalid partial text
              // is not committed (the tick is refused until it parses).
              storedSet.sec = parseDuration(valueIn.value) ?? '';
            } else if (mode === SET_MODE.DISTANCE) {
              storedSet.dist = valueIn.value.trim() === '' ? '' : (parseFloat(valueIn.value) || '');
            } else {
              storedSet.r = valueIn.value;
            }
            // Persist the shape only once there is real user data, so a blank
            // scaffold row stays untouched for the prescription reconciler.
            if (isTicked || hasValue) storedSet.mode = mode;
          }
          if (cIn) storedSet.c = cIn.checked;
          // Stamp the dumbbell basis only once there is real user data. A blank
          // scaffold row must not gain `basis` and stop being recognised as
          // untouched by the prescription reconciler.
          const rowBasis = row.getAttribute('data-load-basis');
          if (rowBasis && (isTicked || hasValue || hasStoredWeight)) storedSet.basis = rowBasis;
          // Stamp a non-weighted default only once real work exists. The row's
          // effective load already reflects it; this keeps the set's stored
          // meaning explicit instead of re-inferring it on every reader.
          const rowLoadMode = row.getAttribute('data-load-mode');
          if (rowLoadMode && rowLoadMode !== 'weighted' && !storedSet.loadMode
            && !storedSet.bw && !storedSet.band && (isTicked || hasValue || hasStoredWeight)) {
            storedSet.loadMode = rowLoadMode;
            if (rowLoadMode === 'bodyweight') storedSet.bw = true;
            else storedSet.band = storedSet.band || 'M';
          }
          // PR stamps are written by detectSetPR (shape-aware, with `prKind`)
          // and cleared there when a corrected set no longer earns one. Copying
          // the row's class here used to persist a stale badge forever.
        }
      });
    });
  }
  _ensureWorkoutDateStamp(appState, wk, selectedDay);
  if (hasDayWorkoutDraft(weekData, selectedDay)) markSessionInProgress(weekData, selectedDay);
  try { updateExercisePRs(); } catch(e) { console.warn(e); }
  _saveState(true);
}

export function updateExercisePRs() {
  const appState = _getState();
  if (!appState.exerciseStats) appState.exerciseStats = {};
  computeExercisePRs(appState, appState.exerciseStats);
}

export function toggleGymCheckLoggingState(checkboxNode) {
  if (!checkboxNode) return;
  const parentRow = checkboxNode.closest('.cockpit-set-row');
  const exCard = checkboxNode.closest('.cockpit-exercise');
  const lifecycleState = _getState();
  const lifecycleWeek = activeWorkoutWeekKey(lifecycleState);
  const lifecycleDay = activeWorkoutDayForWeek(lifecycleState, lifecycleWeek, _getSelectedDay());
  markSessionInProgress(lifecycleState.weeks?.[lifecycleWeek], lifecycleDay);
  
  if (checkboxNode.checked) {
    if (parentRow) parentRow.classList.add('is-complete');

    const wInput = parentRow ? parentRow.querySelector('.input-weight-node') : null;
    const valueInput = parentRow ? _setValueInput(parentRow) : null;
    const rowMode = parentRow?.getAttribute('data-set-mode') || SET_MODE.REPS;
    
    if (wInput && valueInput && (!wInput.value || !valueInput.value)) {
      const appState = _getState();
      const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
      const wk = activeWorkoutWeekKey(appState);
      const liftName = exCard ? exCard.getAttribute('data-liftname') : null;
      const sIdx = Array.from(exCard.querySelectorAll('.cockpit-set-row')).indexOf(parentRow);
      
      // 1) Carry forward the athlete's own earlier set this session —
      //    straight-set logging (3×8 at one weight) without re-typing, and the
      //    only fill a brand-new user with no coach target/history can get.
      if (!wInput.value || !valueInput.value) {
        const inh = _inheritedSetFromSession(exCard, parentRow);
        if (inh) {
          if (!wInput.value) wInput.value = inh.w;
          if (inh.mode && inh.mode !== SET_MODE.REPS) {
            if (!valueInput.value) valueInput.value = inh.value || '';
          } else if (!valueInput.value) {
            valueInput.value = inh.r || '';
          }
        }
      }
      // 2) Otherwise fall back to the visible active target shown in the field —
      //    but only when it's an actual number. Never invent an arbitrary load.
      const wGhost = parseFloat(wInput.placeholder);
      if (!wInput.value && Number.isFinite(wGhost)) wInput.value = String(wGhost);
      if (!valueInput.value) {
        if (rowMode === SET_MODE.REPS) {
          const rGhost = parseInt(valueInput.placeholder, 10);
          if (Number.isFinite(rGhost)) valueInput.value = String(rGhost);
        } else if (rowMode === SET_MODE.TIME) {
          const secGhost = parseDuration(valueInput.placeholder);
          if (secGhost != null) valueInput.value = formatDuration(secGhost);
        } else {
          const distGhost = parseFloat(valueInput.placeholder);
          if (Number.isFinite(distGhost)) valueInput.value = String(distGhost);
        }
      }

    }

    // 3) Validate whatever the row now holds — typed, inherited or suggested.
    //    This used to be a blank check only, which let `-50` and `0` reps
    //    through: setVolume is parseFloat(w) * parseInt(r), so a negative weight
    //    SUBTRACTS from tonnage, weekly volume and every landmark built on it,
    //    and a zero-rep set reads as done here while isValidWorkingSet drops it
    //    from analytics. The message lands on the row rather than in a toast —
    //    a toast appears away from the offending field and is gone before you
    //    look up (roadmap 2A: "invalid or incomplete input explained inline").
    if (wInput && valueInput) {
      const verdict = validateSetEntry({
        weight: wInput.value,
        value: valueInput.value,
        mode: rowMode,
        // Defaults to 'weighted', the strictest mode: absent the attribute this
        // can only over-require a weight, never under-require one — and that is
        // exactly the behaviour this check had before the exemption existed.
        loadMode: parentRow?.dataset?.loadMode || 'weighted',
      });
      const message = primarySetEntryMessage(verdict);
      setRowMessage(parentRow, message);
      if (!verdict.ok) {
        checkboxNode.checked = false;
        parentRow.classList.remove('is-complete');
        (verdict.firstErrorField === 'weight' ? wInput : valueInput).focus();
        return;
      }
    }

    hapticTick();
    // Auto-start only after the set has valid current-session values. A bounced
    // blank check must not create a running timer for work that was never logged.
    try { startWorkoutTimer(workoutSessionKey(lifecycleState, lifecycleWeek, lifecycleDay)); } catch (_) {}

    try {
      const liftName = exCard ? exCard.getAttribute('data-liftname') : null;
      const gymRpeEl = document.getElementById('sessionGymRpeCockpit');
      const setRpe = gymRpeEl && gymRpeEl.value ? parseFloat(gymRpeEl.value) : null;
      const _appState = _getState();
      const _wk = activeWorkoutWeekKey(_appState);
      // Resolve the day FROM the week the tick will write to. `activeWorkoutDay`
      // alone answers for the active one-off and can disagree with `_wk` when a
      // programme day is selected, which would stamp one slot and untick another.
      const _selDay = activeWorkoutDayForWeek(_appState, _wk, _getSelectedDay());
      const _sIdx = exCard ? Array.from(exCard.querySelectorAll('.cockpit-set-row')).indexOf(parentRow) : -1;
      const storedForRest = _appState.weeks[_wk].lifts?.[_selDay]?.[liftName]?.[_sIdx] || {};
      const setType = storedForRest.type || '';
      const planRest = getProgramById(_appState.activeProgramId)?.prescriptions?.[_selDay]?.[liftName]?.restSec;
      const restSet = { ...storedForRest, type: setType };
      _startRestAfterTickedSet(_appState, _wk, _selDay, liftName, _sIdx, restSet, setType, planRest, setRpe);
      // Stamp workout date on first set completion for this day
      if (!_appState.weeks[_wk].dates) _appState.weeks[_wk].dates = {};
      if (!_appState.weeks[_wk].dates[_selDay]) {
        _appState.weeks[_wk].dates[_selDay] = dateKey();
      }

      // PR + per-set comparison, for EVERY shape. Shared with quick-log/log-all
      // so those paths cannot silently skip the feedback a manual tick gets.
      if (liftName && _sIdx >= 0) {
        const wIn = parentRow?.querySelector('.input-weight-node');
        const valueIn = parentRow ? _setValueInput(parentRow) : null;
        const w = parseFloat(wIn?.value) || 0;
        const candidate = {
          ...storedForRest,
          w: wIn ? wIn.value : storedForRest.w,
          mode: rowMode,
          c: true,
        };
        if (rowMode === SET_MODE.TIME) candidate.sec = parseDuration(valueIn?.value) || '';
        else if (rowMode === SET_MODE.DISTANCE) candidate.dist = parseFloat(valueIn?.value) || '';
        else candidate.r = valueIn?.value ?? storedForRest.r;
        detectSetPR(parentRow, liftName, _sIdx, candidate, _appState, _wk, _selDay, { justTicked: true });
        applySetComparison(parentRow, _setRowValue(rowMode, valueIn?.value), rowMode, w);
      }
    } catch(e) { console.warn(e); }
  } else {
    if (parentRow) {
      parentRow.classList.remove('is-complete');
      parentRow.querySelector('.set-cmp')?.remove();
      // Withdrawing the entry withdraws its claim. A PR ticked by mistake must
      // not survive unticking or the next render would resurrect the trophy.
      const liftName = exCard ? exCard.getAttribute('data-liftname') : null;
      if (liftName && exCard) {
        const sIdx = Array.from(exCard.querySelectorAll('.cockpit-set-row')).indexOf(parentRow);
        const appState = _getState();
        const wk = activeWorkoutWeekKey(appState);
        // Same pair the tick used: the week decides its own day.
        const selDay = activeWorkoutDayForWeek(appState, wk, _getSelectedDay());
        const stored = appState.weeks?.[wk]?.lifts?.[selDay]?.[liftName]?.[sIdx];
        clearSetPR(parentRow, stored);
      }
    }
    // Un-ticking is the athlete withdrawing the entry, so the complaint about it
    // goes too. Leaving it would accuse a row that no longer claims anything.
    setRowMessage(parentRow, null);
  }
  commitWorkoutUIState();
  evaluateAccordionAutoFlowTransitions();
}

/**
 * Show (or clear) the inline entry message on one set row.
 * @param {Element|null} row
 * @param {{level: string, text: string}|null} message
 */
function setRowMessage(row, message) {
  const slot = row?.querySelector('.set-row-msg');
  if (!slot) return;
  if (!message) {
    slot.textContent = '';
    slot.setAttribute('hidden', '');
    slot.classList.remove('is-warning');
    return;
  }
  slot.textContent = message.text;
  slot.classList.toggle('is-warning', message.level === 'warning');
  // Removed after the text is set so the live region announces the message
  // rather than an empty node.
  slot.removeAttribute('hidden');
}

// Achieved one-line summary (#5). Two readers: from state sets (full render) and
// from the live DOM rows (in-place, the moment an exercise is completed).
function _achievedLabel(n, weights, reps, unit) {
  const sameW = weights.every(x => x === weights[0]);
  const sameR = reps.every(x => x === reps[0]);
  return (sameW && sameR && weights[0] > 0)
    ? `✓ ${n} × ${reps[0]} @ ${weights[0]}${unit}`
    : `✓ ${n} sets · top ${Math.max(...weights)}${unit}`;
}
function _shapeSummary(shape, values) {
  const best = Math.max(0, ...values);
  return shape === SET_MODE.TIME
    ? `✓ ${values.length} holds · best ${formatDuration(best)}`
    : `✓ ${values.length} carries · best ${formatDistance(best)}m`;
}
function _achievedSummaryFromSets(setsArr, unit) {
  const working = (setsArr || []).filter(s => isCompletedSet(s) && !isWarmupSet(s));
  if (!working.length) return '✓ Complete';
  const shapes = new Set(working.map((s) => setModeOf(s)));
  if (shapes.size > 1) return `✓ ${working.length} sets`;
  if (!working.some(isRepSet)) {
    const shape = setModeOf(working[0]);
    return _shapeSummary(shape, working.map(s => shape === SET_MODE.TIME ? Number(s.sec) || 0 : Number(s.dist) || 0));
  }
  return _achievedLabel(working.length, working.map(s => parseFloat(s.w) || 0), working.map(s => parseInt(s.r, 10) || 0), unit);
}
function _achievedSummaryFromCard(card, unit) {
  const done = Array.from(card.querySelectorAll('.cockpit-set-row'))
    .filter(r => !r.classList.contains('type-warmup') && r.querySelector('.gym-check')?.checked);
  if (!done.length) return '✓ Complete';
  const shapes = new Set(done.map((r) => r.getAttribute('data-set-mode') || SET_MODE.REPS));
  if (shapes.size > 1) return `✓ ${done.length} sets`;
  const shape = done[0].getAttribute('data-set-mode');
  if (shape && shape !== SET_MODE.REPS) {
    return _shapeSummary(shape, done.map(r => _setRowValue(shape, _setValueInput(r)?.value)));
  }
  return _achievedLabel(done.length,
    done.map(r => parseFloat(r.querySelector('.input-weight-node')?.value) || 0),
    done.map(r => parseInt(_setValueInput(r)?.value, 10) || 0), unit);
}

/**
 * Re-render the outline from current state without a full cockpit re-render.
 *
 * Ticking a set deliberately updates the DOM in place rather than rebuilding
 * the accordion, so the outline had no way to learn about it and went stale
 * the moment anyone logged anything — a stale index is worse than no index.
 */
export function refreshSessionOutline() {
  // Bail before the app has wired the context. Once the accessors moved behind
  // wrapper functions they became permanently truthy, so this must ask whether
  // the context is READY rather than whether the functions exist.
  if (!workoutContextReady()) return;
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekData = appState.weeks?.[activeWorkoutWeekKey(appState)];
  if (!weekData) return;
  const oneOff = activeOneOffSession(appState);
  const homeBlueprint = oneOffBlueprint(appState,
    getProgramById(appState.activeProgramId)?.days?.[selectedDay] || { lifts: [], runs: 'Rest' });
  const logged = weekData.lifts?.[selectedDay] || {};
  const activeLift = document.querySelector('.cockpit-exercise:not(.collapsed)')?.getAttribute('data-liftname');
  const orderedNames = activeSessionLiftNames(weekData, selectedDay, homeBlueprint, { oneOff: !!oneOff });
  renderSessionOutline(logged, orderedNames, activeLift);
  // Keep the active rail and its stats in step with a completed/un-ticked set
  // without re-rendering the whole cockpit.
  const rail = document.getElementById('cockpitExerciseRail');
  if (rail && !rail.hidden) {
    renderCockpitExerciseRail(logged, orderedNames, activeLift || orderedNames[0] || null);
    refreshCockpitActiveStats();
  }
}

/**
 * Keep `.has-logged-work` current on every card. Ticking a set updates the DOM
 * WITHOUT re-rendering the card, so anything derived from completion state at
 * render time is only ever right until the first tick. Reads the live rows
 * rather than state so it cannot disagree with what is on screen.
 */
export function refreshContextualRowActions() {
  document.querySelectorAll('.cockpit-exercise').forEach((card) => {
    const logged = Array.from(card.querySelectorAll('.cockpit-set-row'))
      .some((row) => !row.classList.contains('type-warmup') && row.querySelector('.gym-check')?.checked);
    card.classList.toggle('has-logged-work', logged);
  });
}

/**
 * Refresh the circuit header's derived progress without re-rendering the
 * cockpit. Group completion is never stored — it is roundState over the same
 * sets the logger just ticked.
 */
function refreshSupersetGroupProgress() {
  if (!workoutContextReady()) return;
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekData = appState.weeks?.[activeWorkoutWeekKey(appState)];
  if (!weekData) return;
  document.querySelectorAll('#cockpitExercisesContainer .superset-group').forEach((wrapper) => {
    const names = Array.from(wrapper.querySelectorAll('.cockpit-exercise'))
      .map((card) => card.getAttribute('data-liftname'))
      .filter(Boolean);
    if (!names.length) return;
    const circuit = roundState(weekData, selectedDay, names[0], { orderedNames: names });
    wrapper.classList.toggle('is-complete', !!circuit?.complete);
    const progress = wrapper.querySelector('.superset-group-progress');
    if (progress && circuit) progress.textContent = `· ${circuit.doneMembers} of ${circuit.members.length} done`;
  });
}

export function evaluateAccordionAutoFlowTransitions() {
  // These run BEFORE the early return: they must track every completion change,
  // including ones made while no card happens to be expanded.
  try { refreshSessionOutline(); } catch (e) { console.warn(e); }
  try { refreshContextualRowActions(); } catch (e) { console.warn(e); }
  try { refreshSupersetGroupProgress(); } catch (e) { console.warn(e); }

  const expandedCard = document.querySelector('.cockpit-exercise:not(.collapsed)');
  if (!expandedCard) return;
  const rows = Array.from(expandedCard.querySelectorAll('.cockpit-set-row'));
  if (rows.length === 0) return; // a card with no sets isn't "finished"
  const finished = rows.every(r => r.querySelector('.gym-check')?.checked);
  const statusNode = expandedCard.querySelector('.cockpit-ex-status');
  const targetNode = expandedCard.querySelector('.cockpit-ex-target');
  const unit = _getState?.().settings?.weightUnit || 'kg';

  if (finished) {
    const wasCompleted = expandedCard.classList.contains('completed');
    expandedCard.classList.add('completed');
    if (statusNode) statusNode.textContent = 'DONE';
    // Swap the target line for the achieved summary the instant it's done.
    if (targetNode) targetNode.textContent = _achievedSummaryFromCard(expandedCard, unit);
    // Keep the card expanded after the final set so the per-set RPE pad (which
    // only appears on completed sets) stays reachable — previously the card
    // collapsed and auto-advanced the instant the last set was ticked, hiding
    // RPE before it could be entered. Move on by tapping the next exercise.
    if (!wasCompleted) showToast('Exercise Complete! ✓');
  } else {
    // Unchecking a set after completion re-opens the exercise and restores its
    // prescription line (stashed at build time).
    expandedCard.classList.remove('completed');
    if (statusNode) statusNode.textContent = 'LOG';
    if (targetNode && targetNode.dataset.targetLabel) targetNode.textContent = targetNode.dataset.targetLabel;
  }
}

// The logger's own day order. The panel used `Object.keys(lifts)`, which made
// its member list disagree with the cockpit it edits.
function _dayLiftOrder(weekData, day) {
  const lifts = weekData?.lifts?.[day] || {};
  const order = Array.isArray(weekData?.liftOrder?.[day]) ? weekData.liftOrder[day] : [];
  const names = [];
  const seen = new Set();
  for (const name of [...order, ...Object.keys(lifts)]) {
    if (seen.has(name) || !Array.isArray(lifts[name])) continue;
    names.push(name);
    seen.add(name);
  }
  return names;
}

function _circuitPanelCandidate(candidateName, liftName, myGroupId, dayMeta) {
  const theirGroup = normaliseGroupId(dayMeta[candidateName]?.groupId);
  const crossGroup = !!myGroupId && !!theirGroup && theirGroup !== myGroupId;
  const label = theirGroup ? `Join circuit ${theirGroup}` : `Add ${candidateName}`;
  return `<div class="ss-candidate-row${crossGroup ? ' is-blocked' : ''}">
    <button type="button" class="btn-pad ss-candidate" data-action="link-superset" data-liftname="${escapeHtml(liftName)}" data-partner="${escapeHtml(candidateName)}"${crossGroup ? ' disabled aria-disabled="true"' : ''} aria-label="${escapeHtml(crossGroup ? `${candidateName} is already in circuit ${theirGroup}` : `${label} to this circuit`)}">${escapeHtml(label)}</button>
    ${crossGroup ? `<span class="ss-candidate-note">In circuit ${escapeHtml(String(theirGroup))} — unlink it first</span>` : ''}
  </div>`;
}

export function showSupersetLinkPanel(exCard) {
  if (!exCard) return;
  const appState   = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);
  const liftName = exCard.getAttribute('data-liftname');

  document.querySelectorAll('.ss-link-panel').forEach(p => p.remove());

  if (!appState.weeks[wk].liftMeta) appState.weeks[wk].liftMeta = {};
  if (!appState.weeks[wk].liftMeta[selectedDay]) appState.weeks[wk].liftMeta[selectedDay] = {};
  const weekData = appState.weeks[wk];
  const dayMeta = weekData.liftMeta[selectedDay];
  const myGroupId = normaliseGroupId(dayMeta[liftName]?.groupId);
  const dayLifts = _dayLiftOrder(weekData, selectedDay);
  const members = myGroupId ? membersInOrder(weekData, selectedDay, liftName, dayLifts) : [];
  const memberSet = new Set(members);
  const candidates = dayLifts.filter((name) => name !== liftName && !memberSet.has(name));

  const panel = document.createElement('div');
  panel.className = 'ss-link-panel';

  const candidateHtml = candidates.length
    ? candidates.map((name) => _circuitPanelCandidate(name, liftName, myGroupId, dayMeta)).join('')
    : `<p class="ss-panel-note">${myGroupId
      ? 'Every exercise in this workout is already in the circuit.'
      : 'Add another exercise to this workout, then start a circuit here.'}</p>`;

  if (myGroupId) {
    const memberRows = members.map((name) => `<div class="ss-member-row">
      <span class="ss-member-name">${escapeHtml(name)}</span>
      <button type="button" class="btn-pad ss-member-remove" data-action="remove-from-superset" data-member="${escapeHtml(name)}" aria-label="Remove ${escapeHtml(name)} from this circuit">Remove</button>
    </div>`).join('');
    panel.innerHTML = `
      <div class="ss-panel-title">Circuit ${escapeHtml(String(myGroupId))}</div>
      <div class="ss-panel-section">
        <div class="ss-panel-label">In this circuit</div>
        ${memberRows}
        <button type="button" class="btn-pad ss-unlink" data-action="unlink-superset" data-liftname="${escapeHtml(liftName)}">Unlink circuit</button>
      </div>
      <div class="ss-panel-section">
        <div class="ss-panel-label">Add to this circuit</div>
        ${candidateHtml}
      </div>`;
  } else {
    panel.innerHTML = `
      <div class="ss-panel-title">Superset / circuit</div>
      <p class="ss-panel-note">Pick an exercise to start a circuit. Rest starts after the last exercise, not after every member.</p>
      <div class="ss-panel-section">
        <div class="ss-panel-label">Add to this circuit</div>
        ${candidateHtml}
      </div>`;
  }

  exCard.classList.remove('collapsed');
  const header = exCard.querySelector('.cockpit-header');
  if (header) header.after(panel);

  setTimeout(() => {
    const close = (ev) => {
      if (!panel.contains(ev.target) && !ev.target.closest('[data-action="show-ss-panel"]')) {
        panel.remove();
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  }, 0);
}

/**
 * Pair `liftName` with `partnerName`. Joining an existing circuit KEEPS its
 * letter — the old code always allocated a new one, which silently unpaired the
 * athlete's previous partner. A cross-group merge is refused with an explanation
 * instead of re-lettering either side.
 */
export function pairAsSuperset(liftName, partnerName) {
  const appState   = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);

  if (!appState.weeks[wk].liftMeta) appState.weeks[wk].liftMeta = {};
  if (!appState.weeks[wk].liftMeta[selectedDay]) appState.weeks[wk].liftMeta[selectedDay] = {};
  const dayMeta = appState.weeks[wk].liftMeta[selectedDay];

  const join = resolveJoin(dayMeta, liftName, partnerName);
  if (!join.ok) {
    showToast(join.reason === 'cross-group'
      ? `“${partnerName}” is already in circuit ${join.theirs}. Unlink that circuit first.`
      : 'Pick a different exercise to pair.', true);
    return;
  }
  const letter = join.groupId;

  dayMeta[liftName]    = { ...(dayMeta[liftName]    || {}), groupId: letter };
  dayMeta[partnerName] = { ...(dayMeta[partnerName] || {}), groupId: letter };

  _saveState(true);
  renderWorkout();
}

/** Remove one exercise from its circuit; a lone remaining tag is cleared too. */
export function removeFromSuperset(memberName) {
  const appState   = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);

  const dayMeta = appState.weeks?.[wk]?.liftMeta?.[selectedDay];
  if (!dayMeta || !memberName) return;
  const removed = detachMember(dayMeta, memberName);
  if (!removed.removed) return;
  _saveState(true);
  renderWorkout();
}

export function unpairSuperset(liftName) {
  const appState   = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);

  const dayMeta = appState.weeks?.[wk]?.liftMeta?.[selectedDay];
  if (!dayMeta) return;
  const groupId = normaliseGroupId(dayMeta[liftName]?.groupId);
  if (!groupId) return;

  Object.keys(dayMeta).forEach(n => { if (dayMeta[n]?.groupId === groupId) delete dayMeta[n].groupId; });
  _saveState(true);
  renderWorkout();
}

// Next unfinished exercise after `fromCard` (wrapping to the top), or null when
// every other exercise is already done.
function _nextIncompleteCard(fromCard) {
  const cards = Array.from(document.querySelectorAll('.cockpit-exercise'));
  const idx = cards.indexOf(fromCard);
  for (let i = idx + 1; i < cards.length; i++) if (!cards[i].classList.contains('completed')) return cards[i];
  for (let i = 0; i < idx; i++) if (!cards[i].classList.contains('completed')) return cards[i];
  return null;
}

/**
 * Open one exercise from the session outline and bring it into view.
 * Reuses the accordion's own single-open invariant rather than manipulating
 * classes directly, so outline navigation and header taps cannot drift apart.
 * @param {string} liftName
 */
export function jumpToExercise(liftName) {
  if (!liftName) return;
  const escape = (window.CSS && CSS.escape) ? CSS.escape(liftName) : liftName;
  const card = document.querySelector(`.cockpit-exercise[data-liftname="${escape}"]`);
  if (!card) return;
  document.querySelectorAll('.cockpit-exercise').forEach((c) => c.classList.add('collapsed'));
  card.classList.remove('collapsed');
  try { moveRestTimerToActiveExercise(); } catch (e) { console.warn(e); }
  try { refreshSessionOutline(); } catch (e) { console.warn(e); }
  try { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
}

export function toggleAccordionManual(elementNode) {
  if (!elementNode) return;
  const wasCollapsed = elementNode.classList.contains('collapsed');
  const wasCompleted = elementNode.classList.contains('completed');
  document.querySelectorAll('.cockpit-exercise').forEach(card => card.classList.add('collapsed'));

  if (wasCollapsed) {
    elementNode.classList.remove('collapsed');
  } else if (wasCompleted) {
    // #5 single-focus auto-advance: collapsing a finished exercise moves focus to
    // the next unfinished one rather than leaving the cockpit with nothing open.
    // (We only advance on a deliberate collapse, never on the final set tick — the
    // per-set RPE pad must stay reachable the moment an exercise is completed.)
    const next = _nextIncompleteCard(elementNode);
    if (next) next.classList.remove('collapsed');
  }
  try { moveRestTimerToActiveExercise(); } catch(e) { console.warn(e); }
}

/** Weights are stored in the configured unit and never converted — label, don't assume. */

// Normalise a duration entry to canonical "M:SS" (matching .FIT imports). A
// bare number is treated as minutes ("45" → "45:00"); "" stays "".
function _normalizeDuration(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (s.includes(':')) {
    const [m, sec] = s.split(':');
    return `${parseInt(m, 10) || 0}:${(parseInt(sec, 10) || 0).toString().padStart(2, '0')}`;
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? `${n}:00` : '';
}

/**
 * Render the "notable progress" block, or hide it entirely.
 *
 * Hidden rather than showing an encouraging placeholder: most good sessions are
 * not PR sessions, and a line that appears every time is a line nobody reads.
 */
function renderSessionHighlights(appState, weekKey, day, liftNames) {
  const host = document.getElementById('summaryHighlights');
  if (!host) return;
  let review;
  try {
    review = buildSessionReview(appState, { weekKey, day, liftNames });
  } catch (err) {
    console.warn('session review failed', err);
    host.hidden = true;
    host.textContent = '';
    return;
  }
  const highlights = review.highlights || [];
  if (!highlights.length) {
    host.hidden = true;
    host.textContent = '';
    return;
  }
  const unit = weightUnitLabel(appState || {});
  const round = (value) => (Math.round(value * 10) / 10).toString().replace(/\.0$/, '');
  const gainText = (h) => {
    if (h.kind === 'hold') return `Hold PR · ${formatDuration(h.value)} · +${round(h.delta)}s`;
    if (h.kind === 'carry') return `Carry PR · ${formatDistance(h.value)}m · +${round(h.delta)}m`;
    if (h.kind === 'reps') {
      const load = Number(h.load) > 0 ? `${round(h.load)} ${unit} × ` : '';
      return `Rep PR · ${load}${round(h.value)} reps · +${round(h.delta)}`;
    }
    return `${round(h.e1rm)} ${unit} est. 1RM · +${round(h.delta)}`;
  };
  host.hidden = false;
  host.innerHTML = `
    <div class="summary-highlights__title">Notable progress</div>
    ${highlights.map((h) => `
      <div class="summary-highlights__row">
        <span class="summary-highlights__lift">${escapeHtml(h.lift)}</span>
        <span class="summary-highlights__gain">${gainText(h)}</span>
      </div>`).join('')}
    <div class="summary-highlights__note">${highlights.some((h) => h.kind !== 'hold' && h.kind !== 'carry' && h.kind !== 'reps')
      ? 'Estimated from your best set — not a tested max.'
      : 'Measured from the sets you completed.'}</div>
  `;
}

export function openFinishSessionModal() {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);
  let vol = 0, setsDone = 0;
  const activeProgram = getProgramById(appState.activeProgramId);
  const oneOff = activeOneOffSession(appState);
  const blueprint = oneOffBlueprint(appState, activeProgram?.days?.[selectedDay] || {});
  const allLiftsData = appState.weeks[wk]?.lifts?.[selectedDay] || {};
  const activeNames = activeSessionLiftNames(appState.weeks[wk], selectedDay, blueprint, { oneOff: !!oneOff });
  const liftsData = Object.fromEntries(activeNames.map((name) => [name, allLiftsData[name]]));
  
  for (let lift in liftsData) {
    if (Array.isArray(liftsData[lift])) {
      liftsData[lift].forEach(s => {
        // Exclude warmups so the summary tonnage/sets match home & analytics.
        if (isCompletedSet(s) && !isWarmupSet(s)) { vol += setVolume(s); setsDone++; }
      });
    }
  }
  
  const sumVolEl = document.getElementById('summaryVolume');
  const sumSetsEl = document.getElementById('summarySets');
  const sumDurEl = document.getElementById('summaryDuration');
  const sumGymRpeEl = document.getElementById('summaryGymRPE');
  const sumRunRpeEl = document.getElementById('summaryRunRPE');
  const sumModalEl = document.getElementById('summaryModal');
  const titleEl = document.getElementById('summaryModalTitle');
  const copyEl = document.getElementById('summaryModalCopy');
  const actionEl = document.getElementById('summarySaveAction');
  const discardEl = document.getElementById('summaryDiscardAction');
  const progressEl = document.getElementById('summaryCompletionProgress');
  const completion = evaluateSessionCompletion(appState, activeProgram, wk, selectedDay);
  const presentation = completionPresentation(completion);
  if (sumModalEl) sumModalEl.dataset.outcome = completion.outcome;
  if (progressEl) progressEl.textContent = completion.progressLabel;
  if (titleEl) titleEl.textContent = presentation.title;
  if (copyEl) copyEl.textContent = presentation.body;
  if (actionEl) {
    actionEl.textContent = presentation.action || 'Finish Workout';
    actionEl.hidden = !presentation.action;
  }
  if (discardEl) discardEl.hidden = false;

  if (sumVolEl) sumVolEl.textContent = `${vol} ${weightUnitLabel(_getState?.() || {})}`;
  if (sumSetsEl) sumSetsEl.textContent = setsDone;

  // Notable progress, computed from the SAME canonical primitives the Strength
  // screen uses, so a "new best" here can never be one the rest of the app
  // disagrees with. Must run here rather than in the finish handler: that runs
  // updateExercisePRs() as the sheet closes, i.e. after the only moment the
  // athlete is looking at it.
  renderSessionHighlights(appState, wk, selectedDay, activeNames);
  // Prefill duration with an already-logged value (e.g. .FIT import), else the
  // session timer's elapsed — surfaced here so it's confirmed/corrected at the
  // moment of finishing rather than silently logged.
  if (sumDurEl) {
    const existing = appState.weeks[wk].gymStats?.[selectedDay]?.time;
    if (existing) {
      sumDurEl.value = existing;
    } else {
      const elapsed = getWorkoutElapsedSeconds(workoutSessionKey(appState, wk, selectedDay));
      sumDurEl.value = elapsed > 0 ? _normalizeDuration(`${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`) : '';
    }
  }
  if (sumGymRpeEl) sumGymRpeEl.value = appState.weeks[wk].gymRpe?.[selectedDay] || '';
  if (sumRunRpeEl) sumRunRpeEl.value = appState.weeks[wk].runs?.[selectedDay]?.rpe || '';

  // Notes are the SAME store the cockpit's notes field writes to
  // (`week.notes[day]`), not a second place to put them — so whichever surface
  // the athlete used, the other shows what they already wrote instead of asking
  // again on a blank field.
  const sumNotesEl = document.getElementById('summaryNotes');
  if (sumNotesEl) sumNotesEl.value = appState.weeks[wk].notes?.[selectedDay] || '';

  // Optional by default, but already-entered effort or notes must never hide
  // behind a closed disclosure — that would read as "not recorded".
  const effortEl = document.getElementById('summaryEffortDetails');
  if (effortEl) {
    const hasEffort = !!(sumGymRpeEl?.value || sumRunRpeEl?.value || sumNotesEl?.value);
    /** @type {any} */ (effortEl).open = hasEffort;
  }

  // Only ask for the RPE that matches what was actually done today: a run RPE
  // prompt on a lift-only day (and vice versa) is a question with no answer.
  // Fall back to showing both if the day is somehow empty of both signals.
  const hasLifts = Object.values(liftsData).some(a => Array.isArray(a) && a.length > 0);
  const runCtx = appState.weeks[wk].runs?.[selectedDay] || {};
  const hasRun = !!(runCtx.dist || runCtx.time || runCtx.pace || runCtx.rpe);
  const gymBlock = document.getElementById('summaryGymRpeBlock');
  const runBlock = document.getElementById('summaryRunRpeBlock');
  if (gymBlock && runBlock) {
    if (hasLifts || hasRun) {
      gymBlock.style.display = hasLifts ? '' : 'none';
      runBlock.style.display = hasRun ? '' : 'none';
    } else {
      gymBlock.style.display = '';
      runBlock.style.display = '';
    }
  }

  if (sumModalEl) sumModalEl.classList.add('active');
}

// Dismiss the finish modal WITHOUT saving/leaving — the finish flow otherwise
// had a single "Save & Return Home" action, so an accidental Finish tap had no
// way out. The typed values persist in the fields for when they reopen it.
export function cancelFinishSessionModal() {
  document.getElementById('summaryModal')?.classList.remove('active');
}

export function discardFinishWorkout() {
  openConfirmResetModal({ replaceFrom: document.getElementById('summaryModal') });
}

export function closeFinishSessionModal() {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);
  const completion = evaluateSessionCompletion(appState, getProgramById(appState.activeProgramId), wk, selectedDay);
  if (!completion.anyLogged) {
    showToast('No working sets or run recorded');
    return;
  }
  if (!appState.weeks[wk].gymRpe) appState.weeks[wk].gymRpe = {};

  const sumGymRpeEl = document.getElementById('summaryGymRPE');
  const sumRunRpeEl = document.getElementById('summaryRunRPE');
  
  if (sumGymRpeEl) appState.weeks[wk].gymRpe[selectedDay] = sumGymRpeEl.value;
  if (sumRunRpeEl && appState.weeks[wk].runs[selectedDay]) {
    const existingRun = appState.weeks[wk].runs[selectedDay];
    existingRun.rpe = sumRunRpeEl.value;
    if (existingRun.sessionId || hasRunData(existingRun)) {
      upsertRunSession(appState.weeks[wk], selectedDay, existingRun, {
        sessionId: existingRun.sessionId || newRunSessionId(),
        source: existingRun.source || 'cockpit',
        localDate: existingRun.localDate || appState.weeks[wk].dates?.[selectedDay] || null,
        startTs: existingRun.startTs,
      });
    }
  }
  
  // Notes written in the finish sheet land in the same store as the cockpit's
  // notes field, so the two can never hold different text for one session.
  const sumNotesEl = document.getElementById('summaryNotes');
  if (sumNotesEl) {
    if (!appState.weeks[wk].notes) appState.weeks[wk].notes = {};
    appState.weeks[wk].notes[selectedDay] = sumNotesEl.value;
    const cockpitNotesEl = document.getElementById('sessionNotesInput');
    if (cockpitNotesEl) cockpitNotesEl.value = sumNotesEl.value;
  }

  const gymRpeEl = document.getElementById('sessionGymRpeCockpit');
  const runRpeEl = document.getElementById('runInputRpeCockpit');
  if (gymRpeEl) gymRpeEl.value = appState.weeks[wk].gymRpe[selectedDay] || '';
  if (runRpeEl) runRpeEl.value = appState.weeks[wk].runs[selectedDay]?.rpe || '';

  // Persist the confirmed session duration from the summary field (prefilled
  // from the timer in openFinishSessionModal, editable by the user).
  const sumDurEl = document.getElementById('summaryDuration');
  if (sumDurEl) {
    const normalized = _normalizeDuration(sumDurEl.value);
    if (!appState.weeks[wk].gymStats) appState.weeks[wk].gymStats = {};
    if (!appState.weeks[wk].gymStats[selectedDay]) {
      appState.weeks[wk].gymStats[selectedDay] = { time: '', avgHR: '', maxHR: '', cals: '' };
    }
    appState.weeks[wk].gymStats[selectedDay].time = normalized;
  }

  try { updateExercisePRs(); } catch(e) { console.warn(e); }
  // Safety net: a deliberately finished workout must carry its local calendar
  // date so it can never sink into the undated bucket (excluded from calendar
  // analytics + sorted to the bottom of history). Logging normally stamps this on
  // the first completed set; this also covers completed sets that arrived via a
  // sync/import that never ran the local stamp. Idempotent — never overwrites an
  // existing date, so a workout logged on an earlier day keeps that day.
  _ensureWorkoutDateStamp(appState, wk, selectedDay);
  const finishResult = finishSession(appState.weeks[wk], selectedDay, completion);
  const oneOff = activeOneOffSession(appState);
  if (oneOff?.key === wk) {
    clearActiveOneOffSession(appState);
  }
  _saveState(true);
  
  const sumModalEl = document.getElementById('summaryModal');
  if (sumModalEl) sumModalEl.classList.remove('active');
  
  try {
    stopAndResetWorkoutTimer(workoutSessionKey(appState, wk, selectedDay));
    dismissRestTimer();
  } catch(e) { console.warn(e); }
  
  if (_switchTab) _switchTab('home');

  // Finishing is a lifecycle choice, independent of perfect prescription
  // adherence. Repeated taps remain idempotent and do not duplicate recaps.
  if (finishResult.ok && !finishResult.alreadyFinished) {
    try {
      document.dispatchEvent(new CustomEvent('session:finished', {
        detail: { week: wk, day: selectedDay, outcome: 'finished', adherence: completion.outcome },
      }));
    } catch (_) {}
  } else if (finishResult.alreadyFinished) {
    showToast('Workout already finished');
  }
}

// ==========================================
// EVENT DELEGATION ROUTER
// ==========================================
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.getAttribute('data-action');
  
  // Context extractors
  const exCard = target.closest('.cockpit-exercise');
  const liftName = exCard ? exCard.getAttribute('data-liftname') : target.getAttribute('data-liftname');
  const sIdx = parseInt(target.getAttribute('data-sidx'), 10);

  // The per-set sheet owns its own controls, including the failure toggle that
  // already exists on the row — route those first so the sheet's copy is read
  // against the set it is actually showing.
  if (action.startsWith('set-sheet-') || action === 'close-set-sheet') {
    handleSetSheetAction(target, action, liftName, sIdx);
    return;
  }
  if (action === 'open-set-sheet') { openSetSheet(liftName, sIdx); return; }
  // The calculator is its own stacked dialog: its controls live outside any
  // `.cockpit-exercise`, so they carry no lift context and read it from module
  // state instead.
  if (action === 'close-plate-sheet' || action === 'plate-use-weight') {
    handlePlateSheetAction(target, action);
    return;
  }

  if (action === 'log-all-target') logAllAtTarget(liftName);
  else if (action === 'use-previous-values') usePreviousValues(liftName);
  else if (action === 'append-set') appendCustomSetRow(target, liftName);
  else if (action === 'append-warmup-set') appendWarmupSetRow(target, liftName);
  else if (action === 'append-drop-set') appendDropSetRow(target, liftName);
  else if (action === 'remove-set') removeCustomSetRow(liftName, sIdx);
  else if (action === 'cycle-set-type') cycleSetType(liftName, sIdx);
  else if (action === 'cycle-set-mode') cycleSetMode(liftName, sIdx);
  else if (action === 'set-load-mode') setSetLoadMode(liftName, sIdx, target.getAttribute('data-mode'));
  else if (action === 'cycle-load') cycleSetLoad(liftName, sIdx);
  else if (action === 'show-ss-panel') showSupersetLinkPanel(exCard);
  else if (action === 'open-exercise-options') openExerciseOptions(liftName);
  else if (action === 'link-superset') pairAsSuperset(liftName, target.getAttribute('data-partner'));
  else if (action === 'remove-from-superset') removeFromSuperset(target.getAttribute('data-member'));
  else if (action === 'unlink-superset') unpairSuperset(liftName);
  else if (action === 'toggle-accordion') toggleAccordionManual(exCard);
  else if (action === 'jump-to-exercise') jumpToExercise(liftName);
  else if (action === 'toggle-set-failure') toggleSetFailure(liftName, sIdx);
  else if (action === 'toggle-load-basis') toggleLoadBasis(liftName, sIdx);
  else if (action === 'edit-set-rest') void editSetRest(liftName, sIdx);
  else if (action === 'clear-set-rest') clearSetRest(liftName, sIdx);
  else if (action === 'edit-set-note') void editSetNote(liftName, sIdx);
  else if (action === 'rest-adjust') adjustRestDuration(parseInt(target.getAttribute('data-delta'), 10));
  else if (action === 'open-add-exercise') openAddExerciseModal();
  else if (action === 'close-add-exercise') closeAddExerciseModal();
  else if (action === 'el-pick') addExerciseToDayFromLibrary(e.target.closest('[data-action="el-pick"]')?.getAttribute('data-exname'));
  else if (action === 'el-info') openExerciseDetail(target.getAttribute('data-exname'));
  else if (action === 'confirm-add-exercise') confirmAddExercise();
  else if (action === 'swap-exercise') openSwapModal(liftName);
  else if (action === 'close-swap-exercise') closeSwapModal();
  else if (action === 'swap-pick') executeSwapExercise(target.getAttribute('data-exname'));
  else if (action === 'swap-confirm-custom') confirmCustomSwap();
  else if (action === 'open-reset-modal') openConfirmResetModal();
  else if (action === 'close-reset-modal') closeConfirmResetModal();
  else if (action === 'execute-reset') executeResetActiveDayMetrics();
  else if (action === 'open-finish-modal') openFinishSessionModal();
  else if (action === 'close-finish-modal') closeFinishSessionModal();
  else if (action === 'cancel-finish-modal') cancelFinishSessionModal();
  else if (action === 'discard-finish-workout') discardFinishWorkout();
  else if (action === 'expand-run') document.getElementById('cockpitRunPanel')?.classList.remove('run-collapsed');
});

document.addEventListener('change', (e) => {
  const target = e.target;
  if (target.id === 'elCategoryFilter' || target.id === 'elEquipmentFilter' || target.id === 'elMuscleFilter') {
    renderExerciseLibraryList(document.getElementById('elSearchInput')?.value || '');
  } else if (target.classList.contains('input-weight-node') || target.classList.contains('input-set-value-node')) {
    updateInputState(target);
  } else if (target.classList.contains('gym-check')) {
    toggleGymCheckLoggingState(target);
  }
});

document.addEventListener('focusout', (e) => {
  const target = e.target;
  if (target.matches('.input-weight-node, .input-set-value-node, #sessionNotesInput, #sessionGymRpeCockpit, #runInputDist, #runInputTime, #runInputRpeCockpit, #runInputPace, #runInputNotes')) {
    commitWorkoutUIState();
  }
});

/**
 * Keep the NEXT working row's ghost in step with what was just entered here.
 * Presentation only: `data-prescribed` (the adherence baseline) is untouched,
 * so the coach's target is still what a completed set is measured against.
 * @param {HTMLElement|null} row
 */
function syncNextRowGhost(row) {
  const card = row?.closest?.('.cockpit-exercise');
  if (!card) return;
  const rows = Array.from(card.querySelectorAll('.cockpit-set-row'));
  const index = rows.indexOf(row);
  if (index < 0) return;
  const weight = row.querySelector('.input-weight-node')?.value?.trim() || '';
  const reps = row.querySelector('.input-reps-node')?.value?.trim() || '';
  if (!weight && !reps) return;
  for (let i = index + 1; i < rows.length; i++) {
    const next = rows[i];
    if (next.classList.contains('type-warmup')) continue;
    const weightInput = next.querySelector('.input-weight-node');
    const repsInput = next.querySelector('.input-reps-node');
    if (weightInput && !weightInput.value && weight) weightInput.placeholder = weight;
    if (repsInput && !repsInput.value && reps) repsInput.placeholder = reps;
    return;
  }
}

document.addEventListener('input', (e) => {
  const target = e.target;
  // Clear an inline entry error the moment the athlete starts answering it.
  // This lives on `input` rather than `change` because `change` only fires on
  // blur — the complaint would otherwise sit there through the whole retype.
  // It only CLEARS; re-validating per keystroke would flag "-" and "1." as the
  // number is still being typed. The verdict is re-taken when they tick.
  if (target.classList?.contains('input-weight-node') || target.classList?.contains('input-set-value-node')) {
    setRowMessage(target.closest?.('.cockpit-set-row'), null);
  }
  // The ghost of the next set follows this one, so the athlete sees the load
  // they just used rather than the original prescription.
  if (target.classList?.contains('input-weight-node') || target.classList?.contains('input-reps-node')) {
    syncNextRowGhost(target.closest?.('.cockpit-set-row'));
  }
  // Live T1 Block-2 back-off recalculation: editing a top-set (rep-max) weight
  // immediately refreshes the suggested back-off loads in the same card.
  if (target.classList && target.classList.contains('input-weight-node')) {
    const row = target.closest?.('.cockpit-set-row');
    if (row && row.getAttribute('data-set-role') === 'repmax') {
      recalcJtBackoff(target.closest('.cockpit-exercise'));
    }
    const state = _getState?.();
    const card = target.closest?.('.cockpit-exercise');
    if (state?.settings?.showPlateHints && card
      && resolveExercise(card.getAttribute('data-liftname'))?.equipment?.includes('barbell')) {
      const unit = state.settings.weightUnit === 'lbs' ? 'lbs' : 'kg';
      refreshCardSetPlateLines(card, { unit, setup: getActivePlateSetup(state, unit) });
    }
  }
  if (target.matches('#runInputDist, #runInputTime, #runInputRpeCockpit, #runInputPace, #runInputNotes')) {
    const state = _getState();
    const day = activeWorkoutDay(state, _getSelectedDay());
    handleRunLoggingInput(target, {
      appState: state,
      weekKey: activeWorkoutWeekKey(state),
      selectedDay: day,
    });
  }
});
