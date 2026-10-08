/**
 * village.js (screen) — #/world, the painted village where the seven friends live.
 *
 * The whole game on one screen, in the order a learner reads it:
 *
 *   TOP      Toffee's fire (the days in a row) · the village level and its
 *            Glow · every subject · settings (sound, name, progress)
 *   THE MAP  the painting, alive: friends walking, doing chores, waving.
 *            A "!" floats over each of today's three friends.
 *   BOTTOM   today's three friends and their gift, and ONE big button:
 *            "Help Chai · Read a short passage · 4 min". One tap and you
 *            are learning; every round brings the village back to life.
 *
 * The camera is a transform on one 1536×1024 layer, so every coordinate
 * below is a pixel of the painting (src/pets/paths.js), whatever the screen.
 * It never zooms (owner, 2026-10-03: zoomed out, the village "does not look
 * good"): the painting always fills the screen at full detail, and on a phone
 * you scroll left and right to see the rest of it.
 */

import { loadWorld, loadWorldRecords, deriveWorldState } from '../world/state.js';
import { loadValley, saveValley, valleyName } from '../world/companion.js';
import { derivePets, DAILY_GIFT } from '../pets/economy.js';
import { GLOW_SVG } from '../pets/glow.js';
import { PETS, PET_BY_ID, HOUSES, LINES, lineFor, petForPlace, stageTitle, stageGift, ageOf, grewLine, toGrow, houseGift } from '../pets/pets.js';
import { MAP, HOMES, PLACES, SIGNS, NODES, LAMPS, WINDOWS, CLOCK, nearestNode } from '../pets/paths.js';
import { petRig, petPortrait, petGear, petRing, petFigure, FRAME } from '../pets/sprite.js';
import { nextFor } from '../pets/next.js';
import { createLife, petSize } from './life.js';
import { mountMotion } from './motion.js';
import { ATLAS } from './motion-atlas.js';
import { createHouseLife, bakeVillage, gradeAtlas, LAMP_HOUSE, WINDOW_HOUSE, HOUSE_ART } from './houses.js';
import { renderCard, decorLayer, ACT } from './cards.js';
import { openModal, closeModal } from '../ui/modal.js';
import { play, unlock, startMusic, startAmbience } from '../world/audio.js';
import { motionReduced } from '../core/engagement/feedback.js';
import { escapeHTML } from '../core/utils/format.js';
import { hourWord, weatherWord, seasonWord } from '../world/engine/palette.js';

