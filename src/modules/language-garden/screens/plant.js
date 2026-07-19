/**
 * plant.js (screen) — a plant at a glance (LANGUAGE_GARDEN_BIBLE §16.3):
 * the plant large, its key once earned in one line, its members as the
 * words you can now read, and exactly one contextual primary action —
 * Grow, Revisit, or nothing at all for a plant at rest.
 *
 * What is deliberately ABSENT (§16.3, Principle 22): no stage word, no
 * accuracy, no last-reviewed date, no next-review countdown, no strength
 * meter — and, crucially, no way to passively re-read the members'
 * meanings. The Garden has no screen that lets a learner re-read the
 * answers (§7.1); the words are shown as capability, the key is shown as
 * the key, and retrieval happens only in a Revisit. The stage is read
 * from the plant's own form, never stated as a word.
 *
 * Phase V, Stage W4 (LANGUAGE GARDEN — THE WORLD.md Part 10.4): "opening
 * a plant is an approach, not a page." The biome stays as ground —
 * becalmed, exactly as Part 10.3 stages a session — and the approached
 * plant stands in its own working-set slot (or the horizon, if it is
 * already Ancient), sized up and permanently named at its base, because
 * the plant screen is one of the three places Part 8.4 allows a standing
 * name. Its key, its leaves, and its one action float on the veil — the
 * only surface text ever sits on inside the world.
 */

import { loadLGItem, listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions, listGardenSeeds, sessionsForFamily } from '../logic/store.js';
import { computePlantState } from '../../../core/engine/garden-session.js';
import { biomeForFamily } from '../logic/biomes.js';
import { computeGroundTier } from '../logic/effort.js';
import { atmosphereFor } from '../logic/atmosphere.js';
import { focusedGroveSceneHTML } from './biome.js';
import { GARDEN_LINES, SEED_LINES } from '../../../core/mentor/garden-voice.js';
import { escapeHTML } from '../../../core/utils/format.js';
import '../../../ui/components/cat-plant.js';

export async function renderPlant(outlet, context, params) {
  let family, history, seed, allFamilies, allSessions, seeds;
  try {
    family = await loadLGItem(params.id);
    const registry = await listLGItems();
    const loaded = await loadLGItems(registry.map((i) => i.id));
    allFamilies = [...loaded.values()];
    allSessions = await listGardenSessions(context.storage);
    seeds = await listGardenSeeds(context.storage);
    history = sessionsForFamily(allSessions, params.id);
    seed = seeds.find((s) => s.family_id === params.id) ?? null;
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>This plant will not open</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted"><a href="#/garden">Back to the garden</a></p></div></section>`;
    return;
  }

  const biome = biomeForFamily(family);
  const biomeHome = biome ? `#/garden/biome/${biome.slug}` : '#/garden';

  const state = computePlantState(seed ? [...history, seed] : history);
  const reachedWords = new Set(history.filter((s) => s.reach?.is_correct).map((s) => s.reach.vocab_id));
  const known = !['open_ground', 'seed'].includes(state.stage);

  const actionHTML = !known
    ? `<button class="btn btn--primary btn--block" id="plant-action">${GARDEN_LINES.growAction}</button>`
    : state.due !== 'none'
      ? `<button class="btn btn--primary btn--block" id="plant-action">${GARDEN_LINES.revisitAction}</button>`
      : '';

  // A seed carried back through the Gate arrives with a note about where
  // it came from (§19.2) — the one thing a seed is allowed to say.
  const keyHTML = known ? `
    <p class="lg-plant__key">${escapeHTML(family.root.label)}. ${escapeHTML(family.root.origin_language)}.
      ${escapeHTML(family.root.core_meaning[0].toUpperCase() + family.root.core_meaning.slice(1))}.</p>
    ${family.root.mentor_note ? `<p class="hint">${escapeHTML(family.root.mentor_note)}</p>` : ''}
  ` : state.stage === 'seed' && seed?.source?.title ? `
    <p class="muted">${escapeHTML(SEED_LINES.arrivedFrom(seed.source.title))}</p>
  ` : `<p class="muted">This root has not opened yet.</p>`;

  // Members appear as the words you can now read. A held-out Reach word only
  // appears once it has actually been constructed. The WORD is shown — never
  // its meaning, which would be re-reading the answer (Principle 22).
  const leafHTML = (m) => {
    const visible = !m.held_out ? known : reachedWords.has(m.vocab_id);
    if (!visible) return '';
    return `<span class="lg-leaf">${escapeHTML(m.word)}</span>`;
  };

  const ground = computeGroundTier(allSessions);
  const atmo = atmosphereFor();
  const focusView = { family, state, history, biome };
  const worldHTML = focusedGroveSceneHTML(biome, ground, atmo, allFamilies, allSessions, seeds, focusView);

  outlet.innerHTML = `
    <section class="screen lg-plant lg-plant--enter" data-time="${atmo.time}">
      <div class="lg-plant__world" aria-hidden="true">${worldHTML}</div>
      <button class="lg-plant__close" id="lg-plant-close" aria-label="Back to the wood">×</button>

      <div class="lg-plant__veil-wrap">
        <div class="lgx-veil lg-plant__veil">
          ${keyHTML}

          ${known ? `
            <div class="lg-plant__leaves">
              ${family.members.map(leafHTML).join('')}
            </div>` : ''}

          ${actionHTML}
        </div>
      </div>
    </section>
  `;

  outlet.querySelector('#lg-plant-close').addEventListener('click', () => { location.hash = biomeHome; });
  outlet.querySelector('#plant-action')?.addEventListener('click', () => {
    location.hash = `#/garden/session/${family.meta.id}`;
  });
}
