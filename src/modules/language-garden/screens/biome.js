/**
 * biome.js (screen) — one biome of the valley, entered from the Overlook
 * (LANGUAGE_GARDEN_BIBLE §16.2). Today only the Rootwood is living, but
 * this screen is written against the biome seam (logic/biomes.js): it
 * renders "the biome for this slug" rather than "the grove."
 *
 * 0.17.0 — THE ROOTWOOD WALK (LANGUAGE GARDEN — THE WORLD.md Part 16).
 * The 0.16.0 cathedral was one frame holding seven plants; every other
 * family the learner had grown receded into anonymous canopy, and every
 * family they had not yet met was invisible. With fifty-one families in
 * the content system that was a wood that hid the learner's own work.
 * Part 16 replaces the working set with a WALK: the wood is wider than
 * the frame, entered at its mouth, and crossed by hand — swipe to walk —
 * and **every family stands in it**, in a fixed stand, in one of six
 * named groves (logic/groves.js), forever. An unmet root is a root-stone
 * half-sunk in moss (open ground with a name on approach, never a
 * padlock); a family grows in its own stand from sprout to Ancient; a
 * grove whose every family is at least Mature carries a garland on its
 * sign. The wood is the collection — the only one this product has.
 *
 * The cathedral's enclosure is kept whole (Part 10.2): the canopy ceiling
 * closes the top of the frame and stays overhead as you walk; the far
 * wood and the old growth behind the stands drift at their own slower
 * speeds (aerial perspective made into motion); the great trunks stand
 * as doorposts between the groves, on the floor itself, so they can
 * never cover a plant the camera has come to. Light shafts fall between
 * them at the hour's own angle, and pools of light lie where they land.
 * At most one plant is lit (§17.2); the walk opens on it when it exists,
 * else on the family tended last.
 *
 * Plant names are wordless until approach — focus, peek, or the plant
 * screen (Part 8.4) — but a grove is a PLACE, and places have names: a
 * small signpost stands at each grove's mouth, and a quiet title card
 * names the grove you have walked into, then fades (Part 16.4).
 *
 * The same drawing serves a session and a plant approach (Stage W4): the
 * becalmed backdrop is this walk, its camera held on the tended family's
 * own stand, so the wood a learner grows a tree in is never a second,
 * different drawing of the same place.
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions, listGardenSeeds, recordDiscoveries } from '../logic/store.js';
import { visibleDiscoveries } from '../logic/discoveries.js';
import { deriveBiomeScene } from '../logic/scene.js';
import { biomeBySlug } from '../logic/biomes.js';
import { layoutWood, groveAt, GROVE_WIDTH, WOOD_ENTRANCE, WOOD_END } from '../logic/groves.js';
import { pickAmbientEvent, hasNest } from '../logic/ambient.js';
import { computeGroundTier } from '../logic/effort.js';
import { atmosphereFor } from '../logic/atmosphere.js';
import { weatherLayerHTML } from './atmosphere-art.js';
import { revealedProps, revealedStories } from '../logic/props.js';
import { inSceneRootwoodPropsSVG } from './prop-art.js';
import { faunaSVG, faunaInlineSVG } from './fauna-art.js';
import {
  litFace, shadeFace, shadowColor, SUN_OFFSET_SIGN,
  contactShadow, castShadow, castsShadow,
} from '../logic/light.js';
import { playGardenSound } from '../logic/audio.js';
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

  // No skeleton, ever (Visual Guide 24.1): the data is local and fast, and
  // the scene's own descent animation is the arrival. Until it lands the
  // learner sees calm paper, never a loading state.
  outlet.innerHTML = '';

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
  const shown = renderWalk(outlet, biome, scene, ground);

  // Discoveries (Bible §9, 0.16.0): what the wood just showed is now seen —
  // recorded after the paint, never awaited by it, never announced.
  recordDiscoveries(context.storage, visibleDiscoveries({
    scene: 'rootwood',
    time: shown.atmo.time, season: shown.atmo.season, weather: shown.atmo.weather,
    ambient: shown.event,
    hasLandmark: scene.plants.some((p) => p.state.landmark),
    stages: new Set(scene.plants.map((p) => p.state.stage)),
    dues: new Set(scene.plants.map((p) => p.state.due)),
    tierRank: ['bare', 'tended', 'growing', 'flourishing', 'lush'].indexOf(ground.tier),
    props: new Set(revealedProps({ tier: ground.tier, scene: 'rootwood', season: shown.atmo.season, time: shown.atmo.time, weather: shown.atmo.weather }).map((p) => p.id)),
  }), 'rootwood');
}

/* ---- Part 16.2: the walk's fixed geometry ----
   Every coordinate here is in WOOD UNITS: one grove is 100 units wide and
   one unit is one percent of the frame's width, so a grove is exactly one
   frame; y is a percentage of frame height. Nothing is a pixel. */

/** A plant's height as a share of the frame's own height at a stand's
 *  base scale of 1 (Part 8.2, re-pinned in Part 16.2 so that a sprout is
 *  legible from across the wood and an Ancient is unmistakably the
 *  tallest thing in its grove) — multiplied by the stand's own scale.
 *  Exported: session.js resizes the tended stand to the post-growth
 *  stage's height in place. */
export const STAGE_HEIGHT_PCT = Object.freeze({
  open_ground: 6, seed: 6, sprout: 8, young: 12, in_leaf: 16.5, mature: 21, ancient: 28,
});
/** cat-plant's own foreground viewBox (120×130) as an aspect ratio — the
 *  browser turns a height share into the right width whatever the frame. */
export const CAT_PLANT_ASPECT = '120 / 130';

/** Parallax rates (Part 16.3): the far wood drifts at a third of the
 *  floor's speed, the old growth behind the stands at two thirds; the
 *  floor, the stands and the great trunks move together. */
const FAR_RATE = 0.32;
const MID_RATE = 0.62;

/** The light shafts (§5.3): two per grove, one at the entrance, falling
 *  from the ceiling to the floor at the hour's own angle. */
