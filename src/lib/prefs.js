// ─────────────────────────────────────────────────────────────
// Per-device UI preferences (currently just the colour theme).
//
// These are NOT shop data: they never go to Supabase and are never shared
// between staff. A tech can run Night on their phone while the office laptop
// stays on Day. Shop data still goes only through lib/storage.js.
// Every access is guarded: private windows and locked-down browsers can throw
// on localStorage, and the app must render fine without a stored value.
// ─────────────────────────────────────────────────────────────
export function getPref(key, fallback) {
  try {
    const v = window.localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

export function setPref(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    /* preference simply won't persist on this device */
  }
}
