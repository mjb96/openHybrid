// @ts-check
// ==========================================
// UPGRADED TEMPLATES — HTML SPATIAL BUILDERS
// ==========================================
import { DAY_NAMES_FULL } from './constants.js';
import { escapeHtml } from './util.js';
import { isBodyweightExercise, resolvedLoadMode } from './workout/load-mode.js';
import {
  basisLabel, defaultBasisForExercise, isUnilateralExercise, normalizeBasis, perSideRepsLabel, supportsLoadBasis,
} from './workout/load-basis.js';
import { compareWithPrevious, previousSetCompact, setRowNumberLabel } from './workout/set-entry.js';
import { effectiveSetMode } from './workout/set-shape.js';
import { formatDistance, formatDuration, setModeOf } from './set-utils.js';
// Leaf import: the row template needs the label only. Importing the records
// model here pulled the exercise catalogue and history scan into every render.
import { prKindLabel } from './strength/pr-labels.js';
import { displayWeightString, normalizeWeightUnit } from './metrics/weight-unit.js';

export function buildEmptyWorkoutCard() {
  return '<div class="card-dark text-xs-muted empty-state-card">No lifting scheduled today.</div>';
}

// `bodyweight` is null when the athlete has never logged one. It used to
// default to 75 kg and was shown in the weight field as if it were theirs.
export function buildSetRow(sData, sIdx, safeLiftName, historicalSetData = null, weightUnit = 'kg', exerciseName = safeLiftName, bodyweight = null, prescribedReps = null, prescribedRepGoal = null, previousSetData = null, roleTag = null, setMode = null, prescribed = null) {
  // `historicalSetData` is the VISUAL ghost for this row: normally the previous
  // set's entered values (see ghostForRow). `prescribed` is the coach's target
  // and stays the adherence baseline even when the ghost follows the athlete's
  // own previous set.
  // ST6: `sData.w`, `historicalSetData.w` and `prescribed.w` are STORED
  // KILOGRAMS. The row is a display surface, so every weight below is converted
  // once, here, and nowhere else in the row.
  const unit = normalizeWeightUnit(weightUnit);
  const ghostWeight = historicalSetData?.w ? displayWeightString(historicalSetData.w, unit) : weightUnit;
  const ghostReps   = historicalSetData?.r || prescribedReps || 'reps';
  const type = sData.type || '';
  const mode = setMode || effectiveSetMode(sData, exerciseName, null);
  const typeClass  = type === 'W' ? 'type-warmup' : type === 'D' ? 'type-dropset' : type === 'F' ? 'type-amrap' : '';

  const loadState = sData.bw ? 'BW' : (sData.band || '');
  const loadCls = loadState === '' ? 'weighted' : loadState === 'BW' ? 'bw' : loadState;
  const bodyweightCapable = isBodyweightExercise(exerciseName);
  const basisCapable = supportsLoadBasis(exerciseName);
  // A legacy COMPLETED set has no basis and was counted once -> show Both.
  // A new/blank dumbbell row defaults to Each and is stamped on completion.
  const basis = basisCapable
    ? normalizeBasis(sData.basis || (sData.c ? 'total' : defaultBasisForExercise(exerciseName)))
    : null;
  const restSeconds = Number(sData.restSec);
  const restLabel = sData.restSec == null
    ? 'Rest default'
    : restSeconds <= 0 ? 'Rest off' : `Rest ${Math.floor(restSeconds / 60)}:${String(restSeconds % 60).padStart(2, '0')}`;
  const directMode = resolvedLoadMode(sData, exerciseName);
  const knownBodyweight = Number.isFinite(Number.parseFloat(bodyweight)) && Number.parseFloat(bodyweight) > 0
    ? Number.parseFloat(bodyweight) : null;
  const effectiveValue = bodyweightCapable && directMode === 'bodyweight' && !sData.w && knownBodyweight != null
    ? displayWeightString(knownBodyweight, unit)
    : (sData.w ? displayWeightString(sData.w, unit) : '');

  // Tier-aware role tag (J&T top set / back-off / plus / target / MRS …). The
  // label is derived from the role STORED on the set (stable across row edits)
  // and matches the completed snapshot in history. Warm-up rows never carry one.
  const hasRole = roleTag && type !== 'W';
  const roleTagHtml = hasRole
    ? `<span class="set-role-tag set-role-tag--${escapeHtml(String(roleTag.role))}${roleTag.emphasis ? ' is-emphasis' : ''}" data-set-role="${escapeHtml(String(roleTag.role))}">${escapeHtml(String(roleTag.label))}</span>`
    : '';

  // Block-2 back-off (weeks 7–11): when the day's top set is known, seed the
  // WEIGHT placeholder with the 85%/90% suggestion and show its source line.
  // data-ghost-default preserves the non-suggestion ghost so clearing the top set
  // restores it (no stale calculated load). A row the athlete has filled keeps
  // its value (never overwritten); the suggestion only ever fills a blank.
  const boSrc = hasRole && roleTag.boSrc ? String(roleTag.boSrc) : '';
  const prescribedDisplay = prescribed?.w != null ? displayWeightString(prescribed.w, unit) : null;
  const ghostDefault = String(prescribedDisplay ?? ghostWeight);
  const weightPlaceholder = (hasRole && roleTag.backoffSuggest != null) ? String(roleTag.backoffSuggest) : String(ghostWeight);
  // The adherence baseline: the same value the placeholder used to carry before
  // it started following the previous set. Kept on the row so true-adherence
  // still measures against the prescription, not against the athlete's last set.
  // The coach's target, and ONLY the target. Falling back to ghostDefault here
  // recorded the athlete's own previous set as the prescription, so adherence
  // measured them against themselves.
  const prescribedPlaceholder = (hasRole && roleTag.backoffSuggest != null)
    ? String(roleTag.backoffSuggest)
    : (prescribedDisplay != null ? prescribedDisplay : '');
  const backoffHint = hasRole && roleTag.backoffHint ? String(roleTag.backoffHint) : '';
  const boAttrs = boSrc
    ? ` data-bo-src="${escapeHtml(boSrc)}" data-bo-pct="${escapeHtml(String(roleTag.boPct ?? ''))}"`
    : '';

  // PREVIOUS is a COLUMN now, not a line under the row. It shows the real prior
  // set for this set index — never the prescription or a ghost — because the
  // whole point is comparing today against what actually happened. An em dash
  // means there is no prior set; a blank would read as "still loading".
  // The PREVIOUS column and the comparison are display values too: comparing a
  // stored kilogram against a just-typed pound number would report a 2.2× win.
  const previousDisplay = previousSetData
    ? { ...previousSetData, w: displayWeightString(previousSetData.w, unit) }
    : null;
  const prev = previousSetCompact(previousDisplay, weightUnit);
  const priorWeight = parseFloat(previousDisplay?.w);
  const priorMode = previousSetData ? setModeOf(previousSetData) : null;
  const priorValue = priorMode === 'time' ? Number(previousSetData?.sec) || 0
    : priorMode === 'distance' ? Number(previousSetData?.dist) || 0
    : parseInt(previousSetData?.r, 10) || 0;
  const compare = compareWithPrevious(
    { ...sData, w: sData.w ? displayWeightString(sData.w, unit) : '' },
    previousDisplay,
  );
  const compareHtml = compare
    ? `<span class="set-cmp set-cmp--${compare.tone}" aria-label="${compare.label}" title="${compare.label}">${compare.glyph}</span>`
    : '';
  const prevCol = prev
    ? `<button type="button" class="set-prev-col" data-action="open-set-sheet" data-liftname="${safeLiftName}" data-sidx="${sIdx}" aria-label="${escapeHtml(prev.label)}" title="${escapeHtml(prev.label)}" data-prev-w="${Number.isFinite(priorWeight) ? priorWeight : ''}" data-prev-r="${Number.isFinite(parseInt(previousSetData?.r, 10)) ? parseInt(previousSetData?.r, 10) : ''}" data-prev-mode="${priorMode || ''}" data-prev-value="${priorValue || ''}">${escapeHtml(prev.text)}${compareHtml}</button>`
    : `<span class="set-prev-col is-empty" aria-label="No previous set">—</span>`;
  const noteHtml = sData.note
    ? `<div class="set-note">${escapeHtml(String(sData.note))}</div>`
    : '';
  // Stored set fields arrive from imported state (CSV rows, plan/backup JSON),
  // and `rir`/`type` are copied verbatim by an import. Every dynamic value in
  // the row's start tag is therefore escaped — including the ones whose current
  // writers only ever produce a closed vocabulary.
  //
  // `data-rir` is not read by the app: the set sheet renders its active cell
  // from stored state. It stays as a read-only inspection mirror AND as the
  // imported-content contract's canary for hostile stored RIR escaping
  // (tests/imported_content_rendering.test.js), which no other row attribute
  // covers.
  const rirAttr = sData.rir != null ? sData.rir : (sData.rpe != null ? 10 - sData.rpe : '');
  // G2: unilateral work is logged as ONE total (history and 1RM keep meaning the
  // total); the row states the per-side split so a side is never ambiguous.
  const unilateral = isUnilateralExercise(exerciseName) && mode === 'reps';

  return `<div class="cockpit-set-row ${sData.c ? 'is-complete' : ''} ${typeClass} ${sData.isPR ? 'is-pr' : ''}"${hasRole ? ` data-set-role="${escapeHtml(String(roleTag.role))}"` : ''}${boAttrs} data-set-index="${sIdx}" data-set-mode="${escapeHtml(String(mode))}" data-load-mode="${escapeHtml(String(directMode))}"${basisCapable ? ` data-load-basis="${escapeHtml(basis)}"` : ''} data-set-type="${escapeHtml(String(type))}" data-rest-label="${escapeHtml(restLabel)}" data-load-label="${escapeHtml(loadCls)}" data-basis-label="${escapeHtml(basisCapable ? basisLabel(basis) : '')}" data-failure="${sData.failure ? '1' : ''}" data-rir="${escapeHtml(String(rirAttr))}"${sData.prKind ? ` data-pr-kind="${escapeHtml(String(sData.prKind))}"` : ''}>
    ${roleTagHtml}
    ${sData.isPR ? `<span class="pr-badge">${escapeHtml(prKindLabel(sData.prKind))}</span>` : ''}
    <button type="button" class="set-num-lbl" data-action="open-set-sheet"
         data-liftname="${safeLiftName}" data-sidx="${sIdx}"
         aria-haspopup="dialog"
         aria-label="Set ${sIdx + 1} options: ${escapeHtml(restLabel.toLowerCase())}"
         title="Set type, load, rest, note">${setRowNumberLabel(type, sIdx)}</button>
    ${prevCol}
    <div class="set-entry">
      <input type="number" inputmode="decimal" class="input-weight-node" aria-label="Effective load for set ${sIdx + 1}" placeholder="${escapeHtml(weightPlaceholder)}" data-ghost-default="${escapeHtml(ghostDefault)}" data-prescribed="${escapeHtml(prescribedPlaceholder)}" data-display-value="${escapeHtml(effectiveValue)}" value="${escapeHtml(effectiveValue)}">
      ${boSrc ? `<small class="set-backoff-hint">${escapeHtml(backoffHint)}</small>` : ''}
    </div>
    <div class="set-entry">
      ${mode === 'time'
        ? `<input type="text" inputmode="numeric" class="input-time-node input-set-value-node" aria-label="Time for set ${sIdx + 1} (MM:SS)" placeholder="0:00" value="${sData.sec ? escapeHtml(formatDuration(sData.sec)) : ''}">`
        : mode === 'distance'
          ? `<input type="number" inputmode="decimal" class="input-dist-node input-set-value-node" aria-label="Distance for set ${sIdx + 1} (metres)" placeholder="m" value="${sData.dist ? escapeHtml(formatDistance(sData.dist)) : ''}">`
          : `<input type="number" inputmode="numeric" class="input-reps-node input-set-value-node" aria-label="Reps for set ${sIdx + 1}" data-target-reps="${escapeHtml(String(prescribedRepGoal || ''))}" placeholder="${escapeHtml(String(ghostReps))}" value="${escapeHtml(String(sData.r || ''))}">
            ${unilateral ? `<small class="set-per-side" data-per-side aria-live="polite">${escapeHtml(perSideRepsLabel(sData.r) || 'total reps')}</small>` : ''}`}
    </div>
    <div class="gym-check-container">
      <label class="gym-check-wrap">
        <input type="checkbox" class="gym-check" aria-label="Mark set ${sIdx + 1} complete" ${sData.c ? 'checked' : ''}>
        <span class="gym-check-icon">✓</span>
      </label>
    </div>
    <div class="set-row-msg" role="status" aria-live="polite" hidden></div>
    ${noteHtml}
    <div class="set-plate-line" data-set-plate hidden></div>
  </div>`;
}

