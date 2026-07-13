/**
 * learn.js (screen) — a family's Learning Page: every word, the shared
 * meaning, and both transfer challenges revealed, revisitable any time
 * regardless of whether the learner has attempted it. Route:
 * /wd/learn/:id.
 */

import { loadWDItem } from '../../../core/content-loader/loader.js';
import { latestByItem } from '../logic/store.js';
import { branchInfo } from '../logic/tree.js';
import { escapeHTML, formatDate } from '../../../core/utils/format.js';

const SHARES_MEANING = ['root', 'prefix', 'suffix'];

export async function renderWDLearn(outlet, { storage }, params) {
  let item;
  let answer = null;
  try {
    item = await loadWDItem(params.id);
    const latest = await latestByItem(storage);
    const a = latest.get(params.id);
    if (a && a.is_correct !== null) answer = a;
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>Can't open this Learning Page</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted"><a href="#/wd">Back to the Tree</a></p></div></section>`;
    return;
  }

  const m = item.meta;
  const u = item.unit;
  const branch = branchInfo(u.kind);
  const sharesMeaning = SHARES_MEANING.includes(u.kind);

  outlet.innerHTML = `
    <section class="screen">
      <div class="session-bar">
        <a href="#/wd">← Tree</a>
        <a href="#/wd/session/${m.id}">Meet it again</a>
      </div>

      <article class="mentor">
        <header class="mentor__hero">
          <p class="screen__eyebrow">Learning page · Word DNA · ${escapeHTML(branch.label)}</p>
          <h1 class="mentor__title">${escapeHTML(u.label)}</h1>
          <p class="mentor__lede">${sharesMeaning
            ? `${escapeHTML(u.origin_language)} · means ${escapeHTML(u.core_meaning)}`
            : escapeHTML(branch.description)}</p>
        </header>

        ${answer ? `
          <p class="wdx-verdict ${answer.is_correct ? 'is-correct' : 'is-wrong'}">
            Your latest visit (${escapeHTML(formatDate(answer.finished_at))}):
            ${answer.is_correct ? 'every guess and every transfer test landed.' : 'not every guess landed yet.'}
          </p>` : `
          <p class="hint" style="margin-bottom: var(--space-4)">You have not met this
          family yet. Reading it here first is fine. Meeting it in the journey first
          teaches more.</p>`}

        <section class="mentor__section">
          <div class="mentor__mark"><h2>Every word in this family</h2><div class="rule"></div></div>
          <div class="vocab">
            ${item.members.map((mem) => `
              <div class="vocab__item">
                <div class="vocab__word">${escapeHTML(mem.word)}${mem.held_out ? ' <span class="hint">· held out for transfer</span>' : ''}</div>
                ${mem.context_sentence ? `<p class="vocab__use">“${escapeHTML(mem.context_sentence)}”</p>` : ''}
                <p class="vocab__meaning">${escapeHTML(mem.meaning)}</p>
              </div>`).join('')}
          </div>
        </section>

        <section class="mentor__section">
          <div class="mentor__mark"><h2>Why it threads through</h2><div class="rule"></div></div>
          <p>${escapeHTML(item.discovery.understand_note)}</p>
        </section>

        <section class="mentor__section">
          <div class="mentor__mark"><h2>The transfer test</h2><div class="rule"></div></div>
          ${item.discovery.applies.map((a) => `
            <div class="wd-apply">
              <p class="wd-apply__prompt">${escapeHTML(a.prompt)}</p>
              <p class="hint">${escapeHTML(a.options.find((o) => o.correct).text)}</p>
            </div>`).join('')}
        </section>

        <div class="wdx__habit">
          <span class="wdx__habit-glyph" aria-hidden="true">⋔</span>
          <div>
            <div class="wdx__habit-label">Worth keeping</div>
            <p>${escapeHTML(u.mentor_note)}</p>
          </div>
        </div>
      </article>

      <div class="session-actions">
        <a class="btn" href="#/wd/session/${m.id}">Meet it again</a>
        <a class="btn btn--primary" href="#/wd">Continue the journey</a>
      </div>
    </section>
  `;
}
