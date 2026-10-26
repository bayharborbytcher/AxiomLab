import type { PointerEvent as ReactPointerEvent } from 'react';
import { WORLD_BOUNDS as B, visibleWorldRect } from '../../canvas/grid';
import { useCircuitStore } from '../../store/circuitStore';
import { useUIStore } from '../../store/uiStore';

const W = 180;
const H = 120; // same 3:2 ratio as WORLD_BOUNDS

export function Minimap() {
  const viewport = useUIStore((s) => s.viewport);
  const canvasSize = useUIStore((s) => s.canvasSize);
  const centerOn = useUIStore((s) => s.centerOn);
  const gates = useCircuitStore((s) => s.gates);
  const view = visibleWorldRect(viewport, canvasSize);

  // Click or drag on the minimap to move the main view there.
  const jump = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    centerOn({
      x: B.x + ((e.clientX - r.left) / r.width) * B.w,
      y: B.y + ((e.clientY - r.top) / r.height) * B.h,
    });
  };

  return (
    <div className="absolute bottom-3 right-3 overflow-hidden rounded-md border border-border bg-surface">
      <svg
        role="img"
        aria-label="Minimap. Click or drag to move the view."
        width={W}
        height={H}
        viewBox={`${B.x} ${B.y} ${B.w} ${B.h}`}
        className="block cursor-pointer touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          jump(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) jump(e);
        }}
      >
        <rect x={B.x} y={B.y} width={B.w} height={B.h} className="fill-panel" />
        <path d="M-120 0H120M0 -120V120" className="stroke-muted" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {gates.map((g) => (
          <rect key={g.id} x={g.x - 40} y={g.y - 40} width={160} height={160} rx={30} className="fill-fg" />
        ))}
        <rect
          x={view.x}
          y={view.y}
          width={view.w}
          height={view.h}
          className="fill-accent/20 stroke-accent"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
