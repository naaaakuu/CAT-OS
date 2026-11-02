/** Mochi's interactive home. The model is pure; this file owns only the
 * illustration, conversation, last-look animation and accessible controls. */
import { thoughtRoom } from '../../modules/para-summary/logic/room.js';
import { recommendNextPS, tierInfo } from '../../modules/para-summary/logic/tiers.js';
import { thoughtRoomArt, paperPose } from './thought-room-art.js';
import { petSprite, FRAME } from '../../pets/sprite.js';
import { escapeHTML } from '../../core/utils/format.js';
import { infoButton } from '../../ui/info.js';
import { play, unlock, voice, startMusic, startAmbience } from '../audio.js';
import { verbalTrio } from '../../pets/next.js';
export { thoughtRoomStyle } from '../../ui/thought-room-style.js';

const MEMORY = 'catos:thought-room:last-look';
const reduced = () => document.documentElement.hasAttribute('data-reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const HINTS = [
  'So many words. Just one little point. We can find it.',
  'The example is lovely. But what is it helping the author say?',
  'Try saying the whole paragraph in one small sentence.',
  'Some, most, all. Tiny words carry big things.',
  'Keep the author’s thought. Leave the extra bits here with me.',
  'We do not need to hurry. One thought at a time.',
  'The right summary should fit the whole paragraph like a little blanket.',
];

