/**
 * <cat-explanation> — what you are told the moment after you answer.
 *
 * Rewritten around one rule: a learner who has just got a question wrong
 * will read four lines and will not read fourteen. Everything that used
 * to appear at once now appears in order of what actually changes their
 * next answer:
 *
 *   1. THE VERDICT     right or not, and what the answer was.
 *   2. THE TRAP        why the option THEY chose was built to tempt them.
 *                      This is first after a wrong answer, because it is
 *                      the one thing that changes the next one. A reader
 *                      who has just missed a question will read one box.
 *   3. WHY             one sentence on how a strong reader gets there.
 *   4. [Show the full working] — the reasoning in full, the evidence
 *      paragraph, every other distractor, and the habit worth keeping.
 *
 * Nothing is removed: the teardown that used to be mandatory is still
 * here, one tap away, for the learner who wants it. It is the default
 * that changed, because the default is what gets read.
 *
 * Presentation only: set `.data = { question, chosen }`.
 */

import { escapeHTML } from '../../core/utils/format.js';

/** Trap types, said as a reader would say them rather than as data. */
const TRAP_NAME = {
  /* The ten the corpus actually uses, in its own order of frequency. */
  opposite_direction: 'points the other way',
  out_of_scope: 'outside what the passage claims',
  extreme_language: 'too absolute',
  passage_language_shifted: 'the passage’s words, bent',
  wrong_structural_role: 'the right idea, the wrong job in the argument',
  true_but_irrelevant: 'true, but not what was asked',
  too_narrow: 'narrower than the passage',
  too_broad: 'wider than the passage',
  near_synonym_confusion: 'a near-synonym that changes the claim',
  half_right: 'right about half the passage',
  /* Older and verbal-module names, kept so nothing ever renders raw. */
  scope_shift: 'wider than the text',
  scope_creep: 'wider than the text',
  added_fact: 'a fact the passage never gives',
  reversal: 'the relationship backwards',
  detail_swap: 'the right detail, the wrong claim',
  opposite: 'the opposite of the author',
  out_of_context: 'lifted out of its context',
  partial: 'only part of the answer',
  distortion: 'the author’s point, bent',
  too_specific: 'narrower than the text',
  plausible_inference: 'a reasonable guess the text does not make',
  word_association: 'a word you recognise from the passage',
};

/** One sentence, at most — the rest is waiting behind the working. The cut
 *  has to read as a finished thought: an explanation that stops on a
 *  semicolon looks like a bug, not like brevity. */
function firstSentence(text, max = 190) {
  const t = String(text ?? '').trim();
  if (t.length <= max) return { head: t, rest: '' };
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(' — '));
  const at = stop > max * 0.45 ? stop + 1 : cut.lastIndexOf(' ');
  let head = t.slice(0, at).trim().replace(/[;,:—–-]+$/, '');
  const rest = t.slice(at).trim();
  if (head && !/[.!?]$/.test(head)) head += rest ? '…' : '.';
  return { head, rest };
}

class CatExplanation extends HTMLElement {
  #q = null;
  #chosen = null;

