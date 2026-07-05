/**
 * lesson.js — the One Lesson Rule.
 *
 * After every session the mentor teaches exactly ONE thing: the single
 * observation most likely to change tomorrow's reading. Never a list,
 * never fifteen findings — one concept, taught in 30–90 seconds.
 *
 * Pure logic: give it the finished session, its passage, and the
 * reader's DNA (for knowing which pulls are characteristic), and it
 * returns everything the screen needs — including the seed for
 * tomorrow's twenty-second recall. Deterministic throughout: the same
 * session always produces the same lesson and the same sentences.
 */

import { OPENINGS, TRAP_PATTERNS, TYPE_ADVICE, TYPE_LABELS, LINES, pick } from './voice.js';
import { enrichAnswers } from './dna.js';

/**
 * Choose the one lesson for a finished session.
 * @param {object} session   the persisted session record
 * @param {object} passage   the loaded content item it was read from
 * @param {object} dna       deriveDNA() over PRIOR sessions (may be empty)
 * @param {number} priorSessions how many sessions existed before this one
 */
export function chooseLesson({ session, passage, dna, priorSessions = 0 }) {
  const rows = enrichAnswers([session], new Map([[session.passage_id, passage]]));
  const byQ = new Map(passage.questions.map((q) => [q.id, q]));
  const missed = rows.filter((r) => r.is_correct === false && r.trap);
  const skipped = rows.filter((r) => r.is_correct === null);
  const seed = session.id;

  /* ---- a pull appeared: teach the most characteristic one ---- */
  if (missed.length > 0) {
    const score = (r) =>
      (dna?.dominant && r.trap === dna.dominant.trap ? 4 : 0)
      + (dna?.frictionTypes?.includes(r.type) ? 2 : 0)
      + (TRAP_PATTERNS[r.trap] ? 1 : 0);
    const target = [...missed].sort((a, b) => score(b) - score(a) || a.index - b.index)[0];
    const q = byQ.get(target.question_id);
    const pattern = TRAP_PATTERNS[target.trap];
    const distractor = q.explanation.distractors.find((d) => d.option === target.chosen);
    const isKnownPull = dna?.dominant && target.trap === dna.dominant.trap;

    return {
      lesson_kind: 'watch',
      opening: pick(seed, priorSessions === 0 ? OPENINGS.first : OPENINGS.watch),
      title: pattern.name,
      pattern_id: target.trap,
      question_id: q.id,
      teach: {
        moment: `On one question, option ${target.chosen} made its move: ${distractor.seductive_element}`,
        pull: pattern.pull,
        notice: pattern.notice,
        known: isKnownPull
          ? `This is the pull we've been watching — naming it in the moment is exactly how it fades.`
          : null,
      },
      habit: q.explanation.reading_habit ?? TYPE_ADVICE[q.type] ?? null,
      recall: pattern.recall,
      closing: pick(`${seed}:close`, LINES.keepGoing),
    };
  }

  /* ---- nothing chosen falsely, but a door left closed ---- */
  if (skipped.length > 0) {
    const target = skipped[0];
    const q = byQ.get(target.question_id);
    const label = TYPE_LABELS[q.type] ?? q.type.replaceAll('_', ' ');
    return {
      lesson_kind: 'skipped',
      opening: pick(seed, priorSessions === 0 ? OPENINGS.first : OPENINGS.skipped),
      title: `A way into ${label}`,
      pattern_id: null,
      question_id: q.id,
      teach: {
        moment: `You set one question aside — ${label.replace(/questions$/, 'question').trim()}. Fair choice under a clock; here is the way in for next time.`,
        pull: q.explanation.question_type_note,
        notice: q.explanation.reading_habit ?? TYPE_ADVICE[q.type],
        known: null,
      },
      habit: TYPE_ADVICE[q.type] ?? null,
      recall: {
        question: `What's the way into ${label}?`,
        answer: q.explanation.reading_habit ?? TYPE_ADVICE[q.type],
      },
      closing: pick(`${seed}:close`, LINES.keepGoing),
    };
  }

  /* ---- a clean read: celebrate the understanding, keep the move ---- */
  const trapsPresent = new Set(
    passage.questions.flatMap((q) => q.explanation.distractors.map((d) => d.trap_type)));
  const walkedPast = dna?.dominant && trapsPresent.has(dna.dominant.trap)
    ? LINES.masteryWalkedPast(TRAP_PATTERNS[dna.dominant.trap].name)
    : null;
  const hardest = [...passage.questions].sort(
    (a, b) => b.estimated_time_sec - a.estimated_time_sec)[0];

  return {
    lesson_kind: 'mastery',
    opening: pick(seed, priorSessions === 0 ? OPENINGS.first : (walkedPast ? OPENINGS.growth : OPENINGS.mastery)),
    title: walkedPast ? 'An old pull, walked past' : 'The move that carried you',
    pattern_id: walkedPast ? dna.dominant.trap : null,
    question_id: hardest.id,
    teach: {
      moment: walkedPast ?? 'Every option that was built to tempt you got checked against the text and set down. That is the whole skill, working.',
      pull: passage.mentor?.takeaway
        ? `Worth keeping from this passage: ${passage.mentor.takeaway}`
        : 'Keep reading exactly the way you just did.',
      notice: hardest.explanation.reading_habit ?? TYPE_ADVICE[hardest.type],
      known: null,
    },
    habit: hardest.explanation.reading_habit ?? null,
    recall: walkedPast && dna?.dominant
      ? TRAP_PATTERNS[dna.dominant.trap].recall
      : {
          question: 'What made your last clean read clean?',
          answer: hardest.explanation.reading_habit ?? 'Every tempting option was checked against the text before it was believed.',
        },
    closing: pick(`${seed}:close`, LINES.keepGoing),
  };
}

/** The record persisted for every lesson (learning store; minimal,
 *  migration-free shape). `day` is a local calendar key. */
export function lessonRecord(lesson, session, day) {
  return {
    id: `lesson:${session.id}`,
    kind: 'lesson',
    session_id: session.id,
    passage_id: session.passage_id,
    question_id: lesson.question_id ?? null,
    pattern_id: lesson.pattern_id ?? null,
    lesson_kind: lesson.lesson_kind,
    title: lesson.title,
    recall: lesson.recall ?? null,
    day,
    created_at: session.finished_at,
    recalled_at: null,
    recall_count: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Smart recall — one tiny card before tomorrow's reading.             */
/* ------------------------------------------------------------------ */

/** How many successful recalls retire a lesson (the loop closing). */
export const RECALL_RETIRED_AFTER = 3;

/**
 * Pick today's single recall, or null.
 * Rules: never a lesson created today (it was just taught); never one
 * already recalled today; lessons recalled RECALL_RETIRED_AFTER times
 * are retired — absorbed, quietly, which is the mistake loop closing.
 * Prefer the least recently recalled, then the most recent lesson.
 * `todayKey`/`recalled_day` are local-calendar keys (streaks.dayKey).
 */
export function pickRecall(lessons, todayKey) {
  const candidates = lessons.filter((l) =>
    l.kind === 'lesson'
    && l.recall && l.recall.question
    && l.day !== todayKey
    && (l.recalled_day ?? '') !== todayKey
    && (l.recall_count ?? 0) < RECALL_RETIRED_AFTER);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) =>
    (a.recalled_at ?? '').localeCompare(b.recalled_at ?? '')
    || b.created_at.localeCompare(a.created_at))[0];
}
