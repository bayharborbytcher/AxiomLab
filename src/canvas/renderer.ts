import type { SimResult } from '../engine/evaluator';
import { ioNames } from '../engine/truthTable';
import type { BasicGateType, GateInstance, PinState } from '../types/gate';
import { WIRE_COLORS } from '../types/wire';
import type { PinRef, Wire, WireDraft } from '../types/wire';
import { GATE_H, GATE_W, LEAD, PORTS, drawGate, getPaths, inputPins, outputPins } from './gateShapes';
import { GRID_SIZE, WORLD_BOUNDS, snapPoint } from './grid';
import type { Point, Size, Viewport } from './grid';
import { pinPosition, routeWire } from './wireRouting';

export interface Theme {
  bg: string;
  dot: string;
  dotMajor: string;
  gateFill: string;
  gateStroke: string;
  pinIn: string;
  pinOut: string;
  accent: string;
  wireHigh: string;
  wireUndef: string;
  muted: string;
  origin: string;
  font: string;
}

export interface Frame {
  viewport: Viewport;
  size: Size;
  dpr: number;
  theme: Theme;
  gates: GateInstance[];
  wires: Wire[];
  selected: ReadonlySet<string>;
  selectedWires: ReadonlySet<string>;
  draft: WireDraft | null;
  hoverPin: PinRef | null;
  sim: SimResult;
  /** Export mode: no grid, selection or hover marks */
  bare?: boolean;
}

/** Read colours from the CSS tokens in globals.css so canvas and UI share one palette. */
export function readTheme(): Theme {
  const css = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: get('--color-bg', '#000000'),
    dot: get('--color-border', '#262629'),
    dotMajor: get('--color-muted', '#8e8e93'),
    gateFill: get('--color-panel', '#141416'),
    gateStroke: get('--color-fg', '#f5f5f7'),
    pinIn: get('--color-pin-in', '#4da3ff'),
    pinOut: get('--color-pin-out', '#ff5577'),
    accent: get('--color-accent', '#ffffff'),
    wireHigh: get('--color-wire-high', '#00ff88'),
    wireUndef: get('--color-wire-undef', '#ff8800'),
    muted: get('--color-muted', '#8e8e93'),
    origin: get('--color-origin', '#ff453a'),
    font: getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif',
  };
}

type Ctx = CanvasRenderingContext2D;
type Level = (key: string, target: number) => { v: number; vel: number };
type Flow = (key: string, target: number, length: number) => number;

/** Everything is placed in whole device pixels, so the grid and the gates never land between pixels. */
interface View { ox: number; oy: number; scale: number; dpr: number; zoom: number; w: number; h: number }

const worldSpace = (ctx: Ctx, v: View) => ctx.setTransform(v.scale, 0, 0, v.scale, v.ox, v.oy);
const deviceSpace = (ctx: Ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);
/** A line width that is a whole, even number of device pixels, so edges stay sharp. */
const crisp = (v: View, css: number) => Math.max(2, 2 * Math.round((css * v.dpr) / 2)) / v.scale;

const levels = new Map<string, { v: number; vel: number }>(); // spring-animated 0..1 values (wire brightness, switch position)
const SPRING_K = 420;
const SPRING_C = 2 * Math.sqrt(SPRING_K); // critically damped: no overshoot
const flows = new Map<string, number>(); // 0..1: how much of each wire is lit, measured from its source
const FLOW_SPEED = 1400; // world units per second: a signal crosses a typical wire in about a fifth of a second
let lastTime = 0;

/** Draws one frame. Returns true while something is still animating, so the caller keeps drawing. */
export function render(ctx: Ctx, frame: Frame): boolean {
  const { viewport: v, size, dpr, theme } = frame;
  const now = performance.now();
  const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
  lastTime = now;

  const view: View = {
    ox: Math.round(v.x * dpr),
    oy: Math.round(v.y * dpr),
    scale: dpr * v.zoom,
    dpr,
    zoom: v.zoom,
    w: Math.ceil(size.w * dpr),
    h: Math.ceil(size.h * dpr),
  };

  const seen = new Set<string>();
  let moving = false;
  const level: Level = (key, target) => {
    seen.add(key);
    const s = levels.get(key) ?? { v: target, vel: 0 };
    // Spring toward the target. Velocity carries over if the target changes mid-flight, so it never jumps.
    const steps = Math.max(1, Math.ceil(dt * 120));
    for (let i = 0; i < steps; i++) {
      s.vel += (-SPRING_K * (s.v - target) - SPRING_C * s.vel) * (dt / steps);
      s.v += s.vel * (dt / steps);
    }
    if (Math.abs(s.v - target) < 0.002 && Math.abs(s.vel) < 0.02) {
      s.v = target;
      s.vel = 0;
    } else moving = true;
    levels.set(key, s);
    return s;
  };

  // Linear, not eased: the lit part advances at a constant speed, and recedes the same way when the wire turns off.
  const flow: Flow = (key, target, length) => {
    seen.add(key);
    const cur = flows.get(key) ?? target;
    const step = dt / Math.min(0.45, Math.max(0.12, length / FLOW_SPEED));
    const next = cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step);
    if (next !== target) moving = true;
    flows.set(key, next);
    return next;
  };

  deviceSpace(ctx);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, view.w, view.h);
  if (!frame.bare) drawBackdrop(ctx, view, theme);

  worldSpace(ctx, view);
  drawWires(ctx, view, frame, flow);
  drawGates(ctx, view, frame, level);
  drawDraft(ctx, view, frame);
  deviceSpace(ctx);

  for (const key of levels.keys()) if (!seen.has(key)) levels.delete(key);
  for (const key of flows.keys()) if (!seen.has(key)) flows.delete(key);
  return moving;
}

