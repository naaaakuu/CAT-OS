/**
 * Word DNA module — the fifth module island.
 *
 * Rule 5: this folder never imports from another module. It composes
 * core/ (loader, wd engine, mentor, storage interface) and ui/
 * (components), and exposes exactly one function:
 * registerWD(router, context). app.js calls it during boot; nothing
 * else knows this module exists.
 *
 * Routes owned by this module:
 *   /wd              — the Language Tree
 *   /wd/about        — the full guide, linked from the ⓘ beside the
 *                      Tree's title
 *   /wd/session/:set — meet a branch (set = root|prefix|suffix|foreign|cat_vocab)
 *                      or one family (set = wd-NNNN)
 *   /wd/learn/:id    — a family's Learning Page (the full walkthrough)
 *   /wd/garden       — the Word Garden
 */

/*
 * SCREENS ARE LOADED WHEN THEY ARE OPENED, never at boot — see
 * src/modules/reading-comprehension/index.js for why.
 */

export function registerWD(router, context) {
  router
    .register({
      path: '/wd',
      title: 'Word DNA',
      // Always the Tree (3.2). A first visit used to open the whole
      // introduction before anything could be tapped; now it waits behind
      // the ⓘ beside the title, for whoever asks.
      render: (outlet) => import('./screens/tree.js').then((m) => m.renderWDTree(outlet, context)),
    })
    .register({
      path: '/wd/about',
      title: 'About Word DNA',
      render: (outlet) => import('./screens/intro.js').then((m) => m.renderWDIntro(outlet, context, { firstTime: false })),
    })
    .register({
      path: '/wd/session/:set',
      title: 'Word DNA practice',
      render: (outlet, params) => import('./screens/session.js').then((m) => m.renderWDSession(outlet, context, params)),
    })
    .register({
      path: '/wd/learn/:id',
      title: 'Learning Page',
      render: (outlet, params) => import('./screens/learn.js').then((m) => m.renderWDLearn(outlet, context, params)),
    })
    .register({
      path: '/wd/garden',
      title: 'Word Garden',
      render: (outlet) => import('./screens/garden.js').then((m) => m.renderWDGarden(outlet, context)),
    });
}
