/**
 * noticing.js — what the ledgers have noticed, in one sentence.
 *
 * The trap and pattern ledgers have been derived correctly for two releases
 * and read by nothing but the test harness. Seven families of trap have
 * authored copy (`TRAP_FAMILY_LINE`) and a hundred and fifty-two reasoning
 * patterns are named in the taxonomy, and not one of them has ever reached a
 * learner. The sophistication was all underneath, and it stayed there.
 *
 * This is the layer between. It does NOT render anything and it is not a
 * dashboard — the owner's instruction is explicit about that. It answers one
 * question for whoever asks: given everything this learner has done, is there
 * a single true thing worth saying right now? Usually the answer is no, and
 * that is correct: a learner who is doing fine should be left alone.
 *
 * Every line is a fact with a number behind it. None of them says "wrong",
 * "weak", "mistake" or "poor" — the mentor voice rules apply here too, and
 * verify.mjs §17 lints them.
 */

import { trapLedger, weakTrapFamilies, patternLedger, weakPatterns, skillLedger, SKILLS } from './review.js';
import { TRAP_FAMILY, TRAP_FAMILY_LINE, PATTERNS } from './taxonomy.js';

/** How many times a family has to have caught somebody before it is a habit. */
const HABIT = 4;

/**
 * The one trap family that keeps catching this learner, if there is one.
 * @returns {{key, n, line, sentence}|null}
 */
export function trapHabit(sessions, { min = HABIT } = {}) {
  const led = trapLedger(sessions);
  const [top] = weakTrapFamilies(led, { min, n: 1 });
  if (!top) return null;
  const line = TRAP_FAMILY_LINE[top.key] ?? '';
  if (!line) return null;
  return {
    key: top.key,
    n: top.n,
    line,
    sentence: `${cap(line)} have caught you ${top.n} times.`,
  };
}

/**
 * Did this particular run fall for the habit? The result screen only speaks
 * when the answer is yes — a general observation after a clean run is noise.
 * @param {object[]} answers the answers of the run just finished
 */
export function hitHabit(answers, habit) {
  if (!habit) return false;
  return (answers ?? []).some((a) => a && a.is_correct === false && a.trap && TRAP_FAMILY[a.trap] === habit.key);
}

/**
 * The reasoning pattern the learner meets often and gets least often, with
 * the taxonomy's own one-line description of what it asks.
 * @returns {{key, name, instinct, seen, acc, sentence}|null}
 */
export function patternToWatch(sessions, { min = 6, below = 0.62 } = {}) {
  const [top] = weakPatterns(patternLedger(sessions), { min, below, n: 1 });
  if (!top) return null;
  const def = PATTERNS?.[top.key] ?? null;
  const name = def?.name ?? prettyPattern(top.key);
  const instinct = def?.instinct ?? def?.line ?? '';
  return {
    key: top.key,
    name,
    instinct,
    seen: top.seen,
    acc: top.acc,
    sentence: instinct ? `${name}. ${cap(instinct)}` : `${name} is the one still settling.`,
  };
}

/**
 * The skill with the most room, from the ledger every answer in the app
 * feeds — not the four coarse abilities the Growth screen shows.
 * @returns {{key, name, line, where, seen, acc, sentence}|null}
 */
export function skillToGrow(sessions, learning = [], { min = 6, below = 0.7 } = {}) {
  const led = skillLedger(sessions, learning);
  let best = null;
  for (const [key, row] of led) {
    if (!row || row.seen < min) continue;
    const acc = row.correct / Math.max(1, row.seen);
    if (acc >= below) continue;
    if (!best || acc < best.acc || (acc === best.acc && row.seen > best.seen)) best = { key, seen: row.seen, acc };
  }
  if (!best) return null;
  const def = SKILLS.find((s) => s.key === best.key);
  if (!def) return null;
  return {
    key: best.key,
    name: def.name,
    line: def.line,
    where: def.where,
    seen: best.seen,
    acc: best.acc,
    sentence: `${def.name}. ${def.line}`,
  };
}

/**
 * Everything worth saying, at most one of each, for a screen to pick from.
 * A screen should take ONE. Two observations at once is a dashboard.
 */
export function noticing(sessions, learning = []) {
  return {
    trap: trapHabit(sessions),
    pattern: patternToWatch(sessions),
    skill: skillToGrow(sessions, learning),
  };
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const prettyPattern = (key) => String(key).split('.').pop().replace(/_/g, ' ').replace(/^vs /, 'versus ');
