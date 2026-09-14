/**
 * art-buildings.js — the village's buildings, drawn as small solid things.
 *
 * Every building is a `house`: a front wall that faces the light, a side
 * wall that recedes up and to the right (see brush.js `P`), a roof with a
 * front slope and a gable or hip on the right, and the parts that make it
 * a particular place — a chimney, a tower, an awning, a hanging sign, a
 * lamp by the door, windows that glow at night. The named buildings and
 * their levels are variations of it; a cottage is a small one with a
 * seeded palette; a scaffold is one being built.
 *
 * A spec also carries `points` — the door, where the worker stands, where
 * the finished goods sit, the chimney's mouth — so the scene can place
 * life relative to the drawing instead of guessing.
 */

import { PAL, FLOWERS, rng, mix, hexA, dark, light, shade, lit, KX, KY, P } from './brush.js';
import { drawGlyph, flowerBox, crate, beds, hive, lamp as lampSpec } from './art-things.js';

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * The house builder. All sizes in world units; the returned spec's anchor
 * is the middle of the front wall at the ground.
 */
export function house(o) {
  const {
    w = 90, d: dep = 44, wallH = 40, roofH = 30, floors = 1, eave = 8,
    wall = PAL.cream, roof = PAL.roofRed, roofStyle = 'gable',
    door = { x: 0.5, w: 16, h: 24, color: PAL.woodDark }, windows = [], sideWindows = 1,
    chimney = null, lamp: hasLamp = false, boxes = false, sign = null, night = false, dormer = false,
    banner = null, tower = null, awning = null, plinth = true, extras = [],
    glass = false, stone = false, timber = false, planks = false, thatch = false, wheel = false, bell = false,
  } = o;
  const fullH = wallH * floors;
  const dx = dep * KX, dy = dep * KY;
  const rz = dep / 2;
  const towerW = tower ? tower.w + 12 : 0;
  const padL = 12, padR = 12, padB = 12, padT = 14;
  const W = padL + eave + w + eave + dx + padR + towerW + (wheel ? 30 : 0);
  const roofTop = fullH + roofH + dy / 2;
  const chimneyTop = chimney ? roofTop + 8 : 0;
  const towerTop = tower ? tower.h + (tower.dome ? tower.w * 0.6 + 10 : tower.w * 0.75 + 4) + dy * 0.5 : 0;
  const bannerTop = banner ? roofTop + 22 : 0;
  const bellTop = bell ? roofTop + 14 : 0;
  const H = padB + Math.max(roofTop, chimneyTop, towerTop, bannerTop, bellTop) + padT;
  const x0 = padL + eave;
  const ground = H - padB;
  const ax = x0 + w / 2, ay = ground;
  const wallTop = ground - fullH;
  const doorX = x0 + door.x * w;
  const ridgeY = wallTop - roofH;
  const points = {
    door: [doorX, ground],
    worker: [Math.min(x0 + w - 12, doorX + 26), ground + 8],
    shelf: [x0 + w + 8, ground + 14],
    side: [x0 + w + dx / 2, ground - dy / 2],
    chimney: null,
    top: Math.min(ridgeY - dy / 2, ground - Math.max(roofTop, towerTop)),
    width: w + eave * 2 + dx,
  };
  return {
    w: W, h: H, ax, ay, points,
    draw(d, c) {
      const front = lit(wall, 0.1), side = shade(wall, 0.32), oc = dark(wall, 0.42);
      /* ---- ground shadow, cast to the lower right ---- */
      d.shadow(ax + w * 0.08 + dx * 0.35, ground + 3, w * 0.6 + eave + dx * 0.3, 11, 0.26);
      d.ell(x0 + w + dx * 0.6, ground + 4, w * 0.35, 5, 0.5).fill(hexA('#1E2A14', 0.1));

      /* ---- side wall ---- */
      const sidePoly = [[x0 + w, wallTop], P(x0 + w, wallTop, dep), P(x0 + w, ground, dep), [x0 + w, ground]];
      d.poly(sidePoly).solid(side, { oc, ow: 0.9 });
      onSide(c, x0 + w, () => {
        c.beginPath(); c.rect(0, wallTop, dep, fullH); c.clip();
        if (glass) { c.fillStyle = night ? mix(PAL.glass, PAL.glassNight, 0.45) : mix(PAL.glass, side, 0.25); c.fillRect(0, wallTop + 3, dep, fullH - 8); c.strokeStyle = hexA('#FFFFFF', 0.85); c.lineWidth = 1.2; for (let z = 6; z < dep; z += 11) { c.beginPath(); c.moveTo(z, wallTop + 3); c.lineTo(z, ground - 5); c.stroke(); } c.beginPath(); c.moveTo(0, wallTop + fullH * 0.5); c.lineTo(dep, wallTop + fullH * 0.5); c.stroke(); }
        if (stone) blocks(c, 0, wallTop, dep, fullH, hexA(PAL.stoneLight, 0.28), hexA(PAL.stoneDark, 0.28), 4);
        if (planks) { c.strokeStyle = hexA(PAL.timber, 0.35); c.lineWidth = 0.9; for (let y = wallTop + 6; y < ground - 4; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(dep, y); c.stroke(); } }
        if (timber) { c.strokeStyle = hexA(PAL.timber, 0.75); c.lineWidth = 2.2; for (const z of [dep * 0.35, dep * 0.7]) { c.beginPath(); c.moveTo(z, wallTop + 2); c.lineTo(z, ground - 5); c.stroke(); } c.beginPath(); c.moveTo(2, wallTop + fullH * 0.5); c.lineTo(dep - 2, wallTop + fullH * 0.5); c.stroke(); }
        // Side windows, one per floor, along the depth.
        for (let f = 0; f < floors; f += 1) for (let k = 0; k < sideWindows; k += 1) {
          if (glass) break;
          const sw = 9, sh = 10, z = dep * ((k + 1) / (sideWindows + 1)) - sw / 2, y = ground - wallH * (f + 1) + 11;
          c.fillStyle = PAL.white; rrect(c, z - 1.2, y - 1.2, sw + 2.4, sh + 2.4, 2); c.fill();
          c.fillStyle = night ? PAL.glassNight : mix(PAL.glass, side, 0.3); rrect(c, z, y, sw, sh, 1.2); c.fill();
          c.strokeStyle = hexA('#FFF', 0.85); c.lineWidth = 0.9; c.beginPath(); c.moveTo(z + sw / 2, y); c.lineTo(z + sw / 2, y + sh); c.moveTo(z, y + sh / 2); c.lineTo(z + sw, y + sh / 2); c.stroke();
        }
        // Plinth along the side.
        if (plinth) { c.fillStyle = hexA(mix(side, PAL.stoneDark, 0.4), 0.9); c.fillRect(0, ground - 5, dep, 5); }
        // Eave shadow along the top of the side wall.
        c.fillStyle = hexA('#000', 0.14); c.fillRect(0, wallTop, dep, 7);
      });

      /* ---- front wall ---- */
      d.rr(x0, wallTop, w, fullH, 1.5).shade(front, wallTop, ground, { lt: 0.08, dk: 0.1, oc, ow: 0.9 });
      c.save(); rrect(c, x0, wallTop, w, fullH, 1.5); c.clip();
      if (glass) { c.fillStyle = night ? mix(PAL.glass, PAL.glassNight, 0.5) : PAL.glass; c.fillRect(x0 + 3, wallTop + 4, w - 6, fullH - 9); c.strokeStyle = hexA('#FFFFFF', 0.95); c.lineWidth = 1.4; for (let x = x0 + 3; x <= x0 + w - 3; x += 12) { c.beginPath(); c.moveTo(x, wallTop + 4); c.lineTo(x, ground - 5); c.stroke(); } c.beginPath(); c.moveTo(x0 + 3, wallTop + fullH * 0.5); c.lineTo(x0 + w - 3, wallTop + fullH * 0.5); c.stroke(); if (!night) d.gleam(x0 + w * 0.3, wallTop + fullH * 0.35, w * 0.3, fullH * 0.3, 0.35); }
      if (stone) blocks(c, x0, wallTop, w, fullH, hexA(PAL.stoneLight, 0.35), hexA(PAL.stoneDark, 0.22), 5);
      if (planks) { c.strokeStyle = hexA(PAL.timber, 0.28); c.lineWidth = 0.9; for (let y = wallTop + 6; y < ground - 4; y += 6) { c.beginPath(); c.moveTo(x0 + 1, y); c.lineTo(x0 + w - 1, y); c.stroke(); } }
      if (timber) {
        c.strokeStyle = hexA(PAL.timber, 0.8); c.lineWidth = 2.4; c.lineCap = 'round';
        const n = Math.max(2, Math.round(w / 22));
        for (let i = 0; i <= n; i += 1) { const x = x0 + 2 + (i * (w - 4)) / n; c.beginPath(); c.moveTo(x, wallTop + 3); c.lineTo(x, ground - 5); c.stroke(); }
        c.beginPath(); c.moveTo(x0 + 2, wallTop + fullH * 0.5); c.lineTo(x0 + w - 2, wallTop + fullH * 0.5); c.stroke();
        c.beginPath(); c.moveTo(x0 + 2, ground - 5); c.lineTo(x0 + 2 + (w - 4) / n, wallTop + fullH * 0.5); c.stroke();
        c.beginPath(); c.moveTo(x0 + w - 2, ground - 5); c.lineTo(x0 + w - 2 - (w - 4) / n, wallTop + fullH * 0.5); c.stroke();
      }
      for (let f = 1; f < floors; f += 1) { c.strokeStyle = hexA(PAL.timber, 0.35); c.lineWidth = 1.4; c.beginPath(); c.moveTo(x0 + 1, ground - wallH * f); c.lineTo(x0 + w - 1, ground - wallH * f); c.stroke(); }
      if (plinth) { c.fillStyle = mix(front, PAL.stoneDark, 0.38); c.fillRect(x0, ground - 5, w, 5); c.fillStyle = hexA('#FFF', 0.18); c.fillRect(x0, ground - 5, w, 1); }
      c.fillStyle = hexA('#000', 0.16); c.fillRect(x0, wallTop, w, 7);
      c.restore();

      /* ---- windows on the front ---- */
      for (const wn of windows) {
        const ww = wn.w ?? 12, wh = wn.h ?? 13;
        const wx = x0 + wn.x * w - ww / 2, wy = ground - wallH * ((wn.floor ?? 0) + 1) + (wn.y ?? 9);
        d.rr(wx - 1.6, wy - 1.6, ww + 3.2, wh + 3.2, 2.5).solid(PAL.white, { oc: dark(wall, 0.35), ow: 0.8 });
        if (wn.arch) d.arch(wx, wy, ww, wh); else if (wn.round) d.circ(wx + ww / 2, wy + wh / 2, ww / 2); else d.rr(wx, wy, ww, wh, 1.5);
        d.solid(night ? PAL.glassNight : PAL.glass, { oc: dark(wall, 0.3), ow: 0.7 });
        d.line([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]]).stroke(hexA(PAL.white, 0.9), 1);
        d.line([[wx, wy + wh / 2], [wx + ww, wy + wh / 2]]).stroke(hexA(PAL.white, 0.9), 1);
        d.rr(wx - 2.2, wy + wh + 1.4, ww + 4.4, 2, 0.8).solid(mix(wall, PAL.stoneDark, 0.3), { outline: false });
        if (!night) d.gleam(wx + ww * 0.3, wy + wh * 0.3, ww * 0.3, wh * 0.25, 0.5);
        else d.glow(wx + ww / 2, wy + wh / 2, ww * 1.2, PAL.glow, 0.28);
        if (boxes && !(wn.floor ?? 0)) d.stamp(flowerBox({ w: ww + 6 }), wx + ww / 2, wy + wh + 9);
      }

      /* ---- door, with a step out front ---- */
      if (door) {
        const dw = door.w, dh = door.h, dx0 = doorX - dw / 2, dyy = ground - dh;
        d.poly([[dx0 - 2, ground], [dx0 + dw + 2, ground], [dx0 + dw - 1.5, ground + 3], [dx0 - 5.5, ground + 3]]).solid(mix(wall, PAL.stoneDark, 0.4), { outline: false });
        d.line([[dx0 - 5.5, ground + 3], [dx0 + dw - 1.5, ground + 3]]).stroke(hexA('#000', 0.15), 0.8);
        d.arch(dx0 - 1.6, dyy - 1.6, dw + 3.2, dh + 1.6).solid(mix(wall, PAL.stoneDark, 0.25), { oc, ow: 0.8 });
        d.arch(dx0, dyy, dw, dh).shade(door.color, dyy, ground, { lt: 0.18, dk: 0.22 });
        d.arch(dx0 + 2, dyy + 2, dw - 4, dh - 3).stroke(hexA('#000', 0.16), 0.9);
        d.line([[dx0 + dw / 2, dyy + 3], [dx0 + dw / 2, ground - 1]]).stroke(hexA('#000', 0.14), 0.8);
        d.circ(dx0 + dw - 3.5, dyy + dh * 0.58, 1.1).fill(PAL.coin);
        if (night) d.glow(doorX, dyy + 2, 8, PAL.glow, 0.2);
      }

      /* ---- roof ---- */
      const fl = [x0 - eave, wallTop + 1], fr = [x0 + w + eave, wallTop + 1];
      const ins = roofStyle === 'hip' ? Math.min(w * 0.28, roofH * 0.95) : 0;
      const rl = P(x0 - eave + ins, ridgeY, rz), rr = P(x0 + w + eave - ins, ridgeY, rz);
      const backR = P(x0 + w + eave, wallTop + 1, dep);
      if (roofStyle === 'gable') {
        d.poly([[x0 + w, wallTop + 1], P(x0 + w, wallTop + 1, dep), P(x0 + w, ridgeY, rz)]).solid(side, { oc, ow: 0.9 });
        if (timber) onSide(c, x0 + w, () => { c.strokeStyle = hexA(PAL.timber, 0.75); c.lineWidth = 2; c.beginPath(); c.moveTo(rz, wallTop); c.lineTo(rz, ridgeY + 3); c.stroke(); });
      }
      // The front slope.
      d.poly([fl, fr, rr, rl]);
      d.c.fillStyle = d.vgrad(rl[1], fl[1], [[0, light(roof, 0.28)], [0.55, roof], [1, mix(roof, '#000', 0.14)]]); d.c.fill();
      d.stroke(dark(roof, 0.38), 1);
      if (thatch) { d.c.strokeStyle = hexA(dark(roof, 0.35), 0.5); d.c.lineWidth = 0.9; for (let i = 0; i < 18; i += 1) { const t = i / 18; const a = lerp(fl, fr, t), b = lerp(rl, rr, t + 0.02); d.c.beginPath(); d.c.moveTo(a[0], a[1]); d.c.lineTo(b[0], b[1]); d.c.stroke(); } }
      else {
        for (let i = 1; i <= 3; i += 1) { const t = i / 4; const a = lerp(fl, rl, t), b = lerp(fr, rr, t); d.line([[a[0] + 2, a[1]], [b[0] - 2, b[1]]]).stroke(hexA('#000', 0.12), 1); }
        d.line([[lerp(fl, rl, 0.5)[0] + 3, lerp(fl, rl, 0.5)[1] + 1], [lerp(fl, rl, 0.5)[0] + w * 0.25, lerp(fl, rl, 0.5)[1] + 1]]).stroke(hexA('#FFF', 0.14), 1.4);
      }
      if (roofStyle === 'hip') { d.poly([fr, backR, rr]).solid(shade(roof, 0.35), { oc: dark(roof, 0.4), ow: 0.9 }); }
      // Barge boards and the ridge cap.
      d.line([fr, rr]).stroke(light(roof, 0.42), 1.6);
      if (roofStyle === 'gable') d.line([rr, backR]).stroke(light(roof, 0.42), 1.6);
      d.line([rl, rr]).stroke(light(roof, 0.45), 2.4);
      d.line([fl, fr]).stroke(dark(roof, 0.2), 1.4);

      /* ---- dormer ---- */
      if (dormer) {
        const zd = rz * 0.45, px = x0 + w * 0.5, py = wallTop - roofH * (zd / rz);
        const [bx, by] = P(px, py, zd);
        d.rr(bx - 8, by - 13, 16, 13, 1.5).shade(front, by - 13, by, { lt: 0.1, oc });
        d.poly([[bx - 10.5, by - 12], [bx, by - 20], [bx + 10.5, by - 12]]).shade(roof, by - 20, by - 12, { lt: 0.25 });
        d.rr(bx - 3.6, by - 10.5, 7.2, 7, 1.2).solid(night ? PAL.glassNight : PAL.glass, { oc: dark(wall, 0.3), ow: 0.7 });
      }

      /* ---- chimney ---- */
      if (chimney) {
        const zc = rz * (chimney.z ?? 0.62), px = x0 + w * chimney.x, py = wallTop - roofH * (zc / rz) + 2;
        const [bx, by] = P(px, py, zc);
        const cw = 9, ch = 15, cd = 8;
        d.poly([[bx + cw / 2, by - ch], [bx + cw / 2 + cd * KX, by - ch - cd * KY], [bx + cw / 2 + cd * KX, by - cd * KY], [bx + cw / 2, by]]).solid(shade(PAL.stone, 0.3), { oc: dark(PAL.stone, 0.4), ow: 0.8 });
        d.rr(bx - cw / 2, by - ch, cw, ch, 1).shade(PAL.stone, by - ch, by, { lt: 0.15 });
        d.poly([[bx - cw / 2, by - ch], [bx + cw / 2, by - ch], [bx + cw / 2 + cd * KX, by - ch - cd * KY], [bx - cw / 2 + cd * KX, by - ch - cd * KY]]).solid(PAL.stoneDark, { oc: dark(PAL.stone, 0.4), ow: 0.8 });
        d.rr(bx - cw / 2 - 1, by - ch - 1, cw + 2, 3, 0.8).solid(PAL.stoneDark, { outline: false });
        points.chimney = [bx + 2, by - ch - 3];
      }

      /* ---- awning ---- */
      if (awning) {
        const ax0 = x0 + w * awning.x0, ax1 = x0 + w * awning.x1, ay0 = wallTop + (awning.y ?? 6), out = 12;
        const bl = [ax0 - out * KX, ay0 + out * KY], br = [ax1 - out * KX, ay0 + out * KY];
        d.poly([[ax0, ay0], [ax1, ay0], br, bl]).shade(awning.color, ay0, bl[1], { lt: 0.22, dk: 0.1, oc: dark(awning.color, 0.3) });
        const n = Math.floor((ax1 - ax0) / 9);
        for (let i = 0; i < n; i += 1) if (i % 2) { const t0 = i / n, t1 = (i + 1) / n; d.poly([lerp([ax0, ay0], [ax1, ay0], t0), lerp([ax0, ay0], [ax1, ay0], t1), lerp(bl, br, t1), lerp(bl, br, t0)]).fill(hexA('#FFFFFF', 0.62)); }
        for (let i = 0; i <= n; i += 1) { const [sx, sy] = lerp(bl, br, (i + 0.5) / n); if (i < n) { c.beginPath(); c.arc(sx, sy, (br[0] - bl[0]) / n / 2, 0, Math.PI); c.closePath(); c.fillStyle = i % 2 ? hexA('#FFFFFF', 0.95) : awning.color; c.fill(); d.stroke(dark(awning.color, 0.3), 0.6); } }
        d.line([[ax0, ay0], [ax1, ay0]]).stroke(dark(awning.color, 0.3), 1.2);
        // Two poles hold the front edge up.
        d.rr(bl[0] + 2, bl[1], 2, ground + 2 - bl[1], 0.8).solid(PAL.woodDark, { outline: false });
        d.rr(br[0] - 4, br[1], 2, ground + 2 - br[1], 0.8).solid(PAL.woodDark, { outline: false });
      }

      /* ---- hanging sign ---- */
      if (sign) {
        const sx = x0 + w * (sign.x ?? 0.86), sy = wallTop + 8;
        d.line([[sx - 9, sy], [sx + 1, sy]]).stroke(PAL.iron, 1.4);
        d.line([[sx - 9, sy], [sx - 9, sy + 5]]).stroke(PAL.iron, 1.4);
        d.line([[sx - 6, sy + 1], [sx - 6, sy + 4]]).stroke(PAL.iron, 0.9); d.line([[sx - 1, sy + 1], [sx - 1, sy + 4]]).stroke(PAL.iron, 0.9);
        d.rr(sx - 11, sy + 4, 16, 14, 2.5).shade(sign.bg ?? PAL.white, sy + 4, sy + 18, { lt: 0.08, oc: dark(PAL.woodLight, 0.4) });
        drawGlyph(d, sign.glyph, sx - 3, sy + 11, 4.8);
        points.sign = [sx - 3, sy + 11];
      }

      /* ---- the lamp by the door ---- */
      if (hasLamp) {
        const lx = Math.max(x0 + 8, doorX - door.w / 2 - 10), ly = ground - 32;
        d.line([[lx, ly], [lx + 5, ly]]).stroke(PAL.iron, 1.4);
        d.rr(lx - 3, ly + 1, 6, 8, 1.4).solid(night ? PAL.glassNight : '#C9D6E0', { oc: PAL.iron, ow: 0.9 });
        d.poly([[lx - 4, ly + 1.4], [lx, ly - 1.5], [lx + 4, ly + 1.4]]).solid(PAL.iron, { ow: 0.5 });
        if (night) { d.glow(lx, ly + 5, 12, PAL.glow, 0.55); d.circ(lx, ly + 5, 1.6).fill('#FFF8DC'); }
        points.lamp = [lx, ly + 5];
      }

      /* ---- banner on a pole at the ridge ---- */
      if (banner) {
        const [bx, by] = rl;
        const px = bx + 6, top = by - 22;
        d.rr(px - 1, top, 2, by - top + 2, 0.8).solid(PAL.woodDark, { outline: false });
        d.poly([[px + 1, top + 1], [px + 15, top + 5], [px + 1, top + 10]]).solid(banner.color, { ow: 0.7 });
        d.circ(px, top, 1.5).fill(PAL.coin);
      }

      /* ---- a bell on a post (the market's third level) ---- */
      if (bell) {
        const [bx, by] = rr;
        const px = bx - 8, top = by - 16;
        d.rr(px - 1.2, top, 2.4, by - top + 1, 0.8).solid(PAL.woodDark, { outline: false });
        d.line([[px - 5, top + 1], [px + 5, top + 1]]).stroke(PAL.woodDark, 2);
        drawGlyph(d, 'bell', px, top + 6, 3.8);
      }

      /* ---- tower ---- */
      if (tower) {
        const tw = tower.w, th = tower.h;
        const tcx = x0 + w + dx * 0.55 + tw / 2 + 4, tby = ground - dy * 0.5 + 3, tTop = tby - th;
        d.shadow(tcx + 4, tby + 1, tw * 0.7, 4, 0.2);
        d.rr(tcx - tw / 2, tTop, tw, th, 2);
        d.c.fillStyle = d.hgrad(tcx - tw / 2, tcx + tw / 2, [[0, lit(tower.wall ?? PAL.stoneLight, 0.16)], [0.45, tower.wall ?? PAL.stoneLight], [1, shade(tower.wall ?? PAL.stoneLight, 0.35)]]); d.c.fill();
        d.stroke(dark(PAL.stoneLight, 0.42), 0.9);
        c.save(); rrect(c, tcx - tw / 2, tTop, tw, th, 2); c.clip(); blocks(c, tcx - tw / 2, tTop, tw, th, hexA(PAL.stoneLight, 0.35), hexA(PAL.stoneDark, 0.22), 5); c.restore();
        d.ell(tcx, tby, tw / 2, 3).fill(hexA('#000', 0.12));
        for (let f = 0; f < (tower.windows ?? 2); f += 1) {
          const wy = tTop + 16 + f * 20;
          d.arch(tcx - 4, wy, 8, 11).solid(night ? PAL.glassNight : PAL.glass, { oc: dark(PAL.stoneLight, 0.4), ow: 0.8 });
          if (night) d.glow(tcx, wy + 5, 9, PAL.glow, 0.3);
        }
        if (tower.dome) {
          d.rr(tcx - tw / 2 - 3, tTop - 6, tw + 6, 7, 2).shade(PAL.stone, tTop - 6, tTop + 1);
          c.beginPath(); c.arc(tcx, tTop - 5, tw / 2 + 2, Math.PI, 0); c.closePath();
          d.shade(PAL.copper, tTop - tw / 2 - 7, tTop - 5, { lt: 0.32 });
          d.line([[tcx - tw * 0.3, tTop - 5], [tcx - tw * 0.3, tTop - tw * 0.42]]).stroke(hexA('#000', 0.14), 1);
          d.line([[tcx + 3, tTop - tw / 2 - 6], [tcx + 12, tTop - tw / 2 - 14]]).stroke(PAL.iron, 2.2);
          d.circ(tcx, tTop - tw / 2 - 7, 1.8).fill(PAL.copperLight);
        } else {
          d.poly([[tcx - tw / 2 - 4, tTop + 1], [tcx, tTop - tw * 0.75], [tcx + tw / 2 + 4, tTop + 1]]).shade(tower.roof ?? roof, tTop - tw * 0.75, tTop + 1, { lt: 0.26 });
          d.line([[tcx - tw / 2 - 4, tTop + 1], [tcx + tw / 2 + 4, tTop + 1]]).stroke(light(tower.roof ?? roof, 0.4), 1.4);
          d.circ(tcx, tTop - tw * 0.75, 1.8).fill(PAL.coin);
        }
      }

      /* ---- a water wheel on the side (the mill) ---- */
      if (wheel) {
        const wx = x0 + w + dx * 0.45 + 14, wy = ground - dy * 0.3 - 2, R = 17;
        d.circ(wx, wy, R + 1).stroke(dark(PAL.wood, 0.4), 4.5);
        d.circ(wx, wy, R + 1).stroke(PAL.wood, 3);
        for (let i = 0; i < 8; i += 1) { const a = (i / 8) * Math.PI * 2; d.line([[wx, wy], [wx + Math.cos(a) * R, wy + Math.sin(a) * R]]).stroke(PAL.woodDark, 1.8); d.rr(wx + Math.cos(a) * R - 2.5, wy + Math.sin(a) * R - 2.5, 5, 5, 1).fill(PAL.woodLight); }
        d.circ(wx, wy, 3).solid(PAL.iron);
        points.wheel = [wx, wy];
      }

      for (const ex of extras) ex(d, { x0, w, ground, wallTop, ridgeY, dx, dy, c, doorX });
    },
  };
}

