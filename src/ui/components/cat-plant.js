/**
 * <cat-plant> — a plant in the Language Garden and on Growth, as a sprite
 * from the art pack (assets/art/): bare ground, a planter, a shrub,
 * a young birch, an oak that fills out, a pine for a Landmark. One
 * stage-to-sprite map, so a family looks the same everywhere it appears.
 * Presentation only (Rule 7): attributes in, an image out, no business
 * logic, no events.
 *
 * Attributes:
 *   stage  one of STAGES in core/engine/garden-session.js:
 *          "open_ground" | "seed" | "sprout" | "young" | "in_leaf" |
 *          "mature" | "ancient"
 *   due    "none" | "gold" | "bare"        (default "none") — "gold" is lit
 *          for review: a slow honey glow behind the plant
 *   size   "foreground" | "horizon"        (default "foreground") — the
 *          horizon is the same plant, quieter
 *   landmark  boolean presence attribute   (Ancient the world singled out)
 *   name   the family label, shown once at a Landmark's base
 *
 * `vigor`, `seed`, `season` and `nest` are still accepted (callers set
 * them) and deliberately ignored: the pack's bakes have one form per stage.
 */

/** A root family's growth stage as [sprite, scale]. */
const PLANT_STAGE = Object.freeze({ open_ground: ['grass', 1.4], seed: ['planter', 0.8], sprout: ['bush', 0.8], young: ['tree_birch', 0.6], in_leaf: ['tree_oak', 0.7], mature: ['tree_oak', 0.85], ancient: ['tree_oak', 1] });

/** A plant still's image file (assets/art/<name>.png). */
const artURL = (name) => new URL(`../../../assets/art/${name}.png`, import.meta.url).href;

function escapeText(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

class CatPlant extends HTMLElement {
  static get observedAttributes() { return ['stage', 'due', 'size', 'landmark', 'name']; }
  attributeChangedCallback() { this.#render(); }
  connectedCallback() { this.#render(); }

  #render() {
    const stage = this.getAttribute('stage') ?? 'open_ground';
    const landmark = this.hasAttribute('landmark') && stage !== 'open_ground';
    const [sprite, scale] = PLANT_STAGE[stage] ?? PLANT_STAGE.in_leaf;
    const horizon = this.getAttribute('size') === 'horizon';
    const gold = this.getAttribute('due') === 'gold';
    const name = landmark && !horizon ? this.getAttribute('name') : null;
    // The sprite's height inside the box follows its stage, so a young tree
    // is visibly smaller than an old one standing beside it.
    const h = Math.round(Math.min(1, scale) * 100);
    this.innerHTML = `
      <style>
        cat-plant { display: block; position: relative; }
        cat-plant .pl-img { position: absolute; left: 0; right: 0; bottom: 0; margin: 0 auto; width: 100%; object-fit: contain; object-position: 50% 100%; }
        cat-plant .pl-img--horizon { opacity: 0.5; }
        cat-plant .pl-img--gold { filter: drop-shadow(0 0 6px rgba(216, 173, 89, 0.9)); animation: pl-gold 5s ease-in-out infinite; }
        @keyframes pl-gold { 50% { filter: drop-shadow(0 0 2px rgba(216, 173, 89, 0.5)); } }
        @media (prefers-reduced-motion: reduce) { :root:not([data-motion="full"]) cat-plant .pl-img--gold { animation: none; } }
        cat-plant .pl-nameplate { position: absolute; left: 0; right: 0; bottom: -1.4em; text-align: center; font: 500 11px/1 var(--font-display, Georgia, serif); color: var(--color-ink-2, #46554B); opacity: 0.8; }
      </style>
      <img class="pl-img${horizon ? ' pl-img--horizon' : ''}${gold ? ' pl-img--gold' : ''}" style="height:${h}%" src="${artURL(landmark ? 'tree_pine' : sprite)}" alt="" aria-hidden="true" draggable="false">
      ${name ? `<span class="pl-nameplate">${escapeText(name)}.</span>` : ''}
    `;
  }
}

customElements.define('cat-plant', CatPlant);
