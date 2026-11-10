/**
 * arena.js — the little theatre at the top of a duel: the painted backdrop,
 * the pond, your friend, the Muddle and the rope between them.
 *
 * Only transforms change per frame. The rope is one SVG path, recomputed on a
 * spring, so a yank snaps taut and then settles the way a real one does.
 */

import { petFigure, backdropStyle, FRAME } from '../pets/sprite.js';
import { MUDDLE_SHEETS } from './muddle-sheets.js';
import { ROPE_END } from './model.js';
import { reduced, sparks, splash, confetti, pop } from './fx.js';

const FIGURE = 108;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** A Muddle's sprite: same five frames as a friend, drawn the same way. */
export function muddleSprite(id, { frame = 0, size = 108, cls = '' } = {}) {
  const s = MUDDLE_SHEETS[id];
  if (!s) return '';
  return `<span class="pet-sprite ${cls}" data-muddle="${id}" aria-hidden="true" style="--fw:${s.w};--sh:${s.h};--g:${s.gutter};--f:${frame};--size:${size};background-image:url(./assets/art/muddle-${id}.webp)"></span>`;
}

export function arenaHTML({ friend, friendStage, muddle, backdrop }) {
  return `
    <div class="ar" id="arena">
      <div class="ar__art" style="${backdropStyle(backdrop)}"></div>
      <div class="ar__veil"></div>
      <div class="ar__pond"><i class="ar__ripple"></i><i class="ar__ripple ar__ripple--b"></i></div>
      <svg class="ar__rope" aria-hidden="true"><path class="ar__rope-shadow"/><path class="ar__rope-main"/><path class="ar__rope-twist"/></svg>
      <div class="ar__flag" aria-hidden="true"><svg viewBox="0 0 28 34" width="28" height="34"><path d="M6 2v30" stroke="#3b2a1c" stroke-width="3" stroke-linecap="round"/><path class="ar__pennant" d="M7 3 C14 5 18 3 26 7 L20 11 26 17 C18 14 13 16 7 14Z" fill="#E0533F" stroke="#3b2a1c" stroke-width="2" stroke-linejoin="round"/></svg></div>
      <div class="ar__fig ar__fig--me" id="fig-me">${petFigure(friend, { size: FIGURE, stage: friendStage })}</div>
      <div class="ar__fig ar__fig--them" id="fig-them">${muddleSprite(muddle, { size: FIGURE })}</div>
      <div class="ar__bubble" id="bubble" role="status" hidden></div>
      <div class="ar__fx" id="fx"></div>
    </div>`;
}

export class Arena {
  #root; #raf = 0; #dead = false;
  #meEl; #themEl; #flag; #paths; #bubble; #fx; #bubbleTimer = 0;
  #w = 390; #h = 230;
  #target = 0; #x = 0; #v = 0;
  #sag = 16; #taut = 0;
  #leanMe = 0; #leanThem = 0;
  #meFrame = 0; #themFrame = 0;
  #meBlink = 0; #themBlink = 0;
  #friendId; #muddleId;
  #lastT = 0;
  #frozen = false;