const MOOD_LABEL = { glowing: 'very happy', happy: 'happy', missing: 'missing you', sleepy: 'sleepy', wilting: 'lonely', new: 'waiting to meet you' };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export async function renderVillageHome(outlet, ctx) {
  const { storage } = ctx;
  const arrivedAt = location.hash;
  let world, valley;
  try { [world, valley] = await Promise.all([loadWorld(storage), loadValley(storage)]); } catch (err) {
    outlet.innerHTML = `<section class="cw cw--error"><h1>The village will not open</h1><p>${escapeHTML(err.message)}</p></section>`;
    return;
  }
  // Left while the records loaded: do not start a village (its music, its
  // greeting, Toffee's hello) underneath whatever screen comes next.
  if (!outlet.isConnected || location.hash !== arrivedAt) return;
  let state = world.state;
  let pets = state.pets ?? derivePets(state, world.records, world.content, state.now);
  const atmo = state.atmo;
  const reduced = motionReduced();
  const name = valleyName(valley);
  const firstVisit = !valley.awakened_at;

  outlet.innerHTML = `
    <section class="cw" data-hour="${atmo.hour}" data-weather="${atmo.weather}" data-season="${atmo.season}" aria-label="Your village">
      <h1 class="sr-only">${escapeHTML(name)}: your village</h1>
      <p class="sr-only" aria-live="polite" data-said></p>
      <div class="cw-viewport" tabindex="0" role="group" aria-label="The village. Drag or use the arrow keys to look around; Tab to visit a friend or a building.">
        <div class="cw-map" style="width:${MAP.w}px;height:${MAP.h}px">
          <img class="cw-art" src="${MAP.src}" alt="" draggable="false" decoding="async" fetchpriority="high">
          <div class="cw-clouds" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="cw-tint" aria-hidden="true"></div>
          <div class="cw-sunlight" aria-hidden="true"></div>
          <div class="cw-glows" aria-hidden="true">${[...LAMPS.map((l, i) => glow(l, 'lamp', i)), ...WINDOWS.map((w, i) => glow(w, 'win', i))].join('')}${Object.entries(HOUSE_ART).map(([id, h]) => `<i class="cw-aura" data-house="${id}" style="left:${h.aura[0]}px;top:${h.aura[1]}px;--r:${h.aura[2]}px"></i>`).join('')}</div>
          <div class="cw-treasures" aria-hidden="true"></div>
          <svg class="cw-clock" aria-hidden="true" style="left:${CLOCK.x - CLOCK.r}px;top:${CLOCK.y - CLOCK.r}px" width="${CLOCK.r * 2}" height="${CLOCK.r * 2}" viewBox="-10 -10 20 20"><line class="cw-clock__h" x1="0" y1="0" x2="0" y2="-4.6"/><line class="cw-clock__m" x1="0" y1="0" x2="0" y2="-6.8"/><circle r=".9"/></svg>
          <canvas class="cw-life" width="${MAP.w / 2}" height="${MAP.h / 2}" aria-hidden="true"></canvas>
          <div class="cw-spots">${spotsHTML()}</div>
          <div class="cw-pets">${PETS.map((p) => petHTML(p, pets)).join('')}</div>
          <div class="cw-says" aria-hidden="true">${PETS.map((p) => saysHTML(p, pets)).join('')}</div>
        </div>
      </div>
      <header class="cw-hud">
        <div class="cw-hud__left">
          <button class="cw-chip cw-chip--fire" data-open="fire"></button>
          <button class="cw-chip cw-chip--level" data-open="level"></button>
        </div>
        <div class="cw-hud__right">
          <button class="cw-round" data-open="friends" aria-label="All subjects: start any of them">${subjectsSVG}</button>
          <button class="cw-round" data-open="cottage" aria-label="Settings: sound, your village's name and your progress">${gearSVG}</button>
        </div>
      </header>
      <div class="cw-dock">
        <button class="cw-today" data-open="today"></button>
        <a class="cw-play" data-play href="#/world"></a>
      </div>
      <button class="cw-edge" hidden></button>
      <div class="cw-meet" hidden></div>
      <div class="cw-toast" role="status" aria-live="polite"></div>
      <div class="cw-overlay" hidden><div class="cw-scrim" data-close></div><section class="cw-card"></section></div>
      <div class="cw-party" hidden></div>
    </section>`;

  const root = outlet.querySelector('.cw');
  const viewport = root.querySelector('.cw-viewport');
  const map = root.querySelector('.cw-map');
  const overlay = root.querySelector('.cw-overlay');
  const card = root.querySelector('.cw-card');
  const toastEl = root.querySelector('.cw-toast');
  const party = root.querySelector('.cw-party');
  let disposed = false;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms); timers.add(id); return id; };

  /* ---------------- The camera ---------------- */
  const cam = { x: NODES.pc.x, y: NODES.pc.y + 40 };
  let vw = 1, vh = 1, s = 1, tween = null, onCamera = () => {};
  const scale = () => s;
  /* The camp's foot (y 950) must clear the big button. In a landscape window the button sits in the corner, so only the screen edge matters;
     otherwise it is a strip along the bottom (66px + margins) and the painting rides up by that much, losing a sliver of the top, which the top bar hides anyway. */
  const lowestCam = () => 950 - (vh / 2 - (matchMedia('(min-width: 700px) and (orientation: landscape)').matches ? 0 : 84)) / s;
  const apply = () => {
    const hw = vw / 2 / s, hh = vh / 2 / s, low = lowestCam();
    cam.x = hw * 2 >= MAP.w ? MAP.w / 2 : clamp(cam.x, hw, MAP.w - hw);
    cam.y = hh * 2 >= MAP.h ? Math.max(MAP.h / 2, low) : clamp(cam.y, hh, Math.max(MAP.h - hh, low));
    map.style.transform = `translate3d(${(vw / 2 - cam.x * s).toFixed(2)}px,${(vh / 2 - cam.y * s).toFixed(2)}px,0) scale(${s.toFixed(4)})`;
    map.style.setProperty('--inv', (1 / s).toFixed(4));
    onCamera();
  };
  const layout = () => {
    vw = viewport.clientWidth || window.innerWidth; vh = viewport.clientHeight || window.innerHeight;
    s = Math.max(vw / MAP.w, vh / MAP.h); // always covers the screen; a phone sees a third of the width
    apply();
  };
  const panTo = (x, y, { ms = 900 } = {}) => {
    if (reduced || ms <= 0) { cam.x = x; cam.y = y; apply(); return; }
    const from = { ...cam }, t0 = performance.now();
    const step = (t) => {
      if (tween !== step || disposed) return;
      const p = Math.min(1, (t - t0) / ms), e = 1 - (1 - p) ** 3;
      cam.x = from.x + (x - from.x) * e; cam.y = from.y + (y - from.y) * e;
      apply();
      if (p < 1) requestAnimationFrame(step); else tween = null;
    };
    tween = step; requestAnimationFrame(step);
  };
  /** Bring a point into the part of the screen a card does not cover. */
  const reveal = (p) => {
    const s = scale();
    if (vw < 900) panTo(p.x, p.y + (0.5 - 0.24) * vh / s, { ms: 600 });
    else panTo(p.x + (0.5 - 0.36) * vw / s, p.y, { ms: 600 });
  };
  const ro = new ResizeObserver(layout); ro.observe(viewport); layout();
  // The plaza and the campfire cannot both fit a short window; open on the lower view so the camp is in it.
  cam.y = Math.max(cam.y, lowestCam()); apply();

  /* Drag, fling, wheel, keys. A drag never becomes a tap. A second finger
     does nothing: there is no zoom to pinch. */
  const ptrs = new Map();
  let drag = null, moved = false, fling = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    tween = null; fling = null;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, t: performance.now(), vx: 0, vy: 0 }; moved = false; }
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag || !ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.pointerId !== ptrs.keys().next().value) return; // only the first finger drags
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 7) return;
    if (!moved) { moved = true; try { viewport.setPointerCapture(e.pointerId); } catch { /* fine */ } viewport.classList.add('is-dragging'); }
    const s = scale(), now = performance.now(), nx = drag.cx - dx / s, ny = drag.cy - dy / s;
    const dt = Math.max(1, now - drag.t);
    drag.vx = ((nx - cam.x) / dt) * 0.6 + drag.vx * 0.4; drag.vy = ((ny - cam.y) / dt) * 0.6 + drag.vy * 0.4; drag.t = now;
    cam.x = nx; cam.y = ny; apply();
  });
  const endDrag = (e) => {
    ptrs.delete(e.pointerId);
    // When the first finger lifts and another stays down, the drag carries on from the one still down.
    if (ptrs.size) { const [p] = [...ptrs.values()]; drag = { x: p.x, y: p.y, cx: cam.x, cy: cam.y, t: performance.now(), vx: 0, vy: 0 }; return; }
    viewport.classList.remove('is-dragging');
    // A drag swallows the click it ends in (below), and only that one: a click from the keyboard comes later.
    if (moved) setTimeout(() => { moved = false; }, 0);
    if (moved && drag && !reduced && Math.hypot(drag.vx, drag.vy) > 0.05) {
      let { vx, vy } = drag, last = performance.now();
      const step = (t) => {
        if (fling !== step || disposed) return;
        const dt = t - last; last = t;
        cam.x += vx * dt; cam.y += vy * dt; vx *= 0.92 ** (dt / 16); vy *= 0.92 ** (dt / 16); apply();
        if (Math.hypot(vx, vy) > 0.01) requestAnimationFrame(step); else fling = null;
      };
      fling = step; requestAnimationFrame(step);
    }
    drag = null;
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault(); tween = null;
    // The painting fills the height on a phone-shaped window, so an ordinary wheel scrolls it sideways.
    const sideways = MAP.h * s <= vh + 1;
    cam.x += (e.deltaX + (sideways ? e.deltaY : 0)) / s;
    if (!sideways) cam.y += e.deltaY / s;
    apply();
  }, { passive: false });
  viewport.addEventListener('keydown', (e) => {
    const step = 70 / s;
    const keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (keys[e.key] && e.target === viewport) { e.preventDefault(); panTo(cam.x + keys[e.key][0], cam.y + keys[e.key][1], { ms: 220 }); }
  });
  // A focused friend or building that sits off-screen is brought into view.
  viewport.addEventListener('focusin', (e) => {
    const p = e.target.closest('[data-pet],[data-spot]');
    if (!p) return;
    const at = p.dataset.pet ? life.positionOf(p.dataset.pet) : spotCentre(p.dataset.spot);
    const s = scale();
    if (Math.abs(at.x - cam.x) * s > vw * 0.4 || Math.abs(at.y - cam.y) * s > vh * 0.4) panTo(at.x, at.y, { ms: 450 });
  });

  /* ---------------- Life ---------------- */
  /* What each house has grown (src/home/houses.js): the living part on the scene canvas, the still part baked into the painting below. */
  const houses = createHouseLife({ reduced, stages: pets.houses });
  const life = createLife(root, { pets, atmo, reduced, houses, memory: store, view: () => ({ x: cam.x - vw / 2 / s, y: cam.y - vh / 2 / s, w: vw / s, h: vh / s, s }) });
  // For the browser gates: put the camera somewhere, find a friend, show the houses at given stages (looks only; nothing is saved).
  root.__village = {
    look: (x, y) => panTo(x, y, { ms: 0 }), positionOf: (id) => life.positionOf(id),
    houses: (stages) => showHouses(stages), grown: () => shownStages, get pace() { return life.pace; },
  };
  viewport.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const bounds = map.getBoundingClientRect(), s = scale();
    life.ripple((e.clientX - bounds.left) / s, (e.clientY - bounds.top) / s);
  });
  const saidEl = root.querySelector('[data-said]');
  const announce = (text) => { if (text) saidEl.textContent = String(text).replace(/<[^>]*>/g, ''); };
  /* What is on screen, at most once a frame: off-screen patches and halos pause (motion.js setView). */
  let viewQueued = false;
  const viewNow = () => ({ x: cam.x - vw / 2 / s, y: cam.y - vh / 2 / s, w: vw / s, h: vh / s });
  const glowEls = [...root.querySelectorAll('.cw-glow')].map((el) => ({ el, x: parseFloat(el.style.left), y: parseFloat(el.style.top), off: false }));
  const syncView = () => {
    viewQueued = false;
    if (disposed) return;
    const v = viewNow();
    motion.setView(v);
    for (const g of glowEls) { const off = g.x < v.x - 60 || g.x > v.x + v.w + 60 || g.y < v.y - 60 || g.y > v.y + v.h + 60; if (off !== g.off) { g.off = off; g.el.toggleAttribute('data-off', off); } }
  };
  // The moving patches wait for the painting: on a first visit the small
  // atlas lands long before the 3.8 MB picture, and fragments of trees and
  // water would float over an empty green. Then the painting is grown: a copy
  // with each house's colour, windows and keepsakes baked in (houses.js),
  // and the patches cut from an atlas graded to match it.
  let motion = { setAtmo() {}, setView() {}, destroy() {} };
  const art = map.querySelector('.cw-art');
  let shownStages = null, baking = 0, atlasUrl = null, atlasImg = null;
  const mountMoving = (stages, atlas) => { motion.destroy(); motion = mountMotion(map, { atmo: root.dataset.hour ? { ...atmo, hour: root.dataset.hour } : atmo, reduced, stages, atlas }); };
  const growPainting = async (stages) => {
    const job = ++baking, key = JSON.stringify(stages ?? {});
    if (key === shownStages) return;
    const stale = () => disposed || job !== baking;
    // Not before the painting has decoded: an empty bake would hide it.
    if (!art.naturalWidth) { try { await art.decode(); } catch { return; } if (stale()) return; }
    try {
      const base = await bakeVillage(art, stages, { isAborted: stale });
      if (!base || stale()) return;
      let url = null;
      if (!reduced && ATLAS.at.length) {
        try {
          if (!atlasImg) { atlasImg = new Image(); atlasImg.src = ATLAS.src; await atlasImg.decode(); }
          const c = await gradeAtlas(atlasImg, ATLAS.at, stages, { isAborted: stale });
          if (c) url = await new Promise((res) => c.toBlob((b) => res(b ? URL.createObjectURL(b) : null)));
        } catch { url = null; }
      }
      if (stale()) { if (url) URL.revokeObjectURL(url); return; }
      base.className = 'cw-base'; base.setAttribute('aria-hidden', 'true');
      const old = map.querySelector('.cw-base');
      (old ?? art).after(base);
      requestAnimationFrame(() => { base.classList.add('is-in'); later(() => { old?.remove(); art.style.visibility = 'hidden'; }, reduced ? 0 : 700); });
      mountMoving(stages, url);
      syncView();
      if (atlasUrl) URL.revokeObjectURL(atlasUrl);
      atlasUrl = url;
      life.setPainting(base);
      shownStages = key;
    } catch (err) {
      console.error('[CAT OS] the village could not grow its painting', err);
      if (!shownStages) mountMoving(stages, null);
    }
  };
  /** A house's own lamps light at stage 1 and its windows at stage 2; the village's lamps always burn. */
  const lightHouses = (stages) => {
    for (const el of root.querySelectorAll('.cw-glow[data-house]')) el.classList.toggle('is-off', (stages?.[el.dataset.house] ?? 0) < (el.classList.contains('cw-glow--lamp') ? 1 : 2));
    // Stage 9: a golden glow round the whole house.
    for (const el of root.querySelectorAll('.cw-aura')) el.classList.toggle('is-on', (stages?.[el.dataset.house] ?? 0) >= 9);
  };
  const showHouses = (stages) => { houses.setStages(stages); lightHouses(stages); life.housesChanged(); return growPainting(stages); };
  lightHouses(pets.houses);
  const startPainting = () => { if (!disposed) growPainting(pets.houses); };
  if (art.complete && art.naturalWidth) startPainting(); else art.decode().then(startPainting, () => mountMoving(pets.houses, null));

  const onScreen = (id, margin = 0) => {
    const at = life.positionOf(id), s = scale();
    const sx = vw / 2 + (at.x - cam.x) * s, sy = vh / 2 + (at.y - cam.y) * s;
    return sx > margin && sx < vw - margin && sy > 60 + margin && sy < vh - 150 - margin;
  };

  /* Whoever the big button is for, when they are off the edge of a phone:
     a small chip at that edge, pointing, that brings the village round to them. */
  const edge = root.querySelector('.cw-edge');
  let edgeFor = null;
  const placeEdge = () => {
    const id = openKind || root.classList.contains('is-intro') ? null : pets.play;
    const at = id && life.positionOf(id), s = scale();
    const sx = at ? vw / 2 + (at.x - cam.x) * s : 0, sy = at ? vh / 2 + (at.y - cam.y) * s : 0;
    const off = !!at && (sx < 16 || sx > vw - 16 || sy < 70 || sy > vh - 150);
    if (edge.hidden === off) edge.hidden = !off;
    if (!off) return;
    if (edgeFor !== id) {
      edgeFor = id;
      const p = PET_BY_ID.get(id);
      edge.innerHTML = `${petPortrait(id, 32)}<b>!</b><i aria-hidden="true"></i>`;
      edge.setAttribute('aria-label', `${p.name} needs your help. Show ${p.name}.`);
    }
    const ex = clamp(sx, 34, vw - 34), ey = clamp(sy, 124, vh - 100);
    edge.style.left = `${ex}px`; edge.style.top = `${ey}px`;
    edge.style.setProperty('--turn', `${Math.atan2(sy - ey, sx - ex).toFixed(3)}rad`);
  };
  onCamera = () => { placeEdge(); life.redraw(); if (!viewQueued) { viewQueued = true; requestAnimationFrame(syncView); } };
  const edgeTimer = setInterval(placeEdge, 700);
  edge.addEventListener('click', () => { if (edgeFor) { play('tap'); reveal(life.positionOf(edgeFor)); edge.hidden = true; } });

  /* ---------------- The HUD ---------------- */
  const hud = () => {
    const f = pets.flame, L = pets.level, T = pets.today;
    const fire = root.querySelector('.cw-chip--fire');
    fire.innerHTML = `${flameSVG(f.tier)}<b>${f.days}</b>`;
    fire.setAttribute('aria-label', f.days ? `Toffee's fire: ${f.days} ${f.days === 1 ? 'day' : 'days'} in a row` : "Toffee's fire: help any friend today to light it");
    fire.classList.toggle('is-out', !f.today);
    const lv = root.querySelector('.cw-chip--level');
    lv.innerHTML = `<span class="cw-lv"><small>Lv</small><b>${L.level}</b></span><span class="cw-lvbar" aria-hidden="true"><i style="width:${Math.round(L.pct * 100)}%"></i></span><span class="cw-glowcount">${GLOW_SVG}<b>${pets.glow}</b></span>`;
    lv.setAttribute('aria-label', `Village level ${L.level}. ${pets.glow} Glow; ${L.need} more for level ${L.level + 1}.`);
    const today = root.querySelector('.cw-today');
    today.innerHTML = `<span class="cw-today__faces">${T.picks.map((id, i) => `<span class="cw-face ${T.done[i] ? 'is-done' : ''}">${petPortrait(id, 30)}${T.done[i] ? '<i aria-hidden="true">✓</i>' : ''}</span>`).join('')}</span><span class="cw-today__gift ${T.gift ? 'is-open' : ''}" aria-hidden="true">${giftSVG}</span><span class="cw-today__text">${T.gift ? 'Today\'s gift is yours!' : `${T.doneCount} of 3 helped`}</span>`;
    today.setAttribute('aria-label', `Today's three friends: ${T.doneCount} of 3 helped. ${T.gift ? 'Today\'s gift is open.' : 'Help all three for a gift of 10 Glow.'}`);
    const id = pets.play, who = PET_BY_ID.get(id), next = nextFor(id, world, { first: pets.pets.find((p) => p.id === id)?.isNew });
    const playEl = root.querySelector('.cw-play');
    playEl.setAttribute('href', next?.href ?? `#/world/place/${who.places[0]}`);
    playEl.innerHTML = `${petPortrait(id, 44)}<span class="cw-play__text"><b>${T.gift ? 'Keep going: help' : 'Help'} ${who.name}</b><small>${escapeHTML(ACT[id])}${next?.minutes ? ` · ${Math.max(1, Math.round(next.minutes))} min` : ''}</small></span><span class="cw-play__go" aria-hidden="true">${playSVG}</span>`;
    playEl.setAttribute('aria-label', `Play: help ${who.name}. ${ACT[id]}${next?.label ? `: ${next.label}` : ''}.`);
    root.querySelector('.cw-treasures').innerHTML = decorLayer(pets);
    for (const p of PETS) {
      const pp = pets.pets.find((x) => x.id === p.id);
      const el = root.querySelector(`.pet[data-pet="${p.id}"]`);
      el.dataset.word = pp.word;
      el.setAttribute('aria-label', `${p.name}, ${MOOD_LABEL[pp.word]}. ${p.subject}. ${ageOf(pp.stage).name}, stage ${pp.stage} of 10${pp.stage ? `, ${stageTitle(p.id, pp.stage)}` : ''}.${pp.pick && !pp.helpedToday ? ' Needs your help today.' : ''} Open ${p.name}'s card.`);
    }
    life.setMarks(T.picks.filter((pid, i) => !T.done[i]));
    root.style.setProperty('--harmony', pets.harmony.toFixed(2));
  };
  hud();
  root.querySelector('.cw-play').addEventListener('click', () => { unlock(); play('open'); });

  /* ---------------- Cards ---------------- */
  let openKind = null;
  const close = () => {
    if (!openKind) return;
    openKind = null;
    overlay.classList.remove('is-open');
    closeModal(card);
    later(() => { if (!openKind) overlay.hidden = true; }, reduced ? 0 : 240);
    play('close');
  };
  const refresh = async () => {
    const records = await loadWorldRecords(storage);
    world = { ...world, records };
    state = deriveWorldState(world.content, records);
    world.state = state;
    const before = JSON.stringify(pets.houses ?? {});
    pets = state.pets ?? derivePets(state, records, world.content, state.now);
    hud(); life.update(pets);
    if (JSON.stringify(pets.houses ?? {}) !== before) showHouses(pets.houses);
  };
  const api = {
    storage, close, refresh, toast, play, reduced,
    get world() { return world; }, get pets() { return pets; }, get valley() { return valley; },
    setValley: (v) => { valley = v; hud(); },
    celebrate: (id) => life.poke(id, { happy: true }),
    open: (kind, arg, trigger) => openCard(kind, arg, trigger),
    showPet: (id) => { life.poke(id); reveal(life.positionOf(id)); later(() => openCard('pet', id), reduced ? 0 : 260); },
  };
  const openCard = (kind, arg, trigger) => {
    const was = openKind;
    if (was) closeModal(card);
    if (kind === 'pet' && arg === 'toffee') kind = 'fire';
    openKind = kind;
    card.className = `cw-card cw-card--${kind}`;
    card.scrollTop = 0;
    renderCard(card, kind, arg, api);
    card.scrollTop = 0;
    requestAnimationFrame(() => { card.scrollTop = 0; });
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    openModal(card, close, { returnTo: trigger ?? null });
    if (!was) play('open');
  };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { close(); return; }
    const pet = e.target.closest('.pet[data-pet]');
    if (pet) {
      const id = pet.dataset.pet;
      unlock();
      announce(`${PET_BY_ID.get(id).name}: ${life.poke(id)}`);
      reveal(life.positionOf(id));
      later(() => openCard('pet', id, pet), reduced ? 0 : 380);
      return;
    }
    const spot = e.target.closest('[data-spot]');
    if (spot) {
      const s = spot.dataset.spot;
      if (s === 'toffee') { life.poke(s); reveal(NODES.f1); openCard('fire', null, spot); return; }
      life.poke(s); reveal(life.positionOf(s)); openCard('pet', s, spot);
      return;
    }
    const opener = e.target.closest('[data-open]');
    if (opener && !card.contains(opener)) openCard(opener.dataset.open, null, opener);
  });

  /* ---------------- Toasts ---------------- */
  function toast(html, ms = 4200) {
    toastEl.innerHTML = `<p>${html}</p>`;
    toastEl.classList.add('is-in');
    clearTimeout(toast.t);
    toast.t = later(() => toastEl.classList.remove('is-in'), ms);
  }

  /* ---------------- Celebrations: a new level, the day's gift ---------------- */
  const queue = [];
  let partying = false;
  const celebrate = (html, sound, onDone) => { queue.push({ html, sound, onDone }); if (!partying) nextParty(); };
  function nextParty() {
    const c = queue.shift();
    if (!c || disposed) { partying = false; return; }
    partying = true;
    if (openKind) close();
    party.innerHTML = `<div class="cw-party__card" aria-labelledby="cw-party-h">${c.html}<button class="cw-party__ok" data-party-ok>Yay!</button></div><div class="cw-party__confetti" aria-hidden="true">${confetti()}</div>`;
    party.hidden = false;
    requestAnimationFrame(() => party.classList.add('is-in'));
    play(c.sound);
    const box = party.querySelector('.cw-party__card'), ok = party.querySelector('[data-party-ok]');
    // A real modal: Escape closes it, Tab stays inside, and focus goes back where it was (ui/modal.js).
    openModal(box, () => ok.click(), { returnTo: document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : root.querySelector('.cw-play') });
    later(() => ok.focus({ preventScroll: true }), 60);
    ok.addEventListener('click', () => {
      closeModal(box);
      party.classList.remove('is-in');
      later(() => { party.hidden = true; party.innerHTML = ''; c.onDone?.(); nextParty(); }, reduced ? 0 : 260);
    }, { once: true });
  }
  const stagesNow = () => JSON.stringify(Object.fromEntries(pets.pets.map((p) => [p.id, p.stage])));
  const checkParties = (afterRun = false) => {
    /* A friend who grew: their new look, named, before anything else. Only
       on the way back from a run (that run's friend, and Toffee on a new
       day): progress that arrives any other way, a restored backup or an
       old village opening 3.3 for the first time, is remembered quietly,
       not six cards at once. */
    let had = null;
    try { had = JSON.parse(store.get('catos:stages') || 'null'); } catch { /* start over */ }
    store.set('catos:stages', stagesNow());
    if (afterRun && had && typeof had === 'object') {
      // The friend you just helped goes first.
      for (const p of [...pets.pets].sort((a, b) => (b.id === pets.last?.pet) - (a.id === pets.last?.pet))) {
        const from = Math.max(0, Math.min(p.stage, Number(had[p.id]) || 0));
        if (p.stage > from) celebrate(growHTML(p, from), 'grow', () => { life.poke(p.id, { happy: true, quiet: true }); });
      }
    }
    const L = pets.level.level, seen = Number(store.get('catos:level-seen'));
    if (!seen) store.set('catos:level-seen', String(L));
    else if (L > seen) {
      store.set('catos:level-seen', String(L));
      const d = pets.decor.find((x) => x.level === L);
      celebrate(`<p class="cw-party__eyebrow">The village grew</p><h2 id="cw-party-h">Level ${L}!</h2>${d ? `<p class="cw-party__new">New: <b>${escapeHTML(d.name)}</b></p><p>${escapeHTML(d.appears)}</p>` : '<p>Every friend in the village is cheering.</p>'}`, 'levelup', () => {
        root.querySelectorAll(`.cw-treasure[data-t="${d?.id}"]`).forEach((el) => el.classList.add('is-new'));
        for (const p of PETS) later(() => life.poke(p.id, { happy: true, quiet: true }), 100 + Math.random() * 700);
      });
    }
    /* A house that grew with this run (each grows with its own section): once the cards are done, the camera goes to it, it lights up, and a toast says what is new. Any other arrival remembers quietly. */
    let hadH = null;
    try { hadH = JSON.parse(store.get('catos:houses') || 'null'); } catch { /* start over */ }
    store.set('catos:houses', JSON.stringify(pets.houses ?? {}));
    if (afterRun && hadH && typeof hadH === 'object') {
      const grownNow = HOUSES.filter((h) => (pets.houses?.[h.spot] ?? 0) > (Number(hadH[h.spot]) || 0));
      if (grownNow.length) whenQuiet(() => showGrown(grownNow));
    }
    if (pets.today.gift && store.get('catos:gift-day') !== pets.today.key) {
      store.set('catos:gift-day', pets.today.key);
      celebrate(`<p class="cw-party__eyebrow">All three friends helped</p><span class="cw-party__chest" aria-hidden="true">${giftSVG}</span><h2 id="cw-party-h">Today's gift: +${DAILY_GIFT} ${GLOW_SVG}</h2><p>Come back tomorrow: three more friends will need you.</p>`, 'chest');
    }
  };

  /** Wait until no party card and no friend card is up, then run `fn`. */
  function whenQuiet(fn) { if (disposed) return; if (partying || openKind || queue.length) { later(() => whenQuiet(fn), 600); return; } fn(); }
  /** Each house that grew, one after another: look at it, a burst of light, and what it gained. */
  function showGrown(list) {
    list.forEach((h, i) => later(() => {
      const [cx, cy] = HOUSE_ART[h.spot]?.mask ?? [NODES.pc.x, NODES.pc.y], stage = pets.houses?.[h.spot] ?? 0;
      reveal({ x: cx, y: cy });
      later(() => {
        houses.burst(h.spot);
        play('grow');
        const Home = h.home.replace(/^the/, 'The');
        toast(`<b>${escapeHTML(Home)} grew!</b> ${escapeHTML(houseGift(h.spot, stage).replace(/^./, (c) => c.toUpperCase()))}.`, 4200);
        announce(`${Home} grew: ${houseGift(h.spot, stage)}.`);
      }, reduced ? 0 : 650);
    }, i * (reduced ? 1500 : 4600)));
  }

  /* ---------------- Coming back from a run ---------------- */
  let welcomed = false;
  // Where every friend stands, remembered from the very first visit, so the first stage anyone reaches gets its card.
  if (!store.get('catos:stages')) store.set('catos:stages', stagesNow());
  if (!store.get('catos:houses')) store.set('catos:houses', JSON.stringify(pets.houses ?? {}));
  {
    const last = pets.last;
    const seen = sessionStorage.getItem('world:toasted');
    const focusSlug = sessionStorage.getItem('world:focus');
    for (const k of ['world:focus', 'world:changed', 'world:change-line', 'world:earned', 'world:unlocked', 'world:pet', 'world:gifts', 'world:heart']) sessionStorage.removeItem(k);
    if (last && Date.now() - last.at < 20 * 60e3 && seen !== String(last.at)) {
      /* A set finished: everyone runs to the plaza and throws a party round
         the friend you helped (owner, 2026-10-03). */
      welcomed = true;
      sessionStorage.setItem('world:toasted', String(last.at));
      const p = PET_BY_ID.get(last.pet);
      panTo(NODES.pc.x, NODES.pc.y - 20, { ms: 0 });
      later(() => {
        const line = lineFor(last.pet, 'thanks', String(last.at));
        life.party(last.pet, { line });
        announce(`Everyone ran to the plaza to celebrate. ${p.name}: ${line}`);
        toast(`${last.earned > 0 ? `${GLOW_SVG} <b>+${last.earned}</b> ` : ''}You helped ${p.name}! Party in the plaza!`, 5600);
        play('party');
        // The cards (a friend who grew, a new level, the day's gift) wait for the party to wind down.
        later(() => checkParties(true), reduced ? 1200 : 7600);
      }, reduced ? 50 : 450);
    } else if (focusSlug && petForPlace(focusSlug)) {
      // Back from a place: face its own house.
      const spot = HOUSES.find((h) => h.place === focusSlug)?.spot ?? petForPlace(focusSlug);
      const home = NODES[(HOMES[spot] ?? PLACES[spot]).node];
      panTo(home.x, home.y, { ms: 0 });
    }
  }

  /* ---------------- First visit: Toffee says hello, then everyone introduces themselves ----------------
     Each friend IS their subject (owner, 2026-10-03), so meeting them is
     meeting the exam: the bookworm keeps Reading, the tidy fox keeps Para
     Jumbles. One tap per friend; "Skip" jumps to Chai's call. A village
     from before 3.3 never had them introduced, so it gets the round once
     too (after any party, never over one). */
  if (firstVisit || (!welcomed && !store.get('catos:met-gang'))) {
    root.classList.add('is-intro');
    // Saved before the first line: leaving mid-welcome (Enter on the big button) must not replay it every visit.
    store.set('catos:met-gang', '1');
    if (firstVisit) saveValley(storage, { awakened_at: new Date().toISOString(), met_at: new Date().toISOString() }).then((v) => { valley = v; }, () => { /* the hello will repeat once */ });
    const meetEl = root.querySelector('.cw-meet');
    const ORDER = ['toffee', 'chai', 'ginger', 'mochi', 'sesame', 'mallow', 'matcha', 'biscuit'];
    let skipped = false;
    const keeps = (id) => (id === 'toffee' ? ['The daily fire', 'The Gauntlet'] : HOUSES.filter((h) => h.pet === id).map((h) => h.subject));
    const meetCard = (id) => {
      const p = PET_BY_ID.get(id);
      meetEl.innerHTML = `<p class="cw-meet__dots" aria-hidden="true">${ORDER.map((x) => `<i class="${x === id ? 'is-on' : ''}"></i>`).join('')}</p><h2 class="cw-meet__name">${escapeHTML(p.name)}<small>the ${escapeHTML(p.creature)}</small></h2><p class="cw-meet__keeps">${keeps(id).map((s) => `<b>${escapeHTML(s)}</b>`).join('')}</p><p class="cw-meet__why">${escapeHTML(LINES.meet[id][1])}</p><button class="cw-meet__skip" type="button" data-skip>Skip</button>`;
      meetEl.hidden = false;
      meetEl.classList.remove('is-in'); void meetEl.offsetWidth; meetEl.classList.add('is-in');
    };
    // On the root, before any line's tap-to-continue listener, so a tap on Skip is a skip by the time the line ends.
    root.addEventListener('pointerdown', (e) => { if (e.target.closest?.('[data-skip]')) skipped = true; }, true);
    const pause = (ms) => new Promise((r) => later(r, reduced ? 0 : ms));
    const say = async (id, line, ms = 9000) => {
      if (skipped || disposed) return;
      announce(`${PET_BY_ID.get(id).name}: ${line}`);
      await life.sayAndWait(id, line, { ms, tapToSkip: true });
    };
    /* Bring a friend to the middle, a moment after the tap that got us here:
       that tap's own pointerdown, still on its way to the map, cancels any
       pan started inside it. A phone shows the painting's whole height, so
       the camera cannot lift a friend clear of the card; the card moves to
       the top instead when the friend stands low. */
    const visit = (id, ms = 1100) => {
      const at = life.positionOf(id), s = scale(), hh = vh / 2 / s;
      const cy = hh * 2 >= MAP.h ? MAP.h / 2 : clamp(at.y, hh, MAP.h - hh);
      meetEl.classList.toggle('is-top', vh / 2 + (at.y - cy) * s > vh * 0.52);
      later(() => panTo(at.x, at.y, { ms }), 30);
    };
    later(async () => {
      for (const id of ORDER) life.hold(id);
      visit('toffee', 0);
      if (firstVisit) await say('toffee', LINES.intro[0]);
      for (const id of ORDER) {
        if (skipped || disposed) break;
        if (id !== 'toffee') { visit(id); await pause(1000); }
        meetCard(id); play('tap'); life.poke(id, { happy: true, quiet: true });
        await say(id, LINES.meet[id][0]);
        if (id === 'toffee') { meetEl.hidden = true; for (const line of LINES.intro.slice(1, -1)) await say('toffee', line); }
      }
      meetEl.hidden = true;
      if (disposed) return;
      skipped = false;
      visit('chai', 1400); root.classList.add('is-pointing');
      await say('chai', LINES.intro.at(-1));
      if (disposed) return;
      root.classList.remove('is-intro', 'is-pointing');
      life.release();
    }, reduced ? 100 : 900);
  } else if (!welcomed) {
    /* ---------------- Every other arrival: they wave; after a day away, someone comes to meet you ---------------- */
    later(() => {
      const w = pets.welcome;
      if (w && store.get('catos:welcome-day') !== pets.today.key) {
        store.set('catos:welcome-day', pets.today.key);
        life.comeSay(w.pet, nearestNode({ x: cam.x, y: cam.y + 60 }), lineFor(w.pet, 'missed', pets.today.key));
      }
      life.greet(PETS.map((p) => p.id).filter((id) => onScreen(id) && id !== w?.pet));
      checkParties();
    }, reduced ? 50 : 900);
  }

  /* ---------------- Sound: the song is started on the first touch (app.js) ---------------- */
  const warmth = clamp(pets.harmony, 0, 1);
  startMusic('world', { hour: atmo.hour, warmth }); startAmbience('world', atmo);
  const startSound = () => { unlock(); startMusic('world', { hour: atmo.hour, warmth }); startAmbience('world', atmo); };
  window.addEventListener('pointerdown', startSound, { capture: true, once: true });

  /* ---------------- The hour turns while you sit here ---------------- */
  const tickHour = setInterval(() => {
    const d = new Date(), now = { hour: hourWord(d), season: seasonWord(d), weather: weatherWord(d, seasonWord(d)) };
    if (now.hour !== root.dataset.hour || now.weather !== root.dataset.weather || now.season !== root.dataset.season) {
      Object.assign(root.dataset, now); Object.assign(atmo, now); life.setAtmo(now); motion.setAtmo(now);
      startMusic('world', { hour: now.hour, warmth });
    }
  }, 60e3);

  /* ---------------- While you watch, a friend you can see says something very them ---------------- */
  const museTimer = setInterval(() => {
    if (openKind || partying || root.classList.contains('is-intro') || document.hidden || Math.random() < 0.35) return;
    life.muse(PETS.map((p) => p.id).filter((id) => onScreen(id, 30)));
  }, 8000);

  /* ---------------- Cleanup ---------------- */
  const onHash = () => {
    disposed = true;
    window.removeEventListener('hashchange', onHash);
    window.removeEventListener('pointerdown', startSound, { capture: true });
    clearInterval(tickHour); clearInterval(edgeTimer); clearInterval(museTimer);
    baking += 1; if (atlasUrl) URL.revokeObjectURL(atlasUrl);
    for (const id of timers) clearTimeout(id);
    ro.disconnect(); life.destroy(); motion.destroy();
    if (openKind) closeModal(card);
  };
  window.addEventListener('hashchange', onHash);

  function spotCentre(id) {
    const h = HOMES[id]?.hit ?? PLACES[id]?.hit;
    return h ? { x: h.x + h.w / 2, y: h.y + h.h / 2 } : NODES.pc;
  }
}

