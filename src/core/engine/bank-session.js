/**
 * bank-session.js — one practice engine for every item bank the
 * verbal-bank module plays: sentence placement (sp), paragraph completion
 * (pc), the word bank (wb) and arguments (cr). Pure logic, no DOM, no
 * storage. It walks a set of NORMALISED items (see loader.js
 * normalizeBankItem — every item already has stem / options / correct /
 * skill / patterns / distractors), records the chosen letter, the time,
 * and — this is what the pattern layer is for — the SKILL the item trains,
 * the reasoning PATTERNS it exercises and the TRAP the learner fell for
 * when they missed it. The skill ledger (core/learning/review.js) reads
 * all three, so the valley can say "scope traps keep working on you"
 * rather than "you got wb-0012-07 wrong".
 *
 * Records use the shapes the app already persists (STORES.SESSIONS /
 * STORES.ATTEMPTS, module = the bank key), so streaks, XP, backups and
 * the world's stars work unchanged. Marking is +3 / 0: these are the
 * choice questions recent CAT cycles have set without negative marking;
 * the scheme is announced per cycle, and the UI labels marks CAT-style.
 */

export const BANK_MARKS_CORRECT = 3;
export const BANK_MARKS_WRONG = 0;

export function computeBankScore(answers) {
  let correct = 0, wrong = 0, skipped = 0;
  for (const a of answers) {
    if (a.is_correct === true) correct += 1;
    else if (a.is_correct === false) wrong += 1;
    else skipped += 1;
  }
  const attempted = correct + wrong;
  return {
    total: answers.length, correct, wrong, skipped, attempted,
    accuracy: attempted === 0 ? 0 : correct / attempted,
    marks: correct * BANK_MARKS_CORRECT + wrong * BANK_MARKS_WRONG,
    max_marks: answers.length * BANK_MARKS_CORRECT,
  };
}

export class BankSession {
  #items; #module; #setId; #region; #answers; #index = 0; #startedAt; #shownAt;

  /**
   * @param {Array}  items   normalised bank items, in play order
   * @param {object} o       { module: 'sp'|'pc'|'wb'|'cr', setId, region }
   */
  constructor(items, { module, setId, region }, { now = () => Date.now() } = {}) {
    this.#items = items;
    this.#module = module;
    this.#setId = setId;
    this.#region = region ?? null;
    this.#answers = new Map();
    this.now = now;
    this.#startedAt = now();
    this.#shownAt = now();
    this.id = `session-${new Date(this.#startedAt).toISOString().replace(/[:.]/g, '-')}`;
  }

  get items() { return this.#items; }
  get module() { return this.#module; }
  get index() { return this.#index; }
  get total() { return this.#items.length; }
  get current() { return this.#items[this.#index]; }
  get isLast() { return this.#index === this.total - 1; }
  /** The sum of the items' own time targets, in seconds — the pace bar. */
  get targetSec() { return this.#items.reduce((n, it) => n + (it.time_sec ?? 60), 0); }

  markItemShown() { this.#shownAt = this.now(); }

  /** @returns {{is_correct: boolean, correct: string, trap: string|null}} */
  answer(chosen) {
    const it = this.current;
    const is_correct = chosen === it.correct;
    const trap = is_correct ? null : (it.distractors.find((d) => d.option === chosen)?.trap_type ?? null);
    this.#answers.set(it.id, this.#record(it, { chosen, is_correct, trap }));
    return { is_correct, correct: it.correct, trap };
  }

  skip() {
    const it = this.current;
    this.#answers.set(it.id, this.#record(it, { chosen: null, is_correct: null, trap: null }));
  }

  #record(it, { chosen, is_correct, trap }) {
    return {
      item_id: it.id, chosen, is_correct, trap,
      skill: it.skill ?? null, patterns: it.patterns ?? [], kind: it.kind ?? null,
      time_ms: this.now() - this.#shownAt,
    };
  }

  next() {
    if (this.isLast) return false;
    this.#index += 1;
    this.#shownAt = this.now();
    return true;
  }

  answerFor(id) { return this.#answers.get(id) ?? null; }

  finish() {
    const finishedAt = this.now();
    const ordered = this.#items.map((it) => ({
      question_id: it.id,
      ...(this.#answers.get(it.id) ?? { item_id: it.id, chosen: null, is_correct: null, trap: null, skill: it.skill ?? null, patterns: it.patterns ?? [], kind: it.kind ?? null, time_ms: 0 }),
    }));
    const score = computeBankScore(ordered);
    const session = {
      id: this.id,
      module: this.#module,
      region: this.#region,
      passage_id: this.#setId,
      set_id: this.#setId,
      item_ids: this.#items.map((i) => i.id),
      target_sec: this.targetSec,
      started_at: new Date(this.#startedAt).toISOString(),
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - this.#startedAt,
      score,
      answers: ordered,
    };
    const attempts = ordered.map((a) => ({
      id: `${this.id}:${a.question_id}`, session_id: this.id, module: this.#module,
      passage_id: this.#setId, question_id: a.question_id, chosen: a.chosen, is_correct: a.is_correct,
      trap: a.trap, skill: a.skill, time_ms: a.time_ms, answered_at: session.finished_at,
    }));
    return { session, attempts };
  }
}

/* ------------------------------------------------------------------ */
/* Choosing a set                                                      */
/* ------------------------------------------------------------------ */

/**
 * The next `size` items from a pool, the way a good teacher would hand
 * them out: never solved ones while unsolved ones remain; a missed item
 * only once it has rested (core/learning/review.js); then, if the pool
 * is exhausted, the ones missed most, for a second look.
 *
 * @param {Array}  pool      registry rows or normalised items, in journey order
 * @param {Array}  sessions  stored session records
 * @param {string} moduleKey the bank / module key whose sessions count
 * @param {number} size
 * @param {(lastMissAt:string, misses:number)=>boolean} rested
 */
export function pickSet(pool, sessions, moduleKey, size, rested = () => true) {
  const solved = new Set();
  const miss = new Map();
  const ordered = [...sessions].filter((s) => s.module === moduleKey)
    .sort((a, b) => String(a.finished_at ?? '').localeCompare(String(b.finished_at ?? '')));
  for (const s of ordered) {
    for (const a of s.answers ?? []) {
      const id = a.item_id ?? a.question_id;
      if (a.is_correct === true) { solved.add(id); miss.delete(id); }
      else if (a.is_correct === false) {
        const m = miss.get(id) ?? { n: 0, at: null };
        m.n += 1; m.at = s.finished_at ?? m.at;
        miss.set(id, m);
      }
    }
  }
  const idOf = (x) => x.id ?? x.meta?.id;
  const fresh = pool.filter((x) => !solved.has(idOf(x)) && !miss.has(idOf(x)));
  const missedRested = pool.filter((x) => miss.has(idOf(x)) && rested(miss.get(idOf(x)).at, miss.get(idOf(x)).n));
  const out = [...fresh, ...missedRested].slice(0, size);
  if (out.length >= Math.min(size, pool.length)) return out;
  // Everything is solved or resting: hand back what was hardest, for review.
  const rest = pool.filter((x) => !out.includes(x))
    .sort((a, b) => (miss.get(idOf(b))?.n ?? 0) - (miss.get(idOf(a))?.n ?? 0));
  return [...out, ...rest].slice(0, size);
}
