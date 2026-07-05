/**
 * <cat-xp-bar> — level + progress to the next level.
 * Presentation only: set `.data = { level, intoLevel, needed, progress }`
 * (the object from levelFromXP). Optional `.gained` animates a count-up
 * of freshly earned XP once, on the result screen.
 */

class CatXPBar extends HTMLElement {
  #data = null;
  #gained = 0;

  set data(d) { this.#data = d; this.#render(); }
  set gained(n) { this.#gained = n; this.#render(); }

  #render() {
    if (!this.#data) return;
    const { level, intoLevel, needed, progress } = this.#data;
    this.innerHTML = `
      <style>
        cat-xp-bar { display: block; }
        cat-xp-bar .top {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: var(--space-2);
        }
        cat-xp-bar .level {
          font-size: var(--text-sm);
          font-weight: var(--weight-bold);
        }
        cat-xp-bar .gained {
          color: var(--color-correct-ink);
          font-weight: var(--weight-bold);
          font-size: var(--text-sm);
          font-variant-numeric: tabular-nums;
        }
        cat-xp-bar .nums {
          font-size: var(--text-2xs);
          color: var(--color-ink-3);
          font-variant-numeric: tabular-nums;
        }
        cat-xp-bar .track {
          height: 6px;
          border-radius: var(--radius-full);
          background: var(--color-surface-3);
          overflow: hidden;
        }
        cat-xp-bar .fill {
          height: 100%;
          width: 0%;
          background: var(--color-accent);
          border-radius: var(--radius-full);
          transition: width var(--duration-slow) var(--ease-out);
        }
      </style>
      <div class="top">
        <span class="level">Level ${level}</span>
        ${this.#gained > 0 ? `<span class="gained" aria-live="polite">+<span data-count>0</span> XP</span>` : ''}
        <span class="nums">${intoLevel} / ${needed} XP</span>
      </div>
      <div class="track" role="progressbar" aria-valuenow="${intoLevel}"
           aria-valuemin="0" aria-valuemax="${needed}"
           aria-label="Level ${level}: ${intoLevel} of ${needed} XP">
        <div class="fill"></div>
      </div>
    `;
    // Fill animates from 0 on the next frame; count-up runs ~700ms.
    requestAnimationFrame(() => {
      const fill = this.querySelector('.fill');
      if (fill) fill.style.width = `${Math.round(progress * 100)}%`;
      const counter = this.querySelector('[data-count]');
      if (counter) this.#countUp(counter, this.#gained);
    });
  }

  #countUp(el, target) {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = String(target); return; }
    const t0 = performance.now();
    const dur = 700;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

customElements.define('cat-xp-bar', CatXPBar);
