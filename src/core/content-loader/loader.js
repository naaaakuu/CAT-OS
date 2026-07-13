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

/* ------------------------------------------------------------------ */
/* Odd One Out (ooo-*) — same boundary discipline as RC, PJ and PS:    */
/* schema validation + cross-field consistency before anything renders.*/
/* ------------------------------------------------------------------ */

/** Registry entries for practicable OOO items (accepted or in review). */
export async function listOOOItems() {
  const registry = await loadRegistry();
  return (registry.items ?? []).filter(
    (i) => i.type === 'ooo' && (i.status === 'accepted' || i.status === 'review')
  );
}

/**
 * Load several OOO items at once → Map(id → item). Ids that fail to
 * load are absent from the Map, so mentor/DNA reasoning only ever
 * rests on evidence that can still be shown.
 */
export async function loadOOOItems(ids) {
  const map = new Map();
  await Promise.all([...new Set(ids)].map(async (id) => {
    try { map.set(id, await loadOOOItem(id)); } catch { /* skip */ }
  }));
  return map;
}

/** Load one OOO item by id, schema-validate it, and run consistency checks. */
export async function loadOOOItem(id) {
  if (!/^ooo-[0-9]{4}$/.test(id)) {
    throw new ContentError(`"${id}" is not a valid OOO content id.`);
  }
  const item = await fetchJSON(`content/odd-one-out/${id}.json`);

  const schema = await loadSchema(`ooo.schema.v${item.schema_version ?? 1}.json`);
  const { valid, errors } = validate(schema, item);
  if (!valid) throw new ContentError(`${id} failed schema validation.`, errors);

  const issues = oooConsistencyIssues(id, item);
  if (issues.length) throw new ContentError(`${id} failed consistency checks.`, issues);

  return item;
}

/* Which tiers count as elite for the Bible's hardest-regime contract
 * (§6: maximal camouflage; §9: the finest violations). */
const OOO_ELITE_TIERS = ['ninety-nine', 'premium'];
/* Tiers from which a pure surface-heuristic solver must fail (§10). */
const OOO_ADVERSARIAL_TIERS = ['medium', 'advanced', 'cat', 'cat-plus', 'ninety-nine', 'premium'];

/** OOO cross-field truths the schema can't express. Exported so
 *  tools/verify.mjs applies the identical rules. */
