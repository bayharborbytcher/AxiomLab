import { flyTo } from '../canvas/camera';
import { circuitBounds } from '../canvas/hitTest';
import { FILE_VERSION, buildPreset, parseCircuit, serializeCircuit } from '../engine/circuitFile';
import type { PresetSpec } from '../engine/circuitFile';
import { useCircuitStore } from '../store/circuitStore';
import { track } from '../store/historyStore';
import { useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';
import type { Circuit } from '../types/circuit';
import type { GateInstance } from '../types/gate';
import type { Wire } from '../types/wire';

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Replace the circuit (undoable) and glide the view to it. */
export function applyCircuit(gates: GateInstance[], wires: Wire[], label: string): void {
  track(label, () => useCircuitStore.getState().load(gates, wires));
  useSelectionStore.getState().clear();
  const s = useCircuitStore.getState();
  flyTo(circuitBounds(s.gates, s.wires));
}

export function saveCircuit(): void {
  const { gates, wires } = useCircuitStore.getState();
  const circuit: Circuit = {
    id: crypto.randomUUID(), name: 'AxiomLab circuit', gates, wires,
    viewport: useUIStore.getState().viewport, createdAt: new Date().toISOString(), version: FILE_VERSION,
  };
  downloadBlob('axiomlab-circuit.json', new Blob([serializeCircuit(circuit)], { type: 'application/json' }));
  useUIStore.getState().showToast('Circuit saved');
}

export async function openCircuitFile(file: File): Promise<void> {
  const parsed = parseCircuit(await file.text());
  if ('error' in parsed) {
    useUIStore.getState().showToast(parsed.error, 'error');
    return;
  }
  applyCircuit(parsed.circuit.gates, parsed.circuit.wires, 'Open file');
  useUIStore.getState().showToast(`Opened ${file.name}`);
}

export const openFileDialog = (): void => document.querySelector<HTMLInputElement>('input[data-open-file]')?.click();

export function loadPreset(spec: PresetSpec): void {
  const { gates, wires } = buildPreset(spec);
  applyCircuit(gates, wires, `Open ${spec.name}`);
}
