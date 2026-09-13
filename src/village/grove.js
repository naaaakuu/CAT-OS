/**
 * grove.js — a grove of the Rootwood, in the village's art.
 *
 * The Root Workshop's inside is a wood: one tree per root family, each at
 * the stage the learner has grown it to — a root-stone waiting, a sprout,
 * a young tree, a full crown — standing in rows on the village's ground.
 * The tended family takes the front, and can be tapped. The same scene
 * stands behind a Rootwood session, where `grow()` plays the growth
 * moment in place: the tree rises out of the ground into its new stage.
 */

import { rng, LIGHT } from '../world/engine/palette.js';
import { art, PAL } from './art.js';

const SIZE = Object.freeze({ open_ground: 0, seed: 0.35, sprout: 0.5, young: 0.7, in_leaf: 0.9, mature: 1.1, ancient: 1.3 });

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
  const treeFor = (f, scale = 1) => {
    if (f.stage === 'open_ground') return art('grassTuft', { seed: `bare:${f.id}` });
    const size = (SIZE[f.stage] ?? 0.8) * scale;
    return art('tree', { kind: 'round', size, seed: `fam:${f.id}`, tone: f.landmark ? 2 : f.stage === 'ancient' ? 1 : 0, autumn: season === 'autumn' && f.stage !== 'seed' && f.stage !== 'sprout' });
  };
  for (const f of families) {
    let fx, y;
    if (heroId && f.id === heroId) { fx = 0.5; y = 380; } else { [fx, y] = rows[ri % rows.length]; ri += 1; }
    const x = Math.round(fx * W + (r() - 0.5) * 14);
    objects.push({ id: f.id, family: f, x, y: y + Math.floor(ri / rows.length) * 4, art: treeFor(f), scale: f.stage === 'open_ground' ? 2.2 : 1, hero: f.id === heroId });
  }
  const lamps = [];
  for (const o of objects) if (o.family.landmark && night) lamps.push({ x: o.x, y: o.y - 30, r: 44, a: 0.4, color: PAL.glow });
  let selected = opts.selected ?? null;
  let t = 0;
  const fire = night ? Array.from({ length: 14 }, () => ({ x: 20 + r() * (W - 40), y: 80 + r() * 320, phase: r() * 6 })) : [];
  const scene = {
    W, H, backdrop: night ? '#1E3A20' : '#4F8E36', hour, atmo, focusY: 250,
    get terrainKey() { return `grove|${grove.slug}|${season}|${night}`; },
    terrain(ctx) {
      const grass = season === 'autumn' ? '#B9B857' : season === 'winter' ? '#C9D3D8' : PAL.grass;
      ctx.fillStyle = grass; ctx.fillRect(0, 0, W, H);
      const rr = rng(`grove-ground:${grove.slug}`);
      for (let i = 0; i < 30; i += 1) { const x = rr() * W, y = rr() * H, rad = 40 + rr() * 90; const g = ctx.createRadialGradient(x, y, 0, x, y, rad); const c = i % 2 ? PAL.grassLight : PAL.grassDark; g.addColorStop(0, hexA(c, 0.45)); g.addColorStop(1, hexA(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      // The wood's shade at the back, and a mossy floor.
      const g = ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, 'rgba(30,80,30,0.6)'); g.addColorStop(1, 'rgba(30,80,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 200);
      // A path to the front.
      ctx.strokeStyle = PAL.path; ctx.lineWidth = 24; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(W / 2 + 10, 150); ctx.quadraticCurveTo(W / 2 - 20, 320, W / 2, H + 10); ctx.stroke();
      const draw = (name, params, x, y, scale = 1) => { const a = art(name, params); ctx.drawImage(a.canvas, x - a.ax * scale, y - a.ay * scale, a.w * scale, a.h * scale); };
      for (let i = 0; i < 9; i += 1) draw('tree', { kind: i % 3 ? 'round' : 'pine', size: 1 + rr() * 0.5, seed: `bg${i % 6}`, tone: i % 3 }, 20 + i * 42, 60 + rr() * 30);
      for (let i = 0; i < 10; i += 1) draw('grassTuft', { seed: `gt${i % 8}` }, rr() * W, 120 + rr() * 380, 1.4);
      for (let i = 0; i < 5; i += 1) draw('flowerPatch', { seed: `gf${i}`, n: 4 }, rr() * W, 200 + rr() * 300);
      const g2 = ctx.createLinearGradient(0, H - 160, 0, H); g2.addColorStop(0, 'rgba(12,18,34,0)'); g2.addColorStop(1, 'rgba(12,18,34,0.5)'); ctx.fillStyle = g2; ctx.fillRect(0, H - 160, W, 160);
    },
    update(dt) { t += dt; },
    objects() {
      const out = objects.map((o) => {
        const isSel = selected && o.id === selected;
        return isSel ? [o, { x: o.x, y: 20000, art: art('bubble', { glyph: 'root', tone: 'ready' }), bob: -(o.art.h * o.scale) - 6 + Math.sin(t / 400) * 3 - 20000 + o.y }] : [o];
      }).flat();
      if (fire.length) out.push({ x: 0, y: 100000, draw: (ctx) => { for (const q of fire) { const a = 0.3 + 0.7 * Math.max(0, Math.sin(t / 450 + q.phase)); ctx.fillStyle = `rgba(248,241,154,${a})`; ctx.beginPath(); ctx.arc(q.x + Math.sin(t / 900 + q.phase) * 8, q.y + Math.cos(t / 1100 + q.phase) * 6, 1.6, 0, Math.PI * 2); ctx.fill(); } } });
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
  };
  return scene;
}

function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
