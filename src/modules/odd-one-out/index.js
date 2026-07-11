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
 *   /ooo              — the detection journey (first visit: the introduction)
 *   /ooo/about        — the introduction, revisitable any time
 *   /ooo/session/:set — practice a tier (set = tier id) or one item
 *                       (set = ooo-NNNN)
 *   /ooo/learn/:id    — an item's Learning Page (the full walkthrough)
 */

import { renderOOOIntro } from './screens/intro.js';
import { renderOOOBrowser } from './screens/browser.js';
import { renderOOOSession } from './screens/session.js';
import { renderOOOLearn } from './screens/learn.js';
import { hasSeenOOOIntro } from './logic/store.js';

export function registerOOO(router, context) {
  router
    .register({
      path: '/ooo',
      title: 'Odd One Out',
      render: async (outlet) => {
        // The first open shows the introduction, not questions — the
        // journey begins with understanding, and only then with choosing.
        let seen = true;
        try { seen = await hasSeenOOOIntro(context.storage); } catch { /* storage down: browse */ }
        if (!seen) {
          renderOOOIntro(outlet, context, {
            firstTime: true,
            onBegin: () => renderOOOBrowser(outlet, context),
          });
        } else {
          await renderOOOBrowser(outlet, context);
        }
      },
    })
    .register({
      path: '/ooo/about',
      title: 'About Odd One Out',
      render: (outlet) => renderOOOIntro(outlet, context, { firstTime: false }),
    })
    .register({
      path: '/ooo/session/:set',
      title: 'Odd One Out practice',
      render: (outlet, params) => renderOOOSession(outlet, context, params),
    })
    .register({
      path: '/ooo/learn/:id',
      title: 'Learning Page',
      render: (outlet, params) => renderOOOLearn(outlet, context, params),
    });
}
