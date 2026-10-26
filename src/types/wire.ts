import type { PinState } from './gate';

export interface PinRef {
  gateId: string;
  kind: 'input' | 'output';
  index: number;
}

export interface Wire {
  id: string;
  fromGateId: string; // always an output pin...
  fromPinIndex: number;
  toGateId: string; // ...feeding an input pin
  toPinIndex: number;
  points: { x: number; y: number }[]; // orthogonal polyline, recomputed when a gate moves
  colorIndex: number; // which WIRE_COLORS entry draws it
  state: PinState;
}

/** A wire being drawn: it starts at `from` and its free end follows the pointer. */
export interface WireDraft {
  from: PinRef;
  cursor: { x: number; y: number };
}

/**
 * Wire identity colours: soft neon tones that sit well on near-black. A wire keeps its colour;
 * brightness and glow show whether it is HIGH, and dashed orange (not in this list) means undefined.
 */
export const WIRE_COLORS = [
  '#5eead4', // mint
  '#60a5fa', // sky
  '#a78bfa', // violet
  '#f472b6', // pink
  '#fb7185', // rose
  '#facc15', // yellow
  '#a3e635', // lime
  '#22d3ee', // cyan
  '#818cf8', // indigo
  '#e879f9', // fuchsia
  '#34d399', // emerald
  '#e5e7eb', // silver
];
