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

export function registerLanguageGarden(router, context) {
  router
    // 1.0.0: the valley and the Rootwood walk live in src/world/ now; the
    // old addresses keep working by pointing there.
    .register({
      path: '/garden',
      title: 'The valley',
      render: () => { location.replace('#/world'); },
    })
    .register({
      path: '/garden/biome/:biome',
      title: 'The Rootwood',
      render: () => { location.replace('#/world/place/rootwood'); },
    })
    .register({
      path: '/garden/plant/:id',
      title: 'A plant',
      render: (outlet, params) => import('./screens/plant.js').then((m) => m.renderPlant(outlet, context, params)),
    })
    .register({
      path: '/garden/session/:id',
      title: 'The Rootwood',
      render: (outlet, params) => import('./screens/session.js').then((m) => m.renderGardenSession(outlet, context, params)),
    })
    .register({
      path: '/garden/journal',
      title: 'Journal',
      render: () => { location.replace('#/world/place/hearth'); },
    });
}
