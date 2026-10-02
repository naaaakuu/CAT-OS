/**
 * rewards.js — what a finished run did, drawn the same way at the end of
 * every room: the friend hopping, "You helped Chai!" with the stars counted
 * up, their thank-you, the village level filling, a new heart and what it
 * puts on their home, a new level, and today's three.
 *
 * `petBlock` is the shared markup (result.js uses it full size); the
 * learning rooms outside the world (pj, ps, ooo, wd, the banks) end on
 * `worldReward`, a compact strip of the same thing.
 */

import { verbalStars } from './economy.js';
import { play } from './audio.js';
import { loadWorld, deriveWorldState, petChangeLine } from './state.js';
import { PET_BY_ID, STORIES, HOME_GIFTS, petForModule, lineFor } from '../pets/pets.js';
import { starsFor } from '../pets/economy.js';
import { petSprite, FRAME } from '../pets/sprite.js';
import { motionReduced } from '../core/engagement/feedback.js';
import { escapeHTML } from '../core/utils/format.js';

const REGION_OF = { pj: 'loom', ps: 'table', ooo: 'bench', wd: 'terraces', sp: 'loom', pc: 'table', cr: 'reading-room', wb: 'meadow' };
const STAR = '<svg class="cw-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.5l-6 3.2 1.3-6.6L2.4 9.5l6.7-.8z" fill="#F4C443" stroke="#B88A12" stroke-width="1.2" stroke-linejoin="round"/></svg>';

/** One run's stars when the village could not be read: what the run itself earns. */
export function baseGifts(pet, stars, flawless) {
  return { pet, earned: starsFor({ stars: Math.max(0, Math.min(3, stars ?? 0)), flawless: flawless === true }) };
}

/**
 * The friend block.
 * @param {{pet, earned?, heart?, hearts?, levelUp?, level?, decor?, gift?, doneCount?}} c
 * @param {{compact?: boolean, lead?: string}} o  lead: html placed above the star line (the strip's stars)
 */
export function petBlock(c, { compact = false, lead = '' } = {}) {
  const p = PET_BY_ID.get(c?.pet);
  if (!p) return '';
  return `
    <div class="pvwin ${compact ? 'pvwin--compact' : ''}" data-pet="${p.id}">
      <div class="pvwin__pet">${petSprite(p.id, { frame: FRAME.happy, size: compact ? 66 : 96 })}</div>
      <div class="pvwin__body">${lead}<div class="pvwin__gifts" data-gifts>${giftLines(c)}</div></div>
    </div>`;
}

/** The lines beside the friend: the stars, the thanks, the level, a heart, today. */
export function giftLines(c) {
  const p = PET_BY_ID.get(c?.pet);
  if (!p || !(c.earned > 0)) return '';
  const L = c.level;
  return `
    <p class="pvwin__line"><span class="sr-only">${c.earned} stars. You helped ${p.name}.</span><span class="pvwin__chip" data-to="${c.earned}" aria-hidden="true">${STAR}<b>+<span data-n>0</span></b></span> <span aria-hidden="true">You helped ${p.name}!</span></p>
    <p class="pvwin__thanks">“${escapeHTML(lineFor(p.id, 'thanks', String(c.earned) + (c.hearts ?? '')))}”</p>
    ${L ? `<p class="pvwin__level"><span>Village level ${L.level}</span><span class="pvwin__bar" aria-hidden="true"><i style="width:${Math.round(L.pct * 100)}%"></i></span><span>${L.need} more ${L.need === 1 ? 'star' : 'stars'} to level ${L.level + 1}</span></p>` : ''}
    ${c.levelUp ? `<p class="pvwin__heart pvwin__big">The village reached level ${L.level}!${c.decor ? ` New on the map: ${escapeHTML(c.decor.name.toLowerCase())}.` : ''}</p>` : ''}
    ${c.heart ? `<p class="pvwin__heart"><span aria-hidden="true">♥</span> A new heart with ${p.name}! ${escapeHTML(HOME_GIFTS[(c.hearts ?? 1) - 1] ?? '')} appears at ${escapeHTML(p.home)}.</p>${STORIES[p.id]?.[c.hearts - 1] ? `<p class="pvwin__story"><i>${escapeHTML(STORIES[p.id][c.hearts - 1])}</i></p>` : ''}` : ''}
    ${typeof c.doneCount === 'number' ? `<p class="pvwin__today">${c.gift ? `All three of today's friends helped: <b>+5 bonus stars</b>. See you tomorrow!` : c.doneCount >= 3 ? 'Today\'s gift is already yours. Every extra round still helps the village.' : c.doneCount ? `Today: ${c.doneCount} of 3 friends helped. ${3 - c.doneCount} more for today's gift.` : 'Help today\'s three friends for a bonus gift.'}</p>` : ''}`;
}

