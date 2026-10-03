/**
 * life.js — what makes the village feel lived in.
 *
 * Two halves on one animation frame:
 *
 *   THE FRIENDS  six small state machines. A friend walks the painted paths
 *                on its own two feet (an owl waddles, a pebble plods, a fox
 *                trots, a flame bounces, a cloud floats), does chores round
 *                its home with a prop in hand (watering, sweeping, reading,
 *                hammering, sipping tea, raining on the flowers), visits its
 *                best friend, chats on the plaza, greets you when you arrive
 *                and goes home to sleep at night.
 *   THE AIR      one half-resolution canvas: fire sparks, chimney smoke,
 *                fireflies, butterflies, falling leaves, birds, rain, motes,
 *                and the little things chores throw up: water drops, dust,
 *                music notes, letters, sparkles.
 *
 * Everything is in painting pixels (src/pets/paths.js). Reduced motion
 * leaves the friends standing at home, awake, and the canvas still.
 */

import { NODES, HOMES, SPOTS, route, nearestNode, FIRE, CHIMNEYS, TEAPOT, POND, CLOCK, TREASURE_AT } from '../pets/paths.js';
import { FRAME, growOf } from '../pets/sprite.js';
import { PETS, PET_BY_ID, gossipLine, lineFor } from '../pets/pets.js';
import { rng } from '../world/engine/palette.js';
import { voice } from '../world/audio.js';
import { createWater } from './water.js';

/** Drawn height of each pet at full size, in painting pixels. */
export const PET_SIZE = Object.freeze({ toffee: 70, chai: 84, matcha: 78, mochi: 78, ginger: 84, mallow: 80 });
/** A friend's drawn height at their growth stage: they get bigger as you work through their subject. */
export const petSize = (id, stage) => Math.round(PET_SIZE[id] * growOf(stage));
const CONFETTI = ['#F4C443', '#E9963A', '#8FB56A', '#D97A8A', '#93AED1', '#F6EEDB'];

const SPEED = { glowing: 46, happy: 42, missing: 34, sleepy: 26, wilting: 24, new: 38 };
const AWAKE = new Set(['glowing', 'happy', 'missing', 'new']);
const CHAT_ICONS = ['♥', '♪', '☺', '♫', '✿'];
const HELLO = ['Hi!', 'Hello!', 'Yay, you came!', 'Hiii!', '♥', 'You are here!'];
const rand = (a, b) => a + Math.random() * (b - a);
const pickOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** How each friend moves: hop height, side-to-side waddle (deg), steps per second, and float for the cloud. */
const GAIT = {
  toffee: { hop: 8, waddle: 4, cadence: 2.6, lift: 0.6 },
  chai: { hop: 2.5, waddle: 8, cadence: 2.2, lift: 0.75 },
  matcha: { hop: 5, waddle: 5, cadence: 2.5, lift: 0.7 },
  mochi: { hop: 1.5, waddle: 6.5, cadence: 1.9, lift: 0.6 },
  ginger: { hop: 4.5, waddle: 3, cadence: 3, lift: 0.75 },
  mallow: { hop: 0, waddle: 3, cadence: 1.4, lift: 0, float: 5 },
};

/** Chores round each home: the prop in hand, how long, and what it throws into the air. */
const CHORES = {
  toffee: [{ kind: 'dance', ms: [4000, 7000], emit: 'spark', every: 260 }, { kind: 'poke', prop: 'stick', ms: [4500, 7000], emit: 'spark', every: 420 }],
  chai: [{ kind: 'read', prop: 'book', ms: [6000, 10000], emit: 'letter', every: 900 }, { kind: 'sweep', prop: 'broom', ms: [5000, 8000], emit: 'dust', every: 520 }],
  matcha: [{ kind: 'water', prop: 'can', ms: [5000, 8000], emit: 'drop', every: 90 }, { kind: 'sing', ms: [4000, 6500], emit: 'note', every: 700 }],
  mochi: [{ kind: 'tea', prop: 'cup', ms: [6000, 9000], emit: 'steam', every: 500 }, { kind: 'sweep', prop: 'broom', ms: [5000, 8000], emit: 'dust', every: 600 }],
  ginger: [{ kind: 'hammer', prop: 'hammer', ms: [4500, 7500], emit: 'spark', every: 640 }, { kind: 'sing', ms: [3500, 5500], emit: 'note', every: 650 }],
  mallow: [{ kind: 'rain', prop: 'raincloud', ms: [5500, 8500], emit: 'drop', every: 110 }, { kind: 'sprinkle', ms: [4000, 6500], emit: 'sparkle', every: 220 }],
};
/** Where on the body a chore's particles come from, as a fraction of the pet's size (x toward its facing). */
const EMIT_AT = {
  spark: [0, -0.55], stick: [0.74, -0.18], hammer: [0.58, -0.3], letter: [0.1, -0.62], dust: [0.5, -0.02], drop: [0.66, -0.36],
  note: [0.15, -0.95], steam: [0.42, -0.6], sparkle: [0.3, -0.5], raindrop: [0.5, -0.9],
};
/** Chores happen beside the door, on the path, never on the roof. */
const YARD = { chai: ['lib', 'l1'], matcha: ['green', 'g1'], mochi: ['cabin', 'a1'], ginger: ['shop', 'w1'], mallow: ['obs', 'o1'], toffee: ['f1', 'f2'] };