/** Draw on the side wall's plane: x becomes depth, y stays height. */
function onSide(c, xEdge, fn) { c.save(); c.transform(KX, -KY, 0, 1, xEdge, 0); fn(); c.restore(); }

function rrect(c, x, y, w, h, r) {
  const rr2 = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + rr2, y); c.arcTo(x + w, y, x + w, y + h, rr2); c.arcTo(x + w, y + h, x, y + h, rr2); c.arcTo(x, y + h, x, y, rr2); c.arcTo(x, y, x + w, y, rr2); c.closePath();
}

/** Rounded stone blocks in a rect, two alternating tones. */
function blocks(c, x, y, w, h, a, b, rowH = 5) {
  for (let yy = y + 3, row = 0; yy < y + h - 4; yy += rowH + 1.5, row += 1) {
    for (let xx = x + 2 + (row % 2) * 6; xx < x + w - 3; xx += 12) {
      c.fillStyle = (row + Math.round(xx / 12)) % 3 ? a : b;
      rrect(c, xx, yy, Math.min(10, x + w - 2 - xx), rowH, 1.5); c.fill();
    }
  }
}

/* ------------------------------------------------------------------ */
/* The named buildings                                                 */
/* ------------------------------------------------------------------ */

export function building({ id = 'hearth', level = 1, night = false, seed = 'b' }) {
  const L = Math.max(1, level);
  switch (id) {
    case 'hearth': return house({
      w: 86 + Math.min(L, 3) * 4, d: 46, wallH: 38, roofH: 30 + L * 1.5, wall: PAL.cream, roof: PAL.roofRed, night,
      windows: [{ x: 0.26, y: 11, w: 13, h: 14 }, ...(L >= 4 ? [{ x: 0.5, y: 8, w: 10, h: 9 }] : [])],
      door: { x: L >= 4 ? 0.72 : 0.7, w: 16, h: 25, color: PAL.woodDark },
      chimney: L >= 2 ? { x: 0.2, z: 0.7 } : null, boxes: L >= 3, lamp: L >= 4, dormer: L >= 5,
      banner: L >= 5 ? { color: PAL.roofRed } : null,
    });
    case 'reading': return house({
      w: 98, d: 50, wallH: L >= 2 ? 34 : 42, floors: L >= 2 ? 2 : 1, roofH: 30, wall: PAL.plaster, roof: PAL.roofBlue, night,
      windows: L >= 2
        ? [{ x: 0.24, y: 8, w: 12, h: 12 }, { x: 0.76, y: 8, w: 12, h: 12 }, { x: 0.24, y: 8, floor: 1, w: 13, h: 14, arch: true }, { x: 0.76, y: 8, floor: 1, w: 13, h: 14, arch: true }]
        : [{ x: 0.24, y: 10, w: 16, h: 18, arch: true }, { x: 0.76, y: 10, w: 16, h: 18, arch: true }],
      door: { x: 0.5, w: 16, h: 26, color: PAL.timber }, sign: { glyph: 'book', x: 0.9 }, lamp: true, boxes: L >= 2, sideWindows: 2,
      tower: L >= 3 ? { w: 32, h: L >= 4 ? 118 : 100, windows: 3, dome: L >= 4, roof: PAL.roofBlue } : null,
      banner: L >= 3 ? { color: PAL.roofBlue } : null,
      extras: [(d, { x0, w, ground }) => { d.stamp(crate({ kind: 'books' }), x0 - 8, ground + 2); }],
    });
    case 'garden': return L >= 2 ? house({
      w: 96, d: 46, wallH: 32, roofH: 26, wall: PAL.white, roof: mix(PAL.glass, PAL.roofGreen, 0.35), night, glass: true, sideWindows: 0,
      windows: [], door: { x: 0.5, w: 14, h: 22, color: PAL.timber }, sign: { glyph: 'bloom', x: 0.9 }, plinth: true,
      banner: L >= 4 ? { color: PAL.roofGreen } : null, lamp: L >= 3,
      extras: [
        (d, { x0, w, ground }) => { d.stamp(beds({ seed: 'gb', w: L >= 3 ? 52 : 42, rows: 2, grown: 0.5 + L * 0.15, flowers: true }), x0 + 16, ground + 13); },
        ...(L >= 3 ? [(d, { x0, ground }) => { d.stamp(hive(), x0 - 14, ground + 2); }] : []),
      ],
    }) : house({
      w: 66, d: 38, wallH: 30, roofH: 22, wall: PAL.plank, roof: PAL.roofGreen, night, planks: true,
      windows: [{ x: 0.3, y: 8, w: 10, h: 10 }], door: { x: 0.72, w: 13, h: 21, color: PAL.timber }, sign: { glyph: 'bloom', x: 0.9 }, sideWindows: 1,
      extras: [(d, { x0, w, ground }) => { d.stamp(beds({ seed: 'gb', w: 40, rows: 2, grown: 0.6, flowers: false }), x0 + 12, ground + 13); }],
    });
    case 'roots': return house({
      w: 88, d: 46, wallH: L >= 4 ? 30 : 40, floors: L >= 4 ? 2 : 1, roofH: 26, wall: PAL.stoneLight, roof: PAL.roofTeal, roofStyle: 'hip', night, stone: true,
      windows: L >= 4 ? [{ x: 0.28, y: 8, w: 11, h: 11 }, { x: 0.72, y: 8, w: 11, h: 11 }, { x: 0.5, y: 6, floor: 1, w: 14, h: 14, round: true }] : [{ x: 0.3, y: 10, w: 17, h: 17, round: true }, { x: 0.78, y: 14, w: 9, h: 10 }],
      door: { x: L >= 4 ? 0.5 : 0.62, w: 15, h: 24, color: PAL.woodDark }, sign: { glyph: 'ink', x: 0.9 }, chimney: L >= 2 ? { x: 0.22, z: 0.7 } : null, lamp: L >= 3,
      banner: L >= 4 ? { color: PAL.roofTeal } : null,
      extras: L >= 3 ? [(d, { x0, w, ground }) => { d.stamp(crate({ kind: 'barrel' }), x0 - 10, ground + 1); d.stamp(crate({ kind: 'sack' }), x0 - 24, ground + 3); }] : [],
    });
    case 'loom': return house({
      w: 94, d: 44, wallH: L >= 3 ? 30 : 38, floors: L >= 3 ? 2 : 1, roofH: 28, wall: PAL.cream, roof: PAL.roofPlum, night, timber: true,
      windows: L >= 3 ? [{ x: 0.22, y: 8, w: 11, h: 11 }, { x: 0.78, y: 8, w: 11, h: 11 }, { x: 0.3, y: 7, floor: 1, w: 11, h: 11 }, { x: 0.7, y: 7, floor: 1, w: 11, h: 11 }] : [{ x: 0.24, y: 9, w: 13, h: 13 }, { x: 0.76, y: 9, w: 13, h: 13 }],
      door: { x: 0.5, w: 15, h: 24, color: PAL.timber }, sign: L >= 2 ? { glyph: 'thread', x: 0.9 } : null, lamp: L >= 4,
      awning: { x0: 0.06, x1: 0.94, y: 8, color: PAL.roofPlum }, banner: L >= 4 ? { color: PAL.roofPlum } : null,
      extras: [(d, { x0, w, ground }) => { d.stamp(crate({ kind: 'sack' }), x0 + w + 16, ground + 6); }],
    });
    case 'market': return L >= 2 ? house({
      w: 100, d: 46, wallH: 34, roofH: 24, wall: PAL.cream, roof: PAL.roofGold, roofStyle: 'hip', night,
      windows: [{ x: 0.2, y: 9, w: 12, h: 12 }, { x: 0.8, y: 9, w: 12, h: 12 }],
      door: { x: 0.5, w: 18, h: 25, color: PAL.timber }, sign: { glyph: 'scales', x: 0.9 }, lamp: L >= 3, bell: L >= 3,
      awning: { x0: 0.05, x1: 0.95, y: 5, color: PAL.roofRed }, banner: L >= 3 ? { color: PAL.roofRed } : null,
      extras: [(d, { x0, w, ground }) => { d.stamp(crate(), x0 - 10, ground + 2); d.stamp(crate({ kind: 'sack' }), x0 + w + 14, ground + 6); d.stamp(crate({ kind: 'barrel' }), x0 + w + 28, ground + 2); }],
    }) : stall({ night });
    case 'cottage': return cottage({ seed, level: L, night });
    case 'barn': return house({
      w: 104, d: 60, wallH: 44, roofH: 34, wall: PAL.roofBrown, roof: PAL.roofSlate, night, planks: true, sideWindows: 0,
      windows: [{ x: 0.5, y: 6, w: 14, h: 12, arch: true }], door: { x: 0.5, w: 30, h: 30, color: PAL.woodDark },
      extras: [(d, { doorX, ground }) => { d.line([[doorX - 15, ground - 30], [doorX + 15, ground]]).stroke(hexA('#FFF', 0.18), 2); d.line([[doorX + 15, ground - 30], [doorX - 15, ground]]).stroke(hexA('#FFF', 0.18), 2); d.line([[doorX, ground - 30], [doorX, ground]]).stroke(dark(PAL.woodDark, 0.4), 1.4); }],
    });
    case 'mill': return house({
      w: 72, d: 42, wallH: 46, roofH: 24, wall: PAL.stoneLight, roof: PAL.roofSlate, roofStyle: 'hip', night, stone: true, wheel: true,
      windows: [{ x: 0.5, y: 10, w: 12, h: 12, arch: true }], door: { x: 0.35, w: 14, h: 22, color: PAL.woodDark }, chimney: { x: 0.75, z: 0.6 },
      extras: [(d, { x0, ground }) => { d.stamp(crate({ kind: 'sack' }), x0 - 8, ground + 2); d.stamp(crate({ kind: 'sack' }), x0 - 20, ground + 5); }],
    });
    case 'school': return house({
      w: 100, d: 48, wallH: 40, roofH: 30, wall: PAL.plasterWarm, roof: PAL.roofSlate, night,
      windows: [{ x: 0.22, y: 9, w: 13, h: 15, arch: true }, { x: 0.78, y: 9, w: 13, h: 15, arch: true }], door: { x: 0.5, w: 16, h: 25, color: PAL.timber }, bell: true, sign: { glyph: 'book', x: 0.9 }, lamp: true,
    });
    default: return house({ w: 76, d: 40, wallH: 34, roofH: 26, night });
  }
}

