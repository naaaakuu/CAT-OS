/**
 * scene.js — the living village.
 *
 * Everything the renderer draws over the terrain comes from here, and all
 * of it is a pure function of the village state: the buildings at their
 * levels, the workers at their doors (working when there is work, idle
 * when there is not), the neighbours walking the paths, the animals the
 * plots brought, Wick on his rounds, the trees, the smoke, the birds, the
 * lamps at night. Nothing is decoration on a timer; every person and
 * animal is here because the learner made the village that holds them.
 *
 * Animation is deliberately sparse: idle → anticipation → action → settle.
 * A worker bobs, turns a page, waters a bed; a sheep grazes and moves on.
 */

import { rng, LIGHT } from '../world/engine/palette.js';
import { art, PAL } from './art.js';
import { WORLD, BUILDINGS, PLOTS, HOUSE_SPOTS, CHARACTERS, NEIGHBOURS } from './defs.js';
import { paintTerrain, PATHS, POND, RIVER, BRIDGE, nearPath, inPond, nearRiver, nearBuilding, inPlot } from './terrain.js';

/* ------------------------------------------------------------------ */
/* Living things                                                       */
/* ------------------------------------------------------------------ */

/** A worker at a door: stands, bobs, blinks, works when there is work. */
function worker({ x, y, look, working, seed, prop }) {
  const r = rng(`worker:${seed}`);
  let t = r() * 4000, next = 3000 + r() * 4000, mode = working ? 'work' : 'idle', face = r() > 0.5 ? 1 : -1;
  let burst = 0;
  return {
    kind: 'worker',
    update(dt) {
      t += dt; next -= dt;
      if (burst > 0) burst -= dt;
      if (next <= 0) { next = 3500 + r() * 6000; if (!working) { face = r() > 0.6 ? -face : face; mode = r() > 0.75 ? 'wave' : 'idle'; } else { mode = r() > 0.2 ? 'work' : 'idle'; } }
    },
    /** A short reaction: a cheer with hearts, when something is delivered or built. */
    cheer(ms = 2600) { burst = ms; },
    objects() {
      const cheering = burst > 0;
      const pose = cheering ? 'cheer' : mode;
      const frame = Math.floor(t / (pose === 'work' ? 340 : 520)) % 2;
      const bob = cheering ? -Math.abs(Math.sin(t / 160)) * 6 : 0;
      const out = [{ x, y, art: art('person', { ...look, prop: prop ?? look.prop ?? null, pose, frame }), flip: face < 0, bob }];
      if (cheering) for (let i = 0; i < 3; i += 1) { const a = burst / ms; out.push({ x: x + (i - 1) * 12, y: y - 44 - (1 - a) * 22 - i * 4, z: 900, alpha: Math.max(0, a), art: art('icon', { glyph: 'heart', size: 10 }) }); }
      return out;
    },
    get y() { return y; },
    at: { x, y },
  };
}
const ms = 2600;

/** A villager walking a route, there and back, pausing at the ends. */
function walker(route, look, index = 0) {
  const r = rng(`walker:${index}`);
  const speed = 0.028 + r() * 0.012;
  let t = r() * 4000, leg = 0, p = r(), dir = 1, pause = 0;
  let pos = { x: route[0][0], y: route[0][1] }, facing = 1;
  return {
    kind: 'walker',
    update(dt) {
      t += dt;
      if (pause > 0) { pause -= dt; return; }
      const from = dir > 0 ? route[leg] : route[leg + 1], to = dir > 0 ? route[leg + 1] : route[leg];
      if (!from || !to) { dir = -dir; return; }
      const dist = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
      p += (speed * dt) / dist;
      if (p >= 1) {
        p = 0;
        if (dir > 0) { leg += 1; if (leg >= route.length - 1) { leg = route.length - 2; dir = -1; pause = 1800 + r() * 3200; } }
        else { leg -= 1; if (leg < 0) { leg = 0; dir = 1; pause = 1800 + r() * 3200; } }
      }
      const f2 = dir > 0 ? route[leg] : route[leg + 1], t2 = dir > 0 ? route[leg + 1] : route[leg];
      if (f2 && t2) { pos = { x: f2[0] + (t2[0] - f2[0]) * p, y: f2[1] + (t2[1] - f2[1]) * p }; facing = t2[0] >= f2[0] ? 1 : -1; }
    },
    objects() { return [{ x: pos.x, y: pos.y, art: art('person', { ...look, pose: pause > 0 ? 'idle' : 'walk', frame: Math.floor(t / 260) % 2 }), flip: facing < 0 }]; },
    get y() { return pos.y; },
  };
}

/** Grazing animals in a rect: wander, stop, face where they go. */
function grazers({ rect, count, kind, seed }) {
  const r = rng(`graze:${seed}`);
  const herd = Array.from({ length: count }, (_, i) => ({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, tx: 0, ty: 0, face: r() > 0.5 ? 1 : -1, pause: r() * 5000, t: r() * 3000, v: 0.012 + r() * 0.008, i }));
  for (const a of herd) { a.tx = rect.x + r() * rect.w; a.ty = rect.y + r() * rect.h; }
  return {
    kind: 'grazers',
    update(dt) {
      for (const a of herd) {
        a.t += dt;
        if (a.pause > 0) { a.pause -= dt; continue; }
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d < 2) { a.tx = rect.x + r() * rect.w; a.ty = rect.y + r() * rect.h; a.pause = 2500 + r() * 8000; continue; }
        a.x += (dx / d) * a.v * dt; a.y += (dy / d) * a.v * dt;
        if (Math.abs(dx) > 0.8) a.face = dx > 0 ? 1 : -1;
      }
    },
    objects() { return herd.map((a) => ({ x: a.x, y: a.y, art: art(kind, { frame: a.pause <= 0 ? Math.floor(a.t / 300) % 2 : 0 }), flip: a.face > 0 })); },
  };
}

