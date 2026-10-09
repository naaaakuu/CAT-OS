/**
 * rewarded.js — the one door a rewarded video opens.
 *
 * In the Android app (android/, core/native.js) the full explanation of an
 * answer sits behind one short video the learner chooses to watch: why the
 * pick tempted them, why the answer holds, every other option, the mentor's
 * lesson at the end of a run. The verdict (right or not, and what the answer
 * was) is never locked. One video opens every explanation for PASS_MIN
 * minutes, so a study session costs one video, not one per question.
 * Pro opens everything. On the web nothing is locked.
 *
 * There is no other ad anywhere: no banners, no interstitials, nothing that
 * plays without a tap on "Watch".
 *
 * To see the locked path on the web: localStorage 'catos:ads' = 'test'
 * swaps in a three-second stand-in for the video.
 */

import { NATIVE, ask, isPro } from '../native.js';
import { escapeHTML } from '../utils/format.js';

export const PASS_MIN = 20;
const PASS_KEY = 'catos:why-until';
const KEY = 'catos:unlocked';
const SEEN = 'catos:videos';

const TEST = { showRewarded: () => new Promise((done) => setTimeout(() => done({ rewarded: true }), 3000)) };
const SHELL = { showRewarded: (placement) => ask('showRewarded', placement) };

function get(k) { try { return localStorage.getItem(k); } catch { return null; } }
function set(k, v) { try { localStorage.setItem(k, v); } catch { /* open for this visit only */ } }

function provider() {
  if (NATIVE) return SHELL;
  return get('catos:ads') === 'test' ? TEST : null;
}

function remembered() {
  try { return new Set(JSON.parse(get(KEY) ?? '[]')); } catch { return new Set(); }
}

/** Open without a video: the web, Pro, a pass still running, or this extra opened here before. */
export function isUnlocked(key = null) {
  return !provider() || isPro() || Number(get(PASS_KEY) ?? 0) > Date.now() || (key !== null && remembered().has(key));
}

/**
 * Play one rewarded video. True once explanations are open: the video was
 * watched to the end, or no video could be found (a learner is never stuck
 * behind an empty ad network). False if they closed it early.
 */
export async function unlockWithAd(key = null) {
  if (isUnlocked(key)) return true;
  let r = null;
  try { r = await provider().showRewarded(key ?? 'why'); } catch { r = null; }
  if (r && r.rewarded !== true && r.reason !== 'unavailable') return false;
  set(PASS_KEY, String(Date.now() + PASS_MIN * 60_000));
  if (key !== null) set(KEY, JSON.stringify([...remembered().add(key)]));
  set(SEEN, String(Number(get(SEEN) ?? 0) + 1));
  window.dispatchEvent(new Event('catos:why-open'));
  return true;
}

/** The words on the lock over the mentor's lesson at the end of a run. */
export const LESSON = { title: 'Your mentor\'s lesson', text: 'The moment this set turned, why the brain goes there, and how to notice it next time.' };

/* The Pro line under every lock, dealt in turn so it reads fresh. */
const NUDGE = [
  'Are videos interrupting your study session? Go Pro',
  'Chai would rather you kept reading. Pro has no videos',
  'Toffee hates waiting too. Pro means no videos, ever',
  'Studying on a train? Pro plays offline',
];
const PLAY = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';

/** The lock: what is behind it, one Watch button, and the way to never see it again. */
export function lockCard({ key = '', title = 'The full explanation', text = 'Why your pick tempted you, why the answer holds, and every other option taken apart.' } = {}) {
  const n = Number(get(SEEN) ?? 0);
  return `
    <div class="why-lock__card">
      <p class="why-lock__title">${escapeHTML(title)}</p>
      <p class="why-lock__text">${escapeHTML(text)}</p>
      <button type="button" class="btn btn--primary why-lock__go" data-why-open="${escapeHTML(key)}">${PLAY}<span>Watch a short video</span></button>
      <p class="why-lock__note">One video opens every explanation for ${PASS_MIN} minutes.</p>
      ${NATIVE ? `<a class="why-lock__pro" href="#/pro">${escapeHTML(NUDGE[n % NUDGE.length])}</a>` : ''}
      <p class="why-lock__said" role="status" aria-live="polite"></p>
    </div>`;
}

/** Detail HTML behind the door: as it is when open, else a lock that holds it until a video opens it. */
export function gated(html, copy) {
  if (!html || isUnlocked()) return html;
  return `<div class="why-lock"><template>${html}</template>${lockCard(copy)}</div>`;
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest?.('[data-why-open]');
    if (!btn || btn.disabled) return;
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Loading the video…';
    if (await unlockWithAd(btn.dataset.whyOpen || null)) return;
    btn.disabled = false;
    btn.innerHTML = label;
    const said = btn.closest('.why-lock__card')?.querySelector('.why-lock__said');
    if (said) said.textContent = 'The video did not finish, so this is still closed. Try again any time.';
  });
  // One video (or Pro) opens every lock on the screen at once.
  window.addEventListener('catos:why-open', () => {
    for (const lock of document.querySelectorAll('.why-lock')) lock.replaceWith(lock.querySelector('template').content);
  });
  window.addEventListener('catos:native', (e) => {
    if (e.detail?.type === 'pro' && e.detail.pro) window.dispatchEvent(new Event('catos:why-open'));
  });
}
