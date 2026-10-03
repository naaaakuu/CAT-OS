/**
 * store.js — the PJ module's persistence helpers. All reads and writes
 * go through the StorageAdapter passed in (Rule 6); no IndexedDB, no
 * DOM. PJ sessions live in the SAME sessions/attempts stores RC uses
 * (records carry module: 'pj'), so streaks, XP, achievements and
 * backups cover jumble practice with zero storage changes.
 */

import { STORES } from '../../../core/storage/storage-adapter.js';

/** Persist a finished PJ session and its per-item attempts. */
export async function savePJResults(storage, { session, attempts }) {
  await storage.put(STORES.SESSIONS, session);
  for (const attempt of attempts) {
    await storage.put(STORES.ATTEMPTS, attempt);
  }
}

/** All PJ sessions, newest first. */
export async function listPJSessions(storage) {
  const sessions = await storage.getAll(STORES.SESSIONS);
  return sessions
    .filter((s) => s.module === 'pj')
    .sort((a, b) => b.finished_at.localeCompare(a.finished_at));
}

/**
 * item_id -> the latest answer record for that jumble (with session
 * context), for browser badges and the learn screen. Newest wins.
 */
export async function latestByItem(storage) {
  const map = new Map();
  for (const s of await listPJSessions(storage)) {
    for (const a of s.answers ?? []) {
      const id = a.item_id ?? a.question_id;
      if (!map.has(id)) map.set(id, { ...a, session_id: s.id, finished_at: s.finished_at });
    }
  }
  return map;
}

/* ---------------- The introduction ----------------
   Since 3.2 nothing gates on this flag: /pj always opens the journey and
   the introduction is the full guide behind the ⓘ. The guide still marks
   itself read on the way out, which is all that is left of it. */

export function markPJIntroSeen(storage) {
  return storage.put(STORES.SETTINGS, { id: 'pj:intro-seen', value: true });
}
