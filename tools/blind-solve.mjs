#!/usr/bin/env node
/**
 * tools/blind-solve.mjs — the adversarial second pass, made mechanical.
 *
 * The only honest test of "exactly one defensible answer" is a strong
 * reader who has NOT seen the key. This tool strips a batch down to what
 * a candidate sees, hands it to a reviewer (a person, or a fresh model
 * session with no memory of authoring it), takes back their letters,
 * and compares. Every disagreement is adjudicated by hand: either the
 * reviewer misread (recorded as such) or the item is ambiguous and is
 * rewritten. Only then is an item marked verified.
 *
 *   node tools/blind-solve.mjs strip   <type> --out <dir> [ids…|--unverified]
 *   node tools/blind-solve.mjs compare <type> <answers.json>
 *   node tools/blind-solve.mjs record  <type> <answers.json> --solver <name> [--verify]
 *
 * type: rc | ps | sp | pc | cr | wb.  answers.json: { "<question id>": "B", … }.
 * `record` writes quality.blind_solve into each file it covers and, with
 * --verify, sets quality.status to "verified" for files where every
 * question agreed (files with a disagreement are left "reviewed" and
 * listed — fix them, then solve again).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = { rc: 'reading-comprehension', ps: 'para-summary', sp: 'sentence-placement', pc: 'para-completion', cr: 'critical-reasoning', wb: 'word-bank', ooo: 'odd-one-out', pj: 'para-jumbles' };
const argv = process.argv.slice(2);
const [mode, type] = argv;
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const has = (name) => argv.includes(name);

if (!DIRS[type] || !['strip', 'compare', 'record'].includes(mode)) {
  console.error('usage: blind-solve.mjs strip|compare|record <rc|ps|sp|pc|cr|wb|ooo|pj> …');
  process.exit(2);
}
const dir = path.join(ROOT, 'content', DIRS[type]);
const files = () => fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const readF = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

const asksItsOwnTitle = (item) => (item.meta?.question_types ?? (item.questions ?? []).map((q) => q.type ?? q.question_type)).includes('title_selection');

/** What a candidate sees, and the keys, per file. */
function split(item) {
  const m = item.meta;
  if (type === 'rc') {
    return {
      // A passage that asks the reader to title it must not ship its title:
      // a blind reader found the answer sitting in the header. The app hides
      // it for the same reason (modules/reading-comprehension/logic/spoilers.js).
      shown: { id: m.id, ...(asksItsOwnTitle(item) ? {} : { title: item.passage.title }), passage: item.passage.paragraphs.map((p) => p.text), questions: item.questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options })) },
      keys: Object.fromEntries(item.questions.map((q) => [q.id, q.correct])),
    };
  }
  if (type === 'ooo') {
    // Four or five sentences, one of which does not belong. The key is its label.
    return { shown: { id: m.id, instruction: 'One sentence does not belong with the others. Give its label.', sentences: item.sentences }, keys: { [m.id]: item.outlier } };
  }
  if (type === 'pj') {
    // The key is an ordering, not a letter: compare joins it into one string.
    return { shown: { id: m.id, instruction: 'Put these sentences into the one order that makes a coherent paragraph. Answer as the labels in order, e.g. "BDAC".', sentences: item.sentences }, keys: { [m.id]: item.correct_order.join('') } };
  }
  if (type === 'ps') {
    return { shown: { id: m.id, paragraph: item.paragraph.sentences.map((s) => s.text).join(' '), stem: item.question.stem, options: item.question.options }, keys: { [m.id]: item.question.correct } };
  }
  if (type === 'sp') {
    return { shown: { id: m.id, sentences: item.paragraph.sentences, missing: item.missing.text, stem: item.question.stem, options: item.question.options }, keys: { [m.id]: item.question.correct } };
  }
  if (type === 'pc') {
    return { shown: { id: m.id, sentences: item.paragraph.sentences, gap_index: item.paragraph.gap_index, stem: item.question.stem, options: item.question.options }, keys: { [m.id]: item.question.correct } };
  }
  // bundles
  return {
    shown: { id: m.id, kind: m.kind ?? null, items: item.items.map((it) => ({ id: it.id, ...(type === 'cr' ? { argument: it.argument } : { word: it.word }), stem: it.stem, options: it.options })) },
    keys: Object.fromEntries(item.items.map((it) => [it.id, it.correct])),
  };
}

