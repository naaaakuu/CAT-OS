/**
 * growth.js (shell screen) — the reader's growth, made visible.
 *
 * This is deliberately NOT a mistake notebook, a history page, or a
 * statistics screen. It answers three humane questions, forward-facing:
 *
 *   How do I read?            (Reading DNA — evidence-gated observations)
 *   What have I collected?    (the one-lesson-per-session concepts)
 *   What did I say about it?  (the reader's own reflections)
 *
 * No marks appear anywhere on this screen. Everything is derived from
 * stored sessions + content (dna.js) or read from the learning store;
 * nothing here judges, everything reveals.
 *
 * Lives in src/shell/ — the first extracted shell screen (the
 * extraction ROADMAP_V2 anticipated). Imports core/ and ui/ only.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { loadRCPassages, listRCItems } from '../core/content-loader/loader.js';
import { deriveDNA } from '../core/mentor/dna.js';
import { listLessons, listReflections } from '../core/mentor/records.js';
import { RECALL_RETIRED_AFTER } from '../core/mentor/lesson.js';
import { escapeHTML, formatDate } from '../core/utils/format.js';

const KIND_LABEL = {
  growth: 'Growth',
  strength: 'Working for you',
  watch: 'Keep an eye on',
};

export async function renderGrowth(outlet, { storage }) {
  outlet.innerHTML = `
    <section class="screen">
      <p class="screen__eyebrow">Growth</p>
      <h1>How your reading is changing</h1>
      <div id="growth-body" aria-busy="true">
        <div class="skeleton skeleton--line" style="width: 55%"></div>
        <div class="skeleton"></div><div class="skeleton"></div>
      </div>
    </section>
  `;
  const body = outlet.querySelector('#growth-body');

  let sessions = [];
  let lessons = [];
  let reflections = [];
  let items = [];
  try {
    [sessions, lessons, reflections, items] = await Promise.all([
      storage.getAll(STORES.SESSIONS),
      listLessons(storage),
      listReflections(storage),
      listRCItems().catch(() => []),
    ]);
  } catch { /* storage unavailable — the empty state below still renders */ }
  const titles = new Map(items.map((i) => [i.id, i.title]));
  body.removeAttribute('aria-busy');

  /* ---- Before the first session: an invitation, not an apology ---- */
  if (sessions.length === 0) {
    body.innerHTML = `
      <div class="empty">
        <div class="empty__glyph" aria-hidden="true">❦</div>
        <h2>Your reading story starts here</h2>
        <p>Read your first passage and the mentor starts listening — quietly
        noticing how you read, what's working, and the one thing worth
        adjusting next. No scores live on this page. Only growth.</p>
        <a class="btn btn--primary" href="#/rc">Read the first passage</a>
      </div>`;
    return;
  }

  const passages = await loadRCPassages(sessions.map((s) => s.passage_id));
  const dna = deriveDNA(sessions, passages);

  /* ---- How you read ---- */
  const dnaHTML = dna.observations.length === 0 ? `
    <div class="card">
      <p class="muted" style="margin:0">The mentor is still listening. Patterns
      only appear here once there is enough evidence to be fair about them —
      usually after a few more sessions. Nothing is being missed.</p>
    </div>` : dna.observations.map((o) => `
    <div class="dna dna--${o.kind}">
      <div class="dna__kind">${KIND_LABEL[o.kind]}</div>
      <div class="dna__title">${escapeHTML(o.title)}</div>
      <p class="dna__body">${escapeHTML(o.body)}</p>
      <p class="dna__evidence">${escapeHTML(o.evidence)}</p>
    </div>`).join('');

  /* ---- Concepts you've collected ---- */
  const recent = lessons.slice(0, 8);
  const lessonsHTML = recent.length === 0 ? `
    <p class="muted">Finish a session and the mentor keeps its one lesson here.</p>
  ` : `
    ${recent.map((l) => {
      const absorbed = (l.recall_count ?? 0) >= RECALL_RETIRED_AFTER;
      return `
      <div class="row">
        <div class="row__lead">
          <span class="row__icon" aria-hidden="true">${absorbed ? '✓' : '◌'}</span>
          <div>
            <div class="row__label">${escapeHTML(l.title)}</div>
            <div class="row__hint">${escapeHTML(formatDate(l.created_at))} ·
              <a href="#/rc/mentor/${escapeHTML(l.passage_id)}">${escapeHTML(titles.get(l.passage_id) ?? l.passage_id)}</a></div>
          </div>
        </div>
        ${absorbed
          ? '<span class="badge badge--success">Absorbed</span>'
          : (l.recall_count ?? 0) > 0
            ? `<span class="badge">Recalled ${l.recall_count} of ${RECALL_RETIRED_AFTER}</span>`
            : '<span class="badge badge--info">Fresh</span>'}
      </div>`;
    }).join('')}
    <p class="hint" style="margin-top: var(--space-3)">A concept is absorbed after
    ${RECALL_RETIRED_AFTER} successful twenty-second recalls — then it retires, quietly.</p>`;

  /* ---- In your own words ---- */
  const latestReflection = reflections[0] ?? null;
  const reflectionHTML = latestReflection ? `
    <div class="card">
      <h2>In your own words</h2>
      <p class="growth-quote"><span class="growth-quote__starter">${escapeHTML(latestReflection.prompt)}</span>
        ${escapeHTML(latestReflection.text)}</p>
      <p class="row__hint">${escapeHTML(formatDate(latestReflection.updated_at))} ·
        <a href="#/rc/mentor/${escapeHTML(latestReflection.passage_id)}">${escapeHTML(titles.get(latestReflection.passage_id) ?? latestReflection.passage_id)}</a></p>
    </div>` : '';

  body.innerHTML = `
    <p class="muted" style="margin-top: calc(-1 * var(--space-2)); margin-bottom: var(--space-4)">
      What the mentor has noticed — observations, never judgments. No scores
      live on this page.</p>

    <div class="stage-head"><h2>How you read</h2><div class="rule"></div></div>
    ${dnaHTML}

    <div class="stage-head"><h2>Concepts you've collected</h2><div class="rule"></div></div>
    <div class="card">${lessonsHTML}</div>

    ${reflectionHTML}
  `;
}
