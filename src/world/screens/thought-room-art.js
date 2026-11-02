/** A small illustrated set, in native SVG. Furniture stays; each registry
 * item is its own sheet of paper that travels from clutter to a neat stack.
 * Keep all coordinates in the same 1120 × 700 room used by the touch layer. */
import { escapeHTML } from '../../core/utils/format.js';

const sprig = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0Q-13-32 0-66M-2-23Q18-41 23-28M-3-40Q-24-58-26-42" fill="none" stroke="#658267" stroke-width="4"/><path d="M0-55Q-21-79-15-83Q7-80 0-55M0-33Q16-58 25-53Q30-35 0-33M-5-30Q-34-36-31-49Q-13-55-5-30" fill="#91a57c" stroke="#667f60" stroke-width="1.5"/><path d="M-24-3H22L17 31Q0 39-18 31Z" fill="#c88c73" stroke="#956650" stroke-width="2"/><path d="M-20 5H19M-15 13H15" stroke="#e5b49a" stroke-width="2"/></g>`;
const book = (x, y, w, h, c, tilt = 0) => `<g transform="translate(${x} ${y}) rotate(${tilt})"><rect width="${w}" height="${h}" rx="3" fill="${c}" stroke="#6f654e" stroke-width="1.8"/><path d="M4 4V${h - 4}M4 9H${w - 3}M4 ${h - 10}H${w - 3}" stroke="#e8d6af" stroke-width="1.6" opacity=".7"/></g>`;

export function paperPose(zone, index, solved) {
  // Stable arithmetic, no random layout changes on re-entry.
  const n = index + 1;
  if (solved) return `translate(${zone.x - 22 + (n % 3) * 1.3}px,${zone.y + 10 - (index % 18) * .85}px) rotate(-3deg) scale(.72)`;
  const ring = Math.floor(index / 9);
  const angle = n * 2.39996;
  const rx = 30 + ring * 11, ry = 18 + ring * 7;
  return `translate(${(zone.x - 19 + Math.cos(angle) * rx).toFixed(1)}px,${(zone.y - 18 + Math.sin(angle) * ry).toFixed(1)}px) rotate(${Math.round(Math.sin(n * 7.3) * 48)}deg) scale(${.85 + (index % 3) * .06})`;
}