/** Ducks paddling the pond. */
function ducks({ count, seed }) {
  const r = rng(`ducks:${seed}`);
  const ds = Array.from({ length: count }, () => ({ a: r() * Math.PI * 2, rr: 0.3 + r() * 0.5, v: (r() > 0.5 ? 1 : -1) * (0.00012 + r() * 0.0001), t: r() * 2000 }));
  return {
    kind: 'ducks',
    update(dt) { for (const d of ds) { d.a += d.v * dt; d.t += dt; } },
    objects() { return ds.map((d) => { const x = POND.cx + Math.cos(d.a) * POND.rx * d.rr, y = POND.cy + Math.sin(d.a) * POND.ry * d.rr; return { x, y, art: art('duck', { frame: Math.floor(d.t / 500) % 2 }), flip: Math.cos(d.a + Math.PI / 2) * d.v < 0 }; }); },
  };
}

/** Butterflies over a patch. */
function butterflies({ rect, count, seed }) {
  const r = rng(`bf:${seed}`);
  const bs = Array.from({ length: count }, (_, i) => ({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, color: i % 7, phase: r() * 1000 }));
  let t = 0;
  return {
    kind: 'butterflies',
    update(dt) {
      t += dt;
      for (const b of bs) {
        b.x += Math.sin((t + b.phase) / 520) * 0.06 * dt + Math.cos((t + b.phase) / 1900) * 0.03 * dt;
        b.y += Math.cos((t + b.phase) / 610) * 0.04 * dt;
        if (b.x < rect.x) b.x = rect.x + rect.w; if (b.x > rect.x + rect.w) b.x = rect.x;
        if (b.y < rect.y) b.y = rect.y + rect.h; if (b.y > rect.y + rect.h) b.y = rect.y;
      }
    },
    objects() { return bs.map((b) => ({ x: b.x, y: b.y, z: 600, art: art('butterfly', { color: b.color, frame: Math.floor((t + b.phase) / 140) % 2 }) })); },
  };
}

/** Chimney smoke: puffs rising and fading. */
function smoke({ x, y, seed }) {
  const r = rng(`smoke:${seed}`);
  const puffs = [];
  let acc = 0;
  return {
    kind: 'smoke',
    update(dt) {
      acc += dt;
      if (acc > 900 && puffs.length < 6) { acc = 0; puffs.push({ x, y, t: 0, dx: (r() - 0.5) * 0.03 }); }
      for (const p of puffs) { p.t += dt; p.y -= 0.016 * dt; p.x += p.dx * dt + Math.sin(p.t / 500) * 0.06; }
      while (puffs.length && puffs[0].t > 4000) puffs.shift();
    },
    objects() { return puffs.map((p) => ({ x: p.x, y: p.y, z: 800, alpha: Math.max(0, 0.7 * (1 - p.t / 4000)), art: art('puff', { size: 1 + Math.min(2.2, p.t / 1400) }) })); },
  };
}

