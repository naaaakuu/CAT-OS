/**
 * Odd One Out module — the fourth module island.
 *
 * Rule 5: this folder never imports from another module. It composes
 * core/ (loader, ooo engine, mentor, storage interface) and ui/
 * (components), and exposes exactly one function:
 * registerOOO(router, context). app.js calls it during boot; nothing
 * else knows this module exists.
 *
 * Routes owned by this module:
 *   /ooo              — the detection journey
 *   /ooo/about        — the full guide, linked from the ⓘ beside the
 *                       journey's title
 *   /ooo/session/:set — practice a tier (set = tier id) or one item
 *                       (set = ooo-NNNN)
 *   /ooo/learn/:id    — an item's Learning Page (the full walkthrough)
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

export function registerOOO(router, context) {
  router
    .register({
      path: '/ooo',
      title: 'Odd One Out',
      // Always the journey (3.2). A first visit used to open the whole
      // introduction before anything could be tapped; now it waits behind
      // the ⓘ beside the title, for whoever asks.
      render: (outlet) => import('./screens/browser.js').then((s) => s.renderOOOBrowser(outlet, context)),
    })
    .register({
      path: '/ooo/about',
      title: 'About Odd One Out',
      render: (outlet) => import('./screens/intro.js').then((s) => s.renderOOOIntro(outlet, context, { firstTime: false })),
    })
    .register({
      path: '/ooo/session/:set',
      title: 'Odd One Out practice',
      render: (outlet, params) => import('./screens/session.js').then((s) => s.renderOOOSession(outlet, context, params)),
    })
    .register({
      path: '/ooo/learn/:id',
      title: 'Learning Page',
      render: (outlet, params) => import('./screens/learn.js').then((s) => s.renderOOOLearn(outlet, context, params)),
    });
}
