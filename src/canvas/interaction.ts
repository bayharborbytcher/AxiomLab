import { useCircuitStore } from '../store/circuitStore';
import { useSelectionStore } from '../store/selectionStore';
import { record, track } from '../store/historyStore';
import { useSimulationStore } from '../store/simulationStore';
import { useUIStore } from '../store/uiStore';
import type { ContextTarget } from '../store/uiStore';
import type { Snapshot } from '../store/circuitStore';
import type { BasicGateType } from '../types/gate';
import { panBy, zoomAround } from './camera';
import { GATE_H, GATE_W } from './gateShapes';
import { screenToWorld, snap, snapPoint } from './grid';
import type { Point } from './grid';
import { collides, gateAt, inWorld, nearestFreeSpot, pinAt, wireAt } from './hitTest';
import type { PinRef } from '../types/wire';

const samePin = (a: PinRef | null, b: PinRef | null): boolean =>
  a === b || (!!a && !!b && a.gateId === b.gateId && a.kind === b.kind && a.index === b.index);

export function isTyping(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLElement &&
    (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
  );
}

interface GateDrag {
  start: Point; // world position where the drag began
  origins: Record<string, Point>; // each moving gate's position at drag start
  dx: number;
  dy: number;
  before: Snapshot; // circuit before the drag, for undo
}

const MOVE_GRAB_PAD = 20; // extra reach (world units) while holding M

