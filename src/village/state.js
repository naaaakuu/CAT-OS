/**
 * village/state.js — the village, derived.
 *
 * One function turns the learning-derived world state and the stored
 * records into everything the village screen paints and the sheets read:
 * which buildings stand and at what level, what is in the barn, how many
 * coins, which orders are open and which can be delivered, what the
 * helpers have made while the learner was away, which plots are open,
 * how many neighbours have moved in, the village's level and stage, and
 * the one thing worth doing next.
 *
 * Nothing here is stored back. Every record is one of:
 *   village-build    { building, level, cost, at }     a building built or raised
 *   village-order    { slot, n, needs, paid, giver, at } an order delivered
 *   village-collect  { building, good, amount, at }     a helper's trickle collected
 *   village-plot     { plot, cost, at }                 land opened
 *   village-house    { n, cost, at }                    a neighbour's house built
 * Recomputing from the same records always gives the same village.
 */

import {
  BUILDINGS, PLOTS, HOUSE, HOUSE_SPOTS, CHARACTERS, MODULE_BUILDING, buildingById, good, GOOD_KEYS,
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

  /* ---- What stands: the Hearth and the Reading House from the first minute ---- */
  const levels = new Map([['hearth', 1], ['reading', 1]]);
  const builtAt = new Map();
  for (const b of builds) {
    const lv = Number(b.level ?? 1);
    if ((levels.get(b.building) ?? 0) < lv) levels.set(b.building, lv);
    const key = `${b.building}:${lv}`;
    builtAt.set(key, Date.parse(b.at ?? b.finished_at ?? '') || 0);
  }
  const builtIds = new Set(levels.keys());
  const plots = new Set(plotRecs.map((p) => p.plot));
  const houses = Math.min(HOUSE.max, houseRecs.length);
  const ordersDone = orders.length;

  /* ---- Produced: every finished activity, as goods ---- */
  let produced = emptyBag();
  const rcById = new Map(content.rc.map((i) => [i.id, i]));
  for (const x of sessions) {
    if (!x.module) {
      if (!rcById.has(x.passage_id)) continue;
      const r = rcStars(x, rcById.get(x.passage_id)?.estimated_time_min, x.night_reading ? 0.8 : 1);
      produced = addBag(produced, EARN.rc(r.stars, x.score?.correct ?? 0, r.flawless));
      continue;
    }
    if (x.module === 'rc2') { const r = verbalStars(x, (x.score?.total ?? 6) * 80); produced = addBag(produced, EARN.secondLook(r.stars, x.score?.correct ?? 0, r.flawless)); continue; }
    if (x.module === 'wd') { produced = addBag(produced, EARN.wd(x.score?.accuracy === 1 ? 3 : x.score?.accuracy >= 0.75 ? 2 : 1, x.score?.correct ?? 0)); continue; }
    if (['sp', 'pc', 'wb', 'cr'].includes(x.module)) { const r = verbalStars(x, x.target_sec ?? (x.score?.total ?? 1) * 60); produced = addBag(produced, EARN.bank(x.module, r.stars, x.score?.correct ?? 0, r.flawless)); continue; }
    if (['pj', 'ps', 'ooo'].includes(x.module)) {
      const reg = { pj: content.pj, ps: content.ps, ooo: content.ooo }[x.module] ?? [];
      const byId = new Map(reg.map((i) => [i.id, i]));
      const ids = x.item_ids ?? (x.answers ?? []).map((a) => a.item_id ?? a.question_id);
      const target = ids.reduce((n, id) => n + (byId.get(id)?.estimated_time_sec ?? 90), 0);
      const r = verbalStars(x, target);
      produced = addBag(produced, EARN.verbal(r.stars, x.score?.correct ?? 0, r.flawless));
    }
  }
  for (const g of learning.filter((r) => r.kind === 'garden-session')) produced = addBag(produced, EARN.garden(g.session_type, g.clean === true));
  for (const r of learning.filter((x) => x.kind === 'lex-round')) produced = addBag(produced, EARN.round(r.stars ?? 0, r.score?.correct ?? 0, r.flawless === true));
  for (const g of learning.filter((x) => x.kind === 'gauntlet-run')) produced = addBag(produced, EARN.gauntlet(g.stars ?? 0, g.score?.correct ?? 0));
  /* Helpers' trickle that was collected, and the welcome purse. */
  let collected = emptyBag();
  for (const c of collects) collected = addBag(collected, bag({ [c.good]: Number(c.amount) || 0 }));
  /* ---- Spent: delivered goods, build costs, coins paid ---- */
  let delivered = emptyBag();
  let paid = 0;
  for (const o of orders) { delivered = addBag(delivered, o.needs ?? {}); paid += Number(o.paid) || 0; }
  let spent = emptyBag();
  for (const b of builds) spent = addBag(spent, b.cost ?? {});
  for (const p of plotRecs) spent = addBag(spent, p.cost ?? {});
  for (const h of houseRecs) spent = addBag(spent, h.cost ?? {});
  const earned = addBag(addBag(produced, collected), bag({ coins: paid }));
  const stock = subBag(subBag(earned, delivered), spent);

  /* ---- The buildings, annotated ---- */
  const payMul = {};
  let marketMul = 1, slots = 1;
  for (const def of BUILDINGS) {
    const lv = levels.get(def.id) ?? 0;
    if (!lv) continue;
    const eff = effectsUpTo(def, lv);
    if (def.good) payMul[def.good] = eff.pay ?? 1;
    if (def.id === 'market') { marketMul = eff.pay ?? 1; slots = eff.slots ?? 3; }
  }
  const worth = worthOf({ levels, plots: plots.size, houses, ordersDone, stars: s.stars ?? 0 });
  const level = levelFor(worth);
  const stage = stageFor(worth);

  const v = {
    now, levels, builtIds, plots, houses, ordersDone, worth, level, stage,
    stock, earned, produced, collected, delivered, spent, coins: stock.coins,
    payMul, marketMul, slots,
  };

  /* ---- Orders on the board ---- */
  const available = BUILDINGS.filter((b) => b.good && builtIds.has(b.id)).map((b) => b.good);
  const givers = giversFor(builtIds, houses);
  const perSlot = new Map();
  for (const o of orders) perSlot.set(o.slot, (perSlot.get(o.slot) ?? 0) + 1);
  const openSlots = builtIds.has('market') ? slots : 1;
  v.orders = [];
  for (let k = 0; k < openSlots; k += 1) {
    const o = orderFor(k, perSlot.get(k) ?? 0, { available, level: level.n, payMul, marketMul, givers });
    const cov = orderCoverage(o, stock);
    v.orders.push({ ...o, ...cov, anchor: builtIds.has('market') ? 'market' : 'reading' });
  }
  v.deliverable = v.orders.filter((o) => o.deliverable);

  /* ---- Buildings: level, next level, helpers ---- */
  v.buildings = BUILDINGS.map((def) => {
    const lv = levels.get(def.id) ?? 0;
    const built = lv >= 1;
    const cur = built ? def.levels[Math.min(lv, def.levels.length) - 1] : null;
    const nextDef = built ? def.levels[lv] ?? null : def.levels[0];
    const gate = built ? nextDef : def.unlock;             // what it takes to raise, or to build
    let standing = false;
    try { standing = gate?.standing ? !!gate.standing.test(v, s) : !!gate; } catch { standing = false; }
    const cost = gate?.cost ?? null;
    const affordable = cost ? canAfford(stock, cost) : false;
    const eff = built ? effectsUpTo(def, lv) : {};
    // The helper: how much has trickled in since it was last collected.
    let helper = null;
    if (eff.helper) {
      const firstHelperLevel = def.levels.find((l) => l.effect?.helper)?.n ?? lv;
      const since = Math.max(
        builtAt.get(`${def.id}:${firstHelperLevel}`) ?? 0,
        ...collects.filter((c) => c.building === def.id).map((c) => Date.parse(c.at) || 0),
      );
      const elapsed = since ? now - since : 0;
      const available = Math.max(0, Math.min(eff.helper.cap, Math.floor(elapsed / eff.helper.every)));
      const nextIn = available >= eff.helper.cap ? 0 : eff.helper.every - (elapsed % eff.helper.every);
      helper = { ...eff.helper, since, available, nextIn, good: def.good };
    }
    const character = def.character ? CHARACTERS[def.character] : null;
    return {
      id: def.id, def, level: lv, built, current: cur, next: nextDef, gate,
      isUpgrade: built, standing, cost, affordable, missing: cost ? shortfall(stock, cost) : emptyBag(),
      ready: !!gate && standing && affordable && !(built && !nextDef),
      maxed: built && !nextDef,
      effects: eff, helper, character,
      good: def.good ? good(def.good) : null,
      stock: def.good ? stock[def.good] : 0,
      orders: v.orders.filter((o) => o.anchor === def.id),
      wantedHere: v.orders.reduce((n, o) => n + (def.good ? (o.needs[def.good] ?? 0) : 0), 0),
    };
  });
  v.buildingById = (id) => v.buildings.find((b) => b.id === id) ?? null;
  v.readyBuilds = v.buildings.filter((b) => b.ready);
  v.collectable = v.buildings.filter((b) => (b.helper?.available ?? 0) > 0);

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
    return { n, cost, standing, standingLine: st.line, affordable: canAfford(stock, cost), missing: shortfall(stock, cost), ready: standing && canAfford(stock, cost), name: HOUSE.name(n), line: HOUSE.line(n), after: HOUSE.after(n), at: HOUSE_SPOTS[n - 1] };
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
    const where = v.buildingById(d.anchor);
    return { kind: 'deliver', building: d.anchor, glyph: 'check', title: `Deliver ${needsText(d.needs)} to ${d.giver.name}`, line: `${d.pay} coins${where ? ` · at ${where.def.name}` : ''}`, href: null };
  }
  const c = v.collectable.sort((a, b) => b.helper.available - a.helper.available)[0];
  if (c && c.helper.available >= 2) {
    return { kind: 'collect', building: c.id, glyph: c.good.key, title: `Collect ${c.helper.available} ${c.helper.available === 1 ? c.good.one : c.good.name} from ${c.character?.name ?? c.def.name}`, line: `${c.character?.name ?? 'The helper'} kept working while you were away.`, href: null };
  }
  const r = v.readyThings[0];
  if (r) {
    return { kind: r.kind, building: r.building ?? null, id: r.id, glyph: 'hammer', title: `${r.kind === 'upgrade' ? 'Raise' : r.kind === 'build' ? 'Build' : 'Open'}: ${r.name}`, line: `${costText(r.cost)} · ${r.line}`, href: null };
  }
  /* Learning: the order closest to done wants a good; the building that makes it. */
  const open = [...v.orders].sort((a, b) => b.pct - a.pct);
  let target = null;
  for (const o of open) {
    for (const k of GOOD_KEYS) {
      if ((o.missing[k] ?? 0) > 0) { const b = v.buildings.find((x) => x.good?.key === k && x.built); if (b) { target = { b, o, k }; break; } }
    }
    if (target) break;
  }
  /* …unless a skill is slipping, in which case that comes first. */
  const weak = s?.nextSkill && s.nextSkill.kind !== 'new' ? s.nextSkill : null;
  if (weak) {
    const bid = MODULE_BUILDING[weak.skill?.module] ?? placeToBuilding(weak.skill?.where);
    const b = bid ? v.buildingById(bid) : null;
    if (b?.built && b.def.activity) {
      return { kind: 'learn', building: b.id, glyph: b.good?.key ?? 'star', title: weak.skill.name, line: `${weak.why} · makes ${b.good?.name ?? 'coins'}`, href: weak.route ?? b.def.activity.route, skill: weak.skill.key };
    }
  }
  if (target) {
    const { b, o, k } = target;
    const g = good(k);
    return { kind: 'learn', building: b.id, glyph: g.key, title: `${b.def.activity.verb} → up to 3 ${g.name}`, line: `${o.giver.name}'s order needs ${o.missing[k]} more ${o.missing[k] === 1 ? g.one : g.name}.`, href: b.def.activity.route };
  }
  const newest = [...v.buildings].filter((b) => b.built && b.def.activity).sort((a, b) => (b.def.kind === 'learn') - (a.def.kind === 'learn'))[0];
  if (newest) return { kind: 'learn', building: newest.id, glyph: newest.good?.key ?? 'coins', title: `${newest.def.activity.verb} → up to 3 ${newest.good?.name ?? 'coins'}`, line: newest.def.line, href: newest.def.activity.route };
  return { kind: 'learn', building: 'reading', glyph: 'pages', title: 'Read with Ada → up to 3 Pages', line: 'A passage against the clock is where the village begins.', href: '#/world/place/reading-room' };
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
 *   deliver     Ada's order is still on the board
 *   build       the first order is delivered, the Word Garden is not built
 *   name        the village has no name yet
 *   done
 */
export function onboardingStep(v, s, valley) {
  if (!valley?.met_at && !valley?.awakened_at) return 'meet';
  if ((s?.reading?.read ?? 0) === 0 && v.ordersDone === 0) return 'first-read';
  if (v.ordersDone === 0 && v.orders.some((o) => o.first)) return 'deliver';
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
  const b = v.buildings.find((x) => x.good?.key === e.key);
  const who = b?.character?.name ?? 'The village';
  const order = v.orders.filter((o) => (o.needs[e.key] ?? 0) > 0).sort((a, b2) => b2.pct - a.pct)[0];
  if (order?.deliverable) return `${who} has ${e.amount} more ${e.amount === 1 ? e.one : e.name}. <b>${order.giver.name}'s order is ready to deliver.</b>`;
  if (order) { const m = order.missing[e.key]; return `${who} has ${e.amount} more ${e.amount === 1 ? e.one : e.name}. ${order.giver.name}'s order needs <b>${m} more</b>.`; }
  return `${who} has ${e.amount} more ${e.amount === 1 ? e.one : e.name} in store.`;
}

export { buildingById, bagEntries, goodEntries };
