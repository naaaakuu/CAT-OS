/**
 * result.js — the one result screen every challenge ends on, and the
 * loudest moment in the product. In order:
 *
 *   the star reveal      one star at a time, each with its own chime
 *   the verdict          honest, in the valley's voice
 *   the facts            accuracy, pace, time — the CAT numbers
 *   the crafts           what this run MADE, counted up on the screen
 *   the world's change   what the valley looks like now because of it
 *   the unlock           if a work just became buildable, it shouts
 *   the ways onward
 *
 * Modules pass their own mentor block and review rows; the frame is
 * shared so the whole product ends the same way.
 */

import { play } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';
import { regionBySlug } from '../regions.js';
import { STAR_WORDS, bagEntries, bagTotal } from '../economy.js';
import { bagText } from '../craft-ui.js';

const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.5l-6 3.2 1.3-6.6L2.4 9.5l6.7-.8z" fill="#F4C443" stroke="#B88A12" stroke-width="1" stroke-linejoin="round"/><path d="M9.6 9.4l2.4-4.6 1.2 2.5" fill="none" stroke="#FFF1B8" stroke-width="1.2" stroke-linecap="round"/></svg>`;

/**
 * @param {HTMLElement} outlet
 * @param {object} o
 *   region       slug of the place this run belongs to
 *   eyebrow      "The Meadow · High frequency A"
 *   title        "Round complete"
 *   result       { stars, flawless, accuracy, inTime }
 *   facts        [{ label, value, good }]
 *   earned       bag of crafts this run made
 *   worldLine    html: what changed in the world
 *   unlocked     [{ id, name, line, region }] works that just became buildable
 *   extraHTML    optional html placed under the facts (mentor, review)
 *   actions      [{ label, href, primary, onClick }]
 *   focusSlug    where the world should look on return (defaults to region)
 */
export function renderResult(outlet, o) {
  const region = regionBySlug(o.region);
  const stars = o.result?.stars ?? 0;
  const earned = o.earned ?? null;
  const won = earned ? bagEntries(earned) : [];
  sessionStorage.setItem('world:focus', o.focusSlug ?? o.region);
  if (o.worldLine) { sessionStorage.setItem('world:changed', o.region); sessionStorage.setItem('world:change-line', o.worldLine); }
  if (won.length) sessionStorage.setItem('world:earned', JSON.stringify(earned));
  const unlocked = o.unlocked ?? [];
  if (unlocked.length) sessionStorage.setItem('world:unlocked', JSON.stringify(unlocked.map((w) => ({ id: w.id, name: w.name }))));

  outlet.innerHTML = `
    <section class="result result--${stars === 3 ? 'gold' : stars ? 'warm' : 'cool'}" aria-live="polite">
      <div class="result__sky" aria-hidden="true"></div>
      <div class="result__sparks" id="result-sparks" aria-hidden="true"></div>
      <div class="result__scroll">
        <p class="result__eyebrow">${escapeHTML(o.eyebrow ?? region?.name ?? '')}</p>
        <h1 class="result__title">${escapeHTML(o.title ?? 'Complete')}</h1>
        <div class="result__stars" id="result-stars" aria-label="${stars} of 3 stars">
          ${[0, 1, 2].map((i) => `<div class="result__star ${i < stars ? '' : 'is-off'}" data-i="${i}">${STAR_SVG}</div>`).join('')}
        </div>
        <p class="result__verdict">${escapeHTML(o.verdict ?? verdictFor(o.result))}</p>
        <div class="result__facts">
          ${(o.facts ?? []).map((f) => `<div class="result__fact ${f.good ? 'is-good' : ''}"><b>${escapeHTML(String(f.value))}</b><span>${escapeHTML(f.label)}</span></div>`).join('')}
        </div>
        ${won.length ? `
        <div class="won late" aria-label="Earned ${escapeHTML(bagText(earned))}">
          <p class="won__head">Made here</p>
          <div class="won__row">${won.map((c) => `<span class="won__craft craft--${c.key}" data-to="${c.amount}"><i aria-hidden="true"></i><b>0</b><small>${c.name}</small></span>`).join('')}</div>
        </div>` : ''}
        ${o.worldLine ? `<p class="result__world late">${o.worldLine}</p>` : ''}
        ${unlocked.length ? `
        <div class="unlockbar late">
          <div class="unlockbar__glow" aria-hidden="true"></div>
          <p class="unlockbar__eyebrow">Ready to build</p>
          <p class="unlockbar__name">${escapeHTML(unlocked[0].name)}${unlocked.length > 1 ? ` <span>and ${unlocked.length - 1} more</span>` : ''}</p>
          <p class="unlockbar__line">${escapeHTML(unlocked[0].line ?? '')}</p>
          <a class="unlockbar__go" href="#/world/place/hearth?works=1">Go to the Workshop</a>
        </div>` : ''}
        <div class="late result__extra">${o.extraHTML ?? ''}</div>
        <div class="result__actions">
          ${(o.actions ?? []).map((a, i) => a.href
            ? `<a class="g-btn ${a.primary ? 'g-btn--primary' : ''}" href="${a.href}" data-action="${i}">${escapeHTML(a.label)}</a>`
            : `<button class="g-btn ${a.primary ? 'g-btn--primary' : ''}" data-action="${i}">${escapeHTML(a.label)}</button>`).join('')}
        </div>
      </div>
    </section>`;

  for (const el of outlet.querySelectorAll('[data-action]')) {
    const a = o.actions[Number(el.dataset.action)];
    el.addEventListener('click', (e) => { play('tap'); if (a.onClick) { e.preventDefault(); a.onClick(); } });
  }

  /* ---- The reveal ---- */
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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

  // The crafts count up, each with a soft chime — the moment the learner
  // sees that thinking made something.
  if (won.length) {
    setTimeout(() => {
      const els = [...outlet.querySelectorAll('.won__craft')];
      els.forEach((el, i) => setTimeout(() => countUp(el, reduce), reduce ? 0 : i * 260));
    }, base + 150);
  }
  if (unlocked.length) setTimeout(() => play('unlock'), base + 400 + won.length * 260);
}

/** Roll a craft chip's number up to its target, with a chime at the start. */
function countUp(el, reduce) {
  if (!el?.isConnected) return;
  const to = Number(el.dataset.to || 0);
  const b = el.querySelector('b');
  el.classList.add('is-in');
  play('ink');
  if (reduce || to <= 0) { if (b) b.textContent = String(to); return; }
  const dur = Math.min(900, 220 + to * 14);
  const t0 = performance.now();
  const step = (t) => {
    if (!el.isConnected) return;
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - (1 - p) ** 3;
    b.textContent = String(Math.round(to * eased));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
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

export { bagTotal };
