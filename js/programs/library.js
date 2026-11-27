// @ts-check
// =============================================================================
// PLANS — home and browse (js/programs/library.js)
// -----------------------------------------------------------------------------
// Roadmap §22 (PL1/PL2). This surface used to be a two-tab library
// (Discover | My Plans) with a three-button utility row, an always-visible
// search field and a chip wall that could not be reached. Measured at 390px it
// was 3,216px tall with 21 controls above the fold and no way to filter 58
// programmes.
//
// It is now: ONE home (your plan · recommendations · your plans · routines ·
// Browse all) and a pushed Browse screen with one search, a Filters sheet and a
// sort. Nothing is duplicated: the recommendation row keeps the models it had,
// the plan page keeps the detail renderer, and routines keep their cards.
//
// The home's own actions (open, edit, duplicate, delete, make active) are
// ordinary data-action buttons, so they run through the app's existing handlers
// rather than a second copy of each behaviour.
// =============================================================================
import { PROGRAM_CATALOG, DIFFICULTY_LABELS, getCatalogEntry } from './catalog.js';
import { getRecommendations } from './recommendations.js';
import { athleteProfile, recommendationBasis } from './recommendation-fit.js';
import { planLinkRowHTML } from './plan-link-row.js';
import { renderProgramDetail } from './detail.js';
import {
  recordRecentlyViewed, getProgramById, getActiveProgramIssue, isCustomProgram,
  saveStateToLocalStorage, planHasRecordedRuns,
  archiveCustomProgram, restoreCustomProgram,
} from '../state.js';
import { showToast } from '../toast.js';
import { escapeHtml, safeCssColor } from '../util.js';
import { buildActivePlanBanner } from './active-plan-banner.js';
import { routineSummary } from '../routines/model.js';
import {
  normalizeRoutineCategory, orderedFolders, ROUTINE_CATEGORIES, routineCategoryLabel,
} from '../routines/store.js';
import { planLibraryGroups, planRowFacts, planKindLabel } from './plans-home-model.js';
import {
  BROWSE_DAYS, BROWSE_GOALS, BROWSE_LENGTHS, BROWSE_LEVELS, BROWSE_SORTS,
  activeFilterCount, browsePlans, defaultBrowseFilters, emptyStateFor,
  filterSummary, hasEquipmentProfile, programFacts,
} from './browse-model.js';
import { openActionMenu } from '../ui/action-menu.js';
import { closeManagedModal, openManagedModal } from '../ui/modal-stack.js';
import { equipmentFit } from './compare.js';

let _appState = null;

// Ephemeral Browse state: entering Plans again starts fresh, so a remembered
// filter can never silently hide most of the catalogue.
/** @type {ReturnType<typeof defaultBrowseFilters>|null} */
let _filters = null;
let _sort = 'recommended';
let _browseOpen = false;
let _searchDebounce = null;
// Routine-library category filter (ephemeral, like the Progress filters).
let _routineCategoryFilter = 'all';

export function initProgramLibrary(appState) {
  _appState = appState;
  initPlansListeners();
}

export function updateLibraryState(appState) {
  _appState = appState;
}

// ── Home ─────────────────────────────────────────────────────────────────────

/**
 * Render the Plans home. Entering Plans always lands here (Browse is a pushed
 * screen); `returnToLibrary` restores Browse when it was open.
 */
export function renderLibrary() {
  const home = document.getElementById('plansHome');
  if (!home) return;
  initPlansListeners();
  _browseOpen = false;
  home.style.display = 'block';
  const browse = document.getElementById('plansBrowseScreen');
  if (browse) browse.style.display = 'none';

  renderActiveProgramBanner();
  renderRecommendations();
  renderMyPlans();
  renderBrowseEntry();
}

/**
 * Kept for the post-import call site. There is no tab to select any more; the
 * imported plan appears in "Your plans", so land on the home and bring that
 * section into view.
 */
