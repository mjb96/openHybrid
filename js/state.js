// @ts-check
// ==========================================
// STATE MANAGER — core state + sub-module wiring.
// Auth lives in ./state/auth.js
// Import/Export lives in ./state/import-export.js
// ==========================================
import { PROGRAMS } from './constants.js';
import { getCatalogEntry } from './programs/catalog.js';
import { liftTarget, prescribeSetsForLift, reconcilePrescribedSets, jtRoleStampsForCtx, computeExercisePRs } from './engine.js';
import { getWeekModifier } from './schema.js';
import { DEFAULT_REST_TIERS } from './workout/rest-duration.js';
export { showToast } from './toast.js';
import { showToast } from './toast.js';
import { secureRandomSuffix } from './util/secure-id.js';
import { recomputeLoadMetrics } from './brain/load_models.js';
import { initImportExport, triggerCSVExport, triggerBodyweightCSVExport, triggerMeasurementsCSVExport } from './state/import-export.js';
import { migrateState } from './state/migrations.js';
import { showMigrationRecovery } from './state/migration-recovery-ui.js';
import { preserveCorruptState, recoveryRawState } from './state/corrupt-state.js';
import { writeMirror, restoreStateMirror, mirrorSupported, clearMirror } from './state/mirror.js';
import {
  ensureActivation, beginActivation, archiveForeignWeeks,
} from './state/activation-identity.js';
import { migrateLegacyRunSessions, runSessionsForDay } from './state/run-sessions.js';
import { isCompletedSet, isValidWorkingSet } from './set-utils.js';
import { isFailedSet } from './workout/effort.js';
import { sessionSetPlan, clearSessionSetPlan, clearDaySetPlans } from './workout/set-plan.js';
import { ensureEquipmentProfiles, projectActiveEquipmentProfile } from './equipment-profiles.js';
import { ensureRoutines } from './routines/store.js';
import {
  beginRecoveryGate,
  reconcileRecoveryGate,
  isRecoveryGatePending,
} from './state/recovery-gate.js';

export { triggerCSVExport, triggerBodyweightCSVExport, triggerMeasurementsCSVExport };

export const STORAGE_KEY = 'hybrid_engine_v2_state';
// Written beside the state so the native mirror can tell which copy is newer.
export const SAVED_AT_KEY = STORAGE_KEY + '_saved_at';

function _defaultStorage() {
  return (typeof localStorage !== 'undefined') ? localStorage : null;
}

// Base state configuration
/** @type {import('./types').AppState} */
export let appState = {
  currentWeek: "1",
  activeProgramId: "hybrid_engine",
  weekStartedAt: null,
  weeks: {},
  exerciseStats: {},
  customExercises: [],
  customPrograms: [],
  // Reusable session templates and their folders. Deliberately NOT programs:
  // they never resolve through getProgramById and never own a week slot.
  routines: [],
  libraryFolders: [],
  bodyWeightLog: [],
  bodyMeasurements: [],
  thresholdPaceSeconds: null,
  deloadApplied: null,
  _deloadDismissedWeek: null,
  streakData: { current: 0, longest: 0, lastActivityDate: null },
  goalData: { milestones: [], completedCount: 0 },
  prGoals: {},
  loadMetrics: { atl: 0, ctl: 0 },
  healthConnect: { connected: false, lastSync: null, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [], stepGoal: 10000, syncFields: { steps: true, restingHR: true, hrv: true, sleep: true }, fieldStatus: {} },
  wellnessLog: [],
  fastingSession: { active: false, startTime: null, goal: 16, history: [] },
  programLibrary: {
    bookmarks: [],           // array of program IDs
    completions: [],         // array of { programId, completedAt, weeksCompleted }
    recentlyViewed: [],      // array of { programId, viewedAt } — capped at 20
    personalRatings: {},     // map of programId → { rating, review, ratedAt }
    activeFilters: {},       // persisted filter panel state
  },
};

export let activeTab = 'home';
export let selectedDay = 'mon';

export const DEFAULT_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function setActiveTab(tab) { activeTab = tab; }
export function setSelectedDay(day) { selectedDay = day; }
export function setAppState(newState) { appState = newState; }

export function emitStorageLoadedEvent() {
  document.dispatchEvent(
    new CustomEvent('app:storage-loaded', {
      detail: { 
        week: appState.currentWeek, 
        activeProgramId: appState.activeProgramId 
      }
    })
  );
}

// ==========================================
// UNIVERSAL PROGRAM RESOLVER
// ==========================================
export function getProgramById(id) {
  return resolveProgramForState(appState, id);
}

export function isUsableProgram(program) {
  if (!program || typeof program !== 'object') return false;
  if (!program.days || typeof program.days !== 'object' || Array.isArray(program.days)) return false;
  const weeks = Number(program.totalWeeks ?? program.durationWeeks);
  return Number.isInteger(weeks) && weeks > 0 && weeks <= 104;
}

export function resolveProgramForState(state, id) {
  if (typeof id !== 'string' || !id.trim()) return null;
  const custom = Array.isArray(state?.customPrograms)
    ? state.customPrograms.find(p => p?.id === id)
    : null;
  // A matching custom record owns its ID. If it is corrupt, fail closed rather
  // than silently rendering a catalog/system program that happens to share it.
  if (custom) return isUsableProgram(custom) ? custom : null;
  if (PROGRAMS[id]) return isUsableProgram(PROGRAMS[id]) ? PROGRAMS[id] : null;
  // Catalog-only programs — normalize to workout-compatible shape
  const catalogEntry = getCatalogEntry(id);
  if (catalogEntry) {
    const normalized = {
      ...catalogEntry,
      totalWeeks: catalogEntry.durationWeeks || 12,
      weeklyVolModifiers: catalogEntry.weeklyVolModifiers || {},
      dossier: catalogEntry.dossier || {
        creator: catalogEntry.author?.name || 'openHybrid',
        focus:   catalogEntry.tagline || '',
        philosophy: catalogEntry.description || '',
      },
    };
    return isUsableProgram(normalized) ? normalized : null;
  }
  return null;
}

