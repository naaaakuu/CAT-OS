/**
 * village.js (screen) — #/world, the painted village where the six pets live.
 *
 * The painting fills the screen and nothing sits on it but three small
 * things: Toffee's flame (top left), the satchel and the cottage (top
 * right), and today's wishes (bottom). Everything else is IN the world:
 * tap a pet or its house for its card, tap the clock tower for progress,
 * tap your cottage for the menu.
 *
 * The camera is a transform on one 1536×1024 layer, so every coordinate
 * below is a pixel of the painting (src/pets/paths.js), whatever the screen.
 */

import { loadWorld, loadWorldRecords, deriveWorldState } from '../world/state.js';
import { loadValley, saveValley, valleyName } from '../world/companion.js';
import { derivePets } from '../pets/economy.js';
import { PETS, PET_BY_ID, LINES, GIFTS, petForPlace } from '../pets/pets.js';
import { MAP, HOMES, PLACES, NODES, LAMPS, WINDOWS, CLOCK } from '../pets/paths.js';
import { petSprite, giftIcon } from '../pets/sprite.js';
import { createLife, PET_SIZE } from './life.js';
import { mountMotion } from './motion.js';
import { renderCard, treasureLayer } from './cards.js';
import { openModal, closeModal } from '../ui/modal.js';
import { play, unlock, startMusic, startAmbience } from '../world/audio.js';
import { motionReduced } from '../core/engagement/feedback.js';
import { escapeHTML } from '../core/utils/format.js';
import { hourWord, weatherWord, seasonWord } from '../world/engine/palette.js';