export function buildExerciseCard({ displaySafeName, safeLiftName, isCompleted, diagnostic, blueprintLabel, targetLabel = '', targetWhy = '', historicalLineText, historyPanelHTML = '', setsMarkup, groupId = null, ssColor = null, ssMemberCount = 0, ssOrdinal = null, weightUnit = 'kg', weightColumnLabel = 'Reps' }) {
  const stalledBadge = diagnostic.isStalled ? `<span class="badge-stall-indicator">PROGRESS CHECK</span>` : '';
  const targetStyle  = diagnostic.isStalled ? 'color: var(--color-amber); font-weight: 800;' : '';
  const ssBtnClass   = groupId ? 'btn-ss-link ss-active' : 'btn-ss-link';
  const ssBtnStyle   = groupId ? `style="--ss-color:${ssColor};"` : '';
  // The button carries the group size so an athlete can tell a pair from a
  // three-exercise circuit without opening the panel. The accessible name adds
  // this member's place in the round.
  const memberCount = Number(ssMemberCount) > 0 ? Math.round(Number(ssMemberCount)) : 0;
  const ssBtnLabel   = groupId
    ? `SS ${escapeHtml(String(groupId))}${memberCount > 1 ? ` · ${memberCount}` : ''}`
    : 'SS+';
  const ssBtnAria    = groupId
    ? `Circuit ${escapeHtml(String(groupId))}${memberCount > 1 ? `, ${memberCount} exercises` : ''}${ssOrdinal ? `, exercise ${ssOrdinal.index} of ${ssOrdinal.total}` : ''}. Edit circuit`
    : 'Add this exercise to a superset circuit';

  return `<div class="cockpit-header">
    <div class="drag-handle-grip">☰</div>
    <div class="cockpit-header-clickzone" data-action="toggle-accordion">
      <div class="header-text-block">
        <div class="title-badge-row" style="display:flex; align-items:center;">
          <span class="cockpit-ex-name">${displaySafeName}</span>
          ${stalledBadge}
        </div>
        <div class="cockpit-ex-target" style="${targetStyle}" data-target-label="${escapeHtml(String(targetLabel || blueprintLabel))}">${escapeHtml(blueprintLabel)}</div>
        ${diagnostic?.message ? `<div class="cockpit-ex-diagnostic" data-diagnostic-note>${escapeHtml(diagnostic.message)}</div>` : ''}
        ${targetWhy && targetWhy !== diagnostic?.message ? `<div class="cockpit-ex-diagnostic" data-target-why>${escapeHtml(targetWhy)}</div>` : ''}
      </div>
      <div class="cockpit-ex-status">${isCompleted ? 'DONE' : 'LOG'}</div>
    </div>
    <button class="${ssBtnClass}" ${ssBtnStyle} data-action="show-ss-panel" data-liftname="${safeLiftName}" aria-label="${ssBtnAria}" title="${ssBtnAria}">${ssBtnLabel}</button>
    <button type="button" class="btn-ex-config tactile-scale" data-action="open-exercise-options" data-liftname="${safeLiftName}" aria-label="Settings for ${displaySafeName}" title="Exercise settings">⚙</button>
  </div>
  <div class="cockpit-body">
    <div class="local-timer-placeholder"></div>
    ${historyPanelHTML || `<span class="cockpit-history-line">${historicalLineText}</span>`}
    ${diagnostic.progression && diagnostic.progression.weight ? `
      <div class="cockpit-coach-target">
        <span class="cct-text"><small>Suggested next · this program run</small><b>${escapeHtml(String(diagnostic.progression.weight))}${escapeHtml(weightUnit)} × ${escapeHtml(String(diagnostic.progression.reps))} reps</b><em>${escapeHtml(String(diagnostic.progression.rationale || ''))}</em><span class="set-plate-hint" data-plate-hint hidden></span></span>
        ${isCompleted ? '' : `<button class="cct-logall tactile-scale" data-action="log-all-target">Log all →</button>`}
      </div>
    ` : ''}
    ${setsMarkup ? `<div class="set-rows-head" aria-hidden="true">
      <span class="srh-lbl">Set</span>
      <span class="srh-lbl">Previous</span>
      <span class="srh-lbl">Weight</span>
      <span class="srh-lbl">${weightColumnLabel}</span>
      <span class="srh-lbl">Done</span>
    </div>` : ''}
    <div class="set-rows-list">${setsMarkup}</div>
    <!-- Roadmap 2A, "make add/swap/… contextual instead of equally prominent".
         Adding a WARM-UP stops making sense once working sets are logged — you
         do not warm up after your work, so the has-logged-work class on the
         card hides it. Visibility is CSS-driven from that one class rather than
         a template branch, because ticking a set updates the DOM WITHOUT
         re-rendering the card: a template branch would only ever be right until
         the first tick. The capability is not lost — any row can still be
         re-typed to a warm-up from its dotted menu. -->
    <div class="append-set-row">
      <button class="btn-pad-append btn-append-primary tactile-scale" data-action="append-set" data-liftname="${safeLiftName}">+ Add set</button>
      <div class="append-set-secondary">
        <button class="btn-pad-link tactile-scale btn-append-warmup" data-action="append-warmup-set" data-liftname="${safeLiftName}">+ Warm-up</button>
        <button class="btn-pad-link tactile-scale btn-append-drop" data-action="append-drop-set" data-liftname="${safeLiftName}" aria-label="Add a drop set, 20 percent lighter than the last set">+ Drop</button>
        <button class="btn-pad-link tactile-scale" data-action="swap-exercise" data-liftname="${safeLiftName}">⇄ Swap</button>
      </div>
    </div>
  </div>`;
}
