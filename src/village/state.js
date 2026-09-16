/**
 * village/state.js — the village, derived.
 *
 * One function turns the learning-derived world state and the stored
 * records into everything the village screen paints and the sheets read:
 * which buildings stand and at what level, what is queued, being crafted
 * and ready at each of them, what is in the barn, how many coins, which
 * orders are open and which can be delivered, which plots are open, which
 * neighbours have moved in, the village's level and stage, and the one
 * thing worth doing next.
 *
 * Nothing here is stored back. Every record is one of:
 *   village-build    { building, level, cost, at }        a building built or raised
 *   village-order    { slot, n, needs, paid, giver, at }  an order delivered
 *   village-collect  { building, good, amount, at }       made goods taken off the shelf
 *   village-plot     { plot, cost, at }                   land opened
 *   village-house    { n, cost, at }                      a neighbour's house built
 * Recomputing from the same records always gives the same village.
 *
 * THE QUEUE. Every raw good the learner ever made arrives at its building
 * at the moment its session finished. The worker crafts them one at a
 * time, each on the building's clock, so a passage read at nine is three
 * Books by five past. Nothing waits on the learner; collecting is just
 * taking them off the shelf. A helper (an upgrade) adds raw units on a
 * long clock while the shelf has room. All of it is a small simulation
 * over the timeline, so a village opened after a month is exactly as it
 * should be.
 */

import {
  BUILDINGS, PLOTS, HOUSE, HOUSE_SPOTS, CHARACTERS, NEIGHBOURS, MODULE_BUILDING, buildingById, good, GOOD_KEYS, RAW_KEYS, MADE_KEYS, madeFrom,
} from './defs.js';
import {
  emptyBag, addBag, subBag, bag, canAfford, shortfall, bagEntries, goodEntries, orderFor, orderCoverage, giversFor,
  worthOf, levelFor, stageFor, rcStars, verbalStars, EARN,
} from '../world/economy.js';

export const VILLAGE_KINDS = Object.freeze(['village-build', 'village-order', 'village-collect', 'village-plot', 'village-house']);

/**
 * @param {object} s        the learning-derived world state (world/state.js), part-built
 * @param {object} records  { sessions, learning }
 * @param {object} content  the content registry (for time targets)
 * @param {number} now
 */
