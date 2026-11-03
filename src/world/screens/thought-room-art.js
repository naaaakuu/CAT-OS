/** Offline native SVG: a summary becomes a bloom in a tiny world. */
import { escapeHTML } from '../../core/utils/format.js';

export function bloomPose(index) {
  return { x: 224 + index % 9 * 34 + Math.sin(index * 2.4) * 8,
    y: 310 + Math.floor(index / 9) * 19 + Math.cos(index * 1.7) * 9 };
}
const leaf = (x, y, s = 1, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})" fill="#698764" stroke="#496b51" stroke-width="1.5"><path d="M0 0Q-8-64 19-115Q45-61 0 0Z"/><path d="M1-6Q-54-37-44-82Q-4-74 1-6Z"/><path d="M1-7Q43-22 53-64Q20-67 1-7Z"/><path d="M0 0L15-97M0-9L-35-67M0-11L42-53" fill="none" stroke="#a8bd89"/></g>`;
const mushroom = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-7 0L-5-31H5L9 0Q0 5-7 0" fill="#f6e8cb" stroke="#bda882" stroke-width="1.5"/><path d="M-29-29Q-25-63 0-63Q27-61 30-29Q0-18-29-29Z" fill="#c98670" stroke="#9c6757" stroke-width="1.5"/><g fill="#f6dbc0"><ellipse cx="-12" cy="-40" rx="5" ry="3"/><ellipse cx="4" cy="-52" rx="5" ry="4"/><ellipse cx="17" cy="-38" rx="4" ry="3"/></g></g>`;
const flower = (x, y, color, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0Q4-14 0-26M1-9Q-14-20-13-10Q-8-4 1-7M1-15Q13-27 14-17Q9-11 1-13" stroke="#688257" stroke-width="2" fill="#91aa70"/><g fill="${color}" stroke="#a87f66" stroke-width=".65"><ellipse cy="-33" rx="5" ry="7"/><ellipse cx="-7" cy="-27" rx="7" ry="5"/><ellipse cx="7" cy="-27" rx="7" ry="5"/><ellipse cx="-4" cy="-21" rx="5" ry="6"/><ellipse cx="5" cy="-21" rx="5" ry="6"/></g><circle cy="-27" r="4" fill="#f3d280"/></g>`;

function resident(z) {
  const eyes = '<g fill="#364f3c"><circle cx="-7" cy="-8" r="1.6"/><circle cx="6" cy="-8" r="1.6"/></g>';
  if (z.kind === 'pond') return '<ellipse rx="14" ry="9" fill="#789b60"/><circle cx="-7" cy="-8" r="5" fill="#8fab72"/><circle cx="6" cy="-8" r="5" fill="#8fab72"/>' + eyes;
  if (z.kind === 'meadow') return '<path d="M-17 6H17Q24 2 19-4L17-13M12-4L10-13" fill="none" stroke="#6d8155" stroke-width="4" stroke-linecap="round"/><circle cx="-5" cy="-3" r="12" fill="#d3b176" stroke="#9e8050" stroke-width="1.5"/><path d="M-5-10Q-15-8-11 0Q-4 8 0 0Q1-7-5-5Q-10-3-5 0" fill="none" stroke="#9e8050" stroke-width="1.5"/>';
  if (z.kind === 'mushroom') return '<ellipse rx="12" ry="9" fill="#c97863" stroke="#7b5e47"/><path d="M0-8V8" stroke="#7b5e47"/><g fill="#675846"><circle cx="-5" cy="-3" r="2"/><circle cx="5" cy="3" r="2"/></g><circle cy="-10" r="5" fill="#675846"/>';
  if (z.kind === 'cloud') return '<path d="M-22 0A24 24 0 0 1 22 0" fill="none" stroke="#cc9b88" stroke-width="4"/><path d="M-17 0A19 19 0 0 1 17 0" fill="none" stroke="#e4cd91" stroke-width="4"/><path d="M-12 0A14 14 0 0 1 12 0" fill="none" stroke="#a0b495" stroke-width="4"/><g fill="#fff8e8"><ellipse cx="-20" rx="10" ry="6"/><ellipse cx="20" rx="10" ry="6"/></g>';
  if (z.kind === 'star') return '<path d="M-26-17L0 0M-35-14L-2 5" stroke="#f0d49a" stroke-width="3"/><path d="M5-15L9-4L21 0L9 5L5 17L0 5L-12 0L0-4Z" fill="#f5db9a" stroke="#ae935d"/>';
  if (z.kind === 'orchard') return '<g fill="#f7efda" stroke="#b5b99d"><ellipse cx="-7" cy="-9" rx="8" ry="10" transform="rotate(-25)"/><ellipse cx="7" cy="-9" rx="8" ry="10" transform="rotate(25)"/></g><ellipse rx="13" ry="9" fill="#e5c06f" stroke="#8e7952"/><path d="M-5-8V8M2-9V9" stroke="#8e7952" stroke-width="3"/><circle cx="13" cy="-2" r="5" fill="#8e7952"/>';
  return `<g fill="${z.kind === 'orchard' ? '#edd69b' : z.flower}" stroke="#a08b71" stroke-width="1"><ellipse cx="-11" cy="-9" rx="11" ry="15" transform="rotate(-25)"/><ellipse cx="11" cy="-9" rx="11" ry="15" transform="rotate(25)"/><ellipse cx="-9" cy="9" rx="9" ry="10"/><ellipse cx="9" cy="9" rx="9" ry="10"/></g><path d="M0-10V13M0-10L-5-17M0-10L5-17" stroke="#756c52" stroke-width="3" stroke-linecap="round"/>`;
}

export function worldIcon(z) {
  return `<svg viewBox="0 0 72 68" aria-hidden="true"><path d="M13 49V27a23 23 0 0 1 46 0v22" fill="${z.sky}" stroke="#9aab91" stroke-width="1.5"/><ellipse cx="36" cy="49" rx="23" ry="9" fill="${z.color}"/>${z.kind === 'mushroom' ? mushroom(36, 47, .46) : ['moon', 'star'].includes(z.kind) ? '<path d="M36 16L39 23L47 26L39 29L36 37L33 29L25 26L33 23Z" fill="#f9ecc6" stroke="#9b947b"/>' : `<path d="M36 46V25M36 39Q16 38 22 25Q35 24 36 39M36 33Q53 34 51 19Q36 19 36 33" fill="${z.color}" stroke="#617b55" stroke-width="1.5"/>`}<path d="M10 53Q36 64 62 53V58Q36 68 10 58Z" fill="#a4825b" stroke="#836746"/><path d="M20 35V24Q20 15 28 12" stroke="white" stroke-width="3" fill="none" opacity=".6"/></svg>`;
}

export function thoughtRoomArt(model, before = model.solved, activeTier = model.zones[0]?.tier) {
  const z = model.zones.find((zone) => zone.tier === activeTier) || model.zones[0];
  if (!z) return '';
  const night = ['moon', 'star'].includes(z.kind);
  return `<svg class="thought-art" viewBox="0 0 720 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tw-wall" x2="0" y2="1"><stop stop-color="#e6dfcb"/><stop offset="1" stop-color="#c7ccb0"/></linearGradient>
      <linearGradient id="tw-sky" x2="0" y2="1"><stop stop-color="${night ? '#6c7d99' : '#bfd3c1'}"/><stop offset="1" stop-color="${z.sky}"/></linearGradient>
      <linearGradient id="tw-glass" x2=".8" y2="1"><stop stop-color="#fffdf0" stop-opacity=".42"/><stop offset=".45" stop-color="${z.sky}" stop-opacity=".05"/><stop offset="1" stop-color="#eef7e4" stop-opacity=".25"/></linearGradient>
      <linearGradient id="tw-wood" x2="0" y2="1"><stop stop-color="#c9a579"/><stop offset=".2" stop-color="#a47d54"/><stop offset=".8" stop-color="#b48b61"/><stop offset="1" stop-color="#806141"/></linearGradient>
      <radialGradient id="tw-glow"><stop stop-color="#fff2b2" stop-opacity=".8"/><stop offset="1" stop-color="#fff0aa" stop-opacity="0"/></radialGradient>
      <pattern id="tw-grain" width="135" height="56" patternUnits="userSpaceOnUse"><path d="M0 9Q70-4 135 12M13 37Q73 26 121 39M2 47Q36 42 59 48" stroke="#715438" stroke-width="1" opacity=".16" fill="none"/></pattern>
      <filter id="tw-texture"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".065"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
      <clipPath id="tw-dome"><path d="M190 334V201a170 142 0 0 1 340 0v133Q360 398 190 334Z"/></clipPath>
    </defs>
    <g>
      <rect width="720" height="540" fill="url(#tw-wall)"/>
      <path d="M75 368V165a285 225 0 0 1 570 0v203Z" fill="url(#tw-sky)" stroke="#8c9d80" stroke-width="9"/>
      <path d="M79 306Q170 220 288 277Q418 204 642 294V368H79Z" fill="#9db594"/><path d="M79 342Q246 265 396 326Q546 275 642 322V368H79Z" fill="#849f7b"/>
      <path d="M75 191H645M75 301H645M360-52V363M170 9L203 364M549 9L516 364" fill="none" stroke="#9ca88b" stroke-width="6"/><path d="M62 367H658" stroke="#758d70" stroke-width="14"/>
      <path d="M0 67Q360 152 720 67" fill="none" stroke="#687b58" stroke-width="2"/>
      ${[42, 135, 229, 326, 421, 516, 610, 698].map((x, i) => { const y = 68 + Math.sin(i / 7 * Math.PI) * 42; return `<g class="thought-bulb" style="--delay:${i * .6}s"><circle cx="${x}" cy="${y + 7}" r="29" fill="url(#tw-glow)"/><path d="M${x - 3} ${y - 3}h6v9h-6" fill="#7b7856"/><ellipse cx="${x}" cy="${y + 10}" rx="5" ry="7" fill="#fff1b0"/></g>`; }).join('')}
      ${leaf(31, 371, 1.8)}${leaf(699, 370, 1.9, -1)}${leaf(98, 369, .7, -1)}${leaf(627, 372, .8)}
      <g fill="#bc8e67" stroke="#8a6b4c" stroke-width="2"><path d="M4 362H70L61 416Q35 427 12 415Z"/><path d="M656 362H717L710 415Q685 425 663 415Z"/></g>
      <path d="M0 398Q360 363 720 398V540H0Z" fill="url(#tw-wood)"/><path d="M0 398Q360 363 720 398V540H0Z" fill="url(#tw-grain)"/><path d="M0 405Q360 370 720 405M0 474Q360 444 720 474" stroke="#e0bd8e" stroke-width="2" opacity=".6"/>
      <ellipse cx="360" cy="380" rx="208" ry="25" fill="#5c6347" opacity=".15"/>
      <path d="M178 336Q360 390 542 336V358Q360 418 178 358Z" fill="#8b6f49" stroke="#6e593d" stroke-width="2"/><ellipse cx="360" cy="335" rx="182" ry="54" fill="#b1b78a" stroke="#82916b" stroke-width="2"/>
      <g clip-path="url(#tw-dome)" data-art-zone="${z.tier}">
        <rect x="188" y="52" width="344" height="327" fill="${z.sky}" opacity=".72"/>
        ${night ? '<g fill="#fff4cd"><circle cx="262" cy="137" r="2"/><circle cx="438" cy="111" r="2"/><circle cx="477" cy="168" r="2.5"/><path d="M366 93A24 24 0 1 0 389 126A25 25 0 0 1 366 93"/></g>' : '<circle cx="433" cy="143" r="25" fill="#fff2b7"/><path d="M236 166Q234 152 249 151Q261 131 279 147Q298 145 298 166Z" fill="#fff9e8" opacity=".8"/>'}
        <path d="M182 297Q248 232 340 279Q452 214 540 282V361H182Z" fill="${z.color}" opacity=".7"/><ellipse cx="360" cy="332" rx="176" ry="48" fill="#9bab7b"/>
        <path d="M276 327Q302 292 351 306Q392 297 412 319Q422 347 368 352Q310 358 276 327Z" fill="${z.kind === 'pond' ? '#8cbdba' : '#a4c8bc'}" stroke="#7caa9d" stroke-width="1.5"/><path class="thought-ripple" d="M310 329Q342 338 377 330M327 318Q348 322 368 318" stroke="#e2ead0" fill="none" stroke-width="2"/>
        <path d="M288 350Q290 344 308 344Q325 350 311 355Q293 358 288 350M316 365Q321 357 337 360Q354 366 338 371Q321 373 316 365" fill="#d4d3b4" stroke="#a8ab88"/>
        ${leaf(228, 313, .62)}${leaf(492, 323, .68, -1)}
        ${z.kind === 'mushroom' ? mushroom(304, 290, .95) + mushroom(440, 307, .62) : z.kind === 'orchard' ? '<path d="M285 309V239M268 268L285 281L301 261" fill="none" stroke="#8f7550" stroke-width="9"/><g fill="#94a573" stroke="#72875c" stroke-width="1.5"><circle cx="285" cy="228" r="36"/><circle cx="259" cy="246" r="27"/><circle cx="312" cy="246" r="26"/></g><g fill="#dfb369"><circle cx="273" cy="228" r="7"/><circle cx="300" cy="245" r="7"/><circle cx="257" cy="251" r="6"/></g>' : z.kind === 'cloud' ? '<g fill="#fff9e9" stroke="#c9cfca"><path d="M272 232Q253 218 266 204Q273 192 289 198Q306 175 322 196Q344 193 347 216Q345 238 322 234Z"/><path d="M413 216Q402 202 415 193Q425 189 432 195Q446 180 458 198Q477 202 465 216Z"/></g>' : mushroom(290, 300, .44)}
        ${flower(459, 302, z.flower, .8)}${flower(250, 333, z.flower, .65)}
        ${z.clean >= .25 ? leaf(400, 285, .6) + mushroom(459, 334, .4) : ''}
        ${z.clean >= .5 ? `<path d="M237 255Q360 159 490 253" fill="none" stroke="#7a9467" stroke-width="4"/>${flower(292, 225, z.flower, .8)}${flower(409, 225, z.flower, .8)}${flower(350, 210, z.flower, 1.1)}` : ''}
        ${z.clean >= .75 ? '<g fill="#bdcf9d" stroke="#739367" stroke-width="1"><ellipse cx="328" cy="324" rx="13" ry="5"/><ellipse cx="376" cy="316" rx="9" ry="4"/></g>' + flower(328, 325, z.flower, .75) : ''}
        ${z.items.map((it, i) => { const p = bloomPose(i), grown = before.has(it.id); return `<g class="thought-bloom${grown ? ' is-grown' : ''}" data-bloom="${escapeHTML(it.id)}" style="--delay:${i * 70}ms" transform="translate(${p.x} ${p.y})">${grown ? flower(0, 0, z.flower, .9) : '<ellipse rx="3" ry="1.7" fill="#707e51"/><path d="M0 0V-6Q-8-12-7-6Q-4-3 0-5Q8-15 8-8Q5-4 0-5" fill="#91a874" stroke="#69815b" stroke-width="1"/>'}</g>`; }).join('')}
        <g class="thought-keepsake${z.complete ? ' is-earned' : ''}" transform="translate(422 337)">${resident(z)}</g>
      </g>
      <path d="M190 334V201a170 142 0 0 1 340 0v133Q360 398 190 334Z" fill="url(#tw-glass)" stroke="#93aaa1" stroke-width="2.5"/>
      <path d="M208 258V205Q210 111 283 85" fill="none" stroke="#fffdf0" stroke-width="9" opacity=".5" stroke-linecap="round"/><path d="M513 239V201Q510 146 477 117" fill="none" stroke="#fffdf0" stroke-width="3" opacity=".5" stroke-linecap="round"/>
      <ellipse cx="360" cy="60" rx="18" ry="8" fill="#a2b4a5" stroke="#7c9484" stroke-width="2"/><path d="M350 59Q346 37 360 36Q375 37 370 59" fill="#c6d1b9" stroke="#849e8d" stroke-width="2"/>
      <path d="M177 354Q360 409 543 354V369Q360 426 177 369Z" fill="url(#tw-wood)" stroke="#8d704d" stroke-width="2"/><path d="M190 368Q360 419 530 368" stroke="#d7b886" stroke-width="2" fill="none"/>
      <rect x="316" y="385" width="88" height="23" rx="5" fill="#cfb27e" stroke="#8b7550"/><path d="M336 397H384M360 391V403" stroke="#856d48" stroke-width="1.5"/>
      <ellipse cx="252" cy="474" rx="88" ry="24" fill="#7b7751" opacity=".14"/><ellipse cx="252" cy="460" rx="78" ry="25" fill="#a8b08a" stroke="#7a8b69" stroke-width="2"/><path d="M185 461Q252 486 318 462" fill="none" stroke="#d6d8b6" stroke-width="2" stroke-dasharray="3 5"/>
      <path d="M449 438L445 485M500 438L507 484" stroke="#8b6c49" stroke-width="8" stroke-linecap="round"/><ellipse cx="474" cy="433" rx="42" ry="14" fill="#d4b080" stroke="#9b7851" stroke-width="2"/>
      <g class="thought-cup"><ellipse cx="476" cy="431" rx="25" ry="6" fill="#ece0be" stroke="#a89772"/><path d="M488 411Q510 405 501 421Q498 424 488 421" fill="none" stroke="#758b70" stroke-width="4"/><path d="M458 411H491L487 429Q474 436 462 429Z" fill="#9cb08c" stroke="#718567" stroke-width="1.5"/><ellipse cx="474" cy="411" rx="16" ry="4" fill="#ba9463" stroke="#718567"/><path d="M469 401Q462 394 470 386M480 400Q475 391 481 382" stroke="#fff4d4" stroke-width="2" fill="none"/></g>
      ${leaf(93, 519, .7)}${mushroom(632, 477, .7)}${mushroom(660, 492, .43)}
      <g class="thought-rain" stroke="#e5f0e6" stroke-width="2" stroke-linecap="round">${Array.from({length:18}, (_, i) => `<path d="M${200 + i * 18} ${119 + i % 5 * 27}l-6 16"/>`).join('')}</g>
      <rect class="thought-night-wash" width="720" height="540" fill="#253f40"/>
      <g class="thought-fireflies">${Array.from({length:12}, (_, i) => `<g class="thought-firefly" style="--delay:${i * .34}s;--drift:${i % 2 ? -1 : 1}" transform="translate(${155 + i * 36} ${130 + i % 4 * 59})"><circle r="15" fill="url(#tw-glow)"/><circle r="2.4" fill="#fff1b3"/></g>`).join('')}</g>
      <rect width="720" height="540" fill="#d5c5a3" opacity=".07" filter="url(#tw-texture)" pointer-events="none"/>
    </g>
  </svg>`;
}
