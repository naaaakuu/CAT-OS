/**
 * <cat-jumble-board> — the sentence-ordering surface.
 *
 * Presentation only: set `.sentences` ([{label, text}] in presentation
 * order), read `.order` (labels in the learner's current sequence),
 * optionally set `.reveal` ({correct_order}) after submission. Emits
 * `jumble-order-change` with {order, action: 'place'|'remove'} on
 * every change. Holds no correctness logic beyond painting the reveal.
 *
 * Interaction (ROADMAP_V2 0.7.0 decision): select-to-order, not
 * drag-and-drop — reliable on small screens, works with a keyboard,
 * and makes the learner COMMIT position by position, which is where
 * the thinking happens. Tap a sentence to give it the next position;
 * tap it again to take it back (later positions close up).
 */

import { escapeHTML } from '../../core/utils/format.js';

class CatJumbleBoard extends HTMLElement {
  #sentences = null;
  #order = [];
  #reveal = null;

  set sentences(list) {
    this.#sentences = list;
    this.#order = [];
    this.#reveal = null;
    this.#render();
  }

  get order() { return [...this.#order]; }

  set order(labels) {
    this.#order = [...labels];
    this.#sync();
  }

  /** @param {{correct_order: string[]}|null} r */
  set reveal(r) {
    this.#reveal = r;
    this.#sync();
  }

  #emit(action) {
    this.dispatchEvent(new CustomEvent('jumble-order-change', {
      bubbles: true,
      detail: { order: [...this.#order], action },
    }));
  }

  #toggle(label) {
    if (this.#reveal) return;
    const at = this.#order.indexOf(label);
    let action;
    if (at === -1) {
      if (this.#order.length >= this.#sentences.length) return;
      this.#order.push(label);
      action = 'place';
    } else {
      this.#order.splice(at, 1);
      action = 'remove';
    }
    this.#sync();
    this.#emit(action);
  }

  #render() {
    if (!this.#sentences) return;
    this.innerHTML = `
      <style>
        cat-jumble-board { display: block; }
        cat-jumble-board .jcard {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          width: 100%;
          text-align: left;
          padding: var(--space-3) var(--space-4);
          margin-bottom: var(--space-2);
          border: 1px solid var(--color-line);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          font-family: var(--font-reading);
          font-size: var(--text-sm);
          line-height: var(--leading-body);
          transition: border-color var(--duration-fast) var(--ease-out),
                      background-color var(--duration-fast) var(--ease-out),
                      transform var(--duration-fast) var(--ease-out),
                      box-shadow var(--duration) var(--ease-out);
        }
        @media (hover: hover) {
          cat-jumble-board .jcard:not([disabled]):hover { border-color: var(--color-line-strong); }
        }
        cat-jumble-board .jcard:not([disabled]):active { transform: scale(var(--press-scale)); }
        cat-jumble-board .jcard[disabled] { cursor: default; }
        cat-jumble-board .jcard.is-placed {
          border-color: var(--color-accent);
          background: var(--color-accent-subtle);
        }
        cat-jumble-board .slot {
          flex: none;
          width: 1.7rem; height: 1.7rem;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius-full);
          border: 1.5px dashed var(--color-line-strong);
          background: transparent;
          color: var(--color-ink-3);
          font-family: var(--font-ui);
          font-size: var(--text-2xs);
          font-weight: var(--weight-bold);
          font-variant-numeric: tabular-nums;
          transition: background-color var(--duration-fast) var(--ease-out),
                      border-color var(--duration-fast) var(--ease-out),
                      color var(--duration-fast) var(--ease-out);
        }
        cat-jumble-board .jcard.is-placed .slot {
          border-style: solid;
          border-color: var(--color-accent);
          background: var(--color-accent);
          color: var(--color-accent-ink);
        }
        cat-jumble-board .jcard.is-hit .slot {
          border-style: solid;
          border-color: var(--color-correct-ink);
          background: var(--color-correct-bg);
          color: var(--color-correct-ink);
        }
        cat-jumble-board .jcard.is-miss .slot {
          border-style: solid;
          border-color: var(--color-wrong-ink);
          background: var(--color-wrong-bg);
          color: var(--color-wrong-ink);
        }
        cat-jumble-board .jcard .stag {
          flex: none;
          align-self: flex-start;
          margin-top: 2px;
          font-family: var(--font-ui);
          font-size: var(--text-2xs);
          font-weight: var(--weight-bold);
          color: var(--color-ink-3);
          letter-spacing: var(--tracking-wide);
        }
        cat-jumble-board .jcard .yours {
          display: block;
          margin-top: var(--space-1);
          font-family: var(--font-ui);
          font-size: var(--text-2xs);
          color: var(--color-wrong-ink);
        }
      </style>
      ${this.#sentences.map((s) => `
        <button type="button" class="jcard" data-label="${escapeHTML(s.label)}"
                aria-label="Sentence ${escapeHTML(s.label)}">
          <span class="slot" aria-hidden="true"></span>
          <span class="stag">${escapeHTML(s.label)}</span>
          <span class="text">${escapeHTML(s.text)}</span>
        </button>`).join('')}
    `;
    this.addEventListener('click', (e) => {
      const card = e.target.closest?.('.jcard');
      if (!card || card.hasAttribute('disabled')) return;
      this.#toggle(card.dataset.label);
    });
    this.#sync();
  }

  #sync() {
    if (!this.#sentences) return;
    for (const card of this.querySelectorAll('.jcard')) {
      const label = card.dataset.label;
      const slot = card.querySelector('.slot');
      const placedAt = this.#order.indexOf(label);
      card.classList.remove('is-placed', 'is-hit', 'is-miss');
      card.querySelector('.yours')?.remove();

      if (this.#reveal) {
        card.setAttribute('disabled', '');
        const correctAt = this.#reveal.correct_order.indexOf(label);
        const hit = placedAt === correctAt;
        card.classList.add(hit ? 'is-hit' : 'is-miss');
        slot.textContent = String(correctAt + 1);
        card.setAttribute('aria-label',
          `Sentence ${label}: the author placed it ${correctAt + 1}${hit ? ', where you placed it too' : placedAt === -1 ? '' : `, you placed it ${placedAt + 1}`}`);
        if (!hit && placedAt !== -1) {
          const yours = document.createElement('span');
          yours.className = 'yours';
          yours.textContent = `You placed this ${placedAt + 1}`;
          card.querySelector('.text').appendChild(yours);
        }
      } else {
        card.removeAttribute('disabled');
        if (placedAt === -1) {
          slot.textContent = '';
          card.setAttribute('aria-pressed', 'false');
          card.setAttribute('aria-label', `Sentence ${label}, not placed yet. Tap to place next.`);
        } else {
          card.classList.add('is-placed');
          slot.textContent = String(placedAt + 1);
          card.setAttribute('aria-pressed', 'true');
          card.setAttribute('aria-label', `Sentence ${label}, placed ${placedAt + 1}. Tap to take it back.`);
        }
      }
    }
  }
}

customElements.define('cat-jumble-board', CatJumbleBoard);
