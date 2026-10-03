#!/usr/bin/env node
/**
 * tools/build-index.mjs — the content registry, derived from the files.
 *
 * content/index.json holds one row per content item, and the app reads
 * those rows — never the files — to draw the valley, choose what to offer
 * next, and list a place's shelves. Every row field the app depends on
 * therefore has to be TRUE of the file, and tools/verify.mjs §2 fails the
 * build when one is not. Hand-editing a thousand rows is how that drifts,
 * so this tool writes them.
 *
 *   node tools/build-index.mjs            rewrite the registry
 *   node tools/build-index.mjs --check    exit 1 if the registry would change
 *
 * Rows that already exist are KEPT — their reviewer notes, prompt
 * versions and provenance fields are the owner's record — and only the
 * fields that must mirror the file are refreshed. New files get a full
 * row. Row order is preserved; new rows are appended by type. Rows whose
 * file has gone are left alone (ids are never reused, and a retired item
 * keeps its entry).
 *
 * Also written (and kept idempotent with tools/index-derived.mjs):
 *   rc.question_types      the CAT question types a passage asks
 *   rc.skills_trained      v5: the ledger skills its questions train
 *   rc.patterns / traps    v5: the reasoning patterns and trap types used
 *   lg.root_origin/meaning the Rootwood's labels, without opening 51 files
 *   wb/cr.item_ids         the items in a bundle, for solved counts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'content', 'index.json');
const CHECK = process.argv.includes('--check');

const DIRS = {
  rc: 'reading-comprehension', pj: 'para-jumbles', ps: 'para-summary', ooo: 'odd-one-out',
  sp: 'sentence-placement', pc: 'para-completion', wb: 'word-bank', cr: 'critical-reasoning',
  wd: 'word-dna', vocab: 'vocabulary', lg: 'language-garden', lex: 'lexicon', loan: 'loanwords', twin: 'twins',
};
const TYPE_ORDER = Object.keys(DIRS);

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const mins = (sec) => Math.round((sec / 60) * 10) / 10;
const uniq = (a) => [...new Set(a.filter(Boolean))].sort();

const raw = fs.readFileSync(INDEX, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const index = JSON.parse(raw);
const byId = new Map(index.items.map((r) => [r.id, r]));

/** The fields that must mirror the file, per type. */
function mirror(type, item) {
  const m = item.meta;
  const src = m.source ?? {};
  const prov = { source: src.publication ?? 'original', source_url: src.url ?? null, author: src.author ?? null, date_accessed: src.date_accessed ?? m.date_added };
  const v = item.schema_version ?? 1;
  switch (type) {
    case 'rc': {
      const row = {
        status: m.status, quality_score: m.quality_score, genre: m.genre, difficulty: m.difficulty, difficulty_numeric: m.difficulty_numeric,
        word_count: m.word_count, question_count: m.question_count, estimated_time_min: m.estimated_time_min,
        title: item.passage.title, theme: m.theme, schema_version: v, stage: m.stage, version: m.version,
        question_types: uniq(item.questions.map((q) => q.type)),
      };
      // A real, public-domain essay names its source on the Reading House shelf.
      if (src.publication && src.publication !== 'original') row.real_source = src.publication;
      if (v >= 5) Object.assign(row, {
        length_class: m.length_class, structure: m.structure,
        skills_trained: uniq(item.questions.map((q) => q.skill)),
        patterns: [...m.reasoning_patterns],
        traps: uniq(item.questions.flatMap((q) => q.explanation.distractors.map((d) => d.trap_type))),
        quality_status: m.quality.status,
      });
      return { row, fresh: { ...prov, date_added: m.date_added, batch_id: m.batch_id, prompt_version: m.prompt_version, reviewer_notes: m.reviewer_notes } };
    }
    case 'pj': {
      const row = {
        status: m.status, quality_score: m.quality_score, genre: m.genre, difficulty: m.difficulty, difficulty_numeric: m.difficulty_numeric,
        tier: m.tier, sentence_count: m.format.sentence_count, title: m.title, theme: m.theme, estimated_time_min: mins(m.estimated_time_sec),
        macro_pattern: m.macro_pattern, primary_trap: m.primary_trap, num_plausible_orderings: m.num_plausible_orderings,
        heuristic_adversarial: m.heuristic_adversarial, schema_version: v, version: m.version,
      };
      if (v >= 2) Object.assign(row, { patterns: [...m.reasoning_patterns], quality_status: m.quality.status });
      return { row, fresh: { ...prov, date_added: m.date_added, batch_id: m.batch_id, prompt_version: m.prompt_version, reviewer_notes: m.reviewer_notes } };
    }
    case 'ps': {
      const row = {
        status: m.status, quality_score: m.quality_score, genre: m.genre, difficulty: m.difficulty, difficulty_numeric: m.difficulty_numeric,
        tier: m.tier, bible_level: m.bible_level, title: m.title, theme: m.theme, estimated_time_min: mins(m.estimated_time_sec),
        architecture: m.architecture, mission: m.mission, schema_version: v, version: m.version,
      };
      if (v >= 2) Object.assign(row, { patterns: [...m.reasoning_patterns], quality_status: m.quality.status });
      return { row, fresh: { ...prov, date_added: m.date_added, batch_id: m.batch_id, prompt_version: m.prompt_version, reviewer_notes: m.reviewer_notes } };
    }
    case 'ooo': {
      const row = {
        status: m.status, quality_score: m.quality_score, genre: m.genre, difficulty: m.difficulty, difficulty_numeric: m.difficulty_numeric,
        tier: m.tier, title: m.title, theme: m.theme, estimated_time_min: mins(m.estimated_time_sec),
        spine_type: m.spine_type, violation_type: m.violation_type, mission: m.mission, schema_version: v, version: m.version,
      };
      if (v >= 2) Object.assign(row, { patterns: [...m.reasoning_patterns], quality_status: m.quality.status });
      return { row, fresh: { ...prov, date_added: m.date_added, batch_id: m.batch_id, prompt_version: m.prompt_version, reviewer_notes: m.reviewer_notes } };
    }
    case 'sp': case 'pc': {
      const row = {
        status: m.status, quality_score: m.quality_score, genre: m.genre, difficulty: m.difficulty, difficulty_numeric: m.difficulty_numeric,
        tier: m.tier, title: m.title, theme: m.theme, estimated_time_sec: m.estimated_time_sec, estimated_time_min: mins(m.estimated_time_sec),
        primary_trap: m.primary_trap, patterns: [...m.reasoning_patterns], quality_status: m.quality.status,
        schema_version: v, version: m.version,
      };
      if (type === 'pc') row.gap_function = m.gap_function;
      return { row, fresh: { date_added: m.date_added, batch_id: m.batch_id, reviewer_notes: m.reviewer_notes } };
    }
    case 'wb': {
      const row = {
        status: m.status, kind: m.kind, band: m.band, title: m.title, item_count: item.items.length,
        item_ids: item.items.map((i) => i.id), estimated_time_sec: m.estimated_time_sec,
        skills: uniq(item.items.map((i) => i.skill)), patterns: uniq(item.items.flatMap((i) => i.patterns)),
        traps: uniq(item.items.flatMap((i) => i.explanation.distractors.map((d) => d.trap_type))),
        quality_status: m.quality.status, schema_version: v, version: m.version,
      };
      return { row, fresh: { date_added: m.date_added, batch_id: m.batch_id, reviewer_notes: m.reviewer_notes } };
    }
    case 'cr': {
      const row = {
        status: m.status, band: m.band, title: m.title, item_count: item.items.length,
        item_ids: item.items.map((i) => i.id), estimated_time_sec: m.estimated_time_sec,
        kinds: uniq(item.items.map((i) => i.kind)), genres: uniq(item.items.map((i) => i.genre)),
        skills: uniq(item.items.map((i) => i.skill)), patterns: uniq(item.items.flatMap((i) => i.patterns)),
        traps: uniq(item.items.flatMap((i) => i.explanation.distractors.map((d) => d.trap_type))),
        quality_status: m.quality.status, schema_version: v, version: m.version,
      };
      return { row, fresh: { date_added: m.date_added, batch_id: m.batch_id, reviewer_notes: m.reviewer_notes } };
    }
    case 'wd': {
      const row = { status: m.status, kind: m.kind, title: m.title, member_count: item.members.length, estimated_time_min: mins(m.estimated_time_sec), schema_version: v, version: m.version };
      return { row, fresh: { ...prov, date_added: m.date_added, batch_id: m.batch_id, prompt_version: m.prompt_version, reviewer_notes: m.reviewer_notes } };
    }
    case 'vocab': {
      return { row: { status: m.status, word: item.word, schema_version: v, version: m.version }, fresh: { date_added: m.date_added, batch_id: m.batch_id } };
    }
    case 'lg': {
      const row = { status: m.status, garden: m.garden, title: m.title, member_count: item.members.length, estimated_time_min: mins(m.estimated_time_sec), schema_version: v, version: m.version, root_origin: item.root?.origin_language ?? null, root_meaning: item.root?.core_meaning ?? null };
      return { row, fresh: { ...prov, date_added: m.date_added, batch_id: m.batch_id, prompt_version: m.prompt_version ?? null, reviewer_notes: m.reviewer_notes } };
    }
    case 'lex': case 'loan': case 'twin': {
      const row = { status: m.status, title: m.title, entry_count: item.entries.length, schema_version: v, version: m.version, date_added: m.date_added, batch_id: m.batch_id };
      for (const f of ['band', 'letter', 'language']) if (f in m) row[f] = m[f];
      return { row, fresh: {} };
    }
    default: return { row: {}, fresh: {} };
  }
}

