/** Mochi's Little Worlds. Presentation memory never owns learning progress. */
import { thoughtRoom } from '../../modules/para-summary/logic/room.js';
import { recommendNextPS, tierInfo } from '../../modules/para-summary/logic/tiers.js';
import { thoughtRoomArt, worldIcon } from './thought-room-art.js';
import { petSprite, FRAME } from '../../pets/sprite.js';
import { escapeHTML } from '../../core/utils/format.js';
import { infoButton } from '../../ui/info.js';
import { play, unlock, startMusic, startAmbience } from '../audio.js';
import { verbalTrio } from '../../pets/next.js';
export { thoughtRoomStyle } from '../../ui/thought-room-style.js';

const MEMORY = 'catos:thought-room:last-look';
const reduced = () => document.documentElement.hasAttribute('data-reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const HELLOS = [
  'I made the cushion bigger. In case you stayed a while.',
  'A whole world in a little jar. I like things that keep the important bits.',
  'I was counting the leaves. Then I got distracted by a leaf.',
  'Oh, hello again. The best part of my house just arrived.',
  'The snail has no appointments. I think the snail is onto something.',
];
const HINTS = ['What does the author want you to believe?', 'Does it keep the whole claim, or just a lovely example?', 'Some, most, all. Little words change big ideas.'];

