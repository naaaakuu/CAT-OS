#!/usr/bin/env node
/**
 * tools/build-lexicon.mjs — transcribes the owner's reference vocabulary
 * corpus (KNOWLEDGE/99_REFERENCE, a sibling folder of this repo) into
 * schema-validated content bundles and wires them into the content
 * system:
 *
 *   content/lexicon/lex-<band>-<letter>.json   lists 1–3: high / medium / low frequency words
 *   content/loanwords/loan-<language>.json     list 6: English words of foreign origin
 *   content/twins/twin-<letter>.json           list 7: commonly confused words
 *   content/index.json                         registry rows for the three types
 *   service-worker.js                          the CONTENT_FILES precache block only
 *
 * Nothing is invented, paraphrased or "improved": every word, meaning,
 * synonym and antonym is transcribed as written. The only edits are
 * mechanical and stated next to the code — whitespace normalised, words
 * lower-cased unless a token carries an acronym-style capital, a
 * trailing period stripped from synonym/antonym list items, a meaning
 * the source continues on further lines ("(ii) …", "b) …") joined with
 * a space. Every irregular source line is counted and reported.
 *
 * Deterministic and idempotent: the same source always yields the same
 * bytes, running twice changes nothing, stale bundles from an earlier
 * run are removed, and every bundle is validated with the app's own
 * validator + consistency rules BEFORE anything is written (a bad
 * transcription never lands on disk). CONTENT_VERSION in the service
 * worker is NOT bumped here — bump it by hand when the content moved
 * (the summary says whether the precache list changed). SHELL_FILES
 * and CACHE_VERSION are never touched.
 *
 * Usage:  node tools/build-lexicon.mjs [path/to/99_REFERENCE]
 * Plain Node, no dependencies (matching the no-npm rule).
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF = process.argv[2] ?? join(root, '..', 'KNOWLEDGE', '99_REFERENCE');
const mod = (rel) => import(pathToFileURL(join(root, rel)).href);
const { validate } = await mod('src/core/content-loader/validator.js');
const {
  lexConsistencyIssues, loanConsistencyIssues, twinConsistencyIssues, lexLetterOf, loanSlugOf,
} = await mod('src/core/content-loader/loader.js');

/* Fixed metadata — a re-run must not change bytes, so never "today". */
const DATE_ADDED = '2026-09-11';
const PUBLICATION = 'CAT vocabulary reference (owner-supplied)';
const BATCH = { lex: 'batch-lex-001', loan: 'batch-loan-001', twin: 'batch-twin-001' };
const USAGE = {
  lex: "Personal study only. Words, meanings, synonyms and antonyms transcribed faithfully from the owner's reference.",
  loan: "Personal study only. Words and meanings transcribed faithfully from the owner's reference.",
  twin: "Personal study only. Word pairs and explanations transcribed faithfully from the owner's reference; per-word senses are a mechanical split of the explanation, never rewritten.",
};
const BAND_TITLE = { high: 'High frequency', medium: 'Medium frequency', low: 'Low frequency' };
const SOURCES = {
  high: [
    '1 - High Frequency Word A.md', '1 - High Frequency Word B.md',
    '1 - High Frequency Word C.md', '1 - High Frequency Word D.md',
  ],
  medium: ['2 - Medium Frequency Words.md'],
  low: ['3 - Low Frequency Words.md'],
  loan: '6 - English Words of Foreign Origin.md',
  twin: '7 - confusing words reference.md',
};
const DIRS = { lex: 'content/lexicon', loan: 'content/loanwords', twin: 'content/twins' };
const CHECK = { lex: lexConsistencyIssues, loan: loanConsistencyIssues, twin: twinConsistencyIssues };

/* ---- reporting: every irregular line is counted, with examples ---- */
const skipped = new Map(); // reason → { count, examples }   (lines not transcribed)
const notes = new Map();   // reason → { count, examples }   (mechanical handling, text kept)
function tally(map, reason, where) {
  if (!map.has(reason)) map.set(reason, { count: 0, examples: [] });
  const r = map.get(reason);
  r.count += 1;
  if (r.examples.length < 3) r.examples.push(where);
}
const skip = (reason, file, n, text) => tally(skipped, reason, `${file}:${n}: ${String(text).slice(0, 72)}`);
const note = (reason, file, n, text) => tally(notes, reason, `${file}:${n}: ${String(text).slice(0, 72)}`);

