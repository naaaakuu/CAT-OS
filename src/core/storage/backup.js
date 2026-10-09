/**
 * backup.js — export/import the user's entire local data as one JSON
 * file. This is the cross-device mechanism for V1.0 and the core of
 * "you own your data" (PRODUCT_BLUEPRINT §3.17, PROJECT_ROADMAP V1.0).
 *
 * File format (versioned so future imports can migrate):
 * {
 *   "format":     "cat-os-backup",
 *   "version":    2,
 *   "exported_at": "2026-07-02T…Z",
 *   "stores":     { "settings": [...], "attempts": [...], "sessions": [...],
 *                   "learning": [...] }
 * }
 *
 * Version history: v1 = settings/attempts/sessions; v2 (app 0.6.0) adds
 * the learning store (reflections, and since 1.0 the whole world). A v1
 * file still imports: it simply does not mention "learning", and a store
 * the file does not mention is left exactly as it was.
 *
 * Import modes (never silently overwrite — blueprint edge case):
 * - "merge":   incoming records are put() over existing ones by id;
 *              records only on this device are kept.
 * - "replace": each store the file DECLARES is cleared, then filled from
 *              the file. Stores it does not declare are untouched — the
 *              alternative is deleting records the backup cannot restore.
 *              The whole payload is validated before anything is cleared.
 */

import { STORES } from './storage-adapter.js';
import { NATIVE, ask } from '../native.js';

const FORMAT = 'cat-os-backup';
const FORMAT_VERSION = 2;

/** Gather everything into a backup object (plain data, ready to save). */
export async function exportAll(storage) {
  const stores = {};
  for (const name of Object.values(STORES)) {
    stores[name] = await storage.getAll(name);
  }
  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    stores,
  };
}

/** Trigger a download of the backup as a .json file (browser only). */
export async function downloadBackup(storage) {
  const data = await exportAll(storage);
  // A WebView cannot download a blob: the Android shell opens "Save as" instead.
  if (NATIVE) {
    const r = await ask('saveFile', `cat-os-backup-${data.exported_at.slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    if (!r?.ok) throw new Error(r?.reason === 'cancelled' ? 'Backup not saved.' : 'The backup could not be saved.');
    return data;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cat-os-backup-${data.exported_at.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return data;
}

/**
 * Import a parsed backup object.
 * @param {'merge'|'replace'} mode
 * @returns {{written: number, kept: string[]}} how many records were written,
 *   and which identity records a merge declined to overwrite.
 */
export async function importAll(storage, backup, mode) {
  if (!backup || backup.format !== FORMAT) {
    throw new Error('This file is not a CAT OS backup.');
  }
  if (backup.version > FORMAT_VERSION) {
    throw new Error('This backup was made by a newer version of CAT OS.');
  }
  if (mode !== 'merge' && mode !== 'replace') {
    throw new Error(`Unknown import mode "${mode}".`);
  }

  /* Read and validate the ENTIRE payload before clearing anything. The old
     loop cleared each store and then wrote whatever the file happened to hold
     for it, with `?? []` standing in for a missing section — so importing a v1
     backup in "replace" mode cleared `learning` and refilled it with nothing.
     That store is where the whole world lives (world/state.js derives the
     village, the ledger, every garden and lexicon record from it), so the one
     feature named "you own your data" was the fastest way to lose all of it.

     Two rules now. A store the file does not DECLARE is not this backup's to
     replace, so it is left untouched; a store it declares but mis-types is a
     damaged file and nothing is written at all. */
  const declared = new Map();
  for (const name of Object.values(STORES)) {
    if (!Object.hasOwn(backup.stores ?? {}, name)) continue;
    const records = backup.stores[name];
    if (!Array.isArray(records)) {
      throw new Error(`This backup is damaged: its "${name}" section is not a list.`);
    }
    declared.set(name, records.filter((r) => r && r.id !== undefined));
  }
  if (declared.size === 0) {
    throw new Error('This backup holds no recognisable data.');
  }

  /* WHO THIS DEVICE IS IS NOT THE BACKUP'S TO DECIDE.
     A merge puts incoming records over existing ones by id, which is right
     for a session and wrong for a valley: importing a friend's backup, or
     an old one of your own, silently renamed the village and repointed its
     awakening — two unrelated villages fused into one with nothing said.
     Replace is a different promise and keeps its own: it is asked for, it
     says what it will do, and it does all of it. */
  const IDENTITY = new Set(['valley']);
  let written = 0;
  const kept = [];
  for (const [name, records] of declared) {
    if (mode === 'replace') await storage.clear(name);
    for (const record of records) {
      if (mode === 'merge' && name === STORES.SETTINGS && IDENTITY.has(record.id) && await storage.get(name, record.id)) {
        kept.push(record.id);
        continue;
      }
      await storage.put(name, record);
      written += 1;
    }
  }
  return { written, kept };
}

/**
 * What is in a backup file, without writing any of it — so the learner can
 * be told what they are about to do before they do it.
 * @returns {{counts: object, total: number, exportedAt: string|null, valley: object|null}}
 */
export function describeBackup(backup) {
  const counts = {};
  let total = 0;
  for (const name of Object.values(STORES)) {
    const rows = backup?.stores?.[name];
    if (!Array.isArray(rows)) continue;
    counts[name] = rows.filter((r) => r && r.id !== undefined).length;
    total += counts[name];
  }
  const valley = (backup?.stores?.[STORES.SETTINGS] ?? []).find((r) => r?.id === 'valley')?.value ?? null;
  return { counts, total, exportedAt: backup?.exported_at ?? null, valley };
}
