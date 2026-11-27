// @ts-check
// ==========================================
// TOAST NOTIFICATIONS (toast.js)
// ==========================================
//
// One toast element serves every surface, so a second message must take over
// the timer as well as the text. The first version only replaced the text and
// added its own timer: two toasts inside 2.5 s meant the FIRST timer hid the
// SECOND message, and a duplicate-add toast could vanish before it was read.
let _hideTimer = null;

export function showToast(msg, isError = false) {
  const toast = document.getElementById('sysToast');
  if (!toast) return;
  if (_hideTimer) {
    clearTimeout(_hideTimer);
    _hideTimer = null;
  }
  toast.textContent = msg;
  toast.style.background = isError ? 'var(--accent-red)' : 'var(--accent-green)';
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  _hideTimer = setTimeout(() => {
    toast.classList.remove('show');
    _hideTimer = null;
  }, 2500);
}
