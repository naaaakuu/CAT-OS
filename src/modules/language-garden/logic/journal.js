/**
 * journal.js — the Root Grove's small slice of LANGUAGE_GARDEN_BIBLE
 * §11's Journal. Pure logic, no DOM. Deliberately narrow for this first
 * vertical slice: "what you can read now" (every mature family framed
 * as a capability) and "wild sightings" (every Reach word actually
 * constructed). The Field Guide, decoding-speed trend, and monthly line
 * all need either wildlife content or months of history this slice
 * doesn't have yet — cut honestly rather than shipped empty.
 */

import { computePlantState } from '../../../core/engine/garden-session.js';
import { sessionsForFamily } from './store.js';

/** Families settled enough to read as a capability: Bible §16.6 — "In
 *  leaf" or better, a plant that has survived at least one real spaced
 *  retrieval, not merely been introduced. */
const MATURE_STAGES = new Set(['in_leaf', 'mature', 'ancient']);

/**
 * @returns {Array<{familyId, label, originLanguage, coreMeaning, words: string[]}>}
 *          newest-matured first
 */
export function whatYouCanReadNow(families, allSessions, now = Date.now()) {
  return families
    .map((family) => {
      const history = sessionsForFamily(allSessions, family.meta.id);
      const state = computePlantState(history, now);
      return { family, state };
    })
    .filter(({ state }) => MATURE_STAGES.has(state.stage))
    .sort((a, b) => (b.state.plantedAt ?? '').localeCompare(a.state.plantedAt ?? ''))
    .map(({ family }) => ({
      familyId: family.meta.id,
      label: family.root.label,
      originLanguage: family.root.origin_language,
      coreMeaning: family.root.core_meaning,
      words: family.members.filter((m) => !m.held_out).map((m) => m.word),
    }));
}

/**
 * Every Reach word actually constructed, correct or eventually correct
 * (the peak cannot be failed — Bible §5.5), newest first. One line
 * each: word, family, date.
 */
export function wildSightings(families, allSessions) {
  const byId = new Map(families.map((f) => [f.meta.id, f]));
  const sightings = [];
  for (const session of allSessions) {
    if (!session.reach) continue;
    const family = byId.get(session.family_id);
    if (!family) continue;
    const member = family.members.find((m) => m.vocab_id === session.reach.vocab_id);
    if (!member) continue;
    sightings.push({
      word: member.word,
      familyLabel: family.root.label,
      familyId: family.meta.id,
      date: session.finished_at,
    });
  }
  return sightings.sort((a, b) => b.date.localeCompare(a.date));
}