export function deriveVillage(s, records, content, now = Date.now()) {
  const { sessions, learning } = records;
  const builds = learning.filter((r) => r.kind === 'village-build');
  const orders = learning.filter((r) => r.kind === 'village-order');
  const collects = learning.filter((r) => r.kind === 'village-collect');
  const plotRecs = learning.filter((r) => r.kind === 'village-plot');
  const houseRecs = learning.filter((r) => r.kind === 'village-house');
  const T = (r) => Date.parse(r.at ?? r.finished_at ?? '') || 0;

  /* ---- What stands: the Hearth, the Reading House and Mira's cottage from the first minute ---- */
  const levels = new Map([['hearth', 1], ['reading', 1]]);
  const builtAt = new Map();
  for (const b of builds) {
    const lv = Number(b.level ?? 1);
    if ((levels.get(b.building) ?? 0) < lv) levels.set(b.building, lv);
    builtAt.set(`${b.building}:${lv}`, T(b));
  }
  const builtIds = new Set(levels.keys());
  const plots = new Set(plotRecs.map((p) => p.plot));
  const houses = Math.min(HOUSE.max, houseRecs.length);       // built after Mira's
  const ordersDone = orders.length;

  /* ---- Raw units: every finished activity, as goods, with the moment they arrived ---- */
  const arrivals = new Map(RAW_KEYS.map((k) => [k, []]));
  let produced = emptyBag();
  const addUnits = (bagObj, at) => {
    produced = addBag(produced, bagObj);
    for (const k of RAW_KEYS) for (let i = 0; i < (bagObj[k] ?? 0); i += 1) arrivals.get(k).push(at);
  };
  const rcById = new Map(content.rc.map((i) => [i.id, i]));
  for (const x of sessions) {
    const at = T(x);
    if (!x.module) {
      if (!rcById.has(x.passage_id)) continue;
      const r = rcStars(x, rcById.get(x.passage_id)?.estimated_time_min, x.night_reading ? 0.8 : 1);
      addUnits(EARN.rc(r.stars, x.score?.correct ?? 0, r.flawless), at);
      continue;
    }
    if (x.module === 'rc2') { const r = verbalStars(x, (x.score?.total ?? 6) * 80); addUnits(EARN.secondLook(r.stars, x.score?.correct ?? 0, r.flawless), at); continue; }
    if (x.module === 'wd') { addUnits(EARN.wd(x.score?.accuracy === 1 ? 3 : x.score?.accuracy >= 0.75 ? 2 : 1, x.score?.correct ?? 0), at); continue; }
    if (['sp', 'pc', 'wb', 'cr'].includes(x.module)) { const r = verbalStars(x, x.target_sec ?? (x.score?.total ?? 1) * 60); addUnits(EARN.bank(x.module, r.stars, x.score?.correct ?? 0, r.flawless), at); continue; }
    if (['pj', 'ps', 'ooo'].includes(x.module)) {
      const reg = { pj: content.pj, ps: content.ps, ooo: content.ooo }[x.module] ?? [];
      const byId = new Map(reg.map((i) => [i.id, i]));
      const ids = x.item_ids ?? (x.answers ?? []).filter(Boolean).map((a) => a.item_id ?? a.question_id);
      const target = ids.reduce((n, id) => n + (byId.get(id)?.estimated_time_sec ?? 90), 0);
      const r = verbalStars(x, target);
      addUnits(EARN.verbal(r.stars, x.score?.correct ?? 0, r.flawless), at);
    }
  }
  for (const g of learning.filter((r) => r.kind === 'garden-session')) addUnits(EARN.garden(g.session_type, g.clean === true), T(g));
  for (const r of learning.filter((x) => x.kind === 'lex-round')) addUnits(EARN.round(r.stars ?? 0, r.score?.correct ?? 0, r.flawless === true), T(r));
  /* The Road Out's level 2 — "Lanterns on the road", 700 coins plus 4 Cloth
     and 4 Books, whose one promise is "Gauntlet runs pay half again" — had no
     effect whatsoever. The buildings loop below reads a level's `pay` into
     `payMul[def.good]`, and the road is a challenge with no `good`, so its
     1.5 was read and thrown away. It is applied here, where Gauntlet coins
     are actually summed.

     Only to runs finished AFTER the lanterns went up: coins are derived from
     the entire record log every time the world loads, so a flat multiplier
     would silently mint coins for every run the learner had already been
     paid for the moment they bought the upgrade. */
  let coinsEarned = 0;
  const roadDef = BUILDINGS.find((d) => d.id === 'road');
  const roadLv = levels.get('road') ?? 0;
  const roadPay = roadDef && roadLv ? (effectsUpTo(roadDef, roadLv).pay ?? 1) : 1;
  const roadLitAt = roadPay > 1 ? (builtAt.get('road:2') ?? Infinity) : Infinity;
  for (const g of learning.filter((x) => x.kind === 'gauntlet-run')) {
    const base = EARN.gauntlet(g.stars ?? 0, g.score?.correct ?? 0).coins;
    coinsEarned += T(g) >= roadLitAt ? Math.round(base * roadPay) : base;
  }
  /* Collect records from before the chain (2.0.0) hold raw goods a helper made: they join the queue. */
  for (const c of collects) if (RAW_KEYS.includes(c.good)) { const n = Number(c.amount) || 0; for (let i = 0; i < n; i += 1) arrivals.get(c.good).push(T(c)); }

  /* ---- Spent: delivered goods, build costs, coins paid ---- */
  let delivered = emptyBag();
  let paid = 0;
  for (const o of orders) { delivered = addBag(delivered, o.needs ?? {}); paid += Number(o.paid) || 0; }
  let spent = emptyBag();
  for (const b of builds) spent = addBag(spent, b.cost ?? {});
  for (const p of plotRecs) spent = addBag(spent, p.cost ?? {});
  for (const h of houseRecs) spent = addBag(spent, h.cost ?? {});

  /* ---- The buildings' clocks: queues, crafting, shelves ---- */
  const payMul = {};
  let marketMul = 1, slots = 1;
  const queues = new Map();
  let collected = emptyBag();
  for (const def of BUILDINGS) {
    const lv = levels.get(def.id) ?? 0;
    if (!lv) continue;
    const eff = effectsUpTo(def, lv);
    if (def.good) payMul[def.good] = eff.pay ?? 1;
    if (def.id === 'market') { marketMul = eff.pay ?? 1; slots = eff.slots ?? 3; }
    if (!def.craft) continue;
    /* THE HELPER'S HISTORY, AT THE RATES THAT WERE ACTUALLY IN FORCE.
       `effectsUpTo` merges the levels, so at level 4 the helper reads
       {every: 2h, cap: 6} — but `since` was pinned to the build time of
       level 3, the first level that carries a helper at all. simulateQueue
       then generated a tick every two hours from the moment the LEVEL-3
       tower went up, recomputing the whole of the helper's past at a rate
       that did not exist then. Measured: thirty days of level-3 history and
       a daily collect, 87 Books in the barn; adding a level-4 record dated
       one minute ago took it to 180. A learner could double their barn by
       buying an upgrade.
       A rate that changes is a list of segments, one per level that changes
       it, each with the window it actually applied to. */
    const helperSegs = [];
    {
      const withHelper = def.levels.filter((l) => l.effect?.helper && l.n <= lv);
      for (let i = 0; i < withHelper.length; i += 1) {
        const from = builtAt.get(`${def.id}:${withHelper[i].n}`) ?? 0;
        if (!from) continue;
        const nextLevel = withHelper[i + 1];
        const to = nextLevel ? (builtAt.get(`${def.id}:${nextLevel.n}`) ?? Infinity) : Infinity;
        // The merged effect UP TO this level, so a level that only changes the
        // cap inherits the rate set below it.
        const e = effectsUpTo(def, withHelper[i].n).helper;
        if (e?.every > 0) helperSegs.push({ from, to, every: e.every, cap: e.cap });
      }
    }
    const helper = helperSegs.length ? { ...helperSegs[helperSegs.length - 1], segments: helperSegs, since: helperSegs[0].from } : null;
    const q = simulateQueue({
      arrivals: arrivals.get(def.raw) ?? [], helper,
      collects: collects.filter((c) => c.building === def.id && c.good === def.good).map((c) => ({ t: T(c), n: Number(c.amount) || 0 })),
      secs: (def.craft.secs[Math.min(lv, def.craft.secs.length) - 1] ?? 30) * 1000,
      firstSecs: (def.craft.firstSecs ?? 10) * 1000,
      now,
    });
    queues.set(def.id, q);
    collected = addBag(collected, bag({ [def.good]: q.collected }));
  }
  const earned = addBag(collected, bag({ coins: paid + coinsEarned }));
  const stock = subBag(subBag(earned, delivered), spent);
  for (const k of RAW_KEYS) stock[k] = 0; // raw goods live in the queues, never in the barn

  const worth = worthOf({ levels, plots: plots.size, houses, ordersDone, stars: s.stars ?? 0 });
  const level = levelFor(worth);
  const stage = stageFor(worth);

  const v = {
    now, levels, builtIds, plots, houses, ordersDone, worth, level, stage,
    stock, earned, produced, collected, delivered, spent, coins: stock.coins,
    payMul, marketMul, slots, queues,
  };

  /* ---- The neighbours who live here ---- */
  v.neighbours = [];
  for (let i = 0; i <= houses && i < NEIGHBOURS.length; i += 1) v.neighbours.push({ ...NEIGHBOURS[i], n: i, spot: HOUSE_SPOTS[i], builtAt: i === 0 ? 0 : T(houseRecs[i - 1] ?? {}) });

  /* ---- Orders on the board ---- */
  const available = BUILDINGS.filter((b) => b.good && builtIds.has(b.id)).map((b) => b.good);
  const givers = giversFor(houses + 1);
  const perSlot = new Map();
  for (const o of orders) perSlot.set(o.slot, (perSlot.get(o.slot) ?? 0) + 1);
  const openSlots = builtIds.has('market') ? slots : 1;
  v.orders = [];
  /* A RUNNING PURSE, NOT THREE INDEPENDENT ONES.
     Every order used to be scored against the whole barn on its own, so
     three "Deliver" buttons could light up over a barn that could pay for
     one of them — and the learner found that out by tapping the second. */
  let purse = stock;
  for (let k = 0; k < openSlots; k += 1) {
    const o = orderFor(k, perSlot.get(k) ?? 0, { available, level: level.n, payMul, marketMul, givers });
    const cov = orderCoverage(o, purse);
    if (cov.deliverable) purse = subBag(purse, o.needs);
    v.orders.push({ ...o, ...cov, anchor: 'board' });
  }
  v.deliverable = v.orders.filter((o) => o.deliverable);
  v.wanted = emptyBag();
  for (const o of v.orders) v.wanted = addBag(v.wanted, o.missing);

  /* ---- Buildings: level, next level, queue, helpers ---- */
  v.buildings = BUILDINGS.map((def) => {
    const lv = levels.get(def.id) ?? 0;
    const built = lv >= 1;
    const cur = built ? def.levels[Math.min(lv, def.levels.length) - 1] : null;
    const nextDef = built ? def.levels[lv] ?? null : def.levels[0];
    const gate = built ? nextDef : def.unlock;
    let standing = false;
    try { standing = gate?.standing ? !!gate.standing.test(v, s) : !!gate; } catch { standing = false; }
    const cost = gate?.cost ?? null;
    const affordable = cost ? canAfford(stock, cost) : false;
    const eff = built ? effectsUpTo(def, lv) : {};
    const q = queues.get(def.id) ?? null;
    const helper = q?.helper ? { ...q.helper, good: def.raw } : null;
    const character = def.character ? CHARACTERS[def.character] : null;
    const madeGood = def.good ? good(def.good) : null;
    return {
      id: def.id, def, level: lv, built, current: cur, next: nextDef, gate,
      isUpgrade: built, standing, cost, affordable, missing: cost ? shortfall(stock, cost) : emptyBag(),
      ready: !!gate && standing && affordable && !(built && !nextDef),
      maxed: built && !nextDef,
      effects: eff, helper, character,
      good: madeGood, raw: def.raw ? good(def.raw) : null,
      queue: q ? { pending: q.pending, waiting: q.waiting, working: q.working, ready: q.ready, done: q.done, collected: q.collected, secs: q.secs, everMade: q.done > 0 } : null,
      stock: def.good ? stock[def.good] : 0,
      wantedHere: def.good ? (v.wanted[def.good] ?? 0) : 0,
      state: !built ? 'unbuilt' : !q ? 'idle' : q.ready > 0 ? 'ready' : q.working ? 'working' : 'idle',
    };
  });
  v.buildingById = (id) => v.buildings.find((b) => b.id === id) ?? null;
  v.readyBuilds = v.buildings.filter((b) => b.ready);
  v.collectable = v.buildings.filter((b) => (b.queue?.ready ?? 0) > 0);
  v.working = v.buildings.filter((b) => b.queue?.working);

  /* ---- Land ---- */
  v.plotViews = PLOTS.map((def) => {
    const open = plots.has(def.id);
    let standing = false;
    try { standing = !!def.standing.test(v, s); } catch { standing = false; }
    const affordable = canAfford(stock, def.cost);
    return { id: def.id, def, open, standing, affordable, missing: shortfall(stock, def.cost), ready: !open && standing && affordable };
  });
  v.nextHouse = houses < HOUSE.max ? (() => {
    const n = houses + 1;
    const st = HOUSE.standing(n);
    let standing = false;
    try { standing = !!st.test(v, s); } catch { standing = false; }
    const cost = HOUSE.cost(n);
    const who = HOUSE.who(n);
    return { n, who, cost, standing, standingLine: st.line, affordable: canAfford(stock, cost), missing: shortfall(stock, cost), ready: standing && canAfford(stock, cost), name: HOUSE.name(n), line: HOUSE.line(n), after: HOUSE.after(n), at: HOUSE_SPOTS[n] };
  })() : null;
  v.readyPlots = v.plotViews.filter((p) => p.ready);
  v.forSale = new Set(v.plotViews.filter((p) => !p.open && p.standing).map((p) => p.id));

  /* ---- Something new became possible: the strongest signal to send ---- */
  v.readyThings = [
    ...v.readyBuilds.map((b) => ({ kind: b.built ? 'upgrade' : 'build', id: b.id, name: b.built ? b.next.name : b.def.name, line: b.built ? b.next.line : b.def.unlock?.line ?? b.def.line, cost: b.cost, building: b.id })),
    ...v.readyPlots.map((p) => ({ kind: 'plot', id: p.id, name: p.def.name, line: p.def.line, cost: p.def.cost })),
    ...(v.nextHouse?.ready ? [{ kind: 'house', id: `house:${v.nextHouse.n}`, name: v.nextHouse.name, line: v.nextHouse.line, cost: v.nextHouse.cost }] : []),
  ];

  v.tip = tipFor(v, s);
  return v;
}

