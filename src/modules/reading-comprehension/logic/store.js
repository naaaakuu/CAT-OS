/**
 * store.js — the RC module's persistence helpers. All reads/writes go
 * through the StorageAdapter passed in (Rule 6); this file contains
 * no IndexedDB and no DOM.
 */

import { STORES } from '../../../core/storage/storage-adapter.js';

/** Persist a finished session and its per-question attempts. */
export async function saveResults(storage, { session, attempts }) {
  await storage.put(STORES.SESSIONS, session);
  for (const attempt of attempts) {
    await storage.put(STORES.ATTEMPTS, attempt);
  }
}

/** All sessions, newest first. */
export async function listSessions(storage) {
  const sessions = await storage.getAll(STORES.SESSIONS);
  return sessions.sort((a, b) => b.finished_at.localeCompare(a.finished_at));
}

/** The most recent session for one passage, or null. */
export async function latestSessionFor(storage, passageId) {
  const sessions = await listSessions(storage);
  return sessions.find((s) => s.passage_id === passageId) ?? null;
}

/** passage_id -> latest session (for browser badges). */
export async function latestByPassage(storage) {
  const map = new Map();
  for (const s of await listSessions(storage)) {
    if (!map.has(s.passage_id)) map.set(s.passage_id, s);
  }
  return map;
}

/* ---------------- Reflections (0.6.0) ----------------
   One optional, user-authored line per passage, kept in the
   learning store. Minimal record shape so it never needs
   migration: {id, kind, passage_id, prompt, text, updated_at}. */

export function getReflection(storage, passageId) {
  return storage.get(STORES.LEARNING, `reflection:${passageId}`);
}

export async function saveReflection(storage, passageId, { prompt, text }) {
  const record = {
    id: `reflection:${passageId}`,
    kind: 'reflection',
    passage_id: passageId,
    prompt,
    text,
    updated_at: new Date().toISOString(),
  };
  await storage.put(STORES.LEARNING, record);
  return record;
}