/* ------------------------------------------------------------------ */
/* Markup                                                              */
/* ------------------------------------------------------------------ */

/** A halo over a painted light; each breathes on its own beat. A house's own lights carry its id (lit as it grows). */
function glow(p, kind, i) {
  const house = (kind === 'lamp' ? LAMP_HOUSE : WINDOW_HOUSE).get(i);
  return `<i class="cw-glow cw-glow--${kind}"${house ? ` data-house="${house}"` : ''} style="left:${p.x}px;top:${p.y}px;--r:${p.r}px;--bd:-${((i * 1.37) % 5.2).toFixed(2)}s"></i>`;
}

/** Every house, with its subject on a sign that is always up: on a phone there is no hover to reveal it. */
function spotsHTML() {
  return HOUSES.map((h) => {
    const b = HOMES[h.spot] ?? PLACES[h.spot], at = SIGNS[h.spot], who = PET_BY_ID.get(h.pet).name;
    return `<button class="cw-spot" data-spot="${h.spot}" style="left:${b.hit.x}px;top:${b.hit.y}px;width:${b.hit.w}px;height:${b.hit.h}px" aria-label="${escapeHTML(`${h.subject}, with ${who}: ${b.label}`)}"><span class="cw-plate" style="left:${at.x - b.hit.x}px;top:${at.y - b.hit.y}px">${petPortrait(h.pet, 24)}<b>${escapeHTML(h.subject)}</b></span></button>`;
  }).join('');
}

