#!/usr/bin/env node
/**
 * tools/build-manifest.mjs — the library manifest.
 *
 * content/manifest.json lists every bank file the content engine ships —
 * passages, jumbles, summaries, odd-ones-out, placement, completion, the
 * word bank and arguments. The service worker does not precache these
 * (a couple of thousand files would make install slow and brittle);
 * src/core/content-loader/library-sync.js walks this list in idle time
 * and fetches what the cache does not hold, so the whole library is
 * offline within minutes of the first open.
 *
 *   node tools/build-manifest.mjs
 *
 * Passages come first so a learner who goes offline early has them.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'content', 'manifest.json');

export const BANK_DIRS = [
  'reading-comprehension', 'para-jumbles', 'para-summary', 'odd-one-out',
  'sentence-placement', 'para-completion', 'word-bank', 'critical-reasoning',
];

export function manifestFiles() {
  const files = [];
  for (const dir of BANK_DIRS) {
    const abs = path.join(ROOT, 'content', dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter((x) => x.endsWith('.json')).sort()) files.push(`content/${dir}/${f}`);
  }
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = manifestFiles();
  const bytes = files.reduce((n, f) => n + fs.statSync(path.join(ROOT, f)).size, 0);
  const manifest = {
    manifest_version: 1,
    description: 'Every bank file in the library, for src/core/content-loader/library-sync.js. Written by tools/build-manifest.mjs; not a registry (see index.json).',
    built_at: new Date().toISOString().slice(0, 10),
    count: files.length,
    bytes,
    files,
  };
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`manifest: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}
