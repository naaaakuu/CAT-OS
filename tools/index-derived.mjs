/**
 * index-derived.mjs — write into the content index the few facts the app
 * needs BEFORE it opens a content file.
 *
 * Two of them, both of which were costing real time on a phone:
 *
 *   rc.question_types  which CAT question types a passage asks. The
 *                      curator has to be able to say "this learner keeps
 *                      missing inference, read THIS one next" without
 *                      opening thirty-two files.
 *
 *   lg.root_origin     the root's language and meaning. The valley draws
 *   lg.root_meaning    fifty-one trees and labels them, and used to load
 *                      fifty-one family files to do it — 1.7 seconds
 *                      before the map could be painted at all.
 *
 * Run after adding or editing content:
 *
 *     node tools/index-derived.mjs
 *
 * It is idempotent and only ever adds these fields.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'content', 'index.json');
const RC_DIR = path.join(ROOT, 'content', 'reading-comprehension');
const LG_DIR = path.join(ROOT, 'content', 'language-garden');

const raw = fs.readFileSync(INDEX, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const index = JSON.parse(raw);

let changed = 0;
const set = (row, key, value) => {
  if (JSON.stringify(row[key]) === JSON.stringify(value)) return;
  row[key] = value;
  changed += 1;
};

for (const row of index.items) {
  if (row.type === 'rc') {
    const file = path.join(RC_DIR, `${row.id}.json`);
    if (!fs.existsSync(file)) continue;
    const passage = JSON.parse(fs.readFileSync(file, 'utf8'));
    const types = [...new Set((passage.questions ?? []).map((q) => q.type).filter(Boolean))].sort();
    set(row, 'question_types', types);
  } else if (row.type === 'lg') {
    const file = path.join(LG_DIR, `${row.id}.json`);
    if (!fs.existsSync(file)) continue;
    const family = JSON.parse(fs.readFileSync(file, 'utf8'));
    set(row, 'root_origin', family.root?.origin_language ?? null);
    set(row, 'root_meaning', family.root?.core_meaning ?? null);
  }
}

if (changed) fs.writeFileSync(INDEX, JSON.stringify(index, null, 2).split('\n').join(eol) + eol);
console.log(`derived index fields: ${changed} field(s) updated`);
