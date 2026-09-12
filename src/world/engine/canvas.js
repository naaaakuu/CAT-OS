/**
 * canvas.js — the world renderer: a pixel-art scene drawn at its native
 * resolution into a small offscreen "world" canvas, then blitted to the
 * screen at an integer-friendly zoom with smoothing off, so every pixel
 * stays crisp on any phone or monitor. Owns the frame loop, the camera
 * (pan, zoom, inertia, clamping), pointer/touch/wheel/keyboard input,
 * and hit-testing. Knows nothing about what a scene contains: a Scene
 * object supplies `terrain(ctx)`, `objects()`, `lights()`, `update(dt)`
 * and `hit(x, y)`.
 *
 * Draw order per frame:
 *   1. the cached terrain (repainted only when the scene says so)
 *   2. dynamic objects, painter-sorted by their ground y (depth)
 *   3. the hour's lighting (a multiply tint) with additive lamps
 *   4. weather and the top overlay (fog, vignette)
 *
 * Performance: everything is drawn at world resolution (a few hundred
 * pixels a side), so a full frame is well under a millisecond of fill on
 * a phone; the screen blit is one drawImage. The loop idles when the tab
 * is hidden and stops when the renderer is destroyed.
 */

import { LIGHT, mix } from './palette.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class WorldRenderer {
  /**
   * @param {HTMLCanvasElement} screen  the visible canvas (CSS-sized by its parent)
   * @param {object} scene              see file header
   * @param {object} [opts]
   *   worldW/worldH   size of the scene in world pixels
   *   fit             'width' | 'height' | 'contain' | 'cover' — how the initial zoom is chosen
   *   minZoom/maxZoom in css px per world px (multiplied by DPR for device px)
   *   pannable        whether the learner can drag/zoom (false for hero panels)
   */
  constructor(screen, scene, opts = {}) {
    this.screen = screen;
    this.scene = scene;
    this.worldW = opts.worldW ?? 640;
    this.worldH = opts.worldH ?? 720;
    this.fit = opts.fit ?? 'cover';
    this.pannable = opts.pannable ?? true;
    this.minZoomOpt = opts.minZoom ?? 0.6;
    this.initialZoom = opts.initialZoom ?? 1.4;
    this.maxZoomOpt = opts.maxZoom ?? 4;
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    this.world = document.createElement('canvas');
    this.world.width = this.worldW; this.world.height = this.worldH;
    this.wctx = this.world.getContext('2d', { alpha: false });
    this.wctx.imageSmoothingEnabled = false;
    // Terrain is half a million pixels and about half a second of work, so
    // a scene that changes its light (a sunrise) keeps one baked canvas per
    // key and the change becomes a blit. `warmTerrain(keys)` bakes them
    // ahead of time; without it a dawn stops dead twice to paint one.
    this.terrainCaches = new Map();
    this.terrainKey = null;
    this.terrainCache = this.#terrainCanvasFor('default');
    this.tctx = this.terrainCache.getContext('2d', { alpha: false });
    this.terrainDirty = true;
    this.sctx = screen.getContext('2d', { alpha: false });
    // A handle on the canvas, so a screenshot harness (and a curious
    // developer in the console) can ask the camera what it is doing.
    screen.__renderer = this;
    this.cam = { x: this.worldW / 2, y: this.worldH / 2, zoom: 1, vx: 0, vy: 0 };
    this.cssW = 0; this.cssH = 0;
    this.time = 0;
    this.running = false;
    this.lastTs = 0;
    // True while a finger or the mouse is on the canvas: the frame loop
    // skips world simulation for as long as it is.
    this.interacting = false;
    this.dirty = true;
    this.onTap = opts.onTap ?? null;
    this.onMove = opts.onMove ?? null;
    this.overlay = null; // optional (ctx, view) painter after lighting
    this.#bindInput();
    this.resize();
    this.#ro = new ResizeObserver(() => this.resize());
    this.#ro.observe(screen.parentElement ?? screen);
    this.#onVis = () => { if (document.visibilityState === 'visible' && this.running) { this.lastTs = 0; this.#raf(); } };
    document.addEventListener('visibilitychange', this.#onVis);
  }

  #ro; #onVis; #rafId = 0; #pointers = new Map(); #pinch = null; #dragging = false; #dragMoved = false; #lastPointer = null;

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
    this.sctx.imageSmoothingEnabled = false;
    if (wasUnsized) this.cam.zoom = this.pannable ? Math.max(this.fitZoom(), this.snap(this.initialZoom)) : this.fitZoom();
    this.clampCamera();
    this.draw();
  }

  /** The zoom that fits the world into the viewport per `fit`. */
  fitZoom() {
    const zw = this.cssW / this.worldW, zh = this.cssH / this.worldH;
    let z = this.fit === 'width' ? zw : this.fit === 'height' ? zh : this.fit === 'contain' ? Math.min(zw, zh) : Math.max(zw, zh);
    // Prefer a zoom that lands on whole device pixels per world pixel — the
    // difference between crisp pixel art and a shimmering mush. A 'cover'
    // fit rounds UP, or snapping would leave a bar where the scene was
    // meant to fill the frame.
    const device = z * this.dpr;
    const whole = this.fit === 'cover' ? Math.ceil(device) : Math.round(device);
    const snapped = device >= 2 ? whole / this.dpr : z;
    return clamp(snapped, this.minZoom(), this.maxZoom());
  }

  /** Snap a zoom to whole device pixels per world pixel. */
  snap(z) { const d = z * this.dpr; return clamp((d >= 2 ? Math.round(d) : d) / this.dpr, this.minZoom(), this.maxZoom()); }

  /**
   * How far out the camera may go.
   *
   * A 'cover' scene is a place you are standing in, so it may never zoom
   * out past the point where the world stops covering the frame: a map
   * shrinking into a band of haze with grass above and below it is a
   * diagram, not a valley, and it is the fastest way to make a game feel
   * like a web page. 'contain' scenes (the small hero panels) still use
   * the old floor, where letterboxing is the whole point.
   */
  minZoom() {
    const cover = Math.max(this.cssW / this.worldW, this.cssH / this.worldH);
    const contain = Math.min(this.cssW / this.worldW, this.cssH / this.worldH);
    const floor = this.fit === 'cover' ? cover : contain * 0.98;
    return Math.max(this.minZoomOpt, floor);
  }
  maxZoom() { return this.maxZoomOpt; }

  clampCamera() {
    const halfW = this.cssW / this.cam.zoom / 2, halfH = this.cssH / this.cam.zoom / 2;
    if (halfW * 2 >= this.worldW) this.cam.x = this.worldW / 2; else this.cam.x = clamp(this.cam.x, halfW, this.worldW - halfW);
    if (halfH * 2 >= this.worldH) this.cam.y = this.worldH / 2; else this.cam.y = clamp(this.cam.y, halfH, this.worldH - halfH);
  }

  /** Centre the camera on a world point, optionally animating there. */
  lookAt(x, y, { zoom, animate = true, duration = 700 } = {}) {
    const from = { x: this.cam.x, y: this.cam.y, zoom: this.cam.zoom };
    const to = { x, y, zoom: zoom ?? this.cam.zoom };
    if (!animate) { Object.assign(this.cam, to); this.clampCamera(); this.draw(); return; }
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = clamp((now - start) / duration, 0, 1), e = ease(t);
      this.cam.x = from.x + (to.x - from.x) * e;
      this.cam.y = from.y + (to.y - from.y) * e;
      this.cam.zoom = from.zoom + (to.zoom - from.zoom) * e;
      this.clampCamera();
      if (t < 1) this.tween = requestAnimationFrame(step); else this.tween = 0;
    };
    cancelAnimationFrame(this.tween);
    this.tween = requestAnimationFrame(step);
  }

  /** Screen (css px, relative to the canvas) → world coordinates. */
  toWorld(sx, sy) {
    return { x: (sx - this.cssW / 2) / this.cam.zoom + this.cam.x, y: (sy - this.cssH / 2) / this.cam.zoom + this.cam.y };
  }
  /** World → screen css px. */
  toScreen(wx, wy) {
    return { x: (wx - this.cam.x) * this.cam.zoom + this.cssW / 2, y: (wy - this.cam.y) * this.cam.zoom + this.cssH / 2 };
  }
  /** The visible world rect. */
  view() {
    const w = this.cssW / this.cam.zoom, h = this.cssH / this.cam.zoom;
    return { x: this.cam.x - w / 2, y: this.cam.y - h / 2, w, h };
  }

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
      cancelAnimationFrame(this.tween);
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
      // NOT this.draw(). Pointer moves are delivered faster than frames on
      // most touch hardware (and coalesced events arrive in bursts), so
      // drawing here painted the same frame two or three times over. Mark
      // it dirty and let the one rAF loop do exactly one draw per frame.
      this.invalidate();
    };
    this.#onUp = (e) => {
      const p = pos(e);
      this.#pointers.delete(e.pointerId);
      if (this.#pointers.size === 0) this.interacting = false;
      if (this.#pointers.size < 2) this.#pinch = null;
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
      const factor = Math.exp(-e.deltaY * 0.0015);
      this.zoomAt(p.x, p.y, clamp(this.cam.zoom * factor, this.minZoom(), this.maxZoom()));
    };
    this.#onKey = (e) => {
      if (!this.pannable) return;
      const step = 40 / this.cam.zoom;
      if (e.key === 'ArrowLeft') this.cam.x -= step; else if (e.key === 'ArrowRight') this.cam.x += step;
      else if (e.key === 'ArrowUp') this.cam.y -= step; else if (e.key === 'ArrowDown') this.cam.y += step;
      else if (e.key === '+' || e.key === '=') this.zoomAt(this.cssW / 2, this.cssH / 2, clamp(this.cam.zoom * 1.2, this.minZoom(), this.maxZoom()));
      else if (e.key === '-') this.zoomAt(this.cssW / 2, this.cssH / 2, clamp(this.cam.zoom / 1.2, this.minZoom(), this.maxZoom()));
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
  #onDown; #onMovePtr; #onUp; #onWheel; #onKey; #lastMove = null;

  /** Zoom keeping the world point under (sx, sy) fixed. */
  zoomAt(sx, sy, zoom) {
    const before = this.toWorld(sx, sy);
    this.cam.zoom = zoom;
    const after = this.toWorld(sx, sy);
    this.cam.x += before.x - after.x; this.cam.y += before.y - after.y;
    this.clampCamera();
    this.invalidate();
  }

  /** The camera changed: draw on the next frame. A still scene with no loop
   *  running draws immediately, because nothing else ever will. */
  invalidate() {
    this.dirty = true;
    if (!this.running) this.draw();
  }

  /* ---------------- loop ---------------- */

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    this.#raf();
  }
  stop() { this.running = false; cancelAnimationFrame(this.#rafId); }
  destroy() {
    this.stop();
    cancelAnimationFrame(this.tween);
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

  #raf() {
    cancelAnimationFrame(this.#rafId);
    this.#rafId = requestAnimationFrame((ts) => this.#frame(ts));
  }

  #frame(ts) {
    if (!this.running || document.visibilityState === 'hidden') return;
    const dt = this.lastTs ? Math.min(50, ts - this.lastTs) : 16;
    this.lastTs = ts;
    this.time += dt;
    // Camera inertia after a flick.
    if (!this.#dragging && (Math.abs(this.cam.vx) > 0.01 || Math.abs(this.cam.vy) > 0.01)) {
      this.cam.x += this.cam.vx * (dt / 16); this.cam.y += this.cam.vy * (dt / 16);
      this.cam.vx *= Math.pow(0.9, dt / 16); this.cam.vy *= Math.pow(0.9, dt / 16);
      this.clampCamera();
    }
    // While the camera is in someone's hand, the valley holds still: the
    // ducks, the butterflies, the smoke and the weather are not what the
    // learner is looking at during a drag, and simulating them is the one
    // cost a pan cannot afford. They pick up exactly where they left off.
    if (!this.interacting) this.scene.update?.(dt, this.time);
    this.draw();
    this.dirty = false;
    this.#raf();
  }

  #terrainCanvasFor(key) {
    let c = this.terrainCaches.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = this.worldW; c.height = this.worldH;
      const ctx = c.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = false;
      c.__painted = false;
      this.terrainCaches.set(key, c);
    }
    return c;
  }

  /** The key the scene is currently painting under. */
  #terrainKey() { return this.scene?.terrainKey ?? this.scene?.hour ?? 'default'; }

  /**
   * Paint the terrain for one or more scene states now, so that switching
   * to them later costs nothing. `prepare(key)` must put the scene into
   * that state; it is called once per key and then undone by the caller.
   */
  warmTerrain(keys, prepare) {
    const was = this.#terrainKey();
    for (const key of keys) {
      if (this.terrainCaches.get(key)?.__painted) continue;
      prepare?.(key);
      const c = this.#terrainCanvasFor(key);
      const ctx = c.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = false;
      this.scene.terrain(ctx, { w: this.worldW, h: this.worldH, time: this.time });
      c.__painted = true;
    }
    prepare?.(was);
  }

  invalidateTerrain() {
    this.terrainDirty = true;
    const c = this.terrainCaches.get(this.#terrainKey());
    if (c) c.__painted = false;
  }

  /* ---------------- drawing ---------------- */

  draw() {
    const { wctx, worldW, worldH } = this;
    const key = this.#terrainKey();
    if (key !== this.terrainKey) {
      this.terrainKey = key;
      this.terrainCache = this.#terrainCanvasFor(key);
      this.tctx = this.terrainCache.getContext('2d', { alpha: false });
      this.tctx.imageSmoothingEnabled = false;
      if (!this.terrainCache.__painted) this.terrainDirty = true;
    }
    if (this.terrainDirty) {
      this.scene.terrain(this.tctx, { w: worldW, h: worldH, time: this.time });
      this.terrainCache.__painted = true;
      this.terrainDirty = false;
    }
    wctx.drawImage(this.terrainCache, 0, 0);
    const view = this.view();
    const objects = this.scene.objects?.(view, this.time) ?? [];
    objects.sort((a, b) => (a.y + (a.z ?? 0)) - (b.y + (b.z ?? 0)));
    for (const o of objects) {
      if (o.draw) { o.draw(wctx, this.time); continue; }
      const s = o.sprite;
      if (!s) continue;
      const x = Math.round(o.x - s.ax), y = Math.round(o.y - s.ay);
      if (x + s.w < view.x - 8 || x > view.x + view.w + 8 || y + s.h < view.y - 8 || y > view.y + view.h + 8) continue;
      if (o.alpha !== undefined && o.alpha < 1) { wctx.globalAlpha = Math.max(0, o.alpha); }
      if (o.scaleY !== undefined && o.scaleY !== 1) {
        // Growth: scale from the anchor (the ground), never from the centre.
        wctx.save();
        wctx.translate(o.x, o.y);
        wctx.scale(o.scaleX ?? o.scaleY, o.scaleY);
        wctx.drawImage(s.canvas, -s.ax, -s.ay);
        wctx.restore();
      } else {
        wctx.drawImage(s.canvas, x, y);
      }
      wctx.globalAlpha = 1;
    }
    // Lighting: the hour's multiply tint, then additive lamps and glows.
    const light = this.scene.light?.(this.time);
    if (light && light.strength > 0) {
      wctx.globalCompositeOperation = 'multiply';
      wctx.fillStyle = mix('#FFFFFF', light.tint, light.strength);
      wctx.fillRect(0, 0, worldW, worldH);
      wctx.globalCompositeOperation = 'source-over';
    }
    const lamps = this.scene.lights?.(view, this.time) ?? [];
    if (lamps.length) {
      wctx.globalCompositeOperation = 'lighter';
      for (const l of lamps) {
        const g = wctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        const a = clamp(l.a ?? 0.5, 0, 1);
        g.addColorStop(0, hexA(l.color ?? '#FFC873', a));
        g.addColorStop(1, hexA(l.color ?? '#FFC873', 0));
        wctx.fillStyle = g;
        wctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }
      wctx.globalCompositeOperation = 'source-over';
    }
    this.scene.overlay?.(wctx, view, this.time);

    // Blit to the screen at the camera's zoom. Anything the map does not
    // cover is painted by the scene's `beyond` — sky above the mountains,
    // haze below the road — so a tall phone never shows a dead bar.
    //
    // Both edge painters are pure functions of the camera geometry, so
    // they are skipped entirely when the map covers the screen (the
    // common case) and cached otherwise: they must never cost a frame.
    const s = this.sctx, z = this.cam.zoom * this.dpr;
    const W = this.screen.width, H = this.screen.height;
    s.imageSmoothingEnabled = false;
    s.fillStyle = this.scene.backdrop ?? '#0A1230';
    s.fillRect(0, 0, W, H);
    const ox = Math.round(W / 2 - this.cam.x * z);
    const oy = Math.round(H / 2 - this.cam.y * z);
    const covers = ox <= 0 && oy <= 0 && ox + worldW * z >= W && oy + worldH * z >= H;
    const edgeView = { ox, oy, z, w: W, h: H, worldW, worldH, dpr: this.dpr };
    if (!covers) this.#edge('beyond', edgeView);
    s.drawImage(this.world, 0, 0, worldW, worldH, ox, oy, Math.round(worldW * z), Math.round(worldH * z));
    if (!covers) this.#edge('hud', edgeView);
  }

  /** Paint (and cache) one of the scene's edge layers. */
  #edge(which, view) {
    const fn = this.scene[which];
    if (!fn) return;
    // A scene whose edges depend on more than the camera (the hour, say)
    // says so through `edgeKey`; otherwise the geometry alone is enough.
    const key = `${view.ox}|${view.oy}|${view.z.toFixed(3)}|${view.w}|${view.h}|${this.scene.edgeKey ?? ''}`;
    let slot = this.#edges[which];
    if (!slot) {
      const c = document.createElement('canvas');
      slot = { key: '', canvas: c, ctx: c.getContext('2d') };
      this.#edges[which] = slot;
    }
    if (slot.canvas.width !== view.w || slot.canvas.height !== view.h) {
      slot.canvas.width = view.w; slot.canvas.height = view.h; slot.key = '';
    }
    if (slot.key !== key) {
      slot.ctx.clearRect(0, 0, view.w, view.h);
      slot.ctx.imageSmoothingEnabled = false;
      fn.call(this.scene, slot.ctx, view, this.time);
      slot.key = key;
    }
    this.sctx.drawImage(slot.canvas, 0, 0);
  }

  #edges = {};
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** The hour's light descriptor, for scenes that follow the clock. */
export function lightFor(hour) { return LIGHT[hour] ?? LIGHT.morning; }
