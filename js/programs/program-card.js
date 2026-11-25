// @ts-check
// =============================================================================
// PROGRAM CARD — shared card renderer used by both the library grid and the
// program detail screen ("similar programs"). Extracted from library.js to
// break the library <-> detail circular import.
// =============================================================================
import { CATEGORIES, DIFFICULTY_LABELS } from './catalog.js';
import { isBookmarked, isProgramCompleted, appState } from '../state.js';
import { escapeHtml, safeCssColor } from '../util.js';
import { icon as svgIcon, iconNode } from '../ui/icons.js';
import { programAttribution } from './attribution.js';

export function isWod(program) {
  return program.tags?.includes('hyrox-wod');
}

// The modality glyph for a program's cover art — a designed watermark instead of
// a random emoji, so the whole catalogue reads as one system.
const COVER_GLYPHS = {
  strength: 'dumbbell', powerlifting: 'dumbbell', hypertrophy: 'dumbbell', bodybuilding: 'dumbbell',
  running: 'run', endurance: 'run', triathlon: 'activity',
  hybrid: 'bolt',
  hyrox: 'trophy', functional: 'activity', tactical: 'gauge', conditioning: 'flame',
  fitness: 'mountain', general: 'mountain', mobility: 'mountain',
};
export function coverGlyphFor(program) {
  const cat = String(program?.category || '').toLowerCase();
  if (COVER_GLYPHS[cat]) return COVER_GLYPHS[cat];
  const tags = (program?.tags || []).map(t => String(t).toLowerCase());
  if (tags.some(t => /hyrox|wod/.test(t))) return 'trophy';
  if (tags.some(t => /functional/.test(t))) return 'activity';
  if (tags.some(t => /conditioning/.test(t))) return 'flame';
  if (tags.some(t => /triathlon/.test(t))) return 'activity';
  if (tags.some(t => /run|endurance|5k|10k|marathon/.test(t))) return 'run';
  if (tags.some(t => /strength|power|hypertrophy|bodybuild/.test(t))) return 'dumbbell';
  return 'bolt';
}

// Tile art is a compact, accent-tinted cover. The dark foot keeps the white
// 44px glyph readable even when the catalogue accent is a bright amber/cyan.
function tileCoverGradient(accent, base) {
  return `linear-gradient(180deg, rgba(4,10,18,0.02) 38%, rgba(4,10,18,0.52)), linear-gradient(155deg, ${accent}, ${base})`;
}

const EQUIP_TIER_LABELS = {
  gym: 'Full Gym', home: 'Home Gym', garage_gym: 'Garage Gym',
  bodyweight: 'Bodyweight', minimal: 'Minimal',
};

/**
 * @param {any} program
 * @param {'small'|'large'|'tile'} [size]
 * @param {string} [reason] Why THIS athlete is being shown this programme, from
 *   `programFit`. The third parameter used to be a `showBadge` boolean that the
 *   body never read, so the recommendations row passed `true` and rendered
 *   nothing — the reasons existed and were dropped on the floor.
 */
