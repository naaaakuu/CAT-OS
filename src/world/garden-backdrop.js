/**
 * garden-backdrop.js — the Rootwood grove behind a session or a plant
 * page, drawn by the world engine: the family's own grove, every tree at
 * its true stage, the tended family marked. `grow()` plays the growth
 * moment in the scene itself — the tree rises out of the ground into its
 * new stage with one organic overshoot — so a tree is grown in the place
 * it will always stand.
 */

import { WorldRenderer } from './engine/canvas.js';
import { buildGroveScene } from './engine/map.js';
import { sprite } from './engine/sprites.js';
import { GROVES } from '../modules/language-garden/logic/groves.js';
import { computePlantState } from '../core/engine/garden-session.js';
import { hourWord, seasonWord, weatherWord } from './engine/palette.js';

const GROVE_OF = new Map();
for (const g of GROVES) for (const id of g.families) GROVE_OF.set(id, g);

/**
 * @param {HTMLElement} host       an element the canvas fills (position: relative/absolute)
 * @param {object} o
 *   family        the tended family (loaded lg item)
 *   allFamilies   every loaded lg item
 *   allSessions   every garden-session record
 *   seeds         garden-seed records
 *   displayState  the tended family's DISPLAY state (may differ from computed)
 * @returns {{ grow(postState, opts): Promise<void>, destroy(): void, renderer }}
 */
export function mountGardenBackdrop(host, { family, allFamilies, allSessions, seeds = [], displayState }) {
  const grove = GROVE_OF.get(family.meta.id) ?? { slug: 'edge', name: 'The Wood’s Edge', line: '', families: [] };
  const ids = grove.families.length ? grove.families : [family.meta.id];
  const byId = new Map(allFamilies.map((f) => [f.meta.id, f]));
  const now = Date.now();
  const views = ids.map((id) => byId.get(id)).filter(Boolean).map((f) => {
    const history = allSessions.filter((s) => s.family_id === f.meta.id);
    const fs = seeds.filter((s) => s.family_id === f.meta.id);
    const st = f.meta.id === family.meta.id && displayState ? displayState : computePlantState([...history, ...fs], now);
    return { id: f.meta.id, label: f.root.label, stage: st.stage, due: st.due ?? 'none', vigor: st.vigor ?? 0, landmark: !!st.landmark, family: f };
  });
  const date = new Date();
  const atmo = { hour: hourWord(date), season: seasonWord(date), weather: weatherWord(date) };
  const scene = buildGroveScene(grove, views, atmo, { selected: null, portrait: true, heroId: family.meta.id });
  const canvas = document.createElement('canvas');
  canvas.className = 'lgx__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const renderer = new WorldRenderer(canvas, scene, { worldW: scene.W, worldH: scene.H, fit: 'cover', pannable: false, minZoom: 0.5, maxZoom: 8 });
  // Look at the tended tree: it stands in the upper half, above the veil.
  const tended = scene.objectsList.find((o) => o.id === family.meta.id);
  if (tended) renderer.lookAt(tended.x, tended.y + 36, { animate: false });
  renderer.start();

  return {
    renderer, scene, atmo,
    /** Grow the tended tree into `postState`, animated (unless reduced motion). */
    grow(postState, { reduce = false } = {}) {
      return new Promise((resolve) => {
        const o = scene.objectsList.find((x) => x.id === family.meta.id);
        if (!o) { resolve(); return; }
        const next = sprite('tree', { stage: postState.stage, seed: family.meta.id, season: atmo.season, vigor: Math.round((postState.vigor ?? 0) * 4) / 4, landmark: !!postState.landmark, due: 'none' });
        o.sprite = next;
        o.family = { ...o.family, stage: postState.stage, due: 'none', landmark: !!postState.landmark };
        // The camera leans in as the tree grows, so the moment fills the frame.
        renderer.lookAt(o.x, o.y - 14, { zoom: Math.min(renderer.maxZoom(), renderer.cam.zoom * 1.6), duration: reduce ? 0 : 1500, animate: !reduce });
        if (reduce) { o.scaleY = o.scaleX; resolve(); return; }
        const base = o.scaleX;
        const start = performance.now();
        const D = 1500;
        const ease = (t) => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; };
        const step = (now) => {
          const t = Math.min(1, (now - start) / D);
          o.scaleY = base * (0.15 + 0.85 * ease(t));
          if (t < 1) requestAnimationFrame(step); else { o.scaleY = base; resolve(); }
        };
        requestAnimationFrame(step);
      });
    },
    destroy() { renderer.destroy(); canvas.remove(); },
  };
}
