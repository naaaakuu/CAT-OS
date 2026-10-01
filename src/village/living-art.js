/** Cached, softly shaded inhabitants in the art pack's palette.
 * Map figures and portraits share one appearance. No per-frame drawing. */
export const PEOPLE = Object.freeze({
  ada: ['#BD947A', '#514338', '#789699', 'bun', 'book'],
  bo: ['#A87555', '#453E32', '#859C78', 'hat', 'basket'],
  ines: ['#D4AB86', '#5B5768', '#927899', 'bob', 'bottle'],
  nell: ['#B57D5F', '#54483D', '#C28265', 'bun', 'cloth'],
  rafi: ['#AC7655', '#453D35', '#D8AD59', 'crop', 'basket'],
  mira: ['#BC8968', '#54483D', '#557E80', 'bob', 'book'],
  tomas: ['#C39778', '#C9C5AC', '#789699', 'cap', 'bag'],
  hal: ['#D4AB86', '#745D49', '#AD664F', 'crop', 'basket'],
  priya: ['#A87555', '#453E32', '#859C78', 'bun', 'bottle'],
  wren: ['#D4AB86', '#AD664F', '#C58B87', 'cap', 'bag'],
  anselm: ['#BC8968', '#C9C5AC', '#927052', 'crop', 'bag'],
  dara: ['#A87555', '#453E32', '#F2E4C6', 'bun', 'basket'],
  kit: ['#C39778', '#54483D', '#789699', 'cap', 'bag'],
  sunniva: ['#D4AB86', '#B6956E', '#D8AD59', 'hat', 'basket'],
  oren: ['#BC8968', '#745D49', '#859C78', 'crop', 'bag'],
});
function oval(c, x, y, rx, ry, color, shade) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (shade) {
    const g = c.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
    g.addColorStop(0, color); g.addColorStop(1, shade); c.fillStyle = g;
  } else c.fillStyle = color;
  c.fill();
}
function poly(c, points, color) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = color; c.fill();
}
function stroke(c, points, color, width = 1) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function person(c, p) {
  const [skin, hair, coat, style, prop] = PEOPLE[p.id] ?? PEOPLE.mira;
  const stride = p.pose === 'walk' ? [0, 2.4, 0, -2.4][(p.frame ?? 0) % 4] : 0;
  const cheer = p.pose === 'cheer';
  oval(c, 24, 51, 12, 3.4, 'rgba(53,70,50,.15)');
  stroke(c, [[20, 41], [19 - stride, 49]], '#54483D', 4.5);
  stroke(c, [[27, 41], [28 + stride, 49]], '#745D49', 4.5);
  oval(c, 18 - stride, 49, 4, 2, '#54483D'); oval(c, 29 + stride, 49, 4, 2, '#54483D');
  c.save(); c.translate(0, stride ? -0.7 : 0);
  poly(c, [[17, 27], [28, 26], [33, 42], [16, 43]], coat);
  poly(c, [[27, 27], [31, 29], [33, 42], [27, 42]], 'rgba(53,60,51,.18)');
  oval(c, 22, 28, 4, 2, '#F2E4C6');
  const handY = cheer ? 14 : p.pose === 'work' ? 32 + (p.frame % 2) * 2 : 38;
  stroke(c, [[17, 29], [12 - stride / 2, handY]], coat, 4.5);
  stroke(c, [[29, 29], [35 + stride / 2, handY]], coat, 4.5);
  oval(c, 12 - stride / 2, handY, 2.5, 2.8, skin); oval(c, 35 + stride / 2, handY, 2.5, 2.8, skin);
  oval(c, 23, 18, 10.5, 11.5, hair);
  oval(c, 24, 20, 9, 9.4, skin, '#A87555');
  oval(c, 16, 21, 2.2, 3, skin); oval(c, 33, 21, 2, 2.8, skin);
  poly(c, [[14, 16], [15, 9], [23, 6], [32, 10], [33, 17], [28, 15], [23, 11], [20, 16]], hair);
  if (style === 'bob') { oval(c, 15, 20, 2.5, 8, hair); oval(c, 32, 20, 2.6, 7, hair); }
  if (style === 'bun') oval(c, 14, 10, 4.5, 4.5, hair, '#453E32');
  if (style === 'hat' || style === 'cap') {
    oval(c, 23, 10, 10, 5.5, style === 'hat' ? '#CCBA98' : coat, '#927052');
    oval(c, 23, 13, style === 'hat' ? 14 : 11, 2.8, style === 'hat' ? '#CCBA98' : coat);
  }
  oval(c, 21.5, 20.5, .85, 1.15, '#453D35'); oval(c, 28, 20.5, .85, 1.15, '#453D35');
  oval(c, 25.5, 23, 1.1, 1, '#B57D5F');
  stroke(c, [[23, 25], [25, 26], [27, 25]], '#745D49', .8);
  oval(c, 19, 23.7, 2, 1, 'rgba(197,139,135,.4)');
  if (p.id === 'tomas' || p.id === 'anselm') oval(c, 25, 27, 5, 3.5, '#C9C5AC');
  if (p.id === 'ada' || p.id === 'mira') {
    c.strokeStyle = '#54483D'; c.lineWidth = .7;
    c.strokeRect(18.5, 18.5, 5, 4.5); c.strokeRect(26, 18.5, 5, 4.5); stroke(c, [[23.5, 20], [26, 20]], '#54483D', .7);
  }
  if (!cheer) {
    if (prop === 'book' || prop === 'cloth') {
      poly(c, [[28, 32], [37, 33], [36, 41], [27, 40]], prop === 'book' ? '#AD664F' : '#C58B87');
      stroke(c, [[30, 34], [35, 34]], '#F2E4C6', 1.5);
    } else if (prop === 'basket') {
      stroke(c, [[29, 35], [31, 30], [35, 30], [38, 36]], '#927052', 1.5);
      poly(c, [[28, 35], [39, 35], [37, 42], [30, 42]], '#B6956E');
      oval(c, 32, 35, 2.5, 2.5, '#859C78'); oval(c, 35.5, 35, 2, 2, '#E5C884');
    } else if (prop === 'bottle') {
      c.fillStyle = '#557E80'; c.fillRect(31, 33, 5, 8); c.fillStyle = '#927052'; c.fillRect(32, 31, 3, 3);
    } else {
      stroke(c, [[18, 28], [30, 40]], '#927052', 1.6); oval(c, 31, 39, 5, 5, '#B6956E', '#927052');
    }
  }
  c.restore();
}
function animal(c, name, p) {
  const f = p.frame ?? 0;
  if (name === 'sheep') {
    oval(c, 23, 31, 17, 4, 'rgba(53,70,50,.14)');
    for (const x of [13, 20, 29, 34]) stroke(c, [[x, 23], [x + (f % 2 ? 1 : -1), 30]], '#745D49', 3);
    oval(c, 22, 18, 15, 10, '#F2E4C6', '#C9C5AC');
    for (const [x, y] of [[11, 15], [17, 10], [25, 9], [32, 13], [15, 21], [25, 23]]) oval(c, x, y, 5.5, 5, '#F2E4C6', '#D9D3BC');
    oval(c, 36, 19, 6, 7, '#927052', '#745D49'); oval(c, 33, 12, 3, 2, '#927052'); oval(c, 40, 14, 3, 2, '#927052');
    oval(c, 39, 18, .9, 1, '#453D35'); oval(c, 39, 23, 1, 1, '#54483D');
  } else if (name === 'duck') {
    oval(c, 17, 27, 14, 3.5, 'rgba(242,228,198,.28)');
    oval(c, 16, 20, 10, 6, '#F2E4C6', '#CCBA98');
    poly(c, [[8, 20], [3, 16], [6, 24]], '#F2E4C6');
    oval(c, 24, 14, 5.5, 6, p.variant ? '#355B48' : '#F2E4C6', p.variant ? '#557E80' : '#CCBA98');
    oval(c, 16, 21, 5.5, 3.5, p.variant ? '#927052' : '#E9DABD');
    poly(c, [[28, 14], [34, 16], [28, 18]], '#D8AD59'); oval(c, 26, 13, .9, .9, '#453D35');
  } else if (name === 'koi') {
    c.globalAlpha = .75;
    poly(c, [[10, 12], [3, 7 + f % 2 * 2], [5, 16]], '#E5C884');
    oval(c, 18, 12, 10, 3.6, '#F2E4C6', '#CCBA98'); oval(c, 20, 12, 4, 3, '#C28265');
    poly(c, [[16, 13], [12, 18], [20, 14]], '#E5C884'); oval(c, 25, 11, .6, .6, '#54483D'); c.globalAlpha = 1;
  } else if (name === 'bird') {
    oval(c, 16, 15, 5, 3, '#789699', '#557E80'); oval(c, 21, 13, 3, 3, '#F2E4C6');
    poly(c, [[23, 13], [27, 14], [23, 15]], '#D8AD59');
    const wing = [3, 9, 18, 9][f % 4];
    poly(c, [[15, 14], [5, wing], [12, 17]], '#859C78'); poly(c, [[16, 14], [22, wing], [19, 17]], '#9AAA72');
    poly(c, [[12, 15], [6, 16], [10, 19]], '#557E80');
  } else if (name === 'butterfly') {
    const spread = [5, 3, 1.5, 3][f % 4], color = p.variant ? '#C58B87' : '#E5C884';
    oval(c, 10 - spread / 2, 9, spread, 4, color, '#C28265'); oval(c, 10 + spread / 2, 9, spread, 4, color);
    oval(c, 10 - spread / 2, 13, spread * .7, 2.7, color); oval(c, 10 + spread / 2, 13, spread * .7, 2.7, color);
    stroke(c, [[10, 7], [10, 14]], '#54483D', 1);
  } else if (name === 'firefly') oval(c, 6, 6, 1.7, 1.7, '#FFF2BD');
  else if (name === 'smoke') {
    oval(c, 15, 14, 8, 6, '#E9E4D3'); oval(c, 21, 11, 8, 7, '#E9E4D3'); oval(c, 11, 10, 6, 5, '#E9E4D3');
  }
}
const SIZES = { person: [48, 56, 24, 51], portrait: [64, 64, 32, 60], sheep: [48, 36, 24, 31], duck: [38, 32, 19, 26], koi: [34, 24, 17, 12], bird: [32, 28, 16, 18], butterfly: [20, 22, 10, 13], firefly: [12, 12, 6, 6], smoke: [36, 24, 18, 18] };
export const LIVING_SPRITE_NAMES = Object.freeze(Object.keys(SIZES));
export function livingSpec(name, params) {
  if (!SIZES[name]) return null;
  const [w, h, ax, ay] = SIZES[name];
  return { w, h, ax, ay, points: {}, draw(c, scale) {
    c.save(); c.scale(scale, scale);
    if (name === 'portrait') {
      oval(c, 32, 32, 30, 30, '#F2E4C6', '#D9D3BC');
      c.beginPath(); c.arc(32, 32, 29, 0, Math.PI * 2); c.clip();
      c.translate(-4, 2); c.scale(1.5, 1.5); person(c, { ...params, pose: 'sit' });
    } else if (name === 'person') person(c, params);
    else animal(c, name, params);
    c.restore();
  } };
}

