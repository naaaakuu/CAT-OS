/**
 * awaken.js (screen) — the first five minutes.
 *
 * A first-time learner does not arrive at a dashboard, a tour, a tier
 * list or a menu of fifty-one root families. They arrive at night, in a
 * valley that has gone dark, and one cat is still holding a lamp.
 *
 * Five beats, and nothing else exists until they are done:
 *
 *   1. HELLO   Wick speaks. The valley is dim; his lamp is the only light.
 *   2. NAME    A sign by the path. The learner names the place.
 *   3. FIRST   One small thing — six words, about a minute.
 *   4. DAWN    The sun comes up over the valley they just named, the
 *              lamps catch, and the crafts they earned fly into a purse
 *              they are seeing for the first time.
 *   5. OPEN    Wick points at the one thing they can now build.
 *
 * The transformation in beat 4 is scripted, not purchased — the learner
 * has not earned a building yet and pretending otherwise would be a lie.
 * What they HAVE earned is real: a real round against the real corpus,
 * real mastery records, real Amber. Beat 5 hands them the loop and gets
 * out of the way.
 */

import { WorldRenderer } from '../engine/canvas.js';
import { buildWorldScene } from '../engine/map.js';
import { sprite } from '../engine/sprites.js';
import { particles } from '../engine/life.js';
import { WORLD_W, WORLD_H, regionBySlug } from '../regions.js';
import { loadWorld, loadWorldRecords, deriveWorldState } from '../state.js';
import { loadField, loadLedger, pickRound, LexRound, saveRound, listFields, loadContext } from '../lexicon.js';
import { EARN, CRAFTS, addBag } from '../economy.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { play, unlock, startMusic, startAmbience, silenceWorld } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';
import {
  WICK, OPENING, NAMING, FIRST_TASK, DAWN,
  loadValley, saveValley, cleanValleyName, nameSuggestions,
} from '../companion.js';

const FIRST_WORDS = 6;
const KEYS = ['A', 'B', 'C', 'D'];

