/**
 * prop-art.js — how the authored world's props are drawn (LANGUAGE GARDEN
 * — THE WORLD Part 7; Phase V, Stage W6). Markup only; WHICH props are
 * revealed comes from logic/props.js, and every position arrives already
 * decided in the prop record it is handed — nothing here places anything.
 *
 * The doctrine this file serves (Part 7.1): "Density is testimony, not
 * decoration... Nothing is scattered by chance; everything was always
 * going to be exactly there; the learner's effort is the light that
 * reveals it." So a prop appearing is never a reward event: it has been
 * standing in the authored world since before the learner arrived, and a
 * tier crossing simply lets it be seen. Nothing here animates on arrival,
 * announces itself, or can be tapped (Part 13's W6 acceptance).
 *
 * Guide 5.4's mass hierarchy is the size budget: props are the 10%. Every
 * shape below is small, quiet, and two-value at most (a lit face and a
 * shade face, Part 5.2) — detail is spent on the plants the learner
 * actually tends, never on the furniture.
 */

import { contactShadow } from '../logic/light.js';

/** A prop's contact shadow, the same one every standing object in the
 *  valley gets (Part 5.2) — so a fallen log and a Gate post are lit by
 *  the same sun, at the same hour, without either of them knowing it. */
function grounded(bx, by, width, time) {
  const s = contactShadow(bx, by, width, time);
  return `<ellipse cx="${s.cx.toFixed(1)}" cy="${s.cy.toFixed(1)}" rx="${s.rx.toFixed(1)}" ry="${s.ry.toFixed(1)}" fill="${s.fill}" opacity="${s.opacity}"/>`;
}

/* ------------------------------------------------------------------ */
/* The tier props (Appendix C.5)                                        */
/* ------------------------------------------------------------------ */

