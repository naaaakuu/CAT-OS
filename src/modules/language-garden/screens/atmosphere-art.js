/**
 * atmosphere-art.js — the sky's presentation, shared by the Overlook
 * and the biome scene (LANGUAGE_GARDEN_BIBLE §4.5–§4.6, §12.6, Roadmap
 * 3.4). Markup only; WHAT the weather is comes from logic/atmosphere.js.
 *
 * Everything here is deliberately deterministic: particle positions and
 * timings come from fixed tables and index arithmetic, never
 * Math.random(), so the rain falls the same way it fell a minute ago —
 * the world does not reshuffle itself to look busy (Law 6).
 *
 * Weather never carries information. It is aria-hidden, it blocks no
 * taps, and nothing in it is tappable (§14.8). Reduced motion is not a
 * downgrade (§11.5): fog and cloud read fully still; falling rain and
 * snow are simply absent rather than frozen mid-air.
 */

/** The weather overlay for one scene. Clear skies return no markup at
 *  all — clear is the default state of the world, not an effect. */
export function weatherLayerHTML(weather) {
  if (weather === 'rain') {
    return `<div class="lg-weather lg-weather--rain" aria-hidden="true">${particles(14, 'lgw-drop')}</div>`;
  }
  if (weather === 'snow') {
    return `<div class="lg-weather lg-weather--snow" aria-hidden="true">${particles(12, 'lgw-flake')}</div>`;
  }
  if (weather === 'fog') {
    // Fog hides the horizon and makes the nearest thing the most
    // beautiful (§4.6): two soft still banks, deeper toward the top.
    return `<div class="lg-weather lg-weather--fog" aria-hidden="true">
      <span class="lgw-fog lgw-fog--far"></span>
      <span class="lgw-fog lgw-fog--near"></span>
    </div>`;
  }
  // Wind draws nothing of its own — it is what it does to the grass and
  // the marks (CSS keys off [data-weather="wind"]).
  return '';
}

/** Deterministic falling particles: position, delay, and duration all
 *  derive from the index, so every visit rains the same rain. */
function particles(count, cls) {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const left = (i * 47 + 11) % 100;                 // spread, never clumped
    const delay = ((i * 37) % 24) / 10;               // 0–2.3s
    const duration = 1.6 + ((i * 29) % 14) / 10;      // 1.6–2.9s
    out += `<span class="${cls}" style="left:${left}%; animation-delay:${delay}s; animation-duration:${duration}s"></span>`;
  }
  return out;
}

/** The night sky for the Overlook's SVG (§12.6: deep blue, moonlight —
 *  the most beautiful state in the entire product). Fixed constellation,
 *  the same stars every night; a learner can come to know them. */
export function nightSkySVG() {
  const STARS = [
    [22, 24], [51, 58], [83, 20], [118, 44], [141, 16], [172, 62],
    [201, 30], [228, 52], [252, 18], [281, 40], [307, 64], [334, 26],
    [64, 92], [186, 96], [296, 88], [126, 78],
  ];
  const stars = STARS.map(([x, y], i) =>
    `<circle class="vl-star${i % 3 === 0 ? ' vl-star--breathing' : ''}" cx="${x}" cy="${y}" r="${i % 4 === 0 ? 1.3 : 0.9}"/>`).join('');
  return `<g class="vl-night-sky" aria-hidden="true">
    ${stars}
    <circle class="vl-moon" cx="306" cy="46" r="13"/>
    <circle class="vl-moon-shadow" cx="311" cy="42" r="11"/>
  </g>`;
}
