/**
 * collections.js — learning as sets you can finish.
 *
 * A learner needs to be able to think "I only need three more" about
 * something, every single day. A percentage cannot do that; a bar that
 * measures the whole of CAT cannot do that. A SET can: eleven words left
 * in one letter, two families left in one grove, one language left unlit.
 *
 * So every finite thing in the corpus is exposed here as a collection,
 * and the screens sort them by how close they are to done. Nothing in
 * this file is stored and nothing is authored: collections are derived
 * from the same records as the valley, so new content becomes new
 * collections the moment it is added — which is what makes the
 * progression endless without a redesign.
 *
 * A collection is:
 *   id      stable
 *   group   'words' | 'reading' | 'verbal' | 'pace'
 *   name    what the set is, in the valley's own words
 *   mark    the pixel icon that stands for it (world/icons.js)
 *   have/total, unit
 *   route   where to go and work on it
 *   done    have >= total
 *   near    how many are left, as a sentence, when it is nearly done
 */

import { STAGE_INFO } from '../core/learning/journey.js';

const pct = (h, t) => (t > 0 ? h / t : 0);

/** One collection, tidied. */
function set(o) {
  const total = Math.max(0, o.total ?? 0);
  const have = Math.max(0, Math.min(total, o.have ?? 0));
  const left = total - have;
  return {
    hard: 0,
    ...o,
    total, have, left,
    p: pct(have, total),
    done: total > 0 && have >= total,
    started: have > 0,
    near: left === 0 ? 'Finished' : left === 1 ? '1 left' : `${left} left`,
    close: left > 0 && left <= 3,
  };
}

/**
 * Every collection the learner could finish.
 * @param {object} s      derived world state
 * @param {object} content the registries (for passage stages)
 */