/** Every effect a building has at level `lv` (later levels override). */
function effectsUpTo(def, lv) {
  const out = {};
  for (const l of def.levels) if (l.n <= lv && l.effect) Object.assign(out, l.effect);
  return out;
}

/* ------------------------------------------------------------------ */
/* The clock                                                           */
/* ------------------------------------------------------------------ */

/**
 * Run a building's timeline: raw units arrive, the worker crafts them one
 * at a time, the helper adds units on its clock while the shelf has room,
 * and collect records take finished goods away.
 * @returns {{ pending, working, ready, done, collected, secs, helper }}
 */
export function simulateQueue({ arrivals, helper, collects, secs, firstSecs, now }) {
  const events = arrivals.map((t) => ({ t, kind: 'raw' }));
  for (const c of collects) events.push({ t: c.t, kind: 'collect', n: c.n });
  /* One tick list per segment, each covering only the window in which that
     rate was in force. `segments` is the honest form; a bare {since, every}
     is still accepted so nothing that calls this with one breaks. */
  const segments = helper?.segments ?? (helper?.since && helper.every > 0
    ? [{ from: helper.since, to: Infinity, every: helper.every, cap: helper.cap }]
    : []);
  for (const seg of segments) {
    if (!(seg.every > 0) || !seg.from) continue;
    const until = Math.min(now, seg.to);
    const first = seg.from + seg.every;
    if (first > until) continue;
    const maxTicks = Math.min(4000, Math.floor((until - first) / seg.every) + 1);
    for (let i = 0; i < maxTicks; i += 1) events.push({ t: first + i * seg.every, kind: 'tick', cap: seg.cap });
  }
  events.sort((a, b) => a.t - b.t || (a.kind === 'collect' ? 1 : -1));
  const finish = [];
  let lastFinish = -Infinity, collected = 0, first = true, helperMade = 0;
  const finishedBy = (t) => { let n = 0; for (const f of finish) if (f <= t) n += 1; return n; };
  for (const e of events) {
    if (e.kind === 'collect') { collected = Math.min(finishedBy(e.t), collected + e.n); continue; }
    if (e.kind === 'tick') {
      const pending = finish.length - collected;
      if (pending >= (e.cap ?? helper.cap)) continue;
      helperMade += 1;
    }
    const start = Math.max(e.t, lastFinish);
    const f = start + (first ? firstSecs : secs);
    first = false;
    finish.push(f);
    lastFinish = f;
  }
  const done = finishedBy(now);
  const ready = Math.max(0, done - collected);
  let working = null;
  for (let i = 0; i < finish.length; i += 1) {
    if (finish[i] > now) { const dur = i === 0 ? firstSecs : Math.min(secs, finish[i] - (finish[i - 1] ?? finish[i] - secs)); working = { readyAt: finish[i], startedAt: finish[i] - dur, pct: Math.max(0, Math.min(1, 1 - (finish[i] - now) / dur)) }; break; }
  }
  const pending = finish.length - done;
  /* The item on the bench is not waiting for the bench. The strip showed
     "3 Pages" under the raw-good icon while one of those three was the one
     turning in the ring beside it, so a learner counting what was left
     always counted one too many, and the last one never seemed to start. */
  const waiting = Math.max(0, pending - (working ? 1 : 0));
  let helperOut = null;
  if (helper?.since) {
    const uncollected = finish.length - collected;
    const room = uncollected < helper.cap;
    const elapsed = now - helper.since;
    const nextIn = helper.every - (elapsed % helper.every);
    helperOut = { every: helper.every, cap: helper.cap, since: helper.since, made: helperMade, room, nextIn };
  }
  return { pending, waiting, working, ready, done, collected, secs, helper: helperOut };
}