/** Sunlight on the water: short flat highlights that come and go, and the river's flow. */
function water({ night }) {
  const r = rng('water');
  const glints = [];
  for (let i = 0; i < 70; i += 1) {
    const [x, y] = RIVER[Math.floor(r() * (RIVER.length - 1))];
    glints.push({ x: x + (r() - 0.5) * 30, y: y + (r() - 0.5) * 6, phase: r() * 6, len: 4 + r() * 6, river: true });
  }
  for (let i = 0; i < 26; i += 1) {
    const a = r() * Math.PI * 2, rad = r() * 0.85;
    glints.push({ x: POND.cx + Math.cos(a) * POND.rx * rad, y: POND.cy + Math.sin(a) * POND.ry * rad, phase: r() * 6, len: 4 + r() * 8, river: false });
  }
  let t = 0;
  return {
    kind: 'water',
    update(dt) { t += dt; },
    objects() {
      return [{ x: 0, y: -9000, draw: (ctx, tt, view) => {
        ctx.strokeStyle = night ? 'rgba(210,225,255,0.55)' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath();
        for (const g of glints) {
          if (g.x < view.x - 20 || g.x > view.x + view.w + 20 || g.y < view.y - 20 || g.y > view.y + view.h + 20) continue;
          const a = Math.sin(t / 700 + g.phase);
          if (a <= 0.35) continue;
          const dx = g.river ? 0 : a * 2;
          ctx.moveTo(g.x + dx - g.len / 2, g.y + (g.river ? (t / 60) % 12 - 6 : 0)); ctx.lineTo(g.x + dx + g.len / 2, g.y + (g.river ? (t / 60) % 12 - 6 : 0));
        }
        ctx.stroke();
        // The river's flow: a pale thread moving downstream.
        ctx.save(); ctx.setLineDash([18, 26]); ctx.lineDashOffset = -(t / 18) % 44;
        ctx.strokeStyle = night ? 'rgba(200,215,245,0.22)' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 4;
        ctx.beginPath(); RIVER.forEach(([x, y], i) => (i ? ctx.lineTo(x + Math.sin(i) * 6, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.restore();
        if (night) {
          // The moon on the pond.
          ctx.save(); ctx.translate(POND.cx + 20, POND.cy - 14); ctx.scale(1, 0.4);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
          g.addColorStop(0, 'rgba(255,250,225,0.55)'); g.addColorStop(0.5, 'rgba(255,250,225,0.18)'); g.addColorStop(1, 'rgba(255,250,225,0)');
          ctx.fillStyle = g; ctx.fillRect(-30, -30, 60, 60); ctx.restore();
        }
      } }];
    },
  };
}

/** Koi circling the pond: one for every dozen twins told apart. */
function koiSwim({ count, seed }) {
  const r = rng(`koi:${seed}`);
  const fish = Array.from({ length: count }, (_, i) => ({ a: r() * Math.PI * 2, v: (0.00018 + r() * 0.00014) * (r() > 0.5 ? 1 : -1), rad: 0.3 + r() * 0.5, variant: i % 4, t: r() * 1000 }));
  return {
    kind: 'koi',
    update(dt) { for (const f of fish) { f.a += f.v * dt; f.t += dt; } },
    objects() {
      return fish.map((f) => {
        const x = POND.cx + Math.cos(f.a) * POND.rx * f.rad, y = POND.cy + Math.sin(f.a) * POND.ry * f.rad;
        const heading = f.a + (f.v > 0 ? Math.PI / 2 : -Math.PI / 2);
        return { x, y: -8500, draw: (ctx) => { const a = art('koi', { variant: f.variant, frame: Math.floor(f.t / 260) % 2 }); ctx.save(); ctx.translate(x, y); ctx.rotate(heading + Math.PI); ctx.globalAlpha = 0.9; ctx.drawImage(a.canvas, -a.ax, -a.ay, a.w, a.h); ctx.restore(); } };
      });
    },
  };
}

/** Drifting things in the air: pollen by day, leaves in autumn, petals in spring, snow in winter, fireflies at night. */
function drift({ kind, rect, count, seed }) {
  const r = rng(`drift:${kind}:${seed}`);
  const ps = Array.from({ length: count }, () => ({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, t: r() * 5000, phase: r() * 6, amp: 0.4 + r() * 0.8, c: Math.floor(r() * 5), vy: 0.012 + r() * 0.014 }));
  return {
    kind,
    update(dt) {
      for (const q of ps) {
        q.t += dt;
        if (kind === 'fireflies' || kind === 'pollen') { q.x += Math.sin(q.t / 900 + q.phase) * 0.05 * dt; q.y += Math.cos(q.t / 1100 + q.phase) * 0.03 * dt; }
        else { q.y += q.vy * dt; q.x += Math.sin(q.t / 600 + q.phase) * q.amp * 0.06 * dt; if (q.y > rect.y + rect.h) { q.y = rect.y; q.x = rect.x + r() * rect.w; } }
        if (q.x < rect.x) q.x = rect.x + rect.w; if (q.x > rect.x + rect.w) q.x = rect.x;
        if (q.y < rect.y) q.y = rect.y + rect.h; if (q.y > rect.y + rect.h) q.y = rect.y;
      }
    },
    objects() {
      if (kind === 'leaves' || kind === 'petals') return ps.map((q) => ({ x: q.x, y: q.y, z: 700, art: art('leaf', { color: kind === 'petals' ? 3 + (q.c % 2) : q.c % 3 }), rot: Math.sin(q.t / 500 + q.phase) * 0.8 }));
      return [{ x: 0, y: 100000, draw: (ctx, tt, view) => {
        for (const q of ps) {
          if (q.x < view.x || q.x > view.x + view.w || q.y < view.y || q.y > view.y + view.h) continue;
          if (kind === 'fireflies') { const a = 0.3 + 0.7 * Math.max(0, Math.sin(q.t / 450 + q.phase)); ctx.fillStyle = `rgba(248,241,154,${a})`; ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2); ctx.fill(); }
          else if (kind === 'pollen') { ctx.fillStyle = 'rgba(255,248,205,0.8)'; ctx.fillRect(q.x, q.y, 1.6, 1.6); }
          else if (kind === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2); ctx.fill(); }
        }
      } }];
    },
    lights() { return kind === 'fireflies' ? ps.filter((q, i) => i % 2 === 0).map((q) => ({ x: q.x, y: q.y, r: 14, a: 0.12 + 0.18 * Math.max(0, Math.sin(q.t / 450 + q.phase)), color: '#F8F19A' })) : []; },
  };
}

/** A flock crossing now and then. */
function birds({ seed }) {
  const r = rng(`birds:${seed}`);
  const flock = [];
  let next = 4000 + r() * 8000, t = 0;
  return {
    kind: 'birds',
    update(dt) {
      t += dt; next -= dt;
      if (next <= 0 && flock.length === 0) {
        const dir = r() > 0.5 ? 1 : -1, y0 = 120 + r() * 500;
        for (let i = 0; i < 4; i += 1) flock.push({ x: dir > 0 ? -30 - i * 14 : WORLD.W + 30 + i * 14, y: y0 + (i % 2) * 6 + i * 3, dir, phase: r() * 10 });
        next = 15000 + r() * 25000;
      }
      for (const b of flock) { b.x += b.dir * 0.09 * dt; b.y += Math.sin((t + b.phase * 1000) / 800) * 0.02 * dt; }
      for (let i = flock.length - 1; i >= 0; i -= 1) if (flock[i].x < -60 || flock[i].x > WORLD.W + 60) flock.splice(i, 1);
    },
    objects() { return flock.map((b) => ({ x: b.x, y: b.y, z: 5000, art: art('bird', { frame: Math.floor(t / 160 + b.phase) % 2 }), flip: b.dir < 0 })); },
  };
}

/** Cloud shadows drifting over the ground: depth for nothing. */
function cloudShadows({ seed, count = 4 }) {
  const r = rng(`cs:${seed}`);
  const cs = Array.from({ length: count }, () => ({ x: r() * WORLD.W, y: r() * WORLD.H, w: 140 + r() * 100, v: 0.006 + r() * 0.005 }));
  return {
    kind: 'clouds',
    update(dt) { for (const c of cs) { c.x += c.v * dt; if (c.x - c.w > WORLD.W) c.x = -c.w; } },
    objects() { return cs.map((c) => ({ x: c.x, y: -10000, art: art('cloudShadow', { w: Math.round(c.w / 20) * 20 }), bob: c.y + 10000 })); },
  };
}

/**
 * Wick, on his rounds: from the Hearth's step to wherever the village is
 * pointing, and back. He sits a while at either end. At night he carries
 * his lamp.
 */
function companion({ route, night, seed, start = 'home' }) {
  const r = rng(`wick:${seed}`);
  const speed = 0.02;
  const legs = Math.max(1, route.length - 1);
  let t = 0, leg = start === 'far' ? legs - 1 : 0, p = start === 'far' ? 1 : 0, dir = start === 'far' ? -1 : 1;
  let rest = start === 'far' ? 6000 + r() * 5000 : 2200 + r() * 2600, blinkAt = 2400;
  let pos = { x: route[start === 'far' ? route.length - 1 : 0][0], y: route[start === 'far' ? route.length - 1 : 0][1] }, facing = 1;
  return {
    kind: 'companion',
    update(dt) {
      t += dt; blinkAt -= dt;
      if (blinkAt <= -170) blinkAt = 2800 + r() * 4200;
      if (rest > 0) { rest -= dt; return; }
      const from = route[leg], to = route[leg + 1];
      if (!from || !to) { leg = 0; dir = 1; p = 0; return; }
      const dist = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
      p += (speed * dt) / dist;
      if (p >= 1) {
        p = 0; leg += dir;
        if (leg >= legs) { leg = legs - 1; dir = -1; rest = 4000 + r() * 7000; }
        else if (leg < 0) { leg = 0; dir = 1; rest = 5000 + r() * 9000; }
        else if (r() > 0.7) rest = 1400 + r() * 2600;
      }
      const a = route[leg], b = route[leg + 1];
      if (a && b) { const q = dir > 0 ? p : 1 - p; pos = { x: a[0] + (b[0] - a[0]) * q, y: a[1] + (b[1] - a[1]) * q }; facing = (b[0] - a[0]) * dir >= 0 ? 1 : -1; }
    },
    objects() { return [{ x: pos.x, y: pos.y, art: art('wick', { pose: rest <= 0 ? 'walk' : 'sit', frame: Math.floor(t / 380) % 2, lamp: night, blink: blinkAt <= 0 }), flip: facing < 0 }]; },
    lights() { return night ? [{ x: pos.x + (facing < 0 ? 10 : -10), y: pos.y - 6, r: 34, a: 0.45, color: PAL.glow }] : []; },
    get at() { return { x: pos.x, y: pos.y }; },
  };
}

/* ------------------------------------------------------------------ */
/* The scene                                                           */
/* ------------------------------------------------------------------ */

/**
 * @param {object} state  the world state (with .village)
 * @param {object} atmo   { hour, season, weather }
 * @param {object} [opts] { focus: buildingId|null, working: Set<buildingId> }
 */
export function buildVillageScene(state, atmo, opts = {}) {
  const v = state.village;
  const { hour, season } = atmo;
  const night = hour === 'night' || hour === 'dusk';
  const statics = [];
  const lamps = [];
  const life = [];
  const workers = new Map();
  const r = rng('village-scene');
  const focus = opts.focus ?? null;
  const working = opts.working ?? new Set();
  const practicedToday = state.hearth?.practicedToday;
  const stageWorth = v.worth;

  /* ---- Buildings and the people at their doors ---- */
  const anchors = [];
  for (const bv of v.buildings) {
    const def = bv.def;
    if (!bv.built) {
      // An unbuilt building is a plot with a sign: ground marked out, a board.
      if (bv.standing) {
        statics.push({ x: def.at.x, y: def.at.y + 2, z: -2, art: art('plotSign', { kind: 'sale' }) });
        statics.push({ x: def.at.x - def.hit.w / 2 + 4, y: def.at.y - 2, z: -3, art: art('fence', { w: Math.round(def.hit.w * 0.4) }), alpha: 0.85 });
        statics.push({ x: def.at.x + def.hit.w / 2 - 4, y: def.at.y - 2, z: -3, art: art('fence', { w: Math.round(def.hit.w * 0.4) }), alpha: 0.85 });
      }
      anchors.push({ id: def.id, x: def.at.x, y: def.at.y - 28, built: false });
      continue;
    }
    if (def.id === 'road') {
      statics.push({ x: 560, y: 1046, art: art('signpost', { arrows: 2 }) });
      statics.push({ x: 646, y: 1052, art: art('lamp', { lit: night }) });
      if (night) lamps.push({ x: 646, y: 1030, r: 44, a: 0.5, color: PAL.glow });
      if ((v.levels.get('road') ?? 0) >= 2) for (let i = 0; i < 4; i += 1) { const x = i % 2 ? 640 : 560, y = 1090 + i * 26; statics.push({ x, y, art: art('lamp', { lit: true }) }); lamps.push({ x, y: y - 22, r: night ? 40 : 18, a: night ? 0.5 : 0.15, color: PAL.glow }); }
      statics.push({ x: 600, y: 1000, art: art('cart', { load: 'crates' }) });
      anchors.push({ id: def.id, x: 600, y: 990, built: true });
      continue;
    }
    const sprite = art('building', { id: def.art, level: bv.level, night });
    statics.push({ x: def.at.x, y: def.at.y, art: sprite, building: def.id });
    anchors.push({ id: def.id, x: def.at.x, y: def.at.y - sprite.ay + 4, built: true });
    if (night) {
      lamps.push({ x: def.at.x, y: def.at.y - 22, r: 52, a: 0.32, color: PAL.glow });
    }
    if (def.id === 'hearth') {
      statics.push({ x: def.at.x - 74, y: def.at.y - 16, art: art('fence', { w: 38 }) });
      statics.push({ x: def.at.x + 78, y: def.at.y - 14, art: art('fence', { w: 38 }) });
      statics.push({ x: def.at.x + 66, y: def.at.y - 30, art: art('crate') });
      statics.push({ x: def.at.x - 58, y: def.at.y + 24, art: art('bench') });
      if (bv.level >= 2 && practicedToday) life.push(smoke({ x: def.at.x + 32, y: def.at.y - 58, seed: 'hearth' }));
      statics.push({ x: def.at.x - 62, y: def.at.y + 6, art: art('flowerPatch', { seed: 'hf1', n: 6 }) });
      statics.push({ x: def.at.x + 64, y: def.at.y + 8, art: art('bush', { seed: 'hb', flowers: bv.level >= 3 }) });
      if (bv.level >= 3) life.push(grazers({ rect: { x: def.at.x - 60, y: def.at.y + 4, w: 120, h: 30 }, count: 1, kind: 'dog', seed: 'hearth-dog' }));
      if (bv.level >= 4 && night) lamps.push({ x: def.at.x - 32, y: def.at.y - 20, r: 40, a: 0.5, color: PAL.glow });
    }
    if (def.id === 'roots' && bv.level >= 2) life.push(smoke({ x: def.at.x - 22, y: def.at.y - 60, seed: 'roots' }));
    if (def.id === 'garden') {
      statics.push({ x: def.at.x + 78, y: def.at.y + 6, art: art('beds', { seed: 'gb2', w: 44, rows: 3, grown: 0.4 + Math.min(0.6, (state.meadow?.mastered ?? 0) / 200), flowers: true }) });
      if (bv.level >= 3) statics.push({ x: def.at.x - 64, y: def.at.y + 4, art: art('hive') });
      life.push(butterflies({ rect: { x: def.at.x - 80, y: def.at.y - 40, w: 200, h: 90 }, count: 2 + Math.min(4, Math.floor((state.meadow?.mastered ?? 0) / 60)), seed: 'garden' }));
    }
    if (def.id === 'market') {
      statics.push({ x: def.at.x - 70, y: def.at.y + 6, art: art('crate', { kind: 'barrel' }) });
      statics.push({ x: def.at.x + 66, y: def.at.y + 4, art: art('hay') });
    }
    if (def.id === 'loom') statics.push({ x: def.at.x + 70, y: def.at.y + 6, art: art('crate', { kind: 'sack' }) });
    if (def.id === 'reading') statics.push({ x: def.at.x - 72, y: def.at.y + 4, art: art('bench') });
    // The worker, at the door.
    const ch = def.character ? CHARACTERS[def.character] : null;
    if (ch?.look) {
      const w = worker({ x: def.at.x + (def.id === 'market' ? -30 : 34), y: def.at.y + 12, look: ch.look, working: working.has(def.id) || (bv.helper?.available ?? 0) > 0, seed: def.id });
      workers.set(def.id, w);
      life.push(w);
    }
  }

  /* ---- Land: fenced plots waiting, or what stands on them ---- */
  for (const pv of v.plotViews) {
    const def = pv.def;
    const { x, y, w, h } = def.rect;
    if (!pv.open) {
      if (pv.standing) {
        statics.push({ x: def.at.x, y: y + h - 6, z: -1, art: art('plotSign', { kind: 'sale' }) });
        anchors.push({ id: `plot:${def.id}`, x: def.at.x, y: y + h - 34, plot: true });
      }
      continue;
    }
    if (def.id === 'pen') {
      statics.push({ x: x + w / 2, y: y + 14, z: -1, art: art('fence', { w: w - 24 }) });
      statics.push({ x: x + w / 2, y: y + h - 2, art: art('fence', { w: w - 24, gate: true }) });
      statics.push({ x: x + 6, y: y + h / 2 + 6, art: art('fence', { w: 12 }) });
      statics.push({ x: x + w - 6, y: y + h / 2 + 6, art: art('fence', { w: 12 }) });
      statics.push({ x: x + w - 30, y: y + 40, art: art('hay') });
      life.push(grazers({ rect: { x: x + 20, y: y + 26, w: w - 44, h: h - 44 }, count: 3, kind: 'sheep', seed: 'pen' }));
    } else if (def.id === 'orchard') {
      for (let i = 0; i < 8; i += 1) { const col = i % 4, row = Math.floor(i / 4); statics.push({ x: x + 30 + col * 44, y: y + 50 + row * 70, art: art('tree', { kind: 'round', size: 0.85, seed: `orch${i}`, tone: 2 }) }); }
      statics.push({ x: x + w - 26, y: y + h - 10, art: art('crate') });
    } else if (def.id === 'farm') {
      statics.push({ x: x + w - 60, y: y + h - 20, art: art('building', { id: 'hearth', level: 1, night }), scale: 0.72 });
      statics.push({ x: x + 40, y: y + h - 12, art: art('cart') });
      statics.push({ x: x + w / 2, y: y + h - 2, art: art('fence', { w: w - 30, gate: true }) });
      life.push(grazers({ rect: { x: x + 20, y: y + h - 70, w: w - 60, h: 50 }, count: 4, kind: 'chicken', seed: 'farm' }));
      for (let i = 0; i < 3; i += 1) statics.push({ x: x + 30 + i * 26, y: y + h - 28, art: art('hay') });
    } else if (def.id === 'mill') {
      statics.push({ x: x + w / 2, y: y + h - 16, art: art('building', { id: 'roots', level: 1, night }), scale: 0.9 });
      statics.push({ x: x + 30, y: y + h - 10, art: art('crate', { kind: 'sack' }) });
      statics.push({ x: x + 50, y: y + h - 8, art: art('crate', { kind: 'sack' }) });
      life.push(smoke({ x: x + w / 2 - 20, y: y + h - 72, seed: 'mill' }));
    } else if (def.id === 'square') {
      statics.push({ x: x + w / 2, y: y + h / 2 + 12, art: art('well') });
      statics.push({ x: x + 24, y: y + h - 8, art: art('bench') });
      statics.push({ x: x + w - 24, y: y + h - 8, art: art('bench') });
      statics.push({ x: x + 14, y: y + 16, art: art('lamp', { lit: night }) });
      statics.push({ x: x + w - 14, y: y + 16, art: art('lamp', { lit: night }) });
      if (night) { lamps.push({ x: x + 14, y: y - 4, r: 40, a: 0.5, color: PAL.glow }); lamps.push({ x: x + w - 14, y: y - 4, r: 40, a: 0.5, color: PAL.glow }); }
    }
  }

  /* ---- Neighbours' houses, and the neighbours themselves ---- */
  for (let i = 0; i < v.houses; i += 1) {
    const spot = HOUSE_SPOTS[i];
    statics.push({ x: spot.x, y: spot.y, art: art('building', { id: 'hearth', level: 1 + (i % 2), night }), scale: 0.8, house: i });
    statics.push({ x: spot.x + 52, y: spot.y + 4, art: art('bush', { seed: `hb${i}`, berries: i % 3 === 0 }) });
    if (night) lamps.push({ x: spot.x, y: spot.y - 18, r: 40, a: 0.3, color: PAL.glow });
    const nb = NEIGHBOURS[i % NEIGHBOURS.length];
    const route = PATHS[[2, 3, 6, 8, 4, 5, 0, 7, 1, 9][i % 10]];
    life.push(walker(route, nb.look, i));
  }
  if (v.nextHouse) {
    const spot = v.nextHouse.at;
    if (v.nextHouse.standing) statics.push({ x: spot.x, y: spot.y + 2, z: -1, art: art('plotSign', { kind: 'sale' }) });
    anchors.push({ id: `house:${v.nextHouse.n}`, x: spot.x, y: spot.y - 30, house: true });
  }

  /* ---- Trees, bushes, flowers, rocks: a village in a wood ---- */
  // Hand-placed trees in the middle of the village: a village needs shade.
  for (const [x, y, kind, size, tone] of [
    [560, 420, 'round', 1.2, 0], [660, 300, 'round', 1.0, 1], [830, 400, 'pine', 1.1, 0], [850, 500, 'round', 0.9, 2],
    [330, 430, 'round', 1.1, 1], [360, 660, 'round', 0.9, 0], [520, 760, 'round', 1.0, 2], [700, 880, 'round', 1.1, 0],
    [860, 800, 'pine', 1.0, 1], [820, 940, 'round', 0.9, 0], [470, 900, 'pine', 0.9, 1], [200, 560, 'pine', 1.2, 0],
    [240, 640, 'round', 1.0, 2], [690, 560, 'round', 0.8, 1], [560, 220, 'pine', 1.3, 0], [400, 220, 'round', 1.1, 0],
    [760, 240, 'round', 1.0, 2], [1000, 470, 'round', 1.0, 1], [1030, 860, 'round', 1.1, 0], [180, 990, 'round', 1.0, 1],
    [720, 1020, 'round', 0.9, 2], [480, 1090, 'pine', 1.1, 0],
  ]) {
    if (nearBuilding(x, y, 30) || inPlot(x, y)) continue;
    const treeParams = { kind, size, seed: `hp${(x + y) % 6}`, tone, autumn: season === 'autumn' && kind === 'round' };
    statics.push({ x, y, art: art('tree', treeParams), sway: (x * 7 + y) % 6, treeParams });
  }
  const tr = rng('village-trees');
  const treeCount = 230;
  for (let i = 0; i < treeCount; i += 1) {
    const x = 20 + tr() * (WORLD.W - 40), y = 30 + tr() * (WORLD.H - 60);
    const edge = Math.min(x, WORLD.W - x, y * 1.4, (WORLD.H - y) * 1.6);
    // Dense at the edges, sparse inside; never on a path, in water, on a building or a plot.
    const keep = tr() < (edge < 120 ? 0.95 : edge < 240 ? 0.55 : 0.22);
    if (!keep) continue;
    if (nearPath(x, y, 26) || inPond(x, y, 36) || nearRiver(x, y, 46) || nearBuilding(x, y, 46) || inPlot(x, y)) continue;
    if (Math.abs(x - BRIDGE.x) < 70 && Math.abs(y - BRIDGE.y) < 60) continue;
    const pine = tr() > 0.62;
    const size = [0.8, 1, 1.2, 1.4][Math.floor(tr() * 4)];
    const treeParams = { kind: pine ? 'pine' : 'round', size, seed: `t${i % 6}`, tone: Math.floor(tr() * 3), autumn: season === 'autumn' && !pine };
    statics.push({ x, y, art: art('tree', treeParams), sway: tr() * 6.28, treeParams });
  }
  // Flowers along the paths, so the middle of the village is not bare grass.
  const fr = rng('village-flowers');
  for (let i = 0; i < 60; i += 1) {
    const path = PATHS[Math.floor(fr() * PATHS.length)];
    const [px, py] = path[Math.floor(fr() * path.length)];
    const side = fr() > 0.5 ? 1 : -1;
    const x = px + side * (24 + fr() * 14), y = py + (fr() - 0.5) * 20;
    if (inPond(x, y, 30) || nearRiver(x, y, 40) || nearBuilding(x, y, 24) || inPlot(x, y)) continue;
    statics.push({ x, y, art: art(fr() > 0.7 ? 'grassTuft' : 'flowerPatch', { seed: `pf${i}`, n: 5, w: 22, h: 13 }), scale: fr() > 0.7 ? 1.6 : 1.25 });
  }
  const br = rng('village-bushes');
  for (let i = 0; i < 40; i += 1) {
    const x = 60 + br() * (WORLD.W - 120), y = 80 + br() * (WORLD.H - 160);
    if (nearPath(x, y, 22) || inPond(x, y, 30) || nearRiver(x, y, 40) || nearBuilding(x, y, 30) || inPlot(x, y)) continue;
    statics.push({ x, y, art: art(br() > 0.5 ? 'bush' : 'flowerPatch', { seed: `b${i}`, n: 5, berries: br() > 0.7 }) });
  }
  for (let i = 0; i < 14; i += 1) {
    const x = 60 + br() * (WORLD.W - 120), y = 80 + br() * (WORLD.H - 160);
    if (nearPath(x, y, 20) || inPond(x, y, 30) || nearRiver(x, y, 30) || nearBuilding(x, y, 30) || inPlot(x, y)) continue;
    statics.push({ x, y, art: art('rock', { seed: `r${i}`, size: 0.7 + br() * 0.9 }) });
  }
  // Reeds and a stump by the pond, a stump or two by the wood.
  for (let i = 0; i < 5; i += 1) { const a = 0.6 + i * 0.5; statics.push({ x: POND.cx + Math.cos(a) * (POND.rx + 8), y: POND.cy + Math.sin(a) * (POND.ry + 6) + 4, art: art('grassTuft', { seed: `pr${i}` }), scale: 1.6 }); }
  statics.push({ x: 236, y: 848, art: art('stump', { seed: 'ps' }) });
  // Lamps along the main street once there is a market.
  if (v.builtIds.has('market')) {
    for (const [x, y] of [[560, 760], [640, 790]]) { statics.push({ x, y, art: art('lamp', { lit: night }) }); if (night) lamps.push({ x, y: y - 22, r: 44, a: 0.5, color: PAL.glow }); }
  }

  /* ---- Animals that came with the village ---- */
  if (stageWorth >= 20) life.push(ducks({ count: Math.min(4, 1 + Math.floor(stageWorth / 60)), seed: 'pond' }));
  {
    // Koi arrive with every dozen look-alike twins told apart (the pond is the Word Garden's water).
    const koiCount = Math.min(8, Math.floor((state.pond?.mastered ?? 0) / 12) + ((state.pond?.known ?? 0) >= 5 ? 1 : 0));
    if (koiCount > 0) life.push(koiSwim({ count: koiCount, seed: 'pond' }));
  }

  /* ---- The environment: water that catches light, air with things in it ---- */
  life.push(water({ night }));
  if (night && season !== 'winter') {
    life.push(drift({ kind: 'fireflies', rect: { x: 320, y: 480, w: 240, h: 200 }, count: 10 + Math.min(14, Math.floor((state.meadow?.mastered ?? 0) / 40)), seed: 'garden' }));
    life.push(drift({ kind: 'fireflies', rect: { x: 40, y: 60, w: 500, h: 160 }, count: 8, seed: 'wood' }));
  }
  if (!night && season !== 'winter' && atmo.weather !== 'rain') life.push(drift({ kind: 'pollen', rect: { x: 330, y: 480, w: 230, h: 180 }, count: 14, seed: 'garden' }));
  if (season === 'autumn') life.push(drift({ kind: 'leaves', rect: { x: 0, y: 0, w: WORLD.W, h: WORLD.H }, count: 22, seed: 'leaves' }));
  if (season === 'spring') life.push(drift({ kind: 'petals', rect: { x: 200, y: 200, w: 700, h: 600 }, count: 14, seed: 'petals' }));
  if (atmo.weather === 'snow') life.push(drift({ kind: 'snow', rect: { x: 0, y: 0, w: WORLD.W, h: WORLD.H }, count: 140, seed: 'snow' }));

  /* ---- Wick ---- */
  {
    const hearth = BUILDINGS.find((b) => b.id === 'hearth');
    const toward = focus ?? v.tip?.building ?? 'reading';
    const far = BUILDINGS.find((b) => b.id === toward)?.at ?? BUILDINGS.find((b) => b.id === 'reading').at;
    life.push(companion({
      route: [[hearth.at.x - 30, hearth.at.y + 12], [hearth.at.x - 10, hearth.at.y + 40], [(hearth.at.x + far.x) / 2, (hearth.at.y + far.y) / 2 + 20], [far.x - 40, far.y + 14]],
      night, seed: toward, start: focus ? 'far' : 'home',
    }));
  }

  /* ---- Sky ---- */
  life.push(birds({ seed: 'sky' }));
  if (!night) life.push(cloudShadows({ seed: 'sky', count: 3 }));

  /* ---- Sprites the first minute will want, rendered a few per frame
          after the first paint rather than all at once: the trees' other
          two poses, the workers' other frames. ---- */
  const pending = [];
  {
    const seen = new Set();
    for (const st of statics) {
      if (!st.treeParams) continue;
      const k = JSON.stringify(st.treeParams);
      if (seen.has(k)) continue;
      seen.add(k);
      pending.push({ ...st.treeParams }, { ...st.treeParams, lean: 1 }, { ...st.treeParams, lean: -1 });
    }
  }
  let warmSince = 0;

  const scene = {
    W: WORLD.W, H: WORLD.H,
    backdrop: night ? '#1E3A20' : '#4F8E36',
    hour, atmo, season,
    /** Render up to two pending sprites per frame, at the renderer's bucket, once the village has been on screen a moment. */
    warm(bucket, tint = null) {
      if (!pending.length) return;
      warmSince += 1;
      if (warmSince < 20) return;
      for (let i = 0; i < 2 && pending.length; i += 1) { const q = pending.shift(); try { art('tree', tint ? { ...q, tint } : q, bucket); } catch { /* skip */ } }
    },
    get terrainKey() { return `${season}|${[...v.plots].sort().join(',')}|${[...(v.forSale ?? [])].sort().join(',')}|${v.levels.get('road') ?? 0}`; },
    terrain(ctx) { paintTerrain(ctx, this.atmo, v); },
    update(dt, t) { this.time = t; for (const s of life) s.update(dt); },
    objects(view, t) {
      const out = [];
      // Trees sway a little in whatever wind there is. A turned sprite is
      // the one draw that has to resample, so only the dozen nearest the
      // middle of the view move; the rest hold still and blit whole.
      // A tree in the breeze is one of three poses (lean −1, 0, +1), each a
      // cached sprite, so the wood moves and still blits whole. Rain leans
      // harder and more often.
      const windy = atmo.weather === 'rain';
      for (const s of statics) {
        if (s.treeParams && s.x > view.x - 80 && s.x < view.x + view.w + 80 && s.y > view.y - 20 && s.y < view.y + view.h + 140) {
          const phase = Math.sin(t / (windy ? 900 : 1700) + s.sway);
          const lean = phase > 0.45 ? 1 : phase < -0.45 ? -1 : 0;
          if (lean !== (s.lean ?? 0)) { s.lean = lean; s.art = art('tree', lean ? { ...s.treeParams, lean } : s.treeParams); }
        }
        out.push(s);
      }
      for (const s of life) for (const o of s.objects(t)) out.push(o);
      return out;
    },
    light() {
      // The hour's light, a little kinder than the old valley's: the village
      // must stay readable at midnight, and its lamps do the rest.
      const l = LIGHT[hour] ?? LIGHT.morning;
      const tint = hour === 'night' ? '#2E3F86' : hour === 'dusk' ? '#8A5F9E' : l.tint;
      return { tint, strength: l.strength * (hour === 'night' ? 0.86 : hour === 'dusk' ? 0.9 : 0.9) };
    },
    lights() { const out = [...lamps]; for (const s of life) if (s.lights) out.push(...s.lights()); return out; },
    overlay(ctx, view, t) {
      if (hour === 'dawn' || hour === 'dusk') {
        // The low sun: warm light from the east at dawn, from the west at dusk.
        const g = ctx.createLinearGradient(hour === 'dawn' ? view.x + view.w : view.x, 0, hour === 'dawn' ? view.x : view.x + view.w, 0);
        g.addColorStop(0, hour === 'dawn' ? 'rgba(255,196,120,0.22)' : 'rgba(255,150,90,0.26)'); g.addColorStop(1, 'rgba(120,90,160,0.12)');
        ctx.fillStyle = g; ctx.fillRect(view.x, view.y, view.w, view.h);
      }
      if (atmo.weather === 'rain') {
        ctx.strokeStyle = 'rgba(200,225,245,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        const rr = rng(`rain:${Math.floor(t / 90)}`);
        for (let i = 0; i < 80; i += 1) { const x = view.x + rr() * view.w, y = view.y + rr() * view.h; ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 9); }
        ctx.stroke();
      }
      if (atmo.weather === 'fog') { ctx.fillStyle = 'rgba(232,237,242,0.18)'; ctx.fillRect(view.x, view.y, view.w, view.h); }
    },
    anchors,
    workers,
    hit(x, y) {
      // Buildings and plots and houses: front-door boxes.
      for (const bv of v.buildings) {
        const d = bv.def;
        if (x >= d.at.x - d.hit.w / 2 && x <= d.at.x + d.hit.w / 2 && y >= d.at.y - d.hit.h && y <= d.at.y + 16) return { kind: 'building', id: d.id };
      }
      for (const pv of v.plotViews) { const q = pv.def.rect; if (!pv.open && x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) return { kind: 'plot', id: pv.id }; }
      if (v.nextHouse) { const s = v.nextHouse.at; if (Math.abs(x - s.x) < 40 && y > s.y - 60 && y < s.y + 14) return { kind: 'house', n: v.nextHouse.n }; }
      for (let i = 0; i < v.houses; i += 1) { const s = HOUSE_SPOTS[i]; if (Math.abs(x - s.x) < 40 && y > s.y - 60 && y < s.y + 14) return { kind: 'neighbour', n: i }; }
      return null;
    },
    /** The building's front-door point, for camera moves and flights. */
    anchorOf(id) { return BUILDINGS.find((b) => b.id === id)?.at ?? null; },
  };
  return scene;
}

