/**
 * garden-gate.js — the Gate's two-way traffic between the Language
 * Garden and the rest of CAT OS (LANGUAGE_GARDEN_BIBLE §19.2, §16.9,
 * Roadmap item 3.5). This lives in core/ because module islands never
 * import each other (Rule 5): reading-comprehension calls the outward
 * half, language-garden reads the results, and neither knows the other
 * exists.
 *
 * The loop, and ONLY the loop (§19.2 — "that loop, and only that loop,
 * is the connection"):
 *
 *  INWARD — seeds found in the wild. A word met in a real RC passage
 *  that matches a garden family not yet planted can be carried back and
 *  planted. It arrives as a SEED with a note about where it came from.
 *  This is also the moment the Seed stage (architected in Phase 1,
 *  deliberately unreachable until a real "plant without growing" action
 *  existed) becomes real: the PLANT_SEED extension point, landed.
 *
 *  OUTWARD — sightings. When a word the learner grew in the Garden
 *  appears in a real passage and the reading is finished without
 *  stalling, the Journal records a sighting (§16.6). "Without stalling"
 *  is read honestly as: the session was completed — the passage was
 *  read to its end and its questions faced. No dwell-time guessing.
 *
 * Nothing here rewards anything. No XP, no toast, no sound. A sighting
 * is written silently and discovered later, sitting in the Journal —
 * §1.3's promise being kept in front of the learner's own eyes.
 *
 * Records live in STORES.LEARNING beside garden-session records (see
 * language-garden/logic/store.js for why never STORES.SESSIONS), with
 * their own `kind` values so no session-derived math ever counts them:
 * a seed is not effort and a sighting is not a retrieval.
 */

import { STORES } from '../storage/storage-adapter.js';
import { listLGItems, loadLGItems } from '../content-loader/loader.js';
import { computePlantState } from './garden-session.js';

/* ---------------- Matching (pure) ---------------- */

const normalize = (w) => String(w).trim().toLowerCase();

/** Word-boundary presence test, case-insensitive, tolerant of the plain
 *  English inflections of the SAME word ("preceded" is precede, met in
 *  the wild) but never of a different derived word — "secession" is not
 *  a sighting of secede; a different member covers it or nothing does. */
