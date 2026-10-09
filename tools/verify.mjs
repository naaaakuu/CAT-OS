#!/usr/bin/env node
/**
 * tools/verify.mjs — the repository's self-check.
 *
 * Runs with plain Node (no dependencies, matching the no-npm rule) and
 * reuses the SAME validator and consistency rules the app uses at
 * runtime (src/core/content-loader/), so "valid in the tool" and
 * "valid in the browser" can never drift apart.
 *
 * It checks:
 *   1. Every JS file parses (via dynamic import of pure-logic modules;
 *      DOM modules are syntax-checked by node --check in the harness).
 *   2. Every content JSON parses.
 *   3. Every RC passage validates against rc.schema.vN and passes the
 *      cross-field consistency checks.
 *   4. The registry and the passage files agree (same ids, metadata).
 *   5. The service worker precache lists match the files on disk.
 *   6. A dry run of the pure engine (session + scoring) behaves.
 *
 * Usage:  node tools/verify.mjs
 * Exit 0 = repository internally consistent; non-zero = problems.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Dynamic import needs a file:// URL — a raw absolute path breaks on
   Windows (drive letters parse as URL schemes). */
const mod = (rel) => import(pathToFileURL(join(root, rel)).href);
const problems = [];
const ok = (m) => console.log(`  ok  ${m}`);
const bad = (m) => { problems.push(m); console.log(`  !!  ${m}`); };

function readJSON(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

/* ---- import the app's real validation code ---- */
const { validate } = await mod('src/core/content-loader/validator.js');
const { consistencyIssues, pjConsistencyIssues, psConsistencyIssues, oooConsistencyIssues, wdConsistencyIssues, vocabConsistencyIssues, lgConsistencyIssues, lexConsistencyIssues, loanConsistencyIssues, twinConsistencyIssues } = await mod('src/core/content-loader/loader.js');
const { PracticeSession } = await mod('src/core/engine/session.js');
const { sessionXP, totalXP, levelFromXP, xpForNext } = await mod('src/core/engagement/xp.js');
const { deriveStreaks, weekActivity, dayKey } = await mod('src/core/engagement/streaks.js');
const { deriveEngagement } = await mod('src/core/engagement/stats.js');
const { evaluate, newlyUnlocked } = await mod('src/core/engagement/achievements.js');
const { computeScore } = await mod('src/core/engine/scoring.js');

console.log('\n1. Content JSON: schema + consistency');
const schemas = {};
for (const f of readdirSync(join(root, 'content/schema'))) {
  if (f.startsWith('rc.schema.v')) schemas[f.match(/v(\d+)/)[1]] = readJSON(`content/schema/${f}`);
}
/* Schema-shape checks (e.g. the mentor voice lint in §9) target the NEWEST
   schema on disk, so appending a version (v4 …) keeps them in step. */
const latestSchemaV = String(Math.max(...Object.keys(schemas).map(Number)));
const rcDir = 'content/reading-comprehension';
const rcFiles = readdirSync(join(root, rcDir)).filter((f) => f.endsWith('.json')).sort();

for (const file of rcFiles) {
  const id = file.replace('.json', '');
  let item;
  try { item = readJSON(`${rcDir}/${file}`); }
  catch (e) { bad(`${file}: invalid JSON — ${e.message}`); continue; }

  const schema = schemas[String(item.schema_version ?? 1)];
  if (!schema) { bad(`${file}: no schema for version ${item.schema_version}`); continue; }
  const { valid, errors } = validate(schema, item);
  if (!valid) { errors.forEach((e) => bad(`${file}: ${e}`)); continue; }

  const issues = consistencyIssues(id, item);
  if (issues.length) { issues.forEach((i) => bad(`${file}: ${i}`)); continue; }

  ok(`${file} (v${item.schema_version} ${item.meta.stage ?? '-'}/${item.meta.difficulty}, ${item.questions.length} Q${item.mentor ? ', mentor' : ''})`);
}

/* Para Jumbles content: same boundary discipline via pj.schema + the
   app's own pjConsistencyIssues (loader.js), so tool and browser agree. */
console.log('\n1b. Para Jumbles JSON: schema + consistency');
const pjSchemas = {};
for (const f of readdirSync(join(root, 'content/schema'))) {
  if (f.startsWith('pj.schema.v')) pjSchemas[f.match(/v(\d+)/)[1]] = readJSON(`content/schema/${f}`);
}
const pjDir = 'content/para-jumbles';
const pjFiles = existsSync(join(root, pjDir))
  ? readdirSync(join(root, pjDir)).filter((f) => f.endsWith('.json')).sort() : [];
for (const file of pjFiles) {
  const id = file.replace('.json', '');
  let item;
  try { item = readJSON(`${pjDir}/${file}`); }
  catch (e) { bad(`${file}: invalid JSON — ${e.message}`); continue; }
  const schema = pjSchemas[String(item.schema_version ?? 1)];
  if (!schema) { bad(`${file}: no PJ schema for version ${item.schema_version}`); continue; }
  const { valid, errors } = validate(schema, item);
  if (!valid) { errors.forEach((e) => bad(`${file}: ${e}`)); continue; }
  const issues = pjConsistencyIssues(id, item);
  if (issues.length) { issues.forEach((i) => bad(`${file}: ${i}`)); continue; }
  ok(`${file} (${item.meta.tier}/${item.meta.difficulty}, ${item.sentences.length} sentences, ${item.explanation.tempting_orders.length} traps walked)`);
}

/* Para Summary content: same boundary discipline via ps.schema + the
   app's own psConsistencyIssues (loader.js), so tool and browser agree. */
console.log('\n1c. Para Summary JSON: schema + consistency');
const psSchemas = {};
for (const f of readdirSync(join(root, 'content/schema'))) {
  if (f.startsWith('ps.schema.v')) psSchemas[f.match(/v(\d+)/)[1]] = readJSON(`content/schema/${f}`);
}
const psDir = 'content/para-summary';
const psFiles = existsSync(join(root, psDir))
  ? readdirSync(join(root, psDir)).filter((f) => f.endsWith('.json')).sort() : [];
for (const file of psFiles) {
  const id = file.replace('.json', '');
  let item;
  try { item = readJSON(`${psDir}/${file}`); }
  catch (e) { bad(`${file}: invalid JSON — ${e.message}`); continue; }
  const schema = psSchemas[String(item.schema_version ?? 1)];
  if (!schema) { bad(`${file}: no PS schema for version ${item.schema_version}`); continue; }
  const { valid, errors } = validate(schema, item);
  if (!valid) { errors.forEach((e) => bad(`${file}: ${e}`)); continue; }
  const issues = psConsistencyIssues(id, item);
  if (issues.length) { issues.forEach((i) => bad(`${file}: ${i}`)); continue; }
  ok(`${file} (${item.meta.tier}/${item.meta.difficulty}, ${item.meta.architecture}, correct ${item.question.correct})`);
}
/* Batch-level fairness (Bible §8/§10): the correct position must not
   concentrate, architectures must vary, and concession-turn must not
   dominate the bank (§14 warns it teaches however-hunting). */
if (psFiles.length >= 8) {
  const items = psFiles.map((f) => readJSON(`${psDir}/${f}`));
  const byLetter = { A: 0, B: 0, C: 0, D: 0 };
  for (const it of items) byLetter[it.question.correct] += 1;
  for (const [letter, n] of Object.entries(byLetter)) {
    if (n / items.length > 0.4) bad(`ps batch: correct answer sits at ${letter} in ${n} of ${items.length} items (position leaks)`);
  }
  const architectures = new Set(items.map((it) => it.meta.architecture));
  if (architectures.size < 4) bad(`ps batch: only ${architectures.size} architectures used; vary the shapes (Bible §9)`);
  const turnShare = items.filter((it) => it.meta.architecture === 'concession_turn_thesis').length / items.length;
  if (turnShare > 0.4) bad(`ps batch: ${Math.round(turnShare * 100)}% concession-turn paragraphs (Bible §14 cap)`);
  const missions = new Set(items.map((it) => it.meta.mission));
  if (problems.filter((p) => p.startsWith('ps batch')).length === 0) {
    ok(`batch balance: positions ${Object.values(byLetter).join('/')}, ${architectures.size} architectures, ${missions.size} missions, ${Math.round(turnShare * 100)}% concession-turn`);
  }
}

/* Odd One Out content: same boundary discipline via ooo.schema + the
   app's own oooConsistencyIssues (loader.js), so tool and browser agree. */
console.log('\n1d. Odd One Out JSON: schema + consistency');
const oooSchemas = {};
for (const f of readdirSync(join(root, 'content/schema'))) {
  if (f.startsWith('ooo.schema.v')) oooSchemas[f.match(/v(\d+)/)[1]] = readJSON(`content/schema/${f}`);
}
const oooDir = 'content/odd-one-out';
const oooFiles = existsSync(join(root, oooDir))
  ? readdirSync(join(root, oooDir)).filter((f) => f.endsWith('.json')).sort() : [];
for (const file of oooFiles) {
  const id = file.replace('.json', '');
  let item;
  try { item = readJSON(`${oooDir}/${file}`); }
  catch (e) { bad(`${file}: invalid JSON — ${e.message}`); continue; }
  const schema = oooSchemas[String(item.schema_version ?? 1)];
  if (!schema) { bad(`${file}: no OOO schema for version ${item.schema_version}`); continue; }
  const { valid, errors } = validate(schema, item);
  if (!valid) { errors.forEach((e) => bad(`${file}: ${e}`)); continue; }
  const issues = oooConsistencyIssues(id, item);
  if (issues.length) { issues.forEach((i) => bad(`${file}: ${i}`)); continue; }
  ok(`${file} (${item.meta.tier}/${item.meta.difficulty}, ${item.meta.violation_type}, outlier ${item.outlier})`);
}
/* Batch-level fairness (Bible §5/§10): because OOO is TITA with no options,
   the correct sentence must not concentrate on one label (an answer-position
   leak), and the seven violation types must genuinely vary across the bank. */
if (oooFiles.length >= 8) {
  const items = oooFiles.map((f) => readJSON(`${oooDir}/${f}`));
  const byLetter = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const it of items) byLetter[it.outlier] += 1;
  for (const [letter, n] of Object.entries(byLetter)) {
    if (n / items.length > 0.35) bad(`ooo batch: outlier sits at ${letter} in ${n} of ${items.length} items (answer position leaks)`);
  }
  const violations = new Set(items.map((it) => it.meta.violation_type));
  if (violations.size < 5) bad(`ooo batch: only ${violations.size} violation types used; vary the outlier's crime (Bible §4)`);
  // Every practicable medium+ item must be heuristic-adversarial (Bible §10),
  // so a pure surface-heuristic solver cannot farm the bank.
  const ADV = ['medium', 'advanced', 'cat', 'cat-plus', 'ninety-nine', 'premium'];
  for (const it of items) {
    if (ADV.includes(it.meta.tier) && it.meta.validation.heuristic_adversarial !== 'pass') {
      bad(`ooo batch: ${it.meta.id} (${it.meta.tier}) is not heuristic-adversarial (Bible §10)`);
    }
  }
  const missions = new Set(items.map((it) => it.meta.mission));
  if (problems.filter((p) => p.startsWith('ooo batch')).length === 0) {
    ok(`batch balance: outlier positions ${Object.values(byLetter).join('/')}, ${violations.size} violation types, ${missions.size} missions`);
  }
}

console.log('\n1e. Word DNA JSON: schema + consistency');
const wdSchemas = {};
for (const f of readdirSync(join(root, 'content/schema'))) {
  if (f.startsWith('wd.schema.v')) wdSchemas[f.match(/v(\d+)/)[1]] = readJSON(`content/schema/${f}`);
}
const wdDir = 'content/word-dna';
const wdFiles = existsSync(join(root, wdDir))
  ? readdirSync(join(root, wdDir)).filter((f) => f.endsWith('.json')).sort() : [];
for (const file of wdFiles) {
  const id = file.replace('.json', '');
  let item;
  try { item = readJSON(`${wdDir}/${file}`); }
  catch (e) { bad(`${file}: invalid JSON — ${e.message}`); continue; }
  const schema = wdSchemas[String(item.schema_version ?? 1)];
  if (!schema) { bad(`${file}: no Word DNA schema for version ${item.schema_version}`); continue; }
  const { valid, errors } = validate(schema, item);
  if (!valid) { errors.forEach((e) => bad(`${file}: ${e}`)); continue; }
  const issues = wdConsistencyIssues(id, item);
  if (issues.length) { issues.forEach((i) => bad(`${file}: ${i}`)); continue; }
  ok(`${file} (${item.meta.kind}, ${item.unit.label}, ${item.members.length} words)`);
}
if (wdFiles.length > 0) {
  const kinds = new Set(wdFiles.map((f) => readJSON(`${wdDir}/${f}`).meta.kind));
  if (problems.filter((p) => wdFiles.some((f) => p.startsWith(f))).length === 0) {
    ok(`batch spans ${kinds.size} Language Tree branches: ${[...kinds].join(', ')}`);
  }
}

/* Vocabulary content: the shared word substrate every Language Garden
   plant references by id (LANGUAGE_GARDEN_BIBLE §10). */
console.log('\n1f. Vocabulary JSON: schema + consistency');
const vocabSchemas = {};
for (const f of readdirSync(join(root, 'content/schema'))) {
  if (f.startsWith('vocab.schema.v')) vocabSchemas[f.match(/v(\d+)/)[1]] = readJSON(`content/schema/${f}`);
}
const vocabDir = 'content/vocabulary';
const vocabFiles = existsSync(join(root, vocabDir))
  ? readdirSync(join(root, vocabDir)).filter((f) => f.endsWith('.json')).sort() : [];
const vocabById = new Map();
for (const file of vocabFiles) {
  const id = file.replace('.json', '');
  let item;
  try { item = readJSON(`${vocabDir}/${file}`); }
  catch (e) { bad(`${file}: invalid JSON — ${e.message}`); continue; }
  const schema = vocabSchemas[String(item.schema_version ?? 1)];
  if (!schema) { bad(`${file}: no vocab schema for version ${item.schema_version}`); continue; }
  const { valid, errors } = validate(schema, item);
  if (!valid) { errors.forEach((e) => bad(`${file}: ${e}`)); continue; }
  const issues = vocabConsistencyIssues(id, item);
  if (issues.length) { issues.forEach((i) => bad(`${file}: ${i}`)); continue; }
  vocabById.set(id, item);
  ok(`${file} (${item.word})`);
}

/* Language Garden (lg-*) plants: schema-validate the family file, then
   manually resolve each member's vocab_id (NOT via loadLGItem — that
   loader calls fetch(), which has no meaning against the filesystem
   under plain Node; every other section here reads files the same way)
   before running the cross-file consistency checks. */
console.log('\n1g. Language Garden JSON: schema + consistency');
const lgSchemas = {};
for (const f of readdirSync(join(root, 'content/schema'))) {
  if (f.startsWith('lg.schema.v')) lgSchemas[f.match(/v(\d+)/)[1]] = readJSON(`content/schema/${f}`);
}
const lgDir = 'content/language-garden';
const lgFiles = existsSync(join(root, lgDir))
  ? readdirSync(join(root, lgDir)).filter((f) => f.endsWith('.json')).sort() : [];
const lgResolved = new Map();
for (const file of lgFiles) {
  const id = file.replace('.json', '');
  let item;
  try { item = readJSON(`${lgDir}/${file}`); }
  catch (e) { bad(`${file}: invalid JSON — ${e.message}`); continue; }
  const schema = lgSchemas[String(item.schema_version ?? 1)];
  if (!schema) { bad(`${file}: no Language Garden schema for version ${item.schema_version}`); continue; }
  const { valid, errors } = validate(schema, item);
  if (!valid) { errors.forEach((e) => bad(`${file}: ${e}`)); continue; }

  const missingVocab = item.members.map((m) => m.vocab_id).filter((v) => !vocabById.has(v));
  if (missingVocab.length) { bad(`${file}: references unknown vocabulary ${missingVocab.join(', ')}`); continue; }
  const resolved = {
    ...item,
    members: item.members.map((m) => {
      const v = vocabById.get(m.vocab_id);
      return { ...m, word: v.word, meaning: v.meaning, part_of_speech: v.part_of_speech ?? null };
    }),
  };
  const issues = lgConsistencyIssues(id, resolved);
  if (issues.length) { issues.forEach((i) => bad(`${file}: ${i}`)); continue; }
  lgResolved.set(id, resolved);
  const taught = resolved.members.filter((m) => !m.held_out).length;
  const reach = resolved.members.length - taught;
  ok(`${file} (${resolved.root.label}, ${taught} taught, ${reach} reach)`);
}

/* Lexicon (lex-*), loanword (loan-*) and confusable-twin (twin-*)
   bundles — the owner's reference corpus (KNOWLEDGE/99_REFERENCE)
   transcribed by tools/build-lexicon.mjs. Schema + the loader's own
   consistency rules per bundle, then a per-band / per-type total so a
   silent drop in the corpus is visible at a glance. */
console.log('\n1h. Lexicon / loanword / twin JSON: schema + consistency');
const bundleKinds = [
  { type: 'lex',  dir: 'content/lexicon',   label: 'lexicon',  check: lexConsistencyIssues,  idRe: /^lex-(high|medium|low)-([a-z]|other)$/ },
  { type: 'loan', dir: 'content/loanwords', label: 'loanword', check: loanConsistencyIssues, idRe: /^loan-[a-z0-9]+(-[a-z0-9]+)*$/ },
  { type: 'twin', dir: 'content/twins',     label: 'twin',     check: twinConsistencyIssues, idRe: /^twin-[a-z]$/ },
];
const bundleFiles = {};        // type → sorted file names on disk
const bundleById = new Map();  // id → parsed bundle (only those that passed)
for (const kind of bundleKinds) {
  const schemas = {};
  for (const f of readdirSync(join(root, 'content/schema'))) {
    if (f.startsWith(`${kind.type}.schema.v`)) schemas[f.match(/v(\d+)/)[1]] = readJSON(`content/schema/${f}`);
  }
  bundleFiles[kind.type] = existsSync(join(root, kind.dir))
    ? readdirSync(join(root, kind.dir)).filter((f) => f.endsWith('.json')).sort() : [];
  for (const file of bundleFiles[kind.type]) {
    const id = file.replace('.json', '');
    let item;
    try { item = readJSON(`${kind.dir}/${file}`); }
    catch (e) { bad(`${file}: invalid JSON — ${e.message}`); continue; }
    if (!kind.idRe.test(id)) { bad(`${file}: file name is not a valid ${kind.label} bundle id`); continue; }
    const schema = schemas[String(item.schema_version ?? 1)];
    if (!schema) { bad(`${file}: no ${kind.label} schema for version ${item.schema_version}`); continue; }
    const { valid, errors } = validate(schema, item);
    if (!valid) { errors.forEach((e) => bad(`${file}: ${e}`)); continue; }
    const issues = kind.check(id, item);
    if (issues.length) { issues.forEach((i) => bad(`${file}: ${i}`)); continue; }
    bundleById.set(id, item);
    ok(`${file} (${item.meta.title}, ${item.entries.length} entries)`);
  }
}
{
  const totals = { high: 0, medium: 0, low: 0, loan: 0, twin: 0 };
  const languages = new Set();
  let twinSplit = 0;
  for (const item of bundleById.values()) {
    const m = item.meta;
    if (m.type === 'lex') totals[m.band] += item.entries.length;
    if (m.type === 'loan') { totals.loan += item.entries.length; languages.add(m.language); }
    if (m.type === 'twin') { totals.twin += item.entries.length; twinSplit += item.entries.filter((e) => e.split).length; }
  }
  for (const [k, v] of Object.entries(totals)) {
    if (v === 0) bad(`reference corpus: no ${k} entries on disk (run node tools/build-lexicon.mjs)`);
  }
  console.log(`      totals: lexicon high ${totals.high} · medium ${totals.medium} · low ${totals.low}`
    + ` (${totals.high + totals.medium + totals.low} words) · loanwords ${totals.loan} across ${languages.size} languages`
    + ` · twins ${totals.twin} (${twinSplit} split per word)`);
}