/* ------------------------------------------------------------------ */
/* A still of one building, for the place screens and the rooms        */
/* ------------------------------------------------------------------ */

/**
 * A portrait backdrop of one building at its level with its worker at the
 * door, on the village's ground. Painted once and left still.
 */
export function buildBackdropScene(slug, state, atmo) {
  const bid = { 'reading-room': 'reading', meadow: 'garden', pond: 'garden', thicket: 'garden', rootwood: 'roots', terraces: 'roots', loom: 'loom', table: 'loom', bench: 'loom', wilds: 'road', hearth: 'hearth' }[slug] ?? 'hearth';
  const v = state?.village;
  const level = v?.levels?.get(bid) ?? 1;
  const def = BUILDINGS.find((b) => b.id === bid);
  const { hour, season } = atmo;
  const night = hour === 'night' || hour === 'dusk';
  const W = 360, H = 520;
  const lamps = night ? [{ x: W / 2, y: 214, r: 90, a: 0.4, color: PAL.glow }] : [];
  const r = rng(`bd:${slug}`);
  return {
    W, H, backdrop: night ? '#1E3A20' : '#4F8E36', hour, atmo, focusY: 214,
    get terrainKey() { return `bd|${slug}|${level}|${season}|${night}`; },
    terrain(ctx) {
      const grass = season === 'autumn' ? '#B9B857' : season === 'winter' ? '#C9D3D8' : PAL.grass;
      ctx.fillStyle = grass; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 26; i += 1) { const x = r() * W, y = r() * H, rad = 40 + r() * 90; const g = ctx.createRadialGradient(x, y, 0, x, y, rad); const c = i % 2 ? PAL.grassLight : PAL.grassDark; g.addColorStop(0, hexA(c, 0.45)); g.addColorStop(1, hexA(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      const g = ctx.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, 'rgba(46,110,31,0.5)'); g.addColorStop(1, 'rgba(46,110,31,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 120);
      // A path to the door.
      ctx.strokeStyle = PAL.path; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(W / 2, 250); ctx.quadraticCurveTo(W / 2 + 20, 360, W / 2 - 10, H + 10); ctx.stroke();
      const draw = (name, params, x, y, scale = 1) => { const a = art(name, params); ctx.drawImage(a.canvas, x - a.ax * scale, y - a.ay * scale, a.w * scale, a.h * scale); };
      for (let i = 0; i < 7; i += 1) draw('tree', { kind: i % 2 ? 'pine' : 'round', size: 0.9 + r() * 0.5, seed: `bdt${i % 6}`, tone: i % 3 }, 30 + i * 52, 96 + r() * 26);
      if (bid === 'road') { draw('signpost', { arrows: 2 }, W / 2 - 40, 240); draw('lamp', { lit: night }, W / 2 + 46, 246); draw('cart', { load: 'crates' }, W / 2, 290); }
      else if (def?.art) draw('building', { id: def.art, level, night }, W / 2, 240);
      const ch = def?.character ? CHARACTERS[def.character] : null;
      if (ch?.look) draw('person', { ...ch.look, pose: 'idle' }, W / 2 + 40, 252);
      if (bid === 'hearth') draw('wick', { pose: 'sit', lamp: night }, W / 2 - 48, 254);
      draw('bush', { seed: 'bdb1', flowers: true }, 40, 270); draw('bush', { seed: 'bdb2' }, W - 40, 274);
      draw('flowerPatch', { seed: 'bdf', n: 7 }, 120, 292); draw('flowerPatch', { seed: 'bdf2', n: 6 }, W - 110, 296);
      draw('fence', { w: 50 }, 70, 250); draw('fence', { w: 50 }, W - 70, 250);
      // The ground the sheet rests on darkens.
      const g2 = ctx.createLinearGradient(0, H - 200, 0, H); g2.addColorStop(0, 'rgba(12,18,34,0)'); g2.addColorStop(1, 'rgba(12,18,34,0.55)'); ctx.fillStyle = g2; ctx.fillRect(0, H - 200, W, 200);
    },
    update() {},
    objects() { return []; },
    light() { const l = LIGHT[hour] ?? LIGHT.morning; return { tint: l.tint, strength: l.strength * 0.75 }; },
    lights() { return lamps; },
    hit() { return null; },
  };
}

function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export { PATHS, POND, RIVER };
