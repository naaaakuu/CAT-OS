/**
 * sprite.js — how a pet, a gift and a painted backdrop are drawn in HTML.
 *
 * Pets are baked five-frame sheets (tools/bake-pets.mjs). A sprite is one
 * span whose background shows a frame; changing `--f` on it changes the
 * frame, so blinking and talking cost nothing but a style write. `--size`
 * is the drawn height in px (a unitless number, so the map can multiply it
 * by its own scale).
 */

import { SHEETS } from './sheets.js';
import { MAP, CROPS, HOMES } from './paths.js';
import { PET_BY_ID } from './pets.js';

export const FRAME = Object.freeze({ idle: 0, blink: 1, happy: 2, talk: 3, sleep: 4 });

/** @param {string} id pet id @param {{frame?:number,size?:number,cls?:string,label?:string}} o */
export function petSprite(id, { frame = 0, size = 96, cls = '', label = '' } = {}) {
  const s = SHEETS[id];
  if (!s) return '';
  const aria = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return `<span class="pet-sprite ${cls}" data-pet-sprite="${id}"${aria} style="--fw:${s.w};--g:${s.gutter};--f:${frame};--size:${size};background-image:url(./assets/art/pet-${id}.png)"></span>`;
}

/** A round portrait: the sprite in a disc, with a ring the mood can colour. */
export function petPortrait(id, size = 56, { mood = null, frame = 0 } = {}) {
  const ring = mood === null ? '' : ` style="--mood:${Math.round(mood * 100)}"`;
  return `<span class="pet-portrait pet-portrait--${id}"${ring}><span class="pet-portrait__disc" style="--ps:${size}px">${petSprite(id, { frame, size: Math.round(size * 1.08) })}</span></span>`;
}

const OUT = '#4a3a2a';
const ICONS = {
  sparks: `<path d="M12 2.6c2.4 3.3 6.2 6.2 6.2 11a6.2 6.2 0 0 1-12.4 0c0-2.7 1.3-4.5 2.7-6 .2 1.6.9 2.9 2.1 3.5-.5-3.1.3-6 1.4-8.5z" fill="#F2A23C" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 11.4c1.3 1.6 2.6 2.7 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.5.9-2.9 2.6-4.6z" fill="#FFD978"/>`,
  stories: `<path d="M4.5 5.2c2.6-.9 5.1-.7 7.5.8v13c-2.4-1.5-4.9-1.7-7.5-.8z" fill="#F6E8CB" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/><path d="M19.5 5.2c-2.6-.9-5.1-.7-7.5.8v13c2.4-1.5 4.9-1.7 7.5-.8z" fill="#B9553C" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/><path d="M14.4 10.2c1.2-.5 2.4-.6 3.4-.3M14.4 13c1.2-.5 2.4-.6 3.4-.3" stroke="#F3D7A4" stroke-width="1.1" stroke-linecap="round"/><path d="M6.6 9.4c1.2-.2 2.2 0 3.2.6M6.6 12.2c1.2-.2 2.2 0 3.2.6" stroke="#C9B48E" stroke-width="1.1" stroke-linecap="round"/>`,
  leaves: `<path d="M4.6 19.4C3.7 10.6 9.6 4.4 19.8 4.2c.3 10.2-5.6 16-15.2 15.2z" fill="#8DB560" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/><path d="M5 19.1 16.2 8M9.4 14.6l-.2-3.6M12.4 11.6l3 .3" stroke="#5E8A3C" stroke-width="1.2" stroke-linecap="round"/>`,
  notes: `<rect x="5" y="4" width="14" height="16.5" rx="2" fill="#FBF3E0" stroke="${OUT}" stroke-width="1.4"/><path d="M8 9.2h8M8 12.3h8M8 15.4h5.2" stroke="#8796AE" stroke-width="1.3" stroke-linecap="round"/><path d="M8 2.6v3M12 2.6v3M16 2.6v3" stroke="${OUT}" stroke-width="1.4" stroke-linecap="round"/>`,
  maps: `<path d="M3 6.2 8.6 4l6.8 2.4L21 4.2v13.6l-5.6 2.2-6.8-2.4L3 19.8z" fill="#EBD9A6" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/><path d="M8.6 4v13.6M15.4 6.4V20" stroke="${OUT}" stroke-width="1" opacity=".5"/><path d="M5.6 15.2c2.2-.6 3.4-3.4 5.6-3.8s3.6 1.4 6.4-1.8" fill="none" stroke="#C2513A" stroke-width="1.3" stroke-dasharray="1.6 1.6" stroke-linecap="round"/><circle cx="17.6" cy="9.4" r="1.2" fill="#C2513A"/>`,
  stardust: `<path d="M12 2.4l2.1 7.5 7.5 2.1-7.5 2.1L12 21.6l-2.1-7.5L2.4 12l7.5-2.1z" fill="#C3D6F2" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/><path d="M19 3.6l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6zM5.2 16.6l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" fill="#FFF3C4" stroke="${OUT}" stroke-width=".8"/>`,
};