const SHAFT_TOP_Y = 10;
const SHAFT_FALL = 68;
const SHAFT_WIDTH = 8;
const SHAFT_TILT = Object.freeze({
  dawn: 1 / Math.tan((55 * Math.PI) / 180),
  morning: 1 / Math.tan((75 * Math.PI) / 180),
  afternoon: 1 / Math.tan((75 * Math.PI) / 180),
  dusk: 1 / Math.tan((55 * Math.PI) / 180),
});
const GROVE_SHAFT_X = Object.freeze([38, 104]);

/** The ceiling's two sky-holes: fixed coordinates, never improvised. */
const SKY_HOLES = Object.freeze([
  { x: 30, y: 8, rx: 5.5, ry: 3 },
  { x: 62, y: 5, rx: 5, ry: 2.6 },
]);

/** THE WORLD Part 6.5's Rootwood-scene pigments as literal hex (mirroring
 *  overlook.js's precedent) because litFace()/shadeFace() compute from a
 *  raw hex. Values match tokens.css's --garden-rootwood-* exactly. */
const CANOPY_STACK = ['#3E6B4B', '#2E5440', '#24463A'];
const TRUNK_BASE = '#6F5B48';
const SHAFT_BASE = '#F3E9C2';

/** A tiny stable seed for identity, mirroring cat-plant's own seeded
 *  character and overlook.js's identical helper. */
