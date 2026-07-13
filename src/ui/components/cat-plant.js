/**
 * <cat-plant> — a plant in the Root Grove, drawn as layered vector
 * shapes (LANGUAGE_GARDEN_BIBLE §12: "a small number of layered vector
 * states, not a rendered world... no physics, no particle system, no
 * procedural generation, no per-leaf simulation"). Presentation only
 * (Rule 7): attributes in, an inline SVG out, no business logic, no
 * events — the plant never knows what stage it's "supposed" to be,
 * it only draws the one it is told.
 *
 * Attributes:
 *   stage  "seed" | "sprout" | "sapling" | "in_leaf" | "evergreen"
 *   due    "none" | "gold" | "bare"        (default "none")
 *   size   "foreground" | "horizon"        (default "foreground")
 *   nest   boolean presence attribute
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

/* Trunk top (canopy anchor) and blob layout, per stage. Hand-composed,
   fixed — the entire "state space" this component ever draws. */
const STAGES = {
  seed:      { trunkTop: 118, trunkBottom: 122, blobs: [] },
  sprout:    { trunkTop: 100, trunkBottom: 120, blobs: [{ cx: 60, cy: 96, r: 5 }, ...ring(60, 97, 2, 7, 4)] },
  sapling:   { trunkTop: 78,  trunkBottom: 120, blobs: [{ cx: 60, cy: 72, r: 11 }, ...ring(60, 74, 5, 15, 9)] },
  in_leaf:   { trunkTop: 60,  trunkBottom: 120, blobs: [{ cx: 60, cy: 53, r: 15 }, ...ring(60, 54, 6, 19, 11), ...ring(60, 46, 4, 30, 8)] },
  evergreen: { trunkTop: 48,  trunkBottom: 120, blobs: [{ cx: 60, cy: 40, r: 17 }, ...ring(60, 41, 7, 22, 12), ...ring(60, 32, 6, 33, 10), ...ring(60, 25, 4, 43, 8)] },
};

/* Bare-branch fan (the "due: bare" overlay): a purpose-built winter
   silhouette, never a thinned-out copy of the lush canopy — a graceful
   dormant tree, not a damaged one (Bible §6.4: "never appear dead"). */
const BARE_BRANCHES = {
  sapling:   4,
  in_leaf:   6,
  evergreen: 8,
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
    const stage = STAGES[this.getAttribute('stage')] ? this.getAttribute('stage') : 'seed';
    const due = this.getAttribute('due') ?? 'none';
    const size = this.getAttribute('size') ?? 'foreground';
    const hasNest = this.hasAttribute('nest');
    const cfg = STAGES[stage];

    if (size === 'horizon') {
      this.innerHTML = this.#horizonSVG(stage);
      return;
    }

    const soil = `<ellipse cx="60" cy="122" rx="20" ry="4" class="pl-soil"/>`;
    const trunk = stage === 'seed'
      ? `<circle cx="60" cy="119" r="3" class="pl-trunk"/>`
      : `<path d="M60,${cfg.trunkBottom} L60,${cfg.trunkTop}" class="pl-trunk-line"/>`;

    let canopy = '';
    if (due === 'bare' && BARE_BRANCHES[stage]) {
      const { paths, buds } = branchFan(cfg.trunkTop, BARE_BRANCHES[stage]);
      canopy = `
        ${paths.map((d) => `<path d="${d}" class="pl-branch"/>`).join('')}
        ${buds.map((b) => `<circle cx="${b.cx.toFixed(1)}" cy="${b.cy.toFixed(1)}" r="${b.r}" class="pl-bud"/>`).join('')}`;
    } else {
      canopy = cfg.blobs.map((b, i) => {
        const golden = due === 'gold' && i % 3 === 0;
        return `<circle cx="${b.cx.toFixed(1)}" cy="${b.cy.toFixed(1)}" r="${b.r}" class="pl-leaf${golden ? ' pl-leaf--gold' : ''}"/>`;
      }).join('');
    }

    const nestArt = hasNest && cfg.blobs.length
      ? `<ellipse cx="${(cfg.blobs[0].cx + 8).toFixed(1)}" cy="${(cfg.blobs[0].cy + 5).toFixed(1)}" rx="7" ry="4" class="pl-nest"/>`
      : '';

    this.innerHTML = `
      <style>
        cat-plant { display: block; }
        cat-plant svg { width: 100%; height: 100%; display: block; overflow: visible; }
        .pl-soil { fill: var(--garden-soil); }
        .pl-trunk, .pl-trunk-line { stroke: var(--garden-trunk); fill: none; stroke-width: 3.2; stroke-linecap: round; }
        .pl-trunk { fill: var(--garden-trunk); stroke: none; }
        .pl-branch { stroke: var(--garden-bare-branch); fill: none; stroke-width: 2; stroke-linecap: round; }
        .pl-bud { fill: var(--garden-bud); }
        .pl-nest { fill: var(--garden-trunk); opacity: 0.55; }
        .pl-leaf {
          fill: var(--pl-leaf-color, var(--garden-sapling));
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
        cat-plant[stage="seed"]      .pl-leaf { --pl-leaf-color: var(--garden-sprout); }
        cat-plant[stage="sprout"]    .pl-leaf { --pl-leaf-color: var(--garden-sprout); }
        cat-plant[stage="sapling"]   .pl-leaf { --pl-leaf-color: var(--garden-sapling); }
        cat-plant[stage="in_leaf"]   .pl-leaf { --pl-leaf-color: var(--garden-inleaf); }
        cat-plant[stage="evergreen"] .pl-leaf { --pl-leaf-color: var(--garden-evergreen); }
      </style>
      <svg viewBox="0 0 120 130" role="img" aria-hidden="true">
        ${soil}
        ${trunk}
        ${canopy}
        ${nestArt}
      </svg>
    `;
  }

  /** The old-growth horizon: a flattened, detail-free silhouette
   *  (Bible §4: "collapsed into a static horizon"). Deliberately the
   *  cheapest possible render — this is what keeps a garden full of
   *  evergreens as fast as an empty one. */
  #horizonSVG() {
    return `
      <style>
        cat-plant { display: block; }
        cat-plant svg { width: 100%; height: 100%; display: block; }
        .pl-silhouette { fill: var(--garden-evergreen); opacity: 0.32; }
      </style>
      <svg viewBox="0 0 120 130" role="img" aria-hidden="true">
        <ellipse cx="60" cy="70" rx="34" ry="46" class="pl-silhouette"/>
      </svg>
    `;
  }
}

customElements.define('cat-plant', CatPlant);
