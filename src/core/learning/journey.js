/**
 * journey.js — the learning progression. Pure logic, no DOM, no storage.
 *
 * Principles (Reading Mentor milestone, recorded in STATUS.md):
 * - Stages RECOMMEND an order. One exception, the owner's (2026-10-31): in
 *   Chai's library a shelf opens once half the shelf below it has been read
 *   (`libraryShelves`), so the climb from Foundation to Elite is earned.
 * - The reader should always be able to see WHY a passage is suggested,
 *   so every recommendation carries a plain-English reason.
 * - Difficulty balance: never recommend a second consecutive hard
 *   passage; after a rough session, consolidate one stage down before
 *   climbing again. Legible rules over clever ones.
 */

import { byLearner } from './order.js';

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

/** Registry items in journey order: the stage ladder, and inside a stage this learner's own order (order.js). */
export function journeyOrder(items) {
  return [...items].sort((a, b) =>
    (stageIndex(a.stage) - stageIndex(b.stage))
    || byLearner(a, b));
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

/* ------------------------------------------------------------------ */
/* Chai's library (owner, 2026-10-31)                                  */
/* ------------------------------------------------------------------ */

/** A shelf opens once this share of the shelf below it has been read. */
export const SHELF_OPENS_AT = 0.5;

/**
 * The library: every passage is a book, one shelf per stage, Foundation at
 * the bottom and Elite at the top; inside a shelf, this learner's own order
 * (groupByStage), numbered from 1. Derived from the records alone: nothing
 * here is stored.
 *
 *   book.clean  the best share right in any finished run of it (0 unread):
 *               all right gleams, half right is half dusty, none stays dusty
 *   shelf.open  Foundation always; any other once SHELF_OPENS_AT of the
 *               shelf below has been read (`need` books, `toGo` still to read)
 *   owl         the book Chai waits beside: the next unread book to the right
 *               of the last one read, else the first unread book on the
 *               lowest open shelf, else the dustiest open book; null once
 *               every book gleams
 *
 * @param {Array} items     RC registry rows
 * @param {Array} sessions  every session record (anything else is skipped)
 */
export function libraryShelves(items, sessions) {
  const runs = new Map(); // passage id -> { clean, at }
  for (const s of Array.isArray(sessions) ? sessions : []) {
    if (!s || typeof s !== 'object' || s.module || typeof s.passage_id !== 'string') continue;
    const total = Number(s.score?.total), correct = Number(s.score?.correct);
    if (!(total > 0) || !Number.isFinite(correct)) continue;
    const clean = Math.max(0, Math.min(1, correct / total));
    const at = String(s.finished_at ?? '');
    const prev = runs.get(s.passage_id);
    runs.set(s.passage_id, { clean: Math.max(prev?.clean ?? 0, clean), at: prev && prev.at > at ? prev.at : at });
  }
  const shelves = groupByStage(Array.isArray(items) ? items.filter((x) => x && x.id) : []).map((g) => ({
    stage: g.stage,
    label: STAGE_INFO[g.stage]?.label ?? g.stage,
    books: g.items.map((item, i) => {
      const r = runs.get(item.id);
      return { id: item.id, n: i + 1, item, stage: g.stage, read: !!r, clean: r?.clean ?? 0, at: r?.at ?? '' };
    }),
  }));
  const byId = new Map();
  let open = true;
  shelves.forEach((sh, i) => {
    for (const b of sh.books) byId.set(b.id, { book: b, shelf: sh });
    sh.read = sh.books.filter((b) => b.read).length;
    sh.gleaming = sh.books.filter((b) => b.clean >= 1).length;
    sh.open = open;
    sh.below = i > 0 ? shelves[i - 1] : null;
    sh.need = sh.below ? Math.ceil(sh.below.books.length * SHELF_OPENS_AT) : 0;
    sh.toGo = sh.below ? Math.max(0, sh.need - sh.below.read) : 0;
    open = sh.open && sh.read >= Math.ceil(sh.books.length * SHELF_OPENS_AT);
  });

  let owl = null;
  const openBooks = shelves.filter((sh) => sh.open).flatMap((sh) => sh.books);
  const last = openBooks.filter((b) => b.read).sort((a, b) => b.at.localeCompare(a.at))[0];
  if (last) {
    const row = byId.get(last.id).shelf.books, k = row.indexOf(last);
    owl = row.slice(k + 1).find((b) => !b.read) ?? row.slice(0, k).find((b) => !b.read) ?? null;
  }
  if (!owl) owl = openBooks.find((b) => !b.read) ?? null;
  if (!owl) for (const b of openBooks) if (b.clean < 1 && (!owl || b.clean < owl.clean)) owl = b;

  const books = shelves.reduce((n, sh) => n + sh.books.length, 0);
  const read = shelves.reduce((n, sh) => n + sh.read, 0);
  const gleaming = shelves.reduce((n, sh) => n + sh.gleaming, 0);
  return { shelves, byId, owl, books, read, gleaming };
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
