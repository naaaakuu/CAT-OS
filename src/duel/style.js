/** Loads the game's own stylesheet once, when a screen first needs it. */
const STYLE = './src/ui/styles/duel.css';
let ready = null;

export function ensureDuelStyle() {
  if (ready) return ready;
  ready = new Promise((resolve) => {
    if (document.querySelector('link[data-duel-style]')) { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = STYLE; link.dataset.duelStyle = '';
    link.onload = () => resolve(); link.onerror = () => resolve();
    document.head.appendChild(link);
    setTimeout(resolve, 4000);
  });
  return ready;
}