/** A friend on the map, as big as their stage and wearing what it gave them. */
function petHTML(p, pets) {
  const pp = pets.pets.find((x) => x.id === p.id);
  const size = petSize(p.id, pp.stage);
  return `<button class="pet pet--${p.id}" data-pet="${p.id}" data-word="${pp.word}" data-stage="${pp.stage}" style="--size:${size}" aria-label="${p.name}">
    <span class="pet-shadow" aria-hidden="true"></span>
    ${petRing(p.id, pp.stage)}
    <span class="pet-body">${petRig(p.id, { size, stage: pp.stage })}${petGear(p.id, pp.stage)}</span>
  </button>`;
}

/** A friend's speech bubble and "!": a layer above every friend and the plaza bunting (a friend can walk behind the flags, their words never do), moved with the friend by life.js. */
function saysHTML(p, pets) {
  return `<span class="pet-top" data-pet="${p.id}" style="--size:${petSize(p.id, pets.pets.find((x) => x.id === p.id).stage)}"><span class="pet-bubble" hidden></span><span class="pet-mark" hidden>!</span></span>`;
}

/** The card for a friend who grew: how they look now, their new name, what is new. */
function growHTML(p, from) {
  const def = PET_BY_ID.get(p.id);
  const gifts = Array.from({ length: p.stage - from }, (_, i) => stageGift(p.id, from + i + 1));
  /* Crossing into a new age shows who they were next to who they are now. */
  const aged = ageOf(from).id !== ageOf(p.stage).id;
  return `<p class="cw-party__eyebrow">${escapeHTML(grewLine(p.id, from, p.stage))}</p>
    <span class="cw-party__pet">${aged ? `<span class="cw-party__was">${petFigure(p.id, { size: 76, stage: from, frame: FRAME.idle })}</span><span class="cw-party__arrow" aria-hidden="true">›</span>` : ''}${petFigure(p.id, { size: 116, stage: p.stage, frame: FRAME.happy })}</span>
    <h2 id="cw-party-h">${escapeHTML(stageTitle(p.id, p.stage))}</h2>
    <p class="cw-party__stage"><span class="cw-pips" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < p.stage ? 'on' : ''}"></i>`).join('')}</span>${escapeHTML(ageOf(p.stage).name)} · stage ${p.stage} of 10</p>
    <p class="cw-party__new">New: <b>${escapeHTML(gifts.join(', '))}</b></p>
    <p class="cw-party__quote">“${escapeHTML(lineFor(p.id, 'grow', String(p.stage)))}”</p>
    <p class="cw-party__next">${p.stage < 10 ? `${toGrow(p.toNext, p.unit)} to stage ${p.stage + 1}.` : 'Every last one done. A true master!'}</p>`;
}

function confetti() {
  const colours = ['#F4C443', '#E9963A', '#8FB56A', '#D97A8A', '#93AED1', '#F6EEDB'];
  let html = '';
  for (let i = 0; i < 36; i += 1) html += `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 0.6).toFixed(2)}s;--r:${Math.round(Math.random() * 360)}deg;--c:${colours[i % colours.length]};--s:${(0.7 + Math.random() * 0.8).toFixed(2)}"></i>`;
  return html;
}

