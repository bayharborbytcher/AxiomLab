import type { GateInstance, PinState } from '../types/gate';
import type { Wire } from '../types/wire';
import { evaluate } from './evaluator';

export const AUTO_MAX_INPUTS = 4; // built automatically up to here (16 rows)
export const MAX_INPUTS = 8; // built on request up to here (256 rows)

export interface IoPort { id: string; name: string }
export interface TruthRow { inputs: (0 | 1)[]; outputs: PinState[] }
export interface TruthTable { inputs: IoPort[]; outputs: IoPort[]; rows: TruthRow[] }

const topToBottom = (a: GateInstance, b: GateInstance) => a.y - b.y || a.x - b.x;
const inputName = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : `I${i + 1}`);

/** Inputs are named A, B, C... and outputs Y (or Y1, Y2...), in order from top to bottom of the canvas. */
export function ioPorts(gates: GateInstance[]): { inputs: IoPort[]; outputs: IoPort[] } {
  const inputs = gates
    .filter((g) => g.type === 'INPUT')
    .sort(topToBottom)
    .map((g, i) => ({ id: g.id, name: inputName(i) }));
  const outs = gates.filter((g) => g.type === 'OUTPUT').sort(topToBottom);
  const outputs = outs.map((g, i) => ({ id: g.id, name: outs.length === 1 ? 'Y' : `Y${i + 1}` }));
  return { inputs, outputs };
}

export function ioNames(gates: GateInstance[]): Record<string, string> {
  const { inputs, outputs } = ioPorts(gates);
  const names: Record<string, string> = {};
  for (const p of [...inputs, ...outputs]) names[p.id] = p.name;
  return names;
}

/** One evaluation per input combination. The first input is the most significant bit, so rows read 00, 01, 10, 11. */
export function buildTruthTable(gates: GateInstance[], wires: Wire[]): TruthTable {
  const { inputs, outputs } = ioPorts(gates);
  const n = inputs.length;
  const rows: TruthRow[] = [];
  for (let r = 0; r < 2 ** n; r++) {
    const bits = inputs.map((_, i): 0 | 1 => (((r >> (n - 1 - i)) & 1) === 1 ? 1 : 0));
    const forced = new Map(inputs.map((p, i) => [p.id, bits[i]]));
    const driven = gates.map((g) => {
      const bit = forced.get(g.id);
      return bit === undefined ? g : { ...g, outputStates: [bit] };
    });
    const sim = evaluate(driven, wires);
    rows.push({ inputs: bits, outputs: outputs.map((o) => sim.gateInputs[o.id]?.[0] ?? 'X') });
  }
  return { inputs, outputs, rows };
}

/** Which row matches the switches right now, or -1 if the table doesn't fit the circuit any more. */
export function currentRowIndex(table: TruthTable, gates: GateInstance[]): number {
  const state = new Map<string, number>(gates.filter((g) => g.type === 'INPUT').map((g) => [g.id, g.outputStates[0] === 1 ? 1 : 0]));
  let index = 0;
  for (const p of table.inputs) {
    const bit = state.get(p.id);
    if (bit === undefined) return -1;
    index = index * 2 + bit;
  }
  return index;
}

/** Changes when gates, wires or the input/output order change; ignores moves of other gates and switch flips. */
export function circuitKey(gates: GateInstance[], wires: Wire[]): string {
  const { inputs, outputs } = ioPorts(gates);
  return [
    gates.map((g) => g.id + g.type).join(),
    wires.map((w) => `${w.fromGateId}.${w.fromPinIndex}>${w.toGateId}.${w.toPinIndex}`).join(),
    inputs.map((p) => p.id).join(),
    outputs.map((p) => p.id).join(),
  ].join('|');
}

/** The table as text: header row, then one row per combination. Use ',' for CSV or a tab for pasting into a spreadsheet. */
export function tableToText(table: TruthTable, sep: string): string {
  const head = [...table.inputs, ...table.outputs].map((p) => p.name).join(sep);
  const rows = table.rows.map((r) => [...r.inputs, ...r.outputs].join(sep));
  return [head, ...rows].join('\n') + '\n';
}
