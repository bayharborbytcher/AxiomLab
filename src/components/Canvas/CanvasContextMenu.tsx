import { AnimatePresence } from 'framer-motion';
import { flyTo } from '../../canvas/camera';
import { circuitBounds } from '../../canvas/hitTest';
import { useCircuitStore } from '../../store/circuitStore';
import { track } from '../../store/historyStore';
import { deleteSelection, duplicateSelection, selectAll } from '../../store/selectionStore';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import type { ContextMenuState } from '../../store/uiStore';
import { ContextMenu } from '../shared/ContextMenu';
import type { MenuItem } from '../shared/ContextMenu';

const closeMenu = () => useUIStore.getState().setContextMenu(null);

function buildItems({ target }: ContextMenuState): MenuItem[] {
  const editing = useUIStore.getState().mode === 'edit';
  const circuit = useCircuitStore.getState();
  const items: MenuItem[] = [];

  if (target.kind === 'gate' && target.id) {
    const id = target.id;
    const gate = circuit.gates.find((g) => g.id === id);
    if (gate?.type === 'INPUT') items.push({ label: 'Toggle switch', onSelect: () => circuit.toggleInput(id) });
    if (gate?.type === 'CLOCK' && !useSimulationStore.getState().running) {
      items.push({ label: 'Flip clock', onSelect: () => useSimulationStore.getState().flipClocks([id]) });
    }
    if (editing) {
      items.push({ label: 'Duplicate', shortcut: 'Ctrl D', onSelect: duplicateSelection });
      items.push({ label: 'Delete', shortcut: 'Del', danger: true, onSelect: deleteSelection });
    }
  } else if (target.kind === 'wire' && target.id && editing) {
    const id = target.id;
    items.push({ label: 'Change colour', onSelect: () => track('Change colour', () => circuit.recolorWires([id])) });
    items.push({ label: 'Delete wire', shortcut: 'Del', danger: true, onSelect: deleteSelection });
  } else if (target.kind === 'canvas') {
    if (editing) items.push({ label: 'Select all', shortcut: 'Ctrl A', disabled: !circuit.gates.length, onSelect: selectAll });
    items.push({ label: 'Fit to circuit', disabled: !circuit.gates.length, onSelect: () => flyTo(circuitBounds(circuit.gates, circuit.wires)) });
    items.push({ label: 'Go to origin', onSelect: () => flyTo(null) });
  }
  return items;
}

/** Right-click menu for gates, wires and empty canvas. What it offers depends on the mode. */
export function CanvasContextMenu() {
  const menu = useUIStore((s) => s.contextMenu);
  const items = menu ? buildItems(menu) : [];
  return (
    <AnimatePresence>
      {menu && items.length > 0 && <ContextMenu key={`${menu.x},${menu.y}`} x={menu.x} y={menu.y} items={items} onClose={closeMenu} />}
    </AnimatePresence>
  );
}