const PROPS = {
  can: '<svg viewBox="0 0 40 30"><path d="M8 11h17l-2 15H10z" fill="#7FA9A0" stroke="#3f3a30" stroke-width="1.6" stroke-linejoin="round"/><path d="M24 15l11-7 2 3-11 8" fill="#7FA9A0" stroke="#3f3a30" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 11c0-6 13-6 13 0" fill="none" stroke="#3f3a30" stroke-width="1.8"/><circle cx="36" cy="9" r="2.4" fill="#5d8a80" stroke="#3f3a30" stroke-width="1.2"/></svg>',
  broom: '<svg viewBox="0 0 24 50"><path d="M12 1v34" stroke="#8a5a32" stroke-width="3" stroke-linecap="round"/><path d="M5 34h14l4 15H1z" fill="#E2B86A" stroke="#5a3e22" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 38l-2 10M12 38v10M17 38l2 10" stroke="#a57a3a" stroke-width="1"/></svg>',
  hammer: '<svg viewBox="0 0 30 34"><path d="M5 31L19 11" stroke="#8a5a32" stroke-width="3.4" stroke-linecap="round"/><rect x="11" y="2" width="17" height="10" rx="2" transform="rotate(34 19 7)" fill="#9aa3ad" stroke="#3a3a3a" stroke-width="1.5"/></svg>',
  cup: '<svg viewBox="0 0 30 22"><ellipse cx="14" cy="18" rx="12" ry="3" fill="#F4EAD5" stroke="#5a4130" stroke-width="1.3"/><path d="M5 6h18l-2 10a3 3 0 0 1-3 2H10a3 3 0 0 1-3-2z" fill="#F6EEDC" stroke="#5a4130" stroke-width="1.4" stroke-linejoin="round"/><path d="M23 8a4 4 0 0 1 0 7" fill="none" stroke="#5a4130" stroke-width="1.4"/><path d="M7 9h14" stroke="#C2643F" stroke-width="1.6"/></svg>',
  book: '<svg viewBox="0 0 36 24"><path d="M2 5c5-3 11-3 16 0v17c-5-3-11-3-16 0z" fill="#FBF3E0" stroke="#5a4130" stroke-width="1.4" stroke-linejoin="round"/><path d="M34 5c-5-3-11-3-16 0v17c5-3 11-3 16 0z" fill="#FBF3E0" stroke="#5a4130" stroke-width="1.4" stroke-linejoin="round"/><path d="M5 9h9M5 12h9M5 15h7M22 9h9M22 12h9M22 15h7" stroke="#b39a78" stroke-width="1"/><path class="prop__page" d="M18 5c3-2 7-2.6 11-1.6v16.4c-4-1-8-.4-11 1.6z" fill="#fffaf0" stroke="#5a4130" stroke-width="1.2"/></svg>',
  stick: '<svg viewBox="0 0 40 12"><path d="M2 9L37 3" stroke="#7a4e2a" stroke-width="3" stroke-linecap="round"/><circle cx="37" cy="3" r="2.5" fill="#F2A23C"/></svg>',
  raincloud: '<svg viewBox="0 0 50 30"><path d="M12 24h26a8 8 0 0 0 0-16 11 11 0 0 0-21-3 9 9 0 0 0-5 19z" fill="#E8EEF6" stroke="#6a7a90" stroke-width="1.6" stroke-linejoin="round"/></svg>',
};

/**
 * @param {HTMLElement} root  the .cw section
 * @param {{pets, atmo, reduced}} o
 */