/* ------------------------------------------------------------------ */
/* The one thing worth doing                                           */
/* ------------------------------------------------------------------ */

/**
 * The village always knows the next action, in one sentence, with what it
 * will make and why it matters. Order of preference:
 *   deliver → collect → build/raise → the learning that serves an order
 *   or a slipping skill → the newest building's activity.
 */
export function tipFor(v, s) {
  const d = v.deliverable[0];
  if (d) {
    return { kind: 'deliver', building: 'board', glyph: 'check', title: `Deliver ${needsText(d.needs)} to ${d.giver.name}`, line: `${d.pay} coins · at the order board`, href: null };
  }
  const c = [...v.collectable].sort((a, b) => b.queue.ready - a.queue.ready)[0];
  if (c) {
    return { kind: 'collect', building: c.id, glyph: c.good.key, title: `Collect ${c.queue.ready} ${c.queue.ready === 1 ? c.good.one : c.good.name} from ${c.character?.name ?? c.def.name}`, line: `${c.character?.name ?? 'The worker'} has them on the shelf.`, href: null };
  }
  const r = v.readyThings[0];
  if (r) {
    return { kind: r.kind, building: r.building ?? null, id: r.id, glyph: 'hammer', title: `${r.kind === 'upgrade' ? 'Raise' : r.kind === 'build' ? 'Build' : 'Open'}: ${r.name}`, line: `${costText(r.cost)} · ${r.line}`, href: null };
  }
  /* Learning: the order closest to done wants a made good; the building that makes it. */
  const open = [...v.orders].sort((a, b) => b.pct - a.pct);
  let target = null;
  for (const o of open) {
    for (const k of MADE_KEYS) {
      if ((o.missing[k] ?? 0) > 0) {
        const b = v.buildings.find((x) => x.good?.key === k && x.built);
        if (b) {
          const coming = (b.queue?.pending ?? 0) + (b.queue?.working ? 1 : 0);
          if (coming >= o.missing[k]) continue; // already on the clock
          target = { b, o, k }; break;
        }
      }
    }
    if (target) break;
  }
  const weak = s?.nextSkill && s.nextSkill.kind !== 'new' ? s.nextSkill : null;
  if (weak) {
    const bid = MODULE_BUILDING[weak.skill?.module] ?? placeToBuilding(weak.skill?.where);
    const b = bid ? v.buildingById(bid) : null;
    if (b?.built && b.def.activity) {
      return { kind: 'learn', building: b.id, glyph: b.raw?.key ?? 'star', title: weak.skill.name, line: `${weak.why} · makes ${b.raw?.name ?? 'coins'}`, href: weak.route ?? b.def.activity.route, skill: weak.skill.key };
    }
  }
  if (target) {
    const { b, o, k } = target;
    const g = good(k);
    return { kind: 'learn', building: b.id, glyph: b.raw.key, title: `${b.def.activity.verb} → up to 3 ${b.raw.name}`, line: `${o.giver.name} needs ${o.missing[k]} more ${o.missing[k] === 1 ? g.one : g.name}. ${b.character.name} makes them from ${b.raw.name}.`, href: b.def.activity.route };
  }
  const working = v.working[0];
  if (working) return { kind: 'wait', building: working.id, glyph: working.good.key, title: `${working.character.name} is making ${working.good.name}`, line: 'Come back in a minute, or read something meanwhile.', href: null };
  const newest = [...v.buildings].filter((b) => b.built && b.def.activity).sort((a, b) => (b.def.kind === 'learn') - (a.def.kind === 'learn'))[0];
  if (newest) return { kind: 'learn', building: newest.id, glyph: newest.raw?.key ?? 'coins', title: `${newest.def.activity.verb} → up to 3 ${newest.raw?.name ?? 'coins'}`, line: newest.def.line, href: newest.def.activity.route };
  return { kind: 'learn', building: 'reading', glyph: 'pages', title: 'Read a passage → up to 3 Pages', line: 'A passage against the clock is where the village begins.', href: '#/world/place/reading-room' };
}

