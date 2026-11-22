import test from 'node:test';
import assert from 'node:assert/strict';
import { coverGlyphFor, renderProgramCard } from '../js/programs/program-card.js';

test('cover glyphs separate hyrox, functional, tactical and triathlon', () => {
  assert.equal(coverGlyphFor({ category: 'hyrox' }), 'trophy');
  assert.equal(coverGlyphFor({ category: 'functional' }), 'activity');
  assert.equal(coverGlyphFor({ category: 'tactical' }), 'gauge');
  assert.equal(coverGlyphFor({ category: 'triathlon' }), 'activity');
  assert.equal(coverGlyphFor({ category: 'conditioning' }), 'flame');
  // Hybrid/athletic work keeps its own bolt; it must not fall back to the flame.
  assert.equal(coverGlyphFor({ category: 'hybrid' }), 'bolt');
});

test('tag-only catalogue entries resolve the same modality marks', () => {
  assert.equal(coverGlyphFor({ tags: ['hyrox-wod'] }), 'trophy');
  assert.equal(coverGlyphFor({ tags: ['functional-fitness'] }), 'activity');
  assert.equal(coverGlyphFor({ tags: ['conditioning'] }), 'flame');
  assert.equal(coverGlyphFor({ tags: ['triathlon'] }), 'activity');
  assert.equal(coverGlyphFor({ tags: ['half-marathon'] }), 'run');
});

test('tile cards keep name and reason, and drop the browse clutter', () => {
  const html = renderProgramCard({
    id: 'tile_plan', name: 'Hybrid Builder', category: 'hybrid',
    difficulty: 'intermediate', accentColor: '#22d3ee', coverGradient: ['#0e7490', '#0d1b2a'],
    durationWeeks: 8, sessionsPerWeek: 4, popularity: 50,
  }, 'tile', 'Matches your hybrid goal');

  assert.match(html, /prog-card--tile/);
  assert.match(html, /Hybrid Builder/);
  assert.match(html, /Matches your hybrid goal/);
  assert.match(html, /prog-card-bookmark/);
  assert.match(html, /linear-gradient\(155deg, #22d3ee, #0d1b2a\)/, 'the cover uses the accent tint');
  assert.doesNotMatch(html, /prog-card-meta/, 'no duration/level meta on a tile');
  assert.doesNotMatch(html, /prog-card-diff/, 'no difficulty dots on a tile');
  assert.doesNotMatch(html, /prog-card-badges/, 'no badge stack on a tile');
});
