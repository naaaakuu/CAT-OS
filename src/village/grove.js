/**
 * grove.js — a grove of the Rootwood, in the village's art.
 *
 * The Root Workshop's inside is a wood: one tree per root family, each at
 * the stage the learner has grown it to — bare ground, a planter, a shrub,
 * a young birch, a full oak — standing in rows on the village's ground,
 * every one of them a sprite from the art pack.
 * The tended family takes the front, and can be tapped. The same scene
 * stands behind a Rootwood session, where `grow()` plays the growth
 * moment in place: the tree rises out of the ground into its new stage.
 */

import { rng, LIGHT } from '../world/engine/palette.js';
import { art, PAL, PLANT_STAGE } from './art.js';
import { grassFor } from './terrain.js';


/**
 * @param {object} grove      { slug, name }
 * @param {Array}  families   [{ id, label, stage, due, landmark, vigor, family }]
 * @param {object} atmo       { hour, season }
 * @param {object} [opts]     { selected, heroId, portrait }
 */
export function buildGroveScene(grove, families, atmo, opts = {}) {
  const { hour, season } = atmo;
  const night = hour === 'night' || hour === 'dusk';
  const W = 360, H = 520;
  const r = rng(`grove:${grove.slug}`);
  const heroId = opts.heroId ?? null;
  // Rows: the hero front and centre, the rest in two rows behind, uneven.
  const rows = [[0.22, 300], [0.5, 292], [0.78, 300], [0.14, 230], [0.36, 222], [0.64, 224], [0.86, 232], [0.28, 168], [0.5, 160], [0.72, 170], [0.4, 120], [0.6, 118]];
  const objects = [];
  let ri = 0;
  const stageOf = (f) => PLANT_STAGE[f.stage] ?? PLANT_STAGE.in_leaf;
  const treeFor = (f) => art(f.landmark && f.stage !== 'open_ground' ? 'tree_pine' : stageOf(f)[0]);
  for (const f of families) {
    let fx, y;
    if (heroId && f.id === heroId) { fx = 0.5; y = 380; } else { [fx, y] = rows[ri % rows.length]; ri += 1; }
    const x = Math.round(fx * W + (r() - 0.5) * 14);
    objects.push({ id: f.id, family: f, x, y: y + Math.floor(ri / rows.length) * 4, art: treeFor(f), scale: stageOf(f)[1], hero: f.id === heroId });
  }
  // The wood behind: a back row of the pack's trees.
  const rb = rng(`grove-wood:${grove.slug}`);
  const wood = Array.from({ length: 9 }, (_, i) => ({ x: 20 + i * 42, y: 70 + rb() * 30, art: art(i % 3 ? 'tree_oak' : 'tree_pine'), scale: 0.8 + Math.round(rb() * 2) / 10 }));
  const lamps = [];
  for (const o of objects) if (o.family.landmark && night) lamps.push({ x: o.x, y: o.y - 30, r: 44, a: 0.4, color: PAL.glow });
  let selected = opts.selected ?? null;
  let t = 0;
  const scene = {
    W, H, backdrop: grassFor(season), hour, atmo, focusY: 250,
    get terrainKey() { return `grove|${grove.slug}|${season}|${night}`; },
    terrain(ctx) {
      ctx.fillStyle = grassFor(season); ctx.fillRect(0, 0, W, H);
      // The wood's shade at the back, a worn trail to the front, dusk at the foot.
      const g = ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, 'rgba(53,91,72,0.55)'); g.addColorStop(1, 'rgba(53,91,72,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 200);
      ctx.strokeStyle = hexA(PAL.path, 0.35); ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(W / 2 + 10, 150); ctx.quadraticCurveTo(W / 2 - 20, 320, W / 2, H + 10); ctx.stroke();
      const g2 = ctx.createLinearGradient(0, H - 160, 0, H); g2.addColorStop(0, 'rgba(20,28,24,0)'); g2.addColorStop(1, 'rgba(20,28,24,0.45)'); ctx.fillStyle = g2; ctx.fillRect(0, H - 160, W, 160);
    },
    update(dt) { t += dt; },
    objects() {
      const out = [...wood, ...objects];
      // The tended family: a soft ring on the ground at its foot.
      const sel = selected && objects.find((o) => o.id === selected);
      if (sel) out.push({ x: sel.x, y: sel.y - 1e5, draw: (ctx) => { ctx.strokeStyle = hexA(PAL.cream, 0.55 + 0.25 * Math.sin(t / 400)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(sel.x, sel.y + 2, 26, 9, 0, 0, Math.PI * 2); ctx.stroke(); } });
      return out;
    },
    light() { const l = LIGHT[hour] ?? LIGHT.morning; return { tint: hour === 'night' ? '#2E3F86' : l.tint, strength: l.strength * 0.75 }; },
    lights() { return lamps; },
    hit(x, y) {
      let best = null, bd = Infinity;
      for (const o of objects) {
        const w = o.art.w * o.scale, h = o.art.h * o.scale;
        if (x >= o.x - w / 2 - 6 && x <= o.x + w / 2 + 6 && y >= o.y - h - 6 && y <= o.y + 8) {
          const d = Math.hypot(x - o.x, y - (o.y - h / 2));
          if (d < bd) { bd = d; best = o; }
        }
      }
      return best;
    },
    select(id) { selected = id; },
    objectsList: objects,
    treeFor,
    scaleFor: (f) => stageOf(f)[1],
  };
  return scene;
}

function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
