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
 *   vigor  "0".."1" — continuous refinement (§6.3), default "0"
 *   seed   any stable string (usually the family id) — the plant's fixed
 *          character (its lean, its canopy balance, the wobble of its
 *          masses), so a learner's oldest tree always has the same
 *          individual shape (Visual Guide 6.3). Optional.
 *   nest   boolean presence attribute      (a bird's nest — a Landmark tree)
 *   landmark  boolean presence attribute   (Ancient the world singled out, §6.5)
 *   name   the family label, drawn once as a name plate at a Landmark's
 *          base — the only text ever on a plant (§6.5, Principle 106)
 *
 * The tree language follows the Visual & Emotional Design Guide Part 6:
 * a tree is a TRUNK (one tapering mass with a slight lean), at most a
 * few PRIMARY BRANCHES, and TWO TO FOUR CANOPY MASSES — overlapping
 * organic blobs, each with a soft, slightly irregular edge that suggests
 * leaves without drawing them. Growth reads as EXTENSION, never scaling
 * (Guide 6.2): every stage adds a specific new structure — a stem, a
 * first mass, a branch, a crown — so each is unmistakable in silhouette.
 * Light is one direction (upper left): every canopy carries a warm lit
 * face and a cool shaded face (Guide 11.4), painted as two quiet
 * translucent overlays, never a gradient pretending to be 3D (Guide 4.2).
 *
 * Every tree leans (Guide 6.3): a stable seeded parameter tilts the
 * trunk, biases the canopy, and phases the blob wobble — identity, never
 * randomness. Same seed, same tree, forever. Nothing here is random per
 * render; the entire drawing is a pure function of the attributes.
 */

/** Minimal escaper for the one bit of text a plant ever carries (a Landmark's
 *  name), so a family label can never inject markup into the SVG. */
function escapeText(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/** A tiny, stable hash of the `seed` string → a deterministic number in
 *  [-1, 1]. Same seed, same character, forever. */
function seedUnit(seed) {
  if (!seed) return 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/** A seeded, deterministic pseudo-random stream (mulberry32 over an FNV
 *  hash) — the plant's fixed character, NOT randomness: the same seed
 *  yields the same stream every render, forever. */
function seedRng(seed) {
  let h = 2166136261;
  const s = String(seed ?? 'rootwood');
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A soft, closed organic blob: n points around an ellipse, each nudged
 *  by the seeded stream, joined through midpoints with quadratic curves.
 *  The slight irregularity is the "hand-feel in the edges" (Guide 4.2 #4)
 *  — designed and consistent, never noise per frame. */
function blobPath(cx, cy, rx, ry, rnd, wobble = 0.12, n = 8) {
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (Math.PI * 2 * i) / n;
    const w = 1 + (rnd() * 2 - 1) * wobble;
    pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]);
  }
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let m = mid(pts[n - 1], pts[0]);
  let d = `M${m[0].toFixed(1)},${m[1].toFixed(1)}`;
  for (let i = 0; i < n; i += 1) {
    m = mid(pts[i], pts[(i + 1) % n]);
    d += ` Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

/** One tapering trunk with a gentle lean — a filled mass, never a straight
 *  machine stroke (Guide 4.2 #4, 6.1). Base at (60, 121). */
function trunkPath(lean, topY, baseW, topW) {
  const bx = 60, by = 121;
  const tx = 60 + lean;
  const cy = (by + topY) / 2 + 4;
  const cxl = 60 + lean * 0.35 - baseW * 0.42;
  const cxr = 60 + lean * 0.35 + baseW * 0.42;
  return `M${(bx - baseW / 2).toFixed(1)},${by}`
    + ` C${cxl.toFixed(1)},${cy.toFixed(1)} ${(tx - topW / 2).toFixed(1)},${(topY + 9).toFixed(1)} ${(tx - topW / 2).toFixed(1)},${topY}`
    + ` L${(tx + topW / 2).toFixed(1)},${topY}`
    + ` C${(tx + topW / 2).toFixed(1)},${(topY + 9).toFixed(1)} ${cxr.toFixed(1)},${cy.toFixed(1)} ${(bx + baseW / 2).toFixed(1)},${by} Z`;
}

/** A primary branch: one soft curve from the trunk out into a canopy mass. */
function branchPath(fx, fy, tx, ty) {
  const mx = (fx + tx) / 2;
  const my = Math.min(fy, ty) - 3;
  return `M${fx.toFixed(1)},${fy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`;
}

/* The stage anatomy (Guide 6.1–6.2): each growth stage ADDS a structure
   the previous stage did not have — a stem, a first mass, a side mass, a
   branch, a crown — so growth reads as extension, never scaling, and
   every stage is unmistakable in silhouette. Hand-composed and fixed:
   this table is the entire state space the component ever draws.
   `masses` are offsets from the trunk top; the first is the main mass. */
const STAGE_ART = {
  young: {
    topY: 86, baseW: 3.6, topW: 1.8,
    masses: [{ ox: 0, oy: -10, rx: 13, ry: 10 }, { ox: -8, oy: -3, rx: 8, ry: 6 }],
    branches: 0,
  },
  in_leaf: {
    topY: 66, baseW: 4.6, topW: 2.1,
    masses: [{ ox: 0, oy: -11, rx: 18, ry: 12 }, { ox: -13, oy: -4, rx: 10, ry: 8 }, { ox: 12, oy: -5, rx: 9, ry: 7 }],
    branches: 1,
  },
  mature: {
    topY: 58, baseW: 5.6, topW: 2.5,
    masses: [{ ox: 0, oy: -14, rx: 22, ry: 14 }, { ox: -16, oy: -6, rx: 13, ry: 9 }, { ox: 15, oy: -7, rx: 12, ry: 9 }],
    branches: 2,
    blooms: 5,
  },
  ancient: {
    topY: 52, baseW: 7.2, topW: 3.1,
    masses: [{ ox: 0, oy: -16, rx: 26, ry: 15 }, { ox: -19, oy: -6, rx: 14, ry: 10 }, { ox: 18, oy: -7, rx: 14, ry: 10 }, { ox: 3, oy: -28, rx: 11, ry: 7 }],
    branches: 2,
  },
};

/* Bare-branch fan (the "due: bare" overlay): a purpose-built winter
   silhouette, never a thinned-out copy of the lush canopy — a graceful
   dormant tree, not a damaged one (Bible §6.4: "never appear dead").
   Only trees that have a canopy to lose have a bare form. */
const BARE_BRANCHES = {
  young: 4,
  in_leaf: 6,
  mature: 7,
  ancient: 8,
};

function branchFan(cx, trunkTop, count, tiltDeg = 0) {
  const spread = 96; // degrees either side of straight up — a real winter crown
  const paths = [];
  const buds = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const deg = -90 - spread / 2 + spread * t + tiltDeg;
    const rad = (deg * Math.PI) / 180;
    const len = 19 + (i % 3) * 7;
    // Branches leave the trunk at slightly staggered heights, so the fan
    // reads as grown structure, not spokes from a single point.
    const fy = trunkTop + (i % 3) * 3.5;
    const midX = cx + Math.cos(rad) * len * 0.55;
    const midY = fy - 4 - Math.abs(Math.sin(rad)) * len * 0.55;
    const endX = cx + Math.cos(rad) * len;
    const endY = fy - 6 - Math.abs(Math.sin(rad)) * len;
    paths.push(`M${cx.toFixed(1)},${fy.toFixed(1)} Q${midX.toFixed(1)},${midY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`);
    buds.push({ cx: endX, cy: endY, r: 2.6 });
  }
  return { paths, buds };
}

/** Fixed points along a mass's edge (for blossoms, turned leaves, and the
 *  vigor fill) — seeded angles, stable forever. */
function edgePoints(cx, cy, rx, ry, count, rnd, upperOnly = true) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const span = upperOnly ? Math.PI : Math.PI * 2;
    const a = (upperOnly ? Math.PI : 0) + (span * (i + 0.5)) / count + (rnd() - 0.5) * 0.5;
    out.push([cx + Math.cos(a) * rx * 0.88, cy + Math.sin(a) * ry * 0.88]);
  }
  return out;
}

class CatPlant extends HTMLElement {
  static get observedAttributes() { return ['stage', 'due', 'size', 'vigor', 'seed', 'nest', 'landmark', 'name']; }
  attributeChangedCallback() { this.#render(); }
  connectedCallback() { this.#render(); }

  #render() {
    const attr = this.getAttribute('stage');
    const stage = (attr === 'open_ground' || attr === 'seed' || attr === 'sprout' || attr in STAGE_ART) ? attr : 'open_ground';
    const due = this.getAttribute('due') ?? 'none';
    const size = this.getAttribute('size') ?? 'foreground';
    const hasNest = this.hasAttribute('nest');
    const isLandmark = this.hasAttribute('landmark');
    const name = this.getAttribute('name');
    const seed = this.getAttribute('seed');
    const vigor = Math.max(0, Math.min(1, Number.parseFloat(this.getAttribute('vigor') ?? '0') || 0));

    if (size === 'horizon') {
      this.innerHTML = this.#horizonSVG(isLandmark, seed);
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

    if (stage === 'seed') {
      this.innerHTML = this.#wrap(`${soil}<circle cx="60" cy="119" r="3" class="pl-seed"/>`, stage);
      return;
    }

    // The plant's fixed character (Guide 6.3): a lean, a canopy bias, and a
    // wobble phase, all from the seed — identity, never randomness.
    const rnd = seedRng(seed);
    const lean = (rnd() * 2 - 1) * 5;          // the trunk's tilt
    const bias = (rnd() * 2 - 1) * 3.5;        // the canopy's heavier side

    if (stage === 'sprout') {
      // A curved green stem and its first leaves — the "small green thing"
      // of the onboarding (§3.1). Already an individual: it leans.
      const sx = 60 + lean * 0.8;
      const stem = `<path d="M60,121 Q${(60 + lean * 0.5).toFixed(1)},109 ${sx.toFixed(1)},97" class="pl-stem"/>`;
      const leaves = `
        <path d="${blobPath(sx - 5.5, 98, 5.5, 3.6, rnd, 0.16, 6)}" class="pl-canopy"/>
        <path d="${blobPath(sx + 5, 95.5, 5, 3.4, rnd, 0.16, 6)}" class="pl-canopy"/>
        <path d="${blobPath(sx + lean * 0.2, 91, 3.6, 2.8, rnd, 0.16, 6)}" class="pl-canopy"/>`;
      this.innerHTML = this.#wrap(`${soil}${stem}${leaves}`, stage);
      return;
    }

    const art = STAGE_ART[stage];

    // Continuous within-stage refinement (§6.3), all bounded so a stage never
    // reads as the next one up: the crown lifts a little, the trunk thickens,
    // the foliage fills. The bare (dormant) silhouette keeps its own honest
    // form; refinement rides the living canopy only.
    const lift = due === 'bare' ? 0 : Math.round(vigor * 4);
    const topY = art.topY - lift;
    const baseW = art.baseW + vigor * 1.6;
    const tx = 60 + lean;   // trunk top x

    const trunk = `<path d="${trunkPath(lean, topY, baseW, art.topW)}" class="pl-trunk"/>`;

    // Bark detail (§6.3): once a tree is genuinely well-held, a couple of
    // short darker strokes deepen the trunk. Cheap, fixed, appears only high
    // on the vigor curve so young trees stay smooth.
    const bark = vigor > 0.55
      ? `<path d="M${(60 + lean * 0.2).toFixed(1)},113 l0,6" class="pl-bark"/>
         <path d="M${(58.2 + lean * 0.25).toFixed(1)},103 l0,5" class="pl-bark"/>`
      : '';

    let canopy = '';
    let branches = '';
    if (due === 'bare' && BARE_BRANCHES[stage]) {
      const { paths, buds } = branchFan(tx, topY, BARE_BRANCHES[stage], lean * 1.2);
      canopy = `
        ${paths.map((d) => `<path d="${d}" class="pl-branch"/>`).join('')}
        ${buds.map((b) => `<circle cx="${b.cx.toFixed(1)}" cy="${b.cy.toFixed(1)}" r="${b.r}" class="pl-bud"/>`).join('')}`;
    } else {
      const masses = art.masses.map((m) => ({
        cx: tx + m.ox + (m.ox === 0 ? bias * 0.4 : bias),
        cy: topY + m.oy - (m.ox === 0 ? 0 : lift * 0.4),
        rx: m.rx, ry: m.ry,
      }));
      const main = masses[0];

      // Primary branches (Guide 6.1): visible structure reaching from the
      // trunk into the side masses — the "felt sense of trunk, branch,
      // weight, growth direction" that keeps a canopy from being a blob.
      if (art.branches >= 1 && masses[1]) {
        branches += `<path d="${branchPath(tx, topY + 6, masses[1].cx + 3, masses[1].cy + masses[1].ry * 0.5)}" class="pl-limb"/>`;
      }
      if (art.branches >= 2 && masses[2]) {
        branches += `<path d="${branchPath(tx, topY + 8, masses[2].cx - 3, masses[2].cy + masses[2].ry * 0.55)}" class="pl-limb"/>`;
      }

      // The canopy: solid overlapping masses that read as one organic crown.
      const crowns = masses.map((m) => `<path d="${blobPath(m.cx, m.cy, m.rx, m.ry, rnd)}" class="pl-canopy"/>`).join('');

      // One light, one shadow (Guide 11.4): warm lit face upper-left, cool
      // shaded face lower-right — painted translucency, never a gradient.
      const shade = `<path d="${blobPath(main.cx + main.rx * 0.34, main.cy + main.ry * 0.38, main.rx * 0.58, main.ry * 0.52, rnd)}" class="pl-shade"/>`;
      const light = `<path d="${blobPath(main.cx - main.rx * 0.36, main.cy - main.ry * 0.4, main.rx * 0.52, main.ry * 0.46, rnd)}" class="pl-lit"/>`;

      // Foliage richness (§6.3): a few small fixed leaf-tufts along the lower
      // canopy whose presence rises with vigor, so the crown visibly fills
      // between stages without ever changing silhouette.
      const richness = vigor > 0.08
        ? edgePoints(main.cx, main.cy + main.ry * 0.5, main.rx * 0.9, main.ry * 0.7, 3 + Math.round(vigor * 3), rnd, false)
          .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" class="pl-canopy pl-fill" style="opacity:${(0.25 + vigor * 0.5).toFixed(2)}"/>`).join('')
        : '';

      canopy = branches + crowns + shade + light + richness;

      // Lit for review (due: gold, §6.4 / Guide 12.1): the canopy CATCHES
      // LIGHT — a warm amber veil on the lit side and a few turned leaves at
      // the edge. Luminance + shape + slow shimmer: readable three ways (§12.7).
      if (due === 'gold') {
        const veil = `<path d="${blobPath(main.cx - main.rx * 0.2, main.cy - main.ry * 0.2, main.rx * 0.66, main.ry * 0.6, rnd)}" class="pl-gold-veil"/>`;
        const turned = edgePoints(main.cx, main.cy, main.rx, main.ry, 4, rnd)
          .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.7" class="pl-turned"/>`).join('');
        canopy += veil + turned;
      }

      // Mature's quiet blossoms (§6.2), sparse and pale, on fixed seeded
      // points of the upper canopy — only when in leaf (a bare Mature is
      // dormant and shows buds, not blossom).
      if (art.blooms) {
        canopy += edgePoints(main.cx, main.cy - 2, main.rx * 0.8, main.ry * 0.8, art.blooms, rnd)
          .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.9" class="pl-bloom"/>`).join('');
      }

      if (hasNest) {
        const nx = main.cx + main.rx * 0.45;
        const ny = main.cy + main.ry * 0.62;
        canopy += `
          <ellipse cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" rx="6.5" ry="3.6" class="pl-nest"/>
          <path d="M${(nx - 6).toFixed(1)},${(ny - 1).toFixed(1)} q6,-2.4 12,0" class="pl-nest-rim"/>`;
      }
    }

    // A Landmark's name plate — the family, once, at its base. The single
    // sanctioned exception to a wordless world (§6.5, Principle 106): "a
    // plant's name on approach." Foreground only; the distant horizon stays
    // wordless. The viewBox grows a touch to hold it (see #wrap).
    const plate = (isLandmark && name)
      ? `<text x="60" y="137" class="pl-nameplate">${escapeText(name)}.</text>`
      : '';

    this.innerHTML = this.#wrap(`${soil}${trunk}${bark}${canopy}${plate}`, stage, !!plate);
  }

  /** One <style> + <svg> shell shared by every foreground state, so the
   *  leaf-colour maturity ramp and the lit shimmer live in one place. The
   *  viewBox grows by ten units only when a Landmark name plate is present,
   *  so the ordinary plant's scale is untouched. */
  #wrap(inner, stage = 'open_ground', withPlate = false) {
    const vb = withPlate ? '0 0 120 142' : '0 0 120 130';
    return `
      <style>
        cat-plant { display: block; }
        cat-plant svg { width: 100%; height: 100%; display: block; overflow: visible; }
        .pl-soil { fill: var(--garden-soil); }
        .pl-grass { stroke: var(--garden-young); fill: none; stroke-width: 1.6; stroke-linecap: round; opacity: 0.7; }
        .pl-trunk { fill: var(--garden-trunk); }
        .pl-limb { stroke: var(--garden-trunk); fill: none; stroke-width: 2.2; stroke-linecap: round; }
        .pl-bark { stroke: #4E3E2C; fill: none; stroke-width: 1.1; stroke-linecap: round; opacity: 0.35; }
        .pl-stem { stroke: var(--garden-young); fill: none; stroke-width: 2.2; stroke-linecap: round; }
        .pl-seed { fill: var(--garden-trunk); }
        .pl-branch { stroke: var(--garden-bare-branch); fill: none; stroke-width: 2; stroke-linecap: round; }
        .pl-bud { fill: var(--garden-bud); }
        .pl-bloom { fill: var(--garden-bloom); }
        .pl-nest { fill: var(--garden-trunk); opacity: 0.62; }
        .pl-nest-rim { stroke: #4E3E2C; fill: none; stroke-width: 1; opacity: 0.4; }
        .pl-nameplate {
          fill: var(--color-ink-2, #6b6257); opacity: 0.72;
          font: 500 9px/1 var(--font-serif, Georgia, serif);
          text-anchor: middle; letter-spacing: 0.02em;
        }
        .pl-canopy {
          fill: var(--pl-leaf-color, var(--garden-young));
          transition: fill var(--duration-slower, 560ms) var(--ease-out, ease);
        }
        .pl-fill { transition: opacity var(--duration-slower, 560ms) var(--ease-out, ease); }
        /* One light direction (Guide 11.4): warm light, cool shadow —
           painted translucent faces, never black, never a gradient. */
        .pl-lit { fill: #FFF3D6; opacity: 0.16; }
        .pl-shade { fill: #16301F; opacity: 0.14; }
        /* Lit for review (§6.4): a slow amber shimmer — the most beautiful
           thing in the valley, inviting, never alarming. */
        .pl-turned { fill: var(--garden-review); }
        .pl-gold-veil {
          fill: #F2C285; opacity: 0.5;
          animation: pl-gold-breathe 5s ease-in-out infinite;
        }
        @keyframes pl-gold-breathe {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.26; }
        }
        @media (prefers-reduced-motion: reduce) { .pl-gold-veil { animation: none; } }
        /* The maturity ramp: green deepens with the plant's age (§12.2). */
        cat-plant[stage="sprout"]  .pl-canopy { --pl-leaf-color: var(--garden-sprout); }
        cat-plant[stage="young"]   .pl-canopy { --pl-leaf-color: var(--garden-young); }
        cat-plant[stage="in_leaf"] .pl-canopy { --pl-leaf-color: var(--garden-inleaf); }
        cat-plant[stage="mature"]  .pl-canopy { --pl-leaf-color: var(--garden-mature); }
        cat-plant[stage="ancient"] .pl-canopy { --pl-leaf-color: var(--garden-ancient); }
      </style>
      <svg viewBox="${vb}" role="img" aria-hidden="true">${inner}</svg>
    `;
  }

  /** The old-growth horizon: a flattened, detail-free silhouette
   *  (Bible §11.7: Ancient trees "collapsed into a static horizon layer").
   *  Deliberately the cheapest possible render — this is what keeps a
   *  garden full of Ancient trees as fast as an empty one. Grounded at the
   *  base of its box so it stands ON the horizon, never floats: a real
   *  tree shape — broad crown over a trunk — read at distance. A Landmark
   *  stands a little taller and deeper, and carries its nest, so the world
   *  visibly singles it out (§6.5) — still one static group. */
  #horizonSVG(isLandmark = false, seed = null) {
    const rnd = seedRng(seed ?? 'old-growth');
    const lean = (rnd() * 2 - 1) * 4;
    const up = isLandmark ? 10 : 0;
    const cx = 60 + lean;
    const crownY = 68 - up;
    const nest = isLandmark
      ? `<ellipse cx="${(cx + 10).toFixed(1)}" cy="${(crownY + 12).toFixed(1)}" rx="5" ry="2.8" class="pl-sil-nest"/>`
      : '';
    return `
      <style>
        cat-plant { display: block; }
        cat-plant svg { width: 100%; height: 100%; display: block; }
        .pl-sil { fill: var(--garden-ancient); }
        .pl-sil-g { opacity: ${isLandmark ? '0.46' : '0.34'}; }
        .pl-sil-nest { fill: var(--garden-trunk); opacity: 0.55; }
      </style>
      <svg viewBox="0 0 120 130" preserveAspectRatio="xMidYMax meet" role="img" aria-hidden="true">
        <g class="pl-sil-g">
          <path class="pl-sil" d="M${(60 - 4.2).toFixed(1)},130 L${(cx - 1.9).toFixed(1)},${crownY + 12} L${(cx + 1.9).toFixed(1)},${crownY + 12} L${(60 + 4.2).toFixed(1)},130 Z"/>
          <path class="pl-sil" d="${blobPath(cx, crownY, 27 + up * 0.5, 18 + up * 0.4, rnd, 0.1)}"/>
          <path class="pl-sil" d="${blobPath(cx - 18, crownY + 9, 13, 10, rnd, 0.1)}"/>
          <path class="pl-sil" d="${blobPath(cx + 17, crownY + 8, 12, 9, rnd, 0.1)}"/>
          <path class="pl-sil" d="${blobPath(cx + 4, crownY - 13, 12, 7, rnd, 0.1)}"/>
        </g>
        ${nest}
      </svg>
    `;
  }
}

customElements.define('cat-plant', CatPlant);
