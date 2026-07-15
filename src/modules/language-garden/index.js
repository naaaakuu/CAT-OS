/**
 * Language Garden module — the sixth module island. Rule 5: this folder
 * never imports from another module. It composes core/ (loader, garden
 * engine, garden mentor voice, storage interface) and ui/ (components),
 * and exposes exactly one function: registerLanguageGarden(router,
 * context). app.js calls it during boot; nothing else knows this module
 * exists.
 *
 * Routes owned by this module:
 *   /garden                 — the Overlook: the whole valley from above
 *                             (first ever visit: straight into the first
 *                             family's Grow session — Bible §3.1, no
 *                             tutorial screen)
 *   /garden/biome/:biome    — one biome of the valley (the Rootwood today)
 *   /garden/plant/:id       — a plant at a glance
 *   /garden/session/:id     — the six-beat Grow or Revisit session
 *   /garden/journal         — the Journal (what you can read now, sightings)
 */

import { renderOverlook } from './screens/overlook.js';
import { renderBiome } from './screens/biome.js';
import { renderPlant } from './screens/plant.js';
import { renderGardenSession } from './screens/session.js';
import { renderJournal } from './screens/journal.js';

export function registerLanguageGarden(router, context) {
  router
    .register({
      path: '/garden',
      title: 'The valley',
      render: (outlet) => renderOverlook(outlet, context),
    })
    .register({
      path: '/garden/biome/:biome',
      title: 'The Rootwood',
      render: (outlet, params) => renderBiome(outlet, context, params),
    })
    .register({
      path: '/garden/plant/:id',
      title: 'A plant',
      render: (outlet, params) => renderPlant(outlet, context, params),
    })
    .register({
      path: '/garden/session/:id',
      title: 'The Rootwood',
      render: (outlet, params) => renderGardenSession(outlet, context, params),
    })
    .register({
      path: '/garden/journal',
      title: 'Journal',
      render: (outlet) => renderJournal(outlet, context),
    });
}
