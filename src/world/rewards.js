/**
 * rewards.js — how a learning room outside the world reports back to it.
 * The verbal crafts (the Loom, the Table, the Bench, the Terraces) keep
 * their own mentor moments; this adds the world's line at the end — the
 * stars the set earned, the Ink, and where the world will look when the
 * learner walks back — without those modules importing world screens.
 */

import { verbalStars, EARN, bagEntries } from './economy.js';
import { play } from './audio.js';

const REGION_OF = { pj: 'loom', ps: 'table', ooo: 'bench', wd: 'terraces' };
const NAME_OF = { loom: 'The Loom', table: 'The Summary Table', bench: 'The Stranger’s Bench', terraces: 'The Vine Terraces' };

/**
 * @param {object} session  the stored session record (module, score, duration_ms, item_ids)
 * @param {Array}  items    the loaded items played (for their estimated_time_sec)
 * @returns {{ region, stars, ink, html }}
 */
export function worldReward(session, items = []) {
  const region = REGION_OF[session.module] ?? 'loom';
  const targetSec = items.reduce((n, it) => n + (it?.meta?.estimated_time_sec ?? 90), 0) || 90 * (session.score?.total ?? 1);
  const res = session.module === 'wd' ? { stars: session.score?.correct ? Math.min(3, 1 + session.score.correct) : 0, accuracy: session.score?.accuracy ?? 0, inTime: true } : verbalStars(session, targetSec);
  const earned = session.module === 'wd' ? EARN.wd(res.stars, session.score?.correct ?? 0) : EARN.verbal(res.stars, session.score?.correct ?? 0, res.flawless === true);
  const won = bagEntries(earned);
  const stars = res.stars;
  const html = `
    <div class="world-reward" role="status">
      <div class="world-reward__stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></div>
      <div class="world-reward__lead">
        <p class="world-reward__title">${stars === 3 ? 'Accurate and in time.' : stars === 2 ? 'Accurate, over time.' : stars === 1 ? 'Completed, with misses.' : 'Not yet.'}</p>
        <p class="world-reward__line">${NAME_OF[region]} remembers this set. <a href="#/world">Back to the valley</a></p>
      </div>
      <span class="world-reward__won">${won.map((c) => `<span class="craft craft--${c.key}"><i></i>+${c.amount}</span>`).join('')}</span>
    </div>`;
  sessionStorage.setItem('world:focus', region);
  sessionStorage.setItem('world:changed', region);
  sessionStorage.setItem('world:change-line', `${NAME_OF[region]}: <b>${stars} star${stars === 1 ? '' : 's'}</b>`);
  // The crafts fly into the purse on the way back, exactly as they do
  // after a round or a passage.
  if (won.length) sessionStorage.setItem('world:earned', JSON.stringify(earned));
  setTimeout(() => { for (let i = 0; i < stars; i += 1) play(`star${i + 1}`, { delay: 0.9 + i * 0.35 }); if (won.length) play('ink', { delay: 0.9 + stars * 0.35 + 0.2 }); }, 0);
  return { region, stars, earned, html };
}
