/**
 * village.js (screen) — #/world, the painted village where the seven friends live.
 *
 * The whole game on one screen, in the order a learner reads it:
 *
 *   TOP      Toffee's fire (the days in a row) · your laurels and stop ·
 *            settings (sound, name, progress)
 *   THE MAP  the painting, alive: friends walking, doing chores, waving.
 *            A "!" floats over each of today's three friends.
 *   BOTTOM   Rooms · ONE big button, PLAY · the Book. One tap and you are
 *            pulling a rope against a Muddle; every answer still grows the
 *            village. A waiting letter floats above the button.
 *
 * The camera transforms a layered 1086×1448 valley (src/home/landscape.js),
 * so every coordinate below is a world pixel (src/pets/paths.js), whatever
 * the screen. The valley is held at the screen's full height, its top at the
 * top of the screen, and only slides left and right (owner, 2026-11-12: a
 * screen that drifts up, down and sideways is "not a premium game feel").
 * There is no pinch: the one time the camera goes closer is walking into a
 * house, when it pushes in to the door before the room opens. A screen wider
 * than the valley at that height shows it whole, centred on a soft backdrop.
 */

import { loadWorld, loadWorldRecords, deriveWorldState } from '../world/state.js';
import { loadValley, saveValley, valleyName } from '../world/companion.js';
import { derivePets, DAILY_GIFT } from '../pets/economy.js';
import { GLOW_SVG } from '../pets/glow.js';
import { PETS, PET_BY_ID, HOUSES, lineFor, petForPlace, stageTitle, stageGift, ageOf, grewLine, toGrow, houseGift } from '../pets/pets.js';
import { MAP, HOMES, PLACES, SIGNS, NODES, LAMPS, WINDOWS, nearestNode, route } from '../pets/paths.js';
import { petRig, petPortrait, petGear, petRing, petFigure, FRAME } from '../pets/sprite.js';
import { ROOM_OF } from '../pets/next.js';
import { duelsIn, nextBout, troublemakerOf, boutOf } from '../duel/model.js';
import { pendingLetters, ownedCards, teaseCard } from '../duel/letters.js';
import { laurelSVG } from '../duel/art.js';
import { createLife, petSize } from './life.js';
import { TERRAIN, CELLS, ART_FILES } from './landscape.js';
import { createHouseLife, LAMP_HOUSE, WINDOW_HOUSE, HOUSE_ART } from './houses.js';
import { renderCard, decorLayer } from './cards.js';
import { deriveJourney } from '../pets/journey.js';
import { keepsakeArt } from './journal-art.js';
import { openModal, closeModal } from '../ui/modal.js';
import { play, unlock, startMusic, startAmbience } from '../world/audio.js';
import { whenIntroDone } from '../shell/intro.js';
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
  let world, valley, scenery, seals, chases;
  try {
    [world, valley, scenery, seals, chases] = await Promise.all([
      loadWorld(storage), loadValley(storage),
      import('./scenery.js').then(async (scene) => { await scene.loadScenery(); return scene; }),
      import('../pets/seals.js'),
      import('../duel/chase.js'),
      // The Muddles' sheet sizes, for the one in the square (loaded with the village, not at the cold open).
      import('../duel/muddle-sheets.js').then((m) => { MUDDLE_SHEETS = m.MUDDLE_SHEETS; }),
    ]);
  } catch (err) {
    console.error('[CAT OS] village could not open', err);
    outlet.innerHTML = `<section class="cw cw--error"><h1>The village could not open</h1><p>Part of the village did not arrive. Your saved progress is still on this device.</p><button class="btn btn--primary" onclick="location.reload()">Try again</button></section>`;
    return;
  }
  // Left while the records loaded: do not start a village (its music, its
  // greeting, Toffee's hello) underneath whatever screen comes next.
  if (!outlet.isConnected || location.hash !== arrivedAt) return;
  const { mountScene } = scenery;
  const { deriveSeals, TOUR } = seals;
  const { openChase, lastCaught, ladderFrom, homeName, CHASE_LAURELS } = chases;
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
          <img class="cw-art" src="${TERRAIN}" alt="" draggable="false" decoding="async" fetchpriority="high">
          <div class="cw-clouds" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <div class="cw-tint" aria-hidden="true"></div>
          <div class="cw-sunlight" aria-hidden="true"></div>
          <div class="cw-glows" aria-hidden="true">${[...LAMPS.map((l, i) => glow(l, 'lamp', i)), ...WINDOWS.map((w, i) => glow(w, 'win', i))].join('')}${Object.entries(HOUSE_ART).map(([id, art]) => `<i class="cw-aura" data-house="${id}" style="left:${art.aura[0].toFixed(1)}px;top:${art.aura[1].toFixed(1)}px;--r:${art.aura[2].toFixed(1)}px"></i>`).join('')}</div>
          <div class="cw-treasures" aria-hidden="true"></div>
          <canvas class="cw-life" width="${MAP.w / 2}" height="${MAP.h / 2}" aria-hidden="true"></canvas>
          <div class="cw-spots">${spotsHTML()}</div>
          <div class="cw-pets">${PETS.map((p) => petHTML(p, pets)).join('')}</div>
          <div class="cw-plates" aria-hidden="true">${platesHTML()}</div>
          <div class="cw-says" aria-hidden="true">${PETS.map((p) => saysHTML(p, pets)).join('')}</div>
        </div>
        <div class="cw-foliage" aria-hidden="true">${Object.entries(CELLS.foliage).map(([k, [x, y, w, h]]) => `<i class="cw-foliage__${k}" style="background-image:url(${ART_FILES.foliage});--x:${x}px;--y:${y}px;--w:${w};--h:${h}"></i>`).join('')}</div>
      </div>
      <header class="cw-hud">
        <div class="cw-hud__left">
          <button class="cw-chip cw-chip--fire" data-open="fire"></button>
          <button class="cw-chip cw-chip--level"></button>
        </div>
        <div class="cw-hud__right">
          <button class="cw-round" data-open="cottage" aria-label="Settings: sound, your village's name and your progress">${gearSVG}</button>
          <button class="cw-chip cw-chip--tour" data-open="tour"></button>
        </div>
      </header>
      <div class="cw-dock">
        <a class="cw-letter" href="#/letters" hidden></a>
        <a class="cw-tease" href="#/duel" hidden></a>
        <button class="cw-side cw-side--l" data-open="friends" aria-label="The rooms: every house and subject">${subjectsSVG}<span>Rooms</span></button>
        <a class="cw-play" data-play href="#/duel"></a>
        <a class="cw-vs" href="#/bill" hidden></a>
        <a class="cw-side cw-side--r" href="#/book" aria-label="The Book of Curiosities: the cards you have collected">${bookSVG}<span>Book</span></a>
      </div>
      <button class="cw-edge" hidden></button>
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
  const cam = { x: NODES.lib.x + 120, y: MAP.h / 2 };
  let vw = 1, vh = 1, s = 1, base = 1, zoom = 1, tween = null, onCamera = () => {};
  let entering = false; // walking into a house (enterRoom): the camera is pushing in and nothing else may move it
  const scale = () => s;
  /* Closer than the full height only while walking into a house (enterRoom) or coming back out of one. */
  const DOOR_ZOOM = 3.4;
  const foliage = root.querySelector('.cw-foliage');
  const apply = () => {
    zoom = clamp(zoom, 1, DOOR_ZOOM);
    s = base * zoom;
    const hw = vw / 2 / s, hh = vh / 2 / s;
    cam.x = hw * 2 >= MAP.w ? MAP.w / 2 : clamp(cam.x, hw, MAP.w - hw);
    // At the full height there is nowhere to go up or down: the top of the valley stays at the top of the screen.
    cam.y = hh * 2 >= MAP.h - 0.5 ? MAP.h / 2 : clamp(cam.y, hh, MAP.h - hh);
    map.style.transform = `translate3d(${(vw / 2 - cam.x * s).toFixed(2)}px,${(vh / 2 - cam.y * s).toFixed(2)}px,0) scale(${s.toFixed(4)})`;
    map.style.setProperty('--inv', (1 / s).toFixed(4));
    // the leaves at the screen's corners are nearer than the valley: they drift a little the other way
    foliage.style.transform = `translate3d(${clamp(-(cam.x - MAP.w / 2) * s * 0.03, -14, 14).toFixed(1)}px,0,0)`;
    onCamera();
  };
  const layout = () => {
    vw = viewport.clientWidth || window.innerWidth; vh = viewport.clientHeight || window.innerHeight;
    base = vh / MAP.h; // the whole height of the valley, top to bottom, on every screen
    apply();
  };
  /** Glide to a world point (and, if asked, to a closeness `zoomTo`). `inout` eases both ends, for the push in to a door. */
  const panTo = (x, y, { ms = 900, zoomTo = null, inout = false } = {}) => {
    // Any glide that does not ask for a closeness goes back to the full height (a pull-back cut short never leaves the camera close).
    const z = zoomTo ?? (entering ? zoom : 1);
    if (reduced || ms <= 0) { tween = null; cam.x = x; cam.y = y; zoom = z; apply(); return; }
    const from = { ...cam, z: zoom }, to = { x, y, z }, t0 = performance.now();
    const step = (t) => {
      if (tween !== step || disposed) return;
      const p = Math.min(1, (t - t0) / ms), e = inout ? (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2) : 1 - (1 - p) ** 3;
      zoom = from.z + (to.z - from.z) * e;
      cam.x = from.x + (to.x - from.x) * e; cam.y = from.y + (to.y - from.y) * e;
      apply();
      if (p < 1) requestAnimationFrame(step); else tween = null;
    };
    tween = step; requestAnimationFrame(step);
  };
  /** Bring a point into view: the valley only slides sideways, so only its x matters (on a wide screen, clear of a card on the right). */
  const reveal = (p) => {
    if (vw < 900) panTo(p.x, cam.y, { ms: 600 });
    else panTo(p.x + (0.5 - 0.36) * vw / scale(), cam.y, { ms: 600 });
  };
  const ro = new ResizeObserver(layout); ro.observe(viewport); layout();

  /* Drag, fling, wheel, keys: sideways only. A drag never becomes a tap; a second finger is ignored. */
  let drag = null, moved = false, fling = null, finger = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (finger !== null || entering) return; // only the first finger drags; nothing drags while walking in
    // A drag during the pull-back out of a house finishes it at once: the valley is always dragged at its full height.
    if (zoom > 1) { zoom = 1; apply(); }
    tween = null; fling = null; finger = e.pointerId;
    drag = { x: e.clientX, y: e.clientY, cx: cam.x, t: performance.now(), vx: 0 }; moved = false;
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== finger) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 7) return;
    if (!moved) { moved = true; try { viewport.setPointerCapture(e.pointerId); } catch { /* fine */ } viewport.classList.add('is-dragging'); }
    const now = performance.now(), nx = drag.cx - dx / scale(), dt = Math.max(1, now - drag.t);
    drag.vx = ((nx - cam.x) / dt) * 0.6 + drag.vx * 0.4; drag.t = now;
    cam.x = nx; apply();
  });
  const endDrag = (e) => {
    if (e.pointerId !== finger) return;
    finger = null;
    viewport.classList.remove('is-dragging');
    // A drag swallows the click it ends in (below), and only that one: a click from the keyboard comes later.
    if (moved) setTimeout(() => { moved = false; }, 0);
    if (moved && drag && !reduced && Math.abs(drag.vx) > 0.05) {
      let { vx } = drag, last = performance.now();
      const step = (t) => {
        if (fling !== step || disposed) return;
        const dt = t - last; last = t;
        cam.x += vx * dt; vx *= 0.92 ** (dt / 16); apply();
        if (Math.abs(vx) > 0.01) requestAnimationFrame(step); else fling = null;
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
    if (e.ctrlKey) return; // a trackpad pinch: the valley has one size
    // A mouse wheel only scrolls up and down; here that slides the valley sideways.
    cam.x += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / s;
    apply();
  }, { passive: false });
  viewport.addEventListener('keydown', (e) => {
    if (e.target !== viewport) return;
    const step = 70 / s;
    const keys = { ArrowLeft: -step, ArrowRight: step };
    if (keys[e.key]) { e.preventDefault(); panTo(cam.x + keys[e.key], cam.y, { ms: 220 }); }
  });
  // A focused friend or building that sits off-screen is brought into view.
  viewport.addEventListener('focusin', (e) => {
    const p = e.target.closest('[data-pet],[data-spot]');
    if (!p) return;
    const at = p.dataset.pet ? life.positionOf(p.dataset.pet) : spotCentre(p.dataset.spot);
    if (Math.abs(at.x - cam.x) * scale() > vw * 0.4) panTo(at.x, cam.y, { ms: 450 });
  });

  /* ---------------- Life ---------------- */
  /* The valley's pieces (scenery.js): shadows, bridges, the eight houses (each cut at its ground line so friends walk behind its walls) and the oaks.
     What each house has grown (houses.js) and its moving parts (mechanisms.js) draw on the house's own canvas. */
  const scene = mountScene(map, { reduced });
  const houses = createHouseLife({ reduced, stages: pets.houses, scene, scale });
  const life = createLife(root, { pets, atmo, reduced, houses, memory: store, images: scene.images, view: () => ({ x: cam.x - vw / 2 / s, y: cam.y - vh / 2 / s, w: vw / s, h: vh / s, s }) });
  // For the browser gates: put the camera somewhere, find a friend, show the houses at given stages (looks only; nothing is saved).
  root.__village = {
    look: (x, y) => panTo(x, y ?? cam.y, { ms: 0 }), positionOf: (id) => life.positionOf(id), party: (id, o) => life.party(id, o), callOn: (id) => life.callOn(id),
    houses: (stages) => showHouses(stages), grown: () => shownStages, get pace() { return life.pace; }, get camera() { return { ...cam, s, zoom, base }; },
  };
  viewport.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const bounds = map.getBoundingClientRect(), s = scale();
    life.ripple((e.clientX - bounds.left) / s, (e.clientY - bounds.top) / s);
  });
  const saidEl = root.querySelector('[data-said]');
  const announce = (text) => { if (text) saidEl.textContent = String(text).replace(/<[^>]*>/g, ''); };
  /* What is on screen, at most once a frame: off-screen halos pause. */
  let viewQueued = false;
  const viewNow = () => ({ x: cam.x - vw / 2 / s, y: cam.y - vh / 2 / s, w: vw / s, h: vh / s });
  const glowEls = [...root.querySelectorAll('.cw-glow')].map((el) => ({ el, x: parseFloat(el.style.left), y: parseFloat(el.style.top), off: false }));
  /* Subject plates stay readable: one half off the screen's edge, or under the top bar, slides back in (only while its house is near). */
  const plates = [...root.querySelectorAll('.cw-plate')].map((el) => ({ el, at: SIGNS[el.dataset.spot], w: 0, h: 0, dx: 0, dy: 0 }));
  const keepPlates = () => {
    for (const p of plates) {
      if (!p.w) { p.w = p.el.offsetWidth; p.h = p.el.offsetHeight; }
      const sx = vw / 2 + (p.at.x - cam.x) * s, sy = vh / 2 + (p.at.y - cam.y) * s;
      const near = sx > -p.w / 2 && sx < vw + p.w / 2 && sy > 0 && sy < vh;
      const dx = near ? clamp(sx, 8 + p.w / 2, vw - 8 - p.w / 2) - sx : 0;
      // Clear of the top bar, and on the right of the tour chip under the settings button.
      const top = sx + dx + p.w / 2 > vw - 120 ? 108 : 64, dy = near ? Math.max(0, top - (sy - p.h)) : 0;
      if (Math.abs(dx - p.dx) > 0.5 || Math.abs(dy - p.dy) > 0.5) {
        p.dx = dx; p.dy = dy;
        p.el.style.setProperty('--dx', `${(dx / s).toFixed(1)}px`); p.el.style.setProperty('--dy', `${(dy / s).toFixed(1)}px`);
      }
    }
  };
  const syncView = () => {
    viewQueued = false;
    if (disposed) return;
    keepPlates();
    const v = viewNow();
    for (const g of glowEls) { const off = g.x < v.x - 60 || g.x > v.x + v.w + 60 || g.y < v.y - 60 || g.y > v.y + v.h + 60; if (off !== g.off) { g.off = off; g.el.toggleAttribute('data-off', off); } }
  };
  /* Each house body is baked for its stage and the hour (scenery.js): the colour, dark or lit windows, the hour's light. */
  let shownStages = null;
  const bake = (stages) => scene.setLook(stages, root.dataset.hour, root.dataset.weather).then(() => { if (!disposed) shownStages = JSON.stringify(stages ?? {}); }, (err) => console.error('[CAT OS] the village could not bake its houses', err));
  /** A house's own lamps light at stage 1 and its windows at stage 2; the village's lamps always burn. */
  const lightHouses = (stages) => {
    for (const el of root.querySelectorAll('.cw-glow[data-house]')) el.classList.toggle('is-off', (stages?.[el.dataset.house] ?? 0) < (el.classList.contains('cw-glow--lamp') ? 1 : 2));
    // Stage 9: a golden glow round the whole house.
    for (const el of root.querySelectorAll('.cw-aura')) el.classList.toggle('is-on', (stages?.[el.dataset.house] ?? 0) >= 9);
  };
  let lookStages = pets.houses;
  const showHouses = (stages) => { lookStages = stages; houses.setStages(stages); lightHouses(stages); life.housesChanged(); return bake(stages); };
  lightHouses(pets.houses);
  bake(pets.houses);

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

  /* ---------------- The Muddles in the village (src/duel/chase.js) ----------------
     Tonight's Muddle lurks in the square by the notice board, where its poster
     is up; tap it to take it on. Beaten, it runs off and peeks out of the door
     of the house it is hiding in until a round in there catches it. */
  let chase = null;
  const muddleEl = document.createElement('button');
  muddleEl.className = 'cw-muddle';
  muddleEl.hidden = true;
  root.querySelector('.cw-pets').appendChild(muddleEl);
  let shownMuddle = '';
  /* A hiding Muddle peeks out beside the door, on the side away from where the house's own friend stands. */
  const muddleSpot = (home) => {
    if (!home) return MUDDLE_SQUARE;
    const d = HOMES[home].door, f = NODES[HOMES[home].node];
    return { x: d.x + (d.x >= f.x ? 30 : -30), y: Math.max(d.y, f.y) + 3 };
  };
  function showMuddle({ id, home }, { at = null } = {}) {
    const bout = boutOf(id), p = at ?? muddleSpot(home), key = `${id}|${home}`;
    muddleEl.hidden = false;
    muddleEl.dataset.mode = home ? 'hiding' : 'square';
    muddleEl.style.left = `${p.x.toFixed(1)}px`; muddleEl.style.top = `${p.y.toFixed(1)}px`; muddleEl.style.zIndex = String(Math.round(p.y + 2));
    if (key === shownMuddle) return;
    shownMuddle = key;
    muddleEl.innerHTML = `<span class="cw-muddle__fig">${muddleFigure(id, 62)}</span><span class="cw-muddle__mark" aria-hidden="true">${home ? '?' : '!'}</span>`;
    muddleEl.setAttribute('aria-label', home ? `${bout.name} is hiding in ${homeName(home)}. Go in and catch it.` : `${bout.name} is in the village square. Take it on.`);
  }
  muddleEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (muddleEl.dataset.mode === 'hiding' && chase) { enterRoom(chase.home, muddleEl); return; }
    unlock(); play('open'); location.hash = '#/duel';
  });
  /* Tonight's Muddle on the square's notice board (painted onto the board itself, so friends still walk in front of it). */
  let posted = '';
  function postBill(id) {
    if (posted === id) return;
    posted = id;
    const img = new Image();
    img.decoding = 'async';
    img.src = `./assets/art/muddle-${id}.webp`;
    img.decode().then(() => { if (!disposed && posted === id) scene.poster(img, MUDDLE_SHEETS[id]); }, () => { /* the board keeps a blank playbill */ });
  }

  /* ---------------- The HUD ---------------- */
  const hud = () => {
    const f = pets.flame, T = pets.today;
    const fire = root.querySelector('.cw-chip--fire');
    fire.innerHTML = `${flameSVG(f.tier)}<b>${f.days}</b>`;
    fire.setAttribute('aria-label', f.days ? `Toffee's fire: ${f.days} ${f.days === 1 ? 'day' : 'days'} in a row` : "Toffee's fire: help any friend today to light it");
    fire.classList.toggle('is-out', !f.today);
    const learning = world.records?.learning ?? [];
    const lad = ladderFrom(world.records);
    const lv = root.querySelector('.cw-chip--level');
    lv.innerHTML = `<span class="cw-lv"><small>Stop</small><b>${lad.arena.n}</b></span><span class="cw-lvbar" aria-hidden="true"><i style="width:${Math.round(lad.pct * 100)}%"></i></span><span class="cw-laurels">${laurelSVG(21)}<b>${lad.laurels}</b></span>`;
    lv.setAttribute('aria-label', `Stop ${lad.arena.n} on the Laurel Road, ${lad.arena.name}. ${lad.laurels} laurels${lad.next ? `; ${lad.toNext} more to reach ${lad.next.name}` : ''}. Open the Laurel Road.`);
    const playEl = root.querySelector('.cw-play');
    playEl.setAttribute('href', '#/duel');
    const allDuels = duelsIn(learning);
    const up = nextBout(allDuels, Date.now());
    const trouble = troublemakerOf(allDuels, Date.now());
    const double = !!trouble?.open && trouble.bout.id === up.id;
    /* The game takes turns: a Muddle you beat runs into a house (src/duel/chase.js), and the big button
       follows it in. Catch it with one real round there, and PLAY is a duel again. */
    chase = openChase(world.records);
    playEl.classList.toggle('is-chase', !!chase);
    if (chase) {
      playEl.dataset.chase = chase.home;
      playEl.setAttribute('href', ROOM_OF.get(chase.home) ?? '#/duel');
      playEl.innerHTML = `<i class="cw-play__x2">+${CHASE_LAURELS} laurels</i><b>CHASE</b><small>${escapeHTML(chase.bout.name)} · ${escapeHTML(HOUSE_NAME[chase.home])}</small>`;
      playEl.setAttribute('aria-label', `Chase ${chase.bout.name} into ${homeName(chase.home)}. One round in there catches it, for ${CHASE_LAURELS} laurels.`);
    } else {
      delete playEl.dataset.chase;
      /* The double is a tag on the corner: in the line under PLAY it pushed the Muddle's name off the button. */
      playEl.innerHTML = `${double ? '<i class="cw-play__x2">2× laurels</i>' : ''}<b>PLAY</b><small>vs ${escapeHTML(up.name)}</small>`;
      playEl.setAttribute('aria-label', `Play a duel against ${up.name}: ${up.skill}.${double ? ' Today\'s troublemaker, for double laurels.' : ''}`);
    }
    for (const el of root.querySelectorAll('.cw-plate')) el.classList.toggle('is-chase', el.dataset.spot === chase?.home);
    showMuddle(chase ? { id: chase.bout.id, home: chase.home } : { id: up.id, home: null });
    postBill(up.id);
    /* Who is next, as a face on the corner of PLAY. Tapping the face opens the
       bill, where every Muddle (every part of the exam) can be challenged. */
    const vsEl = root.querySelector('.cw-vs');
    vsEl.hidden = !lad.duels;
    if (lad.duels) {
      vsEl.innerHTML = `<span class="cw-vs__face" style="background-image:url(./assets/art/muddle-${up.id}.webp)"></span><i>All 10</i>`;
      vsEl.setAttribute('aria-label', `Tonight's bill: choose which Muddle to play. Next is ${up.name}.`);
    }
    const waiting = pendingLetters(learning, Date.now(), world.records?.sessions ?? []).length;
    const letterEl = root.querySelector('.cw-letter');
    letterEl.hidden = !waiting;
    letterEl.innerHTML = waiting ? `${ENVELOPE_SVG}<b>${waiting}</b>` : '';
    letterEl.setAttribute('aria-label', `${waiting} ${waiting === 1 ? 'letter is' : 'letters are'} waiting to be opened`);
    /* An open question, planted on the home screen: the first line of what the
       next letter holds. It only ever names a card that letter will really open with. */
    const teaseEl = root.querySelector('.cw-tease');
    if (waiting || !lad.duels) teaseEl.hidden = true;
    else import('../duel/content.js').then(({ loadCurios }) => loadCurios()).then(({ cards }) => {
      const card = teaseCard(cards, ownedCards(learning));
      if (disposed || !card) { teaseEl.hidden = true; return; }
      teaseEl.innerHTML = `<small>Your next letter opens with</small>${escapeHTML(card.hook)}`;
      teaseEl.hidden = false;
    }, () => { teaseEl.hidden = true; });
    root.querySelector('.cw-treasures').innerHTML = decorLayer(pets);
    for (const p of PETS) {
      const pp = pets.pets.find((x) => x.id === p.id);
      const el = root.querySelector(`.pet[data-pet="${p.id}"]`);
      el.dataset.word = pp.word;
      el.setAttribute('aria-label', `${p.name}, ${MOOD_LABEL[pp.word]}. ${p.subject}. ${ageOf(pp.stage).name}, stage ${pp.stage} of 10${pp.stage ? `, ${stageTitle(p.id, pp.stage)}` : ''}.${pp.pick && !pp.helpedToday ? ' Needs your help today.' : ''} ${p.id === 'chai' ? 'Go into his library.' : p.id === 'matcha' ? 'Go into the glasshouse.' : `Open ${p.name}'s card.`}`);
    }
    life.setMarks(T.picks.filter((pid, i) => !T.done[i]));
    /* The valley tour (src/pets/seals.js): how many homes are sealed, and a glow on the next home's plate. */
    const tour = deriveSeals(world.records), tourEl = root.querySelector('.cw-chip--tour'), nextHome = tour.homes.find((h) => h.id === tour.next);
    tourEl.innerHTML = `${SEAL_SVG}<b>${tour.sealed}</b><small>/${tour.total}</small>`;
    tourEl.setAttribute('aria-label', `The valley tour: ${tour.sealed} of ${tour.total} homes sealed${nextHome ? `. Next: ${nextHome.home}` : ''}. Open the tour.`);
    for (const el of root.querySelectorAll('.cw-plate')) el.classList.toggle('is-next', el.dataset.spot === tour.next);
    root.style.setProperty('--harmony', pets.harmony.toFixed(2));
  };
  hud();
  // Coming back to the village is when the plan changes: in the app, rewrite what the phone will show.
  if (window.CatOSAndroid) import('../shell/reminders.js').then((m) => m.syncReminders(storage)).catch(() => { /* no reminders */ });
  root.querySelector('.cw-play').addEventListener('click', (e) => {
    const home = e.currentTarget.dataset.chase;
    // CHASE walks into the house the Muddle ran into, the same way a tap on the house does.
    if (home && ROOM_OF.has(home)) { e.preventDefault(); enterRoom(home, e.currentTarget); return; }
    unlock(); play('open');
  });
  root.querySelector('.cw-chip--level').addEventListener('click', () => { unlock(); location.hash = '#/road'; });

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
    storage, close, refresh, toast, play, reduced, seals,
    get world() { return world; }, get pets() { return pets; }, get valley() { return valley; },
    setValley: (v) => { valley = v; root.querySelector('h1').textContent = `${valleyName(v)}: your village`; hud(); },
    celebrate: (id) => life.poke(id, { happy: true }),
    open: (kind, arg, trigger) => openCard(kind, arg, trigger),
    showPet: (id) => { if (ROOM_OF.has(id)) { enterRoom(id); return; } life.poke(id); reveal(life.positionOf(id)); later(() => openCard('pet', id), reduced ? 0 : 260); },
  };
  /* Every house is a room you walk straight into, with no friend card between
     a tap and entry. House, friend and roster all use the same doorway. */
  /**
   * Walking into a house, like a film: the bars and buttons slip away, the
   * camera pushes in to the door while the edges of the screen darken, the
   * doorway's dark closes round it, and the room opens out of that dark
   * (throughDoor). A Muddle hiding in there is announced as the room opens.
   */
  const enterRoom = (id, from) => {
    if (entering || !ROOM_OF.has(id)) return;
    entering = true;
    unlock(); play('open');
    announce(`${PET_BY_ID.get(id).name}: Come in.`);
    life.poke(id);
    const hiding = chase?.home === id ? chase : null;
    try { sessionStorage.setItem('catos:entered', JSON.stringify({ id, at: Date.now() })); } catch { /* private mode */ }
    const go = () => { throughDoor(hiding && { bout: hiding.bout, laurels: CHASE_LAURELS }); location.hash = ROOM_OF.get(id); };
    if (reduced) { go(); return; }
    tween = null; fling = null;
    root.classList.add('is-entering');
    const at = HOMES[id]?.door, box = viewport.getBoundingClientRect(), aim = at ? { x: at.x, y: at.y - 26 } : null;
    if (aim) panTo(aim.x, aim.y, { ms: 1150, zoomTo: DOOR_ZOOM, inout: true });
    later(() => {
      // The doorway's dark spreads from wherever the door is on screen by now.
      const r = aim ? null : from?.getBoundingClientRect?.();
      const door = document.createElement('div');
      door.className = 'cw-door';
      door.style.setProperty('--x', `${Math.round(aim ? box.left + vw / 2 + (aim.x - cam.x) * s : r ? r.left + r.width / 2 : innerWidth / 2)}px`);
      door.style.setProperty('--y', `${Math.round(aim ? box.top + vh / 2 + (aim.y - cam.y) * s : r ? r.top + r.height / 2 : innerHeight / 2)}px`);
      root.appendChild(door);
      requestAnimationFrame(() => requestAnimationFrame(() => door.classList.add('is-shut')));
    }, aim ? 640 : 0);
    later(go, aim ? 1180 : 480);
    later(() => { entering = false; }, 2400);
  };
  const openCard = (kind, arg, trigger) => {
    if (kind === 'pet' && ROOM_OF.has(arg)) { if (openKind) close(); enterRoom(arg, trigger); return; }
    // A card opened from inside another card replaces its trigger; focus goes back to the button that started it.
    if (trigger && card.contains(trigger)) trigger = root.querySelector('[data-open="friends"]');
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
      if (ROOM_OF.has(id)) { enterRoom(id, pet); return; }
      unlock();
      announce(`${PET_BY_ID.get(id).name}: ${life.poke(id)}`);
      reveal(life.positionOf(id));
      later(() => openCard('pet', id, pet), reduced ? 0 : 380);
      return;
    }
    const spot = e.target.closest('[data-spot]');
    if (spot) {
      const s = spot.dataset.spot;
      if (ROOM_OF.has(s)) { enterRoom(s, spot); return; }
      if (s === 'toffee') { life.poke(s); reveal(NODES.camp); openCard('fire', null, spot); return; }
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
    if (disposed) return;
    // Reading a card is an intentional action. Let the player finish first.
    if (openKind) { partying = true; later(nextParty, 500); return; }
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
    // Animation memory only. The collection itself always comes from records.
    const collected = deriveJourney(pets).keepsakes.filter(k => k.earned);
    let seenKeepsakes = null;
    try { seenKeepsakes = JSON.parse(store.get('catos:keepsakes-seen') || 'null'); } catch { /* old memory */ }
    store.set('catos:keepsakes-seen', JSON.stringify(collected.map(k => k.id)));
    if (afterRun && Array.isArray(seenKeepsakes)) {
      const fresh = collected.filter(k => !seenKeepsakes.includes(k.id));
      if (fresh.length) whenQuiet(() => {
        toast(`${keepsakeArt(fresh[0].pet, true, fresh[0].icon, fresh[0].tier)}<span><b>${escapeHTML(fresh[0].name)}</b>${fresh.length > 1 ? ` and ${fresh.length - 1} more` : ''} added to your Journal.</span>`, 6500);
      });
    }
    /* A home newly sealed on the valley tour, or the whole tour done. Animation memory only: the seals themselves come from records. */
    {
      const tour = deriveSeals(world.records), sealedNow = tour.homes.filter((h) => h.sealed).map((h) => h.id);
      let had = null;
      try { had = JSON.parse(store.get('catos:seals') || 'null'); } catch { /* old memory */ }
      store.set('catos:seals', JSON.stringify({ done: tour.toursDone, sealed: sealedNow }));
      if (afterRun && had && typeof had === 'object') {
        if (tour.toursDone > (Number(had.done) || 0)) {
          celebrate(`<p class="cw-party__eyebrow">Every home is sealed</p><span class="cw-party__chest" aria-hidden="true">${SEAL_SVG}</span><h2 id="cw-party-h">The valley tour is complete!</h2><p>Eight homes, every part of the paper. Tour ${tour.tour} starts again at Chai's library, whenever you like.</p>`, 'levelup');
        } else {
          const fresh = sealedNow.filter((id) => !(had.sealed ?? []).includes(id));
          if (fresh.length) whenQuiet(() => {
            const h = TOUR.find((x) => x.id === fresh[0]);
            const [cx, cy] = HOUSE_ART[h.id]?.mask ?? [NODES.pc.x, NODES.pc.y];
            reveal({ x: cx, y: cy });
            later(() => { houses.burst(h.id); play('grow'); }, reduced ? 0 : 650);
            toast(`${SEAL_SVG}<span><b>${escapeHTML(h.home)} is sealed!</b> ${tour.sealed} of ${tour.total} homes on the valley tour.</span>`, 6000);
            announce(`${h.home} is sealed. ${tour.sealed} of ${tour.total} homes on the valley tour.`);
          });
        }
      }
    }
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
    store.set('catos:level-seen', String(L));
    if (afterRun && seen && L > seen) {
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
      if (afterRun) celebrate(`<p class="cw-party__eyebrow">All three friends helped</p><span class="cw-party__chest" aria-hidden="true">${giftSVG}</span><h2 id="cw-party-h">Today's gift: +${DAILY_GIFT} ${GLOW_SVG}</h2><p>Come back tomorrow: three more friends will need you.</p>`, 'chest');
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
  /* The house just left, if the learner walked out of one (enterRoom remembers it for the way back). */
  const entered = (() => {
    try {
      const v = JSON.parse(sessionStorage.getItem('catos:entered') || 'null');
      sessionStorage.removeItem('catos:entered');
      return v && HOMES[v.id] && Date.now() - Number(v.at) < 45 * 60e3 ? v : null;
    } catch { return null; }
  })();
  const houseX = (id) => HOUSE_ART[id]?.mask?.[0] ?? HOMES[id]?.door?.x ?? NODES.pc.x;
  /** Out of a house the way you went in: the camera starts close at its door and pulls back to the whole valley, then slides to `x`. */
  function pullBack(x) {
    if (!entered || reduced) { panTo(x, cam.y, { ms: 0 }); return; }
    const d = HOMES[entered.id].door;
    panTo(d.x, d.y - 26, { ms: 0, zoomTo: DOOR_ZOOM * 0.8 });
    root.classList.add('is-leaving-house');
    later(() => panTo(x, cam.y, { ms: 1250, zoomTo: 1, inout: true }), 80);
    later(() => root.classList.remove('is-leaving-house'), 1200);
  }
  /** A beaten Muddle bolts from the square along the lanes into its hideout; the camera follows, then walks in after it. */
  function runChase() {
    const { bout, home } = chase, path = route(nearestNode(MUDDLE_SQUARE), HOMES[home].node);
    panTo(MUDDLE_SQUARE.x, cam.y, { ms: 0 });
    showMuddle({ id: bout.id, home: null });
    announce(`${bout.name} ran off into ${homeName(home)}. Catch it in there.`);
    if (reduced || path.length < 2) { showMuddle({ id: bout.id, home }); later(() => enterRoom(home, null), 900); return; }
    const pts = [MUDDLE_SQUARE, ...path, HOMES[home].door], legs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i += 1) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); legs.push(d); total += d; }
    const ms = clamp(total * 3.2, 1300, 2600);
    later(() => {
      play('swoosh');
      toast(`<b>${escapeHTML(bout.name)} ran into ${escapeHTML(homeName(home))}!</b> Catch it in there: +${CHASE_LAURELS} laurels.`, 4600);
      muddleEl.classList.add('is-running');
      const t0 = performance.now();
      const step = (t) => {
        if (disposed) return;
        let d = Math.min(1, (t - t0) / ms) * total, i = 0;
        while (i < legs.length - 1 && d > legs[i]) { d -= legs[i]; i += 1; }
        const a = pts[i], b = pts[i + 1], k = legs[i] ? Math.min(1, d / legs[i]) : 1, p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
        muddleEl.style.setProperty('--dir', b.x < a.x ? '-1' : '1');
        showMuddle({ id: bout.id, home: null }, { at: p });
        tween = null; cam.x = p.x; apply();
        if (t - t0 < ms) requestAnimationFrame(step);
        else { muddleEl.classList.remove('is-running'); showMuddle({ id: bout.id, home }); later(() => enterRoom(home, muddleEl), 650); }
      };
      requestAnimationFrame(step);
    }, 700);
  }
  /* A Muddle caught in its hideout: its own card once the party is over, and the laurels it was worth. Animation memory only. */
  if (store.get('catos:caught') === null) store.set('catos:caught', lastCaught(world.records)?.duel.id ?? 'none');
  function checkCatch() {
    const c = lastCaught(world.records);
    if (!c || store.get('catos:caught') === c.duel.id) return;
    store.set('catos:caught', c.duel.id);
    if (Date.now() - c.caughtAt > 45 * 60e3) return;
    whenQuiet(() => {
      reveal({ x: houseX(c.home), y: cam.y });
      later(() => { houses.burst(c.home); play('grow'); }, reduced ? 0 : 600);
      celebrate(`<p class="cw-party__eyebrow">Caught in ${escapeHTML(homeName(c.home))}</p><span class="cw-party__pet">${muddleFigure(c.bout.id, 116, 4)}</span><h2 id="cw-party-h">You caught ${escapeHTML(c.bout.name)}!</h2><p class="cw-party__new">${laurelSVG(20)} <b>+${CHASE_LAURELS} laurels</b> on the Laurel Road</p><p>Another Muddle is waiting in the square. Press PLAY.</p>`, 'levelup');
      announce(`You caught ${c.bout.name}: ${CHASE_LAURELS} laurels.`);
    });
  }
  // Where every friend stands, remembered from the very first visit, so the first stage anyone reaches gets its card.
  if (!store.get('catos:stages')) store.set('catos:stages', stagesNow());
  if (!store.get('catos:keepsakes-seen')) store.set('catos:keepsakes-seen', JSON.stringify(deriveJourney(pets).keepsakes.filter(k => k.earned).map(k => k.id)));
  if (!store.get('catos:houses')) store.set('catos:houses', JSON.stringify(pets.houses ?? {}));
  {
    const last = pets.last;
    const seen = sessionStorage.getItem('world:toasted');
    const focusSlug = sessionStorage.getItem('world:focus');
    for (const k of ['world:focus', 'world:changed', 'world:change-line', 'world:earned', 'world:unlocked', 'world:pet', 'world:gifts', 'world:heart']) sessionStorage.removeItem(k);
    const chaseArrival = new URLSearchParams(arrivedAt.split('?')[1] || '').get('chase') === '1' && !!chase;
    if (chaseArrival) {
      // Straight from a won duel: the Muddle bolts from the square into its hideout, and you follow it in.
      if (last) sessionStorage.setItem('world:toasted', String(last.at));
      welcomed = true;
      runChase();
    } else if (last && Date.now() - last.at < 20 * 60e3 && seen !== String(last.at)) {
      /* A set finished: everyone runs to the plaza and throws a party round
         the friend you helped (owner, 2026-10-03). */
      welcomed = true;
      sessionStorage.setItem('world:toasted', String(last.at));
      const p = PET_BY_ID.get(last.pet);
      pullBack(NODES.pc.x);
      later(() => {
        const line = lineFor(last.pet, 'thanks', String(last.at));
        life.party(last.pet, { line });
        announce(`Everyone ran to the square to celebrate. ${p.name}: ${line}`);
        toast(`${last.earned > 0 ? `${GLOW_SVG} <b>+${last.earned}</b> ` : ''}You helped ${p.name}! Party in the square!`, 5600);
        play('party');
        // The cards (a friend who grew, a new level, the day's gift) wait for the party to wind down.
        later(() => checkParties(true), reduced ? 1200 : 7600);
      }, reduced ? 50 : 450);
    } else if (focusSlug && petForPlace(focusSlug)) {
      // Back from a place: face its own house.
      const spot = HOUSES.find((h) => h.place === focusSlug)?.spot ?? petForPlace(focusSlug);
      pullBack(houseX(spot));
    } else if (entered) {
      pullBack(houseX(entered.id));
    } else {
      // Any other arrival opens on the house the big button is for.
      faceHouse(chase?.home ?? pets.play ?? 'chai');
    }
    later(checkCatch, welcomed ? (reduced ? 1500 : 8200) : (reduced ? 300 : 1400));
  }

  /* ---------------- First visit: one line from Toffee and the big button glows ----------------
     The new player is in a duel a few seconds after opening the app. The other
     friends are met where they live, one stop at a time, not in a slideshow. */
  if (firstVisit) {
    root.classList.add('is-pointing');
    store.set('catos:met-gang', '1');
    saveValley(storage, { awakened_at: new Date().toISOString(), met_at: new Date().toISOString() }).then((v) => { valley = v; }, () => { /* the hello will repeat once */ });
    later(async () => {
      await whenIntroDone(); // the opening video first
      if (disposed) return;
      life.hold('toffee');
      const at = life.positionOf('toffee');
      later(() => panTo(at.x, at.y - 40, { ms: 0 }), 30);
      announce(`Toffee: ${FIRST_HELLO}`);
      await life.sayAndWait('toffee', FIRST_HELLO, { ms: 9000, tapToSkip: true });
      if (!disposed) life.release();
    }, reduced ? 50 : 700);
  } else if (!welcomed) {
    /* ---------------- Every other arrival: they wave; after a day away, someone comes to meet you ---------------- */
    later(async () => {
      await whenIntroDone();
      if (disposed) return;
      const w = pets.welcome;
      if (w && store.get('catos:welcome-day') !== pets.today.key) {
        store.set('catos:welcome-day', pets.today.key);
        life.comeSay(w.pet, nearestNode({ x: cam.x, y: cam.y + 60 }), lineFor(w.pet, 'missed', pets.today.key));
      }
      life.greet(PETS.map((p) => p.id).filter((id) => onScreen(id) && id !== w?.pet));
      checkParties();
    }, reduced ? 50 : 900);
  }

  if (!firstVisit && new URLSearchParams(arrivedAt.split('?')[1] || '').get('journal') === '1') {
    later(async () => {
      await whenIntroDone();
      if (!disposed) openCard('journal', null, root.querySelector('.cw-journal'));
    }, reduced ? 50 : 400);
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
      Object.assign(root.dataset, now); Object.assign(atmo, now); life.setAtmo(now); bake(lookStages);
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
    for (const id of timers) clearTimeout(id);
    ro.disconnect(); life.destroy(); scene.destroy();
    if (openKind) closeModal(card);
  };
  window.addEventListener('hashchange', onHash);

  /** Put a house (and the lane at its door) in the middle of the screen. */
  function faceHouse(id) {
    const m = HOUSE_ART[id]?.mask, home = NODES[(HOMES[id] ?? PLACES[id])?.node];
    if (m) panTo(m[0], m[1] + m[3] * 0.35, { ms: 0 }); else if (home) panTo(home.x, home.y, { ms: 0 });
  }

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
    const b = HOMES[h.spot] ?? PLACES[h.spot], who = PET_BY_ID.get(h.pet).name;
    return `<button class="cw-spot" data-spot="${h.spot}" style="left:${b.hit.x.toFixed(1)}px;top:${b.hit.y.toFixed(1)}px;width:${b.hit.w.toFixed(1)}px;height:${b.hit.h.toFixed(1)}px" aria-label="${escapeHTML(`${h.subject}, with ${who}: ${b.label}`)}"></button>`;
  }).join('');
}

