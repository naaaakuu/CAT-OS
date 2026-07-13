/**
 * tree.js — the Word DNA Language Tree. Pure logic, no DOM, no storage.
 *
 * Unlike Para Jumbles/Summary/Odd One Out, Word DNA is not organized as
 * a difficulty ladder (WORD_DNA_BIBLE §2): the brief asks for a tree,
 * not a ladder, because lineage — not difficulty — is the organizing
 * idea. Six branches, fixed order, every branch always visible and
 * always tappable; nothing locks, the same principle as every other
 * CAT OS journey.
 */

export const BRANCHES = Object.freeze([
  { id: 'root',      label: 'Roots',          noun: 'root',     description: 'One ancient idea, and every word built on it.' },
  { id: 'prefix',    label: 'Prefixes',       noun: 'prefix',   description: 'What gets added to the front, and what it changes.' },
  { id: 'suffix',    label: 'Suffixes',       noun: 'suffix',   description: 'What gets added to the end, and what it changes.' },
  { id: 'foreign',   label: 'Foreign Words',  noun: 'group',    description: 'Words English simply borrowed, whole, from somewhere else.' },
  { id: 'cat_vocab', label: 'CAT Vocabulary', noun: 'set',      description: 'Words worth meeting on their own terms.' },
  { id: 'confused',  label: 'Frequently Confused Words', noun: 'set', description: 'Coming soon.' },
]);

const BRANCH_INDEX = new Map(BRANCHES.map((b, i) => [b.id, i]));

export function branchIndex(kind) {
  const i = BRANCH_INDEX.get(kind);
  return i === undefined ? BRANCHES.length : i; // unknown kinds sort last, never crash
}

export function branchInfo(kind) {
  return BRANCHES.find((b) => b.id === kind) ?? { id: kind, label: kind, noun: 'set', description: '' };
}

/** Registry items in Tree order: branch order, then title. */
export function wdTreeOrder(items) {
  return [...items].sort((a, b) =>
    (branchIndex(a.kind) - branchIndex(b.kind)) || a.title.localeCompare(b.title));
}

/** Ordered items grouped by branch → [{kind, items}] for the Tree screen. */
export function groupByBranch(items) {
  const ordered = wdTreeOrder(items);
  const groups = [];
  for (const item of ordered) {
    const last = groups[groups.length - 1];
    if (last && last.kind === item.kind) last.items.push(item);
    else groups.push({ kind: item.kind, items: [item] });
  }
  return groups;
}

/**
 * Recommend what to meet next, with the reason stated (never locked).
 * Returned shape mirrors recommendNextPJ/PS/OOO (`tier` names the
 * branch here) so Home's module-aware "Continue" card needs no
 * Word-DNA-specific case.
 * @param {Array} items    Word DNA registry items
 * @param {Set}   solvedIds item ids fully understood at least once
 * @param {Set}   triedIds  item ids attempted at all
 * @returns {{item: object, tier: {label: string}, reason: string} | null}
 */
export function recommendNextWD(items, solvedIds, triedIds) {
  if (items.length === 0) return null;
  const ordered = wdTreeOrder(items);

  const fresh = ordered.find((i) => !triedIds.has(i.id));
  if (fresh) {
    const branch = branchInfo(fresh.kind);
    const reason = triedIds.size === 0
      ? 'The start of your Word DNA journey.'
      : `Next in ${branch.label}.`;
    return { item: fresh, tier: { label: branch.label }, reason };
  }

  const unsolved = ordered.find((i) => !solvedIds.has(i.id));
  if (unsolved) {
    return {
      item: unsolved,
      tier: { label: branchInfo(unsolved.kind).label },
      reason: 'One that got away. Worth another look with fresh eyes.',
    };
  }

  return {
    item: ordered[ordered.length - 1],
    tier: { label: branchInfo(ordered[ordered.length - 1].kind).label },
    reason: 'Every family so far is understood. Revisiting keeps the pattern sharp.',
  };
}
