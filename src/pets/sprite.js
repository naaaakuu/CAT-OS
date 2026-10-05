/**
 * sprite.js — how a pet, a gift and a painted backdrop are drawn in HTML.
 *
 * Pets are baked five-frame sheets (tools/bake-pets.mjs). A sprite is one
 * span whose background shows a frame; changing `--f` on it changes the
 * frame, so blinking and talking cost nothing but a style write. `--size`
 * is the drawn height in px (a unitless number, so the map can multiply it
 * by its own scale).
 */

import { SHEETS, BABY_SHEETS } from './sheets.js';
import { MAP, CROPS, HOMES } from './paths.js';
import { PET_BY_ID, ageOf } from './pets.js';

export const FRAME = Object.freeze({ idle: 0, blink: 1, happy: 2, talk: 3, sleep: 4 });

/* A friend who has not grown out of babyhood (pets.js AGES) is drawn from
   the baby sheet: the same painting, bigger eyes, a shorter body. */
const sheetOf = (id, stage) => (ageOf(stage).id === 'baby'
  ? { s: BABY_SHEETS[id], src: `./assets/art/pet-${id}-baby.png` }
  : { s: SHEETS[id], src: `./assets/art/pet-${id}.png` });

/** @param {string} id pet id @param {{frame?:number,size?:number,cls?:string,label?:string,stage?:number}} o  no stage: grown up */
export function petSprite(id, { frame = 0, size = 96, cls = '', label = '', stage = 10 } = {}) {
  const { s, src } = sheetOf(id, stage);
  if (!s) return '';
  const aria = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return `<span class="pet-sprite ${cls}" data-pet-sprite="${id}"${aria} style="--fw:${s.w};--sh:${s.h};--g:${s.gutter};--f:${frame};--size:${size};background-image:url(${src})"></span>`;
}

/**
 * A pet that can walk: the same frame cut in three, so its two feet step
 * on their own under the body (home.css .rig). At rest the three pieces
 * are exactly the one picture; a lifted foot slides up behind the body.
 */
export function petRig(id, { frame = 0, size = 96, stage = 10 } = {}) {
  const { s, src } = sheetOf(id, stage);
  if (!s) return '';
  const f = s.feet ?? { top: s.h, split: Math.round(s.w / 2) };
  // The picture goes on each piece's own style: a url() inside a custom
  // property resolves against the stylesheet that uses it, not the page.
  const img = `style="background-image:url(${src})"`;
  return `<span class="pet-sprite rig" data-pet-sprite="${id}" aria-hidden="true" style="--fw:${s.w};--sh:${s.h};--g:${s.gutter};--f:${frame};--size:${size};--ft:${f.top};--fs:${f.split}"><i class="rig__foot rig__foot--l" ${img}></i><i class="rig__foot rig__foot--r" ${img}></i><i class="rig__trunk" ${img}></i></span>`;
}

/** A pet's own little symbol (the book, the leaf, the flame…). */
export function petIcon(id, size = 20, cls = '') { return giftIcon(PET_BY_ID.get(id)?.icon, size, cls); }

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

/** A full-screen painted backdrop for a pet's home (or 'cottage', 'clock', 'plaza'). */
export function paintedBackdrop(key, { cls = '' } = {}) {
  return `<div class="pv-backdrop ${cls}" aria-hidden="true"><i style="${backdropStyle(key, { screen: true })}"></i></div>`;
}

/* ------------------------------------------------------------------ */
/* Growing up: what each stage puts on a friend                        */
/* ------------------------------------------------------------------ */

/* Each friend's own hat, drawn in the props' style (flat fills, dark
   outline). Colours are classes so a stage can gild the trim: .ga main,
   .gc second main, .gb trim fill, .gbs trim stroke. `gem` is where the
   stage-10 jewel sits, in the hat's own viewBox. */
