/**
 * draft.js — a run in progress, written down.
 *
 * A learning session persisted NOTHING until the very last click. Seven
 * questions answered, the eighth locked in, and a refresh — or a phone that
 * backgrounded the tab long enough for the browser to discard it, or a
 * deploy, or a stray swipe — threw all of it away with no word at all. The
 * learner came back to a passage that said "not read yet", having read it.
 *
 * So each answer now writes a draft, and finishing deletes it. Coming back
 * to the same passage offers to carry on. A draft is not a record: nothing
 * derives from it, the village never sees it, and it holds only what is
 * needed to put the learner back where they were.
 *
 * Kept in the settings store because that is the key/value one, and because
 * a draft must never be mistaken for history — the sessions store is what
 * the learner has actually done.
 */

import { STORES } from '../storage/storage-adapter.js';

const KEY = (kind, id) => `draft:${kind}:${id}`;
/* A day. Long enough to come back after a night's sleep; short enough that
   a draft never quietly contradicts a session finished since. */
const KEEP_MS = 24 * 60 * 60 * 1000;

/**
 * Write down where the learner is. Never throws — a failure to save a draft
 * must not interrupt the run it is trying to protect.
 */
export async function saveDraft(storage, kind, id, data) {
  try {
    await storage.put(STORES.SETTINGS, { id: KEY(kind, id), value: { ...data, at: new Date().toISOString() } });
  } catch { /* the run matters more than the safety net */ }
}

/** The draft for this passage or round, if there is a fresh one. */
export async function loadDraft(storage, kind, id) {
  try {
    const row = await storage.get(STORES.SETTINGS, KEY(kind, id));
    const d = row?.value;
    if (!d?.at) return null;
    if (Date.now() - Date.parse(d.at) > KEEP_MS) { await clearDraft(storage, kind, id); return null; }
    return d;
  } catch { return null; }
}

/** Finished, or abandoned on purpose. */
export async function clearDraft(storage, kind, id) {
  try { await storage.delete(STORES.SETTINGS, KEY(kind, id)); } catch { /* nothing to lose */ }
}