const TIER_SCALE = { embers: 0.62, small: 0.78, steady: 0.9, tall: 1, bonfire: 1.12 };
function flameSVG(tier) {
  const s = TIER_SCALE[tier] ?? 0.8;
  return `<svg class="cw-flame__svg cw-flame--${tier}" viewBox="0 0 24 24" aria-hidden="true"><g transform="translate(12 22) scale(${s}) translate(-12 -22)"><path d="M12 2.6c2.4 3.3 6.2 6.2 6.2 11a6.2 6.2 0 0 1-12.4 0c0-2.7 1.3-4.5 2.7-6 .2 1.6.9 2.9 2.1 3.5-.5-3.1.3-6 1.4-8.5z" fill="#F2A23C" stroke="#7a4a1e" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 11.4c1.3 1.6 2.6 2.7 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.5.9-2.9 2.6-4.6z" fill="#FFD978"/></g></svg>`;
}
const giftSVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="13" width="24" height="15" rx="2.5" fill="#D9603A" stroke="#5a2e1a" stroke-width="1.5"/><rect x="2.5" y="9" width="27" height="6" rx="2" fill="#E9A23B" stroke="#5a2e1a" stroke-width="1.5"/><path d="M16 9v19" stroke="#F6EEDB" stroke-width="3"/><path d="M16 9c-3-6-9-5-8-1 1 3 8 1 8 1zm0 0c3-6 9-5 8-1-1 3-8 1-8 1z" fill="#F4C443" stroke="#5a2e1a" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const playSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
const subjectsSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></g></svg>';
const gearSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3.5l1.4 2.3 2.6-.7.7 2.6 2.3 1.4-1.2 2.4 1.2 2.4-2.3 1.4-.7 2.6-2.6-.7L12 20.5l-1.4-2.3-2.6.7-.7-2.6-2.3-1.4L6.2 12 5 9.6l2.3-1.4.7-2.6 2.6.7z"/></g></svg>';

export { MOOD_LABEL, giftSVG, flameSVG };