/** A gift's little picture. */
export function giftIcon(kind, size = 20, cls = '') {
  const body = ICONS[kind];
  if (!body) return '';
  return `<svg class="gift gift--${kind} ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * The painted crop of a home, as inline style. In a box (a card's hero) the
 * painting is scaled so the crop fills the box's width. On the screen
 * (`screen: true`), it covers the viewport, zoomed in no further than it
 * needs to frame the home, with the home centred at `focusY` of the height.
 */
export function backdropStyle(key, { screen = false, focusY = 0.5 } = {}) {
  const c = CROPS[key] ?? CROPS.plaza;
  if (screen && typeof innerWidth === 'number') return fitStyle(screenFit(c, { focusY }));
  const size = (MAP.w / c.w) * 100;
  const px = (c.x / (MAP.w - c.w)) * 100;
  const py = (c.y / Math.max(1, MAP.h - c.h)) * 100;
  return `background-image:url(${MAP.src});background-size:${size.toFixed(1)}% auto;background-position:${px.toFixed(1)}% ${py.toFixed(1)}%`;
}

/**
 * How the painting sits on this screen to frame crop `c`: its scale and
 * offset, covering the viewport, never zoomed in less than `zoom`, with the
 * point `at` (the crop's centre by default) at `focusY` of the height when
 * the painting's edges allow.
 */
function screenFit(c, { focusY = 0.5, zoom = 0, at = null } = {}) {
  const W = innerWidth || 390, H = innerHeight || 844;
  const s = Math.max(W / MAP.w, H / MAP.h, 0.6 * Math.min(W / c.w, H / c.h), zoom);
  const p = at ?? { x: c.x + c.w / 2, y: c.y + c.h / 2 };
  const ox = Math.min(0, Math.max(W - MAP.w * s, W / 2 - p.x * s));
  const oy = Math.min(0, Math.max(H - MAP.h * s, H * focusY - p.y * s));
  return { s, ox, oy };
}
const fitStyle = ({ s, ox, oy }) => `background-image:url(${MAP.src});background-size:${Math.ceil(MAP.w * s)}px auto;background-position:${Math.round(ox)}px ${Math.round(oy)}px`;

/**
 * A place's hero: the host's home filling the screen, and the point on the
 * screen where its painted door is, so the pet stands at its own door. On a
 * phone it comes a little closer, so every door clears the sheet below.
 */
export function placeHero(id, { focusY = 0.44 } = {}) {
  const c = CROPS[id] ?? CROPS.plaza, door = HOMES[id]?.door;
  if (typeof innerWidth !== 'number') return { style: backdropStyle(id), door: null };
  const f = screenFit(c, { focusY, zoom: innerWidth < 700 ? 1.25 : 0, at: door });
  return { style: fitStyle(f), door: door ? { x: Math.round(door.x * f.s + f.ox), y: Math.round(door.y * f.s + f.oy) } : null };
}

/** A full-screen painted backdrop for a pet's home (or 'cottage', 'clock', 'plaza'). */
export function paintedBackdrop(key, { cls = '' } = {}) {
  return `<div class="pv-backdrop ${cls}" aria-hidden="true"><i style="${backdropStyle(key, { screen: true })}"></i></div>`;
}

/** The small host chip: a portrait and a name, for session bars and headers. */
export function hostChip(id, size = 28) {
  const p = PET_BY_ID.get(id);
  return p ? `<span class="pv-host pv-host--${id}">${petPortrait(id, size)}<b>${p.name}</b></span>` : '';
}
