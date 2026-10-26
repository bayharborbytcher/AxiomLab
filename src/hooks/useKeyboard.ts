import { useEffect } from 'react';
import { isTyping } from '../canvas/interaction';
import { openFileDialog, saveCircuit } from '../lib/files';
import { useHistoryStore } from '../store/historyStore';
import { deleteSelection, duplicateSelection, selectAll, useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';

/** App-wide shortcuts. Editing shortcuts are ignored in Operate mode. */
export function useKeyboard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || document.querySelector('[role="alertdialog"]')) return;
      const ui = useUIStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const editing = ui.mode === 'edit';

      if (e.key === 'Escape') {
        ui.setContextMenu(null);
        if (ui.wireDraft) {
          ui.setWireDraft(null); // Esc cancels a wire in progress first
          ui.setHoverPin(null);
        } else useSelectionStore.getState().clear();
      } else if (mod && key === 's') {
        e.preventDefault();
        saveCircuit();
      } else if (!editing) return;
      else if (mod && key === 'o') {
        e.preventDefault();
        openFileDialog();
      } else if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) useHistoryStore.getState().redo();
        else useHistoryStore.getState().undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        useHistoryStore.getState().redo();
      } else if (mod && key === 'a') {
        e.preventDefault();
        selectAll();
      } else if (mod && key === 'd') {
        e.preventDefault();
        duplicateSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
