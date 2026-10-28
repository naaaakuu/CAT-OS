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
import { hushWorld } from '../world/audio.js';

const VIDEO = './assets/intro/nakul-creations-portrait.mp4'; // vertical only; a screen of another shape letterboxes it (intro.css)
const START_BY_MS = 4000;  // not playing by now: something is wrong, carry on
const LONGEST_MS = 9000;   // five seconds of video; anything past this is a stall
const LEAVE_MS = 350;      // the curtain's fade, and the sound's

let finished = Promise.resolve();

/** Resolves once the intro is over (at once when there is none). */
export function whenIntroDone() { return finished; }

/** Raise the intro if index.html asked for it. Call once, after the motion preference is applied. */
export function beginIntro() {
  const root = document.documentElement;
  const curtain = document.getElementById('intro');
  if (!root.hasAttribute('data-intro') || !curtain) return;
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
      resolve();
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
