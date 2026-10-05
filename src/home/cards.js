/**
 * cards.js — the village's cards. One card at a time, a bottom sheet on a
 * phone and a card on the right of a wide screen (home.css). Each card says
 * what is true in plain words and offers the one thing worth doing:
 *
 *   pet      a friend: who they are, what they teach, your level, the big
 *            Help button, Achievements; the rest sits under "More about"
 *   fire     Toffee's fire: the days in a row, the week, spare logs, the Gauntlet
 *   level    the village level: Glow, and what each level puts on the map
 *   friends  every subject: one row per house, each a tap from its next round
 *   today    today's three friends and their gift
 *   cottage  settings: your village's name, sound, progress (the HUD gear; the
 *            rose cottage on the map is Ginger's Sentence Placement house)
 */

import { PETS, PET_BY_ID, HOUSES, STORIES, HOME_GIFTS, FRIENDSHIPS, AGES, friendshipOf, lineFor, stageTitle, stageGift, ageOf, toGrow } from '../pets/pets.js';
import { DAILY_GIFT } from '../pets/economy.js';
import { GLOW, GLOW_SVG } from '../pets/glow.js';
import { nextFor, cornersOf, noticeFor } from '../pets/next.js';
import { levelFor, achievementsFor } from '../pets/progress.js';
import { petFigure, petPortrait, backdropStyle, FRAME } from '../pets/sprite.js';
import { TREASURE_AT, HOMES } from '../pets/paths.js';
import { saveValley, valleyName, cleanValleyName, nameSuggestions } from '../world/companion.js';
import { musicEnabled, setMusicEnabled, unlock, startMusic, startAmbience } from '../world/audio.js';
import { feedbackPrefs, setFeedbackPref } from '../core/engagement/feedback.js';
import { escapeHTML } from '../core/utils/format.js';

const esc = escapeHTML;
const MOOD_LABEL = { glowing: 'Very happy', happy: 'Happy', missing: 'Misses you', sleepy: 'Sleepy', wilting: 'Lonely', new: 'New friend' };
/** What a round with each friend is, in three words. */
export const ACT = { chai: 'Read a passage', matcha: 'Learn new words', mochi: 'Find the summary', ginger: 'Order the sentences', mallow: 'Spot the odd one out', toffee: 'Weekly Gauntlet' };
const FLAME = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2.6c2.4 3.3 6.2 6.2 6.2 11a6.2 6.2 0 0 1-12.4 0c0-2.7 1.3-4.5 2.7-6 .2 1.6.9 2.9 2.1 3.5-.5-3.1.3-6 1.4-8.5z" fill="#F2A23C" stroke="#7a4a1e" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const STAR = '<svg class="cw-orb" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.5l-6 3.2 1.3-6.6L2.4 9.5l6.7-.8z" fill="#F4C443" stroke="#B88A12" stroke-width="1.2" stroke-linejoin="round"/></svg>';

export function renderCard(card, kind, arg, api) {
  if (kind === 'pet') return petCard(card, arg, api);
  if (kind === 'fire') return fireCard(card, api);
  if (kind === 'level') return levelCard(card, api);
  if (kind === 'friends') return friendsCard(card, api);
  if (kind === 'today') return todayCard(card, api);
  if (kind === 'cottage') return cottageCard(card, api);
  return null;
}

const close = '<button class="cw-x" data-close aria-label="Close">×</button>';

/* ------------------------------------------------------------------ */
/* A friend                                                            */
/* ------------------------------------------------------------------ */

/**
 * The one thing a new player reads on a friend (owner, 2026-10-05: "I
 * practice, I improve, my character grows, my village develops"): how grown
 * up they are, ten steps in three ages, and what the next step takes. The
 * subject's level, where those right answers come from, is the small line
 * under it.
 */
