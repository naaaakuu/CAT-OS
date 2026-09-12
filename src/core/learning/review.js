/**
 * review.js — the skill ledger, and the rule that stops a second look
 * becoming a memory test.
 *
 * Two problems this file exists to solve.
 *
 * 1. A LEARNER WHO MISSES A QUESTION MUST NOT SEE IT AGAIN IN A MINUTE.
 *    Re-asking the same question with the same four options measures
 *    whether they remember which letter was right. So a missed item goes
 *    to REST: it cannot come back until its rung of the spacing ladder
 *    has elapsed, and what comes back first is a DIFFERENT question on
 *    the same underlying skill.
 *
 * 2. THE GAME SHOULD KNOW WHAT THE LEARNER NEEDS.
 *    Every answer anywhere in the valley — a passage question, a jumble,
 *    a word, a summary — is tagged with the CAT ability it actually
 *    trains. The ledger below is the honest read on those abilities, and
 *    it is what the valley points at.
 *
 * Nothing here is stored: like the rest of the world, the ledger is
 * derived from the session records, so it can never drift from the truth
 * and it travels inside a backup for free.
 */

/* ------------------------------------------------------------------ */
/* The skills                                                          */
/* ------------------------------------------------------------------ */

/**
 * Every ability CAT's verbal section actually tests, named the way the
 * valley names it. `where` is the place that trains it.
 */
export const SKILLS = Object.freeze([
  { key: 'main_idea', name: 'Main idea', group: 'reading', where: 'reading-room', line: 'What the writer is actually claiming.' },
  { key: 'inference', name: 'Inference', group: 'reading', where: 'reading-room', line: 'What follows from the text without being said.' },
  { key: 'author_purpose', name: 'Author’s purpose', group: 'reading', where: 'reading-room', line: 'What the writer is doing, not only saying.' },
  { key: 'tone', name: 'Tone', group: 'reading', where: 'reading-room', line: 'Where the writer stands.' },
  { key: 'logical_structure', name: 'Structure', group: 'reading', where: 'reading-room', line: 'Claim, support, turn — the shape of it.' },
  { key: 'paragraph_function', name: 'Paragraph function', group: 'reading', where: 'reading-room', line: 'What each paragraph is FOR.' },
  { key: 'specific_detail', name: 'Detail', group: 'reading', where: 'reading-room', line: 'Reading once, closely.' },
  { key: 'vocabulary_in_context', name: 'Words in context', group: 'reading', where: 'reading-room', line: 'A common word, used narrowly.' },
  { key: 'strengthen_weaken', name: 'Strengthen and weaken', group: 'reading', where: 'reading-room', line: 'Find the load-bearing assumption.' },
  { key: 'jumble', name: 'Paragraph order', group: 'verbal', where: 'loom', line: 'The order the author wrote.' },
  { key: 'summary', name: 'Summary', group: 'verbal', where: 'table', line: 'The point, protected from what almost says it.' },
  { key: 'odd_one_out', name: 'Odd one out', group: 'verbal', where: 'bench', line: 'The sentence that never belonged.' },
  { key: 'word_meaning', name: 'Word meanings', group: 'words', where: 'meadow', line: 'The CAT lists, held for good.' },
  { key: 'word_pair', name: 'Confusable words', group: 'words', where: 'pond', line: 'Words that look alike and are not.' },
  { key: 'loanword', name: 'Borrowed words', group: 'words', where: 'thicket', line: 'What English took, and from where.' },
  { key: 'root', name: 'Roots', group: 'words', where: 'rootwood', line: 'One root opens a family of words.' },
  { key: 'word_part', name: 'Prefixes and suffixes', group: 'words', where: 'terraces', line: 'How a word is put together.' },
]);

const SKILL_BY_KEY = new Map(SKILLS.map((s) => [s.key, s]));
export function skill(key) { return SKILL_BY_KEY.get(key) ?? null; }
export function skillName(key) { return SKILL_BY_KEY.get(key)?.name ?? String(key ?? '').replace(/_/g, ' '); }

/** Which skill a session's answers train, when the answer does not say. */
const MODULE_SKILL = Object.freeze({ pj: 'jumble', ps: 'summary', ooo: 'odd_one_out', wd: 'word_part' });
const REGION_SKILL = Object.freeze({ meadow: 'word_meaning', pond: 'word_pair', thicket: 'loanword', rootwood: 'root', terraces: 'word_part' });

/* ------------------------------------------------------------------ */
/* Rest: what a missed item has to wait                                */
/* ------------------------------------------------------------------ */

/**
 * How long an item rests after a miss, by how many times it has been
 * missed. Short enough that it comes back inside the week; long enough
 * that nobody is answering from short-term memory.
 */
export const REST_MS = Object.freeze([
  20 * 60_000,          // first miss: twenty minutes
  22 * 3600_000,        // second: the next day
  3 * 24 * 3600_000,    // third: three days
  6 * 24 * 3600_000,    // after that: most of a week
]);

export function restFor(misses) { return REST_MS[Math.min(REST_MS.length - 1, Math.max(0, misses - 1))]; }

/** Is this item allowed back yet? */
export function isRested(lastMissAt, misses, now = Date.now()) {
  const t = lastMissAt ? Date.parse(lastMissAt) : 0;
  if (!t) return true;
  return now - t >= restFor(misses);
}

/* ------------------------------------------------------------------ */
/* The ledger                                                          */
/* ------------------------------------------------------------------ */

