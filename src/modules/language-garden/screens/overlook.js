/**
 * overlook.js (screen) — the Overlook: home, and the most important
 * screen in the product (LANGUAGE_GARDEN_BIBLE §16.1). The whole valley,
 * seen from above, wordless (§13.4), on one screen with no scrolling
 * (§4.1). You arrive here, and arriving is meant to be good.
 *
 * 0.16.0 — the valley is the application's HOME. A cold open lands here
 * (app.js), the frame is full-bleed (no card, no margins: the phone IS the
 * window), and the sky was raised by 130 units above THE WORLD's 360×560
 * authored frame (viewBox 0 -130 360 690) so the composition breathes —
 * every Appendix C coordinate below is unchanged; the sky simply has room
 * above it now (THE WORLD 1.2.0, "the raised sky").
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
 * The Rootwood, at this distance, is a wood: a fixed, seeded cluster of
 * trees — each a trunk under a lit-and-shaded crown — whose count
 * deepens as families are grown (Part 3.2, Part 8.5; 0.16.0 counts every
 * family past Sprout, so the wood answers the learner's first week, not
 * only their first month), with emergent crowns where Ancients stand,
 * and — at most one, ever — a soft amber light inside the canopy where a
 * family is waiting (§16.1's one invitation, never a backlog).
 *
 * The Stream's level, brightness, and sound are the consistency signal
 * (§8.4, Roadmap 3.1); the Ground and Paths carry the Effort Ledger
 * (§4.3–4.4, 3.2); the sky carries the five-state clock, the calendar's
 * season, and the seeded weather (§4.5–§4.7, 3.4/3.6); and the Gate, set
 * in the Hearth's wall, leads out to the rest of CAT OS (§16.9, 3.5,
 * THE WORLD Part 10.1: from W2 onward it is the valley's only exit).
 *
 * Arrival (THE WORLD Part 10.7): the planes assemble back to front —
 * sky, ridges, floor, Hearth — each fading up ~120ms after the last, as
 * if the light reached it. Four plane groups below carry that
 * choreography; reduced motion collapses it to one cross-fade.
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions, listGardenSeeds, listGardenSightings, recordDiscoveries } from '../logic/store.js';
import { visibleDiscoveries } from '../logic/discoveries.js';
import { deriveValleyScene } from '../logic/scene.js';
import { biomeBySlug, BIOMES } from '../logic/biomes.js';
import { computeStreamLevel, streamBand, computeGroundTier, computePathWear } from '../logic/effort.js';
import { atmosphereFor } from '../logic/atmosphere.js';
import { pickHearthCat } from '../logic/ambient.js';
import { revealedProps, revealedSeasonalProps, revealedStories } from '../logic/props.js';
import { pickOverlookVisitor } from '../logic/fauna.js';
import { maybeKettleTick } from '../logic/audio.js';
import { weatherLayerHTML, nightSkySVG, sunDiscSVG, cloudsSVG } from './atmosphere-art.js';
import { propsSVG, seasonalPropsSVG, storiesSVG } from './prop-art.js';
import { faunaSVG } from './fauna-art.js';
import { litFace, shadeFace, contactShadow, castsShadow, castShadow } from '../logic/light.js';
import { VALLEY_LINES } from '../../../core/mentor/garden-voice.js';
import { escapeHTML } from '../../../core/utils/format.js';
import '../../../ui/components/cat-plant.js';

const GROWN_STAGES = new Set(['young', 'in_leaf', 'mature', 'ancient']);

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
    grownCount: rootwoodPlants.filter((p) => GROWN_STAGES.has(p.state.stage)).length,
    matureCount: rootwoodPlants.filter((p) => p.state.stage === 'mature' || p.state.stage === 'ancient').length,
    ancientCount: rootwoodPlants.filter((p) => p.state.stage === 'ancient').length,
    hasLandmark: rootwoodPlants.some((p) => p.state.landmark),
    litId: scene.askingBiomeSlug === 'rootwood' ? scene.askingId : null,
  };
  const shown = renderValley(outlet, rootwood, effort);

  // Discoveries (Bible §9, 0.16.0): whatever the valley just showed is now
  // seen. Recorded after the paint, never awaited by it, never announced.
  let sightings = 0;
  try { sightings = (await listGardenSightings(context.storage)).length; } catch { /* none */ }
  recordDiscoveries(context.storage, visibleDiscoveries({
    scene: 'overlook',
    time: shown.atmo.time, season: shown.atmo.season, weather: shown.atmo.weather,
    visitor: shown.visitor, cat: !!shown.cat,
    hasLandmark: rootwood.hasLandmark,
    stages: new Set(scene.plants.map((p) => p.state.stage)),
    dues: new Set(scene.plants.map((p) => p.state.due)),
    tierRank: ['bare', 'tended', 'growing', 'flourishing', 'lush'].indexOf(effort.ground.tier),
    props: new Set(shown.props.map((p) => p.id)),
    streamBand: effort.streamBand,
    sightings,
    reachWords: sessions.filter((s) => s.reach?.landed_clean_first_try !== undefined).length,
  }), 'overlook');
}

/* ------------------------------------------------------------------ */
/* The valley, as layered flat shapes. Coordinates are a 360×560       */
/* portrait field (100% width = 360, 100% height = 560), matching      */
/* Appendix C's percent-of-frame convention exactly; the sky extends   */
/* above it to y = -130. Every boundary is organic and asymmetric      */
/* (Visual Guide 5.2: symmetry in nature reads as fake), and the far   */
/* planes are cooler, paler, lower-contrast (aerial perspective, 10.2).*/
/* Draw order is Appendix C's plane order: sky → far ridges → the high  */
/* shoulder (Rootwood, Terraces) → the valley floor (Pond, Meadow,      */
/* Orchard, Thicket) → the Hearth plane, nearest the learner (Part 3.1).*/
/* ------------------------------------------------------------------ */

