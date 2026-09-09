/**
 * fauna-art.js — how the valley's creatures are drawn (LANGUAGE GARDEN —
 * THE WORLD Part 9.1; Phase V, Stage W6). Markup only; WHICH creature is
 * here comes from logic/fauna.js, and its size and pigments come from that
 * module's pinned roster (Part 9.3) — nothing below invents a value.
 *
 * Part 9.1's draw grammar, obeyed literally: "Creatures are drawn like the
 * world: one to three soft masses, no outlines, no faces, no eyes at any
 * distance. A butterfly is two petal-masses on a hinge; a bird is a
 * teardrop and a wing line; the fox is two warm masses and a tail sweep;
 * the heron is a vertical stroke, a curve, and stillness."
 *
 * What this file replaces is worth naming honestly: until this stage the
 * biome scene drew its visitors as TYPOGRAPHIC GLYPHS — a butterfly was
 * the character ❋, a bird was ◜, a firefly was a bullet point. A glyph has
 * an outline, a font's own hand, and no silhouette of its own; it is the
 * "diagram, not a painting" failure of THE WORLD Part 1, wearing feathers.
 * Every creature here is masses.
 *
 * Facelessness is enforced by construction: there is no code path below
 * that draws an eye, and none may ever be added (Part 9.1, P147 — faces
 * make characters, characters make companions, and there is no companion).
 *
 * Every creature is `aria-hidden` and `pointer-events: none`: nothing in
 * the world is tappable except the land itself (Part 13's W6 acceptance,
 * Bible §14.8). A creature that could be poked would be a toy.
 */

import { FAUNA } from '../logic/fauna.js';

/** A creature's pixel width in a frame of the given width (Part 9.3's
 *  sizes are shares of frame width, never absolute pixels). */
export function faunaWidth(kind, frameWidth) {
  const spec = FAUNA[kind];
  return spec ? spec.size * frameWidth : 0;
}

/* ------------------------------------------------------------------ */
/* The bodies. Each returns SVG paths in a local space whose origin is  */
/* the creature's own centre, sized to `w` (its pinned share of the     */
/* frame). One to three masses, no outlines, no faces — ever.           */
/* ------------------------------------------------------------------ */

