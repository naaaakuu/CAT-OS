/**
 * biome.js (screen) — one biome of the valley, entered from the Overlook
 * (LANGUAGE_GARDEN_BIBLE §16.2). Today only the Rootwood is living, but
 * this screen is written against the biome seam (logic/biomes.js), so it
 * renders "the biome for this slug" rather than "the grove": the day a
 * second biome becomes living, this file does not change.
 *
 * One screen, no scrolling (§4.1). Plant states are readable without
 * reading — the scene IS the status display, no dashboard, no counts, no
 * stage words (§16.3). At most one plant is lit (§17.2). The learner
 * ascends to the valley by the one quiet mark, or by tapping the sky.
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions, listGardenSeeds } from '../logic/store.js';
import { deriveBiomeScene } from '../logic/scene.js';
import { biomeBySlug } from '../logic/biomes.js';
import { pickAmbientEvent, hasNest } from '../logic/ambient.js';
import { computeGroundTier } from '../logic/effort.js';
import { atmosphereFor } from '../logic/atmosphere.js';
import { weatherLayerHTML } from './atmosphere-art.js';
import { EMPTY_DAY_LINES, VALLEY_LINES, pick } from '../../../core/mentor/garden-voice.js';
import { escapeHTML } from '../../../core/utils/format.js';
import '../../../ui/components/cat-plant.js';

export async function renderBiome(outlet, context, params) {
  const biome = biomeBySlug(params.biome);
  if (!biome || biome.status !== 'living') {
    // A wild region has no interior yet — the honest thing is to send the
    // learner back to the valley, never a "coming soon" screen (§5.8).
    location.hash = '#/garden';
    return;
  }

  outlet.innerHTML = `
    <section class="screen biome-loading">
      <div class="skeleton" style="height: 62vh; border-radius: var(--radius-xl)"></div>
    </section>
  `;

  let families, sessions, seeds;
  try {
    const registry = await listLGItems();
    const loaded = await loadLGItems(registry.map((i) => i.id));
    families = registry.map((i) => loaded.get(i.id)).filter(Boolean);
    sessions = await listGardenSessions(context.storage);
    seeds = await listGardenSeeds(context.storage);
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>${escapeHTML(biome.name)} will not open</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted"><a href="#/garden">Back to the valley</a></p></div></section>`;
    return;
  }

  const scene = deriveBiomeScene(families, sessions, biome.slug, Date.now(), seeds);
  const ground = computeGroundTier(sessions);
  renderSceneHTML(outlet, biome, scene, ground);
}

function renderSceneHTML(outlet, biome, scene, ground) {
  const { plants, askingId, openSeedId } = scene;
  const atmo = atmosphereFor();
  const sessionSeed = `biome:${biome.slug}:${new Date().toDateString()}`;
  const bloomingCount = plants.filter((p) => p.state.stage === 'mature' || p.state.stage === 'ancient').length;
  const ancientCount = plants.filter((p) => p.state.stage === 'ancient').length;
  const event = pickAmbientEvent({ bloomingCount, ancientCount, groundTier: ground.tier });

  const foreground = plants.filter((p) => p.state.stage !== 'ancient');
  const horizon = plants.filter((p) => p.state.stage === 'ancient');

  outlet.innerHTML = `
    <section class="screen biome biome--enter">
      <button class="biome__ascend" id="biome-ascend" aria-label="${escapeHTML(VALLEY_LINES.toValley)}">
        <span aria-hidden="true">↑</span> ${escapeHTML(VALLEY_LINES.toValley)}
      </button>

      <div class="grove-scene" data-time="${atmo.time}" data-season="${atmo.season}" data-weather="${atmo.weather}">
        <button class="grove-sky" id="biome-sky" aria-label="${escapeHTML(VALLEY_LINES.toValley)}" tabindex="-1"></button>
        ${weatherLayerHTML(atmo.weather)}
        <div class="grove-ground grove-ground--${ground.tier}" aria-hidden="true">${groundMarkup(ground.tier)}</div>
        ${horizon.length ? `<div class="grove-horizon" aria-hidden="true">
          ${horizon.map(() => `<cat-plant size="horizon" stage="ancient"></cat-plant>`).join('')}
        </div>` : ''}
        <div class="grove-ambient" aria-hidden="true">${event ? ambientMarkup(event) : ''}</div>
        <div class="grove-grid">
          ${foreground.map((p) => plantSlotHTML(p, askingId, openSeedId)).join('')}
        </div>
      </div>
    </section>
  `;

  if (!askingId && !openSeedId) {
    appendNote(outlet, pick(sessionSeed, EMPTY_DAY_LINES.standAndClose));
  } else if (openSeedId && !askingId) {
    appendNote(outlet, pick(sessionSeed, EMPTY_DAY_LINES.oneSeedReady));
  }

  const ascend = () => { location.hash = '#/garden'; };
  outlet.querySelector('#biome-ascend').addEventListener('click', ascend);
  outlet.querySelector('#biome-sky').addEventListener('click', ascend);

  // Tap opens a plant; a long press PEEKS at it — its key and members, without
  // entering — and it is gone the moment you release (Bible §14.2). Peek is an
  // enhancement, never required (Principle 110): a plain tap still shows all.
  const plantsById = new Map(plants.map((p) => [p.family.meta.id, p]));
  for (const el of outlet.querySelectorAll('[data-plant-id]')) {
    wirePlant(el, plantsById.get(el.dataset.plantId));
  }
}

function wirePlant(el, plant) {
  let timer = null;
  let peeked = false;
  const start = () => {
    peeked = false;
    timer = setTimeout(() => { peeked = true; showPeek(el, plant); }, 450);
  };
  const end = () => { clearTimeout(timer); hidePeek(el); };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointerleave', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', (e) => {
    if (peeked) { e.preventDefault(); e.stopImmediatePropagation(); peeked = false; return; }
    location.hash = `#/garden/plant/${plant.family.meta.id}`;
  });
}

function showPeek(el, plant) {
  if (!plant || el.querySelector('.grove-peek')) return;
  const known = plant.state.stage !== 'open_ground' && plant.state.stage !== 'seed';
  const root = plant.family.root;
  const key = known
    ? `${root.label}. ${root.origin_language}. ${root.core_meaning[0].toUpperCase()}${root.core_meaning.slice(1)}.`
    : root.label;
  const words = known ? plant.family.members.filter((m) => !m.held_out).map((m) => m.word) : [];
  const peek = document.createElement('div');
  peek.className = 'grove-peek';
  peek.setAttribute('aria-hidden', 'true');
  peek.innerHTML = `
    <p class="grove-peek__key">${escapeHTML(key)}</p>
    ${words.length ? `<p class="grove-peek__words">${words.map(escapeHTML).join(' · ')}</p>` : ''}
  `;
  el.appendChild(peek);
}

function hidePeek(el) {
  el.querySelector('.grove-peek')?.remove();
}

function appendNote(outlet, text) {
  const note = document.createElement('p');
  note.className = 'grove-note';
  note.textContent = text;
  outlet.querySelector('.biome').appendChild(note);
}

function plantSlotHTML(p, askingId, openSeedId) {
  const id = p.family.meta.id;
  const isAsking = id === askingId;
  const isOpenSeed = id === openSeedId;
  const nest = hasNest(p.state);
  // The accessible name conveys the plant's NAME and, where it matters, its
  // invitation — never its growth stage (§16.3). Sighted learners read the
  // stage from the plant's form; screen-reader learners hear what to do.
  const aria = isAsking
    ? `${p.family.root.label}, ready to tend`
    : isOpenSeed
      ? `${p.family.root.label}, open ground`
      : p.family.root.label;
  return `
    <button class="grove-plant ${isAsking ? 'grove-plant--asking' : ''} ${isOpenSeed ? 'grove-plant--invite' : ''}"
            data-plant-id="${id}" aria-label="${escapeHTML(aria)}">
      <span class="grove-plant__art">
        <cat-plant stage="${p.state.stage}" due="${p.state.due}" ${nest ? 'nest' : ''}></cat-plant>
      </span>
      <span class="grove-plant__label">${escapeHTML(p.family.root.label)}</span>
    </button>
  `;
}

/** The Ground (§4.3, Roadmap 3.2): a fixed, never-random set of positions
 *  so the floor looks the same on every visit, and MARK_COUNT_BY_TIER just
 *  reveals more of the same list as lifetime effort accumulates — nothing
 *  ever rearranges, it only thickens. Positions are percentages of the
 *  scene, kept low and to the sides so they never sit under a plant. */
