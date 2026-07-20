/**
 * overlook.js (screen) — the Overlook: home, and the most important
 * screen in the product (LANGUAGE_GARDEN_BIBLE §16.1). The whole valley,
 * seen from above, wordless (§13.4), on one screen with no scrolling
 * (§4.1). You arrive here, and arriving is meant to be good.
 *
 * Phase V, Stage W2 (LANGUAGE GARDEN — THE WORLD.md Part 3–4, Appendix C):
 * the map is the one composed geography — sky, far ridges, the high
 * shoulder (the Rootwood and the Vine Terraces), the valley floor (the
 * Mirror Pond, the Meadow, the Orchard, the Thicket), and the Hearth
 * plane in the foreground, where the learner stands. Every fixed
 * position below is transcribed from Appendix C, THE WORLD's single
 * authored source of coordinates — nothing here is improvised.
 *
 * The Hearth (Part 4) is the home: a stone cottage whose gable and warm
 * window edge the frame, a bench, a lantern, a low dry-stone wall with
 * the Gate set into it, and the head of the path. It is given whole from
 * day one (Constitution 8 — a home that must be unlocked is a debt), and
 * its window is lit at every dusk and every night, unconditionally,
 * never because of anything the learner did or failed to do.
 *
 * The Rootwood, at this distance, is no longer individual trees in an
 * ellipse (that read as a diagram, THE WORLD Part 1's own honest
 * complaint about the pre-repaint build). It is a wood: a fixed,
 * seeded cluster of overlapping canopy masses whose count deepens with
 * mastery (Part 3.2, Part 8.5), and — at most one, ever — a soft amber
 * light inside the canopy where a family is waiting (§16.1's one
 * invitation, never a backlog).
 *
 * The Stream's level, brightness, and sound are the consistency signal
 * (§8.4, Roadmap 3.1); the Ground and Paths carry the Effort Ledger
 * (§4.3–4.4, 3.2); the sky carries the five-state clock, the calendar's
 * season, and the seeded weather (§4.5–§4.7, 3.4/3.6); and the Gate, set
 * in the Hearth's wall, leads out to the rest of CAT OS (§16.9, 3.5,
 * THE WORLD Part 10.1: from W2 onward it is the valley's only exit).
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions, listGardenSeeds } from '../logic/store.js';
import { deriveValleyScene } from '../logic/scene.js';
import { biomeBySlug, BIOMES } from '../logic/biomes.js';
import { computeStreamLevel, streamBand, computeGroundTier, computePathWear } from '../logic/effort.js';
import { atmosphereFor } from '../logic/atmosphere.js';
import { pickHearthCat } from '../logic/ambient.js';
import { maybeKettleTick } from '../logic/audio.js';
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
  const rootwoodPlants = scene.byBiome.get('rootwood') ?? [];
  const rootwoodSessions = rootwoodPlants.flatMap((p) => p.history);
  const level = computeStreamLevel(sessions);
  const effort = {
    streamBand: streamBand(level),
    ground: computeGroundTier(sessions),
    rootwoodPathWear: computePathWear(rootwoodSessions),
  };
  const rootwood = {
    matureCount: rootwoodPlants.filter((p) => p.state.stage === 'mature' || p.state.stage === 'ancient').length,
    hasLandmark: rootwoodPlants.some((p) => p.state.landmark),
    litId: scene.askingBiomeSlug === 'rootwood' ? scene.askingId : null,
  };
  renderValley(outlet, rootwood, effort);
}

/* ------------------------------------------------------------------ */
/* The valley, as layered flat shapes. Coordinates are a 360×560       */
/* portrait field (100% width = 360, 100% height = 560), matching      */
/* Appendix C's percent-of-frame convention exactly. Every boundary is  */
/* organic and asymmetric (Visual Guide 5.2: symmetry in nature reads   */
/* as fake), and the far planes are cooler, paler, lower-contrast       */
/* (aerial perspective, 10.2). Draw order is Appendix C's plane order:  */
/* sky → far ridges → the high shoulder (Rootwood, Terraces) → the      */
/* valley floor (Pond, Meadow, Orchard, Thicket) → the Hearth plane,     */
/* which is drawn last because it is nearest the learner (Part 3.1).    */
/* ------------------------------------------------------------------ */

/** The wild regions a tap acknowledges, with their hit geometry —
 *  repositioned to THE WORLD Appendix C.7's founding geometry. The
 *  Rootwood and the Gate keep their own dedicated hits. */
