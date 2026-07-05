/**
 * <cat-question-card> — one question: stem + its four <cat-option>s.
 *
 * Presentation only. Set `.question`, optionally `.reveal` (an object
 * {chosen, correct} to show the verdict coloring), and listen for the
 * bubbled `cat-option-select` event. Holds no correctness logic
 * beyond mapping the reveal object to option states.
 */

import { escapeHTML } from '../../core/utils/format.js';
import './cat-option.js';

const LETTERS = ['A', 'B', 'C', 'D'];

class CatQuestionCard extends HTMLElement {
  #question = null;
  #selected = null;
  #reveal = null;

  set question(q) { this.#question = q; this.#selected = null; this.#reveal = null; this.#render(); }
  set selected(letter) { this.#selected = letter; this.#sync(); }
  /** @param {{chosen: string|null, correct: string}|null} r */
  set reveal(r) { this.#reveal = r; this.#sync(); }

  #render() {
    if (!this.#question) return;
    const q = this.#question;
    this.innerHTML = `
      <style>
        cat-question-card { display: block; }
        cat-question-card .stem {
          font-size: var(--text-base);
          font-weight: var(--weight-semibold);
          margin-bottom: var(--space-3);
        }
        cat-question-card .qtype {
          font-size: var(--text-2xs);
          font-weight: var(--weight-bold);
          letter-spacing: var(--tracking-wide);
          text-transform: uppercase;
          color: var(--color-ink-3);
          margin-bottom: var(--space-2);
        }
      </style>
      <p class="qtype">${escapeHTML(q.type.replaceAll('_', ' '))}</p>
      <p class="stem">${escapeHTML(q.stem)}</p>
      ${LETTERS.map((l) => `
        <cat-option letter="${l}" text="${escapeHTML(q.options[l])}"></cat-option>
      `).join('')}
    `;
    this.#sync();
  }

  #sync() {
    if (!this.#question) return;
    for (const opt of this.querySelectorAll('cat-option')) {
      const letter = opt.getAttribute('letter');
      let state = '';
      if (this.#reveal) {
        opt.setAttribute('disabled', '');
        if (letter === this.#reveal.correct) state = 'correct';
        else if (letter === this.#reveal.chosen) state = 'wrong';
        else state = 'dimmed';
      } else if (letter === this.#selected) {
        state = 'selected';
      }
      opt.setAttribute('state', state);
    }
  }
}

customElements.define('cat-question-card', CatQuestionCard);
