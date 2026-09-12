/**
 * world.js (screen) — the home: the whole valley as a living pixel-art
 * world you drag, zoom and touch.
 *
 * The screen answers four questions in the first two seconds, without
 * the learner reading anything:
 *   WHERE AM I     the valley, named, with every place labelled on the map
 *   WHAT CHANGED   sparks over the place you just left, and one line
 *   WHAT NEEDS ME  a marker over any place that is asking
 *   WHAT CAN I DO  two or three cards at the bottom, never a wall
 *
 * Arrival: the sky exists first; the camera drifts down from the
 * mountains to the Hearth while the wordmark fades over the ridges.
 * Coming back from a place: the camera looks at that place, the crafts
 * the run made fly into the purse, and the change is announced.
 */

import { WorldRenderer } from '../engine/canvas.js';
import { buildWorldScene } from '../engine/map.js';
import { particles } from '../engine/life.js';
import { sprite as wickSprite } from '../engine/sprites.js';
import { REGIONS, MAP_PLACES, QUARTER, regionBySlug, WORLD_W, WORLD_H } from '../regions.js';
import { loadWorld } from '../state.js';
import { EARN, CRAFTS, addBag } from '../economy.js';
import { purseHTML, chips as craftChips, wireCraftTaps } from '../craft-ui.js';
import { mountMenu } from '../menu.js';
import { loadValley, valleyName, homecoming } from '../companion.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { play, unlock, startMusic, startAmbience, musicEnabled, setMusicEnabled } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';

const ICON_SOUND_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M17.8 6.5a7.5 7.5 0 0 1 0 11"/></svg>`;
const ICON_SOUND_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`;
const ICON_GEAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h7M15 17h5"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="17" r="2"/></svg>`;

/** One line of what a place is, right now. Used on the map card. */
export function regionStat(slug, s) {
  switch (slug) {
    case 'rootwood': return `<b>${s.rootwood.metCount}</b> of ${s.rootwood.total} families · <b>${s.rootwood.grownCount}</b> grown`;
    case 'meadow': return `<b>${s.meadow.mastered}</b> of ${s.meadow.total} words in bloom${s.meadow.due ? ` · ${s.meadow.due} due` : ''}`;
    case 'pond': return `<b>${s.pond.mastered}</b> of ${s.pond.total} twins told apart · <b>${s.pond.koi}</b> koi`;
    case 'thicket': return `<b>${s.thicket.lanterns}</b> of ${s.thicket.languages} lanterns lit · ${s.thicket.mastered} words`;
    case 'reading-room': return `<b>${s.reading.stars}</b> of ${s.reading.maxStars} stars · ${s.reading.read} of ${s.reading.passages} passages`;
    case 'terraces': return `<b>${s.terraces.done}</b> of ${s.terraces.total} families climbed`;
    case 'loom': return `<b>${s.loom.solved}</b> of ${s.loom.total} jumbles solved`;
    case 'table': return `<b>${s.table.solved}</b> of ${s.table.total} summaries found`;
    case 'bench': return `<b>${s.bench.solved}</b> of ${s.bench.total} strangers spotted`;
    case 'hearth': return `<b>${s.hearth.title}</b> · ${s.works.filter((w) => w.built).length} works built${s.readyWorks.length ? ` · <b>${s.readyWorks.length} ready</b>` : ''}`;
    case 'wilds': return s.wilds.runs ? `<b>${s.wilds.runs}</b> Gauntlet runs · best ${s.wilds.bestScore}` : 'The Gauntlet: mixed and timed';
    default: return '';
  }
}

/**
 * The mark on a pin. Drawn, not typed: a system emoji in a hand-painted
 * valley is the one thing that makes the whole world look like a web page.
 * One weight, one language, sized to read at 14px.
 */
