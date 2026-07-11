/**
 * store.js — the OOO module's persistence helpers. All reads and writes
 * go through the StorageAdapter passed in (Rule 6); no IndexedDB, no
 * DOM. OOO sessions live in the SAME sessions/attempts stores RC, PJ
 * and PS use (records carry module: 'ooo'), so streaks, XP,
 * achievements and backups cover exclusion practice with zero storage
 * changes.
 */

import { STORES } from '../../../core/storage/storage-adapter.js';

/** Persist a finished OOO session and its per-item attempts. */
export async function saveOOOResults(storage, { session, attempts }) {
  await storage.put(STORES.SESSIONS, session);
  for (const attempt of attempts) {
    await storage.put(STORES.ATTEMPTS, attempt);
  }
}

/** All OOO sessions, newest first. */
export async function listOOOSessions(storage) {
  const sessions = await storage.getAll(STORES.SESSIONS);
  return sessions
    .filter((s) => s.module === 'ooo')
    .sort((a, b) => b.finished_at.localeCompare(a.finished_at));
}

/**
 * item_id -> the latest answer record for that item (with session
 * context), for browser badges and the learn screen. Newest wins.
 */
export async function latestByItem(storage) {
  const map = new Map();
  for (const s of await listOOOSessions(storage)) {
    for (const a of s.answers ?? []) {
      const id = a.item_id ?? a.question_id;
      if (!map.has(id)) map.set(id, { ...a, session_id: s.id, finished_at: s.finished_at });
    }
  }
  return map;
}

/* ---------------- First-time introduction ----------------
   One settings flag: the introduction shows once, then lives one tap
   away ("How this journey works") forever. Settings can reset it. */

export async function hasSeenOOOIntro(storage) {
  const record = await storage.get(STORES.SETTINGS, 'ooo:intro-seen');
  return record?.value === true;
}

export function markOOOIntroSeen(storage) {
  return storage.put(STORES.SETTINGS, { id: 'ooo:intro-seen', value: true });
}

/** Settings: show the introduction again on the next visit to /ooo. */
export function resetOOOIntro(storage) {
  return storage.put(STORES.SETTINGS, { id: 'ooo:intro-seen', value: false });
}
