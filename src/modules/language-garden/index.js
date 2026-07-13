/**
 * Language Garden module — the sixth module island, and the first
 * region of it: the Root Grove (LANGUAGE_GARDEN_BIBLE, first vertical
 * slice). Rule 5: this folder never imports from another module. It
 * composes core/ (loader, garden engine, garden mentor voice, storage
 * interface) and ui/ (components), and exposes exactly one function:
 * registerLanguageGarden(router, context). app.js calls it during
 * boot; nothing else knows this module exists.
 *
 * Routes owned by this module:
 *   /garden               — the Root Grove scene (first ever visit:
 *                            straight into the first family's Grow
 *                            session — Bible §6.3, no tutorial screen)
 *   /garden/plant/:id     — a plant at a glance
 *   /garden/session/:id   — the six-beat Grow or Revisit session
 *   /garden/journal       — the Journal (what you can read now, wild sightings)
 */

import { renderGrove } from './screens/grove.js';
import { renderPlant } from './screens/plant.js';
import { renderGardenSession } from './screens/session.js';
import { renderJournal } from './screens/journal.js';

export function registerLanguageGarden(router, context) {
  router
    .register({
      path: '/garden',
      title: 'Root Grove',
      render: (outlet) => renderGrove(outlet, context),
    })
    .register({
      path: '/garden/plant/:id',
      title: 'A plant',
      render: (outlet, params) => renderPlant(outlet, context, params),
    })
    .register({
      path: '/garden/session/:id',
      title: 'Root Grove',
      render: (outlet, params) => renderGardenSession(outlet, context, params),
    })
    .register({
      path: '/garden/journal',
      title: 'Journal',
      render: (outlet) => renderJournal(outlet, context),
    });
}