const DRAW = {
  /** Stepping stones where the path meets the stream (Tended). Three,
   *  irregular, set at the crossing — one of them wobbles, which the
   *  story mark below adds without ever saying so. */
  'stepping-stones'({ x, y }, atmo) {
    const STONES = [[-9, 3, 5.2], [0, 0, 5.8], [9, -3, 4.8]];
    return `<g class="vl-prop vl-prop--stepping-stones">
      ${STONES.map(([dx, dy, r]) => grounded(x + dx, y + dy + r * 0.5, r * 2, atmo.time)).join('')}
      ${STONES.map(([dx, dy, r]) => `
        <ellipse class="vl-stone-shade" cx="${(x + dx).toFixed(1)}" cy="${(y + dy + r * 0.16).toFixed(1)}" rx="${r}" ry="${(r * 0.56).toFixed(1)}"/>
        <ellipse class="vl-stone-lit" cx="${(x + dx - r * 0.16).toFixed(1)}" cy="${(y + dy - r * 0.14).toFixed(1)}" rx="${(r * 0.72).toFixed(1)}" ry="${(r * 0.4).toFixed(1)}"/>`).join('')}
    </g>`;
  },

  /** A fallen log at the Rootwood's edge, moss on its north side (Tended).
   *  The moss is the detail Part 7.3 names, and it faces away from the
   *  sun exactly as real moss does — the valley's quietest bit of physics. */
  'fallen-log'({ x, y }, atmo) {
    return `<g class="vl-prop vl-prop--fallen-log">
      ${grounded(x, y + 2.4, 26, atmo.time)}
      <rect class="vl-log-body" x="${(x - 13).toFixed(1)}" y="${(y - 2.6).toFixed(1)}" width="26" height="5.2" rx="2.6"/>
      <ellipse class="vl-log-end" cx="${(x + 13).toFixed(1)}" cy="${y.toFixed(1)}" rx="1.8" ry="2.6"/>
      <path class="vl-log-moss" d="M${(x - 11).toFixed(1)},${(y - 2.4).toFixed(1)} q6,-1.6 12,0 q5,1.2 9,-0.4 l0,1.6 q-5,1.6 -10,0.4 q-6,-1.4 -11,0.2 Z"/>
    </g>`;
  },

  /** Cattails joining the reeds at the pond's south lip (Tended). */
  cattails({ x, y }) {
    return `<g class="vl-prop vl-prop--cattails">
      ${[-4, 0, 4].map((dx, i) => `
        <path class="vl-cattail-stem" d="M${(x + dx).toFixed(1)},${y} Q${(x + dx + (i % 2 ? 1.2 : -1.2)).toFixed(1)},${(y - 9).toFixed(1)} ${(x + dx).toFixed(1)},${(y - 17).toFixed(1)}"/>
        <ellipse class="vl-cattail-head" cx="${(x + dx).toFixed(1)}" cy="${(y - 18.4).toFixed(1)}" rx="1.1" ry="3"/>`).join('')}
    </g>`;
  },

  /** The first drift of meadow wildflowers (Tended) — a combed drift, in
   *  the Meadow's own language (Appendix C.7), not a scatter of dots. */
  'meadow-drift'({ x, y }) {
    return `<g class="vl-prop vl-prop--meadow-drift">
      <ellipse class="vl-meadow-drift" cx="${x}" cy="${y}" rx="17" ry="6"/>
      ${[-11, -4, 3, 10].map((dx, i) =>
        `<circle class="vl-mark--wildflower" cx="${(x + dx).toFixed(1)}" cy="${(y - 2 + (i % 2) * 3).toFixed(1)}" r="1.5"/>`).join('')}
    </g>`;
  },

  /** The second lantern, at the Gate (Growing) — Appendix C.5 pins it
   *  apart from the founding bench lantern, and it warms on exactly the
   *  same unconditional schedule (Part 4.2: dusk and night, always). */
  'gate-lantern'({ x, y }, atmo) {
    const warm = atmo.time === 'dusk' || atmo.time === 'night';
    return `<g class="vl-prop vl-prop--gate-lantern">
      <path class="vl-lantern-post" d="M${x},${y} L${x},${(y - 13).toFixed(1)}"/>
      ${warm ? `<circle class="vl-lantern-glow" cx="${x}" cy="${(y - 14).toFixed(1)}" r="${(0.07 * 360).toFixed(1)}"/>
        <circle class="vl-lantern" cx="${x}" cy="${(y - 14).toFixed(1)}" r="2"/>`
        : `<circle class="vl-lantern-cold" cx="${x}" cy="${(y - 14).toFixed(1)}" r="1.8"/>`}
    </g>`;
  },

  /** A woven hazel fence panel along the Orchard's near row (Growing) —
   *  Appendix C.5 gives it a span, so it is drawn as a run between two
   *  points rather than as an object at one. */
  'hazel-panel'({ x, y, to }, atmo) {
    const dx = to.x - x, dy = to.y - y;
    const n = 7;
    const uprights = Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const ux = x + dx * t, uy = y + dy * t;
      return `<path class="vl-hazel-upright" d="M${ux.toFixed(1)},${uy.toFixed(1)} L${ux.toFixed(1)},${(uy - 8).toFixed(1)}"/>`;
    }).join('');
    return `<g class="vl-prop vl-prop--hazel-panel">
      ${grounded(x + dx / 2, y + dy / 2, Math.abs(dx), atmo.time)}
      ${uprights}
      <path class="vl-hazel-weave" d="M${x},${(y - 5.5).toFixed(1)} Q${(x + dx * 0.25).toFixed(1)},${(y + dy * 0.25 - 7.5).toFixed(1)} ${(x + dx * 0.5).toFixed(1)},${(y + dy * 0.5 - 5.5).toFixed(1)} Q${(x + dx * 0.75).toFixed(1)},${(y + dy * 0.75 - 3.5).toFixed(1)} ${to.x},${(to.y - 5.5).toFixed(1)}"/>
      <path class="vl-hazel-weave" d="M${x},${(y - 2.5).toFixed(1)} Q${(x + dx * 0.25).toFixed(1)},${(y + dy * 0.25 - 0.5).toFixed(1)} ${(x + dx * 0.5).toFixed(1)},${(y + dy * 0.5 - 2.5).toFixed(1)} Q${(x + dx * 0.75).toFixed(1)},${(y + dy * 0.75 - 4.5).toFixed(1)} ${to.x},${(to.y - 2.5).toFixed(1)}"/>
    </g>`;
  },

  /** Mushrooms under the Rootwood eaves, rain hours only (Growing) — a
   *  true-state condition, not a timer: they are here because it is
   *  raining, and the rain came from the calendar (§4.6). */
  mushrooms({ x, y }) {
    return `<g class="vl-prop vl-prop--mushrooms">
      ${[[-5, 1, 2.6], [0, -1, 3.2], [4.5, 1.5, 2.2]].map(([dx, dy, r]) => `
        <path class="vl-mushroom-stem" d="M${(x + dx).toFixed(1)},${(y + dy).toFixed(1)} l0,-2.6"/>
        <path class="vl-mushroom-cap" d="M${(x + dx - r).toFixed(1)},${(y + dy - 2.4).toFixed(1)} a${r},${(r * 0.72).toFixed(1)} 0 0 1 ${(r * 2).toFixed(1)},0 Z"/>`).join('')}
    </g>`;
  },

  /** A bird-perch snag at the Wilds fence (Growing): a bare standing
   *  branch. It is where the crossing bird would land — and the world
   *  never says so, and the bird rarely obliges. */
  'perch-snag'({ x, y }, atmo) {
    return `<g class="vl-prop vl-prop--perch-snag">
      ${grounded(x, y, 5, atmo.time)}
      <path class="vl-snag" d="M${x},${y} Q${(x + 1).toFixed(1)},${(y - 8).toFixed(1)} ${(x - 0.5).toFixed(1)},${(y - 16).toFixed(1)}"/>
      <path class="vl-snag vl-snag--limb" d="M${(x - 0.2).toFixed(1)},${(y - 11).toFixed(1)} q4,-1.6 6,-4.4"/>
    </g>`;
  },

  /** A stone that has clearly become a sitting-stone, on the path's first
   *  bend (Flourishing). Nobody put it there to be sat on; it simply is,
   *  and its top is polished flatter than its sides. */
  'sitting-stone'({ x, y }, atmo) {
    return `<g class="vl-prop vl-prop--sitting-stone">
      ${grounded(x, y + 3, 15, atmo.time)}
      <ellipse class="vl-stone-shade" cx="${x}" cy="${y}" rx="7.5" ry="4.4"/>
      <ellipse class="vl-stone-lit" cx="${(x - 1).toFixed(1)}" cy="${(y - 1.6).toFixed(1)}" rx="6.2" ry="2.8"/>
      <ellipse class="vl-stone-polish" cx="${(x - 0.6).toFixed(1)}" cy="${(y - 2.2).toFixed(1)}" rx="4.4" ry="1.6"/>
    </g>`;
  },

  /** Berry canes showing at the Thicket's rim (Flourishing) — arcing
   *  canes, the valley's only thorn-sharp language (Part 8.3). */
  'berry-canes'({ x, y }) {
    return `<g class="vl-prop vl-prop--berry-canes">
      <path class="vl-cane" d="M${x},${y} Q${(x - 7).toFixed(1)},${(y - 11).toFixed(1)} ${(x - 2).toFixed(1)},${(y - 19).toFixed(1)}"/>
      <path class="vl-cane" d="M${(x + 4).toFixed(1)},${y} Q${(x + 11).toFixed(1)},${(y - 9).toFixed(1)} ${(x + 7).toFixed(1)},${(y - 17).toFixed(1)}"/>
      ${[[-3, -17], [6, -15], [-1, -11]].map(([dx, dy]) =>
        `<circle class="vl-berry-fleck vl-berry-fleck--deep" cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="1.6"/>`).join('')}
    </g>`;
  },

  /** Lily pads on the pond (Flourishing) — Appendix C.5 pins two
   *  positions, and Part 7.3 says "two, then four": the pair arrives at
   *  Flourishing, and Lush doubles it around the same two centres. */
  'lily-pads'({ x, y, to }, atmo) {
    const pad = (px, py, r) =>
      `<ellipse class="vl-lily-pad" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${r}" ry="${(r * 0.62).toFixed(1)}"/>
       <path class="vl-lily-notch" d="M${px.toFixed(1)},${py.toFixed(1)} l${(r * 0.8).toFixed(1)},${(-r * 0.4).toFixed(1)}"/>`;
    const lush = atmo.tier === 'lush';
    return `<g class="vl-prop vl-prop--lily-pads">
      ${pad(x, y, 4.2)}${pad(to.x, to.y, 3.6)}
      ${lush ? `${pad(x + 7, y + 4, 3.2)}${pad(to.x - 6, to.y + 3.4, 3)}` : ''}
    </g>`;
  },

  /** A hollow log a mouse uses (Lush). The mouse is never drawn — it is
   *  not in Part 9.3's roster, and the hollow is the whole story. */
  'hollow-log'({ x, y }, atmo) {
    return `<g class="vl-prop vl-prop--hollow-log">
      ${grounded(x, y + 2.2, 22, atmo.time)}
      <rect class="vl-log-body" x="${(x - 11).toFixed(1)}" y="${(y - 2.4).toFixed(1)}" width="22" height="4.8" rx="2.4"/>
      <ellipse class="vl-log-hollow" cx="${(x - 11).toFixed(1)}" cy="${y.toFixed(1)}" rx="1.6" ry="2.2"/>
    </g>`;
  },

  /** The spring where the stream begins, visible as a bright seam at the
   *  Rootwood's edge (Lush) — the source of the consistency signal itself,
   *  finally shown. It brightens the water already drawn there; it never
   *  adds a second stream. */
  'spring-seam'({ x, y }) {
    return `<g class="vl-prop vl-prop--spring-seam">
      <path class="vl-spring-seam" d="M${(x - 5).toFixed(1)},${(y - 3).toFixed(1)} Q${x},${(y + 1).toFixed(1)} ${(x + 4).toFixed(1)},${(y + 6).toFixed(1)}"/>
      <ellipse class="vl-spring-mouth" cx="${(x - 5).toFixed(1)}" cy="${(y - 3.4).toFixed(1)}" rx="3.4" ry="1.6"/>
    </g>`;
  },

  /** Dew-web in the Thicket at dawn, in autumn (Lush) — a seasonal
   *  pleasure inside a tier reveal: it is here because the learner has
   *  tended for a long time AND because it is an autumn dawn. */
  'dew-web'({ x, y }) {
    const R = 7;
    const spokes = [200, 240, 285, 330].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return `<path class="vl-web-line" d="M${x},${y} L${(x + Math.cos(a) * R).toFixed(1)},${(y + Math.sin(a) * R).toFixed(1)}"/>`;
    }).join('');
    return `<g class="vl-prop vl-prop--dew-web">
      ${spokes}
      <path class="vl-web-line" d="M${(x - 6.6).toFixed(1)},${(y - 2.4).toFixed(1)} Q${x},${(y - 5.6).toFixed(1)} ${(x + 6).toFixed(1)},${(y - 3.4).toFixed(1)}"/>
      <path class="vl-web-line" d="M${(x - 4.2).toFixed(1)},${(y - 1.4).toFixed(1)} Q${x},${(y - 3.4).toFixed(1)} ${(x + 3.8).toFixed(1)},${(y - 2).toFixed(1)}"/>
    </g>`;
  },
};

