import { BASIC_GATES, FLIP_FLOPS, GATE_DEFS, IO_GATES } from '../engine/gates';
import type { BasicGateType } from '../types/gate';
import type { Point } from './grid';

// Gate-local coordinates: body spans (0,0)-(80,80); pin leads stick out LEAD units each side.
// Everything lines up with the 20-unit grid, so pins land on grid points after snapping.
export const GATE_W = 80;
export const GATE_H = 80;
export const LEAD = 20;
export const BUBBLE_R = 5;

interface Shape {
  body: string; // SVG path data, shared by the canvas (Path2D) and the sidebar previews (<svg>)
  extra?: string; // XOR / XNOR back arc
  bubble: boolean; // inverting circle at the output
  leadEnd: number; // x where input leads meet the body
  label?: string; // short text shown in sidebar previews
}

const INV = GATE_W - 2 * BUBBLE_R; // body width when a bubble follows it

const and = (w: number) => `M0 0H${w - 40}A40 40 0 0 1 ${w - 40} 80H0Z`;
const or = (w: number) =>
  `M0 0C${w * 0.4} 0 ${w * 0.8} 6 ${w} 40C${w * 0.8} 74 ${w * 0.4} 80 0 80Q35 40 0 0Z`;
const tri = (w: number) => `M0 12L${w} 40L0 68Z`;
const XOR_ARC = 'M-10 0Q25 40 -10 80';

// Switch and readout bodies sit in the middle band of the cell (y 20 to 60), so their pin stays at y 40.
const PILL = 'M20 20H60A20 20 0 0 1 60 60H20A20 20 0 0 1 20 20Z';
const RRECT = 'M10 20H70A10 10 0 0 1 80 30V50A10 10 0 0 1 70 60H10A10 10 0 0 1 0 50V30A10 10 0 0 1 10 20Z';

const CHIP = 'M10 0H70A10 10 0 0 1 80 10V70A10 10 0 0 1 70 80H10A10 10 0 0 1 0 70V10A10 10 0 0 1 10 0Z';
const WEDGE = (y: number) => `M0 ${y - 8}L9 ${y}L0 ${y + 8}`; // the clock marker on an edge-triggered input

export const SHAPES: Record<BasicGateType, Shape> = {
  AND: { body: and(GATE_W), bubble: false, leadEnd: 0 },
  NAND: { body: and(INV), bubble: true, leadEnd: 0 },
  OR: { body: or(GATE_W), bubble: false, leadEnd: 13 },
  NOR: { body: or(INV), bubble: true, leadEnd: 13 },
  XOR: { body: or(GATE_W), extra: XOR_ARC, bubble: false, leadEnd: 3 },
  XNOR: { body: or(INV), extra: XOR_ARC, bubble: true, leadEnd: 3 },
  NOT: { body: tri(INV), bubble: true, leadEnd: 0 },
  BUFFER: { body: tri(GATE_W), bubble: false, leadEnd: 0 },
  // `extra` is the knob / lamp drawn in sidebar previews; on the canvas the renderer animates these itself.
  INPUT: { body: PILL, extra: 'M8 40a14 14 0 1 0 28 0a14 14 0 1 0 -28 0', bubble: false, leadEnd: 0 },
  OUTPUT: { body: RRECT, extra: 'M32 40a8 8 0 1 0 16 0a8 8 0 1 0 -16 0', bubble: false, leadEnd: 0 },
  CLOCK: { body: RRECT, extra: 'M16 48H28V32H42V48H56V32H66', bubble: false, leadEnd: 0 },
  LED: { body: 'M20 40a20 20 0 1 0 40 0a20 20 0 1 0 -40 0', bubble: false, leadEnd: 20 },
  SR_LATCH: { body: CHIP, bubble: false, leadEnd: 0, label: 'SR' },
  D_FF: { body: CHIP, extra: WEDGE(60), bubble: false, leadEnd: 0, label: 'D' },
  JK_FF: { body: CHIP, extra: WEDGE(40), bubble: false, leadEnd: 0, label: 'JK' },
  T_FF: { body: CHIP, extra: WEDGE(60), bubble: false, leadEnd: 0, label: 'T' },
};

export function inputPins(type: BasicGateType): Point[] {
  const n = GATE_DEFS[type].inputCount;
  const ys = n === 0 ? [] : n === 1 ? [40] : n === 2 ? [20, 60] : [20, 40, 60];
  return ys.map((y) => ({ x: -LEAD, y }));
}
export function outputPins(type: BasicGateType): Point[] {
  const n = GATE_DEFS[type].outputCount;
  const ys = n === 0 ? [] : n === 1 ? [40] : [20, 60];
  return ys.map((y) => ({ x: GATE_W + LEAD, y }));
}

/** Labels drawn inside memory parts. A leading ~ marks an inverted output (drawn with a bar). */
export const PORTS: Partial<Record<BasicGateType, { title: string; inputs: string[]; outputs: string[] }>> = {
  SR_LATCH: { title: 'SR', inputs: ['S', 'R'], outputs: ['Q', '~Q'] },
  D_FF: { title: 'D', inputs: ['D', '>'], outputs: ['Q', '~Q'] },
  JK_FF: { title: 'JK', inputs: ['J', '>', 'K'], outputs: ['Q', '~Q'] },
  T_FF: { title: 'T', inputs: ['T', '>'], outputs: ['Q', '~Q'] },
};

/** SVG path data for the wire stubs between the pins and the body. */
export const leadsD = (type: BasicGateType): string =>
  inputPins(type).map((p) => `M${p.x} ${p.y}H${SHAPES[type].leadEnd}`).join('') +
  outputPins(type).map((p) => `M${GATE_W} ${p.y}H${p.x}`).join('');

export interface Paths { body: Path2D; extra?: Path2D; leads: Path2D }
const cache = new Map<BasicGateType, Paths>();

export function getPaths(type: BasicGateType): Paths {
  let p = cache.get(type);
  if (!p) {
    const s = SHAPES[type];
    p = { body: new Path2D(s.body), extra: s.extra ? new Path2D(s.extra) : undefined, leads: new Path2D(leadsD(type)) };
    cache.set(type, p);
  }
  return p;
}

/** Build every Path2D up front so the first drop never hitches. */
export function warmGateGeometry(): void {
  for (const t of [...BASIC_GATES, ...IO_GATES, ...FLIP_FLOPS]) getPaths(t);
}

/** Draw one gate at the current canvas origin (caller translates to the gate's position). */
export function drawGate(
  ctx: CanvasRenderingContext2D,
  type: BasicGateType,
  fill: string,
  stroke: string,
  lineWidth: number,
): void {
  const p = getPaths(type);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fill(p.body);
  ctx.stroke(p.body);
  if (p.extra) ctx.stroke(p.extra);
  ctx.stroke(p.leads);
  if (SHAPES[type].bubble) {
    ctx.beginPath();
    ctx.arc(GATE_W - BUBBLE_R, 40, BUBBLE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
