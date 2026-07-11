/**
 * learn.js (screen) — a paragraph's Learning Page: the full teaching
 * layer (logic/teach.js), revisitable any time, with the learner's
 * latest attempt and their own written summary woven in when they
 * exist. Route: /ps/learn/:id.
 */

import { loadPSItem } from '../../../core/content-loader/loader.js';
import { latestByItem, ownSummaryFor } from '../logic/store.js';
import { tierInfo } from '../logic/tiers.js';
import { renderTeaching, architectureLabel } from '../logic/teach.js';
import { escapeHTML, formatDate } from '../../../core/utils/format.js';

export async function renderPSLearn(outlet, { storage }, params) {
  let item;
  let answer = null;
  let own = null;
  try {
    item = await loadPSItem(params.id);
    const latest = await latestByItem(storage);
    const a = latest.get(params.id);
    if (a && a.is_correct !== null) answer = a;
    own = await ownSummaryFor(storage, params.id);
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>Can't open this Learning Page</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted"><a href="#/ps">Back to the journey</a></p></div></section>`;
    return;
  }

  const m = item.meta;
  const tier = tierInfo(m.tier);

  outlet.innerHTML = `
    <section class="screen">
      <div class="session-bar">
        <a href="#/ps">← Journey</a>
        <a href="#/ps/session/${m.id}">Try it again</a>
      </div>

      <article class="mentor">
        <header class="mentor__hero">
          <p class="screen__eyebrow">Learning page · Para Summary · ${escapeHTML(tier.label)}</p>
          <h1 class="mentor__title">${escapeHTML(m.title)}</h1>
          <p class="mentor__lede">${escapeHTML(architectureLabel(m.architecture))} ·
            ${escapeHTML(m.genre)} · ${escapeHTML(m.learning_objective)}</p>
        </header>

        ${answer ? `
          <p class="psx-verdict ${answer.is_correct ? 'is-correct' : 'is-wrong'}">
            Your latest attempt (${escapeHTML(formatDate(answer.finished_at))}):
            option ${escapeHTML(answer.chosen)}${answer.is_correct
              ? '. That is the author’s point.'
              : `. The author's point is option ${escapeHTML(item.question.correct)}.`}
          </p>` : `
          <p class="hint" style="margin-bottom: var(--space-4)">You have not
          answered this one yet. Reading the walkthrough first is fine.
          Writing your own summary first teaches more.</p>`}

        ${own ? `
          <div class="ps-compare" style="margin-bottom: var(--space-5)">
            <div class="psx__label">Your sentence, against the author's</div>
            <p class="ps-compare__yours">${escapeHTML(own.text)}</p>
            <p class="ps-compare__ideal">${escapeHTML(item.ideal_summary)}</p>
          </div>` : ''}

        ${renderTeaching(item, answer)}
      </article>

      <div class="session-actions">
        <a class="btn" href="#/ps/session/${m.id}">Try it again</a>
        <a class="btn btn--primary" href="#/ps">Continue the journey</a>
      </div>
    </section>
  `;
}
