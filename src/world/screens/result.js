/**
 * result.js — the one result screen every challenge ends on, and the
 * loudest moment in the product. In order:
 *
 *   the star reveal      one star at a time, each with its own chime
 *   the verdict          honest, in the village's voice
 *   the facts            accuracy, pace, time — the CAT numbers
 *   the friend           the host friend hopping, "You helped Chai!" with
 *                        the stars counted up, the level, a new heart
 *   the ways onward
 *
 * It stands in the host pet's home: the painted crop of the village
 * behind a warm veil, the same language as every other screen.
 * Modules pass their own mentor block and review rows; the frame is
 * shared so the whole product ends the same way.
 */

import { play } from '../audio.js';
import { motionReduced } from '../../core/engagement/feedback.js';
import { escapeHTML } from '../../core/utils/format.js';
import { regionBySlug } from '../regions.js';
import { STAR_WORDS } from '../economy.js';
import { petForPlace } from '../../pets/pets.js';
import { paintedBackdrop } from '../../pets/sprite.js';
import { petBlock, countGifts, baseGifts } from '../rewards.js';

const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.5l-6 3.2 1.3-6.6L2.4 9.5l6.7-.8z" fill="#F4C443" stroke="#B88A12" stroke-width="1" stroke-linejoin="round"/><path d="M9.6 9.4l2.4-4.6 1.2 2.5" fill="none" stroke="#FFF1B8" stroke-width="1.2" stroke-linecap="round"/></svg>`;

/**
 * @param {HTMLElement} outlet
 * @param {object} o
 *   region       slug of the place this run belongs to
 *   eyebrow      "The Meadow · High frequency A"
 *   title        "Round complete"
 *   result       { stars, flawless, accuracy, inTime }
 *   facts        [{ label, value, good }]
 *   pet          the host pet id (defaults to the region's pet)
 *   change       what the run did for the village (economy.js changeBetween)
 *   setsDone     collections this run finished
 *   extraHTML    optional html placed under the pet (mentor, review)
 *   actions      [{ label, href, primary, quiet, onClick }]
 *   focusSlug    where the village should look on return (defaults to region)
 */
