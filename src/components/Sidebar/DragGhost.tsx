import { useUIStore } from '../../store/uiStore';
import { GateGlyph } from './GateCard';

/** The gate that follows the pointer while you drag it out of the palette. Tracks 1:1, no easing. */
export function DragGhost() {
  const drag = useUIStore((s) => s.paletteDrag);
  const zoom = useUIStore((s) => s.viewport.zoom);
  if (!drag) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-40 text-fg opacity-90"
      style={{
        width: 128 * zoom, // drawn at canvas scale, so what you carry is what you drop
        height: 88 * zoom,
        transform: `translate(${drag.x}px, ${drag.y}px) translate(-50%, -50%)`,
      }}
    >
      <GateGlyph type={drag.type} className="h-full w-full" />
    </div>
  );
}
