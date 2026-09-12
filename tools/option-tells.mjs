#!/usr/bin/env node
/**
 * tools/option-tells.mjs — is the answer guessable from the shape of the options?
 *
 * A strong candidate who has not read the passage should score at chance. Two
 * surface tells break that, and both are honest accidents rather than sloppiness:
 * the correct option carries the qualifications that make it correct, so it ends
 * up the longest; and the distractors get the absolute words, so the hedged one
 * is the answer. This measures both, per file and in total, and names the
 * questions that carry them so they can be rewritten.
 *
 * The repair is never padding. Give a distractor its own qualifying clause —
 * a real condition a candidate could believe — and it becomes a better trap
 * at the same time.
 *
 *   node tools/option-tells.mjs content/reading-comprehension
 *   node tools/option-tells.mjs content/reading-comprehension/rc-0001.json --list
 */

import fs from 'node:fs';
import path from 'node:path';

const L = ['A', 'B', 'C', 'D'];
const ABSOLUTE = /\b(always|never|only|all|none|every|entirely|completely|impossible|cannot|solely|invariably|wholly|totally|purely|must)\b/i;
const args = process.argv.slice(2);
const list = args.includes('--list');
const targets = args.filter((a) => !a.startsWith('--'));
if (!targets.length) { console.error('usage: option-tells.mjs <file or folder> … [--list]'); process.exit(2); }

const files = [];
for (const t of targets) {
  const p = path.resolve(t);
  if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p).filter((x) => x.endsWith('.json')).sort()) files.push(path.join(p, f));
  else files.push(p);
}

const questionsOf = (it) => {
  if (Array.isArray(it.questions)) return it.questions;
  if (it.question) return [it.question];
  if (Array.isArray(it.items)) return it.items;
  return [];
};

const total = { n: 0, longest: 0, shortest: 0, spread: 0, absTell: 0 };
const carriers = [];
for (const file of files) {
  let it;
  try { it = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
  const qs = questionsOf(it).filter((q) => q && q.options && q.correct);
  if (!qs.length) continue;
  const f = { n: 0, longest: 0, shortest: 0, spread: 0 };
  for (const q of qs) {
    const lens = L.map((l) => String(q.options[l] ?? '').trim().length);
    const max = Math.max(...lens), min = Math.min(...lens);
    const own = String(q.options[q.correct] ?? '').trim().length;
    f.n += 1; f.spread += max - min;
    const id = q.id ?? it.meta?.id;
    if (own === max && lens.filter((x) => x === max).length === 1) { f.longest += 1; carriers.push(`${id} (+${max - Math.min(...lens.filter((x) => x !== max))} chars over the next)`); }
    if (own === min && lens.filter((x) => x === min).length === 1) f.shortest += 1;
    const absWrong = L.filter((l) => l !== q.correct && ABSOLUTE.test(String(q.options[l] ?? ''))).length;
    if (absWrong === 3 && !ABSOLUTE.test(String(q.options[q.correct] ?? ''))) total.absTell += 1;
  }
  total.n += f.n; total.longest += f.longest; total.shortest += f.shortest; total.spread += f.spread;
  if (files.length > 1) console.log(`  ${path.basename(file, '.json')}: ${f.n} Q · longest ${Math.round(f.longest / f.n * 100)}% · shortest ${Math.round(f.shortest / f.n * 100)}% · spread ${Math.round(f.spread / f.n)}`);
}
const pct = (x) => Math.round(x / total.n * 100);
console.log(`\n${total.n} question(s) · the answer is the longest option ${pct(total.longest)}% (chance 25%) · the shortest ${pct(total.shortest)}% · mean longest-shortest spread ${Math.round(total.spread / total.n)} chars`);
console.log(`${total.absTell} question(s) where all three distractors carry an absolute word and the answer does not`);
if (list && carriers.length) { console.log('\nquestions where the answer is the longest option:'); for (const c of carriers) console.log('  ' + c); }
process.exit(pct(total.longest) > 35 ? 1 : 0);
