// =============================================================================
// PROGRAM LIBRARY — Training program discovery and management
// =============================================================================
import { PROGRAM_CATALOG, CATEGORIES, DIFFICULTY_LABELS, getCatalogEntry } from './catalog.js';
import { getHomeCollections, filterByCategory, getCollectionDef } from './collections.js';
import { searchPrograms, POPULAR_SEARCHES, searchResultsHeading } from './search.js';
import { getRecommendations } from './recommendations.js';
import { athleteProfile, recommendationBasis } from './recommendation-fit.js';
import { renderProgramDetail, closeProgramDetail } from './detail.js';
import { renderProgramCard, renderProgramCardNode, isWod, coverGlyphFor } from './program-card.js';
import { icon as svgIcon } from '../ui/icons.js';
import { toggleBookmark, recordRecentlyViewed, getProgramById, getActiveProgramIssue, saveStateToLocalStorage } from '../state.js';
import { escapeHtml, safeCssColor } from '../util.js';
import { buildActivePlanBanner } from './active-plan-banner.js';

// V2-6 — the curated home rails (in order) shown on the lean Discover surface.
// Everything else stays reachable via the category chips + Browse-all grid.
const CURATED_HOME_COLLECTIONS = ['hybridhq-picks', 'highest-rated', 'trending'];

let _appState = null;
let _activeFilter = 'all';
let _activeDifficulty = null; // null | 'beginner' | 'intermediate' | 'advanced' | 'elite'
let _activeTab = 'discover'; // 'discover' | 'my'
let _showAllPrograms = false;
let _searchQuery = '';
let _searchDebounce = null;

export function initProgramLibrary(appState) {
  _appState = appState;
}

/** Jump the library to Discover or My Plans (used after import/create). */
export function showLibraryTab(tab) {
  _activeTab = tab === 'my' ? 'my' : 'discover';
  _searchQuery = '';
  _showAllPrograms = false;
  renderLibrary();
  persistFilters();
}

export function updateLibraryState(appState) {
  _appState = appState;
}

// Resolve a program id to its display metadata WITHOUT getProgramById's
// hybrid_engine fallback — a bookmark/completion for a deleted id should drop
// out of the list, not silently masquerade as the default program. Covers
// catalog + system (catalog entries exist for system programs) and custom.
function resolveProgramMeta(id) {
  return getCatalogEntry(id) || _appState?.customPrograms?.find(p => p.id === id) || null;
}

// ── Persisted filter state (programLibrary.activeFilters) ─────────────────────
let _filtersRestored = false;

function restoreFilters() {
  const f = _appState?.programLibrary?.activeFilters;
  if (!f || typeof f !== 'object') return;
  if (typeof f.filter === 'string') _activeFilter = f.filter;
  if (f.difficulty === null || typeof f.difficulty === 'string') _activeDifficulty = f.difficulty || null;
  if (typeof f.tab === 'string') _activeTab = f.tab;
}

