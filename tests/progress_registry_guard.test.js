// =============================================================================
// PROGRESS REGISTRY GUARD
//
// Roadmap §16 (PG2/PG3/PG7): a section, band detail or destination may not be
// rendered on Progress unless it is declared in `analytics/progress-sections.js`
// and therefore has a Customize toggle (or a stated read-only review route).
//
// This test renders the real hub from a trained fixture and also scans the
// source of every Progress view for literal destinations, so adding a footer
// link or a band with no home fails here rather than only in review.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  PROGRESS_SECTIONS, PROGRESS_SECTION_IDS, PROGRESS_SECTION_CHILDREN, PROGRESS_ROUTE_IDS,
  PROGRESS_ENTITY_ROUTE_IDS, PROGRESS_HEADER_DESTINATIONS, progressDetailFor,
} from '../js/analytics/progress-sections.js';
import { buildProgressDashboard } from '../js/analytics/progress-dashboard.js';
import { buildProgressLanding } from '../js/analytics/progress-landing.js';
import { renderProgressHub } from '../js/analytics/views/view-progress-hub.js';
import {
  PROGRESS_CARDS, PROGRESS_SUB_CARDS, cardsFor, subCardsFor,
} from '../js/ui/customize.js';

const TODAY = '2026-11-24';
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });

function trainedState() {
  return {
    settings: { weightUnit: 'kg', distanceUnit: 'km', modules: { running: true, fasting: true } },
    weeks: {
      '1': {
        dates: { mon: '2026-11-23', tue: '2026-11-24' },
        lifts: {
          mon: { 'Bench Press': [done(100), done(105)] },
          tue: { 'Back Squat': [done(140)] },
        },
        runs: { tue: { dist: '6.0', time: '29:00' } },
        runSessions: { tue: [{ sessionId: 'run-1', dist: '6.0', time: '29:00', type: 'run', source: 'gps' }] },
      },
    },
    bodyWeightLog: [{ date: '2026-11-02', weight: 80 }, { date: '2026-11-22', weight: 79.2 }],
    bodyMeasurements: [{ date: '2026-11-22', waist: 82, chest: 104 }],
    fastingSession: {
      active: false,
      goal: 16,
      history: [{ startTime: 'x', endTime: '2026-11-21T12:00:00Z', durationHours: 17, goalHours: 16 }],
    },
  };
}

function renderHub(state) {
  const dashboard = buildProgressDashboard(state, { todayISO: TODAY });
  const landing = buildProgressLanding(state, { days: DAYS, today: TODAY });
  const dom = new JSDOM('<!doctype html><body><div id="analytics-hub"></div></body>');
  const container = dom.window.document.getElementById('analytics-hub');
  renderProgressHub(container, landing, [], {
    bands: dashboard.bands,
    rangeId: dashboard.range.id,
    focus: dashboard.focus,
    focusAvailable: dashboard.focusAvailable,
    visibleCount: dashboard.visibleCount,
    renderableCount: dashboard.renderableCount,
    hidden: [],
  });
  return { dashboard, dom, container };
}

test('the registry is the eight sections in strength-first default order', () => {
  assert.deepEqual(PROGRESS_SECTION_IDS, [
    'pulse', 'exercises', 'muscles', 'body', 'reviews', 'balance', 'endurance', 'fasting',
  ]);
  assert.equal(new Set(PROGRESS_SECTION_IDS).size, PROGRESS_SECTION_IDS.length);
  PROGRESS_SECTIONS.forEach((section, index) => {
    assert.equal(section.defaultOrder, index, `${section.id} default order`);
    assert.ok(section.label, `${section.id} has a label`);
    assert.ok(section.subtitle, `${section.id} has a subtitle`);
    assert.equal(section.parent, null, `${section.id} is top-level`);
    assert.equal(typeof section.defaultVisible, 'boolean');
    assert.ok(section.routeId === null || typeof section.routeId === 'string');
  });
});