function seedFrom(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h >>> 0;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const f1 = (n) => (Math.round(n * 10) / 10).toString();

/**
 * The whole `.grove-scene` markup for the walk (Part 16): the fixed
 * ceiling and air, the far wood, the scrolling floor with every stand
 * and sign on it, the great trunks in front, the ambient layer, and the
 * title card. The single assembly point for the wood's paint — the biome
 * screen calls it interactively, and Stage W4 (session.js, plant.js)
 * calls it again as a becalmed backdrop with the camera held on one
 * family.
 * @param {object} biome
 * @param {object} ground  computeGroundTier()'s result
 * @param {object} atmo  atmosphereFor()'s result
 * @param {{plants: Array, askingId: string|null, openSeedId: string|null,
 *           wood: ReturnType<typeof layoutWood>}} scene
 * @param {{interactive?: boolean, ambientEvent?: string|null,
 *           focusId?: string|null, cameraX?: number}} [opts]
 *        `interactive` draws the sky-tap, the title card and lets the
 *        walk scroll; a becalmed backdrop (a session, an approach) is
 *        never itself a tap target (Bible §11.6). `focusId` marks the
 *        tended/approached plant with `data-tended-plant` so session.js
 *        can grow it in place. `cameraX` is the wood unit the frame's
 *        left edge starts at (clamped to the wood).
 */
export function groveSceneHTML(biome, ground, atmo, scene, opts = {}) {
  const { interactive = true, ambientEvent = null, focusId = null, cameraX = 0 } = opts;
  const { plants, askingId, openSeedId, wood } = scene;
  const becalmed = !interactive;
  const W = wood.width;
  const cam = clamp(cameraX, 0, Math.max(0, W - 100));
  const farW = W * FAR_RATE + 100;
  const midW = W * MID_RATE + 100;
  // A becalmed scene cannot scroll, so its camera is a pure CSS shift: the
  // track moves by `cam` units of frame, and each parallax layer by its
  // own rate — expressed as a share of that layer's own width.
  const shift = (units, layerW) => ` transform:translateX(${f1(-(units / layerW) * 100)}%);`;
  const trackStyle = `width:${W}%;${becalmed ? shift(cam, W) : ''}`;
  const farStyle = `width:${f1(farW)}%;${becalmed ? shift(cam * FAR_RATE, farW) : ''}`;
  const midStyle = `width:${f1(midW)}%;${becalmed ? shift(cam * MID_RATE, midW) : ''}`;
  const wash = becalmed ? ` --becalm-wash-color:${shadowColor(atmo.time)};` : '';

  return `
    <div class="grove-scene grove-scene--wood${becalmed ? ' grove-scene--becalmed' : ''}"
         data-time="${atmo.time}" data-season="${atmo.season}" data-weather="${atmo.weather}" data-tier="${ground.tier}"
         style="--wood-w:${W};${wash}">
      <div class="grove-earth" aria-hidden="true"></div>
      ${atmo.time === 'night' ? '<div class="grove-night-sky" aria-hidden="true"></div>' : ''}
      ${weatherLayerHTML(atmo.weather)}

      <!-- Overhead, fixed: the air of the wood and the canopy ceiling
           (Part 10.2) — light through leaves, never paper. -->
      <svg class="grove-cathedral" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${airSVG()}
        ${ceilingSVG(atmo)}
        ${atmo.time === 'dawn' ? dawnMistSVG() : ''}
      </svg>

      <!-- Far: the old growth behind everything, drifting slowly. -->
      <div class="grove-par grove-par--far" data-par="far" style="${farStyle}" aria-hidden="true">
        <svg viewBox="0 0 ${f1(farW)} 100" preserveAspectRatio="none">${farWoodSVG(farW, atmo)}</svg>
      </div>

      <!-- Mid: the old growth behind the stands — unlabelled crowns, the
           wood that was here before the learner, passing at two thirds. -->
      <div class="grove-par grove-par--mid" data-par="mid" style="${midStyle}" aria-hidden="true">
        <svg viewBox="0 0 ${f1(midW)} 100" preserveAspectRatio="none">${midWoodSVG(midW, atmo)}</svg>
      </div>

      <!-- The walk: the floor and everything standing on it. -->
      <div class="grove-walk${interactive ? ' grove-walk--live' : ''}" id="grove-walk" aria-label="${escapeHTML(biome.name)}">
        <div class="grove-track" id="grove-track" style="${trackStyle}">
          ${interactive ? `<button class="grove-sky" id="biome-sky" aria-label="${escapeHTML(VALLEY_LINES.toValley)}" tabindex="-1"></button>` : ''}
          <svg class="grove-floor" viewBox="0 0 ${W} 100" preserveAspectRatio="none" aria-hidden="true">
            ${floorSVG(W, wood, atmo, ground)}
          </svg>
          <div class="grove-slots">
            ${signsHTML(wood, plants)}
            ${standsHTML(plants, wood, askingId, openSeedId, atmo, focusId)}
          </div>
          <!-- The great trunks: doorposts between the groves, taller than
               the screen, on the floor with everything else. -->
          <svg class="grove-floor grove-doorposts" viewBox="0 0 ${W} 100" preserveAspectRatio="none" aria-hidden="true">
            ${trunksSVG(W, wood, atmo)}
          </svg>
        </div>
      </div>

      <div class="grove-ambient" aria-hidden="true">${ambientEvent ? ambientMarkup(ambientEvent) : ''}</div>
      ${interactive ? '<div class="grove-title" id="grove-title" aria-live="polite"></div>' : ''}
    </div>
  `;
}

/**
 * A becalmed backdrop with the camera held on ONE specific family's own
 * stand — Stage W4's shared staging for a session (Part 10.3) and a
 * plant approach (Part 10.4). The rest of the wood renders exactly as
 * the biome screen would show it right now. Returns '' when the family
 * has no living biome yet.
 * @param {{family, state, history, biome}} focusedView  the plant view
 *        for the family being tended/approached — its `state` may be a
 *        display override (a session's "about to grow" seed stand-in)
 *        rather than the raw computed state.
 */
export function focusedGroveSceneHTML(biome, ground, atmo, allFamilies, allSessions, seeds, focusedView, opts = {}) {
  if (!biome || biome.status !== 'living') return '';
  const scene = deriveBiomeScene(allFamilies, allSessions, biome.slug, Date.now(), seeds);
  const focusId = focusedView.family.meta.id;
  const plants = scene.plants.map((p) => (p.family.meta.id === focusId ? focusedView : p));
  if (!plants.some((p) => p.family.meta.id === focusId)) plants.push(focusedView);
  const wood = layoutWood(plants.map((p) => p.family));
  const stand = wood.stands.get(focusId);
  const cameraX = stand ? stand.x - 50 : 0;
  return groveSceneHTML(biome, ground, atmo,
    { plants, askingId: scene.askingId, openSeedId: scene.openSeedId, wood },
    { interactive: false, focusId, cameraX, ...opts });
}

/** Where the walk opens (Part 16.4): on the one lit plant when there is
 *  one; else on the family tended most recently, so a learner returning
 *  from a session finds the tree they just grew in front of them; else at
 *  the wood's mouth. */
function startingCamera(plants, wood, askingId) {
  const focus = askingId
    ? plants.find((p) => p.family.meta.id === askingId)
    : [...plants].filter((p) => p.state.lastVisitedAt)
      .sort((a, b) => (b.state.lastVisitedAt ?? '').localeCompare(a.state.lastVisitedAt ?? ''))[0];
  const stand = focus ? wood.stands.get(focus.family.meta.id) : null;
  return stand ? stand.x - 50 : 0;
}

function renderWalk(outlet, biome, scene, ground) {
  const { plants, askingId, openSeedId } = scene;
  const atmo = atmosphereFor();
  const sessionSeed = `biome:${biome.slug}:${new Date().toDateString()}`;
  const bloomingCount = plants.filter((p) => p.state.stage === 'mature' || p.state.stage === 'ancient').length;
  const ancientCount = plants.filter((p) => p.state.stage === 'ancient').length;
  const landmarkCount = plants.filter((p) => p.state.landmark).length;
  const event = pickAmbientEvent({ bloomingCount, ancientCount, landmarkCount, groundTier: ground.tier });

  const wood = layoutWood(plants.map((p) => p.family));
  const cameraX = startingCamera(plants, wood, askingId);

  outlet.innerHTML = `
    <section class="screen biome biome--enter">
      <button class="biome__ascend" id="biome-ascend" aria-label="${escapeHTML(VALLEY_LINES.toValley)}">
        <span aria-hidden="true">↑</span> ${escapeHTML(VALLEY_LINES.toValley)}
      </button>
      ${groveSceneHTML(biome, ground, atmo, { plants, askingId, openSeedId, wood }, { ambientEvent: event, cameraX })}
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

  // Tap opens a plant (or a root-stone); a long press PEEKS at it — its key
  // and members, without entering — and it is gone the moment you release
  // (Bible §14.2). Peek is an enhancement, never required (Principle 110).
  const plantsById = new Map(plants.map((p) => [p.family.meta.id, p]));
  for (const el of outlet.querySelectorAll('[data-plant-id]')) {
    wirePlant(el, plantsById.get(el.dataset.plantId));
  }

  wireWalk(outlet, wood, cameraX);
  return { atmo, event };
}

/**
 * The walk itself (Part 16.3–16.4): the camera opens on its starting
 * stand, the two parallax layers follow the hand, and the title card
 * names each grove as its centre crosses the frame's centre — once per
 * grove entered, never on every scroll tick.
 */
function wireWalk(outlet, wood, cameraX) {
  const walk = outlet.querySelector('#grove-walk');
  const far = outlet.querySelector('[data-par="far"]');
  const mid = outlet.querySelector('[data-par="mid"]');
  const title = outlet.querySelector('#grove-title');
  if (!walk) return;
  const unit = () => walk.clientWidth / 100;
  const cam = clamp(cameraX, 0, Math.max(0, wood.width - 100));
  walk.scrollLeft = cam * unit();

  let current = null;
  let first = true;
  const nameGrove = (scrollLeft) => {
    const centre = scrollLeft / unit() + 50;
    const g = groveAt(centre, wood.groves);
    const slug = g ? g.grove.slug : null;
    if (slug === current) return;
    current = slug;
    if (!title) return;
    if (!g) { title.classList.remove('is-shown'); return; }
    title.innerHTML = `
      <p class="grove-title__name">${escapeHTML(g.grove.name)}</p>
      <p class="grove-title__line">${escapeHTML(g.grove.line)}</p>`;
    title.classList.remove('is-shown');
    void title.offsetWidth; // restart the card's own fade
    title.classList.add('is-shown');
    // Walking into a grove sounds like one soft leaf — the wood's own
    // register, never a chime for arriving (Bible §10.5). The opening
    // grove is silent: the descent already paid for the arrival.
    if (!first) playGardenSound('leafTap');
    first = false;
  };

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const s = walk.scrollLeft;
      if (far) far.style.transform = `translateX(${(-s * FAR_RATE).toFixed(1)}px)`;
      if (mid) mid.style.transform = `translateX(${(-s * MID_RATE).toFixed(1)}px)`;
      nameGrove(s);
    });
  };
  walk.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
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
  // On a touch device a long press otherwise summons the browser's own
  // context menu / text-selection callout over the peek (Phase 4.9 P5);
  // the hold owns this gesture, so the platform menu stays out of it.
  el.addEventListener('contextmenu', (e) => e.preventDefault());
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

/** A quiet line floating low in the wood (never below the fold): the
 *  nothing-due day, or the one seed that is ready. */
function appendNote(outlet, text) {
  const note = document.createElement('p');
  note.className = 'grove-note grove-note--float';
  note.textContent = text;
  outlet.querySelector('.grove-scene').appendChild(note);
}

/* ---- The stands (Part 16.2) ---- */

/**
 * Every family, standing in its own stand: a `<cat-plant>` for anything
 * that has begun to grow (or the one plant being tended, whatever its
 * display stage), a root-stone for open ground and for a seed carried
 * back through the Gate. Painted back to front by row so a nearer plant
 * is the one a tap actually reaches wherever two overlap.
 */
function standsHTML(plants, wood, askingId, openSeedId, atmo, focusId) {
  const placed = plants
    .map((p) => ({ p, stand: wood.stands.get(p.family.meta.id) }))
    .filter(({ stand }) => !!stand)
    .sort((a, b) => a.stand.y - b.stand.y);
  return placed.map(({ p, stand }) => standHTML(p, stand, wood.width, askingId, openSeedId, atmo, focusId)).join('');
}

function standHTML(p, stand, W, askingId, openSeedId, atmo, focusId) {
  const id = p.family.meta.id;
  const isAsking = id === askingId;
  const isOpenSeed = id === openSeedId;
  const isFocus = id === focusId;
  const stage = p.state.stage;
  const stone = !isFocus && (stage === 'open_ground' || stage === 'seed');
  const nest = hasNest(p.state);
  const heightPct = (STAGE_HEIGHT_PCT[stage] ?? STAGE_HEIGHT_PCT.open_ground) * stand.scale;
  const shadowShift = (SUN_OFFSET_SIGN[atmo.time] ?? 0) * 15;
  // The accessible name conveys the plant's NAME and, where it matters, its
  // invitation — never its growth stage (§16.3). Sighted learners read the
  // stage from the plant's form; screen-reader learners hear what to do.
  const aria = isAsking
    ? `${p.family.root.label}, ready to tend`
    : (stage === 'open_ground' || stage === 'seed')
      ? `${p.family.root.label}, open ground`
      : p.family.root.label;
  // data-slot-scale: Stage W4's in-place growth (session.js) needs this
  // stand's own scale back to resize the container to the post-growth
  // stage's height without re-deriving which stand the plant is in.
  const style = `left:${f1((stand.x / W) * 100)}%; bottom:${f1(100 - stand.y)}%; height:${f1(heightPct)}%; aspect-ratio:${CAT_PLANT_ASPECT};`
    + ` z-index:${Math.round(stand.y)}; --slot-shadow-color:${shadowColor(atmo.time)}; --slot-shadow-shift:${shadowShift.toFixed(0)}%;`;
  const art = stone
    ? rootStoneSVG(id, stage === 'seed', atmo)
    : `<cat-plant stage="${stage}" due="${p.state.due}" ${nest ? 'nest' : ''} ${isFocus ? 'data-tended-plant' : ''}
        ${p.state.landmark ? `landmark name="${escapeHTML(p.family.root.label)}"` : ''}
        season="${escapeHTML(atmo.season)}" seed="${escapeHTML(id)}" vigor="${p.state.vigor}"></cat-plant>`;
  return `
    <button class="grove-plant grove-plant--slot grove-plant--${stand.band}${stone ? ' grove-plant--stone' : ''}${isAsking ? ' grove-plant--asking' : ''}${isOpenSeed ? ' grove-plant--invite' : ''}${stage === 'ancient' ? ' grove-plant--ancient' : ''}"
            data-plant-id="${id}" data-slot-scale="${stand.scale}" data-grove="${stand.grove.slug}" aria-label="${escapeHTML(aria)}" style="${style}">
      <span class="grove-plant__shadow" aria-hidden="true"></span>
      ${stone ? '' : '<span class="grove-plant__tuft" aria-hidden="true"></span>'}
      <span class="grove-plant__art">${art}</span>
      <span class="grove-plant__name">${escapeHTML(p.family.root.label)}</span>
    </button>
  `;
}

/**
 * A root-stone (Part 16.2): open ground, drawn as a place rather than an
 * absence — a small pale stone half-sunk in moss with two blades of grass,
 * the root's name on approach only. Never a padlock, never a price, never
 * a hole (Bible §6.2 stage 0). A seed carried back through the Gate adds
 * the seed itself, pressed into the earth beside the stone. Drawn in
 * cat-plant's own 120×130 box so it stands in a stand exactly as a plant
 * does, and leans by its seed like everything else in the wood.
 */
function rootStoneSVG(id, hasSeed, atmo) {
  const lean = ((seedFrom(`stone-${id}`) % 100) / 100 - 0.5) * 8;
  const cx = 60 + lean;
  const lit = litFace('#B8B09E', atmo.time);
  const shade = shadeFace('#8E8677', atmo.time);
  return `
    <svg viewBox="0 0 120 130" role="img" aria-hidden="true" class="grove-stone">
      <ellipse cx="60" cy="122" rx="24" ry="4.6" fill="#4A3B2A" opacity="0.22"/>
      <ellipse cx="${f1(cx - 8)}" cy="121" rx="19" ry="4" class="grove-stone__moss"/>
      <path d="M${f1(cx - 17)},120 Q${f1(cx - 19)},104 ${f1(cx - 4)},101 Q${f1(cx + 14)},99 ${f1(cx + 18)},112 Q${f1(cx + 19)},120 ${f1(cx + 10)},121 Z" fill="${shade}"/>
      <path d="M${f1(cx - 15)},117 Q${f1(cx - 16)},105 ${f1(cx - 4)},103 Q${f1(cx + 8)},101 ${f1(cx + 12)},110 Q${f1(cx + 2)},112 ${f1(cx - 15)},117 Z" fill="${lit}"/>
      <path d="M${f1(cx + 22)},121 q1,-7 3,-11 M${f1(cx + 25)},121 q0,-5 2.5,-8 M${f1(cx - 22)},121 q-1,-6 -3,-9" class="grove-stone__grass"/>
      ${hasSeed ? `<ellipse cx="${f1(cx + 24)}" cy="119.5" rx="3.6" ry="2.2" class="grove-stone__seed"/>` : ''}
    </svg>`;
}

/** The signposts (Part 16.4): one at each grove's mouth — a post and a
 *  board, the grove's name on it in the world's own serif. A grove whose
 *  every family is at least Mature carries a garland on its board: the one
 *  line "This grove is grown" is the sign, not a sentence. */
function signsHTML(wood, plants) {
  const stateById = new Map(plants.map((p) => [p.family.meta.id, p.state]));
  return wood.groves.map((g) => {
    const grown = g.families.length > 0 && g.families.every((f) => {
      const s = stateById.get(f.meta.id)?.stage;
      return s === 'mature' || s === 'ancient';
    });
    const x = ((g.left + 15) / wood.width) * 100;
    return `
      <div class="grove-sign${grown ? ' grove-sign--grown' : ''}" style="left:${f1(x)}%" aria-hidden="true">
        <svg viewBox="0 0 60 46" class="grove-sign__post">
          <path d="M29,46 L29,19" class="grove-sign__pole"/>
          <path d="M3,7 L56,5 L57,19 L4,20 Z" class="grove-sign__board"/>
          <path d="M3,7 L56,5" class="grove-sign__edge"/>
          ${grown ? '<path d="M6,8 q7,-5 14,0 q7,-5 14,0 q7,-5 14,0 q3,-2 5,0" class="grove-sign__garland"/>' : ''}
        </svg>
        <span class="grove-sign__name">${escapeHTML(g.grove.name.replace(/^The Grove of /, ''))}</span>
      </div>`;
  }).join('');
}

/** One ambient visitor, drawn from the roster (THE WORLD Part 9.1). Two
 *  of the five events are not creatures at all: a falling petal and a
 *  leaf-stir are the WOOD moving, not something living in it. */
const SCENE_FRAME_WIDTH = 360;
function ambientMarkup(event) {
  const CREATURE = { bird: 'bird', butterfly: 'butterfly-white', firefly: 'firefly' };
  if (CREATURE[event]) {
    return `<span class="grove-visitor grove-visitor--${event}" aria-hidden="true">${faunaInlineSVG(CREATURE[event], SCENE_FRAME_WIDTH)}</span>`;
  }
  if (event === 'petal') {
    return `<span class="grove-visitor grove-visitor--petal" aria-hidden="true">
      <svg viewBox="-4 -4 8 8" width="8" height="8" aria-hidden="true" focusable="false">
        <ellipse rx="3.4" ry="1.9" fill="var(--garden-bloom)" transform="rotate(-24)"/>
      </svg></span>`;
  }
  if (event === 'leaf-stir') {
    return `<span class="grove-visitor grove-visitor--leaf-stir" aria-hidden="true">
      <svg viewBox="-5 -5 10 10" width="10" height="10" aria-hidden="true" focusable="false">
        <path d="M-3.6,1.8 Q-1,-3.4 3.6,-1.8 Q1,3.4 -3.6,1.8 Z" fill="var(--garden-inleaf)"/>
      </svg></span>`;
  }
  return '';
}

/* ---- The wood's painted structure (THE WORLD Part 10.2, 16.3, §5.2–5.3) ---- */

/** The air of the wood: what shows between the trunks is LIGHT THROUGH
 *  LEAVES — deep canopy shade at the top, a luminous green-gold band
 *  where the shafts land, re-toned per hour by CSS on the stops. */
function airSVG() {
  return `
    <defs>
      <linearGradient id="grove-air-grad" x1="0" y1="0" x2="0" y2="1">
        <stop class="grove-air-stop grove-air-stop--top" offset="0%"/>
        <stop class="grove-air-stop grove-air-stop--mid" offset="34%"/>
        <stop class="grove-air-stop grove-air-stop--low" offset="58%"/>
      </linearGradient>
    </defs>
    <rect class="grove-air" x="0" y="0" width="100" height="62" fill="url(#grove-air-grad)"/>`;
}

/** The canopy ceiling: three overhead masses in the deepest greens
 *  closing the top of the frame, with two sky-holes that are genuinely
 *  gaps BETWEEN them (the hour's own sky shows through). Winter hangs
 *  branch tracery below a bare ceiling rather than removing it (Part 6.6:
 *  the enclosure is a pinned law). By night the gaps carry a thin
 *  moon-silver rim (§5.4). */
function ceilingSVG(atmo) {
  const masses = [
    { x: 10, y: 6, rx: 15, ry: 10, c: CANOPY_STACK[0] },
    { x: 46, y: 4, rx: 11, ry: 10, c: CANOPY_STACK[1] },
    { x: 85, y: 7, rx: 18, ry: 11, c: CANOPY_STACK[2] },
  ];
  const winter = atmo.season === 'winter';
  const body = masses.map((m) => (winter
    ? `<ellipse cx="${m.x}" cy="${m.y}" rx="${m.rx}" ry="${m.ry}" fill="${shadeFace(m.c, atmo.time)}" class="grove-winter-haze"/>`
    : `<ellipse cx="${m.x}" cy="${m.y}" rx="${m.rx}" ry="${m.ry}" fill="${litFace(m.c, atmo.time)}"/>`
      + `<ellipse cx="${(m.x - m.rx * 0.28).toFixed(1)}" cy="${(m.y + m.ry * 0.3).toFixed(1)}" rx="${(m.rx * 0.55).toFixed(1)}" ry="${(m.ry * 0.5).toFixed(1)}" fill="${shadeFace(m.c, atmo.time)}"/>`
  )).join('');
  const HANGS = [
    { x: 5, top: 15, len: 11, dir: 1, twig: 0.5 }, { x: 14, top: 16, len: 7, dir: -1, twig: 0.62 },
    { x: 21, top: 14, len: 13, dir: 1, twig: 0.4 }, { x: 40, top: 13, len: 9, dir: -1, twig: 0.55 },
    { x: 50, top: 14, len: 12, dir: -1, twig: 0.35 }, { x: 72, top: 17, len: 8, dir: 1, twig: 0.6 },
    { x: 82, top: 18, len: 13, dir: -1, twig: 0.45 }, { x: 92, top: 16, len: 10, dir: 1, twig: 0.5 },
  ];
  const winterTracery = winter
    ? `<g class="grove-ceiling-winter">${HANGS.map(({ x, top, len, dir, twig }) => {
      const endX = x + dir * len * 0.42;
      const endY = top + len;
      const tX = x + dir * len * 0.42 * twig;
      const tY = top + len * twig;
      return `
        <path class="grove-winter-twig" d="M${x},${top} Q${(x + dir * len * 0.1).toFixed(1)},${(top + len * 0.55).toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}"/>
        <path class="grove-winter-twig" d="M${tX.toFixed(1)},${tY.toFixed(1)} q${(-dir * len * 0.3).toFixed(1)},${(len * 0.28).toFixed(1)} ${(-dir * len * 0.34).toFixed(1)},${(len * 0.46).toFixed(1)}"/>`;
    }).join('')}</g>`
    : '';
  const rims = atmo.time === 'night'
    ? SKY_HOLES.map((h) => `<ellipse class="grove-hole-rim" cx="${h.x}" cy="${h.y}" rx="${h.rx}" ry="${h.ry}" fill="none"/>`).join('')
    : '';
  const leaves = winter ? '' : masses.map((m, i) => {
    const pts = [-0.7, -0.25, 0.2, 0.65];
    return pts.map((t, k) => {
      const lx = m.x + t * m.rx;
      const ly = m.y + m.ry * (0.7 + ((i + k) % 2) * 0.22);
      const r = m.rx * (0.22 + ((i * 3 + k) % 3) * 0.05);
      const tone = (k % 2 === 0) ? litFace(m.c, atmo.time) : shadeFace(m.c, atmo.time);
      return `<ellipse class="grove-ceiling-leaf" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.72).toFixed(1)}" fill="${tone}"/>`;
    }).join('');
  }).join('');
  return `<g class="grove-ceiling${winter ? ' grove-ceiling--winter' : ''}">${body}${leaves}${winterTracery}${rims}</g>`;
}

