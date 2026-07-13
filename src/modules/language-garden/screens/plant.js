/**
 * plant.js (screen) — a plant at a glance (LANGUAGE_GARDEN_BIBLE §10):
 * the key once earned, members as tappable leaves each opening one line
 * of recall, a quiet planting date, and exactly one contextual primary
 * action: Grow, Revisit, or nothing at all for an evergreen at rest.
 * No percentages, no "N of M learned."
 */

import { loadLGItem } from '../../../core/content-loader/loader.js';
import { listGardenSessions, sessionsForFamily } from '../logic/store.js';
import { computePlantState } from '../../../core/engine/garden-session.js';
import { GARDEN_LINES } from '../../../core/mentor/garden-voice.js';
import { escapeHTML, formatDate } from '../../../core/utils/format.js';

const STAGE_LABEL = { seed: 'Open ground', sprout: 'Sprout', sapling: 'Sapling', in_leaf: 'In leaf', evergreen: 'Evergreen' };

export async function renderPlant(outlet, context, params) {
  let family, history;
  try {
    family = await loadLGItem(params.id);
    const all = await listGardenSessions(context.storage);
    history = sessionsForFamily(all, params.id);
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>This plant will not open</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted"><a href="#/garden">Back to the grove</a></p></div></section>`;
    return;
  }

  const state = computePlantState(history);
  const reachedWords = new Set(history.filter((s) => s.reach?.is_correct).map((s) => s.reach.vocab_id));
  const known = state.stage !== 'seed';

  const actionHTML = state.stage === 'seed'
    ? `<button class="btn btn--primary btn--block" id="plant-action">${GARDEN_LINES.growAction}</button>`
    : state.due !== 'none'
      ? `<button class="btn btn--primary btn--block" id="plant-action">${GARDEN_LINES.revisitAction}</button>`
      : '';

  const keyHTML = known ? `
    <p class="lg-plant__key">${escapeHTML(family.root.label)}. ${escapeHTML(family.root.origin_language)}.
      ${escapeHTML(family.root.core_meaning[0].toUpperCase() + family.root.core_meaning.slice(1))}.</p>
    ${family.root.mentor_note ? `<p class="hint">${escapeHTML(family.root.mentor_note)}</p>` : ''}
  ` : `<p class="muted">This root has not opened yet.</p>`;

  const leafHTML = (m) => {
    const visible = !m.held_out ? known : reachedWords.has(m.vocab_id);
    if (!visible) return '';
    return `
      <button class="lg-leaf" data-word="${escapeHTML(m.word)}">
        <span class="lg-leaf__word">${escapeHTML(m.word)}</span>
        <span class="lg-leaf__meaning" hidden>${escapeHTML(m.meaning)}</span>
      </button>`;
  };

  outlet.innerHTML = `
    <section class="screen lg-plant">
      <div class="session-bar"><a href="#/garden">← Grove</a></div>

      <div class="lg-plant__hero">
        <cat-plant stage="${state.stage}" due="${state.due}"></cat-plant>
      </div>
      <p class="screen__eyebrow">${STAGE_LABEL[state.stage]}${state.plantedAt ? ` · ${escapeHTML(GARDEN_LINES.plantedOn(formatDate(state.plantedAt)))}` : ''}</p>
      <h1>${escapeHTML(family.root.label)}</h1>

      ${keyHTML}

      ${known ? `
        <div class="lg-plant__leaves">
          ${family.members.map(leafHTML).join('')}
        </div>` : ''}

      ${actionHTML}
    </section>
  `;

  for (const leaf of outlet.querySelectorAll('.lg-leaf')) {
    leaf.addEventListener('click', () => {
      const line = leaf.querySelector('.lg-leaf__meaning');
      line.hidden = !line.hidden;
    });
  }

  outlet.querySelector('#plant-action')?.addEventListener('click', () => {
    location.hash = `#/garden/session/${family.meta.id}`;
  });
}