/** Every revealed Overlook prop, drawn in authored order. */
export function propsSVG(props, atmo) {
  return props.map((p) => (DRAW[p.id] ? DRAW[p.id](p, atmo) : '')).join('');
}

/* ------------------------------------------------------------------ */
/* The seasonal set (Part 7.3) — recurring, never scarce                */
/* ------------------------------------------------------------------ */

const SEASONAL = {
  /** Blossom drift on the Orchard (spring): pale flecks over the five
   *  canopies Appendix C.7 already pins — dressing the geometry that is
   *  there, never adding trees. */
  'blossom-drift'() {
    const CANOPIES = [[226.8, 352.8], [255.6, 369.6], [284.4, 347.2], [306, 380.8], [324, 358.4]];
    return `<g class="vl-seasonal vl-seasonal--blossom" aria-hidden="true">
      ${CANOPIES.map(([cx, cy], i) => `
        <circle class="vl-blossom" cx="${(cx - 4 + (i % 2) * 3).toFixed(1)}" cy="${(cy - 5).toFixed(1)}" r="1.7"/>
        <circle class="vl-blossom" cx="${(cx + 5).toFixed(1)}" cy="${(cy - 1 + (i % 3)).toFixed(1)}" r="1.4"/>
        <circle class="vl-blossom" cx="${(cx - 1).toFixed(1)}" cy="${(cy + 4).toFixed(1)}" r="1.2"/>`).join('')}
    </g>`;
  },

  /** A heat-haze seam on a summer afternoon: one shimmering band at the
   *  ridges' feet (Appendix C.1's own crest line), where real heat haze
   *  actually sits. It is light, not an object — no mass, no edge. */
  'heat-haze'() {
    return `<g class="vl-seasonal vl-seasonal--haze" aria-hidden="true">
      <rect class="vl-haze-seam" x="0" y="128" width="360" height="9"/>
    </g>`;
  },

  /** Autumn's mushroom rings, at the same authored mushroom zone the
   *  Growing tier's cluster occupies (Appendix C.5, (35, 45)) — the
   *  season's recurrence of a thing the world already has a place for,
   *  never a new coordinate. */
  'mushroom-ring'() {
    const cx = 126, cy = 252, R = 9;
    return `<g class="vl-seasonal vl-seasonal--ring" aria-hidden="true">
      ${[0, 60, 120, 180, 240, 300].map((deg) => {
        const a = (deg * Math.PI) / 180;
        const mx = cx + Math.cos(a) * R, my = cy + Math.sin(a) * R * 0.5;
        return `<path class="vl-mushroom-cap" d="M${(mx - 2).toFixed(1)},${my.toFixed(1)} a2,1.4 0 0 1 4,0 Z"/>`;
      }).join('')}
    </g>`;
  },

  /** A line of geese across the autumn sky: one skein, high, crossing
   *  slowly — the only thing in the valley that is unmistakably leaving. */
  'geese-line'() {
    const BIRDS = [[0, 0], [7, 3], [14, 6], [-7, 3], [-14, 6], [21, 9]];
    return `<g class="vl-seasonal vl-seasonal--geese" aria-hidden="true">
      <g class="vl-geese-skein">
        ${BIRDS.map(([dx, dy]) =>
          `<path class="vl-goose" d="M${(140 + dx - 2.4).toFixed(1)},${(52 + dy).toFixed(1)} q2.4,-1.6 2.4,0 q0,-1.6 2.4,0"/>`).join('')}
      </g>
    </g>`;
  },

  /** Snow caps on the wall, the bridge, and the fence posts (winter) —
   *  laid on the exact objects Appendix C.2–C.4 pin, so the snow sits
   *  where the world's own edges are. */
  'snow-caps'() {
    const POSTS = [118.8, 147.6, 180, 212.4, 241.2];
    const POST_Y = [173.6, 170.8, 168, 170.8, 173.6];
    return `<g class="vl-seasonal vl-seasonal--snow" aria-hidden="true">
      <path class="vl-snow-cap" d="M0,436.8 L75.6,443.9 L75.6,446.4 L0,439.3 Z"/>
      <path class="vl-snow-cap" d="M86.4,444.9 L360,470.4 L360,472.9 L86.4,447.4 Z"/>
      <path class="vl-snow-cap" d="M99,393.6 Q111.6,386 124.2,393.6 L124.2,395.6 Q111.6,388 99,395.6 Z"/>
      ${POSTS.map((x, i) => `<ellipse class="vl-snow-cap" cx="${x}" cy="${(POST_Y[i] - 9).toFixed(1)}" rx="2.2" ry="1"/>`).join('')}
    </g>`;
  },

  /** Animal tracks in the snow (winter): a broken line of small marks
   *  along the path Appendix C.2 already pins — something crossed here
   *  before the learner looked, which is the whole point of Part 7.4's
   *  storytelling applied to a season. */
  'animal-tracks'() {
    const PTS = [[97, 420], [99, 411], [103, 402], [106, 393], [110, 384], [114, 375]];
    return `<g class="vl-seasonal vl-seasonal--tracks" aria-hidden="true">
      ${PTS.map(([x, y], i) =>
        `<ellipse class="vl-track" cx="${(x + (i % 2 ? 2.2 : -2.2)).toFixed(1)}" cy="${y}" rx="1.5" ry="1"/>`).join('')}
    </g>`;
  },
};

