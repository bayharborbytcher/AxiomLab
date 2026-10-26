import type { BasicGateType, GateType, LogicGateType, PinState } from '../types/gate';

export interface GateDef {
  label: string;
  blurb: string;
  inputCount: 0 | 1 | 2 | 3;
  outputCount: 0 | 1 | 2;
  /** Output of a combinational gate. Sources and memory parts ignore it. */
  evaluate: (inputs: PinState[]) => PinState;
  /** Memory parts: next stored Q from the old Q, the inputs, and whether the clock just rose. */
  next?: (q: PinState, inputs: PinState[], rising: boolean) => PinState;
  clockPin?: number; // CLK input of an edge-triggered part
}

// Three-valued logic: 'X' (unknown) only wins when the other input can't decide the result.
export const not = (a: PinState): PinState => (a === 'X' ? 'X' : a === 1 ? 0 : 1);
const and = (a: PinState, b: PinState): PinState => (a === 0 || b === 0 ? 0 : a === 1 && b === 1 ? 1 : 'X');
const or = (a: PinState, b: PinState): PinState => (a === 1 || b === 1 ? 1 : a === 0 && b === 0 ? 0 : 'X');
const xor = (a: PinState, b: PinState): PinState => (a === 'X' || b === 'X' ? 'X' : a === b ? 0 : 1);
const zero = (): PinState => 0;

const logic = (label: string, blurb: string, n: 1 | 2, evaluate: GateDef['evaluate']): GateDef => ({
  label, blurb, inputCount: n, outputCount: 1, evaluate,
});

const latch = (q: PinState, i: PinState[]): PinState => {
  const [s, r] = [i[0], i[1]];
  if (s === 'X' || r === 'X' || (s === 1 && r === 1)) return 'X'; // S and R together is not allowed
  return s === 1 ? 1 : r === 1 ? 0 : q;
};
const dff = (q: PinState, i: PinState[], rising: boolean): PinState => (rising ? i[0] : q);
const tff = (q: PinState, i: PinState[], rising: boolean): PinState =>
  !rising ? q : i[0] === 'X' ? 'X' : i[0] === 1 ? not(q) : q;
const jkff = (q: PinState, i: PinState[], rising: boolean): PinState => {
  if (!rising) return q;
  const [j, k] = [i[0], i[2]];
  if (j === 'X' || k === 'X') return 'X';
  return j === 1 ? (k === 1 ? not(q) : 1) : k === 1 ? 0 : q;
};

export const GATE_DEFS: Record<BasicGateType, GateDef> = {
  AND: logic('AND', 'Outputs 1 only when both inputs are 1.', 2, (i) => and(i[0], i[1])),
  OR: logic('OR', 'Outputs 1 when at least one input is 1.', 2, (i) => or(i[0], i[1])),
  NOT: logic('NOT', 'Flips its input: 0 becomes 1, 1 becomes 0.', 1, (i) => not(i[0])),
  NAND: logic('NAND', 'AND followed by NOT: 0 only when both inputs are 1.', 2, (i) => not(and(i[0], i[1]))),
  NOR: logic('NOR', 'OR followed by NOT: 1 only when both inputs are 0.', 2, (i) => not(or(i[0], i[1]))),
  XOR: logic('XOR', 'Outputs 1 when the inputs differ.', 2, (i) => xor(i[0], i[1])),
  XNOR: logic('XNOR', 'Outputs 1 when the inputs match.', 2, (i) => not(xor(i[0], i[1]))),
  BUFFER: logic('Buffer', 'Passes its input through unchanged.', 1, (i) => i[0]),
  INPUT: { label: 'Input', blurb: 'A switch. Click it to turn it on or off.', inputCount: 0, outputCount: 1, evaluate: zero },
  OUTPUT: { label: 'Output', blurb: 'Shows the value reaching it: 0, 1 or X.', inputCount: 1, outputCount: 0, evaluate: (i) => i[0] },
  CLOCK: { label: 'Clock', blurb: 'Flips between 0 and 1 by itself while the simulation runs.', inputCount: 0, outputCount: 1, evaluate: zero },
  LED: { label: 'LED', blurb: 'Lights up when its input is 1.', inputCount: 1, outputCount: 0, evaluate: (i) => i[0] },
  SR_LATCH: { label: 'SR latch', blurb: 'S sets Q to 1, R resets it to 0, otherwise it holds.', inputCount: 2, outputCount: 2, evaluate: zero, next: latch },
  D_FF: { label: 'D flip-flop', blurb: 'On each rising clock edge, Q takes the value of D.', inputCount: 2, outputCount: 2, evaluate: zero, next: dff, clockPin: 1 },
  JK_FF: { label: 'JK flip-flop', blurb: 'On each rising clock edge: J sets, K resets, both toggle.', inputCount: 3, outputCount: 2, evaluate: zero, next: jkff, clockPin: 1 },
  T_FF: { label: 'T flip-flop', blurb: 'Toggles Q on each rising clock edge while T is 1.', inputCount: 2, outputCount: 2, evaluate: zero, next: tff, clockPin: 1 },
};

/** Palette order. */
export const BASIC_GATES: LogicGateType[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'BUFFER'];
export const IO_GATES: BasicGateType[] = ['INPUT', 'OUTPUT', 'CLOCK', 'LED'];
export const FLIP_FLOPS: BasicGateType[] = ['SR_LATCH', 'D_FF', 'JK_FF', 'T_FF'];

export const isBasicGate = (t: GateType): t is BasicGateType => t in GATE_DEFS;
export const isSequential = (t: GateType): boolean => t in GATE_DEFS && GATE_DEFS[t].next !== undefined;
