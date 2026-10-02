/**
 * stage.js — the place behind a room, and the pet who hosts it.
 *
 * The verbal crafts, Word DNA and the Reading Room keep their own screens
 * (their pedagogy is the product's best work and is not worth rewriting to
 * make a background change). What they lacked was a PLACE: they read as
 * pages, not as somewhere you had walked to.
 *
 * 3.0: every learning route has a HOST — the pet whose subject it is —
 * set as `data-host` on the root, so any stylesheet can show who you are
 * with. Rooms that do not paint their own scene also get the host's home,
 * a soft crop of the village painting, fixed behind the whole shell
 * (`data-stage` lifts their cards onto warm glass, as it always has).
 *
 * app.js calls `syncStage()` on every navigation; nothing else needs to
 * know this exists.
 */

import { petForPlace, petForModule } from '../pets/pets.js';
import { backdropStyle } from '../pets/sprite.js';

/** The pet whose subject a route belongs to, or null for the shell's own pages. */
export function hostFor(hash) {
  const h = String(hash ?? '');
  let m;
  if ((m = h.match(/^#\/world\/place\/([\w-]+)/))) return petForPlace(m[1]);
  if (h.startsWith('#/round/') || h.startsWith('#/garden') || h.startsWith('#/wd')) return 'matcha';
  if ((m = h.match(/^#\/bank\/session\/(\w+)/))) return petForModule(m[1]);
  if (h.startsWith('#/rc')) return 'chai';
  if (h.startsWith('#/pj')) return 'ginger';
  if (h.startsWith('#/ps')) return 'mochi';
  if (h.startsWith('#/ooo')) return 'mallow';
  return null;
}

/** Which place a route stands in (for rooms that do not paint their own scene), or null. */
export function stageFor(hash) {
  const h = String(hash ?? '');
  if (h.startsWith('#/pj')) return 'loom';
  if (h.startsWith('#/ps')) return 'table';
  if (h.startsWith('#/ooo')) return 'bench';
  if (h.startsWith('#/wd')) return 'terraces';
  const bank = h.match(/^#\/bank\/session\/(\w+)/);
  if (bank) return { sp: 'loom', pc: 'table', cr: 'reading-room', wb: 'meadow' }[bank[1]] ?? null;
  // The second look paints its own scene and veil, like a vocabulary round;
  // two scenes stacked once put dark ink on a dark scene at 1.16:1.
  if (h === '#/rc/second-look') return null;
  if (h.startsWith('#/rc')) return 'reading-room';
  return null;
}

/**
 * Dark mode is night, not an inversion (THE WORLD §12.6). Read from the DOM:
 * `data-theme` is the single source of truth every stylesheet keys off.
 */
export function stageIsNight() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return true;
  if (t === 'light') return false;
  try { return !!globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches; } catch { return false; }
}

/** The hour to paint at: night in dark theme, whatever the clock says. */
export function paintedAtmo(atmo) {
  if (!stageIsNight()) return atmo;
  if (atmo?.hour === 'night' || atmo?.hour === 'dusk') return atmo;
  return { ...atmo, hour: 'night' };
}

let current = null;
let el = null;

export function unmountStage() {
  current = null;
  document.documentElement.removeAttribute('data-stage');
  el?.remove();
  el = null;
}

/** Put the right host and place behind the current route, or take them away. */
export async function syncStage() {
  const host = hostFor(location.hash);
  if (host) document.documentElement.setAttribute('data-host', host);
  else document.documentElement.removeAttribute('data-host');
  const slug = stageFor(location.hash);
  if (!slug) { if (current) unmountStage(); return; }
  const key = `${slug}|${host}`;
  if (key === current) return;
  current = key;
  document.documentElement.setAttribute('data-stage', slug);
  if (!el?.isConnected) {
    el = document.createElement('div');
    el.className = 'roomstage';
    el.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(el, document.body.firstChild);
  }
  el.innerHTML = `<i class="roomstage__art" style="${backdropStyle(host ?? 'plaza', { screen: true })}"></i><div class="roomstage__veil"></div>`;
  requestAnimationFrame(() => el?.classList.add('is-in'));
}