export function thoughtRoomArt(model, before = model.solved) {
  return `<svg class="thought-art" viewBox="0 0 1120 700" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tr-wall" x2="0" y2="1"><stop stop-color="#f3ead4"/><stop offset="1" stop-color="#ded9b8"/></linearGradient>
      <linearGradient id="tr-wood" x2="0" y2="1"><stop stop-color="#c29469"/><stop offset="1" stop-color="#a27350"/></linearGradient>
      <linearGradient id="tr-floor" x2="0" y2="1"><stop stop-color="#c8a07b"/><stop offset="1" stop-color="#e0bb92"/></linearGradient>
      <linearGradient id="tr-sky" x2="0" y2="1"><stop stop-color="#b9d7cf"/><stop offset="1" stop-color="#f6e9bf"/></linearGradient>
      <radialGradient id="tr-lamp"><stop stop-color="#ffe6a0" stop-opacity=".65"/><stop offset="1" stop-color="#ffe6a0" stop-opacity="0"/></radialGradient>
      <pattern id="tr-wallpaper" width="52" height="58" patternUnits="userSpaceOnUse"><path d="M26 18Q16 27 26 37Q36 27 26 18M26 23V33" fill="none" stroke="#a4aa88" stroke-width="1" opacity=".25"/><circle cx="0" cy="0" r="2" fill="#c3b99b" opacity=".4"/></pattern>
      <pattern id="tr-grain" width="140" height="82" patternUnits="userSpaceOnUse"><path d="M0 12Q50 2 140 14M15 55Q83 40 130 52M4 60Q50 53 68 60" fill="none" stroke="#8a603e" stroke-width="1" opacity=".15"/></pattern>
      <filter id="tr-soft"><feGaussianBlur stdDeviation="7"/></filter>
      <g id="tr-paper"><path d="M0 1Q20-2 37 0L39 45Q19 43 0 46Z" fill="#fff8e5" stroke="#b8a184" stroke-width="1.1"/><path d="M8 10H29M8 16H32M8 22H25M8 29H31M8 35H20" fill="none" stroke="#b4b7a7" stroke-width="1.3" stroke-linecap="round"/><path d="M6 3V41" stroke="#d5a39a" stroke-width=".8" opacity=".6"/></g>
      <g id="tr-crumple"><path d="M0 8L8 0L22 4L28 17L19 27L5 24Z" fill="#eee4cf" stroke="#bcac92" stroke-width="1.1"/><path d="M8 0L12 12L0 8M12 12L22 4M12 12L19 27M12 12L28 17M12 12L5 24" fill="none" stroke="#cec1a9"/></g>
    </defs>
    <rect width="1120" height="700" fill="url(#tr-wall)"/>
    <rect width="1120" height="439" fill="url(#tr-wallpaper)"/>
    <path d="M0 0H1120V28Q560 18 0 28Z" fill="#927554"/>
    <path d="M0 31H1120M18 0V445M1102 0V445" stroke="#c2a17a" stroke-width="8"/>
    <path d="M0 434H1120V700H0Z" fill="url(#tr-floor)"/>
    <path d="M0 434H1120V700H0Z" fill="url(#tr-grain)"/>
    <path d="M0 435H1120M0 449H1120" stroke="#94734e" stroke-width="5"/>
    <g stroke="#a27c57" stroke-width="1.5" opacity=".5"><path d="M0 494H1120M0 562H1120M0 641H1120M190 449L70 700M405 449L355 700M630 449L658 700M855 449L990 700M140 494V562M519 562V641M949 494V562"/></g>
    <!-- A round-topped garden window and soft, open curtains. -->
    <path d="M397 271V141a132 112 0 0 1 264 0V271Z" fill="#9e815c" stroke="#887351" stroke-width="3"/>
    <path d="M411 257V143a118 99 0 0 1 236 0V257Z" fill="url(#tr-sky)"/>
    <circle cx="583" cy="103" r="27" fill="#fff3bf"/>
    <path d="M412 218Q459 167 508 210Q563 159 646 203V257H412Z" fill="#a1b395"/>
    <path d="M412 244Q478 207 529 233Q582 199 646 230V257H412Z" fill="#7e9c7e"/>
    <path d="M528 46V262M408 157H650" stroke="#b49b71" stroke-width="10"/>
    <path d="M397 269H662" stroke="#8f704d" stroke-width="13" stroke-linecap="round"/>
    <g class="thought-curtains" fill="#f4d9b9" stroke="#c8a583" stroke-width="2"><path d="M383 52Q416 40 445 49Q431 122 402 171L421 285L369 282Q385 174 383 52Z"/><path d="M671 52Q641 40 613 49Q626 122 655 171L638 285L690 282Q672 174 671 52Z"/><path d="M386 61L391 160M435 57L402 163M672 61L667 160M624 57L655 163" fill="none"/><path d="M375 171L405 177M654 177L681 171" stroke="#ab8d5d" stroke-width="5"/></g>
    <path class="thought-sunbeam" d="M418 165L647 167L1010 641L495 625Z" fill="#fff3bd" opacity=".15"/>
    <!-- Favourite things on a hand-built bookcase. -->
    <rect x="58" y="142" width="214" height="303" rx="9" fill="#96714f" stroke="#795b40" stroke-width="3"/>
    <rect x="70" y="155" width="190" height="274" rx="4" fill="#ad8a62"/>
    <path d="M72 238H257M72 331H257M72 425H257" stroke="#d0ad7f" stroke-width="12"/>
    <path d="M80 446V460M247 446V460" stroke="#795b40" stroke-width="12"/>
    ${book(83, 177, 23, 54, '#8b9b80', -4)}${book(110, 170, 19, 61, '#bc8880')}${book(133, 186, 27, 45, '#caac71')}${book(165, 173, 19, 58, '#9193a6', 8)}
    <g transform="translate(219 210)"><ellipse rx="22" ry="8" fill="#7f8062"/><path d="M-17-4L-12-24L12-24L17-4Q0 6-17-4" fill="#acaf87" stroke="#72785a" stroke-width="2"/><path d="M-12-22Q0-29 12-22" fill="none" stroke="#72785a"/></g>
    ${book(87, 357, 25, 61, '#b29b73')}${book(118, 364, 18, 54, '#839d92')}${book(143, 368, 24, 50, '#b68279', -8)}
    <path d="M194 405V379Q220 360 243 379V405Z" fill="#d6b884" stroke="#9f8057" stroke-width="2"/><path d="M203 380L210 402M214 376L221 405M226 376L233 402" stroke="#b1986e" stroke-width="2"/>
    ${sprig(168, 134, .66)}
    <!-- A tiny picture, pinboard, hanging lamp and windowsill. -->
    <path d="M303 119L326 93L348 119" fill="none" stroke="#aa9271" stroke-width="2"/><rect x="296" y="116" width="62" height="77" rx="4" fill="#aa825b"/><rect x="302" y="122" width="50" height="65" fill="#f5e6c9"/><path d="M312 171Q320 150 337 149Q346 168 333 175Q319 180 312 171" fill="#a1ab87"/><circle cx="327" cy="158" r="2" fill="#655b47"/><path d="M338 133L340 138L345 140L340 142L338 147L336 142L331 140L336 138Z" fill="#c7a65c"/>
    <rect x="733" y="97" width="111" height="121" rx="7" fill="#a7805b" stroke="#8e6d4b" stroke-width="3"/><rect x="741" y="105" width="95" height="105" fill="#c6ad83"/>
    <g fill="#f8eed6" stroke="#b29b79"><path d="M750 119L783 115L788 152L755 156Z"/><path d="M790 160L825 164L821 200L786 197Z"/><path d="M747 169L775 164L780 197L751 202Z" fill="#dfbdb0"/></g><g fill="#a87664"><circle cx="767" cy="119" r="3"/><circle cx="807" cy="165" r="3"/></g><path d="M756 129L778 126M758 136L777 133M796 176L817 179M796 184L812 186" stroke="#b9ae92" stroke-width="2"/>
    <path d="M914 30V87" stroke="#8d7455" stroke-width="4"/><ellipse cx="914" cy="126" rx="102" ry="95" fill="url(#tr-lamp)"/><path d="M887 91Q914 78 941 91L954 127Q914 145 874 127Z" fill="#d4af70" stroke="#a48151" stroke-width="2"/><path d="M888 124Q914 133 941 124" fill="none" stroke="#f3d593" stroke-width="3"/>
    <rect x="887" y="260" width="138" height="15" rx="4" fill="url(#tr-wood)" stroke="#a07952" stroke-width="2"/><path d="M901 276L914 293M1012 276L1000 293" stroke="#a07952" stroke-width="6"/>
    ${sprig(1000, 231, .55)}
    <!-- Desk, turned legs, drawers, an open notebook and a pencil pot. -->
    <ellipse cx="478" cy="463" rx="194" ry="18" fill="#77543c" opacity=".14" filter="url(#tr-soft)"/>
    <path d="M304 353L320 340H625L651 353V371H304Z" fill="#cca274" stroke="#916d49" stroke-width="3"/>
    <path d="M315 373H637V405H315Z" fill="url(#tr-wood)" stroke="#916d49" stroke-width="2"/>
    <rect x="435" y="377" width="88" height="23" rx="3" fill="#c49a6d" stroke="#99744f"/><circle cx="479" cy="389" r="3" fill="#786440"/>
    <path d="M326 401L321 479M621 401L629 479" stroke="#95704d" stroke-width="15" stroke-linecap="round"/><path d="M326 412L323 457M622 412L626 457" stroke="#c9a075" stroke-width="5"/>
    <path d="M458 331Q480 320 504 333L512 356Q486 347 463 355L439 348Z" fill="#fff5da" stroke="#b39973" stroke-width="1.7"/><path d="M479 330L485 350M449 341L471 336M491 336L500 339" stroke="#b7b89c" stroke-width="1.3"/>
    <path d="M589 316H615L611 344H593Z" fill="#96a082" stroke="#718164" stroke-width="2"/><path d="M597 319L592 288M604 318L611 286M607 320L621 297" stroke="#b88459" stroke-width="4"/>
    <path d="M662 380H736V393H662Z" fill="#b99166" stroke="#93704e" stroke-width="2"/><path d="M670 393L666 466M728 393L735 466" stroke="#99764f" stroke-width="8"/>
    <!-- Plush reading chair, patched cushion, and a knitted throw. -->
    <ellipse cx="896" cy="502" rx="114" ry="17" fill="#77543c" opacity=".16" filter="url(#tr-soft)"/>
    <path d="M807 405V338Q807 308 840 305H938Q974 305 977 339V410Z" fill="#b98d7c" stroke="#997263" stroke-width="3"/>
    <path d="M828 344Q828 326 847 326H930Q950 326 952 347V404H828Z" fill="#d2aa92" stroke="#bc9481" stroke-width="2"/>
    <path d="M794 394Q800 373 819 385L834 427H951L964 386Q984 372 995 393L984 469Q887 489 802 469Z" fill="#c59c88" stroke="#997263" stroke-width="3"/>
    <path d="M826 433Q885 420 953 434L948 459Q881 470 831 459Z" fill="#deb39a" stroke="#b48974" stroke-width="2"/>
    <path d="M818 475L814 500M972 475L978 500" stroke="#896b4c" stroke-width="10" stroke-linecap="round"/>
    <path d="M853 350Q880 345 899 354L894 405Q870 399 847 406Z" fill="#e6d4ae" stroke="#b6a27f" stroke-width="2"/><path d="M862 360L884 390M884 360L859 391" stroke="#b7bb92" stroke-width="2"/><circle cx="872" cy="377" r="4" fill="#aeb38b"/>
    <path d="M952 348L971 351L979 434L938 443L943 416Z" fill="#8f9f87" stroke="#75886f" stroke-width="2"/><path d="M950 357L969 360M948 368L971 372M947 380L972 384M946 393L974 397M943 409L977 413M941 423L978 428" stroke="#c1c5a3" stroke-width="2"/><path d="M940 443L940 451M948 442L949 452M958 441L959 450M968 438L970 446" stroke="#75886f" stroke-width="2"/>
    <!-- A scalloped rug and the welcome basket. -->
    <ellipse cx="565" cy="575" rx="297" ry="94" fill="#b88075" opacity=".3"/>
    <ellipse cx="565" cy="568" rx="289" ry="88" fill="#d2a395" stroke="#b78277" stroke-width="3"/>
    <ellipse cx="565" cy="568" rx="267" ry="73" fill="none" stroke="#e4bfb0" stroke-width="3" stroke-dasharray="5 6"/>
    <ellipse cx="565" cy="568" rx="235" ry="56" fill="none" stroke="#b8877a" stroke-width="2" opacity=".6"/>
    <path d="M278 551L255 549M282 568L258 568M286 586L263 589M850 551L873 549M848 568L872 568M842 586L866 589" stroke="#c79b86" stroke-width="4" stroke-linecap="round"/>
    <path d="M122 531L135 586Q176 605 220 583L232 531Z" fill="#b28d5d" stroke="#957349" stroke-width="2"/><ellipse cx="177" cy="532" rx="56" ry="18" fill="#957951" stroke="#d1b17e" stroke-width="5"/><path d="M133 550Q177 567 224 549M137 564Q179 580 221 562M151 547L157 588M174 551V593M198 547L192 589" fill="none" stroke="#d1b17e" stroke-width="2"/>
    ${sprig(1038, 447, 1.05)}
    <!-- Every thought has an identity. Future art changes need not touch records. -->
    ${model.zones.map((z) => `<g class="thought-zone-art" data-art-zone="${z.tier}">
      <g class="thought-bundle" style="opacity:${z.done ? 1 : .18}" transform="translate(${z.x - 30} ${z.y + 4})"><rect width="58" height="29" rx="4" fill="${z.color}" stroke="#887656" stroke-width="1.5"/><rect x="20" y="8" width="23" height="12" rx="2" fill="#f7eed6"/><path d="M24 14H39" stroke="#a3a182"/></g>
      ${z.items.map((it, i) => `<g class="thought-paper${before.has(it.id) ? ' is-filed' : ''}" data-paper="${escapeHTML(it.id)}" style="transform:${paperPose(z, i, before.has(it.id))};opacity:${before.has(it.id) ? .7 : 1}"><use href="#tr-paper"/>${i % 4 === 0 ? '<path d="M9 9H28" stroke="#bd9582" stroke-width="2.5"/>' : ''}</g>`).join('')}
      <g class="thought-scraps" style="opacity:${(1 - z.clean).toFixed(2)}"><use href="#tr-crumple" transform="translate(${z.x + 56} ${z.y + 24}) scale(.7)"/><use href="#tr-crumple" transform="translate(${z.x - 58} ${z.y + 22}) scale(.5) rotate(23)"/></g>
      <g class="thought-keepsake${z.complete ? ' is-earned' : ''}" transform="translate(${z.x + 28} ${z.y - 17})"><path d="M0-16L4-5L16 0L4 5L0 16L-4 5L-16 0L-4-5Z" fill="#fff0b5" stroke="#b18e49" stroke-width="1.5"/><circle r="4" fill="#d6b567"/></g>
    </g>`).join('')}
    <g fill="#7d654a" opacity=".45"><ellipse cx="540" cy="560" rx="65" ry="12"/></g>
  </svg>`;
}