const M = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;
const PIN_MARK = {
  rootwood: M('<path d="M12 3.2 7 10h2.7l-4.2 5.6h3.4L6.2 20h11.6l-2.7-4.4h3.4L14.3 10H17Z"/><path d="M12 20v1.8"/>'),
  meadow: M('<circle cx="12" cy="11" r="2.4"/><path d="M12 8.6V5M12 13.4V17M9.6 11H6M14.4 11H18M10.3 9.3 8 7M13.7 9.3 16 7M10.3 12.7 8 15M13.7 12.7 16 15"/>'),
  pond: M('<path d="M3 13c2.5-2.4 5-2.4 7.5 0s5 2.4 7.5 0"/><path d="M3 18c2.5-2.4 5-2.4 7.5 0s5 2.4 7.5 0"/><path d="M17 4.5 21 8l-4 3.5Z"/>'),
  thicket: M('<path d="M9 4h6l-1 3h-4Z"/><rect x="8" y="7" width="8" height="8" rx="2"/><path d="M12 15v4"/>'),
  'reading-room': M('<path d="M7 4h10v16H7Z"/><path d="M10 8h4M10 12h4M10 16h4"/><path d="M5 20h14"/>'),
  terraces: M('<path d="M4 8h16M4 13h16M4 18h16"/><path d="M8 8V5M16 13v-5M11 18v-5"/>'),
  quarter: M('<path d="M4 11 8 7l4 4v9H4Z"/><path d="M13 13 17 9l4 4v7h-8Z"/><path d="M7 16h2"/>'),
  hearth: M('<path d="M4 11 12 4l8 7"/><path d="M6.5 9.8V20h11V9.8"/><path d="M10 20v-5h4v5"/>'),
  wilds: M('<path d="M3 19 9 8l4 6 2-3 7 8Z"/><path d="M9 8 7 5"/>'),
};

