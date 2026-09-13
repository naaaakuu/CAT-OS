/**
 * economy.js — the rules of the village economy. Pure functions, no DOM,
 * no storage: stars, goods, coins, what a finished activity makes, what
 * an order asks for and pays, how the village's worth becomes a level.
 *
 * The whole economy in one breath:
 *
 *   LEARN   a passage, a word round, a root family, a jumble set — each
 *           belongs to one building and MAKES that building's good.
 *   GOODS   Pages · Blooms · Roots · Thread. One per star, so "3 Pages"
 *           means "about one good passage". A flawless run makes one more.
 *   ORDERS  villagers ask for goods. Delivering pays COINS.
 *   COINS   build, upgrade and open land. Nothing else is money.
 *   STARS   are performance — accuracy first, then pace — and they are
 *           the standing an upgrade asks for. They are never spent.
 *
 * Nothing here is stored; the village derives all of it from records.
 */

import { rng } from './engine/palette.js';
import { GOODS, GOOD_KEYS, good, COINS, ORDER_REASONS, STAGES, CHARACTERS, NEIGHBOURS } from '../village/defs.js';

export { GOODS, GOOD_KEYS, good, COINS };

/* ------------------------------------------------------------------ */
/* Stars                                                               */
/* ------------------------------------------------------------------ */

/**
 * Stars for a Reading Comprehension session.
 *   0  fewer than half right — the passage was not understood
 *   1  at least half right — completed with meaningful mistakes
 *   2  three quarters right, but over the passage's target time
 *   3  three quarters right, within time — CAT pace and CAT accuracy
 * A 100% within time also sets `flawless`.
 * @param {object} session   stored session record (score, duration_ms)
 * @param {number} targetMin the passage's estimated_time_min
 * @param {number} [paceFactor] 1 by default; the Observatory's Night Reading uses 0.8
 */
export function rcStars(session, targetMin, paceFactor = 1) {
  const acc = session.score?.total ? session.score.correct / session.score.total : 0;
  const targetMs = Math.max(60_000, (targetMin ?? 6) * 60_000 * paceFactor);
  const inTime = (session.duration_ms ?? Infinity) <= targetMs * 1.1;
  let stars = 0;
  if (acc >= 0.75 && inTime) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && inTime, accuracy: acc, inTime, targetMs };
}

/** Stars for a verbal set (PJ / PS / OOO): accuracy across the set, pace
 *  against the sum of the items' estimated seconds. */
export function verbalStars(session, targetSec) {
  const acc = session.score?.total ? session.score.correct / session.score.total : 0;
  const targetMs = Math.max(45_000, (targetSec ?? 90) * 1000);
  const inTime = (session.duration_ms ?? Infinity) <= targetMs * 1.15;
  let stars = 0;
  if (acc >= 0.75 && inTime) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && inTime, accuracy: acc, inTime, targetMs };
}

/** Stars for a vocabulary round (Meadow / Pond / Thicket): accuracy, then
 *  average answer time against the round's target per item. */
export function roundStars({ correct, total, avgMs, targetMs = 7000 }) {
  const acc = total ? correct / total : 0;
  const fast = avgMs <= targetMs;
  let stars = 0;
  if (acc >= 0.9 && fast) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && fast, accuracy: acc, inTime: fast, targetMs };
}

export const STAR_WORDS = Object.freeze(['Not yet', 'Completed', 'Accurate', 'Excellent']);

/* ------------------------------------------------------------------ */
/* Bags: coins and the four goods                                      */
/* ------------------------------------------------------------------ */

export const BAG_KEYS = Object.freeze(['coins', ...GOOD_KEYS]);
const THING = new Map([['coins', COINS], ...GOODS.map((g) => [g.key, g])]);

/** What a bag key is: coins or a good. */
export function thing(key) { return THING.get(key) ?? null; }
/** Kept for older call sites: the same lookup under its old name. */
export const craft = thing;

export function emptyBag() { const b = {}; for (const k of BAG_KEYS) b[k] = 0; return b; }
export function bag(partial = {}) { return addBag(emptyBag(), partial); }
export function addBag(a, b) { const out = emptyBag(); for (const k of BAG_KEYS) out[k] = (a?.[k] ?? 0) + (b?.[k] ?? 0); return out; }
export function subBag(a, b) { const out = emptyBag(); for (const k of BAG_KEYS) out[k] = Math.max(0, (a?.[k] ?? 0) - (b?.[k] ?? 0)); return out; }
export function scaleBag(a, k) { const out = emptyBag(); for (const key of BAG_KEYS) out[key] = Math.round((a?.[key] ?? 0) * k); return out; }
export function bagTotal(b) { return BAG_KEYS.reduce((n, k) => n + (b?.[k] ?? 0), 0); }
export function goodsTotal(b) { return GOOD_KEYS.reduce((n, k) => n + (b?.[k] ?? 0), 0); }
export function canAfford(purse, cost) { return BAG_KEYS.every((k) => (purse?.[k] ?? 0) >= (cost?.[k] ?? 0)); }
export function shortfall(purse, cost) { return subBag(cost, purse); }
/** The non-zero entries of a bag, coins first, then goods in their order. */
export function bagEntries(b) {
  return BAG_KEYS.filter((k) => (b?.[k] ?? 0) > 0).map((k) => ({ ...THING.get(k), amount: b[k] }));
}
export function goodEntries(b) { return bagEntries(b).filter((e) => e.key !== 'coins'); }

