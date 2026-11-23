// @ts-check
// =============================================================================
// TEXT EXPORT SERVICE
// One contract for JSON/CSV across Android and the browser. Native and modern
// browser saves resolve only after the destination confirms the write. The
// anchor fallback is explicitly reported as "started", never falsely "saved".
// =============================================================================

let callbackSeq = 0;

function runtimeDefaults() {
  return {
    window: typeof window !== 'undefined' ? window : undefined,
    document: typeof document !== 'undefined' ? document : undefined,
    URL: typeof URL !== 'undefined' ? URL : undefined,
    Blob: typeof Blob !== 'undefined' ? Blob : undefined,
    setTimeout: typeof setTimeout === 'function' ? setTimeout : undefined,
    clearTimeout: typeof clearTimeout === 'function' ? clearTimeout : undefined,
  };
}

// WebKit rejects detached host-timer calls with `TypeError: Illegal invocation`.
// Runtime injection remains supported, but browser functions must receive their
// actual Window object rather than this plain runtime wrapper.
function scheduleTimeout(runtime, callback, delay) {
  const timer = runtime.setTimeout;
  if (typeof timer !== 'function') return undefined;
  return Reflect.apply(timer, runtime.window || globalThis, [callback, delay]);
}

function cancelTimeout(runtime, timerId) {
  const clear = runtime.clearTimeout;
  if (typeof clear === 'function' && timerId !== undefined) {
    Reflect.apply(clear, runtime.window || globalThis, [timerId]);
  }
}

function normalizedFile(file) {
  if (!file || typeof file !== 'object') return null;
  const filename = typeof file.filename === 'string' ? file.filename.trim() : '';
  const content = typeof file.content === 'string' ? file.content : '';
  const mime = typeof file.mime === 'string' && file.mime.trim()
    ? file.mime.trim()
    : 'text/plain';
  return filename ? { filename, content, mime } : null;
}

function nativeSave(file, runtime) {
  const win = runtime.window;
  const bridge = win?.HybridFileExportBridge;
  if (!bridge || typeof bridge.saveTextFile !== 'function') return null;
  if (!win.__fileExportCB) win.__fileExportCB = {};
  const callbackId = `file_${++callbackSeq}_${Date.now()}`;
  return new Promise((resolve) => {
    const finish = (result) => {
      cancelTimeout(runtime, timer);
      delete win.__fileExportCB[callbackId];
      resolve({ ...result, adapter: 'android' });
    };
    const timer = scheduleTimeout(runtime, () => {
      finish({ status: 'error', message: 'Android save timed out.' });
    }, 120000);
    win.__fileExportCB[callbackId] = (json) => {
      try {
        const result = JSON.parse(json || '{}');
        const status = ['saved', 'cancelled', 'error'].includes(result.status)
          ? result.status
          : 'error';
        finish({ status, message: result.message || null, filename: result.filename || file.filename });
      } catch {
        finish({ status: 'error', message: 'Android returned an invalid save result.' });
      }
    };
    try {
      bridge.saveTextFile(file.filename, file.content, file.mime, callbackId);
    } catch (error) {
      finish({ status: 'error', message: error instanceof Error ? error.message : 'Android save failed.' });
    }
  });
}

async function pickerSave(file, runtime) {
  const picker = runtime.window?.showSaveFilePicker;
  if (typeof picker !== 'function') return null;
  try {
    const handle = await Reflect.apply(picker, runtime.window, [{
      suggestedName: file.filename,
      types: [{ description: file.mime, accept: { [file.mime]: [`.${file.filename.split('.').pop()}`] } }],
    }]);
    const writable = await handle.createWritable();
    await writable.write(file.content);
    await writable.close();
    return { status: 'saved', adapter: 'browser-picker', filename: file.filename };
  } catch (error) {
    if (error && typeof error === 'object' && error.name === 'AbortError') {
      return { status: 'cancelled', adapter: 'browser-picker', filename: file.filename };
    }
    return { status: 'error', adapter: 'browser-picker', message: error instanceof Error ? error.message : 'Save failed.' };
  }
}

function downloadSave(file, runtime) {
  const doc = runtime.document;
  const Url = runtime.URL;
  const BlobCtor = runtime.Blob;
  if (!doc || !Url?.createObjectURL || !BlobCtor) {
    return { status: 'error', adapter: 'unavailable', message: 'File saving is unavailable.' };
  }
  const url = Url.createObjectURL(new BlobCtor([file.content], { type: `${file.mime};charset=utf-8` }));
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  anchor.hidden = true;
  doc.body?.appendChild(anchor);
  anchor.click();
  anchor.remove();
  scheduleTimeout(runtime, () => Url.revokeObjectURL(url), 0);
  return { status: 'started', adapter: 'browser-download', filename: file.filename };
}

/**
 * @param {{filename: string, content: string, mime: string}} file
 * @param {Partial<ReturnType<typeof runtimeDefaults>>} [providedRuntime]
 * @returns {Promise<{status: string, adapter: string, filename?: string, message?: string|null}>}
 */