export function renderProgramCard(program, size = 'small', reason = '') {
  const diff = DIFFICULTY_LABELS[program.difficulty] || DIFFICULTY_LABELS.intermediate;
  const dots = '●'.repeat(diff.dots) + '○'.repeat(4 - diff.dots);
  const isActive    = appState?.activeProgramId === program.id;
  const saved       = isBookmarked(program.id);
  const completed   = isProgramCompleted(program.id);
  const wod         = isWod(program);
  const isLarge     = size === 'large';
  const isTile      = size === 'tile';

  const equipTierLabel = isLarge && program.equipmentTier && !wod
    ? EQUIP_TIER_LABELS[program.equipmentTier] : null;

  const durationLabel = wod && program.sessionDurationMinutes
    ? `~${program.sessionDurationMinutes.min}–${program.sessionDurationMinutes.max} min`
    : `${program.durationWeeks || program.totalWeeks || 12}w`;

  const categoryLabel = wod ? 'Workout' : (CATEGORIES[program.category]?.label || program.category || 'Custom');
  // Non-catalog (custom) programs lack visual metadata — supply safe fallbacks
  // so the shared card renderer never throws on a missing gradient/icon/accent.
  const rawCover = Array.isArray(program.coverGradient) && program.coverGradient.length >= 2
    ? program.coverGradient : ['#1a0e2e', '#0d1b2a'];
  const cover = [safeCssColor(rawCover[0], '#1a0e2e'), safeCssColor(rawCover[1], '#0d1b2a')];
  const coverGlyph = svgIcon(coverGlyphFor(program), { size: isTile ? 44 : 96, cls: 'prog-card-glyph__svg' });
  const accentColor = safeCssColor(program.accentColor, '#8b5cf6');
  const safeId = escapeHtml(program.id || '');
  const coverStyle = isTile
    ? tileCoverGradient(accentColor, cover[1])
    : `linear-gradient(145deg, ${cover[0]}, ${cover[1]})`;

  // No star ratings or "N athletes / % finish" until there are real users to
  // count — the catalog's rating/enrolled/completion values drive curation
  // (rails + recommendations) only, never displayed as if they were real
  // community numbers.
  const ratingHTML = '';
  const statsHTML = '';

  // Author / source attribution — large cards only, skip generic WOD entries.
  // Neutral wording only (see programAttribution); NO "verified creator" badge.
  const _attr = (isLarge && !wod) ? programAttribution(program) : null;
  const authorHTML = _attr
    ? `<div class="prog-card-author">
         <span class="prog-card-author-name">${escapeHtml(_attr.text)}</span>
       </div>`
    : '';

  return `
    <div class="prog-card prog-card--${size} ${isActive ? 'prog-card--active' : ''} ${completed ? 'prog-card--completed' : ''}"
         data-action="open-program-detail"
         data-program-id="${safeId}">
      <div class="prog-card-cover"
           style="background: ${coverStyle}">
        <div class="prog-card-glyph" aria-hidden="true">${coverGlyph}</div>
        ${isTile ? '' : `<div class="prog-card-badges">
          ${isActive ? '<span class="prog-badge prog-badge--active">ACTIVE</span>' : ''}
          ${completed && !isActive ? '<span class="prog-badge prog-badge--completed">DONE</span>' : ''}
          ${wod && !isActive && !completed ? '<span class="prog-badge prog-badge--wod">WOD</span>' : ''}
          ${program.featured && !isActive && !completed && !wod ? '<span class="prog-badge prog-badge--featured">FEATURED</span>' : ''}
          ${program.isNew && !isActive && !completed ? '<span class="prog-badge prog-badge--new">NEW</span>' : ''}
        </div>`}
        <button class="prog-card-bookmark ${saved ? 'saved' : ''}"
                data-action="toggle-bookmark"
                data-program-id="${safeId}"
                aria-label="${saved ? 'Remove bookmark' : 'Save program'}">
          ${svgIcon('bookmark', { size: 16, cls: saved ? 'is-saved' : '' })}
        </button>
        ${ratingHTML}
      </div>
      ${isTile ? `
      <div class="prog-card-info">
        <div class="prog-card-name">${escapeHtml(program.name)}</div>
        ${reason ? `<div class="prog-card-reason">${escapeHtml(reason)}</div>` : ''}
      </div>` : `
      <div class="prog-card-info">
        <div class="prog-card-name">${escapeHtml(program.name)}</div>
        ${authorHTML}
        <div class="prog-card-meta">
          <span class="prog-card-category"><i class="prog-card-cat-dot" style="background: ${accentColor}" aria-hidden="true"></i>${escapeHtml(categoryLabel)}</span>
          <span class="prog-card-sep">·</span>
          <span>${durationLabel}</span>
          ${!wod && program.sessionsPerWeek ? `<span class="prog-card-sep">·</span><span>${program.sessionsPerWeek}×/wk</span>` : ''}
          ${equipTierLabel ? `<span class="prog-card-sep">·</span><span class="prog-card-equip">${equipTierLabel}</span>` : ''}
        </div>
        ${statsHTML}
        ${reason ? `<div class="prog-card-reason">${escapeHtml(reason)}</div>` : ''}
        <div class="prog-card-diff" style="color: ${diff.color}" title="${diff.label}">${dots}</div>
      </div>`}
    </div>
  `;
}


/**
 * The program card as a DOM node. Used by My Plans, where plan names come from
 * the user/imported JSON: every text value goes through textContent so a plan
 * name can never be reinterpreted as markup.
 * @param {any} program
 * @param {'small'|'large'|'tile'} [size]
 * @param {string} [reason]
 */