/** Roll every star chip inside `root` up to its number, a bright tick each. */
export function countGifts(root, reduce = motionReduced()) {
  const els = [...(root?.querySelectorAll('.pvwin__chip[data-to]') ?? [])];
  els.forEach((el, i) => setTimeout(() => countUp(el, reduce), reduce ? 0 : i * 240));
}

function countUp(el, reduce) {
  if (!el?.isConnected) return;
  const to = Number(el.dataset.to || 0);
  const out = el.querySelector('[data-n]');
  el.classList.add('is-in');
  if (reduce || to <= 0) { out.textContent = String(to); play('coin'); return; }
  let n = 0;
  const tick = () => {
    if (!el.isConnected) return;
    n += 1; out.textContent = String(n); play('coin');
    if (n < to) setTimeout(tick, 170); else setTimeout(() => play('unlock'), 200);
  };
  tick();
}

/**
 * What one saved run did: the world derived with and without the record
 * `id` (a session or a learning record), so the stars, a heart, a level and
 * today's three are exactly what the village will show.
 * @returns {Promise<ReturnType<typeof petChangeLine> | null>}
 */
export async function petChangeFor(storage, id) {
  const { content, records, state } = await loadWorld(storage);
  const without = {
    sessions: records.sessions.filter((r) => r?.id !== id),
    learning: records.learning.filter((r) => r?.id !== id),
  };
  const before = deriveWorldState(content, without, state.now);
  return petChangeLine(before, state);
}

/**
 * The strip at the end of a verbal room's mentor moment.
 * @param {object} session  the stored session record (module, score, duration_ms, item_ids)
 * @param {Array}  items    the loaded items played (for their estimated_time_sec)
 * @param {{storage?: object}} [o]  with storage, the exact change is filled in once the world is read
 * @returns {{ region, stars, pet, html }}
 */
export function worldReward(session, items = [], { storage = null } = {}) {
  const region = session.region ?? REGION_OF[session.module] ?? 'loom';
  const pet = petForModule(session.module) ?? 'ginger';
  const targetSec = session.target_sec ?? (items.reduce((n, it) => n + (it?.meta?.estimated_time_sec ?? it?.time_sec ?? 90), 0) || 90 * (session.score?.total ?? 1));
  const res = session.module === 'wd' ? { stars: session.score?.correct ? Math.min(3, 1 + session.score.correct) : 0, flawless: false } : verbalStars(session, targetSec);
  const stars = res.stars;
  const key = `rw-${String(session.id ?? Date.now()).replace(/[^\w-]/g, '')}`;
  const lead = `
    <div class="pvwin__lead">
      <span class="world-reward__stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></span>
      <span class="world-reward__title">${stars === 3 ? 'Accurate and in time.' : stars === 2 ? 'Accurate, over time.' : stars === 1 ? 'Completed, with a few that got away.' : 'Not yet, but every round helps.'}</span>
    </div>`;
  const fallback = baseGifts(pet, stars, res.flawless);
  const html = `
    <div class="world-reward" role="status" id="${key}">
      ${petBlock({ pet }, { compact: true, lead })}
    </div>`;
  sessionStorage.setItem('world:focus', region);
  setTimeout(() => { for (let i = 0; i < stars; i += 1) play(`star${i + 1}`, { delay: 0.9 + i * 0.35 }); }, 0);

  const fill = async (c) => {
    let el = null;
    for (let i = 0; i < 40 && !el; i += 1) { el = document.getElementById(key); if (!el) await new Promise((r) => setTimeout(r, 50)); }
    const slot = el?.querySelector('[data-gifts]');
    if (!slot) return;
    slot.innerHTML = giftLines(c);
    setTimeout(() => countGifts(slot), motionReduced() ? 0 : 900 + stars * 350);
  };
  if (storage) {
    petChangeFor(storage, session.id)
      .then((c) => fill(c && c.pet === pet && c.earned > 0 ? c : fallback))
      .catch(() => fill(fallback));
  } else fill(fallback);
  return { region, stars, pet, html };
}
