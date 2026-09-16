/**
 * router.js — a small hash-based client router.
 *
 * Why hashes (from TECH_STACK.md): `#/home` needs zero server rewrite
 * rules, works identically on GitHub Pages / Netlify / a local file,
 * and keeps working offline. History-API routing would need per-host
 * configuration — complexity with no payoff for this app.
 *
 * Contract:
 * - A route is `{ path, title, render }` where `render(outlet, params)`
 *   fills the outlet element. `render` may be async.
 * - Paths support one-level params: '#/practice/:id'.
 * - Unknown hashes render the registered 'notFound' route.
 */

export class Router {
  #routes = [];
  #notFound = null;
  #outlet;
  #onNavigate;
  /* Two renders must never write into the outlet at once.
     `render` is async — a screen that loads a passage, a bank set or the
     world's records can be several hundred milliseconds wide. Without a
     guard, a second navigation during that window cleared the outlet, ran
     its own render, and then the FIRST render's `await` resolved and
     appended its screen underneath: two screens in the DOM, the stale one
     last, focus and scroll landing on whichever finished second. Ten hash
     changes in a row (a learner tapping the rail, a redirect route, a back
     button held down) made that reliable rather than rare.
     `#nav` is the generation counter; `#inflight` serialises the writes. */
  #nav = 0;
  #inflight = null;

  /**
   * @param {HTMLElement} outlet element routes render into
   * @param {(route: object) => void} [onNavigate] called after each render
   *        (the shell uses this to update the nav and move focus)
   */
  constructor(outlet, onNavigate) {
    this.#outlet = outlet;
    this.#onNavigate = onNavigate;
  }

  register(route) {
    this.#routes.push({ ...route, segments: split(route.path) });
    return this;
  }

  registerNotFound(route) {
    this.#notFound = route;
    return this;
  }

  /** Start listening and render the current hash.
   *  @param {string} [defaultPath] where an empty hash lands (default: the
   *  first registered route). The shell passes the valley (0.16.0): the
   *  world is the application's home, so a cold open arrives there. */
  start(defaultPath) {
    window.addEventListener('hashchange', () => this.#render());
    if (!location.hash) {
      location.replace(`#${defaultPath || this.#routes[0].path}`);
    } else {
      this.#render();
    }
  }

  /** Programmatic navigation, e.g. router.go('/settings'). */
  go(path) { location.hash = `#${path}`; }

  async #render() {
    const mine = (this.#nav += 1);

    // Let any render already in flight finish writing before we clear.
    if (this.#inflight) { try { await this.#inflight; } catch { /* handled there */ } }
    // Somebody navigated again while we waited: that navigation is the
    // learner's real intent, and it will render itself. Drop this one.
    if (mine !== this.#nav) return;

    const current = split(location.hash.slice(1));
    let matched = this.#notFound;
    let params = {};

    for (const route of this.#routes) {
      const p = match(route.segments, current);
      if (p) { matched = route; params = p; break; }
    }
    if (!matched) return;

    document.title = matched.title ? `${matched.title} — CAT OS` : 'CAT OS';
    // A screen that has to read a passage, fifty root families or the whole
    // record log is not instant, and until it resolves the outlet is empty.
    // Nothing is shown for the first fifth of a second — a fast screen must
    // not flash a spinner — and after that the learner is told the app is
    // working, not left looking at nothing.
    const waiting = setTimeout(() => { if (mine === this.#nav) showWaiting(); }, 200);
    const run = (async () => {
      this.#outlet.innerHTML = '';
      try {
        await matched.render(this.#outlet, params);
      } catch (err) {
        console.error('[CAT OS] screen failed to render', location.hash, err);
        // Never a blank screen and never a stack trace: one plain sentence
        // and a way back. The details stay in the console for whoever is
        // reading it, which is never the learner.
        if (mine === this.#nav) this.#outlet.innerHTML = FAILED;
      }
    })();
    this.#inflight = run;
    await run;
    clearTimeout(waiting);
    hideWaiting();
    if (this.#inflight === run) this.#inflight = null;
    if (mine !== this.#nav) return;              // superseded while rendering

    this.#outlet.focus({ preventScroll: true }); // a11y: move focus to new screen
    window.scrollTo(0, 0);
    this.#onNavigate?.(matched);
  }
}

/* The waiting state lives OUTSIDE the outlet, in its own fixed layer.
   Putting it in the outlet would mean the screen's own first write has to
   clear it, and a screen that appends rather than assigns would end up with
   a spinner stuck above its content. This way nothing a screen does can
   leave it behind, and nothing it does can hide it early either. */
function showWaiting() {
  if (document.getElementById('route-waiting')) return;
  const el = document.createElement('div');
  el.id = 'route-waiting';
  el.className = 'route-waiting';
  el.setAttribute('role', 'status');
  el.innerHTML = '<span class="route-waiting__dot"></span><span class="route-waiting__dot"></span><span class="route-waiting__dot"></span><span class="sr-only">Opening…</span>';
  document.body.appendChild(el);
}
function hideWaiting() { document.getElementById('route-waiting')?.remove(); }

const FAILED = `
  <section class="screen">
    <div class="empty">
      <div class="empty__glyph" aria-hidden="true">·</div>
      <h1>This screen didn't open</h1>
      <p>Something it needed didn't arrive. It usually works the second time.</p>
      <p>
        <button class="btn btn--primary" onclick="location.reload()">Try again</button>
        <a class="btn" href="#/world">Back to the village</a>
      </p>
    </div>
  </section>`;

/** '#/practice/rc-0001' → ['practice', 'rc-0001'] */
function split(path) {
  // A query after the route (#/world/place/hearth?works=1) is a hint for
  // the screen, never part of the match.
  return path.split('?')[0].replace(/^#?\//, '').split('/').filter(Boolean);
}

/** Match URL segments against route segments; ':name' captures a param.
 *  @returns {object|null} params, or null if no match. */
function match(routeSegs, urlSegs) {
  if (routeSegs.length !== urlSegs.length) return null;
  const params = {};
  for (let i = 0; i < routeSegs.length; i += 1) {
    if (routeSegs[i].startsWith(':')) {
      params[routeSegs[i].slice(1)] = decodeURIComponent(urlSegs[i]);
    } else if (routeSegs[i] !== urlSegs[i]) {
      return null;
    }
  }
  return params;
}
