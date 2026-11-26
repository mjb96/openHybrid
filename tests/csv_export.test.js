import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBodyweightCsv, buildTrainingCsv, csvCell } from '../js/portability/csv-export.js';

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') {
      if (value.endsWith('\r')) value = value.slice(0, -1);
      row.push(value); rows.push(row); row = []; value = '';
    } else value += char;
  }
  return rows;
}

test('CSV includes archived activations, every same-day run, and escaped user text', () => {
  const note = 'Strong, "quoted"\nsecond line';
  const state = {
    weeks: {
      '2': {
        activationId: 'act_new', programId: 'new_program', dates: { mon: '2026-07-14' },
        lifts: { mon: { 'Back, Squat': [{ w: '100', r: '5', c: true }] } },
        notes: { mon: note },
      },
      'arch:act_old:1': {
        activationId: 'act_old', programId: 'old_program', dates: { mon: '2026-06-01' },
        runs: { mon: { sessionId: 'run_b', dist: '3', time: '18:00' } },
        runSessions: { mon: [
          { sessionId: 'run_a', dist: '5', time: '25:00' },
          { sessionId: 'run_b', dist: '3', time: '18:00' },
        ] },
      },
    },
  };
  const rows = parseCsv(buildTrainingCsv(state, ['mon']));
  const header = rows[0];
  const values = rows.slice(1).map((row) => Object.fromEntries(header.map((key, i) => [key, row[i]])));

  assert.equal(values.length, 3);
  assert.deepEqual(values.slice(0, 2).map((row) => row.WeekKey), ['arch:act_old:1', 'arch:act_old:1']);
  assert.deepEqual(values.slice(0, 2).map((row) => row.RunSessionId), ['run_a', 'run_b']);
  assert.equal(values[2].WeekKey, '2');
  assert.equal(values[2].Exercise, 'Back, Squat');
  assert.equal(values[2].Notes, note);
  assert.ok(rows.every((row) => row.length === header.length), 'every row keeps the full column contract');
});

test('CSV retains a notes/bodyweight-only archived day', () => {
  const state = { weeks: {
    'arch:a:4': {
      activationId: 'a', dates: { tue: '2026-05-05' },
      bodyWeight: { tue: 81.5 }, notes: { tue: 'Rest day check-in' },
    },
  } };
  const rows = parseCsv(buildTrainingCsv(state, ['tue']));
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'arch:a:4');
  assert.equal(rows[1][18], '81.5');
  assert.equal(rows[1][20], 'Rest day check-in');
});

test('exports bodyweight history as its own CSV, sorted and deduped', () => {
  const csv = buildBodyweightCsv({
    bodyWeightLog: [
      { date: '2026-11-19', weight: 83.5 },
      { date: '2026-11-01', weight: 85 },
      { date: '2026-11-19', weight: 83.4 },
      { date: 'bad', weight: 70 },
    ],
  });
  const rows = parseCsv(csv);
  assert.deepEqual(rows[0], ['Date', 'WeightKg']);
  assert.deepEqual(rows.slice(1), [['2026-11-01', '85'], ['2026-11-19', '83.4']]);
});


test('a cell that would execute as a spreadsheet formula is neutralised', () => {
  // Imported notes/names reach this function, so exports must not become code.
  assert.equal(csvCell('=HYPERLINK("http://evil.example","click")'), `"'=HYPERLINK(""http://evil.example"",""click"")"`);
  assert.equal(csvCell('+44 7700 900000'), `"'+44 7700 900000"`);
  assert.equal(csvCell('@SUM(A1)'), `"'@SUM(A1)"`);
  assert.equal(csvCell('-2+3'), `"'-2+3"`);
  assert.equal(csvCell('\tleading tab'), `"'\tleading tab"`);
  // A real number keeps its sign: the guard must not corrupt numeric columns.
  assert.equal(csvCell('-5'), '"-5"');
  assert.equal(csvCell('-12.5'), '"-12.5"');
  assert.equal(csvCell('normal text'), '"normal text"');
});
