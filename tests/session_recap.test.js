// ==========================================
// SESSION RECAP TEST (tests/session_recap.test.js)
// buildSessionRecap is the pure core of the new full-screen recap: tonnage,
// per-lift breakdown + est. 1RM, run/walk details, and session insights.
// Run with `node --test`.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSessionRecap, renderSessionRecapHTML } from '../js/session-recap.js';
import { upsertRunSession } from '../js/state/run-sessions.js';

function stateWith(day) {
  return { weeks: { '1': day } };
}

test('lifts keep the order the session was performed, not the heaviest first', () => {
  const wd = {
    dates: { mon: '2026-07-02' },
    lifts: {
      mon: {
        'Squat': [{ w: 100, r: 5, c: true }],
        'Bench Press': [{ w: 80, r: 5, c: true }, { w: 80, r: 5, c: true }],
      },
    },
    runs: {},
  };
  // No liftOrder: stored insertion order is the only evidence of sequence.
  // Volume would put Bench (800) ahead of Squat (500); the recap must not.
  const r = buildSessionRecap(stateWith(wd), '1', 'mon');
  assert.deepEqual(r.lifts.map((lift) => lift.name), ['Squat', 'Bench Press']);
});

test('an explicit liftOrder wins, including after a drag reorder', () => {
  const wd = {
    dates: { mon: '2026-07-02' },
    liftOrder: { mon: ['Bench Press', 'Squat'] },
    lifts: {
      mon: {
        'Squat': [{ w: 100, r: 5, c: true }],
        'Bench Press': [{ w: 80, r: 5, c: true }],
      },
    },
    runs: {},
  };
  const r = buildSessionRecap(stateWith(wd), '1', 'mon');
  assert.deepEqual(r.lifts.map((lift) => lift.name), ['Bench Press', 'Squat']);
});

test('a lift missing from liftOrder stays after the ordered ones', () => {
  const wd = {
    dates: { mon: '2026-07-02' },
    liftOrder: { mon: ['Squat'] },
    lifts: {
      mon: {
        'Squat': [{ w: 100, r: 5, c: true }],
        'Cable Fly': [{ w: 20, r: 12, c: true }],
        'Leg Press': [{ w: 200, r: 10, c: true }],
      },
    },
    runs: {},
  };
  const r = buildSessionRecap(stateWith(wd), '1', 'mon');
  assert.equal(r.lifts[0].name, 'Squat');
  assert.deepEqual(r.lifts.slice(1).map((lift) => lift.name), ['Cable Fly', 'Leg Press']);
});

test('summarises a strength session: tonnage, working sets, top lift + e1RM', () => {
  const wd = {
    dates: { mon: '2026-07-02' },
    gymRpe: { mon: '8' },
    gymStats: { mon: { time: '52:00' } },
    lifts: {
      mon: {
        'Bench Press': [
          { w: 60, r: 5, c: true },
          { w: 80, r: 5, c: true },
          { w: 40, r: 8, type: 'W', c: true }, // warm-up excluded
        ],
        'Squat': [{ w: 100, r: 5, c: true }, { w: 100, r: 5, c: false }], // 2nd not completed
      },
    },
    runs: {},
  };
  const r = buildSessionRecap(stateWith(wd), '1', 'mon');
  // tonnage = 60*5 + 80*5 + 100*5 = 300+400+500 = 1200 (warm-up + incomplete excluded)
  assert.equal(r.tonnage, 1200);
  assert.equal(r.workingSets, 3);
  assert.deepEqual(r.types, ['gym']);
  // Squat has higher volume (500) than Bench (700? 300+400=700) -> Bench first
  assert.equal(r.lifts[0].name, 'Bench Press');
  assert.equal(r.lifts[0].topSet.w, 80);
  assert.ok(r.lifts[0].e1rm >= 90); // 80*(1+5/30) ≈ 93
});

test('summarises a run with pace + tags walk vs run', () => {
  const wd = {
    dates: { tue: '2026-07-03' },
    lifts: {},
    runs: { tue: { dist: 5, time: '25:00', rpe: '6', type: 'run' } },
  };
  const r = buildSessionRecap(stateWith(wd), '1', 'tue');
  assert.deepEqual(r.types, ['run']);
  assert.equal(r.run.distKm, 5);
  assert.equal(r.run.pace, '5:00');   // 25:00 / 5km
});

test('walk type is carried through', () => {
  const wd = { dates: { wed: '2026-07-04' }, lifts: {}, runs: { wed: { dist: 2, time: '24:00', type: 'walk' } } };
  const r = buildSessionRecap(stateWith(wd), '1', 'wed');
  assert.deepEqual(r.types, ['walk']);
});

