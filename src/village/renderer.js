/**
 * renderer.js — the village renderer: a camera over an illustrated scene.
 *
 * Unlike the pixel-art engine it grew out of, this draws straight to the
 * screen canvas through one transform, with smoothing on: the terrain is a
 * baked canvas blitted once per frame, sprites are cached canvases drawn
 * at their world size, and the camera is a translate and a scale. Owns
 * the frame loop, the camera (pan, zoom, inertia, clamping), pointer /
 * touch / wheel / keyboard input, and hit-testing. Knows nothing about
 * what a scene contains.
 *
 * A Scene supplies:
 *   W, H            world size
 *   terrain(ctx)    paints the ground into a W×H canvas (cached; repainted
 *                   only when `terrainKey` changes)
 *   update(dt, t)   advance the living things
 *   objects(view,t) → [{ x, y, art | draw, z, alpha, flip, scale, bob }]
 *   light(t)        → { tint, strength }  (a multiply over everything)
 *   lights(view,t)  → [{ x, y, r, a, color }]  (additive glows)
 *   overlay(ctx, view, t)
 *   hit(x, y)       → whatever the scene says is under a world point
 *
 * Performance: only objects inside the view are drawn; the simulation is
 * skipped while a finger is down; the loop idles when the tab is hidden;
 * lights are a handful of gradients, not a light map.
 */

import { pruneArt, art } from './art.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** Device pixels per world unit come in quarter steps, so every sprite can
 *  be cached at the exact scale and blitted without resampling. */
const STEP = 0.25;
const quant = (dz) => Math.max(1, Math.round(dz / STEP) * STEP);
/** The largest pre-scaled terrain canvas worth allocating, in pixels.
 *  Safari/iOS refuses a canvas over roughly 16.7 Mpx and returns a blank one
 *  rather than throwing, so the ground would simply stop being painted. */
const MAX_TERRAIN_PX = 16e6;
/** How many baked 1200×1200 ground canvases to keep (about 5.8 MB each). */
const MAX_TERRAIN_CACHES = 3;

