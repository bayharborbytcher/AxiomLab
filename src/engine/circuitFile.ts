import type { Circuit } from '../types/circuit';
import type { GateInstance, GateType, PinState } from '../types/gate';
import { WIRE_COLORS } from '../types/wire';
import type { Wire } from '../types/wire';
import { GATE_DEFS } from './gates';

export const FILE_VERSION = '1';
const MAX_GATES = 2000;

export const serializeCircuit = (c: Circuit): string => JSON.stringify(c, null, 2);

export type ParseResult = { circuit: Circuit } | { error: string };

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const zeros = (n: number): PinState[] => Array.from({ length: n }, (): PinState => 0);

/** Validates a saved file and rebuilds a clean circuit from it. Never trusts the file's shape. */
export function parseCircuit(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  const r = raw as Partial<Circuit> | null;
  if (!r || typeof r !== 'object' || !Array.isArray(r.gates) || !Array.isArray(r.wires)) {
    return { error: 'This does not look like an AxiomLab circuit.' };
  }
  if (r.gates.length > MAX_GATES) return { error: 'This circuit is too large to open.' };

  const gates: GateInstance[] = [];
  const ids = new Set<string>();
  for (const g of r.gates as Partial<GateInstance>[]) {
    if (!g || typeof g.id !== 'string' || ids.has(g.id) || typeof g.type !== 'string' || !(g.type in GATE_DEFS) || !num(g.x) || !num(g.y)) {
      return { error: 'A gate in this file is damaged.' };
    }
    ids.add(g.id);
    const type = g.type as GateType;
    const def = GATE_DEFS[type];
    gates.push({
      id: g.id, type, label: def.label, x: g.x, y: g.y, rotation: 0,
      inputStates: zeros(def.inputCount),
      outputStates: type === 'INPUT' ? [g.outputStates?.[0] === 1 ? 1 : 0] : zeros(def.outputCount),
      ...(type === 'CLOCK' ? { hz: num(g.hz) && g.hz > 0 && g.hz <= 30 ? g.hz : 1 } : {}),
    });
  }

  const wires: Wire[] = [];
  const used = new Set<string>();
  for (const w of r.wires as Partial<Wire>[]) {
    const from = gates.find((g) => g.id === w?.fromGateId);
    const to = gates.find((g) => g.id === w?.toGateId);
    if (!w || !from || !to || from.id === to.id || !num(w.fromPinIndex) || !num(w.toPinIndex) ||
        w.fromPinIndex >= GATE_DEFS[from.type].outputCount || w.toPinIndex >= GATE_DEFS[to.type].inputCount) {
      return { error: 'A wire in this file is damaged.' };
    }
    const slot = `${to.id}.${w.toPinIndex}`;
    if (used.has(slot)) continue; // an input takes one wire
    used.add(slot);
    wires.push({
      id: typeof w.id === 'string' ? w.id : crypto.randomUUID(),
      fromGateId: from.id, fromPinIndex: w.fromPinIndex, toGateId: to.id, toPinIndex: w.toPinIndex,
      points: [], state: 0,
      colorIndex: num(w.colorIndex) ? Math.max(0, Math.floor(w.colorIndex)) : wires.length % WIRE_COLORS.length,
    });
  }

  return {
    circuit: {
      id: typeof r.id === 'string' ? r.id : crypto.randomUUID(),
      name: typeof r.name === 'string' ? r.name : 'Untitled circuit',
      gates, wires,
      viewport: r.viewport ?? { x: 0, y: 0, zoom: 1 },
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
      version: FILE_VERSION,
    },
  };
}

/** Compact preset format: gates by name with a position, wires as [from, output pin, to, input pin]. */
export interface PresetSpec {
  name: string;
  description: string;
  gates: Record<string, [GateType, number, number, number?]>;
  wires: [string, number, string, number][];
}

export function buildPreset(spec: PresetSpec, makeId: () => string = () => crypto.randomUUID()) {
  const ids: Record<string, string> = {};
  const gates: GateInstance[] = Object.entries(spec.gates).map(([key, [type, x, y, hz]]) => {
    const def = GATE_DEFS[type];
    ids[key] = makeId();
    return {
      id: ids[key], type, label: def.label, x, y, rotation: 0,
      inputStates: zeros(def.inputCount), outputStates: zeros(def.outputCount),
      ...(type === 'CLOCK' ? { hz: hz ?? 1 } : {}),
    };
  });
  const wires: Wire[] = spec.wires.map(([from, fp, to, tp], i) => ({
    id: makeId(), fromGateId: ids[from], fromPinIndex: fp, toGateId: ids[to], toPinIndex: tp,
    points: [], state: 0, colorIndex: i % WIRE_COLORS.length,
  }));
  return { gates, wires, ids };
}
