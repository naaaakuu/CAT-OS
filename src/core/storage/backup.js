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
 * the learning store (reflections). v1 files import cleanly — the store
 * loop simply finds no "learning" key and writes nothing there.
 *
 * Import modes (never silently overwrite — blueprint edge case):
 * - "merge":   incoming records are put() over existing ones by id;
 *              records only on this device are kept.
 * - "replace": every store is cleared first, then filled from the file.
 */

import { STORES } from './storage-adapter.js';

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
 * @returns {number} how many records were written.
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

  let written = 0;
  for (const name of Object.values(STORES)) {
    const records = backup.stores?.[name] ?? [];
    if (mode === 'replace') await storage.clear(name);
    for (const record of records) {
      if (record && record.id !== undefined) {
        await storage.put(name, record);
        written += 1;
      }
    }
  }
  return written;
}
