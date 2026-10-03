/**
 * Para Jumbles module — the second module island.
 *
 * Rule 5: this folder never imports from another module. It composes
 * core/ (loader, pj engine, mentor, storage interface) and ui/
 * (components), and exposes exactly one function:
 * registerPJ(router, context). app.js calls it during boot; nothing
 * else knows this module exists.
 *
 * Routes owned by this module:
 *   /pj              — the ordering journey
 *   /pj/about        — the full guide, linked from the ⓘ beside the
 *                      journey's title
 *   /pj/session/:set — practice a tier (set = tier id) or one jumble
 *                      (set = pj-NNNN)
 *   /pj/learn/:id    — a jumble's Learning Page (the full walkthrough)
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

export function registerPJ(router, context) {
  router
    .register({
      path: '/pj',
      title: 'Para Jumbles',
      // Always the journey (3.2). A first visit used to open the whole
      // introduction before anything could be tapped; now it waits behind
      // the ⓘ beside the title, for whoever asks.
      render: (outlet) => import('./screens/browser.js').then((s) => s.renderPJBrowser(outlet, context)),
    })
    .register({
      path: '/pj/about',
      title: 'About Para Jumbles',
      render: (outlet) => import('./screens/intro.js').then((s) => s.renderPJIntro(outlet, context, { firstTime: false })),
    })
    .register({
      path: '/pj/session/:set',
      title: 'Para Jumbles practice',
      render: (outlet, params) => import('./screens/session.js').then((s) => s.renderPJSession(outlet, context, params)),
    })
    .register({
      path: '/pj/learn/:id',
      title: 'Learning Page',
      render: (outlet, params) => import('./screens/learn.js').then((s) => s.renderPJLearn(outlet, context, params)),
    });
}
