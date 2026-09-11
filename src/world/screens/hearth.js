/**
 * hearth.js (screen) — home. Who the learner has become (title, level),
 * today's three quests, the Ink they hold and what it can build, the
 * collections (stars and mastery across every place), the records, the
 * achievements, and the doors to the study (Growth) and Settings.
 */

import { WorldRenderer } from '../engine/canvas.js';
import { buildBuildingScene } from '../engine/map.js';
import { regionBySlug, REGIONS } from '../regions.js';
import { loadWorld } from '../state.js';
import { availableUpgrades, UPGRADES, INK } from '../economy.js';
import { evaluate } from '../../core/engagement/achievements.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { play, unlock, startMusic, startAmbience } from '../audio.js';
import { escapeHTML, formatDate } from '../../core/utils/format.js';
import { listGardenSightings } from '../../modules/language-garden/logic/store.js';

export async function renderHearth(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');
  const region = regionBySlug('hearth');
  let world;
  try { world = await loadWorld(storage); } catch (err) {
    outlet.innerHTML = `<section class="place"><div class="place__body" style="padding-top:60px"><h1 class="place__title">The Hearth will not open</h1><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }
  const { state } = world;
  const atmo = state.atmo;
  outlet.innerHTML = `
    <section class="place" aria-label="The Hearth">
      <div class="place__hero"><canvas id="hero" aria-label="The Hearth, your cottage"></canvas><a class="place__back" href="#/world" id="back">← The valley</a><div class="place__hero-stat"><span class="hud__pill"><span class="ink" aria-hidden="true"></span>${state.ink.balance}</span><span class="hud__pill"><span class="star" aria-hidden="true">★</span>${state.stars}</span></div></div>
      <div class="place__body" id="body"></div>
    </section>`;
  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', 'hearth'); play('close'); });
  const canvas = outlet.querySelector('#hero');
  const heroScene = buildBuildingScene('cottage', state.hearth.level, atmo, { practicedToday: state.hearth.practicedToday });
  const renderer = new WorldRenderer(canvas, heroScene, { worldW: heroScene.W, worldH: heroScene.H, fit: 'cover', pannable: false, maxZoom: 6 });
  renderer.lookAt(heroScene.W / 2, heroScene.focusY ?? heroScene.H * 0.6, { animate: false });
  renderer.start();
  const onHash = () => { renderer.destroy(); window.removeEventListener('hashchange', onHash); };
  window.addEventListener('hashchange', onHash);
  window.addEventListener('pointerdown', () => { unlock(); startMusic('hearth', { hour: atmo.hour }); startAmbience('hearth', atmo); }, { capture: true, once: true });
  startMusic('hearth', { hour: atmo.hour }); startAmbience('hearth', atmo);

  let sightings = [];
  try { sightings = await listGardenSightings(storage); } catch { /* none */ }

  const body = outlet.querySelector('#body');
  const render = () => {
    const xp = state.hearth.level_xp;
    const built = new Set(state.builds);
    const avail = availableUpgrades(state.builds);
    const ach = evaluate(state.engagement);
    const unlocked = ach.filter((a) => a.unlocked);
    const collections = [
      ['reading-room', `${state.reading.stars}/${state.reading.maxStars} ★`, `${state.reading.read} passages read`],
      ['rootwood', `${state.rootwood.grownCount} grown`, `${state.rootwood.ancientCount} ancient · ${state.rootwood.landmarks} landmarks`],
      ['meadow', `${state.meadow.mastered} in bloom`, `${state.meadow.fieldsDone} fields complete`],
      ['pond', `${state.pond.koi} koi`, `${state.pond.mastered} twins told apart`],
      ['thicket', `${state.thicket.lanterns} lanterns`, `${state.thicket.mastered} loanwords`],
      ['terraces', `${state.terraces.done}/${state.terraces.total}`, 'families climbed'],
      ['loom', `${state.loom.solved}/${state.loom.total}`, `${state.loom.stars} ★`],
      ['table', `${state.table.solved}/${state.table.total}`, `${state.table.stars} ★`],
      ['bench', `${state.bench.solved}/${state.bench.total}`, `${state.bench.stars} ★`],
    ];
    body.innerHTML = `
      <p class="place__eyebrow">Home</p>
      <h1 class="place__title">${escapeHTML(state.hearth.title)}</h1>
      <p class="place__line">Level ${xp.level} · ${xp.intoLevel} of ${xp.needed} to the next · ${state.hearth.activeDays} day${state.hearth.activeDays === 1 ? '' : 's'} in the valley${state.hearth.streak.current ? ` · ${state.hearth.streak.current}-day run` : ''}</p>
      <div class="place__progress"><div class="bar"><i style="width:${Math.round(xp.progress * 100)}%"></i></div><b>Lv ${xp.level}</b></div>

      <div class="place__section">
        <h2>Today's quests</h2>
        <p class="sub">Three small aims, new every day. Each pays ${INK.quest} Ink when done.</p>
        <div class="g-list">
          ${state.quests.map((q) => `<a class="g-row ${q.complete ? '' : ''}" href="${regionBySlug(q.region)?.route ?? '#/world'}"><span class="g-row__num" style="${q.complete ? 'background:var(--g-accent);color:#fff' : ''}">${q.complete ? '✓' : `${q.done}/${q.goal}`}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(q.title)}</span><span class="g-row__meta">${escapeHTML(q.line)}</span></span><span class="g-row__where">${escapeHTML(regionBySlug(q.region)?.name ?? '')}</span></a>`).join('')}
        </div>
      </div>

      <div class="place__section">
        <h2>Build the valley</h2>
        <p class="sub">Ink is earned by finishing real practice, more with more stars. It is spent only here, and the valley keeps what you build.</p>
        <div class="stat-tiles" style="margin-bottom:12px"><div class="stat-tile"><b>${state.ink.balance}</b><span>Ink held</span></div><div class="stat-tile"><b>${state.ink.earned}</b><span>Earned</span></div><div class="stat-tile"><b>${state.builds.length}/${UPGRADES.length}</b><span>Built</span></div></div>
        <div class="g-list">
          ${avail.map((u) => `<div class="upgrade"><div class="upgrade__lead"><p class="upgrade__name">${escapeHTML(u.name)} <small style="color:var(--g-ink-3);font-weight:500">· ${escapeHTML(regionBySlug(u.region)?.name ?? '')}</small></p><p class="upgrade__line">${escapeHTML(u.line)}</p></div><button class="upgrade__btn" data-build="${u.id}" ${state.ink.balance < u.cost ? 'disabled' : ''}><span class="ink" aria-hidden="true"></span>${u.cost}</button></div>`).join('')}
          ${UPGRADES.filter((u) => built.has(u.id)).map((u) => `<div class="upgrade upgrade--built"><div class="upgrade__lead"><p class="upgrade__name">${escapeHTML(u.name)}</p><p class="upgrade__line">${escapeHTML(u.line)}</p></div><span class="upgrade__btn">Built</span></div>`).join('')}
        </div>
      </div>

      <div class="place__section">
        <h2>Collections</h2>
        <p class="sub">What the valley remembers of you.</p>
        <div class="tiles">
          ${collections.map(([slug, big, small]) => { const r = regionBySlug(slug); return `<a class="tile" href="${r.route}"><p class="tile__name">${escapeHTML(r.name)}</p><p class="tile__meta" style="font-size:16px;color:var(--g-ink);font-weight:700;margin-bottom:2px">${escapeHTML(big)}</p><p class="tile__meta">${escapeHTML(small)}</p></a>`; }).join('')}
        </div>
      </div>

      ${sightings.length ? `<div class="place__section"><h2>Sightings</h2><p class="sub">Words grown in the Rootwood, met again out in real passages.</p><div class="g-list">${sightings.slice(-6).reverse().map((s) => `<div class="g-row"><span class="g-row__num">✦</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(s.word ?? s.vocab_id ?? '')}</span><span class="g-row__meta">${escapeHTML(s.passage_title ?? s.passage_id ?? '')} · ${formatDate(s.seen_at ?? s.finished_at ?? new Date().toISOString())}</span></span></div>`).join('')}</div></div>` : ''}

      <div class="place__section">
        <h2>Achievements</h2>
        <p class="sub">${unlocked.length} of ${ach.length} unlocked.</p>
        <div class="tiles">${ach.map((a) => `<div class="tile ${a.unlocked ? 'tile--done' : 'tile--stone'}"><div class="tile__glyph" aria-hidden="true">${a.glyph}</div><p class="tile__name">${escapeHTML(a.title)}</p><p class="tile__meta">${escapeHTML(a.description)}</p></div>`).join('')}</div>
      </div>

      <div class="place__section">
        <h2>The study</h2>
        <div class="g-list">
          <a class="g-row" href="#/growth"><span class="g-row__num">✎</span><span class="g-row__lead"><span class="g-row__title">How you read</span><span class="g-row__meta">Your Reading DNA, the concepts you have collected, your own reflections.</span></span></a>
          <a class="g-row" href="#/world/place/wilds"><span class="g-row__num">⟶</span><span class="g-row__lead"><span class="g-row__title">Records</span><span class="g-row__meta">The weekly Gauntlet and your best runs.</span></span></a>
          <a class="g-row" href="#/settings"><span class="g-row__num">⚙</span><span class="g-row__lead"><span class="g-row__title">Settings</span><span class="g-row__meta">Sound, theme, reading size, backup.</span></span></a>
        </div>
      </div>`;
    for (const b of body.querySelectorAll('[data-build]')) {
      b.addEventListener('click', async () => {
        const u = UPGRADES.find((x) => x.id === b.dataset.build);
        if (!u || state.ink.balance < u.cost) return;
        b.disabled = true;
        try {
          await storage.put(STORES.LEARNING, { id: `build:${u.id}`, kind: 'world-build', module: 'world', upgrade_id: u.id, cost: u.cost, region: u.region, built_at: new Date().toISOString() });
          state.builds.push(u.id); state.ink.balance -= u.cost; state.ink.spent += u.cost;
          if (u.effect?.hearthLevel) state.hearth.level = Math.max(state.hearth.level, u.effect.hearthLevel);
          play('build');
          sessionStorage.setItem('world:focus', u.region); sessionStorage.setItem('world:changed', u.region); sessionStorage.setItem('world:change-line', `Built: <b>${escapeHTML(u.name)}</b>`);
          if (u.region === 'hearth') { renderer.scene = buildBuildingScene('cottage', state.hearth.level, atmo, { practicedToday: state.hearth.practicedToday }); renderer.invalidateTerrain(); }
          render();
          outlet.querySelector('.place__hero-stat').innerHTML = `<span class="hud__pill"><span class="ink" aria-hidden="true"></span>${state.ink.balance}</span><span class="hud__pill"><span class="star" aria-hidden="true">★</span>${state.stars}</span>`;
        } catch (err) { console.error('[CAT OS] build failed', err); b.disabled = false; }
      });
    }
  };
  render();
}

export { REGIONS };
