/**
 * wd-session.js — the Word DNA practice engine. Pure logic (no DOM, no
 * storage): it walks a set of units (roots, prefixes, suffixes, foreign
 * groups, or CAT-vocabulary sets), evaluates the Predict and Apply
 * choices against each unit's discovery data, and produces the same
 * record shapes the app already persists (STORES.SESSIONS /
 * STORES.ATTEMPTS), so streaks, XP, levels and backups work unchanged.
 *
 * Word DNA is not a CAT question type (WORD_DNA_BIBLE §0): there is no
 * real exam marking scheme to imitate, so — unlike RC/PJ/PS/OOO — this
 * engine reports plain accuracy, never "CAT-style marks". A unit counts
 * as understood only when EVERY choice on it (the one Predict, and the
 * one or two Apply challenges) is correct; each choice is also kept
 * individually, because the mentor and Reading DNA read Predict and
 * Apply as separate signals (Root Recognition vs. Meaning Transfer,
 * WORD_DNA_BIBLE §5), not one blended score.
 */

/** Evaluate a chosen option index against a {text, correct}[] option set. */
export function evaluateChoice(options, chosenIndex) {
  const opt = options?.[chosenIndex];
  return { is_correct: !!opt?.correct, correct_index: options?.findIndex((o) => o.correct) ?? -1 };
}

/** Plain accuracy over a set of answers ({is_correct} | null-skipped). No marks: Word DNA imitates no exam format. */
export function computeWDScore(answers) {
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
  };
}

export class WDSession {
  #items;
  #setId;
  #answers; // item id -> answer record
  #index = 0;
  #startedAt;
  #itemShownAt;

  /**
   * @param {Array} items  loaded Word DNA units, in play order
   * @param {string} setId what this session practiced (a branch id or
   *                       one unit id) — stored as the session's
   *                       passage_id so existing engagement stats stay
   *                       meaningful
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

  #blank(item) {
    return {
      item_id: item.meta.id,
      predict: null,
      applies: new Array(item.discovery.applies.length).fill(null),
      time_ms: 0,
    };
  }

  #record(item) {
    if (!this.#answers.has(item.meta.id)) this.#answers.set(item.meta.id, this.#blank(item));
    return this.#answers.get(item.meta.id);
  }

  /** Record the Notice+Predict choice for the current unit (WORD_DNA_BIBLE §3 step 1). */
  answerPredict(chosenIndex) {
    const item = this.current;
    const verdict = evaluateChoice(item.discovery.predict_options, chosenIndex);
    const rec = this.#record(item);
    rec.predict = { chosen_index: chosenIndex, is_correct: verdict.is_correct };
    rec.time_ms = this.now() - this.#itemShownAt;
    return verdict;
  }

  /**
   * Record one Apply/transfer choice (there are 1 or 2 per unit,
   * WORD_DNA_BIBLE §3/§3a).
   * @param {number} applyIndex which held-out challenge (0, or 1 for
   *   foreign/cat_vocab's second one)
   * @param {number} chosenIndex the option the learner picked
   */
  answerApply(applyIndex, chosenIndex) {
    const item = this.current;
    const challenge = item.discovery.applies[applyIndex];
    const verdict = evaluateChoice(challenge.options, chosenIndex);
    const rec = this.#record(item);
    rec.applies[applyIndex] = {
      held_out_word: challenge.held_out_word,
      chosen_index: chosenIndex,
      is_correct: verdict.is_correct,
    };
    rec.time_ms = this.now() - this.#itemShownAt;
    return verdict;
  }

  /** Set the current unit aside (recorded as unanswered). */
  skip() {
    const item = this.current;
    const rec = this.#blank(item);
    rec.time_ms = this.now() - this.#itemShownAt;
    this.#answers.set(item.meta.id, rec);
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
    const ordered = this.#items.map((item) => {
      const rec = this.#answers.get(item.meta.id) ?? this.#blank(item);
      const attempted = rec.predict !== null || rec.applies.some((a) => a !== null);
      const allCorrect = attempted
        && rec.predict?.is_correct === true
        && rec.applies.every((a) => a?.is_correct === true);
      return {
        // question_id keeps the RC session field name so every consumer
        // of stored sessions (stats, backups) reads one shape.
        question_id: item.meta.id,
        item_id: item.meta.id,
        predict: rec.predict,
        applies: rec.applies,
        is_correct: attempted ? allCorrect : null,
        time_ms: rec.time_ms,
      };
    });
    const score = computeWDScore(ordered);

    const session = {
      id: this.id,
      module: 'wd',
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
      module: 'wd',
      passage_id: this.#setId,
      question_id: a.question_id,
      chosen: a.predict?.chosen_index ?? null,
      is_correct: a.is_correct,
      time_ms: a.time_ms,
      answered_at: session.finished_at,
    }));

    return { session, attempts };
  }
}
