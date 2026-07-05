/**
 * <cat-result-summary> — end-of-session numbers, shown calmly:
 * information, never judgment (PRODUCT_BLUEPRINT §6). One quiet
 * moment of celebration: a hand-drawn check that traces itself in.
 * Presentation only: set `.score` (from computeScore) and `.durationMs`.
 */

import { formatDuration, formatPercent } from '../../core/utils/format.js';

class CatResultSummary extends HTMLElement {
  #score = null;
  #durationMs = 0;

  set score(s) { this.#score = s; this.#render(); }
  set durationMs(ms) { this.#durationMs = ms; this.#render(); }

  #render() {
    if (!this.#score) return;
    const s = this.#score;
    this.innerHTML = `
      <style>
        cat-result-summary { display: block; }
        cat-result-summary .mark {
          display: flex;
          justify-content: center;
          margin-bottom: var(--space-4);
        }
        cat-result-summary .mark svg { width: 3rem; height: 3rem; }
        cat-result-summary .mark circle {
          fill: var(--color-success-bg);
        }
        cat-result-summary .mark path {
          fill: none;
          stroke: var(--color-correct-ink);
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: draw-check 480ms var(--ease-out) 180ms forwards;
        }
        @keyframes draw-check { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          cat-result-summary .mark path { animation: none; stroke-dashoffset: 0; }
        }
        cat-result-summary .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-3);
        }
        cat-result-summary .stat {
          background: var(--color-surface-2);
          border-radius: var(--radius-md);
          padding: var(--space-4);
        }
        cat-result-summary .stat b {
          display: block;
          font-size: var(--text-lg);
          font-weight: var(--weight-bold);
          font-variant-numeric: tabular-nums;
          letter-spacing: var(--tracking-tight);
        }
        cat-result-summary .stat span { font-size: var(--text-2xs); color: var(--color-ink-3); }
        cat-result-summary .note {
          font-size: var(--text-xs);
          color: var(--color-ink-3);
          margin-top: var(--space-3);
        }
      </style>
      <div class="mark" aria-hidden="true">
        <svg viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="18"></circle>
          <path d="M11 18.5 L16 23.5 L25 13.5"></path>
        </svg>
      </div>
      <div class="grid">
        <div class="stat"><b>${s.correct} / ${s.total}</b><span>Correct</span></div>
        <div class="stat"><b>${formatPercent(s.accuracy)}</b><span>Accuracy (of attempted)</span></div>
        <div class="stat"><b>${s.marks} / ${s.max_marks}</b><span>CAT-style marks</span></div>
        <div class="stat"><b>${formatDuration(this.#durationMs)}</b><span>Time taken</span></div>
      </div>
      <p class="note">Marks use the widely used +3 / −1 convention; the official
      scheme is announced per exam cycle — verify against the current notification.</p>
    `;
  }
}

customElements.define('cat-result-summary', CatResultSummary);
