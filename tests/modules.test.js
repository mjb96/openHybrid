// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODULES,
  moduleEnabled,
  setModuleEnabled,
  applyModuleVisibility,
  hybridTrainingEnabled,
  setHybridTraining,
} from '../js/modules.js';

test('all modules default on', () => {
  const state = { settings: {} };
  for (const m of MODULES) assert.equal(moduleEnabled(state, m.id), true);
  assert.equal(moduleEnabled({}, 'running'), true);
});

test('toggling a module persists false and leaves the rest alone', () => {
  const state = { settings: {} };
  setModuleEnabled(state, 'running', false);
  assert.equal(moduleEnabled(state, 'running'), false);
  assert.equal(moduleEnabled(state, 'fasting'), true);
  setModuleEnabled(state, 'fasting', false);
  setModuleEnabled(state, 'running', true);
  assert.deepEqual(state.settings.modules, { running: true, fasting: false });
});

test('visibility publishes one data attribute per module', () => {
  const root = { dataset: {} };
  const state = { settings: { modules: { running: false, health: false } } };
  applyModuleVisibility(state, root);
  assert.equal(root.dataset.moduleRunning, 'off');
  assert.equal(root.dataset.moduleFasting, 'on');
  assert.equal(root.dataset.moduleHealth, 'off');
  assert.equal(root.dataset.moduleRecovery, 'on');
});

test('hybrid training defaults on and is a presentation preference, not a module', () => {
  // Absent means on: every install predates the preference.
  assert.equal(hybridTrainingEnabled({ settings: {} }), true);
  assert.equal(hybridTrainingEnabled({}), true);
  assert.equal(hybridTrainingEnabled({ settings: { hybridTraining: true } }), true);
  assert.equal(hybridTrainingEnabled({ settings: { hybridTraining: false } }), false);
  // It is NOT one of the four feature modules, and it never rewrites them.
  assert.ok(!MODULES.some((m) => m.id === 'hybrid'));
  const state = { settings: { modules: { running: false, fasting: true } } };
  setHybridTraining(state, false);
  assert.equal(state.settings.hybridTraining, false);
  assert.deepEqual(state.settings.modules, { running: false, fasting: true });
});

test('visibility publishes the hybrid attribute without touching module attributes', () => {
  const root = { dataset: {} };
  const state = { settings: { hybridTraining: false, modules: { running: true } } };
  applyModuleVisibility(state, root);
  assert.equal(root.dataset.hybrid, 'off');
  assert.equal(root.dataset.moduleRunning, 'on');
  applyModuleVisibility({ settings: { hybridTraining: true } }, root);
  assert.equal(root.dataset.hybrid, 'on');
});
