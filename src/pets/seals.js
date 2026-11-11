/**
 * seals.js — the valley tour: every home sealed by real learning in it.
 *
 * The tour walks the valley's lane from its foot to the top: Chai's library,
 * Matcha's glasshouse, Ginger's railway, Mallow's observatory, Mochi's
 * pantry, Biscuit's long table, Sesame's clockworks, and last Toffee's hearth.
 * A home is sealed when each of its strands has been played to the end in
 * that home (thirteen strands, every part of VARC and vocabulary). The hearth
 * is the finale: the mixed Gauntlet, finished with at least one star, after
 * the seven other seals. Then the tour is complete, and the next one begins.
 *
 * Nothing here is stored. Seals are derived from the ordinary records the
 * rooms already save, in time order, so reopening the app, a lost write, a
 * repeated save or a deep link can neither fabricate a seal nor lose one; an
 * existing player keeps every completion they really made. A visit, a tap or
 * opening a room is not evidence. Records a duel made (its big moves and word
 * strikes look like room plays) never count: they carry `in_duel`, or for
 * older saves, fall inside a duel's own time. Seals pay nothing (no Glow, no
 * letter): the rooms' own rewards and limits stand as they are. A tour covers
 * every strand once; it is not mastery of the whole corpus, which each room
 * still shows on its own shelves, plants and boards.
 *
 * Pure: no storage, no DOM. tools/check-seals.mjs.
 */

const H = 'home';
/** The tour, in the lane's order. `need`: how many different rounds or items one strand asks for. */
export const TOUR = Object.freeze([
  { id: 'chai', [H]: "Chai's library", strands: [
    { id: 'reading', label: 'Read one passage to the end', need: 1, href: '#/world/place/reading-room' },
    { id: 'arguments', label: 'Finish one Arguments set', need: 1, href: '#/bank/session/cr/next' },
  ] },
  { id: 'matcha', [H]: "Matcha's glasshouse", strands: [
    { id: 'vocabulary', label: 'Grow ten words in the glasshouse', need: 1, href: '#/world/place/meadow' },
    { id: 'twins', label: 'Play one round of look-alike twins', need: 1, href: '#/world/place/pond' },
    { id: 'borrowed', label: 'Play one round of borrowed words', need: 1, href: '#/world/place/thicket' },
    { id: 'roots', label: 'Tend one root family', need: 1, href: '#/world/place/rootwood' },
    { id: 'wordparts', label: 'Finish one word-parts set', need: 1, href: '#/world/place/terraces' },
  ] },
  { id: 'ginger', [H]: "Ginger's railway", strands: [{ id: 'pj', label: 'Couple three trains of sentences', need: 3, href: '#/world/place/loom' }] },
  { id: 'mallow', [H]: "Mallow's observatory", strands: [{ id: 'ooo', label: 'Find three odd ones out', need: 3, href: '#/world/place/bench' }] },
  { id: 'mochi', [H]: "Mochi's pantry", strands: [{ id: 'ps', label: 'Sum up three paragraphs', need: 3, href: '#/world/place/table' }] },
  { id: 'biscuit', [H]: "Biscuit's long table", strands: [{ id: 'sp', label: 'Seat three sentences', need: 3, href: '#/world/place/placement' }] },
  { id: 'sesame', [H]: "Sesame's clockworks", strands: [{ id: 'pc', label: 'Fill three missing sentences', need: 3, href: '#/world/place/completion' }] },
  { id: 'toffee', [H]: "Toffee's hearth", finale: true, strands: [{ id: 'gauntlet', label: 'Finish the Gauntlet with at least one star', need: 1, href: '#/world/place/wilds' }] },
]);
export const HOMES_IN_TOUR = TOUR.length;
const LEARNING_HOMES = TOUR.filter((h) => !h.finale).map((h) => h.id);
const STRAND_HOME = new Map(TOUR.flatMap((h) => h.strands.map((s) => [s.id, h.id])));
const NEED = new Map(TOUR.flatMap((h) => h.strands.map((s) => [s.id, s.need])));

const arr = (x) => (Array.isArray(x) ? x : []);
const time = (x) => { const t = Date.parse(x); return Number.isFinite(t) ? t : null; };
/** At least one question really answered (a set skipped through saves `is_correct: null` everywhere); the same test Glow uses (glow.js questionsOf). */
const answered = (x) => arr(x.answers).some((a) => a && typeof a === 'object' && (typeof a.is_correct === 'boolean' || typeof a.correct === 'boolean'));
const SLACK = 5000;

/** The duel's own time windows: a record inside one was made by the duel, not in a room. */
function duelWindows(learning) {
  return learning.filter((r) => r && r.kind === 'duel').map((r) => [time(r.started_at), time(r.finished_at)]).filter(([a, b]) => a !== null && b !== null && b >= a);
}
const inDuel = (x, windows) => {
  if (x.in_duel === true) return true;
  const a = time(x.started_at) ?? time(x.finished_at), b = time(x.finished_at);
  return a !== null && b !== null && windows.some(([s, e]) => a >= s - SLACK && b <= e + SLACK);
};

/**
 * Every piece of evidence, as { strand, key, at }: `key` names what was
 * played (an item, a passage, a round) so the same thing saved twice counts once.
 */