function growBlock(p, L) {
  const age = ageOf(p.stage), def = PET_BY_ID.get(p.id);
  const next = p.stage < 10 ? ` ${toGrow(p.toNext, p.unit)} and ${def.name} grows.` : ' Every last one done!';
  return `<div class="cw-level">
      <p class="cw-level__head"><b>${esc(age.name)}</b><span>Stage ${p.stage} of 10</span></p>
      <span class="cw-level__segs cw-level__segs--ages" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < p.stage ? 'is-on' : i === p.stage ? 'is-now' : ''}${AGES.some((a) => a.from === i) ? ' is-age' : ''}"></i>`).join('')}</span>
      <p class="cw-level__line">${esc(fill(age.line, def) + next)}</p>
      ${L.ladder ? `<p class="cw-level__sub">Level ${L.n} of ${L.of}, ${esc(L.name)}. ${esc(L.line)}</p>` : ''}
      <p class="sr-only">${p.done} of ${p.total} ${p.unit} done.</p>
    </div>`;
}
const fill = (t, def) => t.replace('{name}', def.name);

/** The Achievements button, and the panel it opens: one short line each, for the whole of CAT OS. */
function achievements(id, api) {
  const list = achievementsFor(api.world, api.pets), got = list.filter((a) => a.got).length, pid = `cw-achieve-${id}`;
  return `<button type="button" class="cw-achieve" popovertarget="${pid}">${STAR} Achievements <small>${got} of ${list.length}</small></button>
    <span class="cw-achieve-pop" id="${pid}" popover>
      <h3 class="cw-h3">Achievements <small>${got} of ${list.length}</small></h3>
      <ul class="cw-ach">${list.map((a) => `<li class="${a.got ? 'is-got' : ''}"><span class="cw-ach__mark" aria-hidden="true">${a.got ? '✓' : ''}</span><span><b>${esc(a.title)}</b><small>${esc(a.line)}</small>${a.got || a.goal < 2 ? '' : `<small class="cw-ach__n">${a.have} / ${a.goal}</small>`}</span></li>`).join('')}</ul>
      <button type="button" class="btn btn--block cw-achieve-pop__close" popovertarget="${pid}" popovertargetaction="hide">Close</button>
    </span>`;
}

function petCard(card, id, api) {
  const def = PET_BY_ID.get(id);
  const p = api.pets.pets.find((x) => x.id === id);
  const next = nextFor(id, api.world, { first: p.isNew });
  const notice = noticeFor(id, api.world, next);
  const corners = cornersOf(id, api.world);
  const bff = PET_BY_ID.get(def.bff), friendship = friendshipOf(id);
  const greet = lineFor(id, p.isNew ? 'meet' : p.word, api.pets.today.key);
  const today = api.pets.today, pick = today.picks.includes(id), done = today.helped.includes(id);
  card.innerHTML = `
    ${close}
    <div class="cw-card__hero cw-card__hero--${id}" style="${backdropStyle(id)}">
      <span class="cw-card__pet">${petFigure(id, { size: 132, stage: p.stage, frame: p.word === 'sleepy' || p.word === 'wilting' ? FRAME.idle : FRAME.happy })}</span>
    </div>
    <div class="cw-who">
      <h2 class="cw-card__name">${esc(def.name)}</h2>
      <p class="cw-role">Teaches ${esc(def.subject)}</p>
      <p class="cw-tag">${esc(def.tag)}</p>
    </div>
    ${growBlock(p, levelFor(id, api.world, p))}
    ${next ? `<a class="cw-go" href="${esc(next.href)}" data-go><span><b>Help ${esc(def.name)}</b><small>${esc(ACT[id])}: ${esc(next.label)}${next.sub ? ` · ${esc(next.sub)}` : ''}</small></span><i aria-hidden="true">▶</i></a>` : ''}
    ${achievements(id, api)}
    <details class="cw-more">
      <summary>More about ${esc(def.name)}</summary>
      <p class="cw-status"><span class="cw-moodchip cw-moodchip--${p.word}">${MOOD_LABEL[p.word]}</span></p>
      <p class="cw-say">${esc(`${greet} ${p.request}`)}</p>
      ${notice ? `<p class="cw-notice"><span class="cw-notice__spark" aria-hidden="true">✦</span><span>${esc(notice)}</span></p>` : ''}
      ${pick && !done ? `<p class="cw-pickline"><b>!</b> One of today's three friends. Help ${esc(def.name)} for today's gift.</p>` : ''}
      ${p.stage < 10 ? `<p class="cw-sub">Next stage: <b>${esc(stageGift(id, p.stage + 1))}</b>${p.stage ? `. Now: ${esc(stageTitle(id, p.stage))}` : ''}.</p>` : ''}
      ${corners.length ? `<h3 class="cw-h3">More ways to practice ${esc(def.subject)}</h3><ul class="cw-list">${corners.map((c) => `<li><a href="${esc(c.href)}"><span><b>${esc(c.label)}</b><small>${esc(c.sub ?? '')}</small></span><i aria-hidden="true">›</i></a></li>`).join('')}</ul>` : ''}
      <p class="cw-reward">${GLOW_SVG}<span>Every question you answer earns <b>Glow</b> for the village.${p.hearts < 5 ? ` At stage ${(p.hearts + 1) * 2}: <b>${esc(HOME_GIFTS[p.hearts])}</b> at ${esc(def.home)}.` : ''}</span></p>
      <h3 class="cw-h3">${esc(def.name)}'s story</h3>
      <p class="cw-sub">${esc(def.trouble)}</p>
      <ol class="cw-story">${STORIES[id].map((s, i) => (i < p.hearts ? `<li>${esc(s)}</li>` : `<li class="is-locked"><span aria-hidden="true">♡</span> Stage ${(i + 1) * 2}: grow ${esc(def.name)} to hear this part</li>`)).join('')}</ol>
      ${friendship ? `<div class="cw-bff">${petPortrait(bff.id, 40)}<p><b>Best friend: ${esc(bff.name)}</b><small>${esc(friendship.line)}</small></p></div>` : ''}
    </details>`;
  card.querySelector('[data-go]')?.addEventListener('click', () => api.play('open'));
}

/* ------------------------------------------------------------------ */
/* The fire: Toffee and your days in a row                              */
/* ------------------------------------------------------------------ */

function fireCard(card, api) {
  const P = api.pets;
  const f = P.flame, toffee = P.pets.find((x) => x.id === 'toffee');
  const notice = noticeFor('toffee', api.world, null);
  const dayName = (key) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' });
  card.innerHTML = `
    ${close}
    <div class="cw-card__hero cw-card__hero--toffee" style="${backdropStyle('toffee')}"><span class="cw-card__pet">${petFigure('toffee', { size: 118, stage: toffee.stage, frame: FRAME.happy })}</span></div>
    <div class="cw-who">
      <h2 class="cw-card__name">${f.days ? `${f.days}-day fire` : 'Light your first fire'}</h2>
      <p class="cw-role">Toffee keeps the daily streak and the Gauntlet</p>
      <p class="cw-tag">${esc(PET_BY_ID.get('toffee').tag)}</p>
    </div>
    ${growBlock(toffee, levelFor('toffee', api.world, toffee))}
    <a class="cw-go cw-go--gold" href="#/world/place/wilds" data-go><span><b>The Gauntlet</b><small>The weekly challenge: 30 quick questions in 3 minutes. Beat your best.</small></span><i aria-hidden="true">▶</i></a>
    ${achievements('toffee', api)}
    <details class="cw-more">
      <summary>More about Toffee</summary>
      <ol class="cw-week" aria-label="This week">${f.week.map((d, i) => `<li class="${d.done ? 'is-done' : ''} ${i === 6 ? 'is-today' : ''}"><span aria-hidden="true">${d.done ? FLAME : ''}</span><small>${i === 6 ? 'Today' : dayName(d.key)}</small><b class="sr-only">${d.done ? 'practised' : 'missed'}</b></li>`).join('')}</ol>
      <p class="cw-say">${esc(toffee.request)}</p>
      ${notice ? `<p class="cw-notice"><span class="cw-notice__spark" aria-hidden="true">✦</span><span>${esc(notice)}</span></p>` : ''}
      <ul class="cw-facts">
        <li><b>How it works</b><span>Help any friend, any day, and the fire grows by one day.</span></li>
        <li><b>Spare logs: ${f.kindling}</b><span>Every 7 days in a row, Toffee saves a spare log. It keeps the fire alive if you miss one day.</span></li>
      </ul>
      <h3 class="cw-h3">Toffee's story</h3>
      <ol class="cw-story">${STORIES.toffee.map((s, i) => (i < toffee.hearts ? `<li>${esc(s)}</li>` : `<li class="is-locked"><span aria-hidden="true">♡</span> Stage ${(i + 1) * 2}: keep the fire going to hear this part</li>`)).join('')}</ol>
      <p class="cw-sub"><a href="#/world/place/hearth">Your records</a> · every day, Glow and friend so far.</p>
    </details>`;
  card.querySelector('[data-go]')?.addEventListener('click', () => api.play('open'));
}

/* ------------------------------------------------------------------ */
/* The village level                                                    */
/* ------------------------------------------------------------------ */

function levelCard(card, api) {
  const P = api.pets, L = P.level;
  card.innerHTML = `
    ${close}
    <p class="cw-eyebrow">${esc(valleyName(api.valley))}</p>
    <h2 class="cw-card__name">Village level ${L.level}</h2>
    <div class="cw-levelbar"><span class="cw-levelbar__track"><i style="width:${Math.round(L.pct * 100)}%"></i></span><b>${GLOW_SVG} ${P.glow - L.from} / ${L.to - L.from}</b></div>
    <p class="cw-sub"><b>${L.need} more Glow</b> to level ${L.level + 1}.</p>
    <ul class="cw-facts">
      <li><b>Learn</b><span>Every question you answer earns Glow, one more when you get it right, and a bonus for finishing a set. Speed never counts, and each question pays once a day.</span></li>
      <li><b>Grow</b><span>Each time a friend grows a stage, the village glows ${GLOW.STAGE} brighter. Help all of today's three friends for a gift of ${DAILY_GIFT}, and keep the fire for a little more each day.</span></li>
    </ul>
    <h3 class="cw-h3">What each level brings</h3>
    <ol class="cw-road">${P.decor.map((d) => `<li class="${d.made ? 'is-made' : d === P.nextDecor ? 'is-next' : ''}"><span class="cw-road__lv">Lv ${d.level}</span><span><b>${esc(d.name)}</b><small>${esc(d.appears)}</small></span><i aria-hidden="true">${d.made ? '✓' : d === P.nextDecor ? '★' : ''}</i></li>`).join('')}</ol>`;
}

/* ------------------------------------------------------------------ */
/* Who is who                                                          */
/* ------------------------------------------------------------------ */

/** Every subject in one list, each one tap from its next round (the map's signs say the same thing). */
function friendsCard(card, api) {
  const P = api.pets;
  const start = (h) => (h.place === 'placement' || h.place === 'completion'
    ? `#/bank/session/${h.place === 'placement' ? 'sp' : 'pc'}/next`
    : nextFor(h.pet, api.world, { first: P.pets.find((p) => p.id === h.pet)?.isNew })?.href ?? `#/world/place/${h.place}`);
  card.innerHTML = `
    ${close}
    <p class="cw-eyebrow">CAT VARC</p>
    <h2 class="cw-card__name">Every subject</h2>
    <p class="cw-sub">Each house in the village holds one part of the VARC section, and its sign on the map says which. Start any of them: every round helps that friend and grows the village.</p>
    <ul class="cw-roster">${HOUSES.map((h) => `<li><a href="${esc(start(h))}" data-go>${petPortrait(h.pet, 44)}<span class="cw-roster__who"><b>${esc(h.subject)}</b><small>${esc(h.ask)} · with ${esc(PET_BY_ID.get(h.pet).name)}</small></span><i class="cw-roster__go" aria-hidden="true">▶</i></a></li>`).join('')}</ul>
    <h3 class="cw-h3">Who is who</h3>
    <ul class="cw-pairs">${PETS.map((def) => { const p = P.pets.find((x) => x.id === def.id); return `<li><span class="cw-pairs__faces">${petPortrait(def.id, 34)}</span><span><b>${esc(def.name)}</b> · ${esc(def.tag)}<small class="cw-pairs__stage">${esc(ageOf(p?.stage).name)}${p?.stage ? ` · ${esc(stageTitle(def.id, p.stage))}` : ''}</small></span></li>`; }).join('')}</ul>
    <h3 class="cw-h3">Best friends</h3>
    <ul class="cw-pairs">${FRIENDSHIPS.map((f) => `<li><span class="cw-pairs__faces">${petPortrait(f.a, 30)}${petPortrait(f.b, 30)}</span><span>${esc(f.line)}</span></li>`).join('')}</ul>
    <p class="cw-sub">And you? You are the new friend everyone has been waiting for.</p>`;
  for (const a of card.querySelectorAll('[data-go]')) a.addEventListener('click', () => api.play('open'));
}

