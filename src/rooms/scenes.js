/**
 * scenes.js — the four houses, drawn. Each takes the room's model and returns
 * its scene as HTML: every item a real button, every solved item a real thing
 * in the room. Hand-set SVG and CSS, so a whole railway costs a few kilobytes.
 *
 *   railway   each jumble you solve couples a carriage onto a train
 *   sky       each stray you find leaves a named constellation behind
 *   clock     each gap you fill sets another cog turning
 *   table     each sentence you seat is a guest at the table
 *   pantry    each paragraph you boil down is a jar with its one true line inside
 */

import { escapeHTML as esc } from '../core/utils/format.js';

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (seed) => { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; };
const label = (x) => `${esc(x.title)}${x.state === 'solved' ? ', solved' : x.state === 'tried' ? ', got away' : ''}`;
const flag = (x, next) => `is-${x.state}${next?.id === x.id ? ' is-next' : ''}`;
const shut = (tier, x) => (tier.open || x.state === 'solved' ? '' : 'disabled');
const hearing = (tier) => `<span class="rm-sign__c">${tier.done}/${tier.total}</span>`;

/* ------------------------------------------------------------------ */
/* Ginger's Railway                                                     */
/* ------------------------------------------------------------------ */

const LIVERY = { beginner: '#b5533c', foundation: '#b5533c', easy: '#c88a2e', medium: '#5e8a3c', advanced: '#2f7a78', cat: '#3a5e9a', 'cat-plus': '#6a4a9a', 'ninety-nine': '#8a3a6a', premium: '#34344a' };

function carriage(x, color) {
  const lit = x.state === 'solved';
  const win = lit ? '#ffe29a' : x.state === 'tried' ? '#6b5a4a' : '#2d2a3b';
  const body = x.state === 'open' ? '#5a4a3c' : color;
  return `<svg viewBox="0 0 124 72" width="124" height="72" aria-hidden="true">
    <rect x="0" y="48" width="9" height="7" fill="#2b2118"/><rect x="115" y="48" width="9" height="7" fill="#2b2118"/>
    <rect x="10" y="8" width="104" height="11" rx="5.5" fill="#3a2a1e" stroke="#2b2118" stroke-width="2.5"/>
    <rect x="12" y="16" width="100" height="36" rx="4" fill="${body}" stroke="#2b2118" stroke-width="3"/>
    ${[20, 50, 80].map((wx) => `<rect x="${wx}" y="23" width="24" height="17" rx="2.5" fill="${win}" stroke="#2b2118" stroke-width="2.2"/>`).join('')}
    ${lit ? '<rect x="12" y="44" width="100" height="4" fill="#f4c443" opacity=".9"/>' : ''}
    <rect x="51" y="41" width="22" height="12" rx="3" fill="#fbf3e0" stroke="#2b2118" stroke-width="1.6"/>
    <text x="62" y="50.4" text-anchor="middle" font-size="9.5" font-weight="800" fill="#2b2118" font-family="system-ui,sans-serif">${x.n}</text>
    <rect x="14" y="52" width="96" height="6" fill="#2b2118"/>
    <g class="rw-wheel" style="transform-origin:36px 61px"><circle cx="36" cy="61" r="9.5" fill="#55463a" stroke="#2b2118" stroke-width="2.6"/><path d="M36 53v16M28 61h16" stroke="#2b2118" stroke-width="2"/></g>
    <g class="rw-wheel" style="transform-origin:88px 61px"><circle cx="88" cy="61" r="9.5" fill="#55463a" stroke="#2b2118" stroke-width="2.6"/><path d="M88 53v16M80 61h16" stroke="#2b2118" stroke-width="2"/></g>
  </svg>`;
}

