// @ts-check
// =============================================================================
// PLAN JSON (js/programs/program-json.js)
//
// A portable, human-readable plan file: openHybrid can export any program and
// import it on another device. Only plan content is included — no history,
// health data, account data or executable content. Imported plans become normal
// custom programs and never overwrite a catalog/shared program.
// =============================================================================

import { secureRandomSuffix } from '../util/secure-id.js';
import { isUnsafeRecordKey } from '../util.js';

export const PLAN_FILE_FORMAT = 'openhybrid-plan';
export const PLAN_FILE_VERSION = 1;

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const str = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const strings = (value) => (Array.isArray(value)
  ? value.filter((item) => typeof item === 'string' && item.trim() && !isUnsafeRecordKey(item.trim()))
  : []);

function normalizeDays(days) {
  const out = {};
  for (const day of DAY_KEYS) {
    const source = days?.[day] && typeof days[day] === 'object' ? days[day] : {};
    out[day] = {
      title: str(source.title, 'Rest'),
      badge: str(source.badge, source.title === 'Rest' ? 'Rest' : 'Training'),
      color: str(source.color, 'var(--text-muted)'),
      desc: str(source.desc),
      runs: str(source.runs, 'Rest'),
      lifts: strings(source.lifts),
    };
  }
  return out;
}

// Per-exercise targets. Additive in v1: an older app ignores the field, a newer
// app importing an older file simply gets the week modifier. Only lifts the day
// actually contains survive, and every value is bounded (an imported file must
// not be able to write 9,999 sets or a 500 kg starting load).
function normalizePrescriptions(source, days) {
  const out = {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return out;
  const int = (value, lo, hi, fallback) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
  };
  for (const day of DAY_KEYS) {
    const byLift = source[day];
    if (!byLift || typeof byLift !== 'object' || Array.isArray(byLift)) continue;
    const lifts = new Set(days?.[day]?.lifts || []);
    const entry = {};
    for (const [name, target] of Object.entries(byLift)) {
      if (!lifts.has(name) || !target || typeof target !== 'object') continue;
      const sets = int(target.sets, 1, 20, 0);
      if (!sets) continue;
      const item = { sets, reps: String(target.reps == null ? '8' : target.reps).trim().slice(0, 24) || '8' };
      const rest = int(target.restSec, 0, 900, 0);
      if (rest > 0) item.restSec = rest;
      const weight = Number(target.weight);
      if (Number.isFinite(weight) && weight > 0) item.weight = Math.min(500, Math.round(weight * 100) / 100);
      entry[name] = item;
    }
    if (Object.keys(entry).length) out[day] = entry;
  }
  return out;
}

function normalizeWeeks(source, totalWeeks) {
  const out = {};
  for (let week = 1; week <= totalWeeks; week++) {
    const mod = source?.[week] ?? source?.[String(week)] ?? {};
    out[String(week)] = {
      sets: mod?.sets ?? 3,
      reps: mod?.reps ?? 10,
      intensityLabel: str(mod?.intensityLabel),
      ...(mod?.deload ? { deload: true } : {}),
    };
  }
  return out;
}

function planContent(plan) {
  const totalWeeks = Math.max(1, Math.min(104, parseInt(String(plan?.totalWeeks), 10) || 12));
  const name = str(plan?.name).trim();
  if (!name) throw new Error('The plan has no name.');
  const sourceDays = plan?.days && typeof plan.days === 'object' ? plan.days : null;
  if (!sourceDays) throw new Error('The plan has no days.');
  const days = normalizeDays(sourceDays);
  const hasTraining = DAY_KEYS.some((day) => days[day].lifts.length || (days[day].runs && !/^rest$/i.test(days[day].runs)));
  if (!hasTraining) throw new Error('The plan has no training days.');
  return {
    name,
    totalWeeks,
    tagline: str(plan?.tagline),
    description: str(plan?.description),
    category: str(plan?.category, 'custom'),
    difficulty: str(plan?.difficulty, 'intermediate'),
    equipment: strings(plan?.equipment),
    goals: strings(plan?.goals),
    days,
    ...(Object.keys(normalizePrescriptions(plan?.prescriptions, days)).length
      ? { prescriptions: normalizePrescriptions(plan?.prescriptions, days) }
      : {}),
    weeklyVolModifiers: normalizeWeeks(plan?.weeklyVolModifiers, totalWeeks),
    progressionStyle: str(plan?.progressionStyle, 'double'),
    progressionModel: str(plan?.progressionModel),
    dossier: {
      creator: str(plan?.dossier?.creator, 'Imported'),
      focus: str(plan?.dossier?.focus, 'Imported plan'),
      philosophy: str(plan?.dossier?.philosophy, 'A plan imported into openHybrid.'),
    },
  };
}

/** Build the portable file for one resolved program. */
export function buildPlanFile(program) {
  return {
    format: PLAN_FILE_FORMAT,
    version: PLAN_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    plan: planContent(program),
  };
}

/** Parse a .json plan file (or a bare exported plan object). */
export function parsePlanFile(text) {
  let parsed;
  try { parsed = JSON.parse(String(text || '')); }
  catch { throw new Error('That file is not valid JSON.'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('That file is not a plan.');
  if (parsed.format && parsed.format !== PLAN_FILE_FORMAT) throw new Error('That JSON is not an openHybrid plan.');
  const plan = parsed.plan && typeof parsed.plan === 'object' ? parsed.plan : parsed;
  return planContent(plan);
}

/** Turn a parsed plan into a new editable custom program. */
export function createImportedProgram(plan, existingIds = []) {
  const ids = new Set(existingIds);
  let id;
  do {
    id = `prog_import_${Date.now().toString(36)}_${secureRandomSuffix(8)}`;
  } while (ids.has(id));
  return {
    ...plan,
    id,
    isPrimaryCustomization: false,
    sourceProgramId: null,
    importedAt: new Date().toISOString(),
  };
}

export function planFilename(program) {
  const safe = String(program?.name || 'openhybrid-plan')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'openhybrid-plan';
  return `${safe}.json`;
}
