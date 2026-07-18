/**
 * overlook.js (screen) — the Overlook: home, and the most important
 * screen in the product (LANGUAGE_GARDEN_BIBLE §16.1). The whole valley,
 * seen from above, wordless (§13.4), on one screen with no scrolling
 * (§4.1). You arrive here, and arriving is meant to be good.
 *
 * The valley is a single, simpler, more distant scene than a biome
 * (§11.7): flat layered-vector landforms, the Rootwood living at its
 * heart, the six other regions simply land until they are cultivated —
 * real geography, never "coming soon", never a grid of empty slots
 * (§5.8, Principle 64). Tapping the Rootwood descends into it. Tapping
 * any wild region is ACKNOWLEDGED — the land breathes once under the
 * hand — because a world that ignores a touch feels broken, and nothing
 * here may ever feel broken (Visual Guide 19.1, Phase 4.9).
 *
 * Arrival is a cross-dissolve of light, never a loading state (Visual
 * Guide 17.2, 24.1: no spinner, no skeleton, ever): the world fades up
 * from a warm dark, as if assembling from light.
 *
 * First open, ever (§3.1): there is no splash, no tour, no menu. If
 * nothing has grown, the learner is taken straight into the first
 * family's session — "the first Attempt is the first thing they touch".
 * They arrive at the Overlook for the first time ninety seconds later,
 * and it already has something growing in it.
 *
 * The Stream's level, brightness, and sound are the consistency signal
 * (§8.4, Roadmap 3.1); the Ground and Paths carry the Effort Ledger
 * (§4.3–4.4, 3.2); the sky carries the five-state clock, the calendar's
 * season, and the seeded weather (§4.5–§4.7, 3.4/3.6); and the Gate at
 * the valley's edge leads out to the rest of CAT OS (§16.9, 3.5). At
 * night, one small warm lantern light waits at the Gate — a found
 * detail, never announced (Visual Guide 28.1).
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions, listGardenSeeds } from '../logic/store.js';
import { deriveValleyScene } from '../logic/scene.js';
import { biomeBySlug, BIOMES } from '../logic/biomes.js';
import { computeStreamLevel, streamBand, computeGroundTier, computePathWear } from '../logic/effort.js';
import { atmosphereFor } from '../logic/atmosphere.js';
import { weatherLayerHTML, nightSkySVG, sunDiscSVG, cloudsSVG } from './atmosphere-art.js';
import { litFace, shadeFace, contactShadow, castsShadow, castShadow } from '../logic/light.js';
import { VALLEY_LINES } from '../../../core/mentor/garden-voice.js';
import { escapeHTML } from '../../../core/utils/format.js';
import '../../../ui/components/cat-plant.js';

export async function renderOverlook(outlet, context) {
  // No skeleton, ever (Visual Guide 24.1). The data is local and fast;
  // until it lands the learner sees calm paper, then the world fades up.
  outlet.innerHTML = '';

  let families, sessions, seeds;
  try {
    const registry = await listLGItems();
    const loaded = await loadLGItems(registry.map((i) => i.id));
    families = registry.map((i) => loaded.get(i.id)).filter(Boolean)
      .sort((a, b) => a.meta.id.localeCompare(b.meta.id));
    sessions = await listGardenSessions(context.storage);
    seeds = await listGardenSeeds(context.storage);
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>The valley will not open</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }

  if (families.length === 0) {
    outlet.innerHTML = `<section class="screen"><div class="empty">
      <div class="empty__glyph" aria-hidden="true">⚘</div>
      <h2>The valley is waiting</h2>
      <p>Add a plant to <code>content/language-garden/</code> to begin.</p>
    </div></section>`;
    return;
  }

  // First open, ever: no Overlook yet — the learner goes straight into the
  // first family's session (§3.1). A real hash change (not a direct render
  // call) so the session's own "back" navigation behaves normally.
  if (sessions.length === 0) {
    location.hash = `#/garden/session/${families[0].meta.id}`;
    return;
  }

  const scene = deriveValleyScene(families, sessions, Date.now(), seeds);
  const rootwoodSessions = (scene.byBiome.get('rootwood') ?? []).flatMap((p) => p.history);
  const level = computeStreamLevel(sessions);
  const effort = {
    streamBand: streamBand(level),
    ground: computeGroundTier(sessions),
    rootwoodPathWear: computePathWear(rootwoodSessions),
  };
  renderValley(outlet, scene, effort);
}

/* ------------------------------------------------------------------ */
/* The valley, as layered flat shapes. Coordinates are a 360×560       */
/* portrait field; the SVG fills the immersive viewport (cover).       */
/* Region placement follows the Bible's map (§4.1); the compass in     */
/* logic/biomes.js is the source of truth for WHERE, this is the art   */
/* that turns it into ground. Every boundary is organic and asymmetric */
/* (Visual Guide 5.2: symmetry in nature reads as fake), and the far   */
/* planes are cooler, paler, lower-contrast (aerial perspective, 10.2).*/
/* ------------------------------------------------------------------ */

