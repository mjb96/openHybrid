// =============================================================================
// HOME METRIC OWNERSHIP (HM7 / HY6)
//
// One Home surface owns each metric. The coach line is advisory and must never
// repeat a figure another card already shows: readiness (Today guidance),
// bodyweight (bodyweight card), weekly volume (Strength week chip), planned
// sessions (week rail) and working sets (Strength card).
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickTopInsight } from '../js/home/dashboard-model.js';
import { buildTodayCardModel, todayCardHTML } from '../js/home/today-card.js';

const model = (overrides = {}) => ({
  rec: { badge: 'Productive', headline: 'On track' },
  fasting: { active: false },
  load: { hasData: true, acwr: 0.9 },
  ready: { hasData: true, score: 78, confidence: 'high' },
  calendarWeek: { sets: 2, volume: { delta: { good: true, dir: 'up', pctLabel: '12%' } } },
  streak: { current: 0 },
  week: { planDone: 2, planTotal: 6, planPct: 33 },
  bodyweight: { hasData: true, delta7: -1.6 },
  ...overrides,
});

const REPEATED = [/readiness/i, /planned sessions?/i, /body weight/i, /weekly volume/i, /working sets?/i];

test('the coach never restates a metric another Home card owns', () => {
  // Only lines that actually exist are checked; a model with no story now
  // returns null and the card shows no advisory line at all.
  const variants = [
    model(),                                        // no story
    model({ fasting: { active: true, hours: 16, zone: { name: 'Fat burn' } } }),
    model({ load: { hasData: true, acwr: 1.6 } }),
    model({ load: { hasData: true, acwr: 0.9 }, streak: { current: 5 } }),
    model({ rec: { badge: 'Session Done', headline: '' } }),
  ];
  for (const variant of variants) {
    const insight = pickTopInsight(variant);
    if (!insight) continue;
    for (const pattern of REPEATED) {
      assert.doesNotMatch(insight.text, pattern, `coach repeated ${pattern}: ${insight.text}`);
    }
  }
});

test('a model with no story returns no line instead of a platitude', () => {
  assert.equal(pickTopInsight(model()), null);
});

test('a high or low readiness score is not repeated by the coach', () => {
  for (const score of [92, 24]) {
    const insight = pickTopInsight(model({ ready: { hasData: true, score, confidence: 'high' } }));
    if (!insight) continue;
    assert.doesNotMatch(insight.text, /readiness/i);
    assert.doesNotMatch(insight.text, new RegExp(String(score)));
  }
});

test('safety and fasting still outrank the quiet fallbacks', () => {
  assert.match(pickTopInsight(model({ load: { hasData: true, acwr: 1.6 } })).text, /Load spiking/);
  assert.match(pickTopInsight(model({ load: { hasData: true, acwr: 1.35 } })).text, /Building load/);
  assert.match(pickTopInsight(model({ fasting: { active: true, hours: 16, zone: { name: 'Fat burn' } } })).text, /Fasting/);
});

test('a streak is advisory and still surfaces when there is nothing else', () => {
  const insight = pickTopInsight(model({ streak: { current: 5 } }));
  assert.match(insight.text, /5-day training streak/);
});

test('data with no story gets no invented metric, and an empty profile gets a prompt', () => {
  assert.equal(pickTopInsight(model()), null);
  assert.match(pickTopInsight(model({ ready: { hasData: false }, calendarWeek: { sets: 0 }, week: { planDone: 0, planTotal: 0 } })).text, /Log a few sessions/);
});

test('the Today card remains the one readiness surface, with the score in its own row', () => {
  const card = buildTodayCardModel({
    state: {
      currentWeek: '1', activeProgramId: 'test',
      weeks: {
        '0': { lifts: { mon: { 'Bench Press': [{ w: '80', r: '5', c: true }] } }, runs: {}, runSessions: {}, gymStats: {} },
        '1': { dates: {}, lifts: {}, runs: {}, runSessions: {}, gymStats: {}, sessionStatus: {} },
      },
    },
    program: { name: 'Test', days: { mon: { title: 'Push', lifts: ['Bench Press'], runs: 'Rest' }, sun: { lifts: [], runs: 'Rest' } } },
    model: { ready: { hasData: true, score: 78 }, rec: { badge: 'Productive', headline: 'On track' } },
    now: new Date('2026-08-03T09:00:00+10:00'),
    tz: 'Australia/Sydney',
  });
  // The figure has one owner: the readiness row. Guidance is advice only, so a
  // collapsed card can never hide the score behind the chevron.
  assert.equal(card.readiness.score, 78);
  assert.doesNotMatch(card.guidance, /readiness|\b78\b/i);
  assert.match(todayCardHTML(card, { expanded: false }), /today-card__readiness/);
});