  set data({ question, chosen }) { this.#q = question; this.#chosen = chosen ?? null; this.#render(); }

  #render() {
    if (!this.#q) return;
    const q = this.#q;
    const ex = q.explanation ?? {};
    const chosen = this.#chosen;
    const correct = chosen === q.correct;
    const distractors = ex.distractors ?? [];
    const mine = distractors.find((d) => d.option === chosen) ?? null;
    const others = distractors.filter((d) => d.option !== chosen);
    const habit = ex.reading_habit ?? ex.question_type_note ?? '';
    // A wrong answer already has the trap to read; the "why" beside it is
    // a short second line, not a paragraph. A right answer has no trap, so
    // the reasoning is the whole of what is worth reading.
    const why = firstSentence(ex.correct_reasoning, correct ? 200 : 130);

    const WHY_HTML = why.head ? `
        <div class="block">
          <div class="label">${correct ? 'Why' : 'Why ' + escapeHTML(q.correct) + ' is right'}</div>
          <p>${escapeHTML(why.head)}</p>
        </div>` : '';
    const TRAP_HTML = mine ? `
        <div class="block trap">
          <div class="label">The trap</div>
          ${mine.trap_type ? `<span class="trap__kind">${escapeHTML(TRAP_NAME[mine.trap_type] ?? String(mine.trap_type).replaceAll('_', ' '))}</span>` : ''}
          <p>${escapeHTML(mine.why_wrong)}</p>
        </div>` : '';

    this.innerHTML = `
      <style>
        cat-explanation { display: block; margin-top: var(--space-4); }
        cat-explanation .verdict {
          display: flex; align-items: baseline; gap: var(--space-3); flex-wrap: wrap;
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--color-line);
          margin-bottom: var(--space-4);
        }
        cat-explanation .verdict__word {
          font-family: var(--font-display, inherit);
          font-size: var(--text-xl); font-weight: var(--weight-bold);
          letter-spacing: -0.01em; line-height: 1;
        }
        cat-explanation .verdict.is-correct .verdict__word { color: var(--color-correct-ink); }
        cat-explanation .verdict.is-wrong   .verdict__word { color: var(--color-wrong-ink); }
        cat-explanation .verdict__answer { font-size: var(--text-sm); color: var(--color-ink-2); }
        cat-explanation .verdict__answer b { color: var(--color-ink); }
        cat-explanation .block { margin-bottom: var(--space-4); }
        cat-explanation .label {
          font-size: var(--text-2xs); font-weight: var(--weight-bold);
          letter-spacing: var(--tracking-wide); text-transform: uppercase;
          color: var(--color-ink-3); margin-bottom: var(--space-1);
        }
        cat-explanation p { margin: 0; font-size: var(--text-base); line-height: 1.55; color: var(--color-ink); }
        cat-explanation .trap { padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--color-wrong-subtle, rgba(190, 80, 50, 0.08)); }
        cat-explanation .trap .label { color: var(--color-wrong-ink); }
        cat-explanation .trap__kind {
          display: inline-block; margin-bottom: var(--space-1);
          font-size: var(--text-xs); font-weight: var(--weight-semibold);
          color: var(--color-wrong-ink);
        }
        cat-explanation .more {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: var(--space-1);
          font: inherit; font-size: var(--text-sm); font-weight: var(--weight-semibold);
          color: var(--color-accent); background: none; border: 0;
          padding: var(--space-2) 0; cursor: pointer;
        }
        cat-explanation .more::after { content: "▾"; font-size: 10px; transition: transform var(--duration-fast) var(--ease-out); }
        cat-explanation .more[aria-expanded="true"]::after { transform: rotate(180deg); }
        cat-explanation .working { margin-top: var(--space-2); }
        cat-explanation .working[hidden] { display: none; }
        cat-explanation .evidence {
          font: inherit; font-size: var(--text-xs); font-weight: var(--weight-semibold);
          color: var(--color-accent); background: none; border: 0;
          padding: var(--space-2) 0; cursor: pointer; text-align: left;
        }
        cat-explanation .distractor { padding: var(--space-3) 0; border-top: 1px solid var(--color-line); }
        cat-explanation .distractor__head { display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px; }
        cat-explanation .distractor__letter {
          width: 1.35rem; height: 1.35rem; flex: none;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius-full); background: var(--color-surface-2);
          font-size: var(--text-2xs); font-weight: var(--weight-bold); color: var(--color-ink-2);
        }
        cat-explanation .distractor__trap { font-size: var(--text-xs); color: var(--color-ink-3); }
        cat-explanation .distractor p { font-size: var(--text-sm); color: var(--color-ink-2); }
        cat-explanation .habit {
          display: flex; gap: var(--space-3);
          padding: var(--space-4); border-radius: var(--radius-md);
          background: var(--color-accent-subtle); margin-top: var(--space-3);
        }
        cat-explanation .habit__glyph {
          flex: none; width: 1.9rem; height: 1.9rem;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius-full);
          background: var(--color-accent); color: var(--color-accent-ink); font-size: var(--text-xs);
        }
        cat-explanation .habit__label {
          font-size: var(--text-2xs); font-weight: var(--weight-bold);
          letter-spacing: var(--tracking-wide); text-transform: uppercase;
          color: var(--color-accent); margin-bottom: 2px;
        }
        cat-explanation .habit p { font-size: var(--text-sm); }
      </style>

      <div class="verdict ${correct ? 'is-correct' : 'is-wrong'}">
        <span class="verdict__word">${correct ? 'Correct' : chosen === null ? 'Skipped' : 'Not quite'}</span>
        <span class="verdict__answer">${correct
          ? `The answer is <b>${escapeHTML(q.correct)}</b>.`
          : chosen === null
            ? `The answer is <b>${escapeHTML(q.correct)}</b>.`
            : `You chose ${escapeHTML(chosen)}. The answer is <b>${escapeHTML(q.correct)}</b>.`}</span>
      </div>

      ${correct ? '' : TRAP_HTML}${WHY_HTML}${correct ? TRAP_HTML : ''}

      <button type="button" class="more" id="more" aria-expanded="false" aria-controls="working">Show the full working</button>
      <div class="working" id="working" hidden>
        ${why.rest ? `<div class="block"><p>${escapeHTML(why.rest)}</p></div>` : ''}
        ${ex.passage_anchor ? `<button type="button" class="evidence" data-anchor="${escapeHTML(ex.passage_anchor)}">¶ Re-read the evidence</button>` : ''}
        ${mine?.seductive_element ? `<div class="block"><div class="label">Why it felt right</div><p style="font-size:var(--text-sm);color:var(--color-ink-2)">${escapeHTML(mine.seductive_element)}</p></div>` : ''}
        ${others.length ? `
          <div class="block">
            <div class="label">The other options</div>
            ${others.map((d) => `
              <div class="distractor">
                <div class="distractor__head">
                  <span class="distractor__letter">${escapeHTML(d.option)}</span>
                  <span class="distractor__trap">${escapeHTML(TRAP_NAME[d.trap_type] ?? String(d.trap_type ?? '').replaceAll('_', ' '))}</span>
                </div>
                <p>${escapeHTML(d.why_wrong)}</p>
              </div>`).join('')}
          </div>` : ''}
        ${habit ? `
          <div class="habit">
            <span class="habit__glyph" aria-hidden="true">◎</span>
            <div>
              <div class="habit__label">Make it a habit</div>
              <p>${escapeHTML(habit)}</p>
            </div>
          </div>` : ''}
      </div>
    `;

    const more = this.querySelector('#more');
    const working = this.querySelector('#working');
    more?.addEventListener('click', () => {
      const open = more.getAttribute('aria-expanded') === 'true';
      more.setAttribute('aria-expanded', String(!open));
      working.hidden = open;
      more.firstChild.textContent = open ? 'Show the full working' : 'Hide the working';
    });
  }
}

customElements.define('cat-explanation', CatExplanation);