test('GPS quality audit is sanitized and shown in the run breakdown', () => {
  const gpsQuality = {
    version: 1, confidence: 'medium', rawPointCount: 6, acceptedPointCount: 5,
    rejectedPointCount: 1,
    rejected: { invalid: 0, poorAccuracy: 1, jitter: 0, timestamp: 0, teleport: 0 },
    rawDistanceKm: 5.2, filteredDistanceKm: 5, distanceRemovedKm: 0.2,
    avgAccuracyM: 18.2, maxObservedSpeedMps: 4.2, segmentBreaks: 1,
    injected: '<img src=x onerror=alert(1)>',
  };
  const wd = { lifts: {}, runs: { mon: { dist: 5, time: '25:00', type: 'run', gpsQuality } } };
  const recap = buildSessionRecap(stateWith(wd), '1', 'mon');
  assert.equal(recap.run.gpsQuality.confidence, 'medium');
  assert.equal('injected' in recap.run.gpsQuality, false);
  const html = renderSessionRecapHTML(recap, [], null, 'breakdown');
  assert.match(html, /GPS quality audit/);
  assert.match(html, /Medium confidence/);
  assert.match(html, /0\.200 km removed/);
  assert.doesNotMatch(html, /onerror/);
});

test('flags a PR when a lift beats its best from every prior session', () => {
  const state = {
    weeks: {
      '1': { dates: { mon: '2026-06-23' }, lifts: { mon: { 'Bench Press': [{ w: 80, r: 5, c: true }] } }, runs: {} },
      '2': { dates: { mon: '2026-06-30' }, lifts: { mon: { 'Bench Press': [{ w: 90, r: 5, c: true }] } }, runs: {} },
    },
  };
  // Week 2 (90×5) beats week 1 (80×5) -> PR.
  const r2 = buildSessionRecap(state, '2', 'mon');
  assert.equal(r2.lifts[0].pr, true);
  // Week 1 is the first-ever session -> no prior best -> not a PR.
  const r1 = buildSessionRecap(state, '1', 'mon');
  assert.equal(r1.lifts[0].pr, false);
  // The 🏆 badge renders only for the PR session.
  assert.ok(renderSessionRecapHTML(r2).includes('🏆'));
  assert.ok(!renderSessionRecapHTML(r1).includes('🏆'));

  // Sharing the whole workout is offered in the recap, but History renders
  // this same HTML and owns its own share action — the row must be opt-out.
  assert.ok(renderSessionRecapHTML(r2).includes('Share workout'));
  assert.ok(!renderSessionRecapHTML(r2, [], null, 'summary', { share: false }).includes('Share workout'));
});

test('PR comparison carries canonical exercise aliases across programs', () => {
  const state = { weeks: {
    'arch:old:1': {
      dates: { tue: '2026-06-23' },
      lifts: { tue: { 'DB Bench Press': [{ w: 30, r: 8, c: true }] } },
      runs: {},
    },
    '1': {
      dates: { fri: '2026-07-03' },
      lifts: { fri: { 'Dumbbell Bench Press': [{ w: 32.5, r: 8, c: true }] } },
      runs: {},
    },
  } };
  const recap = buildSessionRecap(state, '1', 'fri');
  assert.equal(recap.lifts[0].pr, true);
});

test('FIT strength is a real recap even with no exercise names', () => {
  const state = {
    settings: { weightUnit: 'kg', distanceUnit: 'km' },
    weeks: {
      'arch:fitgym:1': {
        dates: { mon: '2026-07-02' },
        lifts: { mon: {} },
        gymStats: { mon: { time: '45:00', avgHR: '120', maxHR: '150', cals: '300' } },
        runs: {},
      },
    },
  };
  const r = buildSessionRecap(state, 'arch:fitgym:1', 'mon');
  assert.equal(r.empty, false);
  assert.deepEqual(r.types, ['gym']);
  assert.equal(r.hasGymStats, true);
  const html = renderSessionRecapHTML(r);
  assert.match(html, /45:00/);
  assert.match(html, /120 bpm/);
  assert.match(html, /Calories/);
});

test('a run without a GPS route says so instead of rendering an empty map', () => {
  const wd = {
    dates: { tue: '2026-07-03' },
    lifts: {},
    runs: { tue: { dist: 5, time: '25:00', rpe: '6', type: 'run' } },
  };
  const r = buildSessionRecap(stateWith(wd), '1', 'tue');
  const html = renderSessionRecapHTML(r);
  assert.match(html, /No GPS route recorded/);
  assert.doesNotMatch(html, /id="recapMapContainer"/);
});