const BODIES = {
  /** Two petal-masses on a hinge (Part 9.1), the wings held at a slight
   *  open angle so the silhouette reads as a butterfly at rest-in-flight
   *  rather than as a symmetrical bow-tie (Guide 5.2: symmetry reads fake). */
  butterfly(w, spec) {
    const r = w / 2;
    return `
      <ellipse class="fa-wing fa-wing--l" cx="${(-r * 0.42).toFixed(2)}" cy="${(-r * 0.12).toFixed(2)}" rx="${(r * 0.58).toFixed(2)}" ry="${(r * 0.82).toFixed(2)}" fill="${spec.fill}" transform="rotate(-18)"/>
      <ellipse class="fa-wing fa-wing--r" cx="${(r * 0.46).toFixed(2)}" cy="${(-r * 0.04).toFixed(2)}" rx="${(r * 0.52).toFixed(2)}" ry="${(r * 0.74).toFixed(2)}" fill="${spec.fill}" transform="rotate(16)"/>
      <ellipse cx="0" cy="0" rx="${(r * 0.13).toFixed(2)}" ry="${(r * 0.5).toFixed(2)}" fill="${spec.fill}" opacity="0.75"/>`;
  },

  /** Softer, rounder, paler than a butterfly, and its wings sit flatter —
   *  a moth reads by its posture, not by a pattern (Part 9.1). */
  moth(w, spec) {
    const r = w / 2;
    return `
      <ellipse cx="${(-r * 0.44).toFixed(2)}" cy="0" rx="${(r * 0.6).toFixed(2)}" ry="${(r * 0.46).toFixed(2)}" fill="${spec.fill}" transform="rotate(-8)"/>
      <ellipse cx="${(r * 0.44).toFixed(2)}" cy="0" rx="${(r * 0.6).toFixed(2)}" ry="${(r * 0.44).toFixed(2)}" fill="${spec.fill}" transform="rotate(8)"/>
      <ellipse cx="0" cy="0" rx="${(r * 0.16).toFixed(2)}" ry="${(r * 0.4).toFixed(2)}" fill="${spec.fill}"/>`;
  },

  /** A teardrop and a wing line (Part 9.1) — the whole bird. It crosses in
   *  one arc and is gone; there is never a second bird behind it. */
  bird(w, spec) {
    const r = w / 2;
    return `
      <path d="M${(-r).toFixed(2)},0 Q${(-r * 0.2).toFixed(2)},${(-r * 0.5).toFixed(2)} ${r.toFixed(2)},${(-r * 0.14).toFixed(2)}
               Q${(-r * 0.1).toFixed(2)},${(r * 0.3).toFixed(2)} ${(-r).toFixed(2)},0 Z" fill="${spec.fill}"/>
      <path d="M${(-r * 0.3).toFixed(2)},${(-r * 0.1).toFixed(2)} Q${(r * 0.1).toFixed(2)},${(-r * 0.62).toFixed(2)} ${(r * 0.62).toFixed(2)},${(-r * 0.44).toFixed(2)}"
            fill="none" stroke="${spec.fill}" stroke-width="${(r * 0.16).toFixed(2)}" stroke-linecap="round" opacity="0.8"/>`;
  },

  /** A dot and a glow (Part 9.3 gives the firefly two sizes for exactly
   *  this reason): the light is the creature. It breathes on its own
   *  unsynchronised cycle and never travels. */
  firefly(w, spec, frameWidth) {
    const dot = w / 2;
    const glow = (spec.glowSize * frameWidth) / 2;
    return `
      <circle class="fa-firefly-glow" cx="0" cy="0" r="${glow.toFixed(2)}" fill="${spec.fill}"/>
      <circle class="fa-firefly-dot" cx="0" cy="0" r="${dot.toFixed(2)}" fill="${spec.fill}"/>`;
  },

  /** A shell and a body, and nothing else — the snail's whole event is
   *  being present after rain (Part 9.2). */
  snail(w, spec) {
    const r = w / 2;
    return `
      <path d="M${(-r).toFixed(2)},${(r * 0.42).toFixed(2)} Q${(-r * 0.9).toFixed(2)},${(-r * 0.1).toFixed(2)} ${(-r * 0.2).toFixed(2)},${(-r * 0.05).toFixed(2)}
               L${(r * 0.7).toFixed(2)},${(r * 0.1).toFixed(2)} Q${r.toFixed(2)},${(r * 0.2).toFixed(2)} ${(r * 0.8).toFixed(2)},${(r * 0.42).toFixed(2)} Z" fill="${spec.fill}"/>
      <ellipse cx="${(-r * 0.05).toFixed(2)}" cy="${(-r * 0.12).toFixed(2)}" rx="${(r * 0.62).toFixed(2)}" ry="${(r * 0.52).toFixed(2)}" fill="${spec.shell}"/>`;
  },

  /** One crouched mass and a hind-leg curve (Part 9.1's "one to three soft
   *  masses"): a frog at the reeds, entirely still. */
  frog(w, spec) {
    const r = w / 2;
    return `
      <ellipse cx="0" cy="0" rx="${(r * 0.86).toFixed(2)}" ry="${(r * 0.56).toFixed(2)}" fill="${spec.fill}"/>
      <path d="M${(-r * 0.5).toFixed(2)},${(r * 0.3).toFixed(2)} Q${(-r * 0.9).toFixed(2)},${(r * 0.1).toFixed(2)} ${(-r * 0.72).toFixed(2)},${(r * 0.52).toFixed(2)}"
            fill="none" stroke="${spec.fill}" stroke-width="${(r * 0.22).toFixed(2)}" stroke-linecap="round"/>`;
  },

  /** Two warm masses and a tail sweep (Part 9.1) — the fox exactly as the
   *  document draws it in words. It crosses unhurried, and never looks up. */
  fox(w, spec) {
    const r = w / 2;
    return `
      <ellipse cx="${(-r * 0.1).toFixed(2)}" cy="0" rx="${(r * 0.62).toFixed(2)}" ry="${(r * 0.3).toFixed(2)}" fill="${spec.fill}"/>
      <ellipse cx="${(r * 0.52).toFixed(2)}" cy="${(-r * 0.16).toFixed(2)}" rx="${(r * 0.28).toFixed(2)}" ry="${(r * 0.22).toFixed(2)}" fill="${spec.fill}"/>
      <path d="M${(-r * 0.66).toFixed(2)},${(r * 0.04).toFixed(2)} Q${(-r * 1.05).toFixed(2)},${(-r * 0.18).toFixed(2)} ${(-r * 0.92).toFixed(2)},${(-r * 0.44).toFixed(2)}"
            fill="none" stroke="${spec.fill}" stroke-width="${(r * 0.26).toFixed(2)}" stroke-linecap="round"/>
      <circle cx="${(-r * 0.92).toFixed(2)}" cy="${(-r * 0.46).toFixed(2)}" r="${(r * 0.14).toFixed(2)}" fill="${spec.tailTip}"/>
      ${legs(r, spec.fill, [-0.34, 0.1], r * 0.28)}`;
  },

  /** Two masses over four thin legs: the deer steps, then freezes, and the
   *  freeze is the event (Part 9.2). Its underside is the one lighter
   *  pigment Part 9.3 allows it. */
  deer(w, spec) {
    const r = w / 2;
    return `
      ${legs(r, spec.fill, [-0.42, -0.2, 0.24, 0.44], r * 0.42)}
      <ellipse cx="0" cy="0" rx="${(r * 0.6).toFixed(2)}" ry="${(r * 0.3).toFixed(2)}" fill="${spec.fill}"/>
      <ellipse cx="0" cy="${(r * 0.16).toFixed(2)}" rx="${(r * 0.46).toFixed(2)}" ry="${(r * 0.14).toFixed(2)}" fill="${spec.underside}" opacity="0.7"/>
      <path d="M${(r * 0.5).toFixed(2)},${(-r * 0.1).toFixed(2)} Q${(r * 0.78).toFixed(2)},${(-r * 0.5).toFixed(2)} ${(r * 0.72).toFixed(2)},${(-r * 0.72).toFixed(2)}"
            fill="none" stroke="${spec.fill}" stroke-width="${(r * 0.17).toFixed(2)}" stroke-linecap="round"/>
      <ellipse cx="${(r * 0.72).toFixed(2)}" cy="${(-r * 0.8).toFixed(2)}" rx="${(r * 0.16).toFixed(2)}" ry="${(r * 0.12).toFixed(2)}" fill="${spec.fill}"/>`;
  },

  /** A vertical stroke, a curve, and stillness (Part 9.1) — the heron's
   *  event IS the stillness (Part 9.2), so it carries no animation at all. */
  heron(w, spec) {
    const r = w / 2;
    const h = r * 2.1;
    return `
      <path d="M0,${(h * 0.5).toFixed(2)} L${(-r * 0.05).toFixed(2)},${(-h * 0.05).toFixed(2)}"
            fill="none" stroke="${spec.leg}" stroke-width="${(r * 0.09).toFixed(2)}" stroke-linecap="round"/>
      <ellipse cx="0" cy="${(-h * 0.12).toFixed(2)}" rx="${(r * 0.44).toFixed(2)}" ry="${(r * 0.62).toFixed(2)}" fill="${spec.fill}"/>
      <path d="M${(-r * 0.08).toFixed(2)},${(-h * 0.42).toFixed(2)} Q${(r * 0.3).toFixed(2)},${(-h * 0.62).toFixed(2)} ${(r * 0.16).toFixed(2)},${(-h * 0.8).toFixed(2)}"
            fill="none" stroke="${spec.fill}" stroke-width="${(r * 0.16).toFixed(2)}" stroke-linecap="round"/>
      <path d="M${(r * 0.16).toFixed(2)},${(-h * 0.8).toFixed(2)} L${(r * 0.62).toFixed(2)},${(-h * 0.76).toFixed(2)}"
            fill="none" stroke="${spec.fill}" stroke-width="${(r * 0.08).toFixed(2)}" stroke-linecap="round"/>`;
  },

  /** One upright mass with the faintest shoulder — the owl is heard, then
   *  is there (Part 9.2). No face: an owl drawn with eyes would be the
   *  single most companion-like shape in the product. */
  owl(w, spec) {
    const r = w / 2;
    return `
      <ellipse cx="0" cy="0" rx="${(r * 0.72).toFixed(2)}" ry="${(r * 0.94).toFixed(2)}" fill="${spec.fill}"/>
      <ellipse cx="${(-r * 0.34).toFixed(2)}" cy="${(r * 0.12).toFixed(2)}" rx="${(r * 0.34).toFixed(2)}" ry="${(r * 0.6).toFixed(2)}" fill="${spec.fill}" opacity="0.62"/>`;
  },

  /** Amber with one dark band (Part 9.3) — built and pinned, though the
   *  Orchard is still wild and nothing calls for it yet. */
  bee(w, spec) {
    const r = w / 2;
    return `
      <ellipse cx="0" cy="0" rx="${(r * 0.86).toFixed(2)}" ry="${(r * 0.6).toFixed(2)}" fill="${spec.fill}"/>
      <rect x="${(-r * 0.16).toFixed(2)}" y="${(-r * 0.58).toFixed(2)}" width="${(r * 0.3).toFixed(2)}" height="${(r * 1.16).toFixed(2)}" fill="${spec.band}" opacity="0.8"/>`;
  },

  /** A slate body with two wing sheens (Part 9.3) — built and pinned for
   *  the day the Mirror Pond's water can actually be clear. */
  dragonfly(w, spec) {
    const r = w / 2;
    return `
      <ellipse cx="${(-r * 0.2).toFixed(2)}" cy="0" rx="${(r * 0.9).toFixed(2)}" ry="${(r * 0.12).toFixed(2)}" fill="${spec.fill}"/>
      <ellipse cx="${(r * 0.1).toFixed(2)}" cy="${(-r * 0.22).toFixed(2)}" rx="${(r * 0.5).toFixed(2)}" ry="${(r * 0.14).toFixed(2)}" fill="${spec.sheen}" opacity="${spec.sheenOpacity}" transform="rotate(-12)"/>
      <ellipse cx="${(r * 0.1).toFixed(2)}" cy="${(r * 0.2).toFixed(2)}" rx="${(r * 0.46).toFixed(2)}" ry="${(r * 0.13).toFixed(2)}" fill="${spec.sheen}" opacity="${spec.sheenOpacity}" transform="rotate(10)"/>`;
  },

  /** Two soft masses and a tail sweep (Part 4.5, 9.1) — the hearth cat,
   *  asleep. Drawn here rather than in overlook.js from this stage on, so
   *  every creature in the valley comes out of one hand and one roster. */
  cat(w, spec) {
    const r = w / 2;
    return `
      <path d="M${(r * 0.56).toFixed(2)},0 Q${(r).toFixed(2)},${(-r * 0.34).toFixed(2)} ${(r * 0.78).toFixed(2)},${(-r * 0.66).toFixed(2)}"
            fill="none" stroke="${spec.fill}" stroke-width="${(r * 0.17).toFixed(2)}" stroke-linecap="round"/>
      <ellipse cx="0" cy="0" rx="${(r * 0.6).toFixed(2)}" ry="${(r * 0.29).toFixed(2)}" fill="${spec.fill}"/>
      <ellipse cx="${(-r * 0.47).toFixed(2)}" cy="${(-r * 0.16).toFixed(2)}" rx="${(r * 0.29).toFixed(2)}" ry="${(r * 0.24).toFixed(2)}" fill="${spec.fill}"/>
      <ellipse cx="${(-r * 0.51).toFixed(2)}" cy="${(-r * 0.04).toFixed(2)}" rx="${(r * 0.14).toFixed(2)}" ry="${(r * 0.12).toFixed(2)}" fill="${spec.chest}"/>`;
  },
};

