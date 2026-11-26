// ==========================================
// EDITOR ↔ PRESCRIPTION SYNC
// The editor's structural edits must carry the athlete's per-exercise targets:
// a swap that loses the target silently resets 4×6 to the week's 3×10.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  copyProgramDay, makeProgramDayRest, previewProgramWeek, removeProgramExercise,
  replaceProgramExercise,
} from '../js/programs/editor-model.js';
import { setLiftTarget, targetFor } from '../js/programs/editor/prescriptions.js';

function program() {
  return {
    id: 'prog_editor',
    totalWeeks: 4,
    days: {
      mon: { title: 'Upper', desc: '', runs: 'Rest', lifts: ['Bench Press', 'Barbell Row'] },
      tue: { title: 'Rest', desc: '', runs: 'Rest', lifts: [] },
    },
    weeklyVolModifiers: {
      1: { sets: 3, reps: '8', intensityLabel: 'Build' },
      4: { sets: 2, reps: '8', intensityLabel: 'Deload week' },
    },
  };
}

test('replacing an exercise moves its target to the new name', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6-8', restSec: 150 });
  replaceProgramExercise(p.days.mon, 0, 'Dumbbell Bench Press', { program: p, dayKey: 'mon' });
  assert.equal(targetFor(p, 'mon', 'Bench Press'), null);
  assert.deepEqual(targetFor(p, 'mon', 'Dumbbell Bench Press'), { sets: 4, reps: '6-8', restSec: 150 });
});

test('removing an exercise removes its target', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Barbell Row', { sets: 3, reps: '10' });
  removeProgramExercise(p.days.mon, 1, { program: p, dayKey: 'mon' });
  assert.equal(targetFor(p, 'mon', 'Barbell Row'), null);
});

test('turning a day into rest clears its targets', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6-8' });
  makeProgramDayRest(p.days.mon, { program: p, dayKey: 'mon' });
  assert.equal(p.prescriptions?.mon, undefined);
});

test('copying a day copies its targets and drops the target of the replaced day', () => {
  const p = program();
  p.days.wed = { title: 'Volume', desc: '', runs: 'Rest', lifts: ['Incline Press'] };
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6-8' });
  setLiftTarget(p, 'wed', 'Incline Press', { sets: 3, reps: '12' });
  copyProgramDay(p, 'mon', 'wed');
  assert.deepEqual(targetFor(p, 'wed', 'Bench Press'), { sets: 4, reps: '6-8' });
  assert.equal(targetFor(p, 'wed', 'Incline Press'), null, 'the day was replaced, so its old target is gone');
});

test('the editor preview resolves prescriptions and the deload through liftTarget', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6-8' });
  const week1 = previewProgramWeek(p, '1');
  const bench1 = week1.find((day) => day.key === 'mon').lifts.find((lift) => lift.name === 'Bench Press');
  assert.deepEqual({ sets: bench1.sets, reps: bench1.reps }, { sets: 4, reps: '6-8' });

  const week4 = previewProgramWeek(p, '4');
  const bench4 = week4.find((day) => day.key === 'mon').lifts.find((lift) => lift.name === 'Bench Press');
  assert.deepEqual({ sets: bench4.sets, reps: bench4.reps }, { sets: 2, reps: '6-8' }, 'the deload halves the prescribed sets');

  const row = week1.find((day) => day.key === 'mon').lifts.find((lift) => lift.name === 'Barbell Row');
  assert.deepEqual({ sets: row.sets, reps: row.reps }, { sets: 3, reps: '8' }, 'a lift without a target keeps the week modifier');
});
