/**
 * art-figures.js — the people of the village, and Wick.
 *
 * A villager is a small, appealing figure: a big head with a real face
 * (whites, irises, brows, a mouth that can smile or shout), hair with a
 * silhouette, clothes with a collar and a belt, hands, shoes, a hat if the
 * job wants one, and a thing in hand — a book, a watering can, a pestle,
 * a shuttle, a basket, a hammer. Poses: idle (breathes, blinks), walk (a
 * four-frame cycle with counter-swinging arms), work (what the prop is
 * for), carry (a crate or a stack of books held in front), cheer, wave,
 * sit. Everything is drawn facing a little to the right; the renderer
 * mirrors for the other way.
 */

import { PAL, SKINS, HAIRS, CLOTHES, FLOWERS, hexA, dark, light, mix } from './brush.js';
import { drawGlyph } from './art-things.js';

const SHOE = '#4E4139';

export function person({
  skin = SKINS[0], hair = HAIRS[1], style = 'short', top = CLOTHES[0], bottom = '#4E4A5C', shoes = SHOE, hat = null, apron = null,
  prop = null, pose = 'idle', frame = 0, glasses = false, beard = false, eyes = '#3A2F2A', size = 1, blink = false, accent = null,
}) {
  const w = 40 * size, h = 56 * size;
  return {
    w, h, ax: w / 2, ay: h - 3 * size,
    draw(d, c) {
      c.save(); c.scale(size, size);
      const cx = 20, ground = 53;
      const legH = 12, torsoH = 15, R = 9;
      const f = frame % 4;
      const walking = pose === 'walk' || pose === 'carry';
      const phase = walking ? [1, 0, -1, 0][f] : 0;
      const bob = walking ? (f % 2 ? -1.2 : 0) : pose === 'idle' ? (f % 2 ? 0.5 : 0) : pose === 'cheer' ? (f % 2 ? -2.5 : 0) : pose === 'work' ? (f % 2 ? 0.4 : 0) : 0;
      const sitting = pose === 'sit';
      const ty = (sitting ? ground - 8 - torsoH : ground - legH - torsoH) + bob;
      const hy = ty - R + 3;
      const topD = dark(top, 0.35), skinD = dark(skin, 0.35);
      d.shadow(cx + 1, ground, 9, 3, 0.22);

      /* ---- legs and shoes ---- */
      const leg = (x, len, s) => {
        d.rr(x, ground - len, 5.2, len, 2.2).shade(bottom, ground - len, ground, { lt: 0.12, dk: 0.2, oc: dark(bottom, 0.4) });
        d.rr(x - 0.8 + (s > 0 ? 0.8 : 0), ground - 3, 6.8, 3.4, 1.5).solid(shoes, { ow: 0.6, oc: dark(shoes, 0.4) });
      };
      if (sitting) {
        d.rr(cx - 6, ground - 9, 12, 5, 2).shade(bottom, ground - 9, ground - 4, { lt: 0.12 });
        d.rr(cx - 6, ground - 5, 4.8, 5, 1.6).shade(bottom, ground - 5, ground, { lt: 0.1 }); d.rr(cx + 1, ground - 5, 4.8, 5, 1.6).shade(bottom, ground - 5, ground, { lt: 0.1 });
        d.rr(cx - 7, ground - 2.5, 6, 2.8, 1.3).solid(shoes, { ow: 0.6 }); d.rr(cx + 0.5, ground - 2.5, 6, 2.8, 1.3).solid(shoes, { ow: 0.6 });
      } else {
        const sL = phase, sR = -phase;
        const back = sL < 0 ? 'L' : sR < 0 ? 'R' : null;
        const drawL = () => leg(cx - 5.4 + sL * 2, legH - Math.max(0, -sL) * 3.2, sL);
        const drawR = () => leg(cx + 0.6 + sR * 2, legH - Math.max(0, -sR) * 3.2, sR);
        if (back === 'L') { drawL(); drawR(); } else { drawR(); drawL(); }
      }

      /* ---- torso ---- */
      d.poly([[cx - 7, ty + 1.5], [cx + 7.5, ty + 1.5], [cx + 9, ty + torsoH + 1], [cx - 8.5, ty + torsoH + 1]]);
      d.c.fillStyle = d.vgrad(ty, ty + torsoH, [[0, light(top, 0.22)], [0.55, top], [1, mix(top, '#000', 0.2)]]); d.c.fill(); d.stroke(topD, 0.9);
      d.line([[cx - 8.3, ty + torsoH - 2], [cx + 8.8, ty + torsoH - 2]]).stroke(hexA('#000', 0.16), 1.8); // belt
      d.rr(cx - 1.4, ty + torsoH - 3.2, 2.8, 2.6, 0.6).fill(PAL.coin);
      d.poly([[cx - 3.6, ty + 1.5], [cx + 4, ty + 1.5], [cx + 0.2, ty + 5.5]]).solid(PAL.white, { ow: 0.5, oc: hexA(PAL.outline, 0.3) }); // collar
      if (apron) { d.rr(cx - 5, ty + 5, 10.5, torsoH - 4, 1.8).solid(apron, { ow: 0.6, oc: dark(apron, 0.3) }); d.line([[cx - 3.5, ty + 5], [cx - 2.5, ty + 1.8]]).stroke(dark(apron, 0.3), 0.9); d.line([[cx + 3.8, ty + 5], [cx + 3, ty + 1.8]]).stroke(dark(apron, 0.3), 0.9); }
      if (accent) d.rr(cx - 7, ty + 1.5, 14.5, 3, 1).fill(hexA(accent, 0.9));

      /* ---- arms and hands ---- */
      const shL = [cx - 6.5, ty + 4], shR = [cx + 7, ty + 4];
      let handL, handR;
      if (pose === 'cheer') { handL = [cx - 12, ty - 7 + (f % 2 ? 1 : 0)]; handR = [cx + 13, ty - 7 + (f % 2 ? 0 : 1)]; }
      else if (pose === 'wave') { handL = [cx - 9.5, ty + 14]; handR = [cx + 13, ty - 5 + (f % 2 ? 1.5 : 0)]; }
      else if (pose === 'carry') { handL = [cx - 5, ty + 10]; handR = [cx + 6, ty + 10]; }
      else if (pose === 'work') { const w2 = workHands(prop, cx, ty, f); handL = w2[0]; handR = w2[1]; }
      else if (pose === 'sit') { handL = [cx - 7, ty + 13]; handR = [cx + 8, ty + 13]; }
      else if (walking) { handL = [cx - 10 + phase * 1.2, ty + 13 + phase * 2.2]; handR = [cx + 10.5 - phase * 1.2, ty + 13 - phase * 2.2]; }
      else { handL = [cx - 9.5, ty + 14 + (f % 2 ? 0.4 : 0)]; handR = [cx + 10, ty + 14 + (f % 2 ? 0.4 : 0)]; }
      const arm = (sh, hd) => { d.line([sh, hd]).stroke(topD, 5.2); d.line([sh, hd]).stroke(top, 3.6); d.circ(hd[0], hd[1], 2.3).solid(skin, { ow: 0.6, oc: skinD }); };
      arm(shL, handL);
      // The prop goes in the right hand (or both, when carrying); it is
      // drawn before the right arm so the hand closes over it.
      if (pose === 'carry') drawCarry(d, c, prop, cx, ty + 9, f);
      else if (prop) drawProp(d, c, prop, handR[0], handR[1], f, pose);
      arm(shR, handR);

      /* ---- head ---- */
      drawHairBack(d, c, style, hair, cx + 0.5, hy, R);
      d.circ(cx + 0.5, hy, R).shade(skin, hy - R, hy + R, { lt: 0.16, dk: 0.14, oc: skinD });
      d.circ(cx + R - 0.5, hy + 1, 1.9).solid(skin, { ow: 0.6, oc: skinD }); // ear
      d.circ(cx + R - 0.5, hy + 1, 0.8).fill(hexA(skinD, 0.5));
      // hair
      drawHair(d, c, style, hair, cx + 0.5, hy, R);
      // face
      const blinkNow = blink || (pose === 'idle' && f === 3);
      const eyeY = hy + 0.8;
      for (const [ex, k] of [[cx - 2.6, -1], [cx + 4.2, 1]]) {
        if (blinkNow) { d.line([[ex - 1.6, eyeY + 0.4], [ex + 1.6, eyeY + 0.4]]).stroke(PAL.outline, 1.1); continue; }
        d.ell(ex, eyeY, 2.0, 2.3).solid('#FFFFFF', { ow: 0.5, oc: hexA(PAL.outline, 0.45) });
        d.circ(ex + 0.5, eyeY + 0.2, 1.25).fill(eyes);
        d.circ(ex + 0.55, eyeY + 0.2, 0.7).fill(PAL.outline);
        d.circ(ex + 0.1, eyeY - 0.6, 0.45).fill('#FFFFFF');
        void k;
      }
      d.line([[cx - 4.4, hy - 2.6], [cx - 0.9, hy - 3.1]]).stroke(hexA(hair === PAL.white ? PAL.outline : hair, 0.85), 1.1);
      d.line([[cx + 2.6, hy - 3.1], [cx + 6.2, hy - 2.6]]).stroke(hexA(hair === PAL.white ? PAL.outline : hair, 0.85), 1.1);
      d.line([[cx + 1.4, hy + 1.6], [cx + 2, hy + 3.2]]).stroke(hexA(skinD, 0.6), 0.8); // nose
      d.circ(cx - 5.4, hy + 3.4, 1.8).fill(hexA('#F26D7D', 0.28));
      d.circ(cx + 6.4, hy + 3.4, 1.8).fill(hexA('#F26D7D', 0.28));
      if (pose === 'cheer') { d.ell(cx + 0.8, hy + 4.6, 2.2, 1.8).solid('#5A2A2A', { ow: 0.5, oc: dark(skin, 0.5) }); d.ell(cx + 0.8, hy + 5.4, 1.4, 0.8).fill('#F26D7D'); }
      else { c.beginPath(); c.arc(cx + 0.8, hy + 3.4, pose === 'work' && f % 2 ? 1.6 : 2.2, 0.15 * Math.PI, 0.85 * Math.PI); d.stroke(dark(skin, 0.5), 1); }
      if (glasses) { d.circ(cx - 2.6, eyeY, 2.9).stroke(PAL.iron, 0.8); d.circ(cx + 4.2, eyeY, 2.9).stroke(PAL.iron, 0.8); d.line([[cx + 0.3, eyeY], [cx + 1.3, eyeY]]).stroke(PAL.iron, 0.8); d.line([[cx + 7.1, eyeY - 0.2], [cx + 9, eyeY - 1]]).stroke(PAL.iron, 0.8); }
      if (beard) { c.beginPath(); c.moveTo(cx - 6.5, hy + 2); c.quadraticCurveTo(cx - 6, hy + 11, cx + 1, hy + 10); c.quadraticCurveTo(cx + 8, hy + 11, cx + 8, hy + 2); c.quadraticCurveTo(cx + 2, hy + 6, cx - 6.5, hy + 2); c.closePath(); d.solid(hair, { ow: 0.7, oc: dark(hair, 0.35) }); }
      // hats over the hair
      drawHat(d, c, hat, top, cx + 0.5, hy, R);
      c.restore();
    },
  };
}

