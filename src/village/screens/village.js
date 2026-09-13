/**
 * village.js (screen) — home. The village, alive, and everything you do
 * in it that is not learning: look, tap a building, deliver an order,
 * collect what a helper made, build, raise, open land, name the place.
 *
 * The screen answers four questions without the learner reading anything:
 *   WHERE AM I     my village, with my people at their doors
 *   WHAT CHANGED   goods flying into the building that makes them
 *   WHAT NEEDS ME  a bubble over anything that is ready or wanted
 *   WHAT NOW       one card at the bottom: what to do, what it makes, why
 *
 * The first minutes are this same screen, staged: Wick speaks, Ada asks,
 * the learner reads, comes back, delivers, builds, and names the place.
 */

import { VillageRenderer } from '../renderer.js';
import { buildVillageScene } from '../scene.js';
import { art, artIMG } from '../art.js';
import { BUILDINGS, CHARACTERS, HOUSE, PLACE_BUILDING, WORLD, buildingById, plotById, good } from '../defs.js';
import { loadWorld } from '../../world/state.js';
import { onboardingStep, needsText, costText } from '../state.js';
import { goodEntries, bagEntries } from '../../world/economy.js';
import { chips, costChips, coinsHTML, goodIcon, wireCraftTaps, purseHTML, bagText } from '../../world/craft-ui.js';
import { icon } from '../../world/icons.js';
import { BAG_KEYS } from '../../world/economy.js';
import { mountMenu } from '../../world/menu.js';
import { loadValley, saveValley, valleyName, homecoming, stageLine, OPENING, NAMING, STEP_LINES, DAWN, builtLine, cleanValleyName, nameSuggestions } from '../../world/companion.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { play, unlock, startMusic, startAmbience, musicEnabled, setMusicEnabled } from '../../world/audio.js';
import { escapeHTML } from '../../core/utils/format.js';

const ICON_SOUND_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M17.8 6.5a7.5 7.5 0 0 1 0 11"/></svg>`;
const ICON_SOUND_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** A picture for a bubble or a card: a good by its key, or any glyph. */
const mark = (name, size) => (BAG_KEYS.includes(name) ? goodIcon(name, { size }) : name === 'coin' ? goodIcon('coins', { size }) : icon(name, { size }));
const HOME = { x: WORLD.home.x, y: WORLD.home.y + 30 };