test('recap closes the loop with Last time and Next time', () => {
  const state = {
    settings: { weightUnit: 'kg', progressionIncrement: 2.5 },
    weeks: {
      '1': {
        dates: { mon: '2026-06-23' },
        lifts: { mon: { 'Bench Press': [{ w: 80, r: 5, c: true, tr: 5 }] } },
        runs: {},
      },
      '2': {
        dates: { mon: '2026-06-30' },
        lifts: { mon: { 'Bench Press': [{ w: 85, r: 5, c: true, tr: 5 }] } },
        runs: {},
      },
    },
  };
  const r = buildSessionRecap(state, '2', 'mon');
  assert.equal(r.lifts[0].previous[0].w, 80);
  assert.ok(r.lifts[0].next, 'a completed target should produce a next-time suggestion');
  assert.ok(r.lifts[0].next.weight > 85);
  const html = renderSessionRecapHTML(r);
  assert.match(html, /Last time: 80kg × 5/);
  assert.match(html, /Next time:/);
});

test('failure stays visible in the session recap', () => {
  const wd = {
    dates: { mon: '2026-07-02' },
    lifts: { mon: { Squat: [{ w: 100, r: 5, c: true, failure: true }] } },
    runs: {},
  };
  const r = buildSessionRecap(stateWith(wd), '1', 'mon');
  assert.equal(r.lifts[0].setList[0].failure, true);
  const html = renderSessionRecapHTML(r, [], null, 'breakdown');
  assert.match(html, /failure/);
});

test('recap labels weights and distances in the athlete’s units', () => {
  const state = {
    settings: { weightUnit: 'lbs', distanceUnit: 'mi' },
    weeks: {
      '1': {
        dates: { mon: '2026-07-02' },
        lifts: { mon: { 'Bench Press': [{ w: 100, r: 5, c: true }] } },
        runs: { mon: { dist: 5, time: '25:00', pace: '5:00', type: 'run' } },
      },
    },
  };
  const r = buildSessionRecap(state, '1', 'mon');
  const html = renderSessionRecapHTML(r);
  assert.match(html, /500 lbs/);
  assert.match(html, /3\.11 mi/);
  assert.match(html, /8:03 \/mi/);
  assert.doesNotMatch(html, /500 kg|5\.00 km|5:00 \/km/);
});

test('high-rep work remains in the recap but is not presented as a 1RM estimate', () => {
  const state = stateWith({
    dates: { mon: '2026-07-02' },
    lifts: { mon: { Curl: [{ w: 20, r: 20, c: true }] } },
    runs: {},
  });
  const recap = buildSessionRecap(state, '1', 'mon');
  assert.equal(recap.lifts[0].topSet.w, 20);
  assert.equal(recap.lifts[0].e1rm, 0);
  assert.doesNotMatch(renderSessionRecapHTML(recap), /est\. 1RM/);
});

test('run splits render as a pace bar chart with per-km values', () => {
  const wd = {
    dates: { tue: '2026-07-03' }, lifts: {},
    runs: { tue: { dist: 3, time: '15:00', type: 'run', splits: [
      { lap: 1, time: 300 }, { lap: 2, time: 280 }, { lap: 3, time: 320 },
    ] } },
  };
  const html = renderSessionRecapHTML(buildSessionRecap(stateWith(wd), '1', 'tue'), [], 270);
  assert.ok(html.includes('recap-pacechart'));
  assert.ok(html.includes('Pace / km'));
  assert.ok(html.includes('5:00'));  // 300s/km
  assert.ok(html.includes('4:40'));  // 280s/km (fastest)
  // Fastest split gets the full-width bar.
  assert.ok(html.includes('width:100%'));
});

test('empty day yields an empty recap (no throw), renders a friendly message', () => {
  const r = buildSessionRecap(stateWith({ lifts: {}, runs: {} }), '1', 'fri');
  assert.equal(r.empty, true);
  assert.match(renderSessionRecapHTML(r), /Nothing logged/i);
});

test('sessionId recap selects one exact same-day run while day recap aggregates both', () => {
  const wd = { lifts: {}, runs: {}, runSessions: {}, dates: { mon: '2026-07-13' } };
  upsertRunSession(wd, 'mon', { dist: '5', time: '25:00', type: 'run' }, { sessionId: 'run_one', updatedTs: 1 });
  upsertRunSession(wd, 'mon', { dist: '3', time: '18:00', type: 'run' }, { sessionId: 'run_two', updatedTs: 2 });
  const state = stateWith(wd);

  assert.equal(buildSessionRecap(state, '1', 'mon').run.distKm, 8);
  const exact = buildSessionRecap(state, '1', 'mon', 'run_one');
  assert.equal(exact.run.sessionId, 'run_one');
  assert.equal(exact.run.distKm, 5);
  assert.equal(exact.run.time, '25:00');
});