export function renderThoughtRoom(outlet, { content, records, state, stage = 0 }) {
  const model = thoughtRoom(content.ps, records.sessions);
  const next = recommendNextPS(model.items, model.solved, model.tried);
  const trio = verbalTrio(content.ps, records.sessions, 'ps', `table:${state.today}`, state.now);
  let earned = [];
  try {
    const memory = JSON.parse(sessionStorage.getItem(MEMORY) || 'null');
    if (Array.isArray(memory) && memory.every((id) => typeof id === 'string')) {
      const previous = new Set(memory);
      earned = [...model.solved].filter((id) => !previous.has(id));
      if (earned.length > 12) earned = [];
    }
    sessionStorage.setItem(MEMORY, JSON.stringify([...model.solved]));
  } catch { /* Animation memory is optional. */ }
  let active = model.zones.find((z) => z.items.some((it) => earned.includes(it.id)))
    || model.zones.find((z) => z.tier === next?.item.tier) || model.zones[0];
  const complete = model.zones.filter((z) => z.complete).length;
  const greeting = earned.length ? `${earned.length === 1 ? 'A new bloom' : `${earned.length} new blooms`}! Come closer. You grew that.`
    : model.clean === 1 ? 'Eight little worlds. All this life, because you kept coming back.'
      : model.done ? 'There you are. I kept our little worlds warm.' : 'You’re here! I saved you the soft side of the cushion.';

  outlet.innerHTML = `<section class="thought-house" aria-labelledby="thought-title" data-clean="${model.percent}">
    <nav class="thought-nav" aria-label="Room navigation"><a href="#/world" class="thought-back">← Village</a><span class="thought-nav__home">Mochi’s house</span>${infoButton('ps', { guide: '#/ps/about', moreTitle: 'Little Worlds', more: [
      'Read a paragraph and choose the summary that preserves its meaning. Each unique correct summary grows one permanent bloom in its world. Finish the question or set to save it.',
      'Eight worlds, one for each difficulty. Every world is open from the start. Complete a world to welcome a tiny resident.',
      'Rain, fireflies, tea and cuddles are for company. They do not change your progress. Wrong retries never take away a bloom.',
    ] })}</nav>
    <header class="thought-heading"><p class="thought-eyebrow">Para summary <span>·</span> A home for big ideas</p><h1 id="thought-title">Little Worlds<span aria-hidden="true">.</span></h1><p class="thought-subtitle">Keep the meaning. Watch something tiny grow.</p></header>
    <div class="thought-room-wrap">
      <div class="thought-world-caption"><span class="thought-world-number" aria-hidden="true">01</span><div><h2 id="thought-world-name"></h2><p id="thought-world-status"></p></div><button class="thought-world-list" type="button" aria-controls="thought-tray" aria-expanded="false" aria-label="Browse paragraphs in this world">Explore <span aria-hidden="true">↗</span></button></div>
      <div class="thought-room-scroll"><div class="thought-scene">
        <div class="thought-art-slot">${thoughtRoomArt(model, model.solved, active.tier)}</div>
        <div class="thought-speech"><p id="thought-say" role="status" aria-live="polite">${escapeHTML(greeting)}</p><span class="thought-speech__who">Mochi <span aria-hidden="true">♡</span></span></div>
        <button class="thought-mochi" type="button" aria-label="Pet Mochi"><span class="thought-mochi__hearts" aria-hidden="true">♡ <i>♡</i></span><svg class="thought-mochi__umbrella" viewBox="0 0 100 90" aria-hidden="true"><path d="M52 85Q57 38 72 7" fill="none" stroke="#637c4f" stroke-width="4" stroke-linecap="round"/><path d="M5 38Q22 2 72 7Q98 15 96 45Q55 29 5 38Z" fill="#8ba46c" stroke="#5f7c4e" stroke-width="2"/><path d="M10 35L72 9L91 40M72 9L50 33" stroke="#c0ca91" fill="none" stroke-width="2"/></svg>${petSprite('mochi', { size: 136, frame: FRAME.happy, stage })}<span class="thought-mochi__hint">pet me <span aria-hidden="true">♡</span></span></button>
        <button class="thought-butterfly" type="button" aria-label="Invite a butterfly to play with Mochi"><svg viewBox="0 0 50 50" aria-hidden="true"><g fill="#e6c589" stroke="#9d865c" stroke-width="1.2"><path d="M24 27Q0-3 5 25Q7 36 24 27Q2 25 12 40Q22 46 24 27"/><path d="M26 27Q50-3 45 25Q43 36 26 27Q48 25 38 40Q28 46 26 27"/></g><path d="M25 17V36M25 18L20 12M25 18L30 12" stroke="#6e6b4e" stroke-width="2" stroke-linecap="round"/></svg></button>
        <span class="thought-return-spark" aria-hidden="true">✧ ${earned.length} new ${earned.length === 1 ? 'bloom' : 'blooms'}</span>
      </div></div>
      <div class="thought-play" aria-label="Little things to do with Mochi"><button type="button" data-play="rain" aria-pressed="false"><span aria-hidden="true">☂</span> A little rain</button><button type="button" data-play="tea"><span aria-hidden="true">♧</span> Tea for two</button><button type="button" data-play="lights" aria-pressed="false"><span aria-hidden="true">✧</span> Fireflies</button></div>
    </div>
    <section class="thought-worlds" aria-label="Choose a little world"><div class="thought-worlds__heading"><p class="thought-eyebrow">Eight little worlds <span aria-hidden="true">↔</span></p><span>${model.done}/${model.total} blooms <span aria-hidden="true">·</span> ${complete}/8 complete</span></div><div class="thought-zone-controls">${model.zones.map((z, i) => `<button type="button" class="thought-zone${z.complete ? ' is-complete' : ''}" data-zone="${z.tier}" aria-pressed="${z === active}" aria-label="${escapeHTML(z.name)}, ${z.label}, ${z.done} of ${z.total} blooms">${worldIcon(z)}<b>${escapeHTML(z.label)}</b><small>${z.done}/${z.total} ${z.complete ? '✦' : 'blooms'}</small><span class="thought-zone__line" aria-hidden="true"><i style="width:${z.clean * 100}%"></i></span></button>`).join('')}</div></section>
    <div class="thought-floor"><div class="thought-ledger"><div class="thought-ledger__progress"><p class="thought-eyebrow" id="thought-skill"></p><p id="thought-next-note"></p></div><a class="thought-begin" href="#/ps"><span>Grow this little world<small>One paragraph · four summaries</small></span><span aria-hidden="true">→</span></a></div><div class="thought-links"><a class="thought-journey" href="#/ps">Every paragraph ↗</a>${trio ? `<a href="${escapeHTML(trio.href)}">A three-question ramble ↗</a>` : ''}</div><section id="thought-tray" class="thought-tray" aria-labelledby="thought-tray-title" hidden></section><p class="thought-footnote">One clear thought. One little bloom. A house that grows with you.</p></div>
  </section>`;

  const house = outlet.querySelector('.thought-house');
  const mochi = house.querySelector('.thought-mochi');
  const sprite = mochi.querySelector('.pet-sprite');
  const say = house.querySelector('#thought-say');
  const tray = house.querySelector('#thought-tray');
  const controller = new AbortController();
  const { signal } = controller;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (house.isConnected && !signal.aborted) fn(); }, ms); timers.add(t); return t; };
  const cancel = (id) => { clearTimeout(id); timers.delete(id); };
  let faceTimer, idleTimer, rainTimer, teaTimer, playTimer, hellos = 0, pets = 0;
  const face = (frame) => sprite.style.setProperty('--f', frame);
  const nap = () => { if (!document.hidden) { face(FRAME.sleep); house.classList.add('is-napping'); say.textContent = 'Just a tiny nap. Stay as long as you like.'; } };
  const speak = (text, happy = false) => {
    say.textContent = text;
    house.classList.remove('is-napping');
    house.classList.toggle('is-delighted', happy);
    cancel(faceTimer); face(happy ? FRAME.happy : FRAME.talk);
    faceTimer = later(() => face(FRAME.idle), 2600);
    cancel(idleTimer); idleTimer = later(nap, 35000);
  };
  const hop = () => {
    if (reduced()) return;
    mochi.classList.remove('is-bouncing');
    requestAnimationFrame(() => { if (!signal.aborted) mochi.classList.add('is-bouncing'); });
  };
  mochi.addEventListener('click', () => {
    unlock(); play('tap'); pets++;
    speak(pets % 3 === 0 ? 'Three pats? I may be a pebble, but I am becoming a puddle.' : HELLOS[hellos++ % HELLOS.length], true); hop();
  }, { signal });
  house.querySelector('.thought-butterfly').addEventListener('click', () => {
    unlock(); play('page'); cancel(playTimer); house.classList.remove('is-befriended'); house.classList.add('is-chasing');
    speak('Wait! Come back! I only wanted to admire your tiny wings.', true); hop();
    playTimer = later(() => { house.classList.remove('is-chasing'); house.classList.add('is-befriended'); speak('It landed on my head. We are friends now.', true); }, 2800);
  }, { signal });
  house.querySelector('[data-play="rain"]').addEventListener('click', (e) => {
    unlock(); play('page'); cancel(rainTimer);
    const rain = !house.classList.contains('is-raining');
    house.classList.toggle('is-raining', rain); e.currentTarget.setAttribute('aria-pressed', String(rain));
    speak(rain ? 'A little rain! Quick, under my leaf. There’s room for two.' : 'That lovely after-rain smell. Even in a tiny world.', true);
    if (rain) rainTimer = later(() => { house.classList.remove('is-raining'); house.querySelector('[data-play="rain"]').setAttribute('aria-pressed', 'false'); speak('The rain stopped. Listen. Everything is a little quieter.'); }, 7000);
  }, { signal });
  house.querySelector('[data-play="tea"]').addEventListener('click', () => {
    unlock(); play('page'); cancel(teaTimer); house.classList.add('is-sipping');
    speak('One for you. One for me. Mine has a leaf in it. On purpose.', true);
    teaTimer = later(() => { house.classList.remove('is-sipping'); speak('Perfect. A very small tea for a very good afternoon.', true); }, 4000);
  }, { signal });
  house.querySelector('[data-play="lights"]').addEventListener('click', (e) => {
    unlock(); play('page'); const lit = !house.classList.contains('is-firefly-time');
    house.classList.toggle('is-firefly-time', lit); e.currentTarget.setAttribute('aria-pressed', String(lit));
    speak(lit ? 'Oh. The stars came indoors. Keep very still with me.' : 'Goodnight, little lights. Same time tomorrow?', true);
  }, { signal });

  function selectWorld(tier, announce = false) {
    active = model.zones.find((z) => z.tier === tier) || active;
    house.querySelector('.thought-art-slot').innerHTML = thoughtRoomArt(model, model.solved, active.tier);
    house.querySelector('.thought-world-number').textContent = String(model.zones.indexOf(active) + 1).padStart(2, '0');
    house.querySelector('#thought-world-name').textContent = active.name;
    house.querySelector('#thought-world-status').textContent = `${active.label} · ${active.done} of ${active.total} blooms${active.complete ? ' · A tiny resident has arrived' : ''}`;
    house.querySelector('#thought-skill').textContent = tierInfo(active.tier).skill;
    house.querySelector('#thought-next-note').textContent = active.complete ? active.keepsake + '.' : `${active.total - active.done} more ${active.total - active.done === 1 ? 'bloom' : 'blooms'} to welcome a tiny resident.`;
    const pick = recommendNextPS(active.items, model.solved, model.tried);
    const begin = house.querySelector('.thought-begin');
    begin.href = pick ? `#/ps/session/${pick.item.id}` : '#/ps';
    begin.querySelector('span').innerHTML = `${active.complete ? 'Revisit this little world' : 'Grow this little world'}<small>One paragraph · four summaries</small>`;
    for (const b of house.querySelectorAll('[data-zone]')) b.setAttribute('aria-pressed', String(b.dataset.zone === tier));
    tray.hidden = true; house.querySelector('.thought-world-list').setAttribute('aria-expanded', 'false');
    if (announce) { play('page'); speak(active.complete ? active.keepsake + '. You made that happen.' : `${active.name}. ${HINTS[model.zones.indexOf(active) % HINTS.length]}`); }
  }
  for (const button of house.querySelectorAll('[data-zone]')) button.addEventListener('click', () => selectWorld(button.dataset.zone, true), { signal });
  const explore = house.querySelector('.thought-world-list');
  explore.addEventListener('click', () => {
    const open = tray.hidden;
    tray.hidden = !open; explore.setAttribute('aria-expanded', String(open));
    if (!open) return;
    tray.innerHTML = `<div class="thought-tray__head"><div><p class="thought-eyebrow">${escapeHTML(active.label)} · ${active.done}/${active.total} blooms</p><h2 id="thought-tray-title" tabindex="-1">${escapeHTML(active.name)}</h2></div><button type="button" class="thought-tray__close" aria-label="Close paragraphs">×</button></div><p>${escapeHTML(tierInfo(active.tier).skill)}. Choose any paragraph.</p><div class="thought-papers">${active.items.map((it, i) => `<a href="#/ps/session/${it.id}" class="${model.solved.has(it.id) ? 'is-put-away' : ''}"><span aria-hidden="true">${model.solved.has(it.id) ? '✿' : String(i + 1).padStart(2, '0')}</span><span>${escapeHTML(it.title || 'A little thought')}</span><small>${model.solved.has(it.id) ? 'Revisit' : 'Read'} →</small></a>`).join('') || '<p>More paragraphs are on their way.</p>'}</div>`;
    tray.querySelector('button').addEventListener('click', () => { tray.hidden = true; explore.setAttribute('aria-expanded', 'false'); explore.focus({preventScroll:true}); }, { signal });
    tray.querySelector('h2').focus({preventScroll:true});
    tray.scrollIntoView({behavior: reduced() ? 'instant' : 'smooth', block:'start'});
  }, { signal });
  selectWorld(active.tier);
  if (earned.length) {
    house.classList.add('is-restoring'); house.classList.add('is-delighted');
    for (const bloom of house.querySelectorAll('[data-bloom]')) if (earned.includes(bloom.dataset.bloom)) bloom.classList.add('is-new');
    hop(); later(() => house.classList.remove('is-restoring'), 5000);
  }
  function blink() {
    if (!document.hidden && !reduced() && !house.classList.contains('is-napping') && !timers.has(faceTimer)) { face(FRAME.blink); faceTimer = later(() => face(FRAME.idle), 160); }
    later(blink, 5200);
  }
  later(blink, 4300); idleTimer = later(nap, 35000);
  house.querySelector('.thought-back').addEventListener('click', () => { sessionStorage.setItem('world:focus', 'table'); play('close'); }, { signal });
  house.querySelector('.thought-begin').addEventListener('click', () => play('open'), { signal });
  const warmth = Math.min(1, (state.pets?.harmony ?? .4) * .6 + Math.min(1, state.stars / 90) * .4);
  const music = () => { unlock(); startMusic('table', { hour: state.atmo.hour, warmth }); startAmbience('table', state.atmo); };
  window.addEventListener('pointerdown', music, { once: true, capture: true, signal });
  startMusic('table', { hour: state.atmo.hour, warmth }); startAmbience('table', state.atmo);
  const visibility = () => house.classList.toggle('is-paused', document.hidden);
  document.addEventListener('visibilitychange', visibility, { signal }); visibility();
  const observer = new IntersectionObserver(([entry]) => house.classList.toggle('is-scene-paused', !entry.isIntersecting));
  observer.observe(house.querySelector('.thought-room-wrap'));
  window.addEventListener('hashchange', () => { controller.abort(); observer.disconnect(); for (const t of timers) clearTimeout(t); timers.clear(); }, { once:true, signal });
}
