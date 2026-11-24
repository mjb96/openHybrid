// @ts-check
// =============================================================================
// STARTER PROGRAM RECOMMENDER (js/onboarding/starter-programs.js)
//
// Pure, DOM-free. Ranks catalog programs for a brand-new user from the three
// onboarding self-reports — goal, experience level, available equipment — so the
// first program actually fits (a bodyweight beginner isn't handed an advanced
// barbell block); measurably upgrades the old
// goal-only static list, which ignored level and equipment entirely.
// =============================================================================
import { PROGRAM_CATALOG } from '../programs/catalog.js';

const GOAL_CATEGORIES = {
  strength:  ['strength', 'powerlifting', 'hypertrophy', 'bodybuilding'],
  hybrid:    ['hybrid', 'functional', 'tactical', 'hyrox'],
  endurance: ['running', 'endurance', 'triathlon'],
};

const DIFF_ORDER = ['beginner', 'intermediate', 'advanced', 'elite'];
// Equipment tiers that are realistic without a full gym.
const LIGHT_TIERS = ['bodyweight', 'minimal', 'home', 'garage_gym'];

// Onboarding self-reports are coarse words; these are the planning targets they
// stand for. A program that asks for 6 days is a poor answer to "1–2 / wk".
const FREQUENCY_TARGET = Object.freeze({ low: 2, some: 4, high: 5, daily: 7 });

function frequencyScore(program, frequency) {
  const target = FREQUENCY_TARGET[frequency];
  const sessions = Number(program?.sessionsPerWeek);
  if (!target || !Number.isFinite(sessions) || sessions <= 0) return 0;
  const gap = Math.abs(sessions - target);
  if (gap === 0) return 25;
  if (gap === 1) return 12;
  if (gap >= 3) return -15;
  return 0;
}

function durationScore(program, minutes) {
  const chosen = Number(minutes);
  const range = program?.sessionDurationMinutes;
  if (!Number.isFinite(chosen) || !range) return 0;
  const min = Number(range.min);
  const max = Number(range.max);
  if (!Number.isFinite(min) && !Number.isFinite(max)) return 0;
  const low = Number.isFinite(min) ? min : max;
  const high = Number.isFinite(max) ? max : min;
  if (chosen >= low && chosen <= high) return 20;
  const gap = chosen < low ? low - chosen : chosen - high;
  if (gap <= 10) return 8;
  if (gap <= 20) return 0;
  return -12;
}

function difficultyScore(programDiff, level) {
  const a = DIFF_ORDER.indexOf(programDiff);
  const b = DIFF_ORDER.indexOf(level);
  if (a < 0 || b < 0) return 10;
  const gap = Math.abs(a - b);
  return gap === 0 ? 40 : gap === 1 ? 20 : 0;
}

function equipmentScore(programTier, userTier) {
  const light = userTier === 'home' || userTier === 'bodyweight' || userTier === 'minimal';
  if (!light) return 10; // a full gym covers everything
  // Light setups: reward light-tier programs, penalise gym-only ones.
  return LIGHT_TIERS.includes(programTier) ? 30 : -40;
}

/**
 * Ranked starter programs for the onboarding picker.
 *
 * Goal/level/equipment establish FIT; frequency and session length are real
 * constraints, not decoration — a 6-day 75-minute block is not a match for
 * "3–4 / wk, 30 minutes". They only adjust ranking inside the goal's category,
 * so they cannot hand an endurance runner a powerlifting plan.
 *
 * @param {{goal?:string, level?:string, equipmentTier?:string, frequency?:string, sessionMinutes?:number}} answers
 * @param {any[]} [catalog]
 * @param {number} [limit]
 * @returns {any[]} catalog entries, best first
 */
export function recommendStarterPrograms(answers = {}, catalog = PROGRAM_CATALOG, limit = 4) {
  const goal = answers.goal || 'hybrid';
  const level = answers.level || 'intermediate';
  const equipmentTier = answers.equipmentTier || 'gym';
  const cats = GOAL_CATEGORIES[goal] || GOAL_CATEGORIES.hybrid;

  const scored = catalog
    .filter(p => cats.includes(p.category) && !p.tags?.includes('hyrox-wod'))
    .map(p => ({
      p,
      score: difficultyScore(p.difficulty, level)
        + equipmentScore(p.equipmentTier, equipmentTier)
        + frequencyScore(p, answers.frequency)
        + durationScore(p, answers.sessionMinutes)
        + (Number(p.rating) || 0) * 2
        + (Number(p.popularity) || 0) / 20,
    }))
    .sort((a, b) => b.score - a.score);

  const picked = scored.slice(0, limit).map(s => s.p);

  // Safety net: never return an empty picker.
  if (picked.length === 0) {
    return catalog.filter(p => cats.includes(p.category)).slice(0, limit);
  }
  return picked;
}
