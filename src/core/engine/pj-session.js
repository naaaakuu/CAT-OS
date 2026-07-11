/**
 * pj-session.js — the Para Jumbles practice engine. Pure logic (no DOM,
 * no storage): it walks a set of jumble items, evaluates an entered
 * sequence against the correct order, and produces the same record
 * shapes the app already persists (STORES.SESSIONS / STORES.ATTEMPTS),
 * so streaks, XP, levels and backups work unchanged.
 *
 * Scoring is TITA (PARA_JUMBLES_BIBLE §1): +3 for a correct sequence,
 * 0 for a wrong one — no negative marking. The Bible flags this as a
 * per-cycle convention, so the constants live here, visibly, not
 * scattered. Labeled "CAT-style marks" in the UI, never official.
 *
 * Beyond right/wrong, the engine reports PARTIAL structure — which
 * adjacent links and which positions the learner had — because a
 * sequence that is "wrong" for CAT can still be three-quarters
 * understood, and the teaching layer builds on exactly that.
 */

export const PJ_MARKS_CORRECT = 3;
export const PJ_MARKS_WRONG = 0; // TITA: no negative marking

/**
 * Evaluate one entered sequence against an item's correct order.
 * @param {string[]} entered  presentation labels in the learner's order
 * @param {string[]} correct  the item's correct_order
 * @returns {{is_correct: boolean, positions_correct: number,
 *            links: Array<{from: string, to: string, correct: boolean}>,
 *            links_correct: number}}
 */
export function evaluateSequence(entered, correct) {
  const is_correct = entered.length === correct.length
    && entered.every((l, i) => l === correct[i]);

  let positions_correct = 0;
  for (let i = 0; i < correct.length; i += 1) {
    if (entered[i] === correct[i]) positions_correct += 1;
  }

  // A link is an adjacency the author actually wrote. The learner
  // "has" it when the same pair sits adjacent, same direction.
  const links = [];
  let links_correct = 0;
  for (let i = 0; i < correct.length - 1; i += 1) {
    const from = correct[i];
    const to = correct[i + 1];
    const at = entered.indexOf(from);
    const got = at !== -1 && entered[at + 1] === to;
    if (got) links_correct += 1;
    links.push({ from, to, correct: got });
  }

  return { is_correct, positions_correct, links, links_correct };
}

/** TITA score over a set of answers ({is_correct} | null-skipped). */
export function computePJScore(answers) {
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
    marks: correct * PJ_MARKS_CORRECT + wrong * PJ_MARKS_WRONG,
    max_marks: answers.length * PJ_MARKS_CORRECT,
  };
}

export class PJSession {
  #items;
  #setId;
  #answers; // item id -> answer record
  #index = 0;
  #startedAt;
  #itemShownAt;

  /**
   * @param {Array} items  loaded PJ content items, in play order
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
   * Record the entered sequence for the current item.
   * @param {string[]} entered  labels in the learner's order
   * @param {{revised?: boolean, read_back_ms?: number}} [behavior]
   *        revised: the learner changed a placed order before locking;
   *        read_back_ms: time between assembling all sentences and
   *        locking in — the verification window (Bible: premature
   *        closure shows up as a near-zero read-back).
   * @returns the evaluation verdict
   */
  answer(entered, behavior = {}) {
    const item = this.current;
    const verdict = evaluateSequence(entered, item.correct_order);
    this.#answers.set(item.meta.id, {
      item_id: item.meta.id,
      entered: [...entered],
      is_correct: verdict.is_correct,
      positions_correct: verdict.positions_correct,
      links_correct: verdict.links_correct,
      revised: !!behavior.revised,
      read_back_ms: Math.max(0, behavior.read_back_ms ?? 0),
      time_ms: this.now() - this.#itemShownAt,
    });
    return verdict;
  }

  /** Set the current item aside (recorded as unanswered). */
  skip() {
    const item = this.current;
    this.#answers.set(item.meta.id, {
      item_id: item.meta.id,
      entered: null,
      is_correct: null,
      positions_correct: 0,
      links_correct: 0,
      revised: false,
      read_back_ms: 0,
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
        item_id: item.meta.id, entered: null, is_correct: null,
        positions_correct: 0, links_correct: 0, revised: false,
        read_back_ms: 0, time_ms: 0,
      }),
    }));
    const score = computePJScore(ordered);

    const session = {
      id: this.id,
      module: 'pj',
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
      module: 'pj',
      passage_id: this.#setId,
      question_id: a.question_id,
      chosen: a.entered ? a.entered.join('') : null,
      is_correct: a.is_correct,
      time_ms: a.time_ms,
      answered_at: session.finished_at,
    }));

    return { session, attempts };
  }
}
