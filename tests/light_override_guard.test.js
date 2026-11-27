// =============================================================================
// LIGHT OVERRIDE GUARD (ratchet)
//
// `html[data-theme="light"] .thing { color: #d97706 }` is the exact shape of
// every light-mode contrast defect the audit found: a hand-picked mid-tone that
// bypasses the semantic layer and cannot be checked against the surface it
// lands on. `#d97706` measured 3.19:1; `rgba(0,0,0,.35)` measured 2.43:1.
//
// New colour declarations inside a light override must be `var(--token)`,
// `color-mix()` over tokens, or a keyword. Existing ones are a ceiling that may
// only fall — adopting a token for one of them lowers the count for free.
//
// Values are NOT rewritten automatically: migrating a legacy override to a
// token changes the rendered colour, so each one needs the audit to confirm it.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const BASELINE = JSON.parse(readFileSync(new URL('docs/audit/light-override-baseline.json', ROOT), 'utf8'));
const ALLOWED = /^(var\(|color-mix\(|inherit$|currentColor$|transparent$|none$)/i;

function counts() {
  const out = {};
  const files = readdirSync(new URL('css/', ROOT)).filter((name) => name.endsWith('.css'));
  for (const name of files) {
    const text = readFileSync(new URL(`css/${name}`, ROOT), 'utf8');
    const block = /html\[data-theme="light"\][^{]*\{([^}]*)\}/g;
    let found = 0;
    let match;
    while ((match = block.exec(text))) {
      for (const declaration of match[1].split(';')) {
        const colon = declaration.indexOf(':');
        if (colon < 0) continue;
        const property = declaration.slice(0, colon).trim();
        // Only paint declarations. `border-color` etc. are boundaries, not text.
        if (!['color', 'fill', 'stroke'].includes(property)) continue;
        const value = declaration.slice(colon + 1).trim();
        if (!value || ALLOWED.test(value)) continue;
        found += 1;
      }
    }
    if (found) out[`css/${name}`] = found;
  }
  return out;
}

test('no new raw colour inside a light-theme override', () => {
  const current = counts();
  const growth = [];
  for (const [file, count] of Object.entries(current)) {
    const ceiling = BASELINE[file] ?? 0;
    if (count > ceiling) growth.push(`${file}: ${count} raw colour declarations (ceiling ${ceiling})`);
  }
  assert.deepEqual(growth, [], `use var(--token) or color-mix() over tokens:\n${growth.join('\n')}`);
});

test('the ratchet is not empty or stale', () => {
  // If every legacy override were migrated this baseline would be empty, which
  // is fine — but a baseline for a file that no longer exists means the guard
  // stopped watching it.
  assert.ok(Object.keys(BASELINE).length > 0, 'baseline should list the legacy files');
});
