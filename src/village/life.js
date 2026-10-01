/** Slow village routines and small life. Everything is seeded and bounded. */
import { art, PAL } from './art.js';
import { rng } from '../world/engine/palette.js';
import { PATHS, POND, cannotStand } from './terrain.js';
import { BOARD, CHARACTERS, PLOTS } from './defs.js';

/** A path graph with water/wall crossings removed for the village standing now. */
function navigation(v) {
  const clear = (a, b) => {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let i = 0, n = Math.max(1, Math.ceil(d / 5)); i <= n; i += 1)
      if (cannotStand(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, v)) return false;
    return true;
  };
  const points = PATHS.flat().filter((p, i) => i % 2 === 0 && !cannotStand(...p, v));
  const links = points.map(() => []);
  for (let i = 0; i < points.length; i += 1) for (let j = i + 1; j < points.length; j += 1) {
    const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
    if (d < 48 && clear(points[i], points[j])) { links[i].push([j, d]); links[j].push([i, d]); }
  }
  const nearby = (a) => points.map((p, i) => [i, Math.hypot(p[0] - a[0], p[1] - a[1])])
    .sort((a2, b) => a2[1] - b[1]).slice(0, 16).filter(([i]) => clear(a, points[i]));
  return {
    safe(a) {
      if (!cannotStand(...a, v)) return a;
      return points.reduce((best, p) => Math.hypot(p[0] - a[0], p[1] - a[1]) < Math.hypot(best[0] - a[0], best[1] - a[1]) ? p : best, points[0]);
    },
    route(a, b) {
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 65 && clear(a, b)) return [b];
      const starts = nearby(a), ends = new Map(nearby(b));
      const dist = points.map(() => Infinity), prev = points.map(() => -1), done = new Set();
      for (const [i, d] of starts) dist[i] = d;
      let goal = -1, best = Infinity;
      while (done.size < points.length) {
        let at = -1;
        for (let i = 0; i < points.length; i += 1) if (!done.has(i) && (at < 0 || dist[i] < dist[at])) at = i;
        if (at < 0 || !Number.isFinite(dist[at]) || dist[at] > best) break;
        done.add(at);
        if (ends.has(at) && dist[at] + ends.get(at) < best) { best = dist[at] + ends.get(at); goal = at; }
        for (const [to, d] of links[at]) if (dist[at] + d < dist[to]) { dist[to] = dist[at] + d; prev[to] = at; }
      }
      if (goal < 0) return [];
      const out = [b];
      for (let i = goal; i >= 0; i = prev[i]) out.unshift(points[i]);
      return out;
    },
  };
}

function resident({ id, kind, home, visits, nav, night, waiting = false, building = null }) {
  const random = rng('resident:' + id);
  home = nav.safe(home); visits = visits.map((p) => nav.safe(p));
  let pos = waiting ? [...visits[0]] : [...home], elapsed = random() * 9000;
  let rest = waiting ? 14000 + random() * 10000 : 5000 + random() * 7000;
  let queue = [], facing = false, cheers = 0, atHome = !waiting, visit = 0;
  let context = { working: false, waiting };
  const actor = {
    id, kind, building,
    sync(next) { context = { ...context, ...next }; },
    update(dt) {
      dt = Math.min(dt, 250); elapsed += dt; cheers = Math.max(0, cheers - dt);
      if (cheers || (night && !context.waiting)) return;
      if (queue.length) {
        const to = queue[0], dx = to[0] - pos[0], dy = to[1] - pos[1], d = Math.hypot(dx, dy);
        const step = dt * .017;
        facing = dx < 0;
        if (d <= step) { pos = [...to]; queue.shift(); } else { pos[0] += dx / d * step; pos[1] += dy / d * step; }
        return;
      }
      if (context.waiting && !atHome) return;
      rest -= dt;
      if (rest > 0) return;
      const to = atHome ? visits[visit++ % visits.length] : home;
      queue = nav.route(pos, to); atHome = !atHome;
      rest = 14000 + random() * 16000;
    },
    objects() {
      if (night && !context.waiting && !cheers) return [];
      const pose = cheers ? 'cheer' : queue.length ? 'walk' : context.working ? 'work' : 'sit';
      return [{ x: pos[0], y: pos[1], art: art('person', { id, pose, frame: Math.floor(elapsed / (pose === 'walk' ? 190 : 600)) % 4 }), flip: facing, pose, person: id }];
    },
    cheer(ms = 2200) { cheers = ms; },
    thank() { cheers = 2800; context.waiting = false; rest = 3800; },
    get visible() { return !night || context.waiting || cheers > 0; },
    get at() { return { x: pos[0], y: pos[1] }; },
  };
  return actor;
}

function drift(name, id, cx, cy, rx, ry, { speed = .00013, phase = 0, z = 0, variant = 0, scale = 1 } = {}) {
  let t = phase * 1000;
  const at = () => { const a = t * speed + phase; return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }; };
  return {
    kind: name, id, update(dt) { t += Math.min(dt, 250); },
    objects() {
      const p = at(), glow = name === 'firefly';
      return [{ ...p, art: art(name, { frame: Math.floor(t / (name === 'bird' ? 140 : 210)) % 4, variant }), scale, z,
        flip: Math.sin(t * speed + phase) > 0, alpha: glow ? .4 + .6 * (Math.sin(t / 900 + phase) + 1) / 2 : 1,
        emissive: glow, bob: name === 'butterfly' ? Math.sin(t / 700) * 3 : 0 }];
    },
    lights() { return name === 'firefly' ? [{ ...at(), r: 12, a: .13 + .16 * (Math.sin(t / 900 + phase) + 1) / 2, color: '#E5EBA0' }] : []; },
  };
}

