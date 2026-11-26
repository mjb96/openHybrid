// =============================================================================
// CANONICAL WEIGHT STORAGE (ST6)
//
// Every weight in appState is KILOGRAMS. `settings.weightUnit` is a display
// preference, so changing it rewrites nothing. These tests pin the three
// boundaries that make that safe:
//   • the one-time v17→v18 migration (exact, idempotent, display unit kept),
//   • display formatting (kg → the athlete's unit, once),
//   • input persistence (the athlete's unit → kg, once),
// plus the exports that used to be unit-ambiguous.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { migrateState, CURRENT_SCHEMA_VERSION } from '../js/state/migrations.js';
import {
  canonicalWeightString,
  displayWeightString,
  fromCanonicalWeight,
  toCanonicalWeight,
} from '../js/metrics/weight-unit.js';
import { formatWeight, formatVolume } from '../js/analytics/utils.js';
import { buildSetRow } from '../js/templates.js';
import { suggestProgression } from '../js/engine.js';
import { buildBodyweightCsv, buildTrainingCsv } from '../js/portability/csv-export.js';
import { parseBodyCsv } from '../js/portability/import-body-csv.js';
import { parseWorkoutCsv } from '../js/portability/import-workout-csv.js';

const KG = (lb) => toCanonicalWeight(lb, 'lbs');

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
test('display ↔ storage converts exactly once', () => {
  assert.equal(toCanonicalWeight(100, 'lbs'), 45.36);
  assert.equal(toCanonicalWeight(100, 'kg'), 100);
  assert.equal(Math.round(fromCanonicalWeight(45.36, 'lbs')), 100);
  assert.equal(displayWeightString(45.36, 'lbs'), '100');
  assert.equal(displayWeightString(100, 'kg'), '100');
  assert.equal(displayWeightString(1.25, 'kg'), '1.25', 'kilogram micro-plates keep two decimals');
  assert.equal(displayWeightString(0, 'kg'), '0');
  assert.equal(displayWeightString('', 'kg'), '');
  assert.equal(canonicalWeightString('100', 'lbs'), '45.36');
  assert.equal(canonicalWeightString('', 'lbs'), '', 'a blank row is not 0 kg');
  assert.equal(canonicalWeightString('abc', 'kg'), '');
});

test('formatWeight and formatVolume convert canonical kilograms', () => {
  assert.equal(formatWeight(100, 'kg'), '100 kg');
  assert.equal(formatWeight(100, 'lbs'), '220 lbs');
  assert.equal(formatVolume(500, 'kg'), '500 kg');
  assert.equal(formatVolume(500, 'lbs'), '1,102 lb');
});

// ---------------------------------------------------------------------------
// migration v17 → v18
// ---------------------------------------------------------------------------
function lbsState() {
  return {
    schemaVersion: 17,
    settings: {
      weightUnit: 'lbs',
      defaultBodyWeight: 200,
      targetWeight: 180,
      progressionIncrement: 5,
      rateGoal: { dir: 'lose', by: 'w', lo: 0.5, hi: 1 },
    },
    bodyWeightLog: [{ date: '2026-11-01', weight: 200 }],
    weeks: {
      '1': {
        lifts: { mon: { Squat: [{ w: '135', r: '5', tw: '135', c: true }] } },
        bodyWeight: { mon: '200' },
      },
      'arch:old:1': { lifts: { mon: { 'Barbell Row': [{ w: '100', r: '5', c: true }] } } },
    },
    prGoals: { Squat: 315 },
    routines: [{ prescriptions: { mon: { Squat: { weight: 225 } } } }],
    customPrograms: [{ prescriptions: { tue: { Bench: { weight: 135 } } } }],
  };
}

test('the migration converts an lbs state once and keeps the display preference', () => {
  const state = migrateState(lbsState());
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(state.unitBasis, 'kg');
  assert.equal(state.settings.weightUnit, 'lbs', 'the athlete still reads pounds');
  assert.equal(state.weeks['1'].lifts.mon.Squat[0].w, String(KG(135)));
  assert.equal(state.weeks['1'].lifts.mon.Squat[0].tw, String(KG(135)), 'the prescribed target weight converts too');
  assert.equal(state.weeks['arch:old:1'].lifts.mon['Barbell Row'][0].w, String(KG(100)), 'archived weeks convert too');
  assert.equal(state.weeks['1'].bodyWeight.mon, String(KG(200)));
  assert.equal(state.bodyWeightLog[0].weight, KG(200));
  assert.equal(state.settings.defaultBodyWeight, KG(200));
  assert.equal(state.settings.targetWeight, KG(180));
  assert.equal(state.settings.progressionIncrement, KG(5), 'the step is canonical too');
  assert.equal(state.prGoals.Squat, KG(315));
  assert.equal(state.routines[0].prescriptions.mon.Squat.weight, KG(225));
  assert.equal(state.customPrograms[0].prescriptions.tue.Bench.weight, KG(135));
  // Display round-trip: the athlete still sees the numbers they typed.
  assert.equal(displayWeightString(state.weeks['1'].lifts.mon.Squat[0].w, 'lbs'), '135');
});