  constructor(root, { friend, muddle }) {
    this.#root = root;
    this.#friendId = friend; this.#muddleId = muddle;
    this.#meEl = root.querySelector('#fig-me');
    this.#themEl = root.querySelector('#fig-them');
    this.#flag = root.querySelector('.ar__flag');
    this.#bubble = root.querySelector('#bubble');
    this.#fx = root.querySelector('#fx');
    this.#paths = [...root.querySelectorAll('.ar__rope path')];
    this.measure();
    this.#onResize = () => this.measure();
    addEventListener('resize', this.#onResize);
    this.#raf = requestAnimationFrame((t) => this.#tick(t));
  }
  #onResize;

  measure() {
    const r = this.#root.getBoundingClientRect();
    this.#w = r.width || 390; this.#h = r.height || 230;
    const svg = this.#root.querySelector('.ar__rope');
    svg.setAttribute('viewBox', `0 0 ${this.#w} ${this.#h}`);
  }

  /** The rope's logical place. The drawing eases toward it. */
  set rope(v) { this.#target = clamp(v, -ROPE_END, ROPE_END); }

  /** Who pulled, how hard: leans them back, whips the rope taut, throws sparks. */
  yank(who, power = 1) {
    this.#taut = 1;
    if (reduced()) return;
    if (who === 'me') { this.#leanMe = -10 * power; this.#leanThem = 7 * power; this.#setFrame('them', FRAME.talk, 300); this.#setFrame('me', FRAME.happy, 460); }
    else { this.#leanThem = 11 * power; this.#leanMe = 8 * power; this.#setFrame('them', FRAME.happy, 520); this.#setFrame('me', FRAME.talk, 300); }
    const p = this.#pos();
    sparks(this.#fx, p.flagX, p.ropeY, { n: Math.round(8 * power), spread: 40 + 40 * power });
    if (power >= 1.1) { this.#root.classList.remove('is-jolt'); void this.#root.offsetWidth; this.#root.classList.add('is-jolt'); }
  }

  /** A streak earns a word of praise, and a word worth knowing. */
  praise(word) {
    if (!word) return;
    const p = this.#pos();
    pop(this.#fx, this.#w * 0.5, p.ropeY - 34, word, 'fx-pop--praise');
  }

  say(text, ms = 2400) {
    clearTimeout(this.#bubbleTimer);
    if (!text) { this.#bubble.hidden = true; return; }
    this.#bubble.textContent = text;
    this.#bubble.hidden = false;
    this.#bubble.classList.remove('is-in');
    void this.#bubble.offsetWidth;
    this.#bubble.classList.add('is-in');
    this.#setFrame('them', FRAME.talk, 900);
    this.#bubbleTimer = setTimeout(() => { this.#bubble.hidden = true; }, ms);
  }

  #setFrame(who, f, ms = 0) {
    const el = (who === 'me' ? this.#meEl : this.#themEl).querySelector('.pet-sprite');
    if (!el) return;
    el.style.setProperty('--f', f);
    if (who === 'me') this.#meFrame = f; else this.#themFrame = f;
    if (ms) { clearTimeout(who === 'me' ? this.#meBlink : this.#themBlink); const t = setTimeout(() => { if (!this.#dead) this.#setFrame(who, 0); }, ms); if (who === 'me') this.#meBlink = t; else this.#themBlink = t; }
  }

  #pos() {
    const w = this.#w, h = this.#h;
    const travel = w * 0.2, half = travel * 0.5;
    const r = this.#x / ROPE_END;
    const meDx = r < 0 ? -r * travel : -r * half;     // you are dragged only when losing
    const themDx = r > 0 ? -r * travel : -r * half;   // and so is the Muddle
    const groundY = h - 26;
    const figH = Math.min(FIGURE, h * 0.5);
    const meX = w * 0.17 + meDx, themX = w * 0.83 + themDx;
    const ropeY = groundY - figH * 0.42;
    return { meDx, themDx, meX, themX, groundY, ropeY, flagX: (meX + themX) / 2 + 0 };
  }

  #tick(t) {
    if (this.#dead) return;
    const dt = Math.min(40, this.#lastT ? t - this.#lastT : 16) / 16.67;
    this.#lastT = t;
    if (!this.#frozen) {
      // A spring, a little underdamped, so the flag overshoots and settles.
      const a = (this.#target - this.#x) * 0.09 - this.#v * 0.32;
      this.#v += a * dt; this.#x += this.#v * dt;
    }
    this.#taut = Math.max(0, this.#taut - 0.05 * dt);
    this.#leanMe *= 0.9 ** dt; this.#leanThem *= 0.9 ** dt;
    const breathe = reduced() ? 0 : Math.sin(t / 620) * 1.6;
    const p = this.#pos();
    const s = this.#scale();
    this.#meEl.style.transform = `translate3d(${(p.meX - this.#w * 0.17).toFixed(1)}px,0,0) rotate(${(this.#leanMe - 3).toFixed(2)}deg) scale(${s})`;
    this.#themEl.style.transform = `translate3d(${(p.themX - this.#w * 0.83).toFixed(1)}px,0,0) rotate(${(this.#leanThem + 3).toFixed(2)}deg) scale(${s})`;
    const y0 = p.ropeY + breathe * 0.4, x0 = p.meX + 34 * s, x1 = p.themX - 34 * s;
    const sag = 2 + 18 * (1 - this.#taut) * (1 - Math.min(0.75, Math.abs(this.#x) / ROPE_END * 0.5));
    const mx = (x0 + x1) / 2, my = y0 + sag;
    const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${(my + sag * 0.6).toFixed(1)} ${x1.toFixed(1)} ${y0.toFixed(1)}`;
    for (const path of this.#paths) path.setAttribute('d', d);
    this.#flag.style.transform = `translate3d(${(p.flagX - 3).toFixed(1)}px,${(my - 28).toFixed(1)}px,0)`;
    this.#raf = requestAnimationFrame((tt) => this.#tick(tt));
  }

  /* The figures are drawn once and shrunk while something long is being read. */
  #small = false;
  #scale() { return this.#small ? 0.62 : 1; }
  setCompact(on) { this.#small = !!on; setTimeout(() => this.measure(), 340); }

  /** Where a thrown word should land, in viewport pixels. */
  ropePointOnScreen() {
    const r = this.#root.getBoundingClientRect(); const p = this.#pos();
    return { x: r.left + p.flagX, y: r.top + p.ropeY };
  }

  popNumber(delta) {
    const p = this.#pos();
    pop(this.#fx, p.flagX, p.ropeY - 12, delta > 0 ? `+${delta}` : `${delta}`, delta > 0 ? 'fx-pop--good' : 'fx-pop--bad');
  }

  /** The end: somebody goes in the pond. Resolves when the splash is done. */
  ko(won) {
    return new Promise((resolve) => {
      this.#target = won ? ROPE_END : -ROPE_END;
      this.#taut = 1;
      const loser = won ? this.#themEl : this.#meEl;
      const winner = won ? this.#meEl : this.#themEl;
      this.#setFrame(won ? 'them' : 'me', FRAME.sleep);
      this.#setFrame(won ? 'me' : 'them', FRAME.happy);
      const after = reduced() ? 80 : 620;
      setTimeout(() => {
        if (this.#dead) { resolve(); return; }
        this.#frozen = true;
        loser.classList.add('is-falling', won ? 'is-falling--them' : 'is-falling--me');
        const r = this.#root.getBoundingClientRect();
        const p = this.#pos();
        splash(this.#fx, r.width * 0.5, p.groundY + 2, { ink: won });
        if (won) { winner.classList.add('is-cheering'); confetti(document.querySelector('.dl') ?? this.#root); }
        setTimeout(resolve, reduced() ? 300 : 1250);
      }, after);
    });
  }

  destroy() {
    this.#dead = true;
    cancelAnimationFrame(this.#raf);
    clearTimeout(this.#bubbleTimer);
    removeEventListener('resize', this.#onResize);
  }
}

