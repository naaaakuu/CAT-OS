/** Illustrated home. Navigation only: learning, rewards and persistence
 * continue to belong to the existing modules and village economy. */
import { loadWorld } from '../../world/state.js';
import { loadValley, valleyName } from '../../world/companion.js';
import { escapeHTML } from '../../core/utils/format.js';
import { openModal, closeModal } from '../../ui/modal.js';
import { musicEnabled, setMusicEnabled, startMusic, startAmbience, unlock, play } from '../../world/audio.js';

const places = [
  { id: 'varc', name: 'VARC', title: 'The Reading House', sub: 'Stories worth getting lost in', x: 21, y: 28, who: 1, guide: 'Ada, the story-keeper', line: 'Every passage opens a little door. Let’s find the idea hiding between the lines.', links: [['Read a passage', '#/world/place/reading-room'], ['Verbal reasoning', '#/world/place/loom']] },
  { id: 'dilr', name: 'DILR', title: 'The Puzzle Workshop', sub: 'A little order in the unexpected', x: 50, y: 27, who: 3, guide: 'Flint, the puzzle-keeper', line: 'I’m getting the workshop ready. DILR sets are not available in this version of CAT OS yet. In the meantime, the verbal reasoning workshop is open.', links: [['Explore verbal reasoning', '#/world/place/loom']], future: true },
  { id: 'quant', name: 'Quant', title: 'The Observatory', sub: 'A universe of possibilities', x: 82, y: 28, who: 5, guide: 'Nimbus, the sky-watcher', line: 'There’s a whole universe of numbers up here. Quant lessons are not available in this version yet. You can explore your current learning progress below.', links: [['See my progress', '#/growth']], future: true },
  { id: 'garden', name: 'Word Garden', title: 'The Word Garden', sub: 'Small seeds. Lasting knowledge.', x: 20, y: 49, who: 2, guide: 'Bo, the word-grower', line: 'A word remembered is a seed planted. Come tend a few with me.', links: [['Take a word round', '#/round/meadow'], ['Explore root families', '#/world/place/rootwood'], ['Borrowed words', '#/world/place/pond']] },
  { id: 'practice', name: 'Practice', title: 'The Practice Cabin', sub: 'A little better, every visit', x: 81, y: 49, who: 4, guide: 'Rowan, the trail-finder', line: 'Pick a trail and take your time. Every small discovery counts.', links: [['Para jumbles', '#/world/place/loom'], ['Para summaries', '#/world/place/table'], ['Odd one out', '#/world/place/bench'], ['Word bank', '#/bank']] },
  { id: 'life', name: 'Village life', title: 'The Hearth', sub: 'A place that grows with you', x: 23, y: 77, who: 0, guide: 'Wick, the lamp-keeper', line: 'Your village is still yours. Collect goods, fill your neighbours’ orders, build new places, and keep the lamps burning.', links: [['Visit my growing village', '#/world/village'], ['My standing & records', '#/world/place/hearth?you=1']] },
  { id: 'daily', name: 'Daily Challenge', title: 'The Trail Board', sub: 'A small adventure for today', x: 51, y: 80, who: 0, guide: 'Wick, the lamp-keeper', line: 'The best journey starts with one small step. Today’s invitation: a word round. Or take the timed Gauntlet beyond the village.', links: [['Start today’s word round', '#/round/meadow'], ['Take the timed Gauntlet', '#/world/place/wilds']] },
  { id: 'progress', name: 'Progress', title: 'The Milestone Tower', sub: 'Look how far you’ve come', x: 84, y: 81, who: 5, guide: 'Nimbus, the sky-watcher', line: 'Growth can be quiet. Your remembered words, stronger reading, stars and streaks all leave their mark here.', links: [['Explore my progress', '#/growth'], ['Stars, streaks & records', '#/world/place/hearth?you=1']] },
];
// The painted silhouettes do not occupy equal columns. Tight, individual
// frames keep a neighbouring leaf or ear out of portraits and directory rows.
const frames = [[0,350],[355,330],[700,338],[1040,335],[1380,397],[1780,392]];
const sprite = (who, cls = '') => `<span class="cw-sprite ${cls}" style="--sprite-width:${frames[who][1]/724};--sprite-offset:${frames[who][0]/724}" aria-hidden="true"></span>`;
const mark = (name) => {
  const paths = { sound: '<path d="M4 9v6h4l4 4V5L8 9H4zM16 8a6 6 0 0 1 0 8"/>', menu: '<path d="M5 6h14M5 12h14M5 18h14"/>', map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15"/>', star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z"/>', leaf: '<path d="M5 19C1 7 10 3 20 4c1 10-4 18-15 15zm0 0L16 8"/>', home: '<path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7"/>' };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`;
};

export async function renderHomeWorld(outlet, { storage }) {
  const [world, valley] = await Promise.all([loadWorld(storage), loadValley(storage)]);
  if (!outlet.isConnected) return;
  const state = world.state, v = state.village;
  const name = escapeHTML(valleyName(valley));
  outlet.innerHTML = `<section class="cw" aria-label="CAT OS woodland village">
    <h1 class="sr-only">Your CAT OS woodland village</h1>
    <header class="cw-header">
      <a class="cw-brand" href="#/world" aria-label="CAT OS home">${mark('leaf')}<span>CAT OS<small>A LITTLE WORLD OF POSSIBILITY</small></span></a>
      <div class="cw-village-name"><span>${name}</span><small>YOUR WOODLAND VILLAGE</small></div>
      <div class="cw-tools"><span class="cw-level" title="Your village level">${mark('star')}<b>${v.level.n}</b><small>LEVEL</small></span><button class="cw-icon" data-sound aria-label="Music and ambience" aria-pressed="${musicEnabled()}">${mark('sound')}</button><button class="cw-icon" data-menu aria-label="Open village menu">${mark('menu')}</button></div>
    </header>
    <div class="cw-viewport" tabindex="0" aria-label="Village map. Scroll or drag to explore; Tab to visit a destination.">
      <div class="cw-map">
        <img class="cw-art" src="./assets/art/home-world-v1.png" alt="An illustrated woodland village with glowing cottages, a library, greenhouse, observatory, winding paths and a stream." draggable="false" fetchpriority="high" />
        ${places.map(p => `<button class="cw-location" data-place="${p.id}" style="--x:${p.x}%;--y:${p.y}%" aria-label="Explore ${p.name}: ${p.title}"><span class="cw-location__area" aria-hidden="true"></span><span class="cw-sign">${p.name}<span aria-hidden="true">↗</span></span></button>`).join('')}
        <button class="cw-guide" data-place="daily" style="left:49%;top:48%" aria-label="Talk to Wick, your village guide">${sprite(0)}<span class="cw-guide__bubble">A little adventure?</span></button>
        <span class="cw-resident" style="left:27%;top:25%">${sprite(1)}</span>
        <span class="cw-resident" style="left:25%;top:45%">${sprite(2)}</span>
        <span class="cw-resident" style="left:74%;top:46%">${sprite(4)}</span>
        <span class="cw-resident" style="left:57%;top:25%">${sprite(3)}</span>
        <span class="cw-motes" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--i:${i};left:${18+(i*17)%70}%;top:${20+(i*13)%65}%"></i>`).join('')}</span>
      </div>
    </div>
    <div class="cw-welcome"><p>Make yourself at home.</p><span>Choose a place. Find your next little discovery.</span></div>
    <nav class="cw-dock" aria-label="Village shortcuts"><button data-directory>${mark('map')}<span>Explore</span></button><button data-place="daily">${mark('leaf')}<span>Today’s trail</span></button><button data-place="mocks">${mark('star')}<span>Mocks</span></button><a href="#/world/village">${mark('home')}<span>Village life</span></a></nav>
    <div class="cw-map-tools"><button data-zoom="-" aria-label="Zoom out">−</button><button data-reset aria-label="Recenter map">⌖</button><button data-zoom="+" aria-label="Zoom in">+</button></div>
    <p class="cw-explore-hint">Drag to wander · tap a place to enter</p>
    <div class="cw-overlay" hidden><div class="cw-scrim" data-close></div><section class="cw-panel"></section></div>
  </section>`;

  const root = outlet.querySelector('.cw'), viewport = root.querySelector('.cw-viewport'), map = root.querySelector('.cw-map');
  const overlay = root.querySelector('.cw-overlay'), panel = root.querySelector('.cw-panel');
  let zoom = 1, disposed = false, opened = false, drag = null, suppressClick = false;
  const fit = (center = false) => {
    const oldW = map.offsetWidth || 1, x = (viewport.scrollLeft + viewport.clientWidth / 2) / oldW, y = (viewport.scrollTop + viewport.clientHeight / 2) / (oldW / 1.5);
    const w = Math.max(viewport.clientWidth, viewport.clientHeight * 1.5, 900) * zoom;
    map.style.width = `${w}px`; map.style.height = `${w / 1.5}px`;
    viewport.scrollLeft = w * (center ? .5 : x) - viewport.clientWidth / 2;
    viewport.scrollTop = w / 1.5 * (center ? .5 : y) - viewport.clientHeight / 2;
  };
  const observer = new ResizeObserver(() => fit()); observer.observe(viewport); fit(true);
  const close = () => { if (!opened) return; closeModal(panel); opened = false; overlay.hidden = true; };
  const show = (html, trigger) => { const returnTo = panel.contains(trigger) ? root.querySelector('[data-directory]') : trigger; close(); panel.innerHTML = `<button class="cw-close" data-close aria-label="Close panel">×</button>${html}`; overlay.hidden = false; opened = true; openModal(panel, close, {returnTo}); play('open'); };
  const place = (id, trigger) => {
    const p = places.find(p => p.id === id);
    if (!p && id === 'mocks') { show(`${sprite(3,'cw-panel__sprite')}<p class="cw-eyebrow">THE EXAM TRAIL</p><h2>One step before the summit.</h2><p>Full CAT mock exams are not available in this version yet. The existing Gauntlet is a timed vocabulary challenge with its own records and rewards.</p><a class="cw-primary" href="#/world/place/wilds">Explore the Gauntlet <span>→</span></a>`,trigger); return; }
    if (!p) return;
    show(`${sprite(p.who,'cw-panel__sprite')}<p class="cw-eyebrow">${p.future ? 'A FUTURE CORNER OF THE VILLAGE' : escapeHTML(p.name)}</p><h2>${p.title}</h2><p class="cw-panel__sub">${p.sub}</p><p class="cw-dialogue">“${p.line}”</p><p class="cw-guide-name">${p.guide}</p>${id === 'progress' ? `<div class="cw-progress"><span><b>${state.stars}</b> stars earned</span><span><b>${state.hearth.streak.current}</b> day streak</span><span><b>${v.coins}</b> village coins</span></div>` : ''}<div class="cw-actions">${p.links.map(([label,url],i)=>`<a class="${i ? 'cw-secondary' : 'cw-primary'}" href="${url}">${label}<span>→</span></a>`).join('')}</div>`,trigger);
  };
  root.addEventListener('click', async e => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    const button = e.target.closest('button');
    if (e.target.closest('[data-close]')) { close(); return; }
    if (!button) return;
    if (button.hasAttribute('data-place')) place(button.dataset.place,button);
    if (button.hasAttribute('data-directory')) show(`<p class="cw-eyebrow">FOLLOW YOUR CURIOSITY</p><h2>Where shall we wander?</h2><div class="cw-directory">${places.map(p=>`<button data-place="${p.id}">${sprite(p.who)}<span><b>${p.name}</b><small>${p.title}${p.future ? ' · coming later' : ''}</small></span><span>→</span></button>`).join('')}<button data-place="mocks">${sprite(3)}<span><b>Mocks</b><small>The exam trail · coming later</small></span><span>→</span></button></div>`,button);
    if (button.hasAttribute('data-menu')) show(`<p class="cw-eyebrow">YOUR LITTLE WORLD</p><h2>${name}</h2><div class="cw-actions"><a class="cw-primary" href="#/world/village">Village life & goods <span>→</span></a><a class="cw-secondary" href="#/growth">Progress & learning <span>→</span></a><a class="cw-secondary" href="#/world/place/hearth?you=1">Standing & records <span>→</span></a><a class="cw-secondary" href="#/settings">Settings & data backup <span>→</span></a></div><p class="cw-menu-note">Your learning stays on this device. Available offline after the village finishes downloading.</p>`,button);
    if (button.hasAttribute('data-zoom')) { zoom = Math.min(1.8,Math.max(.8,zoom + (button.dataset.zoom === '+' ? .15 : -.15))); fit(); }
    if (button.hasAttribute('data-reset')) { zoom=1;fit(true); }
    if (button.hasAttribute('data-sound')) { const on=!musicEnabled(); button.setAttribute('aria-pressed',String(on)); if(on){unlock();startMusic('world',{hour:state.atmo.hour,warmth:.7});startAmbience('world',state.atmo);} try{await setMusicEnabled(storage,on);}catch{ if(!disposed) button.setAttribute('aria-pressed',String(musicEnabled())); } }
  });
  viewport.addEventListener('pointerdown',e=> { if(e.button !== 0) return; suppressClick=false;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false}; });
  viewport.addEventListener('pointermove',e=> { if(!drag || e.pointerId !== drag.id) return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6){drag.moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-dragging');viewport.scrollLeft=drag.left-dx;viewport.scrollTop=drag.top-dy;} });
  const endDrag=()=> { if(drag?.moved) suppressClick=true;drag=null;viewport.classList.remove('is-dragging'); };
  viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
  const onHash = () => {disposed=true;close();observer.disconnect();window.removeEventListener('hashchange',onHash);};
  window.addEventListener('hashchange',onHash);
  // Return rewards belong to the existing village's collect/build flow.
  const returned = sessionStorage.getItem('world:earned');
  if(returned) { root.querySelector('.cw-welcome').innerHTML='<p>A little stronger. A little brighter.</p><a href="#/world/village">Your rewards are waiting in the village →</a>'; }
}
