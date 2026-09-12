#!/usr/bin/env node
/**
 * tools/check-content.mjs — validate content files one at a time.
 *
 * The full verification (tools/verify.mjs) checks the whole repository,
 * including the registry and the manifest, which an author writing a
 * batch has not rebuilt yet. This checks only what a file itself can be
 * checked for — schema, the loader's cross-field rules, the prose rules —
 * using the app's own validator and consistency functions, so an author
 * gets the same verdict the app would give, in a second, per file.
 *
 *   node tools/check-content.mjs content/reading-comprehension/rc-0036.json …
 *   node tools/check-content.mjs content/sentence-placement          (a whole folder)
 *
 * Exit 0 when every file passes.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mod = (rel) => import(pathToFileURL(join(root, rel)).href);
const { validate } = await mod('src/core/content-loader/validator.js');
const L = await mod('src/core/content-loader/loader.js');

const TYPE_OF_DIR = {
  'reading-comprehension': 'rc', 'para-jumbles': 'pj', 'para-summary': 'ps', 'odd-one-out': 'ooo',
  'sentence-placement': 'sp', 'para-completion': 'pc', 'word-bank': 'wb', 'critical-reasoning': 'cr',
  'word-dna': 'wd', vocabulary: 'vocab', 'language-garden': 'lg', lexicon: 'lex', loanwords: 'loan', twins: 'twin',
};
const CHECK = {
  rc: L.consistencyIssues, pj: L.pjConsistencyIssues, ps: L.psConsistencyIssues, ooo: L.oooConsistencyIssues,
  wd: L.wdConsistencyIssues, vocab: L.vocabConsistencyIssues, lex: L.lexConsistencyIssues, loan: L.loanConsistencyIssues, twin: L.twinConsistencyIssues,
  sp: (id, item) => L.bankConsistencyIssues('sp', id, item), pc: (id, item) => L.bankConsistencyIssues('pc', id, item),
  wb: (id, item) => L.bankConsistencyIssues('wb', id, item), cr: (id, item) => L.bankConsistencyIssues('cr', id, item),
};
const schemaCache = new Map();
const schemaFor = (type, v) => {
  const key = `${type}.schema.v${v}.json`;
  if (!schemaCache.has(key)) schemaCache.set(key, JSON.parse(readFileSync(join(root, 'content/schema', key), 'utf8')));
  return schemaCache.get(key);
};
/* Taxonomy ids: a file may only name skills, patterns and traps that exist.
   qc-corpus catches invented ids across the corpus; catching them per file is
   what lets an author fix their own batch before it reaches the registry. */
const tax = JSON.parse(readFileSync(join(root, 'content/taxonomy/varc-taxonomy.json'), 'utf8'));
const keys = (arr) => new Set((arr ?? []).map((t) => (typeof t === 'string' ? t : t.key ?? t.id)));
const TAX = {
  pattern: new Set(tax.reasoning_patterns.map((p) => p.id)),
  skill: new Set(tax.skills.map((s) => s.key)),
  trap: {
    rc: keys(tax.trap_types),
    sp: keys(tax.verbal.placement_traps),
    wb: keys(tax.verbal.word_traps),
    cr: keys(tax.verbal.cr_traps),
    pj: keys(tax.verbal.pj_traps),
    ps: keys(tax.verbal.ps_archetypes),
    ooo: keys(tax.verbal.ooo_violations),
  },
};
TAX.trap.pc = TAX.trap.sp;
for (const set of Object.values(TAX.trap)) set.add('none');
const ANY_TRAP = new Set([...TAX.trap.rc, ...TAX.trap.sp, ...TAX.trap.wb, ...TAX.trap.cr]);
const TAXONOMY_TYPES = new Set(['rc', 'pj', 'ps', 'ooo', 'sp', 'pc', 'wb', 'cr', 'wd']);

function taxonomyIssues(type, item) {
  if (!TAXONOMY_TYPES.has(type)) return [];
  const out = [];
  const traps = TAX.trap[type] ?? ANY_TRAP;
  const walk = (v, p) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, p + '[' + i + ']')); return; }
    for (const [k, x] of Object.entries(v)) {
      const where = p + '.' + k;
      if ((k === 'patterns' || k === 'reasoning_patterns') && Array.isArray(x)) {
        for (const pid of x) if (!TAX.pattern.has(pid)) out.push(where + ': pattern "' + pid + '" is not in the taxonomy');
      } else if (k === 'skill' && typeof x === 'string') {
        if (!TAX.skill.has(x)) out.push(where + ': skill "' + x + '" is not in the taxonomy');
      } else if ((k === 'trap_type' || k === 'primary_trap') && typeof x === 'string') {
        if (!traps.has(x)) out.push(where + ': trap "' + x + '" is not in the taxonomy for ' + type);
      } else walk(x, where);
    }
  };
  walk(item, item.meta?.id ?? '$');
  return out;
}

