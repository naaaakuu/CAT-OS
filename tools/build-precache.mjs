#!/usr/bin/env node
/**
 * tools/build-precache.mjs — rewrite the service worker's CORE_FILES and
 * CONTENT_FILES from what is actually on disk.
 *
 * CORE_FILES is the install stage that must succeed: the HTML, the six
 * stylesheets, the icons, and every JavaScript module a cold open of the
 * village actually imports — derived from the real static import graph
 * (tools/module-graph.mjs), never hand-maintained, because a hand-maintained
 * "critical" list is wrong the first time anybody adds an import.
 *
 * CONTENT_FILES is the reference content the valley cannot open without: the
 * registry, the library manifest, the words-in-context pack, every schema,
 * the word lists (lexicon, loanwords, twins), the vocabulary store, the root
 * families and the Word DNA units. The banks are deliberately absent — see
 * library-sync.js.
 *
 *   node tools/build-precache.mjs
 *
 * Bump CACHE_VERSION / CONTENT_VERSION yourself when a release needs the
 * old caches evicted; this tool only rewrites the lists.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eagerGraph } from './module-graph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SW = path.join(ROOT, 'service-worker.js');

/** Everything a cold open of the village fetches before it can paint. */
export function coreFiles() {
  const { modules } = eagerGraph('src/app.js');
  const js = [...modules.keys()].sort().map((rel) => `./${rel}`);
  return [
    './',
    './index.html',
    './manifest.webmanifest',
    './src/ui/styles/tokens.css',
    './src/ui/styles/base.css',
    './src/ui/styles/components.css',
    './src/ui/styles/game.css',
    './src/ui/styles/world.css',
    './src/ui/styles/village.css',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    ...js,
  ];
}

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

/** Replace `const NAME = [ … \n];` with a fresh list, preserving EOL. */
function rewriteList(lf, name, files) {
  const start = lf.indexOf(`const ${name} = [`);
  if (start < 0) return null;
  const end = lf.indexOf('\n];', start);
  if (end < 0) return null;
  const block = `const ${name} = [\n${files.map((f) => `  '${f}',`).join('\n')}`;
  return lf.slice(0, start) + block + lf.slice(end);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raw = fs.readFileSync(SW, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let lf = raw.replace(/\r\n/g, '\n');
  const core = coreFiles();
  const content = precacheFiles();
  for (const [name, files] of [['CORE_FILES', core], ['CONTENT_FILES', content]]) {
    const next = rewriteList(lf, name, files);
    if (next === null) { console.error(`${name} block not found in service-worker.js`); process.exit(1); }
    lf = next;
  }
  const changed = lf !== raw.replace(/\r\n/g, '\n');
  if (changed) fs.writeFileSync(SW, lf.split('\n').join(eol));
  console.log(`precache: ${core.length} core entries, ${content.length} content entries${changed ? ' (service-worker.js rewritten)' : ' (unchanged)'}`);
}