/** Pointer, wheel and keyboard handling for the canvas. */
export class Interaction {
  private readonly canvas: HTMLCanvasElement;
  private hovering = false;
  private hoverGate = false;
  private spaceDown = false;
  private moveKey = false; // hold M to grab gates with a forgiving hit area
  private panning = false;
  private drag: GateDrag | null = null;
  private pressingPin = false; // pointer is held down on the pin a wire started from
  private wireMoved = false; // ...and has travelled far enough to count as a drag
  private toggleId: string | null = null; // INPUT switch pressed, toggled on release if it didn't move
  private hoverWire = false; // pointer is over a pin, or a wire is being drawn
  private hoverSwitch = false; // Operate mode: pointer is over an input switch
  private last = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('pointerenter', this.onEnter);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    window.addEventListener('blur', this.onBlur);
  }

  destroy(): void {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointercancel', this.onPointerUp);
    c.removeEventListener('pointerenter', this.onEnter);
    c.removeEventListener('pointerleave', this.onLeave);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    window.removeEventListener('blur', this.onBlur);
  }

  private world(e: { clientX: number; clientY: number }): Point {
    const r = this.canvas.getBoundingClientRect();
    return screenToWorld({ x: e.clientX - r.left, y: e.clientY - r.top }, useUIStore.getState().viewport);
  }

  private updateCursor(): void {
    const busy = this.panning || this.drag !== null;
    const armed = this.spaceDown || this.moveKey;
    const c = this.canvas.classList;
    c.toggle('cursor-panning', busy);
    c.toggle('cursor-pan', armed && !busy);
    c.toggle('cursor-pointer', this.hoverSwitch && !armed && !busy);
    c.toggle('cursor-wire', this.hoverWire && !armed && !busy);
    c.toggle('cursor-move', this.hoverGate && !this.hoverWire && !armed && !busy);
  }

  private pinRadius(): number {
    return Math.max(12, 10 / useUIStore.getState().viewport.zoom);
  }

  /** Pin under `p`: any pin when idle; while drawing, only an opposite-kind pin on another gate. */
  private pinFor(p: Point): PinRef | null {
    const hit = pinAt(p, useCircuitStore.getState().gates, this.pinRadius());
    const draft = useUIStore.getState().wireDraft;
    if (!hit || !draft) return hit;
    return hit.kind !== draft.from.kind && hit.gateId !== draft.from.gateId ? hit : null;
  }

  private finishWire(to: PinRef): void {
    const { wireDraft, setWireDraft } = useUIStore.getState();
    if (wireDraft) track('Connect', () => useCircuitStore.getState().addWire(wireDraft.from, to));
    setWireDraft(null);
  }

  private onEnter = () => { this.hovering = true; };
  private onLeave = () => { this.hovering = false; };

  private onBlur = () => {
    this.spaceDown = this.moveKey = this.panning = false;
    this.drag = null;
    this.updateCursor();
  };

  private onKey = (e: KeyboardEvent) => {
    if (isTyping(e.target)) return;
    const down = e.type === 'keydown';
    if (e.code === 'Space') {
      this.spaceDown = down;
      if (this.hovering || this.panning) e.preventDefault(); // stop page scroll / button click
    } else if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) {
      this.moveKey = down;
    } else return;
    this.updateCursor();
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && this.spaceDown)) {
      e.preventDefault();
      this.panning = true;
      this.last = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture(e.pointerId);
      this.updateCursor();
      return;
    }
    if (e.button !== 0) return;

    const p = this.world(e);
    const ui = useUIStore.getState();
    const { gates, wires } = useCircuitStore.getState();

    if (ui.mode === 'operate') {
      // Operate mode: a click only flips an input switch, instantly on press.
      const sw = gateAt(p, gates);
      const onBody = sw !== null && p.y >= sw.y + 20 && p.y <= sw.y + 60;
      if (sw?.type === 'INPUT' && onBody) useCircuitStore.getState().toggleInput(sw.id);
      else if (sw?.type === 'CLOCK' && onBody && !useSimulationStore.getState().running) {
        useSimulationStore.getState().flipClocks([sw.id]); // a stopped clock can be flipped by hand
      }
      return;
    }
    const sel = useSelectionStore.getState();

    if (ui.wireDraft) {
      // Click-to-connect: this click either lands on a valid pin (done) or cancels the wire.
      const target = this.pinFor(p);
      if (target) this.finishWire(target);
      else ui.setWireDraft(null);
      ui.setHoverPin(null);
      if (target) return;
    }

    if (!this.moveKey) {
      const pin = pinAt(p, gates, this.pinRadius());
      if (pin) {
        ui.setWireDraft({ from: pin, cursor: p });
        this.pressingPin = true;
        this.wireMoved = false;
        this.last = { x: e.clientX, y: e.clientY };
        this.canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    const hit = gateAt(p, gates, this.moveKey ? MOVE_GRAB_PAD : 0);
    if (!hit) {
      const wire = wireAt(p, wires, Math.max(6, 8 / ui.viewport.zoom));
      if (wire) sel.select([], [wire.id]);
      else if (!e.shiftKey) sel.clear();
      return;
    }
    if (e.shiftKey) {
      sel.toggleGate(hit.id);
      return;
    }
    if (!sel.gateIds.includes(hit.id)) sel.select([hit.id]);

    const ids = useSelectionStore.getState().gateIds;
    const origins: Record<string, Point> = {};
    for (const g of gates) if (ids.includes(g.id)) origins[g.id] = { x: g.x, y: g.y };
    this.drag = { start: p, origins, dx: 0, dy: 0, before: useCircuitStore.getState().snapshot() };
    this.toggleId = hit.type === 'INPUT' && p.y >= hit.y + 20 && p.y <= hit.y + 60 ? hit.id : null;
    this.canvas.setPointerCapture(e.pointerId);
    this.updateCursor();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.panning) {
      const { viewport: v, setViewport } = useUIStore.getState();
      setViewport({ ...v, x: v.x + e.clientX - this.last.x, y: v.y + e.clientY - this.last.y });
      this.last = { x: e.clientX, y: e.clientY };
    } else if (this.drag) {
      const d = this.drag;
      const p = this.world(e);
      const wantX = snap(p.x - d.start.x);
      const wantY = snap(p.y - d.start.y);
      if (wantX === d.dx && wantY === d.dy) return;
      // Gates never overlap: try the full move, then each axis alone (so you slide along an obstacle), else stay put.
      const { gates } = useCircuitStore.getState();
      const moving = Object.keys(d.origins);
      const free = (dx: number, dy: number) =>
        Object.values(d.origins).every((o) => inWorld(o.x + dx, o.y + dy) && !collides(o.x + dx, o.y + dy, gates, moving));
      const spot = [[wantX, wantY], [wantX, d.dy], [d.dx, wantY]].find(([dx, dy]) => free(dx, dy));
      if (!spot || (spot[0] === d.dx && spot[1] === d.dy)) return;
      d.dx = spot[0];
      d.dy = spot[1];
      const next: Record<string, Point> = {};
      for (const [id, o] of Object.entries(d.origins)) next[id] = { x: o.x + d.dx, y: o.y + d.dy };
      useCircuitStore.getState().moveGates(next);
    } else {
      const ui = useUIStore.getState();
      const p = this.world(e);
      if (ui.mode === 'operate') {
        const gate = gateAt(p, useCircuitStore.getState().gates);
        const over = (gate?.type === 'INPUT' || gate?.type === 'CLOCK') && p.y >= gate.y + 20 && p.y <= gate.y + 60;
        if (over !== this.hoverSwitch) {
          this.hoverSwitch = over;
          this.updateCursor();
        }
        return;
      }
      const draft = ui.wireDraft;
      const pin = this.pinFor(p);
      if (!samePin(pin, ui.hoverPin)) ui.setHoverPin(pin);
      if (draft) {
        if (this.pressingPin && Math.hypot(e.clientX - this.last.x, e.clientY - this.last.y) > 5) this.wireMoved = true;
        ui.setWireDraft({ from: draft.from, cursor: p });
      }
      const over = !draft && !pin && gateAt(p, useCircuitStore.getState().gates) !== null;
      const onWire = pin !== null || draft !== null;
      if (over !== this.hoverGate || onWire !== this.hoverWire) {
        this.hoverGate = over;
        this.hoverWire = onWire;
        this.updateCursor();
      }
    }
  };

  private onPointerUp = () => {
    if (this.pressingPin) {
      this.pressingPin = false;
      if (this.wireMoved) {
        // Dragged out of a pin: connect if released on a valid pin, otherwise drop the wire.
        const ui = useUIStore.getState();
        if (ui.hoverPin) this.finishWire(ui.hoverPin);
        else ui.setWireDraft(null);
        ui.setHoverPin(null);
      } // plain click: the wire stays attached to the pointer until the next click
    }
    if (this.toggleId && this.drag && this.drag.dx === 0 && this.drag.dy === 0) {
      useCircuitStore.getState().toggleInput(this.toggleId); // a click on a switch flips it
    }
    if (this.drag && (this.drag.dx !== 0 || this.drag.dy !== 0)) {
      record('Move', this.drag.before, useCircuitStore.getState().snapshot());
    }
    this.toggleId = null;
    this.panning = false;
    this.drag = null;
    this.updateCursor();
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const p = this.world(e);
    const ui = useUIStore.getState();
    const { gates, wires } = useCircuitStore.getState();
    const sel = useSelectionStore.getState();
    const editing = ui.mode === 'edit';
    const gate = gateAt(p, gates);
    const wire = !gate && editing ? wireAt(p, wires, Math.max(6, 8 / ui.viewport.zoom)) : null;
    let target: ContextTarget = { kind: 'canvas' };
    if (gate) {
      target = { kind: 'gate', id: gate.id };
      if (editing && !sel.gateIds.includes(gate.id)) sel.select([gate.id]);
    } else if (wire) {
      target = { kind: 'wire', id: wire.id };
      sel.select([], [wire.id]);
    }
    ui.setWireDraft(null);
    ui.setHoverPin(null);
    ui.setContextMenu({ x: e.clientX, y: e.clientY, target });
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault(); // also stops the browser's own Ctrl+scroll page zoom
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1; // Firefox reports lines
    if (e.ctrlKey || e.metaKey) {
      const r = this.canvas.getBoundingClientRect();
      zoomAround({ x: e.clientX - r.left, y: e.clientY - r.top }, Math.exp(-e.deltaY * k * 0.0015));
    } else {
      panBy(e.deltaX * k, e.deltaY * k); // plain scroll / trackpad swipe pans
    }
  };
}

