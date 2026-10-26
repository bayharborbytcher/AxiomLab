import { downloadBlob } from '../lib/files';
import { useCircuitStore } from '../store/circuitStore';
import { useSimulationStore } from '../store/simulationStore';
import { circuitBounds } from './hitTest';
import { readTheme, render } from './renderer';

/** Draw the circuit on its own (no grid, no selection) and download it as a PNG. False if there is nothing to export. */
export function exportPng(): Promise<boolean> {
  const { gates, wires } = useCircuitStore.getState();
  const b = circuitBounds(gates, wires);
  if (!b) return Promise.resolve(false);

  const pad = 40;
  const zoom = Math.min(2, 6000 / (b.w + 2 * pad), 6000 / (b.h + 2 * pad)); // 2x for sharpness, capped for huge circuits
  const w = Math.ceil((b.w + 2 * pad) * zoom);
  const h = Math.ceil((b.h + 2 * pad) * zoom);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(false);

  render(ctx, {
    viewport: { x: (pad - b.x) * zoom, y: (pad - b.y) * zoom, zoom },
    size: { w, h }, dpr: 1, theme: readTheme(), gates, wires,
    selected: new Set(), selectedWires: new Set(), draft: null, hoverPin: null,
    sim: useSimulationStore.getState(), bare: true,
  });
  return new Promise((resolve) =>
    canvas.toBlob((blob) => {
      if (blob) downloadBlob('axiomlab-circuit.png', blob);
      resolve(blob !== null);
    }, 'image/png'),
  );
}