function workHands(prop, cx, ty, f) {
  switch (prop) {
    case 'book': return [[cx - 6, ty + 8], [cx + 6.5, ty + 7.5 + (f % 2 ? 0.6 : 0)]];
    case 'can': return [[cx - 10, ty + 12], [cx + 11.5, ty + 6 + (f % 2 ? 2 : 0)]];
    case 'mortar': return [[cx - 4, ty + 11], [cx + 7, ty + (f % 2 ? 2 : 7)]];
    case 'shuttle': return [[cx - 10, ty + 8], [cx + (f % 2 ? 12 : 4), ty + 9]];
    case 'hammer': return [[cx - 8, ty + 12], [cx + 9, ty + (f % 2 ? 12 : -2)]];
    case 'basket': return [[cx - 9, ty + 13], [cx + 12, ty + 4 + (f % 2 ? 1.5 : 0)]];
    case 'broom': return [[cx - 4, ty + 9 + (f % 2 ? 1 : 0)], [cx + 8 + (f % 2 ? 2 : 0), ty + 10]];
    default: return [[cx - 10, ty + 8 + (f % 2 ? 2 : 0)], [cx + 11, ty + 8 + (f % 2 ? 0 : 2)]];
  }
}

/** The mass of hair that hangs behind the head, drawn before the face. */
function drawHairBack(d, c, style, hair, cx, hy, R) {
  const oc = dark(hair, 0.4);
  if (style === 'long') d.rr(cx - R - 0.8, hy - 4, R * 2 + 1.6, 18, 5).solid(hair, { ow: 0.7, oc });
  else if (style === 'bob') d.rr(cx - R - 0.8, hy - 4, R * 2 + 1.6, 12, 5).solid(hair, { ow: 0.7, oc });
  else if (style === 'braid') d.rr(cx - R - 0.4, hy - 3, R * 2 + 0.8, 8, 4).solid(hair, { ow: 0.7, oc });
}