/* ------------------------------------------------------------------ */
/* Earning — what a finished activity makes                            */
/* ------------------------------------------------------------------ */

/** One per star, never nothing for finishing, one more for flawless. */
export function goodsFor(stars, flawless = false) { return Math.max(1, Math.min(3, stars ?? 0)) + (flawless ? 1 : 0); }

export const EARN = Object.freeze({
  /** A Reading House passage. */
  rc: (stars, correct = 0, flawless = false) => bag({ pages: goodsFor(stars, flawless) }),
  /** The second look: the questions that got away, answered again. */
  secondLook: (stars, correct = 0, flawless = false) => bag({ pages: Math.max(1, Math.min(2, stars)) }),
  /** A set at the Loom (jumbles, summaries, odd one out). */
  verbal: (stars, correct = 0, flawless = false) => bag({ thread: goodsFor(stars, flawless) }),
  /** A set from one of the content engine's banks: placement and
   *  completion are Thread, arguments are Pages, the word bank is Blooms. */
  bank: (mod, stars, correct = 0, flawless = false) => (
    mod === 'wb' ? bag({ blooms: goodsFor(stars, flawless) })
      : mod === 'cr' ? bag({ pages: goodsFor(stars, flawless) })
        : bag({ thread: goodsFor(stars, flawless) })),
  /** A family on the terraces (Word DNA). */
  wd: (stars, correct = 0) => bag({ roots: Math.max(1, Math.min(3, stars)) }),
  /** A walk in the Rootwood: growing a family, or revisiting one. */
  garden: (type, clean) => bag({ roots: type === 'grow' ? 2 : clean ? 2 : 1 }),
  /** A vocabulary round in the Word Garden. */
  round: (stars, correct = 0, flawless = false) => bag({ blooms: goodsFor(stars, flawless) }),
  /** A Gauntlet run on the road out: mixed pressure, paid in coins. */
  gauntlet: (stars, correct = 0) => bag({ coins: 50 + 30 * (stars ?? 0) + 4 * correct }),
});

/** The good a place makes, for "what is made here". */
export const REGION_GOOD = Object.freeze({
  meadow: 'blooms', pond: 'blooms', thicket: 'blooms', rootwood: 'roots', terraces: 'roots',
  'reading-room': 'pages', loom: 'thread', table: 'thread', bench: 'thread', quarter: 'thread',
  wilds: 'coins', hearth: 'coins',
});

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

/**
 * The n-th order in a slot. Deterministic in (slot, n), so the board
 * cannot change under a learner who is working toward it; the goods a
 * slot may ask for are the goods the village can make. Amounts grow with
 * how many orders that slot has already seen and with the village's
 * level, and prices grow with the buildings that make each good.
 *
 * @param {number} slot
 * @param {number} n       how many orders this slot has delivered
 * @param {object} ctx     { available: string[], level: number, payMul: {good: mult}, marketMul: number, givers: [{name, look}] }
 */
export function orderFor(slot, n, ctx = {}) {
  const r = rng(`order:${slot}:${n}`);
  const available = (ctx.available ?? []).filter((k) => GOOD_KEYS.includes(k));
  const avail = available.length ? available : ['pages'];
  const level = ctx.level ?? 1;
  /* The very first order is the tutorial: Ada, one Page — any finished
     passage delivers it, so the first loop lands in one read. It pays
     exactly what the Word Garden costs. */
  if (slot === 0 && n === 0) {
    const needs = bag({ pages: 1 });
    return { id: 'o:0:0', slot: 0, n: 0, giver: giverOf('ada'), needs, pay: 40, reason: 'for the schoolhouse', first: true };
  }
  /* The second order, once the Word Garden stands, is Bo asking for Blooms:
     the learner meets the second kind of work on the second order. */
  if (slot === 0 && n === 1 && avail.includes('blooms')) {
    const needs = bag({ blooms: 2 });
    return { id: 'o:0:1', slot: 0, n: 1, giver: giverOf('bo'), needs, pay: payFor(needs, ctx), reason: 'for the window boxes', first: false };
  }
  let g1 = GOOD_KEYS[(slot + n) % GOOD_KEYS.length];
  if (!avail.includes(g1)) g1 = avail[(slot + n) % avail.length];
  const scale = 1 + Math.min(5, n * 0.22) + Math.max(0, level - 1) * 0.12;
  const needs = emptyBag();
  needs[g1] = Math.max(1, Math.round((1.4 + r() * 1.4) * scale));
  const two = avail.length > 1 && n >= 1 && r() < 0.38;
  if (two) {
    const others = avail.filter((k) => k !== g1);
    const g2 = others[Math.floor(r() * others.length)];
    needs[g2] = Math.max(1, Math.round((0.8 + r() * 1.2) * scale * 0.8));
  }
  const givers = ctx.givers?.length ? ctx.givers : DEFAULT_GIVERS;
  const giver = givers[Math.floor(r() * givers.length)];
  const reasons = ORDER_REASONS[g1] ?? ['for the village'];
  return { id: `o:${slot}:${n}`, slot, n, giver, needs, pay: payFor(needs, ctx), reason: reasons[Math.floor(r() * reasons.length)], first: false };
}

