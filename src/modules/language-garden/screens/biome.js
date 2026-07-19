/**
 * biome.js (screen) — one biome of the valley, entered from the Overlook
 * (LANGUAGE_GARDEN_BIBLE §16.2). Today only the Rootwood is living, but
 * this screen is written against the biome seam (logic/biomes.js): it
 * renders "the biome for this slug" rather than "the grove."
 *
 * Phase V, Stage W3 (LANGUAGE GARDEN — THE WORLD.md Part 10.2, Part 8.2,
 * 8.4–8.5, Appendix C.6): the Rootwood is staged as a cathedral, not a
 * grid. A canopy ceiling closes the top of the frame with two sky-holes,
 * two great trunks rise past the frame's own top edge, three light
 * shafts fall through the trunk gaps (§5.3), a mid-wood band of
 * unlabelled canopy masses stands in for every Mature family the working
 * set has no room for, and the seven foreground slots of Appendix C.6
 * hold the plants the working-set rule actually chose (logic/scene.js's
 * selectForegroundSlots) — the lit plant always at S4. Plant names are
 * wordless until approach: focus, peek, or the plant screen (Part 8.4);
 * the wood itself carries no label. Ancient trees are unchanged by any
 * of this — they already collapse to the horizon (Part 8.5: "as canon").
 *
 * One screen, no scrolling (§4.1). Plant states are readable without
 * reading — the scene IS the status display (§16.3). At most one plant
 * is lit (§17.2). The learner ascends to the valley by the one quiet
 * mark, or by tapping the sky.
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions, listGardenSeeds } from '../logic/store.js';
import { deriveBiomeScene, selectForegroundSlots } from '../logic/scene.js';
import { biomeBySlug } from '../logic/biomes.js';
import { pickAmbientEvent, hasNest } from '../logic/ambient.js';
import { computeGroundTier } from '../logic/effort.js';
import { atmosphereFor } from '../logic/atmosphere.js';
import { weatherLayerHTML } from './atmosphere-art.js';
import {
  litFace, shadeFace, shadowColor, SUN_OFFSET_SIGN,
  contactShadow, castShadow, castsShadow,
} from '../logic/light.js';
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
  renderSceneHTML(outlet, biome, scene, ground);
}

/* ---- Phase V, Stage W3: the Rootwood cathedral's fixed geometry ----
   (THE WORLD Part 10.2, 8.2, Appendix C.6). Coordinates are (x, y)
   percentages of the scene frame, the exact convention Appendix C
   states — nothing here is a pixel conversion, so it holds at any
   rendered aspect ratio. */

/** The seven working-set slots (Appendix C.6), keyed by name so the fill
 *  order below can address them directly. `scale` is the slot's own base
 *  scale (back/front/near — Part 8.5); `band` only changes the shadow's
 *  visual weight, never the game logic. */
export const ROOTWOOD_SLOTS = Object.freeze({
  S1: { x: 30, y: 60, scale: 0.8, band: 'back' },
  S2: { x: 50, y: 58, scale: 0.8, band: 'back' },
  S3: { x: 68, y: 61, scale: 0.8, band: 'back' },
  S4: { x: 38, y: 70, scale: 1.0, band: 'front' }, // the lit plant's slot, always
  S5: { x: 62, y: 69, scale: 1.0, band: 'front' },
  S6: { x: 20, y: 80, scale: 1.15, band: 'near' },
  S7: { x: 78, y: 81, scale: 1.15, band: 'near' },
});
/** Fill order (Part 8.5): the working-set rule's priority list lands here,
 *  first candidate to S4, and S4 is where "the lit plant, when present,
 *  always stands" — the two facts agree because lit is always priority 1.
 *  Exported: Stage W4 (session.js, plant.js) forces the plant the learner
 *  is actually looking at into S4 too — "the lit plant's slot" is, during
 *  a session or an approach, exactly the plant receiving the learner's
 *  whole attention, so the same seat is the right one. */
export const ROOTWOOD_FILL_ORDER = ['S4', 'S5', 'S2', 'S6', 'S1', 'S3', 'S7'];

