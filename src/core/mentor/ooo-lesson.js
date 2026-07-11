/**
 * ooo-lesson.js — the One Lesson Rule for Odd One Out.
 *
 * After every exclusion set the mentor teaches exactly ONE thing: the
 * single observation most likely to change the next set. Deterministic
 * throughout, like lesson.js, pj-lesson.js and ps-lesson.js: same
 * session in, same sentences out.
 *
 * Lesson records land in the same learning store shape lesson.js uses,
 * so the twenty second recall system (pickRecall, retire at 3) works on
 * detection lessons with no changes. A coherence insight can open
 * tomorrow's reading session, which is exactly how the skill transfers:
 * the Bible frames OOO as comprehension monitoring, the metacognitive
 * layer of all reading.
 */

import { OOO_OPENINGS, OOO_TRAP_PATTERNS, OOO_LINES, pick } from './ooo-voice.js';
import { enrichOOOAnswers } from './ooo-dna.js';

/**
 * Choose the one lesson for a finished OOO session.
 * @param {object} session   the persisted OOO session record
 * @param {Map}    items     item_id -> loaded OOO content item (this set)
 * @param {object} dna       deriveOOODNA() over PRIOR sessions (may be empty)
 * @param {number} priorSessions how many OOO sessions existed before this one
 */
