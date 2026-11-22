// =============================================================================
// SUPERSET / CIRCUIT MODEL (tests/superset_circuit.test.js)
//
// A circuit is same-day lifts sharing a `groupId`. These tests pin the facts the
// old pair-only implementation got wrong: joining keeps the existing letter,
// removing one member never strands a partner, colours continue past F, the id
// allocator goes A…Z then AA/AB instead of ASCII punctuation, and rest fires
// only after the LAST member of a round has caught up. Warm-up and drop rows are
// outside the round. Routines and copied sessions carry the membership.
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  colorForGroupId, detachMember, isGroupId, membersFor, membersInOrder, nextGroupId,
  pruneSingleMemberGroups, resolveJoin, roundState, shouldRestAfterSet,
} from '../js/workout/superset.js';
import { buildRoutineFromSession, routineSourceWeek } from '../js/routines/model.js';
import { createOneOffStrengthSession } from '../js/workout/one-off-session.js';
import { isValidRoutine, sanitizeImportedState } from '../js/state/import-validate.js';

/** A three-member circuit with three untouched working rows each. */
function circuitWeek() {
  return {
    dates: { mon: '2026-11-16' },
    lifts: {
      mon: {
        Bench: [{ w: '60', r: '8', c: false }, { w: '60', r: '8', c: false }, { w: '60', r: '8', c: false }],
        Row: [{ w: '50', r: '10', c: false }, { w: '50', r: '10', c: false }, { w: '50', r: '10', c: false }],
        Curl: [{ w: '15', r: '12', c: false }, { w: '15', r: '12', c: false }, { w: '15', r: '12', c: false }],
        Later: [{ w: '20', r: '10', c: false }],
      },
    },
    liftOrder: { mon: ['Bench', 'Row', 'Curl', 'Later'] },
    liftMeta: {
      mon: {
        Bench: { groupId: 'A' },
        Row: { groupId: 'A' },
        Curl: { groupId: 'A' },
        Later: {},
      },
    },
  };
}

const tick = (week, lift, index) => { week.lifts.mon[lift][index].c = true; };

// ── Membership ────────────────────────────────────────────────────────────────

test('members are the same-day lifts sharing a group and render in lift order', () => {
  const week = circuitWeek();
  assert.deepEqual(membersFor(week, 'mon', 'Row'), ['Bench', 'Row', 'Curl']);
  // liftMeta insertion order is deliberately not the display order.
  week.liftMeta.mon = { later: {}, Curl: { groupId: 'A' }, Row: { groupId: 'A' }, Bench: { groupId: 'A' } };
  assert.deepEqual(
    membersInOrder(week, 'mon', 'Row', week.liftOrder.mon),
    ['Bench', 'Row', 'Curl'],
    'liftOrder decides, not object-key order',
  );
  assert.deepEqual(membersFor(week, 'mon', 'Later'), [], 'an untagged lift has no members');
});

test('a stale tag on a lift with no rows is not a member and cannot block rest', () => {
  const week = circuitWeek();
  delete week.lifts.mon.Curl;
  assert.deepEqual(membersFor(week, 'mon', 'Bench'), ['Bench', 'Row']);
  tick(week, 'Bench', 0);
  tick(week, 'Row', 0);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 0 }), true);
});

// ── Joining / removing ────────────────────────────────────────────────────────

test('joining an existing circuit keeps its letter instead of re-lettering a partner', () => {
  const dayMeta = { Bench: { groupId: 'A' }, Row: { groupId: 'A' }, Curl: {} };
  const join = resolveJoin(dayMeta, 'Row', 'Curl');
  assert.deepEqual(join, { ok: true, groupId: 'A' });
  // Applying the resolution leaves the original pair intact.
  dayMeta.Curl = { ...dayMeta.Curl, groupId: join.groupId };
  assert.equal(dayMeta.Bench.groupId, 'A');
  assert.equal(dayMeta.Row.groupId, 'A');
  assert.equal(dayMeta.Curl.groupId, 'A');

  // An untagged lift joining a pair adopts the pair's letter.
  assert.deepEqual(resolveJoin({ Bench: { groupId: 'A' }, Row: {} }, 'Row', 'Bench'), { ok: true, groupId: 'A' });
  // Only two untagged lifts allocate a fresh letter.
  assert.deepEqual(resolveJoin({}, 'Bench', 'Row'), { ok: true, groupId: 'A' });
});

