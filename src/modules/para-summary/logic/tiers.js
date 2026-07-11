/**
 * tiers.js — the Para Summary learning ladder. Pure logic, no DOM,
 * no storage.
 *
 * Eight tiers, each with a distinct design contract from the
 * PARA SUMMARY BIBLE §5: difficulty is a setting across eight dials,
 * and each tier turns specific dials while teaching ONE reading skill
 * before the next tier raises the pressure. The Bible names the
 * discriminating feature of each level; the ladder is built so each
 * step trains exactly that feature. Like the RC and PJ journeys:
 * tiers recommend an order; nothing is ever locked.
 */

export const PS_TIERS = Object.freeze([
  {
    id: 'foundation',
    label: 'Foundation',
    numeric: 1,
    skill: 'Hear the claim, not the topic',
    description: 'Start here. Friendly paragraphs with a clear point. You learn the difference between what a paragraph is about and what it asserts.',
  },
  {
    id: 'easy',
    label: 'Easy',
    numeric: 2,
    skill: 'Resist the example',
    description: 'The paragraphs stay warm, but now the most vivid sentence is never the point. You learn to summarise the idea, not the picture.',
  },
  {
    id: 'medium',
    label: 'Medium',
    numeric: 4,
    skill: 'Evidence serves the claim',
    description: 'The first engineered traps appear. Data, familiar words and half true options will invite you here.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    numeric: 6,
    skill: 'Find the turn',
    description: 'Paragraphs begin with views their authors reject, and the turn goes quiet. You learn to locate the claim by function, not position.',
  },
  {
    id: 'cat',
    label: 'CAT',
    numeric: 7,
    skill: 'Keep every qualifier',
    description: 'Real exam texture. Abstract argument, hedged claims, and options that differ from the truth by one dropped limiter.',
  },
  {
    id: 'cat-plus',
    label: 'CAT+',
    numeric: 8,
    skill: 'Hold the stance',
    description: 'The author’s position is carried by word choice alone, and the most dangerous options are true but neutral. Two options stay live.',
  },
  {
    id: 'ninety-nine',
    label: '99 Percentile',
    numeric: 9,
    skill: 'One word decides',
    description: 'Two finalists survive to the end of every item, separated by a single element of scope or certainty. This is elite territory.',
  },
  {
    id: 'premium',
    label: 'Premium',
    numeric: 10,
    skill: 'Everything at once',
    description: 'The signature items. Layered subtle distortions, near identical finalists, and paragraphs that argue against what you already believe.',
  },
]);

const TIER_INDEX = new Map(PS_TIERS.map((t, i) => [t.id, i]));

export function tierIndex(tierId) {
  return TIER_INDEX.get(tierId) ?? PS_TIERS.length; // unknown tiers sort last
}

export function tierInfo(tierId) {
  return PS_TIERS.find((t) => t.id === tierId)
    ?? { id: tierId, label: tierId, numeric: 5, skill: '', description: '' };
}

/** Registry items in journey order: tier ladder, then numeric, then id. */
export function psJourneyOrder(items) {
  return [...items].sort((a, b) =>
    (tierIndex(a.tier) - tierIndex(b.tier))
    || ((a.difficulty_numeric ?? 5) - (b.difficulty_numeric ?? 5))
    || a.id.localeCompare(b.id));
}

/** Ordered items grouped by tier → [{tier, items}] for the browser. */
export function groupByTier(items) {
  const ordered = psJourneyOrder(items);
  const groups = [];
  for (const item of ordered) {
    const last = groups[groups.length - 1];
    if (last && last.tier === item.tier) last.items.push(item);
    else groups.push({ tier: item.tier ?? 'medium', items: [item] });
  }
  return groups;
}

/**
 * Recommend what to practice next, with the reason stated (never locked).
 * @param {Array} items    PS registry items
 * @param {Set}   solvedIds item ids with at least one correct answer
 * @param {Set}   triedIds  item ids attempted at all
 * @returns {{item: object, tier: object, reason: string} | null}
 */
export function recommendNextPS(items, solvedIds, triedIds) {
  if (items.length === 0) return null;
  const ordered = psJourneyOrder(items);

  const fresh = ordered.find((i) => !triedIds.has(i.id));
  if (fresh) {
    const tier = tierInfo(fresh.tier);
    const reason = triedIds.size === 0
      ? 'The start of your summary journey.'
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
    reason: 'Everything is solved. Re-reading the hardest keeps the skill warm.',
  };
}