export async function renderVillage(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');
  outlet.innerHTML = `
    <section class="vg" aria-label="Your village">
      <canvas class="vg__canvas" id="vg-canvas" tabindex="0" aria-label="Your village. Drag to look around, tap a building to see who works there."></canvas>
      <div class="vbubbles" id="vbubbles"></div>
      <div class="vhud" id="vhud"></div>
      <div class="vnotice" id="vnotice" role="status"></div>
      <div class="vtip" id="vtip"></div>
      <div class="vwick" id="vwick" hidden><canvas width="52" height="46" aria-hidden="true"></canvas><p></p><span class="vwick__more" aria-hidden="true">tap to go on</span></div>
      <div class="flyers" id="vflyers" aria-hidden="true"></div>
      <div class="vsheet" id="vsheet" hidden></div>
    </section>`;

  const askedAt = performance.now();
  let world, valley;
  try {
    [world, valley] = await Promise.all([loadWorld(storage), loadValley(storage).catch(() => ({ name: null }))]);
  } catch (err) {
    if (!outlet.isConnected) return;
    outlet.innerHTML = `<section class="screen"><h1>The village will not open</h1><div class="card"><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }
  const canvas = outlet.querySelector('#vg-canvas');
  if (!canvas?.isConnected) return;
  let state = world.state;
  let v = state.village;
  let step = onboardingStep(v, state, valley);

  /* ---- The hand-off from a run or a build ---- */
  const focusSlug = sessionStorage.getItem('world:focus');
  const changedSlug = sessionStorage.getItem('world:changed');
  const changeLine = sessionStorage.getItem('world:change-line');
  const earnedRaw = sessionStorage.getItem('world:earned');
  const wickRaw = sessionStorage.getItem('world:wick');
  const unlockedRaw = sessionStorage.getItem('world:unlocked');
  for (const k of ['world:focus', 'world:changed', 'world:change-line', 'world:earned', 'world:unlocked', 'world:wick']) sessionStorage.removeItem(k);
  const focusId = focusSlug ? (PLACE_BUILDING[focusSlug] ?? (buildingById(focusSlug) ? focusSlug : null)) : null;

  const reduce = performance.now() - askedAt > 1400 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const working = new Set();
  let scene = buildVillageScene(state, state.atmo, { focus: focusId, working });
  const renderer = new VillageRenderer(canvas, scene, { fit: 'cover', minZoom: 0.3, maxZoom: 2.2, initialZoom: 0.85, onTap: (w) => onTap(w) });
  const homeZoom = () => Math.max(renderer.fitZoom(), 0.85);
  const anchorOf = (id) => scene.anchorOf(id) ?? HOME;

  /* ================= HUD ================= */
  const hud = outlet.querySelector('#vhud');
  const renderHud = () => {
    const name = valleyName(valley);
    hud.innerHTML = `
      <button class="vpill vpill--name" id="vname" aria-label="${escapeHTML(name)}: level ${v.level.n}">
        <span class="vpill__ring" style="--p:${Math.round(v.level.pct * 100)}%"><b>${v.level.n}</b></span>
        <span class="vpill__text"><span class="vpill__title">${escapeHTML(name)}</span><span class="vpill__sub">${escapeHTML(v.stage.name)}</span></span>
      </button>
      <div class="vhud__right">
        <button class="vpill vpill--coins" id="vcoins" aria-label="${v.coins} coins">${coinsHTML(v.coins)}</button>
        <button class="vpill vpill--barn" id="vbarn" aria-label="Your goods">${purseHTML(v.stock, { showZero: false }) || `<span class="craft is-zero">${goodIcon('pages', { size: 16 })}<b>0</b></span>`}</button>
        <div class="vhud__icons" id="vhud-icons">
          <button class="hud__icon" id="vsound" aria-pressed="${musicEnabled()}" aria-label="Music and ambience">${musicEnabled() ? ICON_SOUND_ON : ICON_SOUND_OFF}</button>
        </div>
      </div>`;
    hud.querySelector('#vsound').addEventListener('click', async (e) => {
      const on = !musicEnabled();
      await setMusicEnabled(on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
      e.currentTarget.innerHTML = on ? ICON_SOUND_ON : ICON_SOUND_OFF;
      if (on) { startMusic('world', { hour: state.atmo.hour }); startAmbience('world', state.atmo); }
      play('tap');
    });
    hud.querySelector('#vname').addEventListener('click', () => { play('tap'); openSheet(hearthSheet()); });
    hud.querySelector('#vbarn').addEventListener('click', () => { play('tap'); openSheet(barnSheet()); });
    mountMenu(hud.querySelector('#vhud-icons'), { storage });
    if (step !== 'meet') requestAnimationFrame(() => hud.classList.add('is-in'));
  };
  wireCraftTaps(hud, () => state);

  /* ================= Bubbles over the buildings ================= */
  const bubblesEl = outlet.querySelector('#vbubbles');
  const bubbleFor = new Map();
  const bubbleSpec = () => {
    const out = [];
    const allow = (id) => step === 'done' || step === 'name' || (step === 'first-read' && id === 'reading') || (step === 'deliver' && id === 'reading') || (step === 'build' && id === 'garden');
    for (const b of v.buildings) {
      if (!allow(b.id)) continue;
      const orderHere = b.orders[0];
      if (orderHere?.deliverable) { out.push({ id: b.id, tone: 'ready', glyph: 'check', text: orderHere.pay, sub: 'coins' }); continue; }
      if (b.id === 'market' && v.deliverable.length) { out.push({ id: b.id, tone: 'ready', glyph: 'check', text: v.deliverable.length > 1 ? v.deliverable.length : v.deliverable[0].pay, sub: v.deliverable.length > 1 ? 'ready' : 'coins' }); continue; }
      if (b.helper?.available > 0) { out.push({ id: b.id, tone: 'good', glyph: b.good.key, text: `+${b.helper.available}` }); continue; }
      if (b.ready) { out.push({ id: b.id, tone: 'build', glyph: 'hammer', text: b.built ? 'Raise' : 'Build' }); continue; }
      if (orderHere) { const e = goodEntries(orderHere.missing)[0]; if (e) out.push({ id: b.id, tone: 'want', glyph: e.key, text: e.amount, sub: 'more' }); continue; }
      if (b.id === 'market' && b.built && step === 'done') { const first = v.orders[0]; const e = first ? goodEntries(first.missing)[0] : null; if (e) out.push({ id: b.id, tone: 'want', glyph: e.key, text: e.amount, sub: 'wanted' }); }
    }
    if (step === 'done') {
      for (const p of v.plotViews) if (!p.open && p.ready) out.push({ id: `plot:${p.id}`, tone: 'build', glyph: 'coin', text: p.def.cost.coins });
      if (v.nextHouse?.ready) out.push({ id: `house:${v.nextHouse.n}`, tone: 'build', glyph: 'coin', text: v.nextHouse.cost.coins });
    }
    return out;
  };
  const renderBubbles = () => {
    const specs = bubbleSpec();
    bubblesEl.innerHTML = specs.map((s) => `
      <button class="vb vb--${s.tone}" data-id="${escapeHTML(s.id)}" tabindex="-1" aria-label="${escapeHTML(String(s.text))} ${escapeHTML(s.sub ?? '')}">
        ${mark(s.glyph, 22)}<b>${escapeHTML(String(s.text))}</b>${s.sub ? `<small>${escapeHTML(s.sub)}</small>` : ''}
      </button>`).join('');
    bubbleFor.clear();
    for (const el of bubblesEl.querySelectorAll('.vb')) {
      bubbleFor.set(el.dataset.id, el);
      el.addEventListener('click', () => { play('tap'); openFor(el.dataset.id); });
    }
    bubbleKey = '';
    setTimeout(() => { for (const el of bubblesEl.querySelectorAll('.vb')) el.classList.add('is-in'); }, 30);
  };
  let bubbleRaf = 0, bubbleKey = '';
  const placeBubbles = () => {
    const z = renderer.cam.zoom;
    const key = `${Math.round(renderer.cam.x)}|${Math.round(renderer.cam.y)}|${z.toFixed(3)}|${renderer.cssW}|${renderer.cssH}`;
    if (key !== bubbleKey) {
      bubbleKey = key;
      for (const a of scene.anchors) {
        const el = bubbleFor.get(a.id);
        if (!el) continue;
        const s = renderer.toScreen(a.x, a.y);
        const off = s.x < 10 || s.x > renderer.cssW - 10 || s.y < 70 || s.y > renderer.cssH - 150;
        el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%) scale(${Math.max(0.7, Math.min(1.15, z))})`;
        el.classList.toggle('is-off', off);
      }
    }
    bubbleRaf = requestAnimationFrame(placeBubbles);
  };
  bubbleRaf = requestAnimationFrame(placeBubbles);

  /* ================= The one card ================= */
  const tipEl = outlet.querySelector('#vtip');
  const firstPassage = () => [...(world.content.rc ?? [])].filter((p) => p.stage === 'foundation').sort((a, b) => (a.word_count ?? 999) - (b.word_count ?? 999))[0] ?? world.content.rc?.[0] ?? null;
  const currentTip = () => {
    if (step === 'first-read') { const p = firstPassage(); return { kind: 'learn', building: 'reading', glyph: 'pages', title: 'Read with Ada → up to 3 Pages', line: `A short passage, ${p?.question_count ?? 3} questions, about ${Math.round(p?.estimated_time_min ?? 4)} minutes. Ada's order needs 1 Page.`, href: p ? `#/rc/session/${p.id}` : '#/world/place/reading-room' }; }
    if (step === 'deliver') {
      const o = v.orders[0];
      if (o?.deliverable) return { kind: 'deliver', building: 'reading', glyph: 'check', title: `Deliver ${needsText(o.needs)} to Ada`, line: `${o.pay} coins. Tap the Reading House.` };
      const m = goodEntries(o?.missing ?? {})[0];
      return { kind: 'learn', building: 'reading', glyph: 'pages', title: 'Read another passage → up to 3 Pages', line: `Ada's order needs ${m?.amount ?? 1} more. Every star makes a Page.`, href: '#/world/place/reading-room' };
    }
    if (step === 'build') { const b = v.buildingById('garden'); return { kind: 'build', building: 'garden', glyph: 'hammer', title: 'Build the Word Garden', line: `${costText(b.cost)} · Bo has asked for a patch of ground.` }; }
    if (step === 'name') return { kind: 'name', glyph: 'house', title: 'Name your village', line: 'It should have a name now.' };
    return v.tip;
  };
  const renderTip = () => {
    const t = currentTip();
    if (!t || step === 'meet') { tipEl.innerHTML = ''; tipEl.classList.remove('is-in'); return; }
    const where = t.building ? buildingById(t.building) : null;
    tipEl.innerHTML = `
      <a class="vtip__card vtip--${t.kind}" href="${t.href ? escapeHTML(t.href) : '#'}" id="vtip-card">
        <span class="vtip__mk">${mark(t.glyph, 34)}</span>
        <span class="vtip__body">
          <span class="vtip__eyebrow">${escapeHTML(t.kind === 'learn' ? (where ? where.name : 'Next') : t.kind === 'deliver' ? 'Ready to deliver' : t.kind === 'collect' ? 'Made for you' : t.kind === 'name' ? 'Your village' : 'Ready to build')}</span>
          <span class="vtip__title">${escapeHTML(t.title)}</span>
          <span class="vtip__line">${escapeHTML(t.line ?? '')}</span>
        </span>
        <span class="vtip__go" aria-hidden="true">${goodIcon('arrow', { size: 18 })}</span>
      </a>`;
    const card = tipEl.querySelector('#vtip-card');
    card.addEventListener('click', (e) => {
      if (t.href) { sessionStorage.setItem('world:focus', t.building ?? ''); play('open'); return; }
      e.preventDefault();
      play('tap');
      if (t.kind === 'name') { openSheet(nameSheet()); return; }
      if (t.building) { lookAtBuilding(t.building); openFor(t.id?.startsWith('house:') ? t.id : t.kind === 'plot' ? `plot:${t.id}` : t.building); return; }
      if (t.id) openFor(t.id);
    });
    requestAnimationFrame(() => tipEl.classList.add('is-in'));
  };

  /* ================= Notices and Wick ================= */
  const noticeEl = outlet.querySelector('#vnotice');
  let noticeTimer = 0;
  function notice(html, sound) {
    noticeEl.innerHTML = html;
    noticeEl.classList.add('is-shown');
    if (sound) play(sound);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => noticeEl.classList.remove('is-shown'), 4200);
  }
  const wickEl = outlet.querySelector('#vwick');
  {
    const cv = wickEl.querySelector('canvas');
    const cx = cv.getContext('2d');
    const sp = art('wick', { pose: 'sit' }, 4);
    cx.drawImage(sp.canvas, 0, 0, sp.canvas.width, sp.canvas.height * 0.62, 2, 2, 48, 30);
  }
  let wickTimer = 0;
  // The tap that dismisses one of Wick's lines is his, not the map's: the
  // building under the finger must not open on the same tap.
  let tapGuardUntil = 0;
  /** Wick says one line. With `wait`, resolves on the next tap. */
  function wickSays(line, { hold = 7000, tap = false } = {}) {
    wickEl.hidden = false;
    wickEl.querySelector('p').textContent = line;
    wickEl.querySelector('.vwick__more').style.opacity = tap ? '1' : '0';
    wickEl.classList.remove('is-tap');
    requestAnimationFrame(() => { wickEl.classList.add('is-in'); if (tap) wickEl.classList.add('is-tap'); });
    clearTimeout(wickTimer);
    if (!tap) { wickTimer = setTimeout(() => wickEl.classList.remove('is-in'), hold); return Promise.resolve(); }
    play('tap');
    const shownAt = performance.now();
    return new Promise((resolve) => {
      const go = (e) => {
        if (performance.now() - shownAt < 250) return;
        if (e.target.closest('.vsheet, .gmenu, .craftsheet, .vhud, a')) return;
        tapGuardUntil = performance.now() + 600;
        window.removeEventListener('pointerdown', go, true); resolve();
      };
      window.addEventListener('pointerdown', go, true);
    });
  }
  wickEl.addEventListener('click', () => { if (!wickEl.classList.contains('is-tap')) wickEl.classList.remove('is-in'); });

  /* ================= Sheets ================= */
  const sheetEl = outlet.querySelector('#vsheet');
  let sheetOpen = null;
  function openSheet(html, id = null) {
    sheetOpen = id;
    sheetEl.hidden = false;
    sheetEl.innerHTML = `<div class="vsheet__scrim" data-close></div><div class="vsheet__card" role="dialog">${html}</div>`;
    requestAnimationFrame(() => sheetEl.classList.add('is-in'));
    tipEl.classList.add('is-hidden');
    for (const el of sheetEl.querySelectorAll('[data-close]')) el.addEventListener('click', () => { play('close'); closeSheet(); });
    wireSheet(sheetEl);
    wireCraftTaps(sheetEl, () => state);
  }
  function closeSheet() {
    sheetOpen = null;
    sheetEl.classList.remove('is-in');
    tipEl.classList.remove('is-hidden');
    setTimeout(() => { if (!sheetOpen) { sheetEl.hidden = true; sheetEl.innerHTML = ''; } }, 280);
  }
  const portrait = (ch, size = 54) => (ch?.look ? artIMG('person', { ...ch.look, pose: 'idle' }, { size, className: 'vportrait' }) : ch?.id === 'wick' ? artIMG('wick', { pose: 'sit' }, { size, className: 'vportrait' }) : '');

  function orderRow(o, { where = true } = {}) {
    const entries = goodEntries(o.needs);
    return `
      <div class="order ${o.deliverable ? 'is-ready' : ''}" data-order="${o.id}">
        <span class="order__who">${o.giver.look ? artIMG('person', { ...o.giver.look, pose: 'idle' }, { size: 40 }) : portrait(CHARACTERS[o.giver.id], 40)}</span>
        <span class="order__body">
          <b>${escapeHTML(o.giver.name)}</b>
          <span class="order__needs">${entries.map((e) => `<span class="craft craft--${e.key} ${(o.missing[e.key] ?? 0) > 0 ? 'is-short' : 'is-met'}" data-craft="${e.key}">${goodIcon(e.key, { size: 15 })}<b>${Math.min(e.amount, v.stock[e.key] ?? 0)}/${e.amount}</b></span>`).join('')}</span>
          <small>${escapeHTML(o.reason)}</small>
        </span>
        ${o.deliverable
          ? `<button class="order__go" data-deliver="${o.id}">${goodIcon('coins', { size: 16 })}<b>${o.pay}</b><span>Deliver</span></button>`
          : `<span class="order__pay">${goodIcon('coins', { size: 15 })}<b>${o.pay}</b></span>`}
      </div>`;
  }

  function upgradeBlock(b) {
    if (!b.built) {
      const u = b.def.unlock;
      return `
        <section class="vsec">
          <p class="vsec__eyebrow">To build</p>
          <p class="vsec__line">${escapeHTML(u?.line ?? b.def.line)}</p>
          <div class="wkrow ${b.affordable ? 'is-met' : ''}"><span class="wkrow__k">Costs</span><span class="wkrow__v">${costChips(b.cost, v.stock)}</span></div>
          <div class="wkrow ${b.standing ? 'is-met' : ''}"><span class="wkrow__k">Asks</span><span class="wkrow__v">${escapeHTML(u?.standing?.line ?? '')}</span></div>
          ${b.ready ? `<button class="g-cta g-cta--gold" data-build="${b.id}">Build it<span class="arrow" aria-hidden="true">→</span></button>` : `<p class="vsec__hint">${b.standing ? `Short ${escapeHTML(bagText(b.missing))}. Orders pay coins.` : 'Deliver orders first.'}</p>`}
        </section>`;
    }
    if (!b.next) return `<section class="vsec"><p class="vsec__eyebrow">Level ${b.level}</p><p class="vsec__line">${escapeHTML(b.current?.line ?? '')} There is nothing higher to build here — yet.</p></section>`;
    return `
      <section class="vsec">
        <p class="vsec__eyebrow">Level ${b.level} → ${b.next.n}: ${escapeHTML(b.next.name)}</p>
        <p class="vsec__line">${escapeHTML(b.next.line)}</p>
        <div class="wkrow ${b.affordable ? 'is-met' : ''}"><span class="wkrow__k">Costs</span><span class="wkrow__v">${costChips(b.cost, v.stock)}</span></div>
        <div class="wkrow ${b.standing ? 'is-met' : ''}"><span class="wkrow__k">Asks</span><span class="wkrow__v">${escapeHTML(b.next.standing?.line ?? '')}</span></div>
        ${b.ready ? `<button class="g-cta g-cta--gold" data-raise="${b.id}">Raise it<span class="arrow" aria-hidden="true">→</span></button>` : `<p class="vsec__hint">${b.standing ? `Short ${escapeHTML(bagText(b.missing))}.` : 'Not yet. The standing comes from learning here.'}</p>`}
      </section>`;
  }

  function buildingSheet(id) {
    const b = v.buildingById(id);
    if (!b) return '';
    const ch = b.character;
    const wants = v.orders.filter((o) => b.good && (o.needs[b.good.key] ?? 0) > 0);
    const here = b.orders.length ? b.orders : (b.id === 'market' ? v.orders : []);
    const line = !b.built ? (b.def.unlock?.line ?? b.def.line)
      : b.helper?.available ? `${ch?.name ?? 'The helper'} made ${b.helper.available} ${b.helper.available === 1 ? b.good.one : b.good.name} while you were away.`
        : wants.length && ch?.asks?.length ? ch.asks[wants[0].n % ch.asks.length]
          : ch?.idle ? ch.idle[Math.floor(Date.now() / 3600e3) % ch.idle.length] : b.def.line;
    const act = b.def.activity;
    return `
      <button class="vsheet__close" data-close aria-label="Close">×</button>
      <header class="vsheet__head">
        <span class="vsheet__art">${b.built && b.def.art ? artIMG('building', { id: b.def.art, level: b.level }, { size: 72 }) : b.def.art ? artIMG('scaffold', {}, { size: 72 }) : goodIcon('road', { size: 56 })}</span>
        <div>
          <p class="vsheet__eyebrow">${escapeHTML(b.def.skill ?? (b.def.kind === 'home' ? 'Home' : b.def.kind === 'market' ? 'Orders' : 'Challenge'))}${b.built ? ` · level ${b.level}` : ' · not built'}</p>
          <h2 class="vsheet__name">${escapeHTML(b.def.name)}</h2>
          ${b.good && b.built ? `<p class="vsheet__stock">${goodIcon(b.good.key, { size: 16 })}<b>${b.stock}</b> ${b.stock === 1 ? b.good.one : b.good.name} in store${b.wantedHere ? ` · <span>${b.wantedHere} wanted</span>` : ''}</p>` : ''}
        </div>
      </header>
      ${ch ? `<div class="vsay">${portrait(ch)}<div><b>${escapeHTML(ch.name)}</b> <small>${escapeHTML(ch.role)}</small><p>${escapeHTML(line)}</p></div></div>` : ''}
      ${b.helper?.available ? `<button class="g-cta g-cta--gold" data-collect="${b.id}">Collect ${b.helper.available} ${b.helper.available === 1 ? b.good.one : b.good.name}<span class="arrow" aria-hidden="true">→</span></button>` : ''}
      ${here.length ? `<section class="vsec"><p class="vsec__eyebrow">${here.length === 1 ? 'An order' : 'Orders'}</p><div class="orders">${here.map((o) => orderRow(o)).join('')}</div></section>` : ''}
      ${b.built && act ? `
        <a class="g-cta ${b.def.kind === 'learn' ? '' : 'g-cta--quiet'}" href="${escapeHTML(step === 'first-read' && b.id === 'reading' && firstPassage() ? `#/rc/session/${firstPassage().id}` : act.route)}" data-go="${b.id}">${escapeHTML(act.verb)}<small>${b.good ? `Up to 3 ${b.good.name}${wants.length ? ` · ${wants[0].giver.name} needs ${goodEntries(wants[0].missing).find((e) => e.key === b.good.key)?.amount ?? 0} more` : ''}` : 'Paid in coins'} · ~${act.minutes} min</small><span class="arrow" aria-hidden="true">→</span></a>` : ''}
      ${b.built && b.helper && !b.helper.available ? `<p class="vsec__hint">${escapeHTML(ch?.name ?? 'The helper')} makes a ${b.good.one} every ${Math.round(b.helper.every / 3600e3)} hours on their own, up to ${b.helper.cap}. Next in ${fmtWait(b.helper.nextIn)}.</p>` : ''}
      ${b.id === 'hearth' ? `<section class="vsec vsec--links"><a class="vlink" href="#/world/place/hearth?you=1">${goodIcon('scroll', { size: 20 })}<span><b>Your standing</b><small>Stars, streaks, records</small></span></a><a class="vlink" href="#/growth">${goodIcon('sprout', { size: 20 })}<span><b>Growth</b><small>How you are getting stronger</small></span></a></section>` : ''}
      ${upgradeBlock(b)}
      ${b.built && b.def.place && b.def.kind === 'learn' ? `<p class="vsheet__foot"><a href="#/world/place/${b.def.place}" data-go="${b.id}">Everything at ${escapeHTML(b.def.name)} →</a></p>` : ''}`;
  }

  function plotSheet(id) {
    const p = v.plotViews.find((x) => x.id === id);
    if (!p) return '';
    return `
      <button class="vsheet__close" data-close aria-label="Close">×</button>
      <header class="vsheet__head"><span class="vsheet__art">${artIMG('plotSign', {}, { size: 56 })}</span><div><p class="vsheet__eyebrow">Land</p><h2 class="vsheet__name">${escapeHTML(p.def.name)}</h2></div></header>
      <section class="vsec">
        <p class="vsec__line">${escapeHTML(p.def.line)}</p>
        <div class="wkrow ${p.affordable ? 'is-met' : ''}"><span class="wkrow__k">Costs</span><span class="wkrow__v">${costChips(p.def.cost, v.stock)}</span></div>
        <div class="wkrow ${p.standing ? 'is-met' : ''}"><span class="wkrow__k">Asks</span><span class="wkrow__v">${escapeHTML(p.def.standing.line)}</span></div>
        ${p.ready ? `<button class="g-cta g-cta--gold" data-plot="${p.id}">Open the land<span class="arrow" aria-hidden="true">→</span></button>` : `<p class="vsec__hint">${p.standing ? `Short ${escapeHTML(bagText(p.missing))}.` : 'Not yet.'}</p>`}
      </section>`;
  }

  function houseSheet() {
    const h = v.nextHouse;
    if (!h) return '';
    return `
      <button class="vsheet__close" data-close aria-label="Close">×</button>
      <header class="vsheet__head"><span class="vsheet__art">${artIMG('building', { id: 'hearth', level: 1 }, { size: 64 })}</span><div><p class="vsheet__eyebrow">A neighbour</p><h2 class="vsheet__name">${escapeHTML(h.name)}</h2></div></header>
      <section class="vsec">
        <p class="vsec__line">${escapeHTML(h.line)}</p>
        <div class="wkrow ${h.affordable ? 'is-met' : ''}"><span class="wkrow__k">Costs</span><span class="wkrow__v">${costChips(h.cost, v.stock)}</span></div>
        <div class="wkrow ${h.standing ? 'is-met' : ''}"><span class="wkrow__k">Asks</span><span class="wkrow__v">${escapeHTML(h.standingLine)}</span></div>
        ${h.ready ? `<button class="g-cta g-cta--gold" data-house="${h.n}">Build the house<span class="arrow" aria-hidden="true">→</span></button>` : `<p class="vsec__hint">${h.standing ? `Short ${escapeHTML(bagText(h.missing))}.` : 'Not yet.'}</p>`}
      </section>`;
  }

  function barnSheet() {
    return `
      <button class="vsheet__close" data-close aria-label="Close">×</button>
      <header class="vsheet__head"><span class="vsheet__art">${artIMG('crate', {}, { size: 56 })}</span><div><p class="vsheet__eyebrow">In store</p><h2 class="vsheet__name">Your goods</h2></div></header>
      <div class="barn">
        ${[...bagEntries(v.stock).filter((e) => e.key === 'coins'), ...v.buildings.filter((b) => b.good && b.built).map((b) => ({ ...b.good, amount: b.stock, maker: b }))].map((e) => `
          <button class="barn__row craft" data-craft="${e.key}">
            ${goodIcon(e.key, { size: 26 })}<span><b>${e.amount}</b> ${escapeHTML(e.amount === 1 && e.key !== 'coins' ? e.one : e.name)}<small>${escapeHTML(e.key === 'coins' ? 'Orders pay coins. Coins build.' : `${e.maker.character?.name ?? ''} makes them at ${e.maker.def.name}`)}</small></span>
          </button>`).join('')}
      </div>
      <section class="vsec"><p class="vsec__eyebrow">Wanted on the board</p><div class="orders">${v.orders.map((o) => orderRow(o)).join('')}</div></section>`;
  }

  function hearthSheet() { return buildingSheet('hearth'); }

  function nameSheet() {
    const ideas = nameSuggestions();
    return `
      <form class="sign" id="vsign">
        <p class="vsheet__eyebrow">Your village</p>
        <label class="sign__label" for="valley-name">Name this village</label>
        <input class="sign__input" id="valley-name" name="valley" type="text" maxlength="28" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="…" />
        <div class="sign__ideas">${ideas.map((n) => `<button type="button" class="sign__idea" data-n="${escapeHTML(n)}">${escapeHTML(n)}</button>`).join('')}</div>
        <button class="g-cta" id="sign-go" type="submit" disabled>That’s the one<span class="arrow" aria-hidden="true">→</span></button>
      </form>`;
  }

  function wireSheet(root) {
    for (const el of root.querySelectorAll('[data-deliver]')) el.addEventListener('click', () => deliver(el.dataset.deliver));
    for (const el of root.querySelectorAll('[data-collect]')) el.addEventListener('click', () => collect(el.dataset.collect));
    for (const el of root.querySelectorAll('[data-build]')) el.addEventListener('click', () => build(el.dataset.build, false));
    for (const el of root.querySelectorAll('[data-raise]')) el.addEventListener('click', () => build(el.dataset.raise, true));
    for (const el of root.querySelectorAll('[data-plot]')) el.addEventListener('click', () => openPlot(el.dataset.plot));
    for (const el of root.querySelectorAll('[data-house]')) el.addEventListener('click', () => buildHouse(Number(el.dataset.house)));
    for (const el of root.querySelectorAll('[data-go]')) el.addEventListener('click', () => { sessionStorage.setItem('world:focus', el.dataset.go); play('open'); });
    const form = root.querySelector('#vsign');
    if (form) {
      const input = form.querySelector('#valley-name'), go = form.querySelector('#sign-go');
      setTimeout(() => input.focus({ preventScroll: true }), 300);
      const sync = () => { go.disabled = !cleanValleyName(input.value); };
      input.addEventListener('input', sync);
      for (const b of form.querySelectorAll('.sign__idea')) b.addEventListener('click', () => { input.value = b.dataset.n; sync(); play('tap'); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = cleanValleyName(input.value);
        if (!name) return;
        play('correct');
        valley = await saveValley(storage, { name });
        closeSheet();
        step = onboardingStep(v, state, valley);
        renderHud(); renderTip(); renderBubbles();
        await wickSays(NAMING.after(name));
      });
    }
  }
  function openFor(id) {
    if (String(id).startsWith('plot:')) { openSheet(plotSheet(id.slice(5)), id); return; }
    if (String(id).startsWith('house:')) { openSheet(houseSheet(), id); return; }
    openSheet(buildingSheet(id), id);
  }
  function lookAtBuilding(id) { const a = anchorOf(id); renderer.lookAt(a.x, a.y - 40, { zoom: Math.max(renderer.cam.zoom, homeZoom()), duration: 650 }); }

  function onTap(w) {
    // While Wick is waiting for a tap, the tap is his — and so is the one that dismisses him.
    if (step === 'meet' || wickEl.classList.contains('is-tap') || performance.now() < tapGuardUntil) return;
    const hit = scene.hit(w.x, w.y);
    if (!hit) { if (sheetOpen) { closeSheet(); play('close'); } return; }
    play('tap');
    if (hit.kind === 'building') { lookAtBuilding(hit.id); openFor(hit.id); }
    else if (hit.kind === 'plot') { openFor(`plot:${hit.id}`); }
    else if (hit.kind === 'house') { openFor(`house:${hit.n}`); }
    else if (hit.kind === 'neighbour') { wickSays(`${escapeHTML(v.orders.find((o) => o.giver.id === `nb:${hit.n}`)?.giver.name ?? 'Somebody')} lives here.`); }
  }

  /* ================= Flights: goods and coins on the move ================= */
  const flyers = outlet.querySelector('#vflyers');
  /** Fly `n` icons of `key` from a screen point to another, staggered. */
  function fly(key, n, from, to, { delay = 0, onArrive } = {}) {
    const count = Math.min(8, Math.max(1, n));
    for (let k = 0; k < count; k += 1) {
      const dot = document.createElement('i');
      dot.className = `vflyer craft--${key}`;
      dot.innerHTML = goodIcon(key === 'coin' ? 'coins' : key, { size: 26 });
      dot.style.left = `${from.x + (Math.random() - 0.5) * 40}px`;
      dot.style.top = `${from.y + (Math.random() - 0.5) * 30}px`;
      dot.style.setProperty('--tx', `${to.x - from.x}px`);
      dot.style.setProperty('--ty', `${to.y - from.y}px`);
      dot.style.animationDelay = `${delay + k * 70}ms`;
      flyers.appendChild(dot);
      setTimeout(() => dot.remove(), delay + k * 70 + 1100);
    }
    setTimeout(() => onArrive?.(), delay + count * 70 + 900);
  }
  const screenOf = (id) => { const a = anchorOf(id); const s = renderer.toScreen(a.x, a.y - 40); return { x: s.x, y: s.y }; };
  const pillPoint = (sel) => { const el = hud.querySelector(sel); if (!el) return { x: renderer.cssW - 40, y: 40 }; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  function bump(sel) { const el = hud.querySelector(sel); if (!el) return; el.classList.add('is-hit'); setTimeout(() => el.classList.remove('is-hit'), 700); }

  /* ================= Actions ================= */
  async function refresh({ focus = null, workingIds = [] } = {}) {
    try {
      world = await loadWorld(storage);
      state = world.state; v = state.village;
    } catch { return; }
    if (!canvas.isConnected) return;
    for (const id of workingIds) working.add(id);
    scene = buildVillageScene(state, state.atmo, { focus: focus ?? v.tip?.building ?? null, working });
    renderer.setScene(scene);
    step = onboardingStep(v, state, valley);
    renderHud(); renderBubbles(); renderTip();
    if (sheetOpen) { const id = sheetOpen; const html = String(id).startsWith('plot:') ? plotSheet(id.slice(5)) : String(id).startsWith('house:') ? houseSheet() : buildingSheet(id); sheetEl.querySelector('.vsheet__card').innerHTML = html; wireSheet(sheetEl); }
  }

  let busy = false;
  async function deliver(orderId) {
    if (busy) return;
    const o = v.orders.find((x) => x.id === orderId);
    if (!o?.deliverable) return;
    busy = true;
    try {
      await storage.put(STORES.LEARNING, { id: `vorder:${o.slot}:${o.n}`, kind: 'village-order', module: 'village', slot: o.slot, n: o.n, needs: o.needs, paid: o.pay, giver: o.giver.name, at: new Date().toISOString() });
    } catch (err) { console.error('[CAT OS] deliver failed', err); busy = false; return; }
    closeSheet();
    play('quest');
    const from = screenOf(o.anchor);
    scene.workers.get(o.anchor === 'market' ? 'market' : 'reading')?.cheer?.();
    fly('coins', Math.min(6, Math.ceil(o.pay / 20)), from, pillPoint('#vcoins'), { onArrive: () => { bump('#vcoins'); play('ink'); } });
    notice(`<b>${escapeHTML(o.giver.name)}</b> has ${escapeHTML(needsText(o.needs))}. ${chips({ coins: o.pay }, { sign: '+' })}`);
    await wait(700);
    await refresh({ focus: o.anchor });
    busy = false;
    if (step === 'build') { await wait(600); wickSays(STEP_LINES.build); lookAtBuilding('garden'); }
    else if (v.deliverable.length === 0 && step === 'done') { const first = DAWN[1]; void first; }
  }

  async function collect(id) {
    if (busy) return;
    const b = v.buildingById(id);
    const n = b?.helper?.available ?? 0;
    if (!n) return;
    busy = true;
    try {
      await storage.put(STORES.LEARNING, { id: `vcollect:${id}:${Date.now()}`, kind: 'village-collect', module: 'village', building: id, good: b.good.key, amount: n, at: new Date().toISOString() });
    } catch (err) { console.error('[CAT OS] collect failed', err); busy = false; return; }
    closeSheet();
    play('place');
    fly(b.good.key, n, screenOf(id), pillPoint('#vbarn'), { onArrive: () => { bump('#vbarn'); play('ink'); } });
    notice(`${escapeHTML(b.character?.name ?? 'The helper')} made ${chips({ [b.good.key]: n }, { sign: '+' })} while you were away.`);
    await wait(600);
    await refresh({ focus: id });
    busy = false;
  }

  /** Build or raise: the construction moment, slow on purpose. */
  async function build(id, raise) {
    if (busy) return;
    const b = v.buildingById(id);
    if (!b?.ready) return;
    const level = raise ? b.next.n : 1;
    const name = raise ? b.next.name : b.def.name;
    const after = raise ? b.next.after : (b.def.unlock?.line ?? b.def.line);
    busy = true;
    try {
      await storage.put(STORES.LEARNING, { id: `vbuild:${id}:${level}`, kind: 'village-build', module: 'village', building: id, level, cost: b.cost, at: new Date().toISOString() });
    } catch (err) { console.error('[CAT OS] build failed', err); busy = false; return; }
    closeSheet();
    await construct(id, name, after, b.cost);
    await refresh({ focus: id });
    scene.workers.get(id)?.cheer?.(3000);
    busy = false;
    if (step === 'name') { await wait(900); wickSays(NAMING.ask); await wait(400); openSheet(nameSheet(), 'name'); }
    else { const nb = v.buildingById(id); const ch = nb?.character; if (ch?.asks?.length && !raise) wickSays(`${ch.name} ${ch.role} has moved in. ${ch.asks[0]}`); else wickSays(builtLine(name)); }
  }

  async function openPlot(id) {
    if (busy) return;
    const p = v.plotViews.find((x) => x.id === id);
    if (!p?.ready) return;
    busy = true;
    try { await storage.put(STORES.LEARNING, { id: `vplot:${id}`, kind: 'village-plot', module: 'village', plot: id, cost: p.def.cost, at: new Date().toISOString() }); }
    catch (err) { console.error('[CAT OS] plot failed', err); busy = false; return; }
    closeSheet();
    await construct(`plot:${id}`, p.def.name, p.def.after, p.def.cost, p.def.at);
    await refresh();
    busy = false;
    wickSays(builtLine(p.def.name));
  }

  async function buildHouse(n) {
    if (busy) return;
    const h = v.nextHouse;
    if (!h?.ready || h.n !== n) return;
    busy = true;
    try { await storage.put(STORES.LEARNING, { id: `vhouse:${n}`, kind: 'village-house', module: 'village', n, cost: h.cost, at: new Date().toISOString() }); }
    catch (err) { console.error('[CAT OS] house failed', err); busy = false; return; }
    closeSheet();
    await construct(`house:${n}`, h.name, h.after, h.cost, h.at);
    await refresh();
    busy = false;
    wickSays(h.after);
  }

  /** Dust, a scaffold, hammering, then the new thing settles into place. */
  async function construct(id, name, afterLine, cost, at = null) {
    const a = at ?? anchorOf(String(id).replace(/^plot:|^house:/, '')) ?? HOME;
    await renderer.lookAt(a.x, a.y - 30, { zoom: Math.max(renderer.cam.zoom, homeZoom() * 1.15), duration: 600 });
    fly('coins', Math.min(6, Math.ceil((cost?.coins ?? 0) / 40)), pillPoint('#vcoins'), renderer.toScreen(a.x, a.y - 30), { onArrive: () => bump('#vcoins') });
    play('build');
    const scaffold = art('scaffold', {});
    const t0 = performance.now();
    const puffs = [];
    const prevObjects = scene.objects.bind(scene);
    scene.objects = (view, t) => {
      const list = prevObjects(view, t);
      const p = Math.min(1, (performance.now() - t0) / 2400);
      list.push({ x: a.x, y: a.y + 2, z: 50, art: scaffold, alpha: p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15, scale: 0.6 + Math.min(1, p * 2) * 0.4 });
      if (puffs.length < 10 && Math.random() < 0.25) puffs.push({ x: a.x + (Math.random() - 0.5) * 70, y: a.y + 4, t: 0 });
      for (const q of puffs) q.t += 16;
      for (const q of puffs) if (q.t < 1400) list.push({ x: q.x, y: q.y - q.t * 0.02, z: 60, alpha: 0.7 * (1 - q.t / 1400), art: art('puff', { size: 1 + q.t / 600 }) });
      return list;
    };
    for (let i = 0; i < 4; i += 1) { setTimeout(() => play('tick'), 300 + i * 420); }
    notice(`<b>${escapeHTML(name)}</b> — ${escapeHTML(afterLine ?? '')}`, null);
    await wait(reduce ? 400 : 2500);
    play('unlock');
  }

  /* ================= Arrival ================= */
  renderHud(); renderBubbles(); renderTip();
  renderer.start();

  if (step === 'meet') {
    await intro();
  } else if (focusId) {
    const a = anchorOf(focusId);
    renderer.cam.zoom = homeZoom();
    renderer.lookAt(a.x, a.y - 40, { animate: false });
    if (earnedRaw) {
      try {
        const bagObj = JSON.parse(earnedRaw);
        const entries = goodEntries(bagObj);
        const coinsWon = bagObj.coins ?? 0;
        setTimeout(() => {
          if (!canvas.isConnected) return;
          const from = { x: renderer.cssW / 2, y: renderer.cssH - 120 };
          let delay = 0;
          for (const e of entries) {
            const maker = v.buildings.find((x) => x.good?.key === e.key)?.id ?? focusId;
            fly(e.key, e.amount, from, screenOf(maker), { delay, onArrive: () => { scene.workers.get(maker)?.cheer?.(); play('ink'); renderBubbles(); } });
            delay += 400;
          }
          if (coinsWon) fly('coins', Math.min(6, Math.ceil(coinsWon / 20)), from, pillPoint('#vcoins'), { delay, onArrive: () => bump('#vcoins') });
          const made = [...entries.map((e) => chips({ [e.key]: e.amount }, { sign: '+' })), coinsWon ? chips({ coins: coinsWon }, { sign: '+' }) : ''].join(' ');
          setTimeout(() => notice(`${made} ${changeLine ?? ''}`, 'place'), 500);
        }, reduce ? 0 : 700);
      } catch { /* the numbers are already right */ }
    } else if (changeLine) setTimeout(() => notice(changeLine, 'place'), 500);
    if (step === 'deliver' && v.orders[0]?.deliverable) setTimeout(() => wickSays(STEP_LINES.deliver), reduce ? 600 : 2600);
    else if (wickRaw) setTimeout(() => wickSays(wickRaw), reduce ? 400 : 2200);
  } else {
    renderer.cam.zoom = homeZoom();
    renderer.lookAt(HOME.x, HOME.y + 60, { animate: false });
    if (!reduce) setTimeout(() => renderer.lookAt(HOME.x, HOME.y, { duration: 1500 }), 200);
    let stageSaid = null;
    try {
      const key = 'world:stage-seen';
      const seen = localStorage.getItem(key);
      const nowName = v.stage?.name ?? null;
      if (nowName && seen && seen !== nowName) stageSaid = stageLine(nowName);
      if (nowName && seen !== nowName) localStorage.setItem(key, nowName);
    } catch { /* private mode */ }
    if (step !== 'done' && STEP_LINES[step]) setTimeout(() => wickSays(STEP_LINES[step]), 1400);
    else if (stageSaid) setTimeout(() => wickSays(stageSaid), 1800);
    else { const line = homecoming(state, { awayDays: state.awayDays, name: valleyName(valley) }); if (line) setTimeout(() => wickSays(line), 1600); }
  }
  if (unlockedRaw) {
    try { const list = JSON.parse(unlockedRaw); if (list.length) setTimeout(() => notice(`<b>${escapeHTML(list[0].name)}</b> can be built now.`, 'unlock'), reduce ? 600 : 3200); } catch { /* silent */ }
  }
  if (step === 'name' && !focusId) setTimeout(() => openSheet(nameSheet(), 'name'), 1200);
  requestAnimationFrame(() => { const settle = () => { if (renderer.cam.zoom < homeZoom() && step !== 'meet') { renderer.cam.zoom = homeZoom(); renderer.clampCamera(); } }; settle(); requestAnimationFrame(settle); });

  /** The first minutes: arrive, see the village, meet Wick, be pointed at Ada. */
  async function intro() {
    const host = outlet.querySelector('.vg');
    host.insertAdjacentHTML('beforeend', `<div class="vintro" id="vintro"><div class="vintro__mark">CAT OS<small>Your village</small></div></div>`);
    const introEl = outlet.querySelector('#vintro');
    renderer.cam.zoom = renderer.minZoom();
    renderer.lookAt(WORLD.W / 2, WORLD.H / 2 - 40, { animate: false });
    hud.classList.remove('is-in');
    await wait(200);
    introEl.classList.add('is-mark');
    await wait(reduce ? 300 : 1900);
    introEl.classList.add('is-lift');
    await renderer.lookAt(HOME.x, HOME.y + 10, { zoom: homeZoom() * 1.1, duration: reduce ? 300 : 3200, ease: (t) => t * t * (3 - 2 * t) });
    introEl.remove();
    if (!canvas.isConnected) return;
    for (let i = 0; i < OPENING.length; i += 1) {
      if (!canvas.isConnected) return;
      if (i === OPENING.length - 1) renderer.lookAt(anchorOf('reading').x - 40, anchorOf('reading').y - 20, { zoom: homeZoom() * 1.1, duration: 1400 });
      await wickSays(OPENING[i], { tap: true });
    }
    wickEl.classList.remove('is-in', 'is-tap');
    valley = await saveValley(storage, { met_at: new Date().toISOString(), awakened_at: new Date().toISOString() });
    step = onboardingStep(v, state, valley);
    hud.classList.add('is-in');
    renderBubbles(); renderTip();
    await wait(500);
    wickSays(STEP_LINES['first-read']);
  }

  /* ---- Sound ---- */
  const warmth = Math.min(1, (v.levels.size / 8) * 0.6 + Math.min(1, state.stars / 90) * 0.4);
  const onDown = () => { unlock(); startMusic('world', { hour: state.atmo.hour, warmth }); startAmbience('world', state.atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true });
  startMusic('world', { hour: state.atmo.hour, warmth }); startAmbience('world', state.atmo);

  /* ---- Leave ---- */
  const onHash = () => {
    renderer.destroy();
    cancelAnimationFrame(bubbleRaf);
    window.removeEventListener('pointerdown', onDown, { capture: true });
    window.removeEventListener('hashchange', onHash);
  };
  window.addEventListener('hashchange', onHash);
}

function fmtWait(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export { HOUSE };
