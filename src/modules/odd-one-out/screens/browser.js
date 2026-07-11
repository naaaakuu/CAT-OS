/**
 * browser.js — the Odd One Out library as a detection JOURNEY:
 * overall progress, eight tiers that introduce themselves (each names
 * the ONE skill it teaches, per the staged learning philosophy), and
 * one recommended next item carrying the lamp. Tiers recommend;
 * nothing locks (the same principle as the RC, PJ and PS journeys).
 */

import { listOOOItems } from '../../../core/content-loader/loader.js';
import { groupByTier, recommendNextOOO, tierInfo } from '../logic/tiers.js';
import { latestByItem } from '../logic/store.js';
import { escapeHTML } from '../../../core/utils/format.js';

export async function renderOOOBrowser(outlet, { storage }) {
  outlet.innerHTML = `
    <section class="screen">
      <header class="journey-head">
        <p class="screen__eyebrow">Practice · Odd One Out</p>
        <h1>Your detection journey</h1>
      </header>
      <div id="ooo-list" aria-busy="true">
        <div class="skeleton skeleton--line" style="width: 40%"></div>
        <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>
      </div>
    </section>
  `;
  const list = outlet.querySelector('#ooo-list');
  const done = () => list.removeAttribute('aria-busy');

  let items;
  let latest;
  try {
    [items, latest] = await Promise.all([listOOOItems(), latestByItem(storage)]);
  } catch (err) {
    list.innerHTML = `<div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted">If you are offline, open this screen once online so
      items can be cached.</p></div>`;
    done();
    return;
  }

  done();
  if (items.length === 0) {
    list.innerHTML = `<div class="empty">
      <div class="empty__glyph" aria-hidden="true">⊘</div>
      <h2>No items yet</h2>
      <p>New items arrive through the content pipeline. Add content files
      to <code>content/odd-one-out/</code> and register them.</p>
    </div>`;
    return;
  }

  const solvedIds = new Set([...latest.entries()]
    .filter(([, a]) => a.is_correct === true).map(([id]) => id));
  const triedIds = new Set([...latest.entries()]
    .filter(([, a]) => a.is_correct !== null).map(([id]) => id));
  const next = recommendNextOOO(items, solvedIds, triedIds);
  const groups = groupByTier(items);

  const progressHTML = `
    <p class="journey-head__sub">${solvedIds.size === 0
      ? `${items.length} items, from first steps to Premium`
      : `${solvedIds.size} of ${items.length} intruders identified`}</p>
    <div class="journey-track" aria-hidden="true">
      <div class="journey-track__fill" style="width: ${Math.round((solvedIds.size / items.length) * 100)}%"></div>
    </div>
    <p class="hint" style="margin: 0 0 var(--space-3)">
      <a href="#/ooo/about">How this journey works</a></p>`;

  const itemHTML = (item) => {
    const a = latest.get(item.id);
    const isNext = next?.item.id === item.id;
    const status = a && a.is_correct !== null
      ? (a.is_correct
        ? '<span class="badge badge--success">Identified</span>'
        : '<span class="badge badge--warning">Not yet</span>')
      : isNext
        ? '<span class="badge badge--info">Next for you</span>'
        : '';
    return `
      <a class="list-item ${isNext ? 'list-item--next' : ''}" href="#/ooo/session/${item.id}"
         aria-label="${escapeHTML(item.title)}, ${escapeHTML(item.difficulty)}, about ${item.estimated_time_min} minutes">
        <div class="list-item__title">${escapeHTML(item.title)}</div>
        <div class="list-item__meta">
          <span class="badge"><span class="dot dot--${escapeHTML(item.difficulty)}"></span>${escapeHTML(item.difficulty)}</span>
          <span class="badge">${escapeHTML(item.genre)}</span>
          <span>~${item.estimated_time_min} min · 5 sentences</span>
          ${status}
        </div>
        ${isNext && next.reason
          ? `<p class="list-item__reason">${escapeHTML(next.reason)}</p>` : ''}
      </a>
      ${a && a.is_correct !== null ? `
        <p class="row__hint" style="margin: calc(-1 * var(--space-2)) var(--space-2) var(--space-3)">
          <a href="#/ooo/learn/${item.id}">Learning Page</a>
        </p>` : ''}
    `;
  };

  list.innerHTML = `
    ${progressHTML}
    ${groups.map(({ tier, items: group }) => {
      const info = tierInfo(tier);
      const solved = group.filter((i) => solvedIds.has(i.id)).length;
      const allTried = group.every((i) => triedIds.has(i.id));
      return `
        <div class="stage-head">
          <h2>${escapeHTML(info.label)}</h2>
          <div class="rule"></div>
          <span class="stage-head__count">${solved} of ${group.length} identified</span>
        </div>
        ${info.skill ? `<p class="ps-skill">Teaches: ${escapeHTML(info.skill)}</p>` : ''}
        ${info.description ? `<p class="stage-desc">${escapeHTML(info.description)}</p>` : ''}
        <p class="stage-desc" style="margin-top: calc(-1 * var(--space-2))">
          <a href="#/ooo/session/${escapeHTML(tier)}">
            ${allTried ? 'Practice this tier again' : `Practice ${escapeHTML(info.label)} as a set`}</a></p>
        ${group.map(itemHTML).join('')}
      `;
    }).join('')}
  `;
}
