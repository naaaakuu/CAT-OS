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