/* ---- text helpers: the only edits ever applied to source text ---- */
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const readJSON = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
function readRef(file) {
  const p = join(REF, file);
  if (!existsSync(p)) { console.error(`build-lexicon: source file not found: ${p}`); process.exit(1); }
  return readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
}

/** Words are stored lower-case, except when a token carries a capital
 *  after its first letter (NASA, McCoy — acronym / proper-noun style),
 *  in which case the source casing is kept. Leading punctuation such as
 *  "(" is ignored when looking for that capital. */
function caseWord(w) {
  const keep = w.split(' ').some((t) => {
    const core = t.replace(/^[^\p{L}]+/u, '');
    return core.slice(1) !== core.slice(1).toLowerCase();
  });
  return keep ? w : w.toLowerCase();
}

/** "Desert, Forsake; Leave." → ["Desert", "Forsake", "Leave"]: items split
 *  on commas and semicolons, trimmed, trailing periods stripped (the one
 *  place a period is ever removed). "None specified." is an empty list. */
function parseList(s) {
  const t = norm(s);
  if (!t || /^none\b/i.test(t)) return [];
  return t.split(/[,;]/).map((x) => norm(norm(x).replace(/\.+$/, ''))).filter(Boolean);
}

/* ---------------- list 1 (high): "N. Word" / Meaning: / Synonyms: / Antonyms: ---------------- */
function parseNumbered(file) {
  const entries = [];
  let cur = null;
  readRef(file).forEach((raw, i) => {
    const n = i + 1;
    const hadSep = raw.includes('\uFFFC');
    const line = norm(raw.replace(/\uFFFC/g, ''));
    if (!line) { if (hadSep) skip('separator line (U+FFFC)', file, n, 'U+FFFC'); return; }
    let m;
    if ((m = line.match(/^(\d+)\.\s+(.+)$/))) {
      cur = { word: norm(m[2]), meaning: null, synonyms: [], antonyms: [], file, line: n };
      entries.push(cur);
      return;
    }
    if ((m = line.match(/^Meaning:\s*(.*)$/i))) {
      if (!cur) { skip('Meaning line before any entry', file, n, line); return; }
      if (cur.meaning !== null) note('second Meaning line joined to the first', file, n, line);
      cur.meaning = norm(`${cur.meaning ?? ''} ${m[1]}`);
      return;
    }
    if ((m = line.match(/^Synonyms:\s*(.*)$/i))) {
      if (!cur) { skip('Synonyms line before any entry', file, n, line); return; }
      cur.synonyms.push(...parseList(m[1]));
      return;
    }
    if ((m = line.match(/^Antonyms:\s*(.*)$/i))) {
      if (!cur) { skip('Antonyms line before any entry', file, n, line); return; }
      cur.antonyms.push(...parseList(m[1]));
      return;
    }
    if (/^Letter [A-Z]$/.test(line)) { skip('"Letter X" marker', file, n, line); return; }
    if (/^CAT Vocabulary/i.test(line) || /^Section \d+:/i.test(line)) { skip('file banner line', file, n, line); return; }
    if (/^Example:/i.test(line)) { skip('"Example:" line (not part of the meaning)', file, n, line); return; }
    if (cur && cur.meaning !== null) {
      note('meaning continued on a following line (joined with a space)', file, n, line);
      cur.meaning = norm(`${cur.meaning} ${line}`);
      return;
    }
    skip('unrecognised line', file, n, line);
  });
  return entries;
}

