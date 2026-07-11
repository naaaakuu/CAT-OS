/**
 * tiers.js — the Odd One Out learning ladder. Pure logic, no DOM,
 * no storage.
 *
 * Eight tiers, each with a distinct design contract from the
 * ODD_MAN_OUT_BIBLE: difficulty is a vector whose PRIMARY lever is
 * topical overlap between outlier and core (§6), and the learner
 * progression it trains runs topic matching → construction first →
 * relatedness versus belonging → trap resistance → subtle violations
 * under maximal camouflage (§9). Each tier teaches ONE structural
 * reading skill before the next raises the pressure. Like the RC, PJ
 * and PS journeys: tiers recommend an order; nothing is ever locked.
 *
 * The first three tiers run in CONSTRUCT mode — the Paragraph Builder:
 * the learner arranges the four connected sentences and the one left
 * out becomes the exclusion, so construction skill forms before
 * elimination skill (the owner's Paragraph Builder requirement and the
 * Bible's §7 remediation). From Advanced up the surface is the exam's:
 * name the sentence that does not belong. The Think coach and the
 * build first protocol stay available throughout.
 */

export const OOO_TIERS = Object.freeze([
  {
    id: 'foundation',
    label: 'Foundation',
    numeric: 1,
    mode: 'construct',
    skill: 'See the paragraph inside the five',
    description: 'Start here. Friendly sentences, and an odd one that stands visibly apart. You learn that four of the five were always one paragraph.',
  },
  {
    id: 'easy',
    label: 'Easy',
    numeric: 2,
    mode: 'construct',
    skill: 'Build before you judge',
    description: 'The odd sentence now shares the topic. You learn the protocol that carries every level after this: build the four, then test the fifth.',
  },
  {
    id: 'medium',
    label: 'Medium',
    numeric: 4,
    mode: 'construct',
    skill: 'Same words, different job',
    description: 'The first engineered camouflage. The intruder borrows the paragraph’s own vocabulary, and keyword matching starts costing marks here.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    numeric: 6,
    mode: 'exclude',
    skill: 'Test the ties, not the tone',
    description: 'The exam surface begins, and so do the decoys: a belonging sentence dressed to look odd. You learn to check anchors instead of trusting feel.',
  },
  {
    id: 'cat',
    label: 'CAT',
    numeric: 7,
    mode: 'exclude',
    skill: 'Hold the whole paragraph',
    description: 'Real exam texture. The intruder joins one sentence smoothly and serves no global purpose, so only the whole paragraph can convict it.',
  },
  {
    id: 'cat-plus',
    label: 'CAT+',
    numeric: 8,
    mode: 'exclude',
    skill: 'Both traps at once',
    description: 'A camouflaged intruder and a costumed resident in the same five. Only the removal test separates them.',
  },
  {
    id: 'ninety-nine',
    label: '99 Percentile',
    numeric: 9,
    mode: 'exclude',
    skill: 'The finest branch',
    description: 'Micro shifts of scope, stance and dimension under maximal overlap. This is elite territory, and it is where the skill becomes yours.',
  },
  {
    id: 'premium',
    label: 'Premium',
    numeric: 10,
    mode: 'exclude',
    skill: 'Everything at once',
    description: 'The signature items. Dense abstraction, every surface signal weaponised, and exactly one sentence with no seat. Solve these and the exam feels calm.',
  },
]);

const TIER_INDEX = new Map(OOO_TIERS.map((t, i) => [t.id, i]));

export function tierIndex(tierId) {
  return TIER_INDEX.get(tierId) ?? OOO_TIERS.length; // unknown tiers sort last
}

export function tierInfo(tierId) {
  return OOO_TIERS.find((t) => t.id === tierId)
    ?? { id: tierId, label: tierId, numeric: 5, mode: 'exclude', skill: '', description: '' };
}

/** Whether this tier solves in Paragraph Builder mode. */
export function tierMode(tierId) {
  return tierInfo(tierId).mode;
}

/** Registry items in journey order: tier ladder, then numeric, then id. */
export function oooJourneyOrder(items) {
  return [...items].sort((a, b) =>
    (tierIndex(a.tier) - tierIndex(b.tier))
    || ((a.difficulty_numeric ?? 5) - (b.difficulty_numeric ?? 5))
    || a.id.localeCompare(b.id));
}

/** Ordered items grouped by tier → [{tier, items}] for the browser. */
export function groupByTier(items) {
  const ordered = oooJourneyOrder(items);
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
 * @param {Array} items    OOO registry items
 * @param {Set}   solvedIds item ids with at least one correct answer
 * @param {Set}   triedIds  item ids attempted at all
 * @returns {{item: object, tier: object, reason: string} | null}
 */
export function recommendNextOOO(items, solvedIds, triedIds) {
  if (items.length === 0) return null;
  const ordered = oooJourneyOrder(items);

  const fresh = ordered.find((i) => !triedIds.has(i.id));
  if (fresh) {
    const tier = tierInfo(fresh.tier);
    const reason = triedIds.size === 0
      ? 'The start of your detection journey.'
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
    reason: 'Everything is solved. Revisiting the hardest keeps the skill warm.',
  };
}
