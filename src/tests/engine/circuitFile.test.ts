import { describe, expect, it } from 'vitest';
import { collides, inWorld } from '../../canvas/hitTest';
import { FILE_VERSION, buildPreset, parseCircuit, serializeCircuit } from '../../engine/circuitFile';
import { advance, emptySeq, evaluate } from '../../engine/evaluator';
import { buildTruthTable } from '../../engine/truthTable';
import { PRESETS } from '../../presets';
import type { GateInstance } from '../../types/gate';

const preset = (name: string) => buildPreset(PRESETS.find((p) => p.name === name)!);

/** Gates with the named INPUTs set to the given values. */
const drive = (gates: GateInstance[], ids: Record<string, string>, values: Record<string, number>) =>
  gates.map((g) => {
    const key = Object.keys(values).find((k) => ids[k] === g.id);
    return key === undefined ? g : { ...g, outputStates: [values[key] === 1 ? 1 : 0] as GateInstance['outputStates'] };
  });

describe('circuit files', () => {
  it('round-trips through save and open', () => {
    const { gates, wires } = preset('Full adder');
    const text = serializeCircuit({ id: 'x', name: 'n', gates, wires, viewport: { x: 0, y: 0, zoom: 1 }, createdAt: '', version: FILE_VERSION });
    const parsed = parseCircuit(text);
    if ('error' in parsed) throw new Error(parsed.error);
    expect(parsed.circuit.gates.length).toBe(gates.length);
    expect(parsed.circuit.wires.length).toBe(wires.length);
  });

  it('rejects files that are not circuits', () => {
    expect('error' in parseCircuit('not json')).toBe(true);
    expect('error' in parseCircuit('{"gates":[{"id":"a","type":"FLUX","x":0,"y":0}],"wires":[]}')).toBe(true);
    expect('error' in parseCircuit('{"gates":[],"wires":[{"fromGateId":"nope"}]}')).toBe(true);
  });
});

describe('presets', () => {
  it('keep every gate on the grid, inside the workspace and clear of the others', () => {
    for (const p of PRESETS) {
      const { gates } = buildPreset(p);
      for (const g of gates) {
        expect(g.x % 20 === 0 && g.y % 20 === 0).toBe(true);
        expect(inWorld(g.x, g.y)).toBe(true);
        expect(collides(g.x, g.y, gates, [g.id])).toBe(false);
      }
    }
  });

  it('half adder', () => {
    const { gates, wires } = preset('Half adder');
    expect(buildTruthTable(gates, wires).rows.map((r) => r.outputs)).toEqual([[0, 0], [1, 0], [1, 0], [0, 1]]);
  });

  it('full adder adds three bits', () => {
    const { gates, wires, ids } = preset('Full adder');
    for (let n = 0; n < 8; n++) {
      const g = drive(gates, ids, { A0: n & 1, B0: (n >> 1) & 1, Cin: (n >> 2) & 1 });
      const r = evaluate(g, wires);
      const sum = (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);
      expect([r.gateInputs[ids.S0][0], r.gateInputs[ids.Cout][0]]).toEqual([sum & 1, sum >> 1]);
    }
  });

  it('4-bit adder adds every pair of 4-bit numbers', () => {
    const { gates, wires, ids } = preset('4-bit adder');
    for (let a = 0; a < 16; a++) {
      for (let b = 0; b < 16; b++) {
        const values: Record<string, number> = { Cin: 0 };
        for (let i = 0; i < 4; i++) {
          values[`A${i}`] = (a >> i) & 1;
          values[`B${i}`] = (b >> i) & 1;
        }
        const r = evaluate(drive(gates, ids, values), wires);
        const out = [0, 1, 2, 3].reduce((acc, i) => acc + ((r.gateInputs[ids[`S${i}`]][0] as number) << i), 0) + ((r.gateInputs[ids.Cout][0] as number) << 4);
        expect(out).toBe(a + b);
      }
    }
  });

  it('2-to-1 mux selects A or B', () => {
    const { gates, wires, ids } = preset('2-to-1 mux');
    for (let n = 0; n < 8; n++) {
      const [a, b, s] = [n & 1, (n >> 1) & 1, (n >> 2) & 1];
      const r = evaluate(drive(gates, ids, { A: a, B: b, S: s }), wires);
      expect(r.gateInputs[ids.Y][0]).toBe(s ? b : a);
    }
  });

  it('SR latch sets, holds and resets', () => {
    const { gates, wires, ids } = preset('SR latch');
    let seq = emptySeq();
    const q = (s: number, r: number) => {
      const out = advance(drive(gates, ids, { S: s, R: r }), wires, seq, {});
      seq = out.seq;
      return out.result.gateInputs[ids.Q][0];
    };
    expect([q(1, 0), q(0, 0), q(0, 1), q(0, 0)]).toEqual([1, 1, 0, 0]);
  });

  it('D flip-flop takes D on the rising edge only', () => {
    const { gates, wires, ids } = preset('D flip-flop');
    let seq = emptySeq();
    const q = (d: number, clk: 0 | 1) => {
      const out = advance(drive(gates, ids, { D: d }), wires, seq, { [ids.CLK]: clk });
      seq = out.seq;
      return out.result.gateInputs[ids.Q][0];
    };
    expect([q(1, 0), q(1, 1), q(0, 1), q(0, 0), q(0, 1)]).toEqual([0, 1, 1, 1, 0]);
  });
});
