import { useMemo, useState } from 'react';
import { AUTO_MAX_INPUTS, MAX_INPUTS, buildTruthTable, circuitKey, currentRowIndex, ioPorts } from '../engine/truthTable';
import type { TruthTable } from '../engine/truthTable';
import { isSequential } from '../engine/gates';
import { useCircuitStore } from '../store/circuitStore';

export type TableMode = 'empty' | 'auto' | 'manual' | 'too-large' | 'dynamic';

export interface TruthTableView {
  mode: TableMode;
  inputCount: number;
  outputCount: number;
  table: TruthTable | null;
  /** A manually generated table that no longer matches the circuit */
  stale: boolean;
  /** Row matching the switches right now, or -1 */
  currentRow: number;
  generate: () => void;
}

/** Up to 4 inputs the table follows the circuit live. From 5 to 8 it is built on request.
 *  Circuits with a clock or memory have no truth table: their outputs depend on history. */
export function useTruthTable(): TruthTableView {
  const gates = useCircuitStore((s) => s.gates);
  const wires = useCircuitStore((s) => s.wires);
  const ports = useMemo(() => ioPorts(gates), [gates]);
  const inputCount = ports.inputs.length;
  const outputCount = ports.outputs.length;
  const [manual, setManual] = useState<{ key: string; table: TruthTable } | null>(null);

  const dynamic = gates.some((g) => g.type === 'CLOCK' || isSequential(g.type));
  const mode: TableMode = dynamic
    ? 'dynamic'
    : !inputCount || !outputCount
      ? 'empty'
      : inputCount <= AUTO_MAX_INPUTS
        ? 'auto'
        : inputCount <= MAX_INPUTS
          ? 'manual'
          : 'too-large';

  const auto = useMemo(() => (mode === 'auto' ? buildTruthTable(gates, wires) : null), [mode, gates, wires]);
  const key = circuitKey(gates, wires);
  const table = mode === 'auto' ? auto : mode === 'manual' ? (manual?.table ?? null) : null;

  return {
    mode, inputCount, outputCount, table,
    stale: mode === 'manual' && manual !== null && manual.key !== key,
    currentRow: table ? currentRowIndex(table, gates) : -1,
    generate: () => setManual({ key, table: buildTruthTable(gates, wires) }),
  };
}
