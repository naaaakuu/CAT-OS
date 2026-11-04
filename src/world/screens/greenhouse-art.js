/** Botanical silhouettes are live SVG, so growth always reflects the ledger. */
function potArt(plant = '') {
  return `<svg viewBox="0 0 200 175" class="gh-plant" aria-hidden="true"><ellipse cx="100" cy="156" rx="65" ry="9" fill="#5e6740" opacity=".12"/>${plant}<path d="M57 142H143L135 160Q100 168 65 160Z" fill="#a9704d"/><path d="M54 138Q100 130 146 138L143 145Q100 151 57 145Z" fill="#c99c6c"/><ellipse cx="100" cy="138" rx="43" ry="5" fill="#594b34"/><path d="M68 151Q101 157 132 151" stroke="#dda975" fill="none" opacity=".55"/></svg>`;
}
export const emptyPotArt = () => potArt();

export function plantArt(band, growth = 0, yellow = 0, salt = 0) {
  const pct = Math.max(0, Math.min(1, growth));
  const scale = .1 + .9 * pct;
  const count = 4 + Math.floor(pct * 24);
  const leaf = (x, y, angle, size, i) => `<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M0 0Q${-size} ${-size * 1.3} 0 ${-size * 2}Q${size} ${-size * 1.3} 0 0Z" fill="${i < yellow ? '#dfb642' : ['#315f37','#5e823f','#88a658','#406b3c'][(i + salt) % 4]}"/><path d="M0 0V${-size * 1.7}" stroke="#d7df9a" stroke-opacity=".48" stroke-width=".8"/></g>`;
  let art = '';
  if (band === 'high') {
    art = '<path d="M100 140Q97 104 103 48M100 112L68 78M101 103L129 68M101 82L84 55" stroke="#8a6640" stroke-width="7" stroke-linecap="round" fill="none"/>';
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399 + salt, r = 16 + (i % 5) * 6;
      art += leaf(100 + Math.cos(angle) * r, 72 + Math.sin(angle) * r * .8, Math.cos(angle) * 90, 13 + i % 4, i);
    }
    if (pct > .6) art += '<g fill="#e8b64f"><circle cx="74" cy="78" r="6"/><circle cx="119" cy="90" r="5"/><circle cx="107" cy="46" r="5"/></g>';
  } else if (band === 'medium') {
    art = '<path d="M72 141L80 27M128 141L120 27M78 43H122M75 76H125M73 109H127" stroke="#baa37b" stroke-width="2.5" fill="none"/><path d="M100 143Q70 120 102 102T97 61T109 25" stroke="#5d753e" stroke-width="3" fill="none"/>';
    for (let i = 0; i < count; i++) { const y = 131 - i * 4; art += leaf(100 + Math.sin(i * .7) * 17, y, i % 2 ? 65 : -65, 9 + i % 3, i); }
    if (pct > .4) for (const [x,y] of [[83,70],[114,43],[104,104]]) art += `<g transform="translate(${x} ${y})" fill="#fff7d9">${[0,72,144,216,288].map((a) => `<ellipse rx="3" ry="7" transform="rotate(${a}) translate(0 -4)"/>`).join('')}<circle r="2.5" fill="#e0b150"/></g>`;
  } else {
    for (let i = 0; i < 7; i++) {
      const endX = 28 + i * 24, endY = 85 - Math.sin(i / 6 * Math.PI) * 57;
      art += `<path d="M100 143Q${endX} 105 ${endX} ${endY}" stroke="#52724b" stroke-width="2" fill="none"/>`;
      for (let j = 0; j < 5; j++) { const t = (j + 1) / 6; const x = 100 + (endX - 100) * t, y = 143 + (endY - 143) * t; art += leaf(x,y, -55 + i * 18, 9 - j * .8, i * 5 + j); }
    }
    if (pct > .7) art += '<path d="M102 143Q125 90 110 50" stroke="#697b46" fill="none" stroke-width="2"/><g fill="#b392b3"><circle cx="110" cy="50" r="5"/><circle cx="117" cy="65" r="4"/><circle cx="115" cy="80" r="3.5"/></g>';
  }
  return potArt(`<g transform="translate(100 138) scale(${scale}) translate(-100 -145)">${art}</g>`);
}