const WILD_HITS = [
  { slug: 'wilds', shape: `<rect class="vl-hit vl-hit--wild" data-wild="wilds" x="0" y="95" width="360" height="65"/>` },
  { slug: 'meadow', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="meadow" cx="75" cy="320" rx="78" ry="48"/>` },
  { slug: 'terraces', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="terraces" cx="288" cy="250" rx="62" ry="92"/>` },
  { slug: 'pond', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="pond" cx="180" cy="319" rx="48" ry="30"/>` },
  { slug: 'orchard', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="orchard" cx="280" cy="366" rx="92" ry="42"/>` },
  { slug: 'thicket', shape: `<ellipse class="vl-hit vl-hit--wild" data-wild="thicket" cx="306" cy="409" rx="42" ry="56"/>` },
];

function renderValley(outlet, rootwood, effort) {
  const rootwoodBiome = biomeBySlug('rootwood');
  const atmo = atmosphereFor();
  const cat = pickHearthCat(atmo.time, atmo.season);
  // The Hearth's kettle-stone (THE WORLD §11.5): only the Overlook draws the
  // Hearth, so this is the one place that can ever fire it — armed once per
  // fresh garden visit by setGardenLocation() (app.js), consumed here
  // whether or not tonight's/today's conditions actually let it sound.
  maybeKettleTick(atmo);
  const wildLabel = (slug) => {
    const b = BIOMES.find((x) => x.slug === slug);
    return VALLEY_LINES.wildBiome(b ? b.name : slug);
  };
  outlet.innerHTML = `
    <section class="screen valley-screen" aria-label="${escapeHTML(VALLEY_LINES.overlookLabel)}">
      <div class="valley" data-time="${atmo.time}" data-season="${atmo.season}"
           data-weather="${atmo.weather}" data-stream="${effort.streamBand}">
        <svg class="valley__svg" viewBox="0 0 360 560" preserveAspectRatio="xMidYMid slice">
          ${landforms(atmo)}
          ${cloudsSVG()}
          ${sunDiscSVG(atmo.time)}
          ${atmo.time === 'night' ? nightSkySVG() : ''}
          ${groundMarks(effort.ground.tier)}
          ${path(effort.rootwoodPathWear)}
          ${stream(atmo)}
          ${rootwoodMasses(rootwood, atmo)}
          ${hearth(atmo, cat)}
          ${mist()}
          <!-- The interactive shapes live inside the SVG so they always
               line up with the drawn world, whatever the crop. The wild
               regions acknowledge a touch (the land breathes once); only
               the living region and the Gate lead anywhere. -->
          ${WILD_HITS.map(({ slug, shape }) =>
            shape.replace('/>', ` role="button" tabindex="0" aria-label="${escapeHTML(wildLabel(slug))}"/>`)).join('')}
          <ellipse class="vl-hit" id="enter-rootwood" cx="95" cy="207" rx="88" ry="66"
                   role="button" tabindex="0"
                   aria-label="${escapeHTML(VALLEY_LINES.enterBiome(rootwoodBiome.name))}"></ellipse>
          <rect class="vl-hit" id="leave-gate" x="56" y="404" width="52" height="58"
                role="button" tabindex="0"
                aria-label="${escapeHTML(VALLEY_LINES.gateLabel)}"></rect>
        </svg>
        ${weatherLayerHTML(atmo.weather)}
        <div class="valley__veil" aria-hidden="true"></div>
      </div>

      <nav class="valley__marks" aria-label="Garden">
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

  // Leaving through the Gate (§16.9, §19.2, THE WORLD Part 10.1: from W2
  // onward the drawn Gate in the Hearth's wall is the valley's only
  // exit): a small journey rather than a tab switch — the view drifts
  // toward the wall, then the rest of CAT OS. No dialog, no confirmation
  // (§14.6).
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
}

/** The far sky and land, back to the foot of the high shoulder: sky,
 *  ridges, the Wilds' permanent mist, the boundary fence (Appendix
 *  C.4.6), the four-band aerial ramp, the Vine Terraces, and the still-
 *  wild Meadow/Orchard/Thicket at their Appendix C.7 founding positions.
 *  The Rootwood's own canopy is drawn separately in rootwoodMasses()
 *  because its density depends on the learner's mastery, not on fixed
 *  geometry alone (Part 3.2, 8.5). The Hearth plane is drawn last, in
 *  hearth(), because it is nearest the learner (Part 3.1). */
function landforms(atmo) {
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

    <!-- Far ridges (Appendix C.1: crests at y24/28%): palest, coolest,
         almost still (Guide 10.1). -->
    <path class="vl-ridge" d="M0,134 L0,112 Q52,96 112,108 Q182,90 248,106
      Q312,94 360,110 L360,134 Z"/>

    <!-- The Wilds: always visible, never entered (§5.8), pooled at the
         ridges' feet (Appendix C.7: y28–32%) — the far ridge's own
         colour under a permanent, low mist wash (§6.3, §6.5). -->
    <g class="vl-region" data-region="wilds">
      <path class="vl-wilds" d="M0,150 L0,118 Q52,102 100,116 Q156,96 208,114
        Q260,94 312,116 Q338,106 360,120 L360,150 Z"/>
      <path class="vl-wilds-mist" d="M0,150 L0,118 Q52,102 100,116 Q156,96 208,114
        Q260,94 312,116 Q338,106 360,120 L360,150 Z"/>
    </g>

    <!-- The boundary fence, sparse and leaning, at the Wilds' edge
         (Appendix C.4.6). -->
    ${fencePostsSVG()}

    <!-- The high shoulder: the Vine Terraces step down the right slope
         (Appendix C.7: x62–96%, lips y34/38/42%). -->
    <g class="vl-region" data-region="terraces">
      <path class="vl-terrace" d="M223,192 Q268,182 316,192 Q342,198 348,214 L348,326
        Q312,314 268,320 Q234,270 228,220 Q226,204 223,192 Z"/>
      <path class="vl-terrace-step" d="M230,213 Q288,208 344,222"/>
      <path class="vl-terrace-step" d="M232,258 Q290,254 346,268"/>
      <ellipse class="vl-terracotta-fleck" cx="252" cy="216" rx="3.2" ry="2.1"/>
      <ellipse class="vl-terracotta-fleck" cx="310" cy="260" rx="2.8" ry="1.9"/>
    </g>

    <!-- The valley floor: a four-band aerial ramp (§6.3), farthest to
         nearest — the two bands that had no geometry until now
         (mid-floor, and the Hearth's own plane, drawn in hearth()) join
         the far-fields/near-floor pair W1 already painted. -->
    <path class="vl-floor-far" d="M0,136 Q180,116 360,136 L360,560 L0,560 Z"/>
    <path class="vl-floor-mid" d="M0,238 Q140,214 260,226 Q320,232 360,224 L360,560 L0,560 Z"/>
    <path class="vl-floor-near" d="M0,340 Q150,318 260,330 Q320,338 360,326 L360,560 L0,560 Z"/>

    <!-- West: the Meadow, three combed drifts (Appendix C.7). -->
    <g class="vl-region" data-region="meadow">
      <path class="vl-meadow" d="M-16,262 Q30,240 80,252 Q114,262 118,288
        Q120,314 92,332 Q48,352 -16,344 Z"/>
      <ellipse class="vl-meadow-drift" cx="43" cy="308" rx="20" ry="7"/>
      <ellipse class="vl-meadow-drift" cx="72" cy="336" rx="18" ry="6"/>
      <ellipse class="vl-meadow-drift" cx="101" cy="314" rx="16" ry="6"/>
    </g>

    <!-- South-east: the Orchard, five founding canopies (Appendix C.7). -->
    <g class="vl-region" data-region="orchard">
      <path class="vl-orchard" d="M198,388 Q246,362 300,368 Q338,374 344,398
        Q350,424 316,444 Q268,464 214,452 Q188,444 186,416 Q186,400 198,388 Z"/>
      ${orchardCanopiesSVG()}
    </g>

    <!-- Far south-east: the Thicket, tangled, with its berry flecks
         (Appendix C.7). -->
    <g class="vl-region" data-region="thicket">
      <path class="vl-thicket" d="M284,392 Q316,380 336,396 Q352,408 350,426 L350,502
        Q322,504 296,494 Q280,486 282,458 Q278,420 284,392 Z"/>
      <path class="vl-thicket-curl" d="M300,420 q12,-5 19,3 q5,7 -2,12"/>
      <path class="vl-thicket-curl" d="M294,462 q10,-7 19,-2"/>
      <circle class="vl-berry-fleck vl-berry-fleck--deep" cx="295.2" cy="403.2" r="2.6"/>
      <circle class="vl-berry-fleck vl-berry-fleck--lit" cx="309.6" cy="414.4" r="2.4"/>
      <circle class="vl-berry-fleck vl-berry-fleck--deep" cx="316.8" cy="397.6" r="2.2"/>
    </g>

    <!-- Founding rocks (Appendix C.4.4–5): one mossy shoulder rock at
         the Rootwood's foot, one pale pair by the pond. -->
    <g class="vl-rock" aria-hidden="true">
      ${rockSVG(93.6, 263.2, 21.6)}
      <ellipse class="vl-rock-moss" cx="93.6" cy="257.4" rx="7" ry="2.4"/>
    </g>
    <g class="vl-rock" aria-hidden="true">
      ${rockSVG(226.8, 341.6, 10.8)}
      ${rockSVG(234, 347.2, 10.8)}
    </g>

    <!-- The reed cluster at the pond's south lip (Appendix C.4.7). -->
    <g class="vl-reeds" aria-hidden="true" transform="translate(198 347.2)">
      ${[-6, -3, 0, 3, 6].map((dx, i) => `<path class="vl-reed" d="M${dx},0 Q${dx + (i % 2 ? 1.5 : -1.5)},-10 ${dx},-16"/>`).join('')}
    </g>
  `;
}

