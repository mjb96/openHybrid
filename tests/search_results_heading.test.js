import test from 'node:test';
import assert from 'node:assert/strict';
import { searchResultsHeading } from '../js/programs/search.js';

// The heading is written with innerHTML beside the result cards, so whatever the
// athlete typed must arrive as TEXT. Typing `<img src=x onerror=…>` into
// #progSearchInput used to execute because the raw query was interpolated.
test('a hostile search query cannot become markup in the results heading', () => {
  const heading = searchResultsHeading('<img src=x onerror="alert(1)">', 2);

  assert.match(heading, /&lt;img/, 'the query must be entity-escaped');
  assert.ok(!heading.includes('<img'), 'no raw <img> tag may survive');
  assert.ok(!heading.includes('onerror="'), 'no raw attribute value may survive');
  assert.equal(heading, '2 results for "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"');
});

test('a normal query still reads naturally above real results', () => {
  assert.equal(searchResultsHeading('bench', 3), '3 results for "bench"');
  assert.equal(searchResultsHeading('  bench  ', 1), '1 result for "bench"', 'surrounding space is trimmed');
});

test('the count is normalised so the heading can never carry junk', () => {
  assert.equal(searchResultsHeading('bench', 0), '0 results for "bench"');
  assert.equal(searchResultsHeading('bench', -4), '0 results for "bench"');
  assert.equal(searchResultsHeading('bench', '3'), '3 results for "bench"');
  assert.equal(searchResultsHeading('bench', Number.NaN), '0 results for "bench"');
});