/**
 * Drag a gate out of the sidebar. A ghost follows the pointer (see DragGhost);
 * releasing over the canvas drops the gate, centred on the pointer and snapped to the grid.
 */
export function beginPaletteDrag(type: BasicGateType, startX: number, startY: number): void {
  if (useUIStore.getState().mode !== 'edit') return; // Operate mode: no adding gates
  const { setPaletteDrag } = useUIStore.getState();
  let moved = false;

  const finish = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', finish);
    setPaletteDrag(null);
  };

  const onMove = (e: PointerEvent) => {
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 4) return; // ignore plain clicks
    moved = true;
    setPaletteDrag({ type, x: e.clientX, y: e.clientY });
  };

  const onUp = (e: PointerEvent) => {
    finish();
    const canvas = document.querySelector('canvas');
    if (!moved || !canvas) return;
    const r = canvas.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) return;
    const { viewport } = useUIStore.getState();
    const w = screenToWorld({ x: e.clientX - r.left, y: e.clientY - r.top }, viewport);
    const spot = snapPoint({ x: w.x - GATE_W / 2, y: w.y - GATE_H / 2 });
    // Never stack gates: if the drop spot is taken, use the nearest free one.
    const free = nearestFreeSpot(spot, useCircuitStore.getState().gates);
    const id = track('Add gate', () => useCircuitStore.getState().addGate(type, free));
    useSelectionStore.getState().select([id]); // the new gate is selected, ready to nudge or delete
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', finish);
}
