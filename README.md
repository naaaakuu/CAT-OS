# CAT OS

**A painted village where every CAT English question you answer helps one of six small friends.**

An offline-first, no-build Progressive Web App for the VARC section of India's Common Admission Test. Plain HTML, CSS and ES modules; progress lives in IndexedDB on the device.

- **Run:** serve this folder with any static server (`npx serve .`) and open it. Hosted: GitHub Pages deploys on every push to `main`. iPhone: Safari → Share → Add to Home Screen.
- **Check:** `node tools/verify.mjs` (plain Node; browser sections use any local Chrome/Edge). Release check: `CATOS_FULL=1 node tools/verify.mjs`.
- **Look at any hour:** `localStorage.setItem('catos:hour','night')`, reload.

Docs: [`CLAUDE.md`](CLAUDE.md) (map and rules) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/PRODUCT.md`](docs/PRODUCT.md) · [`docs/DEV-NOTES.md`](docs/DEV-NOTES.md) · history in `docs/history/`.

License: not yet chosen.
