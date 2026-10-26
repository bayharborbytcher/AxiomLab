import { create } from 'zustand';
import { History } from '../engine/history';
import { useCircuitStore } from './circuitStore';
import type { Snapshot } from './circuitStore';

const history = new History(100);
const flags = () => ({ canUndo: history.canUndo, canRedo: history.canRedo });

interface HistoryState { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void }

export const useHistoryStore = create<HistoryState>()((set) => ({
  ...flags(),
  undo: () => {
    history.undo();
    set(flags());
  },
  redo: () => {
    history.redo();
    set(flags());
  },
}));

/** Record an edit that has already happened. Circuit snapshots are cheap: the store is immutable, so they share data. */
export function record(label: string, before: Snapshot, after: Snapshot): void {
  if (before.gates === after.gates && before.wires === after.wires) return;
  const restore = (s: Snapshot) => useCircuitStore.getState().restore(s);
  history.push({ label, undo: () => restore(before), execute: () => restore(after) });
  useHistoryStore.setState(flags());
}

/** Run an edit and make it undoable. */
export function track<T>(label: string, edit: () => T): T {
  const before = useCircuitStore.getState().snapshot();
  const result = edit();
  record(label, before, useCircuitStore.getState().snapshot());
  return result;
}