export function getActiveProgramIssue(state = appState) {
  const id = state?.activeProgramId;
  if (!id || resolveProgramForState(state, id)) return null;
  const customRecordExists = Array.isArray(state?.customPrograms)
    && state.customPrograms.some(program => program?.id === id);
  return {
    id,
    reason: customRecordExists ? 'corrupt' : 'missing',
    title: 'Program unavailable',
    message: 'The saved program could not be loaded. Your logged history is still safe. Choose a replacement below or create a new program.',
  };
}

// ==========================================
// PROGRAM LIBRARY — Bookmarks, Completions, Ratings
// ==========================================

function ensureProgramLibrary() {
  if (!appState.programLibrary) {
    appState.programLibrary = { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} };
  }
}

export function toggleBookmark(programId) {
  ensureProgramLibrary();
  const lib = appState.programLibrary;
  const idx = lib.bookmarks.indexOf(programId);
  if (idx === -1) {
    lib.bookmarks.push(programId);
  } else {
    lib.bookmarks.splice(idx, 1);
  }
  saveStateToLocalStorage(true);
  return lib.bookmarks.includes(programId);
}

export function isBookmarked(programId) {
  return appState.programLibrary?.bookmarks?.includes(programId) ?? false;
}

export function markProgramCompleted(programId, weeksCompleted) {
  ensureProgramLibrary();
  const existing = appState.programLibrary.completions.find(c => c.programId === programId);
  if (existing) {
    existing.completedAt = new Date().toISOString();
    existing.weeksCompleted = weeksCompleted;
  } else {
    appState.programLibrary.completions.push({ programId, completedAt: new Date().toISOString(), weeksCompleted });
  }
  saveStateToLocalStorage(true);
}

export function isProgramCompleted(programId) {
  return appState.programLibrary?.completions?.some(c => c.programId === programId) ?? false;
}

export function recordRecentlyViewed(programId) {
  ensureProgramLibrary();
  const lib = appState.programLibrary;
  lib.recentlyViewed = lib.recentlyViewed.filter(v => v.programId !== programId);
  lib.recentlyViewed.unshift({ programId, viewedAt: new Date().toISOString() });
  if (lib.recentlyViewed.length > 20) lib.recentlyViewed.length = 20;
  // Autosave (debounced, no toast): viewing a program shouldn't fire a
  // "Saved" toast or an immediate write on every detail open.
  saveStateToLocalStorage(true);
}

export function savePersonalRating(programId, rating, review = '') {
  ensureProgramLibrary();
  appState.programLibrary.personalRatings[programId] = { rating, review, ratedAt: new Date().toISOString() };
  saveStateToLocalStorage(true);
}

export function getPersonalRating(programId) {
  return appState.programLibrary?.personalRatings?.[programId] ?? null;
}

// ==========================================
// PROGRAM LIBRARY CRUD LOGIC
// ==========================================

// A collision-resistant program id. Date.now() alone repeats when two programs
// are created in the same millisecond (e.g. fork-then-duplicate), which would
// mint two records with the SAME id — a genuine identity hazard.
function newProgramId() {
  return `prog_${Date.now()}_${secureRandomSuffix(6)}`;
}

export function createCustomProgram(name, totalWeeks, focus, philosophy) {
  const id = newProgramId();
  const newProg = {
    id,
    name: name || "New Custom Program",
    totalWeeks: parseInt(totalWeeks, 10) || 12,
    dossier: { creator: "You", focus: focus || "Custom Focus", philosophy: philosophy || "A custom built training block." },
    days: {},
    weeklyVolModifiers: {}
  };
  
  ['mon','tue','wed','thu','fri','sat','sun'].forEach(d => {
    newProg.days[d] = { title: "Rest", badge: "Rest", color: "var(--text-muted)", desc: "", runs: "Rest", lifts: [] };
  });
  
  for(let i = 1; i <= newProg.totalWeeks; i++) {
    // Empty label → the builder shows the "Phase label (e.g. Build, Peak)"
    // placeholder instead of a meaningless "Custom Block" repeated down every
    // week (which read as "why are all 12 rows identical?").
    newProg.weeklyVolModifiers[i.toString()] = { sets: 3, reps: 10, intensityLabel: "" };
  }
  
  if (!appState.customPrograms) appState.customPrograms = [];
  appState.customPrograms.push(newProg);
  saveStateToLocalStorage(true);
  return id;
}

// Copy a program into the user's editable customPrograms.
// Identity model (three explicit states of `isPrimaryCustomization`):
//   true      → the ONE primary customization a built-in's Customize reopens
//   false     → a deliberate, independent variant (e.g. the Duplicate action)
//   undefined → a legacy copy from before this field existed
// `primary` is only ever true for the first fork of a built-in (see
// customizeProgram); an explicit Duplicate leaves it false so it can never
// compete with the primary. Cloning never inherits primary status.
export function duplicateCustomProgram(id, { primary = false, keepName = false } = {}) {
  const source = getProgramById(id);
  if (!source) return null;
  const newProg = JSON.parse(JSON.stringify(source));
  newProg.id = newProgramId();
  // keepName is for the "make the ACTIVE program editable" path, where the copy
  // is the same plan the user is already following — a "(Copy)" suffix there
  // would read as an unrelated program.
  newProg.name = keepName ? newProg.name : newProg.name + " (Copy)";
  // A fork is authored by the user, not the original coach — keep it honest
  // ("by You") and out of the verified-author UI.
  if (newProg.dossier) newProg.dossier.creator = "You";
  if (newProg.author) newProg.author = { name: "You", type: "custom", verified: false };
  // Source attribution: a copy of a library/built-in program remembers its
  // origin. A copy of another custom program inherits that program's origin, so
  // a variant of a customization still points at the built-in template.
  const sourceIsCustom = (appState.customPrograms || []).some(p => p?.id === id);
  newProg.sourceProgramId = sourceIsCustom ? (source.sourceProgramId || null) : id;
  newProg.isPrimaryCustomization = primary === true;

  if (!appState.customPrograms) appState.customPrograms = [];
  appState.customPrograms.push(newProg);
  saveStateToLocalStorage(true);
  return newProg.id;
}