/** Dawn: mist between the far trunks — layered translucent shapes, never
 *  a blur filter (§11.3, §11.7). */
function dawnMistSVG() {
  return `
    <ellipse class="grove-cathedral-mist" cx="40" cy="24" rx="20" ry="3.2"/>
    <ellipse class="grove-cathedral-mist grove-cathedral-mist--2" cx="64" cy="29" rx="17" ry="2.8"/>`;
}

/** The old-growth horizon behind the working wood (Bible §4.1: "behind
 *  them a horizon of old growth"), tiled across the far layer's width —
 *  a fixed row of deep silhouettes, cooler and paler than the trees in
 *  front (aerial perspective inside the wood). It stands from day one:
 *  the wood is older than the learner. */
function farWoodSVG(farW) {
  const TRUNKS = [[8, 1.4], [35, 1.8], [59, 1.2], [90, 1.6]];
  const TREES = [[6, 55, 5], [26, 53, 6], [44, 55, 4.8], [57, 53, 5.6], [73, 55, 4.4], [92, 54, 5.4]];
  const tiles = Math.ceil(farW / 100);
  let out = '';
  for (let i = 0; i < tiles; i += 1) {
    // Each tile shifts its own set a little so the far wood never reads
    // as a repeating wallpaper — the same trees, walked past.
    const dx = i * 100 + (i % 3) * 4;
    out += `<g transform="translate(${dx} 0)">
      ${TRUNKS.map(([x, w], k) => `<path class="grove-far-column" d="M${x + ((i + k) % 2) * 3},10 L${x + ((i + k) % 2) * 3},58" style="stroke-width:${w}"/>`).join('')}
      ${TREES.map(([x, y, r], k) => {
        const yy = y + ((i + k) % 2) * 1.2;
        return `
        <path class="grove-far-trunk" d="M${x},${yy + r * 0.5} L${x},${(yy + r * 1.5).toFixed(1)}"/>
        <ellipse cx="${x}" cy="${yy}" rx="${r}" ry="${(r * 1.35).toFixed(1)}"/>
        <ellipse cx="${(x - r * 0.35).toFixed(1)}" cy="${(yy - r * 0.6).toFixed(1)}" rx="${(r * 0.5).toFixed(1)}" ry="${(r * 0.65).toFixed(1)}"/>`;
      }).join('')}
    </g>`;
  }
  return `<g class="grove-far-wood" aria-hidden="true">${out}</g>`;
}