export function collections(s, content) {
  const out = [];

  /* ---- Words: root families, by grove ---- */
  for (const g of s.rootwood.groves ?? []) {
    const grown = g.families.filter((f) => f.stage === 'mature' || f.stage === 'ancient').length;
    out.push(set({
      id: `grove:${g.slug}`, group: 'words', mark: 'tree',
      name: g.name, what: 'root families grown',
      have: grown, total: g.families.length, unit: 'families',
      route: '#/world/place/rootwood',
      line: g.line, hard: 0.2,
    }));
  }

  /* ---- Words: the CAT lists, letter by letter ---- */
  for (const [region, mark, unit, label] of [
    ['meadow', 'flower', 'words', 'Meadow'],
    ['pond', 'koi', 'pairs', 'Mirror Pond'],
    ['thicket', 'lantern', 'words', 'Thicket'],
  ]) {
    for (const f of s[region].fields ?? []) {
      if (!f.total) continue;
      out.push(set({
        id: `field:${region}:${f.id}`, group: 'words', mark,
        name: region === 'thicket' ? f.name : `${f.groupLabel} · ${f.name}`,
        what: 'held for good',
        have: f.summary.mastered, total: f.total, unit,
        route: `#/round/${region}/${f.id}`,
        hard: f.group === 'medium' ? 0.35 : f.group === 'low' ? 0.6 : 0.1,
        line: `${label} · ${f.summary.known} met, ${f.summary.mastered} held`,
      }));
    }
  }

  /* ---- Words: the Vine Terraces ---- */
  if (s.terraces.total) {
    out.push(set({
      id: 'terraces', group: 'words', mark: 'vine',
      name: 'Word parts', what: 'families climbed',
      have: s.terraces.done, total: s.terraces.total, unit: 'families',
      route: '#/world/place/terraces',
      line: 'Prefixes and suffixes, on the Vine Terraces', hard: 0.3,
    }));
  }

  /* ---- Reading: the passages, by stage ---- */
  {
    const byStage = new Map();
    for (const item of content?.rc ?? []) {
      const k = item.stage ?? 'unstaged';
      if (!byStage.has(k)) byStage.set(k, []);
      byStage.get(k).push(item);
    }
    const ORDER = ['foundation', 'developing', 'intermediate', 'advanced', 'elite', 'unstaged'];
    for (const stage of ORDER) {
      const items = byStage.get(stage);
      if (!items?.length) continue;
      const well = items.filter((i) => (s.reading.best.get(i.id)?.stars ?? 0) >= 2).length;
      out.push(set({
        id: `rc:${stage}`, group: 'reading', mark: 'book',
        name: STAGE_INFO[stage]?.label ?? stage, what: 'read well',
        have: well, total: items.length, unit: 'passages',
        route: '#/world/place/reading-room',
        line: STAGE_INFO[stage]?.description ?? '',
        hard: Math.max(0, ORDER.indexOf(stage)) / 5,
      }));
    }
  }

  /* ---- Verbal: the three benches of the Quarter ---- */
  for (const [slug, name, what, line] of [
    ['loom', 'Para jumbles', 'put in order', 'The Loom'],
    ['table', 'Para summary', 'found', 'The Summary Table'],
    ['bench', 'Odd one out', 'spotted', 'The Stranger’s Bench'],
  ]) {
    const r = s[slug];
    if (!r?.total) continue;
    out.push(set({
      id: `verbal:${slug}`, group: 'verbal', mark: 'workshop',
      name, what,
      have: r.solved, total: r.total, unit: 'items',
      route: `#/world/place/${slug}`,
      line, hard: 0.3,
    }));
  }

  /* ---- The content engine's banks: placement and completion by tier,
          arguments by band, the word bank by kind. New bundles become new
          sets the moment they are registered. ---- */
  {
    const banks = s.banks ?? {};
    const solvedIn = (mod, ids) => ids.filter((id) => banks[mod]?.solvedIds?.has(id)).length;
    for (const [mod, name, mark, route] of [
      ['sp', 'Sentence placement', 'workshop', '#/world/place/loom'],
      ['pc', 'Paragraph completion', 'workshop', '#/world/place/table'],
    ]) {
      const rows = content?.[mod] ?? [];
      const tiers = [...new Set(rows.map((r) => r.tier))];
      const ORDER = ['foundation', 'easy', 'medium', 'advanced', 'cat', 'cat-plus', 'ninety-nine', 'premium'];
      for (const tier of ORDER.filter((t) => tiers.includes(t))) {
        const ids = rows.filter((r) => r.tier === tier).map((r) => r.id);
        out.push(set({
          id: `bank:${mod}:${tier}`, group: 'verbal', mark,
          name: `${name} · ${tier.replace('-', ' ')}`, what: 'solved',
          have: solvedIn(mod, ids), total: ids.length, unit: 'items',
          route, line: mod === 'sp' ? 'The Loom' : 'The Summary Table',
          hard: Math.max(0, ORDER.indexOf(tier)) / 7,
        }));
      }
    }
    for (const r of content?.cr ?? []) {
      const ids = r.item_ids ?? [];
      if (!ids.length) continue;
      out.push(set({
        id: `bank:cr:${r.id}`, group: 'reading', mark: 'book',
        name: r.title, what: 'arguments seen through',
        have: solvedIn('cr', ids), total: ids.length, unit: 'arguments',
        route: '#/world/place/reading-room', line: 'The Reading House · arguments',
        hard: r.band === 'elite' ? 0.8 : r.band === 'stretch' ? 0.5 : 0.25,
      }));
    }
    for (const r of content?.wb ?? []) {
      const ids = r.item_ids ?? [];
      if (!ids.length) continue;
      const region = { confusable: 'pond', decode: 'terraces' }[r.kind] ?? 'meadow';
      const mark = region === 'pond' ? 'koi' : region === 'terraces' ? 'vine' : 'flower';
      out.push(set({
        id: `bank:wb:${r.id}`, group: 'words', mark,
        name: r.title, what: 'answered the CAT way',
        have: solvedIn('wb', ids), total: ids.length, unit: 'words',
        route: `#/world/place/${region}`, line: `${{ pond: 'The Mirror Pond', terraces: 'The Vine Terraces' }[region] ?? 'The Meadow'} · ${String(r.kind).replace('_', ' ')}`,
        hard: r.band === 'elite' ? 0.7 : r.band === 'stretch' ? 0.4 : 0.15,
      }));
    }
  }

  /* ---- Pace: the embers. This one is meant never to finish — the
          target climbs a rung every time it is reached, which is how a
          progression stays alive after the corpus is done. ---- */
  {
    const struck = s.earned?.ember ?? 0;
    const RUNGS = [3, 8, 16, 30, 50, 80, 120, 180, 260, 380, 520];
    const target = RUNGS.find((n) => n > struck) ?? (Math.ceil((struck + 1) / 100) * 100);
    out.push(set({
      id: 'pace:embers', group: 'pace', mark: 'ember',
      name: 'Embers struck', what: 'right, and in time',
      have: struck, total: target, unit: 'embers',
      route: '#/world/place/hearth',
      line: 'Only a three-star run makes one',
      endless: true, hard: 0.5,
    }));
    const threeStar = s.reading.threeStar ?? 0;
    out.push(set({
      id: 'pace:reading', group: 'pace', mark: 'clock',
      name: 'Passages at CAT pace', what: 'at three stars',
      have: threeStar, total: Math.max(4, s.reading.passages), unit: 'passages',
      route: '#/world/place/reading-room',
      line: 'Right, and inside the passage’s own clock', hard: 0.7,
    }));
  }

  /* ---- The valley itself ---- */
  out.push(set({
    id: 'works', group: 'pace', mark: 'cottage',
    name: 'Works standing', what: 'built',
    have: s.village ? s.village.buildings.filter((b) => b.built).length : 0,
    total: s.village ? s.village.buildings.length : 7, unit: 'buildings',
    route: '#/world/place/hearth?works=1',
    line: 'Everything your learning has built', hard: 0.4,
  }));

  return out;
}

