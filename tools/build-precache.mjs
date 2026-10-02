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
import crypto from 'node:crypto';
import { eagerGraph } from './module-graph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SW = path.join(ROOT, 'service-worker.js');

/**
 * Every shippable app file on disk. SHELL_FILES was hand-maintained, so a new
 * screen was offline-broken until somebody remembered to add it — and since
 * screens are loaded on demand now, "offline-broken" means a tap that 404s.
 * Derived from the tree instead: if it is in src/ and it is code or a style,
 * it is precached.
 */
export function shellFiles() {
  const out = new Set(coreFiles());
  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const name of fs.readdirSync(abs).sort()) {
      const child = `${rel}/${name}`;
      const st = fs.statSync(path.join(ROOT, child));
      if (st.isDirectory()) walk(child);
      else if (/\.(js|mjs|css)$/.test(name)) out.add(`./${child}`);
    }
  };
  walk('src');
  for (const icon of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'maskable-512.png']) {
    if (fs.existsSync(path.join(ROOT, 'assets/icons', icon))) out.add(`./assets/icons/${icon}`);
  }
  // The art pack's sprites: every picture in the village is one of these.
  for (const name of fs.readdirSync(path.join(ROOT, 'assets/art')).sort()) if (name.endsWith('.png')) out.add(`./assets/art/${name}`);
  return [...out].sort();
}

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
    './assets/art/home-world-v1.png',
    './assets/art/home-companions-v1.png',
    './content/boot-index.json',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    ...js,
  ];
}

export const PRECACHE_DIRS = ['schema', 'vocabulary', 'language-garden', 'word-dna', 'lexicon', 'loanwords', 'twins'];

export function precacheFiles() {
  // boot-index.json first: it is what the village waits on.
  const files = ['./content/boot-index.json', './content/index.json', './content/manifest.json', './content/context/pack.json'];
  for (const dir of PRECACHE_DIRS) {
    const abs = path.join(ROOT, 'content', dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter((x) => x.endsWith('.json')).sort()) files.push(`./content/${dir}/${f}`);
  }
  return files;
}

/**
 * A short hash of the CONTENT of every file in a list.
 *
 * The cache name carries this, so shipping a changed file always produces a
 * new cache and an installed learner always gets the new code. Nothing used
 * to enforce a CACHE_VERSION bump: ship a changed stylesheet without one and
 * every installed learner stayed on the old one, forever, with no symptom
 * anybody could see. A number a human has to remember is not a mechanism.
 */
export function fingerprint(files) {
  const h = crypto.createHash('sha256');
  for (const rel of files.slice().sort()) {
    const abs = path.join(ROOT, rel.replace(/^\.\//, ''));
    h.update(rel);
    try { h.update(fs.readFileSync(abs)); } catch { h.update('missing'); }
  }
  return h.digest('hex').slice(0, 10);
}

/** The two fingerprints the worker should be carrying right now. */
export function fingerprints() {
  const core = coreFiles();
  const shell = shellFiles();
  return {
    shell: fingerprint([...new Set([...core, ...shell])].filter((f) => f !== './')),
    content: fingerprint(precacheFiles()),
  };
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
  const shell = shellFiles();
  const content = precacheFiles();
  for (const [name, files] of [['CORE_FILES', core], ['SHELL_FILES', shell], ['CONTENT_FILES', content]]) {
    const next = rewriteList(lf, name, files);
    if (next === null) { console.error(`${name} block not found in service-worker.js`); process.exit(1); }
    lf = next;
  }
  // The fingerprints go in last, AFTER the lists, so they describe what the
  // worker will actually ship.
  const { shell: shellId, content: contentId } = fingerprints();
  lf = lf.replace(/const BUILD_ID = '[^']*';/, `const BUILD_ID = '${shellId}';`);
  lf = lf.replace(/const CONTENT_ID = '[^']*';/, `const CONTENT_ID = '${contentId}';`);
  const changed = lf !== raw.replace(/\r\n/g, '\n');
  if (changed) fs.writeFileSync(SW, lf.split('\n').join(eol));
  console.log(`precache: ${core.length} core, ${shell.length} shell, ${content.length} content entries · shell ${shellId} · content ${contentId}${changed ? ' (rewritten)' : ' (unchanged)'}`);
}