console.log('\n2. Registry ↔ files agreement');
const registry = readJSON('content/index.json');
const rcRegIds = registry.items.filter((i) => i.type === 'rc').map((i) => i.id).sort();
const pjRegIds = registry.items.filter((i) => i.type === 'pj').map((i) => i.id).sort();
const psRegIds = registry.items.filter((i) => i.type === 'ps').map((i) => i.id).sort();
const oooRegIds = registry.items.filter((i) => i.type === 'ooo').map((i) => i.id).sort();
const wdRegIds = registry.items.filter((i) => i.type === 'wd').map((i) => i.id).sort();
const fileIds = rcFiles.map((f) => f.replace('.json', ''));
const pjFileIds = pjFiles.map((f) => f.replace('.json', ''));
const psFileIds = psFiles.map((f) => f.replace('.json', ''));
const oooFileIds = oooFiles.map((f) => f.replace('.json', ''));
const wdFileIds = wdFiles.map((f) => f.replace('.json', ''));
for (const id of rcRegIds) {
  if (!fileIds.includes(id)) bad(`registry lists RC ${id} but no file exists`);
}
for (const id of fileIds) {
  if (!rcRegIds.includes(id)) bad(`file ${id}.json has no registry entry`);
}
for (const id of pjRegIds) {
  if (!pjFileIds.includes(id)) bad(`registry lists PJ ${id} but no file exists`);
}
for (const id of pjFileIds) {
  if (!pjRegIds.includes(id)) bad(`file ${id}.json has no registry entry`);
}
for (const id of psRegIds) {
  if (!psFileIds.includes(id)) bad(`registry lists PS ${id} but no file exists`);
}
for (const id of psFileIds) {
  if (!psRegIds.includes(id)) bad(`file ${id}.json has no registry entry`);
}
for (const id of oooRegIds) {
  if (!oooFileIds.includes(id)) bad(`registry lists OOO ${id} but no file exists`);
}
for (const id of oooFileIds) {
  if (!oooRegIds.includes(id)) bad(`file ${id}.json has no registry entry`);
}
for (const id of wdRegIds) {
  if (!wdFileIds.includes(id)) bad(`registry lists Word DNA ${id} but no file exists`);
}
for (const id of wdFileIds) {
  if (!wdRegIds.includes(id)) bad(`file ${id}.json has no registry entry`);
}
// Word DNA registry fields must mirror the file (title, kind, member count, time).
for (const entry of registry.items.filter((i) => i.type === 'wd')) {
  if (!wdFileIds.includes(entry.id)) continue;
  const item = readJSON(`${wdDir}/${entry.id}.json`);
  if (entry.title !== item.meta.title) bad(`${entry.id}: registry title ≠ file meta.title`);
  if (entry.kind !== item.meta.kind) bad(`${entry.id}: registry kind ≠ file`);
  if (entry.member_count !== item.members.length) {
    bad(`${entry.id}: registry member_count ${entry.member_count} ≠ ${item.members.length} members`);
  }
  const mins = Math.round(item.meta.estimated_time_sec / 60 * 10) / 10;
  if (entry.estimated_time_min !== mins) bad(`${entry.id}: registry estimated_time_min ${entry.estimated_time_min} ≠ ${mins}`);
}
// PS registry fields must mirror the file (title, difficulty, tier, time).
for (const entry of registry.items.filter((i) => i.type === 'ps')) {
  if (!psFileIds.includes(entry.id)) continue;
  const item = readJSON(`${psDir}/${entry.id}.json`);
  if (entry.title !== item.meta.title) bad(`${entry.id}: registry title ≠ file meta.title`);
  if (entry.difficulty !== item.meta.difficulty) bad(`${entry.id}: registry difficulty ≠ file`);
  if (entry.difficulty_numeric !== item.meta.difficulty_numeric) bad(`${entry.id}: registry difficulty_numeric ≠ file`);
  if (entry.tier !== item.meta.tier) bad(`${entry.id}: registry tier ${entry.tier} ≠ file ${item.meta.tier}`);
  if (entry.bible_level !== item.meta.bible_level) bad(`${entry.id}: registry bible_level ≠ file`);
  if (entry.mission !== item.meta.mission) bad(`${entry.id}: registry mission ≠ file`);
  if (entry.architecture !== item.meta.architecture) bad(`${entry.id}: registry architecture ≠ file`);
  const mins = Math.round(item.meta.estimated_time_sec / 60 * 10) / 10;
  if (entry.estimated_time_min !== mins) bad(`${entry.id}: registry estimated_time_min ${entry.estimated_time_min} ≠ ${mins}`);
}
// PJ registry fields must mirror the file (title, difficulty, tier, time).
for (const entry of registry.items.filter((i) => i.type === 'pj')) {
  if (!pjFileIds.includes(entry.id)) continue;
  const item = readJSON(`${pjDir}/${entry.id}.json`);
  if (entry.title !== item.meta.title) bad(`${entry.id}: registry title ≠ file meta.title`);
  if (entry.difficulty !== item.meta.difficulty) bad(`${entry.id}: registry difficulty ≠ file`);
  if (entry.difficulty_numeric !== item.meta.difficulty_numeric) bad(`${entry.id}: registry difficulty_numeric ≠ file`);
  if (entry.tier !== item.meta.tier) bad(`${entry.id}: registry tier ${entry.tier} ≠ file ${item.meta.tier}`);
  const mins = Math.round(item.meta.estimated_time_sec / 60 * 10) / 10;
  if (entry.estimated_time_min !== mins) bad(`${entry.id}: registry estimated_time_min ${entry.estimated_time_min} ≠ ${mins}`);
}
// OOO registry fields must mirror the file (title, difficulty, tier, time, tags).
for (const entry of registry.items.filter((i) => i.type === 'ooo')) {
  if (!oooFileIds.includes(entry.id)) continue;
  const item = readJSON(`${oooDir}/${entry.id}.json`);
  if (entry.title !== item.meta.title) bad(`${entry.id}: registry title ≠ file meta.title`);
  if (entry.difficulty !== item.meta.difficulty) bad(`${entry.id}: registry difficulty ≠ file`);
  if (entry.difficulty_numeric !== item.meta.difficulty_numeric) bad(`${entry.id}: registry difficulty_numeric ≠ file`);
  if (entry.tier !== item.meta.tier) bad(`${entry.id}: registry tier ${entry.tier} ≠ file ${item.meta.tier}`);
  if (entry.spine_type !== item.meta.spine_type) bad(`${entry.id}: registry spine_type ≠ file`);
  if (entry.violation_type !== item.meta.violation_type) bad(`${entry.id}: registry violation_type ≠ file`);
  if (entry.mission !== item.meta.mission) bad(`${entry.id}: registry mission ≠ file`);
  const mins = Math.round(item.meta.estimated_time_sec / 60 * 10) / 10;
  if (entry.estimated_time_min !== mins) bad(`${entry.id}: registry estimated_time_min ${entry.estimated_time_min} ≠ ${mins}`);
}
for (const entry of registry.items) {
  if (entry.type !== 'rc' || !fileIds.includes(entry.id)) continue;
  const item = readJSON(`${rcDir}/${entry.id}.json`);
  if (entry.question_count !== item.meta.question_count) {
    bad(`${entry.id}: registry question_count ${entry.question_count} ≠ file ${item.meta.question_count}`);
  }
  if (entry.difficulty !== item.meta.difficulty) {
    bad(`${entry.id}: registry difficulty ${entry.difficulty} ≠ file ${item.meta.difficulty}`);
  }
  if (entry.title !== item.passage.title) {
    bad(`${entry.id}: registry title ≠ passage title`);
  }
  // 0.6.0: the journey orders by these registry fields — they must mirror the file.
  if (entry.stage !== item.meta.stage) {
    bad(`${entry.id}: registry stage ${entry.stage} ≠ file ${item.meta.stage}`);
  }
  if (entry.difficulty_numeric !== item.meta.difficulty_numeric) {
    bad(`${entry.id}: registry difficulty_numeric ${entry.difficulty_numeric} ≠ file ${item.meta.difficulty_numeric}`);
  }
  if (entry.estimated_time_min !== item.meta.estimated_time_min) {
    bad(`${entry.id}: registry estimated_time_min ${entry.estimated_time_min} ≠ file ${item.meta.estimated_time_min}`);
  }
  if (entry.word_count !== item.meta.word_count) {
    bad(`${entry.id}: registry word_count ${entry.word_count} ≠ file ${item.meta.word_count}`);
  }
}

// Vocabulary + Language Garden: same mutual-existence + field-mirror discipline.
const vocabRegIds = registry.items.filter((i) => i.type === 'vocab').map((i) => i.id).sort();
const lgRegIds = registry.items.filter((i) => i.type === 'lg').map((i) => i.id).sort();
const vocabFileIds = vocabFiles.map((f) => f.replace('.json', ''));
const lgFileIds = lgFiles.map((f) => f.replace('.json', ''));
for (const id of vocabRegIds) {
  if (!vocabFileIds.includes(id)) bad(`registry lists vocabulary ${id} but no file exists`);
}
for (const id of vocabFileIds) {
  if (!vocabRegIds.includes(id)) bad(`file ${id}.json has no registry entry`);
}
for (const id of lgRegIds) {
  if (!lgFileIds.includes(id)) bad(`registry lists Language Garden ${id} but no file exists`);
}
for (const id of lgFileIds) {
  if (!lgRegIds.includes(id)) bad(`file ${id}.json has no registry entry`);
}
for (const entry of registry.items.filter((i) => i.type === 'vocab')) {
  if (!vocabById.has(entry.id)) continue;
  if (entry.word !== vocabById.get(entry.id).word) bad(`${entry.id}: registry word ≠ file word`);
}
for (const entry of registry.items.filter((i) => i.type === 'lg')) {
  if (!lgResolved.has(entry.id)) continue;
  const item = lgResolved.get(entry.id);
  if (entry.title !== item.meta.title) bad(`${entry.id}: registry title ≠ file meta.title`);
  if (entry.garden !== item.meta.garden) bad(`${entry.id}: registry garden ≠ file`);
  if (entry.member_count !== item.members.length) {
    bad(`${entry.id}: registry member_count ${entry.member_count} ≠ ${item.members.length} members`);
  }
  const mins = Math.round(item.meta.estimated_time_sec / 60 * 10) / 10;
  if (entry.estimated_time_min !== mins) bad(`${entry.id}: registry estimated_time_min ${entry.estimated_time_min} ≠ ${mins}`);
}

// Lexicon / loanword / twin bundles: mutual existence + field mirror
// (a browse screen reads band / letter / language / entry_count from
// the registry without opening the bundle, so the two must agree).
const bundleRegIds = {};
for (const kind of bundleKinds) {
  const regIds = registry.items.filter((i) => i.type === kind.type).map((i) => i.id).sort();
  const fileIds = bundleFiles[kind.type].map((f) => f.replace('.json', ''));
  bundleRegIds[kind.type] = regIds;
  for (const id of regIds) {
    if (!fileIds.includes(id)) bad(`registry lists ${kind.label} ${id} but no file exists`);
  }
  for (const id of fileIds) {
    if (!regIds.includes(id)) bad(`file ${id}.json has no registry entry`);
  }
  for (const entry of registry.items.filter((i) => i.type === kind.type)) {
    if (!bundleById.has(entry.id)) continue;
    const item = bundleById.get(entry.id);
    const m = item.meta;
    if (entry.status !== m.status) bad(`${entry.id}: registry status ≠ file meta.status`);
    if (entry.title !== m.title) bad(`${entry.id}: registry title ≠ file meta.title`);
    if (entry.entry_count !== item.entries.length) {
      bad(`${entry.id}: registry entry_count ${entry.entry_count} ≠ ${item.entries.length} entries`);
    }
    for (const f of ['band', 'letter', 'language']) {
      if (f in m && entry[f] !== m[f]) bad(`${entry.id}: registry ${f} "${entry[f]}" ≠ file "${m[f]}"`);
    }
    if (entry.schema_version !== item.schema_version) bad(`${entry.id}: registry schema_version ≠ file`);
    if (entry.version !== m.version) bad(`${entry.id}: registry version ≠ file meta.version`);
    if (entry.date_added !== m.date_added) bad(`${entry.id}: registry date_added ≠ file`);
    if (entry.batch_id !== m.batch_id) bad(`${entry.id}: registry batch_id ≠ file`);
  }
}

if (problems.length === 0) ok(`${rcRegIds.length} RC + ${pjRegIds.length} PJ + ${psRegIds.length} PS + ${oooRegIds.length} OOO + ${wdRegIds.length} Word DNA + ${vocabRegIds.length} vocab + ${lgRegIds.length} Language Garden items + ${bundleRegIds.lex.length} lexicon + ${bundleRegIds.loan.length} loanword + ${bundleRegIds.twin.length} twin bundles agree with registry`);

console.log('\n3. Service worker precache ↔ disk');
const sw = readFileSync(join(root, 'service-worker.js'), 'utf8');
const listed = [...sw.matchAll(/'(\.\/[^']+)'/g)].map((m) => m[1]);
for (const p of listed) {
  if (p === './') continue;
  if (!existsSync(join(root, p))) bad(`service worker precaches missing file: ${p}`);
}
// The banks are not precached (see service-worker.js): every bank file
// must be in the library manifest instead, and every manifest entry must
// exist. Reference content is still precached below.
const manifest = readJSON('content/manifest.json');
const manifestSet = new Set(manifest.files);
for (const p of manifest.files) {
  if (!existsSync(join(root, p))) bad(`manifest lists a missing file: ${p}`);
  if (listed.includes(`./${p}`)) bad(`${p} is both precached and in the manifest; pick one`);
}
for (const [dir, files] of [[rcDir, rcFiles], [pjDir, pjFiles], [psDir, psFiles], [oooDir, oooFiles]]) {
  for (const file of files) {
    const p = `${dir}/${file}`;
    if (!manifestSet.has(p)) bad(`bank file not in content/manifest.json: ${p} (run node tools/build-manifest.mjs)`);
  }
}
for (const dir of ['content/sentence-placement', 'content/para-completion', 'content/word-bank', 'content/critical-reasoning']) {
  if (!existsSync(join(root, dir))) continue;
  for (const file of readdirSync(join(root, dir)).filter((f) => f.endsWith('.json'))) {
    if (!manifestSet.has(`${dir}/${file}`)) bad(`bank file not in content/manifest.json: ${dir}/${file} (run node tools/build-manifest.mjs)`);
  }
}
if (!listed.includes('./content/manifest.json')) bad('library manifest not precached');
for (const file of wdFiles) {
  const path = `./${wdDir}/${file}`;
  if (!listed.includes(path)) bad(`content file not in service worker precache: ${path}`);
}
for (const file of vocabFiles) {
  const path = `./${vocabDir}/${file}`;
  if (!listed.includes(path)) bad(`content file not in service worker precache: ${path}`);
}
for (const file of lgFiles) {
  const path = `./${lgDir}/${file}`;
  if (!listed.includes(path)) bad(`content file not in service worker precache: ${path}`);
}
for (const kind of bundleKinds) {
  for (const file of bundleFiles[kind.type]) {
    const path = `./${kind.dir}/${file}`;
    if (!listed.includes(path)) bad(`content file not in service worker precache: ${path}`);
  }
}
if (!listed.includes('./content/index.json')) bad('registry not precached');
// Every schema version on disk must be precached — offline validation needs it.
for (const f of readdirSync(join(root, 'content/schema'))) {
  if (f.endsWith('.json') && !listed.includes(`./content/schema/${f}`)) {
    bad(`schema not precached: ${f}`);
  }
}
if (problems.filter((p) => p.includes('service worker') || p.includes('precache')).length === 0) {
  ok(`${listed.length} precache entries all exist on disk`);
}

