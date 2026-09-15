#!/usr/bin/env node
/**
 * tools/module-graph.mjs — what a cold open actually costs.
 *
 * This is a no-build app: every `import` at the top of a module is one more
 * HTTP request before the first screen can paint. That is a fine trade until
 * nobody is counting, and then one day the valley opens after 153 requests
 * and 2.8 MB because a mentor's lesson copy is reachable from the bootstrap.
 *
 * Walks the STATIC import graph from `src/app.js` and reports:
 *   - every module in the eager closure, with its size,
 *   - which of them are reachable only through a learning module's screens
 *     (i.e. should be behind a dynamic import),
 *   - the totals a cold open pays.
 *
 * Run: node tools/module-graph.mjs            (summary)
 *      node tools/module-graph.mjs --list     (every module, largest first)
 *      node tools/module-graph.mjs --why <f>  (a shortest import path to f)
 *
 * `verify.mjs` calls `eagerGraph()` and fails if the eager closure grows past
 * the budget below — the point is that the number can only go down on purpose.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = 'src/app.js';

/** The ceiling a cold open may not cross without a deliberate decision. */
export const BUDGET = { modules: 70, bytes: 1_150_000 };

const IMPORT_RE = /(?:^|\n)\s*import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const EXPORT_FROM_RE = /(?:^|\n)\s*export\s+(?:\*|\{[\s\S]*?\})\s+from\s+['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function readIf(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) && fs.statSync(abs).isFile() ? fs.readFileSync(abs, 'utf8') : null;
}

function resolveSpec(fromRel, spec) {
  if (!spec.startsWith('.')) return null;             // bare specifier: not ours
  const rel = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel.split(path.sep).join('/')), spec));
  if (readIf(rel) !== null) return rel;
  for (const ext of ['.js', '.mjs', '/index.js']) if (readIf(rel + ext) !== null) return rel + ext;
  return null;
}

/** The eager (static) closure from an entry, plus every dynamic edge found. */
export function eagerGraph(entry = ENTRY) {
  const seen = new Map();                              // rel -> {size, imports[], from}
  const dynamic = new Set();
  const queue = [[entry, null]];
  while (queue.length) {
    const [rel, from] = queue.shift();
    if (seen.has(rel)) continue;
    const src = readIf(rel);
    if (src === null) continue;
    const imports = [];
    for (const re of [IMPORT_RE, EXPORT_FROM_RE]) {
      re.lastIndex = 0;
      for (const m of src.matchAll(re)) {
        const r = resolveSpec(rel, m[1]);
        if (r) { imports.push(r); queue.push([r, rel]); }
      }
    }
    DYNAMIC_RE.lastIndex = 0;
    for (const m of src.matchAll(DYNAMIC_RE)) { const r = resolveSpec(rel, m[1]); if (r) dynamic.add(r); }
    seen.set(rel, { size: Buffer.byteLength(src), imports, from });
  }
  return { modules: seen, dynamic };
}

/** A shortest static import path from the entry to `target`, for --why. */
export function why(target, entry = ENTRY) {
  const { modules } = eagerGraph(entry);
  if (!modules.has(target)) return null;
  const chain = [];
  let at = target;
  while (at) { chain.unshift(at); at = modules.get(at)?.from ?? null; }
  return chain;
}

export function summary(entry = ENTRY) {
  const { modules, dynamic } = eagerGraph(entry);
  let bytes = 0;
  for (const m of modules.values()) bytes += m.size;
  const byArea = {};
  for (const [rel, m] of modules) {
    const area = rel.split('/').slice(0, 3).join('/');
    byArea[area] = (byArea[area] ?? { n: 0, bytes: 0 });
    byArea[area].n += 1; byArea[area].bytes += m.size;
  }
  return { count: modules.size, bytes, byArea, dynamic: [...dynamic].sort(), modules };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = summary();
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  if (process.argv.includes('--why')) {
    const target = process.argv[process.argv.indexOf('--why') + 1];
    const chain = why(target);
    console.log(chain ? chain.join('\n  → ') : `${target} is not in the eager closure`);
    process.exit(0);
  }
  console.log(`Eager closure from ${ENTRY}: ${s.count} modules, ${kb(s.bytes)}`);
  console.log(`Budget: ${BUDGET.modules} modules, ${kb(BUDGET.bytes)}  —  ${s.count <= BUDGET.modules && s.bytes <= BUDGET.bytes ? 'within' : 'OVER'}\n`);
  const areas = Object.entries(s.byArea).sort((a, b) => b[1].bytes - a[1].bytes);
  for (const [area, v] of areas) console.log(`  ${String(v.n).padStart(3)}  ${kb(v.bytes).padStart(8)}  ${area}`);
  if (process.argv.includes('--list')) {
    console.log('\nEvery eager module, largest first:');
    for (const [rel, m] of [...s.modules].sort((a, b) => b[1].size - a[1].size)) console.log(`  ${kb(m.size).padStart(8)}  ${rel}`);
  }
  console.log(`\n${s.dynamic.length} module(s) reached only by dynamic import (these cost nothing at boot).`);
}