export async function renderAwaken(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');
  silenceWorld();

  let world, valley;
  try {
    [world, valley] = await Promise.all([loadWorld(storage), loadValley(storage)]);
  } catch (err) {
    location.hash = '#/world';
    return;
  }
  // Already welcomed: this screen is not a place you can revisit.
  if (valley.awakened_at) { location.hash = '#/world'; return; }

  const state = world.state;
  const atmo = { ...state.atmo, hour: 'night', weather: 'clear' };
  const scene = buildWorldScene(state, atmo);

  outlet.innerHTML = `
    <section class="awaken" aria-label="Welcome">
      <canvas class="awaken__scene" id="awaken-canvas" aria-hidden="true"></canvas>
      <div class="awaken__sky" id="awaken-sky" aria-hidden="true"></div>
      <div class="awaken__stage" id="awaken-stage"></div>
      <div class="wickbar" id="wickbar" hidden>
        <div class="wickbar__who"><canvas class="wickbar__face" id="wick-face" width="52" height="44" aria-hidden="true"></canvas><span>${WICK.name}</span></div>
        <p class="wickbar__say" id="wick-say" role="status"></p>
        <span class="wickbar__more" id="wick-more" aria-hidden="true">tap to go on</span>
      </div>
      <div class="flyers" id="awaken-flyers" aria-hidden="true"></div>
    </section>`;

  const canvas = outlet.querySelector('#awaken-canvas');
  if (!canvas?.isConnected) return; // navigated away while loading

  const hearth = regionBySlug('hearth');

  /* ---- Wick stands in the world, beside the Hearth ---- */
  const WICK_AT = { x: hearth.anchor.x + 26, y: hearth.anchor.y + 10 };
  let lampLit = true;
  let wickPose = 'sit';
  let blinkUntil = 0;
  const prevObjects = scene.objects.bind(scene);
  scene.objects = (view, t) => {
    const list = prevObjects(view, t);
    if (t > blinkUntil + 3.4) blinkUntil = t;
    const blink = t - blinkUntil < 0.12;
    list.push({
      x: WICK_AT.x, y: WICK_AT.y,
      sprite: sprite('wick', { pose: wickPose, lamp: true, lit: lampLit, blink }),
    });
    return list;
  };

  /* ---- Night, lifting to morning when the valley wakes ---- */
  let dawn = 0; // 0 = the night they arrived in, 1 = full morning
  const prevLight = scene.light?.bind(scene);
  scene.light = (t) => {
    const night = { tint: '#1B2550', strength: 0.76 };
    const day = prevLight ? prevLight(t) : { tint: '#FFFFFF', strength: 0 };
    const e = ease(dawn);
    return {
      tint: dawn < 0.5 ? night.tint : '#FFE9C8',
      strength: night.strength * (1 - e) + (day?.strength ?? 0) * e * 0.4 + (dawn > 0.5 ? 0.2 * (1 - e) : 0),
    };
  };
  const prevLights = scene.lights?.bind(scene);
  scene.lights = (view, t) => {
    const base = dawn > 0.75 ? [] : (prevLights ? prevLights(view, t) : []);
    const out = base.map((l) => ({ ...l, a: (l.a ?? 0.5) * (1 - dawn * 0.8) }));
    if (lampLit) out.push({ x: WICK_AT.x - 12, y: WICK_AT.y - 15, r: 30 + Math.sin(t * 2.2) * 2, a: 0.78 - dawn * 0.5, color: '#FFC873' });
    return out;
  };

  const renderer = new WorldRenderer(canvas, scene, {
    worldW: WORLD_W, worldH: WORLD_H, fit: 'cover', minZoom: 0.42, maxZoom: 4,
    initialZoom: 2.2,
    pannable: false,
  });
  renderer.start();
  // The constructor's resize can land before the canvas has a size; the
  // observer's second pass would then reset the camera. Frame the opening
  // once layout has actually happened, and remember it as the home shot.
  const FRAME = { x: WICK_AT.x - 4, y: WICK_AT.y - 26, zoom: 2.4 };
  const frameOpening = () => {
    renderer.cam.zoom = renderer.snap(FRAME.zoom);
    renderer.lookAt(FRAME.x, FRAME.y, { animate: false });
  };
  frameOpening();
  requestAnimationFrame(() => { frameOpening(); requestAnimationFrame(frameOpening); });

  /* ---- Wick's little portrait in the speech bar ---- */
  drawFace(outlet.querySelector('#wick-face'));

  const stage = outlet.querySelector('#awaken-stage');
  const bar = outlet.querySelector('#wickbar');
  const say = outlet.querySelector('#wick-say');
  const more = outlet.querySelector('#wick-more');

  let sayTimer = 0;
  /** Wick says one line, typed on, and resolves when it has finished. */
  function speak(line, { pose = 'sit', wait = true } = {}) {
    wickPose = pose;
    bar.hidden = false;
    requestAnimationFrame(() => bar.classList.add('is-in'));
    more.style.opacity = '0';
    clearTimeout(sayTimer);
    say.textContent = '';
    say.classList.remove('is-in');
    requestAnimationFrame(() => { say.textContent = line; say.classList.add('is-in'); });
    play('tap');
    if (!wait) return Promise.resolve();
    return new Promise((resolve) => {
      sayTimer = setTimeout(() => { more.style.opacity = '1'; }, 900);
      const go = (e) => {
        if (e.target.closest('button, input, a')) return;
        window.removeEventListener('pointerdown', go);
        resolve();
      };
      setTimeout(() => window.addEventListener('pointerdown', go), 260);
    });
  }

  const gone = () => !canvas.isConnected;

  /* ================= Beat 1 — hello ================= */
  try { await unlock(); } catch { /* audio stays off */ }
  startMusic('world', { hour: 'night', warmth: 0 });
  startAmbience('world', atmo);

  await wait(600);
  if (gone()) return;
  for (let i = 0; i < OPENING.length; i += 1) {
    if (gone()) return;
    await speak(OPENING[i], { pose: i === 0 || i === OPENING.length - 1 ? 'look' : 'sit' });
    if (i === 2) renderer.lookAt(WORLD_W / 2, 400, { zoom: renderer.snap(0.95), duration: 2600 });
    if (i === 3) await wait(300);
    if (i === 3) renderer.lookAt(FRAME.x, FRAME.y, { zoom: renderer.snap(FRAME.zoom), duration: 2000 });
  }
  if (gone()) return;

  /* ================= Beat 2 — name it ================= */
  await speak(NAMING.ask, { pose: 'look', wait: false });
  const chosen = await askName(stage);
  if (gone()) return;
  const name = cleanValleyName(chosen) || 'Wick’s Hollow';
  await saveValley(storage, { name });
  stage.innerHTML = '';
  play('unlock');
  await speak(NAMING.after(name), { pose: 'look' });
  if (gone()) return;

  /* ================= Beat 3 — one small thing ================= */
  await speak(FIRST_TASK.offer, { pose: 'sit' });
  if (gone()) return;
  bar.classList.remove('is-in');
  const earned = await firstLight(stage, storage, outlet);
  if (gone()) return;
  stage.innerHTML = '';

  /* ================= Beat 4 — dawn ================= */
  await wait(260);
  bar.hidden = false;
  bar.classList.add('is-in');
  await speak(FIRST_TASK.after, { pose: 'look', wait: false });
  renderer.lookAt(WORLD_W / 2, WORLD_H * 0.5, { zoom: renderer.snap(0.95), duration: 4200 });
  play('build');

  const sky = outlet.querySelector('#awaken-sky');
  sky.classList.add('is-dawn');
  let painted = 'night';
  await animate(3600, (p) => {
    dawn = p;
    // The whole world follows the land: sky beyond the ridge, and the map's
    // own baked sky, repainted twice as the light turns.
    const hr = p < 0.3 ? 'night' : p < 0.68 ? 'dawn' : 'morning';
    scene.hour = hr;
    if (hr !== painted) {
      painted = hr;
      scene.atmo = { ...atmo, hour: hr };
      renderer.invalidateTerrain();
    }
  });
  if (gone()) return;
  lampLit = false;
  startMusic('world', { hour: 'morning', warmth: 0.2 });
  startAmbience('world', { ...atmo, hour: 'morning' });
  burst(scene, WORLD_W / 2, WORLD_H * 0.5, 46);

  // The crafts they actually earned, arriving.
  flyCrafts(outlet, earned);
  await wait(700);
  if (gone()) return;

  for (const line of DAWN) { if (gone()) return; await speak(line, { pose: 'look' }); }

  /* ================= Beat 5 — hand over the loop ================= */
  let after = null;
  try { after = deriveWorldState(world.content, await loadWorldRecords(storage)); } catch { /* the valley still opens */ }
  const ready = after?.readyWorks?.[0] ?? null;
  await saveValley(storage, { awakened_at: new Date().toISOString() });

  if (gone()) return;
  await speak(ready
    ? `A ${lower(ready.name)} — you’ve got enough for it. Come and see.`
    : 'Go anywhere you like. It all runs to the same place.', { pose: 'look', wait: false });

  stage.innerHTML = `
    <div class="awaken__done">
      <p class="awaken__eyebrow">Your valley</p>
      <p class="awaken__named">${escapeHTML(name)}</p>
      <a class="g-cta" id="awaken-go" href="${ready ? '#/world/place/hearth?works=1' : '#/world'}">
        ${ready ? `Build ${escapeHTML(article(ready.name))}` : 'Go in'}<span class="arrow" aria-hidden="true">→</span></a>
      ${ready ? `<a class="awaken__skip" href="#/world">Look around first</a>` : ''}
    </div>`;
  requestAnimationFrame(() => stage.querySelector('.awaken__done')?.classList.add('is-in'));
  stage.querySelector('#awaken-go').addEventListener('click', () => play('open'));

  const onHash = () => { renderer.destroy?.(); window.removeEventListener('hashchange', onHash); };
  window.addEventListener('hashchange', onHash);
}

