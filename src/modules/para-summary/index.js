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
 *   /ps              — the summary journey (first visit: the introduction)
 *   /ps/about        — the introduction, revisitable any time
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
  const intro = (outlet, opts) => import('./screens/intro.js').then((s) => s.renderPSIntro(outlet, context, opts));
  const browser = (outlet) => import('./screens/browser.js').then((s) => s.renderPSBrowser(outlet, context));
  router
    .register({
      path: '/ps',
      title: 'Para Summary',
      render: async (outlet) => {
        // The first open shows the introduction, not questions — the
        // journey begins with understanding, and only then with choosing.
        let seen = true;
        try {
          const store = await import('./logic/store.js');
          seen = await store.hasSeenPSIntro(context.storage);
        } catch { /* storage down: browse */ }
        if (!seen) await intro(outlet, { firstTime: true, onBegin: () => browser(outlet) });
        else await browser(outlet);
      },
    })
    .register({
      path: '/ps/about',
      title: 'About Para Summary',
      render: (outlet) => intro(outlet, { firstTime: false }),
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