export function showLibraryTab(_tab) {
  _browseOpen = false;
  _filters = null;
  renderLibrary();
  const mine = document.getElementById('progLibraryContent');
  if (mine && typeof mine.scrollIntoView === 'function') {
    try { mine.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch { /* best effort */ }
  }
}

// ── Active plan card (unchanged model; kept as the one primary) ─────────────

export function renderActiveProgramBanner() {
  const banner = document.getElementById('activeProgBanner');
  if (!banner || !_appState) return;

  const activeId = _appState.activeProgramId;
  if (!activeId) {
    banner.innerHTML = '';
    banner.style.display = 'none';
    return;
  }

  const issue = getActiveProgramIssue(_appState);
  if (issue) {
    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="active-prog-card active-prog-card--recovery" role="status" aria-live="polite">
        <div class="active-prog-inner">
          <div class="active-prog-left">
            <span class="active-prog-badge">ACTION NEEDED</span>
            <div class="active-prog-name">${escapeHtml(issue.title)}</div>
            <div class="active-prog-meta">${escapeHtml(issue.message)}</div>
          </div>
          <button class="create-cta-btn" data-action="open-create-program">Create new</button>
        </div>
      </div>`;
    return;
  }

  const catalog = getCatalogEntry(activeId) || null;
  // The resolved program (custom → PROGRAMS → normalized catalog) is
  // authoritative for training content, so an edited personal program shows its
  // edited day and not the pre-edit catalog one.
  const model = buildActivePlanBanner({
    state: _appState,
    program: getProgramById(activeId),
    catalog,
  });
  if (!model) {
    banner.innerHTML = '';
    banner.style.display = 'none';
    return;
  }

  const accent = safeCssColor(model.accent, '#8b5cf6');
  const circumference = 113;
  const dashArray = Math.round((model.week.pct / 100) * circumference);
  const dayAttr = model.action.day ? ` data-day="${escapeHtml(model.action.day)}"` : '';

  banner.style.display = 'block';
  banner.innerHTML = `
    <div class="active-prog-card" data-plan-state="${escapeHtml(model.session.state)}">
      <div class="active-prog-glow" style="background: ${accent}22"></div>
      <div class="active-prog-inner active-prog-open" role="button" tabindex="0"
           data-action="open-program-detail" data-program-id="${escapeHtml(activeId)}"
           aria-label="${escapeHtml(`${model.name}. ${model.week.label}. Open plan`)}">
        <div class="active-prog-left">
          <span class="active-prog-badge">ACTIVE PLAN</span>
          <div class="active-prog-name">${escapeHtml(model.name)}</div>
          <div class="active-prog-meta">${escapeHtml(model.week.label)}${
            model.thisWeek ? `<span class="active-prog-meta-sep">·</span>${escapeHtml(model.thisWeek.label)}` : ''
          }</div>
        </div>
        <div class="active-prog-right">
          <div class="active-prog-progress-ring" role="img" aria-label="${escapeHtml(model.week.pctLabel)}">
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
              <circle cx="22" cy="22" r="18" fill="none" class="active-prog-ring-track" stroke-width="3"/>
              <circle cx="22" cy="22" r="18" fill="none"
                stroke="${accent}" stroke-width="3"
                stroke-dasharray="${dashArray} ${circumference}"
                stroke-linecap="round"
                transform="rotate(-90 22 22)"/>
            </svg>
            <span class="active-prog-pct">${model.week.pct}%</span>
          </div>
          <span class="active-prog-arrow" aria-hidden="true">›</span>
        </div>
      </div>
      <div class="active-prog-next">
        <div class="active-prog-next-text">
          <span class="active-prog-next-lead">${escapeHtml(model.session.lead)}</span>
          <span class="active-prog-next-title">${escapeHtml(model.session.title)}</span>
          <span class="active-prog-next-status">${escapeHtml(model.session.status)}</span>
        </div>
        <button class="active-prog-continue-btn${model.action.tone === 'quiet' ? ' active-prog-continue-btn--quiet' : ''}"
                data-action="${escapeHtml(model.action.action)}"${dayAttr}>${escapeHtml(model.action.label)}</button>
      </div>
    </div>
  `;
}

// ── Recommendations (unchanged models, quieter section) ─────────────────────

function renderRecommendations() {
  const container = document.getElementById('plansRecommended');
  if (!container || !_appState) return;

  // `getRecommendations` returns nothing when it has no true reason to offer, so
  // the section is absent rather than a popularity chart wearing a personal
  // label. The basis line states (and lets the athlete correct) the inputs.
  const recommendations = getRecommendations(_appState, 3);
  if (!recommendations.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  // A per-row "why" only earns its space when the reasons DIFFER. Three
  // identical sentences under one heading are noise; state it once instead.
  const reasons = recommendations.map((item) => String(item.reason || '').trim()).filter(Boolean);
  const sharedReason = reasons.length === recommendations.length && new Set(reasons).size === 1
    ? reasons[0]
    : '';
  container.style.display = 'block';
  container.innerHTML = `
    <div class="collection-row collection-row--recommended">
      <div class="collection-header">
        <div class="collection-title-wrap">
          <div><div class="collection-title">Recommended For You</div></div>
        </div>
      </div>
      ${renderRecommendationBasis(recommendationBasis(athleteProfile(_appState)))}
      ${sharedReason ? `<p class="rec-shared-why">${escapeHtml(sharedReason)}</p>` : ''}
      <div class="rec-list">
        ${recommendations.map((item) => planLinkRowHTML(item.program, {
          reason: sharedReason ? '' : item.reason,
        })).join('')}
      </div>
    </div>
  `;
}

/**
 * The basis of the recommendations, correctable in place. Writes the same
 * settings fields the Profile owns, so the two can never disagree.
 * @param {ReturnType<typeof recommendationBasis>} basis
 */
function renderRecommendationBasis(basis) {
  if (!basis.length) return '';
  const summary = basis.map((b) => b.currentLabel).join(' · ');
  return `
    <details class="prog-basis">
      <summary class="prog-basis__summary">
        <span class="prog-basis__values">${escapeHtml(summary)}</span>
        <span class="prog-basis__change">Change</span>
      </summary>
      <div class="prog-basis__body">
        ${basis.map((b) => `
          <div class="prog-basis__group">
            <div class="prog-basis__question">${escapeHtml(b.question)}</div>
            <div class="prog-basis__options">
              ${b.options.map((o) => `
                <button class="prog-basis__btn ${o.value === b.current ? 'is-current' : ''}"
                        data-action="set-profile-answer"
                        data-field="${escapeHtml(b.id)}"
                        data-value="${escapeHtml(o.value)}"
                        aria-pressed="${o.value === b.current}">${escapeHtml(o.label)}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </details>
  `;
}

// ── Your plans ───────────────────────────────────────────────────────────────

function sectionHead(title, count) {
  const head = document.createElement('div');
  head.className = 'plans-section__head';
  const h = document.createElement('h2');
  h.className = 'plans-section__title';
  h.textContent = title;
  head.append(h);
  if (count != null) {
    const badge = document.createElement('span');
    badge.className = 'plans-section__count';
    badge.textContent = String(count);
    head.append(badge);
  }
  return head;
}

function renderMyPlans() {
  const container = document.getElementById('progLibraryContent');
  if (!container || !_appState) return;

  const groups = planLibraryGroups(_appState);
  const nodes = [sectionHead('Your plans', groups.planCount)];

  if (!groups.rows.length) {
    nodes.push(emptyPlansCard());
  } else {
    const list = document.createElement('div');
    list.className = 'plan-list';
    for (const row of groups.rows) list.append(planRowNode(row));
    nodes.push(list);
  }

  // Routines are saved SESSIONS, not plans — kept as their own section below
  // plans, with the existing cards, Start, folder and category controls.
  renderRoutineLibrary(nodes, groups.routines, orderedFolders(_appState));

  renderArchivedPlans(nodes, groups.archived);

  container.replaceChildren(...nodes);
}

/**
 * Archived plans. Archiving is how a trained plan leaves the list without
 * destroying the record its History attribution depends on, so restoring has to
 * be reachable — a one-way hide would be a slower delete.
 * @param {HTMLElement[]} nodes
 * @param {any[]} archived
 */
function renderArchivedPlans(nodes, archived) {
  if (!archived.length) return;
  const details = document.createElement('details');
  details.className = 'plans-archived';
  const summary = document.createElement('summary');
  summary.className = 'plans-archived__summary';
  summary.textContent = `Archived (${archived.length})`;
  details.append(summary);
  for (const program of archived) {
    if (!program?.id) continue;
    const row = document.createElement('div');
    row.className = 'plans-archived__row';
    const name = document.createElement('span');
    name.className = 'plans-archived__name';
    name.textContent = String(program.name || 'Plan');
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'plans-archived__restore';
    restore.dataset.action = 'restore-program';
    restore.dataset.programId = String(program.id);
    restore.textContent = 'Restore';
    row.append(name, restore);
    details.append(row);
  }
  nodes.push(details);
}

function emptyPlansCard() {
  const card = document.createElement('div');
  card.className = 'plans-empty';
  const title = document.createElement('div');
  title.className = 'plans-empty__title';
  title.textContent = 'No plans yet';
  const sub = document.createElement('p');
  sub.className = 'plans-empty__sub';
  sub.textContent = 'Pick one that fits your goal and kit, or build your own. Saved plans and routines live here.';
  const browse = document.createElement('button');
  browse.type = 'button';
  browse.className = 'plans-empty__cta';
  browse.dataset.action = 'open-browse';
  browse.textContent = 'Browse plans';
  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'plans-empty__cta plans-empty__cta--quiet';
  create.dataset.action = 'open-create-program';
  create.textContent = 'Build a plan';
  card.append(title, sub, browse, create);
  return card;
}

/**
 * One plan row. DOM + textContent, because a plan name can come from the athlete
 * or an imported file. The row's actions are: open (the row), and a `•••` menu
 * for edit/duplicate/delete/make-active — the same pattern Hevy and Strong use,
 * and the fix for "My Plans has no management controls".
 * @param {{program:any, kind:string, active:boolean, completed:boolean, saved:boolean}} row
 */
function planRowNode(row) {
  const program = row.program;
  const facts = planRowFacts(program);
  const id = String(program.id || '');
  const nameText = String(program.name || 'Plan');

  const wrapper = document.createElement('div');
  wrapper.className = `plan-row${row.active ? ' plan-row--active' : ''}`;
  wrapper.dataset.programId = id;

  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'plan-row__open';
  open.dataset.action = 'open-program-detail';
  open.dataset.programId = id;

  const main = document.createElement('span');
  main.className = 'plan-row__main';

  const nameLine = document.createElement('span');
  nameLine.className = 'plan-row__name-line';
  const name = document.createElement('span');
  name.className = 'plan-row__name';
  name.textContent = nameText;
  nameLine.append(name);
  const kindLabel = planKindLabel(row);
  if (kindLabel) {
    const badge = document.createElement('span');
    const kindClass = row.active ? 'active' : row.completed ? 'done' : row.saved ? 'saved' : 'custom';
    badge.className = `plan-row__badge plan-row__badge--${kindClass}`;
    badge.textContent = kindLabel;
    nameLine.append(badge);
  }

  const meta = document.createElement('span');
  meta.className = 'plan-row__meta';
  const bits = [];
  if (facts.weeks) bits.push(`${facts.weeks} week${facts.weeks === 1 ? '' : 's'}`);
  if (facts.daysPerWeek) bits.push(`${facts.daysPerWeek}×/week`);
  if (facts.level) bits.push(DIFFICULTY_LABELS[facts.level]?.label || facts.level);
  if (facts.focus) bits.push(facts.focus);
  meta.textContent = bits.join(' · ') || 'No training days set';

  main.append(nameLine, meta);
  open.append(main);

  const chevron = document.createElement('span');
  chevron.className = 'plan-row__chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '›';
  open.append(chevron);

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'plan-row__menu';
  menu.dataset.action = 'open-plan-menu';
  menu.dataset.programId = id;
  menu.setAttribute('aria-haspopup', 'menu');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', `Actions for ${nameText}`);
  menu.textContent = '•••';

  wrapper.append(open, menu);
  return wrapper;
}

function renderBrowseEntry() {
  const container = document.getElementById('plansBrowseEntry');
  if (!container) return;
  // With no plans yet, the empty card already offers Browse — do not repeat the
  // same action twice on one screen.
  const groups = planLibraryGroups(_appState);
  if (!groups.planCount) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <button type="button" class="plans-browse-entry" data-action="open-browse">
      <span class="plans-browse-entry__text">
        <strong>Browse all plans</strong>
        <span>${PROGRAM_CATALOG.length} plans across strength, hybrid and running</span>
      </span>
      <span class="plans-browse-entry__chevron" aria-hidden="true">›</span>
    </button>
  `;
}

// ── Routines (unchanged section, now below plans) ───────────────────────────

function routineFilterValue(routine) {
  return normalizeRoutineCategory(routine?.category) || 'uncategorised';
}

function routineFilterOptions(routines) {
  const counts = new Map();
  for (const routine of routines) {
    const key = routineFilterValue(routine);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const options = [{ value: 'all', label: 'All routines', count: routines.length }];
  for (const category of ROUTINE_CATEGORIES) {
    const count = counts.get(category.id) || 0;
    if (count) options.push({ value: category.id, label: category.label, count });
  }
  const uncategorised = counts.get('uncategorised') || 0;
  if (uncategorised) options.push({ value: 'uncategorised', label: 'Uncategorised', count: uncategorised });
  return options;
}

function routineFilterEmptyNode() {
  const empty = document.createElement('div');
  empty.className = 'routine-filter-empty';
  const text = document.createElement('p');
  text.textContent = 'No routines in this category.';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'routine-filter-clear';
  clear.setAttribute('data-action', 'clear-routine-filter');
  clear.textContent = 'Show all routines';
  empty.append(text, clear);
  return empty;
}

function renderRoutineCardNode(routine) {
  const summary = routineSummary(routine);
  const id = String(routine.id || '');
  const nameText = String(routine.name || 'Routine');

  const card = document.createElement('div');
  card.className = 'routine-card';
  card.setAttribute('data-routine-id', id);

  const main = document.createElement('div');
  main.className = 'routine-card__main';
  const name = document.createElement('div');
  name.className = 'routine-card__name';
  name.textContent = nameText;
  const meta = document.createElement('div');
  meta.className = 'routine-card__meta';
  const parts = [
    `${summary.exercises} exercise${summary.exercises === 1 ? '' : 's'}`,
    `${summary.workingSets} working set${summary.workingSets === 1 ? '' : 's'}`,
  ];
  if (summary.minutes != null) parts.push(`~${summary.minutes} min`);
  meta.textContent = parts.join(' · ');
  main.append(name, meta);
  const category = routineCategoryLabel(routine.category);
  if (category) {
    const categoryFlag = document.createElement('span');
    categoryFlag.className = 'routine-card__category';
    categoryFlag.textContent = category;
    main.append(categoryFlag);
  }
  if (String(routine.note || '').trim()) {
    const noteFlag = document.createElement('span');
    noteFlag.className = 'routine-card__note-flag';
    noteFlag.textContent = 'Note';
    main.append(noteFlag);
  }

  const actions = document.createElement('div');
  actions.className = 'routine-card__actions';

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'routine-card__start';
  start.setAttribute('data-action', 'start-routine');
  start.setAttribute('data-routine-id', id);
  start.textContent = 'Start';

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'routine-card__menu';
  menu.setAttribute('data-action', 'open-routine-menu');
  menu.setAttribute('data-routine-id', id);
  menu.setAttribute('aria-haspopup', 'menu');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', `Actions for ${nameText}`);
  menu.textContent = '•••';

  actions.append(start, menu);
  card.append(main, actions);
  return card;
}

/**
 * The Routines area of "Your plans". With no folders it is a flat list; with
 * folders it is one section per folder (sortOrder, then name) plus Unfiled.
 * Empty folders stay visible. A category filter narrows the same list.
 * @param {HTMLElement[]} nodes
 * @param {any[]} routines
 * @param {any[]} folders
 */
function renderRoutineLibrary(nodes, routines, folders) {
  if (!routines.length && !folders.length) return;

  const options = routineFilterOptions(routines);
  const active = options.some((option) => option.value === _routineCategoryFilter)
    ? _routineCategoryFilter
    : 'all';
  const visible = active === 'all'
    ? routines
    : routines.filter((routine) => routineFilterValue(routine) === active);

  const header = document.createElement('div');
  header.className = 'filtered-grid-header routine-library-head';
  const titleWrap = document.createElement('div');
  titleWrap.className = 'routine-library-head__title';
  const title = document.createElement('div');
  title.className = 'filtered-grid-title';
  title.textContent = 'Routines';
  const count = document.createElement('div');
  count.className = 'filtered-grid-count';
  count.textContent = visible.length === routines.length
    ? String(visible.length)
    : `${visible.length} of ${routines.length}`;
  titleWrap.append(title, count);
  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'routine-folder-create';
  create.setAttribute('data-action', 'create-routine-folder');
  create.textContent = '+ New folder';
  header.append(titleWrap, create);
  nodes.push(header);

  if (routines.length) {
    const filterRow = document.createElement('div');
    filterRow.className = 'routine-library-filter';
    const select = document.createElement('select');
    select.className = 'routine-filter-select';
    select.setAttribute('data-routine-category', '');
    select.setAttribute('aria-label', 'Filter routines by category');
    for (const option of options) {
      const item = document.createElement('option');
      item.value = option.value;
      item.textContent = `${option.label} (${option.count})`;
      if (option.value === active) item.selected = true;
      select.append(item);
    }
    filterRow.append(select);
    nodes.push(filterRow);
  }

  if (!folders.length) {
    if (visible.length) {
      const list = document.createElement('div');
      list.className = 'routine-list';
      visible.forEach((routine) => list.append(renderRoutineCardNode(routine)));
      nodes.push(list);
    } else if (routines.length) {
      nodes.push(routineFilterEmptyNode());
    }
    return;
  }

  const folderIds = new Set(folders.map((folder) => folder.id));
  let rendered = false;
  for (const folder of folders) {
    const members = visible.filter((routine) => routine?.folderId === folder.id);
    if (!members.length && active !== 'all') continue;
    nodes.push(renderRoutineFolderNode(folder, members));
    rendered = true;
  }
  const unfiled = visible.filter((routine) => !routine?.folderId || !folderIds.has(routine.folderId));
  if (unfiled.length) {
    nodes.push(renderRoutineFolderNode(null, unfiled));
    rendered = true;
  }
  if (!rendered && routines.length) nodes.push(routineFilterEmptyNode());
}

function renderRoutineFolderNode(folder, members) {
  const section = document.createElement('div');
  section.className = `routine-folder${folder ? '' : ' routine-folder--unfiled'}${members.length ? '' : ' routine-folder--empty'}`;
  section.setAttribute('data-folder-id', folder ? String(folder.id || '') : '');

  const head = document.createElement('div');
  head.className = 'routine-folder__head';
  const title = document.createElement('div');
  title.className = 'routine-folder__title';
  const name = document.createElement('span');
  name.className = 'routine-folder__name';
  name.textContent = folder ? String(folder.name || 'Folder') : 'Unfiled';
  const count = document.createElement('span');
  count.className = 'routine-folder__count';
  count.textContent = String(members.length);
  title.append(name, count);
  head.append(title);

  if (folder) {
    const menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'routine-folder__menu';
    menu.setAttribute('data-action', 'open-routine-folder-menu');
    menu.setAttribute('data-folder-id', String(folder.id || ''));
    menu.setAttribute('aria-haspopup', 'menu');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', `Actions for ${String(folder.name || 'folder')}`);
    menu.textContent = '•••';
    head.append(menu);
  }
  section.append(head);

  if (members.length) {
    const list = document.createElement('div');
    list.className = 'routine-list';
    members.forEach((routine) => list.append(renderRoutineCardNode(routine)));
    section.append(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'routine-folder__empty';
    empty.textContent = 'No routines yet';
    section.append(empty);
  }
  return section;
}

// ── Browse ───────────────────────────────────────────────────────────────────

export function openBrowse() {
  const home = document.getElementById('plansHome');
  const screen = document.getElementById('plansBrowseScreen');
  if (!screen) return;
  _browseOpen = true;
  if (!_filters) _filters = defaultBrowseFilters(_appState);
  if (home) home.style.display = 'none';
  screen.style.display = 'block';
  renderBrowseShell();
  if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
}

function closeBrowse() {
  _browseOpen = false;
  _filters = null;
  const screen = document.getElementById('plansBrowseScreen');
  if (screen) screen.style.display = 'none';
  const home = document.getElementById('plansHome');
  if (home) home.style.display = 'block';
  renderLibrary();
}

function currentFilters() {
  if (!_filters) _filters = defaultBrowseFilters(_appState);
  return _filters;
}

function renderBrowseShell() {
  const screen = document.getElementById('plansBrowseScreen');
  if (!screen) return;
  const filters = currentFilters();
  const query = String(filters.query || '');

  screen.innerHTML = `
    <div class="browse">
      <div class="browse__bar">
        <button type="button" class="browse__back" data-action="close-browse" aria-label="Back to Plans">‹</button>
        <h1 class="browse__title">Browse plans</h1>
        <button type="button" class="browse__filter-btn" data-action="open-plan-filters">
          Filters<span class="browse__filter-count" id="browseFilterCount"></span>
        </button>
      </div>

      <div class="browse__search">
        <input id="plansBrowseSearch" type="search" inputmode="search" autocomplete="off"
               autocorrect="off" spellcheck="false" value="${escapeHtml(query)}"
               placeholder="Search plans, your plans, routines" aria-label="Search plans">
      </div>

      <div class="browse__kinds" role="group" aria-label="Show">
        ${[['all', 'All'], ['program', 'Plans'], ['wod', 'Workouts']].map(([kind, label]) => `
          <button type="button" class="browse__kind ${filters.kind === kind ? 'is-active' : ''}"
                  data-action="browse-kind" data-kind="${kind}"
                  aria-pressed="${filters.kind === kind}">${label}</button>
        `).join('')}
      </div>

      <div class="browse__summary-row">
        <div id="browseSummary" class="browse__summary" role="status" aria-live="polite"></div>
        <label class="browse__sort">
          <span class="sr-only">Sort plans</span>
          <select id="plansBrowseSort" data-browse-sort aria-label="Sort plans">
            ${BROWSE_SORTS.map((sort) => `<option value="${sort.id}" ${sort.id === _sort ? 'selected' : ''}>${escapeHtml(sort.label)}</option>`).join('')}
          </select>
        </label>
      </div>

      <div id="browseResults" class="browse__results"></div>
    </div>
  `;
  renderBrowseResults();
}

function browseRowNode(program) {
  const facts = programFacts(program);
  const id = String(program.id || '');
  const nameText = String(program.name || 'Plan');

  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'browse-row';
  row.dataset.action = 'open-program-detail';
  row.dataset.programId = id;

  const name = document.createElement('span');
  name.className = 'browse-row__name';
  name.textContent = nameText;

  const meta = document.createElement('span');
  meta.className = 'browse-row__meta';
  const bits = [];
  bits.push(facts.wod ? 'Single workout' : (facts.categoryLabel || 'Plan'));
  if (!facts.wod) {
    if (facts.weeks) bits.push(`${facts.weeks} wks`);
    if (facts.daysPerWeek) bits.push(`${facts.daysPerWeek}×/wk`);
    if (facts.level) bits.push(DIFFICULTY_LABELS[facts.level]?.label || facts.level);
  }
  meta.textContent = bits.join(' · ');

  // State the kit honestly: "You have the kit" only when the athlete's list
  // covers every needed item; otherwise name what is missing.
  const fit = equipmentFit(facts.equipment, _appState?.settings?.equipment || {});
  let kitLine = null;
  if (fit.missing.length) {
    kitLine = document.createElement('span');
    kitLine.className = 'browse-row__kit browse-row__kit--missing';
    kitLine.textContent = `Needs ${fit.missing.map((t) => t.replace(/-/g, ' ')).join(', ')}`;
  } else if (fit.owned.length) {
    kitLine = document.createElement('span');
    kitLine.className = 'browse-row__kit browse-row__kit--ok';
    kitLine.textContent = 'You have the kit';
  }

  const chevron = document.createElement('span');
  chevron.className = 'browse-row__chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '›';

  row.append(name, meta);
  if (kitLine) row.append(kitLine);
  row.append(chevron);
  return row;
}

function renderBrowseResults() {
  const results = document.getElementById('browseResults');
  const summary = document.getElementById('browseSummary');
  const count = document.getElementById('browseFilterCount');
  if (!results) return;

  const filters = currentFilters();
  const model = browsePlans(_appState, filters, { sort: _sort });
  const labels = filterSummary(filters, _appState);

  if (count) count.textContent = ` (${activeFilterCount(filters, _appState)})`;
  if (summary) {
    const noun = model.total === 1 ? 'plan' : 'plans';
    summary.textContent = `${model.total} ${noun}${labels.length ? ` · ${labels.join(' · ')}` : ''}`;
  }

  results.replaceChildren();
  if (!model.total) {
    const empty = emptyStateFor(filters, _appState);
    const box = document.createElement('div');
    box.className = 'browse-empty';
    const title = document.createElement('div');
    title.className = 'browse-empty__title';
    title.textContent = empty.title;
    const message = document.createElement('p');
    message.className = 'browse-empty__message';
    message.textContent = empty.message;
    box.append(title, message);
    if (empty.clearable || String(filters.query || '').trim()) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'browse-empty__cta';
      clear.dataset.action = 'clear-browse-filters';
      clear.textContent = 'Clear filters and search';
      box.append(clear);
    }
    results.append(box);
    return;
  }

  if (model.mine.length) {
    results.append(browseGroupHeading('Your plans'));
    for (const program of model.mine) results.append(browseRowNode(program));
  }
  if (model.library.length) {
    results.append(browseGroupHeading(model.mine.length ? 'Library' : 'Plans'));
    for (const program of model.library) results.append(browseRowNode(program));
  }
}

function browseGroupHeading(label) {
  const h = document.createElement('h2');
  h.className = 'browse-group';
  h.textContent = label;
  return h;
}

// ── Filters sheet ────────────────────────────────────────────────────────────

function ensureFiltersSheet() {
  let root = document.getElementById('plansFilterSheet');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'plansFilterSheet';
  root.className = 'modal-overlay plans-filter-sheet';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'plansFilterSheetTitle');
  root.setAttribute('data-modal-root', '');
  root.setAttribute('data-modal-close-action', 'close-plan-filters');
  root.setAttribute('inert', '');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="modal-content plans-filter-panel">
      <div class="plans-filter-head">
        <h2 id="plansFilterSheetTitle">Filters</h2>
        <button type="button" data-action="close-plan-filters" aria-label="Close filters">×</button>
      </div>
      <div id="plansFilterBody" class="plans-filter-body"></div>
      <div class="plans-filter-foot">
        <button type="button" class="plans-filter-clear" data-action="clear-browse-filters">Clear all</button>
        <button type="button" class="plans-filter-done btn-blue" data-action="close-plan-filters" id="plansFilterDone">Show plans</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  return root;
}

function openFilters() {
  const root = ensureFiltersSheet();
  renderFilterSheet();
  root.classList.add('active');
  openManagedModal(root, { initialFocus: '.plans-filter-option' });
}

function closeFilters() {
  const root = document.getElementById('plansFilterSheet');
  if (!root) return;
  root.classList.remove('active');
  closeManagedModal(root);
}

function filterGroup(title, options, facet, value) {
  return `
    <div class="plans-filter-group" role="group" aria-label="${escapeHtml(title)}">
      <div class="plans-filter-label">${escapeHtml(title)}</div>
      <div class="plans-filter-options">
        <button type="button" class="plans-filter-option ${value === 'all' ? 'is-active' : ''}"
                data-action="browse-facet" data-facet="${facet}" data-value="all"
                aria-pressed="${value === 'all'}">Any</button>
        ${options.map((option) => `
          <button type="button" class="plans-filter-option ${value === option.id ? 'is-active' : ''}"
                  data-action="browse-facet" data-facet="${facet}" data-value="${option.id}"
                  aria-pressed="${value === option.id}">${escapeHtml(option.label)}</button>
        `).join('')}
      </div>
    </div>`;
}

function renderFilterSheet() {
  const body = document.getElementById('plansFilterBody');
  const done = document.getElementById('plansFilterDone');
  if (!body) return;
  const filters = currentFilters();
  const model = browsePlans(_appState, filters, { sort: _sort });

  // ST4: the equipment facet edits the SAME kit the Settings page owns — a
  // second copy of the checkbox list here would drift.
  const equipmentGroup = `
    <div class="plans-filter-group">
      <div class="plans-filter-label">Equipment</div>
      ${hasEquipmentProfile(_appState?.settings)
        ? filterGroup('', [{ id: 'mine', label: 'Only what I have' }], 'equipment', filters.equipment)
          + '<button type="button" class="plans-filter-kit" data-action="open-settings" data-page="once.equipment">Edit my kit</button>'
        : '<p class="plans-filter-hint">Tell the app what kit you have to filter by it.</p>'
          + '<button type="button" class="plans-filter-kit" data-action="open-settings" data-page="once.equipment">Add my kit in Settings</button>'}
    </div>`;

  body.innerHTML = `
    ${filterGroup('Goal', BROWSE_GOALS, 'goal', filters.goal)}
    ${filterGroup('Level', BROWSE_LEVELS, 'level', filters.level)}
    ${filterGroup('Days per week', BROWSE_DAYS.map(({ id, label }) => ({ id, label })), 'days', filters.days)}
    ${filterGroup('Length', BROWSE_LENGTHS, 'length', filters.length)}
    ${equipmentGroup}
  `;
  if (done) done.textContent = `Show ${model.total} plan${model.total === 1 ? '' : 's'}`;
}

// ── Detail / navigation ─────────────────────────────────────────────────────

export function openProgramDetail(programId) {
  const libraryScreen = document.getElementById('programLibraryScreen');
  const detailScreen = document.getElementById('programDetailScreen');
  if (!libraryScreen || !detailScreen) return;

  recordRecentlyViewed(programId);
  libraryScreen.style.display = 'none';
  detailScreen.style.display = 'block';
  detailScreen.scrollTop = 0;
  renderProgramDetail(programId, _appState);
}

export function returnToLibrary() {
  const libraryScreen = document.getElementById('programLibraryScreen');
  const detailScreen = document.getElementById('programDetailScreen');
  if (!libraryScreen || !detailScreen) return;

  detailScreen.style.display = 'none';
  libraryScreen.style.display = 'block';
  if (_browseOpen) {
    // Return to the Browse the athlete left, with its filters and query intact.
    renderBrowseShell();
  } else {
    renderLibrary();
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────

/**
 * Route a Plans action. Returns nothing; the app's global handler calls this for
 * its whitelist of actions.
 * @param {string} action
 * @param {HTMLElement} el
 * @param {Event} [event]
 */
export function handleLibraryAction(action, el, event) {
  switch (action) {
    case 'open-program-detail': {
      const id = el.closest('[data-program-id]')?.getAttribute('data-program-id');
      if (id) openProgramDetail(id);
      break;
    }
    // Answering the inline profile question. Writes the SAME settings fields
    // the Settings screen owns, so the two can never disagree.
    case 'set-profile-answer': {
      const field = el.getAttribute('data-field');
      const value = el.getAttribute('data-value');
      if (!_appState || !field || !value) break;
      if (!_appState.settings) _appState.settings = {};
      if (field === 'goal') _appState.settings.fitnessGoal = value;
      else if (field === 'level') _appState.settings.fitnessLevel = value;
      else if (field === 'equipment') _appState.settings.equipmentTier = value;
      else break;
      saveStateToLocalStorage(true);
      renderRecommendations();
      break;
    }
    case 'clear-routine-filter': {
      _routineCategoryFilter = 'all';
      renderMyPlans();
      break;
    }
    case 'open-browse':
      openBrowse();
      break;
    case 'close-browse':
      closeBrowse();
      break;
    case 'open-plan-filters':
      openFilters();
      break;
    case 'close-plan-filters':
      closeFilters();
      break;
    case 'browse-facet': {
      const facet = el.getAttribute('data-facet');
      const value = el.getAttribute('data-value') || 'all';
      if (!facet) break;
      const filters = currentFilters();
      // Tapping the active value clears it (one-tap undo of a facet).
      filters[facet] = (filters[facet] === value && value !== 'all') ? 'all' : value;
      renderFilterSheet();
      renderBrowseResults();
      break;
    }
    case 'browse-kind': {
      const kind = el.getAttribute('data-kind');
      if (!kind) break;
      currentFilters().kind = kind;
      for (const button of document.querySelectorAll('.browse__kind')) {
        const isActive = button.getAttribute('data-kind') === kind;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
      renderBrowseResults();
      break;
    }
    case 'clear-browse-filters': {
      const defaults = defaultBrowseFilters(_appState);
      _filters = { ...defaults, query: '' };
      const input = /** @type {HTMLInputElement|null} */ (document.getElementById('plansBrowseSearch'));
      if (input) input.value = '';
      renderFilterSheet();
      renderBrowseShell();
      break;
    }
    case 'open-plans-create-menu': {
      openActionMenu(/** @type {HTMLElement} */ (el), [
        { label: 'New plan', action: 'open-create-program' },
        { label: 'Import plan (.json)', action: 'import-plan-json' },
      ], { label: 'Create' });
      break;
    }
    case 'open-plan-menu': {
      const id = el.getAttribute('data-program-id');
      if (!id) break;
      const custom = isCustomProgram(id);
      const active = _appState?.activeProgramId === id;
      // A plan that has been trained cannot be deleted without orphaning its
      // history attribution, so it offers Archive instead of Delete.
      const trained = planHasRecordedRuns(id);
      openActionMenu(/** @type {HTMLElement} */ (el), [
        { label: 'Open plan', action: 'open-program-detail', programId: id },
        { label: custom ? 'Edit plan' : 'Customize', action: custom ? 'open-builder' : 'customize-program', programId: id },
        ...(active ? [] : [{ label: 'Make active', action: 'make-active-program', programId: id }]),
        ...(custom ? [{ label: 'Duplicate', action: 'duplicate-program', programId: id }] : []),
        ...(custom && trained ? [{ label: 'Archive (keeps history)', action: 'archive-program', programId: id }] : []),
        ...(custom && !trained ? [{ label: 'Delete', action: 'delete-program', programId: id, danger: true }] : []),
      ], { label: 'Plan actions' });
      break;
    }
    case 'archive-program': {
      const id = el.getAttribute('data-program-id');
      if (!id) break;
      const result = archiveCustomProgram(id);
      if (result.success) {
        showToast('Plan archived — your history is kept');
        renderLibrary();
      } else {
        showToast(result.message, true);
      }
      break;
    }
    case 'restore-program': {
      const id = el.getAttribute('data-program-id');
      if (!id) break;
      const result = restoreCustomProgram(id);
      if (result.success) {
        showToast('Plan restored');
        renderLibrary();
      } else {
        showToast(result.message, true);
      }
      break;
    }
  }
}

// ── DOM listeners (search, sort, routine filter) ─────────────────────────────

let _listenersReady = false;

export function initPlansListeners() {
  const screen = document.getElementById('programLibraryScreen');
  if (!screen || _listenersReady) return;
  _listenersReady = true;

  // Routine category filter (recreated with the list, so delegated).
  screen.addEventListener('change', (event) => {
    const target = /** @type {HTMLSelectElement|null} */ (event.target instanceof HTMLSelectElement ? event.target : null);
    if (!target) return;
    if (target.hasAttribute('data-routine-category')) {
      const value = target.value;
      _routineCategoryFilter = value === 'uncategorised' || ROUTINE_CATEGORIES.some((category) => category.id === value)
        ? value
        : 'all';
      renderMyPlans();
      return;
    }
    if (target.hasAttribute('data-browse-sort')) {
      _sort = BROWSE_SORTS.some((sort) => sort.id === target.value) ? target.value : 'recommended';
      renderBrowseResults();
    }
  });

  // Browse search: re-render results only, so focus and caret survive.
  screen.addEventListener('input', (event) => {
    const target = /** @type {HTMLInputElement|null} */ (event.target instanceof HTMLInputElement ? event.target : null);
    if (!target || target.id !== 'plansBrowseSearch') return;
    const value = target.value;
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => {
      currentFilters().query = value.trim();
      renderBrowseResults();
    }, 160);
  });
}