export class VillageRenderer {
  constructor(screen, scene, opts = {}) {
    this.screen = screen;
    this.scene = scene;
    this.fit = opts.fit ?? 'cover';
    this.pannable = opts.pannable ?? true;
    this.minZoomOpt = opts.minZoom ?? 0.3;
    this.maxZoomOpt = opts.maxZoom ?? 2.4;
    this.initialZoom = opts.initialZoom ?? 0.85;
    // Rasterising a few hundred smooth-scaled sprites is the whole cost of a
    // frame, and it scales with device pixels: the village renders at no
    // more than 2 device pixels per CSS pixel (illustration hides it;
    // the old pixel-art engine needed 3 to stay crisp).
    this.dpr = Math.min(opts.maxDpr ?? 2, window.devicePixelRatio || 1);
    this.quality = opts.quality ?? 'low';
    this.sctx = screen.getContext('2d', { alpha: false });
    screen.__renderer = this;
    this.cam = { x: scene.W / 2, y: scene.H / 2, zoom: this.initialZoom, vx: 0, vy: 0 };
    this.cssW = 0; this.cssH = 0;
    this.time = 0;
    this.running = false;
    this.lastTs = 0;
    this.interacting = false;
    this.still = opts.still ?? false;   // see setStill(): reduced motion
    this.onTap = opts.onTap ?? null;
    this.onMove = opts.onMove ?? null;
    this.terrainCaches = new Map();
    this.#bindInput();
    this.resize();
    this.#ro = new ResizeObserver(() => this.resize());
    this.#ro.observe(screen.parentElement ?? screen);
    this.#onVis = () => { if (document.visibilityState === 'visible' && this.running) { this.lastTs = 0; this.#raf(); } };
    document.addEventListener('visibilitychange', this.#onVis);
  }

  #ro; #onVis; #rafId = 0; #pointers = new Map(); #pinch = null; #dragging = false; #dragMoved = false; #lastPointer = null; #lastMove = null;
  #onDown; #onMovePtr; #onUp; #onWheel; #onKey; tween = 0;

  get worldW() { return this.scene.W; }
  get worldH() { return this.scene.H; }

  /** Swap the scene (after a rebuild) without losing the camera or the loop. */
  setScene(scene) { this.scene = scene; this.clampCamera(); this.invalidate(); }

  /* ---------------- sizing and camera ---------------- */

  resize() {
    const rect = (this.screen.parentElement ?? this.screen).getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    if (cssW === this.cssW && cssH === this.cssH) return;
    const wasUnsized = this.cssW === 0;
    this.cssW = cssW; this.cssH = cssH;
    this.screen.width = Math.round(cssW * this.dpr);
    this.screen.height = Math.round(cssH * this.dpr);
    this.screen.style.width = `${cssW}px`;
    this.screen.style.height = `${cssH}px`;
    if (wasUnsized) this.cam.zoom = this.pannable ? Math.max(this.fitZoom(), this.initialZoom) : this.fitZoom();
    this.cam.zoom = clamp(this.cam.zoom, this.minZoom(), this.maxZoom());
    this.clampCamera();
    this.draw();
  }

  /** The zoom that fits the world into the viewport per `fit`, snapped. */
  fitZoom() {
    const zw = this.cssW / this.worldW, zh = this.cssH / this.worldH;
    const z = this.fit === 'width' ? zw : this.fit === 'height' ? zh : this.fit === 'contain' ? Math.min(zw, zh) : Math.max(zw, zh);
    return this.snap(z);
  }
  /** The nearest zoom at which sprites blit 1:1, inside the limits. */
  snap(z) {
    const zq = quant(z * this.dpr) / this.dpr;
    return clamp(zq, this.minZoom(), this.maxZoom());
  }
  /** A 'cover' scene may never zoom out past covering the frame; the floor
   *  is rounded UP to a snapped zoom so the overview also blits 1:1. */
  minZoom() {
    const cover = Math.max(this.cssW / this.worldW, this.cssH / this.worldH);
    const contain = Math.min(this.cssW / this.worldW, this.cssH / this.worldH);
    const floor = this.fit === 'cover' ? cover : contain * 0.98;
    const dz = Math.max(1, Math.ceil(Math.max(this.minZoomOpt, floor) * this.dpr / STEP) * STEP);
    return dz / this.dpr;
  }
  maxZoom() { return quant(this.maxZoomOpt * this.dpr) / this.dpr; }

  clampCamera() {
    const halfW = this.cssW / this.cam.zoom / 2, halfH = this.cssH / this.cam.zoom / 2;
    if (halfW * 2 >= this.worldW) this.cam.x = this.worldW / 2; else this.cam.x = clamp(this.cam.x, halfW, this.worldW - halfW);
    if (halfH * 2 >= this.worldH) this.cam.y = this.worldH / 2; else this.cam.y = clamp(this.cam.y, halfH, this.worldH - halfH);
  }

  /** Centre the camera on a world point, optionally animating there. */
  lookAt(x, y, { zoom, animate = true, duration = 700, ease: easeFn } = {}) {
    const from = { x: this.cam.x, y: this.cam.y, zoom: this.cam.zoom };
    const to = { x, y, zoom: zoom === undefined ? this.cam.zoom : this.snap(zoom) };
    // An instant move supersedes a tween in flight, or the tween would keep
    // writing its own interpolation over the new position until it ended.
    if (!animate) { this.cancelTween(); Object.assign(this.cam, to); this.clampCamera(); this.invalidate(); return Promise.resolve(); }
    const start = performance.now();
    const ease = easeFn ?? ((t) => 1 - Math.pow(1 - t, 3));
    // A tween that is superseded (by another move, or a finger) still
    // settles its promise, so nothing waiting on the camera can hang.
    this.cancelTween();
    return new Promise((resolve) => {
      this.#settle = resolve;
      const step = (now) => {
        const t = clamp((now - start) / duration, 0, 1), e = ease(t);
        this.cam.x = from.x + (to.x - from.x) * e;
        this.cam.y = from.y + (to.y - from.y) * e;
        this.cam.zoom = from.zoom + (to.zoom - from.zoom) * e;
        this.clampCamera();
        this.invalidate();
        if (t < 1) this.tween = requestAnimationFrame(step); else { this.tween = 0; this.#settle = null; resolve(); }
      };
      this.tween = requestAnimationFrame(step);
    });
  }

  /** Stop a camera move, settling whoever was waiting on it. */
  cancelTween() { cancelAnimationFrame(this.tween); this.tween = 0; const done = this.#settle; this.#settle = null; done?.(); }
  #settle = null;

  toWorld(sx, sy) { return { x: (sx - this.cssW / 2) / this.cam.zoom + this.cam.x, y: (sy - this.cssH / 2) / this.cam.zoom + this.cam.y }; }
  toScreen(wx, wy) { return { x: (wx - this.cam.x) * this.cam.zoom + this.cssW / 2, y: (wy - this.cam.y) * this.cam.zoom + this.cssH / 2 }; }
  view() { const w = this.cssW / this.cam.zoom, h = this.cssH / this.cam.zoom; return { x: this.cam.x - w / 2, y: this.cam.y - h / 2, w, h }; }

  /* ---------------- input ---------------- */

  #bindInput() {
    const el = this.screen;
    el.style.touchAction = 'none';
    const pos = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    this.#onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      this.interacting = true;
      el.setPointerCapture?.(e.pointerId);
      const p = pos(e);
      this.#pointers.set(e.pointerId, p);
      this.#dragMoved = false;
      this.cam.vx = 0; this.cam.vy = 0;
      this.cancelTween();
      if (this.#pointers.size === 1) { this.#dragging = true; this.#lastPointer = { ...p, t: performance.now() }; this.#lastMove = null; }
      if (this.#pointers.size === 2) { const [a, b] = [...this.#pointers.values()]; this.#pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.cam.zoom, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; this.#dragging = false; }
    };
    this.#onMovePtr = (e) => {
      const p = pos(e);
      if (!this.#pointers.has(e.pointerId)) { this.onMove?.(this.toWorld(p.x, p.y), p); return; }
      const prev = this.#pointers.get(e.pointerId);
      this.#pointers.set(e.pointerId, p);
      if (this.#pinch && this.#pointers.size === 2) {
        const [a, b] = [...this.#pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        this.zoomAt(this.#pinch.mid.x, this.#pinch.mid.y, clamp(this.#pinch.zoom * (dist / this.#pinch.dist), this.minZoom(), this.maxZoom()));
        return;
      }
      if (!this.#dragging || !this.pannable) return;
      const dx = p.x - prev.x, dy = p.y - prev.y;
      if (Math.abs(p.x - this.#lastPointer.x) + Math.abs(p.y - this.#lastPointer.y) > 6) this.#dragMoved = true;
      this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom;
      this.clampCamera();
      const now = performance.now();
      const dt = Math.max(1, now - (this.#lastMove?.t ?? now - 16));
      this.cam.vx = (-dx / this.cam.zoom) / dt * 16; this.cam.vy = (-dy / this.cam.zoom) / dt * 16;
      this.#lastMove = { t: now };
      this.invalidate();
    };
    this.#onUp = (e) => {
      const p = pos(e);
      this.#pointers.delete(e.pointerId);
      if (this.#pointers.size === 0) this.interacting = false;
      if (this.#pointers.size < 2 && this.#pinch) {
        // A pinch may land anywhere; settle on the nearest zoom that blits 1:1.
        this.#pinch = null;
        const z = this.snap(this.cam.zoom);
        if (Math.abs(z - this.cam.zoom) > 1e-6) this.lookAt(this.cam.x, this.cam.y, { zoom: z, duration: 180 });
      }
      if (this.#dragging && this.#pointers.size === 0) {
        this.#dragging = false;
        if (!this.#dragMoved) { const w = this.toWorld(p.x, p.y); this.onTap?.(w, p); this.cam.vx = 0; this.cam.vy = 0; }
        else if (performance.now() - (this.#lastMove?.t ?? 0) > 80) { this.cam.vx = 0; this.cam.vy = 0; }
      }
    };
    this.#onWheel = (e) => {
      if (!this.pannable) return;
      e.preventDefault();
      const p = pos(e);
      const dz = this.cam.zoom * this.dpr + (e.deltaY < 0 ? STEP : -STEP);
      this.zoomAt(p.x, p.y, this.snap(dz / this.dpr));
    };
    this.#onKey = (e) => {
      if (!this.pannable) return;
      const step = 40 / this.cam.zoom;
      if (e.key === 'ArrowLeft') this.cam.x -= step; else if (e.key === 'ArrowRight') this.cam.x += step;
      else if (e.key === 'ArrowUp') this.cam.y -= step; else if (e.key === 'ArrowDown') this.cam.y += step;
      else if (e.key === '+' || e.key === '=') this.zoomAt(this.cssW / 2, this.cssH / 2, this.snap((this.cam.zoom * this.dpr + STEP) / this.dpr));
      else if (e.key === '-') this.zoomAt(this.cssW / 2, this.cssH / 2, this.snap((this.cam.zoom * this.dpr - STEP) / this.dpr));
      else return;
      e.preventDefault(); this.clampCamera(); this.invalidate();
    };
    el.addEventListener('pointerdown', this.#onDown);
    el.addEventListener('pointermove', this.#onMovePtr);
    el.addEventListener('pointerup', this.#onUp);
    el.addEventListener('pointercancel', this.#onUp);
    el.addEventListener('wheel', this.#onWheel, { passive: false });
    el.addEventListener('keydown', this.#onKey);
  }

  zoomAt(sx, sy, zoom) {
    const before = this.toWorld(sx, sy);
    this.cam.zoom = zoom;
    const after = this.toWorld(sx, sy);
    this.cam.x += before.x - after.x; this.cam.y += before.y - after.y;
    this.clampCamera();
    this.invalidate();
  }

  invalidate() { this.dirty = true; if (!this.running) this.draw(); }

  /* ---------------- loop ---------------- */

  start() { if (this.running) return; this.running = true; this.lastTs = 0; this.#raf(); }
  stop() { this.running = false; cancelAnimationFrame(this.#rafId); }
  destroy() {
    this.stop();
    this.cancelTween();
    this.#ro.disconnect();
    document.removeEventListener('visibilitychange', this.#onVis);
    const el = this.screen;
    el.removeEventListener('pointerdown', this.#onDown);
    el.removeEventListener('pointermove', this.#onMovePtr);
    el.removeEventListener('pointerup', this.#onUp);
    el.removeEventListener('pointercancel', this.#onUp);
    el.removeEventListener('wheel', this.#onWheel);
    el.removeEventListener('keydown', this.#onKey);
  }

  #raf() { cancelAnimationFrame(this.#rafId); this.#rafId = requestAnimationFrame((ts) => this.#frame(ts)); }

  /**
   * Stand the world still (the learner asked for less motion).
   * The village is the one screen that is nothing BUT motion — walkers,
   * smoke, water glints, weather, a moving light model — and CSS cannot
   * reach inside a canvas, so `prefers-reduced-motion` had no effect here
   * at all. Still mode freezes `time` and stops calling scene.update, so
   * the valley holds one settled frame; the camera still pans, zooms and
   * tweens, because moving the view is the learner's own doing.
   */
  setStill(still) {
    const next = !!still;
    if (next === this.still) return;
    this.still = next;
    this.lastTs = 0;
    this.invalidate();
  }

  #frame(ts) {
    if (!this.running || document.visibilityState === 'hidden') return;
    const dt = this.lastTs ? Math.min(50, ts - this.lastTs) : 16;
    this.lastTs = ts;
    if (!this.still) this.time += dt;
    if (!this.#dragging && (Math.abs(this.cam.vx) > 0.01 || Math.abs(this.cam.vy) > 0.01)) {
      this.cam.x += this.cam.vx * (dt / 16); this.cam.y += this.cam.vy * (dt / 16);
      this.cam.vx *= Math.pow(0.9, dt / 16); this.cam.vy *= Math.pow(0.9, dt / 16);
      this.clampCamera();
      this.dirty = true;
    }
    if (!this.interacting && !this.still) {
      this.scene.update?.(dt, this.time);
      const light = this.scene.light?.(this.time);
      this.scene.warm?.(quant(this.cam.zoom * this.dpr), light && light.strength > 0 ? hexA(light.tint, Math.min(0.6, light.strength * 0.8)) : null);
      this.dirty = true;
    }
    // Every camera change already calls invalidate(), and draw() clears the
    // flag — so in still mode an untouched village costs one rAF callback a
    // frame and no raster at all, instead of a full repaint at 60fps.
    if (!this.still || this.dirty) this.draw();
    this.#raf();
  }

  /* ---------------- terrain cache ---------------- */

  #terrainFor(key) {
    let c = this.terrainCaches.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = this.worldW; c.height = this.worldH;
      c.__painted = false;
      this.terrainCaches.set(key, c);
      /* terrainKey is season | plots | for-sale | road level, so it changes
         on a plot purchase, a road raise or a season roll. Nothing ever
         removed the old canvas, and each is worldW*worldH — 5.8 MB at
         1200². Keep the few most recent; a Map iterates in insertion order,
         so the oldest key is the first one out. */
      while (this.terrainCaches.size > MAX_TERRAIN_CACHES) {
        const oldest = this.terrainCaches.keys().next().value;
        if (oldest === key) break;
        this.terrainCaches.delete(oldest);
      }
    }
    if (!c.__painted) {
      const ctx = c.getContext('2d', { alpha: false });
      this.scene.terrain(ctx, { w: this.worldW, h: this.worldH });
      c.__painted = true;
    }
    return c;
  }
  /**
   * The terrain at the camera's device scale, so the ground is one 1:1
   * blit per frame. Kept for the current bucket only; a change of zoom
   * repaints once (a scale of a cached canvas, not a repaint of the map).
   */
  #terrainAt(key, bucket, tint) {
    const base = this.#terrainFor(key);
    if (this.#scaled && this.#scaled.key === key && this.#scaled.bucket === bucket && this.#scaled.tint === tint) return this.#scaled.canvas;
    const c = this.#scaled?.canvas ?? document.createElement('canvas');
    const w = Math.round(this.worldW * bucket), h = Math.round(this.worldH * bucket);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = c.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(base, 0, 0, w, h);
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, w, h); }
    this.#scaled = { key, bucket, tint, canvas: c };
    return c;
  }
  #scaled = null;

  /** Paint terrain for several scene states now, so switching costs nothing. */
  warmTerrain(keys, prepare) {
    const was = this.scene.terrainKey;
    for (const key of keys) { prepare?.(key); this.#terrainFor(this.scene.terrainKey ?? key); }
    prepare?.(was);
  }
  invalidateTerrain() { for (const c of this.terrainCaches.values()) c.__painted = false; }

  /* ---------------- drawing ---------------- */

  draw() {
    const s = this.sctx, dz = this.cam.zoom * this.dpr;
    const W = this.screen.width, H = this.screen.height;
    const view = this.view();
    const ox = W / 2 - this.cam.x * dz, oy = H / 2 - this.cam.y * dz;
    // Sprites are cached at the exact device scale when the zoom is
    // snapped (always, except mid-pinch) and blitted at whole pixels: no
    // resampling, which is the whole cost of a frame on a software raster.
    const bucket = quant(dz);
    const exact = Math.abs(bucket - dz) < 1e-6;
    // The hour's light: an alpha wash toward the tint, baked into the
    // sprites and the ground, so nothing is multiplied per frame.
    const light = this.scene.light?.(this.time);
    const tint = light && light.strength > 0 ? hexA(light.tint, Math.min(0.6, light.strength * 0.8)) : null;
    if (bucket !== this.#bucket) { const prev = this.#bucket; this.#bucket = bucket; pruneArt(new Set([bucket, prev, 2].filter(Boolean))); }
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.imageSmoothingEnabled = true;
    s.imageSmoothingQuality = this.quality;
    s.fillStyle = this.scene.backdrop ?? '#5A9A3C';
    s.fillRect(0, 0, W, H);
    const worldT = () => s.setTransform(dz, 0, 0, dz, ox, oy);
    const tkey = this.scene.terrainKey ?? 'default';
    /* The fast path pre-scales the WHOLE world to a canvas at `bucket` device
       pixels per world unit and blits it 1:1. That canvas is 1200*bucket
       square: fine at the default phone zoom (bucket 2.5 → 3000²), but the
       village's own maxZoom on a dpr-2 phone reaches bucket 4.5 → 5400², or
       29.2 megapixels and ~117 MB of backing store, allocated synchronously
       inside a frame. That is past Safari/iOS's per-canvas area cap, where the
       allocation fails silently and the ground blits blank. Above the cap the
       ground goes through the world transform instead — it is soft gradients
       and blotches, so the difference is invisible, and it costs one
       drawImage of the 1200² base. */
    const scaledPx = (this.worldW * bucket) * (this.worldH * bucket);
    if (exact && scaledPx <= MAX_TERRAIN_PX) {
      s.drawImage(this.#terrainAt(tkey, bucket, tint), Math.round(ox), Math.round(oy));
    } else {
      worldT();
      s.drawImage(this.#terrainFor(tkey), 0, 0, this.worldW, this.worldH);
      if (tint) { s.fillStyle = tint; s.fillRect(view.x - 4, view.y - 4, view.w + 8, view.h + 8); }
    }
    worldT();
    const objects = this.scene.objects?.(view, this.time) ?? [];
    objects.sort((a, b) => (a.y + (a.z ?? 0)) - (b.y + (b.z ?? 0)));
    const pad = 80;
    let inWorld = true;
    for (const o of objects) {
      if (o.draw) { if (!inWorld) { worldT(); inWorld = true; } o.draw(s, this.time, view); continue; }
      const a0 = o.art;
      if (!a0) continue;
      const sc = o.scale ?? 1;
      const w = a0.w * sc, h = a0.h * sc;
      const x = o.x - a0.ax * sc, y = o.y - a0.ay * sc + (o.bob ?? 0);
      if (x + w < view.x - pad || x > view.x + view.w + pad || y + h < view.y - pad || y > view.y + view.h + pad) continue;
      if (o.alpha !== undefined && o.alpha < 1) s.globalAlpha = Math.max(0, o.alpha);
      if (o.rot) {
        // The few things that turn (swaying trees) take the slow path.
        if (!inWorld) { worldT(); inWorld = true; }
        const a = a0.at ? a0.at(bucket, !!o.flip, tint) : a0;
        s.save(); s.translate(o.x, o.y); s.rotate(o.rot);
        s.drawImage(a.canvas, -a.ax * sc, -a.ay * sc + (o.bob ?? 0), a.w * sc, a.h * sc); s.restore();
      } else {
        const a = a0.at ? a0.at(exact ? bucket * sc : bucket, !!o.flip, tint) : a0;
        if (inWorld) { s.setTransform(1, 0, 0, 1, 0, 0); inWorld = false; }
        /* The anchor offset is ALWAYS in world units scaled by `sc`.
           art() documents w/h/ax/ay as world units whatever scale the canvas
           was rasterised at, so `a.ax` does not change when the exact branch
           asks for `bucket * sc` instead of `bucket` — only the canvas does.
           The old `(exact ? 1 : sc)` therefore dropped the scale on the path
           that runs in the entire steady state (the zoom is always snapped
           except mid-pinch), drawing every non-unit-scale prop off its own
           anchor by ax*(sc-1) world units: the grass tufts at 1.4–2.0, the
           bushes at 1.5, the flower patches, the grove tufts at 2.2. */
        const dx = ox + (o.x - a.ax * sc) * dz, dy = oy + (o.y - a.ay * sc + (o.bob ?? 0)) * dz;
        if (exact && a0.at) s.drawImage(a.canvas, Math.round(dx), Math.round(dy));
        else s.drawImage(a.canvas, dx, dy, a.w * sc * dz, a.h * sc * dz);
      }
      if (o.alpha !== undefined && o.alpha < 1) s.globalAlpha = 1;
    }
    if (!inWorld) { worldT(); inWorld = true; }
    const lamps = this.scene.lights?.(view, this.time) ?? [];
    if (lamps.length) {
      s.globalCompositeOperation = 'lighter';
      s.setTransform(1, 0, 0, 1, 0, 0);
      for (const l of lamps) {
        if (l.x + l.r < view.x || l.x - l.r > view.x + view.w || l.y + l.r < view.y || l.y - l.r > view.y + view.h) continue;
        // Glows are cached sprites (radius to 4, strength to a tenth), blitted additively.
        const r = Math.max(8, Math.round(l.r / 4) * 4), a = Math.round(clamp(l.a ?? 0.5, 0, 1) * 10) / 10;
        const g = art('glow', { r, color: l.color ?? '#FFC873', a }, exact ? bucket : 2);
        if (exact) s.drawImage(g.canvas, Math.round(ox + (l.x - g.ax) * dz), Math.round(oy + (l.y - g.ay) * dz));
        else s.drawImage(g.canvas, ox + (l.x - g.ax) * dz, oy + (l.y - g.ay) * dz, g.w * dz, g.h * dz);
      }
      worldT();
      s.globalCompositeOperation = 'source-over';
    }
    this.scene.overlay?.(s, view, this.time);
    s.setTransform(1, 0, 0, 1, 0, 0);
    this.dirty = false;
  }
  #bucket = 0;
}

function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((A >> sh) & 255) + (((B >> sh) & 255) - ((A >> sh) & 255)) * t);
  return `#${((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)}`;
}