function placeToBuilding(where) {
  return { 'reading-room': 'reading', meadow: 'garden', pond: 'garden', thicket: 'garden', rootwood: 'roots', terraces: 'roots', loom: 'loom', table: 'loom', bench: 'loom', wilds: 'road' }[where] ?? null;
}

export function needsText(needs) {
  return goodEntries(needs).map((e) => `${e.amount} ${e.amount === 1 ? e.one : e.name}`).join(' + ');
}
export function costText(cost) {
  return bagEntries(cost).map((e) => `${e.amount} ${e.amount === 1 && e.key !== 'coins' ? e.one : e.name}`).join(' + ');
}

/* ------------------------------------------------------------------ */
/* Onboarding — the first minutes, derived                             */
/* ------------------------------------------------------------------ */

/**
 * Where a new learner is in the first loop. Every step is a fact about
 * the records, so a learner who closes the app mid-way lands exactly
 * where they were.
 *   meet        Wick has not spoken yet
 *   first-read  no passage read
 *   binding     Pages arrived, no Book finished yet
 *   collect     the first Book is on the shelf, uncollected
 *   deliver     Mira's order is still on the board
 *   build       the first order is delivered, the Word Garden is not built
 *   name        the village has no name yet
 *   done
 */
export function onboardingStep(v, s, valley) {
  if (!valley?.met_at && !valley?.awakened_at) return 'meet';
  const reading = v.buildingById?.('reading') ?? v.buildings.find((b) => b.id === 'reading');
  const q = reading?.queue;
  if (v.ordersDone === 0) {
    if ((v.produced.pages ?? 0) === 0) return 'first-read';
    if (q && q.done === 0) return 'binding';
    if (q && q.ready > 0 && q.collected === 0) return 'collect';
    if (v.orders.some((o) => o.first)) return 'deliver';
  }
  if (!v.builtIds.has('garden') && v.ordersDone < 2) return 'build';
  if (!valley?.name) return 'name';
  return 'done';
}