export function chooseOOOLesson({ session, items, dna, priorSessions = 0 }) {
  const rows = enrichOOOAnswers([session], items);
  const missed = rows.filter((r) => r.is_correct === false);
  const skipped = rows.filter((r) => r.is_correct === null);
  const seed = session.id;

  /* ---- a pull landed: teach the most characteristic one ---- */
  const tagged = missed.filter((r) => r.mistake && OOO_TRAP_PATTERNS[r.mistake]);
  if (tagged.length > 0) {
    const score = (r) => (dna?.dominant && r.mistake === dna.dominant.mistake ? 4 : 0)
      + (r.item.meta.difficulty_vector.topical_overlap >= 4 ? 1 : 0);
    const target = [...tagged].sort((a, b) =>
      score(b) - score(a) || a.item_id.localeCompare(b.item_id))[0];
    const pattern = OOO_TRAP_PATTERNS[target.mistake];
    const analysis = target.item.explanation.exclusion_analysis
      .find((e) => e.label === target.chosen);
    const isKnownPull = dna?.dominant && target.mistake === dna.dominant.mistake;

    return {
      lesson_kind: 'watch',
      opening: pick(seed, priorSessions === 0 ? OOO_OPENINGS.first : OOO_OPENINGS.watch),
      title: pattern.name,
      pattern_id: target.mistake,
      item_id: target.item_id,
      teach: {
        moment: analysis
          ? `On one item, sentence ${target.chosen} made its move: ${analysis.why_tempting}`
          : 'On one item, a belonging sentence was built to invite exactly this pull, and it pulled.',
        pull: pattern.pull,
        notice: pattern.notice,
        known: isKnownPull
          ? 'This is the pull we have been watching. Naming it in the moment is exactly how it fades.'
          : null,
      },
      habit: target.item.explanation.detection_habit,
      recall: pattern.recall,
      closing: pick(`${seed}:close`, OOO_LINES.keepGoing),
    };
  }

  /* ---- missed without a tag (should be rare): teach the protocol ---- */
  if (missed.length > 0) {
    const target = missed[0];
    return {
      lesson_kind: 'watch',
      opening: pick(seed, priorSessions === 0 ? OOO_OPENINGS.first : OOO_OPENINGS.watch),
      title: 'Build the four, then test the fifth',
      pattern_id: null,
      item_id: target.item_id,
      teach: {
        moment: 'One item ended with a different sentence excluded than the one the paragraph excludes. The reading was fine. The paragraph was never built.',
        pull: 'Under a clock, the brain wants to hunt the stranger sentence by sentence. But a stranger is only visible against a household, and the household here is the four sentence paragraph. The Bible calls construction first the entire method: build the four, read them as one thought, and the fifth excludes itself.',
        notice: target.item.explanation.detection_habit,
        known: null,
      },
      habit: target.item.explanation.detection_habit,
      recall: {
        question: 'Before excluding any sentence, what must exist first?',
        answer: 'The four sentence paragraph, built and read back as one thought. The odd one is whatever that paragraph has no seat for.',
      },
      closing: pick(`${seed}:close`, OOO_LINES.keepGoing),
    };
  }

  /* ---- nothing missed, but an item set aside ---- */
  if (skipped.length > 0) {
    const target = skipped[0];
    return {
      lesson_kind: 'skipped',
      opening: pick(seed, priorSessions === 0 ? OOO_OPENINGS.first : OOO_OPENINGS.skipped),
      title: 'A way into the one you set aside',
      pattern_id: null,
      item_id: target.item_id,
      teach: {
        moment: 'You set one item aside. Fair choice under a clock. Here is the way in for next time.',
        pull: target.item.explanation.spine_note,
        notice: target.item.explanation.detection_habit,
        known: null,
      },
      habit: target.item.explanation.detection_habit,
      recall: {
        question: 'Five sentences feel equally at home. What is the first move?',
        answer: 'Find any two sentences that must be neighbours, and grow the paragraph outward from that pair. Once four hold together, the fifth has excluded itself.',
      },
      closing: pick(`${seed}:close`, OOO_LINES.keepGoing),
    };
  }

  /* ---- a clean set: celebrate the understanding, keep the move ---- */
  const setItems = [...items.values()];
  const patternsPresent = new Set(setItems.flatMap((i) =>
    i.explanation.exclusion_analysis.map((e) => e.mistake_type)));
  const walkedPast = dna?.dominant && patternsPresent.has(dna.dominant.mistake);
  const hardest = [...setItems].sort(
    (a, b) => b.meta.difficulty_numeric - a.meta.difficulty_numeric
      || a.meta.id.localeCompare(b.meta.id))[0];
  const walkedPastPattern = walkedPast ? OOO_TRAP_PATTERNS[dna.dominant.mistake] : null;

  return {
    lesson_kind: 'mastery',
    opening: pick(seed, priorSessions === 0 ? OOO_OPENINGS.first
      : (walkedPast ? OOO_OPENINGS.growth : OOO_OPENINGS.mastery)),
    title: walkedPast ? 'An old pull, walked past' : 'The move that carried you',
    pattern_id: walkedPast ? dna.dominant.mistake : null,
    item_id: hardest?.meta.id ?? null,
    teach: {
      moment: walkedPast && walkedPastPattern
        ? OOO_LINES.masteryWalkedPast(walkedPastPattern.name)
        : 'Every sentence built to invite an early exclusion got tested against the whole paragraph and kept its seat. That is the entire skill, working.',
      pull: hardest ? `Worth keeping from this set: ${hardest.mentor.takeaway}` : 'Keep detecting exactly the way you just did.',
      notice: hardest?.explanation.detection_habit ?? OOO_LINES.buildNudge,
      known: null,
    },
    habit: hardest?.explanation.detection_habit ?? null,
    recall: walkedPast && walkedPastPattern
      ? walkedPastPattern.recall
      : {
          question: 'What made your last clean exclusion set clean?',
          answer: hardest?.explanation.detection_habit
            ?? 'The four sentence paragraph was built and read back before any sentence was excluded.',
        },
    closing: pick(`${seed}:close`, OOO_LINES.keepGoing),
  };
}

/** The record persisted for every OOO lesson — same learning store shape
 *  lesson.js writes, plus module + item_id so surfaces can link back. */
export function oooLessonRecord(lesson, session, day) {
  return {
    id: `lesson:${session.id}`,
    kind: 'lesson',
    module: 'ooo',
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