/** The wild regions a tap acknowledges, with their hit geometry —
 *  THE WORLD Appendix C.7's founding geometry. The Rootwood and the
 *  Gate keep their own dedicated hits. */
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

  // Stage W6 — the authored world (THE WORLD Part 7). The Effort Ledger's
  // lifetime tier is the light that reveals a fixed inventory; the calendar
  // brings the seasonal set; and eight of Part 7.4's environmental stories
  // stand on the objects Appendix C already pins. Every one of these is a
  // pure function of true state, so an idle screen can never gain, lose, or
  // rearrange a single prop between renders (Part 7.2, and W6's own "nothing
  // random per frame" acceptance line).
  const tier = effort.ground.tier;
  const dressed = { ...atmo, tier };
  const props = revealedProps({ tier, season: atmo.season, time: atmo.time, weather: atmo.weather });
  const seasonal = revealedSeasonalProps(atmo);
  const stories = revealedStories({ tier });
  // Props are drawn into the plane they actually stand on, so the wood, the
  // water, and the Hearth still occlude them correctly (Part 3.1's plane
  // order): the far floor, then the near floor, then the Hearth's own ground.
  const inBand = (lo, hi) => props.filter((p) => p.y >= lo && p.y < hi);
  const farProps = propsSVG(inBand(0, 340), dressed);
  const nearProps = propsSVG(inBand(340, 430), dressed);
  const hearthProps = propsSVG(inBand(430, Infinity), dressed);

  // One quiet life this visit, or none (Bible §4.8, Part 9): rolled once per
  // mount, never on an interval, so a five-minute idle at the Overlook shows
  // at most quiet, unsynchronised life. Nothing here is earned, and nothing
  // here can be touched.
  const visitor = pickOverlookVisitor({
    time: atmo.time, season: atmo.season, weather: atmo.weather, tier,
    bloomingCount: rootwood.matureCount, ancientCount: rootwood.ancientCount,
  });

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
        <svg class="valley__svg" viewBox="0 -100 360 660" preserveAspectRatio="xMidYMax slice">
          ${defsSVG(atmo)}
          <!-- Plane 1 — the sky (Part 10.7: the hour's light exists before any object does). -->
          <g class="vl-plane vl-plane--sky">
            ${skySVG(atmo)}
            ${atmo.time === 'night' ? nightSkySVG() : ''}
            ${sunDiscSVG(atmo.time)}
            ${cloudsSVG(atmo)}
          </g>
          <!-- Plane 2 — the far ridges, the Wilds, the far fields. -->
          <g class="vl-plane vl-plane--far">
            ${ridgesSVG(atmo)}
            ${fencePostsSVG()}
            ${farFieldsSVG()}
            ${farProps}
          </g>
          <!-- Plane 3 — the high shoulder and the valley floor. -->
          <g class="vl-plane vl-plane--floor">
            ${shoulderAndFloorSVG(atmo)}
            ${groundMarks(effort.ground.tier)}
            ${path(effort.rootwoodPathWear)}
            ${storiesSVG(stories.filter((s) => s.at === 'path' || s.at === 'fence-post-run'))}
            ${stream(atmo)}
            ${storiesSVG(stories.filter((s) => s.at === 'bridge'))}
            ${rootwoodMasses(rootwood, atmo)}
            ${nearProps}
            ${storiesSVG(stories.filter((s) => s.at === 'stepping-stones'))}
          </g>
          <!-- Plane 4 — the Hearth, where the learner stands. -->
          <g class="vl-plane vl-plane--hearth">
            ${hearth(atmo, cat)}
            ${hearthProps}
            ${storiesSVG(stories.filter((s) => s.at === 'wall' || s.at === 'gate' || s.at === 'kettle-stone'))}
            ${seasonalPropsSVG(seasonal)}
            ${visitorSVG(visitor)}
            ${mist()}
          </g>
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
        <div class="valley__card" id="valley-card" hidden></div>
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
  // breathes once — a soft luminance swell — and, since 0.17.0 (THE
  // WORLD Part 16.5), the place says its name: a small card with the
  // region's name and one line of what grows there, gone again in a few
  // seconds. No date, no lock, no "coming soon" (§5.8) — a place the
  // learner can now anticipate, because it has been named.
  const card = outlet.querySelector('#valley-card');
  let cardTimer = null;
  const hideCard = () => { clearTimeout(cardTimer); card.hidden = true; };
  const showCard = (slug) => {
    const b = BIOMES.find((x) => x.slug === slug);
    if (!b) return;
    card.innerHTML = `<p class="valley__card-name">${escapeHTML(b.name)}</p>
      <p class="valley__card-line">${escapeHTML(b.whisper)}</p>`;
    card.hidden = false;
    card.classList.remove('is-shown');
    void card.offsetWidth;
    card.classList.add('is-shown');
    clearTimeout(cardTimer);
    cardTimer = setTimeout(hideCard, 4600);
  };
  card.addEventListener('click', hideCard);
  for (const hitEl of outlet.querySelectorAll('[data-wild]')) {
    const region = outlet.querySelector(`[data-region="${hitEl.dataset.wild}"]`);
    const breathe = () => {
      showCard(hitEl.dataset.wild);
      if (!region) return;
      region.classList.remove('is-breathing');
      void region.getBoundingClientRect();
      region.classList.add('is-breathing');
    };
    hitEl.addEventListener('click', breathe);
    hitEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); breathe(); }
    });
  }

  // Leaving through the Gate (§16.9, §19.2, THE WORLD Part 10.1, 10.6): a
  // small journey rather than a tab switch — the view drifts toward the
  // wall, then the road beyond the Gate (the reading rooms of CAT OS). No
  // dialog, no confirmation (§14.6).
  const leave = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { location.hash = '#/practice'; return; }
    valley.classList.add('is-leaving');
    setTimeout(() => { location.hash = '#/practice'; }, 700);
  };
  const gateHit = outlet.querySelector('#leave-gate');
  gateHit.addEventListener('click', leave);
  gateHit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); leave(); }
  });

  return { atmo, visitor, cat, props };
}