const ENGINE = (color) => `<svg viewBox="0 0 134 80" width="134" height="80" aria-hidden="true">
  <rect x="124" y="56" width="10" height="7" fill="#2b2118"/>
  <rect x="78" y="10" width="46" height="46" rx="4" fill="${color}" stroke="#2b2118" stroke-width="3"/>
  <rect x="84" y="17" width="34" height="19" rx="3" fill="#ffe29a" stroke="#2b2118" stroke-width="2.4"/>
  <rect x="72" y="6" width="58" height="9" rx="4" fill="#3a2a1e" stroke="#2b2118" stroke-width="2.5"/>
  <rect x="14" y="27" width="66" height="30" rx="14" fill="#3f3f52" stroke="#2b2118" stroke-width="3"/>
  <rect x="26" y="8" width="15" height="22" rx="3" fill="#2f2f3d" stroke="#2b2118" stroke-width="3"/>
  <circle cx="16" cy="42" r="8" fill="#f4c443" stroke="#2b2118" stroke-width="2.6"/>
  <path d="M5 62h119v5H5z" fill="#2b2118"/>
  ${[30, 62, 102].map((cx) => `<g class="rw-wheel" style="transform-origin:${cx}px 67px"><circle cx="${cx}" cy="67" r="${cx === 102 ? 12 : 10}" fill="#7a2e2e" stroke="#2b2118" stroke-width="2.8"/><path d="M${cx} ${67 - 9}v18M${cx - 9} 67h18" stroke="#2b2118" stroke-width="2"/></g>`).join('')}
</svg>`;

export function railway(m) {
  const rows = [...m.tiers].reverse().map((t) => {
    const color = LIVERY[t.id] ?? '#7a5a3a';
    const moving = t.done === t.total && t.total > 0;
    return `
      <section class="rw-line ${t.open ? '' : 'is-shut'} ${moving ? 'is-full' : ''}">
        <header class="rm-sign"><b>${esc(t.label)}</b>${hearing(t)}</header>
        <div class="rw-track" tabindex="-1">
          <div class="rw-train">
            <div class="rw-engine"><i class="rw-smoke"></i>${ENGINE(color)}</div>
            ${t.items.map((x) => `<button class="rw-car ${flag(x, m.next)}" data-id="${esc(x.id)}" ${shut(t, x)} aria-label="${label(x)}">${carriage(x, color)}</button>`).join('')}
          </div>
        </div>
      </section>`;
  }).join('');
  return `<div class="rw">${rows}</div>`;
}

/* ------------------------------------------------------------------ */
/* Mallow's Sky                                                         */
/* ------------------------------------------------------------------ */

/* Star shapes people actually recognise as constellations: a dipper, a W, a kite, a hook. */
const SHAPES = [
  [[18, 62], [48, 46], [78, 56], [118, 26]], [[16, 28], [50, 66], [84, 30], [122, 62]], [[28, 72], [34, 26], [92, 22], [116, 68]],
  [[20, 22], [62, 40], [46, 76], [112, 62]], [[14, 54], [54, 22], [96, 52], [128, 20]], [[30, 18], [28, 64], [82, 74], [118, 34]],
  [[18, 40], [60, 74], [100, 64], [126, 22]], [[24, 74], [60, 58], [64, 18], [120, 36]],
];

function constellation(x) {
  const r = rnd(x.id);
  const shape = SHAPES[Math.floor(r() * SHAPES.length)];
  const flip = r() < 0.5;
  const pts = shape.map(([px, py]) => [Math.round((flip ? 150 - px : px) + (r() - 0.5) * 12), Math.round(py + (r() - 0.5) * 10)]);
  const lit = x.state === 'solved';
  const lines = pts.slice(1).map((p, i) => `<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${p[0]}" y2="${p[1]}"/>`).join('');
  const stars = pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === 1 && lit ? 4.6 : 3.3}" style="--d:${(r() * 3).toFixed(2)}s"/>`).join('');
  return `<svg viewBox="0 0 150 94" width="150" height="94" aria-hidden="true">
    ${lit || x.state === 'tried' ? `<g class="sk-lines">${lines}</g>` : ''}
    <g class="sk-stars">${stars}</g>
  </svg>`;
}

export function sky(m) {
  const bands = [...m.tiers].reverse().map((t) => `
    <section class="sk-band ${t.open ? '' : 'is-shut'}">
      <header class="rm-sign"><b>${esc(t.label)}</b>${hearing(t)}</header>
      <div class="sk-cells">
        ${t.items.map((x) => `<button class="sk-c ${flag(x, m.next)}" data-id="${esc(x.id)}" ${shut(t, x)} aria-label="${label(x)}">${constellation(x)}<span>${x.state === 'solved' ? esc(x.title) : ''}</span></button>`).join('')}
      </div>
    </section>`).join('');
  return `<div class="sk"><div class="sk-stardust"></div>${bands}<div class="sk-dome" aria-hidden="true"></div></div>`;
}

