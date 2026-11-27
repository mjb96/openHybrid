// =============================================================================
// CODEQL MODEL PACK
//
// `js/xss-through-dom` cannot know that openHybrid's own escapers neutralise
// HTML, so it follows an athlete-typed name from the input all the way into
// `innerHTML`. The model pack under `.github/codeql/extensions` declares the two
// boundaries; deleting or weakening it silently re-breaks the security check, so
// the pack is pinned here.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const PACK = '.github/codeql/extensions/openhybrid-js-models';

test('the model pack targets the JavaScript analysis and loads its models', () => {
  const pack = read(`${PACK}/codeql-pack.yml`);
  assert.match(pack, /^library: true$/m, 'a model pack must be a library pack');
  assert.match(pack, /codeql\/javascript-all:/, 'the pack must target the JS CodeQL pack');
  assert.match(pack, /dataExtensions:/, 'the pack must declare its data extensions');
  assert.match(pack, /models\/\*\*\/\*\.yml/, 'the data-extension glob must cover models/');
});

test('both HTML boundaries are declared as html-injection barriers', () => {
  const model = read(`${PACK}/models/html-escapers.model.yml`);
  assert.match(model, /extensible: barrierModel/);
  assert.match(model, /html-injection/);
  // The escaper used on the way into markup.
  assert.match(model, /file:js\/util\.js", "Member\[escapeHtml\]\.ReturnValue"/);
  // The boundary that stops a typed custom name entering state.
  assert.match(model, /file:js\/exercises\/catalog\.js", "Member\[sanitizeExerciseName\]\.ReturnValue"/);
});

test('the barriers are genuinely escaping functions, not arbitrary helpers', () => {
  const util = read('js/util.js');
  assert.match(util, /escapeHtml[^=]*=\s*\(str\)\s*=>\s*String\(str\)\.replace\(\/\[&<>"'\]/,
    'escapeHtml must escape & < > " and the single quote');

  const catalog = read('js/exercises/catalog.js');
  assert.match(catalog, /export function sanitizeExerciseName/,
    'sanitizeExerciseName must remain a real exported function');
  assert.match(catalog, /\.replace\(\/\[<>\]\/g, ''\)/, 'it must strip angle brackets');
  assert.match(catalog, /\.replace\(\/"\/g/, 'it must neutralise double quotes');
  assert.match(catalog, /\.replace\(\/\'\/g/, 'it must neutralise single quotes');
  assert.match(catalog, /\.replace\(\/\\s\*&\\s\*\/g, ' and '\)/, 'it must neutralise ampersands');
});

test('CodeQL runs with the repository config, and the config does not ignore the models', () => {
  const workflow = read('.github/workflows/codeql.yml');
  assert.match(workflow, /config-file: \.\/\.github\/codeql\/codeql-config\.yml/);

  const config = read('.github/codeql/codeql-config.yml');
  assert.doesNotMatch(config, /\.github/, 'the CodeQL config must not ignore its own model pack');
});
