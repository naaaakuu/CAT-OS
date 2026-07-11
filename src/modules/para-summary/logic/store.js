/**
 * store.js — the PS module's persistence helpers. All reads and writes
 * go through the StorageAdapter passed in (Rule 6); no IndexedDB, no
 * DOM. PS sessions live in the SAME sessions/attempts stores RC and PJ
 * use (records carry module: 'ps'), so streaks, XP, achievements and
 * backups cover summary practice with zero storage changes.
 *
 * The learner's own written summaries (the Summary Builder) persist to
 * the learning store as kind: 'summary' records, one per item (latest
 * wins), covered by Backup & Restore automatically.
 */

import { STORES } from '../../../core/storage/storage-adapter.js';

/** Persist a finished PS session and its per-item attempts. */
export async function savePSResults(storage, { session, attempts }) {
  await storage.put(STORES.SESSIONS, session);
  for (const attempt of attempts) {
    await storage.put(STORES.ATTEMPTS, attempt);
  }
}

/** All PS sessions, newest first. */
export async function listPSSessions(storage) {
  const sessions = await storage.getAll(STORES.SESSIONS);
  return sessions
    .filter((s) => s.module === 'ps')
    .sort((a, b) => b.finished_at.localeCompare(a.finished_at));
}

/**
 * item_id -> the latest answer record for that item (with session
 * context), for browser badges and the learn screen. Newest wins.
 */
export async function latestByItem(storage) {
  const map = new Map();
  for (const s of await listPSSessions(storage)) {
    for (const a of s.answers ?? []) {
      const id = a.item_id ?? a.question_id;
      if (!map.has(id)) map.set(id, { ...a, session_id: s.id, finished_at: s.finished_at });
    }
  }
  return map;
}

/* ---------------- The learner's own summaries ----------------
   One record per item, updated in place. The Learning Page shows the
   learner's sentence beside the ideal one, which is where the Summary
   Builder's teaching compounds over time. */

export function saveOwnSummary(storage, itemId, text, now = new Date()) {
  return storage.put(STORES.LEARNING, {
    id: `summary:${itemId}`,
    kind: 'summary',
    module: 'ps',
    item_id: itemId,
    text,
    updated_at: now.toISOString(),
  });
}

export async function ownSummaryFor(storage, itemId) {
  const record = await storage.get(STORES.LEARNING, `summary:${itemId}`);
  return record?.kind === 'summary' ? record : null;
}

/* ---------------- First-time introduction ----------------
   One settings flag: the introduction shows once, then lives one tap
   away ("How this journey works") forever. Settings can reset it. */

export async function hasSeenPSIntro(storage) {
  const record = await storage.get(STORES.SETTINGS, 'ps:intro-seen');
  return record?.value === true;
}

export function markPSIntroSeen(storage) {
  return storage.put(STORES.SETTINGS, { id: 'ps:intro-seen', value: true });
}

/** Settings: show the introduction again on the next visit to /ps. */
export function resetPSIntro(storage) {
  return storage.put(STORES.SETTINGS, { id: 'ps:intro-seen', value: false });
}
