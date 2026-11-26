// =============================================================================
// H6a — best-efforts presenter: measured vs estimated, always labelled
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBestEfforts, buildRaceEstimates } from '../js/analytics/best-efforts.js';
import { bestEffortsHTML } from '../js/analytics/views/view-best-efforts.js';

const laps = (times) => times.map((time, index) => ({ lap: index + 1, dist: 1, time }));
const run = (localDate, dist, time, splits) => ({ sessionId: `s_${localDate}`, source: 'gps', localDate, dist: String(dist), time, splits });
const stateWith = (runs) => ({ weeks: { '1': { dates: { mon: runs[0].localDate }, runSessions: { mon: runs } } } });

function models() {
  const efforts = buildBestEfforts(stateWith([run('2026-11-20', 5, '25:00', laps([300, 300, 300, 300, 300]))]));
  return { efforts, estimates: buildRaceEstimates(efforts) };
}

test('measured efforts show time, pace and date', () => {
  const { efforts, estimates } = models();
  const html = bestEffortsHTML(efforts, estimates);
  assert.match(html, /Best efforts/);
  assert.match(html, /from recorded splits/);
  assert.match(html, /1 km/);
  assert.match(html, /25:00/);
  assert.match(html, /5:00 \/km/);
  assert.match(html, /10 km/);
  assert.match(html, /not recorded/);
});

test('race times are marked estimates and name their basis', () => {
  const { efforts, estimates } = models();
  const html = bestEffortsHTML(efforts, estimates);
  assert.match(html, /Race estimates <b>\(est\.\)<\/b>/);
  assert.match(html, /52:07/);
  assert.match(html, /est\./);
  assert.match(html, /measured/);
  assert.match(html, /Riegel estimate from your 5 km best/);
  assert.match(html, /A guide, not a prediction/);
});

test('no measured 3 km effort leaves the estimate block out', () => {
  const efforts = buildBestEfforts(stateWith([run('2026-11-20', 2, '10:00', laps([300, 300]))]));
  const html = bestEffortsHTML(efforts, buildRaceEstimates(efforts));
  assert.doesNotMatch(html, /Race estimates/);
  assert.match(html, /Best efforts/);
});

test('no splits states the reason instead of inventing a best', () => {
  const efforts = buildBestEfforts(stateWith([run('2026-11-20', 5, '25:00', [])]));
  const html = bestEffortsHTML(efforts, buildRaceEstimates(efforts));
  assert.match(html, /recorded splits/);
  assert.match(html, /not recorded/);
  assert.doesNotMatch(html, /Race estimates/);
});
