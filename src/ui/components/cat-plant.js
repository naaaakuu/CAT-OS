/**
 * <cat-plant> — a plant in the Language Garden, drawn as layered vector
 * shapes (LANGUAGE_GARDEN_BIBLE §11.7: "layered vector states, not a
 * rendered world... no physics, no particle system, no procedural
 * generation, no per-leaf simulation"). Presentation only (Rule 7):
 * attributes in, an inline SVG out, no business logic, no events — the
 * plant never knows what stage it's "supposed" to be, it only draws the
 * one it is told.
 *
 * Attributes:
 *   stage  one of STAGES in core/engine/garden-session.js:
 *          "open_ground" | "seed" | "sprout" | "young" | "in_leaf" |
 *          "mature" | "ancient"
 *   due    "none" | "gold" | "bare"        (default "none")
 *   size   "foreground" | "horizon"        (default "foreground")
 *   nest   boolean presence attribute      (a bird's nest, Ancient only)
 *
 * The six stages are legible at a glance (§6.2): each is a distinct
 * silhouette — bare ground, a seed, a sprout, a young tree, a first
 * canopy, a full flowering canopy, and the grand old tree of the
 * horizon. Continuous refinement WITHIN a stage (girth/height with total
 * retrievals — §6.3) is deliberately NOT here yet; that is a later phase,
 * and these discrete states are the honest foundation it will build on.
 *
 * Canopy positions are FIXED, hand-tuned per stage via one small
 * deterministic ring layout (never Math.random(), never per-render
 * variation) — enumerable states, not a simulation, so a six-month-old
 * garden renders exactly as cheaply as a one-day-old one.
 */

/** count blobs evenly around (cx, cy) at `radius`, flattened slightly
 *  (squash) so the canopy reads as foliage, not a perfect wheel. */
function ring(cx, cy, count, radius, r, startDeg = -90, squash = 0.82) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const rad = ((startDeg + (360 / count) * i) * Math.PI) / 180;
    out.push({ cx: cx + Math.cos(rad) * radius, cy: cy + Math.sin(rad) * radius * squash, r });
  }
  return out;
}

/* Trunk top (canopy anchor), blob layout, and — for Mature — a few quiet
   blossoms, per stage. Hand-composed, fixed: the entire "state space"
   this component ever draws. `open_ground` and `seed` carry no canopy;
   they are handled specially in #render. */
const STAGES = {
  open_ground: null,
  seed:      { trunkTop: 118, trunkBottom: 122, blobs: [] },
  sprout:    { trunkTop: 100, trunkBottom: 120, blobs: [{ cx: 60, cy: 96, r: 5 }, ...ring(60, 97, 2, 7, 4)] },
  young:     { trunkTop: 78,  trunkBottom: 120, blobs: [{ cx: 60, cy: 72, r: 11 }, ...ring(60, 74, 5, 15, 9)] },
  in_leaf:   { trunkTop: 60,  trunkBottom: 120, blobs: [{ cx: 60, cy: 53, r: 15 }, ...ring(60, 54, 6, 19, 11), ...ring(60, 46, 4, 30, 8)] },
  mature:    { trunkTop: 54,  trunkBottom: 120,
               blobs: [{ cx: 60, cy: 47, r: 16 }, ...ring(60, 48, 6, 21, 11), ...ring(60, 39, 5, 33, 8)],
               // A handful of quiet blossoms — Mature's "flowers, or fruit"
               // (§6.2), kept sparse and pale so the Rootwood stays serious.
               blooms: [{ cx: 44, cy: 45 }, { cx: 75, cy: 41 }, { cx: 60, cy: 28 }, { cx: 51, cy: 57 }, { cx: 71, cy: 56 }] },
  ancient:   { trunkTop: 48,  trunkBottom: 120, blobs: [{ cx: 60, cy: 40, r: 17 }, ...ring(60, 41, 7, 22, 12), ...ring(60, 32, 6, 33, 10), ...ring(60, 25, 4, 43, 8)] },
};

/* Bare-branch fan (the "due: bare" overlay): a purpose-built winter
   silhouette, never a thinned-out copy of the lush canopy — a graceful
   dormant tree, not a damaged one (Bible §6.4: "never appear dead").
   Only trees that have a canopy to lose have a bare form. */
const BARE_BRANCHES = {
  young:     4,
  in_leaf:   6,
  mature:    7,
  ancient:   8,
};

function branchFan(trunkTop, count) {
  const spread = 70; // degrees either side of straight up
  const paths = [];
  const buds = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const deg = -90 - spread / 2 + spread * t;
    const rad = (deg * Math.PI) / 180;
    const len = 22 + (i % 2) * 6;
    const midX = 60 + Math.cos(rad) * len * 0.55;
    const midY = trunkTop - 4 - Math.abs(Math.sin(rad)) * len * 0.55;
    const endX = 60 + Math.cos(rad) * len;
    const endY = trunkTop - 6 - Math.abs(Math.sin(rad)) * len;
    paths.push(`M60,${trunkTop} Q${midX.toFixed(1)},${midY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`);
    buds.push({ cx: endX, cy: endY, r: 2.6 });
  }
  return { paths, buds };
}