/** A plant's height as a share of the frame's own height, at a slot's
 *  base scale of 1 (Part 8.2) — multiplied by the slot's scale for the
 *  final size. Ancient never reaches the foreground (Part 8.5), so it has
 *  no entry: it is always drawn at "horizon" size instead. */
export const STAGE_HEIGHT_PCT = Object.freeze({
  open_ground: 2, seed: 2, sprout: 4, young: 9, in_leaf: 14, mature: 18,
});
/** cat-plant's own foreground viewBox (120×130, cat-plant.js's #wrap) —
 *  used as an aspect-ratio, never as a computed width percentage: a
 *  slot's x/y map to different real units in a portrait frame, and only
 *  aspect-ratio lets the browser convert a height share into the correct
 *  width regardless of how the frame actually renders. */
export const CAT_PLANT_ASPECT = '120 / 130';

/** The two great background trunks (§5.3, Part 10.2): x position and
 *  width as a share of frame width, rising from the floor past the
 *  frame's own top edge — "trees taller than the screen." */
const GREAT_TRUNKS = Object.freeze([
  { x: 15, width: 7 },
  { x: 78, width: 9 },
]);

/** The three light shafts (§5.3): exactly three, falling through the
 *  trunk gaps (between and beside the two great trunks above). */
const SHAFT_X = Object.freeze([24, 48, 70]);
const SHAFT_WIDTH_PCT = 8;
const SHAFT_TOP_Y = 12;
const SHAFT_FALL = 65;
/** 55° from horizontal at dawn/dusk (long and raking, §5.1); 75°
 *  (near-vertical) by day; absent at night. cot(angle) is the shaft's
 *  horizontal lean per unit of height fallen. */
const SHAFT_TILT = Object.freeze({
  dawn: 1 / Math.tan((55 * Math.PI) / 180),
  morning: 1 / Math.tan((75 * Math.PI) / 180),
  afternoon: 1 / Math.tan((75 * Math.PI) / 180),
  dusk: 1 / Math.tan((55 * Math.PI) / 180),
});

/** The ceiling's two sky-holes: fixed coordinates, never improvised. */
const SKY_HOLES = Object.freeze([
  { x: 30, y: 8, rx: 5.5, ry: 3 },
  { x: 62, y: 5, rx: 5, ry: 2.6 },
]);

/** The mid-wood band (Part 8.5, 10.2, y30–45%): unlabelled canopy masses
 *  standing in for every Mature family the seven slots had no room for.
 *  Authored once, in reveal order, never random (Part 7.2) — the wood
 *  only ever deepens, never rearranges. No Appendix C table exists for
 *  this band beyond its own y-span, so this is a modest, hand-placed set
 *  at cathedral zoom, kept clear of the two great trunks and the working
 *  set below it (Guide 5.4: fewer, considered shapes, not a crowd). */
const MID_WOOD_SLOTS = Object.freeze([
  { x: 22, y: 33, r: 7 }, { x: 44, y: 38, r: 6.5 }, { x: 58, y: 32, r: 6 },
  { x: 33, y: 42, r: 6 }, { x: 68, y: 40, r: 6.5 }, { x: 27, y: 37, r: 5 },
  { x: 51, y: 44, r: 5.5 }, { x: 62, y: 35, r: 5 },
]);

/** THE WORLD Part 6.5's Rootwood-scene pigments — kept here as literal
 *  hex (mirroring overlook.js's own ROOTWOOD_ROW_COLOR precedent) because
 *  litFace()/shadeFace() need a raw hex to compute from, not a CSS custom
 *  property. Values match tokens.css's --garden-rootwood-* exactly. */
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