const LINE = 'stroke="#2c2620" stroke-width="1.6" stroke-linejoin="round"';
const bloom = (x, y, r) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse class="ga" cx="0" cy="${-r}" rx="${(r * 0.62).toFixed(1)}" ry="${r}" transform="rotate(${a})" stroke="#7a4a4a" stroke-width=".8"/>`).join('')}<circle class="gb" r="${(r * 0.55).toFixed(1)}" stroke="#7a5a1a" stroke-width=".8"/></g>`;
const star5 = (x, y, r, cls) => `<path class="${cls}" d="${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r * 0.45 : r; return `${i ? 'L' : 'M'}${(x + Math.cos(a) * d).toFixed(1)} ${(y + Math.sin(a) * d).toFixed(1)}`; }).join(' ')}Z" stroke="#2c2620" stroke-width=".9" stroke-linejoin="round"/>`;
const HATS = {
  chai: { vb: [60, 36], gem: [30, 13], c: ['#3B4558', '#C2643F', '#4D5A75'],
    body: `<path class="ga" d="M17 18C21 21 39 21 43 18L43 27C39 31 21 31 17 27Z" ${LINE}/><path class="gc" d="M30 3L58 13L30 23L2 13Z" ${LINE}/><path d="M30 6.4L50 13.3" stroke="rgba(255,255,255,.2)" stroke-width="1.4" stroke-linecap="round"/><circle class="gb" cx="30" cy="13" r="2.2" stroke="#2c2620" stroke-width="1"/><path class="gbs" d="M30 13C38 14 46 15 50 17L50 26" fill="none" stroke-width="1.8" stroke-linecap="round"/><path class="gb" d="M47.5 25h5l1.4 7.5h-7.8z" stroke="#2c2620" stroke-width=".9" stroke-linejoin="round"/>` },
  matcha: { vb: [64, 28], gem: [32, 13], c: ['#F2B3C0', '#F6D776', '#8FB560'],
    body: `<path d="M4 19C20 25 44 25 60 19" fill="none" stroke="#4f7a32" stroke-width="2.8" stroke-linecap="round"/><path class="gc" d="M21 22c-5 0-8-3-7.5-6 3.5-.2 6.5 2 7.5 6z" stroke="#3d5e24" stroke-width=".9"/><path class="gc" d="M43 22c5 0 8-3 7.5-6-3.5-.2-6.5 2-7.5 6z" stroke="#3d5e24" stroke-width=".9"/>${bloom(11, 17, 5.2)}${bloom(32, 13, 6.4)}${bloom(53, 17, 5.2)}` },
  mochi: { vb: [50, 28], gem: [39, 20.5], c: ['#556F5A', '#C9A15A', '#556F5A'],
    body: `<path class="ga" d="M3 17C3 9 13 4 26 4C39 4 47 9 46 16C45 21 35 23 24 23C12 23 3 22 3 17Z" ${LINE}/><path d="M10 9C16 6 26 5 34 6.5" stroke="rgba(255,255,255,.22)" stroke-width="2" fill="none" stroke-linecap="round"/><path class="gbs" d="M7 20C16 24.5 34 24.5 43 20" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M26 4.4L27.6 .8" stroke="#2c2620" stroke-width="2.6" stroke-linecap="round"/>` },
  ginger: { vb: [58, 24], gem: [29, 12], c: ['#5a3a20', '#B98A3E', '#CDE9EE'],
    body: `<path d="M3 13C12 8.5 46 8.5 55 13" fill="none" stroke="#5a3a20" stroke-width="5" stroke-linecap="round"/>${[19.5, 38.5].map((x) => `<circle cx="${x}" cy="12" r="10.2" fill="#2c2620"/><circle class="gb" cx="${x}" cy="12" r="8.9"/><circle class="gc" cx="${x}" cy="12" r="6.4"/><path d="M${x - 3.6} 9.2a4.6 4.6 0 0 1 3.8-2.4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".9"/>`).join('')}<rect x="27.4" y="10" width="3.2" height="4" rx="1" fill="#2c2620"/>` },
  mallow: { vb: [46, 48], gem: [23, 37.6], c: ['#5A6BA8', '#F4E3A1', '#4A5A94'],
    body: `<ellipse class="gc" cx="23" cy="40.5" rx="21" ry="5.5" ${LINE}/><path class="ga" d="M9 40C13 30 15 17 22 9C26 4.5 32 3 37 5C33 7 31 10 30 14C30 24 33 33 37 40Z" ${LINE}/><path class="gbs" d="M10.5 36.8C17 38.8 29 38.8 35.5 36.8" fill="none" stroke-width="2.4" stroke-linecap="round"/>${star5(20.5, 27, 3.8, 'gb')}${star5(27, 17.5, 2.4, 'gb')}<circle class="gb" cx="15.5" cy="33" r="1.2"/>` },
  toffee: { vb: [36, 46], gem: [18, 40.6], c: ['#3E9C96', '#F6EEDB', '#3E9C96'],
    body: `<path class="ga" d="M18 7L31 40C24 43.4 12 43.4 5 40Z" ${LINE}/><path d="M17 11L10 34" stroke="rgba(255,255,255,.2)" stroke-width="1.6" stroke-linecap="round"/>${[[15, 30], [22, 24], [19.5, 35.5], [14.5, 21.5], [24.5, 33]].map(([x, y]) => `<circle class="gb" cx="${x}" cy="${y}" r="1.7"/>`).join('')}<path class="gbs" d="M5.5 40C12 43 24 43 30.5 40" fill="none" stroke-width="2.6" stroke-linecap="round"/><circle cx="18" cy="5.6" r="4.4" fill="#F6EEDB" stroke="#2c2620" stroke-width="1.3"/>` },
};

/* Where a friend's hat goes and how wide they are, as fractions of the
   drawn height, measured from the middle of the feet: hat [x, bottom,
   width, tilt deg], `half` their half-width (the charms float just
   outside it), `top` the highest point of the friend when it is not the
   hat (Matcha's leaves stand above her flowers). Tuned on the baked sheets. */
const GEAR_AT = {
  toffee: { hat: [-0.01, 0.77, 0.27, 8], half: 0.33 },
  chai: { hat: [0.04, 0.86, 0.42, -7], half: 0.4 },
  matcha: { hat: [0.02, 0.64, 0.44, -4], half: 0.34, top: 0.98 },
  mochi: { hat: [-0.06, 0.88, 0.5, -10], half: 0.45 },
  ginger: { hat: [0.01, 0.7, 0.46, 0], half: 0.45 },
  mallow: { hat: [-0.11, 0.81, 0.36, -14], half: 0.43 },
};

const TWINKLE = '<svg viewBox="0 0 20 20"><path d="M10 0L12.3 7.7L20 10L12.3 12.3L10 20L7.7 12.3L0 10L7.7 7.7Z" fill="#FFF3B0" stroke="#C9971E" stroke-width=".8" stroke-linejoin="round"/></svg>';
const CROWN = `<svg viewBox="0 0 60 26">${star5(9, 17, 7, 'gear__gold')}${star5(30, 10, 9, 'gear__gold')}${star5(51, 17, 7, 'gear__gold')}</svg>`;
const GEM = '<path d="M0 -3.8L3.2 -1L0 3.8L-3.2 -1Z" fill="#E2546A" stroke="#2c2620" stroke-width=".8" stroke-linejoin="round"/><path d="M-1.3 -1.5L0 -2.8" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>';
const clampStage = (s) => Math.max(0, Math.min(10, Math.floor(Number(s) || 0)));

/** How big a friend is at `stage`: a baby at 0 (seven tenths of full size), full size once grown up (7), a little more by 10. */
export function growOf(stage) { return 0.7 + 0.042 * clampStage(stage); }

/**
 * What a friend wears at `stage`, cumulative (pets.js GROWTH names each):
 * 1 a twinkle · 2 bigger · 3 their hat · 4 a ring of light (petRing) ·
 * 5 a floating charm · 6 gold trim · 7 a sparkle trail (life.js) ·
 * 8 a second charm · 9 a golden aura · 10 a jewel and a crown of stars.
 * Absolutely placed from the middle of the feet, in units of --size, so it
 * sits inside `.pet-body` on the map (and turns with the friend) or inside
 * a `.pet-fig` anywhere else.
 */
export function petGear(id, stage) {
  const s = clampStage(stage), H = HATS[id], G = GEAR_AT[id];
  if (!s || !H || !G) return '';
  const [x, y, w, r] = G.hat, top = Math.max(G.top ?? 0, y + (w * H.vb[1]) / H.vb[0]);
  const icon = giftIcon(PET_BY_ID.get(id)?.icon, 24);
  let html = `<i class="gear__twinkle">${TWINKLE}</i>`;
  if (s >= 3) html += `<i class="gear__hat" style="--ha:${H.c[0]};--hb0:${H.c[1]};--hc:${H.c[2]}"><svg viewBox="0 0 ${H.vb[0]} ${H.vb[1]}">${H.body}${s >= 10 ? `<g transform="translate(${H.gem[0]} ${H.gem[1]})">${GEM}</g>` : ''}</svg></i>`;
  if (s >= 5) html += `<i class="gear__charm">${icon}</i>`;
  if (s >= 8) html += `<i class="gear__charm gear__charm--b">${icon}</i>`;
  if (s >= 10) html += `<i class="gear__crown">${CROWN}</i>`;
  return `<span class="gear${s >= 6 ? ' gear--trim' : ''}" aria-hidden="true" style="--gx:${x};--gy:${y};--gw:${w};--gr:${r}deg;--gt:${top.toFixed(3)};--gh:${G.half}">${html}</span>`;
}

/** The ring of light on the ground from stage 4, gold from stage 9. */
export function petRing(id, stage) {
  const s = clampStage(stage), p = PET_BY_ID.get(id);
  return s >= 4 && p ? `<span class="gear-ring${s >= 9 ? ' gear-ring--gold' : ''}" style="--pc:${p.colour}" aria-hidden="true"></span>` : '';
}

/** A friend as they look now, anywhere but the map: sprite, ring and gear. */
export function petFigure(id, { size = 96, frame = 0, stage = 0, cls = '' } = {}) {
  return `<span class="pet-fig ${cls}" style="--size:${size}">${petRing(id, stage)}${petSprite(id, { frame, size, stage })}${petGear(id, stage)}</span>`;
}

/** The small host chip: a portrait and a name, for session bars and headers. */
export function hostChip(id, size = 28) {
  const p = PET_BY_ID.get(id);
  return p ? `<span class="pv-host pv-host--${id}">${petPortrait(id, size)}<b>${p.name}</b></span>` : '';
}
