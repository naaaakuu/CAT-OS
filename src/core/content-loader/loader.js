/**
 * loader.js — loads and validates content JSON.
 *
 * Content lives in content/ as pure data (Rule 2) and is fetched with
 * DOCUMENT-RELATIVE paths ("content/…", no leading slash) so the app
 * works from a GitHub Pages subpath. Offline, these fetches are served
 * by the service worker's content cache.
 *
 * Every passage is validated against its schema version BEFORE it
 * reaches any screen: malformed content fails loudly here, at the
 * boundary, instead of half-rendering (TECH_STACK.md: "schema
 * validation catches malformed content early").
 *
 * Consistency checks beyond the schema (cross-field truths a JSON
 * schema can't express) also live here: id/filename agreement,
 * question_count agreement, per-question id prefixes, and
 * question_types coverage.
 */

import { validate } from './validator.js';

export class ContentError extends Error {
  constructor(message, issues = []) {
    super(issues.length ? `${message}\n- ${issues.join('\n- ')}` : message);
    this.name = 'ContentError';
    this.issues = issues;
  }
}

/** Cache schemas per session; they are immutable files. */
const schemaCache = new Map();

async function fetchJSON(path) {
  let res;
  try {
    res = await fetch(path);
  } catch (cause) {
    throw new ContentError(`Could not fetch ${path} (offline and not cached?).`);
  }
  if (!res.ok) throw new ContentError(`Could not fetch ${path} (HTTP ${res.status}).`);
  try {
    return await res.json();
  } catch {
    throw new ContentError(`${path} is not valid JSON.`);
  }
}

async function loadSchema(name) {
  if (!schemaCache.has(name)) {
    schemaCache.set(name, await fetchJSON(`content/schema/${name}`));
  }
  return schemaCache.get(name);
}

/** The registry: one entry per content item ever created. */
export function loadRegistry() {
  return fetchJSON('content/index.json');
}

/** Registry entries for practicable RC items (accepted or in review). */
export async function listRCItems() {
  const registry = await loadRegistry();
  return (registry.items ?? []).filter(
    (i) => i.type === 'rc' && (i.status === 'accepted' || i.status === 'review')
  );
}

/**
 * Load several RC passages at once → Map(id → item). Ids that fail to
 * load are simply absent from the Map: callers that derive insight
 * from history (core/mentor) only ever reason from evidence that can
 * still be shown.
 */
export async function loadRCPassages(ids) {
  const map = new Map();
  await Promise.all([...new Set(ids)].map(async (id) => {
    try { map.set(id, await loadRCPassage(id)); } catch { /* skip */ }
  }));
  return map;
}

/**
 * Load one RC passage by id, schema-validate it, and run consistency
 * checks. Throws ContentError with every issue found.
 */
export async function loadRCPassage(id) {
  if (!/^rc-[0-9]{4}$/.test(id)) {
    throw new ContentError(`"${id}" is not a valid RC content id.`);
  }
  const item = await fetchJSON(`content/reading-comprehension/${id}.json`);

  const schema = await loadSchema(`rc.schema.v${item.schema_version ?? 1}.json`);
  const { valid, errors } = validate(schema, item);
  if (!valid) throw new ContentError(`${id} failed schema validation.`, errors);

  const issues = consistencyIssues(id, item);
  if (issues.length) throw new ContentError(`${id} failed consistency checks.`, issues);

  return item;
}

/* ------------------------------------------------------------------ */
/* Para Jumbles (pj-*) — same boundary discipline as RC: schema        */
/* validation + cross-field consistency before anything renders.       */
/* ------------------------------------------------------------------ */

/** Registry entries for practicable PJ items (accepted or in review). */
export async function listPJItems() {
  const registry = await loadRegistry();
  return (registry.items ?? []).filter(
    (i) => i.type === 'pj' && (i.status === 'accepted' || i.status === 'review')
  );
}

/**
 * Load several PJ items at once → Map(id → item). Ids that fail to
 * load are absent from the Map, so mentor/DNA reasoning only ever
 * rests on evidence that can still be shown.
 */
export async function loadPJItems(ids) {
  const map = new Map();
  await Promise.all([...new Set(ids)].map(async (id) => {
    try { map.set(id, await loadPJItem(id)); } catch { /* skip */ }
  }));
  return map;
}

