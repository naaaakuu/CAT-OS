/**
 * <cat-nav> — the fixed bottom navigation (mobile-first, thumb reach).
 *
 * Presentation only (PROJECT_RULES Rule 7): it renders links and
 * highlights the active one. It holds no routing logic — it simply
 * listens to hashchange to know which item is active, and navigation
 * itself is plain anchor hashes handled by the Router.
 *
 * 3.0: three places in the village — the village itself, the clock tower
 * (progress) and Settings — drawn as small line marks, so
 * the rail matches the village's own cards instead of an older art pack.
 */

const MARKS = {
  village: '<path d="M3.5 11.5 9 7l5.5 4.5M5.5 10v8.5h7V10" /><path d="M13 9.6 16.5 7l4 3.3v8.2H12.5" /><path d="M8 18.5v-3.5h2v3.5" />',
  clock: '<path d="M9 21V8.5L12 4l3 4.5V21z" /><circle cx="12" cy="11.5" r="2.4" /><path d="M12 10.3v1.3l.9.6M10.2 21v-3.4h3.6V21" />',
  settings: '<circle cx="12" cy="12" r="3" /><path d="M12 3.5l1.4 2.3 2.6-.7.7 2.6 2.3 1.4-1.2 2.4 1.2 2.4-2.3 1.4-.7 2.6-2.6-.7L12 20.5l-1.4-2.3-2.6.7-.7-2.6-2.3-1.4L6.2 12 5 9.6l2.3-1.4.7-2.6 2.6.7z" />',
};
const ITEMS = [
  { path: '/world', label: 'Village', mark: 'village' },
  { path: '/growth', label: 'Progress', mark: 'clock' },
  { path: '/settings', label: 'Settings', mark: 'settings' },
];

class CatNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        cat-nav {
          position: fixed; inset: auto 0 0 0; z-index: 10;
          display: flex; justify-content: space-around;
          background: var(--color-veil);
          -webkit-backdrop-filter: saturate(150%) blur(14px); backdrop-filter: saturate(150%) blur(14px);
          border-top: 1px solid var(--color-line);
          padding-bottom: env(safe-area-inset-bottom);
        }
        cat-nav a {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
          min-width: var(--tap-target); height: var(--nav-height); padding: 0 var(--space-5); margin: var(--space-1) 0;
          border-radius: 14px; text-decoration: none;
          color: var(--color-ink-2); font-size: var(--text-2xs); font-weight: var(--weight-semibold);
          transition: color var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
        }
        @media (hover: hover) { cat-nav a:hover { color: var(--color-ink); } }
        cat-nav a:active { transform: scale(var(--press-scale)); }
        cat-nav a[aria-current="page"] { color: var(--color-accent-hover); background: var(--color-accent-subtle); }
        cat-nav svg { width: 1.45rem; height: 1.45rem; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
      </style>
      ${ITEMS.map((i) => `
        <a href="#${i.path}" data-path="${i.path}">
          <svg viewBox="0 0 24 24" aria-hidden="true">${MARKS[i.mark]}</svg>
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