function drawHair(d, c, style, hair, cx, hy, R) {
  const oc = dark(hair, 0.4);
  if (style === 'bald') { d.ell(cx - R + 1, hy - 1, 2.2, 3).solid(hair, { ow: 0.5, oc }); d.ell(cx + R - 1.5, hy - 1, 2, 3).solid(hair, { ow: 0.5, oc }); d.gleam(cx - 2, hy - 5, 4, 2.4, 0.3); return; }
  if (style === 'curly') {
    for (let i = 0; i < 9; i += 1) { const a = Math.PI * (1.02 + i * 0.12); d.circ(cx + Math.cos(a) * (R - 0.5), hy + 0.5 + Math.sin(a) * (R - 0.5), 3.4).solid(hair, { ow: 0.6, oc }); }
    d.circ(cx, hy - R + 1, 4).solid(hair, { ow: 0.6, oc });
    d.gleam(cx - 3, hy - 8, 3, 1.6, 0.25);
    return;
  }
  // The cap: the crown of the head down to the brow line, with a fringe.
  c.beginPath(); c.arc(cx, hy - 0.5, R + 0.6, Math.PI * 1.0, Math.PI * 2.0);
  const drop = 1.5;
  c.lineTo(cx + R + 0.6, hy - 0.5 + drop); c.lineTo(cx - R - 0.6, hy - 0.5 + drop); c.closePath();
  d.solid(hair, { ow: 0.7, oc });
  // The fringe: a wedge over the brow that keeps the face open.
  d.poly([[cx - R + 1, hy - 3.2], [cx - 1, hy - 4], [cx + 5, hy - 6.5], [cx + 2, hy - 2.5]]).fill(hair);
  d.poly([[cx - R - 0.4, hy - 1], [cx - R + 1.5, hy - 6], [cx - 2, hy - 3]]).fill(hair);
  if (style === 'bun') d.circ(cx - 6.5, hy - 8.5, 4).solid(hair, { ow: 0.7, oc });
  if (style === 'braid') for (let i = 0; i < 4; i += 1) d.circ(cx - R + 1.2, hy + 3 + i * 3.4, 2.1).solid(hair, { ow: 0.6, oc });
  if (style === 'long' || style === 'bob') { d.rr(cx - R - 0.8, hy - 2, 3.6, style === 'long' ? 14 : 9, 1.8).solid(hair, { ow: 0.6, oc }); d.rr(cx + R - 2.8, hy - 1, 3.6, style === 'long' ? 13 : 8, 1.8).solid(hair, { ow: 0.6, oc }); }
  d.gleam(cx - 3, hy - 7, 3.4, 1.8, 0.28);
}

