/**
 * bake-village-still.mjs — the assembled valley as one still picture.
 *
 * Rooms, cards, duels and the Laurel Road paint a framing of the village
 * behind themselves (src/pets/sprite.js backdropStyle, CROPS in
 * src/pets/paths.js). That picture is this one: the terrain, shadows,
 * bridges, the eight house bodies and the oaks exactly as src/home/scenery.js
 * composes them (composeStill), with no friends and no interface. Rerun after
 * moving a house, a bridge or a tree, then node tools/build-precache.mjs.
 *
 *   node tools/bake-village-still.mjs
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serveRepo, launchChrome, findChrome, REPO_ROOT } from './cdp-lite.mjs';

if (!findChrome()) { console.error('No Chrome found (set CHROME_PATH).'); process.exit(1); }
const OUT = join(REPO_ROOT, 'assets/art/village/village-still.webp');
const server = await serveRepo();
const browser = await launchChrome({ width: 400, height: 400 });
try {
  await browser.send('Page.navigate', { url: `${server.url}privacy.html` });
  await new Promise((r) => setTimeout(r, 800));
  const data = await browser.evaluate(`import('/src/home/scenery.js').then(async (m) => (await m.composeStill()).toDataURL('image/webp', 0.84))`);
  const buf = Buffer.from(data.split(',')[1], 'base64');
  writeFileSync(OUT, buf);
  console.log(`wrote ${OUT} (${(buf.length / 1024).toFixed(0)} KB)`);
} finally {
  browser.close(); server.close();
}
