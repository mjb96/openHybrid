// @ts-check
// =============================================================================
// PLANS HOME (js/programs/plans-home-model.js)
//
// Pure grouping for the Plans landing. The surface used to be a two-tab library
// (Discover | My Plans) whose counts summed four lists, so a plan that was both
// saved and completed counted twice, and a bookmark for a deleted plan rendered
// as the default programme. This module answers only: "what does this athlete
// already have, once each?" — the view owns presentation and the recommendation
// row keeps its own model (`recommendations.js` + `active-plan-banner.js`).
//
// No DOM, no state writes, no storage.
// =============================================================================
import { getCatalogEntry } from './catalog.js';

/**
 * Resolve a stored id to display metadata. Deliberately does NOT fall back to
 * the default programme: a bookmark or completion for a deleted id must drop
 * out, never masquerade as something the athlete can train.
 * @param {any} state
 * @param {string} id
 */
export function resolvePlanMeta(state, id) {
  if (typeof id !== 'string' || !id) return null;
  return getCatalogEntry(id) || (state?.customPrograms || []).find((p) => p?.id === id) || null;
}

/**
 * One row per plan the athlete owns or saved, plus their routines.
 *
 * - `custom`   personal/edited plans (the ones with Edit/Delete)
 * - `saved`    bookmarks that resolve to a real plan
 * - `completed` recorded completions that resolve, excluding ones already shown
 * - `routines` reusable session templates (a different thing, kept separate)
 *
 * A plan can legitimately appear in two source lists (saved and completed). It
 * appears ONCE in `rows`, and the count is a distinct count.
 *
 * @param {any} state
 * @returns {{
 *   rows: {program:any, kind:'custom'|'saved'|'completed', active:boolean, completed:boolean, saved:boolean}[],
 *   routines: any[],
 *   archived: any[],
 *   planCount: number,
 *   count: number,
 *   hasAnything: boolean,
 * }}
 */
export function planLibraryGroups(state) {
  const allCustom = Array.isArray(state?.customPrograms) ? state.customPrograms.filter(Boolean) : [];
  const custom = allCustom.filter((p) => !p.archived);
  const archived = allCustom.filter((p) => !!p.archived);
  const routines = Array.isArray(state?.routines) ? state.routines.filter(Boolean) : [];
  const bookmarks = Array.isArray(state?.programLibrary?.bookmarks) ? state.programLibrary.bookmarks : [];
  const completions = Array.isArray(state?.programLibrary?.completions) ? state.programLibrary.completions : [];
  const activeId = state?.activeProgramId || null;

  /** @type {Map<string, {program:any, kind:'custom'|'saved'|'completed', active:boolean, completed:boolean, saved:boolean}>} */
  const byId = new Map();

  const add = (program, kind) => {
    if (!program?.id) return;
    // An archived plan is hidden everywhere on Plans, including from Saved and
    // Completed — archiving is the athlete saying "not now", not "delete".
    if (program.archived) return;
    const existing = byId.get(program.id);
    if (existing) {
      // A stronger provenance wins the label; flags accumulate either way.
      if (kind === 'custom') existing.kind = 'custom';
      else if (kind === 'saved' && existing.kind === 'completed') existing.kind = 'saved';
      return;
    }
    byId.set(program.id, {
      program,
      kind,
      active: program.id === activeId,
      completed: completions.some((c) => c?.programId === program.id),
      saved: bookmarks.includes(program.id),
    });
  };

  // Custom first (the athlete's own work), then saved, then only-finished.
  for (const program of custom) add(program, 'custom');
  for (const id of bookmarks) add(resolvePlanMeta(state, id), 'saved');
  for (const completion of completions) add(resolvePlanMeta(state, completion?.programId), 'completed');

  const rows = [...byId.values()];
  const planCount = rows.length;
  return {
    rows,
    routines,
    archived,
    planCount,
    count: planCount + routines.length,
    hasAnything: planCount + routines.length + archived.length > 0,
  };
}

/**
 * The one-line facts a plan row shows. Catalog programmes carry rich metadata;
 * personal plans carry only a 7-day template, so the day count is derived from
 * it rather than from a decorative `sessionsPerWeek`.
 * @param {any} program
 * @returns {{weeks:number, daysPerWeek:number, level:string|null, focus:string}}
 */
export function planRowFacts(program) {
  const days = program?.days && typeof program.days === 'object' ? program.days : {};
  const trained = Object.values(days).filter((day) => {
    const lifts = Array.isArray(day?.lifts) ? day.lifts.filter((n) => typeof n === 'string' && n.trim()) : [];
    const run = typeof day?.runs === 'string' && day.runs.trim() && !/^rest$/i.test(day.runs.trim());
    return lifts.length > 0 || run;
  }).length;
  const weeks = Number(program?.durationWeeks || program?.totalWeeks) || 0;
  const level = typeof program?.difficulty === 'string' ? program.difficulty : null;
  const focus = String(program?.dossier?.focus || '').trim();
  return {
    weeks,
    daysPerWeek: Number(program?.sessionsPerWeek) || trained,
    level,
    focus,
  };
}

/** Human label for a row's provenance. */
export function planKindLabel(row) {
  if (row?.active) return 'Active';
  if (row?.kind === 'custom') return 'Your plan';
  if (row?.kind === 'saved') return 'Saved';
  if (row?.completed) return 'Finished';
  return '';
}
