/**
 * library.js — Chai's library: the Reading House's shelves (owner,
 * 2026-10-31). Every passage is a book on one long bookcase, Elite at the
 * top and Foundation at the bottom (core/learning/journey.js
 * libraryShelves). A book is as clean as the best run of it: every answer
 * right gleams, half right is half dusty, none right stays dusty. A shelf
 * opens once half the shelf below it has been read. Chai waits on the
 * rolling ladder beside the next book.
 *
 * Drawn in the DOM, not on a canvas: every book is a link a finger or a key
 * can reach (one Tab stop per shelf, the arrows inside it), and CSS paints
 * it crisp at any density. The look is ui/styles/library.css, loaded the
 * first time the library opens, so a cold open of the village never pays.
 *
 * What moves (none of it when the learner asked for less motion):
 *   arriving     Chai starts at the top of the ladder and flies down to his
 *                book; the page follows him until the learner touches it
 *   coming back  a book read since the last visit is wiped as clean as the
 *                run earned, a shelf that opened drops its chain, and the
 *                ladder rolls Chai on to the next book
 *   opening      a tapped book comes off the shelf, turns, opens, and the
 *                passage begins
 * What the library looked like last time is kept on the device
 * (`catos:shelf`) only to know what changed; the library itself is derived
 * from the records every time, never stored.
 */

import { petSprite, FRAME } from '../../pets/sprite.js';
import { displayTitle } from '../../modules/reading-comprehension/logic/spoilers.js';
import { escapeHTML } from '../../core/utils/format.js';
import { play, voice } from '../audio.js';

const STYLE = './src/ui/styles/library.css';
const MEMORY = 'catos:shelf';

/* Geometry in CSS px; library.css paints to the same numbers. */
const PAD = 74;          // shelf space before book 1: room for the ladder
const CROWN = 52;        // the cornice and its rail
const HEAD = 16;         // air above the tallest book
const BOOKS = 96;        // the tallest book
const PLANK = 15;        // the shelf board
const FLOOR = 64;        // plinth and floorboards
const ROW = HEAD + BOOKS + PLANK;
const LADDER_W = 50;
const LADDER_TOP = 36;
const OWL = 74;          // Chai's height on the ladder
const RUNG = ROW / 5;

/* Leather, cloth and a little vellum: the colours old libraries are. */
const COLOURS = ['#7A2420', '#5E1B2A', '#2F4F3A', '#24405E', '#4B2E52', '#8A5A1C', '#1F5257', '#6B3A1E', '#3C4A5C', '#56602C', '#8C3B2A', '#2C3E33', '#6A2D3C', '#3B355E', '#704A24', '#29454F'];

