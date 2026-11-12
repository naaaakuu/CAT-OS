/**
 * intro.js — the Android app's opening: the five-second Nakul Creations
 * video, played over a village that is already loading underneath. Always
 * skippable. It plays on every cold open of the app and never on the web
 * (index.html raises the curtain only where the Android shell is present;
 * localStorage 'catos:intro' = 'on' previews it in a browser, 'off' keeps it
 * away, which is what the gates do).
 *
 * The curtain must never trap a learner: a video that will not start, stalls
 * or errors ends the intro, and so does a learner who asks for less motion.
 * While it plays the village music and the first-visit hello wait
 * (whenIntroDone), so nothing talks over the video's own sound.
 */

import { feedbackPrefs } from '../core/engagement/feedback.js';
import { hushWorld, play } from '../world/audio.js';

const VIDEO = './assets/intro/nakul-creations-portrait.mp4'; // vertical only; a screen of another shape letterboxes it (intro.css)
const START_BY_MS = 4000;  // not playing by now: something is wrong, carry on
const LONGEST_MS = 9000;   // five seconds of video; anything past this is a stall
const LEAVE_MS = 350;      // the curtain's fade, and the sound's

let finished = Promise.resolve();

/** Resolves once the intro is over (at once when there is none). */
export function whenIntroDone() { return finished; }

/**
 * The title card (owner, 2026-11-12: "keep that wild cinematic cat title
 * coming for a few seconds, and then fading away"): CAT OS in gold, letter by
 * letter out of a blur, a laurel wreath growing round it and embers rising,
 * held for a few seconds over the village loading underneath, then pushed
 * past the camera as it fades. It follows the opening video in the app, and
 * opens an installed web app on its own. A tap ends it; less motion skips it;
 * 'catos:title' = 'off' keeps it away, 'on' shows it in any browser.
 */
const TITLE_MS = 3200;  // on screen, before it starts to leave
const TITLE_OUT = 900;  // its exit

function titleWanted() {
  const root = document.documentElement;
  if (root.hasAttribute('data-reduced-motion')) return false;
  let pref = null;
  try { pref = localStorage.getItem('catos:title'); } catch { /* no storage */ }
  if (pref === 'off') return false;
  if (pref === 'on') return true;
  let standalone = false;
  try { standalone = matchMedia('(display-mode: standalone)').matches; } catch { /* old browser */ }
  return root.hasAttribute('data-intro') || standalone;
}

const leaf = (x, y, a, i) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)})"><ellipse class="tc-leaf" style="--i:${i}" rx="9" ry="3.6"/></g>`;
function wreathSVG() {
  let leaves = '';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i += 1) {
      const t = 0.17 + i * 0.07, a = Math.PI / 2 + side * (Math.PI * t * 1.18);
      const x = 180 + Math.cos(a) * 172, y = 125 + Math.sin(a) * 112;
      const deg = (a * 180) / Math.PI + (side > 0 ? -90 : 90) + side * 28;
      leaves += leaf(x, y, deg, i);
      leaves += leaf(x + Math.cos(a) * 10, y + Math.sin(a) * 10, deg - side * 50, i);
    }
  }
  return `<svg class="title-card__wreath" viewBox="0 0 360 250" aria-hidden="true"><defs><linearGradient id="tc-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8"/><stop offset=".55" stop-color="#E9B24A"/><stop offset="1" stop-color="#A86A1C"/></linearGradient></defs><g fill="url(#tc-gold)" stroke="#5a3410" stroke-width=".8">${leaves}</g></svg>`;
}

/** Show the title card; resolves once it has gone. */
export function showTitle() {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'title-card';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'CAT OS');
    const letters = [...'CAT OS'].map((c, i) => (c === ' ' ? '<span class="tc-gap"></span>' : `<span style="--i:${i}">${c}</span>`)).join('');
    const embers = Array.from({ length: 22 }, (_, i) => `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 1.6).toFixed(2)}s;--t:${(2.4 + Math.random() * 1.8).toFixed(2)}s;--s:${(0.6 + Math.random() * 0.9).toFixed(2)}"></i>`).join('');
    el.innerHTML = `<div class="title-card__glow"></div><div class="title-card__embers" aria-hidden="true">${embers}</div>
      <div class="title-card__lockup">${wreathSVG()}<h1 class="title-card__word" data-text="CAT OS">${letters}</h1><p class="title-card__tag">The Muddles are loose. Save the village.</p></div>`;
    document.body.appendChild(el);
    try { play('reveal', { pitch: 3, delay: 0.35 }); } catch { /* silent */ }
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      el.classList.add('is-leaving');
      setTimeout(() => { el.remove(); resolve(); }, TITLE_OUT);
    };
    el.addEventListener('pointerdown', end);
    setTimeout(end, TITLE_MS);
  });
}

/** Raise the intro if index.html asked for it. Call once, after the motion preference is applied. */
export function beginIntro() {
  const root = document.documentElement;
  const curtain = document.getElementById('intro');
  const title = titleWanted();
  if (!root.hasAttribute('data-intro') || !curtain) { if (title) finished = showTitle(); return; }
  // data-reduced-motion is the resolved answer (prefs.js): a learner who asked for less motion gets none.
  if (root.hasAttribute('data-reduced-motion')) { root.removeAttribute('data-intro'); return; }

  let resolve;
  finished = new Promise((r) => { resolve = r; });
  let over = false;
  // Hidden from screen readers while the curtain is up (not `inert`: online-gate.js owns that on #shell).
  const behind = [...document.body.children].filter((el) => el !== curtain && !el.matches('script, noscript, template') && !el.hasAttribute('aria-hidden'));
  for (const el of behind) el.setAttribute('aria-hidden', 'true');
  hushWorld(true);

  const video = document.createElement('video');
  video.className = 'intro__video';
  video.src = VIDEO;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  const p = feedbackPrefs();
  const level = p.music ? p.musicVolume : 0;
  video.muted = level <= 0;
  video.volume = Math.min(1, Math.max(0, level));

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'intro__skip';
  skip.textContent = 'Skip';

  const timers = [];
  const finish = () => {
    if (over) return;
    over = true;
    for (const t of timers) clearTimeout(t);
    curtain.classList.add('is-leaving');
    const fade = setInterval(() => { video.volume = Math.max(0, video.volume - video.volume * 0.35 - 0.001); }, 40);
    setTimeout(() => {
      clearInterval(fade);
      video.pause();
      video.removeAttribute('src');
      video.load();
      curtain.replaceChildren();
      curtain.classList.remove('is-leaving');
      root.removeAttribute('data-intro');
      for (const el of behind) el.removeAttribute('aria-hidden');
      hushWorld(false);
      // The title card follows the video; the village waits for both.
      if (title) showTitle().then(resolve); else resolve();
    }, LEAVE_MS);
  };

  try {
    skip.addEventListener('click', finish);
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    curtain.replaceChildren(video, skip);
    timers.push(setTimeout(() => { if (video.paused || video.currentTime === 0) finish(); }, START_BY_MS));
    timers.push(setTimeout(finish, LONGEST_MS));
    // A browser that refuses sound before a tap still plays the picture.
    video.play().catch(() => { video.muted = true; return video.play(); }).catch(finish);
    skip.focus({ preventScroll: true });
  } catch { finish(); }
}