export function seasonalPropsSVG(seasonal) {
  return seasonal.map((p) => (SEASONAL[p.id] ? SEASONAL[p.id]() : '')).join('');
}

/* ------------------------------------------------------------------ */
/* The environmental stories (Part 7.4)                                 */
/* ------------------------------------------------------------------ */

/**
 * Twelve authored micro-stories, "placed once, never explained, never
 * pointed at" (P143). Each one below is a MARK ON A PINNED OBJECT — the
 * wall, a Gate post, the kettle-stone, the bridge, the path's first bend,
 * a fence post, a stepping stone — so it takes its geometry from the
 * Appendix C coordinate of its host, which overlook.js already draws.
 *
 * They are why the world reads as inhabited by time. Each happened BEFORE
 * the learner arrived; each is small; none is referenced anywhere, ever.
 * A learner who never notices one has lost nothing, which is the test.
 */
const STORY = {
  /** The mended gap in the wall — mended differently from how it was
   *  built: the wall runs in long courses, and this patch is a huddle of
   *  small stones set by someone in a hurry, a long time ago. */
  'mended-wall-gap'() {
    return `<g class="vl-story vl-story--mend" aria-hidden="true">
      ${[[196, 460], [203, 461], [210, 462], [199, 466], [206, 467]].map(([x, y]) =>
        `<ellipse class="vl-mend-stone" cx="${x}" cy="${y}" rx="3.4" ry="2.4"/>`).join('')}
    </g>`;
  },

  /** The gate post worn smooth at hand height — one pale patch where a
   *  hand has rested every single time, for years. */
  'worn-gate-post'() {
    return `<ellipse class="vl-story vl-story--worn-post" cx="86.4" cy="434" rx="1.9" ry="3.4" aria-hidden="true"/>`;
  },

  /** The kettle-stone's soot ring: it has been used, often, by someone.
   *  (It is the learner. It was always the learner.) */
  'kettle-soot-ring'() {
    return `<ellipse class="vl-story vl-story--soot" cx="198" cy="497.2" rx="3.4" ry="2.2" fill="none" aria-hidden="true"/>`;
  },

  /** The leaning fence post the wren prefers: the run's fourth post leans
   *  furthest, and its top is rubbed smoother than the rest. The wren is
   *  never drawn perching on it — that would explain the joke. */
  'wrens-fence-post'() {
    return `<ellipse class="vl-story vl-story--perch-wear" cx="213.6" cy="161.4" rx="1.6" ry="0.8" aria-hidden="true"/>`;
  },

  /** The bridge keystone is a different stone than the rest — a paler,
   *  cooler one, because whoever finished the bridge ran out of the first. */
  'bridge-keystone'() {
    return `<path class="vl-story vl-story--keystone" d="M109.4,390.4 L113.8,390.4 L114.4,396.6 L108.8,396.6 Z" aria-hidden="true"/>`;
  },

  /** The path's first bend is polished wider than the path: everyone cuts
   *  the corner, and has always cut it. */
  'polished-bend'() {
    return `<ellipse class="vl-story vl-story--bend" cx="112.4" cy="391.4" rx="7.4" ry="4.6"
      transform="rotate(-34 112.4 391.4)" aria-hidden="true"/>`;
  },

  /** The stepping stone that wobbles: exactly one glint sits offset from
   *  its stone's centre, as though the stone is not quite seated. One
   *  pixel of story, and no learner will ever be told. */
  'wobbling-stone'() {
    return `<ellipse class="vl-story vl-story--wobble" cx="94.6" cy="408.6" rx="2.6" ry="0.9" aria-hidden="true"/>`;
  },
};

