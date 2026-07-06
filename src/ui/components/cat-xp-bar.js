/**
 * <cat-xp-bar> — level + progress to the next level.
 * Presentation only: set `.data = { level, intoLevel, needed, progress }`
 * (the object from levelFromXP). Optional `.gained` animates a count-up
 * of freshly earned XP once, on the result screen.
 *
 * Audio Identity: the count-up is accompanied by tiny ascending pentatonic
 * notes (xpTick), synchronized with the climbing number. So the sound
 * tracks a VISIBLE animation, the reveal is deferred until the bar scrolls
 * into view — which also keeps the run from colliding with the session's
 * mentor/reward sounds while it sits in a collapsed "details" fold.
 */

import { xpTick, playSound } from '../../core/engagement/audio.js';

class CatXPBar extends HTMLElement {
  #data = null;
  #gained = 0;
  #revealed = false;

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
    // Reveal (fill + count-up) once the bar is actually on screen.
    this.#reveal();
  }

  /** Run the fill + count-up when the bar first becomes visible. */
  #reveal() {
    if (this.#revealed || !this.#data) return;
    const run = () => {
      if (this.#revealed) return;
      this.#revealed = true;
      const fill = this.querySelector('.fill');
      if (fill) fill.style.width = `${Math.round(this.#data.progress * 100)}%`;
      const counter = this.querySelector('[data-count]');
      if (counter) this.#countUp(counter, this.#gained);
    };
    if (typeof IntersectionObserver === 'undefined') {
      requestAnimationFrame(run);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); requestAnimationFrame(run); }
    }, { threshold: 0.25 });
    io.observe(this);
  }

  #countUp(el, target) {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      el.textContent = String(target);
      if (target > 0) playSound('xp'); // one soft note; no run without motion
      return;
    }
    const t0 = performance.now();
    const dur = 700;
    let step = 0;
    let nextTickAt = 0; // schedule ~8 ascending grains across the count
    const tick = (t) => {
      const elapsed = t - t0;
      const p = Math.min(1, elapsed / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (target > 0 && p < 1 && elapsed >= nextTickAt) {
        xpTick(step);
        step += 1;
        nextTickAt += 85;
      }
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

customElements.define('cat-xp-bar', CatXPBar);
