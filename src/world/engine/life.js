/**
 * life.js — the small moving things: weather particles, fireflies, leaf
 * fall, pollen, chimney smoke, sparkles, and the creatures (birds,
 * butterflies, koi, the cat). Every system is a plain object with
 * `update(dt)` and `draw(ctx)` so a scene can compose the ones it wants.
 * All motion is deterministic from a seed except the per-frame drift,
 * which is what makes it look alive rather than looped.
 */

import { rng, PIGMENT } from './palette.js';
import { sprite } from './sprites.js';

/* ------------------------------------------------------------------ */
/* Particles                                                           */
/* ------------------------------------------------------------------ */

/**
 * A field of particles inside a rect.
 * kinds: 'rain' | 'snow' | 'leaves' | 'pollen' | 'fireflies' | 'sparkle' | 'petals'
 */
export function particles({ kind, rect, count, seed = kind, colors }) {
  const r = rng(seed);
  const ps = [];
  const spawn = (p, fresh = false) => {
    p.x = rect.x + r() * rect.w;
    p.y = fresh ? rect.y + r() * rect.h : rect.y - 4;
    p.vx = 0; p.vy = 0; p.t = r() * 1000; p.life = 1;
    if (kind === 'rain') { p.vy = 0.22 + r() * 0.1; p.vx = -0.03; p.len = 3 + Math.floor(r() * 3); }
    if (kind === 'snow') { p.vy = 0.02 + r() * 0.02; p.amp = 0.4 + r() * 0.6; }
    if (kind === 'leaves' || kind === 'petals') { p.vy = 0.025 + r() * 0.02; p.amp = 0.6 + r() * 0.8; p.c = colors[Math.floor(r() * colors.length)]; }
    if (kind === 'pollen') { p.x = rect.x + r() * rect.w; p.y = rect.y + r() * rect.h; p.amp = 0.2 + r() * 0.3; }
    if (kind === 'fireflies') { p.x = rect.x + r() * rect.w; p.y = rect.y + r() * rect.h; p.phase = r() * Math.PI * 2; p.speed = 0.4 + r() * 0.6; }
    if (kind === 'sparkle') { p.x = rect.x + r() * rect.w; p.y = rect.y + r() * rect.h; p.phase = r() * Math.PI * 2; }
    return p;
  };
  for (let i = 0; i < count; i += 1) ps.push(spawn({}, true));
  return {
    kind, rect, ps,
    update(dt) {
      for (const p of ps) {
        p.t += dt;
        if (kind === 'rain') { p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > rect.y + rect.h) spawn(p); }
        else if (kind === 'snow' || kind === 'leaves' || kind === 'petals') { p.y += p.vy * dt; p.x += Math.sin(p.t / 600) * p.amp * (dt / 16) * 0.3; if (p.y > rect.y + rect.h) spawn(p); }
        else if (kind === 'pollen') { p.x += Math.sin(p.t / 900) * p.amp * (dt / 16) * 0.2; p.y += Math.cos(p.t / 1100) * p.amp * (dt / 16) * 0.15; if (p.x < rect.x || p.x > rect.x + rect.w || p.y < rect.y || p.y > rect.y + rect.h) spawn(p, true); }
        else if (kind === 'fireflies') { p.x += Math.sin(p.t / 700 + p.phase) * p.speed * 0.12 * (dt / 16); p.y += Math.cos(p.t / 900 + p.phase) * p.speed * 0.08 * (dt / 16); }
      }
    },
    draw(ctx) {
      for (const p of ps) {
        if (kind === 'rain') { ctx.fillStyle = 'rgba(200,220,240,0.7)'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, p.len); }
        else if (kind === 'snow') { ctx.fillStyle = PIGMENT.snow; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
        else if (kind === 'leaves' || kind === 'petals') { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1); }
        else if (kind === 'pollen') { ctx.fillStyle = 'rgba(255,245,200,0.8)'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
        else if (kind === 'fireflies') { const a = 0.35 + 0.65 * Math.max(0, Math.sin(p.t / 450 + p.phase)); ctx.fillStyle = `rgba(248,241,154,${a})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
        else if (kind === 'sparkle') { const a = Math.max(0, Math.sin(p.t / 380 + p.phase)); if (a > 0.6) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); if (a > 0.9) { ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1); ctx.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3); } } }
      }
    },
    /** For the lighting pass: fireflies glow. */
    lights() {
      if (kind !== 'fireflies') return [];
      return ps.map((p) => ({ x: p.x, y: p.y, r: 5, a: 0.18 + 0.2 * Math.max(0, Math.sin(p.t / 450 + p.phase)), color: PIGMENT.firefly }));
    },
  };
}

/** Chimney smoke: puffs rising and fading from a point. */
export function smoke({ x, y, seed = 'smoke' }) {
  const r = rng(seed);
  const puffs = [];
  let acc = 0;
  return {
    update(dt) {
      acc += dt;
      if (acc > 700 && puffs.length < 7) { acc = 0; puffs.push({ x, y, t: 0, dx: (r() - 0.5) * 0.02, size: 1 }); }
      for (const p of puffs) { p.t += dt; p.y -= 0.012 * dt; p.x += p.dx * dt + Math.sin(p.t / 500) * 0.05; p.size = 1 + Math.floor(p.t / 900); }
      while (puffs.length && puffs[0].t > 4200) puffs.shift();
    },
    draw(ctx) {
      for (const p of puffs) {
        const a = Math.max(0, 0.55 * (1 - p.t / 4200));
        ctx.globalAlpha = a;
        const s = sprite('puff', { size: Math.min(4, p.size) });
        ctx.drawImage(s.canvas, Math.round(p.x - s.ax), Math.round(p.y - s.ay));
        ctx.globalAlpha = 1;
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Creatures                                                           */
/* ------------------------------------------------------------------ */

/** A flock of birds crossing the sky now and then. */
export function birds({ rect, seed = 'birds', count = 3 }) {
  const r = rng(seed);
  const flock = [];
  let next = 3000 + r() * 6000;
  let t = 0;
  return {
    update(dt) {
      t += dt; next -= dt;
      if (next <= 0 && flock.length === 0) {
        const dir = r() > 0.5 ? 1 : -1;
        const y0 = rect.y + r() * rect.h * 0.6;
        for (let i = 0; i < count; i += 1) flock.push({ x: dir > 0 ? rect.x - 10 - i * 6 : rect.x + rect.w + 10 + i * 6, y: y0 + (i % 2) * 3 + i, dir, phase: r() * 10 });
        next = 12000 + r() * 20000;
      }
      for (const b of flock) { b.x += b.dir * 0.035 * dt; b.y += Math.sin((t + b.phase * 1000) / 800) * 0.01 * dt; }
      for (let i = flock.length - 1; i >= 0; i -= 1) if (flock[i].x < rect.x - 20 || flock[i].x > rect.x + rect.w + 20) flock.splice(i, 1);
    },
    draw(ctx) {
      for (const b of flock) { const s = sprite('bird', { frame: Math.floor(t / 180 + b.phase) % 2 }); ctx.drawImage(s.canvas, Math.round(b.x - s.ax), Math.round(b.y - s.ay)); }
    },
  };
}

/** Butterflies wandering over a patch. */
export function butterflies({ rect, count = 3, seed = 'bfly' }) {
  const r = rng(seed);
  const bs = Array.from({ length: count }, (_, i) => ({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, color: i % 5, phase: r() * 1000, tx: 0, ty: 0 }));
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const b of bs) {
        b.x += Math.sin((t + b.phase) / 520) * 0.04 * dt + Math.cos((t + b.phase) / 1900) * 0.02 * dt;
        b.y += Math.cos((t + b.phase) / 610) * 0.025 * dt;
        if (b.x < rect.x) b.x = rect.x + rect.w; if (b.x > rect.x + rect.w) b.x = rect.x;
        if (b.y < rect.y) b.y = rect.y + rect.h; if (b.y > rect.y + rect.h) b.y = rect.y;
      }
    },
    draw(ctx) {
      for (const b of bs) { const s = sprite('butterfly', { color: b.color, frame: Math.floor((t + b.phase) / 140) % 2 }); ctx.drawImage(s.canvas, Math.round(b.x - s.ax), Math.round(b.y - s.ay)); }
    },
  };
}

/** Koi circling inside an ellipse (the Mirror Pond). */
export function koi({ cx, cy, rx, ry, count = 3, seed = 'koi' }) {
  const r = rng(seed);
  const fish = Array.from({ length: count }, (_, i) => ({ a: r() * Math.PI * 2, speed: (0.00025 + r() * 0.0002) * (r() > 0.5 ? 1 : -1), rad: 0.45 + r() * 0.4, variant: i % 4, phase: r() * 1000 }));
  let t = 0;
  return {
    update(dt) { t += dt; for (const f of fish) f.a += f.speed * dt; },
    draw(ctx) {
      for (const f of fish) {
        const x = cx + Math.cos(f.a) * rx * f.rad, y = cy + Math.sin(f.a) * ry * f.rad;
        const s = sprite('koi', { variant: f.variant, frame: Math.floor((t + f.phase) / 260) % 2 });
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        // Face the direction of travel.
        const heading = f.a + (f.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
        if (Math.cos(heading) < 0) ctx.scale(-1, 1);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(s.canvas, -s.ax, -s.ay);
        ctx.restore();
      }
    },
  };
}

/**
 * Wick by the Hearth door: sits, flicks his tail, pads a few steps and
 * settles again. `recipe` picks the scale — 'catSmall' for the map, 'wick'
 * for a hero scene where he is close enough to have an expression.
 */
export function hearthCat({ x, y, seed = 'cat', recipe = 'catSmall', lamp = false, lit = true }) {
  const r = rng(seed);
  let t = 0, dx = 0, target = 0, next = 4000;
  let blinkAt = 3000;
  return {
    update(dt) {
      t += dt; next -= dt; blinkAt -= dt;
      if (blinkAt <= -160) blinkAt = 2600 + r() * 3400;
      if (next <= 0) { target = Math.round((r() - 0.5) * 14); next = 5000 + r() * 8000; }
      if (dx < target) dx += 0.01 * dt; else if (dx > target) dx -= 0.01 * dt;
    },
    draw(ctx) {
      const moving = Math.abs(target - dx) > 1;
      const s = recipe === 'wick'
        ? sprite('wick', { pose: moving ? 'walk' : 'sit', frame: Math.floor(t / 420) % 2, lamp, lit, blink: blinkAt <= 0 })
        : sprite('catSmall', { frame: Math.floor(t / 700) % 2 });
      ctx.save();
      ctx.translate(Math.round(x + dx), y);
      if (target < dx) ctx.scale(-1, 1);
      ctx.drawImage(s.canvas, -s.ax, -s.ay);
      ctx.restore();
    },
    get y() { return y; },
  };
}

/** Drifting clouds across a sky band; parallax-slow. */
export function clouds({ rect, count = 4, seed = 'clouds', speed = 0.004 }) {
  const r = rng(seed);
  const cs = Array.from({ length: count }, (_, i) => ({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, w: 18 + Math.floor(r() * 30), seed: `${seed}:${i}`, v: speed * (0.6 + r() * 0.8) }));
  return {
    update(dt) { for (const c of cs) { c.x += c.v * dt; if (c.x - c.w > rect.x + rect.w) c.x = rect.x - c.w; } },
    draw(ctx, alpha = 0.92) {
      ctx.globalAlpha = alpha;
      for (const c of cs) { const s = sprite('cloud', { seed: c.seed, w: c.w }); ctx.drawImage(s.canvas, Math.round(c.x - s.ax), Math.round(c.y - s.ay)); }
      ctx.globalAlpha = 1;
    },
  };
}

/** Animated water highlights inside a set of rects/ellipses. */
export function waterGlints({ shapes, seed = 'glint', color = 'rgba(232,246,255,0.75)' }) {
  const r = rng(seed);
  const gs = [];
  for (const sh of shapes) {
    const n = Math.max(3, Math.floor(((sh.w ?? sh.rx * 2) * (sh.h ?? sh.ry * 2)) / 90));
    for (let i = 0; i < n; i += 1) {
      const u = r(), v = r();
      const x = sh.rx ? sh.cx + (u * 2 - 1) * sh.rx * 0.85 : sh.x + u * sh.w;
      const y = sh.ry ? sh.cy + (v * 2 - 1) * sh.ry * 0.85 : sh.y + v * sh.h;
      if (sh.rx && ((x - sh.cx) ** 2) / (sh.rx ** 2) + ((y - sh.cy) ** 2) / (sh.ry ** 2) > 0.85) continue;
      gs.push({ x, y, phase: r() * 6, len: 2 + Math.floor(r() * 3) });
    }
  }
  return {
    update() {},
    draw(ctx, t) {
      ctx.fillStyle = color;
      for (const g of gs) {
        const a = Math.sin(t / 700 + g.phase);
        if (a > 0.3) ctx.fillRect(Math.round(g.x + a * 1.5), Math.round(g.y), g.len, 1);
      }
    },
  };
}

/**
 * A villager walking a route, there and back. The valley only has these
 * once works have been built, so people arriving IS the progression: a
 * settlement, not scenery.
 *
 * @param {Array<[number,number]>} route  world points, walked in order
 * @param {number} [index]  which villager (colour, speed, phase)
 */
export function walker(route, index = 0) {
  const r = rng(`walker:${index}`);
  const speed = 0.010 + r() * 0.006;      // world px per ms
  let t = r() * 4000;
  let leg = Math.floor(r() * Math.max(1, route.length - 1));
  let p = r();
  let dir = 1;
  let pause = 0;
  let pos = { x: route[0][0], y: route[0][1] };
  let facing = 1;
  return {
    kind: 'walker',
    update(dt) {
      t += dt;
      if (pause > 0) { pause -= dt; return; }
      const a = route[leg], b = route[leg + dir === route.length ? leg : leg + (dir > 0 ? 1 : 0)];
      const from = dir > 0 ? route[leg] : route[leg + 1];
      const to = dir > 0 ? route[leg + 1] : route[leg];
      if (!from || !to) { dir = -dir; return; }
      const dist = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
      p += (speed * dt) / dist;
      if (p >= 1) {
        p = 0;
        if (dir > 0) { leg += 1; if (leg >= route.length - 1) { leg = route.length - 2; dir = -1; pause = 1200 + r() * 2600; } }
        else { leg -= 1; if (leg < 0) { leg = 0; dir = 1; pause = 1200 + r() * 2600; } }
      }
      const f2 = dir > 0 ? route[leg] : route[leg + 1];
      const t2 = dir > 0 ? route[leg + 1] : route[leg];
      if (f2 && t2) {
        pos = { x: f2[0] + (t2[0] - f2[0]) * p, y: f2[1] + (t2[1] - f2[1]) * p };
        facing = t2[0] >= f2[0] ? 1 : -1;
        void a; void b;
      }
    },
    draw(ctx) {
      const s = sprite('villager', { frame: pause > 0 ? 0 : Math.floor(t / 230) % 4, colour: index });
      ctx.save();
      ctx.translate(Math.round(pos.x), Math.round(pos.y));
      if (facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(s.canvas, -s.ax, -s.ay);
      ctx.restore();
    },
    get y() { return pos.y; },
  };
}

/**
 * Grazing animals: they wander a rectangle at a walking pace, stop to
 * graze, and turn to face where they are going. Used for the deer at the
 * Rootwood's edge, the sheep in the Meadow and the dog at the Hearth —
 * every one of them arrives only because the learner made it arrive.
 *
 * @param {object} o { rect, count, kind: 'deer'|'sheep'|'dog', seed, params }
 */
export function grazers({ rect, count = 3, kind = 'sheep', seed = 'graze', params = {} }) {
  const r = rng(`${seed}:${kind}`);
  const herd = Array.from({ length: count }, (_, i) => ({
    x: rect.x + r() * rect.w,
    y: rect.y + r() * rect.h,
    tx: rect.x + r() * rect.w,
    ty: rect.y + r() * rect.h,
    face: r() > 0.5 ? 1 : -1,
    pause: r() * 6000,
    t: r() * 3000,
    v: 0.006 + r() * 0.005,
    variant: i,
  }));
  return {
    kind: 'grazers',
    update(dt) {
      for (const a of herd) {
        a.t += dt;
        if (a.pause > 0) { a.pause -= dt; continue; }
        const dx = a.tx - a.x, dy = a.ty - a.y;
        const d = Math.hypot(dx, dy);
        if (d < 1.5) {
          a.tx = rect.x + r() * rect.w;
          a.ty = rect.y + r() * rect.h;
          a.pause = 3000 + r() * 9000;
          continue;
        }
        a.x += (dx / d) * a.v * dt;
        a.y += (dy / d) * a.v * dt;
        if (Math.abs(dx) > 0.6) a.face = dx > 0 ? 1 : -1;
      }
    },
    draw(ctx) {
      for (const a of herd) {
        const moving = a.pause <= 0;
        const s = sprite(kind, { frame: moving ? Math.floor(a.t / 260) % 2 : 0, ...params, ...(kind === 'deer' ? { stag: a.variant === 0 } : {}) });
        ctx.save();
        ctx.translate(Math.round(a.x), Math.round(a.y));
        if (a.face < 0) ctx.scale(-1, 1);
        ctx.drawImage(s.canvas, -s.ax, -s.ay);
        ctx.restore();
      }
    },
    get y() { return herd.length ? herd[0].y : rect.y; },
  };
}

/** Ducks on the water: they paddle the ellipse and leave a small wake. */
export function ducks({ cx, cy, rx, ry, count = 3, seed = 'ducks' }) {
  const r = rng(seed);
  const birdsOnWater = Array.from({ length: count }, (_, i) => ({
    a: r() * Math.PI * 2,
    rr: 0.35 + r() * 0.5,
    v: (r() > 0.5 ? 1 : -1) * (0.00008 + r() * 0.00009),
    t: r() * 2000,
    drake: i % 3 === 0,
  }));
  return {
    kind: 'ducks',
    update(dt) { for (const d of birdsOnWater) { d.a += d.v * dt; d.t += dt; } },
    draw(ctx) {
      for (const d of birdsOnWater) {
        const x = cx + Math.cos(d.a) * rx * d.rr;
        const y = cy + Math.sin(d.a) * ry * d.rr;
        ctx.fillStyle = 'rgba(232,246,255,0.4)';
        ctx.fillRect(Math.round(x - 3), Math.round(y + 2), 7, 1);
        const s = sprite('duck', { frame: Math.floor(d.t / 420) % 2, drake: d.drake });
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (Math.cos(d.a + Math.PI / 2) < 0) ctx.scale(-1, 1);
        ctx.drawImage(s.canvas, -s.ax, -s.ay);
        ctx.restore();
      }
    },
    get y() { return cy; },
  };
}
