/**
 * life.js — what makes the village feel lived in.
 *
 * Two halves on one animation frame:
 *
 *   THE PETS   six small state machines. A pet idles at its door, blinks,
 *              hop-walks the painted paths to the plaza, a bench, the fire
 *              or a friend's house, stops to chat, carries its gift to the
 *              next pet in the ring, and goes home to sleep at night. How
 *              far and how often it wanders is its mood: a glowing pet roams
 *              and sparkles, a sleepy one dozes on its step, a wilting one
 *              sits grey by a dark window.
 *   THE AIR    one half-resolution canvas: fire sparks, chimney smoke,
 *              fireflies, butterflies, falling leaves, glints and ripples
 *              on the pond, birds, rain, motes in the afternoon light.
 *
 * Everything is in painting pixels (src/pets/paths.js). Reduced motion
 * leaves the pets standing at home, awake, and the canvas still.
 */

import { NODES, HOMES, PLACES, SPOTS, route, nearestNode, FIRE, CHIMNEYS, TEAPOT, POND, CLOCK, TREASURE_AT } from '../pets/paths.js';
import { SHEETS } from '../pets/sheets.js';
import { FRAME, giftIcon } from '../pets/sprite.js';
import { PETS, PET_BY_ID, LINES, gossipLine, lineFor, successorOf } from '../pets/pets.js';
import { rng } from '../world/engine/palette.js';

/** Drawn height of each pet, in painting pixels. */
export const PET_SIZE = Object.freeze({ toffee: 70, chai: 84, matcha: 78, mochi: 78, ginger: 84, mallow: 80 });

const SPEED = { glowing: 46, happy: 40, missing: 30, sleepy: 24, wilting: 20, new: 36 };
const AWAKE = new Set(['glowing', 'happy', 'missing', 'new']);
const CHAT_ICONS = ['♥', '♪', '…', '✿', '☺', '♫'];
const rand = (a, b) => a + Math.random() * (b - a);
const pickOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * @param {HTMLElement} root  the .cw section
 * @param {{pets, atmo, reduced, sizes}} o
 */
