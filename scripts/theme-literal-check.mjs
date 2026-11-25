// =============================================================================
// THEME LITERAL GUARD (ratchet)
//
// New colour literals outside the token files are a regression: they bypass the
// semantic layer and cannot follow a theme. This is a ratchet until A3 finishes
// the legacy migration: existing counts are the ceiling, any increase fails.
// Regenerate deliberately with: node scripts/theme-literal-check.mjs --update
// =============================================================================
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'docs/audit/theme-literal-baseline.json');
const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
const SKIP = new Set([
  'css/tokens.css',
  'js/theme/tokens.js',
  'css/brand-consistency.css', // brand primitives still carry the approved palette raw values
]);
const roots = ['css', 'js', 'index.html'];
function files() {
  const out = [];
  for (const root of roots) {
    const abs = path.join(ROOT, root);
    if (!existsSync(abs)) continue;
    if (root.endsWith('.html')) { out.push(root); continue; }
    for (const entry of readdirSync(abs, { withFileTypes: true, recursive: true })) {
      if (!entry.isFile()) continue;
      const rel = path.relative(ROOT, path.join(entry.parentPath || entry.path, entry.name));
      if (!/\.(css|js|mjs)$/.test(rel)) continue;
      if (rel.includes('vendor/') || rel.includes('/theme/tokens.')) continue;
      if (SKIP.has(rel)) continue;
      out.push(rel);
    }
  }
  return out.sort();
}
function counts() {
  const map = {};
  for (const file of files()) {
    const text = readFileSync(path.join(ROOT, file), 'utf8');
    const n = (text.match(COLOUR) || []).length;
    if (n) map[file] = n;
  }
  return map;
}
const current = counts();
if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`theme-literal-check: wrote ${Object.keys(current).length} file ceilings`);
  process.exit(0);
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const failures = [];
for (const [file, n] of Object.entries(current)) {
  const max = baseline[file] ?? 0;
  if (n > max) failures.push(`${file}: ${n} literals (ceiling ${max})`);
}
if (failures.length) {
  console.error('theme-literal-check: new colour literals outside the token layer:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`theme-literal-check: ${Object.values(current).reduce((a, b) => a + b, 0)} legacy literals, no file above its ceiling`);
