import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { exportPng } from '../../canvas/exportImage';
import { openCircuitFile, openFileDialog, saveCircuit } from '../../lib/files';
import { useCircuitStore } from '../../store/circuitStore';
import { track, useHistoryStore } from '../../store/historyStore';
import { deleteSelection, useSelectionStore } from '../../store/selectionStore';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import { ClearIcon, EraserIcon, ExportIcon, OpenIcon, PauseIcon, PlayIcon, RedoIcon, SaveIcon, StepIcon, UndoIcon } from '../shared/icons';
import { IconButton } from '../shared/IconButton';
import { Modal } from '../shared/Modal';
import { hoverLift, pressSpring } from '../shared/motion';

interface DialogButtonProps { children: ReactNode; onClick: () => void; danger?: boolean; autoFocus?: boolean }

function DialogButton({ children, onClick, danger, autoFocus }: DialogButtonProps) {
  return (
    <motion.button
      type="button"
      autoFocus={autoFocus}
      onClick={onClick}
      whileHover={hoverLift}
      whileTap={{ scale: 0.94 }}
      transition={pressSpring}
      className={
        'glass h-10 w-full rounded-full px-5 text-sm font-semibold transition-colors ' +
          (danger ? 'bg-[#ff453a]/25 text-[#ff453a] hover:bg-[#ff453a]/32' : 'text-fg')
      }
    >
      {children}
    </motion.button>
  );
}

/** Related actions share one glass capsule; separate groups keep their own space. */
const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div
    role="group"
    aria-label={label}
    className="glass flex h-10 items-center gap-1.5 rounded-full p-[6px] [&_button]:size-8"
  >
    {children}
  </div>
);
const ICON = 'h-[22px] w-[22px]';


export function Toolbar() {
  const editing = useUIStore((s) => s.mode === 'edit');
  const gateCount = useCircuitStore((s) => s.gates.length);
  const wireCount = useCircuitStore((s) => s.wires.length);
  const hasClock = useCircuitStore((s) => s.gates.some((g) => g.type === 'CLOCK'));
  const selected = useSelectionStore((s) => s.gateIds.length + s.wireIds.length);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const running = useSimulationStore((s) => s.running);
  const [confirming, setConfirming] = useState(false);

  const clearAll = () => {
    track('Clear canvas', () => useCircuitStore.getState().clear());
    useSelectionStore.getState().clear();
    setConfirming(false);
  };
  const exportImage = async () => {
    const ok = await exportPng();
    useUIStore.getState().showToast(ok ? 'Exported as PNG' : 'Nothing to export yet', ok ? 'info' : 'error');
  };
  const sim = () => useSimulationStore.getState();

  return (
    <div role="toolbar" aria-label="Circuit actions" className="flex items-center gap-2">
      <Group label="Edit">
        <IconButton bare icon size="lg" label="Remove selected" shortcut="Del" disabled={!editing || selected === 0} onClick={deleteSelection}>
          <EraserIcon className={ICON} />
        </IconButton>
        <IconButton bare icon size="lg" label="Clear the canvas" disabled={!editing || gateCount === 0} onClick={() => setConfirming(true)}>
          <ClearIcon className={ICON} />
        </IconButton>
      </Group>
      <Group label="History">
        <IconButton bare icon size="lg" label="Undo" shortcut="Ctrl Z" disabled={!editing || !canUndo} onClick={() => useHistoryStore.getState().undo()}>
          <UndoIcon className={ICON} />
        </IconButton>
        <IconButton bare icon size="lg" label="Redo" shortcut="Ctrl Y" disabled={!editing || !canRedo} onClick={() => useHistoryStore.getState().redo()}>
          <RedoIcon className={ICON} />
        </IconButton>
      </Group>
      <Group label="Simulation">
        <IconButton bare icon size="lg" label="Run the clocks" active={running} disabled={!hasClock} onClick={() => sim().setRunning(true)}>
          <PlayIcon className={ICON} />
        </IconButton>
        <IconButton bare icon size="lg" label="Pause the clocks" disabled={!running} onClick={() => sim().setRunning(false)}>
          <PauseIcon className={ICON} />
        </IconButton>
        <IconButton bare icon size="lg" label="Step one half cycle" disabled={!hasClock || running} onClick={() => sim().stepClocks()}>
          <StepIcon className={ICON} />
        </IconButton>
      </Group>
      <Group label="File">
        <IconButton bare icon size="lg" label="Open a saved circuit" shortcut="Ctrl O" disabled={!editing} onClick={openFileDialog}>
          <OpenIcon className={ICON} />
        </IconButton>
        <IconButton bare icon size="lg" label="Save circuit as JSON" shortcut="Ctrl S" disabled={gateCount === 0} onClick={saveCircuit}>
          <SaveIcon className={ICON} />
        </IconButton>
        <IconButton bare icon size="lg" label="Export as PNG" disabled={gateCount === 0} onClick={exportImage}>
          <ExportIcon className={ICON} />
        </IconButton>
      </Group>

      <input
        type="file"
        accept=".json,application/json"
        data-open-file
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void openCircuitFile(file);
          e.target.value = '';
        }}
      />

      <Modal open={confirming} title="Clear the canvas?" onClose={() => setConfirming(false)}>
        <p className="mb-0 mt-2 text-sm leading-relaxed text-fg/70">
          This removes {gateCount} {gateCount === 1 ? 'gate' : 'gates'} and {wireCount} {wireCount === 1 ? 'wire' : 'wires'}. You can undo it with Ctrl Z.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <DialogButton autoFocus onClick={() => setConfirming(false)}>Cancel</DialogButton>
          <DialogButton danger onClick={clearAll}>Clear canvas</DialogButton>
        </div>
      </Modal>
    </div>
  );
}
