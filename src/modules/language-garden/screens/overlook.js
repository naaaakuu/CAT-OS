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
 * (§5.8, Principle 64). Tapping the Rootwood descends into it.
 *
 * First open, ever (§3.1): there is no splash, no tour, no menu. If
 * nothing has grown, the learner is taken straight into the first
 * family's session — "the first Attempt is the first thing they touch".
 * They arrive at the Overlook for the first time ninety seconds later,
 * and it already has something growing in it.
 *
 * The Stream is drawn here as the valley's water, at a calm default. Its
 * LEVEL, brightness, and sound are the consistency signal (§8.4) and are
 * wired in a later phase; the streambed is the honest, permanent
 * geography that behaviour will one day move. (Extension point below.)
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions } from '../logic/store.js';
import { deriveValleyScene } from '../logic/scene.js';
import { biomeBySlug } from '../logic/biomes.js';
import { computeStreamLevel, streamBand, computeGroundTier, computePathWear } from '../logic/effort.js';
import { VALLEY_LINES } from '../../../core/mentor/garden-voice.js';
import { escapeHTML } from '../../../core/utils/format.js';
import '../../../ui/components/cat-plant.js';

export async function renderOverlook(outlet, context) {
  outlet.innerHTML = `<section class="screen valley-loading">
    <div class="skeleton" style="height: 72vh; border-radius: var(--radius-xl)"></div>
  </section>`;

  let families, sessions;
  try {
    const registry = await listLGItems();
    const loaded = await loadLGItems(registry.map((i) => i.id));
    families = registry.map((i) => loaded.get(i.id)).filter(Boolean)
      .sort((a, b) => a.meta.id.localeCompare(b.meta.id));
    sessions = await listGardenSessions(context.storage);
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

  const scene = deriveValleyScene(families, sessions);
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
/* that turns it into ground.                                          */
/* ------------------------------------------------------------------ */

function renderValley(outlet, scene, effort) {
  const rootwood = biomeBySlug('rootwood');
  const rootwoodPlants = (scene.byBiome.get('rootwood') ?? [])
    .filter((p) => p.state.stage !== 'open_ground' && p.state.stage !== 'seed');
  const litInRootwood = scene.askingBiomeSlug === 'rootwood' ? scene.askingId : null;

  outlet.innerHTML = `
    <section class="screen valley-screen" aria-label="${escapeHTML(VALLEY_LINES.overlookLabel)}">
      <div class="valley" data-time="${timeClass()}" data-stream="${effort.streamBand}">
        <svg class="valley__svg" viewBox="0 0 360 560" preserveAspectRatio="xMidYMid slice">
          ${landforms()}
          ${groundMarks(effort.ground.tier)}
          ${path(effort.rootwoodPathWear)}
          ${stream()}
          ${rootwoodCanopy(rootwoodPlants, litInRootwood)}
          <!-- The one living region is the only interactive shape on the valley.
               It lives inside the SVG so it always lines up with the drawn wood,
               whatever the crop. The rest is land, not controls. -->
          <ellipse class="vl-hit" id="enter-rootwood" cx="180" cy="236" rx="130" ry="84"
                   role="button" tabindex="0"
                   aria-label="${escapeHTML(VALLEY_LINES.enterBiome(rootwood.name))}"></ellipse>
        </svg>
      </div>

      <nav class="valley__marks" aria-label="Garden">
        <a class="valley__mark" href="#/home">${escapeHTML(VALLEY_LINES.leave)}</a>
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
}

/** The permanent geography: the distant Wilds ridge, the valley basin, and
 *  the seven regions as flat patches — one living, six still wild. The land
 *  fills most of the frame; the sky is a calm band, not half the world. */
function landforms() {
  return `
    <rect class="vl-sky" x="0" y="0" width="360" height="138"/>

    <!-- The Wilds: always visible on the horizon, never entered (§5.8). -->
    <path class="vl-wilds" d="M0,140 L0,120 Q50,104 96,116 Q150,98 200,114
      Q250,96 306,116 Q336,106 360,120 L360,140 Z"/>

    <!-- The valley basin, seen from above, with a lower fold for depth. -->
    <path class="vl-basin" d="M0,136 Q180,116 360,136 L360,560 L0,560 Z"/>
    <path class="vl-basin-2" d="M0,392 Q180,372 360,392 L360,560 L0,560 Z"/>

    <!-- West: the Meadow, spilling off the edge like real terrain. -->
    <ellipse class="vl-meadow" cx="40" cy="300" rx="88" ry="56"/>
    <!-- East: the Vine Terraces on the morning slope, with a few step lines. -->
    <path class="vl-terrace" d="M264,166 Q326,172 360,198 L360,332 Q318,322 270,326
      Q248,246 264,166 Z"/>
    <path class="vl-terrace-step" d="M276,224 Q322,226 356,244"/>
    <path class="vl-terrace-step" d="M270,268 Q318,272 354,290"/>
    <!-- South-east: the Thicket, tangled and dark, curling in from the corner. -->
    <path class="vl-thicket" d="M282,394 Q360,390 360,424 L360,518 Q320,516 282,510
      Q266,452 282,394 Z"/>
    <!-- South: the Orchard, open and low. -->
    <ellipse class="vl-orchard" cx="172" cy="456" rx="106" ry="50"/>

    <!-- North / centre: the living Rootwood ground, richer and the clear heart. -->
    <ellipse class="vl-grove vl-grove--rim" cx="180" cy="236" rx="132" ry="86"/>
    <ellipse class="vl-grove" cx="180" cy="236" rx="126" ry="80"/>`;
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
  return `<path class="vl-path vl-path--${wear}" d="M235,540 C222,470 210,400 205,345"/>`;
}

/** The Mirror Pond and the Stream that threads the valley. The stream runs
 *  from the Rootwood, through the pond, and out to the west (§4.2).
 *  EXTENSION POINT (Phase 3, §8.4): the stream's width / brightness / sound
 *  become the consistency signal. Here it is drawn at a calm default. */
function stream() {
  return `
    <path class="vl-stream vl-stream--under" d="M186,196 C176,250 150,300 180,372
      C152,412 92,430 24,528"/>
    <path class="vl-stream" d="M186,196 C176,250 150,300 180,372
      C152,412 92,430 24,528"/>
    <!-- The Mirror Pond, still, at the low centre. -->
    <ellipse class="vl-pond" cx="180" cy="372" rx="46" ry="25"/>
    <ellipse class="vl-pond-sky" cx="180" cy="368" rx="31" ry="14"/>`;
}

/** The Rootwood, from a distance: a small cluster of simplified canopies,
 *  one per grown plant. The single valley-wide invitation (if it is in the
 *  Rootwood) glows amber — at most one, ever, at Overlook zoom (§16.1). */
function rootwoodCanopy(plants, litId) {
  if (plants.length === 0) return '';
  // A gentle deterministic arc across the Rootwood ground — never random,
  // so the wood looks the same each time the learner arrives.
  const cx = 180, cy = 232, spanX = 158, spanY = 36;
  const n = plants.length;
  return plants.map((p, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = cx - spanX / 2 + spanX * t;
    const y = cy + Math.sin(t * Math.PI) * -spanY + (i % 2) * 10;
    const r = canopyRadius(p.state.stage);
    const lit = p.family.meta.id === litId;
    const glow = lit ? `<circle class="vl-canopy-glow" cx="${x.toFixed(1)}" cy="${(y - 2).toFixed(1)}" r="${(r + 9).toFixed(1)}"/>` : '';
    return `
      ${glow}
      <path class="vl-canopy-trunk" d="M${x.toFixed(1)},${(y + r + 5).toFixed(1)} L${x.toFixed(1)},${(y + r - 1).toFixed(1)}"/>
      <ellipse class="vl-canopy vl-canopy--${p.state.stage}${lit ? ' vl-canopy--lit' : ''}"
        cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.92).toFixed(1)}"/>`;
  }).join('');
}

function canopyRadius(stage) {
  return { sprout: 4, young: 7, in_leaf: 9, mature: 11, ancient: 13 }[stage] ?? 7;
}

function timeClass() {
  const h = new Date().getHours();
  if (h < 6 || h >= 20) return 'night';
  if (h >= 17) return 'dusk';
  return 'day';
}