export function createLife(root, { pets: petsState, atmo, reduced }) {
  const map = root.querySelector('.cw-map');
  const canvas = root.querySelector('.cw-life');
  const g = canvas.getContext('2d');
  let pets = petsState;
  let hour = atmo.hour, weather = atmo.weather, season = atmo.season;
  const night = () => hour === 'night';
  const dark = () => hour === 'night' || hour === 'dusk';
  let destroyed = false, raf = 0, last = performance.now(), now = 0;
  const reserved = new Set();

  /* ================= The pets ================= */
  const actors = PETS.map((p, i) => {
    const el = root.querySelector(`.pet[data-pet="${p.id}"]`);
    const home = HOMES[p.id].node;
    const n = NODES[home];
    const a = {
      id: p.id, el, body: el.querySelector('.pet-body'), sprite: el.querySelector('.pet-sprite'),
      bubble: el.querySelector('.pet-bubble'), thinkEl: el.querySelector('.pet-think'),
      x: n.x + (i % 2 ? 6 : -6), y: n.y, node: home, home, path: [], state: 'idle', until: 400 + i * 700,
      next: null, facing: i % 2 ? -1 : 1, hop: 0, frame: 0, blinkAt: rand(800, 4000), blinkUntil: 0,
      talkUntil: 0, sayUntil: 0, happyUntil: 0, reactUntil: 0, carry: null, partner: null, target: null,
      word: 'happy', lastWrite: '', thinking: false, onArrive: null,
    };
    return a;
  });
  const byId = new Map(actors.map((a) => [a.id, a]));
  const wordOf = (id) => pets.pets.find((p) => p.id === id)?.word ?? 'happy';
  for (const a of actors) a.word = wordOf(a.id);

  /** Walk to a node (or a free point near it), then do `next`. */
  const walkTo = (a, nodeId, next = 'idle', offset = null) => {
    const from = nearestNode({ x: a.x, y: a.y });
    const pts = route(from, nodeId).map((p) => ({ ...p }));
    if (!pts.length) return false;
    if (offset) pts[pts.length - 1] = { x: pts[pts.length - 1].x + offset.x, y: pts[pts.length - 1].y + offset.y };
    if (Math.hypot(pts[0].x - a.x, pts[0].y - a.y) < 4) pts.shift();
    if (a.target) reserved.delete(a.target);
    a.target = nodeId; reserved.add(nodeId);
    a.path = pts; a.state = 'walk'; a.next = next;
    return true;
  };
  const freeNode = (list) => {
    const free = list.filter((n) => !reserved.has(n));
    return free.length ? pickOf(free) : null;
  };

  const say = (a, html, ms = 2600, talk = true) => {
    a.bubble.innerHTML = html;
    a.bubble.hidden = false;
    a.bubble.classList.remove('is-out');
    a.sayUntil = now + ms;
    if (talk) a.talkUntil = now + Math.min(ms - 300, 1800);
    a.thinkEl.hidden = true;
  };

  /** What a free pet does next. The mood decides how far it goes. */
  const decide = (a) => {
    a.partner = null;
    const w = a.word = wordOf(a.id);
    if (a.carry) { a.carry = null; a.el.querySelector('.pet-carry')?.remove(); }
    if (reduced) { a.state = 'idle'; a.until = now + 1e9; return; }
    if (night() && a.id !== 'toffee') {
      if (a.node !== a.home) walkTo(a, a.home, 'sleep');
      else { a.state = 'sleep'; a.until = now + rand(15e3, 30e3); }
      return;
    }
    if (a.id === 'toffee') {
      const r = Math.random();
      if (night()) { a.state = r < 0.7 ? 'sleep' : 'idle'; a.until = now + rand(8e3, 16e3); return; }
      if (a.node !== a.home && r < 0.6) { walkTo(a, a.home, 'idle'); return; }
      if (r < 0.12) { const n = freeNode(SPOTS.fire.filter((x) => x !== a.node)); if (n) { walkTo(a, n, 'idle'); return; } }
      if (r < 0.2 && w !== 'sleepy' && w !== 'wilting') { const n = freeNode(['kiosk', 'ps', 's2']); if (n) { walkTo(a, n, 'idle'); return; } }
      a.state = w === 'wilting' || w === 'sleepy' ? 'doze' : 'idle'; a.until = now + rand(4e3, 9e3);
      return;
    }
    if (w === 'wilting') { if (a.node !== a.home) walkTo(a, a.home, 'slump'); else { a.state = 'slump'; a.until = now + 20e3; } return; }
    if (w === 'sleepy') {
      if (a.node !== a.home) { walkTo(a, a.home, 'doze'); return; }
      a.state = Math.random() < 0.6 ? 'doze' : 'idle'; a.until = now + rand(6e3, 14e3); return;
    }
    if (a.node !== a.home && Math.random() < 0.35) { walkTo(a, a.home, 'idle'); return; }
    const r = Math.random();
    if (w === 'missing') {
      if (r < 0.22) { walkTo(a, 'cottage', 'look'); return; }
      a.state = 'idle'; a.until = now + rand(5e3, 10e3);
      if (Math.random() < 0.5) say(a, '…', 2200, false);
      return;
    }
    if (w === 'new') {
      if (r < 0.15) { const n = freeNode(SPOTS.plaza); if (n) { walkTo(a, n, 'idle'); return; } }
      a.state = 'idle'; a.until = now + rand(4e3, 8e3);
      if (Math.random() < 0.35) { a.reactUntil = now + 600; say(a, '?', 1600, false); }
      return;
    }
    // happy and glowing
    const roam = w === 'glowing' ? 1 : 0.8;
    if (r < 0.32 * roam) { const n = freeNode(SPOTS.plaza); if (n) { walkTo(a, n, 'idle'); return; } }
    if (r < 0.44 * roam) { const n = freeNode(SPOTS.visit.filter((x) => x !== a.home)); if (n) { walkTo(a, n, 'idle'); return; } }
    if (r < 0.52 * roam) { const n = freeNode(SPOTS.bench); if (n) { walkTo(a, n, 'sit'); return; } }
    if (r < 0.58 * roam && (a.id === 'matcha' || a.id === 'mallow' || a.id === 'mochi')) { if (!reserved.has('dock')) { walkTo(a, 'dock', 'idle'); return; } }
    if (r < 0.64 * roam) { const n = freeNode(SPOTS.fire); if (n) { walkTo(a, n, 'sit'); return; } }
    if (r < 0.8 && startChat(a)) return;
    a.state = 'idle'; a.until = now + rand(w === 'glowing' ? 2500 : 3500, 7000);
  };

  /* ---- Two pets meet on the plaza and talk ---- */
  const chats = [];
  const startChat = (a) => {
    const others = actors.filter((b) => b !== a && b.id !== 'toffee' && !b.partner && AWAKE.has(b.word) && (b.state === 'idle' || b.state === 'sit') && !night());
    if (!others.length) return false;
    const b = pickOf(others);
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
      say(speaker, `<span>${text}</span>`, text.length > 3 ? 3000 : 1700);
      if (text === '♥') speaker.happyUntil = now + 900;
      c.step += 1; c.at = now + (text.length > 3 ? 3200 : 1900);
    }
  };

  /* ---- The ring, made visible: a happy pet carries its gift next door ---- */
  let nextDelivery = rand(9e3, 16e3);
  const tryDelivery = () => {
    if (night() || reduced) return;
    const keen = actors.filter((a) => a.id !== 'toffee' && (a.word === 'glowing' || a.word === 'happy') && (a.state === 'idle' || a.state === 'sit') && !a.partner);
    if (!keen.length) return;
    const a = pickOf(keen);
    const to = successorOf(a.id);
    const target = to === 'toffee' ? 'kiosk' : HOMES[to].node;
    const gift = PET_BY_ID.get(a.id).gift;
    if (!walkTo(a, target, 'deliver')) return;
    a.carry = { to, gift };
    a.el.insertAdjacentHTML('beforeend', `<span class="pet-carry" aria-hidden="true">${giftIcon(gift, 20)}</span>`);
  };

  /* ---- Each frame, for each pet ---- */
  const stepPet = (a, dt) => {
    if (a.state === 'walk') {
      let d = SPEED[a.word] * (a.carry ? 1.1 : 1) * dt;
      while (d > 0 && a.path.length) {
        const t = a.path[0], dx = t.x - a.x, dy = t.y - a.y, dist = Math.hypot(dx, dy);
        if (Math.abs(dx) > 0.5) a.facing = dx > 0 ? 1 : -1;
        if (dist <= d) { a.x = t.x; a.y = t.y; a.path.shift(); d -= dist; } else { a.x += (dx / dist) * d; a.y += (dy / dist) * d; d = 0; }
      }
      a.hop += dt * 2.3 * Math.PI * 2 * (SPEED[a.word] / 40);
      if (!a.path.length) arrive(a);
    } else if (a.state !== 'wait' && now > a.until) {
      decide(a);
    }
  };
  const arrive = (a) => {
    a.node = a.target ?? nearestNode({ x: a.x, y: a.y });
    if (a.target) reserved.delete(a.target);
    reserved.add(a.node);
    a.target = null; a.hop = 0;
    const next = a.next ?? 'idle';
    if (next === 'deliver' && a.carry) {
      const to = byId.get(a.carry.to);
      a.el.querySelector('.pet-carry')?.classList.add('is-given');
      setTimeout(() => a.el.querySelector('.pet-carry')?.remove(), 700);
      a.carry = null; a.happyUntil = now + 1200;
      if (to && Math.hypot(to.x - a.x, to.y - a.y) < 140) { to.happyUntil = now + 1400; to.reactUntil = now + 700; heart(to); }
      say(a, giftIcon(PET_BY_ID.get(a.id).gift, 18), 1600, false);
      a.state = 'idle'; a.until = now + 2200;
      reserved.delete(a.node);
      return;
    }
    if (next === 'look') { a.facing = -1; a.state = 'idle'; a.until = now + rand(3e3, 5e3); say(a, '…', 2000, false); return; }
    a.state = next; a.until = now + (next === 'sleep' ? rand(15e3, 30e3) : next === 'sit' ? rand(5e3, 10e3) : next === 'wait' ? 1e9 : rand(2500, 6000));
  };

  const heart = (a) => {
    const h = document.createElement('i');
    h.className = 'pet-heart'; h.textContent = '♥'; h.setAttribute('aria-hidden', 'true');
    h.style.setProperty('--dx', `${rand(-14, 14).toFixed(0)}px`);
    a.el.appendChild(h);
    setTimeout(() => h.remove(), 1400);
  };

  /** Paint one pet: position, depth, hop, facing, frame. Writes only on change. */
  const paintPet = (a) => {
    let frame = FRAME.idle, lift = 0, sx = 1, sy = 1;
    if (a.state === 'walk') {
      const ph = a.hop % (Math.PI * 2);
      lift = Math.abs(Math.sin(ph / 2)) * 7;
      const land = Math.max(0, Math.cos(ph / 2)) ** 6;
      sy = 1 - land * 0.07 + (lift / 7) * 0.03; sx = 1 + land * 0.06;
    } else if (!reduced) {
      sy = 1 + Math.sin(now / 520 + a.x) * 0.012;
    }
    if (a.state === 'sleep' || a.state === 'doze' || (a.state === 'slump')) frame = FRAME.sleep;
    // With less motion a pet still smiles and talks, but never jumps, breathes or blinks.
    if (now < a.reactUntil && !reduced) { const p = 1 - (a.reactUntil - now) / 700; lift = Math.sin(Math.max(0, p) * Math.PI) * 18; sy = 1 + Math.sin(p * Math.PI) * 0.05; }
    if (now < a.happyUntil) frame = FRAME.happy;
    else if (now < a.talkUntil && !reduced) frame = Math.floor(now / 140) % 2 ? FRAME.talk : FRAME.idle;
    else if (frame === FRAME.idle && now < a.blinkUntil) frame = FRAME.blink;
    if (frame === FRAME.idle && now > a.blinkAt && !reduced) { a.blinkUntil = now + 130; a.blinkAt = now + rand(2600, 6200); }
    if (a.state === 'slump') { sy *= 0.9; sx *= 1.04; }
    if (a.sayUntil && now > a.sayUntil) { a.sayUntil = 0; a.bubble.classList.add('is-out'); setTimeout(() => { if (!a.sayUntil) a.bubble.hidden = true; }, 260); }
    const showThink = a.thinking && !a.sayUntil && a.state !== 'walk';
    if (a.thinkEl.hidden === showThink) a.thinkEl.hidden = !showThink;
    const pos = `translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0)`;
    const body = `translateY(${(-lift).toFixed(1)}px) scale(${(a.facing * sx).toFixed(3)},${sy.toFixed(3)})`;
    const key = pos + body + frame + a.state;
    if (key === a.lastWrite) return;
    a.lastWrite = key;
    a.el.style.transform = pos;
    a.el.style.zIndex = String(Math.round(a.y));
    a.body.style.transform = body;
    a.el.querySelector('.pet-shadow').style.transform = `scale(${(1 - lift / 40).toFixed(3)})`;
    if (a.frame !== frame) { a.frame = frame; a.sprite.style.setProperty('--f', frame); }
    a.el.dataset.state = a.state;
  };

  /* ================= The air ================= */
  const parts = [];
  const R = (seed) => rng(seed);
  const flameRate = { embers: 2, small: 4, steady: 6, tall: 9, bonfire: 13 };
  const isAutumn = season === 'autumn', isSpring = season === 'spring', isWinter = season === 'winter';
  const fireflyCount = () => (dark() ? Math.round(8 + pets.harmony * 22 + (made('fireflies') ? 26 : 0) + (pets.festival ? 12 : 0)) : 0);
  const butterflyCount = () => (!dark() && hour !== 'dawn' && weather !== 'rain' ? 3 + (made('flowers') ? 4 : 0) : 0);
  const made = (id) => pets.treasures.find((t) => t.id === id)?.made;
  // One soft puff per light, drawn once and stamped for every wisp of smoke and steam.
  const puffOf = (rgb) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const pg = c.getContext('2d'), gr = pg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.45, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    pg.fillStyle = gr; pg.fillRect(0, 0, 64, 64);
    return c;
  };
  const puffs = { day: puffOf('246,242,234'), dark: puffOf('150,152,166') };
  let sparkAcc = 0, smokeAcc = 0, steamAcc = 0, rippleAt = 2000, birdsAt = rand(20e3, 50e3), lanternAcc = 0;
  const glints = Array.from({ length: 16 }, (_, i) => { const r = R(`glint${i}`); const t = r() * Math.PI * 2, d = Math.sqrt(r()); return { x: POND.x + Math.cos(t) * POND.rx * d * 0.85, y: POND.y + Math.sin(t) * POND.ry * d * 0.8, p: r() * 6 }; });
  const ensure = (kind, n, make) => { const have = parts.filter((p) => p.kind === kind).length; for (let i = have; i < n; i += 1) parts.push(make(i)); };
  const lilies = (TREASURE_AT.lilylights ?? []);

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
      birdsAt = now + rand(55e3, 110e3);
      const ltr = Math.random() < 0.5, y0 = rand(50, 200), n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i += 1) parts.push({ kind: 'bird', x: ltr ? -40 - i * 26 : 1576 + i * 26, y: y0 + (i % 2) * 14 + i * 4, vx: ltr ? rand(70, 85) : -rand(70, 85), t: Math.random() * 6, age: 0, life: 30 });
    }
    if (pets.festival && night() && made('skylanterns')) { lanternAcc += dt * 0.5; while (lanternAcc > 1) { lanternAcc -= 1; parts.push({ kind: 'lantern', x: rand(640, 900), y: rand(440, 560), vy: rand(-14, -9), age: 0, life: 40, t: Math.random() * 6 }); } }

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
        case 'firefly': {
          if (!dark()) { parts.splice(i, 1); break; }
          p.t += dt * p.sp; p.x = p.ax + Math.sin(p.t * 1.3) * 40 + Math.sin(p.t * 0.7) * 30; p.y = p.ay + Math.cos(p.t * 1.1) * 26;
          const a = Math.max(0, Math.sin(p.t * 3 + p.ax)) ** 2 * (hour === 'dusk' ? 0.6 : 1);
          if (a > 0.04) { g.globalCompositeOperation = 'lighter'; glowDot(p.x, p.y, 9, `rgba(230,255,140,${(a * 0.9).toFixed(2)})`); g.globalCompositeOperation = 'source-over'; }
          break;
        }
        case 'butterfly': {
          if (dark()) { parts.splice(i, 1); break; }
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
  const neediest = () => pets.pets.find((p) => p.id === pets.neediest);
  const setThinkers = () => { const n = neediest(); for (const a of actors) a.thinking = !!n && a.id === n.id && n.word !== 'glowing' && n.word !== 'happy'; };
  setThinkers();
  for (const a of actors) { reserved.add(a.node); paintPet(a); }
  if (reduced) { for (const a of actors) { a.state = a.word === 'sleepy' || a.word === 'wilting' || night() ? 'doze' : 'idle'; a.until = 1e12; paintPet(a); } air(0); }

  const frame = (t) => {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = t; return; }
    const dt = Math.min(0.05, (t - last) / 1000); last = t; now += dt * 1000;
    if (!reduced) {
      for (const a of actors) stepPet(a, dt);
      runChats();
      if (now > nextDelivery) { nextDelivery = now + rand(45e3, 90e3); tryDelivery(); }
    }
    for (const a of actors) paintPet(a);
    if (!reduced) air(dt);
  };
  raf = requestAnimationFrame(frame);

  /* ================= What the screen can ask of it ================= */
  return {
    positionOf: (id) => { const a = byId.get(id); return a ? { x: a.x, y: a.y - 40 } : NODES.pc; },
    /** A tap: the pet jumps, a heart floats up, and it says something (unless `quiet`). Returns what it said. */
    poke(id, { happy = false, line = null, quiet = false } = {}) {
      const a = byId.get(id); if (!a) return '';
      // A quiet happy poke is the welcome back: the pet beams for as long as the toast names its gifts.
      a.reactUntil = now + 700; a.happyUntil = now + (happy ? (quiet ? 4200 : 2200) : 900);
      if (!reduced) { heart(a); if (happy) setTimeout(() => heart(a), 220); }
      if (a.state === 'sleep' || a.state === 'doze') { a.state = 'idle'; a.until = now + 3000; }
      if (quiet) return '';
      const said = line ?? lineFor(id, 'tap', `${now | 0}`);
      say(a, `<span>${said}</span>`, line ? 4200 : 2600);
      return said;
    },
    think(id, on) { const a = byId.get(id); if (a) a.thinking = on; },
    /** The pet with a thought bubble: whoever needs a visit most. */
    thinker: () => actors.find((a) => a.thinking)?.id ?? null,
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
      for (const a of actors) { const w = wordOf(a.id); if (w !== a.word) { a.word = w; if (a.state !== 'walk') a.until = now; } }
      setThinkers();
    },
    setAtmo(at) { hour = at.hour; weather = at.weather; for (const a of actors) if (a.state !== 'walk') a.until = now; },
    destroy() { destroyed = true; cancelAnimationFrame(raf); clearInterval(clockTimer); },
  };
}

export { CLOCK };