export async function renderWorld(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');
  outlet.innerHTML = `
    <section class="world" aria-label="The valley">
      <canvas class="world__canvas" id="world-canvas" tabindex="0" aria-label="The CAT OS valley. Drag to explore, tap a place to enter."></canvas>
      <div class="pins" id="pins" aria-hidden="true"></div>
      <div class="hud" id="hud"></div>
      <div class="world-notice" id="world-notice" role="status"></div>
      <div class="now" id="now" aria-label="What is worth doing now"></div>
      <div class="place-sheet" id="place-sheet"><div class="place-card" id="place-card" hidden></div></div>
      <div class="flyers" id="flyers" aria-hidden="true"></div>
    </section>`;

  const askedAt = performance.now();
  let world, valley;
  try {
    // One wait, not two: the valley's records and its name are fetched
    // together so a fast tap through the valley cannot land between them.
    [world, valley] = await Promise.all([
      loadWorld(storage),
      loadValley(storage).catch(() => ({ name: null })),
    ]);
  } catch (err) {
    if (!outlet.isConnected) return;
    outlet.innerHTML = `<section class="screen"><h1>The valley will not open</h1><div class="card"><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }
  const { state } = world;
  const placeName = valleyName(valley);
  // Navigated away while the valley was loading: the outlet has been
  // rewritten by another screen and there is nothing of ours left in it.
  const canvas = outlet.querySelector('#world-canvas');
  if (!canvas?.isConnected) return;

  const scene = buildWorldScene(state, state.atmo);
  const renderer = new WorldRenderer(canvas, scene, {
    worldW: WORLD_W, worldH: WORLD_H, fit: 'cover', minZoom: 0.42, maxZoom: 4,
    initialZoom: 1.0,
    onTap: (w) => onTap(w),
  });
  // The zoom at which the valley covers this particular screen. Everything
  // that says "settle here" uses it, so no arrival, return or tap ever
  // leaves a bar of sky at the top and dead grass at the bottom. Zooming
  // out by hand still works — that view is the map, and it is allowed to
  // show the country around the valley.
  const homeZoom = () => Math.max(renderer.fitZoom(), renderer.snap(1.0));

  /* ---- Arrival, or a return ---- */
  const focusSlug = sessionStorage.getItem('world:focus');
  const changedSlug = sessionStorage.getItem('world:changed');
  const changeLine = sessionStorage.getItem('world:change-line');
  const earnedRaw = sessionStorage.getItem('world:earned');
  const wickRaw = sessionStorage.getItem('world:wick');
  const unlockedRaw = sessionStorage.getItem('world:unlocked');
  for (const k of ['world:focus', 'world:changed', 'world:change-line', 'world:earned', 'world:unlocked', 'world:wick']) sessionStorage.removeItem(k);
  // A slow open must not also be a slow reveal: if the valley took a while
  // to load, everything arrives at once instead of in sequence.
  const slow = performance.now() - askedAt > 1100;
  const reduce = slow || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const enter = (sel, delay) => setTimeout(() => { for (const el of outlet.querySelectorAll(sel)) el.classList.add('is-in'); }, reduce ? 0 : delay);
  const hearthRegion = regionBySlug('hearth');
  const focus = focusSlug ? regionBySlug(focusSlug) : null;

  if (focus) {
    const home = homeZoom();
    if (changedSlug && !reduce) {
      // Something was built here. Come in on it: the valley from above, then
      // a slow fall onto the place that changed, then the sparks. A work is
      // the biggest thing that happens in this game and it gets a shot.
      renderer.cam.zoom = renderer.snap(Math.max(renderer.minZoom(), home * 0.62));
      renderer.lookAt(focus.anchor.x, focus.anchor.y - 90, { animate: false });
      setTimeout(() => renderer.lookAt(focus.anchor.x, focus.anchor.y - 24, { zoom: renderer.snap(home * 1.45), duration: 2200 }), 260);
      setTimeout(() => burst(focus.anchor.x, focus.anchor.y - 20), 1700);
      setTimeout(() => renderer.lookAt(focus.anchor.x, focus.anchor.y - 30, { zoom: home, duration: 1600 }), 3400);
    } else {
      renderer.cam.zoom = Math.max(renderer.cam.zoom, home);
      renderer.lookAt(focus.anchor.x, focus.anchor.y - 30, { animate: false });
      if (changedSlug) setTimeout(() => burst(focus.anchor.x, focus.anchor.y - 20), 400);
    }
    if (changeLine) setTimeout(() => notice(changeLine, 'place'), changedSlug && !reduce ? 2100 : 600);
  } else if (state.isNew && !reduce) {
    // The whole valley first — you must see what you are inheriting —
    // then the camera settles on the house you live in.
    renderer.cam.zoom = homeZoom();
    renderer.lookAt(WORLD_W / 2, 170, { animate: false });
    setTimeout(() => renderer.lookAt(hearthRegion.anchor.x, hearthRegion.anchor.y - 70, { zoom: homeZoom(), duration: 3400 }), 1100);
    outlet.querySelector('.world').insertAdjacentHTML('beforeend', `<div class="world__wordmark" aria-hidden="true">CAT OS<small>The valley</small></div><p class="world__hint">Drag to explore · tap a place to enter</p>`);
    enter('.world__wordmark', 200); setTimeout(() => outlet.querySelector('.world__wordmark')?.classList.add('is-out'), 3800);
    enter('.world__hint', 2600); setTimeout(() => outlet.querySelector('.world__hint')?.classList.add('is-out'), 9000);
  } else {
    renderer.cam.zoom = homeZoom();
    renderer.lookAt(hearthRegion.anchor.x, hearthRegion.anchor.y - 120, { animate: false });
    if (!reduce) setTimeout(() => renderer.lookAt(hearthRegion.anchor.x, hearthRegion.anchor.y - 70, { duration: 1400 }), 250);
  }
  renderer.start();
  // The first ResizeObserver pass can arrive after the camera was set, with
  // the canvas still unsized at construction time; re-assert the framing on
  // the next two frames so the opening shot is never a fit-zoom accident.
  if (!focus && !state.isNew) {
    const settle = () => { if (renderer.cam.zoom < homeZoom()) { renderer.cam.zoom = homeZoom(); renderer.clampCamera(); } };
    requestAnimationFrame(() => { settle(); requestAnimationFrame(settle); });
  }

  /* ---- Map pins: every place, named, so the valley reads at a glance ---- */
  const pinsEl = outlet.querySelector('#pins');
  const pinFor = new Map();
  pinsEl.innerHTML = MAP_PLACES.map((r) => {
    const slugs = r.members ?? [r.slug];
    const asking = slugs.includes(state.asking);
    const ready = state.readyWorks.some((w) => slugs.includes(w.region));
    return `<a class="pin ${asking ? 'is-asking' : ''} ${ready ? 'is-ready' : ''}" data-slug="${r.slug}" href="${r.route ?? '#/world'}" tabindex="-1">
      <span class="pin__dot" style="--pin:${r.color}">${PIN_MARK[r.slug] ?? ''}</span>
      <span class="pin__name">${escapeHTML(r.name.replace(/^The /, ''))}</span>
    </a>`;
  }).join('');
  pinsEl.setAttribute('aria-hidden', 'false');
  for (const el of pinsEl.querySelectorAll('.pin')) {
    pinFor.set(el.dataset.slug, el);
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const r = regionBySlug(el.dataset.slug);
      play('tap');
      renderer.lookAt(r.anchor.x, r.anchor.y - 20, { zoom: Math.max(renderer.cam.zoom, homeZoom()), duration: 600 });
      showCard(r);
    });
  }
  let pinRaf = 0;
  let pinKey = '';
  const placePins = () => {
    const z = renderer.cam.zoom;
    // Nine pins × (a transform write + an opacity write) every frame was
    // nine style recalcs per frame for a camera that had not moved. The
    // camera's own geometry is the only thing these positions depend on.
    const key = `${Math.round(renderer.cam.x)}|${Math.round(renderer.cam.y)}|${z.toFixed(3)}|${renderer.cssW}|${renderer.cssH}`;
    if (key === pinKey) { pinRaf = requestAnimationFrame(placePins); return; }
    pinKey = key;
    const tight = z < 0.5;
    for (const r of MAP_PLACES) {
      const el = pinFor.get(r.slug);
      if (!el) continue;
      const s = renderer.toScreen(r.anchor.x, r.anchor.y - (r.kind === 'learn' ? 34 : 26));
      // The valley is wider than a phone. A place that has gone off the
      // side is pinned to the rim instead of disappearing, small and
      // nameless — so the learner can always see that there is more
      // valley over there, and drag to it. (Their world y's are far
      // enough apart that the rim never becomes a stack.)
      const L = 22, R = renderer.cssW - 22, T = 64, B = renderer.cssH - 132;
      const off = s.x < L || s.x > R || s.y < T || s.y > B;
      const x = Math.max(L, Math.min(R, s.x));
      const y = Math.max(T, Math.min(B, s.y));
      const near = !off && (s.x < 70 || s.x > renderer.cssW - 70 || s.y < 110 || s.y > renderer.cssH - 150);
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
      el.style.opacity = off ? '0.62' : near ? '0.82' : '1';
      el.classList.toggle('is-tight', tight);
      el.classList.toggle('is-off', off);
    }
    pinRaf = requestAnimationFrame(placePins);
  };
  pinRaf = requestAnimationFrame(placePins);
  enter('.pin', state.isNew ? 4200 : 700);

  /* ---- HUD ---- */
  const hud = outlet.querySelector('#hud');
  const renderHud = () => {
    hud.innerHTML = `
      <a class="hud__card" href="#/world/place/hearth" aria-label="${escapeHTML(placeName)}: your standing and your works">
        <span class="hud__avatar" aria-hidden="true">${escapeHTML(placeName[0])}</span>
        <span><span class="hud__title">${escapeHTML(placeName)}</span><span class="hud__sub">★ ${state.stars}${state.builds.length ? ` · ${state.builds.length} built` : ''}${state.hearth.streak.current ? ` · ${state.hearth.streak.current}-day run` : ''}</span></span>
      </a>
      <div class="hud__stack">
        <a class="purse" href="#/world/place/hearth?works=1" id="purse" aria-label="Your crafts">${purseHTML(state.purse)}</a>
        <div class="hud__icons" id="hud-icons">
          <button class="hud__icon" id="hud-sound" aria-pressed="${musicEnabled()}" aria-label="Music and ambience">${musicEnabled() ? ICON_SOUND_ON : ICON_SOUND_OFF}</button>
        </div>
      </div>`;
    hud.querySelector('#hud-sound').addEventListener('click', async (e) => {
      const on = !musicEnabled();
      await setMusicEnabled(on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
      e.currentTarget.innerHTML = on ? ICON_SOUND_ON : ICON_SOUND_OFF;
      if (on) { startMusic('world', { hour: state.atmo.hour }); startAmbience('world', state.atmo); }
      play('tap');
    });
  };
  renderHud();
  mountMenu(hud.querySelector('#hud-icons'), { storage });
  wireCraftTaps(hud, () => state);
  enter('.hud__card', 300); enter('.purse', 420); enter('.hud__icons', 480);

  /* ---- What is worth doing now ---- */
  const nowEl = outlet.querySelector('#now');
  const renderNow = () => {
    const items = state.opportunities.slice(0, 3);
    if (!items.length) { nowEl.innerHTML = ''; return; }
    nowEl.innerHTML = `
      <div class="now__rail">
        ${items.map((o) => `
          <a class="op op--${o.kind}" href="${o.href}" data-slug="${o.region}">
            <span class="op__badge">${escapeHTML(o.badge ?? '')}</span>
            <span class="op__title">${escapeHTML(o.title)}</span>
            <span class="op__line">${escapeHTML(o.line)}</span>
            <span class="op__where">${escapeHTML(regionBySlug(o.region)?.name ?? '')}</span>
          </a>`).join('')}
      </div>`;
    for (const el of nowEl.querySelectorAll('.op')) {
      el.addEventListener('pointerenter', () => { const r = regionBySlug(el.dataset.slug); if (r) renderer.lookAt(r.anchor.x, r.anchor.y - 20, { duration: 700 }); });
      el.addEventListener('click', () => { sessionStorage.setItem('world:focus', el.dataset.slug); play('open'); });
    }
    // Fade them in on the nodes themselves: a selector-based timer can
    // miss elements that were re-rendered while it was waiting.
    const cards = [...nowEl.querySelectorAll('.op')];
    const delay = state.isNew ? 4600 : 900;
    cards.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), reduce ? 0 : delay + i * 90));
  };
  renderNow();

  /* ---- The day's asks pay out once, when the valley sees them ---- */
  (async () => {
    const fresh = state.quests.filter((q) => q.complete && !q.claimed);
    if (!fresh.length) return;
    let paid = { amber: 0, ink: 0, thread: 0, ember: 0 };
    for (const q of fresh) {
      const pay = EARN.ask();
      try {
        await storage.put(STORES.LEARNING, { id: q.key, kind: 'world-quest', module: 'world', quest_id: q.id, date: state.today, paid: pay, claimed_at: new Date().toISOString() });
        q.claimed = true;
        paid = addBag(paid, pay);
        state.purse = addBag(state.purse, pay);
      } catch { /* non-fatal */ }
    }
    renderHud(); enter('.hud__card', 20); enter('.purse', 20); enter('.hud__icons', 20);
    setTimeout(() => notice(`${fresh.length === 1 ? 'An ask is done' : `${fresh.length} asks are done`} · ${craftChips(paid, { sign: '+' })}`, 'quest'), changeLine ? 2800 : 1000);
  })();

  /* ---- Wick, in the corner, saying one thing ---- */
  let wickTimer = 0;
  function wickSays(line) {
    // Wick speaks on a timer; by the time it fires the learner may already
    // be somewhere else, and the valley he was going to speak over is gone.
    const host = outlet.querySelector('.world');
    if (!host) return;
    let el = outlet.querySelector('#world-wick');
    if (!el) {
      el = document.createElement('div');
      el.className = 'wickline';
      el.id = 'world-wick';
      el.innerHTML = `<canvas class="wickline__face" width="42" height="36" aria-hidden="true"></canvas><p></p>`;
      host.appendChild(el);
      const cv = el.querySelector('canvas');
      const cx = cv.getContext('2d');
      cx.imageSmoothingEnabled = false;
      const sp = wickSprite('wick', { pose: 'look', lamp: false, lit: true });
      cx.drawImage(sp.canvas, 8, 0, 14, 13, 2, 2, 14 * 2.4, 13 * 2.4);
      el.addEventListener('click', () => el.classList.remove('is-in'));
    }
    el.querySelector('p').textContent = line;
    requestAnimationFrame(() => el.classList.add('is-in'));
    clearTimeout(wickTimer);
    wickTimer = setTimeout(() => el.classList.remove('is-in'), 7000);
  }

  /* ---- Notices ---- */
  const noticeEl = outlet.querySelector('#world-notice');
  let noticeTimer = 0;
  function notice(html, sound) {
    noticeEl.innerHTML = html;
    noticeEl.classList.add('is-shown');
    if (sound === 'quest') play('quest'); else if (sound === 'place') play('ink'); else if (sound === 'unlock') play('unlock');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => noticeEl.classList.remove('is-shown'), 3800);
  }

  /* ---- The crafts a run made, flying into the purse ---- */
  if (earnedRaw) {
    try {
      const bag = JSON.parse(earnedRaw);
      const flyers = outlet.querySelector('#flyers');
      const target = outlet.querySelector('#purse');
      setTimeout(() => {
        if (!target?.isConnected) return;
        const box = target.getBoundingClientRect();
        let i = 0;
        for (const c of CRAFTS) {
          const n = bag[c.key] ?? 0;
          if (!n) continue;
          for (let k = 0; k < Math.min(5, Math.max(1, Math.round(n / 12))); k += 1) {
            const dot = document.createElement('i');
            dot.className = `flyer craft--${c.key}`;
            dot.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 90}px`;
            dot.style.top = `${window.innerHeight * 0.55 + (Math.random() - 0.5) * 60}px`;
            dot.style.setProperty('--tx', `${box.left + box.width / 2 - window.innerWidth / 2}px`);
            dot.style.setProperty('--ty', `${box.top + box.height / 2 - window.innerHeight * 0.55}px`);
            dot.style.animationDelay = `${i * 60 + k * 40}ms`;
            flyers.appendChild(dot);
            setTimeout(() => dot.remove(), 1600 + i * 60);
          }
          i += 1;
        }
        target.classList.add('is-hit');
        setTimeout(() => target.classList.remove('is-hit'), 900);
      }, reduce ? 0 : 900);
    } catch { /* the numbers are already right */ }
  }

  /* ---- Coming home: Wick says the one useful thing ---- */
  if (wickRaw) setTimeout(() => wickSays(wickRaw), reduce ? 400 : 2000);
  else if (!focus) {
    const line = homecoming(state, { awayDays: state.awayDays, name: placeName });
    if (line) setTimeout(() => wickSays(line), reduce ? 300 : 1700);
  }

  /* ---- Something new can be built: the loudest thing the world says ---- */
  if (unlockedRaw) {
    try {
      const list = JSON.parse(unlockedRaw);
      if (list.length) setTimeout(() => notice(`<b>${escapeHTML(list[0].name)}</b> can be built. <a href="#/world/place/hearth?works=1">The Workshop →</a>`, 'unlock'), reduce ? 400 : 3000);
    } catch { /* silent */ }
  }

  /* ---- Sparks over a place that changed ---- */
  function burst(x, y) {
    const sys = particles({ kind: 'sparkle', rect: { x: x - 22, y: y - 26, w: 44, h: 36 }, count: 26, seed: `burst${Date.now()}` });
    const prevObjects = scene.objects.bind(scene);
    let alive = true;
    scene.objects = (view, t) => { const o = prevObjects(view, t); if (alive) o.push({ x: 0, y: 400000, draw: (ctx) => sys.draw(ctx, t) }); return o; };
    play('place');
    setTimeout(() => { alive = false; }, 2600);
  }

  /* ---- Place cards ---- */
  const card = outlet.querySelector('#place-card');
  let shown = null;
  function showCard(region) {
    shown = region.slug;
    if (region.members) { showQuarterCard(region); return; }
    const stat = regionStat(region.slug, state);
    const ready = state.readyWorks.filter((w) => w.region === region.slug);
    card.hidden = false;
    card.innerHTML = `
      <button class="place-card__close" id="place-close" aria-label="Close">×</button>
      <p class="place-card__eyebrow">${escapeHTML(region.skill ?? (region.kind === 'home' ? 'Home' : 'Challenge'))}</p>
      <h2 class="place-card__name">${escapeHTML(region.name)}</h2>
      <p class="place-card__line">${escapeHTML(region.line)}</p>
      <div class="place-card__row"><div class="place-card__stat">${stat}</div></div>
      ${ready.length ? `<p class="place-card__ready">◆ ${escapeHTML(ready[0].name)} can be built here</p>` : ''}
      <a class="g-cta" href="${region.route}" style="margin-top:12px" id="place-enter">${escapeHTML(region.verb)}<span class="arrow" aria-hidden="true">→</span></a>`;
    requestAnimationFrame(() => card.classList.add('is-shown'));
    nowEl.classList.add('is-hidden');
    card.querySelector('#place-close').addEventListener('click', hideCard);
    card.querySelector('#place-enter').addEventListener('click', () => { sessionStorage.setItem('world:focus', region.slug); play('open'); });
    scene.focus = region.slug;
  }
  /** The Quarter: one yard, three benches. The card is the chooser, so
   *  the map keeps one pin and the learner still gets three doors. */
  function showQuarterCard(region) {
    const rooms = region.members.map((m) => regionBySlug(m)).filter(Boolean);
    card.hidden = false;
    card.innerHTML = `
      <button class="place-card__close" id="place-close" aria-label="Close">×</button>
      <p class="place-card__eyebrow">${escapeHTML(region.skill)}</p>
      <h2 class="place-card__name">${escapeHTML(region.name)}</h2>
      <p class="place-card__line">${escapeHTML(region.line)}</p>
      <div class="quarter__rooms">
        ${rooms.map((r) => `
          <a class="quarter__room" href="${r.route}" data-slug="${r.slug}">
            <b>${escapeHTML(r.name.replace(/^The /, ''))}</b>
            <small>${escapeHTML(r.skill ?? '')}</small>
            <span>${regionStat(r.slug, state)}</span>
          </a>`).join('')}
      </div>`;
    requestAnimationFrame(() => card.classList.add('is-shown'));
    nowEl.classList.add('is-hidden');
    card.querySelector('#place-close').addEventListener('click', hideCard);
    for (const a of card.querySelectorAll('.quarter__room')) {
      a.addEventListener('click', () => { sessionStorage.setItem('world:focus', a.dataset.slug); play('open'); });
    }
    scene.focus = region.slug;
  }

  function hideCard() {
    shown = null;
    card.classList.remove('is-shown');
    nowEl.classList.remove('is-hidden');
    scene.focus = null;
    setTimeout(() => { if (!shown) card.hidden = true; }, 300);
  }
  function onTap(w) {
    const region = scene.hit(w.x, w.y);
    if (!region) { if (shown) { hideCard(); play('close'); } return; }
    play('tap');
    renderer.lookAt(region.anchor.x, region.anchor.y - 20, { duration: 600 });
    showCard(region);
  }

  /* ---- Sound ---- */
  const warmth = Math.min(1, (state.builds.length / 12) * 0.6 + Math.min(1, state.stars / 90) * 0.4);
  const onDown = () => { unlock(); startMusic('world', { hour: state.atmo.hour, warmth }); startAmbience('world', state.atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true });
  startMusic('world', { hour: state.atmo.hour, warmth }); startAmbience('world', state.atmo);

  /* ---- Leave: stop the loop, release listeners ---- */
  const onHash = () => {
    renderer.destroy();
    cancelAnimationFrame(pinRaf);
    window.removeEventListener('pointerdown', onDown, { capture: true });
    window.removeEventListener('hashchange', onHash);
  };
  window.addEventListener('hashchange', onHash);
}

export { REGIONS };