const RECENT = 14;

/**
 * Every skill, measured from the records.
 * @param {Array} sessions  stored session records
 * @param {Array} learning  stored learning records (rounds, garden walks)
 * @returns {Map<string, object>} key → {seen, correct, acc, recentAcc, level, lastAt, misses}
 */
export function skillLedger(sessions, learning = [], now = Date.now()) {
  const m = new Map();
  const touch = (key) => {
    let e = m.get(key);
    if (!e) { e = { key, seen: 0, correct: 0, acc: 0, recent: [], recentAcc: 0, lastAt: 0, misses: 0, slow: 0 }; m.set(key, e); }
    return e;
  };
  const answer = (key, ok, at, slow = false) => {
    if (!key) return;
    const e = touch(key);
    e.seen += 1;
    if (ok) e.correct += 1; else e.misses += 1;
    if (slow) e.slow += 1;
    e.recent.push(ok ? 1 : 0);
    if (e.recent.length > RECENT) e.recent.shift();
    const t = at ? Date.parse(at) || 0 : 0;
    if (t > e.lastAt) e.lastAt = t;
  };

  const ordered = [...sessions].sort((a, b) => String(a.finished_at ?? '').localeCompare(String(b.finished_at ?? '')));
  for (const s of ordered) {
    const mod = s.module ?? 'rc';
    for (const a of s.answers ?? []) {
      if (a.is_correct === null || a.is_correct === undefined) continue;
      // A passage question names its own skill; everything else is named
      // by the bench it was solved at.
      const key = (mod === 'rc' || mod === 'rc2') ? a.type : MODULE_SKILL[mod];
      answer(key, a.is_correct === true, s.finished_at, (a.time_ms ?? 0) > 90_000);
    }
  }
  for (const r of learning) {
    if (r.kind === 'lex-round') {
      const key = REGION_SKILL[r.region];
      const total = r.score?.total ?? 0, correct = r.score?.correct ?? 0;
      for (let i = 0; i < total; i += 1) answer(key, i < correct, r.finished_at);
    } else if (r.kind === 'garden-session') {
      answer('root', r.clean !== false, r.finished_at);
    }
  }

  for (const e of m.values()) {
    e.acc = e.seen ? e.correct / e.seen : 0;
    e.recentAcc = e.recent.length ? e.recent.reduce((n, v) => n + v, 0) / e.recent.length : 0;
    // Level 0–4: how settled this ability is. It needs both volume and
    // accuracy, so eight lucky answers never read as mastery.
    e.level = e.seen < 4 ? 0
      : e.recentAcc >= 0.9 && e.seen >= 20 ? 4
        : e.recentAcc >= 0.8 ? 3
          : e.recentAcc >= 0.65 ? 2 : 1;
    e.days = e.lastAt ? Math.floor((now - e.lastAt) / 86400000) : null;
  }
  return m;
}

/**
 * The abilities worth working on, weakest and most neglected first.
 * A skill counts only once it has been met four times, so one bad
 * morning never redirects the whole curriculum.
 */
export function weakSkills(ledger, { min = 4, n = 3 } = {}) {
  return [...ledger.values()]
    .filter((e) => e.seen >= min && e.recentAcc < 0.8)
    .sort((a, b) => a.recentAcc - b.recentAcc || b.seen - a.seen)
    .slice(0, n)
    .map((e) => ({ ...e, ...(skill(e.key) ?? {}) }));
}

/** Abilities the learner has not touched at all, in the valley's order. */
export function untouchedSkills(ledger) {
  return SKILLS.filter((s) => !(ledger.get(s.key)?.seen));
}

/**
 * One recommendation, chosen the way a good teacher would: catch what is
 * slipping before meeting anything new, and never send someone to the
 * same bench twice in a row when a weaker one is standing empty.
 *
 * @returns {{skill, why, route, kind}|null}
 */
export function nextSkill(ledger, state) {
  const weak = weakSkills(ledger, { n: 4 });
  // Something that was strong and has gone quiet outranks something that
  // was never good — forgetting is cheaper to fix than not knowing.
  const fading = weak.find((e) => e.days !== null && e.days >= 4 && e.acc >= 0.7);
  if (fading) return { skill: fading, kind: 'fading', why: `${fading.name} was going well, and it has been ${fading.days} days.`, route: routeFor(fading.where, state) };
  if (weak.length) {
    const w = weak[0];
    return { skill: w, kind: 'weak', why: `${Math.round(w.recentAcc * 100)}% of your last ${w.recent.length} on ${w.name.toLowerCase()}.`, route: routeFor(w.where, state) };
  }
  const fresh = untouchedSkills(ledger)[0];
  if (fresh) return { skill: { ...fresh, seen: 0, recentAcc: 0 }, kind: 'new', why: `You have not tried ${fresh.name.toLowerCase()} yet.`, route: routeFor(fresh.where, state) };
  return null;
}

function routeFor(where, state) {
  if (!where) return '#/world';
  if (['meadow', 'pond', 'thicket'].includes(where)) return `#/round/${where}`;
  return `#/world/place/${where}`;
}

/**
 * Which passage trains a skill best: the ones that ask about it, that the
 * learner has not already read well.
 * @param {Array} items rc registry rows (with question_types)
 */
export function passagesForSkill(items, key, best) {
  if (!key) return [];
  return items.filter((i) => (i.question_types ?? []).includes(key))
    .filter((i) => (best?.get(i.id)?.stars ?? 0) < 3);
}