/** Set when the village loads (duel/muddle-sheets.js stays out of the cold open). */
let MUDDLE_SHEETS = {};
/** Where tonight's Muddle lurks in the square: on the cobbles in front of the notice board (world px). */
const MUDDLE_SQUARE = Object.freeze({ x: 514, y: 884 });
/** A Muddle's sprite, the same five-frame sheet a duel uses (duel/arena.js muddleSprite, without loading the arena). */
function muddleFigure(id, size, frame = 0) {
  const s = MUDDLE_SHEETS[id];
  return s ? `<span class="pet-sprite" style="--fw:${s.w};--sh:${s.h};--g:${s.gutter};--f:${frame};--size:${size};background-image:url(./assets/art/muddle-${id}.webp)"></span>` : '';
}

/**
 * The other side of a door. The doorway's dark is put on <body>, so it
 * outlives the village and the room opens out of the same dark the door
 * closed into. A Muddle hiding in the room is announced as it opens.
 */
function throughDoor(hiding) {
  const dark = document.createElement('div');
  dark.className = 'doorway';
  dark.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dark);
  let opened = false;
  const open = () => { if (opened) return; opened = true; dark.classList.add('is-open'); setTimeout(() => dark.remove(), 1000); };
  // The room has drawn when the router swaps #view; give it a moment to settle, never more than a second and a half.
  const view = document.getElementById('view');
  const mo = new MutationObserver(() => { mo.disconnect(); setTimeout(open, 320); });
  if (view) mo.observe(view, { childList: true });
  setTimeout(() => { mo.disconnect(); open(); }, 1500);
  if (hiding) setTimeout(() => chaseBanner(hiding), 900);
}

