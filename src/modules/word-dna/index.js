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
 *   /wd              — the Language Tree (first visit: the introduction)
 *   /wd/about        — the introduction, revisitable any time
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
  const intro = (outlet, opts) => import('./screens/intro.js').then((m) => m.renderWDIntro(outlet, context, opts));
  const tree = (outlet) => import('./screens/tree.js').then((m) => m.renderWDTree(outlet, context));
  router
    .register({
      path: '/wd',
      title: 'Word DNA',
      render: async (outlet) => {
        // The first open shows the introduction, not words — the
        // journey begins with understanding, and only then with meeting words.
        let seen = true;
        try {
          const store = await import('./logic/store.js');
          seen = await store.hasSeenWDIntro(context.storage);
        } catch { /* storage down: browse */ }
        if (!seen) await intro(outlet, { firstTime: true, onBegin: () => tree(outlet) });
        else await tree(outlet);
      },
    })
    .register({
      path: '/wd/about',
      title: 'About Word DNA',
      render: (outlet) => intro(outlet, { firstTime: false }),
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
