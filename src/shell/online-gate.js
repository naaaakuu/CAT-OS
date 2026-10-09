/**
 * online-gate.js — in the Android app a free player plays while online.
 *
 * The app is free because a full explanation opens with a short video
 * (core/ads/rewarded.js), and a video needs the network. So with no
 * connection a free player meets one calm wall; whatever was open waits
 * underneath it, untouched, and the wall lifts the moment the connection
 * is back. Pro plays anywhere. On the web nothing changes.
 *
 * The shell answers isOnline() from Android's own "this network reaches
 * the internet" check and sends a `net` event when it changes.
 */

import { NATIVE, isPro } from '../core/native.js';

export function installOnlineGate() {
  if (!NATIVE) return;
  const shell = document.getElementById('shell');
  let wall = null;

  const blocked = () => {
    if (isPro()) return false;
    try { return !NATIVE.isOnline(); } catch { return !navigator.onLine; }
  };

  const check = () => {
    const shut = blocked();
    if (shut && !wall) {
      wall = document.createElement('div');
      wall.className = 'net-wall';
      wall.setAttribute('role', 'alertdialog');
      wall.setAttribute('aria-modal', 'true');
      wall.setAttribute('aria-labelledby', 'net-wall-title');
      wall.innerHTML = `
        <div class="net-wall__card">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0M12 19.5h.01M3 3l18 18"/></svg>
          <h1 id="net-wall-title">The village needs the internet</h1>
          <p>CAT OS is free because a full explanation opens with a short video, and videos need a connection. Turn on Wi-Fi or mobile data and you will be right where you left off.</p>
          <button class="btn btn--primary" type="button" data-net-retry>Try again</button>
          <p class="hint" data-net-said role="status" aria-live="polite">CAT OS Pro plays offline too.</p>
        </div>`;
      wall.querySelector('[data-net-retry]').addEventListener('click', () => {
        check();
        if (wall) wall.querySelector('[data-net-said]').textContent = 'Still no connection. Your progress is safe on this phone.';
      });
      document.body.appendChild(wall);
      if (shell) shell.inert = true;
      wall.querySelector('[data-net-retry]').focus();
    } else if (!shut && wall) {
      wall.remove();
      wall = null;
      if (shell) shell.inert = false;
    }
  };

  window.addEventListener('online', check);
  window.addEventListener('offline', check);
  window.addEventListener('catos:native', check);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  check();
}