/** Thin legs under a standing mass — strokes, never masses, so they read
 *  at the 10% weight of Guide 5.4's hierarchy and never thicken a
 *  silhouette that should stay light. */
function legs(r, fill, xs, length) {
  return xs.map((t) => `<path d="M${(r * t).toFixed(2)},${(r * 0.18).toFixed(2)} L${(r * t).toFixed(2)},${(r * 0.18 + length).toFixed(2)}"
    fill="none" stroke="${fill}" stroke-width="${(r * 0.08).toFixed(2)}" stroke-linecap="round"/>`).join('');
}

/** The butterfly's two forms share one body, differing only in pigment. */
BODIES['butterfly-white'] = BODIES.butterfly;
BODIES['butterfly-dark'] = BODIES.butterfly;

/**
 * One creature, as an SVG `<g>` placed at (x, y) in the caller's own
 * coordinate space — the Overlook's 360×560 frame or the cathedral's
 * 0–100 percentage space. The motion verb becomes a class; the animations
 * themselves live in components.css, where reduced motion can rest them
 * all in one place (Part 12).
 *
 * @param {string} kind  a key of FAUNA
 * @param {number} x
 * @param {number} y
 * @param {number} frameWidth  the caller's frame width in its own units
 *        (360 for the Overlook, 100 for a percentage-space scene), so the
 *        roster's share-of-frame-width sizes resolve correctly in both
 * @param {{delay?: number}} [opts]
 */