const MOOD_LABEL = { glowing: 'glowing', happy: 'happy', missing: 'missing you', sleepy: 'sleepy', wilting: 'wilting', new: 'waiting to meet you' };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export async function renderVillageHome(outlet, ctx) {
  const { storage } = ctx;
  let world, valley;
  try { [world, valley] = await Promise.all([loadWorld(storage), loadValley(storage)]); } catch (err) {
    outlet.innerHTML = `<section class="cw cw--error"><h1>The village will not open</h1><p>${escapeHTML(err.message)}</p></section>`;
    return;
  }
  if (!outlet.isConnected) return;
  let state = world.state;
  let pets = state.pets ?? derivePets(state, world.records, world.content, state.now);
  const atmo = state.atmo;
  const reduced = motionReduced();
  const name = valleyName(valley);

  outlet.innerHTML = `
    <section class="cw" data-hour="${atmo.hour}" data-weather="${atmo.weather}" data-season="${atmo.season}" aria-label="Your village">
      <h1 class="sr-only">${escapeHTML(name)}: your village</h1>
      <div class="cw-viewport" tabindex="0" aria-label="The village. Drag or use the arrow keys to look around; Tab to visit a pet or a building.">
        <div class="cw-map" style="width:${MAP.w}px;height:${MAP.h}px">
          <img class="cw-art" src="${MAP.src}" alt="" draggable="false" decoding="async" fetchpriority="high">
          <div class="cw-clouds" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="cw-tint" aria-hidden="true"></div>
          <div class="cw-glows" aria-hidden="true">${[...LAMPS.map((l) => glow(l, 'lamp')), ...WINDOWS.map((w) => glow(w, 'win'))].join('')}</div>
          <div class="cw-treasures" aria-hidden="true"></div>
          <svg class="cw-clock" aria-hidden="true" style="left:${CLOCK.x - CLOCK.r}px;top:${CLOCK.y - CLOCK.r}px" width="${CLOCK.r * 2}" height="${CLOCK.r * 2}" viewBox="-10 -10 20 20"><line class="cw-clock__h" x1="0" y1="0" x2="0" y2="-4.6"/><line class="cw-clock__m" x1="0" y1="0" x2="0" y2="-6.8"/><circle r=".9"/></svg>
          <canvas class="cw-life" width="${MAP.w / 2}" height="${MAP.h / 2}" aria-hidden="true"></canvas>
          <div class="cw-spots">${spotsHTML()}</div>
          <div class="cw-pets">${PETS.map((p) => petHTML(p, pets)).join('')}</div>
        </div>
      </div>
      <header class="cw-hud">
        <button class="cw-flame" data-open="hearth" aria-label="Toffee's fire: ${pets.flame.days} day glow. ${escapeHTML(name)}."></button>
        <div class="cw-hud__right">
          <button class="cw-round" data-open="satchel" aria-label="Your satchel: gifts and treasures">${bagSVG}<i class="cw-badge" hidden></i></button>
          <button class="cw-round" data-open="cottage" aria-label="Your cottage: sound, settings and progress">${houseSVG}</button>
        </div>
      </header>
      <button class="cw-today" data-open="wishes"></button>
      <div class="cw-toast" role="status" aria-live="polite"></div>
      <div class="cw-overlay" hidden><div class="cw-scrim" data-close></div><section class="cw-card"></section></div>
    </section>`;

  const root = outlet.querySelector('.cw');
  const viewport = root.querySelector('.cw-viewport');
  const map = root.querySelector('.cw-map');
  const overlay = root.querySelector('.cw-overlay');
  const card = root.querySelector('.cw-card');
  const toastEl = root.querySelector('.cw-toast');
  let disposed = false;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms); timers.add(id); return id; };

  /* ---------------- The camera ---------------- */
  const cam = { x: NODES.pc.x, y: NODES.pc.y + 40, z: 1 };
  let vw = 1, vh = 1, base = 1, tween = null;
  const scale = () => base * cam.z;
  const apply = () => {
    const s = scale();
    const hw = vw / 2 / s, hh = vh / 2 / s;
    cam.x = clamp(cam.x, hw, MAP.w - hw);
    cam.y = clamp(cam.y, hh, MAP.h - hh);
    map.style.transform = `translate3d(${(vw / 2 - cam.x * s).toFixed(2)}px,${(vh / 2 - cam.y * s).toFixed(2)}px,0) scale(${s.toFixed(4)})`;
    map.style.setProperty('--inv', (1 / s).toFixed(4));
  };
  const layout = () => {
    vw = viewport.clientWidth || window.innerWidth; vh = viewport.clientHeight || window.innerHeight;
    base = Math.max(vw / MAP.w, vh / MAP.h);
    apply();
  };
  const panTo = (x, y, { z = cam.z, ms = 900 } = {}) => {
    if (reduced || ms <= 0) { cam.x = x; cam.y = y; cam.z = z; apply(); return; }
    const from = { ...cam }, t0 = performance.now();
    const step = (t) => {
      if (tween !== step || disposed) return;
      const p = Math.min(1, (t - t0) / ms), e = 1 - (1 - p) ** 3;
      cam.x = from.x + (x - from.x) * e; cam.y = from.y + (y - from.y) * e; cam.z = from.z + (z - from.z) * e;
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

  /* Drag, fling, pinch, wheel, keys. A drag never becomes a tap. */
  const ptrs = new Map();
  let drag = null, moved = false, fling = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    tween = null; fling = null;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, t: performance.now(), vx: 0, vy: 0 }; moved = false; }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; drag = { ...drag, pinch: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z }; }
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag || !ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size >= 2 && drag.pinch) {
      const [a, b] = [...ptrs.values()];
      cam.z = clamp(drag.z * Math.hypot(a.x - b.x, a.y - b.y) / drag.pinch, 1, 1.9);
      moved = true; apply(); return;
    }
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
    if (ptrs.size) return;
    viewport.classList.remove('is-dragging');
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
    if (e.ctrlKey) { cam.z = clamp(cam.z * (1 - e.deltaY * 0.01), 1, 1.9); apply(); return; }
    const s = scale(); cam.x += e.deltaX / s; cam.y += e.deltaY / s; apply();
  }, { passive: false });
  viewport.addEventListener('keydown', (e) => {
    const s = scale(), step = 70 / s;
    const keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (keys[e.key] && e.target === viewport) { e.preventDefault(); panTo(cam.x + keys[e.key][0], cam.y + keys[e.key][1], { ms: 220 }); }
    if ((e.key === '+' || e.key === '=') && e.target === viewport) { cam.z = clamp(cam.z + 0.15, 1, 1.9); apply(); }
    if (e.key === '-' && e.target === viewport) { cam.z = clamp(cam.z - 0.15, 1, 1.9); apply(); }
  });
  // A focused pet or building that sits off-screen is brought into view.
  viewport.addEventListener('focusin', (e) => {
    const p = e.target.closest('[data-pet],[data-spot]');
    if (!p) return;
    const at = p.dataset.pet ? life.positionOf(p.dataset.pet) : spotCentre(p.dataset.spot);
    const s = scale();
    if (Math.abs(at.x - cam.x) * s > vw * 0.4 || Math.abs(at.y - cam.y) * s > vh * 0.4) panTo(at.x, at.y, { ms: 450 });
  });

  /* ---------------- Life ---------------- */
  const life = createLife(root, { pets, atmo, reduced, sizes: PET_SIZE });
  const motion = mountMotion(map, { atmo, reduced });

  /* ---------------- The HUD ---------------- */
  const hud = () => {
    const f = pets.flame;
    const vname = valley?.name ? valleyName(valley) : 'Your village';
    root.querySelector('.cw-flame').innerHTML = `${flameSVG(f.tier)}${f.days ? `<span class="cw-flame__n"><b>${f.days}</b><small>${f.days === 1 ? 'day' : 'days'}</small></span>` : ''}<span class="cw-flame__name">${escapeHTML(vname)}</span>`;
    root.querySelector('.cw-flame').setAttribute('aria-label', `${f.days ? `Toffee's fire: a ${f.days}-day glow` : "Toffee's fire: waiting for its first spark"}. ${vname}.`);
    const done = pets.wishesDone;
    root.querySelector('.cw-today').innerHTML = `<span class="cw-today__dots">${pets.wishes.map((w) => `<i class="${w.done ? 'is-done' : ''}" style="--c:var(--pet-${w.pet})"></i>`).join('')}</span><span>${done === 3 ? 'All three wishes granted' : `${done} of 3 wishes`}</span>`;
    root.querySelector('.cw-today').setAttribute('aria-label', `Today's wishes: ${done} of 3 granted. Open the fire.`);
    root.querySelector('.cw-badge').hidden = !pets.nextTreasure?.affordable;
    root.querySelector('.cw-treasures').innerHTML = treasureLayer(pets);
    for (const p of PETS) {
      const pp = pets.pets.find((x) => x.id === p.id);
      const el = root.querySelector(`.pet[data-pet="${p.id}"]`);
      el.dataset.word = pp.word;
      el.setAttribute('aria-label', `${p.name}, ${MOOD_LABEL[pp.word]}. ${p.subject}. Open ${p.name}'s card.`);
    }
    root.classList.toggle('is-festival', pets.festival);
    root.style.setProperty('--harmony', pets.harmony.toFixed(2));
  };
  hud();

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
    pets = state.pets ?? derivePets(state, records, world.content, state.now);
    hud(); life.update(pets);
  };
  const api = {
    storage, close, refresh, toast, play,
    get world() { return world; }, get pets() { return pets; }, get valley() { return valley; },
    setValley: (v) => { valley = v; hud(); },
    celebrate: (id) => life.poke(id, { happy: true }),
    open: (kind, arg, trigger) => openCard(kind, arg, trigger),
    sparkleTreasure: (id) => { const el = root.querySelector(`.cw-treasure[data-t="${id}"]`); el?.classList.add('is-new'); },
  };
  const openCard = (kind, arg, trigger) => {
    const was = openKind;
    if (was) closeModal(card);
    openKind = kind;
    card.className = `cw-card cw-card--${kind}`;
    card.scrollTop = 0;
    renderCard(card, kind, arg, api);
    card.scrollTop = 0;
    requestAnimationFrame(() => { if (kind !== 'hearth' || arg !== 'wishes') card.scrollTop = 0; });
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
      life.poke(id);
      reveal(life.positionOf(id));
      later(() => openCard('pet', id, pet), reduced ? 0 : 260);
      return;
    }
    const spot = e.target.closest('[data-spot]');
    if (spot) {
      const s = spot.dataset.spot;
      if (s === 'clock') { play('tap'); location.hash = '#/growth'; return; }
      if (s === 'cottage') { openCard('cottage', null, spot); return; }
      if (s === 'fire' || s === 'toffee') { reveal(NODES.f1); openCard('hearth', null, spot); return; }
      if (PET_BY_ID.has(s)) { life.poke(s); reveal(life.positionOf(s)); openCard('pet', s, spot); }
      return;
    }
    const opener = e.target.closest('[data-open]');
    if (opener && !card.contains(opener)) {
      const k = opener.dataset.open;
      openCard(k === 'wishes' ? 'hearth' : k, k === 'wishes' ? 'wishes' : null, opener);
    }
  });

  /* ---------------- Toasts ---------------- */
  function toast(html, ms = 4200) {
    toastEl.innerHTML = `<p>${html}</p>`;
    toastEl.classList.add('is-in');
    clearTimeout(toast.t);
    toast.t = later(() => toastEl.classList.remove('is-in'), ms);
  }

  /* ---------------- Coming back from a run ---------------- */
  {
    const last = pets.last;
    const seen = sessionStorage.getItem('world:toasted');
    const focusSlug = sessionStorage.getItem('world:focus');
    for (const k of ['world:focus', 'world:changed', 'world:change-line', 'world:earned', 'world:unlocked', 'world:pet', 'world:gifts', 'world:heart']) sessionStorage.removeItem(k);
    if (last && Date.now() - last.at < 20 * 60e3 && seen !== String(last.at)) {
      sessionStorage.setItem('world:toasted', String(last.at));
      const p = PET_BY_ID.get(last.pet);
      const g = GIFTS[p.gift];
      const pp = pets.pets.find((x) => x.id === last.pet);
      const home = NODES[HOMES[last.pet].node];
      panTo(home.x, home.y, { ms: 0 });
      later(() => {
        life.poke(last.pet, { happy: true, line: last.doubled ? `${PET_BY_ID.get(pp.supplier).name}'s ${GIFTS[PET_BY_ID.get(pp.supplier).gift].name.toLowerCase()} helped. Double today.` : null });
        toast(`${giftIcon(p.gift, 22)} <b>+${last.gifts} ${last.gifts === 1 ? g.one : g.name}</b> from ${p.name}${last.doubled ? ' · doubled by the ring' : ''}`);
        play('ink');
      }, reduced ? 50 : 700);
    } else if (focusSlug && petForPlace(focusSlug)) {
      const home = NODES[HOMES[petForPlace(focusSlug)].node];
      panTo(home.x, home.y, { ms: 0 });
    }
  }

  /* ---------------- First visit: Toffee says hello (never blocks render) ---------------- */
  if (!valley.awakened_at) {
    later(async () => {
      panTo(NODES.f1.x, NODES.f1.y - 60, { ms: 0 });
      for (const [i, line] of LINES.intro.entries()) {
        if (disposed) return;
        await life.sayAndWait('toffee', line, { ms: 5200, tapToSkip: true });
        if (i === 1) panTo(NODES.pc.x, NODES.pc.y, { ms: 1400 });
      }
      if (disposed) return;
      panTo(NODES.lib.x + 120, NODES.lib.y + 60, { ms: 1400 });
      life.think('chai', true);
      try { valley = await saveValley(storage, { awakened_at: new Date().toISOString(), met_at: new Date().toISOString() }); } catch { /* the hello will repeat once */ }
    }, reduced ? 100 : 900);
  } else {
    /* ---------------- A letter, after a day or more away ---------------- */
    const letter = pets.letter;
    if (letter && store.get('catos:letter') !== pets.today) {
      later(() => {
        const p = PET_BY_ID.get(letter.pet);
        toast(`<button class="cw-letter" data-letter>${petSprite(letter.pet, { size: 34 })}<span>A letter from <b>${p.name}</b></span></button>`, 9000);
        toastEl.querySelector('[data-letter]')?.addEventListener('click', (e) => { store.set('catos:letter', pets.today); toastEl.classList.remove('is-in'); openCard('letter', letter, e.currentTarget); });
      }, 1400);
    }
  }

  /* ---------------- Sound: on the first touch, as browsers require ---------------- */
  const warmth = clamp(pets.harmony, 0, 1);
  const startSound = () => { unlock(); startMusic('world', { hour: atmo.hour, warmth }); startAmbience('world', atmo); };
  window.addEventListener('pointerdown', startSound, { capture: true, once: true });
  startMusic('world', { hour: atmo.hour, warmth }); startAmbience('world', atmo);

  /* ---------------- The hour turns while you sit here ---------------- */
  const tickHour = setInterval(() => {
    const d = new Date(), now = { hour: hourWord(d), season: seasonWord(d), weather: weatherWord(d, seasonWord(d)) };
    if (now.hour !== root.dataset.hour) { root.dataset.hour = now.hour; life.setAtmo(now); motion.setAtmo(now); }
  }, 60e3);

  /* ---------------- Cleanup ---------------- */
  const onHash = () => {
    disposed = true;
    window.removeEventListener('hashchange', onHash);
    window.removeEventListener('pointerdown', startSound, { capture: true });
    clearInterval(tickHour);
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

function glow(p, kind) {
  return `<i class="cw-glow cw-glow--${kind}" style="left:${p.x}px;top:${p.y}px;--r:${p.r}px"></i>`;
}

function spotsHTML() {
  const spot = (id, h, label, who) => `<button class="cw-spot" data-spot="${id}" style="left:${h.x}px;top:${h.y}px;width:${h.w}px;height:${h.h}px" aria-label="${escapeHTML(label)}${who ? `: ${who}` : ''}"><span class="cw-plate">${escapeHTML(label)}${who ? `<small>${who}</small>` : ''}</span></button>`;
  return [
    ...PETS.map((p) => spot(p.id, HOMES[p.id].hit, HOMES[p.id].label, `${p.name}'s home`)),
    spot('cottage', PLACES.cottage.hit, PLACES.cottage.label, 'sound, settings, your name'),
    spot('clock', PLACES.clock.hit, PLACES.clock.label, 'how far you have come'),
  ].join('');
}

function petHTML(p, pets) {
  const pp = pets.pets.find((x) => x.id === p.id);
  return `<button class="pet pet--${p.id}" data-pet="${p.id}" data-word="${pp.word}" style="--size:${PET_SIZE[p.id]}" aria-label="${p.name}">
    <span class="pet-shadow" aria-hidden="true"></span>
    <span class="pet-body">${petSprite(p.id, { size: PET_SIZE[p.id] })}</span>
    <span class="pet-bubble" aria-hidden="true" hidden></span>
    <span class="pet-think" aria-hidden="true" hidden>${giftIcon(p.gift, 22)}</span>
  </button>`;
}

const TIER_SCALE = { embers: 0.55, small: 0.75, steady: 0.9, tall: 1, bonfire: 1.12 };
function flameSVG(tier) {
  const s = TIER_SCALE[tier] ?? 0.8;
  return `<svg class="cw-flame__svg cw-flame--${tier}" viewBox="0 0 24 24" aria-hidden="true"><g transform="translate(12 22) scale(${s}) translate(-12 -22)"><path d="M12 2.6c2.4 3.3 6.2 6.2 6.2 11a6.2 6.2 0 0 1-12.4 0c0-2.7 1.3-4.5 2.7-6 .2 1.6.9 2.9 2.1 3.5-.5-3.1.3-6 1.4-8.5z" fill="#F2A23C" stroke="#7a4a1e" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 11.4c1.3 1.6 2.6 2.7 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.5.9-2.9 2.6-4.6z" fill="#FFD978"/></g></svg>`;
}
const bagSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 9V7a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9.5 13.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const houseSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 9.5V20h12V9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 6.5V4h2v4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

export { MOOD_LABEL };
