/**
 * learn.js (screen) — an item's Learning Page: the full teaching
 * layer (logic/teach.js), revisitable any time, with the learner's
 * latest attempt woven in when one exists. Route: /ooo/learn/:id.
 */

import { loadOOOItem } from '../../../core/content-loader/loader.js';
import { latestByItem } from '../logic/store.js';
import { tierInfo } from '../logic/tiers.js';
import { renderTeaching, spineLabel, violationName } from '../logic/teach.js';
import { escapeHTML, formatDate } from '../../../core/utils/format.js';

export async function renderOOOLearn(outlet, { storage }, params) {
  let item;
  let answer = null;
  try {
    item = await loadOOOItem(params.id);
    const latest = await latestByItem(storage);
    const a = latest.get(params.id);
    if (a && a.is_correct !== null) answer = a;
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>Can't open this Learning Page</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted"><a href="#/ooo">Back to the journey</a></p></div></section>`;
    return;
  }

  const m = item.meta;
  const tier = tierInfo(m.tier);

  outlet.innerHTML = `
    <section class="screen">
      <div class="session-bar">
        <a href="#/ooo">← Journey</a>
        <a href="#/ooo/session/${m.id}">Try it again</a>
      </div>

      <article class="mentor">
        <header class="mentor__hero">
          <p class="screen__eyebrow">Learning page · Odd One Out · ${escapeHTML(tier.label)}</p>
          <h1 class="mentor__title">${escapeHTML(m.title)}</h1>
          <p class="mentor__lede">${escapeHTML(spineLabel(m.spine_type))} ·
            ${escapeHTML(m.genre)} · ${escapeHTML(m.learning_objective)}</p>
        </header>

        ${answer ? `
          <p class="oox-verdict ${answer.is_correct ? 'is-correct' : 'is-wrong'}">
            Your latest attempt (${escapeHTML(formatDate(answer.finished_at))}):
            you set ${escapeHTML(answer.chosen)} apart${answer.is_correct
              ? '. That is the sentence with no seat in the paragraph.'
              : `. The sentence with no seat is ${escapeHTML(item.outlier)}.`}
          </p>` : `
          <p class="hint" style="margin-bottom: var(--space-4)">You have not
          tried this one yet. Reading the walkthrough first is fine. Building
          the paragraph yourself first teaches more.</p>`}

        <p class="hint" style="margin-bottom: var(--space-4)">This item's
        outlier: ${escapeHTML(violationName(m.violation_type).toLowerCase())}.</p>

        ${renderTeaching(item, answer)}
      </article>

      <div class="session-actions">
        <a class="btn" href="#/ooo/session/${m.id}">Try it again</a>
        <a class="btn btn--primary" href="#/ooo">Continue the journey</a>
      </div>
    </section>
  `;
}