test('the Customize sheet derives every section and toggle from the registry', () => {
  assert.deepEqual(cardsFor('progress').map((card) => card.id), PROGRESS_SECTION_IDS);
  assert.deepEqual(PROGRESS_CARDS.map((card) => card.id), PROGRESS_SECTION_IDS);
  assert.deepEqual(
    PROGRESS_SUB_CARDS.map((card) => card.id),
    PROGRESS_SECTION_CHILDREN.map((child) => child.id),
  );
  for (const section of PROGRESS_SECTIONS) {
    assert.deepEqual(
      subCardsFor(section.id).map((card) => card.id),
      section.children.filter((child) => child.toggle !== false).map((child) => child.id),
      `${section.id} detail switches`,
    );
  }
});

test('every band with a detail header declares that route in the registry', () => {
  const { container } = renderHub(trainedState());
  for (const section of PROGRESS_SECTIONS.filter((entry) => entry.detailLabel)) {
    const detail = progressDetailFor(section.id);
    assert.ok(detail, `${section.id} has a detail`);
    const band = container.querySelector(`[data-band="${section.id}"]`);
    if (!band) continue;
    const head = band.querySelector('.pg-band__head--detail');
    assert.ok(head, `${section.id} header is a control`);
    assert.equal(head.getAttribute('data-context'), detail.context);
    assert.ok(head.textContent.includes('Details'), `${section.id} states the affordance`);
  }
  // Reviews is a row of destinations, not a band drilldown.
  assert.equal(progressDetailFor('reviews').context, 'weekly-review');
  assert.equal(container.querySelector('[data-band="reviews"] .pg-band__head--detail'), null);
});

test('the rendered hub declares only registry sections and registry destinations', () => {
  const { dashboard, container } = renderHub(trainedState());
  assert.ok(dashboard.bands.length >= 6, 'the fixture should exercise most sections');

  const sectionIds = [...container.querySelectorAll('[data-band]')].map((node) => node.getAttribute('data-band'));
  for (const id of sectionIds) {
    assert.ok(PROGRESS_SECTION_IDS.includes(id), `band "${id}" has no registry entry`);
  }

  const destinations = [...container.querySelectorAll('[data-action="open-analytics"]')];
  assert.ok(destinations.length > 0);
  for (const node of destinations) {
    const context = node.getAttribute('data-context');
    if (PROGRESS_ENTITY_ROUTE_IDS.has(context) && node.hasAttribute('data-entity')) continue;
    assert.ok(PROGRESS_ROUTE_IDS.has(context), `destination "${context}" is outside the registry`);
  }

  // History has exactly one home: the header icon.
  const history = [...container.querySelectorAll('[data-action="open-activities"]')];
  assert.equal(history.length, 1, 'History renders once');
  assert.ok(history[0].closest('.hub-head'), 'History is the header icon');
  assert.ok(PROGRESS_HEADER_DESTINATIONS.some((entry) => entry.routeAction === 'open-activities'));

  // The old dumping ground must not exist in any form.
  assert.equal(container.querySelector('.an-method'), null);
  assert.equal(container.querySelector('.hub-group'), null);
  assert.equal(container.querySelector('.hub-link--quiet'), null);
  assert.doesNotMatch(container.textContent, /More detail/);

  // The method is a header disclosure, not a footer <details>.
  const method = container.querySelector('.hub-head details.pg-method');
  assert.ok(method, 'the method lives in the header');
  assert.ok(method.querySelector('summary'));
});

test('no Progress view names a destination literal outside the registry', () => {
  const files = [
    'js/analytics/views/view-progress-hub.js',
    'js/analytics/views/view-reviews.js',
    'js/analytics/views/view-pulse.js',
    'js/analytics/views/view-balance.js',
    'js/analytics/views/view-muscles.js',
    'js/analytics/views/view-exercises.js',
    'js/analytics/views/view-endurance.js',
    'js/analytics/views/view-body.js',
    'js/analytics/views/view-fasting-band.js',
  ];
  for (const file of files) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const match of source.matchAll(/data-context="([a-z][a-z-]*)"/g)) {
      assert.ok(PROGRESS_ROUTE_IDS.has(match[1]), `${file} names unregistered destination "${match[1]}"`);
    }
  }
});