function drawBackdrop(ctx: Ctx, v: View, theme: Theme): void {
  // Zoomed out far enough that dots would crowd? Double the world spacing.
  let step = GRID_SIZE;
  while (step * v.scale < 12 * v.dpr) step *= 2;

  const minorSize = Math.max(1, Math.round(1.5 * v.dpr));
  const majorSize = Math.max(2, Math.round(2.5 * v.dpr));
  const x1 = (v.w - v.ox) / v.scale;
  const y1 = (v.h - v.oy) / v.scale;
  const minor = new Path2D();
  const major = new Path2D();

  for (let x = Math.floor(-v.ox / v.scale / step) * step; x <= x1; x += step) {
    for (let y = Math.floor(-v.oy / v.scale / step) * step; y <= y1; y += step) {
      const isMajor = x % (step * 5) === 0 && y % (step * 5) === 0;
      const s = isMajor ? majorSize : minorSize;
      (isMajor ? major : minor).rect(
        Math.round(v.ox + x * v.scale) - (s >> 1),
        Math.round(v.oy + y * v.scale) - (s >> 1),
        s,
        s,
      );
    }
  }
  ctx.fillStyle = theme.dot;
  ctx.fill(minor);
  ctx.fillStyle = theme.dotMajor;
  ctx.fill(major);

  // Edge of the workspace
  ctx.strokeStyle = theme.dotMajor;
  ctx.lineWidth = 1;
  ctx.strokeRect(
    Math.round(v.ox + WORLD_BOUNDS.x * v.scale) + 0.5,
    Math.round(v.oy + WORLD_BOUNDS.y * v.scale) + 0.5,
    Math.round(WORLD_BOUNDS.w * v.scale),
    Math.round(WORLD_BOUNDS.h * v.scale),
  );

  // The origin: a red dot, bigger than the grid dots
  const r = 3 * v.dpr;
  if (v.ox > -r && v.ox < v.w + r && v.oy > -r && v.oy < v.h + r) {
    ctx.fillStyle = theme.origin;
    ctx.beginPath();
    ctx.arc(v.ox, v.oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Polyline with rounded corners. */
function tracePath(points: Point[]): Path2D {
  const path = new Path2D();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    path.arcTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, 8);
  }
  const end = points[points.length - 1];
  path.lineTo(end.x, end.y);
  return path;
}

function wireLength(points: Point[]): number {
  let len = 0;
  let corners = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) !== 0) corners++;
  }
  return Math.max(1, len - corners * 3.43); // a rounded corner is a little shorter than a square one
}

function drawWires(ctx: Ctx, v: View, { theme, wires, selectedWires, sim }: Frame, flow: Flow): void {
  const width = crisp(v, Math.max(1.25, 2 * v.zoom));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const wire of wires) {
    if (wire.points.length < 2) continue;
    const state = sim.wireStates[wire.id] ?? wire.state;
    const length = wireLength(wire.points);
    const lit = flow(`w${wire.id}`, state === 1 ? 1 : 0, length);
    const color = WIRE_COLORS[wire.colorIndex % WIRE_COLORS.length];
    const path = tracePath(wire.points);
    ctx.setLineDash([]);

    if (selectedWires.has(wire.id)) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = width + crisp(v, 5);
      ctx.stroke(path);
    }
    // The wire's own colour tells wires apart. Dim = LOW, glowing = HIGH, dashed orange = undefined.
    ctx.lineWidth = width;
    ctx.strokeStyle = state === 'X' ? theme.wireUndef : color;
    ctx.globalAlpha = state === 'X' ? 0.9 : 0.35;
    ctx.setLineDash(state === 'X' ? [8, 6] : []);
    ctx.stroke(path);
    if (state !== 'X' && lit > 0.001) {
      // The lit stretch starts at the output pin and grows toward the input pin.
      ctx.globalAlpha = 1;
      ctx.setLineDash(lit >= 0.999 ? [] : [lit * length, length * 3]);
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke(path);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
  ctx.setLineDash([]);
}

