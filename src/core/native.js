/**
 * native.js — the one door to the Android shell (android/).
 *
 * The shell's WebView puts `window.CatOSAndroid` on the page before any
 * script runs. On the web it is absent and every caller here falls back to
 * the browser: nothing is locked, nothing needs the network.
 *
 * Calls that finish later (a rewarded video, a purchase) pass a call id;
 * the shell answers with `window.__catosNative(id, json)`. Changes the shell
 * notices on its own (a purchase restored, Pro ending) arrive as
 * `window.__catosEvent(json)` and are re-sent as a `catos:native` event.
 */

export const NATIVE = typeof window !== 'undefined' ? window.CatOSAndroid ?? null : null;
export const inApp = !!NATIVE;

/** Where the app lives on Google Play; the Share row sends this link. */
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.nakulcreations.catos';
export const PRIVACY_URL = 'https://naaaakuu.github.io/CAT-OS/privacy.html';

const waiting = new Map();
let calls = 0;
if (NATIVE) {
  window.__catosNative = (id, json) => {
    const done = waiting.get(String(id));
    waiting.delete(String(id));
    let v = null;
    try { v = JSON.parse(json); } catch { /* a malformed answer is no answer */ }
    done?.(v);
  };
  window.__catosEvent = (json) => {
    let detail = null;
    try { detail = JSON.parse(json); } catch { return; }
    window.dispatchEvent(new CustomEvent('catos:native', { detail }));
  };
}

/** Ask the shell for something that finishes later. Resolves null on the web. */
export function ask(method, ...args) {
  if (!NATIVE || typeof NATIVE[method] !== 'function') return Promise.resolve(null);
  return new Promise((done) => {
    const id = String(++calls);
    waiting.set(id, done);
    try { NATIVE[method](id, ...args); } catch { waiting.delete(id); done(null); }
  });
}

/** Pro (no videos, plays offline). Kept by the shell, so it holds offline too. */
export function isPro() {
  try { return !!NATIVE?.isPro(); } catch { return false; }
}

/** The Google account signed in on this phone ({uid, email, name}), or null. Always null on the web. */
export function account() {
  try { const a = NATIVE?.account?.(); return a ? JSON.parse(a) : null; } catch { return null; }
}

/** One Google Analytics event (Firebase, in the app). The web sends nothing anywhere. */
export function track(name, params = {}) {
  try { NATIVE?.logEvent?.(name, JSON.stringify(params)); } catch { /* counting never breaks the app */ }
}

/** The Android share sheet, Web Share, or the clipboard, in that order. */
export async function shareApp() {
  const text = 'I am sharpening my English in CAT OS: a little village that grows when you read and reason better. Free on Google Play:';
  if (NATIVE) { NATIVE.share(`${text} ${PLAY_URL}`); return 'shared'; }
  try { if (navigator.share) { await navigator.share({ title: 'CAT OS', text, url: PLAY_URL }); return 'shared'; } } catch { return 'cancelled'; }
  try { await navigator.clipboard.writeText(`${text} ${PLAY_URL}`); return 'copied'; } catch { return 'failed'; }
}

/** A link that must leave the app (privacy policy, Play subscriptions). */
export function openExternal(url) {
  if (NATIVE) NATIVE.openExternal(url); else window.open(url, '_blank', 'noopener');
}
