import { useUIStore } from '../store/uiStore';
import { MAX_ZOOM, MIN_ZOOM, fitViewport, screenToWorld } from './grid';
import type { Point, Rect, Size, Viewport } from './grid';

/**
 * Spring-driven camera. Zoom, scroll-pan and recentering all set a *target*; critically damped springs
 * (no overshoot) carry the view there. Retargeting mid-flight keeps the current velocity, so every
 * motion is interruptible and never jumps. Direct manipulation (drag-pan, minimap) bypasses it: 1:1.
 */
interface Axis { v: number; t: number; vel: number } // value, target, velocity

const cx: Axis = { v: 0, t: 0, vel: 0 }; // world x at the middle of the screen
const cy: Axis = { v: 0, t: 0, vel: 0 };
const lz: Axis = { v: 0, t: 0, vel: 0 }; // ln(zoom), so zooming feels even at every scale
const LN_MIN = Math.log(MIN_ZOOM);
const LN_MAX = Math.log(MAX_ZOOM);

let anchor: { world: Point; screen: Point } | null = null; // keeps the point under the cursor fixed
let stiffness = 300;
let lastView: Viewport | null = null;
let lastSize: Size | null = null;
let raf = 0;
let lastTime = 0;

const mid = (s: Size): Point => ({ x: s.w / 2, y: s.h / 2 });
const reset = (a: Axis, v: number) => {
  a.v = a.t = v;
  a.vel = 0;
};

/** If something else moved the view (drag-pan, minimap, resize), adopt it and drop any animation. */
function sync(): void {
  const { viewport: v, canvasSize: s } = useUIStore.getState();
  if (v === lastView && s === lastSize) return;
  const c = screenToWorld(mid(s), v);
  reset(cx, c.x);
  reset(cy, c.y);
  reset(lz, Math.log(v.zoom));
  anchor = null;
  lastView = v;
  lastSize = s;
}

function write(): void {
  const { canvasSize: s, setViewport } = useUIStore.getState();
  const zoom = Math.exp(lz.v);
  setViewport({ zoom, x: s.w / 2 - cx.v * zoom, y: s.h / 2 - cy.v * zoom });
  lastView = useUIStore.getState().viewport;
  lastSize = s;
}

function placeAnchor(s: Size): void {
  if (!anchor) return;
  const z = Math.exp(lz.v);
  cx.v = cx.t = anchor.world.x - (anchor.screen.x - s.w / 2) / z;
  cy.v = cy.t = anchor.world.y - (anchor.screen.y - s.h / 2) / z;
}

function stepAxis(a: Axis, dt: number): void {
  const damping = 2 * Math.sqrt(stiffness);
  a.vel += (-stiffness * (a.v - a.t) - damping * a.vel) * dt;
  a.v += a.vel * dt;
}

const near = (a: Axis, eps: number) => Math.abs(a.t - a.v) < eps && Math.abs(a.vel) < eps * 10;

function tick(now: number): void {
  raf = 0;
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  sync();
  const s = useUIStore.getState().canvasSize;
  const steps = Math.max(1, Math.ceil(dt * 120));

  for (let i = 0; i < steps; i++) {
    stepAxis(lz, dt / steps);
    if (anchor) placeAnchor(s);
    else {
      stepAxis(cx, dt / steps);
      stepAxis(cy, dt / steps);
    }
  }

  if (near(lz, 1e-4) && (anchor || (near(cx, 0.01) && near(cy, 0.01)))) {
    lz.v = lz.t; // land exactly on the target
    if (anchor) placeAnchor(s);
    else {
      cx.v = cx.t;
      cy.v = cy.t;
    }
    lz.vel = cx.vel = cy.vel = 0;
    anchor = null;
    write();
    return;
  }
  write();
  raf = requestAnimationFrame(tick);
}

function begin(k: number): void {
  sync();
  stiffness = k;
}
function kick(): void {
  if (raf) return;
  lastTime = performance.now();
  raf = requestAnimationFrame(tick);
}

/** Zoom by `factor` around a screen point. Repeated calls stack, so fast wheel spins build up. */
export function zoomAround(screen: Point, factor: number): void {
  begin(300);
  const s = useUIStore.getState().canvasSize;
  if (!anchor || anchor.screen.x !== screen.x || anchor.screen.y !== screen.y) {
    const z = Math.exp(lz.v);
    anchor = {
      screen,
      world: { x: cx.v + (screen.x - s.w / 2) / z, y: cy.v + (screen.y - s.h / 2) / z },
    };
  }
  lz.t = Math.min(LN_MAX, Math.max(LN_MIN, lz.t + Math.log(factor)));
  kick();
}

export function zoomStep(factor: number): void {
  zoomAround(mid(useUIStore.getState().canvasSize), factor);
}

/** Smoothly scroll the view by a screen-pixel amount (mouse wheel, trackpad swipe). */
export function panBy(dx: number, dy: number): void {
  begin(300);
  anchor = null;
  const z = Math.exp(lz.v);
  cx.t += dx / z;
  cy.t += dy / z;
  kick();
}

/** Glide to frame `bounds`, or to the origin at 100% when null. */
export function flyTo(bounds: Rect | null): void {
  begin(140);
  const s = useUIStore.getState().canvasSize;
  const v = bounds ? fitViewport(bounds, s, 80) : { x: s.w / 2, y: s.h / 2, zoom: 1 };
  const c = screenToWorld(mid(s), v);
  anchor = null;
  cx.t = c.x;
  cy.t = c.y;
  lz.t = Math.log(v.zoom);
  kick();
}