export function oooConsistencyIssues(id, item) {
  const issues = [];
  const m = item.meta;
  if (m.id !== id) issues.push(`meta.id "${m.id}" ≠ file id "${id}"`);

  const labels = item.sentences.map((s) => s.label);
  if (new Set(labels).size !== labels.length) issues.push('duplicate sentence labels');

  // The outlier is one of the five; the core is exactly the other four,
  // never in presentation order start-to-finish by accident of authoring.
  if (!labels.includes(item.outlier)) {
    issues.push(`outlier "${item.outlier}" is not a sentence label`);
  }
  const coreSet = new Set(item.core_order);
  if (coreSet.size !== 4) issues.push('core_order repeats a label');
  if (coreSet.has(item.outlier)) issues.push('core_order contains the outlier');
  const expectedCore = labels.filter((l) => l !== item.outlier).sort().join('');
  if ([...coreSet].sort().join('') !== expectedCore) {
    issues.push('core_order does not cover exactly the four non-outlier sentences');
  }

  // The nucleus is a core sentence (Bible §3): the outlier competing
  // with the nucleus is a violation, not an identity.
  if (!coreSet.has(m.nucleus)) {
    issues.push(`nucleus "${m.nucleus}" is not a core sentence`);
  }

  // §12 layer 2 walks the core order, one entry per core sentence.
  const roleLabels = item.explanation.core_roles.map((r) => r.label);
  if (roleLabels.join('') !== item.core_order.join('')) {
    issues.push(`core_roles covers ${roleLabels.join('')}, expected ${item.core_order.join('')}`);
  }

  // The three joins mirror consecutive core pairs, in order.
  item.explanation.links.forEach((l, i) => {
    if (l.from !== item.core_order[i] || l.to !== item.core_order[i + 1]) {
      issues.push(`links[${i}] is ${l.from}→${l.to}, expected ${item.core_order[i]}→${item.core_order[i + 1]}`);
    }
  });

  // Exclusion analysis covers exactly the four core sentences (the
  // uniqueness test taught per sentence), never the outlier.
  const exLabels = item.explanation.exclusion_analysis.map((e) => e.label);
  if (new Set(exLabels).size !== exLabels.length) issues.push('exclusion_analysis repeats a label');
  if (exLabels.includes(item.outlier)) issues.push('exclusion_analysis includes the outlier');
  if ([...exLabels].sort().join('') !== expectedCore) {
    issues.push('exclusion_analysis does not cover exactly the four core sentences');
  }

  // Difficulty label ↔ numeric mapping (same rule as RC/PJ/PS).
  const n = m.difficulty_numeric;
  const label = n <= 3 ? 'easy' : n <= 6 ? 'medium' : 'hard';
  if (m.difficulty !== label) {
    issues.push(`difficulty "${m.difficulty}" ≠ numeric ${n} (maps to "${label}")`);
  }

  // §11 hard gates: a shipped item passes every validator.
  if (m.status === 'accepted' || m.status === 'review') {
    for (const gate of ['uniqueness_of_answer', 'reconstruction_check', 'trap_audit']) {
      if (m.validation[gate] !== 'pass') issues.push(`validation.${gate} is not "pass"`);
    }
  }

  // §10: from medium up, surface heuristics must fail, which requires
  // real camouflage: the adversarial gate AND meaningful overlap.
  if (OOO_ADVERSARIAL_TIERS.includes(m.tier)) {
    if (m.validation.heuristic_adversarial !== 'pass') {
      issues.push(`tier "${m.tier}" requires validation.heuristic_adversarial "pass" (Bible §10)`);
    }
    if (m.difficulty_vector.topical_overlap < 3) {
      issues.push(`tier "${m.tier}" needs topical_overlap ≥ 3; the outlier must be camouflaged (Bible §6)`);
    }
  }

  // Elite contract (§6, §9): maximal camouflage and the finest violations.
  if (OOO_ELITE_TIERS.includes(m.tier)) {
    if (m.difficulty_vector.topical_overlap < 4) {
      issues.push('elite item needs topical_overlap ≥ 4 (Bible §9)');
    }
    if (m.difficulty_vector.violation_subtlety < 4) {
      issues.push('elite item needs violation_subtlety ≥ 4 (Bible §9)');
    }
  }

  // Trap consistency: a planted Trap B is exactly high-overlap camouflage;
  // a planted Trap A needs a visible decoy load to be real.
  const traps = [m.traps.primary, m.traps.secondary];
  if (traps.includes('B') && m.difficulty_vector.topical_overlap < 3) {
    issues.push('Trap B declared but topical_overlap < 3 (the outlier is not camouflaged)');
  }
  if (traps.includes('A') && m.difficulty_vector.decoy_load < 2) {
    issues.push('Trap A declared but decoy_load < 2 (no decoy is actually planted)');
  }
  if (m.traps.primary === 'none' && m.traps.secondary !== 'none') {
    issues.push('traps.secondary set while traps.primary is "none"');
  }

  // A fair core is a strong core (Bible §5): below 3 the remaining four
  // do not form a uniquely coherent paragraph and the item is ambiguous.
  if (m.difficulty_vector.core_structure_strength < 3) {
    issues.push('core_structure_strength < 3 risks a multi-answer item (Bible §5 uniqueness)');
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/* Word DNA (wd-*) — same boundary discipline as RC, PJ, PS and OOO:   */
/* schema validation + cross-field consistency before anything renders.*/
/* ------------------------------------------------------------------ */

/** Registry entries for practicable Word DNA units (accepted or in review). */
export async function listWDItems() {
  const registry = await loadRegistry();
  return (registry.items ?? []).filter(
    (i) => i.type === 'wd' && (i.status === 'accepted' || i.status === 'review')
  );
}

/**
 * Load several Word DNA units at once → Map(id → item). Ids that fail
 * to load are absent from the Map, so mentor/DNA reasoning only ever
 * rests on evidence that can still be shown.
 */
export async function loadWDItems(ids) {
  const map = new Map();
  await Promise.all([...new Set(ids)].map(async (id) => {
    try { map.set(id, await loadWDItem(id)); } catch { /* skip */ }
  }));
  return map;
}

/** Load one Word DNA unit by id, schema-validate it, and run consistency checks. */
export async function loadWDItem(id) {
  if (!/^wd-[0-9]{4}$/.test(id)) {
    throw new ContentError(`"${id}" is not a valid Word DNA content id.`);
  }
  const item = await fetchJSON(`content/word-dna/${id}.json`);

  const schema = await loadSchema(`wd.schema.v${item.schema_version ?? 1}.json`);
  const { valid, errors } = validate(schema, item);
  if (!valid) throw new ContentError(`${id} failed schema validation.`, errors);

  const issues = wdConsistencyIssues(id, item);
  if (issues.length) throw new ContentError(`${id} failed consistency checks.`, issues);

  return item;
}

/* Kinds with no shared meaning across members (WORD_DNA_BIBLE §3a):
 * core_meaning must be null, and each held-out member gets its own
 * apply challenge rather than one shared root/prefix/suffix transfer. */
const WD_NO_SHARED_MEANING = ['foreign', 'cat_vocab', 'confused'];

/** WD cross-field truths the schema can't express. Exported so
 *  tools/verify.mjs applies the identical rules. */
export function wdConsistencyIssues(id, item) {
  const issues = [];
  const m = item.meta;
  const u = item.unit;
  if (m.id !== id) issues.push(`meta.id "${m.id}" ≠ file id "${id}"`);
  if (m.kind !== u.kind) issues.push(`meta.kind "${m.kind}" ≠ unit.kind "${u.kind}"`);

  const sharesMeaning = !WD_NO_SHARED_MEANING.includes(u.kind);
  if (sharesMeaning && (typeof u.core_meaning !== 'string' || u.core_meaning.length === 0)) {
    issues.push(`kind "${u.kind}" must state unit.core_meaning (WORD_DNA_BIBLE §4)`);
  }
  if (!sharesMeaning && u.core_meaning !== null) {
    issues.push(`kind "${u.kind}" has no shared meaning; unit.core_meaning must be null (WORD_DNA_BIBLE §3a)`);
  }

  // Exactly one held-out member for root/prefix/suffix; exactly two for
  // foreign/cat_vocab (WORD_DNA_BIBLE §3/§3a) — never zero, never every member.
  const heldOut = item.members.filter((mem) => mem.held_out);
  const expectedHeldOut = sharesMeaning ? 1 : 2;
  if (heldOut.length !== expectedHeldOut) {
    issues.push(`kind "${u.kind}" needs exactly ${expectedHeldOut} held_out member(s), found ${heldOut.length}`);
  }
  if (heldOut.length >= item.members.length) {
    issues.push('every member is held_out; at least one must be taught before Apply');
  }

  // discovery.applies walks the held-out members in the same order,
  // one challenge per member, each naming its own word exactly.
  const applies = item.discovery.applies;
  if (applies.length !== heldOut.length) {
    issues.push(`discovery.applies has ${applies.length} entries for ${heldOut.length} held_out members`);
  } else {
    heldOut.forEach((mem, i) => {
      if (applies[i]?.held_out_word !== mem.word) {
        issues.push(`discovery.applies[${i}].held_out_word "${applies[i]?.held_out_word}" ≠ held_out member "${mem.word}"`);
      }
    });
  }

  // Every choice set — predict and each apply — carries exactly one
  // correct option, never zero (unanswerable) and never two (ambiguous).
  const oneCorrect = (options, label) => {
    const n = options.filter((o) => o.correct).length;
    if (n !== 1) issues.push(`${label} has ${n} correct options; exactly 1 required`);
  };
  oneCorrect(item.discovery.predict_options, 'discovery.predict_options');
  item.discovery.applies.forEach((a, i) => oneCorrect(a.options ?? [], `discovery.applies[${i}].options`));

  // Foreign/cat_vocab members lean on their context_sentence in place of
  // a shared root (WORD_DNA_BIBLE §3a); it must actually use the word.
  // Matched by stem (first 5 letters, or the whole word if shorter) so a
  // natural inflection ("abating" for "abate") still counts as faithful
  // usage rather than forcing every sentence into the dictionary form.
  if (!sharesMeaning) {
    for (const mem of item.members) {
      if (!mem.context_sentence) {
        issues.push(`"${mem.word}": kind "${u.kind}" requires a context_sentence`);
        continue;
      }
      const stem = mem.word.toLowerCase().split(' ')[0].slice(0, 4);
      if (!mem.context_sentence.toLowerCase().includes(stem)) {
        issues.push(`"${mem.word}": context_sentence does not appear to use the word`);
      }
    }
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
