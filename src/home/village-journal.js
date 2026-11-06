import { deriveJourney } from '../pets/journey.js';
import { PET_BY_ID } from '../pets/pets.js';
import { nextFor, startHref } from '../pets/next.js';
import { petPortrait } from '../pets/sprite.js';
import { escapeHTML as esc } from '../core/utils/format.js';

import { keepsakeArt } from "./journal-art.js";
export { keepsakeArt } from "./journal-art.js";

const meter = (pct, label) => `<div class="j-meter" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><i style="width:${Math.round(pct * 100)}%"></i></div>`;
const goals = (items) => `<ul class="j-goals">${items.map(g => `<li><span class="j-check${g.done ? ' is-done' : ''}" aria-label="${g.done ? 'Complete' : 'In progress'}">${g.done ? '✓' : '○'}</span><span>${esc(g.label)}<small>${g.have} / ${g.goal}</small></span></li>`).join('')}</ul>`;

function visit(id, api, label) {
  const pet = PET_BY_ID.get(id);
  if (!pet) return '';
  const next = nextFor(id, api.world, { first: api.pets.pets.find(p => p.id === id)?.isNew });
  return `<a class="j-action" href="${esc(startHref(id, next, `#/world/place/${pet.places[0]}`))}">${petPortrait(id, 34)}<span>${esc(label || `Visit ${pet.name}`)}</span><span aria-hidden="true">→</span></a>`;
}

export function journalCard(card, api) {
  const journey = deriveJourney(api.pets, api.world, api.world.state.now);
  let section = 'journey';
  function draw(focusTab = false) {
    const J = journey, C = J.current, W = J.weekly;
    card.innerHTML = `<button class="cw-x" data-close aria-label="Close">×</button>
      <p class="cw-eyebrow">Little steps. A village full of stories.</p>
      <h2 class="cw-card__name" id="cw-journal-title">Village Journal</h2>
      <nav class="j-tabs" aria-label="Journal sections">${[['journey', 'Journey'], ['collection', `Keepsakes · ${J.earnedCount}`], ['week', 'This week']].map(([id, title]) => `<button type="button" data-j-tab="${id}" aria-pressed="${section === id}">${title}</button>`).join('')}</nav>
      <div class="j-page">${section === 'journey' ? `
        <div class="j-cover">${keepsakeArt(null, true, C?.reward.icon || 'key', C?.number || 8)}<p class="cw-eyebrow">${C ? `Chapter ${C.number} of ${J.chapters.length}` : 'Every chapter complete'}</p><h3>${esc(C?.title || 'A village made of you')}</h3><p>${esc(C?.line || 'Every friend has a story with you in it. Your next adventure is waiting in the village.')}</p></div>
        ${C ? `${meter(C.pct, 'Chapter progress')}${goals(C.goals)}<p class="j-reward">Chapter keepsake: <b>${esc(C.reward.name)}</b></p>${visit(J.focusPet || 'chai', api, 'Continue the journey')}` : visit('chai', api, 'Keep exploring')}
        <h3 class="cw-h3">Your story so far</h3><ol class="j-chapters">${J.chapters.map(c => `<li class="${c.done ? 'is-done' : c.active ? 'is-active' : ''}"><span>${c.done ? '✓' : c.number}</span><div><b>${esc(c.title)}</b><small>${c.done ? 'Chapter complete' : `${Math.round(c.pct * 100)}% complete`}</small></div></li>`).join('')}</ol>
        <p class="cw-sub">Take your time. Chapters and keepsakes have no deadline.</p>
      ` : section === 'collection' ? `
        <p class="cw-sub">${J.earnedCount} of ${J.totalCount} keepsakes collected. Each one is a thank-you from a friend. Tap one to see its story.</p>
        <div class="j-collection">${J.keepsakes.map(k => `<details class="j-keepsake${k.earned ? ' is-earned' : ''}" data-keepsake="${esc(k.id)}"><summary>${keepsakeArt(k.pet, k.earned, k.icon, k.tier)}<b>${esc(k.name)}</b><small>${k.earned ? '✓ Collected' : `${k.have} / ${k.goal}`}</small>${meter(k.pct, k.name)}</summary><p>${esc(k.line)}</p><p>${esc(k.requirement)}</p>${visit(k.pet, api)}</details>`).join('')}</div>
        <p class="cw-sub">Your collection stays with your saved progress, even when you take a break.</p>
      ` : `
        <div class="j-cover j-cover--week">${keepsakeArt('toffee')}<p class="cw-eyebrow">Weekly expedition</p><h3>${esc(W.title)}</h3><p>${esc(W.line)}</p></div>
        <p class="j-week-date">New expedition ${new Date(W.endsAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        ${meter(W.pct, 'Weekly expedition progress')}${goals(W.goals)}
        <p class="j-reward">${W.done ? 'Expedition complete! Your friends have a whole new story to tell.' : `${W.doneCount} of ${W.goals.length} goals complete. Every answered question is a little more light.`}</p>
        ${visit(W.goals.find(g => !g.done && g.pet)?.pet || J.focusPet || 'chai', api, W.done ? 'Explore another story' : 'Help with the expedition')}
        <p class="cw-sub">Play on any days that suit you. Learning also counts toward your permanent chapters and keepsakes.</p>
      `}</div>`;
    for (const button of card.querySelectorAll('[data-j-tab]')) button.addEventListener('click', () => { section = button.dataset.jTab; draw(true); });
    if (focusTab) card.querySelector(`[data-j-tab="${section}"]`).focus({ preventScroll: true });
  }
  draw();
}
