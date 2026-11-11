/** Source art is immutable; placements and navigation live in world space. */
export const ART = Object.freeze({ w: 1536, h: 1024, src: './assets/art/home-world-v1.png' });
export const TERRAIN = './assets/art/village-terrain-v2.webp';
// Polygons trace source-art silhouettes. Scale and translation place each
// landmark without changing its artwork, lighting anchors or motion atlas.
export const BUILDINGS = Object.freeze({
  chai: {
    x: 115, y: 190, scale: .9,
    polygon: [
      [95, 239], [112, 140], [186, 77], [214, 75], [218, 43], [236, 40],
      [238, 72], [267, 47], [303, 0], [326, 38], [369, 78], [448, 130],
      [444, 220], [483, 241], [470, 273], [402, 291], [330, 300], [247, 285],
      [166, 267],
    ],
  },
  ginger: {
    x: 411, y: 140, scale: .85,
    polygon: [
      [565, 247], [581, 156], [623, 145], [648, 94], [690, 49], [840, 32],
      [842, 18], [876, 16], [875, 55], [924, 109], [982, 138], [1004, 232],
      [971, 271], [906, 284], [833, 274], [769, 282], [674, 267],
    ],
  },
  mallow: {
    x: 801, y: 224, scale: .82,
    polygon: [
      [1112, 255], [1157, 209], [1173, 107], [1204, 50], [1264, 27], [1330, 40],
      [1378, 25], [1414, 50], [1381, 86], [1398, 183], [1460, 158], [1500, 187],
      [1520, 247], [1481, 283], [1382, 293], [1276, 274], [1175, 292],
    ],
  },
  matcha: {
    x: -41, y: 363, scale: .85,
    polygon: [
      [64, 446], [83, 406], [113, 394], [123, 338], [162, 315], [186, 318],
      [207, 345], [323, 310], [382, 353], [405, 392], [444, 394], [474, 446],
      [433, 489], [348, 505], [250, 505], [164, 483], [98, 488],
    ],
  },
  mochi: {
    x: 628, y: 527, scale: .9,
    polygon: [
      [1069, 461], [1074, 368], [1165, 352], [1209, 307], [1315, 290], [1330, 277],
      [1349, 279], [1350, 304], [1400, 349], [1431, 379], [1495, 386], [1504, 473],
      [1414, 504], [1307, 511], [1195, 494], [1103, 492],
    ],
  },
  biscuit: {
    x: 379, y: 391, scale: .85,
    polygon: [
      [124, 726], [131, 653], [171, 616], [201, 589], [201, 562], [230, 561],
      [230, 586], [285, 575], [336, 547], [355, 583], [400, 604], [435, 622],
      [465, 634], [492, 657], [526, 717], [509, 751], [450, 775], [368, 770],
      [301, 786], [225, 776], [175, 756],
    ],
  },
  sesame: {
    x: 212, y: 134, scale: .85,
    polygon: [
      [1146, 801], [1155, 699], [1191, 688], [1247, 659], [1288, 603], [1308, 552],
      [1335, 488], [1365, 551], [1390, 586], [1382, 682], [1400, 729], [1403, 800],
      [1354, 827], [1272, 844], [1198, 825],
    ],
  },
  toffee: {
    x: 285, y: 406, scale: .9,
    polygon: [
      [681, 910], [708, 867], [713, 812], [728, 760], [738, 699], [788, 684],
      [875, 691], [906, 722], [900, 776], [930, 815], [959, 875], [940, 932],
      [850, 954], [773, 947],
    ],
  },
});
export function worldPoint(id, p) {
  const b = BUILDINGS[id];
  return b ? { ...p, x: p.x * b.scale + b.x, y: p.y * b.scale + b.y } : { ...p };
}

export function sourcePoint(id, p) {
  const b = BUILDINGS[id];
  return b ? { ...p, x: (p.x - b.x) / b.scale, y: (p.y - b.y) / b.scale } : { ...p };
}

export function worldBox(id, r) {
  const b = BUILDINGS[id];
  return { ...worldPoint(id, r), w: r.w * b.scale, h: r.h * b.scale };
}

// Reserved open ground is deliberately free of static props.
export const CLEARINGS = Object.freeze({
  square: [610, 520, 470, 280],
  meadow: [440, 630, 160, 210],
  events: [1110, 935, 210, 220],
});
