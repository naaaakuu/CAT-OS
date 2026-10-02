/**
 * cards.js — the village's cards: a pet, the fire, the satchel, the cottage
 * and a letter. One card at a time, a bottom sheet on a phone and a quiet
 * card on the right of a wide screen (home.css). Each card says what is
 * true, offers the one thing worth doing, and keeps the rest a tap away.
 */

import { PETS, PET_BY_ID, GIFTS, GIFT_KEYS, RING, STORIES } from '../pets/pets.js';
import { canMake, TREASURES } from '../pets/economy.js';
import { nextFor, cornersOf } from '../pets/next.js';
import { petSprite, petPortrait, giftIcon, backdropStyle, FRAME } from '../pets/sprite.js';
import { TREASURE_AT } from '../pets/paths.js';
import { saveValley, valleyName, cleanValleyName, nameSuggestions } from '../world/companion.js';
import { musicEnabled, setMusicEnabled, unlock, startMusic } from '../world/audio.js';
import { feedbackPrefs, setFeedbackPref } from '../core/engagement/feedback.js';
import { STORES } from '../core/storage/storage-adapter.js';
import { escapeHTML } from '../core/utils/format.js';

const esc = escapeHTML;
const MOOD_LABEL = { glowing: 'Glowing', happy: 'Happy', missing: 'Missing you', sleepy: 'Sleepy', wilting: 'Wilting', new: 'Waiting to meet you' };
const VERB = { chai: 'Read with Chai', matcha: 'Grow words with Matcha', mochi: 'Find the gist with Mochi', ginger: 'Map a paragraph with Ginger', mallow: 'Spot the odd one with Mallow', toffee: 'Run the Gauntlet with Toffee' };
const HARMONY_LINE = (h, festival, needy) => festival ? 'Every friend is happy. Tonight is a festival night.'
  : h >= 0.6 ? 'The village is warm and humming.'
  : h >= 0.4 ? `Mostly cosy. ${needy} could use a visit.`
  : `The fire is low. ${needy} is missing you most.`;

export function renderCard(card, kind, arg, api) {
  if (kind === 'pet') return petCard(card, arg, api);
  if (kind === 'hearth') return hearthCard(card, arg, api);
  if (kind === 'satchel') return satchelCard(card, api);
  if (kind === 'cottage') return cottageCard(card, api);
  if (kind === 'letter') return letterCard(card, arg, api);
  return null;
}

const close = '<button class="cw-x" data-close aria-label="Close">×</button>';
/** The rotating third wish: any friend's run can grant it. */
const ANY_RUN = new Set(['stars', 'friends', 'flawless']);
const hearts = (n) => `<span class="cw-hearts__row" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => (i < n ? '<i class="on">♥</i>' : '<i>♡</i>')).join('')}</span>`;
const moodBar = (p) => `<div class="cw-mood cw-mood--${p.word}"><span class="cw-mood__bar"><i style="width:${p.isNew ? 30 : Math.max(6, Math.round(p.mood * 100))}%"></i></span><b>${MOOD_LABEL[p.word]}</b></div>`;

/* ------------------------------------------------------------------ */
/* A pet                                                               */
/* ------------------------------------------------------------------ */