/**
 * The view from the bench (THE WORLD Part 10.5, Stage W7): the Overlook's
 * upper planes — sky, ridges, the Wilds, the far fields — at the current
 * hour and weather, for the Journal to sit under. The same drawing as the
 * valley's own, cropped, so the Journal is somewhere in the world rather
 * than a page about it.
 */
export function benchViewSVG(atmo) {
  return `
    <svg class="lg-journal__view-svg" viewBox="0 -100 360 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      ${defsSVG(atmo)}
      ${skySVG(atmo)}
      ${atmo.time === 'night' ? nightSkySVG() : ''}
      ${sunDiscSVG(atmo.time)}
      ${cloudsSVG(atmo)}
      ${ridgesSVG(atmo)}
      ${fencePostsSVG()}
      ${farFieldsSVG()}
    </svg>`;
}

/* ---------------- Plane 1: the sky ---------------- */

/** Gradient definitions: the three-stop sky (§6.2), re-toned per hour by
 *  CSS custom properties on [data-time], and the low sun's glow at dawn
 *  and dusk (a radial wash, never a blur filter — Guide 11.1). */
function defsSVG(atmo) {
  const glow = atmo.time === 'dawn'
    ? `<radialGradient id="vl-sun-glow" cx="0.82" cy="0.86" r="0.5"><stop offset="0%" class="vl-sun-glow-stop"/><stop offset="100%" class="vl-sun-glow-stop vl-sun-glow-stop--out"/></radialGradient>`
    : atmo.time === 'dusk'
      ? `<radialGradient id="vl-sun-glow" cx="0.14" cy="0.88" r="0.55"><stop offset="0%" class="vl-sun-glow-stop"/><stop offset="100%" class="vl-sun-glow-stop vl-sun-glow-stop--out"/></radialGradient>`
      : '';
  return `
    <defs>
      <linearGradient id="vl-sky-grad" x1="0" y1="0" x2="0" y2="1">
        <stop class="vl-sky-stop vl-sky-stop--zenith" offset="0%"/>
        <stop class="vl-sky-stop vl-sky-stop--mid" offset="58%"/>
        <stop class="vl-sky-stop vl-sky-stop--horizon" offset="100%"/>
      </linearGradient>
      <linearGradient id="vl-pond-grad" x1="0" y1="0" x2="0" y2="1">
        <stop class="vl-pond-stop vl-pond-stop--deep" offset="0%"/>
        <stop class="vl-pond-stop vl-pond-stop--shallow" offset="100%"/>
      </linearGradient>
      ${glow}
    </defs>`;
}

function skySVG(atmo) {
  const glow = (atmo.time === 'dawn' || atmo.time === 'dusk')
    ? `<rect class="vl-sun-glow" x="0" y="-100" width="360" height="238" fill="url(#vl-sun-glow)"/>`
    : '';
  return `
    <rect class="vl-sky" x="0" y="-100" width="360" height="238" fill="url(#vl-sky-grad)"/>
    ${glow}
    <!-- The sky-going-green seam (§6.2): a thin band, dusk only. -->
    <rect class="vl-sky-seam" x="0" y="106" width="360" height="9"/>`;
}

/* ---------------- Plane 2: the ridges and the far fields ---------------- */

/** Two ranges, back to front (Guide 10.1, 10.2: mountains are the
 *  farthest, coolest, palest plane; aerial perspective is the depth law).
 *  The farther range carries snow on its highest peaks — three caps, the
 *  same three forever — and rises into the raised sky; the nearer range
 *  is the crest line Appendix C.1 pins at y24/28%. The Wilds pool at the
 *  ridges' feet under their permanent mist (§6.3, §6.5), always visible,
 *  never entered (§5.8). */