class CatPlant extends HTMLElement {
  static get observedAttributes() { return ['stage', 'due', 'size', 'nest']; }
  attributeChangedCallback() { this.#render(); }
  connectedCallback() { this.#render(); }

  #render() {
    const attr = this.getAttribute('stage');
    const stage = attr in STAGES ? attr : 'open_ground';
    const due = this.getAttribute('due') ?? 'none';
    const size = this.getAttribute('size') ?? 'foreground';
    const hasNest = this.hasAttribute('nest');

    if (size === 'horizon') {
      this.innerHTML = this.#horizonSVG();
      return;
    }

    const soil = `<ellipse cx="60" cy="122" rx="20" ry="4" class="pl-soil"/>`;

    // Open ground: bare earth and a little grass. Never a padlock, never a
    // price, never a hole (Bible §6.2 stage 0) — just ground that could hold
    // something one day.
    if (stage === 'open_ground') {
      const grass = [46, 54, 62, 70].map((x, i) =>
        `<path d="M${x},121 q${i % 2 ? 2 : -2},-6 ${i % 2 ? 1 : -1},-8" class="pl-grass"/>`).join('');
      this.innerHTML = this.#wrap(`${soil}${grass}`);
      return;
    }

    const cfg = STAGES[stage];
    const trunk = stage === 'seed'
      ? `<circle cx="60" cy="119" r="3" class="pl-seed"/>`
      : `<path d="M60,${cfg.trunkBottom} L60,${cfg.trunkTop}" class="pl-trunk-line"/>`;

    let canopy = '';
    if (due === 'bare' && BARE_BRANCHES[stage]) {
      const { paths, buds } = branchFan(cfg.trunkTop, BARE_BRANCHES[stage]);
      canopy = `
        ${paths.map((d) => `<path d="${d}" class="pl-branch"/>`).join('')}
        ${buds.map((b) => `<circle cx="${b.cx.toFixed(1)}" cy="${b.cy.toFixed(1)}" r="${b.r}" class="pl-bud"/>`).join('')}`;
    } else {
      canopy = cfg.blobs.map((b, i) => {
        // Lit (gold) leaves: some of the canopy has caught the light (§6.4).
        const golden = due === 'gold' && i % 3 === 0;
        return `<circle cx="${b.cx.toFixed(1)}" cy="${b.cy.toFixed(1)}" r="${b.r}" class="pl-leaf${golden ? ' pl-leaf--gold' : ''}"/>`;
      }).join('');
      // Mature's blossoms sit on top of the full canopy, and only when it is
      // in leaf (a bare Mature is dormant and shows buds, not blossom).
      if (cfg.blooms) {
        canopy += cfg.blooms.map((b) => `<circle cx="${b.cx}" cy="${b.cy}" r="2.4" class="pl-bloom"/>`).join('');
      }
    }

    const nestArt = hasNest && cfg.blobs.length
      ? `<ellipse cx="${(cfg.blobs[0].cx + 8).toFixed(1)}" cy="${(cfg.blobs[0].cy + 5).toFixed(1)}" rx="7" ry="4" class="pl-nest"/>`
      : '';

    this.innerHTML = this.#wrap(`${soil}${trunk}${canopy}${nestArt}`, stage);
  }

  /** One <style> + <svg> shell shared by every foreground state, so the
   *  leaf-colour maturity ramp and the lit shimmer live in one place. */
  #wrap(inner, stage = 'open_ground') {
    return `
      <style>
        cat-plant { display: block; }
        cat-plant svg { width: 100%; height: 100%; display: block; overflow: visible; }
        .pl-soil { fill: var(--garden-soil); }
        .pl-grass { stroke: var(--garden-young); fill: none; stroke-width: 1.6; stroke-linecap: round; opacity: 0.7; }
        .pl-trunk-line { stroke: var(--garden-trunk); fill: none; stroke-width: 3.2; stroke-linecap: round; }
        .pl-seed { fill: var(--garden-trunk); }
        .pl-branch { stroke: var(--garden-bare-branch); fill: none; stroke-width: 2; stroke-linecap: round; }
        .pl-bud { fill: var(--garden-bud); }
        .pl-bloom { fill: var(--garden-bloom); }
        .pl-nest { fill: var(--garden-trunk); opacity: 0.55; }
        .pl-leaf {
          fill: var(--pl-leaf-color, var(--garden-young));
          transition: fill var(--duration-slower, 560ms) var(--ease-out, ease);
        }
        .pl-leaf--gold {
          fill: var(--garden-review);
          animation: pl-catch-light 5s ease-in-out infinite;
        }
        @keyframes pl-catch-light {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }
        @media (prefers-reduced-motion: reduce) { .pl-leaf--gold { animation: none; } }
        /* The maturity ramp: green deepens with the plant's age (§12.2). */
        cat-plant[stage="sprout"]  .pl-leaf { --pl-leaf-color: var(--garden-sprout); }
        cat-plant[stage="young"]   .pl-leaf { --pl-leaf-color: var(--garden-young); }
        cat-plant[stage="in_leaf"] .pl-leaf { --pl-leaf-color: var(--garden-inleaf); }
        cat-plant[stage="mature"]  .pl-leaf { --pl-leaf-color: var(--garden-mature); }
        cat-plant[stage="ancient"] .pl-leaf { --pl-leaf-color: var(--garden-ancient); }
      </style>
      <svg viewBox="0 0 120 130" role="img" aria-hidden="true">${inner}</svg>
    `;
  }

  /** The old-growth horizon: a flattened, detail-free silhouette
   *  (Bible §11.7: Ancient trees "collapsed into a static horizon layer").
   *  Deliberately the cheapest possible render — this is what keeps a
   *  garden full of Ancient trees as fast as an empty one. */
  #horizonSVG() {
    return `
      <style>
        cat-plant { display: block; }
        cat-plant svg { width: 100%; height: 100%; display: block; }
        .pl-silhouette { fill: var(--garden-ancient); opacity: 0.32; }
      </style>
      <svg viewBox="0 0 120 130" role="img" aria-hidden="true">
        <ellipse cx="60" cy="70" rx="34" ry="46" class="pl-silhouette"/>
      </svg>
    `;
  }
}

customElements.define('cat-plant', CatPlant);