/** Fixed, leaning fence posts at the Wilds' edge (Appendix C.4.6): sparse
 *  and simple, no contact shadow (a thin, low-visual-weight accent, not
 *  a standing mass — Guide 5.4's 10% tier). */
function fencePostsSVG() {
  const POSTS = [[118.8, 173.6, -4], [147.6, 170.8, 3], [180, 168, -3], [212.4, 170.8, 4], [241.2, 173.6, -3]];
  return `<g class="vl-fence" aria-hidden="true">
    ${POSTS.map(([x, y, lean]) => `<path class="vl-fence-post" d="M${(x - lean * 0.3).toFixed(1)},${(y - 9).toFixed(1)} L${(x + lean * 0.3).toFixed(1)},${(y + 9).toFixed(1)}"/>`).join('')}
  </g>`;
}

/** The Orchard's five founding canopies (Appendix C.7): round masses,
 *  fruit-tree fuller than the Rootwood's, flat single-tone (the region
 *  is still wild — detail is spent where the learner has actually
 *  cultivated, Guide 5.4). */
function orchardCanopiesSVG() {
  const CANOPIES = [[226.8, 352.8, 10.8], [255.6, 369.6, 11.5], [284.4, 347.2, 10.4], [306, 380.8, 12.2], [324, 358.4, 10.9]];
  return CANOPIES.map(([x, y, r]) =>
    `<ellipse class="vl-orchard-canopy" cx="${x}" cy="${y}" rx="${r}" ry="${(r * 0.82).toFixed(1)}"/>`).join('');
}