export function createLife(root, { pets: petsState, atmo, reduced }) {
  const map = root.querySelector('.cw-map');
  const canvas = root.querySelector('.cw-life');
  const g = canvas.getContext('2d');
  const water = createWater(map, { reduced });
  let pets = petsState;
  let hour = atmo.hour, weather = atmo.weather, season = atmo.season;
  const night = () => hour === 'night';
  const dark = () => hour === 'night' || hour === 'dusk';
  let destroyed = false, raf = 0, last = performance.now(), now = 0;
  const reserved = new Set();
  const parts = [];

  /* ================= The friends ================= */
  const actors = PETS.map((p, i) => {
    const el = root.querySelector(`.pet[data-pet="${p.id}"]`);
    const home = HOMES[p.id].node;
    const n = NODES[home];
    const stage = pets.pets.find((x) => x.id === p.id)?.stage ?? 0;
    return {
      id: p.id, el, body: el.querySelector('.pet-body'), sprite: el.querySelector('.pet-sprite'),
      bubble: el.querySelector('.pet-bubble'), markEl: el.querySelector('.pet-mark'), shadow: el.querySelector('.pet-shadow'),
      gait: GAIT[p.id], size: petSize(p.id, stage), stage, rush: false, partyUntil: 0,
      x: n.x + (i % 2 ? 6 : -6), y: n.y, node: home, home, path: [], state: 'idle', until: 400 + i * 700,
      next: null, facing: i % 2 ? -1 : 1, hop: 0, frame: 0, blinkAt: rand(800, 4000), blinkUntil: 0,
      talkUntil: 0, sayUntil: 0, happyUntil: 0, reactUntil: 0, partner: null, target: null,
      word: 'happy', lastWrite: '', lastFeet: '', marked: false, chore: null, emitAt: 0, walked: 0,
    };
  });
  const byId = new Map(actors.map((a) => [a.id, a]));
  const wordOf = (id) => pets.pets.find((p) => p.id === id)?.word ?? 'happy';
  for (const a of actors) a.word = wordOf(a.id);

  /** Walk to a node (or a point near it), then do `next`. */
  const walkTo = (a, nodeId, next = 'idle', offset = null) => {
    const from = nearestNode({ x: a.x, y: a.y });
    const pts = route(from, nodeId).map((p) => ({ ...p }));
    if (!pts.length) return false;
    if (offset) pts[pts.length - 1] = { x: pts[pts.length - 1].x + offset.x, y: pts[pts.length - 1].y + offset.y };
    if (Math.hypot(pts[0].x - a.x, pts[0].y - a.y) < 4) pts.shift();
    if (a.target) reserved.delete(a.target);
    a.target = nodeId; reserved.add(nodeId);
    a.path = pts; a.state = 'walk'; a.next = next;
    endChore(a);
    return true;
  };
  const freeNode = (list) => {
    const free = list.filter((n) => !reserved.has(n));
    return free.length ? pickOf(free) : null;
  };

  const say = (a, html, ms = 2600, { talk = true, speak = true, soft = false } = {}) => {
    a.bubble.innerHTML = html;
    a.bubble.hidden = false;
    a.bubble.classList.remove('is-out');
    a.sayUntil = now + ms;
    if (talk) a.talkUntil = now + Math.min(ms - 300, 1800);
    const text = a.bubble.textContent;
    if (speak && text && !reduced) voice(a.id, text, { soft });
  };

  /* ---- Chores ---- */
  const startChore = (a) => {
    const list = CHORES[a.id];
    if (!list?.length) return false;
    const c = pickOf(list);
    a.chore = { ...c, until: now + rand(c.ms[0], c.ms[1]) };
    a.state = 'chore'; a.until = a.chore.until; a.emitAt = now + 300;
    a.facing = Math.random() < 0.5 ? -1 : 1;
    a.el.dataset.chore = c.kind;
    if (c.prop) a.body.insertAdjacentHTML('beforeend', `<span class="prop prop--${c.prop}" aria-hidden="true">${PROPS[c.prop]}</span>`);
    return true;
  };
  function endChore(a) {
    if (!a.chore) return;
    a.chore = null;
    delete a.el.dataset.chore;
    a.body.querySelector('.prop')?.remove();
  }
  const goChore = (a) => {
    const spot = pickOf(YARD[a.id]);
    if (nearestNode({ x: a.x, y: a.y }) === spot && Math.hypot(NODES[spot].x - a.x, NODES[spot].y - a.y) < 30) return startChore(a);
    return walkTo(a, spot, 'chore', { x: rand(-16, 16), y: rand(-4, 6) });
  };

  /** What a free friend does next. The mood decides how far it goes. */
  const decide = (a) => {
    a.partner = null;
    endChore(a);
    const w = a.word = wordOf(a.id);
    if (reduced) { a.state = 'idle'; a.until = now + 1e9; return; }
    if (night() && a.id !== 'toffee') {
      if (a.node !== a.home) walkTo(a, a.home, 'sleep');
      else { a.state = 'sleep'; a.until = now + rand(15e3, 30e3); }
      return;
    }
    const r = Math.random();
    if (a.id === 'toffee') {
      if (night()) { a.state = r < 0.6 ? 'sleep' : 'idle'; a.until = now + rand(8e3, 16e3); return; }
      if (a.node !== a.home && r < 0.5) { walkTo(a, a.home, 'idle'); return; }
      if (r < 0.4 && startChore(a)) return;
      if (r < 0.5) { const n = freeNode(SPOTS.fire.filter((x) => x !== a.node)); if (n) { walkTo(a, n, 'idle'); return; } }
      if (r < 0.6) { const n = freeNode(['kiosk', 'ps', 's2']); if (n) { walkTo(a, n, 'idle'); return; } }
      a.state = 'idle'; a.until = now + rand(3e3, 7e3);
      return;
    }
    if (w === 'sleepy' || w === 'wilting') {
      if (a.node !== a.home && r < 0.7) { walkTo(a, a.home, 'doze'); return; }
      if (r < 0.3) { goChore(a); return; }
      a.state = r < 0.75 ? 'doze' : 'idle'; a.until = now + rand(6e3, 12e3); return;
    }
    // Most of a friend's day is spent at home, busy.
    if (r < 0.42) { goChore(a); return; }
    if (r < 0.55 && w !== 'missing') { const bff = PET_BY_ID.get(a.id).bff; if (byId.has(bff) && !reserved.has(HOMES[bff].node)) { walkTo(a, HOMES[bff].node, 'visit', { x: (Math.random() < 0.5 ? -1 : 1) * 34, y: 4 }); return; } }
    if (r < 0.68) { const n = freeNode(SPOTS.plaza); if (n) { walkTo(a, n, 'idle'); return; } }
    if (r < 0.74) { const n = freeNode(SPOTS.bench); if (n) { walkTo(a, n, 'sit'); return; } }
    if (r < 0.78 && (a.id === 'matcha' || a.id === 'mallow' || a.id === 'mochi') && !reserved.has('dock')) { walkTo(a, 'dock', 'idle'); return; }
    if (r < 0.84) { const n = freeNode(SPOTS.fire); if (n) { walkTo(a, n, 'sit'); return; } }
    if (r < 0.92 && startChat(a)) return;
    if (a.node !== a.home) { walkTo(a, a.home, 'idle'); return; }
    a.state = 'idle'; a.until = now + rand(2500, 6000);
  };

  /* ---- Two friends meet on the plaza and talk ---- */
  const chats = [];
  const startChat = (a, b = null) => {
    const others = actors.filter((x) => x !== a && x.id !== 'toffee' && !x.partner && AWAKE.has(x.word) && (x.state === 'idle' || x.state === 'sit' || x.state === 'chore') && !night());
    b = b ?? (others.find((x) => x.id === PET_BY_ID.get(a.id).bff) ?? pickOf(others));
    if (!b) return false;
    const n = freeNode(['pc', 'pn', 'ps', 'pw', 'pe']);
    if (!n) return false;
    a.partner = b; b.partner = a;
    walkTo(a, n, 'wait', { x: -30, y: 0 });
    walkTo(b, n, 'wait', { x: 30, y: 2 });
    chats.push({ a, b, step: 0, at: 0, n: 3 + Math.floor(Math.random() * 2) });
    return true;
  };
  const runChats = () => {
    for (let i = chats.length - 1; i >= 0; i -= 1) {
      const c = chats[i];
      if (c.a.partner !== c.b || c.b.partner !== c.a) { chats.splice(i, 1); continue; }
      if (c.a.state !== 'wait' || c.b.state !== 'wait') continue;
      if (!c.at) { c.a.facing = c.b.x >= c.a.x ? 1 : -1; c.b.facing = -c.a.facing; c.at = now; }
      if (now < c.at) continue;
      if (c.step >= c.n) { chats.splice(i, 1); c.a.partner = c.b.partner = null; decide(c.a); decide(c.b); continue; }
      const speaker = c.step % 2 ? c.b : c.a;
      let text = pickOf(CHAT_ICONS);
      if (Math.random() < 0.35) {
        const about = pickOf(pets.pets.filter((p) => p.id !== c.a.id && p.id !== c.b.id));
        if (about) text = gossipLine(about.id, about.word, `${now | 0}`);
      }
      say(speaker, `<span>${text}</span>`, text.length > 3 ? 3000 : 1700, { soft: true });
      if (text === '♥') { speaker.happyUntil = now + 900; heart(speaker); }
      c.step += 1; c.at = now + (text.length > 3 ? 3200 : 1900);
    }
  };

  /* ---- A finished set: everyone runs to the plaza and cheers ---- */
  let party = null;
  function startCheer(a) {
    const host = a.id === party?.center;
    a.state = 'cheer'; a.until = a.partyUntil; a.emitAt = now + 250;
    a.facing = host ? 1 : (NODES.pc.x >= a.x ? 1 : -1);
    a.reactUntil = now + 700; a.happyUntil = now + 1200;
    if (!reduced) heart(a);
    say(a, `<span>${host && party.line ? party.line : lineFor(a.id, 'cheer', `${now | 0}`)}</span>`, host ? 4600 : 1900, { soft: !host });
  }

  /* ---- Each frame, for each friend ---- */
  const stepPet = (a, dt) => {
    if (a.state === 'walk') {
      // Running to a party: three times the pace, and the feet keep up.
      const pace = SPEED[a.word] * (a.rush ? 3.2 : 1);
      let d = pace * dt;
      while (d > 0 && a.path.length) {
        const t = a.path[0], dx = t.x - a.x, dy = t.y - a.y, dist = Math.hypot(dx, dy);
        if (Math.abs(dx) > 0.5) a.facing = dx > 0 ? 1 : -1;
        if (dist <= d) { a.x = t.x; a.y = t.y; a.path.shift(); d -= dist; } else { a.x += (dx / dist) * d; a.y += (dy / dist) * d; d = 0; }
      }
      const before = Math.floor(a.hop / Math.PI);
      a.hop += dt * a.gait.cadence * Math.PI * (pace / 40) * (a.rush ? 0.6 : 1);
      // A little puff of dust at each footfall (not for the cloud).
      if (Math.floor(a.hop / Math.PI) !== before && a.gait.lift && Math.random() < 0.5) emit('dust', a.x + rand(-6, 6), a.y - 1, 0.6);
      // Stage 7 and up: a trail of sparkles wherever they go.
      if (a.stage >= 7 && Math.random() < dt * 6) emit('sparkle', a.x + rand(-10, 10), a.y - a.size * rand(0.15, 0.6));
      if (!a.path.length) arrive(a);
    } else if (a.state === 'cheer') {
      // The party in the plaza: hop, beam, hearts and sparkles until it is over.
      if (now > a.until) { decide(a); return; }
      if (now > a.emitAt) {
        a.emitAt = now + rand(650, 1150);
        a.reactUntil = now + 700; a.happyUntil = now + 950;
        if (Math.random() < 0.55) heart(a);
        emit('sparkle', a.x + rand(-14, 14), a.y - a.size * rand(0.5, 1));
      }
    } else if (a.state === 'chore') {
      if (now > a.chore.until) { decide(a); return; }
      if (now > a.emitAt) {
        a.emitAt = now + a.chore.every * rand(0.7, 1.3);
        const k = a.chore.kind === 'rain' ? 'raindrop' : a.chore.emit;
        const [fx, fy] = EMIT_AT[a.chore.prop] ?? EMIT_AT[k] ?? [0, -0.5];
        emit(a.chore.emit, a.x + a.facing * fx * a.size + rand(-6, 6), a.y + fy * a.size, 1, a.chore.kind === 'rain' ? a.facing * 0.1 : a.facing);
        if (a.chore.kind === 'dance' || (a.chore.kind === 'sing' && Math.random() < 0.3)) a.reactUntil = now + 420;
        if (a.chore.kind === 'dance' && Math.random() < 0.35) a.facing *= -1;
      }
    } else if (a.state !== 'wait' && now > a.until) {
      decide(a);
    }
  };
  const arrive = (a) => {
    a.node = a.target ?? nearestNode({ x: a.x, y: a.y });
    if (a.target) reserved.delete(a.target);
    reserved.add(a.node);
    a.target = null; a.hop = 0; a.rush = false;
    const next = a.next ?? 'idle';
    if (next === 'cheer') { startCheer(a); return; }
    if (next === 'chore') { if (!startChore(a)) { a.state = 'idle'; a.until = now + 3000; } return; }
    if (next === 'visit') {
      const b = byId.get(PET_BY_ID.get(a.id).bff);
      a.state = 'idle'; a.until = now + rand(3500, 6000);
      if (b && Math.hypot(b.x - a.x, b.y - a.y) < 160 && b.state !== 'walk' && b.state !== 'sleep') {
        a.facing = b.x >= a.x ? 1 : -1; b.facing = -a.facing;
        say(a, '<span>♥</span>', 1500, { speak: false }); heart(a);
        setTimeout(() => { if (!destroyed) { b.reactUntil = now + 600; b.happyUntil = now + 1200; heart(b); } }, 500);
      } else say(a, '<span>…?</span>', 1400, { speak: false });
      return;
    }
    if (next === 'greet') { a.state = 'idle'; a.until = now + rand(3000, 5000); return; }
    a.state = next; a.until = now + (next === 'sleep' ? rand(15e3, 30e3) : next === 'sit' ? rand(5e3, 10e3) : next === 'wait' ? 1e9 : rand(2500, 6000));
  };

  const heart = (a) => {
    const h = document.createElement('i');
    h.className = 'pet-heart'; h.textContent = '♥'; h.setAttribute('aria-hidden', 'true');
    h.style.setProperty('--dx', `${rand(-14, 14).toFixed(0)}px`);
    a.el.appendChild(h);
    setTimeout(() => h.remove(), 1400);
  };

  /** Paint one friend: position, depth, gait, facing, frame, feet. Writes only on change. */
  const paintPet = (a) => {
    let frame = FRAME.idle, lift = 0, sx = 1, sy = 1, tilt = 0, ll = 0, lr = 0, lx = 0, rx = 0;
    const G = a.gait;
    if (a.state === 'walk' && !reduced) {
      const ph = a.hop % (Math.PI * 2), s = Math.sin(ph);
      if (G.float) { lift = G.float + Math.sin(now / 260) * 2.5; tilt = a.facing * 4 + s * G.waddle * 0.4; }
      else {
        lift = Math.abs(s) * G.hop;
        const land = Math.max(0, 1 - Math.abs(s) * 4) ** 2;
        sy = 1 - land * 0.06 + (Math.abs(s)) * 0.02; sx = 1 + land * 0.05;
        tilt = s * G.waddle + a.facing * 2.5;
        // The foot in the air rises (into the body, a few painting px) and swings forward; the other pushes back.
        const up = a.size * 0.045 * G.lift;
        ll = Math.max(0, s) * up; lr = Math.max(0, -s) * up;
        lx = Math.cos(ph) * 1.2; rx = -Math.cos(ph) * 1.2;
      }
    } else if (!reduced) {
      sy = 1 + Math.sin(now / 520 + a.x) * 0.014;
      if (G.float) lift = 4 + Math.sin(now / 700 + a.x) * 3;
      if (a.state === 'chore') {
        const c = a.chore?.kind;
        if (c === 'sweep') tilt = Math.sin(now / 160) * 6;
        else if (c === 'hammer') { const p = (now % 640) / 640; tilt = p < 0.2 ? -p * 30 : p < 0.3 ? 6 : 0; sy *= p > 0.2 && p < 0.32 ? 0.95 : 1; }
        else if (c === 'dance') { tilt = Math.sin(now / 140) * 10; lift = Math.abs(Math.sin(now / 280)) * 7; }
        else if (c === 'sing' || c === 'sprinkle') tilt = Math.sin(now / 300) * 5;
        else if (c === 'water' || c === 'rain') tilt = a.facing * 3;
      }
    }
    if (a.state === 'sleep' || a.state === 'doze') frame = FRAME.sleep;
    // With less motion a friend still smiles and talks, but never jumps, breathes or blinks.
    if (now < a.reactUntil && !reduced) { const p = 1 - (a.reactUntil - now) / 700; lift = Math.max(lift, Math.sin(Math.max(0, p) * Math.PI) * 18); sy = 1 + Math.sin(p * Math.PI) * 0.06; sx = 1 - Math.sin(p * Math.PI) * 0.03; }
    if (now < a.happyUntil) frame = FRAME.happy;
    else if (now < a.talkUntil && !reduced) frame = Math.floor(now / 140) % 2 ? FRAME.talk : FRAME.idle;
    else if (a.state === 'chore' && a.chore?.kind === 'sing') frame = Math.floor(now / 300) % 3 ? FRAME.happy : FRAME.talk;
    else if (frame === FRAME.idle && now < a.blinkUntil) frame = FRAME.blink;
    if (frame === FRAME.idle && now > a.blinkAt && !reduced) { a.blinkUntil = now + 130; a.blinkAt = now + rand(2600, 6200); }
    if (a.sayUntil && now > a.sayUntil) { a.sayUntil = 0; a.bubble.classList.add('is-out'); setTimeout(() => { if (!a.sayUntil) a.bubble.hidden = true; }, 260); }
    const showMark = a.marked && !a.sayUntil && a.state !== 'sleep';
    if (a.markEl && a.markEl.hidden === showMark) a.markEl.hidden = !showMark;
    const pos = `translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0)`;
    const body = `translateY(${(-lift).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg) scale(${(a.facing * sx).toFixed(3)},${sy.toFixed(3)})`;
    const key = pos + body + frame + a.state;
    if (key !== a.lastWrite) {
      a.lastWrite = key;
      a.el.style.transform = pos;
      a.el.style.zIndex = String(Math.round(a.y));
      a.body.style.transform = body;
      a.shadow.style.transform = `scale(${(1 - lift / 40).toFixed(3)})`;
      if (a.frame !== frame) { a.frame = frame; a.sprite.style.setProperty('--f', frame); }
      a.el.dataset.state = a.state;
    }
    const feet = `${ll.toFixed(2)},${lr.toFixed(2)},${lx.toFixed(2)},${rx.toFixed(2)}`;
    if (feet !== a.lastFeet) {
      a.lastFeet = feet;
      const st = a.sprite.style;
      st.setProperty('--ll', ll.toFixed(2)); st.setProperty('--lr', lr.toFixed(2));
      st.setProperty('--lx', `${lx.toFixed(2)}px`); st.setProperty('--rx', `${rx.toFixed(2)}px`);
    }
  };

  /* ================= The air ================= */
  const R = (seed) => rng(seed);
  const flameRate = { embers: 2, small: 4, steady: 6, tall: 9, bonfire: 13 };
  let isAutumn = season === 'autumn', isSpring = season === 'spring', isWinter = season === 'winter';
  const made = (id) => pets.decor?.find((t) => t.id === id)?.made;
  const fireflyCount = () => (dark() ? Math.round(8 + pets.harmony * 22 + (made('fireflies') ? 26 : 0)) : 0);
  const butterflyCount = () => (!dark() && hour !== 'dawn' && weather !== 'rain' ? 6 + (made('flowers') ? 4 : 0) : 0);
  // One soft puff per light, drawn once and stamped for every wisp of smoke and steam.
  const puffOf = (rgb) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const pg = c.getContext('2d'), gr = pg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.45, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    pg.fillStyle = gr; pg.fillRect(0, 0, 64, 64);
    return c;
  };
  const puffs = { day: puffOf('246,242,234'), dark: puffOf('150,152,166'), dust: puffOf('196,170,120') };
  let sparkAcc = 0, smokeAcc = 0, steamAcc = 0, rippleAt = 2000, birdsAt = rand(2500, 6000), lanternAcc = 0;
  const glints = Array.from({ length: 16 }, (_, i) => { const r = R(`glint${i}`); const t = r() * Math.PI * 2, d = Math.sqrt(r()); return { x: POND.x + Math.cos(t) * POND.rx * d * 0.85, y: POND.y + Math.sin(t) * POND.ry * d * 0.8, p: r() * 6 }; });
  const ensure = (kind, n, make) => { const have = parts.filter((p) => p.kind === kind).length; for (let i = have; i < n; i += 1) parts.push(make(i)); };
  const lilies = (TREASURE_AT.lilylights ?? []);
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

  /** A chore's particle, thrown into the air at painting point (x, y). */
  function emit(kind, x, y, scale = 1, dir = 1) {
    if (reduced || parts.length > 420) return;
    if (kind === 'drop') parts.push({ kind: 'drop', x, y, vx: dir * rand(8, 22), vy: rand(10, 30), life: rand(0.5, 0.8), age: 0 });
    else if (kind === 'dust') parts.push({ kind: 'dust', x, y, vx: rand(-8, 8), vy: rand(-6, -2), life: rand(0.5, 0.9), age: 0, r: rand(3, 5) * scale });
    else if (kind === 'spark') parts.push({ kind: 'spark', x, y, vx: rand(-14, 14), vy: rand(-55, -30), life: rand(0.6, 1.2), age: 0, r: rand(1.2, 2.2) });
    else if (kind === 'note') parts.push({ kind: 'glyph', ch: pickOf(['♪', '♫', '♪']), color: '#5a4130', x, y, vx: rand(-6, 6), vy: rand(-26, -18), life: rand(1.4, 2), age: 0, s: rand(11, 14), w: rand(0, 6) });
    else if (kind === 'letter') parts.push({ kind: 'glyph', ch: LETTERS[Math.floor(Math.random() * 26)], color: '#7a5a3a', x, y, vx: rand(-5, 5), vy: rand(-20, -12), life: rand(1.6, 2.2), age: 0, s: rand(9, 12), w: rand(0, 6), serif: true });
    else if (kind === 'steam') parts.push({ kind: 'steam', x, y, vx: rand(-2, 3), vy: rand(-12, -7), life: rand(1.4, 2), age: 0, r: rand(2, 3), w: rand(0, 6) });
    else if (kind === 'sparkle') parts.push({ kind: 'sparkle', x: x + rand(-14, 14), y: y + rand(-10, 10), life: rand(0.6, 1.1), age: 0, r: rand(2.5, 4.5) });
    else if (kind === 'confetti') parts.push({ kind: 'confetti', x, y, vx: rand(-70, 70), vy: rand(-190, -90), life: rand(1.8, 2.6), age: 0, rot: rand(0, 6), vr: rand(-9, 9), c: pickOf(CONFETTI), w: rand(3, 5), h: rand(5, 8) });
  }

  const air = (dt) => {
    // spawners
    sparkAcc += dt * (flameRate[pets.flame.tier] ?? 4) * (0.6 + pets.harmony * 0.6);
    while (sparkAcc > 1) { sparkAcc -= 1; parts.push({ kind: 'spark', x: FIRE.x + rand(-12, 12), y: FIRE.y - 10, vx: rand(-10, 10), vy: rand(-62, -34), life: rand(1.1, 2.2), age: 0, r: rand(1.2, 2.6) }); }
    smokeAcc += dt;
    if (smokeAcc > 0.34) { smokeAcc = 0; for (const c of CHIMNEYS) parts.push({ kind: 'smoke', x: c.x + rand(-2, 2), y: c.y, vx: rand(5, 11) * (weather === 'rain' ? 1.8 : 1), vy: rand(-22, -15), life: rand(4.5, 6.5), age: 0, r: rand(5, 7), w: rand(0, 6) }); }
    steamAcc += dt;
    if (steamAcc > 0.55) { steamAcc = 0; parts.push({ kind: 'steam', x: TEAPOT.x + rand(-2, 2), y: TEAPOT.y, vx: rand(-2, 4), vy: rand(-11, -7), life: rand(1.8, 2.6), age: 0, r: rand(2, 3), w: rand(0, 6) }); }
    ensure('firefly', fireflyCount(), (i) => { const r = R(`ff${i}${now | 0}`); const anchors = [[620, 540], [940, 540], [330, 520], [1200, 520], [400, 820], [800, 660], [1100, 760], [770, 420]]; const [ax, ay] = anchors[i % anchors.length]; return { kind: 'firefly', ax: ax + (r() - 0.5) * 160, ay: ay + (r() - 0.5) * 90, x: ax, y: ay, t: r() * 100, sp: 0.3 + r() * 0.5 }; });
    ensure('butterfly', butterflyCount(), (i) => { const r = R(`bf${i}${now | 0}`); const anchors = [[300, 470], [460, 700], [1250, 480], [560, 640], [980, 640], [450, 300], [940, 330]]; const [ax, ay] = anchors[i % anchors.length]; return { kind: 'butterfly', ax, ay, x: ax, y: ay, t: r() * 100, c: ['#FFF6E0', '#F7D774', '#A9C8F0', '#F4B6C2'][i % 4] }; });
    if (isAutumn || isSpring) ensure('leaf', weather === 'rain' ? 4 : 9, () => ({ kind: 'leaf', x: rand(0, 1536), y: rand(-200, 900), vx: rand(6, 18), vy: rand(14, 26), rot: rand(0, 6), vr: rand(-1.5, 1.5), sway: rand(0, 6), c: isSpring ? pickOf(['#F6C9D2', '#FBE3E8', '#F2B4C3']) : pickOf(['#D9822B', '#E6A23C', '#C4602D', '#E9C46A']) }));
    if (weather === 'rain') ensure('rain', 140, () => ({ kind: 'rain', x: rand(-100, 1536), y: rand(-100, 1024), v: rand(520, 700) }));
    if (weather === 'snow' || isWinter) ensure('snow', weather === 'snow' ? 90 : 0, () => ({ kind: 'snow', x: rand(0, 1536), y: rand(-50, 1024), v: rand(14, 30), s: rand(0, 6), r: rand(1.2, 2.6) }));
    if (hour === 'afternoon' || hour === 'morning') ensure('mote', 12, (i) => ({ kind: 'mote', x: rand(400, 1150), y: rand(250, 800), t: i * 1.7 }));
    if (now > rippleAt) { rippleAt = now + rand(weather === 'rain' ? 600 : 3500, weather === 'rain' ? 1400 : 8000); const r = R(`rip${now | 0}`); const t = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.8; parts.push({ kind: 'ripple', x: POND.x + Math.cos(t) * POND.rx * d, y: POND.y + Math.sin(t) * POND.ry * d, age: 0, life: 2.6 }); }
    if (!dark() && weather !== 'rain' && now > birdsAt) {
      birdsAt = now + rand(22e3, 42e3);
      const ltr = Math.random() < 0.5, y0 = rand(50, 200), n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i += 1) parts.push({ kind: 'bird', x: ltr ? -40 - i * 26 : 1576 + i * 26, y: y0 + (i % 2) * 14 + i * 4, vx: ltr ? rand(70, 85) : -rand(70, 85), t: Math.random() * 6, age: 0, life: 30 });
    }
    if (night() && made('skylanterns') && pets.harmony >= 0.5) { lanternAcc += dt * 0.5; while (lanternAcc > 1) { lanternAcc -= 1; parts.push({ kind: 'lantern', x: rand(640, 900), y: rand(440, 560), vy: rand(-14, -9), age: 0, life: 40, t: Math.random() * 6 }); } }

    // draw
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    g.clearRect(0, 0, 1536, 1024);
    // the fire's own light
    const flick = 0.85 + Math.sin(now / 90) * 0.06 + Math.sin(now / 37) * 0.05;
    const fr = (dark() ? 120 : 70) * (0.7 + pets.harmony * 0.4) * flick;
    const fg = g.createRadialGradient(FIRE.x, FIRE.y - 6, 4, FIRE.x, FIRE.y - 6, fr);
    fg.addColorStop(0, `rgba(255,190,90,${dark() ? 0.55 : 0.28})`); fg.addColorStop(1, 'rgba(255,150,60,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = fg; g.beginPath(); g.arc(FIRE.x, FIRE.y - 6, fr, 0, 7); g.fill();
    // glints on the pond
    for (const s of glints) { const a = Math.max(0, Math.sin(now / 700 + s.p)) ** 6; if (a < 0.05) continue; g.fillStyle = `rgba(255,255,240,${(a * (dark() ? 0.35 : 0.8)).toFixed(3)})`; star4(s.x, s.y, 2.6 + a * 2); }
    if (made('lilylights') && dark()) for (const [i, l] of lilies.entries()) { const a = 0.6 + Math.sin(now / 800 + i) * 0.2; glowDot(l.x, l.y + Math.sin(now / 1200 + i) * 2, 16, `rgba(255,214,140,${a.toFixed(2)})`); }
    g.globalCompositeOperation = 'source-over';
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const p = parts[i];
      if (p.life !== undefined) { p.age += dt; if (p.age > p.life) { parts.splice(i, 1); continue; } }
      const k = p.life ? p.age / p.life : 0;
      switch (p.kind) {
        case 'spark':
          p.x += (p.vx + Math.sin(now / 200 + i) * 8) * dt; p.y += p.vy * dt;
          g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,${180 - k * 90 | 0},70,${(1 - k).toFixed(2)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
          break;
        case 'smoke':
        case 'steam': {
          // Rises, slows, spreads and leans with the wind; fades in, then out.
          p.x += (p.vx + Math.sin(now / 700 + p.w) * 4) * dt; p.y += p.vy * dt; p.vy *= 1 - dt * 0.12;
          p.r += dt * (p.kind === 'smoke' ? 6 : 3.2);
          const a = (p.kind === 'smoke' ? (dark() ? 0.3 : 0.5) : (dark() ? 0.3 : 0.55)) * Math.min(1, k / 0.12) * (1 - k);
          g.globalAlpha = a;
          g.drawImage(dark() ? puffs.dark : puffs.day, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
          g.globalAlpha = 1;
          break;
        }
        case 'dust': {
          p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 9;
          g.globalAlpha = 0.5 * (1 - k);
          g.drawImage(puffs.dust, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
          g.globalAlpha = 1;
          break;
        }
        case 'confetti':
          p.vy += 230 * dt; p.vx *= 1 - dt * 0.9; p.x += (p.vx + Math.sin(now / 160 + p.rot) * 18) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, (1 - k) * 2.5);
          g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.7)) + 1);
          g.restore(); g.globalAlpha = 1;
          break;
        case 'drop':
          p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          g.strokeStyle = `rgba(150,200,240,${(0.95 * (1 - k * 0.6)).toFixed(2)})`; g.lineWidth = 2; g.lineCap = 'round';
          g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.025); g.stroke();
          break;
        case 'glyph': {
          p.x += (p.vx + Math.sin(now / 400 + p.w) * 10) * dt; p.y += p.vy * dt;
          g.globalAlpha = Math.min(1, k / 0.15) * (1 - k);
          g.fillStyle = p.color; g.font = `${p.serif ? 'italic ' : ''}700 ${p.s}px ${p.serif ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
          g.fillText(p.ch, p.x, p.y);
          g.globalAlpha = 1;
          break;
        }
        case 'sparkle': {
          const a = Math.sin(k * Math.PI);
          g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,246,200,${a.toFixed(2)})`; star4(p.x, p.y, p.r * (0.5 + a)); g.globalCompositeOperation = 'source-over';
          break;
        }
        case 'firefly': {
          if (!dark()) { parts.splice(i, 1); break; }
          p.t += dt * p.sp; p.x = p.ax + Math.sin(p.t * 1.3) * 40 + Math.sin(p.t * 0.7) * 30; p.y = p.ay + Math.cos(p.t * 1.1) * 26;
          const a = Math.max(0, Math.sin(p.t * 3 + p.ax)) ** 2 * (hour === 'dusk' ? 0.6 : 1);
          if (a > 0.04) { g.globalCompositeOperation = 'lighter'; glowDot(p.x, p.y, 9, `rgba(230,255,140,${(a * 0.9).toFixed(2)})`); g.globalCompositeOperation = 'source-over'; }
          break;
        }
        case 'butterfly': {
          if (!butterflyCount()) { parts.splice(i, 1); break; }
          p.t += dt; const px = p.x; p.x = p.ax + Math.sin(p.t * 0.6) * 60 + Math.sin(p.t * 1.7) * 14; p.y = p.ay + Math.cos(p.t * 0.9) * 30 + Math.sin(p.t * 2.3) * 8;
          const flap = Math.abs(Math.sin(p.t * 14)) * 4 + 1, dir = p.x > px ? 1 : -1;
          g.fillStyle = p.c; g.strokeStyle = 'rgba(60,40,30,.6)'; g.lineWidth = 0.8;
          g.beginPath(); g.ellipse(p.x - flap * 0.7 * dir, p.y - 2, flap, 3.2, -0.5 * dir, 0, 7); g.fill(); g.stroke();
          g.beginPath(); g.ellipse(p.x + flap * 0.5 * dir, p.y - 2, flap * 0.8, 2.8, 0.5 * dir, 0, 7); g.fill(); g.stroke();
          break;
        }
        case 'leaf':
          p.x += (p.vx + Math.sin(now / 900 + p.sway) * 14) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.y > 1040 || p.x > 1560) { p.x = rand(-40, 1400); p.y = rand(-60, -10); }
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, 4.4, 2.2, 0, 0, 7); g.fill(); g.restore();
          break;
        case 'rain':
          p.y += p.v * dt; p.x += p.v * 0.18 * dt;
          if (p.y > 1030) { p.y = rand(-60, -10); p.x = rand(-200, 1536); }
          g.strokeStyle = 'rgba(220,230,245,.32)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - 3, p.y - 15); g.stroke();
          break;
        case 'snow':
          p.y += p.v * dt; p.x += Math.sin(now / 1000 + p.s) * 10 * dt;
          if (p.y > 1030) { p.y = -10; p.x = rand(0, 1536); }
          g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
          break;
        case 'mote': {
          if (dark()) { parts.splice(i, 1); break; }
          p.t += dt * 0.25; const x = p.x + Math.sin(p.t) * 30, y = p.y + Math.cos(p.t * 0.8) * 20 - (p.t * 6) % 40;
          const a = (Math.sin(p.t * 2.2) + 1) / 2 * 0.5;
          g.globalCompositeOperation = 'lighter'; glowDot(x, y, 5, `rgba(255,236,170,${a.toFixed(2)})`); g.globalCompositeOperation = 'source-over';
          break;
        }
        case 'ripple':
          g.strokeStyle = `rgba(235,245,255,${(0.5 * (1 - k)).toFixed(2)})`; g.lineWidth = 1.4; g.beginPath(); g.ellipse(p.x, p.y, 4 + k * 26, 2 + k * 10, 0, 0, 7); g.stroke();
          break;
        case 'bird': {
          p.x += p.vx * dt; p.t += dt * 9; if (p.x < -80 || p.x > 1620) { parts.splice(i, 1); break; }
          const w = Math.sin(p.t) * 4;
          g.strokeStyle = 'rgba(52,48,44,.7)'; g.lineWidth = 1.8; g.lineCap = 'round';
          g.beginPath(); g.moveTo(p.x - 7, p.y - w); g.quadraticCurveTo(p.x - 3, p.y - 3, p.x, p.y); g.quadraticCurveTo(p.x + 3, p.y - 3, p.x + 7, p.y - w); g.stroke();
          break;
        }
        case 'lantern':
          p.y += p.vy * dt; p.x += Math.sin(now / 1400 + p.t) * 6 * dt;
          g.globalCompositeOperation = 'lighter'; glowDot(p.x, p.y, 18, `rgba(255,190,110,${(0.7 * (1 - k)).toFixed(2)})`); g.globalCompositeOperation = 'source-over';
          g.fillStyle = `rgba(240,140,70,${(1 - k).toFixed(2)})`; g.fillRect(p.x - 4, p.y - 6, 8, 10);
          break;
        default: break;
      }
    }
    g.globalCompositeOperation = 'source-over';
  };
  function star4(x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.28, y - r * 0.28); g.lineTo(x + r, y); g.lineTo(x + r * 0.28, y + r * 0.28); g.lineTo(x, y + r); g.lineTo(x - r * 0.28, y + r * 0.28); g.lineTo(x - r, y); g.lineTo(x - r * 0.28, y - r * 0.28); g.closePath(); g.fill(); }
  function glowDot(x, y, r, c) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

  /* ================= The clock tower keeps real time ================= */
  const hourHand = root.querySelector('.cw-clock__h'), minHand = root.querySelector('.cw-clock__m');
  const setClock = () => { const d = new Date(); const m = d.getMinutes(), h = (d.getHours() % 12) + m / 60; hourHand?.setAttribute('transform', `rotate(${h * 30})`); minHand?.setAttribute('transform', `rotate(${m * 6})`); };
  setClock();
  const clockTimer = setInterval(setClock, 20e3);

  /* ================= The loop ================= */
  for (const a of actors) { reserved.add(a.node); paintPet(a); }
  if (reduced) { for (const a of actors) { a.state = night() ? 'doze' : 'idle'; a.until = 1e12; paintPet(a); } air(0); }

  const frame = (t) => {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = t; return; }
    const dt = Math.min(0.05, (t - last) / 1000); last = t; now += dt * 1000;
    if (!reduced) {
      for (const a of actors) stepPet(a, dt);
      runChats();
    }
    for (const a of actors) paintPet(a);
    if (!reduced) air(dt);
    if (!reduced) water.paint(now, weather);
  };
  raf = requestAnimationFrame(frame);

  /* ================= What the screen can ask of it ================= */
  return {
    ripple: (x, y) => water.ripple(x, y),
    positionOf: (id) => { const a = byId.get(id); return a ? { x: a.x, y: a.y - 40 } : NODES.pc; },
    /** A tap: the friend jumps, a heart floats up, and it says something (unless `quiet`). Returns what it said. */
    poke(id, { happy = false, line = null, quiet = false } = {}) {
      const a = byId.get(id); if (!a) return '';
      // A quiet happy poke is the welcome back: the friend beams for as long as the toast names its stars.
      a.reactUntil = now + 700; a.happyUntil = now + (happy ? (quiet ? 4200 : 2200) : 900);
      if (!reduced) { heart(a); if (happy) setTimeout(() => heart(a), 220); }
      if (a.state === 'sleep' || a.state === 'doze') { a.state = 'idle'; a.until = now + 3000; }
      if (quiet) return '';
      const said = line ?? lineFor(id, 'tap', `${now | 0}`);
      say(a, `<span>${said}</span>`, line ? 4200 : 2600);
      return said;
    },
    /** The friends you can see wave hello as you arrive, one after another. */
    greet(ids) {
      if (reduced) return;
      ids.forEach((id, i) => setTimeout(() => {
        const a = byId.get(id);
        if (!a || destroyed || a.sayUntil) return;
        a.reactUntil = now + 700; a.happyUntil = now + 1600;
        if (a.state === 'sleep' || a.state === 'doze') { a.state = 'idle'; a.until = now + 2600; }
        say(a, `<span>${night() && a.id !== 'toffee' ? 'Oh! Hi!' : pickOf(HELLO)}</span>`, 1900);
      }, 500 + i * 420));
    },
    /** A friend comes to meet you at a node and says something. */
    comeSay(id, nodeId, line) {
      const a = byId.get(id);
      if (!a) return;
      if (reduced || !walkTo(a, nodeId, 'greet', { x: rand(-20, 20), y: 6 })) { say(a, `<span>${line}</span>`, 5200); return; }
      const wait = setInterval(() => {
        if (destroyed) { clearInterval(wait); return; }
        if (a.state !== 'walk') { clearInterval(wait); a.reactUntil = now + 700; a.happyUntil = now + 2400; heart(a); say(a, `<span>${line}</span>`, 5200); }
      }, 200);
    },
    /**
     * A finished set (owner: "all pets come together and celebrate in the
     * middle"): every friend runs to the plaza, makes a ring round `center`,
     * and they cheer; `center` says `line`. Confetti, then back to their day.
     */
    party(center, { line = '', ms = 9000 } = {}) {
      const c = NODES.pc;
      party = { center, line };
      const others = actors.filter((a) => a.id !== center);
      const spots = [[center, 0, 6], ...others.map((a, i) => { const t = -Math.PI / 2 + ((i + 0.5) / others.length) * Math.PI * 2; return [a.id, Math.cos(t) * 150, Math.sin(t) * 70]; })];
      for (const [id, dx, dy] of spots) {
        const a = byId.get(id);
        if (!a) continue;
        if (a.partner) { a.partner.partner = null; a.partner = null; }
        a.partyUntil = now + ms;
        // They come running already beaming; the friend you helped beams longest.
        a.happyUntil = now + (id === center ? 5000 : 3000);
        if (reduced) { say(a, `<span>${id === center && line ? line : lineFor(id, 'cheer', 'r')}</span>`, id === center ? 5200 : 2600, { speak: id === center }); continue; }
        if (walkTo(a, 'pc', 'cheer', { x: dx, y: dy })) a.rush = true;
        else { endChore(a); a.x = c.x + dx; a.y = c.y + dy; a.path = []; startCheer(a); }
      }
      if (!reduced) for (const at of [1500, 2700, 4200]) setTimeout(() => { if (!destroyed) for (let i = 0; i < 34; i += 1) emit('confetti', c.x + rand(-110, 110), c.y - rand(30, 90)); }, at);
    },
    /** Keep a friend standing where they are (the first-visit introductions), until `release`. */
    hold(id, ms = 3e5) {
      const a = byId.get(id);
      if (!a) return;
      if (a.target) reserved.delete(a.target);
      if (a.partner) { a.partner.partner = null; a.partner = null; }
      endChore(a);
      a.target = null; a.path = []; a.rush = false; a.state = 'idle'; a.until = now + ms;
    },
    release() { for (const a of actors) if (a.state === 'idle') a.until = now; },
    /** One of the friends you can see says something that is very them. */
    muse(ids) {
      if (reduced) return '';
      const a = pickOf(actors.filter((x) => ids.includes(x.id) && !x.sayUntil && !x.partner && x.state !== 'sleep' && x.state !== 'doze' && x.state !== 'cheer'));
      if (!a) return '';
      const line = lineFor(a.id, 'muse', `${now | 0}`);
      say(a, `<span>${line}</span>`, 4400, { soft: true });
      return line;
    },
    /** The friends who have a "!" over their heads: today's three, until they are helped. */
    setMarks(ids) { const set = new Set(ids); for (const a of actors) a.marked = set.has(a.id); },
    /** Say a line and resolve when it is gone (or tapped away). */
    sayAndWait(id, line, { ms = 5000, tapToSkip = false } = {}) {
      const a = byId.get(id);
      if (!a) return Promise.resolve();
      say(a, `<span>${line}</span><small class="pet-bubble__tap">${tapToSkip ? 'tap to continue' : ''}</small>`, ms);
      a.bubble.classList.add('is-pinned');
      return new Promise((res) => {
        let done = false;
        const finish = () => { if (done) return; done = true; a.bubble.classList.remove('is-pinned'); a.sayUntil = now; root.removeEventListener('pointerdown', finish, true); res(); };
        setTimeout(finish, ms);
        if (tapToSkip) setTimeout(() => root.addEventListener('pointerdown', finish, true), 350);
      });
    },
    update(next) {
      pets = next;
      for (const a of actors) { const w = wordOf(a.id); if (w !== a.word) { a.word = w; if (a.state !== 'walk' && a.state !== 'chore') a.until = now; } }
    },
    setAtmo(at) { hour = at.hour; weather = at.weather; season = at.season; isAutumn = season === 'autumn'; isSpring = season === 'spring'; isWinter = season === 'winter'; for (const a of actors) if (a.state !== 'walk') a.until = now; },
    destroy() { destroyed = true; cancelAnimationFrame(raf); clearInterval(clockTimer); water.destroy(); },
  };
}

export { CLOCK };
