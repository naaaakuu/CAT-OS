/**
 * records.js — the mentor's persistence, all of it.
 *
 * Lessons and recall state live in the `learning` object store
 * (IndexedDB v2, shipped 0.6.0) alongside reflections, through the
 * StorageAdapter only (Rule 6). Shapes are minimal and stable so they
 * never need migration; everything else the mentor knows is DERIVED
 * (dna.js) from sessions and content, never stored.
 */

import { STORES } from '../storage/storage-adapter.js';
import { dayKey } from '../engagement/streaks.js';

/** Persist the one lesson chosen for a session (idempotent by id). */
export function saveLesson(storage, record) {
  return storage.put(STORES.LEARNING, record);
}

/** All lesson records, newest first. */
export async function listLessons(storage) {
  const all = await storage.getAll(STORES.LEARNING);
  return all
    .filter((r) => r.kind === 'lesson')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** The lesson taught for one session, or undefined. */
export function lessonForSession(storage, sessionId) {
  return storage.get(STORES.LEARNING, `lesson:${sessionId}`);
}

/** Mark a lesson recalled now; returns the updated record. */
export async function markRecalled(storage, lesson, now = new Date()) {
  const updated = {
    ...lesson,
    recalled_at: now.toISOString(),
    recalled_day: dayKey(now),
    recall_count: (lesson.recall_count ?? 0) + 1,
  };
  await storage.put(STORES.LEARNING, updated);
  return updated;
}

/** All reflections, newest first (the reader's own words, for Growth). */
export async function listReflections(storage) {
  const all = await storage.getAll(STORES.LEARNING);
  return all
    .filter((r) => r.kind === 'reflection')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