/* ---------------- lists 2 + 3 (medium, low): "### Word" / meaning / - S: / - A: ---------------- */
function parseHeaded(file) {
  const entries = [];
  let cur = null;
  let started = false;
  readRef(file).forEach((raw, i) => {
    const n = i + 1;
    const line = norm(raw);
    if (!line) return;
    let m;
    if ((m = line.match(/^###\s+(.+)$/))) {
      started = true;
      cur = { word: norm(m[1]), meaning: null, synonyms: [], antonyms: [], file, line: n };
      entries.push(cur);
      return;
    }
    if (/^#{1,2}\s/.test(line) || /^-{3,}$/.test(line)) {
      skip('chapter / section heading or rule', file, n, line);
      cur = null;
      return;
    }
    if (!started) { skip('intro paragraph before the first entry', file, n, line); return; }
    if ((m = line.match(/^-\s*S:\s*(.*)$/))) {
      if (!cur) { skip('synonym line outside an entry', file, n, line); return; }
      cur.synonyms.push(...parseList(m[1]));
      return;
    }
    if ((m = line.match(/^-\s*A:\s*(.*)$/))) {
      if (!cur) { skip('antonym line outside an entry', file, n, line); return; }
      cur.antonyms.push(...parseList(m[1]));
      return;
    }
    if (!cur) { skip('text outside an entry', file, n, line); return; }
    if (cur.meaning === null) { cur.meaning = line; return; }
    note('meaning continued on a following line (joined with a space)', file, n, line);
    cur.meaning = norm(`${cur.meaning} ${line}`);
  });
  return entries;
}

/* ---------------- lexicon bundles: one per band + first letter ---------------- */
function buildLex(band) {
  const parse = band === 'high' ? parseNumbered : parseHeaded;
  const raw = SOURCES[band].flatMap((f) => parse(f));
  const buckets = new Map(); // letter → { entries, files }
  let kept = 0;
  for (const e of raw) {
    if (!e.meaning || !norm(e.meaning)) { skip('entry without a meaning (dropped)', e.file, e.line, e.word); continue; }
    const letter = lexLetterOf(e.word);
    if (!buckets.has(letter)) buckets.set(letter, { entries: [], files: [] });
    const b = buckets.get(letter);
    if (!b.files.includes(e.file)) b.files.push(e.file);
    const word = caseWord(e.word);
    if (word !== e.word.toLowerCase()) note('word kept with its source capitals (acronym-style token)', e.file, e.line, e.word);
    b.entries.push({ word, meaning: norm(e.meaning), synonyms: e.synonyms, antonyms: e.antonyms });
    kept += 1;
  }
  const bundles = [];
  for (const letter of [...buckets.keys()].sort()) {
    const b = buckets.get(letter);
    const id = `lex-${band}-${letter}`;
    const LETTER = letter === 'other' ? 'other' : letter.toUpperCase();
    bundles.push({
      schema_version: 1,
      meta: {
        id,
        type: 'lex',
        version: 1,
        status: 'accepted',
        band,
        letter: LETTER,
        title: `${BAND_TITLE[band]} · ${letter === 'other' ? 'Other' : LETTER}`,
        entry_count: b.entries.length,
        source: { publication: PUBLICATION, file: b.files.join('; '), usage_note: USAGE.lex },
        date_added: DATE_ADDED,
        batch_id: BATCH.lex,
      },
      entries: b.entries.map((e, i) => ({ id: `${id}-${String(i + 1).padStart(4, '0')}`, ...e })),
    });
  }
  return { bundles, parsed: raw.length, kept };
}

/* ---------------- list 6: "# <Language> Words" + | Word | Meaning | tables ---------------- */
function buildLoan() {
  const file = SOURCES.loan;
  const sections = [];
  let cur = null;
  readRef(file).forEach((raw, i) => {
    const n = i + 1;
    const line = norm(raw);
    if (!line) return;
    let m;
    if ((m = line.match(/^#(?!#)\s*(.+)$/))) {
      cur = { heading: norm(m[1]), language: norm(m[1].replace(/\s+Words$/i, '')), origin: null, entries: [], line: n };
      sections.push(cur);
      return;
    }
    if (line.startsWith('|')) {
      const parts = line.split('|');
      parts.shift();
      if (line.endsWith('|')) parts.pop();
      const cells = parts.map(norm);
      if (cells.every((c) => /^:?-+:?$/.test(c))) { skip('table separator row', file, n, line); return; }
      if (/^word$/i.test(cells[0]) && /^meaning$/i.test(cells[1])) { skip('table header row', file, n, line); return; }
      if (cells.length !== 2) { skip('table row without exactly 2 cells (dropped)', file, n, line); return; }
      if (!cur) { skip('table row before any language heading (dropped)', file, n, line); return; }
      if (!cells[0] || !cells[1]) { skip('table row with an empty cell (dropped)', file, n, line); return; }
      const word = caseWord(cells[0]);
      if (word !== cells[0].toLowerCase()) note('word kept with its source capitals (acronym-style token)', file, n, cells[0]);
      cur.entries.push({ word, meaning: cells[1] });
      return;
    }
    if (cur && (m = line.match(/taken from (.+?),\s*are as follows/i))) {
      cur.origin = norm(m[1]); // the source's own noun for the origin ("India", "African languages")
      skip('section lead-in sentence (its origin noun names the bundle title)', file, n, line);
      return;
    }
    skip('prose line', file, n, line);
  });
  const bundles = [];
  for (const s of sections) {
    if (!s.entries.length) { skip('heading with no word table (no bundle)', file, s.line, s.heading); continue; }
    const id = `loan-${loanSlugOf(s.language)}`;
    bundles.push({
      schema_version: 1,
      meta: {
        id,
        type: 'loan',
        version: 1,
        status: 'accepted',
        language: s.language,
        title: `Words from ${s.origin ?? s.language}`,
        entry_count: s.entries.length,
        source: { publication: PUBLICATION, file, usage_note: USAGE.loan },
        date_added: DATE_ADDED,
        batch_id: BATCH.loan,
      },
      entries: s.entries.map((e, i) => ({ id: `${id}-${String(i + 1).padStart(4, '0')}`, ...e })),
    });
  }
  return { bundles };
}

/* ---------------- list 7: "**A/B** — A means … B means …" under "## A" ---------------- */
const LINK = '(?:means|is|are|was|were|refers to)';
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['\u2019]");

/** Mechanical split: each word must own exactly one sentence that opens
 *  "<Word> means/is/are/was/were/refers to …" (longest word first, so
 *  "As if" is claimed before "As"). The sense is that sentence minus the
 *  lead-in and its final period. Anything less than a clean one-per-word
 *  split keeps the whole explanation as every word's sense (split: false). */
function splitSenses(words, explanation) {
  const sentences = explanation.split(/(?<=[.!?]["\u201D\u2019)]?)\s+(?=["\u201C(]?[A-Z])/);
  const claimed = new Set();
  const found = words.map(() => null);
  const order = words.map((_, i) => i).sort((a, b) => words[b].length - words[a].length || a - b);
  for (const i of order) {
    const re = new RegExp(`^["\u201C]?${escapeRe(words[i])}["\u201D]?[?!]?["\u201D]?\\s+${LINK}\\s+(.+)$`, 'i');
    for (let s = 0; s < sentences.length; s += 1) {
      if (claimed.has(s)) continue;
      const m = sentences[s].match(re);
      if (!m) continue;
      claimed.add(s);
      found[i] = norm(m[1]).replace(/\.$/, '');
      break;
    }
  }
  if (found.every((f) => f)) {
    // A sentence nobody claimed that still opens with a head word is a
    // second sense the split would silently drop — keep the whole text.
    const headRe = new RegExp(`^["“]?(?:${words.map(escapeRe).join('|')})(?!\\p{L})`, 'iu');
    const stray = sentences.some((s, idx) => !claimed.has(idx) && headRe.test(s));
    if (!stray) return { split: true, senses: words.map((w, i) => ({ word: w, meaning: found[i] })) };
  }
  return { split: false, senses: words.map((w) => ({ word: w, meaning: explanation })) };
}

function buildTwins() {
  const file = SOURCES.twin;
  const sections = new Map(); // letter → entries
  let letter = null;
  readRef(file).forEach((raw, i) => {
    const n = i + 1;
    const line = norm(raw);
    if (!line) return;
    let m;
    if ((m = line.match(/^##\s+([A-Za-z])$/))) { letter = m[1].toUpperCase(); return; }
    if (/^#/.test(line)) {
      if (/^##/.test(line)) letter = null;
      skip('heading that is not a section letter', file, n, line);
      return;
    }
    if ((m = line.match(/^\*\*(.+?)\*\*\s*(?:\u2014|\u2013|-|:)\s*(.+)$/))) {
      const words = m[1].split('/').map(norm).filter(Boolean);
      const explanation = norm(m[2]);
      if (words.length < 2) { skip('entry with fewer than 2 words (dropped)', file, n, line); return; }
      if (!letter) { skip('entry before any section letter (dropped)', file, n, line); return; }
      if (lexLetterOf(words[0]) !== letter.toLowerCase()) {
        note('entry filed under a section letter that is not its first letter (kept under the section)', file, n, m[1]);
      }
      const { split, senses } = splitSenses(words, explanation);
      if (!split) note('explanation not cleanly splittable per word (split: false, whole text kept)', file, n, m[1]);
      if (!sections.has(letter)) sections.set(letter, []);
      sections.get(letter).push({ words, senses, explanation, split });
      return;
    }
    skip('unrecognised line', file, n, line);
  });
  const bundles = [];
  for (const L of [...sections.keys()].sort()) {
    const id = `twin-${L.toLowerCase()}`;
    const entries = sections.get(L);
    bundles.push({
      schema_version: 1,
      meta: {
        id,
        type: 'twin',
        version: 1,
        status: 'accepted',
        letter: L,
        title: `Confusable words · ${L}`,
        entry_count: entries.length,
        source: { publication: PUBLICATION, file, usage_note: USAGE.twin },
        date_added: DATE_ADDED,
        batch_id: BATCH.twin,
      },
      entries: entries.map((e, i) => ({ id: `${id}-${String(i + 1).padStart(4, '0')}`, ...e })),
    });
  }
  return { bundles };
}

/* ---------------- build everything in memory ---------------- */
const lex = Object.fromEntries(['high', 'medium', 'low'].map((band) => [band, buildLex(band)]));
const loan = buildLoan();
const twin = buildTwins();
const all = [
  ...Object.values(lex).flatMap((x) => x.bundles.map((b) => ['lex', b])),
  ...loan.bundles.map((b) => ['loan', b]),
  ...twin.bundles.map((b) => ['twin', b]),
];

/* ---------------- self-check with the app's own rules, before writing ---------------- */
const schemas = Object.fromEntries(Object.keys(DIRS).map((k) => [k, readJSON(`content/schema/${k}.schema.v1.json`)]));
const problems = [];
for (const [kind, b] of all) {
  const { valid, errors } = validate(schemas[kind], b);
  errors.forEach((e) => problems.push(`${b.meta.id}: ${e}`));
  if (valid) CHECK[kind](b.meta.id, b).forEach((e) => problems.push(`${b.meta.id}: ${e}`));
}
if (problems.length) {
  console.error(`build-lexicon: ${problems.length} problem(s); nothing written.`);
  problems.forEach((p) => console.error(`  !!  ${p}`));
  process.exit(1);
}

/* ---------------- write bundles (only when bytes differ; remove stale ones) ---------------- */
function syncDir(kind) {
  const dir = join(root, DIRS[kind]);
  mkdirSync(dir, { recursive: true });
  const want = new Map(all.filter(([k]) => k === kind).map(([, b]) => [`${b.meta.id}.json`, `${JSON.stringify(b, null, 2)}\n`]));
  const stat = { written: 0, unchanged: 0, removed: 0 };
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.json') && !want.has(f)) { unlinkSync(join(dir, f)); stat.removed += 1; }
  }
  for (const [f, text] of want) {
    const p = join(dir, f);
    if (existsSync(p) && readFileSync(p, 'utf8') === text) stat.unchanged += 1;
    else { writeFileSync(p, text); stat.written += 1; }
  }
  return stat;
}
const fileStats = Object.fromEntries(Object.keys(DIRS).map((k) => [k, syncDir(k)]));

/* ---------------- registry: existing rows untouched, ours rewritten, sorted by id ---------------- */
function registryRow(kind, b) {
  const m = b.meta;
  const extra = kind === 'lex' ? { band: m.band, letter: m.letter }
    : kind === 'loan' ? { language: m.language }
      : { letter: m.letter };
  return {
    id: m.id,
    type: m.type,
    status: m.status,
    title: m.title,
    ...extra,
    entry_count: m.entry_count,
    date_added: m.date_added,
    batch_id: m.batch_id,
    schema_version: b.schema_version,
    version: m.version,
  };
}
function syncRegistry() {
  const p = join(root, 'content/index.json');
  const before = readFileSync(p, 'utf8');
  const reg = JSON.parse(before);
  const kept = reg.items.filter((i) => !(i.type in DIRS));
  const rows = all.map(([kind, b]) => registryRow(kind, b))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  reg.items = [...kept, ...rows];
  const after = `${JSON.stringify(reg, null, 2)}\n`;
  if (after !== before) writeFileSync(p, after);
  return { changed: after !== before, kept: kept.length, rows: rows.length };
}
const regStat = syncRegistry();

/* ---------------- service worker: the CONTENT_FILES block only ---------------- */
function syncServiceWorker() {
  const p = join(root, 'service-worker.js');
  const before = readFileSync(p, 'utf8');
  const start = before.indexOf('const CONTENT_FILES = [');
  const end = before.indexOf('\n];', start);
  if (start < 0 || end < 0) { console.error('build-lexicon: CONTENT_FILES block not found in service-worker.js'); process.exit(1); }
  const lines = before.slice(start, end).split('\n');
  const ours = (l) => /'\.\/content\/(lexicon|loanwords|twins)\//.test(l) || /'\.\/content\/schema\/(lex|loan|twin)\.schema\./.test(l);
  const kept = lines.slice(1).filter((l) => !ours(l));
  let lastSchema = -1;
  kept.forEach((l, i) => { if (/'\.\/content\/schema\//.test(l)) lastSchema = i; });
  const schemaLines = Object.keys(DIRS)
    .map((k) => `${k}.schema.v1.json`)
    .filter((f) => existsSync(join(root, 'content/schema', f)))
    .map((f) => `  './content/schema/${f}',`);
  const fileLines = all.map(([kind, b]) => `  './${DIRS[kind]}/${b.meta.id}.json',`);
  const block = [lines[0], ...kept.slice(0, lastSchema + 1), ...schemaLines, ...kept.slice(lastSchema + 1), ...fileLines].join('\n');
  const after = before.slice(0, start) + block + before.slice(end);
  if (after !== before) writeFileSync(p, after);
  return after !== before;
}
const swChanged = syncServiceWorker();

/* ---------------- summary ---------------- */
const sum = (bundles) => bundles.reduce((n, b) => n + b.entries.length, 0);
console.log(`build-lexicon — source: ${REF}`);
for (const band of ['high', 'medium', 'low']) {
  const x = lex[band];
  const letters = x.bundles.map((b) => b.meta.letter).join('');
  console.log(`  lexicon ${band.padEnd(7)} ${String(sum(x.bundles)).padStart(5)} entries in ${x.bundles.length} bundles (${letters}); ${x.parsed} parsed, ${x.parsed - x.kept} dropped`);
}
console.log(`  loanwords       ${String(sum(loan.bundles)).padStart(5)} entries in ${loan.bundles.length} languages: ${loan.bundles.map((b) => `${b.meta.language} ${b.entries.length}`).join(', ')}`);
const twinEntries = twin.bundles.flatMap((b) => b.entries);
console.log(`  twins           ${String(twinEntries.length).padStart(5)} entries in ${twin.bundles.length} sections; ${twinEntries.filter((e) => e.split).length} split per word, ${twinEntries.filter((e) => !e.split).length} kept whole (split: false)`);
console.log(`  files: ${Object.entries(fileStats).map(([k, s]) => `${k} ${s.written} written / ${s.unchanged} unchanged / ${s.removed} removed`).join(' · ')}`);
console.log(`  registry: ${regStat.rows} rows for lex/loan/twin after ${regStat.kept} untouched rows (${regStat.changed ? 'rewritten' : 'unchanged'})`);
console.log(`  service worker: CONTENT_FILES ${swChanged ? 'updated — bump CONTENT_VERSION if content moved' : 'unchanged'}`);
const show = (map, label) => {
  if (!map.size) return;
  console.log(`  ${label}:`);
  for (const [reason, r] of [...map.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`    ${String(r.count).padStart(5)}  ${reason}`);
    if (!reason.startsWith('separator')) r.examples.forEach((e) => console.log(`             e.g. ${e}`));
  }
};
show(notes, 'handled (text kept, mechanically)');
show(skipped, 'skipped lines (not transcribed)');
