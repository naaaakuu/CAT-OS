/**
 * pj-lesson.js — the One Lesson Rule for Para Jumbles.
 *
 * After every jumble set the mentor teaches exactly ONE thing: the
 * single observation most likely to change the next set. Deterministic
 * throughout, like lesson.js: same session in, same sentences out.
 *
 * Lesson records land in the same learning store shape lesson.js uses,
 * so the twenty-second recall system (pickRecall, retire-at-3) works on
 * jumble lessons with no changes — a PJ insight can open tomorrow's
 * reading session, which is exactly how the skill transfers.
 */

import { PJ_OPENINGS, PJ_TRAP_PATTERNS, PJ_LINES, pick } from './pj-voice.js';
import { enrichPJAnswers } from './pj-dna.js';

/**
 * Choose the one lesson for a finished PJ session.
 * @param {object} session   the persisted PJ session record
 * @param {Map}    items     item_id -> loaded PJ content item (this set)
 * @param {object} dna       derivePJDNA() over PRIOR sessions (may be empty)
 * @param {number} priorSessions how many PJ sessions existed before this one
 */
export function choosePJLesson({ session, items, dna, priorSessions = 0 }) {
  const rows = enrichPJAnswers([session], items);
  const missed = rows.filter((r) => r.is_correct === false);
  const skipped = rows.filter((r) => r.is_correct === null);
  const seed = session.id;

  /* ---- a pull appeared: teach the most characteristic one ---- */
  const trapped = missed.filter((r) => r.trap && PJ_TRAP_PATTERNS[r.trap]);
  if (trapped.length > 0) {
    const score = (r) => (dna?.dominant && r.trap === dna.dominant.trap ? 4 : 0)
      + (r.item.meta.heuristic_adversarial ? 1 : 0);
    const target = [...trapped].sort((a, b) =>
      score(b) - score(a) || a.item_id.localeCompare(b.item_id))[0];
    const pattern = PJ_TRAP_PATTERNS[target.trap];
    const enteredStr = Array.isArray(target.entered) ? target.entered.join('') : '';
    const temptation = target.item.explanation.tempting_orders
      .find((t) => t.order === enteredStr);
    const isKnownPull = dna?.dominant && target.trap === dna.dominant.trap;

    return {
      lesson_kind: 'watch',
      opening: pick(seed, priorSessions === 0 ? PJ_OPENINGS.first : PJ_OPENINGS.watch),
      title: pattern.name,
      pattern_id: target.trap,
      item_id: target.item_id,
      teach: {
        moment: temptation
          ? `On one jumble, the order ${enteredStr} made its move: ${temptation.why_tempting}`
          : `On one jumble, the sentences were built to invite exactly this pull, and it pulled.`,
        pull: pattern.pull,
        notice: pattern.notice,
        known: isKnownPull
          ? 'This is the pull we have been watching. Naming it in the moment is exactly how it fades.'
          : null,
      },
      habit: target.item.explanation.solving_habit,
      recall: pattern.recall,
      closing: pick(`${seed}:close`, PJ_LINES.keepGoing),
    };
  }

  /* ---- missed without a nameable trap: teach the macro habit ---- */
  if (missed.length > 0) {
    const target = missed[0];
    return {
      lesson_kind: 'watch',
      opening: pick(seed, priorSessions === 0 ? PJ_OPENINGS.first : PJ_OPENINGS.watch),
      title: 'Shape first, sentences second',
      pattern_id: null,
      item_id: target.item_id,
      teach: {
        moment: 'One paragraph came out in a different order than the author wrote it. The sentences were fine. The shape went missing.',
        pull: 'Under a clock, the brain wants to join sentences in pairs and be done. But pairs are local, and a paragraph is global. The author had one arc in mind, and only that arc makes every join work at once.',
        notice: target.item.explanation.solving_habit,
        known: null,
      },
      habit: target.item.explanation.solving_habit,
      recall: {
        question: 'Before ordering any sentences, what should you name first?',
        answer: 'The paragraph’s shape. General to specific, problem to solution, claim to evidence. The arc decides; the signals only advise.',
      },
      closing: pick(`${seed}:close`, PJ_LINES.keepGoing),
    };
  }

  /* ---- nothing missed, but a jumble set aside ---- */
  if (skipped.length > 0) {
    const target = skipped[0];
    return {
      lesson_kind: 'skipped',
      opening: pick(seed, priorSessions === 0 ? PJ_OPENINGS.first : PJ_OPENINGS.skipped),
      title: 'A way into the one you set aside',
      pattern_id: null,
      item_id: target.item_id,
      teach: {
        moment: 'You set one jumble aside. Fair choice under a clock. Here is the way in for next time.',
        pull: target.item.explanation.macro_pattern_note,
        notice: target.item.explanation.solving_habit,
        known: null,
      },
      habit: target.item.explanation.solving_habit,
      recall: {
        question: 'A jumble looks impenetrable. What is the first move?',
        answer: 'Name its shape before touching any sentence. Once the arc is named, the openers and endings sort themselves.',
      },
      closing: pick(`${seed}:close`, PJ_LINES.keepGoing),
    };
  }

  /* ---- a clean set: celebrate the understanding, keep the move ---- */
  const setItems = [...items.values()];
  const trapsPresent = new Set(setItems.flatMap((i) => [
    ...(i.meta.primary_trap !== 'none' ? [i.meta.primary_trap] : []),
    ...i.meta.secondary_traps,
  ]));
  const walkedPast = dna?.dominant && trapsPresent.has(dna.dominant.trap)
    ? PJ_LINES.masteryWalkedPast(PJ_TRAP_PATTERNS[dna.dominant.trap].name)
    : null;
  const hardest = [...setItems].sort(
    (a, b) => b.meta.difficulty_numeric - a.meta.difficulty_numeric
      || a.meta.id.localeCompare(b.meta.id))[0];

  return {
    lesson_kind: 'mastery',
    opening: pick(seed, priorSessions === 0 ? PJ_OPENINGS.first
      : (walkedPast ? PJ_OPENINGS.growth : PJ_OPENINGS.mastery)),
    title: walkedPast ? 'An old pull, walked past' : 'The move that carried you',
    pattern_id: walkedPast ? dna.dominant.trap : null,
    item_id: hardest?.meta.id ?? null,
    teach: {
      moment: walkedPast ?? 'Every pairing that was built to tempt you got tested against the whole paragraph and set down. That is the entire skill, working.',
      pull: hardest ? `Worth keeping from this set: ${hardest.mentor.takeaway}` : 'Keep solving exactly the way you just did.',
      notice: hardest?.explanation.solving_habit ?? PJ_LINES.verifyNudge,
      known: null,
    },
    habit: hardest?.explanation.solving_habit ?? null,
    recall: walkedPast && dna?.dominant
      ? PJ_TRAP_PATTERNS[dna.dominant.trap].recall
      : {
          question: 'What made your last clean jumble set clean?',
          answer: hardest?.explanation.solving_habit
            ?? 'Every tempting pairing was tested against the whole paragraph before it was believed.',
        },
    closing: pick(`${seed}:close`, PJ_LINES.keepGoing),
  };
}

/** The record persisted for every PJ lesson — same learning-store shape
 *  lesson.js writes, plus module + item_id so surfaces can link back. */
export function pjLessonRecord(lesson, session, day) {
  return {
    id: `lesson:${session.id}`,
    kind: 'lesson',
    module: 'pj',
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