/** A simple two-value rock (Visual Guide 9.2: "lit face, shadow face,
 *  sometimes a mossy top") — a lit top mass and a shaded lower mass,
 *  fixed pigment (matching the Gate's own precedent: a built/placed
 *  object gets a steady stone colour, not an hour-modulated one; only
 *  its contact shadow moves with the sun). */
function rockSVG(cx, cy, width) {
  const rx = width / 2, ry = rx * 0.62;
  return `<ellipse class="vl-rock-shade" cx="${cx}" cy="${(cy + ry * 0.25).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"/>
    <ellipse class="vl-rock-lit" cx="${(cx - rx * 0.18).toFixed(1)}" cy="${(cy - ry * 0.22).toFixed(1)}" rx="${(rx * 0.72).toFixed(1)}" ry="${(ry * 0.66).toFixed(1)}"/>`;
}

/** The Ground (§4.3, Roadmap 3.2): the Effort Ledger made visible, drawn
 *  in a fixed safe band just south of the Rootwood's new high-shoulder
 *  position (Appendix C.7: x8–45%, y28–46%) where it never collides with
 *  a region shape. Never random — MARK_COUNT_BY_TIER reveals more of the
 *  same fixed set as lifetime effort accumulates; nothing ever
 *  rearranges, it only thickens (mirrors logic/effort.js exactly). */