/** The wild regions a tap acknowledges, with their hit geometry. The
 *  Rootwood and the Gate keep their own dedicated hits. */
const WILD_HITS = [
  { slug: 'wilds', shape: `<rect class="vl-hit vl-hit--wild" data-wild="wilds" x="0" y="98" width="360" height="42"/>` },
  { slug: 'meadow', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="meadow" cx="50" cy="298" rx="70" ry="44"/>` },
  { slug: 'terraces', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="terraces" cx="318" cy="246" rx="42" ry="72"/>` },
  { slug: 'pond', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="pond" cx="180" cy="372" rx="50" ry="28"/>` },
  { slug: 'orchard', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="orchard" cx="174" cy="462" rx="98" ry="42"/>` },
  { slug: 'thicket', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="thicket" cx="330" cy="452" rx="34" ry="52"/>` },
];

function renderValley(outlet, scene, effort) {
  const rootwood = biomeBySlug('rootwood');
  const rootwoodPlants = (scene.byBiome.get('rootwood') ?? [])
    .filter((p) => p.state.stage !== 'open_ground' && p.state.stage !== 'seed');
  const litInRootwood = scene.askingBiomeSlug === 'rootwood' ? scene.askingId : null;

  const atmo = atmosphereFor();
  const wildLabel = (slug) => {
    const b = BIOMES.find((x) => x.slug === slug);
    return VALLEY_LINES.wildBiome(b ? b.name : slug);
  };
  outlet.innerHTML = `
    <section class="screen valley-screen" aria-label="${escapeHTML(VALLEY_LINES.overlookLabel)}">
      <div class="valley" data-time="${atmo.time}" data-season="${atmo.season}"
           data-weather="${atmo.weather}" data-stream="${effort.streamBand}">
        <svg class="valley__svg" viewBox="0 0 360 560" preserveAspectRatio="xMidYMid slice">
          ${landforms()}
          ${cloudsSVG()}
          ${sunDiscSVG(atmo.time)}
          ${atmo.time === 'night' ? nightSkySVG() : ''}
          ${groundMarks(effort.ground.tier)}
          ${path(effort.rootwoodPathWear)}
          ${stream()}
          ${gate(atmo)}
          ${rootwoodCanopy(rootwoodPlants, litInRootwood, atmo)}
          ${mist()}
          <!-- The interactive shapes live inside the SVG so they always
               line up with the drawn world, whatever the crop. The wild
               regions acknowledge a touch (the land breathes once); only
               the living region and the Gate lead anywhere. -->
          ${WILD_HITS.map(({ slug, shape }) =>
            shape.replace('/>', ` role="button" tabindex="0" aria-label="${escapeHTML(wildLabel(slug))}"/>`)).join('')}
          <ellipse class="vl-hit" id="enter-rootwood" cx="180" cy="236" rx="130" ry="84"
                   role="button" tabindex="0"
                   aria-label="${escapeHTML(VALLEY_LINES.enterBiome(rootwood.name))}"></ellipse>
          <rect class="vl-hit" id="leave-gate" x="206" y="486" width="60" height="58"
                role="button" tabindex="0"
                aria-label="${escapeHTML(VALLEY_LINES.gateLabel)}"></rect>
        </svg>
        ${weatherLayerHTML(atmo.weather)}
        <div class="valley__veil" aria-hidden="true"></div>
      </div>

      <nav class="valley__marks" aria-label="Garden">
        <button class="valley__mark" id="gate-mark">${escapeHTML(VALLEY_LINES.gate)}</button>
        <a class="valley__mark" href="#/garden/journal">${escapeHTML(VALLEY_LINES.journal)}</a>
        <a class="valley__mark" href="#/settings">${escapeHTML(VALLEY_LINES.settings)}</a>
      </nav>
    </section>
  `;

  // Descend: a brief zoom toward the Rootwood, then navigate. Combined with
  // the biome's own entrance, it reads as walking down a hill (§4.1), not a
  // page load. Reduced motion skips straight to the biome.
  const valley = outlet.querySelector('.valley');
  const descend = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { location.hash = '#/garden/biome/rootwood'; return; }
    valley.classList.add('is-descending');
    setTimeout(() => { location.hash = '#/garden/biome/rootwood'; }, 260);
  };
  const hit = outlet.querySelector('#enter-rootwood');
  hit.addEventListener('click', descend);
  hit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); descend(); }
  });

  // A wild region acknowledges the hand (Phase 4.9, Visual Guide 19.1,
  // 19.3: "touching a still pond and watching it answer"): the land
  // breathes once — a soft luminance swell, no words, no dialog, no
  // "coming soon" (§5.8). The world noticed; it is simply still wild.
  for (const hitEl of outlet.querySelectorAll('[data-wild]')) {
    const region = outlet.querySelector(`[data-region="${hitEl.dataset.wild}"]`);
    const breathe = () => {
      if (!region) return;
      region.classList.remove('is-breathing');
      // Restart the one-shot animation if the learner touches it again.
      void region.getBoundingClientRect();
      region.classList.add('is-breathing');
    };
    hitEl.addEventListener('click', breathe);
    hitEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); breathe(); }
    });
  }

  // Leaving through the Gate (§16.9, §19.2): a small journey rather than a
  // tab switch — the view drifts down toward the gate at the valley's edge,
  // then the rest of CAT OS. No dialog, no confirmation (§14.6).
  const leave = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { location.hash = '#/home'; return; }
    valley.classList.add('is-leaving');
    setTimeout(() => { location.hash = '#/home'; }, 420);
  };
  const gateHit = outlet.querySelector('#leave-gate');
  gateHit.addEventListener('click', leave);
  gateHit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); leave(); }
  });
  outlet.querySelector('#gate-mark').addEventListener('click', leave);
}

/** The permanent geography: a pale far ridge, the Wilds beneath it, the
 *  valley basin, and the seven regions as organic patches — one living,
 *  six still wild. Nothing is a perfect ellipse; every boundary leans
 *  (Visual Guide 5.2, 7.3). The far planes are the palest and coolest
 *  (aerial perspective, 10.2). */
function landforms() {
  return `
    <!-- The sky (§6.2): a three-stop gradient — zenith, mid, horizon —
         re-toned per hour by CSS custom properties on [data-time]. -->
    <defs>
      <linearGradient id="vl-sky-grad" x1="0" y1="0" x2="0" y2="1">
        <stop class="vl-sky-stop vl-sky-stop--zenith" offset="0%"/>
        <stop class="vl-sky-stop vl-sky-stop--mid" offset="55%"/>
        <stop class="vl-sky-stop vl-sky-stop--horizon" offset="100%"/>
      </linearGradient>
    </defs>
    <rect class="vl-sky" x="0" y="0" width="360" height="138" fill="url(#vl-sky-grad)"/>
    <!-- The sky-going-green seam (§6.2): a thin band, dusk only. -->
    <rect class="vl-sky-seam" x="0" y="107.6" width="360" height="8.3"/>

    <!-- The farthest ridge: palest, coolest, almost still (Guide 10.1). -->
    <path class="vl-ridge" d="M0,134 L0,112 Q52,96 112,108 Q182,90 248,106
      Q312,94 360,110 L360,134 Z"/>

    <!-- The Wilds: always visible on the horizon, never entered (§5.8),
         unreachable by design — the far ridge's own colour under a
         permanent, low mist wash (§6.3, §6.5). -->
    <g class="vl-region" data-region="wilds">
      <path class="vl-wilds" d="M0,142 L0,120 Q50,104 96,116 Q150,98 200,114
        Q250,96 306,116 Q336,106 360,120 L360,142 Z"/>
      <path class="vl-wilds-mist" d="M0,142 L0,120 Q50,104 96,116 Q150,98 200,114
        Q250,96 306,116 Q336,106 360,120 L360,142 Z"/>
    </g>

    <!-- The valley basin, seen from above, with a lower fold for depth. -->
    <path class="vl-basin" d="M0,136 Q180,116 360,136 L360,560 L0,560 Z"/>
    <path class="vl-basin-2" d="M0,396 Q120,368 220,384 Q300,394 360,386 L360,560 L0,560 Z"/>

    <!-- West: the Meadow, spilling off the edge like real terrain. -->
    <g class="vl-region" data-region="meadow">
      <path class="vl-meadow" d="M-16,262 Q28,242 76,254 Q108,264 112,286
        Q114,312 88,330 Q46,350 -16,342 Z"/>
    </g>

    <!-- East: the Vine Terraces on the morning slope, with step lines. -->
    <g class="vl-region" data-region="terraces">
      <path class="vl-terrace" d="M282,170 Q318,174 344,190 Q358,198 360,206 L360,326
        Q328,318 286,324 Q270,272 274,216 Q276,190 282,170 Z"/>
      <path class="vl-terrace-step" d="M288,224 Q326,226 356,242"/>
      <path class="vl-terrace-step" d="M284,266 Q322,270 354,286"/>
    </g>

    <!-- South-east: the Thicket, tangled and dark, curling in from the corner. -->
    <g class="vl-region" data-region="thicket">
      <path class="vl-thicket" d="M310,398 Q338,388 354,402 Q362,410 360,424 L360,508
        Q336,508 314,500 Q298,494 300,466 Q298,428 310,398 Z"/>
      <path class="vl-thicket-curl" d="M318,428 q12,-5 19,3 q5,7 -2,12"/>
      <path class="vl-thicket-curl" d="M312,470 q10,-7 19,-2"/>
    </g>

    <!-- South: the Orchard, open and low. -->
    <g class="vl-region" data-region="orchard">
      <path class="vl-orchard" d="M86,430 Q130,404 208,406 Q262,410 276,436
        Q286,466 250,488 Q196,512 118,504 Q70,494 66,462 Q66,442 86,430 Z"/>
    </g>

    <!-- North / centre: the living Rootwood ground, richer and the clear
         heart — one organic clearing, no drawn ring (a boundary line would
         read as interface; the richer green alone says "tended"). A soft
         wood-shadow lies along its southern edge only, where the trees'
         shade would fall (one light direction, Guide 11.4). -->
    <path class="vl-grove-shade" transform="translate(4 8)" d="M60,232 Q58,192 104,164 Q152,146 206,152
      Q252,160 276,190 Q292,216 282,252 Q266,286 220,298 Q156,308 110,288 Q64,266 60,232 Z"/>
    <path class="vl-grove" d="M60,232 Q58,192 104,164 Q152,146 206,152
      Q252,160 276,190 Q292,216 282,252 Q266,286 220,298 Q156,308 110,288 Q64,266 60,232 Z"/>`;
}

/** The Ground (§4.3, Roadmap 3.2): the Effort Ledger made visible, drawn
 *  in a fixed safe band just south of the Rootwood grove where it never
 *  collides with a region shape or a canopy. Never random — MARK_COUNT_BY_TIER
 *  reveals more of the same fixed set as lifetime effort accumulates; nothing
 *  ever rearranges, it only thickens (mirrors logic/effort.js exactly). */
const GROUND_MARKS = [
  { x: 112, y: 332, kind: 'moss' },
  { x: 250, y: 330, kind: 'moss' },
  { x: 135, y: 340, kind: 'wildflower' },
  { x: 225, y: 342, kind: 'wildflower' },
  { x: 160, y: 328, kind: 'fern' },
  { x: 200, y: 334, kind: 'fern' },
  { x: 180, y: 344, kind: 'wildflower' },
  { x: 120, y: 338, kind: 'moss' },
];
const MARK_COUNT_BY_TIER = { bare: 0, tended: 2, growing: 4, flourishing: 6, lush: 8 };

function groundMarks(tier) {
  const n = MARK_COUNT_BY_TIER[tier] ?? 0;
  return GROUND_MARKS.slice(0, n).map((m) => {
    if (m.kind === 'moss') return `<ellipse class="vl-mark vl-mark--moss" cx="${m.x}" cy="${m.y}" rx="9" ry="4"/>`;
    if (m.kind === 'fern') return `<path class="vl-mark vl-mark--fern" d="M${m.x},${m.y + 5} Q${m.x - 4},${m.y - 1} ${m.x},${m.y - 6} Q${m.x + 4},${m.y - 1} ${m.x},${m.y + 5} Z"/>`;
    return `<circle class="vl-mark vl-mark--wildflower" cx="${m.x}" cy="${m.y}" r="2.1"/>`;
  }).join('');
}

/** The one visible Path (§4.4): from the valley's edge up to the Rootwood,
 *  the only region walked today. Wear never erases it — a neglected path is
 *  softened by moss, never broken (logic/effort.js computePathWear()). */
function path(wear) {
  return `<path class="vl-path vl-path--${wear}" d="M235,540 C224,478 214,412 205,345"/>`;
}

/** The Stream and the Mirror Pond. The stream runs from the Rootwood,
 *  through the pond, and out to the west (§4.2) — a soft meandering
 *  RIBBON that widens downstream, never a uniform rope (Visual Guide
 *  8.1: never a straight canal). Its fullness and brightness are the
 *  consistency signal (§8.4), carried by [data-stream] on .valley: a
 *  quiet stream is thinner and stiller, and it NEVER runs dry. */
function stream() {
  return `
    <g class="vl-water" aria-hidden="true">
      <!-- Upper reach: out of the Rootwood's eastern side, down to the pond. -->
      <path class="vl-stream-under" d="M202,206 C190,252 157,300 170,352 L177,354
        C164,300 196,252 207,206 Z"/>
      <path class="vl-stream" d="M202,206 C190,252 157,300 170,352 L177,354
        C164,300 196,252 207,206 Z"/>
      <!-- Lower reach: out of the pond, west to the valley's edge. -->
      <path class="vl-stream-under" d="M158,388 C118,414 72,448 18,524 L23,528
        C82,452 126,420 164,393 Z"/>
      <path class="vl-stream" d="M158,388 C118,414 72,448 18,524 L23,528
        C82,452 126,420 164,393 Z"/>
      <!-- Drifting highlights: the water's slow life (Guide 8.1) — the one
           permitted linear motion, and it never syncs to anything. -->
      <path class="vl-glint" d="M204,208 C193,252 162,300 173,350"/>
      <path class="vl-glint vl-glint--2" d="M158,390 C120,416 76,448 22,522"/>
    </g>
    <!-- The Mirror Pond, still, at the low centre (§4.2): a soft uneven
         oval, its reflection a quiet offset of sky, never a ring. -->
    <g class="vl-region" data-region="pond">
      <path class="vl-pond" d="M152,368 Q156,356 176,352 Q196,349 208,358
        Q216,366 211,378 Q204,390 182,392 Q160,392 153,381 Q149,375 152,368 Z"/>
      <ellipse class="vl-pond-sky" cx="178" cy="364" rx="12" ry="3.6" transform="rotate(-7 178 364)"/>
    </g>`;
}

/** The Gate (§4.9, §16.9): at the valley's edge, where the path leaves.
 *  Two posts and a lintel, low contrast, warm stone — a place, drawn as
 *  part of the world, that happens to lead out. At night it keeps one
 *  small warm light: a found delight, never announced (Guide 28.1). Its
 *  posts ground the world with the same shadow every standing thing
 *  gets (§5.2), and the lantern's glow pool is pinned at 7% of frame
 *  width (§5.4). */
function gate(atmo) {
  const lantern = atmo.time === 'night' || atmo.time === 'dusk'
    ? `<circle class="vl-lantern-glow" cx="247" cy="518" r="${(0.07 * 360).toFixed(1)}"/>
       <circle class="vl-lantern" cx="247" cy="518" r="1.8"/>`
    : '';
  const shadows = shadowPairSVG(235, 540, 20, 19, atmo);
  return `
    <g class="vl-gate" aria-hidden="true">
      ${shadows}
      <path class="vl-gate-post" d="M227,540 L227,521"/>
      <path class="vl-gate-post" d="M243,540 L243,521"/>
      <path class="vl-gate-lintel" d="M223,521 Q235,514 247,521"/>
      ${lantern}
    </g>`;
}

/** Low mist in the hollows (Visual Guide 11.3): layered translucent
 *  shapes, never a blur filter. Drawn always; CSS shows it only at dawn
 *  and at night, where it does the most emotional work. It softens the
 *  middle distance and leaves the near reading intact. */
function mist() {
  return `
    <g class="vl-mist-layer" aria-hidden="true">
      <ellipse class="vl-mist" cx="110" cy="332" rx="130" ry="15"/>
      <ellipse class="vl-mist vl-mist--2" cx="262" cy="418" rx="112" ry="13"/>
    </g>`;
}

/** The ground shadow under one standing object (§5.2, Stage W1): a cast
 *  shadow (dawn, dusk, or autumn only) plus a contact shadow, always —
 *  both agreeing with the same hour's sun. bx/by is the object's base
 *  (where it meets the ground); width/height are its own size. */
function shadowPairSVG(bx, by, width, height, atmo) {
  const cast = castsShadow(atmo.time, atmo.season)
    ? castShadow(bx, by, height, width, atmo.time)
    : null;
  const contact = contactShadow(bx, by, width, atmo.time);
  const ellipse = (s, cls) =>
    `<ellipse class="${cls}" cx="${s.cx.toFixed(1)}" cy="${s.cy.toFixed(1)}" rx="${s.rx.toFixed(1)}" ry="${s.ry.toFixed(1)}" fill="${s.fill}" opacity="${s.opacity}"/>`;
  return `${cast ? ellipse(cast, 'vl-cast-shadow') : ''}${ellipse(contact, 'vl-contact-shadow')}`;
}

/** A tiny stable lean for the Overlook's distant trees — identity at
 *  valley scale, mirroring cat-plant's own seeded character. */
function miniLean(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h >>> 0) % 100) / 100 * 5 - 2.5;
}

