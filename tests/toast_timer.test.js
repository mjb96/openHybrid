// =============================================================================
// TOAST TIMER
//
// One toast element serves every surface. A second message used to replace the
// text and start its OWN timer without cancelling the first, so a toast shown
// 2.4 s after another disappeared 0.1 s later when the older timer fired. The
// duplicate-add message could vanish before it was read.
// =============================================================================
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { showToast } from '../js/toast.js';

function fakeDocument() {
  const classes = new Set();
  const toast = {
    textContent: '',
    style: {},
    offsetWidth: 0,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
  };
  return { toast, classes, document: { getElementById: () => toast } };
}

test('a second toast keeps its own full window', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { toast, classes, document } = fakeDocument();
  const previous = globalThis.document;
  globalThis.document = /** @type {any} */ (document);
  try {
    showToast('Added: Row');
    assert.ok(classes.has('show'));
    mock.timers.tick(2400);

    showToast('Row is already in today\'s session');
    assert.equal(toast.textContent, 'Row is already in today\'s session');
    assert.ok(classes.has('show'));

    // The first message's deadline arrives: it must not hide the second one.
    mock.timers.tick(200);
    assert.ok(classes.has('show'), 'the older timer hid the newer toast');
    assert.equal(toast.textContent, 'Row is already in today\'s session');

    // The second toast's own window still ends on time.
    mock.timers.tick(2400);
    assert.equal(classes.has('show'), false, 'the toast never expired');
  } finally {
    globalThis.document = previous;
    mock.timers.reset();
  }
});

test('a third toast also resets the window instead of inheriting it', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { classes, document } = fakeDocument();
  const previous = globalThis.document;
  globalThis.document = /** @type {any} */ (document);
  try {
    showToast('one');
    mock.timers.tick(1000);
    showToast('two');
    mock.timers.tick(1000);
    showToast('three');
    mock.timers.tick(2499);
    assert.ok(classes.has('show'), 'the toast expired before its own window');
    mock.timers.tick(1);
    assert.equal(classes.has('show'), false);
  } finally {
    globalThis.document = previous;
    mock.timers.reset();
  }
});
