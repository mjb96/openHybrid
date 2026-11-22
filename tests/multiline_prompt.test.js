// =============================================================================
// MULTILINE PROMPT TESTS (jsdom)
// The routine note is free text with line breaks. Plain Enter must insert a
// newline; Cmd/Ctrl+Enter submits. The textarea is described by the message and
// shows a visible character counter.
// =============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { multilineTextPromptModal } from '../js/ui/confirm-modal.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    pretendToBeVisual: true,
    url: 'https://example.test/',
  });
  const previous = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
  };
  // jsdom does not implement scrolling; the managed-modal stack restores it on close.
  dom.window.scrollTo = () => {};
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  return {
    dom,
    restore() {
      if (previous.document === undefined) delete globalThis.document;
      else globalThis.document = previous.document;
      if (previous.window === undefined) delete globalThis.window;
      else globalThis.window = previous.window;
      if (previous.requestAnimationFrame === undefined) delete globalThis.requestAnimationFrame;
      else globalThis.requestAnimationFrame = previous.requestAnimationFrame;
      dom.window.close();
    },
  };
}

test('multiline prompt keeps Enter as a newline and submits on Cmd/Ctrl+Enter', async () => {
  const env = setupDom();
  try {
    let resolved;
    const promise = multilineTextPromptModal({
      title: 'Routine note',
      message: 'Shown above the exercises when you start this routine.',
      label: 'Routine note',
      value: 'Line one',
      maxLength: 500,
    });
    promise.then((value) => { resolved = value; });

    const overlay = document.querySelector('.cmodal-overlay');
    const textarea = /** @type {HTMLTextAreaElement} */ (overlay.querySelector('textarea[data-cm="input"]'));
    const message = overlay.querySelector('.cmodal__msg');
    const counter = overlay.querySelector('.cmodal__counter');
    assert.ok(textarea && message && counter);
    assert.equal(textarea.getAttribute('aria-describedby'), message.id);
    assert.equal(counter.textContent, '8/500');

    textarea.value = 'Line one\nLine two';
    textarea.dispatchEvent(new env.dom.window.Event('input', { bubbles: true }));
    assert.equal(counter.textContent, '17/500');

    textarea.dispatchEvent(new env.dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.equal(resolved, undefined, 'plain Enter must not submit');
    assert.ok(document.querySelector('.cmodal-overlay'), 'the dialog stays open after plain Enter');

    textarea.dispatchEvent(new env.dom.window.KeyboardEvent('keydown', {
      key: 'Enter', ctrlKey: true, bubbles: true,
    }));
    await promise;
    assert.equal(resolved, 'Line one\nLine two');
    assert.equal(document.querySelector('.cmodal-overlay'), null);
  } finally {
    env.restore();
  }
});
