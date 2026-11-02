/** Progress regressions for Mochi's room. No browser or content bank needed. */
import assert from 'node:assert/strict';
import { thoughtRoom, THOUGHT_ZONES } from '../src/modules/para-summary/logic/room.js';
import { thoughtRoomArt, paperPose } from '../src/world/screens/thought-room-art.js';
import { pathToFileURL } from 'node:url';

export function checkThoughtRoom() {
  let cases = 0;
  const check = (fn) => { fn(); cases++; };
  const items = THOUGHT_ZONES.flatMap((z, i) => [0, 1, 2].map((n) => ({ id: `ps-${String(i * 3 + n + 1).padStart(4, '0')}`, tier: z.tier })));
  const session = (answers, module = 'ps') => ({ module, answers });
  const right = (it) => ({ item_id: it.id, is_correct: true });
  const fresh = thoughtRoom(items, []);
  check(() => { assert.equal(fresh.done, 0); assert.equal(fresh.total, 24); assert.equal(fresh.percent, 0); assert.equal(fresh.zones.length, 8); });
  check(() => { const m = thoughtRoom(items, [session([right(items[0]), right(items[0])])]); assert.equal(m.done, 1); assert.equal(m.zones[0].done, 1); assert.equal(m.percent, 4); });
  check(() => { const m = thoughtRoom(items, [session([right(items[0])]), session([{ item_id: items[0].id, is_correct: false }])]); assert.equal(m.done, 1); assert.equal(m.tried.size, 1); });
  check(() => { const m = thoughtRoom(items, [session([right(items[0])], 'pj'), session([{ item_id: 'ps-9999', is_correct: true }, { item_id: items[1].id, is_correct: null }, { item_id: items[2].id, is_correct: 'true' }])]); assert.equal(m.done, 0); assert.equal(m.tried.size, 0); });
  check(() => { const m = thoughtRoom(items, [session([{ question_id: items[0].id, is_correct: true }])]); assert.equal(m.done, 1); });
  check(() => { const m = thoughtRoom(items, [session(items.slice(0, 3).map(right))]); assert.equal(m.zones[0].complete, true); assert.equal(m.zones.filter((z) => z.complete).length, 1); assert.equal(m.zones[1].clean, 0); });
  check(() => { const m = thoughtRoom(items, [session(items.map(right))]); assert.equal(m.percent, 100); assert.equal(m.mood, 'Peaceful at last'); assert(m.zones.every((z) => z.complete)); });
  check(() => { const m = thoughtRoom(); assert.equal(m.clean, 0); assert.equal(m.percent, 0); assert(m.zones.every((z) => !z.complete)); });
  check(() => { const m = thoughtRoom(items, [null, {}, session(null), session({ bad: true }), session([null, {}, { item_id: items[0].id }])]); assert.equal(m.done, 0); });
  check(() => { const m = thoughtRoom(items, [session(items.map(right))]); const extended = thoughtRoom([...items, { id: 'ps-0100', tier: 'foundation' }], [session(items.map(right))]); assert.equal(m.done, extended.done); assert(extended.percent < 100); });
  check(() => { const many = Array.from({ length: 1001 }, (_, i) => ({ id: `p-${i}`, tier: 'foundation' })); const m = thoughtRoom(many, [session(many.slice(1).map(right))]); assert.equal(m.percent, 99); });
  check(() => { const art = thoughtRoomArt(fresh); assert.equal((art.match(/data-paper=/g) ?? []).length, items.length); assert.equal((art.match(/data-art-zone=/g) ?? []).length, 8); assert.equal(new Set([...art.matchAll(/data-paper="([^"]+)"/g)].map((m) => m[1])).size, items.length); });
  check(() => { const z = fresh.zones[0]; assert.equal(paperPose(z, 2, false), paperPose(z, 2, false)); assert.notEqual(paperPose(z, 2, false), paperPose(z, 2, true)); assert(!paperPose(z, 2, true).includes('NaN')); });
  return { cases };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { cases } = checkThoughtRoom();
  console.log(`PASS ${cases} thought-room checks: unique progress, retries, skips, tiers, completion, content expansion and stable paper identities.`);
}