/**
 * The floor of the walk (Part 16.3), drawn once across the whole wood: a
 * far slope at the wood's edge, the nearer mossy floor, the pools of
 * light where the shafts land (never at night), the shafts themselves,
 * the Ground's marks (the Effort Ledger — more of the same fixed set per
 * grove as lifetime effort accumulates, nothing random, nothing
 * rearranged), the entrance's authored props, the stream's one glint,
 * and the fireflies of the night. The floor is stretched onto a portrait
 * frame (`preserveAspectRatio="none"`), so every shape meant to read as
 * round is authored squashed (one y-unit is about two x-units on screen).
 */
function floorSVG(W, wood, atmo, ground) {
  const night = atmo.time === 'night';
  const sign = SUN_OFFSET_SIGN[atmo.time] ?? 0;
  const tilt = SHAFT_TILT[atmo.time];
  const dx = tilt === undefined ? 0 : SHAFT_FALL * tilt * sign;

  // The two ground lines, undulating gently the whole way across.
  const undulate = (y, amp, step, phase) => {
    let d = `M0,${y}`;
    for (let x = 0; x <= W + step; x += step) {
      const cx = x + step / 2;
      const cy = y + (((x / step + phase) % 2) ? -amp : amp);
      d += ` Q${f1(cx)},${f1(cy)} ${f1(x + step)},${y}`;
    }
    return `${d} L${f1(W + step)},100 L0,100 Z`;
  };
  const farSlope = `<path class="grove-floor-far" d="${undulate(58, 2.4, 52, 0)}"/>`;
  const nearFloor = `<path class="grove-floor-near" d="${undulate(80, 2, 44, 1)}"/>`;

  // Shafts and their pools: one at the entrance, two per grove.
  const shaftXs = [WOOD_ENTRANCE * 0.5, ...wood.groves.flatMap((g) => GROVE_SHAFT_X.map((x) => g.left + x))];
  const color = litFace(SHAFT_BASE, atmo.time);
  const botY = SHAFT_TOP_Y + SHAFT_FALL;
  const wedge = (topX, botX, halfTop, halfBot, opacity, delay) => `
    <polygon class="grove-shaft" style="animation-delay:${delay}s" opacity="${opacity}"
      points="${f1(topX - halfTop)},${SHAFT_TOP_Y} ${f1(topX + halfTop)},${SHAFT_TOP_Y} ${f1(botX + halfBot)},${botY} ${f1(botX - halfBot)},${botY}"
      fill="${color}"/>`;
  const shafts = tilt === undefined ? '' : shaftXs.map((x, i) => {
    const botX = x + dx;
    const wOuter = (SHAFT_WIDTH - (i % 3) * 1.6) / 2;
    const wInner = wOuter * 0.5;
    return wedge(x, botX, wOuter, wOuter * 1.35, 0.1, (i * 7) % 28) + wedge(x, botX, wInner, wInner * 1.35, 0.16, (i * 7) % 28);
  }).join('');
  const pools = night ? '' : shaftXs.map((x, i) =>
    `<ellipse class="grove-light-pool" cx="${f1(x + dx)}" cy="${f1(botY + 3 + (i % 3) * 3)}" rx="${f1(6.5 + (i % 3) * 1.2)}" ry="${f1(1.6 + (i % 3) * 0.4)}"/>`).join('');

  // The Ground (§4.3, Roadmap 3.2): eight fixed marks per grove, revealed
  // by lifetime tier — the whole wood's floor thickens with effort.
  const MARKS = [
    { x: 6, y: 92, kind: 'moss' }, { x: 88, y: 90, kind: 'moss' }, { x: 27, y: 95, kind: 'wildflower' },
    { x: 61, y: 94, kind: 'wildflower' }, { x: 3, y: 83, kind: 'fern' }, { x: 95, y: 82, kind: 'fern' },
    { x: 42, y: 97, kind: 'wildflower' }, { x: 73, y: 96, kind: 'moss' },
  ];
  const COUNT_BY_TIER = { bare: 0, tended: 2, growing: 4, flourishing: 6, lush: 8 };
  const n = COUNT_BY_TIER[ground.tier] ?? 0;
  const marks = wood.groves.map((g, gi) => MARKS.slice(0, n).map((m, k) => {
    const x = g.left + m.x + ((gi + k) % 2) * 1.5;
    if (m.kind === 'moss') return `<ellipse class="grove-mark-moss" cx="${f1(x)}" cy="${m.y}" rx="3.2" ry="0.7"/>`;
    if (m.kind === 'fern') return `<path class="grove-mark-fern" d="M${f1(x)},${m.y + 2} Q${f1(x - 1.2)},${m.y - 0.6} ${f1(x)},${m.y - 3.4} Q${f1(x + 1.2)},${m.y - 0.6} ${f1(x)},${m.y + 2} Z"/>`;
    return `<circle class="grove-mark-flower" cx="${f1(x)}" cy="${m.y}" r="0.55"/>`;
  }).join('')).join('');

  // The entrance's authored inventory (Appendix C.6, Stage W6): the fern
  // banks and, at Lush, the old stump with its carved stone — drawn in
  // their own 0–100 coordinates, carried to the wood's mouth; the mirror
  // bank closes the far end of the walk.
  const props = revealedProps({ tier: ground.tier, scene: 'rootwood', season: atmo.season, time: atmo.time, weather: atmo.weather });
  const stories = revealedStories({ tier: ground.tier, scene: 'rootwood' });
  const inScene = inSceneRootwoodPropsSVG(props, stories);
  const entrance = `<g transform="translate(${f1(WOOD_ENTRANCE - 100 + 2)} 0)">${inScene}</g>`;
  const farEnd = `<g transform="translate(${f1(W - WOOD_END - 1)} 0)">${inScene}</g>`;

  // The undergrowth line along the bottom edge, the whole way across.
  const tufts = [];
  for (let x = 3; x < W; x += 9.5) {
    const i = Math.round(x / 9.5);
    const h = 3 + (i % 3) * 1.2;
    const lean = (i % 2 ? 1 : -1) * 0.8;
    tufts.push(`<path class="grove-undergrowth" d="M${f1(x)},100 q${lean},${f1(-h * 0.6)} ${f1(lean * 1.6)},${-h} M${f1(x + 1.6)},100 q${-lean},${f1(-h * 0.5)} ${f1(-lean * 1.4)},${f1(-h * 0.8)}"/>`);
  }

  // Night: fireflies low among the stands, two per grove, each breathing
  // on its own cycle — distinct from the rare ambient firefly visitor.
  const fireflies = night ? wood.groves.flatMap((g, gi) => [
    faunaSVG('firefly', g.left + 16, 91, 100, { delay: (gi * 1.3) % 4 }),
    faunaSVG('firefly', g.left + 84, 93, 100, { delay: (gi * 1.3 + 2.1) % 4 }),
  ]).join('') : '';

  return `
    ${farSlope}
    ${nearFloor}
    ${pools}
    ${shafts}
    ${marks}
    ${entrance}
    ${farEnd}
    <path class="grove-glint" d="M3,35.5 Q6.5,38.5 5,42" fill="none"/>
    ${fireflies}
    <g class="grove-undergrowth-line">${tufts.join('')}</g>`;
}