/**
 * The cathedral's whole `.grove-scene` markup (Part 10.2): the canopy
 * ceiling, the two great trunks, the light shafts, the mid-wood, the
 * ground, the horizon, the working-set slots. The single assembly point
 * for the scene's paint — the biome screen calls it interactively, and
 * Stage W4 (session.js, plant.js) calls it again as a becalmed backdrop,
 * so the wood a learner tends inside is never a second, different
 * drawing of the same place.
 * @param {object} biome
 * @param {object} ground  computeGroundTier()'s result
 * @param {object} atmo  atmosphereFor()'s result
 * @param {{horizon: Array, foreground: Array, overflowMature: Array,
 *           askingId: string|null, openSeedId: string|null}} slots
 *        already-decided occupancy — the ordinary biome screen computes
 *        this with selectForegroundSlots; a session/approach screen
 *        computes its own (the tended/focused family pinned to S4, or to
 *        the horizon if it is already Ancient) and passes it in, so this
 *        function itself never has to know which caller it is.
 * @param {{interactive?: boolean, ambientEvent?: string|null,
 *           focusId?: string|null}} [opts]  `interactive` draws the
 *        sky-tap-to-ascend affordance (the biome screen only — a
 *        becalmed backdrop is never itself a tap target, Bible §11.6:
 *        "ambient motion pauses during a session"); `focusId` marks
 *        whichever plant is the tended/approached one with
 *        `data-tended-plant`, so session.js can find it again to grow it
 *        in place.
 */
export function groveSceneHTML(biome, ground, atmo, { horizon, foreground, overflowMature, askingId, openSeedId }, opts = {}) {
  const { interactive = true, ambientEvent = null, focusId = null } = opts;
  // A non-interactive ground layer is, by construction, always Stage W4's
  // becalmed backdrop (Part 10.3): a session or a plant approach, never the
  // ordinary biome screen. Becalming here — rather than asking every caller
  // to remember a separate flag — keeps "non-interactive" and "becalmed"
  // one fact instead of two that could drift apart.
  const becalmed = !interactive;
  const wash = becalmed ? ` style="--becalm-wash-color:${shadowColor(atmo.time)};"` : '';
  return `
    <div class="grove-scene grove-scene--cathedral${becalmed ? ' grove-scene--becalmed' : ''}" data-time="${atmo.time}" data-season="${atmo.season}" data-weather="${atmo.weather}"${wash}>
      ${interactive ? `<button class="grove-sky" id="biome-sky" aria-label="${escapeHTML(VALLEY_LINES.toValley)}" tabindex="-1"></button>` : ''}
      <!-- The earth the wood stands on (Guide 7.2's depth planes, at
           biome scale): the mossy cathedral floor, THE WORLD Part
           6.5's own pigments, beneath everything painted above it. -->
      <div class="grove-earth" aria-hidden="true"></div>
      ${atmo.time === 'night' ? '<div class="grove-night-sky" aria-hidden="true"></div>' : ''}
      ${weatherLayerHTML(atmo.weather)}

      <!-- The cathedral's own structure (Part 10.2): the canopy
           ceiling and its two sky-holes, the two great trunks rising
           past the frame's top edge, the three light shafts falling
           through the trunk gaps (§5.3), the mid-wood band standing in
           for every Mature family the seven slots had no room for, and
           the stream's single glint. A flat 0–100 percentage space,
           stretched to the scene's own shape (never cropped), so it
           shares one coordinate system with the slots positioned in
           plain CSS below. -->
      <svg class="grove-cathedral" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${trunksSVG(atmo)}
        ${ceilingSVG(atmo)}
        ${atmo.time === 'dawn' ? dawnMistSVG() : ''}
        ${shaftsSVG(atmo)}
        ${midWoodSVG(overflowMature.length, atmo)}
        ${streamGlintSVG()}
        ${atmo.time === 'night' ? nightFirefliesSVG() : ''}
      </svg>

      <div class="grove-ground grove-ground--${ground.tier}" aria-hidden="true">${groundMarkup(ground.tier)}</div>
      ${horizon.length ? `<div class="grove-horizon" aria-hidden="true">
        ${horizon.map((p) => {
          const id = p.family.meta.id;
          const isFocus = id === focusId;
          const plant = `<cat-plant size="horizon" stage="ancient" ${isFocus ? 'data-tended-plant' : ''} ${p.state.landmark ? 'landmark' : ''}></cat-plant>`;
          // Names on approach only (Part 8.4): cat-plant's own standing
          // name plate (its foreground #wrap()) is legible at close range
          // but is never drawn by its horizon silhouette — a name plate on
          // a 3px-tall distant shape wouldn't read, so the ordinary far
          // view is correctly wordless even for a Landmark. On APPROACH
          // (10.4) the camera closes in and every focused plant gets its
          // name regardless, Landmark or not — that courtesy is this
          // wrapper's job specifically, not a duplicate of the (distance-
          // only) standing plate.
          return isFocus
            ? `<span class="grove-horizon__focus">${plant}<span class="grove-plant__name grove-plant__name--horizon">${escapeHTML(p.family.root.label)}</span></span>`
            : plant;
        }).join('')}
      </div>` : ''}
      <div class="grove-ambient" aria-hidden="true">${ambientEvent ? ambientMarkup(ambientEvent) : ''}</div>

      <div class="grove-slots">
        ${renderSlotsBackToFront(foreground, askingId, openSeedId, atmo, focusId)}
      </div>
    </div>
  `;
}

