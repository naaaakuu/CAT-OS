/**
 * <cat-option> — one selectable answer option.
 *
 * Presentation only: attributes in (`letter`, `text`, and a `state`),
 * a `cat-option-select` event out. It never knows which answer is
 * correct — the screen tells it what state to show.
 *
 * States: "" (idle) · "selected" · "correct" · "wrong" · "dimmed"
 */

import { escapeHTML } from '../../core/utils/format.js';

class CatOption extends HTMLElement {
  static get observedAttributes() { return ['letter', 'text', 'state', 'disabled']; }
  attributeChangedCallback() { this.#render(); }
  connectedCallback() { this.#render(); }

  #render() {
    const letter = this.getAttribute('letter') ?? '';
    const text = this.getAttribute('text') ?? '';
    const state = this.getAttribute('state') ?? '';
    const disabled = this.hasAttribute('disabled');
    this.innerHTML = `
      <style>
        cat-option { display: block; margin-bottom: var(--space-2); }
        cat-option button {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          width: 100%;
          text-align: left;
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--color-line);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          font-size: var(--text-sm);
          line-height: var(--leading-body);
          transition: border-color var(--duration-fast) var(--ease-out),
                      background-color var(--duration-fast) var(--ease-out),
                      transform var(--duration-fast) var(--ease-out),
                      opacity var(--duration) var(--ease-out);
        }
        @media (hover: hover) {
          cat-option:not([disabled]) button:hover { border-color: var(--color-line-strong); }
        }
        cat-option:not([disabled]) button:active { transform: scale(var(--press-scale)); }
        cat-option .letter {
          flex: none;
          width: 1.6rem; height: 1.6rem;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius-full);
          background: var(--color-surface-2);
          font-size: var(--text-2xs);
          font-weight: var(--weight-bold);
          transition: background-color var(--duration-fast) var(--ease-out),
                      color var(--duration-fast) var(--ease-out);
        }
        cat-option[state="selected"] button { border-color: var(--color-accent); background: var(--color-accent-subtle); }
        cat-option[state="selected"] .letter { background: var(--color-accent); color: var(--color-accent-ink); }
        cat-option[state="correct"] button { background: var(--color-correct-bg); border-color: var(--color-correct-ink); color: var(--color-correct-ink); }
        cat-option[state="correct"] .letter { background: var(--color-correct-ink); color: var(--color-correct-bg); }
        cat-option[state="wrong"] button { background: var(--color-wrong-bg); border-color: var(--color-wrong-ink); color: var(--color-wrong-ink); }
        cat-option[state="wrong"] .letter { background: var(--color-wrong-ink); color: var(--color-wrong-bg); }
        cat-option[state="dimmed"] button { opacity: var(--opacity-dim); }
        cat-option[disabled] button { cursor: default; }
      </style>
      <button type="button" ${disabled ? 'disabled' : ''}
              aria-pressed="${state === 'selected'}">
        <span class="letter" aria-hidden="true">${escapeHTML(letter)}</span>
        <span>${escapeHTML(text)}</span>
      </button>
    `;
    this.querySelector('button').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('cat-option-select', {
        bubbles: true,
        detail: { letter },
      }));
    });
  }
}

customElements.define('cat-option', CatOption);
