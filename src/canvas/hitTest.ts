import type { GateInstance } from '../types/gate';
import type { PinRef, Wire } from '../types/wire';
import { GATE_H, GATE_W, LEAD } from './gateShapes';
import { GRID_SIZE, WORLD_BOUNDS } from './grid';
import type { Point, Rect } from './grid';
import { gatePins, pinPosition } from './wireRouting';

/** Topmost gate under `p` (later gates draw on top). `pad` widens the hit area for forgiving grabs. */
export function gateAt(p: Point, gates: GateInstance[], pad = 0): GateInstance | null {
  for (let i = gates.length - 1; i >= 0; i--) {
    const g = gates[i];
    if (p.x >= g.x - pad && p.x <= g.x + GATE_W + pad && p.y >= g.y - pad && p.y <= g.y + GATE_H + pad) return g;
  }
  return null;
}

/** Closest pin within `radius` of `p`. */
export function pinAt(p: Point, gates: GateInstance[], radius: number): PinRef | null {
  let best: PinRef | null = null;
  let bestDist = radius;
  for (const g of gates) {
    for (const pin of gatePins(g)) {
      const q = pinPosition(g, pin.kind, pin.index);
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d <= bestDist) {
        best = pin;
        bestDist = d;
      }
    }
  }
  return best;
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Topmost wire within `tol` of `p`. */
export function wireAt(p: Point, wires: Wire[], tol: number): Wire | null {
  for (let i = wires.length - 1; i >= 0; i--) {
    const pts = wires[i].points;
    for (let j = 0; j < pts.length - 1; j++) if (distToSegment(p, pts[j], pts[j + 1]) <= tol) return wires[i];
  }
  return null;
}

/** Smallest rectangle around every gate and wire. Null for an empty circuit. */
export function circuitBounds(gates: GateInstance[], wires: Wire[] = []): Rect | null {
  if (!gates.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x: number, y: number) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const g of gates) {
    grow(g.x - LEAD, g.y);
    grow(g.x + GATE_W + LEAD, g.y + GATE_H);
  }
  for (const w of wires) for (const p of w.points) grow(p.x, p.y);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const GAP = 20; // clear space kept between gates, room for a wire to run

const footprint = (x: number, y: number): Rect => ({ x: x - LEAD, y, w: GATE_W + 2 * LEAD, h: GATE_H });

/** Would a gate at (x, y) overlap, or sit closer than GAP to, any gate not in `ignore`? */
export function collides(x: number, y: number, gates: GateInstance[], ignore: string[] = []): boolean {
  const a = footprint(x, y);
  return gates.some((g) => {
    if (ignore.includes(g.id)) return false;
    const b = footprint(g.x, g.y);
    return a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;
  });
}

/** `p` if it is free, otherwise the closest free grid spot. */
export function nearestFreeSpot(p: Point, gates: GateInstance[], ignore: string[] = []): Point {
  p = clampToWorld(p); // never outside the boundary
  if (!collides(p.x, p.y, gates, ignore)) return p;
  for (let r = 1; r <= 40; r++) {
    let best: Point | null = null;
    let bestDist = Infinity;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const q = { x: p.x + dx * GRID_SIZE, y: p.y + dy * GRID_SIZE };
        const d = dx * dx + dy * dy;
        if (d < bestDist && inWorld(q.x, q.y) && !collides(q.x, q.y, gates, ignore)) {
          best = q;
          bestDist = d;
        }
      }
    }
    if (best) return best;
  }
  return p;
}

// A gate's body and pin leads must lie inside the workspace boundary.
const MIN_X = WORLD_BOUNDS.x + LEAD;
const MAX_X = WORLD_BOUNDS.x + WORLD_BOUNDS.w - GATE_W - LEAD;
const MIN_Y = WORLD_BOUNDS.y;
const MAX_Y = WORLD_BOUNDS.y + WORLD_BOUNDS.h - GATE_H;

/** Can a gate with its top-left corner at (x, y) sit inside the workspace? */
export const inWorld = (x: number, y: number): boolean => x >= MIN_X && x <= MAX_X && y >= MIN_Y && y <= MAX_Y;

/** The closest position inside the workspace. */
export const clampToWorld = (p: Point): Point => ({
  x: Math.min(MAX_X, Math.max(MIN_X, p.x)),
  y: Math.min(MAX_Y, Math.max(MIN_Y, p.y)),
});

/** A nearby offset where copies of `selected` fit inside the workspace, clear of every existing gate. Null if none. */
export function freeOffset(selected: GateInstance[], gates: GateInstance[]): Point | null {
  for (let r = 1; r <= 30; r++) {
    let best: Point | null = null;
    let bestDist = Infinity;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const o = { x: dx * GRID_SIZE, y: dy * GRID_SIZE };
        const d = dx * dx + dy * dy - (dx > 0 ? 0.5 : 0); // lean to the right
        if (d < bestDist && selected.every((g) => inWorld(g.x + o.x, g.y + o.y) && !collides(g.x + o.x, g.y + o.y, gates))) {
          best = o;
          bestDist = d;
        }
      }
    }
    if (best) return best;
  }
  return null;
}
