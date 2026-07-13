/**
 * <cat-celebration> — the app's ONE celebration surface, used
 * sparingly (level up, achievement unlock, new streak record —
 * never after ordinary answers). A quiet sheet rises, the medal
 * draws itself, and it leaves when told. No confetti, no shake:
 * elegance is the brief.
 *
 * Usage: celebrate({ title, lines: ['Achievement — Perfect Set'] })
 * Returns after the user dismisses it.
 */

import { escapeHTML } from '../../core/utils/format.js';

class CatCelebration extends HTMLElement {
  show({ title, lines = [] }) {
    this.innerHTML = `
      <style>
        cat-celebration {
          position: fixed; inset: 0; z-index: 30;
          display: flex; align-items: flex-end; justify-content: center;
        }
        cat-celebration .scrim {
          position: absolute; inset: 0;
          background: rgba(0, 0, 0, 0.35);
          opacity: 0;
          transition: opacity var(--duration) var(--ease-out);
        }
        cat-celebration .sheet {
          position: relative;
          width: min(100%, 26rem);
          margin: 0 var(--space-4);
          margin-bottom: calc(env(safe-area-inset-bottom) + var(--space-5));
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-2);
          padding: var(--space-6) var(--space-5) var(--space-5);
          text-align: center;
          transform: translateY(16px);
          opacity: 0;
          transition: transform var(--duration-slow) var(--ease-out),
                      opacity var(--duration-slow) var(--ease-out);
        }
        cat-celebration.is-open .scrim { opacity: 1; }
        cat-celebration.is-open .sheet { transform: none; opacity: 1; }
        cat-celebration .medal { display: flex; justify-content: center; margin-bottom: var(--space-3); }
        cat-celebration .medal svg { width: 3.5rem; height: 3.5rem; }
        cat-celebration .medal circle { fill: var(--color-accent-subtle); }
        cat-celebration .medal path {
          fill: none;
          stroke: var(--color-accent);
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: cel-draw 560ms var(--ease-out) 200ms forwards;
        }
        @keyframes cel-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          cat-celebration .medal path { animation: none; stroke-dashoffset: 0; }
        }
        cat-celebration h2 {
          font-family: var(--font-reading);
          font-size: var(--text-xl);
          letter-spacing: var(--tracking-tight);
          margin-bottom: var(--space-2);
        }
        cat-celebration .line { color: var(--color-ink-2); font-size: var(--text-sm); margin: 0 0 var(--space-1); }
        cat-celebration .btn { margin-top: var(--space-4); }
      </style>
      <div class="scrim"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}">
        <div class="medal" aria-hidden="true">
          <svg viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="20"></circle>
            <path d="M20 8 l3.2 6.6 7.2 1 -5.2 5.1 1.2 7.2 -6.4 -3.4 -6.4 3.4 1.2 -7.2 -5.2 -5.1 7.2 -1 z"></path>
          </svg>
        </div>
        <h2>${escapeHTML(title)}</h2>
        ${lines.map((l) => `<p class="line">${escapeHTML(l)}</p>`).join('')}
        <button class="btn btn--primary btn--block" type="button">Continue</button>
      </div>
    `;
    requestAnimationFrame(() => this.classList.add('is-open'));
    return new Promise((resolve) => {
      const close = () => {
        this.classList.remove('is-open');
        setTimeout(() => { this.remove(); resolve(); }, 220);
      };
      this.querySelector('button').addEventListener('click', close, { once: true });
      this.querySelector('.scrim').addEventListener('click', close, { once: true });
      this.querySelector('button').focus();
    });
  }
}

customElements.define('cat-celebration', CatCelebration);

/** Show one celebration sheet; resolves when dismissed. */
export function celebrate(opts) {
  const el = document.createElement('cat-celebration');
  document.body.appendChild(el);
  return el.show(opts);
}
