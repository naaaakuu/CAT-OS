/**
 * ooo-session.js — the Odd One Out practice engine. Pure logic (no
 * DOM, no storage): it walks a set of items, evaluates an excluded
 * sentence against the item's outlier, and produces the same record
 * shapes the app already persists (STORES.SESSIONS / STORES.ATTEMPTS),
 * so streaks, XP, levels, achievements and backups work unchanged.
 *
 * Scoring is TITA (ODD_MAN_OUT_BIBLE §1): +3 for the correct exclusion,
 * 0 otherwise, no negative marking, which makes the type always
 * positive expected value to attempt. The Bible flags marking as a per
 * cycle convention, so the constants live here, visibly, and the UI
 * labels marks CAT style, never official.
 *
 * Beyond right/wrong, the engine records the learning behavior the
 * mentor reads: the paragraph the learner BUILT in construct mode (the
 * Paragraph Builder — construction before elimination, Bible §7), how
 * many of the author's three joins that build contained, whether the
 * Think coach was opened, and the read back window before locking.
 */

export const OOO_MARKS_CORRECT = 3;
export const OOO_MARKS_WRONG = 0; // TITA: no negative marking; re-verified per cycle

/**
 * Evaluate a built core paragraph against the author's core order.
 * Wrong-for-CAT can still be three quarters understood: the teaching
 * layer builds on which joins and seats the learner had.
 * @param {string[]} built     labels in the learner's built order (4)
 * @param {string[]} coreOrder the item's core_order
 * @returns {{links_correct: number, positions_correct: number}}
 */
export function evaluateBuild(built, coreOrder) {
  let positions_correct = 0;
  for (let i = 0; i < coreOrder.length; i += 1) {
    if (built[i] === coreOrder[i]) positions_correct += 1;
  }
  let links_correct = 0;
  for (let i = 0; i < coreOrder.length - 1; i += 1) {
    const at = built.indexOf(coreOrder[i]);
    if (at !== -1 && built[at + 1] === coreOrder[i + 1]) links_correct += 1;
  }
  return { links_correct, positions_correct };
}

/** TITA score over a set of answers ({is_correct} | null-skipped). */
export function computeOOOScore(answers) {
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
    marks: correct * OOO_MARKS_CORRECT + wrong * OOO_MARKS_WRONG,
    max_marks: answers.length * OOO_MARKS_CORRECT,
  };
}

export class OOOSession {
  #items;
  #setId;
  #answers; // item id -> answer record
  #index = 0;
  #startedAt;
  #itemShownAt;

  /**
   * @param {Array} items  loaded OOO content items, in play order
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
   * Record the excluded sentence for the current item.
   * @param {string} chosen  the label the learner excluded
   * @param {{built?: string[]|null, think_opened?: boolean,
   *          revised?: boolean, read_back_ms?: number}} [behavior]
   *        built: the four labels the learner arranged in construct
   *        mode (null when solving in exam mode);
   *        read_back_ms: time between the choice existing and locking
   *        in — the verification window (Bible §7: premature closure
   *        shows up as a near zero read back).
   * @returns {{is_correct: boolean, correct: string,
   *            links_correct: number, positions_correct: number}}
   */
  answer(chosen, behavior = {}) {
    const item = this.current;
    const is_correct = chosen === item.outlier;
    const built = Array.isArray(behavior.built) ? [...behavior.built] : null;
    const build = built ? evaluateBuild(built, item.core_order)
      : { links_correct: 0, positions_correct: 0 };
    this.#answers.set(item.meta.id, {
      item_id: item.meta.id,
      chosen,
      is_correct,
      built,
      build_links_correct: build.links_correct,
      build_positions_correct: build.positions_correct,
      think_opened: !!behavior.think_opened,
      revised: !!behavior.revised,
      read_back_ms: Math.max(0, behavior.read_back_ms ?? 0),
      time_ms: this.now() - this.#itemShownAt,
    });
    return { is_correct, correct: item.outlier, ...build };
  }

  /** Set the current item aside (recorded as unanswered). */
  skip(behavior = {}) {
    const item = this.current;
    this.#answers.set(item.meta.id, {
      item_id: item.meta.id,
      chosen: null,
      is_correct: null,
      built: Array.isArray(behavior.built) ? [...behavior.built] : null,
      build_links_correct: 0,
      build_positions_correct: 0,
      think_opened: !!behavior.think_opened,
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
        item_id: item.meta.id, chosen: null, is_correct: null,
        built: null, build_links_correct: 0, build_positions_correct: 0,
        think_opened: false, revised: false, read_back_ms: 0, time_ms: 0,
      }),
    }));
    const score = computeOOOScore(ordered);

    const session = {
      id: this.id,
      module: 'ooo',
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
      module: 'ooo',
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