const GROUND_MARKS = [
  { x: 8, y: 88, kind: 'moss' },
  { x: 91, y: 85, kind: 'moss' },
  { x: 18, y: 94, kind: 'wildflower' },
  { x: 80, y: 92, kind: 'wildflower' },
  { x: 4, y: 78, kind: 'fern' },
  { x: 95, y: 76, kind: 'fern' },
  { x: 30, y: 96, kind: 'wildflower' },
  { x: 66, y: 95, kind: 'moss' },
];
const MARK_COUNT_BY_TIER = { bare: 0, tended: 2, growing: 4, flourishing: 6, lush: 8 };

function groundMarkup(tier) {
  const n = MARK_COUNT_BY_TIER[tier] ?? 0;
  return GROUND_MARKS.slice(0, n)
    .map((m) => `<span class="grove-mark grove-mark--${m.kind}" style="left:${m.x}%; top:${m.y}%"></span>`)
    .join('');
}

function ambientMarkup(event) {
  switch (event) {
    case 'bird': return '<span class="grove-visitor grove-visitor--bird" aria-hidden="true">◜</span>';
    case 'butterfly': return '<span class="grove-visitor grove-visitor--butterfly" aria-hidden="true">❋</span>';
    case 'firefly': return '<span class="grove-visitor grove-visitor--firefly" aria-hidden="true">•</span>';
    case 'petal': return '<span class="grove-visitor grove-visitor--petal" aria-hidden="true">❁</span>';
    case 'leaf-stir': return '<span class="grove-visitor grove-visitor--leaf-stir" aria-hidden="true">⁘</span>';
    default: return '';
  }
}