const pinDot = (ctx: Ctx, x: number, y: number) => {
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
};

function ring(ctx: Ctx, color: string, width: number, inset: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.roundRect(-LEAD - inset, -inset, GATE_W + 2 * LEAD + 2 * inset, GATE_H + 2 * inset, 12);
  ctx.stroke();
}

/** Small label (A, B, Y, 2 Hz) above a gate, in the free band over the body. */
function drawName(ctx: Ctx, theme: Theme, name: string | undefined): void {
  if (!name) return;
  ctx.font = `600 13px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.muted;
  ctx.fillText(name, 40, 9);
}

/** INPUT: a toggle switch. The track turns green and the knob slides when it is on. */
function drawSwitch(ctx: Ctx, theme: Theme, sw: { v: number; vel: number }, lw: number, name: string | undefined): void {
  const on = Math.min(1, Math.max(0, sw.v));
  const p = getPaths('INPUT');
  ctx.fillStyle = theme.gateFill;
  ctx.fill(p.body);
  ctx.globalAlpha = 0.85 * on;
  ctx.fillStyle = theme.wireHigh;
  ctx.fill(p.body);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.gateStroke;
  ctx.lineWidth = lw;
  ctx.stroke(p.body);
  ctx.stroke(p.leads);
  if (on > 0.05) {
    ctx.shadowColor = theme.wireHigh;
    ctx.shadowBlur = 14 * on;
  }
  // The knob stretches in the direction it is travelling, like a physical slider.
  const stretch = Math.min(1, Math.abs(sw.vel) / 4) * 9;
  const left = Math.max(5, 5 + 40 * on - (sw.vel < 0 ? stretch : 0));
  const right = Math.min(75, 35 + 40 * on + (sw.vel > 0 ? stretch : 0));
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(left, 25, right - left, 30, 15);
  ctx.fill();
  ctx.shadowBlur = 0;
  drawName(ctx, theme, name);
}

/** OUTPUT: shows the value arriving at its pin. */
function drawReadout(ctx: Ctx, theme: Theme, value: PinState, lw: number, name: string | undefined): void {
  const p = getPaths('OUTPUT');
  ctx.fillStyle = theme.gateFill;
  ctx.fill(p.body);
  ctx.strokeStyle = theme.gateStroke;
  ctx.lineWidth = lw;
  ctx.stroke(p.body);
  ctx.stroke(p.leads);
  ctx.font = `700 26px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = value === 1 ? theme.wireHigh : value === 0 ? theme.muted : theme.wireUndef;
  if (value === 1) {
    ctx.shadowColor = theme.wireHigh;
    ctx.shadowBlur = 12;
  }
  ctx.fillText(String(value), 40, 41);
  ctx.shadowBlur = 0;
  drawName(ctx, theme, name);
}

/** CLOCK: a square wave that lights up while the clock is high. */
function drawClock(ctx: Ctx, theme: Theme, high: boolean, hz: number, lw: number): void {
  const p = getPaths('CLOCK');
  ctx.fillStyle = theme.gateFill;
  ctx.fill(p.body);
  ctx.strokeStyle = high ? theme.wireHigh : theme.gateStroke;
  ctx.lineWidth = lw;
  if (high) {
    ctx.shadowColor = theme.wireHigh;
    ctx.shadowBlur = 10;
  }
  ctx.stroke(p.body);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = theme.gateStroke;
  ctx.stroke(p.leads);
  ctx.strokeStyle = high ? theme.wireHigh : theme.muted;
  if (p.extra) ctx.stroke(p.extra);
  drawName(ctx, theme, `${hz} Hz`);
}