/** A neighbour's cottage: a small house whose colours come from the seed. */
export function cottage({ seed = 'c', level = 1, night = false }) {
  const r = rng(`cottage:${seed}`);
  const walls = [PAL.cream, PAL.plasterWarm, PAL.white, PAL.stoneLight, PAL.plank];
  const roofs = [PAL.roofRed, PAL.roofSlate, PAL.roofThatch, PAL.roofGreen, PAL.roofPlum, PAL.roofTeal];
  const wall = walls[Math.floor(r() * walls.length)], roof = roofs[Math.floor(r() * roofs.length)];
  const thatch = roof === PAL.roofThatch;
  return house({
    w: 68 + Math.floor(r() * 3) * 6, d: 36 + Math.floor(r() * 2) * 6, wallH: 32, roofH: 24 + (thatch ? 4 : 0), wall, roof, night, thatch,
    stone: wall === PAL.stoneLight, planks: wall === PAL.plank, roofStyle: r() > 0.6 ? 'hip' : 'gable',
    windows: [{ x: 0.28, y: 9, w: 11, h: 12 }, ...(r() > 0.5 ? [{ x: 0.78, y: 9, w: 9, h: 10 }] : [])],
    door: { x: r() > 0.5 ? 0.66 : 0.6, w: 13, h: 21, color: r() > 0.5 ? PAL.woodDark : PAL.timber },
    chimney: r() > 0.3 ? { x: 0.2 + r() * 0.2, z: 0.7 } : null, boxes: level >= 2, lamp: level >= 2,
  });
}

