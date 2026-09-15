/**
 * <cat-nav> — the fixed bottom navigation (mobile-first, thumb reach).
 *
 * Presentation only (PROJECT_RULES Rule 7): it renders links and
 * highlights the active one. It holds no routing logic — it simply
 * listens to hashchange to know which item is active, and navigation
 * itself is plain anchor hashes handled by the Router.
 *
 * 1.3.0: the rail carries the valley's own pixel marks (world/icons.js),
 * not stroke glyphs — the chrome is made of the same pixels as the map.
 */

import { icon } from '../../world/icons.js';

// Three places, and no fourth. Settings is administration, and lives
// behind the valley's ☰ (src/world/menu.js) — never in the thumb rail.
// `valley` and `cottage` both alias to the same drawn `house` mark
// (world/icons.js), so the rail shipped two identical roofs side by side and
// the only way to tell Village from Standing was to read the label. Three
// places, three marks: the village is a house, your standing is a star (it is
// counted in stars), what is growing is a sprout.
const ITEMS = [
  { path: '/world',    label: 'Village',  mark: 'valley' },
  { path: '/world/place/hearth', label: 'Standing', mark: 'star' },
  { path: '/growth',   label: 'Growth',   mark: 'sprout' },
];

class CatNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        cat-nav {
          position: fixed;
          inset: auto 0 0 0;
          display: flex;
          justify-content: space-around;
          background: var(--color-veil);
          -webkit-backdrop-filter: saturate(160%) blur(14px);
          backdrop-filter: saturate(160%) blur(14px);
          border-top: 1px solid var(--color-line);
          padding-bottom: env(safe-area-inset-bottom);
          z-index: 10;
        }
        cat-nav a {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          min-width: var(--tap-target);
          height: var(--nav-height);
          padding: 0 var(--space-4);
          border-radius: var(--radius-md);
          margin: var(--space-1) 0;
          text-decoration: none;
          /* ink-2, not ink-3. The rail is a translucent veil over whatever
             the screen behind it is painting, so a label here has no
             reliable ground and needs the margin; at 12px on the dark
             theme's veil, ink-3 measured 4.1:1. */
          color: var(--color-ink-2);
          font-size: var(--text-2xs);
          font-weight: var(--weight-semibold);
          transition: color var(--duration-fast) var(--ease-out),
                      background-color var(--duration-fast) var(--ease-out),
                      transform var(--duration-fast) var(--ease-out);
        }
        @media (hover: hover) { cat-nav a:hover { color: var(--color-ink); } }
        cat-nav a:active { transform: scale(var(--press-scale)); }
        cat-nav a[aria-current="page"] {
          color: var(--color-accent-hover);
          background: var(--color-accent-subtle);
        }
        cat-nav .ico {
          width: 1.45rem; height: 1.45rem; display: block;
          image-rendering: pixelated;
          filter: saturate(0.5) opacity(0.62);
          transition: filter var(--duration-fast) var(--ease-out);
        }
        cat-nav a[aria-current="page"] .ico { filter: none; }
      </style>
      ${ITEMS.map((i) => `
        <a href="#${i.path}" data-path="${i.path}">
          ${icon(i.mark, { size: 22 })}
          <span>${i.label}</span>
        </a>`).join('')}
    `;
    this.#sync();
    window.addEventListener('hashchange', () => this.#sync());
  }

  #sync() {
    const current = location.hash.slice(1) || '/world';
    for (const a of this.querySelectorAll('a')) {
      const active = current === a.dataset.path || (a.dataset.path !== '/world' && current.startsWith(`${a.dataset.path}/`));
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  }
}

customElements.define('cat-nav', CatNav);
