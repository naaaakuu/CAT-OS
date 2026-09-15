/**
 * next.js — the one learning activity each building offers right now.
 *
 * When the learner taps the Reading House, the popover must say START and
 * mean it: not "go to a page with shelves", but "this passage, chosen for
 * you, about five minutes". The curator already decides what the next
 * passage, set or family should be; this module asks it on the village's
 * behalf and turns the answer into a route and two lines.
 */

import { nextPassage, nextVerbal, nextFamily, readingWeakness, missedQuestions } from '../world/curator.js';
import { STAGE_INFO } from '../core/learning/journey.js';

/**
 * @param {string} buildingId  reading | garden | roots | loom | road
 * @param {object} world       { content, records, state } from loadWorld
 * @param {object} [opts]      { first: boolean }  the very first passage should be short
 * @returns {{ href, label, sub, minutes, kind } | null}
 */
export function nextActivity(buildingId, world, opts = {}) {
  const { content, records, state } = world;
  try {
    if (buildingId === 'reading') {
      const rd = state.reading;
      if (opts.first || rd.read === 0) {
        const p = [...(content.rc ?? [])].filter((x) => x.stage === 'foundation').sort((a, b) => (a.word_count ?? 999) - (b.word_count ?? 999))[0] ?? content.rc?.[0];
        if (!p) return null;
        return { href: `#/rc/session/${p.id}`, label: p.title, sub: `${p.question_count ?? 3} questions · about ${Math.max(3, Math.round(p.estimated_time_min ?? 4))} min`, minutes: Math.round(p.estimated_time_min ?? 4), kind: 'first' };
      }
      const weakness = readingWeakness(records.sessions);
      const missed = missedQuestions(records.sessions, weakness);
      if (missed.length >= 4) return { href: '#/rc/second-look', label: 'The second look', sub: `${Math.min(6, missed.length)} questions that got away · about 5 min`, minutes: 5, kind: 'retry' };
      const rec = nextPassage(content, rd.best, weakness, `rc:${state.today}`);
      if (!rec) return null;
      const it = rec.item;
      return { href: `#/rc/session/${it.id}`, label: it.title, sub: `${STAGE_INFO[it.stage]?.label ?? it.stage ?? ''} · ${it.question_count} questions · about ${it.estimated_time_min} min`, minutes: it.estimated_time_min, kind: rec.kind, why: rec.why };
    }
    if (buildingId === 'garden') {
      const m = state.meadow, p = state.pond;
      const due = (m.due ?? 0) + (p.due ?? 0);
      const region = (p.due ?? 0) > (m.due ?? 0) ? 'pond' : 'meadow';
      return { href: `#/round/${region}`, label: due >= 5 ? 'The words that are fading' : region === 'pond' ? 'Twelve look-alike twins' : 'Twelve words, chosen for you', sub: due >= 5 ? `${due} words are due · about 2 min` : 'Some inside a real sentence · about 2 min', minutes: 2, kind: due >= 5 ? 'retry' : 'new' };
    }
    if (buildingId === 'roots') {
      const rw = state.rootwood;
      const pick = nextFamily(rw);
      const f = pick?.family ?? rw.families[0];
      if (!f) return null;
      return { href: `#/garden/session/${f.id}`, label: pick?.kind === 'due' ? `Revisit ${f.label}` : `Grow ${f.label}`, sub: `${f.origin} · “${f.meaning}” · ${f.memberCount} words · about 4 min`, minutes: 4, kind: pick?.kind ?? 'new', why: pick?.why };
    }
    if (buildingId === 'loom') {
      const rec = nextVerbal(content.pj, records.sessions, 'pj', `loom:${state.today}`);
      if (!rec) return { href: '#/world/place/loom', label: 'A set at the Loom', sub: 'Jumbles, summaries, the odd one out', minutes: 5, kind: 'new' };
      const it = rec.item;
      /* `#/pj/session/<tier>` plays the WHOLE tier in order, not one jumble
         (para-jumbles/screens/session.js resolves a tier to every item in
         it). Costing the button from a single item's estimated_time_sec
         told the learner "about 1 min" before a timed set of nine to twelve
         — wrong by more than an order of magnitude, on a screen whose whole
         contract is "the skill, the title, the minutes, one button". A set
         abandoned halfway records nothing, so the number has to be honest
         before they tap. */
      const inSet = it.tier ? content.pj.filter((x) => x.tier === it.tier) : [it];
      const secs = inSet.reduce((s, x) => s + (x.estimated_time_sec ?? 80), 0);
      const mins = Math.max(1, Math.round(secs / 60));
      const tierWord = String(it.tier ?? '').replace('-', ' ');
      const sub = inSet.length > 1
        ? `${tierWord} · ${inSet.length} jumbles · about ${mins} min`
        : `${tierWord} · about ${mins} min`;
      return { href: `#/pj/session/${it.tier ?? it.id}`, label: it.title, sub, minutes: mins, kind: rec.kind, why: rec.why };
    }
    if (buildingId === 'road') {
      return { href: '#/world/place/wilds', label: 'Run the Gauntlet', sub: 'Everything at once, fast · about 8 min', minutes: 8, kind: 'new' };
    }
  } catch { /* the place screen is always a fallback */ }
  return null;
}