/** The market at level one: a stall with a striped awning and crates. */
export function stall({ night = false }) {
  const w = 100, h = 76;
  return {
    w, h, ax: w / 2, ay: h - 8, points: { door: [w / 2, h - 8], worker: [w / 2 - 34, h - 2], shelf: [w - 10, h - 4], top: 4, width: 84 },
    draw(d, c) {
      const ground = h - 8, x0 = 16, W = 62, D = 26;
      d.shadow(w / 2 + 4, ground + 2, 40, 7, 0.22);
      // Counter: an oblique box.
      d.poly([[x0 + W, ground - 18], P(x0 + W, ground - 18, D), P(x0 + W, ground, D), [x0 + W, ground]]).solid(shade(PAL.woodLight, 0.3), { oc: dark(PAL.woodLight, 0.4), ow: 0.9 });
      d.rr(x0, ground - 18, W, 18, 2).shade(PAL.woodLight, ground - 18, ground);
      for (let i = 0; i < 6; i += 1) d.line([[x0 + 5 + i * 11, ground - 16], [x0 + 5 + i * 11, ground - 3]]).stroke(hexA(PAL.timber, 0.4), 0.8);
      d.poly([[x0 - 2, ground - 18], [x0 + W + 2, ground - 18], P(x0 + W + 2, ground - 18, D), P(x0 - 2, ground - 18, D)]).solid(lit(PAL.woodLight, 0.2), { oc: dark(PAL.woodLight, 0.4), ow: 0.8 });
      // Goods on the counter.
      d.stamp(crate({ kind: 'books' }), x0 + 12, ground - 20);
      for (let i = 0; i < 3; i += 1) d.circ(x0 + 30 + i * 6, ground - 22, 2.8).solid(['#F26D7D', '#F6C445', '#A785DD'][i], { ow: 0.5 });
      d.rr(x0 + 46, ground - 27, 11, 7, 1.5).shade(PAL.cloth, ground - 27, ground - 20);
      // Posts and the awning.
      for (const [px, pz] of [[x0 - 4, 0], [x0 + W + 4, 0], [x0 - 4, D], [x0 + W + 4, D]]) { const [qx, qy] = P(px, ground, pz); d.rr(qx - 1.6, qy - 40, 3.2, 40 - (pz ? 0 : 18), 1.2).solid(PAL.woodDark, { outline: false }); }
      const fy = ground - 40, bl = P(x0 - 10, fy + 2, D + 6), br = P(x0 + W + 10, fy + 2, D + 6);
      d.poly([[x0 - 10, fy], [x0 + W + 10, fy], br, bl]).shade(PAL.roofRed, bl[1], fy, { lt: 0.22 });
      const n = 8;
      for (let i = 0; i < n; i += 1) if (i % 2) d.poly([lerp([x0 - 10, fy], [x0 + W + 10, fy], i / n), lerp([x0 - 10, fy], [x0 + W + 10, fy], (i + 1) / n), lerp(bl, br, (i + 1) / n), lerp(bl, br, i / n)]).fill(hexA('#FFFFFF', 0.62));
      for (let i = 0; i < n; i += 1) { const sx = x0 - 10 + (W + 20) * (i + 0.5) / n; c.beginPath(); c.arc(sx, fy, (W + 20) / n / 2, 0, Math.PI); c.closePath(); c.fillStyle = i % 2 ? '#FFFFFF' : PAL.roofRed; c.fill(); d.stroke(dark(PAL.roofRed, 0.3), 0.6); }
      d.line([[x0 - 10, fy], [x0 + W + 10, fy]]).stroke(dark(PAL.roofRed, 0.3), 1.2);
      // The sign on the awning.
      d.rr(x0 + W / 2 - 9, fy - 15, 18, 13, 2.5).shade(PAL.white, fy - 15, fy - 2, { lt: 0.08 });
      drawGlyph(d, 'scales', x0 + W / 2, fy - 8.5, 4.6);
      d.stamp(crate(), x0 - 12, ground + 2);
      d.stamp(crate({ kind: 'sack' }), x0 + W + 12, ground + 4);
      if (night) { d.glow(x0 + W / 2, ground - 26, 24, PAL.glow, 0.25); }
    },
  };
}

