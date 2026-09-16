/**
 * session.js — the practice-session engine. Pure logic (no DOM,
 * no storage): it walks a passage's questions, records answers with
 * per-question timing, and produces the two record shapes the app
 * persists through the StorageAdapter:
 *
 *   session record  → STORES.SESSIONS (one per completed session)
 *   attempt records → STORES.ATTEMPTS (one per answered question)
 *
 * Screens drive it; core/storage persists its output. Keeping it pure
 * makes it trivially reusable by future modes (timed full-VARC, mock
 * engine) and testable offline in tools/verify.mjs.
 */

import { computeScore } from './scoring.js';
import { RC_TYPE_SKILL } from '../learning/taxonomy.js';

/* A loaded passage keeps its id at meta.id. finish() has always known
   that; anything else that needs to name the passage has to agree with it,
   or two different passages end up sharing one identity. */
import { elapsedMs } from './draft-shape.js';

export const passageId = (p) => p?.meta?.id ?? p?.id ?? null;

export class PracticeSession {
  #passage;
  #answers;          // qid -> { chosen, is_correct, time_ms }
  #index = 0;
  #startedAt;
  #questionShownAt;

  constructor(passage, { now = () => Date.now() } = {}) {
    this.#passage = passage;
    this.#answers = new Map();
    this.now = now;
    this.#startedAt = now();
    this.#questionShownAt = now();
    // A session id is time-based: unique per device, sortable, and
    // meaningless beyond identity (ids never encode data).
    this.id = `session-${new Date(this.#startedAt).toISOString().replace(/[:.]/g, '-')}`;
  }

  get passage() { return this.#passage; }
  get index() { return this.#index; }
  get total() { return this.#passage.questions.length; }
  get current() { return this.#passage.questions[this.#index]; }
  get isLast() { return this.#index === this.total - 1; }
  /** When the run began. After a restore this is the moment it WOULD have
   *  begun had the interruption not happened, so the timer and the record
   *  both count only the time actually spent on the set. */
  get startedAt() { return this.#startedAt; }

  /** The reading screen calls this when questions become visible,
   *  so reading time isn't billed to question 1. */
  markQuestionShown() { this.#questionShownAt = this.now(); }

  /** Record the chosen option for the current question.
   *  @returns {{is_correct: boolean, correct: string}} immediate verdict. */
  answer(option) {
    const q = this.current;
    const is_correct = option === q.correct;
    // The trap the chosen distractor was built from travels with the
    // answer, so the ledger can say WHICH pull keeps working — "scope"
    // rather than "question 3" — without reopening the passage.
    const trap = is_correct ? null : (q.explanation?.distractors?.find((d) => d.option === option)?.trap_type ?? null);
    this.#answers.set(q.id, {
      chosen: option,
      is_correct,
      trap,
      time_ms: this.now() - this.#questionShownAt,
    });
    return { is_correct, correct: q.correct, trap };
  }

  /** Skip the current question (recorded as unanswered). */
  skip() {
    const q = this.current;
    this.#answers.set(q.id, {
      chosen: null,
      is_correct: null,
      time_ms: this.now() - this.#questionShownAt,
    });
  }

  /** Advance to the next question. @returns {boolean} false if finished. */
  next() {
    if (this.isLast) return false;
    this.#index += 1;
    this.#questionShownAt = this.now();
    return true;
  }

  answerFor(qid) { return this.#answers.get(qid) ?? null; }

  /* WHERE THE LEARNER IS, WRITTEN DOWN.
     A session used to persist nothing at all until the very last click:
     seven questions answered, the eighth locked in, and a refresh — or a
     phone backgrounding the tab long enough for the browser to discard it,
     or a deploy landing mid-read — threw the whole thing away with no word.
     The learner came back to a passage marked "not read yet", having read
     it. These two are what core/learning/draft.js writes between answers. */
  snapshot() {
    return {
      id: this.id,
      passage_id: passageId(this.#passage),
      index: this.#index,
      elapsed_ms: Math.max(0, this.now() - this.#startedAt),
      answers: [...this.#answers],
    };
  }

  /** Put them back. Returns false if the draft belongs to another passage or
   *  holds nothing worth restoring; unknown question ids are dropped, so an
   *  edited passage can shorten a draft but never break one. */
  restore(snap) {
    const mine = passageId(this.#passage);
    if (!snap || !mine || snap.passage_id !== mine) return false;
    const known = new Set(this.#passage.questions.map((q) => q.id));
    const answers = (Array.isArray(snap.answers) ? snap.answers : []).filter((e) => Array.isArray(e) && known.has(e[0]));
    if (!answers.length) return false;
    this.#answers = new Map(answers);
    this.#index = Math.min(Math.max(0, Number(snap.index) || 0), this.total - 1);
    this.#startedAt = this.now() - elapsedMs(snap);
    if (typeof snap.id === 'string' && snap.id) this.id = snap.id;
    this.#questionShownAt = this.now();
    return true;
  }

  /** Finish and produce the persistable records. */
  finish() {
    const finishedAt = this.now();
    // `type` travels with the answer so the curator can learn which kinds
    // of question the reader is weak at without re-loading every passage.
    const ordered = this.#passage.questions.map((q) => ({
      question_id: q.id,
      type: q.type ?? null,
      // v5 questions name the ledger skill and the reasoning patterns they
      // exercise; older ones are mapped from their type by the ledger.
      skill: q.skill ?? RC_TYPE_SKILL[q.type] ?? null,
      patterns: q.patterns ?? [],
      ...(this.#answers.get(q.id) ?? { chosen: null, is_correct: null, trap: null, time_ms: 0 }),
    }));
    const score = computeScore(ordered);

    const session = {
      id: this.id,
      passage_id: this.#passage.meta.id,
      started_at: new Date(this.#startedAt).toISOString(),
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - this.#startedAt,
      score,
      answers: ordered,
    };

    const attempts = ordered.map((a) => ({
      id: `${this.id}:${a.question_id}`,   // unique + traceable
      session_id: this.id,
      passage_id: this.#passage.meta.id,
      question_id: a.question_id,
      type: a.type ?? null,
      chosen: a.chosen,
      is_correct: a.is_correct,
      time_ms: a.time_ms,
      answered_at: session.finished_at,
    }));

    return { session, attempts };
  }
}