console.log('\n4. Module graph resolves (no-build app: imports ARE the bundler)');
{
  const seen = new Set();
  const queue = ['src/app.js'];
  const importRe = /import\s+(?:[\s\S]*?from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;
  while (queue.length) {
    const rel = queue.pop();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = join(root, rel);
    if (!existsSync(abs)) { bad(`module graph: ${rel} does not exist`); continue; }
    const source = readFileSync(abs, 'utf8');
    for (const m of source.matchAll(importRe)) {
      const dir = rel.split('/').slice(0, -1).join('/');
      const parts = `${dir}/${m[1]}`.split('/');
      const out = [];
      for (const p of parts) {
        if (p === '.' || p === '') continue;
        else if (p === '..') out.pop();
        else out.push(p);
      }
      queue.push(out.join('/'));
    }
  }
  // Every reachable module must be precached, or the app only breaks OFFLINE.
  for (const rel of seen) {
    if (!listed.includes(`./${rel}`)) bad(`module graph: ${rel} is imported but not precached by the service worker`);
  }
  if (problems.filter((p) => p.startsWith('module graph')).length === 0) {
    ok(`${seen.size} modules reachable from app.js all exist and are precached`);
  }
}

console.log('\n5. Engine dry run (pure logic)');
{
  const passage = readJSON(`${rcDir}/rc-0001.json`);
  let t = 1000;
  const s = new PracticeSession(passage, { now: () => (t += 1000) });
  s.markQuestionShown();
  // answer q1 correctly, skip the rest
  const v = s.answer(passage.questions[0].correct);
  if (!v.is_correct) bad('engine: correct answer not recognized');
  while (s.next()) s.skip();
  const { session, attempts } = s.finish();
  if (session.score.correct !== 1) bad(`engine: expected 1 correct, got ${session.score.correct}`);
  if (attempts.length !== passage.questions.length) bad('engine: attempt count mismatch');
  const direct = computeScore([{ is_correct: true }, { is_correct: false }, { is_correct: null }]);
  if (direct.marks !== 3 * 1 + -1 * 1) bad('scoring: marks formula wrong');
  if (Math.abs(direct.accuracy - 0.5) > 1e-9) bad('scoring: accuracy wrong');
  if (problems.filter((p) => p.startsWith('engine') || p.startsWith('scoring')).length === 0) {
    ok('session + scoring behave as expected');
  }
}

console.log('\n6. Engagement dry run (pure logic)');
{
  const mk = (daysAgo, correct, total) => {
    const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(10);
    const wrong = total - correct;
    return {
      id: `s${daysAgo}-${correct}`, passage_id: 'rc-000' + ((daysAgo % 5) + 1),
      finished_at: d.toISOString(), duration_ms: 5 * 60 * 1000,
      score: { total, correct, wrong, skipped: 0, attempted: total,
               accuracy: total ? correct / total : 0, marks: 3 * correct - wrong, max_marks: 3 * total },
    };
  };
  // Level curve monotonic + exact boundary
  if (levelFromXP(0).level !== 1) bad('xp: level at 0 XP should be 1');
  if (levelFromXP(xpForNext(1)).level !== 2) bad('xp: exact threshold should reach level 2');
  let prevLvl = 1;
  for (let x = 0; x <= 5000; x += 137) {
    const l = levelFromXP(x).level;
    if (l < prevLvl) bad('xp: level curve not monotonic');
    prevLvl = l;
  }
  // Perfect bonus applies
  const perfect = mk(0, 4, 4), imperfect = mk(0, 3, 4);
  if (sessionXP(perfect) !== 4 * 10 + 5 + 25) bad('xp: perfect session formula wrong');
  if (sessionXP(imperfect) !== 3 * 10 + 1 * 2 + 5) bad('xp: normal session formula wrong');
  // Streaks: today + yesterday + 3 days ago → current 2, best 2
  const sessions = [mk(0, 4, 4), mk(1, 2, 4), mk(3, 3, 4)];
  const st = deriveStreaks(sessions);
  if (st.current !== 2 || !st.practicedToday) bad(`streaks: expected current 2 today, got ${st.current}`);
  if (st.best !== 2) bad(`streaks: expected best 2, got ${st.best}`);
  // Yesterday-only → alive, not practiced today
  const st2 = deriveStreaks([mk(1, 2, 4)]);
  if (!st2.alive || st2.practicedToday || st2.current !== 1) bad('streaks: yesterday-only recovery state wrong');
  // Week strip
  if (weekActivity(sessions).length !== 7) bad('week: strip must be 7 days');
  if (!weekActivity(sessions)[6].isToday) bad('week: last day must be today');
  // Achievements: first practice unlocks, none double-celebrated
  const stats = deriveEngagement(sessions);
  const evald = evaluate(stats);
  if (!evald.find((a) => a.id === 'first-practice')?.unlocked) bad('ach: first-practice should unlock');
  const news = newlyUnlocked(stats, ['first-practice']);
  if (news.some((a) => a.id === 'first-practice')) bad('ach: celebrated ids must be excluded');
  if (totalXP(sessions) !== sessions.reduce((n, s) => n + sessionXP(s), 0)) bad('xp: total mismatch');
  if (problems.filter((p) => p.startsWith('xp') || p.startsWith('streaks') || p.startsWith('week') || p.startsWith('ach')).length === 0) {
    ok('xp curve, streak derivation, week strip, achievement gating all behave');
  }
}

console.log('\n7. Journey dry run (pure logic)');
{
  const { journeyOrder, groupByStage, recommendNext, STAGES } = await mod('src/core/learning/journey.js');
  const registry = readJSON('content/index.json');
  // The RC journey only ever receives RC items (listRCItems); PJ items
  // live in their own tier ladder (src/modules/para-jumbles/logic/tiers.js).
  const items = registry.items.filter((i) => i.type === 'rc');
  const ordered = journeyOrder(items);
  let lastIdx = -1;
  for (const i of ordered) {
    const idx = STAGES.indexOf(i.stage);
    if (idx < lastIdx) bad('journey: stage order violated');
    lastIdx = idx;
  }
  const groups = groupByStage(items);
  if (groups.reduce((n, g) => n + g.items.length, 0) !== items.length) bad('journey: grouping loses items');
  const fresh = recommendNext(items, []);
  if (!fresh || fresh.item.id !== ordered[0].id) bad('journey: fresh start should recommend first in ladder');
  if (!fresh.reason) bad('journey: recommendation must state a reason');
  // hard-passage balance: last session was the hard advanced item → next pick must not be hard
  const hard = items.find((i) => i.difficulty === 'hard');
  const done = (id) => ({ passage_id: id, finished_at: new Date().toISOString(),
    score: { attempted: 4, correct: 3, total: 4, accuracy: 0.75, wrong: 1, skipped: 0 } });
  const afterHard = recommendNext(items, [done(hard.id)]);
  if (afterHard && afterHard.item.difficulty === 'hard') bad('journey: recommended hard after hard');
  // all attempted → weakest re-read with reason
  const allDone = items.map((i) => done(i.id));
  const revisit = recommendNext(items, allDone);
  if (!revisit || !revisit.reason.includes('second read')) bad('journey: exhausted library should suggest a re-read');
  // 0.6.0 — a REAL progression: every stage populated, and the first
  // step of the journey is the gentlest passage in the library.
  for (const stage of STAGES) {
    if (!items.some((i) => i.stage === stage)) bad(`journey: stage "${stage}" has no passages`);
  }
  const first = ordered[0];
  if (first.stage !== 'foundation') bad(`journey: first passage is ${first.stage}, expected foundation`);
  if (first.difficulty !== 'easy') bad(`journey: first passage is ${first.difficulty}, expected easy`);
  const minNumeric = Math.min(...items.map((i) => i.difficulty_numeric ?? 99));
  if (first.difficulty_numeric !== minNumeric) {
    bad(`journey: first passage difficulty_numeric ${first.difficulty_numeric} is not the library minimum ${minNumeric}`);
  }
  if (problems.filter((p) => p.startsWith('journey')).length === 0) {
    ok('stage ladder, grouping, balance rules, re-read fallback, full-stage coverage, gentle first step');
  }
}

console.log('\n8. Backup round trip (learning store, 0.6.0)');
{
  const { STORES } = await mod('src/core/storage/storage-adapter.js');
  const { exportAll, importAll } = await mod('src/core/storage/backup.js');
  // A minimal in-memory StorageAdapter — just enough for backup.js.
  const makeMock = () => {
    const stores = new Map(Object.values(STORES).map((n) => [n, new Map()]));
    return {
      async getAll(name) { return [...stores.get(name).values()]; },
      async put(name, record) { stores.get(name).set(record.id, record); },
      async clear(name) { stores.get(name).clear(); },
    };
  };
  if (!Object.values(STORES).includes('learning')) bad('backup: learning store missing from STORES');
  const a = makeMock();
  await a.put(STORES.LEARNING, {
    id: 'reflection:rc-0001', kind: 'reflection', passage_id: 'rc-0001',
    prompt: 'My biggest takeaway…', text: 'check the checkers', updated_at: new Date().toISOString(),
  });
  await a.put(STORES.SETTINGS, { id: 'theme', value: 'dark' });
  const file = await exportAll(a);
  if (!Array.isArray(file.stores?.learning) || file.stores.learning.length !== 1) {
    bad('backup: export must include the learning store');
  }
  const b = makeMock();
  const { written } = await importAll(b, file, 'merge');
  if (written !== 2) bad(`backup: expected 2 records imported, got ${written}`);
  const back = await b.getAll(STORES.LEARNING);
  if (back.length !== 1 || back[0].text !== 'check the checkers') {
    bad('backup: reflection did not survive the round trip');
  }
  // A v1 backup (no learning key) must import without error.
  const v1 = { format: 'cat-os-backup', version: 1, exported_at: new Date().toISOString(),
    stores: { settings: [{ id: 'theme', value: 'light' }], attempts: [], sessions: [] } };
  try {
    const { written: w1 } = await importAll(makeMock(), v1, 'replace');
    if (w1 !== 1) bad(`backup: v1 import expected 1 record, got ${w1}`);
  } catch (e) {
    bad(`backup: v1 backup no longer imports — ${e.message}`);
  }
  if (problems.filter((p) => p.startsWith('backup')).length === 0) {
    ok('learning store exports, round-trips, and v1 backups still import');
  }
}

console.log('\n9. Mentor dry run (voice · DNA · one-lesson rule · recall)');
{
  const voice = await mod('src/core/mentor/voice.js');
  const { deriveDNA, dominantTrap, enrichAnswers, FLOORS } = await mod('src/core/mentor/dna.js');
  const { chooseLesson, lessonRecord, pickRecall, RECALL_RETIRED_AFTER } = await mod('src/core/mentor/lesson.js');

  /* -- The mentor's language never judges. Walk every exported string. -- */
  {
    const banned = voice.BANNED_WORDS.map((w) => new RegExp(`\\b${w}\\b`, 'i'));
    const offenders = [];
    const walk = (value, path) => {
      if (typeof value === 'string') {
        for (const re of banned) if (re.test(value)) offenders.push(`${path}: "${value.slice(0, 60)}…"`);
      } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      } else if (typeof value === 'function') {
        // Template functions: exercise with plain arguments and lint the output.
        try { walk(value('the pattern', 3, 2), `${path}()`); } catch { /* signature mismatch is fine */ }
      }
    };
    for (const [name, exported] of Object.entries(voice)) {
      if (name === 'BANNED_WORDS' || name === 'pick') continue;
      walk(exported, name);
    }
    if (offenders.length) offenders.forEach((o) => bad(`mentor voice uses judgment language — ${o}`));
    // Every trap type the schema allows must have a pattern the mentor can teach.
    const trapEnum = schemas[latestSchemaV].properties.questions.items.properties.explanation
      .properties.distractors.items.properties.trap_type.enum;
    for (const t of trapEnum) {
      if (!voice.TRAP_PATTERNS[t]) bad(`mentor voice: no pattern for trap_type "${t}"`);
      else if (!voice.TRAP_PATTERNS[t].recall?.question) bad(`mentor voice: no recall for "${t}"`);
    }
    if (voice.pick('seed-a', ['x', 'y', 'z']) !== voice.pick('seed-a', ['x', 'y', 'z'])) {
      bad('mentor voice: pick() is not deterministic');
    }
  }

  /* -- Reading DNA: floors gate observations; determinism holds. -- */
  const p1 = readJSON(`${rcDir}/rc-0001.json`);
  const p5 = readJSON(`${rcDir}/rc-0005.json`);
  const passages = new Map([[p1.meta.id, p1], [p5.meta.id, p5]]);
  const trapOf = (item, trap) => {
    for (const q of item.questions) {
      const d = q.explanation.distractors.find((x) => x.trap_type === trap);
      if (d) return { q, option: d.option };
    }
    return null;
  };
  const mkSession = (n, item, answers) => ({
    id: `s-${n}`, passage_id: item.meta.id,
    started_at: new Date(2026, 5, n, 10).toISOString(),
    finished_at: new Date(2026, 5, n, 10, 12).toISOString(),
    duration_ms: 12 * 60000,
    score: (() => {
      const total = answers.length;
      const correct = answers.filter((a) => a.is_correct === true).length;
      const attempted = answers.filter((a) => a.is_correct !== null).length;
      return { total, correct, wrong: attempted - correct, skipped: total - attempted,
        attempted, accuracy: attempted ? correct / attempted : 0,
        marks: 3 * correct - (attempted - correct), max_marks: 3 * total };
    })(),
    answers,
  });
  const hit1 = trapOf(p1, 'opposite_direction');
  const hit5 = trapOf(p5, 'opposite_direction');
  if (!hit1 || !hit5) bad('mentor dna: fixture passages lack an opposite_direction distractor');
  const answersWith = (item, hit) => item.questions.map((q, i) => ({
    question_id: q.id,
    chosen: q.id === hit.q.id ? hit.option : q.correct,
    is_correct: q.id === hit.q.id ? false : true,
    time_ms: 60000 + i * 1000,
  }));
  // Three occurrences across two passages → the affinity is named.
  const history = [
    mkSession(1, p1, answersWith(p1, hit1)),
    mkSession(2, p5, answersWith(p5, hit5)),
    mkSession(3, p1, answersWith(p1, hit1)),
  ];
  const dna = deriveDNA(history, passages);
  if (!dna.observations.some((o) => o.id === 'trap:opposite_direction')) {
    bad('mentor dna: 3 hits across 2 passages should name the trap affinity');
  }
  if (dominantTrap(enrichAnswers(history, passages))?.trap !== 'opposite_direction') {
    bad('mentor dna: dominant trap not detected');
  }
  // Below the floor (2 hits) → silence. Fairness is a feature.
  const dnaThin = deriveDNA(history.slice(0, 2), passages);
  if (dnaThin.observations.some((o) => o.id === 'trap:opposite_direction')) {
    bad('mentor dna: named a trap below the evidence floor');
  }
  if (JSON.stringify(deriveDNA(history, passages)) !== JSON.stringify(dna)) {
    bad('mentor dna: not deterministic');
  }

  /* -- One Lesson Rule: many misses in, exactly ONE lesson out. -- */
  const messy = mkSession(4, p1, p1.questions.map((q, i) => ({
    question_id: q.id,
    chosen: q.explanation.distractors[0].option,
    is_correct: false,
    time_ms: 60000 + i,
  })));
  const lesson = chooseLesson({ session: messy, passage: p1, dna, priorSessions: 3 });
  if (!lesson || Array.isArray(lesson)) bad('mentor lesson: must return exactly one lesson');
  if (lesson.lesson_kind !== 'watch' || !lesson.question_id) bad('mentor lesson: a caught pull should teach kind "watch"');
  if (!lesson.teach?.pull || !lesson.teach?.notice) bad('mentor lesson: lesson must teach pull + notice');
  const again = chooseLesson({ session: messy, passage: p1, dna, priorSessions: 3 });
  if (JSON.stringify(again) !== JSON.stringify(lesson)) bad('mentor lesson: not deterministic');
  // A clean session teaches mastery — and celebrates a walked-past pull.
  const clean = mkSession(5, p1, p1.questions.map((q, i) => ({
    question_id: q.id, chosen: q.correct, is_correct: true, time_ms: 60000 + i,
  })));
  const mastery = chooseLesson({ session: clean, passage: p1, dna, priorSessions: 4 });
  if (mastery.lesson_kind !== 'mastery') bad('mentor lesson: clean session should teach mastery');
  if (!mastery.recall?.question) bad('mentor lesson: mastery still seeds a recall');

  /* -- Recall rules: not today's lesson, not twice a day, retire at N. -- */
  const rec = lessonRecord(lesson, messy, '2026-06-04');
  if (rec.id !== `lesson:${messy.id}` || rec.recall_count !== 0) bad('mentor records: lesson record shape drifted');
  if (pickRecall([rec], '2026-06-04') !== null) bad('mentor recall: must not recall a lesson taught today');
  const rTomorrow = pickRecall([rec], '2026-06-05');
  if (!rTomorrow || rTomorrow.id !== rec.id) bad('mentor recall: yesterday\'s lesson should surface today');
  if (pickRecall([{ ...rec, recalled_day: '2026-06-05', recall_count: 1 }], '2026-06-05') !== null) {
    bad('mentor recall: must not recall twice on one day');
  }
  if (pickRecall([{ ...rec, recall_count: RECALL_RETIRED_AFTER }], '2026-06-05') !== null) {
    bad('mentor recall: absorbed lessons must retire');
  }

  if (problems.filter((p) => p.startsWith('mentor')).length === 0) {
    ok('voice is calm and complete, DNA floors hold, one lesson per session, recall retires');
  }
}

console.log('\n10. Audio identity (sound language ↔ cue map)');
{
  // audio.js and feedback.js must be import-safe with no AudioContext:
  // synthesis is lazy, so the whole family loads under plain Node.
  const audio = await mod('src/core/engagement/audio.js');
  const feedback = await mod('src/core/engagement/feedback.js');
  const names = new Set(audio.SOUND_NAMES);

  // The complete family designed for this milestone — every named sound
  // must exist in the engine (one entry per Audio Identity requirement).
  const REQUIRED = ['open', 'tap', 'toggle', 'cardOpen', 'correct', 'wrong',
    'sparkle', 'reflect', 'lessonComplete', 'levelUp', 'achievement', 'streak',
    'mentor', 'xp', 'celebrate', 'dailyGoal', 'notify', 'backupOk', 'restore', 'error'];
  for (const n of REQUIRED) if (!names.has(n)) bad(`audio: sound "${n}" missing from the engine`);
  if (names.size !== REQUIRED.length) bad(`audio: expected ${REQUIRED.length} sounds, engine has ${names.size}`);

  // Every cue must resolve to a real sound — feedback.js and audio.js
  // can never drift apart (a stale cue would silently break a moment).
  for (const [kind, soundName] of Object.entries(feedback.CUE_SOUND_MAP)) {
    if (!names.has(soundName)) bad(`audio: cue "${kind}" maps to unknown sound "${soundName}"`);
  }

  // Public API is present…
  for (const fn of ['playSound', 'xpTick', 'configureAudio', 'unlockAudio', 'queueWelcome']) {
    if (typeof audio[fn] !== 'function') bad(`audio: missing export ${fn}()`);
  }
  // …and the disabled play path is a pure no-op that never throws and never
  // needs an AudioContext (there is none in Node) — feedback is never worth
  // an error, and sound defaults OFF.
  try {
    audio.configureAudio({ enabled: false, volume: 0.7 });
    audio.playSound('correct');
    audio.xpTick(3);
    audio.unlockAudio();
  } catch (e) {
    bad(`audio: disabled play path threw — ${e.message}`);
  }
  if (problems.filter((p) => p.startsWith('audio')).length === 0) {
    ok(`${names.size} synthesized sounds, cue map coherent, disabled path is a safe no-op`);
  }
}

console.log('\n11. Para Jumbles dry run (engine · voice · DNA · one lesson)');
if (pjFiles.length === 0) {
  ok('no PJ content yet — skipped');
} else {
  const { PJSession, evaluateSequence, computePJScore } = await mod('src/core/engine/pj-session.js');
  const pjVoice = await mod('src/core/mentor/pj-voice.js');
  const rcVoice = await mod('src/core/mentor/voice.js');
  const { derivePJDNA, pjDominantTrap, enrichPJAnswers, PJ_FLOORS } = await mod('src/core/mentor/pj-dna.js');
  const { choosePJLesson, pjLessonRecord } = await mod('src/core/mentor/pj-lesson.js');

  /* -- The PJ mentor never judges either: lint its whole vocabulary. -- */
  {
    const banned = rcVoice.BANNED_WORDS.map((w) => new RegExp(`\\b${w}\\b`, 'i'));
    const offenders = [];
    const walk = (value, path) => {
      if (typeof value === 'string') {
        for (const re of banned) if (re.test(value)) offenders.push(`${path}: "${value.slice(0, 60)}…"`);
      } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      } else if (typeof value === 'function') {
        try { walk(value('the pattern', 3, 2), `${path}()`); } catch { /* signature mismatch is fine */ }
      }
    };
    for (const [name, exported] of Object.entries(pjVoice)) {
      if (name === 'pick') continue;
      walk(exported, name);
    }
    if (offenders.length) offenders.forEach((o) => bad(`pj: mentor voice uses judgment language — ${o}`));
    // Every PJ trap the schema can name must have a pattern with a recall.
    const pjTrapEnum = pjSchemas[String(Math.max(...Object.keys(pjSchemas).map(Number)))]
      .properties.meta.properties.primary_trap.enum.filter((t) => t !== 'none');
    for (const t of pjTrapEnum) {
      if (!pjVoice.PJ_TRAP_PATTERNS[t]) bad(`pj: no mentor pattern for trap "${t}"`);
      else if (!pjVoice.PJ_TRAP_PATTERNS[t].recall?.question) bad(`pj: no recall for trap "${t}"`);
    }
  }

  /* -- Engine: TITA scoring (+3/0), partial links, deterministic. -- */
  {
    const v = evaluateSequence(['C', 'A', 'D', 'B'], ['C', 'A', 'D', 'B']);
    if (!v.is_correct || v.links_correct !== 3) bad('pj engine: exact match not fully recognized');
    const w = evaluateSequence(['C', 'A', 'B', 'D'], ['C', 'A', 'D', 'B']);
    if (w.is_correct) bad('pj engine: wrong order marked correct');
    if (w.positions_correct !== 2) bad(`pj engine: expected 2 positions correct, got ${w.positions_correct}`);
    const sc = computePJScore([{ is_correct: true }, { is_correct: false }, { is_correct: null }]);
    if (sc.marks !== 3) bad(`pj scoring: TITA marks should be +3/0, got ${sc.marks}`);
    if (Math.abs(sc.accuracy - 0.5) > 1e-9) bad('pj scoring: accuracy wrong');
  }

  /* -- Session produces module-tagged records the stores accept. -- */
  const item = readJSON(`${pjDir}/${pjFiles[0]}`);
  {
    let t = 1000;
    const s = new PJSession([item], 'pj-set:test', { now: () => (t += 1000) });
    s.markItemShown();
    const verdict = s.answer([...item.correct_order], { revised: false, read_back_ms: 8000 });
    if (!verdict.is_correct) bad('pj session: correct sequence not recognized');
    const { session, attempts } = s.finish();
    if (session.module !== 'pj') bad('pj session: record missing module tag');
    if (session.score.correct !== 1 || session.score.marks !== 3) bad('pj session: score wrong');
    if (attempts.length !== 1 || attempts[0].module !== 'pj') bad('pj session: attempt shape wrong');
    if (!Array.isArray(session.item_ids) || session.item_ids[0] !== item.meta.id) bad('pj session: item_ids missing');
  }

  /* -- DNA: a repeated trap across enough items is named; floors hold. -- */
  {
    const trapItems = pjFiles.map((f) => readJSON(`${pjDir}/${f}`))
      .filter((it) => it.meta.primary_trap !== 'none' && it.explanation.tempting_orders.length);
    if (trapItems.length >= 2) {
      // Two distinct items, same trap: enter each item's first tempting order.
      const chosen = [];
      const seenTraps = new Map();
      for (const it of trapItems) {
        const t = it.explanation.tempting_orders[0];
        if (!seenTraps.has(t.trap_type)) seenTraps.set(t.trap_type, []);
        seenTraps.get(t.trap_type).push({ it, order: t.order });
      }
      const repeated = [...seenTraps.values()].find((arr) => arr.length >= 2);
      if (repeated) {
        const items = new Map(repeated.map(({ it }) => [it.meta.id, it]));
        const mkPJSession = (n, entries) => ({
          id: `pj-s-${n}`, module: 'pj', passage_id: 'pj-set:test',
          item_ids: entries.map((e) => e.it.meta.id),
          started_at: new Date(2026, 6, n, 10).toISOString(),
          finished_at: new Date(2026, 6, n, 10, 3).toISOString(),
          duration_ms: 3 * 60000,
          score: { total: entries.length, correct: 0, wrong: entries.length, skipped: 0,
            attempted: entries.length, accuracy: 0, marks: 0, max_marks: 3 * entries.length },
          answers: entries.map((e) => ({
            item_id: e.it.meta.id, question_id: e.it.meta.id, entered: e.order.split(''),
            is_correct: false, positions_correct: 0, links_correct: 0,
            revised: false, read_back_ms: 9000, time_ms: 60000 })),
        });
        // Three misses across the two items → clears TRAP_MIN=3, ITEMS=2.
        const history = [
          mkPJSession(1, [repeated[0]]),
          mkPJSession(2, [repeated[1]]),
          mkPJSession(3, [repeated[0]]),
        ];
        const dna = derivePJDNA(history, items);
        const trap = repeated[0].it.explanation.tempting_orders[0].trap_type;
        if (!dna.observations.some((o) => o.pattern_id === trap)) {
          bad(`pj dna: repeated trap "${trap}" (3 hits / 2 items) should be named`);
        }
        if (JSON.stringify(derivePJDNA(history, items)) !== JSON.stringify(dna)) {
          bad('pj dna: not deterministic');
        }
        // Below the floor (2 hits) → silence.
        const thin = derivePJDNA(history.slice(0, 2), items);
        if (thin.observations.some((o) => o.pattern_id === trap)) {
          bad('pj dna: named a trap below the evidence floor');
        }
        // One lesson out, deterministic, teaching the pull.
        const lesson = choosePJLesson({ session: history[2], items,
          dna: derivePJDNA(history.slice(0, 2), items), priorSessions: 2 });
        if (!lesson || Array.isArray(lesson)) bad('pj lesson: must return exactly one lesson');
        if (!lesson.teach?.pull || !lesson.teach?.notice) bad('pj lesson: must teach pull + notice');
        const rec = pjLessonRecord(lesson, history[2], '2026-07-03');
        if (rec.module !== 'pj' || rec.kind !== 'lesson') bad('pj lesson: record shape drifted');
        const again = choosePJLesson({ session: history[2], items,
          dna: derivePJDNA(history.slice(0, 2), items), priorSessions: 2 });
        if (JSON.stringify(again) !== JSON.stringify(lesson)) bad('pj lesson: not deterministic');
      }
    }
    // A clean set teaches mastery.
    const cleanItems = new Map([[item.meta.id, item]]);
    const cleanSession = {
      id: 'pj-clean', module: 'pj', passage_id: 'pj-set:test', item_ids: [item.meta.id],
      started_at: new Date().toISOString(), finished_at: new Date().toISOString(), duration_ms: 60000,
      score: { total: 1, correct: 1, wrong: 0, skipped: 0, attempted: 1, accuracy: 1, marks: 3, max_marks: 3 },
      answers: [{ item_id: item.meta.id, question_id: item.meta.id, entered: [...item.correct_order],
        is_correct: true, positions_correct: item.correct_order.length,
        links_correct: item.correct_order.length - 1, revised: false, read_back_ms: 9000, time_ms: 60000 }],
    };
    const mastery = choosePJLesson({ session: cleanSession, items: cleanItems,
      dna: { dominant: null, observations: [] }, priorSessions: 1 });
    if (mastery.lesson_kind !== 'mastery') bad('pj lesson: clean set should teach mastery');
    if (!mastery.recall?.question) bad('pj lesson: mastery still seeds a recall');
  }

  if (problems.filter((p) => p.startsWith('pj')).length === 0) {
    ok('TITA scoring, module-tagged records, calm voice, DNA floors, one lesson per set');
  }
}

