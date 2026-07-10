/**
 * tiers.js — the Para Jumbles learning ladder. Pure logic, no DOM,
 * no storage.
 *
 * Eight tiers, each with a distinct design contract from the
 * PARA_JUMBLES_BIBLE (§6 difficulty bands, §9 learning progression),
 * so every step up FEELS different, not just harder. Like the RC
 * journey: tiers recommend an order; nothing is ever locked.
 *
 * The decisive plateau the Bible names is the move from local linking
 * to macro-structure reasoning (level 2→3). The ladder is built so
 * that move happens between Medium and Advanced, and everything after
 * it trains the same global skill under more pressure.
 */

export const PJ_TIERS = Object.freeze([
  {
    id: 'beginner',
    label: 'Beginner',
    numeric: 1,
    description: 'Start here. Friendly paragraphs with clear signals. You learn what holds sentences together.',
  },
  {
    id: 'easy',
    label: 'Easy',
    numeric: 2,
    description: 'The signals are still there, but now you have to read them for meaning, not just spot them.',
  },
  {
    id: 'medium',
    label: 'Medium',
    numeric: 4,
    description: 'The first traps appear. A repeated word or a confident opener will try to mislead you here.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    numeric: 6,
    description: 'Connecting words go quiet. You start ordering by the shape of the argument itself.',
  },
  {
    id: 'cat',
    label: 'CAT',
    numeric: 7,
    description: 'Real exam texture. Abstract ideas, engineered ambiguity, and a clock in your head.',
  },
  {
    id: 'cat-plus',
    label: 'CAT+',
    numeric: 8,
    description: 'Two traps in one paragraph. Only solvers who test their pairs against the whole survive.',
  },
  {
    id: 'ninety-nine',
    label: '99 Percentile',
    numeric: 9,
    description: 'Several orders feel right locally. Exactly one survives the full read. This is elite territory.',
  },
  {
    id: 'premium',
    label: 'Premium',
    numeric: 10,
    description: 'The signature items. Every signal you trust is tested. Solve these and the exam feels calm.',
  },
]);

const TIER_INDEX = new Map(PJ_TIERS.map((t, i) => [t.id, i]));

export function tierIndex(tierId) {
  return TIER_INDEX.get(tierId) ?? PJ_TIERS.length; // unknown tiers sort last
}

export function tierInfo(tierId) {
  return PJ_TIERS.find((t) => t.id === tierId)
    ?? { id: tierId, label: tierId, numeric: 5, description: '' };
}

/** Registry items in journey order: tier ladder, then numeric, then id. */
export function pjJourneyOrder(items) {
  return [...items].sort((a, b) =>
    (tierIndex(a.tier) - tierIndex(b.tier))
    || ((a.difficulty_numeric ?? 5) - (b.difficulty_numeric ?? 5))
    || a.id.localeCompare(b.id));
}

/** Ordered items grouped by tier → [{tier, items}] for the browser. */
export function groupByTier(items) {
  const ordered = pjJourneyOrder(items);
  const groups = [];
  for (const item of ordered) {
    const last = groups[groups.length - 1];
    if (last && last.tier === item.tier) last.items.push(item);
    else groups.push({ tier: item.tier ?? 'medium', items: [item] });
  }
  return groups;
}

/**
 * Recommend what to solve next, with the reason stated (never locked).
 * @param {Array} items    PJ registry items
 * @param {Set}   solvedIds item ids with at least one correct solve
 * @param {Set}   triedIds  item ids attempted at all
 * @returns {{item: object, tier: object, reason: string} | null}
 */
export function recommendNextPJ(items, solvedIds, triedIds) {
  if (items.length === 0) return null;
  const ordered = pjJourneyOrder(items);

  const fresh = ordered.find((i) => !triedIds.has(i.id));
  if (fresh) {
    const tier = tierInfo(fresh.tier);
    const reason = triedIds.size === 0
      ? 'The start of your ordering journey.'
      : `Next in your ${tier.label} tier.`;
    return { item: fresh, tier, reason };
  }

  const unsolved = ordered.find((i) => !solvedIds.has(i.id));
  if (unsolved) {
    return {
      item: unsolved,
      tier: tierInfo(unsolved.tier),
      reason: 'One that got away. Worth another look with fresh eyes.',
    };
  }

  return {
    item: ordered[ordered.length - 1],
    tier: tierInfo(ordered[ordered.length - 1].tier),
    reason: 'Everything is solved. Re-solving the hardest keeps the skill warm.',
  };
}
