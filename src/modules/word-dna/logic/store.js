/**
 * store.js — the Word DNA module's persistence helpers. All reads and
 * writes go through the StorageAdapter passed in (Rule 6); no
 * IndexedDB, no DOM. Word DNA sessions live in the SAME
 * sessions/attempts stores RC/PJ/PS/OOO use (records carry
 * module: 'wd'), so streaks, XP, achievements and backups cover it
 * with zero storage changes.
 */

import { STORES } from '../../../core/storage/storage-adapter.js';

/** Persist a finished Word DNA session and its per-item attempts. */
export async function saveWDResults(storage, { session, attempts }) {
  await storage.put(STORES.SESSIONS, session);
  for (const attempt of attempts) {
    await storage.put(STORES.ATTEMPTS, attempt);
  }
}

/** All Word DNA sessions, newest first. */
export async function listWDSessions(storage) {
  const sessions = await storage.getAll(STORES.SESSIONS);
  return sessions
    .filter((s) => s.module === 'wd')
    .sort((a, b) => b.finished_at.localeCompare(a.finished_at));
}

/**
 * item_id -> the latest answer record for that unit (with session
 * context), for Tree badges and the learn screen. Newest wins.
 */
export async function latestByItem(storage) {
  const map = new Map();
  for (const s of await listWDSessions(storage)) {
    for (const a of s.answers ?? []) {
      const id = a.item_id ?? a.question_id;
      if (!map.has(id)) map.set(id, { ...a, session_id: s.id, finished_at: s.finished_at });
    }
  }
  return map;
}

/* ---------------- The introduction ----------------
   Since 3.2 nothing gates on this flag: /wd always opens the Tree and the
   introduction is the full guide behind the ⓘ. The guide still marks
   itself read on the way out, which is all that is left of it. */

export function markWDIntroSeen(storage) {
  return storage.put(STORES.SETTINGS, { id: 'wd:intro-seen', value: true });
}