/* ------------------------------------------------------------------ */
/* Sesame's Clockworks                                                  */
/* ------------------------------------------------------------------ */

function gearPath(teeth = 12, R = 46, r = 37, hole = 13) {
  const step = (Math.PI * 2) / teeth;
  let d = '';
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step, pts = [[a - step * 0.28, r], [a - step * 0.16, R], [a + step * 0.16, R], [a + step * 0.28, r]];
    for (const [ang, rad] of pts) d += `${d ? 'L' : 'M'}${(50 + Math.cos(ang) * rad).toFixed(1)} ${(50 + Math.sin(ang) * rad).toFixed(1)}`;
  }
  return `${d}Z M${50 + hole} 50A${hole} ${hole} 0 1 0 ${50 - hole} 50A${hole} ${hole} 0 1 0 ${50 + hole} 50Z`;
}
const GEAR = gearPath();

function clockFace(m) {
  const share = m.total ? m.solved / m.total : 0;
  const minute = share * 360 * 6, hour = share * 360;
  return `<svg class="ck-face" viewBox="0 0 200 200" width="190" height="190" aria-hidden="true">
    <circle cx="100" cy="100" r="96" fill="#2a2138" stroke="#d9a93b" stroke-width="5"/>
    <circle cx="100" cy="100" r="84" fill="#f6ecd4" stroke="#2b2118" stroke-width="3"/>
    ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; const big = i % 3 === 0; return `<line x1="${100 + Math.sin(a) * (big ? 66 : 72)}" y1="${100 - Math.cos(a) * (big ? 66 : 72)}" x2="${100 + Math.sin(a) * 80}" y2="${100 - Math.cos(a) * 80}" stroke="#2b2118" stroke-width="${big ? 5 : 2.5}" stroke-linecap="round"/>`; }).join('')}
    <g transform="rotate(${hour} 100 100)"><rect x="96" y="56" width="8" height="48" rx="4" fill="#2b2118"/></g>
    <g transform="rotate(${minute} 100 100)"><rect x="97.5" y="34" width="5" height="70" rx="2.5" fill="#c2513a"/></g>
    <circle cx="100" cy="100" r="7" fill="#d9a93b" stroke="#2b2118" stroke-width="2.5"/>
  </svg>`;
}

export function clock(m) {
  let i = 0;
  const bands = [...m.tiers].reverse().map((t) => `
    <section class="ck-band ${t.open ? '' : 'is-shut'}">
      <header class="rm-sign"><b>${esc(t.label)}</b>${hearing(t)}</header>
      <div class="ck-cells">
        ${t.items.map((x) => { i += 1; const flip = i % 2 ? '' : 'is-rev'; return `<button class="ck-c ${flag(x, m.next)} ${flip}" data-id="${esc(x.id)}" ${shut(t, x)} aria-label="${label(x)}"><svg viewBox="0 0 100 100" width="104" height="104" aria-hidden="true"><path class="ck-gear" d="${GEAR}" fill-rule="evenodd"/></svg><b>${x.n}</b></button>`; }).join('')}
      </div>
    </section>`).join('');
  return `<div class="ck"><div class="ck-tower">${clockFace(m)}<div class="ck-pendulum ${m.solved ? 'is-going' : ''}"><i></i></div></div>${bands}</div>`;
}

/* ------------------------------------------------------------------ */
/* Biscuit's Long Table                                                 */
/* ------------------------------------------------------------------ */

function place(x, side) {
  const lit = x.state === 'solved';
  return `<svg viewBox="0 0 118 92" width="118" height="92" aria-hidden="true" ${side === 'r' ? 'style="transform:scaleX(-1)"' : ''}>
    <rect x="4" y="22" width="26" height="48" rx="11" fill="#7a4a2c" stroke="#2b2118" stroke-width="3"/>
    <rect x="10" y="30" width="15" height="32" rx="7" fill="${lit ? '#c2513a' : '#5a3a26'}"/>
    <circle cx="76" cy="46" r="27" fill="#fbf3e0" stroke="#2b2118" stroke-width="3"/>
    <circle cx="76" cy="46" r="18" fill="${lit ? '#f2e3c2' : '#efe3c8'}" stroke="#b8a884" stroke-width="2"/>
    ${lit ? `<g><circle cx="76" cy="46" r="12.5" fill="#fffaf0" stroke="#2b2118" stroke-width="2.4"/><circle cx="76" cy="46" r="8" fill="#a06a3a"/><path d="M88 41c6-2 8 8 1 9" fill="none" stroke="#2b2118" stroke-width="2.4"/><circle cx="104" cy="20" r="7" fill="#d9667b" stroke="#2b2118" stroke-width="2"/><path d="M104 27c-1 6-5 9-9 10" fill="none" stroke="#5e8a3c" stroke-width="2.6"/></g>` : ''}
  </svg>`;
}