export function evidenceFrom(records) {
  const sessions = arr(records?.sessions).filter((x) => x && typeof x === 'object');
  const learning = arr(records?.learning).filter((x) => x && typeof x === 'object');
  const windows = duelWindows(learning);
  const out = [];
  const push = (strand, key, at) => { if (at !== null && key) out.push({ strand, key: String(key), at }); };
  for (const s of sessions) {
    const at = time(s.finished_at);
    if (at === null || inDuel(s, windows) || !answered(s)) continue;
    const item = s.passage_id ?? arr(s.item_ids)[0] ?? s.set_id ?? s.id;
    if (!s.module && s.passage_id) push('reading', `${s.passage_id}@${at}`, at);
    else if (s.module === 'cr') push('arguments', s.id ?? `${s.set_id}@${at}`, at);
    else if (s.module === 'wd') push('wordparts', s.id ?? `${item}@${at}`, at);
    else if (['pj', 'ooo', 'ps', 'sp', 'pc'].includes(s.module)) push(s.module, item, at);
  }
  for (const r of learning) {
    const at = time(r.finished_at);
    if (at === null) continue;
    if (r.kind === 'lex-round') {
      if (inDuel(r, windows) || !answered({ answers: r.answers })) continue;
      if (r.region === 'meadow' && r.greenhouse === true) push('vocabulary', r.id ?? at, at);
      else if (r.region === 'pond') push('twins', r.id ?? at, at);
      else if (r.region === 'thicket') push('borrowed', r.id ?? at, at);
    } else if (r.kind === 'garden-session') push('roots', r.id ?? `${r.family_id}@${at}`, at);
    else if (r.kind === 'gauntlet-run') {
      const answeredN = Number(r.score?.answered ?? arr(r.answers).length) || 0;
      const total = Number(r.score?.total) || 0, correct = Number(r.score?.correct) || 0;
      const star = Number.isFinite(r.stars) ? r.stars >= 1 : total > 0 && correct / total >= 0.5;
      if (answeredN > 0 && star) push('gauntlet', r.id ?? at, at);
    }
  }
  return out.sort((a, b) => a.at - b.at || a.strand.localeCompare(b.strand) || a.key.localeCompare(b.key));
}

/** One tour's state: each strand's distinct keys and when it was met. */
const fresh = () => ({ keys: new Map(), metAt: new Map() });
const strandDone = (t, id) => (t.keys.get(id)?.size ?? 0) >= NEED.get(id);
const homeSealed = (t, home) => TOUR.find((h) => h.id === home).strands.every((s) => strandDone(t, s.id));

/**
 * Where the learner is on the tour.
 * @returns {{ tour: number, toursDone: number, sealed: number, total: number, next: string|null, complete: boolean,
 *   homes: Array<{ id, home, finale, sealed, at, open, strands: Array<{ id, label, href, need, have, done }> }> }}
 *   `tour` counts from 1; `complete` is false while a tour is under way (a finished tour starts the next at once).
 */
export function deriveSeals(records) {
  let t = fresh(), toursDone = 0, lastDone = null;
  for (const e of evidenceFrom(records)) {
    const home = STRAND_HOME.get(e.strand);
    // The finale counts only once every other home is sealed in this tour.
    if (home === 'toffee' && !LEARNING_HOMES.every((h) => homeSealed(t, h))) continue;
    if (!t.keys.has(e.strand)) t.keys.set(e.strand, new Set());
    const set = t.keys.get(e.strand);
    if (set.has(e.key)) continue;
    set.add(e.key);
    if (set.size === NEED.get(e.strand)) t.metAt.set(e.strand, e.at);
    if (home === 'toffee' && strandDone(t, 'gauntlet')) { toursDone += 1; lastDone = e.at; t = fresh(); }
  }
  const sevenSealed = LEARNING_HOMES.every((h) => homeSealed(t, h));
  const homes = TOUR.map((h) => {
    const strands = h.strands.map((s) => ({ id: s.id, label: s.label, href: s.href, need: s.need, have: Math.min(s.need, t.keys.get(s.id)?.size ?? 0), done: strandDone(t, s.id) }));
    const sealed = strands.every((s) => s.done);
    const at = sealed ? Math.max(...h.strands.map((s) => t.metAt.get(s.id) ?? 0)) : null;
    return { id: h.id, home: h[H], finale: !!h.finale, sealed, at, open: !h.finale || sevenSealed, strands };
  });
  const sealed = homes.filter((h) => h.sealed).length;
  return { tour: toursDone + 1, toursDone, lastDone, sealed, total: HOMES_IN_TOUR, next: homes.find((h) => !h.sealed)?.id ?? null, complete: false, homes };
}

/** What a home still asks for, as a short line ("1 of 2 done"). */
export function homeLine(h) {
  if (h.sealed) return 'Sealed';
  if (h.finale && !h.open) return 'Opens when the seven other homes are sealed';
  const done = h.strands.filter((s) => s.done).length;
  if (h.strands.length > 1) return `${done} of ${h.strands.length} done`;
  const s = h.strands[0];
  return s.need > 1 ? `${s.have} of ${s.need} played` : 'Not yet';
}

/** One line for a home's own screen: how its seal stands on this tour (static text, safe as HTML). */
export function sealLine(tour, id) {
  const h = tour?.homes?.find((x) => x.id === id);
  if (!h) return '';
  let text;
  if (h.sealed) text = `Sealed on tour ${tour.tour}`;
  else if (h.finale) text = h.open ? 'The tour finale: one run with a star seals the whole valley' : `The tour finale opens when the other seven homes are sealed (${tour.homes.filter((x) => !x.finale && x.sealed).length} of 7 so far)`;
  else {
    const left = h.strands.filter((s) => !s.done);
    text = `Tour seal: ${homeLine(h).toLowerCase()}${h.strands.length > 1 && left.length ? `. Next: ${left[0].label.charAt(0).toLowerCase()}${left[0].label.slice(1)}` : ''}`;
  }
  return `<p class="tour-seal${h.sealed ? ' is-sealed' : ''}"><i aria-hidden="true"></i><span>${text}</span></p>`;
}