/** "Smudge is hiding in here!": a card that drops in at the top of the room, then goes on its own (or with a tap). */
function chaseBanner({ bout, laurels }) {
  const el = document.createElement('div');
  el.className = 'chase-banner';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="chase-banner__fig">${muddleFigure(bout.id, 58)}</span><span class="chase-banner__text"><b>${escapeHTML(bout.name)} is hiding in here!</b><span>Play one round to catch it: +${laurels} laurels.</span></span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
  let gone = false;
  const off = () => { if (gone) return; gone = true; el.classList.remove('is-in'); setTimeout(() => el.remove(), 450); window.removeEventListener('hashchange', off); };
  el.addEventListener('click', off);
  window.addEventListener('hashchange', off);
  setTimeout(off, 6500);
}

/** What each house is called on its sign, and the part of the paper it teaches, in a word or two. */
export const HOUSE_NAME = Object.freeze({ chai: 'The Library', matcha: 'The Glasshouse', ginger: 'The Railway', mallow: 'The Observatory', mochi: 'The Pantry', biscuit: 'The Long Table', sesame: 'The Clockworks', toffee: 'The Hearth' });
const SIGN_SUBJECT = Object.freeze({ chai: 'Reading', matcha: 'Vocabulary', ginger: 'Para Jumbles', mallow: 'Odd One Out', mochi: 'Summaries', biscuit: 'Placement', sesame: 'Completion', toffee: 'The Gauntlet' });