export function table(m) {
  const bands = [...m.tiers].reverse().map((t) => {
    const seats = [];
    for (let i = 0; i < t.items.length; i += 2) seats.push([t.items[i], t.items[i + 1] ?? null]);
    return `
      <section class="tb-band ${t.open ? '' : 'is-shut'}">
        <header class="rm-sign"><b>${esc(t.label)}</b>${hearing(t)}</header>
        ${seats.map(([a, b]) => `
          <div class="tb-row">
            <button class="tb-s tb-s--l ${flag(a, m.next)}" data-id="${esc(a.id)}" ${shut(t, a)} aria-label="${label(a)}">${place(a, 'l')}<span>${a.state === 'solved' ? esc(a.title) : ''}</span></button>
            <i class="tb-candle" aria-hidden="true"></i>
            ${b ? `<button class="tb-s tb-s--r ${flag(b, m.next)}" data-id="${esc(b.id)}" ${shut(t, b)} aria-label="${label(b)}">${place(b, 'r')}<span>${b.state === 'solved' ? esc(b.title) : ''}</span></button>` : '<span class="tb-s tb-s--r"></span>'}
          </div>`).join('')}
      </section>`;
  }).join('');
  return `<div class="tb"><div class="tb-cloth" aria-hidden="true"></div>${bands}</div>`;
}

/* ------------------------------------------------------------------ */
/* Mochi's Pantry                                                       */
/* ------------------------------------------------------------------ */

const LIQUOR = { beginner: '#e9a23b', foundation: '#e9a23b', easy: '#d9704a', medium: '#8fb04a', advanced: '#3f9aa0', cat: '#5a78c8', 'cat-plus': '#8a5ac0', 'ninety-nine': '#c0507a', premium: '#d8b23c' };

function jar(x, tierId) {
  const level = x.state === 'solved' ? 16 : x.state === 'tried' ? 44 : 78;
  const c = LIQUOR[tierId] ?? '#c98a2e';
  return `<svg viewBox="0 0 70 92" width="70" height="92" aria-hidden="true">
    <rect x="16" y="3" width="38" height="13" rx="3.5" fill="${x.state === 'solved' ? '#b9553c' : '#6a5a4a'}" stroke="#2b2118" stroke-width="2.6"/>
    <path d="M14 16h42l5 10v54a8 8 0 0 1-8 8H17a8 8 0 0 1-8-8V26z" fill="rgba(255,250,235,.16)" stroke="#2b2118" stroke-width="2.8" stroke-linejoin="round"/>
    ${x.state !== 'open' ? `<path d="M11 ${level + 10}H59V80a6 6 0 0 1-6 6H17a6 6 0 0 1-6-6z" fill="${c}" opacity="${x.state === 'solved' ? 0.94 : 0.42}"/>` : ''}
    <rect x="17" y="44" width="36" height="24" rx="3" fill="#fbf3e0" stroke="#2b2118" stroke-width="2.2"/>
    <text x="35" y="60.5" text-anchor="middle" font-size="13" font-weight="800" fill="#2b2118" font-family="system-ui,sans-serif">${x.n}</text>
    <path d="M18 24v36" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".5"/>
  </svg>`;
}

export function pantry(m) {
  const bands = [...m.tiers].reverse().map((t) => `
    <section class="pn-band ${t.open ? '' : 'is-shut'}">
      <header class="rm-sign"><b>${esc(t.label)}</b>${hearing(t)}</header>
      <div class="pn-shelf">
        ${t.items.map((x) => `<button class="pn-j ${flag(x, m.next)}" data-id="${esc(x.id)}" ${shut(t, x)} aria-label="${label(x)}">${jar(x, t.id)}</button>`).join('')}
      </div>
    </section>`).join('');
  return `<div class="pn">${bands}</div>`;
}
