/**
 * backdrop.js — the place's own landscape, painted full-bleed behind a
 * run. It is deliberately still and dimmed: the learner must know where
 * they are without anything moving next to the words they are reading.
 * (Premium restraint: the world breathes on the map, and holds its breath
 * during a timed round.)
 */

import { WorldRenderer } from '../engine/canvas.js';
import { buildBackdropScene } from '../engine/map.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} slug     region slug
 * @param {object} state    world state
 * @param {object} atmo     { hour, season, weather }
 * @param {object} [opts]   { still = true }
 * @returns {{destroy(): void, renderer: WorldRenderer}}
 */
export function mountBackdrop(canvas, slug, state, atmo, opts = {}) {
  if (!canvas) return { destroy() {}, renderer: null };
  let renderer = null;
  try {
    const scene = buildBackdropScene(slug, state, atmo);
    renderer = new WorldRenderer(canvas, scene, {
      worldW: scene.W, worldH: scene.H, fit: 'cover', pannable: false, minZoom: 0.4, maxZoom: 8,
    });
    renderer.lookAt(scene.W / 2, scene.focusY ?? scene.H * 0.55, { animate: false });
    if (opts.still === false) renderer.start(); else renderer.draw();
  } catch (err) {
    console.error('[CAT OS] backdrop failed', err);
  }
  return {
    renderer,
    destroy() { try { renderer?.destroy(); } catch { /* gone */ } },
  };
}
