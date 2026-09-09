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
 *
 * 0.16.0 — the raised sky (THE WORLD 1.2.0): the Overlook's frame now
 * extends 130 units above the authored 360×560 field, so the moon, the
 * constellation, and the clouds live up there, in the room the sky was
 * given. Their pins are re-expressed against the raised frame.
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
 *  the most beautiful state in the entire product). A fixed
 *  constellation, the same stars every night, so a learner can come to
 *  know them; a few breathe, never in step. The moon keeps Appendix
 *  C.1's horizontal pin (74% of frame width, 4.5% wide) and sits high in
 *  the raised sky, with a soft halo (§5.1, §5.4). */
export function nightSkySVG() {
  const STARS = [
    [22, -82], [51, -48], [83, -90], [118, -62], [141, -96], [172, -44],
    [201, -76], [228, -54], [252, -92], [281, -66], [307, -40], [334, -80],
    [64, -14], [186, -10], [296, -18], [126, -28], [40, 8], [160, 24],
    [214, 10], [262, 28], [340, 2], [96, 36], [300, 46], [12, 52],
    [190, 52], [244, 62], [70, 66], [130, 16],
  ];
  const stars = STARS.map(([x, y], i) =>
    `<circle class="vl-star${i % 3 === 0 ? ' vl-star--breathing' : ''}" style="animation-delay:${(i * 0.7) % 5}s" cx="${x}" cy="${y}" r="${i % 4 === 0 ? 1.4 : i % 3 === 0 ? 1.1 : 0.8}"/>`).join('');
  const mx = 0.74 * 360, my = -52, mr = (0.045 * 360) / 2;
  return `<g class="vl-night-sky" aria-hidden="true">
    ${stars}
    <circle class="vl-moon-halo vl-moon-halo--wide" cx="${mx}" cy="${my}" r="${(mr * 4.2).toFixed(1)}"/>
    <circle class="vl-moon-halo" cx="${mx}" cy="${my}" r="${(mr * 2.4).toFixed(1)}"/>
    <circle class="vl-moon" cx="${mx}" cy="${my}" r="${mr.toFixed(1)}"/>
    <circle class="vl-moon-shadow" cx="${(mx + mr * 0.42).toFixed(1)}" cy="${(my - mr * 0.3).toFixed(1)}" r="${(mr * 0.84).toFixed(1)}"/>
  </g>`;
}

/** The sun disc (§5.1): drawn only at dawn and dusk — a soft disc at the
 *  ridge inside its own warm pool; at every other hour the sun exists
 *  only as light, never a shape. Positions are THE WORLD Appendix C.1's
 *  pins. */
export function sunDiscSVG(time) {
  if (time === 'dawn') {
    const x = 0.82 * 360, y = 0.26 * 560, r = (0.07 * 360) / 2;
    return `<circle class="vl-sun-pool" cx="${x}" cy="${y}" r="${(r * 3.2).toFixed(1)}"/>
      <circle class="vl-sun" cx="${x}" cy="${y}" r="${r.toFixed(1)}"/>`;
  }
  if (time === 'dusk') {
    const x = 0.14 * 360, y = 0.25 * 560, r = (0.08 * 360) / 2;
    return `<circle class="vl-sun-pool" cx="${x}" cy="${y}" r="${(r * 3.2).toFixed(1)}"/>
      <circle class="vl-sun" cx="${x}" cy="${y}" r="${r.toFixed(1)}"/>`;
  }
  return '';
}

/** Three clouds in the raised sky (Appendix C.1 pinned two; the third,
 *  farthest and smallest, was added with the room the sky gained in
 *  0.16.0): soft flat cumulus masses — three overlapping lobes and a
 *  shaded underside — drifting left to right on unsynchronised 90–150s
 *  loops. Reduced motion holds them still (Guide 15.4). At night they
 *  are darker than the sky, moon-rimmed; at dusk they carry the sun's
 *  colour (CSS re-tones them per hour). */
export function cloudsSVG() {
  const CLOUDS = [
    { x: 72, y: -78, w: 86, dur: 132, delay: 0 },
    { x: 236, y: -30, w: 58, dur: 101, delay: -37 },
    { x: 150, y: 8, w: 40, dur: 148, delay: -80 },
  ];
  return `<g class="vl-clouds" aria-hidden="true">
    ${CLOUDS.map(({ x, y, w, dur, delay }, i) => `
      <g class="vl-cloud" style="animation-duration:${dur}s; animation-delay:${delay}s" data-cloud="${i}">
        <ellipse class="vl-cloud-under" cx="${x}" cy="${(y + w * 0.1).toFixed(1)}" rx="${(w * 0.46).toFixed(1)}" ry="${(w * 0.13).toFixed(1)}"/>
        <ellipse class="vl-cloud-body" cx="${(x - w * 0.22).toFixed(1)}" cy="${(y + w * 0.02).toFixed(1)}" rx="${(w * 0.24).toFixed(1)}" ry="${(w * 0.15).toFixed(1)}"/>
        <ellipse class="vl-cloud-body" cx="${(x + w * 0.06).toFixed(1)}" cy="${(y - w * 0.07).toFixed(1)}" rx="${(w * 0.3).toFixed(1)}" ry="${(w * 0.2).toFixed(1)}"/>
        <ellipse class="vl-cloud-body" cx="${(x + w * 0.3).toFixed(1)}" cy="${(y + w * 0.02).toFixed(1)}" rx="${(w * 0.2).toFixed(1)}" ry="${(w * 0.13).toFixed(1)}"/>
      </g>`).join('')}
  </g>`;
}
