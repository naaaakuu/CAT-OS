/**
 * garden-session.js — the Language Garden's engine: pure logic, no DOM,
 * no storage. Two responsibilities that LANGUAGE_GARDEN_BIBLE keeps
 * deliberately separate:
 *
 *  1. computePlantState() — the spacing scheduler (§6.4). A plant's
 *     life stage and whether it is asking to be revisited are DERIVED
 *     from the ordered history of garden-session records for its
 *     family, exactly like core/mentor/wd-dna.js derives from stored
 *     sessions rather than storing its own conclusions. Nothing here
 *     is ever written back; recomputing from the same history always
 *     yields the same answer.
 *
 *  2. GardenSession — walks ONE session (a first "grow", or a later
 *     "revisit") through its beats and produces one persistable record.
 *     A "grow" session teaches the whole family in one sitting (this
 *     batch keeps every family to 2 or 3 taught members, inside the
 *     Bible's own Spread cap of §5, so "first session done" and "all
 *     members met" — Sprout and Sapling, §6.2 — are never split across
 *     multiple sittings for THIS content; a future larger family would
 *     need a second grow session, which this engine does not yet model).
 *     A "revisit" is pure retrieval (§6.6): the key, two members in
 *     FRESH context sentences, then one Reach. Distractor options for
 *     revisit quizzes are assembled at runtime from sibling content
 *     already in memory (other taught members' meanings; other
 *     families' root meanings) so no extra content authoring is needed
 *     and nothing is ever duplicated (PROJECT_RULES Rule 3).
 *
 * The Reach beat can never be failed (Bible §5.5): a wrong first
 * attempt gets one pointing line and a second try; the second try's
 * outcome is accepted either way. Every session still records whether
 * each beat landed clean on the first try — never shown to the learner
 * (Bible §6.7: "no score is ever shown") — because that is the ONLY
 * signal the scheduler uses to grow the interval a little slower.
 * Completing a session always regrows the plant a full step forward
 * in stage/visual terms; only the INTERVAL's growth depends on
 * cleanliness, and it never shrinks (§6.4/§6.7: never a demotion).
 */

/** Rung ladder, in milliseconds. Rung 0 is deliberately minutes, not
 *  days: the steepest forgetting happens in the first hour (a same-day
 *  "second touch" is standard spaced-repetition practice), so the very
 *  first invitation to revisit arrives soon enough to actually happen
 *  in one real testing session. Every rung after that is conservative
 *  and day-scaled, per LANGUAGE_GARDEN_BIBLE §15 ("start conservative"). */
export const RUNG_INTERVALS_MS = Object.freeze([
  10 * 60 * 1000,                   // rung 0 — 10 minutes
  1 * 24 * 60 * 60 * 1000,          // rung 1 — 1 day
  3 * 24 * 60 * 60 * 1000,          // rung 2 — 3 days
  8 * 24 * 60 * 60 * 1000,          // rung 3 — 8 days
  21 * 24 * 60 * 60 * 1000,         // rung 4 — 21 days
]);

/** How long a due plant stays Gold before its leaves fall to Bare with
 *  buds (Bible §6.4: both are honest, neither is ever "damaged"). */
export const GOLD_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** The top of the interval ladder — the longest gap a memory can be asked
 *  to survive. Surviving THIS interval is what "durable memory" means. */
export const TOP_RUNG = RUNG_INTERVALS_MS.length - 1;

/** The six growth stages (Bible §6.2), plus Open ground (stage 0, which is
 *  absence, not a stage). One canonical vocabulary, used by the scheduler,
 *  the plant art (cat-plant), and every screen — so a stage is renamed in
 *  exactly one place. Ordered lowest → highest.
 *
 *  open_ground  Nothing planted. Bare earth. Never a padlock, never a price.
 *  seed         Planted, not begun. Sits quietly, never nags. Reached by
 *               carrying a word back through the Gate from real reading
 *               (§19.2 — core/engine/garden-gate.js plantSeed()).
 *  sprout       First session complete, the key is known. The "small green
 *               thing" of the onboarding (§3.1).
 *  young        All members met; established, now asking for its first spaced
 *               retrieval.
 *  in_leaf      First successful spaced retrieval — days passed, still held.
 *  mature       Several retrievals across expanding intervals. Full canopy,
 *               and the first quiet blossom.
 *  ancient      A retrieval survived after a long interval. Taller than its
 *               neighbours; takes its place on the horizon; birds nest in it. */