function ridgesSVG(atmo) {
  // The farther range as a crest line of authored points (peaks and
  // saddles alternate, never evenly spaced — Guide 5.2), so the snow can
  // be cut from the same geometry it sits on rather than floated over it.
  const CREST = [[0, 76], [22, 56], [44, 66], [68, 30], [96, 58], [118, 44], [138, 64], [160, 24],
    [186, 54], [208, 12], [236, 48], [258, 36], [282, 58], [304, 20], [332, 54], [348, 44], [360, 66]];
  const crest = CREST.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const farther = `<path class="vl-ridge vl-ridge--farther" d="${crest} L360,128 L0,128 Z"/>`;
  // Snow on the four highest peaks: a cap that follows both flanks down
  // `depth` units, with a soft, uneven lower edge — the same four, forever.
  const SNOWY = [3, 7, 9, 13];
  const depth = 15;
  const caps = SNOWY.map((k) => {
    const [px, py] = CREST[k];
    const [lx, ly] = CREST[k - 1];
    const [rx, ry] = CREST[k + 1];
    const tL = Math.min(1, depth / (ly - py));
    const tR = Math.min(1, depth / (ry - py));
    const ax = px + (lx - px) * tL, ay = py + (ly - py) * tL;
    const bx = px + (rx - px) * tR, by = py + (ry - py) * tR;
    return `<path d="M${px},${py} L${bx.toFixed(1)},${by.toFixed(1)} Q${(px + 4).toFixed(1)},${(by - 4).toFixed(1)} ${px},${(by - 1).toFixed(1)} Q${(px - 5).toFixed(1)},${(ay - 2).toFixed(1)} ${ax.toFixed(1)},${ay.toFixed(1)} Z"/>`;
  }).join('');
  return `
    ${farther}
    <g class="vl-snow" aria-hidden="true">${caps}</g>
    <path class="vl-ridge vl-ridge--far" d="M0,138 L0,106 Q34,84 72,100 Q110,74 150,98 Q192,70 236,96
      Q272,80 306,98 Q334,88 360,104 L360,138 Z"/>

    <!-- The Wilds: always visible, never entered (§5.8), pooled at the
         ridges' feet (Appendix C.7: y28–32%) under a permanent, low mist. -->
    <g class="vl-region" data-region="wilds">
      <path class="vl-wilds" d="M0,150 L0,118 Q52,102 100,116 Q156,96 208,114
        Q260,94 312,116 Q338,106 360,120 L360,150 Z"/>
      <path class="vl-wilds-mist" d="M0,150 L0,118 Q52,102 100,116 Q156,96 208,114
        Q260,94 312,116 Q338,106 360,120 L360,150 Z"/>
    </g>`;
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

/** The far fields (the first band of the aerial ramp, §6.3), with three
 *  hedgerows lying across them — the one quiet line that says "farmed
 *  land, far away" (Guide 7.1: a composition, not a map). */
function farFieldsSVG() {
  return `
    <path class="vl-floor-far" d="M0,136 Q180,116 360,136 L360,560 L0,560 Z"/>
    <g class="vl-hedgerows" aria-hidden="true">
      <path d="M150,160 Q210,152 262,166"/>
      <path d="M176,182 Q236,176 300,192"/>
      <path d="M196,204 Q250,200 292,214"/>
    </g>`;
}

/* ---------------- Plane 3: the high shoulder and the valley floor ---------------- */

/** The mid and near bands of the aerial ramp, the Vine Terraces stepping
 *  down the right slope, and the still-wild Meadow, Orchard, and Thicket
 *  at their Appendix C.7 founding positions. The Rootwood's own canopy
 *  is drawn separately in rootwoodMasses() because its density depends
 *  on the learner's mastery, not on fixed geometry alone (Part 3.2, 8.5). */
function shoulderAndFloorSVG(atmo) {
  return `
    <path class="vl-floor-mid" d="M0,238 Q140,214 260,226 Q320,232 360,224 L360,560 L0,560 Z"/>

    <!-- The high shoulder: the Vine Terraces step down the right slope
         (Appendix C.7: x62–96%, lips y34/38/42%) — three stepped fields,
         each with the stone lip that catches the sun (§3.2). -->
    <g class="vl-region" data-region="terraces">
      <path class="vl-terrace" d="M223,192 Q268,182 316,192 Q342,198 348,214 L348,326
        Q312,314 268,320 Q234,270 228,220 Q226,204 223,192 Z"/>
      <path class="vl-terrace-field vl-terrace-field--1" d="M226,214 Q288,208 344,222 L346,238 Q290,230 230,238 Z"/>
      <path class="vl-terrace-field vl-terrace-field--2" d="M231,258 Q290,252 346,268 L347,284 Q292,276 236,284 Z"/>
      <path class="vl-terrace-step" d="M230,213 Q288,208 344,222"/>
      <path class="vl-terrace-step" d="M232,258 Q290,254 346,268"/>
      <path class="vl-terrace-step" d="M238,300 Q292,296 347,308"/>
      <g class="vl-terrace-rows" aria-hidden="true">
        <path d="M240,226 Q290,220 338,230"/><path d="M244,270 Q292,264 340,274"/><path d="M250,312 Q294,308 342,318"/>
      </g>
      <ellipse class="vl-terracotta-fleck" cx="252" cy="216" rx="3.2" ry="2.1"/>
      <ellipse class="vl-terracotta-fleck" cx="310" cy="260" rx="2.8" ry="1.9"/>
    </g>

    <path class="vl-floor-near" d="M0,340 Q150,318 260,330 Q320,338 360,326 L360,560 L0,560 Z"/>

    <!-- West: the Meadow, three combed drifts and a scatter of pale
         flowers (Appendix C.7). -->
    <g class="vl-region" data-region="meadow">
      <path class="vl-meadow" d="M-16,262 Q30,240 80,252 Q114,262 118,288
        Q120,314 92,332 Q48,352 -16,344 Z"/>
      <ellipse class="vl-meadow-drift" cx="43" cy="308" rx="20" ry="7"/>
      <ellipse class="vl-meadow-drift" cx="72" cy="336" rx="18" ry="6"/>
      <ellipse class="vl-meadow-drift" cx="101" cy="314" rx="16" ry="6"/>
      <g class="vl-meadow-flowers">
        ${[[22, 296], [36, 322], [58, 300], [84, 326], [96, 298], [66, 288], [110, 306], [30, 338]].map(([x, y], i) =>
          `<circle class="vl-meadow-flower${i % 3 === 0 ? ' vl-meadow-flower--cream' : ''}" cx="${x}" cy="${y}" r="1.6"/>`).join('')}
      </g>
    </g>

    <!-- The Mirror Pond, still, at the low centre (Appendix C.2: x38–62%,
         y52–62%): a soft uneven oval leaning west-south-west, deeper in
         the middle, holding the sky (Guide 8.2). -->
    <g class="vl-region" data-region="pond">
      <path class="vl-pond-bank" d="M136,318 Q142,296 175,289 Q208,284 223,302 Q233,316 224,334 Q213,352 178,354 Q143,353 134,336 Q129,326 136,318 Z"/>
      <path class="vl-pond" d="M139,320 Q145,300 175,293 Q205,288 219,304
        Q228,316 220,332 Q210,348 178,350 Q146,349 137,334 Q132,326 139,320 Z"/>
      <ellipse class="vl-pond-sky" cx="178" cy="313" rx="24" ry="8" transform="rotate(-6 178 313)"/>
      <path class="vl-pond-glint" d="M155,318 Q178,310 202,317"/>
      <path class="vl-pond-glint vl-pond-glint--2" d="M162,331 Q180,326 198,330"/>
    </g>

    <!-- South-east: the Orchard, five founding fruit trees (Appendix C.7). -->
    <g class="vl-region" data-region="orchard">
      <path class="vl-orchard" d="M198,388 Q246,362 300,368 Q338,374 344,398
        Q350,424 316,444 Q268,464 214,452 Q188,444 186,416 Q186,400 198,388 Z"/>
      ${orchardTreesSVG(atmo)}
    </g>

    <!-- Far south-east: the Thicket, tangled, with its berry flecks
         (Appendix C.7). -->
    <g class="vl-region" data-region="thicket">
      <path class="vl-thicket" d="M284,392 Q316,380 336,396 Q352,408 350,426 L350,502
        Q322,504 296,494 Q280,486 282,458 Q278,420 284,392 Z"/>
      <path class="vl-thicket-curl" d="M300,420 q12,-5 19,3 q5,7 -2,12"/>
      <path class="vl-thicket-curl" d="M294,462 q10,-7 19,-2"/>
      <path class="vl-thicket-curl" d="M318,444 q9,-8 18,-1"/>
      <circle class="vl-berry-fleck vl-berry-fleck--deep" cx="295.2" cy="403.2" r="2.6"/>
      <circle class="vl-berry-fleck vl-berry-fleck--lit" cx="309.6" cy="414.4" r="2.4"/>
      <circle class="vl-berry-fleck vl-berry-fleck--deep" cx="316.8" cy="397.6" r="2.2"/>
      <circle class="vl-berry-fleck vl-berry-fleck--lit" cx="326" cy="436" r="2.1"/>
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

/** The Orchard's five founding trees (Appendix C.7): a short trunk under
 *  a two-value crown, fruit-tree fuller than the Rootwood's. The region
 *  is still wild, so the crowns stay a single family of green — detail is
 *  spent where the learner has actually cultivated (Guide 5.4). */
function orchardTreesSVG(atmo) {
  const CANOPIES = [[226.8, 352.8, 10.8], [255.6, 369.6, 11.5], [284.4, 347.2, 10.4], [306, 380.8, 12.2], [324, 358.4, 10.9]];
  return CANOPIES.map(([x, y, r]) => `
    <path class="vl-orchard-trunk" d="M${x},${(y + r * 0.5).toFixed(1)} L${x},${(y + r * 1.15).toFixed(1)}"/>
    <ellipse class="vl-orchard-canopy" cx="${x}" cy="${y}" rx="${r}" ry="${(r * 0.82).toFixed(1)}"/>
    <ellipse class="vl-orchard-canopy vl-orchard-canopy--lit" cx="${(x - r * 0.25).toFixed(1)}" cy="${(y - r * 0.28).toFixed(1)}" rx="${(r * 0.5).toFixed(1)}" ry="${(r * 0.36).toFixed(1)}"/>
    ${atmo.season === 'spring' ? `<ellipse class="vl-orchard-blossom" cx="${(x + r * 0.3).toFixed(1)}" cy="${(y - r * 0.1).toFixed(1)}" rx="${(r * 0.32).toFixed(1)}" ry="${(r * 0.22).toFixed(1)}"/>` : ''}`).join('');
}

/** A simple two-value rock (Visual Guide 9.2: "lit face, shadow face,
 *  sometimes a mossy top") — fixed pigment (a placed object gets a
 *  steady stone colour; only its contact shadow moves with the sun). */
function rockSVG(cx, cy, width) {
  const rx = width / 2, ry = rx * 0.62;
  return `<ellipse class="vl-rock-shade" cx="${cx}" cy="${(cy + ry * 0.25).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"/>
    <ellipse class="vl-rock-lit" cx="${(cx - rx * 0.18).toFixed(1)}" cy="${(cy - ry * 0.22).toFixed(1)}" rx="${(rx * 0.72).toFixed(1)}" ry="${(ry * 0.66).toFixed(1)}"/>`;
}

/** The Ground (§4.3, Roadmap 3.2): the Effort Ledger made visible, drawn
 *  in a fixed safe band just south of the Rootwood (Appendix C.7: x8–45%,
 *  y28–46%) where it never collides with a region shape. Never random —
 *  MARK_COUNT_BY_TIER reveals more of the same fixed set as lifetime
 *  effort accumulates; nothing ever rearranges, it only thickens. */
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
 *  one bending toward the Orchard (a quiet, settled trace — geography
 *  that exists before it is walked). Wear never erases a path — a
 *  neglected one is softened by moss, never broken. */
function path(wear) {
  const d = `M81,448 C90,432 94,420 97,420 C104,404 108,392 111.6,392 C116,382 120,374 122.4,369.6
      C114,358 106,344 108,336 C100,312 92,292 93.6,280 C96,266 99,254 100.8,246.4`;
  return `
    <path class="vl-path-edge" d="${d}"/>
    <path class="vl-path vl-path--${wear}" d="${d}"/>
    <path class="vl-path vl-path--settling" d="M122.4,369.6 C136,368 148,366 151.2,364 C168,368 190,372 208.8,375.2"/>`;
}

/** The Stream and the bridge (Appendix C.2): the spring at the Rootwood's
 *  south-eastern foot, an upper reach down to the pond, and a lower reach
 *  out past the Meadow to the valley's western edge, where the stone
 *  bridge crosses it (Bible §4.2 — never a straight canal; Guide 8.1 — a
 *  soft meandering ribbon). Its fullness and brightness are the
 *  consistency signal (§8.4), carried by [data-stream] on .valley: a quiet
 *  stream is thinner and stiller, and it NEVER runs dry. */
function stream(atmo) {
  const bridgeShadows = shadowPairSVG(111.6, 400, 25.2, 8, atmo);
  return `
    <g class="vl-water" aria-hidden="true">
      <!-- The spring, and the upper reach into the pond. -->
      <path class="vl-stream-under" d="M151.2,224 C160,238 168,246 169.2,252 C174,266 178,282 180,296.8 L187,296
        C185,282 181,266 176,252 C174,246 165,238 156,224 Z"/>
      <path class="vl-stream" d="M151.2,224 C160,238 168,246 169.2,252 C174,266 178,282 180,296.8 L186,296
        C184,282 180,266 175,252 C173,246 165,238 156,224 Z"/>
      <ellipse class="vl-spring-foam" cx="153.5" cy="226" rx="3.2" ry="1.6"/>
      <!-- The lower reach: pond exit, past the Meadow, to the bridge and
           out the valley's western edge. -->
      <path class="vl-stream-under" d="M151.2,347.2 C136,358 126,368 122.4,375.2 C118,384 114,390 111.6,392
        C98,400 82,408 72,414.4 C48,420 20,424 0,425.6 L0,433
        C22,431 50,427 74,421.4 C86,415 100,407 114,399
        C118,395 122,389 128,382.2 C133,374 143,363 159,354.2 Z"/>
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
      <path class="vl-bridge-arch" d="M104,397 Q111.6,392 119,397"/>
    </g>`;
}

/** The ground shadow under one standing object (§5.2, Stage W1): a cast
 *  shadow (dawn, dusk, or autumn only) plus a contact shadow, always —
 *  both agreeing with the same hour's sun. */
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
 *  own seeded character. */
function seedFrom(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h >>> 0);
}

/* ---------------- The Rootwood, from the Overlook (Part 3.2) ---------------- */

/** The Rootwood's eighteen possible tree slots (Appendix C.7: x8–45%,
 *  y28–46%), authored once, in reveal order — the first seven read as two
 *  depth rows (Part 3.2's founding state), the rest deepen the wood into
 *  three rows as families are grown. Fixed forever: the wood never
 *  rearranges, it only deepens (Part 7.2). `row` picks a depth green. */
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
const ROOTWOOD_MASS_CEILING = ROOTWOOD_MASS_SLOTS.length;
/** One more tree for every two families grown past Sprout (0.17.0 — the
 *  wood answers the second family grown, and the eleven extra slots fill
 *  by the twenty-second), so the map visibly deepens week by week. */
const ROOTWOOD_FAMILIES_PER_TREE = 2;

/** Emergent crowns (Part 3.2: "one or two emergent crowns" where Ancients
 *  stand) — three authored spots above the canopy line, taken in order
 *  as families reach Ancient. The Landmark's own crown is the first. */
const EMERGENT_SPOTS = [{ x: 62, y: 158 }, { x: 118, y: 154 }, { x: 88, y: 150 }];

/** Depth-row body colours per season: three greens stacked (Part 3.2),
 *  back to front — cool and deep in the distance, lighter and warmer near.
 *  Autumn turns the deciduous wood gold (Law 3: leaves turning is
 *  beautiful; nothing browns); the Ancients' emergent crowns stay
 *  evergreen in every season (Part 8.2). Purely a depth device: the wood
 *  never shows any single plant's stage at Overlook zoom (Part 8.4). */
const ROOTWOOD_ROW_COLOR = Object.freeze({
  spring: ['#2A6B47', '#3C8A54', '#58A862'],
  summer: ['#1F5139', '#2E6E45', '#3E8A50'],
  autumn: ['#9C7326', '#B8892E', '#D2A642'],
  winter: ['#1F5139', '#2E6E45', '#3E8A50'],
});
const EVERGREEN = '#1B4A33';

/** The Rootwood, seen from the Overlook (Part 3.2): a fixed, growing
 *  cluster of trees — never individual plants — that deepens from seven
 *  in two rows to a ceiling of eighteen in three rows as families grow.
 *  At most one soft window of amber light waits inside the wood, in the
 *  tree nearest the asking family's own seeded slot, when a Rootwood
 *  family is asking (§16.1's one invitation). Emergent, deeper crowns
 *  stand where Ancients have been earned; the Landmark's carries a nest. */
function rootwoodMasses(rootwood, atmo) {
  const count = Math.min(ROOTWOOD_MASS_CEILING,
    ROOTWOOD_FOUNDING_COUNT + Math.floor(rootwood.grownCount / ROOTWOOD_FAMILIES_PER_TREE));
  const slots = ROOTWOOD_MASS_SLOTS.slice(0, count);
  const litSlotIndex = rootwood.litId ? seedFrom(rootwood.litId) % slots.length : -1;
  const winter = atmo.season === 'winter';
  const night = atmo.time === 'night';
  const rows = ROOTWOOD_ROW_COLOR[atmo.season] ?? ROOTWOOD_ROW_COLOR.summer;

  const groundShadow = `<ellipse class="vl-wood-ground-shadow" cx="95" cy="252" rx="78" ry="14"/>`;

  // Draw order within the wood: far row first, so nearer crowns overlap.
  const ordered = slots.map((s, i) => ({ s, i })).sort((a, b) => a.s.row - b.s.row || a.s.y - b.s.y);
  const masses = ordered.map(({ s, i }) => {
    const lean = ((seedFrom(`rw-${i}`) % 100) / 100 - 0.5) * 6;
    const lit = i === litSlotIndex;
    const base = rows[s.row];
    if (winter) return winterCanopy(s, lean, lit, i, atmo);
    // Night: the shade-face formula applied twice is what reaches §5.4's
    // "deep cool field" for a whole moonlit landscape (Stage W6's fix).
    const litHex = night ? shadeFace(shadeFace(base, 'night'), 'night') : litFace(base, atmo.time);
    const shadeHex = night ? shadeFace(shadeFace(shadeFace(base, 'night'), 'night'), 'night') : shadeFace(base, atmo.time);
    const capHex = night ? shadeFace(base, 'night') : litFace(litFace(base, atmo.time), atmo.time);
    const cx = s.x + lean;
    const trunkTop = s.y + s.r * 0.55;
    const trunkBottom = s.y + s.r * 1.08;
    return `
      <path class="vl-wood-trunk" d="M${cx.toFixed(1)},${trunkTop.toFixed(1)} L${cx.toFixed(1)},${trunkBottom.toFixed(1)}" style="stroke-width:${(s.r * 0.18).toFixed(1)}"/>
      <ellipse class="vl-wood-canopy" style="fill:${shadeHex}" cx="${(cx + s.r * 0.12).toFixed(1)}" cy="${(s.y + s.r * 0.12).toFixed(1)}" rx="${s.r}" ry="${(s.r * 0.86).toFixed(1)}"/>
      <ellipse class="vl-wood-canopy" style="fill:${litHex}" cx="${(cx - s.r * 0.1).toFixed(1)}" cy="${(s.y - s.r * 0.08).toFixed(1)}" rx="${(s.r * 0.86).toFixed(1)}" ry="${(s.r * 0.74).toFixed(1)}"/>
      <ellipse class="vl-wood-cap" style="fill:${capHex}" cx="${(cx - s.r * 0.32).toFixed(1)}" cy="${(s.y - s.r * 0.36).toFixed(1)}" rx="${(s.r * 0.42).toFixed(1)}" ry="${(s.r * 0.26).toFixed(1)}"/>
      ${lit ? `<circle class="vl-wood-glow vl-wood-glow--outer" cx="${cx.toFixed(1)}" cy="${(s.y - 1).toFixed(1)}" r="14.4"/>
              <circle class="vl-wood-glow" cx="${cx.toFixed(1)}" cy="${(s.y - 1).toFixed(1)}" r="7.2"/>` : ''}`;
  }).join('');

  // Emergent crowns where Ancients stand (Part 3.2, 3.4's notch): deep
  // evergreen, taller than the wood, the first with the Landmark's nest
  // and its gathered fireflies after dark (§6.5, §5.4).
  const emergents = Math.min(EMERGENT_SPOTS.length, rootwood.ancientCount);
  const crowns = EMERGENT_SPOTS.slice(0, emergents).map(({ x, y }, k) => {
    const landmark = k === 0 && rootwood.hasLandmark;
    return `
      <path class="vl-wood-trunk vl-wood-trunk--emergent" d="M${x},${y + 6} L${x},${y + 24}"/>
      <ellipse class="vl-wood-canopy vl-wood-canopy--emergent${landmark ? ' vl-wood-canopy--landmark' : ''}" style="fill:${night ? shadeFace(EVERGREEN, 'night') : EVERGREEN}" cx="${x}" cy="${y}" rx="13" ry="11"/>
      <ellipse class="vl-wood-cap" style="fill:${night ? EVERGREEN : litFace(EVERGREEN, atmo.time)}" cx="${x - 4}" cy="${y - 4}" rx="5.5" ry="3"/>
      ${landmark ? `<ellipse class="vl-canopy-nest" cx="${x + 4}" cy="${y - 2}" rx="2.6" ry="1.6"/>` : ''}
      ${landmark && night ? `<ellipse class="vl-landmark-glow" cx="${x}" cy="${y}" rx="18" ry="10.8"/>
        ${[[-4, -6], [5, -3], [1, 4]].map(([dx, dy], j) => faunaSVG('firefly', x + dx, y + dy, FRAME_WIDTH, { delay: j * 0.9 })).join('')}` : ''}`;
  }).join('');

  return `${groundShadow}${masses}${crowns}`;
}

/** One tree in its winter form (Part 6.6): the same authored slot, the
 *  same silhouette, held as a thin twig-haze with drawn branch structure
 *  rather than a solid summer mass. The wood is unmistakably the same
 *  wood — nothing moves, nothing is removed — it is simply bare. */
function winterCanopy(s, lean, lit, i, atmo) {
  const cx = s.x + lean;
  const base = ROOTWOOD_ROW_COLOR.winter[s.row];
  const twigs = [-0.55, -0.18, 0.2, 0.58].map((t, k) => {
    const ex = cx + t * s.r * 1.05;
    const ey = s.y - s.r * (0.5 + ((i + k) % 3) * 0.16);
    return `<path class="vl-winter-twig" d="M${cx.toFixed(1)},${(s.y + s.r * 0.5).toFixed(1)}
      Q${((cx + ex) / 2).toFixed(1)},${(s.y - s.r * 0.1).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}"/>`;
  }).join('');
  const glow = lit
    ? `<circle class="vl-wood-glow vl-wood-glow--outer" cx="${cx.toFixed(1)}" cy="${(s.y - 1).toFixed(1)}" r="14.4"/>
       <circle class="vl-wood-glow" cx="${cx.toFixed(1)}" cy="${(s.y - 1).toFixed(1)}" r="7.2"/>`
    : '';
  return `
    <path class="vl-wood-trunk" d="M${cx.toFixed(1)},${(s.y + s.r * 0.5).toFixed(1)} L${cx.toFixed(1)},${(s.y + s.r * 1.08).toFixed(1)}" style="stroke-width:${(s.r * 0.16).toFixed(1)}"/>
    <ellipse class="vl-winter-haze" style="fill:${shadeFace(base, atmo.time)}"
      cx="${cx.toFixed(1)}" cy="${s.y}" rx="${(s.r * 0.92).toFixed(1)}" ry="${(s.r * 0.78).toFixed(1)}"/>
    ${twigs}${glow}`;
}