function persistFilters() {
  if (!_appState?.programLibrary) return;
  _appState.programLibrary.activeFilters = {
    filter: _activeFilter,
    difficulty: _activeDifficulty,
    tab: _activeTab,
  };
  saveStateToLocalStorage(true);
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderLibrary() {
  const screen = document.getElementById('programLibraryScreen');
  if (!screen) return;

  // Restore the user's last filter/tab once per session (persisted across reloads).
  if (!_filtersRestored) { restoreFilters(); _filtersRestored = true; }
  if (_activeTab === 'saved' || _activeTab === 'completed') _activeTab = 'my';

  renderActiveProgramBanner();
  renderUtilityRow();
  renderLibraryTabs();
  const chips = document.getElementById('progFilterChips');
  const diffs = document.getElementById('progDifficultyChips');
  if (chips) { chips.innerHTML = ''; chips.style.display = 'none'; }
  if (diffs) { diffs.innerHTML = ''; diffs.style.display = 'none'; }
  renderLibraryContent();
  setupLibraryEvents();
}

// ── Active program banner ─────────────────────────────────────────────────────

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

  const catalog = getCatalogEntry(activeId);
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

  // The plan's accent identifies it through the card glow and ring. The action
  // button keeps the app's contrast-checked action blue rather than an arbitrary
  // catalogue colour, so it cannot fail the semantic-contrast gate.
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

// ── Plan utility row ─────────────────────────────────────────────────────────

/**
 * Plan-level utilities: create, import, and — only while a plan is actually
 * running — open it. Kept quiet and in one row under the active card so the
 * running plan stays the only primary thing on this screen.
 *
 * "Manage plan" VIEWS the active plan. It never activates, switches or restarts
 * anything: those decisions belong to the plan itself.
 */
function renderUtilityRow() {
  const row = document.getElementById('plansUtilityRow');
  if (!row) return;

  const activeId = _appState?.activeProgramId;
  const hasActive = !!activeId && !getActiveProgramIssue(_appState);
  row.innerHTML = `
    <button type="button" class="plans-utility-btn" data-action="open-create-program">+ New plan</button>
    <button type="button" class="plans-utility-btn" data-action="import-plan-json">Import plan (.json)</button>
    ${hasActive ? '<button type="button" class="plans-utility-btn plans-utility-btn--accent" data-action="open-active-plan-manage">Manage plan</button>' : ''}
  `;
}

// ── Library tabs ─────────────────────────────────────────────────────────────

function renderLibraryTabs() {
  const container = document.getElementById('progLibraryTabs');
  if (!container) return;

  const savedCount = _appState?.programLibrary?.bookmarks?.length || 0;
  const completedCount = _appState?.programLibrary?.completions?.length || 0;

  const customCount = _appState?.customPrograms?.length || 0;
  const myCount = savedCount + completedCount + customCount;
  container.innerHTML = `
    <button class="lib-tab ${_activeTab === 'discover' ? 'active' : ''}" data-action="lib-tab" data-tab="discover">
      Discover
    </button>
    <button class="lib-tab ${_activeTab === 'my' ? 'active' : ''}" data-action="lib-tab" data-tab="my">
      My Plans${myCount > 0 ? ` <span class="lib-tab-count">${myCount}</span>` : ''}
    </button>
  `;
}

// ── Filter chips ──────────────────────────────────────────────────────────────

const FILTER_CHIPS = [
  { key: 'all',             label: 'All' },
  { key: 'hybrid',          label: 'Hybrid' },
  { key: 'strength',        label: 'Strength' },
  { key: 'hypertrophy',     label: 'Hypertrophy' },
  { key: 'body_composition',label: 'Fat Loss' },
  { key: 'running',         label: 'Running' },
  { key: 'hyrox',           label: 'Hyrox' },
  { key: 'endurance',       label: 'Endurance' },
  { key: 'home_gym',        label: 'Home Gym' },
  { key: 'bodybuilding',    label: 'Bodybuilding' },
  { key: 'powerlifting',    label: 'Powerlifting' },
  { key: 'triathlon',       label: 'Triathlon' },
  { key: 'mobility',        label: 'Mobility' },
  { key: 'functional',      label: 'Functional' },
  { key: 'general_fitness', label: 'General' },
  { key: 'tactical',        label: 'Tactical' },
];

const DIFFICULTY_CHIPS = [
  { key: null,           label: 'All Levels', color: null },
  { key: 'beginner',     label: 'Beginner',   color: '#10b981' },
  { key: 'intermediate', label: 'Intermediate', color: '#f59e0b' },
  { key: 'advanced',     label: 'Advanced',   color: '#ef4444' },
  { key: 'elite',        label: 'Elite',      color: '#dc2626' },
];

/**
 * Are we BROWSING the catalogue, rather than being recommended a plan?
 *
 * 4A asks Plans to recommend before asking anyone to browse, and the filters are
 * classified as "disclose on demand". Measured before this change, the default
 * Discover surface carried **36 chip controls** — 16 categories and 5 levels at
 * the top, plus the same 15 categories again in the Browse-all grid at the
 * bottom — above a personal recommendation row that began 651px down. The chips
 * are the browse tool, so they belong to browse mode; picking a category (from
 * the Browse-all grid or a collection's "See all") is what enters it.
 */
function isBrowsing() {
  return _activeFilter !== 'all';
}

function renderFilterChips() {
  const container = document.getElementById('progFilterChips');
  if (!container) return;

  if (_activeTab !== 'discover' || !isBrowsing()) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = FILTER_CHIPS.map(chip => `
    <button class="filter-chip ${_activeFilter === chip.key ? 'active' : ''}"
            data-action="prog-filter"
            data-filter="${chip.key}">
      ${chip.label}
    </button>
  `).join('');
}

function renderDifficultyChips() {
  const container = document.getElementById('progDifficultyChips');
  if (!container) return;

  if (_activeTab !== 'discover' || !isBrowsing()) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = DIFFICULTY_CHIPS.map(chip => {
    const isActive = _activeDifficulty === chip.key;
    const colorStyle = chip.color && isActive ? `style="border-color: ${chip.color}; color: ${chip.color};"` : '';
    return `
      <button class="filter-chip filter-chip--sm ${isActive ? 'active' : ''}"
              data-action="diff-filter"
              data-difficulty="${chip.key || ''}"
              ${colorStyle}>
        ${chip.label}
      </button>
    `;
  }).join('');
}

// ── Library content ───────────────────────────────────────────────────────────

function renderLibraryContent() {
  const content = document.getElementById('progLibraryContent');
  const searchResults = document.getElementById('progSearchResults');
  if (!content || !searchResults) return;

  // One search: a query searches the whole library from either tab, so it is
  // checked before the tab rather than being a Discover-only mode.
  if (_searchQuery.length >= 2) {
    content.style.display = 'none';
    searchResults.style.display = 'block';
    renderSearchResults(_searchQuery);
    return;
  }

  if (_activeTab === 'my') {
    content.style.display = 'block';
    searchResults.style.display = 'none';
    renderMyPlans(content);
    return;
  }

  content.style.display = 'block';
  searchResults.style.display = 'none';
  renderSimpleDiscover(content);
}

function renderSimpleDiscover(content) {
  // One three-up row, not a horizontal rail: the third card must be fully
  // visible at 390px, so the row shows exactly what fits. The engine may return
  // fewer than three when it has fewer true reasons; the browser contract still
  // covers three to five.
  const recommendations = getRecommendations(_appState, 3);
  let html = '';
  if (recommendations.length > 0) {
    html += `
      <div class="collection-row collection-row--recommended mb-2">
        <div class="collection-header mb-2">
          <div class="collection-title-wrap">
            <div>
              <div class="collection-title">Recommended For You</div>
            </div>
          </div>
        </div>
        ${renderRecommendationBasis(recommendationBasis(athleteProfile(_appState)))}
        <div class="prog-tile-grid">
          ${recommendations.map((item) => renderProgramCard(item.program, 'tile', item.reason)).join('')}
        </div>
      </div>
    `;
  }
  const all = PROGRAM_CATALOG.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const shown = _showAllPrograms ? all : all.slice(0, 12);
  html += `<div class="filtered-grid-header mb-4">
    <div class="filtered-grid-title">All programs</div>
    <div class="filtered-grid-count">${all.length} plans</div>
  </div>
  <div class="program-grid">${shown.map((program) => renderProgramCard(program, 'large')).join('')}</div>
  ${!_showAllPrograms && all.length > 12 ? '<button class="lib-empty-cta mt-4" data-action="prog-show-all">Show all plans</button>' : ''}`;
  content.innerHTML = html;
}

function renderMyPlans(content) {
  const custom = _appState?.customPrograms || [];
  const savedIds = _appState?.programLibrary?.bookmarks || [];
  const saved = savedIds.map(resolveProgramMeta).filter(Boolean);
  const completed = (_appState?.programLibrary?.completions || [])
    .map((completion) => ({ completion, program: resolveProgramMeta(completion.programId) }))
    .filter((item) => item.program);

  if (!custom.length && !saved.length && !completed.length) {
    content.innerHTML = `<div class="lib-empty-state">
      <div class="lib-empty-icon">${svgIcon('bookmark', { size: 30 })}</div>
      <div class="lib-empty-title">Nothing here yet</div>
      <div class="lib-empty-sub">Save a plan, create your own, or import an openHybrid plan file.</div>
      <button class="lib-empty-cta" data-action="lib-tab" data-tab="discover">Browse programs</button>
      <button class="lib-empty-cta" data-action="import-plan-json">Import a plan (.json)</button>
    </div>`;
    return;
  }

  // Build with DOM nodes + textContent. Plan names/notes can come from an
  // imported JSON file, so this surface must never reinterpret them as markup.
  const nodes = [];
  const addSection = (title, programs, gap = true) => {
    if (!programs.length) return;
    const header = document.createElement('div');
    header.className = `filtered-grid-header mb-4${gap ? ' mb-6' : ''}`;
    const titleEl = document.createElement('div');
    titleEl.className = 'filtered-grid-title';
    titleEl.textContent = title;
    const count = document.createElement('div');
    count.className = 'filtered-grid-count';
    count.textContent = String(programs.length);
    header.append(titleEl, count);
    const grid = document.createElement('div');
    grid.className = `program-grid${gap ? ' mb-6' : ''}`;
    programs.forEach((program) => grid.append(renderProgramCardNode(program, 'large')));
    nodes.push(header, grid);
  };

  addSection('Your plans', custom);
  addSection('Saved', saved);
  addSection('Completed', completed.map((item) => item.program), false);
  content.replaceChildren(...nodes);
}

function renderCollectionRows(container) {
  // Five, not eight: 4A asks for three to five, and a recommendation the athlete
  // has to scroll sideways to reach is not leading with anything.
  const recommendations = getRecommendations(_appState, 5);
  // Don't pass recommendedIds into getHomeCollections: we render the
  // personalised row ourselves below, and letting getHomeCollections inject its
  // own "recommended-for-you" collection too would duplicate the row.
  const collections = getHomeCollections();

  // Featured hero (first 3 featured programs). Rendered LATER, not here: it is a
  // 220px carousel of `featured` programmes — editorial signal, identical for
  // every athlete — and it used to sit directly above the personalised row, so
  // the surface led with what the catalogue promotes rather than what fits. The
  // recommendation rules already keep editorial out of the personal score and out
  // of the stated reasons; letting it own the top of the screen contradicted them
  // just as plainly.
  const featuredPrograms = PROGRAM_CATALOG.filter(p => p.featured).slice(0, 3);

  let html = '';

  // De-dupe across the discovery rails: a program appears in at most one of
  // Recommended / the curated rails per render, so the same card can't fill
  // three rows on one Discover screen. (Recently-Viewed and your custom programs
  // are a different, clearly-labelled context and stay outside this.)
  const shown = new Set(_appState?.activeProgramId ? [_appState.activeProgramId] : []);

  // ── FIRST: the personalised recommendations ───────────────────────────────
  // 4A's primary for this surface, after the active plan itself. hideSeeAll:
  // recommendations aren't a static collection, so there's no valid "see all".
  //
  // `getRecommendations` returns nothing when it has no true reason to offer, so
  // this row simply does not appear rather than labelling a popularity ranking
  // "Based on your training" — which is what it used to be for every athlete.
  if (recommendations.length > 0) {
    const eligible = recommendations.filter(r => r.program && !shown.has(r.program.id));
    if (eligible.length > 0) {
      eligible.forEach(r => shown.add(r.program.id));
      const reasons = new Map(eligible.map(r => [r.program.id, r.reason]));
      html += renderCollectionRow({
        id: 'recommended',
        label: 'Recommended For You',
        icon: '✨',
        hideSeeAll: true,
        // The basis replaces the old "Based on your training" subtitle, which
        // claimed more than it could back up for an athlete who never answered.
        afterHeader: renderRecommendationBasis(recommendationBasis(athleteProfile(_appState))),
      }, eligible.map(r => r.program), reasons);
    }
  }

  // Recently viewed — surfaces the (previously write-only) recentlyViewed log
  const recentlyViewed = (_appState?.programLibrary?.recentlyViewed || [])
    .map(v => resolveProgramMeta(v.programId))
    .filter(Boolean)
    .slice(0, 10);
  if (recentlyViewed.length > 0) {
    html += renderCollectionRow({
      id: 'recently-viewed',
      label: 'Recently Viewed',
      subtitle: 'Pick up where you left off',
      icon: '🕘',
      hideSeeAll: true,
    }, recentlyViewed);
  }

  // Your custom programs (created in the builder) — only place they surface
  const customPrograms = _appState?.customPrograms || [];
  if (customPrograms.length > 0) {
    html += renderCustomProgramsSection(customPrograms);
  }

  // V2-6 — a curated few rails, not the whole catalogue. The old surface stacked
  // ~25 collection rows into an endless wall; the full library is one tap away via
  // the Browse-all grid below, so Discover stays lean.
  const byId = new Map(collections.map(c => [c.id, c]));
  for (const id of CURATED_HOME_COLLECTIONS) {
    const collection = byId.get(id);
    if (!collection || !collection.programs || collection.programs.length === 0) continue;
    const fresh = collection.programs.filter(p => p && !shown.has(p.id));
    if (fresh.length === 0) continue;
    fresh.forEach(p => shown.add(p.id));
    html += renderCollectionRow(collection, fresh);
  }

  // The editorial carousel, now BELOW everything personal.
  if (featuredPrograms.length > 0) {
    html += renderHeroBanner(featuredPrograms);
  }

  // Browse-all: every category is reachable here, and this is now the ONLY place
  // the category set is drawn by default — the top chip rows render solely while
  // browsing, so the same 15 categories are no longer on screen twice.
  html += `
    <div class="collection-row mb-5">
      <div class="collection-header mb-2">
        <div class="collection-title-wrap">
          <span class="collection-icon">🗂️</span>
          <div>
            <div class="collection-title">Browse all categories</div>
            <div class="collection-subtitle">${PROGRAM_CATALOG.length} programs across every discipline</div>
          </div>
        </div>
      </div>
      <div class="prog-browse-grid">
        ${FILTER_CHIPS.filter(c => c.key !== 'all').map(c => `
          <button class="filter-chip" data-action="prog-filter" data-filter="${c.key}">${c.label}</button>
        `).join('')}
      </div>
    </div>
  `;

  // Create custom program CTA
  html += `
    <div class="create-program-cta">
      <div class="create-cta-inner">
        <div class="create-cta-text">
          <div class="create-cta-title">Build Your Own</div>
          <div class="create-cta-subtitle">Create a custom program from scratch</div>
        </div>
        <button class="create-cta-btn" data-action="open-create-program">+ Create</button>
      </div>
    </div>
  `;

  container.innerHTML = html;
  initHeroCarousel();
}

// ── Custom programs ("My Programs") ───────────────────────────────────────────

function renderCustomProgramsSection(customPrograms) {
  return `
    <div class="collection-row mb-5">
      <div class="collection-header mb-2">
        <div class="collection-title-wrap">
          <span class="collection-icon">🛠️</span>
          <div>
            <div class="collection-title">My Programs</div>
            <div class="collection-subtitle">Programs you've built</div>
          </div>
        </div>
      </div>
      <div class="flex-col gap-2">
        ${customPrograms.map(renderCustomProgramCard).join('')}
      </div>
    </div>
  `;
}

function renderCustomProgramCard(p) {
  const isActive = _appState?.activeProgramId === p.id;
  const focus = p.dossier?.focus || 'Custom Program';
  const weeks = p.totalWeeks || 12;
  const trainingDays = Object.values(p.days || {}).filter(d =>
    (d?.lifts || []).some(n => typeof n === 'string' && n.trim()) ||
    (d?.runs && d.runs !== 'Rest')
  ).length;
  const safeId = escapeHtml(p.id || '');
  // Source attribution lets a user tell apart several personal programs made from
  // the SAME built-in template (so old "(Copy)" duplicates are identifiable and
  // can be removed via Delete). No revision jargon is exposed.
  const sourceName = p.sourceProgramId ? resolveProgramMeta(p.sourceProgramId)?.name : null;

  return `
    <div class="card-dark p-3" style="border:1px solid var(--overlay-sm);${isActive ? 'border-color:var(--accent-blue);' : ''}">
      <div class="flex-between align-center mb-2" data-action="open-program-detail" data-program-id="${safeId}" role="button" tabindex="0" style="cursor:pointer;">
        <div>
          <div class="font-heavy text-inverse">${escapeHtml(p.name)}${isActive ? ' <span class="prog-badge prog-badge--active">ACTIVE</span>' : ''}</div>
          <div class="text-xs text-muted">${escapeHtml(focus)} · ${weeks}w · ${trainingDays} training day${trainingDays !== 1 ? 's' : ''}</div>
          ${sourceName ? `<div class="text-xs text-muted" style="opacity:.75;margin-top:2px;">From ${escapeHtml(sourceName)}</div>` : ''}
        </div>
        <span class="text-muted" aria-hidden="true">›</span>
      </div>
      <div class="flex gap-2" style="flex-wrap:wrap;">
        ${isActive ? '' : `<button class="btn-pad btn-blue" style="font-size:0.75rem;" data-action="make-active-program" data-program-id="${safeId}">Make Active</button>`}
        <button class="btn-pad" style="font-size:0.75rem;" data-action="open-builder" data-program-id="${safeId}">Edit</button>
        <button class="btn-pad" style="font-size:0.75rem;" data-action="duplicate-program" data-program-id="${safeId}">Duplicate</button>
        <button class="btn-pad" style="font-size:0.75rem;color:var(--accent-red);border-color:rgba(239,68,68,0.2);" data-action="delete-program" data-program-id="${safeId}">Delete</button>
      </div>
    </div>
  `;
}

function renderHeroBanner(programs) {
  const slides = programs.map((p, i) => {
    const cover = [safeCssColor(p.coverGradient?.[0], '#1a0e2e'), safeCssColor(p.coverGradient?.[1], '#0d1b2a')];
    return `
    <div class="hero-slide ${i === 0 ? 'active' : ''}"
         style="background: linear-gradient(145deg, ${cover[0]}, ${cover[1]})"
         data-action="open-program-detail"
         data-program-id="${escapeHtml(p.id)}">
      <div class="hero-slide-overlay"></div>
      <div class="hero-slide-icon" aria-hidden="true">${svgIcon(coverGlyphFor(p), { size: 104 })}</div>
      <div class="hero-slide-content">
        <span class="hero-badge">${escapeHtml(CATEGORIES[p.category]?.label || p.category)}</span>
        <h2 class="hero-title">${escapeHtml(p.name)}</h2>
        <p class="hero-tagline">${escapeHtml(p.tagline)}</p>
        <div class="hero-meta">
          <span>${p.durationWeeks} weeks</span>
          <span class="hero-dot">·</span>
          <span>${p.sessionsPerWeek} days/week</span>
          <span class="hero-dot">·</span>
          <span>${DIFFICULTY_LABELS[p.difficulty]?.label}</span>
        </div>
      </div>
    </div>
  `; }).join('');

  const dots = programs.map((p, i) => `
    <button class="hero-dot-btn hit-target ${i === 0 ? 'active' : ''}" data-action="hero-dot" data-slide="${i}"
      aria-label="Show ${escapeHtml(p.name)} (${i + 1} of ${programs.length})"></button>
  `).join('');

  return `
    <div class="hero-banner mb-4">
      <div class="hero-slides" id="heroSlides">${slides}</div>
      <div class="hero-dots" id="heroDots">${dots}</div>
    </div>
  `;
}

/**
 * State the basis of the recommendations, and let it be corrected in place.
 *
 * An athlete who upgraded never answered these — onboarding auto-completes for
 * anyone with stored data, and settings ship with hybrid/intermediate/full-gym
 * already filled in. Without this, the row tells them it was built on "your
 * goal, level and kit" when in truth it was built on three assumptions. Kept
 * collapsed so it costs nothing when the assumptions happen to be right.
 *
 * @param {ReturnType<typeof recommendationBasis>} basis
 */
function renderRecommendationBasis(basis) {
  if (!basis.length) return '';
  const summary = basis.map(b => b.currentLabel).join(' · ');
  return `
    <details class="prog-basis">
      <summary class="prog-basis__summary">
        <span class="prog-basis__values">${escapeHtml(summary)}</span>
        <span class="prog-basis__change">Change</span>
      </summary>
      <div class="prog-basis__body">
        ${basis.map(b => `
          <div class="prog-basis__group">
            <div class="prog-basis__question">${escapeHtml(b.question)}</div>
            <div class="prog-basis__options">
              ${b.options.map(o => `
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

/**
 * @param {any} collection
 * @param {any[]} programs
 * @param {Map<string,string>} [reasons] programme id → why it fits this athlete
 */
function renderCollectionRow(collection, programs, reasons = null) {
  const cards = programs
    .map(p => renderProgramCard(p, 'small', reasons?.get(p.id) || ''))
    .join('');

  return `
    <div class="collection-row mb-5">
      <div class="collection-header mb-2">
        <div class="collection-title-wrap">
          <span class="collection-icon">${collection.icon}</span>
          <div>
            <div class="collection-title">${collection.label}</div>
            ${collection.subtitle ? `<div class="collection-subtitle">${collection.subtitle}</div>` : ''}
          </div>
        </div>
        ${collection.hideSeeAll ? '' : `<button class="collection-see-all" data-action="prog-filter" data-filter="${collection.id}">See all</button>`}
      </div>
      ${collection.afterHeader || ''}
      <div class="card-scroll-row">
        ${cards}
      </div>
    </div>
  `;
}

function renderFilteredGrid(container) {
  let programs;
  let titleText;

  const collectionDef = getCollectionDef(_activeFilter);
  if (collectionDef) {
    // "See All" came from a collection row — apply that collection's filter without a limit
    programs = PROGRAM_CATALOG.filter(collectionDef.filter).sort(collectionDef.sort);
    titleText = `${collectionDef.icon} ${collectionDef.label}`;
  } else {
    programs = filterByCategory(_activeFilter);
    const categoryInfo = _activeFilter === 'home_gym'
      ? { label: 'Home Gym', icon: '🏠' }
      : (CATEGORIES[_activeFilter] || { label: _activeFilter, icon: '📋' });
    const titleParts = [categoryInfo.icon, categoryInfo.label];
    const diffLabel = _activeDifficulty ? DIFFICULTY_LABELS[_activeDifficulty]?.label : null;
    if (diffLabel) titleParts.push(`· ${diffLabel}`);
    titleText = titleParts.join(' ');
  }

  if (_activeDifficulty) {
    programs = programs.filter(p => p.difficulty === _activeDifficulty);
  }

  const allWods = programs.length > 0 && programs.every(p => isWod(p));
  const countNoun = allWods ? 'workout' : 'program';
  const countLabel = `${programs.length} ${countNoun}${programs.length !== 1 ? 's' : ''}`;

  const cards = programs.map(p => renderProgramCard(p, 'large')).join('');

  container.innerHTML = `
    <div class="filtered-grid-header mb-4">
      <div class="filtered-grid-title">${titleText}</div>
      <div class="filtered-grid-count">${countLabel}</div>
    </div>
    <div class="program-grid">
      ${cards || '<div class="lib-empty-state"><div class="lib-empty-icon">🔍</div><div class="lib-empty-title">No programs found</div><div class="lib-empty-sub">Try adjusting your filters</div></div>'}
    </div>
  `;
}

// ── Program cards ─────────────────────────────────────────────────────────────

// ── Search results ─────────────────────────────────────────────────────────────

function renderSearchResults(query) {
  const container = document.getElementById('progSearchResults');
  if (!container) return;

  const results = searchPrograms(query);

  if (results.length === 0) {
    container.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">🔍</div>
        <div class="search-empty-title">No programs found</div>
        <div class="search-empty-sub">Try different keywords or browse collections</div>
        ${renderPopularSearches()}
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="search-results-count mb-3">${searchResultsHeading(query, results.length)}</div>
    <div class="program-grid">
      ${results.map(p => renderProgramCard(p, 'large')).join('')}
    </div>
  `;
}

function renderPopularSearches() {
  return `
    <div class="popular-searches mt-4">
      <div class="popular-searches-title">Popular searches</div>
      <div class="popular-searches-chips">
        ${POPULAR_SEARCHES.map(s => `
          <button class="popular-search-chip" data-action="prog-quick-search" data-query="${s.query}">
            ${s.label}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderSearchEmpty() {
  const container = document.getElementById('progSearchResults');
  if (!container) return;

  container.innerHTML = `
    <div class="search-landing">
      ${renderPopularSearches()}
    </div>
  `;
}

// ── Hero carousel ─────────────────────────────────────────────────────────────

let _heroInterval = null;
let _heroIndex = 0;

function prefersReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (_) { return false; }
}

// Start (or restart) autoplay — but never auto-advance for users who asked for
// reduced motion; they still get manual dot navigation.
function startHeroAutoplay() {
  clearInterval(_heroInterval);
  if (prefersReducedMotion()) return;
  _heroInterval = setInterval(advanceHero, 4000);
}

function initHeroCarousel() {
  _heroIndex = 0;
  startHeroAutoplay();
  // Pause on hover/focus (a native carousel courtesy), resume on leave/blur.
  const banner = document.querySelector('.hero-banner');
  if (banner && !banner._pauseWired) {
    banner._pauseWired = true;
    banner.addEventListener('mouseenter', () => clearInterval(_heroInterval));
    banner.addEventListener('mouseleave', startHeroAutoplay);
    banner.addEventListener('focusin', () => clearInterval(_heroInterval));
    banner.addEventListener('focusout', startHeroAutoplay);
  }
}

function advanceHero() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot-btn');
  if (slides.length === 0) return;

  slides[_heroIndex].classList.remove('active');
  dots[_heroIndex]?.classList.remove('active');
  _heroIndex = (_heroIndex + 1) % slides.length;
  slides[_heroIndex].classList.add('active');
  dots[_heroIndex]?.classList.add('active');
}

// ── Event handling ─────────────────────────────────────────────────────────────

function setupLibraryEvents() {
  // Search input
  const searchInput = document.getElementById('progSearchInput');
  const searchClear = document.getElementById('progSearchClear');

  if (searchInput && !searchInput._libEvt) {
    searchInput._libEvt = true;

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.length === 0) {
        document.getElementById('progLibraryContent').style.display = 'none';
        document.getElementById('progSearchResults').style.display = 'block';
        renderSearchEmpty();
      }
    });

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      _searchQuery = q;
      searchClear.style.display = q ? 'flex' : 'none';

      clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(() => {
        renderLibraryContent();
      }, 180);
    });
  }

  if (searchClear && !searchClear._libEvt) {
    searchClear._libEvt = true;
    searchClear.addEventListener('click', () => {
      const inp = document.getElementById('progSearchInput');
      if (inp) inp.value = '';
      _searchQuery = '';
      searchClear.style.display = 'none';
      renderLibraryContent();
    });
  }
}