const MENTION = /\b[Oo]ptions?\s+([A-D])\b/g;
const WEAK = /\b(is|are) (correct|right|wrong|incorrect) because (it|this|the option) (is|isn't|is not) (supported|stated|mentioned|in the passage)\b/i;

function proseIssues(type, item) {
  const out = [];
  const walk = (v, p) => {
    if (typeof v === 'string') {
      if (/  /.test(v)) out.push(`${p}: double space`);
      if (/ [,;:?!]| \.(?!\.\.)/.test(v)) out.push(`${p}: space before punctuation`);
      if (v !== v.trim() && v.length > 1) out.push(`${p}: leading or trailing space`);
      if (WEAK.test(v)) out.push(`${p}: explains nothing ("is correct because it is supported") — teach the reasoning`);
      if (/\b(realize|recognize|analyze|color|behavior|center|favor|organize)\b/.test(v)) out.push(`${p}: American spelling — the corpus uses British spelling`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`);
  };
  walk(item, item.meta?.id ?? '$');
  // Letter mentions in any explanation prose, for every type.
  const texts = [];
  if (type === 'rc') for (const q of item.questions) { texts.push([q.explanation.correct_reasoning, q.correct, `${q.id} correct_reasoning`]); for (const d of q.explanation.distractors) texts.push([d.why_wrong, d.option, `${q.id} distractor ${d.option}`]); }
  if (type === 'ps') { texts.push([item.question.explanation.correct_reasoning, item.question.correct, 'correct_reasoning']); for (const d of item.question.explanation.distractors) texts.push([d.why_wrong, d.option, `distractor ${d.option}`]); }
  if (type === 'sp' || type === 'pc') { texts.push([item.explanation.correct_reasoning, item.question.correct, 'correct_reasoning']); for (const d of item.explanation.distractors) texts.push([d.why_wrong, d.option, `distractor ${d.option}`]); }
  if (type === 'wb' || type === 'cr') for (const it of item.items) { texts.push([it.explanation.correct_reasoning, it.correct, `${it.id} correct_reasoning`]); for (const d of it.explanation.distractors) texts.push([d.why_wrong, d.option, `${it.id} distractor ${d.option}`]); }
  for (const [t, expected, where] of texts) for (const m of String(t ?? '').matchAll(MENTION)) if (m[1] !== expected) out.push(`${where}: names option ${m[1]} (expected ${expected}); prose must not name letters`);
  return out;
}

const args = process.argv.slice(2);
if (!args.length) { console.error('usage: check-content.mjs <file or folder> …'); process.exit(2); }
const files = [];
for (const a of args) {
  const p = resolve(a);
  if (statSync(p).isDirectory()) for (const f of readdirSync(p).filter((x) => x.endsWith('.json')).sort()) files.push(join(p, f));
  else files.push(p);
}
let failed = 0;
for (const file of files) {
  const dir = basename(dirname(file));
  const type = TYPE_OF_DIR[dir];
  const id = basename(file, '.json');
  let item;
  try { item = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.log(`  !!  ${id}: invalid JSON — ${e.message}`); failed += 1; continue; }
  if (!type) { console.log(`  ??  ${id}: not in a content folder`); continue; }
  let schema;
  try { schema = schemaFor(type, item.schema_version ?? 1); } catch { console.log(`  !!  ${id}: no ${type} schema v${item.schema_version}`); failed += 1; continue; }
  const { valid, errors } = validate(schema, item);
  const issues = valid ? (CHECK[type]?.(id, item) ?? []) : [];
  const prose = valid ? proseIssues(type, item) : [];
  const taxo = valid ? taxonomyIssues(type, item) : [];
  const all = [...errors, ...issues, ...prose, ...taxo];
  if (all.length) { failed += 1; console.log(`  !!  ${id}: ${all.length} problem(s)`); for (const x of all) console.log(`        - ${x}`); }
  else {
    const extra = type === 'rc' ? ` · ${item.meta.word_count} words · ${item.questions.length} Q · keys ${item.questions.map((q) => q.correct).join('')}` : (type === 'wb' || type === 'cr') ? ` · ${item.items.length} items · keys ${item.items.map((q) => q.correct).join('')}` : '';
    console.log(`  ok  ${id} (${type} v${item.schema_version ?? 1}${extra})`);
  }
}
console.log(`\n${files.length - failed} / ${files.length} files pass`);
process.exit(failed ? 1 : 0);