export const STAGES = Object.freeze(['open_ground', 'seed', 'sprout', 'young', 'in_leaf', 'mature', 'ancient']);

/** Stage is keyed to the longest interval a memory has actually SURVIVED —
 *  never to a raw count of revisits (Bible §6.2, and the owner's own
 *  redesign brief: "Ancient should represent long-term memory, not repeated
 *  short-term success"). `survivedRung` is the highest rung whose interval
 *  the learner cleanly retrieved the family AFTER it had genuinely elapsed.
 *  Because the rung only climbs on a clean, due revisit, and the intervals
 *  expand (10min → 1d → 3d → 8d → 21d), reaching a survivedRung already
 *  proves every shorter interval below it was survived first.
 *
 *   survivedRung < 1   Young    Nothing "spaced in days" survived yet — at
 *                               most the same-day 10-minute consolidation
 *                               touch (rung 0). Continuous refinement (§6.3),
 *                               not a stage jump, carries the visible progress.
 *   survivedRung 1–2   In leaf  First real spaced retrieval — days passed and
 *                               the learner still had it (§6.2).
 *   survivedRung 3     Mature   Several retrievals across expanding intervals;
 *                               the ~week-long gap survived.
 *   survivedRung TOP   Ancient  The 21-day interval survived — the memory has
 *                               survived real time (§6.2). Reaching here takes
 *                               a full climb of the ladder, roughly a month of
 *                               kept memory: it cannot be reached by grinding. */
export const IN_LEAF_AT_SURVIVED_RUNG = 1;
export const MATURE_AT_SURVIVED_RUNG = 3;
export const ANCIENT_AT_SURVIVED_RUNG = TOP_RUNG;

/** A Landmark is an Ancient tree the world begins to treat differently
 *  (§6.5): a bird nests and sings, it stands on the horizon, it gains a
 *  name plate, fireflies gather at it. The Bible earns it with "several
 *  long-interval retrievals with no lapse" — so it is not a new stage, it
 *  is Ancient that has survived the top (21-day) interval this many times in
 *  a row without a lapse. A lapse (a rocky revisit) never demotes the tree —
 *  nothing is ever lost (Law 3) — it only resets the run, so the learner
 *  simply re-demonstrates the durability rather than being punished. */
export const LANDMARK_TOP_SURVIVALS = 2;

/** After how many times the same taught member is missed, in successive
 *  checks of that member, the Garden quietly re-teaches it smaller (§17.5,
 *  silent downward adaptation). "Fails the same item three times." */
export const ADAPTATION_MISS_THRESHOLD = 3;

const byFinishedAsc = (a, b) => a.finished_at.localeCompare(b.finished_at);

/** A smooth, bounded, monotonic "vigor" from the count of clean retrievals —
 *  the signal behind continuous within-stage refinement (§6.3: "trunk girth
 *  thickens with total successful retrievals"). 0 with none, rising fast at
 *  first and saturating toward 1, so a plant is ALWAYS visibly a little
 *  fuller after a real retrieval without any stage ever changing, and never
 *  a number the learner can see. Rounded so computePlantState stays a pure,
 *  byte-for-byte deterministic function of its inputs. */
function vigorFrom(cleanRetrievals) {
  return Math.round((1 - Math.pow(0.7, cleanRetrievals)) * 1000) / 1000;
}

/**
 * @param {Array} records  this family's garden-session records only
 *                         (kind: 'garden-session'), any order
 * @param {number} [now]   epoch ms, injectable for tests
 * @returns {{stage: typeof STAGES[number],
 *            due: 'none'|'gold'|'bare', nextReviewAt: string|null,
 *            revisitCount: number, rung: number, survivedRung: number,
 *            vigor: number, landmark: boolean,
 *            plantedAt: string|null, lastVisitedAt: string|null,
 *            ancientAt: string|null, landmarkAt: string|null}}
 */