export function renderThoughtRoom(outlet, { content, records, state, stage = 0 }) {
  const model = thoughtRoom(content.ps, records.sessions);
  const next = recommendNextPS(model.items, model.solved, model.tried);
  const trio = verbalTrio(content.ps, records.sessions, 'ps', `table:${state.today}`, state.now);
  let before = model.solved;
  let earned = [];
  try {
    const memory = JSON.parse(sessionStorage.getItem(MEMORY) || 'null');
    if (Array.isArray(memory) && memory.every((id) => typeof id === 'string')) {
      const previous = new Set(memory);
      earned = [...model.solved].filter((id) => !previous.has(id));
      // A restore/import is a fresh view, not a minute of animation.
      if (earned.length > 0 && earned.length <= 12) before = new Set([...model.solved].filter((id) => previous.has(id)));
      else earned = [];
    }
    sessionStorage.setItem(MEMORY, JSON.stringify([...model.solved]));
  } catch { /* The room still works when presentation memory is unavailable. */ }

  const completeZones = model.zones.filter((z) => z.complete).length;
  const almost = [...model.zones].filter((z) => z.total && !z.complete).sort((a, b) => b.clean - a.clean)[0];
  const cta = trio?.href ?? (next ? `#/ps/session/${next.item.id}` : null);
  const n = trio?.recs.length ?? (next ? 1 : 0);
  const newRoom = model.done === 0;
  const greeting = earned.length ? `${earned.length === 1 ? 'One thought' : `${earned.length} thoughts`}, put away. Look at our little room!`
    : model.clean === 1 ? 'A place for everything. And a little place for you.'
      : newRoom ? 'Oh! You’re here. Come in. My thoughts got a little tangled.'
        : 'You’re back! It feels a little lighter in here with you.';

  outlet.innerHTML = `<section class="thought-house" aria-labelledby="thought-title" data-clean="${model.percent}">
    <nav class="thought-nav" aria-label="Room navigation">
      <a href="#/world" class="thought-back">← Village</a>
      <span class="thought-nav__home" aria-hidden="true">a little home for a busy mind</span>
      ${infoButton('ps', { guide: '#/ps/about', moreTitle: 'Mochi’s Messy Thoughts Room', more: [
        'Every paper is a para-summary. Solve it correctly to put it away. The percentage counts unique summaries answered correctly, across all eight tiers.',
        'Each area belongs to a tier. Tap its label to choose a paragraph. Every tier is open from the beginning.',
        'A correct answer stays put away, even after a later mistake. Replaying a solved summary keeps your skill warm, but does not clean the room twice.',
        'Finish your set to save your work, then come home to see the papers settle. Tap Mochi for company, or offer him a little tea.',
      ] })}
    </nav>
    <header class="thought-heading">
      <div><p class="thought-eyebrow">Mochi’s house <span>·</span> Para summary</p>
        <h1 id="thought-title">The Messy<br class="thought-mobile-break"> Thoughts Room<span aria-hidden="true">.</span></h1>
        <p class="thought-subtitle">Find the main idea. Give a little thought a home.</p></div>
      <div class="thought-seal" aria-label="${model.percent}% of the room tidied"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28"/><circle class="thought-seal__fill" cx="32" cy="32" r="28" pathLength="100" stroke-dasharray="${model.percent} 100"/></svg><span><b>${model.percent}<small>%</small></b><em>tidied</em></span></div>
    </header>
    <div class="thought-room-wrap">
      <div class="thought-room-scroll" tabindex="0" role="region" aria-label="Explore Mochi’s room. Scroll sideways on a small screen.">
        <div class="thought-scene">
          ${thoughtRoomArt(model, before)}
          <div class="thought-zone-controls" aria-label="Eight areas to tidy">${model.zones.map((z) => `<button type="button" class="thought-zone ${z.complete ? 'is-complete' : ''}" data-zone="${z.tier}" style="left:${z.x / 11.2}%;top:${z.labelY / 7}%;--zone-color:${z.color}" aria-controls="thought-tray" aria-expanded="false" aria-label="${escapeHTML(z.name)}, ${z.label}, ${z.done} of ${z.total} thoughts put away"><span aria-hidden="true">${z.complete ? '✦' : '⌑'}</span><b>${z.label}</b><small>${z.done}/${z.total}</small></button>`).join('')}</div>
          <button type="button" class="thought-mochi" aria-label="Talk to Mochi" title="Talk to Mochi"><span class="thought-mochi__hearts" aria-hidden="true">♡ <i>♡</i></span>${earned.length ? `<span class="thought-mochi__reward" aria-hidden="true">✧ +${earned.length} ${earned.length === 1 ? 'thought' : 'thoughts'} put away</span>` : ''}${petSprite('mochi', { size: 150, frame: FRAME.happy, stage })}<span class="thought-mochi__name">Mochi <span aria-hidden="true">♡</span></span></button>
          <button type="button" class="thought-object thought-object--tea" aria-label="Offer Mochi a little tea" title="A little tea for Mochi"><svg viewBox="0 0 60 64" aria-hidden="true"><path class="thought-tea-steam" d="M20 24Q12 15 21 8M31 24Q24 15 32 5" fill="none" stroke="#f9f0d5" stroke-width="2" stroke-linecap="round"/><ellipse cx="27" cy="53" rx="25" ry="6" fill="#e5d4b0" stroke="#ad9270"/><path d="M43 32Q60 26 55 40Q52 47 42 43" fill="none" stroke="#789179" stroke-width="5"/><path d="M8 30H46L42 48Q27 60 12 48Z" fill="#9eaf8b" stroke="#718367" stroke-width="2"/><ellipse cx="27" cy="30" rx="19" ry="5" fill="#e5d1a6" stroke="#718367" stroke-width="2"/><ellipse cx="27" cy="31" rx="14" ry="3" fill="#ad7d4e"/><path d="M24 42Q20 36 18 40Q17 44 24 48Q32 43 30 40Q27 36 24 42" fill="#e9dbc0"/></svg></button>
          <button type="button" class="thought-object thought-object--curtain" aria-label="Change the light in Mochi’s room" aria-pressed="false" title="A little more sunshine"><span aria-hidden="true">☼</span></button>
          <p class="thought-room-plaque" aria-hidden="true">one thought at a time</p>
        </div>
      </div>
      <span class="thought-explore-hint">Swipe to explore the room <span aria-hidden="true">↔</span></span>
      <i class="thought-doorway" aria-hidden="true"></i>
    </div>
    <div class="thought-floor">
      <div class="thought-conversation"><span class="thought-conversation__mark" aria-hidden="true">“</span><div><span class="thought-eyebrow">Mochi says</span><p id="thought-say" role="status" aria-live="polite">${escapeHTML(greeting)}</p></div><button class="thought-chat" type="button" aria-label="Hear another thought from Mochi">Say hello <span aria-hidden="true">♡</span></button></div>
      <div class="thought-ledger">
        <div class="thought-ledger__progress"><p class="thought-eyebrow" id="thought-mood">${model.mood}</p><p><b>${model.done}</b> / ${model.total} thoughts put away</p><div class="thought-progress" role="progressbar" aria-label="Room tidied" aria-valuenow="${model.done}" aria-valuemin="0" aria-valuemax="${model.total || 1}"><i style="width:${model.clean * 100}%"></i></div><small>${completeZones === 8 ? 'Eight cosy corners. Every thought has a home.' : `${completeZones} of 8 cosy corners restored${almost ? ` · Next: ${escapeHTML(almost.name.toLowerCase())}` : ''}`}</small></div>
        <div class="thought-ledger__action">${cta ? `<a class="thought-begin" href="${escapeHTML(cta)}"><span>${model.clean === 1 ? 'Keep Mochi company' : newRoom ? 'Tidy with Mochi' : 'A few more thoughts'}<small>${n === 1 ? 'One summary' : `${n} summaries`}${trio ? ` · about ${trio.minutes} min` : ''}</small></span><span aria-hidden="true">→</span></a>` : '<p>There are no thoughts to untangle just yet. Come sit with Mochi.</p>'}<a class="thought-journey" href="#/ps">Browse every paragraph <span aria-hidden="true">↗</span></a></div>
      </div>
      <section id="thought-tray" class="thought-tray" aria-labelledby="thought-tray-title" hidden></section>
      <p class="thought-footnote">Each correct summary puts one paper away. Little by little, a little becomes a lot.</p>
    </div>
  </section>`;

  const house = outlet.querySelector('.thought-house');
  const sprite = house.querySelector('.thought-mochi .pet-sprite');
  const mochi = house.querySelector('.thought-mochi');
  const say = house.querySelector('#thought-say');
  const scroll = house.querySelector('.thought-room-scroll');
  const controller = new AbortController();
  const { signal } = controller;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (house.isConnected && !signal.aborted) fn(); }, ms); timers.add(t); return t; };
  const cancel = (id) => { clearTimeout(id); timers.delete(id); };
  let faceTimer, idleTimer, hintIndex = 0;
  const face = (frame) => sprite.style.setProperty('--f', frame);
  const emote = (frame, ms = 2200) => { cancel(faceTimer); face(frame); faceTimer = later(() => face(FRAME.idle), ms); };
  const speak = (text, happy = false) => {
    say.textContent = text;
    house.classList.toggle('is-delighted', happy);
    emote(happy ? FRAME.happy : FRAME.talk);
    if (!reduced()) {
      mochi.classList.remove('is-bouncing');
      requestAnimationFrame(() => { if (!signal.aborted) mochi.classList.add('is-bouncing'); });
    }
    // The visual conversation is always available, including with sound off.
    voice('mochi', text, { soft: true });
    cancel(idleTimer);
    idleTimer = later(() => { if (!document.hidden) { face(FRAME.sleep); say.textContent = 'Just resting my eyes. Your little thoughts are safe with me.'; } }, 45000);
  };
  const chat = () => { unlock(); play('tap'); speak(HINTS[hintIndex++ % HINTS.length], hintIndex % 3 === 0); };
  mochi.addEventListener('click', chat, { signal });
  house.querySelector('.thought-chat').addEventListener('click', chat, { signal });
  house.querySelector('.thought-object--tea').addEventListener('click', () => { unlock(); play('page'); speak('For me? A tiny tea break. You remembered. ♡', true); }, { signal });
  house.querySelector('.thought-object--curtain').addEventListener('click', (e) => {
    const sunny = !house.classList.contains('is-sunny');
    house.classList.toggle('is-sunny', sunny);
    e.currentTarget.setAttribute('aria-pressed', String(sunny));
    speak(sunny ? 'Oh, a sunny patch! I was saving that spot for us.' : 'Soft light. A quiet room. One little thought.', true);
  }, { signal });
  house.querySelector('.thought-back').addEventListener('click', () => { sessionStorage.setItem('world:focus', 'table'); play('close'); }, { signal });
  house.querySelector('.thought-begin')?.addEventListener('click', () => play('open'), { signal });

  const tray = house.querySelector('#thought-tray');
  const begin = house.querySelector('.thought-begin');
  const originalAction = begin ? { href: begin.getAttribute('href'), html: begin.innerHTML } : null;
  for (const button of house.querySelectorAll('[data-zone]')) button.addEventListener('click', () => {
    const z = model.zones.find((x) => x.tier === button.dataset.zone);
    const pick = recommendNextPS(z.items, model.solved, model.tried);
    for (const b of house.querySelectorAll('[data-zone]')) b.setAttribute('aria-expanded', String(b === button));
    const info = tierInfo(z.tier);
    if (begin && pick) {
      begin.href = `#/ps/session/${pick.item.id}`;
      begin.innerHTML = `<span>${z.complete ? 'Revisit this corner' : 'Tidy this corner'}<small>One summary · ${z.label}</small></span><span aria-hidden="true">→</span>`;
    }
    tray.hidden = false;
    tray.innerHTML = `<div class="thought-tray__head"><div><p class="thought-eyebrow">${z.label} · ${z.done} of ${z.total} put away</p><h2 id="thought-tray-title" tabindex="-1">${escapeHTML(z.name)}</h2></div><button type="button" class="thought-tray__close" aria-label="Close this corner">×</button></div><p>${escapeHTML(info.skill)}. ${z.complete ? escapeHTML(z.keepsake) + '.' : 'Every correct summary puts another little paper away.'}</p>
      ${pick ? `<a class="thought-corner-start" href="#/ps/session/${pick.item.id}">${z.complete ? 'Revisit a thought' : 'Untangle one thought'} <span aria-hidden="true">→</span><small>${escapeHTML(pick.item.title)}</small></a>` : '<p>This corner has no paragraphs yet.</p>'}
      <details class="thought-papers"><summary>All ${z.total} thoughts in this corner</summary><div>${z.items.map((it, i) => `<a href="#/ps/session/${it.id}" class="${model.solved.has(it.id) ? 'is-put-away' : ''}"><span aria-hidden="true">${model.solved.has(it.id) ? '✓' : String(i + 1).padStart(2, '0')}</span><span>${escapeHTML(it.title)}</span><small>${model.solved.has(it.id) ? 'Put away' : 'Untangle'} →</small></a>`).join('')}</div></details>`;
    tray.querySelector('.thought-tray__close').addEventListener('click', () => {
      tray.hidden = true; button.setAttribute('aria-expanded', 'false'); button.focus({ preventScroll: true });
      if (begin && originalAction) { begin.setAttribute('href', originalAction.href); begin.innerHTML = originalAction.html; }
    });
    tray.querySelector('h2').focus({ preventScroll: true });
    tray.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'nearest' });
    play('page');
    speak(z.complete ? `${z.name.replace(/^The /, 'Our ')}. All cosy, thanks to you.` : `${z.label} thoughts live here. Shall we find a home for one?`);
  }, { signal });

  // A phone enters centred on Mochi, with both sides available to explore.
  const centreRoom = () => {
    scroll.scrollLeft = Math.max(0, scroll.scrollWidth * .482 - scroll.clientWidth / 2);
    // Short portrait screens open on Mochi and the desk, with the window
    // and floor still reachable by touch. Never shrink the touch targets.
    scroll.scrollTop = Math.max(0, scroll.scrollHeight * .8 - scroll.clientHeight + 52);
  };
  centreRoom();
  const resize = new ResizeObserver(centreRoom);
  resize.observe(scroll);
  const warmth = Math.min(1, (state.pets?.harmony ?? .4) * .6 + Math.min(1, state.stars / 90) * .4);
  const music = () => { unlock(); startMusic('table', { hour: state.atmo.hour, warmth }); startAmbience('table', state.atmo); };
  window.addEventListener('pointerdown', music, { once: true, capture: true, signal });
  startMusic('table', { hour: state.atmo.hour, warmth }); startAmbience('table', state.atmo);

  function blink() {
    if (!document.hidden && !reduced() && !timers.has(faceTimer) && sprite.style.getPropertyValue('--f') !== String(FRAME.sleep)) {
      face(FRAME.blink); faceTimer = later(() => face(FRAME.idle), 160);
    }
    later(blink, 5200);
  }
  later(blink, 4300);
  emote(FRAME.happy, 2600);
  idleTimer = later(() => { if (!document.hidden) { face(FRAME.sleep); say.textContent = 'Just resting my eyes. Tap me when you need a little company.'; } }, 45000);
  if (earned.length && before !== model.solved) later(() => {
    house.classList.add('is-restoring');
    for (const z of model.zones) for (const [i, it] of z.items.entries()) if (earned.includes(it.id)) {
      const paper = house.querySelector(`[data-paper="${it.id}"]`);
      paper.style.transitionDelay = `${earned.indexOf(it.id) * 180}ms`;
      paper.style.transform = paperPose(z, i, true);
      paper.style.opacity = '.7';
      paper.classList.add('is-filed', 'is-newly-filed');
    }
    speak(greeting, true);
    play('page');
    later(() => house.classList.remove('is-restoring'), 3200);
  }, reduced() ? 0 : 650);
  later(() => house.querySelector('.thought-doorway')?.remove(), 1000);

  const dispose = () => { controller.abort(); resize.disconnect(); for (const timer of timers) clearTimeout(timer); timers.clear(); };
  window.addEventListener('hashchange', dispose, { once: true, signal });
}