function drawHat(d, c, hat, top, cx, hy, R) {
  if (!hat) return;
  if (hat === 'straw') { d.ell(cx, hy - 5.5, 14, 3.8).solid('#E8CF7A', { ow: 0.7, oc: dark('#E8CF7A', 0.35) }); d.rr(cx - 7, hy - 15, 14, 10, 3.5).shade('#E8CF7A', hy - 15, hy - 5); d.rr(cx - 7, hy - 9.5, 14, 2.4, 0.8).fill(PAL.roofRed); d.gleam(cx - 3, hy - 13, 3, 1.4, 0.3); }
  else if (hat === 'cap') { d.rr(cx - 9, hy - 12.5, 18, 7.5, 4.5).shade(top, hy - 12.5, hy - 5); d.rr(cx - 2, hy - 7, 12, 2.8, 1.2).solid(dark(top, 0.25), { ow: 0.5 }); d.circ(cx, hy - 12.5, 1.2).fill(dark(top, 0.3)); }
  else if (hat === 'scarf') { c.beginPath(); c.arc(cx, hy - 0.5, R + 1.2, Math.PI * 0.98, Math.PI * 2.02); c.lineTo(cx + R + 1, hy + 2); c.lineTo(cx - R - 1, hy + 2); c.closePath(); d.solid('#D9603F', { ow: 0.7, oc: dark('#D9603F', 0.35) }); d.circ(cx - R, hy + 3, 2.2).solid('#D9603F', { ow: 0.5 }); d.line([[cx - 5, hy - 6], [cx + 4, hy - 7]]).stroke(hexA('#FFF', 0.25), 1.2); }
  else if (hat === 'beret') { d.ell(cx - 1, hy - 8.5, 11, 4.5).solid('#3A3846', { ow: 0.7, oc: dark('#3A3846', 0.3) }); d.circ(cx - 1, hy - 12.5, 1.2).fill('#3A3846'); }
  else if (hat === 'hood') { c.beginPath(); c.arc(cx, hy - 1, R + 2.2, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(cx + R + 2, hy + 6); c.lineTo(cx - R - 2, hy + 6); c.closePath(); d.solid(top, { ow: 0.7, oc: dark(top, 0.35) }); }
}

/** The thing in the right hand, drawn so the hand closes over it. */
function drawProp(d, c, prop, x, y, f, pose) {
  const working = pose === 'work';
  switch (prop) {
    case 'book': {
      d.rr(x - 6, y - 5, 10, 8, 1).solid(PAL.book, { ow: 0.7, oc: dark(PAL.book, 0.35) });
      d.rr(x - 5, y - 4, 8, 6, 0.6).fill(PAL.page);
      d.line([[x - 1, y - 4], [x - 1, y + 2]]).stroke(dark(PAL.page, 0.3), 0.7);
      for (let i = 0; i < 2; i += 1) { d.line([[x - 4, y - 2.4 + i * 2], [x - 2, y - 2.4 + i * 2]]).stroke(PAL.pageLine, 0.6); d.line([[x, y - 2.4 + i * 2], [x + 2, y - 2.4 + i * 2]]).stroke(PAL.pageLine, 0.6); }
      if (working && f % 2) d.poly([[x - 1, y - 4], [x + 2.5, y - 7], [x + 2.5, y - 1]]).solid(PAL.page, { ow: 0.5 });
      break;
    }
    case 'can': {
      d.rr(x - 5, y - 4, 8.5, 7, 1.8).shade(PAL.iron, y - 4, y + 3, { lt: 0.25 });
      d.line([[x + 3.5, y - 1.5], [x + 8.5, y - 5]]).stroke(PAL.iron, 1.6);
      d.rr(x - 2, y - 6, 3, 2.5, 0.8).solid(PAL.iron, { ow: 0.5 });
      if (working && f % 2) for (let i = 0; i < 4; i += 1) d.circ(x + 9 + i * 1.2, y - 4 + i * 2.2, 0.8).fill(PAL.waterLight);
      break;
    }
    case 'mortar': {
      d.rr(x - 6, y + 1, 12, 6, 2.5).shade(PAL.stone, y + 1, y + 7, { lt: 0.2 });
      d.ell(x, y + 1.5, 5.5, 1.8).solid(dark(PAL.stone, 0.15), { ow: 0.5 });
      d.line([[x + 1, y + 1], [x + 4, y - 8]]).stroke(PAL.woodLight, 2.4);
      d.circ(x + 4.3, y - 8.5, 1.6).fill(PAL.woodLight);
      if (working && f % 2) d.circ(x - 1, y + 0.5, 1.2).fill(PAL.ink);
      break;
    }
    case 'shuttle': {
      d.ell(x, y - 1, 6, 2.2).solid(PAL.woodLight, { ow: 0.7, oc: PAL.woodDark });
      d.rr(x - 2.5, y - 2.5, 5, 3, 1).fill(PAL.thread);
      d.line([[x - 6, y - 1], [x - 14, y + 3]]).stroke(PAL.threadLight, 0.8);
      break;
    }
    case 'basket': {
      d.rr(x - 6, y - 2, 12, 7, 2.5).shade(PAL.woodLight, y - 2, y + 5);
      for (let i = 0; i < 3; i += 1) d.line([[x - 5, y + i * 2], [x + 5, y + i * 2]]).stroke(hexA(PAL.timber, 0.4), 0.6);
      c.beginPath(); c.arc(x, y - 2, 6, Math.PI, 0); d.stroke(PAL.woodDark, 1.3);
      d.circ(x - 2.5, y - 3.5, 2).fill('#F26D7D'); d.circ(x + 2, y - 4, 2).fill('#F6C445'); d.circ(x - 0.2, y - 2.6, 1.7).fill('#A785DD');
      break;
    }
    case 'hammer': {
      const up = working && !(f % 2);
      d.line([[x, y], [x + (up ? 2 : 5), y - (up ? 11 : 8)]]).stroke(PAL.woodDark, 2);
      d.rr(x + (up ? -1 : 2), y - (up ? 15 : 12), 8, 4.2, 1.2).solid(PAL.iron, { ow: 0.6 });
      break;
    }
    case 'lamp': {
      d.rr(x - 3, y - 1, 6, 7.5, 1.4).solid(PAL.glassNight, { oc: PAL.iron, ow: 0.9 });
      d.poly([[x - 3.8, y - 0.8], [x, y - 3.5], [x + 3.8, y - 0.8]]).solid(PAL.iron, { ow: 0.5 });
      d.glow(x, y + 3, 9, PAL.glow, 0.55);
      break;
    }
    case 'broom': {
      d.line([[x - 6, y - 14], [x + 4, y + 8]]).stroke(PAL.woodLight, 1.8);
      d.poly([[x + 1, y + 5], [x + 8, y + 3], [x + 10, y + 11], [x + 3, y + 12]]).solid('#E2B95A', { ow: 0.6 });
      break;
    }
    case 'satchel': {
      d.rr(x - 6, y - 3, 12, 9, 2).shade(PAL.wood, y - 3, y + 6);
      d.rr(x - 6, y - 3, 12, 4, 1.5).solid(PAL.woodDark, { ow: 0.6 });
      d.rr(x - 3, y - 1, 6, 4, 0.6).fill(PAL.page);
      break;
    }
    case 'rod': {
      d.line([[x, y], [x + 16, y - 20]]).stroke(PAL.woodDark, 1.6);
      d.line([[x + 16, y - 20], [x + 17, y - 6]]).stroke(hexA('#FFF', 0.6), 0.7);
      break;
    }
    case 'flowers': {
      for (let i = 0; i < 3; i += 1) { d.line([[x, y + 1], [x - 2 + i * 2, y - 6]]).stroke(PAL.leafDark, 1); d.circ(x - 2 + i * 2, y - 7, 2.2).solid(FLOWERS[(i * 2) % FLOWERS.length], { ow: 0.5 }); }
      break;
    }
    default: break;
  }
}

/** Carried things: held in front with both hands. */
function drawCarry(d, c, prop, cx, y, f) {
  const bob = f % 2 ? -0.6 : 0;
  if (prop === 'books') {
    d.rr(cx - 8, y - 4 + bob, 16, 5, 1).shade(PAL.bookBlue, y - 4, y + 1);
    d.rr(cx - 7.5, y - 9 + bob, 15, 5, 1).shade(PAL.book, y - 9, y - 4);
    d.rr(cx - 8, y - 14 + bob, 16, 5, 1).shade(PAL.bookGreen, y - 14, y - 9);
    for (const yy of [-2, -7, -12]) d.line([[cx - 6, y + yy + bob], [cx + 6, y + yy + bob]]).stroke(hexA('#FFF', 0.5), 0.7);
    return;
  }
  if (prop === 'flowers') {
    d.rr(cx - 7, y - 6 + bob, 14, 9, 2).shade(PAL.woodLight, y - 6, y + 3);
    for (let i = 0; i < 4; i += 1) d.circ(cx - 5 + i * 3.4, y - 8 + bob + (i % 2), 2.6).solid(FLOWERS[i % FLOWERS.length], { ow: 0.5 });
    return;
  }
  if (prop === 'cloth') {
    d.rr(cx - 8, y - 8 + bob, 16, 9, 2).shade(PAL.cloth, y - 8, y + 1);
    d.line([[cx - 8, y - 5 + bob], [cx + 8, y - 5 + bob]]).stroke(hexA('#FFF', 0.35), 0.8);
    d.line([[cx - 8, y - 2 + bob], [cx + 8, y - 2 + bob]]).stroke(hexA('#FFF', 0.35), 0.8);
    return;
  }
  if (prop === 'ink') {
    d.rr(cx - 7, y - 5 + bob, 14, 8, 2).shade(PAL.woodLight, y - 5, y + 3);
    for (let i = 0; i < 3; i += 1) { d.rr(cx - 5.5 + i * 4.2, y - 9 + bob, 3.2, 5, 0.9).solid(PAL.glass, { ow: 0.5 }); d.rr(cx - 5 + i * 4.2, y - 7 + bob, 2.2, 2.6, 0.5).fill(PAL.ink); }
    return;
  }
  // A crate by default.
  d.rr(cx - 8, y - 9 + bob, 16, 11, 1.5).shade(PAL.woodLight, y - 9, y + 2);
  d.line([[cx - 8, y - 3.5 + bob], [cx + 8, y - 3.5 + bob]]).stroke(hexA(PAL.timber, 0.5), 0.8);
  d.line([[cx, y - 9 + bob], [cx, y + 2 + bob]]).stroke(hexA(PAL.timber, 0.5), 0.8);
}

/* ------------------------------------------------------------------ */
/* Wick                                                                */
/* ------------------------------------------------------------------ */

/**
 * Wick: a small charcoal cat with lamp-coloured eyes, a red collar with a
 * brass bell, and, after dark, a lantern on a strap. Poses: sit (tail
 * flicks, blinks), walk (four frames), sleep (curled, eyes shut), look
 * (head turned to the side), jump (a celebration), stretch.
 */
export function wick({ pose = 'sit', frame = 0, lamp: withLamp = false, blink = false, size = 1 }) {
  const w = 34 * size, h = 30 * size;
  return {
    w, h, ax: w / 2, ay: h - 3 * size,
    draw(d, c) {
      c.save(); c.scale(size, size);
      const cx = 17, ground = 27;
      const body = PAL.wick, bodyD = dark(body, 0.4), belly = mix(body, '#9A98A8', 0.35);
      const f = frame % 4;
      d.shadow(cx + 1, ground, 9, 2.8, 0.22);
      if (pose === 'sleep') {
        // Curled up: a soft oval, the tail wrapped round, the head resting.
        d.ell(cx, ground - 6, 10.5, 6.5).shade(body, ground - 12, ground, { lt: 0.22, dk: 0.12, oc: bodyD });
        c.beginPath(); c.moveTo(cx + 9, ground - 3); c.quadraticCurveTo(cx + 14, ground - 8, cx + 4, ground - 12); d.stroke(bodyD, 3.6); c.beginPath(); c.moveTo(cx + 9, ground - 3); c.quadraticCurveTo(cx + 14, ground - 8, cx + 4, ground - 12); d.stroke(body, 2.2);
        d.ell(cx - 5, ground - 8, 7, 6).shade(body, ground - 14, ground - 2, { lt: 0.2, oc: bodyD });
        d.poly([[cx - 11, ground - 11], [cx - 10.5, ground - 17], [cx - 6.5, ground - 13]]).solid(body, { ow: 0.7, oc: bodyD });
        d.poly([[cx - 2, ground - 12], [cx - 0.5, ground - 17.5], [cx + 2, ground - 12.5]]).solid(body, { ow: 0.7, oc: bodyD });
        d.line([[cx - 8.5, ground - 8], [cx - 6.2, ground - 8]]).stroke(PAL.wickEye, 1.1);
        d.line([[cx - 3.6, ground - 8], [cx - 1.4, ground - 8]]).stroke(PAL.wickEye, 1.1);
        d.poly([[cx - 5.5, ground - 6.2], [cx - 3.5, ground - 6.2], [cx - 4.5, ground - 5.2]]).fill(PAL.wickPink);
        d.rr(cx - 10, ground - 5.5, 6, 3, 1.4).solid(body, { ow: 0.5, oc: bodyD });
        if (withLamp) { d.rr(cx + 8, ground - 4, 5, 6, 1.4).solid(PAL.glassNight, { oc: PAL.iron, ow: 0.8 }); d.glow(cx + 10.5, ground - 1, 9, PAL.glow, 0.45); }
        c.restore(); return;
      }
      const walking = pose === 'walk';
      const jump = pose === 'jump';
      const bob = walking ? (f % 2 ? -0.8 : 0) : jump ? -6 : pose === 'sit' ? (f % 2 ? 0.4 : 0) : 0;
      // tail
      const tailUp = walking || jump;
      c.beginPath(); c.moveTo(cx + 7, ground - 6 + bob); c.quadraticCurveTo(cx + 16, ground - 8 - (f % 2 ? 4 : 0) + bob, cx + 13, ground - (tailUp ? 20 : 15) + bob); d.stroke(bodyD, 3.8);
      c.beginPath(); c.moveTo(cx + 7, ground - 6 + bob); c.quadraticCurveTo(cx + 16, ground - 8 - (f % 2 ? 4 : 0) + bob, cx + 13, ground - (tailUp ? 20 : 15) + bob); d.stroke(body, 2.4);
      // body and legs
      if (walking) {
        const s = [1, 0, -1, 0][f];
        d.rr(cx - 8 + s * 1.5, ground - 5 + bob, 3.6, 5 - Math.max(0, s) * 1.5, 1.4).solid(body, { ow: 0.6, oc: bodyD });
        d.rr(cx + 4 - s * 1.5, ground - 5 + bob, 3.6, 5 - Math.max(0, -s) * 1.5, 1.4).solid(body, { ow: 0.6, oc: bodyD });
        d.ell(cx - 2, ground - 7.5 + bob, 9.5, 5.2).shade(body, ground - 13, ground - 2, { lt: 0.22, oc: bodyD });
        d.ell(cx - 1, ground - 5 + bob, 6, 2.6).fill(hexA(belly, 0.7));
        d.rr(cx - 4 + s * 1.5, ground - 4.5 + bob, 3.4, 4.5 - Math.max(0, -s), 1.4).solid(body, { ow: 0.6, oc: bodyD });
        d.rr(cx + 0.5 - s * 1.5, ground - 4.5 + bob, 3.4, 4.5 - Math.max(0, s), 1.4).solid(body, { ow: 0.6, oc: bodyD });
      } else if (jump) {
        d.ell(cx, ground - 9 + bob, 7.5, 7).shade(body, ground - 16, ground - 2, { lt: 0.22, oc: bodyD });
        d.rr(cx - 6, ground - 6 + bob, 3.4, 3.5, 1.4).solid(body, { ow: 0.6, oc: bodyD }); d.rr(cx + 2.5, ground - 6 + bob, 3.4, 3.5, 1.4).solid(body, { ow: 0.6, oc: bodyD });
        d.ell(cx, ground - 6 + bob, 4.5, 3).fill(hexA(belly, 0.7));
      } else {
        d.ell(cx, ground - 8 + bob, 8, 7.5).shade(body, ground - 16, ground - 0.5, { lt: 0.22, dk: 0.1, oc: bodyD });
        d.ell(cx, ground - 6 + bob, 5.2, 4.2).fill(hexA(belly, 0.75));
        d.rr(cx - 6.5, ground - 4, 4.6, 4, 1.6).solid(body, { ow: 0.6, oc: bodyD });
        d.rr(cx + 1.2, ground - 4, 4.6, 4, 1.6).solid(body, { ow: 0.6, oc: bodyD });
        d.line([[cx - 5.6, ground - 1.2], [cx - 5.6, ground - 0.2]]).stroke(hexA('#FFF', 0.3), 0.6);
      }
      // collar and bell
      const cy = ground - 13 + bob + (walking ? 1.5 : 0);
      d.ell(cx + (pose === 'look' ? 1.5 : 0), cy + 1.5, 6.5, 2.2).solid('#D9414E', { ow: 0.6, oc: '#8E2530' });
      d.circ(cx + (pose === 'look' ? 1.5 : 0), cy + 3.6, 1.6).solid(PAL.coin, { ow: 0.5, oc: PAL.coinDark });
      if (withLamp) { const lx = cx - 9; d.line([[cx - 4, cy + 2], [lx, cy + 6]]).stroke(PAL.iron, 0.9); d.rr(lx - 2.6, cy + 6, 5.2, 6.5, 1.3).solid(PAL.glassNight, { oc: PAL.iron, ow: 0.8 }); d.poly([[lx - 3.2, cy + 6.2], [lx, cy + 3.8], [lx + 3.2, cy + 6.2]]).solid(PAL.iron, { ow: 0.4 }); d.glow(lx, cy + 9.5, 10, PAL.glow, 0.55); }
      // head
      const hx = cx + (pose === 'look' ? 3 : 0) + (walking ? 5 : 0), hy = ground - 16 + bob + (walking ? 3 : 0);
      d.poly([[hx - 8, hy - 1], [hx - 7, hy - 10.5], [hx - 2, hy - 5.5]]).solid(body, { ow: 0.7, oc: bodyD });
      d.poly([[hx + 8, hy - 1], [hx + 7, hy - 10.5], [hx + 2, hy - 5.5]]).solid(body, { ow: 0.7, oc: bodyD });
      d.poly([[hx - 6.4, hy - 2.5], [hx - 5.9, hy - 8.2], [hx - 3, hy - 5]]).fill(PAL.wickPink);
      d.poly([[hx + 6.4, hy - 2.5], [hx + 5.9, hy - 8.2], [hx + 3, hy - 5]]).fill(PAL.wickPink);
      d.ell(hx, hy, 8.6, 7.4).shade(body, hy - 7, hy + 7, { lt: 0.22, dk: 0.1, oc: bodyD });
      d.ell(hx, hy + 3.2, 4.2, 2.6).fill(hexA(belly, 0.55));
      const eyeShift = pose === 'look' ? 1.8 : 0;
      if (blink) { d.line([[hx - 5.2, hy - 0.4], [hx - 2.2, hy - 0.4]]).stroke(PAL.wickEye, 1.2); d.line([[hx + 2.2, hy - 0.4], [hx + 5.2, hy - 0.4]]).stroke(PAL.wickEye, 1.2); }
      else {
        for (const ex of [hx - 3.6, hx + 3.6]) {
          d.ell(ex, hy - 0.4, 2.2, jump ? 2.8 : 2.4).fill(PAL.wickEye);
          d.ell(ex + eyeShift * 0.6, hy - 0.2, jump ? 1.4 : 0.8, jump ? 1.8 : 1.7).fill(PAL.outline);
          d.circ(ex - 0.7 + eyeShift * 0.3, hy - 1.3, 0.55).fill('#FFFFFF');
        }
      }
      d.poly([[hx - 1.1, hy + 2.2], [hx + 1.1, hy + 2.2], [hx, hy + 3.4]]).fill(PAL.wickPink);
      c.beginPath(); c.moveTo(hx - 2.2, hy + 4.2); c.quadraticCurveTo(hx - 1, hy + 5.4, hx, hy + 4); c.quadraticCurveTo(hx + 1, hy + 5.4, hx + 2.2, hy + 4.2); d.stroke(hexA(PAL.outline, 0.7), 0.7);
      d.line([[hx - 9.5, hy + 2], [hx - 4.5, hy + 2.8]]).stroke(hexA('#FFFFFF', 0.55), 0.6);
      d.line([[hx - 9.5, hy + 4.4], [hx - 4.5, hy + 3.8]]).stroke(hexA('#FFFFFF', 0.55), 0.6);
      d.line([[hx + 4.5, hy + 2.8], [hx + 9.5, hy + 2]]).stroke(hexA('#FFFFFF', 0.55), 0.6);
      d.line([[hx + 4.5, hy + 3.8], [hx + 9.5, hy + 4.4]]).stroke(hexA('#FFFFFF', 0.55), 0.6);
      if (jump) { for (let i = 0; i < 3; i += 1) d.line([[cx - 12 + i * 12, ground + 1], [cx - 12 + i * 12, ground + 3.5]]).stroke(hexA(PAL.outline, 0.35), 0.8); }
      c.restore();
    },
  };
}

export const FIGURES = { person, wick };
export { drawGlyph };