let changed = 0;
const appended = [];
for (const type of TYPE_ORDER) {
  const dir = path.join(ROOT, 'content', DIRS[type]);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const id = f.replace(/\.json$/, '');
    let item;
    try { item = read(path.join(dir, f)); } catch (e) { console.error(`  !!  ${f}: ${e.message}`); process.exitCode = 1; continue; }
    if (!item?.meta?.id) continue;
    const { row, fresh } = mirror(type, item);
    const existing = byId.get(id);
    if (existing) {
      for (const [k, v] of Object.entries(row)) {
        if (JSON.stringify(existing[k]) !== JSON.stringify(v)) { existing[k] = v; changed += 1; }
      }
    } else {
      const full = { id, type, ...row, ...fresh };
      // A stable key order: id, type, then the mirror fields, then provenance.
      index.items.push(full);
      byId.set(id, full);
      appended.push(id);
      changed += 1;
    }
  }
}

/* ------------------------------------------------------------------ */
/* The boot registry                                                   */
/* ------------------------------------------------------------------ */

/**
 * The fields the WORLD reads off a registry row, and nothing else.
 *
 * index.json is 807 KB and 42% of a cold open of the village was spent
 * downloading it before a single pixel could be painted. Almost none of that
 * weight is anything the world reads — reviewer notes, prompt versions,
 * sources, quality scores, per-question pattern and trap lists and the
 * passage themes are for the browsers, the mentor and the tools.
 *
 * Keep this list in step with what src/world/, src/pets/ and src/home/
 * actually touch; verify.mjs fails if boot-index.json is stale.
 */
