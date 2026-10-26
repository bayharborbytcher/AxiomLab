import { create } from 'zustand';
import { freeOffset } from '../canvas/hitTest';
import { useCircuitStore } from './circuitStore';
import { track } from './historyStore';

interface SelectionState {
  gateIds: string[];
  wireIds: string[];
  select: (gateIds: string[], wireIds?: string[]) => void;
  toggleGate: (id: string) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  gateIds: [],
  wireIds: [],
  select: (gateIds, wireIds = []) => set({ gateIds, wireIds }),
  toggleGate: (id) =>
    set((s) => ({ gateIds: s.gateIds.includes(id) ? s.gateIds.filter((g) => g !== id) : [...s.gateIds, id] })),
  clear: () => set({ gateIds: [], wireIds: [] }),
}));

// Forget selected things that no longer exist (after a delete, undo or load).
useCircuitStore.subscribe((s) => {
  const { gateIds, wireIds } = useSelectionStore.getState();
  const g = gateIds.filter((id) => s.gates.some((x) => x.id === id));
  const w = wireIds.filter((id) => s.wires.some((x) => x.id === id));
  if (g.length !== gateIds.length || w.length !== wireIds.length) useSelectionStore.setState({ gateIds: g, wireIds: w });
});

export function selectAll(): void {
  useSelectionStore.getState().select(useCircuitStore.getState().gates.map((g) => g.id));
}

/** Delete whatever is selected. Used by the Delete key, the toolbar and the context menu. */
export function deleteSelection(): void {
  const { gateIds, wireIds, clear } = useSelectionStore.getState();
  if (!gateIds.length && !wireIds.length) return;
  track('Delete', () => {
    const circuit = useCircuitStore.getState();
    circuit.removeWires(wireIds);
    circuit.removeGates(gateIds); // also removes any wire attached to them
  });
  clear();
}

/** Copy the selected gates (and the wires between them) to the nearest free spot. */
export function duplicateSelection(): void {
  const { gateIds } = useSelectionStore.getState();
  const { gates } = useCircuitStore.getState();
  const chosen = gates.filter((g) => gateIds.includes(g.id));
  const offset = freeOffset(chosen, gates);
  if (!chosen.length || !offset) return;
  const created = track('Duplicate', () => useCircuitStore.getState().duplicate(gateIds, offset.x, offset.y));
  useSelectionStore.getState().select(created);
}