console.log('\n12. Para Summary dry run (engine · voice · missions · DNA · one lesson)');
if (psFiles.length === 0) {
  ok('no PS content yet — skipped');
} else {
  const { PSSession, computePSScore } = await mod('src/core/engine/ps-session.js');
  const psVoice = await mod('src/core/mentor/ps-voice.js');
  const rcVoice = await mod('src/core/mentor/voice.js');
  const { derivePSDNA, psDominantFamily, enrichPSAnswers, PS_FLOORS } = await mod('src/core/mentor/ps-dna.js');
  const { choosePSLesson, psLessonRecord } = await mod('src/core/mentor/ps-lesson.js');
  const { thinkQuestions } = await mod('src/modules/para-summary/logic/think.js');
  const { teachDepth } = await mod('src/modules/para-summary/logic/teach.js');
  const psLatestSchema = psSchemas[String(Math.max(...Object.keys(psSchemas).map(Number)))];

  /* -- The PS mentor never judges either: lint its whole vocabulary. -- */
  {
    const banned = rcVoice.BANNED_WORDS.map((w) => new RegExp(`\\b${w}\\b`, 'i'));
    const offenders = [];
    const walk = (value, path) => {
      if (typeof value === 'string') {
        for (const re of banned) if (re.test(value)) offenders.push(`${path}: "${value.slice(0, 60)}…"`);
      } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      } else if (typeof value === 'function') {
        try { walk(value('the pattern', 3, 2), `${path}()`); } catch { /* signature mismatch is fine */ }
      }
    };
    for (const [name, exported] of Object.entries(psVoice)) {
      if (name === 'pick') continue;
      walk(exported, name);
    }
    if (offenders.length) offenders.forEach((o) => bad(`ps: mentor voice uses judgment language — ${o}`));

    // Every archetype the schema can name must have a pattern with a
    // family and a recall, so the taxonomy is teachable end to end.
    const archetypeEnum = psLatestSchema.properties.question.properties.explanation
      .properties.distractors.items.properties.archetype.enum;
    for (const a of archetypeEnum) {
      const p = psVoice.PS_TRAP_PATTERNS[a];
      if (!p) bad(`ps: no mentor pattern for archetype "${a}"`);
      else {
        if (!p.recall?.question) bad(`ps: no recall for archetype "${a}"`);
        if (!psVoice.PS_FAMILY_LABELS[p.family]) bad(`ps: archetype "${a}" names unknown family "${p.family}"`);
      }
    }
    // Every mission the schema can name must have Today's Mission copy
    // and at least one Think question of its own.
    const missionEnum = psLatestSchema.properties.meta.properties.mission.enum;
    for (const m of missionEnum) {
      if (!psVoice.PS_MISSIONS[m]?.title) bad(`ps: no mission copy for "${m}"`);
      if (!(psVoice.PS_THINK.byMission[m]?.length >= 1)) bad(`ps: no think questions for mission "${m}"`);
    }
    // The loader's family table must agree with the mentor's (the two
    // encode the same taxonomy and must never drift).
    const sampleItem = readJSON(`${psDir}/${psFiles[0]}`);
    for (const d of sampleItem.question.explanation.distractors) {
      if (!psVoice.PS_TRAP_PATTERNS[d.archetype]) bad(`ps: content archetype "${d.archetype}" unknown to the mentor`);
    }
  }

  /* -- Think coach: deterministic, never empty, never answer-shaped. -- */
  {
    const item = readJSON(`${psDir}/${psFiles[0]}`);
    const qs = thinkQuestions(item);
    if (qs.length !== 4) bad(`ps think: expected 4 questions, got ${qs.length}`);
    if (JSON.stringify(thinkQuestions(item)) !== JSON.stringify(qs)) bad('ps think: not deterministic');
    if (new Set(qs).size !== qs.length) bad('ps think: repeated questions in one sheet');
  }

  /* -- Teach depth: richer with tier, never below the floor. -- */
  {
    if (teachDepth('foundation') !== 1) bad('ps teach: foundation depth should be 1');
    if (teachDepth('medium') !== 2) bad('ps teach: medium depth should be 2');
    if (teachDepth('cat') !== 3) bad('ps teach: cat depth should be 3');
    if (teachDepth('premium') !== 4) bad('ps teach: premium depth should be 4');
  }

  /* -- Engine: scoring, module-tagged records, behavior fields. -- */
  const item = readJSON(`${psDir}/${psFiles[0]}`);
  {
    let t = 1000;
    const s = new PSSession([item], 'ps-set:test', { now: () => (t += 1000) });
    s.markItemShown();
    const verdict = s.answer(item.question.correct, { summary_written: true, summary_text: 'my line', think_opened: true });
    if (!verdict.is_correct) bad('ps session: correct option not recognized');
    const { session, attempts } = s.finish();
    if (session.module !== 'ps') bad('ps session: record missing module tag');
    if (session.score.correct !== 1 || session.score.marks !== 3) bad('ps session: score wrong');
    if (attempts.length !== 1 || attempts[0].module !== 'ps') bad('ps session: attempt shape wrong');
    if (!Array.isArray(session.item_ids) || session.item_ids[0] !== item.meta.id) bad('ps session: item_ids missing');
    if (session.answers[0].summary_written !== true || session.answers[0].think_opened !== true) {
      bad('ps session: builder/think behavior fields lost');
    }
    const sc = computePSScore([{ is_correct: true }, { is_correct: false }, { is_correct: null }]);
    if (sc.marks !== 3) bad(`ps scoring: marks should be +3/0, got ${sc.marks}`);
    if (Math.abs(sc.accuracy - 0.5) > 1e-9) bad('ps scoring: accuracy wrong');
  }

  /* -- DNA: a repeated family across enough items is named; floors hold. -- */
  {
    const all = psFiles.map((f) => readJSON(`${psDir}/${f}`));
    // Find two items sharing a distractor family, and pick the letter
    // of that family's distractor in each.
    const familyOf = (it, letter) => it.question.explanation.distractors
      .find((d) => d.option === letter)?.archetype;
    const byFamily = new Map();
    for (const it of all) {
      for (const d of it.question.explanation.distractors) {
        const fam = psVoice.PS_TRAP_PATTERNS[d.archetype]?.family;
        if (!fam) continue;
        if (!byFamily.has(fam)) byFamily.set(fam, []);
        byFamily.get(fam).push({ it, letter: d.option });
      }
    }
    const repeated = [...byFamily.values()]
      .map((arr) => {
        const seen = new Set();
        return arr.filter(({ it }) => !seen.has(it.meta.id) && seen.add(it.meta.id));
      })
      .find((arr) => arr.length >= 2);
    if (repeated) {
      const items = new Map(repeated.slice(0, 2).map(({ it }) => [it.meta.id, it]));
      const mkPSSession = (n, entries) => ({
        id: `ps-s-${n}`, module: 'ps', passage_id: 'ps-set:test',
        item_ids: entries.map((e) => e.it.meta.id),
        started_at: new Date(2026, 6, n, 10).toISOString(),
        finished_at: new Date(2026, 6, n, 10, 3).toISOString(),
        duration_ms: 3 * 60000,
        score: { total: entries.length, correct: 0, wrong: entries.length, skipped: 0,
          attempted: entries.length, accuracy: 0, marks: 0, max_marks: 3 * entries.length },
        answers: entries.map((e) => ({
          item_id: e.it.meta.id, question_id: e.it.meta.id, chosen: e.letter,
          is_correct: false, summary_written: false, summary_text: null,
          think_opened: false, time_ms: 60000 })),
      });
      const [e1, e2] = repeated;
      const history = [mkPSSession(1, [e1]), mkPSSession(2, [e2]), mkPSSession(3, [e1])];
      const dna = derivePSDNA(history, items);
      const fam = psVoice.PS_TRAP_PATTERNS[familyOf(e1.it, e1.letter)].family;
      if (!dna.observations.some((o) => o.id === `ps-family:${fam}`)) {
        bad(`ps dna: repeated family "${fam}" (3 hits / 2 items) should be named`);
      }
      if (psDominantFamily(enrichPSAnswers(history, items))?.family !== fam) {
        bad('ps dna: dominant family not detected');
      }
      if (JSON.stringify(derivePSDNA(history, items)) !== JSON.stringify(dna)) {
        bad('ps dna: not deterministic');
      }
      // Below the floor (2 hits) → silence. Fairness is a feature.
      const thin = derivePSDNA(history.slice(0, 2), items);
      if (thin.observations.some((o) => o.id === `ps-family:${fam}`)) {
        bad('ps dna: named a family below the evidence floor');
      }
      // One lesson out, deterministic, teaching the pull.
      const lesson = choosePSLesson({ session: history[2], items,
        dna: derivePSDNA(history.slice(0, 2), items), priorSessions: 2 });
      if (!lesson || Array.isArray(lesson)) bad('ps lesson: must return exactly one lesson');
      if (!lesson.teach?.pull || !lesson.teach?.notice) bad('ps lesson: must teach pull + notice');
      if (!lesson.recall?.question) bad('ps lesson: must seed a recall');
      const rec = psLessonRecord(lesson, history[2], '2026-07-11');
      if (rec.module !== 'ps' || rec.kind !== 'lesson') bad('ps lesson: record shape drifted');
      const again = choosePSLesson({ session: history[2], items,
        dna: derivePSDNA(history.slice(0, 2), items), priorSessions: 2 });
      if (JSON.stringify(again) !== JSON.stringify(lesson)) bad('ps lesson: not deterministic');
    }
    // A clean set teaches mastery.
    const cleanItems = new Map([[item.meta.id, item]]);
    const cleanSession = {
      id: 'ps-clean', module: 'ps', passage_id: 'ps-set:test', item_ids: [item.meta.id],
      started_at: new Date().toISOString(), finished_at: new Date().toISOString(), duration_ms: 60000,
      score: { total: 1, correct: 1, wrong: 0, skipped: 0, attempted: 1, accuracy: 1, marks: 3, max_marks: 3 },
      answers: [{ item_id: item.meta.id, question_id: item.meta.id, chosen: item.question.correct,
        is_correct: true, summary_written: true, summary_text: 'mine', think_opened: false, time_ms: 60000 }],
    };
    const mastery = choosePSLesson({ session: cleanSession, items: cleanItems,
      dna: { dominant: null, observations: [] }, priorSessions: 1 });
    if (mastery.lesson_kind !== 'mastery') bad('ps lesson: clean set should teach mastery');
    if (!mastery.recall?.question) bad('ps lesson: mastery still seeds a recall');
  }

  if (problems.filter((p) => p.startsWith('ps')).length === 0) {
    ok('scoring, module-tagged records, taxonomy-complete voice, missions, think coach, DNA floors, one lesson per set');
  }
}

console.log('\n13. Odd One Out dry run (engine · voice · missions · think · DNA · one lesson)');
if (oooFiles.length === 0) {
  ok('no OOO content yet — skipped');
} else {
  const { OOOSession, computeOOOScore, evaluateBuild } = await mod('src/core/engine/ooo-session.js');
  const oooVoice = await mod('src/core/mentor/ooo-voice.js');
  const rcVoice = await mod('src/core/mentor/voice.js');
  const { deriveOOODNA, oooDominantMistake, enrichOOOAnswers, OOO_FLOORS } = await mod('src/core/mentor/ooo-dna.js');
  const { chooseOOOLesson, oooLessonRecord } = await mod('src/core/mentor/ooo-lesson.js');
  const { thinkQuestions } = await mod('src/modules/odd-one-out/logic/think.js');
  const { teachDepth } = await mod('src/modules/odd-one-out/logic/teach.js');
  const oooLatestSchema = oooSchemas[String(Math.max(...Object.keys(oooSchemas).map(Number)))];

  /* -- The OOO mentor never judges either: lint its whole vocabulary. -- */
  {
    const banned = rcVoice.BANNED_WORDS.map((w) => new RegExp(`\\b${w}\\b`, 'i'));
    const offenders = [];
    const walk = (value, path) => {
      if (typeof value === 'string') {
        for (const re of banned) if (re.test(value)) offenders.push(`${path}: "${value.slice(0, 60)}…"`);
      } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      } else if (typeof value === 'function') {
        try { walk(value('the pattern', 3, 2), `${path}()`); } catch { /* signature mismatch is fine */ }
      }
    };
    for (const [name, exported] of Object.entries(oooVoice)) {
      if (name === 'pick') continue;
      walk(exported, name);
    }
    if (offenders.length) offenders.forEach((o) => bad(`ooo: mentor voice uses judgment language — ${o}`));

    // Every §7 mistake_type the schema can name must have a solver pattern
    // with a recall, so the taxonomy is teachable end to end.
    const mistakeEnum = oooLatestSchema.properties.explanation.properties.exclusion_analysis
      .items.properties.mistake_type.enum;
    for (const t of mistakeEnum) {
      const p = oooVoice.OOO_TRAP_PATTERNS[t];
      if (!p) bad(`ooo: no mentor pattern for mistake_type "${t}"`);
      else if (!p.recall?.question) bad(`ooo: no recall for mistake_type "${t}"`);
    }
    // Every §4 violation_type must have a violation pattern the teach layer names.
    const violationEnum = oooLatestSchema.properties.meta.properties.violation_type.enum;
    for (const v of violationEnum) {
      if (!oooVoice.OOO_VIOLATION_PATTERNS[v]?.name) bad(`ooo: no violation pattern for "${v}"`);
    }
    // Every mission must have Today's Mission copy and its own Think questions.
    const missionEnum = oooLatestSchema.properties.meta.properties.mission.enum;
    for (const m of missionEnum) {
      if (!oooVoice.OOO_MISSIONS[m]?.title) bad(`ooo: no mission copy for "${m}"`);
      if (!(oooVoice.OOO_THINK.byMission[m]?.length >= 1)) bad(`ooo: no think questions for mission "${m}"`);
    }
  }

  /* -- Think coach: deterministic, never empty, never answer-shaped. -- */
  {
    const item = readJSON(`${oooDir}/${oooFiles[0]}`);
    const qs = thinkQuestions(item);
    if (qs.length !== 4) bad(`ooo think: expected 4 questions, got ${qs.length}`);
    if (JSON.stringify(thinkQuestions(item)) !== JSON.stringify(qs)) bad('ooo think: not deterministic');
    if (new Set(qs).size !== qs.length) bad('ooo think: repeated questions in one sheet');
  }

  /* -- Teach depth: richer with tier, never below the floor. -- */
  {
    if (teachDepth('foundation') !== 1) bad('ooo teach: foundation depth should be 1');
    if (teachDepth('medium') !== 2) bad('ooo teach: medium depth should be 2');
    if (teachDepth('cat') !== 3) bad('ooo teach: cat depth should be 3');
    if (teachDepth('premium') !== 4) bad('ooo teach: premium depth should be 4');
  }

  /* -- Engine: TITA scoring, build evaluation, module-tagged records. -- */
  const item = readJSON(`${oooDir}/${oooFiles[0]}`);
  {
    // Build evaluation counts author joins the learner had.
    const perfect = evaluateBuild(item.core_order, item.core_order);
    if (perfect.links_correct !== 3 || perfect.positions_correct !== 4) bad('ooo engine: perfect build not fully recognized');
    const swapped = evaluateBuild([item.core_order[1], item.core_order[0], item.core_order[2], item.core_order[3]], item.core_order);
    if (swapped.links_correct !== 1) bad(`ooo engine: expected 1 join after a head swap, got ${swapped.links_correct}`);

    let t = 1000;
    const s = new OOOSession([item], 'ooo-set:test', { now: () => (t += 1000) });
    s.markItemShown();
    const verdict = s.answer(item.outlier, { built: item.core_order, think_opened: true, read_back_ms: 8000 });
    if (!verdict.is_correct) bad('ooo session: correct exclusion not recognized');
    if (verdict.links_correct !== 3) bad('ooo session: build links not reported on the verdict');
    const { session, attempts } = s.finish();
    if (session.module !== 'ooo') bad('ooo session: record missing module tag');
    if (session.score.correct !== 1 || session.score.marks !== 3) bad('ooo session: score wrong');
    if (attempts.length !== 1 || attempts[0].module !== 'ooo') bad('ooo session: attempt shape wrong');
    if (!Array.isArray(session.item_ids) || session.item_ids[0] !== item.meta.id) bad('ooo session: item_ids missing');
    if (session.answers[0].think_opened !== true || session.answers[0].build_links_correct !== 3) {
      bad('ooo session: builder/think behavior fields lost');
    }
    const sc = computeOOOScore([{ is_correct: true }, { is_correct: false }, { is_correct: null }]);
    if (sc.marks !== 3) bad(`ooo scoring: TITA marks should be +3/0, got ${sc.marks}`);
    if (Math.abs(sc.accuracy - 0.5) > 1e-9) bad('ooo scoring: accuracy wrong');
  }

  /* -- DNA: a repeated solver pattern across enough items is named; floors hold. -- */
  {
    const all = oooFiles.map((f) => readJSON(`${oooDir}/${f}`));
    // Find a mistake_type shared by two distinct items, and pick the core
    // sentence carrying that pattern in each (a wrong exclusion of it).
    const byMistake = new Map();
    for (const it of all) {
      for (const e of it.explanation.exclusion_analysis) {
        if (!byMistake.has(e.mistake_type)) byMistake.set(e.mistake_type, []);
        byMistake.get(e.mistake_type).push({ it, label: e.label });
      }
    }
    const repeated = [...byMistake.entries()]
      .map(([mistake, arr]) => {
        const seen = new Set();
        return [mistake, arr.filter(({ it }) => !seen.has(it.meta.id) && seen.add(it.meta.id))];
      })
      .find(([, arr]) => arr.length >= 2);
    if (repeated) {
      const [mistake, entries] = repeated;
      const items = new Map(entries.slice(0, 2).map(({ it }) => [it.meta.id, it]));
      const mkOOOSession = (n, es) => ({
        id: `ooo-s-${n}`, module: 'ooo', passage_id: 'ooo-set:test',
        item_ids: es.map((e) => e.it.meta.id),
        started_at: new Date(2026, 6, n, 10).toISOString(),
        finished_at: new Date(2026, 6, n, 10, 3).toISOString(),
        duration_ms: 3 * 60000,
        score: { total: es.length, correct: 0, wrong: es.length, skipped: 0,
          attempted: es.length, accuracy: 0, marks: 0, max_marks: 3 * es.length },
        answers: es.map((e) => ({
          item_id: e.it.meta.id, question_id: e.it.meta.id, chosen: e.label,
          is_correct: false, built: null, build_links_correct: 0,
          think_opened: false, revised: false, read_back_ms: 0, time_ms: 60000 })),
      });
      const [e1, e2] = entries;
      const history = [mkOOOSession(1, [e1]), mkOOOSession(2, [e2]), mkOOOSession(3, [e1])];
      const dna = deriveOOODNA(history, items);
      const hasPattern = dna.observations.some((o) => o.pattern_id === mistake);
      if (!hasPattern) bad(`ooo dna: repeated pattern "${mistake}" (3 hits / 2 items) should be named`);
      if (oooDominantMistake(enrichOOOAnswers(history, items))?.mistake !== mistake) {
        bad('ooo dna: dominant pattern not detected');
      }
      if (JSON.stringify(deriveOOODNA(history, items)) !== JSON.stringify(dna)) {
        bad('ooo dna: not deterministic');
      }
      // Below the floor (2 hits) → silence. Fairness is a feature.
      const thin = deriveOOODNA(history.slice(0, 2), items);
      if (thin.observations.some((o) => o.pattern_id === mistake)) {
        bad('ooo dna: named a pattern below the evidence floor');
      }
      // One lesson out, deterministic, teaching the pull.
      const lesson = chooseOOOLesson({ session: history[2], items,
        dna: deriveOOODNA(history.slice(0, 2), items), priorSessions: 2 });
      if (!lesson || Array.isArray(lesson)) bad('ooo lesson: must return exactly one lesson');
      if (!lesson.teach?.pull || !lesson.teach?.notice) bad('ooo lesson: must teach pull + notice');
      if (!lesson.recall?.question) bad('ooo lesson: must seed a recall');
      const rec = oooLessonRecord(lesson, history[2], '2026-07-11');
      if (rec.module !== 'ooo' || rec.kind !== 'lesson') bad('ooo lesson: record shape drifted');
      const again = chooseOOOLesson({ session: history[2], items,
        dna: deriveOOODNA(history.slice(0, 2), items), priorSessions: 2 });
      if (JSON.stringify(again) !== JSON.stringify(lesson)) bad('ooo lesson: not deterministic');
    }
    // A clean set teaches mastery.
    const cleanItems = new Map([[item.meta.id, item]]);
    const cleanSession = {
      id: 'ooo-clean', module: 'ooo', passage_id: 'ooo-set:test', item_ids: [item.meta.id],
      started_at: new Date().toISOString(), finished_at: new Date().toISOString(), duration_ms: 60000,
      score: { total: 1, correct: 1, wrong: 0, skipped: 0, attempted: 1, accuracy: 1, marks: 3, max_marks: 3 },
      answers: [{ item_id: item.meta.id, question_id: item.meta.id, chosen: item.outlier,
        is_correct: true, built: item.core_order, build_links_correct: 3,
        think_opened: false, revised: false, read_back_ms: 9000, time_ms: 60000 }],
    };
    const mastery = chooseOOOLesson({ session: cleanSession, items: cleanItems,
      dna: { dominant: null, observations: [] }, priorSessions: 1 });
    if (mastery.lesson_kind !== 'mastery') bad('ooo lesson: clean set should teach mastery');
    if (!mastery.recall?.question) bad('ooo lesson: mastery still seeds a recall');
  }

  if (problems.filter((p) => p.startsWith('ooo')).length === 0) {
    ok('TITA scoring, build eval, module-tagged records, taxonomy-complete voice, missions, think coach, DNA floors, one lesson per set');
  }
}

