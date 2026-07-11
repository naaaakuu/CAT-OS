/**
 * think.js — the Think button's question picker. Pure logic, no DOM.
 *
 * The Think coach NEVER reveals hints or answers. It asks the coaching
 * questions strong structural readers ask themselves (the owner's
 * brief and ODD_MAN_OUT_BIBLE §7 remediation: build the four, test the
 * ties, run the removal test). Every question lives in ooo-voice.js so
 * the register stays reviewable in one place; this file only selects.
 *
 * Selection is deterministic per item (same item, same questions), so
 * revisiting an item feels like the same mentor, not a slot machine:
 * the item's mission contributes its sharper questions first, then
 * core questions fill the set, chosen by a stable hash.
 */

import { OOO_THINK } from '../../../core/mentor/ooo-voice.js';

const QUESTIONS_PER_SHEET = 4;

/** Tiny deterministic hash (same shape as voice.pick's). */
function hash(seed) {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * The Think sheet's questions for one item.
 * @param {object} item a loaded OOO content item
 * @returns {string[]} exactly QUESTIONS_PER_SHEET coaching questions
 */
export function thinkQuestions(item) {
  const mission = item.meta.mission;
  const missionQs = OOO_THINK.byMission[mission] ?? [];
  const picked = [...missionQs];

  const start = hash(item.meta.id) % OOO_THINK.core.length;
  for (let i = 0; picked.length < QUESTIONS_PER_SHEET && i < OOO_THINK.core.length; i += 1) {
    const q = OOO_THINK.core[(start + i) % OOO_THINK.core.length];
    if (!picked.includes(q)) picked.push(q);
  }
  return picked.slice(0, QUESTIONS_PER_SHEET);
}
