/**
 * wd-lesson.js — the One Lesson Rule for Word DNA.
 *
 * After every set the mentor teaches exactly ONE thing: the single
 * observation most likely to change how the next word gets met.
 * Deterministic throughout, like lesson.js and pj-lesson.js: same
 * session in, same sentences out.
 *
 * Lesson records land in the same learning store shape lesson.js uses,
 * so the twenty-second recall system (pickRecall, retire-at-3) works on
 * Word DNA lessons with no changes — a root met today can open
 * tomorrow's reading session, exactly how the skill is meant to travel.
 */

import { WD_OPENINGS, WD_LINES, pick } from './wd-voice.js';
import { enrichWDAnswers } from './wd-dna.js';

/* Why each Apply trap tempts, in the mentor's own words — small and
 * closed (three trap types only, WORD_DNA_BIBLE §4), unlike the larger
 * per-trap libraries other modules keep, because Word DNA's content
 * already carries the specific "why wrong" reasoning per option. */
export const TRAP_NOTES = Object.freeze({
  literal_only: 'The pull here is translating too literally, stopping at the root\'s bare meaning instead of asking how the whole word actually gets used.',
  wrong_root: 'The pull here is borrowing a nearby word\'s sense instead of this one\'s. Two words can share a family and still not share a meaning.',
  context_mismatch: 'The pull here is the word\'s most common sense arriving first and uninvited, before the sentence around it gets a real vote.',
});

/**
 * Choose the one lesson for a finished Word DNA session.
 * @param {object} session   the persisted WD session record
 * @param {Map}    items     item_id -> loaded Word DNA content item (this set)
 * @param {object} dna       deriveWDDNA() over PRIOR sessions (may be empty)
 * @param {number} priorSessions how many WD sessions existed before this one
 */
export function chooseWDLesson({ session, items, dna, priorSessions = 0 }) {
  const rows = enrichWDAnswers([session], items);
  const seed = session.id;

  /* ---- an Apply/transfer choice missed: the signature teaching moment ---- */
  const applyMissed = rows.flatMap((r) => r.applies
    .map((a, i) => ({ row: r, apply: a, challenge: r.item.discovery.applies[i] }))
    .filter(({ apply }) => apply && apply.is_correct === false));
  if (applyMissed.length > 0) {
    const target = applyMissed[0];
    const trapText = target.challenge.options[target.apply.chosen_index]?.trap;
    const trapNote = TRAP_NOTES[trapText] ?? 'The pull here is reaching for a familiar meaning before checking whether this word actually earned it.';

    return {
      lesson_kind: 'watch',
      opening: pick(seed, priorSessions === 0 ? WD_OPENINGS.first : WD_OPENINGS.watch),
      title: `Meeting ${target.challenge.held_out_word}`,
      pattern_id: 'meaning_transfer',
      item_id: target.row.item_id,
      teach: {
        moment: `"${target.challenge.held_out_word}" was never taught outright, on purpose. It was the test of whether the pattern had actually transferred.`,
        pull: trapNote,
        notice: target.row.item.unit.mentor_note,
        known: null,
      },
      closing: pick(`${seed}:close`, WD_LINES.keepGoing),
    };
  }

  /* ---- a Predict choice missed: teach noticing, using this unit's own note ---- */
  const predictMissed = rows.filter((r) => r.predict && r.predict.is_correct === false);
  if (predictMissed.length > 0) {
    const target = predictMissed[0];
    return {
      lesson_kind: 'watch',
      opening: pick(seed, priorSessions === 0 ? WD_OPENINGS.first : WD_OPENINGS.watch),
      title: `Noticing ${target.item.unit.label}`,
      pattern_id: 'root_recognition',
      item_id: target.item_id,
      teach: {
        moment: `The shared piece in ${target.item.unit.label} did not give itself away on the first guess.`,
        pull: 'A shared root, prefix, or suffix is easy to miss when the words around it look unrelated at a glance.',
        notice: target.item.discovery.understand_note,
        known: null,
      },
      closing: pick(`${seed}:close`, WD_LINES.keepGoing),
    };
  }

  /* ---- nothing missed, but a unit set aside ---- */
  const skipped = rows.filter((r) => r.is_correct === null && r.predict === null);
  if (skipped.length > 0) {
    const target = skipped[0];
    return {
      lesson_kind: 'skipped',
      opening: pick(seed, priorSessions === 0 ? WD_OPENINGS.first : WD_OPENINGS.skipped),
      title: `A way into ${target.item.unit.label}`,
      pattern_id: null,
      item_id: target.item_id,
      teach: {
        moment: 'You set one family aside today. Fair choice. Here is the way in for next time.',
        pull: target.item.unit.mentor_note,
        notice: target.item.discovery.understand_note,
        known: null,
      },
      closing: pick(`${seed}:close`, WD_LINES.keepGoing),
    };
  }

  /* ---- a clean set: celebrate the understanding, keep the move ---- */
  const setItems = [...items.values()];
  const hardest = [...setItems].sort(
    (a, b) => (b.members?.length ?? 0) - (a.members?.length ?? 0)
      || a.meta.id.localeCompare(b.meta.id))[0];
  const isGrowth = priorSessions > 0 && (dna?.observations ?? []).some((o) => o.kind === 'growth');

  return {
    lesson_kind: 'mastery',
    opening: pick(seed, priorSessions === 0 ? WD_OPENINGS.first : (isGrowth ? WD_OPENINGS.growth : WD_OPENINGS.mastery)),
    title: isGrowth ? 'A pattern, trusted' : 'The move that carried you',
    pattern_id: null,
    item_id: hardest?.meta.id ?? null,
    teach: {
      moment: isGrowth ? WD_LINES.masteryWalkedPast()
        : 'Every prediction and every transfer test in this set landed. That is the whole skill, working.',
      pull: hardest ? `Worth keeping from this set: ${hardest.unit.mentor_note}` : 'Keep meeting words exactly the way you just did.',
      notice: hardest?.discovery.understand_note ?? null,
      known: null,
    },
    closing: pick(`${seed}:close`, WD_LINES.keepGoing),
  };
}

/** The record persisted for every Word DNA lesson — same learning-store
 *  shape lesson.js writes, plus module + item_id so surfaces can link back. */
export function wdLessonRecord(lesson, session, day) {
  return {
    id: `lesson:${session.id}`,
    kind: 'lesson',
    module: 'wd',
    session_id: session.id,
    passage_id: session.passage_id,
    item_id: lesson.item_id ?? null,
    pattern_id: lesson.pattern_id ?? null,
    lesson_kind: lesson.lesson_kind,
    title: lesson.title,
    recall: {
      question: lesson.teach.notice ? `What made "${lesson.title.toLowerCase()}" click?` : `What is worth keeping from ${lesson.title.toLowerCase()}?`,
      answer: lesson.teach.notice ?? lesson.teach.pull,
    },
    day,
    created_at: session.finished_at,
    recalled_at: null,
    recall_count: 0,
  };
}