/**
 * A becalmed ground-layer backdrop with ONE specific family pinned into
 * the foreground's S4 seat (or the horizon, if it is already Ancient) —
 * Stage W4's shared staging for a session (Part 10.3) and a plant
 * approach (Part 10.4): the plant the learner's whole attention is on
 * stands exactly where the world would keep it, and the rest of the
 * scene renders exactly as the biome screen would show it right now.
 * Returns '' when the family has no living biome yet.
 * @param {{family, state, history, biome}} focusedView  the plant view
 *        for the family being tended/approached — its `state` may be a
 *        display override (a session's "about to grow" seed stand-in)
 *        rather than the raw computed state.
 */
export function focusedGroveSceneHTML(biome, ground, atmo, allFamilies, allSessions, seeds, focusedView, opts = {}) {
  if (!biome || biome.status !== 'living') return '';
  const scene = deriveBiomeScene(allFamilies, allSessions, biome.slug, Date.now(), seeds);
  const focusId = focusedView.family.meta.id;
  const others = scene.plants.filter((p) => p.family.meta.id !== focusId);
  const nonAncientOthers = others.filter((p) => p.state.stage !== 'ancient');
  const horizonOthers = others.filter((p) => p.state.stage === 'ancient');

  let horizon, foreground, overflowMature;
  if (focusedView.state.stage === 'ancient') {
    horizon = [...horizonOthers, focusedView];
    ({ foreground, overflowMature } = selectForegroundSlots(nonAncientOthers, scene.askingId, ROOTWOOD_FILL_ORDER.length));
  } else {
    horizon = horizonOthers;
    const sel = selectForegroundSlots(nonAncientOthers, scene.askingId, ROOTWOOD_FILL_ORDER.length - 1);
    foreground = [focusedView, ...sel.foreground];
    overflowMature = sel.overflowMature;
  }

  return groveSceneHTML(biome, ground, atmo,
    { horizon, foreground, overflowMature, askingId: scene.askingId, openSeedId: scene.openSeedId },
    { interactive: false, focusId, ...opts });
}

