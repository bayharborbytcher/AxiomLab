export type PinState = 0 | 1 | 'X'; // LOW, HIGH, UNDEFINED

export type GateType =
  | 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'BUFFER'
  | 'INPUT' | 'OUTPUT' | 'CLOCK' | 'LED'
  | 'SR_LATCH' | 'D_FF' | 'JK_FF' | 'T_FF';

/** The gates that have an IEEE shape and truth function so far. */
export type LogicGateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'BUFFER';
/** Every gate the simulator can draw and run: the complete set. */
export type BasicGateType = GateType;

export interface Pin {
  id: string;
  gateId: string;
  kind: 'input' | 'output';
  index: number;
  label: string;
}

export interface GateInstance {
  id: string;
  type: GateType;
  label: string;
  x: number; // world coordinates of the gate body's top-left corner
  y: number;
  rotation: 0 | 90 | 180 | 270;
  inputStates: PinState[];
  outputStates: PinState[];
  hz?: number; // CLOCK only: frequency in Hz
}
