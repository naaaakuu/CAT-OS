/**
 * sideshows.js — the two houses with no rope: Matcha's Glasshouse (ten words,
 * two good recalls each) and Toffee's Gauntlet (thirty words in three
 * minutes, the same thirty all week).
 *
 * Neither is a duel, so a player who only ever presses PLAY would never see
 * them again. This is what ties them to the game without making them bigger
 * than they are in the exam: a day's ten words and a week's run each leave a
 * letter (the game's own reward), and the bill and the result screen keep a
 * door open to whichever one is still owed. Vocabulary is never asked
 * directly in the paper, so they stay side shows, not posters.
 *
 * Pure: no DOM, no storage. Everything is derived from saved records.
 */

import { dayKey, weekKey } from '../core/engagement/streaks.js';

export const GLASSHOUSE_HREF = '#/world/place/meadow';
export const GAUNTLET_HREF = '#/world/place/wilds';
/* A long history arrives two letters at a time, never as a heap. */
const WAITING_AT_ONCE = 2;

const when = (r) => (r && typeof r.finished_at === 'string' && Number.isFinite(Date.parse(r.finished_at)) ? Date.parse(r.finished_at) : null);
const isGlasshouseRound = (r) => !!r && r.kind === 'lex-round' && r.greenhouse === true && when(r) !== null;
const isGauntletRun = (r) => !!r && r.kind === 'gauntlet-run' && typeof r.week === 'string' && when(r) !== null && (r.score?.answered ?? 0) > 0;

/**
 * Every letter the two side shows have ever earned, oldest first, capped so
 * that at most two of each are waiting at once. The caller removes the opened.
 * One per day from the Glasshouse, one per week from the Gauntlet: a second
 * visit is still practice, it just is not paid twice.
 */
export function sideLetters(learning) {
  const list = (Array.isArray(learning) ? learning : []).filter((r) => r && typeof r === 'object');
  const opened = new Set(list.filter((r) => r.kind === 'letter-open').map((r) => r.letter_id));
  const out = [];
  const add = (rows, keyOf, idOf, grade, from) => {
    const seen = new Set();
    let waiting = 0;
    for (const r of [...rows].sort((a, b) => when(a) - when(b))) {
      const key = keyOf(r);
      if (seen.has(key)) continue;
      seen.add(key);
      const id = idOf(key);
      if (opened.has(id) || waiting >= WAITING_AT_ONCE) continue;
      waiting += 1;
      out.push({ id, grade, from, at: r.finished_at });
    }
  };
  add(list.filter(isGlasshouseRound), (r) => dayKey(when(r)), (k) => `glasshouse-${k}`, 'wax', 'glasshouse');
  add(list.filter(isGauntletRun), (r) => r.week, (k) => `gauntlet-${k}`, 'silver', 'gauntlet');
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/**
 * Where the learner stands with both side shows, right now.
 * @returns {{glasshouse:{rooted:number,yellow:number,today:boolean}, gauntlet:{week:string,ran:boolean,runs:number,best:{correct:number,total:number}|null}}}
 */
export function sideShows(learning, now = Date.now()) {
  const list = (Array.isArray(learning) ? learning : []).filter((r) => r && typeof r === 'object');
  const today = dayKey(now), week = weekKey(new Date(now));
  let rooted = 0, yellow = 0;
  for (const r of list) {
    if (r.kind !== 'lex-mastery' || r.region !== 'meadow') continue;
    const due = r.next_at ? Date.parse(r.next_at) <= now : false;
    if ((r.level ?? 0) >= 2) rooted += 1;
    // The Glasshouse's own rule for a yellow leaf (world/greenhouse.js leafState).
    if (!((r.level ?? 0) >= 2 && !due)) yellow += 1;
  }
  const runs = list.filter(isGauntletRun);
  const best = [...runs].sort((a, b) => (b.score?.correct ?? 0) - (a.score?.correct ?? 0) || (a.duration_ms ?? 0) - (b.duration_ms ?? 0))[0] ?? null;
  return {
    glasshouse: { rooted, yellow, today: list.some((r) => isGlasshouseRound(r) && dayKey(when(r)) === today) },
    gauntlet: { week, ran: runs.some((r) => r.week === week), runs: runs.length, best: best ? { correct: best.score?.correct ?? 0, total: best.score?.total ?? 0 } : null },
  };
}

/**
 * The one door a finished duel holds open, or none. Not before the third
 * duel (a new player is still learning PLAY), never both at once, and only
 * while its letter is still unearned, so the line is always true. When both
 * are owed they take turns, so neither is the one that gets forgotten.
 * @param {ReturnType<typeof sideShows>} shows
 * @param {number} duels how many duels have been played
 * @returns {{id:string, href:string, friend:string, title:string, line:string, go:string}|null}
 */
export function sideDoor(shows, duels) {
  if (!shows || duels < 3) return null;
  const g = shows.glasshouse, t = shows.gauntlet;
  const glasshouse = () => ({
    id: 'glasshouse', href: GLASSHOUSE_HREF, friend: 'matcha', title: 'Matcha\'s Glasshouse', go: 'Grow ten words',
    line: g.yellow >= 3 ? `${g.yellow} of your words have yellow leaves. Ten words today and Matcha leaves you a letter.` : 'Ten words, two good recalls each. Today\'s visit leaves you a letter.',
  });
  const gauntlet = () => ({
    id: 'gauntlet', href: GAUNTLET_HREF, friend: 'toffee', title: 'Toffee\'s Gauntlet', go: 'Run the Gauntlet',
    line: t.best ? `Thirty words in three minutes. Your best is ${t.best.correct} of ${t.best.total}. This week's run pays a silver-sealed letter.` : 'Thirty words in three minutes. This week\'s run pays a silver-sealed letter.',
  });
  if (!g.today && !t.ran) return duels % 2 ? glasshouse() : gauntlet();
  if (!g.today) return glasshouse();
  if (!t.ran) return gauntlet();
  return null;
}