// A program the user owns and can edit in place (lives in customPrograms), as
// opposed to a shared built-in/library template that must be forked before edit.
export function isCustomProgram(id) {
  return (appState.customPrograms || []).some(p => p?.id === id);
}

// The single primary customization of a built-in/library template, if one
// exists. Resolved by an explicit flag — never by array order or first match —
// so intentionally-duplicated variants can never be opened by mistake.
export function findPrimaryCustomization(sourceId) {
  if (!sourceId) return null;
  return (appState.customPrograms || []).find(
    p => p?.sourceProgramId === sourceId && p?.isPrimaryCustomization === true,
  ) || null;
}

// Backward-compatibility for copies made before isPrimaryCustomization existed
// (flag undefined). If a template has no explicit primary and exactly ONE such
// legacy copy, adopt it as the primary and return its id. Ambiguous cases
// (multiple legacy copies) are left untouched — we never guess which was
// intended. Idempotent, and never touches deliberate variants (flag === false).
export function adoptLegacyPrimaryCustomization(sourceId) {
  if (!sourceId) return null;
  const list = appState.customPrograms || [];
  if (list.some(p => p?.sourceProgramId === sourceId && p?.isPrimaryCustomization === true)) return null;
  const legacy = list.filter(p => p?.sourceProgramId === sourceId && p?.isPrimaryCustomization == null);
  if (legacy.length !== 1) return null;
  legacy[0].isPrimaryCustomization = true;
  saveStateToLocalStorage(true);
  return legacy[0].id;
}

// Make the ACTIVE program editable in place, transparently.
//
// If the active program is a shared built-in/catalog template, back it with an
// editable personal program (reuse an existing primary copy, else fork one that
// KEEPS the original name) and TRANSFER the active identity to it. This is NOT a
// program switch: the same activation, the same currentWeek and all logged
// history are preserved — only `activeProgramId` (and the active activation
// record's programId, so a later resume/hydration can't restore the built-in)
// move to the personal id. Untouched future weeks re-derive from the personal
// definition on the next edit via reconcileActiveProgramEdits.
//
// A no-op for an already-personal active program (edited in place elsewhere).
// Returns the program id that is active afterwards.
export function ensureActiveProgramEditable() {
  const activeId = appState.activeProgramId;
  if (!activeId || isCustomProgram(activeId)) return activeId;

  let personalId = findPrimaryCustomization(activeId)?.id || adoptLegacyPrimaryCustomization(activeId);
  if (!personalId) personalId = duplicateCustomProgram(activeId, { primary: true, keepName: true });
  if (!personalId) return activeId;

  ensureActivation(appState); // guarantee a record exists before we retarget it
  appState.activeProgramId = personalId;
  const activation = (appState.activations || []).find(a => a?.id === appState.activeActivationId);
  if (activation) activation.programId = personalId;
  saveStateToLocalStorage(true);
  return personalId;
}

export function deleteCustomProgram(id) {
  if (appState.activeProgramId === id) {
    return { success: false, message: "Cannot delete the currently active program." };
  }
  if (!appState.customPrograms) return { success: false, message: "No custom programs found." };
  
  appState.customPrograms = appState.customPrograms.filter(p => p.id !== id);
  saveStateToLocalStorage(true);
  return { success: true };
}

// ==========================================
// DELOAD WEEK
// ==========================================

// Dismiss the deload suggestion for the current week (won't show again this week).
export function dismissDeloadSuggestion() {
  appState._deloadDismissedWeek = appState.currentWeek;
  saveStateToLocalStorage(true);
}

// Apply a deload to the current week: halve the *incomplete* working sets of
// each lift (keeping at least one). Completed sets and warm-ups are never
// touched, so no logged work is lost. Marks the week as deloaded.
export function applyDeloadToCurrentWeek() {
  const wk   = appState.currentWeek;
  const week = appState.weeks?.[wk];
  if (week && week.lifts) {
    for (const day in week.lifts) {
      const dayLifts = week.lifts[day];
      for (const lift in dayLifts) {
        const sets = dayLifts[lift];
        if (!Array.isArray(sets)) continue;
        const incompleteCount = sets.filter(s => !(isCompletedSet(s) || s?.type === 'W')).length;
        const keepN = Math.max(1, Math.ceil(incompleteCount / 2));
        let seen = 0;
        dayLifts[lift] = sets.filter(s => {
          if (isCompletedSet(s) || s?.type === 'W') return true; // keep all logged sets + warm-ups
          seen++;
          return seen <= keepN;                      // keep the first N incomplete, drop the rest
        });
      }
    }
  }
  appState.deloadApplied = wk;
  saveStateToLocalStorage(true);
}

// ==========================================
// INIT & SCHEMA
// ==========================================
export function determineDefaultCalendarDay() {
  const idx = new Date().getDay();
  const crossMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  selectedDay = crossMap[idx];
}