/** Put smoke above a chimney, with a fade and slow upward drift. */
export function chimneySmoke(id, x, y) {
  let t = 0;
  return { kind: 'smoke', id, update(dt) { t += Math.min(dt, 250); }, objects() {
    return Array.from({ length: 3 }, (_, i) => {
      const f = ((t + i * 2600) % 7800) / 7800;
      return { x: x + Math.sin(f * 3 + i) * 5 + f * 12, y: y - f * 42, z: 2000,
        art: art('smoke'), scale: .35 + f * .7, alpha: Math.sin(f * Math.PI) * .23 };
    });
  } };
}

export function villageLife(v, { night, dark, weather }) {
  const nav = navigation(v), life = [], workers = new Map(), neighbours = new Map();
  const waiting = new Set(v.orders.map((o) => o.giver.id));
  let slot = 0;
  for (const nb of v.neighbours) {
    const board = [BOARD.at.x - 24 - slot % 3 * 26, BOARD.at.y + 28 + Math.floor(slot / 3) * 24]; slot += 1;
    const actor = resident({ id: nb.id, kind: 'neighbour', home: [nb.spot.x, nb.spot.y + 26],
      visits: [board, [400, 860], [600, 930]], nav, night, waiting: waiting.has(nb.id) });
    life.push(actor); neighbours.set(nb.id, actor);
  }
  for (const bv of v.buildings) {
    const ch = CHARACTERS[bv.def.character];
    if (!bv.built || !ch || ch.id === 'wick') continue;
    const actor = resident({ id: ch.id, kind: 'worker', building: bv.def.id, home: [bv.def.at.x + 34, bv.def.at.y + 20],
      visits: [[bv.def.at.x - 44, bv.def.at.y + 28]], nav, night });
    actor.sync({ working: !!bv.queue?.working }); life.push(actor); workers.set(bv.def.id, actor);
  }
  for (let i = 0; i < 3; i += 1) life.push(drift('koi', 'koi:' + i, POND.cx, POND.cy + 3, 48 + i * 6, 10 + i * 3, { z: -1200, scale: .7, phase: i * 2.1 }));
  for (let i = 0; i < 2; i += 1) life.push(drift('duck', 'duck:' + i, POND.cx + 4, POND.cy - 4, 55, 15, { z: -1000, speed: night ? .000025 : .00008, phase: i * 2.6, variant: i, scale: .8 }));
  if (v.plots.has('pen')) {
    const { x, y, w, h } = PLOTS.find((p) => p.id === 'pen').rect;
    for (let i = 0; i < 3; i += 1) life.push(drift('sheep', 'sheep:' + i, x + 38 + i * 45, y + 48 + i % 2 * 24, night ? 0 : 7, night ? 0 : 4, { speed: .00007, phase: i * 2, scale: .75 }));
  }
  if (weather !== 'rain') {
    if (!dark) {
      for (let i = 0; i < 4; i += 1) life.push(drift('bird', 'bird:' + i, 400 + i * 120, 620 + i % 2 * 190, 120, 35, { speed: .0002, phase: i * 1.7, z: 1600, scale: .65 }));
      for (const [i, p] of [[430, 586], [530, 714], [824, 850], [330, 942], [680, 736], [775, 475]].entries())
        life.push(drift('butterfly', 'butterfly:' + i, ...p, 18, 8, { speed: .0003, phase: i, z: 1400, variant: i % 2, scale: .8 }));
    } else {
      for (let i = 0; i < 14; i += 1) life.push(drift('firefly', 'firefly:' + i, 280 + i % 5 * 122, 770 + Math.floor(i / 5) * 74, 12, 7, { phase: i * 1.7, z: 1700 }));
    }
  }
  return { life, workers, neighbours };
}

/** Window shapes measured from the daylight bakes, relative to the same anchor.
 * Lit panes are drawn after the hour tint, with frames and mullions preserved. */
export function windowObject(x, y, sprite, scale = 1, id = 'hearth', level = 1) {
  const ay = sprite.ay;
  const panes = id === 'hearth'
    ? [[30, ay - 29, 15, 14], [86, ay - 29, 15, 14]]
    : [[31, ay - 43, 16, 21], [95, ay - 44, 20, 22]];
  if (id === 'reading' && level >= 2) panes.push([36, ay - 68, 17, 15], [88, ay - 68, 18, 15]);
  if (id === 'reading' && level >= 3) panes.push([112, ay - (level >= 4 ? 126 : 126), 11, 15]);
  return { x, y, z: .1, part: true, windows: true, draw(ctx) {
    ctx.save(); ctx.translate(x - sprite.ax * scale, y - ay * scale); ctx.scale(scale, scale);
    for (const [px, py, w, h] of panes) {
      const g = ctx.createLinearGradient(px, py, px + w, py + h);
      g.addColorStop(0, '#FFF0BC'); g.addColorStop(1, '#D8AD59');
      ctx.fillStyle = g;
      // Four separate panes: the baked crossbars remain visible between them.
      const gap = 1.6, hw = (w - gap) / 2, hh = (h - gap) / 2;
      for (const dx of [0, hw + gap]) for (const dy of [0, hh + gap]) ctx.fillRect(px + dx, py + dy, hw, hh);
    }
    ctx.restore();
  } };
}