export function faunaSVG(kind, x, y, frameWidth, opts = {}) {
  const spec = FAUNA[kind];
  const body = BODIES[kind];
  if (!spec || !body) return '';
  const w = spec.size * frameWidth;
  const delay = opts.delay ? ` style="animation-delay:${opts.delay}s"` : '';
  return `<g class="fa fa--${kind} fa-verb--${spec.verb}" aria-hidden="true"
    transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"${delay}>${body(w, spec, frameWidth)}</g>`;
}

/**
 * The same creature as a standalone inline `<svg>`, for a scene that
 * positions its ambient life with CSS rather than inside one big SVG (the
 * biome's `.grove-ambient` layer). The viewBox is centred on the creature
 * so the CSS box and the drawn mass agree.
 */
export function faunaInlineSVG(kind, frameWidth) {
  const spec = FAUNA[kind];
  const body = BODIES[kind];
  if (!spec || !body) return '';
  const w = spec.size * frameWidth;
  // A generous half-extent: the widest creature (the heron) reaches about
  // 1.1× its own width above centre, so a square box of 2.4× the width
  // holds every roster member without clipping a tail or a raised neck.
  const half = w * 1.2;
  return `<svg class="fa-inline fa-inline--${kind}" viewBox="${-half} ${-half} ${half * 2} ${half * 2}"
    width="${(half * 2).toFixed(2)}" height="${(half * 2).toFixed(2)}" aria-hidden="true" focusable="false">
    <g class="fa fa--${kind}">${body(w, spec, frameWidth)}</g>
  </svg>`;
}
