/**
 * Reading Comprehension module — the first module island.
 *
 * Rule 5: this folder never imports from another module. It composes
 * core/ (loader, engine, storage interface) and ui/ (components), and
 * exposes exactly one function: registerRC(router, context).
 * app.js calls it during boot; nothing else knows this module exists.
 *
 * Routes owned by this module:
 *   /rc              — passage browser
 *   /rc/session/:id  — practice a passage
 *   /rc/review/:id   — review the latest attempt on a passage
 *   /rc/mentor/:id   — the Learning Page (Reading Mentor)
 *
 * SCREENS ARE LOADED WHEN THEY ARE OPENED, never at boot. This is a
 * no-build app, so every static `import` at the top of this file is one
 * more HTTP request and a few more kilobytes before the VILLAGE can
 * paint — and a learner standing in the village has not asked for the
 * Reading Mentor's lesson copy. The router awaits `render`, so an async
 * render needs nothing else from anyone. `tools/module-graph.mjs`
 * measures what the boot still costs; `service-worker.js` precaches
 * every screen below, so opening one offline is a cache hit.
 */

export function registerRC(router, context) {
  router
    .register({
      path: '/rc',
      title: 'Reading Comprehension',
      render: (outlet) => import('./screens/browser.js').then((m) => m.renderBrowser(outlet, context)),
    })
    .register({
      path: '/rc/second-look',
      title: 'The second look',
      render: (outlet) => import('./screens/second-look.js').then((m) => m.renderSecondLook(outlet, context)),
    })
    .register({
      path: '/rc/session/:id',
      title: 'Practice',
      render: (outlet, params) => import('./screens/session.js').then((m) => m.renderSession(outlet, context, params)),
    })
    .register({
      path: '/rc/review/:id',
      title: 'Review',
      render: (outlet, params) => import('./screens/review.js').then((m) => m.renderReview(outlet, context, params)),
    })
    .register({
      path: '/rc/mentor/:id',
      title: 'Learning Page',
      render: (outlet, params) => import('./screens/mentor.js').then((m) => m.renderMentor(outlet, context, params)),
    });
}