/* ------------------------------------------------------------------ */
/* Today's three                                                        */
/* ------------------------------------------------------------------ */

function todayCard(card, api) {
  const T = api.pets.today;
  card.innerHTML = `
    ${close}
    <p class="cw-eyebrow">Today</p>
    <h2 class="cw-card__name">${T.gift ? 'Today\'s gift is yours!' : 'Three friends need you'}</h2>
    <p class="cw-sub">${T.gift ? `You helped all three. ${DAILY_GIFT} bonus Glow went to the village. Come back tomorrow for three more.` : `These friends miss you most today. Help all three and open a gift worth ${DAILY_GIFT} Glow.`}</p>
    <ul class="cw-todo">${T.picks.map((id, i) => {
      const def = PET_BY_ID.get(id), next = nextFor(id, api.world, { first: api.pets.pets.find((p) => p.id === id)?.isNew });
      return `<li class="${T.done[i] ? 'is-done' : ''}">${petPortrait(id, 44)}<span><b>Help ${esc(def.name)}</b><small>${esc(ACT[id])}${next?.minutes ? ` · about ${Math.max(1, Math.round(next.minutes))} min` : ''}</small></span>${T.done[i] ? '<i class="cw-todo__ok" aria-label="done">✓</i>' : `<a href="${esc(next?.href ?? `#/world/place/${def.places[0]}`)}" data-go>Go</a>`}</li>`;
    }).join('')}</ul>
    <p class="cw-giftline">${T.gift ? 'Gift opened' : `${T.doneCount} of 3 done`}</p>`;
}

/* ------------------------------------------------------------------ */
/* Settings: your name, sound, the other rooms                         */
/* ------------------------------------------------------------------ */

function cottageCard(card, api) {
  const prefs = feedbackPrefs();
  const name = valleyName(api.valley);
  const named = !!api.valley?.name;
  card.innerHTML = `
    ${close}
    <p class="cw-eyebrow">Settings</p>
    <h2 class="cw-card__name">${esc(name)}</h2>
    <form class="cw-name" data-name>
      <label for="cw-name-in">${named ? 'Rename your village' : 'Give your village a name'}</label>
      <div class="cw-name__row"><input id="cw-name-in" maxlength="28" autocomplete="off" placeholder="${esc(nameSuggestions()[0])}" value="${named ? esc(api.valley.name) : ''}"><button>Save</button></div>
      <p class="cw-name__ideas">${nameSuggestions().map((n) => `<button type="button" data-idea="${esc(n)}">${esc(n)}</button>`).join('')}</p>
    </form>
    <div class="cw-toggles">
      <button class="cw-toggle" data-music aria-pressed="${musicEnabled()}"><span>Music</span><i aria-hidden="true"></i></button>
      <button class="cw-toggle" data-sfx aria-pressed="${prefs.sfx}"><span>Sounds and voices</span><i aria-hidden="true"></i></button>
    </div>
    <nav class="cw-rooms" aria-label="The other rooms">
      <a href="#/growth"><b>Your progress</b><small>How far you have come, subject by subject</small><i aria-hidden="true">›</i></a>
      <a href="#/world/place/hearth"><b>Records</b><small>Your days, Glow and friends</small><i aria-hidden="true">›</i></a>
      <a href="#/settings"><b>Settings</b><small>Reading size, theme, motion, backup and restore</small><i aria-hidden="true">›</i></a>
    </nav>
    <p class="cw-sub">Everything you learn stays on this device, and the village works offline once it has finished downloading.</p>`;
  const form = card.querySelector('[data-name]'), input = card.querySelector('#cw-name-in');
  for (const b of card.querySelectorAll('[data-idea]')) b.addEventListener('click', () => { input.value = b.dataset.idea; input.focus(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clean = cleanValleyName(input.value);
    if (!clean) { input.focus(); return; }
    try { const v = await saveValley(api.storage, { name: clean }); api.setValley(v); api.play('place'); cottageCard(card, api); card.querySelector('.cw-name input')?.focus({ preventScroll: true }); api.toast(`Welcome to <b>${esc(clean)}</b>!`); } catch (err) { console.error('[CAT OS] could not save the name', err); }
  });
  const music = card.querySelector('[data-music]'), sfx = card.querySelector('[data-sfx]');
  music.addEventListener('click', async () => {
    const on = music.getAttribute('aria-pressed') !== 'true';
    music.setAttribute('aria-pressed', String(on));
    if (on) { unlock(); startMusic('world', { hour: api.world.state.atmo.hour, warmth: api.pets.harmony }); }
    try { await setMusicEnabled(on); if (on) startAmbience('world', api.world.state.atmo); } catch { music.setAttribute('aria-pressed', String(musicEnabled())); }
  });
  sfx.addEventListener('click', async () => {
    const on = sfx.getAttribute('aria-pressed') !== 'true';
    sfx.setAttribute('aria-pressed', String(on));
    try { await setFeedbackPref(api.storage, 'sfx', on); } catch { sfx.setAttribute('aria-pressed', String(feedbackPrefs().sfx)); }
  });
}

/* ------------------------------------------------------------------ */
/* What the village has grown, drawn on the map                         */
/* ------------------------------------------------------------------ */

const FLAGS = ['#C2643F', '#EDBE66', '#8FB3C9', '#F6EEDB', '#7FA65A', '#D98B7A'];
const LANTERN = ['#D9603A', '#E9A23B', '#D97A8A', '#7FA65A'];
const lanternSVG = (c) => `<svg viewBox="0 0 30 46" width="30" height="46"><line x1="15" y1="0" x2="15" y2="10" stroke="#4a3626" stroke-width="1.2"/><rect x="10" y="9" width="10" height="3" rx="1" fill="#4a3626"/><ellipse cx="15" cy="24" rx="11" ry="13" fill="${c}" stroke="#4a3626" stroke-width="1.2"/><path d="M15 11 Q 7 24 15 37 M15 11 Q 23 24 15 37" fill="none" stroke="#4a3626" stroke-width=".8" opacity=".55"/><rect x="10" y="36" width="10" height="3" rx="1" fill="#4a3626"/><line x1="15" y1="39" x2="15" y2="45" stroke="#C2643F" stroke-width="1.6"/></svg><i class="cw-treasure__glow"></i>`;
const flowersSVG = (i) => {
  const c = ['#E7A79C', '#F1E2C2', '#E2B65C', '#BBA3CB', '#D98B7A'];
  let blooms = '<ellipse cx="30" cy="34" rx="26" ry="7" fill="#5E8A3C" opacity=".55"/>';
  for (let k = 0; k < 7; k += 1) {
    const x = 8 + ((k * 37 + i * 11) % 44), y = 18 + ((k * 23 + i * 7) % 14), col = c[(k + i) % c.length];
    blooms += `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-3.4" rx="2.4" ry="3.4" fill="${col}" stroke="#7a5a48" stroke-width=".5" transform="rotate(${r})"/>`).join('')}<circle r="1.8" fill="#E9A23B"/></g>`;
  }
  return `<svg viewBox="0 0 60 42" width="48" height="34">${blooms}</svg>`;
};
const buntingSVG = (w, sag = 30, n = 11) => {
  let flags = '';
  for (let i = 1; i < n; i += 1) {
    const t = i / n, x = w * t, y = 4 + 4 * sag * t * (1 - t);
    flags += `<path d="M${(x - 7).toFixed(1)} ${(y - 1).toFixed(1)} L${(x + 7).toFixed(1)} ${(y + 1).toFixed(1)} L${x.toFixed(1)} ${(y + 16).toFixed(1)} Z" fill="${FLAGS[i % FLAGS.length]}" stroke="#5a4130" stroke-width=".9" stroke-linejoin="round"/>`;
  }
  return `<svg viewBox="0 0 ${w} 60" width="${w}" height="60"><path d="M0 4 Q ${w / 2} ${4 + 2 * sag} ${w} 4" fill="none" stroke="#5a4130" stroke-width="1.4"/>${flags}</svg>`;
};

