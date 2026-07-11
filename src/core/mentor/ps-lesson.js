/**
 * ps-lesson.js — the One Lesson Rule for Para Summary.
 *
 * After every summary set the mentor teaches exactly ONE thing: the
 * single observation most likely to change the next set. Deterministic
 * throughout, like lesson.js and pj-lesson.js: same session in, same
 * sentences out.
 *
 * Lesson records land in the same learning store shape lesson.js uses,
 * so the twenty second recall system (pickRecall, retire at 3) works on
 * summary lessons with no changes — a Para Summary insight can open
 * tomorrow's reading session, which is exactly how the skill transfers
 * (the Bible calls Para Summary micro RC; the two share a diagnostic).
 */

import { PS_OPENINGS, PS_TRAP_PATTERNS, PS_LINES, pick } from './ps-voice.js';
import { enrichPSAnswers } from './ps-dna.js';

/**
 * Choose the one lesson for a finished PS session.
 * @param {object} session   the persisted PS session record
 * @param {Map}    items     item_id -> loaded PS content item (this set)
 * @param {object} dna       derivePSDNA() over PRIOR sessions (may be empty)
 * @param {number} priorSessions how many PS sessions existed before this one
 */
export function choosePSLesson({ session, items, dna, priorSessions = 0 }) {
  const rows = enrichPSAnswers([session], items);
  const missed = rows.filter((r) => r.is_correct === false);
  const skipped = rows.filter((r) => r.is_correct === null);
  const seed = session.id;

  /* ---- a pull landed: teach the most characteristic one ---- */
  const tagged = missed.filter((r) => r.archetype && PS_TRAP_PATTERNS[r.archetype]);
  if (tagged.length > 0) {
    const score = (r) => (dna?.dominant && r.family === dna.dominant.family ? 4 : 0)
      + (r.item.meta.difficulty_dials.live_options >= 2 ? 1 : 0);
    const target = [...tagged].sort((a, b) =>
      score(b) - score(a) || a.item_id.localeCompare(b.item_id))[0];
    const pattern = PS_TRAP_PATTERNS[target.archetype];
    const distractor = target.item.question.explanation.distractors
      .find((d) => d.option === target.chosen);
    const isKnownPull = dna?.dominant && target.family === dna.dominant.family;

    return {
      lesson_kind: 'watch',
      opening: pick(seed, priorSessions === 0 ? PS_OPENINGS.first : PS_OPENINGS.watch),
      title: pattern.name,
      pattern_id: target.archetype,
      item_id: target.item_id,
      teach: {
        moment: distractor
          ? `On one paragraph, option ${target.chosen} made its move: ${distractor.seductive_element}`
          : 'On one paragraph, an option was built to invite exactly this pull, and it pulled.',
        pull: pattern.pull,
        notice: pattern.notice,
        known: isKnownPull
          ? 'This belongs to the family we have been watching. Naming it in the moment is exactly how it fades.'
          : null,
      },
      habit: target.item.question.explanation.reading_habit,
      recall: pattern.recall,
      closing: pick(`${seed}:close`, PS_LINES.keepGoing),
    };
  }

  /* ---- missed without a tag (should be rare): teach the apex habit ---- */
  if (missed.length > 0) {
    const target = missed[0];
    return {
      lesson_kind: 'watch',
      opening: pick(seed, priorSessions === 0 ? PS_OPENINGS.first : PS_OPENINGS.watch),
      title: 'Fix the claim before the options',
      pattern_id: null,
      item_id: target.item_id,
      teach: {
        moment: 'One paragraph came out with a different summary than the author would sign. The reading was fine. The claim went unfixed.',
        pull: 'Under a clock, the brain wants to let the options define the paragraph. But options are written to compete, and whichever is read last feels most familiar. The author had one claim, at one strength, with one reach, and only fixing it first makes the options answer to it.',
        notice: target.item.question.explanation.reading_habit,
        known: null,
      },
      habit: target.item.question.explanation.reading_habit,
      recall: {
        question: 'Before reading any option, what three things do you fix?',
        answer: 'The claim, its reach, and its strength. Then the options compete against the author instead of against each other.',
      },
      closing: pick(`${seed}:close`, PS_LINES.keepGoing),
    };
  }

  /* ---- nothing missed, but a paragraph set aside ---- */
  if (skipped.length > 0) {
    const target = skipped[0];
    return {
      lesson_kind: 'skipped',
      opening: pick(seed, priorSessions === 0 ? PS_OPENINGS.first : PS_OPENINGS.skipped),
      title: 'A way into the one you set aside',
      pattern_id: null,
      item_id: target.item_id,
      teach: {
        moment: 'You set one paragraph aside. Fair choice under a clock. Here is the way in for next time.',
        pull: target.item.question.explanation.paragraph_meaning,
        notice: target.item.question.explanation.reading_habit,
        known: null,
      },
      habit: target.item.question.explanation.reading_habit,
      recall: {
        question: 'A paragraph feels impenetrable. What is the first move?',
        answer: 'Find the sentence the others serve. Once the claim is fixed, its reach and strength follow, and the options sort themselves.',
      },
      closing: pick(`${seed}:close`, PS_LINES.keepGoing),
    };
  }

  /* ---- a clean set: celebrate the understanding, keep the move ---- */
  const setItems = [...items.values()];
  const familiesPresent = new Set(setItems.flatMap((i) =>
    i.question.explanation.distractors
      .map((d) => PS_TRAP_PATTERNS[d.archetype]?.family)
      .filter(Boolean)));
  const walkedPast = dna?.dominant && familiesPresent.has(dna.dominant.family);
  const hardest = [...setItems].sort(
    (a, b) => b.meta.difficulty_numeric - a.meta.difficulty_numeric
      || a.meta.id.localeCompare(b.meta.id))[0];
  const walkedPastPattern = walkedPast
    ? setItems.flatMap((i) => i.question.explanation.distractors)
      .map((d) => PS_TRAP_PATTERNS[d.archetype])
      .find((p) => p && p.family === dna.dominant.family)
    : null;

  return {
    lesson_kind: 'mastery',
    opening: pick(seed, priorSessions === 0 ? PS_OPENINGS.first
      : (walkedPast ? PS_OPENINGS.growth : PS_OPENINGS.mastery)),
    title: walkedPast ? 'An old pull, walked past' : 'The move that carried you',
    pattern_id: walkedPast && walkedPastPattern
      ? Object.entries(PS_TRAP_PATTERNS).find(([, p]) => p === walkedPastPattern)?.[0] ?? null
      : null,
    item_id: hardest?.meta.id ?? null,
    teach: {
      moment: walkedPast && walkedPastPattern
        ? PS_LINES.masteryWalkedPast(walkedPastPattern.name)
        : 'Every option built to reward a way of reading badly got tested against the author and set down. That is the entire skill, working.',
      pull: hardest ? `Worth keeping from this set: ${hardest.mentor.takeaway}` : 'Keep summarising exactly the way you just did.',
      notice: hardest?.question.explanation.reading_habit ?? PS_LINES.chooseNudge,
      known: null,
    },
    habit: hardest?.question.explanation.reading_habit ?? null,
    recall: walkedPast && walkedPastPattern
      ? walkedPastPattern.recall
      : {
          question: 'What made your last clean summary set clean?',
          answer: hardest?.question.explanation.reading_habit
            ?? 'The claim, its reach and its strength were fixed before any option was believed.',
        },
    closing: pick(`${seed}:close`, PS_LINES.keepGoing),
  };
}

/** The record persisted for every PS lesson — same learning store shape
 *  lesson.js writes, plus module + item_id so surfaces can link back. */
export function psLessonRecord(lesson, session, day) {
  return {
    id: `lesson:${session.id}`,
    kind: 'lesson',
    module: 'ps',
    session_id: session.id,
    passage_id: session.passage_id,
    item_id: lesson.item_id ?? null,
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
