/**
 * browser.js — the RC library as a reading JOURNEY (0.6.0): overall
 * progress, stages that introduce themselves, and one recommended
 * next passage carrying the lamp. Stages recommend; nothing locks.
 */

import { listRCItems } from '../../../core/content-loader/loader.js';
import { groupByStage, recommendNext, STAGE_INFO } from '../../../core/learning/journey.js';
import { latestByPassage, listSessions } from '../logic/store.js';
import { formatPercent } from '../../../core/utils/format.js';
import { escapeHTML } from '../../../core/utils/format.js';

export async function renderBrowser(outlet, { storage }) {
  outlet.innerHTML = `
    <section class="screen">
      <header class="journey-head">
        <p class="screen__eyebrow">Practice · Reading Comprehension</p>
        <h1>Your reading journey</h1>
      </header>
      <div id="rc-list" aria-busy="true">
        <div class="skeleton skeleton--line" style="width: 40%"></div>
        <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>
      </div>
    </section>
  `;
  const list = outlet.querySelector('#rc-list');
  const done = () => list.removeAttribute('aria-busy');

  let items;
  let latest;
  let sessions;
  try {
    [items, latest, sessions] = await Promise.all([
      listRCItems(), latestByPassage(storage), listSessions(storage),
    ]);
  } catch (err) {
    list.innerHTML = `<div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted">If you are offline, open this screen once online so
      passages can be cached.</p></div>`;
    done();
    return;
  }

  done();
  if (items.length === 0) {
    list.innerHTML = `<div class="empty">
      <div class="empty__glyph" aria-hidden="true">¶</div>
      <h2>No passages yet</h2>
      <p>New passages arrive through the content pipeline. Add content files
      to <code>content/reading-comprehension/</code> and register them.</p>
    </div>`;
    return;
  }

  const next = recommendNext(items, sessions);
  const groups = groupByStage(items);
  const readCount = items.filter((i) => latest.has(i.id)).length;

  const progressHTML = `
    <p class="journey-head__sub">${readCount === 0
      ? `${items.length} passages, from first steps to elite`
      : `${readCount} of ${items.length} passages read`}</p>
    <div class="journey-track" aria-hidden="true">
      <div class="journey-track__fill" style="width: ${Math.round((readCount / items.length) * 100)}%"></div>
    </div>`;

  const itemHTML = (item) => {
    const s = latest.get(item.id);
    const isNext = next?.item.id === item.id;
    const status = s
      ? `<span class="badge badge--success">Read · ${formatPercent(s.score.accuracy)}</span>`
      : isNext
        ? `<span class="badge badge--info">Next for you</span>`
        : '';
    return `
      <a class="list-item ${isNext ? 'list-item--next' : ''}" href="#/rc/session/${item.id}"
         aria-label="${escapeHTML(item.title)}, ${escapeHTML(item.difficulty)}, about ${item.estimated_time_min} minutes">
        <div class="list-item__title">${escapeHTML(item.title)}</div>
        <div class="list-item__meta">
          <span class="badge"><span class="dot dot--${escapeHTML(item.difficulty)}"></span>${escapeHTML(item.difficulty)}</span>
          <span class="badge">${escapeHTML(item.genre)}</span>
          <span>~${item.estimated_time_min} min · ${item.word_count} words</span>
          ${status}
        </div>
        ${isNext && next.reason
          ? `<p class="list-item__reason">${escapeHTML(next.reason)}</p>` : ''}
        ${s ? `
          <div class="list-item__footer">
            <span>Theme: ${escapeHTML(item.theme)}</span>
          </div>` : ''}
      </a>
      ${s ? `
        <p class="row__hint" style="margin: calc(-1 * var(--space-2)) var(--space-2) var(--space-3)">
          <a href="#/rc/mentor/${item.id}">Learning Page</a> ·
          <a href="#/rc/review/${item.id}">Review</a>
        </p>` : ''}
    `;
  };

  list.innerHTML = `
    ${progressHTML}
    ${groups.map(({ stage, items: group }) => {
      const info = STAGE_INFO[stage] ?? { label: stage, description: '' };
      const read = group.filter((i) => latest.has(i.id)).length;
      return `
        <div class="stage-head">
          <h2>${escapeHTML(info.label)}</h2>
          <div class="rule"></div>
          <span class="stage-head__count">${read} of ${group.length} read</span>
        </div>
        ${info.description ? `<p class="stage-desc">${escapeHTML(info.description)}</p>` : ''}
        ${group.map(itemHTML).join('')}
      `;
    }).join('')}
  `;
}