test('the migration is idempotent and a kg state is untouched', () => {
  const kg = {
    schemaVersion: 17,
    settings: { weightUnit: 'kg', progressionIncrement: 2.5 },
    weeks: { '1': { lifts: { mon: { Squat: [{ w: '100', r: '5', c: true }] } } } },
  };
  const migrated = migrateState(kg);
  assert.equal(migrated.weeks['1'].lifts.mon.Squat[0].w, '100');
  assert.equal(migrated.unitBasis, 'kg');

  // A second pass must not convert again (the marker is what guards it).
  const again = migrateState({ ...migrated, schemaVersion: 17 });
  assert.equal(again.weeks['1'].lifts.mon.Squat[0].w, '100');
});

// ---------------------------------------------------------------------------
// the render boundary
// ---------------------------------------------------------------------------
test('a set row shows display units while the stored value stays kilograms', () => {
  const html = buildSetRow(
    { w: String(KG(135)), r: '5', c: true },
    0,
    'Squat',
    { w: String(KG(130)), r: '5' },
    'lbs',
    'Squat',
    KG(200),
    null,
    null,
    { w: String(KG(130)), r: '5' },
  );
  assert.match(html, /value="135"/, 'the weight field shows pounds');
  assert.match(html, /data-prev-w="130"/, 'the previous column is display units, so the comparison is like-for-like');
  // The bodyweight display for a bodyweight lift is converted as well.
  assert.match(html, /data-ghost-default="130"/);
});

// ---------------------------------------------------------------------------
// the engine boundary
// ---------------------------------------------------------------------------
test('a progression suggestion is display-facing, and its rationale matches', () => {
  const lastWeek = [{ w: String(KG(100)), r: '5', c: true, rpe: '7' }];
  const prog = suggestProgression(lastWeek, 5, {
    increment: KG(5),
    unit: 'lbs',
    show: (kg) => displayWeightString(kg, 'lbs'),
  });
  assert.equal(prog.action, 'load-up');
  assert.equal(displayWeightString(prog.weight, 'lbs'), '105');
  assert.match(prog.rationale, /105/, 'the copy names pounds, not kilograms');
});

// ---------------------------------------------------------------------------
// exports: one unambiguous unit
// ---------------------------------------------------------------------------
test('the training CSV declares canonical kilograms and re-imports exactly', () => {
  const state = {
    settings: { weightUnit: 'lbs' },
    weeks: {
      '1': {
        dates: { mon: '2026-11-02' },
        lifts: { mon: { 'Back Squat': [{ w: '100', r: '5', c: true }] } },
        bodyWeight: { mon: '80' },
      },
    },
  };
  const csv = buildTrainingCsv(state, ['mon', 'tue']);
  assert.match(csv, /"WeightKg"/);
  assert.match(csv, /"BodyWeightKg"/);
  const parsed = parseWorkoutCsv(csv, { unit: 'kg' });
  const entry = parsed.sessions[0].entries['Back Squat'][0];
  assert.equal(Number(entry.w), 100, 'a kilogram file imports as kilograms');
});

test('the bodyweight CSV declares kilograms, so a cross-unit re-import is exact', () => {
  const csv = buildBodyweightCsv({ bodyWeightLog: [{ date: '2026-11-01', weight: 100 }] });
  assert.match(csv, /^"Date","WeightKg"/);
  const parsed = parseBodyCsv(csv, { unit: 'kg' });
  assert.equal(parsed.entries[0].weight, 100);
});

// ---------------------------------------------------------------------------
// static guard: the boundary helpers must be imported where they are used
// ---------------------------------------------------------------------------
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function importedNames(source) {
  const names = new Set();
  const re = /import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g;
  let match;
  while ((match = re.exec(source))) {
    const clause = match[1];
    const braces = clause.match(/\{([\s\S]*?)\}/);
    if (braces) {
      for (const part of braces[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) names.add(name);
      }
    }
    const def = clause.replace(/\{[\s\S]*?\}/, '').replace(/,/g, ' ').trim();
    for (const name of def.split(/\s+/)) if (name && name !== '*') names.add(name);
  }
  return names;
}

/** Drop block and line comments so a mention in prose cannot count as a use. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

test('every boundary helper is imported where it is used', () => {
  const helpers = [
    'fromCanonicalWeight', 'toCanonicalWeight', 'displayWeightString',
    'canonicalWeightString', 'storedWeightFromInput', 'displayWeight',
  ];
  const definitions = new Set(['js/metrics/weight-unit.js', 'js/workout/units.js']);
  const missing = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(abs); continue; }
      if (!entry.name.endsWith('.js')) continue;
      const rel = path.relative(ROOT, abs).split(path.sep).join('/');
      if (definitions.has(rel)) continue;
      const source = readFileSync(abs, 'utf8');
      const body = stripComments(source);
      const imported = importedNames(source);
      for (const helper of helpers) {
        if (new RegExp(`\\b${helper}\\b`).test(body) && !imported.has(helper)) missing.push(`${rel}: ${helper}`);
      }
    }
  };
  walk(path.join(ROOT, 'js'));
  assert.deepEqual(missing, [], `used without import: ${missing.join(', ')}`);
});