/* ------------------------------------------------------------------ */
/* Beat 2 — the sign                                                   */
/* ------------------------------------------------------------------ */

function askName(stage) {
  return new Promise((resolve) => {
    const ideas = nameSuggestions();
    stage.innerHTML = `
      <form class="sign" id="sign">
        <p class="sign__post" aria-hidden="true"></p>
        <label class="sign__label" for="valley-name">Name this valley</label>
        <input class="sign__input" id="valley-name" name="valley" type="text" maxlength="28"
               autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="…" />
        <div class="sign__ideas">${ideas.map((n) => `<button type="button" class="sign__idea" data-n="${escapeHTML(n)}">${escapeHTML(n)}</button>`).join('')}</div>
        <button class="g-cta" id="sign-go" type="submit" disabled>That’s the one<span class="arrow" aria-hidden="true">→</span></button>
      </form>`;
    const form = stage.querySelector('#sign');
    const input = stage.querySelector('#valley-name');
    const go = stage.querySelector('#sign-go');
    requestAnimationFrame(() => form.classList.add('is-in'));
    setTimeout(() => input.focus({ preventScroll: true }), 420);
    const sync = () => { go.disabled = !cleanValleyName(input.value); };
    input.addEventListener('input', sync);
    for (const b of stage.querySelectorAll('.sign__idea')) {
      b.addEventListener('click', () => { input.value = b.dataset.n; sync(); play('tap'); input.focus({ preventScroll: true }); });
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = cleanValleyName(input.value);
      if (!v) return;
      play('correct');
      form.classList.remove('is-in');
      setTimeout(() => resolve(v), 260);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Beat 3 — six words                                                  */
/* ------------------------------------------------------------------ */

/**
 * The first task. Deliberately six words, not twelve: long enough to be
 * a real round against the real corpus, short enough that nobody quits
 * inside it. It writes real mastery records, so the Meadow genuinely
 * remembers these words tomorrow.
 * @returns {Promise<object>} the craft bag earned, for the flight home
 */
async function firstLight(stage, storage, outlet) {
  let round, ledger;
  try {
    const [fields, led, ctx] = await Promise.all([
      listFields('meadow'), loadLedger(storage), loadContext().catch(() => null),
    ]);
    ledger = led;
    // The most useful words in the language, first: the high-frequency band.
    const field = fields.find((f) => f.group === 'high') ?? fields[0];
    const bundle = await loadField('meadow', field.id);
    const entries = pickRound(bundle.entries, ledger, Date.now(), FIRST_WORDS, `first:${Date.now()}`);
    round = new LexRound({
      region: 'meadow',
      picks: entries.map((e) => ({ entry: e, bundle, status: 'new' })),
      context: ctx,
    });
  } catch {
    return { amber: 0, ink: 0, thread: 0, ember: 0 };
  }

  return new Promise((resolve) => {
    let locked = false;

    const show = () => {
      const q = round.current;
      round.markShown();
      locked = false;
      stage.innerHTML = `
        <div class="firstlight" id="fl">
          <div class="firstlight__dots" aria-hidden="true">${round.picks.map((_, i) => `<i class="${i < round.index ? 'is-done' : i === round.index ? 'is-now' : ''}"></i>`).join('')}</div>
          ${q.wordShown ? `<h2 class="firstlight__word">${escapeHTML(q.stem)}</h2>` : `<p class="firstlight__sentence">${escapeHTML(q.stem)}</p>`}
          <p class="firstlight__ask">${escapeHTML(q.ask)}</p>
          <div class="firstlight__options" id="fl-opts">
            ${q.options.map((o, i) => `<button class="vopt" data-i="${i}"><span class="key" aria-hidden="true">${KEYS[i] ?? ''}</span><span>${escapeHTML(o.text)}</span></button>`).join('')}
          </div>
          <p class="firstlight__note" id="fl-note"></p>
        </div>`;
      requestAnimationFrame(() => stage.querySelector('#fl')?.classList.add('is-in'));
      stage.querySelector('#fl-opts').addEventListener('click', (e) => {
        const btn = e.target.closest('.vopt');
        if (!btn || locked) return;
        locked = true;
        const i = Number(btn.dataset.i);
        const verdict = round.answer(i);
        const opts = stage.querySelectorAll('.vopt');
        opts.forEach((b, j) => {
          b.disabled = true;
          if (j === verdict.correctIndex) b.classList.add('is-correct');
          else if (j === i) b.classList.add('is-wrong');
          else b.classList.add('is-dim');
        });
        const note = stage.querySelector('#fl-note');
        if (verdict.correct) {
          play('correct');
          note.textContent = ['Yes.', 'That’s it.', 'Right.', 'Good.'][round.index % 4];
          note.className = 'firstlight__note is-right';
        } else {
          play('wrong');
          const right = q.options[verdict.correctIndex]?.text ?? '';
          note.innerHTML = `It’s <b>${escapeHTML(right)}</b>. That’s the useful kind of wrong.`;
          note.className = 'firstlight__note is-wrong';
        }
        setTimeout(() => { if (round.next()) show(); else done(); }, verdict.correct ? 760 : 1900);
      });
    };

    async function done() {
      const result = round.finish();
      try { await saveRound(storage, round, result, ledger); } catch { /* the moment still lands */ }
      // The valley's own welcome, recorded once so it derives like everything
      // else: enough, with a decent first round, to afford the first work.
      const welcome = { amber: 34, ink: 0, thread: 0, ember: 0 };
      try {
        await storage.put(STORES.LEARNING, {
          id: 'quest:first-light', kind: 'world-quest', module: 'world',
          quest_id: 'first-light', date: new Date().toISOString().slice(0, 10),
          paid: welcome, claimed_at: new Date().toISOString(),
        });
      } catch { /* non-fatal */ }
      stage.innerHTML = '';
      resolve(addBag(result.earned, welcome));
    }

    show();
  });
}

/* ------------------------------------------------------------------ */
/* Bits                                                                */
/* ------------------------------------------------------------------ */

function drawFace(el) {
  if (!el) return;
  const ctx = el.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const s = sprite('wick', { pose: 'look', lamp: false, lit: true });
  
  ctx.clearRect(0, 0, el.width, el.height);
  // Head and shoulders only: the bar is small, and his face is the point.
  ctx.drawImage(s.canvas, 8, 0, 14, 13, 5, 3, 14 * 3, 13 * 3);
}

function burst(scene, x, y, count) {
  const sys = particles({ kind: 'sparkle', rect: { x: x - 120, y: y - 150, w: 240, h: 300 }, count, seed: `dawn${Date.now()}` });
  const prev = scene.objects.bind(scene);
  let alive = true;
  scene.objects = (view, t) => { const o = prev(view, t); if (alive) o.push({ x: 0, y: 400000, draw: (c) => sys.draw(c, t) }); return o; };
  setTimeout(() => { alive = false; }, 3400);
}

function flyCrafts(outlet, bag) {
  const flyers = outlet.querySelector('#awaken-flyers');
  if (!flyers) return;
  let i = 0;
  for (const c of CRAFTS) {
    const n = bag?.[c.key] ?? 0;
    if (!n) continue;
    for (let k = 0; k < Math.min(6, Math.max(2, Math.round(n / 10))); k += 1) {
      const dot = document.createElement('i');
      dot.className = `flyer craft--${c.key}`;
      dot.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 140}px`;
      dot.style.top = `${window.innerHeight * 0.62 + (Math.random() - 0.5) * 80}px`;
      dot.style.setProperty('--tx', `${-window.innerWidth / 2 + 70 + (Math.random() - 0.5) * 30}px`);
      dot.style.setProperty('--ty', `${-window.innerHeight * 0.62 + 74}px`);
      dot.style.animationDelay = `${i * 90 + k * 55}ms`;
      flyers.appendChild(dot);
      setTimeout(() => dot.remove(), 2200 + i * 90);
    }
    i += 1;
  }
}

const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lower = (s) => String(s).replace(/^A /, '').replace(/^The /, '').toLowerCase();
/** 'A chimney' → 'a chimney', so a button reads as a sentence. */
const article = (s) => String(s).charAt(0).toLowerCase() + String(s).slice(1);

function animate(ms, step) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      step(p);
      if (p < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}