export const GROUPS = Object.freeze([
  { key: 'words', name: 'Words', craft: 'amber' },
  { key: 'reading', name: 'Reading', craft: 'ink' },
  { key: 'verbal', name: 'Verbal', craft: 'thread' },
  { key: 'pace', name: 'Pace', craft: 'ember' },
]);

/**
 * The sets worth showing first: the ones closest to finishing that are
 * not finished, then the ones just begun. Never a wall — `n` of them.
 */
export function closest(all, n = 6) {
  const open = all.filter((c) => !c.done && c.total > 0);
  return open
    .sort((a, b) => {
      // Distance to done, plus a penalty for difficulty. Two Elite
      // passages left is not "nearly finished" in any useful sense, and
      // sending a learner there before Foundation is done is bad teaching
      // wearing a near-miss for a hat. Sets already begun come first.
      const ap = a.left + a.hard * 6 + (a.started ? 0 : 1000);
      const bp = b.left + b.hard * 6 + (b.started ? 0 : 1000);
      return ap - bp || b.p - a.p;
    })
    .slice(0, n);
}

/**
 * The sets that crossed from unfinished to finished between two states.
 * This is the moment the whole idea of a collection exists for: not a
 * percentage moving, but "that one is done now".
 */
export function newlyFinished(before, after, content) {
  if (!before || !after) return [];
  let was;
  try { was = new Set(collections(before, content).filter((c) => c.done).map((c) => c.id)); } catch { return []; }
  try { return collections(after, content).filter((c) => c.done && !was.has(c.id)); } catch { return []; }
}

/** How many sets are finished, and out of how many. */
export function tally(all) {
  return { done: all.filter((c) => c.done).length, total: all.filter((c) => c.total > 0).length };
}