/** Where each friend's home gifts go, around its door (painting px). */
const HOME_SPOTS = {
  chai: { lantern: [40, -20], flowers: [[-62, 14], [52, 18]], bunting: [-58, -58, 116] },
  ginger: { lantern: [44, -18], flowers: [[-64, 18], [58, 20]], bunting: [-60, -54, 120] },
  mallow: { lantern: [-46, -12], flowers: [[-70, 16], [44, 20]], bunting: [-56, -58, 112] },
  matcha: { lantern: [44, -16], flowers: [[-66, 14], [50, 22]], bunting: [-60, -48, 120] },
  mochi: { lantern: [-48, -16], flowers: [[-74, 16], [40, 22]], bunting: [-60, -50, 116] },
  toffee: { lantern: [-92, -30], flowers: [[-110, 40], [96, 44]], bunting: [-80, -70, 160] },
};

/** The decorations as markup for .cw-treasures (painting pixels): the village's, by level; each home's, by hearts. */
export function decorLayer(pets) {
  const made = new Set((pets.decor ?? []).filter((t) => t.made).map((t) => t.id));
  const T = TREASURE_AT;
  let html = '';
  const wrap = (id, inner, x, y, w, h, extra = '') => `<div class="cw-treasure cw-treasure--${id}" data-t="${id}"${extra} style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${inner}</div>`;
  if (made.has('bunting')) for (const [a, b] of T.bunting) html += wrap('bunting', buntingSVG(b.x - a.x), a.x, a.y - 4, b.x - a.x, 60);
  if (made.has('lanterns')) T.lanterns.forEach((p, i) => { html += wrap('lanterns', lanternSVG(LANTERN[i % 4]), p.x - 15, p.y - 4, 30, 46); });
  if (made.has('flowers')) T.flowers.forEach((p, i) => { html += wrap('flowers', flowersSVG(i), p.x - 24, p.y - 20, 48, 34); });
  if (made.has('fireflies')) {
    T.fireflies.forEach((p) => {
      html += wrap('fireflies', '<svg viewBox="0 0 26 34" width="26" height="34"><rect x="6" y="2" width="14" height="5" rx="1.5" fill="#8a6a44" stroke="#4a3626" stroke-width="1"/><path d="M5 8h16v18a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5z" fill="rgba(255,244,200,.42)" stroke="#4a3626" stroke-width="1.1"/><circle cx="10" cy="17" r="1.6" fill="#E8F59A"/><circle cx="15.5" cy="22" r="1.4" fill="#E8F59A"/><circle cx="13" cy="13" r="1.2" fill="#E8F59A"/></svg><i class="cw-treasure__glow"></i>', p.x - 13, p.y - 30, 26, 34);
    });
  }
  if (made.has('swing')) {
    const p = T.swing;
    html += wrap('swing', '<svg class="cw-swing" viewBox="0 0 70 130" width="70" height="130"><g class="cw-swing__arm"><line x1="17" y1="0" x2="15" y2="112" stroke="#6a4c33" stroke-width="2"/><line x1="53" y1="0" x2="55" y2="112" stroke="#6a4c33" stroke-width="2"/><rect x="9" y="110" width="52" height="7" rx="2.5" fill="#B07A47" stroke="#4a3626" stroke-width="1.2"/></g></svg>', p.x - 35, p.y - 50, 70, 130);
  }
  if (made.has('chimes')) {
    const p = T.chimes;
    html += wrap('chimes', `<svg class="cw-chimes" viewBox="0 0 40 56" width="40" height="56"><g class="cw-chimes__arm"><line x1="20" y1="0" x2="20" y2="8" stroke="#4a3626" stroke-width="1.2"/><ellipse cx="20" cy="9" rx="15" ry="3" fill="#9a7b4e" stroke="#4a3626" stroke-width="1"/>${[8, 15, 25, 32].map((x, k) => `<line x1="${x}" y1="10" x2="${x}" y2="16" stroke="#4a3626" stroke-width=".7"/><rect x="${x - 1.6}" y="16" width="3.2" height="${22 + (k % 2) * 8}" rx="1.4" fill="#C9D9E6" stroke="#4a3626" stroke-width=".8"/>`).join('')}</g></svg>`, p.x - 20, p.y, 40, 56);
  }
  if (made.has('kite')) {
    const p = T.kite;
    html += wrap('kite', `<svg class="cw-kite" viewBox="0 0 120 170" width="120" height="170"><path d="M60 52 C 30 90, 20 130, -200 300" fill="none" stroke="rgba(70,50,35,.5)" stroke-width="1"/><g class="cw-kite__body"><path d="M60 4 L84 30 L60 56 L36 30 Z" fill="#D97A8A" stroke="#4a3626" stroke-width="1.4" stroke-linejoin="round"/><path d="M60 4 L60 56 M36 30 L84 30" stroke="#4a3626" stroke-width="1"/><path d="M60 4 L84 30 L60 30 Z" fill="#EDBE66"/><path class="cw-kite__tail" d="M60 56 q 8 10 0 20 q -8 10 0 20 q 8 10 0 20" fill="none" stroke="#4a3626" stroke-width="1.2"/>${[66, 86, 106].map((y, k) => `<path d="M${54 + (k % 2) * 4} ${y} l6 4 l-6 4 z" fill="${FLAGS[k]}"/>`).join('')}</g></svg>`, p.x - 60, p.y - 10, 120, 170);
  }
  /* Each friend's home shows how far your friendship has come. */
  for (const p of pets.pets ?? []) {
    const door = HOMES[p.id]?.door, S = HOME_SPOTS[p.id];
    if (!door || !S || !p.hearts) continue;
    if (p.hearts >= 1) html += wrap('home-lantern', lanternSVG(LANTERN[PETS.findIndex((x) => x.id === p.id) % 4]), door.x + S.lantern[0] - 15, door.y + S.lantern[1] - 23, 30, 46, ` data-home="${p.id}"`);
    if (p.hearts >= 2) S.flowers.forEach(([dx, dy], i) => { html += wrap('home-flowers', flowersSVG(i + 3), door.x + dx - 24, door.y + dy - 17, 48, 34, ` data-home="${p.id}"`); });
    if (p.hearts >= 3) { const [dx, dy, w] = S.bunting; html += wrap('home-bunting', buntingSVG(w, 14, 8), door.x + dx, door.y + dy, w, 60, ` data-home="${p.id}"`); }
    if (p.hearts >= 4) html += wrap('home-glow', '', door.x - 70, door.y - 70, 140, 120, ` data-home="${p.id}"`);
    if (p.hearts >= 5) html += wrap('home-heart', '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z" fill="#F4C443" stroke="#9a6a12" stroke-width="1.3" stroke-linejoin="round"/></svg>', door.x - 13, door.y - 120, 26, 26, ` data-home="${p.id}"`);
  }
  return html;
}
