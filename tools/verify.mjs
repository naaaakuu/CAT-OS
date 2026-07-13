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
const { consistencyIssues, pjConsistencyIssues, psConsistencyIssues, oooConsistencyIssues, wdConsistencyIssues, vocabConsistencyIssues, lgConsistencyIssues } = await mod('src/core/content-loader/loader.js');
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

if (problems.length === 0) ok(`${rcRegIds.length} RC + ${pjRegIds.length} PJ + ${psRegIds.length} PS + ${oooRegIds.length} OOO + ${wdRegIds.length} Word DNA + ${vocabRegIds.length} vocab + ${lgRegIds.length} Language Garden items agree with registry`);

console.log('\n3. Service worker precache ↔ disk');
const sw = readFileSync(join(root, 'service-worker.js'), 'utf8');
const listed = [...sw.matchAll(/'(\.\/[^']+)'/g)].map((m) => m[1]);
for (const p of listed) {
  if (p === './') continue;
  if (!existsSync(join(root, p))) bad(`service worker precaches missing file: ${p}`);
}
// every content file should be precached
for (const file of rcFiles) {
  const path = `./${rcDir}/${file}`;
  if (!listed.includes(path)) bad(`content file not in service worker precache: ${path}`);
}
for (const file of pjFiles) {
  const path = `./${pjDir}/${file}`;
  if (!listed.includes(path)) bad(`content file not in service worker precache: ${path}`);
}
for (const file of psFiles) {
  const path = `./${psDir}/${file}`;
  if (!listed.includes(path)) bad(`content file not in service worker precache: ${path}`);
}
for (const file of oooFiles) {
  const path = `./${oooDir}/${file}`;
  if (!listed.includes(path)) bad(`content file not in service worker precache: ${path}`);
}
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
if (!listed.includes('./content/index.json')) bad('registry not precached');
// Every schema version on disk must be precached — offline validation needs it.
for (const f of readdirSync(join(root, 'content/schema'))) {
  if ((f.startsWith('rc.schema.v') || f.startsWith('pj.schema.v') || f.startsWith('ps.schema.v') || f.startsWith('ooo.schema.v') || f.startsWith('wd.schema.v')
       || f.startsWith('vocab.schema.v') || f.startsWith('lg.schema.v'))
      && !listed.includes(`./content/schema/${f}`)) {
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
  const written = await importAll(b, file, 'merge');
  if (written !== 2) bad(`backup: expected 2 records imported, got ${written}`);
  const back = await b.getAll(STORES.LEARNING);
  if (back.length !== 1 || back[0].text !== 'check the checkers') {
    bad('backup: reflection did not survive the round trip');
  }
  // A v1 backup (no learning key) must import without error.
  const v1 = { format: 'cat-os-backup', version: 1, exported_at: new Date().toISOString(),
    stores: { settings: [{ id: 'theme', value: 'light' }], attempts: [], sessions: [] } };
  try {
    const w1 = await importAll(makeMock(), v1, 'replace');
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

console.log('\n15. Language Garden dry run (voice · scheduler · session · audio identity)');
if (lgFiles.length === 0) {
  ok('no Language Garden content yet — skipped');
} else {
  const gardenVoice = await mod('src/core/mentor/garden-voice.js');
  const rcVoice = await mod('src/core/mentor/voice.js');
  const { computePlantState, GardenSession, RUNG_INTERVALS_MS, GOLD_WINDOW_MS, EVERGREEN_AT_REVISITS } = await mod('src/core/engine/garden-session.js');

  /* -- The garden's mentor never judges either: lint its whole vocabulary. -- */
  {
    const banned = rcVoice.BANNED_WORDS.map((w) => new RegExp(`\\b${w}\\b`, 'i'));
    const offenders = [];
    const walk = (value, path) => {
      if (typeof value === 'string') {
        for (const re of banned) if (re.test(value)) offenders.push(`${path}: "${value.slice(0, 60)}…"`);
        if (value.includes('!')) offenders.push(`${path}: exclamation mark in "${value.slice(0, 60)}…"`);
      } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      } else if (typeof value === 'function') {
        try { walk(value('cede', 'seed-a'), `${path}()`); } catch { /* signature mismatch is fine */ }
      }
    };
    for (const [name, exported] of Object.entries(gardenVoice)) {
      if (name === 'pick') continue;
      walk(exported, name);
    }
    if (offenders.length) offenders.forEach((o) => bad(`garden: mentor voice uses judgment language or "!" — ${o}`));
  }

  /* -- Scheduler: computePlantState is a pure, deterministic function of
     history + now, and never demotes. -- */
  {
    const seed = computePlantState([], 1_000_000);
    if (seed.stage !== 'seed' || seed.due !== 'none') bad('garden scheduler: empty history must be Seed, never due');

    const plantedAt = new Date(2026, 0, 1, 10, 0, 0).getTime();
    const grow = { session_type: 'grow', finished_at: new Date(plantedAt).toISOString() };

    const justGrown = computePlantState([grow], plantedAt + 60_000); // 1 minute later
    if (justGrown.stage !== 'sprout') bad(`garden scheduler: fresh grow should be Sprout, got ${justGrown.stage}`);

    const settled = computePlantState([grow], plantedAt + RUNG_INTERVALS_MS[0] + 1000);
    if (settled.stage !== 'sapling') bad(`garden scheduler: past rung 0 with no revisit should be Sapling, got ${settled.stage}`);
    if (settled.due !== 'gold') bad(`garden scheduler: just past its first interval should be Gold, got ${settled.due}`);

    const longNeglected = computePlantState([grow], plantedAt + RUNG_INTERVALS_MS[0] + GOLD_WINDOW_MS + 1000);
    if (longNeglected.due !== 'bare') bad(`garden scheduler: long past the gold window should be Bare with buds, got ${longNeglected.due}`);

    // Four CLEAN revisits, each exactly at its own next_review_at, reach evergreen.
    let history = [grow];
    let t = plantedAt;
    for (let i = 0; i < EVERGREEN_AT_REVISITS; i += 1) {
      const state = computePlantState(history, t + 5000);
      t = new Date(state.nextReviewAt).getTime();
      history = [...history, { session_type: 'revisit', finished_at: new Date(t).toISOString(), clean: true }];
    }
    const evergreen = computePlantState(history, t + 1000);
    if (evergreen.stage !== 'evergreen') bad(`garden scheduler: ${EVERGREEN_AT_REVISITS} clean revisits should reach Evergreen, got ${evergreen.stage}`);
    if (!evergreen.evergreenAt) bad('garden scheduler: evergreenAt must be set once evergreen');

    // A rocky (non-clean) revisit still regrows (stage advances) but must
    // NOT shrink the interval on the next round — never a demotion.
    const rockyHistory = [grow, { session_type: 'revisit', finished_at: new Date(plantedAt + RUNG_INTERVALS_MS[0] + 1000).toISOString(), clean: false }];
    const afterRocky = computePlantState(rockyHistory, plantedAt + RUNG_INTERVALS_MS[0] + 2000);
    if (afterRocky.stage !== 'in_leaf') bad('garden scheduler: a completed rocky revisit should still regrow to In leaf');
    if (afterRocky.rung !== 0) bad('garden scheduler: a rocky revisit must not advance the rung (never a demotion, but never a shortcut either)');

    if (JSON.stringify(computePlantState(history, t + 1000)) !== JSON.stringify(evergreen)) {
      bad('garden scheduler: computePlantState is not deterministic');
    }
  }

  /* -- GardenSession: a real Grow session end to end, on real content. -- */
  {
    const cede = lgResolved.get('lg-0001');
    if (!cede) {
      ok('lg-0001 (cede) not present — GardenSession dry run skipped');
    } else {
      const siblings = [...lgResolved.values()]
        .filter((f) => f.meta.id !== cede.meta.id)
        .map((f) => ({ id: f.meta.id, label: f.root.label, core_meaning: f.root.core_meaning }));

      let t = 2_000_000;
      const session = new GardenSession(cede, 'grow', siblings, { now: () => (t += 1000) });

      const attemptOpts = session.attemptOptions();
      if (attemptOpts.filter((o) => o.correct).length !== 1) bad('garden session: attemptOptions must carry exactly one correct option');
      const correctAttemptIdx = attemptOpts.findIndex((o) => o.correct);
      if (!session.answerAttempt(correctAttemptIdx).is_correct) bad('garden session: answerAttempt did not recognize the correct option it just offered');

      for (let i = 0; i < session.taught.length; i += 1) session.confirmSpreadMember(i);

      const reachOpts = session.reachOptions(0, 1);
      if (reachOpts.filter((o) => o.correct).length !== 1) bad('garden session: reachOptions must carry exactly one correct option');
      const correctReachIdx = reachOpts.findIndex((o) => o.correct);
      if (!session.answerReach(0, correctReachIdx, 1).is_correct) bad('garden session: answerReach did not recognize the correct option it just offered');

      const record = session.finish();
      if (record.module !== 'lg' || record.kind !== 'garden-session' || record.garden !== 'root_grove') {
        bad('garden session: record missing module/kind/garden tags');
      }
      if (record.session_type !== 'grow' || record.family_id !== cede.meta.id) bad('garden session: record family/type wrong');
      if (record.spread.length !== session.taught.length || record.spread.some((s) => !s.walked)) {
        bad('garden session: spread record incomplete');
      }
      if (record.reach?.is_correct !== true) bad('garden session: reach record did not carry the correct verdict');
      if ('score' in record || 'marks' in record) bad('garden session: no score of any kind may exist on a garden-session record');

      // Determinism: the SAME session id must reshuffle to the SAME order
      // on a second call (so a re-render never contradicts itself), and a
      // different attempt number must be free to reshuffle differently.
      if (JSON.stringify(session.attemptOptions()) !== JSON.stringify(attemptOpts)) bad('garden session: attemptOptions is not stable within one session');

      // A revisit, on the same content, exercises the key/member-check path.
      let t2 = 3_000_000;
      const revisit = new GardenSession(cede, 'revisit', siblings, { now: () => (t2 += 1000) });
      const keyOpts = revisit.keyRetrievalOptions();
      if (keyOpts.length !== 3 || keyOpts.filter((o) => o.correct).length !== 1) bad('garden session: keyRetrievalOptions must offer 3 options, exactly 1 correct');
      const [ia, ib] = revisit.memberCheckIndices(0);
      const memberOpts = revisit.memberCheckOptions(ia);
      if (memberOpts.filter((o) => o.correct).length !== 1) bad('garden session: memberCheckOptions must carry exactly one correct option');
      revisit.answerKeyRetrieval(keyOpts.findIndex((o) => o.correct));
      revisit.answerMemberCheck(ia, memberOpts.findIndex((o) => o.correct));
      revisit.answerMemberCheck(ib, revisit.memberCheckOptions(ib).findIndex((o) => o.correct));
      const revisitRecord = revisit.finish();
      if (revisitRecord.session_type !== 'revisit') bad('garden session: revisit record has wrong session_type');
      if (revisitRecord.clean !== null && typeof revisitRecord.clean !== 'boolean') bad('garden session: revisit record must carry a boolean clean flag');
    }
  }

  /* -- Audio identity: import-safe under Node, disabled path is a no-op. -- */
  {
    const audio = await mod('src/modules/language-garden/logic/audio.js');
    const REQUIRED = ['key', 'growth', 'leafTap', 'bloom'];
    for (const n of REQUIRED) if (!audio.GARDEN_SOUND_NAMES.includes(n)) bad(`garden audio: sound "${n}" missing from the engine`);
    try {
      audio.playGardenSound('key');
      audio.unlockGardenAudio();
      audio.startGardenAmbience();
      audio.stopGardenAmbience();
    } catch (e) {
      bad(`garden audio: disabled play path threw — ${e.message}`);
    }
  }

  if (problems.filter((p) => p.startsWith('garden')).length === 0) {
    ok('calm voice, honest scheduler (never demotes), a real Grow + Revisit session, no score anywhere, audio import-safe');
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