function giverOf(id) { const c = CHARACTERS[id]; return c ? { id: c.id, name: c.name, look: c.look ?? null } : { id, name: id, look: null }; }
const DEFAULT_GIVERS = Object.freeze([giverOf('ada')]);

/** What an order pays: price per unit × the building's multiplier × the market's, plus a little for a bundle. */
export function payFor(needs, ctx = {}) {
  let total = 0;
  let kinds = 0;
  for (const k of GOOD_KEYS) {
    const n = needs?.[k] ?? 0;
    if (!n) continue;
    kinds += 1;
    total += n * (good(k)?.price ?? 20) * (ctx.payMul?.[k] ?? 1);
  }
  total *= ctx.marketMul ?? 1;
  if (kinds > 1) total *= 1.15;
  return Math.max(10, Math.round(total / 2) * 2);
}

/** How much of an order the stock covers, 0..1, and what is still missing. */
export function orderCoverage(order, stock) {
  let need = 0, have = 0;
  const missing = emptyBag();
  for (const k of GOOD_KEYS) {
    const n = order.needs?.[k] ?? 0;
    if (!n) continue;
    need += n;
    const h = Math.min(n, stock?.[k] ?? 0);
    have += h;
    missing[k] = n - h;
  }
  return { pct: need ? have / need : 1, missing, deliverable: need > 0 && have >= need };
}

/** The people who can post orders right now: the workers, then the neighbours who have moved in. */
export function giversFor(builtIds, houses) {
  const out = [];
  for (const id of ['ada', 'bo', 'ines', 'nell']) if (builtIds.has(CHARACTERS[id].building)) out.push(giverOf(id));
  for (let i = 0; i < houses; i += 1) { const nb = NEIGHBOURS[i % NEIGHBOURS.length]; out.push({ id: `nb:${i}`, name: nb.name, look: nb.look }); }
  return out.length ? out : DEFAULT_GIVERS;
}

/* ------------------------------------------------------------------ */
/* Worth, level, stage                                                 */
/* ------------------------------------------------------------------ */

/** The village's worth: what stands in it, what has been delivered, and what has been learned. */
export function worthOf({ levels = new Map(), plots = 0, houses = 0, ordersDone = 0, stars = 0 } = {}) {
  let w = 0;
  for (const lv of levels.values()) w += 10 + Math.max(0, lv - 1) * 12;
  w += plots * 24 + houses * 10 + ordersDone * 3 + Math.floor(stars / 4);
  return w;
}

/** The worth of the two buildings every village starts with. */
export const BASE_WORTH = 20;

/** Level n needs 8·(n−1)² worth above the starting two buildings. */
export function levelFor(worth) {
  const w = Math.max(0, worth - BASE_WORTH);
  const n = Math.max(1, Math.floor(Math.sqrt(w / 8)) + 1);
  const at = 8 * (n - 1) * (n - 1), next = 8 * n * n;
  return { n, at: at + BASE_WORTH, next: next + BASE_WORTH, pct: Math.max(0, Math.min(1, (w - at) / (next - at))) };
}

export function stageFor(worth) {
  let out = STAGES[0];
  for (const s of STAGES) if (worth >= s.at) out = s;
  return out;
}

/* ------------------------------------------------------------------ */
/* Titles                                                             */
/* ------------------------------------------------------------------ */

const TITLES = [[1, 'Newcomer'], [2, 'Reader'], [4, 'Word-gatherer'], [6, 'Root-keeper'], [9, 'Editor'], [12, 'Scholar'], [16, 'Lexicographer'], [20, 'Sage of the Valley']];
export function titleFor(level) {
  let t = TITLES[0][1];
  for (const [lv, name] of TITLES) if (level >= lv) t = name;
  return t;
}

/** Region building level from a count of cleared items, 0–4. */
export function levelFromCleared(cleared, perLevel = 4) { return Math.max(0, Math.min(4, Math.floor(cleared / perLevel))); }
