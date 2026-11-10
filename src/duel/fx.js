/**
 * fx.js — the small physical things that make a tap feel like it did
 * something: sparks, droplets, floating numbers, a buzz in the hand.
 *
 * Everything is a short-lived element moved by the compositor (transform and
 * opacity only), removed when its animation ends, and skipped altogether for
 * anyone who asked for less motion.
 */

import { motionReduced } from '../core/engagement/feedback.js';
import { feedbackPrefs } from '../core/engagement/feedback.js';

export const reduced = () => { try { return motionReduced(); } catch { return false; } };

export function buzz(pattern) {
  try { if (feedbackPrefs?.().haptics !== false) navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

function spawn(host, cls, css, life) {
  const el = document.createElement('i');
  el.className = cls;
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = css;
  host.appendChild(el);
  setTimeout(() => el.remove(), life);
  return el;
}

/** A burst of sparks at (x, y) in the host's own pixels. */
export function sparks(host, x, y, { n = 10, colors = ['#FFE27A', '#F4C443', '#FFF3C4', '#E9963A'], spread = 62, size = 7 } = {}) {
  if (reduced() || !host?.isConnected) return;
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2, d = spread * (0.45 + Math.random() * 0.75);
    const s = size * (0.55 + Math.random() * 0.8);
    spawn(host, 'fx-spark', `left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${colors[i % colors.length]};--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d - 14)}px;animation-delay:${Math.round(Math.random() * 40)}ms`, 760);
  }
}

/** Water thrown up from the pond. */
export function splash(host, x, y, { n = 26, ink = false } = {}) {
  if (!host?.isConnected) return;
  const count = reduced() ? 6 : n;
  for (let i = 0; i < count; i += 1) {
    const a = -Math.PI * (0.08 + Math.random() * 0.84), d = 50 + Math.random() * 110;
    const s = 5 + Math.random() * 10;
    const c = ink ? (Math.random() < 0.5 ? '#2a2c5c' : '#58609e') : (Math.random() < 0.5 ? '#9fd8e6' : '#e2f5fa');
    spawn(host, 'fx-drop', `left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${c};--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;animation-delay:${Math.round(Math.random() * 90)}ms`, 1100);
  }
  for (let i = 0; i < 3; i += 1) spawn(host, `fx-ring${ink ? ' fx-ring--ink' : ''}`, `left:${x}px;top:${y}px;animation-delay:${i * 150}ms`, 1500);
}

/** A number that floats up and fades. */
export function pop(host, x, y, text, cls = '') {
  if (!host?.isConnected) return;
  const el = spawn(host, `fx-pop ${cls}`, `left:${x}px;top:${y}px`, 1000);
  el.textContent = text;
}

/** A word thrown from where it was tapped to a spot on the rope. */
export function throwWord(layer, text, from, to) {
  if (reduced() || !layer?.isConnected) return;
  const el = spawn(layer, 'fx-word', `left:${from.x}px;top:${from.y}px;--dx:${Math.round(to.x - from.x)}px;--dy:${Math.round(to.y - from.y)}px`, 460);
  el.textContent = text.length > 22 ? `${text.slice(0, 21)}…` : text;
}

/** Confetti over the whole screen, for wins. */
export function confetti(host, { n = 46 } = {}) {
  if (reduced() || !host?.isConnected) return;
  const colors = ['#F4C443', '#E9963A', '#8FB56A', '#6BB5C9', '#D9848F', '#FFF3C4'];
  for (let i = 0; i < n; i += 1) {
    const x = Math.random() * 100, w = 6 + Math.random() * 7, h = 9 + Math.random() * 9;
    spawn(host, 'fx-confetti', `left:${x}%;width:${w}px;height:${h}px;background:${colors[i % colors.length]};--r:${Math.round(180 + Math.random() * 540)}deg;--x:${Math.round((Math.random() - 0.5) * 120)}px;animation-duration:${(1.6 + Math.random() * 1.6).toFixed(2)}s;animation-delay:${Math.round(Math.random() * 500)}ms`, 3800);
  }
}