/** Load one PJ item by id, schema-validate it, and run consistency checks. */
export async function loadPJItem(id) {
  if (!/^pj-[0-9]{4}$/.test(id)) {
    throw new ContentError(`"${id}" is not a valid PJ content id.`);
  }
  const item = await fetchJSON(`content/para-jumbles/${id}.json`);

  const schema = await loadSchema(`pj.schema.v${item.schema_version ?? 1}.json`);
  const { valid, errors } = validate(schema, item);
  if (!valid) throw new ContentError(`${id} failed schema validation.`, errors);

  const issues = pjConsistencyIssues(id, item);
  if (issues.length) throw new ContentError(`${id} failed consistency checks.`, issues);

  return item;
}

/** PJ cross-field truths the schema can't express. Exported so
 *  tools/verify.mjs applies the identical rules. */
export function pjConsistencyIssues(id, item) {
  const issues = [];
  if (item.meta.id !== id) issues.push(`meta.id "${item.meta.id}" ≠ file id "${id}"`);

  const labels = item.sentences.map((s) => s.label);
  if (new Set(labels).size !== labels.length) issues.push('duplicate sentence labels');
  if (labels.length !== item.meta.format.sentence_count) {
    issues.push(`format.sentence_count ${item.meta.format.sentence_count} ≠ ${labels.length} sentences`);
  }

  // correct_order must be a permutation of the labels, never the identity
  // presentation order (a jumble shown already solved is defective).
  const order = item.correct_order;
  if (order.length !== labels.length
      || [...labels].sort().join('') !== [...order].sort().join('')) {
    issues.push('correct_order is not a permutation of the sentence labels');
  } else if (order.every((l, i) => l === labels[i])) {
    issues.push('correct_order equals the presentation order (nothing is jumbled)');
  }

  // Bible/CAT_VARC_BIBLE §22: one documentable link per consecutive pair.
  if (item.links.length !== order.length - 1) {
    issues.push(`links has ${item.links.length} entries for ${order.length - 1} consecutive pairs`);
  } else {
    item.links.forEach((l, i) => {
      if (l.from !== order[i] || l.to !== order[i + 1]) {
        issues.push(`links[${i}] is ${l.from}→${l.to}, expected ${order[i]}→${order[i + 1]}`);
      }
    });
  }

  // Explanation layer 2 walks the correct order, one entry per sentence.
  const movement = item.explanation.movement.map((m) => m.label);
  if (movement.join('') !== order.join('')) {
    issues.push(`explanation.movement covers ${movement.join('')}, expected ${order.join('')}`);
  }

  // Layer 3: tempting orders must be real permutations, and never correct.
  for (const t of item.explanation.tempting_orders) {
    const seq = t.order.split('');
    if ([...seq].sort().join('') !== [...labels].sort().join('')) {
      issues.push(`tempting order "${t.order}" is not a permutation of the labels`);
    }
    if (t.order === order.join('')) {
      issues.push(`tempting order "${t.order}" equals the correct order`);
    }
  }

  // The nucleus must name a real sentence.
  if (!labels.includes(item.meta.nucleus)) {
    issues.push(`nucleus "${item.meta.nucleus}" is not a sentence label`);
  }

  // Difficulty label ↔ numeric mapping (schema doc §3.4).
  const n = item.meta.difficulty_numeric;
  const label = n <= 3 ? 'easy' : n <= 6 ? 'medium' : 'hard';
  if (item.meta.difficulty !== label) {
    issues.push(`difficulty "${item.meta.difficulty}" ≠ numeric ${n} (maps to "${label}")`);
  }

  // Bible §10: medium+ items must defeat a pure surface-heuristic solver.
  if (n >= 4 && !item.meta.heuristic_adversarial) {
    issues.push('medium+ item is not heuristic-adversarial (Bible Recommendation 4)');
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/* Para Summary (ps-*) — same boundary discipline as RC and PJ:        */
/* schema validation + cross-field consistency before anything renders.*/
/* ------------------------------------------------------------------ */

/** Registry entries for practicable PS items (accepted or in review). */
export async function listPSItems() {
  const registry = await loadRegistry();
  return (registry.items ?? []).filter(
    (i) => i.type === 'ps' && (i.status === 'accepted' || i.status === 'review')
  );
}

/**
 * Load several PS items at once → Map(id → item). Ids that fail to
 * load are absent from the Map, so mentor/DNA reasoning only ever
 * rests on evidence that can still be shown.
 */
export async function loadPSItems(ids) {
  const map = new Map();
  await Promise.all([...new Set(ids)].map(async (id) => {
    try { map.set(id, await loadPSItem(id)); } catch { /* skip */ }
  }));
  return map;
}

/** Load one PS item by id, schema-validate it, and run consistency checks. */
export async function loadPSItem(id) {
  if (!/^ps-[0-9]{4}$/.test(id)) {
    throw new ContentError(`"${id}" is not a valid PS content id.`);
  }
  const item = await fetchJSON(`content/para-summary/${id}.json`);

  const schema = await loadSchema(`ps.schema.v${item.schema_version ?? 1}.json`);
  const { valid, errors } = validate(schema, item);
  if (!valid) throw new ContentError(`${id} failed schema validation.`, errors);

  const issues = psConsistencyIssues(id, item);
  if (issues.length) throw new ContentError(`${id} failed consistency checks.`, issues);

  return item;
}

/* Which Bible §5 levels each product tier may carry (PARA SUMMARY
 * BIBLE §5 mapped onto the eight-step ladder). */
const PS_TIER_LEVELS = {
  foundation: ['foundation'],
  easy: ['foundation', 'intermediate'],
  medium: ['intermediate'],
  advanced: ['advanced'],
  cat: ['cat'],
  'cat-plus': ['cat', 'elite'],
  'ninety-nine': ['elite'],
  premium: ['elite'],
};

/** PS cross-field truths the schema can't express. Exported so
 *  tools/verify.mjs applies the identical rules. */
export function psConsistencyIssues(id, item) {
  const issues = [];
  const LETTERS = ['A', 'B', 'C', 'D'];
  if (item.meta.id !== id) issues.push(`meta.id "${item.meta.id}" ≠ file id "${id}"`);

  const q = item.question;

  // The option set: the correct letter plus exactly the three others,
  // each analysed once (Bible §8: fairness lives at the set level).
  const distractorLetters = q.explanation.distractors.map((d) => d.option);
  if (new Set(distractorLetters).size !== 3) {
    issues.push('distractor options are not 3 distinct letters');
  }
  if (distractorLetters.includes(q.correct)) {
    issues.push('distractor analysis includes the correct option');
  }
  const covered = [...new Set([...distractorLetters, q.correct])].sort().join('');
  if (covered !== 'ABCD') {
    issues.push(`options analysed (${covered}) do not cover A, B, C, D exactly`);
  }

  // §8/§10: the three distractors must span DIFFERENT error families.
  // Family membership is data the mentor also uses; keep the check
  // structural (archetype names) so loader and mentor cannot drift.
  const FAMILY = {
    scope_broadening: 'scope', scope_narrowing: 'scope', category_shift: 'scope',
    certainty_inflation: 'certainty', certainty_deflation: 'certainty',
    tendency_to_universal: 'certainty',
    concession_as_thesis: 'structure', example_as_thesis: 'structure',
    evidence_as_thesis: 'structure', setup_as_payoff: 'structure',
    assumption_as_thesis: 'structure',
    information_addition: 'addition', implication_addition: 'addition',
    prescriptive_swap: 'addition',
    stance_flip: 'stance', stance_flattening: 'stance', owner_swap: 'stance',
    cause_effect_reversal: 'logic', correlation_causation_swap: 'logic',
    necessary_sufficient_swap: 'logic', contrast_collapse: 'logic',
    verbatim_lure: 'language', extreme_language: 'language', half_truth: 'language',
    near_miss: 'precision',
  };
  const families = q.explanation.distractors.map((d) => FAMILY[d.archetype]);
  if (new Set(families).size !== 3) {
    issues.push(`distractors span ${new Set(families).size} error families; must span 3 (Bible §8)`);
  }

  // Single-distortion default: a second archetype is an elite-only
  // technique, and it must differ from the first (Bible §7).
  const isElite = item.meta.bible_level === 'elite';
  q.explanation.distractors.forEach((d) => {
    if (d.secondary_archetype !== null && !isElite) {
      issues.push(`option ${d.option} layers two distortions below elite level (Bible §7)`);
    }
    if (d.secondary_archetype !== null && d.secondary_archetype === d.archetype) {
      issues.push(`option ${d.option} names the same archetype twice`);
    }
  });

  // Surface balance (§8): no option may dwarf another, or length
  // predicts the answer. Band: longest ≤ 1.75 × shortest.
  const lengths = LETTERS.map((l) => q.options[l].length);
  if (Math.max(...lengths) > 1.75 * Math.min(...lengths)) {
    issues.push('option lengths are unbalanced (longest exceeds 1.75x the shortest)');
  }

  // At most one sentence carries the thesis role; when none does, the
  // apex is implicit, which is legitimate (Bible §2, conclusion).
  const thesisCount = item.paragraph.sentences.filter((s) => s.role === 'thesis').length;
  if (thesisCount > 1) issues.push(`${thesisCount} sentences carry role "thesis"; at most 1 allowed`);

  // Tier ↔ Bible level mapping.
  const allowed = PS_TIER_LEVELS[item.meta.tier] ?? [];
  if (!allowed.includes(item.meta.bible_level)) {
    issues.push(`tier "${item.meta.tier}" cannot carry bible_level "${item.meta.bible_level}"`);
  }

  // Elite contract (§5, §7, §11 auto-fail): the separating element must
  // be nameable, at least two options must be genuinely live, and the
  // near-miss finalist must exist.
  if (isElite) {
    if (typeof item.meta.separating_element !== 'string'
        || item.meta.separating_element.length < 10) {
      issues.push('elite item must name its separating element (Bible §5)');
    }
    if (item.meta.difficulty_dials.live_options < 2) {
      issues.push('elite item must keep at least two live options');
    }
    if (!q.explanation.distractors.some((d) => d.archetype === 'near_miss')) {
      issues.push('elite item has no near-miss finalist (Bible §7)');
    }
  } else if (q.explanation.distractors.some((d) => d.archetype === 'near_miss')) {
    issues.push('near_miss is the elite finalist; below elite use a plainer archetype');
  }

  // Builder checks: ids must not repeat (each asks one distinct question).
  const checkIds = item.builder.checks.map((c) => c.id);
  if (new Set(checkIds).size !== checkIds.length) {
    issues.push('builder.checks ids repeat');
  }

  // Difficulty label ↔ numeric mapping (same rule as PJ).
  const n = item.meta.difficulty_numeric;
  const label = n <= 3 ? 'easy' : n <= 6 ? 'medium' : 'hard';
  if (item.meta.difficulty !== label) {
    issues.push(`difficulty "${item.meta.difficulty}" ≠ numeric ${n} (maps to "${label}")`);
  }

  return issues;
}

/** Cross-field truths the schema can't express. Exported so the
 *  offline verification tool applies the identical rules. */
export function consistencyIssues(id, item) {
  const issues = [];
  if (item.meta.id !== id) issues.push(`meta.id "${item.meta.id}" ≠ file id "${id}"`);
  if (item.meta.question_count !== item.questions.length) {
    issues.push(`meta.question_count ${item.meta.question_count} ≠ ${item.questions.length} questions`);
  }
  const typeSet = new Set(item.questions.map((q) => q.type));
  for (const t of item.meta.question_types) {
    if (!typeSet.has(t)) issues.push(`meta.question_types lists "${t}" but no question has it`);
  }
  if (typeSet.size < 3) issues.push('fewer than 3 distinct question types (pipeline rule)');
  item.questions.forEach((q, i) => {
    if (!q.id.startsWith(`${id}-q`)) issues.push(`questions[${i}].id "${q.id}" not under ${id}`);
    const wrong = new Set(q.explanation.distractors.map((d) => d.option));
    if (wrong.has(q.correct)) issues.push(`${q.id}: distractor analysis includes the correct option`);
    if (wrong.size !== 3) issues.push(`${q.id}: distractor options are not 3 distinct letters`);
  });
  item.passage.paragraphs.forEach((p, i) => {
    if (!p.id.startsWith(`${id}-p`)) issues.push(`paragraphs[${i}].id "${p.id}" not under ${id}`);
  });
  // v2 mentor layer: the paragraph journey must mirror the paragraphs 1:1.
  if (item.mentor) {
    const paraIds = item.passage.paragraphs.map((p) => p.id);
    const journeyIds = item.mentor.paragraph_journey.map((j) => j.paragraph_id);
    if (journeyIds.length !== paraIds.length) {
      issues.push(`mentor journey has ${journeyIds.length} steps for ${paraIds.length} paragraphs`);
    }
    journeyIds.forEach((jid, i) => {
      if (jid !== paraIds[i]) issues.push(`mentor journey[${i}] is ${jid}, expected ${paraIds[i]}`);
    });
  }
  return issues;
}