export function computePlantState(records, now = Date.now()) {
  const grows = records.filter((r) => r.session_type === 'grow').sort(byFinishedAsc);
  const revisits = records.filter((r) => r.session_type === 'revisit').sort(byFinishedAsc);

  // No grow yet: Open ground (§6.2 stage 0 — absence, not a stage) — unless
  // a seed was carried back through the Gate (§19.2, the PLANT_SEED action,
  // landed in Phase 3): planted intent, not growth. A seed sits quietly and
  // never nags — no due state, no schedule, until its first Grow session.
  if (grows.length === 0) {
    const seeded = records.some((r) => r.kind === 'garden-seed');
    return {
      stage: seeded ? 'seed' : 'open_ground', due: 'none', nextReviewAt: null,
      revisitCount: 0, rung: 0, survivedRung: -1, vigor: 0, landmark: false,
      plantedAt: null, lastVisitedAt: null, ancientAt: null, landmarkAt: null,
    };
  }

  const plantedAt = grows[0].finished_at;

  let rung = 0;               // the interval this memory is CURRENTLY asked to survive
  let survivedRung = -1;      // the longest interval it has actually survived
  let cleanRetrievals = 0;    // total clean retrievals — drives vigor (§6.3)
  let topStreak = 0;          // clean survivals of the TOP interval, in a row (§6.5)
  let anchor = grows[grows.length - 1].finished_at;
  let ancientAt = null;
  let landmarkAt = null;

  for (const r of revisits) {
    const scheduledAt = new Date(anchor).getTime() + RUNG_INTERVALS_MS[rung];
    const due = new Date(r.finished_at).getTime() >= scheduledAt;

    if (r.clean) {
      cleanRetrievals += 1;
      if (due) {
        // A clean retrieval AFTER the interval elapsed is the only honest
        // evidence of durable memory: it climbs the ladder and records the
        // interval just survived. (Early review would waste the interval and
        // is never offered by the UI — §7 — so an early-but-clean revisit,
        // if one ever arrives, strengthens vigor but earns no survival credit.)
        if (rung > survivedRung) survivedRung = rung;
        if (rung === TOP_RUNG) {
          topStreak += 1;
          if (topStreak === 1 && !ancientAt) ancientAt = r.finished_at;
          if (topStreak === LANDMARK_TOP_SURVIVALS && !landmarkAt) landmarkAt = r.finished_at;
        }
        rung = Math.min(rung + 1, TOP_RUNG);
      }
    } else {
      // A rocky revisit still regrows the plant (it completed) and still
      // thickens nothing it hasn't earned: it buys no longer interval (never
      // a demotion, never a shortcut) and, if it happens at or past Ancient,
      // it is a lapse that resets the Landmark run — never the stage, never a
      // loss (Law 3: forgetting is weather). The learner simply re-earns it.
      topStreak = 0;
      landmarkAt = null;
    }
    anchor = r.finished_at;
  }

  const nextReviewAt = new Date(new Date(anchor).getTime() + RUNG_INTERVALS_MS[rung]).toISOString();
  const dueMs = now - new Date(nextReviewAt).getTime();
  const due = dueMs < 0 ? 'none' : dueMs < GOLD_WINDOW_MS ? 'gold' : 'bare';

  let stage;
  if (revisits.length === 0) {
    // Sprout for the first rung-0 window after planting (Bible's own
    // onboarding text: "within two minutes they own a sprout"), then it
    // settles into Young plant once old enough to be asking for its first
    // revisit — a real, honest boundary, not a cosmetic timer.
    stage = now < new Date(plantedAt).getTime() + RUNG_INTERVALS_MS[0] ? 'sprout' : 'young';
  } else if (survivedRung < IN_LEAF_AT_SURVIVED_RUNG) {
    stage = 'young';    // completed a revisit, but only the same-day touch — not "days"
  } else if (survivedRung < MATURE_AT_SURVIVED_RUNG) {
    stage = 'in_leaf';
  } else if (survivedRung < ANCIENT_AT_SURVIVED_RUNG) {
    stage = 'mature';
  } else {
    stage = 'ancient';
  }

  // A Landmark is Ancient that has held the top interval LANDMARK_TOP_SURVIVALS
  // times over, with no lapse in that run — the world starts treating it
  // differently (§6.5). It can never appear on a tree that is not Ancient.
  const landmark = stage === 'ancient' && landmarkAt !== null;

  return {
    stage, due, nextReviewAt,
    revisitCount: revisits.length, rung, survivedRung,
    vigor: vigorFrom(cleanRetrievals), landmark,
    plantedAt, lastVisitedAt: anchor, ancientAt, landmarkAt,
  };
}