test('a cross-group merge is refused rather than re-lettering either circuit', () => {
  const dayMeta = { Bench: { groupId: 'A' }, Row: { groupId: 'A' }, Curl: { groupId: 'B' } };
  assert.deepEqual(resolveJoin(dayMeta, 'Row', 'Curl'), {
    ok: false, reason: 'cross-group', mine: 'A', theirs: 'B',
  });
});

test('removing one member keeps the group; removing down to one clears the tag', () => {
  const week = circuitWeek();
  const meta = week.liftMeta.mon;
  const first = detachMember(meta, 'Row');
  assert.equal(first.removed, true);
  assert.equal(meta.Row.groupId, undefined);
  assert.equal(meta.Bench.groupId, 'A');
  assert.equal(meta.Curl.groupId, 'A');
  assert.deepEqual(membersFor(week, 'mon', 'Bench'), ['Bench', 'Curl']);

  const second = detachMember(meta, 'Curl');
  assert.equal(second.removed, true);
  assert.equal(meta.Bench.groupId, undefined, 'a lone member is not a circuit');
  assert.deepEqual(membersFor(week, 'mon', 'Bench'), []);
  assert.equal(detachMember(meta, 'Later').removed, false);
});

test('pruning drops a tag with no partner and leaves other liftMeta fields alone', () => {
  const meta = { Bench: { groupId: 'A', autoRamp: true }, Row: {} };
  pruneSingleMemberGroups(meta);
  assert.equal(meta.Bench.groupId, undefined);
  assert.equal(meta.Bench.autoRamp, true);
});

// ── Ids and colours ───────────────────────────────────────────────────────────

test('ids run A…Z then AA/AB, never ASCII punctuation', () => {
  const used = {};
  for (let i = 0; i < 26; i++) used[`L${i}`] = { groupId: String.fromCharCode(65 + i) };
  assert.equal(nextGroupId(used), 'AA');
  used.extra = { groupId: 'AA' };
  assert.equal(nextGroupId(used), 'AB');
  assert.equal(nextGroupId({}), 'A');
  assert.equal(nextGroupId({ junk: { groupId: '[' } }), 'A', 'an old malformed tag is ignored');
  assert.equal(isGroupId('AA'), true);
  assert.equal(isGroupId('['), false);
  assert.equal(isGroupId('a'), false);
});

test('A–F keep their values and the palette continues beyond F', () => {
  assert.equal(colorForGroupId('A'), '#3b82f6');
  assert.equal(colorForGroupId('B'), '#a855f7');
  assert.equal(colorForGroupId('C'), '#10b981');
  assert.equal(colorForGroupId('D'), '#f59e0b');
  assert.equal(colorForGroupId('E'), '#ec4899');
  assert.equal(colorForGroupId('F'), '#06b6d4');
  assert.match(colorForGroupId('G'), /^#[0-9a-f]{6}$/);
  assert.notEqual(colorForGroupId('G'), colorForGroupId('A'), 'G must not collapse to blue');
  assert.equal(colorForGroupId('G'), colorForGroupId('G'), 'stable');
  assert.equal(colorForGroupId('AA'), colorForGroupId('AA'), 'two-letter ids are stable');
  assert.match(colorForGroupId('ZZ'), /^#[0-9a-f]{6}$/);
});

// ── Round math / rest ─────────────────────────────────────────────────────────

test('rest waits for every member: no rest after A1/B1, rest after C1', () => {
  const week = circuitWeek();
  tick(week, 'Bench', 0);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 0 }), false, 'A1: partners are behind');
  tick(week, 'Row', 0);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Row', { setIndex: 0 }), false, 'B1: C is still behind');
  tick(week, 'Curl', 0);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Curl', { setIndex: 0 }), true, 'C1 completes round 1');

  tick(week, 'Bench', 1);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 1 }), false, 'A2 waits again');
  tick(week, 'Row', 1);
  tick(week, 'Curl', 1);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Curl', { setIndex: 1 }), true, 'C2 completes round 2');
});