export function verifyWeekStorageSchema(wk) {
  const activeProgram = getProgramById(appState.activeProgramId);
  // An unknown/deleted/corrupt active ID is a recovery state, not permission to
  // seed the default plan into that ID's week. Leave state untouched until the
  // user explicitly chooses a replacement from Programs.
  if (!activeProgram) return false;
  if (!appState.weeks) appState.weeks = {};
  // Every seeded/edited week belongs to the current program run, so make sure one
  // exists to stamp ownership with (backfills legacy/boot states harmlessly).
  const activationId = ensureActivation(appState);

  if (!appState.weeks[wk]) {
    appState.weeks[wk] = { runs: {}, runSessions: {}, lifts: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {}, liftMeta: {}, liftOrder: {}, dates: {},
      activationId, programId: appState.activeProgramId };
    DEFAULT_DAYS.forEach(d => {
      appState.weeks[wk].runs[d] = { dist: '', time: '', rpe: '' };
      appState.weeks[wk].runSessions[d] = [];
      appState.weeks[wk].notes[d] = '';
      appState.weeks[wk].gymRpe[d] = '';
      appState.weeks[wk].bodyWeight[d] = '';
      appState.weeks[wk].gymStats[d] = { time: '', avgHR: '', maxHR: '', cals: '' };
      appState.weeks[wk].lifts[d] = {};
    });

    DEFAULT_DAYS.forEach(d => {
      const dayBlueprint = activeProgram.days[d];
      // Ignore blank/whitespace lift names (custom-builder programs can carry
      // empty rows) so they never seed a junk lift key or pollute liftOrder.
      const liftNames = (dayBlueprint?.lifts || []).filter(n => typeof n === 'string' && n.trim());
      if (liftNames.length > 0) {
        const weekModifier = getWeekModifier(activeProgram, wk);

        liftNames.forEach(liftName => {
          appState.weeks[wk].lifts[d][liftName] =
            prescribeSetsForLift(wk, d, liftName, dayBlueprint.desc, weekModifier, { program: activeProgram, week: wk, dayKey: d });
        });
        // Stamp the explicit display order (blueprint order). Render reads this
        // instead of object-key enumeration, which would otherwise float any
        // integer-like keys to the top and scramble the prescribed sequence.
        appState.weeks[wk].liftOrder[d] = [...liftNames];
      }
    });
  }
  // Defensive schema repair for imported/current-version snapshots that lack
  // the v4 sidecar. This adopts any legacy projection before creating arrays.
  migrateLegacyRunSessions({ weeks: { [wk]: appState.weeks[wk] } }, DEFAULT_DAYS);

  // Older builds materialised every lift from the week-wide 3×10 fallback when
  // an authored target was a range/max prescription or lived in the lift name.
  // Reconcile only the active program's scaffold: untouched rows resize exactly;
  // user-entered/completed rows are never removed and only gain missing rows.
  const week = appState.weeks[wk];
  if (!week.lifts || typeof week.lifts !== 'object') week.lifts = {};
  const modifier = getWeekModifier(activeProgram, wk);
  DEFAULT_DAYS.forEach((day) => {
    const blueprint = activeProgram.days?.[day];
    for (const liftName of (blueprint?.lifts || [])) {
      // A set the athlete DELETED must not be padded back. This pass runs on
      // boot, week nav, run logging and GPS finish, so without this an ✕ in the
      // cockpit undid itself moments later — and removing an exercise's last set
      // (the only way to drop it from today) re-seeded the whole exercise.
      const ownPlan = sessionSetPlan(week, day, liftName);
      if (ownPlan === 0) {
        if (week.lifts[day]) delete week.lifts[day][liftName];
        const order = week.liftOrder?.[day];
        if (Array.isArray(order)) week.liftOrder[day] = order.filter((n) => n !== liftName);
        continue;
      }
      if (ownPlan != null) continue; // the athlete owns this lift's set count today
      const ctx = { program: activeProgram, week: wk, dayKey: day };
      const target = liftTarget(blueprint.desc, liftName, modifier, ctx);
      const existing = week.lifts?.[day]?.[liftName];
      const reconciled = reconcilePrescribedSets(existing, target.sets, jtRoleStampsForCtx(ctx, liftName));
      if (!week.lifts[day]) week.lifts[day] = {};
      week.lifts[day][liftName] = reconciled;
    }
  });
  return true;
}

// A set counts as "logged" (real history, never discard on a program switch)
// once it's completed or carries an entered weight. Prescribed-but-untouched
// sets seed w:'' with only a rep target, so they don't qualify.
function liftHasLoggedData(sets) {
  return Array.isArray(sets) && sets.some(s => s && (isCompletedSet(s) || (s.w !== '' && s.w != null)));
}

function dayHasRecordedActivity(week, day) {
  if (!week || !day) return false;
  if (week.sessionStatus?.[day] === 'in_progress' || week.sessionStatus?.[day] === 'finished') return true;
  if (Object.values(week.lifts?.[day] || {}).some(liftHasLoggedData)) return true;
  if (runSessionsForDay(week, day).some(run => run && (run.dist || run.time || run.rpe || run.completed))) return true;
  const legacyRun = week.runs?.[day];
  if (legacyRun && (legacyRun.dist || legacyRun.time || legacyRun.rpe)) return true;
  const stats = week.gymStats?.[day];
  return !!(week.notes?.[day] || week.gymRpe?.[day] || week.dates?.[day]
    || stats?.time || stats?.avgHR || stats?.maxHR || stats?.cals);
}

/**
 * Reconcile edits to the active custom program into materialised, untouched
 * workout days. Any day with real activity or an explicit session lifecycle is
 * preserved byte-for-byte; future/unstarted scaffolding is rebuilt from the
 * edited blueprint so removed exercises cannot linger in the logger.
 */
export function reconcileActiveProgramEdits(programId) {
  if (!programId || appState.activeProgramId !== programId) {
    return { updatedDays: 0, preservedDays: 0 };
  }
  const program = getProgramById(programId);
  if (!program?.days) return { updatedDays: 0, preservedDays: 0 };
  const activationId = ensureActivation(appState);
  if (!appState.weeks?.[appState.currentWeek]) verifyWeekStorageSchema(appState.currentWeek);

  let updatedDays = 0;
  let preservedDays = 0;
  for (const [wk, week] of Object.entries(appState.weeks || {})) {
    if (!/^\d+$/.test(wk) || !week || (week.activationId && week.activationId !== activationId)) continue;
    if (!week.lifts || typeof week.lifts !== 'object') week.lifts = {};
    if (!week.liftOrder || typeof week.liftOrder !== 'object') week.liftOrder = {};
    const modifier = getWeekModifier(program, wk);
    for (const day of DEFAULT_DAYS) {
      if (dayHasRecordedActivity(week, day)) {
        preservedDays++;
        continue;
      }
      const blueprint = program.days?.[day] || {};
      const liftNames = (blueprint.lifts || []).filter(name => typeof name === 'string' && name.trim());
      const next = {};
      for (const liftName of liftNames) {
        next[liftName] = prescribeSetsForLift(wk, day, liftName, blueprint.desc, modifier, { program, week: wk, dayKey: day });
      }
      week.lifts[day] = next;
      week.liftOrder[day] = [...liftNames];
      // The day is being rebuilt wholesale from the edited blueprint, so any
      // set count the athlete stamped on the old scaffolding is void.
      clearDaySetPlans(week, day);
      updatedDays++;
    }
  }
  return { updatedDays, preservedDays };
}

