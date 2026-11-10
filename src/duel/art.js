/**
 * art.js — the game's small drawn things: the laurel, the envelope, the seal.
 * Hand-set SVG, so they stay sharp at any size and cost a few hundred bytes.
 */

const INK = '#3b2a1c';

export function laurelSVG(size = 22) {
  const leaves = [[6.3, 18.6, -28], [4.2, 14.8, -14], [3.5, 10.7, 2], [4.4, 6.8, 18], [6.6, 3.8, 38]];
  const leaf = ([x, y, r]) => `<path d="M0 3.6C-2.6 1.4 -2.6 -1.8 0 -4.2C2.6 -1.8 2.6 1.4 0 3.6Z" transform="translate(${x} ${y}) rotate(${r})" fill="#7FA65A" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  const side = leaves.map(leaf).join('');
  const other = leaves.map(([x, y, r]) => leaf([24 - x, y, -r])).join('');
  return `<svg class="laurel" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22.4C7 22 3.4 17 3.8 11.4" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/><path d="M12 22.4C17 22 20.6 17 20.2 11.4" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>${side}${other}</svg>`;
}

const SEALS = { wax: ['#C2513A', '#E5806A'], silver: ['#8C9BB0', '#D6DEEA'], gold: ['#D9A93B', '#FBE08A'] };
const PAPER = { wax: ['#F6EAD0', '#E4CFA4'], silver: ['#EFF2F7', '#C9D3E2'], gold: ['#FFF0BF', '#E9BF62'] };

export function envelopeSVG(grade = 'wax', { open = false, width = 76 } = {}) {
  const [seal, shine] = SEALS[grade] ?? SEALS.wax;
  const [a, b] = PAPER[grade] ?? PAPER.wax;
  const id = `env-${grade}-${open ? 'o' : 'c'}`;
  return `<svg class="envelope" width="${width}" height="${Math.round(width * 0.72)}" viewBox="0 0 100 72" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect x="3" y="4" width="94" height="64" rx="7" fill="url(#${id})" stroke="${INK}" stroke-width="3"/>
    <path d="M3 62 L50 34 L97 62" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" opacity=".55"/>
    ${open ? `<path class="envelope__flap" d="M3 8 L50 -24 L97 8Z" fill="${b}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` : `<path class="envelope__flap" d="M4 7 L50 42 L96 7" fill="${a}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`}
    ${open ? '' : `<g class="envelope__seal"><circle cx="50" cy="43" r="11" fill="${seal}" stroke="${INK}" stroke-width="2.6"/><circle cx="46.6" cy="39.6" r="3.2" fill="${shine}" opacity=".85"/><path d="M45 46c2 1.6 8 1.6 10 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/></g>`}
  </svg>`;
}
