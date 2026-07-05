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
const { consistencyIssues } = await mod('src/core/content-loader/loader.js');
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

console.log('\n2. Registry ↔ files agreement');
const registry = readJSON('content/index.json');
const regIds = registry.items.map((i) => i.id).sort();
const fileIds = rcFiles.map((f) => f.replace('.json', ''));
for (const id of regIds) {
  if (!fileIds.includes(id)) bad(`registry lists ${id} but no file exists`);
}
for (const id of fileIds) {
  if (!regIds.includes(id)) bad(`file ${id}.json has no registry entry`);
}
for (const entry of registry.items) {
  if (!fileIds.includes(entry.id)) continue;
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
if (problems.length === 0) ok(`${regIds.length} items agree with registry`);

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
if (!listed.includes('./content/index.json')) bad('registry not precached');
if (!listed.includes('./content/schema/rc.schema.v1.json')) bad('schema not precached');
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
  const items = registry.items;
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
    const trapEnum = schemas['3'].properties.questions.items.properties.explanation
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

console.log('\n─────────────────────────────────────');
if (problems.length === 0) {
  console.log('✓ Repository is internally consistent.\n');
  process.exit(0);
} else {
  console.log(`✗ ${problems.length} problem(s) found.\n`);
  process.exit(1);
}