/**
 * Which taught members (by index) the learner keeps missing — the signal for
 * silent downward adaptation (§17.5). A member's miss run is counted across
 * the successive revisit checks OF THAT member and reset the moment it is
 * answered correctly, so this only ever names a genuinely persistent
 * difficulty, and it clears itself the instant the learner recovers. Never
 * surfaced to the learner as a number or a label — it only reshapes the next
 * revisit into a smaller, gentler re-teach.
 * @param {Array} records  this family's garden-session records only
 * @param {number} [threshold]
 * @returns {number[]}  struggling taught-member indices, most-missed first
 */
export function strugglingMembers(records, threshold = ADAPTATION_MISS_THRESHOLD) {
  const revisits = records.filter((r) => r.session_type === 'revisit').sort(byFinishedAsc);
  const run = new Map();
  for (const r of revisits) {
    for (const c of r.member_checks ?? []) {
      if (c.is_correct === false) run.set(c.member_index, (run.get(c.member_index) ?? 0) + 1);
      else run.set(c.member_index, 0);
    }
  }
  return [...run.entries()]
    .filter(([, n]) => n >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([i]) => i);
}

/** Evaluate a chosen index against a {text, correct}[] option set. */
function evaluateChoice(options, chosenIndex) {
  const opt = options?.[chosenIndex];
  return { is_correct: !!opt?.correct, correct_index: options?.findIndex((o) => o.correct) ?? -1 };
}

/** Fisher-Yates over a stable seed so option order varies without
 *  Math.random() (verify.mjs and any future test stay deterministic). */
