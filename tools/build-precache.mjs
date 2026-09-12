#!/usr/bin/env node
/**
 * tools/build-precache.mjs — rewrite the service worker's CONTENT_FILES.
 *
 * What is precached at install: the registry, the library manifest, the
 * words-in-context pack, every schema, and the reference content the
 * valley cannot open without — the word lists (lexicon, loanwords,
 * twins), the vocabulary store, the root families and the Word DNA
 * units. The banks are deliberately absent: see library-sync.js.
 *
 *   node tools/build-precache.mjs
 *
 * Bump CACHE_VERSION / CONTENT_VERSION yourself when a release needs the
 * old caches evicted; this tool only rewrites the list.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SW = path.join(ROOT, 'service-worker.js');

export const PRECACHE_DIRS = ['schema', 'vocabulary', 'language-garden', 'word-dna', 'lexicon', 'loanwords', 'twins'];

export function precacheFiles() {
  const files = ['./content/index.json', './content/manifest.json', './content/context/pack.json'];
  for (const dir of PRECACHE_DIRS) {
    const abs = path.join(ROOT, 'content', dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter((x) => x.endsWith('.json')).sort()) files.push(`./content/${dir}/${f}`);
  }
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raw = fs.readFileSync(SW, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lf = raw.replace(/\r\n/g, '\n');
  const start = lf.indexOf('const CONTENT_FILES = [');
  const end = lf.indexOf('\n];', start);
  if (start < 0 || end < 0) { console.error('CONTENT_FILES block not found'); process.exit(1); }
  const block = `const CONTENT_FILES = [\n${precacheFiles().map((f) => `  '${f}',`).join('\n')}`;
  const next = lf.slice(0, start) + block + lf.slice(end);
  if (next !== lf) fs.writeFileSync(SW, next.split('\n').join(eol));
  console.log(`precache: ${precacheFiles().length} content entries${next !== lf ? ' (service-worker.js rewritten)' : ' (unchanged)'}`);
}
