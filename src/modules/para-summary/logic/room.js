/** Little worlds grow from unique correct summaries in learning records.
 * Visiting, petting and rain are play, never a second progress economy. */
import { PS_TIERS, psJourneyOrder } from './tiers.js';

export const THOUGHT_ZONES = Object.freeze([
  { tier: 'foundation', name: 'Dewdrop Meadow', color: '#83a77a', sky: '#e3ead5', flower: '#f2c6a5', kind: 'meadow', keepsake: 'A sleepy snail moves into the meadow' },
  { tier: 'easy', name: 'Mushroom Hollow', color: '#b48079', sky: '#f0ddd6', flower: '#e9aaa1', kind: 'mushroom', keepsake: 'A ladybird finds a mushroom to call home' },
  { tier: 'medium', name: 'Lotus Lagoon', color: '#739e99', sky: '#d8e9e1', flower: '#e7b6cc', kind: 'pond', keepsake: 'A little frog settles by the lotus pond' },
  { tier: 'advanced', name: 'Amber Orchard', color: '#b59559', sky: '#f4e4bd', flower: '#edbd68', kind: 'orchard', keepsake: 'A honeybee discovers the orchard' },
  { tier: 'cat', name: 'Cloud Garden', color: '#8aa5bb', sky: '#e0e9ed', flower: '#c5c4ea', kind: 'cloud', keepsake: 'A tiny cloud brings its own rainbow' },
  { tier: 'cat-plus', name: 'Moonflower Grove', color: '#a295b5', sky: '#e5dfee', flower: '#e5cfee', kind: 'moon', keepsake: 'A moon moth unfolds its silver wings' },
  { tier: 'ninety-nine', name: 'Starfall Island', color: '#8b98b7', sky: '#dbe0f0', flower: '#f5d998', kind: 'star', keepsake: 'A shooting star comes to rest on the island' },
  { tier: 'premium', name: 'Sunrise Sanctuary', color: '#c49a77', sky: '#f3dfc7', flower: '#f1b398', kind: 'sunrise', keepsake: 'A golden butterfly makes itself at home' },
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
    mood: clean === 1 ? 'Eight worlds in full bloom' : clean >= .75 ? 'So much life in little places' : clean >= .4 ? 'Our little worlds are growing' : clean > 0 ? 'Something lovely is growing' : 'Big ideas. Little worlds.' };
}