/** The Overlook's frame width, in its own SVG units — the denominator for
 *  every share-of-frame-width size THE WORLD Part 9.3 pins. */
const FRAME_WIDTH = 360;

/** The hearth cat (Part 4.5, 9.1–9.2), from the roster: two soft masses
 *  and a tail sweep, no face; one slow breathing cycle. Never clickable
 *  and never reacts — the anti-companion, the world's quietest joke. */
function hearthCatSVG(spot) {
  return faunaSVG('cat', spot.x, spot.y, FRAME_WIDTH);
}

/** Where each creature belongs, by the region Bible §4.8 gives it — the
 *  Meadow's drifts, the Thicket's rim, the pond's lip, the stones, the
 *  Rootwood's canopy — all reading off Appendix C.7's founding geometry.
 *  Fauna move, so what is authored is the PLACE they belong to. */
const VISITOR_SPOT = Object.freeze({
  'butterfly-white': { x: 72, y: 316 },   // over the Meadow's drifts
  'butterfly-dark': { x: 300, y: 400 },   // the Thicket's rim
  bird: { x: 60, y: 150 },                // crossing, high, and gone
  firefly: { x: 96, y: 232 },             // in the Rootwood
  moth: { x: 62, y: 312 },                // near the pale meadow flowers
  snail: { x: 231, y: 337 },              // on the pale rock pair
  frog: { x: 203, y: 344 },               // at the reeds, the pond's lip
  deer: { x: 150, y: 258 },               // the wood's edge
  fox: { x: 140, y: 362 },                // crossing the near floor
  heron: { x: 206, y: 334 },              // standing at the pond
  owl: { x: 140, y: 172 },                // in the Rootwood's high canopy
});