// Begin a fresh run of a program: mint a new activation identity and vacate every
// numeric week owned by the PREVIOUS run into the archive (logged history kept for
// analytics, empty scaffolding dropped). After this, the numeric program-week slots
// are clean for the new run — the caller seeds the chosen start week. Returns the
// new activation id. Used by both a program SWITCH and a same-program RESTART: each
// is a distinct run, so a restart never inherits the prior run's completed state.
export function startProgramActivation(programId, startWeek = 1) {
  beginActivation(appState, programId, startWeek);
  return archiveForeignWeeks(appState);
}

// Re-point a single week at the *active* program: add the new program's
// exercises, drop the previous program's unlogged scaffolding, and rebuild
// liftOrder (new blueprint order first, retained logged lifts appended). This
// replaces stale scaffolding so a program switch doesn't leave a week showing
// the union of both programs. Logged sets are always preserved.
export function reseedActiveProgramIntoWeek(wk) {
  const activationId = ensureActivation(appState);
  // ISOLATION GUARD: if this numeric slot is owned by a PREVIOUS activation, it
  // holds a different program run's logged history. Archive it (kept for
  // analytics/PRs) and clear the slot so the new run seeds clean — a previous
  // program's completed lifts can never be appended to this workout.
  if (appState.weeks?.[wk] && appState.weeks[wk].activationId &&
      appState.weeks[wk].activationId !== activationId) {
    archiveForeignWeeks(appState);
  }
  verifyWeekStorageSchema(wk); // ensures the week object exists & is shaped (fresh if just vacated)
  const program = getProgramById(appState.activeProgramId);
  if (!program?.days) return;
  const weekModifier = getWeekModifier(program, wk);
  const week = appState.weeks[wk];
  if (!week.lifts) week.lifts = {};
  if (!week.liftOrder) week.liftOrder = {};
  // Stamp ownership so a later switch can recognise this run's weeks.
  week.activationId = activationId;
  week.programId = appState.activeProgramId;

  DEFAULT_DAYS.forEach(d => {
    const blueprintLifts = (program.days[d]?.lifts || []).filter(n => typeof n === 'string' && n.trim());
    if (!week.lifts[d]) week.lifts[d] = {};
    const existing = week.lifts[d];

    // 1. Drop old, unlogged scaffolding that isn't in the new blueprint.
    for (const liftName of Object.keys(existing)) {
      if (blueprintLifts.includes(liftName)) continue;
      if (!liftHasLoggedData(existing[liftName])) delete existing[liftName];
    }
    // 2. Seed new blueprint lifts, AND re-prescribe kept-but-unlogged ones so an
    //    unlogged lift's row count always matches THIS program+week's target.
    //    Without the re-prescribe, a lift shared by both programs (e.g. "Bench
    //    Press") keeps the *old* program's set count while the cockpit label
    //    recomputes to the new one — the "Target: 3 × 8 but 4 rows" bug. Logged
    //    sets are never touched (liftHasLoggedData guard).
    blueprintLifts.forEach(liftName => {
      if (!existing[liftName] || !liftHasLoggedData(existing[liftName])) {
        existing[liftName] = prescribeSetsForLift(wk, d, liftName, program.days[d]?.desc, weekModifier, { program, week: wk, dayKey: d });
        // Re-prescribed from this program+week's target — the athlete's own set
        // count belonged to the scaffolding that was just replaced.
        clearSessionSetPlan(week, d, liftName);
      }
    });
    // 3. Rebuild order: blueprint order, then retained logged lifts (history).
    const retained = Object.keys(existing).filter(n => !blueprintLifts.includes(n));
    week.liftOrder[d] = [...blueprintLifts, ...retained];
  });
}

// ==========================================
// CLOUD PERSISTENCE
// ==========================================
//
// recomputeLoadMetrics() rebuilds the full daily CTL/ATL timeline (Date math +
// sort over every logged day) — far too heavy to run on every keystroke-save.
// It only depends on per-day RPE/duration, so we memoise on a cheap signature
// of exactly those fields and skip the rebuild when nothing relevant changed.
let _loadSig = null;
let _loadCache = { atl: 0, ctl: 0 };

function loadMetricsSignature(state) {
  if (!state.weekStartedAt || !state.currentWeek) return 'none';
  const parts = [state.weekStartedAt, state.currentWeek];
  const weeks = state.weeks || {};
  for (const wk of Object.keys(weeks)) {
    const wd = weeks[wk];
    if (!wd) continue;
    for (const d of DEFAULT_DAYS) {
      const gr = wd.gymRpe?.[d];
      const gt = wd.gymStats?.[d]?.time;
      const runSig = runSessionsForDay(wd, d)
        .map(run => `${run.sessionId || ''}:${run.rpe || ''}/${run.time || ''}`)
        .join(',');
      // Session RPE can fall back to the MEAN of per-set RPE/RIR when the
      // source has no session-level number, and an unrated failed set counts as
      // RPE 10. The memo must see all three fields, or toggling Failure leaves
      // stale ATL/CTL cached.
      const setRpeSig = Object.values(wd.lifts?.[d] || {})
        .flat()
        .filter((set) => isValidWorkingSet(set)
          && (set.rpe != null || set.rir != null || isFailedSet(set)))
        .map(set => `${set.rpe ?? ''}:${set.rir ?? ''}:${isFailedSet(set) ? 1 : 0}`)
        .join(',');
      if (gr || gt || runSig || setRpeSig) {
        parts.push(`${wk}${d}:${gr || ''}/${gt || ''}/${runSig}/${setRpeSig}`);
      }
    }
  }
  return parts.join('|');
}