function jumpHeroSlide(index) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot-btn');
  if (index < 0 || index >= slides.length) return;
  slides[_heroIndex].classList.remove('active');
  dots[_heroIndex]?.classList.remove('active');
  _heroIndex = index;
  slides[_heroIndex].classList.add('active');
  dots[_heroIndex]?.classList.add('active');
  // Reset the auto-advance timer (respecting reduced-motion).
  startHeroAutoplay();
}

// ── Event delegation entry point (called from app.js) ─────────────────────────

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
      renderLibraryContent();
      break;
    }
    case 'prog-show-all': {
      _showAllPrograms = true;
      renderLibraryContent();
      break;
    }
    case 'prog-filter': {
      const filter = el.getAttribute('data-filter');
      setActiveFilter(filter);
      break;
    }
    case 'diff-filter': {
      const diff = el.getAttribute('data-difficulty') || null;
      setActiveDifficulty(diff || null);
      break;
    }
    // `continue-active-program` was removed with the banner rewrite: it
    // dispatched a bare tab switch, so "Continue" opened the cockpit on whatever
    // day it happened to have selected last. The banner now emits the same
    // day-carrying actions Home does (`select-program-workout` /
    // `start-today-workout` / `open-program-workout-picker`), all of which are
    // handled globally in app.js.
    case 'hero-dot': {
      const slide = parseInt(el.getAttribute('data-slide'), 10);
      if (!isNaN(slide)) jumpHeroSlide(slide);
      break;
    }
    case 'prog-quick-search': {
      const q = el.getAttribute('data-query');
      const inp = document.getElementById('progSearchInput');
      if (inp) {
        inp.value = q;
        _searchQuery = q;
        document.getElementById('progSearchClear').style.display = 'flex';
        renderLibraryContent();
      }
      break;
    }
    case 'open-active-plan-manage': {
      // VIEW the running plan; never activate or switch it. The plan view owns
      // its own actions once open.
      document.dispatchEvent(new CustomEvent('library:view-active'));
      break;
    }
    case 'lib-tab': {
      const tab = el.getAttribute('data-tab') === 'my' ? 'my' : 'discover';
      if (tab !== _activeTab) {
        _activeTab = tab;
        _showAllPrograms = false;
        _searchQuery = '';
        _activeDifficulty = null;
        const inp = document.getElementById('progSearchInput');
        if (inp) inp.value = '';
        renderLibrary();
        persistFilters();
      }
      break;
    }
    case 'toggle-bookmark': {
      event?.stopPropagation();
      const id = el.getAttribute('data-program-id');
      if (!id) break;
      const nowSaved = toggleBookmark(id);
      el.className = `prog-card-bookmark ${nowSaved ? 'saved' : ''}`;
      el.setAttribute('aria-label', nowSaved ? 'Remove bookmark' : 'Save program');
      el.innerHTML = svgIcon('bookmark', { size: 16, cls: nowSaved ? 'is-saved' : '' });
      renderLibraryTabs();
      break;
    }
  }
}

function setActiveFilter(filter) {
  _activeFilter = filter;
  _activeDifficulty = null;
  _searchQuery = '';
  const inp = document.getElementById('progSearchInput');
  if (inp) inp.value = '';
  renderFilterChips();
  renderDifficultyChips();
  renderLibraryContent();
  persistFilters();
}

function setActiveDifficulty(difficulty) {
  _activeDifficulty = difficulty || null;
  renderDifficultyChips();
  renderLibraryContent();
  persistFilters();
}

function openProgramDetail(programId) {
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
  renderActiveProgramBanner();
  renderUtilityRow();
}

// Expose for use from detail page
export { openProgramDetail };
