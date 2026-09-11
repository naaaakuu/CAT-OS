#!/usr/bin/env node
/**
 * tools/build-context.mjs — the words-in-context pack.
 *
 * CAT does not ask what a word means in the abstract; it asks what a word
 * means HERE. The corpus already holds hundreds of words shown in a real
 * sentence — the `vocabulary[]` block of every Reading Comprehension
 * passage (word · passage_use · meaning_here) and the `context_sentences`
 * of every Rootwood member — but nothing in the app had ever used them.
 *
 * This walks both and writes one small pack, `content/context/pack.json`,
 * that the Meadow and the Gauntlet draw on to ask the CAT question.
 *
 * Usage:  node tools/build-context.mjs
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

const entries = [];
const seen = new Set();

/** The word has to be findable in its own sentence, or the question cannot
 *  mark it and the learner is being asked about something not on screen.
 *  A generous stem match lets inflections through (govern / governing). */
function findable(word, sentence) {
  const stem = word.toLowerCase().slice(0, Math.max(4, word.length - 3));
  return sentence.toLowerCase().includes(stem);
}

/* ---- Reading Comprehension: word, the sentence it lives in, its sense here ---- */
const rcDir = 'content/reading-comprehension';
for (const f of readdirSync(join(root, rcDir)).filter((x) => x.endsWith('.json')).sort()) {
  const p = read(`${rcDir}/${f}`);
  for (const v of p.vocabulary ?? []) {
    const word = String(v.word ?? '').trim();
    const use = String(v.passage_use ?? '').trim();
    const meaning = String(v.meaning_here ?? '').trim();
    if (!word || !use || !meaning) continue;
    // Some passages fill passage_use with the surrounding phrase rather
    // than the word’s own sentence; those cannot be asked about.
    if (!findable(word, use)) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      id: `ctx-rc-${p.meta.id.slice(3)}-${entries.length + 1}`,
      word,
      sentence: use,
      meaning,
      difficulty: v.difficulty ?? p.meta.difficulty ?? 'medium',
      source: 'rc',
      from: p.meta.id,
    });
  }
}

/* ---- The Rootwood: every member word in two real sentences ---- */
const lgDir = 'content/language-garden';
const vocab = new Map();
const vDir = 'content/vocabulary';
for (const f of readdirSync(join(root, vDir)).filter((x) => x.endsWith('.json'))) {
  const v = read(`${vDir}/${f}`);
  vocab.set(v.meta.id, v);
}
for (const f of readdirSync(join(root, lgDir)).filter((x) => x.endsWith('.json')).sort()) {
  const p = read(`${lgDir}/${f}`);
  for (const m of p.members ?? []) {
    const v = vocab.get(m.vocab_id);
    const sentence = (m.context_sentences ?? [])[0];
    if (!v || !sentence) continue;
    const word = String(v.word ?? '').trim();
    const meaning = String(v.meaning ?? '').trim();
    if (!word || !meaning) continue;
    if (!findable(word, sentence)) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      id: `ctx-lg-${entries.length + 1}`,
      word,
      sentence: String(sentence).trim(),
      meaning,
      difficulty: 'medium',
      source: 'lg',
      from: p.meta.id,
      root: p.root?.label ?? null,
    });
  }
}

const outDir = join(root, 'content/context');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const pack = {
  schema_version: 1,
  description: 'Words shown in a real sentence, with the sense they carry there. Built by tools/build-context.mjs from the Reading Comprehension vocabulary blocks and the Rootwood members’ context sentences; not an authored content type, so it has no registry entry of its own.',
  built_at: new Date().toISOString().slice(0, 10),
  count: entries.length,
  entries,
};
writeFileSync(join(outDir, 'pack.json'), `${JSON.stringify(pack, null, 1)}\n`);

const bySource = entries.reduce((m, e) => { m[e.source] = (m[e.source] ?? 0) + 1; return m; }, {});
console.log(`content/context/pack.json — ${entries.length} words in context (${JSON.stringify(bySource)})`);