function seededShuffle(arr, seed) {
  const out = [...arr];
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  for (let i = out.length - 1; i > 0; i -= 1) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class GardenSession {
  #family; #type; #startedAt; #beatStartedAt;
  #siblingRootMeanings; // [{familyId, label, core_meaning}], for revisit key quiz distractors

  #attempt = null;
  #spreadWalked = new Set();
  #keyRetrieval = null;
  #memberChecks = new Map(); // member_index -> {chosen_index, is_correct}
  #reach = null;

  /**
   * @param {object} family              a loaded, resolved lg-NNNN item (members carry .word/.meaning)
   * @param {'grow'|'revisit'} type
   * @param {Array} siblingRootMeanings  every OTHER family's {id, label, core_meaning} — revisit only
   * @param {{now?: () => number}} [opts]
   */
  constructor(family, type, siblingRootMeanings = [], opts = {}) {
    this.#family = family;
    this.#type = type;
    this.#siblingRootMeanings = siblingRootMeanings;
    this.now = opts.now ?? (() => Date.now());
    this.#startedAt = this.now();
    this.#beatStartedAt = this.#startedAt;
    this.id = `garden-session-${new Date(this.#startedAt).toISOString().replace(/[:.]/g, '-')}`;
  }

  get family() { return this.#family; }
  get type() { return this.#type; }
  get taught() { return this.#family.members.filter((m) => !m.held_out); }
  get reachPool() { return this.#family.members.filter((m) => m.held_out); }

  markBeatShown() { this.#beatStartedAt = this.now(); }

  /* ---------------- Grow: Attempt (Encounter's directional read) ---------------- */

  /** The two direction choices, shuffled deterministically. Content
   *  authors the correct direction second by convention (readability),
   *  which would otherwise make the Attempt beat learnable as "always
   *  pick B" well before any real reasoning about the word happens. */
  attemptOptions() {
    return seededShuffle(this.#family.attempt.options, `${this.id}:attempt`);
  }

  answerAttempt(chosenIndex) {
    const verdict = evaluateChoice(this.attemptOptions(), chosenIndex);
    this.#attempt = { chosen_index: chosenIndex, is_correct: verdict.is_correct };
    return verdict;
  }

  /* ---------------- Grow: Spread (tap parts, confirm the join) ---------------- */

  confirmSpreadMember(memberIndex) {
    this.#spreadWalked.add(memberIndex);
  }

  /* ---------------- Revisit: Key retrieval ---------------- */

  /** Build the Key-retrieval quiz: this family's core meaning plus two
   *  distractor meanings drawn from OTHER loaded families, deterministically
   *  ordered by this session's id (stable across a re-render, never Math.random()). */
  keyRetrievalOptions() {
    const distractors = seededShuffle(this.#siblingRootMeanings, `${this.id}:key`).slice(0, 2);
    const options = [
      { text: this.#family.root.core_meaning, correct: true },
      ...distractors.map((d) => ({ text: d.core_meaning, correct: false })),
    ];
    return seededShuffle(options, `${this.id}:key-order`);
  }

  answerKeyRetrieval(chosenIndex) {
    const options = this.keyRetrievalOptions();
    const verdict = evaluateChoice(options, chosenIndex);
    this.#keyRetrieval = { chosen_index: chosenIndex, is_correct: verdict.is_correct };
    return verdict;
  }

  /* ---------------- Revisit: two members, fresh sentences ---------------- */

  /** Which 2 of the taught members this revisit tests — rotates by
   *  revisit-count-so-far isn't known to the pure engine, so callers
   *  (the screen) pass a rotation offset derived from stored history;
   *  a stable default (first two) keeps this usable standalone too. */
  memberCheckIndices(offset = 0) {
    const n = this.taught.length;
    const a = offset % n;
    const b = (offset + 1) % n;
    return [a, b];
  }

  /** Options for one member check: its own meaning plus sibling taught
   *  members' meanings from the SAME family (a genuine discrimination
   *  test, not a re-read — Bible §6.6). */
  memberCheckOptions(memberIndex) {
    const taught = this.taught;
    const correct = taught[memberIndex];
    const siblings = taught.filter((_, i) => i !== memberIndex);
    const options = [
      { text: correct.meaning, correct: true },
      ...siblings.map((s) => ({ text: s.meaning, correct: false })),
    ];
    return seededShuffle(options, `${this.id}:member-${memberIndex}`);
  }

  answerMemberCheck(memberIndex, chosenIndex) {
    const options = this.memberCheckOptions(memberIndex);
    const verdict = evaluateChoice(options, chosenIndex);
    this.#memberChecks.set(memberIndex, { chosen_index: chosenIndex, is_correct: verdict.is_correct });
    return verdict;
  }

  /* ---------------- Reach: construction, not a graded guess ---------------- */

  /** Which reach word this session serves. Callers pass which of the
   *  pool was used least recently (derived from history); default 0. */
  reachMember(poolIndex = 0) {
    const pool = this.reachPool;
    return pool[poolIndex % pool.length];
  }

  /** The Reach construct choices, shuffled deterministically. Content
   *  always authors the correct option first (readability for whoever
   *  edits the JSON); without this shuffle the correct answer would
   *  render in the same position every single time, which a learner
   *  would (rightly) learn to exploit instead of actually constructing
   *  the meaning. Seeded by session + attempt, so a retry (Bible §5.5)
   *  reshuffles rather than repeating the same layout. */
  reachOptions(poolIndex, attemptNumber = 1) {
    const member = this.reachMember(poolIndex);
    return seededShuffle(member.construct_options, `${this.id}:reach-${poolIndex}-${attemptNumber}`);
  }

  answerReach(poolIndex, chosenIndex, attemptNumber = 1) {
    const member = this.reachMember(poolIndex);
    const options = this.reachOptions(poolIndex, attemptNumber);
    const verdict = evaluateChoice(options, chosenIndex);
    this.#reach = {
      vocab_id: member.vocab_id,
      pool_index: poolIndex,
      chosen_index: chosenIndex,
      attempt_number: attemptNumber,
      is_correct: verdict.is_correct,
      // The peak cannot be failed: the session's own record of "did it
      // land clean" only ever means "on the first try", never "at all".
      landed_clean_first_try: attemptNumber === 1 && verdict.is_correct,
    };
    return verdict;
  }

  /* ---------------- Finish ---------------- */

  finish() {
    const finishedAt = this.now();
    const base = {
      id: this.id,
      kind: 'garden-session',
      module: 'lg',
      garden: 'root_grove',
      family_id: this.#family.meta.id,
      session_type: this.#type,
      started_at: new Date(this.#startedAt).toISOString(),
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - this.#startedAt,
      reach: this.#reach,
    };

    if (this.#type === 'grow') {
      return {
        ...base,
        attempt: this.#attempt,
        spread: this.taught.map((m, i) => ({ member_index: i, vocab_id: m.vocab_id, walked: this.#spreadWalked.has(i) })),
        // A grow session has no "clean" concept to score against — it is
        // the family's introduction, never a graded retrieval.
        clean: null,
      };
    }

    const memberChecks = [...this.#memberChecks.entries()].map(([member_index, v]) => ({ member_index, ...v }));
    const clean = this.#keyRetrieval?.is_correct === true
      && memberChecks.every((c) => c.is_correct === true)
      && this.#reach?.landed_clean_first_try === true;

    return {
      ...base,
      key_retrieval: this.#keyRetrieval,
      member_checks: memberChecks,
      clean,
    };
  }
}
