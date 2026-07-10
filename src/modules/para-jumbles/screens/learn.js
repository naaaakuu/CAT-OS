/**
 * learn.js (screen) — a jumble's Learning Page: the full four-layer
 * teaching (logic/teach.js), revisitable any time, with the learner's
 * latest attempt woven in when one exists. Route: /pj/learn/:id.
 */

import { loadPJItem } from '../../../core/content-loader/loader.js';
import { latestByItem } from '../logic/store.js';
import { tierInfo } from '../logic/tiers.js';
import { renderTeaching, macroLabel } from '../logic/teach.js';
import { escapeHTML, formatDate } from '../../../core/utils/format.js';

export async function renderPJLearn(outlet, { storage }, params) {
  let item;
  let answer = null;
  try {
    item = await loadPJItem(params.id);
    const latest = await latestByItem(storage);
    const a = latest.get(params.id);
    if (a && a.is_correct !== null) answer = a;
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>Can't open this Learning Page</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted"><a href="#/pj">Back to the journey</a></p></div></section>`;
    return;
  }

  const m = item.meta;
  const tier = tierInfo(m.tier);

  outlet.innerHTML = `
    <section class="screen">
      <div class="session-bar">
        <a href="#/pj">← Journey</a>
        <a href="#/pj/session/${m.id}">Solve it again</a>
      </div>

      <article class="mentor">
        <header class="mentor__hero">
          <p class="screen__eyebrow">Learning page · Para Jumbles · ${escapeHTML(tier.label)}</p>
          <h1 class="mentor__title">${escapeHTML(m.title)}</h1>
          <p class="mentor__lede">${escapeHTML(macroLabel(m.macro_pattern))} ·
            ${escapeHTML(m.genre)} · ${escapeHTML(m.learning_objective)}</p>
        </header>

        ${answer ? `
          <p class="pjx-verdict ${answer.is_correct ? 'is-correct' : 'is-wrong'}">
            Your latest attempt (${escapeHTML(formatDate(answer.finished_at))}):
            ${escapeHTML(answer.entered.join(''))}${answer.is_correct
              ? '. That is the author’s order.'
              : `. The author wrote ${escapeHTML(item.correct_order.join(''))}.`}
          </p>` : `
          <p class="hint" style="margin-bottom: var(--space-4)">You have not
          solved this one yet. Reading the walkthrough first is fine. Solving
          it first teaches more.</p>`}

        ${renderTeaching(item, answer)}
      </article>

      <div class="session-actions">
        <a class="btn" href="#/pj/session/${m.id}">Solve it again</a>
        <a class="btn btn--primary" href="#/pj">Continue the journey</a>
      </div>
    </section>
  `;
}
