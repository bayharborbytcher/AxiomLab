import { GATE_DEFS, isBasicGate } from '../engine/gates';
import type { GateInstance } from '../types/gate';
import type { PinRef } from '../types/wire';
import { inputPins, outputPins } from './gateShapes';
import { snap } from './grid';
import type { Point } from './grid';

const STUB = 20;

/** World position of a gate's pin. */
export function pinPosition(g: GateInstance, kind: PinRef['kind'], index: number): Point {
  if (!isBasicGate(g.type)) return { x: g.x, y: g.y };
  const local = (kind === 'output' ? outputPins(g.type) : inputPins(g.type))[index];
  return { x: g.x + local.x, y: g.y + local.y };
}

export function gatePins(g: GateInstance): PinRef[] {
  if (!isBasicGate(g.type)) return [];
  const pins: PinRef[] = Array.from({ length: GATE_DEFS[g.type].outputCount }, (_, i): PinRef => ({ gateId: g.id, kind: 'output', index: i }));
  for (let i = 0; i < GATE_DEFS[g.type].inputCount; i++) pins.push({ gateId: g.id, kind: 'input', index: i });
  return pins;
}

/** Right-angle route from an output pin `a` to an input pin `b`, with bends on the grid. */
export function routeWire(a: Point, b: Point): Point[] {
  if (b.x - a.x >= STUB * 2) {
    if (a.y === b.y) return [a, b];
    const mx = snap((a.x + b.x) / 2);
    return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  }
  // Target is level with or behind the source: leave to the right, loop through the gap, enter from the left.
  const my = Math.abs(b.y - a.y) < 10 ? a.y + 80 : snap((a.y + b.y) / 2);
  return [
    a,
    { x: a.x + STUB, y: a.y },
    { x: a.x + STUB, y: my },
    { x: b.x - STUB, y: my },
    { x: b.x - STUB, y: b.y },
    b,
  ];
}
