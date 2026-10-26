import type { GateInstance, PinState } from '../types/gate';
import type { Wire } from '../types/wire';
import { GATE_DEFS, not } from './gates';

export interface SimResult {
  wireStates: Record<string, PinState>;
  gateInputs: Record<string, PinState[]>;
  gateOutputs: Record<string, PinState[]>;
  /** Gates on a feedback loop. Their outputs (and everything they feed) are undefined. */
  cycleGateIds: string[];
}

/** What flip-flops and latches remember: stored Q, and the last clock level seen (for edge detection). */
export interface SeqState { q: Record<string, PinState>; clk: Record<string, PinState> }
export const emptySeq = (): SeqState => ({ q: {}, clk: {} });
type Clocks = Record<string, 0 | 1>;

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
const unknown = (n: number): PinState[] => Array.from({ length: n }, (): PinState => 'X');

/** One pass. Kahn's topological sort; memory parts act as sources, so feedback through them isn't a loop. */
function combinational(gates: GateInstance[], wires: Wire[], seq: SeqState, clocks: Clocks): SimResult {
  const byId = new Map(gates.map((g) => [g.id, g]));
  const memory = new Set(gates.filter((g) => GATE_DEFS[g.type].next).map((g) => g.id));
  const incoming = new Map<string, Wire[]>();
  const outgoing = new Map<string, Wire[]>();
  const waiting = new Map<string, number>();
  for (const g of gates) waiting.set(g.id, 0);
  for (const w of wires) {
    if (!byId.has(w.fromGateId) || !byId.has(w.toGateId)) continue;
    push(incoming, w.toGateId, w);
    push(outgoing, w.fromGateId, w);
    if (!memory.has(w.toGateId)) waiting.set(w.toGateId, (waiting.get(w.toGateId) ?? 0) + 1); // memory inputs are sampled, not ordered
  }

  const gateInputs: Record<string, PinState[]> = {};
  const gateOutputs: Record<string, PinState[]> = {};
  const gather = (id: string, n: number): PinState[] => {
    const ins = unknown(n);
    for (const w of incoming.get(id) ?? []) ins[w.toPinIndex] = gateOutputs[w.fromGateId]?.[w.fromPinIndex] ?? 'X';
    return ins;
  };

  const queue = gates.filter((g) => waiting.get(g.id) === 0).map((g) => g.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift() as string;
    order.push(id);
    const g = byId.get(id) as GateInstance;
    const def = GATE_DEFS[g.type];
    if (memory.has(id)) {
      const q = seq.q[id] ?? 0;
      gateOutputs[id] = def.outputCount === 2 ? [q, not(q)] : [q];
    } else if (g.type === 'INPUT') gateOutputs[id] = [g.outputStates[0] === 1 ? 1 : 0];
    else if (g.type === 'CLOCK') gateOutputs[id] = [clocks[id] ?? 0];
    else {
      const ins = gather(id, def.inputCount);
      gateInputs[id] = ins;
      gateOutputs[id] = def.outputCount ? [def.evaluate(ins)] : [];
    }
    for (const w of outgoing.get(id) ?? []) {
      if (memory.has(w.toGateId)) continue;
      const left = (waiting.get(w.toGateId) ?? 1) - 1;
      waiting.set(w.toGateId, left);
      if (left === 0) queue.push(w.toGateId);
    }
  }

  // Gates the sort never reached are on a loop, or downstream of one.
  const done = new Set(order);
  const rest = new Set(gates.filter((g) => !done.has(g.id)).map((g) => g.id));
  for (const id of rest) {
    const def = GATE_DEFS[(byId.get(id) as GateInstance).type];
    gateInputs[id] = unknown(def.inputCount);
    gateOutputs[id] = unknown(def.outputCount);
  }
  // Keep only gates that are really on a loop: peel off those that lead nowhere inside the leftovers.
  for (let changed = true; changed; ) {
    changed = false;
    for (const id of [...rest]) {
      if (!(outgoing.get(id) ?? []).some((w) => rest.has(w.toGateId))) {
        rest.delete(id);
        changed = true;
      }
    }
  }
  for (const id of memory) gateInputs[id] = gather(id, GATE_DEFS[(byId.get(id) as GateInstance).type].inputCount);

  const wireStates: Record<string, PinState> = {};
  for (const w of wires) wireStates[w.id] = gateOutputs[w.fromGateId]?.[w.fromPinIndex] ?? 'X';
  return { wireStates, gateInputs, gateOutputs, cycleGateIds: [...rest] };
}

/** Read-only view of the circuit with the given memory and clock levels. */
export function evaluate(gates: GateInstance[], wires: Wire[], seq: SeqState = emptySeq(), clocks: Clocks = {}): SimResult {
  return combinational(gates, wires, seq, clocks);
}

const MAX_SETTLE = 16;

/** Evaluate, then let flip-flops react to clock edges and latches to their inputs, until things settle (ripple counters need several passes). */
export function advance(gates: GateInstance[], wires: Wire[], from: SeqState, clocks: Clocks): { result: SimResult; seq: SeqState } {
  const mem = gates.filter((g) => GATE_DEFS[g.type].next);
  const seq = emptySeq();
  for (const g of mem) {
    seq.q[g.id] = from.q[g.id] ?? 0;
    if (from.clk[g.id] !== undefined) seq.clk[g.id] = from.clk[g.id];
  }
  let result = combinational(gates, wires, seq, clocks);

  for (let pass = 0; pass < MAX_SETTLE; pass++) {
    const nextQ: Record<string, PinState> = {};
    for (const g of mem) {
      const def = GATE_DEFS[g.type];
      const ins = result.gateInputs[g.id] ?? unknown(def.inputCount);
      let rising = false;
      if (def.clockPin !== undefined) {
        const now = ins[def.clockPin];
        rising = seq.clk[g.id] === 0 && now === 1;
        seq.clk[g.id] = now;
      }
      nextQ[g.id] = def.next ? def.next(seq.q[g.id], ins, rising) : seq.q[g.id];
    }
    let changed = false;
    for (const g of mem) {
      if (nextQ[g.id] !== seq.q[g.id]) {
        seq.q[g.id] = nextQ[g.id];
        changed = true;
      }
    }
    if (!changed) break;
    result = combinational(gates, wires, seq, clocks);
  }
  return { result, seq };
}