const GROUND_MARKS = [
  { x: 48, y: 268, kind: 'moss' },
  { x: 140, y: 264, kind: 'moss' },
  { x: 66, y: 276, kind: 'wildflower' },
  { x: 118, y: 278, kind: 'wildflower' },
  { x: 84, y: 262, kind: 'fern' },
  { x: 104, y: 270, kind: 'fern' },
  { x: 94, y: 280, kind: 'wildflower' },
  { x: 56, y: 274, kind: 'moss' },
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

/** The Path (§4.4, Appendix C.2): from the Gate, in the Hearth's wall,
 *  down to the bridge, forking beyond it — one branch climbing to the
 *  Rootwood (the only region walked today; wear reflects real visits),
 *  one bending toward the Orchard (not yet cultivated, so it stays a
 *  quiet, settled trace — geography that exists before it is walked,
 *  §Bible 3.3: "the world is older than the learner"). Wear never
 *  erases a path — a neglected one is softened by moss, never broken
 *  (logic/effort.js computePathWear()). */
function path(wear) {
  return `
    <path class="vl-path vl-path--${wear}" d="M81,448 C90,432 94,420 97,420 C104,404 108,392 111.6,392 C116,382 120,374 122.4,369.6
      C114,358 106,344 108,336 C100,312 92,292 93.6,280 C96,266 99,254 100.8,246.4"/>
    <path class="vl-path vl-path--settling" d="M122.4,369.6 C136,368 148,366 151.2,364 C168,368 190,372 208.8,375.2"/>`;
}

/** The Stream and the Mirror Pond (Appendix C.2): the spring at the
 *  Rootwood's south-eastern foot, an upper reach down to the pond, and a
 *  lower reach out past the Meadow to the valley's western edge, where
 *  the stone bridge crosses it (Bible §4.2 — never a straight canal;
 *  Visual Guide 8.1 — a soft meandering ribbon). Its fullness and
 *  brightness are the consistency signal (§8.4), carried by
 *  [data-stream] on .valley: a quiet stream is thinner and stiller, and
 *  it NEVER runs dry. */
function stream(atmo) {
  const bridgeShadows = shadowPairSVG(111.6, 400, 25.2, 8, atmo);
  return `
    <g class="vl-water" aria-hidden="true">
      <!-- The spring, and the upper reach into the pond. -->
      <path class="vl-stream-under" d="M151.2,224 C160,238 168,246 169.2,252 C174,266 178,282 180,296.8 L186,296
        C184,282 180,266 175,252 C173,246 165,238 156,224 Z"/>
      <path class="vl-stream" d="M151.2,224 C160,238 168,246 169.2,252 C174,266 178,282 180,296.8 L186,296
        C184,282 180,266 175,252 C173,246 165,238 156,224 Z"/>
      <!-- The lower reach: pond exit, past the Meadow, to the bridge and
           out the valley's western edge. -->
      <path class="vl-stream-under" d="M151.2,347.2 C136,358 126,368 122.4,375.2 C118,384 114,390 111.6,392
        C98,400 82,408 72,414.4 C48,420 20,424 0,425.6 L0,432
        C22,430 50,426 74,420.4 C86,414 100,406 114,398
        C118,394 122,388 128,381.2 C133,373 143,362 158,353.2 Z"/>
      <path class="vl-stream" d="M151.2,347.2 C136,358 126,368 122.4,375.2 C118,384 114,390 111.6,392
        C98,400 82,408 72,414.4 C48,420 20,424 0,425.6 L0,432
        C22,430 50,426 74,420.4 C86,414 100,406 114,398
        C118,394 122,388 128,381.2 C133,373 143,362 158,353.2 Z"/>
      <!-- Drifting highlights: the water's slow life (Guide 8.1) — the one
           permitted linear motion, and it never syncs to anything. -->
      <path class="vl-glint" d="M153,226 C162,240 170,248 172,254 C176,268 180,282 182,297"/>
      <path class="vl-glint vl-glint--2" d="M148,349 C130,362 118,374 112,391 C90,404 60,416 20,424"/>
    </g>
    <!-- The stone bridge, where the path crosses the stream (Appendix
         C.2): warm stone, as the Gate (§6.4). -->
    <g class="vl-bridge" aria-hidden="true">
      ${bridgeShadows}
      <path class="vl-bridge-shade" d="M99,396 Q111.6,404 124.2,396 L124.2,400.5 Q111.6,408.5 99,400.5 Z"/>
      <path class="vl-bridge-lit" d="M99,396 Q111.6,388.4 124.2,396 L124.2,393.5 Q111.6,385.9 99,393.5 Z"/>
    </g>
    <!-- The Mirror Pond, still, at the low centre (Appendix C.2: x38–62%,
         y52–62%): a soft uneven oval leaning west-south-west, its
         reflection a quiet offset of sky, never a ring. Reserved: the
         twin plants' positions (40,60)/(44,61) for when the biome
         lives (Appendix C.7). -->
    <g class="vl-region" data-region="pond">
      <path class="vl-pond" d="M139,320 Q145,300 175,293 Q205,288 219,304
        Q228,316 220,332 Q210,348 178,350 Q146,349 137,334 Q132,326 139,320 Z"/>
      <ellipse class="vl-pond-sky" cx="178" cy="313" rx="15" ry="4.4" transform="rotate(-6 178 313)"/>
      <path class="vl-pond-glint" d="M155,318 Q178,310 202,317"/>
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

/** A tiny stable seed for identity at valley scale, mirroring cat-plant's
 *  own seeded character (used for the Rootwood's canopy lean and the
 *  amber invitation's slot). */
function seedFrom(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h >>> 0);
}

/** The Rootwood's eighteen possible canopy-mass slots (Appendix C.7:
 *  x8–45%/28.8–162px, y28–46%/156.8–257.6px), authored once, in reveal
 *  order — the first seven read as two depth rows (Part 3.2's founding
 *  state), the rest deepen the wood into three rows as mastery
 *  accumulates. Fixed forever: the wood never rearranges, it only
 *  deepens (Part 7.2). `row` picks one of three depth greens. */
const ROOTWOOD_MASS_SLOTS = [
  { x: 78, y: 162, r: 11, row: 0 }, { x: 80, y: 232, r: 20, row: 2 },
  { x: 50, y: 165, r: 12, row: 0 }, { x: 105, y: 225, r: 19, row: 2 },
  { x: 135, y: 164, r: 11, row: 0 }, { x: 55, y: 222, r: 18, row: 2 },
  { x: 105, y: 168, r: 12, row: 0 },
  { x: 128, y: 235, r: 17, row: 2 }, { x: 40, y: 192, r: 15, row: 1 },
  { x: 150, y: 220, r: 16, row: 2 }, { x: 65, y: 200, r: 16, row: 1 },
  { x: 35, y: 238, r: 16, row: 2 }, { x: 90, y: 188, r: 14, row: 1 },
  { x: 150, y: 240, r: 14, row: 2 }, { x: 112, y: 198, r: 17, row: 1 },
  { x: 35, y: 208, r: 13, row: 1 }, { x: 135, y: 192, r: 15, row: 1 },
  { x: 150, y: 205, r: 13, row: 1 },
];
const ROOTWOOD_FOUNDING_COUNT = 7;
const ROOTWOOD_MASS_CEILING = 18;
const ROOTWOOD_MASSES_PER_MATURE_GROUP = 4;

/** Depth-row body colours: three greens stacked (Part 3.2), back to
 *  front — cool and deep in the distance, lighter and warmer near. These
 *  are purely a depth device; the wood no longer shows any single
 *  plant's actual stage at Overlook zoom (Part 3.2, Part 8.4). */
const ROOTWOOD_ROW_COLOR = ['#2B5D3F', '#3D7E4E', '#4F9A5C'];

/** The Rootwood, seen from the Overlook (Part 3.2): a fixed, growing
 *  cluster of canopy masses — never individual plants — that deepens
 *  from seven masses in two rows to a ceiling of eighteen in three rows
 *  as families reach Mature. At most one soft window of amber light
 *  waits inside the wood, in the canopy mass nearest the asking
 *  family's own seeded slot, when a Rootwood family is asking (§16.1's
 *  one invitation). A single emergent, deeper crown stands where a
 *  Landmark has been earned (Part 3.2, 3.4's notch). */
function rootwoodMasses(rootwood, atmo) {
  const count = Math.min(ROOTWOOD_MASS_CEILING, ROOTWOOD_FOUNDING_COUNT + Math.floor(rootwood.matureCount / ROOTWOOD_MASSES_PER_MATURE_GROUP));
  const slots = ROOTWOOD_MASS_SLOTS.slice(0, count);
  const litSlotIndex = rootwood.litId ? seedFrom(rootwood.litId) % slots.length : -1;

  const groundShadow = `<ellipse class="vl-wood-ground-shadow" cx="95" cy="252" rx="78" ry="14"/>`;

  const masses = slots.map((s, i) => {
    const lean = ((seedFrom(`rw-${i}`) % 100) / 100 - 0.5) * 6;
    const lit = i === litSlotIndex;
    const base = ROOTWOOD_ROW_COLOR[s.row];
    // The mass itself always keeps its own row green (Part 3.2: the wood's
    // colour is a depth device, not a status light) — the amber invitation
    // is a soft glow laid OVER the canopy, never a recolour of it, so the
    // wood still reads as a wood with one warm window inside it, not a
    // tree-shaped light bulb.
    const faceStyle = ` style="fill:${litFace(base, atmo.time)}"`;
    const shadeStyle = ` style="fill:${shadeFace(base, atmo.time)}"`;
    const cls = `vl-wood-canopy vl-wood-canopy--row${s.row}`;
    const cx = (s.x + lean).toFixed(1);
    const mass = `
      <ellipse class="${cls}"${faceStyle} cx="${cx}" cy="${s.y}" rx="${s.r}" ry="${(s.r * 0.86).toFixed(1)}"/>
      <ellipse class="${cls}"${shadeStyle} cx="${(s.x + lean - s.r * 0.5).toFixed(1)}" cy="${(s.y + s.r * 0.3).toFixed(1)}" rx="${(s.r * 0.5).toFixed(1)}" ry="${(s.r * 0.42).toFixed(1)}"/>`;
    const glow = lit
      ? `<circle class="vl-wood-glow vl-wood-glow--outer" cx="${cx}" cy="${(s.y - 1).toFixed(1)}" r="14.4"/>
         <circle class="vl-wood-glow" cx="${cx}" cy="${(s.y - 1).toFixed(1)}" r="7.2"/>`
      : '';
    return `${mass}${glow}`;
  }).join('');

  const emergentCrown = rootwood.hasLandmark ? `
    <ellipse class="vl-wood-canopy vl-wood-canopy--row0 vl-wood-canopy--landmark" cx="62" cy="158" rx="13" ry="11"/>
    <ellipse class="vl-canopy-nest" cx="66" cy="156" rx="2.6" ry="1.6"/>
    ${atmo.time === 'night' ? `<ellipse class="vl-landmark-glow" cx="62" cy="158" rx="18" ry="10.8"/>
      ${[[-4, -6], [5, -3], [1, 4]].map(([dx, dy], k) => `
        <circle class="vl-firefly-glow" style="animation-delay:${k * 0.9}s" cx="${62 + dx}" cy="${158 + dy}" r="7.2"/>
        <circle class="vl-firefly" style="animation-delay:${k * 0.9}s" cx="${62 + dx}" cy="${158 + dy}" r="1.4"/>`).join('')}` : ''}
  ` : '';

  return `${groundShadow}${masses}${emergentCrown}`;
}

/** Two soft masses and a tail sweep, no face (Part 9.1, 9.2): the hearth
 *  cat, sleeping wherever it has been placed (Part 4.5) — its entire
 *  animation is one slow breathing cycle. It is never clickable and
 *  never reacts; the anti-companion, the world's quietest joke. */
function hearthCatSVG(spot) {
  const { x, y } = spot;
  return `
    <g class="vl-cat" style="transform-origin:${x}px ${y}px" aria-hidden="true">
      <path class="vl-cat-tail" d="M${(x + 5).toFixed(1)},${y} Q${(x + 9).toFixed(1)},${(y - 3).toFixed(1)} ${(x + 7).toFixed(1)},${(y - 6).toFixed(1)}"/>
      <ellipse class="vl-cat-body" cx="${x}" cy="${y}" rx="5.4" ry="2.6"/>
      <ellipse class="vl-cat-body" cx="${(x - 4.2).toFixed(1)}" cy="${(y - 1.4).toFixed(1)}" rx="2.6" ry="2.2"/>
      <ellipse class="vl-cat-chest" cx="${(x - 4.6).toFixed(1)}" cy="${(y - 0.4).toFixed(1)}" rx="1.3" ry="1.1"/>
    </g>`;
}

/**
 * The Hearth (THE WORLD Part 4, Appendix C.3): the low dry-stone wall
 * with the Gate set in its gap, the cottage (gable, roof, the window
 * that is warm at every dusk and every night, unconditionally, and the
 * chimney), the bench, the bench lantern, and the kettle-stone. Given
 * whole from day one (Part 4.2 — home is given, never earned). The
 * hearth cat, when the ambient roll finds it, sleeps at one of its two
 * authored spots (Part 4.5, 9.3).
 */
function hearth(atmo, cat) {
  const warm = atmo.time === 'dusk' || atmo.time === 'night';
  const wallShadows = shadowPairSVG(75.6, 448, 20, 12, atmo) + shadowPairSVG(86.4, 450.8, 20, 12, atmo);
  const cottageShadow = shadowPairSVG(309.6, 470.4, 100, 18, atmo);
  const benchLantern = warm
    ? `<circle class="vl-lantern-glow" cx="187.2" cy="481.6" r="${(0.07 * 360).toFixed(1)}"/>
       <circle class="vl-lantern" cx="187.2" cy="481.6" r="2"/>`
    : '';
  const windowGlow = warm ? `<ellipse class="vl-window-glow" cx="302.4" cy="487.2" rx="${(0.09 * 360).toFixed(1)}" ry="${(0.09 * 360 * 0.7).toFixed(1)}"/>` : '';
  const cold = atmo.season === 'autumn' || atmo.season === 'winter';
  const smoke = (atmo.time === 'dawn' && cold) ? `
    <ellipse class="vl-chimney-smoke" cx="280.8" cy="405" rx="4.5" ry="3.2"/>
    <ellipse class="vl-chimney-smoke vl-chimney-smoke--2" cx="284" cy="396" rx="3.6" ry="2.6"/>` : '';
  const catSVG = cat ? hearthCatSVG(cat) : '';

  return `
    <!-- The Hearth plane (Part 3.1, y76–100%): the near hillside, darkest
         and warmest land in the frame, cut diagonally, that the whole
         composition stands inside. -->
    <path class="vl-hearth-ground" d="M0,430 Q160,410 360,436 L360,560 L0,560 Z"/>

    <!-- The low dry-stone wall, with the Gate set in its gap (Appendix
         C.3), and the head of the path leaving it. -->
    <g class="vl-wall" aria-hidden="true">
      ${wallShadows}
      <path class="vl-wall-shade" d="M0,436.8 L75.6,443.9 L75.6,460.7 L0,453.6 Z"/>
      <path class="vl-wall-lit" d="M0,436.8 L75.6,443.9 L75.6,449.9 L0,442.8 Z"/>
      <path class="vl-wall-shade" d="M86.4,444.9 L360,470.4 L360,487.2 L86.4,461.7 Z"/>
      <path class="vl-wall-lit" d="M86.4,444.9 L360,470.4 L360,476.4 L86.4,450.9 Z"/>
    </g>
    <g class="vl-gate" aria-hidden="true">
      <path class="vl-gate-post" d="M75.6,448 L75.6,414.4"/>
      <path class="vl-gate-post" d="M86.4,450.8 L86.4,417.2"/>
      <path class="vl-gate-lintel" d="M75.6,414.4 Q81,408.5 86.4,417.2"/>
    </g>

    <!-- The cottage: gable cropped at the frame's right edge, the warm
         window, the chimney (Appendix C.3). Home from day one, never
         a door that opens (Part 4.1, 4.4). -->
    <g class="vl-cottage" aria-hidden="true">
      ${cottageShadow}
      <path class="vl-cottage-wall-shade" d="M244.8,470.4 L374.4,470.4 L374.4,515 L244.8,515 Z"/>
      <path class="vl-cottage-wall-lit" d="M244.8,470.4 L309.6,470.4 L309.6,515 L244.8,515 Z"/>
      <path class="vl-cottage-roof-shade" d="M309.6,442.4 L374.4,470.4 L309.6,470.4 Z"/>
      <path class="vl-cottage-roof-lit" d="M244.8,470.4 L309.6,442.4 L309.6,470.4 Z"/>
      <path class="vl-cottage-wall-shade" d="M277,431.2 L284.6,431.2 L284.6,451 L277,451 Z"/>
      <path class="vl-cottage-wall-lit" d="M277,410 L284.6,410 L284.6,431.2 L277,431.2 Z"/>
      ${smoke}
      <rect class="vl-window${warm ? ' vl-window--lit' : ''}" x="295.2" y="473.2" width="14.4" height="28" rx="1.4"/>
      ${windowGlow}
    </g>

    <!-- The bench, the bench lantern, and the kettle-stone (Appendix
         C.3) — the Journal lives here (Bible §4.9); a text mark still
         opens it until the bench itself is staged (THE WORLD Part 10.5,
         Stage W7). -->
    <path class="vl-bench" d="M147.6,490.4 L183.6,490.4 L183.6,495.2 L147.6,495.2 Z"/>
    <path class="vl-bench-legs" d="M150,495.2 L150,499 M181.2,495.2 L181.2,499" stroke-linecap="round"/>
    ${benchLantern}
    <ellipse class="vl-kettle-stone" cx="198" cy="498.4" rx="4.6" ry="3.2"/>
    ${catSVG}
  `;
}

/** Low mist in the hollows (Visual Guide 11.3, THE WORLD Appendix C.1:
 *  dawn mist bands at y46–52% and y58–62%): layered translucent shapes,
 *  never a blur filter. Drawn always; CSS shows it only at dawn and at
 *  night, where it does the most emotional work. */
function mist() {
  return `
    <g class="vl-mist-layer" aria-hidden="true">
      <ellipse class="vl-mist" cx="150" cy="274.4" rx="140" ry="16.8"/>
      <ellipse class="vl-mist vl-mist--2" cx="195" cy="336" rx="118" ry="11.2"/>
    </g>`;
}