/** This visit's one quiet life, if any (Bible §4.8, Part 9.2). Never
 *  frequent, never synchronised with anything else on screen, never
 *  tappable, and never a reward for arriving. */
function visitorSVG(kind) {
  const spot = kind ? VISITOR_SPOT[kind] : null;
  if (!spot) return '';
  return `<g class="vl-visitor" data-visitor="${kind}">${faunaSVG(kind, spot.x, spot.y, FRAME_WIDTH)}</g>`;
}

/* ---------------- Plane 4: the Hearth ---------------- */

/**
 * The Hearth (THE WORLD Part 4, Appendix C.3): the low dry-stone wall
 * with the Gate set in its gap, the cottage (gable, roof, the window
 * that is warm at every dusk and every night, unconditionally, and the
 * chimney), the bench, the bench lantern, and the kettle-stone. Given
 * whole from day one (Part 4.2 — home is given, never earned). The
 * hearth cat, when the ambient roll finds it, sleeps at one of its two
 * authored spots (Part 4.5, 9.3). Its contents are locked (Part 14);
 * 0.16.0 only draws the same things with more care — stone joints in
 * the wall, a ridge and eave on the roof, a back to the bench, and the
 * young grass at the wall's foot that Part 4.2 founds.
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
  const joints = [[12, 447], [40, 449], [62, 452], [120, 452], [160, 456], [200, 460], [240, 464], [290, 468], [330, 472]]
    .map(([x, y]) => `<path class="vl-wall-joint" d="M${x},${y} l4,0.4"/>`).join('');
  const grass = [[8, 456], [30, 458], [58, 462], [104, 464], [140, 468], [176, 471], [222, 476], [262, 480]]
    .map(([x, y]) => `<path class="vl-wall-grass" d="M${x},${y + 6} q1,-4 2,-7 M${x + 3},${y + 6} q0,-3 1.5,-6"/>`).join('');

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
      ${joints}
      ${grass}
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
      <path class="vl-cottage-roof-shade" d="M309.6,440 L378,470.4 L309.6,470.4 Z"/>
      <path class="vl-cottage-roof-lit" d="M241,470.4 L309.6,440 L309.6,470.4 Z"/>
      <path class="vl-cottage-ridge" d="M241,470.4 L309.6,440 L378,470.4"/>
      <path class="vl-cottage-eave" d="M244.8,470.4 L374.4,470.4"/>
      <path class="vl-cottage-wall-shade" d="M277,431.2 L284.6,431.2 L284.6,451 L277,451 Z"/>
      <path class="vl-cottage-wall-lit" d="M277,410 L284.6,410 L284.6,431.2 L277,431.2 Z"/>
      <path class="vl-cottage-chimney-cap" d="M275.5,410 L286.1,410"/>
      ${smoke}
      <rect class="vl-window${warm ? ' vl-window--lit' : ''}" x="295.2" y="473.2" width="14.4" height="28" rx="1.4"/>
      <path class="vl-window-bar" d="M302.4,473.2 L302.4,501.2 M295.2,487.2 L309.6,487.2"/>
      ${windowGlow}
    </g>

    <!-- The bench, the bench lantern, and the kettle-stone (Appendix
         C.3) — the Journal lives here (Bible §4.9). -->
    <g class="vl-bench-group" aria-hidden="true">
      <path class="vl-bench-back" d="M148.6,484 L182.6,484 L182.6,486.4 L148.6,486.4 Z"/>
      <path class="vl-bench-legs" d="M151,486.4 L151,490.4 M180.2,486.4 L180.2,490.4" stroke-linecap="round"/>
      <path class="vl-bench" d="M147.6,490.4 L183.6,490.4 L183.6,495.2 L147.6,495.2 Z"/>
      <path class="vl-bench-legs" d="M150,495.2 L150,499 M181.2,495.2 L181.2,499" stroke-linecap="round"/>
    </g>
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
