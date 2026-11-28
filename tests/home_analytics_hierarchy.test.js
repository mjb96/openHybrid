import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexHTML = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('This week leads Home, then the compact Today card', () => {
  const weekAt = indexHTML.indexOf('id="homeWeekStrip"');
  const todayAt = indexHTML.indexOf('id="homeTodayCard"');
  const weekEnd = indexHTML.indexOf('</section>', weekAt);
  assert.ok(weekAt > 0, 'Home renders the week strip');
  assert.ok(todayAt > weekAt, 'Today follows the week strip');
  assert.ok(todayAt < weekEnd, 'Today is part of the same week surface');
  const insightAt = indexHTML.indexOf('id="homeInsightCard"');
  assert.ok(insightAt > todayAt && insightAt < weekEnd, 'the coach line is part of Today\'s surface');
  assert.match(indexHTML, /id="homeInsightCard" data-home-card="insight"[^>]*hidden/);
  assert.match(indexHTML, /class="home-week__rail" data-home-card="weekStrip"/);
  assert.match(indexHTML, /Pinned: the strip may be hidden in Customize/);
  assert.match(indexHTML, /id="homeQuickActions"/);
  assert.doesNotMatch(indexHTML, /id="strengthBarChart"/);
  assert.doesNotMatch(indexHTML, /id="runBarChart"/);
  assert.doesNotMatch(indexHTML, />In Focus</);
});

test('Home removes the repeated At-a-Glance grid', () => {
  assert.doesNotMatch(indexHTML, /id="glanceGrid"/);
  assert.doesNotMatch(indexHTML, />At a Glance</);
});

test('the Home header leads with the calendar day, not a program week', () => {
  const h1 = indexHTML.match(/<h1[^>]*id="homeWeekBlockIndicator"[^>]*>([\s\S]*?)<\/h1>/);
  assert.ok(h1, 'Home still renders the headline element');
  // The static markup must never claim a week: the chip below carries it, and
  // the first render replaces this text with the calendar day.
  const inner = (h1[1] || '').trim();
  assert.ok(inner.length > 0, 'the headline has a non-empty fallback');
  assert.doesNotMatch(h1[0], />Week /);
  assert.doesNotMatch(inner, /^Week \d/);
});

test('Home offers one Start, not a competing Workout quick action', () => {
  const quickAt = indexHTML.indexOf('id="homeQuickActions"');
  assert.ok(quickAt > 0, 'Home renders the quick-action row');
  const quickBlock = indexHTML.slice(quickAt, indexHTML.indexOf('</div>', quickAt));
  assert.doesNotMatch(quickBlock, /open-quick-start/);
  // HM5: Run moved to Train (where Quick start lives); the three Home actions
  // are deliberately Check-in · Empty workout · History. The old Weight tile
  // only navigated to the same bodyweight view the card below already opens;
  // the daily check-in (a readiness input) had no entry point on a training day.
  assert.match(quickBlock, /id="qaCheckin"[^>]*data-action="open-wellness-checkin"/);
  assert.match(quickBlock, /data-module="recovery"/);
  assert.match(quickBlock, /data-action="start-empty-workout"/);
  assert.doesNotMatch(quickBlock, /data-action="open-run-logger"/);
  assert.doesNotMatch(quickBlock, /data-context="bodyweight"/);
  assert.match(quickBlock, /class="home-quick-btn btn-history-link"/);
});

test('the retired tile catalogue cannot come back', async () => {
  const { existsSync } = await import('node:fs');
  assert.equal(existsSync(new URL('../js/dashboard.js', import.meta.url)), false);
});
