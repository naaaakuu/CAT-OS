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
import {
  RC_TYPE_SKILL, RC_PREDICTION_TYPES, WB_KIND_SKILL, CR_KIND_SKILL, TIER_RANGE,
  lengthClassOf, difficultyLabel,
} from '../learning/taxonomy.js';

export class ContentError extends Error {
  constructor(message, issues = []) {
    super(issues.length ? `${message}\n- ${issues.join('\n- ')}` : message);
    this.name = 'ContentError';
    this.issues = issues;
  }
}

/** Cache schemas per session; they are immutable files. */
const schemaCache = new Map();

/** In the browser there is only fetch. Under Node (tools/verify.mjs) the
 *  same loader reads the repository from disk, so the tool and the app can
 *  never validate different content. */
const IS_NODE = typeof window === 'undefined' && typeof process !== 'undefined' && !!process.versions?.node;

async function fetchJSON(path) {
  if (IS_NODE) {
    try {
      const { readFile } = await import('node:fs/promises');
      const { fileURLToPath } = await import('node:url');
      const { dirname, join } = await import('node:path');
      const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
      return JSON.parse(await readFile(join(root, path), 'utf8'));
    } catch (cause) {
      throw new ContentError(`Could not read ${path} from disk (${cause.message}).`);
    }
  }
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

/** The registry: one entry per content item ever created. Parsed once per
 *  page: with the content engine's banks the index is a thousand-odd rows,
 *  and six screens asking for it on a cold open used to mean six parses. A
 *  failed load is forgotten so a later attempt can retry (offline → online). */
let registryPromise = null;
export function loadRegistry() {
  if (!registryPromise) {
    registryPromise = fetchJSON('content/index.json').catch((err) => { registryPromise = null; throw err; });
  }
  return registryPromise;
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

/* ------------------------------------------------------------------ */
/* Vocabulary (vocab-*) — the shared word substrate every garden       */
/* references by id (LANGUAGE_GARDEN_BIBLE §10). Same boundary         */
/* discipline: schema validation + a trivial consistency check.        */
/* ------------------------------------------------------------------ */

/* In-memory memo of resolved content (0.17.0). Every garden screen —
   the Overlook, the walk, a plant, a session — needs every family and
   every word it references (51 plants, 217 words today) to draw the
   world, and until now each screen change re-fetched all of them, each
   through the service worker's cache-first match. Content is immutable
   for the life of a page (files change only with a release, when the
   service worker's cache version rotates and the page reloads), so a
   resolved item is loaded once per page and shared. The memo holds the
   PROMISE, so concurrent loaders of the same id share one fetch; a
   failed load is forgotten so a later attempt can retry (offline →
   online). Nothing in the app mutates a loaded item. */
const vocabMemo = new Map();
const lgMemo = new Map();
function memoized(memo, id, loadFn) {
  if (memo.has(id)) return memo.get(id);
  const p = loadFn(id).catch((err) => { memo.delete(id); throw err; });
  memo.set(id, p);
  return p;
}

/** Load one vocabulary word by id, schema-validated (memoized per page). */
export function loadVocabItem(id) {
  return memoized(vocabMemo, id, loadVocabItemUncached);
}

async function loadVocabItemUncached(id) {
  if (!/^vocab-[0-9]{4}$/.test(id)) {
    throw new ContentError(`"${id}" is not a valid vocabulary content id.`);
  }
  const item = await fetchJSON(`content/vocabulary/${id}.json`);
  const schema = await loadSchema(`vocab.schema.v${item.schema_version ?? 1}.json`);
  const { valid, errors } = validate(schema, item);
  if (!valid) throw new ContentError(`${id} failed schema validation.`, errors);
  const issues = vocabConsistencyIssues(id, item);
  if (issues.length) throw new ContentError(`${id} failed consistency checks.`, issues);
  return item;
}

/** Load several vocabulary words at once → Map(id → item). Ids that
 *  fail to load are absent from the Map (same fail-open discipline as
 *  every other loadXItems here). */
export async function loadVocabItems(ids) {
  const map = new Map();
  await Promise.all([...new Set(ids)].map(async (id) => {
    try { map.set(id, await loadVocabItem(id)); } catch { /* skip */ }
  }));
  return map;
}

/** Vocab cross-field truths the schema can't express. */
export function vocabConsistencyIssues(id, item) {
  const issues = [];
  if (item.meta.id !== id) issues.push(`meta.id "${item.meta.id}" ≠ file id "${id}"`);
  return issues;
}

/* ------------------------------------------------------------------ */
/* Language Garden (lg-*) — one plant (a root family, Root Grove's     */
/* content). A plant never inlines a word: each member is a vocab_id   */
/* reference, resolved and merged here so every screen sees a member   */
/* with .word/.meaning/.part_of_speech already attached, and no word   */
/* fact is ever duplicated between a plant file and the dictionary     */
/* (PROJECT_RULES Rule 3). Same boundary discipline as every other     */
/* content type: schema validation + cross-field consistency before    */
/* anything renders.                                                   */
/* ------------------------------------------------------------------ */

/** Registry entries for practicable Language Garden plants. */
export async function listLGItems() {
  const registry = await loadRegistry();
  return (registry.items ?? []).filter(
    (i) => i.type === 'lg' && (i.status === 'accepted' || i.status === 'review')
  );
}

/**
 * Load one Language Garden plant by id: schema-validate the family
 * file, resolve every member's vocab_id against the vocabulary store,
 * merge {word, meaning, part_of_speech} onto each member, then run
 * cross-file consistency checks.
 */
export function loadLGItem(id) {
  return memoized(lgMemo, id, loadLGItemUncached);
}

async function loadLGItemUncached(id) {
  if (!/^lg-[0-9]{4}$/.test(id)) {
    throw new ContentError(`"${id}" is not a valid Language Garden content id.`);
  }
  const item = await fetchJSON(`content/language-garden/${id}.json`);

  const schema = await loadSchema(`lg.schema.v${item.schema_version ?? 1}.json`);
  const { valid, errors } = validate(schema, item);
  if (!valid) throw new ContentError(`${id} failed schema validation.`, errors);

  const vocabIds = item.members.map((m) => m.vocab_id);
  const vocabById = await loadVocabItems(vocabIds);
  const missing = vocabIds.filter((v) => !vocabById.has(v));
  if (missing.length) {
    throw new ContentError(`${id} references vocabulary that failed to load.`, missing);
  }

  const resolved = {
    ...item,
    members: item.members.map((m) => {
      const v = vocabById.get(m.vocab_id);
      return { ...m, word: v.word, meaning: v.meaning, part_of_speech: v.part_of_speech ?? null };
    }),
  };

  const issues = lgConsistencyIssues(id, resolved);
  if (issues.length) throw new ContentError(`${id} failed consistency checks.`, issues);

  return resolved;
}

/**
 * Load several plants at once → Map(id → resolved item). Ids that fail
 * to load are absent from the Map (same fail-open discipline as every
 * other loadXItems here).
 */
export async function loadLGItems(ids) {
  const map = new Map();
  await Promise.all([...new Set(ids)].map(async (id) => {
    try { map.set(id, await loadLGItem(id)); } catch { /* skip */ }
  }));
  return map;
}

/** LG cross-field truths the schema can't express. Exported so
 *  tools/verify.mjs applies the identical rules. Runs against the
 *  RESOLVED item (members already carry word/meaning). */
export function lgConsistencyIssues(id, item) {
  const issues = [];
  if (item.meta.id !== id) issues.push(`meta.id "${item.meta.id}" ≠ file id "${id}"`);

  const taught = item.members.filter((m) => !m.held_out);
  const reach = item.members.filter((m) => m.held_out);
  // Spread walks 2 or 3 members in one session (Bible §5); at least 2
  // reach words are reserved (§6.1).
  if (taught.length < 2 || taught.length > 3) {
    issues.push(`${taught.length} taught members; Spread needs 2 or 3 (Bible §5)`);
  }
  if (reach.length < 2) issues.push(`${reach.length} held_out members; at least 2 required (Bible §6.1)`);

  // Reach members must carry construct_options with exactly one correct;
  // taught members must NOT (Spread reveals, it never grades).
  for (const m of item.members) {
    const has = Array.isArray(m.construct_options);
    if (m.held_out && !has) issues.push(`"${m.word}": held_out member needs construct_options`);
    if (!m.held_out && has) issues.push(`"${m.word}": taught member must not carry construct_options`);
    if (has) {
      const n = m.construct_options.filter((o) => o.correct).length;
      if (n !== 1) issues.push(`"${m.word}": construct_options has ${n} correct options; exactly 1 required`);
    }
  }

  // The attempt's options carry exactly one correct answer.
  const attemptCorrect = item.attempt.options.filter((o) => o.correct).length;
  if (attemptCorrect !== 1) issues.push(`attempt.options has ${attemptCorrect} correct options; exactly 1 required`);

  // Every part's is_root chunk should actually be a substring of the
  // word it composes, or the tap-to-join UI would be pointing at nothing.
  for (const m of item.members) {
    const joined = m.parts.map((p) => p.text).join('').toLowerCase();
    const word = m.word.toLowerCase().replace(/[^a-z]/g, '');
    if (joined !== word) {
      issues.push(`"${m.word}": parts join to "${joined}", not the word itself`);
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
  // v5: the pattern layer. Every fact the curator and the ledger will read
  // off this file has to be true of the file.
  if ((item.schema_version ?? 1) >= 5) issues.push(...rcV5Issues(item));
  return issues;
}

/** v5 truths (content/taxonomy/varc-taxonomy.json is the authority; the
 *  code mirror is core/learning/taxonomy.js). */
function rcV5Issues(item) {
  const issues = [];
  const m = item.meta;
  const words = item.passage.paragraphs.reduce((n, p) => n + p.text.trim().split(/\s+/).length, 0);
  if (Math.abs(words - m.word_count) > Math.max(12, m.word_count * 0.1)) {
    issues.push(`meta.word_count ${m.word_count} but the passage has about ${words} words`);
  }
  const cls = lengthClassOf(m.word_count);
  if (m.length_class !== cls) issues.push(`length_class "${m.length_class}" ≠ word_count ${m.word_count} (maps to "${cls}")`);
  const label = difficultyLabel(m.difficulty_numeric);
  if (m.difficulty !== label) issues.push(`difficulty "${m.difficulty}" ≠ numeric ${m.difficulty_numeric} (maps to "${label}")`);
  // question_types is exactly the set of types asked, sorted.
  const asked = [...new Set(item.questions.map((q) => q.type))].sort();
  if ([...m.question_types].sort().join(',') !== asked.join(',')) {
    issues.push(`meta.question_types [${m.question_types.join(', ')}] ≠ the types asked [${asked.join(', ')}]`);
  }
  // The time target is the reading time plus the questions' own targets.
  const expected = item.passage.reading_time_min + item.questions.reduce((n, q) => n + q.estimated_time_sec, 0) / 60;
  if (Math.abs(m.estimated_time_min - expected) > Math.max(0.5, expected * 0.25)) {
    issues.push(`estimated_time_min ${m.estimated_time_min} is far from reading time + question targets (${expected.toFixed(1)} min)`);
  }
  const patternSet = new Set(m.reasoning_patterns);
  const vocabWords = new Set(item.vocabulary.map((v) => v.word.toLowerCase()));
  for (const w of m.vocab_extracted) {
    if (!vocabWords.has(String(w).toLowerCase())) issues.push(`vocab_extracted "${w}" is not in the vocabulary block`);
  }
  for (const q of item.questions) {
    const want = RC_TYPE_SKILL[q.type];
    if (want && q.skill !== want) issues.push(`${q.id}: type "${q.type}" trains "${want}", but skill is "${q.skill}"`);
    for (const p of q.patterns) {
      if (!patternSet.has(p)) issues.push(`${q.id}: pattern "${p}" is not in meta.reasoning_patterns`);
    }
    if (RC_PREDICTION_TYPES.has(q.type) && q.prediction_target === null) {
      issues.push(`${q.id}: "${q.type}" is a prediction type; prediction_target must be written`);
    }
    // The four options must be four different sentences, and no option
    // may be so much longer than the rest that length is the tell.
    const texts = Object.values(q.options).map((t) => t.trim());
    if (new Set(texts.map((t) => t.toLowerCase())).size !== 4) issues.push(`${q.id}: options repeat`);
    const lens = texts.map((t) => t.length);
    if (Math.max(...lens) > 2.2 * Math.min(...lens) && Math.max(...lens) - Math.min(...lens) > 40) {
      issues.push(`${q.id}: option lengths are unbalanced (${Math.min(...lens)}–${Math.max(...lens)} chars)`);
    }
    // Explanations may not name option letters: keys are rebalanced by
    // tools/shuffle-answers.mjs, which cannot rewrite prose.
    const mentions = (s) => [...String(s ?? '').matchAll(/\b[Oo]ption\s+([A-D])\b/g)].map((x) => x[1]);
    for (const l of mentions(q.explanation.correct_reasoning)) if (l !== q.correct) issues.push(`${q.id}: correct_reasoning names option ${l}; the key is ${q.correct}`);
    for (const d of q.explanation.distractors) {
      for (const l of mentions(d.why_wrong)) if (l !== d.option) issues.push(`${q.id}: distractor ${d.option} prose names option ${l}`);
    }
    const anchor = q.explanation.passage_anchor;
    if (!item.passage.paragraphs.some((p) => p.id === anchor) && !/^rc-[0-9]{4}-p[0-9]+(,\s*rc-[0-9]{4}-p[0-9]+)*$/.test(anchor)) {
      issues.push(`${q.id}: passage_anchor "${anchor}" is not a paragraph id`);
    }
  }
  if (m.quality.status === 'verified' && !m.quality.blind_solve) {
    issues.push('quality.status "verified" requires a blind_solve record');
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* Reference bundles — Lexicon (lex-*), Loanwords (loan-*) and         */
/* Confusable twins (twin-*): the owner's vocabulary reference corpus  */
/* (KNOWLEDGE/99_REFERENCE) transcribed by tools/build-lexicon.mjs     */
/* into one bundle per band + first letter, per source language, and   */
/* per section letter. Bundles are pure reference data (no teaching    */
/* layer) and immutable per page, so loads are memoized like vocab.    */
/* Same boundary discipline as every other content type: schema        */
/* validation + cross-field consistency before anything renders.       */
/* ------------------------------------------------------------------ */

const LEX_ID  = /^lex-(high|medium|low)-([a-z]|other)$/;
const LOAN_ID = /^loan-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const TWIN_ID = /^twin-([a-z])$/;
const lexMemo  = new Map();
const loanMemo = new Map();
const twinMemo = new Map();

/** First letter of a word for bundling: diacritics ignored, lower-case,
 *  "other" when the word does not start with a letter. Shared with
 *  tools/build-lexicon.mjs so the builder and the checker cannot drift. */
export function lexLetterOf(word) {
  const c = String(word).normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toLowerCase();
  return /^[a-z]$/.test(c) ? c : 'other';
}

/** Language name → bundle slug ("African Languages" → "african-languages"). */
export function loanSlugOf(language) {
  return String(language).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Registry entries of one type that are practicable (accepted or in review). */
async function listBundleItems(type) {
  const registry = await loadRegistry();
  return (registry.items ?? []).filter(
    (i) => i.type === type && (i.status === 'accepted' || i.status === 'review')
  );
}

/** Fetch one bundle, schema-validate it, run its consistency rules. */
async function loadBundle(id, { idRe, dir, schemaName, label, check }) {
  if (!idRe.test(id)) throw new ContentError(`"${id}" is not a valid ${label} bundle id.`);
  const item = await fetchJSON(`content/${dir}/${id}.json`);
  const schema = await loadSchema(`${schemaName}.schema.v${item.schema_version ?? 1}.json`);
  const { valid, errors } = validate(schema, item);
  if (!valid) throw new ContentError(`${id} failed schema validation.`, errors);
  const issues = check(id, item);
  if (issues.length) throw new ContentError(`${id} failed consistency checks.`, issues);
  return item;
}

/** Load several bundles at once → Map(id → item). Ids that fail to load
 *  are absent from the Map (same fail-open discipline as every other
 *  loadXItems here). */
async function loadBundles(ids, loadOne) {
  const map = new Map();
  await Promise.all([...new Set(ids)].map(async (id) => {
    try { map.set(id, await loadOne(id)); } catch { /* skip */ }
  }));
  return map;
}

/** Truths every bundle shape shares that the schemas can't express:
 *  id ↔ meta.id, entry_count ↔ entries.length, entry ids unique and
 *  prefixed by the bundle id. */
function bundleIssues(id, item) {
  const issues = [];
  if (item.meta.id !== id) issues.push(`meta.id "${item.meta.id}" ≠ file id "${id}"`);
  if (item.meta.entry_count !== item.entries.length) {
    issues.push(`meta.entry_count ${item.meta.entry_count} ≠ ${item.entries.length} entries`);
  }
  const seen = new Set();
  item.entries.forEach((e, i) => {
    if (!e.id.startsWith(`${id}-`)) issues.push(`entries[${i}].id "${e.id}" not under ${id}`);
    if (seen.has(e.id)) issues.push(`entries[${i}].id "${e.id}" repeats an earlier entry id`);
    seen.add(e.id);
  });
  return issues;
}

const blank = (s) => typeof s !== 'string' || s.trim() === '';

/* ---- Lexicon (lex-<band>-<letter>) ---- */

/** Registry entries for practicable lexicon bundles (accepted or in review). */
export async function listLexItems() { return listBundleItems('lex'); }

/** Load one lexicon bundle by id, schema-validated + consistency-checked (memoized per page). */
export function loadLexItem(id) {
  return memoized(lexMemo, id, (bundleId) => loadBundle(bundleId, {
    idRe: LEX_ID, dir: 'lexicon', schemaName: 'lex', label: 'lexicon', check: lexConsistencyIssues,
  }));
}

/** Load several lexicon bundles at once → Map(id → item); failures are absent. */
export async function loadLexItems(ids) { return loadBundles(ids, loadLexItem); }

/** Lexicon cross-field truths the schema can't express. Exported so
 *  tools/verify.mjs (and the builder) apply the identical rules. */
export function lexConsistencyIssues(id, item) {
  const issues = bundleIssues(id, item);
  const [, band, letter] = id.match(LEX_ID) ?? [];
  if (band && item.meta.band !== band) {
    issues.push(`meta.band "${item.meta.band}" ≠ band in id "${band}"`);
  }
  if (letter) {
    const expected = letter === 'other' ? 'other' : letter.toUpperCase();
    if (item.meta.letter !== expected) issues.push(`meta.letter "${item.meta.letter}" ≠ letter in id "${expected}"`);
  }
  for (const e of item.entries) {
    if (blank(e.word)) { issues.push(`${e.id}: empty word`); continue; }
    if (blank(e.meaning)) issues.push(`${e.id}: empty meaning`);
    if (letter && lexLetterOf(e.word) !== letter) {
      issues.push(`${e.id}: "${e.word}" does not belong under letter "${letter}"`);
    }
  }
  return issues;
}

/* ---- Loanwords (loan-<language-slug>) ---- */

/** Registry entries for practicable loanword bundles (accepted or in review). */
export async function listLoanItems() { return listBundleItems('loan'); }

/** Load one loanword bundle by id, schema-validated + consistency-checked (memoized per page). */
export function loadLoanItem(id) {
  return memoized(loanMemo, id, (bundleId) => loadBundle(bundleId, {
    idRe: LOAN_ID, dir: 'loanwords', schemaName: 'loan', label: 'loanword', check: loanConsistencyIssues,
  }));
}

/** Load several loanword bundles at once → Map(id → item); failures are absent. */
export async function loadLoanItems(ids) { return loadBundles(ids, loadLoanItem); }

/** Loanword cross-field truths the schema can't express. Exported so
 *  tools/verify.mjs (and the builder) apply the identical rules. */
export function loanConsistencyIssues(id, item) {
  const issues = bundleIssues(id, item);
  const [, slug] = id.match(LOAN_ID) ?? [];
  if (blank(item.meta.language)) {
    issues.push('meta.language is empty');
  } else if (slug && loanSlugOf(item.meta.language) !== slug) {
    issues.push(`meta.language "${item.meta.language}" does not slug to "${slug}"`);
  }
  for (const e of item.entries) {
    if (blank(e.word)) issues.push(`${e.id}: empty word`);
    if (blank(e.meaning)) issues.push(`${e.id}: empty meaning`);
  }
  return issues;
}

/* ---- Confusable twins (twin-<letter>) ---- */

/** Registry entries for practicable twin bundles (accepted or in review). */
export async function listTwinItems() { return listBundleItems('twin'); }

/** Load one twin bundle by id, schema-validated + consistency-checked (memoized per page). */
export function loadTwinItem(id) {
  return memoized(twinMemo, id, (bundleId) => loadBundle(bundleId, {
    idRe: TWIN_ID, dir: 'twins', schemaName: 'twin', label: 'twin', check: twinConsistencyIssues,
  }));
}

/** Load several twin bundles at once → Map(id → item); failures are absent. */
export async function loadTwinItems(ids) { return loadBundles(ids, loadTwinItem); }

/** Twin cross-field truths the schema can't express: at least two
 *  words (a homograph may repeat, e.g. the source's "Lead/Led/Lead"),
 *  exactly one sense per word in the same order, every sense and the
 *  explanation non-empty. Exported so tools/verify.mjs
 *  (and the builder) apply the identical rules. */
export function twinConsistencyIssues(id, item) {
  const issues = bundleIssues(id, item);
  const [, letter] = id.match(TWIN_ID) ?? [];
  if (letter && item.meta.letter !== letter.toUpperCase()) {
    issues.push(`meta.letter "${item.meta.letter}" ≠ letter in id "${letter.toUpperCase()}"`);
  }
  for (const e of item.entries) {
    if (e.words.length < 2) issues.push(`${e.id}: fewer than 2 words`);
    if (e.words.some(blank)) issues.push(`${e.id}: empty word`);
    if (e.senses.length !== e.words.length) {
      issues.push(`${e.id}: ${e.senses.length} senses for ${e.words.length} words`);
    } else {
      e.senses.forEach((s, i) => {
        if (s.word !== e.words[i]) issues.push(`${e.id}: senses[${i}] is "${s.word}", expected "${e.words[i]}"`);
        if (blank(s.meaning)) issues.push(`${e.id}: senses[${i}] has an empty meaning`);
      });
    }
    if (blank(e.explanation)) issues.push(`${e.id}: empty explanation`);
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* Words in context                                                    */
/* ------------------------------------------------------------------ */

let contextPack = null;

/**
 * The words-in-context pack: every word the corpus shows inside a real
 * sentence, with the sense it carries there. Built by
 * `tools/build-context.mjs` from the Reading Comprehension vocabulary
 * blocks and the Rootwood members' context sentences, so it is derived
 * content and has no registry entry of its own.
 *
 * @returns {Promise<{entries: Array<{id, word, sentence, meaning, difficulty, source, from, root?}>}>}
 */
export async function loadContextPack() {
  if (contextPack) return contextPack;
  const pack = await fetchJSON('content/context/pack.json');
  if (!Array.isArray(pack?.entries)) throw new ContentError('The context pack is malformed.');
  contextPack = pack;
  return contextPack;
}

/** word (lowercased) → its context entry, for a quick lookup in a round. */
export async function contextByWord() {
  const pack = await loadContextPack();
  if (!pack.__byWord) {
    pack.__byWord = new Map(pack.entries.map((e) => [e.word.toLowerCase(), e]));
  }
  return pack.__byWord;
}

/* ------------------------------------------------------------------ */
/* The item banks of the content engine — Sentence Placement (sp-*),  */
/* Para Completion (pc-*), the Word Bank (wb-*, bundles) and          */
/* Arguments (cr-*, bundles). Same boundary discipline as everything  */
/* above: schema validation + cross-field consistency before anything */
/* renders; a normaliser turns any of the four into the one item      */
/* shape the bank engine and screen work on.                          */
/* ------------------------------------------------------------------ */

const BANK_DIR = Object.freeze({ sp: 'sentence-placement', pc: 'para-completion', wb: 'word-bank', cr: 'critical-reasoning' });
const BANK_ID = Object.freeze({ sp: /^sp-[0-9]{4}$/, pc: /^pc-[0-9]{4}$/, wb: /^wb-[0-9]{4}$/, cr: /^cr-[0-9]{4}$/ });
const bankMemo = { sp: new Map(), pc: new Map(), wb: new Map(), cr: new Map() };
const LETTERS4 = ['A', 'B', 'C', 'D'];

/** Registry entries for practicable bank items/bundles of one type. */
export async function listBankItems(type) {
  if (!BANK_DIR[type]) throw new ContentError(`"${type}" is not a content bank.`);
  return listBundleItems(type);
}
export const listSPItems = () => listBankItems('sp');
export const listPCItems = () => listBankItems('pc');
export const listWBItems = () => listBankItems('wb');
export const listCRItems = () => listBankItems('cr');

/** Load one bank file (an sp/pc item, or a wb/cr bundle), validated (memoized per page). */
export function loadBankFile(type, id) {
  if (!BANK_DIR[type]) return Promise.reject(new ContentError(`"${type}" is not a content bank.`));
  return memoized(bankMemo[type], id, async (fileId) => {
    if (!BANK_ID[type].test(fileId)) throw new ContentError(`"${fileId}" is not a valid ${type} content id.`);
    const item = await fetchJSON(`content/${BANK_DIR[type]}/${fileId}.json`);
    const schema = await loadSchema(`${type}.schema.v${item.schema_version ?? 1}.json`);
    const { valid, errors } = validate(schema, item);
    if (!valid) throw new ContentError(`${fileId} failed schema validation.`, errors);
    const issues = bankConsistencyIssues(type, fileId, item);
    if (issues.length) throw new ContentError(`${fileId} failed consistency checks.`, issues);
    return item;
  });
}

/** Load several bank files → Map(id → file); failures are absent. */
export async function loadBankFiles(type, ids) {
  const map = new Map();
  await Promise.all([...new Set(ids)].map(async (id) => {
    try { map.set(id, await loadBankFile(type, id)); } catch { /* skip */ }
  }));
  return map;
}

/** Cross-field truths of the four banks. Exported so tools/verify.mjs
 *  applies the identical rules. */
export function bankConsistencyIssues(type, id, item) {
  const issues = [];
  const m = item.meta;
  if (m.id !== id) issues.push(`meta.id "${m.id}" ≠ file id "${id}"`);
  const oneQuestion = (q, label, distractors) => {
    const texts = LETTERS4.map((l) => String(q.options[l] ?? '').trim());
    if (new Set(texts.map((t) => t.toLowerCase())).size !== 4) issues.push(`${label}: options repeat`);
    const wrong = distractors.map((d) => d.option);
    if (new Set(wrong).size !== 3) issues.push(`${label}: distractor options are not 3 distinct letters`);
    if (wrong.includes(q.correct)) issues.push(`${label}: distractor analysis includes the correct option`);
    if ([...new Set([...wrong, q.correct])].sort().join('') !== 'ABCD') issues.push(`${label}: options analysed do not cover A, B, C, D`);
    const mentions = (s) => [...String(s ?? '').matchAll(/\b[Oo]ption\s+([A-D])\b/g)].map((x) => x[1]);
    for (const d of distractors) for (const l of mentions(d.why_wrong)) if (l !== d.option) issues.push(`${label}: distractor ${d.option} prose names option ${l}`);
  };
  const tierCheck = () => {
    const label = difficultyLabel(m.difficulty_numeric);
    if (m.difficulty !== label) issues.push(`difficulty "${m.difficulty}" ≠ numeric ${m.difficulty_numeric} (maps to "${label}")`);
    const range = TIER_RANGE[m.tier];
    if (range && (m.difficulty_numeric < range[0] || m.difficulty_numeric > range[1])) {
      issues.push(`tier "${m.tier}" carries difficulty_numeric ${range[0]}–${range[1]}, not ${m.difficulty_numeric}`);
    }
    if (m.quality.status === 'verified' && !m.quality.blind_solve) issues.push('quality.status "verified" requires a blind_solve record');
  };

  if (type === 'sp') {
    tierCheck();
    const ns = item.paragraph.sentences.map((s) => s.n);
    if (ns.join(',') !== ns.map((_, i) => i + 1).join(',')) issues.push('paragraph sentences must be numbered 1..n in order');
    const q = item.question;
    oneQuestion(q, m.id, item.explanation.distractors);
    const positions = LETTERS4.map((l) => q.option_positions[l]);
    if (new Set(positions).size !== 4) issues.push('option_positions repeat a slot');
    for (const p of positions) if (p > ns.length) issues.push(`option position ${p} is beyond the paragraph (${ns.length} sentences)`);
    if (q.option_positions[q.correct] !== item.missing.position) {
      issues.push(`correct option ${q.correct} sits at position ${q.option_positions[q.correct]}, but missing.position is ${item.missing.position}`);
    }
    if (item.missing.position === 0 && item.explanation.clue_before !== null) issues.push('the slot opens the paragraph; clue_before must be null');
    if (item.missing.position === ns.length && item.explanation.clue_after !== null) issues.push('the slot closes the paragraph; clue_after must be null');
    if (item.missing.position > 0 && item.explanation.clue_before === null) issues.push('clue_before must name what the previous sentence demands');
    if (item.missing.position < ns.length && item.explanation.clue_after === null) issues.push('clue_after must name what the next sentence depends on');
    if (item.paragraph.sentences.some((s) => s.text.trim() === item.missing.text.trim())) issues.push('the missing sentence is still in the paragraph');
  } else if (type === 'pc') {
    tierCheck();
    if (item.paragraph.gap_index > item.paragraph.sentences.length) issues.push(`gap_index ${item.paragraph.gap_index} is beyond the paragraph`);
    const q = item.question;
    oneQuestion(q, m.id, item.explanation.distractors);
    if (item.paragraph.sentences.some((s) => s.trim() === q.options[q.correct].trim())) issues.push('the completing sentence is still in the paragraph');
    const gapAtEnd = item.paragraph.gap_index === item.paragraph.sentences.length;
    if (m.gap_function === 'opening' && item.paragraph.gap_index !== 0) issues.push('gap_function "opening" but the gap is not at index 0');
    if (m.gap_function === 'conclusion' && !gapAtEnd) issues.push('gap_function "conclusion" but the gap is not at the end');
  } else if (type === 'wb' || type === 'cr') {
    if (m.item_count !== item.items.length) issues.push(`meta.item_count ${m.item_count} ≠ ${item.items.length} items`);
    const seen = new Set();
    item.items.forEach((it, i) => {
      if (!it.id.startsWith(`${id}-`)) issues.push(`items[${i}].id "${it.id}" not under ${id}`);
      if (seen.has(it.id)) issues.push(`items[${i}].id "${it.id}" repeats`);
      seen.add(it.id);
      oneQuestion(it, it.id, it.explanation.distractors);
      if (type === 'wb') {
        const allowed = WB_KIND_SKILL[m.kind] ?? [];
        if (!allowed.includes(it.skill)) issues.push(`${it.id}: kind "${m.kind}" trains ${allowed.join('/')}, not "${it.skill}"`);
        const stem = it.stem;
        if (m.kind === 'confusable') {
          if (!stem.includes('____')) issues.push(`${it.id}: a confusable stem must carry a blank written as ____`);
          if (!LETTERS4.some((l) => it.options[l].trim().toLowerCase() === it.word.trim().toLowerCase())) issues.push(`${it.id}: the wanted word "${it.word}" is not one of the options`);
        } else if (stem.includes('____')) {
          // Register / connotation / synonym items may use a blank; the
          // wanted word is then the correct option itself.
          if (m.kind === 'context' || m.kind === 'decode') issues.push(`${it.id}: ${m.kind} items show the word in its sentence, not a blank`);
          if (String(it.options[it.correct]).trim().toLowerCase() !== it.word.trim().toLowerCase()) issues.push(`${it.id}: with a blank, "word" must be the correct option ("${it.options[it.correct]}")`);
        } else {
          const w = it.word.toLowerCase().split(' ')[0];
          const probe = w.slice(0, Math.max(4, w.length - 3));
          if (!stem.toLowerCase().includes(probe)) issues.push(`${it.id}: the stem does not contain "${it.word}"`);
        }
        if (m.kind === 'decode') {
          if (!Array.isArray(it.parts) || it.parts.length < 2) issues.push(`${it.id}: decode items need at least two parts`);
          else {
            const joined = it.parts.map((p) => p.text).join('').toLowerCase().replace(/[^a-z]/g, '');
            const word = it.word.toLowerCase().replace(/[^a-z]/g, '');
            if (joined !== word) issues.push(`${it.id}: parts join to "${joined}", not "${word}"`);
          }
        } else if (it.parts) issues.push(`${it.id}: only decode items carry parts`);
      } else {
        const allowed = CR_KIND_SKILL[it.kind] ?? [];
        if (!allowed.includes(it.skill)) issues.push(`${it.id}: kind "${it.kind}" trains ${allowed.join('/')}, not "${it.skill}"`);
        const gapKinds = ['assumption', 'strengthen', 'weaken', 'flaw', 'evaluate', 'principle', 'paradox'];
        if (gapKinds.includes(it.kind) && !it.explanation.structure.gap) issues.push(`${it.id}: a ${it.kind} item must name the argument's gap`);
      }
    });
    if (m.quality.status === 'verified' && !m.quality.blind_solve) issues.push('quality.status "verified" requires a blind_solve record');
  }
  return issues;
}

/** The registry's word-bank bundles for one place (by kind), and the
 *  CR bundles by band — what a place screen lists. */
export const WB_KINDS_BY_REGION = Object.freeze({
  meadow: ['context', 'register', 'connotation', 'synonym_distinction'],
  pond: ['confusable'],
  terraces: ['decode'],
});

/**
 * One item shape for the bank engine and screen, whatever the bank:
 *   { id, type, kind, label, skill, patterns, stem, options, correct,
 *     distractors, time_sec, difficulty, explanation:{…cat-explanation shape},
 *     body:{ … what the screen draws above the stem } }
 * @param {'sp'|'pc'|'wb'|'cr'} type
 * @param {object} file   the loaded file (sp/pc item, or a wb/cr bundle)
 * @param {string} [itemId] for bundles: which item
 */
export function normalizeBankItem(type, file, itemId = null) {
  if (type === 'sp') {
    const q = file.question;
    return {
      id: file.meta.id, type, kind: 'placement', label: 'sentence placement',
      skill: 'placement', patterns: file.meta.reasoning_patterns, difficulty: file.meta.difficulty_numeric,
      tier: file.meta.tier, genre: file.meta.genre, title: file.meta.title,
      stem: q.stem, options: q.options, correct: q.correct, distractors: file.explanation.distractors,
      time_sec: file.meta.estimated_time_sec,
      explanation: {
        correct_reasoning: file.explanation.correct_reasoning,
        question_type_note: [file.explanation.clue_before, file.explanation.clue_after].filter(Boolean).join(' '),
        reading_habit: file.explanation.method,
        passage_anchor: null,
        distractors: file.explanation.distractors,
      },
      body: { kind: 'sp', sentences: file.paragraph.sentences, missing: file.missing.text, positions: q.option_positions },
      mentor: file.mentor,
    };
  }
  if (type === 'pc') {
    const q = file.question;
    return {
      id: file.meta.id, type, kind: file.meta.gap_function, label: 'paragraph completion',
      skill: 'completion', patterns: file.meta.reasoning_patterns, difficulty: file.meta.difficulty_numeric,
      tier: file.meta.tier, genre: file.meta.genre, title: file.meta.title,
      stem: q.stem, options: q.options, correct: q.correct, distractors: file.explanation.distractors,
      time_sec: file.meta.estimated_time_sec,
      explanation: {
        correct_reasoning: file.explanation.correct_reasoning,
        question_type_note: file.explanation.what_the_gap_needs,
        reading_habit: file.explanation.method,
        passage_anchor: null,
        distractors: file.explanation.distractors,
      },
      body: { kind: 'pc', sentences: file.paragraph.sentences, gap_index: file.paragraph.gap_index },
      mentor: file.mentor,
    };
  }
  const it = file.items.find((x) => x.id === itemId);
  if (!it) throw new ContentError(`${itemId} is not in ${file.meta.id}.`);
  if (type === 'wb') {
    return {
      id: it.id, type, kind: file.meta.kind, label: WB_LABEL[file.meta.kind] ?? 'word in context',
      skill: it.skill, patterns: it.patterns, difficulty: it.difficulty,
      band: file.meta.band, bundle: file.meta.id, title: file.meta.title, word: it.word,
      stem: it.stem, options: it.options, correct: it.correct, distractors: it.explanation.distractors,
      time_sec: file.meta.estimated_time_sec,
      explanation: {
        correct_reasoning: it.explanation.correct_reasoning,
        question_type_note: it.explanation.clue,
        reading_habit: it.explanation.method,
        passage_anchor: null,
        distractors: it.explanation.distractors,
      },
      body: { kind: 'wb', wbKind: file.meta.kind, word: it.word, parts: it.parts ?? null },
      mentor: null,
    };
  }
  return {
    id: it.id, type, kind: it.kind, label: CR_LABEL[it.kind] ?? it.kind,
    skill: it.skill, patterns: it.patterns, difficulty: it.difficulty,
    band: file.meta.band, bundle: file.meta.id, title: file.meta.title, genre: it.genre,
    stem: it.stem, options: it.options, correct: it.correct, distractors: it.explanation.distractors,
    time_sec: file.meta.estimated_time_sec,
    explanation: {
      correct_reasoning: it.explanation.correct_reasoning,
      question_type_note: `Premises: ${it.explanation.structure.premises.join(' ')} Conclusion: ${it.explanation.structure.conclusion}${it.explanation.structure.gap ? ` The gap: ${it.explanation.structure.gap}` : ''}`,
      reading_habit: it.explanation.method,
      passage_anchor: null,
      distractors: it.explanation.distractors,
    },
    body: { kind: 'cr', argument: it.argument, structure: it.explanation.structure },
    mentor: null,
  };
}

const WB_LABEL = Object.freeze({
  context: 'word in context', decode: 'decode the word', confusable: 'the right twin',
  register: 'register', connotation: 'connotation', synonym_distinction: 'the nearer synonym',
});
const CR_LABEL = Object.freeze({
  assumption: 'assumption', strengthen: 'strengthen', weaken: 'weaken', inference: 'inference',
  flaw: 'the flaw', conclusion: 'the conclusion', paradox: 'resolve the paradox', evaluate: 'evaluate',
  parallel: 'parallel reasoning', principle: 'the principle', role: 'role of the statement',
});

/** Every playable item of a bank, normalised, from its registry rows —
 *  one file fetch per item (sp/pc) or per bundle (wb/cr). */
export async function loadBankItemsFromRows(type, rows) {
  if (type === 'sp' || type === 'pc') {
    const files = await loadBankFiles(type, rows.map((r) => r.id));
    return rows.map((r) => files.get(r.id)).filter(Boolean).map((f) => normalizeBankItem(type, f));
  }
  const files = await loadBankFiles(type, rows.map((r) => r.id));
  const out = [];
  for (const r of rows) {
    const f = files.get(r.id);
    if (!f) continue;
    for (const it of f.items) out.push(normalizeBankItem(type, f, it.id));
  }
  return out;
}
