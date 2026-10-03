/**
 * journey.js — the learning progression. Pure logic, no DOM, no storage.
 *
 * Principles (Reading Mentor milestone, recorded in STATUS.md):
 * - Stages RECOMMEND an order; nothing is ever locked. Locking punishes
 *   curiosity and adds game mechanics this product refuses.
 * - The reader should always be able to see WHY a passage is suggested,
 *   so every recommendation carries a plain-English reason.
 * - Difficulty balance: never recommend a second consecutive hard
 *   passage; after a rough session, consolidate one stage down before
 *   climbing again. Legible rules over clever ones.
 */

export const STAGES = Object.freeze([
  'foundation', 'developing', 'intermediate', 'advanced', 'elite',
]);

/** How each stage introduces itself in the library. One reviewable
 *  place for the journey's voice: inviting, honest, never gatekeeping. */
export const STAGE_INFO = Object.freeze({
  foundation:   { label: 'Foundation',   description: 'Begin here. About 300 words in three short paragraphs, and three questions.' },
  developing:   { label: 'Developing',   description: 'Up to about 450 words: follow one clean argument from start to finish.' },
  intermediate: { label: 'Intermediate', description: 'CAT size: about 450 words, four paragraphs, four questions.' },
  advanced:     { label: 'Advanced',     description: 'CAT size, harder thinking: arguments that qualify and turn.' },
  elite:        { label: 'Elite',        description: 'The hardest arguments CAT sets, at its longest: up to 650 words.' },
  unstaged:     { label: 'More passages', description: '' },
});

/**
 * How big a passage may be at each stage. CAT 2021–2025 sets four passages
 * of about 400–450 words (the longest near 650), four questions each, so
 * nothing past Foundation asks more than four, and nothing anywhere runs
 * longer than the exam's own longest passage. Foundation is deliberately
 * smaller than the exam: a first passage is three short paragraphs.
 * The loader's consistency check holds every passage to its stage.
 */
export const STAGE_SIZE = Object.freeze({
  foundation:   { words: [150, 350], paras: [2, 3], qs: [3, 3] },
  developing:   { words: [180, 450], paras: [2, 4], qs: [3, 4] },
  intermediate: { words: [250, 520], paras: [3, 5], qs: [3, 4] },
  advanced:     { words: [280, 600], paras: [3, 5], qs: [3, 4] },
  elite:        { words: [300, 650], paras: [3, 5], qs: [3, 4] },
});

/** What makes a passage the wrong size for its stage, in words (empty when it fits). */
export function stageSizeIssues(stage, { words, paras, qs }) {
  const s = STAGE_SIZE[stage];
  if (!s) return [];
  const out = [];
  const [w0, w1] = s.words, [p0, p1] = s.paras, [q0, q1] = s.qs;
  if (words < w0 || words > w1) out.push(`${stage} passages run ${w0}–${w1} words; this has ${words}`);
  if (paras < p0 || paras > p1) out.push(`${stage} passages have ${p0}–${p1} paragraphs; this has ${paras}`);
  if (qs < q0 || qs > q1) out.push(`${stage} passages ask ${q0 === q1 ? q0 : `${q0}–${q1}`} questions; this asks ${qs}`);
  return out;
}

export function stageIndex(stage) {
  const i = STAGES.indexOf(stage);
  return i === -1 ? STAGES.length : i; // unknown stages sort last, never crash
}

/** Registry items in journey order: stage ladder, then difficulty, then id. */
export function journeyOrder(items) {
  return [...items].sort((a, b) =>
    (stageIndex(a.stage) - stageIndex(b.stage))
    || ((a.difficulty_numeric ?? 5) - (b.difficulty_numeric ?? 5))
    || a.id.localeCompare(b.id));
}

/** Group ordered items by stage → [{stage, items}] for the browser. */
export function groupByStage(items) {
  const ordered = journeyOrder(items);
  const groups = [];
  for (const item of ordered) {
    const last = groups[groups.length - 1];
    if (last && last.stage === item.stage) last.items.push(item);
    else groups.push({ stage: item.stage ?? 'unstaged', items: [item] });
  }
  return groups;
}

/**
 * Recommend what to read next, with the reason stated.
 * @param {Array} items    registry items (rc, practicable)
 * @param {Array} sessions stored session records
 * @returns {{item: object, reason: string} | null}
 */
export function recommendNext(items, sessions) {
  if (items.length === 0) return null;
  const ordered = journeyOrder(items);
  const attempted = new Set(sessions.map((s) => s.passage_id));
  const byId = new Map(items.map((i) => [i.id, i]));

  const recent = [...sessions].sort((a, b) => b.finished_at.localeCompare(a.finished_at));
  const last = recent[0] ?? null;
  const lastItem = last ? byId.get(last.passage_id) : null;
  const lastWasHard = lastItem?.difficulty === 'hard';
  const lastWasRough = last ? (last.score?.attempted > 0 && last.score?.accuracy < 0.5) : false;

  const unread = ordered.filter((i) => !attempted.has(i.id));

  if (unread.length > 0) {
    let pick = unread[0];
    let reason = `Next in your ${pick.stage} stage.`;

    // Balance rule 1: never two hard passages back to back.
    if (lastWasHard && pick.difficulty === 'hard') {
      const easier = unread.find((i) => i.difficulty !== 'hard');
      if (easier) {
        pick = easier;
        reason = 'A change of pace after a hard passage.';
      }
    }
    // Balance rule 2: after a rough session, consolidate before climbing.
    if (lastWasRough && lastItem && stageIndex(pick.stage) > stageIndex(lastItem.stage)) {
      const consolidate = unread.find((i) => stageIndex(i.stage) <= stageIndex(lastItem.stage));
      if (consolidate) {
        pick = consolidate;
        reason = 'Consolidating this stage before moving up.';
      }
    }
    if (pick === unread[0] && attempted.size === 0) {
      reason = 'The start of your reading journey.';
    }
    return { item: pick, reason };
  }

  // Everything attempted: revisit where understanding is thinnest.
  const accuracyByPassage = new Map();
  for (const s of sessions) {
    const cur = accuracyByPassage.get(s.passage_id);
    if (!cur || s.finished_at > cur.finished_at) accuracyByPassage.set(s.passage_id, s);
  }
  const weakest = ordered
    .map((i) => ({ item: i, acc: accuracyByPassage.get(i.id)?.score.accuracy ?? 1 }))
    .sort((a, b) => a.acc - b.acc)[0];
  if (!weakest) return null;
  return {
    item: weakest.item,
    reason: 'Your toughest passage so far: worth a second read.',
  };
}
