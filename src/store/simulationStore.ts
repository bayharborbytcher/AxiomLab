import { create } from 'zustand';
import { advance, emptySeq } from '../engine/evaluator';
import type { SeqState, SimResult } from '../engine/evaluator';
import { useCircuitStore } from './circuitStore';

interface SimState extends SimResult {
  seq: SeqState; // flip-flop memory
  clocks: Record<string, 0 | 1>; // current level of each CLOCK gate
  running: boolean;
  recompute: () => void;
  flipClocks: (ids: string[]) => void;
  stepClocks: () => void; // flip every clock once: half a cycle
  setRunning: (on: boolean) => void;
}

const EMPTY: SimResult = { wireStates: {}, gateInputs: {}, gateOutputs: {}, cycleGateIds: [] };

/** Live results of the last evaluation. The circuit itself never stores computed values. */
export const useSimulationStore = create<SimState>()((set, get) => ({
  ...EMPTY,
  seq: emptySeq(),
  clocks: {},
  running: false,

  recompute: () => {
    const { gates, wires } = useCircuitStore.getState();
    const live = new Set(gates.filter((g) => g.type === 'CLOCK').map((g) => g.id));
    const kept = Object.fromEntries(Object.entries(get().clocks).filter(([id]) => live.has(id))) as Record<string, 0 | 1>;
    const out = advance(gates, wires, get().seq, kept);
    set({ ...out.result, seq: out.seq, clocks: kept });
  },

  flipClocks: (ids) => {
    set((s) => ({
      clocks: { ...s.clocks, ...Object.fromEntries(ids.map((id): [string, 0 | 1] => [id, s.clocks[id] === 1 ? 0 : 1])) },
    }));
    get().recompute();
  },

  stepClocks: () =>
    get().flipClocks(useCircuitStore.getState().gates.filter((g) => g.type === 'CLOCK').map((g) => g.id)),

  setRunning: (running) => set({ running }),
}));
