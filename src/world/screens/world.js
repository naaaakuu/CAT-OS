/**
 * world.js (screen) — the home: the whole valley as a living pixel-art
 * world you drag, zoom and touch. A HUD floats over it (who you are, your
 * Ink and stars, sound), three quests sit at the bottom, and touching a
 * place lifts a card with its name, what is learned there, how far it has
 * grown, and one way in.
 *
 * Arrival: the sky exists first; the camera drifts down from the
 * mountains to the Hearth while the wordmark fades over the ridges.
 * Coming back from a place: the camera looks at that place, and if the
 * world changed there, the change is shown — sparks over the spot, a
 * notice, the music resuming.
 */

import { WorldRenderer } from '../engine/canvas.js';
import { buildWorldScene } from '../engine/map.js';
import { particles } from '../engine/life.js';
import { REGIONS, regionBySlug, WORLD_W, WORLD_H } from '../regions.js';
import { loadWorld } from '../state.js';
import { INK } from '../economy.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { play, unlock, startMusic, startAmbience, musicEnabled, setMusicEnabled } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';

const ICON_SOUND_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M17.8 6.5a7.5 7.5 0 0 1 0 11"/></svg>`;
const ICON_SOUND_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`;
const ICON_GEAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7.5H20M4 12H20M4 16.5H20"/><circle cx="9.5" cy="7.5" r="2" fill="var(--g-paper)"/><circle cx="14.5" cy="12" r="2" fill="var(--g-paper)"/><circle cx="8" cy="16.5" r="2" fill="var(--g-paper)"/></svg>`;

/** Region progress in one short phrase, for the place card. */
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
    case 'hearth': return `<b>${s.hearth.title}</b> · level ${s.hearth.level_xp.level} · ${s.quests.filter((q) => q.complete).length} of 3 quests today`;
    case 'wilds': return `The weekly Gauntlet · your best is kept here`;
    default: return '';
  }
}