function petCard(card, id, api) {
  const def = PET_BY_ID.get(id);
  const p = api.pets.pets.find((x) => x.id === id);
  const sup = PET_BY_ID.get(p.supplier);
  const next = nextFor(id, api.world, { first: p.isNew });
  const corners = cornersOf(id, api.world);
  const g = GIFTS[def.gift];
  const wish = api.pets.wishes.find((w) => w.pet === id && !w.done);
  const unlockedStories = STORIES[id].slice(0, p.hearts);
  card.innerHTML = `
    ${close}
    <div class="cw-card__hero cw-card__hero--${id}" style="${backdropStyle(id)}">
      <span class="cw-card__pet">${petSprite(id, { size: 132, frame: p.word === 'sleepy' || p.word === 'wilting' ? FRAME.sleep : FRAME.happy })}</span>
    </div>
    <p class="cw-eyebrow">${esc(def.subject)}</p>
    <h2 class="cw-card__name">${esc(def.name)} <small>the ${esc(def.creature)}</small></h2>
    ${moodBar(p)}
    <div class="cw-hearts"><span class="sr-only">Friendship: ${p.hearts} of 5 hearts.</span>${hearts(p.hearts)}<small>${p.hearts >= 5 ? 'Best friends' : `${p.toNext} more ${p.toNext === 1 ? 'visit' : 'visits'} to the next heart`}</small></div>
    <blockquote class="cw-say">${esc(p.line)}</blockquote>
    ${wish ? `<p class="cw-wishnote">✦ Today's wish: ${esc(wish.text)}</p>` : ''}
    ${next ? `<a class="cw-go" href="${esc(next.href)}" data-go><span><b>${esc(VERB[id])}</b><small>${esc(next.label)}${next.sub ? ` · ${esc(next.sub)}` : ''}</small></span><i aria-hidden="true">→</i></a>` : ''}
    <div class="cw-ring ${p.full ? 'is-full' : 'is-low'}">
      ${giftIcon(sup.gift, 22)}<p>${esc(p.ring)}</p>
    </div>
    <p class="cw-made">${giftIcon(def.gift, 20)} <span><b>${p.gifts}</b> ${esc(p.gifts === 1 ? g.one : g.name.toLowerCase())} made together · ${esc(def.name)} gives ${esc(g.name.toLowerCase())} to ${esc(PET_BY_ID.get(p.successor).name)}</span></p>
    ${corners.length ? `<details class="cw-more"><summary>More with ${esc(def.name)}</summary><ul>${corners.map((c) => `<li><a href="${esc(c.href)}"><b>${esc(c.label)}</b><small>${esc(c.sub ?? '')}</small></a></li>`).join('')}</ul></details>` : ''}
    ${unlockedStories.length ? `<details class="cw-more cw-story"><summary>${esc(def.name)}'s story · ${unlockedStories.length} of 5</summary><ol>${unlockedStories.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>` : `<p class="cw-story-hint">Make a friend of ${esc(def.name)} and hear a little of their story.</p>`}`;
  card.querySelector('[data-go]')?.addEventListener('click', () => api.play('open'));
}

/* ------------------------------------------------------------------ */
/* The fire: Toffee, the harmony, today's wishes                        */
/* ------------------------------------------------------------------ */

function hearthCard(card, focus, api) {
  const P = api.pets;
  const toffee = P.pets.find((x) => x.id === 'toffee');
  const needy = PET_BY_ID.get(P.neediest).name;
  const ring = RING.map((id, i) => {
    const p = P.pets.find((x) => x.id === id);
    const a = (i / RING.length) * Math.PI * 2 - Math.PI / 2;
    return `<span class="cw-orbit__pet cw-orbit__pet--${p.word}" style="--x:${(50 + Math.cos(a) * 38).toFixed(1)}%;--y:${(50 + Math.sin(a) * 38).toFixed(1)}%;--m:${p.isNew ? 30 : Math.round(p.mood * 100)}" title="${esc(PET_BY_ID.get(id).name)}: ${MOOD_LABEL[p.word]}">${petPortrait(id, 46)}<small>${esc(PET_BY_ID.get(id).name)}</small></span>`;
  }).join('');
  const f = P.flame;
  card.innerHTML = `
    ${close}
    <p class="cw-eyebrow">The fire · kept by Toffee</p>
    <h2 class="cw-card__name">${f.days ? `A ${f.days}-day glow` : 'A fresh fire'}</h2>
    <p class="cw-sub">${f.today ? 'You have kept it today.' : f.days ? 'One visit today keeps it glowing.' : 'One visit to any friend lights it.'}${f.kindling ? ` · ${f.kindling} kindling saved: it will cover a missed day.` : ' Seven days in a row earns kindling, which covers a missed day.'}</p>
    <div class="cw-orbit" role="group" aria-label="How each friend is feeling">
      <span class="cw-orbit__fire" aria-hidden="true"><i></i>${giftIcon('sparks', 54)}</span>
      ${ring}
    </div>
    <p class="cw-harmony">${esc(HARMONY_LINE(P.harmony, P.festival, needy))}</p>
    <h3 class="cw-h3" id="wishes">Today's wishes</h3>
    <ul class="cw-wishes">
      ${P.wishes.map((w) => `<li class="${w.done ? 'is-done' : ''}">${ANY_RUN.has(w.id) ? '<span class="cw-wish__any" aria-hidden="true">✦</span>' : petPortrait(w.pet, 34)}<span>${esc(w.text)}</span>${w.done ? '<b aria-label="granted">✓</b>' : `<a href="${esc(nextFor(w.pet, api.world)?.href ?? w.href)}" aria-label="Go: ${esc(w.text)}">Go</a>`}</li>`).join('')}
    </ul>
    <p class="cw-sub">${P.wishesDone === 3 ? 'All three granted. Every friend gave one extra gift today.' : 'Grant all three and every friend gives one extra gift.'}</p>
    <a class="cw-go" href="#/world/place/wilds" data-go><span><b>Run the Gauntlet with Toffee</b><small>Everything at once, against the clock · about 8 min</small></span><i aria-hidden="true">→</i></a>
    <blockquote class="cw-say cw-say--small">${esc(toffee.line)}</blockquote>`;
  if (focus === 'wishes') requestAnimationFrame(() => card.querySelector('#wishes')?.scrollIntoView({ block: 'start' }));
}

/* ------------------------------------------------------------------ */
/* The satchel: gifts and treasures                                     */
/* ------------------------------------------------------------------ */

function satchelCard(card, api) {
  const P = api.pets;
  const next = P.nextTreasure;
  const can = next ? canMake(P, next.id) : { ok: false, missing: {} };
  card.innerHTML = `
    ${close}
    <p class="cw-eyebrow">Your satchel</p>
    <h2 class="cw-card__name">Gifts from your friends</h2>
    <ul class="cw-gifts">
      ${GIFT_KEYS.map((k) => `<li>${giftIcon(k, 30)}<b>${P.stock[k]}</b><span>${esc(GIFTS[k].name)}</span><small>from ${esc(PET_BY_ID.get(GIFTS[k].pet).name)}</small></li>`).join('')}
    </ul>
    <p class="cw-sub cw-ringline">${RING.map((id) => `<span>${giftIcon(PET_BY_ID.get(id).gift, 16)}${esc(PET_BY_ID.get(id).name)}</span>`).join('<i aria-hidden="true">→</i>')}</p>
    <p class="cw-sub">Each friend works twice as fast while the friend before them is happy. Keep everyone visited and the gifts double all the way round.</p>
    <h3 class="cw-h3">Treasures for the village</h3>
    ${next ? `
    <div class="cw-treasure-next">
      <p class="cw-treasure-next__name">${esc(next.name)}</p>
      <p class="cw-sub">${esc(next.appears)}</p>
      <ul class="cw-recipe">${Object.entries(next.recipe).map(([k, n]) => `<li class="${P.stock[k] >= n ? 'is-ok' : ''}">${giftIcon(k, 20)}<b>${Math.min(P.stock[k], n)}/${n}</b><span class="sr-only">${esc(GIFTS[k].name)}</span></li>`).join('')}</ul>
      <button class="cw-make" data-make="${esc(next.id)}" ${can.ok ? '' : 'disabled'}>${can.ok ? `Make the ${esc(next.name.toLowerCase())}` : `Needs ${Object.entries(can.missing).map(([k, n]) => `${n} more ${esc(n === 1 ? GIFTS[k].one : GIFTS[k].name.toLowerCase())}`).join(', ')}`}</button>
    </div>` : '<p class="cw-sub">Every treasure is made. The village has never looked lovelier.</p>'}
    <ul class="cw-treasure-list">${P.treasures.map((t) => `<li class="${t.made ? 'is-made' : t.next ? 'is-next' : ''}"><i aria-hidden="true">${t.made ? '✓' : t.next ? '✦' : '·'}</i>${t.made || t.next ? esc(t.name) : 'Something lovely'}</li>`).join('')}</ul>`;
  card.querySelector('[data-make]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget, id = btn.dataset.make;
    btn.disabled = true;
    try {
      await api.refresh();
      if (!canMake(api.pets, id).ok) { satchelCard(card, api); card.focus({ preventScroll: true }); return; }
      const at = new Date().toISOString();
      await api.storage.put(STORES.LEARNING, { id: `village-treasure-${id}-${Date.now()}`, kind: 'village-treasure', treasure: id, at });
      await api.refresh();
      api.play('unlock');
      api.close();
      api.sparkleTreasure(id);
      const t = TREASURES.find((x) => x.id === id);
      api.toast(`<b>${esc(t.name)}</b> — ${esc(t.appears)}`, 6000);
      for (const p of PETS) setTimeout(() => api.celebrate(p.id), 200 + Math.random() * 900);
    } catch (err) {
      console.error('[CAT OS] could not make the treasure', err);
      btn.disabled = false;
    }
  });
}

/* ------------------------------------------------------------------ */
/* The cottage: your name, sound, the other rooms                       */
/* ------------------------------------------------------------------ */

function cottageCard(card, api) {
  const prefs = feedbackPrefs();
  const name = valleyName(api.valley);
  const named = !!api.valley?.name;
  card.innerHTML = `
    ${close}
    <div class="cw-card__hero cw-card__hero--cottage" style="${backdropStyle('cottage')}" aria-hidden="true"></div>
    <p class="cw-eyebrow">Your cottage</p>
    <h2 class="cw-card__name">${esc(name)}</h2>
    <form class="cw-name" data-name>
      <label for="cw-name-in">${named ? 'Rename your village' : 'Give your village a name'}</label>
      <div class="cw-name__row"><input id="cw-name-in" maxlength="28" autocomplete="off" placeholder="${esc(nameSuggestions()[0])}" value="${named ? esc(api.valley.name) : ''}"><button>Save</button></div>
      <p class="cw-name__ideas">${nameSuggestions().map((n) => `<button type="button" data-idea="${esc(n)}">${esc(n)}</button>`).join('')}</p>
    </form>
    <div class="cw-toggles">
      <button class="cw-toggle" data-music aria-pressed="${musicEnabled()}"><span>Music and ambience</span><i aria-hidden="true"></i></button>
      <button class="cw-toggle" data-sfx aria-pressed="${prefs.sfx}"><span>Sound effects</span><i aria-hidden="true"></i></button>
    </div>
    <nav class="cw-rooms" aria-label="The other rooms">
      <a href="#/growth"><b>The clock tower</b><small>How far you have come, subject by subject</small><i aria-hidden="true">→</i></a>
      <a href="#/world/place/hearth"><b>Records</b><small>Your days, stars and treasures</small><i aria-hidden="true">→</i></a>
      <a href="#/settings"><b>Settings</b><small>Reading size, theme, motion, backup and restore</small><i aria-hidden="true">→</i></a>
    </nav>
    <p class="cw-sub">Everything you learn stays on this device, and the village works offline once it has finished downloading.</p>`;
  const form = card.querySelector('[data-name]'), input = card.querySelector('#cw-name-in');
  for (const b of card.querySelectorAll('[data-idea]')) b.addEventListener('click', () => { input.value = b.dataset.idea; input.focus(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clean = cleanValleyName(input.value);
    if (!clean) { input.focus(); return; }
    try { const v = await saveValley(api.storage, { name: clean }); api.setValley(v); api.play('place'); cottageCard(card, api); card.querySelector('.cw-name input')?.focus({ preventScroll: true }); api.toast(`Welcome to <b>${esc(clean)}</b>.`); } catch (err) { console.error('[CAT OS] could not save the name', err); }
  });
  const music = card.querySelector('[data-music]'), sfx = card.querySelector('[data-sfx]');
  music.addEventListener('click', async () => {
    const on = music.getAttribute('aria-pressed') !== 'true';
    music.setAttribute('aria-pressed', String(on));
    if (on) { unlock(); startMusic('world', { hour: api.world.state.atmo.hour, warmth: api.pets.harmony }); }
    try { await setMusicEnabled(on); } catch { music.setAttribute('aria-pressed', String(musicEnabled())); }
  });
  sfx.addEventListener('click', async () => {
    const on = sfx.getAttribute('aria-pressed') !== 'true';
    sfx.setAttribute('aria-pressed', String(on));
    try { await setFeedbackPref(api.storage, 'sfx', on); } catch { sfx.setAttribute('aria-pressed', String(feedbackPrefs().sfx)); }
  });
}

/* ------------------------------------------------------------------ */
/* A letter                                                            */
/* ------------------------------------------------------------------ */

function letterCard(card, letter, api) {
  const def = PET_BY_ID.get(letter.pet);
  const next = nextFor(letter.pet, api.world);
  card.innerHTML = `
    ${close}
    <div class="cw-letter-card">
      <span class="cw-card__pet">${petSprite(letter.pet, { size: 110, frame: FRAME.happy })}</span>
      <p class="cw-eyebrow">A letter on the notice board</p>
      <h2 class="cw-card__name">From ${esc(def.name)}</h2>
      <p class="cw-letter-text">${esc(letter.text)}</p>
      <p class="cw-letter-sign">— ${esc(def.name)}</p>
    </div>
    ${next ? `<a class="cw-go" href="${esc(next.href)}" data-go><span><b>${esc(VERB[letter.pet])}</b><small>${esc(next.label)}</small></span><i aria-hidden="true">→</i></a>` : ''}`;
}

/* ------------------------------------------------------------------ */
/* Treasures, drawn on the map                                          */
/* ------------------------------------------------------------------ */

const FLAGS = ['#C2643F', '#EDBE66', '#8FB3C9', '#F6EEDB', '#7FA65A', '#D98B7A'];
const LANTERN = ['#D9603A', '#E9A23B', '#D97A8A', '#7FA65A'];

/** The made treasures as markup for .cw-treasures (painting pixels). */
export function treasureLayer(pets) {
  const made = new Set(pets.treasures.filter((t) => t.made).map((t) => t.id));
  const T = TREASURE_AT;
  let html = '';
  const wrap = (id, inner, x, y, w, h) => `<div class="cw-treasure cw-treasure--${id}" data-t="${id}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${inner}</div>`;
  if (made.has('bunting')) {
    for (const [a, b] of T.bunting) {
      const w = b.x - a.x, sag = 30, n = 11;
      let flags = '';
      for (let i = 1; i < n; i += 1) {
        const t = i / n, x = w * t, y = 4 + 4 * sag * t * (1 - t);
        flags += `<path d="M${(x - 7).toFixed(1)} ${(y - 1).toFixed(1)} L${(x + 7).toFixed(1)} ${(y + 1).toFixed(1)} L${x.toFixed(1)} ${(y + 16).toFixed(1)} Z" fill="${FLAGS[i % FLAGS.length]}" stroke="#5a4130" stroke-width=".9" stroke-linejoin="round"/>`;
      }
      html += wrap('bunting', `<svg viewBox="0 0 ${w} 60" width="${w}" height="60"><path d="M0 4 Q ${w / 2} ${4 + 2 * sag} ${w} 4" fill="none" stroke="#5a4130" stroke-width="1.4"/>${flags}</svg>`, a.x, a.y - 4, w, 60);
    }
  }
  if (made.has('lanterns')) {
    T.lanterns.forEach((p, i) => {
      html += wrap('lanterns', `<svg viewBox="0 0 30 46" width="30" height="46"><line x1="15" y1="0" x2="15" y2="10" stroke="#4a3626" stroke-width="1.2"/><rect x="10" y="9" width="10" height="3" rx="1" fill="#4a3626"/><ellipse cx="15" cy="24" rx="11" ry="13" fill="${LANTERN[i % 4]}" stroke="#4a3626" stroke-width="1.2"/><path d="M15 11 Q 7 24 15 37 M15 11 Q 23 24 15 37" fill="none" stroke="#4a3626" stroke-width=".8" opacity=".55"/><rect x="10" y="36" width="10" height="3" rx="1" fill="#4a3626"/><line x1="15" y1="39" x2="15" y2="45" stroke="#C2643F" stroke-width="1.6"/></svg><i class="cw-treasure__glow"></i>`, p.x - 15, p.y - 4, 30, 46);
    });
  }
  if (made.has('flowers')) {
    T.flowers.forEach((p, i) => {
      const c = ['#E7A79C', '#F1E2C2', '#E2B65C', '#BBA3CB', '#D98B7A'];
      let blooms = '<ellipse cx="30" cy="34" rx="26" ry="7" fill="#5E8A3C" opacity=".55"/>';
      for (let k = 0; k < 7; k += 1) {
        const x = 8 + ((k * 37 + i * 11) % 44), y = 18 + ((k * 23 + i * 7) % 14), col = c[(k + i) % c.length];
        blooms += `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-3.4" rx="2.4" ry="3.4" fill="${col}" stroke="#7a5a48" stroke-width=".5" transform="rotate(${r})"/>`).join('')}<circle r="1.8" fill="#E9A23B"/></g>`;
      }
      html += wrap('flowers', `<svg viewBox="0 0 60 42" width="48" height="34">${blooms}</svg>`, p.x - 24, p.y - 20, 48, 34);
    });
  }
  if (made.has('fireflies')) {
    T.fireflies.forEach((p) => {
      html += wrap('fireflies', `<svg viewBox="0 0 26 34" width="26" height="34"><rect x="6" y="2" width="14" height="5" rx="1.5" fill="#8a6a44" stroke="#4a3626" stroke-width="1"/><path d="M5 8h16v18a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5z" fill="rgba(255,244,200,.42)" stroke="#4a3626" stroke-width="1.1"/><circle cx="10" cy="17" r="1.6" fill="#E8F59A"/><circle cx="15.5" cy="22" r="1.4" fill="#E8F59A"/><circle cx="13" cy="13" r="1.2" fill="#E8F59A"/></svg><i class="cw-treasure__glow"></i>`, p.x - 13, p.y - 30, 26, 34);
    });
  }
  if (made.has('swing')) {
    const p = T.swing;
    html += wrap('swing', `<svg class="cw-swing" viewBox="0 0 70 130" width="70" height="130"><g class="cw-swing__arm"><line x1="17" y1="0" x2="15" y2="112" stroke="#6a4c33" stroke-width="2"/><line x1="53" y1="0" x2="55" y2="112" stroke="#6a4c33" stroke-width="2"/><rect x="9" y="110" width="52" height="7" rx="2.5" fill="#B07A47" stroke="#4a3626" stroke-width="1.2"/></g></svg>`, p.x - 35, p.y - 50, 70, 130);
  }
  if (made.has('chimes')) {
    const p = T.chimes;
    html += wrap('chimes', `<svg class="cw-chimes" viewBox="0 0 40 56" width="40" height="56"><g class="cw-chimes__arm"><line x1="20" y1="0" x2="20" y2="8" stroke="#4a3626" stroke-width="1.2"/><ellipse cx="20" cy="9" rx="15" ry="3" fill="#9a7b4e" stroke="#4a3626" stroke-width="1"/>${[8, 15, 25, 32].map((x, k) => `<line x1="${x}" y1="10" x2="${x}" y2="16" stroke="#4a3626" stroke-width=".7"/><rect x="${x - 1.6}" y="16" width="3.2" height="${22 + (k % 2) * 8}" rx="1.4" fill="#C9D9E6" stroke="#4a3626" stroke-width=".8"/>`).join('')}</g></svg>`, p.x - 20, p.y, 40, 56);
  }
  if (made.has('kite')) {
    const p = T.kite;
    html += wrap('kite', `<svg class="cw-kite" viewBox="0 0 120 170" width="120" height="170"><path d="M60 52 C 30 90, 20 130, -200 300" fill="none" stroke="rgba(70,50,35,.5)" stroke-width="1"/><g class="cw-kite__body"><path d="M60 4 L84 30 L60 56 L36 30 Z" fill="#D97A8A" stroke="#4a3626" stroke-width="1.4" stroke-linejoin="round"/><path d="M60 4 L60 56 M36 30 L84 30" stroke="#4a3626" stroke-width="1"/><path d="M60 4 L84 30 L60 30 Z" fill="#EDBE66"/><path class="cw-kite__tail" d="M60 56 q 8 10 0 20 q -8 10 0 20 q 8 10 0 20" fill="none" stroke="#4a3626" stroke-width="1.2"/>${[66, 86, 106].map((y, k) => `<path d="M${54 + (k % 2) * 4} ${y} l6 4 l-6 4 z" fill="${FLAGS[k]}"/>`).join('')}</g></svg>`, p.x - 60, p.y - 10, 120, 170);
  }
  return html;
}
