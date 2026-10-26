import { create } from 'zustand';
import { snapPoint } from '../canvas/grid';
import type { Point } from '../canvas/grid';
import { clampToWorld } from '../canvas/hitTest';
import { pinPosition, routeWire } from '../canvas/wireRouting';
import { GATE_DEFS } from '../engine/gates';
import type { BasicGateType, GateInstance, PinState } from '../types/gate';
import { WIRE_COLORS } from '../types/wire';
import type { PinRef, Wire } from '../types/wire';

export interface Snapshot { gates: GateInstance[]; wires: Wire[] }

interface CircuitState {
  gates: GateInstance[];
  wires: Wire[];
  addGate: (type: BasicGateType, at: Point) => string;
  moveGates: (positions: Record<string, Point>) => void;
  removeGates: (ids: string[]) => void;
  /** Connect an output pin to an input pin (either order). Returns null if the connection isn't allowed. */
  addWire: (a: PinRef, b: PinRef) => string | null;
  removeWires: (ids: string[]) => void;
  recolorWires: (ids: string[]) => void;
  toggleInput: (id: string) => void; // flip an INPUT switch
  setInputs: (values: Record<string, 0 | 1>) => void;
  setClockHz: (id: string, hz: number) => void;
  duplicate: (ids: string[], dx: number, dy: number) => string[]; // copies gates and the wires between them
  load: (gates: GateInstance[], wires: Wire[]) => void; // replace the whole circuit
  snapshot: () => Snapshot;
  restore: (s: Snapshot) => void; // undo / redo
  clear: () => void;
}

const zeros = (n: number): PinState[] => Array.from({ length: n }, (): PinState => 0);

/** The least-used wire colour, so neighbouring wires rarely share one. */
function nextColor(wires: Wire[]): number {
  const counts = WIRE_COLORS.map(() => 0);
  for (const w of wires) counts[w.colorIndex % WIRE_COLORS.length]++;
  return counts.indexOf(Math.min(...counts));
}

/** Recompute a wire's route from its pins' current positions. */
function routed(w: Wire, gates: GateInstance[]): Wire {
  const from = gates.find((g) => g.id === w.fromGateId);
  const to = gates.find((g) => g.id === w.toGateId);
  if (!from || !to) return w;
  return { ...w, points: routeWire(pinPosition(from, 'output', w.fromPinIndex), pinPosition(to, 'input', w.toPinIndex)) };
}

/** The circuit. All mutations go through here; undo/redo wraps them in commands (see historyStore). */
export const useCircuitStore = create<CircuitState>()((set, get) => ({
  gates: [],
  wires: [],

  addGate: (type, at) => {
    const id = crypto.randomUUID();
    const def = GATE_DEFS[type];
    const gate: GateInstance = {
      id, type, label: def.label, x: at.x, y: at.y, rotation: 0,
      inputStates: zeros(def.inputCount), outputStates: zeros(def.outputCount),
      ...(type === 'CLOCK' ? { hz: 1 } : {}),
    };
    set((s) => ({ gates: [...s.gates, gate] }));
    return id;
  },

  moveGates: (positions) =>
    set((s) => {
      const gates = s.gates.map((g) => (positions[g.id] ? { ...g, ...positions[g.id] } : g));
      const wires = s.wires.map((w) => (positions[w.fromGateId] || positions[w.toGateId] ? routed(w, gates) : w));
      return { gates, wires };
    }),

  removeGates: (ids) =>
    set((s) => ({
      gates: s.gates.filter((g) => !ids.includes(g.id)),
      wires: s.wires.filter((w) => !ids.includes(w.fromGateId) && !ids.includes(w.toGateId)),
    })),

  addWire: (a, b) => {
    const [out, inp] = a.kind === 'output' ? [a, b] : [b, a];
    if (out.kind !== 'output' || inp.kind !== 'input' || out.gateId === inp.gateId) return null;
    const id = crypto.randomUUID();
    set((s) => {
      // An input takes one wire: connecting to a used input replaces the old wire.
      const kept = s.wires.filter((w) => !(w.toGateId === inp.gateId && w.toPinIndex === inp.index));
      const wire = routed(
        { id, fromGateId: out.gateId, fromPinIndex: out.index, toGateId: inp.gateId, toPinIndex: inp.index, points: [], state: 0, colorIndex: nextColor(s.wires) },
        s.gates,
      );
      return { wires: [...kept, wire] };
    });
    return id;
  },

  removeWires: (ids) => set((s) => ({ wires: s.wires.filter((w) => !ids.includes(w.id)) })),

  recolorWires: (ids) =>
    set((s) => ({
      wires: s.wires.map((w) => (ids.includes(w.id) ? { ...w, colorIndex: (w.colorIndex + 1) % WIRE_COLORS.length } : w)),
    })),

  setInputs: (values) =>
    set((s) => ({
      gates: s.gates.map((g) => (g.type === 'INPUT' && g.id in values ? { ...g, outputStates: [values[g.id]] } : g)),
    })),

  toggleInput: (id) =>
    set((s) => ({
      gates: s.gates.map((g) =>
        g.id === id && g.type === 'INPUT' ? { ...g, outputStates: [g.outputStates[0] === 1 ? 0 : 1] } : g,
      ),
    })),

  setClockHz: (id, hz) =>
    set((s) => ({ gates: s.gates.map((g) => (g.id === id && g.type === 'CLOCK' ? { ...g, hz } : g)) })),

  duplicate: (ids, dx, dy) => {
    const created: string[] = [];
    set((s) => {
      const map = new Map<string, string>();
      const copies = s.gates
        .filter((g) => ids.includes(g.id))
        .map((g) => {
          const id = crypto.randomUUID();
          map.set(g.id, id);
          created.push(id);
          return { ...g, id, x: g.x + dx, y: g.y + dy };
        });
      const all = [...s.gates, ...copies];
      const wires = s.wires
        .filter((w) => map.has(w.fromGateId) && map.has(w.toGateId))
        .map((w) => routed({ ...w, id: crypto.randomUUID(), fromGateId: map.get(w.fromGateId) as string, toGateId: map.get(w.toGateId) as string }, all));
      return { gates: all, wires: [...s.wires, ...wires] };
    });
    return created;
  },

  load: (gates, wires) =>
    set(() => {
      const placed = gates.map((g) => ({ ...g, ...clampToWorld(snapPoint(g)) }));
      return { gates: placed, wires: wires.map((w) => routed(w, placed)) };
    }),

  snapshot: () => ({ gates: get().gates, wires: get().wires }),

  restore: (snap) =>
    set((s) => {
      // Switch positions are operation, not editing: undo keeps them as they are now.
      const live = new Map(s.gates.map((g) => [g.id, g]));
      const gates = snap.gates.map((g) => {
        const cur = live.get(g.id);
        return g.type === 'INPUT' && cur ? { ...g, outputStates: cur.outputStates } : g;
      });
      return { gates, wires: snap.wires };
    }),

  clear: () => set({ gates: [], wires: [] }),
}));