export function renderProgramCardNode(program, size = 'small', reason = '') {
  const diff = DIFFICULTY_LABELS[program.difficulty] || DIFFICULTY_LABELS.intermediate;
  const dots = '●'.repeat(diff.dots) + '○'.repeat(4 - diff.dots);
  const isActive = appState?.activeProgramId === program.id;
  const saved = isBookmarked(program.id);
  const completed = isProgramCompleted(program.id);
  const wod = isWod(program);
  const isLarge = size === 'large';
  const isTile = size === 'tile';
  const equipTierLabel = isLarge && program.equipmentTier && !wod ? EQUIP_TIER_LABELS[program.equipmentTier] : null;
  const durationLabel = wod && program.sessionDurationMinutes
    ? `~${program.sessionDurationMinutes.min}–${program.sessionDurationMinutes.max} min`
    : `${program.durationWeeks || program.totalWeeks || 12}w`;
  const categoryLabel = wod ? 'Workout' : (CATEGORIES[program.category]?.label || program.category || 'Custom');
  const rawCover = Array.isArray(program.coverGradient) && program.coverGradient.length >= 2 ? program.coverGradient : ['#1a0e2e', '#0d1b2a'];
  const cover = [safeCssColor(rawCover[0], '#1a0e2e'), safeCssColor(rawCover[1], '#0d1b2a')];
  const accentColor = safeCssColor(program.accentColor, '#8b5cf6');
  const coverStyle = isTile
    ? tileCoverGradient(accentColor, cover[1])
    : `linear-gradient(145deg, ${cover[0]}, ${cover[1]})`;

  const card = document.createElement('div');
  card.className = `prog-card prog-card--${size}${isActive ? ' prog-card--active' : ''}${completed ? ' prog-card--completed' : ''}`;
  card.dataset.action = 'open-program-detail';
  card.dataset.programId = String(program.id || '');

  const coverEl = document.createElement('div');
  coverEl.className = 'prog-card-cover';
  coverEl.style.background = coverStyle;
  const glyph = document.createElement('div');
  glyph.className = 'prog-card-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  const glyphNode = iconNode(coverGlyphFor(program), { size: isTile ? 44 : 96, cls: 'prog-card-glyph__svg' });
  if (glyphNode) glyph.append(glyphNode);
  coverEl.append(glyph);

  if (!isTile) {
    const badges = document.createElement('div');
    badges.className = 'prog-card-badges';
    const addBadge = (text, cls) => { const badge = document.createElement('span'); badge.className = `prog-badge ${cls}`; badge.textContent = text; badges.append(badge); };
    if (isActive) addBadge('ACTIVE', 'prog-badge--active');
    if (completed && !isActive) addBadge('DONE', 'prog-badge--completed');
    if (wod && !isActive && !completed) addBadge('WOD', 'prog-badge--wod');
    if (program.featured && !isActive && !completed && !wod) addBadge('FEATURED', 'prog-badge--featured');
    if (program.isNew && !isActive && !completed) addBadge('NEW', 'prog-badge--new');
    coverEl.append(badges);
  }

  const bookmark = document.createElement('button');
  bookmark.type = 'button';
  bookmark.className = `prog-card-bookmark${saved ? ' saved' : ''}`;
  bookmark.dataset.action = 'toggle-bookmark';
  bookmark.dataset.programId = String(program.id || '');
  bookmark.setAttribute('aria-label', saved ? 'Remove bookmark' : 'Save program');
  const bookmarkIcon = iconNode('bookmark', { size: 16, cls: saved ? 'is-saved' : '' });
  if (bookmarkIcon) bookmark.append(bookmarkIcon);
  coverEl.append(bookmark);
  card.append(coverEl);

  const info = document.createElement('div');
  info.className = 'prog-card-info';
  const name = document.createElement('div');
  name.className = 'prog-card-name';
  name.textContent = program.name || 'Unknown Program';
  info.append(name);

  if (isTile) {
    if (reason) {
      const reasonEl = document.createElement('div');
      reasonEl.className = 'prog-card-reason';
      reasonEl.textContent = reason;
      info.append(reasonEl);
    }
    card.append(info);
    return card;
  }

  const attr = isLarge && !wod ? programAttribution(program) : null;
  if (attr) {
    const author = document.createElement('div');
    author.className = 'prog-card-author';
    const authorName = document.createElement('span');
    authorName.className = 'prog-card-author-name';
    authorName.textContent = attr.text;
    author.append(authorName);
    info.append(author);
  }

  const meta = document.createElement('div');
  meta.className = 'prog-card-meta';
  const category = document.createElement('span');
  category.className = 'prog-card-category';
  const categoryDot = document.createElement('i');
  categoryDot.className = 'prog-card-cat-dot';
  categoryDot.setAttribute('aria-hidden', 'true');
  categoryDot.style.background = accentColor;
  category.append(categoryDot, categoryLabel);
  meta.append(category, Object.assign(document.createElement('span'), { className: 'prog-card-sep', textContent: '·' }), Object.assign(document.createElement('span'), { textContent: durationLabel }));
  if (!wod && program.sessionsPerWeek) {
    meta.append(Object.assign(document.createElement('span'), { className: 'prog-card-sep', textContent: '·' }), Object.assign(document.createElement('span'), { textContent: `${program.sessionsPerWeek}×/wk` }));
  }
  if (equipTierLabel) {
    const equip = document.createElement('span');
    equip.className = 'prog-card-equip';
    equip.textContent = equipTierLabel;
    meta.append(Object.assign(document.createElement('span'), { className: 'prog-card-sep', textContent: '·' }), equip);
  }
  info.append(meta);

  if (reason) {
    const reasonEl = document.createElement('div');
    reasonEl.className = 'prog-card-reason';
    reasonEl.textContent = reason;
    info.append(reasonEl);
  }

  const diffEl = document.createElement('div');
  diffEl.className = 'prog-card-diff';
  diffEl.style.color = diff.color;
  diffEl.title = diff.label;
  diffEl.textContent = dots;
  info.append(diffEl);
  card.append(info);
  return card;
}
