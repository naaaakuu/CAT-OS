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

  /** The reading screen calls this when questions become visible,
   *  so reading time isn't billed to question 1. */
  markQuestionShown() { this.#questionShownAt = this.now(); }

  /** Record the chosen option for the current question.
   *  @returns {{is_correct: boolean, correct: string}} immediate verdict. */
  answer(option) {
    const q = this.current;
    const is_correct = option === q.correct;
    this.#answers.set(q.id, {
      chosen: option,
      is_correct,
      time_ms: this.now() - this.#questionShownAt,
    });
    return { is_correct, correct: q.correct };
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

  /** Finish and produce the persistable records. */
  finish() {
    const finishedAt = this.now();
    const ordered = this.#passage.questions.map((q) => ({
      question_id: q.id,
      ...(this.#answers.get(q.id) ?? { chosen: null, is_correct: null, time_ms: 0 }),
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
      chosen: a.chosen,
      is_correct: a.is_correct,
      time_ms: a.time_ms,
      answered_at: session.finished_at,
    }));

    return { session, attempts };
  }
}
