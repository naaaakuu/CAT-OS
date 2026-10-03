/**
 * rewarded.js — the one door a rewarded video ad will open.
 *
 * Some extras are meant, one day, to cost one short rewarded ad: first of
 * all a passage explained simply (#/rc/mentor/:id). No ad network is wired
 * yet (owner, 2026-10-03: "no AdMob injection now, prepare for it"), so in
 * this build every door is open and nothing changes for the learner.
 *
 * The day a native shell (AdMob through Capacitor, or a TWA bridge) defines
 *   window.CatOSAds = { showRewarded({ placement }) → Promise<boolean> }
 * resolving true only when the video was watched to the end, doors stay
 * shut until then, and each unlock is remembered on this device.
 *
 * To see the locked path today: localStorage 'catos:ads' = 'test' swaps in
 * a three-second stand-in for the video.
 */

const KEY = 'catos:unlocked';
const TEST = { showRewarded: () => new Promise((done) => setTimeout(() => done(true), 3000)) };

function provider() {
  if (typeof window === 'undefined') return null;
  if (typeof window.CatOSAds?.showRewarded === 'function') return window.CatOSAds;
  try { if (localStorage.getItem('catos:ads') === 'test') return TEST; } catch { /* storage blocked: no ads */ }
  return null;
}

function unlocked() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
}

/** Nothing to watch: no ads in this build, or this extra was already unlocked here. */
export function isUnlocked(key) {
  return !provider() || unlocked().has(key);
}

/** Show one rewarded ad for `key`. True once it is unlocked; false if the video did not finish. */
export async function unlockWithAd(key) {
  if (isUnlocked(key)) return true;
  let ok = false;
  try { ok = (await provider().showRewarded({ placement: key })) === true; } catch { ok = false; }
  if (ok) {
    const all = unlocked();
    all.add(key);
    try { localStorage.setItem(KEY, JSON.stringify([...all])); } catch { /* unlocked for this visit only */ }
  }
  return ok;
}
