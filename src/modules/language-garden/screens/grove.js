/**
 * grove.js (screen) — the Root Grove: LANGUAGE_GARDEN_BIBLE §10's "the
 * Garden (home)". One screen, no scrolling, plant states readable
 * without reading, at most one plant visibly asking. No dashboard, no
 * counts, no list view — the scene IS the status display.
 *
 * §6.3 "Beginning": the very first open shows no menu and no tutorial.
 * If nothing has ever been grown, this screen hands straight to the
 * first family's Grow session instead of rendering itself — "the first
 * Attempt is the first thing they touch."
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions } from '../logic/store.js';
import { deriveGroveScene } from '../logic/scene.js';
import { pickAmbientEvent, hasNest } from '../logic/ambient.js';
import { EMPTY_DAY_LINES, pick } from '../../../core/mentor/garden-voice.js';
import { escapeHTML } from '../../../core/utils/format.js';

const STAGE_LABEL = { seed: 'Open ground', sprout: 'Sprout', sapling: 'Sapling', in_leaf: 'In leaf', evergreen: 'Evergreen' };

export async function renderGrove(outlet, context) {
  outlet.innerHTML = `
    <section class="screen grove-loading">
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton" style="height: 260px; border-radius: var(--radius-xl)"></div>
    </section>
  `;

  let items, sessions;
  try {
    const registry = await listLGItems();
    const loaded = await loadLGItems(registry.map((i) => i.id));
    items = registry.map((i) => loaded.get(i.id)).filter(Boolean).sort((a, b) => a.meta.id.localeCompare(b.meta.id));
    sessions = await listGardenSessions(context.storage);
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>The grove will not open</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }

  if (items.length === 0) {
    outlet.innerHTML = `<section class="screen"><div class="empty">
      <div class="empty__glyph" aria-hidden="true">⚘</div>
      <h2>The grove is waiting</h2>
      <p>Add a plant to <code>content/language-garden/</code> to begin.</p>
    </div></section>`;
    return;
  }

  // First open, ever: no session screen, no menu — the first Attempt is
  // the first thing touched (Bible §6.3). Navigating by an actual hash
  // change (not a direct renderGardenSession(...) call) matters: the
  // Growth beat's "Back to the garden" button works by setting
  // location.hash to '#/garden', and a hash write that doesn't actually
  // change the hash fires no 'hashchange' event at all — if we'd stayed
  // on '#/garden' throughout the auto-launched session, that final tap
  // would have silently done nothing.
  if (sessions.length === 0) {
    location.hash = `#/garden/session/${items[0].meta.id}`;
    return;
  }

  const scene = deriveGroveScene(items, sessions);
  renderSceneHTML(outlet, context, scene);
}

function renderSceneHTML(outlet, context, scene) {
  const { plants, askingId, openSeedId } = scene;
  const sessionSeed = `grove:${new Date().toDateString()}`;
  const event = pickAmbientEvent();

  const foreground = plants.filter((p) => p.state.stage !== 'evergreen');
  const horizon = plants.filter((p) => p.state.stage === 'evergreen');

  outlet.innerHTML = `
    <section class="screen grove">
      <div class="grove-scene" data-time="${timeClass()}">
        ${horizon.length ? `<div class="grove-horizon" aria-hidden="true">
          ${horizon.map((p) => `<cat-plant size="horizon" stage="evergreen"></cat-plant>`).join('')}
        </div>` : ''}
        <div class="grove-ambient" aria-hidden="true">${event ? ambientMarkup(event) : ''}</div>
        <div class="grove-grid">
          ${foreground.map((p) => plantSlotHTML(p, askingId, openSeedId)).join('')}
        </div>
      </div>

      <nav class="grove-links">
        <a href="#/garden/journal">Journal</a>
      </nav>
    </section>
  `;

  if (!askingId && !openSeedId) {
    const note = document.createElement('p');
    note.className = 'grove-note';
    note.textContent = pick(sessionSeed, EMPTY_DAY_LINES.standAndClose);
    outlet.querySelector('.grove').appendChild(note);
  } else if (openSeedId && !askingId) {
    const note = document.createElement('p');
    note.className = 'grove-note';
    note.textContent = pick(sessionSeed, EMPTY_DAY_LINES.oneSeedReady);
    outlet.querySelector('.grove').appendChild(note);
  }

  for (const el of outlet.querySelectorAll('[data-plant-id]')) {
    el.addEventListener('click', () => {
      location.hash = `#/garden/plant/${el.dataset.plantId}`;
    });
  }
}

function plantSlotHTML(p, askingId, openSeedId) {
  const id = p.family.meta.id;
  const isAsking = id === askingId;
  const isOpenSeed = id === openSeedId;
  const nest = hasNest(p.state);
  return `
    <button class="grove-plant ${isAsking ? 'grove-plant--asking' : ''} ${isOpenSeed ? 'grove-plant--invite' : ''}"
            data-plant-id="${id}" aria-label="${escapeHTML(p.family.root.label)}, ${STAGE_LABEL[p.state.stage]}">
      <span class="grove-plant__art">
        <cat-plant stage="${p.state.stage}" due="${p.state.due}" ${nest ? 'nest' : ''}></cat-plant>
      </span>
      <span class="grove-plant__label">${escapeHTML(p.family.root.label)}</span>
    </button>
  `;
}

function timeClass() {
  const h = new Date().getHours();
  if (h < 6 || h >= 20) return 'night';
  if (h >= 17) return 'dusk';
  return 'day';
}

function ambientMarkup(event) {
  switch (event) {
    case 'bird': return '<span class="grove-visitor grove-visitor--bird" aria-hidden="true">◜</span>';
    case 'butterfly': return '<span class="grove-visitor grove-visitor--butterfly" aria-hidden="true">❋</span>';
    case 'firefly': return '<span class="grove-visitor grove-visitor--firefly" aria-hidden="true">•</span>';
    case 'petal': return '<span class="grove-visitor grove-visitor--petal" aria-hidden="true">❁</span>';
    case 'leaf-stir': return '<span class="grove-visitor grove-visitor--leaf-stir" aria-hidden="true">⁘</span>';
    default: return '';
  }
}
