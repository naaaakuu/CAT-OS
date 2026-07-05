/**
 * <cat-passage> — the reading surface, and therefore the product
 * (PRODUCT_BLUEPRINT: reading is a first-class feature). Redesigned
 * in 0.6.0 against the best reading software (Kindle, Apple Books,
 * Medium, Readwise Reader): a book-width column, serif set at the
 * user's chosen reading size, unhurried leading, paragraph rhythm
 * that breathes, hyphenation on narrow screens, numerals hung in
 * the margin where the column allows, and a quiet end-mark so the
 * reader always knows the text is finished.
 *
 * Presentation only: set `.passage = {title, paragraphs}` and it
 * renders. No logic, no storage.
 */

import { escapeHTML } from '../../core/utils/format.js';

class CatPassage extends HTMLElement {
  #passage = null;

  set passage(p) { this.#passage = p; this.#render(); }

  /** Scroll to a paragraph and flash it — the explanation→evidence jump.
   *  Learning rationale: re-anchoring a claim in the exact source text is
   *  where transfer happens; making it one tap removes the friction. */
  highlight(paragraphId) {
    const el = this.querySelector(`#${CSS.escape(paragraphId)}`);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('p-flash');
    void el.offsetWidth; // restart the animation if re-triggered
    el.classList.add('p-flash');
    return true;
  }

  #render() {
    if (!this.#passage) return;
    const { title, paragraphs } = this.#passage;
    this.innerHTML = `
      <style>
        cat-passage {
          display: block;
          max-width: var(--measure-read);
          margin: 0 auto;
        }
        cat-passage .p-title {
          font-family: var(--font-reading);
          font-size: clamp(var(--text-xl), 4.5vw + 1rem, var(--text-3xl));
          font-weight: var(--weight-bold);
          letter-spacing: var(--tracking-tight);
          line-height: var(--leading-tight);
          margin: var(--space-3) 0 var(--space-6);
          text-wrap: balance;
        }
        cat-passage .p-body p {
          position: relative;
          font-family: var(--font-reading);
          font-size: var(--text-read);
          line-height: var(--leading-reading);
          margin: 0 0 var(--para-space);
          text-wrap: pretty;
          -webkit-hyphens: auto;
          hyphens: auto;
          hyphenate-limit-chars: 7 4 3;
          scroll-margin-top: 5rem; /* evidence jumps clear the sticky bar */
        }
        @media (min-width: 34rem) {
          /* Wider columns don't need hyphenation to look composed. */
          cat-passage .p-body p { -webkit-hyphens: manual; hyphens: manual; }
        }
        /* Paragraph numerals hang quietly in the margin where the
           column allows; inline and subtle on narrow phones. */
        cat-passage .p-num {
          color: var(--color-ink-3);
          font-family: var(--font-ui);
          font-size: var(--text-2xs);
          font-variant-numeric: tabular-nums;
          user-select: none;
          -webkit-user-select: none;
          margin-right: var(--space-2);
        }
        @media (min-width: 46rem) {
          cat-passage .p-num {
            position: absolute;
            left: -2rem;
            top: 0.45em;
            margin: 0;
          }
        }
        /* The end-mark: the book tells you the chapter is over. */
        cat-passage .p-fin {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin: var(--space-6) 0 var(--space-2);
          color: var(--color-ink-3);
        }
        cat-passage .p-fin::before,
        cat-passage .p-fin::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--color-line);
        }
        cat-passage .p-fin span {
          font-size: var(--text-xs);
          line-height: 1;
          letter-spacing: 0.4em;
          margin-right: -0.4em; /* optically recenter the tracked glyphs */
          user-select: none;
          -webkit-user-select: none;
        }
      </style>
      <h1 class="p-title">${escapeHTML(title)}</h1>
      <div class="p-body">
        ${paragraphs.map((p, i) => `
          <p id="${escapeHTML(p.id)}">
            <span class="p-num" aria-hidden="true">${i + 1}</span>${escapeHTML(p.text)}
          </p>`).join('')}
      </div>
      <div class="p-fin" aria-hidden="true"><span>◆</span></div>
    `;
  }
}

customElements.define('cat-passage', CatPassage);
