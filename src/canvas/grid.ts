// Coordinate maths for the canvas. Pure functions, no DOM.
// Convention: screen = world * zoom + (viewport.x, viewport.y), in CSS pixels.

export interface Point { x: number; y: number }
export interface Size { w: number; h: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Viewport { x: number; y: number; zoom: number }

export const GRID_SIZE = 20;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

/** The finite workspace (3:2 so it fits the minimap exactly). */
export const WORLD_BOUNDS: Rect = { x: -3000, y: -2000, w: 6000, h: 4000 };
/** What "Fit" frames until there are gates to frame. */
export const DEFAULT_BOUNDS: Rect = { x: -480, y: -320, w: 960, h: 640 };

export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export const worldToScreen = (p: Point, v: Viewport): Point => ({
  x: p.x * v.zoom + v.x,
  y: p.y * v.zoom + v.y,
});

export const screenToWorld = (p: Point, v: Viewport): Point => ({
  x: (p.x - v.x) / v.zoom,
  y: (p.y - v.y) / v.zoom,
});

export const snap = (n: number, step: number = GRID_SIZE): number => Math.round(n / step) * step;
export const snapPoint = (p: Point, step: number = GRID_SIZE): Point => ({
  x: snap(p.x, step),
  y: snap(p.y, step),
});

export const visibleWorldRect = (v: Viewport, size: Size): Rect => ({
  x: -v.x / v.zoom,
  y: -v.y / v.zoom,
  w: size.w / v.zoom,
  h: size.h / v.zoom,
});

export const centerViewport = (size: Size): Viewport => ({ x: size.w / 2, y: size.h / 2, zoom: 1 });

/** Change zoom while keeping the world point under `screenPt` fixed (cursor-anchored zoom). */
export function zoomAt(v: Viewport, screenPt: Point, nextZoom: number): Viewport {
  const zoom = clampZoom(nextZoom);
  const w = screenToWorld(screenPt, v);
  return { zoom, x: screenPt.x - w.x * zoom, y: screenPt.y - w.y * zoom };
}

/** Frame `bounds` inside the canvas. Never zooms in past 100%. */
export function fitViewport(bounds: Rect, size: Size, pad = 48): Viewport {
  if (!size.w || !size.h) return { x: 0, y: 0, zoom: 1 };
  const zoom = clampZoom(Math.min(1, (size.w - pad * 2) / bounds.w, (size.h - pad * 2) / bounds.h));
  return {
    zoom,
    x: size.w / 2 - (bounds.x + bounds.w / 2) * zoom,
    y: size.h / 2 - (bounds.y + bounds.h / 2) * zoom,
  };
}

/** Keep the centre of the screen inside WORLD_BOUNDS so you can't pan into the void. */
export function clampViewport(v: Viewport, size: Size): Viewport {
  if (!size.w || !size.h) return v;
  const c = screenToWorld({ x: size.w / 2, y: size.h / 2 }, v);
  const cx = Math.min(WORLD_BOUNDS.x + WORLD_BOUNDS.w, Math.max(WORLD_BOUNDS.x, c.x));
  const cy = Math.min(WORLD_BOUNDS.y + WORLD_BOUNDS.h, Math.max(WORLD_BOUNDS.y, c.y));
  return { zoom: v.zoom, x: size.w / 2 - cx * v.zoom, y: size.h / 2 - cy * v.zoom };
}
