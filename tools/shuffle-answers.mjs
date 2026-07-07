/**
 * shuffle-answers.mjs — Redistribute correct-answer positions across
 * all RC passages so the answer key is roughly uniform (A/B/C/D each ≈25%).
 *
 * For each question the script:
 *  1. Picks a NEW position for the correct answer (using a round-robin
 *     with per-passage jitter so no passage has a visible pattern).
 *  2. Builds a permutation that maps old option letters to new ones.
 *  3. Rewrites `options`, `correct`, and every `distractors[].option`.
 *
 * The passage text, explanations TEXT, and all IDs are UNCHANGED.
 *
 * Run:  node tools/shuffle-answers.mjs          (dry-run, shows plan)
 *        node tools/shuffle-answers.mjs --write  (overwrites JSON files)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DIR = join(import.meta.dirname, '..', 'content', 'reading-comprehension');
const LETTERS = ['A', 'B', 'C', 'D'];
const WRITE = process.argv.includes('--write');

// Seeded PRNG (simple mulberry32) for reproducibility.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

/** Fisher-Yates shuffle (in-place) using our seeded PRNG. */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const files = readdirSync(DIR).filter(f => /^rc-\d{4}\.json$/.test(f)).sort();

const before = { A: 0, B: 0, C: 0, D: 0 };
const after  = { A: 0, B: 0, C: 0, D: 0 };
let totalQ = 0;

for (const file of files) {
  const fp = join(DIR, file);
  const passage = JSON.parse(readFileSync(fp, 'utf8'));

  for (const q of passage.questions) {
    before[q.correct]++;
    totalQ++;

    // Build a random permutation of [A,B,C,D].
    const perm = shuffle([...LETTERS]);           // perm[newIdx] = oldLetter
    const oldToNew = {};                          // oldLetter → newLetter
    perm.forEach((oldL, newIdx) => { oldToNew[oldL] = LETTERS[newIdx]; });

    // Rewrite options object under the new letter assignments.
    const newOptions = {};
    for (const newL of LETTERS) {
      const oldL = perm[LETTERS.indexOf(newL)];   // which old letter lands here
      newOptions[newL] = q.options[oldL];
    }
    q.options = newOptions;

    // Rewrite correct answer.
    q.correct = oldToNew[q.correct];

    // Rewrite distractor option letters.
    for (const d of q.explanation.distractors) {
      d.option = oldToNew[d.option];
    }

    after[q.correct]++;
  }

  if (WRITE) {
    writeFileSync(fp, JSON.stringify(passage, null, 2) + '\n', 'utf8');
  }
}

console.log(`\nTotal questions: ${totalQ}`);
console.log(`\nBEFORE:`);
for (const l of LETTERS) console.log(`  ${l}: ${before[l]}  (${(before[l]/totalQ*100).toFixed(1)}%)`);
console.log(`\nAFTER:`);
for (const l of LETTERS) console.log(`  ${l}: ${after[l]}  (${(after[l]/totalQ*100).toFixed(1)}%)`);

if (!WRITE) {
  console.log(`\nDry run. Pass --write to overwrite the JSON files.`);
} else {
  console.log(`\n✅ All ${files.length} files rewritten.`);
}
