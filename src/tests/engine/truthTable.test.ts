import { describe, expect, it } from 'vitest';
import { buildTruthTable, currentRowIndex, ioPorts } from '../../engine/truthTable';
import type { GateInstance, GateType } from '../../types/gate';
import type { Wire } from '../../types/wire';

const gate = (id: string, type: GateType, y = 0, on = false): GateInstance => ({
  id, type, label: type, x: 0, y, rotation: 0, inputStates: [], outputStates: type === 'INPUT' ? [on ? 1 : 0] : [],
});
const wire = (id: string, from: string, to: string, pin = 0): Wire => ({
  id, fromGateId: from, fromPinIndex: 0, toGateId: to, toPinIndex: pin, points: [], state: 0, colorIndex: 0,
});

const xorCircuit = (aOn = false, bOn = false) => ({
  gates: [gate('b', 'INPUT', 100, bOn), gate('a', 'INPUT', 0, aOn), gate('x', 'XOR', 50), gate('o', 'OUTPUT', 50)],
  wires: [wire('w1', 'a', 'x', 0), wire('w2', 'b', 'x', 1), wire('w3', 'x', 'o')],
});

describe('truth table', () => {
  it('names inputs from top to bottom, whatever order they were placed in', () => {
    const { inputs, outputs } = ioPorts(xorCircuit().gates);
    expect(inputs.map((p) => [p.id, p.name])).toEqual([['a', 'A'], ['b', 'B']]);
    expect(outputs.map((p) => p.name)).toEqual(['Y']);
  });

  it('lists XOR in binary order', () => {
    const { gates, wires } = xorCircuit();
    const t = buildTruthTable(gates, wires);
    expect(t.rows.map((r) => r.inputs.join(''))).toEqual(['00', '01', '10', '11']);
    expect(t.rows.map((r) => r.outputs[0])).toEqual([0, 1, 1, 0]);
  });

  it('finds the row that matches the switches', () => {
    const { gates, wires } = xorCircuit(true, false); // A=1, B=0
    expect(currentRowIndex(buildTruthTable(gates, wires), gates)).toBe(2);
  });

  it('is undefined only where a floating input can change the result', () => {
    const gates = [gate('a', 'INPUT'), gate('g', 'AND', 50), gate('o', 'OUTPUT', 50)];
    const t = buildTruthTable(gates, [wire('w1', 'a', 'g', 0), wire('w2', 'g', 'o')]);
    // A=0 forces AND to 0 whatever the loose input does. A=1 leaves it undefined.
    expect(t.rows.map((r) => r.outputs[0])).toEqual([0, 'X']);
  });
});
