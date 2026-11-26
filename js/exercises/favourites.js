// @ts-check
// =============================================================================
// FAVOURITE EXERCISES (G7)
//
// One preference, one owner. A favourite is stored as `settings.favouriteExercises`
// — an id-keyed map, not a list — so a catalogue alias resolves to the SAME
// entry, toggling is idempotent, and a removed/renamed catalogue id simply stops
// matching instead of shifting positions.
//
// The picker/library read this module; nothing else sorts on its own copy.
// =============================================================================
import { canonicalExerciseId } from './catalog.js';

/** Bound the map: an import cannot smuggle an unbounded object into state. */
export const MAX_FAVOURITES = 120;

/**
 * The map key for a name: the canonical catalogue id when the catalogue knows
 * it, otherwise the trimmed custom name (custom exercises are real entries too).
 * @param {string} name
 */
export function favouriteKey(name) {
  const text = String(name || '').trim();
  if (!text) return '';
  return canonicalExerciseId(text) || text;
}

/** @param {any} state */
function favouriteMap(state) {
  const map = state?.settings?.favouriteExercises;
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

/** @param {any} state @param {string} name */
export function isFavourite(state, name) {
  const key = favouriteKey(name);
  return !!key && !!favouriteMap(state)[key];
}

/** @param {any} state */
export function favouriteIds(state) {
  const map = favouriteMap(state);
  return Object.keys(map).filter((key) => map[key]);
}

/**
 * Write the preference in place; the caller owns persistence (one save path).
 * @param {any} state @param {string} name @param {boolean} [value] omit to toggle
 * @returns {boolean} the new state of the star
 */
export function setFavourite(state, name, value) {
  const key = favouriteKey(name);
  if (!state || !key) return false;
  if (!state.settings || typeof state.settings !== 'object') state.settings = {};
  /** @type {Record<string, boolean>} */
  const map = { ...favouriteMap(state) };
  const next = value === undefined ? !map[key] : !!value;
  if (next) {
    if (!map[key] && Object.keys(map).length >= MAX_FAVOURITES) return false;
    map[key] = true;
  } else {
    delete map[key];
  }
  state.settings.favouriteExercises = map;
  return next;
}

/** Stable favourites-first partition; everything else keeps the incoming order. */
export function sortFavouritesFirst(items, state, nameOf = (item) => item?.name) {
  const list = Array.isArray(items) ? items : [];
  const favourite = [];
  const rest = [];
  for (const item of list) {
    (isFavourite(state, nameOf(item)) ? favourite : rest).push(item);
  }
  return [...favourite, ...rest];
}

/** The star control. A real 44px button with a state-bearing accessible name. */
export function favouriteStarHTML(state, name) {
  const on = isFavourite(state, name);
  const label = `${on ? 'Remove' : 'Add'} ${name} ${on ? 'from' : 'to'} favourites`;
  return `<button type="button" class="el-star${on ? ' is-favourite' : ''}"
    data-action="el-favourite" data-exname="${String(name).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}"
    aria-pressed="${on}" aria-label="${label.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}">
    <span aria-hidden="true">${on ? '★' : '☆'}</span>
  </button>`;
}