console.log('\n14. Word DNA dry run (engine · voice · DNA · one lesson)');
if (wdFiles.length === 0) {
  ok('no Word DNA content yet — skipped');
} else {
  const { WDSession, computeWDScore, evaluateChoice } = await mod('src/core/engine/wd-session.js');
  const wdVoice = await mod('src/core/mentor/wd-voice.js');
  const rcVoice = await mod('src/core/mentor/voice.js');
  const { deriveWDDNA, enrichWDAnswers, WD_FLOORS } = await mod('src/core/mentor/wd-dna.js');
  const { chooseWDLesson, wdLessonRecord, TRAP_NOTES } = await mod('src/core/mentor/wd-lesson.js');
  const wdLatestSchema = wdSchemas[String(Math.max(...Object.keys(wdSchemas).map(Number)))];

  /* -- The Word DNA mentor never judges either: lint its whole vocabulary. -- */
  {
    const banned = rcVoice.BANNED_WORDS.map((w) => new RegExp(`\\b${w}\\b`, 'i'));
    const offenders = [];
    const walk = (value, path) => {
      if (typeof value === 'string') {
        for (const re of banned) if (re.test(value)) offenders.push(`${path}: "${value.slice(0, 60)}…"`);
      } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      } else if (typeof value === 'function') {
        try { walk(value('an example', 3, 2), `${path}()`); } catch { /* signature mismatch is fine */ }
      }
    };
    for (const [name, exported] of Object.entries(wdVoice)) {
      if (name === 'pick') continue;
      walk(exported, name);
    }
    if (offenders.length) offenders.forEach((o) => bad(`wd: mentor voice uses judgment language — ${o}`));

    // Every trap the schema can name in an apply option must have mentor
    // copy explaining the pull (WORD_DNA_BIBLE §4's closed three-value set).
    const trapEnum = wdLatestSchema.properties.discovery.properties.applies.items
      .properties.options.items.properties.trap.enum;
    for (const t of trapEnum) {
      if (!TRAP_NOTES[t]) bad(`wd: no mentor note for apply trap "${t}"`);
    }
  }

  const item = readJSON(`${wdDir}/${wdFiles[0]}`);

  /* -- Engine: plain accuracy (no CAT-style marks), module-tagged records. -- */
  {
    const correctIdx = item.discovery.predict_options.findIndex((o) => o.correct);
    const wrongIdx = item.discovery.predict_options.findIndex((o) => !o.correct);
    const verdict = evaluateChoice(item.discovery.predict_options, correctIdx);
    if (!verdict.is_correct) bad('wd engine: correct predict option not recognized');
    if (evaluateChoice(item.discovery.predict_options, wrongIdx).is_correct) {
      bad('wd engine: wrong predict option marked correct');
    }

    let t = 1000;
    const s = new WDSession([item], 'wd-set:test', { now: () => (t += 1000) });
    s.markItemShown();
    s.answerPredict(correctIdx);
    item.discovery.applies.forEach((a, i) => {
      s.answerApply(i, a.options.findIndex((o) => o.correct));
    });
    const { session, attempts } = s.finish();
    if (session.module !== 'wd') bad('wd session: record missing module tag');
    if (session.score.correct !== 1 || session.score.attempted !== 1) bad('wd session: score wrong for a fully-correct unit');
    if ('marks' in session.score) bad('wd session: score should have no CAT-style marks field');
    if (attempts.length !== 1 || attempts[0].module !== 'wd') bad('wd session: attempt shape wrong');
    if (!Array.isArray(session.item_ids) || session.item_ids[0] !== item.meta.id) bad('wd session: item_ids missing');
    if (session.answers[0].is_correct !== true) bad('wd session: fully-correct unit not marked correct');

    const sc = computeWDScore([{ is_correct: true }, { is_correct: false }, { is_correct: null }]);
    if (Math.abs(sc.accuracy - 0.5) > 1e-9) bad('wd scoring: accuracy wrong');
    if ('marks' in sc) bad('wd scoring: computeWDScore should carry no CAT-style marks');
  }

  /* -- DNA: Meaning Transfer (the signature trait) names itself once the
     floor clears, and stays silent below it. -- */
  {
    const sharedKind = ['root', 'prefix', 'suffix'];
    const sharedFiles = wdFiles.map((f) => readJSON(`${wdDir}/${f}`)).filter((it) => sharedKind.includes(it.meta.kind));
    if (sharedFiles.length === 0) {
      ok('no root/prefix/suffix content yet — DNA transfer check skipped');
    } else {
      const items = new Map(sharedFiles.map((it) => [it.meta.id, it]));
      const mkSession = (n, correct) => ({
        id: `wd-s-${n}`, module: 'wd', passage_id: 'wd-set:test',
        item_ids: sharedFiles.map((it) => it.meta.id),
        started_at: new Date(2026, 6, n, 10).toISOString(),
        finished_at: new Date(2026, 6, n, 10, 3).toISOString(),
        duration_ms: 3 * 60000,
        score: { total: sharedFiles.length, correct: correct ? sharedFiles.length : 0,
          wrong: correct ? 0 : sharedFiles.length, skipped: 0, attempted: sharedFiles.length,
          accuracy: correct ? 1 : 0 },
        answers: sharedFiles.map((it) => ({
          item_id: it.meta.id, question_id: it.meta.id,
          predict: { chosen_index: it.discovery.predict_options.findIndex((o) => correct ? o.correct : !o.correct), is_correct: correct },
          applies: it.discovery.applies.map((a) => ({
            held_out_word: a.held_out_word,
            chosen_index: a.options.findIndex((o) => correct ? o.correct : !o.correct),
            is_correct: correct,
          })),
          is_correct: correct, time_ms: 60000,
        })),
      });
      const history = [mkSession(1, true), mkSession(2, true), mkSession(3, true)];
      const dna = deriveWDDNA(history, items);
      const appliesCount = sharedFiles.reduce((n, it) => n + it.discovery.applies.length, 0) * history.length;
      if (appliesCount >= WD_FLOORS.TRANSFER_MIN) {
        if (!dna.observations.some((o) => o.pattern_id === 'meaning_transfer' && o.kind === 'strength')) {
          bad('wd dna: perfect transfer across enough evidence should be named a strength');
        }
      }
      if (JSON.stringify(deriveWDDNA(history, items)) !== JSON.stringify(dna)) bad('wd dna: not deterministic');

      // Below the floor (fewer sessions) → silence is a feature, not a bug.
      const oneSessionApplies = sharedFiles.reduce((n, it) => n + it.discovery.applies.length, 0);
      if (oneSessionApplies < WD_FLOORS.TRANSFER_MIN) {
        const thin = deriveWDDNA(history.slice(0, 1), items);
        if (thin.observations.some((o) => o.pattern_id === 'meaning_transfer')) {
          bad('wd dna: named a pattern below the evidence floor');
        }
      }

      // One lesson out of a session with a missed apply, deterministic.
      const missedSession = mkSession(4, false);
      const lesson = chooseWDLesson({ session: missedSession, items, dna, priorSessions: 3 });
      if (!lesson || Array.isArray(lesson)) bad('wd lesson: must return exactly one lesson');
      if (!lesson.teach?.pull) bad('wd lesson: must teach the pull');
      const rec = wdLessonRecord(lesson, missedSession, '2026-07-13');
      if (rec.module !== 'wd' || rec.kind !== 'lesson') bad('wd lesson: record shape drifted');
      if (!rec.recall?.question || !rec.recall?.answer) bad('wd lesson: must seed a recall');
      const again = chooseWDLesson({ session: missedSession, items, dna, priorSessions: 3 });
      if (JSON.stringify(again) !== JSON.stringify(lesson)) bad('wd lesson: not deterministic');

      // A clean set teaches mastery.
      const cleanSession = mkSession(5, true);
      const mastery = chooseWDLesson({ session: cleanSession, items, dna: { observations: [] }, priorSessions: 1 });
      if (mastery.lesson_kind !== 'mastery') bad('wd lesson: clean set should teach mastery');
    }
  }

  // Precise prefixes only: "wd-00NN:" (registry/content problems from
  // earlier sections) must never mask this section's own "wd:"/"wd X:" checks.
  if (problems.filter((p) => p.startsWith('wd:') || p.startsWith('wd ')).length === 0) {
    ok('plain accuracy scoring, module-tagged records, calm voice, DNA floors, one lesson per set');
  }
}