test('the ticked index counts as complete even before the DOM commit', () => {
  const week = circuitWeek();
  tick(week, 'Row', 0);
  tick(week, 'Curl', 0);
  // Bench[0].c is still false in state; setIndex 0 is the manual tick.
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 0 }), true);
});

test('an uneven circuit rests once the shorter member has caught up', () => {
  const week = circuitWeek();
  week.lifts.mon.Row = [{ w: '50', r: '10', c: false }, { w: '50', r: '10', c: false }];
  week.lifts.mon.Curl = [{ w: '15', r: '12', c: false }, { w: '15', r: '12', c: false }];
  tick(week, 'Row', 0);
  tick(week, 'Curl', 0);
  tick(week, 'Bench', 0);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 0 }), true, 'round 1 complete');
  tick(week, 'Row', 1);
  tick(week, 'Curl', 1);
  tick(week, 'Bench', 1);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 1 }), true, 'round 2 complete');
  tick(week, 'Bench', 2);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 2 }), true,
    'the partners have no third row, so the round does not wait forever');
});

test('warm-up ticks keep the tier rest; drop ticks never rest', () => {
  const week = circuitWeek();
  week.lifts.mon.Bench[0].type = 'W';
  tick(week, 'Bench', 0);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 0 }), true,
    'a warm-up is not a circuit round and falls through to the warm-up tier');

  week.lifts.mon.Bench[1].type = 'D';
  tick(week, 'Bench', 1);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 1 }), false,
    'a drop set belongs to the set just done');
});

test('no group and a lone member keep the pre-circuit behaviour', () => {
  const week = circuitWeek();
  tick(week, 'Later', 0);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Later', { setIndex: 0 }), true);
  delete week.liftMeta.mon.Row;
  delete week.liftMeta.mon.Curl;
  tick(week, 'Bench', 0);
  assert.equal(shouldRestAfterSet(week, 'mon', 'Bench', { setIndex: 0 }), true);
});

test('roundState derives per-member progress and group completion', () => {
  const week = circuitWeek();
  let state = roundState(week, 'mon', 'Row', { orderedNames: week.liftOrder.mon });
  assert.equal(state.groupId, 'A');
  assert.equal(state.ordinal, 2);
  assert.equal(state.done, 0);
  assert.equal(state.total, 3);
  assert.equal(state.doneMembers, 0);
  assert.equal(state.complete, false);

  for (const name of ['Bench', 'Row', 'Curl']) for (let i = 0; i < 3; i++) tick(week, name, i);
  state = roundState(week, 'mon', 'Row', { orderedNames: week.liftOrder.mon });
  assert.equal(state.done, 3);
  assert.equal(state.doneMembers, 3);
  assert.equal(state.complete, true);
  assert.deepEqual(state.members.map((member) => member.name), ['Bench', 'Row', 'Curl']);
});

// ── Routine / copy persistence ───────────────────────────────────────────────

function sessionWeek() {
  return {
    programId: null,
    dates: { mon: '2026-11-16' },
    lifts: {
      mon: {
        Bench: [{ w: '100', r: '5', c: true }, { w: '100', r: '5', c: true }],
        Row: [{ w: '80', r: '8', c: true }, { w: '80', r: '8', c: true }],
        Curl: [{ w: '15', r: '12', c: true }, { w: '15', r: '12', c: true }],
        Later: [{ w: '20', r: '10', c: true }],
      },
    },
    liftOrder: { mon: ['Bench', 'Row', 'Curl', 'Later'] },
    liftMeta: {
      mon: {
        Bench: { groupId: 'A' },
        Row: { groupId: 'A' },
        Curl: { groupId: 'A' },
        Later: {},
      },
    },
  };
}