/** The old growth behind the stands (Part 16.3): a band of unlabelled
 *  crowns and thin trunks between the far wood and the working rows —
 *  the mid-wood of Part 8.5, kept as depth rather than as a record.
 *  Three crowns per hundred units, fixed forever, never a family. */
function midWoodSVG(midW, atmo) {
  const CROWNS = [[14, 52, 9, 0], [48, 50, 10.5, 1], [83, 53, 8.5, 2]];
  const tiles = Math.ceil(midW / 100);
  let out = '';
  for (let i = 0; i < tiles; i += 1) {
    const dx = i * 100 + (i % 2) * 6;
    out += CROWNS.map(([x, y, r, k]) => {
      const base = CANOPY_STACK[(k + i) % CANOPY_STACK.length];
      const cx = dx + x;
      const cy = y + ((i + k) % 2) * 1.5;
      const winter = atmo.season === 'winter';
      if (winter) {
        return `<ellipse class="grove-winter-haze" cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(r * 0.94)}" ry="${f1(r * 1.5)}" fill="${shadeFace(base, atmo.time)}"/>
          <path class="grove-midwood-trunk" d="M${f1(cx)},${f1(cy + r * 0.8)} L${f1(cx)},${f1(cy + r * 3.2)}"/>`;
      }
      return `
        <path class="grove-midwood-trunk" d="M${f1(cx)},${f1(cy + r * 0.8)} L${f1(cx)},${f1(cy + r * 3.2)}"/>
        <ellipse class="grove-midwood" cx="${f1(cx)}" cy="${f1(cy)}" rx="${r}" ry="${f1(r * 1.55)}" fill="${litFace(base, atmo.time)}"/>
        <ellipse class="grove-midwood" cx="${f1(cx - r * 0.42)}" cy="${f1(cy + r * 0.5)}" rx="${f1(r * 0.5)}" ry="${f1(r * 0.8)}" fill="${shadeFace(base, atmo.time)}"/>
        <ellipse class="grove-midwood" cx="${f1(cx + r * 0.3)}" cy="${f1(cy - r * 0.9)}" rx="${f1(r * 0.55)}" ry="${f1(r * 0.7)}" fill="${litFace(litFace(base, atmo.time), atmo.time)}"/>`;
    }).join('');
  }
  return `<g class="grove-mid-wood" aria-hidden="true">${out}</g>`;
}

