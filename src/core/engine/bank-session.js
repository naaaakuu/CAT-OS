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

  /* WHERE THE LEARNER IS, WRITTEN DOWN.
     A bank set is five or six items and a Loom tier can be thirteen — up to
     a quarter of an hour of work that used to be held in a Map inside a
     closure and written down only on the very last click. The village sends
     learners to these now, which makes losing one more likely, not less.
     See core/learning/draft.js; PracticeSession carries the same pair. */
  snapshot() {
    return {
      id: this.id,
      set_id: this.#setId,
      items: this.#items.map((i) => i.id),
      index: this.#index,
      started_at: this.#startedAt,
      answers: [...this.#answers],
    };
  }

  /** Put them back. Declines unless it is the same set, the same items, in
   *  the same order — a set is picked fresh each time, and half of one run
   *  inside another is not a run. */
  restore(snap) {
    if (!snap || snap.set_id !== this.#setId) return false;
    const mine = this.#items.map((i) => i.id);
    if (!Array.isArray(snap.items) || snap.items.length !== mine.length) return false;
    if (snap.items.some((id, i) => id !== mine[i])) return false;
    const known = new Set(mine);
    const answers = (Array.isArray(snap.answers) ? snap.answers : []).filter((e) => Array.isArray(e) && known.has(e[0]));
    if (!answers.length) return false;
    this.#answers = new Map(answers);
    this.#index = Math.min(Math.max(0, Number(snap.index) || 0), this.total - 1);
    if (Number.isFinite(snap.started_at)) this.#startedAt = snap.started_at;
    if (typeof snap.id === 'string' && snap.id) this.id = snap.id;
    this.#shownAt = this.now();
    return true;
  }

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
  /* What a set IS matters as much as what is in it. A bank with six items
     runs dry in two sittings, and from the third onward the screen said
     "Item 1 of 5, unsolved first" over five items the learner had already
     solved — the same five, in the same order, presented as new work.
     `pickSet.lastKind` says which of three things just happened, and the
     session bar and the shelf row can then be honest about it. */
  const fresh = pool.filter((x) => !solved.has(idOf(x)) && !miss.has(idOf(x)));
  const missedRested = pool.filter((x) => miss.has(idOf(x)) && rested(miss.get(idOf(x)).at, miss.get(idOf(x)).n));
  const out = [...fresh, ...missedRested].slice(0, size);
  if (out.length >= Math.min(size, pool.length)) {
    pickSet.lastKind = fresh.length ? (fresh.length >= out.length ? 'new' : 'mixed') : 'review';
    pickSet.lastFresh = fresh.length;
    return out;
  }
  /* Everything is solved or resting, and a set still has to be filled.
     This used to sort the remainder by miss count alone, which put the items
     the learner had missed MOST at the front — and an item is only in that
     remainder rather than in `missedRested` above because it has NOT rested
     yet. So the one rule the rest period exists to enforce was broken exactly
     where it matters: a six-item bank with a short tier would hand back the
     item missed sixty seconds ago, first, which teaches the look of that item
     rather than the method behind it.

     Order now: everything that has rested (hardest first — that part was
     right), and only then the items still resting, longest-rested first,
     because showing a solved item again is a legitimate timed re-run and
     re-asking a fresh miss is not. */
  const rest = pool.filter((x) => !out.includes(x));
  const missOf = (x) => miss.get(idOf(x));
  const stillResting = (x) => { const m = missOf(x); return !!m && !rested(m.at, m.n); };
  const reviewable = rest.filter((x) => !stillResting(x))
    .sort((a, b) => (missOf(b)?.n ?? 0) - (missOf(a)?.n ?? 0));
  const resting = rest.filter(stillResting)
    .sort((a, b) => String(missOf(a)?.at ?? '').localeCompare(String(missOf(b)?.at ?? '')));
  const final = [...out, ...reviewable, ...resting].slice(0, size);
  pickSet.lastKind = fresh.length ? 'mixed' : (resting.length && !reviewable.length ? 'resting' : 'again');
  pickSet.lastFresh = fresh.length;
  return final;
}
