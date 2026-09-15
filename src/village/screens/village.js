/**
 * village.js (screen) — home. The village, alive, and everything you do
 * in it that is not learning: look, tap a building, collect what its
 * worker made, deliver an order at the board, build, raise, open land,
 * name the place.
 *
 * The screen answers four questions without the learner reading anything:
 *   WHERE AM I     my village, with my people at their doors
 *   WHAT CHANGED   goods flying into the building that makes them, and
 *                  the worker getting to work
 *   WHAT NEEDS ME  a callout over anything that is ready or wanted
 *   WHAT NOW       tap it: the person there tells you, and one button does it
 *
 * There is no dashboard. The world is the interface: a tapped building
 * opens a small paper card in which its worker speaks; the order board
 * is a board; Wick talks from where he is standing.
 *
 * The first minutes are this same screen, staged: Wick speaks, the
 * Reading House wants Pages, the learner reads, comes back, watches Ada
 * bind, collects, delivers to Mira at the board, builds, and names the
 * place.
 */

import { VillageRenderer } from '../renderer.js';
import { buildVillageScene } from '../scene.js';
import { art, artIMG } from '../art.js';
import { BUILDINGS, CHARACTERS, HOUSE, WORLD, BOARD, buildingById, good } from '../defs.js';
import { loadWorld } from '../../world/state.js';
import { onboardingStep, needsText, costText } from '../state.js';
import { nextActivity } from '../next.js';
import { goodEntries, bagEntries, madeEntries, EARN } from '../../world/economy.js';
import { chips, costChips, coinsHTML, goodIcon, wireCraftTaps, bagText } from '../../world/craft-ui.js';
import { icon } from '../../world/icons.js';
import { mountMenu } from '../../world/menu.js';
import { loadValley, saveValley, valleyName, homecoming, stageLine, OPENING, NAMING, STEP_LINES, builtLine, cleanValleyName, nameSuggestions } from '../../world/companion.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { play, unlock, startMusic, startAmbience, musicEnabled, setMusicEnabled } from '../../world/audio.js';
import { motionReduced, onFeedbackChange } from '../../core/engagement/feedback.js';
import { escapeHTML } from '../../core/utils/format.js';