export async function renderWorld(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');
  outlet.innerHTML = `
    <section class="world" aria-label="The valley">
      <canvas class="world__canvas" id="world-canvas" tabindex="0" aria-label="The CAT OS valley. Drag to explore, tap a place to enter."></canvas>
      <div class="hud" id="hud"></div>
      <div class="world-notice" id="world-notice" role="status"></div>
      <div class="quests" id="quests" aria-label="Today's quests"></div>
      <div class="place-sheet" id="place-sheet"><div class="place-card" id="place-card" hidden></div></div>
    </section>`;

  let world;
  try {
    world = await loadWorld(storage);
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>The valley will not open</h1><div class="card"><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }
  const { state } = world;
  const canvas = outlet.querySelector('#world-canvas');
  if (!canvas.isConnected) return; // navigated away while loading

  const scene = buildWorldScene(state, state.atmo);
  const renderer = new WorldRenderer(canvas, scene, {
    worldW: WORLD_W, worldH: WORLD_H, fit: 'width', minZoom: 0.5, maxZoom: 4,
    onTap: (w) => onTap(w),
  });

  /* ---- Arrival, or a return ---- */
  const focusSlug = sessionStorage.getItem('world:focus');
  const changedSlug = sessionStorage.getItem('world:changed');
  const changeLine = sessionStorage.getItem('world:change-line');
  sessionStorage.removeItem('world:focus'); sessionStorage.removeItem('world:changed'); sessionStorage.removeItem('world:change-line');
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const enter = (sel, delay) => setTimeout(() => { for (const el of outlet.querySelectorAll(sel)) el.classList.add('is-in'); }, delay);
  const hearth = regionBySlug('hearth');
  const focus = focusSlug ? regionBySlug(focusSlug) : null;
  if (focus) {
    renderer.lookAt(focus.anchor.x, focus.anchor.y - 30, { animate: false });
    if (changedSlug) setTimeout(() => burst(focus.anchor.x, focus.anchor.y - 20), 400);
    if (changeLine) setTimeout(() => notice(changeLine, 'place'), 600);
  } else if (state.isNew && !reduce) {
    renderer.lookAt(WORLD_W / 2, 120, { animate: false });
    setTimeout(() => renderer.lookAt(hearth.anchor.x, hearth.anchor.y - 60, { duration: 3200 }), 900);
    outlet.querySelector('.world').insertAdjacentHTML('beforeend', `<div class="world__wordmark" aria-hidden="true">CAT OS<small>The valley</small></div><p class="world__hint">Drag to explore · tap a place to enter</p>`);
    enter('.world__wordmark', 200); setTimeout(() => outlet.querySelector('.world__wordmark')?.classList.add('is-out'), 3600);
    enter('.world__hint', 2400); setTimeout(() => outlet.querySelector('.world__hint')?.classList.add('is-out'), 8000);
  } else {
    renderer.lookAt(hearth.anchor.x, hearth.anchor.y - 70, { animate: false });
    if (!reduce) { renderer.cam.zoom *= 0.92; renderer.lookAt(hearth.anchor.x, hearth.anchor.y - 70, { zoom: renderer.cam.zoom / 0.92, duration: 900 }); }
  }
  renderer.start();

  /* ---- HUD ---- */
  const hud = outlet.querySelector('#hud');
  const renderHud = () => {
    hud.innerHTML = `
      <a class="hud__card" href="#/world/place/hearth" aria-label="The Hearth: your profile">
        <span class="hud__avatar" aria-hidden="true">${escapeHTML(state.hearth.title[0])}</span>
        <span><span class="hud__title">${escapeHTML(state.hearth.title)}</span><span class="hud__sub">Level ${state.hearth.level_xp.level}${state.hearth.streak.current ? ` · ${state.hearth.streak.current}-day run` : ''}</span></span>
      </a>
      <div class="hud__stack">
        <div style="display:flex;gap:8px">
          <a class="hud__pill" href="#/world/place/hearth" title="Ink — earned by practice, spent on the world"><span class="ink" aria-hidden="true"></span>${state.ink.balance}</a>
          <a class="hud__pill" href="#/world/place/hearth" title="Stars — your best performances"><span class="star" aria-hidden="true">★</span>${state.stars}</a>
        </div>
        <div style="display:flex;gap:8px">
          <button class="hud__icon" id="hud-sound" aria-pressed="${musicEnabled()}" aria-label="Music and ambience" data-sfx="off">${musicEnabled() ? ICON_SOUND_ON : ICON_SOUND_OFF}</button>
          <a class="hud__icon" href="#/settings" aria-label="Settings">${ICON_GEAR}</a>
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
  enter('.hud__card', 300);

  /* ---- Quests ---- */
  const questsEl = outlet.querySelector('#quests');
  const renderQuests = () => {
    questsEl.innerHTML = state.quests.map((q) => `
      <a class="quest ${q.complete ? 'is-done' : ''}" href="${regionBySlug(q.region)?.route ?? '#/world'}" aria-label="${escapeHTML(q.title)}: ${q.done} of ${q.goal}">
        <p class="quest__title"><span class="tick" aria-hidden="true">${q.complete ? '✓' : ''}</span>${escapeHTML(q.title)}</p>
        <div class="quest__bar"><i style="width:${Math.round((q.done / q.goal) * 100)}%"></i></div>
        <div class="quest__meta"><span>${escapeHTML(regionBySlug(q.region)?.name ?? '')}</span><span>${q.done}/${q.goal}</span></div>
      </a>`).join('');
    enter('.quest', 500);
  };
  renderQuests();

  /* ---- Quest claims: a completed quest pays its Ink once, when the world sees it ---- */
  (async () => {
    const fresh = state.quests.filter((q) => q.complete && !q.claimed);
    for (const q of fresh) {
      try {
        await storage.put(STORES.LEARNING, { id: q.key, kind: 'world-quest', module: 'world', quest_id: q.id, date: state.today, ink: INK.quest, claimed_at: new Date().toISOString() });
        q.claimed = true;
        state.ink.balance += INK.quest; state.ink.earned += INK.quest;
      } catch { /* non-fatal */ }
    }
    if (fresh.length) {
      renderHud(); enter('.hud__card', 50);
      setTimeout(() => { notice(`Quest complete · +${INK.quest * fresh.length} Ink`, 'quest'); }, changeLine ? 2600 : 900);
    }
  })();

  /* ---- Notices ---- */
  const noticeEl = outlet.querySelector('#world-notice');
  let noticeTimer = 0;
  function notice(html, sound) {
    noticeEl.innerHTML = html;
    noticeEl.classList.add('is-shown');
    if (sound === 'quest') play('quest'); else if (sound === 'place') play('ink');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => noticeEl.classList.remove('is-shown'), 3400);
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
    const stat = regionStat(region.slug, state);
    card.hidden = false;
    card.innerHTML = `
      <button class="place-card__close" id="place-close" aria-label="Close">×</button>
      <p class="place-card__eyebrow">${escapeHTML(region.skill ?? (region.kind === 'home' ? 'Home' : 'Challenge'))}</p>
      <h2 class="place-card__name">${escapeHTML(region.name)}</h2>
      <p class="place-card__line">${escapeHTML(region.line)}</p>
      <div class="place-card__row">
        <div class="place-card__stat">${stat}</div>
      </div>
      <a class="g-cta" href="${region.route}" style="margin-top:12px" id="place-enter">${escapeHTML(region.verb)}<span class="arrow" aria-hidden="true">→</span></a>`;
    requestAnimationFrame(() => card.classList.add('is-shown'));
    questsEl.classList.add('is-hidden');
    card.querySelector('#place-close').addEventListener('click', hideCard);
    card.querySelector('#place-enter').addEventListener('click', () => { sessionStorage.setItem('world:focus', region.slug); play('open'); });
    scene.focus = region.slug;
  }
  function hideCard() {
    shown = null;
    card.classList.remove('is-shown');
    questsEl.classList.remove('is-hidden');
    setTimeout(() => { if (!shown) card.hidden = true; }, 300);
  }
  function onTap(w) {
    const region = scene.hit(w.x, w.y);
    if (!region) { if (shown) { hideCard(); play('close'); } return; }
    play('tap');
    renderer.lookAt(region.anchor.x, region.anchor.y - 20, { duration: 600 });
    showCard(region);
  }
  // A brand-new learner is shown where to begin; a returning one whose
  // place is asking gets that card lifted for them.
  if (state.isNew) setTimeout(() => showCard(regionBySlug('rootwood')), reduce ? 300 : 4300);
  else if (!focus && state.asking) setTimeout(() => showCard(regionBySlug(state.asking)), 1300);

  /* ---- Sound ---- */
  const onDown = () => { unlock(); startMusic('world', { hour: state.atmo.hour }); startAmbience('world', state.atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true });
  startMusic('world', { hour: state.atmo.hour }); startAmbience('world', state.atmo);

  /* ---- Leave: stop the loop, release listeners ---- */
  const onHash = () => {
    renderer.destroy();
    window.removeEventListener('pointerdown', onDown, { capture: true });
    window.removeEventListener('hashchange', onHash);
  };
  window.addEventListener('hashchange', onHash);
}

export { REGIONS };
