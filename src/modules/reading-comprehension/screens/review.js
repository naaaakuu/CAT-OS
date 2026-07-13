/**
 * review.js (screen) — review mode: the passage plus every question
 * of the user's most recent attempt, with verdicts and full
 * explanations. Mistakes are never wasted; this is where they are
 * studied (PRODUCT_BLUEPRINT §7 — the notebook's first form).
 */

import { loadRCPassage } from '../../../core/content-loader/loader.js';
import { latestSessionFor } from '../logic/store.js';
import { escapeHTML, formatDate, formatDuration } from '../../../core/utils/format.js';
import '../../../ui/components/cat-passage.js';
import '../../../ui/components/cat-question-card.js';
import '../../../ui/components/cat-explanation.js';

export async function renderReview(outlet, { storage }, params) {
  let passage;
  let last;
  try {
    passage = await loadRCPassage(params.id);
    last = await latestSessionFor(storage, params.id);
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>Can't open review</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }

  if (!last) {
    outlet.innerHTML = `
      <section class="screen">
        <div class="empty">
          <div class="empty__glyph" aria-hidden="true">¶</div>
          <h2>No attempt yet</h2>
          <p>Review opens after you practice this passage once.</p>
          <a class="btn btn--primary" href="#/rc/session/${passage.meta.id}">Practice it now</a>
        </div>
      </section>`;
    return;
  }

  const byQ = new Map(last.answers.map((a) => [a.question_id, a]));

  outlet.innerHTML = `
    <section class="screen">
      <div class="session-bar">
        <a href="#/rc">← Journey</a>
        <span>Attempt of ${escapeHTML(formatDate(last.finished_at))} · ${formatDuration(last.duration_ms)}</span>
      </div>
      <cat-passage></cat-passage>
      <div id="review-questions"></div>
      <div class="session-actions">
        <a class="btn" href="#/rc/session/${passage.meta.id}">Re-attempt</a>
        <a class="btn btn--primary" href="#/rc/mentor/${passage.meta.id}">Open the Learning Page</a>
      </div>
    </section>
  `;
  outlet.querySelector('cat-passage').passage = passage.passage;

  // Evidence jumps: from any explanation straight to the source paragraph.
  // Listener lives on the screen element, so it dies with the screen.
  outlet.querySelector('section.screen').addEventListener('click', (e) => {
    const a = e.target.closest('[data-anchor]');
    if (!a) return;
    outlet.querySelector('cat-passage').highlight(a.dataset.anchor);
  });

  const holder = outlet.querySelector('#review-questions');
  passage.questions.forEach((q, i) => {
    const a = byQ.get(q.id);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<p class="screen__eyebrow">Question ${i + 1} of ${passage.questions.length}</p>`;

    const qc = document.createElement('cat-question-card');
    card.appendChild(qc);
    const ex = document.createElement('cat-explanation');
    card.appendChild(ex);
    holder.appendChild(card);

    qc.question = q;
    qc.reveal = { chosen: a?.chosen ?? null, correct: q.correct };
    ex.data = { question: q, chosen: a?.chosen ?? null };
  });
}
