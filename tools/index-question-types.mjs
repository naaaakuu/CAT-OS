/**
 * index-question-types.mjs — write each passage's question types into the
 * content index.
 *
 * The curator has to be able to say "this learner keeps missing inference,
 * so read THIS passage next" without opening thirty-two files on a phone.
 * The types live in the passage; the index is where a chooser can see
 * them. Run this after adding or editing passages:
 *
 *     node tools/index-question-types.mjs
 *
 * It is idempotent, and it only ever adds `question_types` to rc rows.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'content', 'index.json');
const RC_DIR = path.join(ROOT, 'content', 'reading-comprehension');

const raw = fs.readFileSync(INDEX, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const index = JSON.parse(raw);

let changed = 0;
for (const row of index.items) {
  if (row.type !== 'rc') continue;
  const file = path.join(RC_DIR, `${row.id}.json`);
  if (!fs.existsSync(file)) continue;
  const passage = JSON.parse(fs.readFileSync(file, 'utf8'));
  const types = [...new Set((passage.questions ?? []).map((q) => q.type).filter(Boolean))].sort();
  if (JSON.stringify(row.question_types) === JSON.stringify(types)) continue;
  row.question_types = types;
  changed += 1;
}

if (changed) {
  fs.writeFileSync(INDEX, JSON.stringify(index, null, 2).split('\n').join(eol) + eol);
}
console.log(`question types indexed: ${changed} row(s) updated`);
