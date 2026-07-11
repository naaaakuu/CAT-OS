/**
 * ps-session.js — the Para Summary practice engine. Pure logic (no
 * DOM, no storage): it walks a set of summary items, evaluates a
 * chosen option, and produces the same record shapes the app already
 * persists (STORES.SESSIONS / STORES.ATTEMPTS), so streaks, XP,
 * levels, achievements and backups work unchanged.
 *
 * Scoring: +3 for the best summary, 0 otherwise. Recent CAT cycles
 * have set Para Summary among the choice questions without negative
 * marking, but the scheme is announced per cycle (PARA SUMMARY BIBLE,
 * format assumption) — so the constants live here, visibly, and the
 * UI labels marks "CAT-style", never official. Each item also carries
 * format as data with a format_verified note.
 *
 * Beyond right/wrong, the engine records the learning behavior the
 * mentor reads: whether the learner wrote their own summary first
 * (the Summary Builder), what they wrote, and whether the Think coach
 * was opened — signals of process, never used to judge.
 */

export const PS_MARKS_CORRECT = 3;
export const PS_MARKS_WRONG = 0; // no negative marking; re-verified per cycle

/** Score over a set of answers ({is_correct} | null-skipped). */
export function computePSScore(answers) {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  for (const a of answers) {
    if (a.is_correct === true) correct += 1;
    else if (a.is_correct === false) wrong += 1;
    else skipped += 1;
  }
  const attempted = correct + wrong;
  return {
    total: answers.length,
    correct,
    wrong,
    skipped,
    attempted,
    accuracy: attempted === 0 ? 0 : correct / attempted,
    marks: correct * PS_MARKS_CORRECT + wrong * PS_MARKS_WRONG,
    max_marks: answers.length * PS_MARKS_CORRECT,
  };
}

export class PSSession {
  #items;
  #setId;
  #answers; // item id -> answer record
  #index = 0;
  #startedAt;
  #itemShownAt;

  /**
   * @param {Array} items  loaded PS content items, in play order
   * @param {string} setId what this session practiced (a tier id or one
   *                       item id) — stored as the session's passage_id
   *                       so existing engagement stats stay meaningful
   */
  constructor(items, setId, { now = () => Date.now() } = {}) {
    this.#items = items;
    this.#setId = setId;
    this.#answers = new Map();
    this.now = now;
    this.#startedAt = now();
    this.#itemShownAt = now();
    this.id = `session-${new Date(this.#startedAt).toISOString().replace(/[:.]/g, '-')}`;
  }

  get items() { return this.#items; }
  get index() { return this.#index; }
  get total() { return this.#items.length; }
  get current() { return this.#items[this.#index]; }
  get isLast() { return this.#index === this.total - 1; }

  markItemShown() { this.#itemShownAt = this.now(); }

  /**
   * Record the chosen option for the current item.
   * @param {string} chosen  the option letter
   * @param {{summary_written?: boolean, summary_text?: string|null,
   *          think_opened?: boolean}} [behavior]
   * @returns {{is_correct: boolean, correct: string}}
   */
  answer(chosen, behavior = {}) {
    const item = this.current;
    const correct = item.question.correct;
    const is_correct = chosen === correct;
    this.#answers.set(item.meta.id, {
      item_id: item.meta.id,
      chosen,
      is_correct,
      summary_written: !!behavior.summary_written,
      summary_text: behavior.summary_text ?? null,
      think_opened: !!behavior.think_opened,
      time_ms: this.now() - this.#itemShownAt,
    });
    return { is_correct, correct };
  }

  /** Set the current item aside (recorded as unanswered). */
  skip(behavior = {}) {
    const item = this.current;
    this.#answers.set(item.meta.id, {
      item_id: item.meta.id,
      chosen: null,
      is_correct: null,
      summary_written: !!behavior.summary_written,
      summary_text: behavior.summary_text ?? null,
      think_opened: !!behavior.think_opened,
      time_ms: this.now() - this.#itemShownAt,
    });
  }

  /** Advance. @returns {boolean} false when the set is finished. */
  next() {
    if (this.isLast) return false;
    this.#index += 1;
    this.#itemShownAt = this.now();
    return true;
  }

  answerFor(itemId) { return this.#answers.get(itemId) ?? null; }

  /** Finish and produce the persistable records. */
  finish() {
    const finishedAt = this.now();
    const ordered = this.#items.map((item) => ({
      // question_id keeps the RC session field name so every consumer
      // of stored sessions (stats, backups) reads one shape.
      question_id: item.meta.id,
      ...(this.#answers.get(item.meta.id) ?? {
        item_id: item.meta.id, chosen: null, is_correct: null,
        summary_written: false, summary_text: null, think_opened: false,
        time_ms: 0,
      }),
    }));
    const score = computePSScore(ordered);

    const session = {
      id: this.id,
      module: 'ps',
      passage_id: this.#setId,
      item_ids: this.#items.map((i) => i.meta.id),
      started_at: new Date(this.#startedAt).toISOString(),
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - this.#startedAt,
      score,
      answers: ordered,
    };

    const attempts = ordered.map((a) => ({
      id: `${this.id}:${a.question_id}`,
      session_id: this.id,
      module: 'ps',
      passage_id: this.#setId,
      question_id: a.question_id,
      chosen: a.chosen,
      is_correct: a.is_correct,
      time_ms: a.time_ms,
      answered_at: session.finished_at,
    }));

    return { session, attempts };
  }
}
