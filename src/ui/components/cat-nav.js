/**
 * <cat-nav> — the fixed bottom navigation (mobile-first, thumb reach).
 *
 * Presentation only (PROJECT_RULES Rule 7): it renders links and
 * highlights the active one. It holds no routing logic — it simply
 * listens to hashchange to know which item is active, and navigation
 * itself is plain anchor hashes handled by the Router.
 *
 * 0.6.0: text glyphs replaced by a matched set of inline stroke
 * icons (one weight, one corner radius) so the chrome reads as one
 * hand. Inline SVG keeps them offline and theme-aware for free.
 */

const ICONS = {
  // The valley (0.16.0): a hill with one tree — the way home from anywhere
  // beyond the Gate. Replaces the dashboard's house glyph.
  valley: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M3 19.5 C7 13.5 10.5 12 13 13.5 C15.5 11 19 11.5 21 19.5 Z"/>
           <path d="M7.5 13.2 V9.8"/>
           <circle cx="7.5" cy="7.6" r="2.6"/>
         </svg>`,
  practice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M4 11.5 L12 4.5 L20 11.5"/>
           <path d="M6 10.5 V19.5 H18 V10.5"/>
           <path d="M10 19.5 V14 H14 V19.5"/>
         </svg>`,
  growth: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M12 20 V11"/>
           <path d="M12 13 C12 9 9.5 6.5 5 6 C5.3 10.5 7.8 12.8 12 13 Z"/>
           <path d="M12 11 C12 8 14 5.8 18.5 5.4 C18.3 9.3 16 11 12 11 Z"/>
           <path d="M7 20 H17"/>
         </svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
           stroke-linecap="round" aria-hidden="true">
           <path d="M4 7.5 H20 M4 12 H20 M4 16.5 H20"/>
           <circle cx="9.5" cy="7.5" r="2" fill="var(--color-surface)"/>
           <circle cx="14.5" cy="12" r="2" fill="var(--color-surface)"/>
           <circle cx="8" cy="16.5" r="2" fill="var(--color-surface)"/>
         </svg>`,
};

// Three places, and no fourth. Settings is administration, and lives
// behind the valley's ☰ (src/world/menu.js) — never in the thumb rail.
const ITEMS = [
  { path: '/world',    label: 'Valley',   icon: ICONS.valley },
  { path: '/world/place/hearth', label: 'Hearth', icon: ICONS.practice },
  { path: '/growth',   label: 'Growth',   icon: ICONS.growth },
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
          color: var(--color-ink-3);
          font-size: var(--text-2xs);
          font-weight: var(--weight-semibold);
          transition: color var(--duration-fast) var(--ease-out),
                      background-color var(--duration-fast) var(--ease-out),
                      transform var(--duration-fast) var(--ease-out);
        }
        @media (hover: hover) { cat-nav a:hover { color: var(--color-ink); } }
        cat-nav a:active { transform: scale(var(--press-scale)); }
        cat-nav a[aria-current="page"] {
          color: var(--color-accent);
          background: var(--color-accent-subtle);
        }
        cat-nav svg { width: 1.35rem; height: 1.35rem; display: block; }
      </style>
      ${ITEMS.map((i) => `
        <a href="#${i.path}" data-path="${i.path}">
          ${i.icon}
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