export function storiesSVG(stories) {
  return stories.map((s) => (STORY[s.id] ? STORY[s.id]() : '')).join('');
}

/* ------------------------------------------------------------------ */
/* The in-scene props (Appendix C.5's *in-scene* marks, Appendix C.6)   */
/* ------------------------------------------------------------------ */

/**
 * The Rootwood cathedral's own tier props, in the scene's 0–100
 * percentage space (the coordinate system Stage W3 established for
 * `.grove-cathedral`, matching Appendix C.6 directly with no pixel
 * conversion). Two entries, both pinned:
 *
 *  - **Fern banks** (Flourishing) at "x 0–10 and 90–100, y 60–100" — the
 *    floor's edges filling in, the Effort Ledger's undergrowth (§8.3)
 *    reaching the walls of the wood.
 *  - **The old stump (86, 62) and its carved stone (88, 64)** (Lush) —
 *    Part 7.4's first environmental story, and the only one of the twelve
 *    that Appendix C gives a coordinate of its own. Someone carved it,
 *    beside the highest path, before any of this. It is never mentioned.
 */
export function inSceneRootwoodPropsSVG(props, stories) {
  const has = (id) => props.some((p) => p.id === id);
  let out = '';

  if (has('fern-banks')) {
    const frond = (x, y, s, flip) => `
      <path class="grove-fern" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"
        d="M0,0 Q-1.4,-4 -0.4,-8.5 Q0.6,-4.6 2,-3.2 Q0.9,-5.6 1.6,-8.8 Q2.6,-4.4 4,-2.6 Q3.2,-5.2 4.4,-7.6 L5,-1.2 Z"/>`;
    out += `<g class="grove-prop grove-prop--ferns">
      ${frond(3, 92, 1.15, false)}${frond(8, 86, 0.9, false)}${frond(1.5, 78, 1, false)}
      ${frond(97, 93, 1.2, true)}${frond(92.5, 85, 0.95, true)}${frond(98.5, 76, 1, true)}
    </g>`;
  }

  // The cathedral's SVG is `preserveAspectRatio="none"` over a 0–100 box
  // stretched onto a PORTRAIT frame, so one y-unit is roughly twice one
  // x-unit on screen. Any shape meant to read as round has to be authored
  // squashed to survive that stretch — the first pass used honest circular
  // radii and the stump came out as a tall oval with a squiggle beside it,
  // reading as an "@" rather than as a cut stump. Y_SQUASH is the
  // correction, applied only to the shapes whose roundness carries meaning.
  const Y_SQUASH = 0.42;
  const ry = (r) => +(r * Y_SQUASH).toFixed(2);

  // A cut stump, at the size Appendix C.6 leaves it: about 13px wide on a
  // phone. That is far too small for growth rings — drawn, they closed into
  // a dark donut and the whole prop read as a coiled snail. It reads as a
  // stump the way a stump actually reads at distance: a short dark side
  // band with one lighter cut face sitting on top of it, and nothing else.
  if (has('old-stump')) {
    out += `<g class="grove-prop grove-prop--stump">
      <path class="grove-stump-side" d="M82.6,61.9 L89.4,61.9 L89.4,63.6 Q86,64.5 82.6,63.6 Z"/>
      <ellipse class="grove-stump-top" cx="86" cy="61.9" rx="3.4" ry="${ry(2.4)}"/>
    </g>`;
  }

  if (stories.some((s) => s.id === 'carved-stone')) {
    out += `<g class="grove-story grove-story--carved">
      <ellipse class="grove-carved-stone" cx="89.4" cy="63.6" rx="2.4" ry="${ry(2.2)}"/>
      <path class="grove-carved-mark" d="M88.5,63.4 l1.8,-0.2 M88.7,64 l1.4,-0.2" fill="none"/>
    </g>`;
  }

  return out;
}