export function renderResult(outlet, o) {
  const region = regionBySlug(o.region);
  const stars = o.result?.stars ?? 0;
  const pet = o.pet ?? petForPlace(o.region) ?? 'toffee';
  sessionStorage.setItem('world:focus', o.focusSlug ?? o.region);

  outlet.innerHTML = `
    ${paintedBackdrop(pet, { cls: 'pv-backdrop--result' })}
    <section class="result result--pv result--${stars === 3 ? 'gold' : stars ? 'warm' : 'cool'}" data-host-pet="${pet}">
      <div class="result__sparks" id="result-sparks" aria-hidden="true"></div>
      <div class="result__scroll">
        <p class="result__eyebrow">${escapeHTML(o.eyebrow ?? region?.name ?? '')}</p>
        <h1 class="result__title" tabindex="-1">${escapeHTML(o.title ?? 'Complete')}</h1>
        <p class="sr-only" role="status">${escapeHTML(o.title ?? 'Complete')}. ${stars} of 3 stars.</p>
        <div class="result__stars" id="result-stars" aria-label="${stars} of 3 stars">
          ${[0, 1, 2].map((i) => `<div class="result__star ${i < stars ? '' : 'is-off'}" data-i="${i}">${STAR_SVG}</div>`).join('')}
        </div>
        <p class="result__verdict">${escapeHTML(o.verdict ?? verdictFor(o.result))}</p>
        <div class="result__facts">
          ${(o.facts ?? []).map((f) => `<div class="result__fact ${f.good ? 'is-good' : ''}"><b>${escapeHTML(String(f.value))}</b><span>${escapeHTML(f.label)}</span></div>`).join('')}
        </div>
        <div class="late result__pet">${petBlock({ ...(o.change ?? baseGifts(pet, stars, o.result?.flawless)), pet })}</div>
        ${(o.setsDone ?? []).length ? `
        <div class="setsdone late">
          <p class="setsdone__eyebrow">${(o.setsDone ?? []).length === 1 ? 'A set finished' : `${o.setsDone.length} sets finished`}</p>
          ${o.setsDone.slice(0, 3).map((c) => `
            <p class="setsdone__row"><b>${escapeHTML(c.name)}</b><span>all ${c.total} ${escapeHTML(c.unit)}</span></p>`).join('')}
        </div>` : ''}
        <div class="late result__extra">${o.extraHTML ?? ''}</div>
        <div class="result__actions">
          ${(o.actions ?? []).map((a, i) => a.href
            // Three buttons of the same weight is three decisions. One
            // primary, one ordinary, and the third — always "and another way
            // back" — as a quiet link.
            ? `<a class="g-btn ${a.primary ? 'g-btn--primary' : a.quiet ? 'g-btn--quiet' : ''}" href="${a.href}" data-action="${i}">${escapeHTML(a.label)}</a>`
            : `<button class="g-btn ${a.primary ? 'g-btn--primary' : a.quiet ? 'g-btn--quiet' : ''}" data-action="${i}">${escapeHTML(a.label)}</button>`).join('')}
        </div>
      </div>
    </section>`;

  /* The whole scroll used to be one aria-live region: finishing a passage
     announced six hundred and eighty-two characters in a single breath,
     before a learner could have looked at any of it. The outcome is one
     line, said once; everything else is there to be read at their own pace,
     starting from the heading their focus is now on. */
  requestAnimationFrame(() => { try { outlet.querySelector('.result__title')?.focus({ preventScroll: true }); } catch { /* fine */ } });

  for (const el of outlet.querySelectorAll('[data-action]')) {
    const a = o.actions[Number(el.dataset.action)];
    el.addEventListener('click', (e) => { play('tap'); if (a.onClick) { e.preventDefault(); a.onClick(); } });
  }

  /* ---- The reveal ---- */
  const reduce = motionReduced();
  const starEls = [...outlet.querySelectorAll('.result__star')];
  if (stars === 0) play('nostar', { delay: 0.3 });
  for (let i = 0; i < stars; i += 1) {
    const delay = reduce ? 0 : 500 + i * 520;
    setTimeout(() => {
      if (!starEls[i]?.isConnected) return;
      starEls[i].classList.add('is-on');
      play(`star${i + 1}`);
      if (i === stars - 1 && stars === 3) sparks(outlet.querySelector('#result-sparks'));
    }, delay);
  }

  const base = reduce ? 0 : 1100 + stars * 120;
  const lates = [...outlet.querySelectorAll('.late')];
  lates.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), base + (reduce ? 0 : i * 220)));

  // The stars count up, each with a bright tick: the moment the learner
  // sees that thinking helped somebody.
  setTimeout(() => countGifts(outlet.querySelector('.result__pet'), reduce), base + 150);
  if (o.change?.heart || o.change?.levelUp) setTimeout(() => play(o.change.levelUp ? 'levelup' : 'heart'), base + 2200);
}

function verdictFor(r) {
  if (!r) return '';
  const w = STAR_WORDS[r.stars] ?? '';
  if (r.stars === 3) return r.flawless ? `Flawless. Every answer right, inside the time. ${w}.` : `Accurate and in time. That is CAT pace.`;
  if (r.stars === 2) return r.inTime ? `Accurate, with a few misses. The pace is there.` : `Accurate, but over time. Speed comes with the next pass.`;
  if (r.stars === 1) return `Done, with a few that got away. Read the misses once: that is where the marks are.`;
  return `Fewer than half right this time, and that is how learning starts. Read the misses below, then try one more.`;
}

function sparks(el) {
  if (!el) return;
  const n = 26;
  let html = '';
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const d = 70 + Math.random() * 120;
    html += `<i style="left:50%;top:180px;--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d - 40)}px;animation-delay:${Math.round(Math.random() * 200)}ms;background:${['#F6D77A', '#E9963A', '#F4C443', '#8FB56A'][i % 4]}"></i>`;
  }
  el.innerHTML = html;
}

export function starHTML(n, max = 3) {
  return `${'★'.repeat(n)}<span class="off">${'☆'.repeat(Math.max(0, max - n))}</span>`;
}

export function formatClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
