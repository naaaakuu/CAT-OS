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
 *   /pj              — the ordering journey (first visit: the introduction)
 *   /pj/about        — the introduction, revisitable any time
 *   /pj/session/:set — practice a tier (set = tier id) or one jumble
 *                      (set = pj-NNNN)
 *   /pj/learn/:id    — a jumble's Learning Page (the full walkthrough)
 */

import { renderPJIntro } from './screens/intro.js';
import { renderPJBrowser } from './screens/browser.js';
import { renderPJSession } from './screens/session.js';
import { renderPJLearn } from './screens/learn.js';
import { hasSeenPJIntro } from './logic/store.js';

export function registerPJ(router, context) {
  router
    .register({
      path: '/pj',
      title: 'Para Jumbles',
      render: async (outlet) => {
        // The first open shows the introduction, not questions — the
        // journey begins with understanding, and only then with solving.
        let seen = true;
        try { seen = await hasSeenPJIntro(context.storage); } catch { /* storage down: browse */ }
        if (!seen) {
          renderPJIntro(outlet, context, {
            firstTime: true,
            onBegin: () => renderPJBrowser(outlet, context),
          });
        } else {
          await renderPJBrowser(outlet, context);
        }
      },
    })
    .register({
      path: '/pj/about',
      title: 'About Para Jumbles',
      render: (outlet) => renderPJIntro(outlet, context, { firstTime: false }),
    })
    .register({
      path: '/pj/session/:set',
      title: 'Para Jumbles practice',
      render: (outlet, params) => renderPJSession(outlet, context, params),
    })
    .register({
      path: '/pj/learn/:id',
      title: 'Learning Page',
      render: (outlet, params) => renderPJLearn(outlet, context, params),
    });
}
