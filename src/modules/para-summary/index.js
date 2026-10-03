/**
 * Para Summary module — the third module island.
 *
 * Rule 5: this folder never imports from another module. It composes
 * core/ (loader, ps engine, mentor, storage interface) and ui/
 * (components), and exposes exactly one function:
 * registerPS(router, context). app.js calls it during boot; nothing
 * else knows this module exists.
 *
 * Routes owned by this module:
 *   /ps              — the summary journey
 *   /ps/about        — the full guide, linked from the ⓘ beside the
 *                      journey's title
 *   /ps/session/:set — practice a tier (set = tier id) or one item
 *                      (set = ps-NNNN)
 *   /ps/learn/:id    — an item's Learning Page (the full walkthrough)
 */

/*
 * SCREENS ARE LOADED WHEN THEY ARE OPENED, never at boot. This is a
 * no-build app, so every static `import` at the top of this file is one
 * more HTTP request and a few more kilobytes before the VILLAGE — the
 * screen a cold open actually lands on — can paint. The router awaits
 * `render`, so an async render needs nothing from anyone; and
 * service-worker.js precaches every screen below, so opening one offline
 * is still a cache hit. `tools/module-graph.mjs` measures what is left.
 */

export function registerPS(router, context) {
  router
    .register({
      path: '/ps',
      title: 'Para Summary',
      // Always the journey (3.2). A first visit used to open the whole
      // introduction before anything could be tapped; now it waits behind
      // the ⓘ beside the title, for whoever asks.
      render: (outlet) => import('./screens/browser.js').then((s) => s.renderPSBrowser(outlet, context)),
    })
    .register({
      path: '/ps/about',
      title: 'About Para Summary',
      render: (outlet) => import('./screens/intro.js').then((s) => s.renderPSIntro(outlet, context, { firstTime: false })),
    })
    .register({
      path: '/ps/session/:set',
      title: 'Para Summary practice',
      render: (outlet, params) => import('./screens/session.js').then((s) => s.renderPSSession(outlet, context, params)),
    })
    .register({
      path: '/ps/learn/:id',
      title: 'Learning Page',
      render: (outlet, params) => import('./screens/learn.js').then((s) => s.renderPSLearn(outlet, context, params)),
    });
}
