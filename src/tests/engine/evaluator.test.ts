import { describe, expect, it } from 'vitest';
import { advance, emptySeq, evaluate } from '../../engine/evaluator';
import type { GateInstance, GateType } from '../../types/gate';
import type { Wire } from '../../types/wire';

const gate = (id: string, type: GateType, on = false): GateInstance => ({
  id, type, label: type, x: 0, y: 0, rotation: 0, inputStates: [], outputStates: type === 'INPUT' ? [on ? 1 : 0] : [],
});
const wire = (id: string, from: string, to: string, pin = 0): Wire => ({
  id, fromGateId: from, fromPinIndex: 0, toGateId: to, toPinIndex: pin, points: [], state: 0, colorIndex: 0,
});

describe('evaluate', () => {
  it('computes XOR through INPUT and OUTPUT gates', () => {
    for (const a of [0, 1]) {
      for (const b of [0, 1]) {
        const r = evaluate(
          [gate('a', 'INPUT', a === 1), gate('b', 'INPUT', b === 1), gate('x', 'XOR'), gate('o', 'OUTPUT')],
          [wire('w1', 'a', 'x', 0), wire('w2', 'b', 'x', 1), wire('w3', 'x', 'o')],
        );
        expect(r.gateInputs.o[0]).toBe(a ^ b);
        expect(r.cycleGateIds).toEqual([]);
      }
    }
  });

  it('treats a floating input as undefined', () => {
    const r = evaluate([gate('a', 'INPUT', true), gate('g', 'AND'), gate('o', 'OUTPUT')], [wire('w1', 'a', 'g', 0), wire('w2', 'g', 'o')]);
    expect(r.gateInputs.o[0]).toBe('X');
  });

  it('flags a feedback loop and marks its wires undefined', () => {
    const r = evaluate([gate('n1', 'NOT'), gate('n2', 'NOT')], [wire('w1', 'n1', 'n2'), wire('w2', 'n2', 'n1')]);
    expect([...r.cycleGateIds].sort()).toEqual(['n1', 'n2']);
    expect(r.wireStates.w1).toBe('X');
  });
});

describe('memory', () => {
  it('a D flip-flop copies D only on a rising clock edge', () => {
    let seq = emptySeq();
    const q = (clk: boolean, d: boolean) => {
      const gates = [gate('d', 'INPUT', d), gate('c', 'INPUT', clk), gate('f', 'D_FF'), gate('o', 'OUTPUT')];
      const out = advance(gates, [wire('w1', 'd', 'f', 0), wire('w2', 'c', 'f', 1), wire('w3', 'f', 'o')], seq, {});
      seq = out.seq;
      return out.result.gateInputs.o[0];
    };
    expect([q(false, true), q(true, true), q(true, false), q(false, false), q(true, false)]).toEqual([0, 1, 1, 1, 0]);
  });

  it('feedback through a flip-flop is not a loop, and it toggles every clock pulse', () => {
    let seq = emptySeq();
    const gates = [gate('c', 'INPUT', false), gate('f', 'D_FF'), gate('n', 'NOT')];
    const wires = [wire('w1', 'c', 'f', 1), wire('w2', 'f', 'n'), wire('w3', 'n', 'f', 0)];
    const q = (clk: boolean) => {
      const g = gates.map((x) => (x.id === 'c' ? { ...x, outputStates: [clk ? 1 : 0] as GateInstance['outputStates'] } : x));
      const out = advance(g, wires, seq, {});
      seq = out.seq;
      expect(out.result.cycleGateIds).toEqual([]);
      return out.result.gateOutputs.f[0];
    };
    expect([q(false), q(true), q(false), q(true), q(false), q(true)]).toEqual([0, 1, 1, 0, 0, 1]);
  });
});
