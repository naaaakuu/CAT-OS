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
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M4 10.5 L12 4 L20 10.5 V19 A1 1 0 0 1 19 20 H15 V14.5 H9 V20 H5 A1 1 0 0 1 4 19 Z"/>
         </svg>`,
  practice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M12 6.5 C10.2 5 7.2 4.7 4.5 5.4 V18.4 C7.2 17.7 10.2 18 12 19.5 C13.8 18 16.8 17.7 19.5 18.4 V5.4 C16.8 4.7 13.8 5 12 6.5 Z"/>
           <path d="M12 6.5 V19.5"/>
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

const ITEMS = [
  { path: '/home',     label: 'Home',     icon: ICONS.home },
  { path: '/practice', label: 'Practice', icon: ICONS.practice },
  { path: '/growth',   label: 'Growth',   icon: ICONS.growth },
  { path: '/settings', label: 'Settings', icon: ICONS.settings },
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
    const current = location.hash.slice(1) || '/home';
    for (const a of this.querySelectorAll('a')) {
      const active = current === a.dataset.path || current.startsWith(`${a.dataset.path}/`);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  }
}

customElements.define('cat-nav', CatNav);