export const BOOT_FIELDS = Object.freeze([
  'id', 'type', 'status', 'title', 'tier', 'stage',
  'genre', 'difficulty', 'difficulty_numeric',
  'estimated_time_min', 'estimated_time_sec',
  'question_count', 'question_types', 'word_count',
  'length_class', 'structure', 'skills_trained', 'skills',
  'kind', 'kinds', 'genres', 'band', 'letter', 'entry_count', 'language',
  'item_count', 'item_ids', 'member_count',
  'root_origin', 'root_meaning', 'garden', 'word', 'gap_function', 'sentence_count', 'real_source',
]);

export function bootIndexFrom(index) {
  /* `patterns` is the single biggest field in the registry — 63 KB of
     repeated dotted strings — and the curator needs it: aiming at "inference
     versus speculation" instead of at "inference" is the difference between
     the content engine's finest aim working and not existing. Stored as
     indices into one shared list it costs 13 KB, and loader.js expands it
     back on read so nothing downstream knows the difference. */
  const patterns = [...new Set((index.items ?? []).flatMap((r) => r.patterns ?? []))].sort();
  const at = new Map(patterns.map((p, i) => [p, i]));
  return {
    registry_version: index.registry_version,
    description: 'The boot subset of index.json: only the fields src/world and src/village read, with patterns stored as indices into the shared list. Written by tools/build-index.mjs — do not edit.',
    patterns,
    items: (index.items ?? []).map((r) => {
      const o = {};
      for (const k of BOOT_FIELDS) if (r[k] !== undefined) o[k] = r[k];
      if (r.patterns?.length) o.p = r.patterns.map((x) => at.get(x)).filter((n) => n !== undefined);
      return o;
    }),
  };
}

if (CHECK) {
  if (changed) { console.log(`registry is stale: ${changed} field(s) differ, ${appended.length} file(s) unregistered`); process.exit(1); }
  console.log('registry is current');
  process.exit(0);
}
if (changed) {
  index.description = index.description.replace(/ Written by tools\/build-index\.mjs.*$/, '')
    + ' Written by tools/build-index.mjs from the files; rows are kept, mirror fields refreshed, new files appended.';
  fs.writeFileSync(INDEX, JSON.stringify(index, null, 2).split('\n').join(eol) + eol);
}
// The slim one is written every time, from whatever the full one now says,
// so the two cannot drift even if nothing else changed.
{
  const boot = JSON.stringify(bootIndexFrom(index));
  const at = INDEX.replace(/index\.json$/, 'boot-index.json');
  const before = fs.existsSync(at) ? fs.readFileSync(at, 'utf8') : '';
  if (before !== boot) fs.writeFileSync(at, boot);
  console.log(`boot registry: ${Math.round(boot.length / 1024)} KB (full ${Math.round(JSON.stringify(index).length / 1024)} KB)`);
}
console.log(`registry: ${index.items.length} rows · ${changed} field(s) updated · ${appended.length} appended${appended.length ? ` (${appended.slice(0, 6).join(', ')}${appended.length > 6 ? ', …' : ''})` : ''}`);
