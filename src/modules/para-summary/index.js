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

import { renderPSIntro } from './screens/intro.js';
import { renderPSBrowser } from './screens/browser.js';
import { renderPSSession } from './screens/session.js';
import { renderPSLearn } from './screens/learn.js';
import { hasSeenPSIntro } from './logic/store.js';

export function registerPS(router, context) {
  router
    .register({
      path: '/ps',
      title: 'Para Summary',
      render: async (outlet) => {
        // The first open shows the introduction, not questions — the
        // journey begins with understanding, and only then with choosing.
        let seen = true;
        try { seen = await hasSeenPSIntro(context.storage); } catch { /* storage down: browse */ }
        if (!seen) {
          renderPSIntro(outlet, context, {
            firstTime: true,
            onBegin: () => renderPSBrowser(outlet, context),
          });
        } else {
          await renderPSBrowser(outlet, context);
        }
      },
    })
    .register({
      path: '/ps/about',
      title: 'About Para Summary',
      render: (outlet) => renderPSIntro(outlet, context, { firstTime: false }),
    })
    .register({
      path: '/ps/session/:set',
      title: 'Para Summary practice',
      render: (outlet, params) => renderPSSession(outlet, context, params),
    })
    .register({
      path: '/ps/learn/:id',
      title: 'Learning Page',
      render: (outlet, params) => renderPSLearn(outlet, context, params),
    });
}