/** Stage body colours, mirroring tokens.css's --garden-{stage} values
 *  exactly (kept here too so the painted-light recipe, logic/light.js,
 *  can mix them per hour before the markup is ever inserted). */
const STAGE_COLOR = Object.freeze({
  sprout: '#A8D5A2', young: '#7CBB74', in_leaf: '#4F9A5C',
  mature: '#3D7E4E', ancient: '#2B5D3F',
});

/** The Rootwood, from a distance: a small cluster of two-mass canopies,
 *  one per grown plant — tiny trees, not lollipops, each with its own
 *  lean. The single valley-wide invitation (if it is in the Rootwood)
 *  glows amber — at most one, ever, at Overlook zoom (§16.1). A Landmark
 *  (§6.5) is singled out even from here: deeper evergreen, a nest, and,
 *  after dark, a few fireflies gathered at it. Every tree's two masses
 *  carry a lit face and a shade face (§5.2), and stands its own ground
 *  shadow; the lit (asking) tree is the one exception — a signal colour
 *  is never dimmed by the hour, so it out-reads the whole valley (§6.6). */
function rootwoodCanopy(plants, litId, atmo) {
  if (plants.length === 0) return '';
  // A gentle deterministic arc across the Rootwood ground — never random,
  // so the wood looks the same each time the learner arrives.
  const cx = 168, cy = 232, spanX = 150, spanY = 36;
  const n = plants.length;
  const night = atmo?.time === 'night';
  return plants.map((p, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const lean = miniLean(p.family.meta.id);
    const x = cx - spanX / 2 + spanX * t + lean;
    // Continuous refinement even at valley scale (§6.3): vigor nudges the
    // radius so a well-held tree reads a hair fuller from the Overlook too.
    const r = canopyRadius(p.state.stage) + (p.state.vigor ?? 0) * 1.6;
    const isLandmark = p.state.landmark;
    // Landmarks stand a touch prouder on the arc.
    const y = cy + Math.sin(t * Math.PI) * -spanY + (i % 2) * 10 - (isLandmark ? 4 : 0);
    const lit = p.family.meta.id === litId;
    const stageCls = `vl-canopy vl-canopy--${p.state.stage}${isLandmark ? ' vl-canopy--landmark' : ''}${lit ? ' vl-canopy--lit' : ''}`;
    // The lit (asking) tree keeps its pure signal colour, unmixed by the
    // hour (§6.6); every other tree gets the painted-light split.
    const base = isLandmark ? STAGE_COLOR.ancient : (STAGE_COLOR[p.state.stage] ?? STAGE_COLOR.young);
    const faceStyle = lit ? '' : ` style="fill:${litFace(base, atmo.time)}"`;
    const shadeStyle = lit ? '' : ` style="fill:${shadeFace(base, atmo.time)}"`;
    const glow = lit ? `<circle class="vl-canopy-glow" cx="${x.toFixed(1)}" cy="${(y - 2).toFixed(1)}" r="${(r + 9).toFixed(1)}"/>` : '';
    const nest = isLandmark
      ? `<ellipse class="vl-canopy-nest" cx="${(x + r * 0.5).toFixed(1)}" cy="${(y + 1).toFixed(1)}" rx="2.6" ry="1.6"/>`
      : '';
    // Fireflies (§9.3, §5.4): each is a 0.4%-radius dot with its own
    // 2%-radius glow; a Landmark's gathered fireflies additionally share
    // one 5%-radius pool, all pinned shares of frame width (360).
    const fireflies = (isLandmark && night)
      ? `<ellipse class="vl-landmark-glow" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(0.05 * 360).toFixed(1)}" ry="${(0.05 * 360 * 0.6).toFixed(1)}"/>` +
        [[-4, -6], [5, -3], [1, 4]].map(([dx, dy], k) => `
          <circle class="vl-firefly-glow" style="animation-delay:${k * 0.9}s" cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${(0.02 * 360).toFixed(1)}"/>
          <circle class="vl-firefly" style="animation-delay:${k * 0.9}s" cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${(0.004 * 360).toFixed(1)}"/>`).join('')
      : '';
    const shadows = shadowPairSVG(x, y + r + 3, r * 1.3, r * 2, atmo);
    return `
      ${shadows}
      ${glow}
      <path class="vl-canopy-trunk" d="M${(x - lean * 0.6).toFixed(1)},${(y + r + 5).toFixed(1)} L${x.toFixed(1)},${(y + r - 2).toFixed(1)}"/>
      <ellipse class="${stageCls}"${faceStyle} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.88).toFixed(1)}"/>
      <ellipse class="${stageCls}"${shadeStyle} cx="${(x - r * 0.66).toFixed(1)}" cy="${(y + r * 0.28).toFixed(1)}" rx="${(r * 0.56).toFixed(1)}" ry="${(r * 0.46).toFixed(1)}"/>
      ${nest}${fireflies}`;
  }).join('');
}

function canopyRadius(stage) {
  return { sprout: 4, young: 7, in_leaf: 9, mature: 11, ancient: 13 }[stage] ?? 7;
}