const ICON_SOUND_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M17.8 6.5a7.5 7.5 0 0 1 0 11"/></svg>`;
const ICON_SOUND_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HOME = { x: WORLD.home.x, y: WORLD.home.y + 20 };
const fmtSecs = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`; };
const fmtWait = (ms) => { const m = Math.max(1, Math.round(ms / 60000)); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; };

export async function renderVillage(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');
  outlet.innerHTML = `
    <section class="vg" aria-label="Your village">
      <canvas class="vg__canvas" id="vg-canvas" tabindex="0" aria-label="Your village. Drag to look around, tap a building to see who works there."></canvas>
      <div class="vcallouts" id="vcallouts"></div>
      <div class="vhud" id="vhud"></div>
      <div class="vnotice" id="vnotice" role="status"></div>
      <div class="vwick" id="vwick" hidden><span class="vwick__who">${artIMG('wick', { pose: 'sit' }, { size: 30 })}</span><p></p><span class="vwick__more" aria-hidden="true"></span></div>
      <div class="vpop" id="vpop" hidden></div>
      <div class="vflyers" id="vflyers" aria-hidden="true"></div>
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
  const changeLine = sessionStorage.getItem('world:change-line');
  const earnedRaw = sessionStorage.getItem('world:earned');
  const wickRaw = sessionStorage.getItem('world:wick');
  const unlockedRaw = sessionStorage.getItem('world:unlocked');
  for (const k of ['world:focus', 'world:changed', 'world:change-line', 'world:earned', 'world:unlocked', 'world:wick']) sessionStorage.removeItem(k);
  const focusId = focusSlug ? (buildingById(focusSlug) ? focusSlug : (BUILDINGS.find((b) => b.place === focusSlug)?.id ?? placeToBuilding(focusSlug))) : null;

  const reduce = performance.now() - askedAt > 1600 || motionReduced();
  let commuted = false;
  try { commuted = sessionStorage.getItem('world:commuted') === '1'; } catch { /* fine */ }
  const commute = !commuted && !focusId && !reduce && (state.atmo.hour === 'morning' || state.atmo.hour === 'dawn');
  try { sessionStorage.setItem('world:commuted', '1'); } catch { /* fine */ }
  let scene = buildVillageScene(state, state.atmo, { focus: focusId, commute });
  const renderer = new VillageRenderer(canvas, scene, { fit: 'cover', minZoom: 0.55, maxZoom: 2.2, initialZoom: 1.25, onTap: (w) => onTap(w), still: motionReduced() });
  // Settings can change the motion preference while the village is open, and
  // the canvas is the one surface a stylesheet cannot reach into.
  const offMotion = onFeedbackChange(() => renderer.setStill(motionReduced()));
  // A close, intimate camera: a building takes a third of a phone's width.
  const homeZoom = () => Math.max(renderer.fitZoom(), renderer.snap(renderer.cssW < 600 ? 1.25 : 1.1));
  const anchorOf = (id) => scene.anchorOf(id) ?? HOME;

  /* ================= HUD ================= */
  const hud = outlet.querySelector('#vhud');
  const renderHud = () => {
    const name = valleyName(valley);
    const goodsCount = madeEntries(v.stock).reduce((n, e) => n + e.amount, 0);
    hud.innerHTML = `
      <button class="vpill vpill--name" id="vname" aria-label="${escapeHTML(name)}: level ${v.level.n}">
        <span class="vpill__ring" style="--p:${Math.round(v.level.pct * 100)}%"><b>${v.level.n}</b></span>
        <span class="vpill__text"><span class="vpill__title">${escapeHTML(name)}</span><span class="vpill__sub">${escapeHTML(v.stage.name)}</span></span>
      </button>
      <div class="vhud__right">
        <div class="vhud__row">
          <button class="vpill vpill--coins" id="vcoins" aria-label="${v.coins} coins">${coinsHTML(v.coins)}</button>
        </div>
        <div class="vhud__row" id="vhud-icons">
          <button class="vhudbtn" id="vbarn" aria-label="Your goods">${icon('board', { size: 24 })}<span class="vhudbtn__badge">${goodsCount || ''}</span></button>
          <button class="vhudbtn" id="vsound" aria-pressed="${musicEnabled()}" aria-label="Music and ambience">${musicEnabled() ? ICON_SOUND_ON : ICON_SOUND_OFF}</button>
        </div>
      </div>`;
    hud.querySelector('#vsound').addEventListener('click', async (e) => {
      const on = !musicEnabled();
      await setMusicEnabled(on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
      e.currentTarget.innerHTML = on ? ICON_SOUND_ON : ICON_SOUND_OFF;
      if (on) { unlock(); startMusic('world', { hour: state.atmo.hour }); startAmbience('world', state.atmo); }
      play('tap');
    });
    hud.querySelector('#vname').addEventListener('click', () => { play('tap'); openPop('hearth'); });
    hud.querySelector('#vbarn').addEventListener('click', () => { play('tap'); openSheet(barnSheet(), 'barn'); });
    mountMenu(hud.querySelector('#vhud-icons'), { storage });
    if (step !== 'meet') requestAnimationFrame(() => hud.classList.add('is-in'));
  };
  wireCraftTaps(hud, () => state);

  /* ================= Callouts over the world ================= */
  const calloutsEl = outlet.querySelector('#vcallouts');
  const calloutFor = new Map();
  const calloutSpec = () => {
    const out = [];
    const allow = (id) => step === 'done' || step === 'name' || (step === 'first-read' && id === 'reading') || (step === 'binding' && id === 'reading') || (step === 'collect' && id === 'reading') || (step === 'deliver' && id === 'board') || (step === 'build' && id === 'garden');
    if (allow('board')) {
      if (v.deliverable.length) out.push({ id: 'board', tone: 'ready', glyph: 'check', text: v.deliverable.length > 1 ? `${v.deliverable.length}` : 'Deliver', sub: v.deliverable.length > 1 ? 'ready' : '' });
      else if (step === 'done' && v.orders.length) { const e = goodEntries(v.orders[0].missing)[0]; if (e) out.push({ id: 'board', tone: 'want', glyph: e.key, text: `${e.amount}`, sub: 'wanted' }); }
    }
    for (const b of v.buildings) {
      if (!allow(b.id) || b.id === 'hearth') continue;
      if (!b.built) { if (b.standing && b.cost) out.push({ id: b.id, tone: 'build', glyph: 'hammer', text: b.affordable ? 'Build' : `${b.cost.coins}`, sub: b.affordable ? '' : 'coins' }); continue; }
      const q = b.queue;
      if (q?.ready > 0) { out.push({ id: b.id, tone: 'good', glyph: b.good.key, text: `×${q.ready}` }); continue; }
      if (q?.working) { out.push({ id: b.id, tone: 'wait', glyph: b.good.key, ring: q.working, text: `${q.pending}`, sub: fmtSecs(q.working.readyAt - Date.now()) }); continue; }
      if (b.ready) { out.push({ id: b.id, tone: 'build', glyph: 'hammer', text: 'Raise' }); continue; }
      if (step === 'first-read' && b.id === 'reading') { out.push({ id: b.id, tone: 'learn', glyph: 'page', text: 'Read' }); continue; }
      if (b.good && b.wantedHere > 0 && step === 'done') { out.push({ id: b.id, tone: 'want', glyph: b.raw.key, text: `${b.wantedHere}`, sub: 'wanted' }); continue; }
    }
    if (step === 'done') {
      for (const p of v.plotViews) if (!p.open && p.ready) out.push({ id: `plot:${p.id}`, tone: 'build', glyph: 'coin', text: `${p.def.cost.coins}` });
      if (v.nextHouse?.ready) out.push({ id: `house:${v.nextHouse.n}`, tone: 'build', glyph: 'coin', text: `${v.nextHouse.cost.coins}` });
    }
    return out;
  };
  const renderCallouts = () => {
    const specs = calloutSpec();
    calloutsEl.innerHTML = specs.map((s) => `
      <button class="vb vb--${s.tone}" data-id="${escapeHTML(s.id)}" aria-label="${escapeHTML(String(s.text))} ${escapeHTML(s.sub ?? '')}">
        <span class="vb__in">${s.ring ? `<span class="vb__ring" style="--p:${Math.round(s.ring.pct * 100)}%">${goodIcon(s.glyph, { size: 17 })}</span>` : (s.glyph === 'hammer' || s.glyph === 'check' || s.glyph === 'page') ? icon(s.glyph, { size: 24 }) : goodIcon(s.glyph, { size: 24 })}<b>${escapeHTML(String(s.text))}</b>${s.sub ? `<small>${escapeHTML(s.sub)}</small>` : ''}</span>
      </button>`).join('');
    calloutFor.clear();
    for (const el of calloutsEl.querySelectorAll('.vb')) {
      calloutFor.set(el.dataset.id, el);
      el.addEventListener('click', () => { play('tap'); tapCallout(el.dataset.id); });
      /* The callouts are the village's whole answer to "what needs me" —
         collect, deliver, build — and they carried tabindex="-1", so there
         was no keyboard route to any of it: the canvas's own key handler only
         pans. They are real buttons with labels, so simply letting them into
         the tab order is enough. The one catch is that a callout whose
         building is off-screen is opacity:0, and focusing something invisible
         is worse than not reaching it — so focus brings the village to it,
         which makes tabbing a tour of everything that wants attention. */
      el.addEventListener('focus', () => {
        if (!el.classList.contains('is-off')) return;
        const a = scene.anchors.find((n) => n.id === el.dataset.id);
        if (a) renderer.lookAt(a.x, a.y, { duration: motionReduced() ? 0 : 420 });
      });
    }
    calloutKey = '';
    setTimeout(() => { for (const el of calloutsEl.querySelectorAll('.vb')) el.classList.add('is-in'); }, 30);
  };
  let calloutRaf = 0, calloutKey = '', ringTick = 0;
  const placeCallouts = () => {
    const z = renderer.cam.zoom;
    const key = `${Math.round(renderer.cam.x)}|${Math.round(renderer.cam.y)}|${z.toFixed(3)}|${renderer.cssW}|${renderer.cssH}`;
    if (key !== calloutKey) {
      calloutKey = key;
      for (const a of scene.anchors) {
        const el = calloutFor.get(a.id);
        if (!el) continue;
        const s = renderer.toScreen(a.x, a.y);
        const off = s.x < 10 || s.x > renderer.cssW - 10 || s.y < 70 || s.y > renderer.cssH - 40;
        el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%) scale(${Math.max(0.75, Math.min(1.1, z))})`;
        el.classList.toggle('is-off', off);
      }
    }
    // The working rings tick once a second.
    ringTick += 1;
    if (ringTick % 30 === 0) for (const b of v.working) { const el = calloutFor.get(b.id); const ring = el?.querySelector('.vb__ring'); const sm = el?.querySelector('small'); if (ring) { const left = b.queue.working.readyAt - Date.now(); const dur = b.queue.working.readyAt - b.queue.working.startedAt; ring.style.setProperty('--p', `${Math.round(Math.max(0, Math.min(1, 1 - left / dur)) * 100)}%`); } if (sm) sm.textContent = fmtSecs(b.queue.working.readyAt - Date.now()); }
    placeWick();
    calloutRaf = requestAnimationFrame(placeCallouts);
  };
  calloutRaf = requestAnimationFrame(placeCallouts);

  function tapCallout(id) {
    if (id === 'board') { lookAt('board'); openPop('board'); return; }
    if (String(id).startsWith('plot:') || String(id).startsWith('house:')) { openPop(id); return; }
    const b = v.buildingById(id);
    if (b?.queue?.ready > 0) { collect(id); return; }
    lookAt(id); openPop(id);
  }

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
  let wickTimer = 0, wickAt = null;
  let tapGuardUntil = 0;
  function placeWick() {
    if (!wickEl.classList.contains('is-in')) return;
    const at = scene.wick?.at ?? HOME;
    const s = renderer.toScreen(at.x, at.y - 30);
    const W = renderer.cssW, H = renderer.cssH;
    const bw = wickEl.offsetWidth || 220, bh = wickEl.offsetHeight || 60;
    let x = s.x, y = s.y;
    const clampedX = Math.max(bw / 2 + 8, Math.min(W - bw / 2 - 8, x));
    const clampedY = Math.max(bh + 90, Math.min(H - 20, y));
    const clamped = Math.abs(clampedX - x) > 2 || Math.abs(clampedY - y) > 2 || popOpen;
    if (popOpen) { x = W / 2; y = Math.min(clampedY, H - (popEl.offsetHeight || 200) - 24); } else { x = clampedX; y = clampedY; }
    wickEl.classList.toggle('is-clamped', clamped);
    wickEl.style.left = `${Math.round(x)}px`; wickEl.style.top = `${Math.round(y)}px`;
  }
  /** Wick says one line. With `tap`, resolves on the next tap. */
  function wickSays(line, { hold = 6500, tap = false } = {}) {
    wickEl.hidden = false;
    wickEl.querySelector('p').textContent = line;
    wickEl.querySelector('.vwick__more').textContent = tap ? 'tap to go on' : '';
    wickEl.classList.remove('is-tap');
    wickEl.classList.add('is-in');
    if (tap) wickEl.classList.add('is-tap');
    placeWick();
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
  void wickAt;

  /* ================= The popover ================= */
  const popEl = outlet.querySelector('#vpop');
  let popOpen = null;
  const portrait = (ch, size = 74) => (ch?.look ? artIMG('person', { ...ch.look, pose: 'idle' }, { size, className: 'vportrait' }) : ch?.id === 'wick' ? artIMG('wick', { pose: 'sit' }, { size, className: 'vportrait' }) : '');
  /* ---- Modal plumbing, shared by the popovers and the sheets ----
     Both announced themselves as role="dialog" and then honoured none of the
     contract: no accessible name (so they were read as an unnamed dialog),
     focus left behind on whatever opened them, Tab walking straight out into
     the HUD and the canvas underneath while the scrim kept the pointer in,
     and no Escape. All four are answered here rather than at six call sites. */
  let modalSeq = 0;
  let modalReturn = null;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function openModal(card, close) {
    if (!card) return;
    modalReturn = document.activeElement;
    card.setAttribute('aria-modal', 'true');
    const name = card.querySelector('.vpop__name, .vsheet__name, .vsign__label, h2, h3');
    if (name) {
      if (!name.id) name.id = `vmodal-name-${++modalSeq}`;
      card.setAttribute('aria-labelledby', name.id);
    } else {
      card.setAttribute('aria-label', 'Dialog');
    }
    card.setAttribute('tabindex', '-1');
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); play('close'); close(); return; }
      if (e.key !== 'Tab') return;
      const f = [...card.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!f.length) { e.preventDefault(); card.focus({ preventScroll: true }); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    card.__keys = onKey;
    requestAnimationFrame(() => { try { card.focus({ preventScroll: true }); } catch { /* fine */ } });
  }

  function closeModal(card) {
    if (card?.__keys) { document.removeEventListener('keydown', card.__keys, true); card.__keys = null; }
    const back = modalReturn;
    modalReturn = null;
    if (back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch { /* fine */ } }
  }

  function openPop(id) {
    const html = popHTML(id);
    if (!html) return;
    popOpen = id;
    popEl.hidden = false;
    popEl.innerHTML = `<div class="vpop__card vpanel" role="dialog">${html}<button class="vpop__close" data-close aria-label="Close">×</button></div>`;
    requestAnimationFrame(() => popEl.classList.add('is-in'));
    for (const el of popEl.querySelectorAll('[data-close]')) el.addEventListener('click', () => { play('close'); closePop(); });
    wireActions(popEl);
    wireCraftTaps(popEl, () => state);
    openModal(popEl.querySelector('.vpop__card'), closePop);
  }
  function closePop() {
    if (!popOpen) return;
    popOpen = null;
    closeModal(popEl.querySelector('.vpop__card'));
    popEl.classList.remove('is-in');
    setTimeout(() => { if (!popOpen) { popEl.hidden = true; popEl.innerHTML = ''; } }, 260);
  }
  const say = (text) => `<div class="vpop__say">${text}</div>`;
  const head = (portraitHTML, eyebrow, name, role, tone = '') => `
      <header class="vpop__head">
        <span class="vpop__portrait ${tone}">${portraitHTML}</span>
        <div class="vpop__who"><p class="vpop__eyebrow">${escapeHTML(eyebrow)}</p><h2 class="vpop__name">${escapeHTML(name)}</h2>${role ? `<p class="vpop__role">${escapeHTML(role)}</p>` : ''}</div>
      </header>`;

  function queueStrip(b) {
    const q = b.queue;
    if (!q) return '';
    const w = q.working;
    return `
      <div class="vqueue" aria-label="What ${escapeHTML(b.character?.name ?? 'the worker')} is making">
        <span class="vqueue__step ${q.pending ? '' : 'vqueue__step--empty'}">${goodIcon(b.raw.key, { size: 20 })}<b>${q.pending}</b><small>${escapeHTML(q.pending === 1 ? b.raw.one : b.raw.name)}</small></span>
        <span class="vqueue__arrow" aria-hidden="true">→</span>
        <span class="vqueue__ring" style="--p:${w ? Math.round(w.pct * 100) : 0}%" data-ring="${b.id}">${goodIcon(b.good.key, { size: 16 })}</span>
        <span class="vqueue__arrow" aria-hidden="true">→</span>
        <span class="vqueue__step ${q.ready ? 'vqueue__step--ready' : 'vqueue__step--empty'}">${goodIcon(b.good.key, { size: 20 })}<b>${q.ready}</b><small>ready</small></span>
        <span class="vqueue__meta">${w ? `next in <b data-left="${b.id}">${fmtSecs(w.readyAt - Date.now())}</b>` : q.ready ? 'on the shelf' : 'nothing queued'}</span>
      </div>`;
  }

  /* What a session actually pays, in one clause under the button.
     The goods template ("up to 3 Pages → Books") assumed every learning
     building makes a raw good. The Road Out makes coins and has no `raw`,
     so `b.raw?.name ?? 'coins'` rendered "up to 3 coins" for a Gauntlet run
     that pays 50 at its very worst and roughly four times that for a strong
     one — a 98% understatement on the only coin-paying activity in the game,
     shown on a road that costs 250 coins and 12 stars to open. */
  function rewardLine(b, act) {
    if (b.raw) {
      return `→ up to 3 ${escapeHTML(b.raw.name)}${b.good ? ` → ${escapeHTML(b.good.name)}` : ''}`;
    }
    if (act?.makes === 'coins') return `→ ${EARN.gauntlet(0, 0).coins}+ coins, by stars`;
    return '';
  }

  function learnBlock(b, { first = false } = {}) {
    const act = b.def.activity;
    if (!act) return '';
    const next = nextActivity(b.id, world, { first });
    const href = next?.href ?? act.route;
    return `
      <a class="vlearn" href="${escapeHTML(href)}" data-go="${b.id}">
        <span class="vlearn__mk">${goodIcon(b.raw?.key ?? 'coins', { size: 26 })}</span>
        <span class="vlearn__body">
          <p class="vlearn__eyebrow">${escapeHTML(b.def.skill ?? 'Challenge')}</p>
          <p class="vlearn__title">${escapeHTML(next?.label ?? act.label)}</p>
          <p class="vlearn__sub">${escapeHTML(next?.sub ?? act.brief ?? '')}</p>
        </span>
      </a>
      <div class="vpop__actions">
        <a class="vbtn ${b.queue?.ready ? 'vbtn--paper' : ''}" href="${escapeHTML(href)}" data-go="${b.id}">${escapeHTML(act.verb)}<small>${rewardLine(b, act)}</small></a>
      </div>`;
  }

  function popHTML(id) {
    if (id === 'board') return boardPop();
    if (String(id).startsWith('plot:')) return plotPop(id.slice(5));
    if (String(id).startsWith('house:')) return housePop();
    if (String(id).startsWith('nb:')) return neighbourPop(id.slice(3));
    if (id === 'wick') return wickPop();
    const b = v.buildingById(id);
    if (!b) return '';
    const ch = b.character;
    if (b.id === 'hearth') return hearthPop(b);
    if (!b.built) {
      const u = b.def.unlock;
      return `
        ${head(ch ? portrait(ch) : icon('hammer', { size: 40 }), 'Not built yet', b.def.name, ch ? `${ch.name}, ${ch.role}` : '')}
        ${say(escapeHTML(u?.line ?? b.def.line))}
        <p class="vpop__line">${escapeHTML(b.def.line)}</p>
        ${costRows(b.cost, u?.standing?.line, b.affordable, b.standing)}
        <div class="vpop__actions">
          ${b.ready ? `<button class="vbtn vbtn--gold" data-build="${b.id}">${icon('hammer', { size: 20 })} Build it</button>` : `<button class="vbtn vbtn--paper" aria-disabled="true">${b.standing ? `Short ${escapeHTML(bagText(b.missing))}` : 'Deliver orders first'}</button>`}
        </div>`;
    }
    if (b.id === 'market') {
      return `
        ${head(portrait(ch), `Level ${b.level} · orders`, b.def.name, `${ch.name}, ${ch.role}`)}
        ${say(escapeHTML(ch.idle[Math.floor(Date.now() / 3600e3) % ch.idle.length]))}
        <p class="vpop__line">${v.orders.length} orders on the board. ${b.next?.effect?.slots ? `The next level makes room for ${b.next.effect.slots}, and pays more.` : b.next ? 'The next level pays more.' : 'The board is as big as it gets.'}</p>
        <div class="vpop__actions">
          <button class="vbtn" data-open="board">${icon('board', { size: 20 })} The order board</button>
          <button class="vbtn vbtn--quiet" data-sheet="${b.id}">Details</button>
        </div>`;
    }
    if (b.id === 'road') {
      return `
        ${head(icon('road', { size: 44 }), `Level ${b.level} · challenge`, b.def.name, 'Mixed, timed, paid in coins', 'vpop__portrait--sky')}
        ${say(escapeHTML(b.def.line))}
        ${learnBlock(b)}
        <div class="vpop__foot"><button class="vbtn vbtn--quiet" data-sheet="${b.id}">Details</button></div>`;
    }
    // A learning building with a worker and a queue.
    const q = b.queue;
    const wants = v.orders.filter((o) => (o.needs[b.good.key] ?? 0) > 0 && (o.missing[b.good.key] ?? 0) > 0);
    let line;
    if (q?.ready) line = ch.ready[q.ready % ch.ready.length];
    else if (q?.working) line = ch.working[Math.floor(Date.now() / 60000) % ch.working.length];
    else if (wants.length) line = `${wants[0].giver.name} needs <b>${wants[0].missing[b.good.key]} ${wants[0].missing[b.good.key] === 1 ? b.good.one : b.good.name}</b> ${escapeHTML(wants[0].reason)}. ${escapeHTML(ch.asks[0])}`;
    else if (step === 'first-read') line = `Mira needs a Book for the schoolhouse. Bring me a <b>Page</b> and I will bind it. Pages come from reading.`;
    else line = escapeHTML(ch.idle[Math.floor(Date.now() / 3600e3) % ch.idle.length]);
    return `
      ${head(portrait(ch), `${b.def.skill} · level ${b.level}`, b.def.name, `${ch.name}, ${ch.role}`)}
      ${say(line)}
      ${queueStrip(b)}
      ${q?.ready ? `<div class="vpop__actions"><button class="vbtn vbtn--gold" data-collect="${b.id}">${goodIcon(b.good.key, { size: 20 })} Collect ${q.ready} ${escapeHTML(q.ready === 1 ? b.good.one : b.good.name)}</button></div>` : ''}
      ${learnBlock(b, { first: step === 'first-read' })}
      <div class="vpop__foot">
        <span class="vchain">${goodIcon(b.raw.key, { size: 16 })} ${escapeHTML(b.raw.name)} <span aria-hidden="true">→</span> ${goodIcon(b.good.key, { size: 16 })} ${escapeHTML(b.good.name)} <span aria-hidden="true">→</span> ${icon('board', { size: 16 })} orders <span aria-hidden="true">→</span> ${goodIcon('coins', { size: 16 })}</span>
        <button class="vbtn vbtn--quiet" data-sheet="${b.id}">Details</button>
      </div>`;
  }

  function hearthPop(b) {
    const name = valleyName(valley);
    const lines = [];
    if (v.deliverable.length) lines.push(`${v.deliverable.length === 1 ? 'An order is' : `${v.deliverable.length} orders are`} ready at the board.`);
    if (v.collectable.length) lines.push(`${v.collectable.map((c) => c.character.name).join(' and ')} ${v.collectable.length === 1 ? 'has' : 'have'} something on the shelf.`);
    if (v.readyThings.length) lines.push(`${v.readyThings[0].name} can be built.`);
    const line = lines[0] ?? homecoming(state, { awayDays: state.awayDays, name }) ?? 'Home. Warm enough.';
    return `
      ${head(portrait(CHARACTERS.wick), `${v.stage.name} · level ${v.level.n}`, name, 'Wick, the lamp-keeper', 'vpop__portrait--paper')}
      ${say(escapeHTML(line))}
      <div class="vpop__actions">
        <button class="vbtn" data-open="board">${icon('board', { size: 20 })} Orders</button>
        <a class="vbtn vbtn--paper" href="#/world/place/hearth?you=1">${icon('scroll', { size: 20 })} Standing</a>
      </div>
      <div class="vpop__foot">
        <a class="vbtn vbtn--quiet" href="#/growth">Growth →</a>
        <button class="vbtn vbtn--quiet" data-sheet="hearth">${b.next ? `Raise: ${escapeHTML(b.next.name)}` : 'Details'}</button>
      </div>`;
  }

  function boardPop() {
    const first = v.orders[0];
    /* (There was a `${mira && step !== 'done' ? '' : ''}` here — an unfinished
       line that rendered the empty string on both branches, with `mira` bound
       only to feed it. The greeting it was reaching for is already covered:
       `line` below names the neighbour who is waiting, and during onboarding
       that neighbour is always Mira.) */
    const line = v.deliverable.length ? `${v.deliverable[0].giver.name} is waiting for ${needsText(v.deliverable[0].needs)}.` : first ? `${first.giver.name} needs ${needsText(first.missing)} more ${first.reason}.` : 'Nothing is asked for right now.';
    return `
      ${head(icon('board', { size: 44 }), `${v.orders.length} ${v.orders.length === 1 ? 'order' : 'orders'} · pays coins`, 'The order board', 'Your neighbours, asking', 'vpop__portrait--paper')}
      ${say(escapeHTML(line))}
      <div class="vorders">${v.orders.map((o) => orderRow(o)).join('')}</div>
      ${!v.builtIds.has('market') && step === 'done' ? `<p class="vpop__line">One order at a time until the Market is built.</p>` : ''}`;
  }

  function orderRow(o) {
    const entries = goodEntries(o.needs);
    return `
      <div class="order ${o.deliverable ? 'is-ready' : ''}" data-order="${o.id}">
        <span class="order__who">${o.giver.look ? artIMG('person', { ...o.giver.look, pose: 'idle' }, { size: 42 }) : icon('cat', { size: 30 })}</span>
        <span class="order__body">
          <b>${escapeHTML(o.giver.name)}<small>${escapeHTML(o.giver.role ?? '')}</small></b>
          <span class="order__needs">${entries.map((e) => `<span class="craft craft--${e.key} ${(o.missing[e.key] ?? 0) > 0 ? 'is-short' : 'is-met'}" data-craft="${e.key}">${goodIcon(e.key, { size: 15 })}<b>${Math.min(e.amount, v.stock[e.key] ?? 0)}/${e.amount}</b></span>`).join('')}</span>
          <em>${escapeHTML(o.reason)}</em>
        </span>
        ${o.deliverable
          ? `<button class="order__go" data-deliver="${o.id}">${goodIcon('coins', { size: 16 })}<b>${o.pay}</b><span>Deliver</span></button>`
          : `<span class="order__pay">${goodIcon('coins', { size: 15 })}<b>${o.pay}</b></span>`}
      </div>`;
  }

  function costRows(cost, standingLine, affordable, standing) {
    return `
      <div class="vcost">
        ${cost ? `<div class="vcost__row ${affordable ? 'is-met' : ''}"><span class="vcost__k">Costs</span><span class="vcost__v">${costChips(cost, v.stock)}</span></div>` : ''}
        ${standingLine ? `<div class="vcost__row ${standing ? 'is-met' : ''}"><span class="vcost__k">Asks</span><span class="vcost__v">${standing ? icon('check', { size: 16 }) : ''} ${escapeHTML(standingLine)}</span></div>` : ''}
      </div>`;
  }

  function plotPop(id) {
    const p = v.plotViews.find((x) => x.id === id);
    if (!p) return '';
    return `
      ${head(artIMG('plotSign', {}, { size: 56 }), 'Land', p.def.name, 'Room to grow', 'vpop__portrait--paper')}
      ${say(escapeHTML(p.def.line))}
      ${costRows(p.def.cost, p.def.standing.line, p.affordable, p.standing)}
      <div class="vpop__actions">${p.ready ? `<button class="vbtn vbtn--gold" data-plot="${p.id}">${icon('hammer', { size: 20 })} Open the land</button>` : `<button class="vbtn vbtn--paper" aria-disabled="true">${p.standing ? `Short ${escapeHTML(bagText(p.missing))}` : 'Not yet'}</button>`}</div>`;
  }

  function housePop() {
    const h = v.nextHouse;
    if (!h) return '';
    return `
      ${head(artIMG('person', { ...h.who.look, pose: 'wave' }, { size: 74 }), 'A neighbour', h.name, `${h.who.name}, ${h.who.role}`)}
      ${say(escapeHTML(h.who.greet))}
      <p class="vpop__line">${escapeHTML(h.line)}</p>
      ${costRows(h.cost, h.standingLine, h.affordable, h.standing)}
      <div class="vpop__actions">${h.ready ? `<button class="vbtn vbtn--gold" data-house="${h.n}">${icon('hammer', { size: 20 })} Build the house</button>` : `<button class="vbtn vbtn--paper" aria-disabled="true">${h.standing ? `Short ${escapeHTML(bagText(h.missing))}` : 'Not yet'}</button>`}</div>`;
  }

  function neighbourPop(id) {
    const nb = v.neighbours.find((n) => n.id === id);
    if (!nb) return '';
    const theirs = v.orders.filter((o) => o.giver.id === id);
    const o = theirs[0];
    const line = o ? (o.deliverable ? `Is that my ${needsText(o.needs)}? ${escapeHTML(o.reason.replace(/^for /, 'It is for '))}.` : `I need ${needsText(o.needs)} ${escapeHTML(o.reason)}. ${o.pct > 0 ? 'Nearly there.' : ''}`) : nb.greet;
    return `
      ${head(portrait(nb), 'A neighbour', nb.name, nb.role)}
      ${say(line)}
      ${o ? `<div class="vorders">${orderRow(o)}</div>` : `<p class="vpop__line">${escapeHTML(nb.greet)}</p>`}`;
  }

  function wickPop() {
    const line = homecoming(state, { awayDays: state.awayDays, name: valleyName(valley) });
    scene.wick?.celebrate?.(1200);
    play('place');
    return `
      ${head(portrait(CHARACTERS.wick), 'The lamp-keeper', 'Wick', 'He keeps the lamps. You keep the rest.', 'vpop__portrait--paper')}
      ${say(escapeHTML(line ?? 'Quiet day. Good weather for it.'))}
      <div class="vpop__actions"><button class="vbtn vbtn--paper" data-open="${v.tip?.building ?? 'reading'}">${icon('arrow', { size: 18 })} Show me what to do</button></div>`;
  }

  /* ================= Sheets: details, the barn, the name ================= */
  const sheetEl = outlet.querySelector('#vsheet');
  let sheetOpen = null;
  function openSheet(html, id = null) {
    sheetOpen = id;
    sheetEl.hidden = false;
    sheetEl.innerHTML = `<div class="vsheet__scrim" data-close></div><div class="vsheet__card" role="dialog">${html}</div>`;
    requestAnimationFrame(() => sheetEl.classList.add('is-in'));
    for (const el of sheetEl.querySelectorAll('[data-close]')) el.addEventListener('click', () => { play('close'); closeSheet(); });
    wireActions(sheetEl);
    wireCraftTaps(sheetEl, () => state);
    openModal(sheetEl.querySelector('.vsheet__card'), closeSheet);
  }
  function closeSheet() {
    sheetOpen = null;
    closeModal(sheetEl.querySelector('.vsheet__card'));
    sheetEl.classList.remove('is-in');
    setTimeout(() => { if (!sheetOpen) { sheetEl.hidden = true; sheetEl.innerHTML = ''; } }, 280);
  }

  function detailSheet(id) {
    const b = v.buildingById(id);
    if (!b) return '';
    const ch = b.character;
    const levels = b.def.levels.map((l) => `
      <li class="${l.n <= b.level ? 'is-done' : l.n === b.level + 1 ? 'is-next' : ''}">
        <span class="vlevels__n">${l.n}</span>
        <span class="vlevels__body"><b>${escapeHTML(l.name ?? b.def.name)}</b><small>${escapeHTML(l.n <= b.level ? (l.after ?? l.line) : l.line)}</small></span>
      </li>`).join('');
    const gateBlock = !b.built
      ? `<section class="vsec"><p class="vsec__eyebrow">To build</p><p class="vsec__line">${escapeHTML(b.def.unlock?.line ?? b.def.line)}</p>${costRows(b.cost, b.def.unlock?.standing?.line, b.affordable, b.standing)}${b.ready ? `<button class="vbtn vbtn--gold" data-build="${b.id}">Build it</button>` : ''}</section>`
      : b.next
        ? `<section class="vsec"><p class="vsec__eyebrow">Level ${b.level} → ${b.next.n}: ${escapeHTML(b.next.name)}</p><p class="vsec__line">${escapeHTML(b.next.line)}</p>${costRows(b.cost, b.next.standing?.line, b.affordable, b.standing)}${b.ready ? `<button class="vbtn vbtn--gold" data-raise="${b.id}">Raise it</button>` : `<p class="vsec__hint">${b.standing ? `Short ${escapeHTML(bagText(b.missing))}. Orders pay coins.` : 'Not yet. The standing comes from learning here.'}</p>`}</section>`
        : `<section class="vsec"><p class="vsec__eyebrow">Level ${b.level}</p><p class="vsec__line">${escapeHTML(b.current?.after ?? b.current?.line ?? '')} There is nothing higher to build here — yet.</p></section>`;
    return `
      <button class="vsheet__close" data-close aria-label="Close">×</button>
      <header class="vsheet__head">
        <span class="vsheet__art">${b.built && b.def.art ? artIMG('building', { id: b.def.art, level: b.level }, { size: 80 }) : b.def.art ? artIMG('scaffold', { stage: 0 }, { size: 80 }) : icon('road', { size: 56 })}</span>
        <div>
          <p class="vsheet__eyebrow">${escapeHTML(b.def.skill ?? (b.def.kind === 'home' ? 'Home' : b.def.kind === 'market' ? 'Orders' : 'Challenge'))}${b.built ? ` · level ${b.level}` : ' · not built'}</p>
          <h2 class="vsheet__name">${escapeHTML(b.def.name)}</h2>
          ${b.good && b.built ? `<p class="vsheet__stock">${goodIcon(b.good.key, { size: 16 })}<b>${b.stock}</b> ${escapeHTML(b.stock === 1 ? b.good.one : b.good.name)} in the barn${b.wantedHere ? ` · ${b.wantedHere} wanted` : ''}</p>` : ''}
        </div>
      </header>
      <p class="vsec__line">${escapeHTML(b.def.line)}</p>
      ${b.built && b.helper ? `<p class="vsec__hint">${escapeHTML(ch?.name ?? 'The worker')} makes a ${escapeHTML(b.raw.one)} every ${Math.round(b.helper.every / 3600e3)} hours on their own while the shelf has room (${b.helper.cap} at most). ${b.helper.room ? `Next in ${fmtWait(b.helper.nextIn)}.` : 'The shelf is full: collect first.'}</p>` : ''}
      ${gateBlock}
      <section class="vsec"><p class="vsec__eyebrow">Levels</p><ul class="vlevels">${levels}</ul></section>
      ${b.id === 'hearth' ? `<section class="vsec vsec--links"><a class="vlink" href="#/world/place/hearth?you=1">${icon('scroll', { size: 20 })}<span><b>Your standing</b><small>Stars, streaks, records</small></span></a><a class="vlink" href="#/growth">${icon('sprout', { size: 20 })}<span><b>Growth</b><small>How you are getting stronger</small></span></a></section>` : ''}
      ${b.built && b.def.place && b.def.kind === 'learn' ? `<p class="vsheet__foot"><a href="#/world/place/${b.def.place}" data-go="${b.id}">Everything at ${escapeHTML(b.def.name)} →</a></p>` : ''}`;
  }

  function barnSheet() {
    const rows = [...bagEntries(v.stock).filter((e) => e.key === 'coins'), ...v.buildings.filter((b) => b.good && b.built).map((b) => ({ ...b.good, amount: b.stock, maker: b }))];
    return `
      <button class="vsheet__close" data-close aria-label="Close">×</button>
      <header class="vsheet__head"><span class="vsheet__art">${artIMG('crate', { kind: 'books' }, { size: 60 })}</span><div><p class="vsheet__eyebrow">In the barn</p><h2 class="vsheet__name">Your goods</h2></div></header>
      <div class="barn">
        ${rows.map((e) => `
          <button class="barn__row craft" data-craft="${e.key}">
            ${goodIcon(e.key, { size: 28 })}<span><b>${e.amount}</b> ${escapeHTML(e.amount === 1 && e.key !== 'coins' ? e.one : e.name)}<small>${escapeHTML(e.key === 'coins' ? 'Orders pay coins. Coins build.' : `${e.maker.character?.name ?? ''} makes them at ${e.maker.def.name} from ${e.maker.raw.name}`)}</small></span>
          </button>`).join('')}
      </div>
      <section class="vsec"><p class="vsec__eyebrow">Wanted on the board</p><div class="vorders">${v.orders.map((o) => orderRow(o)).join('')}</div></section>`;
  }

  function nameSheet() {
    const ideas = nameSuggestions();
    return `
      <form class="vsign" id="vsign">
        <p class="vsheet__eyebrow">Your village</p>
        <label class="vsign__label" for="valley-name">Name this village</label>
        <input class="vsign__input" id="valley-name" name="valley" type="text" maxlength="28" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="…" />
        <div class="vsign__ideas">${ideas.map((n) => `<button type="button" class="vsign__idea" data-n="${escapeHTML(n)}">${escapeHTML(n)}</button>`).join('')}</div>
        <button class="vbtn vbtn--gold" id="sign-go" type="submit" disabled>That’s the one</button>
      </form>`;
  }

  function wireActions(root) {
    for (const el of root.querySelectorAll('[data-deliver]')) el.addEventListener('click', () => deliver(el.dataset.deliver));
    for (const el of root.querySelectorAll('[data-collect]')) el.addEventListener('click', () => collect(el.dataset.collect));
    for (const el of root.querySelectorAll('[data-build]')) el.addEventListener('click', () => build(el.dataset.build, false));
    for (const el of root.querySelectorAll('[data-raise]')) el.addEventListener('click', () => build(el.dataset.raise, true));
    for (const el of root.querySelectorAll('[data-plot]')) el.addEventListener('click', () => openPlot(el.dataset.plot));
    for (const el of root.querySelectorAll('[data-house]')) el.addEventListener('click', () => buildHouse(Number(el.dataset.house)));
    for (const el of root.querySelectorAll('[data-go]')) el.addEventListener('click', () => { sessionStorage.setItem('world:focus', el.dataset.go); play('open'); });
    for (const el of root.querySelectorAll('[data-sheet]')) el.addEventListener('click', () => { play('open'); closePop(); openSheet(detailSheet(el.dataset.sheet), el.dataset.sheet); });
    for (const el of root.querySelectorAll('[data-open]')) el.addEventListener('click', () => { play('tap'); closeSheet(); lookAt(el.dataset.open); openPop(el.dataset.open); });
    const form = root.querySelector('#vsign');
    if (form) {
      const input = form.querySelector('#valley-name'), go = form.querySelector('#sign-go');
      setTimeout(() => input.focus({ preventScroll: true }), 300);
      const sync = () => { go.disabled = !cleanValleyName(input.value); };
      input.addEventListener('input', sync);
      for (const b of form.querySelectorAll('.vsign__idea')) b.addEventListener('click', () => { input.value = b.dataset.n; sync(); play('tap'); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = cleanValleyName(input.value);
        if (!name) return;
        play('correct');
        valley = await saveValley(storage, { name });
        closeSheet();
        step = onboardingStep(v, state, valley);
        renderHud(); renderCallouts();
        scene.wick?.celebrate?.();
        await wickSays(NAMING.after(name));
      });
    }
  }

  function lookAt(id) {
    const a = anchorOf(id);
    renderer.lookAt(a.x, a.y - 20, { zoom: Math.max(renderer.cam.zoom, homeZoom()), duration: 650 });
  }

  function onTap(w) {
    if (step === 'meet' || wickEl.classList.contains('is-tap') || performance.now() < tapGuardUntil) return;
    const hit = scene.hit(w.x, w.y);
    if (!hit) { if (popOpen) { closePop(); play('close'); } return; }
    play('tap');
    if (hit.kind === 'wick') { openPop('wick'); return; }
    if (hit.kind === 'person') { openPop(`nb:${hit.id}`); return; }
    if (hit.kind === 'board') { lookAt('board'); openPop('board'); return; }
    if (hit.kind === 'building') { const b = v.buildingById(hit.id); if (b?.queue?.ready > 0 && step !== 'collect') { collect(hit.id); return; } lookAt(hit.id); openPop(hit.id); return; }
    if (hit.kind === 'plot') { openPop(`plot:${hit.id}`); return; }
    if (hit.kind === 'house') { openPop(hit.id); return; }
    if (hit.kind === 'neighbour') { openPop(`nb:${hit.id}`); }
  }

  /* ================= Flights: goods and coins on the move ================= */
  const flyers = outlet.querySelector('#vflyers');
  /** Fly `n` icons of `key` from a screen point to another, staggered; `pop` lifts them out first. */
  function fly(key, n, from, to, { delay = 0, onArrive, pop = false, stagger = 80 } = {}) {
    const count = Math.min(8, Math.max(1, n));
    for (let k = 0; k < count; k += 1) {
      const dot = document.createElement('i');
      dot.className = `vflyer craft--${key}${pop ? ' vflyer--pop' : ''}`;
      dot.innerHTML = goodIcon(key === 'coin' ? 'coins' : key, { size: 24 });
      const ox = (Math.random() - 0.5) * 30, oy = (Math.random() - 0.5) * 20;
      dot.style.left = `${from.x + ox}px`;
      dot.style.top = `${from.y + oy}px`;
      dot.style.setProperty('--tx', `${to.x - from.x - ox}px`);
      dot.style.setProperty('--ty', `${to.y - from.y - oy}px`);
      dot.style.setProperty('--px', `${(k - count / 2) * 10}px`);
      dot.style.setProperty('--py', `${-30 - Math.random() * 14}px`);
      dot.style.animationDelay = `${delay + k * stagger}ms`;
      flyers.appendChild(dot);
      setTimeout(() => dot.remove(), delay + k * stagger + 1200);
    }
    setTimeout(() => onArrive?.(), delay + count * stagger + (pop ? 1000 : 880));
  }
  function sparkle(at, n = 10, color = '#FFE07A') {
    for (let i = 0; i < n; i += 1) {
      const s = document.createElement('i');
      s.className = 'vspark';
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = 30 + Math.random() * 40;
      s.style.left = `${at.x}px`; s.style.top = `${at.y}px`; s.style.background = i % 3 ? color : '#FFFFFF';
      s.style.setProperty('--dx', `${Math.cos(a) * d}px`); s.style.setProperty('--dy', `${Math.sin(a) * d - 20}px`);
      flyers.appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
  }
  const screenOf = (id, name = null) => { const a = name ? scene.pointOf(id, name) : anchorOf(id); const s = renderer.toScreen(a.x, a.y - (name ? 10 : 30)); return { x: s.x, y: s.y }; };
  const pillPoint = (sel) => { const el = hud.querySelector(sel); if (!el) return { x: renderer.cssW - 40, y: 40 }; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  function bump(sel) { const el = hud.querySelector(sel); if (!el) return; el.classList.add('is-hit'); setTimeout(() => el.classList.remove('is-hit'), 700); }

  /* ================= The clock: refresh when something finishes ================= */
  let clockTimer = 0;
  function scheduleClock() {
    clearTimeout(clockTimer);
    const soon = v.working.map((b) => b.queue.working.readyAt).sort((a, b) => a - b)[0];
    if (!soon) return;
    clockTimer = setTimeout(async () => {
      if (!canvas.isConnected) return;
      const before = v;
      await refresh({ focus: v.tip?.building ?? null, quiet: true });
      // Something just finished: the worker puts it on the shelf.
      for (const b of v.collectable) {
        const was = before.buildingById(b.id)?.queue?.ready ?? 0;
        if (b.queue.ready > was) { play('ink'); scene.workers.get(b.id)?.cheer?.(1400); sparkle(screenOf(b.id, 'shelf'), 8); }
      }
      if (step === 'collect') { setTimeout(() => wickSays(STEP_LINES.collect), 600); scene.wick?.call?.([anchorOf('reading').x - 60, anchorOf('reading').y + 40]); }
      // A popover on that building refreshes its strip.
      if (popOpen && v.buildingById(popOpen)) { const html = popHTML(popOpen); const card = popEl.querySelector('.vpop__card'); if (card) { card.innerHTML = `${html}<button class="vpop__close" data-close aria-label="Close">×</button>`; wireActions(popEl); for (const el of popEl.querySelectorAll('[data-close]')) el.addEventListener('click', () => { play('close'); closePop(); }); } }
    }, Math.max(150, soon - Date.now() + 120));
  }
  let leftTimer = setInterval(() => { for (const el of popEl.querySelectorAll('[data-left]')) { const b = v.buildingById(el.dataset.left); if (b?.queue?.working) el.textContent = fmtSecs(b.queue.working.readyAt - Date.now()); } for (const el of popEl.querySelectorAll('[data-ring]')) { const b = v.buildingById(el.dataset.ring); if (b?.queue?.working) { const w = b.queue.working; el.style.setProperty('--p', `${Math.round(Math.max(0, Math.min(1, 1 - (w.readyAt - Date.now()) / (w.readyAt - w.startedAt))) * 100)}%`); } } }, 1000);

  /* ================= Actions ================= */
  async function refresh({ focus = null, quiet = false } = {}) {
    try {
      world = await loadWorld(storage);
      state = world.state; v = state.village;
    } catch { return; }
    if (!canvas.isConnected) return;
    // Carry the living village across the rebuild: see scene.js's lifeKey.
    // Without this every collect, every delivery and every craft-ready tick
    // teleported all the walkers and animals back to their seeded starts.
    scene = buildVillageScene(state, state.atmo, {
      focus: focus ?? v.tip?.building ?? null,
      carryLife: scene?.life, carryLifeKey: scene?.lifeKey,
    });
    renderer.setScene(scene);
    step = onboardingStep(v, state, valley);
    renderHud(); renderCallouts();
    scheduleClock();
    if (!quiet && sheetOpen && sheetOpen !== 'name') { const html = sheetOpen === 'barn' ? barnSheet() : detailSheet(sheetOpen); sheetEl.querySelector('.vsheet__card').innerHTML = html; wireActions(sheetEl); for (const el of sheetEl.querySelectorAll('[data-close]')) el.addEventListener('click', () => { play('close'); closeSheet(); }); }
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
    closePop(); closeSheet();
    play('quest');
    const nb = scene.neighbours.get(o.giver.id);
    const who = nb?.visible ? renderer.toScreen(nb.at.x, nb.at.y - 30) : screenOf('board');
    // The goods go from the barn to the person asking; the coins come back.
    let delay = 0;
    for (const e of goodEntries(o.needs)) { fly(e.key, e.amount, pillPoint('#vbarn'), who, { delay }); delay += 260; }
    setTimeout(() => { nb?.thank?.(); scene.wick?.celebrate?.(1800); sparkle(who, 12); play('place'); fly('coins', Math.min(6, Math.ceil(o.pay / 20)), who, pillPoint('#vcoins'), { onArrive: () => { bump('#vcoins'); play('ink'); } }); }, delay + 800);
    notice(`<b>${escapeHTML(o.giver.name)}</b> has ${escapeHTML(needsText(o.needs))} ${escapeHTML(o.reason)}. ${chips({ coins: o.pay }, { sign: '+' })}`);
    await wait(delay + 1700);
    await refresh({ focus: 'board' });
    busy = false;
    if (step === 'build') { await wait(500); wickSays(STEP_LINES.build); lookAt('garden'); }
  }

  async function collect(id) {
    if (busy) return;
    const b = v.buildingById(id);
    const n = b?.queue?.ready ?? 0;
    if (!n) return;
    busy = true;
    try {
      await storage.put(STORES.LEARNING, { id: `vcollect:${id}:${Date.now()}`, kind: 'village-collect', module: 'village', building: id, good: b.good.key, amount: n, at: new Date().toISOString() });
    } catch (err) { console.error('[CAT OS] collect failed', err); busy = false; return; }
    closePop();
    play('place');
    const from = screenOf(id, 'shelf');
    sparkle(from, 8);
    scene.workers.get(id)?.cheer?.(1600);
    fly(b.good.key, n, from, pillPoint('#vbarn'), { pop: true, stagger: 110, onArrive: () => { bump('#vbarn'); play('ink'); } });
    notice(`${chips({ [b.good.key]: n }, { sign: '+' })} ${escapeHTML(b.character?.name ?? 'The worker')} put ${n === 1 ? 'it' : 'them'} in the barn.`);
    await wait(700 + n * 110);
    await refresh({ focus: id });
    busy = false;
    if (step === 'deliver') { await wait(300); wickSays(STEP_LINES.deliver); lookAt('board'); }
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
    closePop(); closeSheet();
    await construct(id, name, after, b.cost, null, { w: b.def.hit.w - 40, wallH: 40, raise });
    await refresh({ focus: id });
    popIn(id);
    scene.workers.get(id)?.cheer?.(3000);
    scene.wick?.celebrate?.(2400);
    busy = false;
    if (step === 'name') { await wait(900); wickSays(NAMING.ask); await wait(400); openSheet(nameSheet(), 'name'); }
    else { const nb = v.buildingById(id); const ch = nb?.character; if (ch?.asks?.length && !raise) wickSays(`${ch.name}, ${ch.role}, has moved in. ${ch.asks[1] ?? ch.asks[0]}`); else wickSays(builtLine(name)); }
  }

  async function openPlot(id) {
    if (busy) return;
    const p = v.plotViews.find((x) => x.id === id);
    if (!p?.ready) return;
    busy = true;
    try { await storage.put(STORES.LEARNING, { id: `vplot:${id}`, kind: 'village-plot', module: 'village', plot: id, cost: p.def.cost, at: new Date().toISOString() }); }
    catch (err) { console.error('[CAT OS] plot failed', err); busy = false; return; }
    closePop();
    await construct(`plot:${id}`, p.def.name, p.def.after, p.def.cost, p.def.at, { w: Math.min(120, p.def.rect.w - 40), wallH: 24, light: true });
    await refresh();
    scene.wick?.celebrate?.(2000);
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
    closePop();
    await construct(`house:${n}`, h.name, h.after, h.cost, h.at, { w: 70, wallH: 32 });
    await refresh();
    scene.wick?.celebrate?.(2000);
    busy = false;
    wickSays(h.after);
  }

  /**
   * Materials arrive, the site is cleared, the frame goes up, the walls
   * rise under a builder's hammer, dust flies, and the new thing settles
   * into place. Lightweight, and never longer than three seconds.
   */
  async function construct(id, name, afterLine, cost, at = null, { w = 90, wallH = 40, light = false, raise = false } = {}) {
    const a = at ?? anchorOf(String(id).replace(/^plot:|^house:/, '')) ?? HOME;
    const site = at ? { x: a.x, y: a.y } : (buildingById(id)?.at ?? a);
    await renderer.lookAt(site.x, site.y - 40, { zoom: Math.max(renderer.cam.zoom, homeZoom() * 1.1), duration: 600 });
    const sitePt = renderer.toScreen(site.x, site.y - 30);
    fly('coins', Math.min(6, Math.ceil((cost?.coins ?? 0) / 40)), pillPoint('#vcoins'), sitePt, { onArrive: () => bump('#vcoins') });
    for (const e of goodEntries(cost ?? {})) fly(e.key, e.amount, pillPoint('#vbarn'), sitePt, { delay: 200 });
    play('build');
    const total = reduce ? 500 : light ? 1800 : 2800;
    const t0 = performance.now();
    const puffs = [];
    const builder = { ...(CHARACTERS.bo.look), hat: 'cap', top: '#B57B48', apron: '#7F5331', prop: 'hammer' };
    const prevObjects = scene.objects.bind(scene);
    const hidden = new Set([id]);
    scene.objects = (view, t) => {
      const list = prevObjects(view, t).filter((o) => !(raise && o.building && hidden.has(o.building)));
      const p = Math.min(1, (performance.now() - t0) / total);
      const stage = p < 0.3 ? 0 : p < 0.66 ? 1 : 2;
      const fade = p > 0.9 ? 1 - (p - 0.9) / 0.1 : 1;
      list.push({ x: site.x, y: site.y + 2, z: 50, art: art('scaffold', { w, d: Math.round(w * 0.48), wallH, stage }), alpha: fade });
      if (p > 0.08 && p < 0.95) list.push({ x: site.x + w / 2 + 14, y: site.y + 10, z: 60, art: art('person', { ...builder, pose: 'work', frame: Math.floor(t / 300) % 4 }), flip: true });
      if (puffs.length < 12 && Math.random() < 0.3 && p < 0.9) puffs.push({ x: site.x + (Math.random() - 0.5) * w, y: site.y + 4, t: 0 });
      for (const q of puffs) q.t += 16;
      for (const q of puffs) if (q.t < 1300) list.push({ x: q.x, y: q.y - q.t * 0.02, z: 60, alpha: 0.75 * (1 - q.t / 1300), art: art('dust', { size: 1 + Math.round((q.t / 500) * 2) / 2 }) });
      return list;
    };
    for (let i = 0; i < (reduce ? 1 : 6); i += 1) setTimeout(() => play('tick'), 400 + i * 380);
    notice(`<b>${escapeHTML(name)}</b> — ${escapeHTML(afterLine ?? '')}`, null);
    await wait(total);
    play('unlock');
    sparkle(renderer.toScreen(site.x, site.y - 50), 16);
  }

  /** The new building settles in with a little bounce. */
  function popIn(id) {
    if (reduce) return;
    const obj = scene.objects({ x: -1e9, y: -1e9, w: 3e9, h: 3e9 }, 0).find((o) => o.building === id);
    if (!obj) return;
    const t0 = performance.now();
    const tick = () => { const p = Math.min(1, (performance.now() - t0) / 480); const s = p < 0.5 ? 0.9 + p * 0.3 : 1.05 - (p - 0.5) * 0.1; obj.scale = p >= 1 ? undefined : s; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  /* ================= Arrival ================= */
  renderHud(); renderCallouts();
  renderer.start();
  scheduleClock();

  if (step === 'meet') {
    await intro();
  } else if (focusId) {
    const a = anchorOf(focusId);
    renderer.cam.zoom = homeZoom();
    renderer.lookAt(a.x, a.y - 20, { animate: false });
    if (earnedRaw) {
      try {
        const bagObj = JSON.parse(earnedRaw);
        const entries = goodEntries(bagObj);
        const coinsWon = bagObj.coins ?? 0;
        setTimeout(() => {
          if (!canvas.isConnected) return;
          const from = { x: renderer.cssW / 2, y: renderer.cssH - 90 };
          let delay = 0;
          for (const e of entries) {
            const maker = v.buildings.find((x) => x.raw?.key === e.key)?.id ?? focusId;
            fly(e.key, e.amount, from, screenOf(maker, 'door'), { delay, onArrive: () => { scene.workers.get(maker)?.cheer?.(1400); play('ink'); renderCallouts(); } });
            delay += 400;
          }
          if (coinsWon) fly('coins', Math.min(6, Math.ceil(coinsWon / 20)), from, pillPoint('#vcoins'), { delay, onArrive: () => bump('#vcoins') });
          const made = [...entries.map((e) => chips({ [e.key]: e.amount }, { sign: '+' })), coinsWon ? chips({ coins: coinsWon }, { sign: '+' }) : ''].join(' ');
          setTimeout(() => notice(`${made} ${changeLine ?? ''}`, 'place'), 500);
        }, reduce ? 0 : 700);
      } catch { /* the numbers are already right */ }
    } else if (changeLine) setTimeout(() => notice(changeLine, 'place'), 500);
    if (step === 'binding') setTimeout(() => wickSays(STEP_LINES.binding), reduce ? 600 : 2600);
    else if (step === 'collect') setTimeout(() => wickSays(STEP_LINES.collect), reduce ? 600 : 2600);
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
    await renderer.lookAt(HOME.x, HOME.y + 10, { zoom: homeZoom() * 1.05, duration: reduce ? 300 : 3200, ease: (t) => t * t * (3 - 2 * t) });
    introEl.remove();
    if (!canvas.isConnected) return;
    for (let i = 0; i < OPENING.length; i += 1) {
      if (!canvas.isConnected) return;
      if (i === OPENING.length - 1) renderer.lookAt(anchorOf('reading').x - 50, anchorOf('reading').y, { zoom: homeZoom() * 1.05, duration: 1400 });
      await wickSays(OPENING[i], { tap: true });
    }
    wickEl.classList.remove('is-in', 'is-tap');
    valley = await saveValley(storage, { met_at: new Date().toISOString(), awakened_at: new Date().toISOString() });
    step = onboardingStep(v, state, valley);
    hud.classList.add('is-in');
    // The tap that dismissed Wick's last line also stopped the camera: settle on the Reading House now.
    await renderer.lookAt(anchorOf('reading').x - 30, anchorOf('reading').y + 40, { zoom: homeZoom(), duration: 900 });
    renderCallouts();
    await wait(400);
    wickSays(STEP_LINES['first-read']);
  }

  /* ---- Sound ---- */
  const warmth = Math.min(1, (v.levels.size / 8) * 0.6 + Math.min(1, state.stars / 90) * 0.4);
  const onDown = () => { unlock(); startMusic('world', { hour: state.atmo.hour, warmth }); startAmbience('world', state.atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true });
  startMusic('world', { hour: state.atmo.hour, warmth }); startAmbience('world', state.atmo);
  const onVis = () => { if (document.visibilityState === 'visible' && canvas.isConnected) refresh({ quiet: true }); };
  document.addEventListener('visibilitychange', onVis);

  /* ---- Leave ---- */
  const onHash = () => {
    renderer.destroy();
    cancelAnimationFrame(calloutRaf);
    clearTimeout(clockTimer); clearInterval(leftTimer);
    window.removeEventListener('pointerdown', onDown, { capture: true });
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('hashchange', onHash);
    offMotion?.();
  };
  window.addEventListener('hashchange', onHash);
}

function placeToBuilding(slug) {
  return { 'reading-room': 'reading', meadow: 'garden', pond: 'garden', thicket: 'garden', rootwood: 'roots', terraces: 'roots', loom: 'loom', table: 'loom', bench: 'loom', wilds: 'road', hearth: 'hearth', quarter: 'loom' }[slug] ?? null;
}

export { HOUSE, BOARD, good };