export function textContainsWord(text, word) {
  const w = normalize(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stem = w.endsWith('e') ? w.slice(0, -1) : w;
  // word | words | worded | wording — plus drop-final-e forms (receding).
  return new RegExp(`\\b(${w}|${w}s|${w}d|${stem}es|${stem}ed|${stem}ing)\\b`, 'i').test(text);
}

/** Split loaded garden families by whether they are planted, using the
 *  same state derivation every screen uses. */
function familiesByState(families, gardenRecords, now = Date.now()) {
  const planted = [];
  const unplanted = [];
  for (const family of families) {
    const records = gardenRecords.filter((r) => r.family_id === family.meta.id);
    const state = computePlantState(records, now);
    (state.stage === 'open_ground' ? unplanted : planted).push({ family, state });
  }
  return { planted, unplanted };
}

/**
 * OUTWARD, pure half: which grown garden words appear in this passage.
 * A word counts as grown once its family is planted and the word itself
 * has been taught — held-out Reach words only count after they were
 * actually constructed in a Reach (until then the learner never met
 * them in the Garden, so meeting one in the wild is not a sighting).
 * @returns {Array<{word: string, familyId: string, familyLabel: string}>}
 */
export function findSightings(passage, families, gardenRecords, now = Date.now()) {
  const text = (passage.passage?.paragraphs ?? []).map((p) => p.text).join('\n');
  if (!text) return [];
  const { planted } = familiesByState(families, gardenRecords, now);
  const sightings = [];
  for (const { family } of planted) {
    // A seed is planted intent, not growth — only sprout and beyond count.
    const reached = new Set(
      gardenRecords
        .filter((r) => r.family_id === family.meta.id && r.reach?.is_correct)
        .map((r) => r.reach.vocab_id),
    );
    for (const member of family.members) {
      if (member.held_out && !reached.has(member.vocab_id)) continue;
      if (textContainsWord(text, member.word)) {
        sightings.push({ word: member.word, familyId: family.meta.id, familyLabel: family.root.label });
      }
    }
  }
  return sightings;
}

/**
 * INWARD, pure half: which of this passage's own vocabulary words match
 * a garden family that is still open ground (never planted, never
 * seeded) — the words that can be carried back through the Gate.
 * @param {Array<{word: string}>} vocabulary  the passage's vocab list
 * @returns {Array<{word: string, familyId: string, familyLabel: string}>}
 */
export function findSeedable(vocabulary, families, gardenRecords, now = Date.now()) {
  const { unplanted } = familiesByState(families, gardenRecords, now);
  // Only truly untouched ground: an existing seed already carries a note.
  const bare = unplanted.filter(({ state }) => state.stage === 'open_ground');
  const seedable = [];
  for (const v of vocabulary ?? []) {
    for (const { family } of bare) {
      if (family.members.some((m) => normalize(m.word) === normalize(v.word))) {
        seedable.push({ word: v.word, familyId: family.meta.id, familyLabel: family.root.label });
      }
    }
  }
  return seedable;
}

/* ---------------- Storage halves ---------------- */

/** Every garden record that shapes plant state or the Journal:
 *  sessions, seeds, and sightings, one read. */
async function allGardenRecords(storage) {
  const all = await storage.getAll(STORES.LEARNING);
  return all.filter((r) => r.kind === 'garden-session' || r.kind === 'garden-seed' || r.kind === 'garden-sighting');
}

export async function listGardenSeeds(storage) {
  return (await allGardenRecords(storage)).filter((r) => r.kind === 'garden-seed');
}

export async function listGardenSightings(storage) {
  return (await allGardenRecords(storage))
    .filter((r) => r.kind === 'garden-sighting')
    .sort((a, b) => b.sighted_at.localeCompare(a.sighted_at));
}

/**
 * OUTWARD: called by the RC module once a session is genuinely finished.
 * Loads the garden quietly, records at most one sighting per word per
 * passage, ever (rereading a passage does not restate the obvious), and
 * never throws into the caller's flow. No reward of any kind attaches.
 */
export async function recordPassageSightings(storage, passage) {
  const registry = await listLGItems();
  if (!registry.length) return [];
  const loaded = await loadLGItems(registry.map((i) => i.id));
  const families = registry.map((i) => loaded.get(i.id)).filter(Boolean);
  const records = await allGardenRecords(storage);

  const found = findSightings(passage, families, records);
  const written = [];
  for (const s of found) {
    const id = `garden-sighting:${passage.meta.id}:${normalize(s.word)}`;
    if (records.some((r) => r.id === id)) continue; // already sighted here
    const record = {
      id,
      kind: 'garden-sighting',
      module: 'lg',
      family_id: s.familyId,
      word: s.word,
      source: { module: 'rc', item_id: passage.meta.id, title: passage.passage.title },
      sighted_at: new Date().toISOString(),
    };
    await storage.put(STORES.LEARNING, record);
    written.push(record);
  }
  return written;
}

/**
 * INWARD, storage half: which of this passage's vocabulary words can be
 * carried back right now. Loads the garden quietly; empty when the
 * garden has no content or nothing matches.
 */
export async function findSeedableForPassage(storage, vocabulary) {
  if (!vocabulary?.length) return [];
  const registry = await listLGItems();
  if (!registry.length) return [];
  const loaded = await loadLGItems(registry.map((i) => i.id));
  const families = registry.map((i) => loaded.get(i.id)).filter(Boolean);
  const records = await allGardenRecords(storage);
  return findSeedable(vocabulary, families, records);
}

/**
 * INWARD: plant one family as a seed, with the note about where it came
 * from (§19.2 — "it arrives as a seed with a note"). One seed per
 * family; planting twice is idempotent and keeps the first note.
 */
export async function plantSeed(storage, { familyId, word, source }) {
  const id = `garden-seed:${familyId}`;
  const existing = await storage.get(STORES.LEARNING, id);
  if (existing) return existing;
  const record = {
    id,
    kind: 'garden-seed',
    module: 'lg',
    family_id: familyId,
    word,
    source, // { module, item_id, title } — the note the seed arrives with
    planted_at: new Date().toISOString(),
  };
  await storage.put(STORES.LEARNING, record);
  return record;
}