/** LED: glows green when its input is 1. */
function drawLed(ctx: Ctx, theme: Theme, on: number, lw: number): void {
  const p = getPaths('LED');
  ctx.fillStyle = theme.gateFill;
  ctx.fill(p.body);
  if (on > 0.02) {
    ctx.globalAlpha = 0.9 * Math.min(1, on);
    ctx.shadowColor = theme.wireHigh;
    ctx.shadowBlur = 22 * Math.min(1, on);
    ctx.fillStyle = theme.wireHigh;
    ctx.fill(p.body);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = theme.gateStroke;
  ctx.lineWidth = lw;
  ctx.stroke(p.body);
  ctx.stroke(p.leads);
}

/** Latches and flip-flops: a labelled chip whose outline lights up while Q is 1. */
function drawChip(ctx: Ctx, theme: Theme, type: BasicGateType, q: PinState | undefined, lw: number): void {
  const p = getPaths(type);
  const ports = PORTS[type];
  ctx.fillStyle = theme.gateFill;
  ctx.fill(p.body);
  ctx.lineWidth = lw;
  ctx.strokeStyle = q === 1 ? theme.wireHigh : theme.gateStroke;
  if (q === 1) {
    ctx.shadowColor = theme.wireHigh;
    ctx.shadowBlur = 8;
  }
  ctx.stroke(p.body);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = theme.gateStroke;
  ctx.stroke(p.leads);
  if (p.extra) ctx.stroke(p.extra);
  if (!ports) return;

  ctx.font = `600 13px ${theme.font}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.muted;
  ctx.textAlign = 'left';
  inputPins(type).forEach((pin, i) => {
    if (ports.inputs[i] !== '>') ctx.fillText(ports.inputs[i], 9, pin.y);
  });
  ctx.textAlign = 'right';
  outputPins(type).forEach((pin, i) => {
    const text = ports.outputs[i];
    const bar = text.startsWith('~');
    const label = bar ? text.slice(1) : text;
    ctx.fillText(label, 71, pin.y);
    if (bar) {
      const w = ctx.measureText(label).width;
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(71 - w, pin.y - 9);
      ctx.lineTo(71, pin.y - 9);
      ctx.stroke();
    }
  });
  ctx.fillStyle = theme.gateStroke;
  ctx.textAlign = 'center';
  ctx.font = `700 20px ${theme.font}`;
  ctx.fillText(ports.title, 40, 41);
}

function drawGates(ctx: Ctx, v: View, { theme, gates, selected, hoverPin, sim, bare }: Frame, level: Level): void {
  const lw = crisp(v, Math.max(1.25, 2 * v.zoom));
  const loop = new Set(sim.cycleGateIds);
  const names = ioNames(gates);

  for (const g of gates) {
    const outs = sim.gateOutputs[g.id];
    const ins = sim.gateInputs[g.id];
    ctx.save();
    ctx.translate(g.x, g.y);

    switch (g.type) {
      case 'INPUT':
        drawSwitch(ctx, theme, level(`i${g.id}`, g.outputStates[0] === 1 ? 1 : 0), lw, names[g.id]);
        break;
      case 'OUTPUT':
        drawReadout(ctx, theme, ins?.[0] ?? 'X', lw, names[g.id]);
        break;
      case 'CLOCK':
        drawClock(ctx, theme, outs?.[0] === 1, g.hz ?? 1, lw);
        break;
      case 'LED':
        drawLed(ctx, theme, level(`l${g.id}`, ins?.[0] === 1 ? 1 : 0).v, lw);
        break;
      case 'SR_LATCH':
      case 'D_FF':
      case 'JK_FF':
      case 'T_FF':
        drawChip(ctx, theme, g.type, outs?.[0], lw);
        break;
      default:
        drawGate(ctx, g.type, theme.gateFill, theme.gateStroke, lw);
    }

    ctx.fillStyle = theme.pinIn;
    for (const p of inputPins(g.type)) pinDot(ctx, p.x, p.y);
    ctx.fillStyle = theme.pinOut;
    for (const p of outputPins(g.type)) pinDot(ctx, p.x, p.y);

    if (!bare) {
      if (hoverPin?.gateId === g.id) {
        const hp = (hoverPin.kind === 'output' ? outputPins(g.type) : inputPins(g.type))[hoverPin.index];
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = crisp(v, 1.5);
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (loop.has(g.id)) ring(ctx, theme.wireUndef, crisp(v, 1.5), 14);
      if (selected.has(g.id)) ring(ctx, theme.accent, crisp(v, 1.5), 8);
    }
    ctx.restore();
  }
}

/** The wire you are drawing: dashed, snapping to a valid pin when you hover one. */
function drawDraft(ctx: Ctx, v: View, { theme, gates, draft, hoverPin }: Frame): void {
  if (!draft) return;
  const from = gates.find((g) => g.id === draft.from.gateId);
  if (!from) return;
  const start = pinPosition(from, draft.from.kind, draft.from.index);
  const target = hoverPin ? gates.find((g) => g.id === hoverPin.gateId) : undefined;
  const end = target && hoverPin ? pinPosition(target, hoverPin.kind, hoverPin.index) : snapPoint(draft.cursor);
  const points = draft.from.kind === 'output' ? routeWire(start, end) : routeWire(end, start);

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = crisp(v, Math.max(1.25, 2 * v.zoom));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([8, 6]);
  ctx.stroke(tracePath(points));
  ctx.setLineDash([]);
}
