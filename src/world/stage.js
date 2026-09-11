/**
 * stage.js — the place behind a room.
 *
 * The verbal crafts, Word DNA and the Reading Room keep their own screens
 * (their pedagogy is the product's best work and is not worth rewriting to
 * make a background change). What they lacked was a PLACE: they read as
 * pages, not as somewhere you had walked to.
 *
 * This mounts one fixed, still, dimmed canvas of the region behind the
 * whole shell and sets `data-stage` on the root, which is all the CSS
 * needs to lift those screens onto warm glass over the valley. One canvas,
 * painted once, no frame loop: the cost of standing somewhere is nothing.
 *
 * app.js calls `syncStage()` on every navigation; nothing else needs to
 * know this exists.
 */

import { WorldRenderer } from './engine/canvas.js';
import { buildBackdropScene } from './engine/map.js';
import { loadWorld } from './state.js';

/** Which place a route belongs to, or null for the shell's own pages. */
export function stageFor(hash) {
  const h = String(hash ?? '');
  if (h.startsWith('#/pj')) return 'loom';
  if (h.startsWith('#/ps')) return 'table';
  if (h.startsWith('#/ooo')) return 'bench';
  if (h.startsWith('#/wd')) return 'terraces';
  if (h.startsWith('#/rc')) return 'reading-room';
  return null;
}

let current = null;
let renderer = null;
let el = null;
let token = 0;

function ensureLayer() {
  if (el?.isConnected) return el;
  el = document.createElement('div');
  el.className = 'roomstage';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<canvas class="roomstage__canvas"></canvas><div class="roomstage__veil"></div>';
  document.body.insertBefore(el, document.body.firstChild);
  return el;
}

export function unmountStage() {
  token += 1;
  current = null;
  try { renderer?.destroy(); } catch { /* gone */ }
  renderer = null;
  document.documentElement.removeAttribute('data-stage');
  el?.remove();
  el = null;
}

/**
 * Put the right place behind the current route, or take it away.
 * @param {object} storage the app's storage adapter
 */
export async function syncStage(storage) {
  const slug = stageFor(location.hash);
  if (!slug) { if (current) unmountStage(); return; }
  if (slug === current) return;
  const mine = (token += 1);
  current = slug;
  document.documentElement.setAttribute('data-stage', slug);
  try {
    const { state } = await loadWorld(storage);
    if (mine !== token) return;                 // navigated away while loading
    const layer = ensureLayer();
    const canvas = layer.querySelector('.roomstage__canvas');
    const scene = buildBackdropScene(slug, state, state.atmo);
    renderer?.destroy();
    renderer = new WorldRenderer(canvas, scene, {
      worldW: scene.W, worldH: scene.H, fit: 'cover', pannable: false, minZoom: 0.3, maxZoom: 8,
    });
    renderer.lookAt(scene.W / 2, scene.focusY ?? scene.H * 0.55, { animate: false });
    renderer.draw();                             // still: a room must not move
    requestAnimationFrame(() => layer.classList.add('is-in'));
  } catch (err) {
    console.error('[CAT OS] stage failed', err);
    document.documentElement.removeAttribute('data-stage');
    current = null;
  }
}