const SAY = {
  first: 'So much dust! Read a book and it comes clean.',
  next: (b) => `Book ${b.n} next. Shall we?`,
  gleam: 'Gleaming! Not a speck left.',
  better: 'Cleaner! A few specks still to go.',
  dusty: 'Still dusty. It will shine next time.',
  open: (sh) => `The ${sh.label} shelf is open!`,
  locked: (sh) => `${sh.toGo} more ${sh.below?.label ?? ''} ${sh.toGo === 1 ? 'book' : 'books'} first!`,
  done: 'Every book gleams. Thank you!',
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reduced = () => document.documentElement.hasAttribute('data-reduced-motion');

let styleReady = null;
/** The library's own stylesheet, once; a library opened offline still works (the worker precaches it). */
function loadStyle() {
  if (styleReady) return styleReady;
  styleReady = new Promise((resolve) => {
    if (document.querySelector('link[data-lib-style]')) { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = STYLE; link.dataset.libStyle = '';
    link.onload = () => resolve(); link.onerror = () => resolve();
    document.head.appendChild(link);
    setTimeout(resolve, 4000);
  });
  return styleReady;
}

function readMemory() {
  try {
    const m = JSON.parse(localStorage.getItem(MEMORY) || 'null');
    return m && typeof m === 'object' && m.clean && typeof m.clean === 'object' ? m : null;
  } catch { return null; }
}
function writeMemory(lib) {
  try {
    localStorage.setItem(MEMORY, JSON.stringify({
      owl: lib.owl?.id ?? null,
      open: lib.shelves.filter((s) => s.open).length,
      clean: Object.fromEntries(lib.shelves.flatMap((s) => s.books.filter((b) => b.read).map((b) => [b.id, Math.round(b.clean * 100) / 100]))),
    }));
  } catch { /* private mode: every visit is a first look */ }
}

/* ------------------------------------------------------------------ */
/* Paint: the shared gradients and everything on a shelf that is not a  */
/* book. Plain SVG, sized by its box.                                   */
/* ------------------------------------------------------------------ */

const DEFS = `<svg class="lib__defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>
  <linearGradient id="lib-g-brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6E5222"/><stop offset=".35" stop-color="#F4DC94"/><stop offset=".6" stop-color="#C9A24E"/><stop offset="1" stop-color="#5E4418"/></linearGradient>
  <linearGradient id="lib-g-woodh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4A2C17"/><stop offset=".5" stop-color="#8A5B33"/><stop offset="1" stop-color="#4A2C17"/></linearGradient>
  <linearGradient id="lib-g-woodv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5B33"/><stop offset="1" stop-color="#43291A"/></linearGradient>
  <radialGradient id="lib-g-sea" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#8CC0D0"/><stop offset=".5" stop-color="#3E6F86"/><stop offset="1" stop-color="#1A3646"/></radialGradient>
  <radialGradient id="lib-g-orb" cx=".38" cy=".32" r=".72"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
  <radialGradient id="lib-g-halo"><stop offset="0" stop-color="#FFD98A" stop-opacity=".75"/><stop offset="1" stop-color="#FFB45A" stop-opacity="0"/></radialGradient>
  <linearGradient id="lib-g-wax" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#CDBE98"/><stop offset=".4" stop-color="#FFF7E2"/><stop offset=".7" stop-color="#E9DDC0"/><stop offset="1" stop-color="#B9A983"/></linearGradient>
  <linearGradient id="lib-g-flame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8A2E"/><stop offset=".45" stop-color="#FFD25A"/><stop offset="1" stop-color="#FFF6D2"/></linearGradient>
  <linearGradient id="lib-g-terra" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7A3820"/><stop offset=".4" stop-color="#C8714A"/><stop offset=".8" stop-color="#9A4A2A"/><stop offset="1" stop-color="#5E2915"/></linearGradient>
  <linearGradient id="lib-g-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9CC46E"/><stop offset="1" stop-color="#3D6B34"/></linearGradient>
  <linearGradient id="lib-g-quill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFDF6"/><stop offset="1" stop-color="#D9CBAA"/></linearGradient>
  <radialGradient id="lib-g-ink" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#4A5B7C"/><stop offset="1" stop-color="#10131C"/></radialGradient>
  <linearGradient id="lib-g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D59A"/><stop offset=".6" stop-color="#E9B98A"/><stop offset="1" stop-color="#A8C6D2"/></linearGradient>
  <linearGradient id="lib-g-bronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4E3A1E"/><stop offset=".4" stop-color="#B08C52"/><stop offset=".7" stop-color="#7A5A2E"/><stop offset="1" stop-color="#3E2C14"/></linearGradient>
  <linearGradient id="lib-g-rail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3E2414"/><stop offset=".4" stop-color="#A9744A"/><stop offset=".7" stop-color="#7A4E2C"/><stop offset="1" stop-color="#3A2112"/></linearGradient>
  <linearGradient id="lib-g-rung" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C08A58"/><stop offset=".55" stop-color="#7A4E2C"/><stop offset="1" stop-color="#43291A"/></linearGradient>
  <linearGradient id="lib-g-wing" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1DDB6"/><stop offset=".45" stop-color="#D3AE7E"/><stop offset=".85" stop-color="#A27750"/><stop offset="1" stop-color="#7A5434"/></linearGradient>
  <radialGradient id="lib-g-lantern" cx=".5" cy=".6" r=".7"><stop offset="0" stop-color="#FFF0B8"/><stop offset=".6" stop-color="#FFC970" stop-opacity=".75"/><stop offset="1" stop-color="#E89A48" stop-opacity=".45"/></radialGradient>
  <linearGradient id="lib-g-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
</defs></svg>`;

const FLAME = (x, y, s = 1) => `<g class="lib__flame"><path d="M${x} ${y - 16 * s}C${x + 4 * s} ${y - 11 * s} ${x + 5 * s} ${y - 6 * s} ${x} ${y}C${x - 5 * s} ${y - 6 * s} ${x - 4 * s} ${y - 11 * s} ${x} ${y - 16 * s}Z" fill="url(#lib-g-flame)"/><path d="M${x} ${y - 9 * s}C${x + 2 * s} ${y - 6 * s} ${x + 2 * s} ${y - 4 * s} ${x} ${y - 1.5 * s}C${x - 2 * s} ${y - 4 * s} ${x - 2 * s} ${y - 6 * s} ${x} ${y - 9 * s}Z" fill="#FFFCEB"/></g>`;

/** A flat stack of books, spines out; `top` lifts it to make room for a cup. */
function stackSVG(top, r) {
  const c = () => COLOURS[Math.floor(r() * COLOURS.length)];
  const book = (x, y, w, h, col) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${col}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#lib-g-shine)"/><path d="M${x + 5} ${y + 1.5}v${h - 3}M${x + 8} ${y + 1.5}v${h - 3}M${x + w - 5} ${y + 1.5}v${h - 3}M${x + w - 8} ${y + 1.5}v${h - 3}" stroke="#E8C468" stroke-width="1.1" opacity=".85"/>`;
  return book(2, top + 31, 82, 15, c()) + book(8, top + 19, 72, 12, c()) + book(4, top + 9, 66, 10, c());
}

const PROPS = {
  bookend: { w: 14, h: 64, svg: () => '<path d="M3 64V8q0-6 5-6t4 6v56z" fill="url(#lib-g-brass)" stroke="#5A3F14" stroke-width="1"/><rect y="60" width="14" height="4" rx="1" fill="#6E5222"/><circle cx="7.5" cy="14" r="2.4" fill="#FFF0B8" opacity=".7"/>' },
  globe: { w: 62, h: 88, svg: () => '<ellipse cx="31" cy="87" rx="20" ry="2.5" fill="#000" opacity=".35"/><path d="M15 88l4-8h24l4 8z" fill="url(#lib-g-woodv)"/><rect x="28" y="62" width="6" height="19" fill="url(#lib-g-brass)"/><circle cx="31" cy="35" r="24" fill="url(#lib-g-sea)"/><path d="M19 21c4-4 10-5 13-2 2 2-1 5 2 7s6 0 7 3-3 5-6 6c-4 1-5 5-9 4s-2-5-5-7-5-8-2-11z" fill="#D4C083"/><path d="M39 39c3-1 7 1 8 4 0 3-3 6-6 8-2 1-4-1-4-3 0-3-1-7 2-9zM14 45c3 0 5 2 6 4-2 1-5 0-6-4z" fill="#BFAC70"/><circle cx="31" cy="35" r="24" fill="url(#lib-g-orb)"/><circle cx="31" cy="35" r="27.5" fill="none" stroke="url(#lib-g-brass)" stroke-width="2.4" stroke-dasharray="118 55" transform="rotate(96 31 35)"/><ellipse cx="23" cy="24" rx="7" ry="3.6" fill="#fff" opacity=".3" transform="rotate(-32 23 24)"/>' },
  candle: { w: 28, h: 64, svg: () => `<circle cx="14" cy="15" r="15" fill="url(#lib-g-halo)"/><ellipse cx="14" cy="61" rx="12" ry="3" fill="url(#lib-g-brass)"/><rect x="10" y="53" width="8" height="7" rx="1" fill="url(#lib-g-brass)"/><rect x="9" y="26" width="10" height="29" rx="2" fill="url(#lib-g-wax)"/><path d="M10.5 29q1 7-.5 11t.5 3" stroke="#FFF8E6" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/><path d="M14 26v-3" stroke="#2A1A0E" stroke-width="1.2"/>${FLAME(14, 23)}` },
  ivy: { w: 60, h: 98, sink: 26, svg: (r) => {
    const leaf = (x, y, a, s) => `<path d="M0 0C3-5 9-5 11 0 9 5 3 5 0 0z" transform="translate(${x} ${y}) rotate(${a}) scale(${s})" fill="url(#lib-g-leaf)" stroke="#2E5226" stroke-width=".5"/>`;
    let leaves = '';
    for (let i = 0; i < 16; i += 1) { const a = r() * Math.PI * 2, d = 4 + r() * 14; leaves += leaf(30 + Math.cos(a) * d * 1.2, 34 + Math.sin(a) * d * 0.9, Math.round(r() * 360), 0.9 + r() * 0.6); }
    const vine = (pts) => `<path d="M${pts.map((p) => p.join(' ')).join('L')}" stroke="#4E7A35" stroke-width="1.4" fill="none" stroke-linejoin="round"/>${pts.slice(1).map((p, i) => leaf(p[0], p[1], i % 2 ? 40 : 140, 0.7)).join('')}`;
    return `${vine([[22, 56], [20, 68], [23, 78], [19, 88], [21, 97]])}${vine([[40, 56], [43, 66], [40, 76], [44, 84]])}<path d="M13 58h34l-4 14H17z" fill="url(#lib-g-terra)"/><rect x="11" y="52" width="38" height="7" rx="2" fill="url(#lib-g-terra)"/><ellipse cx="30" cy="53" rx="17" ry="2.2" fill="#2E1C10"/>${leaves}`;
  } },
  stack: { w: 88, h: 46, svg: (r) => stackSVG(0, r) },
  tea: { w: 88, h: 72, svg: (r) => `${stackSVG(26, r)}<path class="lib__steam" d="M52 6c-3 3 3 5 0 9" stroke="#F4EEE0" stroke-width="1.6" fill="none" stroke-linecap="round"/><path class="lib__steam" d="M58 4c-3 3 3 6 0 10" stroke="#F4EEE0" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="56" cy="34" rx="15" ry="2.6" fill="#E9E1CF"/><path d="M45 18h22c0 9-4 15-11 15s-11-6-11-15z" fill="#F6F0E2"/><path d="M45 18h22" stroke="#CDBFA0" stroke-width="1.4"/><path d="M47 22h18" stroke="#B54A3A" stroke-width="2"/><path d="M67 21c5 0 5 7 0 7" stroke="#F6F0E2" stroke-width="2.4" fill="none"/><path d="M47 18c3 1 15 1 18 0" stroke="#7A4A22" stroke-width="1.6"/>` },
  hourglass: { w: 34, h: 58, svg: () => '<rect x="1" width="32" height="6" rx="2" fill="url(#lib-g-woodh)"/><rect x="1" y="52" width="32" height="6" rx="2" fill="url(#lib-g-woodh)"/><rect x="3" y="6" width="3" height="46" fill="#5A3820"/><rect x="28" y="6" width="3" height="46" fill="#5A3820"/><path d="M8 7h18c0 10-6 14-8 22 2 8 8 12 8 22H8c0-10 6-14 8-22-2-8-8-12-8-22z" fill="#DCECF0" fill-opacity=".3" stroke="#F0F8FA" stroke-opacity=".55" stroke-width=".8"/><path d="M11 12h12c-1 5-4 8-6 13-2-5-5-8-6-13z" fill="#E2B866"/><path d="M9 50h16c-1-5-4-8-8-9-4 1-7 4-8 9z" fill="#D9AE58"/><rect class="lib__sand" x="16.5" y="28" width="1" height="13" fill="#E2B866"/>' },
  lantern: { w: 40, h: 76, svg: () => `<circle cx="20" cy="44" r="22" fill="url(#lib-g-halo)"/><path d="M14 9a6 6 0 0 1 12 0" stroke="url(#lib-g-brass)" stroke-width="2" fill="none"/><path d="M7 19l13-9 13 9z" fill="url(#lib-g-brass)"/><rect x="8" y="18" width="24" height="4" fill="#6E5222"/><rect x="10" y="22" width="20" height="40" fill="url(#lib-g-lantern)"/>${FLAME(20, 52, 0.8)}<rect x="9" y="22" width="2.4" height="40" fill="#5E4418"/><rect x="28.6" y="22" width="2.4" height="40" fill="#5E4418"/><rect x="19" y="22" width="2" height="40" fill="#5E4418" opacity=".7"/><rect x="7" y="62" width="26" height="6" rx="1" fill="url(#lib-g-brass)"/><rect x="9" y="68" width="22" height="8" rx="1" fill="#6E5222"/>` },
  quill: { w: 44, h: 72, svg: () => '<path d="M31 2C22 14 19 30 18 52" stroke="#CFC3A8" stroke-width="1.2" fill="none"/><path d="M31 2c10 6 6 22-4 34-4 5-7 10-9 16 0-10 2-24 6-34 2-6 4-11 7-16z" fill="url(#lib-g-quill)" stroke="#BFB18E" stroke-width=".6"/><path d="M29 9l6 3M27 15l7 2M25 21l7 1M23 28l6 0M21 35l5-1" stroke="#C9BB98" stroke-width=".7"/><path d="M8 54h22a3 3 0 0 1 3 3v10a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V57a3 3 0 0 1 3-3z" fill="url(#lib-g-ink)"/><rect x="13" y="49" width="12" height="6" rx="1.5" fill="#2A1C12"/><path d="M9 58c1 4 1 8 3 11" stroke="#fff" stroke-opacity=".35" stroke-width="1.5" fill="none" stroke-linecap="round"/>' },
  frame: { w: 54, h: 68, svg: () => '<g transform="rotate(-6 27 68)"><rect x="4" y="4" width="46" height="62" rx="2" fill="url(#lib-g-brass)" stroke="#5A3F14"/><rect x="9" y="9" width="36" height="52" fill="url(#lib-g-sky)"/><circle cx="35" cy="22" r="4" fill="#FFF3C8" opacity=".9"/><path d="M9 44q9-8 18-2 9-9 18-1v20H9z" fill="#6A8A50"/><path d="M9 52q12-6 36-2v11H9z" fill="#47683A"/><path d="M19 47v-7M19 40c-3 0-5-3-2-5 0-3 5-3 5 0 3 2 1 5-3 5z" stroke="#2E4626" fill="#3E5E33" stroke-width="1"/><rect x="9" y="9" width="36" height="52" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2"/></g>' },
  figure: { w: 30, h: 44, svg: () => '<rect x="5" y="38" width="20" height="6" rx="1.5" fill="url(#lib-g-woodh)"/><path d="M8 38C4 30 5 16 9 11L8 4l4 5q3-1 6 0l4-5-1 7c4 5 5 19 1 27z" fill="url(#lib-g-bronze)"/><circle cx="12" cy="16" r="3.4" fill="#E9D49A"/><circle cx="18" cy="16" r="3.4" fill="#E9D49A"/><circle cx="12" cy="16" r="1.5" fill="#2A1C10"/><circle cx="18" cy="16" r="1.5" fill="#2A1C10"/><path d="M15 18l-1.3 2.6h2.6z" fill="#6E4E1E"/><path d="M11 27q4 2 8 0M11 31q4 2 8 0" stroke="#3E2C14" stroke-width=".9" fill="none"/>' },
};
const PROP_KINDS = ['globe', 'candle', 'ivy', 'stack', 'tea', 'hourglass', 'lantern', 'quill', 'frame', 'figure'];

const WING = '<svg viewBox="0 0 46 34" aria-hidden="true"><path d="M46 9C38 2 22-1 9 4 4 6 1 10 2 14c3-1 6 0 7 2-3 2-3 6 0 8 3-1 6-1 7 1-1 3 1 6 5 6 2-2 5-3 8-2 1 3 5 5 8 3 1-5 5-9 9-11z" fill="url(#lib-g-wing)" stroke="#6E4B2C" stroke-width="1.1" stroke-linejoin="round"/><path d="M44 12c-10-4-22-4-32-1M44 16c-9-2-20-1-29 3M45 19c-7 0-15 2-21 6" stroke="#8C6440" stroke-width="1" fill="none" opacity=".7"/></svg>';

const PADLOCK = '<svg viewBox="0 0 26 30" aria-hidden="true"><path class="lib__shackle" d="M7 14V9a6 6 0 0 1 12 0v5" fill="none" stroke="#7A5A22" stroke-width="3.2"/><rect x="3" y="13" width="20" height="15" rx="3" fill="url(#lib-g-brass)" stroke="#5A3F14"/><circle cx="13" cy="19.5" r="2.2" fill="#3A2A10"/><rect x="12" y="20" width="2" height="5" rx="1" fill="#3A2A10"/></svg>';

const LAMP = `<svg viewBox="0 0 34 62" aria-hidden="true"><path d="M17 0v8M11 8h12" stroke="url(#lib-g-brass)" stroke-width="2.4"/><path d="M17 8c-9 4-9 16 0 22" stroke="url(#lib-g-brass)" stroke-width="2" fill="none"/><circle cx="17" cy="38" r="17" fill="url(#lib-g-halo)"/><ellipse cx="17" cy="55" rx="10" ry="3" fill="url(#lib-g-brass)"/><rect x="13" y="42" width="8" height="12" rx="1.5" fill="url(#lib-g-wax)"/><path d="M17 42v-3" stroke="#2A1A0E" stroke-width="1.1"/>${FLAME(17, 39, 0.75)}<rect x="9" y="22" width="16" height="31" rx="7" fill="#FFF4DC" fill-opacity=".1" stroke="#FFF4DC" stroke-opacity=".38" stroke-width="1"/><path d="M12 27c-1 6-1 14 0 20" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;

function ladderSVG(h) {
  const rungs = [];
  for (let k = -4; ; k += 1) {
    const y = CROWN + HEAD + BOOKS - LADDER_TOP + k * RUNG;
    if (y > h - 22) break;
    if (y > 18) rungs.push(y);
  }
  const wheel = (cx) => `<g class="lib__wheel"><circle cx="${cx}" cy="${h - 8}" r="7.5" fill="#2A1A0E"/><circle cx="${cx}" cy="${h - 8}" r="5" fill="url(#lib-g-brass)"/><path d="M${cx - 5} ${h - 8}h10M${cx} ${h - 13}v10" stroke="#5A3F14" stroke-width="1.2"/></g>`;
  return `<svg viewBox="0 0 ${LADDER_W} ${h}" aria-hidden="true">
    <path d="M7 14V6q0-5 5-5h2q4 0 4 4v4M43 14V6q0-5-5-5h-2q-4 0-4 4v4" stroke="url(#lib-g-brass)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <rect x="3" y="10" width="8" height="${h - 24}" rx="3" fill="url(#lib-g-rail)"/><rect x="39" y="10" width="8" height="${h - 24}" rx="3" fill="url(#lib-g-rail)"/>
    ${rungs.map((y) => `<rect x="9" y="${(y - 2.5).toFixed(1)}" width="32" height="5" rx="2.5" fill="url(#lib-g-rung)"/><rect x="10" y="${(y + 2.5).toFixed(1)}" width="30" height="1.6" fill="#000" fill-opacity=".35"/>`).join('')}
    ${wheel(7)}${wheel(43)}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Layout: every book and prop in px                                    */
/* ------------------------------------------------------------------ */

function layout(lib) {
  const rows = [...lib.shelves].reverse().map((sh, r) => {
    let x = PAD;
    const books = sh.books.map((b) => {
      const s = hash(b.id);
      const w = 44 + (s % 9);
      const h = BOOKS - 20 + ((s >>> 5) % 21);
      const out = { b, x, w, h, s };
      x += w + 1 + ((s >>> 11) % 3 === 0 ? 1 : 0);
      return out;
    });
    return { sh, r, books, end: x };
  });
  const width = Math.max(560, ...rows.map((p) => p.end)) + 160;
  for (const p of rows) {
    const r = rng(hash(`${p.sh.stage}:props`));
    p.props = [{ kind: 'bookend', x: p.end, r }];
    let x = p.end + 14 + 34 + r() * 60, last = 'bookend';
    for (;;) {
      let k = PROP_KINDS[Math.floor(r() * PROP_KINDS.length)];
      if (k === last) k = PROP_KINDS[(PROP_KINDS.indexOf(k) + 3) % PROP_KINDS.length];
      if (x + PROPS[k].w > width - 46) break;
      p.props.push({ kind: k, x, r });
      last = k;
      x += PROPS[k].w + 46 + r() * 120;
    }
  }
  return { rows, width, height: CROWN + rows.length * ROW + FLOOR };
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

/** `look` is how the book is drawn now: its dust, and whether it shows the read ribbon and the gleam yet. */
function bookHTML({ b, x, w, h, s }, sh, { dust, ribbon, gleam }) {
  const locked = !sh.open;
  const kind = s % 10 < 7 ? '' : s % 10 < 9 ? ' bk--cloth' : ' bk--vellum';
  const status = locked ? `Locked until ${sh.need} ${sh.below?.label ?? ''} books are read`
    : !b.read ? 'Not read yet'
      : b.clean >= 1 ? 'Read with every answer right: gleaming'
        : `Read, best ${Math.round(b.clean * 100)} percent right`;
  const label = `Book ${b.n}${locked ? '' : `, ${displayTitle(b.item)}`}. ${status}.`;
  const cls = `bk${kind}${b.read ? ' is-read' : ''}${gleam ? ' is-gleaming' : ''}`;
  const where = locked ? 'role="link" aria-disabled="true"' : `href="#/rc/session/${escapeHTML(b.id)}"`;
  return `<a class="${cls}" ${where} data-id="${escapeHTML(b.id)}" tabindex="-1" aria-label="${escapeHTML(label)}" style="--x:${x}px;--w:${w}px;--h:${h}px;--c:${COLOURS[(s >>> 3) % COLOURS.length]};--dust:${dust.toFixed(2)};--tw:${((s >>> 7) % 70) / 10}s"><i class="bk__dust"></i>${!ribbon && s % 4 === 0 ? '<i class="bk__web"></i>' : ''}${ribbon ? '<i class="bk__rib"></i>' : ''}<span class="bk__no" aria-hidden="true">${b.n}</span></a>`;
}

function rowHTML(p, look, lockedNow) {
  const { sh, r } = p;
  const locked = lockedNow(sh);
  // A shelf drawn locked only until its unlock plays was one book short before this visit.
  const lockChip = locked && sh.below
    ? `<span class="lib__plate lib__plate--lock">${PADLOCK}Read ${sh.open ? Math.max(1, sh.toGo) : sh.toGo} more ${escapeHTML(sh.below.label)}</span>` : '';
  const props = p.props.map((q) => {
    const P = PROPS[q.kind];
    const sink = P.sink ?? 0;
    return `<span class="lib__prop lib__prop--${q.kind}" aria-hidden="true" style="left:${q.x.toFixed(0)}px;width:${P.w}px;height:${P.h}px;bottom:${PLANK - sink}px"><svg viewBox="0 0 ${P.w} ${P.h}">${P.svg(q.r)}</svg></span>`;
  }).join('');
  const view = { ...sh, open: !locked };
  return `<div class="lib__row${locked ? ' is-locked' : ''}" data-stage="${escapeHTML(sh.stage)}" style="top:${CROWN + r * ROW}px" role="toolbar" aria-label="${escapeHTML(`${sh.label} shelf: ${sh.read} of ${sh.books.length} read${locked ? ', locked' : ''}`)}">
    <span class="lib__tags" aria-hidden="true"><span class="lib__tags-in"><span class="lib__plate">${escapeHTML(sh.label)}<b>${sh.read}/${sh.books.length}</b></span>${lockChip}</span></span>
    ${p.books.map((q) => bookHTML(q, view, look(q.b))).join('')}
    ${props}
    ${locked ? `<i class="lib__chain" aria-hidden="true" style="width:${Math.max(120, p.end - 40)}px"></i><span class="lib__padlock" aria-hidden="true">${PADLOCK}</span>` : ''}
    <i class="lib__plank" aria-hidden="true"></i>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* The library                                                         */
/* ------------------------------------------------------------------ */

/**
 * @param {HTMLElement} host  where the library goes (its contents are replaced)
 * @param {{ lib: ReturnType<import('../../core/learning/journey.js').libraryShelves>, stage?: number }} o
 *        `stage` is Chai's growth stage (a baby owl is drawn from the baby sheet)
 */
export async function renderLibrary(host, { lib, stage = 0 }) {
  await loadStyle();
  if (!host.isConnected) return;
  if (!lib?.books) {
    host.innerHTML = '<p class="lib__hint">The shelves are still being stocked. Open CAT OS online once and the books arrive.</p>';
    return;
  }

  const mem = readMemory();
  writeMemory(lib);
  const all = lib.shelves.flatMap((s) => s.books);
  /* What changed since the library was last on screen: a book read (or read
     better), a shelf that opened. Three or fewer is a learner coming back
     from a passage and is shown; more is a restored backup, kept quiet. */
  // The memory keeps two decimals, so anything closer than 0.01 is the same book.
  const was = (id) => (id in (mem?.clean ?? {}) ? Number(mem.clean[id]) || 0 : -1);
  let changed = mem ? all.filter((b) => b.read && was(b.id) < b.clean - 0.01) : [];
  if (changed.length > 3) changed = [];
  const openNow = lib.shelves.filter((s) => s.open).length;
  const opened = mem && changed.length && Number.isFinite(mem.open) ? lib.shelves.filter((s, i) => s.open && i >= mem.open && i < openNow) : [];
  const before = new Map(changed.map((b) => [b.id, was(b.id) < 0 ? null : was(b.id)]));
  const motion = !reduced();
  const story = motion && changed.length ? 'back' : 'arrive';
  /* A book about to be wiped is drawn as it was; every other book as it is. */
  const look = (b) => {
    if (story === 'back' && before.has(b.id)) { const prev = before.get(b.id); return { dust: 1 - (prev ?? 0), ribbon: prev !== null, gleam: false }; }
    return { dust: 1 - b.clean, ribbon: b.read, gleam: b.read && b.clean >= 1 };
  };
  const lockedNow = (sh) => !sh.open || (story === 'back' && opened.includes(sh));

  const L = layout(lib);
  const lamps = [];
  for (let x = 300; x < L.width - 120; x += 540) lamps.push(x);
  const motes = [];
  const mr = rng(7);
  for (const x of lamps) for (let i = 0; i < 4; i += 1) motes.push({ x: x - 120 + mr() * 240, y: 70 + mr() * (L.height - 220), mx: Math.round(-30 + mr() * 60), my: Math.round(40 + mr() * 80), md: (11 + mr() * 9).toFixed(1), mdel: (-mr() * 18).toFixed(1) });
  const ladderH = L.height - FLOOR + 30 - LADDER_TOP;
  const total = lib.books;

  host.innerHTML = `
    <section class="lib" aria-labelledby="lib-h">
      ${DEFS}
      <div class="lib__head">
        <div><h2 id="lib-h">Chai's library</h2><p class="lib__count"><b>${lib.read}</b> of ${total} books read · <b>${lib.gleaming}</b> gleaming</p></div>
      </div>
      <div class="lib__view">
        <div class="lib__case" style="width:${L.width}px;height:${L.height}px">
          ${lamps.map((x) => `<i class="lib__glow" aria-hidden="true" style="left:${x}px"></i>`).join('')}
          ${motes.map((m) => `<i class="lib__mote" aria-hidden="true" style="left:${m.x.toFixed(0)}px;top:${m.y.toFixed(0)}px;--mx:${m.mx}px;--my:${m.my}px;--md:${m.md}s;--mdel:${m.mdel}s"></i>`).join('')}
          <i class="lib__halo" aria-hidden="true" hidden></i>
          ${L.rows.map((p) => rowHTML(p, look, lockedNow)).join('')}
          <i class="lib__crown" aria-hidden="true"></i><i class="lib__rail" aria-hidden="true"></i>
          ${lamps.map((x) => `<span class="lib__lamp" aria-hidden="true" style="left:${x}px">${LAMP}</span>`).join('')}
          <i class="lib__floor" aria-hidden="true"></i>
          <i class="lib__end lib__end--l" aria-hidden="true"></i><i class="lib__end lib__end--r" aria-hidden="true"></i>
          <span class="lib__ladder" aria-hidden="true" style="height:${ladderH}px">${ladderSVG(ladderH)}</span>
          <span class="lib__owl" aria-hidden="true"><span class="lib__owl-fig"><i class="lib__wing lib__wing--l">${WING}</i><i class="lib__wing lib__wing--r">${WING}</i>${petSprite('chai', { frame: FRAME.idle, size: OWL, stage })}</span><p class="lib__say"></p></span>
          <span class="lib__fx" aria-hidden="true"></span>
        </div>
      </div>
      <p class="lib__hint">Swipe along the shelves and tap a book to read it. A shelf opens once half the shelf below it is read.</p>
      <p class="sr-only" aria-live="polite" id="lib-live"></p>
    </section>`;

  const root = host.querySelector('.lib');
  const view = root.querySelector('.lib__view');
  const kase = root.querySelector('.lib__case');
  const ladder = root.querySelector('.lib__ladder');
  const owl = root.querySelector('.lib__owl');
  const sprite = owl.querySelector('.pet-sprite');
  const bubble = owl.querySelector('.lib__say');
  const halo = root.querySelector('.lib__halo');
  const fx = root.querySelector('.lib__fx');
  const live = root.querySelector('#lib-live');
  const alive = () => root.isConnected;
  const bookEl = (id) => kase.querySelector(`.bk[data-id="${CSS.escape(id)}"]`);
  const rowIndex = new Map(L.rows.map((p) => [p.sh.stage, p]));

  /* ---------------- Where things are ---------------- */
  const posOf = (id) => {
    const hit = lib.byId.get(id);
    if (!hit) return null;
    const p = rowIndex.get(hit.shelf.stage);
    const q = p?.books.find((x) => x.b.id === id);
    return q ? { id, r: p.r, x: q.x, w: q.w, h: q.h } : null;
  };
  const ladderX = (pos) => (pos ? pos.x - LADDER_W - 5 : PAD - LADDER_W - 8);
  const feetY = (r) => CROWN + r * ROW + HEAD + BOOKS - 2;
  const perch = (pos) => ({ x: ladderX(pos) + LADDER_W / 2, y: feetY(pos ? pos.r : 0) });
  const topRow = 0;
  let cur = { x: 0, y: 0 };
  let ladderAt = 0;
  const setOwl = (p) => { cur = { ...p }; owl.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`; };
  const setLadder = (x) => { ladderAt = x; ladder.style.transform = `translateX(${x.toFixed(1)}px)`; };
  const setHalo = (pos) => {
    if (!pos) { halo.hidden = true; return; }
    halo.hidden = false;
    halo.style.left = `${pos.x + pos.w / 2}px`;
    halo.style.top = `${CROWN + pos.r * ROW + HEAD + BOOKS - pos.h / 2}px`;
  };
  const markNext = (id) => {
    for (const el of kase.querySelectorAll('.bk.is-next')) el.classList.remove('is-next');
    if (id) bookEl(id)?.classList.add('is-next');
  };

  /* ---------------- Chai ---------------- */
  let frame = FRAME.idle, sayTimer = 0;
  const setFrame = (f) => { frame = f; sprite?.style.setProperty('--f', String(f)); };
  const blink = () => {
    if (!alive()) return;
    if (frame === FRAME.idle) { sprite?.style.setProperty('--f', String(FRAME.blink)); setTimeout(() => { if (frame === FRAME.idle) sprite?.style.setProperty('--f', String(FRAME.idle)); }, 140); }
    setTimeout(blink, 2600 + Math.random() * 3600);
  };
  setTimeout(blink, 2200);
  const cheer = (ms = 1600) => { setFrame(FRAME.happy); setTimeout(() => { if (alive()) setFrame(FRAME.idle); }, ms); };
  const once = (cls) => { owl.classList.remove(cls); void owl.offsetWidth; owl.classList.add(cls); setTimeout(() => owl.classList.remove(cls), 700); };
  const say = (text, ms = 3400) => {
    if (!text || !alive()) return;
    bubble.textContent = text;
    bubble.classList.toggle('is-flip', cur.x > L.width - 230);
    bubble.classList.add('is-on');
    live.textContent = `Chai: ${text}`;
    voice('chai', text, { soft: true });
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => bubble.classList.remove('is-on'), ms);
  };

  /* ---------------- The camera: the page and the case follow Chai ---------------- */
  let cam = null;
  const owlPoint = () => {
    const a = owl.getBoundingClientRect(), k = kase.getBoundingClientRect();
    return { x: a.left - k.left, y: a.top - k.top - OWL * 0.45 };
  };
  const follow = (point = owlPoint, { lead = 0.56, k0 = 0.11 } = {}) => {
    cam?.stop();
    let raf = 0, done = false, last = performance.now();
    let sy = window.scrollY, sx = view.scrollLeft;
    const evs = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    /* base.css scrolls the page smoothly; a camera that sets the scroll every
       frame needs it instant while it runs, or each frame starts a new glide. */
    const html = document.documentElement, was = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    const stop = () => { if (done) return; done = true; cancelAnimationFrame(raf); html.style.scrollBehavior = was; for (const e of evs) window.removeEventListener(e, stop, true); };
    for (const e of evs) window.addEventListener(e, stop, { capture: true, passive: true });
    const tick = (now) => {
      if (done) return;
      if (!alive()) { stop(); return; }
      const dt = Math.min(64, now - last); last = now;
      const k = 1 - (1 - k0) ** (dt / 16.7);
      const p = point();
      const top = kase.getBoundingClientRect().top + window.scrollY;
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const ty = clamp(top + p.y - window.innerHeight * lead, 0, maxY);
      const tx = clamp(p.x - view.clientWidth * 0.4, 0, Math.max(0, view.scrollWidth - view.clientWidth));
      sy += (ty - sy) * k; sx += (tx - sx) * k;
      window.scrollTo(0, Math.round(sy));
      view.scrollLeft = Math.round(sx);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    cam = { stop };
    return cam;
  };
  const showAt = (x) => { view.scrollLeft = clamp(x - view.clientWidth * 0.4, 0, Math.max(0, view.scrollWidth - view.clientWidth)); };

  /* ---------------- Flying, rolling, landing ---------------- */
  const land = () => { owl.classList.remove('is-flying'); once('is-landed'); };
  const fly = (from, to, ms) => {
    owl.classList.add('is-flying');
    play('flap');
    const dx = to.x - from.x, dy = to.y - from.y;
    const c = Math.abs(dx) < 60 ? { x: from.x + 74, y: from.y + dy * 0.45 } : { x: from.x + dx * 0.5, y: Math.min(from.y, to.y) - 46 };
    const kf = [];
    const N = 28;
    let px = from.x, py = from.y;
    for (let i = 0; i <= N; i += 1) {
      const t = i / N, e = ease(t);
      const x = (1 - e) ** 2 * from.x + 2 * (1 - e) * e * c.x + e * e * to.x;
      // A small hop up before the glide.
      const y = (1 - e) ** 2 * from.y + 2 * (1 - e) * e * c.y + e * e * to.y - Math.sin(Math.min(1, t * 4) * Math.PI) * 10 * (t < 0.25 ? 1 : 0);
      const tilt = i ? clamp((x - px) * 1.4, -16, 16) + clamp((y - py) * 0.25, -6, 6) : 0;
      kf.push({ offset: t, transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(i === N ? 0 : tilt).toFixed(1)}deg)` });
      px = x; py = y;
    }
    const a = owl.animate(kf, { duration: ms, easing: 'linear', fill: 'forwards' });
    return a.finished.then(() => { setOwl(to); a.cancel(); land(); }, () => { setOwl(to); land(); });
  };
  const roll = async (toPos) => {
    const x0 = ladderAt, x1 = ladderX(toPos);
    const from = { ...cur }, to = perch(toPos);
    const ms = Math.round(clamp(520 + Math.abs(x1 - x0) * 0.75 + Math.abs(to.y - from.y) * 0.8, 700, 1900));
    ladder.classList.add('is-rolling');
    ladder.classList.toggle('is-left', x1 < x0);
    play('swoosh');
    const la = ladder.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${x1}px)` }], { duration: ms, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
    let ride;
    if (Math.abs(to.y - from.y) < 2) {
      ride = owl.animate([
        { transform: `translate(${from.x}px, ${from.y}px)` },
        { transform: `translate(${(from.x + to.x) / 2}px, ${from.y - 3}px) rotate(${x1 > x0 ? 4 : -4}deg)`, offset: 0.5 },
        { transform: `translate(${to.x}px, ${to.y}px)` },
      ], { duration: ms, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished.then(() => setOwl(to), () => setOwl(to));
    } else {
      ride = fly(from, to, ms);
    }
    setHalo(toPos);
    await Promise.all([la.finished.catch(() => {}), ride]);
    setLadder(x1); la.cancel();
    owl.getAnimations?.().forEach((x) => x.cancel());
    setOwl(to);
    ladder.classList.remove('is-rolling', 'is-left');
  };

  /* ---------------- Dust, cloth, sparkles ---------------- */
  const burst = (x, y, n, cls, spread) => {
    for (let i = 0; i < n; i += 1) {
      const el = document.createElement('i');
      el.className = cls;
      const a = Math.random() * Math.PI * 2, d = spread * (0.45 + Math.random() * 0.7);
      el.style.cssText = `left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d * 0.8 - 8).toFixed(0)}px;--s:${(8 + Math.random() * 12).toFixed(0)}px;--d:${Math.round(Math.random() * 260)}ms`;
      fx.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    }
  };
  const wipe = async (b, from) => {
    const el = bookEl(b.id), pos = posOf(b.id);
    if (!el || !pos) return;
    const cx = pos.x + pos.w / 2, top = CROWN + pos.r * ROW + HEAD + BOOKS - pos.h;
    const cloth = document.createElement('i');
    cloth.className = 'bk__cloth';
    el.appendChild(cloth);
    play('dust');
    burst(cx, top + 8, 9, 'lib__puff', 46);
    await sleep(160);
    el.style.setProperty('--dust', (1 - b.clean).toFixed(2));
    setTimeout(() => burst(cx, top + pos.h * 0.55, 6, 'lib__puff', 38), 420);
    await sleep(980);
    cloth.remove();
    if (!el.querySelector('.bk__rib')) el.insertAdjacentHTML('beforeend', '<i class="bk__rib"></i>');
    el.querySelector('.bk__web')?.remove();
    if (b.clean >= 1) {
      el.classList.add('is-gleaming', 'is-shine');
      burst(cx, top + pos.h * 0.4, 10, 'lib__spark', 54);
      play('star3');
    } else if (b.clean > (from ?? 0)) {
      burst(cx, top + pos.h * 0.4, 4, 'lib__spark', 40);
      play('star1');
    }
    setTimeout(() => el.classList.remove('is-shine'), 1000);
    await sleep(520);
  };
  const unlock = async (sh) => {
    const row = kase.querySelector(`.lib__row[data-stage="${CSS.escape(sh.stage)}"]`);
    if (!row) return;
    row.classList.add('is-unlocking');
    play('unlock');
    await sleep(700);
    const flash = document.createElement('i');
    flash.className = 'lib__flash';
    row.appendChild(flash);
    flash.animate([{ transform: 'translateX(-260px)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translateX(${L.width}px)`, opacity: 0.8 }], { duration: 1300, easing: 'cubic-bezier(.4,0,.3,1)' });
    await sleep(260);
    openRow(row, sh);
    await sleep(900);
    flash.remove();
    row.querySelector('.lib__padlock')?.remove();
    row.querySelector('.lib__plate--lock')?.remove();
    row.querySelector('.lib__chain')?.remove();
    row.classList.remove('is-unlocking');
  };
  /** A shelf that has just opened: its books become links. */
  const openRow = (row, sh) => {
    row.classList.remove('is-locked');
    row.setAttribute('aria-label', `${sh.label} shelf: ${sh.read} of ${sh.books.length} read`);
    for (const el of row.querySelectorAll('.bk')) {
      const b = lib.byId.get(el.dataset.id)?.book;
      if (!b) continue;
      el.removeAttribute('role'); el.removeAttribute('aria-disabled');
      el.setAttribute('href', `#/rc/session/${b.id}`);
      el.setAttribute('aria-label', `Book ${b.n}, ${displayTitle(b.item)}. ${b.read ? `Read, best ${Math.round(b.clean * 100)} percent right` : 'Not read yet'}.`);
    }
  };

  /* ---------------- Opening a book ---------------- */
  let opening = false;
  const openBook = async (el, b, sh) => {
    const r = el.getBoundingClientRect();
    const H = Math.round(clamp(window.innerHeight * 0.56, 260, 440)), W = Math.round(H * 0.7);
    const ov = document.createElement('div');
    ov.className = 'lib-open';
    ov.setAttribute('aria-hidden', 'true');
    ov.style.setProperty('--c', getComputedStyle(el).getPropertyValue('--c'));
    ov.style.setProperty('--lib-leather', getComputedStyle(root).getPropertyValue('--lib-leather'));
    ov.innerHTML = `<div class="lib-open__book" style="width:${W}px;height:${H}px"><div class="lib-open__back"></div><div class="lib-open__page"><small>${escapeHTML(sh.label)} · Book ${b.n}</small><strong>${escapeHTML(displayTitle(b.item))}</strong><i></i></div><div class="lib-open__cover"><span>${b.n}</span></div></div>`;
    document.body.appendChild(ov);
    const book = ov.firstElementChild, cover = book.querySelector('.lib-open__cover');
    const cx = (window.innerWidth - W) / 2, cy = (window.innerHeight - H) / 2;
    el.style.visibility = 'hidden';
    play('page');
    ov.animate([{ background: 'rgba(16,10,5,0)' }, { background: 'rgba(16,10,5,0.62)' }], { duration: 420, fill: 'forwards' });
    await book.animate([
      { transform: `translate(${r.left}px, ${r.top}px) scale(${(r.width / W).toFixed(3)}, ${(r.height / H).toFixed(3)}) rotateY(78deg)` },
      { transform: `translate(${(r.left + cx) / 2}px, ${Math.min(r.top, cy) - 30}px) scale(0.62) rotateY(30deg)`, offset: 0.55 },
      { transform: `translate(${cx}px, ${cy}px) scale(1) rotateY(0deg)` },
    ], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    play('open');
    await cover.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-160deg)' }], { duration: 640, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
    return ov;
  };
  const closeOverlay = (ov) => {
    if (!ov?.isConnected) return;
    const book = ov.firstElementChild;
    book.animate([{ opacity: 1 }, { opacity: 0, transform: `${getComputedStyle(book).transform} scale(1.35)` }], { duration: 360, easing: 'ease-in', fill: 'forwards' });
    ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'forwards' }).finished.then(() => ov.remove(), () => ov.remove());
    setTimeout(() => ov.remove(), 1200);
  };

  /* ---------------- Touch and keys ---------------- */
  const lockedTap = (el, sh) => {
    el.classList.remove('is-rattle'); void el.offsetWidth; el.classList.add('is-rattle');
    setTimeout(() => el.classList.remove('is-rattle'), 420);
    play('tap');
    once('is-nope');
    say(SAY.locked(sh));
  };
  kase.addEventListener('click', (e) => {
    const el = e.target.closest?.('.bk');
    if (!el) return;
    const hit = lib.byId.get(el.dataset.id);
    if (!hit) return;
    const { book: b, shelf: sh } = hit;
    if (el.closest('.lib__row.is-locked') || !sh.open) { e.preventDefault(); lockedTap(el, sh); return; }
    cam?.stop();
    if (reduced() || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (opening) return;
    opening = true;
    cheer(900);
    const go = `#/rc/session/${b.id}`;
    openBook(el, b, sh).then((ov) => {
      const outlet = document.getElementById('view');
      let shut = false;
      const finish = () => { if (shut) return; shut = true; obs?.disconnect(); setTimeout(() => closeOverlay(ov), 120); };
      const obs = outlet ? new MutationObserver(finish) : null;
      obs?.observe(outlet, { childList: true });
      setTimeout(finish, 1500);
      location.hash = go;
    }, () => { location.hash = go; });
  });
  kase.addEventListener('keydown', (e) => {
    const el = e.target.closest?.('.bk');
    if (!el) return;
    if ((e.key === 'Enter' || e.key === ' ') && el.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      const hit = lib.byId.get(el.dataset.id);
      if (hit) lockedTap(el, hit.shelf);
      return;
    }
    const row = el.closest('.lib__row');
    const books = [...row.querySelectorAll('.bk')];
    const i = books.indexOf(el);
    let to = null;
    if (e.key === 'ArrowRight') to = books[i + 1];
    else if (e.key === 'ArrowLeft') to = books[i - 1];
    else if (e.key === 'Home') to = books[0];
    else if (e.key === 'End') to = books[books.length - 1];
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const rows = [...kase.querySelectorAll('.lib__row')];
      const next = rows[rows.indexOf(row) + (e.key === 'ArrowUp' ? -1 : 1)];
      if (next) {
        const x = el.offsetLeft;
        to = [...next.querySelectorAll('.bk')].reduce((best, b) => (!best || Math.abs(b.offsetLeft - x) < Math.abs(best.offsetLeft - x) ? b : best), null);
      }
    }
    if (!to) return;
    e.preventDefault();
    for (const b of to.closest('.lib__row').querySelectorAll('.bk')) b.tabIndex = -1;
    to.tabIndex = 0;
    to.focus();
  });
  /* One Tab stop per shelf: Chai's book on his shelf, book 1 on the others. */
  for (const row of kase.querySelectorAll('.lib__row')) {
    const books = row.querySelectorAll('.bk');
    const mine = lib.owl ? row.querySelector(`.bk[data-id="${CSS.escape(lib.owl.id)}"]`) : null;
    (mine ?? books[0])?.setAttribute('tabindex', '0');
  }

  window.addEventListener('hashchange', () => cam?.stop(), { once: true });

  /* ---------------- The story ---------------- */
  const target = lib.owl ? posOf(lib.owl.id) : null;
  const nextLine = () => (lib.owl ? (lib.owl.read ? (lib.owl.clean >= 1 ? '' : 'This one could shine brighter.') : SAY.next(lib.owl)) : SAY.done);
  /* Everything is placed before this returns; what moves runs on its own. */
  const arrive = async () => {
    setLadder(ladderX(target));
    markNext(lib.owl?.id);
    if (!motion || !target || target.r === topRow) {
      setOwl(perch(target));
      setHalo(target);
      showAt(perch(target).x);
      if (motion && (target || lib.read)) setTimeout(() => { if (alive()) { cheer(); say(!target ? SAY.done : mem ? nextLine() : SAY.first); } }, 700);
      return;
    }
    const top = { x: ladderX(target) + LADDER_W / 2, y: feetY(topRow) };
    setOwl(top);
    showAt(top.x);
    await sleep(700);
    if (!alive()) return;
    follow();
    await fly(top, perch(target), 900 + 230 * target.r);
    if (!alive()) return;
    setHalo(target);
    cheer();
    say(mem ? nextLine() : SAY.first);
    setTimeout(() => cam?.stop(), 700);
  };

  /* Coming back from a passage: the book first, then the shelf, then Chai moves on. */
  const comeBack = async () => {
    const fromPos = mem?.owl ? posOf(mem.owl) : null;
    setLadder(ladderX(fromPos ?? posOf(changed[0].id)));
    setOwl(perch(fromPos ?? posOf(changed[0].id)));
    markNext(null);
    showAt(cur.x);
    await sleep(450);
    for (const b of changed) {
      if (!alive()) return;
      const pos = posOf(b.id);
      if (!pos) continue;
      follow(() => ({ x: pos.x + pos.w / 2, y: CROWN + pos.r * ROW + HEAD + BOOKS / 2 }), { k0: 0.13 });
      await sleep(650);
      if (!alive()) return;
      await wipe(b, before.get(b.id));
      if (!alive()) return;
      cheer(1400);
      once('is-hop');
      say(b.clean >= 1 ? SAY.gleam : b.clean > (before.get(b.id) ?? 0) ? SAY.better : SAY.dusty, 2600);
      await sleep(900);
    }
    for (const sh of opened) {
      if (!alive()) return;
      const p = rowIndex.get(sh.stage);
      if (!p) continue;
      follow(() => ({ x: PAD + 140, y: CROWN + p.r * ROW + HEAD + BOOKS / 2 }), { k0: 0.12 });
      await sleep(700);
      await unlock(sh);
    }
    if (!alive()) return;
    if (opened.length) {
      // Back to Chai, who says so where the learner can see him.
      follow();
      await sleep(650);
      if (!alive()) return;
      cheer();
      once('is-hop');
      say(SAY.open(opened[opened.length - 1]), 2400);
      await sleep(1900);
    }
    if (!alive()) return;
    if (target) {
      follow();
      await roll(target);
      if (!alive()) return;
      markNext(lib.owl.id);
      cheer();
      say(nextLine());
      setTimeout(() => cam?.stop(), 800);
    } else {
      cam?.stop();
      cheer(2400);
      say(SAY.done);
    }
  };

  (story === 'arrive' ? arrive() : comeBack()).catch((err) => console.error('[CAT OS] library', err));
}