console.log('\n15. Rootwood dry run (voice · scheduler · session · groves · effort · gate)');
{
  const before = problems.length;
  const gardenVoice = await mod('src/core/mentor/garden-voice.js');
  const rcVoice = await mod('src/core/mentor/voice.js');
  const { computePlantState, GardenSession, STAGES, RUNG_INTERVALS_MS, TOP_RUNG, strugglingMembers } = await mod('src/core/engine/garden-session.js');
  const groves = await mod('src/modules/language-garden/logic/groves.js');
  const biomes = await mod('src/modules/language-garden/logic/biomes.js');
  const scene = await mod('src/modules/language-garden/logic/scene.js');
  const effort = await mod('src/modules/language-garden/logic/effort.js');
  const atmosphere = await mod('src/modules/language-garden/logic/atmosphere.js');
  const gate = await mod('src/core/engine/garden-gate.js');
  const gardenAudio = await mod('src/modules/language-garden/logic/audio.js');

  /* ---- Voice: every line the gardener says stays in register ---- */
  {
    const b0 = problems.length;
    const banned = rcVoice.BANNED_WORDS.map((w) => new RegExp(`\\b${w}\\b`, 'i'));
    const walk = (v, path) => {
      if (typeof v === 'string') { for (const re of banned) if (re.test(v)) bad(`garden voice: ${path} uses a banned word — "${v}"`); if (/!/.test(v)) bad(`garden voice: ${path} exclaims — "${v}"`); }
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
      else if (typeof v === 'function') { try { walk(v('cede', 'seed'), `${path}()`); } catch { /* needs other args */ } }
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    for (const k of ['GROWTH_LINES', 'GARDEN_LINES', 'VALLEY_LINES', 'EMPTY_DAY_LINES', 'ATTEMPT_LINES', 'JOURNAL_LINES', 'SEED_LINES']) walk(gardenVoice[k], k);
    if (problems.length === b0) ok('every garden line is in register: no banned words, no exclamation marks');
  }

  /* ---- Scheduler: stage from survived intervals, never a demotion ---- */
  {
    const b0 = problems.length;
    const D = 86400000, M = 60000;
    const t0 = Date.parse('2026-08-01T10:00:00Z');
    const iso = (t) => new Date(t).toISOString();
    const grow = (t) => ({ kind: 'garden-session', family_id: 'lg-0001', session_type: 'grow', finished_at: iso(t), clean: null });
    const revisit = (t, clean = true) => ({ kind: 'garden-session', family_id: 'lg-0001', session_type: 'revisit', finished_at: iso(t), clean });
    if (computePlantState([], t0).stage !== 'open_ground') bad('garden scheduler: no history is open ground');
    if (computePlantState([{ kind: 'garden-seed', family_id: 'lg-0001', finished_at: iso(t0) }], t0).stage !== 'seed') bad('garden scheduler: a seed carried back through the Gate is a seed');
    if (computePlantState([grow(t0)], t0 + M).stage !== 'sprout') bad('garden scheduler: a fresh grow is a sprout');
    if (computePlantState([grow(t0)], t0 + 20 * M).stage !== 'young') bad('garden scheduler: after the first window a grow is young');
    if (computePlantState([grow(t0)], t0 + 20 * M).due !== 'gold') bad('garden scheduler: the first revisit is asked for after ten minutes');
    let recs = [grow(t0)]; let t = t0;
    const gaps = [11 * M, 1.05 * D, 3.1 * D, 8.2 * D, 21.5 * D];
    const stagesSeen = [];
    for (const g of gaps) { t += g; recs.push(revisit(t)); stagesSeen.push(computePlantState(recs, t + M).stage); }
    if (stagesSeen[0] !== 'young' || stagesSeen[1] !== 'in_leaf' || stagesSeen[3] !== 'mature' || stagesSeen[4] !== 'ancient') bad(`garden scheduler: the ladder must climb young → in_leaf → mature → ancient (${stagesSeen.join(' → ')})`);
    const st = computePlantState(recs, t + M);
    if (st.rung !== TOP_RUNG) bad('garden scheduler: after the whole ladder the memory is asked to survive the top interval');
    const rocky = computePlantState([...recs, revisit(t + 22 * D, false)], t + 23 * D);
    if (rocky.stage !== 'ancient') bad('garden scheduler: a rocky revisit never demotes the stage');
    if (STAGES.length !== 7) bad('garden scheduler: seven stages, open ground to ancient');
    if (RUNG_INTERVALS_MS[0] !== 10 * M) bad('garden scheduler: the first rung is ten minutes');
    const struggling = strugglingMembers([revisit(t0), revisit(t0 + D), revisit(t0 + 2 * D)].map((r) => ({ ...r, member_checks: [{ member_index: 1, is_correct: false }] })));
    if (!struggling.includes(1)) bad('garden scheduler: three misses of one member mark it struggling');
    if (problems.length === b0) ok('the scheduler climbs only on clean, due revisits and never demotes');
  }

  /* ---- A real Grow and Revisit session over real content ---- */
  {
    const b0 = problems.length;
    const family = readJSON('content/language-garden/lg-0001.json');
    const vocab = (id) => readJSON(`content/vocabulary/${id}.json`);
    for (const m of family.members) { const v = vocab(m.vocab_id); m.word = v.word; m.meaning = v.meaning; }
    const siblings = [{ id: 'lg-0002', label: 'chron', core_meaning: 'time' }, { id: 'lg-0003', label: 'phil', core_meaning: 'love' }];
    const growS = new GardenSession(family, 'grow', siblings, { now: () => Date.parse('2026-09-11T10:00:00Z') });
    growS.markBeatShown();
    const opts = growS.attemptOptions();
    if (opts.length !== 2 || opts.filter((o) => o.correct).length !== 1) bad('garden session: the Attempt offers two directions, one true');
    growS.answerAttempt(opts.findIndex((o) => o.correct));
    growS.taught.forEach((_, i) => growS.confirmSpreadMember(i));
    const ro = growS.reachOptions(0, 1);
    if (ro.filter((o) => o.correct).length !== 1) bad('garden session: the Reach construct has one true option');
    growS.answerReach(0, ro.findIndex((o) => o.correct), 1);
    const grec = growS.finish();
    if (grec.kind !== 'garden-session' || grec.session_type !== 'grow' || grec.clean !== null) bad('garden session: a grow finishes as a grow record with no clean mark');
    if (!grec.reach?.landed_clean_first_try) bad('garden session: a first-try correct Reach lands clean');
    const rev = new GardenSession(family, 'revisit', siblings, { now: () => Date.parse('2026-09-12T10:00:00Z') });
    const ko = rev.keyRetrievalOptions();
    if (ko.length !== 3 || ko.filter((o) => o.correct).length !== 1) bad('garden session: the key retrieval offers three meanings, one true');
    rev.answerKeyRetrieval(ko.findIndex((o) => o.correct));
    const [a, b] = rev.memberCheckIndices(0);
    for (const i of [a, b]) { const mo = rev.memberCheckOptions(i); rev.answerMemberCheck(i, mo.findIndex((o) => o.correct)); }
    const rro = rev.reachOptions(1, 1);
    rev.answerReach(1, rro.findIndex((o) => o.correct), 1);
    const rrec = rev.finish();
    if (rrec.clean !== true) bad('garden session: an all-correct revisit is clean');
    const st = computePlantState([grec, { ...rrec, finished_at: '2026-09-12T10:00:00Z' }], Date.parse('2026-09-12T10:01:00Z'));
    if (st.revisitCount !== 1) bad('garden session: the scheduler counts the revisit');
    if (problems.length === b0) ok('a Grow and a clean Revisit run over lg-0001 with one true option per beat');
  }

  /* ---- Groves: every family seated, no grove over capacity ---- */
  {
    const b0 = problems.length;
    const registry = readJSON('content/index.json').items.filter((i) => i.type === 'lg');
    const families = registry.map((i) => ({ meta: { id: i.id } }));
    const wood = groves.layoutWood(families);
    if (wood.stands.size !== families.length) bad(`garden groves: ${families.length} families but ${wood.stands.size} stands`);
    for (const g of groves.GROVES) {
      if (g.families.length > groves.GROVE_CAPACITY) bad(`garden groves: ${g.name} seats ${g.families.length}, over its capacity of ${groves.GROVE_CAPACITY}`);
      for (const id of g.families) if (!registry.some((i) => i.id === id)) bad(`garden groves: ${g.name} names an unknown family ${id}`);
    }
    const seen = new Set();
    for (const g of groves.GROVES) for (const id of g.families) { if (seen.has(id)) bad(`garden groves: ${id} stands in two groves`); seen.add(id); }
    if (wood.groves.some((g) => g.grove.slug === 'edge')) bad('garden groves: a family stands at the wood\'s edge — add it to a grove');
    if (!biomes.isPlayable(biomes.biomeBySlug('rootwood'))) bad('garden biomes: the Rootwood must be playable');
    if (biomes.biomeForGarden('root_grove')?.slug !== 'rootwood') bad('garden biomes: root_grove content belongs to the Rootwood');
    if (problems.length === b0) ok(`${families.length} families seated across ${groves.GROVES.length} groves, none over capacity`);
  }

  /* ---- Effort, atmosphere, the Gate ---- */
  {
    const b0 = problems.length;
    const D = 86400000;
    const now = Date.parse('2026-09-11T10:00:00Z');
    const iso = (t) => new Date(t).toISOString();
    const sessions = [0, 1, 2, 3].map((d) => ({ kind: 'garden-session', family_id: 'lg-0001', session_type: 'grow', finished_at: iso(now - d * D) }));
    const level = effort.computeStreamLevel(sessions, now);
    if (!(level > 0 && level <= 1.5)) bad(`garden effort: the stream level is a bounded positive number (${level})`);
    if (effort.computeStreamLevel([], now) > level) bad('garden effort: an untended valley runs no fuller than a tended one');
    const tiers = effort.GROUND_TIERS ?? [];
    if (tiers.length && effort.computeGroundTier(sessions).tier === undefined) bad('garden effort: a ground tier is named');
    const atmo = atmosphere.atmosphereFor(new Date(2026, 8, 11, 22));
    if (atmo.time !== 'night') bad('garden atmosphere: ten at night is night');
    if (!atmosphere.TIMES_OF_DAY.includes(atmo.time) || !atmosphere.WEATHERS.includes(atmo.weather)) bad('garden atmosphere: time and weather come from the known sets');
    const family = readJSON('content/language-garden/lg-0001.json');
    const passage = { meta: { id: 'rc-x' }, passage: { title: 'x', paragraphs: [{ id: 'p1', text: 'The provinces voted to secede.' }] } };
    const sightingsFn = gate.passageSightings ?? gate.findSightings ?? null;
    if (typeof gate.recordPassageSightings !== 'function' || typeof gate.listGardenSeeds !== 'function') bad('garden gate: the Gate must record sightings and list seeds');
    if (typeof gate.plantSeed !== 'function') bad('garden gate: the Gate must plant a seed');
    if (problems.length === b0) ok(`stream ${level.toFixed(2)} for four days tended; ${atmosphere.TIMES_OF_DAY.length} times of day; the Gate opens both ways`);
  }

  /* ---- The Rootwood's own sound: the Valley Phrase is import-safe and pinned ---- */
  {
    const b0 = problems.length;
    const { PENTATONIC_SEMITONES, pitchHz, VALLEY_PHRASE, tonicHzForBiome } = gardenAudio;
    if (!('do' in PENTATONIC_SEMITONES && !('fa' in PENTATONIC_SEMITONES))) bad('garden audio: the scale is pentatonic — no fa');
    if (Math.round(pitchHz(130.81, 'do', 1)) !== 262) bad('garden audio: an octave doubles');
    if (VALLEY_PHRASE.full.length !== 6) bad('garden audio: the Valley Phrase is six notes');
    if (tonicHzForBiome(biomes.biomeBySlug('rootwood')) !== 130.81) bad('garden audio: the Rootwood is rooted on C');
    if (problems.length === b0) ok('the Rootwood\'s sound is import-safe, pentatonic, rooted on C');
  }

  if (problems.length === before) ok('calm voice, honest scheduler (never demotes), a real Grow + Revisit session, every family seated');
}


console.log('\n16. The world (regions · economy · lexicon rounds · state · audio)');
{
  const before = problems.length;
  const regions = await mod('src/world/regions.js');
  const economy = await mod('src/world/economy.js');
  const lexicon = await mod('src/world/lexicon.js');
  const state = await mod('src/world/state.js');
  const worldAudio = await mod('src/world/audio.js');
  const palette = await mod('src/world/engine/palette.js');

  /* ---- Regions: unique, on the map, reachable, each with its words ---- */
  {
    const b0 = problems.length;
    const slugs = new Set();
    for (const r of regions.REGIONS) {
      if (slugs.has(r.slug)) bad(`world regions: duplicate slug ${r.slug}`);
      slugs.add(r.slug);
      if (!(r.anchor.x >= 0 && r.anchor.x <= regions.WORLD_W && r.anchor.y >= 0 && r.anchor.y <= regions.WORLD_H)) bad(`world regions: ${r.slug} anchor is off the map`);
      const hit = regions.regionAt(r.anchor.x, r.anchor.y);
      // The three workshops of the Quarter stand in one yard, and the map
      // deliberately resolves all three to the Quarter (regions.js): three
      // pins twenty pixels apart is three overlapping labels and no map.
      const want = r.inQuarter ? 'quarter' : r.slug;
      if (hit?.slug !== want) bad(`world regions: touching ${r.slug}'s anchor resolves to ${hit?.slug ?? 'nothing'}, not ${want}`);
      for (const k of ['name', 'line', 'verb', 'route']) if (!r[k]) bad(`world regions: ${r.slug} is missing ${k}`);
      if (!r.route.startsWith('#/')) bad(`world regions: ${r.slug} route is not a hash route`);
    }
    if (regions.regionAt(-5, -5) !== null) bad('world regions: a point off the map must hit nothing');
    if (regions.LANTERN_SPOTS.length < 12) bad('world regions: the Thicket needs a lantern per loanword language (12)');
    if (problems.length === b0) ok(`${regions.REGIONS.length} places, every anchor inside its own hit box, ${regions.LANTERN_SPOTS.length} lantern spots`);
  }

  /* ---- Economy: stars, the one measure every room shares ---- */
  {
    const b0 = problems.length;
    const rc = (correct, total, min, target) => economy.rcStars({ score: { total, correct }, duration_ms: min * 60000 }, target);
    if (rc(1, 4, 5, 6).stars !== 0) bad('world economy: fewer than half right must be 0 stars');
    if (rc(2, 4, 5, 6).stars !== 1) bad('world economy: half right must be 1 star');
    if (rc(3, 4, 9, 6).stars !== 2) bad('world economy: three quarters right but slow must be 2 stars');
    if (rc(3, 4, 5, 6).stars !== 3) bad('world economy: three quarters right in time must be 3 stars');
    if (!rc(4, 4, 5, 6).flawless) bad('world economy: all right in time must be flawless');
    if (economy.rcStars({ score: { total: 4, correct: 4 }, duration_ms: 5.5 * 60000 }, 6, 0.8).stars !== 2) bad('world economy: Night Reading tightens the pace to four fifths');
    const rs = economy.roundStars({ correct: 11, total: 12, avgMs: 5000, targetMs: 7000 });
    if (rs.stars !== 3) bad('world economy: a 92% round at pace must be 3 stars');
    if (economy.roundStars({ correct: 11, total: 12, avgMs: 9000, targetMs: 7000 }).stars !== 2) bad('world economy: a 92% round over pace must be 2 stars');
    if (economy.roundStars({ correct: 6, total: 12, avgMs: 5000 }).stars !== 1) bad('world economy: half right is 1 star');
    if (economy.verbalStars({ score: { total: 2, correct: 2, attempted: 2 }, duration_ms: 100000 }, 150).stars !== 3) bad('world economy: a clean verbal set in time must be 3 stars');
    if (economy.titleFor(1) === economy.titleFor(20)) bad('world economy: titles must grow with level');
    if (problems.length === b0) ok('stars follow accuracy then pace, the same rule in every room; titles grow with the learner');
  }

  /* ---- Lexicon: real content into real questions, and an honest ledger ---- */
  {
    const b0 = problems.length;
    const lex = readJSON('content/lexicon/lex-high-a.json');
    const twin = readJSON('content/twins/twin-a.json');
    const loan = readJSON('content/loanwords/loan-french.json');
    const kinds = new Set();
    for (const e of lex.entries.slice(0, 40)) {
      const q = lexicon.buildQuestion(e, lex, 'meadow', 'verify');
      kinds.add(q.kind);
      if (q.options.length < 3) bad(`world lexicon: ${e.word} question has fewer than three options`);
      if (q.options.filter((o) => o.correct).length !== 1) bad(`world lexicon: ${e.word} question must have exactly one correct option`);
      if (new Set(q.options.map((o) => o.text.toLowerCase())).size !== q.options.length) bad(`world lexicon: ${e.word} question repeats an option`);
      if (!q.stem || !q.ask) bad(`world lexicon: ${e.word} question has no stem or ask`);
    }
    if (!kinds.has('meaning') || !kinds.has('synonym')) bad('world lexicon: the Meadow must ask meanings and synonyms');
    for (const e of twin.entries.slice(0, 20)) {
      const q = lexicon.buildQuestion(e, twin, 'pond', 'verify');
      if (q.options.filter((o) => o.correct).length !== 1) bad(`world lexicon: twin ${e.words.join('/')} must have one correct option`);
      if (q.kind === 'twin' && !e.words.includes(q.options.find((o) => o.correct).text)) bad(`world lexicon: twin ${e.words.join('/')} must ask for one of its own words`);
    }
    for (const e of loan.entries.slice(0, 10)) {
      const q = lexicon.buildQuestion(e, loan, 'thicket', 'verify', ['French', 'German', 'Japanese', 'Arabic', 'Spanish']);
      if (q.options.filter((o) => o.correct).length !== 1) bad(`world lexicon: loanword ${e.word} must have one correct option`);
    }
    // The ledger: climbs only when due, never below met on a miss, never above deep.
    const now = Date.parse('2026-09-11T10:00:00Z');
    const e = lex.entries[0];
    const rec = lexicon.applyAnswer(undefined, e, 'meadow', lex.meta.id, true, now);
    if (rec.level !== 2 || rec.streak !== 1) bad('world lexicon: a first clean answer makes a word known (level 2)');
    const early = lexicon.applyAnswer(rec, e, 'meadow', lex.meta.id, true, now + 60000);
    if (early.level !== 2) bad('world lexicon: a second answer a minute later must not climb (spacing not elapsed)');
    const later = lexicon.applyAnswer(rec, e, 'meadow', lex.meta.id, true, now + 2 * 24 * 3600000);
    if (later.level !== 3) bad('world lexicon: a clean answer after the interval climbs to mastered');
    const miss = lexicon.applyAnswer(later, e, 'meadow', lex.meta.id, false, now + 3 * 24 * 3600000);
    if (miss.level !== 2 || miss.streak !== 0) bad('world lexicon: a miss drops one level and resets the streak');
    let deep = later; for (let i = 0; i < 6; i += 1) deep = lexicon.applyAnswer(deep, e, 'meadow', lex.meta.id, true, Date.parse(deep.next_at) + 1000);
    if (deep.level !== 4) bad('world lexicon: mastery caps at deep (4)');
    const ledger = new Map([[lex.entries[0].id, { ...rec, next_at: new Date(now - 1000).toISOString() }]]);
    const picked = lexicon.pickRound(lex.entries, ledger, now, 12, 'verify');
    if (picked.length !== 12) bad('world lexicon: a round is twelve words');
    if (!picked.some((x) => x.id === lex.entries[0].id)) bad('world lexicon: a due word must be in the round');
    const round = new lexicon.LexRound({ region: 'meadow', bundle: lex, entries: picked, now: () => now });
    round.markShown();
    for (let i = 0; i < round.total; i += 1) { const ci = round.current.options.findIndex((o) => o.correct); round.answer(i % 3 === 0 ? (ci + 1) % round.current.options.length : ci); round.next(); }
    const result = round.finish();
    if (result.record.kind !== 'lex-round' || result.record.score.total !== 12) bad('world lexicon: a finished round yields a lex-round record of twelve answers');
    if (result.record.score.correct !== 8) bad(`world lexicon: expected 8 correct in the dry run, got ${result.record.score.correct}`);
    /* The curator composes a round across bundles, due words first. */
    const curator = await mod('src/world/curator.js');
    const fields = await lexicon.listFields('meadow');
    if (fields.length < 10) bad('world curator: the Meadow must expose every lexicon field');
    const curLedger = new Map([[lex.entries[0].id, { ...rec, region: 'meadow', bundle_id: lex.meta.id, next_at: new Date(now - 1000).toISOString(), last_at: new Date(now - 90000000).toISOString() }]]);
    const composed = await curator.composeRound('meadow', fields, curLedger, { now, seed: 'verify' });
    if (composed.entries.length !== 12) bad('world curator: a composed round is twelve words');
    if (!composed.entries.some((p) => p.entry.id === lex.entries[0].id)) bad('world curator: a due word must come back in the next round');
    if (new Set(composed.entries.map((p) => p.entry.id)).size !== composed.entries.length) bad('world curator: a round must never repeat a word');
    if (!composed.title || !composed.line) bad('world curator: a round must say what it is, in words');
    const curRound = new lexicon.LexRound({ region: 'meadow', picks: composed.entries, now: () => now });
    if (curRound.total !== 12) bad('world curator: a curated round builds twelve questions');
    for (const q of curRound.questions) {
      if (q.options.filter((o) => o.correct).length !== 1) bad('world curator: every question has exactly one right answer');
      if (new Set(q.options.map((o) => o.text.toLowerCase())).size !== q.options.length) bad(`world curator: repeated option text in a ${q.kind} question`);
    }
    /* Words in context: the CAT question, built from the corpus. */
    const ctx = await lexicon.loadContext();
    if (ctx.entries.length < 200) bad(`world context: the pack should hold hundreds of words in context (${ctx.entries.length})`);
    if (ctx.byWord.size !== ctx.entries.length) bad('world context: one entry per word');
    for (const e of ctx.entries) {
      if (!e.word || !e.sentence || !e.meaning) bad(`world context: ${e.id} is missing a field`);
      if (!e.sentence.toLowerCase().includes(e.word.toLowerCase().slice(0, Math.max(4, e.word.length - 3)))) {
        bad(`world context: ${e.id} — "${e.word}" does not appear in its own sentence`);
      }
    }
    {
      const c0 = ctx.entries[0];
      const cq = lexicon.buildContextQuestion(c0, ctx.entries, 'verify');
      if (cq.options.filter((o) => o.correct).length !== 1) bad('world context: a context question has exactly one right answer');
      if (cq.options.length !== 4) bad('world context: a context question offers four options');
      if (new Set(cq.options.map((o) => o.text.toLowerCase())).size !== 4) bad('world context: a context question repeats an option');
      if (!cq.ask.includes(c0.word)) bad('world context: the question must name the word it is asking about');
      if (cq.markWord !== c0.word) bad('world context: the word must be markable inside the sentence');
    }

    /* Reach and weakness are read from real records, never claimed. */
    const rcContent = { rc: [
      { id: 'p1', stage: 'foundation', difficulty_numeric: 2 }, { id: 'p2', stage: 'foundation', difficulty_numeric: 3 },
      { id: 'p3', stage: 'developing', difficulty_numeric: 5 }, { id: 'p4', stage: 'developing', difficulty_numeric: 6 },
    ] };
    const bestMap = new Map([['p1', { stars: 3 }], ['p2', { stars: 2 }]]);
    if (curator.rcReach(rcContent, bestMap) !== 1) bad('world curator: two well-read foundation passages open the next stage');
    const weak = curator.readingWeakness([{ answers: [
      { type: 'inference', is_correct: false }, { type: 'inference', is_correct: false }, { type: 'inference', is_correct: false },
      { type: 'main_idea', is_correct: true }, { type: 'main_idea', is_correct: true }, { type: 'main_idea', is_correct: true },
    ] }]);
    if (weak.weakest !== 'inference') bad('world curator: the weakness model must find what actually goes wrong');
    if (!curator.weaknessLine('inference')) bad('world curator: a weakness must be sayable in the valley\'s voice');
    const nxt = curator.nextPassage(rcContent, bestMap, weak, 'verify');
    if (!nxt || bestMap.has(nxt.item.id)) bad('world curator: the next passage must be one not yet read');
    const summary = lexicon.summarizeLedger(new Map([['a', { bundle_id: 'b1', level: 3, next_at: null }], ['b', { bundle_id: 'b1', level: 1, next_at: null }]]));
    if (summary.get('b1')?.mastered !== 1 || summary.get('b1')?.met !== 2) bad('world lexicon: the ledger summary counts met and mastered per bundle');
    if (problems.length === b0) ok('real words become one-correct questions; the ledger climbs only when due and never demotes below met');
  }

  /* ---- State: the world, and the pets, derived from records ---- */
  {
    const b0 = problems.length;
    const content = { families: [], rc: [{ id: 'rc-0001', estimated_time_min: 6 }], pj: [], ps: [], ooo: [], wd: [], sp: [], pc: [], wb: [], cr: [], fields: { meadow: [{ id: 'lex-high-a', total: 100 }], pond: [], thicket: [] } };
    const empty = state.deriveWorldState(content, { sessions: [], learning: [] }, Date.parse('2026-09-11T10:00:00Z'));
    if (!empty.isNew || empty.stars !== 0) bad('world state: an empty world is new, with no stars');
    if (empty.pets?.pets?.length !== 8 || !empty.pets.pets.every((x) => x.isNew)) bad('world state: a new learner meets eight pets, none of them met yet');
    if (empty.pets.today?.picks?.length !== 3 || empty.pets.nextDecor?.id !== 'lanterns' || empty.pets.glow !== 0) bad('world state: a new village has three friends to help today, no Glow yet, and the lanterns to come first');
    const t0 = Date.parse('2026-09-11T09:00:00Z');
    const M = 60000;
    const rcSession = { id: 's1', passage_id: 'rc-0001', started_at: new Date(t0).toISOString(), finished_at: new Date(t0 + 5 * M).toISOString(), duration_ms: 5 * M, score: { total: 4, correct: 3, attempted: 4, accuracy: 0.75 }, answers: [] };
    const learning = [
      { id: 'lexm:lex-high-a-0001', kind: 'lex-mastery', entry_id: 'lex-high-a-0001', bundle_id: 'lex-high-a', region: 'meadow', level: 3, next_at: null },
      { id: 'lex-round-1', kind: 'lex-round', region: 'meadow', bundle_id: 'lex-high-a', finished_at: new Date(t0).toISOString(), score: { correct: 10, total: 12 }, stars: 2 },
    ];
    const before = state.deriveWorldState(content, { sessions: [], learning }, t0 + 60 * M);
    const s2 = state.deriveWorldState(content, { sessions: [rcSession], learning }, t0 + 60 * M);
    if (s2.reading.stars !== 3) bad('world state: a 3/4 passage in time is three stars');
    if (s2.meadow.mastered !== 1 || s2.meadow.stars !== 2) bad('world state: the Meadow counts mastered words and best round stars');
    const chai = s2.pets.pets.find((x) => x.id === 'chai'), matcha = s2.pets.pets.find((x) => x.id === 'matcha');
    if (chai.isNew || matcha.isNew) bad('world state: a passage is a visit to Chai and a word round a visit to Matcha');
    if (chai.earned !== 9) bad(`world state: a 3/4 passage earns Chai 4 + 3 + 2 Glow (got ${chai.earned})`);
    if (matcha.earned !== 24) bad(`world state: a 10/12 word round earns Matcha 12 + 10 + 2 Glow (got ${matcha.earned})`);
    if (s2.pets.sources.practice !== 33 || s2.pets.glow < 33 || s2.pets.level?.level < 2) bad(`world state: 33 Glow of practice make at least village level 2 (got ${JSON.stringify(s2.pets.sources)}, level ${s2.pets.level?.level})`);
    if (!s2.hearth.practicedToday) bad('world state: a session today counts as practised today');
    if (s2.stars !== 5) bad(`world state: stars total across places (${s2.stars})`);
    const change = state.petChangeLine(before, s2);
    if (change?.pet !== 'chai' || change.earned !== 9 || change.why?.total !== 9 || change.repeat) bad(`world state: the change line names the pet, its Glow and what it was for (${JSON.stringify(change)})`);
    if (problems.length === b0) ok('a new learner meets eight pets and three to help today; a passage and a round are visits that earn their own Glow; the change line names who, how many, and why');
  }

  /* ---- The pets' voice and economy, in full (their own tools) ---- */
  {
    const { spawnSync } = await import('node:child_process');
    for (const tool of ['tools/check-pets.mjs', 'tools/check-pet-economy.mjs']) {
      const r = spawnSync(process.execPath, [join(root, tool)], { cwd: root, encoding: 'utf8', timeout: 600000 });
      const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n');
      if (r.status !== 0) bad(`${tool}: ${out.slice(-4).join(' | ')}`);
      else ok(out[out.length - 1].replace(/^\W+/, ''));
    }
  }

  /* ---- Audio identity and the sprite recipes ---- */
  {
    const b0 = problems.length;
    for (const n of ['tap', 'open', 'star1', 'star2', 'star3', 'ink', 'quest', 'grow', 'build', 'correct', 'wrong', 'hurry', 'arrival']) if (!worldAudio.WORLD_SOUND_NAMES.includes(n)) bad(`world audio: missing sound ${n}`);
    if (Math.round(worldAudio.pitch(130.81, 'do', 1)) !== 262) bad('world audio: an octave above the tonic doubles the pitch');
    if (worldAudio.VALLEY_PHRASE.length !== 6) bad('world audio: the Valley Phrase has six notes');
    const r = palette.ramp('#4E9E4C');
    if (!(r.light !== r.base && r.shade !== r.base && r.dark !== r.shade)) bad('world palette: a ramp must have four distinct tones');
    if (!['spring', 'summer', 'autumn', 'winter'].includes(palette.seasonWord(new Date('2026-09-11')))) bad('world palette: a season for every date');
    if (palette.hourWord(new Date(2026, 8, 11, 22)) !== 'night' || palette.hourWord(new Date(2026, 8, 11, 9)) !== 'morning') bad('world palette: the hour words follow the clock');
    if (palette.weatherWord(new Date(2026, 8, 11)) !== palette.weatherWord(new Date(2026, 8, 11))) bad('world palette: the weather holds all day');
    if (problems.length === b0) ok(`${worldAudio.WORLD_SOUND_NAMES.length} world sounds, ramps and seasons`);
  }

  /* ---- No screen still imports the retired SVG world ---- */
  {
    const b0 = problems.length;
    const { readdirSync: rd, statSync } = await import('node:fs');
    const walkDir = (dir, out = []) => { for (const f of rd(join(root, dir))) { const p = `${dir}/${f}`; if (statSync(join(root, p)).isDirectory()) walkDir(p, out); else if (p.endsWith('.js')) out.push(p); } return out; };
    for (const f of walkDir('src')) {
      const src = readFileSync(join(root, f), 'utf8');
      if (/from '\.[^']*\/(overlook|biome|atmosphere-art|prop-art|fauna-art|discoveries|props|fauna|light|ambient|journal)\.js'/.test(src)) bad(`world: ${f} still imports a retired garden module`);
    }
    if (problems.length === b0) ok('no module imports the retired SVG world');
  }

  if (problems.length === before) ok('the world derives honestly from records; the places, the rules, the rounds and the sounds agree');
}


/* ------------------------------------------------------------------ */
/* 17. The welcome, the map that reads, and the art   */
/* ------------------------------------------------------------------ */

console.log('\n17. The welcome, the map and the art (companion · pins · art · feedback)');
{
  const before = problems.length;
  const companion = await mod('src/world/companion.js');
  const regions = await mod('src/world/regions.js');

  /* ---- What a place says on arrival ----
     2.x linted Wick's whole script here. Wick is gone; the pets' own lines
     are linted by check-pets in §16. What is left of the old voice is the
     one line a place says when its host has nothing of its own. */
  {
    const b0 = problems.length;
    const banned = /(study|revise|practice makes|well done|great job|awesome|congratulations|score|XP|streak|level up|unlocked|wrong|failure|failed|mistake|poor|weak|bad|careless)/i;
    let n = 0;
    for (const r of regions.REGIONS) {
      if (r.kind !== 'learn' && r.slug !== 'hearth' && r.slug !== 'wilds') continue;
      if (r.inQuarter) continue;
      for (const st of [{}, { pets: { nextTreasure: { affordable: true } } }]) {
        const l = companion.atPlace(r.slug, st);
        if (!l) { bad(`a place says nothing on arrival: ${r.slug}`); continue; }
        n += 1;
        if (banned.test(l)) bad(`a place says a banned word — "${l}"`);
        if (/!/.test(l)) bad(`a place exclaims — "${l}"`);
        if (l.length > 96) bad(`a place line is too long to read in one breath — "${l.slice(0, 40)}…"`);
      }
    }
    if (problems.length === b0) ok(`every place has a line on arrival (${n} checked), all in register`);
  }

  /* ---- Naming a valley ---- */
  {
    const b0 = problems.length;
    const { cleanValleyName, nameSuggestions, valleyName, isUnawakened } = companion;
    if (cleanValleyName('  alder   hollow ') !== 'Alder Hollow') bad('companion: a typed name is not tidied into a place name');
    if (cleanValleyName('') !== '') bad('companion: an empty name must stay empty, not become a default');
    if (cleanValleyName('x'.repeat(80)).length > 28) bad('companion: a name is not capped');
    if (cleanValleyName("wren's fold") !== "Wren's Fold") bad('companion: an apostrophe breaks capitalisation');
    const ideas = nameSuggestions('7');
    if (ideas.length !== 3) bad('companion: the sign must offer exactly three names');
    if (new Set(ideas).size !== ideas.length) bad('companion: the three suggestions are not distinct');
    if (String(nameSuggestions('7')) !== String(ideas)) bad('companion: suggestions are not stable for the same day');
    if (valleyName(null) !== 'the village') bad('companion: an unnamed village has no honest fallback');
    if (!isUnawakened({ name: 'x', awakened_at: null })) bad('companion: a named but unwelcomed valley is not detected');
    if (isUnawakened({ awakened_at: '2026-01-01' })) bad('companion: a welcomed valley is offered the welcome again');
    if (problems.length === b0) ok('a valley can be named, tidied, capped and remembered');
  }

  /* ---- The map: nine places, and the Quarter that makes it nine ---- */
  {
    const b0 = problems.length;
    const { MAP_PLACES, QUARTER, regionAt, regionBySlug } = regions;
    if (MAP_PLACES.length !== regions.REGIONS.filter((r) => !r.inQuarter).length + 1) bad('world regions: MAP_PLACES is not every place outside the Quarter, plus the Quarter');
    if (MAP_PLACES.length > 9) bad(`world regions: ${MAP_PLACES.length} pins is more than a phone map can label`);
    for (const m of QUARTER.members) {
      const r = regionBySlug(m);
      if (!r) bad(`world regions: the Quarter claims ${m}, which is not a place`);
      else if (!r.inQuarter) bad(`world regions: ${m} is in the Quarter but not marked inQuarter`);
      else if (regionAt(r.anchor.x, r.anchor.y)?.slug !== 'quarter') bad(`world regions: ${m} does not resolve to the Quarter`);
    }
    // Nothing in MAP_PLACES may be inside the Quarter, or it would double up.
    for (const p of MAP_PLACES) if (p.inQuarter) bad(`world regions: ${p.slug} is drawn twice`);
    if (regionBySlug('quarter') !== QUARTER) bad('world regions: the Quarter is not addressable by slug');
    if (problems.length === b0) ok(`${MAP_PLACES.length} pins on the map, three benches in one Quarter, every slug still reachable`);
  }

  /* ---- The village's art: the painting and six pet sheets, on disk ---- */
  {
    const b0 = problems.length;
    const { SHEETS } = await mod('src/pets/sheets.js');
    const { PETS } = await mod('src/pets/pets.js');
    for (const f of ['assets/art/home-world-v1.png', 'assets/art/home-companions-v1.png']) if (!existsSync(join(root, f))) bad(`art: ${f} is missing`);
    for (const pet of PETS) {
      if (!existsSync(join(root, `assets/art/pet-${pet.id}.png`))) bad(`art: ${pet.name} has no sheet`);
      const sh = SHEETS[pet.id];
      if (!sh || sh.frames !== 5 || sh.h !== 384 || !(sh.w > 0)) bad(`art: ${pet.name}'s sheet is not five 384px frames`);
      if (!sh?.feet || !(sh.feet.top > sh.h * 0.8 && sh.feet.top < sh.feet.bottom && sh.feet.split > 0 && sh.feet.split < sh.w)) bad(`art: ${pet.name}'s sheet has no feet to walk on`);
    }
    if (problems.length === b0) ok(`the painting and ${PETS.length} five-frame pet sheets are on disk`);
  }

  /* ---- Feedback stays short by default ---- */
  {
    const b0 = problems.length;
    const src = readFileSync(join(root, 'src/ui/components/cat-explanation.js'), 'utf8');
    if (!/class="working" id="working" hidden/.test(src)) bad('feedback: the full teardown is not hidden by default');
    if (!/THE TRAP|class="label">The trap/.test(src)) bad('feedback: the trap the learner fell into is not named');
    // Every trap type the corpus uses must have a human name, or the screen
    // shows a database value to a person.
    const names = src.slice(src.indexOf('const TRAP_NAME = {'), src.indexOf('};', src.indexOf('const TRAP_NAME = {')));
    for (const t of ['opposite_direction', 'out_of_scope', 'extreme_language', 'passage_language_shifted', 'wrong_structural_role', 'true_but_irrelevant', 'too_narrow', 'too_broad', 'near_synonym_confusion', 'half_right']) {
      if (!names.includes(t)) bad(`feedback: trap type "${t}" has no plain-English name`);
    }
    for (const f of ['src/modules/para-summary/logic/teach.js', 'src/modules/para-jumbles/logic/teach.js', 'src/modules/odd-one-out/logic/teach.js']) {
      const t = readFileSync(join(root, f), 'utf8');
      if (!/<summary>The full working<\/summary>/.test(t)) bad(`feedback: ${f} does not fold its teardown`);
    }
    if (problems.length === b0) ok('the answer screen shows a verdict, a reason and one trap; the teardown is one tap away');
  }

  if (problems.length === before) ok('the welcome, the map, the art and the feedback all hold');
}


/* ================================================================== */
/* The content engine (2026-09-12): the four banks, the pattern layer,  */
/* the taxonomy, the registry rows the banks add, and the corpus QC.    */
/* ================================================================== */

console.log('\n18. The content engine: banks (schema + consistency) and registry rows');
{
  const { bankConsistencyIssues, normalizeBankItem } = await mod('src/core/content-loader/loader.js');
  const BANK_DIRS = { sp: 'content/sentence-placement', pc: 'content/para-completion', wb: 'content/word-bank', cr: 'content/critical-reasoning' };
  const bankFiles = {};
  let bankCount = 0, itemCount = 0;
  for (const [type, dir] of Object.entries(BANK_DIRS)) {
    const schemasOf = {};
    for (const f of readdirSync(join(root, 'content/schema'))) {
      if (f.startsWith(`${type}.schema.v`)) schemasOf[f.match(/v(\d+)/)[1]] = readJSON(`content/schema/${f}`);
    }
    bankFiles[type] = existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.json')).sort() : [];
    for (const file of bankFiles[type]) {
      const id = file.replace('.json', '');
      let item;
      try { item = readJSON(`${dir}/${file}`); } catch (e) { bad(`${file}: invalid JSON — ${e.message}`); continue; }
      const schema = schemasOf[String(item.schema_version ?? 1)];
      if (!schema) { bad(`${file}: no ${type} schema for version ${item.schema_version}`); continue; }
      const { valid, errors } = validate(schema, item);
      if (!valid) { errors.forEach((e) => bad(`${file}: ${e}`)); continue; }
      const issues = bankConsistencyIssues(type, id, item);
      if (issues.length) { issues.forEach((i) => bad(`${file}: ${i}`)); continue; }
      // Every item normalises into the one shape the bank screen draws.
      try {
        if (type === 'sp' || type === 'pc') normalizeBankItem(type, item);
        else for (const it of item.items) normalizeBankItem(type, item, it.id);
      } catch (e) { bad(`${file}: does not normalise — ${e.message}`); continue; }
      bankCount += 1;
      itemCount += item.items?.length ?? 1;
      // Registry row: existence + the mirror fields the screens read.
      const entry = registry.items.find((i) => i.id === id);
      if (!entry) { bad(`file ${id}.json has no registry entry (run node tools/build-index.mjs)`); continue; }
      const m = item.meta;
      if (entry.type !== type) bad(`${id}: registry type ≠ ${type}`);
      if (entry.status !== m.status) bad(`${id}: registry status ≠ file`);
      if (entry.title !== m.title) bad(`${id}: registry title ≠ file`);
      if (type === 'sp' || type === 'pc') {
        if (entry.tier !== m.tier) bad(`${id}: registry tier ≠ file`);
        if (entry.difficulty_numeric !== m.difficulty_numeric) bad(`${id}: registry difficulty_numeric ≠ file`);
        if (entry.estimated_time_sec !== m.estimated_time_sec) bad(`${id}: registry estimated_time_sec ≠ file`);
      } else {
        if ((entry.item_ids ?? []).join(',') !== item.items.map((i) => i.id).join(',')) bad(`${id}: registry item_ids ≠ file`);
        if (entry.band !== m.band) bad(`${id}: registry band ≠ file`);
        if (type === 'wb' && entry.kind !== m.kind) bad(`${id}: registry kind ≠ file`);
      }
    }
    for (const entry of registry.items.filter((i) => i.type === type)) {
      if (!bankFiles[type].includes(`${entry.id}.json`)) bad(`registry lists ${type} ${entry.id} but no file exists`);
    }
  }
  // v5 passage rows carry the pattern layer the curator aims by.
  for (const entry of registry.items.filter((i) => i.type === 'rc' && i.schema_version >= 5)) {
    if (!Array.isArray(entry.patterns) || !Array.isArray(entry.skills_trained) || !Array.isArray(entry.traps)) bad(`${entry.id}: v5 registry row lacks patterns / skills_trained / traps (run node tools/build-index.mjs)`);
  }
  if (problems.length === 0) ok(`${bankCount} bank files (${itemCount} items) valid, normalisable and registered`);
}

console.log('\n19. The taxonomy ↔ the schemas ↔ the code');
{
  const tax = readJSON('content/taxonomy/varc-taxonomy.json');
  const taxo = await mod('src/core/learning/taxonomy.js');
  const review = await mod('src/core/learning/review.js');
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const rc5 = readJSON('content/schema/rc.schema.v5.json');
  if (!same(rc5.properties.questions.items.properties.type.enum, tax.rc_question_types.map((t) => t.key))) bad('rc v5 question types ≠ taxonomy rc_question_types');
  if (!same(rc5.properties.questions.items.properties.explanation.properties.distractors.items.properties.trap_type.enum, tax.trap_types.map((t) => t.key))) bad('rc v5 trap types ≠ taxonomy trap_types');
  if (!same(rc5.properties.meta.properties.reasoning_patterns.items.enum, tax.reasoning_patterns.map((p) => p.id))) bad('rc v5 reasoning patterns ≠ taxonomy');
  if (!same(rc5.properties.meta.properties.genre.enum, tax.rc_genres)) bad('rc v5 genres ≠ taxonomy rc_genres');
  if (!same(rc5.properties.meta.properties.structure.enum, tax.rc_structures)) bad('rc v5 structures ≠ taxonomy rc_structures');
  for (const name of ['sp', 'pc']) {
    const s = readJSON(`content/schema/${name}.schema.v1.json`);
    if (!same(s.properties.explanation.properties.distractors.items.properties.trap_type.enum, tax.verbal.placement_traps.map((t) => t.key))) bad(`${name} trap types ≠ taxonomy placement_traps`);
    if (!same(s.properties.meta.properties.genre.enum, tax.rc_genres)) bad(`${name} genres ≠ taxonomy`);
  }
  const wb = readJSON('content/schema/wb.schema.v1.json');
  if (!same(wb.properties.items.items.properties.explanation.properties.distractors.items.properties.trap_type.enum, tax.verbal.word_traps.map((t) => t.key))) bad('wb trap types ≠ taxonomy word_traps');
  const cr = readJSON('content/schema/cr.schema.v1.json');
  if (!same(cr.properties.items.items.properties.explanation.properties.distractors.items.properties.trap_type.enum, tax.verbal.cr_traps.map((t) => t.key))) bad('cr trap types ≠ taxonomy cr_traps');
  if (!same(cr.properties.items.items.properties.kind.enum, tax.verbal.cr_kinds)) bad('cr kinds ≠ taxonomy cr_kinds');
  // The code mirror.
  if (JSON.stringify(taxo.RC_TYPE_SKILL) !== JSON.stringify(tax.rc_type_skill)) bad('taxonomy.js RC_TYPE_SKILL ≠ taxonomy rc_type_skill');
  for (const t of tax.rc_question_types) {
    if (t.prediction !== taxo.RC_PREDICTION_TYPES.has(t.key)) bad(`taxonomy.js RC_PREDICTION_TYPES disagrees on ${t.key}`);
    if (!(t.key in taxo.RC_TYPE_SKILL)) bad(`taxonomy.js RC_TYPE_SKILL lacks ${t.key}`);
  }
  const allTraps = [...tax.trap_types.map((t) => t.key), ...tax.verbal.placement_traps.map((t) => t.key), ...tax.verbal.word_traps.map((t) => t.key), ...tax.verbal.cr_traps.map((t) => t.key)];
  for (const t of allTraps) if (!(t in taxo.TRAP_FAMILY)) bad(`taxonomy.js TRAP_FAMILY lacks ${t}`);
  for (const t of tax.trap_types) if (taxo.TRAP_FAMILY[t.key] !== t.family) bad(`taxonomy.js TRAP_FAMILY[${t.key}] is ${taxo.TRAP_FAMILY[t.key]}, taxonomy says ${t.family}`);
  // Every ledger skill in the taxonomy is a SKILL the valley can point at.
  const ledgerKeys = new Set(review.SKILLS.map((s) => s.key));
  for (const s of tax.skills.filter((x) => x.kind === 'ledger')) if (!ledgerKeys.has(s.key)) bad(`review.js SKILLS lacks ledger skill ${s.key}`);
  for (const s of tax.skills) for (const p of s.prereqs) if (!tax.skills.some((x) => x.key === p)) bad(`taxonomy skill ${s.key} has unknown prereq ${p}`);
  // Every RC trap has a name a learner can read and a mentor pattern.
  const explSrc = readFileSync(join(root, 'src/ui/components/cat-explanation.js'), 'utf8');
  const voice = await mod('src/core/mentor/voice.js');
  for (const t of allTraps) if (!new RegExp(`^\\s*${t}:`, 'm').test(explSrc)) bad(`cat-explanation.js has no reader-facing name for trap ${t}`);
  for (const t of tax.trap_types) if (!voice.TRAP_PATTERNS[t.key]) bad(`voice.js TRAP_PATTERNS lacks ${t.key} (the mentor could not name it)`);
  for (const t of tax.rc_question_types) if (!voice.TYPE_LABELS[t.key] || !voice.TYPE_ADVICE[t.key]) bad(`voice.js lacks a label or advice for question type ${t.key}`);
  if (problems.length === 0) ok(`${tax.rc_question_types.length} question types, ${allTraps.length} trap types, ${tax.reasoning_patterns.length} patterns, ${tax.skills.length} skills — JSON, schemas and code agree`);
}

console.log('\n20. Bank engine dry run (session · set picking · rest · stars · ledger)');
{
  const { BankSession, pickSet, computeBankScore } = await mod('src/core/engine/bank-session.js');
  const { verbalStars } = await mod('src/world/economy.js');
  const { petForModule } = await mod('src/pets/pets.js');
  const { skillLedger, trapLedger, weakTrapFamilies, patternLedger, weakPatterns, isRested } = await mod('src/core/learning/review.js');
  const mk = (i, skill = 'placement') => ({ id: `x-${i}`, type: 'sp', kind: 'placement', label: 'placement', skill, patterns: ['disc.pronoun_antecedent'], stem: 's', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correct: 'B', distractors: [{ option: 'A', trap_type: 'wrong_reference_target' }, { option: 'C', trap_type: 'scope_jump' }, { option: 'D', trap_type: 'premature_conclusion' }], time_sec: 60, explanation: {}, body: {} });
  const items = [mk(1), mk(2), mk(3)];
  let t = 1000;
  const s = new BankSession(items, { module: 'sp', setId: 'sp-set:foundation', region: 'loom' }, { now: () => t });
  s.markItemShown(); t += 5000; const v1 = s.answer('B');
  if (!v1.is_correct || v1.trap !== null) bad('bank session: a right answer records no trap');
  s.next(); s.markItemShown(); t += 7000; const v2 = s.answer('A');
  if (v2.is_correct || v2.trap !== 'wrong_reference_target') bad('bank session: a wrong answer records the distractor’s trap');
  s.next(); s.skip();
  const { session, attempts } = s.finish();
  if (session.module !== 'sp' || session.region !== 'loom' || session.target_sec !== 180) bad('bank session: module/region/target_sec not recorded');
  if (session.answers.length !== 3 || attempts.length !== 3) bad('bank session: one answer and one attempt per item');
  if (session.answers[1].skill !== 'placement' || session.answers[1].trap !== 'wrong_reference_target') bad('bank session: answers carry skill and trap');
  if (computeBankScore(session.answers).marks !== 3) bad('bank session: +3 / 0 marking');
  const st = verbalStars(session, session.target_sec);
  if (typeof st.stars !== 'number') bad('bank session: stars derive from the record');
  if (petForModule('sp') !== 'biscuit' || petForModule('pc') !== 'sesame' || petForModule('wb') !== 'matcha' || petForModule('cr') !== 'chai') bad('banks: placement belongs to Biscuit, completion to Sesame, the word bank to Matcha, arguments to Chai');
  // Picking a set: unsolved first; a missed item rests; a solved one comes last.
  const pool = [mk(1), mk(2), mk(3), mk(4)];
  const later = new Date(Date.now() - 60_000).toISOString();
  const sessions = [{ module: 'sp', finished_at: later, answers: [{ item_id: 'x-1', is_correct: true }, { item_id: 'x-2', is_correct: false }] }];
  const pick = pickSet(pool, sessions, 'sp', 2, (at, n) => isRested(at, n));
  if (pick.map((p) => p.id).join(',') !== 'x-3,x-4') bad(`pickSet: expected x-3,x-4 (unsolved, rested first), got ${pick.map((p) => p.id).join(',')}`);
  const pick2 = pickSet(pool, sessions, 'sp', 4, (at, n) => isRested(at, n));
  // A short pool still fills the set, but the rest period is not broken to do it:
  // x-2 was missed 60s ago and has NOT rested, so it goes LAST, behind the solved
  // x-1 (a solved item re-asked is a legitimate timed re-run; a fresh miss is not).
  if (pick2.length !== 4 || pick2[2].id !== 'x-1' || pick2[3].id !== 'x-2') bad(`pickSet: a short pool reviews the rested before the still-resting, got ${pick2.map((p) => p.id).join(',')}`);
  // The ledgers read bank answers.
  const led = skillLedger([session], []);
  if (!led.get('placement') || led.get('placement').seen !== 2) bad('skillLedger: bank answers count under their skill');
  const tl = trapLedger([session]);
  if (tl.total !== 1 || tl.families.get('direction')?.n !== 1) bad('trapLedger: a missed bank item counts under its trap family');
  const many = [{ module: 'sp', finished_at: later, answers: [1, 2, 3].map((i) => ({ item_id: `y-${i}`, is_correct: false, trap: 'scope_jump' })) }];
  if (weakTrapFamilies(trapLedger(many))[0]?.key !== 'scope') bad('weakTrapFamilies: three scope misses name the scope family');
  const pl = patternLedger([{ module: 'rc', finished_at: later, answers: [1, 2, 3, 4].map((i) => ({ question_id: `q${i}`, is_correct: i === 4, patterns: ['inf.vs_speculation'] })) }]);
  if (weakPatterns(pl)[0]?.key !== 'inf.vs_speculation') bad('weakPatterns: a pattern missed three times in four is weak');
  // A mastered-then-abandoned skill resurfaces; a recently settled one does
  // not; a weak one still outranks it. Before this the curator could never
  // offer a level-4 skill again: not weak, not new, so never on any list.
  const { nextSkill, dueSkills, REVISIT_DAYS } = await mod('src/core/learning/review.js');
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const settled = (skill, daysAgo, n = 20) => ({ module: 'sp', finished_at: ago(daysAgo), answers: Array.from({ length: n }, (_, i) => ({ item_id: `${skill}-${i}`, skill, is_correct: true })) });
  const oldLed = skillLedger([settled('placement', 45)], []);
  if (!oldLed.get('placement')?.due || oldLed.get('placement').level !== 4) bad('skillLedger: a level-4 skill untouched for 45 days is not marked due');
  if (nextSkill(oldLed, {})?.kind !== 'due') bad(`nextSkill: a mastered skill 45 days quiet is not offered again (got ${nextSkill(oldLed, {})?.kind})`);
  if (dueSkills(oldLed)[0]?.revisitDays !== REVISIT_DAYS[4]) bad('dueSkills: a level-4 skill waits the level-4 interval');
  const freshLed = skillLedger([settled('placement', 5)], []);
  if (freshLed.get('placement')?.due || nextSkill(freshLed, {})?.kind === 'due') bad('nextSkill: a skill settled 5 days ago is offered as due');
  const weakToo = skillLedger([settled('placement', 45), { module: 'sp', finished_at: ago(1), answers: [1, 2, 3, 4, 5].map((i) => ({ item_id: `c-${i}`, skill: 'completion', is_correct: i === 1 })) }], []);
  if (nextSkill(weakToo, {})?.kind !== 'weak') bad(`nextSkill: a due skill outranked a weak one (got ${nextSkill(weakToo, {})?.kind})`);
  if (problems.length === 0) ok('bank session, set picking, rest, stars, crafts and the three ledgers behave; a settled skill gone quiet comes back once, behind anything weak');
}

console.log('\n21. Corpus QC (tools/qc-corpus.mjs — hard checks)');
{
  const { runCorpusQC } = await mod('tools/qc-corpus.mjs');
  const { errors, warnings, stats } = runCorpusQC();
  for (const e of errors) bad(`corpus: ${e}`);
  if (!errors.length) ok(`corpus clean: ${stats.counts.rc} passages / ${stats.questions.rc} questions · ${stats.counts.pj} PJ · ${stats.counts.ps} PS · ${stats.counts.ooo} OOO · ${stats.counts.sp} SP · ${stats.counts.pc} PC · ${stats.questions.wb ?? 0} word-bank items · ${stats.questions.cr ?? 0} arguments · ${stats.distinct_patterns} patterns · ${stats.distinct_traps} trap types in use · ${warnings.length} soft warning(s)`);
}


console.log('\n22. Colour contrast (tools/check-contrast.mjs — WCAG AA)');
{
  // The palette is the one thing no screenshot review catches: a caption
  // colour that fails AA fails it everywhere at once, on the smallest type.
  const { checkContrast } = await mod('tools/check-contrast.mjs');
  const { failures, lines } = checkContrast();
  for (const f of failures) bad(`contrast: ${f}`);
  if (!failures.length) ok(`${lines.length} ink/surface pairings clear WCAG AA in light, dark and the village`);
}

console.log('\n23. The map (tools/check-village-data.mjs — the paths on the painting)');
{
  // Pets walk only between the traced nodes, so a node on a roof, a tree or
  // the pond puts a pet there for everyone. Graph first, then the painting's
  // own pixels under every node (a headless Chrome reads the PNG).
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [join(root, 'tools/check-village-data.mjs')], { cwd: root, encoding: 'utf8', timeout: 300000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n');
  if (r.status !== 0) for (const l of out.filter((x) => x.includes('- ') || x.includes('problem'))) bad('map: ' + l.replace(/^\s*-\s*/, ''));
  else ok(out[out.length - 1]);
}

console.log('\n23b. The village, running (tools/check-village.mjs — a real browser)');
{
  // Six pets on the painting and walking; each card names its pet and starts
  // its real next activity; dialogs trap and return focus; a treasure can be
  // made and appears; night sends everyone home; reduced motion holds them
  // still; no sideways scroll on a phone; and the village reopens offline.
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [join(root, 'tools/check-village.mjs')], { cwd: root, encoding: 'utf8', timeout: 600000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n');
  if (out.some((l) => l.startsWith('SKIPPED'))) console.log('  --  SKIPPED: no Chrome on this machine (set CHROME_PATH). This section did NOT run.');
  else if (r.status !== 0) bad('village: ' + out.slice(-3).join(' | '));
  else ok(out[out.length - 1]);
}

console.log('\n23c. The friends walk only on the path (tools/check-walk.mjs — a real browser, synthetic frames)');
{
  // Every friend stays within a pixel of the traced walk for minutes of village
  // life (never on a fence, a step or a flowerbed), a party called mid-walk
  // gathers all eight, and the village keeps roaming.
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [join(root, 'tools/check-walk.mjs')], { cwd: root, encoding: 'utf8', timeout: 600000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n');
  if (out.some((l) => l.startsWith('SKIPPED'))) console.log('  --  SKIPPED: no Chrome on this machine (set CHROME_PATH). This section did NOT run.');
  else if (r.status !== 0) bad('walk: ' + out.slice(-3).join(' | '));
  else ok(out[out.length - 1]);
}

console.log('\n24. Rendered contrast (tools/check-rendered-contrast.mjs — real pixels)');
{
  // §22 proves the PALETTE is sound and passed every release while the
  // Reading Room rendered its passages at 1.14:1. This proves the SCREEN is:
  // it opens each route in both themes, paints every glyph transparent,
  // screenshots both, and measures the real ratio between the ink and
  // whatever is actually behind it — a card, a gradient, a translucent veil
  // over a canvas valley. About a minute per route, so the full sweep is
  // opt-in and a release should always run it:
  //     CATOS_FULL=1 node tools/verify.mjs
  const full = process.env.CATOS_FULL === '1';
  const { checkRenderedContrast, ROUTES } = await mod('tools/check-rendered-contrast.mjs');
  const routes = full ? ROUTES : ROUTES.filter((r) => r.risk);
  const { skipped, failures, checked } = await checkRenderedContrast({ routes });
  if (skipped) console.log('  --  SKIPPED: no Chrome on this machine (set CHROME_PATH). This section did NOT run.');
  else {
    for (const f of failures) bad(`contrast: [${f.theme}] ${f.hash} ${f.sel} is ${f.ratio}:1, needs ${f.need} ("${f.text}")`);
    if (!failures.length) ok(`${checked} rendered text runs over ${routes.length} route(s) x 2 themes clear AA against what is actually behind them${full ? '' : ` (CATOS_FULL=1 sweeps all ${ROUTES.length})`}`);
  }
}

console.log('\n25. The offline promise (precache lists, fingerprints, budgets)');
{
  // Its OWN problems, not the run's: this section used to stay silent whenever
  // any EARLIER section had failed, so a green §25 was indistinguishable from
  // a §25 that never reported at all.
  const before = problems.length;
  // Three ways an offline-first app silently stops being offline-first:
  // a new screen nobody added to the precache list, a changed file shipped
  // under an unchanged cache version, and a boot that quietly grows until
  // the first paint is a download. None of them has a symptom you can see.
  const { coreFiles, shellFiles, precacheFiles, fingerprints } = await mod('tools/build-precache.mjs');
  const { summary, BUDGET } = await mod('tools/module-graph.mjs');
  const sw = readFileSync(join(root, 'service-worker.js'), 'utf8');

  const listOf = (name) => {
    const m = sw.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\n\\];'));
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null;
  };
  for (const [name, want] of [['CORE_FILES', coreFiles()], ['SHELL_FILES', shellFiles()], ['CONTENT_FILES', precacheFiles()]]) {
    const have = listOf(name);
    if (!have) { bad(`service worker: ${name} not found`); continue; }
    const missing = want.filter((f) => !have.includes(f));
    const extra = have.filter((f) => !want.includes(f));
    if (missing.length) bad(`service worker: ${name} is missing ${missing.length} file(s) — run tools/build-precache.mjs (${missing.slice(0, 3).join(', ')}…)`);
    if (extra.length) bad(`service worker: ${name} lists ${extra.length} file(s) that are not on disk — run tools/build-precache.mjs (${extra.slice(0, 3).join(', ')}…)`);
  }

  const fp = fingerprints();
  const inSW = (name) => (sw.match(new RegExp("const " + name + " = '([^']*)'")) ?? [])[1];
  if (inSW('BUILD_ID') !== fp.shell) bad(`service worker: BUILD_ID is ${inSW('BUILD_ID')}, the shipped files hash to ${fp.shell} — run tools/build-precache.mjs, or installed learners keep the old code`);
  if (inSW('CONTENT_ID') !== fp.content) bad(`service worker: CONTENT_ID is ${inSW('CONTENT_ID')}, the shipped content hashes to ${fp.content} — run tools/build-precache.mjs`);

  const s = summary();
  if (s.count > BUDGET.modules) bad(`cold open: ${s.count} modules, budget ${BUDGET.modules}. Load the new one where it is used, not in the bootstrap (tools/module-graph.mjs --why <file>)`);
  if (s.bytes > BUDGET.bytes) bad(`cold open: ${Math.round(s.bytes / 1024)} KB of JavaScript, budget ${Math.round(BUDGET.bytes / 1024)} KB`);

  // Its OWN problems, not the run's: this used to stay silent whenever any
  // earlier section had failed, so a green §25 was indistinguishable from a
  // §25 that never reported.
  if (problems.length === before) ok(`${coreFiles().length} core + ${shellFiles().length} shell + ${precacheFiles().length} content files precached, fingerprints current, cold open ${s.count} modules / ${Math.round(s.bytes / 1024)} KB`);
}

console.log('\n26. Hostile records (tools/check-hostile-records.mjs)');
{
  const before = problems.length;
  // Content is schema-checked before it ships and code is checked by
  // everything above. STORED RECORDS are neither: they were written by
  // whichever version the learner had, or imported from a file somebody
  // edited. One session row without a `score` used to throw a raw TypeError
  // onto the VILLAGE — the screen that hides the tab bar — so the dead end
  // had no links in it and every reload produced it again.
  const { checkHostileRecords } = await mod('tools/check-hostile-records.mjs');
  const { problems: hp, cases, records } = await checkHostileRecords();
  for (const p of hp) bad('records: ' + p);
  if (problems.length === before) ok(`${records} deliberately broken records through ${cases} derivations; the world still derives`);
}

console.log('\n27. What the ledgers say (tools/check-noticing.mjs)');
{
  const before = problems.length;
  // §20 proves the ledgers COMPUTE, and it passed for two releases while
  // nothing read them: the seven trap families had authored copy nobody ever
  // saw, and the hundred and fifty-two reasoning patterns existed only in a
  // JSON file no runtime code loaded. This is the other half — that a learner
  // with a real habit gets a real sentence, that a learner without one is
  // left alone, that every line has a number behind it and is in the mentor's
  // register, and that the curator's finest aim actually moves the choice.
  const { checkNoticing } = await mod('tools/check-noticing.mjs');
  const { problems: np, patterns, tagged } = await checkNoticing();
  for (const p of np) bad('noticing: ' + p);
  if (problems.length === before) ok(`${patterns} reasoning patterns in the code, ${tagged} passages tagged with theirs; the trap, pattern and skill ledgers each reach a learner`);
}

console.log('\n28. Pressing Tab (tools/check-reach.mjs)');
{
  const before = problems.length;
  // §22 proves the ink has contrast against whatever is behind it. This
  // proves you can find the thing at all. It walks every route with a real
  // Tab key in a real browser and reads the computed style at each stop.
  // The focus ring it was looking for had existed the whole time — and
  // eight component classes each set their own :focus-visible box-shadow,
  // which REPLACES rather than adds, so every passage row, every primary
  // call to action and every Settings toggle focused invisibly. No static
  // reading of the cascade can see that: which rule wins depends on the
  // route and the theme. It also opens the app menu with the Enter key and
  // checks that a sheet claiming role="dialog" keeps all of that promise.
  const { checkReach } = await mod('tools/check-reach.mjs');
  let stops = 0; let skipped = false;
  for (const theme of ['light', 'dark']) {
    const r = await checkReach({ theme });
    if (r.skipped) { skipped = true; break; }
    stops += r.checked;
    for (const p of r.problems) bad('reach: ' + p);
  }
  if (skipped) console.log('  --  SKIPPED: no Chrome on this machine (set CHROME_PATH). Nobody pressed Tab.');
  else if (problems.length === before) ok(`${stops} tab stops walked with a real keyboard across both themes; every one visible, named, and 44x44`);
}

console.log('\n29. What a learner left behind (tools/check-interruption.mjs)');
{
  const before = problems.length;
  // §26 proves the VILLAGE survives a hostile record log. This is the other
  // half of the same rule, for the three screens that speak to a learner and
  // for the draft a learner leaves behind when a run is interrupted — a file
  // on their own device, possibly written by an older release, possibly
  // carried through a backup somebody edited by hand. It is not a schema.
  // It found what it was written to look for on its first run: a loaded
  // passage keeps its id at meta.id, which finish() had always known and the
  // draft did not, so all 115 passages shared one draft slot.
  const { interruptionProblems, cases } = await mod('tools/check-interruption.mjs');
  for (const p of interruptionProblems) bad('interruption: ' + p);
  if (problems.length === before) ok(`${cases.drafts} malformed drafts and ${cases.records} nonsense record sets: nothing thrown, nothing lost, and the satchel never shows more than was earned`);
}

console.log('\n30. What a learner comes back to (tools/check-resume.mjs — a real browser)');
{
  const before = problems.length;
  // §29 proves the ENGINES carry a run across an interruption; this proves
  // the SCREENS do. It answers an item in each of Para Jumbles, Para Summary,
  // Odd One Out and Word DNA, reloads the page, checks the screen is where
  // the learner was (a locked item shows its verdict again; a family
  // interrupted between Predict and Apply picks up at the Apply), finishes
  // the set and reads the record out of IndexedDB. Then it comes back to the
  // village from a word round: Matcha smiles, the toast names the leaves, and
  // a second visit does not say it again.
  const { checkResume } = await mod('tools/check-resume.mjs');
  const r = await checkResume();
  if (r.skipped) console.log('  --  SKIPPED: no Chrome on this machine (set CHROME_PATH). Nobody came back.');
  else {
    for (const p of r.problems) bad('resume: ' + p);
    if (problems.length === before) ok(`${r.cases} things a learner comes back to, checked on a real screen: four modules resume after a refresh and record what was answered before it; the village greets a finished run once, with its pet and its gifts`);
  }
}

console.log('\n─────────────────────────────────────');
if (problems.length === 0) {
  console.log('✓ Repository is internally consistent.\n');
  process.exit(0);
} else {
  console.log(`✗ ${problems.length} problem(s) found.\n`);
  process.exit(1);
}
