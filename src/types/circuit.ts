import type { GateInstance } from './gate';
import type { Wire } from './wire';

export interface Circuit {
  id: string;
  name: string;
  gates: GateInstance[];
  wires: Wire[];
  viewport: { x: number; y: number; zoom: number };
  createdAt: string;
  version: string;
}
