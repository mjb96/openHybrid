import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportResultMessage, saveBinaryExport, saveTextExport } from '../js/portability/export-service.js';

function timers() {
  return { setTimeout: () => 1, clearTimeout: () => {} };
}

test('Android export resolves only from the native completion callback', async () => {
  const win = {};
  let invoked = false;
  win.HybridFileExportBridge = {
    saveTextFile(filename, content, mime, callbackId) {
      invoked = true;
      assert.equal(filename, 'backup.json');
      assert.equal(content, '{"ok":true}');
      assert.equal(mime, 'application/json');
      win.__fileExportCB[callbackId](JSON.stringify({ status: 'saved', filename }));
    },
  };
  const result = await saveTextExport(
    { filename: 'backup.json', content: '{"ok":true}', mime: 'application/json' },
    { window: win, ...timers() },
  );
  assert.equal(invoked, true);
  assert.deepEqual(result, {
    status: 'saved', adapter: 'android', message: null, filename: 'backup.json',
  });
  assert.deepEqual(win.__fileExportCB, {});
});

test('Android cancellation is honest and never reported as saved', async () => {
  const win = {};
  win.HybridFileExportBridge = {
    saveTextFile(_filename, _content, _mime, callbackId) {
      win.__fileExportCB[callbackId](JSON.stringify({ status: 'cancelled' }));
    },
  };
  const result = await saveTextExport(
    { filename: 'backup.json', content: '{}', mime: 'application/json' },
    { window: win, ...timers() },
  );
  assert.equal(result.status, 'cancelled');
  assert.equal(exportResultMessage(result).message, 'Export cancelled.');
});

test('Android export invokes WebView timers with the Window receiver', async () => {
  const win = {};
  let scheduled = false;
  let cleared = false;
  win.HybridFileExportBridge = {
    saveTextFile(filename, _content, _mime, callbackId) {
      win.__fileExportCB[callbackId](JSON.stringify({ status: 'saved', filename }));
    },
  };
  const result = await saveTextExport(
    { filename: 'backup.json', content: '{}', mime: 'application/json' },
    {
      window: win,
      setTimeout(callback, delay) {
        if (this !== win) throw new TypeError('Illegal invocation');
        scheduled = delay === 120000;
        return 73;
      },
      clearTimeout(id) {
        if (this !== win) throw new TypeError('Illegal invocation');
        cleared = id === 73;
      },
    },
  );
  assert.equal(result.status, 'saved');
  assert.equal(scheduled, true);
  assert.equal(cleared, true);
});

test('browser file picker confirms write and close before reporting saved', async () => {
  const events = [];
  const win = {
    async showSaveFilePicker(options) {
      assert.equal(this, win, 'browser picker must retain its Window receiver');
      events.push(['picker', options.suggestedName]);
      return { createWritable: async () => ({
        write: async (content) => events.push(['write', content]),
        close: async () => events.push(['close']),
      }) };
    },
  };
  const result = await saveTextExport(
    { filename: 'history.csv', content: 'a,b', mime: 'text/csv' },
    { window: win },
  );
  assert.equal(result.status, 'saved');
  assert.equal(result.adapter, 'browser-picker');
  assert.deepEqual(events, [['picker', 'history.csv'], ['write', 'a,b'], ['close']]);
});

test('anchor fallback says download started and revokes its object URL', async () => {
  const events = [];
  const anchor = {
    hidden: false,
    click: () => events.push('click'),
    remove: () => events.push('remove'),
  };
  const runtime = {
    window: {},
    document: {
      createElement: () => anchor,
      body: { appendChild: () => events.push('append') },
    },
    URL: {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: (url) => events.push(`revoke:${url}`),
    },
    Blob,
    setTimeout: (fn) => { fn(); return 1; },
  };
  const result = await saveTextExport(
    { filename: 'backup.json', content: '{}', mime: 'application/json' },
    runtime,
  );
  assert.equal(result.status, 'started');
  assert.equal(exportResultMessage(result).message, 'Download started — check your Downloads folder.');
  assert.deepEqual(events, ['append', 'click', 'remove', 'revoke:blob:test']);
});

test('a photo archive is written through the native binary bridge', async () => {
  const win = {};
  let sent = null;
  win.HybridFileExportBridge = {
    saveTextFile() { throw new Error('text path must not be used for a zip'); },
    saveBinaryFile(filename, base64, mime, callbackId) {
      sent = { filename, mime };
      assert.ok(base64.length > 0);
      win.__fileExportCB[callbackId](JSON.stringify({ status: 'saved', filename }));
    },
  };
  const result = await saveBinaryExport(
    { filename: 'openhybrid-photos-2026-11-23.zip', bytes: new Uint8Array([0x50, 0x4b, 3, 4]), mime: 'application/zip' },
    { window: win, ...timers() },
  );
  assert.deepEqual(sent, { filename: 'openhybrid-photos-2026-11-23.zip', mime: 'application/zip' });
  assert.equal(result.status, 'saved');
});

test('a shell with only the text bridge refuses instead of claiming the zip was saved', async () => {
  // This is the defect: an anchor into blob: reached a listener with no blob:
  // branch, so nothing was written while the toast said "Photos exported".
  const win = { HybridFileExportBridge: { saveTextFile() {} } };
  const result = await saveBinaryExport(
    { filename: 'photos.zip', bytes: new Uint8Array([1]), mime: 'application/zip' },
    { window: win, ...timers() },
  );
  assert.equal(result.status, 'error');
  assert.match(exportResultMessage(result, 'Photos').message, /newer app version/i);
});
