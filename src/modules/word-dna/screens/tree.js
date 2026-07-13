/**
 * tree.js (screen) — the Word DNA Language Tree: overall progress, six
 * branches that introduce themselves (Roots, Prefixes, Suffixes,
 * Foreign Words, CAT Vocabulary, and a reserved Frequently Confused
 * Words branch), and one recommended next family carrying the lamp.
 * Branches recommend; nothing locks — the same principle as every
 * other CAT OS journey (WORD_DNA_BIBLE §2).
 */

import { listWDItems } from '../../../core/content-loader/loader.js';
import { groupByBranch, recommendNextWD, branchInfo } from '../logic/tree.js';
import { latestByItem } from '../logic/store.js';
import { escapeHTML } from '../../../core/utils/format.js';

export async function renderWDTree(outlet, { storage }) {
  outlet.innerHTML = `
    <section class="screen">
      <header class="journey-head">
        <p class="screen__eyebrow">Practice · Word DNA</p>
        <h1>The Language Tree</h1>
      </header>
      <div id="wd-list" aria-busy="true">
        <div class="skeleton skeleton--line" style="width: 40%"></div>
        <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>
      </div>
    </section>
  `;
  const list = outlet.querySelector('#wd-list');
  const done = () => list.removeAttribute('aria-busy');

  let items;
  let latest;
  try {
    [items, latest] = await Promise.all([listWDItems(), latestByItem(storage)]);
  } catch (err) {
    list.innerHTML = `<div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted">If you are offline, open this screen once online so
      Word DNA families can be cached.</p></div>`;
    done();
    return;
  }

  done();
  if (items.length === 0) {
    list.innerHTML = `<div class="empty">
      <div class="empty__glyph" aria-hidden="true">⋔</div>
      <h2>No families yet</h2>
      <p>New roots, prefixes, and word groups arrive through the content pipeline. Add
      content files to <code>content/word-dna/</code> and register them.</p>
    </div>`;
    return;
  }

  const solvedIds = new Set([...latest.entries()]
    .filter(([, a]) => a.is_correct === true).map(([id]) => id));
  const triedIds = new Set([...latest.entries()]
    .filter(([, a]) => a.is_correct !== null).map(([id]) => id));
  const next = recommendNextWD(items, solvedIds, triedIds);
  const groups = groupByBranch(items);

  const progressHTML = `
    <p class="journey-head__sub">${solvedIds.size === 0
      ? `${items.length} families, from roots to CAT vocabulary`
      : `${solvedIds.size} of ${items.length} families understood`}</p>
    <div class="journey-track" aria-hidden="true">
      <div class="journey-track__fill" style="width: ${Math.round((solvedIds.size / items.length) * 100)}%"></div>
    </div>
    <p class="hint" style="margin: 0 0 var(--space-3)">
      <a href="#/wd/about">How this journey works</a> ·
      <a href="#/wd/garden">Your Word Garden</a></p>`;

  const itemHTML = (item) => {
    const a = latest.get(item.id);
    const isNext = next?.item.id === item.id;
    const status = a && a.is_correct !== null
      ? (a.is_correct
        ? '<span class="badge badge--success">Understood</span>'
        : '<span class="badge badge--warning">Not yet</span>')
      : isNext
        ? '<span class="badge badge--info">Next for you</span>'
        : '';
    return `
      <a class="list-item ${isNext ? 'list-item--next' : ''}" href="#/wd/session/${item.id}"
         aria-label="${escapeHTML(item.title)}, ${item.member_count} words, about ${item.estimated_time_min} minutes">
        <div class="list-item__title">${escapeHTML(item.title)}</div>
        <div class="list-item__meta">
          <span>${item.member_count} words</span>
          <span>~${item.estimated_time_min} min</span>
          ${status}
        </div>
        ${isNext && next.reason
          ? `<p class="list-item__reason">${escapeHTML(next.reason)}</p>` : ''}
      </a>
      ${a && a.is_correct !== null ? `
        <p class="row__hint" style="margin: calc(-1 * var(--space-2)) var(--space-2) var(--space-3)">
          <a href="#/wd/learn/${item.id}">Learning Page</a>
        </p>` : ''}
    `;
  };

  list.innerHTML = `
    ${progressHTML}
    ${groups.map(({ kind, items: group }) => {
      const info = branchInfo(kind);
      const understood = group.filter((i) => solvedIds.has(i.id)).length;
      return `
        <div class="stage-head">
          <h2>${escapeHTML(info.label)}</h2>
          <div class="rule"></div>
          <span class="stage-head__count">${understood} of ${group.length}</span>
        </div>
        ${info.description ? `<p class="wd-branch-desc">${escapeHTML(info.description)}</p>` : ''}
        ${group.map(itemHTML).join('')}
      `;
    }).join('')}
    ${groups.some((g) => g.kind === 'confused') ? '' : `
      <div class="stage-head">
        <h2>Frequently Confused Words</h2>
        <div class="rule"></div>
      </div>
      <div class="list-item" aria-disabled="true" style="opacity: var(--opacity-dim)">
        <div class="list-item__title">Coming later</div>
        <div class="list-item__meta"><span class="badge">Not built yet</span></div>
      </div>`}
  `;
}
