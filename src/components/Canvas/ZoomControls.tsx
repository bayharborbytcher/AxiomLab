import { flyTo, zoomStep } from '../../canvas/camera';
import { circuitBounds } from '../../canvas/hitTest';
import { useCircuitStore } from '../../store/circuitStore';
import { useUIStore } from '../../store/uiStore';
import { IconButton } from '../shared/IconButton';

const STEP = 1.25;

/** One glass capsule for the view controls. Padding keeps every button clear of the edge. */
export function ZoomControls() {
  const zoom = useUIStore((s) => s.viewport.zoom);
  const hasGates = useCircuitStore((s) => s.gates.length > 0);

  return (
    <div role="group" aria-label="View" className="glass absolute bottom-4 left-4 flex items-center gap-0.2 rounded-full p-0.5">
      <IconButton bare icon size="lg" label="Zoom out" onClick={() => zoomStep(1 / STEP)}>
        <span className="text-xl leading-none">−</span>
      </IconButton>
      <span className="w-15 text-center font-sans text-[13px] font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
      <IconButton bare icon size="lg" label="Zoom in" onClick={() => zoomStep(STEP)}>
        <span className="text-xl leading-none">+</span>
      </IconButton>
      <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />
      <IconButton bare size="lg" label="Go back to the origin" onClick={() => flyTo(null)}>
        Origin
      </IconButton>
      <IconButton
        bare
        size="lg"
        label="Centre the view on your circuit"
        disabled={!hasGates}
        onClick={() => {
          const { gates, wires } = useCircuitStore.getState();
          flyTo(circuitBounds(gates, wires));
        }}
      >
        Fit Circuit
      </IconButton>
    </div>
  );
}
