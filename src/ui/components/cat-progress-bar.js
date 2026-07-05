/**
 * <cat-progress-bar> — session progress. Attributes: value, max.
 * Presentation only; announced to assistive tech via role/aria.
 */

class CatProgressBar extends HTMLElement {
  static get observedAttributes() { return ['value', 'max']; }
  attributeChangedCallback() { this.#render(); }
  connectedCallback() { this.#render(); }

  #render() {
    const value = Number(this.getAttribute('value') ?? 0);
    const max = Math.max(1, Number(this.getAttribute('max') ?? 1));
    const pct = Math.min(100, Math.round((value / max) * 100));
    this.innerHTML = `
      <style>
        cat-progress-bar { display: block; }
        cat-progress-bar .track {
          height: 4px;
          border-radius: var(--radius-full);
          background: var(--color-surface-3);
          overflow: hidden;
        }
        cat-progress-bar .fill {
          height: 100%;
          width: ${pct}%;
          background: var(--color-accent);
          border-radius: var(--radius-full);
          transition: width var(--duration-slow) var(--ease-out);
        }
      </style>
      <div class="track" role="progressbar"
           aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${max}"
           aria-label="Question ${value} of ${max}">
        <div class="fill"></div>
      </div>
    `;
  }
}

customElements.define('cat-progress-bar', CatProgressBar);