/** Each house's name on a small painted sign over its roof, above every friend (the hit area under the house is .cw-spot; the sign is a second target for the same door). No faces: the house is the picture. */
function platesHTML() {
  return HOUSES.map((h) => {
    const at = SIGNS[h.spot];
    return `<span class="cw-plate" data-spot="${h.spot}" style="left:${at.x.toFixed(1)}px;top:${at.y.toFixed(1)}px"><b>${escapeHTML(HOUSE_NAME[h.spot])}</b><small>${escapeHTML(SIGN_SUBJECT[h.spot])}</small></span>`;
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
const FIRST_HELLO = 'You came! The Muddles are eating our words. Quick, grab the rope!';
const SEAL_SVG = '<svg class="cw-seal" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4c1.2 0 1.7 1.1 2.8 1.3 1.1.2 2.1-.5 3 .2.9.7.6 1.9 1.2 2.8.6.9 1.8 1.2 2 2.3.2 1.1-.8 1.8-.8 2.9s1 1.8.8 2.9c-.2 1.1-1.4 1.4-2 2.3-.6.9-.3 2.1-1.2 2.8-.9.7-1.9 0-3 .2-1.1.2-1.6 1.3-2.8 1.3s-1.7-1.1-2.8-1.3c-1.1-.2-2.1.5-3-.2-.9-.7-.6-1.9-1.2-2.8-.6-.9-1.8-1.2-2-2.3-.2-1.1.8-1.8.8-2.9s-1-1.8-.8-2.9c.2-1.1 1.4-1.4 2-2.3.6-.9.3-2.1 1.2-2.8.9-.7 1.9 0 3-.2C10.3 3.5 10.8 2.4 12 2.4z" fill="#C2412F" stroke="#6E1F16" stroke-width="1.1"/><circle cx="12" cy="12" r="5.2" fill="none" stroke="#F2B7A6" stroke-width="1.2" opacity=".8"/><path d="M9.4 12.2l1.8 1.8 3.6-3.8" fill="none" stroke="#FBE3D6" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const bookSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M12 6.2C10 4.8 7.2 4.4 4 5v13.5c3.2-.6 6-.2 8 1.2 2-1.4 4.8-1.8 8-1.2V5c-3.2-.6-6-.2-8 1.2z"/><path d="M12 6.2v13.5"/></g></svg>';
const ENVELOPE_SVG = '<svg viewBox="0 0 48 36" width="44" height="33" aria-hidden="true"><rect x="2" y="3" width="44" height="30" rx="4" fill="#FBEBC6" stroke="#3b2a1c" stroke-width="2.2"/><path d="M3 5l21 16L45 5" fill="#F2DCA8" stroke="#3b2a1c" stroke-width="2.2" stroke-linejoin="round"/><circle cx="24" cy="21" r="5.2" fill="#C2513A" stroke="#3b2a1c" stroke-width="1.8"/></svg>';
const subjectsSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></g></svg>';
const gearSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3.5l1.4 2.3 2.6-.7.7 2.6 2.3 1.4-1.2 2.4 1.2 2.4-2.3 1.4-.7 2.6-2.6-.7L12 20.5l-1.4-2.3-2.6.7-.7-2.6-2.3-1.4L6.2 12 5 9.6l2.3-1.4.7-2.6 2.6.7z"/></g></svg>';

export { MOOD_LABEL, giftSVG, flameSVG };