/** The great trunks (Part 10.2, 16.3): trees taller than the screen, the
 *  whole feeling of the biome — one at the wood's mouth, one between
 *  every pair of groves, one at the far end — so every grove is a room
 *  between two doorposts, and no trunk ever stands where a plant does.
 *  A tapering two-tone mass with a root flare and a few bark lines. */
function trunksSVG(W, wood, atmo) {
  const lit = litFace(TRUNK_BASE, atmo.time);
  const shade = shadeFace(TRUNK_BASE, atmo.time);
  const posts = [5, ...wood.groves.slice(1).map((g) => g.left), W - 7];
  let out = '';
  for (let k = 0; k < posts.length; k += 1) {
    const x = posts[k];
    const width = k % 2 ? 9 : 7;
    const halfW = width / 2;
    const topW = width * 0.62;
    const midX = x - halfW * 0.12;
    const bark = [18, 41, 63, 84].map((y, i) => {
      const bx = x - halfW * 0.5 + (i % 2) * halfW * 0.7;
      return `<path class="grove-bark" d="M${f1(bx)},${y} q0.3,3 -0.2,7"/>`;
    }).join('');
    out += `
      <g class="grove-trunk" aria-hidden="true">
        ${trunkShadowSVG(x, 97, width, atmo)}
        <path fill="${shade}" d="M${f1(x - halfW)},100 L${f1(midX - topW / 2)},-14 L${f1(midX)},-14 L${f1(x - halfW * 0.18)},100 Z"/>
        <path fill="${lit}" d="M${f1(x - halfW * 0.18)},100 L${f1(midX)},-14 L${f1(midX + topW / 2)},-14 L${f1(x + halfW)},100 Z"/>
        <path fill="${shade}" d="M${f1(x - halfW)},100 Q${f1(x - halfW * 1.1)},95 ${f1(x - halfW * 2.1)},100 Z"/>
        <path fill="${lit}" d="M${f1(x + halfW)},100 Q${f1(x + halfW * 1.1)},95.5 ${f1(x + halfW * 1.9)},100 Z"/>
        ${bark}
      </g>`;
  }
  return out;
}

function trunkShadowSVG(bx, by, width, atmo) {
  const contact = contactShadow(bx, by, width, atmo.time);
  const cast = castsShadow(atmo.time, atmo.season) ? castShadow(bx, by, 16, width, atmo.time) : null;
  const ellipse = (s) => `<ellipse cx="${s.cx.toFixed(1)}" cy="${s.cy.toFixed(1)}" rx="${s.rx.toFixed(1)}" ry="${s.ry.toFixed(1)}" fill="${s.fill}" opacity="${s.opacity}"/>`;
  return `${cast ? ellipse(cast) : ''}${ellipse(contact)}`;
}

export { GROVE_WIDTH };
