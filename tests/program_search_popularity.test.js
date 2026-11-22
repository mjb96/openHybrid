import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAM_CATALOG } from '../js/programs/catalog.js';
import { searchPrograms } from '../js/programs/search.js';

// Custom/imported plans do not carry the catalogue's `popularity` field. The
// score used to become NaN and the plan silently fell out of search results.
test('a program without popularity still scores and stays searchable', () => {
  const custom = {
    id: 'custom_search_probe', name: 'Bench Probe Block', category: 'strength',
    goal: 'strength', description: 'A custom block', tags: [], goals: [],
  };
  PROGRAM_CATALOG.push(custom);
  try {
    const results = searchPrograms('bench probe block');
    assert.ok(results.includes(custom), 'a plan with no popularity must not be dropped');
  } finally {
    const index = PROGRAM_CATALOG.indexOf(custom);
    if (index !== -1) PROGRAM_CATALOG.splice(index, 1);
  }
});
