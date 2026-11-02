/** Mochi's home is a view of learning records, never a second save game.
 * A correct summary stays put away even after a less successful retry.
 * Zones are data so new furniture and mess can be added independently. */
import { PS_TIERS, psJourneyOrder } from './tiers.js';

export const THOUGHT_ZONES = Object.freeze([
  { tier: 'foundation', name: 'The welcome basket', x: 177, y: 544, labelY: 607, color: '#c79160', keepsake: 'A basket of clear thoughts' },
  { tier: 'easy', name: 'The writing desk', x: 366, y: 351, labelY: 418, color: '#8f9c72', keepsake: 'A desk ready for daydreams' },
  { tier: 'medium', name: 'The little side table', x: 658, y: 371, labelY: 439, color: '#c58d92', keepsake: 'A place for a warm cup' },
  { tier: 'advanced', name: 'The reading chair', x: 904, y: 412, labelY: 483, color: '#b58a6b', keepsake: 'A cosy reading nook' },
  { tier: 'cat', name: 'The sunlit rug', x: 819, y: 560, labelY: 622, color: '#97a883', keepsake: 'A sunny patch for a nap' },
  { tier: 'cat-plus', name: 'The daydream corner', x: 402, y: 587, labelY: 655, color: '#aca1bd', keepsake: 'Room for new daydreams' },
  { tier: 'ninety-nine', name: 'The keepsake shelf', x: 154, y: 310, labelY: 375, color: '#85a4a0', keepsake: 'A shelf of tiny treasures' },
  { tier: 'premium', name: 'The windowsill', x: 949, y: 265, labelY: 330, color: '#d0ad69', keepsake: 'A window full of light' },
]);

/** Unknown/deleted items, skips, wrong answers and other modules cannot
 * inflate the room. Only a strict correct answer for an extant PS counts. */
export function thoughtRoom(items = [], sessions = []) {
  const ordered = psJourneyOrder(items);
  const known = new Set(ordered.map((i) => i.id));
  const solved = new Set();
  const tried = new Set();
  for (const s of sessions) {
    if (s?.module !== 'ps' || !Array.isArray(s.answers)) continue;
    for (const a of s.answers) {
      const id = a?.item_id ?? a?.question_id;
      if (!known.has(id)) continue;
      if (a.is_correct === true) solved.add(id);
      if (typeof a.is_correct === 'boolean') tried.add(id);
    }
  }
  const zones = THOUGHT_ZONES.map((z) => {
    const rows = ordered.filter((i) => i.tier === z.tier);
    const done = rows.filter((i) => solved.has(i.id)).length;
    return { ...z, label: PS_TIERS.find((t) => t.id === z.tier).label, items: rows, done,
      total: rows.length, clean: rows.length ? done / rows.length : 0,
      complete: rows.length > 0 && done === rows.length };
  });
  const total = ordered.length;
  const clean = total ? solved.size / total : 0;
  return { items: ordered, solved, tried, zones, total, done: solved.size, clean,
    // Reserve 100% for the final thought, even with a very large library.
    percent: clean === 1 ? 100 : Math.floor(clean * 100),
    mood: clean === 1 ? 'Peaceful at last' : clean >= .75 ? 'Almost a little sanctuary' : clean >= .4 ? 'Room to breathe' : clean > 0 ? 'A little clearer already' : 'A lovely little mess' };
}
