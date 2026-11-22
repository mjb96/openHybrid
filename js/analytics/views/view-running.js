// @ts-check
// =============================================================================
// RUNNING ANALYTICS
// A concise Overview and a complete, metric-specific Stats index. Every number
// comes from running-detail.js, so Home/Profile links, summaries, detail charts
// and exact Activity evidence share one date-strict all-activation source.
// =============================================================================
import { addDaysISO, localDayKey } from '../../dates.js';
import { weekStartOf } from '../weekly-aggregate.js';
import { getSelectedWeekStart } from '../week-nav.js';
import { statCard } from '../charts/chart-primitives.js';
import { buildRunningMetricDetail, collectRunningHistory } from '../running-detail.js';
import { mountScreenTabs, screenTabBar, esc } from './screen-kit.js';

let _runningTab = 'overview';
export function setRunningTab(tab) { _runningTab = tab === 'stats' ? 'stats' : 'overview'; }

const STAT_GROUPS = Object.freeze([
  {
    title: 'Volume & frequency',
    ids: [
      'running.weekly-distance', 'running.four-week-distance', 'running.total-distance',
      'running.weekly-duration', 'running.weekly-run-count', 'running.total-run-count',
      'running.longest-run', 'running.weekly-elevation',
    ],
  },
  {
    title: 'Pace & performance',
    ids: [
      'running.endurance-score', 'running.average-pace', 'running.best-pace', 'running.vdot', 'running.fitness-trend',
      'running.race-projections', 'running.personal-bests',
    ],
  },
  {
    title: 'Heart rate & mechanics',
    ids: [
      'running.average-heart-rate', 'running.max-heart-rate', 'running.threshold-pace',
      'running.threshold-heart-rate', 'running.cadence', 'running.intensity-distribution',
      'running.aerobic-training-effect', 'running.anaerobic-training-effect',
      'running.running-economy', 'running.aerobic-efficiency', 'running.pace-heart-rate',
    ],
  },
  {
    title: 'Running load',
    ids: ['running.training-load', 'running.load-ratio', 'running.form', 'running.training-stress'],
  },
]);

function metricModel(state, history, id, through) {
  return buildRunningMetricDetail(state, id, { history, today: through, includeSeries: false });
}

function compactScope(model) {
  const scope = model?.definition?.scope;
  if (scope === 'calendar-week') {
    // The screen follows the shared week navigator, so a navigated week is a
    // completed one. Calling it "live" beside a "Previous week" navigator was
    // the same defect as showing the live week's distance.
    const through = model?.period?.end;
    const live = !through || through === localDayKey(new Date());
    return live ? 'live calendar week' : 'completed calendar week';
  }
  if (scope === 'rolling-7d') return 'trailing 7 days';
  if (scope === 'rolling-28d') return 'trailing 28 days';
  if (scope === 'rolling-12w') return 'trailing 12 weeks';
  if (scope === 'recent-8w') return 'trailing 8 weeks';
  if (scope === 'rolling-ewma') return '7d / 28d rolling';
  if (scope === 'configured') return 'current setting';
  if (scope === 'current-model') return 'current model';
  return 'all dated history';
}

function metricCard(model) {
  if (!model) return '';
  return statCard({
    label: model.definition.label,
    value: model.formattedValue,
    sub: compactScope(model),
    color: model.definition.color,
    action: 'open-analytics', context: 'running-metric', entity: model.metricId,
    entityName: model.definition.label, parentContext: 'running', preserveWeek: true,
    metricId: model.metricId,
  });
}

function overviewHero(model) {
  if (!model) return '';
  return `<button type="button" class="card-dark an-hero an-hero--action" data-action="open-analytics" data-context="running-metric" data-entity="${esc(model.metricId)}" data-entity-name="${esc(model.definition.label)}" data-parent-context="running" data-preserve-week="true" data-metric-id="${esc(model.metricId)}" aria-label="View ${esc(model.definition.label)} details">
    <div class="an-hero__k">${esc(model.definition.label)} · running fitness</div>
    <div class="an-hero__val" style="color:${model.definition.color}">${esc(model.formattedValue)}</div>
    <div class="an-hero__empty">${esc(compactScope(model))}</div>
    <span class="an-stat__drill">View history & evidence ›</span>
  </button>`;
}

function renderOverview(body, state, history, through) {
  const vdot = metricModel(state, history, 'running.vdot', through);
  const weeklyDistance = metricModel(state, history, 'running.weekly-distance', through);
  const bestPace = metricModel(state, history, 'running.best-pace', through);
  const primaryInsight = weeklyDistance?.empty
    ? 'Your first dated run will unlock calendar-week distance, comparisons and exact activity evidence.'
    : weeklyDistance?.interpretation;
  body.innerHTML = `
    ${overviewHero(vdot)}
    <div class="grid-2-col gap-2 mb-3">
      ${metricCard(weeklyDistance)}
      ${metricCard(bestPace)}
    </div>
    <article class="an-insight-card">
      <span class="an-insight-card__eyebrow">What this says</span>
      <p>${esc(primaryInsight || 'Open a metric to inspect its history and source activities.')}</p>
    </article>
    <button type="button" class="hub-link hub-link--quiet" data-action="open-analytics" data-context="run-performance" data-parent-context="running">
      <span class="hub-link__label">
        <span class="hub-link__title">Run performance</span>
        <span class="hub-link__desc">Distance, time and pace across 7D · 4W · 1Y</span>
      </span>
      <span class="hub-link__arrow" aria-hidden="true">→</span>
    </button>`;
}

function renderStats(body, state, history, through) {
  body.innerHTML = STAT_GROUPS.map((group) => `
    <section class="running-metric-group" aria-labelledby="running-${group.title.toLowerCase().replace(/[^a-z]+/g, '-')}">
      <h2 id="running-${group.title.toLowerCase().replace(/[^a-z]+/g, '-')}" class="section-header">${esc(group.title)}</h2>
      <div class="grid-2-col gap-2 mb-4">
        ${group.ids.map((id) => metricCard(metricModel(state, history, id, through))).join('')}
      </div>
    </section>`).join('');
}

export function renderRunningAnalytics(data, getState) {
  const state = getState ? getState() : {};
  const section = document.getElementById('analytics-running');
  if (!section) return;
  // The shared week navigator selects the calendar week every analytics surface
  // describes. The live week ends today (keeping its comparison elapsed-matched);
  // a past selection ends on its own Sunday. Rebuilding the HISTORY with that
  // through-date matters: the metric model prefers `history.throughDate` over
  // `options.today`, so passing the date alone would still read the live week.
  const today = localDayKey(new Date());
  const weekStart = getSelectedWeekStart(today);
  const through = weekStart === weekStartOf(today) ? today : addDaysISO(weekStart, 6);
  const history = collectRunningHistory(state, { today: through });
  section.innerHTML = screenTabBar(_runningTab) + '<div id="running-tab-body"></div>';
  const body = document.getElementById('running-tab-body');
  if (!body) return;
  if (_runningTab === 'stats') renderStats(body, state, history, through);
  else renderOverview(body, state, history, through);
  mountScreenTabs('analytics-running', (tab) => {
    _runningTab = tab;
    renderRunningAnalytics(data, getState);
  });
}