// Exported for the regression test that proves a failure toggle invalidates the
// memo. Production callers use memoizedLoadMetrics() below.
export { loadMetricsSignature };

function memoizedLoadMetrics(state) {
  const sig = loadMetricsSignature(state);
  if (sig === _loadSig) return _loadCache;
  _loadSig = sig;
  _loadCache = recomputeLoadMetrics(state);
  return _loadCache;
}

// Local-write coalescing. Serialising the entire appState to localStorage on
// every weight/rep keystroke is wasteful for large histories. High-frequency,
// low-criticality edits (typing) go through scheduleLocalSave() and coalesce
// into one write; critical events (set complete, finish, run save) still call
// saveStateToLocalStorage() for an immediate write. A debounced flush always
// serialises the CURRENT appState, so it can never persist stale data.
let _localTimer = null;
let _localPending = false;
let _persistenceSuspended = false;
const LOCAL_DEBOUNCE_MS = 400;
// Dev instrumentation: set localStorage.openhybridPersistDebug='1' to log slow writes.
let _persistDebug = false;
try { _persistDebug = typeof localStorage !== 'undefined' && localStorage.getItem('openhybridPersistDebug') === '1'; } catch { /* ignore */ }
const PERSIST_WARN_MS = 16; // one frame budget

function _now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

// One honest warning per failure streak: a full localStorage must never look
// like a successful save. The mirror may still have the change; say which.
let _storageFailureNotified = false;
function _notifyStorageFailure(mirrored) {
  if (_storageFailureNotified) return;
  _storageFailureNotified = true;
  if (typeof document === 'undefined') return;
  showToast(
    mirrored
      ? 'Device storage is full — this change was saved in the app’s private mirror.'
      : 'Device storage is full — this change was not saved. Export a backup now.',
    true,
  );
}

// Import/reset are destructive writes that replace or remove the local key. A
// debounced flush or a pagehide during their reload window would otherwise write
// the OLD in-memory state back over the new bytes. Cancel the pending timer
// before the write, and suspend persistence entirely for a reset.
export function cancelPendingLocalSave() {
  if (_localTimer) { clearTimeout(_localTimer); _localTimer = null; }
  _localPending = false;
}

export function setPersistenceSuspended(suspended) {
  _persistenceSuspended = !!suspended;
  if (_persistenceSuspended) cancelPendingLocalSave();
}

// The one place that actually serialises + writes local state. Cancels any
// pending debounce (it just wrote the latest), recomputes memoized load metrics,
// and — in dev — warns when a single write blows the frame budget.
function writeLocalNow() {
  if (_persistenceSuspended) return false;
  if (_localTimer) { clearTimeout(_localTimer); _localTimer = null; }
  _localPending = false;
  // Do not turn boot's empty defaults into a "returning" local profile while
  // the recovery welcome is waiting. A JSON restore writes its real data
  // directly or releases this gate; deliberate onboarding completion does too.
  if (isRecoveryGatePending()) return false;
  appState.loadMetrics = memoizedLoadMetrics(appState);
  const t0 = _persistDebug ? _now() : 0;
  const json = JSON.stringify(appState);
  const savedAt = new Date().toISOString();
  const mirrorOn = mirrorSupported();
  let saved = false;
  try {
    localStorage.setItem(STORAGE_KEY, json);
    // Only the Android build has a mirror to compare against; browser/PWA
    // builds keep their single-write budget.
    if (mirrorOn) {
      try { localStorage.setItem(SAVED_AT_KEY, savedAt); } catch { /* tie-breaker only */ }
    }
    saved = true;
  } catch (e) {
    console.error('Failed to save state locally:', e);
  }
  // The Android shell keeps an app-private mirror of the same document. It is a
  // backup on a normal save and the durable copy when localStorage is full.
  const mirrorWrite = mirrorOn ? writeMirror(json) : Promise.resolve({ status: 'unavailable' });
  void mirrorWrite.then((result) => {
    if (saved) { _storageFailureNotified = false; return; }
    _notifyStorageFailure(!!result && result.status === 'saved');
  });
  if (_persistDebug) {
    const dt = _now() - t0;
    if (dt > PERSIST_WARN_MS) console.warn(`[persist] local write ${dt.toFixed(1)}ms (state ~${json.length} bytes)`);
  }
  return saved;
}

// Debounced local persist for rapid, non-critical edits (typing weight/reps).
// Coalesces a burst of keystrokes into a single serialize. Crash safety:
// critical actions never use this path, and flushLocalSave() runs on
// pagehide/visibilitychange so a backgrounded app persists the last keystroke.
export function scheduleLocalSave() {
  _localPending = true;
  if (!_localTimer) {
    _localTimer = setTimeout(() => { _localTimer = null; if (_localPending) writeLocalNow(); }, LOCAL_DEBOUNCE_MS);
  }
}

// Force any pending debounced LOCAL write to happen now (before unload/reads).
export function flushLocalSave() {
  if (_localPending || _localTimer) writeLocalNow();
}

if (typeof window !== 'undefined') {
  // Never lose the last debounced local write when the app is backgrounded or
  // killed. There is no cloud copy to flush to any more.
  window.addEventListener('pagehide', flushLocalSave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushLocalSave(); });
}

export async function saveStateToLocalStorage(suppressToast = false) {
  // Critical/explicit save: write local immediately (also cancels any pending
  // debounced local write, since we just persisted the latest state).
  const savedLocally = writeLocalNow();
  if (!suppressToast && savedLocally) showToast('Saved on this device ✓');
  return savedLocally;
}