/* ------------------------------------------------------------------ */
/* What changed                                                        */
/* ------------------------------------------------------------------ */

/** Things that became ready between two derivations — the loudest news. */
export function newlyReady(before, after) {
  if (!before || !after) return [];
  const was = new Set((before.readyThings ?? []).map((t) => t.id));
  return (after.readyThings ?? []).filter((t) => !was.has(t.id));
}

/** Orders that became deliverable between two derivations. */
export function newlyDeliverable(before, after) {
  if (!before || !after) return [];
  const was = new Set((before.deliverable ?? []).map((o) => o.id));
  return (after.deliverable ?? []).filter((o) => !was.has(o.id));
}

/** One line about what a run did for the village, for the result screen. */
export function villageLine(v, made) {
  const entries = goodEntries(made ?? {});
  if (!entries.length) return '';
  const e = entries[0];
  const b = v.buildings.find((x) => x.raw?.key === e.key);
  if (!b) return `The village keeps ${e.amount} ${e.amount === 1 ? e.one : e.name}.`;
  const who = b.character?.name ?? 'The village';
  const m = b.good;
  const order = v.orders.filter((o) => (o.needs[m.key] ?? 0) > 0).sort((a, b2) => b2.pct - a.pct)[0];
  const head = `${e.amount} ${e.amount === 1 ? e.one : e.name} went to ${b.def.name}. <b>${who} is making ${m.name}.</b>`;
  if (order) { const miss = order.missing[m.key]; return `${head} ${order.giver.name} needs ${miss} ${miss === 1 ? m.one : m.name}.`; }
  return head;
}

export { buildingById, bagEntries, goodEntries };
