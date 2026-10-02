/**
 * rewards.js — what a finished run did for its pet, drawn the same way on
 * every result: the host pet hopping, the gifts it made counted up, the
 * ring bonus when its supplier was happy, a new heart and the story line
 * it opens, and a treasure that just became makeable.
 *
 * `petBlock` is the shared markup (result.js uses it full size); the
 * learning rooms outside the world (pj, ps, ooo, wd, the banks) end on
 * `worldReward`, a compact strip of the same thing.
 */

import { verbalStars } from './economy.js';
import { play } from './audio.js';
import { loadWorld, deriveWorldState, petChangeLine, newlyAffordable } from './state.js';
import { PET_BY_ID, GIFTS, GIFT_KEYS, STORIES, petForModule, supplierOf } from '../pets/pets.js';
import { petSprite, giftIcon, FRAME } from '../pets/sprite.js';
import { motionReduced } from '../core/engagement/feedback.js';
import { escapeHTML } from '../core/utils/format.js';

const REGION_OF = { pj: 'loom', ps: 'table', ooo: 'bench', wd: 'terraces', sp: 'loom', pc: 'table', cr: 'reading-room', wb: 'meadow' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** One run's gifts when the world could not be read: the spec's base, no ring. */
export function baseGifts(pet, stars, flawless) {
  const p = PET_BY_ID.get(pet);
  return p ? { [p.gift]: Math.max(1, Math.min(3, stars ?? 0)) + (flawless ? 1 : 0) } : {};
}

/**
 * The pet block.
 * @param {{pet, gifts?, doubled?, heart?, hearts?, treasure?}} c
 * @param {{compact?: boolean, lead?: string}} o  lead: html placed above the gift line (the strip's stars)
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

/** The lines under the pet: what it made, the ring, the heart, the treasure. */
export function giftLines(c) {
  const p = PET_BY_ID.get(c?.pet);
  if (!p || !c.gifts) return '';
  const n = c.gifts[p.gift] ?? 0;
  const g = GIFTS[p.gift];
  const word = n === 1 ? cap(g.one) : g.name;
  // Any other gift moving in the same run can only be the day's wish bonus.
  const others = GIFT_KEYS.filter((k) => k !== p.gift && (c.gifts[k] ?? 0) > 0);
  if (!n && !others.length) return '';
  const sup = PET_BY_ID.get(supplierOf(p.id));
  const supGift = sup ? GIFTS[sup.gift].name.toLowerCase() : '';
  const t = c.treasure;
  const tName = t ? t.name.replace(/^(The|A) /, '').replace(/^./, (x) => x.toLowerCase()) : '';
  return `
    <p class="pvwin__line"><span class="sr-only">${n} ${escapeHTML(word)} from ${p.name}.</span><span class="pvwin__chip" data-to="${n}" aria-hidden="true">${giftIcon(p.gift, 26)}<b>+<span data-n>0</span></b></span> <span aria-hidden="true">${escapeHTML(word)} from ${p.name}</span></p>
    ${others.length ? `<p class="pvwin__more">All three wishes done: one of every gift. <span class="pvwin__minis" aria-hidden="true">${others.map((k) => `<span class="pvwin__chip pvwin__chip--mini" data-to="${c.gifts[k]}">${giftIcon(k, 16)}<b>+<span data-n>0</span></b></span>`).join('')}</span></p>` : ''}
    ${c.doubled && sup ? `<p class="pvwin__ring">${sup.name}’s ${supGift} ${sup.gift === 'stardust' ? 'was' : 'were'} fresh: double ${g.name.toLowerCase()}.</p>` : ''}
    ${c.heart ? `<p class="pvwin__heart"><span aria-hidden="true">♥</span> A new heart with ${p.name}.</p>${STORIES[p.id]?.[c.hearts - 1] ? `<p class="pvwin__story"><i>${escapeHTML(STORIES[p.id][c.hearts - 1])}</i></p>` : ''}` : ''}
    ${t ? `<p class="pvwin__treasure">There is enough for the ${escapeHTML(tName)}. <a href="#/world">Make it from your satchel in the village.</a></p>` : ''}`;
}

/** Roll every gift chip inside `root` up to its number, a soft chime each. */
export function countGifts(root, reduce = motionReduced()) {
  const els = [...(root?.querySelectorAll('.pvwin__chip[data-to]') ?? [])];
  els.forEach((el, i) => setTimeout(() => countUp(el, reduce), reduce ? 0 : i * 240));
}

function countUp(el, reduce) {
  if (!el?.isConnected) return;
  const to = Number(el.dataset.to || 0);
  const out = el.querySelector('[data-n]');
  el.classList.add('is-in');
  play('ink');
  if (reduce || to <= 0) { out.textContent = String(to); return; }
  const dur = Math.min(900, 260 + to * 60);
  const t0 = performance.now();
  const step = (t) => {
    if (!el.isConnected) return;
    const p = Math.min(1, (t - t0) / dur);
    out.textContent = String(Math.round(to * (1 - (1 - p) ** 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * What one saved run did for its pet: the world derived with and without
 * the record `id` (a session or a learning record), so gifts, the ring,
 * a heart and a treasure are exactly what the village will show.
 * @returns {Promise<{pet, gifts, doubled, heart, hearts, treasure} | null>}
 */
export async function petChangeFor(storage, id) {
  const { content, records, state } = await loadWorld(storage);
  const without = {
    sessions: records.sessions.filter((r) => r?.id !== id),
    learning: records.learning.filter((r) => r?.id !== id),
  };
  const before = deriveWorldState(content, without, state.now);
  const change = petChangeLine(before, state);
  return change ? { ...change, treasure: newlyAffordable(before, state) } : null;
}

/**
 * The strip at the end of a verbal room's mentor moment.
 * @param {object} session  the stored session record (module, score, duration_ms, item_ids)
 * @param {Array}  items    the loaded items played (for their estimated_time_sec)
 * @param {{storage?: object}} [o]  with storage, the exact gifts are filled in once the world is read
 * @returns {{ region, stars, pet, html }}
 */
export function worldReward(session, items = [], { storage = null } = {}) {
  const region = session.region ?? REGION_OF[session.module] ?? 'loom';
  const pet = petForModule(session.module) ?? 'ginger';
  const targetSec = session.target_sec ?? (items.reduce((n, it) => n + (it?.meta?.estimated_time_sec ?? it?.time_sec ?? 90), 0) || 90 * (session.score?.total ?? 1));
  const res = session.module === 'wd' ? { stars: session.score?.correct ? Math.min(3, 1 + session.score.correct) : 0, flawless: false } : verbalStars(session, targetSec);
  const stars = res.stars;
  const p = PET_BY_ID.get(pet);
  const key = `rw-${String(session.id ?? Date.now()).replace(/[^\w-]/g, '')}`;
  const lead = `
    <div class="pvwin__lead">
      <span class="world-reward__stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></span>
      <span class="world-reward__title">${stars === 3 ? 'Accurate and in time.' : stars === 2 ? 'Accurate, over time.' : stars === 1 ? 'Completed, with a few that got away.' : 'Not yet.'}</span>
    </div>`;
  const fallback = { pet, gifts: baseGifts(pet, stars, res.flawless) };
  const html = `
    <div class="world-reward" role="status" id="${key}">
      ${petBlock({ pet }, { compact: true, lead })}
      ${p ? `<p class="world-reward__line">${p.name} takes these home to ${p.home}.</p>` : ''}
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
      .then((c) => fill(c && c.pet === pet && Object.values(c.gifts).some((n) => n > 0) ? c : fallback))
      .catch(() => fill(fallback));
  } else fill(fallback);
  return { region, stars, pet, html };
}