function renderSceneHTML(outlet, biome, scene, ground) {
  const { plants, askingId, openSeedId } = scene;
  const atmo = atmosphereFor();
  const sessionSeed = `biome:${biome.slug}:${new Date().toDateString()}`;
  const bloomingCount = plants.filter((p) => p.state.stage === 'mature' || p.state.stage === 'ancient').length;
  const ancientCount = plants.filter((p) => p.state.stage === 'ancient').length;
  const landmarkCount = plants.filter((p) => p.state.landmark).length;
  const event = pickAmbientEvent({ bloomingCount, ancientCount, landmarkCount, groundTier: ground.tier });

  const nonAncient = plants.filter((p) => p.state.stage !== 'ancient');
  const horizon = plants.filter((p) => p.state.stage === 'ancient');
  const { foreground, overflowMature } = selectForegroundSlots(nonAncient, askingId, ROOTWOOD_FILL_ORDER.length);

  outlet.innerHTML = `
    <section class="screen biome biome--enter">
      <button class="biome__ascend" id="biome-ascend" aria-label="${escapeHTML(VALLEY_LINES.toValley)}">
        <span aria-hidden="true">↑</span> ${escapeHTML(VALLEY_LINES.toValley)}
      </button>

      ${groveSceneHTML(biome, ground, atmo, { horizon, foreground, overflowMature, askingId, openSeedId }, { ambientEvent: event })}
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

function appendNote(outlet, text) {
  const note = document.createElement('p');
  note.className = 'grove-note';
  note.textContent = text;
  outlet.querySelector('.biome').appendChild(note);
}

/** Two adjacent slots can sit close enough (Appendix C.6's own spacing)
 *  that a large Mature plant in one visually reaches a smaller neighbour
 *  in another. Painting back-to-front — not in the fill-priority order
 *  candidates were chosen in — means whichever slot is genuinely nearer
 *  the viewer is also the one drawn on top, so it is the one a tap
 *  actually reaches wherever the two overlap: correct occlusion and
 *  predictable interaction from the same ordering, never a fill-order
 *  accident deciding which plant a tap lands on. */
const ROOTWOOD_BACK_TO_FRONT = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

function renderSlotsBackToFront(foreground, askingId, openSeedId, atmo, focusId = null) {
  const bySlotName = new Map();
  foreground.forEach((p, i) => bySlotName.set(ROOTWOOD_FILL_ORDER[i], p));
  return ROOTWOOD_BACK_TO_FRONT
    .filter((name) => bySlotName.has(name))
    .map((name) => plantSlotHTML(bySlotName.get(name), ROOTWOOD_SLOTS[name], askingId, openSeedId, atmo, focusId))
    .join('');
}

/**
 * One foreground plant, standing in its authored slot (Appendix C.6):
 * positioned and sized in plain percentages (base-anchored, so the
 * slot's (x, y) is where the plant meets the ground), with a contact
 * shadow and a small undergrowth tuft at its base (Part 10.2), and its
 * name wordless until approach — focus, peek, or the plant screen (Part
 * 8.4), never printed permanently on the wood.
 */
function plantSlotHTML(p, slot, askingId, openSeedId, atmo, focusId = null) {
  const id = p.family.meta.id;
  const isAsking = id === askingId;
  const isOpenSeed = id === openSeedId;
  const isFocus = id === focusId;
  const nest = hasNest(p.state);
  const heightPct = (STAGE_HEIGHT_PCT[p.state.stage] ?? STAGE_HEIGHT_PCT.open_ground) * slot.scale;
  const shadowShift = (SUN_OFFSET_SIGN[atmo.time] ?? 0) * 15;
  // The accessible name conveys the plant's NAME and, where it matters, its
  // invitation — never its growth stage (§16.3). Sighted learners read the
  // stage from the plant's form; screen-reader learners hear what to do.
  const aria = isAsking
    ? `${p.family.root.label}, ready to tend`
    : isOpenSeed
      ? `${p.family.root.label}, open ground`
      : p.family.root.label;
  // data-slot-scale: Stage W4's in-place growth (session.js) needs this
  // slot's own scale back to resize the container to the post-growth
  // stage's height without re-deriving which slot the plant stands in.
  const style = `left:${slot.x}%; bottom:${(100 - slot.y).toFixed(2)}%; height:${heightPct.toFixed(2)}%; aspect-ratio:${CAT_PLANT_ASPECT};`
    + ` --slot-shadow-color:${shadowColor(atmo.time)}; --slot-shadow-shift:${shadowShift.toFixed(0)}%;`;
  return `
    <button class="grove-plant grove-plant--slot grove-plant--${slot.band} ${isAsking ? 'grove-plant--asking' : ''} ${isOpenSeed ? 'grove-plant--invite' : ''}"
            data-plant-id="${id}" data-slot-scale="${slot.scale}" aria-label="${escapeHTML(aria)}" style="${style}">
      <span class="grove-plant__shadow" aria-hidden="true"></span>
      <span class="grove-plant__tuft" aria-hidden="true"></span>
      <span class="grove-plant__art">
        <cat-plant stage="${p.state.stage}" due="${p.state.due}" ${nest ? 'nest' : ''} ${isFocus ? 'data-tended-plant' : ''}
          seed="${escapeHTML(id)}" vigor="${p.state.vigor}"></cat-plant>
      </span>
      <span class="grove-plant__name">${escapeHTML(p.family.root.label)}</span>
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

/* ---- The cathedral's painted structure (THE WORLD Part 10.2, §5.2–5.3) ---- */

/** The two great background trunks: trees taller than the screen, which
 *  is the entire feeling of the biome (Part 10.2). A tapering two-tone
 *  mass (warm lit face, cool shade face, §5.2), grounded by the same
 *  contact/cast shadow pair every standing object gets. */
function trunksSVG(atmo) {
  return GREAT_TRUNKS.map(({ x, width }) => {
    const lit = litFace(TRUNK_BASE, atmo.time);
    const shade = shadeFace(TRUNK_BASE, atmo.time);
    const halfW = width / 2;
    const topW = width * 0.62;
    const midX = x - halfW * 0.12;
    return `
      <g class="grove-trunk" aria-hidden="true">
        ${trunkShadowSVG(x, 97, width, atmo)}
        <path fill="${shade}" d="M${(x - halfW).toFixed(1)},100 L${(midX - topW / 2).toFixed(1)},-14 L${midX.toFixed(1)},-14 L${(x - halfW * 0.18).toFixed(1)},100 Z"/>
        <path fill="${lit}" d="M${(x - halfW * 0.18).toFixed(1)},100 L${midX.toFixed(1)},-14 L${(midX + topW / 2).toFixed(1)},-14 L${(x + halfW).toFixed(1)},100 Z"/>
      </g>`;
  }).join('');
}

function trunkShadowSVG(bx, by, width, atmo) {
  const contact = contactShadow(bx, by, width, atmo.time);
  const cast = castsShadow(atmo.time, atmo.season) ? castShadow(bx, by, 16, width, atmo.time) : null;
  const ellipse = (s) => `<ellipse cx="${s.cx.toFixed(1)}" cy="${s.cy.toFixed(1)}" rx="${s.rx.toFixed(1)}" ry="${s.ry.toFixed(1)}" fill="${s.fill}" opacity="${s.opacity}"/>`;
  return `${cast ? ellipse(cast) : ''}${ellipse(contact)}`;
}

/** The canopy ceiling: three overhead masses in the deepest greens
 *  closing the top of the frame, with two sky-holes (Part 10.2). The
 *  masses are sized and placed so the holes are genuinely gaps BETWEEN
 *  them — the scene's own hour-coloured sky (already painted behind
 *  everything, §6.2) shows through on its own, rather than a separately
 *  drawn disc. A painted "eye" would have been the failure here: two
 *  same-height round patches on a rounded green mass reads as a face
 *  before it reads as a wood, and a real screenshot is the only way
 *  that mistake is ever actually caught. By night the gaps carry a thin
 *  "moon-silver" rim (§5.4) — a stroke only, never a filled disc. */
function ceilingSVG(atmo) {
  const masses = [
    { x: 10, y: 6, rx: 15, ry: 10, c: CANOPY_STACK[0] },
    { x: 46, y: 4, rx: 11, ry: 10, c: CANOPY_STACK[1] },
    { x: 85, y: 7, rx: 18, ry: 11, c: CANOPY_STACK[2] },
  ];
  const body = masses.map((m) =>
    `<ellipse cx="${m.x}" cy="${m.y}" rx="${m.rx}" ry="${m.ry}" fill="${litFace(m.c, atmo.time)}"/>`
    + `<ellipse cx="${(m.x - m.rx * 0.28).toFixed(1)}" cy="${(m.y + m.ry * 0.3).toFixed(1)}" rx="${(m.rx * 0.55).toFixed(1)}" ry="${(m.ry * 0.5).toFixed(1)}" fill="${shadeFace(m.c, atmo.time)}"/>`,
  ).join('');
  const rims = atmo.time === 'night'
    ? SKY_HOLES.map((h) => `<ellipse class="grove-hole-rim" cx="${h.x}" cy="${h.y}" rx="${h.rx}" ry="${h.ry}" fill="none"/>`).join('')
    : '';
  return `<g class="grove-ceiling">${body}${rims}</g>`;
}

/** The three light shafts (§5.3): soft translucent wedges, feathered by
 *  layering (never a blur filter) — falling through the trunk gaps,
 *  angled by the hour's actual sun side, absent at night. */
function shaftsSVG(atmo) {
  const tilt = SHAFT_TILT[atmo.time];
  if (tilt === undefined) return '';
  const sign = SUN_OFFSET_SIGN[atmo.time] ?? 0;
  const dx = SHAFT_FALL * tilt * sign;
  const color = litFace(SHAFT_BASE, atmo.time);
  const botY = SHAFT_TOP_Y + SHAFT_FALL;
  const wedge = (topX, botX, halfTop, halfBot, opacity, delay) => `
    <polygon class="grove-shaft" style="animation-delay:${delay}s" opacity="${opacity}"
      points="${(topX - halfTop).toFixed(1)},${SHAFT_TOP_Y} ${(topX + halfTop).toFixed(1)},${SHAFT_TOP_Y}
              ${(botX + halfBot).toFixed(1)},${botY} ${(botX - halfBot).toFixed(1)},${botY}"
      fill="${color}"/>`;
  return SHAFT_X.map((x, i) => {
    const botX = x + dx;
    const wOuter = SHAFT_WIDTH_PCT / 2;
    const wInner = wOuter * 0.5;
    const delay = i * 7;
    return wedge(x, botX, wOuter, wOuter * 1.35, 0.1, delay) + wedge(x, botX, wInner, wInner * 1.35, 0.16, delay);
  }).join('');
}

/** The mid-wood band (Part 8.5): unlabelled canopy masses standing in
 *  for every Mature family the seven slots had no room for. Fixed
 *  positions, revealed by count only — the wood deepens, it never
 *  reshuffles (Part 7.2). */
function midWoodSVG(overflowCount, atmo) {
  const slots = MID_WOOD_SLOTS.slice(0, Math.min(overflowCount, MID_WOOD_SLOTS.length));
  return slots.map((s, i) => {
    const base = CANOPY_STACK[i % CANOPY_STACK.length];
    const lean = ((seedFrom(`mw-${i}`) % 100) / 100 - 0.5) * 4;
    const cx = (s.x + lean).toFixed(1);
    return `
      <ellipse class="grove-midwood" cx="${cx}" cy="${s.y}" rx="${s.r}" ry="${(s.r * 0.82).toFixed(1)}" fill="${litFace(base, atmo.time)}"/>
      <ellipse class="grove-midwood" cx="${(s.x + lean - s.r * 0.42).toFixed(1)}" cy="${(s.y + s.r * 0.32).toFixed(1)}" rx="${(s.r * 0.5).toFixed(1)}" ry="${(s.r * 0.42).toFixed(1)}" fill="${shadeFace(base, atmo.time)}"/>`;
  }).join('');
}

/** The stream, seen only as one glint through the trunks (Part 10.2) —
 *  never drawn as visible water inside the wood. */
function streamGlintSVG() {
  return '<path class="grove-glint" d="M2,35.5 Q5.5,38.5 4,42" fill="none"/>';
}

/** Night: fireflies among the near trunks (Part 10.2), a small fixed
 *  cluster near the floor, breathing on its own unsynchronised cycle —
 *  distinct from the rare per-visit ambient firefly visitor, which is a
 *  Magic Moment, not a standing feature of the night scene itself. */
function nightFirefliesSVG() {
  const POINTS = [{ x: 16, y: 90, d: 0 }, { x: 83, y: 92, d: 1.6 }, { x: 12, y: 80, d: 3.1 }];
  return POINTS.map((p) => `
    <circle class="grove-cathedral-firefly-glow" style="animation-delay:${p.d}s" cx="${p.x}" cy="${p.y}" r="3.2"/>
    <circle class="grove-cathedral-firefly" style="animation-delay:${p.d}s" cx="${p.x}" cy="${p.y}" r="0.65"/>`).join('');
}

/** Dawn: mist bands between the far trunks (Part 10.2) — layered
 *  translucent shapes, never a blur filter (§11.7). Sits below the
 *  ceiling's own gaps, so it reads as low mist in the wood rather than
 *  adding a second pale shape right where the sky already shows through. */
function dawnMistSVG() {
  return `
    <ellipse class="grove-cathedral-mist" cx="40" cy="24" rx="20" ry="3.2"/>
    <ellipse class="grove-cathedral-mist grove-cathedral-mist--2" cx="64" cy="29" rx="17" ry="2.8"/>`;
}