test('an aggregated same-day recap never labels combined distance with one run GPS audit', () => {
  const quality = {
    version: 1, confidence: 'high', rawPointCount: 2, acceptedPointCount: 2,
    rejectedPointCount: 0,
    rejected: { invalid: 0, poorAccuracy: 0, jitter: 0, timestamp: 0, teleport: 0 },
    rawDistanceKm: 1, filteredDistanceKm: 1, distanceRemovedKm: 0,
    avgAccuracyM: 8, maxObservedSpeedMps: 3, segmentBreaks: 0,
  };
  const wd = { lifts: {}, runs: {}, runSessions: {}, dates: { mon: '2026-07-13' } };
  upsertRunSession(wd, 'mon', { dist: 1, time: '5:00', gpsQuality: quality }, { sessionId: 'gps' });
  upsertRunSession(wd, 'mon', { dist: 2, time: '10:00' }, { sessionId: 'manual' });
  assert.equal(buildSessionRecap(stateWith(wd), '1', 'mon').run.gpsQuality, null);
  assert.equal(buildSessionRecap(stateWith(wd), '1', 'mon', 'gps').run.gpsQuality.confidence, 'high');
});

test('a mixed strength+run day never shows the strength note on the run detail', () => {
  // The strength note lives in week.notes[day]; run notes live on the run
  // session (`runs[].notes`). A mixed date shares week.notes and gymStats, so a
  // run detail must not borrow either just because the strength side exists.
  const wd = {
    dates: { mon: '2026-07-13' },
    lifts: { mon: { 'Bench Press': [{ w: 80, r: 5, c: true }] } },
    gymStats: { mon: { time: '45:00', avgHR: '120' } },
    notes: { mon: 'Strength cue: pause at the chest' },
    runs: { mon: { dist: 5, time: '25:00', type: 'run', notes: 'Run cue: easy breathing' } },
  };
  const state = stateWith(wd);

  const strength = buildSessionRecap(state, '1', 'mon', null, 'strength');
  assert.equal(strength.notes, 'Strength cue: pause at the chest');
  assert.match(renderSessionRecapHTML(strength), /Workout note/);
  assert.match(renderSessionRecapHTML(strength), /Strength cue: pause at the chest/);

  const run = buildSessionRecap(state, '1', 'mon', null, 'run');
  assert.equal(run.notes, '', 'a run detail on a mixed date has no strength note');
  assert.doesNotMatch(renderSessionRecapHTML(run), /Workout note/);
  assert.doesNotMatch(renderSessionRecapHTML(run), /Strength cue: pause at the chest/);
  assert.equal(run.run.distKm, 5);
});

test('renderSessionRecapHTML escapes lift names and includes stats', () => {
  const wd = { dates: { mon: '2026-07-02' }, lifts: { mon: { '<b>Curl</b>': [{ w: 20, r: 10, c: true }] } }, runs: {} };
  const html = renderSessionRecapHTML(buildSessionRecap(stateWith(wd), '1', 'mon'));
  assert.ok(html.includes('&lt;b&gt;Curl&lt;/b&gt;'));  // escaped, not raw
  assert.ok(!html.includes('<b>Curl</b>'));
  assert.ok(html.includes('kg'));
});

test('the stored workout note survives into the recap', () => {
  const wd = {
    dates: { mon: '2026-07-02' },
    lifts: { mon: { 'Bench Press': [{ w: 80, r: 5, c: true }] } },
    notes: { mon: '  Felt strong on the top set.  ' },
    runs: {},
  };
  const recap = buildSessionRecap(stateWith(wd), '1', 'mon');
  assert.equal(recap.notes, 'Felt strong on the top set.');
  const html = renderSessionRecapHTML(recap);
  assert.match(html, /Workout note/);
  assert.match(html, /Felt strong on the top set\./);
});

test('a missing workout note is blank and renders no block', () => {
  const wd = {
    dates: { mon: '2026-07-02' },
    lifts: { mon: { 'Bench Press': [{ w: 80, r: 5, c: true }] } },
    runs: {},
  };
  const recap = buildSessionRecap(stateWith(wd), '1', 'mon');
  assert.equal(recap.notes, '');
  assert.doesNotMatch(renderSessionRecapHTML(recap), /Workout note/);
});

test('a run-only day leaves the strength note blank', () => {
  const wd = {
    dates: { tue: '2026-07-03' },
    lifts: {},
    notes: { tue: 'Run note that belongs to the run detail' },
    runs: { tue: { dist: 5, time: '25:00', type: 'run' } },
  };
  const recap = buildSessionRecap(stateWith(wd), '1', 'tue');
  assert.equal(recap.notes, '');
  assert.doesNotMatch(renderSessionRecapHTML(recap), /Run note that belongs to the run detail/);
});

test('the workout note is escaped, never injected as HTML', () => {
  const wd = {
    dates: { mon: '2026-07-02' },
    lifts: { mon: { 'Bench Press': [{ w: 80, r: 5, c: true }] } },
    notes: { mon: '<img src=x onerror=alert(1)>' },
    runs: {},
  };
  const html = renderSessionRecapHTML(buildSessionRecap(stateWith(wd), '1', 'mon'));
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x onerror/);
});