export async function pullEngineDataFromStorage() {
  beginRecoveryGate();
  let localData = null;
  let rawLocal = null;
  // The Android shell's private mirror is the durable copy when WebView
  // storage was cleared, is corrupt, or failed a quota write. It only wins if
  // it is newer than localStorage; the browser path no-ops.
  // Read and parse the local blob FIRST. The mirror restore below writes its copy
  // over localStorage, so parsing afterwards destroyed an unreadable blob before
  // it could be quarantined (no _corrupt copy, no recovery screen, no signal).
  let corruptRaw = null;
  try {
    rawLocal = localStorage.getItem(STORAGE_KEY);
    if (rawLocal) {
      localData = JSON.parse(rawLocal);
    }
  } catch (e) {
    corruptRaw = rawLocal;
    preserveCorruptState(localStorage, STORAGE_KEY, rawLocal);
    console.error('Failed to parse local storage:', e);
  }
  let mirrorRestore = null;
  try {
    mirrorRestore = await restoreStateMirror({
      storage: _defaultStorage(),
      stateKey: STORAGE_KEY,
      savedAtKey: SAVED_AT_KEY,
    });
  } catch (e) {
    console.warn('State mirror restore failed:', e);
  }
  if (mirrorRestore && mirrorRestore.restored && mirrorRestore.state) {
    localData = mirrorRestore.state;
    rawLocal = JSON.stringify(localData);
    console.info('Restored app state from the Android private mirror.');
  }
  // No readable local copy and no valid mirror: stop before onboarding or any
  // convenience save can overwrite bytes that may still be recoverable. The
  // recovery screen can export the preserved blob.
  if (corruptRaw && !(mirrorRestore && mirrorRestore.restored && mirrorRestore.state)) {
    if (typeof document !== 'undefined') {
      showMigrationRecovery({ corrupt: true }, document, () => location.reload(), {
        getRawState: () => recoveryRawState(_defaultStorage(), STORAGE_KEY),
        onStartFresh: () => {
          cancelPendingLocalSave();
          setPersistenceSuspended(true);
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_KEY + '_corrupt');
            localStorage.removeItem(STORAGE_KEY + '_backup');
            localStorage.removeItem(SAVED_AT_KEY);
          } catch { /* recovery best-effort */ }
          clearMirror();
          location.reload();
        },
      });
    }
    throw new Error('The saved openHybrid data could not be read.');
  }

  const baseDefaults = {
    schemaVersion: 0, // 0 = legacy/unstamped; migrateState() upgrades + stamps on load
    currentWeek: '1', activeProgramId: 'hybrid_engine', weekStartedAt: null,
    weeks: {}, exerciseStats: {}, customExercises: [], customPrograms: [],
    routines: [], libraryFolders: [], bodyWeightLog: [],
    thresholdPaceSeconds: null, deloadApplied: null, _deloadDismissedWeek: null,
    streakData: { current: 0, longest: 0, lastActivityDate: null },
    goalData: { milestones: [], completedCount: 0 },
    prGoals: {},
    loadMetrics: { atl: 0, ctl: 0 },
    healthConnect: { connected: false, lastSync: null, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [], stepGoal: 10000, syncFields: { steps: true, restingHR: true, hrv: true, sleep: true }, fieldStatus: {} },
    wellnessLog: [],
    fastingSession: { active: false, startTime: null, goal: 16, history: [] },
    programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
settings: { name: '', weightUnit: 'kg', distanceUnit: 'km', progressionIncrement: 2.5, defaultBodyWeight: null, autoAdvanceWeek: true, theme: 'dark', reducedMotion: 'system', onboardingComplete: false, fitnessGoal: 'hybrid', weightGoal: 'maintain', fitnessLevel: 'intermediate', equipmentTier: 'gym', weekStartDay: 'mon', weeklyFrequency: 'some', sessionMinutes: 45, fastingDefault: 16, reminderTime: { hour: 7, minute: 30 }, notificationsEnabled: false, notifWeeklySummary: false, notifStreak: false, streakAlertTime: { hour: 20, minute: 0 }, notifMissedWorkout: false, notifFastingStage: true, musclePriorities: {}, equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true, bands: false, kettlebells: false, ezBar: false, treadmill: false }, bandWeights: { L: 10, M: 20, H: 30 }, equipmentProfiles: [], activeEquipmentProfileId: null, restPeriods: { ...DEFAULT_REST_TIERS }, restTimerEnabled: true, restAlertSound: true, restAlertVolume: 0.4, restOverrides: {}, exercisePrefs: {}, previousValuesScope: 'all', showPlateHints: false, autoWarmupRamp: false, keepAwake: true, livePR: true, hybridTraining: true, targetWeight: null, rateGoal: null, palette: 'midnight', avatarDataUrl: null },
    profileSections: { order: null, hidden: [] },
    dashboardTiles: { order: null, hidden: null },   // hidden:null = focused default set (R4)
    hybridScore: { history: [], xp: 0, lastRecordedDate: null },
    overtrainingAck: null,        // { sig, date } — acknowledged risk condition (R10)
    _overtrainingPushedDate: null,
    streakFreezes: { available: 1, used: [], earnedTier: 0 },   // R7 streak protection
  };

  // Always seed defaults so a brand-new install (no localData) still
  // has every top-level key — notably `settings`, which the schema-patch block
  // below dereferences. Settings is deep-merged so keys added in later versions
  // reach returning users instead of being shadowed by their stored object.
  appState = {
    ...baseDefaults,
    ...(localData || {}),
    settings: { ...baseDefaults.settings, ...(localData && localData.settings) },
  };

  // Whether this device had a real saved openHybrid blob when the app loaded. This is
  // the honest "returning user" signal for onboarding: a brand-new install has
  // none. It must be read here, before verifyWeekStorageSchema() seeds an empty
  // week scaffold — otherwise every fresh user looks like they already have data
  // and onboarding (and its provisional-Score reveal) never shows.
  appState._hadStoredState = localData != null;

  // Schema Patching
  if (!appState.activeProgramId) appState.activeProgramId = "hybrid_engine";
  if (!appState.exerciseStats) appState.exerciseStats = {};
  // `exerciseStats` is DERIVED from the logged sets, so rebuild it on load.
  // Without this it only refreshed when a set was ticked, so a workout deleted
  // (or an import replacing history) left the stale max standing until the next
  // time the athlete happened to log something — and the cockpit's PR gate
  // reads that max, so a deleted lift could keep suppressing real PRs.
  try {
    computeExercisePRs(appState, appState.exerciseStats);
  } catch (e) { console.warn('Could not rebuild exercise PRs on load:', e); }
  if (!appState.weeks) appState.weeks = {};
  if (!appState.customExercises) appState.customExercises = [];
  if (!appState.customPrograms) appState.customPrograms = [];
  // Routine arrays are additive and independent of the programme; this keeps
  // imports/backups from an older build readable before the migration stamps.
  ensureRoutines(appState);
  if (!appState.bodyWeightLog) appState.bodyWeightLog = [];
  if (appState.thresholdPaceSeconds === undefined) appState.thresholdPaceSeconds = null;
  if (appState.deloadApplied === undefined) appState.deloadApplied = null;
  if (!appState.streakData) appState.streakData = { current: 0, longest: 0, lastActivityDate: null };
  if (!appState.goalData) appState.goalData = { milestones: [], completedCount: 0 };
  if (!appState.loadMetrics) appState.loadMetrics = { atl: 0, ctl: 0 };
  if (!appState.healthConnect) appState.healthConnect = { connected: false, lastSync: null, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [], stepGoal: 10000, syncFields: { steps: true, restingHR: true, hrv: true, sleep: true }, fieldStatus: {} };
  if (!appState.wellnessLog) appState.wellnessLog = [];
  if (!appState.fastingSession) appState.fastingSession = { active: false, startTime: null, goal: 16, history: [] };
  if (!appState.prGoals) appState.prGoals = {};
  if (!appState.profileSections) appState.profileSections = { order: null, hidden: [] };
  if (!appState.dashboardTiles) appState.dashboardTiles = { order: null, hidden: null };
  // One-time migration of dashboard tile layout from the legacy standalone
  // localStorage keys into synced app state. The legacy keys are removed so a
  // later "reset tiles" can't be silently resurrected from them on next load.
  try {
    if (appState.dashboardTiles.order == null) {
      const _legacyOrder = localStorage.getItem('dashboardTileOrder');
      if (_legacyOrder) appState.dashboardTiles.order = JSON.parse(_legacyOrder);
    }
    if (!appState.dashboardTiles.hidden || appState.dashboardTiles.hidden.length === 0) {
      const _legacyHidden = localStorage.getItem('dashboardTilesHidden');
      if (_legacyHidden) appState.dashboardTiles.hidden = JSON.parse(_legacyHidden);
    }
    localStorage.removeItem('dashboardTileOrder');
    localStorage.removeItem('dashboardTilesHidden');
  } catch {}
  if (!appState.settings.avatarDataUrl && appState.settings.avatarDataUrl !== null) appState.settings.avatarDataUrl = null;
  if (!appState.settings.bandWeights) appState.settings.bandWeights = { L: 10, M: 20, H: 30 };
  if (!appState.settings.restPeriods) appState.settings.restPeriods = { ...DEFAULT_REST_TIERS };
  if (appState.settings.restPeriods.warmup === undefined) appState.settings.restPeriods.warmup = DEFAULT_REST_TIERS.warmup;
  if (appState.settings.restAlertSound === undefined) appState.settings.restAlertSound = true;
  if (appState.settings.restAlertVolume === undefined) appState.settings.restAlertVolume = 0.4;
  if (appState.settings.restTimerEnabled === undefined) appState.settings.restTimerEnabled = true;
  if (appState.settings.weightGoal === undefined) appState.settings.weightGoal = 'maintain';
  if (!appState.settings.restOverrides) appState.settings.restOverrides = {};
  if (!appState.settings.exercisePrefs || typeof appState.settings.exercisePrefs !== 'object') appState.settings.exercisePrefs = {};
  if (appState.settings.previousValuesScope !== 'program') appState.settings.previousValuesScope = 'all';

  // Run versioned schema migrations before any save-capable sub-module starts.
  // A failed step leaves localStorage byte-for-byte untouched, blocks the rest
  // of boot, and presents an explicit retry path instead of running on a
  // partially upgraded blob.
  try {
    migrateState(appState);
  } catch (migrationError) {
    showMigrationRecovery(migrationError);
    throw migrationError;
  }

  // Keep the active profile and the legacy projection fields in lockstep even
  // when a backup/import predates profiles or carries a stale projection.
  ensureEquipmentProfiles(appState);
  projectActiveEquipmentProfile(appState);

  reconcileRecoveryGate({
    hadLocalState: localData != null,
    onboardingComplete: appState.settings?.onboardingComplete === true,
  });

  verifyWeekStorageSchema(appState.currentWeek);
  appState.loadMetrics = recomputeLoadMetrics(appState);

  // Wire up sub-modules now that state is live
  initImportExport({
    getState:    () => appState,
    defaultDays: DEFAULT_DAYS,
  });

  try {
    emitStorageLoadedEvent();
  } catch (err) {
    console.warn('Storage loaded event dispatch failed.', err);
  }
}

export function saveNewCustomExerciseToLibrary(exerciseName) {
  const cleanedName = exerciseName.trim();
  if (!cleanedName) return;
  if (!appState.customExercises) appState.customExercises = [];
  if (!appState.customExercises.includes(cleanedName)) {
    appState.customExercises.push(cleanedName);
    saveStateToLocalStorage(true); 
  }
}