if (mode === 'strip') {
  const out = flag('--out');
  if (!out) { console.error('--out <dir> required'); process.exit(2); }
  fs.mkdirSync(out, { recursive: true });
  const ids = argv.slice(2).filter((a) => !a.startsWith('--') && a !== out);
  const chosen = files().filter((f) => {
    const id = f.replace('.json', '');
    if (ids.length) return ids.includes(id);
    if (has('--unverified')) { const it = readF(f); return it.meta.quality?.status !== 'verified'; }
    return true;
  });
  const batch = [];
  for (const f of chosen) batch.push(split(readF(f)).shown);
  const file = path.join(out, `${type}-blind-${Date.now().toString(36)}.json`);
  fs.writeFileSync(file, JSON.stringify({ type, count: batch.length, instructions: 'Answer every question from the text alone. Return {"<question id>": "A|B|C|D"} for every id, plus, for any question where two options seemed defensible, a one-line note under "notes": {"<id>": "…"}.', items: batch }, null, 1));
  console.log(`${batch.length} ${type} file(s) stripped → ${file}`);
  process.exit(0);
}

const answersFile = argv[2];
if (!answersFile || !fs.existsSync(answersFile)) { console.error('answers.json required'); process.exit(2); }
const answers = JSON.parse(fs.readFileSync(answersFile, 'utf8'));
const notes = answers.notes ?? {};
const given = answers.answers ?? answers;

const report = []; // per file: { file, id, agreed, total, disagreements: [{qid, key, given}] }
for (const f of files()) {
  const item = readF(f);
  const { keys } = split(item);
  const qids = Object.keys(keys).filter((q) => q in given);
  if (!qids.length) continue;
  const norm = (v) => String(v).toUpperCase().replace(/[^A-Z]/g, '');
  const dis = qids.filter((q) => norm(given[q]) !== norm(keys[q])).map((q) => ({ qid: q, key: keys[q], given: norm(given[q]), note: notes[q] ?? null }));
  report.push({ file: f, id: item.meta.id, agreed: qids.length - dis.length, total: qids.length, disagreements: dis });
}

const totalQ = report.reduce((n, r) => n + r.total, 0);
const totalA = report.reduce((n, r) => n + r.agreed, 0);
console.log(`${type}: ${totalA} / ${totalQ} agreed across ${report.length} file(s)`);
for (const r of report) for (const d of r.disagreements) console.log(`  ✗ ${d.qid}: key ${d.key}, reviewer ${d.given}${d.note ? ` — ${d.note}` : ''}`);
for (const [qid, note] of Object.entries(notes)) if (!report.some((r) => r.disagreements.some((d) => d.qid === qid))) console.log(`  ~ ${qid}: agreed, but noted — ${note}`);

if (mode === 'record') {
  const solver = flag('--solver') ?? 'blind reviewer';
  let verified = 0;
  for (const r of report) {
    const item = readF(r.file);
    if (!item.meta.quality) { console.log(`  (skip ${r.id}: no quality block in schema v${item.schema_version})`); continue; }
    item.meta.quality.blind_solve = { solver, agreed: r.agreed, total: r.total, notes: r.disagreements.map((d) => `${d.qid}: key ${d.key}, reviewer ${d.given}`).join('; ') || 'full agreement' };
    if (has('--verify') && r.agreed === r.total) { item.meta.quality.status = 'verified'; verified += 1; }
    fs.writeFileSync(path.join(dir, r.file), JSON.stringify(item, null, 2) + '\n');
  }
  console.log(`recorded blind_solve on ${report.length} file(s)${has('--verify') ? `, ${verified} now verified` : ''}`);
}
