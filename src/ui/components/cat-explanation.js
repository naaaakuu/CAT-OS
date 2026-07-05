/**
 * <cat-explanation> — not an answer key: a reading lesson.
 *
 * Redesigned in 0.6.0 around one intention — teach how an expert
 * reader THINKS, so every explanation transfers to the next passage:
 *
 *   1. The verdict, stated plainly (information, never judgment).
 *   2. "How a strong reader gets there" — the reasoning path, with a
 *      one-tap jump to the evidence paragraph (re-anchoring).
 *   3. The distractor teardown — why each wrong option was built to
 *      tempt you, named by trap type.
 *   4. "Make it a habit" — the one reading habit this question
 *      practices, worth keeping forever (v3 content; falls back to
 *      the question-type note for older items).
 *
 * Presentation only: set `.data = { question, chosen }`.
 */

import { escapeHTML } from '../../core/utils/format.js';

class CatExplanation extends HTMLElement {
  #q = null;
  #chosen = null;

  set data({ question, chosen }) { this.#q = question; this.#chosen = chosen ?? null; this.#render(); }

  #render() {
    if (!this.#q) return;
    const q = this.#q;
    const ex = q.explanation;
    const chosen = this.#chosen;
    const correct = chosen === q.correct;
    const verdict = chosen === null
      ? { cls: '', text: `Skipped — the answer is ${q.correct}` }
      : correct
        ? { cls: 'is-correct', text: `Correct — ${q.correct}` }
        : { cls: 'is-wrong', text: `Not this time — the answer is ${q.correct}, you chose ${chosen}` };
    const habit = ex.reading_habit ?? ex.question_type_note;

    this.innerHTML = `
      <style>
        cat-explanation {
          display: block;
          font-size: var(--text-sm);
          margin-top: var(--space-4);
          padding-top: var(--space-4);
          border-top: 1px solid var(--color-line);
          animation: explanation-in var(--duration-slow) var(--ease-out) both;
        }
        @keyframes explanation-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: none; }
        }
        cat-explanation .verdict-line {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: var(--weight-bold);
          font-size: var(--text-sm);
          margin-bottom: var(--space-4);
          color: var(--color-ink-2);
        }
        cat-explanation .verdict-line.is-correct { color: var(--color-correct-ink); }
        cat-explanation .verdict-line.is-wrong   { color: var(--color-wrong-ink); }
        cat-explanation .block { margin-bottom: var(--space-5); }
        cat-explanation .block:last-child { margin-bottom: 0; }
        cat-explanation .label {
          font-size: var(--text-2xs);
          font-weight: var(--weight-bold);
          letter-spacing: var(--tracking-wide);
          text-transform: uppercase;
          color: var(--color-ink-3);
          margin-bottom: var(--space-2);
        }
        cat-explanation .evidence {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          min-height: calc(var(--tap-target) - 12px);
          padding: var(--space-1) var(--space-3);
          border: 1px solid var(--color-line-strong);
          border-radius: var(--radius-full);
          background: var(--color-surface);
          color: var(--color-accent);
          font-size: var(--text-xs);
          font-weight: var(--weight-semibold);
          cursor: pointer;
          transition: background-color var(--duration-fast) var(--ease-out),
                      transform var(--duration-fast) var(--ease-out);
        }
        @media (hover: hover) {
          cat-explanation .evidence:hover { background: var(--color-surface-2); }
        }
        cat-explanation .evidence:active { transform: scale(var(--press-scale)); }
        cat-explanation .distractor {
          padding: var(--space-3);
          border: 1px solid var(--color-line);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-2);
          background: var(--color-surface);
        }
        cat-explanation .distractor.is-chosen {
          border-color: var(--color-wrong-ink);
          background: var(--color-wrong-bg);
        }
        cat-explanation .distractor__head {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-1);
        }
        cat-explanation .distractor__letter {
          flex: none;
          width: 1.4rem; height: 1.4rem;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius-full);
          background: var(--color-surface-2);
          font-size: var(--text-2xs);
          font-weight: var(--weight-bold);
        }
        cat-explanation .distractor.is-chosen .distractor__letter {
          background: var(--color-wrong-ink);
          color: var(--color-wrong-bg);
        }
        cat-explanation .distractor__trap {
          font-size: var(--text-2xs);
          font-weight: var(--weight-semibold);
          letter-spacing: var(--tracking-wide);
          text-transform: uppercase;
          color: var(--color-ink-3);
        }
        cat-explanation .distractor__yours {
          font-size: var(--text-2xs);
          font-weight: var(--weight-semibold);
          color: var(--color-wrong-ink);
          margin-left: auto;
        }
        cat-explanation .distractor p { margin: 0; }
        cat-explanation .distractor .lure {
          color: var(--color-ink-3);
          font-size: var(--text-xs);
          margin-top: var(--space-1);
        }
        cat-explanation .habit {
          display: flex;
          gap: var(--space-3);
          padding: var(--space-4);
          border-radius: var(--radius-md);
          background: var(--color-accent-subtle);
        }
        cat-explanation .habit__glyph {
          flex: none;
          width: 1.9rem; height: 1.9rem;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius-full);
          background: var(--color-accent);
          color: var(--color-accent-ink);
          font-size: var(--text-xs);
        }
        cat-explanation .habit__label {
          font-size: var(--text-2xs);
          font-weight: var(--weight-bold);
          letter-spacing: var(--tracking-wide);
          text-transform: uppercase;
          color: var(--color-accent);
          margin-bottom: 2px;
        }
        cat-explanation .habit p {
          margin: 0;
          font-size: var(--text-sm);
          color: var(--color-ink);
        }
      </style>
      <div class="verdict-line ${verdict.cls}">${escapeHTML(verdict.text)}</div>
      <div class="block">
        <div class="label">How a strong reader gets there</div>
        <p>${escapeHTML(ex.correct_reasoning)}</p>
        <button type="button" class="evidence" data-anchor="${escapeHTML(ex.passage_anchor)}">
          ¶ Re-read the evidence</button>
      </div>
      <div class="block">
        <div class="label">Why the others were built to tempt you</div>
        ${ex.distractors.map((d) => `
          <div class="distractor ${d.option === chosen ? 'is-chosen' : ''}">
            <div class="distractor__head">
              <span class="distractor__letter">${escapeHTML(d.option)}</span>
              <span class="distractor__trap">${escapeHTML(d.trap_type.replaceAll('_', ' '))}</span>
              ${d.option === chosen ? '<span class="distractor__yours">your answer</span>' : ''}
            </div>
            <p>${escapeHTML(d.why_wrong)}</p>
            <p class="lure">Feels right because: ${escapeHTML(d.seductive_element)}</p>
          </div>`).join('')}
      </div>
      <div class="block">
        <div class="habit">
          <span class="habit__glyph" aria-hidden="true">◎</span>
          <div>
            <div class="habit__label">Make it a habit</div>
            <p>${escapeHTML(habit)}</p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('cat-explanation', CatExplanation);
