/**
 * store.js — the Language Garden's persistence helpers. All reads and
 * writes go through the StorageAdapter passed in (Rule 6); no
 * IndexedDB, no DOM.
 *
 * Garden sessions do NOT live in STORES.SESSIONS. This is deliberate,
 * not an oversight: LANGUAGE_GARDEN_BIBLE §13 forbids "a second reward
 * economy stacked on the garden," and STORES.SESSIONS feeds the
 * app-wide XP/streak/achievement system directly (core/engagement/
 * stats.js reads every session unconditionally). Routing garden
 * activity there would silently make growing a tree earn XP and streak
 * credit — exactly the corrupting incentive the Bible's "Competence and
 * autonomy" section (§3) warns against. Instead, garden sessions are
 * `kind: 'garden-session'` records in STORES.LEARNING, the store
 * already reserved for "learning artifacts the user authors or earns"
 * (storage-adapter.js) — a new `kind` value is exactly the additive,
 * zero-migration pattern that store already uses for lessons and
 * reflections. They are still fully covered by Backup & Restore
 * (backup.js already walks every store) and by the Journal, just never
 * by the shell's XP bar, streaks, or achievements.
 */

import { STORES } from '../../../core/storage/storage-adapter.js';

/** Persist one finished garden session (a Grow or a Revisit). */
export function saveGardenSession(storage, record) {
  return storage.put(STORES.LEARNING, record);
}

/** Every garden-session record, any family, oldest first (the shape
 *  computePlantState() and the Journal both want). */
export async function listGardenSessions(storage) {
  const all = await storage.getAll(STORES.LEARNING);
  return all
    .filter((r) => r.kind === 'garden-session')
    .sort((a, b) => a.finished_at.localeCompare(b.finished_at));
}

/** Garden sessions for one family only, oldest first. */
export function sessionsForFamily(sessions, familyId) {
  return sessions.filter((s) => s.family_id === familyId);
}

/* ---------------- The Gate's traffic (§19.2, Roadmap 3.5) ----------------
   Seeds carried back from real reading, and sightings of grown words met
   out in real passages. The records themselves are written by
   core/engine/garden-gate.js (the RC module calls it — module islands
   never import each other); the garden only ever reads them. */

export { listGardenSeeds, listGardenSightings } from '../../../core/engine/garden-gate.js';

/* ---------------- First-time introduction ----------------
   One settings flag, same pattern as every other module: the
   introduction shows once, then lives one tap away forever. */

export async function hasSeenGardenIntro(storage) {
  const record = await storage.get(STORES.SETTINGS, 'lg:intro-seen');
  return record?.value === true;
}

export function markGardenIntroSeen(storage) {
  return storage.put(STORES.SETTINGS, { id: 'lg:intro-seen', value: true });
}

export function resetGardenIntro(storage) {
  return storage.put(STORES.SETTINGS, { id: 'lg:intro-seen', value: false });
}

/* ---------------- Growth animation: first-view is sacred ----------------
   The growth moment plays in full the first time, always; from the second
   viewing onward it is skippable by tap (Bible §11.2). One settings flag,
   set the first time a plant grows. */

export async function hasSeenGardenGrowth(storage) {
  try {
    const record = await storage.get(STORES.SETTINGS, 'lg:growth-seen');
    return record?.value === true;
  } catch {
    return false;
  }
}

export function markGardenGrowthSeen(storage) {
  return storage.put(STORES.SETTINGS, { id: 'lg:growth-seen', value: true });
}

/* ---------------- Ambience preference ---------------- */

export async function gardenAmbienceEnabled(storage) {
  const record = await storage.get(STORES.SETTINGS, 'lg:ambience');
  return record?.value === true; // default OFF, matching the app's sound-off default
}

export function setGardenAmbience(storage, enabled) {
  return storage.put(STORES.SETTINGS, { id: 'lg:ambience', value: !!enabled });
}
