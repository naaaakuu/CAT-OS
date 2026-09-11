/**
 * result.js — the one result screen every challenge ends on: the star
 * reveal (stars fly in one by one with their chimes), the honest facts
 * (accuracy, pace, time), the Ink earned, and what changed in the world —
 * then the ways onward. Modules pass their own mentor block and review
 * rows; the frame is shared so the whole product ends the same way.
 */

import { play } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';
import { regionBySlug } from '../regions.js';
import { STAR_WORDS } from '../economy.js';

const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.5l-6 3.2 1.3-6.6L2.4 9.5l6.7-.8z" fill="#F4C443" stroke="#B88A12" stroke-width="1" stroke-linejoin="round"/><path d="M9.6 9.4l2.4-4.6 1.2 2.5" fill="none" stroke="#FFF1B8" stroke-width="1.2" stroke-linecap="round"/></svg>`;

/**
 * @param {HTMLElement} outlet
 * @param {object} o
 *   region       slug of the place this run belongs to
 *   eyebrow      "The Meadow · High frequency A"
 *   title        "Round complete"
 *   result       { stars, flawless, accuracy, inTime }
 *   facts        [{ label, value, good }]
 *   ink          number earned
 *   worldLine    html: what changed in the world
 *   extraHTML    optional html placed under the facts (mentor, review)
 *   actions      [{ label, href, primary, onClick }]
 *   focusSlug    where the world should look on return (defaults to region)
 */
export function renderResult(outlet, o) {
  const region = regionBySlug(o.region);
  const stars = o.result?.stars ?? 0;
  sessionStorage.setItem('world:focus', o.focusSlug ?? o.region);
  if (o.worldLine) { sessionStorage.setItem('world:changed', o.region); sessionStorage.setItem('world:change-line', o.worldLine); }

  outlet.innerHTML = `
    <section class="result" aria-live="polite">
      <div class="result__sparks" id="result-sparks" aria-hidden="true"></div>
      <p class="result__eyebrow">${escapeHTML(o.eyebrow ?? region?.name ?? '')}</p>
      <h1 class="result__title">${escapeHTML(o.title ?? 'Complete')}</h1>
      <div class="result__stars" id="result-stars" aria-label="${stars} of 3 stars">
        ${[0, 1, 2].map((i) => `<div class="result__star ${i < stars ? '' : 'is-off'}" data-i="${i}">${STAR_SVG}</div>`).join('')}
      </div>
      <p class="result__verdict">${escapeHTML(o.verdict ?? verdictFor(o.result))}</p>
      <div class="result__facts">
        ${(o.facts ?? []).map((f) => `<div class="result__fact ${f.good ? 'is-good' : ''}"><b>${escapeHTML(String(f.value))}</b><span>${escapeHTML(f.label)}</span></div>`).join('')}
      </div>
      ${o.ink ? `<div class="result__ink late"><span class="ink" aria-hidden="true"></span>+${o.ink} Ink</div>` : ''}
      ${o.worldLine ? `<p class="result__world late">${o.worldLine}</p>` : ''}
      <div class="late" style="width:100%;display:contents">${o.extraHTML ?? ''}</div>
      <div class="result__actions">
        ${(o.actions ?? []).map((a, i) => a.href
          ? `<a class="g-btn ${a.primary ? 'g-btn--primary' : ''}" href="${a.href}" data-action="${i}">${escapeHTML(a.label)}</a>`
          : `<button class="g-btn ${a.primary ? 'g-btn--primary' : ''}" data-action="${i}">${escapeHTML(a.label)}</button>`).join('')}
      </div>
    </section>`;

  for (const el of outlet.querySelectorAll('[data-action]')) {
    const a = o.actions[Number(el.dataset.action)];
    el.addEventListener('click', (e) => { play('tap'); if (a.onClick) { e.preventDefault(); a.onClick(); } });
  }

  // The reveal: one star at a time, each with its own chime; sparks behind
  // the third. No stars: one low note, and the verdict does the talking.
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const starEls = [...outlet.querySelectorAll('.result__star')];
  if (stars === 0) { play('nostar', { delay: 0.3 }); }
  for (let i = 0; i < stars; i += 1) {
    const delay = reduce ? 0 : 500 + i * 520;
    setTimeout(() => {
      if (!starEls[i]?.isConnected) return;
      starEls[i].classList.add('is-on');
      play(`star${i + 1}`);
      if (i === stars - 1 && stars === 3) sparks(outlet.querySelector('#result-sparks'));
    }, delay);
  }
  if (o.ink) setTimeout(() => play('ink'), reduce ? 100 : 1300);
  const lates = [...outlet.querySelectorAll('.late')];
  lates.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), reduce ? 0 : 1200 + i * 250));
  for (const el of outlet.querySelectorAll('.result__mentor, .result__review')) { el.classList.add('late'); setTimeout(() => el.classList.add('is-in'), reduce ? 0 : 1700); }
}

function verdictFor(r) {
  if (!r) return '';
  const w = STAR_WORDS[r.stars] ?? '';
  if (r.stars === 3) return r.flawless ? `Flawless. Every answer right, inside the time. ${w}.` : `Accurate and in time. That is CAT pace.`;
  if (r.stars === 2) return r.inTime ? `Accurate, with a few misses. The pace is there.` : `Accurate, but over time. Speed comes with the next pass.`;
  if (r.stars === 1) return `Completed, with meaningful mistakes. Read the misses once: that is where the marks are.`;
  return `Not yet. Fewer than half right. Slow down, read the misses, and come back.`;
}

function sparks(el) {
  if (!el) return;
  const n = 26;
  let html = '';
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const d = 70 + Math.random() * 120;
    html += `<i style="left:50%;top:180px;--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d - 40)}px;animation-delay:${Math.round(Math.random() * 200)}ms;background:${['#F6D77A', '#FFFFFF', '#F4C443', '#8ACBA8'][i % 4]}"></i>`;
  }
  el.innerHTML = html;
}

export function starHTML(n, max = 3) {
  return `${'★'.repeat(n)}<span class="off">${'★'.repeat(Math.max(0, max - n))}</span>`;
}

export function formatClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