test('a routine keeps circuit membership and a one-off restores it', () => {
  const routine = buildRoutineFromSession({ settings: {} }, sessionWeek(), 'mon', { name: 'Circuits' });
  assert.equal(routine.prescriptions.mon.Bench.groupId, 'A');
  assert.equal(routine.prescriptions.mon.Row.groupId, 'A');
  assert.equal(routine.prescriptions.mon.Curl.groupId, 'A');
  assert.equal(routine.prescriptions.mon.Later.groupId, undefined);

  const { sourceWeek, sourceDay } = routineSourceWeek(routine);
  assert.equal(sourceWeek.liftMeta.mon.Bench.groupId, 'A');
  assert.equal(sourceWeek.liftMeta.mon.Curl.groupId, 'A');

  const saved = { weeks: {}, settings: {} };
  const created = createOneOffStrengthSession(saved, {
    kind: 'copy', title: routine.name, sourceWeek, sourceDay,
    now: new Date('2026-11-18T12:00:00Z'), tz: 'UTC',
  });
  const week = saved.weeks[created.key];
  assert.equal(week.liftMeta[created.day].Bench.groupId, 'A');
  assert.equal(week.liftMeta[created.day].Row.groupId, 'A');
  assert.equal(week.liftMeta[created.day].Curl.groupId, 'A');
  assert.equal(week.liftMeta[created.day].Later, undefined);
});

test('Copy/Repeat carries pairs, and a narrowed copy drops a one-member tag', () => {
  const saved = { weeks: {}, settings: {} };
  const source = sessionWeek();
  delete source.lifts.mon.Curl; // the partner is no longer in this session
  const created = createOneOffStrengthSession(saved, {
    kind: 'copy', title: 'Copy', sourceWeek: source, sourceDay: 'mon',
    now: new Date('2026-11-18T12:00:00Z'), tz: 'UTC',
  });
  const week = saved.weeks[created.key];
  assert.equal(week.liftMeta[created.day].Bench.groupId, 'A');
  assert.equal(week.liftMeta[created.day].Row.groupId, 'A');
  assert.equal(week.liftMeta[created.day].Curl, undefined, 'a deleted lift has no meta');
  assert.deepEqual(week.liftMeta[created.day].Later, {}, 'a live lift keeps its (empty) session meta');

  const narrowed = sessionWeek();
  delete narrowed.lifts.mon.Row;
  delete narrowed.lifts.mon.Curl;
  const narrowedRoutine = buildRoutineFromSession({ settings: {} }, narrowed, 'mon', { name: 'Alone' });
  assert.equal(narrowedRoutine.prescriptions.mon.Bench.groupId, undefined,
    'a routine cannot persist a lone circuit member');
});

test('routine import rejects a malformed group id', () => {
  const routine = buildRoutineFromSession({ settings: {} }, sessionWeek(), 'mon', { name: 'Circuits' });
  assert.equal(isValidRoutine(routine), true);

  const bad = JSON.parse(JSON.stringify(routine));
  bad.prescriptions.mon.Bench.groupId = '[';
  assert.equal(isValidRoutine(bad), false);
  const badNumber = JSON.parse(JSON.stringify(routine));
  badNumber.prescriptions.mon.Row.groupId = 1;
  assert.equal(isValidRoutine(badNumber), false);
  const long = JSON.parse(JSON.stringify(routine));
  long.prescriptions.mon.Bench.groupId = 'AAA';
  assert.equal(isValidRoutine(long), false);

  assert.deepEqual(sanitizeImportedState({ routines: [routine, bad] }).routines.map((r) => r.id), [routine.id]);
});