/**
 * A building going up: the site cleared, the frame, then the walls half
 * done. Stage 0 is the cleared ground with the materials stacked, 1 the
 * timber frame, 2 the walls rising under rafters.
 */
export function scaffold({ w = 90, d: dep = 44, wallH = 40, stage = 1 }) {
  const d = dep;
  const dx = d * KX, dy = d * KY;
  const padL = 14, padR = 14, padB = 12;
  const W = padL + w + dx + padR, H = wallH + dy + 40 + padB;
  const x0 = padL, ground = H - padB, wallTop = ground - wallH;
  return {
    w: W, h: H, ax: x0 + w / 2, ay: ground,
    draw(b, c) {
      const d = b;
      d.shadow(x0 + w / 2 + dx * 0.3, ground + 2, w * 0.55 + dx * 0.3, 9, 0.2);
      // Cleared ground: a pale earth footprint.
      d.poly([[x0 - 6, ground + 2], [x0 + w + 6, ground + 2], P(x0 + w + 6, ground + 2, dep), P(x0 - 6, ground + 2, dep)]).solid(hexA(PAL.earth, 0.75), { oc: hexA(PAL.soil, 0.5), ow: 1 });
      // Stakes and string.
      for (const [px, pz] of [[x0, 0], [x0 + w, 0], [x0, dep], [x0 + w, dep]]) { const [qx, qy] = P(px, ground, pz); d.rr(qx - 1, qy - 8, 2, 8, 0.6).solid(PAL.woodLight, { ow: 0.5 }); }
      d.line([[x0, ground - 7], [x0 + w, ground - 7], P(x0 + w, ground - 7, dep)]).stroke(hexA('#FFFFFF', 0.6), 0.8);
      // Materials: crates and planks at the front left.
      d.stamp(crate(), x0 - 4, ground + 8); d.stamp(crate(), x0 + 10, ground + 10);
      d.rr(x0 + w - 30, ground - 3, 26, 5, 1).shade(PAL.plank, ground - 3, ground + 2);
      d.rr(x0 + w - 28, ground - 7, 22, 4, 1).shade(PAL.plank, ground - 7, ground - 3);
      if (stage >= 1) {
        // Plinth and the frame.
        d.rr(x0, ground - 5, w, 5, 1.5).shade(PAL.stone, ground - 5, ground, { lt: 0.1 });
        d.poly([[x0 + w, ground - 5], P(x0 + w, ground - 5, dep), P(x0 + w, ground, dep), [x0 + w, ground]]).solid(shade(PAL.stone, 0.3), { oc: dark(PAL.stone, 0.4), ow: 0.8 });
        const posts = [[x0 + 3, 0], [x0 + w - 3, 0], [x0 + w - 3, dep], [x0 + w * 0.5, 0]];
        for (const [px, pz] of posts) { const [qx, qy] = P(px, ground - 5, pz); d.rr(qx - 1.8, qy - wallH, 3.6, wallH, 1).shade(PAL.plank, qy - wallH, qy); }
        d.line([[x0 + 3, wallTop - 5], [x0 + w - 3, wallTop - 5], P(x0 + w - 3, wallTop - 5, dep)]).stroke(PAL.plank, 3.2);
        d.line([[x0 + 3, wallTop + wallH * 0.5 - 5], [x0 + w - 3, wallTop + wallH * 0.5 - 5]]).stroke(hexA(PAL.plank, 0.8), 2.2);
        // A ladder against the frame.
        d.line([[x0 + w * 0.7 - 5, ground - 2], [x0 + w * 0.7 + 1, wallTop - 10]]).stroke(PAL.woodDark, 1.6);
        d.line([[x0 + w * 0.7 + 2, ground - 2], [x0 + w * 0.7 + 8, wallTop - 10]]).stroke(PAL.woodDark, 1.6);
        for (let i = 1; i < 6; i += 1) { const t = i / 6; d.line([[x0 + w * 0.7 - 5 + 6 * t, ground - 2 - (ground - 2 - wallTop + 10) * t], [x0 + w * 0.7 + 2 + 6 * t, ground - 2 - (ground - 2 - wallTop + 10) * t]]).stroke(PAL.woodLight, 1.4); }
      }
      if (stage >= 2) {
        // Walls half up, rafters over them.
        const hh = wallH * 0.62;
        d.poly([[x0 + w, ground - 5 - hh], P(x0 + w, ground - 5 - hh, dep), P(x0 + w, ground - 5, dep), [x0 + w, ground - 5]]).solid(shade(PAL.plaster, 0.3), { oc: dark(PAL.plaster, 0.4), ow: 0.8 });
        d.rr(x0, ground - 5 - hh, w, hh, 1).shade(PAL.plaster, ground - 5 - hh, ground - 5, { lt: 0.08 });
        for (let i = 0; i < 4; i += 1) d.rr(x0 + 8 + i * (w - 16) / 3 - 2, ground - 5 - hh - 3, 4, 3, 0.5).fill(PAL.plank);
        const rz = dep / 2;
        for (let i = 0; i <= 4; i += 1) { const t = i / 4; const a = [x0 - 4 + t * (w + 8), wallTop - 4]; const b = P(x0 - 4 + t * (w + 8), wallTop - 4 - 26, rz); d.line([a, b]).stroke(PAL.plank, 2); }
        d.line([P(x0 - 4, wallTop - 30, rz), P(x0 + w + 4, wallTop - 30, rz)]).stroke(PAL.plank, 2.6);
        // A wheelbarrow of mortar out front.
        d.rr(x0 + w - 44, ground + 3, 16, 7, 2).shade(PAL.iron, ground + 3, ground + 10, { lt: 0.2 });
        d.ell(x0 + w - 36, ground + 3, 7, 2.5).fill(PAL.stoneLight);
        d.circ(x0 + w - 46, ground + 10, 3).solid(PAL.woodDark, { oc: PAL.timber, ow: 0.8 });
        d.line([[x0 + w - 28, ground + 6], [x0 + w - 20, ground + 4]]).stroke(PAL.woodDark, 1.6);
      }
    },
  };
}

export const BUILDINGS_ART = { house, building, cottage, stall, scaffold };
export { FLOWERS, lampSpec };