export async function saveTextExport(file, providedRuntime = {}) {
  const normalized = normalizedFile(file);
  if (!normalized) return { status: 'error', adapter: 'unavailable', message: 'Invalid export file.' };
  const runtime = { ...runtimeDefaults(), ...providedRuntime };
  const native = nativeSave(normalized, runtime);
  if (native) return native;
  const picker = await pickerSave(normalized, runtime);
  if (picker) return picker;
  return downloadSave(normalized, runtime);
}

/** Honest user copy for each platform-confirmed outcome. */
export function exportResultMessage(result, label = 'Data') {
  if (result?.status === 'saved') return { message: `${label} exported ✓`, error: false };
  if (result?.status === 'started') return { message: 'Download started — check your Downloads folder.', error: false };
  if (result?.status === 'cancelled') return { message: 'Export cancelled.', error: false };
  return { message: result?.message || 'Export failed. Please try again.', error: true };
}


/**
 * Save binary bytes (a zip) the same way `saveTextExport` saves text.
 *
 * Text exports go through the Android storage bridge; binary has no bridge
 * method yet, so this uses the platform download path and reports honestly when
 * it cannot (the caller shows the message).
 *
 * @param {{ filename: string, bytes: Uint8Array, mime: string }} file
 * @param {any} [providedRuntime]
 */
export async function saveBinaryExport(file, providedRuntime = {}) {
  const runtime = providedRuntime;
  const Url = runtime.URL || (typeof URL !== 'undefined' ? URL : undefined);
  const doc = runtime.document || (typeof document !== 'undefined' ? document : undefined);
  const BlobCtor = runtime.Blob || (typeof Blob !== 'undefined' ? Blob : undefined);
  const win = runtime.window || (typeof window !== 'undefined' ? window : undefined);

  // Android: the photo archive is the only copy of those bytes, so it MUST go
  // through the native binary bridge. A shell that exposes the text-only bridge
  // cannot write a zip at all — an anchor into a blob: URL reaches a download
  // listener that has no blob: branch, so nothing lands. Say so instead of
  // claiming success (this used to report "saved" while writing nothing).
  const bridge = win?.HybridFileExportBridge;
  if (bridge && typeof bridge.saveBinaryFile === 'function') {
    return await saveBinaryNative(file, win, bridge, runtime);
  }
  if (bridge) {
    return {
      status: 'error',
      adapter: 'android',
      message: 'Photo export needs a newer app version. Update openHybrid and try again.',
    };
  }

  if (!doc || !Url?.createObjectURL || !BlobCtor) return { status: 'unavailable' };
  try {
    const blob = new BlobCtor([new Uint8Array(file.bytes)], { type: file.mime || 'application/octet-stream' });
    const url = Url.createObjectURL(blob);
    const anchor = doc.createElement('a');
    anchor.href = url;
    anchor.download = file.filename;
    anchor.rel = 'noopener';
    doc.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => { try { Url.revokeObjectURL(url); } catch { /* already gone */ } }, 4000);
    // A browser download is a hand-off, not a confirmed write. Same honesty rule
    // the text path already follows.
    return { status: 'started', adapter: 'browser-download', filename: file.filename };
  } catch {
    return { status: 'error' };
  }
}

/**
 * Send binary bytes through the Android bridge and wait for its confirmation.
 * At most one export runs at a time (the native side enforces that too).
 */
function saveBinaryNative(file, win, bridge, runtime) {
  return new Promise((resolve) => {
    const id = `bin_${++callbackSeq}_${Date.now()}`;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      cancelTimeout(runtime, timer);
      try { delete win.__fileExportCB[id]; } catch { /* ignore */ }
      resolve({ ...value, adapter: 'android' });
    };
    const timer = scheduleTimeout(runtime, () => {
      finish({ status: 'error', message: 'Android save timed out.' });
    }, 120000);
    if (!win.__fileExportCB) win.__fileExportCB = {};
    win.__fileExportCB[id] = (json) => {
      try {
        const result = JSON.parse(json || '{}');
        const status = ['saved', 'cancelled', 'error'].includes(result.status) ? result.status : 'error';
        finish({ status, message: result.message || null, filename: result.filename || file.filename });
      } catch {
        finish({ status: 'error', message: 'Android returned an invalid save result.' });
      }
    };
    try {
      bridge.saveBinaryFile(file.filename, base64FromBytes(file.bytes), file.mime, id);
    } catch (error) {
      finish({ status: 'error', message: error instanceof Error ? error.message : 'Android save failed.' });
    }
  });
}

/** Chunked base64 so a multi-MB archive cannot blow the argument stack. */
function base64FromBytes(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < data.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, data.subarray(i, i + CHUNK));
  }
  if (typeof btoa === 'function') return btoa(binary);
  // No btoa (old WebView / odd shell): fall back to the URL-safe-free base64 of
  // an ArrayBuffer via a temporary binary string. Reports an honest failure
  // rather than throwing an undefined reference.
  throw new Error('This device cannot encode the photo archive.');
}
