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
  foundation:   { label: 'Foundation',   description: 'Begin here. Gentle, concrete passages that build the reading habit.' },
  developing:   { label: 'Developing',   description: 'One clean argument at a time — learn to follow a writer\'s moves.' },
  intermediate: { label: 'Intermediate', description: 'Real CAT texture: denser claims, finer distinctions.' },
  advanced:     { label: 'Advanced',     description: 'Layered arguments with qualifications worth slowing down for.' },
  elite:        { label: 'Elite',        description: 'The hardest register the exam uses. By now, you are ready for it.' },
  unstaged:     { label: 'More passages', description: '' },
});

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
  const lastWasRough = last ? (last.score.attempted > 0 && last.score.accuracy < 0.5) : false;

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
    reason: 'Your toughest passage so far — worth a second read.',
  };
}
